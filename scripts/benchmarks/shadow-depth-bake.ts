/** Offline native-depth experiment. No application import, private renderer API,
 * shader replacement in the portfolio, or visitor-side baking. */
import * as THREE from 'three';
import type { SceneAudit } from '../../features/diagnostics/scene-audit';

type Context = Parameters<NonNullable<SceneAudit['shadowReady']>>[0];
const vertexShader = `in vec3 position;
void main() { gl_Position = vec4(position, 1.0); }`;
const unpack = `uint byteValue(float v) { return uint(round(v * 255.0)); }
float unpackDepth(vec4 v) {
  uint bits = byteValue(v.r) | (byteValue(v.g) << 8u) |
    (byteValue(v.b) << 16u) | (byteValue(v.a) << 24u);
  return uintBitsToFloat(bits);
}`;

export function createShadowBakeSession({ renderer, light, scene }: Context) {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const shadow = light.shadow;
  let source: THREE.WebGLRenderTarget | null = null;
  let restored: THREE.WebGLRenderTarget | null = null;
  let savedMatrix = new THREE.Matrix4();
  let savedSignature: unknown;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3));
  const quad = new THREE.Mesh(geometry);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const camera = new THREE.Camera();
  const packMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader,
    fragmentShader: `precision highp float; precision highp int;
      uniform highp sampler2D sourceDepth; out vec4 outColor;
      void main() {
        uint bits = floatBitsToUint(texelFetch(sourceDepth, ivec2(gl_FragCoord.xy), 0).r);
        outColor = vec4(float(bits & 255u), float((bits >> 8u) & 255u),
          float((bits >> 16u) & 255u), float((bits >> 24u) & 255u)) / 255.0;
      }`,
    uniforms: { sourceDepth: { value: null } },
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    toneMapped: false,
  });
  const restoreMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader,
    fragmentShader: `precision highp float; precision highp int;
      uniform highp sampler2D packedDepth; out vec4 outColor;
      ${unpack}
      void main() {
        gl_FragDepth = unpackDepth(texelFetch(packedDepth, ivec2(gl_FragCoord.xy), 0));
        outColor = vec4(0.0);
      }`,
    uniforms: { packedDepth: { value: null } },
    depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
    colorWrite: false, blending: THREE.NoBlending, toneMapped: false,
  });
  function depthTarget(size: number, compare: boolean) {
    const target = new THREE.WebGLRenderTarget(size, size);
    target.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
    target.depthTexture.format = THREE.DepthFormat;
    target.depthTexture.compareFunction = compare ? THREE.LessEqualCompare : null;
    target.depthTexture.minFilter = target.depthTexture.magFilter = compare ? THREE.LinearFilter : THREE.NearestFilter;
    renderer.initRenderTarget(target);
    return target;
  }
  function renderQuad(target: THREE.WebGLRenderTarget, material: THREE.RawShaderMaterial) {
    const previous = renderer.getRenderTarget();
    const enabled = renderer.shadowMap.enabled;
    try {
      // This helper is outside the measured main scene; never nests shadow work.
      renderer.shadowMap.enabled = false;
      quad.material = material;
      renderer.setRenderTarget(target);
      renderer.render(quadScene, camera);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.shadowMap.enabled = enabled;
    }
  }
  function readDepth(target: THREE.WebGLRenderTarget) {
    const size = target.width;
    const copy = depthTarget(size, false);
    const packed = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false });
    const data = new Uint8Array(size * size * 4);
    try {
      renderer.copyTextureToTexture(target.depthTexture!, copy.depthTexture!);
      packMaterial.uniforms.sourceDepth.value = copy.depthTexture;
      renderQuad(packed, packMaterial);
      renderer.readRenderTargetPixels(packed, 0, 0, size, size, data);
      return data;
    } finally { copy.dispose(); packed.dispose(); packMaterial.uniforms.sourceDepth.value = null; }
  }
  // Diagnostic snapshot only; source manifest identifies the frozen geometry.
  // This is deliberately not a production cache-validity key.
  function signature() {
    const casters: unknown[] = [];
    scene.traverseVisible((object) => {
      if (!(object instanceof THREE.Mesh) || !object.castShadow) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      casters.push({
        name: object.name, matrix: object.matrixWorld.toArray(),
        vertices: object.geometry.getAttribute('position').count,
        indexCount: object.geometry.index?.count ?? null,
        materials: materials.map((m) => ({ visible: m.visible, side: m.side, shadowSide: m.shadowSide, alphaTest: m.alphaTest })),
      });
    });
    return { size: shadow.mapSize.toArray(), matrix: shadow.matrix.toArray(),
      lightPosition: light.getWorldPosition(new THREE.Vector3()).toArray(),
      up: shadow.camera.up.toArray(), bias: shadow.bias, normalBias: shadow.normalBias,
      radius: shadow.radius, shadowType: renderer.shadowMap.type, casters };
  }
  function selectLive() {
    if (source) shadow.map = source;
    shadow.autoUpdate = true;
    shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }
  return {
    capture() {
      if (!shadow.map) throw new Error('Render the live shadow map before baking.');
      source = shadow.map as THREE.WebGLRenderTarget;
      savedMatrix = shadow.matrix.clone();
      savedSignature = signature();
      const started = performance.now();
      const data = readDepth(source);
      return { data, size: source.width, captureMs: performance.now() - started, signature: savedSignature };
    },
    /** Includes the actual data upload + fullscreen depth restoration submission. */
    restore(data: Uint8Array, size: number) {
      if (!source || data.length !== size * size * 4 || size !== source.width) throw new Error('Bake does not match this shadow map.');
      restored?.dispose();
      restored = depthTarget(size, true);
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.minFilter = texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false; texture.needsUpdate = true;
      restoreMaterial.uniforms.packedDepth.value = texture;
      try { renderQuad(restored, restoreMaterial); }
      finally { texture.dispose(); restoreMaterial.uniforms.packedDepth.value = null; }
    },
    verifyDepth(data: Uint8Array) {
      if (!restored) throw new Error('No restored map.');
      const reread = readDepth(restored);
      let changedBytes = 0;
      for (let i = 0; i < data.length; i++) if (data[i] !== reread[i]) changedBytes++;
      return { changedBytes, bytes: data.length, glError: gl.getError() };
    },
    selectBaked() {
      if (!restored) throw new Error('Restore a bake first.');
      shadow.map = restored;
      shadow.matrix.copy(savedMatrix);
      shadow.autoUpdate = false; shadow.needsUpdate = false;
    },
    selectLive,
    signature,
    get original() { return source; },
    dispose() {
      selectLive(); restored?.dispose(); geometry.dispose();
      packMaterial.dispose(); restoreMaterial.dispose();
    },
  };
}
