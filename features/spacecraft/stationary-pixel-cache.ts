import type * as Three from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

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
}: {
  three: typeof Three;
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  model: { group: Three.Group };
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
  }
  function changed() {
    values.length = 0;
    values.push(
      model.group.userData.geometryRevision,
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
    for (const node of nodes) {
      if (
        node.object.parent !== node.parent ||
        node.object.children.length !== node.children
      )
        return null;
      values.push(node.object.visible, node.object.layers.mask);
    }
    for (const light of lights)
      values.push(
        light.intensity,
        light.color.r,
        light.color.g,
        light.color.b,
        light.groundColor?.r,
        light.groundColor?.g,
        light.groundColor?.b,
        light.distance,
        light.decay,
        light.angle,
        light.penumbra,
        light.castShadow,
        light.shadow?.bias,
        light.shadow?.normalBias,
        ...light.matrixWorld.elements,
        ...(light.target?.matrixWorld.elements || []),
      );
    for (const m of materials) {
      values.push(
        m.version,
        m.visible,
        m.color?.r,
        m.color?.g,
        m.color?.b,
        m.emissive?.r,
        m.emissive?.g,
        m.emissive?.b,
        m.emissiveIntensity,
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
    for (const mesh of cached) {
      if (!materials.has(mesh.material) || !canCacheSpacecraftMesh(mesh))
        return null;
      values.push(
        mesh.material.id,
        mesh.geometry.id,
        mesh.geometry.index,
        mesh.geometry.index?.version,
        mesh.geometry.index?.count,
        mesh.geometry.drawRange.start,
        mesh.geometry.drawRange.count,
        mesh.instanceMatrix?.version,
        mesh.instanceColor?.version,
        mesh.count,
        ...mesh.matrixWorld.elements,
      );
      for (const attribute of Object.values(mesh.geometry.attributes) as any[])
        values.push(attribute, attribute.version, attribute.count);
    }
    if (
      values.length === previous.length &&
      values.every((v, i) => v === previous[i])
    )
      return false;
    previous = values.slice();
    return true;
  }
  function exclude(objects: any[], fn: () => void) {
    // Layers exclude only the mesh; hiding a parent mesh also hides live children.
    const masks = objects.map((o) => o.layers.mask);
    objects.forEach((o) => (o.layers.mask = 0));
    try {
      fn();
    } finally {
      objects.forEach((o, i) => (o.layers.mask = masks[i]));
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
    const cameraChanged =
      !cameraMatrix.equals(camera.matrixWorld) ||
      !projection.equals(camera.projectionMatrix);
    // Keep complete caster submission while a shadow map is dirty. Rendering any
    // masked subset first would poison the shared map for live meshes and GTAO.
    if (
      cameraChanged ||
      renderer.shadowMap.needsUpdate ||
      renderer.shadowMap.autoUpdate ||
      model.group.userData.transitionActive ||
      renderer.toneMapping !== T.ACESFilmicToneMapping ||
      renderer.outputColorSpace !== T.SRGBColorSpace ||
      scene.fog
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
    } else equalFrames++;
    // Avoid paying for a capture when the next frame cannot reuse it.
    if (equalFrames < 2) {
      fallbacks++;
      render(scene, camera);
      return;
    }
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
    release() {
      invalidate();
      target.setSize(1, 1);
    },
    stats() {
      return {
        enabled,
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
      };
    },
    dispose() {
      renderer.render = originalRender;
      for (const restore of hooks) restore();
      target.dispose();
      quad.dispose();
      material.dispose();
    },
  };
}
