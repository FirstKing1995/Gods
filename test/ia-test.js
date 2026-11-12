// Gods · testes da 0.46: a Era da Inteligência Artificial (os robôs, a mente da cidade, os espíritos, as máquinas paradas).
// Uso: node test/ia-test.js
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
  check('a Era da IA é a décima terceira idade', E.IDADES[12] && E.IDADES[12].nome === 'Era da Inteligência Artificial' && E.IDADES[12].marco.join() === 'robotica,mente');
  const S = mundo(42, 630, 10);
  S.god.saber = S.god.saber || {}; S.god.saber.escrita = S.t;
  check('na Era Moderna ainda não', Ci.openWhy(S, 'robotica') !== '' && Ci.openWhy(S, 'mente') !== '');
  S.eras.idade = 11;
  ergue(S, 'marcenaria'); ergue(S, 'ferraria');
  check('os robôs pedem o centro de computação', /computação/.test(Ci.openWhy(S, 'robotica') || ''), Ci.openWhy(S, 'robotica'));
  check('a mente da cidade abre com 400 pessoas', Ci.openWhy(S, 'mente') === '', Ci.openWhy(S, 'mente'));
  ergue(S, 'centrodados');
  check('com o centro de computação, os robôs abrem', Ci.openWhy(S, 'robotica') === '', Ci.openWhy(S, 'robotica'));
  const mar = S.buildings.find((b) => b.type === 'marcenaria'), t0 = O.minutesOf(S, 'tabuas', mar), p = S.people[2], ca0 = T.carryMult(S, p);
  const cr0 = E.crimeMult(S), fe0 = E.febreMult(S), de0 = E.descMult(S);
  ergue(S, 'robotica');
  check('com os robôs, as oficinas 40% mais depressa', Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.ROBO_OFICIO) < 1e-6);
  check('e cada um carrega 20% mais', Math.abs(T.carryMult(S, p) - ca0 * C.ROBO_CARGA) < 1e-9);
  ergue(S, 'mente');
  check('com a mente da cidade, o malfeito cai 40%', Math.abs(E.crimeMult(S) - cr0 * C.MENTE_CRIME) < 1e-9);
  check('a febre pesa 30% menos', Math.abs(E.febreMult(S) - fe0 * C.MENTE_FEBRE) < 1e-9);
  check('a queixa cresce 10% menos', Math.abs(E.descMult(S) - de0 * C.MENTE_DESC) < 1e-9);
  ergue(S, 'televisao');
  for (let k = 0; k < 3 && E.idade(S) < 12; k++) E.daily(S);
  check('com as duas obras e 620 pessoas, a idade passa', E.idade(S) === 12 && S.chron.some((c) => /Inteligência Artificial/.test(c.text)), E.faltaWhy(S));
  // as máquinas param: sem escola, as oficinas pela metade
  S.eras.prox = { crise: S.t * 9 + 1e9, apagao: S.t * 9 + 1e9, greve: S.t * 9 + 1e9, pane: S.t * 9 + 1e9 };
  const K0 = C.ERA_PARADA; C.ERA_PARADA = 1e6;
  const t1 = O.minutesOf(S, 'tabuas', mar);
  E.daily(S);
  check('as máquinas param: oficinas pela metade', S.eras.parada > S.t && Math.abs(O.minutesOf(S, 'tabuas', mar) - t1 / C.PARADA_OFICIO) < 1e-6 && S.chron.some((c) => /máquinas pararam/.test(c.text)));
  S.t += (C.PARADA_D + 1) * DAYM; S.ck = Sim.clock(S.t);
  check('passada a parada, volta ao normal', Math.abs(O.minutesOf(S, 'tabuas', mar) - t1) < 1e-6);
  S.eras.prox.parada = 0; S.eras.parada = 0;
  const nivel0 = Ci.nivel; Ci.nivel = (s, k) => (k === 'escola' ? 1 : nivel0(s, k));
  E.daily(S);
  Ci.nivel = nivel0;
  check('com escola, o serviço segue', !(S.eras.parada > S.t) && S.chron.some((c) => /ofício à mão/.test(c.text)));
  C.ERA_PARADA = K0;
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda as obras e a idade', E.idade(R) === 12 && R.buildings.some((b) => b.type === 'mente' && b.built));
}
// o conselho chega pelos espíritos
{
  const S = mundo(9, 4, 11);
  S.eras.ordem = 'conselho'; S.eras.ordemT = S.t; S.eras.magia = { runas: 1, ervas: 1, circulos: 1, estrelas: 1, mares: 1, cantos: 1, seiva: 1, raio: 1, eco: 1, sonho: 1 };
  ergue(S, 'marcenaria');
  check('com o sonho, os robôs abrem sem computador', Ci.openWhy(S, 'robotica') === '', Ci.openWhy(S, 'robotica'));
  const cr = E.crimeMult(S), of = E.oficioMult(S);
  for (let d = 0; d < 12 && !S.eras.magia.espiritos; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); E.daily(S); }
  check('o conselho aprende os espíritos na Era da Informação', !!S.eras.magia.espiritos);
  check('os espíritos apressam as oficinas e vigiam', E.oficioMult(S) > of && E.crimeMult(S) < cr);
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
