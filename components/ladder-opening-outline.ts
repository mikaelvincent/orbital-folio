type ContourPath = {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  bezierCurveTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
  ): unknown;
  closePath(): unknown;
};

export type LadderOpeningDimensions = {
  width: number;
  height: number;
  leftWidth: number;
  leftHeight: number;
  rightRadius: number;
  rightRadiusY?: number;
  rightEdge?: number;
  centerX?: number;
  centerY?: number;
};

/** One counterclockwise ladder aperture shared by the face, seal and lining.
 * Separate horizontal radii preserve the same contour in the wide layout.
 */
export function ladderOpeningOutline<T extends ContourPath>(
  path: T,
  {
    width,
    height,
    leftWidth,
    leftHeight,
    rightRadius,
    rightRadiusY = rightRadius,
    rightEdge = width / 2,
    centerX = 0,
    centerY = 0,
  }: LadderOpeningDimensions,
): T {
  const left = centerX - width / 2;
  const right = centerX + rightEdge;
  const bottom = centerY - height / 2;
  const top = centerY + height / 2;
  const tangent = left + leftWidth;
  if (
    leftWidth <= 0 ||
    leftHeight <= 0 ||
    rightRadius <= 0 ||
    rightRadiusY <= 0 ||
    leftHeight > height / 2 ||
    rightRadiusY > height / 2 ||
    tangent > right - rightRadius + 1e-10
  )
    throw new RangeError('Ladder shoulder arcs must fit without overlapping');

  // Cubic quarter-ellipses meet the straight walls tangentially. Both ends
  // are exact reflections, including the formerly square right-hand corners.
  const k = 0.5522847498307936;
  path.moveTo(tangent, bottom);
  path.lineTo(right - rightRadius, bottom);
  path.bezierCurveTo(
    right - rightRadius * (1 - k),
    bottom,
    right,
    bottom + rightRadiusY * (1 - k),
    right,
    bottom + rightRadiusY,
  );
  path.lineTo(right, top - rightRadiusY);
  path.bezierCurveTo(
    right,
    top - rightRadiusY * (1 - k),
    right - rightRadius * (1 - k),
    top,
    right - rightRadius,
    top,
  );
  path.lineTo(tangent, top);
  path.bezierCurveTo(
    tangent - leftWidth * k,
    top,
    left,
    top - leftHeight * (1 - k),
    left,
    top - leftHeight,
  );
  path.lineTo(left, bottom + leftHeight);
  path.bezierCurveTo(
    left,
    bottom + leftHeight * (1 - k),
    tangent - leftWidth * k,
    bottom,
    tangent,
    bottom,
  );
  path.closePath();
  return path;
}
