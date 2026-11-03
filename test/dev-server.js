// Servidor local para testar o jogo com contas: serve os arquivos e imita o Apps Script em /exec.
// Uso: node test/dev-server.js [porta]  →  abra http://localhost:PORTA/?api=http://localhost:PORTA/exec
const http = require('http');
const fs = require('fs');
const path = require('path');
const { makeGas } = require('./gas-mock');
const root = path.join(__dirname, '..');
let shift = 0;
// 0.25: a IA de mentira responde no formato de cada tipo (para ver as telas sem gastar a cota do Groq)
const IA_TESTE = (url, o) => {
  const sys = JSON.parse(o.payload).messages[0].content;
  const t = /"Nome: fala"/.test(sys) ? 'Iara: Você viu o rio hoje?\nAruã: Vi. Está mais cheio que ontem.\nIara: Então amanhã a pesca rende.'
    : /"Nome: " e o nome que o povo/.test(sys) ? 'Nome: Fio-de-Embira\nCeci torceu a fibra até os dedos arderem, e o fio aguentou o peso de uma criança.'
    : /"Nome: ". Depois/.test(sys) ? 'Nome: Casa do Primeiro Fogo\nFoi ali que o povo dormiu pela primeira vez sem medo da noite.'
    : /"Título: "/.test(sys) ? 'Título: Quando a Pedra Aprendeu a Cortar\nContam os velhos que, no começo, a pedra era surda. Até que um homem bateu nela com paciência, e ela respondeu com um gume.'
    : 'Estou aqui, Deus. A noite foi fria, mas o fogo segurou.';
  return { code: 200, body: { choices: [{ message: { content: t } }] } };
};
const g = makeGas({ now: () => Date.now() + shift, fetch: IA_TESTE });
g.ctx.setup();
g.gas._props.set('GROQ_API_KEY', 'teste-local');   // 0.24: a voz responde com a fala de teste do gas-mock
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
