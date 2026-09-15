import {
  CABIN_FLOOR,
  CABIN_HALF_WIDTH,
} from '../lib/spacecraft-wall-layout.ts';
import {
  CONTACT_GRID,
  CABIN_WAYFINDING,
  PROJECTS_UNDERBENCH,
} from '../lib/cabin-composition.ts';

type CabinKind = 'projects' | 'experience' | 'about' | 'contact';
type ProfilePoint = { y: number; z: number };

/** Quiet, retained equipment around each room's main display. All dimensions
 * are floor-relative; mounting shoes follow the rendered pressure-wall profile.
 * Separate layout variants keep the feet fitted without stretching furniture.
 */
export function buildCabinUtilityFittings(
  THREE: any,
  h: any,
  root: any,
  section: CabinKind,
  rearProfile: ProfilePoint[],
  cornerRadius: number,
) {
  const prefix = `${section}-utility-`;
  const material = (
    name: string,
    color: number,
    roughness = 0.68,
    metalness = 0.08,
  ) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.name = prefix + name;
    mat.envMapIntensity = 0.08;
    mat.userData.highlightScale = 0.018;
    return mat;
  };
  const m = {
    enamel: material('enamel', 0xd4ccbd, 0.59),
    frame: material('frame', 0x303d47),
    recess: material('recess', 0x18242d, 0.9, 0),
    metal: material('alloy', 0x879494, 0.48, 0.48),
    amber: material('retainers', 0xc78528, 0.54, 0.14),
    cloth: material('retained-textile', 0x65717a, 0.98, 0),
    bedding: material('rolled-linen', 0xa59b83, 0.98, 0),
    seam: material('textile-binding', 0x354552, 0.96, 0),
  };
  root.userData.equipmentKind = 'cabin-utilities';
  const rearAt = (floorY: number) => {
    const y = floorY + CABIN_FLOOR;
    const hits: number[] = [];
    for (let i = 1; i < rearProfile.length; i++) {
      const a = rearProfile[i - 1],
        b = rearProfile[i];
      if (
        Math.abs(b.y - a.y) < 1e-9 ||
        y < Math.min(a.y, b.y) ||
        y > Math.max(a.y, b.y)
      )
        continue;
      const t = (y - a.y) / (b.y - a.y);
      hits.push(a.z + t * (b.z - a.z));
    }
    return hits.length ? Math.min(...hits) : -1.1;
  };
  const variants: any[] = [];
  for (const layout of ['wide', 'compact']) {
    const s = layout === 'wide' ? 1 : 0.84;
    const halfWidth = CABIN_HALF_WIDTH * (layout === 'wide' ? 1.4 : 1);
    const flatHalfWidth =
      halfWidth - cornerRadius * (layout === 'wide' ? 1.4 : 1);
    // Furniture keeps its own uniform scale while the pressure shell changes
    // width. Justify fittings in the usable flat wall between the rounded
    // corner and furniture; their mounting feet must not sink into the return.
    const edgeCenter = (side: number, furnitureEdge: number) =>
      (side * flatHalfWidth + furnitureEdge * s) / 2;
    const variant = new THREE.Group();
    variant.name = prefix + layout;
    variant.userData = {
      section,
      batchRoot: true,
      excludePick: true,
      layout,
      utilityParts: [],
    };
    root.add(variant);
    variants.push(variant);
    let into = variant;
    let itemName = '';
    const mountPoints: number[][] = [];
    const screws: number[][] = [];
    const box = (
      w: number,
      height: number,
      depth: number,
      mat: any,
      x: number,
      y: number,
      z: number,
      name: string,
      radius = 0.012,
    ) =>
      h.box(
        w,
        height,
        depth,
        mat,
        x,
        y,
        z,
        into,
        radius,
        prefix + itemName + '-' + name,
      );
    const pin = (
      r: number,
      d: number,
      mat: any,
      x: number,
      y: number,
      z: number,
      name: string,
    ) => {
      const mesh = h.cylinder(r, d, mat, x, y, z, into, 'z', r, 16);
      mesh.name = prefix + itemName + '-' + name;
      return mesh;
    };
    const assembly = (name: string, build: () => void) => {
      into = new THREE.Group();
      into.name = prefix + name;
      variant.add(into);
      itemName = name;
      mountPoints.length = 0;
      build();
      into.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(into);
      variant.userData.utilityParts.push({
        name,
        min: bounds.min.toArray(),
        max: bounds.max.toArray(),
        mounts: mountPoints.map((p) => [...p]),
      });
    };
    // Contoured mounting feet seat across the actual curved wall, rather than
    // touching one edge and leaving a visible wedge-shaped gap beneath the foot.
    const shoe = (
      x: number,
      y: number,
      front: number,
      width = 0.065 * s,
      height = 0.06 * s,
      addScrew = true,
      name = 'contoured-wall-shoe',
    ) => {
      const bottom = y - height / 2,
        top = y + height / 2;
      const ys = [bottom, top, ...rearProfile.map((p) => p.y - CABIN_FLOOR)]
        .filter((v) => v >= bottom && v <= top)
        .sort((a, b) => b - a);
      const shape = new THREE.Shape();
      shape.moveTo(-front, bottom);
      shape.lineTo(-front, top);
      for (const yy of ys) shape.lineTo(-rearAt(yy) + 0.001, yy);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: width,
        bevelEnabled: false,
        steps: 1,
      });
      geo.rotateY(Math.PI / 2);
      geo.translate(x - width / 2, 0, 0);
      h.mesh(geo, m.frame, into, prefix + itemName + '-' + name);
      if (addScrew) screws.push([x, y, front + 0.004]);
      mountPoints.push([x, y, rearAt(y)]);
    };
    const mountedBox = (
      x: number,
      y: number,
      w: number,
      height: number,
      depth: number,
      mat: any,
    ) => {
      const back =
        Math.max(rearAt(y - height / 2), rearAt(y + height / 2)) + 0.028 * s;
      // Narrow cases need proportionate feet: a fixed-size shoe used to
      // extend beyond compact side equipment into the curved wall junction.
      const shoeWidth = Math.min(0.065 * s, w * 0.22);
      for (const dx of [-w * 0.38, w * 0.38])
        for (const dy of [-height * 0.33, height * 0.33])
          shoe(x + dx, y + dy, back + 0.006 * s, shoeWidth);
      box(
        w,
        height,
        depth,
        m.recess,
        x,
        y,
        back + depth / 2,
        'isolation-case',
        0.024 * s,
      );
      box(
        w - 0.023 * s,
        height - 0.023 * s,
        0.022 * s,
        mat,
        x,
        y,
        back + depth + 0.005 * s,
        'removable-face',
        0.018 * s,
      );
      return back + depth + 0.017 * s;
    };
    const slots = (
      x: number,
      y: number,
      z: number,
      w: number,
      count: number,
      pitch = 0.037 * s,
    ) => {
      box(
        w + 0.028 * s,
        count * pitch + 0.022 * s,
        0.009 * s,
        m.recess,
        x,
        y,
        z,
        'grille-rebate',
        0.006 * s,
      );
      for (let i = 0; i < count; i++)
        box(
          w,
          0.012 * s,
          0.012 * s,
          m.metal,
          x,
          y + (i - (count - 1) / 2) * pitch,
          z + 0.006 * s,
          'captured-louvre',
          0.003 * s,
        );
    };
    const latch = (x: number, y: number, z: number, w = 0.12 * s) => {
      box(
        w + 0.03 * s,
        0.06 * s,
        0.009 * s,
        m.recess,
        x,
        y,
        z,
        'pull-recess',
        0.014 * s,
      );
      box(
        w,
        0.021 * s,
        0.026 * s,
        m.metal,
        x,
        y,
        z + 0.009 * s,
        'captive-pull',
        0.007 * s,
      );
      box(
        0.023 * s,
        0.033 * s,
        0.012 * s,
        m.amber,
        x + w / 2 - 0.008 * s,
        y,
        z + 0.026 * s,
        'latch-safety',
        0.004 * s,
      );
    };

    const signY = CABIN_WAYFINDING.centerY - CABIN_FLOOR;
    const ventBottom = signY - 0.09 * s;
    // Justify each air return in the actual label-to-wall gap. Its visible
    // face shares the shallow room sign's plane, so perspective preserves alignment.
    for (const side of [-1, 1])
      assembly(`upper-air-return-${side}`, () => {
        const x = (side * (halfWidth + CABIN_WAYFINDING.roomSignWidth / 2)) / 2,
          y = signY;
        const width = 0.39 * s,
          height = 0.18 * s;
        const front = CABIN_WAYFINDING.roomSignFaceZ - 0.03 * s;
        // One continuous casing meets the curved wall over its full footprint;
        // there are no stand-off bars or open space behind the return grille.
        shoe(x, y, front, width, height, false, 'flush-air-return-housing');
        box(
          width - 0.014 * s,
          height - 0.014 * s,
          0.016 * s,
          m.enamel,
          x,
          y,
          front + 0.007 * s,
          'air-return-face',
          0.012 * s,
        );
        const face = front + 0.015 * s;
        for (const dx of [-0.174, 0.174])
          for (const dy of [-0.065, 0.065])
            screws.push([x + dx * s, y + dy * s, face + 0.003 * s]);
        slots(x, y, face + 0.003 * s, 0.29 * s, 3, 0.033 * s);
      });

    if (section === 'projects' || section === 'contact') {
      for (const side of [-1, 1])
        assembly(`underbench-${side}`, () => {
          const x =
            side *
            (section === 'projects' ? PROJECTS_UNDERBENCH.columnX : 0.825) *
            s;
          const y =
            (section === 'projects' ? 0.25 + PROJECTS_UNDERBENCH.lift : 0.24) *
            s;
          const w = (section === 'projects' ? 0.6 : 0.36) * s;
          const ht = (section === 'projects' ? 0.19 : 0.23) * s;
          const face = mountedBox(x, y, w, ht, 0.16 * s, m.enamel);
          if (section === 'projects') {
            // Shallow tool drawers with full returns, captive pulls and corner guards.
            box(
              w - 0.035 * s,
              0.008 * s,
              0.012 * s,
              m.recess,
              x,
              y + 0.073 * s,
              face + 0.003 * s,
              'drawer-joint',
              0.002 * s,
            );
            latch(x, y - 0.015 * s, face + 0.008 * s, 0.21 * s);
            for (const dx of [-1, 1])
              box(
                0.027 * s,
                ht - 0.05 * s,
                0.024 * s,
                m.frame,
                x + dx * (w / 2 - 0.013 * s),
                y,
                face + 0.007 * s,
                'edge-guard',
                0.008 * s,
              );
          } else if (side < 0) {
            // Sealed power-service access, with one recessed captive pull.
            box(
              0.215 * s,
              0.125 * s,
              0.012 * s,
              m.frame,
              x - 0.035 * s,
              y + 0.02 * s,
              face + 0.006 * s,
              'sealed-power-service-lid',
              0.015 * s,
            );
            latch(x - 0.035 * s, y + 0.02 * s, face + 0.019 * s, 0.095 * s);
            box(
              0.035 * s,
              0.089 * s,
              0.024 * s,
              m.frame,
              x + 0.125 * s,
              y,
              face + 0.014 * s,
              'isolation-cover',
              0.006 * s,
            );
            box(
              0.015 * s,
              0.048 * s,
              0.011 * s,
              m.amber,
              x + 0.125 * s,
              y,
              face + 0.03 * s,
              'guard-index',
              0.003 * s,
            );
          } else {
            latch(x, y, face + 0.008 * s, 0.18 * s);
            for (const dx of [-0.145, 0.145])
              box(
                0.03 * s,
                ht - 0.02 * s,
                0.02 * s,
                m.frame,
                x + dx * s,
                y,
                face + 0.007 * s,
                'battery-retaining-strap',
                0.005 * s,
              );
          }
        });
    }

    if (section === 'projects') {
      const serviceCenterY = (0.731 * s + ventBottom) / 2;
      assembly('retained-tool-board', () => {
        const x = edgeCenter(-1, -1.3085),
          y = serviceCenterY;
        const face = mountedBox(x, y, 0.3 * s, 0.8 * s, 0.042 * s, m.frame);
        // Two captive drivers, with round shafts, grip collars and seated bits.
        for (const dx of [-0.066, 0.055]) {
          const shaft = h.cylinder(
            0.011 * s,
            0.36 * s,
            m.metal,
            x + dx * s,
            y + 0.09 * s,
            face + 0.024 * s,
            into,
            'y',
            0.011 * s,
            12,
          );
          shaft.name = prefix + 'captured-driver-shaft';
          box(
            0.015 * s,
            0.052 * s,
            0.012 * s,
            m.metal,
            x + dx * s,
            y + 0.277 * s,
            face + 0.024 * s,
            'driver-bit',
            0.002 * s,
          );
          box(
            0.06 * s,
            0.19 * s,
            0.052 * s,
            dx < 0 ? m.amber : m.recess,
            x + dx * s,
            y - 0.13 * s,
            face + 0.027 * s,
            'insulated-grip',
            0.018 * s,
          );
          for (const dy of [-0.19, -0.155, -0.12, -0.085])
            box(
              0.054 * s,
              0.008 * s,
              0.007 * s,
              m.frame,
              x + dx * s,
              y + dy * s,
              face + 0.056 * s,
              'grip-flute',
              0.002 * s,
            );
          const collar = h.cylinder(
            0.03 * s,
            0.026 * s,
            m.metal,
            x + dx * s,
            y - 0.033 * s,
            face + 0.028 * s,
            into,
            'y',
            0.03 * s,
            12,
          );
          collar.name = prefix + 'driver-grip-collar';
          for (const dy of [-0.22, 0.23])
            box(
              0.081 * s,
              0.033 * s,
              0.065 * s,
              m.enamel,
              x + dx * s,
              y + dy * s,
              face + 0.024 * s,
              'tool-retainer',
              0.006 * s,
            );
        }
      });
      assembly('retained-diagnostic-lead', () => {
        const x = edgeCenter(1, 1.3435),
          y = serviceCenterY;
        const face = mountedBox(x, y, 0.2 * s, 0.72 * s, 0.025 * s, m.frame);
        // A spare test lead is coiled on its cradle, with both plugs captive.
        const points = [
          new THREE.Vector3(x, y + 0.25 * s, face + 0.035 * s),
          ...Array.from({ length: 169 }, (_, i) => {
            const u = i / 168;
            const angle = Math.PI / 2 + u * Math.PI * 7;
            return new THREE.Vector3(
              x + Math.cos(angle) * (0.054 + u * 0.021) * s,
              y + Math.sin(angle) * (0.2 + u * 0.028) * s,
              face + (0.018 + u * 0.05) * s,
            );
          }),
          new THREE.Vector3(x, y - 0.25 * s, face + 0.035 * s),
        ];
        h.mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            192,
            0.006 * s,
            8,
            false,
          ),
          m.cloth,
          into,
          prefix + 'coiled-diagnostic-cable',
        );
        for (const side of [-1, 1]) {
          box(
            0.174 * s,
            0.031 * s,
            0.083 * s,
            m.enamel,
            x,
            y + side * 0.12 * s,
            face + 0.038 * s,
            'coil-keeper',
            0.006 * s,
          );
          const plug = h.cylinder(
            0.026 * s,
            0.09 * s,
            m.metal,
            x,
            y + side * 0.29 * s,
            face + 0.035 * s,
            into,
            'y',
            0.026 * s,
            16,
          );
          plug.name = prefix + 'captive-test-plug';
          box(
            0.065 * s,
            0.025 * s,
            0.061 * s,
            m.amber,
            x,
            y + side * 0.295 * s,
            face + 0.024 * s,
            'plug-lock',
            0.006 * s,
          );
        }
      });
    }

    if (section === 'experience') {
      const serviceHeight = 0.88;
      const transportHeight = 0.49;
      const gap = (ventBottom - (serviceHeight + transportHeight) * s) / 3;
      assembly('retained-recorder-transport', () => {
        const x = edgeCenter(-1, -1.3925),
          y = gap + (transportHeight * s) / 2;
        const width = layout === 'compact' ? 0.17 : 0.36 * s;
        const t = width / (0.36 * s);
        const face = mountedBox(
          x,
          y,
          width,
          transportHeight * s,
          0.2 * s,
          m.frame,
        );
        box(
          0.255 * s * t,
          0.34 * s,
          0.019 * s,
          m.enamel,
          x,
          y,
          face + 0.006 * s,
          'sealed-case-lid',
          0.017 * s,
        );
        for (const dy of [-0.14, 0.14]) {
          box(
            width,
            0.044 * s,
            0.037 * s,
            m.recess,
            x,
            y + dy * s,
            face + 0.019 * s,
            'transport-restraint',
            0.009 * s,
          );
          box(
            0.066 * s * t,
            0.057 * s,
            0.02 * s,
            m.amber,
            x + 0.065 * s * t,
            y + dy * s,
            face + 0.047 * s,
            'captive-buckle',
            0.008 * s,
          );
        }
        latch(x, y + 0.015 * s, face + 0.015 * s, 0.12 * s * t);
      });
      for (const side of [-1, 1])
        assembly(`archive-service-column-${side}`, () => {
          const centeredX = edgeCenter(side, side * 1.3925);
          // Give the right conduit more air beside the archive rack. Limit the
          // shift to the usable flat wall so compact layouts clear the cove.
          const rightShift =
            side > 0
              ? Math.min(
                  0.07 * s,
                  Math.max(
                    0,
                    flatHalfWidth - 0.085 * s - 0.012 * s - centeredX,
                  ),
                )
              : 0;
          const x = centeredX + rightShift,
            y =
              side < 0
                ? 2 * gap + (transportHeight + serviceHeight / 2) * s
                : ventBottom / 2 + 0.13 * s;
          const face = mountedBox(
            x,
            y,
            0.17 * s,
            serviceHeight * s,
            0.036 * s,
            m.frame,
          );
          if (side < 0) {
            // Sealed spare recorder cores, docked individually for servicing.
            for (const dy of [-0.26, 0, 0.26]) {
              const core = h.cylinder(
                0.046 * s,
                0.18 * s,
                m.enamel,
                x,
                y + dy * s,
                face + 0.05 * s,
                into,
                'y',
                0.046 * s,
                16,
              );
              core.name = prefix + 'spare-recorder-core';
              for (const end of [-1, 1]) {
                const cap = h.cylinder(
                  0.052 * s,
                  0.025 * s,
                  m.metal,
                  x,
                  y + (dy + end * 0.088) * s,
                  face + 0.05 * s,
                  into,
                  'y',
                  0.052 * s,
                  16,
                );
                cap.name = prefix + 'recorder-core-end-cap';
              }
              box(
                0.137 * s,
                0.032 * s,
                0.113 * s,
                m.recess,
                x,
                y + dy * s,
                face + 0.048 * s,
                'core-retaining-band',
                0.006 * s,
              );
              box(
                0.027 * s,
                0.032 * s,
                0.009 * s,
                m.amber,
                x,
                y + dy * s,
                face + 0.108 * s,
                'core-captive-latch',
                0.004 * s,
              );
            }
          } else {
            for (const dx of [-0.03, 0.03])
              box(
                0.018 * s,
                0.71 * s,
                0.024 * s,
                m.metal,
                x + dx * s,
                y,
                face + 0.013 * s,
                'data-conduit',
                0.007 * s,
              );
            for (const dy of [-0.29, 0, 0.29])
              box(
                0.13 * s,
                0.032 * s,
                0.034 * s,
                m.enamel,
                x,
                y + dy * s,
                face + 0.03 * s,
                'conduit-clamp',
                0.006 * s,
              );
          }
        });
    }

    if (section === 'contact') {
      // Service umbilicals descend behind the social displays, outside their faces.
      for (const side of [-1, 1])
        assembly(`console-umbilical-${side}`, () => {
          const x =
              side *
              Math.min(
                (halfWidth + 1.585 * s) / 2,
                // Keep the whole strain-relief footprint inside the flat rear
                // wall in the narrow layout. It remains behind the console.
                flatHalfWidth - (0.075 * s) / 2 - 0.004,
              ),
            y = (CONTACT_GRID.sideY - CONTACT_GRID.lowering) * s;
          for (const dy of [-0.44, 0.44]) shoe(x, y + dy * s, -0.988);
          box(
            0.05 * s,
            0.92 * s,
            0.025 * s,
            m.frame,
            x,
            y,
            -0.974,
            'covered-raceway',
            0.009 * s,
          );
          box(
            0.026 * s,
            0.85 * s,
            0.01 * s,
            m.metal,
            x,
            y,
            -0.956,
            'raceway-cover',
            0.004 * s,
          );
          for (const dy of [-0.2, 0.2])
            box(
              0.058 * s,
              0.032 * s,
              0.023 * s,
              m.frame,
              x,
              y + dy * s,
              -0.946,
              'raceway-captive-clip',
              0.005 * s,
            );
          for (const dy of [-0.39, 0.39])
            box(
              0.075 * s,
              0.085 * s,
              0.057 * s,
              m.enamel,
              x,
              y + dy * s,
              -0.944,
              'strain-relief-cover',
              0.012 * s,
            );
        });
    }

    if (section === 'about') {
      assembly('folded-crew-perch', () => {
        const x = 0.479 * s,
          y = 0.475 * s;
        const face = mountedBox(x, y, 0.51 * s, 0.225 * s, 0.081 * s, m.frame);
        box(
          0.45 * s,
          0.167 * s,
          0.057 * s,
          m.cloth,
          x,
          y,
          face + 0.018 * s,
          'folded-cushion',
          0.038 * s,
        );
        for (const dx of [-0.21, 0.21])
          box(
            0.025 * s,
            0.19 * s,
            0.018 * s,
            m.seam,
            x + dx * s,
            y,
            face + 0.047 * s,
            'bound-cushion-edge',
            0.009 * s,
          );
        for (const dx of [-0.22, 0.22])
          pin(
            0.026 * s,
            0.028 * s,
            m.metal,
            x + dx * s,
            y - 0.078 * s,
            face + 0.052 * s,
            'hinge-pin',
          );
        box(
          0.034 * s,
          0.2 * s,
          0.013 * s,
          m.recess,
          x,
          y,
          face + 0.052 * s,
          'stowage-strap',
          0.006 * s,
        );
        box(
          0.06 * s,
          0.047 * s,
          0.017 * s,
          m.metal,
          x,
          y,
          face + 0.063 * s,
          'retaining-buckle',
          0.006 * s,
        );
      });
      assembly('retained-bedding-roll', () => {
        const x = edgeCenter(-1, -1.295);
        // Share the berth's vertical midpoint while retaining its own wall column.
        const y = 1.15 * s;
        const face = mountedBox(x, y, 0.2 * s, 0.87 * s, 0.025 * s, m.seam);
        const z = face + 0.083 * s;
        const roll = h.cylinder(
          0.076 * s,
          0.66 * s,
          m.bedding,
          x,
          y,
          z,
          into,
          'y',
          0.076 * s,
          24,
        );
        roll.name = prefix + 'rolled-crew-bedding';
        for (const end of [-1, 1]) {
          const cap = h.mesh(
            new THREE.SphereGeometry(0.076 * s, 24, 12),
            m.bedding,
            into,
            prefix + 'soft-roll-end',
          );
          cap.position.set(x, y + end * 0.33 * s, z);
          cap.scale.y = 0.35;
          const strap = h.cylinder(
            0.079 * s,
            0.042 * s,
            m.seam,
            x,
            y + end * 0.23 * s,
            z,
            into,
            'y',
            0.079 * s,
            24,
          );
          strap.name = prefix + 'bedding-restraint-band';
          box(
            0.06 * s,
            0.042 * s,
            0.025 * s,
            m.seam,
            x,
            y + end * 0.23 * s,
            face + 0.008 * s,
            'bedding-strap-wall-keeper',
            0.003 * s,
          );
          box(
            0.044 * s,
            0.05 * s,
            0.018 * s,
            m.metal,
            x,
            y + end * 0.23 * s,
            z + 0.082 * s,
            'bedding-buckle',
            0.006 * s,
          );
        }
        box(
          0.013 * s,
          0.62 * s,
          0.006 * s,
          m.cloth,
          x + 0.025 * s,
          y,
          z + 0.073 * s,
          'bound-blanket-edge',
          0.002 * s,
        );
      });
    }

    // Fasteners batch with their room, never creating additional hit targets.
    into = variant;
    const screwGeometry = new THREE.CylinderGeometry(
      0.009 * s,
      0.009 * s,
      0.006 * s,
      12,
    );
    screwGeometry.rotateX(Math.PI / 2);
    const fasteners = h.instances(
      screwGeometry,
      m.metal,
      screws.map((p) => ({ p })),
      variant,
      prefix + 'captive-fasteners',
    );
    fasteners.userData.excludePick = true;
  }
  return {
    setLayout(layout: string) {
      for (const variant of variants)
        variant.visible = variant.userData.layout === layout;
    },
  };
}

/** The solid web between the stair hatches houses a shallow isolation cassette.
 * Its face follows the wall; there is no extra pressure-wall panel or cutout.
 */
export function buildLadderWebFittings(THREE: any, h: any, root: any) {
  const material = (name: string, color: number, roughness = 0.68) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.12,
    });
    m.name = 'ladder-web-' + name;
    m.userData.highlightScale = 0.018;
    return m;
  };
  const dark = material('graphite', 0x293741),
    cream = material('enamel', 0xd4ccbd),
    metal = material('satin-alloy', 0x899797),
    amber = material('captive-handles', 0xc78528);
  root.userData.equipmentKind = 'ladder-isolation-cassette';
  const box = (
    w: number,
    ht: number,
    d: number,
    m: any,
    x: number,
    y: number,
    z: number,
    name: string,
    r = 0.01,
  ) => h.box(w, ht, d, m, x, y, z, root, r, 'ladder-web-' + name);
  for (const x of [-0.29, 0.29])
    for (const y of [-0.18, 0.18]) {
      box(0.085, 0.074, 0.022, dark, x, y, 0.011, 'wall-foot');
      const screw = h.cylinder(
        0.012,
        0.007,
        metal,
        x,
        y,
        0.027,
        root,
        'z',
        0.012,
        12,
      );
      screw.name = 'ladder-web-captive-screw';
    }
  box(0.7, 0.4, 0.041, dark, 0, 0, 0.032, 'isolation-case', 0.03);
  box(0.63, 0.33, 0.015, cream, 0, 0, 0.057, 'service-cover', 0.025);
  for (const x of [-0.16, 0.16]) {
    const ring = h.cylinder(
      0.081,
      0.008,
      dark,
      x,
      0,
      0.07,
      root,
      'z',
      0.081,
      24,
    );
    ring.name = 'ladder-web-valve-socket';
    const cap = h.cylinder(
      0.058,
      0.018,
      metal,
      x,
      0,
      0.078,
      root,
      'z',
      0.058,
      24,
    );
    cap.name = 'ladder-web-valve-cap';
    box(0.087, 0.016, 0.016, amber, x, 0, 0.094, 'isolation-grip', 0.006);
    for (const y of [-0.119, 0.119])
      box(0.104, 0.013, 0.014, dark, x, y, 0.073, 'captured-guard', 0.005);
  }
}
