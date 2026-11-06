// Gods · testes da 0.34: a Era Moderna (o rádio, a garagem, o hospital geral, o eco, a Grande Crise).
// Uso: node test/moderna-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Tribos: Tb, Tech: T, Obras: O, Save } = G;
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
  Object.assign(S.stock, { ferro: 120, carvao: 120, pedra: 600, tabuas: 400, madeira: 200 });
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
  check('a Era Moderna é a décima primeira idade', E.IDADES[10] && E.IDADES[10].nome === 'Era Moderna' && E.IDADES[10].marco.join() === 'radio,hospitalgeral');
  const S = mundo(42, 230, 8);
  check('na Revolução Industrial ainda não', Ci.openWhy(S, 'radio') !== '' && Ci.openWhy(S, 'garagem') !== '' && Ci.openWhy(S, 'hospitalgeral') !== '');
  S.eras.idade = 9;
  check('o rádio e a garagem pedem a usina', /usina/.test(Ci.openWhy(S, 'radio') || '') && /usina/.test(Ci.openWhy(S, 'garagem') || ''));
  ergue(S, 'marcenaria'); ergue(S, 'ferraria');
  check('o hospital geral abre com 220 pessoas (e a marcenaria)', Ci.openWhy(S, 'hospitalgeral') === '', Ci.openWhy(S, 'hospitalgeral'));
  ergue(S, 'fabrica'); ergue(S, 'usina');
  check('com a usina, o rádio e a garagem abrem', Ci.openWhy(S, 'radio') === '' && Ci.openWhy(S, 'garagem') === '', Ci.openWhy(S, 'radio'));
  const cr0 = E.crimeMult(S), fe0 = E.febreMult(S), p = S.people[2], ca0 = T.carryMult(S, p), mar = S.buildings.find((b) => b.type === 'marcenaria'), t0 = O.minutesOf(S, 'tabuas', mar);
  ergue(S, 'radio');
  check('com o rádio, o malfeito cai 20%', Math.abs(E.crimeMult(S) - cr0 * C.RADIO_CRIME) < 1e-9);
  ergue(S, 'garagem');
  check('com a garagem, cada um carrega 30% mais', Math.abs(T.carryMult(S, p) - ca0 * C.GARAGEM_CARGA) < 1e-9);
  ergue(S, 'hospitalgeral');
  check('com o hospital geral, a febre pesa a metade', Math.abs(E.febreMult(S) - fe0 * C.HGERAL_FEBRE) < 1e-9);
  // a Grande Crise: sem mercado, as oficinas caem; o rádio acalma
  S.eras.idade = 10; S.eras.prox = { apagao: S.t * 9 + 1e9, greve: S.t * 9 + 1e9 }; S.eras.ordem = 'reino';
  const K0 = C.ERA_CRISE; C.ERA_CRISE = 1e6;
  const d0 = S.people.reduce((a, q) => a + (q.desc || 0), 0);
  E.daily(S);
  check('a crise: oficinas devagar por uns dias', S.eras.crise > S.t && Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.CRISE_OFICIO) < 1e-6 && S.chron.some((c) => /Grande Crise/.test(c.text)));
  check('com rádio, o povo não se revolta', S.people.reduce((a, q) => a + (q.desc || 0), 0) === d0 && S.chron.some((c) => /rádio acalmou/.test(c.text)));
  S.t += (C.CRISE_D + 1) * DAYM; S.ck = Sim.clock(S.t);
  check('passada a crise, as oficinas voltam', Math.abs(O.minutesOf(S, 'tabuas', mar) - t0) < 1e-6);
  // com mercado, a vila atravessa
  S.eras.prox.crise = 0; S.eras.crise = 0;
  const nivel0 = Ci.nivel; Ci.nivel = (s, k) => (k === 'mercado' ? 1 : nivel0(s, k));
  E.daily(S);
  Ci.nivel = nivel0;
  check('com mercado, a vila atravessa sem parar', !(S.eras.crise > S.t) && S.chron.some((c) => /atravessou sem parar/.test(c.text)));
  C.ERA_CRISE = K0;
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda as obras e a idade', E.temRadio(R) && E.cargaMult(R) === C.GARAGEM_CARGA && E.idade(R) === 10);
}
// sem rádio, a crise revolta
{
  const S = mundo(7, 6, 10);
  S.eras.prox = {}; S.eras.ordem = 'reino';
  const K0 = C.ERA_CRISE; C.ERA_CRISE = 1e6;
  E.daily(S);
  C.ERA_CRISE = K0;
  check('sem rádio, a praça enche de gente brava', S.chron.some((c) => /gente brava/.test(c.text)));
}
// o conselho chega pelo eco, e o raio abre o rádio sem usina
{
  const S = mundo(9, 4, 9);
  S.eras.ordem = 'conselho'; S.eras.magia = { runas: 1, ervas: 1, circulos: 1, estrelas: 1, mares: 1, cantos: 1, seiva: 1, raio: 1 };
  ergue(S, 'marcenaria');   // o rádio pede tábuas, como toda obra de tábua
  check('com o relâmpago, o rádio abre sem usina', Ci.openWhy(S, 'radio') === '', Ci.openWhy(S, 'radio'));
  check('sem o eco, o conselho não tem a voz', !E.temRadio(S));
  S.eras.magia.eco = 1;
  check('com o eco, tem, sem rádio nenhum', E.temRadio(S) && !S.buildings.some((b) => b.type === 'radio'));
}
// ---------- o rádio liga as tribos ----------
{
  const A = mundo(777, 2, 9);
  A.god.lv = 2; A.god.poder = 500;
  const B = Tb.criar(A);
  for (const t of [A, B]) { Sim.refresh(t); E.init(t); t.eras.idade = 9; t.eras.magia = t.eras.magia || {}; t.eras.magia.raio = 1; Object.assign(t.stock, { ferro: 60, pedra: 200, tabuas: 150, madeira: 200 }); ergue(t, 'radio'); }
  const par = Tb.par(A, A, B);
  Tb.passo(A); A.t += 60; B.t += 60; Tb.passo(A);
  check('duas tribos com rádio se conhecem de longe', par.contato && par.hist.some((h) => /rádio/.test(h.txt)));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
