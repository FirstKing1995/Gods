// Gods · testes da 0.35: as construções mudam de forma com a idade (o nome, o abrigo, a reforma, o save).
// Uso: node test/formas-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Save } = G;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, idade) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  Sim.refresh(S); E.init(S);
  S.eras.idade = idade || 0;
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
  const nomes = [0, 2, 4, 6, 7, 8, 9, 10].map((e) => { const f = E.formaCasa(e); return f ? E.CASAS[f].name : 'Barraca simples'; });
  check('oito formas de casa, todas diferentes', new Set(nomes).size === 8, nomes.join(', '));
  check('a idade 0 e 1 ainda são de barraca', E.formaCasa(0) === 0 && E.formaCasa(1) === 0);
  check('as oficinas têm três formas', E.formaObra(3) === 0 && E.formaObra(4) === 1 && E.formaObra(7) === 2 && E.formaObra(9) === 3);
  for (let f = 1; f < E.CASAS.length; f++) check('a forma ' + f + ' abriga igual ou mais que a anterior', f === 1 || (E.CASAS[f].cap >= E.CASAS[f - 1].cap && E.CASAS[f].heat > E.CASAS[f - 1].heat));
}
{
  const S = mundo(42, 0);
  const b = ergue(S, 'barraca');
  check('na Pedra Lascada, barraca simples', Sim.def(b).name === 'Barraca simples' && Sim.def(b).cap === C.BUILD.barraca.cap);
  check('a barraca tem melhoria', Sim.upgrades(S, b).length === 1);
  S.eras.idade = 2; E.reforma(S);
  check('no Bronze a reforma a transforma em cabana', Sim.def(b).name === 'Cabana' && b.era === 2 && b.reformT === S.t);
  b.era = 10;
  const d = Sim.def(b);
  check('na Era Moderna é prédio, com 12 lugares', d.name === 'Prédio de apartamentos' && d.cap === 12 && d.a === 'o');
  check('e não oferece mais virar barraca avançada', Sim.upgrades(S, b).length === 0);
  check('o desenho de sempre continua intacto na tabela', Sim.defOf('barraca', 1, null).name === 'Barraca simples');
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  const r = R.buildings.find((x) => x.id === b.id);
  check('o save guarda a forma', Sim.def(r).name === 'Prédio de apartamentos');
}
{
  const S = mundo(7, 8);
  const b = ergue(S, 'barraca');
  check('a obra nova já nasce no jeito da idade', b.era === 8 && Sim.def(b).name === 'Casa de tijolo');
  const a = ergue(S, 'armazem');
  check('a oficina também guarda a idade', a.era === 8);
}
// a casa do lugar não encolhe e espera a forma seguinte
{
  const S = mundo(9, 0);
  const b = ergue(S, 'barraca');
  b.lv = 3; b.kind = 'oca';
  b.era = 2;
  check('a oca segue oca na forma da cabana', Sim.def(b).name === 'Oca');
  b.era = 4;
  check('na forma seguinte vira casa, sem perder os 12 lugares', Sim.def(b).name === 'Casa de madeira e taipa' && Sim.def(b).cap === 12);
}
// save antigo: sem era, tudo como era
{
  const S = mundo(11, 0);
  const b = ergue(S, 'barraca');
  delete b.era;
  check('a obra de save antigo sem idade continua barraca', Sim.def(b).name === 'Barraca simples');
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
