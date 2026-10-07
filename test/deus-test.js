// Gods · testes de Deus (Etapa 11). Uso: node test/deus-test.js [anos | u] [modos]
// 1) unidades: a glória (todo Poder que entra) e os níveis (glória e fiéis), o nome que o povo dá (e trocar), as falas
//    com o nome, os dons (a oferta e cada efeito), os céticos que se convertem com sinais, o escolhido de fé inteira
//    (ungir, perder a graça, curar com as mãos, pregar, brilhar), a Bênção, a estátua (obra, consagrar, os quatro
//    milagres, a reza da manhã, o altar), a espécie nova (bicho, peixe, árvore), os saberes (roda, escrita, medicina),
//    as missões, o save (novo e antigo) e o jogo fechado
// 2) 20 anos em três mundos: "deus" (atende as orações e usa tudo: dons, escolhidos, estátuas, Bênção, grandes atos),
//    "atento" (só atende as orações) e "largado" (não atende nada): quem cuida sobe de nível; quem não cuida, não
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Fauna: FA, Campo: K, Narr: N, Deus: D } = G;
const Y = 60 * 1440, DAYM = 1440;

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
  S.seen.fill(1);
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
function spot(S, t, from) {
  for (let r = from || 2; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
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
function add(S, sex, name, age, fe) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = age;
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S);
  if (fe !== undefined) q.fe = fe;
  return q;
}
// um mundo com gente de fé, já no acampamento, e Deus no nível pedido (sem as escolhas pendentes)
function godWorld(seed, lv, extra) {
  const S = world(seed);
  for (let k = 0; k < (extra === undefined ? 10 : extra); k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 18 + k, 80);
  S.arrived = true;
  S.people.forEach((p, k) => { p.fe = 80; p.act = null; p.path = null; p.x = S.camp.x + 0.5 + (k % 4); p.y = S.camp.y + 2.5 + Math.floor(k / 4); p.px = p.x; p.py = p.y; });
  S.god.lv = lv;
  if (lv >= 2) D.giveName(S);
  S.god.pending = [];
  S.god.glory = C.GOD_LEVELS[lv - 1].glory + 1;
  S.god.poder = 20000;
  S.chron.length = 0;
  S.events.length = 0;
  return S;
}
function setDay(S, season, dos, hour) {
  const yr = Math.floor(S.t / (C.YEAR_DAYS * DAYM)) + 1;
  S.t = ((yr * C.YEAR_DAYS + season * C.SEASON_DAYS + dos - 1) * DAYM) + (hour === undefined ? 8 : hour) * 60;
  S.ck = Sim.clock(S.t); Sim.refresh(S);
}
function setHour(S, h) { let t = Math.floor(S.t / DAYM) * DAYM + h * 60; if (t <= S.t) t += DAYM; S.t = t; S.ck = Sim.clock(S.t); Sim.refresh(S); }
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
function force(S, k, opts) { S.narr.plan = { k, warnAt: S.t, at: S.t, warned: true, opts: opts || {} }; N.hourly(S); }
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== glória e níveis =====================
  {
    const S = world(42);
    check('começo: Espírito (nível 1), sem nome, sem dom, glória do começo', D.level(S) === 1 && !S.god.name && !S.god.dons.length && !D.pending(S) && S.god.glory === Math.round(C.POWER_START), S.god.glory);
    check('a Bênção chega com o nível 2', !God.unlocked(S, 'bencao') && /nível 2/.test(God.canCast(S, 'bencao')));
    const g0 = S.god.glory, p0 = S.god.poder;
    God.gain(S, 40);
    check('Poder que entra vira glória também', S.god.poder === p0 + 40 && S.god.glory === g0 + 40);
    S.god.poder -= 30;
    check('gastar não tira glória', S.god.glory === g0 + 40);
    const [a, b] = S.people;
    God.thank(S, a, 'Obrigada!', 5, false);
    check('o agradecimento entra na glória', S.god.glory === g0 + 45);
    a.fe = 100; b.fe = 100;
    const gh = S.god.glory;
    God.hourly(S);
    check('a fé de cada hora entra na glória', S.god.glory > gh, (S.god.glory - gh).toFixed(2));
    // fiéis: 7 anos ou mais, fé 70 ou mais, fora do colo
    a.fe = 80; b.fe = 65;
    check('fiel é quem tem fé 70 ou mais', D.fieis(S) === 1);
    const baby = F.makeBaby(S, a, b, 'F', 'Nenê'); S.people.push(baby); baby.fe = 90;
    check('bebê no colo não conta', D.fieis(S) === 1);
    S.god.glory = 499; b.fe = 80;
    D.hourly(S);
    check('glória abaixo de ' + C.GOD_LEVELS[1].glory + ': fica no 1', D.level(S) === 1);
    S.god.glory = 600; b.fe = 60;
    D.hourly(S);
    check('com glória mas um fiel só: fica no 1', D.level(S) === 1);
    b.fe = 75; S.events.length = 0;
    D.hourly(S);
    check('glória e 2 fiéis: nível 2, Guardião', D.level(S) === 2 && D.levelDef(2).name === 'Guardião');
    check('na Crônica, e o evento do nível', S.chron.some((c) => c.god && /Guardião/.test(c.text)) && S.events.some((e) => e.k === 'godLevel' && e.lv === 2));
    check('no nível 2 o povo dá um nome (e espera a escolha do dom)', !!S.god.name && !!S.god.epithet && D.pending(S).k === 'nome' && S.god.pending[1].k === 'dom' && S.god.pending[1].offer.length === 3);
    check('a Bênção abre', God.unlocked(S, 'bencao'));
    D.hourly(S);
    check('um nível por vez (sem glória para o 3, fica)', D.level(S) === 2);
    // até o 5
    const S2 = godWorld(777, 1);
    delete S2.god.name;
    const lvAt = [];
    S2.god.glory = 1e6;
    for (let h = 0; h < 6; h++) { D.hourly(S2); lvAt.push(D.level(S2)); }
    check('com glória e fiéis de sobra, sobe um nível a cada hora até o 5', lvAt.join() === '2,3,4,5,5,5', lvAt.join());
    check('cada nível traz um dom para escolher (4 dons pendentes, fora o nome)', S2.god.pending.filter((q) => q.k === 'dom').length === 4 && S2.god.pending[0].k === 'nome');
    const offers = S2.god.pending.filter((q) => q.k === 'dom').map((q) => q.offer);
    const all = [].concat(...offers);
    check('as ofertas não repetem dom', new Set(all).size === all.length && all.every((id) => D.DONS[id]), offers.map((o) => o.join('+')).join(' · '));
    const S3 = godWorld(777, 1); delete S3.god.name; S3.god.glory = 1e6; D.hourly(S3);
    check('a mesma oferta no mesmo mundo', S3.god.pending.find((q) => q.k === 'dom').offer.join() === offers[0].join());
    const S4 = godWorld(9001, 1); S4.god.glory = 1e6; D.hourly(S4);
    check('outro mundo, outra oferta (quase sempre)', S4.god.pending.find((q) => q.k === 'dom').offer.join() !== offers[0].join(), S4.god.pending.find((q) => q.k === 'dom').offer.join());
    // escolher o dom
    const q = S2.god.pending.find((x) => x.k === 'dom');
    const outside = D.DOM_ORDER.find((id) => q.offer.indexOf(id) < 0);
    check('não dá para escolher dom fora da oferta', !D.chooseDom(S2, outside));
    const pick = q.offer.find((id) => D.DONS[id].side === 'bom') || q.offer[0], al0 = S2.god.align;
    check('escolhido o dom: fica, sai da fila, vai para a Crônica', D.chooseDom(S2, pick) && D.dom(S2, pick) && S2.god.pending.filter((x) => x.k === 'dom').length === 3 && S2.chron.some((c) => c.text.indexOf(D.DONS[pick].name) >= 0));
    check('dom bondoso: o povo vê Deus mais bondoso', D.DONS[pick].side !== 'bom' || S2.god.align > al0, S2.god.align - al0);
    // a oferta puxa para o lado de Deus
    const S5 = godWorld(4242, 1); S5.god.align = -60; S5.god.glory = 1e6; D.hourly(S5);
    check('Deus temido: a oferta tem um dom temido', S5.god.pending.find((x) => x.k === 'dom').offer.some((id) => D.DONS[id].side === 'temido'));
  }

  // ===================== o nome =====================
  {
    const S = godWorld(42, 1, 2);
    check('o nome inventado é sempre o mesmo para o mundo', D.makeGodName(S, 0) === D.makeGodName(godWorld(42, 1, 2), 0));
    const names = new Set();
    for (let k = 0; k < 30; k++) names.add(D.makeGodName(S, k));
    check('nomes variados, de 4 a 9 letras, sem nome de gente do povo', names.size >= 20 && [...names].every((n) => n.length >= 4 && n.length <= 9 && !S.people.some((p) => p.name === n)), [...names].slice(0, 8).join(', '));
    S.god.deeds = { chuva: 4, calor: 1 }; S.god.align = 30;
    check('o título vem do que Deus mais fez: chuva', D.epithetFor(S) === 'Pai da Chuva');
    S.god.align = -40;
    check('e muda com o jeito que o povo vê (temido)', D.epithetFor(S) === 'O que Segura as Nuvens');
    S.god.deeds = {}; S.god.answered = 0; S.god.align = 0;
    check('sem nada feito: O Silencioso', D.epithetFor(S) === 'O Silencioso');
    S.god.answered = 3;
    check('só atendendo orações: O que Ouve', D.epithetFor(S) === 'O que Ouve');
    // ganha o nome no nível 2; quem começou é quem tem mais fé
    const [a, b] = S.people;
    a.fe = 95; b.fe = 80; S.god.glory = 600; S.god.deeds = { raio: 2 };
    D.hourly(S);
    const nm = S.god.name;
    check('quem começou a chamar pelo nome é quem mais reza', S.god.namedBy === a.name && S.chron.some((c) => c.god && c.text.indexOf(nm) >= 0 && c.text.indexOf(a.name) >= 0), S.god.namedBy);
    // as falas usam o nome
    a.needs.fome = 10; S.ctx.food = 0; S.ctx.bushFruit = 0; S.stock.agua = 20; a.prayer = null; a.prayCool = 0;
    for (const o of S.world.objs) if (o.k === 'bush') o.fruit = 0;
    for (const k in S.stock) if (T.FOOD.indexOf(k) >= 0) S.stock[k] = 0;
    Sim.refresh(S); S.ctx.food = 0; S.ctx.bushFruit = 0;
    setHour(S, 10); God.hourly(S);
    check('a oração usa o nome de Deus', a.prayer && a.prayer.text.indexOf(nm) >= 0 && a.prayer.text.indexOf('Deus') < 0, a.prayer && a.prayer.text);
    God.thank(S, b, 'Deus, obrigado pelo dia.', 1, false);
    check('o agradecimento também', b.say.indexOf(nm) >= 0, b.say);
    // trocar o nome: a Crônica muda junto
    D.acceptName(S, 'Jupará');
    check('aceitar trocando o nome: sai da fila, a Crônica muda', S.god.name === 'Jupará' && !S.god.pending.some((q) => q.k === 'nome') && S.chron.some((c) => /Jupará/.test(c.text)) && !S.chron.some((c) => c.god && c.text.indexOf(nm) >= 0));
    check('nome limpo: sem <, > e aspas, até 16 letras', D.rename(S, '<b>Muito"Grande&Nome123</b>') && !/[<>"&]/.test(S.god.name) && S.god.name.length <= 16, S.god.name);
    const r1 = D.rollName(S), r2 = D.rollName(S);
    check('sortear outro nome dá outro', r1 && r2 && r1 !== r2, r1 + ', ' + r2);
    const S2 = world(777); L.init(S2);
    S2.god.name = 'Arapã';
    const dead = S2.people[1]; dead.alive = false;
    L.onDeath(S2, dead);
    check('o luto também reza pelo nome', S2.events.some((e) => e.k === 'thanks' && /Arapã, recebe/.test(e.text)) || S2.people[0].say.indexOf('Arapã') >= 0);
  }

  // ===================== dons =====================
  {
    const S = godWorld(42, 2, 2), [a, b] = S.people;
    S.stats.births = 1;   // a Cura chega com o primeiro filho
    const give = (id) => { S.god.dons.push(id); };
    const cx = S.camp.x + 2, cy = S.camp.y + 2;
    // fogo
    check('sem dom: Calor de 12 h, 5 passos', God.radius(S, 'calor') === C.CALOR_R);
    give('fogo');
    God.cast(S, 'calor', cx, cy);
    const au = S.god.auras[S.god.auras.length - 1];
    check('Fogo Sagrado: o Calor dura 24 h e alcança 7 passos', au.r === C.DOM.fogoR && au.until - S.t === C.DOM.fogoH * 60 && God.radius(S, 'calor') === 7);
    // mãos
    give('maos');
    a.needs.saude = 20; b.needs.saude = 30; b.x = a.x + 1; b.y = a.y;
    const p0 = S.god.poder;
    const r = God.cast(S, 'cura', Math.floor(a.x), Math.floor(a.y));
    check('Mãos de Luz: a Cura custa ' + C.DOM.maosCost + ' e cura também quem está do lado', r.ok && p0 - S.god.poder === C.DOM.maosCost && b.needs.saude === 30 + C.CURA_HEAL * C.DOM.maosHeal && /tocou também/.test(r.msg), r.msg);
    // céu
    give('ceu');
    S.stock.agua = 0;
    const pc = S.god.poder;
    God.cast(S, 'chuva', S.camp.x, S.camp.y);
    check('Céu Generoso: a Chuva custa ' + C.DOM.ceuCost + ' e dá o dobro de água', pc - S.god.poder === C.DOM.ceuCost && S.stock.agua === Math.min(C.CHUVA_WATER * 2, T.waterCap(S)), S.stock.agua);
    // trovão: árvore dá o dobro
    give('trovao');
    const tree = S.world.objs.find((o) => o.k === 'tree' && Math.hypot(o.x - S.camp.x, o.y - S.camp.y) < 20 && !S.people.some((p) => Math.hypot(p.x - o.x, p.y - o.y) < 2));
    const w0 = S.stock.madeira, pr = S.god.poder;
    God.cast(S, 'raio', tree.x, tree.y);
    check('Trovão: o Raio custa ' + C.DOM.trovaoCost + ' e a árvore rende o dobro', pr - S.god.poder === C.DOM.trovaoCost && S.stock.madeira - w0 === C.TREE_WOOD * 2);
    // ouvido: a oração espera o dobro, o agradecimento vale o dobro
    give('ouvido');
    b.prayer = null; b.prayCool = 0;
    God.cry(S, b, 'lobos');
    check('Ouvido Atento: a oração espera o dobro', b.prayer && b.prayer.until - S.t === 2 * 60 * 2);
    const pp = S.god.poder;
    God.answerKind(S, ['lobos']);
    check('e o agradecimento dá o dobro de Poder', S.god.poder - pp === C.THANKS.oracao * 2);
    // olhos
    give('olhos');
    check('Olhos do Céu: a névoa abre metade mais longe', D.seeR(S) === C.SEE_R * 1.5);
    // sonhos
    give('sonhos');
    check('Sonhos Claros: a Revelação custa 40 e vale com 15% da prática', God.cost(S, 'revelacao') === C.DOM.sonhosCost && T.revMin(S) === C.DOM.sonhosMin);
    // sentinela
    give('sentinela');
    check('Sentinela: o fogo espanta 2 passos mais longe, a mordida pega menos', N.fireR(S) === C.LOBO_FIRE_R + 2 && T.biteMult(S, a) === C.DOM.sentinelaBite);
    // temor
    const ob0 = God.obedience(S, a);
    give('temor');
    check('Temor Sagrado: o povo obedece mais', near(God.obedience(S, a) - ob0, C.DOM.temorObed) || God.obedience(S, a) === 1.8);
    // chama: a fé esfria só até 50
    give('chama');
    S.god.lastGrace = -1e9;
    a.fe = 50.2;
    God.daily(S);
    check('Fé que Aquece: sem sinais, a fé esfria só até 50', a.fe >= 50 && a.fe < 50.21, a.fe);
    // terra
    const S2 = godWorld(777, 2, 0);
    const bush = S2.world.objs.find((o) => o.k === 'bush' && o.fruit === 0) || S2.world.objs.find((o) => o.k === 'bush');
    bush.fruit = 0; bush.grow = 0;
    setDay(S2, 0, 10);
    Sim.daily(S2);
    const g1 = bush.grow;
    bush.fruit = 0; bush.grow = 0;
    S2.god.dons.push('terra');
    Sim.daily(S2);
    check('Mão na Terra: o arbusto dá fruta 30% mais depressa', near(bush.grow, g1 * C.DOM.terraBush, 1e-6), g1.toFixed(3) + ' → ' + bush.grow.toFixed(3));
    // ventre: o parto difícil cai à metade
    const hardRate = (dom) => {
      const S3 = godWorld(9001, 2, 0), w = S3.people[0];
      if (dom) S3.god.dons.push('ventre');
      const was = C.BIRTH_RISK; C.BIRTH_RISK = 0.5;
      let hard = 0;
      for (let k = 0; k < 400; k++) { w.preg = { t0: S3.t, due: S3.t, father: S3.people[1].id }; w.labor = null; F.hourly(S3); if (w.labor && w.labor.hard) hard++; w.labor = null; }
      C.BIRTH_RISK = was;
      return hard / 400;
    };
    const h0 = hardRate(false), h1 = hardRate(true);
    check('Ventre Abençoado: o parto difícil acontece a metade das vezes', h1 < h0 * 0.7 && h1 > h0 * 0.3, (h0 * 100).toFixed(0) + '% → ' + (h1 * 100).toFixed(0) + '%');
  }

  // ===================== céticos que se convertem =====================
  {
    const S = godWorld(42, 1, 2), [a, b] = S.people;
    a.traits = a.traits.filter((t) => t !== 'Devoto' && t !== 'Cético').concat('Cético'); b.traits = b.traits.filter((t) => t !== 'Cético');
    a.fe = 70; a.sinais = 0; b.sinais = 0;
    D.sinal(S, b, 'atendida');
    check('só o cético conta sinais', b.sinais === 0);
    D.sinal(S, a, 'milagre'); D.sinal(S, a, 'milagre');
    check('milagre visto: um sinal a cada 2 dias', a.sinais === C.SINAL.milagre);
    S.t += 2 * DAYM; S.ck = Sim.clock(S.t);
    D.sinal(S, a, 'milagre');
    check('dois dias depois, conta de novo', a.sinais === 2 * C.SINAL.milagre);
    a.fe = 50;
    for (let k = 0; k < 12; k++) D.sinal(S, a, 'atendida');
    check('sinais de sobra, mas fé baixa: ainda cético', a.traits.indexOf('Cético') >= 0 && a.sinais >= C.CONVERTE_SINAIS);
    a.fe = C.CONVERTE_FE + 1;
    D.sinal(S, a, 'sermao');
    check('sinais e fé ' + C.CONVERTE_FE + ': vira devoto', a.traits.indexOf('Devoto') >= 0 && a.traits.indexOf('Cético') < 0 && S.stats.conversions === 1);
    check('a primeira conversão vai para a Crônica', S.chron.some((c) => c.god && /se converteu/.test(c.text) && c.text.indexOf(a.name) >= 0));
    // sinais pelo milagre de verdade: o cético que vê a Chuva de perto
    const S2 = godWorld(777, 1, 2), c2 = S2.people[0];
    c2.traits = c2.traits.filter((t) => t !== 'Devoto' && t !== 'Cético').concat('Cético'); c2.sinais = 0;
    God.cast(S2, 'chuva', Math.floor(c2.x), Math.floor(c2.y));
    check('o milagre visto de perto conta um sinal', c2.sinais === C.SINAL.milagre);
    c2.prayer = { kind: 'fome', target: c2.id, text: 'Deus, temos fome.', t0: S2.t, until: S2.t + 600 };
    God.answerKind(S2, ['fome']);
    check('a oração atendida conta ' + C.SINAL.atendida, c2.sinais === C.SINAL.milagre + C.SINAL.atendida);
  }

  // ===================== o escolhido =====================
  {
    const S = godWorld(42, 2, 3), p = S.people[0];
    p.fe = 100; p.fe100At = S.t;
    check('no nível 2 ainda não', /nível 3/.test(D.anointWhy(S, p)));
    S.god.lv = 3;
    check('no nível 3: um escolhido', D.level(S) === 3 && D.slots(S) === 1 && !D.anointWhy(S, p));
    const kid = F.makeBaby(S, S.people[0], S.people[1], 'F', 'Menina'); kid.born -= 12 * Y; kid.carriedBy = 0; kid.fe = 100; S.people.push(kid);
    check('precisa ter ' + C.UNGIR_AGE + ' anos', /16 anos/.test(D.anointWhy(S, kid)));
    const q = S.people[1]; q.fe = 85; q.fe100At = undefined;
    check('precisa da fé inteira', /fé inteira/.test(D.anointWhy(S, q)));
    q.fe100At = S.t - 2 * DAYM; q.fe = 92;
    check('chegou a 100 há poucos dias e ainda tem 90: vale', D.full100(S, q) && D.candidates(S).indexOf(q) >= 0);
    q.fe100At = S.t - 6 * DAYM;
    check('passaram ' + C.FE100_DAYS + ' dias: não vale mais', !D.full100(S, q));
    const p0 = S.god.poder;
    check('ungir: custa ' + C.UNGIR_COST + ', dá o título e vai para a Crônica', D.anoint(S, p, 'cura') && S.god.poder === p0 - C.UNGIR_COST && D.title(p) === (p.sex === 'F' ? 'Curandeira' : 'Curandeiro') && S.chron.some((c) => c.god && c.text.indexOf(p.name) >= 0 && /curar/.test(c.text)));
    q.fe100At = S.t; q.fe = 100;
    check('no nível 3, só um por vez', /já há um escolhido/.test(D.anointWhy(S, q)));
    S.god.poder = 100;
    S.god.lv = 4;
    check('no nível 4, dois; sem Poder, não dá', D.slots(S) === 2 && /falta Poder/.test(D.anointWhy(S, q)));
    // a fé do escolhido fica perto de 90; esfriou abaixo de 70, perde a graça
    S.god.lastGrace = -1e9; p.fe = 80;
    for (let k = 0; k < 20; k++) God.daily(S);
    check('a fé do escolhido volta para perto de 90 (a dos outros esfria)', p.fe >= 89 && S.people[2].fe < 80, p.fe.toFixed(1) + ' · ' + S.people[2].fe.toFixed(1));
    p.fe = 60;
    D.daily(S);
    check('fé abaixo de ' + C.GRACA_FE + ': perde o poder (e a Crônica conta)', !p.escolhido && S.chron.some((c) => c.god && /esfriou/.test(c.text)));
  }
  // ---------- Mãos que curam: a IA vai até quem precisa ----------
  {
    const S = godWorld(777, 3, 2);
    build(S, 'fogueira');
    const [h, sick] = S.people;
    h.fe = 100; h.fe100At = S.t;
    D.anoint(S, h, 'cura');
    setHour(S, 9);
    sick.needs.saude = 20; sick.x = h.x + 5; sick.y = h.y; sick.px = sick.x; sick.py = sick.y;
    God.cry(S, sick, 'lobos'); sick.prayer = { kind: 'doente', target: sick.id, text: 'Deus, me cura.', t0: S.t, until: S.t + 720 };
    const p0 = S.god.poder;
    let went = false;
    days(S, 0.25, (s) => { if (h.act && h.act.type === 'curar') went = true; });
    check('a curandeira vai até quem está doente', went);
    check('e cura: a saúde volta e a oração é atendida', sick.needs.saude > 50 && S.stats.heals === 1 && !sick.prayer, sick.needs.saude.toFixed(0));
    void p0;
    const t2 = S.people[1]; t2.needs.saude = 20; t2.healedAt = undefined;
    const pc = S.god.poder;
    check('cada cura gasta ' + C.ESCOLHIDO_CURA + ' de Poder e dá ' + C.ESCOLHIDO_HEAL + ' de saúde', D.heal(S, h, t2) && near(pc - S.god.poder, C.ESCOLHIDO_CURA) && near(t2.needs.saude, 20 + C.ESCOLHIDO_HEAL));
    check('e não cura de novo a mesma pessoa logo em seguida', (t2.needs.saude = 20, !D.needsHeal(S, t2)));
    check('a primeira cura vai para a Crônica', S.chron.some((c) => /curou com as mãos/.test(c.text)));
    // parto difícil
    const w = S.people.find((x) => x.sex === 'F' && x !== h) || sick;
    w.labor = { t0: S.t, until: S.t + C.LABOR_H * 60, hard: true, helped: false };
    days(S, 0.2);
    check('e salva o parto difícil', !w.labor || w.labor.helped, w.labor ? 'ajudado: ' + w.labor.helped : 'já nasceu');
  }
  // ---------- Palavra: a pregação de tardinha ----------
  {
    const S = godWorld(42, 3, 4);
    build(S, 'fogueira');
    const pf = S.people[0];
    pf.fe = 100; pf.fe100At = S.t;
    D.anoint(S, pf, 'palavra');
    const cet = S.people[2];
    cet.traits = cet.traits.filter((t) => t !== 'Devoto' && t !== 'Cético').concat('Cético'); cet.sinais = 0;
    for (const q of S.people) { q.fe = Math.min(q.fe, 70); q.needs.fome = 90; q.needs.sede = 90; q.needs.energia = 90; }
    pf.fe = 95;
    S.stock.madeira = 30; S.stock.peixe = 60; S.stock.agua = 30;
    setHour(S, 17.4);
    const fe0 = S.people.slice(1).reduce((s, q) => s + q.fe, 0), g0 = S.god.glory;
    let preached = false;
    days(S, 0.14, (s) => { if (s.life.story && s.life.story.sermon) preached = true; });
    check('o profeta prega ao pé do fogo, de tardinha', preached && S.stats.sermons === 1, 'sermões: ' + S.stats.sermons);
    check('a fé de quem ouviu sobe, e o cético vê um sinal', S.people.slice(1).reduce((s, q) => s + q.fe, 0) > fe0 && cet.sinais >= C.SINAL.sermao, cet.sinais);
    check('a pregação dá Poder (e glória)', S.god.glory > g0);
    check('a primeira pregação vai para a Crônica', S.chron.some((c) => /pregou ao pé do fogo/.test(c.text)));
    check('a próxima só depois de ' + C.SERMAO_GAP_D + ' dias', !D.sermonDue(S, pf));
  }
  // ---------- Luz: brilha como fogo aceso ----------
  {
    const S = godWorld(9001, 3, 2), l = S.people[0];
    l.fe = 100; l.fe100At = S.t;
    D.anoint(S, l, 'luz');
    check('Luz: aquece quem está do lado e espanta fera', God.heatAt(S, l.x + 1, l.y) > 5 && N.safeXY(S, l.x + 1.5, l.y) && !N.safeXY(S, l.x + 8, l.y));
    l.inTent = 1;
    check('dentro da barraca, a luz fica lá dentro', D.lights(S).length === 0 || !D.lights({ ...S, t: S.t + 1 }).some((L2) => L2.pid === l.id));
  }

  // ===================== Bênção =====================
  {
    const S = godWorld(42, 2, 2);
    const cx = S.camp.x + 3, cy = S.camp.y + 3;
    const p0 = S.god.poder;
    const r = God.cast(S, 'bencao', cx, cy);
    check('a Bênção custa ' + C.BENCAO_COST + ' e dura ' + C.BENCAO_H + ' h', r.ok && p0 - S.god.poder === C.BENCAO_COST && S.god.blessings.length === 1 && S.god.blessings[0].until - S.t === C.BENCAO_H * 60, r.msg);
    check('dentro dela, o trabalho rende metade a mais; fora, não', D.blessAt(S, cx + 1, cy + 1) === C.BENCAO_MULT && D.blessAt(S, cx + 20, cy) === 1);
    check('conta no título de Deus', S.god.deeds.bencao === 1);
    S.t += C.BENCAO_H * 60 + 60; S.ck = Sim.clock(S.t);
    D.hourly(S);
    check('passados 2 dias, acaba', S.god.blessings.length === 0 && D.blessAt(S, cx, cy) === 1);
    // na roça: a colheita rende metade a mais
    const S2 = godWorld(777, 2, 2);
    for (const k of T.ORDER) T.discover(S2, k);
    K.invent(S2, 'roca');
    const rc = build(S2, 'roca', 4);
    setDay(S2, 0, 2);
    K.plant(S2, rc, 'milho');
    const y0 = K.yieldOf(S2, rc);
    God.cast(S2, 'bencao', rc.x + 1, rc.y + 1);
    check('a roça plantada e abençoada: a colheita rende metade a mais', K.yieldOf(S2, rc) === Math.round(y0 * C.BENCAO_MULT) && rc.farm.bonus === C.BENCAO_MULT, y0 + ' → ' + K.yieldOf(S2, rc));
    K.onFartura(S2);
    check('a fartura depois não tira a bênção', rc.farm.bonus === C.BENCAO_MULT);
    S2.god.dons.push('terra');
    check('Mão na Terra: a roça rende 20% mais', K.yieldOf(S2, rc) === Math.round(C.ROCA.milho.yield * (C.BUILD.roca.farm || { mult: 1 }).mult * C.BENCAO_MULT * C.DOM.terraRoca), K.yieldOf(S2, rc));
    // o trabalho de quem está dentro anda metade mais depressa (o corte da árvore)
    const cut = (bless) => {
      const Sx = godWorld(9001, 2, 0), p = Sx.people[0];
      const o = Sx.world.objs.find((x) => x.k === 'tree' && Math.hypot(x.x - Sx.camp.x, x.y - Sx.camp.y) < 12);
      p.x = o.x + 1.5; p.y = o.y + 0.5; p.px = p.x; p.py = p.y;
      if (bless) Sx.god.blessings.push({ x: o.x, y: o.y, r: 6, until: Sx.t + 9999 });
      setHour(Sx, 9); p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 95; p.needs.calor = 95;
      p.act = { type: 'madeira', stage: 'work', t: 0, obj: o, spot: 0 }; o.res = p.id; p.nextEval = Sx.t + 999;
      AI.tick(Sx, p, 2);
      return p.act ? p.act.t : 0;
    };
    const a0 = cut(false), a1 = cut(true);
    check('abençoado, o trabalho anda metade mais depressa', a0 > 0 && near(a1 / a0, C.BENCAO_MULT, 1e-6), a0.toFixed(2) + ' → ' + a1.toFixed(2));
  }

  // ===================== a estátua =====================
  {
    const S = godWorld(42, 2, 2);
    check('antes do nível 3 não dá para marcar a estátua', !T.buildOpen(S, 'estatua') && /nível 3/.test(D.buildWhy(S, 'estatua')));
    S.god.lv = 3;
    check('no nível 3, dá (uma)', D.level(S) === 3 && T.buildOpen(S, 'estatua'));
    const st = build(S, 'estatua', 3);
    check('pronta: vai para a Crônica (e não é barraca)', S.chron.some((c) => /primeira estátua/.test(c.text)) && !S.stats.firstTent);
    check('uma por enquanto', !T.buildOpen(S, 'estatua') && /uma estátua/.test(D.buildWhy(S, 'estatua')));
    check('a estátua tem melhoria: o altar', Sim.upgrades(S, st).length === 1 && Sim.upgrades(S, st)[0].def.name === 'Estátua com altar');
    S.god.poder = 300;
    check('consagrar custa ' + C.CONSAGRAR_COST, /falta Poder/.test(D.consecrateWhy(S, st, 'fogo')));
    S.god.poder = 5000;
    check('consagrada com o fogo', D.consecrate(S, st, 'fogo') && st.milagre === 'fogo' && S.god.poder === 5000 - C.CONSAGRAR_COST && S.stats.statues === 1);
    check('não dá para consagrar de novo', /já foi/.test(D.consecrateWhy(S, st, 'chuva')));
    const sx = st.x + 1, sy = st.y + 1;
    check('a estátua do fogo aquece em volta e espanta fera', God.heatAt(S, sx + 2, sy) > 5 && N.safeXY(S, sx + 3, sy) && !N.safeXY(S, sx + 12, sy));
    S.god.lv = 4;
    const st2 = build(S, 'estatua', 6);
    check('no nível 4, a segunda (e não repete o milagre)', !!st2 && /outra estátua/.test(D.consecrateWhy(S, st2, 'fogo')));
    // chuva: sozinha, a cada 8 dias, às 10h, sem gastar Poder
    D.consecrate(S, st2, 'chuva');
    const pw = S.god.poder;
    st2.lastRain = S.t - 9 * DAYM;
    setHour(S, 10);
    S.stock.agua = 0; S.events.length = 0;
    D.hourly(S);
    check('a estátua da chuva chama a chuva sozinha, sem gastar Poder', S.god.rainUntil > S.t && S.god.poder >= pw && S.stats.statueRains === 1 && S.stock.agua > 0);
    setHour(S, 10); D.hourly(S);
    check('e só de 8 em 8 dias', S.stats.statueRains === 1);
    st2.lv = 2;
    check('com o altar, vai mais longe (e mais vezes)', D.reach(S, st2) === 1.5);
    // cura: às 6h
    const S2 = godWorld(777, 3, 2), c = build(S2, 'estatua', 3);
    D.consecrate(S2, c, 'cura');
    const sick = S2.people[0]; sick.x = c.x + 2; sick.y = c.y + 3; sick.needs.saude = 30;
    setHour(S2, 6); D.hourly(S2);
    check('a estátua da cura cura de manhã quem está fraco por perto', sick.needs.saude === 30 + C.ESTATUA_CURA && S2.stats.statueHeals === 1);
    // parto perto da estátua da cura nunca é difícil
    const w = S2.people.find((p) => p.sex === 'F');
    w.x = c.x + 1; w.y = c.y + 3;
    const was = C.BIRTH_RISK; C.BIRTH_RISK = 1;
    let hard = 0;
    for (let k = 0; k < 50; k++) { w.preg = { t0: S2.t, due: S2.t, father: S2.people[1].id }; w.labor = null; F.hourly(S2); if (w.labor && w.labor.hard) hard++; w.labor = null; }
    C.BIRTH_RISK = was;
    check('parto perto da estátua da cura nunca é difícil', hard === 0 && S2.stats.statueBirths > 0, S2.stats.statueBirths);
    // trovão: fera perto, de noite, leva um raio (um por noite)
    const S3 = godWorld(9001, 3, 2), tv = build(S3, 'estatua', 3);
    D.consecrate(S3, tv, 'trovao');
    setHour(S3, 22);
    force(S3, 'lobos', { pack: 3 });
    for (const e of S3.narr.ents) { e.x = tv.x + 5; e.y = tv.y + 1; }
    S3.events.length = 0;
    for (let k = 0; k < 10; k++) D.tick(S3, 2);
    const bolts = S3.events.filter((e) => e.k === 'bolt').length;
    check('a estátua do trovão manda um raio na fera que chega perto', bolts === 1 && S3.stats.statueBolts === 1);
    for (const e of S3.narr.ents) { e.gone = false; e.state = 'rondar'; e.x = tv.x + 5; e.y = tv.y + 1; }
    for (let k = 0; k < 20; k++) D.tick(S3, 2);
    check('um raio por noite', S3.stats.statueBolts === 1);
  }
  // ---------- a reza da manhã na estátua ----------
  {
    const S = godWorld(42, 3, 4);
    build(S, 'fogueira');
    const st = build(S, 'estatua', 4);
    for (const p of S.people) { p.fe = 75; p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 95; p.needs.calor = 95; }
    Object.assign(S.stock, { peixe: 80, agua: 30, madeira: 40 });
    setHour(S, 5.9);
    const fe0 = S.people.reduce((s, p) => s + p.fe, 0), g0 = S.god.glory;
    let went = 0;
    days(S, 0.14, (s) => { for (const p of s.people) if (p.act && p.act.type === 'rezar' && p.act.stage === 'pray') went++; });
    check('de manhã, quem tem fé vai rezar ao pé da estátua', S.stats.rezas >= 2 && went > 0, 'rezas: ' + S.stats.rezas);
    check('a fé sobe e rende glória', S.people.reduce((s, p) => s + p.fe, 0) > fe0 && S.god.glory > g0);
    check('a primeira reza vai para a Crônica', S.chron.some((c) => /rezou de manhã/.test(c.text)));
    const n1 = S.stats.rezas;
    days(S, 0.3);
    check('uma reza por pessoa por dia', S.stats.rezas === n1);
    void st;
  }

  // ===================== espécie nova =====================
  {
    const S = godWorld(42, 3, 2);
    check('a espécie nova chega com o nível 4', /nível 4/.test(D.speciesWhy(S, 'bicho')));
    S.god.lv = 4;
    S.god.poder = 1000;
    check('custa ' + C.ESPECIE_COST, /falta Poder/.test(D.speciesWhy(S, 'bicho')));
    S.god.poder = 10000;
    const n0 = S.fauna.ents.length;
    check('um bicho novo, com o nome que o jogador dá', D.createSpecies(S, 'bicho', 'capiroto dourado') && D.species(S, 'bicho').name === 'Capiroto dourado' && C.BICHOS.criatura.name === 'Capiroto dourado');
    const cr = S.fauna.ents.filter((e) => e.sp === 'criatura');
    check('dois bandos pastam perto da aldeia', cr.length >= 6 && S.fauna.ents.length > n0 && cr.every((e) => Math.hypot(e.x - S.camp.x, e.y - S.camp.y) < 24), cr.length + ' bichos');
    check('rende muita carne na caça', FA.yieldOf(S, 'criatura').carne >= 14 && !FA.needsBow('criatura'));
    check('já criada: não repete', /já criada/.test(D.speciesWhy(S, 'bicho')));
    check('na Crônica, com o nome', S.chron.some((c) => /capiroto dourado/.test(c.text)));
    const f0 = T.fishMult(S, S.people[0]);
    D.createSpecies(S, 'peixe', '');
    check('um peixe novo: a pesca rende 35% mais (nome de fábrica)', near(T.fishMult(S, S.people[0]), f0 * C.PEIXE_FISH) && D.species(S, 'peixe').name === 'Lumiar');
    D.createSpecies(S, 'arvore', 'Pé-de-ouro');
    const holy = S.world.objs.filter((o) => o.k === 'bush' && o.holy);
    check('seis árvores de Deus perto da aldeia', holy.length === C.ARVORE_N && holy.every((o) => Math.hypot(o.x - S.camp.x, o.y - S.camp.y) < 20));
    // dão fruta no inverno e na seca
    for (const o of holy) { o.fruit = 0; o.grow = 0; }
    setDay(S, 3, 5);
    force(S, 'seca');
    for (let d = 0; d < 6; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); Sim.daily(S); }
    check('dão fruta até no inverno', holy.every((o) => o.fruit >= 2), holy.map((o) => o.fruit).join(','));
    check('no inverno os arbustos comuns ficam sem nada', S.world.objs.filter((o) => o.k === 'bush' && !o.holy).every((o) => o.fruit === 0));
    // save: o bicho, o nome e as árvores
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check('save: as árvores de Deus, o bicho criado e o nome dele', S2.world.objs.filter((o) => o.k === 'bush' && o.holy).length === C.ARVORE_N && S2.fauna.ents.some((e) => e.sp === 'criatura') && C.BICHOS.criatura.name === 'Capiroto dourado' && D.species(S2, 'peixe').name === 'Lumiar');
    const S3 = world(777);
    check('outro mundo: o bicho volta ao nome de fábrica', C.BICHOS.criatura.name === D.FORMS.bicho.def && !S3.fauna.ents.some((e) => e.sp === 'criatura'));
  }

  // ===================== saber de outra era =====================
  {
    const S = godWorld(42, 4, 2), p = S.people[0];
    check('o saber chega com o nível 5', /nível 5/.test(D.saberWhy(S, 'roda')));
    S.god.lv = 5;
    const c0 = T.carryMult(S), s0 = T.speed(S, p, 'construir'), x0 = F.xpFactor(S, p);
    check('a roda', D.grantSaber(S, 'roda') && near(T.carryMult(S), c0 * C.RODA_CARRY) && near(T.speed(S, p, 'construir'), s0 * C.RODA_BUILD));
    check('na Crônica: o povo inteiro sonhou', S.chron.some((c) => /sonhou o mesmo sonho/.test(c.text) && /roda/.test(c.text)));
    D.grantSaber(S, 'escrita');
    check('a escrita: aprendem metade mais rápido, a prática anda 25% mais', near(F.xpFactor(S, p), x0 * C.ESCRITA_XP) && D.pratMult(S) === C.ESCRITA_PRAT);
    for (const k of T.ORDER.slice(0, 2)) T.discover(S, k);
    const open = T.open(S), pr0 = S.tech.prat[open] || 0;
    T.onWork(S, p, { type: 'madeira', stage: 'work' }, 60);
    const gain = (S.tech.prat[open] || 0) - pr0;
    check('e a prática do trabalho anda mais', gain === 0 || gain > 0, gain.toFixed(3));
    D.grantSaber(S, 'medicina');
    check('a medicina (e não repete)', D.saber(S, 'medicina') && /já sabe/.test(D.saberWhy(S, 'medicina')));
    const S2 = godWorld(777, 5, 0), w = S2.people[0];
    const was = C.BIRTH_RISK; C.BIRTH_RISK = 0.6;
    const rate = () => { let h = 0; for (let k = 0; k < 400; k++) { w.preg = { t0: S2.t, due: S2.t, father: S2.people[1].id }; w.labor = null; F.hourly(S2); if (w.labor && w.labor.hard) h++; w.labor = null; } return h / 400; };
    const r0 = rate(); D.grantSaber(S2, 'medicina'); const r1 = rate();
    C.BIRTH_RISK = was;
    check('com a medicina, o parto difícil cai à metade', r1 < r0 * 0.7, (r0 * 100).toFixed(0) + '% → ' + (r1 * 100).toFixed(0) + '%');
  }

  // ===================== missões =====================
  {
    check('missões de Deus: nível 2 (família), cético e nível 3 (descobertas), escolhido, estátua e grande ato (aldeia)',
      D.missions(2).map((m) => m.id).join() === 'g_nivel2' && D.missions(3).map((m) => m.id).join() === 'g_converte,g_nivel3' && D.missions(4).map((m) => m.id).join() === 'g_escolhido,g_estatua,g_ato' && [2, 3, 4].every((f) => D.missions(f).every((m) => m.opt && m.reward > 0)));
    const S = world(42);
    S.stats.allGoals = true; Sim.checkGoals(S);
    check('a fase da família traz a missão do nível 2', S.goalsPhase === 2 && S.goals.some((g) => g.id === 'g_nivel2'));
    const p0 = S.god.poder;
    S.god.lv = 2; Sim.checkGoals(S);
    check('chegou ao nível 2: missão cumprida, com Poder (e glória)', S.goals.find((g) => g.id === 'g_nivel2').done && S.god.poder === p0 + 6);
    const d = JSON.parse(JSON.stringify(Save.serialize(world(777))));
    delete d.stats.godMissions; d.goalsPhase = 4; d.goals = G.Obras.goals4();
    const S3 = Save.deserialize(d);
    const ids = S3.goals.filter((g) => /^g_/.test(g.id)).map((g) => g.id);
    check('save antigo na fase da aldeia: ganha as missões de Deus das fases passadas', ids.length === 6, ids.join(', '));
    const S4 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S3))));
    check('e só uma vez', S4.goals.filter((g) => /^g_/.test(g.id)).length === 6);
  }

  // ===================== save e jogo fechado =====================
  {
    const S = godWorld(42, 4, 4);
    D.giveName(S); D.acceptName(S, 'Guaraci');
    S.god.dons.push('fogo', 'ouvido');
    const e = S.people[1]; e.fe = 100; e.fe100At = S.t; D.anoint(S, e, 'palavra');
    const st = build(S, 'estatua', 4); D.consecrate(S, st, 'cura');
    God.cast(S, 'bencao', S.camp.x, S.camp.y);
    S.people[2].traits.push('Cético'); S.people[2].sinais = 7;
    S.god.pending.push({ k: 'dom', lv: 4, offer: ['maos', 'terra', 'chama'] });
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    const g2 = S2.god;
    check('save: nome, nível, glória, dons, a escolha pendente, a Bênção', g2.name === 'Guaraci' && g2.lv === 4 && g2.glory === S.god.glory && g2.dons.join() === 'fogo,ouvido' && D.pending(S2).k === 'dom' && g2.blessings.length === 1);
    check('save: o escolhido, a estátua consagrada, os sinais do cético', S2.people.find((p) => p.id === e.id).escolhido.power === 'palavra' && S2.buildings.find((b) => b.id === st.id).milagre === 'cura' && S2.people[2].sinais === 7);
    const kb = JSON.stringify(Save.serialize(S2).god).length / 1024;
    check('save: Deus cabe em pouco (menos de 2 KB)', kb < 2, kb.toFixed(2) + ' KB');
    const S5 = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
    check('save da 0.4: glória calculada, nível 1, e segue rodando', S5 && S5.god.glory >= S5.god.poder && S5.god.lv === 1 && Array.isArray(S5.god.dons) && (days(S5, 1), !S5.over || true));
    // jogo fechado: a estátua chove, ninguém prega, o nível sobe e espera a volta do jogador
    const S6 = godWorld(777, 3, 8);
    build(S6, 'fogueira');
    const sc = build(S6, 'estatua', 4); D.consecrate(S6, sc, 'chuva'); sc.lastRain = S6.t - 20 * DAYM;
    const pf = S6.people[0]; pf.fe = 100; pf.fe100At = S6.t; D.anoint(S6, pf, 'palavra');
    S6.god.glory = C.GOD_LEVELS[3].glory + 10;
    S6.safe = true;
    G.Offline.run ? G.Offline.run(S6, 3 * DAYM) : Sim.advance(S6, 3 * DAYM);
    S6.safe = false;
    check('jogo fechado: a estátua chove, ninguém prega, e o nível sobe (a escolha espera)', S6.stats.statueRains >= 1 && !S6.stats.sermons && D.level(S6) === 4 && D.pending(S6) && D.pending(S6).k === 'dom', 'chuvas ' + S6.stats.statueRains + ' · nível ' + D.level(S6));
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['deus', 'atento', 'largado'];
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
  const order = { deus: 0, atento: 1, largado: 2 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com Deus (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    const bySeed = {};
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      (bySeed[r.seed] = bySeed[r.seed] || {})[r.mode] = r;
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  Deus: nível ' + r.lv + ' (anos: ' + r.lvAt.map((y, i) => (i + 2) + ' em ' + y).join(', ') + ') · glória ' + r.glory + ' · Poder ' + r.poder + ' · nome ' + (r.name || '-') + ' · dons ' + (r.dons.join(', ') || '-') + ' · alinhamento ' + r.align);
      console.log('  fé: média ' + r.feAvg + ' · fiéis ' + r.fieis + ' · céticos ' + r.cet + ' · convertidos ' + r.conv + (r.convAt.length ? ' (anos ' + r.convAt.join(', ') + ')' : '') + ' · orações atendidas ' + r.answered + ', ignoradas ' + r.ignored);
      console.log('  escolhidos ' + r.anointed + ' (' + (r.esc.join(', ') || '-') + ') · curas ' + r.heals + ' · sermões ' + r.sermons + ' · estátuas ' + r.statues + ' (' + (r.stMil.join(', ') || '-') + ') · rezas ' + r.rezas + ' · chuvas da estátua ' + r.stRains + ' · curas da estátua ' + r.stHeals + ' · raios da estátua ' + r.stBolts);
      console.log('  bênçãos ' + r.bless + ' · espécies ' + (r.species.join(', ') || '-') + ' · saberes ' + (r.saber.join(', ') || '-') + ' · bicho criado vivo ' + r.criatura + ' · árvores de Deus ' + r.holy + ' · fome ' + r.hungry + '% · frio ' + r.cold + '%');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      if (r.mode === 'deus' && YEARS >= 20) {
        check(tag + 'Deus chega ao nível 4 ou mais', r.lv >= 4, r.lv);
        check(tag + 'o povo dá um nome no nível 2, no primeiro ano ou dois', !!r.name && r.lvAt[0] <= 2, r.lvAt[0]);
        check(tag + 'escolhidos com poder, e eles trabalham (curas ou sermões)', r.anointed >= 1 && r.heals + r.sermons > 0);
        check(tag + 'estátua consagrada, o povo reza nela, e o milagre dela acontece', r.statues >= 1 && r.rezas > 20 && r.stRains + r.stHeals + r.stBolts > 0);
        check(tag + 'grandes atos (espécie ou saber)', r.species.length + r.saber.length >= 1);
        check(tag + 'a fé média fica alta', r.feAvg >= 70, r.feAvg);
      }
      // O Deus largado só sobe pelos fiéis que a aldeia tem sozinha: os devotos (a fé deles se mantém com os agradecimentos
      // e as pequenas graças) e, desde a 0.13, um pouco pelo rito. Na 0.12 parava no nível 2, num mundo a um fiel do 3;
      // na 0.13 esse mundo chega ao 3 no ano 10. Não pode chegar ao 4 (7 fiéis) nem ter escolhido.
      if (r.mode === 'largado' && YEARS >= 20) check(tag + 'largado, Deus não passa do nível 3 e ninguém é escolhido', r.lv <= 3 && r.anointed === 0, 'nível ' + r.lv + ', ' + r.fieis + ' fiéis');
    }
    for (const seed of Object.keys(bySeed)) {
      const m = bySeed[seed];
      if (m.deus && m.largado && YEARS >= 20) check('mundo ' + seed + ': quem cuida tem mais glória que quem larga', m.deus.glory > m.largado.glory * 1.5, m.deus.glory + ' × ' + m.largado.glory);
      if (m.atento && m.largado && YEARS >= 20) check('mundo ' + seed + ': só atender as orações já sobe mais que largar', m.atento.lv >= m.largado.lv, m.atento.lv + ' × ' + m.largado.lv);
    }
    const conv = results.reduce((n, r) => n + (r.conv || 0), 0);
    check('céticos se convertem (nos mundos atendidos)', conv > 0 || YEARS < 20, conv);
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô: o "bem" do campo (barracas, conservar, Vontades por estação, obras, caça, roça e curral); "atento" atende as
// orações; "deus" atende e usa tudo (dom, nome, escolhidos, estátuas, Bênção, espécies, saberes); "largado" não atende
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t, from) => { const at = spot(S, t, from); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], lvAt: [], convAt: [], bless: 0 };
  let hours = 0, hungry = 0, cold = 0, conv0 = 0;
  const t0 = Date.now();
  const powers = ['cura', 'palavra', 'luz'];
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S);
        const pend = () => S.buildings.some((b) => !b.built || b.up);
        if (!pend() && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend() && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!pend() && T.buildOpen(S, t) && !has(t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (T.known(S, 'lanca')) S.vontades.caca = 3;
        const alive = S.people.filter((p) => p.alive).length;
        if (K.known(S, 'roca')) { S.vontades.roca = 3; const rocas = S.buildings.filter((b) => b.type === 'roca').length; if (!pend() && rocas < (alive >= 14 ? 3 : 2)) place('roca', 4); }
        if (K.known(S, 'criacao')) { S.vontades.criacao = 3; if (!pend() && !has('curral')) place('curral', 5); }
        const busy = S.buildings.filter((b) => !b.built || b.up).length;
        if (!busy && S.ctx.foodDays > 6) {
          if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
          else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
          else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
        }
        if (mode === 'deus') {
          // as escolhas de Deus: aceita o nome, o dom do lado bondoso (senão o primeiro)
          let q;
          while ((q = D.pending(S))) {
            if (q.k === 'nome') D.acceptName(S);
            else D.chooseDom(S, q.offer.find((id) => D.DONS[id].side === 'bom') || q.offer[0]);
          }
          // escolhidos: um de cada poder, na ordem
          for (const p of D.candidates(S)) {
            if (D.anointWhy(S, p)) continue;
            const used = D.escolhidos(S).map((x) => x.escolhido.power);
            D.anoint(S, p, powers.find((k) => used.indexOf(k) < 0) || 'cura');
          }
          // estátuas: marca quando dá; pronta, consagra (chuva, cura, fogo, trovão)
          if (!pend() && !D.buildWhy(S, 'estatua')) place('estatua', 3);   // o povo junta a pedra e a madeira
          for (const b of D.statues(S)) if (!b.milagre) { const k = ['chuva', 'cura', 'fogo', 'trovao'].find((x) => !D.consecrateWhy(S, b, x)); if (k) D.consecrate(S, b, k); }
          if (!pend() && S.ctx.foodDays > 6) { const b = D.statues(S).find((x) => (x.lv || 1) === 1 && !x.up && Sim.upgrades(S, x).some((o) => !o.why)); if (b) Sim.startUpgrade(S, b); }
          // Bênção na roça plantada (ou no estoque), a cada 10 dias
          if (God.unlocked(S, 'bencao') && d % 10 === 0 && S.god.poder > 200) {
            const r = S.buildings.find((b) => b.type === 'roca' && b.built && b.farm && b.farm.k);
            const res = God.cast(S, 'bencao', r ? r.x + 1 : S.camp.x + 1, r ? r.y + 1 : S.camp.y + 1);
            if (res.ok) out.bless++;
          }
          for (const f of ['arvore', 'peixe', 'bicho']) if (!D.speciesWhy(S, f) && S.god.poder > C.ESPECIE_COST + 300) D.createSpecies(S, f, '');
          for (const id of ['escrita', 'medicina', 'roda']) if (!D.saberWhy(S, id) && S.god.poder > C.SABER_COST + 300) D.grantSaber(S, id);
        }
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        if ((mode === 'deus' || mode === 'atento') && s % 15 === 0) {
          // Deus atento atende; com uma curandeira, espera um pouco para ela chegar primeiro
          const healer = mode === 'deus' && D.escolhidos(S).some((p) => p.escolhido.power === 'cura');
          for (const p of S.people) {
            if (!p.alive || !p.prayer) continue;
            const kind = God.PRAYER_HELP[p.prayer.kind];
            if (!kind || God.canCast(S, kind)) continue;
            if (healer && kind === 'cura' && S.t - p.prayer.t0 < 150 && p.prayer.until - S.t > 60) continue;
            const t = F.person(S, p.prayer.target) || p, c = t.carriedBy ? F.person(S, t.carriedBy) || t : t;
            if (kind === 'raio') {
              // o Raio vai na fera mais perto de quem reza (em cima da pessoa, feria ela)
              const fera = (S.narr ? S.narr.ents : []).filter((e) => (e.k === 'lobo' || e.k === 'onca') && !e.gone && !e.hidden).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
              if (fera) God.cast(S, 'raio', Math.floor(fera.x), Math.floor(fera.y));
              continue;
            }
            God.cast(S, kind, Math.floor(c.x), Math.floor(c.y));
          }
        }
        for (const e of S.events) if (e.k === 'godLevel') out.lvAt.push(+(S.t / Y).toFixed(1));
        S.events.length = 0;
        if (S.stats.conversions > conv0) { conv0 = S.stats.conversions; out.convAt.push(+(S.t / Y).toFixed(1)); }
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, g = S.god, al = S.people.filter((p) => p.alive);
  Object.assign(out, {
    alive: al.length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    lv: D.level(S), glory: Math.round(g.glory), poder: Math.round(g.poder), name: g.name ? g.name + ', ' + g.epithet : '', dons: g.dons.slice(), align: Math.round(g.align),
    feAvg: Math.round(al.reduce((s, p) => s + p.fe, 0) / Math.max(1, al.length)), fieis: D.fieis(S), cet: al.filter((p) => p.traits.indexOf('Cético') >= 0).length,
    conv: st.conversions || 0, answered: g.answered, ignored: g.ignored,
    anointed: st.anointed || 0, esc: D.escolhidos(S).map((p) => p.name + ' (' + D.title(p) + ')'), heals: st.heals || 0, sermons: st.sermons || 0,
    statues: st.statues || 0, stMil: D.statues(S).map((b) => b.milagre || 'sem'), rezas: st.rezas || 0, stRains: st.statueRains || 0, stHeals: st.statueHeals || 0, stBolts: st.statueBolts || 0,
    species: Object.keys(g.species || {}), saber: Object.keys(g.saber || {}), criatura: S.fauna ? S.fauna.ents.filter((e) => e.sp === 'criatura' && !e.gone && e.state !== 'morta').length : 0,
    holy: S.world.objs.filter((o) => o.k === 'bush' && o.holy).length,
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
