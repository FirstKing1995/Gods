// Gods · testes da 0.37: a taberna, a guilda, as missões, os ranks e o que Deus pode fazer.
// Uso: node test/guilda-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'rpg', 'guilda', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Rpg: R, Guilda: Gu, Save, Cidade: Ci, Family: F, Eras: E, Soc: So } = G;
const DAY = C.DAY_MIN;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, n) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Ana', 'Beto'], w);
  S.arrived = true;
  for (let k = 0; k < (n || 0); k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1; q.y = S.camp.y + 2; S.people.push(q); }
  F.init(S); Sim.refresh(S); E.init(S); Gu.init(S);
  Object.assign(S.stock, { madeira: 300, pedra: 300 });
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
const heroi = (S, p, nv) => { p.rpg = { por: {}, cls: 'guerreiro', nv, xp: 0, habs: [] }; return p; };

// ---------- abrir ----------
{
  const S = mundo(42, 4);
  check('com pouca gente, sem taberna', /12/.test(Ci.openWhy(S, 'taberna') || ''));
  check('sem taberna, sem guilda', /taberna/.test(Ci.openWhy(S, 'guilda') || ''));
  const V = mundo(42, 25);
  check('com gente, a taberna abre', Ci.openWhy(V, 'taberna') === '', Ci.openWhy(V, 'taberna'));
  const d0 = E.descMult(V);
  ergue(V, 'taberna');
  check('a taberna acalma', Math.abs(E.descMult(V) - d0 * C.TABERNA_DESC) < 1e-9);
  check('com a taberna, a guilda abre', Ci.openWhy(V, 'guilda') === '', Ci.openWhy(V, 'guilda'));
  check('sem guilda, quadro vazio', (() => { Gu.daily(V); return V.guilda.quadro.length === 0; })());
  ergue(V, 'guilda');
  Gu.daily(V);
  check('com a guilda, a primeira missão no quadro e a crônica', V.guilda.quadro.length === 1 && V.chron.some((c) => /guilda abriu/.test(c.text)));
}
// ---------- ranks ----------
{
  check('os ranks seguem o nível', Gu.RANKS[Gu.rankDe(1)].nome === 'Ferro' && Gu.RANKS[Gu.rankDe(5)].nome === 'Bronze' && Gu.RANKS[Gu.rankDe(12)].nome === 'Prata' && Gu.RANKS[Gu.rankDe(25)].nome === 'Ouro' && Gu.RANKS[Gu.rankDe(40)].nome === 'Platina' && Gu.RANKS[Gu.rankDe(60)].nome === 'Lenda');
  check('todo tipo de missão tem nome, prêmio e frases', Object.values(Gu.TIPOS).every((T) => T.nome && Object.keys(T.premio).length && T.ok.length && T.mal.length));
  const S = mundo(1, 0);
  const estoque = Object.values(Gu.TIPOS).every((T) => Object.keys(T.premio).every((k) => S.stock[k] !== undefined));
  check('todo prêmio existe no estoque', estoque);
}
// ---------- o grupo ----------
const armar = (seed, nv) => {
  const S = mundo(seed, 16); ergue(S, 'taberna'); ergue(S, 'guilda');
  const hs = S.people.slice(4, 8); hs.forEach((p) => heroi(S, p, nv));
  return { S, hs };
};
{
  const { S, hs } = armar(5, 6);
  const m = { id: 90, tipo: 'matilha', t: S.t, ate: S.t + 9 * DAY };
  S.guilda.quadro.push(m);
  const q = Gu.grupo(S, m);
  check('o grupo sai com ao menos 2', q && q.length >= 2 && q.every((p) => hs.indexOf(p) >= 0), q && q.length);
  check('missão forte demais não forma grupo', Gu.grupo(S, { tipo: 'fera' }) === null);
  const L = S.people.find((p) => p === hs[0]); S.soc.lider = L.id;
  check('quem fala por todos não sai', Gu.livres(S).indexOf(L) < 0);
  S.soc.lider = 0;
  const pequeno = mundo(9, 3); [pequeno.people[0], pequeno.people[1]].forEach((p) => heroi(pequeno, p, 20));
  check('vila pequena não se esvazia', Gu.grupo(pequeno, { tipo: 'matilha' }) === null);
  const n0 = S.people.length, p0 = 500; S.god.poder = p0;
  check('o sonho manda o grupo hoje e gasta Poder', Gu.sonho(S, m.id) && S.god.poder === p0 - C.GUILDA_SONHO && S.guilda.idas.length === 1 && S.people.length < n0);
  const ida = S.guilda.idas[0];
  check('quem saiu não está no mapa, mas está em missão', ida.ids.every((id) => !S.people.some((p) => p.id === id)) && So.away(S, ida.ids[0]).away.missao === 1);
  check('a ficha diz que está em missão', /missão/.test(So.foraTxt(S, So.away(S, ida.ids[0]))));
  const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda o grupo fora', R2.guilda.idas.length === 1 && So.away(R2, ida.ids[0]) && So.away(R2, ida.ids[0]).away.missao === 1);
  // protegido
  S.god.poder = 100;
  check('Deus protege um grupo', Gu.protege(S, ida.id) && ida.protegido === 1 && !Gu.protege(S, ida.id));
  const fim = Gu.volta(S, ida, 1.5);
  check('sob proteção, ninguém morre, mesmo dando errado', !fim.ok && fim.mortos.length === 0 && fim.volta.length === ida.ids.length);
  check('voltou para o mapa', ida.ids.every((id) => S.people.some((p) => p.id === id && p.alive)));
}
// ---------- a volta ----------
{
  const { S, hs } = armar(6, 10);
  const m = { id: 91, tipo: 'caravana', t: S.t, ate: S.t + 9 * DAY };
  S.guilda.quadro.push(m); S.god.poder = 100;
  const sal0 = S.stock.sal, nv0 = hs[0].rpg.nv, xp0 = hs[0].rpg.xp;
  Gu.sonho(S, m.id);
  const ida = S.guilda.idas[0], r = Gu.volta(S, ida, 0);
  check('deu certo: traz o prêmio', r.ok && S.stock.sal === sal0 + Gu.TIPOS.caravana.premio.sal && S.guilda.hist.length === 1);
  check('e dá experiência', hs.filter((p) => ida.ids.indexOf(p.id) >= 0).every((p) => p.rpg.nv > nv0 || p.rpg.xp > xp0));
  const m2 = { id: 92, tipo: 'caravana', t: S.t, ate: S.t + 9 * DAY };
  S.guilda.quadro.push(m2); S.god.poder = 100;
  Gu.livres(S).forEach((p) => { p.needs.saude = 100; });
  Gu.sonho(S, m2.id);
  const ida2 = S.guilda.idas[0], sal1 = S.stock.sal;
  const r2 = Gu.volta(S, ida2, 2);
  check('deu errado sem proteção: morrem todos nesta rolagem e sem prêmio', !r2.ok && r2.mortos.length === ida2.ids.length && S.stock.sal === sal1);
  check('os mortos ficam como mortos em missão', r2.mortos.every((p) => p.morto && p.cause === 'missao'));
  check('a crônica conta', S.chron.some((c) => /não voltou/.test(c.text)));
  check('a ficha do morto diz', /Não voltou/.test(So.foraTxt(S, r2.mortos[0])));
  check('o povo sente', (S.stats.mortosMissao || 0) === ida2.ids.length);
  const c1 = Gu.chance({ tipo: 'fera' }, 20, 2), c2 = Gu.chance({ tipo: 'fera' }, 100, 2), c3 = Gu.chance({ tipo: 'fera' }, 100, 2, true);
  check('mais força, mais chance; proteção soma; há sempre risco', c1 < c2 && c2 <= c3 && c3 <= 0.95 && c1 >= 0.1, [c1, c2, c3].join());
}
// ---------- vai sozinha ----------
{
  const { S } = armar(7, 12);
  const s0 = S.rng.s;
  for (let d = 0; d < 120; d++) { S.t += DAY; S.ck = Sim.clock(S.t); Gu.daily(S); }
  check('em 120 dias, a guilda manda grupos sozinha e eles voltam', (S.stats.missoes || 0) >= 2, S.stats.missoes);
  check('não mexe no sorteio do mundo', S.rng.s === s0);
  check('a história guarda só as últimas', S.guilda.hist.length <= 12);
  check('nada fica preso: todo mundo fora tem grupo a caminho', S.soc.fora.filter((p) => p.away && p.away.missao && !p.morto).every((p) => S.guilda.idas.some((i) => i.ids.indexOf(p.id) >= 0)));
}
// ---------- com o jogo fechado ----------
{
  const { S } = armar(8, 10);
  const m = { id: 93, tipo: 'erva', t: S.t, ate: S.t + 30 * DAY };
  S.guilda.quadro.push(m); S.god.poder = 100; Gu.sonho(S, m.id);
  const ida = S.guilda.idas[0];
  G.Offline.run(S, 30 * DAY);
  check('o grupo também volta com o jogo fechado', !S.guilda.idas.some((i) => i === ida), S.guilda.idas.length);
  check('e o jogo segue', !S.safe);
  let err = '';
  try { for (let s = 0; s < 720; s++) { Sim.step(S, 2); S.events.length = 0; } } catch (e) { err = e.stack; }
  check('sem erro depois', !err, err);
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
