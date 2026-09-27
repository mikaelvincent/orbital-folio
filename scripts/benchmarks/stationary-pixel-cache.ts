import type { SceneShadingContext } from '../../features/diagnostics/scene-audit';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** Investigation only. Never imported by the visitor application. */
export function createStationaryPixelCache(context: SceneShadingContext) {
  const { three: T, renderer, scene, camera, model } = context;
  const render = renderer.render.bind(renderer);
  const meshes: any[] = [];
  const cached: any[] = [];
  const live: any[] = [];
  const materials = new Set<any>();
  const lights: any[] = [];
  scene.traverse((object: any) => {
    if (object.isLight) lights.push(object);
    if (!object.isMesh) return;
    meshes.push(object);
    const m = object.material;
    const eligible = !Array.isArray(m) && !m.transparent && m.toneMapped &&
      m.depthWrite && m.depthTest && m.colorWrite && !m.alphaToCoverage && !m.alphaTest && !m.isShaderMaterial &&
      !m.transmission && !object.isSkinnedMesh && !/meter-channel-/.test(m.name);
    (eligible ? cached : live).push(object);
    if (eligible) materials.add(m);
  });
  const target = new T.WebGLRenderTarget(1, 1, {
    type: T.HalfFloatType, minFilter: T.NearestFilter, magFilter: T.NearestFilter,
    depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType), samples: 4,
  });
  target.texture.name = 'stationary-spacecraft-linear-color';
  const material = new T.ShaderMaterial({
    uniforms: { colorMap: { value: target.texture }, depthMap: { value: target.depthTexture } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D colorMap;uniform sampler2D depthMap;varying vec2 vUv;
      void main(){vec4 c=texture2D(colorMap,vUv);if(c.a==0.)discard;
      gl_FragColor=vec4(c.rgb/c.a,c.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragDepth=texture2D(depthMap,vUv).r;}`,
    transparent: true, depthTest: true, depthFunc: T.AlwaysDepth, depthWrite: true, toneMapped: true,
  });
  const quad = new FullScreenQuad(material);
  let enabled = false, valid = false, priorKey = '', equalFrames = 0;
  let hits = 0, builds = 0, fallbacks = 0;
  const oldColor = new T.Color();
  const size = new T.Vector2();
  const values: (number | string | boolean | undefined)[] = [];
  function key() {
    values.length = 0;
    values.push(...camera.matrixWorld.elements, ...camera.projectionMatrix.elements,
      model.group.userData.geometryRevision, renderer.toneMapping, renderer.toneMappingExposure,
      renderer.outputColorSpace, renderer.shadowMap.enabled, scene.environment?.version,
      scene.environmentIntensity, ...scene.environmentRotation.toArray());
    for (const light of lights) values.push(light.visible, light.intensity, light.color.r,
      light.color.g, light.color.b, ...light.matrixWorld.elements);
    for (const m of materials) {
      values.push(m.id, m.version, m.visible, m.color?.r, m.color?.g, m.color?.b,
        m.emissive?.r, m.emissive?.g, m.emissive?.b, m.emissiveIntensity,
        m.roughness, m.metalness, m.opacity, m.side, m.map?.version,
        m.normalMap?.version, m.roughnessMap?.version, m.envMap?.version);
    }
    for (const mesh of cached) {
      values.push(mesh.visible, mesh.material.id, mesh.geometry.id,
        mesh.geometry.attributes.position?.version, mesh.instanceMatrix?.version, mesh.count);
      let parent = mesh.parent;
      while (parent && parent !== scene) { values.push(parent.visible); parent = parent.parent; }
    }
    return values.join(',');
  }
  function hide(objects: any[], fn: () => void) {
    const visibility = objects.map(o => o.visible);
    objects.forEach(o => o.visible = false);
    try { fn(); } finally { objects.forEach((o, i) => o.visible = visibility[i]); }
  }
  renderer.render = (renderScene, renderCamera) => {
    if (!enabled || renderScene !== scene || renderCamera !== camera || renderer.getRenderTarget()) {
      render(renderScene, renderCamera); return;
    }
    renderer.getDrawingBufferSize(size);
    if (target.width !== size.x || target.height !== size.y) {
      target.setSize(size.x, size.y); valid = false; equalFrames = 0;
    }
    const next = key();
    if (next !== priorKey || renderer.shadowMap.needsUpdate || model.group.userData.transitionActive) {
      priorKey = next; valid = false; equalFrames = 0;
    } else equalFrames++;
    // Rebuilding on every scan/transition would pay for the target and resolve
    // without reusing pixels. Wait for two unchanged frames before allocating work.
    if (equalFrames < 2) { fallbacks++; render(scene, camera); return; }
    if (!valid) {
      const alpha = renderer.getClearAlpha(); renderer.getClearColor(oldColor);
      try {
        renderer.setRenderTarget(target); renderer.setClearColor(0, 0); renderer.clear();
        hide(live, () => render(scene, camera));
      } finally {
        renderer.setClearColor(oldColor, alpha); renderer.setRenderTarget(null);
      }
      valid = true; builds++;
    } else hits++;
    quad.render(renderer);
    hide(cached, () => render(scene, camera));
  };
  return {
    select(value: boolean) { enabled = value; valid = false; equalFrames = 0; priorKey = ''; },
    invalidate() { valid = false; equalFrames = 0; priorKey = ''; },
    stats() { return { enabled, valid, equalFrames, hits, builds, fallbacks, cached: cached.length,
      live: live.length, width: target.width, height: target.height, samples: target.samples,
      nominalAttachmentBytes: target.width * target.height * (8 + 4) * (target.samples + 1) }; },
    dispose() { renderer.render = render; target.dispose(); quad.dispose(); material.dispose(); },
  };
}
