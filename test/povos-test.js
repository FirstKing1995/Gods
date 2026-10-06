// Gods · testes da Etapa 12 (povos e minas). Uso: node test/povos-test.js [anos | u] [modos]
// 1) unidades: os povos (corpo, dons, fraqueza, idade do corpo), os mestiços (sangue, dons, aparência, diluição), a
//    convivência (conversa, briga, festa, casal, filho, a união), as caravanas (quem vem primeiro, acolher, mandar
//    seguir, a volta, o chamado de Deus), a mina (lugar, turno, sorte por nível), a forja (quem forja, ferro, joias),
//    as ferramentas de ferro, a oferenda e a troca, demolir e mudar obras de lugar, o tom do mundo, o save, e que num
//    mundo só de humanos nada disto mexe na simulação
// 2) 20 anos em três mundos: "acolhe" (aceita quem chega), "recusa" (manda seguir) e "chama" (acolhe, Deus chama os
//    povos e o povo abre mina e ferraria, com as melhorias): ninguém morre de fome ou de frio, os povos chegam, nascem
//    mestiços, a convivência sobe devagar e cada par de povos se une uma vez só, sai ferro e joia da forja
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Campo: K, Narr: N, Deus: D, Povos: Pv, Minas: Mi, Obras: O, Bichos: B } = G;
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
// a caravana de um povo: sai de manhã, chega e espera resposta (devolve o grupo)
function caravan(S, kind) {
  S.povos.due = kind; S.povos.called = true;
  setHour(S, 8);
  for (let i = 0; i < 720 && !N.pending(S); i++) { Sim.step(S, 2); S.events.length = 0; }
  return N.pending(S);
}
const alive = (S) => S.people.filter((p) => p.alive);
const of = (S, kind) => alive(S).filter((p) => Pv.of(p) === kind);
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const clone = (S) => Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== unidades =====================
  {
    // --- um mundo só de humanos: nada muda ---
    const S = village(42, 6);
    const iara = S.people[0];
    check('humano puro não carrega povo, sangue nem dons próprios', !iara.povo && !iara.sangue && !iara.dons && !iara.velho && Pv.of(iara) === 'humano' && Pv.donsOf(iara).join() === 'acolhedor,versatil,sangue');
    check('mundo só de humanos: sem mistura, a idade do corpo é a de verdade, o corpo é o de sempre', !Pv.mixed(S) && F.bodyAge(S, iara) === F.age(S, iara) && F.needMult(S, iara).fome === 1 && Pv.xp(S, iara) === 1 && Pv.pair(S, iara, S.people[1]) === 100);
    check('os três povos de fora: três dons e uma fraqueza cada, e nomes próprios', Pv.OUTROS.every((k) => Pv.DEF[k].dons.length === 3 && Pv.DEF[k].dons.every((d) => Pv.DONS[d]) && Pv.FRAQ[Pv.DEF[k].fraq] && Pv.NAMES[k].F.length >= 8 && Pv.NAMES[k].M.length >= 8));
    const all = [].concat(...Pv.OUTROS.map((k) => Pv.NAMES[k].F.concat(Pv.NAMES[k].M)));
    check('nenhum nome repetido entre os povos', new Set(all).size === all.length, all.length);

    // --- gente de cada povo ---
    const elfa = add(S, 'F', 'Ilanê', 30, 'elfo'), anao = add(S, 'M', 'Durgo', 30, 'anao'), fera = add(S, 'M', 'Rauã', 30, 'fera');
    check('elfa: povo, sangue, velhice aos 150, orelha pontuda e as cores dos elfos', elfa.povo === 'elfo' && elfa.sangue.elfo === 1 && elfa.velho === 150 && elfa.look.orelha === 2 && Sim.POVO_LOOK.elfo.skin.indexOf(elfa.look.skin) >= 0 && Pv.label(elfa) === 'elfa');
    check('a idade: 30 anos de corpo num elfo são 56 de verdade; num fera, 27', F.age(S, elfa) === 56 && F.bodyAge(S, elfa) === 30 && F.age(S, fera) === 27 && Math.abs(F.bodyAge(S, fera) - 30) <= 1 && Math.abs(F.bodyAge(S, anao) - 30) <= 1 && F.bodyAge(S, iara) === F.age(S, iara), F.age(S, elfa) + ' e ' + F.age(S, fera));
    const velha = add(S, 'F', 'Sairê', 62, 'elfo');
    check('elfa de 156 anos é idosa; a de 56, adulta', F.stage(S, velha) === 'idoso' && F.age(S, velha) >= 150 && F.stage(S, elfa) === 'adulto', F.age(S, velha));
    check('o corpo: fera come 40% mais e sente metade do frio; anão anda mais devagar e carrega mais', near(F.needMult(S, fera).fome, 1.4) && near(F.needMult(S, fera).frio, 0.5) && near(F.walkFactor(S, anao), 0.88) && F.carryCap(S, anao) > F.carryCap(S, iara) && near(F.needMult(S, elfa).fome, 0.85));
    check('fraquezas: elfo não corta madeira, anão não pesca, e o resto pode', !F.canWork(S, elfa, 'madeira') && F.canWork(S, elfa, 'frutas') && !F.canWork(S, anao, 'pesca') && F.canWork(S, anao, 'madeira') && F.canWork(S, fera, 'pesca') && F.canWork(S, iara, 'madeira'));
    check('dons no trabalho: anão na pedra e na obra, elfo nas frutas, forja', near(Pv.speed(S, anao, 'pedra'), 1.6) && near(Pv.speed(S, anao, 'mina'), 1.6) && near(Pv.speed(S, anao, 'construir'), 1.4) && near(Pv.speed(S, elfa, 'frutas'), 1.5) && near(Pv.speed(S, anao, 'forja'), 1.6) && Pv.speed(S, fera, 'pedra') === 1);
    check('dons na caça e na luta: arqueiro, faro, garras', near(Pv.cacaHit(elfa), 0.2) && near(Pv.cacaReach(elfa), 1.2) && Pv.cacaMeat(fera) === 3 && near(Pv.lutaHit(fera), 0.25) && near(Pv.bite(fera), 0.5) && Pv.sight(elfa) === 2 && Pv.cacaHit(anao) === 0);
    check('o povo-fera luta sem lança (garras); o humano sem ferramenta, não', B.armed(S, Object.assign(fera, { tool: null })) && !B.armed(S, Object.assign(iara, { tool: null })));
    check('com outro povo na aldeia, o versátil (humano) aprende 15% mais depressa', Pv.mixed(S) && near(Pv.xp(S, iara), 1.15) && Pv.xp(S, anao) === 1);
    check('quem forja: o anão sempre; o humano, só com Ofício no nível 4', Pv.canForge(S, anao) && !Pv.canForge(S, iara) && (iara.skills.oficio = 16 * C.SKILL_XP_DIV, Pv.canForge(S, iara)));
    iara.skills.oficio = 0;

    // --- mestiços ---
    const dad = S.people[1];
    const b1 = F.makeBaby(S, elfa, dad, 'F', 'Mesti'); Pv.inherit(S, b1, elfa, dad);
    check('filha de elfa com humano: mestiça, meio a meio, orelha pequena', b1.povo === 'meio' && near(b1.sangue.elfo, 0.5) && near(b1.sangue.humano, 0.5) && b1.look.orelha === 1 && !b1.look.anao && Pv.label(b1) === 'mestiça de elfo e humano', JSON.stringify(b1.sangue));
    check('herda um dom de cada lado e a ponte, sem fraqueza', b1.dons.length === 3 && b1.dons[2] === 'ponte' && Pv.DEF.elfo.dons.indexOf(b1.dons[0]) >= 0 && Pv.DEF.humano.dons.indexOf(b1.dons[1]) >= 0 && Pv.fraqOf(b1) === null && F.canWork(S, Object.assign(b1, { born: S.t - 20 * Y }), 'madeira'), b1.dons.join());
    check('o Sangue bom do humano: a mestiça vive os anos do povo que vive mais', b1.velho === 150, b1.velho);
    const b2 = F.makeBaby(S, elfa, Object.assign(add(S, 'M', 'Taliel', 30, 'elfo'), {}), 'M', 'x'); Pv.inherit(S, b2, elfa, alive(S).find((p) => p.name === 'Taliel'));
    check('filho de dois elfos: elfo inteiro, com os dons do povo', b2.povo === 'elfo' && b2.sangue.elfo === 1 && !b2.dons && b2.look.orelha === 2 && b2.velho === 150);
    check('o nome do bebê de dois elfos vem dos nomes dos elfos', Pv.NAMES.elfo.F.indexOf(Pv.babyName(S, 'F', elfa, alive(S).find((p) => p.name === 'Taliel'))) >= 0 && Pv.babyName(S, 'F', elfa, dad) === null);
    const b3 = F.makeBaby(S, anao, fera, 'M', 'y'); Pv.inherit(S, b3, Object.assign(add(S, 'F', 'Brunda', 30, 'anao'), {}), fera);
    check('anã com fera: sem Sangue bom, vive a média (80)', b3.povo === 'meio' && b3.velho === 80 && b3.look.anao === 1 && b3.look.fera === 1, b3.velho);
    // a diluição: 1/2 → 1/4 → 1/8 → humano
    let q = b1, gen = [];
    for (let i = 0; i < 4; i++) { const c = F.makeBaby(S, q.sex === 'F' ? q : iara, dad, 'F', 'g' + i); Pv.inherit(S, c, q, dad); gen.push(c.povo || 'humano'); q = c; if (!c.sangue) break; }
    check('o sangue de fora se dilui: com um quarto ainda é mestiço; com um oitavo, humano de novo', gen.join() === 'meio,humano', gen.join());
    const h = F.makeBaby(S, iara, dad, 'F', 'h'); Pv.inherit(S, h, iara, dad);
    check('humano com humano: o bebê não ganha nada de povo', !h.povo && !h.sangue && !h.dons && !h.look.orelha);
    check('a fertilidade do casal: dois elfos 0,4; elfa com humano 0,63; dois feras 1,2', near(Pv.fert(elfa, velha), 0.4) && near(Pv.fert(elfa, dad), Math.sqrt(0.4), 1e-6) && near(Pv.fert(fera, fera), 1.2));

    // --- convivência ---
    const S2 = village(777, 6);
    const e2 = add(S2, 'F', 'Ilanê', 25, 'elfo'), a2 = add(S2, 'M', 'Durgo', 25, 'anao'), h2 = S2.people[0], h3 = S2.people[1];
    check('a convivência começa em 20; entre gente do mesmo povo é 100', Pv.conv(S2, 'elfo', 'humano') === 20 && Pv.conv(S2, 'elfo', 'anao') === 20 && Pv.pair(S2, h2, h3) === 100 && Pv.pair(S2, e2, h2) === 20);
    const cv = (x, y) => Pv.conv(S2, x, y);
    Pv.onChat(S2, e2, a2, 'papo');
    check('uma conversa entre elfa e anão soma 0,03', near(cv('elfo', 'anao'), 20 + C.CONV_CHAT) && C.CONV_CHAT === 0.03, cv('elfo', 'anao'));
    Pv.onChat(S2, e2, h2, 'papo');
    check('com um humano (acolhedor), o dobro', near(cv('elfo', 'humano'), 20 + 2 * C.CONV_CHAT), cv('elfo', 'humano'));
    Pv.onChat(S2, h2, h3, 'papo');
    check('conversa entre dois humanos não mexe em nada', near(cv('elfo', 'humano'), 20 + 2 * C.CONV_CHAT) && Object.keys(S2.povos.conv).length === 2);
    for (let i = 0; i < 40; i++) Pv.onChat(S2, e2, a2, 'ensino');
    check('o dia a dia tem teto: 0,2 por dia entre dois povos', near(cv('elfo', 'anao'), 20 + C.CONV_DAY, 1e-6) && C.CONV_DAY === 0.2, cv('elfo', 'anao'));
    for (let i = 0; i < 40; i++) Pv.onChat(S2, e2, h2, 'ensino');
    check('com os humanos, o povo acolhedor, o teto é metade maior', near(cv('elfo', 'humano'), 20 + C.CONV_DAY * C.CONV_DAY_HUM, 1e-6), cv('elfo', 'humano'));
    Pv.daily(S2);
    Pv.onChat(S2, e2, a2, 'papo');
    check('no dia seguinte o teto recomeça', near(cv('elfo', 'anao'), 20 + C.CONV_DAY + C.CONV_CHAT, 1e-6), cv('elfo', 'anao'));
    let c1 = cv('elfo', 'humano');
    Pv.onChat(S2, e2, h2, 'briga');
    check('uma briga tira 3', near(cv('elfo', 'humano'), c1 - 3, 1e-6), cv('elfo', 'humano'));
    check('povos que se estranham brigam mais e se juntam menos', Pv.fightMult(S2, e2, h2) > 1.3 && near(Pv.bondMult(S2, e2, h2), (c1 - 3) / 50, 1e-6) && Pv.fightMult(S2, h2, h3) === 1 && Pv.bondMult(S2, h2, h3) === 1);
    const b0 = [cv('elfo', 'humano'), cv('elfo', 'anao'), cv('anao', 'humano')];
    Pv.onParty(S2, [e2, a2, h2, h3], C.CONV_FESTA);
    check('a festa aproxima todos os povos que estavam nela, por fora do teto', near(cv('elfo', 'humano'), b0[0] + 1, 1e-6) && near(cv('elfo', 'anao'), b0[1] + 1, 1e-6) && near(cv('anao', 'humano'), b0[2] + 1, 1e-6));
    Pv.onGather(S2, [e2, a2, h2, h3], C.CONV_HISTORIA);
    check('a história ao pé do fogo soma 0,15 a cada par que ouviu, dentro do teto', near(cv('elfo', 'humano'), b0[0] + 1 + 0.15, 1e-6) && near(cv('anao', 'humano'), b0[2] + 1 + 0.15, 1e-6) && cv('elfo', 'anao') < b0[1] + 1 + 0.15 + 1e-6);
    c1 = cv('elfo', 'humano');
    Pv.onBond(S2, e2, h3);
    check('o primeiro casal de povos diferentes: +1 e a Crônica', near(cv('elfo', 'humano'), c1 + C.CONV_CASAL, 1e-6) && C.CONV_CASAL === 1 && S2.stats.casaisMistos === 1 && /primeiro casal de povos diferentes/.test(S2.chron[S2.chron.length - 1].text));
    const kid = F.makeBaby(S2, e2, h3, 'M', 'Ponte'); Pv.inherit(S2, kid, e2, h3); S2.people.push(kid); Pv.onBirth(S2, kid, e2, h3);
    check('o primeiro mestiço: +4 e a Crônica', near(cv('elfo', 'humano'), c1 + C.CONV_CASAL + C.CONV_FILHO, 1e-6) && C.CONV_FILHO === 4 && S2.stats.mesticos === 1 && /primeira criança de dois povos/.test(S2.chron[S2.chron.length - 1].text));
    kid.born = S2.t - 5 * Y;
    const c0 = Pv.conv(S2, 'elfo', 'humano');
    Pv.daily(S2);
    check('a ponte: cada mestiço soma 0,03 por dia', near(Pv.conv(S2, 'elfo', 'humano'), c0 + C.CONV_PONTE, 1e-6) && C.CONV_PONTE === 0.03);
    S2.povos.conv['elfo|humano'] = 99.9;
    Pv.onChat(S2, e2, h2, 'pazes');
    check('em 100, os dois povos viram um só (Crônica, lembrança, meta)', Pv.conv(S2, 'elfo', 'humano') === 100 && Pv.united(S2, 'elfo', 'humano') && S2.stats.unioes === 1 && /viraram um só/.test(S2.chron[S2.chron.length - 1].text) && Pv.goalTest.p_uniao(S2) && h2.mem.some((m) => m.k === 'povoUnido'));
    Pv.onChat(S2, e2, h2, 'briga'); Pv.onChat(S2, e2, h2, 'pazes'); Pv.onParty(S2, [e2, h2], C.CONV_FESTA);
    check('a união não se desfaz nem se repete: a briga já não afasta os dois povos', Pv.conv(S2, 'elfo', 'humano') === 100 && S2.stats.unioes === 1 && !Pv.united(S2, 'elfo', 'anao'));
    check('com a convivência alta, quase não se briga e os pares saem fácil', Pv.fightMult(S2, e2, h2) < 0.75 && Pv.bondMult(S2, e2, h2) === 1.5);
    const S2b = clone(S2);
    check('save: a união e o teto do dia voltam', Pv.united(S2b, 'elfo', 'humano') && S2b.stats.unioes === 1 && JSON.stringify(S2b.povos.day) === JSON.stringify(S2.povos.day));
    S2.povos.conv['anao|humano'] = 15.5;
    S2.events.length = 0;
    Pv.onChat(S2, a2, h2, 'briga');
    check('convivência muito baixa: o jogo avisa', S2.events.some((e) => e.k === 'toast' && /se estranhando/.test(e.text)));

    // --- as caravanas ---
    const S3 = village(9001, 8);
    const t = Pv.terrain(S3), first = Pv.nextKind(S3);
    check('quem vem primeiro depende do terreno em volta', Pv.OUTROS.indexOf(first) >= 0 && S3.povos.order[0] === first && Pv.OUTROS.every((k) => t[first] >= t[k] - 1e-9), first + ' ' + JSON.stringify(t));
    const g1 = caravan(S3, 'elfo');
    const info = g1 ? N.groupInfo(S3, g1.id) : null;
    check('a caravana dos elfos chega e espera resposta: casal, filho e um ou dois sem par', !!g1 && g1.kind === 'povo' && g1.povo === 'elfo' && info.people.length >= 4 && info.people.length <= 5 && info.people.filter((p) => p.role === 'mae' || p.role === 'pai').length === 2 && info.people.some((p) => p.role === 'filho' && p.age < 13), info ? info.people.map((p) => p.name + ' ' + p.age).join(', ') : '');
    check('todos com nome e aparência de elfo', info.people.every((p) => p.povo === 'elfo' && p.look.orelha === 2 && Pv.NAMES.elfo[p.sex].indexOf(p.name) >= 0));
    const n0 = alive(S3).length, seca0 = S3.stock.seca;
    N.decide(S3, g1.id, true);
    check('acolhidos: entram na aldeia como elfos, com os presentes', of(S3, 'elfo').length === info.people.length && alive(S3).length === n0 + info.people.length && S3.stock.seca === seca0 + 15 && S3.povos.st.elfo.state === 'aqui' && Pv.mixed(S3) && S3.stats.povosAcolhidos === 1 && Pv.goalTest.p_acolher(S3));
    const mae = of(S3, 'elfo').find((p) => p.sex === 'F' && F.partners(S3, p).length), filho = of(S3, 'elfo').find((p) => p.mother);
    check('o casal chega junto e o filho é deles', !!mae && !!filho && filho.mother === mae.id && F.age(S3, filho) < 13);
    check('com os elfos e a lança, o povo ganha o arco', T.known(S3, 'arco') && S3.tech.known.arco.how === 'povo');
    const g2 = caravan(S3, 'anao');
    N.decide(S3, g2.id, true);
    check('os anões ensinam a mineração e a metalurgia, e trazem ferro, minério e carvão', Mi.known(S3, 'mineracao') && Mi.known(S3, 'metalurgia') && S3.tech.known.mineracao.how === 'povo' && S3.stock.ferro + alive(S3).filter((p) => p.tool && p.tool.fe).length === 3 && S3.stock.minerio === 4 && S3.stock.carvao === 4);
    const g3 = caravan(S3, 'fera');
    const dead0 = S3.chron.length;
    N.decide(S3, g3.id, false);
    check('mandados seguir: vão embora, ficam de voltar uma vez', of(S3, 'fera').length === 0 && S3.povos.st.fera.state === 'recusado' && S3.povos.st.fera.n === 1 && S3.chron.length > dead0);
    check('antes de 180 dias não voltam; depois, voltam', Pv.nextKind(S3) === null && (S3.povos.st.fera.at = S3.t - 181 * DAYM, Pv.nextKind(S3) === 'fera'));
    days(S3, 1);
    const g4 = caravan(S3, 'fera');
    N.decide(S3, g4.id, false);
    check('mandados seguir duas vezes: só voltam se Deus chamar', S3.povos.st.fera.n === 2 && (S3.povos.st.fera.at = S3.t - 400 * DAYM, Pv.nextKind(S3) === null));
    // o chamado
    S3.god.lv = 1; S3.god.poder = 1000;
    check('chamar pede o nível 2 de Deus', /nível 2/.test(Pv.callWhy(S3, 'fera')));
    S3.god.lv = 2; S3.god.poder = 100;
    check('chamar pede 300 de Poder', /faltam 200/.test(Pv.callWhy(S3, 'fera')));
    S3.god.poder = 1000;
    days(S3, 1);
    const whyCall = Pv.callWhy(S3, 'fera');
    check('com nível e Poder, Deus chama: o Poder sai e a caravana fica para sair', whyCall === '' && Pv.call(S3, 'fera') && S3.god.poder < 1000 && S3.povos.due === 'fera', whyCall + ' · Poder ' + Math.round(S3.god.poder));
    setHour(S3, 8);
    for (let i = 0; i < 720 && !N.pending(S3); i++) { Sim.step(S3, 2); S3.events.length = 0; }
    const g5 = N.pending(S3);
    N.decide(S3, g5.id, true);
    check('a caravana chamada chega; com os três acolhidos, a meta dos quatro povos fecha', !!g5 && of(S3, 'fera').length >= 4 && Pv.goalTest.p_tres(S3));
    // a agenda
    const S4 = village(42, 8);
    S4.stats.eraEnd = S4.t;
    Pv.daily(S4);
    check('a primeira caravana fica marcada para 20 a 40 dias depois de a aldeia se formar', S4.povos.next >= S4.t + 20 * DAYM && S4.povos.next <= S4.t + 40 * DAYM, ((S4.povos.next - S4.t) / DAYM).toFixed(1) + ' dias');
    S4.t = S4.povos.next + 10; S4.ck = Sim.clock(S4.t);
    Pv.daily(S4);
    check('chegado o dia, a caravana fica para sair de manhã', S4.povos.due === Pv.nextKind(S4) && !!S4.povos.due, S4.povos.due);
    S4.safe = true; const due = S4.povos.due; S4.povos.due = null; Pv.daily(S4);
    check('com o jogo fechado ninguém chega', S4.povos.due === null);
    S4.safe = false; S4.povos.due = due;
    // save
    const S5 = clone(S3);
    check('save: os povos, a convivência, o sangue e os dons voltam', JSON.stringify(S5.povos.st) === JSON.stringify(S3.povos.st) && JSON.stringify(S5.povos.conv) === JSON.stringify(S3.povos.conv) && of(S5, 'elfo').length === of(S3, 'elfo').length && of(S5, 'anao').every((p) => p.velho === 110 && p.sangue.anao === 1) && Pv.mixed(S5));
    const old = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
    check('save antigo: abre com os povos por vir e o estoque de metais zerado', !!old.povos && old.povos.st.elfo.state === 'longe' && old.stock.ferro === 0 && old.stock.ouro === 0 && !Pv.mixed(old) && (days(old, 1), true));
  }

  // --- minas e metais ---
  {
    const S = village(42, 8);
    check('a mineração pede a cerâmica; a metalurgia pede a mineração', !Mi.isOpen(S, 'mineracao') && (S.tech.known.ceramica = { t: S.t, by: 'teste', how: 'pratica' }, Mi.isOpen(S, 'mineracao')) && !Mi.isOpen(S, 'metalurgia'));
    const p0 = S.people[2];
    Mi.onWork(S, p0, { type: 'pedra', stage: 'work' }, 60);
    check('quebrar pedra ensina a mineração (1,2 por hora)', near(S.tech.prat.mineracao, 1.2) && near(S.tech.whoMina.mineracao[p0.id], 1.2) && near(T.progress(S, 'mineracao'), 1.2 / C.MINA_NEED.mineracao));
    S.tech.prat.mineracao = C.MINA_NEED.mineracao + 1;
    for (let i = 0; i < 40 && !Mi.known(S, 'mineracao'); i++) Mi.daily(S);
    check('com a prática cheia, alguém tem a ideia: nasce a mineração, na Crônica', Mi.known(S, 'mineracao') && S.tech.known.mineracao.by === p0.name && /nasceu a mineração/.test(S.chron[S.chron.length - 1].text));
    check('a mina aparece em Construir e a Vontade Mineração abre', T.buildOpen(S, 'mina') && T.workOpen(S, 'mina') && !T.buildOpen(S, 'ferraria'));
    S.tech.prat.metalurgia = C.MINA_NEED.metalurgia * 0.6;
    check('a Revelação serve para a metalurgia', T.revealable(S, 'metalurgia') && T.revealTarget(S) === 'metalurgia' && T.reveal(S, p0) === 'metalurgia' && Mi.known(S, 'metalurgia') && T.buildOpen(S, 'ferraria'));
    // o lugar da mina
    const why = Sim.canPlace(S, 'mina', S.camp.x + 4, S.camp.y + 3);
    const at = spot(S, 'mina', 2, 90);
    check('a mina pede serra: colina, montanha ou pedras por perto', (why === '' || /Pede colina/.test(why)) && !!at && O.envOk(S, { x: at.x, y: at.y, w: 2, h: 2 }, 'serra'), why || 'cabe ao lado do estoque');
    const mina = Sim.placeBlueprint(S, 'mina', at.x, at.y);
    Sim.complete(S, mina);
    check('mina pronta: dois mineiros por vez no nível 1, a meta fecha, a Crônica conta', mina.built && Mi.cap(mina) === 2 && Mi.goalTest.m_mina(S) && /primeira mina/.test(S.chron[S.chron.length - 1].text));
    // a sorte por nível
    const rate = (lv, k, who) => { const b = { type: 'mina', lv, kind: null }; let n = 0; for (let i = 0; i < 4000; i++) if (Mi.yield(S, who || p0, b)[k]) n++; return n / 4000; };
    const r1 = { c: rate(1, 'carvao'), m: rate(1, 'minerio'), p: rate(1, 'prata'), o: rate(1, 'ouro') }, r3 = { p: rate(3, 'prata'), o: rate(3, 'ouro'), g: rate(3, 'gemas') };
    check('mina rasa: pedra sempre, carvão em 45% dos turnos, minério em 30%, e nada que brilhe', Mi.yield(S, p0, mina).pedra === 4 && near(r1.c, 0.45, 0.04) && near(r1.m, 0.3, 0.04) && r1.p === 0 && r1.o === 0, JSON.stringify(r1));
    check('mina de veio: prata em 20%, ouro em 10%, pedra preciosa em 7%', near(r3.p, 0.2, 0.03) && near(r3.o, 0.1, 0.025) && near(r3.g, 0.07, 0.02), JSON.stringify(r3));
    const anao = add(S, 'M', 'Durgo', 30, 'anao');
    const ra = rate(3, 'ouro', anao);
    check('a mão de pedra do anão acha 40% mais', ra > r3.o * 1.15 && near(ra, 0.14, 0.03), ra);
    // o turno de verdade
    S.vontades = Object.assign(S.vontades, { mina: 3, frutas: 0, pesca: 0, madeira: 0, pedra: 0, agua: 1, caca: 0, oficio: 0, construir: 0 });
    Sim.refresh(S);
    check('com a mina de pé, a Vontade Mineração pesa; sem mina com vaga, não', Mi.want(S) > 0 && AI.scoreList(S, p0).some((c) => c.type === 'mina'));
    const pedra0 = S.stock.pedra;
    setHour(S, 7);
    let inside = 0;
    days(S, 2, () => { inside = Math.max(inside, Mi.inside(S, mina)); });
    check('dois dias de mina: turnos feitos, pedra no estoque, e nunca mais de dois lá dentro', S.stats.minaTurnos >= 4 && S.stock.pedra >= pedra0 + S.stats.minaTurnos * 4 - 8 && inside <= 2 && inside >= 1, S.stats.minaTurnos + ' turnos, ' + (S.stock.pedra - pedra0) + ' de pedra, até ' + inside + ' de cada vez');
    check('quem minera aprende Mineração, e a ferramenta gasta', alive(S).some((p) => p.skills.mineracao > 1) && near(T.speed(S, Object.assign({}, p0, { tool: { dur: 50 } }), 'mina'), C.TOOL_BONUS));
    check('carvão e minério entram na Crônica na primeira vez', !S.stats.minaGot.carvao || S.chron.some((c) => /primeiro carvão/.test(c.text)));
    build(S, 'marcenaria', 3);   // a mina funda pede tábuas
    const upOk = Sim.startUpgrade(S, mina); Sim.complete(S, mina);
    check('a mina funda: três mineiros e a sorte do nível 2', upOk &&  Mi.cap(mina) === 3 && Sim.def(mina).mine.lv === 2 && Sim.def(mina).name === 'Mina funda');

    // a forja
    S.vontades = Object.assign(S.vontades, { mina: 0, oficio: 3 });
    const fer = build(S, 'ferraria', 3);
    check('ferraria pronta: a meta fecha', !!fer && fer.built && Mi.goalTest.m_ferraria(S) && Mi.forge(S) === fer);
    Object.assign(S.stock, { minerio: 0, carvao: 0, ferro: 0 });
    check('sem minério, a forja não tem o que fazer', Mi.plans(S).length === 0);
    Object.assign(S.stock, { minerio: 12, carvao: 6 });
    const plans = Mi.plans(S);
    check('com minério e carvão, o plano é ferro', plans.length === 1 && plans[0].k === 'ferro' && plans[0].b === fer && plans[0].gap >= 5);
    const pa = O.oficioPlan(S, anao), ph = O.oficioPlan(S, p0);
    check('o trabalho da forja só entra para quem sabe forjar', !!pa && pa.k === 'ferro' && (!ph || ph.k !== 'ferro'), (pa && pa.k) + ' e ' + (ph && ph.k));
    setHour(S, 7);
    days(S, 2);
    check('dois dias de forja: o anão faz ferramentas de ferro, que saem do minério e do carvão', S.stats.ferroMade >= 2 && S.stock.minerio < 12 && S.stock.carvao < 6 && Mi.goalTest.m_ferro(S) && S.chron.some((c) => /primeira ferramenta de ferro/.test(c.text)), S.stats.ferroMade + ' feitas · minério ' + S.stock.minerio + ', carvão ' + S.stock.carvao + ' · ' + S.chron.slice(-3).map((c) => c.text.slice(0, 50)).join(' | '));
    const fe = alive(S).filter((p) => p.tool && p.tool.fe);
    check('quem passa pelo estoque troca a de pedra pela de ferro', fe.length >= 1 && fe.length + S.stock.ferro === S.stats.ferroMade, fe.length + ' na mão, ' + S.stock.ferro + ' guardadas');
    const pf = Object.assign({}, p0, { tool: { dur: 100, fe: 1 } }), ps = Object.assign({}, p0, { tool: { dur: 100 } });
    check('a de ferro rende mais (1,45; machado 1,9) que a de pedra (1,2; 1,6)', near(T.speed(S, pf, 'pedra'), C.FERRO_BONUS) && near(T.speed(S, ps, 'pedra'), C.TOOL_BONUS) && (S.tech.known.machado = { t: 0, by: '', how: '' }, near(T.speed(S, pf, 'madeira'), C.FERRO_MACHADO) && near(T.speed(S, ps, 'madeira'), C.MACHADO_BONUS)));
    T.useTool(S, pf, 60, C.TOOL_WEAR_H); T.useTool(S, ps, 60, C.TOOL_WEAR_H);
    check('e gasta um terço', near(100 - pf.tool.dur, (100 - ps.tool.dur) * C.FERRO_WEAR, 1e-6), (100 - pf.tool.dur).toFixed(2) + ' contra ' + (100 - ps.tool.dur).toFixed(2));
    check('na luta: a lança de ferro acerta mais e segura melhor a mordida', near(B.hitChance(S, pf) - B.hitChance(S, ps), C.FERRO_LUTA) && near(T.biteMult(S, pf), C.LANCA_BITE * C.FERRO_BITE) && near(T.biteMult(S, ps), C.LANCA_BITE));
    const noTool = Object.assign({}, p0, { tool: null });
    S.stock.ferro = 1; S.stock.ferramentas = 5;
    T.useTool(S, noTool, 1, 1);
    check('quem está sem ferramenta pega primeiro a de ferro', noTool.tool.fe === 1 && S.stock.ferro === 0 && S.stock.ferramentas === 5);
    // joias
    const upF = Sim.startUpgrade(S, fer); Sim.complete(S, fer);
    check('a ferraria ganha o ourives', upF && Sim.def(fer).name === 'Ferraria com ourives');
    Object.assign(S.stock, { minerio: 0, carvao: 0, prata: 2, ouro: 1, joias: 0 });
    check('com ourives e prata, o plano é joia', Sim.def(fer).shop.joias && Mi.plans(S).some((pl) => pl.k === 'joias'));
    setHour(S, 7);
    days(S, 2);
    const jo = alive(S).filter((p) => p.joia).length;
    check('o ourives faz joias, e os adultos passam a usar', S.stats.joiasMade >= 1 && jo + S.stock.joias === S.stats.joiasMade && jo >= 1 && S.stock.prata + S.stock.ouro === 3 - S.stats.joiasMade, S.stats.joiasMade + ' feitas, ' + jo + ' em uso');
    const wj = alive(S).find((p) => p.joia);
    const moodOf = (j) => { wj.joia = j; wj.mem = []; Object.assign(wj.needs, { fome: 90, sede: 90, energia: 90, calor: 90, social: 90, saude: 100 }); Sim.step(S, 60 - (S.t % 60) + 1); return wj.mood; };
    const m1 = moodOf(0), m2 = moodOf(1);
    check('quem usa joia tem o humor 3 pontos mais alto', m2 - m1 === C.JOIA_MOOD, m1 + ' → ' + m2);
    // oferenda e troca
    const st = build(S, 'estatua', 3) || (() => { const a2 = spot(S, 'fogueira', 4); const b = { id: S.nextBid++, type: 'estatua', lv: 1, kind: null, x: a2.x, y: a2.y, w: 2, h: 2, built: true, progress: 1, have: {}, fuel: 0, beds: [], up: null }; S.buildings.push(b); return b; })();
    Object.assign(S.stock, { prata: 3, ouro: 2, gemas: 1 });
    for (const p of alive(S)) p.joia = 1;
    const pod0 = S.god.poder, of0 = S.stats.oferendas;
    const got = Mi.offer(S, p0, st);
    check('a oferenda: primeiro a pedra preciosa (40 de Poder), uma por estátua por dia', got === 40 && S.stock.gemas === 0 && near(S.god.poder, pod0 + 40) && S.stats.oferendas === of0 + 1 && Mi.offer(S, p0, st) === 0);
    st.oferDay = -1;
    check('depois o ouro (20) e a prata (8)', Mi.offer(S, p0, st) === 20 && (st.oferDay = -1, S.stock.ouro = 0, Mi.offer(S, p0, st) === 8));
    for (const p of alive(S)) p.joia = 0;
    st.oferDay = -1; S.stock.prata = 2; S.stock.ouro = 0;
    check('com ourives e gente sem joia, a prata fica primeiro para ele', Mi.offer(S, p0, st) === 0 && S.stock.prata === 2);
    Object.assign(S.stock, { prata: 4, ouro: 1 });
    const pay = K.payFor(S, 20);
    check('o mascate aceita o que brilha: 20 de preço saem em ouro e prata', !!pay && (pay.ouro === 1 || pay.prata >= 1) && Object.keys(pay).every((k) => k === 'ouro' || k === 'prata'), JSON.stringify(pay));
    const S6 = clone(S);
    check('save: a mina, a forja, o estoque de metais, as ferramentas de ferro e as joias voltam', S6.buildings.some((b) => b.type === 'mina' && b.lv === 2) && S6.stock.prata === 4 && S6.stats.ferroMade === S.stats.ferroMade && alive(S6).filter((p) => p.tool && p.tool.fe).length === alive(S).filter((p) => p.tool && p.tool.fe).length && Mi.known(S6, 'metalurgia'));
  }

  // --- demolir e mudar de lugar ---
  {
    const S = village(777, 6);
    const tent = S.buildings.find((b) => b.type === 'barraca' && b.beds.length) || S.buildings.find((b) => b.type === 'barraca');
    days(S, 1);
    const t2 = S.buildings.find((b) => b.type === 'barraca' && b.beds.length);
    Sim.startUpgrade(S, t2); Sim.complete(S, t2);
    const tot = Sim.totalCost(t2);
    check('o que a obra custou até o nível dela', tot.cost.madeira === 26 && tot.cost.pedra === 8 && tot.work === 600, JSON.stringify(tot));
    check('obra pronta pode ser demolida e mudada; roça e curral não mudam', Sim.canDemolish(S, t2) && Sim.canMove(S, t2) && !Sim.canMove(S, { type: 'roca', built: true }) && !Sim.canDemolish(S, { type: 'barraca', built: false }));
    const empty = S.buildings.find((b) => b.type === 'barraca' && b !== t2);
    const mad0 = S.stock.madeira, nb = S.buildings.length;
    check('demolir marca a obra para o povo desmontar', Sim.startDemolish(S, empty) && empty.demol && empty.demol.work === Math.round(240 * C.DEMOL_WORK) && Sim.jobOf(empty).demol && S.ctx.jobDoable);
    check('não dá para melhorar o que está sendo demolido', Sim.upgrades(S, empty).length === 0 && !Sim.startUpgrade(S, empty));
    S.vontades.construir = 3;
    setHour(S, 8);
    days(S, 1);
    check('o povo desmonta: a obra sai do mapa e metade do material volta', !Sim.building(S, empty.id) && S.buildings.length === nb - 1 && S.stock.madeira >= mad0 + 7 - 20 && S.stats.demolished === 1 && S.chron.some((c) => /desmontou a barraca/.test(c.text)) && S.world.bgrid[empty.y * S.world.W + empty.x] === -1);
    const empty2 = S.buildings.find((b) => b.type === 'barraca' && b !== t2);
    Sim.startDemolish(S, empty2);
    check('desistir da demolição: a obra fica', Sim.cancelDemolish(S, empty2) && !empty2.demol && Sim.jobOf(empty2) === null);
    // mudar
    const at = spot(S, 'barraca', 7);
    const beds = t2.beds.slice(), lv = t2.lv;
    check('o lugar novo segue as regras de uma obra nova', Sim.canMoveTo(S, t2, at.x, at.y) === '' && Sim.canMoveTo(S, t2, t2.x, t2.y) !== '' && Sim.canMoveTo(S, t2, S.camp.x, S.camp.y) !== '');
    const site = Sim.startMove(S, t2, at.x, at.y);
    check('mudar: o lugar novo fica reservado e a obra é desmontada', !!site && site.site === t2.id && Sim.jobOf(site) === null && t2.demol.site === site.id && Sim.canPlace(S, 'barraca', at.x, at.y) !== '');
    const S7 = clone(S);
    check('save no meio da mudança: o lugar reservado e a demolição voltam', Sim.building(S7, site.id).site === t2.id && Sim.building(S7, t2.id).demol.site === site.id);
    const x0 = t2.x, y0 = t2.y;
    setHour(S, 8);
    let re = null;
    days(S, 2, () => { if (t2.re && !re) re = { have: Object.assign({}, t2.re.have), cost: t2.re.cost, built: t2.built, x: t2.x, y: t2.y }; });
    check('desmontada, a obra passa para o lugar novo com três quartos do material', !!re && re.x === at.x && re.y === at.y && !re.built && re.have.madeira === Math.floor(26 * 0.75) && re.have.pedra === 6 && re.cost.madeira === 26, JSON.stringify(re));
    check('erguida de novo: a mesma obra, no mesmo nível, com os mesmos moradores', t2.built && !t2.re && !t2.demol && t2.x === at.x && t2.y === at.y && t2.lv === lv && beds.every((id) => t2.beds.indexOf(id) >= 0) && !Sim.building(S, site.id) && S.stats.moved === 1 && S.world.bgrid[y0 * S.world.W + x0] === -1 && S.world.bgrid[at.y * S.world.W + at.x] === t2.id);
    check('a Crônica conta a mudança', S.chron.some((c) => /mudou de lugar/.test(c.text)));
    const at2 = spot(S, 'barraca', 9), site2 = Sim.startMove(S, t2, at2.x, at2.y), n2 = S.buildings.length;
    Sim.removeBuilding(S, site2);
    check('tirar o lugar reservado cancela a mudança', !t2.demol && S.buildings.length === n2 - 1 && Sim.canPlace(S, 'barraca', at2.x, at2.y) === '');
  }

  // --- o tom do mundo ---
  {
    check('o tom: picante é o padrão; a chave antiga das noites picantes vira leve', F.tom({}) === 1 && F.tom({ opts: { picante: false } }) === 0 && F.tom({ opts: { tom: 'adulto' } }) === 2 && F.tom({ opts: { tom: 'leve', picante: true } }) === 0);
    check('adulto liga as noites; com o jogo fechado, nenhum tom liga', F.spicy({ opts: { tom: 'adulto' } }) && !F.spicy({ opts: { tom: 'adulto' }, safe: true }) && !F.spicy({ opts: { tom: 'leve' } }) && F.adulto({ opts: { tom: 'adulto' } }) && !F.adulto({}));
    const S = village(42, 6);
    S.opts = { tom: 'adulto' };
    const a = S.people[0], b = S.people[1], kidA = add(S, 'F', 'Nova', 15), kidB = add(S, 'M', 'Novo', 16);
    a.mood = b.mood = kidA.mood = kidB.mood = 5;
    const grace = C.FIGHT_GRACE_D; C.FIGHT_GRACE_D = 0;   // (no começo do mundo ninguém briga)
    const lines = new Set();
    for (let i = 0; i < 4000; i++) { const d = L.dialog(S, kidA, kidB); if (d && d.kind === 'briga') for (const ln of d.lines) lines.add(ln.text); }
    const rude = /porra|merda|cacete|desgraçad/;
    check('tom adulto: briga de menor de idade não tem palavrão', lines.size > 0 && ![...lines].some((t) => rude.test(t)), lines.size + ' falas');
    const adult = new Set();
    for (let i = 0; i < 4000; i++) { const d = L.dialog(S, a, b); if (d && d.kind === 'briga') for (const ln of d.lines) adult.add(ln.text); }
    check('tom adulto: briga entre adultos tem', [...adult].some((t) => rude.test(t)), adult.size + ' falas');
    C.FIGHT_GRACE_D = grace;
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }

  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const MODES = process.argv[3] ? process.argv[3].split(',') : ['acolhe', 'recusa', 'chama'];
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
  const order = { acolhe: 0, recusa: 1, chama: 2 };
  const done = () => {
    results.sort((a, b) => a.seed - b.seed || order[a.mode] - order[b.mode]);
    console.log('\n' + YEARS + ' anos com os povos (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    let mest = 0, ferro = 0, casais = 0, unioes = 0, joias = 0;
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos (${r.povo}) · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  caravanas: ' + r.caravans + ' · acolhidos ' + r.acolhidos + ' · mandados seguir ' + r.recusados + ' · chamados ' + r.chamados + ' · primeira no ano ' + (r.firstAt || '-') + ' · ordem ' + r.ordem);
      console.log('  convivência: ' + r.conv + ' · casais mistos ' + r.casais + ' · mestiços ' + r.mest + ' · uniões ' + r.unioes + (r.firstUnion ? ' (a primeira no ano ' + r.firstUnion + ')' : '') + ' · brigas ' + r.fights);
      console.log('  mina: ' + r.minas + ' (turnos ' + r.turnos + ', saiu ' + r.got + ') · ferraria ' + r.forjas + ' · ferro ' + r.ferro + ' · joias ' + r.joias + ' · oferendas ' + r.ofer + ' · mineração no ano ' + (r.minAt || '-') + ', metalurgia no ano ' + (r.metAt || '-') + ' · fome ' + r.hungry + '% · frio ' + r.cold + '%');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      if (YEARS >= 20) {
        if (r.mode === 'recusa') check(tag + 'mandando seguir, a aldeia segue só de humanos e as caravanas param', r.acolhidos === 0 && r.recusados >= 2 && r.caravans <= 6 && r.outros === 0, r.caravans + ' caravanas');
        else {
          check(tag + 'os povos chegam e ficam', r.acolhidos >= 2 && r.outros >= 4, r.acolhidos + ' povos, ' + r.outros + ' de fora vivos');
          check(tag + 'a convivência sobe do começo (20)', r.convMax > 40, r.conv);
          check(tag + 'cada par de povos se une uma vez só, e a união leva anos', r.unioes <= 6 && (!r.firstUnion || r.firstUnion - r.firstAt >= 2), r.unioes + ' uniões, a primeira ' + (r.firstUnion ? 'no ano ' + r.firstUnion + ' (caravana no ano ' + r.firstAt + ')' : 'ainda não saiu'));
        }
        if (r.mode === 'chama') {
          check(tag + 'Deus chama e os três povos moram na aldeia', r.chamados >= 1 && r.acolhidos === 3, r.chamados + ' chamados');
          check(tag + 'com os anões: mina aberta, ferraria de pé e ferro na mão', r.nMinas >= 1 && r.turnos > 20 && r.forjas >= 1 && r.ferro >= 3, r.turnos + ' turnos, ' + r.ferro + ' de ferro');
        }
      }
      mest += r.mest || 0; ferro += r.ferro || 0; casais += r.casais || 0; unioes += r.unioes || 0; joias += r.joias || 0;
    }
    if (YEARS >= 20) {
      check('nascem casais mistos e mestiços (somando os mundos que acolhem)', casais >= 2 && mest >= 1, casais + ' casais, ' + mest + ' mestiços');
      check('sai ferro da forja (nos mundos com anões)', ferro > 5, ferro);
      if (MODES.indexOf('chama') >= 0) check('com o ourives, saem joias (somando os mundos que chamam)', joias >= 3, joias);
      check('em 20 anos, em algum mundo, dois povos chegam a viver como um só', unioes >= 1, unioes + ' uniões somando os mundos');
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
// aceita o nome e os dons; "acolhe" aceita quem chega; "recusa" manda seguir; "chama" aceita, chama os povos assim que
// dá, e abre mina e ferraria quando o povo aprende
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = mode === 'recusa' ? 'recusar' : 'acolher';
  const place = (t, from, max) => { const at = spot(S, t, from, max); if (!at) return null; return Sim.placeBlueprint(S, t, at.x, at.y); };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], caravans: 0, firstAt: 0, convMax: 0, chamados: 0 };
  let hours = 0, hungry = 0, cold = 0;
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
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
          else if (mode === 'chama' && T.buildOpen(S, 'mina') && !has('mina')) { S.seen.fill(1); place('mina', 2, 70); }
          else if (mode === 'chama' && T.buildOpen(S, 'ferraria') && !has('ferraria')) place('ferraria', 3);
          else if (mode === 'chama' && has('mina')) { const m = S.buildings.find((x) => (x.type === 'mina' || x.type === 'ferraria') && x.built && !x.up && Sim.upgrades(S, x).some((o) => !o.why)); if (m) Sim.startUpgrade(S, m); }
        }
        if (has('mina')) S.vontades.mina = 2;
        let q;
        while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer.find((id) => D.DONS[id].side === 'bom') || q.offer[0]); }
        // Deus chama o povo que ainda não mora aqui (os anões primeiro: é com eles que vem o ferro)
        if (mode === 'chama' && S.povos) for (const k of ['anao', 'elfo', 'fera']) if (S.povos.st[k].state !== 'aqui' && !Pv.callWhy(S, k) && S.god.poder > C.POVO_CALL + 200 && al >= 6) { if (Pv.call(S, k)) out.chamados++; break; }
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        if (s % 15 === 0) {
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
        for (const e of S.events) if (e.k === 'narr' && e.ev === 'povo' && e.on) { out.caravans++; if (!out.firstAt) out.firstAt = +(S.t / Y).toFixed(1); }
        S.events.length = 0;
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      if (S.povos) for (const k in S.povos.conv) out.convMax = Math.max(out.convMax, S.povos.conv[k]);
      if (!out.firstUnion && S.stats.unioes) out.firstUnion = +(S.t / Y).toFixed(1);
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, al = S.people.filter((p) => p.alive), n = (S.povos && S.povos.n) || {};
  const yr = (id) => (S.tech.known[id] ? +(S.tech.known[id].t / Y).toFixed(1) : 0);
  Object.assign(out, {
    alive: al.length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    povo: ['humano', 'elfo', 'anao', 'fera', 'meio'].map((k) => (n[k] || 0) + ' ' + k).join(', '), outros: (n.elfo || 0) + (n.anao || 0) + (n.fera || 0) + (n.meio || 0),
    acolhidos: st.povosAcolhidos || 0, recusados: st.povosRecusados || 0, ordem: S.povos && S.povos.order ? S.povos.order.join(' > ') : '-',
    conv: S.povos ? Object.keys(S.povos.conv).map((k) => k + ' ' + Math.round(S.povos.conv[k])).join(', ') || '-' : '-',
    casais: st.casaisMistos || 0, mest: st.mesticos || 0, unioes: st.unioes || 0, fights: st.fights || 0,
    nMinas: S.buildings.filter((b) => b.type === 'mina' && b.built).length,
    minas: S.buildings.filter((b) => b.type === 'mina' && b.built).map((b) => 'nível ' + (b.lv || 1)).join(', ') || 0, turnos: st.minaTurnos || 0, got: JSON.stringify(st.minaGot || {}),
    forjas: S.buildings.filter((b) => b.type === 'ferraria' && b.built).length, ferro: st.ferroMade || 0, joias: st.joiasMade || 0, ofer: st.oferendas || 0, minAt: yr('mineracao'), metAt: yr('metalurgia'),
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
