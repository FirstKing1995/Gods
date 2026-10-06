/* Gods · bichos (Etapas 5 e 9). Capivaras na beira d'água; veados, porcos-do-mato e jacus na mata; pacas e antas
   na mata perto da água; tatus e tapitis no campo; jacarés na beira dos lagos. Cada espécie tem o seu jeito: pasta de
   dia (a paca, de noite), foge de quem chega perto (as ariscas) ou só de quem ataca, e o bando cresce com o tempo.
   O porco-do-mato e a anta podem partir para cima de quem atacou; o jacaré espreita quem trabalha na beira d'água.
   Com a lança (e o arco, para as ariscas), viram carne e couro. A luta mora em bichos.js. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, W = G.W;
  const F = G.Fauna = {};
  F.SPECIES = Object.keys(C.BICHOS);
  F.spec = (e) => C.BICHOS[(e && e.sp) || 'capivara'];

  function rint(S, a, b) { return S.rng.int(a, b); }
  function tileOk(w, x, y) {
    if (x < 2 || y < 2 || x >= w.W - 2 || y >= w.H - 2) return false;
    const i = y * w.W + x;
    return !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]] && !(w.fence && w.fence[i]);   // Etapa 10: cerca é parede para bicho
  }
  function trees(w, x, y, r) {
    let n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w.W || yy >= w.H) continue;
      const o = W.objAt(w, yy * w.W + xx);
      if (o && o.k === 'tree') n++;
    }
    return n;
  }
  function waterNear(w, x, y, r) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w.W && yy < w.H && G.IS_WATER[w.tile[yy * w.W + xx]]) return true;
    }
    return false;
  }
  // o lugar combina com a espécie?
  function habOk(S, sp, x, y) {
    const w = S.world, T = G.T;
    if (!tileOk(w, x, y)) return false;
    const i = y * w.W + x, t = w.tile[i];
    switch (C.BICHOS[sp].hab) {
      case 'agua': return W.waterAdj(w, i) >= 0;
      case 'mata': return (t === T.FOREST || trees(w, x, y, 3) >= 4) && !waterNear(w, x, y, 1);
      case 'mataAgua': return trees(w, x, y, 3) >= 2 && waterNear(w, x, y, 3);
      case 'campo': return (t === T.GRASS || t === T.DRY || t === T.SAND) && trees(w, x, y, 2) === 0 && !waterNear(w, x, y, 1);
      case 'lago': return W.waterAdj(w, i) >= 0 && W.waterCount8(w, i) >= 3;
      case 'deus': return w.bgrid[i] < 0 && !G.Sim.isCamp(S, i) && trees(w, x, y, 1) <= 3;   // o bicho criado por Deus (Etapa 11): perto da aldeia
    }
    return false;
  }

  // ---------- estado ----------
  F.init = function (S) {
    const f = S.fauna || (S.fauna = { herds: [], ents: [], nextId: 1, nextHerd: 1 });
    // save compacto (0.9): cada bicho veio numa lista curta
    if (f.entsC) {
      const sps = f.spList || F.SPECIES, ST = ['pasto', 'fuga', 'morta', 'investida'];
      f.ents = f.entsC.map((a) => Object.assign({ id: a[0], sp: sps[a[1]] || 'capivara', h: a[2], x: a[3], y: a[4], dir: a[5], walk: 0, path: null, pathI: 0,
        state: ST[a[6]] || 'pasto', wait: 30, res: 0, big: !!a[8], hp: a[7] < 0 ? undefined : a[7] }, a[9] || {}));
      delete f.entsC; delete f.spList;
    }
    f.herds = f.herds || []; f.ents = f.ents || []; f.danger = f.danger || [];
    for (const h of f.herds) if (!h.sp) h.sp = 'capivara';
    // ao carregar ninguém está caçando: solta os bichos que estavam escolhidos (e quem corria para cima de alguém para)
    for (const e of f.ents) {
      e.path = null; e.pathI = 0; e.res = 0; e.fly = null;
      if (!e.sp) e.sp = 'capivara';
      if (e.hp === undefined) e.hp = F.spec(e).hp;
      if (e.state === 'investida') e.state = 'pasto';
      if (e.px === undefined) { e.px = e.x; e.py = e.y; }
    }
    if (!f.made) {
      f.made = true; f.v9 = true;
      for (const sp of F.SPECIES) for (let k = 0; k < C.BICHOS[sp].n; k++) newHerd(S, sp);
    } else if (!f.v9) {
      // save de antes da Etapa 9: só havia capivaras; chegam os outros bichos
      f.v9 = true;
      for (const sp of F.SPECIES) if (sp !== 'capivara') for (let k = 0; k < C.BICHOS[sp].n; k++) newHerd(S, sp);
    }
  };
  // um lugar para o bando: o hábitat da espécie, longe o bastante do acampamento e dos outros bandos
  function herdSpot(S, sp) {
    const w = S.world, cx = S.camp.x + 1, cy = S.camp.y + 1;
    const hab = C.BICHOS[sp].hab, dist = hab === 'lago' ? [C.JACARE_DIST, C.FAUNA_DIST[1]] : hab === 'deus' ? [8, 18] : C.FAUNA_DIST;
    const taken = S.fauna.herds;
    for (let k = 0; k < 160; k++) {
      const a = S.rng.next() * Math.PI * 2, d = dist[0] + S.rng.next() * (dist[1] - dist[0]);
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (!habOk(S, sp, x, y)) continue;
      if (taken.some((h) => Math.hypot(h.x - x, h.y - y) < (h.sp === sp ? 10 : 4))) continue;
      return { x, y };
    }
    return null;
  }
  function newHerd(S, sp, n) {
    const f = S.fauna, d = C.BICHOS[sp], spot = herdSpot(S, sp);
    if (!spot) return null;
    const h = { id: f.nextHerd++, sp, x: spot.x, y: spot.y, lastBirth: S.ck ? S.ck.day : 0, empty: 0 };
    f.herds.push(h);
    const k = n || rint(S, d.herd[0], d.herd[1]);
    for (let i = 0; i < k; i++) spawnAt(S, h);
    return h;
  }
  function spawnAt(S, h) {
    const w = S.world, d = C.BICHOS[h.sp];
    for (let k = 0; k < 20; k++) {
      // o jacaré fica no ninho, na beira; os outros, em volta de casa
      const x = h.sp === 'jacare' ? h.x : h.x + rint(S, -2, 2), y = h.sp === 'jacare' ? h.y : h.y + rint(S, -2, 2);
      if (!tileOk(w, x, y)) continue;
      const e = { id: S.fauna.nextId++, sp: h.sp, h: h.id, x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5, dir: rint(S, 2, 3), walk: 0,
        path: null, pathI: 0, state: 'pasto', wait: rint(S, 10, 90), res: 0, big: S.rng.chance(0.3), hp: d.hp };
      if (h.sp === 'jacare') { const wi = W.waterAdj(w, y * w.W + x); if (wi >= 0) { e.wx = wi % w.W + 0.5; e.wy = ((wi / w.W) | 0) + 0.5; } }
      S.fauna.ents.push(e);
      return e;
    }
    return null;
  }
  // Etapa 11: bandos novos de uma espécie (a que Deus cria); devolve quantos acharam lugar
  F.addHerds = function (S, sp, n) {
    if (!S.fauna || !C.BICHOS[sp]) return 0;
    let k = 0;
    for (let i = 0; i < n; i++) if (newHerd(S, sp)) k++;
    return k;
  };
  F.alive = (S) => (S.fauna ? S.fauna.ents.filter((e) => e.state !== 'morta' && !e.gone) : []);
  F.herdOf = (S, e) => S.fauna.herds.find((h) => h.id === e.h) || null;
  F.get = (S, id) => (S.fauna ? S.fauna.ents.find((e) => e.id === id) || null : null);
  F.count = (S, sp) => F.alive(S).filter((e) => e.sp === sp).length;

  // ---------- movimento ----------
  function setPath(e, path) { e.path = path && path.length ? path : null; e.pathI = 0; }
  function face(e, dx, dy) { if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? 2 : 3; else if (dy) e.dir = dy > 0 ? 0 : 1; }
  function move(S, e, dt, speed) {
    if (!e.path) return;
    const w = S.world;
    let budget = dt / C.WALK_MIN_PER_TILE * speed, guard = 0;
    while (budget > 1e-6 && e.path && e.pathI < e.path.length && guard++ < 24) {
      const idx = e.path[e.pathI];
      if (w.block[idx] || (w.fence && w.fence[idx]) || (w.bwall && w.bwall[idx])) { e.path = null; break; }
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1);
      const can = budget / cost;
      if (d > 1e-6) face(e, dx, dy);
      if (d <= can) { e.x = tx; e.y = ty; budget -= d * cost; e.pathI++; e.walk += d; }
      else { e.x += dx / d * can; e.y += dy / d * can; e.walk += can; budget = 0; }
    }
    if (e.path && e.pathI >= e.path.length) e.path = null;
  }
  // pasta por perto de casa
  function wander(S, e, h) {
    const w = S.world, here = Math.floor(e.y) * w.W + Math.floor(e.x);
    for (let k = 0; k < 6; k++) {
      const x = h.x + rint(S, -C.FAUNA_HOME_R, C.FAUNA_HOME_R), y = h.y + rint(S, -C.FAUNA_HOME_R, C.FAUNA_HOME_R);
      if (!tileOk(w, x, y)) continue;
      const path = W.findPath(w, here, y * w.W + x, 60, 1);
      if (path) { setPath(e, path); return true; }
    }
    return false;
  }
  // foge de quem ameaça: para longe, sem sair muito de casa (a ave voa; o jacaré mergulha)
  F.scare = function (S, e, fx, fy) {
    if (!e || e.state === 'morta' || e.gone) return;
    const d = F.spec(e);
    if (e.sp === 'jacare') { e.inWater = true; e.scaredUntil = S.t + C.JACARE_COOL_D * C.DAY_MIN; return; }
    const w = S.world, h = F.herdOf(S, e) || { x: Math.floor(e.x), y: Math.floor(e.y) };
    const here = Math.floor(e.y) * w.W + Math.floor(e.x);
    let dx = e.x - fx, dy = e.y - fy;
    const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    for (let k = 0; k < 10; k++) {
      const run = (d.bird ? 7 : 6) + rint(S, 0, 3), ang = (S.rng.next() - 0.5) * 1.6;
      const rx = dx * Math.cos(ang) - dy * Math.sin(ang), ry = dx * Math.sin(ang) + dy * Math.cos(ang);
      let x = Math.round(e.x + rx * run), y = Math.round(e.y + ry * run);
      if (Math.hypot(x - h.x, y - h.y) > C.FAUNA_HOME_R + 5) { x = Math.round((x + h.x) / 2); y = Math.round((y + h.y) / 2); }
      if (!tileOk(w, x, y)) continue;
      if (d.bird) { e.fly = { x: x + 0.5, y: y + 0.5 }; e.path = null; e.state = 'fuga'; e.wait = 0; S.events.push({ k: 'birdsUp', x: e.x, y: e.y }); return; }
      const path = W.findPath(w, here, y * w.W + x, 80, 1);
      if (path) { setPath(e, path); e.state = 'fuga'; e.wait = 0; return; }
    }
  };
  function flyStep(S, e, dt, speed) {
    const t = e.fly, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy);
    const step = dt / C.WALK_MIN_PER_TILE * speed * 1.6;
    face(e, dx, dy);
    if (d <= step) { e.x = t.x; e.y = t.y; e.fly = null; e.state = 'pasto'; e.wait = rint(S, 20, 60); return; }
    e.x += dx / d * step; e.y += dy / d * step; e.walk += step;
  }
  F.kill = function (S, e) {
    e.state = 'morta'; e.path = null; e.fly = null; e.deadAt = S.t; e.hidden = false;
  };
  F.remove = function (S, e) { e.gone = true; };
  // um acerto: tira vida; abatido, fica no chão; senão foge, ou parte para cima de quem atacou (porco-do-mato, anta)
  F.hit = function (S, e, p) {
    const d = F.spec(e);
    e.hp = (e.hp === undefined ? d.hp : e.hp) - 1;
    if (e.hp <= 0) { F.kill(S, e); return 'morto'; }
    if (d.charge && p && !S.safe && S.rng.chance(d.charge)) {
      e.state = 'investida'; e.target = p.id; e.chargeAt = S.t; e.path = null; e.repath = 0;
      S.events.push({ k: 'beast', sp: e.sp, x: e.x, y: e.y });
      return 'investida';
    }
    F.scare(S, e, p ? p.x : e.x, p ? p.y : e.y);
    return 'fugiu';
  };
  // corre para cima de quem atacou e morde (ou dá a chifrada); depois foge
  function chargeStep(S, e, dt, d) {
    const p = G.Family.person(S, e.target);
    if (!p || !p.alive || p.inTent || p.carriedBy || S.t - e.chargeAt > 40) { e.state = 'pasto'; e.path = null; return; }
    if (Math.hypot(p.x - e.x, p.y - e.y) <= 1.5) {   // do lado ou na diagonal
      e.path = null;
      if (G.Bichos) G.Bichos.bite(S, { kind: 'fauna', e }, p, d.bite, e.sp);
      F.scare(S, e, p.x, p.y);
      return;
    }
    if (!e.path || S.t >= (e.repath || 0)) {
      e.repath = S.t + 5;
      const w = S.world, px = Math.floor(p.x), py = Math.floor(p.y);
      const here = Math.floor(e.y) * w.W + Math.floor(e.x);
      const r = W.findNearest(w, here, (i) => (Math.max(Math.abs(i % w.W - px), Math.abs(((i / w.W) | 0) - py)) <= 1 ? 1 : 0), 40, false, 1);
      if (r && r.path.length) setPath(e, r.path); else if (!r) { e.state = 'pasto'; e.path = null; return; }
    }
    move(S, e, dt, d.flee);
  }
  // alguém acordado chegou perto demais? (as ariscas olham em volta de 5 em 5 minutos)
  function nearPerson(S, e, r) {
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || p.inTent || p.sleeping || G.Family.age(S, p) < 7) continue;
      if (p.sangue && G.Povos && G.Povos.has(p, 'faro')) continue;   // Etapa 12: o faro chega sem ser notado
      if (Math.abs(p.x - e.x) <= r && Math.abs(p.y - e.y) <= r && Math.hypot(p.x - e.x, p.y - e.y) <= r) return p;
    }
    return null;
  }

  // ---------- jacaré: toma sol na beira de dia, fica na água de noite, e espreita quem trabalha na margem ----------
  // um lugar de sol na beira d'água, a até r passos de (x, y), longe de obra e do acampamento
  function shoreSpot(S, x, y, r) {
    const w = S.world;
    for (let k = 0; k < 24; k++) {
      const xx = x + rint(S, -r, r), yy = y + rint(S, -r, r);
      if (!tileOk(w, xx, yy)) continue;
      const i = yy * w.W + xx;
      if (W.waterAdj(w, i) < 0 || W.waterCount8(w, i) < 2 || w.bgrid[i] >= 0 || G.Sim.isCamp(S, i)) continue;
      return i;
    }
    return -1;
  }
  // de madrugada, às vezes muda de lugar (nada por baixo d'água); onde o povo anda pescando atrai (restos de peixe)
  function jacareMove(S, e) {
    const w = S.world, h = F.herdOf(S, e);
    const lure = e.lure && S.t - e.lure.t < 3 * C.DAY_MIN && S.rng.chance(C.JACARE_LURE) ? e.lure : null;
    const i = lure ? shoreSpot(S, lure.x, lure.y, 2) : h ? shoreSpot(S, h.x, h.y, C.JACARE_ROAM) : -1;
    if (i < 0) return;
    const wi = W.waterAdj(w, i);
    e.x = e.px = i % w.W + 0.5; e.y = e.py = ((i / w.W) | 0) + 0.5;
    e.wx = wi % w.W + 0.5; e.wy = ((wi / w.W) | 0) + 0.5;
    e.lure = null;
  }
  function jacareStep(S, e, dt) {
    const hr = S.ck.hour;
    if (hr >= 5 && hr < 6 && e.movedDay !== S.ck.day) { e.movedDay = S.ck.day; if (S.rng.chance(C.JACARE_MOVE)) jacareMove(S, e); }
    e.inWater = !(hr >= 8 && hr < 17) || (e.scaredUntil || 0) > S.t;
    e.look = (e.look || 0) - dt;
    if (e.look > 0) return;
    e.look = 10;
    if (S.safe || (e.nextBite || 0) > S.t) return;
    const quiet = S.t - (S.fauna.lastBite || -1e9) < C.JACARE_GAP_D * C.DAY_MIN;   // ataque de jacaré é raro: um de cada vez no mundo
    const h = F.herdOf(S, e);
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || p.inTent || G.Family.age(S, p) < 12) continue;
      const a = p.act;
      if (!a || a.stage !== 'work' || !(a.type === 'pesca' || a.type === 'agua' || a.type === 'argila')) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d > C.JACARE_R) {
        // gente trabalhando na margem, dentro do território: o jacaré repara (e pode aparecer ali numa madrugada)
        if (a.type === 'pesca' && h && Math.hypot(p.x - h.x, p.y - h.y) <= C.JACARE_ROAM) e.lure = { x: Math.floor(p.x), y: Math.floor(p.y), t: S.t };
        continue;
      }
      if (quiet || !S.rng.chance(1 - Math.pow(1 - C.JACARE_HOUR, 10 / 60))) continue;
      e.nextBite = S.t + C.JACARE_COOL_D * C.DAY_MIN;
      S.fauna.lastBite = S.t;
      e.inWater = true; e.scaredUntil = S.t + 6 * 60;
      F.markDanger(S, e.x, e.y);
      if (G.Bichos) G.Bichos.bite(S, { kind: 'fauna', e }, p, F.spec(e).bite, 'jacare');
      break;
    }
  }
  // margem perigosa (depois de um ataque): o povo evita trabalhar ali por um tempo
  F.markDanger = function (S, x, y) {
    const f = S.fauna, until = S.t + C.JACARE_AVOID_D * C.DAY_MIN;
    const z = f.danger.find((d) => Math.hypot(d.x - x, d.y - y) < 3);
    if (z) z.until = until; else f.danger.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, until });
  };
  F.dangerAt = function (S, i) {
    const f = S.fauna;
    if (!f || !f.danger.length) return false;
    const w = S.world, x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
    for (const d of f.danger) if (d.until > S.t && Math.abs(d.x - x) <= 4 && Math.abs(d.y - y) <= 4) return true;
    return false;
  };

  F.step = function (S, dt) {
    const f = S.fauna;
    if (!f || !f.ents.length) return;
    const hr = S.ck.hour, night = hr >= 20 || hr < 6, dusk = hr >= 18 || hr < 6;
    for (const e of f.ents) {
      if (e.gone) continue;
      e.px = e.x; e.py = e.y;
      if (e.state === 'morta') { if (S.t - e.deadAt > C.DAY_MIN) e.gone = true; continue; }
      const d = F.spec(e);
      if (e.sp === 'jacare') { jacareStep(S, e, dt); continue; }
      if (e.state === 'fuga') {
        if (e.fly) flyStep(S, e, dt, d.flee); else move(S, e, dt, d.flee);
        if (!e.path && !e.fly) { e.state = 'pasto'; e.wait = rint(S, 20, 60); }
        continue;
      }
      if (e.state === 'investida') { chargeStep(S, e, dt, d); continue; }
      // a paca passa o dia na toca e sai ao escurecer
      if (d.night) e.hidden = !dusk && !e.res;
      if (e.hidden) continue;
      // arisca: foge de quem chega perto
      if (d.see > 0) {
        e.look = (e.look || 0) - dt;
        if (e.look <= 0) {
          e.look = 5;
          const p = nearPerson(S, e, d.see);
          if (p) { F.scare(S, e, p.x, p.y); continue; }
        }
      }
      if (e.path) { move(S, e, dt, d.speed); continue; }
      if (d.night ? !dusk : night) continue;   // na hora de dormir, o bando fica quieto
      e.wait -= dt;
      const h = F.herdOf(S, e);
      if (e.wait > 0 || !h) continue;
      wander(S, e, h);
      e.wait = rint(S, 30, 150);
    }
    if (f.ents.some((e) => e.gone)) f.ents = f.ents.filter((e) => !e.gone);
  };

  // uma vez por dia: filhotes (fora do inverno) e bandos novos onde o antigo acabou
  F.daily = function (S) {
    const f = S.fauna;
    if (!f) return;
    const day = S.ck.day;
    for (const h of f.herds) {
      const d = C.BICHOS[h.sp];
      const n = f.ents.filter((e) => e.h === h.id && e.state !== 'morta' && !e.gone).length;
      if (!n) { h.empty = (h.empty || 0) + 1; continue; }
      h.empty = 0;
      if (d.max <= 1) continue;
      if (S.ck.season !== 3 && n >= 2 && n < d.max && day - h.lastBirth >= d.birth) { spawnAt(S, h); h.lastBirth = day; }
      // bicho sozinho não dá cria: com o tempo, um de fora chega e o bando recomeça
      if (n === 1) { h.lonely = (h.lonely || 0) + 1; if (h.lonely >= C.FAUNA_LONELY_DAYS && S.ck.season !== 3) { spawnAt(S, h); h.lonely = 0; h.lastBirth = day; } }
      else h.lonely = 0;
    }
    // bando que acabou some; depois de um tempo aparece outro da mesma espécie, em outro lugar
    const dead = f.herds.filter((h) => h.empty >= C.FAUNA_NEW_HERD_DAYS);
    if (dead.length) {
      f.herds = f.herds.filter((h) => h.empty < C.FAUNA_NEW_HERD_DAYS);
      for (const h of dead) newHerd(S, h.sp);
    }
    if (f.danger.length) f.danger = f.danger.filter((z) => z.until > S.t);
  };

  // ---------- caça ----------
  // dá para caçar agora? Arisca só com o arco (a lança não chega perto); jacaré só tomando sol e com o arco
  F.huntable = function (S, e) {
    if (!e || e.gone || e.state === 'morta' || e.hidden || e.state === 'investida') return false;
    const d = F.spec(e), bow = !!(G.Tech && G.Tech.known(S, 'arco'));
    const reach = G.Inv ? G.Inv.cacaR(S) : C.CACA_R;
    if (d.see > 0 && d.see >= reach) return false;
    if (e.sp === 'jacare') return bow && !e.inWater && !((e.scaredUntil || 0) > S.t);
    return true;
  };
  F.needsBow = (sp) => { const d = C.BICHOS[sp]; return sp === 'jacare' || (d.see > 0 && d.see >= C.CACA_R); };
  // o que rende: carne e couro da espécie (com a faca, carneia melhor)
  F.yieldOf = function (S, sp) {
    const d = C.BICHOS[sp || 'capivara'], faca = !!(G.Tech && G.Tech.known(S, 'faca'));
    return { carne: d.carne + (faca ? C.FACA_CARNE : 0), couro: d.couro + (faca && d.couro > 0 ? C.FACA_COURO : 0) };
  };
  // a presa: vale mais o que rende mais e está mais perto de quem caça e do acampamento; deixa o casal de cada bando.
  // Bicho que o povo nunca caçou atiça a curiosidade; o mesmo bicho da última caçada, um pouco menos (o povo varia)
  F.prey = function (S, p, maxD) {
    let best = null, bs = -1e9;
    const size = {}, hb = S.stats.huntedBy || {}, last = S.stats.lastHunt;
    for (const e of F.alive(S)) if (!e.res || e.res === p.id) size[e.h] = (size[e.h] || 0) + 1; else size[e.h] = (size[e.h] || 0);
    for (const e of F.alive(S)) {
      if (e.res && e.res !== p.id) continue;
      const d = F.spec(e);
      if (d.max > 1 && size[e.h] <= C.CACA_KEEP) continue;   // deixa o casal do bando: ele volta a crescer
      if (!F.huntable(S, e)) continue;
      if (S.seen && !S.seen[Math.floor(e.y) * S.world.W + Math.floor(e.x)]) continue;   // só o que o povo já viu
      const dist = Math.hypot(e.x - p.x, e.y - p.y) + Math.hypot(e.x - S.camp.x, e.y - S.camp.y) * 0.5;
      if (dist > (maxD || 60)) continue;
      const value = d.carne + d.couro * 3;
      const score = value * 1.2 - dist - (d.charge ? 6 : 0) + (hb[e.sp] ? 0 : C.CACA_NOVO) - (e.sp === last ? C.CACA_REPETE : 0);
      if (score > bs) { bs = score; best = e; }
    }
    return best;
  };
  // Etapa 10: um bicho do bando vai comer na roça (o estrago é contado no Campo; aqui ele só vai até lá)
  F.raid = function (S, e, b) {
    if (!e || e.gone || e.state === 'morta' || e.sp === 'jacare') return false;
    const w = S.world, here = Math.floor(e.y) * w.W + Math.floor(e.x);
    const path = W.findPath(w, here, (b.y + 1) * w.W + b.x + 1, 140, 1);
    if (!path) return false;
    setPath(e, path); e.state = 'pasto'; e.fly = null; e.hidden = false; e.wait = 180; e.raid = b.id;
    return true;
  };
  // Raio num bicho: carne e couro direto no estoque
  F.onRaio = function (S, x, y) {
    let hit = null, bd = 1.4;
    for (const e of F.alive(S)) { if (e.hidden) continue; const d = Math.hypot(e.x - x - 0.5, e.y - y - 0.5); if (d < bd) { bd = d; hit = e; } }
    if (!hit) return null;
    F.kill(S, hit); hit.gone = true;
    for (const e of F.alive(S)) if (Math.hypot(e.x - hit.x, e.y - hit.y) < 6) F.scare(S, e, hit.x, hit.y);
    const d = F.spec(hit);
    S.stock.carne += d.carne; S.stock.couro += d.couro;
    return 'O raio abateu ' + d.art + ': +' + d.carne + ' carne' + (d.couro ? ' e +' + d.couro + ' couro' : '') + ' no estoque.';
  };
})(globalThis.G = globalThis.G || {});
