// Gods · testes da 0.45: a Era da Informação (a TV, o centro de computação, o sonho, a Grande Pane).
// Uso: node test/informacao-test.js
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
  check('a Era da Informação é a décima segunda idade', E.IDADES[11] && E.IDADES[11].nome === 'Era da Informação' && E.IDADES[11].marco.join() === 'televisao,centrodados');
  const S = mundo(42, 530, 9);
  S.god.saber = S.god.saber || {}; S.god.saber.escrita = S.t;
  check('na Era Elétrica ainda não', Ci.openWhy(S, 'televisao') !== '' && Ci.openWhy(S, 'centrodados') !== '');
  S.eras.idade = 10;
  ergue(S, 'marcenaria'); ergue(S, 'ferraria');
  check('a TV pede o rádio', /rádio/.test(Ci.openWhy(S, 'televisao') || ''), Ci.openWhy(S, 'televisao'));
  check('o centro de computação abre com 300 pessoas', Ci.openWhy(S, 'centrodados') === '', Ci.openWhy(S, 'centrodados'));
  ergue(S, 'fabrica'); ergue(S, 'usina'); ergue(S, 'radio');
  check('com o rádio, a TV abre', Ci.openWhy(S, 'televisao') === '', Ci.openWhy(S, 'televisao'));
  const de0 = E.descMult(S), pr0 = E.pratMult(S);
  ergue(S, 'televisao');
  check('com a TV, o povo reclama 15% menos', Math.abs(E.descMult(S) - de0 * C.TV_DESC) < 1e-9);
  ergue(S, 'centrodados');
  check('com o centro de computação, aprende 40% mais depressa', Math.abs(E.pratMult(S) - pr0 * C.COMPUTA_PRAT) < 1e-9);
  check('com as duas obras e 520 pessoas, a idade passa', (E.daily(S), E.idade(S) === 11) && S.chron.some((c) => /Era da Informação/.test(c.text)), E.faltaWhy(S));
  // a Grande Pane: sem biblioteca, o aprendizado cai pela metade por uns dias
  S.eras.prox = { crise: S.t * 9 + 1e9, apagao: S.t * 9 + 1e9, greve: S.t * 9 + 1e9 };
  const K0 = C.ERA_PANE; C.ERA_PANE = 1e6;
  const p1 = E.pratMult(S);
  E.daily(S);
  check('a pane: o aprendizado pela metade', S.eras.pane > S.t && Math.abs(E.pratMult(S) - p1 * C.PANE_PRAT) < 1e-9 && S.chron.some((c) => /Grande Pane/.test(c.text)));
  S.t += (C.PANE_D + 1) * DAYM; S.ck = Sim.clock(S.t);
  check('passada a pane, volta ao normal', Math.abs(E.pratMult(S) - p1) < 1e-9);
  S.eras.prox.pane = 0; S.eras.pane = 0;
  const nivel0 = Ci.nivel; Ci.nivel = (s, k) => (k === 'biblioteca' ? 1 : nivel0(s, k));
  E.daily(S);
  Ci.nivel = nivel0;
  check('com biblioteca, nada se perde', !(S.eras.pane > S.t) && S.chron.some((c) => /livros de papel/.test(c.text)));
  C.ERA_PANE = K0;
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda as obras e a idade', E.idade(R) === 11 && R.buildings.some((b) => b.type === 'centrodados' && b.built));
}
// o conselho chega pelo sonho
{
  const S = mundo(9, 4, 10);
  S.eras.ordem = 'conselho'; S.eras.magia = { runas: 1, ervas: 1, circulos: 1, estrelas: 1, mares: 1, cantos: 1, seiva: 1, raio: 1, eco: 1 };
  ergue(S, 'marcenaria');
  check('com o eco, a TV abre sem rádio', Ci.openWhy(S, 'televisao') === '', Ci.openWhy(S, 'televisao'));
  const pr = E.pratMult(S), de = E.descMult(S);
  S.eras.ordemT = S.t;   // o rumo não muda no meio do teste (o povo é pequeno)
  for (let d = 0; d < 12 && !S.eras.magia.sonho; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); E.daily(S); }
  check('o conselho aprende o sonho na Era Moderna', !!S.eras.magia.sonho && S.chron.some((c) => /sonho/.test(c.text)));
  check('o sonho apressa e acalma', E.pratMult(S) > pr && E.descMult(S) < de);
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
