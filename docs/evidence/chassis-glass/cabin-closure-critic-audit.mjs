import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||process.cwd());
const output=resolve(process.argv[3]||'/tmp/cabin-closure-critic-audit.json');
const file=join(root,'components/spacecraft-model.ts');
const hash=()=>createHash('sha256').update(readFileSync(file)).digest('hex');
const sha=hash();
const require=createRequire(pathToFileURL(join(root,'package.json')));
const THREE=await import(pathToFileURL(require.resolve('three')).href);
const {createSpacecraft}=await import(pathToFileURL(file).href);
const model=createSpacecraft(THREE,{projects:[],caseStudies:[]});
const report={sourceSha256:sha,scope:'Independent targeted CPU ray checks of actual visible model meshes, without a DOM/GPU. Floor/ceiling gap coverage, fixed walking-surface height, directed side-passage clearance, and lower/upper ladder-shoulder coverage only.',layouts:[],failures:[]};
const isVisible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const ray=new THREE.Raycaster();
for(const layout of ['wide','compact']){
 model.setLayout(layout); model.update(0,'',true,{activeRoom:'home'}); model.group.updateMatrixWorld(true);
 const meshes=[];
 model.group.traverse(o=>{if(o.isMesh&&!o.userData.isInteractionProxy&&isVisible(o))meshes.push(o);});
 const cast=(o,d,far=2.15)=>{ray.set(new THREE.Vector3(...o),new THREE.Vector3(...d).normalize());ray.near=.001;ray.far=far;return ray.intersectObjects(meshes,false);};
 const record={layout,closureRays:0,walkingSurfaceRays:0,passageRays:0,ladderShoulderRays:0,closureDepthRange:[Infinity,-Infinity],walkingHeightRange:[Infinity,-Infinity]};
 for(const ap of model.group.userData.chassis.apertures){
  const s=ap.size[0]/2.65,cx=ap.center[0],cy=ap.center[1]-.06;
  for(const kind of ['floor','ceiling'])for(const dx of [-.7,0,.7])for(const y of kind==='floor'?[-1.3,-1.2,-1.1]:[1.34,1.39,1.44]){
   record.closureRays++;
   const hits=cast([cx+dx*s,cy+y,3],[0,0,-1]);
   if(!hits.length)report.failures.push({layout,kind:'unclosed-'+kind,room:ap.section,dx,y});
   else{record.closureDepthRange[0]=Math.min(record.closureDepthRange[0],hits[0].point.z);record.closureDepthRange[1]=Math.max(record.closureDepthRange[1],hits[0].point.z);}
  }
  for(const dx of [-.7,0,.7]){
   record.walkingSurfaceRays++;
   const hits=cast([cx+dx*s,cy-.6,1.02],[0,-1,0],.5);
   const actual=hits[0]?.point.y-cy;
   if(!Number.isFinite(actual)||Math.abs(actual-(-.9535))>1e-4)report.failures.push({layout,kind:'walking-top-changed-or-missing',room:ap.section,dx,actual:actual??null,expected:-.9535});
   else{record.walkingHeightRange[0]=Math.min(record.walkingHeightRange[0],actual);record.walkingHeightRange[1]=Math.max(record.walkingHeightRange[1],actual);}
  }
 }
 for(const p of model.group.userData.portals){
  const sign=p.edge==='left'?-1:1;
  for(const y of [-.3,0,.3])for(const z of [-.3,0,.3]){
   record.passageRays++;
   const o=[p.position[0]-sign*.3,p.position[1]+y,p.position[2]+z];
   const hits=cast(o,[sign,0,0],.9);
   if(hits.length)report.failures.push({layout,kind:'side-passage-obstructed',id:p.id,y,z,hit:hits[0].point.toArray(),parts:hits[0].object.userData.parts||[hits[0].object.name]});
  }
 }
 const scale=layout==='wide'?1.4:1;
 const walkwayX=model.group.userData.walkwayAnchor[0];
 for(const y of [-1.08,-1.12,-1.16,-1.2,1.08,1.12,1.16,1.2])for(const z of [-.75,0,.75]){
  record.ladderShoulderRays++;
  const hits=cast([walkwayX-.4*scale,y,z],[-1,0,0],.7*scale);
  if(!hits.length)report.failures.push({layout,kind:'open-ladder-shoulder-lining',y,z});
 }
 report.layouts.push(record);
}
report.sourceUnchangedDuringAudit=hash()===sha;
report.passed=!report.failures.length&&report.sourceUnchangedDuringAudit;
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
