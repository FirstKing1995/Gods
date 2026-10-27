// Gods · testes da Etapa 14 (Sociedade). Uso: node test/sociedade-test.js [anos | u] [modos]
// 1) unidades: a correção da IA que abre a etapa (quem leva comida nas costas come dela; sem força e longe da cama,
//    dorme no caminho), a índole (de nascença, o que a empurra, os rótulos), os crimes (cada um, quem vê, o que o povo
//    sabe e o que só Deus sabe), o julgamento ao pé do fogo (a bronca, o veredito, as penas, o inocente condenado, o
//    exílio), os castigos de Deus na medida, a verdade em sonho e o perdão, o líder (o que cada povo respeita), as
//    obras por conta própria (os três modos), o descontentamento, os dissidentes (o aviso e as três respostas), a
//    vila de fora (troca, casamento, briga, outro deus, a volta), o jogo fechado, o save e as missões
// 2) 20 anos em três mundos: "bem" (o jogador castiga na medida, mostra a verdade, promete e cumpre; o povo decide as
//    obras), "duro" (castiga tudo com o que há de mais pesado e não ergue casa a mais) e "largado" (ninguém responde)
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Campo: K, Narr: N, Deus: D, Povos: Pv, Minas: Mi, Obras: O, Bichos: B, Memoria: M, Soc: So, Offline: Off } = G;
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
function add(S, sex, name, age, kind) {
  const q = Sim.makePerson(S, sex, name, kind ? Pv.realAge(kind, age) : age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = F.age(S, q);
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); Mi.init(S);
  if (kind) Pv.make(S, q, kind);
  Pv.recount(S);
  q.fe = 80;
  So.indole(S, q);
  return q;
}
// gente boa em tudo (para o teste escolher quem é ruim e em quê)
const boa = (p) => { p.indole = { g: 50, m: 50, f: 50 }; p.indAc = {}; return p; };
// uma aldeia pronta, sem desastres: n adultos humanos de boa índole, barracas, fogo, comida, e o tempo de paz já passado
function village(seed, n, o) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true; S.arrived = true;
  S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 20 + (k * 3) % 15);
  build(S, 'fogueira');
  for (let k = 0; k < Math.ceil(n / 2) + 3; k++) build(S, 'barraca', 3);
  S.people.forEach((p, k) => { p.fe = 80; p.act = null; p.path = null; p.x = S.camp.x + 0.5 + (k % 4); p.y = S.camp.y + 2.5 + Math.floor(k / 4); p.px = p.x; p.py = p.y; boa(p); p.traits = []; });
  Object.assign(S.stock, { madeira: 150, pedra: 60, agua: 30, frutas: 80, peixe: 300, tabuas: 30 });
  for (const id of ['pedra', 'cestos', 'lanca']) if (!T.known(S, id)) S.tech.known[id] = { t: S.t, by: 'teste', how: 'pratica' };
  S.stock.ferramentas = 6;
  // o tempo de paz do começo já passou, num dia sem chuva
  jump(S, dryFrom(S, (o && o.day) || C.SOC_GRACA_D + 2, 3), 9);
  for (const p of S.people) { p.born -= S.t; p.lastAge = F.age(S, p); }
  S.people.forEach((p, k) => setAge(S, p, k < 2 ? 30 : 20 + ((k - 2) * 3) % 15));
  S.events.length = 0; S.chron.length = 0;
  Sim.refresh(S);
  return S;
}
function jump(S, day, hour) { S.t = day * DAYM + hour * 60; S.ck = Sim.clock(S.t); Sim.refresh(S); }
function setAge(S, p, a) { p.born = S.t - a * Y - 5 * DAYM; p.lastAge = Math.floor(a); }
function dryFrom(S, d0, n) {
  const dry = (d) => { const w = Sim.weatherOf(S, d), y = d > 0 ? Sim.weatherOf(S, d - 1) : null; return w.kind !== 'chuva' && !(y && y.kind === 'chuva' && y.end > 24); };
  for (let d = d0; d < d0 + 400; d++) { let all = true; for (let k = 0; k < n && all; k++) all = dry(d + k); if (all) return d; }
  return d0;
}
function walkAt(S, dx, dy) {
  const w = S.world;
  for (let r = 0; r < 14; r++) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    if (Math.max(Math.abs(xx), Math.abs(yy)) !== r) continue;
    const x = S.camp.x + dx + xx, y = S.camp.y + dy + yy, i = y * w.W + x;
    if (x > 3 && y > 3 && x < w.W - 4 && y < w.H - 4 && !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]] && !W.objAt(w, i) && w.bgrid[i] < 0) return { x, y };
  }
  return null;
}
// o chão andável, com caminho até o estoque, a uns d passos dele
function farSpot(S, d) {
  const w = S.world, campI = S.camp.y * w.W + S.camp.x;
  for (let k = 0; k < 48; k++) {
    const a = k / 48 * Math.PI * 2, x = Math.round(S.camp.x + 1 + Math.cos(a) * d), y = Math.round(S.camp.y + 1 + Math.sin(a) * d), i = y * w.W + x;
    if (x < 4 || y < 4 || x >= w.W - 4 || y >= w.H - 4 || w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]] || W.objAt(w, i) || w.bgrid[i] >= 0) continue;
    const path = W.findPath(w, i, campI, 400);
    if (path && path.length >= d * 0.8) return { x, y };
  }
  return null;
}
function put(S, p, at) { p.x = at.x + 0.5; p.y = at.y + 0.5; p.px = p.x; p.py = p.y; p.act = null; p.path = null; p.sleeping = false; p.inTent = 0; }
const alive = (S) => S.people.filter((p) => p.alive);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hasMem = (p, k) => p.mem.some((x) => x.k === k);
const chronHas = (S, re) => S.chron.some((c) => re.test(c.text));
const clone = (S) => Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
// dia calmo: comida e água não acabam, ninguém sai à caça
function calm(S) { S.vontades.caca = 0; S.stock.peixe = Math.max(S.stock.peixe, 200); S.stock.agua = Math.max(S.stock.agua, 30); if (S.stock.frutas < 40) S.stock.frutas = 40; }
// anda n passos de 2 min; devolve os acontecimentos da Sociedade (e os avisos) que passaram
function run(S, n, each) {
  const evs = [];
  for (let i = 0; i < n && !S.over; i++) {
    Sim.step(S, 2); calm(S);
    for (const e of S.events) if (e.k === 'soc' || e.k === 'toast' || e.k === 'bolt' || e.k === 'choice') evs.push(e);
    if (each && each(S, i) === false) break;
    S.events.length = 0;
  }
  S.events.length = 0;
  return evs;
}
// o mesmo, sem repor comida nem água (para conferir o estoque)
function runRaw(S, n, each) {
  const evs = [];
  for (let i = 0; i < n && !S.over; i++) {
    Sim.step(S, 2);
    for (const e of S.events) if (e.k === 'soc' || e.k === 'toast' || e.k === 'bolt' || e.k === 'choice') evs.push(e);
    if (each && each(S, i) === false) break;
    S.events.length = 0;
  }
  S.events.length = 0;
  return evs;
}
const toasts = (evs, re) => evs.filter((e) => e.k === 'toast' && re.test(e.text));
// todo mundo acordado e parado onde está (para as checagens de quem viu)
function wake(S) { for (const p of S.people) if (p.alive) { p.sleeping = false; p.inTent = 0; p.act = null; p.path = null; } }
// troca o sorteio do mundo por uma lista de valores (o último se repete) só enquanto f roda
function withRng(S, vals, f) { let i = 0; S.rng.next = () => vals[Math.min(i++, vals.length - 1)]; try { return f(); } finally { delete S.rng.next; } }
// faz o crime na hora, como a IA faria ao chegar (sem a caminhada)
function faz(S, p, k, vic, o) { p.plano = Object.assign({ k, t: S.t, ate: S.t + 600 }, vic ? { vic: vic.id } : {}, o || {}); return So.cometer(S, p); }
const crime = (S, id) => S.soc.crimes.find((c) => c.id === id);
const doing = (p, k) => !!(p.act && p.act.type === 'soc' && p.act.m && p.act.m.k === k);
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== unidades =====================
  // ---------- A. a correção da IA: comer da carga, dormir no caminho ----------
  {
    const S = village(42, 6), p = S.people[2], far = farSpot(S, 26), w = S.world;
    check('há um lugar a uns 26 passos do estoque para o teste', !!far);
    // sem fruta no pé por perto: a escolha é entre a carga e a caminhada até o estoque
    for (const o of w.objs) if (o.k === 'bush') o.fruit = 0;
    Sim.refresh(S);
    put(S, p, far);
    p.carry = { k: 'caca', carne: 11, couro: 3, n: 14, sp: 'capivara' };
    p.needs.fome = 8; p.needs.sede = 90; p.needs.energia = 80;
    check('a carne da caça nas costas é comida de caminho', AI.carryFood(p) === 'carne');
    const a = AI.decideType(S, p, 'comer');
    check('longe de casa e com fome, quem leva carne nas costas come dela ali mesmo (sem andar)', !!a && a.src === 'carga' && !p.path, a ? a.src : 'não começou');
    for (let i = 0; i < 60 && p.act && p.act.type === 'comer'; i++) { AI.tick(S, p, 2); }
    check('come o bastante para chegar em casa (até ' + C.CARGA_ATE + '), não a carga inteira', p.needs.fome >= C.CARGA_ATE && p.needs.fome < 88 && p.carry && p.carry.carne > 0 && p.carry.carne < 11, Math.round(p.needs.fome) + ' de fome, ' + (p.carry ? p.carry.carne : 0) + ' de carne');
    check('a carga diminui junto (carne e total), o couro fica', p.carry.n === p.carry.carne + 3 && p.carry.couro === 3);
    check('comer carne crua fica na lembrança', hasMem(p, 'carneCrua'));
    check('a tela diz o que a pessoa está fazendo', (() => { p.needs.fome = 5; const b = AI.decideType(S, p, 'comer'); AI.tick(S, p, 2); const t = AI.describe(S, p); AI.abort(S, p); return t === 'Comendo do que leva nas costas'; })());
    // perto de casa, come do estoque (cozido), não da carga
    put(S, p, walkAt(S, 3, 3)); p.needs.fome = 8; p.carry = { k: 'caca', carne: 11, couro: 3, n: 14, sp: 'capivara' };
    const a2 = AI.decideType(S, p, 'comer');
    check('perto do estoque, come do estoque e guarda a carga', !!a2 && a2.src === 'estoque', a2 ? a2.src : '-');
    AI.abort(S, p);
    // com fome pequena, não mexe na carga
    put(S, p, far); p.needs.fome = 40;
    const a3 = AI.decideType(S, p, 'comer');
    check('com fome pouca (acima de ' + C.CARGA_FOME + '), a carga fica para o estoque', !!a3 && a3.src !== 'carga', a3 ? a3.src : '-');
    AI.abort(S, p);
    // material separado para uma tarefa não é comida
    p.carry = { k: 'peixe', n: 20, back: { peixe: 20, madeira: 2 } };
    check('peixe separado para o moquém (material de tarefa) não é comida de caminho', AI.carryFood(p) === null);
    p.carry = { k: 'peixe', n: 3 }; p.needs.fome = 5;
    const a4 = AI.decideType(S, p, 'comer');
    for (let i = 0; i < 60 && p.act && p.act.type === 'comer'; i++) AI.tick(S, p, 2);
    check('peixe pescado e frutas colhidas também valem; a carga que acaba some', !!a4 && a4.src === 'carga' && p.carry === null && hasMem(p, 'comeuCru'), JSON.stringify(p.carry));
    p.carry = { k: 'madeira', n: 6 };
    check('madeira nas costas não se come', AI.carryFood(p) === null);
    // sem comida no estoque e sem fruta no pé: quem tem carga ainda pode comer
    for (const k of T.FOOD) S.stock[k] = 0;
    Sim.refresh(S);
    p.carry = { k: 'frutas', n: 4 }; p.needs.fome = 6; p.act = null; p.fail = {}; S.ctx.bushFruit = 0;
    const lista = AI.scoreList(S, p);
    check('estoque vazio e nenhuma fruta no pé: quem leva frutas nas costas ainda pensa em comer', S.ctx.food === 0 && S.ctx.bushFruit === 0 && lista.some((c) => c.type === 'comer'));
    p.carry = null;
    check('sem carga, sem estoque e sem fruta, não há o que comer', !AI.scoreList(S, p).some((c) => c.type === 'comer'));
  }
  {
    // sem força e longe da cama: dorme no caminho (antes andava horas com a energia em zero)
    const S = village(42, 6), p = S.people[3], far = farSpot(S, 26);
    put(S, p, far);
    p.needs.energia = 0; p.needs.fome = 90; p.needs.sede = 90;
    const a = AI.decideType(S, p, 'dormir');
    const passos = p.path ? p.path.length : 0;
    AI.tick(S, p, 2);
    check('com a energia em zero e a cama a mais de ' + C.DORME_LONGE + ' passos, deita ali mesmo', !!a && p.sleeping && !p.inTent && passos > C.DORME_LONGE && !p.path, passos + ' passos, dormindo ' + p.sleeping);
    check('e avisa o jogador (uma vez por dia)', S.events.some((e) => e.k === 'toast' && /dormiu no caminho/.test(e.text)));
    // perto de casa segue até a barraca
    AI.abort(S, p); S.events.length = 0;
    put(S, p, walkAt(S, 4, 4)); p.needs.energia = 0; p.fail = {};
    const b = AI.decideType(S, p, 'dormir');
    const perto = p.path ? p.path.length : 0;
    AI.tick(S, p, 2);
    check('a poucos passos de casa, segue até a barraca', !!b && !p.sleeping && perto <= C.DORME_LONGE && perto > 0, perto + ' passos');
    // com alguma energia, anda o caminho todo
    AI.abort(S, p); put(S, p, far); p.needs.energia = 12; p.fail = {};
    AI.decideType(S, p, 'dormir'); AI.tick(S, p, 2);
    check('com alguma energia, anda até a cama mesmo de longe', !p.sleeping && !!p.path);
  }
  {
    // longe de casa, com fome e comida no estoque: a fruta do caminho de volta serve; a que fica mais longe de casa, não
    // (antes ia de arbusto em arbusto, cada vez mais longe; um anão morreu de fome assim, com o estoque cheio)
    const S = village(42, 6), p = S.people[4], w = S.world, campI = S.camp.y * w.W + S.camp.x;
    const cx = S.camp.x + 1, cy = S.camp.y + 1, dc = (x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const livre = (x, y) => { const i = y * w.W + x; return x > 3 && y > 3 && x < w.W - 4 && y < w.H - 4 && !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]] && !W.objAt(w, i) && w.bgrid[i] < 0; };
    const chega = (at, o) => !!W.findNearest(w, at.y * w.W + at.x, (k) => W.adjObj(w, k, (x) => x === o), 14) && !!W.findPath(w, at.y * w.W + at.x, campI, 400);
    let caso = null;
    for (const o of w.objs) {
      if (o.k !== 'bush' || caso) continue;
      const d = dc(o.x, o.y);
      if (d < 30 || d > 45) continue;
      const ux = (o.x + 0.5 - cx) / d, uy = (o.y + 0.5 - cy) / d;
      const dentro = { x: Math.round(o.x - ux * 5), y: Math.round(o.y - uy * 5) }, fora = { x: Math.round(o.x + ux * 5), y: Math.round(o.y + uy * 5) };
      if (livre(dentro.x, dentro.y) && livre(fora.x, fora.y) && chega(dentro, o) && chega(fora, o)) caso = { o, dentro, fora };
    }
    check('há um arbusto a uns 30 a 45 passos de casa, com chão livre antes e depois dele', !!caso);
    if (caso) {
      for (const o of w.objs) if (o.k === 'bush') o.fruit = 0;
      caso.o.fruit = 3;
      Sim.refresh(S);
      p.carry = null; p.needs.sede = 90; p.needs.energia = 80;
      put(S, p, caso.dentro); p.needs.fome = 10; p.fail = {};
      const a = AI.decideType(S, p, 'comer');
      check('longe de casa, com fome e comida no estoque, não vai ao arbusto que fica mais longe de casa: volta para o estoque', !!a && a.src === 'estoque', (a ? a.src : 'não começou') + ' · ' + dc(caso.dentro.x, caso.dentro.y).toFixed(0) + ' passos de casa, o arbusto a ' + dc(caso.o.x, caso.o.y).toFixed(0));
      AI.abort(S, p);
      put(S, p, caso.fora); p.needs.fome = 10; p.fail = {};
      const b = AI.decideType(S, p, 'comer');
      check('e o arbusto do caminho de volta (mais perto de casa) serve', !!b && b.src === 'arbusto' && b.obj === caso.o, b ? b.src : 'não começou');
      AI.abort(S, p);
      // com o estoque quase vazio, a fruta de qualquer lado serve
      for (const k of T.FOOD) S.stock[k] = 0;
      Sim.refresh(S);
      put(S, p, caso.dentro); p.needs.fome = 10; p.fail = {}; caso.o.res = 0;
      const c = AI.decideType(S, p, 'comer');
      check('sem comida no estoque, a fruta de qualquer lado serve', !!c && c.src === 'arbusto', c ? c.src : 'não começou');
      AI.abort(S, p);
    }
  }

  // ---------- B. a índole ----------
  {
    const S = village(42, 8), S2 = village(42, 8);
    const p = S.people[4];
    delete p.indole; delete S2.people[4].indole;
    p.traits = []; S2.people[4].traits = [];
    const a = So.indole(S, p), b = So.indole(S2, S2.people[4]);
    check('a índole de nascença é a mesma para o mesmo mundo e a mesma pessoa', a.g === b.g && a.m === b.m && a.f === b.f, JSON.stringify(a));
    const r0 = S.rng.s;
    for (let k = 0; k < 50; k++) { delete p.indole; So.indole(S, p); }
    check('e não gasta o sorteio da simulação', S.rng.s === r0);
    // a distribuição: a maioria é boa; uma parte tem um defeito; vilão é raro
    let ruim = 0, muito = 0, bom = 0;
    const N0 = 3000;
    for (let id = 1; id <= N0; id++) {
      const q = { id, traits: [], mother: 0, father: 0 }; const I0 = So.indole(S, q);
      const vs = [I0.g, I0.m, I0.f];
      if (vs.some((v) => v <= -C.INDOLE_ROTULO)) ruim++;
      if (vs.some((v) => v <= -65)) muito++;
      if (vs.every((v) => v > 0)) bom++;
    }
    check('de cada dez pessoas, uma ou duas nascem com um defeito (egoísta, violenta ou mentirosa)', ruim / N0 > 0.1 && ruim / N0 < 0.3, (ruim / N0 * 100).toFixed(1) + '%');
    check('gente muito ruim é rara (menos de 2 em 100)', muito / N0 < 0.02, (muito / N0 * 100).toFixed(2) + '%');
    check('quase metade nasce boa nos três eixos ao mesmo tempo', bom / N0 > 0.38 && bom / N0 < 0.6, (bom / N0 * 100).toFixed(1) + '%');
    // filho puxa aos pais
    const mom = S.people[0], dad = S.people[1];
    mom.indole = { g: -80, m: -80, f: -80 }; dad.indole = { g: -80, m: -80, f: -80 };
    let soma = 0, n = 0;
    for (let id = 500; id < 700; id++) { const q = { id, traits: [], mother: mom.id, father: dad.id }; soma += So.indole(S, q).g; n++; }
    let soma0 = 0;
    for (let id = 500; id < 700; id++) { const q = { id, traits: [], mother: 0, father: 0 }; soma0 += So.indole(S, q).g; }
    check('filho de pais egoístas puxa um pouco a eles (' + C.INDOLE_HERDA * 100 + '% da distância deles ao comum)', near(soma / n, soma0 / n + (-80 - C.INDOLE_MEAN) * C.INDOLE_HERDA, 2.5), (soma / n).toFixed(1) + ' contra ' + (soma0 / n).toFixed(1) + ' sem pais');
    // os traços empurram
    let tid = 900;
    for (; tid < 1100; tid++) { const b0 = So.indole(S, { id: tid, traits: [], mother: 0, father: 0 }); if (Math.abs(b0.g) < 50 && Math.abs(b0.m) < 50) break; }
    const base = So.indole(S, { id: tid, traits: [], mother: 0, father: 0 }), trab = So.indole(S, { id: tid, traits: ['Trabalhador', 'Otimista'], mother: 0, father: 0 }), preg = So.indole(S, { id: tid, traits: ['Preguiçoso', 'Pessimista'], mother: 0, father: 0 });
    check('o trabalhador nasce de mão mais aberta que o preguiçoso; o otimista, mais manso que o pessimista', trab.g > base.g && preg.g < base.g && trab.m > base.m && preg.m < base.m);
    // rótulos
    const q = S.people[5]; q.indole = { g: -40, m: 70, f: 10 }; q.sex = 'F';
    const rot = So.rotulos(S, q);
    check('o rótulo aparece a partir de ' + C.INDOLE_ROTULO + ': egoísta e mansa (forte), e nada para o eixo do meio', rot.length === 2 && rot[0].txt === 'egoísta' && !rot[0].bom && rot[1].txt === 'mansa' && rot[1].bom && rot[1].forte && !rot[0].forte, JSON.stringify(rot.map((r) => r.txt)));
    q.sex = 'M'; q.indole = { g: 40, m: -40, f: -40 };
    check('no masculino: generoso, violento, mentiroso', So.rotulos(S, q).map((r) => r.txt).join(',') === 'generoso,violento,mentiroso');
    // empurrões
    q.indole = { g: 0, m: 0, f: 0 }; q.indAc = {};
    So.puxa(S, q, 'g', -7, 'fome'); So.puxa(S, q, 'g', 2, 'fe');
    check('cada empurrão fica anotado com o motivo, e a tela mostra o que mais pesou', q.indole.g === -5 && q.indAc.g.fome === -7 && So.porque(q, 'g').why === 'fome' && So.porque(q, 'g').txt === 'a fome' && So.porque(q, 'm') === null);
    So.puxa(S, q, 'm', 500, 'fe'); So.puxa(S, q, 'f', -500, 'medo');
    check('a índole não passa de 100 nem de −100', q.indole.m === 100 && q.indole.f === -100);
  }
  {
    // o que a vida faz com a índole, dia a dia
    const S = village(42, 8), p = S.people[2], q = S.people[3], kid = add(S, 'F', 'Miúda', 8);
    for (const x of S.people) { boa(x); x.fe = 40; x.mem = []; }
    kid.mother = S.people[0].id; kid.father = S.people[1].id;
    S.people[0].indole = { g: -60, m: -60, f: -60 }; S.people[1].indole = { g: -60, m: -60, f: -60 };
    kid.indole = { g: 40, m: 40, f: 40 };
    Sim.addMem(S, p, 'passouFome'); Sim.addMem(S, q, 'humilhado');
    S.god.align = 20;
    const fiel = S.people[4]; fiel.fe = 90; fiel.indole = { g: -20, m: -20, f: 10 };
    S.safe = false;
    So.daily(S);
    check('um dia de fome fecha a mão (−' + C.IND_FOME + ')', near(p.indole.g, 50 - C.IND_FOME) && p.indole.m === 50);
    check('a humilhação azeda o gênio (−' + C.IND_HUMILHA + ')', near(q.indole.m, 50 - C.IND_HUMILHA) && q.indole.g === 50);
    check('a criança vai ficando parecida com os pais, devagar (' + C.IND_PAIS * 100 + '% do caminho por dia)', near(kid.indole.g, 40 - 100 * C.IND_PAIS) && near(kid.indole.f, 40 - 100 * C.IND_PAIS), kid.indole.g.toFixed(3));
    check('a fé conserta devagar o que está torto, e só isso (o que já é bom fica como está)', near(fiel.indole.g, -20 + C.IND_FE) && near(fiel.indole.m, -20 + C.IND_FE) && fiel.indole.f === 10);
    S.god.align = -40; fiel.indole = { g: -20, m: 0, f: 0 };
    So.daily(S);
    check('com um Deus temido, a fé ensina a esconder (a palavra piora; o resto não melhora)', near(fiel.indole.f, -C.IND_MEDO) && fiel.indole.g === -20);
    fiel.indole = { g: 0, m: 0, f: -C.IND_CHAO };
    So.daily(S);
    check('o que puxa para o mal tem chão (' + -C.IND_CHAO + '): o medo não faz de ninguém um mentiroso sem fundo', fiel.indole.f === -C.IND_CHAO);
    // os contos
    const o = S.people[5]; o.indole = { g: 0, m: 0, f: 0 };
    So.onConto(S, o, 1);
    check('o conto de cuidado abre a mão e amansa', near(o.indole.g, C.IND_CONTO) && near(o.indole.m, C.IND_CONTO) && o.indole.f === 0);
    So.onConto(S, o, -1);
    check('o conto de medo ensina a mentir e azeda', near(o.indole.f, -C.IND_CONTO) && near(o.indole.m, C.IND_CONTO / 2));
    const bomJa = S.people[6]; bomJa.indole = { g: C.IND_TETO, m: C.IND_TETO + 5, f: 50 };
    So.onConto(S, bomJa, 1);
    check('o conto de cuidado para de somar em ' + C.IND_TETO + ' (não faz santo de ninguém)', bomJa.indole.g === C.IND_TETO && bomJa.indole.m === C.IND_TETO + 5);
    So.onConto(S, o, 0);
    check('o conto sem tom não muda ninguém', near(o.indole.f, -C.IND_CONTO));
    // o líder é exemplo para os jovens
    const jov = add(S, 'M', 'Rapaz', 15); jov.indole = { g: 0, m: 0, f: 0 }; jov.fe = 10;
    S.god.align = 0;
    S.soc.lider = S.people[0].id;
    So.daily(S);
    check('o líder de índole ruim puxa os jovens para o lado dele', jov.indole.g < 0 && jov.indole.m < 0 && jov.indole.f < 0, JSON.stringify(jov.indole));
    // quem nasce depois ganha índole sozinho
    const novo = Sim.makePerson(S, 'F', 'Nova', 22); novo.x = S.camp.x + 1; novo.y = S.camp.y + 3; S.people.push(novo); F.init(S); God.init(S); D.init(S);
    So.daily(S);
    check('quem chega (ou nasce) ganha índole no dia seguinte, sem ninguém pedir', !!novo.indole && typeof novo.indole.g === 'number');
  }

  // ---------- C. os crimes ----------
  {
    const S = village(42, 10);
    const r0 = S.rng.s;
    for (let h = 0; h < 24 * 30; h++) { S.t += 60; S.ck = Sim.clock(S.t); Sim.refresh(S); So.hourly(S); }
    check('numa aldeia de gente boa, um mês inteiro passa sem ninguém tentar nada', S.soc.crimes.length === 0 && !S.people.some((p) => p.plano));
    check('e sem gastar o sorteio da simulação (o mundo segue igual ao que era)', S.rng.s === r0);
  }
  {
    // o começo é de paz, e aldeia pequena não tem crime
    const S = village(42, 10, { day: 3 });
    const ruim = S.people[2]; ruim.indole = { g: -100, m: -100, f: -100 };
    Sim.addMem(S, ruim, 'humilhado');
    jump(S, 5, 9);
    for (let h = 0; h < 24 * 20; h++) { S.t += 60; S.ck = Sim.clock(S.t); Sim.refresh(S); So.hourly(S); }
    check('nos primeiros ' + C.SOC_GRACA_D + ' dias, nem o pior tenta nada', S.soc.crimes.length === 0 && !ruim.plano && S.t < C.SOC_GRACA_D * DAYM);
    const S2 = village(42, 4);
    S2.people[2].indole = { g: -100, m: -100, f: -100 };
    for (let h = 0; h < 24 * 30; h++) { S2.t += 60; S2.ck = Sim.clock(S2.t); Sim.refresh(S2); So.hourly(S2); }
    check('com menos de ' + C.SOC_MIN_GENTE + ' pessoas de 12 anos ou mais, também não', S2.soc.crimes.length === 0 && !S2.people[2].plano);
  }
  {
    // quem tem a índole ruim, cedo ou tarde, tenta: a frequência segue a índole
    const S = village(42, 12);
    const eg = S.people[2]; eg.indole = { g: -80, m: 50, f: 50 };
    let planos = 0;
    const dias = 120;
    for (let h = 0; h < 24 * dias; h++) { S.t += 60; S.ck = Sim.clock(S.t); Sim.refresh(S); S.stock.frutas = 80; So.hourly(S); if (eg.plano) { planos++; delete eg.plano; } }
    const esperado = (C.CR_COMIDA * 0.8 + C.CR_FOLGA * 0.8 * 9 / 18 + C.CR_FURTO * 0.8) * dias * 18 / 16;
    check('um egoísta forte (−80) tenta algo de tempos em tempos, na medida da índole', planos > esperado * 0.4 && planos < esperado * 2.2 && planos >= 3, planos + ' vezes em ' + dias + ' dias (esperado perto de ' + esperado.toFixed(0) + ')');
    check('e só ele tenta', !S.people.some((p) => p !== eg && p.plano) && S.soc.crimes.length === 0);
  }
  {
    // comida a mais: do estoque para a barriga
    const S = village(42, 8), p = S.people[2], viu = S.people[3], dorme = S.people[4], longe = S.people[5];
    wake(S);
    put(S, p, walkAt(S, 1, 3)); put(S, viu, walkAt(S, 3, 4)); put(S, dorme, walkAt(S, 2, 5)); dorme.sleeping = true;
    for (const q of S.people) if (q !== p && q !== viu && q !== dorme) put(S, q, farSpot(S, 20));
    p.needs.fome = 30;
    const f0 = S.ctx.food;
    const c = withRng(S, [0.5], () => faz(S, p, 'comida'));
    Sim.refresh(S);
    check('comida a mais: sai do estoque (2 a 4 porções) e mata a fome de quem pegou', !!c && f0 - S.ctx.food === 3 && p.needs.fome === 30 + 3 * 18, (f0 - S.ctx.food) + ' porções');
    check('é um crime leve, anotado com quem fez e onde', c.k === 'comida' && c.g === 1 && c.by === p.id && c.byN === p.name && c.st === 'aberto' && So.GRAV[c.g] === 'leve');
    check('quem estava acordado a até ' + C.SOC_VER + ' passos viu; quem dormia e quem estava longe, não', c.wit.length === 1 && c.wit[0] === viu.id, JSON.stringify(c.wit));
    check('com testemunha que conta, o povo sabe quem foi', c.known === 1);
    check('a primeira vez vai para a crônica, com o lembrete de que você vê tudo', chronHas(S, /Pela primeira vez, alguém do povo fez o que não devia/) && chronHas(S, /o povo só sabe o que alguém viu/));
    // ninguém viu
    put(S, viu, farSpot(S, 20));
    S.events.length = 0;
    const c2 = withRng(S, [0], () => faz(S, p, 'comida'));
    check('sem ninguém por perto, só Deus viu', c2.wit.length === 0 && c2.known === 0 && So.crimesInfo(S).find((x) => x.id === c2.id).soVoce && /Só você/.test(So.crimesInfo(S).find((x) => x.id === c2.id).povo));
    check('e o aviso diz isso ao jogador', S.events.some((e) => e.k === 'toast' && /^Só você viu: /.test(e.text)));
    check('com o estoque folgado, o povo nem nota a falta', c2.dano === 0);
    S.events.length = 0;
    const c3 = withRng(S, [0], () => faz(S, p, 'comida'));
    check('o mesmo crime leve, pela terceira vez, não repete o aviso (fica só na lista)', !!c3 && !S.events.some((e) => e.k === 'toast'));
    for (const k of T.FOOD) S.stock[k] = 0;
    S.stock.frutas = 6; Sim.refresh(S);
    const c4 = withRng(S, [0], () => faz(S, p, 'comida'));
    check('com a comida contada, a falta aparece (o povo nota, sem saber de quem)', !!c4 && c4.dano === 1 && c4.known === 0);
    for (const k of T.FOOD) S.stock[k] = 0;
    Sim.refresh(S);
    check('sem comida no estoque, não há o que pegar', faz(S, p, 'comida') === null && !p.plano);
  }
  {
    // quem viu, e quem conta
    const S = village(42, 10), p = S.people[2], par = S.people[3], filho = add(S, 'M', 'Filhote', 8), amigo = S.people[5], outro = S.people[6], vit = S.people[7], bebe = add(S, 'F', 'Nenê', 4);
    wake(S);
    F.link(S, p, par, 60); filho.mother = p.sex === 'F' ? p.id : par.id; filho.father = p.sex === 'F' ? par.id : p.id;
    const at = walkAt(S, 2, 4);
    for (const q of [p, par, filho, amigo, outro, vit, bebe]) put(S, q, at);
    for (const q of S.people) if ([p, par, filho, amigo, outro, vit, bebe].indexOf(q) < 0) put(S, q, farSpot(S, 22));
    amigo.indole = { g: 50, m: 50, f: -60 }; amigo.rel[p.id] = 9;
    let c = withRng(S, [0], () => faz(S, p, 'comida', null));
    check('criança de menos de 6 anos não conta como testemunha', c.wit.indexOf(bebe.id) < 0 && c.wit.indexOf(filho.id) >= 0);
    // só o par viu
    for (const q of [filho, amigo, outro, vit]) q.sleeping = true;
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('o par de quem fez viu e calou: o povo não fica sabendo', c.wit.length === 1 && c.wit[0] === par.id && c.known === 0);
    par.sleeping = true; amigo.sleeping = false;
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('o mentiroso amigo de quem fez também cala', c.wit.length === 1 && c.wit[0] === amigo.id && c.known === 0);
    amigo.sleeping = true; filho.sleeping = false;
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('a criança conta tudo, mesmo sendo filha de quem fez', c.wit[0] === filho.id && c.known === 1);
    filho.sleeping = true; outro.sleeping = false;
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('quem não deve nada a quem fez, conta', c.known === 1);
    // de noite se vê menos
    outro.sleeping = false; put(S, outro, { x: S.camp.x + 1 + 5, y: S.camp.y + 1 });   // a 5 passos do estoque, onde a comida é pega
    jump(S, S.ck.day, 23);
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('de noite só vê quem está quase em cima (' + C.SOC_VER_NOITE + ' passos, contra ' + C.SOC_VER + ' de dia)', c.wit.length === 0);
    jump(S, S.ck.day + 1, 10);
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('de dia, a 5 passos, vê', c.wit.indexOf(outro.id) >= 0);
    // dentro da barraca não vê
    outro.inTent = S.buildings.find((b) => b.type === 'barraca').id;
    c = withRng(S, [0], () => faz(S, p, 'comida'));
    check('quem está dentro da barraca não vê', c.wit.indexOf(outro.id) < 0);
    // o par cala, a não ser que a vítima também seja dele
    outro.inTent = 0; outro.sleeping = true; par.sleeping = false; vit.sleeping = false;
    par.mother = 0; vit.mother = par.id;     // a vítima é filha do par
    put(S, vit, at);
    c = withRng(S, [0.5], () => faz(S, p, 'surra', vit));
    check('se quem apanhou é filho da testemunha, ela conta, mesmo sendo par de quem bateu', c.wit.indexOf(par.id) >= 0 && c.known === 1);
  }
  {
    // roubo
    const S = village(42, 8), p = S.people[2];
    wake(S);
    for (const q of S.people) if (q !== p) put(S, q, farSpot(S, 20));
    put(S, p, walkAt(S, 1, 3));
    S.stock.joias = 2; S.stock.ferro = 1; S.stock.ferramentas = 5;
    const c = faz(S, p, 'furto');
    check('o ladrão prefere a joia; ela sai do estoque e fica escondida com ele', !!c && S.stock.joias === 1 && p.furto.k === 'joias' && p.furto.n === 1 && !p.joia && /uma joia do estoque/.test(So.crimeTxt(c)));
    check('roubo é crime médio, e deixa marca: o povo nota a falta mesmo sem ter visto', c.g === 2 && c.dano === 1 && c.known === 0 && /notou, mas não sabe quem foi/.test(So.crimesInfo(S)[0].povo));
    S.stock.joias = 0;
    const c2 = faz(S, p, 'furto');
    check('sem joia, leva a ferramenta de ferro', S.stock.ferro === 0 && p.furto.k === 'ferro' && /ferramenta de ferro/.test(So.crimeTxt(c2)));
    const c3 = faz(S, p, 'furto');
    check('sem ferro, leva até duas ferramentas de pedra', S.stock.ferramentas === 3 && p.furto.n === 2 && /2 ferramentas do estoque/.test(So.crimeTxt(c3)));
    S.stock.ferramentas = 0;
    check('sem nada que valha, não há roubo', faz(S, p, 'furto') === null);
    check('todo crime médio avisa o jogador', S.events.filter((e) => e.k === 'toast' && /roubou/.test(e.text)).length >= 2);
  }
  {
    // surra, ferimento e morte
    const S = village(42, 10), p = S.people[2], v = S.people[3], viu = S.people[4];
    wake(S);
    const at = walkAt(S, 2, 4);
    for (const q of S.people) put(S, q, q === p || q === v || q === viu ? at : farSpot(S, 22));
    v.needs.saude = 100;
    const c = withRng(S, [0.5], () => faz(S, p, 'surra', v));
    const d = (C.SURRA_DANO[0] + C.SURRA_DANO[1]) / 2;
    check('a surra tira de ' + C.SURRA_DANO[0] + ' a ' + C.SURRA_DANO[1] + ' de saúde', !!c && near(v.needs.saude, 100 - d), v.needs.saude);
    check('quem apanhou sabe quem foi (e quem viu fica marcado)', c.g === 2 && c.vic === v.id && c.known === 1 && c.wit.indexOf(v.id) >= 0 && hasMem(v, 'apanhou') && hasMem(viu, 'viuCrime') && !hasMem(v, 'viuCrime'));
    check('os dois ficam brigados por 10 dias, e a rixa fica anotada', F.feuding(S, p, v) && near((p.feud[v.id] - S.t) / DAYM, 10) && p.rixa[v.id] === 1 && v.rixa[p.id] === 1);
    check('apanhar azeda o gênio de quem apanhou, e deixa o descontentamento', v.indole.m < 50 && v.indAc.m.apanhou < 0 && v.desc === 8);
    v.needs.saude = 22;
    withRng(S, [0.5], () => faz(S, p, 'surra', v));
    check('a surra não mata: a saúde não cai abaixo de ' + C.SURRA_MIN, v.needs.saude === C.SURRA_MIN, v.needs.saude);
    v.needs.saude = 100;
    const c2 = withRng(S, [0.5], () => faz(S, p, 'ferir', v));
    check('ferir de propósito é grave: tira de ' + C.FERIR_DANO[0] + ' a ' + C.FERIR_DANO[1], c2.g === 3 && near(v.needs.saude, 100 - (C.FERIR_DANO[0] + C.FERIR_DANO[1]) / 2) && hasMem(v, 'feridoProp'));
    check('crime grave que o povo viu vai para a crônica', chronHas(S, new RegExp(p.name + ' feriu ' + v.name + ' de propósito')));
    v.needs.saude = 10;
    withRng(S, [0.5], () => faz(S, p, 'ferir', v));
    check('o ferimento sozinho não mata (mínimo ' + C.FERIR_MIN + ')', v.needs.saude === C.FERIR_MIN && v.alive);
    // longe demais na hora: não acontece
    put(S, v, farSpot(S, 22));
    check('se a pessoa não está mais ali, nada acontece', faz(S, p, 'surra', v) === null);
    // a morte
    put(S, v, at); v.needs.saude = 100; viu.sleeping = false;
    const n0 = alive(S).length;
    const c3 = faz(S, p, 'matar', v);
    Sim.step(S, 2);
    check('matar: a vítima morre no mesmo passo, e a causa fica dita', !v.alive && v.cause === 'crime' && alive(S).length === n0 - 1 && c3.g === 3 && AI.describe(S, v) === 'Morreu pelas mãos de outra pessoa');
    check('quem viu não esquece; o morto não é testemunha', c3.wit.indexOf(v.id) < 0 && c3.wit.indexOf(viu.id) >= 0 && hasMem(viu, 'viuMorte') && c3.known === 1);
    check('a crônica conta as duas coisas: quem matou e a morte', chronHas(S, new RegExp(p.name + ' matou ' + v.name)) && chronHas(S, new RegExp(v.name + ' morreu pelas mãos de outra pessoa')));
    check('o corpo espera o velório, como qualquer morto (Etapa 13)', !!v.corpo);
    check('uma morte assim assusta: o descontentamento de todos sobe', S.people.filter((q) => q.alive && q !== p && F.age(S, q) >= 16).every((q) => (q.desc || 0) >= 6));
    // ninguém viu
    const p2 = S.people[5], v2 = S.people[6];
    wake(S);
    for (const q of S.people) if (q.alive) put(S, q, q === p2 || q === v2 ? walkAt(S, -4, 6) : farSpot(S, 22));
    v2.sleeping = true;
    S.chron.length = 0;
    const c4 = faz(S, p2, 'ferir', v2);
    check('quem apanha dormindo não sabe de quem: ninguém viu, só Deus', c4.wit.length === 0 && c4.known === 0 && c4.dano === 1 && S.chron.some((x) => x.god && /Ninguém viu, mas/.test(x.text)));
  }
  {
    // o fogo posto
    const S = village(42, 10), p = S.people[2], inim = S.people[3];
    wake(S);
    const casa = S.buildings.find((b) => b.type === 'barraca' && b.built);
    casa.beds = [inim.id];
    p.feud = {}; p.feud[inim.id] = S.t + 5 * DAYM;
    const pl = So.planejar(S, p, 'fogo');
    check('o incendiário mira a casa do desafeto, e espera a noite', !!pl && pl.bid === casa.id && pl.noite === 1);
    check('de dia ele não vai; de noite, sim', So.want(S, p) === null && (() => { jump(S, S.ck.day, 23); const w = So.want(S, p); return !!w && w.k === 'crime'; })());
    const nb = S.buildings.length;
    for (const q of S.people) if (q !== p) { q.sleeping = true; }
    const c = So.cometer(S, p);
    check('pôs fogo: a obra arde, o crime é grave e o jogador é avisado (a Chuva apaga)', !!c && casa.fogo === S.t && c.g === 3 && c.bid === casa.id && /pôs fogo na barraca/.test(p.name + ' ' + So.crimeTxt(c)) && S.events.some((e) => e.k === 'toast' && /A Chuva apaga na hora/.test(e.text)) && S.events.some((e) => e.k === 'soc' && e.ev === 'fogo' && e.on));
    check('enquanto arde, a Sociedade pede o passo a passo', So.busy(S) === true);
    // todo mundo dormindo e sem água: queima
    S.stock.agua = 0; S.events.length = 0;
    S.precip = ''; S.god.rainUntil = 0;
    S.t += C.FOGO_MIN + 2; S.ck = Sim.clock(S.t);
    withRng(S, [0.99], () => So.tick(S));
    check('ninguém acordou, não havia água: o fogo levou a casa', S.buildings.length === nb - 1 && !S.buildings.includes(casa) && S.soc.cinzas.length === 1 && S.soc.cinzas[0].x === casa.x && chronHas(S, /O fogo levou a barraca simples/) && chronHas(S, new RegExp(inim.name + ' ficou sem teto')));
    check('quem morava ali fica marcado e descontente', hasMem(inim, 'incendio') && inim.desc >= 10);
    check('depois de apagado ou queimado, o passo a passo para', !So.busy(S));
    // com gente acordada e água, apagam
    const S2 = village(42, 10), p2 = S2.people[2], casa2 = S2.buildings.find((b) => b.type === 'barraca' && b.built);
    wake(S2);
    for (const q of S2.people) put(S2, q, walkAt(S2, 2, 4));
    p2.plano = { k: 'fogo', bid: casa2.id, t: S2.t, ate: S2.t + 600 };
    So.cometer(S2, p2);
    S2.stock.agua = 20; S2.precip = ''; S2.god.rainUntil = 0;
    S2.t += C.FOGO_MIN + 2; S2.ck = Sim.clock(S2.t);
    const n2 = S2.buildings.length;
    withRng(S2, [0.5], () => So.tick(S2));
    check('com gente acordada por perto e água no estoque, o povo apaga (e gasta ' + C.FOGO_AGUA + ' de água)', S2.buildings.length === n2 && !casa2.fogo && S2.stock.agua === 20 - C.FOGO_AGUA && S2.soc.cinzas.length === 0);
    // a chuva apaga na hora
    const S3 = village(42, 10), p3 = S3.people[2], casa3 = S3.buildings.find((b) => b.type === 'barraca' && b.built);
    p3.plano = { k: 'fogo', bid: casa3.id, t: S3.t, ate: S3.t + 600 };
    So.cometer(S3, p3);
    S3.god.rainUntil = S3.t + 600;
    So.tick(S3);
    check('a Chuva (ou a chuva do céu) apaga na hora, sem gastar água', !casa3.fogo && S3.buildings.includes(casa3) && S3.events.some((e) => e.k === 'toast' && /A chuva apagou o fogo/.test(e.text)));
    // o armazém leva comida junto
    const S4 = village(42, 10), p4 = S4.people[2];
    S4.stats.winters = 1;
    const arm = build(S4, 'armazem');
    S4.stock.frutas = 100; S4.stock.peixe = 50; S4.stock.agua = 0;
    for (const q of S4.people) q.sleeping = true;
    p4.sleeping = false;
    p4.plano = { k: 'fogo', bid: arm.id, t: S4.t, ate: S4.t + 600 };
    So.cometer(S4, p4);
    S4.precip = ''; S4.god.rainUntil = 0;
    S4.t += C.FOGO_MIN + 2; S4.ck = Sim.clock(S4.t);
    withRng(S4, [0.99], () => So.tick(S4));
    check('o armazém que queima leva ' + C.FOGO_COMIDA * 100 + '% da comida', S4.stock.frutas === 70 && S4.stock.peixe === 35 && !S4.buildings.includes(arm));
    // o que não pega fogo
    const S5 = village(42, 10), p5 = S5.people[2];
    for (const b of S5.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S5, b);
    check('fogueira não pega fogo: sem obra de madeira e palha, não há incêndio', So.planejar(S5, p5, 'fogo') === null && !p5.plano);
    // quem dorme dentro da obra acorda com o fogo e sai (e conta como gente acordada por perto)
    const S6 = village(42, 10), p6 = S6.people[2], mora = S6.people[3], fora6 = S6.people[4];
    jump(S6, S6.ck.day, 23);
    const casa6 = S6.buildings.find((b) => b.type === 'barraca' && b.built && b.beds && b.beds.indexOf(mora.id) >= 0) || S6.buildings.find((b) => b.type === 'barraca' && b.built);
    mora.needs.energia = 5; mora.fail = {};
    AI.decideType(S6, mora, 'dormir');
    for (let i = 0; i < 200 && !(mora.sleeping && mora.inTent); i++) AI.tick(S6, mora, 2);
    const dentro = mora.inTent;
    fora6.sleeping = true;      // dorme ao relento, longe: não acorda
    const alvo6 = S6.buildings.find((b) => b.id === dentro);
    p6.plano = { k: 'fogo', bid: dentro, t: S6.t, ate: S6.t + 600 };
    const c6 = So.cometer(S6, p6);
    check('quem dormia dentro da obra acorda com o fogo e sai', !!dentro && !!c6 && !mora.sleeping && !mora.inTent && mora.fail.dormir > S6.t + C.FOGO_MIN, 'dentro de ' + dentro + ', dormindo ' + mora.sleeping);
    check('quem dormia em outro lugar segue dormindo', fora6.sleeping === true);
    check('o morador acordado conta para apagar o fogo', (() => { S6.stock.agua = 20; S6.precip = ''; S6.god.rainUntil = 0; for (const q of S6.people) if (q !== mora && q !== p6) { q.sleeping = true; } p6.x = S6.camp.x + 40; mora.x = alvo6.x + 1.5; mora.y = alvo6.y + alvo6.h + 0.5; mora.sleeping = false; S6.t += C.FOGO_MIN + 2; S6.ck = Sim.clock(S6.t); const n = S6.buildings.length; withRng(S6, [0.29], () => So.tick(S6)); return S6.buildings.length === n && !alvo6.fogo; })());
  }
  {
    // a mentira
    const S = village(42, 10), p = S.people[2], foe = S.people[3];
    wake(S);
    for (const q of S.people) put(S, q, farSpot(S, 20));
    put(S, p, walkAt(S, 1, 3));
    S.stock.joias = 1;
    const c = faz(S, p, 'furto');
    p.feud = {}; p.feud[foe.id] = S.t + 3 * DAYM;
    const m = So.mentir(S, p);
    check('quem roubou sem ser visto joga a culpa no desafeto', !!m && m.k === 'mentira' && m.g === 1 && m.culpa === 1 && c.sus === foe.id && c.acus === p.id && /jogou em .* a culpa do que fez/.test(So.crimeTxt(m)));
    check('ninguém vê uma mentira: só Deus sabe', m.wit.length === 0 && m.known === 0);
    check('a lista mostra de quem o povo desconfia', /Desconfiam de /.test(So.crimesInfo(S).find((x) => x.id === c.id).povo) && So.crimesInfo(S).find((x) => x.id === c.id).sus === foe.name);
    const m2 = So.mentir(S, p);
    check('sem crime para esconder, o mentiroso inventa coisas do desafeto: a fama fica', !!m2 && !m2.culpa && hasMem(foe, 'difamado') && foe.ficha === 0.5 && /inventou coisas sobre/.test(So.crimeTxt(m2)));
    // sem desafeto nem ninguém de fora, não há em quem jogar
    const S2 = village(42, 10), p2 = S2.people[2];
    for (const q of S2.people) if (q !== p2) p2.rel[q.id] = 20;
    check('numa aldeia onde ele gosta de todo mundo, não há em quem pôr a culpa', So.mentir(S2, p2) === null);
    // quem é de fora leva a culpa
    const elfo = add(S2, 'M', 'Taliel', 30, 'elfo');
    boa(elfo);
    for (const q of S2.people) if (q !== p2) p2.rel[q.id] = 2;
    S2.povos.mixed = true; S2.povos.conv['elfo|humano'] = 5;
    const m3 = So.mentir(S2, p2);
    check('com a convivência baixa, a mentira cai em quem é de outro povo', !!m3 && m3.vic === elfo.id, m3 ? m3.vicN : '-');
  }
  {
    // do plano ao ato, pela IA: vai até o estoque e pega
    const S = village(42, 8), p = S.people[2];
    wake(S);
    p.indole = { g: -80, m: 50, f: 50 };
    put(S, p, walkAt(S, 6, 6));
    for (const q of S.people) if (q !== p) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 95; }
    p.needs.fome = 60; p.needs.sede = 95; p.needs.energia = 95;
    const pl = So.planejar(S, p, 'comida');
    const w = So.want(S, p);
    check('com um plano na cabeça, a IA recebe a tarefa (acima de qualquer trabalho)', !!pl && !!w && w.k === 'crime' && w.score > C.WORK_CAP);
    const f0 = S.ctx.food;
    let viuIndo = false, txtIndo = '';
    run(S, 120, () => { if (doing(p, 'crime') && p.act.stage === 'go') { viuIndo = true; txtIndo = AI.describe(S, p); } return S.soc.crimes.length === 0; });
    check('ele anda até o estoque e pega a comida', viuIndo && S.soc.crimes.length === 1 && S.soc.crimes[0].k === 'comida' && !p.plano, S.soc.crimes.length + ' crimes');
    check('a tela mostra a você o que ele está indo fazer', txtIndo === 'Indo pegar comida escondido', txtIndo);
    // o plano caduca
    const p2 = S.people[3];
    So.planejar(S, p2, 'folga');
    S.t += 4 * 60; S.ck = Sim.clock(S.t);
    check('plano que não foi cumprido a tempo é esquecido', So.want(S, p2) === null && !p2.plano);
    // a fuga do trabalho: some por duas horas e meia
    const p3 = S.people[4];
    put(S, p3, walkAt(S, 2, 4));
    jump(S, S.ck.day + 1, 9);
    p3.needs.fome = 95; p3.needs.sede = 95; p3.needs.energia = 60;
    So.planejar(S, p3, 'folga');
    const n0 = S.soc.crimes.length;
    let longe = 0, txt = '';
    run(S, 200, () => { if (doing(p3, 'crime') && p3.act.stage === 'stay') { longe = Math.max(longe, Math.hypot(p3.x - S.camp.x - 1, p3.y - S.camp.y - 1)); txt = AI.describe(S, p3); } return S.soc.crimes.length === n0; });
    const c = S.soc.crimes[S.soc.crimes.length - 1];
    check('fuga do trabalho: vai para longe do estoque e fica à toa', S.soc.crimes.length === n0 + 1 && c.k === 'folga' && longe > 5 && txt === 'Escondido, sem fazer nada', longe.toFixed(1) + ' passos · ' + txt);
    // o ladrão acorda de madrugada
    const p4 = S.people[5];
    wake(S);
    S.stock.joias = 1;
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 60; }
    jump(S, S.ck.day, 21.5);
    So.planejar(S, p4, 'furto');
    const n1 = S.soc.crimes.length;
    run(S, 30 * 9, () => S.soc.crimes.length === n1);
    const cf = S.soc.crimes[S.soc.crimes.length - 1];
    check('o ladrão age de noite: levanta, vai ao estoque e leva a joia', S.soc.crimes.length === n1 + 1 && cf.k === 'furto' && (S.ck.hour >= 21 || S.ck.hour < 5) && S.stock.joias === 0, 'às ' + S.ck.hour.toFixed(1) + ' h');
  }
  {
    // a surra pela IA: vai atrás da pessoa
    const S = village(42, 8), p = S.people[2], v = S.people[3];
    wake(S);
    p.indole = { g: 50, m: -80, f: 50 };
    put(S, p, walkAt(S, 6, 6)); put(S, v, walkAt(S, -3, 5));
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 95; }
    p.feud = {}; p.feud[v.id] = S.t + 3 * DAYM; v.feud = {}; v.feud[p.id] = S.t + 3 * DAYM;
    So.planejar(S, p, 'surra', v.id);
    run(S, 200, () => S.soc.crimes.length === 0);
    check('quem quer bater vai atrás da pessoa, onde ela estiver, e bate', S.soc.crimes.length === 1 && S.soc.crimes[0].k === 'surra' && S.soc.crimes[0].vic === v.id && hasMem(v, 'apanhou'));
    // quem está dentro de casa está a salvo
    const p2 = S.people[4], v2 = S.people[5];
    p2.feud = {}; p2.feud[v2.id] = S.t + 3 * DAYM;
    v2.inTent = S.buildings.find((b) => b.type === 'barraca').id; v2.sleeping = true;
    So.planejar(S, p2, 'surra', v2.id);
    check('quem dorme dentro de casa está a salvo: o agressor espera', So.task(S, p2, 'crime') === null && !!p2.plano);
    // o planejador escolhe o desafeto, e só de 14 anos para cima
    const S2 = village(42, 12), b = S2.people[2], kid = add(S2, 'M', 'Moleque', 8), ad = S2.people[4];
    b.indole = { g: 50, m: -100, f: 50 };
    b.feud = {}; b.feud[kid.id] = S2.t + 9 * DAYM;
    let planos = [];
    for (let h = 0; h < 24 * 200; h++) { S2.t += 60; S2.ck = Sim.clock(S2.t); Sim.refresh(S2); b.feud[kid.id] = S2.t + 9 * DAYM; So.hourly(S2); if (b.plano) { planos.push(b.plano); delete b.plano; } }
    check('ninguém planeja bater em criança (o desafeto tem de ter 14 anos ou mais)', planos.length === 0, planos.map((x) => x.k).join(','));
    b.feud = {}; b.feud[ad.id] = S2.t + 9 * DAYM;
    for (let h = 0; h < 24 * 200; h++) { S2.t += 60; S2.ck = Sim.clock(S2.t); Sim.refresh(S2); b.feud[ad.id] = S2.t + 9 * DAYM; So.hourly(S2); if (b.plano) { planos.push(b.plano); delete b.plano; } }
    check('brigado com um adulto, o violento acaba indo tirar satisfação', planos.length >= 3 && planos.every((x) => x.k === 'surra' && x.vic === ad.id), planos.length + ' planos');
    b.rixa = {}; b.rixa[ad.id] = 2;
    planos = [];
    for (let h = 0; h < 24 * 400; h++) { S2.t += 60; S2.ck = Sim.clock(S2.t); Sim.refresh(S2); b.feud[ad.id] = S2.t + 9 * DAYM; So.hourly(S2); if (b.plano) { planos.push(b.plano.k); delete b.plano; } }
    check('com rixa antiga e o gênio no pior, aparecem o ferimento e (raro) a morte', planos.indexOf('ferir') >= 0 && planos.filter((k) => k === 'surra').length > planos.filter((k) => k === 'matar').length, planos.filter((k) => k === 'surra').length + ' surras, ' + planos.filter((k) => k === 'ferir').length + ' ferimentos, ' + planos.filter((k) => k === 'matar').length + ' mortes');
    // a briga comum (life.js): o violento guarda a raiva por mais tempo; quem é manso, o de sempre
    {
      const Sb = village(42, 8), vi = Sb.people[2], ma = Sb.people[3];
      vi.indole = { g: 50, m: -40, f: 50 };
      const d = { kind: 'briga', lines: [{ by: 0, text: 'a' }, { by: 1, text: 'b' }] };
      withRng(Sb, [0.5], () => L.afterChat(Sb, vi, ma, d));
      const base = Math.round((C.FEUD_DAYS[0] + 0.5 * (C.FEUD_DAYS[1] - C.FEUD_DAYS[0])) * DAYM);
      check('depois de uma briga, o violento guarda a raiva ' + C.RANCOR + ' vezes mais tempo; o manso, o de sempre', near(vi.feud[ma.id] - Sb.t, base * C.RANCOR, 2) && near(ma.feud[vi.id] - Sb.t, base, 2), ((vi.feud[ma.id] - Sb.t) / DAYM).toFixed(1) + ' e ' + ((ma.feud[vi.id] - Sb.t) / DAYM).toFixed(1) + ' dias');
      check('e os dois se evitam enquanto a raiva de um deles durar', L.avoid(Sb, vi, ma) && (() => { const t = Sb.t; Sb.t = ma.feud[vi.id] + 60; const r = L.avoid(Sb, ma, vi); Sb.t = t; return r; })());
      const Sc2 = village(42, 8), m1 = Sc2.people[2], m2 = Sc2.people[3];
      withRng(Sc2, [0.5], () => L.afterChat(Sc2, m1, m2, d));
      check('entre dois mansos, a briga dura o de sempre', near(m1.feud[m2.id] - Sc2.t, base, 2) && near(m2.feud[m1.id] - Sc2.t, base, 2));
    }
    // os limiares: ferir pede o gênio em CR_M_FERIR e uma surra antes; matar, CR_M_MATAR e duas
    const S4 = village(42, 12), b4 = S4.people[2], ad4 = S4.people[4];
    const tenta = (m, rx, horas) => { b4.indole = { g: 50, m, f: 50 }; b4.rixa = {}; if (rx) b4.rixa[ad4.id] = rx; delete b4.semViol; const out = []; for (let h = 0; h < horas; h++) { S4.t += 60; S4.ck = Sim.clock(S4.t); Sim.refresh(S4); b4.feud = {}; b4.feud[ad4.id] = S4.t + 9 * DAYM; So.hourly(S4); if (b4.plano) { out.push(b4.plano.k); delete b4.plano; } } return out; };
    const semRixa = tenta(-100, 0, 24 * 300), brando = tenta(C.CR_M_FERIR + 5, 2, 24 * 300), meio = tenta(C.CR_M_MATAR + 5, 2, 24 * 300);
    check('sem surra antes entre os dois, o mais violento só bate', semRixa.length >= 5 && semRixa.every((k) => k === 'surra'), semRixa.length + ' planos');
    check('com o gênio acima de ' + C.CR_M_FERIR + ', mesmo com rixa antiga, não fere nem mata (bate, e pode pôr fogo na casa do desafeto)', brando.length >= 3 && brando.every((k) => k === 'surra' || k === 'fogo') && brando.indexOf('surra') >= 0, brando.length + ' planos');
    check('entre ' + C.CR_M_FERIR + ' e ' + C.CR_M_MATAR + ', fere mas não mata', meio.indexOf('ferir') >= 0 && meio.indexOf('matar') < 0, meio.filter((k) => k === 'ferir').length + ' ferimentos');
    // o fogo por rixa de sangue: só com o gênio em CR_M_FOGO ou pior, e só quando já houve golpe entre os dois
    const fogoRixa = tenta(C.CR_M_FOGO - 2, 1, 24 * 400), fogoManso = tenta(C.CR_M_FOGO + 5, 1, 24 * 400);
    check('com rixa de sangue e o gênio em ' + C.CR_M_FOGO + ' ou pior, o fogo na casa do desafeto entra nos planos', fogoRixa.indexOf('fogo') >= 0, fogoRixa.filter((k) => k === 'fogo').length + ' de ' + fogoRixa.length);
    check('acima disso, ou sem golpe antes entre os dois, ninguém pensa em fogo', fogoManso.indexOf('fogo') < 0 && semRixa.indexOf('fogo') < 0);
    // a pausa depois de um golpe: quem acabou de bater esfria VIOL_PAUSA_D dias, mesmo ainda brigado
    const S3 = village(42, 12), bt = S3.people[2], al = S3.people[4];
    wake(S3);
    bt.indole = { g: 50, m: -100, f: 50 };
    put(S3, bt, walkAt(S3, 1, 3)); put(S3, al, walkAt(S3, 2, 3));
    bt.feud = {}; bt.feud[al.id] = S3.t + 30 * DAYM;
    const c3 = withRng(S3, [0.5], () => faz(S3, bt, 'surra', al));
    check('depois de bater, a pessoa esfria por ' + C.VIOL_PAUSA_D + ' dias', !!c3 && bt.semViol === S3.t + C.VIOL_PAUSA_D * DAYM);
    c3.st = 'fechado';      // (sem julgamento no meio: o que interessa aqui é a pausa)
    let cedo = 0, tarde = 0;
    for (let h = 0; h < 24 * C.VIOL_PAUSA_D - 2; h++) { S3.t += 60; S3.ck = Sim.clock(S3.t); Sim.refresh(S3); bt.feud[al.id] = S3.t + 9 * DAYM; So.hourly(S3); if (bt.plano) { cedo++; delete bt.plano; } }
    for (let h = 0; h < 24 * 60; h++) { S3.t += 60; S3.ck = Sim.clock(S3.t); Sim.refresh(S3); bt.feud[al.id] = S3.t + 9 * DAYM; So.hourly(S3); if (bt.plano) { tarde++; delete bt.plano; } }
    check('nesses dias não levanta a mão de novo, mesmo brigado; depois, pode', cedo === 0 && tarde >= 1, cedo + ' planos na pausa, ' + tarde + ' depois');
  }

  // ---------- D. o julgamento ao pé do fogo ----------
  {
    // o que é leve se resolve com uma bronca
    const S = village(42, 10), p = S.people[2], viu = S.people[3], lider = S.people[0];
    wake(S);
    S.soc.lider = lider.id;
    put(S, p, walkAt(S, 1, 3)); put(S, viu, walkAt(S, 2, 3));
    const c = withRng(S, [0], () => faz(S, p, 'comida'));
    jump(S, S.ck.day, C.JULG_H - 0.5);
    S.events.length = 0;
    S.t += 60; S.ck = Sim.clock(S.t); Sim.refresh(S);
    So.hourly(S);
    check('à tardinha, o líder dá uma bronca em quem pegou comida a mais (sem reunir o povo)', c.st === 'julgado' && c.pena === 'bronca' && c.cond === p.id && c.juiz === lider.id && !S.soc.julg && hasMem(p, 'humilhado') && p.ficha === 1);
    check('a bronca fica na lista e conta como julgamento', S.stats.julgamentos === 1 && /levou uma bronca/.test(So.crimesInfo(S)[0].povo) && S.events.some((e) => e.k === 'toast' && /levou uma bronca de/.test(e.text)));
    check('e já ensina um pouco (a mão abre 2 pontos)', near(p.indole.g, 52) && p.indAc.g.pena === 2);
    // o que ninguém viu não tem bronca
    const c2 = (() => { put(S, viu, farSpot(S, 20)); for (const q of S.people) if (q !== p) put(S, q, farSpot(S, 20)); return withRng(S, [0], () => faz(S, p, 'comida')); })();
    jump(S, S.ck.day + 1, C.JULG_H);
    So.chamar(S);
    check('o crime leve que ninguém viu fica sem resposta do povo', c2.st === 'aberto' && !S.soc.julg);
    // sem líder, o mais velho faz as vezes
    const S2 = village(42, 10), p2 = S2.people[2], velho = S2.people[5];
    wake(S2);
    setAge(S2, velho, 58);
    put(S2, p2, walkAt(S2, 1, 3)); put(S2, S2.people[3], walkAt(S2, 2, 3));
    const c3 = withRng(S2, [0], () => faz(S2, p2, 'comida'));
    jump(S2, S2.ck.day, C.JULG_H);
    So.chamar(S2);
    check('sem líder, quem dá a bronca é o mais velho', c3.st === 'julgado' && c3.juiz === velho.id);
  }
  {
    // o julgamento de um roubo visto: o povo vem, ouve e condena
    const S = village(42, 12), p = S.people[2], viu = S.people[3], lider = S.people[0];
    wake(S);
    S.soc.lider = lider.id;
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    put(S, p, walkAt(S, 1, 3)); put(S, viu, walkAt(S, 2, 3));
    S.stock.joias = 1;
    const c = faz(S, p, 'furto');
    check('o roubo foi visto: vai a julgamento', c.known === 1 && /vai a julgamento/.test(So.crimesInfo(S)[0].povo));
    jump(S, S.ck.day, C.JULG_H - 0.02);
    const evs = [];
    let veio = 0, txtAcc = '', txtPovo = '', falou = {}, semHist = true;
    run(S, 30 * 4, (S_) => {
      for (const e of S_.events) if (e.k === 'soc' || e.k === 'toast') evs.push(e);
      const J = S_.soc.julg;
      if (J) {
        veio = Math.max(veio, Object.keys(J.foi).length);
        if (doing(p, 'julgar')) txtAcc = AI.describe(S_, p);
        if (doing(viu, 'julgar') && viu.act.stage === 'stay') txtPovo = AI.describe(S_, viu);
        if (S_.life.story) semHist = false;
        for (const q of S_.people) if (q.say && q.sayAt === S_.t) falou[q.id] = q.say;
      }
      return c.st === 'aberto';
    });
    check('às ' + C.JULG_H + ' h o líder chama o povo para o pé do fogo', evs.some((e) => e.k === 'toast' && new RegExp(lider.name + ' chamou o povo para o pé do fogo. Vão julgar ' + p.name).test(e.text)) && evs.some((e) => e.k === 'soc' && e.ev === 'julg' && e.on));
    check('o povo vem e fica em volta do fogo', veio >= 8, veio + ' de ' + S.people.length);
    check('a tela diz quem está sendo julgado e quem assiste', /Sendo julgad[oa] ao pé do fogo|Indo para o próprio julgamento/.test(txtAcc) && txtPovo === 'No julgamento de ' + p.name, txtAcc + ' · ' + txtPovo);
    check('falam o líder, alguém que viu e o acusado', !!falou[lider.id] && c.wit.some((id) => !!falou[id]) && !!falou[p.id], Object.keys(falou).length + ' falaram');
    check('com testemunha, o povo condena', c.st === 'julgado' && c.cond === p.id && c.votos[0] > c.votos[1], JSON.stringify(c.votos));
    check('a pena do roubo: devolver e ' + C.PENA_DIAS.furto + ' dias de trabalho', c.pena === 'trabalho' && c.dias === C.PENA_DIAS.furto && c.devolveu === 1 && S.stock.joias === 1 && !p.furto && !!p.pena && near((p.pena.ate - S.t) / DAYM, C.PENA_DIAS.furto, 0.01));
    check('o julgamento termina e o povo se dispersa', !S.soc.julg && evs.some((e) => e.k === 'soc' && e.ev === 'julg' && !e.on && e.cond === 1) && !So.busy(S));
    check('noite de julgamento não tem história', semHist && So.blockStory(S) === false);
    check('quem viu sente que a justiça foi feita; o condenado, a vergonha', hasMem(viu, 'justica') && hasMem(p, 'humilhado') && p.ficha === 1);
    check('quem cumpre pena trabalha mais (e não vai à festa)', So.workMult(S, p) === C.PENA_WORK && So.semLazer(S, p) && So.workMult(S, viu) === 1 && So.pessoaInfo(S, p).pena.dias === C.PENA_DIAS.furto);
    // a pena cumprida muda a índole
    p.indole = { g: -40, m: 50, f: 50 }; p.indAc = {};
    S.t += C.PENA_DIAS.furto * DAYM + 5; S.ck = Sim.clock(S.t); Sim.refresh(S);
    S.events.length = 0;
    So.daily(S);
    check('pena cumprida: a índole melhora ' + C.IND_PENA + ' pontos no eixo do crime, e a pessoa fica livre', !p.pena && near(p.indole.g, -40 + C.IND_PENA, 0.2) && hasMem(p, 'cumpriuPena') && c.cumprida === 1 && S.events.some((e) => e.k === 'toast' && /cumpriu a pena/.test(e.text)));
    p.indole = { g: -80, m: 50, f: 50 };
    p.pena = { k: 'trabalho', ate: S.t - 1, cid: c.id, dias: 3 };
    So.daily(S);
    check('em quem é muito ruim, a pena ensina a metade', near(p.indole.g, -80 + C.IND_PENA / 2, 0.2));
  }
  {
    // quem tem o gênio ruim sai do julgamento com mágoa, que dura mais que a pena; e a mágoa pode virar fogo na casa de quem julgou
    const S = village(42, 12), p = S.people[2], vic = S.people[3], viu = S.people[4], lider = S.people[0];
    wake(S);
    S.soc.lider = lider.id;
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    p.indole = { g: 50, m: -45, f: 50 };
    put(S, p, walkAt(S, 1, 3)); put(S, vic, walkAt(S, 2, 3)); put(S, viu, walkAt(S, 2, 4));
    p.feud = {}; p.feud[vic.id] = S.t + 5 * DAYM;
    const c = withRng(S, [0.5], () => faz(S, p, 'surra', vic));
    jump(S, S.ck.day, C.JULG_H - 0.02);
    run(S, 30 * 4, () => c.st === 'aberto');
    const mg = p.mem.find((m) => m.k === 'ressentido');
    check('condenado, quem tem o gênio ruim guarda mágoa por 8 dias, mais que a pena', c.st === 'julgado' && c.cond === p.id && !!mg && mg.until - S.t > (C.PENA_DIAS.surra + 3) * DAYM && !!p.pena, mg ? ((mg.until - S.t) / DAYM).toFixed(1) + ' dias' : 'sem mágoa');
    // a pena acaba; a mágoa, não: o fogo entra nos planos, e o alvo é a casa de quem julgou
    const casaJ = S.buildings.find((b) => b.type === 'barraca' && b.built);
    for (const b of S.buildings) if (b.beds) b.beds = b.beds.filter((id) => id !== lider.id && id !== p.id);
    casaJ.beds = [lider.id];
    delete p.pena; p.feud = {}; delete p.semViol;
    const cr0 = C.CR_FOGO;
    C.CR_FOGO = 3;
    let plano = null;
    for (let h = 0; h < 24 * 4 && !plano; h++) { S.t += 60; S.ck = Sim.clock(S.t); Sim.refresh(S); for (const q of S.people) q.sleeping = false; So.hourly(S); if (p.plano) plano = p.plano; delete p.plano; }
    C.CR_FOGO = cr0;
    check('com a mágoa, o fogo entra nos planos, e o alvo é a casa de quem julgou', !!plano && plano.k === 'fogo' && plano.bid === casaJ.id, plano ? plano.k + ' em ' + plano.bid + ' (juiz mora em ' + casaJ.id + ')' : 'nenhum plano');
    // quem é manso não guarda mágoa
    const S2 = village(42, 12), p2 = S2.people[2], v2 = S2.people[3], w2 = S2.people[4];
    wake(S2); S2.soc.lider = S2.people[0].id;
    for (const q of S2.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    put(S2, p2, walkAt(S2, 1, 3)); put(S2, v2, walkAt(S2, 2, 3)); put(S2, w2, walkAt(S2, 2, 4));
    S2.stock.joias = 1;
    const c2 = faz(S2, p2, 'furto');
    jump(S2, S2.ck.day, C.JULG_H - 0.02);
    run(S2, 30 * 4, () => c2.st === 'aberto');
    check('quem tem o gênio manso sai do julgamento sem mágoa', c2.st === 'julgado' && c2.cond === p2.id && !hasMem(p2, 'ressentido'));
  }
  {
    // as penas pelo tamanho do crime e pela mão do líder
    const S = village(42, 14), lider = S.people[0], viu = S.people[4];
    wake(S);
    S.soc.lider = lider.id;
    const julga = (k, acc, vic, o) => {
      for (const q of S.people) if (q.alive) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; q.sleeping = false; q.inTent = 0; q.act = null; q.path = null; delete q.pena; delete q.exilio; q.fail = {}; }
      const at = walkAt(S, 2, 4);
      put(S, acc, at); put(S, viu, at); if (vic) { put(S, vic, at); vic.needs.saude = 100; }
      jump(S, S.ck.day + 1, 10);
      if (k === 'fogo') { const b = build(S, 'barraca', 4); acc.plano = { k: 'fogo', bid: b.id, t: S.t, ate: S.t + 600 }; }
      const c = k === 'fogo' ? So.cometer(S, acc) : withRng(S, [0.5], () => faz(S, acc, k, vic));
      if (k === 'fogo') { S.god.rainUntil = S.t + 60; So.tick(S); S.god.rainUntil = 0; }
      if (o) Object.assign(acc, o);
      jump(S, S.ck.day, C.JULG_H - 0.02);
      run(S, 30 * 4, () => c.st === 'aberto');
      return c;
    };
    const a1 = S.people[5], v1 = S.people[6];
    let c = julga('surra', a1, v1);
    check('surra: ' + C.PENA_DIAS.surra + ' dias de trabalho', c.st === 'julgado' && c.pena === 'trabalho' && c.dias === C.PENA_DIAS.surra, c.st + ' ' + c.pena + ' ' + c.dias);
    const a2 = S.people[7], v2 = S.people[8];
    c = julga('ferir', a2, v2);
    check('ferir de propósito: ' + C.PENA_DIAS.ferir + ' dias de trabalho', c.pena === 'trabalho' && c.dias === C.PENA_DIAS.ferir, c.pena + ' ' + c.dias);
    check('julgamento de crime grave vai para a crônica', chronHas(S, new RegExp('O povo julgou ' + a2.name + ' ao pé do fogo: feriu ' + v2.name)));
    // reincidente
    const a3 = S.people[9];
    a3.ficha = 2;
    c = julga('ferir', a3, v2);
    check('quem já foi julgado duas vezes e fere alguém vai para o exílio', c.pena === 'exilio' && !!a3.exilio && a3.exilio.por === 'povo', c.pena);
    // líder violento pesa a mão; manso dá mais uma chance
    lider.indole = { g: 50, m: -50, f: 50 };
    const a4 = S.people[10], v4 = S.people[11];
    c = julga('surra', a4, v4);
    check('com um líder violento, a surra custa o dobro de dias', c.pena === 'trabalho' && c.dias === C.PENA_DIAS.surra * 2, c.dias);
    lider.indole = { g: 50, m: 80, f: 50 };
    const a5 = S.people[12];
    a5.ficha = 2;
    c = julga('fogo', a5, null);
    check('com um líder manso, o incendiário reincidente fica (trabalho, não exílio)', c.pena === 'trabalho' && c.dias === C.PENA_DIAS.fogo && !a5.exilio, c.pena + ' ' + c.dias);
    // matar é sempre exílio
    const a6 = S.people[13], v6 = S.people[6];
    c = julga('matar', a6, v6);
    check('matar é exílio, seja quem for o líder', c.pena === 'exilio' && !!a6.exilio && a6.exilio.t > S.t && Sim.clock(a6.exilio.t).hour === 6, c.pena);
    check('a crônica diz a pena', chronHas(S, /A pena: vai embora da aldeia ao amanhecer/));
    // o exílio: ao amanhecer a pessoa parte e some da aldeia
    const par = S.people[3];
    F.link(S, a6, par, 60);
    const n0 = alive(S).length, mortos0 = S.people.filter((q) => !q.alive).length;
    let txt = '';
    for (const q of S.people) if (q.alive) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 95; }
    run(S, 30 * 40, () => { if (doing(a6, 'exilio')) txt = AI.describe(S, a6); for (const q of S.people) if (q.alive) { q.needs.fome = Math.max(q.needs.fome, 60); q.needs.sede = Math.max(q.needs.sede, 60); } return S.people.indexOf(a6) >= 0; });
    check('ao amanhecer o exilado parte, e some da aldeia quando chega longe', S.people.indexOf(a6) < 0 && txt === 'Indo embora da aldeia' && S.stats.exilados === 1, txt);
    check('não conta como vivo nem como morto', alive(S).length === n0 - 1 && S.people.filter((q) => !q.alive).length === mortos0 && a6.alive === false && a6.fora > 0 && a6.away.why === 'exilio' && S.soc.fora.indexOf(a6) >= 0);
    check('mas continua sendo achado pelo id (o parentesco de quem ficou não se perde)', F.person(S, a6.id) === a6 && So.away(S, a6.id) === a6);
    check('a crônica registra, e a tela diz para onde foi', chronHas(S, new RegExp(a6.name + ' deixou a aldeia, mandad[oa] embora pelo povo')) && /^Foi mandad[oa] embora$/.test(AI.describe(S, a6)));
    check('o par que ficou sente, e o laço se desfaz', hasMem(par, 'parExilado') && !F.isPartner(par, a6) && F.partners(S, par).length === 0);
    check('a cama dele fica livre', !S.buildings.some((b) => b.beds && b.beds.indexOf(a6.id) >= 0));
  }
  {
    // quem gosta de quem: o acusado querido, sem testemunha, é absolvido; o mal visto, condenado sem culpa
    const mk = (prep) => {
      const S = village(42, 12), autor = S.people[2], acc = S.people[3], vit = S.people[4];
      wake(S);
      S.soc.lider = S.people[0].id;
      for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; put(S, q, farSpot(S, 20)); }
      put(S, autor, walkAt(S, 1, 3));
      S.stock.joias = 1;
      const c = faz(S, autor, 'furto');
      c.sus = acc.id; c.acus = autor.id;       // a mentira já correu
      if (prep) prep(S, acc, autor, c);
      for (const q of S.people) put(S, q, walkAt(S, 2, 5));
      jump(S, S.ck.day, C.JULG_H - 0.02);
      run(S, 30 * 4, () => !c.julgT);
      return { S, c, acc, autor };
    };
    let r = mk((S, acc) => { for (const q of S.people) if (q !== acc) q.rel[acc.id] = 12; });
    check('ninguém viu, e o acusado é querido: o povo não acha culpa', r.c.julgT > 0 && r.c.st === 'aberto' && r.c.sus === 0 && r.c.semSus === 1 && !r.acc.pena && r.c.votos[1] > r.c.votos[0], JSON.stringify(r.c.votos));
    check('e o crime continua aberto para Deus (o povo desiste de procurar)', So.crimeDe(r.S, r.autor) === r.c && /notou, mas não sabe quem foi/.test(So.crimesInfo(r.S).find((x) => x.id === r.c.id).povo));
    r = mk((S, acc) => { acc.ficha = 3; for (const q of S.people) q.rel[acc.id] = 0; });
    check('ninguém viu, e o acusado tem má fama: o povo condena quem não fez', r.c.st === 'julgado' && r.c.cond === r.acc.id && r.c.injusto === 1 && r.c.by === r.autor.id && !!r.acc.pena, JSON.stringify(r.c.votos));
    check('só Deus sabe: a crônica (a sua) diz quem foi de verdade e lembra do sonho', r.S.chron.some((x) => x.god && new RegExp('O povo condenou ' + r.acc.name + ' por algo que el[ae] não fez').test(x.text) && new RegExp('foi ' + r.autor.name + ' quem roubou').test(x.text) && /Um sonho pode mostrar a verdade/.test(x.text)));
    check('o inocente fica magoado e descontente; a injustiça conta', hasMem(r.acc, 'injusticado') && r.acc.desc >= 30 && r.acc.descWhy.injustica >= 30 && r.S.stats.injusticas === 1 && r.acc.indole.m < 50);
    check('o roubo não foi devolvido (o ladrão de verdade continua com a joia)', r.S.stock.joias === 0 && !!r.autor.furto && !r.c.devolveu);
    check('quem fez e escapou fica pior', r.autor.indole.g < 50 && r.autor.indAc.g.impune < 0);
    check('a lista mostra o inocente condenado', So.crimesInfo(r.S).find((x) => x.id === r.c.id).injusto && /inocente!/.test(So.crimesInfo(r.S).find((x) => x.id === r.c.id).povo));
    // a pena cumprida por um inocente só deixa mágoa
    r.acc.indole = { g: 50, m: 50, f: 50 }; r.acc.desc = 0;
    r.S.t = r.acc.pena.ate + 5; r.S.ck = Sim.clock(r.S.t); Sim.refresh(r.S);
    So.daily(r.S);
    check('a pena que um inocente cumpre não ensina nada: deixa mágoa', !r.acc.pena && near(r.acc.indole.g, 50, 0.5) && r.acc.indole.m < 47 && r.acc.desc >= 20 && !hasMem(r.acc, 'cumpriuPena'));
    // a convivência baixa culpa quem é de fora
    r = mk((S, acc) => { Pv.make(S, acc, 'elfo'); Pv.recount(S); S.povos.mixed = true; S.povos.conv['elfo|humano'] = 5; for (const q of S.people) q.rel[acc.id] = 2; });
    const r2 = mk((S, acc) => { Pv.make(S, acc, 'elfo'); Pv.recount(S); S.povos.mixed = true; S.povos.conv['elfo|humano'] = 95; for (const q of S.people) q.rel[acc.id] = 2; });
    check('com a convivência baixa, o povo condena quem é de fora; com ela alta, o mesmo acusado é absolvido', r.c.st === 'julgado' && r.c.injusto === 1 && r2.c.st === 'aberto', JSON.stringify(r.c.votos) + ' contra ' + JSON.stringify(r2.c.votos));
    // quem viu a verdade e não foi ouvido
    r = mk((S, acc, autor, c) => { acc.ficha = 3; c.wit = [S.people[7].id]; });
    check('quem viu que não foi essa pessoa vota contra, mas pode perder; e sai do julgamento sabendo da injustiça', r.c.injusto === 1 ? hasMem(r.S.people[7], 'injustica') && r.S.people[7].desc >= 12 : r.c.st === 'aberto', r.c.st);
  }
  {
    // sem testemunha e sem ninguém mal visto, o povo não tem de quem desconfiar
    const S = village(42, 12), autor = S.people[2];
    wake(S);
    for (const q of S.people) { put(S, q, farSpot(S, 20)); for (const o of S.people) if (o !== q) q.rel[o.id] = 4; }
    put(S, autor, walkAt(S, 1, 3));
    S.stock.joias = 1;
    const c = faz(S, autor, 'furto');
    jump(S, S.ck.day, C.JULG_H);
    So.chamar(S);
    check('roubo sem testemunha, numa aldeia sem ninguém mal visto: não há a quem julgar', !S.soc.julg && c.st === 'aberto' && (c.semSus === 1 || c.sus === autor.id), 'suspeito ' + c.sus);
    // quem tem ficha vira suspeito
    const S2 = village(42, 12), autor2 = S2.people[2], outro = S2.people[5];
    wake(S2);
    for (const q of S2.people) put(S2, q, farSpot(S2, 20));
    put(S2, autor2, walkAt(S2, 1, 3));
    S2.stock.joias = 1;
    outro.ficha = 3;
    const c2 = faz(S2, autor2, 'furto');
    for (const q of S2.people) put(S2, q, walkAt(S2, 2, 5));
    jump(S2, S2.ck.day, C.JULG_H);
    So.chamar(S2);
    check('quem já foi julgado antes é o primeiro de quem o povo desconfia', !!S2.soc.julg && S2.soc.julg.acc === outro.id && c2.sus === outro.id);
    // o crime leve sem testemunha não vira suspeita
    const c3 = withRng(S2, [0], () => { for (const q of S2.people) put(S2, q, farSpot(S2, 20)); for (const k of T.FOOD) S2.stock[k] = 0; S2.stock.frutas = 6; Sim.refresh(S2); return faz(S2, autor2, 'comida'); });
    check('falta de comida que ninguém viu não vira suspeita contra ninguém (é leve)', c3.dano === 1 && c3.g === 1 && !c3.sus);
  }
  {
    // quando não dá para reunir
    const S = village(42, 12), p = S.people[2], viu = S.people[3];
    wake(S);
    put(S, p, walkAt(S, 1, 3)); put(S, viu, walkAt(S, 2, 3));
    S.stock.joias = 1;
    const c = faz(S, p, 'furto');
    jump(S, S.ck.day, C.JULG_H);
    S.life.party = { on: true };
    So.chamar(S);
    check('em dia de festa não há julgamento: fica para outro dia', !S.soc.julg && c.st === 'aberto' && c.adiado > S.t);
    S.life.party = null; c.adiado = 0;
    S.narr.active.nevasca = { until: S.t + 600 };
    So.chamar(S);
    check('nem no meio da nevasca', !S.soc.julg && c.adiado > S.t);
    delete S.narr.active.nevasca; c.adiado = 0;
    // pouca gente: fica para outro dia
    for (const q of S.people) if (q !== p && q !== viu) { q.sleeping = true; q.inTent = S.buildings.find((b) => b.type === 'barraca').id; q.act = { type: 'dormir', stage: 'sleep', t: 0, score: 99 }; q.needs.energia = 10; }
    So.chamar(S);
    check('o julgamento é chamado', !!S.soc.julg);
    const evs = run(S, 30 * 4, () => { for (const q of S.people) if (q !== p && q !== viu) q.needs.energia = 10; return !!S.soc.julg; });
    check('se quase ninguém vem (menos de ' + C.JULG_QUORUM + ' adultos além do acusado), fica para outro dia', !S.soc.julg && c.st === 'aberto' && c.adiado > S.t && c.tent === 1 && toasts(evs, /Pouca gente veio/).length === 1);
    // o save no meio
    const S2 = village(42, 12), p2 = S2.people[2], viu2 = S2.people[3];
    wake(S2);
    for (const q of S2.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    put(S2, p2, walkAt(S2, 1, 3)); put(S2, viu2, walkAt(S2, 2, 3));
    S2.stock.joias = 1;
    const c2 = faz(S2, p2, 'furto');
    jump(S2, S2.ck.day, C.JULG_H - 0.02);
    run(S2, 40, () => !S2.soc.julg || S2.soc.julg.st !== 'on');
    check('o julgamento está no meio', !!S2.soc.julg);
    const S3 = clone(S2);
    check('o save no meio do julgamento abre sem ele; o crime continua aberto e será chamado de novo', !S3.soc.julg && S3.soc.crimes.find((x) => x.id === c2.id).st === 'aberto' && !S3.people.some((q) => q.act));
    run(S3, 30 * 30, () => S3.soc.crimes[0].st === 'aberto');
    check('no jogo reaberto, o julgamento acontece (hoje ou amanhã)', S3.soc.crimes[0].st === 'julgado', S3.soc.crimes[0].st);
    // o acusado que morre ou vai embora
    const S4 = village(42, 12), p4 = S4.people[2];
    wake(S4);
    put(S4, p4, walkAt(S4, 1, 3)); put(S4, S4.people[3], walkAt(S4, 2, 3));
    S4.stock.joias = 1;
    faz(S4, p4, 'furto');
    jump(S4, S4.ck.day, C.JULG_H);
    So.chamar(S4);
    p4.needs.saude = -999; p4.dmg.velhice = 999;
    Sim.step(S4, 2);
    check('se o acusado morre, o julgamento acaba ali', !S4.soc.julg && !p4.alive);
    So.daily(S4);
    check('e o crime é fechado', S4.soc.crimes[0].st === 'fechado' && /não está mais aqui/.test(So.crimesInfo(S4)[0].povo));
    // o líder condenado perde o posto
    const S5 = village(42, 12), l5 = S5.people[0];
    wake(S5);
    S5.soc.lider = l5.id;
    for (const q of S5.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    put(S5, l5, walkAt(S5, 1, 3)); put(S5, S5.people[3], walkAt(S5, 2, 3)); put(S5, S5.people[4], walkAt(S5, 2, 3)); put(S5, S5.people[6], walkAt(S5, 2, 3));
    S5.stock.joias = 1;
    const c5 = faz(S5, l5, 'furto');
    jump(S5, S5.ck.day, C.JULG_H - 0.02);
    let juiz = 0;
    run(S5, 30 * 4, () => { if (S5.soc.julg) juiz = S5.soc.julg.juiz; return c5.st === 'aberto'; });
    check('o líder acusado não julga a si mesmo (o mais velho assume) e, condenado, perde o posto', juiz !== l5.id && juiz > 0 && c5.st === 'julgado' && S5.soc.lider !== l5.id, 'juiz ' + juiz + ', líder agora ' + S5.soc.lider);
  }
  {
    // o crime que ninguém julga esfria
    const S = village(42, 10), p = S.people[2];
    wake(S);
    for (const q of S.people) put(S, q, farSpot(S, 20));
    put(S, p, walkAt(S, 1, 3));
    const c = withRng(S, [0], () => faz(S, p, 'comida'));
    const g0 = p.indole.g;
    S.t += (C.CRIME_FRIO[0] + 1) * DAYM; S.ck = Sim.clock(S.t); Sim.refresh(S);
    So.daily(S);
    check('o crime leve sem resposta esfria em ' + C.CRIME_FRIO[0] + ' dias, e quem fez e ficou impune piora', c.st === 'frio' && near(p.indole.g, g0 - C.IND_IMPUNE, 0.3) && /nunca soube/.test(So.crimesInfo(S)[0].povo));
    check('para Deus, continua lá: ainda dá para castigar ou perdoar', So.crimeDe(S, p) === c && So.crimesInfo(S)[0].podeCastigar && So.crimesInfo(S)[0].podePerdoar);
    // a lista não cresce sem fim
    for (let k = 0; k < C.CRIME_MAX + 20; k++) withRng(S, [0], () => { S.stock.frutas = 50; return faz(S, p, 'comida'); });
    check('a lista guarda no máximo ' + C.CRIME_MAX + ' crimes (os resolvidos saem primeiro)', S.soc.crimes.length === C.CRIME_MAX && S.stats.crimes === C.CRIME_MAX + 21 && S.stats.crimesG[1] === C.CRIME_MAX + 21);
  }

  // ---------- E. Deus castiga na medida, mostra a verdade e perdoa ----------
  {
    const mk = (k, n) => {
      const S = village(42, n || 10), p = S.people[2], v = S.people[3], viu = S.people[4];
      wake(S);
      for (const q of S.people) { put(S, q, farSpot(S, 20)); q.fe = 50; }
      put(S, p, walkAt(S, 1, 3));
      if (k === 'surra' || k === 'ferir') { put(S, v, walkAt(S, 1, 3)); v.sleeping = true; }
      S.stock.joias = 1; S.god.poder = 200; S.god.align = 0;
      const c = k ? withRng(S, [0.5], () => faz(S, p, k, k === 'surra' || k === 'ferir' ? v : null)) : null;
      wake(S);
      S.events.length = 0;
      return { S, p, v, viu, c };
    };
    // a medida de cada gravidade
    let r = mk('comida');
    check('para o que é leve, a medida é o aviso em sonho ou a marca', [1, 2, 3, 4, 5, 6].map((nv) => So.medida(r.S, r.p, nv).m).join(',') === 'justo,justo,pesado,pesado,pesado,pesado');
    r = mk('furto');
    check('para o médio: marca, doença leve ou raio por perto', [1, 2, 3, 4, 5, 6].map((nv) => So.medida(r.S, r.p, nv).m).join(',') === 'leve,justo,justo,justo,pesado,pesado');
    r = mk('ferir');
    check('para o grave: raio por perto, exílio ou morte', [1, 2, 3, 4, 5, 6].map((nv) => So.medida(r.S, r.p, nv).m).join(',') === 'leve,leve,leve,justo,justo,justo');
    check('quem não fez nada é inocente para qualquer castigo', So.medida(r.S, r.viu, 1).m === 'inocente' && So.crimeDe(r.S, r.viu) === null);
    check('são seis castigos, do aviso à morte, cada um com o seu custo', So.CASTIGO.length === 7 && So.CASTIGO[1].k === 'sonho' && So.CASTIGO[6].k === 'morte' && C.CASTIGO_CUSTO.length === 6 && C.CASTIGO_CUSTO.every((v, i) => i === 0 || v > C.CASTIGO_CUSTO[i - 1]));
    // na medida
    r = mk('furto');
    r.p.indole = { g: -40, m: 50, f: 50 };
    const fe0 = r.viu.fe, pfe0 = r.p.fe;
    let res = So.castigar(r.S, r.p.id, 2);
    check('a marca na medida certa: custa ' + C.CASTIGO_CUSTO[1] + ' de Poder e fica na testa por ' + C.MARCA_D + ' dias', res.ok && res.m === 'justo' && r.S.god.poder === 200 - C.CASTIGO_CUSTO[1] && near((r.p.marca - r.S.t) / DAYM, C.MARCA_D) && hasMem(r.p, 'marcado') && So.pessoaInfo(r.S, r.p).marca);
    check('o castigo na medida ensina: a índole melhora ' + C.IND_CASTIGO + ' pontos e a fé de quem errou sobe', near(r.p.indole.g, -40 + C.IND_CASTIGO) && r.p.indAc.g.castigo === C.IND_CASTIGO && r.p.fe > pfe0);
    check('o castigo que todos veem conta ao povo quem foi: o crime deixa de ser segredo e não vai a julgamento', r.c.known === 1 && r.c.st === 'castigado' && r.c.deus === 2 && r.c.deusM === 'justo' && /Castigado por Deus/.test(So.crimesInfo(r.S)[0].povo));
    check('a fé de todos sobe e Deus não fica mais temido por isso', r.viu.fe > fe0 && hasMem(r.viu, 'justicaDivina') && r.S.god.align === 0 && r.S.stats.castigosJustos === 1);
    check('vira conto: a medida', r.S.memoria.contos.some((x) => x.k === 'justica' && x.a === r.p.name) && /cobrou na medida/.test(M.contosInfo(r.S)[0].conta[0]) && /Você castigou/.test(M.contosInfo(r.S)[0].fato));
    check('a resposta diz ao jogador que foi na medida', /^Na medida\./.test(res.msg));
    check('o mesmo crime não se castiga duas vezes', So.crimeDe(r.S, r.p) === null && So.medida(r.S, r.p, 2).m === 'inocente');
    // o aviso em sonho é só entre Deus e a pessoa
    r = mk('comida');
    res = So.castigar(r.S, r.p.id, 1);
    check('o aviso em sonho, na medida do leve: só a pessoa sabe', res.m === 'justo' && r.c.known === 0 && r.c.st === 'aberto' && r.c.deus === 1 && hasMem(r.p, 'avisoSonho') && !hasMem(r.viu, 'justicaDivina') && !r.S.memoria.contos.length);
    // pesado demais
    r = mk('comida');
    r.S.god.align = 10;
    const fam = r.S.people[5]; F.link(r.S, r.p, fam, 60);
    res = So.castigar(r.S, r.p.id, 4);
    check('raio por perto para quem pegou comida: pesado demais (2 degraus acima)', res.m === 'pesado' && /Pesado demais/.test(res.msg) && r.S.god.align === 10 - 5 * 2 && r.S.events.some((e) => e.k === 'bolt'));
    check('o povo fica com medo: a fé sobe um pouco (de medo), o descontentamento também, mais em quem é da família', hasMem(r.viu, 'castigoPesado') && r.viu.desc === 6 && fam.desc === 20 && r.viu.descWhy.medo === 6);
    check('quem levou fica mais azedo, não melhor', r.p.indole.m < 50 && r.p.indAc.m.pesado === -5);
    check('vira conto de medo: a mão pesada', r.S.memoria.contos.some((x) => x.k === 'pesado' && x.tone === -1) && M.contosInfo(r.S)[0].titulo === 'A mão pesada');
    // a morte para um roubo
    r = mk('furto');
    const n0 = alive(r.S).length;
    res = So.castigar(r.S, r.p.id, 6);
    Sim.step(r.S, 2);
    check('a morte para um roubo: a pessoa morre de raio, e é pesado demais', res.m === 'pesado' && !r.p.alive && r.p.cause === 'raio' && alive(r.S).length === n0 - 1 && r.S.god.align <= -10);
    // leve demais
    r = mk('ferir');
    const vfe = r.v.fe;
    res = So.castigar(r.S, r.p.id, 1);
    check('um aviso em sonho para quem feriu de propósito: leve demais; quem sofreu esperava mais', res.m === 'leve' && /Leve para o que/.test(res.msg) && hasMem(r.v, 'semJustica') && r.v.fe < vfe && r.c.deus === 1);
    // o povo já puniu: mais que um aviso é pesar a mão
    r = mk('furto');
    r.c.st = 'julgado'; r.c.cond = r.p.id; r.c.pena = 'trabalho';
    check('quando o povo já cobrou, só o aviso está na medida', So.medida(r.S, r.p, 1).m === 'justo' && So.medida(r.S, r.p, 2).m === 'pesado');
    // inocente
    r = mk('furto');
    r.S.god.align = 0;
    const kin = r.S.people[5]; F.link(r.S, r.viu, kin, 60);
    const feV = r.viu.fe, feK = kin.fe, feO = r.S.people[6].fe;
    res = So.castigar(r.S, r.viu.id, 2);
    check('castigar quem não fez nada: quem sabia perde a fé (a família, o dobro), e Deus fica temido', res.m === 'inocente' && /não tinha feito nada/.test(res.msg) && r.S.people[6].fe === feO - 12 && kin.fe === feK - 25 && r.viu.fe === feV - 30 && r.S.god.align === -10 && r.S.stats.castigosInocente === 1);
    check('e o povo fica descontente', r.S.people[6].desc === 15 && kin.desc === 30 && r.viu.desc === 40 && hasMem(kin, 'castigoInjusto'));
    check('vira conto de medo: o castigo sem culpa', M.contosInfo(r.S)[0].titulo === 'O castigo sem culpa' && /não tinha feito nada/.test(M.contosInfo(r.S)[0].conta[0]));
    // se o povo tinha condenado a pessoa (sem culpa), só a família e quem sabe a verdade perdem a fé
    r = mk('furto');
    r.c.st = 'julgado'; r.c.cond = r.viu.id; r.c.injusto = 1; r.c.pena = 'trabalho';
    const kin2 = r.S.people[5]; F.link(r.S, r.viu, kin2, 60);
    const feO2 = r.S.people[6].fe, feK2 = kin2.fe;
    res = So.castigar(r.S, r.viu.id, 2);
    check('se o povo acreditava na culpa, só a família do inocente perde a fé; o resto acha justo', res.m === 'inocente' && r.S.people[6].fe === feO2 && kin2.fe === feK2 - 25);
    // limites
    r = mk('comida');
    const kid = add(r.S, 'M', 'Miúdo', 9), moco = add(r.S, 'M', 'Moço', 14);
    check('criança não se castiga', So.castigoWhy(r.S, kid, 1) === 'Criança não se castiga' && !So.castigar(r.S, kid.id, 1).ok);
    check('antes dos 16, só o aviso ou a marca', So.castigoWhy(r.S, moco, 2) === '' && /só o aviso ou a marca/.test(So.castigoWhy(r.S, moco, 3)) && /só o aviso ou a marca/.test(So.castigoWhy(r.S, moco, 6)));
    r.S.god.poder = 3;
    check('sem Poder, não há castigo', /Falta Poder: precisa de 5/.test(So.castigoWhy(r.S, r.p, 1)) && !So.castigar(r.S, r.p.id, 1).ok && r.S.god.poder === 3);
    // a doença leve e o exílio por Deus
    r = mk('furto');
    r.p.needs.saude = 100;
    So.castigar(r.S, r.p.id, 3);
    check('doença leve: ' + C.DOENCA_D + ' dias de fraqueza (−' + C.DOENCA_DANO + ' de saúde, trabalha menos), sem risco de morte', r.p.needs.saude === 100 - C.DOENCA_DANO && near((r.p.doente - r.S.t) / DAYM, C.DOENCA_D) && So.workMult(r.S, r.p) === 0.6 && So.pessoaInfo(r.S, r.p).doente);
    r.p.needs.saude = 35; r.p.doente = 0; delete r.c.deus;
    So.castigar(r.S, r.p.id, 3);
    check('a doença não derruba abaixo de 30 de saúde', r.p.needs.saude === 30);
    r.S.t += (C.DOENCA_D + 1) * DAYM; r.S.ck = Sim.clock(r.S.t); So.daily(r.S);
    check('passado o prazo, a doença e a marca somem', !r.p.doente && So.workMult(r.S, r.p) === 1);
    r = mk('ferir');
    res = So.castigar(r.S, r.p.id, 5);
    check('o exílio mandado por Deus, na medida do grave: a pessoa parte na hora', res.m === 'justo' && !!r.p.exilio && r.p.exilio.por === 'deus' && r.p.exilio.t <= r.S.t && So.want(r.S, r.p).k === 'exilio' && /Já está indo embora/.test(So.castigoWhy(r.S, r.p, 1)));
    for (const q of r.S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 95; }
    run(r.S, 30 * 30, () => { for (const q of r.S.people) { q.needs.fome = Math.max(q.needs.fome, 60); q.needs.sede = Math.max(q.needs.sede, 60); } return r.S.people.indexOf(r.p) >= 0; });
    check('e a crônica diz quem mandou', r.S.people.indexOf(r.p) < 0 && chronHas(r.S, new RegExp(r.p.name + ' deixou a aldeia, mandad[oa] embora por ')));
  }
  {
    // a verdade em sonho
    const S = village(42, 12), autor = S.people[2], acc = S.people[3], lider = S.people[0];
    wake(S);
    S.soc.lider = lider.id; S.god.poder = 100; S.god.align = 0;
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; put(S, q, farSpot(S, 20)); q.rel[acc.id] = 0; }
    put(S, autor, walkAt(S, 1, 3));
    S.stock.joias = 1;
    const c = faz(S, autor, 'furto');
    check('o que ninguém viu, Deus pode mostrar em sonho (custa ' + C.REVELAR_CUSTO + ')', So.revelarWhy(S, c) === '' && So.crimesInfo(S)[0].podeRevelar);
    c.sus = acc.id; c.acus = autor.id; acc.ficha = 3;
    for (const q of S.people) put(S, q, walkAt(S, 2, 5));
    jump(S, S.ck.day, C.JULG_H - 0.02);
    run(S, 30 * 4, () => !c.julgT);
    check('(o povo condenou quem não fez)', c.injusto === 1 && !!acc.pena);
    const kin = S.people[6]; Sim.addMem(S, kin, 'injustica'); kin.desc = 20;
    S.chron.length = 0;
    const al0 = S.god.align; S.god.poder = 100;
    const res = So.revelar(S, c.id);
    check('o sonho mostra quem foi: o líder sonha, e o povo fica sabendo', res.ok && S.god.poder === 100 - C.REVELAR_CUSTO && c.known === 1 && c.rev === S.t && chronHas(S, new RegExp(lider.name + ' sonhou com o que aconteceu: foi ' + autor.name + ' quem roubou')) && S.god.align === al0 + 1, res.ok + ' ' + S.god.poder + ' ' + c.known + ' ' + S.god.align + ' ' + (S.chron[0] ? S.chron[0].text : ''));
    check('o inocente fica livre: a pena some, a mágoa vira alívio, o povo pede desculpa', !acc.pena && c.injusto === 0 && !hasMem(acc, 'injusticado') && hasMem(acc, 'inocentado') && acc.ficha === 3 && chronHas(S, new RegExp(acc.name + ' não tinha feito nada, e o povo pediu desculpa')));
    check('quem tinha visto a injustiça sossega', !hasMem(kin, 'injustica') && kin.desc === 8);
    check('e o caso volta a ficar aberto, agora contra quem fez', c.st === 'aberto' && c.cond === 0 && c.sus === 0 && /O povo já sabe quem foi/.test(So.revelarWhy(S, c)));
    jump(S, S.ck.day + 1, C.JULG_H - 0.02);
    for (const q of S.people) { q.needs.fome = 95; q.needs.sede = 95; q.needs.energia = 90; }
    run(S, 30 * 4, () => c.st === 'aberto');
    check('na tardinha seguinte o povo julga o ladrão de verdade, que devolve a joia', c.st === 'julgado' && c.cond === autor.id && !c.injusto && S.stock.joias === 1 && !!autor.pena, c.st);
    // o exilado sem culpa volta
    const S2 = village(42, 12), autor2 = S2.people[2], acc2 = S2.people[3];
    wake(S2);
    S2.god.poder = 100;
    for (const q of S2.people) put(S2, q, farSpot(S2, 20));
    put(S2, autor2, walkAt(S2, 1, 3)); put(S2, S2.people[4], walkAt(S2, 1, 3)); S2.people[4].sleeping = true;
    const c2 = withRng(S2, [0.5], () => faz(S2, autor2, 'ferir', S2.people[4]));
    c2.st = 'julgado'; c2.cond = acc2.id; c2.injusto = 1; c2.pena = 'exilio';
    acc2.exilio = { t: S2.t + 600, por: 'povo', cid: c2.id };
    S2.soc.pend.push({ k: 'inocente', cid: c2.id, pid: acc2.id, t: S2.t });
    const pi = So.pendInfo(S2);
    check('o povo vai mandar embora um inocente: o jogo para e pergunta (mostrar a verdade ou deixar)', !!pi && pi.k === 'inocente' && pi.nome === acc2.name && pi.autor === autor2.name && pi.custo === C.REVELAR_CUSTO && pi.pode);
    const S2b = clone(S2);
    check('a pergunta sobrevive ao save', !!So.pendInfo(S2b) && So.pendInfo(S2b).k === 'inocente');
    So.pendResp(S2b, 'revelar');
    check('respondendo com o sonho, o inocente fica', !So.pending(S2b) && !S2b.people.find((q) => q.id === acc2.id).exilio && S2b.soc.crimes[0].injusto === 0);
    So.pendResp(S2, 'deixar');
    check('deixando, a pergunta some e a pessoa parte ao amanhecer', !So.pending(S2) && !!acc2.exilio);
    acc2.exilio.t = S2.t; acc2.exilio.fail = 1;
    So.drop(S2, acc2, { hint: 'exilio' }, true, false);
    check('(o inocente foi embora)', S2.people.indexOf(acc2) < 0 && acc2.fora > 0);
    const n0 = alive(S2).length;
    S2.chron.length = 0;
    const res2 = So.revelar(S2, c2.id);
    check('a verdade aparece depois: o povo vai buscar, e o exilado volta (a mesma pessoa, o mesmo id)', res2.ok && S2.people.indexOf(acc2) >= 0 && acc2.alive && !acc2.fora && alive(S2).length === n0 + 1 && S2.soc.fora.length === 0 && chronHas(S2, new RegExp(acc2.name + ' voltou do exílio')));
    check('e volta inteira: com fome e sede de quem andou, mas de pé', acc2.needs.saude >= 70 && acc2.needs.fome === 70 && hasMem(acc2, 'inocentado') && !acc2.exilio);
    Sim.advance(S2, 120);
    check('a vida segue com ela de volta (sem erro no passo)', acc2.alive && !S2.over);
  }
  {
    // o perdão público
    const S = village(42, 10), p = S.people[2], v = S.people[3], viu = S.people[4];
    wake(S);
    S.god.poder = 100; S.god.align = 0;
    for (const q of S.people) { put(S, q, farSpot(S, 20)); q.fe = 50; }
    put(S, p, walkAt(S, 1, 3));
    S.stock.joias = 1;
    const c = faz(S, p, 'furto');
    p.indole = { g: -40, m: 50, f: 50 }; p.indAc = {};
    check('dá para perdoar qualquer crime de quem está na aldeia (custa ' + C.PERDAO_CUSTO + ')', So.perdaoWhy(S, c) === '');
    const res = So.perdoar(S, c.id);
    check('o perdão é público: o crime fica conhecido e encerrado', res.ok && c.st === 'perdoado' && c.known === 1 && c.deus === 'perdao' && S.god.poder === 100 - C.PERDAO_CUSTO && /Perdoado por Deus/.test(So.crimesInfo(S)[0].povo));
    check('puxa Deus para o lado bondoso (mais, quanto mais grave o que perdoou)', S.god.align === 3 + 2);
    check('quem foi perdoado ganha fé e melhora (' + C.IND_PERDAO + ' pontos)', p.fe === 65 && hasMem(p, 'perdoado') && near(p.indole.g, -40 + C.IND_PERDAO) && p.indAc.g.perdao === C.IND_PERDAO);
    check('o povo vê e guarda; vira conto de cuidado', hasMem(viu, 'viuPerdao') && viu.fe === 51 && S.memoria.contos.some((x) => x.k === 'perdao' && x.tone === 1) && S.stats.perdoes === 1 && chronHas(S, /perdoou .* diante de todos/));
    check('não se perdoa duas vezes a mesma coisa, e não se castiga o que foi perdoado', /Já foi perdoado/.test(So.perdaoWhy(S, c)) && So.crimeDe(S, p) === null);
    // perdoar cedo demais um crime com vítima
    put(S, v, walkAt(S, 1, 3)); v.sleeping = true;
    const c2 = withRng(S, [0.5], () => faz(S, p, 'ferir', v));
    const vfe = v.fe;
    const res2 = So.perdoar(S, c2.id);
    check('perdoar quem feriu, sem ele ter pago nada: quem sofreu acha cedo demais', res2.ok && hasMem(v, 'semJustica') && v.fe === vfe - 4 && /achou cedo demais/.test(res2.msg) && S.god.align === 5 + 3 + 3);
    // perdoar depois da pena: ninguém reclama
    const c3 = withRng(S, [0.5], () => { v.mem = []; return faz(S, p, 'ferir', v); });
    c3.cumprida = 1;
    So.perdoar(S, c3.id);
    check('depois da pena cumprida, o perdão não ofende ninguém', !hasMem(v, 'semJustica') && hasMem(v, 'viuPerdao'));
    // o perdão acaba com a pena e com o exílio marcado
    const c4 = faz(S, p, 'furto') || (() => { S.stock.joias = 1; return faz(S, p, 'furto'); })();
    p.pena = { k: 'trabalho', ate: S.t + 3 * DAYM, cid: c4.id, dias: 3 };
    p.exilio = { t: S.t + 600, por: 'povo', cid: c4.id };
    So.perdoar(S, c4.id);
    check('o perdão encerra a pena e o exílio que o povo tinha marcado', !p.pena && !p.exilio);
    // quem é muito ruim aprende pouco com o perdão
    p.indole = { g: -90, m: 50, f: 50 };
    S.stock.joias = 1;
    const c5 = faz(S, p, 'furto');
    So.perdoar(S, c5.id);
    check('em quem é muito ruim, o perdão ensina pouco (2 pontos)', near(p.indole.g, -88));
    // missões
    check('as missões da Sociedade entram nas fases 3 e 4', So.missions(3).length === 1 && So.missions(4).length === 4 && So.missions(1).length === 0 && So.goalTest.s_perdao(S) && !So.goalTest.s_medida(S));
  }

  // ---------- F. o líder ----------
  {
    const S = village(42, 4);
    jump(S, S.ck.day, 17.5);
    run(S, 40);
    check('com menos de ' + C.LIDER_MIN + ' adultos, não há líder', !S.soc.lider && So.lider(S) === null && So.liderInfo(S) === null);
    const S2 = village(42, 10), quer = S2.people[4];
    for (const q of S2.people) if (q !== quer) q.rel[quer.id] = 15;
    jump(S2, S2.ck.day, 17.9);
    const evs = run(S2, 10);
    check('com ' + C.LIDER_MIN + ' adultos ou mais, às 18 h o povo escolhe quem fala por todos', S2.soc.lider > 0 && S2.stats.lideres === 1 && evs.some((e) => e.k === 'soc' && e.ev === 'lider'));
    check('entre humanos, o líder é a pessoa mais querida', S2.soc.lider === quer.id && So.lider(S2) === quer && /mais querida/.test(So.liderInfo(S2).porque));
    check('a crônica explica o que o líder faz', chronHas(S2, new RegExp('O povo escolheu quem fala por todos: ' + quer.name)) && chronHas(S2, /chama o julgamento ao pé do fogo/));
    check('a missão do líder se cumpre', So.goalTest.s_lider(S2));
    // o líder não muda por pouco
    const outro = S2.people[5];
    for (const q of S2.people) if (q !== outro) q.rel[outro.id] = 16;
    So.eleger(S2);
    check('quem passa por pouco não derruba o líder (precisa de ' + C.LIDER_TROCA + ' vezes o respeito)', S2.soc.lider === quer.id);
    for (const q of S2.people) q.rel[quer.id] = 0;
    quer.ficha = 2;
    So.eleger(S2);
    check('mas quem perde o respeito do povo (fama ruim, ninguém gosta) perde a voz', S2.soc.lider === outro.id && S2.stats.lideres === 2 && chronHas(S2, new RegExp('O povo passou a ouvir ' + outro.name + ' no lugar de ' + quer.name)));
    // a morte do líder
    outro.needs.saude = -999; outro.dmg.velhice = 999;
    Sim.step(S2, 2);
    check('morto o líder, a aldeia fica sem voz até a próxima tardinha', S2.soc.lider === 0 && So.lider(S2) === null);
    jump(S2, S2.ck.day + 1, 17.9);
    run(S2, 10);
    check('e escolhe outro', S2.soc.lider > 0 && S2.soc.lider !== outro.id && S2.stats.lideres === 3);
    // menor de 20 não é candidato
    const S3 = village(42, 8);
    for (const q of S3.people) setAge(S3, q, 18);
    check('ninguém de menos de 20 anos é candidato', So.candidatos(S3).length === 0 && So.eleger(S3) === null);
    // cada povo respeita uma coisa
    const povoDe = (kind, prep) => {
      const S4 = village(42, 3);
      for (const q of S4.people.slice(2)) Pv.make(S4, q, kind);
      const cs = [];
      for (let k = 0; k < 6; k++) { const q = add(S4, k % 2 ? 'M' : 'F', 'P' + k, 25 + k, kind); boa(q); q.traits = []; q.mood = 60; q.needs.saude = 100; cs.push(q); }
      // tira os humanos do caminho (mortos de velhice, sem cerimônia)
      for (const q of S4.people) if ((q.povo || 'humano') !== kind) { q.alive = false; }
      Pv.recount(S4); S4.povos.mixed = true;
      const alvo = prep(S4, cs);
      So.eleger(S4);
      return { S: S4, alvo, cs };
    };
    let r = povoDe('elfo', (S4, cs) => { cs[0].rel = {}; for (const q of cs) q.rel[cs[1].id] = 15; setAge(S4, cs[3], 140); return cs[3]; });
    check('os elfos respeitam quem viveu mais (mesmo que outro seja mais querido)', r.S.soc.lider === r.alvo.id && /viveu mais/.test(So.liderInfo(r.S).porque), r.S.soc.lider + ' / ' + r.alvo.id);
    r = povoDe('anao', (S4, cs) => { for (const q of cs) q.rel[cs[1].id] = 15; setAge(S4, cs[2], 100); cs[4].skills.oficio = 300; cs[4].skills.construcao = 300; return cs[4]; });
    check('os anões respeitam quem mais sabe fazer com as mãos', r.S.soc.lider === r.alvo.id && /sabe fazer/.test(So.liderInfo(r.S).porque));
    r = povoDe('fera', (S4, cs) => { for (const q of cs) q.rel[cs[1].id] = 15; cs[5].skills.caca = 300; for (const q of cs) if (q !== cs[5]) q.needs.saude = 60; return cs[5]; });
    check('o povo-fera respeita quem tem mais força', r.S.soc.lider === r.alvo.id && /mais força/.test(So.liderInfo(r.S).porque));
    check('o que cada povo respeita está escrito para a tela', So.RESPEITA.elfo === 'quem viveu mais' && So.RESPEITA.humano === 'quem é querido');
    // o mestiço pesa pelos dois lados
    const S5 = village(42, 8), m = S5.people[3];
    m.povo = 'meio'; m.sangue = { humano: 0.5, elfo: 0.5 };
    const velho = S5.people[4], amado = S5.people[5];
    setAge(S5, velho, 59); m.rel[amado.id] = 15;
    const pl = So.placar(S5);
    check('o placar soma o respeito de todos os adultos por cada candidato', pl.length === 8 && pl[0].r >= pl[1].r && pl.every((x) => x.r >= 0));
    // a índole e a ficha pesam
    const S6 = village(42, 8), a = S6.people[2], b = S6.people[3];
    for (const q of S6.people) { q.rel[a.id] = 8; q.rel[b.id] = 8; }
    a.indole = { g: 90, m: 50, f: 90 }; b.indole = { g: -60, m: 50, f: -60 };
    So.eleger(S6);
    check('entre dois igualmente queridos, o povo prefere o generoso e franco', S6.soc.lider === a.id);
    // todo começo de ano o povo confere
    const S7 = village(42, 8), l7 = S7.people[2], n7 = S7.people[3];
    S7.soc.lider = l7.id; S7.stats.lideres = 1;
    for (const q of S7.people) q.rel[n7.id] = 15;
    jump(S7, 60 * 2 - 1, 23.9);
    run(S7, 10);
    check('todo começo de ano o povo confere se a voz ainda é a mesma', S7.ck.doy === 0 && S7.soc.lider === n7.id);
  }

  // ---------- G. obras por conta própria ----------
  {
    const mk = (modo, n) => {
      const S = village(42, n || 10);
      S.soc.lider = S.people[0].id;
      So.setModo(S, modo);
      return S;
    };
    // falta casa
    const semCasa = (S) => { for (const b of S.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S, b); build(S, 'barraca', 3); S.soc.semCama = 3; };
    let S = mk('eu');
    semCasa(S);
    check('o padrão é "Só eu marco": mesmo faltando casa, o povo espera', S.soc.modo === 'eu' && So.planejarObra(S) === null && S.soc.pedidos.length === 0 && !S.buildings.some((b) => !b.built));
    check('os três modos têm nome e explicação', Object.keys(So.MODOS).join(',') === 'eu,pede,decide' && So.MODOS.pede[0] === 'O povo pede' && /40%/.test(So.MODOS.decide[1]) && !So.setModo(S, 'outro'));
    check('o líder enxerga o que falta', So.faltas(S).length === 1 && So.faltas(S)[0].type === 'barraca' && So.faltas(S)[0].why === 'casa');
    // modo 'pede'
    S = mk('pede');
    semCasa(S);
    S.events.length = 0;
    let q = So.planejarObra(S);
    check('"O povo pede": o líder aponta um lugar e deixa o pedido (nada é marcado ainda)', !!q && q.type === 'barraca' && S.soc.pedidos.length === 1 && !S.buildings.some((b) => !b.built) && S.stats.pedidos === 1 && S.events.some((e) => e.k === 'soc' && e.ev === 'pedido') && S.events.some((e) => e.k === 'toast' && /pede uma barraca: tem gente dormindo ao relento/.test(e.text)));
    check('o lugar escolhido serve para a obra e não encosta em outra', !Sim.canPlace(S, 'barraca', q.x, q.y) && S.buildings.every((b) => q.x + 2 < b.x || q.x > b.x + b.w || q.y + 2 < b.y || q.y > b.y + b.h));
    const pi = So.pedidosInfo(S)[0];
    check('a tela recebe o pedido com o motivo, o custo e o prazo', pi.nome === 'uma barraca' && pi.why === So.FALTA.casa && pi.custo.madeira === 14 && pi.dias === C.PEDIDO_D);
    check('um pedido de cada vez', So.planejarObra(S) === null && S.soc.pedidos.length === 1);
    const ok1 = So.aprovar(S, q.id);
    const b1 = S.buildings.find((b) => !b.built);
    check('aprovado, vira obra marcada (do povo)', ok1 && !!b1 && b1.type === 'barraca' && b1.povo === 1 && b1.x === q.x && b1.y === q.y && S.soc.pedidos.length === 0 && S.stats.obrasPovo === 1 && chronHas(S, /Pela primeira vez o povo marcou uma obra por conta própria/));
    check('com a obra do povo em andamento, ele não pede outra', So.planejarObra(S) === null);
    Sim.complete(S, b1); S.soc.semCama = 3;
    for (const b of S.buildings.slice()) if (b.type === 'barraca' && b !== b1) Sim.removeBuilding(S, b);
    q = So.planejarObra(S);
    const dorme = S.people.filter((p) => !S.buildings.some((b) => b.beds && b.beds.indexOf(p.id) >= 0));
    for (const p of dorme) Sim.addMem(S, p, 'dormiuRelento');
    check('(falta casa de novo, e há quem durma ao relento)', !!q && dorme.length > 0);
    const ok2 = So.recusar(S, q.id);
    check('recusado, o pedido some e o líder só volta ao assunto em ' + C.RECUSA_D + ' dias', ok2 && S.soc.pedidos.length === 0 && near((S.soc.recusa.barraca - S.t) / DAYM, C.RECUSA_D) && So.planejarObra(S) === null);
    check('quem dorme ao relento ouviu o não: fica mais descontente', dorme.every((p) => p.desc === 5 && p.descWhy.cama === 5));
    // o pedido caduca
    S = mk('pede');
    semCasa(S);
    q = So.planejarObra(S);
    S.t += (C.PEDIDO_D + 1) * DAYM; S.ck = Sim.clock(S.t);
    S.soc.recusa = {};
    const q2 = So.planejarObra(S);
    check('pedido sem resposta caduca em ' + C.PEDIDO_D + ' dias (e o líder pede de novo)', !!q2 && q2.id !== q.id && S.soc.pedidos.length === 1);
    So.setModo(S, 'eu');
    check('voltar para "Só eu marco" limpa os pedidos', S.soc.pedidos.length === 0);
    // modo 'decide'
    S = mk('decide');
    semCasa(S);
    S.stock.madeira = 100;
    q = So.planejarObra(S);
    check('"O povo decide": o líder marca sozinho', !!q && S.buildings.filter((b) => !b.built && b.povo).length === 1 && S.soc.pedidos.length === 0 && S.stats.obrasPovo === 1);
    S = mk('decide');
    semCasa(S);
    S.stock.madeira = 6;
    q = So.planejarObra(S);
    // 0.16: a casa não espera o teto de 40% (antes, ninguém juntava madeira para uma obra que não existia)
    check('0.16: casa não espera o estoque: com 6 de madeira, a barraca é marcada e o povo vai buscar o resto', !!q && q.type === 'barraca' && S.buildings.some((b) => !b.built && b.povo) && !S.soc.espera);
    Sim.refresh(S);
    check('0.16: e a obra marcada pede a madeira que falta', S.ctx.matShort.madeira >= 14 - 6);
    // sem líder, quem olha é o adulto mais velho
    S = mk('decide');
    semCasa(S); S.soc.lider = 0;
    const velho = S.people.filter((p) => p.alive && F.age(S, p) >= 18).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    S.events.length = 0;
    const qv = So.planejarObra(S);
    check('sem líder, quem marca é o adulto mais velho', !!qv && qv.type === 'barraca' && S.events.some((e) => e.k === 'toast' && e.text.indexOf(velho.name + ' marcou') === 0) || chronHas(S, new RegExp(velho.name + ' marcou')));
    // o jogador já tem obra demais marcada
    S = mk('decide');
    semCasa(S);
    for (let k = 0; k < So.obrasMax(S) + 2; k++) { const at = spot(S, 'fogueira', 6 + 2 * k); Sim.placeBlueprint(S, 'fogueira', at.x, at.y); }
    // 0.16: com gente na rua, uma casa fura a fila cheia (antes esperava para sempre); a segunda não
    const qf = So.planejarObra(S);
    check('0.16: com obras do jogador demais esperando (' + (So.obrasMax(S) + 2) + '), o povo ainda marca uma casa, e só ela', !!qf && qf.type === 'barraca' && S.buildings.filter((b) => b.povo && !b.built).length === 1);
    check('0.16: com essa casa já marcada, não põe mais nada na fila', So.planejarObra(S) === null);
    // aldeia grande: várias obras ao mesmo tempo, e a barraca avançada vira a casa grande do lugar
    {
      let SG = village(42, 40);
      SG.soc.modo = 'decide'; SG.soc.lider = SG.people[0].id;
      for (const b of SG.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(SG, b);
      build(SG, 'barraca', 3);
      SG.soc.semCama = 3; SG.soc.recusa = {};
      Object.assign(SG.stock, { madeira: 400, pedra: 100, fibra: 100 });
      const maxG = So.obrasMax(SG);
      So.planejarObra(SG);
      const novas = SG.buildings.filter((b) => b.povo && !b.built).length;
      check('aldeia grande sem casa: o povo marca várias obras de uma vez (até ' + maxG + ')', maxG >= 3 && novas >= 2 && novas <= maxG, novas + ' de ' + maxG);
      check('e não passa do que falta: as marcadas contam como lugares', So.capFutura(SG) <= F.bedsNeeded(SG) + 5 * 1 + 1 || novas === maxG, So.capFutura(SG) + ' lugares para ' + F.bedsNeeded(SG));
      // a barraca avançada vira a casa grande do lugar, se o material cabe
      SG = village(42, 40);
      SG.soc.modo = 'decide'; SG.soc.lider = SG.people[0].id;
      for (const b of SG.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(SG, b);
      const bb = build(SG, 'barraca', 3);
      bb.lv = 2;
      for (const id of ['oca', 'pedra', 'ceramica']) if (T.TECHS && T.TECHS[id] && !T.known(SG, id)) SG.tech.known[id] = { t: SG.t, by: 'teste', how: 'pratica' };
      SG.soc.semCama = 3; SG.soc.recusa = {};
      Object.assign(SG.stock, { madeira: 400, pedra: 200, fibra: 100, argila: 100, tabuas: 100 });
      const ops = Sim.upgrades(SG, bb).filter((o) => !o.why);
      So.planejarObra(SG);
      check('com material, a barraca avançada vira a casa grande do lugar (mais lugares no mesmo chão)', !ops.length || (!!bb.up && bb.povo === 1), ops.length ? (bb.up ? 'melhorando para ' + bb.up.kind : 'não melhorou') : 'sem casa possível aqui');
    }
    // pela hora do dia: às 7 h
    S = mk('decide');
    semCasa(S); S.soc.semCama = 0;
    for (const p of S.people) Sim.addMem(S, p, 'dormiuRelento');
    jump(S, S.ck.day, 23.9);
    run(S, 30 * 2);
    check('um dia sem cama ainda não basta', !S.buildings.some((b) => b.povo));
    run(S, 30 * 24 * 2, () => !S.buildings.some((b) => b.povo));
    check('dois dias seguidos faltando lugar, e às 7 h o líder marca a casa', S.buildings.some((b) => b.povo && b.type === 'barraca'), 'semCama ' + S.soc.semCama);
  }
  {
    // fogueira, armazém, cerca e mina
    const S = village(42, 10);
    S.soc.lider = S.people[0].id; So.setModo(S, 'decide');
    Object.assign(S.stock, { madeira: 200, pedra: 100 });
    // uma casa longe de qualquer fogo
    const longe = spot(S, 'barraca', 16);
    const casa = Sim.placeBlueprint(S, 'barraca', longe.x, longe.y); Sim.complete(S, casa);
    let f = So.faltas(S);
    check('casa a mais de ' + C.SOC_FOGO_LONGE + ' passos de um fogo pede fogueira', f.some((x) => x.type === 'fogueira' && x.perto === casa));
    let q = So.planejarObra(S);
    const fg = S.buildings.find((b) => b.type === 'fogueira' && !b.built);
    check('o líder marca a fogueira perto da casa', !!q && !!fg && fg.povo === 1 && Math.hypot(fg.x - casa.x, fg.y - casa.y) <= 7, fg ? Math.hypot(fg.x - casa.x, fg.y - casa.y).toFixed(1) : '-');
    Sim.complete(S, fg);
    check('com o fogo ali, a falta some', !So.faltas(S).some((x) => x.type === 'fogueira'));
    // comida estragando
    S.stats.winters = 1;
    S.soc.rot = C.SOC_ROT + 1;
    check('comida estragando (e o armazém já liberado) pede armazém', So.faltas(S).some((x) => x.type === 'armazem'));
    q = So.planejarObra(S);
    const arm = S.buildings.find((b) => b.type === 'armazem');
    check('0.16: o armazém do povo fica perto do centro (a até 10 passos)', !!arm && arm.povo === 1 && Math.hypot(arm.x + 1 - S.camp.x - 1, arm.y + 1 - S.camp.y - 1) <= 11);
    Sim.complete(S, arm);
    check('um armazém basta', !So.faltas(S).some((x) => x.type === 'armazem'));
    S.stats.winters = 0;
    const S0 = village(42, 10); S0.soc.rot = 9;
    check('antes do primeiro inverno o armazém ainda não existe: ninguém pede', !So.faltas(S0).some((x) => x.type === 'armazem'));
    // a média da comida que estraga
    S0.stats.rottedToday = 10; S0.soc.rot = 0;
    So.daily(S0); So.daily(S0); So.daily(S0);
    check('a conta do que estraga é uma média de alguns dias', S0.soc.rot > 5 && S0.soc.rot < 8, S0.soc.rot);
    // a cerca
    S.tech.known.roca = { t: S.t, by: 'teste', how: 'pratica' }; S.tech.known.cerca = { t: S.t, by: 'teste', how: 'pratica' };
    const at = spot(S, 'roca', 6);
    const roca = Sim.placeBlueprint(S, 'roca', at.x, at.y); Sim.complete(S, roca);
    K.farmOf(roca).raidDay = S.ck.day - 2;
    check('bicho entrou na roça sem cerca: o líder quer cercar', So.faltas(S).some((x) => x.type === 'cerca' && x.perto === roca));
    q = So.planejarObra(S);
    check('a cerca é marcada em volta da roça (o povo finca)', !!q && q.type === 'cerca' && S.campo.fjobs.length >= 8 && S.campo.fjobs.every((j) => j.povo === 1) && q.tiles.length === S.campo.fjobs.length, S.campo.fjobs.length + ' estacas');
    check('o custo da cerca entra no teto de material', So.custoDe(q).madeira === q.tiles.length * C.CERCA_WOOD);
    check('com a cerca marcada, o povo não marca outra coisa', So.planejarObra(S) === null);
    for (const j of S.campo.fjobs.slice()) K.finishFence(S, j);
    check('cercada a roça, a falta some', !So.faltas(S).some((x) => x.type === 'cerca') && K.enclosed(S, roca));
    // a mina
    S.soc.semPedra = 3; S.stock.pedra = 2;
    check('sem conhecer a mineração, ninguém pede mina', !So.faltas(S).some((x) => x.type === 'mina'));
    S.tech.known.mineracao = { t: S.t, by: 'teste', how: 'pratica' };
    check('faltando pedra por dois dias, com a mineração conhecida, o líder quer uma mina', So.faltas(S).some((x) => x.type === 'mina'));
    q = So.planejarObra(S);
    const mina = S.buildings.find((b) => b.type === 'mina');
    check('a mina vai para o pé da serra, se houver serra perto (senão, o líder desiste por uns dias)', mina ? (mina.povo === 1 && O.envOk(S, mina, 'serra')) : S.soc.recusa.mina > S.t, mina ? 'marcada' : 'sem serra por perto');
    // os contadores do dia
    const S2 = village(42, 10);
    for (const b of S2.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S2, b);
    S2.stock.pedra = 1;
    So.daily(S2); So.daily(S2);
    check('os dias sem cama e sem pedra são contados', S2.soc.semCama === 2 && S2.soc.semPedra === 2);
    build(S2, 'barraca', 3); for (let k = 0; k < 6; k++) build(S2, 'barraca', 3);
    S2.stock.pedra = 50;
    So.daily(S2);
    check('e zeram quando a falta acaba', S2.soc.semCama === 0 && S2.soc.semPedra === 0);
  }

  // ---------- H. descontentamento e dissidentes ----------
  {
    const S = village(42, 12), p = S.people[2], q = S.people[3], r = S.people[4], t = S.people[5], kid = add(S, 'M', 'Miúdo', 12);
    for (const x of S.people) { x.mem = []; x.mood = 60; x.desc = 0; x.descWhy = {}; }
    S.god.align = 0;
    for (const b of S.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S, b);
    Sim.addMem(S, p, 'dormiuRelento'); Sim.addMem(S, q, 'passouFome'); Sim.addMem(S, r, 'passouFrio'); Sim.addMem(S, t, 'injustica');
    Sim.addMem(S, kid, 'passouFome');
    So.daily(S);
    check('dormir ao relento por falta de casa soma ' + C.DESC_CAMA + ' por dia', p.desc === C.DESC_CAMA && p.descWhy.cama === C.DESC_CAMA);
    check('a fome soma ' + C.DESC_FOME + '; o frio, ' + C.DESC_FRIO + '; a injustiça vista, ' + C.DESC_INJ, q.desc === C.DESC_FOME && r.desc === C.DESC_FRIO && t.desc === C.DESC_INJ && t.descWhy.injustica === C.DESC_INJ);
    check('criança e jovem (menos de 16) não entram na conta', !kid.desc);
    check('quem não tem do que reclamar fica em zero', S.people[6].desc === 0);
    // cai quando o motivo passa
    for (const x of S.people) x.mem = [];
    p.desc = 10; q.desc = 10; q.mood = 70; p.mood = 50;
    So.daily(S);
    check('sem motivo, cai ' + C.DESC_CAI + ' por dia (um ponto a mais para quem anda de bom humor)', p.desc === 10 - C.DESC_CAI && q.desc === 10 - C.DESC_CAI - 1);
    p.desc = 1; So.daily(S);
    check('e some de vez, com os motivos', p.desc === 0 && Object.keys(p.descWhy).length === 0);
    // humor baixo, mas não o luto
    p.mood = 15; q.mood = 15; q.desc = 0; Sim.addMem(S, q, 'perdeuFamilia');
    So.daily(S);
    check('a vida ruim (humor abaixo de 25) soma; o luto, não (a dor de perder alguém não é culpa da aldeia)', p.desc === C.DESC_HUMOR && p.descWhy.humor === C.DESC_HUMOR && q.desc < C.DESC_HUMOR);
    // o líder ruim e o Deus temido
    for (const x of S.people) { x.mem = []; x.mood = 60; x.desc = 0; x.descWhy = {}; }
    const L0 = S.people[0];
    S.soc.lider = L0.id; L0.indole = { g: -50, m: -50, f: 50 };
    So.daily(S);
    check('um líder egoísta e violento desgasta todo mundo, um pouco por dia (menos ele)', near(p.desc, C.DESC_LIDER * 2) && p.descWhy.lider > 0 && L0.desc === 0);
    L0.indole = { g: 50, m: 50, f: 50 };
    for (const x of S.people) { x.desc = 0; x.descWhy = {}; }
    S.god.align = -40;
    So.daily(S);
    check('um Deus muito temido também', near(p.desc, C.DESC_MEDO) && p.descWhy.medo > 0);
    p.desc = C.DESC_TETO + 1; L0.indole = { g: -50, m: -50, f: -50 };
    So.daily(S);
    check('mas o líder ruim e o medo, sozinhos, não levam ninguém embora: param de somar em ' + C.DESC_TETO + ' (abaixo dos ' + C.DISS_DESC + ' de quem vai)', p.desc <= C.DESC_TETO + 1 && C.DESC_TETO < C.DISS_DESC, p.desc);
    L0.indole = { g: 50, m: 50, f: 50 };
    S.god.align = 0;
    // os povos que não se entendem
    const elfo = add(S, 'M', 'Taliel', 30, 'elfo');
    S.povos.mixed = true; Pv.recount(S);
    for (const x of S.people) { x.mem = []; x.desc = 0; x.descWhy = {}; x.mood = 60; }
    S.povos.conv['elfo|humano'] = C.CONV_LOW - 5;
    So.daily(S);
    check('com a convivência no chão, quem é do povo menor vai ficando descontente; a maioria, não', elfo.desc === C.DESC_POVO && elfo.descWhy.povo === C.DESC_POVO && p.desc === 0);
    S.povos.conv['elfo|humano'] = C.CONV_START;
    elfo.desc = 0;
    So.daily(S);
    check('com a convivência do começo (' + C.CONV_START + '), ninguém reclama por ser de outro povo', elfo.desc === 0);
    check('o painel mostra o descontentamento e o maior motivo', (() => { p.desc = 44.4; p.descWhy = { cama: 30, fome: 9 }; const i = So.pessoaInfo(S, p); return i.desc === 44 && i.descPq === 'cama'; })());
  }
  {
    // o grupo que avisa
    const mk = (n, nDesc, o) => {
      const S = village(42, n);
      S.soc.lider = S.people[0].id; S.god.poder = 100; S.god.align = 0;
      for (const p of S.people) { p.mem = []; p.mood = 60; p.desc = 0; p.descWhy = {}; p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
      for (let k = 0; k < nDesc; k++) { const p = S.people[2 + k]; p.desc = 80 - k; p.descWhy = { [(o && o.why) || 'cama']: 60 }; }
      S.events.length = 0; S.chron.length = 0;
      return S;
    };
    let S = mk(14, 3);
    check('três descontentes não bastam (o grupo precisa de ' + C.DISS_MIN + ')', So.juntar(S) === null && !S.soc.diss);
    S = mk(8, 5);
    check('numa aldeia com menos de ' + C.DISS_ALDEIA + ' adultos, ninguém vai embora', So.juntar(S) === null);
    S = mk(14, 5);
    const d = So.juntar(S);
    check('com ' + C.DISS_MIN + ' ou mais descontentes numa aldeia grande, o grupo avisa que vai embora', !!d && d.st === 'aviso' && d.ids.length === 5 && d.cab === S.people[2].id && d.motivo === 'cama' && near((d.prazo - S.t) / 60, C.DISS_PRAZO_H));
    check('a crônica dá os nomes e o motivo, e o jogo pede resposta', chronHas(S, /avisaram que vão embora: falta casa/) && So.pending(S).k === 'diss' && S.events.some((e) => e.k === 'soc' && e.ev === 'pend') && S.events.some((e) => e.k === 'soc' && e.ev === 'aviso'));
    const info = So.pendInfo(S);
    check('a janela mostra quem são, por quê, o prazo e as três saídas', info.k === 'diss' && info.n === 5 && info.nomes.length === 5 && info.motivoTxt === 'falta casa' && info.prazoH === C.DISS_PRAZO_H && info.promTxt === 'Casa para todos' && info.promDias === 12 && info.custo === C.DISS_MILAGRE && /Erga casas/.test(info.promComo));
    check('enquanto um grupo espera resposta, não se forma outro', So.juntar(S) === null && S.soc.pend.length === 1);
    check('o líder e o escolhido não vão; quem cumpre pena também não', (() => { const S2 = mk(14, 6); S2.soc.lider = S2.people[2].id; S2.people[3].escolhido = { power: 'cura' }; S2.people[4].pena = { k: 'trabalho', ate: S2.t + 999, cid: 1, dias: 3 }; const d2 = So.juntar(S2); return d2 === null || (d2.ids.indexOf(S2.people[2].id) < 0 && d2.ids.indexOf(S2.people[3].id) < 0 && d2.ids.indexOf(S2.people[4].id) < 0); })());
    // nunca mais que uma parte da aldeia, e no máximo DISS_MAX
    S = mk(30, 20);
    const d3 = So.juntar(S);
    check('o grupo tem no máximo ' + C.DISS_MAX + ' adultos, por mais descontentes que haja', !!d3 && d3.ids.length <= C.DISS_MAX + 2 && d3.ids.length >= C.DISS_MIN, d3 ? d3.ids.length : 0);
    S = mk(10, 8);
    const d4 = So.juntar(S);
    check('e nunca passa de ' + C.DISS_FRAC * 100 + '% dos adultos da aldeia', !!d4 && d4.ids.length <= Math.floor(10 * C.DISS_FRAC) + 2, d4 ? d4.ids.length : 0);
    // os pares e os filhos
    S = mk(16, 5);
    const a = S.people[2], par = S.people[10], b = S.people[3], par2 = S.people[11];
    F.link(S, a, par, 70); par.desc = 30;                       // o par também não está contente: vai junto
    F.link(S, b, par2, 70); par2.desc = 0;                      // o par está contente: quem ama fica
    const f1 = add(S, 'F', 'Pequena', 6), f2 = add(S, 'M', 'Crescido', 15), f3 = add(S, 'F', 'DoOutro', 5);
    f1.mother = a.sex === 'F' ? a.id : par.id; f1.father = a.sex === 'F' ? par.id : a.id;
    f2.mother = f1.mother; f2.father = f1.father;
    f3.mother = b.sex === 'F' ? b.id : par2.id; f3.father = b.sex === 'F' ? par2.id : b.id;
    const d5 = So.juntar(S);
    check('o par que também não está contente vai junto', !!d5 && d5.ids.indexOf(par.id) >= 0 && d5.ids.indexOf(a.id) >= 0);
    check('quem ama alguém contente fica (o amor segura)', d5.ids.indexOf(b.id) < 0 && d5.ids.indexOf(par2.id) < 0);
    check('os filhos pequenos vão com os pais; o de 14 anos ou mais decide por si; o filho de quem fica, fica', d5.kids.indexOf(f1.id) >= 0 && d5.kids.indexOf(f2.id) < 0 && d5.kids.indexOf(f3.id) < 0 && So.pendInfo(S).kids === d5.kids.length);
    // o motivo é o que mais pesa no grupo
    S = mk(14, 5, { why: 'fome' });
    check('o motivo do grupo é o que mais pesa entre eles', So.juntar(S).motivo === 'fome' && So.pendInfo(S).motivoTxt === 'passaram fome' && So.pendInfo(S).promTxt === 'Comida farta');
    // com o jogo fechado, nada
    S = mk(14, 5);
    S.safe = true;
    So.daily(S);
    check('com o jogo fechado, ninguém avisa nem vai embora', !S.soc.diss);
    S.safe = false;
    jump(S, S.ck.day, 23.9);
    run(S, 10);
    check('com o jogo aberto, o aviso vem na virada do dia', !!S.soc.diss && S.soc.diss.st === 'aviso');
  }
  {
    // as três respostas
    const mk = (why) => {
      const S = village(42, 14);
      S.soc.lider = S.people[0].id; S.god.poder = 100; S.god.align = 0;
      for (const p of S.people) { p.mem = []; p.mood = 60; p.desc = 0; p.descWhy = {}; p.fe = 50; p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
      for (let k = 0; k < 5; k++) { const p = S.people[2 + k]; p.desc = 80 - k; p.descWhy = { [why || 'cama']: 60 }; }
      So.juntar(S);
      S.events.length = 0; S.chron.length = 0;
      return S;
    };
    // o milagre
    let S = mk();
    let res = So.dissResp(S, 'milagre');
    check('convencer com um milagre: custa ' + C.DISS_MILAGRE + ' de Poder e o grupo fica', res.ok && S.god.poder === 100 - C.DISS_MILAGRE && !S.soc.diss && !So.pending(S) && S.people[2].desc === 80 - 45 && S.people[2].fe === 60 && hasMem(S.people[2], 'viuMilagre'));
    check('mas o motivo continua (a crônica avisa), e o grupo só se junta de novo depois de 20 dias', chronHas(S, /segurou quem ia embora. O motivo continua: falta casa/) && near((S.soc.dissCool - S.t) / DAYM, 20) && S.events.some((e) => e.k === 'soc' && e.ev === 'sinal'));
    S = mk(); S.god.poder = 10;
    res = So.dissResp(S, 'milagre');
    check('sem Poder, não há milagre (o aviso continua esperando)', !res.ok && /Falta Poder/.test(res.msg) && !!S.soc.diss && S.soc.diss.st === 'aviso' && !!So.pending(S));
    // a promessa cumprida
    S = mk();
    for (const b of S.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S, b);
    res = So.dissResp(S, 'promessa');
    check('prometer casa para todos: o grupo espera 12 dias e sossega um pouco', res.ok && S.soc.diss.st === 'promessa' && S.soc.diss.prom.k === 'cama' && near((S.soc.diss.prom.ate - S.t) / DAYM, 12) && S.people[2].desc === 80 - 25 && !So.pending(S) && chronHas(S, /prometeu a quem ia embora: casa para todos, em 12 dias/));
    check('a tela mostra a promessa em andamento', So.dissInfo(S).prom.txt === 'Casa para todos' && So.dissInfo(S).prom.dias === 12 && So.pendInfo(S) === null);
    So.daily(S);
    check('enquanto não cumpre e o prazo não vence, nada acontece', !!S.soc.diss && S.soc.diss.st === 'promessa');
    for (let k = 0; k < 10; k++) build(S, 'barraca', 3);
    const al0 = S.god.align;
    S.t += DAYM; S.ck = Sim.clock(S.t);
    So.daily(S);
    check('cumprida antes do prazo: o grupo fica, a fé sobe e Deus fica mais querido', !S.soc.diss && S.people[2].desc <= 15 && S.people[2].fe >= 58 && S.god.align >= al0 + 2 && chronHas(S, /prometeu casa para todos e cumpriu. Quem ia embora ficou/) && S.stats.promessasOk === 1);
    check('vira conto: a palavra cumprida', S.memoria.contos.some((x) => x.k === 'palavra' && x.r === 1 && x.tone === 1) && M.contosInfo(S)[0].titulo === 'A palavra cumprida');
    // a promessa quebrada
    S = mk();
    for (const b of S.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S, b);
    So.dissResp(S, 'promessa');
    const fe0 = S.people[9].fe, al1 = S.god.align;
    S.t += 12 * DAYM + 60; S.ck = Sim.clock(S.t); Sim.refresh(S);
    So.daily(S);
    check('passou o prazo sem cumprir: o grupo vai embora na hora, sem novo aviso', !!S.soc.diss && S.soc.diss.st === 'indo' && S.soc.diss.laco === -30 && !So.pending(S) && S.stats.promessasNao === 1);
    check('todos perdem fé e Deus fica menos querido; vira conto de palavra quebrada', S.people[9].fe === fe0 - 6 && S.god.align === al1 - 4 && hasMem(S.people[9], 'promessaQuebrada') && S.memoria.contos.some((x) => x.k === 'palavra' && x.r === 0 && x.tone === -1));
    // cada motivo tem a sua promessa
    check('cada motivo tem a promessa que lhe cabe', ['cama', 'fome', 'frio', 'humor', 'povo', 'injustica', 'lider', 'medo'].every((k) => So.PROM[k] && So.PROM[k].txt && So.PROM[k].dias > 0 && typeof So.PROM[k].ok === 'function' && So.DESC[k]));
    S = mk('fome');
    for (const k of T.FOOD) S.stock[k] = 0;
    Sim.refresh(S);
    So.dissResp(S, 'promessa');
    check('a de comida: 5 dias de comida no estoque', S.soc.diss.prom.k === 'fome' && !So.PROM.fome.ok(S, S.soc.diss) && (() => { S.stock.peixe = 500; Sim.refresh(S); return So.PROM.fome.ok(S, S.soc.diss); })());
    S = mk('lider');
    const L0 = S.soc.lider;
    So.dissResp(S, 'promessa');
    check('a de outra voz: o líder de agora sai e não pode ser escolhido de novo', S.soc.lider === 0 && S.soc.vetado === L0 && So.candidatos(S).every((q) => q.id !== L0));
    jump(S, S.ck.day, 17.9); run(S, 10);
    So.daily(S);
    check('na tardinha o povo escolhe outro, e a promessa está cumprida', S.soc.lider > 0 && S.soc.lider !== L0 && !S.soc.diss);
    S = mk('injustica');
    S.soc.crimes.push({ id: 99, k: 'furto', g: 2, by: S.people[9].id, byN: 'X', t: S.t, x: 0, y: 0, wit: [], st: 'julgado', cond: S.people[2].id, injusto: 1, pena: 'trabalho', dias: 3 });
    So.dissResp(S, 'promessa');
    check('a de justiça: enquanto houver um inocente condenado, não está cumprida', !So.PROM.injustica.ok(S, S.soc.diss) && (() => { S.god.poder = 50; So.revelar(S, 99); return So.PROM.injustica.ok(S, S.soc.diss); })());
    S = mk('medo');
    S.god.align = -50;
    So.dissResp(S, 'promessa');
    check('a de um Deus mais brando: é preciso puxar para o lado bondoso (12 pontos, ou sair do medo)', !So.PROM.medo.ok(S, S.soc.diss) && (() => { S.god.align = -38; return So.PROM.medo.ok(S, S.soc.diss); })());
    S = mk('humor');
    So.dissResp(S, 'promessa');
    check('a de dias melhores: uma festa', !So.PROM.humor.ok(S, S.soc.diss) && (() => { S.stats.parties = (S.stats.parties || 0) + 1; return So.PROM.humor.ok(S, S.soc.diss); })());
    // sem resposta
    S = mk();
    jump(S, S.ck.day, 10);
    S.soc.diss.prazo = S.t + 60;
    S.t += 2 * 60; S.ck = Sim.clock(S.t); Sim.refresh(S);
    So.hourly(S);
    check('sem resposta em ' + C.DISS_PRAZO_H + ' horas, eles vão', S.soc.diss.st === 'indo' && !So.pending(S) && S.soc.diss.laco === 0);
    // resposta fora de hora
    check('não se responde duas vezes', !So.dissResp(S, 'milagre').ok);
  }

  // ---------- I. a partida e a vila de fora ----------
  // uma aldeia com um grupo que já decidiu ir (resposta: deixar ir)
  function aldeiaComGrupo(seed, n, o) {
    const S = village(seed, n);
    S.soc.lider = S.people[0].id; S.god.poder = 200; S.god.align = 0;
    for (const p of S.people) { p.mem = []; p.mood = 60; p.desc = 0; p.descWhy = {}; p.fe = 50; p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    for (let k = 0; k < 5; k++) { const p = S.people[2 + k]; p.desc = 80 - k; p.descWhy = { [(o && o.why) || 'cama']: 60 }; }
    if (o && o.prep) o.prep(S);
    So.juntar(S);
    S.events.length = 0; S.chron.length = 0;
    return S;
  }
  // funda a vila sem a caminhada (todos chegam na hora)
  function fundaJa(S, laco) {
    So.dissResp(S, 'ir');
    const d = S.soc.diss;
    if (laco !== undefined) d.laco = laco;
    d.sai = S.t; d.saiu = 1;
    for (const id of d.ids.concat(d.kids)) d.chegou[id] = 1;
    So.tick(S);
    return S.soc.vila;
  }
  {
    const S = aldeiaComGrupo(42, 14);
    jump(S, S.ck.day, 9);
    const st = So.sitio(S, C.VILA_DIST, C.VILA_DIST_MAX);
    check('há um lugar para a outra vila a ' + C.VILA_DIST + ' passos ou mais, em chão firme e com caminho até lá', !!st && Math.hypot(st.x - S.camp.x - 1, st.y - S.camp.y - 1) >= C.VILA_DIST - 1 && !!W.findPath(S.world, S.camp.y * S.world.W + S.camp.x, st.y * S.world.W + st.x, 1400), st ? Math.hypot(st.x - S.camp.x - 1, st.y - S.camp.y - 1).toFixed(0) + ' passos' : 'nenhum');
    const res = So.dissResp(S, 'ir');
    const d = S.soc.diss, ids = d.ids.slice();
    check('deixar ir: de dia, saem já; o destino é o lugar novo', res.ok && d.st === 'indo' && d.sai === S.t && !So.pending(S) && near(d.dest.x, st.x + 0.5) && near(d.dest.y, st.y + 0.5) && d.laco === 10);
    const comida0 = S.ctx.food, n0 = alive(S).length;
    let txt = '', andando = 0;
    run(S, 6, () => { for (const id of ids) { const p = F.person(S, id); if (doing(p, 'partir')) { andando++; txt = AI.describe(S, p); } } });
    Sim.refresh(S);
    check('saem juntos, com comida para o caminho (duas porções por cabeça)', andando >= 5 && txt === 'Indo embora com o grupo' && comida0 - S.ctx.food >= 10 && d.levou === 10, (comida0 - S.ctx.food) + ' porções');
    check('enquanto andam, a Sociedade pede o passo a passo', So.busy(S));
    let maxD = 0;
    const p0 = F.person(S, ids[0]);
    run(S, 30 * 30, () => { for (const p of S.people) if (p.alive) { p.needs.fome = Math.max(p.needs.fome, 70); p.needs.sede = Math.max(p.needs.sede, 70); p.needs.energia = Math.max(p.needs.energia, 60); } if (S.people.indexOf(p0) >= 0) maxD = Math.max(maxD, Math.hypot(p0.x - S.camp.x - 1, p0.y - S.camp.y - 1)); return !!S.soc.diss; });
    const v = S.soc.vila;
    check('eles andam até lá de verdade (' + C.VILA_DIST + ' passos ou mais) e fundam a outra vila', !!v && !S.soc.diss && maxD >= C.VILA_DIST - 6 && v.x === st.x && v.y === st.y && !v.longe, maxD.toFixed(0) + ' passos');
    check('saem da aldeia: não contam como vivos nem como mortos', alive(S).length === n0 - 5 && S.people.every((p) => ids.indexOf(p.id) < 0) && S.soc.fora.length === 5 && S.soc.fora.every((p) => p.alive === false && p.fora > 0 && p.away.why === 'dissidente' && p.away.vila === 1) && S.stats.dissidentes === 5);
    check('a crônica conta quem foi, por quê, o nome e a distância da vila nova', chronHas(S, new RegExp(p0.name + ' e mais 4 foram embora \\(falta casa\\) e fundaram outra vila, ' + v.nome + ', a \\d+ passos daqui')) && chronHas(S, /pode trocar, casar e brigar com a de cá, e pode voltar/));
    const vi = So.vilaInfo(S);
    check('a vila de fora tem nome, gente, bem-estar e laço com a aldeia', vi.nome === v.nome && vi.pop === 5 && vi.adultos === 5 && vi.laco === 10 && vi.lacoTxt === 'em paz' && vi.bem === 60 && vi.motivo === 'falta casa' && vi.cab === p0.name && vi.gente.length === 5 && vi.hist.length === 1 && So.vilaPop(S) === 5);
    check('quem foi ainda é achado pelo id, e a tela diz onde vive', F.person(S, p0.id) === p0 && AI.describe(S, p0) === 'Foi embora com o grupo. Vive em ' + v.nome);
    check('depois da saída, ' + C.DISS_COOL_D + ' dias de sossego, e Deus fica um pouco menos querido', near((S.soc.dissCool - S.t) / DAYM, C.DISS_COOL_D, 0.01) && S.god.align === -2 && !So.busy(S));
    check('as camas de quem foi ficam livres', !S.buildings.some((b) => b.beds && b.beds.some((id) => ids.indexOf(id) >= 0)));
    Sim.advance(S, 600);
    check('a aldeia segue sem eles (sem erro no passo)', !S.over && alive(S).length === n0 - 5);
  }
  {
    // quem fica: os pares, os filhos, a saudade
    const S = aldeiaComGrupo(42, 16, { prep: (S) => {
      const a = S.people[2], par = S.people[10], b = S.people[3], par2 = S.people[11];
      F.link(S, a, par, 70); par.desc = 30;
      F.link(S, b, par2, 30); par2.desc = 0;               // pouco afeto: vai mesmo assim, e o par fica
      const f1 = add(S, 'F', 'Pequena', 6), f2 = add(S, 'M', 'Crescido', 15), bebe = add(S, 'F', 'Nenê', 1);
      for (const k of [f1, f2, bebe]) { k.mother = a.sex === 'F' ? a.id : par.id; k.father = a.sex === 'F' ? par.id : a.id; }
      bebe.carriedBy = k_mae(S, a, par).id;
      S.people[12].rel[a.id] = 9;
    } });
    function k_mae(S, a, par) { return a.sex === 'F' ? a : par; }
    const a = S.people[2], par = S.people[10], b = S.people[3], par2 = S.people[11], amigo = S.people[12];
    const f1 = S.people.find((p) => p.name === 'Pequena'), f2 = S.people.find((p) => p.name === 'Crescido'), bebe = S.people.find((p) => p.name === 'Nenê');
    const v = fundaJa(S);
    check('o casal vai junto e continua casal; os filhos pequenos e o bebê de colo vão com eles', !!v && a.fora > 0 && par.fora > 0 && F.isPartner(a, par) && f1.fora > 0 && bebe.fora > 0);
    check('o filho de 15 anos ficou, e sente a falta da família', S.people.indexOf(f2) >= 0 && f2.alive && hasMem(f2, 'parenteFoi'));
    check('o par que ficou perde o laço e sente', b.fora > 0 && S.people.indexOf(par2) >= 0 && !F.isPartner(b, par2) && hasMem(par2, 'parenteFoi'));
    check('o amigo que ficou também sente', hasMem(amigo, 'amigoFoi'));
    check('a vila conta todo mundo, crianças inclusive', So.vilaPop(S) === S.soc.fora.length && S.soc.fora.length >= 8 && So.vilaInfo(S).adultos < So.vilaInfo(S).pop);
    check('o parentesco atravessa: o filho que ficou e a irmã que foi continuam parentes próximos', F.closeKin(S, f2, f1) && F.relation(S, f2, a) !== '');
    Sim.advance(S, 300);
    check('o bebê que foi não fica "no colo" de ninguém daqui (sem erro no passo)', !S.over && S.people.every((p) => !p.carriedBy || F.person(S, p.carriedBy).alive));
  }
  {
    // o mapa sem lugar: vão para longe (a vila existe, mas fora da vista)
    const S = aldeiaComGrupo(42, 14);
    const sit0 = So.sitio;
    // sem nenhum lugar alcançável a 40 passos (uma ilha, por exemplo)
    const w = S.world, saved = w.block.slice();
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (Math.hypot(x - S.camp.x, y - S.camp.y) > 30) w.block[y * w.W + x] = 1;
    check('numa terra cercada, não há lugar a ' + C.VILA_DIST + ' passos', So.sitio(S, C.VILA_DIST, C.VILA_DIST_MAX) === null);
    jump(S, S.ck.day, 9);
    So.dissResp(S, 'ir');
    run(S, 5);
    w.block.set(saved);
    const v = S.soc.vila;
    check('eles vão embora do mesmo jeito, para longe (a vila existe, mas não aparece no mapa)', !!v && v.longe === 1 && S.soc.fora.length === 5 && chronHas(S, /fundaram outra vila, .*, longe daqui/) && So.vilaInfo(S).longe);
  }
  {
    // um dia na vila de fora, sem simular ninguém
    const S = aldeiaComGrupo(42, 16, { prep: (S) => { for (let k = 0; k < 5; k++) setAge(S, S.people[2 + k], 22 + k); } });
    const v = fundaJa(S);
    const r0 = S.rng.s;
    let nasc = 0, bemMin = 100, bemMax = 0;
    for (let d = 0; d < 60 * 6; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); S.safe = true; So.daily(S); S.safe = false; nasc = v.filhos.length; bemMin = Math.min(bemMin, v.bem); bemMax = Math.max(bemMax, v.bem); }
    check('em seis anos nascem crianças lá (uns ' + C.VILA_NASC + ' por casal por ano)', nasc >= 1 && nasc <= 12, nasc + ' nascidos');
    check('o bem-estar sobe e desce com as estações, entre 0 e 100', bemMin >= 0 && bemMax <= 100 && bemMax - bemMin > 8, bemMin.toFixed(0) + ' a ' + bemMax.toFixed(0));
    check('com o jogo fechado a vila anda nos números, sem gastar o sorteio do mundo e sem visita', S.rng.s === r0 && !Object.values(S.narr.groups).some((g) => g.kind === 'vila'));
    check('os filhos de lá têm mãe e pai de lá, que não são parentes próximos', v.filhos.every((f) => { const m = So.away(S, f.mae), p = So.away(S, f.pai); return m && p && m.sex === 'F' && p.sex === 'M' && !F.closeKin(S, m, p); }));
    check('a mágoa passa com o tempo: o laço ruim vai voltando para perto de zero', (() => { v.laco = -40; for (let d = 0; d < 200; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); S.safe = true; So.daily(S); S.safe = false; } return v.laco > -40 + 14 && v.laco < 0; })(), v.laco.toFixed(1));
    // os velhos se vão
    const velho = S.soc.fora[0];
    setAge(S, velho, 95);
    let morreu = false;
    for (let d = 0; d < 60 * 10 && !morreu; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); S.safe = true; So.daily(S); S.safe = false; morreu = !!velho.morto; }
    check('os velhos de lá morrem lá (e a notícia fica esperando a próxima visita)', morreu && v.mortes >= 1 && v.novas.indexOf(velho.name) >= 0 && /Morreu longe daqui, em /.test(AI.describe(S, velho)));
    check('quem morreu lá sai da conta da vila', So.vilaInfo(S).gente.every((q) => q.id !== velho.id));
    // a vila que esvazia acaba
    for (const q of S.soc.fora) q.morto = S.t;
    v.filhos = [];
    S.chron.length = 0;
    So.daily(S);
    check('sem ninguém, a vila acaba', v.fim > 0 && chronHas(S, new RegExp('Em ' + v.nome + ' não mora mais ninguém')) && So.vilaPop(S) === 0 && So.vilaInfo(S).fim > 0);
  }
  {
    // a troca
    const S = aldeiaComGrupo(42, 14);
    const v = fundaJa(S);
    jump(S, dryFrom(S, S.ck.day + 1, 3), 8);
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    Object.assign(S.stock, { pedra: 0, couro: 5, fibra: 5, argila: 5, seca: 5, defumado: 5, frutas: 200, peixe: 50, madeira: 60, milho: 0, feijao: 0, carne: 0 });
    const kin = S.people[6]; for (const q of S.soc.fora) q.mother = kin.id;
    S.events.length = 0;
    const k = So.vilaFaz(S, 'troca');
    const g = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    check('a troca: um ou dois de lá vêm pela trilha (gente que tinha ido embora)', k === 'troca' && !!g && g.what === 'troca' && g.ents.length >= 1 && g.ents.length <= 2 && N.entsOf(S, g.id).every((e) => So.away(S, e.pd.pid)) && S.events.some((e) => e.k === 'toast' && new RegExp('Gente de ' + v.nome + ' vem pela trilha').test(e.text)));
    check('quem está de visita não pede abrigo (a janela de acolher não abre)', N.pending(S) === null);
    const e0 = N.entsOf(S, g.id)[0];
    const ang = Math.atan2(e0.y - S.camp.y - 1, e0.x - S.camp.x - 1), angV = Math.atan2(v.y - S.camp.y - 1, v.x - S.camp.x - 1);
    check('eles chegam pelo lado onde a vila fica', Math.abs(Math.atan2(Math.sin(ang - angV), Math.cos(ang - angV))) < 1.6, (ang - angV).toFixed(2));
    const laco0 = v.laco;
    let chegou = false;
    withRng(S, [0.5], () => run(S, 30 * 8, () => { chegou = g.state === 'visita'; return !chegou; }));
    check('chegam ao estoque e trocam: trazem o que falta aqui (pedra, couro...) e levam do que sobra (frutas)', chegou && chronHas(S, /trouxe(ram)? 9 de [a-zçã]+ e lev(aram|ou) 9 de frutas/) && S.stats.trocasVila === 1 && v.laco === laco0 + 6, 'laço ' + laco0 + ' → ' + v.laco + ' · ' + S.chron.map((c) => c.text).filter((x) => /trou/.test(x)).join(' | '));
    check('a primeira troca vai para a crônica; a parente que ficou revê a filha', chronHas(S, /É a primeira troca com a vila de quem foi embora/) && hasMem(kin, 'visitaVila'));
    run(S, 30 * 8, () => !!S.narr.groups[g.id]);
    check('depois de umas horas a visita se despede e some pela trilha', !S.narr.groups[g.id] && !S.narr.ents.some((e) => e.gid === g.id));
    // sem sobra, deixam de presente
    Object.assign(S.stock, { frutas: 5, peixe: 5, madeira: 5, milho: 0, feijao: 0, carne: 0, couro: 0 });
    So.vilaFaz(S, 'troca');
    const g2 = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    const evs = withRng(S, [0.5], () => runRaw(S, 30 * 8, () => g2.state !== 'visita'));
    check('se aqui não sobra nada, deixam de presente', toasts(evs, /trouxe(ram)? 9 de [a-zçã]+, de presente/).length === 1, evs.filter((e) => e.k === 'toast').map((e) => e.text).join(' | ').slice(0, 200));
    // a visita traz a notícia de quem morreu lá
    run(S, 30 * 8, () => !!S.narr.groups[g2.id]);
    v.novas = ['Fulana'];
    So.vilaFaz(S, 'troca');
    const g3 = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    const evs3 = withRng(S, [0.5], () => run(S, 30 * 8, () => g3.state !== 'visita'));
    check('a visita traz notícia de quem morreu lá', toasts(evs3, /Notícia de .*: Fulana morreu lá/).length === 1 && v.novas.length === 0);
    // o save com a visita no caminho
    run(S, 30 * 8, () => !!S.narr.groups[g3.id]);
    So.vilaFaz(S, 'troca');
    const S2 = clone(S);
    const g4 = Object.values(S2.narr.groups).find((x) => x.kind === 'vila');
    check('o save guarda a visita no caminho', !!g4 && g4.what === 'troca' && S2.soc.vila.nome === v.nome && S2.soc.fora.length === S.soc.fora.length);
    const tr0 = S2.stats.trocasVila;
    withRng(S2, [0.5], () => run(S2, 30 * 8, () => g4.state !== 'visita'));
    check('e ela chega e troca no jogo reaberto', S2.stats.trocasVila === tr0 + 1);
  }
  {
    // o casamento
    const S = aldeiaComGrupo(42, 16);
    const v = fundaJa(S);
    v.laco = 30;
    jump(S, dryFrom(S, S.ck.day + 1, 3), 8);
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; for (const q of S.people) if (q !== p && !F.isPartner(p, q)) F.link(S, p, p, 0); }
    for (const p of S.people) p.bonds = {};
    // todo mundo aqui tem par, menos uma pessoa
    const livre = S.people[9];
    for (let i = 0; i + 1 < S.people.length; i += 2) { const a = S.people[i], b = S.people[i + 1]; if (a !== livre && b !== livre) F.link(S, a, b, 60); }
    const sós = S.people.filter((p) => !F.partners(S, p).length);
    for (const p of sós) if (p !== livre) F.link(S, p, S.people[0], 10);
    livre.desc = 0;
    const la = S.soc.fora.find((q) => q.sex !== livre.sex);
    for (const q of S.soc.fora) q.bonds = {};
    const n0 = alive(S).length;
    const k = withRng(S, [0.9], () => So.vilaFaz(S, 'casamento'));
    const g = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    check('casamento: alguém de lá vem para casar com quem está só aqui', k === 'casamento' && !!g && g.what === 'casar' && g.com === livre.id && g.ents.length === 1);
    const pd = N.entsOf(S, g.id)[0].pd;
    check('nunca um parente próximo, e sempre adulto', F.age(S, So.away(S, pd.pid) || { born: S.t - pd.age * Y }) >= 18 && (!pd.pid || !F.closeKin(S, livre, So.away(S, pd.pid))));
    run(S, 30 * 8, () => g.state === 'vindo');
    const novo = S.people.find((p) => p.id === pd.pid) || S.people[S.people.length - 1];
    check('chega, casa e fica morando aqui (a mesma pessoa que tinha ido embora, com o mesmo id)', alive(S).length === n0 + 1 && F.isPartner(livre, novo) && novo.alive && !novo.fora && S.stats.casamentosVila === 1 && v.laco === 42 && chronHas(S, new RegExp(novo.name + ', de ' + v.nome + ', veio morar aqui: casou com ' + livre.name)));
    check('a janela de acolher não abre para quem vem casar', N.pending(S) === null && hasMem(novo, 'acolhido') && hasMem(livre, 'novoPar'));
    check('a vila guarda quando foi o último casamento (um por ano, no máximo)', v.casouT > 0 && S.t - v.casouT < Y);
    Sim.advance(S, 400);
    check('a vida segue com a pessoa de volta (sem erro no passo)', !S.over && novo.alive);
    // na outra direção: quem é daqui vai morar lá
    const S2 = aldeiaComGrupo(42, 16);
    const v2 = fundaJa(S2);
    v2.laco = 30;
    for (const p of S2.people) p.bonds = {};
    const livre2 = S2.people[9];
    for (let i = 0; i + 1 < S2.people.length; i += 2) { const a = S2.people[i], b = S2.people[i + 1]; if (a !== livre2 && b !== livre2) F.link(S2, a, b, 60); }
    for (const p of S2.people) if (p !== livre2 && !F.partners(S2, p).length) F.link(S2, p, S2.people[0], 10);
    for (const q of S2.soc.fora) q.bonds = {};
    livre2.desc = 40;
    const mae = S2.people[1]; livre2.mother = mae.id;
    const m0 = alive(S2).length;
    const k2 = So.vilaFaz(S2, 'casamento');
    check('quem não está contente aqui vai morar lá: casa com alguém que tinha ido embora', k2 === 'casamento' && S2.people.indexOf(livre2) < 0 && livre2.fora > 0 && livre2.away.why === 'casou' && livre2.away.vila === 1 && alive(S2).length === m0 - 1 && Object.keys(livre2.bonds).length === 1);
    check('a mãe que ficou sente a falta; a crônica e a tela contam', hasMem(mae, 'parenteFoi') && chronHas(S2, new RegExp(livre2.name + ' foi morar em ' + v2.nome + ': casou com ')) && /^Foi morar fora: casou\. Vive em \S+$/.test(AI.describe(S2, livre2)));
    // quando lá não há ninguém livre, vem alguém de fora (gente nova)
    const S3 = aldeiaComGrupo(42, 16);
    const v3 = fundaJa(S3);
    v3.laco = 30;
    for (const p of S3.people) p.bonds = {};
    const livre3 = S3.people[9];
    for (let i = 0; i + 1 < S3.people.length; i += 2) { const a = S3.people[i], b = S3.people[i + 1]; if (a !== livre3 && b !== livre3) F.link(S3, a, b, 60); }
    for (const p of S3.people) if (p !== livre3 && !F.partners(S3, p).length) F.link(S3, p, S3.people[0], 10);
    for (const q of S3.soc.fora) if (q.sex !== livre3.sex) q.morto = S3.t;      // ninguém do outro sexo livre por lá
    jump(S3, dryFrom(S3, S3.ck.day + 1, 3), 8);
    for (const p of S3.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    const pid0 = S3.nextPid;
    So.vilaFaz(S3, 'casamento');
    const g3 = Object.values(S3.narr.groups).find((x) => x.kind === 'vila');
    run(S3, 30 * 8, () => !!g3 && g3.state === 'vindo');
    const novo3 = S3.people.find((p) => p.id >= pid0);
    check('sem ninguém livre lá, vem gente nova (que a vila acolheu): ganha índole e casa do mesmo jeito', !!novo3 && F.isPartner(livre3, novo3) && !!novo3.indole && novo3.sex !== livre3.sex && F.age(S3, novo3) >= 18);
  }
  {
    // a briga, o presente e o trovão
    const S = aldeiaComGrupo(42, 14);
    const v = fundaJa(S, -30);
    check('quem saiu por promessa quebrada (ou de mal) começa de mal com a aldeia', v.laco === -30 && So.vilaInfo(S).lacoTxt === 'de mal');
    Object.assign(S.stock, { frutas: 100, peixe: 100, carne: 0, seca: 0, defumado: 0, milho: 0, feijao: 0 });
    So.vilaFaz(S, 'briga');
    check('a briga: marcam para buscar comida de madrugada', v.saque > S.t && Sim.clock(v.saque).hour === 2);
    jump(S, Sim.clock(v.saque).day, 1.9);
    S.events.length = 0; S.chron.length = 0;
    runRaw(S, 10);
    check('de madrugada levam 15% da comida (até 25 porções)', S.stock.frutas + S.stock.peixe === 200 - 25 && S.stats.brigasVila === 1 && v.laco === -38 && !v.saque && chronHas(S, /De madrugada, gente de .* levou 25 porções do estoque/) && hasMem(S.people[5], 'saqueado'));
    // com armazém, levam a metade
    S.stats.winters = 1; build(S, 'armazem');
    Object.assign(S.stock, { frutas: 100, peixe: 100 });
    So.vilaFaz(S, 'briga');
    jump(S, Sim.clock(v.saque).day, 1.9);
    runRaw(S, 10);
    check('com armazém, levam a metade', S.stock.frutas + S.stock.peixe === 200 - 12, 200 - S.stock.frutas - S.stock.peixe);
    // o presente
    Object.assign(S.stock, { frutas: 100, peixe: 0, seca: 0, defumado: 0 });
    const l0 = v.laco;
    let res = So.presente(S);
    check('mandar comida de presente (' + C.VILA_PRESENTE + ' porções) melhora o laço em 15', res.ok && S.stock.frutas === 100 - C.VILA_PRESENTE && near(v.laco, l0 + 15) && /presente ainda está fresco/.test(So.presenteWhy(S)));
    S.stock.frutas = 10; v.presente = 0;
    check('sem comida de sobra, não há presente', /Falta comida/.test(So.presenteWhy(S)) && !So.presente(S).ok);
    // o trovão
    S.god.poder = 100; S.god.align = 0;
    const l1 = v.laco;
    S.events.length = 0;
    res = So.trovejar(S);
    check('trovejar sobre a vila (' + C.VILA_TROVAO + ' de Poder): eles ficam com medo por um ano, o laço piora e Deus fica mais temido', res.ok && S.god.poder === 100 - C.VILA_TROVAO && near(v.laco, l1 - 10) && v.medo > S.t && So.vilaInfo(S).medo && S.god.align === -5 && S.events.some((e) => e.k === 'bolt'));
    v.laco = -60; v.bem = 60; delete v.saque;
    jump(S, dryFrom(S, S.ck.day + 1, 2), 23.9);
    if (S.ck.season === 3) jump(S, dryFrom(S, S.ck.day + 20, 2), 23.9);
    v.prox = 0;
    run(S, 10);
    check('com medo, ninguém de lá vem buscar nada (e de mal, também não vem trocar)', !v.saque && !Object.values(S.narr.groups).some((g) => g.kind === 'vila') && v.prox > S.t);
    v.medo = 0; v.prox = 0;
    jump(S, dryFrom(S, S.ck.day + 1, 2), 23.9);
    if (S.ck.season === 3) jump(S, dryFrom(S, S.ck.day + 20, 2), 23.9);
    run(S, 10);
    check('passado o medo, de mal como estão, voltam a buscar comida de madrugada', v.saque > S.t);
    S.god.poder = 2;
    check('sem Poder, não há trovão', /Falta Poder/.test(So.trovejarWhy(S)) && !So.trovejar(S).ok);
  }
  {
    // o outro deus
    const S = aldeiaComGrupo(42, 14, { why: 'medo' });
    S.god.name = 'Arapã';
    const v = fundaJa(S, 0);
    const k = So.vilaFaz(S, 'deus');
    check('a vila inventa outro deus, com outro nome', k === 'deus' && !!v.deus && v.deus !== 'Arapã' && So.vilaInfo(S).deus === v.deus && chronHas(S, new RegExp('já não rezam para Arapã. Dizem que quem cuida deles é ' + v.deus)));
    // a visita fala do outro deus a quem tem pouca fé
    jump(S, dryFrom(S, S.ck.day + 1, 3), 8);
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; p.fe = 60; }
    const fraco = S.people[6]; fraco.fe = 30;
    So.vilaFaz(S, 'troca');
    const g = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    withRng(S, [0.5], () => run(S, 30 * 8, () => g.state !== 'visita'));
    check('a visita fala do outro deus: quem tem pouca fé perde um pouco; quem tem fé, não', fraco.fe < 30 && S.people[8].fe >= 59.5, fraco.fe + ' / ' + S.people[8].fe);
    // um milagre diante de quem veio de lá
    const e = N.entsOf(S, g.id)[0];
    S.god.poder = 100; S.chron.length = 0;
    const gl0 = S.god.glory, l0 = v.laco;
    const res = God.cast(S, 'calor', Math.floor(e.x), Math.floor(e.y));
    check('um milagre diante de quem veio de lá: voltam a rezar para o Deus daqui', res.ok && v.deus === '' && near(v.laco, l0 + 15) && chronHas(S, /viu o milagre com os próprios olhos/) && chronHas(S, /voltaram a rezar para Arapã/) && So.vilaInfo(S).deus === '');
    // longe deles, não adianta
    v.deus = 'Outro';
    God.cast(S, 'calor', Math.floor(e.x) + 20, Math.floor(e.y));
    check('milagre longe dos visitantes não muda nada', v.deus === 'Outro');
    // o raio não converte ninguém
    God.cast(S, 'raio', Math.floor(e.x) + 3, Math.floor(e.y));
    check('o raio não traz ninguém de volta', v.deus === 'Outro');
  }
  {
    // a volta
    const S = aldeiaComGrupo(42, 16, { prep: (S) => { for (let k = 0; k < 5; k++) setAge(S, S.people[2 + k], 24 + k); const a = S.people[2], b = S.people[3]; F.link(S, a, b, 70); } });
    const v = fundaJa(S);
    const ids = S.soc.fora.map((q) => q.id);
    const mae = S.soc.fora.find((q) => q.sex === 'F'), pai = S.soc.fora.find((q) => q.sex === 'M');
    v.filhos.push({ t: S.t - 4 * Y, sex: 'F', mae: mae.id, pai: pai.id }, { t: S.t - Y, sex: 'M', mae: mae.id, pai: pai.id });
    v.bem = 10;
    jump(S, dryFrom(S, S.ck.day + 1, 3), 8);
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    const n0 = alive(S).length;
    S.events.length = 0; S.chron.length = 0;
    const k = So.vilaFaz(S, 'volta');
    const g = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    check('no aperto, a vila manda gente pedir para voltar', k === 'volta' && !!g && g.what === 'volta' && g.porque === 'aperto' && g.ents.length === 5 && g.filhos.length === 2);
    let pediu = false;
    run(S, 30 * 8, () => { pediu = S.events.some((e) => e.k === 'choice' && e.gid === g.id) || pediu; return g.state !== 'esperando'; });
    check('chegam e pedem: o jogo abre a janela de acolher', g.state === 'esperando' && pediu && N.pending(S) === g && chronHas(S, /passam aperto e pedem para voltar/));
    const S2 = clone(S);
    // acolher
    const ok1 = N.decide(S, g.id, true);
    check('acolhidos, voltam as mesmas pessoas (o mesmo id), vivas, sem contar como gente nova nem como mortos', ok1 && ids.every((id) => { const p = S.people.find((q) => q.id === id); return p && p.alive && !p.fora; }) && S.soc.fora.length === 0);
    const kids = S.people.filter((p) => p.mother === mae.id && p.father === pai.id);
    check('e trazem os filhos que nasceram lá, com a idade certa, pai e mãe', kids.length === 2 && kids.some((q) => F.age(S, q) === 4 && !q.carriedBy) && kids.some((q) => F.age(S, q) === 1 && q.carriedBy === mae.id) && kids.every((q) => !!q.indole && q.name), kids.map((q) => F.age(S, q)).join(','));
    check('a aldeia cresce de novo; a crônica conta; a vila, vazia, acaba', alive(S).length === n0 + 7 && S.stats.voltas === 7 && chronHas(S, /voltaram para a aldeia. Agora são /) && v.fim > 0 && chronHas(S, new RegExp(v.nome + ' ficou vazia')));
    check('o casal que foi junto voltou casal', F.isPartner(S.people.find((q) => q.id === ids[0]), S.people.find((q) => q.id === ids[1])));
    check('quem ficou se alegra, e há festa de boas-vindas', hasMem(S.people[0], 'voltouGente') && !!S.life.party);
    Sim.advance(S, 600);
    check('a vida segue com todos de volta (sem erro no passo)', !S.over && alive(S).length >= n0 + 6);
    // recusar (no jogo salvo antes da resposta)
    const g2 = N.pending(S2);
    check('o save guarda quem espera a resposta', !!g2 && g2.kind === 'vila' && g2.what === 'volta');
    const l0 = S2.soc.vila.laco;
    const ok2 = N.decide(S2, g2.id, false);
    check('recusados, voltam pela trilha, e o laço piora muito', ok2 && S2.soc.fora.length === 5 && S2.soc.vila.laco === l0 - 25 && g2.state === 'indo' && S2.chron.some((c) => /mandou seguir quem pedia para voltar/.test(c.text)));
    // com o robô que acolhe sozinho (os testes longos)
    const S3 = aldeiaComGrupo(42, 16);
    fundaJa(S3);
    S3.narr.auto = 'acolher';
    jump(S3, dryFrom(S3, S3.ck.day + 1, 3), 8);
    for (const p of S3.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    So.vilaFaz(S3, 'volta');
    run(S3, 30 * 8, () => S3.soc.fora.length > 0);
    check('com resposta automática (acolher), a volta acontece sem janela', S3.soc.fora.length === 0 && S3.stats.voltas === 5);
  }
  {
    // 0.14 (achado na bateria): o filho nascido lá volta só com o pai, de outro povo (a mãe morreu lá)
    const S = aldeiaComGrupo(42, 16, { prep: (S) => { for (let k = 0; k < 5; k++) setAge(S, S.people[2 + k], 24 + k); } });
    const v = fundaJa(S);
    const mae = S.soc.fora.find((q) => q.sex === 'F'), pai = S.soc.fora.find((q) => q.sex === 'M');
    pai.povo = 'elfo'; pai.sangue = { elfo: 1 };
    const t0 = S.t - 2 * Y;
    v.filhos.push({ t: t0, sex: 'F', mae: mae.id, pai: pai.id });
    mae.morto = S.t;
    v.bem = 10;
    jump(S, dryFrom(S, S.ck.day + 1, 3), 8);
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    So.vilaFaz(S, 'volta');
    const g = Object.values(S.narr.groups).find((x) => x.kind === 'vila');
    run(S, 30 * 8, () => !!g && g.state !== 'esperando');
    let ok = false, err = '';
    try { ok = !!g && N.decide(S, g.id, true); } catch (e) { err = e.message; }
    const kid = S.people.find((q) => q.father === pai.id && q.born === t0);
    check('o filho de lá que volta só com o pai (de outro povo) vem com o sangue dele, e a mãe que ficou continua na árvore', ok && !!kid && !!kid.sangue && kid.mother === mae.id && !!F.person(S, kid.mother), err || (kid ? kid.povo + ' · mãe ' + kid.mother : 'sem filho'));
  }
  {
    // 0.14 (achado na bateria): a árvore que volta no toco não fecha a única saída de um canto (dois elfos morreram de
    // sede presos atrás da mata, com água no estoque)
    const S = newWorld(42), w = S.world, Wd = w.W;
    let cx = -1, cy = -1;
    for (let y = 10; y < w.H - 10 && cx < 0; y++) for (let x = 10; x < Wd - 10 && cx < 0; x++) {
      let livre = true;
      for (let dy = -4; dy <= 4 && livre; dy++) for (let dx = -4; dx <= 4 && livre; dx++) if (w.block[(y + dy) * Wd + x + dx]) livre = false;
      if (livre) { cx = x; cy = y; }
    }
    const saved = [];
    const fecha = (x, y) => { const i = y * Wd + x; saved.push([i, w.block[i]]); w.block[i] = 1; };
    // um anel de mata em volta de um canto de 3 × 3, com uma só saída (o toco, a leste)
    for (let d = -2; d <= 2; d++) { fecha(cx + d, cy - 2); fecha(cx + d, cy + 2); fecha(cx - 2, cy + d); if (d !== 0) fecha(cx + 2, cy + d); }
    const saida = cy * Wd + cx + 2, campo = (cy - 3) * Wd + cx - 3;
    const preso = Sim.fechaPassagem(w, saida), aberto = Sim.fechaPassagem(w, campo);
    for (const [i, v] of saved.reverse()) w.block[i] = v;
    check('a árvore não volta no toco que é a única saída de um canto; no campo aberto, volta', cx >= 0 && preso === true && aberto === false, preso + ' / ' + aberto);
  }
  {
    // 0.14: e quem já ficou preso (num save antigo) derruba a árvore que fecha o caminho quando a sede aperta
    const S = newWorld(42), w = S.world, Wd = w.W;
    let cx = -1, cy = -1;
    for (let r = 6; r < 30 && cx < 0; r++) for (let dy = -r; dy <= r && cx < 0; dy++) for (let dx = -r; dx <= r && cx < 0; dx++) {
      const x = S.camp.x + dx, y = S.camp.y + dy;
      let livre = x > 5 && y > 5 && x < Wd - 5 && y < w.H - 5;
      for (let yy = -2; yy <= 2 && livre; yy++) for (let xx = -2; xx <= 2 && livre; xx++) { const i = (y + yy) * Wd + x + xx; if (w.block[i] || w.bgrid[i] >= 0 || Sim.isCamp(S, i) || W.waterAdj(w, i) >= 0) livre = false; }
      if (livre) { cx = x; cy = y; }
    }
    const anel = [];
    for (let d = -2; d <= 2; d++) anel.push([cx + d, cy - 2], [cx + d, cy + 2], [cx - 2, cy + d], [cx + 2, cy + d]);
    for (const [x, y] of anel) { const i = y * Wd + x, o = W.objAt(w, i); if (o) o.k = 'tree'; else W.addObj(w, 'tree', x, y); W.refreshBlock(w, i); }
    const p = S.people[0];
    G.AI.abort(S, p);
    p.x = cx + 0.5; p.y = cy + 0.5; p.px = p.x; p.py = p.y; p.needs.sede = 12; p.fail = {};
    const m0 = S.stock.madeira;
    const a = G.AI.decideType(S, p, 'beber');
    const tocos = anel.filter(([x, y]) => { const o = W.objAt(w, y * Wd + x); return o && o.k === 'stump'; }).length;
    check('preso atrás da mata, com sede, derruba a árvore do caminho e vai beber', cx >= 0 && !!a && tocos === 1 && S.stock.madeira === m0 + C.TREE_WOOD && !!p.path, (a ? a.src : 'não foi') + ' · tocos ' + tocos);
  }
  {
    // o que acontece na vila depende do laço e do tempo
    const S = aldeiaComGrupo(42, 14);
    const v = fundaJa(S);
    check('o primeiro acontecimento da vila vem de ' + C.VILA_EVENTO_D[0] + ' a ' + C.VILA_EVENTO_D[1] + ' dias depois de fundada', (v.prox - S.t) / DAYM >= C.VILA_EVENTO_D[0] - 0.01 && (v.prox - S.t) / DAYM <= C.VILA_EVENTO_D[1] + 0.01);
    // pelo relógio: o acontecimento chega sozinho
    jump(S, dryFrom(S, Math.ceil(v.prox / DAYM) + 1, 2), 23.9);
    if (S.ck.season === 3) jump(S, dryFrom(S, S.ck.day + 20, 2), 23.9);
    const p0 = v.prox;
    for (const p of S.people) { p.needs.fome = 95; p.needs.sede = 95; p.needs.energia = 90; }
    run(S, 30);
    check('pelo relógio, a vila faz alguma coisa (com o laço em paz: vem trocar) e marca o próximo', v.prox > p0 && (Object.values(S.narr.groups).some((g) => g.kind === 'vila') || S.ck.season === 3), 'estação ' + S.ck.season);
    // no inverno ninguém anda
    const S4 = clone(S);
    for (const gid of Object.keys(S4.narr.groups)) delete S4.narr.groups[gid]; S4.narr.ents = [];
    jump(S4, 60 * 3 + 50, 23.9);
    S4.soc.vila.prox = 0;
    run(S4, 30);
    check('no inverno ninguém vem: fica para dali a uns dias', S4.ck.season === 3 && !Object.values(S4.narr.groups).some((g) => g.kind === 'vila') && near((S4.soc.vila.prox - S4.t) / DAYM, 3, 0.1));
  }

  // ---------- J. o save, o jogo fechado, o save antigo ----------
  {
    // um mundo com de tudo um pouco
    const S = aldeiaComGrupo(42, 18);
    const v = fundaJa(S);
    const p = S.people[2], q = S.people[3], viu = S.people[4];
    wake(S);
    S.soc.lider = S.people[0].id; S.soc.liderT = S.t; S.soc.liderPq = 'humano';
    put(S, p, walkAt(S, 1, 3)); put(S, viu, walkAt(S, 2, 3));
    S.stock.joias = 1;
    const c = faz(S, p, 'furto');
    p.pena = { k: 'trabalho', ate: S.t + 3 * DAYM, cid: c.id, dias: 3 }; c.st = 'julgado'; c.cond = p.id; c.pena = 'trabalho'; c.dias = 3;
    q.marca = S.t + 5 * DAYM; q.indole = { g: -33.5, m: 12.25, f: 70 }; q.indAc = { g: { fome: -8.5 } }; q.desc = 42; q.descWhy = { fome: 20 };
    So.setModo(S, 'pede'); S.soc.semCama = 3;
    for (const b of S.buildings.slice()) if (b.type === 'barraca') Sim.removeBuilding(S, b);
    build(S, 'barraca', 3);
    So.planejarObra(S);
    v.filhos.push({ t: S.t, sex: 'F', mae: S.soc.fora[0].id, pai: S.soc.fora[1].id });
    v.deus = 'Outro'; v.laco = -12.5;
    S.soc.cinzas.push({ x: 5, y: 5, w: 2, h: 2, t: S.t });
    const S2 = clone(S);
    const s1 = S.soc, s2 = S2.soc;
    check('o save guarda os crimes, o líder, o modo das obras e os pedidos', s2.crimes.length === s1.crimes.length && s2.crimes[0].k === 'furto' && s2.crimes[0].cond === p.id && s2.lider === s1.lider && s2.modo === 'pede' && s2.pedidos.length === 1 && s2.pedidos[0].type === 'barraca' && s2.cinzas.length === 1);
    const p2 = S2.people.find((x) => x.id === p.id), q2 = S2.people.find((x) => x.id === q.id);
    check('guarda a pena, a marca, a índole (com os motivos) e o descontentamento de cada um', !!p2.pena && p2.pena.cid === c.id && !!p2.furto === !!p.furto && q2.marca === q.marca && q2.indole.g === -33.5 && q2.indAc.g.fome === -8.5 && q2.desc === 42 && q2.descWhy.fome === 20);
    check('guarda a vila de fora e quem foi embora (fora da lista de gente, achados pelo id)', s2.vila.nome === v.nome && s2.vila.deus === 'Outro' && s2.vila.laco === -12.5 && s2.vila.filhos.length === 1 && s2.fora.length === s1.fora.length && s2.fora.every((x) => x.alive === false && x.fora > 0 && !x.act && !x.path) && F.person(S2, s2.fora[0].id) === s2.fora[0] && So.vilaPop(S2) === So.vilaPop(S));
    check('quem foi embora não aparece na lista de gente do save', S2.people.every((x) => !x.fora) && S2.people.length === S.people.length);
    const tam = JSON.stringify(Save.serialize(S).soc).length;
    check('a Sociedade inteira (com 5 pessoas fora) cabe em poucos milhares de caracteres', tam < 14000, tam + ' caracteres');
    Sim.advance(S2, 1440 * 3);
    check('o jogo reaberto segue por dias sem erro', !S2.over && S2.t > S.t);
    // quem ia embora quando o jogo fechou
    const S3 = aldeiaComGrupo(42, 14);
    jump(S3, S3.ck.day, 9);
    So.dissResp(S3, 'ir');
    run(S3, 60);
    const S4 = clone(S3);
    check('o save no meio da partida guarda o grupo a caminho', !!S4.soc.diss && S4.soc.diss.st === 'indo' && S4.soc.diss.ids.length === 5 && !!S4.soc.diss.dest);
    run(S4, 30 * 30, () => { for (const x of S4.people) if (x.alive) { x.needs.fome = Math.max(x.needs.fome, 70); x.needs.sede = Math.max(x.needs.sede, 70); x.needs.energia = Math.max(x.needs.energia, 60); } return !!S4.soc.diss; });
    check('e no jogo reaberto eles terminam a caminhada e fundam a vila', !S4.soc.diss && !!S4.soc.vila && S4.soc.fora.length === 5);
    // o aviso e a promessa atravessam o save
    const S5 = aldeiaComGrupo(42, 14);
    const S6 = clone(S5);
    check('o aviso de quem vai embora atravessa o save (a janela abre de novo)', !!So.pendInfo(S6) && So.pendInfo(S6).k === 'diss' && So.pendInfo(S6).n === 5);
    So.dissResp(S6, 'promessa');
    const S7 = clone(S6);
    check('a promessa em andamento também', S7.soc.diss.st === 'promessa' && S7.soc.diss.prom.k === 'cama' && So.dissInfo(S7).prom.dias === 12);
  }
  {
    // o jogo fechado
    const S = village(42, 14), ruim = S.people[2];
    S.soc.lider = S.people[0].id;
    ruim.indole = { g: -100, m: -100, f: -100 };
    ruim.feud = {}; ruim.feud[S.people[3].id] = S.t + 99 * DAYM;
    for (let k = 0; k < 5; k++) { S.people[4 + k].desc = 90; S.people[4 + k].descWhy = { cama: 50 }; }
    const g0 = ruim.indole.g;
    Off.run(S, 1440 * 30);
    check('com o jogo fechado, um mês passa sem crime, sem julgamento e sem ninguém ir embora', S.soc.crimes.length === 0 && !S.soc.julg && !S.soc.diss && S.soc.fora.length === 0 && !ruim.plano && !S.safe);
    check('a índole e o descontentamento ficam como estavam', ruim.indole.g === g0 && S.people[4].desc === 90);
    check('com o jogo fechado, a IA não recebe tarefa da Sociedade', (() => { ruim.plano = { k: 'comida', t: S.t, ate: S.t + 999 }; S.safe = true; const w = So.want(S, ruim); S.safe = false; delete ruim.plano; return w === null; })());
    // a vila de fora anda nos números
    const S2 = aldeiaComGrupo(42, 16, { prep: (S_) => { for (let k = 0; k < 5; k++) setAge(S_, S_.people[2 + k], 22 + k); } });
    const v = fundaJa(S2);
    const bem0 = v.bem;
    Off.run(S2, 1440 * 120);
    check('a vila de fora vive enquanto o jogo está fechado (o bem-estar muda; pode nascer gente), sem visita nem saque', v.bem !== bem0 && !Object.values(S2.narr.groups).some((g) => g.kind === 'vila') && S2.stats.trocasVila === 0 && S2.stats.brigasVila === 0 && !v.saque, 'bem ' + bem0 + ' → ' + v.bem.toFixed(1) + ', nascidos ' + v.filhos.length);
    check('na volta, o primeiro acontecimento da vila não demora', v.prox <= S2.t + C.VILA_EVENTO_D[1] * DAYM);
  }
  {
    // o save de antes da 0.14
    const S = village(42, 12);
    S.goalsPhase = 4; S.goals = [];
    const d = JSON.parse(JSON.stringify(Save.serialize(S)));
    delete d.soc; delete d.stats.socMissions;
    for (const k of ['crimes', 'crimesG', 'julgamentos', 'lideres']) delete d.stats[k];
    for (const p of d.people) { delete p.indole; delete p.indAc; delete p.desc; delete p.descWhy; }
    const S2 = Save.deserialize(d);
    check('o save de antes da 0.14 abre: todo mundo ganha índole, e o estado da Sociedade nasce vazio', !!S2 && S2.people.every((p) => p.indole && typeof p.indole.g === 'number') && S2.soc.crimes.length === 0 && S2.soc.modo === 'decide' && S2.soc.lider === 0 && S2.soc.fora.length === 0 && S2.soc.vila === null);
    const S3 = Save.deserialize(JSON.parse(JSON.stringify(d)));
    check('a índole que cada um ganha é sempre a mesma para o mesmo save', S2.people.every((p, i) => p.indole.g === S3.people[i].indole.g && p.indole.m === S3.people[i].indole.m && p.indole.f === S3.people[i].indole.f));
    check('as missões da Sociedade entram uma vez só (as das fases já passadas)', S2.goals.filter((g) => /^s_/.test(g.id)).length === 5 && Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S2)))).goals.filter((g) => /^s_/.test(g.id)).length === 5);
    jump(S2, S2.ck.day, 17.9);
    run(S2, 10);
    check('na primeira tardinha o povo escolhe o líder, e a missão se cumpre', S2.soc.lider > 0 && S2.goals.find((g) => g.id === 's_lider').done);
    Sim.advance(S2, 1440 * 5);
    check('e o jogo antigo segue por dias sem erro', !S2.over);
  }
  {
    // quem foi embora não conta em lugar nenhum da aldeia
    const S = aldeiaComGrupo(42, 16);
    const camas0 = F.bedsNeeded(S), fieis0 = (() => { for (const p of S.people) p.fe = 90; return D.fieis(S); })(), bocas0 = F.mouths(S), n0 = Pv.count(S, 'humano');
    fundaJa(S);
    Sim.refresh(S);
    check('quem foi embora não conta nas camas, nas bocas, nos fiéis nem no povo', F.bedsNeeded(S) === camas0 - 10 && D.fieis(S) === fieis0 - 5 && F.mouths(S) < bocas0 && Pv.count(S, 'humano') === n0 - 5, F.bedsNeeded(S) + ' camas, ' + D.fieis(S) + ' fiéis');
    check('nem na lista de mortos, nem nas covas', S.people.filter((p) => !p.alive).length === 0 && M.graves(S).length === 0 && S.memoria.corpos.length === 0);
    // a morte de um membro antes da partida
    const S2 = aldeiaComGrupo(42, 14);
    const m = F.person(S2, S2.soc.diss.ids[1]);
    m.needs.saude = -999; m.dmg.velhice = 999;
    Sim.step(S2, 2);
    check('se alguém do grupo morre antes de partir, sai da lista (o grupo segue, se sobrar gente)', S2.soc.diss && S2.soc.diss.ids.indexOf(m.id) < 0 && S2.soc.diss.ids.length === 4);
    for (const id of S2.soc.diss.ids.slice(1)) { const x = F.person(S2, id); x.needs.saude = -999; x.dmg.velhice = 999; }
    Sim.step(S2, 2);
    check('se sobra só um, não há mais grupo (nem pergunta)', !S2.soc.diss && !So.pending(S2));
  }
  {
    // o custo: a Sociedade quase não pesa no passo (a mesma aldeia, dias alternados com e sem o módulo; a mediana)
    const S = village(42, 40), S0 = village(42, 40);
    S.soc.lider = S.people[0].id;
    for (let k = 0; k < 8; k++) S.people[4 + k].indole = { g: -50, m: -40, f: -40 };
    const soc0 = G.Soc;
    const dia = (S_) => { const t0 = process.hrtime.bigint(); for (let i = 0; i < 720; i++) { Sim.step(S_, 2); calm(S_); S_.events.length = 0; } return Number(process.hrtime.bigint() - t0) / 1e6; };
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    dia(S); G.Soc = null; dia(S0); G.Soc = soc0;
    const com = [], sem = [];
    for (let k = 0; k < 5; k++) { com.push(dia(S)); G.Soc = null; sem.push(dia(S0)); G.Soc = soc0; }
    // (as duas aldeias não vivem o mesmo dia, e a máquina pode estar ocupada: o portão só pega o que for grosseiro; a medida fina, com a mesma aldeia de gente boa, deu 3%)
    check('um dia com 40 pessoas não fica muito mais caro com a Sociedade (a mediana de 5 dias, menos do dobro)', med(com) < med(sem) * 2 + 20, med(com).toFixed(0) + ' ms com, ' + med(sem).toFixed(0) + ' ms sem');
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exitCode = bad ? 1 : 0;
  if (process.argv[2] === 'u') return;

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['bem', 'duro', 'largado'];
  const SEEDS = process.argv[4] ? process.argv[4].split(',').map(Number) : [42, 777, 9001];
  const jobs = [];
  for (const seed of SEEDS) for (const mode of MODES) jobs.push({ seed, mode, years: YEARS });
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
  const order = { bem: 0, duro: 1, largado: 2 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com a Sociedade (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'} · foram embora ${r.fora}`);
      console.log('  índole no fim: ' + r.indole + ' · líder: ' + r.lider + ' (trocas ' + r.lideres + ', ' + r.liderPct + '% do tempo com líder)');
      console.log('  crimes ' + r.crimes + ' (leves ' + r.cg[1] + ', médios ' + r.cg[2] + ', graves ' + r.cg[3] + '; vistos ' + r.vistos + '; por tipo: ' + r.tipos + ') · por ano: ' + r.porAno);
      console.log('  julgamentos ' + r.julg + ' (inocentes condenados ' + r.injusticas + ') · incêndios (a obra se foi) ' + r.incendios + ' · exilados ' + r.exilados + ' · castigos de Deus ' + r.castigos + ' (na medida ' + r.justos + ', em inocente ' + r.inocentes + ') · verdades em sonho ' + r.revelados + ' · perdões ' + r.perdoes);
      console.log('  obras do povo ' + r.obrasPovo + ' (pedidos ' + r.pedidos + ') · avisos de saída ' + r.avisos + ' (promessas cumpridas ' + r.promOk + ', quebradas ' + r.promNao + ') · dissidentes ' + r.dissidentes + ' · vila de fora: ' + r.vila);
      console.log('  fé média ' + r.fe + ' · como veem Deus ' + r.align + ' (média ' + r.alignMed.toFixed(1) + ') · descontentamento médio ' + r.descMed.toFixed(1) + ' · fome ' + r.hungry + '% · frio ' + r.cold + '% · save ' + r.save + ' (Sociedade ' + r.socSave + ')');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém de menos de 12 anos é castigado, julgado ou mandado embora; nenhuma vítima de violência tem menos de 14', r.menor === 0, r.menor + ' vezes');
      check(tag + 'nenhum par entre parentes próximos (nem com quem veio da vila de fora)', r.incesto === 0, r.incesto + ' pares');
      check(tag + 'quem foi embora não está na lista de gente, e ninguém fica no colo de quem não está', r.fantasma === 0, r.fantasma + ' vezes');
      check(tag + 'a Sociedade cabe em menos de 40 mil caracteres no save', r.socSave < 40000, r.socSave);
      check(tag + 'a aldeia chega ao fim dos ' + YEARS + ' anos', r.alive >= 2 && !r.over, r.alive + ' vivos');
      if (r.mode !== 'largado') {
        check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
        check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      }
      if (YEARS < 20) continue;
      check(tag + 'o povo escolhe um líder em até 3 dias depois de chegar a ' + C.LIDER_MIN + ' adultos, e tem líder quase sempre depois', r.espera5 >= 0 && r.espera5 <= 3 && r.liderPct >= 70, 'ano ' + r.liderAno + ', ' + r.espera5 + ' dias depois, ' + r.liderPct + '%');
      check(tag + 'há crimes, e a maioria é leve', r.crimes >= 5 && r.cg[1] >= r.cg[2] && r.cg[2] >= r.cg[3], r.crimes + ' crimes');
      check(tag + 'os crimes não tomam conta: menos de 12 por ano em média, e graves são raros (menos de 1 por ano)', r.crimes / YEARS < 12 && r.cg[3] / YEARS < 1, (r.crimes / YEARS).toFixed(1) + ' por ano, ' + r.cg[3] + ' graves');
      if (r.mode !== 'duro') check(tag + 'o povo julga o que vê (com a mão pesada, Deus chega antes)', r.julg >= 2, r.julg + ' julgamentos');
      if (r.mode === 'bem') {
        check(tag + 'o jogador castiga na medida (quase sempre) e nunca um inocente', r.justos >= 3 && r.justos >= r.castigos * 0.8 && r.inocentes === 0, r.justos + ' de ' + r.castigos);
        check(tag + 'com castigo na medida, perdão e promessa cumprida, o povo vê um Deus bondoso', r.align >= 0, r.align);
        check(tag + 'deixando o povo decidir, ele marca obras por conta própria', r.obrasPovo >= 1, r.obrasPovo);
      }
      if (r.mode === 'largado') check(tag + 'sem o jogador, não há castigo de Deus, verdade em sonho nem perdão', r.castigos === 0 && r.revelados === 0 && r.perdoes === 0);
    }
    if (YEARS >= 20 && MODES.length === 3) {
      const by = (m) => results.filter((r) => r.mode === m && !(r.errors && r.errors.length));
      const sum = (a, f) => a.reduce((x, r) => x + f(r), 0), avg = (a, f) => (a.length ? sum(a, f) / a.length : 0);
      const bem = by('bem'), duro = by('duro'), larg = by('largado');
      check('com a mão pesada, o povo vê um Deus mais temido que com a medida certa (média dos mundos)', avg(duro, (r) => r.alignMed) < avg(bem, (r) => r.alignMed), avg(duro, (r) => r.alignMed).toFixed(1) + ' contra ' + avg(bem, (r) => r.alignMed).toFixed(1));
      check('com a mão pesada e sem casa para todos, há mais descontentamento que cuidando (média dos mundos)', avg(duro, (r) => r.descMed) > avg(bem, (r) => r.descMed), avg(duro, (r) => r.descMed).toFixed(1) + ' contra ' + avg(bem, (r) => r.descMed).toFixed(1));
      check('em algum mundo, gente descontente avisa que vai embora', sum(results, (r) => r.avisos || 0) >= 1, sum(results, (r) => r.avisos || 0) + ' avisos');
      check('em algum mundo, um grupo vai embora e funda a outra vila', sum(results, (r) => r.dissidentes || 0) >= 4 && results.some((r) => r.vilaNome), sum(results, (r) => r.dissidentes || 0) + ' dissidentes');
      check('em algum mundo, a aldeia e a vila de fora trocam, casam ou brigam', sum(results, (r) => (r.trocas || 0) + (r.casam || 0) + (r.brigas || 0)) >= 1, sum(results, (r) => r.trocas || 0) + ' trocas, ' + sum(results, (r) => r.casam || 0) + ' casamentos, ' + sum(results, (r) => r.brigas || 0) + ' brigas');
      check('em algum mundo, o povo condena quem não fez (e no "bem", a verdade aparece em sonho)', sum(results, (r) => r.injusticas || 0) >= 1 ? sum(bem, (r) => r.injusticas) === 0 || sum(bem, (r) => r.revelados) >= 1 : true, sum(results, (r) => r.injusticas || 0) + ' injustiças, ' + sum(bem, (r) => r.revelados) + ' sonhos no "bem"');
      check('nos nove mundos há crime grave, e é raro (menos de 1 em cada 10 crimes)', sum(results, (r) => (r.cg ? r.cg[3] : 0)) >= 1 && sum(results, (r) => (r.cg ? r.cg[3] : 0)) < sum(results, (r) => r.crimes || 0) / 10, sum(results, (r) => (r.cg ? r.cg[3] : 0)) + ' de ' + sum(results, (r) => r.crimes || 0));
      check('cuidando, a verdade aparece em sonho e quem cumpre a pena é perdoado', sum(bem, (r) => r.revelados) >= 1 && sum(bem, (r) => r.perdoes) >= 1, sum(bem, (r) => r.revelados) + ' sonhos, ' + sum(bem, (r) => r.perdoes) + ' perdões');
      check('cuidando, a índole do povo termina melhor que largado (menos gente com defeito, média dos mundos)', avg(bem, (r) => r.ruins) <= avg(larg, (r) => r.ruins) + 3, avg(bem, (r) => r.ruins).toFixed(1) + '% contra ' + avg(larg, (r) => r.ruins).toFixed(1) + '%');
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô: o "bem" do campo (barracas, conservar, Vontades por estação, obras, caça, roça e curral), atende as orações,
// aceita o nome e os dons, acolhe quem chega e quem volta, responde à pergunta do rito.
// "bem": deixa o povo decidir as obras; o leve, castiga na medida (aviso em sonho); o médio e o grave, deixa o povo
//   julgar (o que ninguém viu, mostra em sonho quem foi), perdoa quem cumpriu a pena e castiga na medida o que o povo
//   deixou passar; a quem avisa que vai embora promete (e cumpre, se der).
// "duro": só ele marca obras e não ergue casa a mais (falta lugar), castiga tudo dois degraus acima da medida, não
//   perdoa, não mostra a verdade, e deixa ir quem quiser.
// "largado": só fogo e barraca; não atende, não castiga, não responde (os avisos vencem sozinhos).
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t, from, max) => { const at = spot(S, t, from, max); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], menor: 0, incesto: 0, fantasma: 0, alignSum: 0, alignN: 0, descSum: 0, descN: 0, avisos: 0, liderDias: 0, liderAno: 0, dias: 0, dia5: 0, liderDia0: 0, porAnoArr: [] };
  const cuida = mode !== 'largado', bem = mode === 'bem', duro = mode === 'duro';
  if (bem) So.setModo(S, 'decide');
  if (duro) So.setModo(S, 'eu');      // 0.14: o padrão virou "o povo decide"; a mão pesada não deixa o povo erguer casa
  let hours = 0, hungry = 0, cold = 0, avisoVisto = 0, crimesAno = 0;
  const t0 = Date.now();
  // o que o jogador faz com os crimes
  const justica = () => {
    if (!cuida) return;
    for (const c of S.soc.crimes) {
      const p = F.person(S, c.by);
      if (bem && c.injusto && !So.revelarWhy(S, c)) { So.revelar(S, c.id); continue; }
      if (!p || !p.alive || p.fora || c.deus) continue;
      if (bem) {
        // quem já pagou ao povo é perdoado
        if (c.cumprida && !So.perdaoWhy(S, c) && S.god.poder > 60) { So.perdoar(S, c.id); continue; }
        if (c.st === 'julgado' && c.cond === p.id) continue;      // o povo já cobrou
        if (c.g >= 2 && c.st === 'aberto') {
          // médio e grave: é o povo quem julga. O que ninguém viu, um sonho mostra quem foi (e aí o povo julga certo)
          if (!c.known && !So.revelarWhy(S, c) && S.god.poder > C.REVELAR_CUSTO + 20) So.revelar(S, c.id);
          continue;
        }
        // o leve, e o que o povo deixou passar (absolveu, esfriou): castigo na medida, o mais brando da faixa
        if (So.crimeDe(S, p) !== c) continue;
        const fx = C.CASTIGO_FAIXA[c.g], nv = fx[0];
        if (!So.castigoWhy(S, p, nv) && S.god.poder > C.CASTIGO_CUSTO[nv - 1] + 20) So.castigar(S, p.id, nv);
      } else {
        const fx = C.CASTIGO_FAIXA[c.g], nv = Math.min(6, fx[1] + 2);
        if (!So.castigoWhy(S, p, nv) && S.god.poder > C.CASTIGO_CUSTO[nv - 1] + 20) So.castigar(S, p.id, nv);
        else if (F.age(S, p) < 16 && !So.castigoWhy(S, p, 2)) So.castigar(S, p.id, 2);
      }
    }
  };
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S);
        const pend = () => S.buildings.some((b) => (!b.built && !b.site) || b.up);
        const folga = duro ? -8 : bem ? -99 : 1;      // "duro": deixa faltar lugar; "bem": as casas são com o povo (depois do líder)
        if (!pend() && have < need + (bem && !So.lider(S) ? 1 : folga) && S.stock.madeira >= 14) place('barraca');
        else if (cuida && !pend() && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        if (cuida) {
          for (const t of ['moquem', 'jirau', 'forno']) if (!pend() && T.buildOpen(S, t) && !has(t)) place(t);
          Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
          S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
          if (T.known(S, 'lanca')) S.vontades.caca = 3;
          const al = S.people.filter((p) => p.alive).length;
          if (K.known(S, 'roca')) { S.vontades.roca = 3; const rocas = S.buildings.filter((b) => b.type === 'roca').length; if (!pend() && rocas < (al >= 14 ? 3 : 2)) place('roca', 4); }
          if (K.known(S, 'criacao')) { S.vontades.criacao = 3; if (!pend() && !has('curral')) place('curral', 5); }
          const busy = S.buildings.filter((b) => !b.built || b.up).length;
          if (!busy && S.ctx.foodDays > 6 && !bem) {
            if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
            else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
            else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
          } else if (!busy && S.ctx.foodDays > 6 && bem) {
            if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
            else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
          }
        }
        let q;
        while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer.find((id) => D.DONS[id].side === (duro ? 'temido' : 'bom')) || q.offer[0]); }
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        if (s % 15 === 0) {
          if (cuida) {
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
            let pd;
            while ((pd = M.pending(S))) M.answer(S, bem ? 0 : pd.k === 'erva' ? 1 : 2);
          }
          // a janela da Sociedade
          const sp = So.pending(S);
          if (sp && sp.t !== avisoVisto && sp.k === 'diss') { avisoVisto = sp.t; out.avisos++; }
          if (sp && cuida) {
            if (sp.k === 'diss') { const r = So.dissResp(S, bem ? 'promessa' : 'ir'); if (!r.ok) So.dissResp(S, 'ir'); }
            else So.pendResp(S, bem ? 'revelar' : 'deixar');
          }
        }
        if (s % 60 === 0) {
          justica();
          // incêndio: o "bem" manda a Chuva
          if (bem && S.soc.arde && !God.canCast(S, 'chuva')) { const b = S.buildings.find((x) => x.fogo); if (b) God.cast(S, 'chuva', b.x, b.y); }
        }
        S.events.length = 0;
        if (s % 30 === 0) {
          for (const p of S.people) {
            if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
            if (p.alive && F.age(S, p) < 12 && (p.pena || p.exilio || p.marca || p.doente || p.plano)) out.menor++;
            if (p.fora) out.fantasma++;
            if (p.alive && p.carriedBy) { const c = F.person(S, p.carriedBy); if (!c || !c.alive) out.fantasma++; }
          }
        }
      }
      // uma vez por dia
      out.alignSum += S.god.align; out.alignN++;
      out.dias++;
      if (!out.dia5 && S.people.filter((p) => p.alive && !p.carriedBy && F.age(S, p) >= 18).length >= C.LIDER_MIN) out.dia5 = out.dias;
      if (So.lider(S)) { out.liderDias++; if (!out.liderAno) { out.liderAno = +(S.t / Y).toFixed(2); out.liderDia0 = out.dias; } }
      for (const p of S.people) if (p.alive && !p.carriedBy && F.age(S, p) >= 16) { out.descSum += p.desc || 0; out.descN++; }
      for (const c of S.soc.crimes) if (c.vic && !c.checado) { c.checado = 1; const v = F.person(S, c.vic); if (v && (c.k === 'surra' || c.k === 'ferir' || c.k === 'matar') && (c.t - v.born) / Y < 14) out.menor++; }
      if (d % 20 === 0) {
        const al = S.people.filter((p) => p.alive);
        for (const p of al) for (const id in p.bonds || {}) { const q = F.person(S, +id); if (q && q.alive && q.id > p.id && (F.closeKin(S, p, q) || F.age(S, p) < 18 || F.age(S, q) < 18)) out.incesto++; }
        for (const p of S.soc.fora) if (S.people.indexOf(p) >= 0) out.fantasma++;
      }
      if (d % 60 === 59) { out.porAnoArr.push(S.stats.crimes - crimesAno); crimesAno = S.stats.crimes; }
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, al = S.people.filter((p) => p.alive), dead = S.people.filter((p) => !p.alive), s = S.soc;
  const tipos = st.crimesK || {};
  let ruins = 0, bons = 0;
  for (const p of al) { const r = So.rotulos(S, p); if (r.some((x) => !x.bom)) ruins++; else if (r.some((x) => x.bom)) bons++; }
  const salvo = Save.serialize(S), vi = So.vilaInfo(S), L = So.lider(S);
  Object.assign(out, {
    alive: al.length, over: !!S.over, births: st.births || 0, deaths: dead.map((p) => p.cause), fora: s.fora.length,
    indole: (al.length ? Math.round(ruins / al.length * 100) : 0) + '% com defeito, ' + (al.length ? Math.round(bons / al.length * 100) : 0) + '% só com qualidade', ruins: al.length ? ruins / al.length * 100 : 0,
    lider: L ? L.name + ' (' + (So.rotulos(S, L).map((x) => x.txt).join(', ') || 'sem rótulo') + ')' : 'ninguém', lideres: st.lideres || 0, liderPct: out.liderDia0 ? Math.round(out.liderDias / Math.max(1, out.dias - out.liderDia0 + 1) * 100) : 0,
    crimes: st.crimes, cg: st.crimesG, vistos: st.crimesVistos, tipos: Object.keys(tipos).map((k) => k + ' ' + tipos[k]).join(', ') || '-', porAno: out.porAnoArr.join(' '),
    julg: st.julgamentos, injusticas: st.injusticas, exilados: st.exilados, castigos: st.castigos, justos: st.castigosJustos, inocentes: st.castigosInocente || 0, revelados: st.revelados || 0, perdoes: st.perdoes,
    incendios: st.incendios || 0, espera5: out.liderDia0 && out.dia5 ? out.liderDia0 - out.dia5 : -1,
    obrasPovo: st.obrasPovo, pedidos: st.pedidos, promOk: st.promessasOk || 0, promNao: st.promessasNao || 0, dissidentes: st.dissidentes,
    vila: vi ? vi.nome + (vi.fim ? ' (acabou)' : '') + ', ' + vi.pop + ' pessoas (' + vi.nascidos + ' nascidas lá), laço ' + vi.laco + ' (' + vi.lacoTxt + ')' + (vi.deus ? ', reza para ' + vi.deus : '') + ' · trocas ' + st.trocasVila + ', casamentos ' + st.casamentosVila + ', brigas ' + st.brigasVila + ', voltaram ' + st.voltas : 'não há',
    vilaNome: vi ? vi.nome : '', trocas: st.trocasVila, casam: st.casamentosVila, brigas: st.brigasVila, voltas: st.voltas,
    fe: al.length ? Math.round(al.reduce((a, p) => a + p.fe, 0) / al.length) : 0, align: Math.round(S.god.align), alignMed: out.alignN ? out.alignSum / out.alignN : 0, descMed: out.descN ? out.descSum / out.descN : 0,
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    save: JSON.stringify(salvo).length, socSave: JSON.stringify(salvo.soc).length,
    sec: (Date.now() - t0) / 1000,
  });
  delete out.porAnoArr;
  return out;
}
