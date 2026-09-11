/**
 * Six rigid curved leaves recessed into a circular opening in a continuous wall.
 * Local XY is the wall plane; +Z faces the room. The caller supplies the wall.
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
        'uniform mat4 irisWorldToLocal;\nvarying vec2 vIrisAperture;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          'vIrisAperture = (irisWorldToLocal * modelMatrix * vec4(transformed, 1.0)).xy;\n#include <project_vertex>',
        );
      shader.fragmentShader =
        `uniform float irisApertureRadius;
         uniform float irisOpenTravel;
         uniform float irisOpenTwist;
         uniform float irisCurveFactor;
         uniform float irisNominalRadius;
         varying vec2 vIrisAperture;\n` +
        shader.fragmentShader
          .replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
          if (dot(vIrisAperture, vIrisAperture) > irisApertureRadius * irisApertureRadius) discard;
          // The intersection of these six convex inequalities is one central
          // opening. Hard clipping just removes tessellation slivers along the
          // actual curved cutting edges of the rigid overlapping metal leaves.
          bool insideIrisOpening = true;
          for (int irisIndex = 0; irisIndex < 6; irisIndex++) {
            float irisAngle = float(irisIndex) * 1.0471975512 + irisOpenTwist;
            vec2 irisNormal = vec2(cos(irisAngle), sin(irisAngle));
            float irisX = dot(vIrisAperture, irisNormal);
            float irisY = dot(vIrisAperture, vec2(-irisNormal.y, irisNormal.x));
            if (irisX + irisCurveFactor * irisY * irisY >= irisOpenTravel) insideIrisOpening = false;
          }
          if (insideIrisOpening) discard;`,
          )
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
          // Six flush inset seam markings stay legible without stacking raised
          // outlines at different depths. They stop exactly at the open edge.
          float irisRadial = length(vIrisAperture);
          float irisT = clamp(irisRadial / irisNominalRadius, 0.0, 1.0);
          float irisSpiral = 1.12 * (1.0 - irisT) * (1.0 - irisT * 0.2);
          float irisPhase = (atan(vIrisAperture.y, vIrisAperture.x) - irisOpenTwist - irisSpiral) / 1.0471975512;
          float irisSeamDistance = abs(fract(irisPhase + 0.5) - 0.5) * 1.0471975512 * irisRadial;
          float irisSeamWidth = irisNominalRadius * 0.0028;
          float irisSeamAA = max(fwidth(irisSeamDistance), irisNominalRadius * 0.0002);
          float irisSeam = (1.0 - smoothstep(irisSeamWidth, irisSeamWidth + irisSeamAA, irisSeamDistance)) * smoothstep(irisNominalRadius * 0.002, irisNominalRadius * 0.015, irisRadial);
          diffuseColor.rgb *= 1.0 - irisSeam * 0.58;`,
          );
    };
    material.customProgramCacheKey = () =>
      `${sourceKey?.() ?? ''}|integrated-iris-aperture-v2`;
    return material;
  };
  const bladeMaterial = apertureMaterial(options.bladeMaterial);
  const syncMask = () => worldToHatch.copy(group.matrixWorld).invert();

  const outerRadius = radius + 0.055;
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const ringGeometry = new THREE.ExtrudeGeometry(ringShape, {
    depth: options.guideDepth ?? 0.076,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 96,
  });
  ringGeometry.translate(0, 0, -(options.guideDepth ?? 0.076) - 0.002);
  const rim = new THREE.Mesh(ringGeometry, options.rimMaterial);
  rim.name = 'recessed-iris-guide';
  rim.castShadow = false;
  rim.receiveShadow = true;
  group.add(rim);

  const indexGeometry = new THREE.BoxGeometry(0.022, 0.05, 0.0015);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5;
    const mark = new THREE.Mesh(indexGeometry, options.accentMaterial);
    mark.name = 'iris-alignment-index';
    mark.position.set(
      Math.sin(angle) * (radius + 0.028),
      Math.cos(angle) * (radius + 0.028),
      -0.0007,
    );
    mark.rotation.z = -angle;
    mark.castShadow = false;
    group.add(mark);
  }

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
  bladeGeometry.translate(0, 0, -0.00035);

  const blades: any[] = [];
  const leaves: any[] = [];
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Group();
    blade.name = `iris-blade-${i + 1}`;
    blade.userData.animated = true;
    blade.userData.irisBladeIndex = i;
    blade.rotation.z = (i / bladeCount) * Math.PI * 2;
    blade.position.z = -0.012 - i * 0.0006;
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
  occlusionGeometry.translate(0, 0, -0.012);
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
        -0.012,
      );
    }
    occlusionPositions.needsUpdate = true;
    occlusionGeometry.computeBoundingSphere();
  };
  group.userData.setOcclusionPass = (enabled: boolean) => {
    for (const child of group.children)
      child.visible = child === occlusion ? enabled : !enabled;
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
    setOpen,
    apertureRadius: radius,
    outerRadius,
    materials: [bladeMaterial],
  };
}
