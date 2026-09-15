/** Developer-only surface bake and receiver-selective GTAO experiment. */
import type { SceneAudit } from '../../features/diagnostics/scene-audit';
type Context = Parameters<NonNullable<SceneAudit['contactReady']>>[0];
type Variant = 'A' | 'B' | 'C';

export function createContactBakeSession(context: Context) {
  const { three: T, model, scene, camera, ao, invalidate } = context;
  const region = model.group.userData.roomBounds.projects;
  const bounds = new T.Box3().setFromCenterAndSize(
    new T.Vector3().fromArray(region.center), new T.Vector3().fromArray(region.size),
  ).applyMatrix4(model.group.matrixWorld);
  const occlusionBounds = bounds.clone().expandByScalar(.32);
  const originals = { normal: ao.normalMaterial, gtao: ao.gtaoMaterial, pd: ao.pdMaterial };
  let requested: Variant = 'A', effective: Variant = 'A';
  let installed = false, payloadStats: any;
  const receivers = new Map<string, any>();
  const replacements: { mesh: any; geometry: any; material: any; bakedGeometry: any; bakedMaterial: any }[] = [];
  const dynamicRoots: any[] = [];
  const uniforms: any = {
    contactMin: { value: bounds.min.clone() }, contactMax: { value: bounds.max.clone() },
    contactHybrid: { value: 0 }, contactZoneCount: { value: 0 },
    contactZoneMin: { value: Array.from({ length: 8 }, () => new T.Vector3()) },
    contactZoneMax: { value: Array.from({ length: 8 }, () => new T.Vector3()) },
  };
  const pars = `varying vec3 vContactWorld;
    uniform vec3 contactMin, contactMax;
    uniform int contactZoneCount;
    uniform float contactHybrid;
    uniform vec3 contactZoneMin[8], contactZoneMax[8];
    bool contactInside(vec3 p,vec3 a,vec3 b){return all(greaterThanEqual(p,a))&&all(lessThanEqual(p,b));}
    bool contactBaked(){
      if(!contactInside(vContactWorld,contactMin,contactMax))return false;
      if(contactHybrid>0.5)for(int i=0;i<8;i++){
        if(i>=contactZoneCount)break;
        if(contactInside(vContactWorld,contactZoneMin[i],contactZoneMax[i]))return false;
      }
      return true;
    }`;
  const vertex = (shader: any, attribute: string) => {
    shader.vertexShader = `attribute float ${attribute}; varying float vContactValue; varying vec3 vContactWorld;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vContactValue=${attribute}; vContactWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader = `varying float vContactValue;\n${pars}\n` + shader.fragmentShader;
    Object.assign(shader.uniforms, uniforms);
  };
  const normal = originals.normal.clone();
  // Three's generic vertex bindings support defaults on override materials too.
  // All unmodified geometries explicitly default to live AO, including instances.
  normal.defaultAttributeValues = { contactBakeMask: [0] };
  normal.onBeforeCompile = (shader: any) => {
    vertex(shader, 'contactBakeMask');
    shader.fragmentShader = shader.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a=(vContactValue>0.5&&contactBaked())?0.0:1.0;\n}');
  };
  normal.customProgramCacheKey = () => 'contact-normal-mask-v1';
  const maskedPass = (original: any) => {
    const material = original.clone();
    // Preserve references to the actual pass render targets/noise textures.
    for (const [key, uniform] of Object.entries(original.uniforms) as [string, any][]) {
      if (uniform.value?.isTexture) material.uniforms[key].value = uniform.value;
    }
    material.fragmentShader = material.fragmentShader.replace('void main() {', `void main() {
      if(texture2D(tNormal,vUv).a<0.5){gl_FragColor=vec4(1.0);return;}`);
    return material;
  };
  const gtao = maskedPass(originals.gtao), pd = maskedPass(originals.pd);
  function chain(object: any, predicate: (o: any) => boolean) {
    for (let p = object; p; p = p.parent) if (predicate(p)) return true;
    return false;
  }
  const visible = (o: any) => !chain(o, (p) => !p.visible);
  const moving = (o: any) => chain(o, (p) => p.userData.animated || p.userData.irisHatch || p.userData.openReader);
  const box = new T.Box3();
  const array = (attribute: any) => {
    const result: number[] = [];
    for (let i = 0; i < attribute.count; i++)
      for (let j = 0; j < attribute.itemSize; j++) result.push(attribute.getComponent(i, j));
    return result;
  };
  function exportInput() {
    select('A'); scene.updateMatrixWorld(true); receivers.clear(); dynamicRoots.length = 0;
    const meshes: any[] = [];
    const excluded: Record<string, number> = {};
    const skip = (reason: string) => { excluded[reason] = (excluded[reason] || 0) + 1; };
    scene.traverse((o: any) => {
      // Retracted readers are hidden at export but must rejoin live contacts later.
      if (o.userData.irisHatch || /projects-deployable-reader/.test(o.name)) dynamicRoots.push(o);
      if (!o.isMesh || !visible(o) || !o.geometry.attributes.position) return;
      if (moving(o) || chain(o, (p) => p.userData.isInteractionProxy)) { skip('moving-or-proxy'); return; }
      box.setFromObject(o);
      if (!box.intersectsBox(occlusionBounds)) return;
      const geometry = o.geometry, material = o.material;
      if (Array.isArray(material) || material.transparent || material.opacity < 1) { skip('transparent-or-multimaterial'); return; }
      if (material.alphaTest || material.displacementMap || o.isSkinnedMesh || Object.keys(geometry.morphAttributes).length ||
        geometry.drawRange.start !== 0 || geometry.drawRange.count < (geometry.index?.count ?? geometry.attributes.position.count)) {
        skip('unsupported-alpha-displacement-morph-draw-range'); return;
      }
      const printed = material.userData.displaySize || material.userData.archiveInk || material.userData.studyInk || material.userData.cabinHeaderInk;
      const supported = Object.keys(geometry.attributes).every((key) => ['position','normal','uv'].includes(key));
      const roomSurface = chain(o, (p) => p.userData.roomSurface) || material.userData.surfaceOnly;
      const inProjects = chain(o, (p) => p.userData.section === 'projects');
      const normals = geometry.attributes.normal;
      let validNormals = !!normals;
      for (let i = 0; validNormals && i < normals.count; i++) {
        const length = normals.getX(i) ** 2 + normals.getY(i) ** 2 + normals.getZ(i) ** 2;
        validNormals = Number.isFinite(length) && length >= 1e-20;
      }
      const belongsElsewhere = /^(about|contact|experience|walkway)-/.test(o.name);
      const receiver = validNormals && !belongsElsewhere && (inProjects || roomSurface) && !material.userData.exterior && !o.isInstancedMesh && !printed && !material.map && !material.emissiveMap && !material.userData.luminous &&
        !(material.userData.baseIntensity > 0 && material.userData.baseEmissive?.getHex() > 0) &&
        !/diffuser|light|glow|signal|screen|display|painted-navigation-symbol/.test(material.name) && supported && material.isMeshStandardMaterial;
      const matrices = [];
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          const m = new T.Matrix4(); o.getMatrixAt(i, m); matrices.push(o.matrixWorld.clone().multiply(m));
        }
      } else matrices.push(o.matrixWorld);
      for (const [i, matrix] of matrices.entries()) {
        const id = `${o.id}:${i}`;
        meshes.push({ id, name: o.name, position: array(geometry.attributes.position),
          normal: geometry.attributes.normal ? array(geometry.attributes.normal) : [],
          uv: geometry.attributes.uv ? array(geometry.attributes.uv) : undefined,
          index: geometry.index ? array(geometry.index) : undefined, matrix: matrix.toArray(), receiver });
        if (receiver) receivers.set(id, o);
      }
      if (!receiver) skip('live-only-receiver');
    });
    return { version: 1, room: 'projects', threeRevision: T.REVISION,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      settings: { radius: .32, samples: 32, maxEdge: .16 }, excluded, meshes };
  }
  function install(payload: any) {
    if (installed) throw new Error('Reload the lab to replace its bake.');
    if (payload.stats?.preparationOnly) throw new Error('Sizing placeholders are not a shaded bake.');
    if (!Array.isArray(payload.meshes) || payload.meshes.length !== receivers.size ||
      new Set(payload.meshes.map((m: any) => m.id)).size !== receivers.size)
      throw new Error('Bake must contain exactly the exported receiver set.');
    for (const item of payload.meshes) {
      const count = item.position?.length / 3;
      if (!receivers.has(item.id) || !Number.isInteger(count) || item.normal?.length !== count * 3 ||
        (item.uv && item.uv.length !== count * 2) || item.ao?.length !== count || !Array.isArray(item.index) ||
        item.index.length % 3 || item.index.some((i: number) => !Number.isInteger(i) || i < 0 || i >= count) ||
        [item.position,item.normal,item.uv ?? []].some((a: number[]) => !a.every(Number.isFinite)) ||
        item.ao.some((n: number) => !Number.isInteger(n) || n < 0 || n > 255))
        throw new Error(`Malformed receiver: ${item.id}`);
    }
    const start = performance.now();
    for (const item of payload.meshes) {
      const mesh = receivers.get(item.id);
      if (!mesh) throw new Error(`Bake receiver missing: ${item.id}`);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(item.position, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(item.normal, 3));
      if (item.uv) geometry.setAttribute('uv', new T.Float32BufferAttribute(item.uv, 2));
      geometry.setIndex(item.index);
      geometry.setAttribute('contactAO', new T.Uint8BufferAttribute(item.ao, 1, true));
      geometry.setAttribute('contactBakeMask', new T.Uint8BufferAttribute(new Uint8Array(item.ao.length).fill(1), 1));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const original = mesh.material, material = original.clone();
      // Room feedback updates originals in the model's private registry.
      // Share mutable colors, and synchronize scalar feedback before each frame.
      material.color = original.color; material.emissive = original.emissive;
      material.onBeforeCompile = (shader: any, renderer: any) => {
        original.onBeforeCompile.call(original, shader, renderer);
        vertex(shader, 'contactAO');
        shader.fragmentShader = shader.fragmentShader.replace('#include <colorspace_fragment>',
          '#include <colorspace_fragment>\nif(contactBaked())gl_FragColor.rgb*=mix(1.0,vContactValue,0.40);');
      };
      material.customProgramCacheKey = () => original.customProgramCacheKey() + '|contact-surface-v1';
      replacements.push({ mesh, geometry: mesh.geometry, material: original, bakedGeometry: geometry, bakedMaterial: material });
    }
    payloadStats = { ...payload.stats, installCpuMs: performance.now() - start,
      receiverMeshes: replacements.length, addedGeometryArrayBytes: replacements.reduce((sum, r) => sum +
        Object.values(r.bakedGeometry.attributes).reduce((n: number, a: any) => n + a.array.byteLength, 0) + r.bakedGeometry.index.array.byteLength, 0),
      baselineReceiverArrayBytes: replacements.reduce((sum, r) => sum + Object.values(r.geometry.attributes).reduce((n: number, a: any) => n + a.array.byteLength, 0) + (r.geometry.index?.array.byteLength || 0), 0) };
    installed = true;
  }
  function apply(variant: Variant) {
    if (variant === effective) return;
    effective = variant;
    for (const r of replacements) {
      r.mesh.geometry = variant === 'A' ? r.geometry : r.bakedGeometry;
      r.mesh.material = variant === 'A' ? r.material : r.bakedMaterial;
    }
    ao.normalMaterial = variant === 'A' ? originals.normal : normal;
    ao.gtaoMaterial = variant === 'A' ? originals.gtao : gtao;
    ao.pdMaterial = variant === 'A' ? originals.pd : pd;
    for (const pass of [ao.gtaoMaterial, ao.pdMaterial]) pass.uniforms.resolution.value.set(ao.width, ao.height);
    uniforms.contactHybrid.value = variant === 'C' ? 1 : 0;
    invalidate();
  }
  function update() {
    apply(!context.enabled() || !installed ? 'A' : requested);
    if (effective === 'A') return;
    for (const r of replacements) {
      for (const key of ['emissiveIntensity','roughness','metalness','opacity']) r.bakedMaterial[key] = r.material[key];
    }
    if (effective === 'B') { uniforms.contactZoneCount.value = 0; return; }
    let count = 0;
    for (const root of dynamicRoots) {
      if (!visible(root)) continue;
      box.setFromObject(root).expandByScalar(.42);
      if (!box.intersectsBox(bounds)) continue;
      if (count === 8) throw new Error('Dynamic contact zone capacity exceeded; use the baseline.');
      uniforms.contactZoneMin.value[count].copy(box.min);
      uniforms.contactZoneMax.value[count].copy(box.max); count++;
    }
    uniforms.contactZoneCount.value = count;
  }
  function select(variant: Variant) { requested = variant; update(); }
  function dispose() {
    select('A');
    for (const r of replacements) { r.bakedGeometry.dispose(); r.bakedMaterial.dispose(); }
    normal.dispose(); gtao.dispose(); pd.dispose();
  }
  function subdivisionOnly() {
    select('A');
    for (const r of replacements) r.mesh.geometry = r.bakedGeometry;
    return () => { for (const r of replacements) r.mesh.geometry = r.geometry; invalidate(); };
  }
  return { exportInput, install, select, update, dispose, subdivisionOnly,
    stats: () => ({ ...payloadStats, requested, effective, dynamicZones: uniforms.contactZoneCount.value,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, camera: camera.position.toArray() }) };
}
