// Gods · testes da 0.47: a Era Espacial (o observatório, a base de lançamento, os astros, a chuva de meteoros, o foguete).
// Uso: node test/espaco-test.js
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
  check('a Era Espacial é a décima quarta e última idade', E.IDADES[13] && E.IDADES[13].nome === 'Era Espacial' && E.IDADES[13].marco.join() === 'observatorio,foguete' && !E.IDADES[14]);
  const S = mundo(42, 730, 11);
  S.god.saber = S.god.saber || {}; S.god.saber.escrita = S.t;
  check('na Era da Informação ainda não', Ci.openWhy(S, 'observatorio') !== '' && Ci.openWhy(S, 'foguete') !== '');
  S.eras.idade = 12;
  ergue(S, 'marcenaria'); ergue(S, 'ferraria');
  check('o observatório pede a mente da cidade', /mente/.test(Ci.openWhy(S, 'observatorio') || ''), Ci.openWhy(S, 'observatorio'));
  check('a base de lançamento abre com 500 pessoas', Ci.openWhy(S, 'foguete') === '', Ci.openWhy(S, 'foguete'));
  ergue(S, 'mente');
  check('com a mente da cidade, o observatório abre', Ci.openWhy(S, 'observatorio') === '', Ci.openWhy(S, 'observatorio'));
  const pr0 = E.pratMult(S);
  ergue(S, 'observatorio');
  check('com o observatório, aprende 20% mais depressa', Math.abs(E.pratMult(S) - pr0 * C.OBSERV_PRAT) < 1e-9);
  ergue(S, 'robotica');
  for (let k = 0; k < 3 && E.idade(S) < 13; k++) E.daily(S);
  check('com o observatório e 720 pessoas, a idade passa', E.idade(S) === 13 && S.chron.some((c) => /Era Espacial/.test(c.text)), E.faltaWhy(S));
  check('é a última idade', /última/.test(E.faltaWhy(S)));
  // a chuva de meteoros: com observatório, ninguém se fere
  S.eras.prox = { crise: S.t * 9 + 1e9, apagao: S.t * 9 + 1e9, greve: S.t * 9 + 1e9, pane: S.t * 9 + 1e9, parada: S.t * 9 + 1e9 };
  const K0 = C.ERA_METEOROS; C.ERA_METEOROS = 1e6;
  E.daily(S);
  check('com observatório, o povo vê antes', S.chron.some((c) => /meteoros/.test(c.text) && /ninguém se feriu/.test(c.text)) && !S.buildings.some((b) => b.fogo));
  // o foguete: pronta a base, o povo sobe, uma vez só
  check('antes da base, ninguém subiu', !E.lancou(S));
  const g0 = S.god.glory || 0;
  Object.assign(S.stock, { ferro: 200, carvao: 200 });
  ergue(S, 'foguete');
  E.daily(S);
  check('pronta a base, o foguete sobe e a crônica conta', E.lancou(S) && S.chron.some((c) => /chegou às estrelas/.test(c.text)));
  check('Deus ganha a glória do povo', (S.god.glory || 0) - g0 >= C.FOGUETE_GLORIA);
  const n = S.chron.filter((c) => /chegou às estrelas/.test(c.text)).length;
  E.daily(S);
  check('sobe uma vez só', S.chron.filter((c) => /chegou às estrelas/.test(c.text)).length === n);
  C.ERA_METEOROS = K0;
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save lembra que o povo subiu', E.lancou(R) && E.idade(R) === 13);
}
// sem observatório, os meteoros queimam
{
  const S = mundo(7, 30, 13);
  for (let k = 0; k < 4; k++) ergue(S, 'barraca');
  S.eras.prox = {}; S.eras.ordem = 'reino'; S.eras.ordemT = S.t;
  const K0 = C.ERA_METEOROS; C.ERA_METEOROS = 1e6;
  G.Cidade.init && G.Cidade.init(S);
  E.daily(S);
  C.ERA_METEOROS = K0;
  check('sem observatório, obras pegam fogo', S.chron.some((c) => /chuva de meteoros caiu/.test(c.text)) && S.buildings.some((b) => b.fogo), S.chron.map((c) => c.text).filter((t) => /meteoro/.test(t)).join(' | '));
}
// o conselho chega pelos astros
{
  const S = mundo(9, 4, 12);
  S.eras.ordem = 'conselho'; S.eras.ordemT = S.t; S.eras.magia = { runas: 1, ervas: 1, circulos: 1, estrelas: 1, mares: 1, cantos: 1, seiva: 1, raio: 1, eco: 1, sonho: 1, espiritos: 1 };
  ergue(S, 'marcenaria');
  check('com os espíritos, o observatório abre sem a mente', Ci.openWhy(S, 'observatorio') === '', Ci.openWhy(S, 'observatorio'));
  const pr = E.pratMult(S);
  for (let d = 0; d < 12 && !S.eras.magia.astros; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); E.daily(S); }
  check('o conselho aprende os astros na Era da IA', !!S.eras.magia.astros);
  check('os astros apressam o aprendizado', E.pratMult(S) > pr);
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
