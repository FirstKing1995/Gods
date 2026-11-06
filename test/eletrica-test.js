// Gods · testes da 0.33: a Era Elétrica (a usina, o bonde, o relâmpago, o Apagão) e o bicho preso no bolsão.
// Uso: node test/eletrica-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Tech: T, Obras: O, Fauna: Fa, Save } = G;
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
  Object.assign(S.stock, { ferro: 90, carvao: 90, pedra: 400, tabuas: 300, madeira: 200 });
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
  check('a Era Elétrica é a décima idade', E.IDADES[9] && E.IDADES[9].nome === 'Era Elétrica' && E.IDADES[9].marco.join() === 'usina,bonde');
  const S = mundo(42, 170, 7);
  check('na Pólvora e Imprensa ainda não', Ci.openWhy(S, 'usina') !== '' && Ci.openWhy(S, 'bonde') !== '');
  S.eras.idade = 8;
  check('a usina pede a fábrica', /fábrica/.test(Ci.openWhy(S, 'usina') || ''));
  ergue(S, 'marcenaria'); ergue(S, 'ferraria');
  check('o bonde abre com 160 pessoas (e a marcenaria)', Ci.openWhy(S, 'bonde') === '', Ci.openWhy(S, 'bonde'));
  const f = ergue(S, 'fabrica');
  check('com a fábrica, a usina abre', !!f && Ci.openWhy(S, 'usina') === '', Ci.openWhy(S, 'usina'));
  check('sem usina não há luz', !E.temLuz(S));
  const p0 = E.pratMult(S), d0 = E.descMult(S), mar = S.buildings.find((b) => b.type === 'marcenaria'), t0 = O.minutesOf(S, 'tabuas', mar);
  ergue(S, 'usina');
  check('com a usina, há luz', E.temLuz(S));
  check('com luz, aprende-se ' + Math.round((C.USINA_PRAT - 1) * 100) + '% mais depressa', Math.abs(E.pratMult(S) - p0 * C.USINA_PRAT) < 1e-9);
  check('e o descontentamento cresce menos', Math.abs(E.descMult(S) - d0 * C.USINA_DESC) < 1e-9);
  check('sem bonde, o passo é o de sempre', E.walkMult(S) === 1);
  ergue(S, 'bonde');
  check('com o bonde, todos andam 25% mais depressa', E.walkMult(S) === C.BONDE_ANDA);
  S.eras.idade = 9; S.eras.prox = {}; S.eras.ordem = 'reino';
  const A0 = C.ERA_APAGAO; C.ERA_APAGAO = 1e6;
  S.stock.carvao = 40;
  E.daily(S);
  check('com carvão guardado, a luz nem pisca', E.temLuz(S) && S.stock.carvao === 40 - C.APAGAO_CARVAO && S.chron.some((c) => /nem piscou/.test(c.text)));
  S.eras.prox = {}; S.stock.carvao = 0;
  E.daily(S);
  check('sem carvão, o apagão: sem luz e oficinas devagar', !E.temLuz(S) && Math.abs(O.minutesOf(S, 'tabuas', mar) - t0 / C.APAGAO_OFICIO) < 1e-6 && S.chron.some((c) => /Apagão/.test(c.text)));
  S.t += (C.APAGAO_D + 1) * DAYM; S.ck = Sim.clock(S.t);
  check('passado o apagão, a luz volta', E.temLuz(S));
  C.ERA_APAGAO = A0;
  const R = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda a usina, o bonde e a idade', E.temLuz(R) && E.walkMult(R) === C.BONDE_ANDA && E.idade(R) === 9);
}
// o conselho chega pelo relâmpago, sem usina
{
  const S = mundo(7, 4, 8);
  S.eras.ordem = 'conselho'; S.eras.magia = { runas: 1, ervas: 1, circulos: 1, estrelas: 1, mares: 1, cantos: 1, seiva: 1 };
  check('sem o relâmpago, o conselho não tem luz', !E.temLuz(S));
  S.eras.magia.raio = 1;
  check('com o relâmpago, tem, sem usina nenhuma', E.temLuz(S) && !S.buildings.some((b) => b.type === 'usina'));
}
// ---------- o bicho preso num bolsão sai dali ----------
function cerca(S, e) {
  const w = S.world, x = Math.floor(e.x), y = Math.floor(e.y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) w.block[(y + dy) * w.W + x + dx] = 1;
}
function passos(S, dias) { for (let s = 0; s < dias * 720 && !S.over; s++) { Sim.step(S, 2); S.events.length = 0; } }
function caso(seed, sp) {
  const S = mundo(seed, 2, 0);
  const e = S.fauna.ents.find((x) => x.sp === sp && x.state === 'pasto');
  if (!e) return { achou: false };
  // leva para longe do bando e fecha em volta: como a ave que pousa no meio da mata fechada
  const h = Fa.herdOf(S, e), w = S.world;
  let lugar = null;
  for (let r = C.FAUNA_HOME_R + 3; r < 30 && !lugar; r++) for (let a = 0; a < 24; a++) { const x = Math.round(h.x + Math.cos(a) * r), y = Math.round(h.y + Math.sin(a) * r); if (x > 2 && y > 2 && x < w.W - 3 && y < w.H - 3 && !w.block[y * w.W + x] && !G.IS_WATER[w.tile[y * w.W + x]]) { lugar = { x, y }; break; } }
  e.x = e.px = lugar.x + 0.5; e.y = e.py = lugar.y + 0.5; e.path = null; e.wait = 0;
  cerca(S, e);
  passos(S, 3);
  const k = S.fauna.ents.find((x) => x.id === e.id);
  return { achou: true, saiu: !k || Math.hypot(k.x - (lugar.x + 0.5), k.y - (lugar.y + 0.5)) > 1.5, sp };
}
{
  const a = caso(42, 'jacu');
  check('a ave presa num bolsão voa para fora em poucos dias', a.achou && a.saiu, JSON.stringify(a));
  const b = caso(42, 'capivara');
  check('o bicho de chão preso também sai', b.achou && b.saiu, JSON.stringify(b));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
