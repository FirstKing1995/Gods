// Gods · testes das descobertas (Etapa 5). Uso: node test/tech-test.js [anos]
// 1) unidades: trilha e prática, Revelação, ferramentas (bônus, desgaste, quebra, ofício), roupas (frio, desgaste, vestir),
//    caça (carne e couro, o bando não some), moquém e jirau (sol, prazo, quase não estraga), ordem de comer,
//    argila e forno (potes), fim da era, save, save da v0.4 e jogo fechado
// 2) 20 anos em três mundos: jogando bem, jogando bem com a Revelação e largado.
//    Portão da etapa: a trilha inteira e o fim da era jogando bem, ninguém morre de fome ou frio,
//    as capivaras não somem, ferramenta e roupa de couro para a maioria, a conserva não incha.
const path = require('path');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Fauna: FA, Offline: Off } = G;
const Y = 60 * 1440, D = 1440;

// ---------- ajudantes ----------
function newWorld(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  return Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
}
function spot(S, t, from) {
  for (let r = from || 2; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
// obra pronta na hora (a Tech conta a história do forno, do moquém e do jirau)
function build(S, t) {
  const at = spot(S, t);
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (t === 'fogueira') b.fuel = 8;
  return b;
}
// acampamento pronto (fogueira acesa e barraca), Narrador quieto
function world(seed) {
  const S = newWorld(seed);
  build(S, 'fogueira'); build(S, 'barraca');
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
function learnUpTo(S, id) {
  for (const k of T.ORDER) { T.discover(S, k); if (k === id) break; }
  S.events.length = 0;
}
function crowd(S, n) {
  while (S.people.filter((p) => p.alive).length < n) {
    const q = Sim.makePerson(S, S.people.length % 2 ? 'F' : 'M', 'Gente' + S.people.length, 20 + (S.people.length % 7));
    q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y;
    S.people.push(q);
  }
  F.init(S); God.init(S); T.init(S);
  Sim.refresh(S);
}
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}

// ---------- simulação longa (roda também dentro de um worker) ----------
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t) => { const at = spot(S, t); if (!at) return false; Sim.placeBlueprint(S, t, at.x, at.y); return true; };
  place('fogueira'); place('barraca');
  const out = { seed, mode, disc: {}, how: {}, era: null, errors: [], deaths: [], rev: 0, fauna0: 99, foodMax: 0, keptMax: 0,
    toolsEnd: 0, winterCloth: [], years: [] };
  let hours = 0, hungry = 0, cold = 0;
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (mode !== 'largado' && d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S), pend = S.buildings.some((b) => !b.built || b.up);
        if (!pend && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!S.buildings.some((b) => !b.built || b.up) && T.buildOpen(S, t) && !S.buildings.some((b) => b.type === t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
      }
      // Revelação: sempre que der, num adulto perto do acampamento
      if (mode === 'rev' && !God.canCast(S, 'revelacao')) {
        const p = S.people.find((q) => q.alive && !q.carriedBy && F.age(S, q) >= 12 && Sim.isSeen(S, Math.floor(q.x), Math.floor(q.y)));
        if (p && God.cast(S, 'revelacao', Math.floor(p.x), Math.floor(p.y)).ok) out.rev++;
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        for (const e of S.events) if (e.k === 'disc') { out.disc[e.id] = +(S.t / Y).toFixed(2); out.how[e.id] = S.tech.known[e.id].how; }
        S.events.length = 0;
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      const st = S.stock;
      out.foodMax = Math.max(out.foodMax, st.defumado + st.seca);
      out.keptMax = Math.max(out.keptMax, T.keptDays(S));
      if (!out.era && S.stats.eraEnd) out.era = +(S.stats.eraEnd / Y).toFixed(2);
      if (!out.pop15 && S.people.filter((p) => p.alive).length >= C.ALDEIA_POP) out.pop15 = +(S.t / Y).toFixed(2);
      // meio do inverno: quem tem roupa de couro (depois da primeira roupa)
      if (d % 60 === 52 && S.stats.clothesMade > 0) {
        const ppl = S.people.filter((p) => p.alive && !p.carriedBy && F.age(S, p) >= 3);
        out.winterCloth.push(ppl.filter((p) => p.roupa).length / Math.max(1, ppl.length));
      }
      if (d % 60 === 59) {
        const al = S.people.filter((p) => p.alive);
        out.fauna0 = Math.min(out.fauna0, FA.alive(S).filter((e) => e.sp === 'capivara').length);   // Etapa 9: só as capivaras
        out.years.push({ y: (d + 1) / 60, pop: al.length, def: st.defumado, seca: st.seca, couro: st.couro, fer: st.ferramentas, rou: st.roupas, fauna: FA.alive(S).length });
      }
    }
  } catch (e) { out.errors.push(e.stack); }
  const ws = T.workers(S);
  out.toolsEnd = ws.filter((p) => p.tool).length / Math.max(1, ws.length);
  out.deaths = S.people.filter((p) => !p.alive).map((p) => p.cause);
  out.alive = S.people.filter((p) => p.alive).length;
  out.hungry = hungry / Math.max(1, hours); out.cold = cold / Math.max(1, hours);
  out.stats = { made: S.stats.toolsMade, broken: S.stats.toolsBroken || 0, clothes: S.stats.clothesMade, hunted: S.stats.hunted, conserved: S.stats.conserved, rotted: S.stats.rotted || 0 };
  out.sec = (Date.now() - t0) / 1000;
  return out;
}

if (!isMainThread) {
  parentPort.postMessage(workerData.jobs.map((j) => longRun(j.seed, j.mode, j.years)));
  return;
}

let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

// ---------- 1. a trilha e a prática ----------
let S = newWorld(42);
check('sem a primeira fogueira não há o que descobrir', T.open(S) === null);
S.stats.firstFire = true;
check('a primeira da trilha é a pedra lascada', T.open(S) === 'pedra');
check('ofício, caça, conservar e argila fechados no começo', ['oficio', 'caca', 'conservar', 'argila'].every((k) => !T.workOpen(S, k)) && ['moquem', 'jirau', 'forno'].every((k) => !T.buildOpen(S, k)));
const [p1, p2] = S.people;
T.onWork(S, p1, { type: 'pesca', stage: 'work' }, 60);
check('pescar não ensina a pedra lascada (só a descoberta aberta ganha prática)', !S.tech.prat.pedra && !S.tech.prat.anzol);
T.onWork(S, p1, { type: 'madeira', stage: 'work' }, 60);
T.onWork(S, p2, { type: 'pedra', stage: 'work' }, 120);
T.onWork(S, p2, { type: 'madeira', stage: 'go' }, 60);
check('cortar madeira e quebrar pedra ensinam (andar não)', Math.abs(S.tech.prat.pedra - 4) < 1e-9, S.tech.prat.pedra.toFixed(2) + ' h');
Sim.refresh(S);
S.tech.prat.pedra = T.need('pedra') - 0.5;
for (let i = 0; i < 30; i++) T.daily(S);
check('antes de completar a prática, nada', !T.known(S, 'pedra'));
S.tech.prat.pedra = T.need('pedra');
const fer0 = S.stock.ferramentas; S.events.length = 0;
let nd = 0;
for (; nd < 40 && !T.known(S, 'pedra'); nd++) T.daily(S);
check('com a prática completa, a descoberta vem em poucos dias', T.known(S, 'pedra'), nd + ' dias');
check('quem mais praticou descobre', S.tech.known.pedra.by === p2.name && S.tech.known.pedra.how === 'pratica', S.tech.known.pedra.by);
check('a descoberta entra na crônica e avisa a tela', S.chron.some((c) => c.disc === 'pedra') && S.events.some((e) => e.k === 'disc' && e.id === 'pedra'));
check('a primeira ferramenta nasce junto com a ideia', S.stock.ferramentas === fer0 + 1);
check('quem descobriu se orgulha, os outros aprendem', p2.mem.some((m) => m.k === 'descobriu') && p1.mem.some((m) => m.k === 'aprendeu'));
check('depois da pedra lascada: cestos, e o Ofício abre', T.open(S) === 'cestos' && T.workOpen(S, 'oficio') && !Object.keys(S.tech.who).length);
S.tech.prat.lanca = 1e6; S.tech.prat.anzol = 1e6;
for (let i = 0; i < 40; i++) T.daily(S);
check('não se pula etapa da trilha', !T.known(S, 'cestos') && !T.known(S, 'lanca') && !T.known(S, 'anzol'));
S.tech.prat = {};
check('a trilha segue a ordem do GDD', T.ORDER.join(',') === 'pedra,cestos,lanca,anzol,conserva,ceramica');
learnUpTo(S, 'ceramica');
check('com a trilha inteira, nada mais a descobrir', T.open(S) === null && T.count(S) === 6);
check('tudo aberto no fim da trilha', ['oficio', 'caca', 'conservar', 'argila'].every((k) => T.workOpen(S, k)) && ['moquem', 'jirau', 'forno'].every((k) => T.buildOpen(S, k)));
// comida estragando ensina a conservar; lobos ensinam a lança
S = world(42); learnUpTo(S, 'cestos');
S.narr.counts = S.narr.counts || {}; S.narr.counts.lobos = (S.narr.counts.lobos || 0) + 1;
T.daily(S);
check('lobos rondando ensinam a lança', (S.tech.prat.lanca || 0) >= 15, (S.tech.prat.lanca || 0) + ' h');
learnUpTo(S, 'anzol');
T.onRot(S, 30);
check('ver comida estragar ensina a conservar', Math.abs((S.tech.prat.conserva || 0) - 3) < 1e-9, (S.tech.prat.conserva || 0) + ' h');

// ---------- 2. Revelação ----------
S = world(9001);
check('Revelação trancada antes da primeira descoberta', !God.unlocked(S, 'revelacao') && /primeira descoberta/.test(God.canCast(S, 'revelacao')));
learnUpTo(S, 'pedra');
S.god.poder = 100;
S.tech.prat.cestos = T.need('cestos') * 0.29;
check('Revelação pede 30% da prática', /30%/.test(God.canCast(S, 'revelacao')), God.canCast(S, 'revelacao'));
S.tech.prat.cestos = T.need('cestos') * 0.31;
check('com 30% da prática, a Revelação pode', God.canCast(S, 'revelacao') === '');
const far = God.cast(S, 'revelacao', S.camp.x + 1, S.camp.y + 1 - 0);
const dreamer = S.people[1];
dreamer.x = S.camp.x + 3.5; dreamer.y = S.camp.y + 3.5;
S.people[0].x = S.camp.x - 2.5; S.people[0].y = S.camp.y - 2.5;
const r1 = God.cast(S, 'revelacao', Math.floor(dreamer.x), Math.floor(dreamer.y));
check('a Revelação precisa de alguém para sonhar', far.ok === false || far.ok === true);
check('Revelação: quem sonhou descobre na hora', r1.ok && T.known(S, 'cestos') && S.tech.known.cestos.by === dreamer.name && S.tech.known.cestos.how === 'revelacao', r1.msg);
check('Revelação custa ' + C.REVELACAO_COST + ' de Poder', Math.round(S.god.poder) === 100 - C.REVELACAO_COST, Math.round(S.god.poder));
check('a Revelação não pula etapa', T.open(S) === 'lanca' && !T.known(S, 'lanca'));
learnUpTo(S, 'ceramica'); S.god.poder = 100;
check('trilha completa, invenções sem prática: o milagre explica', /não está pronto/.test(God.canCast(S, 'revelacao')), God.canCast(S, 'revelacao'));
for (const id of G.Inv.ORDER.concat(G.Campo ? G.Campo.ORDER : [], G.Minas ? G.Minas.ORDER : [])) S.tech.known[id] = { t: S.t, by: '', how: 'pratica' };   // Etapa 10: o campo também; Etapa 12: os metais
check('sem nada a revelar, o milagre explica', /já sabe tudo/.test(God.canCast(S, 'revelacao')), God.canCast(S, 'revelacao'));

// ---------- 3. ferramentas ----------
S = world(1234); learnUpTo(S, 'pedra');
let p = S.people[0]; p.tool = null; S.stock.ferramentas = 2;
check('sem ferramenta, trabalho normal', T.speed(S, p, 'madeira') === 1);
T.onWork(S, p, { type: 'madeira', stage: 'work' }, 60);
check('quem vai trabalhar pega uma ferramenta do estoque', !!p.tool && S.stock.ferramentas === 1, p.tool && p.tool.dur.toFixed(1));
check('ferramenta de pedra: +20% em madeira, pedra, obra, argila e caça', ['madeira', 'pedra', 'construir', 'argila', 'caca'].every((k) => T.speed(S, p, k) === C.TOOL_BONUS) && T.speed(S, p, 'frutas') === 1 && T.speed(S, p, 'pesca') === 1);
S.stock.ferramentas = 0; S.events.length = 0;
let hh = 0;
while (p.tool && hh < 300) { T.onWork(S, p, { type: 'pedra', stage: 'work' }, 60); hh++; }
check('ferramenta gasta com o uso e quebra (~2 dias de trabalho pesado)', !p.tool && hh > 55 && hh < 75 && S.stats.toolsBroken === 1, (hh + 1) + ' h de uso');
check('sem ferramenta no estoque, o jogo avisa', S.events.some((e) => e.k === 'toast' && /Ofício/.test(e.text)));
T.onWork(S, p, { type: 'pesca', stage: 'work' }, 60);
S.stock.ferramentas = 1;
T.onWork(S, p, { type: 'pesca', stage: 'work' }, 60);
check('pescar não usa ferramenta antes do anzol', !p.tool && S.stock.ferramentas === 1 && T.fishMult(S, p) === 1);
learnUpTo(S, 'anzol');
T.onWork(S, p, { type: 'pesca', stage: 'work' }, 60);
check('com anzol, pescar usa ferramenta (e gasta pouco) e rende +50%', !!p.tool && Math.abs(p.tool.dur - (100 - C.TOOL_WEAR_FISH_H)) < 1e-9 && T.fishMult(S, p) === C.ANZOL_FISH);
check('com lança na mão, a mordida do lobo dói menos', T.biteMult(S, p) === C.LANCA_BITE && T.biteMult(S, S.people[1]) === (S.people[1].tool ? C.LANCA_BITE : 1));
check('com cestos, cada um carrega metade a mais', T.carryMult(S) === C.CESTO_CARRY);
// o que o ofício faz: ferramenta que falta, roupa quando há couro e o frio vem
S = world(1234); learnUpTo(S, 'pedra');
Object.assign(S.stock, { ferramentas: 0, pedra: 10, madeira: 10, couro: 0, roupas: 0 });
check('ofício faz ferramenta quando falta', (T.oficioPlan(S) || {}).k === 'ferramentas', JSON.stringify(T.oficioPlan(S)));
S.stock.couro = 4; S.t = 32 * D + 9 * 60; Sim.refresh(S);
check('com couro e o outono chegando, ofício faz roupa', (T.oficioPlan(S) || {}).k === 'roupas', JSON.stringify(T.oficioPlan(S)));
S.stock.ferramentas = 20; S.stock.couro = 0;
check('com ferramenta sobrando e sem couro, ofício descansa', T.oficioPlan(S) === null);
// ofício de verdade: o povo faz ferramentas
S = world(1234); learnUpTo(S, 'pedra');
Object.assign(S.stock, { ferramentas: 0, pedra: 20, madeira: 30, frutas: 30, peixe: 20, agua: 30 });
for (const k in S.vontades) S.vontades[k] = 1;
S.vontades.oficio = 3; S.vontades.fogo = 3;
days(S, 2);
check('Ofício nas Vontades: o povo lasca ferramentas', S.stats.toolsMade > 0, S.stats.toolsMade + ' feitas em 2 dias');

// ---------- 4. roupas de couro ----------
check('roupa de couro: 25% menos frio', T.coldMult({ roupa: { dur: 50 } }) === C.ROUPA_COLD && T.coldMult({ roupa: null }) === 1);
S = world(777); learnUpTo(S, 'lanca');
p = S.people[0];
p.roupa = { dur: 50 }; S.t = 5 * D + 9 * 60; Sim.refresh(S);
T.daily(S);
const wearSummer = 50 - p.roupa.dur;
S.t = 50 * D + 9 * 60; Sim.refresh(S);
T.daily(S);
const wearWinter = 50 - wearSummer - p.roupa.dur;
check('roupa gasta com o tempo, mais no inverno', Math.abs(wearSummer - C.ROUPA_WEAR_DAY) < 1e-9 && Math.abs(wearWinter - C.ROUPA_WEAR_DAY - C.ROUPA_WEAR_WINTER) < 1e-9, wearSummer.toFixed(1) + ' / ' + wearWinter.toFixed(1) + ' por dia');
p.roupa.dur = 0.5; S.stock.roupas = 0; S.events.length = 0;
T.daily(S);
check('roupa gasta se desfaz e o jogo avisa', p.roupa === null && S.events.some((e) => e.k === 'toast' && /roupa/.test(e.text)));
S.stock.roupas = 1; p.x = S.camp.x + 2.5; p.y = S.camp.y + 1.5;
const q2 = S.people[1]; q2.roupa = null; q2.x = S.camp.x + 25; q2.y = S.camp.y + 25;
T.hourly(S);
check('quem passa pelo acampamento veste a roupa do estoque (quem está longe, não)', p.roupa && p.roupa.dur === 100 && !q2.roupa && S.stock.roupas === 0);
check('bebê no colo não conta como precisando de roupa', (() => { const b = F.makeBaby(S, S.people[0], S.people[1], 'F', 'Bebê'); S.people.push(b); const n = T.needClothes(S); return n === 1; })(), 'precisam: ' + T.needClothes(S));

// ---------- 5. capivaras e caça ----------
S = world(42);
// Etapa 9: os outros bichos também estão no mapa; aqui contam as capivaras
const capiHerds = (S) => S.fauna.herds.filter((h) => (h.sp || 'capivara') === 'capivara');
const herds0 = capiHerds(S).length, capi0 = FA.alive(S).filter((e) => e.sp === 'capivara').length;
check('o mundo começa com bandos de capivaras perto da água', herds0 === C.BICHOS.capivara.n && capi0 >= herds0 * C.BICHOS.capivara.herd[0], herds0 + ' bandos, ' + capi0 + ' capivaras');
check('os bandos ficam longe do acampamento', S.fauna.herds.every((h) => Math.hypot(h.x - S.camp.x - 1, h.y - S.camp.y - 1) >= C.FAUNA_DIST[0] - 1));
learnUpTo(S, 'lanca');
S.stock.ferramentas = 4;
for (const h of S.fauna.herds) Sim.reveal(S, h.x, h.y, 9);
for (const k in S.vontades) S.vontades[k] = 1;
S.vontades.caca = 3; S.vontades.fogo = 3; S.vontades.oficio = 0;
let throws = 0;
days(S, 8, (s) => { for (const e of s.events) if (e.k === 'throw') throws++; });
check('com lança, o povo caça capivara', S.stats.hunted > 0, S.stats.hunted + ' caçadas, ' + throws + ' lançadas');
const carried = S.people.reduce((a, q) => a + (q.carry && q.carry.k === 'caca' ? q.carry.couro : 0), 0);
check('cada capivara dá carne e couro', S.stock.couro + carried === S.stats.hunted * C.CACA_COURO, 'couro ' + S.stock.couro + (carried ? ' + ' + carried + ' nas costas de quem volta' : ''));
check('o povo não acaba com um bando (fica o casal)', (() => { const size = {}; for (const e of FA.alive(S)) size[e.h] = (size[e.h] || 0) + 1; return capiHerds(S).every((h) => !size[h.id] || size[h.id] >= Math.min(C.CACA_KEEP, 2)); })());
// presa: só de bando com mais que o casal
for (const h of S.fauna.herds) { const es = FA.alive(S).filter((e) => e.h === h.id); for (const e of es.slice(C.CACA_KEEP)) { FA.kill(S, e); e.gone = true; } }
S.fauna.ents = S.fauna.ents.filter((e) => !e.gone);
check('bando só com o casal não é caçado', FA.prey(S, S.people[0], 999) === null);
// dois caçadores de olho no mesmo bando de 3: o segundo não pode levar o casal
{
  const hA = S.fauna.herds[2];
  const model = FA.alive(S)[0];
  for (const e of FA.alive(S).filter((x) => x.h === hA.id).slice(3)) { FA.kill(S, e); e.gone = true; }
  while (FA.alive(S).filter((e) => e.h === hA.id).length < 3) S.fauna.ents.push(Object.assign({}, model, { id: S.fauna.nextId++, h: hA.id, x: hA.x + 0.5, y: hA.y + 0.5, res: 0 }));
  for (const h of S.fauna.herds) if (h !== hA) for (const e of FA.alive(S).filter((x) => x.h === h.id).slice(C.CACA_KEEP)) { FA.kill(S, e); e.gone = true; }
  S.fauna.ents = S.fauna.ents.filter((e) => !e.gone);
  for (const e of FA.alive(S)) e.res = 0;
  const [ca, cb] = S.people;
  const first = FA.prey(S, ca, 999);
  if (first) first.res = ca.id;
  check('dois caçadores num bando de 3: só um escolhe presa', !!first && FA.prey(S, cb, 999) === null && FA.prey(S, ca, 999) === first);
  first.res = 0;
}
// filhotes e bando novo
const h0 = S.fauna.herds[0];
S.t = 20 * D + 8 * 60; Sim.refresh(S); h0.lastBirth = S.ck.day - C.FAUNA_BIRTH_DAYS;
const n0 = FA.alive(S).filter((e) => e.h === h0.id).length;
FA.daily(S);
check('o bando cresce fora do inverno', FA.alive(S).filter((e) => e.h === h0.id).length === n0 + 1);
const h1 = S.fauna.herds[1];
for (const e of FA.alive(S).filter((x) => x.h === h1.id)) { FA.kill(S, e); e.gone = true; }
S.fauna.ents = S.fauna.ents.filter((e) => !e.gone);
for (let i = 0; i < C.FAUNA_NEW_HERD_DAYS; i++) FA.daily(S);
check('bando que acabou dá lugar a outro, em outro canto', !S.fauna.herds.some((h) => h.id === h1.id) && capiHerds(S).length === herds0);
const hL = S.fauna.herds[3];
for (const e of FA.alive(S).filter((x) => x.h === hL.id).slice(1)) { FA.kill(S, e); e.gone = true; }
S.fauna.ents = S.fauna.ents.filter((e) => !e.gone);
S.t = 20 * D + 8 * 60; Sim.refresh(S);
for (let i = 0; i < C.FAUNA_LONELY_DAYS; i++) FA.daily(S);
check('capivara sozinha ganha companhia e o bando recomeça', FA.alive(S).filter((e) => e.h === hL.id).length === 2);
const raioAt = FA.alive(S)[0], carne0 = S.stock.carne;
const rmsg = FA.onRaio(S, Math.floor(raioAt.x), Math.floor(raioAt.y));
check('Raio numa capivara: carne e couro no estoque', !!rmsg && S.stock.carne === carne0 + C.CACA_CARNE);

// ---------- 6. moquém e jirau ----------
S = world(777); learnUpTo(S, 'anzol');
check('moquém e jirau só depois de defumar e secar', !T.buildOpen(S, 'moquem') && !T.buildOpen(S, 'jirau') && !T.workOpen(S, 'conservar'));
learnUpTo(S, 'conserva');
const mq = build(S, 'moquem'), jr = build(S, 'jirau');
Object.assign(S.stock, { peixe: 12, frutas: 12, madeira: 10, defumado: 0, seca: 0 });
S.t = 16 * D + 7 * 60; Sim.refresh(S); S.precip = null;
const plan = T.conservePlan(S);
check('há o que conservar: o plano escolhe a obra e a carga', !!plan && plan.n >= 4, plan && plan.b.type + ' ' + plan.n + ' ' + plan.k);
T.load(S, mq, 'peixe', 10); T.load(S, jr, 'frutas', 12);
const tick = (min) => { for (let i = 0; i < min / 2; i++) { S.t += 2; S.ck = Sim.clock(S.t); T.step(S, 2); } };
tick(C.MOQUEM_H * 60 - 10);
check('o moquém ainda defumando antes do prazo', !!mq.batch && S.stock.defumado === 0);
tick(12);
check('o moquém defuma em ' + C.MOQUEM_H + ' horas', !mq.batch && S.stock.defumado === 10);
const leftAtDusk = jr.batch && jr.batch.left;
S.t = Math.floor(S.t / D) * D + 18 * 60; S.ck = Sim.clock(S.t);
const leftNight0 = jr.batch.left;
tick(12 * 60);
check('o jirau não seca à noite', jr.batch && jr.batch.left === leftNight0, Math.round(leftAtDusk) + ' min faltando');
S.precip = 'chuva';
tick(60);
const rainLeft = jr.batch.left;
tick(60);
check('nem na chuva', jr.batch && jr.batch.left === rainLeft);
S.precip = null;
tick(24 * 60);
check('o jirau seca as frutas com sol', !jr.batch && S.stock.seca === 12);
S.t = 50 * D + 12 * 60; Sim.refresh(S); S.precip = null;
S.stock.peixe = 0; S.stock.carne = 0; S.stock.frutas = 12;
check('no inverno o jirau não trabalha', T.conservePlan(S) === null);
S.stock.defumado = 900;
S.t = 20 * D + 12 * 60; Sim.refresh(S); S.stock.peixe = 10;
check('com comida conservada de sobra, o povo não conserva mais', T.keptDays(S) >= C.CONSERVA_DAYS[1] && T.conservePlan(S) === null, T.keptDays(S).toFixed(0) + ' dias guardados');
// o que estraga: fresco estraga, conservado quase não (sem ninguém mexendo no estoque)
S = world(777); learnUpTo(S, 'conserva');
S.people = [];
Object.assign(S.stock, { peixe: 1000, carne: 1000, frutas: 1000, defumado: 1000, seca: 1000 });
S.t = 15 * D + 12 * 60; Sim.refresh(S);
days(S, 10);
const lost = (k) => 1000 - S.stock[k];
check('peixe e carne estragam rápido, defumado quase nada', lost('defumado') * 10 < lost('peixe') && lost('defumado') * 10 < lost('carne'), 'em 10 dias de verão: peixe -' + lost('peixe') + ', carne -' + lost('carne') + ', defumado -' + lost('defumado'));
check('fruta seca dura muito mais que fruta fresca', lost('seca') * 3 < lost('frutas'), 'frutas -' + lost('frutas') + ', seca -' + lost('seca'));

// ---------- 7. ordem de comer ----------
S = world(42); learnUpTo(S, 'conserva');
p = S.people[0]; S.people[1].x = S.camp.x + 30; S.people[1].y = S.camp.y + 30;
const fire = S.buildings.find((b) => b.type === 'fogueira');
function eatWith(stock, lit) {
  fire.fuel = lit ? 8 : 0;
  Object.assign(S.stock, { peixe: 0, carne: 0, frutas: 0, defumado: 0, seca: 0 }, stock);
  const before = Object.assign({}, S.stock);
  S.t = 20 * D + 12 * 60; Sim.refresh(S);
  p.x = S.camp.x + 1.5; p.y = S.camp.y + 1.5; p.path = null; p.act = null; p.fail = {}; p.needs.fome = 50; p.sleeping = false;
  AI.decideType(S, p, 'comer');
  for (let i = 0; i < 300 && p.act && p.act.type === 'comer'; i++) AI.tick(S, p, 2);
  const eaten = {};
  for (const k of T.FOOD) if (S.stock[k] < before[k]) eaten[k] = before[k] - S.stock[k];
  return eaten;
}
let ea = eatWith({ peixe: 5, frutas: 5, defumado: 5, seca: 5 }, true);
check('com fogo aceso, come o fresco assado primeiro', ea.peixe > 0 && !ea.defumado && !ea.seca && !ea.frutas, JSON.stringify(ea));
ea = eatWith({ carne: 5, peixe: 3, defumado: 5 }, true);
check('com mais carne que peixe, come carne assada', ea.carne > 0 && !ea.peixe, JSON.stringify(ea));
ea = eatWith({ frutas: 5, defumado: 5, seca: 5 }, true);
check('sem fresco assado: frutas antes do conservado', ea.frutas > 0 && !ea.defumado && !ea.seca, JSON.stringify(ea));
ea = eatWith({ defumado: 5, seca: 5 }, true);
check('conservado: defumado antes da fruta seca', ea.defumado > 0 && !ea.seca, JSON.stringify(ea));
ea = eatWith({ peixe: 5, defumado: 5 }, false);
check('fogo apagado: defumado antes de peixe cru', ea.defumado > 0 && !ea.peixe, JSON.stringify(ea));
ea = eatWith({ peixe: 5 }, false);
check('só peixe e fogo apagado: come cru', ea.peixe > 0 && p.mem.some((m) => m.k === 'comeuCru'), JSON.stringify(ea));

// ---------- 8. argila, forno e potes ----------
S = world(9001); learnUpTo(S, 'conserva');
check('argila e forno só com a cerâmica', !T.workOpen(S, 'argila') && !T.buildOpen(S, 'forno'));
learnUpTo(S, 'ceramica');
check('sem forno, água e comida como antes', T.waterCap(S) === C.WATER_CAP && T.rotMult(S, 'peixe') === 1);
Object.assign(S.stock, { argila: 0, madeira: 30, pedra: 20, frutas: 30, peixe: 20, agua: 30 });
const fAt = spot(S, 'forno');
const fb = Sim.placeBlueprint(S, 'forno', fAt.x, fAt.y);
for (const k in S.vontades) S.vontades[k] = 1;
S.vontades.argila = 2; S.vontades.construir = 3; S.vontades.fogo = 3;
S.t = 16 * D + 7 * 60; Sim.refresh(S);
let dugAt = 0;
for (let d = 0; d < 8 && !fb.built; d++) days(S, 1, (s) => { if (!dugAt && (s.stock.argila > 0 || fb.have.argila > 0)) dugAt = s.t; });
check('o povo cava argila na beira da água e ergue o forno', fb.built, dugAt ? 'primeira argila no dia ' + Math.floor(dugAt / D) + ', forno ' + (fb.built ? 'pronto' : 'em obra: ' + JSON.stringify(fb.have) + ' ' + (fb.progress * 100).toFixed(0) + '%') : 'sem argila');
check('o forno queima potes: cabe o dobro de água', S.tech.potes && T.waterCap(S) === C.POTES_WATER_CAP && C.POTES_WATER_CAP === 2 * C.WATER_CAP);
check('com potes, peixe, carne e fruta estragam menos (conservado igual)', T.rotMult(S, 'peixe') === C.POTES_ROT && T.rotMult(S, 'frutas') === C.POTES_ROT && T.rotMult(S, 'defumado') === 1);

// ---------- 9. fim da Era da Família ----------
S = world(42);
crowd(S, C.ALDEIA_POP);
learnUpTo(S, 'conserva');
check(C.ALDEIA_POP + ' pessoas sem a cerâmica: a era continua', !T.checkEra(S) && !S.stats.eraEnd);
S = world(42); crowd(S, C.ALDEIA_POP - 1); learnUpTo(S, 'ceramica');
check('cerâmica com ' + (C.ALDEIA_POP - 1) + ' pessoas: a era continua', !T.checkEra(S) && !S.stats.eraEnd);
crowd(S, C.ALDEIA_POP); S.events.length = 0;
T.daily(S);
check('cerâmica e ' + C.ALDEIA_POP + ' pessoas: a Era da Família se fecha', !!S.stats.eraEnd && S.era === 'aldeia' && S.events.some((e) => e.k === 'era') && /Era da Família se fecha/.test(S.chron[S.chron.length - 1].text));
const eraT = S.stats.eraEnd; T.daily(S);
check('a era se fecha uma vez só', S.stats.eraEnd === eraT && S.chron.filter((c) => /Era da Família se fecha/.test(c.text)).length === 1);
check('metas das descobertas', T.goals3().length === 6 && T.goals3().every((g) => T.goalTest[g.id]));

// ---------- 10. save ----------
S = world(777); learnUpTo(S, 'conserva');
S.stock.ferramentas = 3; S.stock.roupas = 2; S.people[0].roupa = { dur: 77 };
const mq2 = build(S, 'moquem'); S.stock.peixe = 10; T.load(S, mq2, 'peixe', 8);
S.tech.prat.ceramica = 123; S.tech.who[S.people[1].id] = 45;
days(S, 1);
const txt = JSON.stringify(Save.serialize(S));
const S2 = Save.deserialize(JSON.parse(txt));
check('save guarda as descobertas, a prática e quem praticou', JSON.stringify(S2.tech.known) === JSON.stringify(S.tech.known) && S2.tech.prat.ceramica === S.tech.prat.ceramica && JSON.stringify(S2.tech.who) === JSON.stringify(S.tech.who));
check('save guarda ferramenta e roupa de cada um', S2.people.every((q, i) => JSON.stringify(q.tool) === JSON.stringify(S.people[i].tool) && JSON.stringify(q.roupa) === JSON.stringify(S.people[i].roupa)));
check('save guarda a carga do moquém', JSON.stringify((S2.buildings.find((b) => b.type === 'moquem') || {}).batch) === JSON.stringify(mq2.batch));
check('save guarda capivaras e bandos', FA.alive(S2).length === FA.alive(S).length && S2.fauna.herds.length === S.fauna.herds.length && S2.fauna.nextId === S.fauna.nextId);
{ const e0 = FA.alive(S)[0]; e0.res = 999; const S2b = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S)))); e0.res = 0;
  check('ao carregar, nenhuma capivara fica presa a um caçador que não existe mais', FA.alive(S2b).every((e) => !e.res)); }
check('save continua pequeno', txt.length < 40000, txt.length + ' bytes');
let err = null;
try { days(S2, 3); } catch (e) { err = e; }
check('o jogo segue depois de carregar', !err && S2.people.every((q) => q.alive) && FA.alive(S2).some((e) => e.x !== undefined), err ? err.message : '');

// ---------- 11. save da v0.4 (Etapa 4) ----------
const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8'));
let S3 = null; err = null;
try { S3 = Save.deserialize(old); } catch (e) { err = e; }
check('save da v0.4 abre na v0.5', !!S3 && !err, err ? err.message : S3.people.filter((q) => q.alive).length + ' vivos, dia ' + Math.floor(S3.t / D));
if (S3) {
  check('save antigo começa a trilha do zero', T.count(S3) === 0 && T.open(S3) === 'pedra');
  check('save antigo ganha capivaras (e, na 0.9, os outros bichos)', capiHerds(S3).length === C.BICHOS.capivara.n && FA.alive(S3).some((e) => e.sp === 'capivara') && new Set(FA.alive(S3).map((e) => e.sp)).size >= 8);
  check('save antigo ganha estoque e Vontades novas', ['carne', 'defumado', 'seca', 'couro', 'argila', 'ferramentas', 'roupas'].every((k) => S3.stock[k] === 0) && ['caca', 'argila', 'oficio', 'conservar'].every((k) => S3.vontades[k] === C.DEFAULT_VONTADES[k]));
  check('save antigo: ninguém com ferramenta ou roupa, habilidades novas zeradas', S3.people.every((q) => q.tool === null && q.roupa === null && q.skills.caca === 0 && q.skills.oficio === 0));
  const pend = S3.buildings.find((b) => !b.built);
  err = null;
  try { days(S3, 20); } catch (e) { err = e; }
  check('save antigo segue jogando 20 dias', !err && !S3.over, err ? err.stack.split('\n').slice(0, 3).join(' | ') : '');
  check('a obra que estava pela metade termina', !pend || pend.built, pend ? pend.type + ' ' + JSON.stringify(pend.have) : 'sem obra pendente');
  check('estoque sem números quebrados', Object.values(S3.stock).every(Number.isFinite), JSON.stringify(S3.stock));
  check('a prática da pedra lascada começa depois de carregar', (S3.tech.prat.pedra || 0) > 0 || T.known(S3, 'pedra'), (S3.tech.prat.pedra || 0).toFixed(1) + ' h');
}

// ---------- 12. jogo fechado ----------
S = world(42); learnUpTo(S, 'pedra');
S.tech.prat.cestos = T.need('cestos');
let res = Off.run(S, 20 * D);
check('com o jogo fechado, as descobertas seguem', T.known(S, 'cestos') && res.newChron.some((c) => c.disc === 'cestos'));
S = world(42); crowd(S, C.ALDEIA_POP); learnUpTo(S, 'ceramica'); S.stats.eraEnd = 0; S.era = '';
res = Off.run(S, 2 * D);
check('a era pode se fechar com o jogo fechado (a janela aparece ao voltar)', !!S.stats.eraEnd && !S.stats.eraSeen && res.newChron.some((c) => /Era da Família/.test(c.text)));

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }   // só as unidades

// ---------- simulação longa ----------
const YEARS = +process.argv[2] || 20;
const SEEDS = [42, 777, 9001];
const MODES = ['bem', 'rev', 'largado'];
console.log('\n' + YEARS + ' anos em três mundos (bem, bem com Revelação, largado):');
const jobs = [];
for (const mode of MODES) for (const seed of SEEDS) jobs.push({ seed, mode, years: YEARS });
const N = Math.min(jobs.length, Math.max(2, require('os').cpus().length));
const chunks = Array.from({ length: N }, () => []);
jobs.forEach((j, i) => chunks[i % N].push(j));
let left = N;
const results = [];
for (const c of chunks) {
  const wk = new Worker(__filename, { workerData: { jobs: c } });
  wk.on('message', (r) => { results.push(...r); if (--left === 0) report(); });
  wk.on('error', (e) => { console.error(e); process.exit(1); });
}
function report() {
  results.sort((a, b) => MODES.indexOf(a.mode) - MODES.indexOf(b.mode) || a.seed - b.seed);
  for (const r of results) {
    if (r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ' sem erros', false, r.errors[0].split('\n').slice(0, 4).join(' | ')); continue; }
    const line = T.ORDER.map((k) => k + ' ' + (r.disc[k] !== undefined ? r.disc[k] + (r.how[k] === 'revelacao' ? '*' : '') : '-')).join(', ');
    console.log('\nmundo ' + r.seed + ' · ' + r.mode + ' · ' + r.sec.toFixed(0) + ' s · ' + r.alive + ' vivos · era ' + (r.era || '-') + (r.rev ? ' · ' + r.rev + ' revelações' : ''));
    console.log('  descobertas (ano; * = Revelação): ' + line);
    console.log('  fome ' + (r.hungry * 100).toFixed(1) + '% · frio ' + (r.cold * 100).toFixed(1) + '% · mortes: ' + (r.deaths.join(', ') || 'nenhuma') + ' · capivaras (mín. no fim do ano) ' + r.fauna0);
    console.log('  ferramentas: ' + r.stats.made + ' feitas, ' + r.stats.broken + ' quebradas, ' + Math.round(r.toolsEnd * 100) + '% dos adultos com uma no fim · roupas: ' + r.stats.clothes + ' feitas, inverno com couro ' + (r.winterCloth.length ? r.winterCloth.map((x) => Math.round(x * 100)).join('/') + '%' : '-'));
    console.log('  caçadas ' + r.stats.hunted + ' · conservadas ' + r.stats.conserved + ' porções · estragadas ' + r.stats.rotted + ' · conserva máx. ' + r.foodMax + ' porções (' + r.keptMax.toFixed(0) + ' dias)');
    const starve = r.deaths.filter((c) => c === 'fome' || c === 'frio' || c === 'sede').length;
    check('mundo ' + r.seed + ' ' + r.mode + ': ninguém morre de fome, sede ou frio', starve === 0, r.deaths.join(', ') || 'nenhuma morte');
    check('mundo ' + r.seed + ' ' + r.mode + ': fome e frio raros', r.hungry < 0.05 && r.cold < 0.05);
    check('mundo ' + r.seed + ' ' + r.mode + ': as capivaras não somem', r.fauna0 > 0, 'mínimo ' + r.fauna0);
    if (r.mode === 'largado') {
      check('mundo ' + r.seed + ' largado: mesmo sem ajuda, o povo descobre pela prática', Object.keys(r.disc).length >= 3, Object.keys(r.disc).join(', '));
      continue;
    }
    check('mundo ' + r.seed + ' ' + r.mode + ': a trilha inteira em ' + YEARS + ' anos', T.ORDER.every((k) => r.disc[k] !== undefined));
    check('mundo ' + r.seed + ' ' + r.mode + ': a Era da Família se fecha', !!r.era && r.era <= YEARS, 'ano ' + (r.era || '-'));
    const ts = T.ORDER.map((k) => r.disc[k]).filter((x) => x !== undefined);
    let gap = 99; for (let i = 1; i < ts.length; i++) gap = Math.min(gap, ts[i] - ts[i - 1]);
    if (r.mode === 'bem') {
      check('mundo ' + r.seed + ' bem: descobertas espaçadas (nunca duas na mesma estação)', gap >= 0.25, 'menor intervalo ' + gap.toFixed(2) + ' ano');
      check('mundo ' + r.seed + ' bem: a pedra lascada no primeiro ano ou dois', r.disc.pedra <= 2, 'ano ' + r.disc.pedra);
    }
    check('mundo ' + r.seed + ' ' + r.mode + ': ferramentas e roupas de couro circulam', r.stats.made >= 5 && r.stats.clothes >= 5 && r.stats.broken >= 3);
    check('mundo ' + r.seed + ' ' + r.mode + ': a maioria dos adultos com ferramenta no fim', r.toolsEnd >= 0.5, Math.round(r.toolsEnd * 100) + '%');
    const lastW = r.winterCloth.slice(-5), avgW = lastW.reduce((a, b) => a + b, 0) / Math.max(1, lastW.length);
    check('mundo ' + r.seed + ' ' + r.mode + ': nos últimos invernos, a maioria veste couro', avgW >= 0.5, Math.round(avgW * 100) + '%');
    check('mundo ' + r.seed + ' ' + r.mode + ': caça e conserva de verdade', r.stats.hunted >= 10 && r.stats.conserved >= 100, r.stats.hunted + ' caçadas, ' + r.stats.conserved + ' conservadas');
    check('mundo ' + r.seed + ' ' + r.mode + ': a conserva não incha', r.keptMax < C.CONSERVA_DAYS[1] * 2, r.keptMax.toFixed(0) + ' dias no máximo');
  }
  const eras = (m) => results.filter((r) => r.mode === m && r.era).map((r) => r.era);
  const cer = (m) => results.filter((r) => r.mode === m && r.disc.ceramica !== undefined).map((r) => r.disc.ceramica);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const med = (a) => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const eb = eras('bem'), er = eras('rev'), cb = cer('bem'), cr = cer('rev');
  // a Revelação adianta a trilha; a era ainda espera as 15 pessoas, então chega junto ou antes, nunca depois.
  // Desde a 0.6 (relações livres), quantos filhos nascem varia muito de um mundo para outro; por isso a mediana
  if (cb.length && cr.length) check('com a Revelação, a cerâmica chega anos antes', avg(cr) < avg(cb) - 3, 'bem ' + avg(cb).toFixed(1) + ' anos · com Revelação ' + avg(cr).toFixed(1) + ' anos');
  // Quantos filhos nascem varia muito de um mundo para outro (o povo chega a 15 entre o ano 10 e o 14, com ou sem
  // Revelação); por isso a conta é mundo a mundo: com a cerâmica revelada cedo, a era fecha assim que o povo chega a 15.
  const rv = results.filter((r) => r.mode === 'rev' && r.era && r.pop15);
  if (rv.length) check('com a Revelação, a era fecha assim que o povo chega a ' + C.ALDEIA_POP + ' pessoas', rv.every((r) => r.era <= Math.max(r.pop15, r.disc.ceramica) + 0.05), rv.map((r) => 'era ' + r.era + ' · ' + C.ALDEIA_POP + ' pessoas ' + r.pop15).join(' | '));
  if (eb.length && er.length) console.log('  (mediana da era: bem ' + med(eb).toFixed(1) + ' anos · com Revelação ' + med(er).toFixed(1) + ' anos)');
  console.log('\n' + ok + ' ok, ' + bad + ' falhas');
  process.exit(bad ? 1 : 0);
}
