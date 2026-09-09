import type * as Three from 'three';

type EnvironmentOptions = {
  mobile?: boolean;
};

/** Image-free ocean imagery with small procedural fields, driven by caller active time. */
export function createOrbitalEnvironment(
  THREE: typeof Three,
  invalidate: () => void,
  options: EnvironmentOptions = {},
) {
  const mobile = options.mobile ?? false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);
  const screenGeometry = new THREE.PlaneGeometry(2, 2);
  const screenVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.9998, 1.0);
    }
  `;
  const generationStarted = performance.now();
  // A smooth periodic gradient field, sampled eight times per noise cell.
  // The texture is still only R8 64³ / 32³; no image or large Earth map is loaded.
  // Baking the C2 field once avoids interpolated random-value plateaus on clouds.
  const noiseSide = mobile ? 32 : 64;
  const noiseCells = noiseSide / 8;
  const noiseData = new Uint8Array(noiseSide ** 3);
  const gradientData = new Float32Array(noiseCells ** 3 * 3);
  let noiseSeed = 803719;
  const noiseRandom = () => {
    noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
    return noiseSeed / 4294967296;
  };
  for (let i = 0; i < gradientData.length; i += 3) {
    const z = noiseRandom() * 2 - 1;
    const angle = noiseRandom() * Math.PI * 2;
    const radial = Math.sqrt(1 - z * z);
    gradientData[i] = radial * Math.cos(angle);
    gradientData[i + 1] = radial * Math.sin(angle);
    gradientData[i + 2] = z;
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let z = 0; z < noiseSide; z++) {
    const pz = z / 8,
      iz = Math.floor(pz),
      fz = pz - iz,
      wz = fade(fz);
    for (let y = 0; y < noiseSide; y++) {
      const py = y / 8,
        iy = Math.floor(py),
        fy = py - iy,
        wy = fade(fy);
      for (let x = 0; x < noiseSide; x++) {
        const px = x / 8,
          ix = Math.floor(px),
          fx = px - ix,
          wx = fade(fx);
        let sum = 0;
        for (let dz = 0; dz <= 1; dz++) {
          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = 0; dx <= 1; dx++) {
              const j =
                ((((iz + dz) % noiseCells) * noiseCells +
                  ((iy + dy) % noiseCells)) *
                  noiseCells +
                  ((ix + dx) % noiseCells)) *
                3;
              const dot =
                gradientData[j] * (fx - dx) +
                gradientData[j + 1] * (fy - dy) +
                gradientData[j + 2] * (fz - dz);
              sum +=
                dot *
                (dx ? wx : 1 - wx) *
                (dy ? wy : 1 - wy) *
                (dz ? wz : 1 - wz);
            }
          }
        }
        noiseData[(z * noiseSide + y) * noiseSide + x] = Math.round(
          Math.max(0, Math.min(1, 0.5 + sum * 0.85)) * 255,
        );
      }
    }
  }
  const cloudNoise = new THREE.Data3DTexture(
    noiseData,
    noiseSide,
    noiseSide,
    noiseSide,
  );
  cloudNoise.format = THREE.RedFormat;
  cloudNoise.type = THREE.UnsignedByteType;
  cloudNoise.colorSpace = THREE.NoColorSpace;
  cloudNoise.minFilter = THREE.LinearMipmapLinearFilter;
  cloudNoise.magFilter = THREE.LinearFilter;
  cloudNoise.wrapS = THREE.RepeatWrapping;
  cloudNoise.wrapT = THREE.RepeatWrapping;
  cloudNoise.wrapR = THREE.RepeatWrapping;
  cloudNoise.generateMipmaps = true;
  cloudNoise.unpackAlignment = 1;
  cloudNoise.needsUpdate = true;

  const smooth = (a: number, b: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const hash2 = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const noise2 = (x: number, y: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    const fx = smooth(0, 1, x - ix),
      fy = smooth(0, 1, y - iy);
    const a = hash2(ix, iy),
      b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1),
      d = hash2(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
  // Bake the calm nebula once, rather than evaluating many full-screen octaves.
  const skyWidth = mobile ? 128 : 256,
    skyHeight = skyWidth / 2;
  const skyData = new Uint8Array(skyWidth * skyHeight * 4);
  for (let y = 0; y < skyHeight; y++) {
    for (let x = 0; x < skyWidth; x++) {
      const u = x / (skyWidth - 1),
        v = y / (skyHeight - 1);
      const px = u * 6.2,
        py = v * 4.8;
      const wx = noise2(px * 0.72, py * 0.72);
      const wy = noise2(px * 0.72 + 13.7, py * 0.72 - 9);
      const cloud =
        noise2(px + wx * 1.4, py + wy * 1.4) * 0.57 +
        noise2(px * 2.03 + wx, py * 2.03 + wy) * 0.28 +
        noise2(px * 4.1 - wy, py * 4.1 + wx) * 0.15;
      const ribbon = v - u * 0.42 - 0.27 + (wx - 0.5) * 0.2;
      const band = Math.exp(-ribbon * ribbon * 10);
      const veil = smooth(0.24, 0.82, cloud) * band;
      const dust = smooth(0.48, 0.77, noise2(px * 1.5 + 21.3, py * 1.5 + 10));
      const factor =
        (1 - dust * band * 0.15) *
        (1 - 0.16 * Math.hypot((u - 0.5) * 1.1, (v - 0.5) * 0.9));
      const i = (y * skyWidth + x) * 4;
      skyData[i] = Math.round((0.012 + 0.015 * v + 0.02 * veil) * factor * 255);
      skyData[i + 1] = Math.round(
        (0.037 + 0.033 * v + 0.043 * veil) * factor * 255,
      );
      skyData[i + 2] = Math.round(
        (0.084 + 0.066 * v + 0.082 * veil) * factor * 255,
      );
      skyData[i + 3] = 255;
    }
  }
  const skyTexture = new THREE.DataTexture(
    skyData,
    skyWidth,
    skyHeight,
    THREE.RGBAFormat,
  );
  skyTexture.colorSpace = THREE.NoColorSpace;
  skyTexture.minFilter = THREE.LinearMipmapLinearFilter;
  skyTexture.magFilter = THREE.LinearFilter;
  skyTexture.generateMipmaps = true;
  skyTexture.needsUpdate = true;
  let skyGpuBytes = 0;
  for (
    let w = skyWidth, h = skyHeight;
    ;
    w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)
  ) {
    skyGpuBytes += w * h * 4;
    if (w === 1 && h === 1) break;
  }
  const proceduralTextureBytes = noiseData.byteLength + skyData.byteLength;
  // Exact R8 volume mip chain: each level halves all three dimensions.
  let noiseGpuBytes = 0;
  for (let side = noiseSide; side >= 1; side >>= 1) noiseGpuBytes += side ** 3;
  const proceduralTextureGpuBytes = noiseGpuBytes + skyGpuBytes;
  const generationMs = performance.now() - generationStarted;
  const sky = new THREE.Mesh(
    screenGeometry,
    new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      uniforms: { skyTexture: { value: skyTexture } },
      vertexShader: screenVertex,
      fragmentShader: `varying vec2 vUv; uniform sampler2D skyTexture;
      void main() { gl_FragColor = vec4(texture2D(skyTexture, vUv).rgb, 1.0); }`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);

  let seed = 41871;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const count = mobile ? 2300 : 3100;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set(
      [(random() - 0.5) * 590, (random() - 0.5) * 370, -280 - random() * 200],
      i * 3,
    );
    const brightStar = random() > 0.994;
    const brightness = Math.pow(random(), 3) * 0.74 + 0.22;
    colors.set(
      [
        brightness * (0.78 + random() * 0.22),
        brightness * (0.87 + random() * 0.13),
        brightness,
      ],
      i * 3,
    );
    sizes[i] = brightStar ? 4.0 + random() * 1.6 : 0.85 + random() * 1.55;
    twinkles.set(
      [
        random() * Math.PI * 2,
        0.35 + random() * 0.6,
        brightStar ? 0.25 + random() * 0.12 : 0.1 + random() * 0.15,
      ],
      i * 3,
    );
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  starsGeometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkles, 3));
  const starsMaterial = new THREE.ShaderMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { pixelRatio: { value: 1 }, time: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 twinkle;
      varying vec3 vColor;
      uniform float pixelRatio;
      uniform float time;
      void main() {
        float pulse = sin(time * twinkle.y + twinkle.x) * 0.7
          + sin(time * twinkle.y * 0.47 + twinkle.x * 2.0) * 0.3;
        vColor = color * (1.0 + pulse * twinkle.z);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * pixelRatio;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = exp(-d * d * 18.0) * (1.0 - smoothstep(0.2, 0.5, d));
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // Groups start 5–9 active seconds apart. Every fourth group adds a soft
  // companion streak, keeping the scene calm and the maximum actor count two.
  // Tight screen-space quads shade only each streak, not the whole viewport.
  const meteorVertex = `
    varying vec2 vStreak;
    varying float vScreenY;
    uniform vec2 head;
    uniform vec2 axis;
    uniform float aspect;
    uniform float pixelHeight;
    uniform float tailLength;
    void main() {
      float padding = pixelHeight * 7.0;
      float along = mix(-tailLength, padding, position.x * 0.5 + 0.5);
      float across = position.y * padding;
      vStreak = vec2(along, across);
      vec2 offset = axis * along + vec2(-axis.y, axis.x) * across;
      vec2 screen = head + offset / vec2(aspect, 1.0);
      vScreenY = screen.y;
      gl_Position = vec4(screen * 2.0 - 1.0, 0.9998, 1.0);
    }
  `;
  const meteors = [0, 1].map((index) => {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        head: { value: new THREE.Vector2() },
        axis: {
          value: new THREE.Vector2(
            index === 0 ? 1 : -1,
            index === 0 ? -0.28 : -0.22,
          ).normalize(),
        },
        aspect: { value: 1 },
        pixelHeight: { value: 1 / 900 },
        opacity: { value: 0 },
        tailLength: { value: 0.12 },
        headColor: {
          value: new THREE.Color(index === 0 ? 0xfff2d5 : 0xdffaff),
        },
      },
      vertexShader: meteorVertex,
      fragmentShader: `
        varying vec2 vStreak;
        varying float vScreenY;
        uniform float pixelHeight;
        uniform float opacity;
        uniform float tailLength;
        uniform vec3 headColor;
        void main() {
          float width = pixelHeight * 1.05;
          float tail = smoothstep(-tailLength, 0.0, vStreak.x)
            * (1.0 - smoothstep(0.0, width * 2.0, vStreak.x));
          float line = exp(-pow(vStreak.y / width, 2.0)) * tail;
          float halo = exp(-pow(vStreak.y / (width * 2.8), 2.0)) * tail;
          float tip = exp(-dot(vStreak, vStreak) / (width * width * 4.0));
          float glow = exp(-dot(vStreak, vStreak) / (width * width * 14.0));
          float alpha = (line * 0.88 + halo * 0.10 + tip * 0.85 + glow * 0.14) * opacity;
          alpha *= 1.0 - smoothstep(0.85, 0.89, vScreenY);
          vec3 color = mix(vec3(0.48, 0.80, 1.0), headColor, clamp(tip + line * 0.3, 0.0, 1.0));
          gl_FragColor = vec4(color, min(alpha, 1.0));
        }
      `,
    });
    const mesh = new THREE.Mesh(screenGeometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = -10;
    scene.add(mesh);
    return {
      mesh,
      material,
      phase: 0,
      cycle: 0,
      startAt: 0,
      duration: 0,
      nextAt: 0,
    };
  });

  let disposed = false;
  const earth = new THREE.Group();
  earth.position.set(-56.652, -215.289, -161.903);
  earth.rotation.set(-0.6, 1.3, 0.18);
  const sphereGeometry = new THREE.SphereGeometry(
    1,
    mobile ? 96 : 128,
    mobile ? 64 : 96,
  );
  const surface = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x1664a7,
      roughness: 0.62,
      metalness: 0,
      emissive: 0x06182f,
      emissiveIntensity: 0.2,
    }),
  );
  surface.scale.setScalar(180);
  earth.add(surface);
  const cloudMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      cloudNoise: { value: cloudNoise },
      noiseSide: { value: noiseSide },
      noiseCells: { value: noiseCells },
      cloudMorph: { value: new THREE.Vector3(0, 0.035, 0) },
      time: { value: 0 },
      sunDirection: { value: new THREE.Vector3(-120, 100, 120).normalize() },
    },
    defines: { FINE_CLOUD_DETAIL: mobile ? 0 : 1 },
    vertexShader: `
      out vec3 vLocal;
      out vec3 vWorldNormal;
      void main() {
        vLocal = position;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp sampler3D;
      in vec3 vLocal;
      in vec3 vWorldNormal;
      uniform sampler3D cloudNoise;
      uniform float noiseSide;
      uniform float noiseCells;
      uniform vec3 cloudMorph;
      uniform float time;
      uniform vec3 sunDirection;
      out vec4 outColor;
      float n3(vec3 p) {
        // The baked field has eight samples per continuous gradient-noise cell.
        // Ordinary coordinates and explicit gradients preserve the footprint at
        // the horizon; there is no floor/fract remap distorting filtered mip levels.
        vec3 uvw = p / noiseCells + 0.5 / noiseSide;
        return textureGrad(cloudNoise, uvw, dFdx(p) / noiseCells, dFdy(p) / noiseCells).r;
      }
      float resolvedDetail(vec3 p) {
        // Fade anisotropic fibers before their narrow dimension becomes a pixel.
        // This prevents crawling dots, rather than sharpening unresolved grain.
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        return 1.0 - smoothstep(0.18, 0.60, footprint);
      }
      vec3 swirl(vec3 p, vec3 axis, float strength) {
        float angle = exp(-dot(p - axis, p - axis) * 9.0) * strength;
        float c = cos(angle), s = sin(angle);
        return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
      }
      void main() {
        vec3 p = normalize(vLocal);
        p = swirl(p, normalize(vec3(-0.62, 0.24, 0.75)), 2.7);
        p = swirl(p, normalize(vec3(0.74, -0.35, -0.55)), -2.3);
        float shear = sin(p.y * 5.2 + 0.7) * 0.38;
        float c = cos(shear), s = sin(shear);
        p.xz = mat2(c, -s, s, c) * p.xz;
        p += cloudMorph;
        vec2 warp = vec2(n3(p * 3.1 + 11.3), n3(p * 3.1 - 8.7)) - 0.5;
        vec3 q = p + vec3(warp.x, warp.y * 0.5, -warp.x) * 0.24;
        const mat3 octaveTurn = mat3(
          0.00, 0.80, 0.60,
          -0.80, 0.36, -0.48,
          -0.60, -0.48, 0.64
        );
        vec3 r = octaveTurn * q;
        vec3 r2 = octaveTurn * r;
        float regional = n3(q * 4.2 + vec3(5.1, 0.0, 9.2));
        float fronts = n3(r * vec3(8.0, 17.0, 8.0) + 13.2);
        float billows = n3(r2 * 47.0 - 3.7);
        // Shared orientation and nested advection make threads follow a wind
        // direction. Independent isotropic flakes formerly read as blurry pixels.
        vec3 wispDomain = r * vec3(38.0, 135.0, 38.0)
          + vec3(0.0, (billows - 0.5) * 1.6, 0.0);
        float wisps = mix(0.5, n3(wispDomain), resolvedDetail(wispDomain));
        vec3 fineDomain = r * vec3(74.0, 249.0, 74.0)
          + vec3(0.0, (wisps - 0.5) * 0.8, 0.0) - 21.7;
        float fine = mix(0.5, n3(fineDomain), resolvedDetail(fineDomain));
        #if FINE_CLOUD_DETAIL == 1
          vec3 microDomain = r * vec3(131.0, 419.0, 131.0)
            + vec3(0.0, (wisps - 0.5) * 1.3, 0.0) + vec3(-8.1, 14.2, 4.7);
          fine = fine * 0.72 + mix(0.5, n3(microDomain), resolvedDetail(microDomain)) * 0.28;
        #endif
        float weather = regional * 0.45 + fronts * 0.27 + billows * 0.28;
        float body = smoothstep(0.43, 0.63, weather);
        float threads = smoothstep(0.37, 0.64, wisps * 0.65 + fine * 0.35);
        // Keep dense white cores quiet, with long semi-transparent wisps around
        // their edges. The derivative fade above removes unresolved fine grain.
        float coverage = body * mix(0.12 + threads * 0.88, 1.0, body * body * 0.28);
        float cirrus = smoothstep(0.46, 0.64, fronts)
          * smoothstep(0.39, 0.59, regional)
          * smoothstep(0.47, 0.65, wisps * 0.8 + fine * 0.2) * 0.24;
        coverage = max(coverage, cirrus);
        coverage *= smoothstep(0.0, 0.035, coverage);
        if (coverage < 0.001) discard;
        float sun = dot(normalize(vWorldNormal), sunDirection);
        float light = smoothstep(-0.10, 0.75, sun);
        vec3 color = mix(vec3(0.39, 0.56, 0.76), vec3(0.97, 0.985, 1.0), light);
        color *= 0.95 + billows * 0.06;
        outColor = vec4(color, coverage * 0.94);
      }
    `,
  });
  const clouds = new THREE.Mesh(sphereGeometry, cloudMaterial);
  clouds.scale.setScalar(180.57);
  clouds.renderOrder = 2;
  earth.add(clouds);

  const atmosphereVertex = `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vView;
    void main() {
      vec4 p = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vView = normalize(-p.xyz);
      gl_Position = projectionMatrix * p;
    }
  `;
  const sunDirection = new THREE.Vector3(-120, 100, 120).normalize();
  const atmosphere = new THREE.Mesh(
    sphereGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { sunDirection: { value: sunDirection } },
      vertexShader: atmosphereVertex,
      fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vView;
      uniform vec3 sunDirection;
      void main() {
        float mu = abs(dot(normalize(vNormal), normalize(vView)));
        // Fade to zero at the outer silhouette instead of ending in a hard ring.
        float rim = pow(1.0 - mu, 2.4) * smoothstep(0.0, 0.18, mu);
        float daylight = smoothstep(-0.3, 0.45, dot(normalize(vWorldNormal), sunDirection));
        gl_FragColor = vec4(0.16, 0.52, 1.0, rim * (0.20 + daylight * 0.66));
      }
    `,
    }),
  );
  atmosphere.scale.setScalar(181.5);
  atmosphere.renderOrder = 3;
  earth.add(atmosphere);

  // This inner scattering layer sits below the clouds and has no flat haze baseline.
  const haze = new THREE.Mesh(
    sphereGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { sunDirection: { value: sunDirection } },
      vertexShader: atmosphereVertex,
      fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vView;
      uniform vec3 sunDirection;
      void main() {
        float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(vView))), 2.6);
        float daylight = smoothstep(-0.25, 0.45, dot(normalize(vWorldNormal), sunDirection));
        gl_FragColor = vec4(0.09, 0.38, 0.88, rim * (0.035 + daylight * 0.21));
      }
    `,
    }),
  );
  haze.scale.setScalar(180.27);
  haze.renderOrder = 1;
  earth.add(haze);
  scene.add(earth);
  scene.add(new THREE.AmbientLight(0x527dab, 0.65));
  const sunlight = new THREE.DirectionalLight(0xf0f7ff, 3.2);
  sunlight.position.set(-120, 100, 120);
  scene.add(sunlight);

  // The reference horizon begins at 76% viewport height and leaves the bottom
  // at 86% viewport width. Showing more of the globe avoids stretching a tiny
  // geographic patch across the foreground, while preserving the low orbit view.
  const horizonLeftRay = new THREE.Vector3();
  const horizonRightRay = new THREE.Vector3();
  const horizonBisector = new THREE.Vector3();
  const horizonNormal = new THREE.Vector3();
  const placeEarth = (width: number, height: number) => {
    const focalLength =
      (height * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const horizonY = height * 0.76;
    horizonLeftRay
      .set(
        (-width * 0.5) / focalLength,
        (height * 0.5 - horizonY) / focalLength,
        -1,
      )
      .normalize();
    horizonRightRay
      .set((width * 0.36) / focalLength, (-height * 0.5) / focalLength, -1)
      .normalize();
    horizonBisector.copy(horizonLeftRay).add(horizonRightRay).normalize();
    horizonNormal.crossVectors(horizonLeftRay, horizonRightRay).normalize();
    const cosHalfAngle = horizonBisector.dot(horizonLeftRay);
    const sinHalfAngle = Math.sqrt(
      Math.max(0.0001, 1 - cosHalfAngle * cosHalfAngle),
    );
    const sweep = 1.2;
    earth.position
      .copy(horizonBisector)
      .multiplyScalar((180 * Math.cos(sweep)) / sinHalfAngle)
      .addScaledVector(horizonNormal, 180 * Math.sin(sweep));
  };

  let activeTime = 0;
  const phaseHash = (value: number) => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const meteorGroupStart = (cycle: number) =>
    cycle * 7 + 2 + phaseHash(cycle + 0.17) * 2;
  const pairedGroup = (cycle: number) => cycle % 4 === 2;
  const meteorStart = (cycle: number, index: number) =>
    meteorGroupStart(cycle) +
    (index === 1 ? 0.26 + phaseHash(cycle + 0.73) * 0.2 : 0);
  const nextMeteorStart = (time: number, cycle: number, index: number) => {
    let nextCycle = cycle;
    if (meteorStart(nextCycle, index) < time) nextCycle++;
    if (index === 1) nextCycle += (2 - (nextCycle % 4) + 4) % 4;
    return meteorStart(nextCycle, index);
  };
  invalidate();
  return {
    scene,
    camera,
    resize(width: number, height: number, pixelRatio: number) {
      const safeHeight = Math.max(1, height);
      camera.aspect = Math.max(1, width) / safeHeight;
      camera.updateProjectionMatrix();
      placeEarth(Math.max(1, width), safeHeight);
      starsMaterial.uniforms.pixelRatio.value = Math.max(1, pixelRatio);
      for (const { material } of meteors) {
        material.uniforms.aspect.value = camera.aspect;
        material.uniforms.pixelHeight.value = 1 / safeHeight;
        material.uniforms.tailLength.value = Math.min(
          0.12,
          camera.aspect * 0.26,
        );
      }
    },
    update(time: number, moving: boolean, x: number, y: number) {
      if (disposed) return;
      camera.position.set(x * 0.4, y * 0.4, 0);
      if (moving && Number.isFinite(time)) activeTime = Math.max(0, time);
      surface.rotation.y = (activeTime * 0.003) % (Math.PI * 2);
      clouds.rotation.y = (activeTime * 0.0072) % (Math.PI * 2);
      starsMaterial.uniforms.time.value = activeTime;
      cloudMaterial.uniforms.time.value = activeTime;
      cloudMaterial.uniforms.cloudMorph.value.set(
        Math.sin(activeTime * 0.02) * 0.035,
        Math.cos(activeTime * 0.013) * 0.035,
        Math.sin(activeTime * 0.017) * 0.035,
      );
      for (let index = 0; index < meteors.length; index++) {
        const meteor = meteors[index];
        const cycle = Math.floor(activeTime / 7);
        meteor.cycle = cycle;
        meteor.startAt = meteorStart(cycle, index);
        meteor.duration = 1.1 + phaseHash(cycle * 2 + index + 0.31) * 0.45;
        const phase = (activeTime - meteor.startAt) / meteor.duration;
        meteor.mesh.visible =
          (index === 0 || pairedGroup(cycle)) && phase >= 0 && phase <= 1;
        meteor.phase = meteor.mesh.visible ? phase : 0;
        meteor.nextAt = nextMeteorStart(activeTime, cycle, index);
        const uniforms = meteor.material.uniforms;
        if (meteor.mesh.visible) {
          const fromLeft = cycle % 2 === 0;
          const startX = fromLeft
            ? 0.08 + phaseHash(cycle + 2) * 0.18 + index * 0.06
            : 0.92 - phaseHash(cycle + 7) * 0.18 - index * 0.06;
          const startY = 0.73 + phaseHash(cycle + 4) * 0.08 - index * 0.055;
          const travel = Math.min(
            0.32 + phaseHash(cycle + index + 6) * 0.1,
            uniforms.aspect.value * 0.7,
          );
          const axis = uniforms.axis.value
            .set(fromLeft ? 1 : -1, -0.25 - index * 0.045)
            .normalize();
          uniforms.head.value.set(
            startX + (axis.x * phase * travel) / uniforms.aspect.value,
            startY + axis.y * phase * travel,
          );
          uniforms.opacity.value =
            Math.pow(Math.sin(Math.PI * phase), 0.65) *
            (index === 0 ? 0.96 : 0.72);
        } else {
          uniforms.opacity.value = 0;
        }
      }
    },
    getDiagnostics() {
      const meteorCount = meteors.filter((m) => m.mesh.visible).length;
      return {
        activeTime,
        ready: !disposed,
        earthReady: !disposed,
        earthMode: 'procedural-water',
        earthRotation: surface.rotation.y,
        cloudRotation: clouds.rotation.y,
        cloudMorphTime: cloudMaterial.uniforms.time.value,
        earthRotationRate: 0.003,
        cloudRotationRate: 0.0072,
        cloudFieldSamples: mobile ? 7 : 8,
        cloudInterpolation: 'baked-gradient-trilinear-mipmapped',
        cloudFieldCells: noiseCells,
        cloudSamplesPerCell: 8,
        cloudDetailFadeFootprint: [0.18, 0.6],
        cloudMorph: cloudMaterial.uniforms.cloudMorph.value.toArray(),
        meteorGroupInterval: [5, 9],
        meteorPairEveryGroups: 4,
        meteorGroupHasPair: pairedGroup(meteors[0].cycle),
        meteorCount,
        meteorPhases: meteors.map((m) => m.phase),
        meteorStreams: meteors.map((m) => ({
          visible: m.mesh.visible,
          phase: m.phase,
          startAt: m.startAt,
          duration: m.duration,
          nextAt: m.nextAt,
        })),
        meteorPhase: meteors.find((m) => m.mesh.visible)?.phase ?? 0,
        meteorCycle: meteors[0].cycle,
        meteorVisible: meteorCount > 0,
        textureSize: noiseSide,
        dayTextureSize: 0,
        cloudTextureSize: 0,
        proceduralTextureBytes,
        proceduralTextureGpuBytes,
        proceduralGenerationMs: Math.round(generationMs * 100) / 100,
        proceduralNoiseDimensions: [noiseSide, noiseSide, noiseSide],
        proceduralNoiseFormat: 'R8',
        proceduralNoiseMipBytes: noiseGpuBytes,
        proceduralNoiseMipLevels: Math.log2(noiseSide) + 1,
        nebulaDimensions: [skyWidth, skyHeight],
        externalTextureRequests: 0,
        estimatedTextureMiB:
          Math.round((proceduralTextureGpuBytes / 1048576) * 10000) / 10000,
        earthRadius: 180,
        earthPosition: earth.position.toArray(),
        drawCallBudget: 8,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cloudNoise.dispose();
      skyTexture.dispose();
      const geometries = new Set<Three.BufferGeometry>();
      const materials = new Set<Three.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      scene.clear();
    },
  };
}
