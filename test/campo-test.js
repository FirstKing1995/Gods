// Gods · testes do campo (Etapa 10). Uso: node test/campo-test.js [anos | u]
// 1) unidades: a árvore do campo (roça → algodão, criação e, com a corda, cerca), a prática e a Revelação; a roça (terra
//    boa, plantar, crescer por estação, o mato e a capina, madurar, passar do ponto, a geada do inverno, a mandioca que
//    aguenta o frio, o que o povo escolhe plantar, o adubo e a fartura, colher e levar ao estoque); a roça jogada pela IA;
//    bicho do mato comendo roça aberta; cercas (o que pode, a volta fechada, a brecha, árvore como parede, porteira, o
//    caminho de bicho e de gente) fincadas pela IA; a criação (curral, cria, ovos, leite, lã, ração no inverno, abate);
//    lobo e onça no curral; o mascate (oferta, pagamento, troca, recusa); comer o que vem do campo; o estrago no estoque;
//    a praga e a Chuva; missões; save novo e antigo; jogo fechado
// 2) 20 anos em três mundos, jogando bem, bem com a Revelação e largado: a roça dá as cinco culturas, a criação cresce,
//    as cercas fecham as roças, o mascate passa, e ninguém morre de fome, sede ou frio
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Obras: O, Fauna: FA, Campo: K, Narr: N } = G;
const Y = 60 * 1440, D = 1440;

// ---------- ajudantes ----------
function newWorld(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  return Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
}
function world(seed) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true;
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
function learnUpTo(S, id) {
  for (const k of T.ORDER) { T.discover(S, k); if (k === id) break; }
  S.events.length = 0;
}
function spot(S, t, from) {
  for (let r = from || 2; r < 18; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
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
  S.events.length = 0;
  Sim.refresh(S);
  return b;
}
function add(S, sex, name, age) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = age;
  S.people.push(q);
  F.init(S); God.init(S); T.init(S); L.init(S); K.init(S);
  return q;
}
// um mundo já no campo: a trilha toda, o que pedir do campo, fogueira acesa, sem bicho do mato por perto
function campo(seed, ids, extra) {
  const S = world(seed);
  learnUpTo(S, 'ceramica');
  for (const id of ids || []) K.invent(S, id);
  S.seen.fill(1);
  S.fauna.herds = []; S.fauna.ents = [];
  build(S, 'fogueira');
  for (let k = 0; k < (extra || 0); k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 20 + k);
  Object.assign(S.stock, { peixe: 200, agua: 40, madeira: 60, frutas: 20 });
  if (S.life) { S.life.party = null; S.life.lastParty = S.t; }
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
// muda o dia (e a estação) sem simular: sempre para a frente
function setDay(S, season, dos, hour) {
  const yr = Math.floor(S.t / (C.YEAR_DAYS * D)) + 1;
  S.t = ((yr * C.YEAR_DAYS + season * C.SEASON_DAYS + dos - 1) * D) + (hour === undefined ? 8 : hour) * 60;
  S.ck = Sim.clock(S.t); Sim.refresh(S);
}
function setHour(S, h) { let t = Math.floor(S.t / D) * D + h * 60; if (t <= S.t) t += D; S.t = t; S.ck = Sim.clock(S.t); }
// só o campo, hora a hora (sem a IA): cresce, estraga, dá cria
function hours(S, n) {
  for (let i = 0; i < n; i++) {
    const d0 = Math.floor(S.t / D);
    S.t += 60; S.ck = Sim.clock(S.t);
    if (Math.floor(S.t / D) !== d0) K.daily(S);
    K.hourly(S);
  }
}
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
// cerca em volta de um retângulo (x0..x1, y0..y1): marcada; done: já fincada
function ring(S, x0, y0, x1, y1, done) {
  const w = S.world;
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
    const i = y * w.W + x;
    if (!K.markFence(S, i, true)) continue;
    n++;
    if (done) K.finishFence(S, K.fenceJobAt(S, i));
  }
  return n;
}
// um quadrado aberto (sem árvore, pedra, água, obra nem estoque) a partir de from passos do acampamento
function openSpot(S, size, from) {
  const w = S.world;
  for (let r = from || 5; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x0 = S.camp.x + dx, y0 = S.camp.y + dy;
    let fine = x0 > 2 && y0 > 2 && x0 + size < w.W - 2 && y0 + size < w.H - 2;
    for (let y = y0; fine && y < y0 + size; y++) for (let x = x0; fine && x < x0 + size; x++) {
      const i = y * w.W + x, o = W.objAt(w, i), t = w.tile[i];
      if (w.block[i] || G.IS_WATER[t] || t === G.T.SAND || t === G.T.MOUNTAIN || w.bgrid[i] >= 0 || Sim.isCamp(S, i) || (o && o.k === 'grave') || (w.fence && (w.fence[i] || w.fenceJob[i]))) fine = false;
    }
    if (fine) return { x: x0, y: y0 };
  }
  return null;
}
function force(S, k, opts) { S.narr.plan = { k, warnAt: S.t, at: S.t, warned: true, opts: opts || {} }; N.hourly(S); }
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== a árvore do campo =====================
  {
    const S = world(42);
    check('quatro descobertas do campo, na janela das Descobertas', K.ORDER.length === 4 && K.ORDER.every((id) => T.DISC[id] && T.DISC[id].campo && T.DISC[id].story && C.CAMPO_NEED[id] > 0));
    check('no começo nada do campo está aberto', K.openList(S).length === 0);
    learnUpTo(S, 'ceramica');
    check('a cerâmica abre a roça', same(K.openList(S), ['roca']), K.openList(S).join(', '));
    K.invent(S, 'roca');
    check('a roça abre o algodão e a criação; a cerca ainda pede a corda', same(K.openList(S), ['algodao', 'criacao']) && K.missing(S, 'cerca').join() === 'corda', K.openList(S).join(', '));
    I.invent(S, 'corda');
    check('com a corda, a cerca abre', K.isOpen(S, 'cerca'));
    check('a trilha e as invenções não contam o campo', T.count(S) === 6 && I.count(S) === 1 && K.count(S) === 1);
  }
  // ===================== a prática =====================
  {
    const S = world(42);
    learnUpTo(S, 'ceramica');
    const [a, b] = S.people;
    T.onWork(S, a, { type: 'frutas', stage: 'work' }, 60);
    T.onWork(S, b, { type: 'conservar', stage: 'load' }, 30);
    check('colher frutas e armar o jirau ensinam a roça', Math.abs(S.tech.prat.roca - 2) < 1e-9, S.tech.prat.roca);
    check('cada descoberta do campo lembra quem praticou', S.tech.whoCampo.roca[a.id] === 1 && S.tech.whoCampo.roca[b.id] === 1);
    T.onWork(S, a, { type: 'roca', stage: 'plant' }, 60);
    check('fechada, não ganha prática (plantar sem a roça não ensina o algodão)', !S.tech.prat.algodao);
    K.invent(S, 'roca');
    T.onWork(S, a, { type: 'roca', stage: 'plant' }, 60);
    T.onWork(S, a, { type: 'oficio', stage: 'work', make: 'mantas' }, 60);
    check('plantar e tecer ensinam o algodão', Math.abs(S.tech.prat.algodao - 2) < 1e-9, S.tech.prat.algodao);
  }
  // ===================== descobrir =====================
  {
    const S = world(42);
    learnUpTo(S, 'ceramica');
    S.life.party = null; S.life.lastParty = -1e9;
    S.tech.prat.roca = K.need('roca') - 1;
    for (let i = 0; i < 40; i++) K.daily(S);
    check('antes de completar a prática, nada', !K.known(S, 'roca'));
    S.tech.prat.roca = K.need('roca');
    S.tech.whoCampo.roca = { [S.people[1].id]: 9, [S.people[0].id]: 2 };
    S.events.length = 0;
    let n = 0;
    for (; n < 60 && !K.known(S, 'roca'); n++) K.daily(S);
    check('com a prática completa, a roça vem (quem mais praticou)', K.known(S, 'roca') && S.tech.known.roca.by === S.people[1].name, n + ' dias');
    check('conta na Crônica e dá festa', S.chron.some((c) => c.disc === 'roca') && S.life.party && /roça/.test(L.partyText(S, S.life.party)), S.life.party && L.partyText(S, S.life.party));
    check('a primeira do campo avisa onde ver', S.events.some((e) => e.k === 'toast' && /Primeira descoberta do campo/.test(e.text)));
  }
  // ===================== Revelação =====================
  {
    const S = world(777);
    learnUpTo(S, 'ceramica');
    for (const id of I.ORDER) S.tech.known[id] = { t: 0, by: '', how: 'pratica' };
    S.tech.prat.roca = K.need('roca') * 0.2;
    check('com menos de 30% da prática, a roça ainda não pode ser revelada', !T.revealTarget(S) && /roça/.test(T.canReveal(S)), T.canReveal(S));
    S.tech.prat.roca = K.need('roca') * 0.35;
    check('passou de 30%: a Revelação entrega a roça', T.revealTarget(S) === 'roca');
    T.reveal(S, S.people[0]);
    check('revelada: conhecida, e a Crônica diz que foi sonho', K.known(S, 'roca') && S.tech.known.roca.how === 'revelacao' && S.chron.some((c) => /Num sonho/.test(c.text) && c.disc === 'roca'));
    S.tech.prat.algodao = K.need('algodao') * 0.6; S.tech.prat.criacao = K.need('criacao') * 0.4;
    check('sem escolha, a mais adiantada', T.revealTarget(S) === 'algodao');
    S.tech.aim = 'criacao';
    check('a escolhida na janela passa na frente', T.revealTarget(S) === 'criacao');
  }

  // ===================== obras e terra boa =====================
  {
    const S = world(42);
    learnUpTo(S, 'ceramica');
    check('a roça pede a descoberta', !T.buildOpen(S, 'roca') && /roça/.test(Sim.needWhy(S, C.BUILD.roca)));
    K.invent(S, 'roca');
    check('descoberta a roça, dá para marcar (o curral ainda não)', T.buildOpen(S, 'roca') && !T.buildOpen(S, 'curral'));
    K.invent(S, 'criacao');
    check('com a criação, o curral', T.buildOpen(S, 'curral'));
    S.seen.fill(1);
    const w = S.world;
    let sand = null;
    for (let y = 4; y < w.H - 6 && !sand; y++) for (let x = 4; x < w.W - 6 && !sand; x++) {
      let hasSand = false, okAll = true;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        const i = (y + dy) * w.W + x + dx, o = W.objAt(w, i);
        if (G.IS_WATER[w.tile[i]] || w.bgrid[i] >= 0 || Sim.isCamp(S, i) || (o && o.k !== 'stump' && o.k !== 'bush')) okAll = false;
        if (w.tile[i] === G.T.SAND) hasSand = true;
      }
      if (okAll && hasSand) sand = { x, y };
    }
    check('na areia não dá roça', !!sand && /terra boa/.test(Sim.canPlace(S, 'roca', sand.x, sand.y)), sand ? Sim.canPlace(S, 'roca', sand.x, sand.y) : 'sem areia');
    check('mas dá curral na areia', !!sand && !/terra boa/.test(Sim.canPlace(S, 'curral', sand.x, sand.y)));
    const at = spot(S, 'roca', 4), b = Sim.placeBlueprint(S, 'roca', at.x, at.y);
    check('a roça só pede trabalho (nada de material)', b && Object.keys(C.BUILD.roca.cost).length === 0 && Sim.jobOf(b).work === C.BUILD.roca.work);
    Sim.complete(S, b);
    check('roça pronta avisa a Vontade e o que plantar', S.events.some((e) => e.k === 'toast' && /Suba Roça nas Vontades/.test(e.text)) && b.farm && b.farm.st === 'vazia');
  }

  // ===================== a roça, passo a passo (sem a IA) =====================
  {
    const S = campo(42, ['roca']);
    const b = build(S, 'roca', 4), f = b.farm;
    setDay(S, 0, 1);
    check('vazia: a tarefa é plantar', K.rocaPlan(S, null).kind === 'plant');
    check('plantou feijão: cresce', K.plant(S, b, 'feijao', S.people[0]) && f.st === 'crescendo' && f.k === 'feijao');
    check('a Crônica conta a primeira roça plantada', S.chron.some((c) => /plantou a primeira roça: feijão/.test(c.text)));
    let mato = -1, ripe = -1;
    for (let h = 1; h <= 20 * 24 && ripe < 0; h++) {
      hours(S, 1);
      if (mato < 0 && f.mato) mato = f.grow;
      if (f.st === 'madura') ripe = h / 24;
    }
    check('na primavera o feijão madura em ' + C.ROCA.feijao.days + ' dias', Math.abs(ripe - C.ROCA.feijao.days) <= 1, ripe.toFixed(2) + ' dias');
    check('o mato aparece no meio do caminho', mato >= C.ROCA_WEED_AT && mato < C.ROCA_WEED_AT + 0.02, mato.toFixed(3));
    check('sem capina por ' + C.ROCA_WEED_DAYS + ' dias, perde ' + Math.round(C.ROCA_WEED_LOSS * 100) + '%', Math.abs(f.lost - C.ROCA_WEED_LOSS) < 1e-9, f.lost);
    const n = K.yieldOf(S, b);
    check('madura: a colheita esperada já desconta o mato', n === Math.round(C.ROCA.feijao.yield * (1 - C.ROCA_WEED_LOSS)), n);
    check('madura: a tarefa é colher', K.rocaPlan(S, null).kind === 'harvest');
    const got = K.harvest(S, b, S.people[1]);
    check('colheu: a colheita fica no chão da roça, e a roça fica vazia', got === n && f.pile === n && f.pileK === 'feijao' && f.st === 'vazia' && f.last.n === n);
    check('a primeira colheita vai para a Crônica e dá festa', S.chron.some((c) => /colheu a primeira roça/.test(c.text)) && S.life.party && S.life.party.why === 'colheita');
    check('com colheita no chão, a tarefa é levar', K.rocaPlan(S, null).kind === 'haul');
    const t1 = K.takePile(S, b, 15), t2 = K.takePile(S, b, 99);
    check('leva em viagens (o que cabe no cesto)', t1.n === 15 && t2.n === n - 15 && f.pile === 0 && K.takePile(S, b, 5) === null);
    // capina a tempo: não perde nada
    const S2 = campo(777, ['roca']), b2 = build(S2, 'roca', 4);
    setDay(S2, 0, 1);
    K.plant(S2, b2, 'milho');
    for (let h = 0; h < 30 * 24 && b2.farm.st === 'crescendo'; h++) { hours(S2, 1); if (b2.farm.mato && !b2.farm.weeded && S2.t - b2.farm.mato > D) K.weed(S2, b2); }
    check('capinada a tempo: rende tudo', b2.farm.st === 'madura' && b2.farm.lost === 0 && K.yieldOf(S2, b2) === C.ROCA.milho.yield, K.yieldOf(S2, b2));
    // passa do ponto
    for (let d = 0; d < C.ROCA.milho.ripe + 12 && b2.farm.st === 'madura'; d++) hours(S2, 24);
    check('esquecida madura, a roça passa do ponto e se perde', b2.farm.st === 'vazia' && !b2.farm.pile);
  }
  // ===================== estações, geada e mandioca =====================
  {
    const S = campo(42, ['roca']);
    const b = build(S, 'roca', 4), f = b.farm;
    setDay(S, 3, 2);
    check('no inverno só a mandioca vai para a terra', /só a mandioca/.test(K.plantWhy(S, 'feijao')) && K.plantWhy(S, 'mandioca') === '');
    setDay(S, 2, 12);
    check('no fim do outono, milho não dá tempo (e o feijão ainda dá?)', /não dá tempo/.test(K.plantWhy(S, 'milho')), K.plantWhy(S, 'milho') + ' · feijão: ' + (K.plantWhy(S, 'feijao') || 'dá'));
    setDay(S, 2, 4);
    check('no outono, abóbora (20 dias) já não dá tempo', /não dá tempo/.test(K.plantWhy(S, 'abobora')) && !K.plant(S, b, 'abobora'));
    Object.assign(f, { k: 'abobora', st: 'crescendo', grow: 0.5 });   // plantada antes, e atrasou
    setDay(S, 2, 15, 20);
    hours(S, 12);
    check('a geada queima a roça que não deu tempo', f.st === 'vazia' && !f.k && S.chron.some((c) => /A geada queimou a roça de abóbora/.test(c.text)));
    K.plant(S, b, 'mandioca');
    const g0 = f.grow;
    hours(S, 24 * 4);
    const perDay = (f.grow - g0) / 4;
    check('a mandioca cresce no inverno, na metade do ritmo', Math.abs(perDay - C.ROCA.mandioca.winter / C.ROCA.mandioca.days) < 1e-6, perDay.toFixed(4));
    check('o dia em que madura conta o inverno', K.daysLeft(S, 'mandioca', f.grow) > (1 - f.grow) * C.ROCA.mandioca.days, K.daysLeft(S, 'mandioca', f.grow));
  }
  // ===================== o que plantar =====================
  {
    const S = campo(42, ['roca', 'algodao']);
    const r1 = build(S, 'roca', 4);
    setDay(S, 0, 2);
    check('com uma roça só, o povo não planta algodão (comida primeiro)', K.autoCrop(S, r1) !== 'algodao', K.autoCrop(S, r1));
    const r2 = build(S, 'roca', 8);
    K.plant(S, r1, 'milho');
    check('com duas roças e pouca fibra, a outra vai de algodão', K.autoCrop(S, r2) === 'algodao', K.autoCrop(S, r2));
    S.stock.fibra = 60;
    check('com fibra de sobra, não', K.autoCrop(S, r2) !== 'algodao', K.autoCrop(S, r2));
    // com a tecelagem, a fibra que falta conta as mantas e as redes de quem ainda não tem
    build(S, 'tecelagem', 10);
    S.stock.fibra = 30; S.stock.defumado = 300; Sim.refresh(S);
    check('com a tecelagem e gente sem manta nem rede, 30 de fibra é pouco: com comida folgada, vai algodão', G.Obras.needMantas(S) > 0 && K.autoCrop(S, r2) === 'algodao', G.Obras.needMantas(S) + ' mantas, ' + G.Obras.needRedes(S) + ' redes · ' + K.autoCrop(S, r2));
    S.stock.fibra = 60; S.stock.defumado = 0; Sim.refresh(S);
    setDay(S, 2, 3);
    check('no outono, a mandioca (garante o inverno)', K.autoCrop(S, r2) === 'mandioca', K.autoCrop(S, r2));
    r2.farm.pick = 'milho';
    setDay(S, 3, 3);
    check('a escolha do jogador vale, mas não no inverno (espera)', K.cropOf(S, r2) === null && K.rocaPlan(S, null) === null);
  }
  // ===================== adubo, fartura, Chuva e praga =====================
  {
    const S = campo(42, ['roca', 'criacao']);
    const b = build(S, 'roca', 4), f = b.farm;
    setDay(S, 0, 1);
    K.plant(S, b, 'milho');
    check('sem adubo: a colheita normal', K.yieldOf(S, b) === C.ROCA.milho.yield);
    check('a roça adubada pede a criação (esterco do curral)', Sim.upgrades(S, b).length === 1 && !Sim.upgrades(S, b)[0].why);
    b.lv = 2;
    check('adubada: rende 30% mais', K.yieldOf(S, b) === Math.round(C.ROCA.milho.yield * 1.3), K.yieldOf(S, b));
    K.onFartura(S);
    check('tempo de fartura: a que está crescendo rende mais 25%', K.yieldOf(S, b) === Math.round(C.ROCA.milho.yield * 1.3 * C.ROCA_FARTURA), K.yieldOf(S, b));
    const g0 = f.grow;
    S.god.poder = 100;
    const r = God.cast(S, 'chuva', b.x + 1, b.y + 1);
    check('a Chuva de Deus rega: a roça cresce ' + C.ROCA_CHUVA_D + ' dias de uma vez', r.ok && Math.abs(f.grow - g0 - C.ROCA_CHUVA_D / C.ROCA.milho.days) < 1e-9 && /A roça cresceu/.test(r.msg), r.msg);
    const txt = K.pest(S);
    check('a praga leva metade da colheita', /gafanhotos/.test(txt) && Math.abs(f.lost - C.ROCA_PRAGA) < 1e-9 && S.events.some((e) => e.k === 'praga'), txt);
    // o Narrador só manda a praga com roça crescendo (verão e outono)
    const S2 = campo(777, ['roca']), b2 = build(S2, 'roca', 4);
    setDay(S2, 1, 3);
    S2.narr.log = []; S2.narr.lastBad = null;
    K.plant(S2, b2, 'milho');
    force(S2, 'praga');
    check('a praga do Narrador: gafanhotos na roça, e a Crônica conta', b2.farm.lost >= C.ROCA_PRAGA - 1e-9 && S2.chron.some((c) => /gafanhotos/.test(c.text)) && S2.narr.log.some((e) => e.k === 'praga'));
    const S3 = campo(9001, ['roca']);
    setDay(S3, 1, 3);
    force(S3, 'praga');
    check('sem roça crescendo, a praga passa longe', !S3.chron.some((c) => /gafanhotos/.test(c.text)) && !S3.narr.log.some((e) => e.k === 'praga'));
  }

  // ===================== a roça jogada pela IA =====================
  {
    const S = campo(777, ['roca'], 3);
    const b = build(S, 'roca', 4), f = b.farm;
    setDay(S, 0, 1, 6);
    f.pick = 'feijao';
    S.vontades.roca = 3;
    let planted = -1, weeded = false, pileMax = 0;
    days(S, 18, (s) => { if (planted < 0 && f.st === 'crescendo') planted = s.t; if (f.weeded) weeded = true; pileMax = Math.max(pileMax, f.pile); });
    check('com a Vontade Roça, o povo planta', planted > 0 && S.stats.planted >= 1);
    check('capina o mato', weeded || (S.stats.harvestBy.feijao >= 1 && f.lost < C.ROCA_WEED_LOSS), 'perda ' + f.lost);
    check('colhe e leva tudo ao estoque', S.stats.harvestBy.feijao >= 1 && f.pile === 0 && S.stock.feijao > 0, 'estoque ' + S.stock.feijao + ' · colhido ' + S.stats.harvested);
    check('e planta de novo', f.st === 'crescendo' || S.stats.planted >= 2, f.st);
    check('quem trabalha na roça ganha a habilidade Plantio', S.people.some((p) => (p.skills.plantio || 0) > 1));
    // Vontade proibida: ninguém vai
    const S2 = campo(42, ['roca'], 3), b2 = build(S2, 'roca', 4);
    setDay(S2, 0, 1, 6);
    S2.vontades.roca = 0;
    days(S2, 3);
    check('com Roça proibida, ninguém planta', b2.farm.st === 'vazia' && !S2.stats.planted);
  }

  // ===================== bicho do mato na roça =====================
  {
    const S = campo(42, ['roca']);
    const b = build(S, 'roca', 4), f = b.farm, w = S.world;
    setDay(S, 0, 1);
    K.plant(S, b, 'milho'); f.grow = 0.5;
    const h = { id: 900, sp: 'capivara', x: b.x + 6, y: b.y + 1, lastBirth: 0, empty: 0 };
    S.fauna.herds.push(h);
    for (let k = 0; k < 3; k++) S.fauna.ents.push({ id: 9000 + k, sp: 'capivara', h: 900, x: h.x + 0.5, y: h.y + k + 0.5, px: h.x + 0.5, py: h.y + k + 0.5, dir: 2, walk: 0, path: null, pathI: 0, state: 'pasto', wait: 999, res: 0, big: false, hp: 1 });
    const was = C.ROCA_RAID_DAY;
    C.ROCA_RAID_DAY = 1;
    K.daily(S);
    check('bando de capivaras perto de roça aberta: come parte', Math.abs(f.lost - C.ROCA_RAID_LOSS) < 1e-9 && S.stats.raids === 1 && S.chron.some((c) => /Capivaras entraram na roça de milho/.test(c.text)), f.lost);
    check('e uma vai até lá (dá para ver)', S.fauna.ents.some((e) => e.raid === b.id && e.path));
    S.t += D; S.ck = Sim.clock(S.t); K.daily(S);
    check('depois do estrago, uns dias de sossego', S.stats.raids === 1);
    for (let d = 0; d < 20; d++) { S.t += D; S.ck = Sim.clock(S.t); K.daily(S); }
    check('o estrago tem teto (' + Math.round(C.ROCA_RAID_MAX * 100) + '%)', f.lost <= C.ROCA_RAID_MAX + 1e-9 && S.stats.raids > 1, S.stats.raids + ' estragos · ' + f.lost.toFixed(2));
    // cercada: o bando fica do lado de fora
    const S2 = campo(42, ['roca', 'cerca']), b2 = build(S2, 'roca', 4);
    setDay(S2, 0, 1);
    K.plant(S2, b2, 'milho'); b2.farm.grow = 0.5;
    ring(S2, b2.x - 1, b2.y - 1, b2.x + 3, b2.y + 3, true);
    S2.fauna.herds.push(Object.assign({}, h, { x: b2.x + 6, y: b2.y + 1 }));
    for (let k = 0; k < 3; k++) S2.fauna.ents.push({ id: 9100 + k, sp: 'capivara', h: 900, x: b2.x + 6.5, y: b2.y + k + 0.5, px: 0, py: 0, dir: 2, walk: 0, path: null, pathI: 0, state: 'pasto', wait: 999, res: 0, big: false, hp: 1 });
    for (let d = 0; d < 20; d++) { S2.t += D; S2.ck = Sim.clock(S2.t); K.daily(S2); }
    C.ROCA_RAID_DAY = was;
    check('roça cercada: bicho do mato não entra', K.enclosed(S2, b2) && b2.farm.lost === 0 && !S2.stats.raids, b2.farm.lost);
    void w;
  }

  // ===================== cercas =====================
  {
    const S = campo(42, ['roca', 'cerca']), w = S.world;
    const o7 = openSpot(S, 7), b = Sim.placeBlueprint(S, 'roca', o7.x + 2, o7.y + 2);
    Sim.complete(S, b);
    let water = -1;
    for (let i = 0; i < w.W * w.H && water < 0; i++) if (G.IS_WATER[w.tile[i]] && i % w.W > 2 && i % w.W < w.W - 3 && i / w.W > 3 && i / w.W < w.H - 3) water = i;
    check('cerca não vai na água, em cima de obra nem no estoque', /água/.test(K.fenceWhy(S, water)) && /obra/.test(K.fenceWhy(S, b.y * w.W + b.x)) && /estoque/.test(K.fenceWhy(S, S.camp.y * w.W + S.camp.x)));
    const n = ring(S, b.x - 1, b.y - 1, b.x + 3, b.y + 3, false);
    check('marcada, a cerca pede madeira (1 por passo); fecharia quando ficar pronta', n === 16 && K.fenceShort(S) === n && !K.enclosed(S, b) && !K.enclPlanned(S, b).open, n + ' passos');
    for (const j of S.campo.fjobs.slice()) K.finishFence(S, j);
    check('fincada a volta toda, a roça fica cercada', K.enclosed(S, b) && S.stats.fencesBuilt === n && S.chron.some((c) => /primeira cerca/.test(c.text)));
    const gap = (b.y - 1) * w.W + b.x + 1;   // no meio da cerca de cima
    K.markFence(S, gap, false);
    check('uma brecha abre de novo', !K.enclosed(S, b) && K.encl(S, b).open);
    W.addObj(w, 'tree', gap % w.W, (gap / w.W) | 0, { sp: 'broad', v: 0 }); W.refreshBlock(w, gap);
    check('uma árvore na brecha serve de parede', K.enclosed(S, b));
    check('e fica guardada: a árvore que faz de parede o povo não corta', K.guarded(S).has(gap) && K.guarded(S).size === 1, K.guarded(S).size);
    const o = W.objAt(w, gap); o.k = 'stump'; W.refreshBlock(w, gap);
    check('cortada a árvore, abre (o toco não segura bicho)', !K.enclosed(S, b));
    K.markFence(S, gap, true); K.finishFence(S, K.fenceJobAt(S, gap));
    check('a cerca fincada em cima do toco tira o toco', !W.objAt(w, gap) && K.enclosed(S, b));
    const inside = b.y * w.W + b.x + 1, outside = (b.y - 2) * w.W + b.x + 1;
    check('bicho do mato e de criação não atravessam a cerca', W.findPath(w, outside, inside, 600, 1) === null && W.findPath(w, outside, inside, 600, 2) === null);
    check('gente pula a cerca', !!W.findPath(w, outside, inside, 600));
    const r0 = W.findNearest(w, outside, (i) => (i === inside ? 1 : 0), 600, true);
    w.road[gap] = 2;
    const r1 = W.findNearest(w, outside, (i) => (i === inside ? 1 : 0), 600, true);
    check('cerca em cima de caminho vira porteira: o povo passa sem pular (e bicho continua do lado de fora)', K.gate(w, gap) && r1.cost < r0.cost - 1 && W.findPath(w, outside, inside, 600, 1) === null, r0.cost.toFixed(1) + ' → ' + r1.cost.toFixed(1));
    w.road[gap] = 0;
    // a casa na linha da cerca serve de parede
    K.markFence(S, (b.y + 3) * w.W + b.x + 1, false);
    check('sem um passo embaixo, abre', !K.enclosed(S, b));
    const cx = b.x + 1, cy = b.y + 3;
    w.bgrid[cy * w.W + cx] = 999; K.wallMark(S, { type: 'fogueira', x: cx, y: cy, w: 1, h: 1 }, true);
    check('uma obra (a fogueira) no lugar da cerca fecha a volta', K.enclosed(S, b));
    K.wallMark(S, { type: 'fogueira', x: cx, y: cy, w: 1, h: 1 }, false); w.bgrid[cy * w.W + cx] = -1;
    // quina: duas cercas na diagonal seguram bicho
    const c = openSpot(S, 3, 12);
    const a1 = c.y * w.W + c.x + 1, a2 = (c.y + 1) * w.W + c.x;
    for (const i of [a1, a2]) if (K.markFence(S, i, true)) K.finishFence(S, K.fenceJobAt(S, i));
    const from = c.y * w.W + c.x, to = (c.y + 1) * w.W + c.x + 1;
    const pth = W.findPath(w, from, to, 50, 1), pp = W.findPath(w, from, to, 50);
    check('bicho não passa pela quina entre duas cercas na diagonal (dá a volta)', w.fence[a1] && w.fence[a2] && pth && pth.length > 1 && pp && pp.length === 1, (pth ? pth.length : '-') + ' passos · gente ' + (pp ? pp.length : '-'));
    // a obra erguida em cima da cerca leva a cerca embora
    const S3 = campo(9001, ['roca', 'cerca']), w3 = S3.world, at = spot(S3, 'barraca', 5);
    const fi = at.y * w3.W + at.x;
    K.markFence(S3, fi, true); K.finishFence(S3, K.fenceJobAt(S3, fi));
    Sim.placeBlueprint(S3, 'barraca', at.x, at.y);
    check('obra marcada em cima da cerca: a cerca sai', !w3.fence[fi] && S3.campo.fences === 0);
  }
  // ===================== a IA finca as cercas =====================
  {
    const S = campo(777, ['roca', 'cerca'], 3);
    const o7 = openSpot(S, 7), b = Sim.placeBlueprint(S, 'roca', o7.x + 2, o7.y + 2);
    Sim.complete(S, b);
    setDay(S, 0, 1, 6);
    S.stock.madeira = 40;
    S.vontades.construir = 3; S.vontades.roca = 0; S.vontades.madeira = 0; S.vontades.fogo = 0;
    const n = ring(S, b.x - 1, b.y - 1, b.x + 3, b.y + 3, false);
    days(S, 4);
    const built = S.stats.fencesBuilt;
    check('com Construir nas Vontades, o povo finca a cerca marcada', built === n && !S.campo.fjobs.length, built + ' de ' + n);
    check('gastou uma madeira por passo (e um pouco no fogo das histórias)', S.stock.madeira <= 40 - n && S.stock.madeira >= 40 - n - 8, S.stock.madeira);
    check('e a roça ficou cercada', K.enclosed(S, b));
    check('falta de madeira para a cerca puxa o corte de madeira', (() => { const S2 = campo(42, ['roca', 'cerca'], 1); S2.stock.madeira = 0; ring(S2, S2.camp.x + 5, S2.camp.y + 5, S2.camp.x + 9, S2.camp.y + 9, false); Sim.refresh(S2); return S2.ctx.matShort.madeira > 0; })());
  }

  // a árvore que fecha a cerca não vira lenha: o povo vai buscar mais longe
  {
    const S = campo(777, ['roca', 'cerca'], 3), w = S.world;
    const o7 = openSpot(S, 7), b = Sim.placeBlueprint(S, 'roca', o7.x + 2, o7.y + 2);
    Sim.complete(S, b);
    ring(S, b.x - 1, b.y - 1, b.x + 3, b.y + 3, true);
    const gap = (b.y - 1) * w.W + b.x + 1;
    K.markFence(S, gap, false);
    for (const o of w.objs) if (o.k === 'tree' && Math.hypot(o.x - S.camp.x, o.y - S.camp.y) < 24) { o.k = 'stump'; W.refreshBlock(w, o.y * w.W + o.x); }
    W.addObj(w, 'tree', gap % w.W, (gap / w.W) | 0, { sp: 'broad', v: 0 }); W.refreshBlock(w, gap);
    setDay(S, 0, 1, 6);
    Object.assign(S.vontades, { madeira: 3, construir: 0, roca: 0, fogo: 0, frutas: 1, pesca: 1 });
    S.stock.madeira = 0;
    let chopped = 0;
    days(S, 1, (St) => { for (const p of St.people) if (p.alive && p.act && p.act.type === 'madeira' && p.act.stage === 'work') chopped++; });
    const o = W.objAt(w, gap);
    check('a árvore que fecha a cerca não vira lenha (o povo corta mais longe)', o && o.k === 'tree' && K.enclosed(S, b) && chopped > 0, (o ? o.k : 'sumiu') + ' · ' + chopped + ' passos de corte');
  }

  // ===================== criação =====================
  {
    const S = campo(42, ['roca', 'criacao']);
    const pen = build(S, 'curral', 5), pe = pen.pen;
    setDay(S, 0, 1);
    K.receive(S, { sp: 'galinha', m: 1, f: 3 }, pen.x + 1, pen.y + 1);
    check('chegam um galo e três galinhas: a criação começou', K.herd(S) === 4 && S.campo.bichos.every((a) => a.pen === pen.id) && S.chron.some((c) => /Chegaram um galo e três galinhas ao curral: a criação começou/.test(c.text)));
    check('o curral tem 8 lugares; galinha ocupa meio', K.cap(S, pen) === 8 && K.load(S, pen) === 2 && K.room(S, pen) === 6);
    hours(S, 24 * 3);
    check('as galinhas põem ovos (' + C.CRIA.galinha.ovos + ' por dia cada uma)', Math.abs(pe.ovos - 3 * 3 * C.CRIA.galinha.ovos) < 1e-9, pe.ovos);
    const born0 = K.herd(S);
    hours(S, 24 * (C.CRIA.galinha.birth - 3));
    check('com galo e galinha, nascem crias (' + C.CRIA.galinha.birth + ' dias)', K.herd(S) === born0 + C.CRIA.galinha.litter && S.stats.criaBorn === C.CRIA.galinha.litter, K.herd(S));
    const before = pe.ovos, got = K.collect(S, pen, 10);
    check('recolher: ovos inteiros, até o que cabe', got && got.k === 'cria' && got.ovos === Math.min(10, Math.floor(before)) && Math.abs(pe.ovos - (before - got.ovos)) < 1e-9, before + ' → ' + JSON.stringify(got));
    K.receive(S, { sp: 'gado', m: 1, f: 1 }, pen.x + 1, pen.y + 1);
    hours(S, 24);
    check('a vaca dá leite todo dia (' + C.CRIA.gado.leite + ')', pe.leite === C.CRIA.gado.leite);
    check('lugar acabando: boi e vaca ocupam dois cada', K.load(S, pen) === 3 + 4, K.load(S, pen));
    // curral cheio: abate (sobra macho primeiro)
    K.receive(S, { sp: 'galinha', m: 2, f: 0 }, pen.x + 1, pen.y + 1);
    const pick = K.slaughterPick(S, pen);
    check('no abate vai o macho que sobra', pick && pick.sp === 'galinha' && pick.sex === 'M', pick && pick.sp + pick.sex);
    const meat = K.slaughter(S, pen, S.people[0]);
    check('abate: carne (e couro, se tiver) e a Crônica', meat && meat.k === 'caca' && meat.carne === C.CRIA.galinha.carne && S.chron.some((c) => /abateu o primeiro galo/.test(c.text) || /abateu a primeira/.test(c.text)), meat && JSON.stringify(meat));
    // lã na tosquia da primavera
    const Sw = campo(777, ['roca', 'criacao']), pw = build(Sw, 'curral', 5);
    K.receive(Sw, { sp: 'ovelha', m: 1, f: 1 }, pw.x + 1, pw.y + 1);
    setDay(Sw, 3, 15, 20); hours(Sw, 12);
    check('a lã vem na tosquia do começo da primavera', pw.pen.la === 2 * C.CRIA.ovelha.la, pw.pen.la);
    // inverno sem ração: fome, e depois morte
    setDay(S, 3, 1, 0);
    pe.feed = 0; pe.hungry = 0;
    const h0 = K.herd(S);
    hours(S, 24 * (C.CRIA_HUNGRY_DAYS - 1));
    check('no inverno sem ração, os bichos passam fome', pe.hungry >= C.CRIA_HUNGRY_DAYS - 1 && K.herd(S) === h0);
    hours(S, 24 * 2);
    check('e depois de uns dias, um morre', K.herd(S) === h0 - 1 && S.stats.criaLost >= 1 && S.events.some((e) => e.k === 'toast' && /morreu de fome no curral/.test(e.text)));
    K.feedPen(S, pen, 50); pe.hungry = 0;
    const h1 = K.herd(S);
    hours(S, 24 * 3);
    check('com ração no cocho, ninguém passa fome', pe.hungry === 0 && K.herd(S) === h1 && pe.feed < 50);
    check('no frio, a tarefa é levar ração', (() => { pe.feed = 0; S.stock.milho = 30; const p = K.criaPlan(S, S.people[0]); return p && p.kind === 'feed'; })());
    const tf = K.takeFeed(S, 8);
    check('ração: tira do estoque o que estraga primeiro (mandioca, abóbora, milho, feijão)', tf.n === 8 && tf.back.milho === 8 && S.stock.milho === 22);
    check('no inverno não nasce cria', (() => { pe.births = {}; const n0 = S.stats.criaBorn; hours(S, 24 * 3); return S.stats.criaBorn === n0; })());
  }
  // ===================== a criação jogada pela IA =====================
  {
    const S = campo(9001, ['roca', 'criacao'], 3);
    const pen = build(S, 'curral', 5);
    setDay(S, 0, 1, 6);
    S.campo.mascateAt = 0;
    K.receive(S, { sp: 'galinha', m: 1, f: 4 }, pen.x + 1, pen.y + 1);
    K.receive(S, { sp: 'gado', m: 1, f: 1 }, pen.x + 1, pen.y + 1);
    S.vontades.criacao = 3;
    const eggs0 = S.stats.ovosGot, milk0 = S.stats.leiteGot;
    let ate = 0, drank = 0;
    days(S, 6, (s) => { for (const p of s.people) if (p.act && p.act.type === 'comer' && p.act.dish === 'ovos') ate++; else if (p.act && p.act.type === 'comer' && p.act.dish === 'leite') drank++; });
    check('com a Vontade Criação, o povo recolhe ovos e leite', S.stats.ovosGot > eggs0 && S.stats.leiteGot > milk0, S.stats.ovosGot + ' ovos · ' + S.stats.leiteGot + ' leite');
    check('e come ovo e toma leite', ate > 0 && drank > 0, ate + ' · ' + drank);
    check('quem cuida ganha a habilidade Criação', S.people.some((p) => (p.skills.criacao || 0) > 0.5));
    check('de noite os bichos dormem no curral', (() => { setHour(S, 23); let inPen = 0; days(S, 0.05); const w = S.world; for (const a of S.campo.bichos) if (w.bgrid[Math.floor(a.y) * w.W + Math.floor(a.x)] === pen.id) inPen++; return inPen >= S.campo.bichos.length - 1; })());
    check('de dia pastam em volta do curral (aberto)', (() => { setHour(S, 11); days(S, 0.2); return S.campo.bichos.every((a) => Math.hypot(a.x - pen.x - 1.5, a.y - pen.y - 1.5) <= C.CRIA_ROAM + 3); })());
  }
  // ===================== lobo e onça no curral =====================
  {
    const S = campo(42, ['roca', 'criacao', 'cerca']);
    const pen = build(S, 'curral', 5);
    K.receive(S, { sp: 'galinha', m: 1, f: 3 }, pen.x + 1, pen.y + 1);
    K.receive(S, { sp: 'gado', m: 1, f: 1 }, pen.x + 1, pen.y + 1);
    setDay(S, 1, 3, 21);
    force(S, 'lobos', { pack: 2 });
    const wasW = C.CRIA_WOLF_H, wasO = C.CRIA_ONCA_H;
    C.CRIA_WOLF_H = 1;
    const h0 = K.herd(S);
    K.hourly(S);
    check('lobos na noite: levam um bicho do curral aberto', K.herd(S) === h0 - 1 && S.chron.some((c) => /Os lobos levaram/.test(c.text)));
    check('e não levam gado', K.herd(S, 'gado') === 2);
    S.t += 60; S.ck = Sim.clock(S.t); K.hourly(S);
    check('um por noite', K.herd(S) === h0 - 1);
    ring(S, pen.x - 1, pen.y - 1, pen.x + 3, pen.y + 3, true);
    setDay(S, 1, 5, 22);
    force(S, 'lobos', { pack: 2 });
    for (let k = 0; k < 6; k++) { S.t += 60; S.ck = Sim.clock(S.t); K.hourly(S); }
    check('curral cercado: o lobo não leva nada', K.enclosed(S, pen) && K.herd(S) === h0 - 1);
    C.CRIA_ONCA_H = 1;
    S.narr.active.onca = { t0: S.t, until: S.t + 3 * D, bites: 0, hurt: [], fought: 0, killedBy: '' };
    setHour(S, 23); K.hourly(S);
    check('a onça pula a cerca', K.herd(S) === h0 - 2 && S.events.some((e) => e.k === 'toast' && /A onça pulou a cerca/.test(e.text)));
    C.CRIA_WOLF_H = wasW; C.CRIA_ONCA_H = wasO;
    const S2 = campo(777, ['roca', 'criacao']), p2 = build(S2, 'curral', 5);
    K.receive(S2, { sp: 'coelho', m: 1, f: 1 }, p2.x + 1, p2.y + 1);
    setDay(S2, 1, 3, 22); force(S2, 'lobos', { pack: 3 });
    S2.safe = true;
    C.CRIA_WOLF_H = 1;
    K.hourly(S2);
    C.CRIA_WOLF_H = wasW;
    S2.safe = false;
    check('com o jogo fechado, o lobo não leva bicho', K.herd(S2) === 2);
  }

  // ===================== mascate =====================
  {
    const S = campo(42, ['roca', 'criacao'], 2);
    S.stock.couro = 20; S.stock.roupas = 0;
    const t0 = S.t;
    const pen = build(S, 'curral', 5);
    const at = S.campo.mascateAt;
    check('curral pronto: um mascate vai passar em ' + C.MASCATE_FIRST_D.join(' a ') + ' dias', at >= t0 + C.MASCATE_FIRST_D[0] * D && at <= t0 + C.MASCATE_FIRST_D[1] * D + 60, ((at - t0) / D).toFixed(1));
    const off = K.offer(S);
    const worth = (pay) => Object.keys(pay).reduce((v, k) => v + pay[k] * C.TRADE_VALUE[k], 0);
    check('a oferta: o primeiro bicho que o povo não tem (galinha), pago com o que sobra', off && off.sp === 'galinha' && worth(off.pay) >= off.price && Object.keys(off.pay).every((k) => S.stock[k] >= off.pay[k]), JSON.stringify(off));
    check('o povo não troca o que precisa (guarda couro, ferramentas e comida curta)', (() => { const S2 = campo(42, ['roca', 'criacao']); S2.stock.couro = 4; S2.stock.peixe = 5; S2.stock.frutas = 0; build(S2, 'curral', 5); return K.offer(S2) === null; })());
    check('o preço em palavras', K.payText({ couro: 4 }) === '4 couros' && K.payText({ couro: 1, madeira: 30 }) === '1 couro e 30 de madeira');
    S.narr.auto = 'acolher';
    S.t = at; setHour(S, 9);
    let came = false;
    days(S, 2, (s) => { if (Object.values(s.narr.groups).some((g) => g.kind === 'mascate')) came = true; });
    check('o mascate vem pela trilha e troca', came && S.stats.trades === 1 && K.herd(S, 'galinha') === 3, S.stats.trades + ' troca(s)');
    check('a próxima visita fica para daqui a ' + C.MASCATE_D.join(' a ') + ' dias', S.campo.mascateAt - S.t > (C.MASCATE_D[0] - 2) * D && S.campo.mascateAt - S.t <= C.MASCATE_D[1] * D, ((S.campo.mascateAt - S.t) / D).toFixed(1));
    check('a primeira visita vai para a Crônica', S.chron.some((c) => /Chegou um mascate/.test(c.text)));
    // recusa: segue viagem sem trocar
    S.narr.auto = 'recusar';
    S.campo.mascateAt = S.t; setHour(S, 9);
    const c0 = S.stock.couro, h0 = K.herd(S);
    days(S, 2);
    check('dispensado, o mascate segue viagem', S.stats.trades === 1 && S.stock.couro === c0 && K.herd(S) === h0);
    // povo pobre: passa longe e volta depois
    const S3 = campo(777, ['roca', 'criacao']);
    Object.assign(S3.stock, { peixe: 3, madeira: 5, frutas: 0 });
    build(S3, 'curral', 5);
    S3.campo.mascateAt = S3.t; setHour(S3, 9);
    K.hourly(S3);
    check('sem o que trocar, passa longe (avisa uma vez) e volta em 5 dias', !Object.keys(S3.narr.groups).length && S3.events.some((e) => e.k === 'toast' && /passou longe/.test(e.text)) && S3.campo.mascateAt > S3.t + 4 * D);
    // a janela mostra os bichos e o preço
    const info = N.groupInfo(S, (() => { const g = N.spawnMascate(S, { sp: 'porco', m: 1, f: 1, price: 16, pay: { couro: 7 } }); return g.id; })());
    check('a janela do mascate traz a oferta', info && info.kind === 'mascate' && info.offer.sp === 'porco' && info.people.length === 1);
  }

  // ===================== comer o que vem do campo =====================
  {
    const S = campo(42, ['roca'], 1);
    Object.assign(S.stock, { peixe: 0, carne: 0, frutas: 0, defumado: 0, seca: 0, feijao: 10, milho: 0, abobora: 0, mandioca: 0, leite: 3, ovos: 0 });
    Sim.refresh(S);
    check('a comida do campo conta nos dias de comida', S.ctx.foodDays > 0 && T.FOOD.indexOf('feijao') >= 0 && T.FOOD.indexOf('leite') >= 0);
    const p = S.people[0];
    p.needs.fome = 20; p.needs.sede = 50;
    AI.decideType(S, p, 'comer');
    days(S, 0.1);
    check('o leite vai primeiro (e mata a sede também)', S.stock.leite < 3 && p.needs.sede > 50 - 5, 'leite ' + S.stock.leite);
    check('feijão, só cozido no fogo', S.stock.feijao < 10 && p.mem.some((m) => m.k === 'comeuQuente' || m.k === 'comeuCozido'));
    // sem fogo: feijão e mandioca não; milho e abóbora, crus
    const S2 = campo(777, ['roca'], 1);
    for (const b of S2.buildings) if (b.type === 'fogueira') b.fuel = 0;
    Object.assign(S2.stock, { peixe: 0, carne: 0, frutas: 0, madeira: 0, feijao: 5, mandioca: 5, milho: 5, abobora: 0 });
    const q = S2.people[0]; q.needs.fome = 30;
    AI.decideType(S2, q, 'comer');
    days(S2, 0.08);
    check('sem fogo, só o milho cru (feijão e mandioca esperam o fogo)', S2.stock.milho < 5 && S2.stock.feijao === 5 && S2.stock.mandioca === 5);
    // só sobrou o que pede fogo: acende a fogueira para cozinhar
    const S3 = campo(9001, ['roca'], 1);
    for (const b of S3.buildings) if (b.type === 'fogueira') b.fuel = 0;
    Object.assign(S3.stock, { peixe: 0, carne: 0, frutas: 0, madeira: 5, feijao: 5, mandioca: 0, milho: 0, abobora: 0 });
    const r = S3.people[0]; r.needs.fome = 20;
    AI.decideType(S3, r, 'comer');
    days(S3, 0.08);
    check('só feijão e o fogo apagado: acende a fogueira para cozinhar', S3.stock.feijao < 5 && S3.stock.madeira < 5);
    check('os vasos rendem também no feijão', (() => { const f0 = T.foodValue('feijao', S3); I.invent(S3, 'vasos'); return T.foodValue('feijao', S3) === f0 * C.VASO_FOOD; })());
  }
  // ===================== estragar no estoque =====================
  {
    const S = campo(42, ['roca']);
    Object.assign(S.stock, { feijao: 100, milho: 100, mandioca: 100, leite: 20, ovos: 50, frutas: 0, peixe: 0 });
    setDay(S, 0, 1, 0);
    for (let d = 0; d < 10; d++) { S.t += D; S.ck = Sim.clock(S.t); Sim.daily(S); }
    check('feijão e milho secos quase não estragam; mandioca, mais; leite azeda', S.stock.feijao >= 95 && S.stock.milho >= 93 && S.stock.mandioca < S.stock.milho && S.stock.leite < 5 && S.stock.ovos < 50,
      ['feijao', 'milho', 'mandioca', 'leite', 'ovos'].map((k) => k + ' ' + S.stock[k]).join(', '));
  }

  // ===================== missões =====================
  {
    check('missões do campo na aldeia: colher, as cinco culturas, 10 bichos, cercar', K.missions(4).map((m) => m.id).join() === 'c_roca,c_cinco,c_curral,c_cerca' && K.missions(4).every((m) => m.opt && m.reward > 0) && !K.missions(3).length);
    const S = world(42);
    S.stats.allGoals = true; Sim.checkGoals(S);
    S.stats.famGoals = true; Sim.checkGoals(S);
    for (const g of S.goals) if (!g.opt) g.done = true;
    Sim.checkGoals(S);
    check('a fase da aldeia traz as missões do campo', S.goalsPhase === 4 && ['c_roca', 'c_cinco', 'c_curral', 'c_cerca'].every((id) => S.goals.some((g) => g.id === id)));
    const p0 = S.god.poder;
    S.stats.harvests = 1; S.stats.harvestBy = { feijao: 1, milho: 1, abobora: 1, mandioca: 1 };
    Sim.checkGoals(S);
    check('colheu: missão cumprida, com Poder (as cinco ainda não)', S.goals.find((g) => g.id === 'c_roca').done && !S.goals.find((g) => g.id === 'c_cinco').done && S.god.poder === p0 + 6);
    S.stats.harvestBy.algodao = 1; S.stats.enclosed = true;
    Sim.checkGoals(S);
    check('as cinco culturas e o cercado', S.goals.find((g) => g.id === 'c_cinco').done && S.goals.find((g) => g.id === 'c_cerca').done);
    const d = JSON.parse(JSON.stringify(Save.serialize(world(777))));
    delete d.stats.campoMissions; d.goalsPhase = 4; d.goals = O.goals4(); delete d.campo;
    const S3 = Save.deserialize(d);
    const ids = S3.goals.filter((g) => /^c_/.test(g.id)).map((g) => g.id);
    check('save antigo na fase da aldeia: ganha as missões do campo', ids.length === 4, ids.join(', '));
    const S4 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S3))));
    check('e só uma vez', S4.goals.filter((g) => /^c_/.test(g.id)).length === 4);
  }

  // ===================== save =====================
  {
    const S = campo(42, ['roca', 'criacao', 'cerca', 'algodao'], 2);
    const r = build(S, 'roca', 4), pen = build(S, 'curral', 9);
    setDay(S, 0, 1);
    K.plant(S, r, 'algodao'); r.farm.grow = 0.62; r.farm.mato = S.t - 10; r.farm.pile = 7; r.farm.pileK = 'fibra'; r.farm.pick = 'milho';
    K.receive(S, { sp: 'porco', m: 1, f: 1 }, pen.x + 1, pen.y + 1);
    K.receive(S, { sp: 'galinha', m: 1, f: 2 }, pen.x + 1, pen.y + 1);
    pen.pen.ovos = 2.5; pen.pen.feed = 3;
    const n = ring(S, r.x - 1, r.y - 1, r.x + 3, r.y + 3, true);
    ring(S, pen.x - 1, pen.y - 1, pen.x + 3, pen.y + 3, false);
    const jobs = S.campo.fjobs.length;
    const txt = JSON.stringify(Save.serialize(S));
    const S2 = Save.deserialize(JSON.parse(txt));
    const r2 = S2.buildings.find((b) => b.id === r.id), p2 = S2.buildings.find((b) => b.id === pen.id);
    check('save: a roça (cultura, crescimento, mato, colheita no chão, a escolha)', r2.farm.k === 'algodao' && Math.abs(r2.farm.grow - 0.62) < 1e-9 && r2.farm.mato && r2.farm.pile === 7 && r2.farm.pick === 'milho');
    check('save: os bichos (espécie, sexo, curral) e o curral (ovos, ração)', K.herd(S2) === 5 && K.herd(S2, 'porco') === 2 && S2.campo.bichos.every((a) => a.pen === pen.id) && S2.campo.bichos.filter((a) => a.sex === 'M').length === 2 && p2.pen.ovos === 2.5 && p2.pen.feed === 3);
    check('save: as cercas feitas e as marcadas', S2.campo.fences === n && S2.campo.fjobs.length === jobs && K.enclosed(S2, r2) && K.fenceCount(S2) === n);
    const kb = JSON.stringify(Save.serialize(S2).campo).length / 1024;
    check('save: o campo cabe em pouco (menos de 3 KB)', kb < 3, kb.toFixed(2) + ' KB');
    days(S2, 1);
    check('carregado, segue rodando', !S2.over && S2.campo.bichos.length >= 5);
    const S5 = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
    check('save da 0.4 abre com o campo vazio e segue rodando', S5 && S5.campo && S5.campo.bichos.length === 0 && S5.world.fence && (days(S5, 1), true));
  }

  // ===================== jogo fechado =====================
  {
    const S = campo(42, ['roca', 'criacao']);
    const r = build(S, 'roca', 4), pen = build(S, 'curral', 9);
    setDay(S, 0, 1);
    K.plant(S, r, 'feijao');
    S.campo.mascateAt = S.t;
    S.safe = true;
    hours(S, 24 * 3);
    S.safe = false;
    check('com o jogo fechado, a roça cresce e o mascate não vem', r.farm.grow > 0.2 && !Object.keys(S.narr.groups).length);
    void pen;
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const jobs = [];
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['bem', 'rev', 'largado'];   // node test/campo-test.js 20 bem,rev
  for (const seed of [42, 777, 9001]) for (const mode of MODES) jobs.push({ seed, mode, years: YEARS });
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
  const order = { bem: 0, rev: 1, largado: 2 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com o campo (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    let pests = 0, mascates = 0;
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  campo: ' + K.ORDER.map((k) => k + ' ' + (r.disc[k] !== undefined ? r.disc[k] + (r.how[k] === 'revelacao' ? '*' : '') : '-')).join(', ') + ' · roças ' + r.rocas + ' · currais ' + r.pens + ' · cerâmica ' + (r.disc.ceramica !== undefined ? r.disc.ceramica : '-') + (r.prat ? ' · prática no fim: ' + r.prat : '') + ' · fibra ' + r.fibra);
      console.log('  colheitas ' + r.harvests + ' (' + Object.entries(r.harvestBy).map(([k, v]) => k + ' ' + v).join(', ') + ') · colhido ' + r.harvested + ' · perdas: mato ' + r.weedLoss + ', bicho ' + r.raids + ', praga ' + r.pests + ', geada ' + (r.frost ? 'sim' : 'não'));
      console.log('  criação: ' + r.herd + ' bichos no fim (máx. ' + r.herdMax + ') · nasceram ' + r.criaBorn + ' · perdidos ' + r.criaLost + ' · abates ' + r.abates + ' · ovos ' + r.ovos + ' · leite ' + r.leite + ' · lã ' + r.la + ' · mascates ' + r.mascates + ' (trocas ' + r.trades + ')');
      console.log('  cercas ' + r.fences + ' · cercado ' + (r.enclosed ? 'sim' : 'não') + ' · comida do campo no fim ' + r.farmFood + ' · dias de comida (mín. no inverno) ' + r.winterMin + ' · fome ' + r.hungry + '% · frio ' + r.cold + '%');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      pests += r.pests; mascates += r.mascates;
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      if (r.mode !== 'largado' && r.disc.roca !== undefined && YEARS >= 20) {
        check(tag + 'a roça dá: colheitas todo ano depois da roça', r.harvests >= Math.max(4, (YEARS - r.disc.roca) * 3), r.harvests);
        check(tag + 'as cinco culturas colhidas', Object.keys(r.harvestBy).length === 5, Object.keys(r.harvestBy).join(', '));
        const lateCria = r.disc.criacao === undefined || YEARS - r.disc.criacao < 2;   // descoberta tarde demais para julgar
        check(tag + 'a criação cresce (10 bichos ou mais em algum momento)', r.herdMax >= 10 || lateCria, r.herdMax + (lateCria ? ' (criação tarde demais para contar)' : ''));
        check(tag + 'as roças ficam cercadas', r.enclosed || r.disc.cerca === undefined);
        check(tag + 'o mascate passa e troca', r.trades >= 2 || lateCria, r.trades);
      }
      if (r.mode === 'bem') check(tag + 'o campo chega (a roça descoberta)', r.disc.roca !== undefined || YEARS < 20, r.disc.roca);
      if (r.mode === 'largado') check(tag + 'largado, ninguém planta (sem roça marcada)', r.rocas === 0 && r.harvests === 0);
    }
    check('a praga aparece (nos mundos com roça)', pests > 0 || YEARS < 20, pests);
    check('e o mascate passa', mascates > 0 || YEARS < 20, mascates);
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô "bem": o de sempre (barracas, conservar, Vontades por estação, obras, caça) e, no campo, duas ou três roças,
// o curral e uma cerca em volta de tudo; "rev": o mesmo, com a Revelação sempre que der; "largado": só a fogueira e a
// barraca (sem roça: a roça é obra que se marca)
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t, from) => { const at = spot(S, t, from); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], disc: {}, how: {}, herdMax: 0, winterMin: 99, fenceTries: 0 };
  let hours = 0, hungry = 0, cold = 0, fenced = 0;
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (mode !== 'largado' && d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S);
        const pend = () => S.buildings.some((b) => !b.built || b.up);
        if (!pend() && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend() && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!pend() && T.buildOpen(S, t) && !has(t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (T.known(S, 'lanca')) S.vontades.caca = 3;
        // Etapa 10: roças, curral e cerca
        const alive = S.people.filter((p) => p.alive).length;
        if (K.known(S, 'roca')) {
          S.vontades.roca = 3;
          const rocas = S.buildings.filter((b) => b.type === 'roca').length;
          if (!pend() && rocas < (alive >= 14 ? 3 : 2)) place('roca', 4);
        }
        if (K.known(S, 'criacao')) { S.vontades.criacao = 3; if (!pend() && !has('curral')) place('curral', 5); }
        if (K.known(S, 'cerca') && d % 15 === 0 && !S.campo.fjobs.length) {
          // como o jogador que olha o contorno (verde fechado, vermelho aberto): marca uma volta e, se a volta marcada
          // não fecha (passa no estoque, noutra roça, num túmulo), desfaz e tenta outra; primeiro em volta de cada
          // roça ou curral aberto (1 a 3 passos de folga), depois em volta de todos juntos
          const farm = S.buildings.filter((b) => (b.type === 'roca' || b.type === 'curral') && b.built);
          const open = farm.filter((b) => !K.enclosed(S, b));
          const tryRing = (x0, y0, x1, y1, targets) => {
            const w = S.world, made = [];
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
              if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
              const i = y * w.W + x;
              if (K.markFence(S, i, true)) made.push(i);
            }
            out.fenceTries++;
            if (made.length && targets.every((t) => !K.enclPlanned(S, t).open)) return true;
            for (const i of made) K.markFence(S, i, false);
            return false;
          };
          let done = false;
          for (const b of open) {
            for (let pad = 1; pad <= 3 && !done; pad++) done = tryRing(b.x - pad, b.y - pad, b.x + b.w - 1 + pad, b.y + b.h - 1 + pad, [b]);
            if (done) break;
          }
          if (!done && open.length) {
            const x0 = Math.min(...farm.map((b) => b.x)), y0 = Math.min(...farm.map((b) => b.y));
            const x1 = Math.max(...farm.map((b) => b.x + b.w - 1)), y1 = Math.max(...farm.map((b) => b.y + b.h - 1));
            for (let pad = 1; pad <= 3 && !done; pad++) done = tryRing(x0 - pad, y0 - pad, x1 + pad, y1 + pad, open);
          }
          if (done) fenced++;
        }
        // a missão das cinco culturas: o jogador escolhe algodão numa roça até a primeira colheita dele
        if (K.known(S, 'algodao')) {
          const rocasB = S.buildings.filter((b) => b.type === 'roca' && b.built && b.farm);
          const got = (S.stats.harvestBy || {}).algodao;
          if (!got && rocasB.length >= 2 && !rocasB.some((b) => b.farm.pick === 'algodao')) rocasB[rocasB.length - 1].farm.pick = 'algodao';
          if (got) for (const b of rocasB) if (b.farm.pick === 'algodao') b.farm.pick = null;
        }
        const busy = S.buildings.filter((b) => !b.built || b.up).length;
        if (!busy && S.ctx.foodDays > 6) {
          if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
          else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
          else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
          else for (const t of ['fogueira', 'barraca', 'armazem', 'marcenaria', 'tecelagem', 'moquem', 'jirau', 'forno', 'roca', 'curral']) {
            const b = S.buildings.find((x) => x.built && !x.up && x.type === t && Sim.upgrades(S, x).some((o) => !o.why) && (t !== 'barraca' || x.lv >= 2 || have >= need + 1));
            if (b && Sim.startUpgrade(S, b)) break;
          }
        }
      }
      if (mode === 'rev' && !God.canCast(S, 'revelacao')) {
        const p = S.people.find((q) => q.alive && !q.carriedBy && F.age(S, q) >= 12 && Sim.isSeen(S, Math.floor(q.x), Math.floor(q.y)));
        if (p) God.cast(S, 'revelacao', Math.floor(p.x), Math.floor(p.y));
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        for (const e of S.events) if (e.k === 'disc' && (K.DEF[e.id] || e.id === 'ceramica')) { out.disc[e.id] = +(S.t / Y).toFixed(2); out.how[e.id] = S.tech.known[e.id].how; }
        S.events.length = 0;
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      out.herdMax = Math.max(out.herdMax, K.herd(S));
      if (S.ck.season === 3 && S.stats.harvests) out.winterMin = Math.min(out.winterMin, Math.floor(S.ctx.foodDays));
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats;
  Object.assign(out, {
    alive: S.people.filter((p) => p.alive).length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    rocas: S.buildings.filter((b) => b.type === 'roca').length, pens: S.buildings.filter((b) => b.type === 'curral').length,
    harvests: st.harvests || 0, harvestBy: st.harvestBy || {}, harvested: st.harvested || 0, raids: st.raids || 0, pests: st.pests || 0, frost: !!st.frost,
    weedLoss: S.buildings.filter((b) => b.farm && b.farm.matoLost).length,
    herd: K.herd(S), criaBorn: st.criaBorn || 0, criaLost: st.criaLost || 0, abates: st.abates || 0, ovos: st.ovosGot || 0, leite: st.leiteGot || 0, la: st.laGot || 0,
    mascates: S.campo.mascates || 0, trades: st.trades || 0, fences: K.fenceCount(S), fenced,
    prat: K.openList(S).map((k) => k + ' ' + Math.round(K.progress(S, k) * 100) + '%').join(', '), fibra: Math.floor(S.stock.fibra || 0),
    enclosed: S.buildings.some((b) => b.type === 'roca' && b.built && K.enclosed(S, b)),
    farmFood: ['feijao', 'milho', 'abobora', 'mandioca', 'ovos', 'leite'].reduce((n, k) => n + (S.stock[k] || 0), 0),
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  if (out.winterMin === 99) out.winterMin = '-';
  return out;
}
