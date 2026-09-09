import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||process.cwd());
const baseline=resolve(process.argv[3]||'/tmp/aligned-cabins-baseline-model.ts');
const poseFile=resolve(process.argv[4]||join(root,'docs/evidence/aligned-cabins/about-oblique-pose.json'));
const output=resolve(process.argv[5]||'/tmp/aligned-cabin-seam-comparison.json');
const current=join(root,'components/spacecraft-model.ts');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const req=createRequire(pathToFileURL(join(root,'package.json')));
const THREE=await import(pathToFileURL(req.resolve('three')).href);
const pose=JSON.parse(readFileSync(poseFile,'utf8'));
const [width,height]=pose.viewport;
const camera=new THREE.PerspectiveCamera(38,width/height,.01,Number(pose.cameraFar));
camera.position.fromArray(pose.cameraPosition.split(',').map(Number));
camera.quaternion.fromArray(pose.cameraQuaternion.split(',').map(Number)).normalize();
camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
const imports=await Promise.all([import(pathToFileURL(baseline).href),import(pathToFileURL(current).href)]);
const models=imports.map(i=>i.createSpacecraft(THREE,{projects:[],caseStudies:[]}));
const meshes=models.map(m=>{m.setLayout(pose.layout);m.update(0,'',true,{activeRoom:pose.activeRoom,reading:false});m.group.updateMatrixWorld(true);const list=[];m.group.traverse(o=>{let visible=true;for(let p=o;p;p=p.parent)visible&&=p.visible;if(o.isMesh&&visible&&!o.userData.isInteractionProxy)list.push(o);});return list;});
const ray=new THREE.Raycaster();ray.near=.001;ray.far=80;
const report={scope:'Same recorded About camera, actual pre-fix and current visible spacecraft meshes, no GPU/textures. Grid bounded to the doorway complaint region. Baseline misses identify the strip independently of the repair geometry.',baselineSha256:hash(baseline),currentSha256:hash(current),poseFileSha256:hash(poseFile),pose,region:{left:170,right:400,top:285,bottom:690,stepX:5,stepY:15},samples:0,baselineMisses:0,currentMisses:0,repaired:[],newMisses:[],remainingMisses:[],repairedHitParts:{}};
for(let y=285;y<=690;y+=15)for(let x=170;x<=400;x+=5){
 ray.setFromCamera(new THREE.Vector2(x/width*2-1,1-y/height*2),camera);
 const hits=meshes.map(ms=>ray.intersectObjects(ms,false)[0]);report.samples++;
 if(!hits[0])report.baselineMisses++;
 if(!hits[1])report.currentMisses++;
 if(!hits[0]&&hits[1]){const parts=hits[1].object.userData.parts||[hits[1].object.name];const key=parts.join('|');report.repairedHitParts[key]=(report.repairedHitParts[key]||0)+1;report.repaired.push({pixel:[x,y],hit:hits[1].point.toArray(),parts});}
 if(hits[0]&&!hits[1])report.newMisses.push([x,y]);
 if(!hits[0]&&!hits[1])report.remainingMisses.push([x,y]);
}
report.passed=report.baselineMisses>0&&report.currentMisses===0&&report.newMisses.length===0;
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({samples:report.samples,baselineMisses:report.baselineMisses,currentMisses:report.currentMisses,repaired:report.repaired.length,newMisses:report.newMisses.length,remainingMisses:report.remainingMisses.length,repairedHitParts:report.repairedHitParts,passed:report.passed},null,2));
