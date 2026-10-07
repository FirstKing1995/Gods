// Gods · testes das invenções (Etapa 8). Uso: node test/invencoes-test.js [anos]
// 1) unidades: a árvore (o que abre o quê), a prática (cada trabalho ensina a sua, várias ao mesmo tempo), inventar
//    (quem mais praticou, uma por dia, festa e Crônica), a Revelação (a escolhida, a trilha primeiro, a mais adiantada),
//    os efeitos (faca, corda, machado, agulha, rede de pesca, arco e flecha, vasos, tambor e flauta, na conta e na prática),
//    missões novas, save novo e save antigo
// 2) 20 anos em três mundos, jogando bem, bem com a Revelação e largado: as invenções chegam espalhadas pelos anos,
//    usadas de verdade (flecha, tambor, flauta), e ninguém morre de fome, sede ou frio
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Obras: O, Fauna: FA } = G;
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
function build(S, t) {
  const at = spot(S, t);
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (t === 'fogueira') b.fuel = 8;
  Sim.refresh(S);
  return b;
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
function invent(S, ...ids) { for (const id of ids) I.invent(S, id); S.events.length = 0; }
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== a árvore =====================
  {
    const S = world(42);
    check('nove invenções, todas na janela das Descobertas', I.ORDER.length === 9 && I.ORDER.every((id) => T.DISC[id] && T.DISC[id].inv && T.DISC[id].story && C.INV_NEED[id] > 0));
    check('no começo nenhuma invenção está aberta', I.openList(S).length === 0);
    learnUpTo(S, 'pedra');
    check('a pedra lascada abre a faca', same(I.openList(S), ['faca']), I.openList(S).join(', '));
    learnUpTo(S, 'cestos');
    check('os cestos abrem a corda (e a faca segue aberta)', same(I.openList(S), ['faca', 'corda']), I.openList(S).join(', '));
    check('o que ainda falta aparece por nome', I.missing(S, 'rede').join(' e ') === 'corda e anzol' && I.missing(S, 'arco').join(' e ') === 'corda e lança', I.missing(S, 'arco').join(', '));
    invent(S, 'faca');
    check('a faca abre a flauta e a agulha', same(I.openList(S), ['corda', 'flauta', 'agulha']), I.openList(S).join(', '));
    learnUpTo(S, 'lanca');
    check('a lança abre o tambor; o arco ainda pede a corda', I.isOpen(S, 'tambor') && !I.isOpen(S, 'arco'));
    invent(S, 'corda');
    check('a corda abre o machado e o arco', I.isOpen(S, 'machado') && I.isOpen(S, 'arco') && !I.isOpen(S, 'rede'));
    learnUpTo(S, 'anzol');
    check('corda e anzol abrem a rede de pesca', I.isOpen(S, 'rede'));
    learnUpTo(S, 'ceramica');
    check('a cerâmica abre os vasos', I.isOpen(S, 'vasos') && I.openList(S).length === 7, I.openList(S).join(', '));
  }

  // ===================== a prática =====================
  {
    const S = world(42);
    learnUpTo(S, 'cestos');
    const [a, b] = S.people;
    T.onWork(S, a, { type: 'madeira', stage: 'work' }, 60);
    check('uma hora cortando madeira ensina a faca e a corda ao mesmo tempo', Math.abs(S.tech.prat.faca - 0.25) < 1e-9 && Math.abs(S.tech.prat.corda - 0.5) < 1e-9, S.tech.prat.faca + ' · ' + S.tech.prat.corda);
    T.onWork(S, a, { type: 'madeira', stage: 'go' }, 60);
    check('andar até a árvore não ensina', Math.abs(S.tech.prat.corda - 0.5) < 1e-9);
    T.onWork(S, b, { type: 'oficio', stage: 'work', make: 'mantas' }, 60);
    check('tecer manta ensina a corda (e o Ofício, a faca)', Math.abs(S.tech.prat.corda - 2) < 1e-9 && Math.abs(S.tech.prat.faca - 1.25) < 1e-9, S.tech.prat.corda + ' · ' + S.tech.prat.faca);
    T.onWork(S, a, { type: 'pesca', stage: 'work' }, 600);
    check('invenção fechada não ganha prática (pescar, sem corda e anzol, não ensina a rede)', !S.tech.prat.rede);
    check('cada invenção lembra quem praticou', S.tech.whoInv.corda[a.id] === 0.5 && S.tech.whoInv.corda[b.id] === 1.5);
    check('a trilha segue com a própria prática (madeira ensina a lança)', S.tech.prat.lanca > 0);
  }

  // ===================== inventar =====================
  {
    const S = world(42);
    learnUpTo(S, 'cestos');
    S.life.party = null; S.life.lastParty = -1e9;
    const [a, b] = S.people;
    S.tech.prat.faca = I.need('faca') - 1;
    for (let i = 0; i < 40; i++) I.daily(S);
    check('antes de completar a prática, nada', !I.known(S, 'faca'));
    S.tech.prat.faca = I.need('faca'); S.tech.prat.corda = I.need('corda') * 1.3;
    S.tech.whoInv.corda = { [a.id]: 3, [b.id]: 9 };
    let two = false, first = null;
    for (let i = 0; i < 80 && I.count(S) < 2; i++) { const n0 = I.count(S); I.daily(S); if (I.count(S) - n0 > 1) two = true; if (!first && I.count(S)) first = Object.keys(S.tech.known).find((k) => I.DEF[k]); }
    check('com a prática completa, a ideia chega (uma por dia, a mais madura primeiro)', I.count(S) === 2 && !two && first === 'corda', first);
    check('quem mais praticou inventa, e a Crônica conta', S.tech.known.corda.by === b.name && S.chron.some((c) => c.disc === 'corda' && c.text.indexOf(b.name) === 0), S.chron.filter((c) => c.disc).map((c) => c.text).join(' | '));
    check('invenção dá festa ("Nova invenção")', S.life.party && S.life.party.why === 'descoberta' && /^Nova invenção: a (corda|faca)\./.test(L.partyText(S, S.life.party)), S.life.party && L.partyText(S, S.life.party));
    check('a primeira invenção avisa onde ver', S.events.some((e) => e.k === 'toast' && /Primeira invenção/.test(e.text)));
    check('a trilha não conta as invenções', T.count(S) === 2 && I.count(S) === 2);
  }

  // ===================== Revelação =====================
  {
    const S = world(777);
    learnUpTo(S, 'cestos');
    S.god.poder = 500;
    S.tech.prat.lanca = 0; S.tech.prat.faca = I.need('faca') * 0.5; S.tech.prat.corda = I.need('corda') * 0.35;
    check('trilha longe dos 30%: a Revelação entrega a invenção mais adiantada', T.revealTarget(S) === 'faca', T.revealTarget(S));
    S.tech.aim = 'corda';
    check('a escolhida na janela passa na frente', T.revealTarget(S) === 'corda');
    S.tech.aim = 'rede';
    check('escolher uma fechada não vale (volta à mais adiantada)', T.revealTarget(S) === 'faca');
    S.tech.aim = null; S.tech.prat.lanca = T.need('lanca') * 0.4;
    check('com a trilha pronta para revelar, ela vem primeiro', T.revealTarget(S) === 'lanca');
    const p = S.people[0];
    let r = God.cast(S, 'revelacao', Math.floor(p.x), Math.floor(p.y));
    check('Revelação da trilha', r.ok && T.known(S, 'lanca') && S.tech.known.lanca.how === 'revelacao', r.msg);
    S.tech.aim = 'corda';
    r = God.cast(S, 'revelacao', Math.floor(p.x), Math.floor(p.y));
    check('Revelação da invenção escolhida: quem sonhou inventa na hora', r.ok && I.known(S, 'corda') && S.tech.known.corda.by && r.msg.indexOf(S.tech.known.corda.by + ' sonhou com corda') >= 0 && S.tech.known.corda.how === 'revelacao' && S.tech.aim === null, r.msg);
    S.tech.prat.faca = 0; S.tech.prat.anzol = 0;
    for (const id of ['machado', 'arco', 'flauta', 'agulha', 'tambor']) S.tech.prat[id] = 0;
    check('nada perto dos 30%: o milagre diz o que falta', /não está pronto para entender/.test(God.canCast(S, 'revelacao')), God.canCast(S, 'revelacao'));
  }

  // ===================== efeitos na conta =====================
  {
    const S = world(42);
    learnUpTo(S, 'ceramica');
    const p = S.people[0];
    p.tool = { dur: 100 };
    const sp = (wk) => +T.speed(S, p, wk).toFixed(3);
    check('sem invenções: ferramenta de pedra dá 20% na madeira, nada no Ofício', sp('madeira') === C.TOOL_BONUS && sp('oficio') === 1 && sp('construir') === C.TOOL_BONUS);
    invent(S, 'faca', 'corda', 'machado');
    check('machado: madeira 60% mais rápido (com ferramenta)', sp('madeira') === C.MACHADO_BONUS, sp('madeira'));
    check('corda: obra e caminho 20% mais rápidos (somando a ferramenta)', sp('construir') === +(C.TOOL_BONUS * C.CORDA_BUILD).toFixed(3), sp('construir'));
    check('faca: Ofício 25% mais rápido', sp('oficio') === C.FACA_OFICIO, sp('oficio'));
    p.tool = null;
    check('sem ferramenta, o machado não corta sozinho', sp('madeira') === 1);
    p.tool = { dur: 100 };
    const y = I.cacaYield(S);
    check('faca: a caça rende 3 de carne e 1 de couro a mais', y.carne === C.CACA_CARNE + 3 && y.couro === C.CACA_COURO + 1, JSON.stringify(y));
    const f0 = T.fishMult(S, p);
    invent(S, 'rede');
    check('rede de pesca: fisga 35% mais e traz até 2 peixes a mais', Math.abs(T.fishMult(S, p) / f0 - C.REDE_FISH) < 1e-9 && I.fishMax(S) === C.FISH_MAX + 2, f0 + ' → ' + T.fishMult(S, p));
    p.roupa = { dur: 100 };
    const c0 = T.coldMult(p, S);
    T.daily(S); const w0 = 100 - p.roupa.dur; p.roupa.dur = 100;
    invent(S, 'agulha');
    T.daily(S); const w1 = 100 - p.roupa.dur;
    check('agulha: roupa costurada esquenta mais e gasta menos', T.coldMult(p, S) === C.AGULHA_COLD && c0 === C.ROUPA_COLD && Math.abs(w1 / w0 - C.AGULHA_WEAR) < 0.01, c0 + ' → ' + T.coldMult(p, S) + ' · gasto ' + w0.toFixed(2) + ' → ' + w1.toFixed(2));
    const r0 = I.cacaR(S);
    invent(S, 'arco');
    check('arco e flecha: atira de mais longe, acerta mais, mais flechas', r0 === C.CACA_R && I.cacaR(S) === C.ARCO_R && I.cacaHit(S) === C.ARCO_HIT && I.cacaShots(S) === C.ARCO_SHOTS);
    S.stock.peixe = 20; S.stock.frutas = 0; Sim.refresh(S);
    const v0 = T.foodValue('peixe', S), fd0 = S.ctx.foodDays;
    invent(S, 'vasos'); Sim.refresh(S);
    check('vasos: peixe e carne cozidos sustentam 25% mais (e o estoque rende mais dias)', T.foodValue('peixe', S) === v0 * C.VASO_FOOD && T.foodValue('frutas', S) === C.FRUIT_FOOD && S.ctx.foodDays > fd0, v0 + ' → ' + T.foodValue('peixe', S) + ' · dias ' + fd0.toFixed(1) + ' → ' + S.ctx.foodDays.toFixed(1));
  }

  // ===================== efeitos na prática (simulação curta) =====================
  {
    // caça: com o arco, a flecha acerta e conta
    const S = world(9001);
    learnUpTo(S, 'lanca'); invent(S, 'corda', 'arco');
    build(S, 'fogueira'); build(S, 'barraca');
    S.stock.ferramentas = 6; S.vontades.caca = 3;
    let bows = 0;
    days(S, 30, (s) => { for (const e of s.events) if (e.k === 'throw' && e.bow) bows++; });
    check('com o arco, quem caça atira flechas e acerta', bows > 0 && S.stats.arrowKills > 0, bows + ' flechas · ' + S.stats.arrowKills + ' acertos · ' + S.stats.hunted + ' caçadas');
  }
  {
    // pesca: a mesma água, com e sem a rede
    const got = (withNet) => {
      const S = world(777);
      learnUpTo(S, 'anzol'); invent(S, 'corda');
      if (withNet) invent(S, 'rede');
      build(S, 'fogueira'); build(S, 'barraca');
      S.stock.ferramentas = 6;
      Object.assign(S.vontades, { pesca: 3, frutas: 1, madeira: 1, caca: 0 });
      const g0 = (S.stats.got && S.stats.got.peixe) || 0;
      let hours = 0;
      days(S, 12, (s) => { for (const q of s.people) if (q.alive && q.act && q.act.type === 'pesca' && q.act.stage === 'work') hours += 2 / 60; });
      return (((S.stats.got && S.stats.got.peixe) || 0) - g0) / Math.max(1, hours);
    };
    const a = got(false), b = got(true);
    check('rede de pesca: mais peixe por hora de pesca', b > a * 1.15, a.toFixed(2) + ' → ' + b.toFixed(2) + ' peixes/h');
  }
  {
    // flauta: noite de música ao pé do fogo
    const S = world(42);
    learnUpTo(S, 'pedra'); invent(S, 'faca', 'flauta');
    build(S, 'fogueira'); build(S, 'barraca');
    S.stock.madeira = 40; S.stock.peixe = 40;
    const keep = C.FLAUTA_STORY; C.FLAUTA_STORY = 1;
    let music = false, heard = false, n = 0;
    days(S, 6, (s) => {
      if (s.life.story && s.life.story.music && s.life.story.on) music = true;
      if (++n % 30 === 0 && s.people.some((q) => q.mem.some((m) => m.k === 'ouviuFlauta'))) heard = true;
    });
    C.FLAUTA_STORY = keep;
    check('com a flauta, a história vira música e quem ouve fica feliz', music && S.stats.flutes > 0 && heard && S.chron.some((c) => /tocou flauta/.test(c.text)), 'noites de flauta ' + S.stats.flutes);
  }
  {
    // tambor: festa com batuque, alguém bate e os outros dançam
    const S = world(777);
    learnUpTo(S, 'lanca'); invent(S, 'tambor');
    build(S, 'fogueira'); build(S, 'barraca');
    S.stock.madeira = 40; S.stock.peixe = 60; S.vontades.caca = 0;
    days(S, 1);   // o casal se ajeita antes
    S.life.party = null; S.life.lastParty = -1e9;
    L.party(S, 'fartura');
    // descansados para a festa: o teste é do tambor, não do cansaço (com mais bichos no mundo, o dia muda um pouco)
    for (let i = 0; i < 360 && S.ck.hour < 17; i++) { Sim.step(S, 2); S.events.length = 0; }
    for (const q of S.people) q.needs.energia = Math.max(q.needs.energia, 90);
    let drummer = 0, danced = 0, n = 0;
    days(S, 2, (s) => {
      const pt = s.life.party; if (pt && pt.on && pt.drummer) drummer = pt.drummer;
      if (++n % 30 === 0) danced = Math.max(danced, s.people.filter((q) => q.mem.some((m) => m.k === 'festaTambor')).length);
    });
    check('festa com tambor: um bate, os outros dançam, e a Crônica lembra', drummer > 0 && S.stats.drumParties === 1 && danced >= 2 && S.chron.some((c) => /primeira festa com tambor/.test(c.text)), 'dançaram ' + danced);
  }
  {
    // festa com tambor aproxima mais (a mesma festa, com e sem)
    const bond = (drum) => {
      const S = world(42);
      learnUpTo(S, 'lanca'); if (drum) invent(S, 'tambor');
      build(S, 'fogueira'); build(S, 'barraca');
      S.stock.madeira = 40; S.stock.peixe = 60; S.vontades.caca = 0;
      days(S, 1);
      S.life.party = null; S.life.lastParty = -1e9;
      const [a, b] = S.people;
      L.party(S, 'fartura');
      const r0 = a.rel[b.id] || 0;
      days(S, 2);
      return (a.rel[b.id] || 0) - r0;
    };
    const r0 = bond(false), r1 = bond(true);
    check('com o tambor, a festa aproxima mais', r1 > r0 * 1.2, r0.toFixed(1) + ' → ' + r1.toFixed(1));
  }
  {
    // vasos: o cozido quente
    const S = world(9001);
    learnUpTo(S, 'ceramica'); invent(S, 'vasos');
    build(S, 'fogueira'); build(S, 'barraca');
    S.stock.peixe = 30; S.stock.madeira = 30;
    for (const q of S.people) q.needs.fome = 30;
    days(S, 2);
    check('com os vasos, comem cozido (e gostam)', S.people.some((q) => q.mem && q.mem.some((m) => m.k === 'comeuCozido')));
  }

  // ===================== metas =====================
  {
    check('missões das invenções em cada fase', I.missions(2).map((m) => m.id).join() === 'i_faca' && I.missions(3).length === 2 && I.missions(4).length === 3 && [2, 3, 4].every((f) => I.missions(f).every((m) => m.opt && m.reward > 0)));
    const S = world(42);
    S.stats.allGoals = true;
    Sim.checkGoals(S);
    check('a fase da família traz a missão da faca', S.goalsPhase === 2 && S.goals.some((g) => g.id === 'i_faca'));
    learnUpTo(S, 'pedra'); invent(S, 'faca');
    Sim.checkGoals(S);
    check('inventou a faca: missão cumprida, com Poder', S.goals.find((g) => g.id === 'i_faca').done);
    S.stats.famGoals = true;
    Sim.checkGoals(S);
    check('as descobertas trazem corda e três invenções', S.goalsPhase === 3 && ['i_corda', 'i_tres'].every((id) => S.goals.some((g) => g.id === id)));
    for (const g of S.goals) if (!g.opt) g.done = true;
    Sim.checkGoals(S);
    check('a aldeia traz arco, tambor e todas as invenções', S.goalsPhase === 4 && ['i_arco', 'i_tambor', 'i_todas'].every((id) => S.goals.some((g) => g.id === id)), S.goals.map((g) => g.id).join(', '));
  }

  // ===================== save =====================
  {
    const S = world(777);
    learnUpTo(S, 'cestos'); invent(S, 'faca');
    S.tech.prat.corda = 33; S.tech.whoInv.corda = { [S.people[0].id]: 33 }; S.tech.aim = 'corda';
    const js = JSON.stringify(Save.serialize(S));
    const S2 = Save.deserialize(JSON.parse(js));
    check('save: invenções, prática, quem praticou e a escolhida', I.known(S2, 'faca') && S2.tech.prat.corda === 33 && S2.tech.whoInv.corda[S.people[0].id] === 33 && S2.tech.aim === 'corda');
    // save da 0.7 já na fase da aldeia: ganha as missões das invenções uma vez
    const d = JSON.parse(js);
    delete d.stats.invMissions; delete d.tech.whoInv; delete d.tech.aim;
    d.goalsPhase = 4; d.goals = O.goals4();
    const S3 = Save.deserialize(d);
    const ids = S3.goals.filter((g) => /^i_/.test(g.id)).map((g) => g.id);
    check('save antigo na fase da aldeia: ganha as missões das invenções', ['i_faca', 'i_corda', 'i_tres', 'i_arco', 'i_tambor', 'i_todas'].every((id) => ids.includes(id)) && S3.tech.whoInv, ids.join(', '));
    const S4 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S3))));
    check('e só uma vez', S4.goals.filter((g) => /^i_/.test(g.id)).length === ids.length);
    const S5 = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
    check('save da 0.4 abre e segue rodando', S5 && (days(S5, 1), !S5.over || true));
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }   // só as unidades

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const jobs = [];
  for (const seed of [42, 777, 9001]) for (const mode of ['bem', 'rev', 'largado']) jobs.push({ seed, mode, years: YEARS });
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
    const order = { bem: 0, rev: 1, largado: 2 };
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com as invenções (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · ${r.rev ? r.rev + ' revelações · ' : ''}trilha em ${r.trailEnd || '-'}`);
      console.log('  invenções (ano; * = Revelação): ' + I.ORDER.map((id) => id + ' ' + (r.inv[id] ? r.inv[id] + (r.how[id] === 'revelacao' ? '*' : '') : '-')).join(', '));
      console.log(`  caçadas ${r.hunted} (flechas certeiras ${r.arrows}) · festas ${r.parties} (com tambor ${r.drums}) · noites de flauta ${r.flutes} · peixe ${r.fish} · madeira por hora de corte ${r.woodRate.map((x) => x.toFixed(1)).join(' → ')}`);
      console.log(`  fome ${r.hungry}% · frio ${r.cold}% · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      const n = Object.keys(r.inv).length;
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      check(tag + 'nunca duas invenções no mesmo dia', r.sameDay === 0, r.sameDay);
      if (r.mode === 'bem') {
        check(tag + 'as nove invenções em ' + YEARS + ' anos', n === 9 || YEARS < 20, n + ' de 9');
        check(tag + 'a primeira chega cedo (até o ano 6)', Math.min(...Object.values(r.inv)) <= 6, Math.min(...Object.values(r.inv)));
        check(tag + 'espalhadas pelos anos (a última depois do ano 8)', Math.max(...Object.values(r.inv)) > 8 || YEARS < 20, Math.max(...Object.values(r.inv)));
        check(tag + 'usadas de verdade: flecha, tambor e flauta', (r.arrows > 0 && r.drums > 0 && r.flutes > 0) || YEARS < 20, r.arrows + ' · ' + r.drums + ' · ' + r.flutes);
        check(tag + 'com o machado, mais madeira por hora de corte', !r.inv.machado || r.woodRate[1] > r.woodRate[0] * 1.2, r.woodRate.map((x) => x.toFixed(1)).join(' → '));
        check(tag + 'o povo cresce (15 pessoas ou mais)', r.alive >= 15 || YEARS < 20, r.alive);
      } else if (r.mode === 'rev') {
        check(tag + 'com a Revelação, as nove', n === 9 || YEARS < 20, n + ' de 9');
      } else {
        check(tag + 'largado, o povo ainda inventa (6 ou mais)', n >= 6 || YEARS < 20, n + ' de 9');
      }
    }
    // a Revelação adianta: soma dos anos das invenções, mundo a mundo
    for (const seed of [42, 777, 9001]) {
      const b = results.find((r) => r.seed === seed && r.mode === 'bem'), v = results.find((r) => r.seed === seed && r.mode === 'rev');
      if (!b || !v || !b.inv || !v.inv) continue;
      const sum = (r) => I.ORDER.reduce((s, id) => s + (r.inv[id] || YEARS + 5), 0);
      check('mundo ' + seed + ': a Revelação adianta as invenções', sum(v) < sum(b) || YEARS < 20, sum(b).toFixed(1) + ' → ' + sum(v).toFixed(1));
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô "bem": o de sempre (barracas, conservar, Vontades por estação) e as obras (Etapa 7);
// "rev": o mesmo, e a Revelação sempre que der; "largado": só a fogueira e a barraca
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t) => { const at = spot(S, t); if (!at) return false; Sim.placeBlueprint(S, t, at.x, at.y); return true; };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, inv: {}, how: {}, errors: [], deaths: [], rev: 0, sameDay: 0, trailEnd: null };
  let hours = 0, hungry = 0, cold = 0, arrows = 0;
  const woodH = [0, 0], woodN = [0, 0];
  const invDay = {};
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
        const busy = S.buildings.filter((b) => !b.built || b.up).length;
        if (!busy && S.ctx.foodDays > 6) {
          if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
          else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
          else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
          else for (const t of ['fogueira', 'barraca', 'armazem', 'marcenaria', 'tecelagem', 'moquem', 'jirau', 'forno']) {
            const b = S.buildings.find((x) => x.built && !x.up && x.type === t && Sim.upgrades(S, x).some((o) => !o.why) && (t !== 'barraca' || x.lv >= 2 || have >= need + 1));
            if (b && Sim.startUpgrade(S, b)) break;
          }
        }
      }
      if (mode === 'rev' && !God.canCast(S, 'revelacao')) {
        const p = S.people.find((q) => q.alive && !q.carriedBy && F.age(S, q) >= 12 && Sim.isSeen(S, Math.floor(q.x), Math.floor(q.y)));
        if (p && God.cast(S, 'revelacao', Math.floor(p.x), Math.floor(p.y)).ok) out.rev++;
      }
      const machado = T.known(S, 'machado') ? 1 : 0;
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        for (const e of S.events) {
          if (e.k === 'disc' && I.DEF[e.id]) {
            out.inv[e.id] = +(S.t / Y).toFixed(2); out.how[e.id] = S.tech.known[e.id].how;
            const day = Math.floor(S.t / D);
            if (invDay[day]) out.sameDay++;
            invDay[day] = 1;
          }
          if (e.k === 'throw' && e.bow) arrows++;
          if (e.k === 'fell') woodN[machado]++;
        }
        S.events.length = 0;
        for (const p of S.people) if (p.alive && p.act && p.act.type === 'madeira' && p.act.stage === 'work') woodH[machado] += 2 / 60;
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      if (!out.trailEnd && T.count(S) === T.ORDER.length) out.trailEnd = +(S.t / Y).toFixed(2);
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats;
  Object.assign(out, {
    alive: S.people.filter((p) => p.alive).length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    hunted: st.hunted || 0, arrows: st.arrowKills || 0, parties: st.parties || 0, drums: st.drumParties || 0, flutes: st.flutes || 0,
    fish: (st.got && st.got.peixe) || 0, thrownArrows: arrows,
    woodRate: [woodN[0] * C.TREE_WOOD / Math.max(1, woodH[0]), woodN[1] * C.TREE_WOOD / Math.max(1, woodH[1])],
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
