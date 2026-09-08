import type * as Three from 'three';

type EnvironmentOptions = {
  mobile?: boolean;
  maxAnisotropy?: number;
  maxTextureSize?: number;
  mobileCloudResolution?: 2048 | 4096;
};

/** NASA Earth maps and a seven-draw-call sky, driven only by the caller's active time. */
export function createOrbitalEnvironment(
  THREE: typeof Three,
  invalidate: () => void,
  options: EnvironmentOptions = {},
) {
  const mobile = options.mobile ?? false;
  const requestedAnisotropy = options.maxAnisotropy ?? 4;
  const anisotropy = Math.max(
    1,
    Math.min(
      mobile ? 8 : 16,
      Number.isFinite(requestedAnisotropy) ? requestedAnisotropy : 4,
    ),
  );
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
  const sky = new THREE.Mesh(
    screenGeometry,
    new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexShader: screenVertex,
      fragmentShader: `
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0, weight = 0.5;
        for (int i = 0; i < 5; i++) {
          value += noise(p) * weight;
          p = mat2(1.6, -1.2, 1.2, 1.6) * p + vec2(7.1, 3.4);
          weight *= 0.5;
        }
        return value;
      }
      void main() {
        vec2 p = vUv * vec2(6.2, 4.8);
        vec2 warp = vec2(fbm(p * 0.72), fbm(p * 0.72 + 13.7));
        float cloud = fbm(p + warp * 1.4);
        float ribbon = vUv.y - vUv.x * 0.42 - 0.27 + (warp.x - 0.5) * 0.2;
        float band = exp(-ribbon * ribbon * 10.0);
        float veil = smoothstep(0.24, 0.82, cloud) * band;
        float dust = smoothstep(0.48, 0.77, fbm(p * 1.5 + 21.3));
        vec3 base = mix(vec3(0.012, 0.037, 0.084), vec3(0.027, 0.070, 0.150), vUv.y);
        base += vec3(0.020, 0.043, 0.082) * veil;
        base *= 1.0 - dust * band * 0.15;
        float vignette = 1.0 - 0.16 * length((vUv - 0.5) * vec2(1.1, 0.9));
        gl_FragColor = vec4(base * vignette, 1.0);
      }
    `,
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

  // One short streak every ~29 active seconds; no timers, textures, or per-frame geometry.
  const meteorMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      head: { value: new THREE.Vector2() },
      axis: { value: new THREE.Vector2(1, -0.28).normalize() },
      aspect: { value: 1 },
      pixelHeight: { value: 1 / 900 },
      opacity: { value: 0 },
      tailLength: { value: 0.085 },
    },
    vertexShader: screenVertex,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec2 head;
      uniform vec2 axis;
      uniform float aspect;
      uniform float pixelHeight;
      uniform float opacity;
      uniform float tailLength;
      void main() {
        vec2 p = (vUv - head) * vec2(aspect, 1.0);
        float along = dot(p, axis);
        float across = abs(p.x * axis.y - p.y * axis.x);
        float width = max(0.00065, pixelHeight * 0.65);
        float tail = smoothstep(-tailLength, 0.0, along) * (1.0 - smoothstep(0.0, width * 2.0, along));
        float line = exp(-pow(across / width, 2.0)) * tail;
        float tip = exp(-dot(p, p) / (width * width * 3.0));
        float alpha = (line * 0.6 + tip * 0.32) * opacity;
        gl_FragColor = vec4(vec3(0.61, 0.79, 1.0), alpha);
      }
    `,
  });
  const meteor = new THREE.Mesh(screenGeometry, meteorMaterial);
  meteor.frustumCulled = false;
  meteor.visible = false;
  meteor.renderOrder = -10;
  scene.add(meteor);

  const earth = new THREE.Group();
  earth.position.set(-56.652, -215.289, -161.903);
  earth.rotation.set(-0.6, 1.3, 0.18);
  const loader = new THREE.TextureLoader();
  let disposed = false,
    loadedMaps = 0;
  earth.visible = false;
  const finish = (texture: Three.Texture) => {
    if (disposed) texture.dispose();
    else {
      loadedMaps++;
      earth.visible = loadedMaps === 2;
      invalidate();
    }
  };
  const textureLimit = Number.isFinite(options.maxTextureSize)
    ? Math.max(2048, options.maxTextureSize!)
    : 8192;
  const daySize = mobile
    ? 2048
    : textureLimit >= 5400
      ? 5400
      : textureLimit >= 4096
        ? 4096
        : 2048;
  const requestedCloudSize = mobile
    ? (options.mobileCloudResolution ?? 2048)
    : 8192;
  const cloudSize =
    requestedCloudSize >= 8192 && textureLimit >= 8192
      ? 8192
      : requestedCloudSize >= 4096 && textureLimit >= 4096
        ? 4096
        : 2048;
  const day = loader.load(`/textures/earth-day-${daySize}.webp`, finish);
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = anisotropy;
  day.minFilter = THREE.LinearMipmapLinearFilter;
  day.magFilter = THREE.LinearFilter;
  const cloudMap = loader.load(
    `/textures/earth-clouds-${cloudSize}.webp`,
    finish,
  );
  cloudMap.colorSpace = THREE.NoColorSpace;
  cloudMap.anisotropy = anisotropy;
  cloudMap.minFilter = THREE.LinearMipmapLinearFilter;
  cloudMap.magFilter = THREE.LinearFilter;
  const sphereGeometry = new THREE.SphereGeometry(
    1,
    mobile ? 96 : 160,
    mobile ? 64 : 112,
  );
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    map: day,
    color: 0xf5f9ff,
    roughness: 0.94,
    metalness: 0,
  });
  // NASA's deep-ocean pixels are nearly black. Lift only dark, blue-dominant water
  // in linear space; vegetation, deserts, coast detail, and ice retain their map color.
  surfaceMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      #ifdef USE_MAP
        float oceanBlueOverGreen = diffuseColor.b / max(diffuseColor.g, 0.0005);
        float oceanBlueOverRed = diffuseColor.b / max(diffuseColor.r, 0.0005);
        float oceanMask = smoothstep(1.2, 2.5, oceanBlueOverGreen)
          * smoothstep(1.2, 2.2, oceanBlueOverRed)
          * (1.0 - smoothstep(0.06, 0.20, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b))));
        vec3 oceanDaylight = vec3(0.018, 0.095, 0.285) + diffuseColor.rgb * 0.35;
        diffuseColor.rgb = mix(diffuseColor.rgb, oceanDaylight, oceanMask * 0.97);
      #endif
    `,
    );
  };
  surfaceMaterial.customProgramCacheKey = () =>
    'orbital-earth-ocean-daylight-v3';
  const surface = new THREE.Mesh(sphereGeometry, surfaceMaterial);
  surface.scale.setScalar(180);
  earth.add(surface);
  const clouds = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xecf5ff,
      alphaMap: cloudMap,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.003,
      depthWrite: false,
      roughness: 1,
    }),
  );
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
  let meteorPhase = 0;
  let meteorCycle = 0;
  const phaseHash = (value: number) => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  return {
    scene,
    camera,
    resize(width: number, height: number, pixelRatio: number) {
      const safeHeight = Math.max(1, height);
      camera.aspect = Math.max(1, width) / safeHeight;
      camera.updateProjectionMatrix();
      placeEarth(Math.max(1, width), safeHeight);
      starsMaterial.uniforms.pixelRatio.value = Math.max(1, pixelRatio);
      meteorMaterial.uniforms.aspect.value = camera.aspect;
      meteorMaterial.uniforms.pixelHeight.value = 1 / safeHeight;
    },
    update(time: number, moving: boolean, x: number, y: number) {
      if (disposed) return;
      camera.position.set(x * 0.4, y * 0.4, 0);
      if (moving && Number.isFinite(time)) activeTime = Math.max(0, time);
      surface.rotation.y = (activeTime * 0.0015) % (Math.PI * 2);
      clouds.rotation.y = (activeTime * 0.0021) % (Math.PI * 2);
      starsMaterial.uniforms.time.value = activeTime;

      meteorCycle = Math.floor(activeTime / 29);
      const delay = 12 + phaseHash(meteorCycle) * 7;
      const duration = 0.78 + phaseHash(meteorCycle + 0.3) * 0.2;
      const rawPhase = (activeTime - meteorCycle * 29 - delay) / duration;
      meteor.visible = rawPhase >= 0 && rawPhase <= 1;
      meteorPhase = meteor.visible ? rawPhase : 0;
      if (meteor.visible) {
        const aspect = meteorMaterial.uniforms.aspect.value;
        const startX = 0.13 + phaseHash(meteorCycle + 2) * 0.37;
        const startY = 0.7 + phaseHash(meteorCycle + 4) * 0.17;
        const travel = 0.2 + phaseHash(meteorCycle + 6) * 0.07;
        const axis = meteorMaterial.uniforms.axis.value;
        meteorMaterial.uniforms.head.value.set(
          startX + (axis.x * meteorPhase * travel) / aspect,
          startY + axis.y * meteorPhase * travel,
        );
        meteorMaterial.uniforms.opacity.value =
          Math.sin(Math.PI * meteorPhase) * 0.63;
      } else {
        meteorMaterial.uniforms.opacity.value = 0;
      }
    },
    getDiagnostics() {
      return {
        activeTime,
        earthReady: earth.visible,
        earthRotation: surface.rotation.y,
        cloudRotation: clouds.rotation.y,
        meteorPhase,
        meteorCycle,
        meteorVisible: meteor.visible,
        textureSize: cloudSize,
        dayTextureSize: daySize,
        cloudTextureSize: cloudSize,
        estimatedTextureMiB:
          Math.round(
            (((daySize * daySize + cloudSize * cloudSize) * 8) / 3 / 1048576) *
              10,
          ) / 10,
        earthRadius: 180,
        earthPosition: earth.position.toArray(),
        anisotropy,
        drawCallBudget: 7,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      day.dispose();
      cloudMap.dispose();
      const geometries = new Set<Three.BufferGeometry>();
      const materials = new Set<Three.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
          }
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      scene.clear();
    },
  };
}
