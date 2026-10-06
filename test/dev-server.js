// Servidor local para testar o jogo com contas: serve os arquivos e imita o Apps Script em /exec.
// Uso: node test/dev-server.js [porta]  →  abra http://localhost:PORTA/?api=http://localhost:PORTA/exec
const http = require('http');
const fs = require('fs');
const path = require('path');
const { makeGas } = require('./gas-mock');
const root = path.join(__dirname, '..');
let shift = 0;
const g = makeGas({ now: () => Date.now() + shift });
g.ctx.setup();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const port = +process.argv[2] || 8787;
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const cors = { 'Access-Control-Allow-Origin': '*' };
  if (url.pathname === '/__shift') { shift += +(url.searchParams.get('ms') || 0); res.writeHead(200, cors); res.end(String(shift)); return; }
  if (url.pathname === '/exec') {
    if (req.method === 'OPTIONS') { res.writeHead(204, Object.assign({ 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' }, cors)); res.end(); return; }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const out = req.method === 'POST' ? g.ctx.doPost({ postData: { contents: body } }).getContent() : g.ctx.doGet({ parameter: Object.fromEntries(url.searchParams) }).getContent();
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      res.end(out);
    });
    return;
  }
  let p = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('não achei'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log('Gods em http://localhost:' + port + '/?api=http://localhost:' + port + '/exec'));
