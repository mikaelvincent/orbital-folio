import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||process.cwd());
const output=resolve(process.argv[3]||'/tmp/aligned-cabin-fixes-audit.json');
const file=join(root,'components/spacecraft-model.ts');
const hash=()=>createHash('sha256').update(readFileSync(file)).digest('hex');
const sha=hash();
const req=createRequire(pathToFileURL(join(root,'package.json')));
const THREE=await import(pathToFileURL(req.resolve('three')).href);
const {createSpacecraft}=await import(pathToFileURL(file).href);
const model=createSpacecraft(THREE,{projects:[],caseStudies:[]});
const EXPECTED={floorTop:-1.32,floorThickness:.105,oldFloorTop:-.9535,ceilingProfile:1.455,ceiling:1.430};
const report={sourceSha256:sha,scope:'Actual-mesh CPU checks of only the four requested alignment changes. Roof height/single visible surface, thin floor and content datum, removed shelves/ceiling box, passage clearance and extended rear seam. Actual complaint-camera rays remain a separate visual proof.',expected:EXPECTED,layouts:[],failures:[]};
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const names=o=>o.userData.parts||[o.name];
const ray=new THREE.Raycaster();
for(const layout of ['wide','compact']){
 model.setLayout(layout);model.update(0,'',true,{activeRoom:'home'});model.group.updateMatrixWorld(true);
 const meshes=[],allMeshes=[];model.group.traverse(o=>{if(o.isMesh){allMeshes.push(o);if(!o.userData.isInteractionProxy&&visible(o))meshes.push(o);}});
 const cast=(subset,o,d,far=1.2)=>{ray.set(new THREE.Vector3(...o),new THREE.Vector3(...d).normalize());ray.near=.001;ray.far=far;return ray.intersectObjects(subset,false);};
 const r={layout,roofRays:0,roofFrameJoinRays:0,floorThicknessRays:0,contentDatumChecks:0,passageRays:0,rearSeamRays:0,removedParts:[],roofHeightRange:[Infinity,-Infinity],floorThicknessRange:[Infinity,-Infinity],contentBounds:[]};
 const fail=(kind,detail)=>report.failures.push({layout,kind,...detail});
 for(const m of allMeshes)for(const n of names(m))if(/solid-cabin-ceiling-return|walkway-room-landing|walkway-landing-light-guide|walkway-landing-wall-cleat/.test(n)){r.removedParts.push(n);fail('forbidden-part-remains',{name:n});}
 for(const ap of model.group.userData.chassis.apertures){
  const section=ap.section,s=ap.size[0]/2.65,cx=ap.center[0],cy=ap.center[1]-.06;
  const roof=meshes.filter(m=>names(m).includes(section+'-continuous-pressure-skin-interior'));
  const deck=meshes.filter(m=>m.userData.section===section&&names(m).includes('coherent-cabin-deck'));
  for(const dx of [-.7,0,.7])for(const z of [-.55,0,.9,1.18,1.24]){
   r.roofRays++;const hits=cast(roof,[cx+dx*s,cy+.8,z],[0,1,0]);
   const ys=[...new Set(hits.map(h=>Math.round((h.point.y-cy)*1e5)/1e5))];
   if(ys.length!==1||Math.abs(ys[0]-EXPECTED.ceiling)>.0001)fail('roof-not-single-aligned-surface',{section,dx,z,ys});
   else{r.roofHeightRange[0]=Math.min(r.roofHeightRange[0],ys[0]);r.roofHeightRange[1]=Math.max(r.roofHeightRange[1],ys[0]);}
  }
  const enclosure=meshes.filter(m=>roof.includes(m)||names(m).includes('one-piece-five-aperture-pressure-face'));
  for(const dx of [-.7,0,.7])for(const z of [1.24,1.26,1.28,1.30,1.32]){
   r.roofFrameJoinRays++;const hits=cast(enclosure,[cx+dx*s,cy+.8,z],[0,1,0]);
   const first=hits[0]?.point.y-cy;
   if(!Number.isFinite(first)||first<1.4299||first>1.49)fail('open-or-lowered-roof-frame-join',{section,dx,z,first});
  }
  for(const dx of [-.7,0,.7])for(const z of [0,1.1]){
   r.floorThicknessRays+=2;
   const top=cast(deck,[cx+dx*s,cy-.9,z],[0,-1,0])[0]?.point.y-cy;
   const bottom=cast(deck,[cx+dx*s,cy-1.7,z],[0,1,0])[0]?.point.y-cy;
   const thickness=top-bottom;
   if(!Number.isFinite(thickness)||Math.abs(top-EXPECTED.floorTop)>.0001||Math.abs(thickness-EXPECTED.floorThickness)>.0001)fail('floor-not-thin-or-lowered',{section,dx,z,top,bottom,thickness});
   else{r.floorThicknessRange[0]=Math.min(r.floorThicknessRange[0],thickness);r.floorThicknessRange[1]=Math.max(r.floorThicknessRange[1],thickness);}
  }
  const content=model.group.getObjectByName(section+'-cabin-contents');
  const datum=content.localToWorld(new THREE.Vector3(0,EXPECTED.oldFloorTop,0)).y-cy;
  r.contentDatumChecks++;
  if(Math.abs(datum-EXPECTED.floorTop)>.0001)fail('scaled-content-datum-misaligned',{section,datum});
  const b=new THREE.Box3().setFromObject(content);
  r.contentBounds.push({section,scale:content.scale.y,contentY:content.position.y,datum,minimumYRelativeFloor:b.min.y-cy-EXPECTED.floorTop});
 }
 for(const p of model.group.userData.portals){const sign=p.edge==='left'?-1:1;for(const y of [-.3,0,.3])for(const z of [-.3,0,.3]){r.passageRays++;const hits=cast(meshes,[p.position[0]-sign*.3,p.position[1]+y,p.position[2]+z],[sign,0,0],.9);if(hits.length)fail('passage-obstructed',{id:p.id,y,z,point:hits[0].point.toArray(),parts:names(hits[0].object)});}}
 const liner=meshes.filter(m=>names(m).includes('walkway-continuous-rear-liner'));
 const wx=model.group.userData.walkwayAnchor[0],s=layout==='wide'?1.4:1;
 for(const row of [-1.7,1.7])for(const y of [-.55,0,.55])for(const x of [.6,.75,.9,1.05]){r.rearSeamRays++;const hits=cast(liner,[wx+x*s,row+y,-.7],[0,0,-1],.5);if(!hits.length)fail('rear-wall-seam-not-covered',{row,y,x});}
 report.layouts.push(r);
}
report.sourceUnchangedDuringAudit=hash()===sha;
report.passed=!report.failures.length&&report.sourceUnchangedDuringAudit;
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceSha256:report.sourceSha256,layouts:report.layouts,failures:report.failures,passed:report.passed},null,2));
