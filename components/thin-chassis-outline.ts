import {
  PRESSURE_WALL,
  PRESSURE_FACE_BEVEL,
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_HALF_STRAIGHT,
  LADDER_SHOULDER_RISE,
} from '../lib/spacecraft-wall-layout.ts';

/** One continuous pressure face, offset from fixed cabin interior datums. */
export function thinChassisOutline(
  THREE: any,
  {
    scale = 1,
    thickness = PRESSURE_WALL,
    bevel = PRESSURE_FACE_BEVEL,
    ladderFrontRight = 0.69,
  } = {},
) {
  const s = scale;
  const t = thickness;
  const b = bevel;
  const coreOffset = t - b;
  const halfRoom = CABIN_HALF_WIDTH * s;
  const halfPitch = halfRoom + t / 2;
  const floor = CABIN_FLOOR;
  const ceiling = CABIN_CEILING;
  const rowHalfPitch = (ceiling - floor + t) / 2;
  const ladderX = -halfPitch - halfRoom - t - 0.69 * s;
  const left = ladderX - 0.665 * s - coreOffset;
  const tangent = ladderX + 0.565 * s;
  const right = halfPitch + halfRoom + coreOffset;
  const noseTop = LADDER_CENTER_Y + LADDER_HEIGHT / 2 + coreOffset;
  const noseBottom = LADDER_CENTER_Y - LADDER_HEIGHT / 2 - coreOffset;
  const roof = rowHalfPitch + ceiling + coreOffset;
  const keel = -rowHalfPitch + floor - coreOffset;
  const stepStartX = ladderX + ladderFrontRight * s + coreOffset;
  const stepWidth = 0.42 * s + 0.1;
  const stepEndX = stepStartX + stepWidth;
  const cornerX = 0.35 * s + coreOffset;
  const cornerY = 0.35 + coreOffset;
  const leftRadiusX = 1.23 * s + coreOffset;
  const leftRadiusY = LADDER_SHOULDER_RISE + coreOffset;
  const upperTangentY = LADDER_CENTER_Y + LADDER_HALF_STRAIGHT;
  const lowerTangentY = LADDER_CENTER_Y - LADDER_HALF_STRAIGHT;
  const k = 0.5522847498;
  const outer = new THREE.Shape();
  outer.moveTo(tangent, noseBottom);
  outer.lineTo(stepStartX, noseBottom);
  outer.bezierCurveTo(
    stepStartX + stepWidth * 0.4,
    noseBottom,
    stepStartX + stepWidth * 0.6,
    keel,
    stepEndX,
    keel,
  );
  outer.lineTo(right - cornerX, keel);
  outer.quadraticCurveTo(right, keel, right, keel + cornerY);
  outer.lineTo(right, roof - cornerY);
  outer.quadraticCurveTo(right, roof, right - cornerX, roof);
  outer.lineTo(stepEndX, roof);
  outer.bezierCurveTo(
    stepStartX + stepWidth * 0.6,
    roof,
    stepStartX + stepWidth * 0.4,
    noseTop,
    stepStartX,
    noseTop,
  );
  outer.lineTo(tangent, noseTop);
  outer.bezierCurveTo(
    tangent - leftRadiusX * k,
    noseTop,
    left,
    upperTangentY + leftRadiusY * k,
    left,
    upperTangentY,
  );
  outer.lineTo(left, lowerTangentY);
  outer.bezierCurveTo(
    left,
    lowerTangentY - leftRadiusY * k,
    tangent - leftRadiusX * k,
    noseBottom,
    tangent,
    noseBottom,
  );
  outer.closePath();

  function roundedHole(cx: number, cy: number) {
    // Bevel expands the outside but narrows holes at the throat: compensate
    // +b per edge so the narrowest opening retains exact usable cabin size.
    const hx = halfRoom + b;
    const hy = (ceiling - floor) / 2 + b;
    const rx = 0.35 * s + b;
    const ry = 0.35 + b;
    const p = new THREE.Path();
    p.moveTo(cx - hx + rx, cy - hy);
    p.lineTo(cx + hx - rx, cy - hy);
    p.quadraticCurveTo(cx + hx, cy - hy, cx + hx, cy - hy + ry);
    p.lineTo(cx + hx, cy + hy - ry);
    p.quadraticCurveTo(cx + hx, cy + hy, cx + hx - rx, cy + hy);
    p.lineTo(cx - hx + rx, cy + hy);
    p.quadraticCurveTo(cx - hx, cy + hy, cx - hx, cy + hy - ry);
    p.lineTo(cx - hx, cy - hy + ry);
    p.quadraticCurveTo(cx - hx, cy - hy, cx - hx + rx, cy - hy);
    p.closePath();
    return p;
  }
  const roomHoles: any[] = [];
  for (const x of [-halfPitch, halfPitch])
    for (const row of [-1, 1]) {
      const p = roundedHole(x, row * rowHalfPitch + (ceiling + floor) / 2);
      outer.holes.push(p);
      roomHoles.push(p);
    }

  // The bow and cabin tops share one tangent roof line. The bottom is its
  // exact reflection around the combined deck center; neither end needs a hump.
  const lh = new THREE.Path();
  const ll = ladderX - 0.665 * s - b;
  const lr = ladderX + ladderFrontRight * s + b;
  const lt = LADDER_CENTER_Y + LADDER_HEIGHT / 2 + b;
  const lb = LADDER_CENTER_Y - LADDER_HEIGHT / 2 - b;
  const lrx = 1.23 * s + b;
  const lry = LADDER_SHOULDER_RISE + b;
  const rrx = 0.04 * s + b;
  const rry = 0.04 + b;
  lh.moveTo(tangent, lb);
  lh.lineTo(lr - rrx, lb);
  lh.quadraticCurveTo(lr, lb, lr, lb + rry);
  lh.lineTo(lr, lt - rry);
  lh.quadraticCurveTo(lr, lt, lr - rrx, lt);
  lh.lineTo(tangent, lt);
  lh.bezierCurveTo(
    tangent - lrx * k,
    lt,
    ll,
    upperTangentY + lry * k,
    ll,
    upperTangentY,
  );
  lh.lineTo(ll, lowerTangentY);
  lh.bezierCurveTo(
    ll,
    lowerTangentY - lry * k,
    tangent - lrx * k,
    lb,
    tangent,
    lb,
  );
  lh.closePath();
  outer.holes.push(lh);

  return {
    outer,
    roomHoles,
    ladderHole: lh,
    extrusion: {
      // Finished front-to-back thickness is also T. Pick the desired mounting
      // center explicitly; never retain the old .22+.07 face depth by accident.
      depth: t - 2 * b,
      bevelEnabled: true,
      bevelSize: b,
      bevelThickness: b,
      bevelSegments: 3,
      curveSegments: 32,
      steps: 1,
    },
    datums: {
      scale: s,
      thickness: t,
      bevel: b,
      halfRoom,
      halfPitch,
      rowHalfPitch,
      floor,
      ceiling,
      ladderX,
      left,
      right,
      noseTop,
      noseBottom,
      ladderCenterY: LADDER_CENTER_Y,
      ladderHeight: LADDER_HEIGHT,
      upperTangentY,
      lowerTangentY,
      roof,
      keel,
      stepStartX,
      stepEndX,
      nominalRightOuter: halfPitch + halfRoom + t,
      nominalDockingOuter: ladderX - 0.665 * s - t,
      roomUsableSize: [2 * halfRoom, ceiling - floor],
      coreWebThickness: t,
      faceEdgeWebThickness: t - 2 * b,
    },
  };
}
