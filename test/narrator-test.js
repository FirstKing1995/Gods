// Gods · testes do Narrador (Etapa 4). Uso: node test/narrator-test.js [anos]
// 1) unidades: personalidades, nevasca, seca, tempestade, lobos (fogo protege, crianças a salvo, limite de mordidas,
//    fuga, oração, Raio), andarilho, segundo casal, save, jogo fechado e saves antigos
// 2) 20 anos em três mundos com as três personalidades, jogando bem (acolhendo quem chega):
//    regras do diretor (nada grande no primeiro ano, nunca dois grandes seguidos, respiro depois de uma perda)
//    e o portão da etapa: nenhum silêncio longo depois do primeiro ano
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Narr: N, Save, AI } = G;
const Y = 60 * 1440, D = 1440;

// ---------- simulação longa (roda também dentro de um worker) ----------
function longRun(seed, kind, years) {
  const w = W.generate(seed), site = W.bestSite(w);
  const S = Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
  N.setKind(S, kind); S.narr.auto = 'acolher';
  const place = (t) => { for (let r = 2; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = S.camp.x + dx, y = S.camp.y + dy; if (!Sim.canPlace(S, t, x, y)) { Sim.placeBlueprint(S, t, x, y); return true; } } return false; };
  place('fogueira'); place('barraca');
  const notable = [], starts = [], deaths = [], bitesAt = [];
  let unsafeBites = 0, kidBites = 0, hours = 0, hungry = 0, cold = 0, adultAt = null;
  const t0 = Date.now();
  for (let d = 0; d < years * 60 && !S.over; d++) {
    if (d % 3 === 0) {
      const need = F.bedsNeeded(S), have = F.bedsTotal(S), pend = S.buildings.some((b) => !b.built || b.up);
      if (!pend && have < need + 1 && S.stock.madeira >= 14) place('barraca');
      else if (!pend && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
      Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
      S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
    }
    for (let s2 = 0; s2 < 720 && !S.over; s2++) {
      const aliveBefore = S.people.filter((p) => p.alive).length;
      Sim.step(S, 2);
      for (const e of S.events) {
        if (e.k === 'chron' || (e.k === 'narr' && (e.on || e.warn)) || (e.k === 'toast' && e.tone === 'good') || e.k === 'prayer') notable.push(S.t);
        if (e.k === 'narr' && e.on && N.EVENTS[e.ev]) starts.push({ t: S.t, k: e.ev });
        if (e.k === 'bite') {
          bitesAt.push(S.t);
          if (N.safeXY(S, e.x, e.y) && (!e.sp || e.sp === 'onca')) unsafeBites++;   // a luz do fogo guarda de lobo e de onça (jacaré e porco-do-mato não ligam para o fogo)
          // quem foi mordido: o evento diz (duas pessoas podem estar no mesmo ponto, e o bebê no colo fica no ponto de quem o carrega)
          const p = e.pid ? S.people.find((q) => q.id === e.pid) : S.people.find((q) => q.alive && !q.carriedBy && Math.abs(q.x - e.x) < 1e-6 && Math.abs(q.y - e.y) < 1e-6);
          if (p && F.age(S, p) < 12) kidBites++;
        }
      }
      S.events.length = 0;
      if (S.people.filter((p) => p.alive).length < aliveBefore) for (const p of S.people) if (!p.alive && p.diedAt === S.t) deaths.push({ t: S.t, cause: p.cause });
      if (s2 % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      if (adultAt === null && S.stats.firstAdult) adultAt = S.t;
    }
  }
  const n = S.narr, k = C.NARRADORES[kind];
  // regras do diretor, conferidas no registro
  const bad = n.log.filter((e) => N.EVENTS[e.k].bad);
  let bigTwice = 0;
  for (let i = 1; i < bad.length; i++) if (bad[i].big && bad[i - 1].big && bad[i].day - bad[i - 1].day < 2 * k.gap[1]) bigTwice++;
  const early = n.log.filter((e) => e.day < k.small || (e.day < k.start && e.k !== 'tempestade')).length;
  let noRest = 0;
  for (const dth of deaths) if (starts.some((s) => N.EVENTS[s.k].bad && s.t > dth.t && s.t - dth.t < 4 * D)) noRest++;
  let gap1 = 0, quiet = 0;
  for (let i = 1; i < notable.length; i++) {
    if (notable[i - 1] < Y) continue;
    const g = notable[i] - notable[i - 1];
    gap1 = Math.max(gap1, g);
    if (g > 12 * D) quiet++;
  }
  const couple = n.couple ? n.couple.state : '-';
  const alive = S.people.filter((p) => p.alive);
  return {
    seed, kind, years, alive: alive.length, births: S.stats.births || 0, deaths: deaths.map((x) => x.cause), counts: n.counts,
    bigTwice, early, noRest, gap1: gap1 / D, quiet, unsafeBites, kidBites, bites: bitesAt.length, couple, adultLate: adultAt === null || S.t - adultAt < 3 * D,
    hungry: hungry / Math.max(1, hours), cold: cold / Math.max(1, hours), sec: (Date.now() - t0) / 1000,
  };
}

if (!isMainThread) {
  const out = workerData.jobs.map((j) => longRun(j.seed, j.kind, j.years));
  parentPort.postMessage(out);
  return;
}

let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra ? ' · ' + extra : '')); };
function world(seed, kind) {
  const w = W.generate(seed), site = W.bestSite(w);
  const S = Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
  if (kind) N.setKind(S, kind);
  const put = (t) => { for (let r = 2; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = S.camp.x + dx, y = S.camp.y + dy; if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); b.built = true; b.progress = 1; if (t === 'fogueira') b.fuel = 8; return b; } } };
  put('fogueira'); put('barraca'); S.stats.firstFire = S.stats.firstTent = true;
  for (const p of S.people) { p.act = null; p.path = null; p.x = S.camp.x + 1.5; p.y = S.camp.y + 2.5; }
  S.arrived = true; Sim.refresh(S);
  return S;
}
function setClock(S, day, hour) { S.t = day * D + Math.round(hour * 60); S.ck = Sim.clock(S.t); Sim.refresh(S); }
function force(S, k, opts) { S.narr.plan = { k, warnAt: S.t, at: S.t, warned: true, opts: opts || {} }; N.hourly(S); }
const fireOf = (S) => S.buildings.find((b) => b.type === 'fogueira');
// um lugar livre a d tiles do fogo (para deixar alguém sozinho no escuro)
function spotAway(S, d) {
  const w = S.world, f = fireOf(S);
  for (let a = 0; a < 64; a++) {
    const ang = a / 64 * Math.PI * 2, x = Math.round(f.x + Math.cos(ang) * d), y = Math.round(f.y + Math.sin(ang) * d), i = y * w.W + x;
    if (x > 1 && y > 1 && x < w.W - 2 && y < w.H - 2 && !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]] && W.findPath(w, i, S.camp.y * w.W + S.camp.x, 300)) return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}
function adultFriend(S, name, sex, age) {
  const p = Sim.makePerson(S, sex, name, age);
  p.x = S.camp.x + 1.5; p.y = S.camp.y + 2.5; p.px = p.x; p.py = p.y; p.lastAge = age;
  S.people.push(p); God.init(S); F.init(S);
  return p;
}

// 1. personalidades
let S = world(42);
check('Narrador começa Equilibrado', N.kind(S) === C.NARRADORES.equilibrado && S.narr.kind === 'equilibrado');
check('troca para Implacável e recusa nome inválido', N.setKind(S, 'implacavel') && N.kind(S).sev > 1 && !N.setKind(S, 'caos') && S.narr.kind === 'implacavel');

// 2. nevasca: frio, neve, passos lentos, lenha queimando mais rápido
S = world(42);
setClock(S, 50, 10);                 // inverno, dia 6, 10 h
Sim.step(S, 2);
const tBefore = S.temp;
force(S, 'nevasca');
Sim.step(S, 2);
check('nevasca: neve, frio de verdade, anda devagar e o fogo come lenha', N.is(S, 'nevasca') && S.precip === 'neve' && tBefore - S.temp >= 6 && N.walkMult(S) < 1 && N.fireMult(S) > 1,
  (tBefore - S.temp).toFixed(1) + ' °C a menos');
const until = S.narr.active.nevasca.until;
Sim.advance(S, until - S.t + 90);
check('nevasca passa sozinha', !N.is(S, 'nevasca') && S.chron.some((c) => c.text === 'A nevasca passou.'));

// 2b. nevasca de noite, fogo morrendo, povo gelado: alguém vai buscar lenha e reacende (antes todos corriam para o fogo e ninguém o alimentava)
S = world(777, 'implacavel');
for (let i = 0; i < 10; i++) adultFriend(S, 'Gente' + i, i % 2 ? 'M' : 'F', 20 + i);
setClock(S, 51, 21);
force(S, 'nevasca');
fireOf(S).fuel = 0.3; S.stock.madeira = 100; S.stock.frutas = 60;
for (const p of S.people) { p.needs.calor = 12; p.needs.energia = 60; p.act = null; p.path = null; }
let dark = 0, lit2 = 0;
for (let i = 0; i < 12 * 30; i++) { Sim.step(S, 2); if (fireOf(S).fuel > 0) lit2++; else dark++; }
check('nevasca com o fogo morrendo: alguém reacende e ninguém morre', S.people.every((p) => p.alive) && lit2 > dark * 8,
  'fogo aceso ' + Math.round(lit2 / (lit2 + dark) * 100) + '% da noite · menor saúde ' + Math.round(Math.min(...S.people.map((p) => p.needs.saude))));

// 3. seca: arbustos param e murcham, a água rende menos, a Chuva de Deus quebra a seca
S = world(777);
setClock(S, 16, 9);                  // verão
const bushes = S.world.objs.filter((o) => o.k === 'bush').slice(0, 30);
for (const o of bushes) { o.fruit = 2; o.grow = 0.9; }
force(S, 'seca');
const fruitBefore = bushes.reduce((a, o) => a + o.fruit, 0);
N.daily(S);
S.t += D; S.ck = Sim.clock(S.t);
check('seca: sem chuva e arbustos murchando', N.is(S, 'seca') && N.precip(S) === null && bushes.reduce((a, o) => a + o.fruit, 0) < fruitBefore && N.waterMult(S) < 1 && N.thirstMult(S) > 1);
S.god.poder = 100;
const cast = God.cast(S, 'chuva', S.camp.x, S.camp.y);
check('a Chuva de Deus quebra a seca', cast.ok && !N.is(S, 'seca') && /seca acabou/.test(cast.msg), cast.msg);

// 4. tempestade: apaga a fogueira e traz chuva
S = world(9001);
setClock(S, 20, 11);
force(S, 'tempestade');
Sim.step(S, 2);
check('tempestade apaga a fogueira e chove', fireOf(S).fuel === 0 && S.precip === 'chuva' && N.is(S, 'tempestade'));

// 5. lobos: quem fica longe do fogo, sozinho, à noite, é atacado, corre para o fogo e reza; o limite de mordidas segura a noite
S = world(42);
setClock(S, 70, 21.5);               // primavera do ano 2, noite
const lone = S.people.find((p) => p.sex === 'M');
const far = spotAway(S, 13);
lone.x = far.x; lone.y = far.y; lone.px = lone.x; lone.py = lone.y; lone.act = null;
const home = S.people.find((p) => p !== lone);
force(S, 'lobos', { pack: 3 });
for (const e of S.narr.ents) { e.x = lone.x + 3; e.y = lone.y; }   // a matilha sai da mata ali perto
let fled = false, prayed = false, bites = 0, bitHome = 0, maxBites = 0;
const perNight = {};
for (let i = 0; i < 240 && N.wolvesOut(S); i++) {
  Sim.step(S, 2);
  if (lone.act && lone.act.type === 'fugir') fled = true;
  if (lone.prayer && lone.prayer.kind === 'lobos') prayed = true;
  for (const e of S.events) if (e.k === 'bite') { bites++; if (Math.hypot(e.x - home.x, e.y - home.y) < 1e-6) bitHome++; }
  S.events.length = 0;
}
maxBites = Math.max(0, ...Object.values((S.narr.active.lobos && S.narr.active.lobos.bitten) || {}));
check('lobos: quem está sozinho no escuro foge para o fogo e reza', fled && prayed && lone.alive, 'mordidas ' + bites + ' · saúde ' + Math.round(lone.needs.saude));
check('lobos: no máximo ' + C.LOBO_BITES_PERSON + ' mordidas por pessoa numa noite', bites <= C.LOBO_BITES_PERSON && lone.alive);
check('lobos: quem ficou junto do fogo não foi mordido', bitHome === 0);
check('lobos vão embora ao amanhecer', !N.wolvesOut(S) || S.ck.hour < 6, 'hora ' + S.ck.hour.toFixed(1));

// 6. criança não é presa de lobo
S = world(777);
setClock(S, 75, 22);
const [mom, dad] = S.people;
const kid = F.makeBaby(S, mom, dad, 'F', 'Pequena'); kid.born -= 8 * Y; kid.lastAge = 8; kid.carriedBy = 0; S.people.push(kid);
const spot = spotAway(S, 12); kid.x = spot.x; kid.y = spot.y; kid.px = kid.x; kid.py = kid.y;
force(S, 'lobos', { pack: 2 });
for (const e of S.narr.ents) { e.x = kid.x + 2; e.y = kid.y; }
let kidBit = 0;
for (let i = 0; i < 90; i++) { Sim.step(S, 2); for (const e of S.events) if (e.k === 'bite' && Math.hypot(e.x - kid.x, e.y - kid.y) < 1e-6) kidBit++; S.events.length = 0; }
check('lobo não ataca criança', kidBit === 0 && kid.alive);

// 7. Raio num lobo: abate, a matilha foge e a oração é atendida
S = world(9001);
setClock(S, 72, 22);
const vic = S.people[0];
const sp2 = spotAway(S, 12); vic.x = sp2.x; vic.y = sp2.y; vic.px = vic.x; vic.py = vic.y;
force(S, 'lobos', { pack: 3 });
for (const e of S.narr.ents) { e.x = vic.x + 4; e.y = vic.y + 0.5; }
Sim.reveal(S, vic.x, vic.y, C.SEE_R);   // Deus vê onde o povo anda
God.cry(S, vic, 'lobos');
const fe0 = vic.fe;
S.god.poder = 100;
const wolf = S.narr.ents.find((e) => e.k === 'lobo');
const r = God.cast(S, 'raio', Math.floor(wolf.x), Math.floor(wolf.y));
Sim.step(S, 2);
check('Raio abate um lobo e espanta a matilha', r.ok && /abateu um lobo/.test(r.msg) && S.narr.active.lobos && S.narr.active.lobos.killed === 1 &&
  S.narr.ents.filter((e) => e.k === 'lobo').every((e) => e.state === 'embora'), r.msg);
check('o Raio atende a oração contra os lobos', !vic.prayer && vic.fe > fe0 && vic.needs.saude === 100);

// 8. andarilho: chega, espera a resposta; acolhido entra no povo
S = world(42);
setClock(S, 80, 9);
const pop0 = S.people.filter((p) => p.alive).length;
force(S, 'andarilho');
let pend = null;
for (let i = 0; i < 400 && !pend; i++) { Sim.step(S, 2); pend = N.pending(S); }
const info = pend && N.groupInfo(S, pend.id);
check('andarilho chega e espera a resposta do povo', !!pend && info.people.length === 1 && S.events.some((e) => e.k === 'choice'));
S.events.length = 0;
N.decide(S, pend.id, true);
const newcomer = S.people[S.people.length - 1];
check('acolhido entra no povo com traços, aparência e memória', S.people.filter((p) => p.alive).length === pop0 + 1 && newcomer.name === info.people[0].name &&
  newcomer.traits.length === 2 && newcomer.fe > 0 && newcomer.mem.some((m) => m.k === 'acolhido') && !N.pending(S));
Sim.advance(S, 120);
check('acolhido vive como os outros (IA, necessidades)', newcomer.alive && !!newcomer.act);
// recusado vai embora
force(S, 'andarilho');
pend = null;
for (let i = 0; i < 400 && !pend; i++) { Sim.step(S, 2); pend = N.pending(S); }
const popB = S.people.length;
N.decide(S, pend.id, false);
Sim.advance(S, 8 * 60);
check('recusado segue viagem e some', S.people.length === popB && !S.narr.ents.some((e) => e.k === 'visita') && !Object.keys(S.narr.groups).length);

// 9. segundo casal: no 18º aniversário do primogênito, com um filho do gênero oposto
S = world(777);
setClock(S, 30, 8);
const [m9, f9] = [S.people.find((p) => p.sex === 'F'), S.people.find((p) => p.sex === 'M')];
const first = F.makeBaby(S, m9, f9, 'F', 'Primeira'); first.carriedBy = 0; S.people.push(first);
first.born = S.t - 18 * Y + 10 * 60;   // faz 18 anos hoje às 18 h
first.lastAge = 17; first.x = S.camp.x + 1.5; first.y = S.camp.y + 2.5;
S.narr.auto = 'acolher';
Sim.advance(S, D + 60);
check('18 anos do primogênito marcam o segundo casal', !!S.narr.couple && S.narr.couple.sex === 'M' && S.narr.couple.forId === first.id, S.narr.couple ? S.narr.couple.state : 'nada');
const before9 = S.people.length;
Sim.advance(S, (C.SEGUNDO_CASAL_H + 30) * 60);
const arrivals = S.people.slice(before9);
const boy = arrivals.find((p) => p.mother && p.father);
const [ma, pa] = boy ? [F.person(S, boy.mother), F.person(S, boy.father)] : [];
check('chega um casal com um filho do gênero oposto e todos são acolhidos', arrivals.length === 3 && !!boy && boy.sex === 'M' && F.age(S, boy) >= 17 && F.age(S, boy) <= 20 &&
  ma && pa && F.isPartner(ma, pa) && F.isPartner(pa, ma) && S.narr.couple.state === 'acolhido', arrivals.map((p) => p.name + ' ' + F.age(S, p)).join(', '));
check('o rapaz não é parente da primogênita (sangue novo)', boy && !F.closeKin(S, boy, first));

// 10. save com lobos e viajantes no mapa
S = world(9001);
setClock(S, 74, 21);
force(S, 'lobos', { pack: 3 });
Sim.advance(S, 30);
S.narr.auto = null;
S.narr.plan = null;
const nEnts = S.narr.ents.length;
const d10 = JSON.parse(JSON.stringify(Save.serialize(S)));
const S2 = Save.deserialize(d10);
check('save guarda o Narrador (lobos, personalidade, registro)', S2.narr && S2.narr.ents.length === nEnts && S2.narr.ents.every((e) => e.px === e.x && !e.path) &&
  S2.narr.kind === S.narr.kind && JSON.stringify(S2.narr.counts) === JSON.stringify(S.narr.counts));
Sim.advance(S2, 60);
check('lobos seguem depois de carregar', S2.narr.ents.length > 0 || !N.wolvesOut(S2));

// 11. jogo fechado: o Narrador descansa, os lobos somem, o plano espera
S = world(42);
setClock(S, 90, 20);
force(S, 'lobos', { pack: 2 });
S.narr.plan = { k: 'tempestade', warnAt: S.t + 60, at: S.t + 120, warned: false, opts: {} };
S.safe = true;
const log0 = S.narr.log.length;
Sim.advance(S, 6 * 60);
check('com o jogo fechado: sem lobos e sem evento novo', !N.wolvesOut(S) && S.narr.log.length === log0 && S.narr.plan && !S.narr.plan.warned);
S.safe = false;

// 12. save antigo (Etapa 3): ganha Narrador; se o primogênito já passou dos 18, o casal vem logo
S = world(777);
const oldKid = F.makeBaby(S, S.people[0], S.people[1], 'M', 'Velho'); oldKid.carriedBy = 0; oldKid.born = S.t - 19 * Y; oldKid.lastAge = 19; S.people.push(oldKid);
const d12 = Save.serialize(S); delete d12.narr;
const S3 = Save.deserialize(JSON.parse(JSON.stringify(d12)));
check('save antigo ganha Narrador e o segundo casal vem em horas', S3.narr && S3.narr.kind === 'equilibrado' && S3.narr.couple && S3.narr.couple.sex === 'F' && S3.narr.couple.at - S3.t <= 6 * 60);

// 13. fartura enche os arbustos; piracema enche o rio
S = world(42);
setClock(S, 80, 9);
force(S, 'fartura');
const near = S.world.objs.filter((o) => o.k === 'bush' && Math.hypot(o.x - S.camp.x, o.y - S.camp.y) <= C.FARTURA_R - 2);
check('fartura: arbustos carregados', N.is(S, 'fartura') && near.length > 0 && near.every((o) => o.fruit === C.BUSH_MAX) && N.bushMult(S) > 1);
force(S, 'piracema');
check('piracema: mais peixe', N.fishMult(S) > 1);

// 14. perda recente: o diretor segura o próximo aperto
S = world(9001, 'implacavel');
setClock(S, 120, 6);
S.narr.nextBad = S.ck.day; S.narr.plan = null; S.narr.active = {};
S.stats.lastDeathAt = S.t - 60;
for (let i = 0; i < 4; i++) { S.t += D; S.ck = Sim.clock(S.t); N.daily(S); }
check('perda recente: sem desastre nos dias seguintes', !S.narr.plan || !N.EVENTS[S.narr.plan.k].bad, S.narr.plan ? S.narr.plan.k : 'nada marcado');

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');

// ---------- 20 anos ----------
const YEARS = +process.argv[2] || 20;
const jobs = [];
for (const kind of ['equilibrado', 'implacavel', 'pacifico']) for (const seed of [42, 777, 9001]) jobs.push({ seed, kind, years: YEARS });
const half = [jobs.filter((_, i) => i % 2 === 0), jobs.filter((_, i) => i % 2 === 1)];
console.log('\n' + YEARS + ' anos com o Narrador (três mundos, jogando bem, acolhendo quem chega):');
Promise.all(half.map((part) => new Promise((res, rej) => {
  const wk = new Worker(__filename, { workerData: { jobs: part } });
  wk.on('message', res); wk.on('error', rej);
}))).then((parts) => {
  const res = parts.flat().sort((a, b) => jobs.findIndex((j) => j.seed === a.seed && j.kind === a.kind) - jobs.findIndex((j) => j.seed === b.seed && j.kind === b.kind));
  const pct = (x) => (x * 100).toFixed(1) + '%';
  for (const r of res) {
    console.log(`${C.NARRADORES[r.kind].name.padEnd(11)} mundo ${String(r.seed).padEnd(5)} · vivos ${r.alive} · nasceram ${r.births} · morreram ${r.deaths.length}${r.deaths.length ? ' (' + r.deaths.join(', ') + ')' : ''} · ` +
      `fome ${pct(r.hungry)} · frio ${pct(r.cold)} · mordidas ${r.bites} · maior silêncio ${r.gap1.toFixed(1)} d · casal ${r.couple} · ` +
      Object.entries(r.counts).map(([k, v]) => k + ' ' + v).join(', ') + ` · ${r.sec.toFixed(0)} s`);
  }
  const all = (f) => res.every(f);
  check('nada grande antes do primeiro inverno', all((r) => r.early === 0));
  check('nunca dois desastres grandes seguidos', all((r) => r.bigTwice === 0));
  check('respiro depois de uma perda', all((r) => r.noRest === 0));
  check('ninguém mordido na luz do fogo, nenhuma criança mordida', all((r) => r.unsafeBites === 0 && r.kidBites === 0), res.filter((r) => r.unsafeBites || r.kidBites).map((r) => r.kind + ' ' + r.seed + ': ' + r.unsafeBites + ' na luz, ' + r.kidBites + ' crianças').join(' · '));
  const eq = res.filter((r) => r.kind !== 'pacifico');
  check('sem tédio: depois do 1º ano, nunca mais de 15 dias sem acontecer nada (Equilibrado e Implacável)', eq.every((r) => r.gap1 <= 15), 'maior: ' + Math.max(...eq.map((r) => r.gap1)).toFixed(1) + ' d');
  check('Pacífico mais calmo, mas nunca mais de 20 dias parado', res.filter((r) => r.kind === 'pacifico').every((r) => r.gap1 <= 20));
  const byKind = (k) => res.filter((r) => r.kind === k).reduce((a, r) => a + Object.entries(r.counts).filter(([e]) => N.EVENTS[e].bad).reduce((x, [, v]) => x + v, 0), 0);
  if (YEARS >= 5) check('Implacável traz mais desastres que Equilibrado, e Equilibrado mais que Pacífico', byKind('implacavel') > byKind('equilibrado') && byKind('equilibrado') > byKind('pacifico'),
    byKind('implacavel') + ' > ' + byKind('equilibrado') + ' > ' + byKind('pacifico'));
  check('o segundo casal chega depois dos 18 anos do primogênito', all((r) => r.couple === 'acolhido' || r.adultLate) && res.some((r) => r.couple === 'acolhido') === (YEARS >= 20 && res.some((r) => !r.adultLate)),
    res.map((r) => r.couple).join(' '));
  console.log(ok + ' ok, ' + bad + ' falhas');
  process.exitCode = bad ? 1 : 0;
});
