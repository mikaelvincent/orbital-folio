import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||process.cwd());
const output=resolve(process.argv[3]||'/tmp/interior-standardization-audit.json');
const file=join(root,'components/spacecraft-model.ts');
const hash=()=>createHash('sha256').update(readFileSync(file)).digest('hex');
const sha=hash();const req=createRequire(pathToFileURL(join(root,'package.json')));
const THREE=await import(pathToFileURL(req.resolve('three')).href);
const {createSpacecraft}=await import(pathToFileURL(file).href);
const model=createSpacecraft(THREE,{projects:[],caseStudies:[],labels:{projects:'Projects',experience:'Case studies',about:'About',contact:'Contact'}});
const report={sourceSha256:sha,scope:'Independent actual-mesh CPU check of the four interior-standardization changes. Full-frame first-hit visibility, clear side passages, plain rear-wall coverage/material, removal of overlays, actual symbol bounds and minimum prior alignment preservation. Docking complaint-view judgment is separate.',layouts:[],failures:[]};
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const names=o=>o.userData.parts||[o.name];const ray=new THREE.Raycaster();
for(const layout of ['wide','compact']){
 model.setLayout(layout);model.update(0,'',true,{activeRoom:'home'});model.group.updateMatrixWorld(true);
 const meshes=[],allMeshes=[];model.group.traverse(o=>{if(o.isMesh){allMeshes.push(o);if(!o.userData.isInteractionProxy&&visible(o))meshes.push(o);}});
 const cast=(subset,o,d,far=2)=>{ray.set(o.isVector3?o:new THREE.Vector3(...o),(d.isVector3?d:new THREE.Vector3(...d)).normalize());ray.near=.001;ray.far=far;return ray.intersectObjects(subset,false);};
 const r={layout,frameFirstHitRays:0,longContextRays:0,furnitureOcclusions:[],passageRays:0,plainRearWallRays:0,plainWallMaterialChecks:0,preservationRays:0,removedParts:[],frameEdges:[],symbolInsets:[],rearWallZRange:[Infinity,-Infinity]};
 const fail=(kind,detail)=>report.failures.push({layout,kind,...detail});
 for(const m of allMeshes)for(const n of names(m))if(/rounded-warm-cabin-liner|lower-wall-cove|solid-cabin-ceiling-return|walkway-room-landing|walkway-landing-light-guide|walkway-landing-wall-cleat/.test(n)){r.removedParts.push(n);fail('forbidden-part-remains',{name:n});}
 for(const p of model.group.userData.portals){
  const visual=model.group.getObjectByName(p.id+'-open-side-passage');
  const opening=visual.children.find(o=>o.children.some(c=>c.isMesh&&names(c).includes('flush-open-pressure-hatch-frame')));
  if(!opening){fail('missing-frame-parent',{id:p.id});continue;}
  for(const [edge,u,v]of [['left',-.966,-.6],['left',-.966,0],['left',-.966,.6],['right',.966,-.6],['right',.966,0],['right',.966,.6],['top',-.6,.966],['top',0,.966],['top',.6,.966],['bottom',-.6,-.966],['bottom',0,-.966],['bottom',.6,-.966]]){
   const origin=opening.localToWorld(new THREE.Vector3(u,v,.2));
   const direction=new THREE.Vector3(0,0,-1).transformDirection(opening.matrixWorld);
   const hit=cast(meshes,origin,direction,1)[0];r.frameFirstHitRays++;
   const contextOrigin=opening.localToWorld(new THREE.Vector3(u,v,.6));const contextHit=cast(meshes,contextOrigin,direction,1)[0];r.longContextRays++;if(contextHit&&!names(contextHit.object).includes('flush-open-pressure-hatch-frame'))r.furnitureOcclusions.push({id:p.id,edge,u,v,parts:names(contextHit.object),distance:contextHit.distance});
   const good=hit&&names(hit.object).includes('flush-open-pressure-hatch-frame');
   if(!good)fail('frame-edge-not-first-hit',{id:p.id,edge,u,v,hit:hit&&{distance:hit.distance,point:hit.point.toArray(),parts:names(hit.object)}});
   r.frameEdges.push({id:p.id,edge,u,v,firstHitFrame:!!good,localZ:hit&&opening.worldToLocal(hit.point.clone()).z});
  }
  const sign=p.edge==='left'?-1:1;
  for(const y of [-.65,0,.65])for(const z of [-.65,0,.65]){r.passageRays++;const hit=cast(meshes,[p.position[0]-sign*.3,p.position[1]+y,p.position[2]+z],[sign,0,0],.9)[0];if(hit)fail('passage-obstructed',{id:p.id,y,z,point:hit.point.toArray(),parts:names(hit.object)});}
  const caption=model.group.getObjectByName(p.id+'-above-door-wall-nameplate');
  const inverse=caption.matrixWorld.clone().invert();const bounds=[new THREE.Box3(),new THREE.Box3()];
  caption.traverse(o=>{if(!o.isMesh||!names(o).some(n=>n==='painted-direction-arrow'||n==='painted-ladder-side'||n==='painted-ladder-rung'))return;const a=o.geometry.attributes.position;const matrix=inverse.clone().multiply(o.matrixWorld);for(let i=0;i<a.count;i++){const q=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(matrix);bounds[q.x<0?0:1].expandByPoint(q);}});
  const edgePad=[bounds[0].min.x+p.enamelWidth/2,p.enamelWidth/2-bounds[1].max.x];
  const textGutter=[-p.labelSize[0]/2-bounds[0].max.x,bounds[1].min.x-p.labelSize[0]/2];
  const verticalPad=Math.min(...bounds.map(b=>.11-Math.max(Math.abs(b.min.y),Math.abs(b.max.y))));
  const q={id:p.id,edgePad,textGutter,verticalPad,flatFaceEdgePad:edgePad.map(v=>v-.013),bounds:bounds.map(b=>({min:b.min.toArray(),max:b.max.toArray()}))};r.symbolInsets.push(q);
  if(edgePad.some(v=>v<.094)||textGutter.some(v=>v<.02)||verticalPad<.05||Math.abs(edgePad[0]-edgePad[1])>.002)fail('insufficient-or-asymmetric-icon-inset',q);
 }
 for(const ap of model.group.userData.chassis.apertures){
  const section=ap.section,s=ap.size[0]/2.65,cx=ap.center[0],cy=ap.center[1]-.06;
  const wall=meshes.filter(m=>names(m).includes(section+'-continuous-pressure-skin-interior'));
  for(const m of wall){r.plainWallMaterialChecks++;const mats=Array.isArray(m.material)?m.material:[m.material];for(const material of mats){const maps=['map','normalMap','bumpMap','displacementMap'].filter(k=>material[k]);if(material.name!=='plain-cabin-enamel'||maps.length)fail('rear-wall-not-plain',{section,name:material.name,maps});}}
  for(const dx of [-1,-.5,0,.5,1])for(const y of [-1.15,-.8,-.3,.3,.8,1.2]){r.plainRearWallRays++;const hit=cast(wall,[cx+dx*s,cy+y,.4],[0,0,-1],2)[0];if(!hit)fail('rear-wall-uncovered',{section,dx,y});else{r.rearWallZRange[0]=Math.min(r.rearWallZRange[0],hit.point.z);r.rearWallZRange[1]=Math.max(r.rearWallZRange[1],hit.point.z);}}
  for(const z of [0,1.24]){r.preservationRays++;const hit=cast(wall,[cx,cy+.8,z],[0,1,0],1)[0];if(!hit||Math.abs(hit.point.y-cy-1.43)>.0001)fail('previous-roof-alignment-regressed',{section,z,point:hit?.point.toArray()});}
  const deck=meshes.filter(m=>m.userData.section===section&&names(m).includes('coherent-cabin-deck'));
  r.preservationRays++;const floor=cast(deck,[cx,cy-.9,.5],[0,-1,0],1)[0];if(!floor||Math.abs(floor.point.y-cy+1.32)>.0001)fail('previous-floor-alignment-regressed',{section,point:floor?.point.toArray()});
 }
 report.layouts.push(r);
}
report.sourceUnchangedDuringAudit=hash()===sha;report.passed=!report.failures.length&&report.sourceUnchangedDuringAudit;
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sourceSha256:sha,passed:report.passed,counts:report.layouts.map(({layout,frameFirstHitRays,passageRays,plainRearWallRays,plainWallMaterialChecks,preservationRays})=>({layout,frameFirstHitRays,passageRays,plainRearWallRays,plainWallMaterialChecks,preservationRays})),failures:report.failures},null,2));
