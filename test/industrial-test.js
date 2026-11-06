// Gods · testes da 0.32: a Revolução Industrial (a fábrica, a estação, a seiva, a Greve).
// Uso: node test/industrial-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Tribos: Tb, Tech: T, Obras: O, Minas: Mi } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, n, idade) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  for (let k = 0; k < (n || 0); k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1; q.y = S.camp.y + 2; S.people.push(q); }
  G.Family.init(S); Sim.refresh(S); E.init(S);
  S.eras.idade = idade || 0;
  Object.assign(S.stock, { ferro: 60, carvao: 60, pedra: 200, tabuas: 150, madeira: 200 });
  S.tech.known.metalurgia = { t: S.t, by: 'teste', how: 'pratica' };
  return S;
}
function ergue(S, t) {
  for (let r = 3; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); Sim.complete(S, b); Sim.refresh(S); return b; }
  }
  return null;
}

{
  check('a Revolução Industrial é a nona idade', E.IDADES[8] && E.IDADES[8].nome === 'Revolução Industrial' && E.IDADES[8].marco.join() === 'fabrica,estacao');
  const S = mundo(42, 130, 6);
  check('nas Navegações ainda não', Ci.openWhy(S, 'fabrica') !== '' && Ci.openWhy(S, 'estacao') !== '');
  S.eras.idade = 7;
  check('a fábrica pede a ferraria', /ferraria/.test(Ci.openWhy(S, 'fabrica') || ''));
  ergue(S, 'marcenaria'); const ferr = ergue(S, 'ferraria');
  check('a estação abre com 120 pessoas (e a marcenaria)', Ci.openWhy(S, 'estacao') === '', Ci.openWhy(S, 'estacao'));
  check('com a ferraria, a fábrica abre', Ci.openWhy(S, 'fabrica') === '', Ci.openWhy(S, 'fabrica'));
  const mar = S.buildings.find((b) => b.type === 'marcenaria');
  const t0 = O.minutesOf(S, 'tabuas', mar), f0 = Mi.minutesOf(S, 'ferro', ferr);
  ergue(S, 'fabrica');
  check('com a fábrica, as tábuas saem ' + Math.round((C.FABRICA_OFICIO - 1) * 100) + '% mais depressa', Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.FABRICA_OFICIO) < 1e-6);
  check('e o ferro da ferraria também', Math.abs(Mi.minutesOf(S, 'ferro', ferr) - f0 / C.FABRICA_OFICIO) < 1e-6);
  const p = S.people[2], c0 = T.carryMult(S, p);
  ergue(S, 'estacao');
  check('com a estação, cada um carrega metade a mais', Math.abs(T.carryMult(S, p) - c0 * C.ESTACAO_CARGA) < 1e-9);
  // a Greve
  S.eras.idade = 8; S.eras.prox = {}; S.eras.ordem = 'reino';
  const G0 = C.ERA_GREVE; C.ERA_GREVE = 1e6;
  E.daily(S);
  check('a greve: as oficinas trabalham pela metade por uns dias', S.eras.greve > S.t && Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.FABRICA_OFICIO / C.GREVE_OFICIO) < 1e-6 && S.chron.some((c) => /Greve/.test(c.text)));
  S.t += (C.GREVE_D + 1) * DAYM; S.ck = Sim.clock(S.t);
  check('passada a greve, a fábrica volta', Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.FABRICA_OFICIO) < 1e-6);
  S.eras.prox = {}; S.eras.ordem = 'assembleia'; S.eras.ordemT = S.t; S.eras.greve = 0;   // o rumo não muda de novo neste ano
  E.daily(S);
  C.ERA_GREVE = G0;
  check('na assembleia, os operários são ouvidos e ninguém para', !(S.eras.greve > S.t) && S.chron.some((c) => /foram ouvidos/.test(c.text)));
}

// ---------- o trem liga as tribos ----------
{
  const A = mundo(777, 130, 7);
  A.god.lv = 2; A.god.poder = 500;
  const B = Tb.criar(A);
  for (let k = 0; k < 130; k++) { const q = Sim.makePerson(B, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][(k + 11) % 30], 25); q.x = B.camp.x + 1; q.y = B.camp.y + 2; B.people.push(q); }
  for (const t of [A, B]) { Sim.refresh(t); E.init(t); t.eras.idade = 7; Object.assign(t.stock, { ferro: 60, pedra: 200, tabuas: 150, madeira: 200 }); ergue(t, 'marcenaria'); ergue(t, 'estacao'); }
  const par = Tb.par(A, A, B);
  Tb.passo(A); A.t += 60; B.t += 60; Tb.passo(A);   // o primeiro passo só marca a hora
  check('duas tribos com estação se conhecem pelo trem', par.contato && par.hist.some((h) => /trilhos/.test(h.txt)), [A, B].map((t) => t.buildings.some((b) => b.type === 'estacao' && b.built)).join());
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
