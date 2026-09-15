/** Comparison-only second geometry set; no additional model in normal visits. */
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  assertGeometryEquivalent,
  meshes,
  inventory,
} from './geometry-compaction-utils.mjs';

export function createGeometryCompactionSession() {
  let model: any, options: any, three: any;
  let baselineMeshes: any[];
  const pairs: { object: any; baseline: any; indexed: any }[] = [];
  let active = false,
    initialized = false;
  let constructionMs = 0;
  let baselineAccounting: any;
  let accounting: any;
  return {
    modelReady(
      value: any,
      settings: any,
      namespace: any,
      milliseconds: number,
    ) {
      model = value;
      options = settings;
      three = namespace;
      constructionMs = milliseconds;
      baselineMeshes = meshes(model.group);
      baselineAccounting = inventory(model.group);
    },
    initialize() {
      if (initialized) return;
      const reference = createSpacecraft(three, {
        ...options,
        geometryCompaction: true,
      });
      const baseline = baselineMeshes,
        candidate = meshes(reference.group);
      if (baseline.length !== candidate.length)
        throw new Error('Geometry comparison object count changed.');
      for (let i = 0; i < baseline.length; i++) {
        if (baseline[i].name !== candidate[i].name)
          throw new Error('Geometry comparison ownership changed.');
        assertGeometryEquivalent(
          baseline[i].geometry,
          candidate[i].geometry,
          baseline[i].name,
        );
        if (
          baseline[i].geometry.attributes.position.count !==
          candidate[i].geometry.attributes.position.count
        )
          pairs.push({
            object: baseline[i],
            baseline: baseline[i].geometry,
            indexed: candidate[i].geometry,
          });
      }
      accounting = {
        baseline: baselineAccounting,
        indexed: inventory(reference.group),
        changedMeshes: pairs.length,
        addedCpuBytesOverBaseline: [
          ...new Set(pairs.map((p) => p.indexed)),
        ].reduce(
          (sum, g) =>
            sum +
            Object.values(g.attributes).reduce(
              (n: number, a: any) => n + a.array.byteLength,
              0,
            ) +
            (g.index?.array.byteLength ?? 0),
          0,
        ),
        note: 'Only active geometry is uploaded. Inactive CPU arrays are retained for switching; startup runs use a separate fresh single-model mount.',
      };
      const keep = new Set(pairs.map((p) => p.indexed)),
        geometries = new Set<any>(),
        materials = new Set<any>(),
        textures = new Set<any>();
      reference.group.traverse((object: any) => {
        if (object.geometry && !keep.has(object.geometry))
          geometries.add(object.geometry);
        for (const m of [object.material].flat().filter(Boolean))
          materials.add(m);
      });
      for (const m of materials)
        for (const value of Object.values(m) as any[])
          if (value?.isTexture) textures.add(value);
      for (const resource of [...geometries, ...materials, ...textures])
        resource.dispose();
      reference.group.clear();
      initialized = true;
    },
    set(indexed: boolean) {
      if (!initialized)
        throw new Error('Initialize comparison before switching geometry.');
      if (active === indexed) return;
      // Release inactive GPU buffers; array retention is explicitly reported.
      const release = new Set(pairs.map((p) => p.object.geometry));
      for (const pair of pairs)
        pair.object.geometry = indexed ? pair.indexed : pair.baseline;
      for (const geometry of release) geometry.dispose();
      active = indexed;
    },
    swap() {
      const previous = active;
      this.set(!previous);
      return () => this.set(previous);
    },
    snapshot: () => ({
      active: active ? 'indexed' : 'baseline',
      constructionMs,
      ...accounting,
    }),
  };
}
