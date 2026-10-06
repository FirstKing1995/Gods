// Gods · testes da família (Etapa 3). Uso: node test/family-test.js [anos]
// 1) unidades: parentesco, barracas, concepção, parto difícil + Cura, desmame, velhice, save e frio (criança gelada, bebê no colo)
// 2) simulação longa: 20 anos em 3 mundos, jogando bem e largado
const path = require('path');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save } = G;
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra ? ' · ' + extra : '')); };
const Y = 60 * 1440;
function world(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  const S = Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
  const put = (t) => { for (let r = 2; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = S.camp.x + dx, y = S.camp.y + dy; if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); b.built = true; b.progress = 1; if (t === 'fogueira') b.fuel = 8; return b; } } };
  put('fogueira'); put('barraca'); S.stats.firstFire = S.stats.firstTent = true; Sim.refresh(S);
  return S;
}
// 1. casal fundador ligado
let S = world(42);
const [w, m] = S.people;
check('casal fundador ligado', F.isPartner(w, m) && F.isPartner(m, w), 'afeto ' + F.afeto(w, m));
// 2. parentesco
const a = F.makeBaby(S, w, m, 'F', 'A'); const b = F.makeBaby(S, w, m, 'M', 'B'); S.people.push(a, b);
const out = F.makeBaby(S, null, null, 'M', 'Forasteiro'); S.people.push(out);
const ga = F.makeBaby(S, a, out, 'F', 'Neta'); S.people.push(ga);
check('irmãos são parentes próximos', F.closeKin(S, a, b));
check('pai e filha são parentes próximos', F.closeKin(S, m, a));
check('avô e neta são parentes próximos', F.closeKin(S, m, ga));
check('tio e sobrinha são parentes próximos', F.closeKin(S, b, ga));
check('forasteiro não é parente da filha', !F.closeKin(S, a, out));
check('relação: Iara é mãe de A', F.relation(S, a, w) === 'mãe');
check('relação: B é irmão de A', F.relation(S, a, b) === 'irmão');
check('relação: Aruã é avô da neta', F.relation(S, ga, m) === 'avô');
// 3. barracas: casal junto, criança cabe com os pais (5 lugares), a segunda criança não
S = world(777);
const [w2, m2] = S.people;
const k1 = F.makeBaby(S, w2, m2, 'F', 'K1'), k2 = F.makeBaby(S, w2, m2, 'M', 'K2');
k1.born -= 6 * Y; k2.born -= 4 * Y; k1.carriedBy = k2.carriedBy = 0; S.people.push(k1, k2);
const tent = S.buildings.find((x) => x.type === 'barraca');
check('lugares: casal 4, criança 1', F.bedUnits(S, w2) === 2 && F.bedUnits(S, k1) === 1);
check('precisa de 6 lugares, tem 5', F.bedsNeeded(S) === 6 && F.bedsTotal(S) === 5);
// 4. concepção só na barraca, com o casal dormindo junto
S = world(9001);
const [w3, m3] = S.people;
const t3 = S.buildings.find((x) => x.type === 'barraca');
F.link(S, w3, m3, 90);
let conceived = 0, hearts = 0;
for (let n = 0; n < 400 && !w3.preg; n++) {
  w3.sleeping = m3.sleeping = true; w3.inTent = m3.inTent = t3.id;
  S.t = Math.floor(S.t / 1440) * 1440 + 1440 + 23 * 60; S.ck = Sim.clock(S.t);
  F.hourly(S);
  hearts += S.events.filter((e) => e.k === 'heart').length; S.events.length = 0;
}
check('concebe dormindo junto na barraca', !!w3.preg, 'coração em ' + hearts + ' noites');
w3.preg = null;
w3.inTent = 0;
for (let n = 0; n < 200; n++) { S.t += 1440; S.ck = Sim.clock(S.t); F.hourly(S); }
check('fora da barraca não concebe', !w3.preg);
// 5. parto difícil: reza, Cura salva; sem ajuda, perde saúde
S = world(1234);
const [w4, m4] = S.people;
S.rng.next = () => 0.01;   // força parto difícil
w4.preg = { t0: S.t - 44 * 1440, due: S.t + 10, father: m4.id, known: true };
Sim.advance(S, 70);
check('parto difícil começou', !!(w4.labor && w4.labor.hard), JSON.stringify(w4.labor));
S.rng = new G.RNG(99);
Sim.advance(S, 60);
check('mãe ou pai rezam pelo parto', S.people.some((p) => p.prayer && p.prayer.kind === 'parto'), S.people.map((p) => p.prayer && p.prayer.text).filter(Boolean).join(' | '));
S.stats.births = 1;   // Cura liberada (primeiro filho já existe neste teste)
S.god.poder = 50;
const saude0 = w4.needs.saude;
const r = God.cast(S, 'cura', Math.floor(w4.x), Math.floor(w4.y));
check('Cura no parto', r.ok && w4.labor.helped, r.msg + ' · saúde ' + Math.round(saude0) + ' → ' + Math.round(w4.needs.saude));
check('oração do parto atendida', !S.people.some((p) => p.prayer && p.prayer.kind === 'parto'));
Sim.advance(S, 5 * 60);
const baby = S.people.find((p) => p.mother === w4.id);
check('bebê nasceu e está no colo da mãe', !!baby && baby.carriedBy === w4.id, baby ? baby.name : '');
check('resguardo: mãe não trabalha no primeiro dia', !F.canWork(S, w4, 'pesca'));
// 6. bebê mama, cresce e desmama aos 3
for (let d = 0; d < 3 * 60 + 2; d++) Sim.advance(S, 1440);
check('aos 3 anos anda sozinho', baby.alive && !baby.carriedBy, 'idade ' + F.age(S, baby) + ' · saúde ' + Math.round(baby.needs.saude));
// 7. velhice
S = world(5);
const old = S.people[1]; old.born -= 70 * Y; old.lastAge = F.age(S, old);
let died = false;
for (let d = 0; d < 6 * 60 && !died; d++) { Sim.advance(S, 1440); died = !old.alive; }
check('idoso de 70+ morre de velhice em alguns anos', died && old.cause === 'velhice', old.alive ? 'ainda vivo' : Sim.dateText(old.diedAt));
// 8. save ida e volta com família
S = world(42);
const [w5, m5] = S.people;
const kid = F.makeBaby(S, w5, m5, 'F', 'Kid'); S.people.push(kid);
w5.preg = { t0: S.t, due: S.t + 1000, father: m5.id, known: true };
S.goalsPhase = 2; S.goals = F.goals2();
const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
const k2b = S2.people.find((p) => p.name === 'Kid');
check('save guarda família', k2b && k2b.mother === w5.id && k2b.carriedBy === w5.id && S2.people[0].preg && S2.goalsPhase === 2 && F.isPartner(S2.people[0], S2.people[1]) && F.afeto(S2.people[0], S2.people[1]) === F.afeto(w5, m5));
// 9. frio: criança gelada e exausta, numa noite de inverno, vai dormir junto do fogo
//    (antes ficava alternando entre se aquecer e dormir na barraca fria, e congelava)
const winterNight = (S) => { S.t += 50 * 1440 + 20 * 60; Sim.refresh(S); };
// põe alguém num lugar livre a 8 tiles do fogo
const farFromFire = (S, fire, p) => {
  const ww = S.world;
  for (let dx = -8; dx <= 8; dx++) { const x = fire.x + dx, y = fire.y + 8, i = y * ww.W + x; if (!ww.block[i] && !ww.slow[i]) { p.x = x + 0.5; p.y = y + 0.5; break; } }
  p.px = p.x; p.py = p.y;
};
for (const seed of [777, 1234]) {
  S = world(seed);
  const fire = S.buildings.find((x) => x.type === 'fogueira'); fire.fuel = 30;
  const [w6, m6] = S.people;
  const kf = F.makeBaby(S, w6, m6, 'F', 'Gelada'); kf.born -= 5 * Y; kf.lastAge = 5; kf.carriedBy = 0;
  farFromFire(S, fire, kf); S.people.push(kf);
  winterNight(S);
  kf.needs.calor = 8; kf.needs.energia = 5;
  Sim.advance(S, 6 * 60);
  const dist = Math.hypot(kf.x - fire.x - 0.5, kf.y - fire.y - 0.5);
  check('criança gelada e exausta dorme junto do fogo (mundo ' + seed + ')', kf.alive && kf.sleeping && !kf.inTent && dist <= C.FIRE_FULL_R + 0.5 && kf.needs.calor > 20,
    'distância ' + dist.toFixed(1) + ' · calor ' + Math.round(kf.needs.calor) + ' · saúde ' + Math.round(kf.needs.saude));
}
// 10. quem carrega um bebê gelado leva ele para o calor, mesmo sem sentir frio
S = world(42);
const [w7, m7] = S.people;
const bb = F.makeBaby(S, w7, m7, 'M', 'Friinho'); S.people.push(bb);
S.t += 50 * 1440 + 10 * 60; Sim.refresh(S);   // manhã de inverno: hora de trabalhar
G.AI.abort(S, w7); farFromFire(S, S.buildings.find((x) => x.type === 'fogueira'), w7);
w7.needs.calor = 90; w7.needs.energia = 90; bb.needs.calor = 10;
const went = new Set();
for (let i = 0; i < 120; i++) { Sim.step(S, 2); if (w7.act) went.add(w7.act.type); }
check('quem carrega bebê gelado leva ele para o calor', bb.alive && bb.needs.calor > 15 && (went.has('aquecer') || went.has('dormir')),
  'calor do bebê ' + Math.round(bb.needs.calor) + ' · ' + [...went].join(', '));
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');

// ---------- 20 anos ----------
const YEARS = +process.argv[2] || 20;
function longRun(seed, mode) {
  const w = W.generate(seed); const site = W.bestSite(w);
  const S = Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
  S.narr.auto = 'acolher';   // quem pede abrigo entra (o Narrador da Etapa 4 roda junto)
  const place = (t) => { for (let r = 2; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = S.camp.x + dx, y = S.camp.y + dy; if (!Sim.canPlace(S, t, x, y)) { Sim.placeBlueprint(S, t, x, y); return true; } } return false; };
  place('fogueira'); place('barraca');
  let hungry = 0, hours = 0, firstHelp = null;
  // pisca-pisca: a mesma ação recomeçando em até 4 minutos (deitar e levantar sem parar, por exemplo)
  const lastAct = new Map();
  const t0 = Date.now();
  for (let d = 0; d < YEARS * 60 && !S.over; d++) {
    if (mode === 'bem' && d % 3 === 0) {
      const need = F.bedsNeeded(S), have = F.bedsTotal(S), pend = S.buildings.some((b) => !b.built || b.up);
      if (!pend && have < need + 1 && S.stock.madeira >= 14) place('barraca');
      else if (!pend && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
      Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
      S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
    }
    for (let s2 = 0; s2 < 720 && !S.over; s2++) {
      Sim.step(S, 2); S.events.length = 0;
      if (s2 % 30 === 0) for (const p of S.people) if (p.alive) { hours++; if (p.needs.fome < 25) hungry++; }
      for (const p of S.people) {
        const a = p.alive ? p.act : null, L = lastAct.get(p.id);
        if (a && (!L || L.a !== a)) {
          if (L && L.a && L.a.type === a.type && a.type !== 'depositar' && S.t - L.t <= 4) flicker[a.type] = (flicker[a.type] || 0) + 1;
          lastAct.set(p.id, { a, t: S.t });
        }
      }
    }
    if (firstHelp === null && S.stats.childHelped) firstHelp = Sim.clock(S.t).year;
  }
  const alive = S.people.filter((p) => p.alive);
  const dead = S.people.filter((p) => !p.alive);
  console.log(`${mode.padEnd(7)} mundo ${String(seed).padEnd(5)} · vivos ${alive.length} · nasceram ${S.stats.births} · morreram ${dead.length}${dead.length ? ' (' + dead.map((p) => p.cause).join(', ') + ')' : ''} · fome ${(hungry / Math.max(1, hours) * 100).toFixed(1)}% do tempo · 1º filho ajudou no ano ${firstHelp || '-'} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const flicker = {};
console.log('\n' + YEARS + ' anos de família:');
for (const seed of [42, 777, 9001]) for (const mode of ['bem', 'largado']) longRun(seed, mode);
// trabalho recomeçando logo (outra árvore, outro ponto de pesca) é normal; dormir e se aquecer em ciclo, não
const loops = (flicker.dormir || 0) + (flicker.aquecer || 0);
check('ninguém fica deitando e levantando sem parar', loops < 5, 'dormir/aquecer recomeçados em até 4 min: ' + loops + ' em ' + 6 * YEARS + ' anos de jogo' +
  (Object.keys(flicker).length ? ' · outros: ' + Object.entries(flicker).filter(([k]) => k !== 'dormir' && k !== 'aquecer').map(([k, v]) => k + ' ' + v).join(', ') : ''));
console.log(ok + ' ok, ' + bad + ' falhas');
