/** Developer-only responsive browser fixture. The iframe has a real layout
 * viewport; CSS scales its presentation to fit an unresizable hidden browser.
 * Read-only local proxy preserves CSP and keeps parent/iframe same-origin.
 */
import { createServer, request } from 'node:http';

const wrapper = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio responsive review</title><style>
body{margin:0;background:#202631;color:#e8e3d7;font:14px system-ui}header{height:58px;display:flex;align-items:center;gap:12px;padding:0 16px}select{padding:7px;background:#344050;color:inherit;border-radius:6px}main{position:relative;margin:auto}iframe{border:0;position:absolute;top:0;left:0;transform-origin:top left;background:#07101f}
</style></head><body><header><label>Viewport <select id="viewport"><option value="1280,720">Desktop 1280 × 720</option><option value="1440,900">Laptop 1440 × 900</option><option value="2560,1080">Ultrawide 2560 × 1080</option><option value="1024,768">Tablet landscape 1024 × 768</option><option value="768,1024">Tablet portrait 768 × 1024</option><option value="390,844">Phone portrait 390 × 844</option><option value="844,390">Phone landscape 844 × 390</option><option value="360,800">Small phone 360 × 800</option></select></label><label>Room <select id="room"><option value="/">Overview</option><option value="/projects">Projects</option><option value="/about">About</option><option value="/case-studies">Case studies</option><option value="/contact">Contact</option></select></label><span id="status"></span></header><main><iframe title="Live portfolio" src="/"></iframe></main><script>
const viewport=document.querySelector('#viewport'),frame=document.querySelector('iframe'),main=document.querySelector('main');
function resize(){const[w,h]=viewport.value.split(',').map(Number);const scale=Math.min((innerWidth-32)/w,(innerHeight-74)/h,1);frame.style.width=w+'px';frame.style.height=h+'px';frame.style.transform='scale('+scale+')';main.style.width=w*scale+'px';main.style.height=h*scale+'px';document.querySelector('#status').textContent=w+' × '+h+' actual layout · '+Math.round(scale*100)+'% preview';document.body.dataset.viewport=JSON.stringify({width:w,height:h,scale});}
viewport.onchange=resize;document.querySelector('#room').onchange=event=>frame.src=event.target.value;addEventListener('resize',resize);resize();
</script></body></html>`;

const server = createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405);
    res.end('Read-only review fixture');
    return;
  }
  if (req.url?.split('?')[0] === '/__viewport') {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store',
    });
    res.end(wrapper);
    return;
  }
  const upstream = request(
    {
      hostname: 'localhost',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3000' },
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, {
        ...response.headers,
        'cache-control': 'no-store',
      });
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('Start the local portfolio on port 3000 first.');
  });
  req.pipe(upstream);
});
server.listen(3018, '127.0.0.1', () =>
  console.log('Responsive review: http://127.0.0.1:3018/__viewport'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
