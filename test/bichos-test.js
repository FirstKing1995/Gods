// Gods · testes dos bichos (Etapa 9). Uso: node test/bichos-test.js [anos]
// 1) unidades: as nove espécies no mundo novo, cada uma no seu lugar; save antigo ganha os bichos novos; o que dá para
//    caçar com a lança e com o arco; a presa (bicho novo atiça a curiosidade); a anta pede três acertos; o porco-do-mato
//    ferido parte para cima; o jacaré ataca quem pesca perto e a margem fica marcada (o povo evita); quem tem lança revida
//    e quem está perto e armado vem ajudar; o lobo cai ou foge; a onça ataca no escuro e na manhã seguinte os caçadores
//    vão atrás dela (juntos); o Raio abate a onça; mortes por bicho na Crônica; missões; save; jogo fechado
// 2) 20 anos em três mundos, jogando bem e largado: caçam bichos variados, os bandos não acabam, a onça e o jacaré
//    aparecem, o povo luta, e bicho mata pouco
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Inv: I, Life: L, Obras: O, Fauna: FA, Bichos: B, Narr: N } = G;
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
  for (let r = from || 2; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function add(S, sex, name, age) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = age;
  S.people.push(q);
  F.init(S); God.init(S); T.init(S); L.init(S);
  return q;
}
// põe alguém parado num tile, sem fazer nada
function put(p, x, y) { p.x = p.px = x + 0.5; p.y = p.py = y + 0.5; p.act = null; p.path = null; p.sleeping = false; p.inTent = 0; }
const arm = (p) => { p.tool = { dur: 100 }; };
// avança o relógio (sem simular) até a hora h
function setHour(S, h) { let t = Math.floor(S.t / D) * D + h * 60; if (t <= S.t) t += D; S.t = t; S.ck = Sim.clock(S.t); }
function seeAll(S) { S.seen.fill(1); }
// um bicho no mapa (num bando próprio de n, para a caça poder escolher)
function beast(S, sp, x, y, extra) {
  const f = S.fauna;
  const e = Object.assign({ id: f.nextId++, sp, h: extra && extra.h || 9000 + f.nextId, x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5, dir: 2, walk: 0, path: null, pathI: 0,
    state: 'pasto', wait: 999, res: 0, big: false, hp: C.BICHOS[sp].hp }, extra || {});
  f.ents.push(e);
  return e;
}
function herd3(S, sp, x, y) { const h = 9500 + S.fauna.nextId; return [0, 1, 2].map((k) => beast(S, sp, x + k, y, { h })); }
// um tile livre (chão, sem obra, sem objeto) perto de (x, y)
function freeNear(S, x0, y0) {
  const w = S.world;
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = x0 + dx, y = y0 + dy, i = y * w.W + x;
    if (x > 1 && y > 1 && x < w.W - 2 && y < w.H - 2 && !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]] && !W.objAt(w, i) && w.bgrid[i] < 0) return { x, y };
  }
  return null;
}
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
function force(S, k, opts) { S.narr.plan = { k, warnAt: S.t, at: S.t, warned: true, opts: opts || {} }; N.hourly(S); }
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== as espécies no mundo =====================
  {
    const per = {};
    let inPlace = true, wet = true;
    for (const seed of [42, 777, 9001]) {
      const S = world(seed), w = S.world;
      for (const e of S.fauna.ents) {
        per[e.sp] = per[e.sp] || new Set(); per[e.sp].add(seed);
        const i = Math.floor(e.y) * w.W + Math.floor(e.x);
        if (e.sp === 'jacare' && (e.wx === undefined || !G.IS_WATER[w.tile[Math.floor(e.wy) * w.W + Math.floor(e.wx)]])) wet = false;
        if (e.sp === 'capivara' && W.waterAdj(w, i) < 0 && !G.IS_WATER[w.tile[i]]) {
          // capivara anda em volta de casa: a casa é na beira d'água
          const h = FA.herdOf(S, e);
          if (!h || W.waterAdj(w, h.y * w.W + h.x) < 0) inPlace = false;
        }
      }
    }
    const kinds = Object.keys(per).filter((k) => per[k].size === 3);
    check('mundo novo: as nove espécies (em todos os três mundos, pelo menos oito)', kinds.length >= 8, Object.keys(per).map((k) => k + ' ' + per[k].size).join(', '));
    check('cada uma no seu lugar: capivara na beira d’água, jacaré com a água do lado', inPlace && wet);
    const S = world(42);
    const byHerd = {};
    for (const h of S.fauna.herds) byHerd[h.sp] = (byHerd[h.sp] || 0) + 1;
    // o bicho que Deus cria (Etapa 11) não nasce com o mundo
    check('bandos de cada espécie, na conta da tabela (o bicho de Deus, nenhum)', Object.keys(C.BICHOS).every((sp) => (C.BICHOS[sp].created ? !byHerd[sp] : (byHerd[sp] || 0) >= 1 && (byHerd[sp] || 0) <= C.BICHOS[sp].n)), JSON.stringify(byHerd));
  }

  // ===================== save antigo (só capivaras) =====================
  {
    const S = world(42);
    const js = Save.serialize(S);
    const d = JSON.parse(JSON.stringify(js));
    // o save da 0.8 guardava cada bicho como objeto (a 0.9 guarda numa lista curta)
    d.fauna.ents = d.fauna.entsC.map((a) => ({ id: a[0], sp: d.fauna.spList[a[1]], h: a[2], x: a[3], y: a[4], dir: a[5], walk: 0, path: null, pathI: 0, state: Save.FAUNA_ST[a[6]], wait: 30, res: 0, big: !!a[8], hp: a[7] }));
    delete d.fauna.entsC; delete d.fauna.spList;
    d.fauna.herds = d.fauna.herds.filter((h) => h.sp === 'capivara');
    d.fauna.ents = d.fauna.ents.filter((e) => e.sp === 'capivara');
    for (const h of d.fauna.herds) delete h.sp;
    for (const e of d.fauna.ents) { delete e.sp; delete e.hp; }
    delete d.fauna.v9; delete d.fauna.danger;
    d.stats.hunted = 7; delete d.stats.huntedBy;
    const S2 = Save.deserialize(d);
    const sps = new Set(S2.fauna.ents.map((e) => e.sp));
    check('save de antes da 0.9: as capivaras continuam e os bichos novos chegam', sps.has('capivara') && sps.size >= 8 && S2.fauna.v9, [...sps].join(', '));
    check('as capivaras caçadas antes contam como capivara', S2.stats.huntedBy.capivara === 7);
    const S3 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S2))));
    check('e os bichos novos chegam uma vez só', S3.fauna.herds.length === S2.fauna.herds.length);
  }

  // ===================== o que dá para caçar =====================
  {
    const S = world(777);
    learnUpTo(S, 'lanca');
    const e = {};
    for (const sp of Object.keys(C.BICHOS)) e[sp] = beast(S, sp, 5, 5, sp === 'jacare' ? { inWater: false } : null);
    const can = (sp) => FA.huntable(S, e[sp]);
    check('só a lança: capivara, porco-do-mato e tatu', ['capivara', 'porco', 'tatu'].every(can) && !['veado', 'paca', 'anta', 'jacu', 'tapiti', 'jacare'].some(can),
      Object.keys(e).filter(can).join(', '));
    T.discover(S, 'arco'); S.tech.known.arco = S.tech.known.arco || { t: S.t, by: 'Teste', how: 'pratica' };
    check('com o arco: os ariscos também, e o jacaré tomando sol', ['veado', 'paca', 'anta', 'jacu', 'tapiti', 'jacare'].every(can), Object.keys(e).filter(can).join(', '));
    e.jacare.inWater = true;
    check('jacaré dentro d’água, não', !can('jacare'));
    e.paca.hidden = true;
    check('paca na toca (de dia), não', !can('paca'));
  }

  // ===================== a presa =====================
  {
    const S = world(42);
    learnUpTo(S, 'lanca'); seeAll(S);
    S.fauna.ents = []; S.fauna.herds = [];
    const p = S.people[0];
    const c = S.camp, a = freeNear(S, c.x + 4, c.y), b = freeNear(S, c.x - 4, c.y);
    put(p, c.x + 1, c.y + 1);
    herd3(S, 'capivara', a.x, a.y); herd3(S, 'tatu', b.x, b.y);
    S.stats.huntedBy = { capivara: 12 }; S.stats.lastHunt = 'capivara';
    const pick1 = FA.prey(S, p, 60);
    check('bicho que ninguém caçou atiça a curiosidade (tatu antes da capivara de sempre)', pick1 && pick1.sp === 'tatu', pick1 && pick1.sp);
    S.stats.huntedBy.tatu = 1; S.stats.lastHunt = 'tatu';
    const pick2 = FA.prey(S, p, 60);
    check('já caçado, volta a valer o que rende (capivara)', pick2 && pick2.sp === 'capivara', pick2 && pick2.sp);
    // deixa o casal de cada bando
    for (const q of S.fauna.ents.filter((q) => q.sp === 'capivara').slice(0, 1)) q.gone = true;
    S.fauna.ents = S.fauna.ents.filter((q) => !q.gone);
    const pick3 = FA.prey(S, p, 60);
    check('deixa o casal do bando (capivara com 2 não se caça)', !pick3 || pick3.sp !== 'capivara', pick3 && pick3.sp);
  }

  // ===================== a anta pede três acertos; o porco ferido vem para cima =====================
  {
    const S = world(9001);
    learnUpTo(S, 'lanca'); seeAll(S);
    S.fauna.ents = [];
    const p = S.people[0], c = S.camp;
    put(p, c.x + 1, c.y + 1); arm(p);
    const at = freeNear(S, c.x + 3, c.y + 1);
    const anta = beast(S, 'anta', at.x, at.y);
    const r1 = FA.hit(S, anta, p), r2 = FA.hit(S, anta, p);
    anta.state = 'pasto'; anta.path = null;
    const r3 = FA.hit(S, anta, p);
    check('a anta aguenta dois acertos e cai no terceiro', r1 !== 'morto' && r2 !== 'morto' && r3 === 'morto' && anta.state === 'morta', [r1, r2, r3].join(' → '));
    // o porco-do-mato ferido: às vezes foge, às vezes parte para cima (e morde)
    let charged = 0, fled = 0, bit = false, mem = false;
    for (let k = 0; k < 16; k++) {
      const pg = beast(S, 'porco', at.x, at.y + 1);
      const r = FA.hit(S, pg, p);
      if (r === 'investida') {
        charged++;
        const s0 = p.needs.saude;
        for (let i = 0; i < 40 && pg.state === 'investida'; i++) { FA.step(S, 2); S.events.length = 0; }
        if (p.needs.saude < s0) bit = true;
        if (p.mem.some((m) => m.k === 'atacadoBicho')) mem = true;
        p.needs.saude = 100; p.biteCool = 0;
      } else if (r === 'fugiu') fled++;
      pg.gone = true;
    }
    check('porco-do-mato ferido: foge ou parte para cima', charged > 0 && fled > 0, charged + ' investidas · ' + fled + ' fugas');
    check('na investida, morde quem atacou (e fica na memória)', bit && mem);
  }

  // ===================== o jacaré =====================
  {
    let done = false;
    for (const seed of [42, 777, 9001, 1234]) {
      const S = world(seed), w = S.world;
      learnUpTo(S, 'lanca'); seeAll(S);
      S.fauna.ents = [];
      const r = W.findNearest(w, S.camp.y * w.W + S.camp.x, (i) => (W.waterAdj(w, i) >= 0 && W.waterCount8(w, i) >= 3 && !w.block[i] && !w.slow[i] ? 1 : 0), 900);
      if (!r) continue;
      const x = r.idx % w.W, y = (r.idx / w.W) | 0, wi = W.waterAdj(w, r.idx);
      const jac = beast(S, 'jacare', x, y, { wx: wi % w.W + 0.5, wy: ((wi / w.W) | 0) + 0.5 });
      const p = S.people[0], q = S.people[1];
      put(p, x, y); p.act = { type: 'pesca', stage: 'work', t: 0 };
      put(q, S.camp.x, S.camp.y);
      setHour(S, 9);
      let bitAt = 0;
      for (let i = 0; i < 360 && !bitAt; i++) { FA.step(S, 2); S.t += 2; S.ck = Sim.clock(S.t); if ((p.dmg.jacare || 0) > 0) bitAt = S.t; }
      if (!bitAt) continue;
      done = true;
      const toast = S.events.some((e) => e.k === 'toast' && /jacaré atacou/.test(e.text));
      check('o jacaré ataca quem pesca perto dele', p.needs.saude < 100 && toast && p.mem.some((m) => m.k === 'atacadoBicho'), 'saúde ' + Math.round(p.needs.saude));
      check('o primeiro ataque entra na Crônica', S.chron.some((c) => /jacaré atacou/.test(c.text || c)));
      check('depois do bote, mergulha', jac.inWater);
      check('a margem fica marcada por uns dias', FA.dangerAt(S, r.idx));
      // quem vai pescar agora escolhe outro lugar
      S.events.length = 0;
      put(q, S.camp.x, S.camp.y);
      const a = AI.decideType(S, q, 'pesca');
      check('o povo evita pescar na margem do ataque', !a || !FA.dangerAt(S, a.spot), a ? 'foi pescar a ' + Math.round(Math.hypot(a.spot % w.W - x, ((a.spot / w.W) | 0) - y)) + ' passos' : 'não achou onde pescar');
      // depois de JACARE_AVOID_D dias, a margem volta
      S.t += (C.JACARE_AVOID_D + 1) * D; S.ck = Sim.clock(S.t); FA.daily(S);
      check('passado o tempo, a margem volta a ser de todos', !FA.dangerAt(S, r.idx));
      break;
    }
    if (!done) check('o jacaré ataca quem pesca perto dele', false, 'nenhum ataque em quatro mundos');
  }

  // ===================== revidar e ajudar =====================
  {
    const S = world(42);
    learnUpTo(S, 'lanca'); seeAll(S);
    S.fauna.ents = [];
    const c = S.camp;
    const v = S.people[0], h1 = S.people[1];
    const h2 = add(S, 'M', 'Caçador', 30), un = add(S, 'F', 'Sem lança', 28), kid = add(S, 'M', 'Menino', 12), far = add(S, 'F', 'Longe', 30);
    const at = freeNear(S, c.x + 2, c.y + 2);
    put(v, at.x, at.y); arm(v);
    const near = (dx, dy) => { const s = freeNear(S, at.x + dx, at.y + dy); return s; };
    let s;
    s = near(2, 0); put(h1, s.x, s.y); arm(h1);
    s = near(-2, 1); put(h2, s.x, s.y); arm(h2);
    s = near(0, 2); put(un, s.x, s.y); un.tool = null;
    s = near(1, -2); put(kid, s.x, s.y); arm(kid);
    s = freeNear(S, at.x + 14, at.y); put(far, s.x, s.y); arm(far);
    S.stock.ferramentas = 0;
    const pg = beast(S, 'porco', at.x + 1, at.y, { state: 'investida', target: v.id, chargeAt: S.t });
    const tgt = { kind: 'fauna', id: pg.id };
    const n = B.alarm(S, v, tgt);
    const defs = S.people.filter((q) => q.act && q.act.type === 'defender').map((q) => q.name);
    check('quem está perto, adulto e armado vem ajudar', n === 2 && defs.includes(h1.name) && defs.includes(h2.name), defs.join(', '));
    check('sem lança, criança ou longe demais, não', !defs.includes(un.name) && !defs.includes(kid.name) && !defs.includes(far.name));
    // revidar: com a lança na mão, quem foi mordido às vezes acerta na hora
    let hits = 0, tries = 0;
    for (let k = 0; k < 40; k++) {
      const e = beast(S, 'porco', at.x + 1, at.y + 1, { hp: 99 });
      v.biteCool = 0; v.needs.saude = 100; v.act = null;
      const h0 = S.stats.fightHits || 0;
      B.bite(S, { kind: 'fauna', e }, v, 1, 'porco');
      tries++; if ((S.stats.fightHits || 0) > h0) hits++;
      e.gone = true;
    }
    const want = B.hitChance(S, v) * 0.8;
    check('quem foi mordido e tem lança revida (às vezes acerta)', hits > 0 && hits < tries && Math.abs(hits / tries - want) < 0.25, hits + ' de ' + tries + ' (esperado ~' + Math.round(want * 100) + '%)');
    v.tool = null;
    const h0 = S.stats.fightHits;
    for (let k = 0; k < 10; k++) { const e = beast(S, 'porco', at.x + 1, at.y + 1, { hp: 99 }); v.biteCool = 0; B.bite(S, { kind: 'fauna', e }, v, 1, 'porco'); e.gone = true; }
    check('sem lança na mão, não revida', S.stats.fightHits === h0);
    // os defensores lutam até o bicho cair ou fugir
    const S2 = world(777);
    learnUpTo(S2, 'lanca'); seeAll(S2); S2.fauna.ents = [];
    const [a, b] = S2.people, st = freeNear(S2, S2.camp.x + 3, S2.camp.y);
    put(a, st.x, st.y); put(b, st.x + 1, st.y); arm(a); arm(b);
    const anta = beast(S2, 'anta', st.x + 3, st.y, { state: 'investida', target: a.id, chargeAt: S2.t, hp: 3 });
    AI.startDefend(S2, b, { kind: 'fauna', id: anta.id });
    let over = false;
    for (let i = 0; i < 40 && !over; i++) { Sim.step(S2, 2); S2.events.length = 0; over = B.over(S2, { kind: 'fauna', id: anta.id }); }
    check('quem veio ajudar luta até a anta cair ou fugir', over && anta.hp < 3, 'anta: ' + anta.state + ', vida ' + anta.hp);
  }

  // ===================== lobos =====================
  {
    let killed = 0, fled = 0;
    const S = world(42);
    learnUpTo(S, 'lanca');
    const p = S.people[0];
    setHour(S, 21);
    for (let k = 0; k < 24; k++) {
      S.narr.ents = []; delete S.narr.active.lobos;
      force(S, 'lobos', { pack: 2 });
      const e = S.narr.ents.find((q) => q.k === 'lobo');
      if (!e) continue;
      const r = N.hitEnt(S, e, p);
      if (r === 'morto') killed++; else if (e.state === 'embora') fled++;
    }
    check('lobo acertado: às vezes cai, às vezes foge ferido', killed > 0 && fled > 0, killed + ' caíram · ' + fled + ' fugiram');
    check('o primeiro lobo derrubado entra na Crônica', S.chron.some((c) => /enfrentou um lobo/.test(c.text || c)));
    check('um lobo caído espanta a matilha', (() => { S.narr.ents = []; delete S.narr.active.lobos; force(S, 'lobos', { pack: 3 }); const ws = S.narr.ents.filter((q) => q.k === 'lobo'); ws[0].hp = 1; N.hitEnt(S, ws[0], p); return ws.slice(1).every((q) => q.state === 'embora'); })());
  }

  // ===================== a onça =====================
  {
    let chain = null;
    for (const seed of [42, 777, 9001, 1234, 555, 31337]) {
      const S = world(seed);
      learnUpTo(S, 'lanca'); seeAll(S);
      for (const q of S.people) arm(q);
      add(S, 'M', 'Caçador', 30); add(S, 'F', 'Caçadora', 26);
      for (const q of S.people) arm(q);
      S.stock.ferramentas = 6;
      Object.assign(S.stock, { peixe: 60, frutas: 60, agua: 30, madeira: 40 });
      S.life.party = null; S.life.lastParty = -1e9;   // as descobertas marcaram festa: aqui, a festa é da onça
      setHour(S, 19);
      force(S, 'onca');
      const a0 = S.narr.active.onca;
      if (!a0) continue;
      const out = { seed, bites: 0, prayed: false, hunt: null, hunters: 0, corner: false, pounce: 0, kill: false, escaped: false, story: '', roar: 0, deadHunters: 0 };
      for (let i = 0; i < 720 * 4 && S.narr.active.onca; i++) {
        Sim.step(S, 2);
        for (const e of S.events) {
          if (e.k === 'bite' && e.sp === 'onca') out.bites++;
          if (e.k === 'prayer' && /onça/.test(e.text)) out.prayed = true;
          if (e.k === 'oncaHunt') { out.hunt = S.ck.hour; out.hunters = e.ids.length; }
          if (e.k === 'roar') out.roar++;
          if (e.k === 'toast' && /achou a onça/.test(e.text)) out.corner = true;
          if (e.k === 'toast' && /venceu a onça/.test(e.text)) out.kill = true;
        }
        S.events.length = 0;
      }
      const onc = S.chron.map((c) => c.text || c).filter((t) => /onça/.test(t));
      out.story = onc[onc.length - 1] || '';
      out.over = !S.narr.active.onca;
      out.killedStat = S.stats.oncasKilled || 0;
      out.deaths = S.people.filter((q) => !q.alive).map((q) => q.cause).join(',');
      if (out.bites && out.hunt !== null) { chain = out; chain.S = S; break; }
      if (!chain) chain = out;
    }
    const c = chain;
    console.log('   onça (mundo ' + c.seed + '): mordidas ' + c.bites + ' · caçada às ' + (c.hunt === null ? '-' : c.hunt.toFixed(1) + 'h') + ' com ' + c.hunters + ' · achada ' + c.corner + ' · venceu ' + c.kill + ' · história: ' + c.story);
    check('a onça ataca quem está no escuro, e quem é atacado reza', c.bites > 0 && c.prayed);
    check('na manhã seguinte, dois ou três vão atrás dela (de dia)', c.hunt !== null && c.hunters >= 2 && c.hunters <= C.ONCA_HUNT && c.hunt >= C.ONCA_HUNT_H[0] && c.hunt < C.ONCA_HUNT_H[1]);
    check('acham a onça na toca e a luta termina (vencem ou ela vai embora de vez)', c.corner && c.over, 'venceu: ' + c.kill);
    check('a Crônica conta quem foi atrás dela', /foram atrás dela na mata/.test(c.story), c.story);
    check('a onça vencida vira carne, couro e festa', !c.kill || (c.killedStat === 1 && c.S.life.party && c.S.life.party.why === 'onca'));
    check('ninguém morreu nessa caçada', !c.deaths, c.deaths);
    // ninguém vai sozinho: com um só armado, não há caçada
    {
      const S = world(42);
      learnUpTo(S, 'lanca'); seeAll(S);
      arm(S.people[0]); S.people[1].tool = null; S.stock.ferramentas = 0;
      setHour(S, 8);
      force(S, 'onca');
      const e = S.narr.ents.find((q) => q.k === 'onca');
      e.bites = 1; e.state = 'toca'; e.hidden = true;
      check('ninguém vai atrás da onça sozinho', B.oncaHunt(S, e) === 0 && !S.people.some((q) => q.act && q.act.type === 'defender'));
      S.people[1].tool = { dur: 100 };
      S.precip = 'chuva';
      check('com chuva, a caçada fica para outro dia', B.oncaHunt(S, e) === 0);
    }
    // o Raio em cima da onça abate; perto, espanta
    {
      const S = world(777);
      seeAll(S);
      S.god.poder = 200;
      setHour(S, 21);
      force(S, 'onca');
      const e = S.narr.ents.find((q) => q.k === 'onca');
      e.state = 'rondar'; e.hidden = false; e.path = null;
      const vic = S.people[0];
      God.cry(S, vic, 'onca');
      const carne0 = S.stock.carne;
      const r = God.cast(S, 'raio', Math.floor(e.x), Math.floor(e.y));
      check('o Raio em cima da onça abate: carne e couro no estoque', r.ok && /abateu a onça/.test(r.msg) && S.stats.oncasKilled === 1 && S.stock.carne === carne0 + C.ONCA_CARNE, r.msg);
      check('e atende a oração contra a onça', !vic.prayer);
      days(S, 0.05);
      check('a Crônica conta o Raio', S.chron.some((c) => /O raio de Deus abateu a onça/.test(c.text || c)));
      const S2 = world(777); seeAll(S2); S2.god.poder = 200; setHour(S2, 21); force(S2, 'onca');
      const e2 = S2.narr.ents.find((q) => q.k === 'onca'); e2.state = 'rondar'; e2.hidden = false; e2.path = null;
      const r2 = God.cast(S2, 'raio', Math.floor(e2.x) + 3, Math.floor(e2.y));
      check('o Raio perto espanta a onça para a toca', r2.ok && /espantou a onça/.test(r2.msg) && e2.state === 'toca', r2.msg);
    }
    // jogo fechado: sem onça
    {
      const S = world(9001);
      setHour(S, 20); force(S, 'onca');
      S.safe = true; N.step(S, 2); S.safe = false;
      check('com o jogo fechado, a onça vai embora sem ninguém ver', !S.narr.ents.some((q) => q.k === 'onca') && !S.narr.active.onca);
    }
  }

  // ===================== mortes por bicho =====================
  {
    const S = world(42);
    const [a, b] = S.people;
    a.dmg.onca = 120; a.needs.saude = -20;
    b.dmg.jacare = 80; b.dmg.frio = 10; b.needs.saude = -20;
    Sim.step(S, 2);
    const txt = S.chron.map((c) => c.text || c).join(' | ');
    check('morte por onça e por jacaré, com o nome certo na Crônica', a.cause === 'onca' && b.cause === 'jacare' && /morreu no ataque da onça/.test(txt) && /morreu no ataque de um jacaré/.test(txt), a.cause + ' · ' + b.cause);
    check('e a ficha de quem morreu diz o bicho', /onça/.test(AI.describe(S, a)) && /jacaré/.test(AI.describe(S, b)));
  }

  // ===================== metas =====================
  {
    check('missões dos bichos: caçar 3 tipos na fase das descobertas; 6, revidar e vencer a onça na aldeia',
      B.missions(3).map((m) => m.id).join() === 'b_tres' && B.missions(4).map((m) => m.id).join() === 'b_seis,b_luta,b_onca' && [3, 4].every((f) => B.missions(f).every((m) => m.opt && m.reward > 0)));
    const S = world(42);
    S.stats.allGoals = true; Sim.checkGoals(S);
    S.stats.famGoals = true; Sim.checkGoals(S);
    check('a fase das descobertas traz caçar 3 tipos', S.goalsPhase === 3 && S.goals.some((g) => g.id === 'b_tres'));
    S.stats.huntedBy = { capivara: 4, porco: 1, tatu: 1 };
    const p0 = S.god.poder;
    Sim.checkGoals(S);
    check('3 tipos caçados: missão cumprida, com Poder', S.goals.find((g) => g.id === 'b_tres').done && S.god.poder === p0 + 5);
    for (const g of S.goals) if (!g.opt) g.done = true;
    Sim.checkGoals(S);
    check('a aldeia traz 6 tipos, revidar e vencer a onça', S.goalsPhase === 4 && ['b_seis', 'b_luta', 'b_onca'].every((id) => S.goals.some((g) => g.id === id)));
    S.stats.oncasKilled = 1; S.stats.fightHits = 2;
    Sim.checkGoals(S);
    check('venceu a onça e revidou: missões cumpridas', S.goals.find((g) => g.id === 'b_onca').done && S.goals.find((g) => g.id === 'b_luta').done && !S.goals.find((g) => g.id === 'b_seis').done);
    // save da 0.8 já na aldeia: ganha as missões dos bichos uma vez
    const d = JSON.parse(JSON.stringify(Save.serialize(world(777))));
    delete d.stats.bichoMissions; d.goalsPhase = 4; d.goals = O.goals4();
    const S3 = Save.deserialize(d);
    const ids = S3.goals.filter((g) => /^b_/.test(g.id)).map((g) => g.id);
    check('save antigo na fase da aldeia: ganha as missões dos bichos', ['b_tres', 'b_seis', 'b_luta', 'b_onca'].every((id) => ids.includes(id)), ids.join(', '));
    const S4 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S3))));
    check('e só uma vez', S4.goals.filter((g) => /^b_/.test(g.id)).length === ids.length);
  }

  // ===================== save =====================
  {
    const S = world(777);
    learnUpTo(S, 'lanca');
    const jac = S.fauna.ents.find((e) => e.sp === 'jacare');
    const anta = S.fauna.ents.find((e) => e.sp === 'anta');
    if (anta) anta.hp = 1;
    setHour(S, 21); force(S, 'onca');
    S.stats.huntedBy = { capivara: 3, veado: 1 };
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    const j2 = jac && S2.fauna.ents.find((e) => e.id === jac.id), a2 = anta && S2.fauna.ents.find((e) => e.id === anta.id);
    check('save: as espécies, a vida de cada bicho e o lugar do jacaré na água', S2.fauna.ents.length === S.fauna.ents.filter((e) => !e.gone).length && (!jac || (j2.wx === jac.wx && j2.wy === jac.wy)) && (!anta || a2.hp === 1));
    const kb = JSON.stringify(Save.serialize(S).fauna).length / 1024;
    check('save: cada bicho numa lista curta (os bichos cabem em menos de 10 KB)', kb < 10, kb.toFixed(1) + ' KB para ' + S.fauna.ents.length + ' bichos');
    check('save: a onça e o que o povo já caçou', S2.narr.ents.some((e) => e.k === 'onca') && S2.narr.active.onca && S2.stats.huntedBy.veado === 1);
    const S5 = Save.deserialize(JSON.parse(require('fs').readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8')));
    check('save da 0.4 abre com os bichos novos e segue rodando', S5 && new Set(S5.fauna.ents.map((e) => e.sp)).size >= 8 && (days(S5, 1), true));
  }

  // ===================== jogo fechado =====================
  {
    const S = world(42), w = S.world;
    S.fauna.ents = [];
    const r = W.findNearest(w, S.camp.y * w.W + S.camp.x, (i) => (W.waterAdj(w, i) >= 0 && W.waterCount8(w, i) >= 3 && !w.block[i] ? 1 : 0), 900);
    if (r) {
      const x = r.idx % w.W, y = (r.idx / w.W) | 0, wi = W.waterAdj(w, r.idx);
      beast(S, 'jacare', x, y, { wx: wi % w.W + 0.5, wy: ((wi / w.W) | 0) + 0.5 });
      const p = S.people[0]; put(p, x, y); p.act = { type: 'pesca', stage: 'work', t: 0 };
      S.safe = true; setHour(S, 9);
      for (let i = 0; i < 720; i++) { FA.step(S, 2); S.t += 2; S.ck = Sim.clock(S.t); }
      S.safe = false;
      check('com o jogo fechado, o jacaré não ataca', !(p.dmg.jacare > 0));
    }
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }   // só as unidades

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
    results.sort((a, b) => a.seed - b.seed || (a.mode === 'bem' ? -1 : 1));
    console.log('\n' + YEARS + ' anos com os bichos (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    let beastDeaths = 0, oncas = 0, oncaKills = 0, hunts = 0, jac = 0;
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'}`);
      console.log('  caçadas ' + r.hunted + ': ' + Object.entries(r.huntedBy).map(([k, v]) => k + ' ' + v).join(', '));
      console.log(`  ataques: onça ${r.oncaBites} (em ${r.oncas} visitas; caçadas ${r.oncaHunts}, vencidas ${r.oncaKills}) · jacaré ${r.jacBites} · porco/anta ${r.chargeBites} · lobo ${r.wolfBites} · golpes ${r.strikes}, acertos ${r.fightHits} · lobos derrubados ${r.wolvesKilled}`);
      console.log('  bichos no fim: ' + Object.entries(r.left).map(([k, v]) => k + ' ' + v).join(', ') + ' · fome ' + r.hungry + '% · frio ' + r.cold + '%');
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      const bd = r.deaths.filter((c) => c === 'onca' || c === 'jacare' || c === 'bicho' || c === 'lobos').length;
      beastDeaths += bd; oncas += r.oncas; oncaKills += r.oncaKills; hunts += r.oncaHunts; jac += r.jacBites;
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      check(tag + 'bicho mata pouco (no máximo 2 em ' + YEARS + ' anos)', bd <= 2, bd);
      check(tag + 'os bandos não acabam (8 espécies ou mais no fim)', Object.keys(r.left).filter((k) => r.left[k] > 0).length >= Math.min(8, r.species0), Object.keys(r.left).filter((k) => r.left[k] > 0).length + ' de ' + r.species0);
      check(tag + 'os bichos não enchem o mapa (até 200)', r.maxEnts <= 200, r.maxEnts);
      check(tag + 'jacaré: no máximo um ataque a cada ' + C.JACARE_GAP_D + ' dias', r.jacBites <= Math.ceil(YEARS * 60 / C.JACARE_GAP_D) + 1, r.jacBites);
      if (r.mode === 'bem') {
        check(tag + 'caçam bichos variados (5 tipos ou mais)', Object.keys(r.huntedBy).length >= 5 || YEARS < 20, Object.keys(r.huntedBy).length);
        check(tag + 'o povo luta: golpes que acertam', r.fightHits > 0 || YEARS < 20, r.fightHits);
        check(tag + 'o povo cresce (15 pessoas ou mais)', r.alive >= 15 || YEARS < 20, r.alive);
      }
    }
    check('a onça aparece (4 visitas ou mais nos seis mundos)', oncas >= 4 || YEARS < 20, oncas);
    check('e depois de um ataque, o povo vai atrás dela (alguma caçada)', hunts > 0 || YEARS < 20, hunts + ' caçadas, ' + oncaKills + ' vencidas');
    check('o jacaré morde de vez em quando (nem nunca, nem toda hora)', (jac > 0 || YEARS < 20) && jac <= YEARS * 6 * 0.4, jac);
    check('bicho mata pouco no total (no máximo 4 nos seis mundos)', beastDeaths <= 4, beastDeaths);
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

// ---------- simulação longa ----------
// robô "bem": barracas, conservar, Vontades por estação, as obras (Etapa 7) e Caça quando há lança; "largado": só a
// fogueira e a barraca
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t) => { const at = spot(S, t); if (!at) return false; Sim.placeBlueprint(S, t, at.x, at.y); return true; };
  place('fogueira'); place('barraca');
  const has = (t) => S.buildings.some((b) => b.type === t);
  const out = { seed, mode, errors: [], deaths: [], oncaBites: 0, jacBites: 0, chargeBites: 0, wolfBites: 0, oncaHunts: 0, maxEnts: 0 };
  const species0 = new Set(S.fauna.ents.map((e) => e.sp)).size;
  let hours = 0, hungry = 0, cold = 0;
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
        if (T.known(S, 'lanca')) S.vontades.caca = 3;
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
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        for (const e of S.events) {
          if (e.k === 'bite') { if (e.sp === 'onca') out.oncaBites++; else if (e.sp === 'jacare') out.jacBites++; else if (e.sp === 'porco' || e.sp === 'anta') out.chargeBites++; else out.wolfBites++; }
          if (e.k === 'oncaHunt') out.oncaHunts++;
        }
        S.events.length = 0;
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      out.maxEnts = Math.max(out.maxEnts, S.fauna.ents.length);
    }
  } catch (e) { out.errors.push(e.stack); }
  const st = S.stats, left = {};
  for (const e of FA.alive(S)) left[e.sp] = (left[e.sp] || 0) + 1;
  Object.assign(out, {
    alive: S.people.filter((p) => p.alive).length, births: st.births || 0, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    hunted: st.hunted || 0, huntedBy: st.huntedBy || {}, strikes: st.strikes || 0, fightHits: st.fightHits || 0, wolvesKilled: st.wolvesKilled || 0,
    oncas: S.narr.counts.onca || 0, oncaKills: st.oncasKilled || 0, left, species0,
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    sec: (Date.now() - t0) / 1000,
  });
  return out;
}
