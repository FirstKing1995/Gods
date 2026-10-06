// Gods · testes das obras (Etapa 7). Uso: node test/obras-test.js [anos]
// 1) unidades: toda obra evolui (níveis, custos, o que pede), a casa que o lugar pede (água, mata, campo, serra),
//    efeitos (fogueira de pedras e do centro, casas, moquém grande, jirau coberto, forno grande, armazém contra o lobo
//    e contra a comida estragada), tábuas, fibra, mantas e redes, caminhos (marcar, abrir, andar mais rápido, pedra,
//    trilhas que se formam e somem), metas novas, save novo e save antigo (barraca avançada vira nível 2)
// 2) 20 anos em três mundos, com um robô que usa tudo (bem) e sem ajuda (largado): ninguém morre de fome ou frio,
//    obras melhoradas, casas erguidas, tábuas, mantas e caminhos circulando, e o trabalho novo não rouba o de sempre
const path = require('path');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Life: L, Obras: O, Narr: N } = G;
const TT = G.T;
const Y = 60 * 1440, D = 1440;

// ---------- ajudantes ----------
function newWorld(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  return Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
}
function spot(S, t, from) {
  for (let r = from || 2; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t, lv, kind) {
  const at = spot(S, t);
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (lv) { b.lv = lv; b.kind = kind || null; }
  if (t === 'fogueira') b.fuel = 8;
  Sim.refresh(S);
  return b;
}
function world(seed) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
function learnUpTo(S, id) {
  for (const k of T.ORDER) { T.discover(S, k); if (k === id) break; }
  S.events.length = 0;
}
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
// entrega o material e termina a obra (ou a melhoria) na hora
function finish(S, b) {
  const j = Sim.jobOf(b);
  for (const k in j.cost) j.have[k] = j.cost[k];
  Sim.complete(S, b);
}
// pinta o chão em volta de uma obra (vitrine de ambiente): tipo de tile e objetos
function paint(S, b, r, tile, objs) {
  const w = S.world, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
    const i = y * w.W + x;
    if (w.bgrid[i] >= 0 || Sim.isCamp(S, i)) continue;
    w.tile[i] = tile;
    const o = W.objAt(w, i);
    if (o && objs === 'clear') W.removeObj(w, o);
  }
}
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== toda obra evolui =====================
  {
    const types = Object.keys(C.BUILD);
    check('toda obra tem pelo menos uma melhoria', types.every((t) => C.BUILD[t].up && C.BUILD[t].up.length >= 1), types.join(', '));
    const f2 = Sim.defOf('fogueira', 2), f3 = Sim.defOf('fogueira', 3);
    check('fogueira de pedras: lenha dura mais, chuva quase não apaga, mais lugares no calor', f2.fire.burn > C.BUILD.fogueira.fire.burn && f2.fire.rain < 1 && f2.fire.seats === 6 && f2.fire.r === 6, JSON.stringify(f2.fire));
    check('fogueira do centro: histórias para 16, que ensinam mais, e festa que aproxima mais', f3.fire.listen === 16 && f3.fire.story > 1 && f3.fire.party > 1 && f3.max, JSON.stringify(f3.fire));
    const oca = Sim.defOf('barraca', 3, 'oca'), pal = Sim.defOf('barraca', 3, 'palafita');
    check('a barraca vira casa no nível 3, cada uma com o que é dela', oca.cap === 12 && oca.name === 'Oca' && pal.needB === 'marcenaria' && Sim.defOf('barraca', 3, 'pedra').heat === 18, oca.name + ' ' + oca.cap + ' · ' + pal.name);
    check('o custo da melhoria é só dela (não soma o nível de baixo)', Sim.defOf('fogueira', 2).cost.pedra === 8 && !Sim.defOf('fogueira', 2).cost.madeira, JSON.stringify(Sim.defOf('fogueira', 2).cost));
  }
  {
    const S = world(42);
    const f = build(S, 'fogueira');
    let up = Sim.upgrades(S, f);
    check('fogueira pronta: uma melhoria, que dá para marcar', up.length === 1 && up[0].lv === 2 && !up[0].why, JSON.stringify(up.map((o) => [o.def.name, o.why])));
    Sim.startUpgrade(S, f); finish(S, f);
    check('melhoria pronta: sobe o nível, conta na Crônica e na estatística', f.lv === 2 && S.chron.some((c) => /virou fogueira de pedras/.test(c.text)) && S.stats.upgrades === 1 && S.events.some((e) => e.k === 'upgrade'), f.lv + ' · ' + S.chron[S.chron.length - 1].text);
    up = Sim.upgrades(S, f);
    check('fogueira do centro pede tábuas: sem marcenaria, diz o porquê', up.length === 1 && /marcenaria/.test(up[0].why), up[0].why);
    learnUpTo(S, 'pedra');
    build(S, 'marcenaria');
    up = Sim.upgrades(S, f);
    check('com a marcenaria de pé, a fogueira do centro libera', !up[0].why, up[0].why || 'livre');
    Sim.startUpgrade(S, f); finish(S, f);
    check('no último nível não há mais melhoria', f.lv === 3 && Sim.upgrades(S, f).length === 0 && Sim.def(f).max);
    // moquém, jirau, forno, armazém e oficinas: cada uma com o que pede
    const need = {};
    for (const t of ['moquem', 'jirau', 'forno', 'armazem', 'tecelagem']) need[t] = Sim.needWhy(S, Sim.defOf(t, 2)) || 'livre';
    check('as outras melhorias dizem o que falta (só com a pedra lascada)', /cestos/.test(need.tecelagem) && /cerâmica/.test(need.armazem) && /defumar/.test(need.moquem), JSON.stringify(need));
    learnUpTo(S, 'conserva');
    for (const t of ['moquem', 'jirau', 'forno', 'armazem']) need[t] = Sim.needWhy(S, Sim.defOf(t, 2)) || 'livre';
    check('com defumar e secar, moquém grande e jirau coberto liberam; forno e armazém de tábuas esperam a cerâmica', need.moquem === 'livre' && need.jirau === 'livre' && /cerâmica/.test(need.forno) && /cerâmica/.test(need.armazem), JSON.stringify(need));
    // cancelar uma melhoria devolve o material
    const f2 = build(S, 'fogueira');
    S.stock.pedra = 20; Sim.startUpgrade(S, f2);
    Sim.jobOf(f2).have.pedra = 5; S.stock.pedra -= 5;
    Sim.removeBuilding(S, f2);
    check('cancelar a melhoria devolve o material e a obra fica', S.stock.pedra === 20 && S.buildings.includes(f2) && !f2.up && f2.lv === 1, 'pedra ' + S.stock.pedra);
  }

  // ===================== a casa que o lugar pede =====================
  {
    const S = world(777);
    learnUpTo(S, 'ceramica');
    const b = build(S, 'barraca', 2);
    const env = (tile, objs) => { paint(S, b, 5.5, tile, objs); return O.envOf(S, b); };
    let e = env(TT.FOREST);
    check('mata em volta: pede oca', e.mata && !e.campo, JSON.stringify(e));
    e = env(TT.GRASS, 'clear');
    check('campo aberto em volta: casa de barro', e.campo && !e.mata && !e.serra, JSON.stringify(e));
    e = env(TT.HILL);
    check('colina em volta: casa de pedra', e.serra && !e.campo, JSON.stringify(e));
    // água a 3 passos da beira
    const w = S.world;
    env(TT.GRASS, 'clear');
    w.tile[(b.y + 1) * w.W + b.x + b.w + 2] = TT.SHALLOW;
    check('água a até 3 passos: palafita possível', O.envOf(S, b).agua);
    w.tile[(b.y + 1) * w.W + b.x + b.w + 2] = TT.GRASS;
    w.tile[(b.y + 1) * w.W + b.x + b.w + 3] = TT.SHALLOW;
    check('a 4 passos, não', !O.envOf(S, b).agua);
    w.tile[(b.y + 1) * w.W + b.x + b.w + 3] = TT.GRASS;
    // o menu de casas: campo aberto, sem marcenaria
    env(TT.GRASS, 'clear');
    const opts = Sim.upgrades(S, b);
    const why = Object.fromEntries(opts.map((o) => [o.kind, o.why || 'livre']));
    check('as quatro casas aparecem, cada uma com o porquê', opts.length === 4 && why.barro === 'livre' && /mata/.test(why.oca) && /marcenaria/.test(why.palafita) && /colina|pedras/.test(why.pedra), JSON.stringify(why));
    check('sem escolher, marca a primeira que dá (aqui, a de barro)', Sim.startUpgrade(S, b) && b.up.kind === 'barro', b.up && b.up.kind);
    finish(S, b);
    check('casa de barro pronta: 8 lugares e +16 °C, conta como primeira casa', b.lv === 3 && b.kind === 'barro' && Sim.def(b).cap === 8 && Sim.def(b).heat === 16 && S.stats.houses && S.stats.houses.barro, Sim.def(b).name);
    // quem dorme lá dentro sente o calor da casa
    const p = S.people[0];
    p.inTent = b.id; p.sleeping = true;
    const tIn = Sim.personTemp(S, p);
    p.inTent = 0;
    const tOut = Sim.personTemp(S, p);
    check('dormir na casa de barro: +16 °C', Math.round(tIn - tOut) === 16, Math.round(tIn - tOut) + ' °C');
    check('as camas contam a casa', F.bedsTotal(S) >= 8, F.bedsTotal(S));
  }

  // ===================== fogueira: lenha, chuva, lugares, raio =====================
  {
    const burn = (lv, precip) => {
      const S = world(9001);
      const f = build(S, 'fogueira');
      f.lv = lv; f.fuel = 8;
      for (let i = 0; i < 150; i++) { S.precip = precip || null; Sim.step(S, 2); S.events.length = 0; if (f.fuel <= 0) break; }
      return 8 - f.fuel;
    };
    // (o povo pode pôr lenha; por isso comparamos com folga)
    const a = burn(1), b2 = burn(2);
    check('fogueira de pedras gasta menos lenha', b2 < a, a.toFixed(2) + ' → ' + b2.toFixed(2));
    const S = world(9001);
    const f = build(S, 'fogueira');
    const d = (lv) => { f.lv = lv; return Sim.fireHeat(S, f.x + 0.5 + 5.5, f.y + 0.5); };
    check('o calor vai mais longe na de pedras (a 5,5 passos)', d(1) === 0 && d(2) > 0, d(1).toFixed(1) + ' → ' + d(2).toFixed(1));
    f.lv = 3;
    check('as histórias da fogueira do centro chamam 16', L.fireDef ? L.fireDef(S, f.id).listen === 16 : true);
  }

  // ===================== moquém grande, jirau coberto, forno grande =====================
  {
    const S = world(42);
    learnUpTo(S, 'ceramica');
    const m = build(S, 'moquem', 2), j = build(S, 'jirau', 2), fo = build(S, 'forno');
    S.stock.peixe = 40; S.stock.madeira = 10; S.stock.frutas = 40; S.stock.defumado = 0; S.stock.seca = 0;
    const plan = T.conservePlan(S);
    check('moquém grande defuma 20 de uma vez', plan && plan.n === 20, plan && plan.n);
    S.precip = 'chuva'; S.ck.hour = 12; S.ck.season = 0;
    check('jirau coberto seca na chuva (o simples não)', T.dryNow(S, j) && !T.dryNow(S, { type: 'jirau', lv: 1 }));
    S.tech.potes = true;
    const cap1 = T.waterCap(S), rot1 = T.rotMult(S, 'peixe');
    fo.lv = 2;
    check('forno grande: 90 de água e a comida estraga 40% menos', T.waterCap(S) === 90 && T.rotMult(S, 'peixe') === 0.6 && cap1 === 60 && rot1 === 0.7, T.waterCap(S) + ' · ' + T.rotMult(S, 'peixe'));
  }

  // ===================== armazém =====================
  {
    const S = world(777);
    check('antes do primeiro inverno o armazém não abre', !T.buildOpen(S, 'armazem') && /inverno/.test(O.openWhy(S, 'armazem')));
    S.stats.winters = 1;
    days(S, 1);
    check('depois do primeiro inverno, abre (e avisa uma vez)', T.buildOpen(S, 'armazem') && S.stats.armazemOpen);
    const far = { x: S.camp.x + 14, y: S.camp.y };
    check('longe do estoque não dá', /Longe do estoque/.test(Sim.canPlace(S, 'armazem', far.x, far.y)), Sim.canPlace(S, 'armazem', far.x, far.y));
    // comida estragando: com e sem armazém (mesma semente, dez dias de verão)
    const rotRun = (lv) => {
      const R = world(777);
      R.t = (60 + 16) * D + 7 * 60; Sim.refresh(R);
      if (lv) build(R, 'armazem', lv);
      R.people.forEach((p) => { p.alive = false; });   // ninguém come: só o que estraga
      R.stock.peixe = 200; R.stock.frutas = 200;
      R.stats.rotted = 0;
      for (let d = 0; d < 10; d++) { R.over = false; Sim.advance(R, D); }
      return R.stats.rotted;
    };
    const r0 = rotRun(0), r1 = rotRun(1), r2 = rotRun(2);
    check('com armazém a comida estraga menos, e menos ainda no de tábuas', r1 < r0 * 0.85 && r2 < r1, r0 + ' → ' + r1 + ' → ' + r2);
    // lobo no estoque aberto: sem armazém leva comida, com armazém não
    const wolf = (withStore) => {
      const R = world(9001);
      R.stats.winters = 1;
      if (withStore) build(R, 'armazem');
      R.t = Math.floor(R.t / D) * D + D + 22 * 60; Sim.refresh(R);
      R.stock.carne = 20; R.stock.peixe = 20; Sim.refresh(R);
      R.narr.active.lobos = { t0: R.t, pack: 1, bites: 0, stolen: 0, killed: 0, hurt: [] };
      R.narr.ents.push({ id: 900, k: 'lobo', x: R.camp.x + 1, y: R.camp.y + 1, px: R.camp.x + 1, py: R.camp.y + 1, dir: 0, walk: 0, path: null, pathI: 0, state: 'roubar', t: 0, home: 0, bites: 0, fur: 0, ring: 0 });
      const before = R.stock.carne + R.stock.peixe;
      for (let i = 0; i < 5; i++) N.step(R, 2);
      return before - (R.stock.carne + R.stock.peixe);
    };
    const lost0 = wolf(false), lost1 = wolf(true);
    check('o lobo leva comida do estoque aberto, mas não do armazém', lost0 > 0 && lost1 === 0, lost0 + ' → ' + lost1);
  }

  // ===================== tábuas, fibra, mantas e redes =====================
  {
    const S = world(42);
    learnUpTo(S, 'cestos');
    check('depois dos cestos, cada árvore cortada dá fibra', O.embira(S) === C.EMBIRA);
    const m = build(S, 'marcenaria'), tc = build(S, 'tecelagem');
    const f = build(S, 'fogueira', 2);
    S.stock.madeira = 60; S.stock.tabuas = 0; S.stock.pedra = 30; S.stock.fibra = 30; S.stock.ferramentas = 6;
    Sim.startUpgrade(S, f); Sim.refresh(S);
    const plan = O.oficioPlan(S);
    check('obra pedindo tábua: o Ofício vai para a marcenaria', plan && plan.k === 'tabuas' && plan.b === m, plan && plan.k);
    S.vontades.oficio = 3; S.vontades.construir = 3;
    days(S, 6);
    check('tábuas feitas e a fogueira do centro erguida', S.stats.tabuasMade >= 6 && f.lv === 3, S.stats.tabuasMade + ' tábuas · fogueira nível ' + f.lv);
    // mantas e redes no frio
    S.t = Math.floor(S.t / Y) * Y + Y + 35 * D + 8 * 60; Sim.refresh(S);   // outono
    S.stock.fibra = 40; S.stock.tabuas = 20;
    days(S, 6);
    const withManta = S.people.filter((p) => p.alive && p.manta).length;
    check('no outono a tecelagem faz mantas e o povo veste', S.stats.mantasMade >= 2 && withManta >= 2, S.stats.mantasMade + ' mantas · ' + withManta + ' com manta · redes ' + S.stats.redesMade);
    const p = S.people.find((q) => q.alive && q.manta);
    if (p) {
      p.sleeping = true; p.inTent = 0;
      const t1 = Sim.personTemp(S, p); const mm = p.manta; p.manta = null;
      const t0 = Sim.personTemp(S, p); p.manta = mm; p.sleeping = false;
      check('dormir de manta: +5 °C', Math.round(t1 - t0) === C.MANTA_HEAT, Math.round(t1 - t0));
      const dur = p.manta.dur; O.daily(S);
      check('a manta gasta com o uso', p.manta && p.manta.dur < dur, dur + ' → ' + (p.manta && p.manta.dur));
    }
    // rede: o sono rende mais
    const q = S.people[0];
    const rate = (withRede) => { q.rede = withRede ? { dur: 100 } : null; q.sleeping = true; q.inTent = 0; q.needs.energia = 20; q.act = { type: 'dormir', stage: 'sleep', t: 0, score: 50 }; Sim.step(S, 2); const e = q.needs.energia; q.sleeping = false; q.act = null; return e - 20; };
    const r0 = rate(false), r1 = rate(true);
    check('rede de dormir: o sono rende mais', r1 > r0 * 1.1, r0.toFixed(3) + ' → ' + r1.toFixed(3));
  }

  // ===================== caminhos =====================
  {
    const S = world(777);
    const w = S.world;
    const water = w.tile.findIndex((t, i) => G.IS_WATER[t] && S.seen[i]);
    check('caminho na água não', water < 0 || !O.markRoad(S, water, 2), O.roadWhy(S, water));
    const tree = w.objs.find((o) => o.k === 'tree' && S.seen[o.y * w.W + o.x]);
    check('caminho em árvore não', !tree || !O.markRoad(S, tree.y * w.W + tree.x, 2), tree && O.roadWhy(S, tree.y * w.W + tree.x));
    const fog = S.seen.findIndex((v) => !v);
    check('caminho na névoa não', fog < 0 || /névoa/.test(O.roadWhy(S, fog)));
    // um caminho de 12 passos saindo do acampamento, pelo trajeto que se anda
    const campI = (S.camp.y + 1) * w.W + S.camp.x + 1;
    const far = W.findNearest(w, campI, (i) => { const x = i % w.W, y = (i / w.W) | 0; return Math.hypot(x - S.camp.x, y - S.camp.y) >= 12 && O.canRoad(S, i) ? 1 : 0; }, 200);
    const line = W.findPath(w, campI, far.idx, 400).filter((i) => O.canRoad(S, i)).slice(0, 12);
    for (const i of line) O.markRoad(S, i, 2);
    check('marcar: vira obra de caminho', S.obras.jobs.length === line.length && line.every((i) => w.roadJob[i] === 2), S.obras.jobs.length);
    check('com caminho marcado, Construir tem trabalho', O.roadNeed(S) === 1);
    S.vontades.construir = 3;
    days(S, 5);
    const built = line.filter((i) => w.road[i] === 2).length;
    check('o povo abre o caminho', built === line.length && S.stats.roadsBuilt >= line.length && S.chron.some((c) => /primeiro caminho/.test(c.text)), built + ' de ' + line.length);
    // andar no caminho é mais rápido: custo do A*
    const a = line[0], z = line[line.length - 1];
    const cost = (useRoad) => { const saved = w.road.slice(); if (!useRoad) { w.road.fill(0); w.roadCount = 0; } let c = 0; const p = W.findPath(w, a, z, 600) || []; for (const i of p) c += C.COST[w.tile[i]] * C.ROAD_MULT[w.road[i]]; w.road.set(saved); w.roadCount = saved.reduce((n, v) => n + (v ? 1 : 0), 0); return c; };
    const c0 = cost(false), c1 = cost(true);
    check('no caminho de terra se anda mais rápido', c1 < c0 * 0.85, c0.toFixed(1) + ' → ' + c1.toFixed(1));
    // de pedra: leva pedra do estoque
    S.stock.pedra = 30;
    const p0 = S.stock.pedra;
    for (const i of line.slice(0, 5)) O.markRoad(S, i, 3);
    days(S, 5);
    const stone = line.slice(0, 5).filter((i) => w.road[i] === 3).length;
    check('caminho de pedra: 1 pedra por passo', stone === 5 && p0 - S.stock.pedra >= 5, stone + ' de pedra · pedra ' + p0 + ' → ' + S.stock.pedra);
    // desfazer
    O.markRoad(S, line[11], 0);
    check('desfazer tira o caminho', w.road[line[11]] === 0);
    // árvore não volta no caminho; o caminho limpa o toco
    const stump = w.objs.find((o) => (o.k === 'stump' || o.k === 'tree') && S.seen[o.y * w.W + o.x] && w.bgrid[o.y * w.W + o.x] < 0);
    if (stump) {
      const i = stump.y * w.W + stump.x;
      stump.k = 'stump'; stump.regrow = C.TREE_REGROW_DAYS + 5; W.refreshBlock(w, i);
      O.setRoad(S, i, 1);
      days(S, 1);
      check('no caminho a árvore não volta', stump.k === 'stump');
      O.setRoad(S, i, 0);
      O.markRoad(S, i, 2);
      stump.regrow = C.TREE_REGROW_DAYS + 5;
      Sim.daily(S);
      check('no caminho só marcado a árvore também não volta', stump.k === 'stump' && w.roadJob[i] === 2);
      O.finishRoad(S, O.jobAt(S, i));
      check('abrir o caminho limpa o toco', stump.k === 'gone' && w.road[i] === 2);
    }
    // obra erguida em cima do caminho: o caminho e o marcado saem dali
    {
      let spotAt = null;
      for (let r = 3; !spotAt && r < 14; r++) for (let dy = -r; dy <= r && !spotAt; dy++) for (let dx = -r; dx <= r && !spotAt; dx++) {
        const x = S.camp.x + dx, y = S.camp.y + dy;
        if (!Sim.canPlace(S, 'barraca', x, y) && O.canRoad(S, y * w.W + x) && O.canRoad(S, y * w.W + x + 1)) spotAt = { x, y };
      }
      const i0 = spotAt.y * w.W + spotAt.x, i1 = i0 + 1;
      O.setRoad(S, i0, 2); O.markRoad(S, i1, 2);
      const jobs0 = S.obras.jobs.length, n0 = w.roadCount;
      Sim.placeBlueprint(S, 'barraca', spotAt.x, spotAt.y);
      check('obra em cima do caminho: o caminho sai e o marcado também', w.road[i0] === 0 && w.roadJob[i1] === 0 && S.obras.jobs.length === jobs0 - 1 && w.roadCount === n0 - 1, w.roadCount + ' passos · ' + S.obras.jobs.length + ' marcados');
    }
  }
  {
    // trilha: onde muita gente passa a grama gasta; sem gente, some
    const S = world(42);
    const w = S.world;
    let i = -1;
    for (let r = 3; i < 0 && r < 12; r++) for (let dx = -r; dx <= r && i < 0; dx++) { const j = (S.camp.y + r) * w.W + S.camp.x + dx; if (O.canRoad(S, j)) i = j; }
    for (let k = 0; k < C.TRAIL_ON + 5; k++) O.step(S, i);
    O.daily(S);
    check('muita passada vira trilha', w.road[i] === 1 && S.obras.trails === 1);
    for (let d = 0; d < 30; d++) O.daily(S);
    check('sem ninguém passando, a trilha some', w.road[i] === 0);
    // o povo sozinho abre trilhas no uso de todo dia
    const R = world(9001);
    build(R, 'fogueira'); build(R, 'barraca');
    days(R, 40);
    check('em 40 dias o povo abre trilhas sozinho', R.obras.trails > 0 && R.world.roadCount > 0, R.obras.trails + ' trilhas · ' + R.world.roadCount + ' passos agora');
  }

  // ===================== metas =====================
  {
    const S = world(42);
    S.goalsPhase = 1; S.stats.allGoals = true;
    Sim.checkGoals(S);
    check('fase da família traz as missões das obras (fogueira e caminho)', S.goalsPhase === 2 && S.goals.some((g) => g.id === 'o_fogueira' && g.opt) && S.goals.some((g) => g.id === 'o_caminho' && g.opt));
    const f = build(S, 'fogueira'); Sim.startUpgrade(S, f); finish(S, f);
    const p0 = S.god.poder;
    Sim.checkGoals(S);
    check('melhorar a fogueira cumpre a missão e paga', S.goals.find((g) => g.id === 'o_fogueira').done && S.god.poder > p0);
    S.stats.famGoals = true; Sim.checkGoals(S);
    check('fase das descobertas traz armazém e tábuas', S.goalsPhase === 3 && S.goals.some((g) => g.id === 'o_armazem') && S.goals.some((g) => g.id === 'o_tabuas'));
    for (const g of S.goals) if (!g.opt) g.done = true;
    Sim.checkGoals(S);
    check('depois das descobertas, as metas da aldeia', S.goalsPhase === 4 && ['o_casa', 'o_oficinas', 'o_mantas', 'o_caminhos', 'o_melhorias'].every((id) => S.goals.some((g) => g.id === id)), S.goals.map((g) => g.id).join(', '));
  }

  // ===================== save =====================
  {
    const S = world(777);
    learnUpTo(S, 'ceramica');
    const b = build(S, 'barraca', 3, 'oca');
    const f = build(S, 'fogueira'); S.stock.pedra = 10; Sim.startUpgrade(S, f);
    const w = S.world;
    let n = 0;
    for (let k = 3; n < 6 && k < 40; k++) { const i = (S.camp.y - 2) * w.W + S.camp.x + k; if (O.canRoad(S, i)) { O.setRoad(S, i, 2 + (n % 2)); n++; } }
    for (let k = 3, m = 0; m < 3 && k < 40; k++) { const i = (S.camp.y + 3) * w.W + S.camp.x - k; if (O.markRoad(S, i, 2)) m++; }
    w.foot[(S.camp.y + 5) * w.W + S.camp.x] = 33;
    S.people[0].manta = { dur: 77 }; S.people[1].rede = { dur: 55 };
    S.stock.tabuas = 9; S.stock.fibra = 4;
    const js = JSON.stringify(Save.serialize(S));
    const S2 = Save.deserialize(JSON.parse(js));
    const b2 = S2.buildings.find((x) => x.id === b.id), f2 = S2.buildings.find((x) => x.id === f.id);
    const same = w.road.every((v, i) => v === S2.world.road[i]);
    check('save: níveis, casa, melhoria em andamento', b2.lv === 3 && b2.kind === 'oca' && f2.up && f2.up.lv === 2, JSON.stringify({ lv: b2.lv, kind: b2.kind, up: f2.up }));
    check('save: caminhos, marcados e pegadas', same && S2.world.roadCount === w.roadCount && S2.obras.jobs.length === 3 && S2.world.roadJob[S2.obras.jobs[0].i] === 2 && Math.round(S2.world.foot[(S.camp.y + 5) * w.W + S.camp.x]) === 33, S2.world.roadCount + ' passos · ' + S2.obras.jobs.length + ' marcados · ' + js.length + ' bytes');
    check('save: mantas, redes e os materiais novos', S2.people[0].manta.dur === 77 && S2.people[1].rede.dur === 55 && S2.stock.tabuas === 9 && S2.stock.fibra === 4);
  }
  {
    // save antigo (0.4): a barraca avançada vira barraca de nível 2; o jogo segue
    const v04 = JSON.parse(fs.readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8'));
    const d = JSON.parse(JSON.stringify(v04));
    const tb = d.buildings.find((b) => b.type === 'barraca' || b.type === 'barraca2');
    if (tb) { tb.type = 'barraca2'; tb.up = null; }
    const S = Save.deserialize(d);
    const t2 = S.buildings.find((b) => tb && b.id === tb.id);
    check('save antigo: barraca avançada vira barraca de nível 2', !tb || (t2.type === 'barraca' && t2.lv === 2 && Sim.def(t2).cap === 6), t2 && t2.type + ' ' + t2.lv);
    check('save antigo: estoque novo zerado, sem caminho', S.stock.tabuas === 0 && S.stock.mantas === 0 && S.world.roadCount === 0 && S.world.road.length === S.world.W * S.world.H);
    let err = '';
    try { days(S, 3); } catch (e) { err = e.message; }
    check('save antigo: segue rodando', !err, err);
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const jobs = [];
  for (const seed of [42, 777, 9001]) for (const mode of ['bem', 'largado']) jobs.push({ seed, mode, years: YEARS });
  const results = [];
  let next = 0, running = 0;
  const pool = Math.max(1, Math.min(3, require('os').cpus().length));
  const t0 = Date.now();
  const launch = () => {
    while (running < pool && next < jobs.length) {
      const job = jobs[next++];
      running++;
      const wk = new Worker(__filename, { workerData: job });
      wk.on('message', (r) => { results.push(r); running--; if (results.length === jobs.length) done(); else launch(); });
      wk.on('error', (e) => { results.push({ seed: job.seed, mode: job.mode, errors: [String(e.stack || e)] }); running--; if (results.length === jobs.length) done(); else launch(); });
    }
  };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || a.mode.localeCompare(b.mode));
    console.log('\n' + YEARS + ' anos com as obras (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · fase de metas ${r.phase} · era ${r.era}`);
      console.log(`  obras: ${r.obras}`);
      console.log(`  melhorias ${r.upgrades} · casas ${r.houses} · tábuas ${r.tabuas} · mantas ${r.mantas} · redes ${r.redes} · fibra ${r.fibra} · caminhos ${r.roads} (agora ${r.roadNow}, trilhas ${r.trails}, marcados sem abrir ${r.marked})${r.aldeia ? ' · metas da aldeia cumpridas' : ''}`);
      console.log(`  tempo: trabalho ${r.workPct}% · caminho ${r.roadPct}% · ofício ${r.oficioPct}% · construir ${r.buildPct}% · fome ${r.hungry}% · frio ${r.cold}% · com manta no inverno ${r.mantaWinter}%`);
      console.log(`  mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'} · estragou ${r.rotted} · lobo levou ${r.stolen}`);
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      check(tag + 'o trabalho novo não rouba o de sempre', r.roadPct < 3 && r.oficioPct < 8, 'caminho ' + r.roadPct + '% · ofício ' + r.oficioPct + '%');
      check(tag + 'trilhas se formam sozinhas', r.trails > 0, r.trails);
      if (r.mode === 'bem') {
        check(tag + 'obras melhoradas (8 ou mais)', r.upgrades >= 8 || YEARS < 20, r.upgrades);
        check(tag + 'pelo menos uma casa', r.houses >= 1 || YEARS < 20, r.houses);
        check(tag + 'tábuas e mantas circulando', (r.tabuas >= 20 && r.mantas >= 5) || YEARS < 20, r.tabuas + ' tábuas · ' + r.mantas + ' mantas');
        check(tag + 'caminhos abertos (30 ou mais) e nada marcado esquecido', (r.roads >= 30 || YEARS < 20) && r.marked <= 3, r.roads + ' abertos · ' + r.marked + ' marcados');
        check(tag + 'as metas da aldeia se cumprem', r.aldeia || YEARS < 20, r.phase);
        check(tag + 'o povo cresce (15 pessoas ou mais)', r.alive >= 15 || YEARS < 20, r.alive);
      }
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô "bem": o de sempre (barracas, conservar, Vontades por estação) e as obras da Etapa 7: melhora o que der,
// ergue o armazém, a marcenaria e a tecelagem, abre caminhos do estoque até a água e até as obras
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const w = S.world;
  const place = (t) => { const at = spot(S, t); if (!at) return false; Sim.placeBlueprint(S, t, at.x, at.y); return true; };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], deaths: [] };
  const act = {}; let steps = 0, hours = 0, hungry = 0, cold = 0, winterH = 0, winterManta = 0;
  const roadTo = (goal, lv) => {
    const campI = (S.camp.y + 1) * w.W + S.camp.x + 1;
    const p = W.findPath(w, campI, goal, 400);
    if (!p) return 0;
    let n = 0;
    for (const i of p) if (O.markRoad(S, i, lv)) n++;
    return n;
  };
  let roadsDone = {};
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (mode !== 'largado' && d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S), pend = S.buildings.some((b) => !b.built || b.up);
        if (!pend && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!S.buildings.some((b) => !b.built || b.up) && T.buildOpen(S, t) && !has(t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (mode === 'bem') {
          // Etapa 7: uma obra por vez, com folga de comida
          const busy = S.buildings.filter((b) => !b.built || b.up).length;
          if (!busy && S.ctx.foodDays > 6) {
            if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
            else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
            else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
            else {
              // melhora: fogueira, casas (quando a barraca avançada já existe), o resto
              const order = ['fogueira', 'barraca', 'armazem', 'marcenaria', 'tecelagem', 'moquem', 'jirau', 'forno'];
              for (const t of order) {
                const b = S.buildings.find((x) => x.built && !x.up && x.type === t && Sim.upgrades(S, x).some((o) => !o.why) && (t !== 'barraca' || x.lv >= 2 || have >= need + 1));
                if (b && Sim.startUpgrade(S, b)) break;
              }
            }
          }
          // caminhos: do estoque até a água e até cada obra (terra); com pedra sobrando, o primeiro vira de pedra
          if (d >= 90 && !roadsDone.agua) {
            const r = W.findNearest(w, (S.camp.y + 1) * w.W + S.camp.x + 1, (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 200);
            if (r) roadTo(r.idx, 2);
            roadsDone.agua = true;
          }
          for (const b of S.buildings) {
            if (!b.built || roadsDone['b' + b.id] || d < 90) continue;
            roadsDone['b' + b.id] = true;
            const t = W.findNearest(w, (b.y + b.h) * w.W + b.x, (i) => (O.canRoad(S, i) ? 1 : 0), 20);
            if (t) roadTo(t.idx, 2);
          }
          if (d > 600 && !roadsDone.pedra && S.stock.pedra > 40) {
            roadsDone.pedra = true;
            const r = W.findNearest(w, (S.camp.y + 1) * w.W + S.camp.x + 1, (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 200);
            if (r) roadTo(r.idx, 3);
          }
          // a meta da aldeia pede mais caminho: com o marcado todo aberto, puxa um novo, cada vez para um lado
          if (d >= 90 && !S.obras.jobs.length && S.goals.some((g) => g.id === 'o_caminhos' && !g.done)) {
            const k = roadsDone.extra = (roadsDone.extra || 0) + 1;
            const gx = Math.round(S.camp.x + 1 + Math.cos(k * 2.4) * 12), gy = Math.round(S.camp.y + 1 + Math.sin(k * 2.4) * 12);
            const t = gx > 1 && gy > 1 && gx < w.W - 1 && gy < w.H - 1 ? W.findNearest(w, gy * w.W + gx, (i) => (O.canRoad(S, i) ? 1 : 0), 20) : null;
            if (t) roadTo(t.idx, 2);
          }
        }
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        S.events.length = 0;
        for (const p of S.people) if (p.alive && !p.carriedBy) { const k = p.act ? p.act.type : '-'; act[k] = (act[k] || 0) + 1; steps++; }
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) {
          hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++;
          if (S.ck.season === 3 && F.age(S, p) >= 3) { winterH++; if (p.manta) winterManta++; }
        }
      }
    }
  } catch (e) { out.errors.push(e.stack); }
  const pct = (keys) => (keys.reduce((n, k) => n + (act[k] || 0), 0) / Math.max(1, steps) * 100).toFixed(1);
  const st = S.stats;
  Object.assign(out, {
    alive: S.people.filter((p) => p.alive).length, births: st.births, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    phase: S.goalsPhase || 1, era: S.era || '-',
    obras: S.buildings.map((b) => { const d = Sim.def(b); return (d.kind || b.type) + d.lv + (b.built ? '' : '*') + (b.up ? '→' + b.up.lv : ''); }).join(' '),
    upgrades: st.upgrades || 0, houses: Object.keys(st.houses || {}).length, tabuas: st.tabuasMade || 0, mantas: st.mantasMade || 0, redes: st.redesMade || 0, fibra: st.fibraGot || 0,
    roads: st.roadsBuilt || 0, roadNow: w.roadCount, trails: S.obras.trails, marked: S.obras.jobs.length, aldeia: !!st.aldeiaGoals,
    workPct: pct(AI.WORK), roadPct: pct(['caminho']), oficioPct: pct(['oficio']), buildPct: pct(['construir']),
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    mantaWinter: (winterManta / Math.max(1, winterH) * 100).toFixed(0), rotted: st.rotted || 0,
    stolen: (S.narr.log || []).length ? S.chron.filter((c) => /levaram/.test(c.text)).length : 0, sec: (Date.now() - t0) / 1000,
  });
  return out;
}
