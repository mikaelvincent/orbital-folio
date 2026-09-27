import { createRoot } from 'react-dom/client';
import { ImmersivePortfolio } from '../../features/portfolio/immersive-portfolio';
import type { SceneAudit, SceneAuditController, SceneShadingContext } from '../../features/diagnostics/scene-audit';
import { seeds } from '../../lib/content/seed';
import { toPortfolio, type Content, type Kind } from '../../lib/content/types';
import { createStationaryPixelCache } from './stationary-pixel-cache';
import './camera-invalidation-lab.css';

const panel = document.getElementById('camera-lab-controls')!;
panel.innerHTML = `<section class="camera-lab-panel"><h2>Stationary pixel cache investigation</h2>
<p id="pixel-status">Preparing…</p><button id="pixel-probe" disabled>Probe cache</button>
<button id="pixel-verify" disabled>Verify rooms</button><button id="pixel-timing" disabled>Rested comparison</button>
<button id="pixel-stop">Stop</button><label>Room <select id="pixel-room"><option>projects</option><option>home</option><option>contact</option><option>about</option><option>experience</option></select></label>
<textarea id="pixel-output" readonly aria-label="Pixel cache results"></textarea></section>`;
const data = toPortfolio(seeds.map(item => ({id:item.id,kind:item.kind as Kind,draft:item.data,
  published:item.data,revision:1,updatedAt:'2026-09-27T00:00:00.000Z'})) as Content[]);
let controller: SceneAuditController, context: SceneShadingContext;
let cache: ReturnType<typeof createStationaryPixelCache>;
let modelSeconds = 14, stopped = false, busy = false, report: any;
const button = (id: string) => document.getElementById('pixel-'+id) as HTMLButtonElement;
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve,ms));
async function status(message: string) {
  document.getElementById('pixel-status')!.textContent=message;
  await fetch('/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phase:message})});
}
const audit: SceneAudit = {
  manual:true,
  modelReady(model) { const update=model.update; model.update=(_time: number,...args:any[])=>update(modelSeconds,...args); },
  shadingReady(value) { context=value;cache=createStationaryPixelCache(value);return ()=>cache.dispose(); },
  ready(value) { controller=value;controller.freezeBackground(0);controller.setGpuScope('frame');
    for(const id of ['probe','verify','timing'])button(id).disabled=false;void status('Ready; scene advances only during replay.'); },
};
createRoot(document.getElementById('portfolio-root')!).render(<ImmersivePortfolio data={data}
  initialSection="home" preview={false} sceneAudit={audit}><p>Public seed fixture</p></ImmersivePortfolio>);
function check(){if(stopped||document.hidden)throw new Error('Replay stopped or hidden');}
async function step(after?:()=>void){await new Promise<void>((resolve,reject)=>requestAnimationFrame(()=>{
  try{check();controller.step(1/60);after?.();resolve();}catch(e){reject(e);}
}));}
async function steps(n:number){for(let i=0;i<n;i++)await step();}
function clearInput(){(document.activeElement as HTMLElement)?.blur?.();
  document.getElementById('ship')!.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse',isPrimary:true}));
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));}
async function settle(room:string){cache.select(false);clearInput();modelSeconds=14;controller.navigate(room);await pause(0);
  for(let i=0;i<900;i++){await step();const s=controller.state();
    if(s.backgroundReady&&s.room===room&&!s.travelling&&!s.motionActive){await steps(120);return;}}
  throw new Error('Room failed to settle: '+room);}
function pointer(x:number,y:number){const canvas=document.querySelector('#ship canvas')!;
  const r=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,
    isPrimary:true,pointerId:981,pointerType:'mouse',clientX:r.left+x*r.width,clientY:r.top+y*r.height}));}
async function sample(variant:'A'|'B',workload='hold',frames=240,room='projects'){
  await settle(room);cache.select(variant==='B');await steps(30);
  const startSeconds=workload==='scan'?5:14;
  modelSeconds=startSeconds;await steps(5);controller.reset();const before=cache.stats();const stateBefore=controller.state();
  const startedAt=new Date().toISOString();
  for(let i=0;i<frames;i++){
    modelSeconds=startSeconds+i/60;
    if(workload==='camera')pointer(.5+.2*Math.sin(i/frames*Math.PI*2),.5-.12*Math.sin(i/frames*Math.PI));
    await step();
  }
  const snapshot=controller.snapshot();const after=cache.stats();
  const result={variant,workload,frames,room,startedAt,stateBefore,stateAfter:controller.state(),snapshot,
    cache:{...after,hits:after.hits-before.hits,builds:after.builds-before.builds,fallbacks:after.fallbacks-before.fallbacks},
    glError:context.renderer.getContext().getError()};
  report.rows.push(result);return result;
}
function readPixels(){const gl=context.renderer.getContext();const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
  gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;}
async function compare(name:string,images=false){
  cache.select(false);await steps(4);let a!:Uint8Array,b!:Uint8Array,before:string|undefined,after:string|undefined;
  await step(()=>{a=readPixels();if(images)before=context.renderer.domElement.toDataURL();});
  cache.select(true);await steps(4);
  await step(()=>{b=readPixels();if(images)after=context.renderer.domElement.toDataURL();});
  let changedPixels=0,maxChannelDifference=0,total=0,over8=0;
  for(let i=0;i<a.length;i+=4){let d=0;for(let j=0;j<3;j++){const x=Math.abs(a[i+j]-b[i+j]);d=Math.max(d,x);total+=x;}
    if(d)changedPixels++;if(d>8)over8++;maxChannelDifference=Math.max(maxChannelDifference,d);}
  const row={name,state:controller.state(),changedPixels,maxChannelDifference,over8,meanAbsoluteChannelDifference:total/(a.length/4*3),
    before,after,cache:cache.stats(),glError:context.renderer.getContext().getError()};report.verifications.push(row);
  if(row.glError)throw new Error('WebGL error '+row.glError);
}
async function native(){const r=await fetch('/context');return r.json();}
async function save(){report.endedAt=new Date().toISOString();report.contexts.push(await native());
  const r=await fetch('/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:report.runId,report})});
  if(!r.ok)throw new Error(await r.text());
  const saved: any=await r.json();
  (document.getElementById('pixel-output') as HTMLTextAreaElement).value=JSON.stringify({saved,errors:report.errors,
    controls:report.controls,rows:report.rows.map((r:any)=>({variant:r.variant,workload:r.workload,room:r.room,
      cpu:r.snapshot.scene.cpuTotal,gpu:r.snapshot.scene.gpu.phases,cache:r.cache})),
    verifications:report.verifications.map(({before,after,...v}:any)=>v)},null,2);
  await status(report.status+': '+saved.filename);
}
function stability(rows:any[]){const values=rows.map(r=>r.snapshot.scene.gpu.phases.frame?.mean).filter(Number.isFinite).sort((a,b)=>a-b);
  const cpu=rows.map(r=>r.snapshot.scene.cpuTotal.mean).sort((a,b)=>a-b);
  const spread=(a:number[])=>(a.at(-1)!-a[0])/a[Math.floor(a.length/2)];
  return{gpuSpread:spread(values),cpuSpread:spread(cpu),pass:values.length===rows.length&&spread(values)<=.05&&spread(cpu)<=.05};}
async function run(mode:string){if(busy)return;busy=true;stopped=false;
  const room=(document.getElementById('pixel-room') as unknown as HTMLSelectElement).value;
  report={runId:'pixels-'+mode+'-'+Date.now(),mode,status:'running',startedAt:new Date().toISOString(),rows:[],controls:[],
    verifications:[],contexts:[await native()],errors:[],method:{frameStep:1/60,backgroundSeconds:0,holdSeconds:[14,18],scanSeconds:[5,9]}};
  try{
    if(mode==='probe'){
      await settle(room);await compare(room+'-hold',true);
      for(const workload of ['hold','scan','camera'])for(const variant of ['A','B','B','A'] as const){
        await status('Exploratory '+room+' '+workload+' '+variant);await sample(variant,workload,240,room);await pause(1000);}
    }else if(mode==='verify'){
      for(const room of ['home','projects','contact','about','experience']){
        await status('Compare '+room);await settle(room);await compare(room,true);
        for(const phase of [3.8,7,10,15.5]){modelSeconds=phase;await steps(4);await compare(room+'-phase-'+phase);}
      }
    }else{
      await status('Initial 60-second recovery');await pause(60000);
      let ready=false;
      for(let attempt=0;attempt<2;attempt++){
        const controls=[];
        for(let i=0;i<3;i++){await status('Readiness '+attempt+'/'+i);controls.push(await sample('A','hold',240,room));if(i<2)await pause(10000);}
        const gate=stability(controls);report.controls.push({attempt,gate,rows:controls.map(r=>r.startedAt)});
        if(gate.pass){ready=true;break;}if(attempt===0){await status('One permitted recovery retry');await pause(60000);}
      }
      if(!ready)throw new Error('Readiness failed; no qualified performance gain established');
      for(const order of ['ABBA','BAAB','ABBA','BAAB']){
        report.contexts.push(await native());await status('Measured block '+order);
        const rows=[];for(const v of 'A'+order+'A'){rows.push(await sample(v as 'A'|'B','hold',240,room));await pause(1000);}
        report.controls.push({order,gate:stability(rows.filter(r=>r.variant==='A')),rows:rows.map(r=>r.startedAt)});
        await pause(20000);
      }
    }
    report.status='complete';
  }catch(e){report.errors.push(String(e));report.status='inconclusive-or-interrupted';}
  finally{await save();cache.select(false);busy=false;}
}
for(const mode of ['probe','verify','timing'])button(mode).onclick=()=>void run(mode);
button('stop').onclick=()=>{stopped=true;};
