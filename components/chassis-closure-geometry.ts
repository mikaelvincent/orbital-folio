/**
 * Exterior-only join geometry for the compact pressure shell.
 * Existing cabin and ladder interiors remain the only interior owners.
 *
 * Call once per layout, passing thinChassisOutline(..., { bevel: 0 }).datums,
 * the model's canonical exteriorPoints and computed outerBow points.
 */
export function buildChassisClosures(
  THREE: any,
  {
    datums: d,
    cabinExteriorProfile,
    outerBow,
    frontZ,
    ladderRearZ = -0.985 - d.thickness,
    cabinRearZ = -1.1 - d.thickness,
  }: any,
) {
  const t = d.thickness;
  const s = d.scale;
  const tangentX = d.ladderX + 0.565 * s;
  const startX = d.stepStartX;
  const endX = d.stepEndX;
  const width = endX - startX;
  const q = d.rowHalfPitch;
  const samples = 36;
  const depthSamples = 64;

  // The canonical C-profile is in (-Z,Y), before its rotation/extrusion.
  // Sampling its actual outer edge closes the aft cove as well as the flat roof.
  function envelopeAtZ(z: number, upper: boolean) {
    const at = -z;
    const values: number[] = [];
    for (let i = 0; i + 1 < cabinExteriorProfile.length; i++) {
      const a = cabinExteriorProfile[i],
        b = cabinExteriorProfile[i + 1];
      if (at < Math.min(a.x, b.x) - 1e-7 || at > Math.max(a.x, b.x) + 1e-7)
        continue;
      if (Math.abs(b.x - a.x) < 1e-8) {
        values.push(a.y, b.y);
      } else {
        const f = Math.max(0, Math.min(1, (at - a.x) / (b.x - a.x)));
        values.push(a.y + (b.y - a.y) * f);
      }
    }
    if (!values.length)
      throw new Error(`No canonical C-profile envelope at Z=${z}`);
    return upper ? Math.max(...values) + q : Math.min(...values) - q;
  }
  function bowEnvelopeAtX(x: number, upper: boolean) {
    const values: number[] = [];
    for (let i = 0; i < outerBow.length; i++) {
      const a = outerBow[i],
        b = outerBow[(i + 1) % outerBow.length];
      if (x < Math.min(a.x, b.x) - 1e-6 || x > Math.max(a.x, b.x) + 1e-6)
        continue;
      if (Math.abs(b.x - a.x) < 1e-8) values.push(a.y, b.y);
      else {
        const f = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)));
        values.push(a.y + (b.y - a.y) * f);
      }
    }
    // The end of the bow offset can differ by a tessellation epsilon.
    return values.length
      ? upper
        ? Math.max(...values)
        : Math.min(...values)
      : upper
        ? 3.07
        : -3.05;
  }
  const geometry = (positions: number[], indices: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  };
  const surfaces: any[] = [];
  const rears: any[] = [];
  for (const upper of [true, false]) {
    const nose = upper ? d.noseTop : d.noseBottom;
    const rows: { x: number; blend: number; rearZ: number; lead: boolean }[] =
      [];
    // The original bow offset rounded its tiny upper-right/lower-right corner,
    // unlike the continuous chassis outline. Own the short flat shoulder here
    // too; omit matching bow skin segments after tangentX (integration note).
    for (let i = 0; i < 9; i++)
      rows.push({
        x: tangentX + ((startX - tangentX) * i) / 8,
        blend: 0,
        rearZ: ladderRearZ,
        lead: true,
      });
    for (let i = 1; i <= samples; i++) {
      const u = i / samples;
      const e = u * u * (3 - 2 * u);
      const x = startX + width * (1.2 * u - 0.6 * u * u + 0.4 * u * u * u);
      rows.push({
        x,
        blend: e,
        rearZ: ladderRearZ + (cabinRearZ - ladderRearZ) * e,
        lead: false,
      });
    }
    const p: number[] = [],
      ix: number[] = [];
    const rp: number[] = [],
      ri: number[] = [];
    for (const row of rows) {
      for (let j = 0; j <= depthSamples; j++) {
        const z = frontZ + ((row.rearZ - frontZ) * j) / depthSamples;
        const base = envelopeAtZ(z, upper);
        p.push(row.x, nose + (base - nose) * row.blend, z);
      }
      const base = row.lead
        ? bowEnvelopeAtX(row.x, upper)
        : envelopeAtZ(row.rearZ, upper);
      const top = nose + (envelopeAtZ(row.rearZ, upper) - nose) * row.blend;
      rp.push(row.x, base, row.rearZ, row.x, top, row.rearZ);
    }
    for (let i = 0; i + 1 < rows.length; i++) {
      for (let j = 0; j < depthSamples; j++) {
        const a = i * (depthSamples + 1) + j;
        const b = (i + 1) * (depthSamples + 1) + j;
        // Grid depth runs front -> rear, so this winding points upward.
        if (upper) ix.push(a, b, b + 1, a, b + 1, a + 1);
        else ix.push(a, b + 1, b, a, a + 1, b + 1);
      }
      const a = i * 2,
        b = (i + 1) * 2;
      if (upper) ri.push(a, a + 1, b + 1, a, b + 1, b);
      else ri.push(a, b + 1, a + 1, a, b, b + 1);
    }
    const name = upper ? 'roof' : 'keel';
    surfaces.push({
      name: `continuous-${name}-shoulder-fairing`,
      geometry: geometry(p, ix),
    });
    rears.push({
      name: `continuous-${name}-shoulder-rear-closure`,
      geometry: geometry(rp, ri),
    });
  }

  // A real T-deep rear bridge only across the vacated middeck notch. Its front
  // lies on the existing rear interior datum; both room coves stay in front of
  // it, so it never cuts into either room. There is no full rear-wall overlay.
  const lower = -q + 0.89;
  const upper = q - 0.61;
  const bridge = new THREE.BoxGeometry(
    2 * (d.halfPitch + d.halfRoom),
    upper - lower,
    t,
  );
  bridge.translate(0, (upper + lower) / 2, cabinRearZ + t / 2);
  return {
    surfaces,
    rears,
    rearBridge: {
      name: 'continuous-middeck-rear-pressure-bridge',
      geometry: bridge,
    },
    replaceBowAfterX: tangentX,
    metadata: {
      nominalThickness: t,
      shoulderBoundsX: [tangentX, endX],
      rearBridgeBoundsY: [lower, upper],
      rearBridgeBoundsZ: [cabinRearZ, cabinRearZ + t],
    },
  };
}
