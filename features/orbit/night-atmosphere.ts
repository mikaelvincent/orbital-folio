import type * as Three from 'three';

/** Cinematic cyan light at the limb, fading through cobalt into deep space.
 * The entire atmospheric glow uses one shell, with no separate bloom pass.
 */
export function createNightAtmosphere(
  THREE: typeof Three,
  geometry: Three.SphereGeometry,
) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vCenter;
      varying vec3 vLightDirection;
      void main() {
        // The authored light stays fixed in the orbital world as the viewer turns.
        // A direction uses w=0 so camera translation cannot move the source.
        vLightDirection = (viewMatrix * vec4(-0.6, 0.7, 0.3, 0.0)).xyz;
        vec4 positionInView = modelViewMatrix * vec4(position, 1.0);
        vPosition = positionInView.xyz;
        vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * positionInView;
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      varying vec3 vCenter;
      varying vec3 vLightDirection;
      void main() {
        vec3 ray = normalize(vPosition);
        vec3 tangent = ray * dot(vCenter, ray) - vCenter;
        // Ray distance, rather than interpolated vertex normals, gives a smooth
        // continuous arc at every viewport size and globe orientation.
        float tangentDistance = length(tangent);
        float altitude = tangentDistance - 180.0;
        float footprint = max(fwidth(altitude), 0.025);
        float rimWidth = max(0.48, footprint * 0.85);
        float rim = exp(-pow((altitude - 0.04) / rimWidth, 2.0));
        float halo = exp(-max(altitude, 0.0) / 1.22)
                   * exp(min(altitude, 0.0) / 0.36);
        float illumination = smoothstep(-0.35, 0.8,
          dot(tangent / max(tangentDistance, 0.0001), normalize(vLightDirection)));
        // Spread a quieter blue crest into the outer cobalt shoulder. The
        // shorter inward falloff leaves the photographic city lights clear;
        // the existing shell extent and world-fixed illumination stay intact.
        vec3 haloColor = mix(vec3(0.001, 0.024, 0.205), vec3(0.007, 0.004, 0.070),
          smoothstep(0.5, 2.8, altitude));
        vec3 light = vec3(0.006, 0.122, 0.38) * rim * mix(0.28, 0.74, illumination)
                   + haloColor * halo * mix(0.40, 0.85, illumination);
        float edge = 1.0 - smoothstep(3.0, 3.65, altitude);
        gl_FragColor = vec4(light * edge, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const shell = new THREE.Mesh(geometry, material);
  shell.name = 'night-earth-atmosphere';
  shell.scale.setScalar(184);
  shell.renderOrder = 3;
  return shell;
}
