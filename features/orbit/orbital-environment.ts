import type * as Three from 'three';
import {
  EARTH_TEXTURE_WIDTH,
  EARTH_TEXTURE_HEIGHT,
  EARTH_TEXTURE_ASSET,
  EARTH_SOURCE_WIDTH,
  EARTH_SOURCE_HEIGHT,
  EARTH_REGION_START_X,
  EARTH_REGION_START_Y,
  configureEarthTexture,
  advanceEarthTexture,
  loadEarthTexture,
  disposeEarthTexture,
} from './earth-satellite';
import {
  NIGHT_EARTH_OPENING,
  placeNightEarth,
  EARTH_RADIUS,
  EARTH_ROTATION_RADIANS_PER_SECOND,
} from './earth-view-transform';
import { createNightAtmosphere } from './night-atmosphere';
import {
  normalizeEarthPlaybackSpeed,
  type EarthPlaybackCommand,
  type EarthPlaybackState,
} from './earth-playback';

type EnvironmentOptions = {
  mobile?: boolean;
  /** Developer audits may inject a decoded texture; the environment owns it. */
  earthTexture?: Three.Texture;
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
  let openingElapsed = 0,
    previousEarthTime = 0;
  let earthPlaybackSpeed = 1,
    earthPlaying = true,
    earthSeekAtEnd = false;
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
  const earthTextureBytes = EARTH_TEXTURE_WIDTH * EARTH_TEXTURE_HEIGHT * 4;
  const earthLoopSeconds =
    (Math.PI * 2 * EARTH_TEXTURE_WIDTH) /
    (EARTH_ROTATION_RADIANS_PER_SECOND * EARTH_SOURCE_WIDTH);
  let earthGpuBytes = 0;
  for (
    let w: number = EARTH_TEXTURE_WIDTH, h = EARTH_TEXTURE_HEIGHT;
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
  // A surrounding sky has no rectangular boundary for hover, drag, portrait
  // roll or room travel to uncover. Most points are behind the camera; angular
  // density, rather than a larger flat patch, keeps every view equally populated.
  const count = mobile ? 9000 : 12000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const vertical = random() * 2 - 1;
    const azimuth = random() * Math.PI * 2;
    const radial = Math.sqrt(1 - vertical * vertical);
    positions.set(
      [
        Math.cos(azimuth) * radial * 1000,
        vertical * 1000,
        Math.sin(azimuth) * radial * 1000,
      ],
      i * 3,
    );
    const tier = random();
    const brightStar = tier > 0.95;
    const middleStar = tier > 0.7;
    const brightness = brightStar
      ? 0.86 + random() * 0.14
      : 0.42 + random() * 0.38;
    colors.set(
      [
        brightness * (0.78 + random() * 0.22),
        brightness * (0.87 + random() * 0.13),
        brightness,
      ],
      i * 3,
    );
    // CSS-pixel diameters: a quiet fine field, clearly readable medium stars,
    // and a few soft luminous anchors. Avoid a screen full of subpixel dust.
    sizes[i] = brightStar
      ? 6.2 + random() * 1.8
      : middleStar
        ? 3.6 + random() * 1.4
        : 2.2 + random() * 1.1;
    twinkles.set(
      [
        random() * Math.PI * 2,
        0.8 + random() * 1.4,
        brightStar ? 0.86 + random() * 0.08 : 0.58 + random() * 0.24,
        0.35 + random() * 1.05,
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
      varying float vProminence;
      uniform float pixelRatio;
      uniform float time;
      void main() {
        float pulse = sin(time * twinkle.y + twinkle.x) * 0.68
          + sin(time * twinkle.w + twinkle.x * 1.618) * 0.32;
        vColor = color * (1.0 + pulse * twinkle.z);
        vProminence = smoothstep(4.5, 7.0, size);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        // Breathing halos make modulation readable without blinking the stars
        // off. Independent phases prevent a synchronized pulsing background.
        gl_PointSize = size * pixelRatio * (1.0 + pulse * 0.18);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vProminence;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float core = exp(-d * d * 58.0);
        float halo = exp(-d * d * 14.0) * 0.32;
        float glint = exp(-min(p.x * p.x, p.y * p.y) * 900.0)
          * exp(-d * d * 20.0) * vProminence * 0.14;
        float alpha = (core + halo + glint) * (1.0 - smoothstep(0.28, 0.5, d));
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // Nine reusable slots form three staggered single/pair/triple events per nine
  // seconds: half the previous creation rate, without the synchronized showers.
  // Each small group shares a direction; its members drift past in loose succession.
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
          float alpha = (line * 0.70 + halo * 0.07 + tip * 0.80 + glow * 0.10) * opacity;
          alpha *= 1.0 - smoothstep(0.85, 0.89, vScreenY);
          vec3 color = mix(vec3(0.68, 0.78, 0.92), headColor, clamp(tip + line * 0.3, 0.0, 1.0));
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
      tailLength: 0.08,
      parallel: false,
      groupSize: 1,
      groupId: -1,
    };
  });

  let disposed = false;
  const earth = new THREE.Group();
  placeNightEarth(THREE, earth);
  earth.updateMatrix();
  const authoredEarthTransform = earth.matrix.clone();
  const earthWorldReference = new THREE.Matrix4();
  const earthPresentationTransform = new THREE.Matrix4();
  const layoutRotation = new THREE.Matrix4();
  let earthLayoutRoll = 0;
  const sphereGeometry = new THREE.SphereGeometry(
    1,
    mobile ? 96 : 128,
    mobile ? 64 : 96,
  );
  const surface = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshBasicMaterial({ color: 0x020713, toneMapped: false }),
  );
  surface.scale.setScalar(EARTH_RADIUS);
  earth.add(surface, createNightAtmosphere(THREE, sphereGeometry));
  surface.name = 'satellite-earth-surface';
  const earthReady = (async () => {
    let loadedTexture: Three.Texture | undefined;
    try {
      const loaded = options.earthTexture
        ? {
            texture: options.earthTexture,
            encodedBytes: null,
            responseBytes: 0,
            fetchMs: 0,
            decodeMs: 0,
          }
        : await loadEarthTexture(THREE, assetAbort.signal);
      loadedTexture = loaded.texture;
      // Injected assets obey the same asynchronous readiness/lifetime contract.
      await Promise.resolve();
      if (disposed) return;
      if (options.earthTexture) configureEarthTexture(THREE, loaded.texture);
      // City-light photography is not relit or tone mapped.
      const material = new THREE.MeshBasicMaterial({
        map: loaded.texture,
        toneMapped: false,
      });
      surface.material.dispose();
      surface.material = material;
      earthTexture = loaded.texture;
      advanceEarthTexture(
        earthTexture,
        openingElapsed * EARTH_ROTATION_RADIANS_PER_SECOND,
      );
      loadedTexture = undefined;
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
    } catch (error) {
      if (disposed) return;
      earthStatus.error =
        error instanceof Error ? error.message : String(error);
      earthStatus.source = 'ocean-fallback';
    } finally {
      if (loadedTexture) disposeEarthTexture(loadedTexture);
      if (!disposed) invalidate();
    }
  })();
  scene.add(earth);

  let activeTime = 0;
  const phaseHash = (value: number) => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const meteorBankPeriod = 9;
  const meteorGroupSize = (cycle: number, bank = 0) => {
    const group = cycle * 3 + bank;
    return group % 7 === 3 ? 3 : group % 2 === 1 ? 2 : 1;
  };
  const meteorGroupStart = (cycle: number, bank: number) =>
    cycle * meteorBankPeriod +
    0.8 +
    bank * 2.55 +
    phaseHash(cycle + bank * 5.19 + 0.17) * 0.45;
  const meteorStart = (cycle: number, index: number) =>
    meteorGroupStart(cycle, Math.floor(index / 3)) +
    (index % 3) *
      (0.28 + phaseHash(cycle + Math.floor(index / 3) * 7.13 + 0.73) * 0.16);
  const nextMeteorStart = (time: number, index: number) => {
    let cycle = Math.max(0, Math.floor(time / meteorBankPeriod));
    for (let step = 0; step < 8; step++, cycle++) {
      const start = meteorStart(cycle, index);
      if (
        meteorGroupSize(cycle, Math.floor(index / 3)) > index % 3 &&
        start >= time
      )
        return start;
    }
    return meteorStart(cycle, index);
  };
  // Descriptors change once per event. Frame updates only interpolate the head
  // along a cached axis, preserving deterministic seeks, resets and paused time.
  const configureMeteor = (meteor: (typeof meteors)[number], cycle: number) => {
    const { bank, member } = meteor;
    const key = cycle * 37.31 + bank * 11.17;
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
    const spread = member * (0.009 + phaseHash(key + 8.4) * 0.01);
    meteor.cycle = cycle;
    meteor.startAt = meteorStart(cycle, bank * 3 + member);
    meteor.duration =
      2.15 + phaseHash(cycle * 3 + bank * 7.7 + member + 0.31) * 0.5;
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
    meteor.strength =
      (0.2 + phaseHash(key + member * 19.1 + 12.7) * 0.15) *
      (1 - member * 0.08);
    meteor.tailLength = 0.055 + phaseHash(key + member * 7.3 + 14.6) * 0.05;
    meteor.material.uniforms.tailLength.value = Math.min(
      meteor.tailLength,
      meteor.material.uniforms.aspect.value * 0.26,
    );
    meteor.parallel = true;
    meteor.groupSize = meteorGroupSize(cycle, bank);
    meteor.groupId = cycle * 3 + bank;
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
    resize(
      width: number,
      height: number,
      pixelRatio: number,
      fieldOfView = camera.fov,
    ) {
      const safeHeight = Math.max(1, height);
      camera.fov = fieldOfView;
      camera.aspect = Math.max(1, width) / safeHeight;
      camera.updateProjectionMatrix();
      // A resize changes projection only. Preserve the current physical camera
      // and fixed Earth transform; the caller may subsequently reframe its view.
      starsMaterial.uniforms.pixelRatio.value = Math.max(1, pixelRatio);
      for (const { material, tailLength } of meteors) {
        material.uniforms.aspect.value = camera.aspect;
        material.uniforms.pixelHeight.value = 1 / safeHeight;
        const halfHeight =
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 240;
        material.uniforms.referenceHalfSpan.value.set(
          halfHeight * camera.aspect,
          halfHeight,
        );
        material.uniforms.tailLength.value = Math.min(
          tailLength,
          camera.aspect * 0.26,
        );
      }
    },
    followCamera(
      worldCamera: Three.PerspectiveCamera,
      reference: Three.PerspectiveCamera,
      layoutRoll = 0,
    ) {
      // Keep the authored bottom-left horizon during the responsive hull roll.
      // This narrow art-direction exception moves Earth and its atmosphere only:
      // hover, drag, camera translation and the surrounding sky stay physical.
      // Conjugating the world roll into orbital coordinates preserves the same
      // pivot as the vessel camera, including the reference's translation.
      if (earthLayoutRoll !== layoutRoll) {
        earthLayoutRoll = layoutRoll;
        if (layoutRoll === 0)
          earthPresentationTransform.copy(authoredEarthTransform);
        else {
          earthWorldReference.copy(reference.matrixWorld);
          earthWorldReference.elements[12] /= ORBITAL_WORLD_SCALE;
          earthWorldReference.elements[13] /= ORBITAL_WORLD_SCALE;
          earthWorldReference.elements[14] /= ORBITAL_WORLD_SCALE;
          earthPresentationTransform
            .copy(earthWorldReference)
            .invert()
            .multiply(layoutRotation.makeRotationZ(-layoutRoll))
            .multiply(earthWorldReference)
            .multiply(authoredEarthTransform);
        }
        earthPresentationTransform.decompose(
          earth.position,
          earth.quaternion,
          earth.scale,
        );
      }
      if (camera.fov !== worldCamera.fov) {
        camera.fov = worldCamera.fov;
        camera.updateProjectionMatrix();
      }
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
      const elapsedDelta = Math.max(0, activeTime - previousEarthTime);
      if (moving && earthStatus.ready && earthPlaying && elapsedDelta > 0) {
        openingElapsed += elapsedDelta * earthPlaybackSpeed;
        earthSeekAtEnd = false;
      }
      previousEarthTime = activeTime;
      if (earthTexture)
        advanceEarthTexture(
          earthTexture,
          openingElapsed * EARTH_ROTATION_RADIANS_PER_SECOND,
        );
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
            Math.pow(Math.sin(Math.PI * phase), 1.5) * meteor.strength;
        } else uniforms.opacity.value = 0;
      }
    },
    getEarthPlayback(): EarthPlaybackState {
      return {
        time: earthSeekAtEnd
          ? earthLoopSeconds
          : openingElapsed % earthLoopSeconds,
        duration: earthLoopSeconds,
        speed: earthPlaybackSpeed,
        playing: earthPlaying,
        ready: earthStatus.ready && !disposed,
      };
    },
    setEarthPlayback(command: EarthPlaybackCommand): void {
      if (disposed) return;
      switch (command.type) {
        case 'seek':
          openingElapsed = Number.isFinite(command.time)
            ? Math.max(0, Math.min(earthLoopSeconds, command.time))
            : 0;
          earthPlaying = false;
          earthSeekAtEnd = openingElapsed === earthLoopSeconds;
          break;
        case 'speed':
          earthPlaybackSpeed = normalizeEarthPlaybackSpeed(command.speed);
          break;
        case 'playing':
          earthPlaying = command.playing;
          break;
        case 'reset':
          openingElapsed = 0;
          earthSeekAtEnd = false;
          earthPlaybackSpeed = 1;
          earthPlaying = true;
          break;
        case 'close':
          earthPlaybackSpeed = 1;
          earthPlaying = true;
          break;
      }
      // Seeking is an explicit inspection action even when global motion is
      // paused. No caller/star/camera clock changes, resource changes or uploads.
      if (earthTexture)
        advanceEarthTexture(
          earthTexture,
          openingElapsed * EARTH_ROTATION_RADIANS_PER_SECOND,
        );
      invalidate();
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
        earthMode: 'satellite-night-lights',
        earthAppearance: 'night',
        earthOpening: { ...NIGHT_EARTH_OPENING },
        earthOpeningElapsed: openingElapsed,
        earthSource: earthStatus.source,
        earthLoadError: earthStatus.error,
        earthRotation:
          (openingElapsed * EARTH_ROTATION_RADIANS_PER_SECOND) % (Math.PI * 2),
        earthMeshRotation: surface.rotation.y,
        earthMapping: 'fixed-sphere-longitude-scroll',
        earthLayoutRoll,
        earthRotationRate: EARTH_ROTATION_RADIANS_PER_SECOND,
        earthPlaybackSpeed,
        earthPlaying,
        earthLoopSeconds,
        earthLoopPhase: (openingElapsed % earthLoopSeconds) / earthLoopSeconds,
        earthTextureRepresentation: 'authored-regional-night-loop',
        earthTextureAsset: EARTH_TEXTURE_ASSET,
        earthTextureSourceDimensions: [EARTH_SOURCE_WIDTH, EARTH_SOURCE_HEIGHT],
        earthRegionSourceOrigin: [EARTH_REGION_START_X, EARTH_REGION_START_Y],
        earthTextureRepeat: [
          EARTH_SOURCE_WIDTH / EARTH_TEXTURE_WIDTH,
          EARTH_SOURCE_HEIGHT / EARTH_TEXTURE_HEIGHT,
        ],
        earthTextureOffset: [
          earthTexture?.offset.x ?? -EARTH_REGION_START_X / EARTH_TEXTURE_WIDTH,
          -(EARTH_SOURCE_HEIGHT - EARTH_REGION_START_Y - EARTH_TEXTURE_HEIGHT) /
            EARTH_TEXTURE_HEIGHT,
        ],
        earthTextureFetchMs: earthStatus.fetchMs,
        earthTextureDecodeMs: earthStatus.decodeMs,
        earthTextureReadyMs: earthStatus.readyMs,
        earthEncodedBytes: earthStatus.encodedBytes,
        earthResponseBytes: earthStatus.responseBytes,
        earthTextureDimensions: [EARTH_TEXTURE_WIDTH, EARTH_TEXTURE_HEIGHT],
        earthTextureBytes: earthStatus.ready ? earthTextureBytes : 0,
        earthTextureGpuBytes: earthStatus.ready ? earthGpuBytes : 0,
        earthTextureSamples: 1,
        cloudRotation:
          (openingElapsed * EARTH_ROTATION_RADIANS_PER_SECOND) % (Math.PI * 2),
        cloudRotationRate: EARTH_ROTATION_RADIANS_PER_SECOND,
        cloudFieldSamples: 0,
        cloudWeatherModel: 'cloud-free-night-composite',
        cloudLightingModel: 'photographic-night-lights',
        cloudReady: earthStatus.ready && !disposed,
        cloudTextureSize: 0,
        starCount: count,
        starDistribution: 'uniform-surrounding-sphere',
        starSphereRadius: 1000,
        starBaseSizeCssRange: [2.2, 8],
        starBufferBytes:
          positions.byteLength +
          colors.byteLength +
          sizes.byteLength +
          twinkles.byteLength,
        starTwinkleMode: 'seeded-independent-brightness-and-halo-breathing',
        starTwinklePrimaryFrequencyRange: [0.8, 2.2],
        starTwinkleSecondaryFrequencyRange: [0.35, 1.4],
        starTwinkleAmplitudeRange: [0.58, 0.94],
        meteorCapacity: 9,
        meteorTimingBanks: 3,
        meteorCreationFrequencyMultiplier: 1.5,
        meteorCreationRateComparedWithPrevious: 0.5,
        meteorBankPeriod,
        meteorGroupInterval: [2.1, 4.35],
        meteorDurationRange: [2.15, 2.65],
        meteorPeakOpacityRange: [0.168, 0.35],
        meteorTailLengthRange: [0.055, 0.105],
        meteorMemberStaggerRange: [0.28, 0.44],
        meteorFadeExponent: 1.5,
        meteorPairEveryGroups: 2,
        meteorTripleEveryGroups: 7,
        meteorAlignedShowerEveryCycles: null,
        meteorGroupSize: meteorGroupSize(Math.max(0, meteors[0].cycle)),
        meteorGroupHasPair: meteorGroupSize(Math.max(0, meteors[0].cycle)) > 1,
        meteorCount,
        meteorPhases: meteors.map((m) => m.phase),
        meteorStreams: meteors.map((m) => ({
          visible: m.mesh.visible,
          phase: m.phase,
          startAt: m.startAt,
          duration: m.duration,
          peakOpacity: m.strength,
          opacity: m.material.uniforms.opacity.value,
          tailLength: m.material.uniforms.tailLength.value,
          travel: m.travel,
          groupSize: m.groupSize,
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
        textureSize: EARTH_TEXTURE_WIDTH,
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
        earthRadius: EARTH_RADIUS,
        earthQuaternion: earth.quaternion.toArray(),
        earthPosition: earth.position.toArray(),
        earthAtmosphereLayers: 1,
        drawCallBudget: 13,
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
