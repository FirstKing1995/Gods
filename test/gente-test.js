// Gods · testes da Etapa 15 (Gente viva). Uso: node test/gente-test.js [anos | u] [modos]
// 1) unidades: os gostos (fixos no mundo, herdados em parte, do povo), o trabalho de que gosta (pontua e rende mais),
//    comer o que gosta, o jeito (o resultado ensina, a mordida afasta, o exemplo dos pais), os pensamentos (o que pesa
//    mais, com o porquê; par só entre adultos e nunca com parente), as conversas novas (contar o que viu, a fofoca, o
//    combinado que vira trabalho junto, o gosto, o desabafo, ensinar uma técnica), as tentativas antes da descoberta,
//    o domínio das técnicas (quem descobre, quem aprende vendo, quem é ensinado, o último que sabe e morre), o save, o
//    save antigo, o jogo fechado e o custo numa aldeia de 300
// 2) 20 anos em três mundos, "bem" (o robô de sempre) e "largado" (só fogo e barraca): ninguém morre de fome, sede ou
//    frio; o povo faz mais o que gosta que o que detesta; cada conversa nova acontece; há tentativas; a trilha anda; o
//    domínio do machado se espalha
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
G.CFG.WORLD_GEN = 1;   // 0.18: estes testes foram montados nos mapas de antes das regiões (as regiões têm o teste delas)
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Campo: K, Deus: D, Povos: Pv, Minas: Mi, Gente: Ge } = G;
const Y = 60 * 1440, DAYM = 1440;

// ---------- ajudantes ----------
function newWorld(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  return Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
}
function spot(S, t, from, max) {
  for (let r = from || 2; r < (max || 60); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t, from) {
  const at = spot(S, t, from);
  if (!at) return null;
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (t === 'fogueira') b.fuel = 8;
  Sim.refresh(S);
  return b;
}
function add(S, sex, name, age) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = F.age(S, q);
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); Mi.init(S);
  q.fe = 70;
  return q;
}
function village(seed, n) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true; S.arrived = true;
  S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 20 + (k * 3) % 15);
  build(S, 'fogueira');
  for (let k = 0; k < Math.ceil(n / 2) + 3; k++) build(S, 'barraca', 3);
  S.people.forEach((p, k) => { p.fe = 70; p.act = null; p.path = null; p.x = S.camp.x + 0.5 + (k % 4); p.y = S.camp.y + 2.5 + Math.floor(k / 4); p.px = p.x; p.py = p.y; });
  Object.assign(S.stock, { madeira: 150, pedra: 60, agua: 20, frutas: 80, peixe: 120, tabuas: 30 });
  for (const id of ['pedra', 'cestos', 'lanca']) if (!T.known(S, id)) S.tech.known[id] = { t: S.t, by: 'teste', how: 'pratica' };
  S.stock.ferramentas = 6;
  S.events.length = 0; S.chron.length = 0;
  Sim.refresh(S);
  return S;
}
function setHour(S, h) { let t = Math.floor(S.t / DAYM) * DAYM + h * 60; if (t <= S.t) t += DAYM; S.t = t; S.ck = Sim.clock(S.t); Sim.refresh(S); }
function days(S, n, each) { for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; } }
const alive = (S) => S.people.filter((p) => p.alive);
const clone = (S) => Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== gostos =====================
  {
    const S = village(42, 8), A = village(42, 8);
    const g1 = S.people.map((p) => JSON.stringify(Ge.gosto(S, p))), g2 = A.people.map((p) => JSON.stringify(Ge.gosto(A, p)));
    check('o gosto de cada um é o mesmo no mesmo mundo (e não gasta o sorteio da simulação)', g1.join() === g2.join() && S.rng.s === A.rng.s);
    const B = village(9001, 8);
    check('em outro mundo, outros gostos', B.people.map((p) => JSON.stringify(Ge.gosto(B, p))).join() !== g1.join());
    const ok1 = S.people.every((p) => { const g = p.gosto; return Ge.COMIDA[g.comida] && Ge.COMIDA[g.enjoa] && g.comida !== g.enjoa && Ge.TRAB[g.trabalho] && Ge.TRAB[g.detesta] && g.trabalho !== g.detesta && g.estacao >= 0 && g.estacao <= 3; });
    check('cada um gosta de uma comida, de um trabalho e de uma estação, e não suporta outra comida e outro trabalho', ok1);
    // herança: muitos filhos dos mesmos pais puxam a comida de um deles bem mais que o acaso
    const [mae, pai] = S.people;
    mae.gosto = { comida: 'mandioca', enjoa: 'peixe', trabalho: 'roca', detesta: 'caca', estacao: 1 };
    pai.gosto = { comida: 'mandioca', enjoa: 'carne', trabalho: 'roca', detesta: 'pedra', estacao: 1 };
    let mesma = 0, mesmoTrab = 0;
    for (let k = 0; k < 200; k++) { const b = F.makeBaby(S, mae, pai, k % 2 ? 'M' : 'F', 'B' + k); b.id = 5000 + k; const g = Ge.gosto(S, b); if (g.comida === 'mandioca') mesma++; if (g.trabalho === 'roca') mesmoTrab++; }
    check('o filho puxa o gosto dos pais (bem mais que o acaso)', mesma >= 200 * 0.3 && mesmoTrab >= 200 * 0.3, mesma + ' de 200 com a comida dos pais, ' + mesmoTrab + ' com o trabalho');
    // o povo: elfo puxa a fruta
    let fruta = 0;
    for (let k = 0; k < 200; k++) { const q = Sim.makePerson(S, 'F', 'E' + k, 30); q.id = 8000 + k; q.povo = 'elfo'; if (Ge.gosto(S, q).comida === 'frutas') fruta++; }
    check('quem é de outro povo puxa o gosto do seu povo (o elfo, a fruta)', fruta >= 200 * 0.4, fruta + ' de 200');
  }
  // ===================== o trabalho de que gosta =====================
  {
    const S = village(42, 6), p = S.people[2];
    p.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'pesca', detesta: 'madeira', estacao: 0 };
    p.jeito = null; Ge.jeito(S, p);
    const mp = Ge.workMult(S, p, 'pesca'), mm = Ge.workMult(S, p, 'madeira'), mf = Ge.workMult(S, p, 'frutas');
    check('o trabalho de que gosta pontua mais; o que detesta, menos', mp > mf * 1.15 && mm < mf * 0.8, mp.toFixed(2) + ' / ' + mf.toFixed(2) + ' / ' + mm.toFixed(2));
    check('e rende 10% a mais', Ge.speedMult(S, p, 'pesca') === C.GOSTO_RENDE && Ge.speedMult(S, p, 'madeira') === 1);
    // na lista da IA: com as mesmas vontades, a pesca sobe para quem gosta
    S.vontades.pesca = 2; S.vontades.madeira = 2;
    setHour(S, 9);
    let sp = 0, sm = 0;
    for (let k = 0; k < 40; k++) { const l = AI.scoreList(S, p); sp += (l.find((c) => c.type === 'pesca') || { score: 0 }).score; sm += (l.find((c) => c.type === 'madeira') || { score: 0 }).score; }
    const q = S.people[3]; q.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'madeira', detesta: 'pesca', estacao: 0 }; q.jeito = null;
    let qp = 0, qm = 0;
    for (let k = 0; k < 40; k++) { const l = AI.scoreList(S, q); qp += (l.find((c) => c.type === 'pesca') || { score: 0 }).score; qm += (l.find((c) => c.type === 'madeira') || { score: 0 }).score; }
    check('na escolha da IA, quem gosta de pescar pesa a pesca acima da lenha; quem gosta de lenha, o contrário', sp / sm > qp / qm * 1.5, (sp / sm).toFixed(2) + ' contra ' + (qp / qm).toFixed(2));
  }
  // ===================== comer o que gosta =====================
  {
    const S = village(777, 4), p = S.people[2];
    p.gosto = { comida: 'frutas', enjoa: 'peixe', trabalho: 'pesca', detesta: 'pedra', estacao: 0 };
    Object.assign(S.stock, { peixe: 60, carne: 0, frutas: 40, defumado: 0, seca: 0 });
    for (const q of S.people) { q.needs.fome = 95; q.act = null; }
    p.needs.fome = 20; setHour(S, 12);
    const f0 = S.stock.frutas, x0 = S.stock.peixe;
    const a = AI.decideType(S, p, 'comer');
    for (let k = 0; k < 120 && p.act && p.act.type === 'comer'; k++) { Sim.step(S, 2); S.events.length = 0; }
    check('do estoque, come primeiro a comida de que gosta (a fruta, com peixe sobrando)', !!a && S.stock.frutas < f0 && p.mem.some((m) => m.k === 'comeuOQueGosta'), 'frutas ' + f0 + ' → ' + S.stock.frutas + ' · peixe ' + x0 + ' → ' + S.stock.peixe);
    const q = S.people[3];
    q.gosto = { comida: 'carne', enjoa: 'peixe', trabalho: 'pesca', detesta: 'pedra', estacao: 0 };
    Object.assign(S.stock, { peixe: 60, frutas: 0 });
    q.needs.fome = 20; q.act = null;
    AI.decideType(S, q, 'comer');
    for (let k = 0; k < 120 && q.act && q.act.type === 'comer'; k++) { Sim.step(S, 2); S.events.length = 0; }
    check('o que não desce, come do mesmo jeito (e fica a lembrança ruim)', q.needs.fome > 40 && q.mem.some((m) => m.k === 'comeuOQueNaoGosta'), 'fome ' + Math.round(q.needs.fome));
    // com o estoque curto, ninguém escolhe
    S.stock.frutas = 5; S.stock.peixe = 2;
    Sim.refresh(S);
    check('com pouca comida, ninguém escolhe o prato', Ge.pratoFav(S, p, true) === null, S.ctx.foodDays.toFixed(1) + ' dias');
  }
  // ===================== o jeito =====================
  {
    const S = village(42, 6), p = S.people[2], q = S.people[3];
    p.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'frutas', detesta: 'pedra', estacao: 0 }; p.jeito = null;
    q.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'frutas', detesta: 'pedra', estacao: 0 }; q.jeito = null;
    check('o jeito começa no gosto', Ge.jeito(S, p).frutas === C.JEITO_GOSTO && Ge.jeito(S, p).pedra === -C.JEITO_GOSTO);
    S.gente.med = {};
    Ge.onYield(S, q, 'pesca', 6, 1);   // a média da aldeia: 6 por hora
    const j0 = Ge.jeito(S, p).pesca || 0;
    for (let k = 0; k < 5; k++) Ge.onYield(S, p, 'pesca', 10, 1);   // rende bem acima
    const j1 = Ge.jeito(S, p).pesca;
    for (let k = 0; k < 5; k++) Ge.onYield(S, q, 'pesca', 2, 1);   // rende bem abaixo
    check('o trabalho que rende acima da média vira hábito; o que rende abaixo, perde a vez', j1 > j0 + 0.2 && (Ge.jeito(S, q).pesca || 0) < -0.1, j0 + ' → ' + j1 + ' · ' + Ge.jeito(S, q).pesca);
    p.act = { type: 'madeira', stage: 'work', t: 0 };
    const jm = Ge.jeito(S, p).madeira || 0;
    Sim.addMem(S, p, 'atacadoBicho');
    check('atacado no trabalho, a pessoa passa a evitar aquele trabalho', Ge.jeito(S, p).madeira <= jm - C.JEITO_MORDIDA + 1e-9, jm + ' → ' + Ge.jeito(S, p).madeira);
    p.act = null;
    // o exemplo de casa
    const mae = S.people[0], pai = S.people[1];
    mae.jeito = { caca: 0.8 }; pai.jeito = { caca: 0.6 };
    const filho = F.makeBaby(S, mae, pai, 'M', 'Filho'); S.people.push(filho);
    filho.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'pesca', detesta: 'pedra', estacao: 0 };
    check('o filho começa com metade do jeito dos pais (o exemplo)', Math.abs((Ge.jeito(S, filho).caca || 0) - 0.35) < 0.011, Ge.jeito(S, filho).caca);
    // um dia de verdade: quem traz o que colheu ensina o jeito pelo que rendeu
    const R = village(777, 6);
    R.vontades.frutas = 3;
    days(R, 2);
    check('na simulação, quem trabalha tem o jeito mexido pelo resultado (a média da aldeia aparece)', Object.keys(R.gente.med).length >= 2 && R.people.some((x) => x.jeito && Object.keys(x.jeito).some((k) => Math.abs(x.jeito[k]) > 0 && Math.abs(Math.abs(x.jeito[k]) - C.JEITO_GOSTO) > 1e-6)), JSON.stringify(R.gente.med));
  }
  // ===================== pensamentos =====================
  {
    const S = village(42, 8), p = S.people[2];
    p.gosto = { comida: 'abobora', enjoa: 'carne', trabalho: 'pesca', detesta: 'pedra', estacao: 0 };
    p.needs.fome = 10;
    let pz = Ge.pensa(S, p);
    check('com fome, pensa na fome (e na comida de que gosta)', pz.k === 'fome' && /abóbora/.test(pz.txt) && /Fome/.test(pz.why), pz.txt);
    p.needs.fome = 90;
    // o luto
    const par = S.people[3];
    F.link(S, p, par, 60);
    par.alive = false; par.diedAt = S.t; par.cause = 'velhice';
    pz = Ge.pensa(S, p);
    check('quem perdeu alguém pensa nele', pz.k === 'luto' && pz.txt.indexOf(par.name) >= 0, pz.txt);
    par.diedAt = S.t - 90 * DAYM;
    // o desejo de par: só adulto, e nunca alguém da família
    const jovem = add(S, 'F', 'Jovem', 17), adulto = add(S, 'M', 'Adulto', 25), irma = add(S, 'F', 'Irmã', 23);
    irma.mother = adulto.mother = 77777; irma.father = adulto.father = 77778;
    for (const q of [jovem, adulto, irma]) { q.needs = { fome: 90, sede: 90, energia: 90, calor: 90, social: 90, saude: 100 }; q.mem = []; q.mood = 60; q.fe = 60; }
    adulto.rel[irma.id] = 25; adulto.rel[jovem.id] = 20;
    pz = Ge.pensa(S, adulto);
    check('par: o adulto sem par pensa em ter alguém, sem nomear parente nem menor de idade', pz.k === 'par' && pz.txt.indexOf(irma.name) < 0 && pz.txt.indexOf(jovem.name) < 0, pz.txt);
    const outra = add(S, 'F', 'Moema', 24); outra.needs = { fome: 90, sede: 90, energia: 90, calor: 90, social: 90, saude: 100 };
    adulto.rel[outra.id] = 15;
    pz = Ge.pensa(S, adulto);
    check('e pode nomear quem gosta, adulta e sem parentesco', pz.k === 'par' && pz.txt.indexOf('Moema') >= 0, pz.txt);
    jovem.rel[adulto.id] = 30;
    check('quem tem menos de 18 não pensa em par', Ge.pensa(S, jovem).k !== 'par', Ge.pensa(S, jovem).txt);
    // a criança
    const kid = add(S, 'M', 'Curumim', 6); kid.needs = { fome: 90, sede: 90, energia: 90, calor: 90, social: 90, saude: 100 };
    check('a criança pensa como criança', Ge.pensa(S, kid).k === 'curioso', Ge.pensa(S, kid).txt);
    // o crime visto
    const autor = S.people[4], vit = S.people[5];
    S.soc.crimes.push({ id: 999, k: 'furto', g: 2, by: autor.id, vic: 0, t: S.t, wit: [adulto.id], known: true, st: 'aberto' });
    pz = Ge.pensa(S, adulto);
    check('quem viu um crime pensa em contar (o que viu e de quem)', pz.k === 'viuCrime' && pz.txt.indexOf(autor.name) >= 0 && /roubar/.test(pz.txt), pz.txt);
    S.soc.crimes.length = 0;
    check('todo mundo vivo tem um pensamento, com texto', alive(S).every((q) => { const z = Ge.pensa(S, q); return z && z.txt; }));
    check('bebê pensa em colo, leite e sono', Ge.pensa(S, F.makeBaby(S, S.people[0], S.people[1], 'F', 'Nenê')).k === 'bebe');
    // em voz alta, de vez em quando
    const V = village(777, 10);
    let falas = 0;
    days(V, 1, (s) => { for (const q of s.people) if (q.say && q.sayKind === 'pensa' && q.sayAt === s.t) falas++; });
    check('o que se pensa às vezes sai em voz alta (o balão de pensamento)', falas >= 3, falas + ' falas num dia, 10 pessoas');
  }
  // ===================== conversas =====================
  {
    const S = village(42, 10), a = S.people[2], b = S.people[3], c = S.people[4];
    const papo = (kind, tries) => { for (let k = 0; k < (tries || 300); k++) { const d = L.dialog(S, a, b); if (d && d.kind === kind) return d; } return null; };
    for (const q of S.people) { q.rel = {}; q.feud = {}; q.mem = []; q.needs = { fome: 90, sede: 90, energia: 90, calor: 90, social: 50, saude: 100 }; q.desc = 0; }
    a.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'frutas', detesta: 'pedra', estacao: 0 };
    b.gosto = { comida: 'peixe', enjoa: 'carne', trabalho: 'pesca', detesta: 'pedra', estacao: 0 };
    // contar o que viu
    S.soc.crimes.push({ id: 998, k: 'surra', g: 2, by: c.id, vic: S.people[5].id, t: S.t, wit: [a.id], known: true, st: 'aberto' });
    let d = papo('conta');
    check('quem viu conta o que viu', !!d && d.lines.length === 3 && d.lines[2].text.indexOf(c.name) >= 0, d ? d.lines.map((x) => x.text).join(' / ') : 'não contou');
    const r0 = b.rel[c.id] || 0;
    L.afterChat(S, a, b, d);
    check('e quem ouve passa a pensar pior de quem fez', (b.rel[c.id] || 0) < r0 && S.stats.conta === 1, r0 + ' → ' + b.rel[c.id]);
    S.soc.crimes.length = 0;
    // a fofoca
    c.x = a.x + 30; c.y = a.y;
    a.rel[c.id] = 20;
    d = papo('fofoca');
    const f0 = b.rel[c.id] || 0;
    if (d) L.afterChat(S, a, b, d);
    check('a fofoca: fala bem de quem gosta, e quem ouve passa a gostar mais', !!d && d.lines[0].text.indexOf(c.name) >= 0 && (b.rel[c.id] || 0) > f0, d ? d.lines[0].text + ' · ' + f0 + ' → ' + b.rel[c.id] : 'sem fofoca');
    a.rel[c.id] = -15;
    d = papo('fofoca');
    const f1 = b.rel[c.id];
    if (d) L.afterChat(S, a, b, d);
    check('e fala mal de quem não gosta, e a fama piora', !!d && (b.rel[c.id] || 0) < f1, d ? d.lines[0].text + ' · ' + f1 + ' → ' + b.rel[c.id] : 'sem fofoca');
    // a estima é a conta das conversas (sem teto): a fofoca puxa pouco por vez, e ninguém perde o que já tinha
    a.rel[c.id] = 200; b.rel[c.id] = 0;
    d = papo('fofoca');
    if (d) L.afterChat(S, a, b, d);
    check('a fofoca puxa pouco por vez (o grande amigo de quem fala não vira grande amigo de quem ouve)', !!d && b.rel[c.id] > 0 && b.rel[c.id] <= C.FOFOCA_MAX, d ? '0 → ' + b.rel[c.id] : 'sem fofoca');
    delete a.rel[c.id]; delete b.rel[c.id];
    // o gosto
    d = papo('gostoPapo');
    const g0 = a.rel[b.id] || 0;
    if (d) L.afterChat(S, a, b, d);
    check('o gosto em comum aproxima (os dois adoram peixe)', !!d && d.igual === 1 && (a.rel[b.id] || 0) > g0, d ? d.lines.map((x) => x.text).join(' / ') : 'sem conversa');
    a.rel[b.id] = 150; b.rel[a.id] = 150;
    d = papo('gostoPapo');
    if (d) L.afterChat(S, a, b, d);
    check('e quem já conversou muito não perde a estima numa conversa nova', !!d && a.rel[b.id] === 151 && b.rel[a.id] === 151, a.rel[b.id] + ' / ' + b.rel[a.id]);
    a.rel[b.id] = g0 + 1; b.rel[a.id] = 1;
    // o combinado
    b.gosto.trabalho = 'frutas';
    setHour(S, 15);
    d = papo('combina');
    if (d) L.afterChat(S, a, b, d);
    check('o combinado: os dois gostam de colher fruta e combinam ir juntos amanhã cedo', !!d && a.combina && b.combina && a.combina.com === b.id && a.combina.wk === 'frutas' && a.combina.de > S.t, d ? d.lines[0].text : 'sem combinado');
    const antes = Ge.workMult(S, a, 'frutas');
    setHour(S, 7);
    check('na manhã seguinte, a vontade daquele trabalho sobe para os dois', Ge.workMult(S, a, 'frutas') > antes * 1.25 && Ge.workMult(S, b, 'frutas') > Ge.workMult(S, b, 'pesca'), antes.toFixed(2) + ' → ' + Ge.workMult(S, a, 'frutas').toFixed(2));
    a.act = { type: 'frutas', stage: 'work', t: 0 }; b.act = { type: 'frutas', stage: 'work', t: 0 };
    Ge.hourly(S);
    Ge.hourly(S);
    check('e quando fazem juntos, ganham o dia', a.mem.some((m) => m.k === 'trabalhouJunto') && S.stats.combinaFeito === 1);
    a.act = b.act = null; delete a.combina; delete b.combina;
    // o desabafo
    a.mem.push({ k: 'dormiuRelento', until: S.t + DAYM });
    d = papo('desabafo');
    if (d) L.afterChat(S, a, b, d);
    check('o desabafo: conta o que pesa, e quem ouve acolhe', !!d && /casa/.test(d.lines[0].text) && a.mem.some((m) => m.k === 'desabafou'), d ? d.lines.map((x) => x.text).join(' / ') : 'sem desabafo');
    // ensinar uma técnica
    S.tech.known.machado = { t: S.t, by: a.name, how: 'pratica' };
    a.sabe = { machado: 1 }; b.sabe = {};
    d = papo('ensinoTec');
    if (d) L.afterChat(S, a, b, d);
    check('quem domina uma técnica ensina a quem ainda não domina', !!d && Ge.dom(S, b, 'machado') >= C.DOM_ENSINO - 1e-9, d ? d.lines[0].text + ' · ' + Ge.dom(S, b, 'machado') : 'sem ensino');
    // as conversas antigas continuam
    const kinds = new Set();
    for (let k = 0; k < 400; k++) { const x = L.dialog(S, a, b); if (x) kinds.add(x.kind); }
    check('as conversas de antes continuam acontecendo (o papo do dia a dia)', kinds.has('papo'), [...kinds].join(', '));
  }
  // ===================== tentativas =====================
  {
    const S = village(42, 6);
    const id = T.open(S) || I.openList(S)[0];
    const need = T.need(id);
    S.tech.prat[id] = need * 0.6;
    S.tech.who = { [S.people[2].id]: 10 };
    Ge.daily(S);
    const tentou = S.events.some((e) => e.k === 'toast' && /tentou/.test(e.text));
    check('com metade da prática, alguém tenta (e erra), e o erro ensina', tentou && S.gente.tent[id] === 1 && S.tech.prat[id] > need * 0.6 && S.people[2].mem.some((m) => m.k === 'tentou') && S.stats.tentativas === 1, id + ': ' + (S.events.find((e) => e.k === 'toast' && /tentou/.test(e.text)) || {}).text);
    S.events.length = 0;
    Ge.daily(S);
    check('a mesma tentativa não se repete no dia seguinte', S.stats.tentativas === 1);
    S.tech.prat[id] = need * 0.9;
    S.tech.who[S.people[4].id] = 20;
    Ge.daily(S);
    check('perto do fim, mais uma tentativa (de quem mais praticou agora)', S.stats.tentativas === 2 && S.gente.tent[id] === 2 && S.people[4].mem.some((m) => m.k === 'tentou'));
    if (I.DEF[id]) I.invent(S, id, S.people[3]); else T.discover(S, id, S.people[3]);
    const c = S.chron.slice().reverse().find((x) => x.disc === id);
    check('quando dá certo, a Crônica conta quem tentou antes', !!c && /Antes, .* e .* tentaram e não conseguiram\.$/.test(c.text) && c.text.indexOf(S.people[2].name) >= 0 && c.text.indexOf(S.people[4].name) >= 0, c ? c.text : 'sem crônica');
  }
  // ===================== o domínio das técnicas =====================
  {
    const S = village(777, 8), mestre = S.people[2], ap = S.people[3], so = S.people[4];
    S.tech.known.corda = { t: S.t, by: 'teste', how: 'pratica' };
    for (const q of S.people) q.sabe = {};
    I.invent(S, 'machado', mestre);
    check('quem descobre domina a técnica', Ge.dom(S, mestre, 'machado') === 1 && Ge.dom(S, ap, 'machado') === 0);
    for (const q of [mestre, ap, so]) q.tool = { dur: 100 };
    const v0 = T.speed(S, ap, 'madeira'), v1 = T.speed(S, mestre, 'madeira');
    check('sem domínio, o machado rende a metade do ganho; com domínio, inteiro', Math.abs(v0 - (C.TOOL_BONUS + (C.MACHADO_BONUS - C.TOOL_BONUS) * 0.5)) < 1e-9 && Math.abs(v1 - C.MACHADO_BONUS) < 1e-9, v0.toFixed(2) + ' / ' + v1.toFixed(2));
    // aprender vendo: o aprendiz corta lenha perto do mestre; o outro, longe e sozinho
    mestre.x = S.camp.x + 10.5; mestre.y = S.camp.y + 0.5; ap.x = mestre.x + 2; ap.y = mestre.y; so.x = S.camp.x - 30.5; so.y = S.camp.y - 30.5;
    for (const q of [mestre, ap, so]) { q.act = { type: 'madeira', stage: 'work', t: 0 }; q.px = q.x; q.py = q.y; }
    for (let h = 0; h < 5; h++) { S.t += 1; Ge.hourly(S); }
    check('quem trabalha perto de quem sabe aprende vendo; sozinho, aprende devagar', Ge.dom(S, ap, 'machado') > Ge.dom(S, so, 'machado') * 4 && Ge.dom(S, so, 'machado') > 0, Ge.dom(S, ap, 'machado') + ' / ' + Ge.dom(S, so, 'machado'));
    for (let h = 0; h < 20; h++) { S.t += 1; Ge.hourly(S); }
    check('e quando chega a dominar, a Crônica conta com quem aprendeu (a primeira vez)', Ge.dom(S, ap, 'machado') >= C.DOM_MESTRE && S.chron.some((x) => /aprendeu o jeito do machado com/.test(x.text)), Ge.dom(S, ap, 'machado'));
    for (const q of S.people) q.act = null;
    // o último que sabe morre: a Crônica conta, e o ganho volta à metade para quem fica
    const S2 = village(9001, 6), m2 = S2.people[2];
    S2.tech.known.corda = { t: S2.t, by: 'teste', how: 'pratica' };
    for (const q of S2.people) q.sabe = {};
    I.invent(S2, 'machado', m2);
    m2.needs.saude = -999; m2.dmg.velhice = 999;
    Sim.step(S2, 2);
    check('com o último que sabia, vai o jeito: a Crônica conta', !m2.alive && S2.chron.some((x) => /foi-se o jeito do machado/.test(x.text)) && S2.stats.perdeuTec === 1);
    // a rede, o anzol, o arco e os cestos também
    const q = S.people[5]; q.sabe = {}; q.tool = { dur: 100 };
    S.tech.known.anzol = S.tech.known.rede = S.tech.known.arco = { t: S.t, by: 'teste', how: 'pratica' };
    const f0 = T.fishMult(S, q); q.sabe = { anzol: 1, rede: 1 };
    const c0 = T.carryMult(S, { sabe: {} }), c1 = T.carryMult(S, { sabe: { cestos: 1 } });
    check('rede, anzol e cestos rendem pelo domínio de cada um', T.fishMult(S, q) > f0 * 1.2 && c1 > c0, f0.toFixed(2) + ' → ' + T.fishMult(S, q).toFixed(2) + ' · cestos ' + c0.toFixed(2) + ' → ' + c1.toFixed(2));
  }
  // ===================== save, save antigo, jogo fechado =====================
  {
    const S = village(42, 8);
    days(S, 2);
    const p = S.people[2];
    Ge.gosto(S, p); Ge.jeito(S, p); p.sabe = { machado: 0.5 }; p.combina = { wk: 'pesca', com: S.people[3].id, de: S.t + 100, ate: S.t + 500 };
    const S2 = clone(S), p2 = S2.people.find((x) => x.id === p.id);
    check('o save guarda os gostos, o jeito, o domínio, o combinado e a média da aldeia', JSON.stringify(p2.gosto) === JSON.stringify(p.gosto) && JSON.stringify(p2.jeito) === JSON.stringify(p.jeito) && p2.sabe.machado === 0.5 && p2.combina.wk === 'pesca' && JSON.stringify(S2.gente.med) === JSON.stringify(S.gente.med));
    // save de antes da 0.15
    const d = JSON.parse(JSON.stringify(Save.serialize(S)));
    delete d.gente;
    d.tech.known.machado = { t: 0, by: 'antigo', how: 'pratica' };
    for (const q of d.people) { delete q.gosto; delete q.jeito; delete q.sabe; delete q.combina; }
    const S3 = Save.deserialize(d);
    const adultos = S3.people.filter((q) => q.alive && F.age(S3, q) >= 12);
    check('save antigo: abre com a Gente viva, e quem já usava o machado não perde rendimento', !!S3.gente && adultos.every((q) => Ge.dom(S3, q, 'machado') >= C.DOM_VELHO) && S3.people.every((q) => !q.gosto));
    check('e os gostos nascem na primeira pergunta, iguais aos de quem nunca salvou', JSON.stringify(Ge.gosto(S3, S3.people[2])) === JSON.stringify(p.gosto));
    let erro = '';
    try { days(S3, 1); } catch (e) { erro = e.message; }
    check('o save antigo segue sem erro', !erro, erro);
    // o jogo fechado: dia resumido não conversa nem tenta; quem trabalha com uma técnica chega à metade
    const S4 = village(777, 8);
    S4.tech.known.corda = { t: S4.t, by: 'teste', how: 'pratica' };
    for (const q of S4.people) q.sabe = {};
    I.invent(S4, 'machado', S4.people[2]);
    S4.resumido = true; S4.safe = true;
    const t0 = S4.stats.tentativas;
    for (let k = 0; k < 10 * 720; k++) { Sim.step(S4, 2); S4.events.length = 0; }
    S4.resumido = false; S4.safe = false;
    check('com o jogo fechado, o saber chega devagar a quem fica (e ninguém tenta nada)', S4.people.filter((q) => q.alive && F.age(S4, q) >= 12).every((q) => Ge.dom(S4, q, 'machado') >= 0.5) && S4.stats.tentativas === t0);
  }
  // ===================== custo numa aldeia grande =====================
  {
    const mk = () => { const S = village(42, 60); for (let k = 0; k < 240; k++) add(S, k % 2 ? 'M' : 'F', 'P' + k, 14 + (k % 30)); build(S, 'fogueira', 6); for (let k = 0; k < 40; k++) build(S, 'barraca', 4); Object.assign(S.stock, { peixe: 3000, frutas: 2000, agua: 200, madeira: 800 }); Sim.refresh(S); return S; };
    const run = (S) => { for (let k = 0; k < 120; k++) { Sim.step(S, 2); S.events.length = 0; } const t = process.hrtime.bigint(); for (let k = 0; k < 360; k++) { Sim.step(S, 2); S.events.length = 0; } return Number(process.hrtime.bigint() - t) / 1e6 / 360; };
    // alternando (com, sem, com, sem) e ficando com o melhor de cada: o primeiro mundo paga o aquecimento do motor
    const Gg = G.Gente;
    let com = 1e9, sem = 1e9;
    for (let k = 0; k < 2; k++) { G.Gente = Gg; com = Math.min(com, run(mk())); G.Gente = null; sem = Math.min(sem, run(mk())); }
    G.Gente = Gg;
    check('com 300 pessoas, a Gente viva custa pouco (no máximo 25% a mais por passo)', com <= sem * 1.25 + 0.3, com.toFixed(2) + ' ms com, ' + sem.toFixed(2) + ' ms sem');
  }
  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['bem', 'largado'];
  const jobs = [];
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
  const order = { bem: 0, largado: 1 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com a Gente viva (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    const tot = { conta: 0, fofoca: 0, combina: 0, combinaFeito: 0, gostoPapo: 0, desabafo: 0, ensinoTec: 0, tentativas: 0, aprendeuTec: 0 };
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  trabalho: quem gosta faz ' + r.gostaLift + 'x a média · quem detesta, ' + r.detestaLift + 'x · conversas novas: contar ' + r.conta + ', fofoca ' + r.fofoca + ', combinado ' + r.combina + ' (feito ' + r.combinaFeito + '), gosto ' + r.gostoPapo + ', desabafo ' + r.desabafo + ', ensinar técnica ' + r.ensinoTec);
      console.log('  tentativas ' + r.tentativas + ' · descobertas ' + r.desc + ' (trilha ' + r.trilha + '/' + T.ORDER.length + ') · técnicas aprendidas ' + r.aprendeuTec + ' · perdidas ' + r.perdeuTec + ' · machado: ' + r.machado + ' · pensamentos ' + r.pensa + ' · fome ' + r.hungry + '% · frio ' + r.cold + '%');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      check(tag + 'quem gosta de um trabalho o faz mais que a média; quem detesta, menos', r.gostaLift > 1.1 && r.detestaLift < 0.9, r.gostaLift + 'x e ' + r.detestaLift + 'x');
      if (r.mode === 'bem') {
        check(tag + 'a trilha anda (pelo menos a pedra, os cestos, a lança e o anzol)', r.trilha >= 4, r.trilha + ' da trilha');
        check(tag + 'há tentativas antes das descobertas', r.tentativas >= 3, r.tentativas);
        if (r.machadoAnos >= 2) check(tag + 'o domínio do machado se espalha (70% de quem corta lenha, dois anos depois)', r.machadoPct >= 70, r.machado);
      }
      for (const k in tot) tot[k] += r[k] || 0;
    }
    check('em todos os mundos, cada conversa nova acontece (contar, fofoca, combinado, gosto, desabafo, ensinar técnica)', tot.conta > 0 && tot.fofoca > 0 && tot.combina > 0 && tot.gostoPapo > 0 && tot.desabafo > 0 && tot.ensinoTec > 0, JSON.stringify(tot));
    check('o combinado vira trabalho junto', tot.combinaFeito > 0, tot.combinaFeito);
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  if (workerData.semGente) G.Gente = null;   // para comparar com o jogo sem a Gente viva (só nas medições)
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// "bem": o robô de sempre (barracas, obras, Vontades por estação, roça e curral, atende as orações); "largado": só o
// fogo e a barraca do começo (o povo decide as obras sozinho)
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t, from, max) => { const at = spot(S, t, from, max); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [] };
  const cuida = mode !== 'largado';
  let hours = 0, hungry = 0, cold = 0, pensa = 0;
  // as horas de trabalho: de todos em cada trabalho, e de quem gosta (ou detesta) de cada um
  const hT = {}, hG = {}, hGt = {}, hD = {}, hDt = {};
  let hTot = 0;
  const cortou = new Map();   // quem cortou lenha no último ano (para o domínio do machado)
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0 && cuida) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S);
        const pend = () => S.buildings.some((b) => (!b.built && !b.site) || b.up);
        if (!pend() && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend() && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!pend() && T.buildOpen(S, t) && !has(t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (T.known(S, 'lanca')) S.vontades.caca = 3;
        const al = S.people.filter((p) => p.alive).length;
        if (K.known(S, 'roca')) { S.vontades.roca = 3; const rocas = S.buildings.filter((b) => b.type === 'roca').length; if (!pend() && rocas < (al >= 14 ? 3 : 2)) place('roca', 4); }
        if (K.known(S, 'criacao')) { S.vontades.criacao = 3; if (!pend() && !has('curral')) place('curral', 5); }
        const busy = S.buildings.filter((b) => !b.built || b.up).length;
        if (!busy && S.ctx.foodDays > 6) {
          if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
          else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
          else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
        }
        let q;
        while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer.find((id) => D.DONS[id].side === 'bom') || q.offer[0]); }
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        if (s % 15 === 0 && cuida) {
          for (const p of S.people) {
            if (!p.alive || !p.prayer) continue;
            const kind = God.PRAYER_HELP[p.prayer.kind];
            if (!kind || God.canCast(S, kind)) continue;
            const t = F.person(S, p.prayer.target) || p, c = t.carriedBy ? F.person(S, t.carriedBy) || t : t;
            if (kind === 'raio') {
              const fera = (S.narr ? S.narr.ents : []).filter((e) => (e.k === 'lobo' || e.k === 'onca') && !e.gone && !e.hidden).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
              if (fera) God.cast(S, 'raio', Math.floor(fera.x), Math.floor(fera.y));
              continue;
            }
            God.cast(S, kind, Math.floor(c.x), Math.floor(c.y));
          }
        }
        S.events.length = 0;
        if (s % 30 === 0) for (const p of S.people) {
          if (!p.alive || p.carriedBy) continue;
          hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++;
          const a = p.act;
          if (a && p.gosto && Ge.TRAB[a.type] && (a.stage === 'work' || a.stage === 'go' || a.stage === 'haul')) {
            hTot++; hT[a.type] = (hT[a.type] || 0) + 1;
            const g = p.gosto;
            hGt[g.trabalho] = (hGt[g.trabalho] || 0) + 1; if (a.type === g.trabalho) hG[g.trabalho] = (hG[g.trabalho] || 0) + 1;
            hDt[g.detesta] = (hDt[g.detesta] || 0) + 1; if (a.type === g.detesta) hD[g.detesta] = (hD[g.detesta] || 0) + 1;
            if (a.type === 'madeira' && a.stage === 'work') cortou.set(p.id, S.t);
          }
        }
        if (s === 360) for (const p of S.people) if (p.alive && Ge.pensa(S, p)) pensa++;
      }
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, al = S.people.filter((p) => p.alive);
  // o machado: de quem cortou lenha no último ano, quantos dominam pelo menos a metade
  const mk = S.tech.known.machado, recentes = [...cortou].filter(([id, t]) => S.t - t < Y).map(([id]) => F.person(S, id)).filter((q) => q && q.alive);
  const dominam = recentes.filter((q) => Ge.dom(S, q, 'machado') >= 0.5).length;
  Object.assign(out, {
    alive: al.length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    // quanto quem gosta de um trabalho o faz a mais que a média da aldeia (1 = igual), pesado pelas horas de quem gosta
    gostaLift: (() => { let num = 0, den = 0; for (const k in hGt) { if (!hT[k]) continue; const base = hT[k] / hTot; num += (hG[k] || 0) / base; den += hGt[k]; } return den ? +(num / den).toFixed(2) : 1; })(),
    detestaLift: (() => { let num = 0, den = 0; for (const k in hDt) { if (!hT[k]) continue; const base = hT[k] / hTot; num += (hD[k] || 0) / base; den += hDt[k]; } return den ? +(num / den).toFixed(2) : 1; })(),
    conta: st.conta || 0, fofoca: st.fofoca || 0, combina: st.combina || 0, combinaFeito: st.combinaFeito || 0, gostoPapo: st.gostoPapo || 0, desabafo: st.desabafo || 0, ensinoTec: st.ensinoTec || 0,
    tentativas: st.tentativas || 0, aprendeuTec: st.aprendeuTec || 0, perdeuTec: st.perdeuTec || 0,
    desc: Object.keys(S.tech.known).length, trilha: T.ORDER.filter((id) => S.tech.known[id]).length,
    machadoAnos: mk ? (S.t - mk.t) / Y : 0, machadoPct: recentes.length ? Math.round(dominam / recentes.length * 100) : 100,
    machado: mk ? 'no ano ' + (mk.t / Y).toFixed(1) + ', ' + dominam + ' de ' + recentes.length + ' que cortaram no último ano dominam' : 'não inventado',
    pensa, hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
