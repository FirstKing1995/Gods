// Gods · testes da Etapa 13 (Memória). Uso: node test/memoria-test.js [anos | u] [modos]
// 1) unidades: a morte (corpo, achar, carregar, velório, enterro, cemitério, visitas, dia dos mortos, o jogo fechado, o
//    save no meio do velório), a História de Deus (o que vira conto, quem viu, a ordem de quem conta, a deriva, as
//    crianças que crescem ouvindo, a tela "O que contam de você"), a erva-do-sonho (os canteiros, a descoberta, a lei,
//    o rito do começo ao fim, a pergunta e as três respostas, o costume e a falta) e o jogo fechado, o save, as missões
// 2) 20 anos em três mundos, com dois velhos no começo: "bem" (o jogador atende e responde sempre a primeira), "medo"
//    (responde sempre a terceira e deixa a erva por conta do povo) e "largado" (só fogo e barracas, ninguém responde): ninguém morre
//    de fome ou de frio, os mortos têm velório, cova e visita, o dia dos mortos vem todo ano, os contos passam de
//    boca em boca, o rito acontece (só com adultos) e a pergunta é respondida
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Campo: K, Narr: N, Deus: D, Povos: Pv, Minas: Mi, Obras: O, Bichos: B, Memoria: M } = G;
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
  return q;
}
// uma aldeia pronta, sem desastres: n adultos humanos, barracas, fogo, comida
function village(seed, n) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true; S.arrived = true;
  S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 20 + (k * 3) % 15);
  build(S, 'fogueira');
  for (let k = 0; k < Math.ceil(n / 2) + 3; k++) build(S, 'barraca', 3);
  S.people.forEach((p, k) => { p.fe = 80; p.act = null; p.path = null; p.x = S.camp.x + 0.5 + (k % 4); p.y = S.camp.y + 2.5 + Math.floor(k / 4); p.px = p.x; p.py = p.y; });
  Object.assign(S.stock, { madeira: 150, pedra: 60, agua: 20, frutas: 80, peixe: 300, tabuas: 30 });
  for (const id of ['pedra', 'cestos', 'lanca']) if (!T.known(S, id)) S.tech.known[id] = { t: S.t, by: 'teste', how: 'pratica' };
  S.stock.ferramentas = 6;
  S.events.length = 0; S.chron.length = 0;
  Sim.refresh(S);
  return S;
}
function setHour(S, h) { let t = Math.floor(S.t / DAYM) * DAYM + h * 60; if (t <= S.t) t += DAYM; S.t = t; S.ck = Sim.clock(S.t); Sim.refresh(S); }
function days(S, n, each) { for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; } }
const alive = (S) => S.people.filter((p) => p.alive);
const of = (S, kind) => alive(S).filter((p) => Pv.of(p) === kind);
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const clone = (S) => Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

// ---------- ajudantes da Memória ----------
// dia calmo: ninguém sai à caça e a comida e a água não acabam (nada atrapalha o que a Memória faz)
function calm(S) { S.vontades.caca = 0; S.vontades.pesca = 1; S.vontades.pedra = 0; S.stock.peixe = 300; S.stock.agua = 30; if (S.stock.frutas < 40) S.stock.frutas = 40; }
// mata pelo caminho de verdade: a saúde vai a zero no passo seguinte e a morte chama a Memória
function kill(S, p, cause) { p.needs.saude = -999; p.dmg[cause || 'velhice'] = 999; Sim.step(S, 2); S.events.length = 0; }
// pula o relógio para um dia e uma hora (o que é da hora e do dia roda quando o passo andar)
function jump(S, day, hour) { S.t = day * DAYM + hour * 60; S.ck = Sim.clock(S.t); Sim.refresh(S); }
function setAge(S, p, a) { p.born = S.t - a * Y; p.lastAge = Math.floor(a); }
// o primeiro dia (de d0 em diante) com n dias seguidos sem chuva, nem a da véspera que vara a noite
function dryFrom(S, d0, n) {
  const dry = (d) => { const w = Sim.weatherOf(S, d), y = d > 0 ? Sim.weatherOf(S, d - 1) : null; return w.kind !== 'chuva' && !(y && y.kind === 'chuva' && y.end > 24); };
  for (let d = d0; d < d0 + 400; d++) { let all = true; for (let k = 0; k < n && all; k++) all = dry(d + k); if (all) return d; }
  return d0;
}
// um chão livre e andável perto de (dx, dy) do acampamento
function walkAt(S, dx, dy) {
  const w = S.world;
  for (let r = 0; r < 14; r++) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    if (Math.max(Math.abs(xx), Math.abs(yy)) !== r) continue;
    const x = S.camp.x + dx + xx, y = S.camp.y + dy + yy, i = y * w.W + x;
    if (x > 3 && y > 3 && x < w.W - 4 && y < w.H - 4 && !w.block[i] && !G.IS_WATER[w.tile[i]] && !W.objAt(w, i) && w.bgrid[i] < 0) return { x, y };
  }
  return null;
}
// o chão andável mais perto que fica a minD passos ou mais do acampamento (o mapa tem 128 de lado)
function farSpot(S, minD) {
  const w = S.world;
  let best = null;
  for (let y = 4; y < w.H - 4; y++) for (let x = 4; x < w.W - 4; x++) {
    const i = y * w.W + x, d = Math.hypot(x - S.camp.x - 1, y - S.camp.y - 1);
    if (d < minD || w.block[i] || G.IS_WATER[w.tile[i]] || W.objAt(w, i) || w.bgrid[i] >= 0 || (best && d >= best.d)) continue;
    best = { x, y, d };
  }
  return best;
}
function put(S, p, at) { p.x = at.x + 0.5; p.y = at.y + 0.5; p.px = p.x; p.py = p.y; p.act = null; p.path = null; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const graveOf = (S, p) => M.graves(S).find((o) => o.pid === p.id) || null;
const GRIEF = ['perdeuAlguem', 'perdeuCompanheiro', 'perdeuFamilia', 'perdeuBebe'];
const grief = (p) => p.mem.filter((x) => GRIEF.indexOf(x.k) >= 0);
const gleft = (S, p) => grief(p).map((x) => (x.until - S.t) / DAYM);   // dias que faltam de cada luto
const hasMem = (p, k) => p.mem.some((x) => x.k === k);
const chronHas = (S, re) => S.chron.some((c) => re.test(c.text));
// anda n passos de 2 min (dia calmo); devolve os acontecimentos da Memória e os raios que passaram
function run(S, n, each) {
  const evs = [];
  for (let i = 0; i < n && !S.over; i++) {
    Sim.step(S, 2); calm(S);
    for (const e of S.events) if (e.k === 'memoria' || e.k === 'bolt') evs.push(e);
    if (each) each(S, i);
    S.events.length = 0;
  }
  return evs;
}
// a tarefa pronta, como a IA a monta (para chamar o efeito sem esperar a caminhada)
function act(S, p, k) { const m = M.task(S, p, k); return m ? { type: 'memoria', hint: k, m, stage: 'go', t: 0 } : null; }
// deixa o povo fazer o velório e o enterro até o corpo sumir (no máximo maxDays dias); devolve os acontecimentos da Memória
function cycle(S, d, maxDays, each) {
  const evs = [];
  for (let i = 0; i < 720 * (maxDays || 4) && d.corpo && !S.over; i++) {
    Sim.step(S, 2); calm(S);
    for (const e of S.events) if (e.k === 'memoria') evs.push(e);
    if (each) each(S);
    S.events.length = 0;
  }
  return evs;
}
// deita o corpo ao pé do fogo como a IA faria (sem a caminhada); fim: já passou o velório, com n pessoas
function layBody(S, d, by, fim) { const a = act(S, by, 'corpo'); M.lift(S, by, a); M.done(S, by, a); if (fim) { d.corpo.fim = 1; d.corpo.velado = true; d.corpo.n = fim; } return a; }
// enterra o corpo (que já foi velado) como a IA faria, sem a caminhada
function buryBody(S, d, by) { const a = act(S, by, 'enterrar'); M.lift(S, by, a); M.done(S, by, a); return a; }
// troca o sorteio do mundo por uma lista de valores (o último se repete) só enquanto f roda; depois volta o sorteio de verdade
function withRng(S, vals, f) { let i = 0; S.rng.next = () => vals[Math.min(i++, vals.length - 1)]; try { return f(); } finally { delete S.rng.next; } }
const conto_gen = (S, id) => S.memoria.contos.find((c) => c.id === id).gen;
const doing = (p, k) => !!(p.act && p.act.type === 'memoria' && p.act.m && p.act.m.k === k);

if (isMainThread) {
  // nas unidades o mesmo conto pode voltar à roda na hora (a espera entre uma vez e outra tem a sua própria checagem)
  const REPETE = C.CONTO_REPETE_D;
  C.CONTO_REPETE_D = 0;
  // ===================== unidades =====================
  // ---------- A. a morte: corpo, velório, enterro, cova, visita ----------
  {
    // --- 1. quem morre entre adultos deixa um corpo; alguém o leva ao fogo, o povo vela, de manhã enterra, a família volta ---
    const S = village(42, 12); calm(S);
    const V = S.people[4], P = S.people[5], K2 = S.people[6], Z = S.people[7];
    F.link(S, V, P, 60); K2.mother = V.id; K2.father = P.id; setAge(S, K2, 9);
    const d0 = dryFrom(S, 1, 4);
    jump(S, d0, 9);
    put(S, V, walkAt(S, 9, 2));
    kill(S, V);
    const c = V.corpo, fogo = L.campFire(S, true), at0 = { x: V.x, y: V.y };
    check('morte entre adultos: sobra um corpo (visto pelo acampamento: st 1), em corpos, e ainda não há cova', !!c && c.st === 1 && S.memoria.corpos.indexOf(V.id) >= 0 && !V.cova && M.graves(S).length === 0 && S.stats.enterros === 0, JSON.stringify(c));
    check('o corpo guarda a hora, o rito do povo (humano: h) e quem vai chorar: o par e a filha, e só', !!c && c.t === V.diedAt && c.r === 'h' && !c.r2 && c.kin.indexOf(P.id) >= 0 && c.kin.indexOf(K2.id) >= 0 && c.kin.indexOf(Z.id) < 0, c && c.kin.join());
    check('a Crônica conta a morte e ainda não fala de cova', chronHas(S, new RegExp(V.name + ' morreu')) && !chronHas(S, /primeira cova/));
    const log = { carry: 0, same: 0, off: 0, offMax: 0, laid: null, att: 0, wake: 0, block: 0, canTell: 0, ctrl: 0, n: 0, fimAt: 0, velado: null, ev: {}, who: 0, restBy: 0 };
    for (let i = 0; i < 720 * 3 && V.corpo; i++) {
      Sim.step(S, 2); calm(S);
      const cc = V.corpo;
      if (cc) {
        if (cc.by) { const q = F.person(S, cc.by), dd = q ? dist(V, q) : 99; log.carry++; if (dd < 0.01) log.same++; else { log.off++; log.offMax = Math.max(log.offMax, dd); } log.who = cc.by; }
        if (cc.st === 2 && !log.laid) log.laid = { day: S.ck.day, hour: S.ck.hour, x: V.x, y: V.y, vel: cc.vel };
        if (cc.st === 2 && !cc.fim && cc.vel === S.ck.day && S.ck.hour >= 17 && S.ck.hour < 21) {
          log.wake++;
          log.att = Math.max(log.att, alive(S).filter((q) => doing(q, 'velar')).length);
          if (M.blockStory(S)) log.block++;
          if (alive(S).some((q) => L.canTell(S, q))) log.canTell++;
          if (!log.ctrl && S.ck.hour >= 17.6 && S.ck.hour < 19.4) {   // controle: sem o velório, alguém contaria história esta noite?
            cc.fim = 1; log.ctrl = alive(S).some((q) => L.canTell(S, q)) ? 1 : -1; delete cc.fim;
          }
        }
        if (cc.fim && !log.fimAt) log.fimAt = S.ck.hour;
        log.n = cc.n || 0; log.velado = cc.velado;
      }
      for (const e of S.events) if (e.k === 'memoria') log.ev[e.ev] = (log.ev[e.ev] || 0) + 1;
      S.events.length = 0;
    }
    // 4. o corpo anda com quem leva e é deitado perto do fogo
    check('o corpo vai junto com quem o leva (a mesma posição a cada passo; só o do pega, uma vez por viagem, a 1,7 passo no máximo) e é deitado perto do fogo, a 2 a 4,3 passos', log.carry >= 10 && log.off <= 2 && log.offMax <= 1.7 && !!log.laid && dist({ x: log.laid.x, y: log.laid.y }, { x: fogo.x + 0.5, y: fogo.y + 0.5 }) >= 1.9 && dist({ x: log.laid.x, y: log.laid.y }, { x: fogo.x + 0.5, y: fogo.y + 0.5 }) <= 4.4, log.carry + ' passos (' + log.off + ' fora, ' + log.offMax.toFixed(2) + '), ' + (log.laid ? dist({ x: log.laid.x, y: log.laid.y }, { x: fogo.x + 0.5, y: fogo.y + 0.5 }).toFixed(2) : '-') + ' do fogo');
    check('deitado antes das 19h, o velório é no mesmo dia, de tardinha', !!log.laid && log.laid.hour < 19 && log.laid.vel === log.laid.day && log.laid.day === d0, JSON.stringify(log.laid));
    // 5. o velório
    check('velório: o povo se junta (3 ou mais), o sino toca e o corpo fecha o velório às 21h', log.att >= 3 && log.ev.velorio >= 2 && log.fimAt >= 21 && log.fimAt < 21.1, log.att + ' velando, fim às ' + log.fimAt.toFixed(2) + ', eventos ' + JSON.stringify(log.ev));
    check('quem velou fica na conta do corpo, e o velório vira número e Crônica', log.n >= 3 && log.velado === true && S.stats.velorios === 1 && chronHas(S, /Foi o primeiro velório/), log.n + ' velaram');
    check('a noite do velório segura a história: blockStory ligado e ninguém conta; sem o velório, alguém contaria', log.wake > 20 && log.block === log.wake && log.canTell === 0 && log.ctrl === 1, log.block + '/' + log.wake + ', canTell ' + log.canTell + ', controle ' + log.ctrl);
    check('o par e a filha velaram e guardam a lembrança', hasMem(P, 'velou') && P.velou === V.id && hasMem(K2, 'velou'), P.velou + '/' + K2.velou);
    // 6. o enterro
    const o = graveOf(S, V), cem = M.cemetery(S);
    check('de manhã, o povo enterra: a cova nasce com nome, quem é, quando e o rito, o morto vai para ela e o corpo some', !!o && o.name === V.name && o.pid === V.id && o.r === 'h' && o.vel === 1 && o.t > 0 && Math.floor(o.t / DAYM) === d0 + 1 && !V.corpo && S.memoria.corpos.indexOf(V.id) < 0 && V.cova && V.cova[0] === o.x && V.cova[1] === o.y && near(V.x, o.x + 0.5) && near(V.y, o.y + 0.5) && S.stats.enterros === 1, JSON.stringify(o));
    const hr = o ? (o.t % DAYM) / 60 : 0;
    check('o enterro é na janela da manhã (6h a 17h)', hr >= C.ENTERRO_H[0] && hr < C.ENTERRO_H[1], hr.toFixed(2) + 'h');
    check('sem marco, o povo ergue o cemitério sozinho: tipo cemiterio, pronto, automático, longe do acampamento e a Crônica conta', !!cem && cem.type === 'cemiterio' && cem.built && cem.auto === 1 && S.memoria.cem === cem.id && dist(cem, S.camp) >= 7 && chronHas(S, /separou um canto para os seus mortos/), cem && JSON.stringify([cem.x, cem.y]));
    check('a cova abre em fileira (grade par a partir do marco), dentro do raio do cemitério', !!o && !!cem && ((o.x - cem.x) & 1) === 0 && ((o.y - cem.y) & 1) === 0 && Math.hypot(o.x - cem.x - 0.5, o.y - cem.y - 0.5) <= 6.5 && Math.hypot(o.x - cem.x - 0.5, o.y - cem.y - 0.5) >= 2.4, o && cem && (o.x - cem.x) + ',' + (o.y - cem.y));
    check('a primeira cova entra na Crônica, com a vela, e a família ganha a visita marcada (o par e a filha, só)', chronHas(S, /abriu a primeira cova no cemitério.*uma vela acesa/) && !!P.vis && P.vis.pid === V.id && P.vis.x === o.x && !!K2.vis && !Z.vis, JSON.stringify(P.vis));
    check('quem carregou o corpo é um adulto (16 anos ou mais) e o enterro e o velório contam como acontecimentos', F.age(S, F.person(S, log.who)) >= C.CARREGA_AGE && log.ev.enterro === 1, log.ev.enterro);
    // 7. a visita
    const vis = run(S, 720 * 2, () => {});
    check('a família volta com flores: flor na cova por FLOR_D dias, lembrança, número e Crônica', !!o && o.fl > S.t && o.fl <= S.t + C.FLOR_D * DAYM && S.stats.visitas >= 1 && (hasMem(P, 'visitouCova') || hasMem(K2, 'visitouCova')) && chronHas(S, /voltou à cova de .* com flores/) && vis.filter((e) => e.ev === 'flores').length >= 1, S.stats.visitas + ' visitas');
    check('a visita deixa uma fruta quando sobram (10 ou mais): oferenda na cova', !!o && o.of > S.t, o && o.of);
    check('quem visitou deixa de ter a visita marcada; os de fora nunca tiveram', !P.vis && !K2.vis && !Z.vis);
  }
  {
    // --- 2. sem ninguém para carregar, a cova nasce na hora; com 16 anos já há quem carregue ---
    const S = village(42, 8); calm(S);
    const V = S.people[4], Q = S.people[5], W2 = S.people[6];
    for (const q of S.people) if (q !== V) setAge(S, q, 10);
    setAge(S, Q, C.CARREGA_AGE - 1);
    kill(S, V);
    const g = M.graves(S);
    check('só há quem não carrega (15 anos ou menos): a cova nasce na hora, com nome, id e hora, e não sobra corpo', !V.corpo && S.memoria.corpos.length === 0 && g.length === 1 && g[0].name === V.name && g[0].pid === V.id && g[0].t === V.diedAt, g.length + ' covas');
    check('a cova da hora fica junto de onde a pessoa caiu e a Crônica conta a morte', g.length === 1 && Math.hypot(g[0].x + 0.5 - V.x, g[0].y + 0.5 - V.y) < 6 && chronHas(S, new RegExp(V.name + ' morreu')));
    setAge(S, Q, C.CARREGA_AGE);
    kill(S, W2);
    check('com alguém de ' + C.CARREGA_AGE + ' anos (CARREGA_AGE) para carregar, volta a sobrar corpo em vez de cova', !!W2.corpo && W2.corpo.st === 1 && M.graves(S).length === 1 && S.memoria.corpos.indexOf(W2.id) >= 0, JSON.stringify(W2.corpo));
  }
  {
    // --- 3. longe de todos, ninguém acha: a 10 passos alguém acha; em 3 dias, sem velório nem cova, e o luto da família dobra ---
    const S = village(42, 12); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[8];
    F.link(S, V, P, 60);
    jump(S, dryFrom(S, 1, 6), 9);
    put(S, V, farSpot(S, 36));
    kill(S, V);
    const c = V.corpo, longe = dist(V, { x: S.camp.x + 1, y: S.camp.y + 1 });
    check('morreu longe (mais de CORPO_CAMP do acampamento) e sem ninguém por perto: corpo com st 0 ("ninguém achou ainda")', !!c && c.st === 0 && longe > C.CORPO_CAMP && S.memoria.corpos.indexOf(V.id) >= 0 && M.bodyText(S, V) === 'Ninguém achou ainda', 'a ' + longe.toFixed(0) + ' passos');
    let minD = 1e9;
    run(S, 720 * 2, () => { for (const q of alive(S)) minD = Math.min(minD, dist(q, V)); });
    check('dois dias depois ninguém passou a menos de CORPO_VER: o corpo segue sem ser achado e ninguém foi buscar', V.corpo === c && c.st === 0 && !c.res && !c.by && minD > C.CORPO_VER, 'o mais perto: ' + minD.toFixed(0) + ' passos');
    put(S, Q, { x: Math.floor(V.x) + C.CORPO_VER + 2, y: Math.floor(V.y) });
    M.hourly(S);
    check('alguém a mais de CORPO_VER passos não acha o corpo', c.st === 0, dist(Q, V).toFixed(1));
    put(S, Q, { x: Math.floor(V.x) + C.CORPO_VER - 2, y: Math.floor(V.y) });
    M.hourly(S);
    check('alguém a menos de CORPO_VER passos acha o corpo na hora cheia: st 1', c.st === 1 && M.bodyText(S, V).indexOf('Espera quem') === 0, dist(Q, V).toFixed(1) + ' → ' + M.bodyText(S, V));
    // outro mundo: ninguém chega até passar o prazo
    const S2 = village(42, 12); calm(S2);
    const V2 = S2.people[4], P2 = S2.people[5], R = S2.people[9];
    F.link(S2, V2, P2, 60);
    jump(S2, dryFrom(S2, 1, 6), 9);
    put(S2, V2, farSpot(S2, 36));
    kill(S2, V2);
    const c2 = V2.corpo, t0 = c2.t;
    S2.t = t0 + C.CORPO_MAX_D * DAYM - 60; S2.ck = Sim.clock(S2.t);
    M.hourly(S2);
    check('antes de CORPO_MAX_D dias ainda se espera: o corpo segue lá, sem cova', V2.corpo === c2 && c2.st === 0 && !V2.semCova && M.graves(S2).length === 0);
    S2.t = t0 + C.CORPO_MAX_D * DAYM; S2.ck = Sim.clock(S2.t);
    const bef = gleft(S2, P2), befR = gleft(S2, R);
    M.hourly(S2);
    const aft = gleft(S2, P2);
    check('em CORPO_MAX_D dias sem ninguém achar: sem corpo, sem cova (semCova), fora de corpos, sem enterro', !V2.corpo && V2.semCova === 1 && M.graves(S2).length === 0 && S2.memoria.corpos.indexOf(V2.id) < 0 && S2.stats.enterros === 0 && M.bodyText(S2, V2) === 'Sem cova');
    check('a família guarda "não pôde se despedir" e o luto dela dobra (o que faltava vira o dobro); quem não era da família não muda', hasMem(P2, 'semDespedida') && bef.length >= 1 && aft.length === bef.length && aft.every((x, i) => near(x, bef[i] * 2, 1e-6)) && !hasMem(R, 'semDespedida') && gleft(S2, R).every((x, i) => near(x, befR[i], 1e-9)), JSON.stringify(bef.map((x) => +x.toFixed(2))) + ' → ' + JSON.stringify(aft.map((x) => +x.toFixed(2))));
    check('a Crônica conta que ninguém achou o corpo', chronHas(S2, new RegExp('Ninguém achou ' + V2.name)));
  }
  {
    // --- 4. quem leva o corpo: a vez de cada um, a reserva, o pega e o larga, a hora do velório ---
    const S = village(42, 14); calm(S);
    const V = S.people[4], Q = S.people[6], R = S.people[7];
    const kid = S.people[8], doente = S.people[9], dorme = S.people[10], parto = S.people[11], colo = S.people[12], bebe = S.people[13];
    const d1 = dryFrom(S, 1, 3);
    jump(S, d1, 9);
    kill(S, V);
    const c = V.corpo, fogo = L.campFire(S, true);
    setAge(S, kid, 14); doente.needs.saude = 30; dorme.sleeping = true; parto.labor = { until: S.t + 500 }; setAge(S, bebe, 0); bebe.carriedBy = colo.id;
    const w = M.want(S, Q);
    check('quem pode carregar (adulto, saúde e energia boas) é chamado para o corpo, com vontade 90', c.st === 1 && !!w && w.k === 'corpo' && w.score === 90, JSON.stringify(w));
    check('não é chamado para o corpo quem tem 14 anos, saúde baixa, dorme, está em trabalho de parto ou tem bebê no colo', [kid, doente, dorme, parto, colo].every((p) => { const x = M.want(S, p); return !x || x.k !== 'corpo'; }), [kid, doente, dorme, parto, colo].map((p) => (M.want(S, p) || {}).k).join());
    const a = act(S, Q, 'corpo'), wx = c.wi % S.world.W + 0.5, wy = ((c.wi / S.world.W) | 0) + 0.5, dd = dist({ x: wx, y: wy }, { x: fogo.x + 0.5, y: fogo.y + 0.5 });
    check('a tarefa busca o corpo onde ele está, leva a um lugar a 2 a 4,3 passos do fogo e o reserva para quem a pegou', !!a && a.m.carry === V.id && near(a.m.bx, V.x) && near(a.m.by, V.y) && near(a.m.x, wx) && near(a.m.y, wy) && dd >= 1.9 && dd <= 4.4 && c.res === Q.id && c.resT === S.t, 'a ' + dd.toFixed(2) + ' do fogo');
    check('com o corpo reservado os outros não são chamados para ele, e a tarefa só vale para quem a reservou', (M.want(S, R) || {}).k !== 'corpo' && M.valid(S, Q, a) && !M.valid(S, R, a));
    check('o texto da tarefa muda com o passo: buscar, levar, deitar', M.describe(S, Q, { m: a.m, stage: 'fetch' }) === 'Indo buscar ' + V.name && M.describe(S, Q, { m: a.m, stage: 'carry' }) === 'Levando ' + V.name + ' para junto do fogo' && M.describe(S, Q, { m: a.m, stage: 'stay' }) === 'Deitando ' + V.name + ' ao pé do fogo');
    M.drop(S, Q, a);
    check('largar a tarefa no meio devolve o corpo (res 0) e outro pode pegar', c.res === 0 && (M.want(S, R) || {}).k === 'corpo');
    // a reserva vence sozinha: 8 horas sem notícia, ou o dono morreu
    c.res = Q.id; c.resT = S.t - 481; M.hourly(S);
    const venceu = c.res === 0;
    c.res = Q.id; c.resT = S.t; Q.alive = false; M.hourly(S); Q.alive = true;
    check('a reserva do corpo vence sozinha: depois de 8 horas, ou se quem pegou morreu', venceu && c.res === 0);
    const a2 = act(S, Q, 'corpo');
    M.lift(S, Q, a2);
    const perto = c.by === Q.id;
    Q.x += 3; Q.y -= 2; M.carried(S, Q, a2);
    check('pegar o corpo marca quem leva (by) e, andando, o corpo vai na mesma posição de quem leva', perto && near(V.x, Q.x) && near(V.y, Q.y) && c.resT === S.t && M.bodyText(S, V).indexOf('Sendo levad') === 0, M.bodyText(S, V));
    M.done(S, Q, a2);
    check('deitado: o corpo vai ao lugar marcado, solta quem levou e o velório é hoje (st 2)', c.st === 2 && c.by === 0 && c.res === 0 && near(V.x, wx) && near(V.y, wy) && c.vel === d1 && M.bodyText(S, V) === 'No velório, ao pé do fogo');
    const lay = (h) => { jump(S, d1, h); c.st = 1; c.res = 0; c.by = 0; const a3 = act(S, Q, 'corpo'); M.lift(S, Q, a3); M.done(S, Q, a3); return c.vel - d1; };
    check('deitado até as 18h59, o velório é no mesmo dia; a partir das 19h, só amanhã (não dá tempo)', lay(8) === 0 && lay(18.9) === 0 && lay(19) === 1 && lay(22) === 1, [lay(8), lay(18.9), lay(19), lay(22)].join());
  }
  {
    // --- 5. o velório: quem vem, quanto fica, o que ganha e quando acaba ---
    const S = village(42, 14); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6], R = S.people[7], kid = S.people[8], tod = S.people[9], Z = S.people[10];
    F.link(S, V, P, 60); setAge(S, kid, 9); setAge(S, tod, 4);
    P.traits = []; P.fe = 50;
    const d1 = dryFrom(S, 1, 3);
    jump(S, d1, 9);
    kill(S, V); kill(S, Z);
    const c = V.corpo, cz = Z.corpo;
    const lay = (d) => { const a = act(S, Q, 'corpo'); M.lift(S, Q, a); M.done(S, Q, a); };
    lay(V); lay(Z);
    const fe0 = P.fe;
    jump(S, d1, 16);
    check('antes das 17h ninguém é chamado para velar', !M.want(S, P) && !M.want(S, R));
    S.events.length = 0;
    jump(S, d1, 17);
    M.hourly(S);
    const sinos = S.events.filter((e) => e.k === 'memoria' && e.ev === 'velorio' && e.on === true).length;
    M.hourly(S);
    check('às 17h o sino toca uma vez por corpo (o velório abre) e a Crônica ainda não fala de velório', c.sino === 1 && cz.sino === 1 && sinos === 2 && S.events.filter((e) => e.k === 'memoria' && e.ev === 'velorio').length === 2 && !chronHas(S, /velório/));
    jump(S, d1, 18);
    const wP = M.want(S, P), wR = M.want(S, R), wK = M.want(S, kid), wT = M.want(S, tod);
    check('de tardinha o velório chama: a família com 96, os outros adultos com 80, a criança de 9 anos com 60; quem tem menos de 5 não é chamado', !!wP && wP.k === 'velar' && wP.score === 96 && !!wR && wR.score === 80 && !!wK && wK.score === 60 && !wT, [wP, wR, wK, wT].map((x) => x && x.score).join());
    check('a tarefa de velar vai ao corpo e dura mais para a família (VELAR_FAM) do que para os outros (VELAR_MIN)', M.task(S, P, 'velar').min === C.VELAR_FAM && M.task(S, R, 'velar').min === C.VELAR_MIN && M.task(S, R, 'velar').pid === V.id && near(M.task(S, R, 'velar').x, V.x));
    check('o velório segura a história da noite (blockStory) e a ficha diz onde o corpo está', M.blockStory(S) && M.bodyText(S, V) === 'No velório, ao pé do fogo');
    const gl0 = gleft(S, P);
    const aP = act(S, P, 'velar');
    M.done(S, P, aP);
    check('quem velou: conta no corpo, guarda "velou", o luto cai pela metade (VELORIO_LUTO) e a fé sobe VELORIO_FE', c.n === 1 && P.velou === V.id && hasMem(P, 'velou') && gl0.length >= 1 && gleft(S, P).every((x, i) => near(x, gl0[i] * C.VELORIO_LUTO, 1e-6)) && near(P.fe, fe0 + C.VELORIO_FE), 'luto ' + JSON.stringify(gl0.map((x) => +x.toFixed(1))) + ' → ' + JSON.stringify(gleft(S, P).map((x) => +x.toFixed(1))) + ', fé ' + P.fe);
    check('quem já velou aquele corpo não é chamado de novo, mas o outro corpo ainda o chama (80)', (M.want(S, P) || {}).score === 80);
    jump(S, d1, 21);
    M.hourly(S);
    check('às 21h o velório fecha: o corpo com velório vira número, Crônica e fim; o sem ninguém fecha em silêncio', c.fim === 1 && c.velado === true && S.stats.velorios === 1 && chronHas(S, /Foi o primeiro velório/) && cz.fim === 1 && cz.velado === false, S.stats.velorios + ' velórios');
    check('fechado o velório, a noite volta a poder ter história e a ficha diz "Espera o enterro"', !M.blockStory(S) && M.bodyText(S, V) === 'Espera o enterro');
    check('o fim do velório dá o evento (para o desenho do sino) só para o velado', S.events.filter((e) => e.k === 'memoria' && e.ev === 'velorio' && e.on === false).length === 1);
  }
  {
    // --- 6. o enterro: de manhã o corpo vai ao cemitério e a cova abre numa fileira, na vaga reservada ---
    const S = village(42, 14); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6], R = S.people[7], Z = S.people[8], kid = S.people[9], pq = S.people[10], Z3 = S.people[11];
    F.link(S, V, P, 60); kid.mother = V.id; setAge(S, kid, 9); setAge(S, pq, 6); pq.mother = V.id;
    const d1 = dryFrom(S, 1, 3);
    jump(S, d1, 9);
    kill(S, V); kill(S, Z); kill(S, Z3);
    const c = V.corpo, cz = Z.corpo, c3 = Z3.corpo;
    for (const d of [V, Z, Z3]) layBody(S, d, Q, 3);   // as três já foram veladas: o enterro é na manhã seguinte
    jump(S, d1 + 1, 5);
    check('antes das 6h ninguém é chamado para enterrar', (M.want(S, Q) || {}).k !== 'enterrar');
    jump(S, d1 + 1, 6);
    const w6 = M.want(S, Q);
    jump(S, d1 + 1, 17);
    const w17 = M.want(S, Q);
    check('das 6h às 17h quem carrega é chamado para enterrar (90); depois, não', !!w6 && w6.k === 'enterrar' && w6.score === 90 && (!w17 || w17.k !== 'enterrar'), JSON.stringify(w6) + ' ' + JSON.stringify(w17));
    jump(S, d1 + 1, 7);
    check('antes do primeiro enterro, sem marco, não há cemitério', !M.cemetery(S) && S.buildings.every((b) => b.type !== 'cemiterio'));
    const a = act(S, Q, 'enterrar'), cem = M.cemetery(S), W0 = S.world.W;
    check('o primeiro enterro sem marco ergue o cemitério (pronto, automático, anotado em memoria.cem) e reserva a vaga e o corpo', !!a && !!cem && cem.type === 'cemiterio' && cem.built && cem.auto === 1 && S.memoria.cem === cem.id && c.res === Q.id && c.pi !== undefined && chronHas(S, /separou um canto para os seus mortos/));
    const a2 = act(S, R, 'enterrar'), a3 = act(S, S.people[12], 'enterrar');
    const px = (pi) => ({ x: pi % W0, y: (pi / W0) | 0 });
    check('cada corpo reserva a sua vaga: três vagas diferentes, todas na grade par do marco e a 2,4 passos ou mais dele', new Set([c.pi, cz.pi, c3.pi]).size === 3 && [c, cz, c3].every((k) => { const q = px(k.pi); return ((q.x - cem.x) & 1) === 0 && ((q.y - cem.y) & 1) === 0 && Math.hypot(q.x - cem.x - 0.5, q.y - cem.y - 0.5) >= 2.4; }), [c, cz, c3].map((k) => px(k.pi).x + ',' + px(k.pi).y).join(' | '));
    check('a tarefa leva o corpo à vaga e fica ENTERRO_MIN minutos; vale só para quem a reservou', a.m.min === C.ENTERRO_MIN && a.m.carry === V.id && near(a.m.x, px(c.pi).x + 0.5) && near(a.m.y, px(c.pi).y + 0.5) && M.valid(S, Q, a) && !M.valid(S, R, a) && M.describe(S, Q, { m: a.m, stage: 'stay' }) === 'Abrindo a cova de ' + V.name && M.describe(S, Q, { m: a.m, stage: 'carry' }) === 'Levando ' + V.name + ' ao cemitério');
    // a vaga do terceiro corpo foi tomada no meio do caminho: a cova abre na vaga livre mais perto, sem cerimônia
    const q3 = px(c3.pi);
    W.addObj(S.world, 'grave', q3.x, q3.y, { name: 'Antigo' });
    M.lift(S, Q, a); M.done(S, Q, a);
    M.lift(S, R, a2); M.done(S, R, a2);
    const S12 = S.people[12];
    M.lift(S, S12, a3); M.done(S, S12, a3);
    const o = graveOf(S, V), oz = graveOf(S, Z), o3 = graveOf(S, Z3);
    check('a cova abre na vaga reservada, com nome, id, hora, rito e velado, e o morto passa a estar nela', !!o && o.x === px(c.pi).x && o.y === px(c.pi).y && o.name === V.name && o.pid === V.id && o.r === 'h' && o.vel === 1 && o.t === S.t && !V.corpo && V.cova[0] === o.x && V.cova[1] === o.y && near(V.x, o.x + 0.5) && /^Enterrad[ao] no cemitério$/.test(M.bodyText(S, V)), JSON.stringify(o));
    check('o segundo enterro vai à própria vaga, e o do terceiro, com a vaga tomada, abre em outra vaga livre', !!oz && oz.x === px(cz.pi).x && oz.y === px(cz.pi).y && !!o3 && !(o3.x === q3.x && o3.y === q3.y) && S.stats.enterros === 3 && M.graves(S).length === 4, JSON.stringify(o3));
    check('a Crônica fala da primeira cova uma vez só (com quem cavou); os outros enterros viram aviso', S.chron.filter((x) => /abriu a primeira cova/.test(x.text)).length === 1 && chronHas(S, new RegExp(Q.name + ' abriu a primeira cova')));
    check('a família que vem depois: o par e o filho de 9 anos têm a visita marcada na cova; o de 6 anos, não', !!P.vis && P.vis.pid === V.id && P.vis.x === o.x && P.vis.y === o.y && P.vis.d === d1 + 1 && !!kid.vis && !pq.vis && !Q.vis && !R.vis, JSON.stringify(P.vis));
    check('depois de enterrada, a tarefa de enterrar acaba (não vale mais) e a lista de corpos esvazia', !M.valid(S, Q, a) && S.memoria.corpos.length === 0);
  }
  {
    // --- 7. a visita à cova: quando, quanto fica, o que deixa e o que ganha ---
    const S = village(42, 14); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6], kid = S.people[7], pq = S.people[8], V2 = S.people[9];
    F.link(S, V, P, 60); kid.mother = V.id; setAge(S, kid, 9); P.traits = []; P.fe = 40;
    const d1 = dryFrom(S, 1, 4);
    jump(S, d1, 9);
    kill(S, V); kill(S, V2);
    layBody(S, V, Q, 3); layBody(S, V2, Q, 3);
    jump(S, d1 + 1, 7);
    buryBody(S, V, Q); buryBody(S, V2, Q);
    const o = graveOf(S, V), o2 = graveOf(S, V2), cem = M.cemetery(S);
    jump(S, d1 + 1, 6);
    const w6 = M.want(S, P);
    jump(S, d1 + 1, 7);
    const w7 = M.want(S, P), wk = M.want(S, kid);
    jump(S, d1 + 1, 16);
    const w16 = M.want(S, P);
    check('a visita marcada chama das 7h às 16h (62): antes e depois, não; o de 9 anos também vai', (!w6 || w6.k !== 'cova') && !!w7 && w7.k === 'cova' && w7.score === 62 && !!wk && wk.k === 'cova' && (!w16 || w16.k !== 'cova'), [w6, w7, w16].map((x) => x && x.k).join());
    jump(S, d1 + 1, 8);
    const t = M.task(S, P, 'cova');
    check('a tarefa vai à cova (a menos de 1,6 passo), fica VISITA_MIN minutos e sabe de quem é', !!t && t.pid === V.id && near(t.x, o.x + 0.5) && near(t.y, o.y + 0.5) && t.min === C.VISITA_MIN && t.r1 <= 1.6 && M.valid(S, P, { m: t }) && /^Indo à cova de /.test(M.describe(S, P, { m: t, stage: 'go' })) && /^Na cova de /.test(M.describe(S, P, { m: t, stage: 'stay' })));
    S.stock.frutas = 30;
    const gl0 = gleft(S, P), fe0 = P.fe, vis0 = S.stats.visitas, ev0 = S.events.length;
    M.done(S, P, { m: t, type: 'memoria', stage: 'stay' });
    const vale = Sim.def(cem).mem.vale, cura = Math.max(1, gl0[0] - C.VISITA_CURA * vale);
    check('a visita deixa flores por FLOR_D dias e, com fruta sobrando, uma fruta por 3 dias (sai do estoque)', o.fl === S.t + C.FLOR_D * DAYM && o.of === S.t + 3 * DAYM && S.stock.frutas === 29, 'frutas ' + S.stock.frutas);
    check('quem visitou: guarda a lembrança, o luto encurta VISITA_CURA dias (vale 1 no cemitério simples), a fé sobe VISITA_FE, vira número e some a visita marcada', hasMem(P, 'visitouCova') && near(gleft(S, P)[0], cura, 1e-6) && near(P.fe, fe0 + C.VISITA_FE * vale) && S.stats.visitas === vis0 + 1 && !P.vis, 'luto ' + gl0[0].toFixed(1) + ' → ' + gleft(S, P)[0].toFixed(1) + ', fé ' + fe0 + ' → ' + P.fe);
    check('a primeira visita entra na Crônica e a cova mostra as flores e a oferenda ao toque', chronHas(S, new RegExp(P.name + ' voltou à cova de ' + V.name + ' com flores')) && M.graveInfo(S, o).flores && M.graveInfo(S, o).oferenda);
    const t2 = M.task(S, kid, 'cova');
    M.done(S, kid, { m: t2, type: 'memoria', stage: 'stay' });
    check('um segundo visitante renova as flores (por FLOR_D dias a partir dele) e conta na visita', o.fl === S.t + C.FLOR_D * DAYM && S.stats.visitas === vis0 + 2 && hasMem(kid, 'visitouCova'));
    const w2 = M.task(S, Q, 'cova');   // Q não tem visita marcada
    check('quem não tem visita marcada não recebe a tarefa de visitar', w2 === null && !Q.vis);
    // sem fruta sobrando (menos de FRUTA_SOBRA): só flores. O luto que falta menos que VISITA_CURA cai só até um dia
    Q.vis = { x: o2.x, y: o2.y, d: S.ck.day, pid: V2.id };
    for (const x of Q.mem) if (GRIEF.indexOf(x.k) >= 0) x.until = S.t + 2 * DAYM;
    if (!grief(Q).length) Q.mem.push({ k: 'perdeuAlguem', until: S.t + 2 * DAYM });
    S.stock.frutas = C.FRUTA_SOBRA - 1;
    M.done(S, Q, { m: M.task(S, Q, 'cova'), type: 'memoria', stage: 'stay' });
    check('sem fruta sobrando (menos de FRUTA_SOBRA) o estoque não é tocado e a cova fica só com flores', S.stock.frutas === C.FRUTA_SOBRA - 1 && !o2.of && o2.fl === S.t + C.FLOR_D * DAYM, 'frutas ' + S.stock.frutas + ', of ' + o2.of);
    check('o luto que falta menos que VISITA_CURA cai só até um dia (nunca zera de uma vez)', grief(Q).every((x) => near((x.until - S.t) / DAYM, 1, 1e-6)), JSON.stringify(gleft(S, Q)));
    pq.vis = { x: o2.x, y: o2.y, d: S.ck.day, pid: V2.id };
    S.stock.frutas = C.FRUTA_SOBRA;
    M.done(S, pq, { m: M.task(S, pq, 'cova'), type: 'memoria', stage: 'stay' });
    check('com exatamente FRUTA_SOBRA frutas, a fruta já vai (a conta é "sobram 10 ou mais")', o2.of === S.t + 3 * DAYM && S.stock.frutas === C.FRUTA_SOBRA - 1, 'frutas ' + S.stock.frutas);
    kid.vis = { x: o.x, y: o.y, d: S.ck.day - 3, pid: V.id };
    const wv = M.want(S, kid);
    check('a visita marcada que passou de 2 dias é esquecida', !kid.vis && (!wv || wv.k !== 'cova'));
    kid.vis = { x: o.x + 4, y: o.y, d: S.ck.day, pid: V.id };
    const wg = M.want(S, kid);
    check('a visita a uma cova que não existe mais é esquecida', !kid.vis && (!wg || wg.k !== 'cova'));
  }
  {
    // --- 8. cada povo se despede do seu jeito: o elfo planta, o anão põe laje, o fera uiva, o casal junta os dois ritos ---
    const novo = (n) => { const S = village(42, n || 10); calm(S); S.vontades.pedra = 0; return S; };
    // elfo, pelo caminho inteiro
    let S = novo(), el = add(S, 'M', 'Taliel', 30, 'elfo');
    jump(S, dryFrom(S, 1, 5), 8); kill(S, el);
    const cEl = el.corpo;
    cycle(S, el, 4);
    let o = graveOf(S, el);
    check('elfo: o corpo leva o rito e, enterrado, a cova é "e" (árvore plantada em cima), com o rito escrito na Crônica e na ficha', cEl.r === 'e' && !!o && o.r === 'e' && M.graveInfo(S, o).rito.join() === M.RITO_NOME.e && chronHas(S, /com uma árvore plantada em cima/), o && o.r);
    // anão, pelo caminho inteiro, com pedra
    S = novo(); const an = add(S, 'M', 'Durgo', 30, 'anao');
    jump(S, dryFrom(S, 1, 5), 8); kill(S, an);
    const pedra0 = S.stock.pedra;
    cycle(S, an, 4);
    o = graveOf(S, an);
    check('anão: a cova é "a" e leva uma laje de pedra, também na Crônica e na ficha', !!o && o.r === 'a' && o.laje === 1 && M.graveInfo(S, o).laje && chronHas(S, /com uma laje de pedra/), o && JSON.stringify(o));
    // anão sem pedra e com pedra a menos: sem laje, o estoque não é tocado
    for (const falta of [60, 0, C.LAJE_PEDRA - 1]) {
      S = novo(); const an2 = add(S, 'M', 'Durgo2', 30, 'anao'), Q = S.people[6];
      const d1 = dryFrom(S, 1, 3);
      jump(S, d1, 8); kill(S, an2);
      layBody(S, an2, Q, 3);
      jump(S, d1 + 1, 7);
      S.stock.pedra = falta;
      buryBody(S, an2, Q);
      const og = graveOf(S, an2);
      if (falta >= C.LAJE_PEDRA) check('anão com pedra de sobra (' + falta + '): a laje sai do estoque (LAJE_PEDRA) e a cova a leva', !!og && og.r === 'a' && og.laje === 1 && S.stock.pedra === falta - C.LAJE_PEDRA, 'pedra ' + S.stock.pedra);
      else check('anão com ' + falta + ' de pedra (menos de ' + C.LAJE_PEDRA + '): enterra sem laje e não mexe no estoque', !!og && og.r === 'a' && !og.laje && S.stock.pedra === falta, 'pedra ' + S.stock.pedra);
    }
    // o fera uiva ao fim do velório (só os que estão acordados), o casal de dois povos também; o de um povo só, não
    const howl = (deadSpec, partnerKind) => {
      const S2 = novo(), d = deadSpec === 'fera' ? add(S2, 'M', 'Rauã', 30, 'fera') : S2.people[4];
      const f1 = add(S2, 'F', 'Ayra', 30, 'fera'), f2 = add(S2, 'M', 'Kaiê', 30, 'fera');
      if (partnerKind === 'fera') F.link(S2, d, f1, 60); else if (partnerKind === 'humano') F.link(S2, d, S2.people[5], 60);
      const d1 = dryFrom(S2, 1, 3);
      jump(S2, d1, 9); kill(S2, d);
      const c = d.corpo;
      c.st = 2; c.vel = d1; c.n = 1;
      f1.sleeping = false; f2.sleeping = true; f1.say = ''; f2.say = '';
      jump(S2, d1, 21); S2.events.length = 0;
      M.hourly(S2);
      return { uivo: S2.events.some((e) => e.k === 'memoria' && e.ev === 'uivo'), acordado: f1.say, dormindo: f2.say, r: c.r, r2: c.r2 };
    };
    const h1 = howl('fera', ''), h2 = howl('humano', 'fera'), h3 = howl('humano', 'humano');
    check('fera morto: no fim do velório o povo-fera uiva (evento "uivo" e a fala "Auuuu…" de quem está acordado, não de quem dorme)', h1.r === 'f' && h1.uivo && h1.acordado === 'Auuuu…' && h1.dormindo === '', JSON.stringify(h1));
    check('humano com par fera: o casal junta os dois ritos (h e f) e o povo-fera uiva também', h2.r === 'h' && h2.r2 === 'f' && h2.uivo && h2.acordado === 'Auuuu…', JSON.stringify(h2));
    check('humano com par humano: sem segundo rito e sem uivo', !h3.r2 && !h3.uivo && h3.acordado === '', JSON.stringify(h3));
    // o casal elfo e humano: a cova leva os dois ritos e a convivência dos dois povos sobe CONV_RITO
    S = novo(); const elfa = add(S, 'F', 'Ilanê', 30, 'elfo'), hum = S.people[5];
    F.link(S, elfa, hum, 60);
    const d2 = dryFrom(S, 1, 5);
    jump(S, d2, 8); kill(S, elfa);
    const ce = elfa.corpo;
    check('elfa com companheiro humano: o corpo leva o rito dos dois (e, h) e a convivência entre os povos já conta como mistura', ce.r === 'e' && ce.r2 === 'h' && Pv.mixed(S));
    const cv0 = Pv.conv(S, 'elfo', 'humano');
    ce.st = 2; ce.vel = d2; ce.n = 1;
    jump(S, d2, 21); M.hourly(S);
    check('ao fim do velório do casal misto, elfos e humanos se aproximam CONV_RITO (1,5) de uma vez só', near(Pv.conv(S, 'elfo', 'humano') - cv0, C.CONV_RITO, 1e-6), cv0 + ' → ' + Pv.conv(S, 'elfo', 'humano'));
    S = novo(); const elfb = add(S, 'F', 'Ilanê', 30, 'elfo'), humb = S.people[5], Qb = S.people[6];
    F.link(S, elfb, humb, 60);
    const d3 = dryFrom(S, 1, 3);
    jump(S, d3, 8); kill(S, elfb);
    layBody(S, elfb, Qb, 3);
    jump(S, d3 + 1, 7);
    buryBody(S, elfb, Qb);
    o = graveOf(S, elfb);
    check('a cova do casal misto guarda os dois ritos ("eh") e a ficha mostra os dois', !!o && o.r === 'eh' && M.graveInfo(S, o).rito.length === 2 && M.graveInfo(S, o).rito[0] === M.RITO_NOME.e && M.graveInfo(S, o).rito[1] === M.RITO_NOME.h, o && o.r);
    // o mestiço segue o sangue que tem mais
    S = novo(); const mest = add(S, 'M', 'Mestiço', 30), Qc = S.people[6];
    mest.povo = 'meio'; mest.sangue = { humano: 0.25, anao: 0.75 };
    jump(S, dryFrom(S, 1, 3), 8); kill(S, mest);
    check('o mestiço despede pelo povo de que tem mais sangue (anão: a)', mest.corpo && mest.corpo.r === 'a' && !mest.corpo.r2, mest.corpo && mest.corpo.r);
  }
  {
    // --- 9. o cemitério que o jogador marca é o que o povo usa; cercado, a visita e o dia dos mortos consolam mais ---
    const S = village(42, 14); calm(S);
    const b = build(S, 'cemiterio', 12);
    check('o marco do jogador vira o cemitério (memoria.cem) e a Crônica diz que o povo marcou o lugar', M.cemetery(S) === b && S.memoria.cem === b.id && !b.auto && chronHas(S, /marcou o lugar do cemitério/));
    const V = S.people[4], P = S.people[5], Q = S.people[6], V2 = S.people[7], V3 = S.people[8];
    F.link(S, V, P, 60);
    const d1 = dryFrom(S, 1, 4);
    jump(S, d1, 8);
    kill(S, V);
    cycle(S, V, 4);
    const o = graveOf(S, V);
    check('o povo enterra no cemitério do jogador, na fileira e dentro do raio (6), e não ergue outro', !!o && M.cemetery(S) === b && S.buildings.filter((x) => x.type === 'cemiterio').length === 1 && ((o.x - b.x) & 1) === 0 && ((o.y - b.y) & 1) === 0 && Math.hypot(o.x - b.x - 0.5, o.y - b.y - 0.5) <= 6.5 && /no cemitério/.test(M.bodyText(S, V)) && chronHas(S, /abriu a primeira cova no cemitério/), o && (o.x - b.x) + ',' + (o.y - b.y));
    jump(S, S.ck.day + 1, 6);
    kill(S, V2); kill(S, V3);
    layBody(S, V2, Q, 3); layBody(S, V3, Q, 3);
    jump(S, S.ck.day + 1, 7);
    buryBody(S, V2, Q); buryBody(S, V3, Q);
    const gs = M.graves(S).filter((g) => g.pid), dmax = Math.max(...gs.map((g) => Math.hypot(g.x - b.x - 0.5, g.y - b.y - 0.5)));
    check('as covas seguintes abrem as mais perto do marco, sem repetir lugar, todas em fileira', gs.length === 3 && new Set(gs.map((g) => g.x + ',' + g.y)).size === 3 && gs.every((g) => ((g.x - b.x) & 1) === 0 && ((g.y - b.y) & 1) === 0) && dmax <= 6.5, 'mais longe ' + dmax.toFixed(1));
    // visita no cemitério simples e no cercado: a mesma conta, vale 1 e vale 1,5
    P.traits = []; Q.traits = [];
    const visita = (quem, cova) => {
      quem.vis = { x: cova.x, y: cova.y, d: S.ck.day, pid: cova.pid };
      for (const x of quem.mem) if (GRIEF.indexOf(x.k) >= 0) x.until = S.t + 30 * DAYM;
      if (!grief(quem).length) quem.mem.push({ k: 'perdeuAlguem', until: S.t + 30 * DAYM });
      const fe0 = quem.fe, g0 = gleft(S, quem)[0];
      M.done(S, quem, { m: M.task(S, quem, 'cova'), type: 'memoria', stage: 'stay' });
      return { cura: g0 - gleft(S, quem)[0], fe: quem.fe - fe0 };
    };
    const v1 = visita(P, o);
    S.stock.madeira = 200;
    const up = Sim.upgrades(S, b);
    check('o cemitério tem uma melhoria (cercado) que dá para comprar', up.length === 1 && !up[0].why, up.map((u) => u.why).join());
    Sim.startUpgrade(S, b);
    Sim.complete(S, b);
    check('cercado: nível 2, raio 8 e vale 1,5', b.lv === 2 && Sim.def(b).mem.r === 8 && Sim.def(b).mem.vale === 1.5);
    const v2 = visita(Q, o);
    check('a visita ao cemitério simples encurta o luto em VISITA_CURA dias e dá VISITA_FE de fé; no cercado, 1,5 vez isso', near(v1.cura, C.VISITA_CURA, 1e-6) && near(v1.fe, C.VISITA_FE, 1e-6) && near(v2.cura, C.VISITA_CURA * 1.5, 1e-6) && near(v2.fe, C.VISITA_FE * 1.5, 1e-6), JSON.stringify(v1) + ' / ' + JSON.stringify(v2));
    // uma cova velha, longe do marco (mais de 20 passos), vale 1 mesmo no cercado
    const longe = farSpot(S, 0), sp = { x: b.x + 25, y: b.y };
    const velha = W.addObj(S.world, 'grave', Math.min(S.world.W - 6, sp.x), sp.y, { name: 'Antiga' });
    velha.pid = V.id;   // (a visita só precisa de uma cova no lugar)
    const v3 = visita(P, velha);
    check('uma cova a mais de 20 passos do marco não ganha o consolo do cercado: vale 1', near(v3.cura, C.VISITA_CURA, 1e-6) && near(v3.fe, C.VISITA_FE, 1e-6), JSON.stringify(v3));
    // o dia dos mortos também vale pelo cemitério
    S.memoria.fin = { year: 0, on: true, foi: {}, x: b.x + 1, y: b.y + 1, n: 0, day: S.ck.day };
    for (const x of Q.mem) if (GRIEF.indexOf(x.k) >= 0) x.until = S.t + 30 * DAYM;
    const fq0 = Q.fe, gq0 = gleft(S, Q)[0];
    M.done(S, Q, { m: M.task(S, Q, 'finados'), type: 'memoria', stage: 'stay' });
    check('no dia dos mortos o cemitério cercado consola FINADOS_CURA × 1,5 dias e dá FINADOS_FE × 1,5 de fé', near(gq0 - gleft(S, Q)[0], C.FINADOS_CURA * 1.5, 1e-6) && near(Q.fe - fq0, C.FINADOS_FE * 1.5, 1e-6) && hasMem(Q, 'diaDosMortos') && S.memoria.fin.foi[Q.id] === 1 && S.memoria.fin.n === 1, (gq0 - gleft(S, Q)[0]).toFixed(1));
  }
  {
    // --- 10. o jogo fechado: sem corpo, sem velório; o que esperava é enterrado sem cerimônia ---
    let S = village(42, 12); calm(S);
    let V = S.people[4];
    S.safe = true;
    V.alive = false; V.diedAt = S.t; V.cause = 'velhice';
    check('com o jogo fechado (S.safe) a morte não deixa corpo: onDeath devolve false (a cova nasce na hora) e nada fica esperando', M.onDeath(S, V) === false && !V.corpo && S.memoria.corpos.length === 0);
    S = village(42, 12); calm(S); V = S.people[4];
    S.resumido = true; V.alive = false; V.diedAt = S.t; V.cause = 'velhice';
    check('o dia resumido (S.resumido) também não deixa corpo', M.onDeath(S, V) === false && !V.corpo);
    S = village(42, 12); calm(S); V = S.people[4];
    const P = S.people[5], Q = S.people[6];
    F.link(S, V, P, 60);
    const d1 = dryFrom(S, 1, 4);
    jump(S, d1, 14);
    kill(S, V);
    const c = V.corpo;
    const cx = V.x, cy = V.y;
    S.resumido = true;
    jump(S, d1, 15);
    M.hourly(S);
    const o = graveOf(S, V);
    check('o corpo que esperava, com o jogo fechado, é enterrado sem cerimônia na hora cheia seguinte: cova com nome, sem velório nem Crônica de cova, sem visita', !V.corpo && !!o && o.name === V.name && o.r === 'h' && !o.vel && S.memoria.corpos.length === 0 && S.stats.velorios === 0 && S.stats.enterros === 1 && !chronHas(S, /primeira cova/) && !P.vis && Math.hypot(o.x + 0.5 - cx, o.y + 0.5 - cy) < 8, o && JSON.stringify(o));
    S = village(42, 12); calm(S); V = S.people[4];
    const Qb = S.people[6], b = build(S, 'cemiterio', 12);
    const d2 = dryFrom(S, 1, 4);
    jump(S, d2, 9); kill(S, V); layBody(S, V, Qb, 0);
    S.safe = true; jump(S, d2, 10); M.hourly(S);
    const o2 = graveOf(S, V);
    check('com um cemitério marcado, a cova sem cerimônia abre no cemitério, em fileira; o velório que começou não conta', !!o2 && ((o2.x - b.x) & 1) === 0 && ((o2.y - b.y) & 1) === 0 && Math.hypot(o2.x - b.x - 0.5, o2.y - b.y - 0.5) <= 6.5 && S.stats.velorios === 0 && !o2.vel);
    // com o jogo fechado, a Memória não manda ninguém fazer nada e as perguntas ficam sem resposta
    S = village(42, 12); calm(S);
    const ps = S.people[7];
    S.god.lv = 5; S.memoria.erva.known = S.t; S.memoria.erva.lei = 'livre';
    S.memoria.pend.push({ k: 'visao', q: 'porque', pid: ps.id, part: [S.people[5].id, S.people[6].id], c: {}, t: S.t, until: S.t + 600 });
    S.memoria.erva.rite = { t0: S.t, fire: 0, part: [ps.id], fez: 0, asked: false, on: true };
    S.memoria.fin = { year: 0, on: true, foi: {}, x: 1, y: 1, n: 0, day: S.ck.day };
    S.memoria.corpos.length = 0;
    S.safe = true;
    const q0 = S.stats.respostas;
    M.hourly(S);
    check('com o jogo fechado: a pergunta pendente fica sem resposta (sem contar resposta), o rito e o dia dos mortos em andamento acabam', S.memoria.pend.length === 0 && S.stats.respostas === q0 && S.memoria.erva.rite === null && S.memoria.fin.on === false);
    S.memoria.fin.on = true; S.memoria.fin.x = 1; S.memoria.fin.y = 1;
    check('com o jogo fechado nenhuma tarefa da Memória é dada: want e task devolvem null', M.want(S, ps) === null && ['finados', 'rito', 'cova', 'erva', 'corpo', 'enterrar', 'velar'].every((k) => M.task(S, ps, k) === null) && !M.valid(S, ps, { m: { k: 'rito' } }));
  }
  {
    // --- 11. o corpo achado que ninguém leva: depois de CORPO_MAX_D + 1 dias, enterro sem cerimônia ---
    const S = village(42, 12); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6];
    F.link(S, V, P, 60);
    const d1 = dryFrom(S, 1, 6);
    jump(S, d1, 9);
    kill(S, V);
    const c = V.corpo, t0 = c.t, lim = (C.CORPO_MAX_D + 1) * DAYM;
    S.t = t0 + lim - 60; S.ck = Sim.clock(S.t);
    M.hourly(S);
    check('achado e sem ninguém que o leve, o corpo ainda espera na véspera do prazo', V.corpo === c && c.st === 1 && M.graves(S).length === 0);
    c.by = Q.id; c.res = Q.id; c.resT = S.t;   // alguém o leva neste instante: não enterra no meio da viagem
    Q.act = { type: 'memoria', stage: 'carry', t: 0, score: 90, hint: 'corpo', m: { k: 'corpo', carry: V.id, pid: V.id, x: V.x, y: V.y, r0: 0, r1: 1.2, min: 5, far: 420, walk: 600 } };   // (a vaga só vale com a ação de verdade)
    S.t = t0 + lim; S.ck = Sim.clock(S.t);
    M.hourly(S);
    check('com alguém levando o corpo no prazo, o prazo espera', V.corpo === c && M.graves(S).length === 0);
    c.by = 0; c.res = 0;
    M.hourly(S);
    const o = graveOf(S, V);
    check('passado o prazo (CORPO_MAX_D + 1 dias) e solto o corpo: enterro sem cerimônia, com o nome, sem velório e sem visita', !V.corpo && !!o && o.name === V.name && !o.vel && S.stats.enterros === 1 && S.stats.velorios === 0 && !P.vis && S.memoria.corpos.length === 0, o && JSON.stringify(o));
  }
  {
    // --- 12. as visitas de luto e de aniversário: no 5º, 10º, 15º e 20º dia e a cada ano ---
    const S = village(42, 16); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6], K1 = S.people[7], K2 = S.people[8], K3 = S.people[9], pq = S.people[10], R = S.people[11];
    F.link(S, V, P, 60); K1.mother = V.id; K2.mother = V.id; K3.father = V.id; pq.mother = V.id; setAge(S, K1, 9); setAge(S, K2, 12); setAge(S, K3, 20); setAge(S, pq, 3);
    const d1 = dryFrom(S, 1, 4);
    jump(S, d1, 9); kill(S, V);
    layBody(S, V, Q, 3);
    jump(S, d1 + 1, 7);
    buryBody(S, V, Q);
    const D = d1 + 1, o = graveOf(S, V);
    const kin = [P, K1, K2, K3], ids = (arr) => arr.map((x) => x.id).sort((a, b) => a - b).join();
    const flagAt = (dia) => { for (const q of S.people) delete q.vis; jump(S, D + dia, 6); M.daily(S); return S.people.filter((q) => q.vis); };
    const quem5 = flagAt(5);
    check('no 5º dia do enterro, só os dois mais chegados saem para a cova: o par primeiro, depois o de menor id', quem5.length === 2 && quem5.some((q) => q === P) && ids(quem5) === ids([P, [K1, K2, K3].sort((a, b) => a.id - b.id)[0]]) && quem5.every((q) => q.vis.pid === V.id && q.vis.x === o.x && q.vis.y === o.y && q.vis.d === D + 5), quem5.map((q) => q.name).join());
    check('nos dias 1 a 4, 6 a 9, 11 a 14 e depois do 20º (até um ano) ninguém é chamado', [1, 2, 3, 4, 6, 9, 11, 14, 16, 19, 21, 25, 30, 45, 59, 61].every((dia) => flagAt(dia).length === 0));
    check('nos dias 10, 15 e 20 os dois mais chegados voltam', [10, 15, 20].every((dia) => { const f = flagAt(dia); return f.length === 2 && f.some((q) => q === P); }));
    const ano = flagAt(C.YEAR_DAYS), ano2 = flagAt(2 * C.YEAR_DAYS);
    check('no dia em que faz um ano (e todo ano) a família toda vai: o par e os filhos de 7 anos ou mais; o pequeno (3 anos) e quem não é da família, não', ano.length === 4 && ids(ano) === ids(kin) && ano2.length === 4 && !ano.some((q) => q === pq || q === R || q === Q), ano.map((q) => q.name).join());
    P.vis = { x: 1, y: 1, d: -1, pid: 99 };
    jump(S, D + 5, 6); M.daily(S);
    check('quem já tem uma visita marcada não ganha outra por cima', P.vis.pid === 99 && P.vis.d === -1);
    for (const q of S.people) delete q.vis;
    S.safe = true; jump(S, D + 5, 6); M.daily(S);
    check('com o jogo fechado ninguém é chamado para a cova', S.people.every((q) => !q.vis));
    S.safe = false;
    // a morta de quem ninguém sobrou: sem família viva, ninguém sai
    for (const q of kin) q.alive = false;
    for (const q of S.people) delete q.vis;
    jump(S, D + C.YEAR_DAYS, 6); M.daily(S);
    check('sem família viva ninguém é chamado, nem no aniversário', S.people.every((q) => !q.vis));
    for (const q of kin) q.alive = true;
  }
  {
    // --- 13. o dia dos mortos: no último dia do outono, de tarde, o povo vai junto à cova e acende uma luz em cada uma ---
    const base = (n, mix) => {
      const S = village(42, n || 12); calm(S);
      const V = S.people[4], Q = S.people[6];
      F.link(S, V, S.people[5], 60);
      jump(S, dryFrom(S, 1, 4), 9); kill(S, V); layBody(S, V, Q, 3);
      jump(S, S.ck.day + 1, 7); buryBody(S, V, Q);
      for (const q of S.people) delete q.vis;
      return S;
    };
    const FIN = 44;   // o 44º dia do ano: o último dia do outono (dia 15 da estação 2)
    let S = base();
    jump(S, FIN, 14);
    check('o dia 44 do ano é o último do outono (estação 2, dia 15 dela)', S.ck.season === 2 && S.ck.dos === C.SEASON_DAYS, JSON.stringify(S.ck));
    const grave = M.graves(S)[0], cem = M.cemetery(S), f = S.memoria.fin;
    const before = f.on;
    let att = 0, ligou = null, evs = [];
    run(S, 30, () => {});   // 14h às 15h
    ligou = { on: f.on, hour: S.ck.hour, x: f.x, y: f.y };
    S.events.length = 0;
    evs = run(S, 150, () => { att = Math.max(att, alive(S).filter((q) => doing(q, 'finados')).length); });   // até 17h30
    check('às 15h o dia dos mortos começa no marco do cemitério (antes, não)', before === undefined || before === false ? ligou.on === true && near(ligou.x, cem.x + 1) && near(ligou.y, cem.y + 1) && ligou.hour >= 15 : false, JSON.stringify(ligou));
    check('o povo vai: três ou mais pessoas estão a caminho ou junto ao cemitério às 17h30', att >= 3, att + ' juntos, ' + Object.keys(f.foi || {}).length + ' já contados');
    run(S, 60, () => {});   // até 18h30
    check('quem ficou os FINADOS_MIN minutos conta na lista de quem foi (três ou mais) antes de o dia acabar', f.n >= 3, f.n + ' contados');
    const foi = alive(S).filter((q) => hasMem(q, 'diaDosMortos'));
    check('às 18h acaba: vira número, Crônica e fim, e quem foi guarda a lembrança do dia', f.on === false && S.stats.finados === 1 && chronHas(S, /No último dia do outono/) && foi.length >= 3, S.stats.finados + ' dia(s), ' + foi.length + ' lembram');
    const luz = M.lights(S);
    check('de noite cada cova tem uma vela (até 30), por FINADOS_VELAS_H horas a partir das 18h', luz.length === M.graves(S).length && luz.length >= 1 && luz.every((x) => x.vela === 1) && f.velas === FIN * DAYM + (C.FINADOS_H[1] + C.FINADOS_VELAS_H) * 60, luz.length + ' luzes, velas até ' + f.velas);
    run(S, 720, () => {});   // até a manhã seguinte
    check('passada a noite as velas se apagam', M.lights(S).length === 0 && f.velas < S.t);
    // no mesmo ano não repete; no ano seguinte volta
    jump(S, FIN, 15); S.events.length = 0; M.hourly(S);
    const repetiu = f.on;
    f.on = false;
    jump(S, FIN + C.YEAR_DAYS, 15); M.hourly(S);
    check('só uma vez por ano: no mesmo ano o dia dos mortos não recomeça; no ano seguinte, sim', repetiu === false && f.on === true && f.year === 2, repetiu + ' / ' + f.on);
    // as condições: cova, gente, corpo esperando, tempo
    const nega = (nome, prepara, hora) => {
      const T = base(); prepara(T); jump(T, FIN, hora || 15); M.hourly(T); return !T.memoria.fin.on;
    };
    check('sem nenhuma cova não há dia dos mortos', (() => { const T = village(42, 12); calm(T); jump(T, FIN, 15); M.hourly(T); return !T.memoria.fin.on && T.stats.finados === 0; })());
    check('com menos de ' + C.FINADOS_MIN_POP + ' vivos não há dia dos mortos', nega('pouca gente', (T) => { const v = T.people.filter((p) => p.alive); for (let i = 0; i < v.length - (C.FINADOS_MIN_POP - 1); i++) v[i].alive = false; }));
    check('com um corpo esperando enterro não há dia dos mortos', nega('corpo', (T) => { jump(T, FIN, 14); kill(T, T.people[7]); }));
    check('na nevasca não há dia dos mortos', nega('nevasca', (T) => { T.narr.active.nevasca = { until: T.t + 5 * DAYM }; }));
    check('na tempestade não há dia dos mortos', nega('tempestade', (T) => { T.narr.active.tempestade = { until: T.t + 5 * DAYM }; }));
    check('com o jogo fechado não há dia dos mortos', nega('fechado', (T) => { T.safe = true; }));
    check('só às 15h: às 16h e às 14h, não; e só no último dia do outono (o penúltimo, não)', nega('16h', () => {}, 16) && nega('14h', () => {}, 14) && (() => { const T = base(); jump(T, FIN - 1, 15); M.hourly(T); return !T.memoria.fin.on; })());
    // convivência: o dia dos mortos junto aproxima os povos (uma vez, CONV_FINADOS)
    const T = base(), el = add(T, 'F', 'Ilanê', 30, 'elfo');
    jump(T, FIN, 17.5);
    T.memoria.fin = { year: 1, on: true, foi: {}, x: 1, y: 1, n: 0, day: FIN };
    for (const q of [T.people[5], T.people[6], el]) T.memoria.fin.foi[q.id] = 1;
    const cv0 = Pv.conv(T, 'elfo', 'humano');
    jump(T, FIN, 18); M.hourly(T);
    check('no fim do dia dos mortos com um elfo na roda, elfos e humanos se aproximam CONV_FINADOS', T.stats.finados === 1 && near(Pv.conv(T, 'elfo', 'humano') - cv0, C.CONV_FINADOS, 1e-6), cv0 + ' → ' + Pv.conv(T, 'elfo', 'humano'));
    // menos de 3 que foram: não vale como dia dos mortos
    const U = base();
    jump(U, FIN, 17.5);
    U.memoria.fin = { year: 1, on: true, foi: {}, x: 1, y: 1, n: 0, day: FIN };
    U.memoria.fin.foi[U.people[5].id] = 1; U.memoria.fin.foi[U.people[6].id] = 1;
    jump(U, FIN, 18); M.hourly(U);
    check('se foram menos de 3 pessoas o dia não conta (sem número nem Crônica)', U.stats.finados === 0 && U.memoria.fin.on === false && !chronHas(U, /No último dia do outono/));
  }
  {
    // --- 14. o save no meio do velório: o corpo, as covas (flores, laje, oferenda) e o cemitério vão; o fluxo acaba depois de carregar ---
    const S = village(42, 14); calm(S);
    const V = S.people[4], P = S.people[5], Q = S.people[6], par = S.people[7], Z = add(S, 'M', 'Durgo', 30, 'anao');
    F.link(S, V, P, 60); F.link(S, Z, par, 60);
    const d1 = dryFrom(S, 1, 5);
    jump(S, d1, 8); kill(S, Z); layBody(S, Z, Q, 3);
    jump(S, d1 + 1, 7); buryBody(S, Z, Q);
    const oz = graveOf(S, Z);
    M.done(S, par, { m: M.task(S, par, 'cova'), type: 'memoria', stage: 'stay' });   // a viúva leva flores e uma fruta
    jump(S, d1 + 1, 9); kill(S, V);
    layBody(S, V, Q, 0);
    jump(S, d1 + 1, 17); M.hourly(S);
    M.done(S, P, act(S, P, 'velar'));   // a viúva já velou
    jump(S, d1 + 1, 18);
    const c = V.corpo, cem = M.cemetery(S);
    const S2 = clone(S), V2 = F.person(S2, V.id);
    check('o corpo no meio do velório volta igual (estado, hora do velório, lugar, quem velou, sino) e continua em corpos', !!V2.corpo && JSON.stringify(V2.corpo) === JSON.stringify(c) && S2.memoria.corpos.indexOf(V.id) >= 0 && V2.corpo.st === 2 && V2.corpo.n === 1 && V2.corpo.sino === 1 && M.bodyText(S2, V2) === 'No velório, ao pé do fogo', JSON.stringify(V2.corpo));
    const oz2 = graveOf(S2, Z);
    check('a cova de antes volta com tudo: nome, quem é, hora, rito, velado, laje, flores e oferenda', !!oz2 && ['x', 'y', 'name', 'pid', 't', 'r', 'vel', 'laje', 'fl', 'of'].every((k) => oz2[k] === oz[k]) && oz2.laje === 1 && oz2.fl > 0 && oz2.of > 0 && M.graves(S2).length === M.graves(S).length, JSON.stringify(oz2));
    const cem2 = M.cemetery(S2);
    check('o cemitério volta como obra (tipo, pronto, automático) e é o mesmo marco de memoria.cem', !!cem2 && cem2.id === cem.id && cem2.type === 'cemiterio' && cem2.built && cem2.auto === 1 && S2.memoria.cem === cem.id);
    check('o velório que carregou continua segurando a história da noite e a vela do corpo se acende', M.blockStory(S2) && M.lights(S2).some((x) => x.vela === 1 && near(x.x, V2.x) && near(x.y, V2.y)) && S2.stats.velorios === S.stats.velorios);
    const gs0 = S2.stats.enterros;
    cycle(S2, V2, 3);
    const oV = graveOf(S2, V2);
    check('depois de carregar o povo termina o velório (21h) e enterra de manhã: a cova nasce, com velado, e as estatísticas somam', !!oV && oV.vel === 1 && S2.stats.velorios === 1 && S2.stats.enterros === gs0 + 1 && !V2.corpo && S2.memoria.corpos.length === 0, S2.stats.velorios + ' velórios, ' + S2.stats.enterros + ' enterros');
    // as covas e a erva voltam no mundo regerado
    const e1 = S.memoria.erva.spots, e2 = S2.memoria.erva.spots;
    check('os canteiros da erva voltam iguais e as plantas reaparecem no mundo carregado', JSON.stringify(e1) === JSON.stringify(e2) && e2.every((s) => { const o = W.objAt(S2.world, s[1] * S2.world.W + s[0]); return o && o.k === 'erva'; }));
  }
  {
    // --- 14b. o save com o corpo no colo de alguém: ao carregar a viagem é retomada logo ---
    const S = village(42, 12); calm(S);
    const V = S.people[4];
    jump(S, dryFrom(S, 1, 3), 9);
    put(S, V, walkAt(S, 9, 2));
    kill(S, V);
    for (let i = 0; i < 720 && !(V.corpo && V.corpo.by); i++) { Sim.step(S, 2); calm(S); S.events.length = 0; }
    const t1 = S.t, S2 = clone(S), V2 = F.person(S2, V.id);
    let laid2 = null, laid1 = null;
    for (let i = 0; i < 720 && laid2 === null; i++) { Sim.step(S2, 2); calm(S2); S2.events.length = 0; if (V2.corpo && V2.corpo.st === 2) laid2 = S2.t - t1; }
    for (let i = 0; i < 720 && laid1 === null; i++) { Sim.step(S, 2); calm(S); S.events.length = 0; if (V.corpo && V.corpo.st === 2) laid1 = S.t - t1; }
    check('salvar com o corpo no colo de alguém: ao carregar, o corpo é deitado quase na hora em que seria sem salvar (até 1 hora a mais), e não horas depois', laid1 !== null && laid2 !== null && laid2 <= laid1 + 60, 'sem salvar: ' + laid1 + ' min; carregado: ' + laid2 + ' min');
  }
  // ---------- B. a História de Deus: o que vira conto, quem conta e como o conto muda ----------
  {
    // --- 15. um ato de Deus visto por alguém vira conto ---
    const S = village(42, 12); calm(S);
    S.god.name = 'Tupã';
    const far = S.people[9], pq = S.people[8], carried = S.people[10], campeao = S.people[6];
    setAge(S, pq, 4); put(S, far, farSpot(S, 30)); carried.carriedBy = S.people[3].id; campeao.fe = 99;
    const px = Math.floor(S.camp.x) + 2, py = Math.floor(S.camp.y) + 3;
    S.events.length = 0;
    const c = M.deed(S, 'cura', { a: 'Fulano', sx: 'M', x: px, y: py });
    const viram = S.people.filter((p) => p.contos && p.contos[c.id] === 0), esperados = S.people.filter((p) => p !== far && p !== pq && p !== carried);
    check('um ato visto vira conto: número 1, tipo, tom de cuidado (+1), sem contar nem aumentar ainda, quem foi e onde', !!c && c.id === 1 && c.k === 'cura' && c.tone === 1 && c.mag === 0 && c.gen === 0 && c.n === 0 && c.last === 0 && c.a === 'Fulano' && c.sx === 'M' && c.t === S.t && S.stats.contos === 1 && S.memoria.nc === 2 && S.memoria.kindAt.cura === S.t && S.memoria.contos.length === 1, JSON.stringify(c));
    check('só vê quem está a CONTO_VER passos, tem 5 anos ou mais e não está no colo: o longe, o de 4 anos e o carregado não sabem o conto', viram.length === esperados.length && esperados.every((p) => viram.indexOf(p) >= 0) && !(far.contos && far.contos[c.id] !== undefined) && !(pq.contos && pq.contos[c.id] !== undefined) && !(carried.contos && carried.contos[c.id] !== undefined), viram.length + ' viram, ' + esperados.length + ' esperados');
    check('quem conta o conto "como viu" é a testemunha de mais fé, e o evento do conto sai para a tela', c.w === campeao.name && S.events.some((e) => e.k === 'memoria' && e.ev === 'conto' && e.id === c.id), c.w);
    check('o primeiro conto entra na Crônica com o título e o nome de Deus', chronHas(S, /O povo já tem o que contar de Tupã: “A cura de Fulano”/));
    // (um ano do jogo são 60 dias: em 90 dias todo mundo envelhece um ano e meio)
    check('o mesmo tipo de conto dentro de CONTO_GAP_D dias não nasce de novo (e nada muda); o último instante antes do prazo também não', M.deed(S, 'cura', { a: 'Beltrano', sx: 'M' }) === null && S.stats.contos === 1 && (S.t += C.CONTO_GAP_D * DAYM - 1, M.deed(S, 'cura', { a: 'Beltrano', sx: 'M' }) === null));
    const ch = M.deed(S, 'chuva', {});
    check('outro tipo de conto nasce na hora; sem lugar (x, y), o povo todo viu', !!ch && ch.id === 2 && ch.k === 'chuva' && ch.tone === 1 && S.people.filter((p) => p.contos && p.contos[ch.id] === 0).length === S.people.filter((p) => p.alive && !p.carriedBy && F.age(S, p) >= 5).length && S.people.filter((p) => p.contos && p.contos[ch.id] === 0).indexOf(far) >= 0 && S.stats.contos === 2, JSON.stringify(ch));
    S.t += 1;
    const c2 = M.deed(S, 'cura', { a: 'Beltrano', sx: 'M' });
    check('passado o prazo (CONTO_GAP_D dias) o mesmo tipo volta a virar conto', !!c2 && c2.id === 3 && c2.a === 'Beltrano' && S.stats.contos === 3);
    check('sem testemunha por perto (ninguém a 12 passos do lugar) não há conto, e o tipo fica livre para depois', M.deed(S, 'castigo', { a: 'Sicrano', sx: 'M', x: 4, y: 4 }) === null && S.memoria.kindAt.castigo === undefined && !!M.deed(S, 'castigo', { a: 'Sicrano', sx: 'M' }));
    carried.carriedBy = 0;
    S.safe = true;
    const antes = S.stats.contos;
    check('com o jogo fechado nenhum conto nasce', M.deed(S, 'nome', {}) === null && S.stats.contos === antes && S.memoria.kindAt.nome === undefined);
    S.safe = false;
    check('um tipo que não existe não vira conto', M.deed(S, 'bobagem', {}) === null);
  }
  {
    // --- 16. os atos de Deus que viram conto, pelos ganchos de verdade ---
    const S = village(42, 8);
    S.god.lv = 5; S.god.poder = 20000; S.god.name = 'Tupã';
    const kinds = () => S.memoria.contos.map((c) => c.k).join(',');
    const last = () => S.memoria.contos[S.memoria.contos.length - 1];
    const saudavel = S.people[2], doente = S.people[3];
    saudavel.needs.saude = 90;
    God.cast(S, 'cura', Math.floor(saudavel.x), Math.floor(saudavel.y), true);
    check('curar quem está bem não vira conto', kinds() === '', kinds());
    doente.x = Math.floor(doente.x) + 0.5; doente.y = Math.floor(doente.y) + 0.5; doente.needs.saude = 20;
    God.cast(S, 'cura', Math.floor(doente.x), Math.floor(doente.y), true);
    check('curar quem estava mal (saúde abaixo de CONTO_CURA) vira o conto da cura, com o nome de quem foi curado', kinds() === 'cura' && last().a === doente.name && last().sx === doente.sex, kinds());
    const alvo = S.people[5]; alvo.x = Math.floor(alvo.x) + 0.5; alvo.y = Math.floor(alvo.y) + 0.5;
    God.cast(S, 'raio', Math.floor(alvo.x), Math.floor(alvo.y), true);
    check('o raio em cima de uma pessoa vira o conto do castigo (tom de medo), com o nome dela', /castigo$/.test(kinds()) && last().a === alvo.name && last().tone === -1, kinds());
    S.narr.active.seca = { until: S.t + 1000 };
    God.cast(S, 'chuva', S.camp.x, S.camp.y, true);
    check('a chuva que acaba com a seca vira conto; a chuva sem seca, não', /chuva$/.test(kinds()), kinds());
    delete S.narr.active.seca;
    S.t += 100 * DAYM;
    const n0 = S.memoria.contos.length;
    God.cast(S, 'chuva', S.camp.x, S.camp.y, true);
    check('chuva de céu limpo (sem seca) não vira conto', S.memoria.contos.length === n0);
    S.narr.active.nevasca = { until: S.t + 1000 };
    God.cast(S, 'calor', S.camp.x, S.camp.y, true);
    check('o Calor na nevasca vira o conto do fogo na nevasca', last().k === 'calor');
    delete S.narr.active.nevasca;
    S.narr.ents.push({ id: 99, k: 'lobo', x: S.camp.x + 3.5, y: S.camp.y + 3.5, px: 0, py: 0, dir: 0, walk: 0, path: null, pathI: 0, state: 'rondar', t: 0 });
    God.cast(S, 'raio', S.camp.x + 3, S.camp.y + 3, true);
    S.narr.ents = [];
    check('o raio que abate um lobo vira o conto do raio e da fera (os lobos)', last().k === 'raioFera' && last().x1 === 'lobos', last().k);
    S.god.pending.push({ k: 'nome' }); D.acceptName(S);
    check('aceitar o nome vira o conto do nome, com quem o disse primeiro', last().k === 'nome' && last().w.length > 0, last().k);
    const cand = S.people[6]; cand.fe = 100; cand.born = S.t - 30 * Y;
    D.anoint(S, cand, 'cura');
    check('escolher alguém vira o conto do escolhido, com o nome', last().k === 'escolhido' && last().a === cand.name, last().k);
    const est = build(S, 'estatua', 3);
    D.consecrate(S, est, 'fogo');
    check('consagrar a estátua vira conto', last().k === 'estatua');
    D.createSpecies(S, 'peixe', 'Lumiar');
    check('criar uma espécie vira conto, com o nome dela', last().k === 'especie' && /Lumiar/i.test(last().a || ''), last().a);
    D.grantSaber(S, 'roda');
    check('ensinar um saber ao povo inteiro vira conto, com o saber', last().k === 'saber' && /roda/.test(last().x1), last().x1);
    S.tech.prat.anzol = 2500 * 0.9;
    const sonhador = S.people[7];
    God.cast(S, 'revelacao', Math.floor(sonhador.x), Math.floor(sonhador.y), true);
    check('a revelação em sonho vira o conto do sonho de quem sonhou', last().k === 'sonho' && last().a === sonhador.name, last().k + ' ' + last().a);
    S.povos.st.elfo.cham = 1;
    Pv.onWelcome(S, 'elfo', []);
    check('acolher o povo que Deus chamou vira o conto do chamado, com o povo', last().k === 'chamado' && last().x1 === Pv.DEF.elfo.os, last().k + ' ' + last().x1);
    check('doze tipos de ato, doze contos, cada um com testemunhas e um número a mais na contagem', S.memoria.contos.length === 12 && S.stats.contos === 12 && S.memoria.contos.every((c) => S.people.some((p) => p.contos && p.contos[c.id] === 0)), S.memoria.contos.length);
  }
  {
    // --- 17. a noite de história: quem conta o conto, com que palavras, e como ele muda de boca em boca ---
    const S = village(42, 12); calm(S);
    S.god.name = 'Tupã';
    const DN = D.call(S), chance0 = C.CONTO_CHANCE, deriva0 = C.CONTO_DERIVA;
    const c = M.deed(S, 'cura', { a: 'Fulano', sx: 'M' }), c2 = M.deed(S, 'chuva', {});
    const W1 = S.people[4], q1 = S.people[5], q2 = S.people[6], q3 = S.people[7], bebe = S.people[8], q4 = S.people[9], q5 = S.people[10];
    for (const q of S.people) if (q !== W1) { delete q.contos[c.id]; delete q.contos[c2.id]; }   // só o W1 viu (os outros vão ouvir contar)
    for (const q of [q1, q2, q3, q4, q5]) { q.traits = []; q.fe = 50; }
    setAge(S, bebe, 2);
    S.god.align = 0;
    C.CONTO_CHANCE = 2; C.CONTO_DERIVA = 0;   // sempre conta, e o conto não muda (a chance e a deriva se medem à parte)
    const st = M.storyFor(S, W1);
    check('quem viu conta o conto de que se lembra faz mais tempo (o primeiro, pelo número) em três falas', !!st && st.conto === c.id && st.lines.length === 3);
    check('a primeira fala de quem viu abre com "Eu vi com estes olhos: " e traz o miolo com o nome de Deus', st.lines[0] === 'Eu vi com estes olhos: Fulano estava para morrer, e ' + DN + ' pôs a mão nele. Levantou no mesmo dia.', st.lines[0]);
    check('a fala do meio é de testemunha e a última fecha com a moral do tom de cuidado, com o nome de Deus', ['Eu estava lá.', 'Parece que foi ontem.', 'Quem estava lá lembra.'].indexOf(st.lines[1]) >= 0 && ['Por isso ninguém aqui dorme com medo.', DN + ' cuida de nós.', 'Quem tem ' + DN + ' não está sozinho.'].indexOf(st.lines[2]) >= 0, st.lines[1] + ' / ' + st.lines[2]);
    M.onStory(S, W1, { conto: c.id }, [q1, q2, q3, bebe]);
    check('o conto contado: conta uma vez, guarda a hora e vira número; quem viu contar sem ter visto não é recontar', c.n === 1 && c.last === S.t && S.stats.contados === 1 && S.stats.recontos === 0 && chronHas(S, new RegExp('Pela primeira vez, ' + W1.name + ' contou ao pé do fogo um feito de ' + DN)));
    check('quem ouviu passa a saber o conto, uma geração depois de quem contou (1); o de 2 anos ainda não entende', q1.contos[c.id] === 1 && q2.contos[c.id] === 1 && q3.contos[c.id] === 1 && !(bebe.contos && bebe.contos[c.id] !== undefined) && c.gen === 1);
    check('ouvir um conto de cuidado dá CONTO_FE de fé; o de medo, menos (60%) e deixa o susto; o de espanto, 60%', near(q1.fe - 50, C.CONTO_FE, 1e-9));
    const cm = M.deed(S, 'castigo', { a: 'Sicrano', sx: 'M' }), cn = M.deed(S, 'nome', {});
    q4.fe = 50; q5.fe = 50;
    M.onStory(S, W1, { conto: cm.id }, [q4]);
    M.onStory(S, W1, { conto: cn.id }, [q5]);
    check('o conto de medo dá 60% da fé e a lembrança "contoMedo"; o de espanto (tom 0), 60% sem o susto', near(q4.fe - 50, C.CONTO_FE * 0.6, 1e-9) && hasMem(q4, 'contoMedo') && near(q5.fe - 50, C.CONTO_FE * 0.6, 1e-9) && !hasMem(q5, 'contoMedo'));
    // quem ouviu conta, e conta como "me contaram"; o neto, como "os antigos"
    const s1 = M.storyFor(S, q1);
    check('quem só ouviu (geração 1) abre como "me contaram" e a fala do meio diz que ouviu', !!s1 && ['Minha mãe contava que ', 'Meu pai contava que ', 'Quem me contou viu: '].some((o) => s1.lines[0].indexOf(o) === 0) && ['Eu era criança quando ouvi.', 'Contaram pra mim, eu conto pra vocês.', 'Foi antes de vocês nascerem.'].indexOf(s1.lines[1]) >= 0, s1 && s1.lines[0]);
    M.onStory(S, q1, { conto: s1.conto }, [q4]);
    check('o recontar conta nos recontos, e o neto do conto (geração 2) sabe que veio de longe', S.stats.recontos === 1 && q4.contos[s1.conto] === 2 && conto_gen(S, s1.conto) === 2);
    const s2 = M.storyFor(S, q4);
    check('quem aprendeu de quem aprendeu (geração 2) abre como os antigos', !!s2 && ['Dizem os antigos que ', 'Contam que ', 'Os antigos juram que '].some((o) => s2.lines[0].indexOf(o) === 0) && ['Faz tanto tempo que ninguém sabe o ano.', 'Assim me contaram.', 'É mais velho que a aldeia.'].indexOf(s2.lines[1]) >= 0, s2 && s2.lines[0]);
    // qual conto: o que faz mais tempo que não se ouve
    const a1 = M.storyFor(S, W1).conto;
    M.onStory(S, W1, { conto: a1 }, []);
    const a2 = M.storyFor(S, W1).conto;
    check('o conto contado agora vai para o fim da fila: o próximo a contar é outro, o que há mais tempo não se ouve', a1 !== a2 && S.memoria.contos.find((x) => x.id === a2).last <= S.memoria.contos.find((x) => x.id === a1).last);
    check('quem não sabe nenhum conto (o de 2 anos) não conta', M.storyFor(S, bebe) === null && !!M.storyFor(S, W1));
    // a chance: no dia comum, 40%; no dia dos mortos a noite é dos contos
    C.CONTO_CHANCE = chance0;
    let n = 0; for (let i = 0; i < 3000; i++) if (M.storyFor(S, W1)) n++;
    check('numa noite de história comum, quem sabe um conto o conta com chance CONTO_CHANCE (40%)', n / 3000 > 0.35 && n / 3000 < 0.45, (n / 30).toFixed(1) + '%');
    C.CONTO_CHANCE = 0;
    const nunca = !M.storyFor(S, W1);
    S.memoria.fin.day = S.ck.day;
    const sempre = !!M.storyFor(S, W1);
    S.memoria.fin.day = -1;
    check('no dia dos mortos a noite é dos contos: conta mesmo com chance zero; no dia comum, com chance zero, nunca', nunca && sempre);
    C.CONTO_CHANCE = 2;
    // a deriva: quem viu não muda; quem só ouviu aumenta, ou puxa para o jeito como o povo vê Deus
    C.CONTO_DERIVA = 2;
    const m0 = c.mag, t0 = c.tone, r0 = S.stats.recontos;
    for (let i = 0; i < 40; i++) M.onStory(S, W1, { conto: c.id }, []);
    check('quem viu (geração 0) conta sempre igual: o conto não aumenta nem muda de tom, nem conta como reconto', c.mag === m0 && c.tone === t0 && S.stats.recontos === r0, 'mag ' + c.mag + ', tom ' + c.tone);
    C.CONTO_DERIVA = deriva0;
    const nm = M.deed(S, 'nome', {}) || cn;
    q1.contos[cn.id] = 1;
    const reconta = (alinha, ptraits, sorteio) => { S.god.align = alinha; q1.traits = ptraits; return withRng(S, sorteio, () => M.onStory(S, q1, { conto: cn.id }, [])); };
    cn.mag = 2; cn.tone = 0;
    reconta(0, [], [0.9]);
    check('o sorteio manda: sem deriva (sorteio de 0,9, acima de CONTO_DERIVA) o conto fica como está', cn.mag === 2 && cn.tone === 0);
    cn.mag = 0; cn.tone = 0;
    reconta(0, [], [0.1, 0.1]);
    const aumentou = cn.mag === 1;
    reconta(0, [], [0.1, 0.1]);
    const aumentou2 = cn.mag === 2;
    reconta(0, [], [0.1, 0.1]);
    check('a deriva aumenta o conto um degrau por vez (mag 0, 1, 2) e para no máximo', aumentou && aumentou2 && cn.mag === 2 && cn.tone === 0);
    reconta(20, [], [0.1, 0.9]);
    const luz = cn.tone === 1;
    reconta(20, [], [0.1, 0.9]);
    check('quando Deus é visto como bom (alinhamento 15 ou mais) o conto de espanto puxa para o cuidado e para aí (tom 1)', luz && cn.tone === 1 && cn.mag === 2);
    reconta(-20, [], [0.1, 0.9]); reconta(-20, [], [0.1, 0.9]);
    const medo = cn.tone === -1;
    reconta(-20, [], [0.1, 0.9]);
    check('quando Deus é visto como duro (alinhamento -15 ou menos) o conto puxa para o medo, e para em -1', medo && cn.tone === -1);
    cn.tone = 0; cn.mag = 2;
    reconta(0, ['Pessimista'], [0.1, 0.9]);
    const pess = cn.tone === -1;
    cn.tone = 0;
    reconta(0, ['Otimista'], [0.1, 0.9]);
    const otim = cn.tone === 1;
    cn.tone = 0;
    reconta(0, [], [0.1, 0.9]);
    check('sem peso do alinhamento, o jeito de quem conta pesa: o pessimista leva ao medo, o otimista ao cuidado, os outros não mexem no tom', pess && otim && cn.tone === 0);
    // qualquer que seja o caminho, o conto fica em seus limites
    let ok2 = true;
    for (let i = 0; i < 400 && ok2; i++) {
      S.god.align = [-30, 0, 30][i % 3]; q1.traits = [[], ['Pessimista'], ['Otimista']][i % 5 % 3];
      M.onStory(S, q1, { conto: cn.id }, []);
      ok2 = cn.mag >= 0 && cn.mag <= 2 && cn.tone >= -1 && cn.tone <= 1 && Number.isInteger(cn.mag) && Number.isInteger(cn.tone);
    }
    check('em 400 recontos o conto nunca sai dos limites: aumento de 0 a 2 e tom de -1 a 1', ok2, 'mag ' + cn.mag + ', tom ' + cn.tone);
    C.CONTO_CHANCE = chance0; C.CONTO_DERIVA = deriva0;
  }
  {
    // --- 17b. todo conto de todo tipo se conta, em todo tamanho, com todo tom e geração, sem buraco no texto ---
    const S = village(42, 10); calm(S);
    S.god.name = 'Tupã';
    const dados = { cura: { a: 'Maíra', sx: 'F' }, chuva: {}, calor: {}, raioFera: { x1: 'onca' }, castigo: { a: 'Kauã', sx: 'M' }, sonho: { a: 'Maíra', sx: 'F', x1: 'anzol' }, nome: {}, escolhido: { a: 'Kauã', sx: 'M' },
      estatua: {}, especie: { a: 'a capivara-azul' }, saber: { x1: 'a roda' }, chamado: { x1: 'os elfos' }, visao: { a: 'Maíra', sx: 'F', r: 'Para não ficar só.' }, silencio: { a: 'Kauã', sx: 'M' }, promessa: { r: 1 } };
    for (const k in dados) M.deed(S, k, dados[k]);
    S.t += C.CONTO_GAP_D * DAYM + 1;
    const quebrada = M.deed(S, 'promessa', { r: 0 }), lobos = M.deed(S, 'raioFera', { x1: 'lobos' });
    const bad = /undefined|NaN|\[object|null/;
    let ruins = [], total = 0;
    for (const c of S.memoria.contos) for (let mag = 0; mag <= 2; mag++) for (let tone = -1; tone <= 1; tone++) {
      c.mag = mag; c.tone = tone;
      const info = M.contosInfo(S).find((x) => x.id === c.id);
      total++;
      const txt = [info.titulo, info.fato].concat(info.conta).join(' | ');
      if (bad.test(txt) || info.conta.length !== 3 || !info.titulo || !info.fato) ruins.push(c.k + ' ' + mag + ' ' + tone + ': ' + txt.slice(0, 80));
    }
    check('os ' + S.memoria.contos.length + ' contos (15 tipos, a promessa quebrada e o raio nos lobos) em 3 tamanhos e 3 tons têm título, fato e três falas inteiras, sem "undefined"', total === S.memoria.contos.length * 9 && S.memoria.contos.length >= 17 && ruins.length === 0, ruins[0] || total + ' combinações');
    check('a promessa cumprida e a quebrada têm títulos e fatos diferentes', (() => { const a = M.contosInfo(S); const ok1 = a.find((x) => x.id === S.memoria.contos.find((c) => c.k === 'promessa' && c.r === 1).id), ko = a.find((x) => x.id === quebrada.id); return ok1.titulo === 'A promessa cumprida' && ko.titulo === 'A promessa quebrada' && ok1.fato !== ko.fato; })());
  }
  {
    // --- 17d. o tom com que o conto nasce: o do ato; o ato sem tom próprio pega o de como o povo vê Deus ---
    const S = village(42, 10); calm(S);
    S.god.name = 'Tupã';
    const nasce = (al, k, d) => { S.god.align = al; S.t += C.CONTO_GAP_D * DAYM + 1; const c = M.deed(S, k, d || {}); return c ? c.tone : 'nada'; };
    const t = [nasce(0, 'raioFera', { x1: 'lobos' }), nasce(C.CONTO_TOM_ALIGN - 1, 'nome'), nasce(-C.CONTO_TOM_ALIGN + 1, 'estatua')];
    check('com o povo sem lado (alinhamento abaixo de ' + C.CONTO_TOM_ALIGN + ' para os dois lados), o raio na fera, o nome e a estátua nascem contos de espanto', t.join() === '0,0,0', t.join());
    const b = [nasce(C.CONTO_TOM_ALIGN, 'raioFera', { x1: 'onca' }), nasce(80, 'nome'), nasce(80, 'escolhido', { a: 'Kauã', sx: 'M' }), nasce(80, 'chamado', { x1: 'os elfos' })];
    check('com um Deus bondoso, os mesmos atos nascem contos de cuidado', b.join() === '1,1,1,1', b.join());
    const f = [nasce(-C.CONTO_TOM_ALIGN, 'raioFera', { x1: 'lobos' }), nasce(-80, 'nome'), nasce(-80, 'estatua')];
    check('com um Deus temido, nascem contos de medo', f.join() === '-1,-1,-1', f.join());
    const fixo = [nasce(-80, 'cura', { a: 'Maíra', sx: 'F' }), nasce(-80, 'chuva'), nasce(80, 'castigo', { a: 'Kauã', sx: 'M' }), nasce(80, 'silencio', { a: 'Kauã', sx: 'M' })];
    check('o ato que tem tom próprio não muda: a cura e a chuva são de cuidado mesmo com um Deus temido; o castigo e o silêncio, de medo mesmo com um Deus bondoso', fixo.join() === '1,1,-1,-1', fixo.join());
    S.god.align = 80; S.t += C.CONTO_GAP_D * DAYM + 1;
    S.memoria.pend.push({ k: 'visao', q: 'porque', pid: S.people[2].id, part: [S.people[2].id, S.people[3].id], c: {}, t: S.t, until: S.t + 600 });
    M.answer(S, 2);
    const cv = S.memoria.contos.filter((c) => c.k === 'visao').pop();
    check('a resposta do rito fica com o tom da resposta (a de medo é de medo, mesmo com um Deus bondoso)', !!cv && cv.tone === -1, cv ? cv.tone : 'sem conto');
    // quem vê também guarda: a criança que estava lá conta o tom do ato, como conta o do conto que ouve
    const S2 = village(42, 10); calm(S2); S2.god.name = 'Tupã'; S2.god.align = 0;
    const k6 = S2.people[5], k4 = S2.people[6], k12 = S2.people[7], kc = S2.people[8];
    for (const [q, a] of [[k6, 6], [k4, 4], [k12, C.CRIADO_AGE], [kc, 8]]) { setAge(S2, q, a); q.carriedBy = 0; delete q.ouviu; delete q.criado; }
    kc.criado = 'confiante';
    M.deed(S2, 'castigo', { a: 'Kauã', sx: 'M' }); M.deed(S2, 'cura', { a: 'Maíra', sx: 'F' }); M.deed(S2, 'nome', {});
    check('a criança de 6 anos que vê o castigo e a cura guarda um de medo e um de cuidado (o conto de espanto não pesa); a de 4 não é testemunha, a de ' + C.CRIADO_AGE + ' já passou da idade e a que já foi criada não muda',
      !!k6.ouviu && k6.ouviu[0] === 1 && k6.ouviu[1] === 1 && !k4.ouviu && !k12.ouviu && !kc.ouviu, JSON.stringify([k6.ouviu, k4.ouviu, k12.ouviu, kc.ouviu]));
    S2.t += C.CONTO_GAP_D * DAYM + 1;
    S2.memoria.pend.push({ k: 'visao', q: 'porque', pid: S2.people[2].id, part: [S2.people[2].id, S2.people[3].id], c: {}, t: S2.t, until: S2.t + 600 });
    M.answer(S2, 0);
    check('a resposta de cuidado no rito conta como cuidado para a criança que viu', k6.ouviu[1] === 2 && k6.ouviu[0] === 1, JSON.stringify(k6.ouviu));
  }
  {
    // --- 18. a criança que cresce ouvindo: contos de medo, de cuidado, ou os dois ---
    const S = village(42, 18); calm(S);
    S.god.name = 'Tupã';
    const contador = S.people[4];
    const cf = M.deed(S, 'castigo', { a: 'X', sx: 'M' }), cc = M.deed(S, 'cura', { a: 'Y', sx: 'M' }), cn = M.deed(S, 'nome', {});
    const ouve = (k, n, conto) => { for (let i = 0; i < n; i++) M.onStory(S, contador, { conto: conto.id }, [k]); };
    const kids = []; for (let i = 5; i <= 13; i++) { const q = S.people[i]; setAge(S, q, 8); q.traits = []; q.fe = 60; kids.push(q); }
    const [kT, kC, kL, kB, kM, kN, kU, kA, kV] = kids;
    ouve(kT, C.CRIADO_MIN, cf);                                    // 4 de medo
    ouve(kC, C.CRIADO_MIN, cc);                                    // 4 de cuidado
    ouve(kL, 5, cf); ouve(kL, 4, cc);                              // 5 e 4: nenhum é metade a mais que o outro
    ouve(kB, 6, cf); ouve(kB, 4, cc);                              // 6 e 4: exatamente 1,5 vez
    ouve(kM, C.CRIADO_MIN - 1, cf);                                // 3: pouco
    ouve(kN, 10, cn);                                              // contos de espanto não pesam
    check('quem ouve conto de medo ou de cuidado (8 anos) guarda a conta [medo, cuidado]; o conto de espanto não conta', kT.ouviu[0] === C.CRIADO_MIN && kT.ouviu[1] === 0 && kC.ouviu[1] === C.CRIADO_MIN && kN.ouviu === undefined && kL.ouviu[0] === 5 && kL.ouviu[1] === 4);
    const ang = S.people[14], teen = S.people[3];
    setAge(S, ang, 12); setAge(S, teen, 2); delete teen.contos[cf.id];
    ouve(ang, 5, cf); ouve(teen, 5, cf);
    check('com 12 anos já não se cria pelos contos, e com menos de 3 nem se aprende o conto', !ang.ouviu && !(teen.contos && teen.contos[cf.id] !== undefined) && !teen.ouviu);
    setAge(S, kU, C.CRIADO_AGE - 1); ouve(kU, 6, cf);
    M.daily(S);
    check('antes do fim da infância (CRIADO_AGE, ' + C.CRIADO_AGE + ' anos) ninguém é marcado: nem quem tem 8, nem quem tem 11', kU.criado === undefined && !!kU.ouviu && kT.criado === undefined && !!kT.ouviu && kC.criado === undefined && S.stats.criados === undefined);
    for (const q of [kT, kC, kL, kB, kM, kN]) setAge(S, q, C.CRIADO_AGE);
    M.daily(S);
    check('aos 12 anos o que se ouviu deixa marca: antes (11 anos) não', kU.criado === undefined && !!kU.ouviu && kT.criado === 'temente' && !kT.ouviu && kC.criado === 'confiante');
    check('meio a meio ou pouco conto, a criança fica livre; 6 contra 4 (a conta exata de 1,5 vez) já é temente', kL.criado === 'livre' && kM.criado === 'livre' && kN.criado === undefined && kB.criado === 'temente', [kL, kM, kN, kB].map((q) => q.criado).join());
    setAge(S, kU, C.CRIADO_AGE); M.daily(S);
    check('quando faz 12 anos a criança que vinha ouvindo medo fica temente', kU.criado === 'temente');
    check('só quem ficou temente ou confiante conta como criado (quatro: kT, kC, kB e kU), e a Crônica conta o primeiro', S.stats.criados === 4 && chronHas(S, /cresceu entre contos de medo, e ficou temente a Tupã\. O que a criança vê e ouve de Tupã fica nela\./), S.stats.criados);
    const cr = S.people[15]; setAge(S, cr, 9); cr.criado = 'temente'; cr.ouviu = [9, 0];
    ouve(cr, 3, cc);
    M.daily(S);
    check('quem já foi criado não é criado de novo nem muda com o que ouve depois', cr.criado === 'temente' && cr.ouviu[0] === 9 && cr.ouviu[1] === 0 && S.stats.criados === 4);
    check('o humor da criança: temente -3, confiante +3, livre 0 (CRIADO_HUMOR)', M.mood(kT) === -C.CRIADO_HUMOR && M.mood(kC) === C.CRIADO_HUMOR && M.mood(kL) === 0 && M.mood({}) === 0);
    check('a fé de equilíbrio: o temente não esfria de ' + C.TEMENTE_FE + ', o confiante esfria até 10 acima do comum, o livre segue o comum', M.feAlvo(kT, 35) === C.TEMENTE_FE && M.feAlvo(kT, 70) === 70 && M.feAlvo(kT, 90) === 90 && M.feAlvo(kC, 35) === 35 + C.CONFIANTE_FE && M.feAlvo(kL, 35) === 35);
    // na prática: a fé esfria dia a dia até o alvo de cada um; o temente obedece mais; o confiante ganha fé 20% mais depressa
    for (const q of [kT, kC, kL]) q.fe = 95;
    for (let i = 0; i < 90; i++) God.daily(S);
    check('depois de 90 dias sem sinal de Deus, a fé do temente para em 50, a do confiante em 45 e a do livre em 35', near(kT.fe, 50, 1e-6) && near(kC.fe, 45, 1e-6) && near(kL.fe, 35, 1e-6), [kT.fe, kC.fe, kL.fe].map((x) => +x.toFixed(2)).join('/'));
    kT.fe = kL.fe = 60;
    const oT = God.obedience(S, kT), oL = God.obedience(S, kL);
    check('o temente obedece TEMENTE_OBED a mais que o livre, com a mesma fé', near(oT - oL, C.TEMENTE_OBED, 1e-9), oT.toFixed(3) + ' x ' + oL.toFixed(3));
    kC.fe = kL.fe = 50; S.god.align = 0;
    God.faith(S, kC, 10); God.faith(S, kL, 10);
    check('o confiante ganha fé CONFIANTE_GANHO (20%) mais depressa: +12 onde o livre ganha +10', near(kC.fe - 50, 10 * C.CONFIANTE_GANHO, 1e-9) && near(kL.fe - 50, 10, 1e-9), (kC.fe - 50) + ' x ' + (kL.fe - 50));
    // no humor de verdade: a hora que passa soma o humor da criação
    for (const q of [kT, kC, kL]) { q.mem = []; q.traits = []; q.needs.fome = q.needs.sede = q.needs.calor = q.needs.energia = q.needs.social = 90; q.needs.saude = 100; }
    S.t = Math.floor(S.t / DAYM) * DAYM + 11 * 60 - 2; S.ck = Sim.clock(S.t);
    Sim.step(S, 2);
    check('na hora cheia o humor do temente fica 6 abaixo do confiante (-3 e +3 em volta do livre)', kT.mood === kL.mood - C.CRIADO_HUMOR && kC.mood === kL.mood + C.CRIADO_HUMOR, [kT.mood, kL.mood, kC.mood].join('/'));
  }
  {
    // --- 19. a tela "O que contam de você" e o limite de contos guardados ---
    const S = village(42, 12); calm(S);
    S.god.name = 'Tupã';
    const c1 = M.deed(S, 'cura', { a: 'Fulano', sx: 'M' });
    S.t += 5 * DAYM;
    const c2 = M.deed(S, 'chuva', {});
    let info = M.contosInfo(S);
    const n = alive(S).length, i1 = info[1];
    check('a lista vem do conto mais novo ao mais velho', info.length === 2 && info[0].id === c2.id && info[1].id === c1.id);
    check('cada conto traz título, o fato (o que de fato se passou), a data, quantos contaram, quantos sabem e quantos viram, a geração, o tom e o tamanho', i1.titulo === 'A cura de Fulano' && i1.fato === 'Você curou Fulano, que estava mal.' && i1.quando === Sim.dateText(c1.t) && i1.n === 0 && i1.sabem === n && i1.viram === n && i1.gen === 0 && i1.minGen === 0 && i1.tone === 1 && i1.mag === 0 && i1.perdido === false && i1.conta.length === 3 && i1.conta[0].indexOf('Eu vi com estes olhos: ') === 0, JSON.stringify(Object.assign({}, i1, { conta: '…' })));
    // alguém que só ouviu: a geração mais longe de quem viu é a que a tela mostra
    const q = S.people[5]; delete q.contos[c1.id];
    M.onStory(S, S.people[4], { conto: c1.id }, [q]);
    info = M.contosInfo(S);
    const i1b = info.find((x) => x.id === c1.id);
    check('com um ouvinte que não viu, a tela conta como o povo conta hoje (geração 1: "me contaram"), mostra de quantos se sabe e quantos viram', i1b.gen === 1 && i1b.minGen === 0 && i1b.n === 1 && i1b.sabem === n && i1b.viram === n - 1 && /^(Minha mãe contava que |Meu pai contava que |Quem me contou viu: )/.test(i1b.conta[0]), i1b.conta[0].slice(0, 30));
    // morreram todos os que sabiam: o conto está perdido (a tela ainda o lista)
    for (const p of S.people) if (p.contos) delete p.contos[c2.id];
    info = M.contosInfo(S);
    const i2 = info.find((x) => x.id === c2.id);
    check('se ninguém vivo sabe o conto ele está perdido: sabem 0, viram 0, e a tela ainda o lista', i2.perdido === true && i2.sabem === 0 && i2.viram === 0 && i2.gen === c2.gen);
    S.people.filter((p) => p.contos && p.contos[c1.id] === 0).forEach((p) => { p.alive = false; });
    info = M.contosInfo(S);
    check('quem morreu não conta como quem sabe: só ficam os que ouviram', info.find((x) => x.id === c1.id).viram === 0 && info.find((x) => x.id === c1.id).sabem === 1 && info.find((x) => x.id === c1.id).perdido === false);
    for (const p of S.people) p.alive = true;
  }
  {
    // --- 19b. passou de CONTO_MAX contos: saem primeiro os que ninguém sabe, depois os mais antigos ---
    const S = village(42, 12); calm(S);
    S.god.name = 'Tupã';
    const kinds = ['cura', 'chuva', 'calor', 'raioFera', 'castigo', 'sonho', 'nome', 'escolhido', 'estatua', 'especie', 'saber', 'chamado', 'visao', 'silencio', 'promessa'];
    for (const k of kinds) M.deed(S, k, { a: 'Maíra', sx: 'F', x1: 'lobos', r: 'Sim.' });
    const ids = S.memoria.contos.map((c) => c.id);
    check('quinze tipos de conto cabem, sem corte', S.memoria.contos.length === 15 && C.CONTO_MAX === 18 && S.stats.contos === 15);
    const esquecido = ids[2];
    for (const p of S.people) delete p.contos[esquecido];   // ninguém mais sabe o terceiro
    S.t += C.CONTO_GAP_D * DAYM + 1;
    for (const k of ['cura', 'chuva', 'calor']) M.deed(S, k, { a: 'Maíra', sx: 'F' });
    check('com 18 contos ainda cabe', S.memoria.contos.length === C.CONTO_MAX && S.stats.contos === 18 && S.memoria.contos.some((c) => c.id === esquecido));
    M.deed(S, 'raioFera', { x1: 'onca' });
    check('o 19º conto empurra para fora o que ninguém mais sabe (o terceiro), não o mais antigo', S.memoria.contos.length === C.CONTO_MAX && !S.memoria.contos.some((c) => c.id === esquecido) && S.memoria.contos.some((c) => c.id === ids[0]) && S.stats.contos === 19, S.memoria.contos.map((c) => c.id).join());
    M.deed(S, 'castigo', { a: 'Kauã', sx: 'M' });
    check('o 20º, com todos sabidos, empurra para fora o mais antigo, e quem o sabia o esquece (fora da lista de cada pessoa)', S.memoria.contos.length === C.CONTO_MAX && !S.memoria.contos.some((c) => c.id === ids[0]) && S.people.every((p) => !p.contos || p.contos[ids[0]] === undefined) && S.stats.contos === 20);
  }
  {
    // --- 20. a noite de história de verdade: o conto de Deus entra na roda e passa de boca em boca ---
    const S = village(42, 10); calm(S);
    S.god.name = 'Tupã';
    const chance0 = C.CONTO_CHANCE;
    C.CONTO_CHANCE = 2;
    const c = M.deed(S, 'cura', { a: 'Fulano', sx: 'M' });
    for (const p of S.people) if (p.id !== S.people[4].id) delete p.contos[c.id];   // só o 4 viu
    const W1 = S.people[4], q1 = S.people[5], q2 = S.people[6], fogo = L.campFire(S, true);
    const st = L.startStory(S, W1, fogo);
    check('quem sabe um conto de Deus o conta na noite de história: a história é o conto (conto = número) e as falas são as dele', st.conto === c.id && st.lines.length === 3 && st.lines[0].indexOf('Eu vi com estes olhos: ') === 0 && /Fulano/.test(st.lines[0]), st.conto + ' ' + st.lines[0].slice(0, 40));
    st.heard[q1.id] = 20; st.heard[q2.id] = 10;
    const s0 = S.stats.stories;
    L.endStory(S, W1, true);
    check('ao fim, quem ouviu 15 minutos ou mais passa a saber o conto (geração 1) e quem ouviu menos, não; conta como história, e como conto contado', q1.contos[c.id] === 1 && q2.contos[c.id] === undefined && S.stats.contados === 1 && S.stats.stories === s0 + 1 && c.n === 1);
    C.CONTO_CHANCE = chance0;
    // sem conto de Deus, a história é a de sempre (a lenda ou a lembrança)
    const T2 = village(42, 10); calm(T2);
    const st2 = L.startStory(T2, T2.people[4], L.campFire(T2, true));
    check('sem conto de Deus a história é a de sempre (conto 0)', st2.conto === 0);
    // numa aldeia viva, com todo mundo sabendo o conto, em até 8 noites alguém conta
    const U = village(42, 10); calm(U);
    U.god.name = 'Tupã';
    C.CONTO_CHANCE = 2;
    const cu = M.deed(U, 'cura', { a: 'Fulano', sx: 'M' });
    let dia1 = 0;
    run(U, 720 * 8, () => { if (!dia1 && U.stats.contados) dia1 = U.ck.day; });
    C.CONTO_CHANCE = chance0;
    check('numa aldeia viva, onde todos sabem um conto, em até 8 noites alguém o conta ao pé do fogo (e quem ouviu fica com mais fé)', U.stats.contados >= 1 && cu.n >= 1 && U.stats.stories >= U.stats.contados, U.stats.contados + ' contados em ' + U.stats.stories + ' histórias, o primeiro no dia ' + dia1);
  }
  // ---------- C. a erva-do-sonho e o rito ----------
  {
    // --- 21. os canteiros: sempre os mesmos em cada mundo, na mata úmida, a uma boa caminhada do acampamento ---
    const seeds = [42, 777, 9001], mundos = seeds.map((s) => newWorld(s)), outros = seeds.map((s) => newWorld(s));
    const dd = (S, s) => Math.hypot(s[0] - S.camp.x, s[1] - S.camp.y);
    const molhado = (S, s) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (G.IS_WATER[S.world.tile[(s[1] + dy) * S.world.W + s[0] + dx]]) return true; return false; };
    check('cada mundo tem ' + C.ERVA_SPOTS + ' canteiros (ERVA_SPOTS), na mata, a ' + C.ERVA_DIST[0] + ' a ' + C.ERVA_DIST[1] + ' passos do acampamento', mundos.every((S) => { const sp = S.memoria.erva.spots; return sp.length === C.ERVA_SPOTS && sp.every((s) => S.world.tile[s[1] * S.world.W + s[0]] === G.T.FOREST && dd(S, s) >= C.ERVA_DIST[0] && dd(S, s) <= C.ERVA_DIST[1]); }), mundos.map((S) => S.memoria.erva.spots.map((s) => dd(S, s).toFixed(0)).join('/')).join(' · '));
    check('os canteiros são da mata úmida (água a até 2 passos) e ficam a 8 passos ou mais um do outro', mundos.every((S) => { const sp = S.memoria.erva.spots; return sp.every((s) => molhado(S, s)) && sp.every((s, i) => sp.every((z, j) => i === j || Math.hypot(s[0] - z[0], s[1] - z[1]) >= 8)); }));
    check('o mesmo mundo dá sempre os mesmos canteiros, e mundos diferentes dão canteiros diferentes', mundos.every((S, i) => JSON.stringify(S.memoria.erva.spots) === JSON.stringify(outros[i].memoria.erva.spots)) && new Set(mundos.map((S) => JSON.stringify(S.memoria.erva.spots))).size === 3);
    check('em cada canteiro há uma planta (objeto "erva") no mundo', mundos.every((S) => S.memoria.erva.spots.every((s) => { const o = W.objAt(S.world, s[1] * S.world.W + s[0]); return !!o && o.k === 'erva'; })));
    const S = mundos[0], s0 = JSON.stringify(S.memoria.erva.spots), r0 = S.rng.s;
    M.init(S); M.init(S);
    check('chamar M.init de novo não muda os canteiros, não mexe no sorteio do jogo e não repete as plantas', JSON.stringify(S.memoria.erva.spots) === s0 && S.rng.s === r0 && S.world.objs.filter((o) => o.k === 'erva').length === C.ERVA_SPOTS, S.rng.s + ' / ' + r0);
    // (o save e o carregar dos canteiros e das plantas: item 14, mais acima)
  }
  {
    // --- 22. a descoberta: só com Deus no nível ERVA_LV, por quem tem 14 anos ou mais e passa a ERVA_VER passos de um canteiro ---
    const mk = (lv) => { const S = village(42, 12); calm(S); S.god.lv = lv; S.god.name = 'Tupã'; S.god.align = 0; return S; };
    // põe a pessoa a d passos (de lado) do centro do canteiro i
    const perto = (S, p, i, d) => { const s = S.memoria.erva.spots[i]; p.x = s[0] + 0.5 + d; p.y = s[1] + 0.5; p.px = p.x; p.py = p.y; p.act = null; p.path = null; };
    const achou = (S) => S.memoria.erva.known > 0;
    {
      const S = mk(1), p = S.people[4];
      perto(S, p, 0, 0.5);
      M.hourly(S);
      check('com Deus no nível 1 ninguém acha a erva, mesmo parado em cima dela', !achou(S) && !M.pending(S) && !chronHas(S, /erva/));
    }
    {
      const S = mk(C.ERVA_LV), kid = S.people[4], e = S.memoria.erva;
      setAge(S, kid, 13.5);
      perto(S, kid, 1, 1);
      M.hourly(S);
      check('com 13 anos não se acha a erva', !achou(S) && !M.pending(S));
      setAge(S, kid, 14);
      M.hourly(S);
      check('com 14 anos se acha: o dia e o achador ficam guardados, a Crônica conta e o achador guarda a viagem', e.known === S.t && !!M.pending(S) && M.pending(S).pid === kid.id && chronHas(S, new RegExp(kid.name + ' achou na mata uma erva de cheiro forte')) && hasMem(kid, 'viagem'), JSON.stringify(M.pending(S)));
      const S2 = mk(C.ERVA_LV), q2 = S2.people[5];
      perto(S2, q2, 2, C.ERVA_VER + 0.2);
      M.hourly(S2);
      check('a mais de ERVA_VER (4) passos do canteiro ninguém acha', !achou(S2) && !M.pending(S2), 'a ' + (C.ERVA_VER + 0.2) + ' passos');
      perto(S2, q2, 2, C.ERVA_VER - 0.1);
      M.hourly(S2);
      check('a menos de ERVA_VER passos acha (a conta é do centro do canteiro)', achou(S2) && M.pending(S2).pid === q2.id, 'a ' + (C.ERVA_VER - 0.1) + ' passos');
      const pd = M.pending(S2), info = M.pendingInfo(S2);
      check('a decisão da erva espera um dia (until), nasce com três respostas, sem a opção de calar, e nomeia quem achou e Deus', pd.k === 'erva' && pd.t === S2.t && pd.until === S2.t + DAYM && info.k === 'erva' && info.opts.length === 3 && info.quiet === '' && info.title === 'A erva-do-sonho' && info.lead.indexOf(q2.name) === 0 && info.lead.indexOf('Tupã') > 0, info.opts.length + ' respostas');
      M.hourly(S2); M.hourly(S2);
      check('achada uma vez, não é achada de novo (um só aviso e uma só decisão na fila)', S2.chron.filter((c) => /achou na mata uma erva/.test(c.text)).length === 1 && S2.memoria.pend.length === 1);
    }
    // as três respostas da decisão
    const descoberta = () => { const S = mk(C.ERVA_LV); perto(S, S.people[4], 0, 1); M.hourly(S); S.events.length = 0; return S; };
    {
      const S = descoberta(), e = S.memoria.erva, a0 = S.god.align;
      const r = M.answer(S, 0);
      check('responder 0 abençoa o rito: lei "bencao", alinhamento +3, Crônica, e a decisão sai da fila', r === true && e.lei === 'bencao' && S.god.align === a0 + 3 && chronHas(S, /Tupã abençoou o rito da erva-do-sonho/) && !M.pending(S));
    }
    {
      const S = descoberta(), e = S.memoria.erva, a0 = S.god.align;
      M.answer(S, 1);
      check('responder 1 deixa com o povo: lei "livre", alinhamento igual', e.lei === 'livre' && S.god.align === a0 && !M.pending(S));
    }
    // proibir: a lei, o alinhamento, e nenhum rito marcado nunca; com a lei livre, o mesmo dia teria rito
    const dia = (S) => { const d = dryFrom(S, 2, 2); jump(S, d, 7); return d; };
    {
      const S = descoberta(), e = S.memoria.erva, a0 = S.god.align;
      M.answer(S, 2);
      check('responder 2 proíbe: lei "proibido", alinhamento -3, Crônica, sem rito nem dia marcado', e.lei === 'proibido' && S.god.align === a0 - 3 && chronHas(S, /Tupã proibiu a erva-do-sonho/) && !e.rite && e.hoje === -1);
      const d = dia(S);
      M.hourly(S);
      const L2 = descoberta(); M.answer(L2, 1);
      const d2 = dia(L2);
      M.hourly(L2);
      check('proibida a erva, o dia calmo das 7h não marca rito (a mesma aldeia com a lei livre marca)', e.hoje !== d && !e.rite && L2.memoria.erva.hoje === d2 && L2.memoria.erva.conv.length >= 3, 'proibido: ' + e.hoje + ' · livre: ' + L2.memoria.erva.hoje + ' (dia ' + d + ')');
    }
    {
      // sem resposta em um dia, vale a lei livre
      const S = descoberta(), e = S.memoria.erva, pd = M.pending(S);
      S.t = pd.until - 60; S.ck = Sim.clock(S.t); M.hourly(S);
      const antes = !!M.pending(S) && e.lei === '';
      S.t = pd.until; S.ck = Sim.clock(S.t); M.hourly(S);
      check('a decisão sem resposta segue na fila até completar um dia; depois o povo segue por conta própria (lei "livre")', antes && !M.pending(S) && e.lei === 'livre' && S.stats.respostas === 0, 'lei: ' + e.lei);
    }
    {
      // sem ninguém passando, em ERVA_ACASO_D dias o caçador de mais ofício acha
      const S = mk(C.ERVA_LV), e = S.memoria.erva;
      for (const q of S.people) q.skills.caca = 0;
      S.people[7].skills.caca = 20; S.people[5].skills.caca = 50; S.people[3].skills.caca = 50;
      M.hourly(S);
      const t0 = S.t;
      S.t = t0 + C.ERVA_ACASO_D * DAYM - 60; S.ck = Sim.clock(S.t); M.hourly(S);
      const antes = !achou(S);
      S.t = t0 + C.ERVA_ACASO_D * DAYM; S.ck = Sim.clock(S.t); M.hourly(S);
      check('sem ninguém passando por lá, só depois de ERVA_ACASO_D (60) dias alguém acha: o adulto de mais caça (empate: o de menor id)', antes && achou(S) && M.pending(S).pid === S.people[3].id, 'achou ' + (M.pending(S) && F.person(S, M.pending(S).pid).name));
    }
  }
  {
    // --- 28. a lei do rito: só vale depois de achada a erva, só muda o que mudou; proibir faz falta a quem se apegou ---
    const S = village(42, 12); calm(S); S.god.lv = 2; S.god.name = 'Tupã'; S.god.align = 0;
    const e = S.memoria.erva, ap = S.people[4], quase = S.people[5], nunca = S.people[6];
    ap.rito = C.RITO_APEGO; quase.rito = C.RITO_APEGO - 1;
    check('antes de a erva ser achada não há lei: devolve falso e nada muda', M.setLei(S, 'bencao') === false && !e.lei && S.god.align === 0);
    e.known = S.t;
    check('uma lei que não existe devolve falso', M.setLei(S, 'bobagem') === false && !e.lei);
    check('abençoar: devolve verdadeiro, alinhamento +3 e a Crônica diz', M.setLei(S, 'bencao') === true && e.lei === 'bencao' && S.god.align === 3 && chronHas(S, /abençoou o rito/));
    check('a mesma lei de novo devolve falso e não mexe no alinhamento', M.setLei(S, 'bencao') === false && S.god.align === 3);
    S.events.length = 0;
    const n0 = S.chron.length;
    check('proibir: devolve verdadeiro, alinhamento -3, o rito marcado cai e a Crônica conta', M.setLei(S, 'proibido') === true && e.lei === 'proibido' && S.god.align === 0 && !e.rite && e.hoje === -1 && S.chron.length === n0 + 1 && /proibiu a erva-do-sonho/.test(S.chron[S.chron.length - 1].text));
    check('quem já se apegou (' + C.RITO_APEGO + ' ritos ou mais) sente falta do rito ("semRito"); quem tem menos ou nunca foi, não', hasMem(ap, 'semRito') && !hasMem(quase, 'semRito') && !hasMem(nunca, 'semRito'));
    check('proibir de novo devolve falso e a Crônica não repete', M.setLei(S, 'proibido') === false && S.chron.length === n0 + 1);
    S.events.length = 0;
    check('liberar o que foi proibido: "livre", alinhamento igual, e o povo recebe o aviso de que o rito fica por conta dele', M.setLei(S, 'livre') === true && e.lei === 'livre' && S.god.align === 0 && S.events.some((x) => x.k === 'toast' && /por conta do povo/.test(x.text)));
  }
  // a aldeia da noite de rito: 14 adultos sem traço de fé (a fé não muda por ele), mais uma jovem de 17 anos, uma grávida e
  // uma mãe com o bebê no colo, que nunca podem ser convidadas; o dia de rito (sem chuva) e a hora da manhã
  function noiteDeRito() {
    const S = village(42, 14); calm(S);
    S.god.lv = C.ERVA_LV; S.god.name = 'Tupã'; S.god.align = 0;
    const e = S.memoria.erva;
    e.known = S.t; e.lei = 'livre';
    for (const q of S.people) { q.traits = []; q.fe = 80; }
    const jovem = add(S, 'F', 'Jovem', 17), gravida = add(S, 'F', 'Gestante', 27), mae = add(S, 'F', 'Mãe', 25), bebe = add(S, 'M', 'Bebê', 1);
    setAge(S, jovem, 17.9); setAge(S, bebe, 0.5);
    gravida.preg = { t0: S.t, due: S.t + 40 * DAYM, father: 0, known: false };
    bebe.carriedBy = mae.id; bebe.mother = mae.id;
    for (const q of [jovem, gravida, mae, bebe]) q.traits = [];
    const d0 = dryFrom(S, 2, 2);
    jump(S, d0, 6.8);
    return { S, e, d0, barrados: [jovem.id, gravida.id, mae.id, bebe.id], jovem, gravida, mae, bebe };
  }
  {
    // --- 23. uma noite de rito do começo ao fim: o convite às 7h, a erva, a roda às 18h, a pergunta, a resposta, o fim às 21h ---
    const { S, e, d0, barrados } = noiteDeRito();
    const R = { conv: null, convidou: 0, menores: 0, tem: null, rite: null, on: null, blkOn: 0, onSteps: 0, pd: null, fim: null, toasts: [] };
    const evs = run(S, 456, (T) => {
      const h = T.ck.hour;
      if (e.hoje === d0 && !R.conv) R.conv = { h, ids: e.conv.slice(), cond: e.cond };
      if ((e.conv && e.conv.some((id) => barrados.indexOf(id) >= 0)) || (e.rite && e.rite.part.some((id) => barrados.indexOf(id) >= 0))) R.convidou++;
      if (alive(T).some((q) => doing(q, 'rito') && (F.age(T, q) < 18 || q.preg || F.carrying(T, q)))) R.menores++;
      if (e.tem === d0 && !R.tem) R.tem = h;
      if (e.rite && !R.rite) R.rite = { h, on: e.rite.on, part: e.rite.part.slice(), fire: e.rite.fire };
      if (e.rite && e.rite.on) { R.onSteps++; if (M.blockStory(T)) R.blkOn++; if (R.on === null) R.on = h; }
      for (const x of T.events) if (x.k === 'toast') R.toasts.push(x);
      if (!R.pd && M.pending(T)) {
        const pd = M.pending(T);
        R.pd = JSON.parse(JSON.stringify(pd)); R.info = M.pendingInfo(T); R.h = h;
        R.fe0 = pd.part.map((id) => F.person(T, id).fe); R.al0 = T.god.align; R.askerFe = F.person(T, pd.pid).fe;
        T.events.length = 0;
        M.answer(T, 0);
        R.depois = T.events.slice();
        R.fe1 = pd.part.map((id) => F.person(T, id).fe); R.al1 = T.god.align;
        R.resp = T.stats.respostas; R.livre = M.pending(T) === null;
      }
      if (T.ck.hour >= 21 && !R.fim) R.fim = { h, rite: e.rite, ritos: T.stats.ritos, hoje: e.hoje, last: e.last, t: T.t };
    });
    check('às 7h o povo é convidado: há dia de rito, quem conduz vai na frente, e são ' + C.RITO_MIN_POP + ' a ' + C.RITO_MAX + ' pessoas (RITO_MAX)', !!R.conv && R.conv.h >= 7 && R.conv.h < 7.1 && R.conv.ids[0] === R.conv.cond && R.conv.ids.length >= C.RITO_MIN_POP && R.conv.ids.length <= C.RITO_MAX && new Set(R.conv.ids).size === R.conv.ids.length, R.conv && R.conv.ids.length + ' convidados às ' + R.conv.h.toFixed(2));
    check('só adultos de verdade: a jovem de 17 anos, a grávida, a mãe com bebê no colo e o bebê nunca entram na lista, na roda nem no caminho do rito', R.convidou === 0 && R.menores === 0 && R.conv.ids.every((id) => { const q = F.person(S, id); return F.age(S, q) >= 18 && !q.preg; }) , R.convidou + ' passos com convidado barrado, ' + R.menores + ' menores no rito');
    check('o condutor colhe a erva de manhã e avisa o povo: "tem" é do dia, antes das 16h', R.tem !== null && R.tem > 7 && R.tem < 16, R.tem && R.tem.toFixed(2) + 'h');
    check('duas horas antes (16h) a roda fica marcada junto da fogueira, com os convidados, e ainda fechada', !!R.rite && R.rite.h >= 16 && R.rite.h < 16.1 && R.rite.on === false && R.rite.fire === L.campFire(S, true).id && JSON.stringify(R.rite.part) === JSON.stringify(R.conv.ids), R.rite && R.rite.h.toFixed(2));
    check('às 18h a roda abre (rite.on), o evento "rito" avisa a tela e a noite é do rito (blockStory em todos os passos)', R.on >= 18 && R.on < 18.1 && evs.some((x) => x.ev === 'rito' && x.on === true) && R.onSteps >= 80 && R.blkOn === R.onSteps, R.on && R.on.toFixed(2) + 'h, ' + R.onSteps + ' passos');
    check('perto de 19h, com dois ou mais sentados, sobe a pergunta: pergunta da aldeia ("porque", sem desgraça, sem cético, sem filho pequeno), com um conjunto de quem está na roda e três respostas', !!R.pd && R.pd.k === 'visao' && R.pd.q === 'porque' && R.pd.part.length >= 2 && R.pd.part.length <= C.RITO_MAX && R.pd.part.every((id) => R.conv.ids.indexOf(id) >= 0) && R.pd.part.indexOf(R.pd.pid) >= 0 && R.info.k === 'visao' && R.info.opts.length === 3 && R.info.quiet === 'Ficar em silêncio' && R.h >= 18.7 && R.h <= 19.1, R.pd && (R.pd.q + ', ' + R.pd.part.length + ' na roda, às ' + R.h.toFixed(2)));
    const maxFe = Math.max(...R.fe0), empate = R.pd.part.filter((id, i) => R.fe0[i] === maxFe);
    check('a pergunta pode esperar VISAO_ESPERA_H (10) horas e quem pergunta é quem tem mais fé na roda (no empate, o de menor id)', R.pd.until - R.pd.t === C.VISAO_ESPERA_H * 60 && R.askerFe === maxFe && R.pd.pid === Math.min(...empate), 'fé ' + R.fe0.join('/') + ', pergunta de ' + R.pd.pid);
    check('responder 0 sobe a fé de quem estava na roda (+3 cada, a resposta "Para não ficar só.") e o alinhamento (+10); a pergunta sai da fila', R.fe1.every((f, i) => near(f - R.fe0[i], 3, 1e-9)) && near(R.al1 - R.al0, M.Q.porque.a[0].al, 1e-9) && M.Q.porque.a[0].al === 10 && R.livre && R.resp === 1, R.fe0.join('/') + ' → ' + R.fe1.join('/'));
    const visao = S.memoria.contos.find((c) => c.k === 'visao');
    check('a resposta vira conto ("visao", tom de cuidado, com a fala de Deus e o nome de quem perguntou) e a Crônica conta a primeira resposta', !!visao && visao.tone === 1 && visao.r === 'Para não ficar só.' && visao.a === F.person(S, R.pd.pid).name && chronHas(S, /Foi a primeira vez que o povo ouviu uma resposta/), visao && JSON.stringify([visao.tone, visao.r, visao.a]));
    check('uma só resposta e um toast de "respondeu" ao jogador', S.stats.respostas === 1 && R.depois.some((x) => x.k === 'toast' && /Tupã respondeu a .*: “Para não ficar só.”/.test(x.text) && x.tone === 'good') && R.depois.some((x) => x.k === 'memoria' && x.ev === 'resposta' && x.tone === 1));
    check('às 21h o rito acaba sozinho: roda fechada, o dia some (hoje -1), a hora do último rito fica guardada, o rito vira número e Crônica', !!R.fim && R.fim.h >= 21 && R.fim.h < 21.1 && R.fim.rite === null && R.fim.ritos === 1 && R.fim.hoje === -1 && near(R.fim.last, R.fim.t, 60) && S.stats.ritos === 1 && chronHas(S, /adultos sentaram em roda com a erva-do-sonho.*Foi o primeiro rito/) && evs.some((x) => x.ev === 'rito' && x.on === false), R.fim && R.fim.ritos + ' rito');
    const sentaram = alive(S).filter((q) => q.rito);
    check('quem ficou na roda guarda "rito 1", a hora e o dia, a lembrança da viagem (ou da visão ruim) e a fé subiu RITO_FE ou mais', sentaram.length === R.conv.ids.length && sentaram.every((q) => q.rito === 1 && q.ritoDia === d0 && q.ritoT > d0 * DAYM + 18 * 60 && (hasMem(q, 'viagem') || hasMem(q, 'visaoRuim')) && q.fe >= 80 + C.RITO_FE - 1e-9), sentaram.length + ' na roda');
    const fora = alive(S).find((q) => R.conv.ids.indexOf(q.id) < 0 && !q.sleeping);
    check('quem sentou na roda acorda devagar no dia seguinte (ressaca por RITO_RESSACA_H horas: o trabalho rende RITO_RESSACA), e quem não foi trabalha normal', sentaram.every((q) => q.ressaca > S.t && q.ressaca <= S.t + C.RITO_RESSACA_H * 60 && M.speed(S, q, 'pesca') === C.RITO_RESSACA && M.speed(S, q, 'madeira') === C.RITO_RESSACA) && !!fora && M.speed(S, fora, 'pesca') === 1 && !fora.ressaca, 'ressaca ' + C.RITO_RESSACA + ' por ' + C.RITO_RESSACA_H + ' h');
    const q0 = sentaram[0], t0 = S.t, r0 = q0.ressaca;
    S.t = r0 - 1; const dentro = M.speed(S, q0, 'pesca');
    S.t = r0; const fim2 = M.speed(S, q0, 'pesca');
    S.t = t0;
    check('a ressaca acaba na hora marcada (um minuto antes ainda rende menos; na hora, normal)', dentro === C.RITO_RESSACA && fim2 === 1, dentro + ' → ' + fim2);
    // o próximo rito: não antes de RITO_GAP_D dias do último
    const dia = (n, h) => { jump(S, d0 + n, h); M.hourly(S); return e.hoje === S.ck.day; };
    S.events.length = 0;
    const cedo = dia(1, 7) || dia(5, 7) || dia(C.RITO_GAP_D - 1, 7) || dia(C.RITO_GAP_D, 7);
    check('depois de um rito o povo espera: nada de rito marcado nos dias 1, 5, 11 e 12 (o intervalo é de RITO_GAP_D = ' + C.RITO_GAP_D + ' dias, contados do fim do último)', cedo === false);
    const volta = dia(C.RITO_GAP_D + 1, 7);
    check('passados os ' + C.RITO_GAP_D + ' dias, no primeiro dia calmo das 7h o rito volta a ser marcado', volta === true && e.conv.length >= C.RITO_MIN_POP, 'dia ' + (C.RITO_GAP_D + 1));
  }
  {
    // --- 24. sem resposta: a pergunta espera VISAO_ESPERA_H horas e depois vale o silêncio ---
    const { S, e, d0 } = noiteDeRito();
    const R = { pd: null, fim: null, toasts: [] };
    run(S, 456 + 300, (T) => {
      for (const x of T.events) if (x.k === 'toast') R.toasts.push(x);
      if (!R.pd && M.pending(T)) { R.pd = JSON.parse(JSON.stringify(M.pending(T))); R.fe0 = R.pd.part.map((id) => F.person(T, id).fe); }
      else if (R.pd && !R.fim && !M.pending(T)) R.fim = { t: T.t, fe: R.pd.part.map((id) => F.person(T, id).fe), resp: T.stats.respostas };
    });
    check('ninguém responde: a pergunta fica na fila até o prazo (VISAO_ESPERA_H horas, no tique da hora cheia) e sai sozinha', !!R.pd && !!R.fim && R.fim.t >= R.pd.until && R.fim.t - R.pd.until < 60, R.pd && R.fim && ('prazo ' + R.pd.until + ', saiu ' + R.fim.t));
    const asker = F.person(S, R.pd.pid);
    check('o silêncio não é resposta: nenhuma resposta contada, nenhum conto de visão; quem perguntou guarda "semResposta"; o rito, que aconteceu, conta', S.stats.respostas === 0 && !S.memoria.contos.some((c) => c.k === 'visao') && hasMem(asker, 'semResposta') && S.stats.ritos === 1 && e.rite === null, S.stats.respostas + ' respostas, ' + S.stats.ritos + ' rito');
    check('o jogo avisa que Deus ficou em silêncio', R.toasts.some((x) => /perguntou na fumaça, e Tupã ficou em silêncio/.test(x.text) && x.tone === 'warn'));
  }
  {
    // o silêncio, número por número: quem estava na roda perde 2 de fé, só quem perguntou guarda a lembrança, e qualquer resposta que não seja 0, 1 ou 2 é silêncio
    const S = village(42, 12); calm(S); S.god.name = 'Tupã'; S.god.align = 0;
    const ps = [S.people[4], S.people[5], S.people[6]], fora = S.people[7];
    for (const q of S.people) { q.traits = []; q.fe = 50; }
    const pergunta = () => { S.memoria.pend.push({ k: 'visao', q: 'porque', pid: ps[0].id, part: ps.map((q) => q.id), c: {}, t: S.t, until: S.t + C.VISAO_ESPERA_H * 60 }); };
    pergunta();
    S.t += C.VISAO_ESPERA_H * 60 - 60; S.ck = Sim.clock(S.t); M.hourly(S);
    check('uma hora antes do prazo a pergunta ainda espera', !!M.pending(S) && S.stats.respostas === 0);
    S.t += 60; S.ck = Sim.clock(S.t); M.hourly(S);
    check('no prazo a pergunta sai: quem estava na roda perde 2 de fé, quem não estava não perde', !M.pending(S) && ps.every((q) => near(q.fe, 48, 1e-9)) && fora.fe === 50, ps.map((q) => q.fe).join('/'));
    check('só quem perguntou guarda "semResposta"', hasMem(ps[0], 'semResposta') && !hasMem(ps[1], 'semResposta') && !hasMem(ps[2], 'semResposta') && S.stats.respostas === 0 && S.memoria.erva.lastQ === 'porque');
    let resultados = [];
    for (const v of [3, -1, 7, undefined]) { pergunta(); const fe0 = ps[1].fe; resultados.push(M.answer(S, v) === true && near(ps[1].fe, fe0 - 2, 1e-9) && S.stats.respostas === 0); }
    check('qualquer resposta que não seja 0, 1 ou 2 (3, -1, 7, nada) é silêncio, e devolve verdadeiro', resultados.every((x) => x), resultados.join());
    check('sem pergunta na fila, responder devolve falso e não muda nada', M.answer(S, 0) === false && S.stats.respostas === 0);
  }
  {
    // --- 25. a pergunta que o povo faz sai do que a aldeia está vivendo ---
    const novo = () => { const S = village(42, 12); calm(S); S.god.name = 'Tupã'; for (const q of S.people) { q.traits = []; q.fe = 50; } S.ctx.foodDays = 50; return S; };
    const gente = (S, ...ix) => ix.map((i) => S.people[i]);
    {
      const S = novo(), roda = gente(S, 4, 5, 6);
      roda[1].fe = 90; roda[2].fe = 90;
      const r = M.pickQ(S, roda);
      check('sem nada de especial a pergunta é "porque" (sem dados a mais), feita por quem tem mais fé na roda (no empate, o de menor id)', r.q === 'porque' && r.who === roda[1] && JSON.stringify(r.c) === '{}', r.q + ' / ' + r.who.name);
    }
    {
      const S = novo(), V = S.people[8], P = S.people[5], roda = gente(S, 4, 5, 6);
      F.link(S, V, P, 60);
      roda[2].fe = 99;
      kill(S, V);
      S.ctx.foodDays = 5;
      const r = M.pickQ(S, roda);
      check('com uma morte nos últimos 30 dias a pergunta é "morte" ("Para onde foi ...?"), mesmo com pouca comida, e quem pergunta é o da roda que era da família do morto, ainda que tenha menos fé', r.q === 'morte' && r.who === P && r.c.m === V.name && M.Q.morte.q(r.c) === 'Para onde foi ' + V.name + '?', r.q + ' / ' + (r.who && r.who.name));
      const roda2 = gente(S, 4, 6, 7);
      roda2[1].fe = 99;
      const r2 = M.pickQ(S, roda2);
      check('sem ninguém da família na roda quem pergunta é o de mais fé', r2.q === 'morte' && r2.who === roda2[1]);
      S.ctx.foodDays = 50;
      const d = V.diedAt;
      S.t = d + 30 * DAYM - 1; const a = M.pickQ(S, roda).q;
      S.t = d + 30 * DAYM; const b = M.pickQ(S, roda).q;
      check('a morte conta por 30 dias: até o último minuto ainda, no seguinte já não', a === 'morte' && b === 'porque', a + ' → ' + b);
    }
    {
      const S = novo(), roda = gente(S, 4, 5, 6);
      S.ctx.foodDays = 9.9; const a = M.pickQ(S, roda);
      S.ctx.foodDays = 10; const b = M.pickQ(S, roda);
      check('com menos de 10 dias de comida a pergunta é "fome" ("Vai faltar comida?"); com 10 ou mais, não', a.q === 'fome' && M.Q.fome.q(a.c) === 'Vai faltar comida?' && b.q === 'porque', a.q + ' → ' + b.q);
    }
    {
      const S = novo(), V = S.people[8], roda = gente(S, 4, 5, 6), e = S.memoria.erva;
      kill(S, V, 'lobo');
      const a = M.pickQ(S, roda);
      e.lastQ = 'morte';
      const b = M.pickQ(S, roda);
      check('quem morreu no ataque de lobos: a "morte" vem primeiro; se foi a última pergunta, vem a "fera" ("A fera vai voltar?")', V.cause === 'lobos' && a.q === 'morte' && b.q === 'fera' && M.Q.fera.q(b.c) === 'A fera vai voltar?', V.cause + ': ' + a.q + ' → ' + b.q);
    }
    {
      const S = novo(), roda = gente(S, 4, 5, 6), cet = roda[0], pai = roda[1], velho = roda[2], kid = S.people[9];
      cet.traits = ['Cético'];
      const a = M.pickQ(S, roda);
      check('com um cético na roda a pergunta é "duvida", feita por ele ("Você existe mesmo, ou é só a fumaça?")', a.q === 'duvida' && a.who === cet && M.Q.duvida.q(a.c) === 'Você existe mesmo, ou é só a fumaça?');
      cet.traits = [];
      kid.mother = pai.id; setAge(S, kid, 11.9);
      const b = M.pickQ(S, roda);
      setAge(S, kid, 12);
      const c = M.pickQ(S, roda);
      check('quem tem um filho com menos de 12 anos pergunta "filhos" ("Meus filhos vão viver mais do que eu?"); com o filho de 12, não', b.q === 'filhos' && b.who === pai && M.Q.filhos.q(b.c) === 'Meus filhos vão viver mais do que eu?' && c.q === 'porque', b.q + ' → ' + c.q);
      setAge(S, velho, 59);
      const d = M.pickQ(S, roda);
      setAge(S, velho, 60);
      const f = M.pickQ(S, roda);
      check('um idoso (60 anos) na roda pergunta "depois" ("O que tem depois da morte?"); com 59, não', f.q === 'depois' && f.who === velho && M.Q.depois.q(f.c) === 'O que tem depois da morte?' && d.q === 'porque', d.q + ' → ' + f.q);
    }
    {
      const S = novo(), ea = add(S, 'F', 'Ilanê', 30, 'elfo'), eb = add(S, 'M', 'Eldor', 31, 'elfo');
      for (const q of [ea, eb]) { q.traits = []; q.fe = 50; }
      S.ctx.foodDays = 50;
      Pv.shift(S, -1);   // uma convivência já guardada (19)
      const a = M.pickQ(S, [ea, eb]), h = M.pickQ(S, gente(S, 4, 5));
      Pv.shift(S, 50);
      const b = M.pickQ(S, [ea, eb]);
      check('numa aldeia de povos misturados com a convivência baixa (menos de 60) a pergunta é "povos": o elfo pergunta "A gente, que veio de longe, também é teu?" e o humano "Os que vieram de fora também são teus?"', a.q === 'povos' && a.who === ea && a.c.fora === true && M.Q.povos.q(a.c) === 'A gente, que veio de longe, também é teu?' && h.q === 'povos' && h.c.fora === false && M.Q.povos.q(h.c) === 'Os que vieram de fora também são teus?', a.q + ' / ' + h.q);
      check('com a convivência alta (69) a pergunta dos povos não sai', b.q !== 'povos', Pv.conv(S, 'elfo', 'humano') + ' → ' + b.q);
    }
    {
      // a ordem de quem manda: morte, fome, fera, povos, dúvida, filhos, depois, porque. A última pergunta feita só deixa de valer
      // para a seguinte; para ver cada degrau, apaga-se o de cima (e a última é sempre "morte", a primeira da fila)
      const S = novo(), V = S.people[8], ea = add(S, 'F', 'Ilanê', 30, 'elfo'), roda = [S.people[4], S.people[5], S.people[6], ea], e = S.memoria.erva, kid = S.people[9];
      ea.traits = []; ea.fe = 50;
      kill(S, V, 'lobo');
      S.ctx.foodDays = 5;
      Pv.shift(S, -1);
      roda[0].traits = ['Cético']; kid.mother = roda[1].id; setAge(S, kid, 5); setAge(S, roda[2], 62);
      const seq = [];
      const pega = (apaga) => { if (apaga) apaga(); e.lastQ = 'morte'; seq.push(M.pickQ(S, roda).q); };
      e.lastQ = '';
      seq.push(M.pickQ(S, roda).q);                                    // tudo ao mesmo tempo: a morte
      pega();                                                          // a morte já foi feita: a fome
      pega(() => { S.ctx.foodDays = 50; });                            // sem a fome: a fera (o lobo que matou)
      pega(() => { V.cause = 'velhice'; });                            // sem a fera: os povos
      pega(() => { Pv.shift(S, 50); });                                // sem a convivência baixa: a dúvida
      pega(() => { roda[0].traits = []; });                            // sem o cético: os filhos
      pega(() => { setAge(S, kid, 12); });                             // sem o filho pequeno: o idoso
      pega(() => { setAge(S, roda[2], 59); });                         // sem o idoso: o porquê
      check('com tudo acontecendo ao mesmo tempo as perguntas seguem a ordem: morte, fome (se a morte foi a última), fera, povos, dúvida, filhos, depois e, no fim, porque', seq.join() === 'morte,fome,fera,povos,duvida,filhos,depois,porque', seq.join());
      const T2 = novo();
      T2.memoria.erva.lastQ = 'porque';
      const so = M.pickQ(T2, gente(T2, 4, 5, 6));
      check('as perguntas de sempre se revezam: depois da "porque" vem a "querer", e depois dela a "porque" de novo', so.q === 'querer' && (T2.memoria.erva.lastQ = 'querer', M.pickQ(T2, gente(T2, 4, 5, 6)).q === 'porque'));
    }
  }
  {
    // --- 26. o que cada resposta faz, uma a uma ---
    const novo = () => {
      const S = village(42, 12); calm(S); S.god.name = 'Tupã'; S.god.lv = 2; S.god.align = 0;
      for (const q of S.people) { q.traits = []; q.fe = 50; }
      return { S, ps: [S.people[4], S.people[5], S.people[6]], fora: S.people[7] };
    };
    const CC = { morte: { m: 'Fulano' }, povos: { fora: false } };
    // põe a pergunta na fila, com quem estava na roda, e responde i; devolve o que a resposta fez aparecer na tela
    const faz = (S, ps, q, i) => {
      S.memoria.pend.push({ k: 'visao', q, pid: ps[0].id, part: ps.map((p) => p.id), c: CC[q] || {}, t: S.t, until: S.t + 600 });
      S.events.length = 0;
      const r = M.answer(S, i);
      return { r, ev: S.events.slice() };
    };
    {
      const { S, ps, fora } = novo();
      const ruins = []; let n = 0;
      for (const q of Object.keys(M.Q)) for (let i = 0; i < 3; i++) {
        const A = M.Q[q].a[i];
        for (const p of S.people) { p.fe = 50; p.mem = []; }
        S.god.align = 0; S.memoria.zelo = null; S.memoria.prom = []; S.memoria.pend.length = 0;
        const r0 = S.stats.respostas;
        const out = faz(S, ps, q, i);
        const bom = out.r === true && ps.every((p) => near(p.fe, 50 + (A.fe || 0), 1e-9)) && fora.fe === 50 && near(S.god.align, A.al || 0, 1e-9)
          && (!A.mem || (ps.every((p) => hasMem(p, A.mem)) && !hasMem(fora, A.mem))) && S.stats.respostas === r0 + 1 && S.memoria.pend.length === 0 && S.memoria.erva.lastQ === q;
        n++;
        if (!bom) ruins.push(q + '/' + i);
      }
      check('as respostas de todas as perguntas (três de cada), uma a uma: a fé de quem estava na roda muda como a tabela diz (e a de quem não estava, não), o alinhamento muda, a lembrança fica só na roda, conta uma resposta e a pergunta sai da fila', n === Object.keys(M.Q).length * 3 && n === 30 && ruins.length === 0, ruins.join() || n + ' respostas');
    }
    {
      const { S, ps, fora } = novo();
      const luto = (p, dias, k) => p.mem.push({ k, until: S.t + dias * DAYM });
      luto(ps[0], 30, 'perdeuAlguem'); luto(ps[1], 10, 'perdeuFamilia'); luto(fora, 40, 'perdeuCompanheiro'); luto(ps[2], 20, 'viagem');
      faz(S, ps, 'morte', 0);
      const rest = (p, k) => (p.mem.find((x) => x.k === k).until - S.t) / DAYM;
      check('"Está comigo.": o luto de todo o povo (de quem estava na roda ou não) encurta 15 dias, sem nunca zerar (fica ao menos 1 dia); outra lembrança não muda', near(rest(ps[0], 'perdeuAlguem'), 15, 1e-9) && near(rest(ps[1], 'perdeuFamilia'), 1, 1e-9) && near(rest(fora, 'perdeuCompanheiro'), 25, 1e-9) && near(rest(ps[2], 'viagem'), 20, 1e-9), [15, 1, 25, 20].join('/') + ' ← ' + [rest(ps[0], 'perdeuAlguem'), rest(ps[1], 'perdeuFamilia'), rest(fora, 'perdeuCompanheiro'), rest(ps[2], 'viagem')].join('/'));
    }
    {
      const { S, ps } = novo();
      const open = T.open(S), need = open ? T.need(open) : 0, p0 = (S.tech.prat[open] || 0), w0 = (S.tech.who[ps[0].id] || 0);
      faz(S, ps, 'porque', 1);
      check('"Para ver o que vocês fazem.": a roda abre a cabeça, e quem perguntou ganha a prática do que o povo está perto de descobrir (RITO_SABER = 3% do que falta)', !!open && need > 0 && near(S.tech.prat[open] - p0, need * C.RITO_SABER, 1e-9) && near(S.tech.who[ps[0].id] - w0, need * C.RITO_SABER, 1e-9), open + ': +' + (S.tech.prat[open] - p0).toFixed(3));
    }
    {
      const { S, ps } = novo();
      const comidas = ['frutas', 'pesca', 'caca', 'roca', 'criacao', 'conservar'], outras = ['madeira', 'pedra', 'construcao', 'oficio'];
      faz(S, ps, 'fome', 1);
      const z = S.memoria.zelo;
      check('"Guardem mais do que comem": o zelo da comida dura ZELO_COMIDA_D (10) dias e o trabalho de comida rende ZELO_COMIDA (1,1); o resto, igual', !!z && z.k === 'comida' && z.until === S.t + C.ZELO_COMIDA_D * DAYM && comidas.every((k) => M.speed(S, ps[0], k) === C.ZELO_COMIDA) && outras.every((k) => M.speed(S, ps[0], k) === 1));
      ps[0].ressaca = S.t + 100;
      check('a ressaca do rito e o zelo se multiplicam', near(M.speed(S, ps[0], 'pesca'), C.RITO_RESSACA * C.ZELO_COMIDA, 1e-9) && near(M.speed(S, ps[0], 'madeira'), C.RITO_RESSACA, 1e-9));
      ps[0].ressaca = 0;
      faz(S, ps, 'fome', 2);
      const z2 = S.memoria.zelo;
      check('"Quem trabalha, come.": o zelo de tudo dura ZELO_TUDO_D (5) dias e todo trabalho rende ZELO_TUDO (1,05), no lugar do zelo de antes', z2.k === 'tudo' && z2.until === S.t + C.ZELO_TUDO_D * DAYM && comidas.concat(outras).every((k) => M.speed(S, ps[0], k) === C.ZELO_TUDO));
      S.t = z2.until - 1; S.ck = Sim.clock(S.t); M.daily(S);
      const antes = !!S.memoria.zelo;
      S.t = z2.until; S.ck = Sim.clock(S.t); M.daily(S);
      check('o zelo acaba no dia em que vence (a rotina diária o tira): antes ainda vale, depois o trabalho volta ao normal', antes && S.memoria.zelo === null && M.speed(S, ps[0], 'pesca') === 1);
    }
    {
      // as promessas: uma de cada tipo na fila; repetir o tipo troca a promessa
      const { S, ps } = novo();
      faz(S, ps, 'fome', 0); faz(S, ps, 'fome', 0);
      const um = S.memoria.prom.length === 1 && S.memoria.prom[0].k === 'fome' && S.memoria.prom[0].t === S.t && S.memoria.prom[0].until === S.t + C.PROMESSA_D * DAYM;
      faz(S, ps, 'fera', 0);
      check('"Não vai faltar." e "Eu vigio por vocês." prometem por PROMESSA_D (30) dias; repetir a mesma troca a promessa, e as duas (comida e fera) convivem', um && S.memoria.prom.length === 2 && S.memoria.prom.map((x) => x.k).sort().join() === 'fera,fome');
    }
    {
      // cumprida: passados os 30 dias sem ninguém passar fome de verdade
      const { S, ps, fora } = novo();
      faz(S, ps, 'fome', 0);
      const pr = S.memoria.prom[0];
      for (const p of S.people) p.fe = 50;
      S.t = pr.until - 1; S.ck = Sim.clock(S.t); M.daily(S);
      const antes = S.memoria.prom.length === 1;
      S.t = pr.until; S.ck = Sim.clock(S.t); S.events.length = 0; M.daily(S);
      const conto = S.memoria.contos.filter((c) => c.k === 'promessa');
      check('promessa de comida cumprida (30 dias sem passar fome): a fé de todo o povo sobe PROMESSA_FE (3), o aviso diz "cumpriu" e a promessa sai da fila', antes && S.memoria.prom.length === 0 && S.people.filter((p) => p.alive).every((p) => near(p.fe, 50 + C.PROMESSA_FE, 1e-9)) && S.events.some((x) => x.k === 'toast' && x.tone === 'good' && /Tupã prometeu que não ia faltar comida, e cumpriu/.test(x.text)), ps.map((p) => p.fe).join('/'));
      check('a promessa cumprida vira conto ("promessa", tom de cuidado, cumprida)', conto.length === 1 && conto[0].tone === 1 && conto[0].r === 1, JSON.stringify(conto.map((c) => [c.tone, c.r])));
    }
    {
      // quebrada: alguém com fome de verdade (menos de 8) quebra na hora, antes do prazo
      const { S, ps } = novo();
      faz(S, ps, 'fome', 0);
      for (const p of S.people) { p.fe = 50; p.mem = []; }
      S.god.align = 0;
      ps[1].needs.fome = 7.9;
      S.events.length = 0; M.daily(S);
      const conto = S.memoria.contos.filter((c) => c.k === 'promessa');
      check('promessa de comida quebrada (alguém com fome abaixo de 8): a fé de todo o povo cai PROMESSA_QUEBRA (6), todos guardam "promessaQuebrada", o alinhamento cai 10 e a Crônica conta', S.memoria.prom.length === 0 && S.people.filter((p) => p.alive).every((p) => near(p.fe, 50 - C.PROMESSA_QUEBRA, 1e-9) && hasMem(p, 'promessaQuebrada')) && S.god.align === -10 && chronHas(S, /Tupã prometeu que não ia faltar comida, e faltou\. O povo não esquece\./), S.people[4].fe + ' / ' + S.god.align);
      check('a promessa quebrada vira conto de medo ("promessa", tom -1, não cumprida)', conto.length === 1 && conto[0].tone === -1 && conto[0].r === 0, JSON.stringify(conto.map((c) => [c.tone, c.r])));
      const S2 = novo().S, q2 = S2.people[4];
      S2.memoria.prom.push({ k: 'fome', t: S2.t, until: S2.t + C.PROMESSA_D * DAYM });
      q2.needs.fome = 8;
      M.daily(S2);
      check('com a fome em 8 ou mais a promessa segue de pé', S2.memoria.prom.length === 1);
    }
    {
      // a fera: só quebra com morte por bicho DEPOIS da promessa; antes, não
      const { S, ps } = novo();
      const V1 = S.people[8], V2 = S.people[9];
      kill(S, V1, 'lobo');
      Sim.step(S, 2);
      faz(S, ps, 'fera', 0);
      M.daily(S);
      const firme = S.memoria.prom.length === 1;
      kill(S, V2, 'onca');
      for (const p of S.people) p.fe = 50;
      S.events.length = 0; M.daily(S);
      check('promessa contra a fera: a morte por bicho de antes da promessa não a quebra; uma de depois (a onça) quebra, a fé cai 6 e a Crônica conta que a fera levou gente', V1.cause === 'lobos' && V2.cause === 'onca' && firme && S.memoria.prom.length === 0 && S.people.filter((p) => p.alive).every((p) => near(p.fe, 50 - C.PROMESSA_QUEBRA, 1e-9)) && chronHas(S, /Tupã prometeu que ia vigiar contra a fera, e a fera levou gente/) && S.memoria.contos.some((c) => c.k === 'promessa' && c.tone === -1), V1.cause + '/' + V2.cause);
      const T2 = novo(); faz(T2.S, T2.ps, 'fera', 0);
      const pr2 = T2.S.memoria.prom[0];
      for (const p of T2.S.people) p.fe = 50;
      T2.S.t = pr2.until; T2.S.ck = Sim.clock(T2.S.t); T2.S.events.length = 0; M.daily(T2.S);
      check('promessa contra a fera cumprida em 30 dias: a fé sobe 3 e o aviso diz que a promessa foi cumprida', T2.S.memoria.prom.length === 0 && T2.S.people.filter((p) => p.alive).every((p) => near(p.fe, 53, 1e-9)) && T2.S.events.some((x) => x.k === 'toast' && /ia vigiar contra a fera, e cumpriu/.test(x.text)));
    }
    {
      // a convivência dos povos
      const { S, ps } = novo();
      add(S, 'F', 'Ilanê', 30, 'elfo');
      const conv = () => Pv.conv(S, 'elfo', 'humano');
      const c0 = conv();
      faz(S, ps, 'povos', 0); const c1 = conv();
      faz(S, ps, 'povos', 1); const c2 = conv();
      faz(S, ps, 'povos', 2); faz(S, ps, 'povos', 2); const c3 = conv();
      check('"Todos são meus." aproxima os povos 3 pontos; "Vocês que se entendam.", nada; "Os primeiros são os primeiros.", afasta 3 (numa aldeia de povos misturados)', Pv.mixed(S) && near(c1 - c0, 3, 1e-6) && near(c2 - c1, 0, 1e-6) && near(c3 - c2, -6, 1e-6), [c0, c1, c2, c3].join(' → '));
      const U = novo();
      check('numa aldeia de um povo só a resposta da convivência não faz nada (e não dá erro)', faz(U.S, U.ps, 'povos', 0).r === true && !U.S.povos.mixed);
    }
    {
      // sinais para o cético
      const { S, ps } = novo();
      ps[0].traits = ['Cético'];
      faz(S, ps, 'duvida', 0); const a = ps[0].sinais;
      ps[0].sinais = 0;
      faz(S, ps, 'duvida', 1); const b = ps[0].sinais;
      check('o cético que perguntou junta sinais de visão: "Olhe a sua mão" dá 4 (1 da roda e 3 da resposta), "Acredite no que você vê" dá 2; quem não é cético não junta', a === 4 * C.SINAL.visao && b === 2 * C.SINAL.visao && !ps[1].sinais && !ps[2].sinais, a + ' / ' + b);
    }
    {
      // o trovão
      const { S, ps, fora } = novo();
      const o1 = faz(S, ps, 'duvida', 2);
      const b1 = o1.ev.find((x) => x.k === 'bolt');
      check('"Escute o trovão.": cai um raio de longe no acampamento (evento "bolt", longe) e quem estava na roda guarda "viuRaio", além de "temeu"', !!b1 && b1.far === 1 && b1.x === S.camp.x && b1.y === S.camp.y && ps.every((p) => hasMem(p, 'viuRaio') && hasMem(p, 'temeu')) && !hasMem(fora, 'viuRaio'), JSON.stringify(b1));
      const fogo = L.campFire(S, true);
      S.memoria.erva.rite = { t0: S.t, fire: fogo.id, part: ps.map((p) => p.id), fez: 3, asked: true, on: true };
      const o2 = faz(S, ps, 'duvida', 2);
      const b2 = o2.ev.find((x) => x.k === 'bolt');
      check('com o rito aberto o raio cai ao lado da fogueira da roda (3 passos a leste, 2 ao norte)', !!b2 && b2.x === fogo.x + 3 && b2.y === fogo.y - 2, JSON.stringify(b2));
    }
    {
      // o tom da resposta marca o conto e o aviso
      const { S, ps } = novo();
      const out = faz(S, ps, 'morte', 2);
      const tale = S.memoria.contos.find((c) => c.k === 'visao');
      check('uma resposta dura (tom -1) vira um conto de medo e o aviso ao jogador é de cuidado ("warn")', !!tale && tale.tone === -1 && tale.r === 'Isso não se pergunta.' && out.ev.some((x) => x.k === 'toast' && x.tone === 'warn' && /Tupã respondeu a Gente2: “Isso não se pergunta\.”/.test(x.text)), tale && tale.tone);
      check('a primeira resposta de todas entra na Crônica com a pergunta, a resposta e o nome de Deus', chronHas(S, /No rito, Gente2 perguntou: “Para onde foi Fulano\?” E Tupã respondeu: “Isso não se pergunta\.” Foi a primeira vez que o povo ouviu uma resposta\./));
      faz(S, ps, 'morte', 0);
      check('a segunda resposta (dentro do intervalo de CONTO_GAP_D dias) não vira outro conto de visão e a Crônica não repete a "primeira vez"', S.memoria.contos.filter((c) => c.k === 'visao').length === 1 && S.chron.filter((c) => /Foi a primeira vez que o povo ouviu/.test(c.text)).length === 1 && S.stats.respostas === 2);
    }
    {
      // o que a janela mostra
      const { S, ps } = novo();
      check('sem pergunta na fila não há o que mostrar (pending e pendingInfo nulos)', M.pending(S) === null && M.pendingInfo(S) === null);
      const bons = [];
      for (const q of Object.keys(M.Q)) {
        S.memoria.pend.push({ k: 'visao', q, pid: ps[0].id, part: ps.map((p) => p.id), c: CC[q] || {}, t: S.t, until: S.t + 600 });
        const info = M.pendingInfo(S), pd = M.pending(S);
        const bom = info.k === 'visao' && info.title === 'Uma pergunta na fumaça' && info.opts.length === 3 && JSON.stringify(info.opts) === JSON.stringify(M.Q[q].a.map((x) => x.t)) && info.quiet === 'Ficar em silêncio' && info.lead.indexOf(ps[0].name) >= 0 && info.lead.indexOf(M.Q[q].q(CC[q] || {})) >= 0 && pd.q === q;
        if (!bom) bons.push(q);
        S.memoria.pend.shift();
      }
      check('para cada uma das 8 perguntas a janela traz o título, quem pergunta e a fala, as 3 respostas da tabela e o "Ficar em silêncio"', bons.length === 0, bons.join());
      S.memoria.pend.push({ k: 'visao', q: 'fome', pid: ps[0].id, part: [ps[0].id], c: {}, t: S.t, until: S.t + 100 }, { k: 'visao', q: 'fera', pid: ps[0].id, part: [ps[0].id], c: {}, t: S.t, until: S.t + 700 });
      M.answer(S, 1);
      check('a fila anda uma por vez: responder a primeira deixa a segunda (que vira a mostrada)', M.pending(S) && M.pending(S).q === 'fera' && S.memoria.pend.length === 1);
    }
  }
  {
    // --- 27. o costume: o rito pesa na saúde de quem se apegou, e o costume esfria com o tempo ---
    const S = village(42, 12); calm(S); S.god.name = 'Tupã'; S.god.align = 0;
    for (const q of S.people) { q.traits = []; q.fe = 50; q.needs.saude = 90; }
    const [a, b, c, d] = [S.people[4], S.people[5], S.people[6], S.people[7]];
    // quem fica até o fim da roda: o sorteio decide a visão (abaixo de RITO_RUIM é visão ruim)
    const sentar = (p, sorteio) => withRng(S, [sorteio], () => M.done(S, p, { m: { k: 'rito' } }));
    a.rito = 1; sentar(a, 0.99);
    check('um rito comum: conta mais um (rito 2), guarda a hora e o dia, a ressaca dura RITO_RESSACA_H horas, a fé sobe RITO_FE, a saúde não muda e a lembrança é "viagem"', a.rito === 2 && a.ritoT === S.t && a.ritoDia === S.ck.day && a.ressaca === S.t + C.RITO_RESSACA_H * 60 && near(a.fe, 50 + C.RITO_FE, 1e-9) && a.needs.saude === 90 && hasMem(a, 'viagem') && !hasMem(a, 'visaoRuim'));
    b.rito = C.RITO_APEGO - 1; sentar(b, 0.99);
    check('chegando a RITO_APEGO (4) ritos a saúde paga RITO_APEGO_SAUDE (3) a cada rito', b.rito === C.RITO_APEGO && b.needs.saude === 90 - C.RITO_APEGO_SAUDE, b.needs.saude);
    c.rito = C.RITO_APEGO; sentar(c, 0.05);
    check('a visão ruim (sorteio de 0,05) tira RITO_SAUDE (6) a mais e deixa "visaoRuim" no lugar de "viagem"', c.needs.saude === 90 - C.RITO_APEGO_SAUDE - C.RITO_SAUDE && hasMem(c, 'visaoRuim') && !hasMem(c, 'viagem'), c.needs.saude);
    d.rito = 0; sentar(d, 0.2);
    const e2 = S.people[8]; e2.rito = C.RITO_APEGO; sentar(e2, 0.2);
    check('a chance da visão ruim é de 10% para quem ainda não se apegou e de 30% para quem já se apegou (com o sorteio em 0,2: só o apegado a tem)', hasMem(d, 'viagem') && !hasMem(d, 'visaoRuim') && hasMem(e2, 'visaoRuim') && !hasMem(e2, 'viagem') && d.needs.saude === 90);
    S.memoria.erva.lei = 'bencao';
    const f = S.people[9]; sentar(f, 0.99);
    check('com o rito abençoado a fé de quem senta sobe 1 a mais (RITO_FE + 1)', near(f.fe, 50 + C.RITO_FE + 1, 1e-9));
    // o costume esfria: um rito a cada RITO_ESQUECE_D dias sem rito
    const g = S.people[10];
    g.rito = 3; g.ritoT = S.t - C.RITO_ESQUECE_D * DAYM;
    M.daily(S);
    const igual = g.rito === 3;
    g.ritoD = S.t - C.RITO_ESQUECE_D * DAYM - 1;
    M.daily(S);
    check('o costume esfria um rito a cada RITO_ESQUECE_D (' + C.RITO_ESQUECE_D + ') dias (no dia exato, ainda não) e a contagem do esfriar recomeça', igual && g.rito === 2 && g.ritoD === S.t);
    g.rito = 1; g.ritoD = S.t - C.RITO_ESQUECE_D * DAYM - 1;
    M.daily(S);
    check('o último rito que esfria apaga a conta (sem rito e sem hora)', g.rito === undefined && g.ritoT === undefined && g.ritoD === undefined && !('rito' in g));
    // a falta: quem se apegou e passa RITO_FALTA_D dias sem rito sente falta
    const h = S.people[11];
    h.rito = C.RITO_APEGO; h.ritoT = S.t;
    const t0 = S.t;
    let dia = 0;
    for (let i = 1; i <= C.RITO_FALTA_D + 10 && !dia; i++) { S.t = t0 + i * DAYM; S.ck = Sim.clock(S.t); M.daily(S); if (hasMem(h, 'semRito')) dia = i; }
    check('quem se apegou (' + C.RITO_APEGO + ' ritos) e passa RITO_FALTA_D (' + C.RITO_FALTA_D + ') dias sem rito sente falta: lembrança "semRito" (a rotina diária dá a lembrança)', dia >= C.RITO_FALTA_D && dia <= C.RITO_FALTA_D + 1, dia ? 'no dia ' + dia : 'nunca, em ' + (C.RITO_FALTA_D + 10) + ' dias (rito ' + h.rito + ')');
  }
  {
    // --- 29. as missões da Memória e o save de antes da Memória ---
    const ids = (f) => M.missions(f).map((g) => g.id).join();
    check('as missões da Memória por fase: a 2 traz "m_conto"; a 3, "m_velar" e "m_flores"; a 4, "m_rito", "m_finados" e "m_reconto"; a 1 e a 5 não trazem nenhuma', ids(1) === '' && ids(2) === 'm_conto' && ids(3) === 'm_velar,m_flores' && ids(4) === 'm_rito,m_finados,m_reconto' && ids(5) === '', [1, 2, 3, 4, 5].map(ids).join(' | '));
    check('todas são opcionais (não seguram a fase), ainda por fazer, com texto e recompensa de Poder', [2, 3, 4].every((f) => M.missions(f).every((g) => g.opt === true && g.done === false && typeof g.text === 'string' && g.text.length > 8 && g.reward > 0)));
    const S = village(42, 8), par = { m_conto: 'contados', m_velar: 'velorios', m_flores: 'visitas', m_rito: 'respostas', m_finados: 'finados', m_reconto: 'recontos' };
    check('cada missão tem o seu teste, ligado ao seu número: falso com 0 e verdadeiro com 1 (conto contado, velório, visita à cova, resposta, dia dos mortos, reconto)', Object.keys(par).every((id) => { S.stats[par[id]] = 0; const a = M.goalTest[id](S); S.stats[par[id]] = 1; const b = M.goalTest[id](S); S.stats[par[id]] = 0; return a === false && b === true; }) && Object.keys(M.goalTest).length === 6);
    // pelas fases de um jogo novo: as missões entram quando a fase muda, e cumprir uma paga o Poder e avisa a tela
    const T0 = village(42, 8), fase = [];
    for (let i = 0; i < 3; i++) {
      for (const g of T0.goals) { g.done = true; g.paid = true; }
      T0.events.length = 0;
      Sim.checkGoals(T0);
      fase.push(T0.goalsPhase + ':' + T0.goals.filter((g) => /^m_(conto|velar|flores|rito|finados|reconto)$/.test(g.id)).map((g) => g.id).join('+'));
    }
    check('num jogo novo as missões entram quando a fase muda: fase 2 com m_conto, fase 3 com m_velar e m_flores, fase 4 com m_rito, m_finados e m_reconto', fase.join(' ') === '2:m_conto 3:m_velar+m_flores 4:m_rito+m_finados+m_reconto', fase.join(' '));
    const P = village(42, 8);
    P.goalsPhase = 4; P.goals = M.missions(3).map((g) => Object.assign({}, g));   // só as duas missões (na fase 4 nada mais muda de lugar)
    P.stats.velorios = 1;
    const poder0 = P.god.poder;
    P.events.length = 0;
    Sim.checkGoals(P);
    const gv = P.goals.find((g) => g.id === 'm_velar'), gf = P.goals.find((g) => g.id === 'm_flores');
    const aviso = P.events.filter((x) => x.k === 'goal').map((x) => x.id).join();
    Sim.checkGoals(P);
    check('com um velório feito a missão de velar se cumpre (e a de flores, não): paga o Poder da recompensa uma vez só e avisa a tela', gv.done === true && gv.paid === true && gf.done === false && P.god.poder - poder0 === gv.reward && aviso === 'm_velar', 'poder +' + (P.god.poder - poder0) + ', aviso ' + aviso);
    // o save de antes da Memória (0.4): abre com a Memória pronta, as missões da fase em que estava, e anda dois dias sem erro
    const bruto = () => JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8'));
    const old = Save.deserialize(bruto());
    const sp = old.memoria.erva.spots;
    check('save antigo: abre com a Memória pronta (corpos e contos vazios, nada de pergunta) e os canteiros da erva, com as plantas no mundo', !!old.memoria && old.memoria.corpos.length === 0 && old.memoria.contos.length === 0 && old.memoria.pend.length === 0 && sp.length === C.ERVA_SPOTS && sp.every((s) => { const o = W.objAt(old.world, s[1] * old.world.W + s[0]); return !!o && o.k === 'erva'; }) && ['velorios', 'enterros', 'visitas', 'finados', 'contos', 'contados', 'recontos', 'ritos', 'respostas'].every((k) => old.stats[k] === 0));
    check('save antigo na fase 2: ganha a missão da Memória dessa fase uma só vez (m_conto), mesmo depois de init de novo', old.goalsPhase === 2 && old.goals.filter((g) => g.id === 'm_conto').length === 1 && (M.init(old), old.goals.filter((g) => g.id === 'm_conto').length === 1) && old.stats.memMissions === true);
    const d4 = bruto(); d4.goalsPhase = 4;
    const old4 = Save.deserialize(d4);
    check('save antigo que já estava na fase 4: ganha as missões da Memória das fases 2, 3 e 4, uma de cada', ['m_conto', 'm_velar', 'm_flores', 'm_rito', 'm_finados', 'm_reconto'].every((id) => old4.goals.filter((g) => g.id === id).length === 1));
    let erro = '';
    try { days(old, 2); } catch (x) { erro = String(x && x.stack || x); }
    check('o save antigo anda dois dias sem erro, sem velório, sem pergunta e sem rito (a erva ainda não foi achada: Deus não passou do nível 1)', erro === '' && old.memoria.pend.length === 0 && old.stats.ritos === 0 && old.stats.velorios === 0 && !old.memoria.erva.known, erro.slice(0, 200));
    check('a Memória de um save antigo diz que o rito ainda é desconhecido', JSON.stringify(M.ritoInfo(old)) === '{"known":false}');
  }
  {
    // --- 30. o jogo fechado: 30 dias de Off.run numa aldeia que já conhece a erva, com um corpo esperando e o dia dos mortos no meio ---
    const S = village(42, 12); calm(S);
    S.god.lv = 2; S.god.name = 'Tupã';
    const e = S.memoria.erva; e.known = S.t; e.lei = 'livre';
    jump(S, 20, 6);
    const V = S.people[8];
    kill(S, V);
    const antes = !!V.corpo && S.memoria.corpos.length === 1;
    const res = G.Offline.run(S, 30 * DAYM);
    check('o dia 44 (último do outono) fica dentro dos 30 dias, e o jogo volta a abrir (S.safe e S.resumido desligados)', S.ck.day >= 50 && res.days === 30 && S.safe === false && !S.resumido, S.ck.day + ' ' + res.days);
    check('jogo fechado: não há rito, nem pergunta, nem resposta; a roda não fica marcada; o dia dos mortos não acontece', S.stats.ritos === 0 && S.stats.respostas === 0 && S.memoria.pend.length === 0 && S.memoria.erva.rite === null && S.stats.finados === 0 && !S.memoria.fin.on && S.stats.velorios === 0, S.stats.ritos + ' ritos, ' + S.stats.respostas + ' respostas, ' + S.stats.finados + ' finados');
    check('o corpo que esperava não fica para sempre: ninguém com corpo, sem corpos na lista e a cova existe (enterro sem cerimônia)', antes && S.people.every((p) => !p.corpo) && S.memoria.corpos.length === 0 && M.graves(S).length === 1 && !!V.cova && M.graves(S)[0].pid === V.id && !M.graves(S)[0].vel, M.graves(S).length + ' covas');
    // fechado de novo logo ao reabrir: o primeiro dia aberto volta a ter rito
    const dia = dryFrom(S, S.ck.day + 14, 2);
    jump(S, dia, 7);
    M.hourly(S);
    check('aberto de novo, a aldeia volta a marcar rito no primeiro dia calmo depois do intervalo (a erva segue conhecida)', e.known > 0 && e.hoje === dia, 'hoje ' + e.hoje + ' / dia ' + dia);
  }
  {
    // --- 31. o save: a Memória cabe em pouco espaço, mesmo com os contos todos, e o rito ou o dia dos mortos em andamento não vão junto ---
    const S = village(42, 12); calm(S); S.god.name = 'Tupã';
    const kinds = ['cura', 'chuva', 'calor', 'raioFera', 'castigo', 'sonho', 'nome', 'escolhido', 'estatua', 'especie', 'saber', 'chamado', 'visao', 'silencio', 'promessa'];
    const longa = M.Q.morte.a[1].t;
    for (const k of kinds) M.deed(S, k, { a: 'Maíra Tupinambá', sx: 'F', x1: 'lobos', r: longa });
    S.t += C.CONTO_GAP_D * DAYM + 1; S.ck = Sim.clock(S.t);
    for (const k of ['cura', 'chuva', 'calor']) M.deed(S, k, { a: 'Maíra Tupinambá', sx: 'F' });
    // e a vida da Memória: um corpo no velório, uma cova, a erva achada, uma promessa, uma pergunta, o rito e o dia dos mortos abertos
    const V = S.people[4], P = S.people[5];
    F.link(S, V, P, 60);
    kill(S, V);
    const e = S.memoria.erva, fogo = L.campFire(S, true);
    e.known = S.t; e.lei = 'bencao'; e.last = S.t - DAYM; e.hoje = S.ck.day; e.cond = P.id; e.conv = [P.id]; e.tem = S.ck.day;
    e.rite = { t0: S.t, fire: fogo.id, part: [P.id], fez: 1, asked: true, on: true };
    S.memoria.fin = { year: 2, on: true, foi: { [P.id]: 1 }, velas: S.t + 360, day: 44, x: 10, y: 11, n: 3 };
    S.memoria.prom.push({ k: 'fome', t: S.t, until: S.t + C.PROMESSA_D * DAYM });
    S.memoria.pend.push({ k: 'visao', q: 'porque', pid: P.id, part: [P.id], c: {}, t: S.t, until: S.t + 600 });
    const salvo = Save.serialize(S), mem = JSON.stringify(salvo.memoria);
    check('o save da Memória com ' + C.CONTO_MAX + ' contos (com os nomes e as falas mais compridas), um corpo, a erva, uma promessa e uma pergunta tem menos de 4000 caracteres', S.memoria.contos.length === C.CONTO_MAX && mem.length < 4000, mem.length + ' caracteres');
    check('o rito e o dia dos mortos em andamento não vão para o save (recomeçam ao abrir), e o que vai deles é só o ano, as velas e o dia', salvo.memoria.erva.rite === null && Object.keys(salvo.memoria.fin).sort().join() === 'day,velas,year' && salvo.memoria.fin.year === 2 && salvo.memoria.fin.day === 44);
    check('salvar não mexe no jogo aberto: o rito e o dia dos mortos seguem lá, com tudo', !!e.rite && e.rite.on === true && S.memoria.fin.on === true && S.memoria.fin.foi[P.id] === 1);
    const R = clone(S);
    const e2 = R.memoria.erva;
    check('ao abrir: a lei, o último rito, o dia marcado, a promessa, a pergunta e os contos voltam; a roda e o dia dos mortos, não', e2.lei === 'bencao' && e2.known === e.known && e2.last === e.last && e2.hoje === e.hoje && e2.rite === null && !R.memoria.fin.on && R.memoria.prom.length === 1 && R.memoria.pend.length === 1 && R.memoria.pend[0].q === 'porque' && R.memoria.contos.length === C.CONTO_MAX && JSON.stringify(R.memoria.contos) === JSON.stringify(S.memoria.contos));
    check('a lista de corpos e o corpo de quem estava no velório voltam, e as contas (velórios, enterros, contos, respostas) também', R.memoria.corpos.length === 1 && !!R.people.find((p) => p.id === V.id).corpo && R.stats.contos === S.stats.contos && R.stats.velorios === S.stats.velorios && R.stats.respostas === S.stats.respostas);
  }
  {
    // --- 17c. o mesmo conto só volta à roda depois de CONTO_REPETE_D dias ---
    C.CONTO_REPETE_D = REPETE;
    const S = village(42, 8); calm(S);
    S.god.lv = 2; S.god.name = 'Tupã';
    const c = M.deed(S, 'chuva', {}), p = S.people[2];
    const s1 = withRng(S, [0], () => M.storyFor(S, p));
    M.onStory(S, p, { conto: c.id }, [S.people[3]]);
    const s2 = withRng(S, [0], () => M.storyFor(S, p));
    S.t += REPETE * DAYM; S.ck = Sim.clock(S.t);
    const s3 = withRng(S, [0], () => M.storyFor(S, p));
    check('contado hoje, o mesmo conto só volta à roda depois de CONTO_REPETE_D (' + REPETE + ') dias (com um conto só, a noite seguinte é de outra história)', !!s1 && s1.conto === c.id && s2 === null && !!s3 && s3.conto === c.id && REPETE === 20);
    const c2 = M.deed(S, 'calor', {});
    const s4 = withRng(S, [0], () => M.storyFor(S, p));
    M.onStory(S, p, { conto: c.id }, [S.people[3]]);
    const s5 = withRng(S, [0], () => M.storyFor(S, p));
    check('com dois contos, a roda alterna: o que nunca foi contado primeiro, e na noite seguinte o outro', !!s4 && !!s5 && s4.conto === c2.id && s5.conto === c2.id);
  }
  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['bem', 'medo', 'largado'];
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
  const order = { bem: 0, medo: 1, largado: 2 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com a Memória (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    let recontos = 0, criados = 0, tementes = 0, confiantes = 0;
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  velórios ' + r.velorios + ' · enterros ' + r.enterros + ' · covas ' + r.covas + ' · sem cova ' + r.semCova + ' · cemitério ' + (r.cem || 'não') + ' · visitas ' + r.visitas + ' · dias dos mortos ' + r.finados + ' · velados em média por ' + r.velaram + ' pessoas');
      console.log('  contos ' + r.contos + ' (' + r.tipos + '; perdidos ' + r.perdidos + '; na segunda boca ou mais ' + r.gen2 + ') · contados ' + r.contados + ' · recontados por quem não viu ' + r.recontos + ' · criados nos contos: ' + r.criado);
      console.log('  erva no ano ' + (r.ervaAt || '-') + ' · lei ' + (r.lei || '-') + ' · ritos ' + r.ritos + ' · respostas ' + r.respostas + ' (' + r.perguntas + ') · apegados ' + r.apegados + ' · fé média ' + r.fe + ' · como veem Deus ' + r.align + ' · fome ' + r.hungry + '% · frio ' + r.cold + '% · save ' + r.save + ' car. (Memória ' + r.memSave + ')');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'no rito só adulto (18 anos de verdade), sem grávida', r.menores === 0, r.menores + ' vezes');
      check(tag + 'nenhum corpo fica esquecido (mais de ' + (C.CORPO_MAX_D + 2) + ' dias sem cova)', r.esquecidos === 0, r.esquecidos + ' vezes');
      check(tag + 'a Memória cabe em menos de 6000 caracteres no save', r.memSave < 6000, r.memSave);
      check(tag + 'cada morto tem cova, ou espera o enterro, ou ficou sem cova por não ter sido achado', r.covas + r.semCova + r.esperando === r.deaths.length, r.covas + ' covas, ' + r.semCova + ' sem cova, ' + r.esperando + ' esperando, ' + r.deaths.length + ' mortes');
      if (r.mode === 'largado') { check(tag + 'sem o jogador, a pergunta do rito fica sem resposta', r.respostas === 0, r.respostas); continue; }
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      if (YEARS < 20) continue;
      check(tag + 'os velhos morrem, o povo vela e enterra no cemitério', r.deaths.length >= 1 && r.velorios >= 1 && r.enterros >= 1 && r.covas >= 1 && !!r.cem, r.deaths.length + ' mortes, ' + r.velorios + ' velórios, ' + r.enterros + ' enterros');
      // o dia dos mortos só existe depois da primeira cova: conta os fins de outono que vieram depois dela (um ou outro
      // ano pode falhar: fera rondando, nevasca, alguém por enterrar)
      const fins = r.covaAno < 0 ? 0 : Math.max(0, YEARS - Math.max(0, Math.ceil(r.covaAno - 0.74)));
      check(tag + 'a família volta à cova, e o dia dos mortos vem todo ano depois da primeira cova', r.visitas >= 1 && r.finados >= Math.max(1, Math.floor(fins * 0.7)) && r.finados <= fins, r.visitas + ' visitas, ' + r.finados + ' dias dos mortos em ' + fins + ' fins de outono com cova (a primeira no ano ' + (r.covaAno + 1).toFixed(1) + ')');
      check(tag + 'o povo conta os feitos de Deus ao pé do fogo', r.contos >= 4 && r.contados >= 15, r.contos + ' contos, contados ' + r.contados + ' vezes');
      check(tag + 'a erva é achada antes do ano 10 e o rito vira costume', r.ervaAt > 0 && r.ervaAt < 10 && r.ritos >= 8, 'ano ' + r.ervaAt + ', ' + r.ritos + ' ritos');
      check(tag + 'o jogador responde às perguntas do rito', r.respostas >= 5, r.respostas);
      check(tag + (r.mode === 'bem' ? 'respondendo com cuidado, o povo vê um Deus bondoso' : 'respondendo com medo, o povo vê um Deus mais temido que o do cuidado'), r.mode === 'bem' ? r.align >= 0 : true, r.align);
      if (r.mode === 'bem') check(tag + 'com um Deus bondoso, quem chega aos ' + C.CRIADO_AGE + ' anos cresce confiante, e ninguém temente', r.confiantes >= 1 && r.tementes === 0, r.criado);
      recontos += r.recontos; criados += r.nCriados; tementes += r.tementes; confiantes += r.confiantes;
    }
    if (YEARS >= 20 && MODES.indexOf('bem') >= 0) {
      check('os contos passam a quem não viu (somando os mundos)', recontos >= 1, recontos + ' recontos');
      check('alguma criança cresce marcada pelos contos, temente ou confiante (somando os mundos)', tementes + confiantes >= 1, tementes + ' tementes, ' + confiantes + ' confiantes, de ' + criados + ' crianças criadas');
      const bem = results.filter((r) => r.mode === 'bem' && !r.errors.length), medo = results.filter((r) => r.mode === 'medo' && !r.errors.length);
      const avg = (a, f) => (a.length ? a.reduce((x, r) => x + f(r), 0) / a.length : 0);
      if (bem.length && medo.length) check('as respostas mudam como o povo vê Deus: com cuidado, mais bondoso que com medo (média dos mundos)', avg(bem, (r) => r.alignMed) > avg(medo, (r) => r.alignMed), avg(bem, (r) => r.alignMed).toFixed(1) + ' contra ' + avg(medo, (r) => r.alignMed).toFixed(1));
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
// aceita o nome e os dons, acolhe quem chega. Dois velhos chegam com o casal, para a morte de velhice vir cedo.
// "bem" responde sempre a primeira (abençoa o rito, responde com cuidado); "medo" deixa a erva com o povo e responde
// sempre a terceira; "largado" só ergue fogo e barraca, não atende oração e nunca responde
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t, from, max) => { const at = spot(S, t, from, max); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const vo = add(S, 'F', 'Vó Nena', 56), vovo = add(S, 'M', 'Vô Tião', 57);
  F.link(S, vo, vovo, 60);   // um casal: quem ficar volta à cova de quem se foi
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], menores: 0, esquecidos: 0, alignSum: 0, alignN: 0, perg: {} };
  const cuida = mode !== 'largado';
  let hours = 0, hungry = 0, cold = 0;
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S);
        const pend = () => S.buildings.some((b) => (!b.built && !b.site) || b.up);
        if (!pend() && have < need + 1 && S.stock.madeira >= 14) place('barraca');
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
          if (!busy && S.ctx.foodDays > 6) {
            if (T.buildOpen(S, 'armazem') && !has('armazem')) place('armazem');
            else if (T.buildOpen(S, 'marcenaria') && !has('marcenaria')) place('marcenaria');
            else if (T.buildOpen(S, 'tecelagem') && !has('tecelagem') && S.stock.fibra >= 6) place('tecelagem');
          }
        }
        let q;
        while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer.find((id) => D.DONS[id].side === 'bom') || q.offer[0]); }
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
            // a janela da Memória: a erva e a pergunta do rito
            let pd;
            while ((pd = M.pending(S))) {
              if (pd.k === 'visao') out.perg[pd.q] = (out.perg[pd.q] || 0) + 1;
              M.answer(S, mode === 'bem' ? 0 : pd.k === 'erva' ? 1 : 2);
            }
          }
        }
        S.events.length = 0;
        if (s % 30 === 0) {
          for (const p of S.people) {
            if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
            if (p.alive && p.act && p.act.type === 'memoria' && p.act.m && p.act.m.k === 'rito' && (F.age(S, p) < 18 || p.preg)) out.menores++;
            if (!p.alive && p.corpo && S.t - p.corpo.t > (C.CORPO_MAX_D + 2) * DAYM) out.esquecidos++;
          }
        }
      }
      out.alignSum += S.god.align; out.alignN++;
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, al = S.people.filter((p) => p.alive), dead = S.people.filter((p) => !p.alive), m = S.memoria, gs = M.graves(S);
  const info = M.contosInfo(S), cem = M.cemetery(S);
  const tipos = {}; for (const c of m.contos) tipos[c.k] = (tipos[c.k] || 0) + 1;
  const cr = { temente: 0, confiante: 0, livre: 0 }; for (const p of al) if (p.criado) cr[p.criado]++;
  const salvo = Save.serialize(S);
  Object.assign(out, {
    alive: al.length, births: st.births || 0, deaths: dead.map((p) => p.cause),
    velorios: st.velorios, enterros: st.enterros, visitas: st.visitas, finados: st.finados, covas: gs.length, semCova: dead.filter((p) => p.semCova).length, esperando: dead.filter((p) => p.corpo).length,
    velaram: gs.length ? (gs.filter((o) => o.vel).length + '/' + gs.length + ' covas') : '-', cem: cem ? 'nível ' + (cem.lv || 1) : '',
    contos: st.contos, contados: st.contados, recontos: st.recontos, perdidos: info.filter((c) => c.perdido).length, gen2: info.filter((c) => c.gen >= 1).length,
    tipos: Object.keys(tipos).map((k) => k + ' ' + tipos[k]).join(', ') || '-',
    covaAno: (() => { const gs = M.graves(S).filter((o) => o.t); return gs.length ? +(Math.min.apply(null, gs.map((o) => o.t)) / Y).toFixed(2) : -1; })(),
    criado: 'temente ' + cr.temente + ', confiante ' + cr.confiante + ', sem marca ' + cr.livre, nCriados: cr.temente + cr.confiante + cr.livre, tementes: cr.temente, confiantes: cr.confiante,
    ervaAt: m.erva.known ? +(m.erva.known / Y).toFixed(1) : 0, lei: m.erva.lei, ritos: st.ritos, respostas: st.respostas, perguntas: Object.keys(out.perg).map((k) => k + ' ' + out.perg[k]).join(', ') || '-',
    apegados: al.filter((p) => (p.rito || 0) >= C.RITO_APEGO).length, fe: al.length ? Math.round(al.reduce((a, p) => a + p.fe, 0) / al.length) : 0, align: Math.round(S.god.align), alignMed: out.alignN ? out.alignSum / out.alignN : 0,
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    save: JSON.stringify(salvo).length, memSave: JSON.stringify(salvo.memoria).length,
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
