/** Build a production React/DOM content comparison for the hidden browser.
 * Run in a disposable source checkout; --baseline-dir mirrors the changed source
 * paths from the reference commit. Serve --out-dir on an unused loopback port.
 * node scripts/benchmark-markdown.mjs --baseline-dir=/tmp/reference --out-dir=/tmp/lab
 * No WebGL, network content, stored data, GPU, energy or whole-interaction claims.
 */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=');
    return [arg.slice(2, index), arg.slice(index + 1)];
  }),
);
assert.ok(
  args.get('baseline-dir') && args.get('out-dir'),
  '--baseline-dir and --out-dir required',
);
const out = resolve(args.get('out-dir'));
await mkdir(out, { recursive: true });
const files = [
  'features/portfolio/project-markdown-content.ts',
  'features/portfolio/project-markdown.tsx',
  'features/portfolio/notebook-section-pages.tsx',
  'features/portfolio/room-views.tsx',
];
const metadata = {
  lockfile: hash(await readFile('package-lock.json')),
  sources: {},
};
function hash(source) {
  return createHash('sha256').update(source).digest('hex');
}
const entry = `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AboutNotebook } from './features/portfolio/about-notebook';
import { DossierView } from './features/portfolio/room-views';
import { JournalPagePreview } from './features/studio/journal-page-preview';
import { ProjectMarkdown } from './features/portfolio/project-markdown';
import { markdownBenchmarkStats } from './features/portfolio/project-markdown-content';
import { seeds, seedSite } from './lib/content/seed';
const records = seeds.map(s => ({...s, draft:s.data, published:s.data}));
const collection = kind => seeds.filter(s=>s.kind===kind).map(s=>({...s.data,id:s.id}));
const data = {site:seedSite,projects:collection('project'),journal:collection('journal'),experience:collection('experience'),media:[],links:[]};
const noop=()=>{};
export const counts=()=>markdownBenchmarkStats.calls;
export function driver(host, mode, salt) {
  const root=createRoot(host);
  const journal=mode==='notebook-saturated' ? Array.from({length:20},(_,i)=>({...data.journal[i%5], id:'copy-'+i,body:'## Copy '+i+'\\n\\n'+data.journal[i%5].body})) : data.journal;
  const notebookData={...data,journal};
  const pageCounts=journal.map(()=>1);
  const onPageCount=(section,count)=>{pageCounts[section]=count;};
  function step(i) {
    let element;
    if(mode.startsWith('notebook')) element=createElement(AboutNotebook,{
      data:notebookData, interactive:true,ready:true,section:Math.floor(i/10)%journal.length,
      page:i%2,pageCounts,onPageCount,onPageChange:noop,onSectionChange:noop,
    });
    else if(mode==='reading-repeat') element=createElement(DossierView,{data,project:data.projects[0]});
    else if(mode==='studio-pages') element=createElement(JournalPagePreview,{
      data:data.journal[0],records,recordId:data.journal[0].id,body:data.journal[0].body,media:[],
    });
    else element=createElement(ProjectMarkdown,{body:data.projects[0].body+'\\n\\nEdit '+salt+'-'+i});
    flushSync(()=>root.render(element));
    if(mode==='studio-pages' && i>=0) {
      const buttons=[...host.querySelectorAll('button')];
      const button=buttons.find(b=>b.getAttribute('aria-label')===(i%2?'Next page in section':'Previous page in section'));
      if(button&&!button.disabled) flushSync(()=>button.click());
    }
  }
  return {step,close:()=>flushSync(()=>root.unmount())};
}
`;
for (const variant of ['A', 'B']) {
  const sources = new Map();
  for (const file of files) {
    const source = await readFile(
      variant === 'A' ? resolve(args.get('baseline-dir'), file) : file,
      'utf8',
    );
    metadata.sources[variant + '/' + file] = hash(source);
    sources.set(file, source);
  }
  await build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
    outfile: resolve(out, variant + '.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'reference-and-counts',
        setup(api) {
          api.onLoad(
            { filter: /features\/portfolio\/.*\.(ts|tsx)$/ },
            async ({ path }) => {
              const name = relative(process.cwd(), path);
              if (!sources.has(name)) return;
              let contents = sources.get(name);
              if (name.endsWith('project-markdown-content.ts')) {
                assert.ok(contents.includes('  const tokens = marked.lexer'));
                contents =
                  'export const markdownBenchmarkStats = {calls:0};\n' +
                  contents.replace(
                    '  const tokens = marked.lexer',
                    '  markdownBenchmarkStats.calls++;\n  const tokens = marked.lexer',
                  );
              }
              return { contents, loader: name.endsWith('tsx') ? 'tsx' : 'ts' };
            },
          );
        },
      },
    ],
    logLevel: 'silent',
  });
}
await writeFile(
  resolve(out, 'metadata.json'),
  JSON.stringify(metadata, null, 2),
);
await writeFile(
  resolve(out, 'index.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Markdown interaction comparison</title>
<link rel="stylesheet" href="A.css"><link rel="stylesheet" href="B.css">
<style>:root{--carbon:#292927;--ink-muted:#6e655a;--font-sans:Arial,sans-serif}body{background:#eee7db;color:#292927;font-family:Arial;margin:24px}button{padding:10px}#stage{width:1100px;min-height:650px;position:relative}#stage>.about-notebook{width:1100px;height:650px}pre{white-space:pre-wrap}</style>
<h1>Markdown content interactions</h1><p>Production React, shipped sample content. Parse counts and synchronous React/DOM work; no spacecraft renderer.</p>
<button id="verify">Check equivalent markup</button> <button id="run">Run ABBA, BAAB</button>
<pre id="status">Ready</pre><pre id="result"></pre><main id="stage"></main>
<script type="module">
import * as A from './A.js'; import * as B from './B.js';
const variants={A,B},stage=document.querySelector('#stage'),result=document.querySelector('#result'),status=document.querySelector('#status');
const modes=['notebook-warm','reading-repeat','studio-pages','live-edits','notebook-saturated'];
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight,devicePixelRatio],method:'Production React/DOM; 60 updates per capture; ABBA then BAAB; 10-minute budget; synchronous flushSync only, excludes paint and asynchronous layout effects',verification:[],captures:[]};
function save(){result.textContent=JSON.stringify(report);}
async function mounted(variant,mode,salt){const api=variants[variant]; const start=performance.now(),before=api.counts(); const driver=api.driver(stage,mode,salt); driver.step(0); const mountMs=performance.now()-start,mountParses=api.counts()-before; await frame();await frame();return{api,driver,mountMs,mountParses};}
document.querySelector('#verify').onclick=async()=>{
  try{for(const mode of modes){let reference;for(const variant of ['A','B']){const {driver}=await mounted(variant,mode,'verify');driver.step(1);await frame();await frame();const html=stage.innerHTML;if(reference!==undefined&&html!==reference)throw Error(mode+' markup differs');reference=html;driver.close();}report.verification.push({mode,equal:true});}status.textContent='Markup equivalent';save();}catch(error){status.textContent=String(error);}
};
document.querySelector('#run').onclick=async()=>{
  const button=document.querySelector('#run');button.disabled=true;
  const deadline=performance.now()+600000;
  try{
    if(report.verification.length!==modes.length)throw Error('Run equivalence check first');
    for(const mode of modes){
      for(const variant of ['A','B']){const {driver}=await mounted(variant,mode,'warmup');for(let i=0;i<30;i++)driver.step(i);driver.close();}
      for(const [block,order] of ['ABBA','BAAB'].entries())for(let index=0;index<order.length;index++){
        if(performance.now()>deadline)throw Error('Timing budget reached');
        const variant=order[index];status.textContent=mode+' '+(block+1)+' '+index+' '+variant;
        await pause(250);
        const {api,driver,mountMs,mountParses}=await mounted(variant,mode,mode+'-'+block+'-'+index);
        const before=api.counts(),samples=[];
        for(let i=0;i<60;i++){await frame();const start=performance.now();driver.step(i);samples.push(performance.now()-start);}
        report.captures.push({mode,block: block+1,index,variant,mountMs,mountParses,parses:api.counts()-before,samples,mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:[...samples].sort((a,b)=>a-b)[Math.ceil(samples.length*.95)-1]});
        driver.close();save();
      }
    }
    status.textContent='Complete';
  }catch(error){status.textContent=String(error);save();}finally{button.disabled=false;}
};
</script></html>`,
);
console.log(`Comparison written to ${out}`);
