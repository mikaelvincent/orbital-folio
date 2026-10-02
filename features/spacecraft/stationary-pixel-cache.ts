import type * as Three from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { createDishInfluenceCache } from './dish-influence-cache.ts';

export function canCacheSpacecraftMesh(object: any) {
  const m = object.material;
  return (
    object.isMesh &&
    !Array.isArray(m) &&
    !m.transparent &&
    m.toneMapped &&
    m.depthWrite &&
    m.depthTest &&
    m.colorWrite &&
    !m.alphaToCoverage &&
    !m.alphaTest &&
    !m.isShaderMaterial &&
    !m.transmission &&
    !object.isSkinnedMesh &&
    !m.userData.ambientColorAnimation
  );
}

/** The spacecraft has a fixed object inventory. Unexpected topology/material
 * replacement falls back to normal rendering until the scene is remounted.
 * Geometry, material/texture values and world transforms can change freely.
 */
export function createStationaryPixelCache({
  three: T,
  renderer,
  scene,
  camera,
  model,
  key,
  ao,
  eligible = () => true,
}: {
  three: typeof Three;
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  model: { group: Three.Group };
  key?: Three.DirectionalLight;
  ao?: any;
  eligible?: () => boolean;
}) {
  // Preserve the exact method for disposal; calls use the bound copy below.
  // eslint-disable-next-line typescript/unbound-method
  const originalRender = renderer.render;
  const render = originalRender.bind(renderer);
  const cached: any[] = [],
    live: any[] = [],
    lights: any[] = [];
  const nodes: {
    object: Three.Object3D;
    parent: Three.Object3D | null;
    children: number;
  }[] = [];
  const materials = new Set<any>();
  scene.traverse((object: any) => {
    nodes.push({
      object,
      parent: object.parent,
      children: object.children.length,
    });
    if (object.isLight) lights.push(object);
    if (!object.isMesh) return;
    const eligible = canCacheSpacecraftMesh(object);
    (eligible ? cached : live).push(object);
    if (eligible) materials.add(object.material);
  });
  const candidates = [...cached],
    alwaysLive = [...live];
  const influence =
    key && ao
      ? createDishInfluenceCache({
          three: T,
          renderer,
          scene,
          camera,
          model,
          key,
          ao,
        })
      : null;
  // Inventory membership is fixed (and guarded below), but transforms are not
  // revisioned. Compare matrices directly instead of flattening 16 values per
  // mesh into a fresh frame signature. Only changed matrices need copying.
  const transforms = candidates
    .filter((mesh) => !influence?.dynamic(mesh))
    .map((object) => ({ object, previous: new T.Matrix4() }));
  let partialAo = false;
  let aoNeedsFull = true;
  let repairShadow = false;
  let colorExclusions: { object: any; mask: number }[] = [];
  // Shadow shader compilation needs the renderer's active scene state. Run the
  // regional repair from its normal shadow callback, before masked color draws.
  // eslint-disable-next-line typescript/unbound-method
  const originalShadowRender = renderer.shadowMap.render;
  renderer.shadowMap.render = function (
    shadowLights,
    shadowScene,
    shadowCamera,
  ) {
    const full = () =>
      originalShadowRender.call(this, shadowLights, shadowScene, shadowCamera);
    if (
      shadowScene !== scene ||
      shadowCamera !== camera ||
      (!renderer.shadowMap.autoUpdate && !renderer.shadowMap.needsUpdate)
    ) {
      full();
      return;
    }
    const masks = colorExclusions.map(({ object }) => object.layers.mask);
    colorExclusions.forEach(({ object, mask }) => {
      object.layers.mask = mask;
    });
    try {
      if (!repairShadow || !influence!.shadow(full)) full();
    } finally {
      colorExclusions.forEach(({ object }, i) => {
        object.layers.mask = masks[i];
      });
      repairShadow = false;
    }
  };
  const target = new T.WebGLRenderTarget(1, 1, {
    type: T.UnsignedByteType,
    minFilter: T.NearestFilter,
    magFilter: T.NearestFilter,
    depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType),
    samples: 4,
  });
  target.texture.name = 'stationary-spacecraft-display-color';
  // Apply the existing display transform before the multisample resolve. RGBA8
  // then matches the canvas interior without the storage or averaged HDR colors
  // of a half-float target. Three's standard offscreen path otherwise skips it.
  let capturing = false;
  const hooks = [...materials].map((m) => {
    const compile = m.onBeforeCompile,
      programKey = m.customProgramCacheKey;
    m.onBeforeCompile = function (shader: any, renderer: any) {
      compile.call(this, shader, renderer);
      if (!capturing) return;
      shader.fragmentShader =
        T.ShaderChunk.tonemapping_pars_fragment +
        '\n' +
        shader.fragmentShader
          .replace(
            '#include <tonemapping_fragment>',
            'gl_FragColor.rgb=ACESFilmicToneMapping(gl_FragColor.rgb);',
          )
          .replace(
            '#include <colorspace_fragment>',
            'gl_FragColor=sRGBTransferOETF(gl_FragColor);',
          );
    };
    m.customProgramCacheKey = function () {
      return programKey.call(this) + (capturing ? ':cached-display-color' : '');
    };
    return () => {
      m.onBeforeCompile = compile;
      m.customProgramCacheKey = programKey;
      m.needsUpdate = true;
    };
  });
  const material = new T.ShaderMaterial({
    uniforms: {
      colorMap: { value: target.texture },
      depthMap: { value: target.depthTexture },
    },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D colorMap;uniform sampler2D depthMap;varying vec2 vUv;
      void main(){vec4 c=texture2D(colorMap,vUv);if(c.a==0.)discard;
      gl_FragColor=vec4(c.rgb/c.a,c.a);
      gl_FragDepth=texture2D(depthMap,vUv).r;}`,
    transparent: true,
    depthTest: true,
    depthFunc: T.AlwaysDepth,
    depthWrite: true,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(material);
  let enabled = true,
    valid = false,
    equalFrames = 0;
  let hits = 0,
    builds = 0,
    fallbacks = 0;
  const oldColor = new T.Color(),
    size = new T.Vector2();
  const cameraMatrix = new T.Matrix4(),
    projection = new T.Matrix4();
  let previous: unknown[] = [];
  const values: unknown[] = [];
  let previousColors: unknown[] = [];
  const colors: unknown[] = [];
  const textureSlots = [
    'map',
    'alphaMap',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'lightMap',
    'bumpMap',
    'emissiveMap',
    'envMap',
  ];
  function invalidate() {
    valid = false;
    equalFrames = 0;
    previous = [];
    previousColors = [];
    partialAo = false;
    aoNeedsFull = true;
    repairShadow = false;
    influence?.invalidate();
  }
  function release() {
    invalidate();
    target.setSize(1, 1);
  }
  function changed() {
    values.length = 0;
    colors.length = 0;
    colors.push(model.group.userData.lightingColorSignature ?? '');
    values.push(
      model.group.userData.geometryRevision -
        (model.group.userData.dishGeometryRevision || 0),
      camera.layers.mask,
      renderer.toneMappingExposure,
      renderer.shadowMap.enabled,
      renderer.shadowMap.type,
      scene.environment?.id,
      scene.environment?.version,
      scene.environmentIntensity,
      scene.environmentRotation.x,
      scene.environmentRotation.y,
      scene.environmentRotation.z,
    );
    influence?.signature(values);
    for (const node of nodes) {
      if (
        node.object.parent !== node.parent ||
        node.object.children.length !== node.children
      )
        return null;
      values.push(node.object.visible, node.object.layers.mask);
    }
    for (const light of lights) {
      colors.push(light.intensity, light.color.r, light.color.g, light.color.b);
      // Interior beam/shadow edits change illumination, not depth or contact AO.
      // Sun inputs still rebuild its dish influence bounds and receiver split.
      const appearance = light.isSpotLight ? colors : values;
      appearance.push(
        light.groundColor?.r,
        light.groundColor?.g,
        light.groundColor?.b,
        light.distance,
        light.decay,
        light.angle,
        light.penumbra,
        light.width,
        light.height,
        light.castShadow,
        light.shadow?.intensity,
        light.shadow?.bias,
        light.shadow?.normalBias,
        light.shadow?.radius,
        light.shadow?.mapSize.x,
        light.shadow?.mapSize.y,
        ...(light.shadow?.camera.projectionMatrix.elements || []),
        ...light.matrixWorld.elements,
        ...(light.target?.matrixWorld.elements || []),
      );
    }
    for (const m of materials) {
      colors.push(
        m.color?.r,
        m.color?.g,
        m.color?.b,
        m.emissive?.r,
        m.emissive?.g,
        m.emissive?.b,
        m.emissiveIntensity,
      );
      values.push(
        m.version,
        m.visible,
        m.roughness,
        m.metalness,
        m.opacity,
        m.side,
        m.bumpScale,
        m.envMapIntensity,
        m.aoMapIntensity,
        m.lightMapIntensity,
        m.depthFunc,
        m.wireframe,
        m.polygonOffset,
        m.polygonOffsetFactor,
        m.polygonOffsetUnits,
        m.normalScale?.x,
        m.normalScale?.y,
      );
      for (const slot of textureSlots) {
        const t = m[slot];
        if (!t) {
          values.push(null);
          continue;
        }
        values.push(
          t.id,
          t.version,
          t.offset.x,
          t.offset.y,
          t.repeat.x,
          t.repeat.y,
          t.rotation,
          t.center.x,
          t.center.y,
          t.channel,
        );
      }
    }
    for (const mesh of candidates) {
      if (!materials.has(mesh.material) || !canCacheSpacecraftMesh(mesh))
        return null;
      values.push(
        mesh.material.id,
        mesh.castShadow,
        mesh.receiveShadow,
        mesh.geometry.id,
        mesh.geometry.index,
        mesh.geometry.index?.version,
        mesh.geometry.index?.count,
        mesh.geometry.drawRange.start,
        mesh.geometry.drawRange.count,
        mesh.instanceMatrix?.version,
        mesh.instanceColor?.version,
        mesh.count,
      );
      // Attribute membership can change without a geometry revision. Enumerate
      // it live, without allocating an Object.values array for every mesh.
      const attributes = mesh.geometry.attributes;
      for (const name in attributes) {
        if (!Object.hasOwn(attributes, name)) continue;
        const attribute = attributes[name];
        values.push(attribute, attribute.version, attribute.count);
      }
    }
    let geometryChanged =
      values.length !== previous.length ||
      values.some((v, i) => v !== previous[i]);
    for (const entry of transforms) {
      if (entry.previous.equals(entry.object.matrixWorld)) continue;
      entry.previous.copy(entry.object.matrixWorld);
      geometryChanged = true;
    }
    const colorChanged =
      colors.length !== previousColors.length ||
      colors.some((v, i) => v !== previousColors[i]);
    if (!geometryChanged && !colorChanged) return false;
    previous = values.slice();
    previousColors = colors.slice();
    return geometryChanged ? 'geometry' : 'color';
  }
  function exclude(objects: any[], fn: () => void) {
    // Layers exclude only the mesh; hiding a parent mesh also hides live children.
    const masks = objects.map((o) => o.layers.mask);
    const previousExclusions = colorExclusions;
    colorExclusions = objects.map((object, i) => ({ object, mask: masks[i] }));
    objects.forEach((o) => (o.layers.mask = 0));
    try {
      fn();
    } finally {
      objects.forEach((o, i) => (o.layers.mask = masks[i]));
      colorExclusions = previousExclusions;
    }
  }
  renderer.render = (renderScene, renderCamera) => {
    if (
      !enabled ||
      renderScene !== scene ||
      renderCamera !== camera ||
      renderer.getRenderTarget()
    ) {
      render(renderScene, renderCamera);
      return;
    }
    // Unsupported lighting or an explicit opt-out releases the extra storage.
    if (!eligible()) {
      if (valid || target.width !== 1 || target.height !== 1) release();
      fallbacks++;
      render(scene, camera);
      return;
    }
    const cameraChanged =
      !cameraMatrix.equals(camera.matrixWorld) ||
      !projection.equals(camera.projectionMatrix);
    partialAo = false;
    const interiorShadowDirty = lights.some(
      (light) => light !== key && light.castShadow && light.shadow?.needsUpdate,
    );
    // A full view/scene change reconstructs all targets. Dish-only shadow repairs
    // happen separately, before any color-pass mesh masking.
    if (
      cameraChanged ||
      (renderer.shadowMap.needsUpdate &&
        !interiorShadowDirty &&
        (!influence || !model.group.userData.shadowCasterChanged)) ||
      renderer.shadowMap.autoUpdate ||
      renderer.toneMapping !== T.ACESFilmicToneMapping ||
      renderer.outputColorSpace !== T.SRGBColorSpace ||
      scene.fog ||
      scene.background ||
      scene.overrideMaterial ||
      (influence &&
        (!influence.supported() ||
          // Only the sun has a regional receiver/caster bound. Other lights can
          // coexist while their maps are reused by the per-light controller.
          // Missing or automatically updating maps cannot be reused safely.
          lights.some(
            (l) =>
              l !== key &&
              l.castShadow &&
              (!l.shadow || l.shadow.autoUpdate !== false || !l.shadow.map),
          )))
    ) {
      cameraMatrix.copy(camera.matrixWorld);
      projection.copy(camera.projectionMatrix);
      invalidate();
      fallbacks++;
      render(scene, camera);
      return;
    }
    renderer.getDrawingBufferSize(size);
    if (target.width !== size.x || target.height !== size.y) {
      target.setSize(size.x, size.y);
      invalidate();
    }
    const change = changed();
    if (change === null) {
      invalidate();
      fallbacks++;
      render(scene, camera);
      return;
    }
    if (change) {
      valid = false;
      equalFrames = 0;
      // Lighting and hover colors change the captured pixels, not depth/AO
      // or the dish influence bounds. Simultaneous geometry changes still take
      // the full reconstruction path.
      if (change === 'geometry') {
        aoNeedsFull = true;
        influence?.prepare();
        cached.length = 0;
        live.length = 0;
        live.push(...alwaysLive);
        for (const mesh of candidates)
          (influence?.contains(mesh) ? live : cached).push(mesh);
      }
    } else equalFrames++;
    // AO reuse depends on geometry, independently of color capture readiness.
    // This also retains regional dish repairs during live lighting adjustments.
    partialAo = !!influence;
    if (interiorShadowDirty || model.group.userData.transitionActive) {
      valid = false;
      equalFrames = 0;
      fallbacks++;
      // A dirty interior map needs every caster. Never apply the sun's regional
      // mask or a color-cache exclusion to this complete scene draw.
      render(scene, camera);
      return;
    }
    // Avoid paying for a capture when the next frame cannot reuse it.
    if (equalFrames < 2) {
      fallbacks++;
      render(scene, camera);
      return;
    }
    if (renderer.shadowMap.needsUpdate && !influence?.canRepairShadow()) {
      fallbacks++;
      render(scene, camera);
      return;
    }
    repairShadow = !!renderer.shadowMap.needsUpdate;
    if (!valid) {
      const alpha = renderer.getClearAlpha();
      renderer.getClearColor(oldColor);
      try {
        capturing = true;
        renderer.setRenderTarget(target);
        renderer.setClearColor(0, 0);
        renderer.clear();
        exclude(live, () => render(scene, camera));
      } finally {
        capturing = false;
        renderer.setClearColor(oldColor, alpha);
        renderer.setRenderTarget(null);
      }
      valid = true;
      builds++;
    } else hits++;
    quad.render(renderer);
    exclude(cached, () => render(scene, camera));
  };
  return {
    /** Used only by the explicit local comparison fixture. */
    select(value: boolean) {
      enabled = value;
      invalidate();
    },
    invalidate,
    requiresOcclusion: () => enabled && eligible() && aoNeedsFull,
    occlusion(render: () => void, allowPartial: boolean) {
      if (partialAo && allowPartial && !aoNeedsFull)
        influence!.occlusion(render);
      else render();
      aoNeedsFull = false;
    },
    release,
    stats() {
      return {
        enabled,
        eligible: eligible(),
        valid,
        equalFrames,
        hits,
        builds,
        fallbacks,
        cached: cached.length,
        live: live.length,
        width: target.width,
        height: target.height,
        samples: target.samples,
        nominalAttachmentBytes:
          target.width * target.height * 8 * (target.samples + 1),
        influence: influence?.stats(),
      };
    },
    dispose() {
      renderer.render = originalRender;
      renderer.shadowMap.render = originalShadowRender;
      for (const restore of hooks) restore();
      target.dispose();
      quad.dispose();
      material.dispose();
    },
  };
}
