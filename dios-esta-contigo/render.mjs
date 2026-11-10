// Renderiza la animación fotograma a fotograma con Chromium (WebGL) vía Playwright.
//   node render.mjs --still 3,12.5,30 [--out dir]      fotogramas sueltos (segundos)
//   node render.mjs --from 0 --to 1800 --out frames     rango de fotogramas (30 fps)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Playwright puede estar instalado en el proyecto o de forma global
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), '/opt/node-tools/node_modules', ...(process.env.NODE_PATH || '').split(':')] }));

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const FPS = 30;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
const scale = Number(arg('scale', 1));
const page = await browser.newPage({ viewport: { width: 1080 * scale, height: 1920 * scale }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/anim/index.html?${arg('q', '')}`);
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
if (scale !== 1) await page.evaluate((s) => { document.getElementById('stage').style.zoom = s; }, scale);

const out = path.resolve(arg('out', 'frames')); fs.mkdirSync(out, { recursive: true });
const shot = async (t, file) => {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, type: 'jpeg', quality: Number(arg('quality', 94)) });
};
const still = arg('still');
if (still) {
  for (const s of still.split(',')) { const t0 = Date.now(); await shot(Number(s), path.join(out, `t${Number(s).toFixed(2).padStart(5, '0')}.jpg`)); console.log('t=' + s, Date.now() - t0, 'ms'); }
} else {
  const from = Number(arg('from', 0)), to = Number(arg('to', 60 * FPS)), t0 = Date.now();
  for (let f = from; f < to; f++) {
    await shot((f + 0.5) / FPS, path.join(out, `f${String(f).padStart(5, '0')}.jpg`));
    if ((f - from) % 60 === 59) console.log(`frame ${f + 1}/${to}  ${((Date.now() - t0) / (f - from + 1)).toFixed(0)} ms/frame`);
  }
}
await browser.close(); server.close();
