// Gods · testes da 0.38: os monstros, os covis e as batalhas.
// Uso: node test/monstros-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'rpg', 'guilda', 'monstros', 'magia', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Rpg: R, Guilda: Gu, Monstros: Mo, Save, Family: F, Eras: E, Bichos: B, Narr: N } = G;
const DAY = C.DAY_MIN;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, n) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Ana', 'Beto'], w);
  S.arrived = true;
  for (let k = 0; k < (n || 0); k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1; q.y = S.camp.y + 2; q.fe = 60; S.people.push(q); }
  F.init(S); Sim.refresh(S); E.init(S); Gu.init(S); Mo.init(S);
  Object.assign(S.stock, { madeira: 300, pedra: 300, peixe: 500 });
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
const heroi = (p, nv) => { p.rpg = { por: {}, cls: 'guerreiro', nv, xp: 0, habs: [] }; p.needs.saude = 100; return p; };
const noite = (S) => { S.t = Math.floor(S.t / DAY) * DAY + 20.5 * 60; S.ck = Sim.clock(S.t); };

// ---------- quando aparece ----------
{
  const S = mundo(42, 4), sr = S.rng.s;
  check('vila pequena sem guilda não tem covil', !Mo.ativo(S));
  for (let d = 0; d < 400; d++) { S.t += DAY; S.ck = Sim.clock(S.t); Mo.daily(S); }
  check('e continua sem, um ano depois', S.monstros.covis.length === 0);
  check('sem covil, o sorteio do mundo não muda', S.rng.s === sr);
  const V = mundo(42, 12); ergue(V, 'taberna'); ergue(V, 'guilda');
  check('com a guilda, vem', Mo.ativo(V));
  for (let d = 0; d < 700 && !V.monstros.covis.length; d++) { V.t += DAY; V.ck = Sim.clock(V.t); Mo.daily(V); }
  check('aparece um covil, e a crônica conta', V.monstros.covis.length === 1 && V.chron.some((c) => /covil/.test(c.text)));
  const c = V.monstros.covis[0], d = Math.hypot(c.x - V.camp.x, c.y - V.camp.y);
  check('longe da vila e em terra livre', d >= C.COVIL_DIST[0] - 1 && !V.world.block[c.y * V.world.W + c.x] && !G.IS_WATER[V.world.tile[c.y * V.world.W + c.x]], d);
  for (let i = 0; i < 6; i++) Mo.novo(V);
  check('todos em lugares diferentes', V.monstros.covis.every((a, i) => V.monstros.covis.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= 12)));
  const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(V))));
  check('o save guarda os covis', R2.monstros.covis.length === V.monstros.covis.length);
  check('todo tipo de monstro é completo', Object.values(Mo.TIPOS).every((T) => T.name && T.art && T.pl && T.covil && T.hp > 0 && T.forca > 0));
}
// ---------- o bando ----------
{
  const S = mundo(7, 14);
  S.people.slice(2, 6).forEach((p) => heroi(p, 10));
  const c = Mo.novo(S, 'goblin'); noite(S);
  const n0 = Mo.bando(S, c);
  const es = S.narr.ents.filter((e) => e.m === 'goblin');
  check('o bando sai de noite, com a ficha do monstro', n0 >= 3 && es.length === n0 && es.every((e) => e.hp === Mo.TIPOS.goblin.hp) && S.narr.active.lobos.monstro === 'goblin');
  check('não sai dois bandos juntos', N.spawnMonstros(S, 'goblin', 2) === 0);
  const hs = S.people.filter((p) => p.act && p.act.type === 'defender');
  check('os heróis vão para cima', hs.length >= 1, hs.length);
  // o golpe
  const e = es[0], p = S.people[2], nv0 = p.rpg.nv, xp0 = p.rpg.xp, gs0 = S.narr.ents.filter((x) => !x.gone).length;
  const r1 = N.hitEnt(S, e, p);
  check('ferido, o monstro não foge', r1 === 'acertou' && e.state !== 'embora' && e.hp === Mo.TIPOS.goblin.hp - 1);
  const r2 = N.hitEnt(S, e, p);
  check('sem vida, cai, e o resto continua', r2 === 'morto' && e.gone && S.narr.ents.filter((x) => !x.gone && x.state !== 'embora').length >= gs0 - 1);
  check('derrubar dá força', p.rpg.nv > nv0 || p.rpg.xp > xp0);
  check('o nome certo na luta', B.nameOf(S, { kind: 'narr', id: es[1].id }) === 'goblin' && /o goblin/.test(B.theOf(S, { kind: 'narr', id: es[1].id })));
  // a mordida é a do monstro
  const q = S.people[8]; q.x = es[1].x; q.y = es[1].y; q.px = q.x; q.py = q.y; const s0 = q.needs.saude; q.biteCool = 0;
  // o bando anda e acaba indo embora: nada fica para sempre
  let err = '';
  try { for (let s = 0; s < 720 * 2; s++) { Sim.step(S, 2); S.events.length = 0; } } catch (x) { err = x.stack; }
  check('a noite passa sem erro', !err, err);
  check('de manhã, o bando foi embora e a história fica', !S.narr.active.lobos && !S.narr.ents.some((x) => x.m), S.narr.ents.filter((x) => x.m).length);
  check('a crônica fala dos goblins', S.chron.some((x) => /goblins/i.test(x.text)), S.chron.slice(-3).map((x) => x.text).join(' | '));
}
// ---------- herói sem lança luta ----------
{
  const S = mundo(3, 2), p = S.people[2];
  check('sem lança e sem classe, não luta', !B.armed(S, p));
  heroi(p, 2);
  check('com classe, luta', B.armed(S, p));
}
// ---------- o covil cresce e a guilda limpa ----------
{
  const S = mundo(8, 16); ergue(S, 'taberna'); ergue(S, 'guilda');
  S.people.slice(2, 8).forEach((p) => heroi(p, 15));
  const c = Mo.novo(S, 'aranha');
  c.t = S.t - 2.1 * C.COVIL_CRESCE * C.YEAR_DAYS * DAY; S.monstros.prox = S.t + 1e9;
  S.t += DAY; S.ck = Sim.clock(S.t); Mo.daily(S);
  check('deixado em paz, o covil cresce', c.nv >= 2, c.nv);
  S.guilda.prox = 0; S.guilda.quadro = [];
  Gu.daily(S);
  const todas = S.guilda.quadro.concat(S.guilda.idas), m = todas.find((x) => x.covil === c.id);
  check('a missão do covil vai para o quadro', !!m && /Ninho/.test(Gu.nomeM(m)), Gu.nomeM(m || { tipo: 'erva' }));
  check('o rank acompanha a força do covil', Gu.rankM(m) === Math.min(3, c.nv));
  let ida = S.guilda.idas.find((i) => i.covil === c.id);
  if (!ida) { S.god.poder = 100; Gu.sonho(S, m.id); ida = S.guilda.idas.find((i) => i.covil === c.id); }
  const ouro0 = S.stock.ouro;
  check('e o grupo sai', !!ida);
  const r = Gu.volta(S, ida, 2);
  check('deu errado: o covil continua', !r.ok && !!Mo.covil(S, c.id));
  S.guilda.prox = 0; S.guilda.quadro = [];
  S.people.filter((p) => R.de(p)).forEach((p) => { p.needs.saude = 100; });
  const idb = { id: 99, tipo: 'covil', covil: c.id, nv: c.nv, nome: 'x', t0: S.t, volta: S.t, ids: [], nomes: [], forca: 90 };
  const gp = Gu.livres(S).slice(0, 2);
  S.guilda.quadro.push({ id: 99, tipo: 'covil', covil: c.id, nv: c.nv, nome: Mo.nomeDe(c), t: S.t, ate: S.t + 9 * DAY }); S.god.poder = 100;
  check('novo grupo', Gu.sonho(S, 99), Gu.sonhoWhy(S, S.guilda.quadro[0] || { tipo: 'erva' }));
  const r3 = Gu.volta(S, S.guilda.idas.find((i) => i.id === 99), 0);
  check('deu certo: o covil acaba e paga', r3.ok && !Mo.covil(S, c.id) && S.stock.ouro > ouro0 && (S.stats.covisLimpos || 0) === 1);
  void idb; void gp;
}
// ---------- Deus esmaga ----------
{
  const S = mundo(9, 4); const c = Mo.novo(S, 'ogro');
  S.god.poder = 10;
  check('sem Poder, não esmaga', !Mo.esmaga(S, c.id) && /Poder/.test(Mo.esmagaWhy(S)));
  S.god.poder = 500;
  check('com Poder, o covil acaba', Mo.esmaga(S, c.id) && !Mo.covil(S, c.id) && S.god.poder === 500 - C.COVIL_ESMAGA);
}
// ---------- com o jogo fechado ----------
{
  const S = mundo(10, 12); const c = Mo.novo(S, 'goblin'); noite(S); Mo.bando(S, c);
  const a0 = c.ataque;
  G.Offline.run(S, 30 * DAY);
  check('com o jogo fechado, o bando some sem erro', !S.narr.ents.some((e) => e.m) && !S.narr.active.lobos && !S.safe);
  void a0;
}
// ---------- três anos com monstros: a vila aguenta ----------
{
  const S = mundo(21, 30); ergue(S, 'fogueira'); ergue(S, 'taberna'); ergue(S, 'guilda');
  for (let k = 0; k < 8; k++) ergue(S, 'barraca');
  S.people.slice(2, 7).forEach((p) => heroi(p, 4));
  S.narr.auto = 'acolher'; if (G.Soc) G.Soc.setModo(S, 'decide');
  S.monstros.prox = S.t + DAY;
  let err = '';
  const God = G.God;
  try {
    for (let d = 0; d < 3 * C.YEAR_DAYS && !S.over; d++) {
      if (d % 3 === 0) Object.assign(S.vontades, { madeira: 2, pesca: 3, frutas: 3, construir: 3, pedra: 2 });
      for (let s = 0; s < 720 && !S.over; s++) { Sim.step(S, 2); if (s % 30 === 0) for (const p of S.people) if (p.alive && p.prayer) { const kind = God.PRAYER_HELP[p.prayer.kind]; if (kind && kind !== 'raio' && !God.canCast(S, kind)) God.cast(S, kind, Math.floor(p.x), Math.floor(p.y)); } S.events.length = 0; }
    }
  } catch (x) { err = x.stack; }
  const vivos = S.people.filter((p) => p.alive).length;
  check('três anos sem erro', !err, err);
  check('a vila segue viva', !S.over && vivos >= 15, vivos);
  check('houve bandos e luta de verdade', (S.stats.bandos || 0) >= 2, 'bandos ' + S.stats.bandos + ' · monstros ' + S.stats.monstros + ' · missoes ' + S.stats.missoes + ' · limpos ' + S.stats.covisLimpos);
  check('os heróis derrubam monstros', (S.stats.monstros || 0) >= 2, S.stats.monstros);
  check('os bandos não dizimam', (S.stats.mortosMissao || 0) < 25, S.stats.mortosMissao);
  if (process.env.V) console.log('vivos', vivos, 'stats', JSON.stringify({ bandos: S.stats.bandos, monstros: S.stats.monstros, missoes: S.stats.missoes, mortosM: S.stats.mortosMissao, limpos: S.stats.covisLimpos, herois: R.herois(S).length, top: R.herois(S)[0] && R.herois(S)[0].rpg.nv }));
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
