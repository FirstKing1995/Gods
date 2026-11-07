// Gods · testes da 0.39: o dom, a torre, o mago na luta, o sacerdote que cura, e Deus dando o dom.
// Uso: node test/magia-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'rpg', 'guilda', 'monstros', 'magia', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Rpg: R, Monstros: Mo, Magia: Ma, Save, Family: F, Eras: E, Cidade: Ci, Povos: Pv, Narr: N } = G;
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
  F.init(S); Sim.refresh(S); E.init(S); Mo.init(S);
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
const dia = (S) => { S.t += DAY; S.ck = Sim.clock(S.t); };

// ---------- o dom ----------
{
  const S = mundo(42, 200);
  const hum = S.people.filter((p) => Ma.temDom(S, p)).length;
  check('o dom é raro entre humanos', hum >= 3 && hum <= 35, hum);
  check('e é sempre o mesmo para a mesma pessoa', S.people.every((p) => Ma.temDom(S, p) === Ma.temDom(S, p)));
  const El = mundo(42, 200); for (const p of El.people) Pv.make(El, p, 'elfo'); Pv.recount(El);
  const elf = El.people.filter((p) => Ma.temDom(El, p)).length;
  check('os elfos nascem com mais dom', elf > hum, elf + ' contra ' + hum);
  const s0 = S.rng.s; Ma.daily(S);
  check('o dia da magia não mexe no sorteio do mundo', S.rng.s === s0);
}
// ---------- a torre ----------
{
  const S = mundo(7, 40);
  S.eras.idade = 0;
  check('sem Bronze, a torre não abre', /Bronze/.test(Ci.openWhy(S, 'torremagia') || ''));
  S.eras.idade = 2;
  check('no Bronze, abre', Ci.openWhy(S, 'torremagia') === '', Ci.openWhy(S, 'torremagia'));
  const P = mundo(7, 5); P.eras.idade = 3;
  check('pouca gente, não abre', /25/.test(Ci.openWhy(P, 'torremagia') || ''));
  for (let d = 0; d < 30; d++) { dia(S); Ma.daily(S); }
  check('sem torre, ninguém acorda sozinho', !S.people.some((p) => Ma.classe(p)));
  ergue(S, 'torremagia');
  for (let d = 0; d < 400; d++) { dia(S); Ma.daily(S); }
  const magos = S.people.filter((p) => Ma.classe(p));
  check('com a torre, quem tem o dom acorda', magos.length >= 1 && magos.every((p) => Ma.temDom(S, p)), magos.length);
  check('a crônica conta o primeiro', S.chron.some((c) => /torre/.test(c.text)));
  check('e a torre ensina', magos.some((p) => p.rpg.nv >= 2), magos.map((p) => p.rpg.nv).join());
}
// ---------- o mago luta ----------
{
  const S = mundo(8, 12);
  const m = S.people[3]; m.rpg = { por: {}, cls: 'mago', nv: 4, xp: 0, habs: [] };
  const g = S.people[4]; g.rpg = { por: {}, cls: 'guerreiro', nv: 4, xp: 0, habs: [] };
  check('o golpe do mago vale o dobro', Ma.dano(m) === 2 && Ma.dano(g) === 1);
  const c = Mo.novo(S, 'ogro'); S.t = Math.floor(S.t / DAY) * DAY + 20.5 * 60; S.ck = Sim.clock(S.t); Mo.bando(S, c);
  const e = S.narr.ents.find((x) => x.m === 'ogro'), hp = e.hp;
  Mo.golpe(S, e, g);
  check('o do guerreiro tira 1', e.hp === hp - 1);
  Mo.golpe(S, e, m);
  check('o do mago tira 2', e.hp === hp - 3);
  // bola de fogo
  const a = N.spawnMonstros; void a;
  e.hp = 5;
  const o = Object.assign({}, e, { id: 9991, hp: 5, x: e.x + 1, y: e.y }); S.narr.ents.push(o);
  m.rpg.habs = ['bola'];
  Mo.golpe(S, e, m);
  check('a bola de fogo atinge quem está perto', e.hp === 3 && o.hp === 4, e.hp + ' ' + o.hp);
  const longe = Object.assign({}, e, { id: 9992, hp: 5, x: e.x + 9, y: e.y }); S.narr.ents.push(longe);
  Mo.golpe(S, e, m);
  check('e não quem está longe', longe.hp === 5);
  check('o Escudo de luz protege', R.mordida({ rpg: { cls: 'mago', nv: 1, habs: ['escudo'] } }) < R.mordida({ rpg: { cls: 'mago', nv: 1, habs: [] } }));
  check('as classes novas têm tudo', ['mago', 'sacerdote'].every((k) => R.CLASSES[k].habs.every((h) => R.HABS[h])));
}
// ---------- o sacerdote cura ----------
{
  const S = mundo(9, 8);
  const s = S.people[3]; s.rpg = { por: {}, cls: 'sacerdote', nv: 10, xp: 0, habs: [] };
  const d = S.people[5]; d.needs.saude = 30; S.people[6].needs.saude = 60;
  Ma.daily(S);
  check('cura quem mais precisa', d.needs.saude > 30 && S.people[6].needs.saude === 60, d.needs.saude);
  s.rpg.habs = ['milagre']; d.needs.saude = 20; d.sick = { t: S.t };
  dia(S); Ma.daily(S);
  check('a Mão que sara tira a febre', !d.sick);
  const antes = S.stats.curasMagia;
  for (const p of S.people) p.needs.saude = 100;
  dia(S); Ma.daily(S);
  check('sem ferido, ninguém gasta nada', S.stats.curasMagia === antes);
}
// ---------- Deus dá o dom ----------
{
  const S = mundo(10, 8);
  const p = S.people[4];
  S.god.poder = 10;
  check('sem Poder, não dá', !Ma.daDom(S, p) && /Poder/.test(Ma.domWhy(S, p)));
  S.god.poder = 500;
  check('com Poder, acorda', Ma.daDom(S, p) && !!Ma.classe(p) && S.god.poder === 500 - C.MAGIA_DOM && Ma.temDom(S, p));
  check('quem já é algo, não recebe', !Ma.daDom(S, p) && /outro jeito/.test(Ma.domWhy(S, p)));
  const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  const q = R2.people.find((x) => x.id === p.id);
  check('o save guarda', !!Ma.classe(q) && Ma.temDom(R2, q));
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
