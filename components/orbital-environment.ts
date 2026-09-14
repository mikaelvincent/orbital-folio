import type * as Three from 'three';
import {
  earthTextureSpec,
  type EarthTextureWidth,
  type EarthAppearance,
  configureEarthTexture,
  loadEarthTexture,
  disposeEarthTexture,
} from './earth-satellite';
import {
  MEDITERRANEAN_OPENING,
  orientMediterraneanEarth,
} from './earth-view-transform';
import { createNightAtmosphere } from './night-atmosphere';

type EnvironmentOptions = {
  mobile?: boolean;
  /** Developer audits may inject a decoded texture; the environment owns it. */
  earthTexture?: Three.Texture;
  /** Developer comparisons use the same loader and renderer at each shipped size. */
  earthTextureWidth?: EarthTextureWidth;
  /** Portfolio uses night; the day default retains reproducible historical audits. */
  earthAppearance?: EarthAppearance;
  /** Match the vessel lens when this environment shares its world camera. */
  cameraFov?: number;
};

// Orbital artwork uses planet-sized units; the vessel uses cabin-sized units.
// This fixed scale places the orbital world far beyond every navigation path.
export const ORBITAL_WORLD_SCALE = 32;

/** Satellite Earth, atmosphere and stars, driven by the caller's active clock. */
export function createOrbitalEnvironment(
  THREE: typeof Three,
  invalidate: () => void,
  options: EnvironmentOptions = {},
) {
  const mobile = options.mobile ?? false;
  const appearance = options.earthAppearance ?? 'day';
  const earthSpec = earthTextureSpec(options.earthTextureWidth, appearance);
  let openingElapsed = 0,
    previousEarthTime = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    options.cameraFov ?? 42,
    1,
    0.1,
    1200,
  );
  const relativeCamera = new THREE.Matrix4();
  const relativeScale = new THREE.Vector3();
  let followsWorldCamera = false;
  const skyCameraRotation = new THREE.Matrix3();
  const screenGeometry = new THREE.PlaneGeometry(2, 2);
  const screenVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.9998, 1.0);
    }
  `;
  const generationStarted = performance.now();
  let earthTexture: Three.Texture | undefined;
  const earthStatus = {
    ready: false,
    source: 'loading' as string,
    error: null as string | null,
    fetchMs: 0,
    decodeMs: 0,
    readyMs: 0,
    encodedBytes: null as number | null,
    responseBytes: 0,
  };
  const assetAbort = new AbortController();

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
  const earthTextureBytes = earthSpec.width * earthSpec.height * 4;
  let earthGpuBytes = 0;
  for (
    let w: number = earthSpec.width, h = earthSpec.height;
    ;
    w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)
  ) {
    earthGpuBytes += w * h * 4;
    if (w === 1 && h === 1) break;
  }

  const generationMs = performance.now() - generationStarted;
  const sky = new THREE.Mesh(
    screenGeometry,
    new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      uniforms: {
        skyTexture: { value: skyTexture },
        inverseProjection: { value: camera.projectionMatrixInverse },
        cameraRotation: { value: skyCameraRotation },
        worldView: { value: false },
      },
      vertexShader: screenVertex,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D skyTexture;
        uniform mat4 inverseProjection;
        uniform mat3 cameraRotation;
        uniform bool worldView;
        void main() {
          vec2 sampleUv = vUv;
          if (worldView) {
            vec3 ray = normalize(cameraRotation *
              (inverseProjection * vec4(vUv * 2.0 - 1.0, 1.0, 1.0)).xyz);
            // Infinite sky responds to viewing direction, not camera position.
            // Mirroring this subdued atlas avoids a discontinuous wrap seam.
            vec2 sphereUv = vec2(atan(ray.x, -ray.z) / 6.2831853 + 0.5,
              asin(clamp(ray.y, -1.0, 1.0)) / 3.1415927 + 0.5);
            sampleUv = 1.0 - abs(mod(sphereUv * 2.0, 2.0) - 1.0);
          }
          gl_FragColor = vec4(texture2D(skyTexture, sampleUv).rgb, 1.0);
        }`,
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
    uniform bool worldView;
    uniform vec2 referenceHalfSpan;
    void main() {
      float padding = pixelHeight * 7.0;
      float along = mix(-tailLength, padding, position.x * 0.5 + 0.5);
      float across = position.y * padding;
      vStreak = vec2(along, across);
      vec2 offset = axis * along + vec2(-axis.y, axis.x) * across;
      vec2 screen = head + offset / vec2(aspect, 1.0);
      vScreenY = screen.y;
      if (worldView) {
        vec3 world = vec3((screen * 2.0 - 1.0) * referenceHalfSpan, -240.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        vScreenY = gl_Position.y / max(0.0001, gl_Position.w) * 0.5 + 0.5;
      } else {
        gl_Position = vec4(screen * 2.0 - 1.0, 0.9998, 1.0);
      }
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
        worldView: { value: false },
        referenceHalfSpan: { value: new THREE.Vector2() },
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
  // Start over the Indian Ocean: broken clouds, visible water and nearby land.
  // This only selects geography; globe position, radius and active rotation are unchanged.
  earth.rotation.set(-1.2, -1.05, 0.18);
  const sphereGeometry = new THREE.SphereGeometry(
    1,
    mobile ? 96 : 128,
    mobile ? 64 : 96,
  );
  const surface = new THREE.Mesh<Three.SphereGeometry, Three.Material>(
    sphereGeometry,
    appearance === 'night'
      ? new THREE.MeshBasicMaterial({ color: 0x020713, toneMapped: false })
      : new THREE.MeshStandardMaterial({
          color: 0x1664a7,
          roughness: 0.62,
          metalness: 0,
          emissive: 0x06182f,
          emissiveIntensity: 0.2,
        }),
  );
  surface.scale.setScalar(180);
  earth.add(surface);
  surface.name = 'satellite-earth-surface';
  const earthReady = (async () => {
    try {
      const loaded = options.earthTexture
        ? {
            texture: options.earthTexture,
            encodedBytes: null,
            responseBytes: 0,
            fetchMs: 0,
            decodeMs: 0,
          }
        : await loadEarthTexture(
            THREE,
            assetAbort.signal,
            earthSpec.width,
            appearance,
          );
      // Yield for injected textures too, keeping readiness/lifetime behavior consistent.
      await Promise.resolve();
      if (disposed) {
        disposeEarthTexture(loaded.texture);
        return;
      }
      if (options.earthTexture) configureEarthTexture(THREE, loaded.texture);
      earthTexture = loaded.texture;
      // The source already contains the clouds and their photographic shading.
      // A single diffuse surface adds the globe's broad day/night illumination.
      // City lights belong to the night photograph: do not relight them with the day sun.
      const material =
        appearance === 'night'
          ? new THREE.MeshBasicMaterial({
              map: earthTexture,
              toneMapped: false,
            })
          : new THREE.MeshLambertMaterial({ map: earthTexture });
      surface.material.dispose();
      surface.material = material;
      Object.assign(earthStatus, {
        ready: true,
        source: options.earthTexture
          ? 'injected-satellite-texture'
          : 'local-satellite-image',
        encodedBytes: loaded.encodedBytes,
        responseBytes: loaded.responseBytes,
        fetchMs: loaded.fetchMs,
        decodeMs: loaded.decodeMs,
        readyMs: performance.now() - generationStarted,
      });
      invalidate();
    } catch (error) {
      if (disposed) return;
      earthStatus.error =
        error instanceof Error ? error.message : String(error);
      earthStatus.source = 'ocean-fallback';
      // Keep the inexpensive ocean surface if the image cannot load. Diagnostics
      // distinguish that state; a failed request never starts a procedural bake.
      invalidate();
    }
  })();

  if (appearance === 'night') {
    earth.add(createNightAtmosphere(THREE, sphereGeometry));
  } else {
    // Retain the day atmosphere for historical resolution comparisons.
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

    // Inner atmospheric scattering retains the existing soft horizon.
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
    scene.add(new THREE.AmbientLight(0x527dab, 0.65));
    const sunlight = new THREE.DirectionalLight(0xf0f7ff, 3.2);
    sunlight.position.set(-120, 100, 120);
    scene.add(sunlight);
  }
  scene.add(earth);

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
    if (appearance === 'night') orientMediterraneanEarth(THREE, earth, camera);
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
    ready: earthReady,
    resize(width: number, height: number, pixelRatio: number) {
      const safeHeight = Math.max(1, height);
      camera.aspect = Math.max(1, width) / safeHeight;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      camera.updateMatrixWorld(true);
      placeEarth(Math.max(1, width), safeHeight);
      starsMaterial.uniforms.pixelRatio.value = Math.max(1, pixelRatio);
      for (const { material } of meteors) {
        material.uniforms.aspect.value = camera.aspect;
        material.uniforms.pixelHeight.value = 1 / safeHeight;
        const halfHeight =
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 240;
        material.uniforms.referenceHalfSpan.value.set(
          halfHeight * camera.aspect,
          halfHeight,
        );
        material.uniforms.tailLength.value = Math.min(
          0.12,
          camera.aspect * 0.26,
        );
      }
    },
    followCamera(
      worldCamera: Three.PerspectiveCamera,
      reference: Three.PerspectiveCamera,
    ) {
      // Equivalent to placing this entire orbital scene under the fixed world
      // transform reference.matrixWorld * scale(ORBITAL_WORLD_SCALE).
      relativeCamera
        .copy(reference.matrixWorld)
        .invert()
        .multiply(worldCamera.matrixWorld);
      relativeCamera.decompose(
        camera.position,
        camera.quaternion,
        relativeScale,
      );
      camera.position.multiplyScalar(1 / ORBITAL_WORLD_SCALE);
      camera.updateMatrixWorld(true);
      skyCameraRotation.setFromMatrix4(camera.matrixWorld);
      if (!followsWorldCamera) {
        followsWorldCamera = true;
        sky.material.uniforms.worldView.value = true;
        for (const meteor of meteors)
          meteor.material.uniforms.worldView.value = true;
      }
    },
    update(time: number, moving: boolean, x: number, y: number) {
      if (disposed) return;
      if (!followsWorldCamera) camera.position.set(x * 0.4, y * 0.4, 0);
      if (moving && Number.isFinite(time)) activeTime = Math.max(0, time);
      if (appearance === 'night') {
        if (moving && earthStatus.ready)
          openingElapsed += Math.max(0, activeTime - previousEarthTime);
        previousEarthTime = activeTime;
      }
      surface.rotation.y =
        ((appearance === 'night' ? openingElapsed : activeTime) * 0.003) %
        (Math.PI * 2);
      starsMaterial.uniforms.time.value = activeTime;
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
        cameraMode: followsWorldCamera
          ? 'shared-world-camera'
          : 'authored-preview',
        cameraPosition: camera.position.toArray(),
        cameraQuaternion: camera.quaternion.toArray(),
        worldScale: ORBITAL_WORLD_SCALE,
        ready: !disposed,
        earthReady: earthStatus.ready && !disposed,
        earthMode:
          appearance === 'night'
            ? 'satellite-night-lights'
            : 'satellite-land-ocean-clouds',
        earthAppearance: appearance,
        earthOpening:
          appearance === 'night' ? { ...MEDITERRANEAN_OPENING } : null,
        earthOpeningElapsed:
          appearance === 'night' ? openingElapsed : activeTime,
        earthSource: earthStatus.source,
        earthLoadError: earthStatus.error,
        earthRotation: surface.rotation.y,
        earthRotationRate: 0.003,
        earthTextureFetchMs: earthStatus.fetchMs,
        earthTextureDecodeMs: earthStatus.decodeMs,
        earthTextureReadyMs: earthStatus.readyMs,
        earthEncodedBytes: earthStatus.encodedBytes,
        earthResponseBytes: earthStatus.responseBytes,
        earthTextureDimensions: [earthSpec.width, earthSpec.height],
        earthTextureBytes: earthStatus.ready ? earthTextureBytes : 0,
        earthTextureGpuBytes: earthStatus.ready ? earthGpuBytes : 0,
        earthTextureSamples: 1,
        cloudRotation: surface.rotation.y,
        cloudRotationRate: 0.003,
        cloudFieldSamples: 0,
        cloudWeatherModel:
          appearance === 'night'
            ? 'cloud-free-night-composite'
            : 'combined-satellite-image',
        cloudLightingModel:
          appearance === 'night'
            ? 'photographic-night-lights'
            : 'photographic-clouds-diffuse-globe',
        cloudReady: earthStatus.ready && !disposed,
        cloudTextureSize: 0,
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
        textureSize: earthSpec.width,
        dayTextureSize: earthSpec.width,
        proceduralTextureBytes: skyData.byteLength,
        proceduralTextureGpuBytes: skyGpuBytes,
        proceduralGenerationMs: Math.round(generationMs * 100) / 100,
        nebulaDimensions: [skyWidth, skyHeight],
        externalTextureRequests: options.earthTexture ? 0 : 1,
        estimatedTextureMiB:
          Math.round(
            ((skyGpuBytes + (earthStatus.ready ? earthGpuBytes : 0)) /
              1048576) *
              10000,
          ) / 10000,
        earthRadius: 180,
        earthPosition: earth.position.toArray(),
        earthAtmosphereLayers: appearance === 'night' ? 1 : 2,
        drawCallBudget: appearance === 'night' ? 13 : 14,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      assetAbort.abort();
      if (earthTexture) disposeEarthTexture(earthTexture);
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
