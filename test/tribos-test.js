// Gods · testes da 0.28: as tribos. Nascer uma tribo nova, as duas no mesmo relógio e no mesmo mapa (sem andar o mapa
// duas vezes), o encontro, a relação (troca, mudança, roubo, guerra), o que Deus faz por ela, e o save com as duas.
// Uso: node test/tribos-test.js [anos]   (sem anos, só as unidades; com anos, uma rodada longa com as duas tribos)
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Tribos: Tb, Save, Deus: D } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  return S;
}
const passos = (ts, h) => { for (let i = 0; i < h * 30; i++) { for (const T of ts) Sim.step(T, 2); Tb.passo(ts[0]); for (const T of ts) T.events.length = 0; } };

// ---------- nascer ----------
const A = mundo(42);
check('no nível 1 não dá', /nível/.test(Tb.criarWhy(A) || ''));
A.god.lv = C.TRIBO_NIVEL; A.god.poder = 50;
check('sem Poder não dá', /Poder/.test(Tb.criarWhy(A) || ''));
A.god.poder = 500;
check('com nível e Poder, dá', !Tb.criarWhy(A), Tb.criarWhy(A));
const B = Tb.criar(A);
check('nasce um casal novo', B && B.people.length === 2 && B.people.every((p) => A.people.every((q) => q.name !== p.name)));
check('longe da primeira (' + C.TRIBO_DIST + ' passos ou quase)', B && Math.hypot(B.camp.x - A.camp.x, B.camp.y - A.camp.y) >= C.TRIBO_DIST * 0.65, B && Math.round(Math.hypot(B.camp.x - A.camp.x, B.camp.y - A.camp.y)));
check('o mesmo mapa, a mesma névoa, os mesmos bichos e o mesmo Deus', B.world === A.world && B.seen === A.seen && B.fauna === A.fauna && B.god === A.god);
check('o mesmo relógio', B.t === A.t);
check('custou o Poder', A.god.poder === 500 - C.TRIBO_CUSTO);
check('a Crônica conta', A.chron.some((c) => /casal novo/.test(c.text)) && B.chron.length > 0);
check('Tb.todas: as duas', Tb.todas(B).length === 2 && Tb.todas(A)[1] === B && Tb.raiz(B) === A);

// ---------- viver junto ----------
{
  const ts = [A, B], t0 = A.t;
  const fauna0 = JSON.stringify(A.fauna.ents.map((e) => [e.id, e.x, e.y]));
  passos(ts, 24);
  check('um dia: as duas no mesmo relógio', A.t === B.t && A.t === t0 + 24 * 60);
  check('as duas vivem (ninguém morre no primeiro dia)', A.people.every((p) => p.alive) && B.people.every((p) => p.alive));
  check('os bichos andam (uma vez só por passo)', JSON.stringify(A.fauna.ents.map((e) => [e.id, e.x, e.y])) !== fauna0);
}

// ---------- o encontro ----------
{
  const par = Tb.par(A, A, B);
  check('antes de se ver, não há relação', !par.contato);
  const p = A.people[0];
  p.x = B.camp.x + 3; p.y = B.camp.y + 3; p.px = p.x; p.py = p.y; p.path = null; p.act = null;
  Tb.passo(A); A.t += 60; B.t += 60; Tb.passo(A);
  check('alguém chega perto do acampamento da outra: se conhecem', par.contato, par.v);
  check('a Crônica das duas conta o encontro', A.chron.some((c) => /se viram/.test(c.text)) && B.chron.some((c) => /se viram/.test(c.text)));
}

// ---------- o que Deus faz pela relação ----------
{
  const par = Tb.par(A, A, B), v0 = par.v;
  A.god.poder = 500;
  check('sonho de irmandade: a relação sobe', Tb.influir(A, A, B, 'paz') && par.v === Math.min(100, v0 + C.TRIBO_INFLUI));
  check('uma vez por dia', !!Tb.influirWhy(A, A, B, 'discordia'));
  A.t += DAYM; B.t += DAYM;
  check('boato de discórdia: desce', Tb.influir(A, A, B, 'discordia') && par.v === Math.min(100, v0 + C.TRIBO_INFLUI) - C.TRIBO_INFLUI);
}

// ---------- os acontecimentos ----------
{
  const par = Tb.par(A, A, B);
  // amigos trocam
  A.stock.peixe = 200; B.stock.madeira = 150;
  par.v = 40; par.ult = {};
  let trocou = false;
  for (let d = 0; d < 20 && !trocou; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); trocou = par.hist.some((h) => /trocar/.test(h.txt)); }
  check('amigos trocam o que sobra', trocou && B.stock.peixe > 0, 'peixe em B: ' + B.stock.peixe);
  // inimigos roubam
  par.v = -40; par.ult = {}; A.stock.peixe = 200; B.stock.peixe = 0;
  let roubou = false;
  for (let d = 0; d < 30 && !roubou; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); roubou = par.hist.some((h) => /levou/.test(h.txt)); }
  check('inimigos roubam comida', roubou);
  // guerra (com gente bastante nos dois lados)
  for (const T of [A, B]) for (let k = 0; k < 6; k++) { const q = Sim.makePerson(T, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k + 5 + T.tribo.id * 7], 25); q.x = T.camp.x + 1; q.y = T.camp.y + 2; T.people.push(q); }
  for (const T of [A, B]) Sim.refresh(T);
  const vivos0 = A.people.filter((p) => p.alive).length + B.people.filter((p) => p.alive).length;
  par.v = -80; par.ult = {};
  let guerra = false;
  for (let d = 0; d < 30 && !guerra; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); guerra = par.hist.some((h) => /Guerra/.test(h.txt)); }
  const vivos1 = A.people.filter((p) => p.alive).length + B.people.filter((p) => p.alive).length;
  check('no fundo, guerra: morre gente dos dois lados, e vem a trégua', guerra && vivos1 < vivos0 && par.v === -20 && par.tregua > A.t, vivos0 + ' → ' + vivos1);
  check('quem morre na guerra tem a causa', A.people.concat(B.people).some((p) => !p.alive && p.cause === 'guerra'));
  // irmãos: alguém vai morar do outro lado
  par.v = 80; par.ult = {};
  const nA = A.people.filter((p) => p.alive).length, nB = B.people.filter((p) => p.alive).length;
  let mudou = false;
  for (let d = 0; d < 60 && !mudou; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); mudou = par.hist.some((h) => /foi morar/.test(h.txt)); }
  const nA2 = A.people.filter((p) => p.alive).length, nB2 = B.people.filter((p) => p.alive).length;
  check('irmãos: alguém vai morar com o outro povo', mudou && nA2 + nB2 === nA + nB && (nA2 !== nA), nA + '+' + nB + ' → ' + nA2 + '+' + nB2);
  check('quem chegou tem id novo, sem repetir', new Set(B.people.map((p) => p.id)).size === B.people.length && new Set(A.people.map((p) => p.id)).size === A.people.length);
}

// ---------- o save ----------
{
  const txt = JSON.stringify(Save.serialize(A));
  const d = JSON.parse(txt);
  check('o save leva a outra tribo, sem repetir o mapa', d.outras && d.outras.length === 1 && !d.outras[0].objD.length && d.outras[0].seen === null && d.outras[0].god === null);
  const A2 = Save.deserialize(d), B2 = A2.outras && A2.outras[0];
  check('ao abrir: as duas tribos, no mesmo mapa, névoa, bichos e Deus', !!B2 && B2.world === A2.world && B2.seen === A2.seen && B2.fauna === A2.fauna && B2.god === A2.god && B2.base === A2);
  check('ao abrir: a mesma gente e a mesma relação', B2.people.length === B.people.length && Tb.par(A2, A2, B2).v === Tb.par(A, A, B).v && Tb.par(A2, A2, B2).contato);
  let err = '';
  try { passos([A2, B2], 24); } catch (e) { err = e.stack; }
  check('ao abrir: as duas seguem vivendo', !err, err.slice(0, 300));
  // um save sem tribos (de antes da 0.28) abre igual
  const S0 = mundo(7), S1 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S0))));
  check('save sem tribos abre com uma tribo só', S1 && !S1.outras && Tb.todas(S1).length === 1);
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');

// ---------- rodada longa: duas tribos vivendo anos juntas ----------
const ANOS = +process.argv[2] || 0;
if (ANOS) {
  const X = mundo(777);
  X.god.lv = 2; X.god.poder = 500;
  for (let k = 0; k < 10; k++) { const q = Sim.makePerson(X, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k + 2], 22); q.x = X.camp.x + 1; q.y = X.camp.y + 2; X.people.push(q); }
  const Y = Tb.criar(X);
  for (let k = 0; k < 10; k++) { const q = Sim.makePerson(Y, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k + 14], 22); q.x = Y.camp.x + 1; q.y = Y.camp.y + 2; Y.people.push(q); }
  // o básico que o jogador marcaria (fogueira e barracas), como nas outras rodadas longas
  const ergue = (T, t, from) => { for (let r = from; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = T.camp.x + dx, y = T.camp.y + dy; if (!Sim.canPlace(T, t, x, y)) { const b = Sim.placeBlueprint(T, t, x, y); Sim.complete(T, b); if (t === 'fogueira') b.fuel = 8; return b; } } return null; };
  for (const T of [X, Y]) { ergue(T, 'fogueira', 2); for (let k = 0; k < 4; k++) ergue(T, 'barraca', 3); Object.assign(T.stock, { madeira: 80, peixe: 120, frutas: 60 }); T.stats.firstFire = true; }
  for (const T of [X, Y]) { for (const f of ['Family', 'God', 'Tech', 'Life', 'Campo', 'Minas']) if (G[f] && G[f].init) G[f].init(T); Sim.refresh(T); }
  const t0 = Date.now();
  let err = '';
  try {
    for (let d = 0; d < ANOS * C.YEAR_DAYS; d++) {
      if (d % 3 === 0) for (const T of [X, Y]) Object.assign(T.vontades, { madeira: 2, pesca: 3, frutas: 3, construir: 3, pedra: 2 });
      passos([X, Y], 24);
    }
  } catch (e) { err = e.stack; }
  const par = Tb.par(X, X, Y);
  console.log('\n' + ANOS + ' anos com duas tribos (' + Math.round((Date.now() - t0) / 1000) + ' s): primeira ' + X.people.filter((p) => p.alive).length + ' vivos, segunda ' + Y.people.filter((p) => p.alive).length +
    ' · contato ' + (par.contato ? 'sim' : 'não') + ' · relação ' + Math.round(par.v) + ' (' + Tb.palavra(par.v) + ')');
  for (const h of par.hist) console.log('  · ' + Sim.dateText(h.t) + ': ' + h.txt);
  check('anos com duas tribos, sem erro', !err, err.slice(0, 400));
  check('as duas tribos seguem vivas', X.people.some((p) => p.alive) && Y.people.some((p) => p.alive));
  check('cada tribo com o seu nome', !X.povo || !Y.povo || !X.povo.nome || X.povo.nome !== Y.povo.nome, (X.povo && X.povo.nome) + ' / ' + (Y.povo && Y.povo.nome));
  console.log('longo: ' + ok + ' ok, ' + bad + ' falhas');
}
process.exit(bad ? 1 : 0);
