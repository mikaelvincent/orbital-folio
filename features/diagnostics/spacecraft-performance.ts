import type { Mesh, Object3D } from 'three';
import type { SceneRenderCounts } from './scene-performance.ts';

export type SpacecraftPerformanceFilter = {
  mode: 'all' | 'hide' | 'only';
  id: string;
};

export type SpacecraftPerformanceGroup = {
  id: string;
  label: string;
  kind: 'room' | 'part';
  meshes: number;
};

type Counts = { draws: number; triangles: number };
type MeanCounts = { drawsPerPass: number; trianglesPerPass: number };
export type SpacecraftPerformanceRow = MeanCounts & {
  id: string;
  label: string;
  totalDraws: number;
  totalTriangles: number;
};

type Sample = {
  total: Counts;
  attributed: Counts;
  reconciled: boolean;
  parts: Map<string, Counts>;
  rooms: Map<string, Counts>;
};

export type SpacecraftPerformanceReport = {
  groups: SpacecraftPerformanceGroup[];
  filter: SpacecraftPerformanceFilter;
  passes: Record<
    string,
    {
      samples: number;
      total: MeanCounts;
      attributed: MeanCounts;
      unattributed: MeanCounts | null;
      parts: SpacecraftPerformanceRow[];
      rooms: SpacecraftPerformanceRow[];
    }
  >;
  batches: {
    name: string;
    partId: string;
    roomId: string;
    sourceParts: string[];
    sourcePartsCount: number;
    geometryTriangles: number;
    instances: number;
  }[];
  limitations: string[];
};

const roomLabels: Record<string, string> = {
  projects: 'Projects',
  experience: 'Case studies',
  about: 'About',
  contact: 'Contact',
  walkway: 'Ladder bay',
  shared: 'Shared assemblies',
  unknown: 'Unclassified room',
};

function classify(mesh: Mesh, root: Object3D) {
  const ancestors: Object3D[] = [];
  for (
    let owner: Object3D | null = mesh;
    owner && owner !== root;
    owner = owner.parent
  ) {
    ancestors.push(owner);
  }
  const has = (name: string) =>
    ancestors.some((owner) => owner.name.includes(name));
  const data = (key: string) =>
    ancestors.find((owner) => owner.userData[key])?.userData[key];
  const sources: string[] = Array.isArray(mesh.userData.parts)
    ? mesh.userData.parts.filter(
        (part: unknown): part is string => typeof part === 'string' && !!part,
      )
    : mesh.name
      ? [mesh.name]
      : [];
  let room = String(data('section') || 'unknown');
  if (!Object.hasOwn(roomLabels, room)) room = 'unknown';
  let category = 'other';
  let label = 'other or mixed batches';

  if (has('continuous-spacecraft-chassis')) {
    if (!data('roomSurface')) room = 'shared';
    category = 'chassis';
    label = room === 'shared' ? 'outer chassis' : 'chassis interior wall';
  } else if (has('central-docking-assembly') || has('docking-hatch')) {
    room = 'shared';
    category = 'docking';
    label = 'docking sleeve and hatch';
  } else if (has('aft-service-assembly')) {
    room = 'shared';
    // Existing material batches can contain several appendages. A whole draw
    // belongs to one group; do not pretend its source triangles are separate draws.
    if (
      sources.length &&
      sources.every((name) => /solar|photovoltaic/i.test(name))
    ) {
      category = 'solar';
      label = 'solar array batches';
    } else if (
      sources.length &&
      sources.every((name) => /dish|communications/i.test(name))
    ) {
      category = 'communications';
      label = 'communications batches';
    } else {
      category = 'service';
      label = 'mixed service bus and appendages';
    }
  } else if (
    data('irisHatch') ||
    data('portal') ||
    data('passageLiner') ||
    has('iris-passage') ||
    has('continuous-passage')
  ) {
    category = 'doors';
    label = 'doors and passage assemblies';
  } else if (
    has('cabin-utilities') ||
    has('engineering-service-spine') ||
    has('ladder-wall-isolation-cassette')
  ) {
    category = 'utilities';
    label = 'utility fittings';
  } else if (has('outboard-equipment')) {
    category = 'outboard-equipment';
    label = 'outboard wall equipment';
  } else if (has('projects-workshop')) {
    category = 'furniture';
    label = 'workshop furniture';
  } else if (has('case-study-flight-recorder-archive')) {
    category = 'furniture';
    label = 'archive furniture';
  } else if (has('about-personal-study')) {
    category = 'furniture';
    label = 'personal-study furniture';
  } else if (has('contact-flight-console')) {
    category = 'furniture';
    label = 'flight-console furniture';
  } else if (has('deployable-reader') || data('openReader')) {
    category = 'reader';
    label = 'deployable reader';
  } else if (has('pressure-structure') || data('structureRoot')) {
    category = 'structure';
    label = 'cabin pressure structure';
  } else if (
    data('physicalLabel') ||
    has('nameplate') ||
    has('label-mount') ||
    (sources.length > 0 &&
      sources.every((name) =>
        /nameplate|identification|label-plaque/.test(name),
      ))
  ) {
    category = 'labels';
    label = 'signage and label batches';
  } else if (has('left-vertical-walkway')) {
    room = 'walkway';
    category = data('roomSurface') ? 'fittings' : 'structure';
    label = data('roomSurface') ? 'interior fittings' : 'pressure structure';
  } else if (has('cabin-contents')) {
    category = 'contents';
    label = 'mixed cabin fixtures';
  }
  return {
    part: {
      id: `part:${room}:${category}`,
      label: `${roomLabels[room]} · ${label}`,
      kind: 'part' as const,
    },
    room: {
      id: `room:${room}`,
      label: roomLabels[room],
      kind: 'room' as const,
    },
    sources,
  };
}

const zero = (): Counts => ({ draws: 0, triangles: 0 });
const copy = (info: SceneRenderCounts): Counts => ({
  draws: info.calls,
  triangles: info.triangles,
});
const plus = (target: Counts, counts: Counts) => {
  target.draws += counts.draws;
  target.triangles += counts.triangles;
};
const delta = (after: Counts, before: Counts): Counts => ({
  draws: Math.max(0, after.draws - before.draws),
  triangles: Math.max(0, after.triangles - before.triangles),
});
const mean = (counts: Counts, samples: number): MeanCounts => ({
  drawsPerPass: counts.draws / samples,
  trianglesPerPass: counts.triangles / samples,
});

/** Actual renderer counter deltas, not estimated object timings. Instantiate
 * only for diagnostics. Existing material batches and render behavior stay intact. */
export function createSpacecraftPerformance(
  root: Object3D,
  options: { maxSamplesPerPass?: number } = {},
) {
  let maxSamples = Number.isFinite(options.maxSamplesPerPass)
    ? Math.max(1, Math.min(1800, Math.floor(options.maxSamplesPerPass!)))
    : 1800;
  const groups = new Map<string, SpacecraftPerformanceGroup>();
  const windows = new Map<string, Sample[]>();
  let filter: SpacecraftPerformanceFilter = { mode: 'all', id: '' };
  let disposed = false;
  let current: { name: string; sample: Sample; start: Counts | null } | null =
    null;
  const restorers = new Set<() => void>();
  const records: {
    mesh: Mesh;
    partId: string;
    roomId: string;
    before: Mesh['onBeforeRender'];
    after: Mesh['onAfterRender'];
    wrappedBefore: Mesh['onBeforeRender'];
    wrappedAfter: Mesh['onAfterRender'];
    clear: () => void;
  }[] = [];
  const batches: SpacecraftPerformanceReport['batches'] = [];

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const classification = classify(mesh, root);
    for (const group of [classification.part, classification.room]) {
      if (!groups.has(group.id)) groups.set(group.id, { ...group, meshes: 0 });
      groups.get(group.id)!.meshes += 1;
    }
    // Preserve exact callback identities for disposal; wrappers supply the
    // renderer's original receiver explicitly through .apply(this, args).
    // oxlint-disable-next-line typescript/unbound-method
    const before = mesh.onBeforeRender;
    // oxlint-disable-next-line typescript/unbound-method
    const after = mesh.onAfterRender;
    // A stack preserves grouped and recursive render callback semantics.
    const stack: { owner: NonNullable<typeof current>; start: Counts }[] = [];
    const wrappedBefore: Mesh['onBeforeRender'] = function (
      this: Mesh,
      ...args
    ) {
      before.apply(this, args);
      if (current) {
        if (stack[0]?.owner !== current) stack.length = 0;
        stack.push({ owner: current, start: copy(args[0].info.render) });
      }
    };
    const wrappedAfter: Mesh['onAfterRender'] = function (this: Mesh, ...args) {
      const entry = stack.pop();
      if (entry && current === entry.owner) {
        const counts = delta(copy(args[0].info.render), entry.start);
        const sample = current!.sample;
        plus(sample.attributed, counts);
        for (const [map, id] of [
          [sample.parts, classification.part.id],
          [sample.rooms, classification.room.id],
        ] as const) {
          if (!map.has(id)) map.set(id, zero());
          plus(map.get(id)!, counts);
        }
      }
      after.apply(this, args);
    };
    mesh.onBeforeRender = wrappedBefore;
    mesh.onAfterRender = wrappedAfter;
    records.push({
      mesh,
      partId: classification.part.id,
      roomId: classification.room.id,
      before,
      after,
      wrappedBefore,
      wrappedAfter,
      clear: () => {
        stack.length = 0;
      },
    });
    const instanceMesh = mesh as Mesh & {
      isInstancedMesh?: boolean;
      count?: number;
    };
    batches.push({
      name: mesh.name || 'unnamed mesh',
      partId: classification.part.id,
      roomId: classification.room.id,
      sourceParts: classification.sources.slice(0, 40),
      sourcePartsCount: classification.sources.length,
      geometryTriangles:
        (mesh.geometry.index?.count ??
          mesh.geometry.attributes.position?.count ??
          0) / 3,
      instances: instanceMesh.isInstancedMesh ? (instanceMesh.count ?? 0) : 1,
    });
  });

  function reset() {
    current = null;
    windows.clear();
    for (const record of records) record.clear();
  }

  const getGroups = () => [...groups.values()].map((group) => ({ ...group }));

  return {
    getGroups,
    setWindowSize(limit: number) {
      maxSamples = Number.isFinite(limit)
        ? Math.max(1, Math.min(14400, Math.floor(limit)))
        : 1800;
      for (const samples of windows.values())
        if (samples.length > maxSamples)
          samples.splice(0, samples.length - maxSamples);
    },
    beginPass(name: string, info?: SceneRenderCounts) {
      if (disposed) return;
      // An interrupted pass is discarded instead of mixing its callbacks into
      // the next pass or inventing a completed workload sample.
      current = {
        name,
        start: info ? copy(info) : null,
        sample: {
          total: zero(),
          attributed: zero(),
          reconciled: false,
          parts: new Map(),
          rooms: new Map(),
        },
      };
    },
    endPass(info?: SceneRenderCounts) {
      if (!current) return;
      const { name, sample, start } = current;
      if (start && info) {
        sample.total = delta(copy(info), start);
        sample.reconciled =
          info.calls >= start.draws && info.triangles >= start.triangles;
      } else {
        sample.total = { ...sample.attributed };
      }
      if (!windows.has(name)) {
        // The renderer currently has two measured passes. Keep accidental
        // dynamic pass names from making this diagnostic collector unbounded.
        if (windows.size >= 8) windows.delete(windows.keys().next().value!);
        windows.set(name, []);
      }
      const window = windows.get(name)!;
      window.push(sample);
      if (window.length > maxSamples) window.shift();
      current = null;
    },
    reset,
    setFilter(next: SpacecraftPerformanceFilter) {
      const normalized: SpacecraftPerformanceFilter =
        next.mode !== 'all' && groups.has(next.id)
          ? { mode: next.mode, id: next.id }
          : { mode: 'all', id: '' };
      if (filter.mode !== normalized.mode || filter.id !== normalized.id)
        reset();
      filter = normalized;
    },
    applyFilter() {
      if (disposed || filter.mode === 'all') return () => {};
      const changed: Mesh[] = [];
      for (const { mesh, partId, roomId } of records) {
        const selected = filter.id === partId || filter.id === roomId;
        if (mesh.visible && (filter.mode === 'hide' ? selected : !selected)) {
          mesh.visible = false;
          changed.push(mesh);
        }
      }
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        for (const mesh of changed) mesh.visible = true;
        restorers.delete(restore);
      };
      restorers.add(restore);
      return restore;
    },
    snapshot(): SpacecraftPerformanceReport {
      const passes: SpacecraftPerformanceReport['passes'] = Object.create(null);
      for (const [name, samples] of windows) {
        const total = zero(),
          attributed = zero();
        const partSums = new Map<string, Counts>(),
          roomSums = new Map<string, Counts>();
        let reconciled = true;
        for (const sample of samples) {
          plus(total, sample.total);
          plus(attributed, sample.attributed);
          reconciled &&= sample.reconciled;
          for (const [source, destination] of [
            [sample.parts, partSums],
            [sample.rooms, roomSums],
          ] as const) {
            for (const [id, counts] of source) {
              if (!destination.has(id)) destination.set(id, zero());
              plus(destination.get(id)!, counts);
            }
          }
        }
        const rows = (
          kind: 'part' | 'room',
          sums: Map<string, Counts>,
        ): SpacecraftPerformanceRow[] => {
          return [...groups.values()]
            .filter((group) => group.kind === kind)
            .map((group) => {
              const counts = sums.get(group.id) ?? zero();
              return {
                id: group.id,
                label: group.label,
                ...mean(counts, samples.length),
                totalDraws: counts.draws,
                totalTriangles: counts.triangles,
              };
            })
            .sort(
              (a, b) =>
                b.drawsPerPass - a.drawsPerPass ||
                b.trianglesPerPass - a.trianglesPerPass,
            );
        };
        passes[name] = {
          samples: samples.length,
          total: mean(total, samples.length),
          attributed: mean(attributed, samples.length),
          unattributed:
            reconciled &&
            total.draws >= attributed.draws &&
            total.triangles >= attributed.triangles
              ? mean(delta(total, attributed), samples.length)
              : null,
          parts: rows('part', partSums),
          rooms: rows('room', roomSums),
        };
      }
      return {
        groups: getGroups(),
        filter: { ...filter },
        passes,
        batches: batches.map((batch) => ({
          ...batch,
          sourceParts: [...batch.sourceParts],
        })),
        limitations: [
          'Draw calls and triangles are actual renderer counter deltas around mesh draws, not CPU or GPU timings; compare whole-pass timing while hiding one group.',
          'Part groups are disjoint existing draw batches. Room totals regroup the same draws and must not be added to part totals. Mixed material batches remain indivisible.',
          'Room assignment follows model ownership; shared exterior assemblies are grouped separately. A shared doorway belongs to its model owner.',
          'Shadow rendering, fullscreen AO/denoise draws, and meshes outside this root are unattributed. Reconciliation is null without complete pass counters or after counter resets.',
          'Each pass has its own bounded sample window. Per-pass averages include zero for absent groups; AO averages describe refresh invocations, not every scene frame.',
          'Filtering only changes mesh visibility during rendering. It retains existing hidden variants, scene updates, lights, cached shadows, and HTML; isolation savings include occlusion and shadow interactions.',
          'Batch inventory is static geometry workload, including hidden variants, not measured draw cost. Source names are capped at 40 per batch.',
        ],
      };
    },
    dispose() {
      if (disposed) return;
      for (const restore of [...restorers].reverse()) restore();
      reset();
      disposed = true;
      for (const record of records) {
        if (record.mesh.onBeforeRender === record.wrappedBefore)
          record.mesh.onBeforeRender = record.before;
        if (record.mesh.onAfterRender === record.wrappedAfter)
          record.mesh.onAfterRender = record.after;
      }
    },
  };
}

export type SpacecraftPerformance = ReturnType<
  typeof createSpacecraftPerformance
>;
