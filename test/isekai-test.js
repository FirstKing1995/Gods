// Gods · testes da 0.40: o dragão e as almas de outro mundo.
// Uso: node test/isekai-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'rpg', 'guilda', 'monstros', 'magia', 'isekai', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Rpg: R, Guilda: Gu, Monstros: Mo, Isekai: Is, Save, Family: F, Eras: E, Narr: N, Gente: Ge, Voz: V } = G;
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
  F.init(S); Sim.refresh(S); E.init(S); Mo.init(S); Gu.init(S);
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
const noite = (S) => { S.t = Math.floor(S.t / DAY) * DAY + 20.5 * 60; S.ck = Sim.clock(S.t); };

// ---------- o dragão ----------
{
  const P = mundo(42, 4);
  for (let d = 0; d < 300; d++) { dia(P); Is.daily(P); }
  check('vila pequena não tem dragão', !Is.temDragao(P));
  check('o dragão não entra no sorteio dos covis comuns', Mo.TIPOS.dragao.min > 1000);
  const S = mundo(7, 90); S.god.poder = 1000;
  for (let d = 0; d < 400 && !Is.temDragao(S); d++) { dia(S); Is.daily(S); }
  check('vila grande atrai o dragão', Is.temDragao(S) && S.chron.some((c) => /dragão fez ninho/.test(c.text)));
  const c = S.monstros.covis.find((x) => x.m === 'dragao');
  check('o ninho já é da força máxima', c.nv === 3);
  // desce
  for (let k = 0; k < 5; k++) ergue(S, 'barraca');
  S.stock.ouro = 100; noite(S);
  const n = Mo.bando(S, c);
  const e = S.narr.ents.find((x) => x.m === 'dragao');
  check('é um só, enorme', n === 1 && !!e && e.hp === Mo.TIPOS.dragao.hp);
  check('chega queimando e levando ouro', S.buildings.some((b) => b.fogo) && S.stock.ouro < 100, S.stock.ouro);
  // o raio de Deus só machuca
  const hp0 = e.hp;
  N.lightning && N.lightning(S, Math.floor(e.x), Math.floor(e.y));
  check('continua vivo depois de qualquer raio', !e.gone && e.hp >= 1, hp0 + ' → ' + e.hp);
  // o golpe final
  const h = S.people[3]; h.rpg = { por: {}, cls: 'guerreiro', nv: 30, xp: 0, habs: [] };
  e.hp = 1; const ouro = S.stock.ouro, nv = h.rpg.nv;
  Mo.golpe(S, e, h);
  check('quem derruba vira lenda', h.rpg.lenda && e.gone && h.rpg.nv > nv);
  check('o ninho acaba e o tesouro vem', !Is.temDragao(S) && S.stock.ouro === ouro + C.DRAGAO_TESOURO);
  check('a crônica conta', S.chron.some((x) => /derrubou o dragão/.test(x.text)));
  // volta um dia, mas não logo
  const t0 = S.monstros.proxDragao;
  check('o próximo só depois de anos', t0 > S.t + DAY * C.YEAR_DAYS, (t0 - S.t) / DAY);
  // a missão do dragão é a de rank mais alto
  const c2 = Mo.novo(S, "dragao"); c2.nv = 3; c2.t = S.t - 90 * DAY;
  S.guilda.quadro = [];
  ergue(S, 'taberna'); ergue(S, 'guilda'); S.guilda.prox = 0; Gu.daily(S);
  const mis = S.guilda.quadro.concat(S.guilda.idas).find((m) => m.covil === c2.id);
  check('a guilda põe a missão com o rank mais alto', !!mis && Gu.rankM(mis) === 3 && /dragão/i.test(Gu.nomeM(mis)), mis && Gu.nomeM(mis));
}
// ---------- as almas ----------
{
  const S = mundo(8, 10);
  S.stats.nascidosI = 0;
  let tot = 0;
  const q = () => { const b = Sim.makePerson(S, 'F', 'Bebê', 0); b.id = S.nextPid++; return b; };
  for (let k = 0; k < 11; k++) if (Is.onBirth(S, q())) tot++;
  check('as primeiras crianças são comuns', tot === 0);
  for (let k = 0; k < 500; k++) if (Is.onBirth(S, q())) tot++;
  check('depois, é raro: uma em algumas dezenas', tot >= 5 && tot <= 60, tot);
  // uma alma de verdade
  const a = S.people[6];
  a.outro = { t: S.t, mundo: Is.MUNDOS[0], dom: 'rapido', falou: 0, escolha: '' };
  const age0 = C.ALMA_FALA;
  a.lastAge = 25;
  Is.daily(S);
  check('quando cresce, começa a falar, e a crônica conta', a.outro.falou && S.chron.some((c) => /começou a falar/.test(c.text)) && Is.pendentes(S).indexOf(a) >= 0);
  check('crescida, desperta sozinha', !!R.de(a));
  const x0 = a.rpg.xp, nv0 = a.rpg.nv;
  R.ganha(S, a, 1);
  check('Aprende depressa: a força sobe em dobro', a.rpg.xp + (a.rpg.nv - nv0) * 1000 === x0 + 2 || a.rpg.nv > nv0, a.rpg.xp);
  const pz = (() => { const v = []; for (let i = 0; i < 30; i++) { const z = Ge.pensa(S, a); if (z) v.push(z.k); } return v; })();
  check('pensa no outro mundo', pz.length > 0, pz[0]);
  // guiar
  S.god.poder = 10;
  check('sem Poder, não guia', !Is.escolhe(S, a, 'guiar') && /Poder/.test(Is.escolheWhy(S, a, 'guiar')));
  S.god.poder = 100;
  check('guiar: mais forte e fé cheia', Is.escolhe(S, a, 'guiar') && a.outro.guia && a.fe === 100 && S.god.poder === 100 - Is.ESCOLHAS.guiar.custo);
  check('não se decide duas vezes', !Is.escolhe(S, a, 'esquecer') && Is.pendentes(S).indexOf(a) < 0);
  check('guiada, ainda mais depressa', Is.xp(a) === 3);
  // esquecer
  const b = S.people[7];
  b.outro = { t: S.t, mundo: Is.MUNDOS[1], dom: 'sorte', falou: S.t, escolha: '' };
  S.god.poder = 100; Is.escolhe(S, b, 'esquecer');
  check('esquecer: sem lembrança e sem dom', !Is.de(b) && !Is.tem(b, 'sorte') && Is.xp(b) === 1);
  // deixar
  const d = S.people[8];
  d.outro = { t: S.t, mundo: Is.MUNDOS[2], dom: 'sabio', falou: S.t, escolha: '' };
  const pod = S.god.poder;
  check('deixar viver não custa nada', Is.escolhe(S, d, 'deixar') && S.god.poder === pod && !!Is.de(d));
  // a sorte conta na missão
  const s = S.people[9]; s.rpg = { por: {}, cls: 'cacador', nv: 3, xp: 0, habs: [] }; s.outro = { dom: 'sorte', mundo: 'x', falou: 1, escolha: 'deixar' };
  check('a Sorte absurda é reconhecida', Is.tem(s, 'sorte'));
  const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  const a2 = R2.people.find((p) => p.id === a.id);
  check('o save guarda a alma e a escolha', Is.de(a2) && a2.outro.guia === 1 && a2.outro.mundo === Is.MUNDOS[0]);
  void age0;
}
// ---------- conversa com a IA sabe ----------
if (V && V.contexto) {
  const S = mundo(9, 4); const p = S.people[3];
  p.rpg = { por: {}, cls: 'maga', nv: 3, xp: 0, habs: [] }; p.rpg.cls = 'mago';
  p.outro = { mundo: Is.MUNDOS[0], dom: 'sabio', falou: S.t, escolha: 'deixar' };
  let txt = '';
  try { txt = V.contexto(S, p); txt = Array.isArray(txt) ? txt.join(' ') : String(txt); } catch (e) { txt = 'ERRO ' + e.message; }
  check('a conversa sabe da classe e do outro mundo', /nível 3/.test(txt) && /outro mundo/.test(txt), txt.slice(0, 100));
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
