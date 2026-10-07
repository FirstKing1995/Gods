// Gods · testes da volta depois do jogo fechado (0.12). Uso: node test/offline-test.js [u]
// 1) unidades: quanto tempo passa (fração e teto), a memória da aldeia (o que anota, que não muda a simulação, que
//    vai no save), a ausência curta (tudo inteiro) e a longa (dias resumidos): ninguém morre, o tempo fecha certo, nada
//    de número quebrado, nasce gente, as crianças crescem, a comida não zera nem explode, a obra marcada fica pronta,
//    a aldeia que saiu na miséria se recupera, o Poder anda, "Entrar agora" para no meio, o teto de relógio vale em
//    aparelho lento, e depois da volta o jogo segue normal
// 2) (sem "u") a comparação com o jeito antigo (o tempo todo simulado pessoa por pessoa, passo de 4 min) em dois
//    mundos, 120 dias: o novo tem de ser muitas vezes mais rápido e chegar a um mundo parecido
const path = require('path');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Offline: Off } = G;
const DAYM = 1440;

// ---------- ajudantes ----------
function spot(S, t, from) {
  for (let r = from || 2; r < 24; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t, from) {
  const at = spot(S, t, from);
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (t === 'fogueira') b.fuel = 8;
  Sim.refresh(S);
  return b;
}
function add(S, sex, name, age) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = age;
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S);
  q.fe = 80;
  return q;
}
// uma aldeia pronta: n adultos, k crianças, barracas, fogo, comida e lenha; sem desastres do Narrador
function village(seed, n, kids) {
  const w = W.generate(seed), site = W.bestSite(w);
  const S = Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true; S.arrived = true;
  S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 19 + (k * 3) % 20);
  for (let k = 0; k < (kids || 0); k++) add(S, k % 2 ? 'M' : 'F', 'Miudo' + k, 5 + k % 8);
  build(S, 'fogueira');
  for (let k = 0; k < Math.ceil((n + (kids || 0)) / 2); k++) build(S, 'barraca', 3);
  S.people.forEach((p, k) => { p.fe = 80; p.act = null; p.path = null; p.x = S.camp.x + 0.5 + (k % 4); p.y = S.camp.y + 2.5 + Math.floor(k / 4); p.px = p.x; p.py = p.y; });
  Object.assign(S.stock, { madeira: 80, pedra: 20, agua: 20, frutas: 60, peixe: 220 });
  S.events.length = 0; S.chron.length = 0;
  Sim.refresh(S);
  return S;
}
function days(S, n) { for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); S.events.length = 0; } }
const clone = (S) => Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
const alive = (S) => S.people.filter((p) => p.alive);
const food = (S) => T.FOOD.reduce((a, k) => a + (S.stock[k] || 0), 0);
// número quebrado em algum lugar?
function broken(S) {
  const out = [];
  for (const k in S.stock) if (!Number.isFinite(S.stock[k]) || S.stock[k] < 0) out.push('estoque.' + k + '=' + S.stock[k]);
  for (const p of alive(S)) {
    for (const k in p.needs) if (!Number.isFinite(p.needs[k])) out.push(p.name + '.' + k);
    for (const k in p.skills) if (!Number.isFinite(p.skills[k])) out.push(p.name + '.hab.' + k);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.fe)) out.push(p.name + '.xy/fe');
    if (p.bonds) for (const id in p.bonds) if (!Number.isFinite(p.bonds[id])) out.push(p.name + '.laço');
  }
  if (!Number.isFinite(S.god.poder) || !Number.isFinite(S.god.glory)) out.push('poder');
  for (const b of S.buildings) if (!Number.isFinite(b.progress) || (b.up && !Number.isFinite(b.up.progress))) out.push('obra ' + b.id);
  if (S.tech) for (const k in S.tech.prat) if (!Number.isFinite(S.tech.prat[k])) out.push('prática.' + k);
  return out;
}
const strip = (S) => { const d = JSON.parse(JSON.stringify(Save.serialize(S))); delete d.hist; delete d.savedAt; if (d.stats) delete d.stats.buildMin; return JSON.stringify(d); };
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };
const ms = () => Date.now();

// ===================== unidades =====================
{
  // --- quanto tempo passa ---
  const S = village(42, 6, 2);
  const perSec = C.DAY_MIN / C.REAL_SEC_PER_DAY;
  check('fora por menos de 2 min: nada passa', Off.minutesFor(60e3, S) === 0);
  S.opts = S.opts || {}; S.opts.offline = 3;
  check('1x: uma hora fora é uma hora de jogo aberto', Math.abs(Off.minutesFor(3600e3, S) - 3600 * perSec) < 1e-6);
  S.opts.offline = 2;
  check('metade (o padrão): uma hora fora é meia', Math.abs(Off.minutesFor(3600e3, S) - 1800 * perSec) < 1e-6);
  check('o teto: 300 dias, por mais que demore', Off.minutesFor(40 * 86400e3, S) === C.OFFLINE_MAX_DAYS * C.DAY_MIN);

  // --- a memória da aldeia ---
  check('aldeia nova: sem memória', !Off.hasMemory(S));
  const A = clone(S), B = clone(S);
  days(A, 3);
  for (let d = 0; d < 3; d++) { days(B, 1); B.hist = null; }
  const h = A.hist, se = Sim.clock(A.t - DAYM).season;
  check('três dias de jogo aberto: a memória anota os níveis do estoque por boca e os ritmos', !!h && h.n[se] >= 2 && h.s[se].nd >= 1 && h.s[se].lv.madeira > 0 && Object.keys(h.s[se].sk).length > 0 && Off.hasMemory(A), h ? 'dias ' + h.n[se] + ', ritmos ' + h.s[se].nd : '');
  check('a memória não muda a simulação (com e sem ela, o mesmo mundo)', strip(A) === strip(B));
  const A2 = clone(A);
  check('a memória vai no save e volta', Off.hasMemory(A2) && JSON.stringify(A2.hist.s) === JSON.stringify(A.hist.s) && JSON.stringify(A2.hist.n) === JSON.stringify(A.hist.n));
  const old = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
  check('save antigo: abre sem memória', !!old && !Off.hasMemory(old));
  const kb = JSON.stringify(Save.serialize(A).hist).length / 1024;
  check('a memória cabe em pouco (menos de 3 KB)', kb < 3, kb.toFixed(2) + ' KB');

  // --- ausência curta: tudo inteiro ---
  const c1 = clone(A), t1 = c1.t;
  const r1 = Off.run(c1, 5 * 60);
  check('5 h fora: tudo simulado por inteiro, o tempo fecha no minuto', r1.daysRest === 0 && c1.t === t1 + 300 && !c1.safe && !c1.resumido, 'inteiros ' + r1.daysFull);

  // --- ausência longa ---
  const c2 = clone(A), t2 = c2.t, n2 = alive(c2).length, age2 = c2.people.map((p) => F.age(c2, p)), poder2 = c2.god.poder, skill2 = alive(c2).reduce((a, p) => a + Object.values(p.skills).reduce((x, y) => x + y, 0), 0);
  const w0 = ms();
  const r2 = Off.run(c2, 300 * DAYM);
  const w2 = ms() - w0;
  check('300 dias fora: volta em poucos segundos', w2 < 6000, w2 + ' ms · ' + r2.daysRest + ' dias resumidos, ' + r2.daysFull + ' inteiros');
  check('300 dias: quase tudo em dias resumidos, com o fim simulado por inteiro', r2.daysRest >= 250 && r2.daysFull >= 0.15, '');
  check('300 dias: o tempo fecha no minuto e o modo seguro sai', c2.t === t2 + 300 * DAYM && !c2.safe && !c2.resumido && Math.round(r2.days) === 300);
  check('300 dias: ninguém morre', c2.people.filter((p) => !p.alive).length === A.people.filter((p) => !p.alive).length && alive(c2).length >= n2, alive(c2).length + ' vivos (eram ' + n2 + ')');
  check('300 dias: nenhum número quebrado', broken(c2).length === 0, broken(c2).slice(0, 4).join(', '));
  check('300 dias: todo mundo cinco anos mais velho', c2.people.slice(0, age2.length).every((p, i) => !p.alive || F.age(c2, p) === age2[i] + 5));
  check('300 dias: nasce gente', r2.born >= 1 && alive(c2).length > n2, r2.born + ' nascimentos');
  check('300 dias: a comida não zera nem explode', c2.ctx.foodDays >= 10 && c2.ctx.foodDays <= 150, c2.ctx.foodDays.toFixed(1) + ' dias de comida');
  check('300 dias: o Poder de Deus anda', c2.god.poder > poder2 + 100, Math.round(poder2) + ' → ' + Math.round(c2.god.poder));
  const skillB = alive(c2).reduce((a, p) => a + Object.values(p.skills).reduce((x, y) => x + y, 0), 0);
  check('300 dias: as habilidades crescem', skillB > skillA(skill2), Math.round(skill2) + ' → ' + Math.round(skillB));
  function skillA(v) { return v * 1.05; }
  check('300 dias: o resumo conta o que mudou', r2.alive.length === alive(c2).length && r2.newChron.length >= 1 && r2.stockAfter.madeira === c2.stock.madeira && r2.planned === 300 && !r2.early && !r2.cut);
  // depois da volta o jogo segue normal
  let err = null;
  const dead0 = c2.people.filter((p) => !p.alive).length;
  try { days(c2, 4); } catch (e) { err = e; }
  check('depois da volta: quatro dias de jogo aberto sem erro e sem morte', !err && c2.people.filter((p) => !p.alive).length === dead0 && broken(c2).length === 0, err ? String(err.stack).split('\n').slice(0, 3).join(' | ') : '');
  check('depois da volta: o povo acorda e trabalha', alive(c2).some((p) => p.act && p.act.type !== 'dormir') && c2.ctx.foodDays > 5);

  // --- obra marcada antes de sair ---
  const c3 = clone(A);
  c3.stock.madeira = 200; c3.stock.pedra = 60;
  const at = spot(c3, 'barraca', 4), bp = Sim.placeBlueprint(c3, 'barraca', at.x, at.y);
  Sim.refresh(c3);
  const r3 = Off.run(c3, 40 * DAYM);
  check('obra marcada antes de sair: fica pronta', !!Sim.building(c3, bp.id) && Sim.building(c3, bp.id).built, 'obras prontas no resumo: ' + r3.built);

  // --- aldeia que saiu na miséria ---
  const c4 = clone(A);
  for (const k of T.FOOD) c4.stock[k] = 0;
  c4.stock.frutas = 4; c4.stock.madeira = 3; c4.stock.agua = 2;
  Sim.refresh(c4);
  const fd0 = c4.ctx.foodDays;
  Off.run(c4, 90 * DAYM);
  check('saiu na miséria: 90 dias depois tem comida e lenha, e ninguém morreu', c4.ctx.foodDays >= 12 && c4.stock.madeira >= 15 && alive(c4).length >= n2, fd0.toFixed(1) + ' → ' + c4.ctx.foodDays.toFixed(1) + ' dias de comida, madeira ' + c4.stock.madeira);
  check('saiu na miséria: a saúde não fica no chão', alive(c4).every((p) => p.needs.saude >= 60), Math.round(Math.min(...alive(c4).map((p) => p.needs.saude))));

  // --- aldeia sem memória (save de antes da 0.12): vive inteiros os dois primeiros dias ---
  const c5 = clone(A); c5.hist = null;
  const j5 = Off.start(c5, 100 * DAYM);
  check('sem memória: começa por um trecho inteiro', j5.mode === 'full' && j5.kind === 'lead' && j5.until > c5.t + DAYM && j5.until <= c5.t + 2 * DAYM + 1);
  Off.advance(j5, Infinity);
  const r5 = Off.finish(j5);
  check('sem memória: aprende no caminho e chega ao fim', Off.hasMemory(c5) && r5.daysRest > 80 && c5.ctx.foodDays >= 10 && broken(c5).length === 0, r5.daysFull + ' inteiros, ' + r5.daysRest + ' resumidos');

  // --- "Entrar agora" ---
  const c6 = clone(A), t6 = c6.t;
  const j6 = Off.start(c6, 300 * DAYM);
  let n6 = 0;
  while (!Off.advance(j6, 5)) { if (++n6 === 6) j6.stop = true; }
  const r6 = Off.finish(j6);
  check('"Entrar agora": para onde está e conta só o que passou', r6.early && c6.t > t6 && c6.t < t6 + 300 * DAYM && Math.abs(r6.days - (c6.t - t6) / DAYM) < 1e-9 && !c6.safe && !c6.resumido && broken(c6).length === 0, r6.days.toFixed(1) + ' dias de 300');
  check('"Entrar agora": a barra andou de 0 a menos de 1', Off.progress(j6) > 0 && Off.progress(j6) < 1);
  let err6 = null;
  try { days(c6, 2); } catch (e) { err6 = e; }
  check('"Entrar agora": o jogo segue normal', !err6 && broken(c6).length === 0, err6 ? String(err6) : '');

  // --- aparelho lento: o teto de relógio ---
  const c7 = clone(A), t7 = c7.t;
  const r7 = Off.run(c7, 300 * DAYM, { budget: 1, hard: 1e9 });
  check('orçamento apertado: nenhum dia inteiro pelo meio, só o fim', r7.daysFull < 0.5 && c7.t === t7 + 300 * DAYM, r7.daysFull + ' inteiros');
  const c8 = clone(A), t8 = c8.t;
  const r8 = Off.run(c8, 300 * DAYM, { budget: 1, hard: 0.01 });
  check('aparelho lento demais: o resto do tempo deixa de passar e o resumo diz', r8.cut && c8.t < t8 + 300 * DAYM && r8.planned === 300 && r8.days < 300 && !c8.safe && !c8.resumido && broken(c8).length === 0, r8.days.toFixed(1) + ' dias de 300');

  // --- os pares não esfriam nem se multiplicam à toa ---
  const bondsA = alive(A).reduce((a, p) => a + Object.keys(p.bonds || {}).length, 0) / 2, bonds2 = alive(c2).reduce((a, p) => a + Object.keys(p.bonds || {}).length, 0) / 2;
  check('300 dias: os pares continuam (e nascem novos)', bonds2 >= Math.max(1, bondsA), bondsA + ' → ' + bonds2);
}

console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

// ===================== o novo e o antigo =====================
{
  const rows = [];
  for (const [seed, n, kids] of [[42, 12, 6], [777, 20, 10]]) {
    const S = village(seed, n, kids);
    days(S, 4);
    const N = clone(S), O = clone(S);
    const a = ms();
    const rn = Off.run(N, 120 * DAYM);
    const tn = ms() - a;
    // o jeito antigo: o tempo todo, pessoa por pessoa, passo de 4 min, modo seguro
    const b = ms();
    O.safe = true;
    for (let i = 0; i < 120 * 360 && !O.over; i++) { Sim.step(O, 4); O.events.length = 0; }
    O.safe = false; Sim.refresh(O);
    const to = ms() - b;
    const born = (X) => (X.stats.births || 0) - (S.stats.births || 0);
    rows.push({ seed, n: n + kids, tn, to, novo: { vivos: alive(N).length, nasc: born(N), comida: +N.ctx.foodDays.toFixed(1), poder: Math.round(N.god.poder) }, antigo: { vivos: alive(O).length, nasc: born(O), comida: +O.ctx.foodDays.toFixed(1), poder: Math.round(O.god.poder) } });
    console.log('mundo ' + seed + ' (' + (n + kids) + ' pessoas), 120 dias · novo ' + tn + ' ms ' + JSON.stringify(rows[rows.length - 1].novo) + ' · antigo ' + to + ' ms ' + JSON.stringify(rows[rows.length - 1].antigo) + ' · ' + rn.daysFull + ' inteiros');
    // o jeito novo gasta o tempo que o aparelho dá (mais dias inteiros numa máquina folgada): a conta varia de 7 a 13 vezes
    check('mundo ' + seed + ': pelo menos 6 vezes mais rápido que o jeito antigo', tn * 6 < to, (to / tn).toFixed(0) + ' vezes');
    const dead = (X) => X.people.filter((p) => !p.alive).length;
    check('mundo ' + seed + ': ninguém morre nos dois', dead(N) === dead(S) && dead(O) === dead(S), dead(S) + ' mortos antes de fechar, ' + dead(N) + ' e ' + dead(O) + ' depois');
    check('mundo ' + seed + ': nascimentos parecidos', Math.abs(born(N) - born(O)) <= Math.max(3, born(O) * 0.6), born(N) + ' e ' + born(O));
    check('mundo ' + seed + ': comida guardada dentro de um fator 3', N.ctx.foodDays > O.ctx.foodDays / 3 && N.ctx.foodDays < O.ctx.foodDays * 3 + 10, N.ctx.foodDays.toFixed(1) + ' e ' + O.ctx.foodDays.toFixed(1));
    check('mundo ' + seed + ': Poder parecido', N.god.poder > O.god.poder * 0.6 && N.god.poder < O.god.poder * 1.6, Math.round(N.god.poder) + ' e ' + Math.round(O.god.poder));
  }
}
console.log('\ntotal: ' + ok + ' ok, ' + bad + ' falhas');
process.exitCode = bad ? 1 : 0;
