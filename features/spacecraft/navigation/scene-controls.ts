/** Pure geometry/input candidates. Add selected helpers beside flight.ts;
 * this file does not replace routing, existing springs, or scene event wiring. */
export type Vec3 = readonly [number, number, number];
export type CameraView = { target: Vec3; direction: Vec3; up?: Vec3 };
export type NdcBounds = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};
export type Aperture = {
  center: Vec3;
  right: Vec3;
  up: Vec3;
  width: number;
  height: number;
};
export type RoomCameraFrame = {
  aperture: Aperture;
  requiredPoints: readonly Vec3[];
};
/** Shared by actual input and the camera-fit envelope (radians). */
export const CAMERA_RANGES = {
  hover: { pitch: 0.021, yaw: 0.036 },
  overview: { pitch: 0.18, yaw: 0.32 },
  room: { pitch: 0.12, yaw: 0.22 },
} as const;
/** More depth on broad canvases, a quieter silhouette beside portrait callouts.
 * Keep this continuous at square/tablet sizes; the fit still owns distance and
 * screen-space centering, and room cameras retain their common frontal view. */
export function overviewCameraDirection(aspect: number): Vec3 {
  const t = Math.max(0, Math.min(1, (aspect - 0.9) / 0.9));
  const landscape = t * t * (3 - 2 * t);
  return [-0.1 - 0.18 * landscape, 0.18 + 0.02 * landscape, 1];
}
/** Reserve room for the existing callout pills without wasting most of a
 * short landscape viewport on the desktop leader-line spacing. */
export function overviewCalloutGutter(
  height: number,
  topInset: number,
  bottomInset: number,
  portrait: boolean,
) {
  return Math.min(
    portrait ? 48 : 72,
    Math.max(42, (height - topInset - bottomInset) * 0.18),
  );
}
export function boundedCameraAngles(
  pointer: readonly [number, number],
  drag: readonly [number, number],
  view: boolean | { pitch: number; yaw: number },
): [number, number] {
  const limits =
    typeof view === 'boolean'
      ? view
        ? CAMERA_RANGES.overview
        : CAMERA_RANGES.room
      : view;
  const angle = (p: number, d: number, ambient: number, limit: number) =>
    Math.max(
      -limit,
      Math.min(limit, response(p) * ambient + response(d) * limit),
    );
  return [
    angle(pointer[1], drag[1], CAMERA_RANGES.hover.pitch, limits.pitch),
    angle(pointer[0], drag[0], CAMERA_RANGES.hover.yaw, limits.yaw),
  ];
}
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v);
  if (!(length > 1e-12) || !Number.isFinite(length))
    throw new RangeError('Expected a finite nonzero direction.');
  return mul(v, 1 / length);
};
const positive = (v: number, name: string) => {
  if (!(v > 0) || !Number.isFinite(v))
    throw new RangeError(`${name} must be finite and positive.`);
  return v;
};
const basis = (view: CameraView) => {
  const back = unit(view.direction),
    right = unit(cross(view.up ?? [0, 1, 0], back));
  return { back, right, up: unit(cross(back, right)) };
};
const slopes = (fovDegrees: number, aspect: number) => {
  if (!(fovDegrees > 0 && fovDegrees < 175))
    throw new RangeError('Perspective FOV must be between 0 and 175 degrees.');
  const y = Math.tan((fovDegrees * Math.PI) / 360);
  return { x: y * positive(aspect, 'Aspect'), y };
};

/** Exact perspective containment distance for the supplied points and fixed view.
 * Unlike max(width,height)+depth/2, each point retains its own camera-space depth. */
export function fitPerspectiveDistance(
  points: readonly Vec3[],
  view: CameraView,
  fovDegrees: number,
  aspect: number,
  bounds: NdcBounds = { left: -1, right: 1, bottom: -1, top: 1 },
  near = 0.5,
) {
  const frame = basis(view),
    slope = slopes(fovDegrees, aspect);
  if (
    !(
      bounds.left < 0 &&
      bounds.right > 0 &&
      bounds.bottom < 0 &&
      bounds.top > 0
    )
  )
    throw new RangeError('Safe NDC bounds must contain the view center.');
  let distance = positive(near, 'Near distance');
  for (const point of points) {
    const p = sub(point, view.target),
      x = dot(p, frame.right),
      y = dot(p, frame.up),
      z = dot(p, frame.back);
    distance = Math.max(
      distance,
      z + near,
      z + x / (slope.x * (x < 0 ? bounds.left : bounds.right)),
      z + y / (slope.y * (y < 0 ? bounds.bottom : bounds.top)),
    );
  }
  return distance;
}

/** Closest fit with a freely centered target in the view plane. This accounts
 * for asymmetric UI insets instead of keeping the bounding-box center fixed. */
export function fitPerspectiveFrame(
  points: readonly Vec3[],
  view: CameraView,
  fovDegrees: number,
  aspect: number,
  bounds: NdcBounds,
) {
  const frame = basis(view),
    slope = slopes(fovDegrees, aspect);
  let left = Infinity,
    right = -Infinity,
    bottom = Infinity,
    top = -Infinity,
    distance = 0.5;
  for (const point of points) {
    const p = sub(point, view.target),
      x = dot(p, frame.right),
      y = dot(p, frame.up),
      z = dot(p, frame.back);
    left = Math.min(left, x + bounds.left * slope.x * z);
    right = Math.max(right, x + bounds.right * slope.x * z);
    bottom = Math.min(bottom, y + bounds.bottom * slope.y * z);
    top = Math.max(top, y + bounds.top * slope.y * z);
    distance = Math.max(distance, z + 0.5);
  }
  distance = Math.max(
    distance,
    (right - left) / (slope.x * (bounds.right - bounds.left)),
    (top - bottom) / (slope.y * (bounds.top - bounds.bottom)),
  );
  const x =
    (right + left - (bounds.right + bounds.left) * slope.x * distance) / 2;
  const y =
    (top + bottom - (bounds.top + bounds.bottom) * slope.y * distance) / 2;
  return {
    distance,
    target: add(view.target, add(mul(frame.right, x), mul(frame.up, y))),
  };
}

/** Largest valid room distance: full viewport fits INSIDE the front opening while
 * required portal/label points remain visible. Each supplied view is solved exactly.
 * Supply rest/cursor-extreme views; use overscan to allow interpolation and skin thickness. */
export function solveApertureFraming(input: {
  aperture: Aperture;
  views: readonly CameraView[];
  requiredPoints?: readonly Vec3[];
  fovDegrees: number;
  aspect: number;
  near?: number;
  overscan?: number;
  portalBounds?: NdcBounds;
}) {
  const { aperture, views, requiredPoints = [], fovDegrees, aspect } = input;
  if (!views.length) throw new RangeError('At least one view is required.');
  const near = positive(input.near ?? 0.5, 'Near distance');
  const overscan = Math.max(1, positive(input.overscan ?? 1.035, 'Overscan'));
  const ar = unit(aperture.right),
    au = unit(aperture.up),
    normal = unit(cross(ar, au));
  if (Math.abs(dot(ar, au)) > 1e-6)
    throw new RangeError('Aperture right/up axes must be perpendicular.');
  const half = [
    positive(aperture.width, 'Aperture width') / (2 * overscan),
    positive(aperture.height, 'Aperture height') / (2 * overscan),
  ];
  const slope = slopes(fovDegrees, aspect);
  let minimum = near,
    maximum = Infinity,
    valid = true;
  // Restrict a + b * distance to [low, high]; all constraints are linear.
  const constrain = (a: number, b: number, low: number, high: number) => {
    if (Math.abs(b) < 1e-12) {
      if (a < low || a > high) valid = false;
      return;
    }
    const one = (low - a) / b,
      two = (high - a) / b;
    minimum = Math.max(minimum, Math.min(one, two));
    maximum = Math.min(maximum, Math.max(one, two));
  };
  for (const view of views) {
    const frame = basis(view),
      centerOffset = sub(aperture.center, view.target);
    const targetOffset = sub(view.target, aperture.center);
    const planeOffset = dot(centerOffset, normal),
      directionNormal = dot(frame.back, normal);
    if (!(directionNormal > 1e-8)) {
      valid = false;
      continue;
    }
    minimum = Math.max(
      minimum,
      fitPerspectiveDistance(
        requiredPoints,
        view,
        fovDegrees,
        aspect,
        input.portalBounds,
        near,
      ),
    );
    for (const x of [-1, 1])
      for (const y of [-1, 1]) {
        // This ray has unit forward depth, so its intersection parameter is view depth.
        const ray = add(
          mul(frame.back, -1),
          add(mul(frame.right, x * slope.x), mul(frame.up, y * slope.y)),
        );
        const denominator = dot(ray, normal);
        if (!(denominator < -1e-8)) {
          valid = false;
          continue;
        }
        const constant = add(targetOffset, mul(ray, planeOffset / denominator));
        const rate = sub(frame.back, mul(ray, directionNormal / denominator));
        constrain(dot(constant, ar), dot(rate, ar), -half[0], half[0]);
        constrain(dot(constant, au), dot(rate, au), -half[1], half[1]);
        constrain(
          planeOffset / denominator,
          -directionNormal / denominator,
          near,
          Infinity,
        );
      }
  }
  const feasible =
    valid && Number.isFinite(maximum) && maximum >= minimum && maximum > 0;
  return {
    feasible,
    minimumDistance: minimum,
    maximumDistance: maximum,
    distance: feasible ? maximum : null,
  };
}

/** One cabin-local fit for every room. Furnishings never change the lens distance. */
export function fitRoomCameraFrame(
  frame: RoomCameraFrame,
  fovDegrees: number,
  aspect: number,
  safe: NdcBounds,
) {
  const views = cursorViewSamples(
    { target: [0, 0, 0], direction: [0, 0, 1] },
    4,
    CAMERA_RANGES.room,
  );
  const solution = solveApertureFraming({
    ...frame,
    views,
    fovDegrees,
    aspect,
    overscan: 1.015,
    portalBounds: safe,
  });
  // Portrait views keep navigation visible even when the front opening cannot
  // cover the entire viewport. The same compromise applies to every cabin.
  const chosenDistance = solution.feasible
    ? solution.minimumDistance +
      (solution.maximumDistance - solution.minimumDistance) * 0.16
    : Math.max(
        ...views.map((view) =>
          fitPerspectiveDistance(
            frame.requiredPoints,
            view,
            fovDegrees,
            aspect,
            safe,
          ),
        ),
      ) + 0.05;
  return { ...solution, chosenDistance };
}

/** Match current Three Euler XYZ cursor response, without accumulating an orbit. */
export function cursorViewSamples(
  view: CameraView,
  steps = 2,
  limits: { pitch: number; yaw: number } = CAMERA_RANGES.hover,
): CameraView[] {
  const divisions = Math.max(1, Math.floor(steps)),
    result: CameraView[] = [];
  for (let iy = 0; iy <= divisions; iy++)
    for (let ix = 0; ix <= divisions; ix++) {
      const pitch = ((iy * 2) / divisions - 1) * limits.pitch,
        yaw = ((ix * 2) / divisions - 1) * limits.yaw;
      const [x, y, z] = view.direction;
      const qx = Math.cos(yaw) * x + Math.sin(yaw) * z,
        qz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
      result.push({
        ...view,
        direction: [
          qx,
          Math.cos(pitch) * y - Math.sin(pitch) * qz,
          Math.sin(pitch) * y + Math.cos(pitch) * qz,
        ],
      });
    }
  return result;
}

const response = (n: number) =>
  Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
export function pointerResponse(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
): [number, number] {
  return [
    response(((x - rect.left) / positive(rect.width, 'Width')) * 2 - 1),
    response(1 - ((y - rect.top) / positive(rect.height, 'Height')) * 2),
  ];
}
export type BoundedDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  startResponse: readonly [number, number];
  width: number;
  height: number;
  targetKey: string;
  threshold: number;
  sensitivity: number;
  maximumExcursion: number;
  dragging: boolean;
  response: readonly [number, number];
};
export function beginBoundedDrag(input: {
  pointerId: number;
  x: number;
  y: number;
  response: readonly [number, number];
  width: number;
  height: number;
  targetKey?: string;
  threshold?: number;
  sensitivity?: number;
}): BoundedDrag {
  const startResponse: [number, number] = [
    response(input.response[0]),
    response(input.response[1]),
  ];
  return {
    pointerId: input.pointerId,
    startX: input.x,
    startY: input.y,
    startResponse,
    width: positive(input.width, 'Width'),
    height: positive(input.height, 'Height'),
    targetKey: input.targetKey ?? '',
    threshold: positive(input.threshold ?? 8, 'Drag threshold'),
    sensitivity: positive(input.sensitivity ?? 2, 'Drag sensitivity'),
    maximumExcursion: 0,
    dragging: false,
    response: startResponse,
  };
}
/** The start response and viewport dimensions are fixed for the gesture. */
export function updateBoundedDrag(
  state: BoundedDrag,
  pointerId: number,
  x: number,
  y: number,
): BoundedDrag {
  if (
    pointerId !== state.pointerId ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  )
    return state;
  const dx = x - state.startX,
    dy = y - state.startY;
  const maximumExcursion = Math.max(state.maximumExcursion, Math.hypot(dx, dy));
  return {
    ...state,
    maximumExcursion,
    dragging: state.dragging || maximumExcursion >= state.threshold,
    response: [
      response(state.startResponse[0] + (dx * state.sensitivity) / state.width),
      response(
        state.startResponse[1] - (dy * state.sensitivity) / state.height,
      ),
    ],
  };
}
export function endBoundedDrag(
  state: BoundedDrag,
  pointerId: number,
  x: number,
  y: number,
  upTargetKey: string,
) {
  const final = updateBoundedDrag(state, pointerId, x, y);
  return {
    state: final,
    activate:
      pointerId === state.pointerId &&
      !final.dragging &&
      !!state.targetKey &&
      state.targetKey === upTargetKey,
  };
}
