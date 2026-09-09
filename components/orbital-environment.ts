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
  // Original thin-shell adaptation of separate weather and Perlin/cellular shape:
  // https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine
  // Extinction reference: https://pbr-book.org/4ed/Volume_Scattering/Transmittance
  // No external cloud textures or implementation code are copied.
  const noiseSide = mobile ? 32 : 64;
  const noiseCells = noiseSide / 8;
  const noiseData = new Uint8Array(noiseSide ** 3 * 2);
  const gradientData = new Float32Array(noiseCells ** 3 * 3);
  const featureData = new Float32Array(gradientData.length);
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
    featureData[i] = 0.28 + noiseRandom() * 0.44;
    featureData[i + 1] = 0.28 + noiseRandom() * 0.44;
    featureData[i + 2] = 0.28 + noiseRandom() * 0.44;
  }
  const mask = noiseCells - 1;
  const featureIndex = (x: number, y: number, z: number) =>
    (((z & mask) * noiseCells + (y & mask)) * noiseCells + (x & mask)) * 3;
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  // Keeping features in [0.28, 0.72] makes the 27-cell F1 search complete:
  // every point has an in-cell feature within sqrt(3)*0.72 < 1.28, the closest
  // possible distance to any feature beyond those neighboring cells.
  const neighbors = new Float32Array(27 * 3);
  for (let iz = 0; iz < noiseCells; iz++) {
    for (let iy = 0; iy < noiseCells; iy++) {
      for (let ix = 0; ix < noiseCells; ix++) {
        let neighbor = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const j = featureIndex(ix + dx, iy + dy, iz + dz);
              neighbors[neighbor++] = dx + featureData[j];
              neighbors[neighbor++] = dy + featureData[j + 1];
              neighbors[neighbor++] = dz + featureData[j + 2];
            }
        for (let sz = 0; sz < 8; sz++) {
          const fz = sz / 8,
            wz = fade(fz),
            z = iz * 8 + sz;
          for (let sy = 0; sy < 8; sy++) {
            const fy = sy / 8,
              wy = fade(fy),
              y = iy * 8 + sy;
            for (let sx = 0; sx < 8; sx++) {
              const fx = sx / 8,
                wx = fade(fx),
                x = ix * 8 + sx;
              let perlin = 0;
              for (let dz = 0; dz <= 1; dz++)
                for (let dy = 0; dy <= 1; dy++)
                  for (let dx = 0; dx <= 1; dx++) {
                    const j = featureIndex(ix + dx, iy + dy, iz + dz);
                    const dot =
                      gradientData[j] * (fx - dx) +
                      gradientData[j + 1] * (fy - dy) +
                      gradientData[j + 2] * (fz - dz);
                    perlin +=
                      dot *
                      (dx ? wx : 1 - wx) *
                      (dy ? wy : 1 - wy) *
                      (dz ? wz : 1 - wz);
                  }
              let closest = 3;
              for (let j = 0; j < neighbors.length; j += 3) {
                const dx = fx - neighbors[j],
                  dy = fy - neighbors[j + 1],
                  dz = fz - neighbors[j + 2];
                closest = Math.min(closest, dx * dx + dy * dy + dz * dz);
              }
              const offset = ((z * noiseSide + y) * noiseSide + x) * 2;
              noiseData[offset] = Math.round(
                Math.max(0, Math.min(1, 0.5 + perlin * 0.85)) * 255,
              );
              noiseData[offset + 1] = Math.round(
                Math.max(0, 1 - Math.sqrt(closest)) * 255,
              );
            }
          }
        }
      }
    }
  }
  const cloudNoise = new THREE.Data3DTexture(
    noiseData,
    noiseSide,
    noiseSide,
    noiseSide,
  );
  cloudNoise.format = THREE.RGFormat;
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
  // Exact RG8 volume mip chain: each level halves all three dimensions.
  let noiseGpuBytes = 0;
  for (let side = noiseSide; side >= 1; side >>= 1)
    noiseGpuBytes += side ** 3 * 2;
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
  const twinkles = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions.set(
      [(random() - 0.5) * 590, (random() - 0.5) * 370, -280 - random() * 200],
      i * 3,
    );
    const brightStar = random() > 0.989;
    const brightness = Math.pow(random(), 2.4) * 0.86 + 0.3;
    colors.set(
      [
        brightness * (0.78 + random() * 0.22),
        brightness * (0.87 + random() * 0.13),
        brightness,
      ],
      i * 3,
    );
    sizes[i] = brightStar ? 4.2 + random() * 1.8 : 1.05 + random() * 1.65;
    twinkles.set(
      [
        random() * Math.PI * 2,
        0.45 + Math.pow(random(), 1.65) * 2.2,
        brightStar
          ? 0.3 + random() * 0.25
          : 0.1 + Math.pow(random(), 1.6) * 0.38,
        0.2 + random() * 1.6,
      ],
      i * 4,
    );
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  starsGeometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkles, 4));
  const starsMaterial = new THREE.ShaderMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { pixelRatio: { value: 1 }, time: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec4 twinkle;
      varying vec3 vColor;
      uniform float pixelRatio;
      uniform float time;
      void main() {
        float pulse = sin(time * twinkle.y + twinkle.x) * 0.68
          + sin(time * twinkle.w + twinkle.x * 1.618) * 0.32;
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

  // Three independent timing banks provide three times the original creation
  // rate. Nine persistent slots allow brief overlapping showers without allocation.
  // Singles remain common; grouped streaks share an axis and stagger their starts.
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
  const meteors = Array.from({ length: 9 }, (_, index) => {
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
      cycle: -1,
      bank: Math.floor(index / 3),
      member: index % 3,
      startAt: 0,
      duration: 0,
      nextAt: 0,
      originX: 0,
      originY: 0,
      travel: 0,
      strength: 0,
      parallel: false,
      groupSize: 1,
      groupId: -1,
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
      cloudMorph: { value: new THREE.Vector3(0, 0.024, 0) },
      sunLocal: { value: new THREE.Vector3() },
      time: { value: 0 },
      sunDirection: { value: new THREE.Vector3(-120, 100, 120).normalize() },
    },
    defines: { FINE_CLOUD_DETAIL: mobile ? 0 : 1 },
    vertexShader: `
      out vec3 vLocal;
      out vec3 vWorldNormal;
      out vec3 vWorldPosition;
      void main() {
        vLocal = position;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp sampler3D;
      in vec3 vLocal;
      in vec3 vWorldNormal;
      in vec3 vWorldPosition;
      uniform sampler3D cloudNoise;
      uniform float noiseSide;
      uniform float noiseCells;
      uniform vec3 cloudMorph;
      uniform vec3 sunDirection;
      uniform vec3 sunLocal;
      out vec4 outColor;
      vec2 field(vec3 p) {
        return textureGrad(cloudNoise, p / noiseCells + 0.5 / noiseSide,
          dFdx(p) / noiseCells, dFdy(p) / noiseCells).rg;
      }
      vec2 detailField(vec3 p) {
        #if FINE_CLOUD_DETAIL == 1
          // Two half-footprint samples retain cross-streak detail at grazing
          // angles. This integrates along the major screen derivative instead
          // of applying a negative mip bias to the whole pixel footprint.
          vec3 dx = dFdx(p) / noiseCells, dy = dFdy(p) / noiseCells;
          bool xMajor = dot(dx, dx) > dot(dy, dy);
          vec3 along = xMajor ? dx : dy;
          vec3 gx = dx * (xMajor ? 0.5 : 1.0);
          vec3 gy = dy * (xMajor ? 1.0 : 0.5);
          vec3 uv = p / noiseCells + 0.5 / noiseSide;
          return (textureGrad(cloudNoise, uv - along * 0.25, gx, gy).rg
            + textureGrad(cloudNoise, uv + along * 0.25, gx, gy).rg) * 0.5;
        #else
          return field(p);
        #endif
      }
      void main() {
        const mat3 octaveTurn = mat3(
          0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64
        );
        vec3 p = normalize(vLocal) + cloudMorph;
        vec3 detailP = p;
        // Author a comma/front in the initial visible region. These spherical
        // coordinates rotate with the planet; no screen-space mask is involved.
        vec3 axis = normalize(vec3(-0.48, 0.79, 0.38));
        vec3 tangentU = normalize(cross(vec3(0.0, 1.0, 0.0), axis));
        vec3 tangentV = cross(axis, tangentU);
        vec2 warp = field(p * 4.7 + vec3(5.1, 0.0, 9.2));
        vec2 regional = field(p * 11.3 - vec3(4.2, 11.0, 0.0));
        p += vec3(warp.r - 0.5, regional.r - 0.5, 0.5 - warp.r) * 0.038;
        // Weather advection is coherent over hundreds of kilometers. Local
        // convection has a gentler warp, avoiding uniformly stretched billows.
        detailP += vec3(regional.r - 0.5, 0.5 - warp.r, warp.r - 0.5) * 0.008;
        float angle = exp(-dot(p - axis, p - axis) * 22.0) * 1.8;
        float c = cos(angle), s = sin(angle);
        vec3 q = p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
        vec3 r = vec3(dot(q, tangentU), dot(q, tangentV), dot(q, axis));
        vec2 large = field(q * 23.0 + vec3(8.1, -9.3, 2.7));
        vec2 medium = detailField(octaveTurn * detailP * 137.0 - 17.3);
        vec2 fine = detailField(detailP * 379.0 + 4.2);
        float billows = large.r * 0.10 + medium.r * 0.55 + fine.r * 0.35;
        float edgeErosion = (1.0 - fine.g) * 0.10;
        #if FINE_CLOUD_DETAIL == 1
          vec2 micro = detailField(octaveTurn * detailP * 997.0 + vec3(-8.1, 14.2, 4.7));
          billows = large.r * 0.10 + medium.r * 0.43 + fine.r * 0.30 + micro.r * 0.17;
          edgeErosion += (1.0 - micro.g) * 0.035;
        #endif
        billows += (medium.g - 0.45) * 0.08 + (fine.g - 0.45) * 0.04;
        // The main cloud body is a continuous stratiform sheet. Fractal density
        // alters both its boundary and interior; cellular holes do not define it.
        float frontDistance = r.x + 0.015 + (regional.r - 0.5) * 0.025
          + (large.r - 0.5) * 0.055 + (medium.r - 0.5) * 0.021 + (fine.r - 0.5) * 0.006;
        float frontWidth = 0.026 + 0.049 * smoothstep(-0.12, 0.10, r.y);
        float regionGate = smoothstep(0.66, 0.89, dot(p, axis));
        float envelope = exp(-pow(frontDistance / frontWidth, 2.0)) * regionGate;
        float sheetMask = smoothstep(0.08, 0.88, envelope);
        float sheet = clamp(sheetMask * (0.66 + (billows - 0.5) * 3.2)
          - edgeErosion * (1.0 - sheetMask * 0.7), 0.0, 1.0);
        float secondary = smoothstep(0.52, 0.68, warp.r * 0.58 + regional.r * 0.42
          + (large.r - 0.5) * 0.14 + (medium.r - 0.5) * 0.075)
          * (1.0 - regionGate * 0.65);
        float secondaryDensity = clamp(secondary * (0.58 + (billows - 0.5) * 2.7)
          - edgeErosion * (1.0 - secondary * 0.6), 0.0, 1.0);
        sheet = max(sheet, secondaryDensity);
        // Small cumulus occupies only the cold side of the front. It does not
        // punch an even field of holes through the broad frontal sheet.
        float coldSector = smoothstep(0.015, 0.075, frontDistance)
          * (1.0 - smoothstep(0.10, 0.22, frontDistance))
          * smoothstep(0.42, 0.62, regional.r) * (1.0 - sheetMask);
        vec2 cumulusBase = field(octaveTurn * detailP * 147.0 + vec3(13.2, -3.1, 7.4));
        vec2 cumulusFine = field(detailP * 389.0 - 11.7);
        float cumulusShape = clamp((cumulusBase.r - (1.0 - cumulusBase.g) * 0.34)
          / 0.66, 0.0, 1.0) * 0.75 + cumulusFine.r * 0.25;
        float cumulus = smoothstep(0.37, 0.68, cumulusShape) * coldSector * 0.66;
        // Fine, directional cirrus follows the frontal shoulder. Its coverage
        // is distinct from the density of the lower cloud types.
        vec2 cirrusA = field(r * vec3(181.0, 31.0, 89.0) + vec3(7.3, -14.7, 3.4));
        vec2 cirrusB = field(r * vec3(431.0, 79.0, 211.0)
          + vec3(medium.r * 1.1, 0.0, 0.0) - 7.8);
        float wisps = cirrusA.r * 0.65 + cirrusB.r * 0.35;
        float cirrus = smoothstep(0.44, 0.63, wisps) * smoothstep(0.015, 0.35, envelope)
          * (1.0 - sheetMask * 0.8) * 0.21;
        float density = sheet + cumulus + cirrus;
        vec3 normal = normalize(vWorldNormal);
        vec3 view = normalize(cameraPosition - vWorldPosition);
        float mu = abs(dot(normal, view));
        float slant = 0.7 + 0.3 * inversesqrt(mu * mu + 0.18);
        float alpha = (1.0 - exp(-density * 2.15 * slant)) * smoothstep(0.0, 0.012, density);
        // Two bounded sunward probes and a density-gradient normal add relief.
        // This is a thin-shell approximation, not full volumetric transport.
        float nearDensity = detailField(octaveTurn * detailP * 137.0 - 17.3
          + octaveTurn * sunLocal * 0.55).r;
        float farDensity = detailField(detailP * 379.0 + 4.2 + sunLocal * 0.85).r;
        float shadow = max(0.0, (nearDensity - medium.r) * 0.55
          + (farDensity - fine.r) * 0.45);
        vec3 dpdx = dFdx(vWorldPosition), dpdy = dFdy(vWorldPosition);
        vec3 tx = cross(dpdy, normal), ty = cross(normal, dpdx);
        float determinant = dot(dpdx, tx);
        float reliefHeight = billows * 0.8 + sheet * 0.2;
        vec3 gradient = sign(determinant) * (tx * dFdx(reliefHeight) + ty * dFdy(reliefHeight))
          / max(abs(determinant), 0.000001) * 0.60;
        gradient /= max(1.0, length(gradient) / 0.65);
        vec3 cloudNormal = normalize(normal - gradient);
        float daylight = smoothstep(-0.12, 0.72, dot(normal, sunDirection));
        float direct = clamp(dot(cloudNormal, sunDirection), 0.0, 1.0);
        float relief = clamp((0.50 + 0.50 * sqrt(direct)) * exp(-shadow * 3.0), 0.50, 1.0);
        vec3 color = mix(vec3(0.30, 0.43, 0.62), vec3(0.98, 0.99, 1.0), daylight) * relief;
        // All implicit/explicit gradients have been evaluated before discard.
        if (alpha < 0.001) discard;
        outColor = vec4(color, alpha);
      }
    `,
  });
  const clouds = new THREE.Mesh(sphereGeometry, cloudMaterial);
  clouds.scale.setScalar(180.57);
  clouds.renderOrder = 2;
  const cloudSunRotation = new THREE.Quaternion();
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
  const meteorBankPeriod = 4.5;
  const meteorGroupSize = (cycle: number) =>
    cycle % 7 === 3 ? 3 : cycle % 2 === 1 ? 2 : 1;
  const alignedShower = (cycle: number) => cycle % 14 === 3;
  const meteorGroupStart = (cycle: number, bank: number) =>
    cycle * meteorBankPeriod +
    0.55 +
    (alignedShower(cycle)
      ? bank * 0.14 + phaseHash(cycle + 0.17) * 0.16
      : bank * 1.32 + phaseHash(cycle + bank * 5.19 + 0.17) * 0.16);
  const meteorStart = (cycle: number, index: number) =>
    meteorGroupStart(cycle, Math.floor(index / 3)) +
    (index % 3) *
      (0.18 + phaseHash(cycle + Math.floor(index / 3) * 7.13 + 0.73) * 0.1);
  const nextMeteorStart = (time: number, index: number) => {
    let cycle = Math.max(0, Math.floor(time / meteorBankPeriod));
    for (let step = 0; step < 8; step++, cycle++) {
      const start = meteorStart(cycle, index);
      if (meteorGroupSize(cycle) > index % 3 && start >= time) return start;
    }
    return meteorStart(cycle, index);
  };
  // Descriptors change once per event. Frame updates only interpolate the head
  // along a cached axis, preserving deterministic seeks, resets and paused time.
  const configureMeteor = (meteor: (typeof meteors)[number], cycle: number) => {
    const { bank, member } = meteor;
    const shower = alignedShower(cycle);
    const parallel = shower || phaseHash(cycle * 3 + bank + 0.27) > 0.32;
    const key =
      cycle * 37.31 +
      (shower ? 0 : bank * 11.17) +
      (parallel ? 0 : member * 23.79);
    const direction = phaseHash(key + 0.59);
    const rising = direction > 0.82;
    const fromLeft = phaseHash(key + 1.47) > 0.5;
    const steep = direction < 0.24;
    const axis = meteor.material.uniforms.axis.value
      .set(
        fromLeft ? 1 : -1,
        rising
          ? 0.16 + phaseHash(key + 4.2) * 0.34
          : steep
            ? -1.05 - phaseHash(key + 4.2) * 0.8
            : -0.2 - phaseHash(key + 4.2) * 0.65,
      )
      .normalize();
    const spread = parallel ? (shower ? bank * 3 + member : member) * 0.014 : 0;
    meteor.cycle = cycle;
    meteor.startAt = meteorStart(cycle, bank * 3 + member);
    meteor.duration =
      1.15 + phaseHash(cycle * 3 + bank * 7.7 + member + 0.31) * 0.35;
    meteor.originX = Math.max(
      0.06,
      Math.min(
        0.94,
        (fromLeft
          ? 0.1 + phaseHash(key + 2) * 0.25
          : 0.9 - phaseHash(key + 2) * 0.25) +
          (fromLeft ? 1 : -1) * spread,
      ),
    );
    meteor.originY = Math.max(
      0.3,
      Math.min(
        0.82,
        (rising
          ? 0.42 + phaseHash(key + 4) * 0.16
          : 0.65 + phaseHash(key + 4) * 0.16) - spread,
      ),
    );
    meteor.travel = 0.26 + phaseHash(key + 6) * 0.17;
    meteor.strength = (0.82 - member * 0.14) * (shower ? 0.66 : 1);
    meteor.parallel = parallel;
    meteor.groupSize = meteorGroupSize(cycle);
    meteor.groupId = shower ? cycle * 3 : cycle * 3 + bank;
    meteor.material.uniforms.headColor.value.setHex(
      phaseHash(key + member * 0.8 + 9) > 0.5 ? 0xfff3df : 0xe0f6ff,
    );
    // Keep all origins below the existing quiet navigation strip.
    if (axis.y > 0) meteor.originY = Math.min(meteor.originY, 0.58);
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
        Math.sin(activeTime * 0.014) * 0.024,
        Math.cos(activeTime * 0.01) * 0.024,
        Math.sin(activeTime * 0.012) * 0.024,
      );
      cloudSunRotation
        .copy(earth.quaternion)
        .multiply(clouds.quaternion)
        .invert();
      cloudMaterial.uniforms.sunLocal.value
        .copy(sunDirection)
        .applyQuaternion(cloudSunRotation);
      for (let index = 0; index < meteors.length; index++) {
        const meteor = meteors[index];
        const currentCycle = Math.floor(activeTime / meteorBankPeriod);
        const cycle = Math.max(
          0,
          currentCycle -
            (activeTime < meteorStart(currentCycle, index) ? 1 : 0),
        );
        if (meteor.cycle !== cycle) configureMeteor(meteor, cycle);
        const phase = (activeTime - meteor.startAt) / meteor.duration;
        meteor.mesh.visible =
          meteor.member < meteor.groupSize && phase >= 0 && phase <= 1;
        meteor.phase = meteor.mesh.visible ? phase : 0;
        meteor.nextAt = nextMeteorStart(activeTime, index);
        const uniforms = meteor.material.uniforms;
        if (meteor.mesh.visible) {
          const travel = Math.min(meteor.travel, uniforms.aspect.value * 0.68);
          const axis = uniforms.axis.value;
          uniforms.head.value.set(
            meteor.originX + (axis.x * phase * travel) / uniforms.aspect.value,
            meteor.originY + axis.y * phase * travel,
          );
          uniforms.opacity.value =
            Math.pow(Math.sin(Math.PI * phase), 0.65) * meteor.strength;
        } else uniforms.opacity.value = 0;
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
        cloudFieldSamples: mobile ? 11 : 17,
        cloudInterpolation: mobile
          ? 'rg8-gradient-mips'
          : 'rg8-two-tap-major-axis-detail',
        cloudFieldCells: noiseCells,
        cloudSamplesPerCell: 8,
        cloudWeatherModel:
          'authored-front-stratiform-cold-sector-cumulus-cirrus',
        cloudLightingModel:
          'thin-shell-local-billows-gradient-relief-two-probes',
        cloudSunProbes: 2,
        cloudMorph: cloudMaterial.uniforms.cloudMorph.value.toArray(),
        starCount: count,
        starBufferBytes:
          positions.byteLength +
          colors.byteLength +
          sizes.byteLength +
          twinkles.byteLength,
        starTwinkleMode: 'seeded-independent-amplitude-and-two-frequencies',
        starTwinklePrimaryFrequencyRange: [0.45, 2.65],
        starTwinkleSecondaryFrequencyRange: [0.2, 1.8],
        starTwinkleAmplitudeRange: [0.1, 0.55],
        meteorCapacity: 9,
        meteorTimingBanks: 3,
        meteorCreationFrequencyMultiplier: 3,
        meteorBankPeriod,
        meteorGroupInterval: [0.14, 4.38],
        meteorPairEveryGroups: 2,
        meteorTripleEveryGroups: 7,
        meteorAlignedShowerEveryCycles: 14,
        meteorGroupSize: meteorGroupSize(Math.max(0, meteors[0].cycle)),
        meteorGroupHasPair: meteorGroupSize(Math.max(0, meteors[0].cycle)) > 1,
        meteorCount,
        meteorPhases: meteors.map((m) => m.phase),
        meteorStreams: meteors.map((m) => ({
          visible: m.mesh.visible,
          phase: m.phase,
          startAt: m.startAt,
          duration: m.duration,
          nextAt: m.nextAt,
          cycle: m.cycle,
          bank: m.bank,
          member: m.member,
          groupId: m.groupId,
          parallel: m.parallel,
          origin: [m.originX, m.originY],
          direction: m.material.uniforms.axis.value.toArray(),
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
        proceduralNoiseFormat: 'RG8',
        proceduralNoiseMipBytes: noiseGpuBytes,
        proceduralNoiseMipLevels: Math.log2(noiseSide) + 1,
        nebulaDimensions: [skyWidth, skyHeight],
        externalTextureRequests: 0,
        estimatedTextureMiB:
          Math.round((proceduralTextureGpuBytes / 1048576) * 10000) / 10000,
        earthRadius: 180,
        earthPosition: earth.position.toArray(),
        drawCallBudget: 15,
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
