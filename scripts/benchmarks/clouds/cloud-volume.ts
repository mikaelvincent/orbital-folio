import type * as Three from 'three';

export const CLOUD_TOP_RADIUS = 180.58;
export const CLOUD_BOTTOM_RADIUS = 180.045;
export const CLOUD_STEPS = 12;
export const CLOUD_FIELD_WIDTH = 2048;
export const CLOUD_FIELD_HEIGHT = 1024;
export const CLOUD_ASSET = '/textures/cloud-satellite-v2.cfd.gz';

/** One bounded volume pass: a baked weather/height atlas, view-dependent extinction and lighting. */
export function createCloudVolume(THREE: typeof Three, texture: Three.Texture) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      cloudField: { value: texture },
      cameraLocal: { value: new THREE.Vector3() },
      sunLocal: { value: new THREE.Vector3() },
      readyOpacity: { value: 0 },
    },
    vertexShader: `
      out vec3 vLocal;
      void main() {
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      in vec3 vLocal;
      uniform sampler2D cloudField;
      uniform vec3 cameraLocal;
      uniform vec3 sunLocal;
      uniform float readyOpacity;
      out vec4 outColor;
      const float PI = 3.141592653589793;
      const float base = ${CLOUD_BOTTOM_RADIUS / CLOUD_TOP_RADIUS};
      const float depth = 1.0 - base;
      const float sampleEdges[${CLOUD_STEPS + 1}] = float[${CLOUD_STEPS + 1}](
        ${Array.from({ length: CLOUD_STEPS + 1 }, (_, i) => Math.pow(i / CLOUD_STEPS, 0.65).toFixed(8)).join(',')}
      );
      vec2 sphereUv(vec3 n) { return vec2(atan(n.z,n.x)/(2.0*PI)+0.5, asin(clamp(n.y,-1.0,1.0))/PI+0.5); }
      void main() {
        vec3 entry=normalize(vLocal);
        vec3 ray=normalize(vLocal-cameraLocal);
        float b=dot(entry,ray);
        float hit=b*b-(1.0-base*base);
        float path=hit>0.0 ? -b-sqrt(hit) : -2.0*b;
        path=max(0.0,path);
        // Stable screen footprints, evaluated outside the march. Longitude derivatives
        // wrap at the seam so mip selection cannot erase a strip of clouds.
        vec2 uv=sphereUv(entry);
        vec2 dx=dFdx(uv),dy=dFdy(uv);
        dx.x-=floor(dx.x+0.5); dy.x-=floor(dy.x+0.5);
        // Cloud coverage and smooth relief are supplied by the atlas. No tiled
        // procedural surface noise: thin veils stay soft instead of looking embossed.
        vec3 sum=vec3(0.0);
        float transmittance=1.0;
        for(int i=0;i<${CLOUD_STEPS};i++) {
          // Allocate more of the same bounded samples to the thin lower layers.
          // Each interval keeps its true length, preserving integrated opacity.
          float t0=sampleEdges[i];
          float t1=sampleEdges[i+1];
          float stepLength=path*(t1-t0);
          vec3 p=entry+ray*(t0+t1)*0.5*path;
          float radius=length(p);
          vec3 n=p/radius;
          vec4 weather=textureGrad(cloudField,sphereUv(n),dx,dy);
          float altitude=(radius-base)/depth;
          float top=weather.g*(1.0+0.2*smoothstep(0.22,0.6,weather.r));
          float body=smoothstep(0.0,0.035,altitude)*(1.0-smoothstep(top-0.055,top+0.055,altitude));
          float density=weather.r*body;
          float extinction=1.85+0.8*smoothstep(0.12,0.6,weather.r);
          float a=1.0-exp(-density*stepLength/depth*extinction);
          vec3 east=normalize(vec3(-n.z,0.0,n.x));
          vec3 north=cross(n,east);
          vec2 slope=(weather.ba*2.0-1.0)*0.85;
          vec3 normal=normalize(n-east*slope.x-north*slope.y);
          float daylight=smoothstep(-0.13,0.5,dot(n,sunLocal));
          float direct=max(0.0,dot(normal,sunLocal));
          // Restrained self-shading suggests depth without turning small cloud
          // clusters into dark, rough terrain at the low orbital viewing angle.
          float burial=max(0.0,top-altitude);
          float lit=(0.68+0.32*sqrt(direct))*exp(-burial*weather.r*1.05);
          vec3 color=mix(vec3(0.24,0.34,0.49),vec3(0.97,0.985,1.0),daylight)*(0.38+0.62*lit);
          sum+=transmittance*a*color;
          transmittance*=1.0-a;
        }
        float alpha=(1.0-transmittance)*readyOpacity;
        if(alpha<0.001) discard;
        outColor=vec4(sum/max(1.0-transmittance,0.00001),alpha);
      }
    `,
  });
}

export function createCloudTexture(
  THREE: typeof Three,
  data: Uint8Array,
  width: number,
  height: number,
) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  return texture;
}
