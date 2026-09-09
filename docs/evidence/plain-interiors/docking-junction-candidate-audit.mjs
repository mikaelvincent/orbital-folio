import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
// Usage: node audit.mjs [repository] [output.json]
const root=resolve(process.argv[2]||process.cwd()),file=join(root,'components/spacecraft-model.ts'),output=resolve(process.argv[3]||'/tmp/docking-junction-candidate-audit.json');
const hash=createHash('sha256').update(readFileSync(file)).digest('hex');
const req=createRequire(root+'/package.json'),T=await import(pathToFileURL(req.resolve('three')).href);
const {createSpacecraft}=await import(pathToFileURL(file).href);const source=[];
class Mesh extends T.Mesh{constructor(...a){super(...a);source.push(this);}removeFromParent(){if(this.parent&&!this.auditParent)this.auditParent=this.parent;return super.removeFromParent();}}
const m=createSpacecraft({...T,Mesh},{projects:[],caseStudies:[]}),report={sourceSha256:hash,limits:'CPU actual-mesh intersection tests. Uniform finite sampling proves the sampled corridors/seams only, not every infinitesimal triangle. No rendered visual-quality claim.',layouts:[],failures:[]};
const find=n=>source.filter(o=>o.name===n);
function visible(o){for(let p=o;p;p=p.parent||p.auditParent)if(!p.visible)return false;return true;}
const ray=new T.Raycaster();
for(const layout of ['wide','compact']){
 m.setLayout(layout);m.group.updateMatrixWorld(true);const s=layout==='wide'?1.4:1,wx=m.group.userData.walkwayAnchor[0];
 const matrix=o=>{o.updateMatrix();return o.auditParent?o.auditParent.matrixWorld.clone().multiply(o.matrix):o.matrixWorld.clone();};
 const clones=ns=>source.filter(o=>ns(o.name)&&visible(o)).map(o=>{const c=new T.Mesh(o.geometry,o.material);c.name=o.name;c.matrixAutoUpdate=false;c.matrix.copy(matrix(o));c.updateMatrixWorld(true);return c;});
 const dock=clones(n=>/walkway-open-docking-wall|inner-docking-|coaxial-docking-|docking-mount-/.test(n));
 const seams=clones(n=>/walkway-open-docking-wall|walkway-continuous-rear-liner|walkway-curved-end-pressure-cap-exterior|one-piece-five-aperture-pressure-face/.test(n));
 const wall=clones(n=>n.startsWith('walkway-open-docking-wall'));
 const cast=(parts,y,z,fromX=wx+.18*s,dir=-1,far=2*s)=>{ray.set(new T.Vector3(fromX,y,z),new T.Vector3(dir,0,0));ray.near=1e-5;ray.far=far;return ray.intersectObjects(parts,false);};
 const r={layout,apertureClosureRays:0,apertureMisses:[],horizontalShoulderSeamRays:0,shoulderSeamMisses:[],verticalSeamRays:0,verticalSeamMisses:[],planeRays:0,planeErrors:[],maxVisibleJoinStep:0,matchedJoinStepRays:0,joinStepErrors:[],maxMatchedJoinStep:0};report.layouts.push(r);
 for(let i=0;i<=54;i++)for(let j=0;j<=60;j++){const y=-1.05+2.10*i/54,z=-1.19+2.38*j/60;r.apertureClosureRays++;const h=cast(dock,y,z);if(!h.length)r.apertureMisses.push({y,z});}
 for(const sy of [-1,1])for(let i=0;i<=40;i++)for(let j=0;j<=36;j++){const y=sy*(.99+.15*i/40),z=-.895+2.01*j/36;r.horizontalShoulderSeamRays++;const h=cast(seams,y,z);if(!h.length)r.shoulderSeamMisses.push({y,z});else if(Math.abs(y)<1.06&&Math.abs(z)<1.11)r.maxVisibleJoinStep=Math.max(r.maxVisibleJoinStep,Math.abs((h[0].point.x-wx)/s-(-.665)));}
 // The rear vertical seam is covered by the original rear-wall cove; the front edge seats in the common chassis face.
 for(const edge of ['rear','front'])for(let i=0;i<=30;i++)for(let j=0;j<=24;j++){const y=-1.055+2.11*i/30,z=(edge==='rear'?-.985:1.105)+.145*j/24;r.verticalSeamRays++;const h=cast([...seams,...dock],y,z);if(!h.length)r.verticalSeamMisses.push({edge,y,z});}
 for(const joinY of [-1.04,1.06])for(const z of [-.8,-.4,0,.4,.8,1.1]){r.matchedJoinStepRays+=2;const a=cast(seams,joinY-.0001,z),b=cast(seams,joinY+.0001,z);if(!a.length||!b.length)r.joinStepErrors.push({joinY,z,a:!!a.length,b:!!b.length});else{const delta=Math.abs(a[0].point.x-b[0].point.x)/s;r.maxMatchedJoinStep=Math.max(r.maxMatchedJoinStep,delta);if(delta>.001)r.joinStepErrors.push({joinY,z,delta});}}
 for(const z of [-1.1,1.1])for(const y of [-.85,-.3,.3,.85])for(const direction of [-1,1]){r.planeRays++;const inside=direction===-1,expected=inside?-.665:-.75;const h=cast(wall,y,z,wx+(inside?.1:-1.2)*s,direction);if(!h.length||Math.abs((h[0].point.x-wx)/s-expected)>1e-5)r.planeErrors.push({y,z,direction,expected,actual:h[0]?(h[0].point.x-wx)/s:null});}
 for(const [kind,errors] of Object.entries(r))if(Array.isArray(errors)&&errors.length)report.failures.push({layout,kind,count:errors.length,examples:errors.slice(0,8)});
}
report.baselineComparison={"revision":"08b1f26","source":"Recorded actual-mesh bounds in docking-junction-diagnosis.json, before the correction.","coordinateSystem":"X relative to walkway origin; Z unchanged by wide layout.","compact":{"beforeWallX":[-0.8280000016093254,-0.6720000058412552],"afterWallX":[-0.75,-0.665],"beforeWallZ":[-1.2680000066757202,1.2680000066757202],"afterWallZ":[-1.21,1.21]},"wide":{"beforeWallX":[-1.1592000022530558,-0.9408000081777574],"afterWallX":[-1.05,-0.931],"beforeWallZ":[-1.2680000066757202,1.2680000066757202],"afterWallZ":[-1.21,1.21]}};
writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,layouts:report.layouts.map(r=>({...r,apertureMisses:r.apertureMisses.slice(0,4),shoulderSeamMisses:r.shoulderSeamMisses.slice(0,4),verticalSeamMisses:r.verticalSeamMisses.slice(0,4)}))},null,2));
