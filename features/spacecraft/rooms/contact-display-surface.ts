/** A seated display with one continuous gasket. Concentric circular corners keep
 * the dark border the same width along straight edges and around the corners. */
export function createContactDisplaySurface(
  THREE: any,
  width: number,
  height: number,
) {
  const radius = 0.035;
  const overlap = 0.002;
  const border = 0.014;
  const rounded = (w: number, h: number, r: number) => {
    const shape = new THREE.Shape();
    const x = w / 2 - r,
      y = h / 2 - r;
    shape.moveTo(-x, -h / 2);
    shape.lineTo(x, -h / 2);
    shape.absarc(x, -y, r, -Math.PI / 2, 0, false);
    shape.lineTo(w / 2, y);
    shape.absarc(x, y, r, 0, Math.PI / 2, false);
    shape.lineTo(-x, h / 2);
    shape.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w / 2, -y);
    shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
    shape.closePath();
    return shape;
  };
  const frameOutline = rounded(
    width + 2 * border,
    height + 2 * border,
    radius + border,
  );
  const aperture = rounded(
    width - 2 * overlap,
    height - 2 * overlap,
    radius - overlap,
  );
  frameOutline.holes.push(new THREE.Path(aperture.getPoints(10).reverse()));
  const frame = new THREE.ExtrudeGeometry(frameOutline, {
    depth: 0.026,
    steps: 1,
    curveSegments: 10,
    bevelEnabled: false,
  });
  frame.translate(0, 0, 0.089);
  const glass = new THREE.ShapeGeometry(rounded(width, height, radius), 10);
  const positions = glass.attributes.position,
    uv = glass.attributes.uv;
  for (let i = 0; i < positions.count; i++)
    uv.setXY(
      i,
      positions.getX(i) / width + 0.5,
      positions.getY(i) / height + 0.5,
    );
  return { frame, glass, glassZ: 0.111, interfaceZ: 0.116 };
}
