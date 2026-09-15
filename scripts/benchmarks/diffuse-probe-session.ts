/** Developer-only, prefiltered environment irradiance probe. No scene bounce bake. */
import type { SceneShadingContext } from '../../features/diagnostics/scene-audit';
import type { ShadingSession } from './shading-comparison-lab';

type Variant = 'A' | 'B' | 'C';
const SAMPLES = 4096;
const BASIS = 'polynomial-sh2';
const probeBasis = `uniform vec3 diffuseProbe[9];
vec3 sampleDiffuseProbe(vec3 d) {
  float x=d.x,y=d.y,z=d.z;
  return max(vec3(0.0), diffuseProbe[0]+diffuseProbe[1]*x+diffuseProbe[2]*y+diffuseProbe[3]*z
    +diffuseProbe[4]*(x*y)+diffuseProbe[5]*(y*z)+diffuseProbe[6]*(3.0*z*z-1.0)
    +diffuseProbe[7]*(x*z)+diffuseProbe[8]*(x*x-y*y));
}`;
const probePars=probeBasis+`
vec3 getBakedIBLIrradiance(vec3 n) {
  vec3 worldNormal=transformNormalByInverseViewMatrix(n,viewMatrix);
  return PI*sampleDiffuseProbe(envMapRotation*worldNormal)*envMapIntensity;
}`;

function replaceRequired(source: string, marker: string, replacement: string) {
  if (source.split(marker).length !== 2) throw new Error(`Unsupported Three shader: expected one ${marker}`);
  return source.replace(marker, replacement);
}

export function createDiffuseProbeSession(context: SceneShadingContext): ShadingSession {
  const { three: T, renderer, scene, model } = context;
  let requested: Variant = 'A', effective: Variant = 'A', installed = false;
  let captureStats: any = {}, fitStats: any = {};
  const uniforms = { diffuseProbe: { value: Array.from({ length: 9 }, () => new T.Vector3()) } };
  const replacements: { mesh: any; original: any; B: any; C: any }[] = [];
  const excluded: Record<string, number> = {};
  const materialVariants=new Map<any,{B:any;C:any}>();
  let validationDirections=new Float32Array(),validationReference=new Float32Array(),validationPredictions=new Float32Array();
  let validationStats:any={};
  let sourceEnvironment: any;
  const chain = (object: any, predicate: (o: any) => boolean) => {
    for (let p=object;p;p=p.parent) if (predicate(p)) return true;
    return false;
  };
  function collect() {
    const skip = (reason: string) => { excluded[reason]=(excluded[reason]||0)+1; };
    model.group.traverse((mesh: any) => {
      if (!mesh.isMesh || !chain(mesh, (p) => p.userData.section === 'projects') || !mesh.visible) return;
      const m=mesh.material;
      if (chain(mesh,(p)=>p.userData.animated||p.userData.irisHatch||p.userData.openReader||p.userData.isInteractionProxy)) return skip('moving-or-proxy');
      if (Array.isArray(m)||!m.isMeshStandardMaterial||m.isMeshPhysicalMaterial||m.transparent||m.opacity<1||m.envMap||m.lightMap) return skip('unsupported-material');
      if ((m.userData.baseIntensity>0&&m.userData.baseEmissive?.getHex()>0)||m.map||m.emissiveMap||m.userData.displaySize||m.userData.archiveInk||m.userData.studyInk||m.userData.cabinHeaderInk||m.userData.luminous||/diffuser|light|glow|signal|screen|display|painted-navigation-symbol/.test(m.name)) return skip('printed-display-or-emitted-light');
      const normals=mesh.geometry.attributes.normal;
      if(!normals) return skip('missing-or-invalid-normals');
      for(let i=0;i<normals.count;i++) {
        const length=normals.getX(i)**2+normals.getY(i)**2+normals.getZ(i)**2;
        if(!Number.isFinite(length)||length<1e-20)return skip('missing-or-invalid-normals');
      }
      const variants: any = materialVariants.get(m) ?? {};
      if (!materialVariants.has(m)) for (const variant of ['B','C'] as const) {
        const material=m.clone(); material.color=m.color; material.emissive=m.emissive;
        material.onBeforeCompile=(shader: any, glRenderer: any)=>{
          m.onBeforeCompile.call(m,shader,glRenderer);
          Object.assign(shader.uniforms,uniforms);
          const envChunk=T.ShaderChunk.envmap_physical_pars_fragment;
          // Shared input B changes diffuse and multiscattering energy. C keeps
          // the original lookup for specular and changes only its diffuse term.
          shader.fragmentShader=replaceRequired(shader.fragmentShader,'#include <envmap_physical_pars_fragment>',envChunk+'\n'+probePars);
          if (variant==='B') {
            shader.fragmentShader=replaceRequired(shader.fragmentShader,'#include <lights_fragment_maps>',
              replaceRequired(T.ShaderChunk.lights_fragment_maps,'getIBLIrradiance( geometryNormal )','getBakedIBLIrradiance( geometryNormal )'));
          } else {
            shader.fragmentShader=replaceRequired(shader.fragmentShader,'#include <lights_physical_pars_fragment>',
              replaceRequired(T.ShaderChunk.lights_physical_pars_fragment,'vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;',
                'vec3 indirectDiffuse = diffuse * getBakedIBLIrradiance(geometryNormal) * RECIPROCAL_PI;'));
          }
        };
        material.customProgramCacheKey=()=>m.customProgramCacheKey()+'|diffuse-probe-sh2-'+variant;
        variants[variant]=material;
      }
      materialVariants.set(m,variants);
      replacements.push({mesh,original:m,B:variants.B,C:variants.C});
    });
    if (!replacements.length) throw new Error('No eligible Projects materials for the irradiance probe.');
  }
  function directionsAt(offset: number) {
    const directions=new Float32Array(SAMPLES*4);
    for (let i=0;i<SAMPLES;i++) {
      const z=1-2*(i+.5)/SAMPLES, phi=i*Math.PI*(3-Math.sqrt(5))+offset, radius=Math.sqrt(1-z*z);
      directions.set([radius*Math.cos(phi),radius*Math.sin(phi),z,1],i*4);
    }
    return directions;
  }
  function sampleDirections(directions:Float32Array, probe=false) {
    const start=performance.now(), gl=renderer.getContext(),env=sourceEnvironment;
    const directionsTexture=new T.DataTexture(directions,64,64,T.RGBAFormat,T.FloatType);
    directionsTexture.needsUpdate=true;
    const target=new T.WebGLRenderTarget(64,64,{type:T.FloatType,format:T.RGBAFormat,depthBuffer:false,stencilBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
    const mip=Math.log2(env.image.height/4);
    const material=new T.ShaderMaterial({
      uniforms:{envMap:{value:env},directions:{value:directionsTexture},...uniforms},
      defines:{ENVMAP_TYPE_CUBE_UV:'',CUBEUV_MAX_MIP:mip.toFixed(1),CUBEUV_TEXEL_WIDTH:(1/env.image.width).toPrecision(17),CUBEUV_TEXEL_HEIGHT:(1/env.image.height).toPrecision(17)},
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`uniform sampler2D envMap,directions;\n#include <common>\n#include <cube_uv_reflection_fragment>\n${probe?probeBasis:''}\nvoid main(){vec3 d=texelFetch(directions,ivec2(gl_FragCoord.xy),0).xyz;gl_FragColor=vec4(${probe?'sampleDiffuseProbe(d)':'textureCubeUV(envMap,d,1.0).rgb'},1.0);}`,
      depthTest:false,depthWrite:false,toneMapped:false,
    });
    const geometry=new T.PlaneGeometry(2,2), sampleScene=new T.Scene();
    sampleScene.add(new T.Mesh(geometry,material));
    const saved=renderer.getRenderTarget(), data=new Float32Array(SAMPLES*4);
    let captureMs=0;
    try {
      renderer.setRenderTarget(target);renderer.render(sampleScene,new T.Camera());
      renderer.readRenderTargetPixels(target,0,0,64,64,data);
      if(gl.getError())throw new Error('Environment probe capture returned a WebGL error.');
      captureMs=performance.now()-start;
    } finally {renderer.setRenderTarget(saved);target.dispose();material.dispose();geometry.dispose();directionsTexture.dispose();}
    return {data,captureMs};
  }
  const xyzArray=(data:Float32Array)=>Array.from(data).filter((_,i)=>i%4!==3);
  function exportInput() {
    select('A');
    if(installed)throw new Error('A probe is already installed.');
    for(const v of materialVariants.values()){v.B.dispose();v.C.dispose();}
    materialVariants.clear();replacements.length=0;
    for(const key of Object.keys(excluded))delete excluded[key];
    const gl=renderer.getContext(),env=scene.environment as any;
    if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('Float render targets unavailable; retain delivered lighting.');
    if(!env?.isTexture||env.mapping!==T.CubeUVReflectionMapping||!env.image?.height)throw new Error('Expected initialized PMREM.');
    sourceEnvironment=env;
    const directions=directionsAt(0),training=sampleDirections(directions);
    validationDirections=directionsAt(Math.PI/7);
    const validation=sampleDirections(validationDirections);validationReference=validation.data;
    const {data,captureMs}=training;
    const rgb:number[]=[],xyz:number[]=[];
    for(let i=0;i<SAMPLES;i++){xyz.push(...directions.subarray(i*4,i*4+3));rgb.push(...data.subarray(i*4,i*4+3));}
    collect();
    captureStats={captureSubmissionAndReadbackMs:captureMs,validationReferenceCaptureMs:validation.captureMs,sampleCount:SAMPLES,sourcePmrem:{width:env.image.width,height:env.image.height,type:env.type,format:env.format},receiverMeshes:replacements.length,originalMaterials:materialVariants.size,candidateMaterialsPerVariant:materialVariants.size,
      originalTriangles:replacements.reduce((sum,r)=>sum+(r.mesh.geometry.index?.count??r.mesh.geometry.attributes.position.count)/3*(r.mesh.isInstancedMesh?r.mesh.count:1),0),
      receivers:replacements.map(r=>({name:r.mesh.name,material:r.original.name,metalness:r.original.metalness,roughness:r.original.roughness,neutralPaint:r.original.customProgramCacheKey()==='neutral-cabin-paint-v1'})),excluded,
      radianceMinimum:Math.min(...rgb),radianceMaximum:Math.max(...rgb),geometryArrayDeltaBytes:0,addedTextureBytes:0};
    return {directions:xyz,radiance:rgb,validation:{directions:xyzArray(validationDirections),radiance:xyzArray(validationReference)},provenance:{basis:BASIS,source:'Three r185 RoomEnvironment PMREM roughness=1 at unit intensity; no second convolution',...captureStats}};
  }
  function install(payload:any) {
    if(installed)throw new Error('Probe is already installed.');
    if(payload.schemaVersion!==1||payload.basis!==BASIS||!Array.isArray(payload.coefficients)||payload.coefficients.length!==9||payload.coefficients.some((v:any)=>!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw new Error('Malformed diffuse probe.');
    payload.coefficients.forEach((v:number[],i:number)=>uniforms.diffuseProbe.value[i].fromArray(v));
    const validation=sampleDirections(validationDirections,true);validationPredictions=validation.data;
    const squared=[0,0,0],referenceSquared=[0,0,0],max=[0,0,0];let negative=0;
    for(let i=0;i<SAMPLES;i++)for(let c=0;c<3;c++) {
      const predicted=validationPredictions[i*4+c],reference=validationReference[i*4+c],error=predicted-reference;
      if(!Number.isFinite(predicted)||!Number.isFinite(reference))throw new Error('Nonfinite GPU probe validation.');
      squared[c]+=error*error/SAMPLES;referenceSquared[c]+=reference*reference/SAMPLES;max[c]=Math.max(max[c],Math.abs(error));if(predicted<0)negative++;
    }
    validationStats={sampleCount:SAMPLES,rmsError:squared.map(Math.sqrt),relativeRmsError:squared.map((v,i)=>referenceSquared[i]>0?Math.sqrt(v/referenceSquared[i]):null),maxError:max,negativePredictions:negative,
      probeSubmissionAndReadbackMs:validation.captureMs,method:'Held-out directions rotated pi/7; actual clamped Float32 shader versus PMREM GPU samples.'};
    fitStats=payload.stats;installed=true;
  }
  function update() {
    const variant=installed&&scene.environment===sourceEnvironment?requested:'A';
    if(variant!==effective){effective=variant;for(const r of replacements)r.mesh.material=variant==='A'?r.original:r[variant];}
    if(effective==='A')return;
    for(const [original,variants] of materialVariants) for(const key of ['emissiveIntensity','roughness','metalness','opacity','envMapIntensity']) variants[effective][key]=original[key];
  }
  function select(variant:Variant){requested=variant;update();}
  function dispose(){select('A');for(const v of materialVariants.values()){v.B.dispose();v.C.dispose();}}
  return {exportInput,install,select,update,dispose,validationEvidence:()=>({directions:xyzArray(validationDirections),reference:xyzArray(validationReference),predicted:xyzArray(validationPredictions),stats:validationStats}),stats:()=>({...captureStats,fit:fitStats,validation:validationStats,requested,effective,coefficients:uniforms.diffuseProbe.value.map(v=>v.toArray()),coefficientFloat32Bytes:108,
    environmentRotation:scene.environmentRotation.toArray(),environmentIntensity:scene.environmentIntensity,
    directLightsRetained:true,liveSpecularRadianceRetained:true,sharedIblEnergyApproximation:effective==='B',gtaoUnchanged:true})};
}
