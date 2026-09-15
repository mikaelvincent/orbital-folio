import { PASSAGE_GUIDE_WIDTH } from '../geometry/spacecraft-wall-layout.ts';

/**
 * Six rigid curved leaves recessed into a circular opening in a continuous wall.
 * Local XY is the wall plane; Z=0 is the center of the wall and shutter stock.
 * One mechanism, full-depth graphite guide and indicators visible from both sides.
 */
export type IrisHatchOptions = {
  radius?: number;
  guideDepth?: number;
  bladeMaterial: any;
  rimMaterial: any;
  accentMaterial: any;
};

export function buildIrisHatch(THREE: any, options: IrisHatchOptions) {
  const radius = options.radius ?? 0.92;
  if (!Number.isFinite(radius) || radius <= 0)
    throw new RangeError('Iris aperture radius must be positive.');

  const group = new THREE.Group();
  group.name = 'integrated-iris-hatch';
  // Moving meshes must never enter the spacecraft static-geometry compiler.
  group.userData.animated = true;
  group.userData.irisApertureRadius = radius;
  group.userData.openProgress = 0;
  const worldToHatch = new THREE.Matrix4();
  const clipRadius = radius + 0.003;
  const motion = {
    travel: { value: -0.006 * radius },
    twist: { value: 0 },
    curve: { value: 0.34 / radius },
    radius: { value: radius },
  };

  // This hard aperture mask is the surrounding wall's occlusion, not a fade or
  // a change in blade shape. It keeps concealed storage motion inside the wall
  // even where a neighboring cabin/cutaway removes the back of that wall.
  const apertureMaterial = (source: any) => {
    const material = source.clone();
    material.alphaToCoverage = true;
    const sourceCompile = source.onBeforeCompile;
    const sourceKey = source.customProgramCacheKey?.bind(source);
    material.userData = { ...source.userData, irisApertureMasked: true };
    material.onBeforeCompile = (shader: any, renderer: any) => {
      sourceCompile?.call(material, shader, renderer);
      shader.uniforms.irisWorldToLocal = { value: worldToHatch };
      shader.uniforms.irisApertureRadius = { value: clipRadius };
      shader.uniforms.irisOpenTravel = motion.travel;
      shader.uniforms.irisOpenTwist = motion.twist;
      shader.uniforms.irisCurveFactor = motion.curve;
      shader.uniforms.irisNominalRadius = motion.radius;
      shader.vertexShader =
        'uniform mat4 irisWorldToLocal;\nvarying vec3 vIrisLocal;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          'vIrisLocal = (irisWorldToLocal * modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>',
        );
      shader.fragmentShader =
        `uniform float irisApertureRadius;
         uniform float irisOpenTravel;
         uniform float irisOpenTwist;
         uniform float irisCurveFactor;
         uniform float irisNominalRadius;
         uniform mat4 irisWorldToLocal;
         varying vec3 vIrisLocal;\n` +
        shader.fragmentShader
          .replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
          vec2 vIrisAperture = vIrisLocal.xy;
          // Signed distances retain opaque metal while MSAA covers subpixel
          // cutting edges instead of producing hard discarded stair steps.
          float irisOpeningDistance = -1e6;
          for (int irisIndex = 0; irisIndex < 6; irisIndex++) {
            float irisAngle = float(irisIndex) * 1.0471975512 + irisOpenTwist;
            vec2 irisNormal = vec2(cos(irisAngle), sin(irisAngle));
            float irisX = dot(vIrisAperture, irisNormal);
            float irisY = dot(vIrisAperture, vec2(-irisNormal.y, irisNormal.x));
            float irisEdge = (irisX + irisCurveFactor * irisY * irisY - irisOpenTravel) /
              sqrt(1.0 + 4.0 * irisCurveFactor * irisCurveFactor * irisY * irisY);
            irisOpeningDistance = max(irisOpeningDistance, irisEdge);
          }
          float irisEdgeAA = max(fwidth(irisOpeningDistance), 0.00001);
          float irisOuterDistance = irisApertureRadius - length(vIrisAperture);
          float irisOuterAA = max(fwidth(irisOuterDistance), 0.00001);
          float irisInnerCoverage = irisOpenTravel <= 0.0 ? 1.0 :
            smoothstep(-0.5 * irisEdgeAA, 0.5 * irisEdgeAA, irisOpeningDistance);
          float irisCoverage = irisInnerCoverage *
            smoothstep(-0.5 * irisOuterAA, 0.5 * irisOuterAA, irisOuterDistance);
          if (irisCoverage <= 0.001) discard;`,
          )
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
          diffuseColor.a *= irisCoverage;
          // Project all overlapping stock onto one seam datum. Otherwise the
          // same marking jumps sideways at each leaf overlap at oblique angles.
          vec3 irisEye = (irisWorldToLocal * vec4(cameraPosition, 1.0)).xyz;
          vec3 irisRay = vIrisLocal - irisEye;
          float irisRayDepth = irisRay.z < 0.0 ? min(irisRay.z, -0.00001) : max(irisRay.z, 0.00001);
          vec2 irisSeamPoint = vIrisLocal.xy - irisRay.xy * vIrisLocal.z / irisRayDepth;
          float irisR2 = max(dot(irisSeamPoint, irisSeamPoint), 0.00000001);
          float irisRadial = sqrt(irisR2);
          float irisT = clamp(irisRadial / irisNominalRadius, 0.0, 1.0);
          float irisSpiral = 1.12 * (1.0 - irisT) * (1.0 - irisT * 0.2);
          float irisPhase = atan(irisSeamPoint.y, irisSeamPoint.x) - irisOpenTwist - irisSpiral;
          // Analytic phase derivatives avoid the atan wrap and abs/fract cusps.
          float irisSpiralDerivative = irisRadial < irisNominalRadius ?
            1.12 * (-1.2 + 0.4 * irisT) / irisNominalRadius : 0.0;
          vec2 irisPhaseGradient = vec2(-irisSeamPoint.y, irisSeamPoint.x) / irisR2 -
            irisSpiralDerivative * irisSeamPoint / irisRadial;
          float irisSeamAA = max(abs(dot(irisPhaseGradient, dFdx(irisSeamPoint))) +
            abs(dot(irisPhaseGradient, dFdy(irisSeamPoint))), 0.00001);
          float irisSeamDistance = abs(fract(irisPhase / 1.0471975512 + 0.5) - 0.5) * 1.0471975512;
          float irisSeamWidth = irisNominalRadius * 0.0028;
          float irisHalfAngle = irisSeamWidth / irisRadial;
          float irisSeam = (clamp((irisHalfAngle + 0.5 * irisSeamAA - irisSeamDistance) / irisSeamAA, 0.0, 1.0) -
            clamp((-irisHalfAngle + 0.5 * irisSeamAA - irisSeamDistance) / irisSeamAA, 0.0, 1.0)) *
            smoothstep(irisNominalRadius * 0.002, irisNominalRadius * 0.015, irisRadial);
          diffuseColor.rgb *= 1.0 - irisSeam * 0.48;`,
          );
    };
    material.customProgramCacheKey = () =>
      `${sourceKey?.() ?? ''}|centered-iris-coverage-v3`;
    return material;
  };
  const bladeMaterial = apertureMaterial(options.bladeMaterial);
  const syncMask = () => worldToHatch.copy(group.matrixWorld).invert();

  const outerRadius = radius + PASSAGE_GUIDE_WIDTH;
  const guideDepth = options.guideDepth ?? 0.174;
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const ringGeometry = new THREE.ExtrudeGeometry(ringShape, {
    depth: guideDepth,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 96,
  });
  ringGeometry.translate(0, 0, -guideDepth / 2);
  const rim = new THREE.Mesh(ringGeometry, options.rimMaterial);
  rim.name = 'recessed-iris-guide';
  rim.castShadow = false;
  rim.receiveShadow = true;
  group.add(rim);

  // Four recessed, segmented status lenses at each mouth of the single guide.
  // The dark perimeter never changes paint color on hover.
  const indicatorMaterial = options.accentMaterial.clone();
  indicatorMaterial.name = 'iris-recessed-amber-indicator';
  indicatorMaterial.roughness = 0.4;
  indicatorMaterial.metalness = 0;
  const amber = new THREE.Color(0xffb345);
  const indicators: any[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const center = Math.PI / 4 + (i * Math.PI) / 2;
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(
          radius + 0.024,
          radius + 0.038,
          48,
          1,
          center - Math.PI / 9,
          (2 * Math.PI) / 9,
        ),
        indicatorMaterial,
      );
      arc.name = `iris-status-lens-${side > 0 ? 'front' : 'back'}-${i}`;
      arc.position.z = side * (guideDepth / 2 + 0.0008);
      if (side < 0) arc.rotation.y = Math.PI;
      arc.castShadow = false;
      group.add(arc);
      indicators.push(arc);
    }
  }
  const setHighlight = (strength: number) => {
    const p = Math.max(0, Math.min(1, strength));
    indicatorMaterial.color.copy(amber).multiplyScalar(0.34 + p * 0.66);
    indicatorMaterial.emissive.copy(amber);
    indicatorMaterial.emissiveIntensity = 0.07 + p * 1.6;
    group.userData.highlight = p;
  };
  setHighlight(0);

  const bladeCount = 6;
  // Broad overlapping shutter leaves, not six wedges. A leaf's cutting edge
  // is x = -k*y²; all metal to its right remains solid. Translating six copies
  // radially gives a single convex central aperture throughout the full motion.
  // The outer wings live behind the surrounding wall and cannot become exposed.
  const bladeShape = new THREE.Shape();
  const reach = radius * 1.3;
  const outerX = radius * 1.35;
  const k = 0.34 / radius;
  bladeShape.moveTo(-k * reach * reach, -reach);
  bladeShape.lineTo(outerX, -reach);
  bladeShape.lineTo(outerX, reach);
  bladeShape.lineTo(-k * reach * reach, reach);
  for (let i = 1; i <= 128; i++) {
    const y = reach - (i / 128) * reach * 2;
    bladeShape.lineTo(-k * y * y, y);
  }
  bladeShape.closePath();
  // Thin shutter stock avoids the oblique parallax of thick stacked panels.
  // This is still closed solid geometry, with a front, back and cutting edge.
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.00035,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 64,
  });
  bladeGeometry.translate(0, 0, -0.000175);

  const blades: any[] = [];
  const leaves: any[] = [];
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Group();
    blade.name = `iris-blade-${i + 1}`;
    blade.userData.animated = true;
    blade.userData.irisBladeIndex = i;
    blade.rotation.z = (i / bladeCount) * Math.PI * 2;
    blade.position.z = (2.5 - i) * 0.0006;
    const leaf = new THREE.Mesh(bladeGeometry, bladeMaterial);
    leaf.name = 'iris-rigid-leaf';
    leaf.castShadow = false;
    leaf.receiveShadow = true;
    leaf.onBeforeRender = syncMask;
    blade.add(leaf);
    group.add(blade);
    blades.push(blade);
    leaves.push(leaf);
  }

  // GTAO replaces materials, so it cannot use the blade aperture shader. A
  // bounded, depth-only silhouette keeps nearby fittings from ghosting through
  // closed shutters without including the concealed blade storage wings.
  const occlusionSegments = 192;
  const occlusionGeometry = new THREE.RingGeometry(
    0,
    radius,
    occlusionSegments,
  );
  // GTAO replaces materials with a FrontSide normal material. Give the proxy
  // real reverse-wound back triangles and normals instead of relying on the
  // material's DoubleSide flag, which that override would discard.
  const occlusionFrontCount = occlusionGeometry.getAttribute('position').count;
  for (const name of Object.keys(occlusionGeometry.attributes)) {
    const attribute = occlusionGeometry.getAttribute(name);
    const data = new Float32Array(attribute.array.length * 2);
    data.set(attribute.array);
    for (let i = 0; i < attribute.array.length; i++)
      data[attribute.array.length + i] =
        attribute.array[i] * (name === 'normal' ? -1 : 1);
    occlusionGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(data, attribute.itemSize),
    );
  }
  const frontIndices = Array.from(occlusionGeometry.index.array) as number[];
  const bothIndices = [...frontIndices];
  for (let i = 0; i < frontIndices.length; i += 3)
    bothIndices.push(
      frontIndices[i + 2] + occlusionFrontCount,
      frontIndices[i + 1] + occlusionFrontCount,
      frontIndices[i] + occlusionFrontCount,
    );
  occlusionGeometry.setIndex(bothIndices);
  const occlusion = new THREE.Mesh(
    occlusionGeometry,
    new THREE.MeshStandardMaterial(),
  );
  occlusion.name = 'iris-occlusion-silhouette';
  occlusion.visible = false;
  occlusion.castShadow = false;
  group.add(occlusion);
  const occlusionPositions = occlusionGeometry.getAttribute('position');
  let occlusionProgress = -1;
  const updateOcclusion = (p: number, travel: number, twist: number) => {
    if (p === occlusionProgress) return;
    occlusionProgress = p;
    for (let j = 0; j <= occlusionSegments; j++) {
      const angle = (j / occlusionSegments) * Math.PI * 2;
      let innerRadius = 0;
      if (travel > 0) {
        innerRadius = radius;
        for (let i = 0; i < 6; i++) {
          const relative = angle - (i * Math.PI) / 3 - twist;
          const a = k * Math.sin(relative) ** 2;
          const b = Math.cos(relative);
          const crossing =
            a > 1e-10
              ? (-b + Math.sqrt(b * b + 4 * a * travel)) / (2 * a)
              : b > 0
                ? travel / b
                : Infinity;
          innerRadius = Math.min(innerRadius, crossing);
        }
      }
      occlusionPositions.setXYZ(
        j,
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        0,
      );
      occlusionPositions.setXYZ(
        j + occlusionFrontCount,
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        0,
      );
    }
    occlusionPositions.needsUpdate = true;
    occlusionGeometry.computeBoundingSphere();
  };
  group.userData.setOcclusionPass = (enabled: boolean) => {
    for (const child of group.children)
      child.visible =
        child === rim || (child === occlusion ? enabled : !enabled);
  };

  const setOpen = (progress: number) => {
    const p = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;
    // Caller owns timing/easing. This function only maps progress to rigid motion.
    const travel = radius * (-0.006 + p * 1.061);
    const twist = -0.58 * p;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2 + twist;
      const blade = blades[i];
      blade.position.x = Math.cos(angle) * travel;
      blade.position.y = Math.sin(angle) * travel;
      blade.rotation.z = angle;
    }
    updateOcclusion(p, travel, twist);
    motion.travel.value = travel;
    motion.twist.value = twist;
    group.userData.openProgress = p;
    group.updateMatrixWorld(true);
  };
  setOpen(0);
  return {
    group,
    blades,
    leaves,
    rim,
    indicators,
    setHighlight,
    setOpen,
    apertureRadius: radius,
    outerRadius,
    materials: [bladeMaterial, indicatorMaterial],
  };
}
