/* Gods · save: seed + o que mudou. O mundo é regerado pela seed ao carregar. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Save = G.Save = {};
  const CODE = { gone: 0, tree: 1, stump: 2, rock: 3, bush: 4 };

  // névoa em runs alternados (começa em "não visto"), números em base 36: poucos bytes
  function packSeen(a) {
    if (!a) return '';
    const out = [];
    let cur = 0, n = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === cur) n++;
      else { out.push(n.toString(36)); cur = a[i]; n = 1; }
    }
    out.push(n.toString(36));
    return out.join('.');
  }
  function unpackSeen(str, len) {
    if (!str) return null;
    const out = new Uint8Array(len);
    let i = 0, cur = 0;
    for (const part of String(str).split('.')) {
      const n = parseInt(part, 36) || 0;
      if (cur) out.fill(1, i, Math.min(len, i + n));
      i += n; cur ^= 1;
    }
    return out;
  }
  Save.packSeen = packSeen; Save.unpackSeen = unpackSeen;

  // Narrador: lobos e viajantes vão sem o caminho (a IA deles refaz)
  function packNarr(n) {
    if (!n) return null;
    const out = Object.assign({}, n);
    out.ents = (n.ents || []).map((e) => { const o = Object.assign({}, e); o.path = null; o.pathI = 0; o.x = +e.x.toFixed(2); o.y = +e.y.toFixed(2); delete o.px; delete o.py; return o; });
    return out;
  }
  // bichos: cada um numa lista curta (Etapa 9: são mais de cem), sem o caminho (refazem ao carregar):
  // id, espécie, bando, x, y, lado, estado, vida, grande e, só quando tem, o resto (abatido em, água do jacaré, sustos)
  const FAUNA_ST = ['pasto', 'fuga', 'morta', 'investida'];
  function packFauna(f) {
    if (!f) return null;
    const out = Object.assign({}, f), sps = Object.keys(G.CFG.BICHOS || { capivara: 1 });
    delete out.ents;
    out.spList = sps;
    out.entsC = (f.ents || []).filter((e) => !e.gone).map((e) => {
      const a = [e.id, Math.max(0, sps.indexOf(e.sp || 'capivara')), e.h, +e.x.toFixed(2), +e.y.toFixed(2), e.dir | 0, Math.max(0, FAUNA_ST.indexOf(e.state)), e.hp === undefined ? -1 : e.hp, e.big ? 1 : 0];
      const x = {};
      for (const k of ['deadAt', 'wx', 'wy', 'scaredUntil', 'nextBite', 'hidden']) if (e[k] !== undefined && e[k] !== false && e[k] !== 0) x[k] = e[k];
      if (Object.keys(x).length) a.push(x);
      return a;
    });
    return out;
  }
  Save.FAUNA_ST = FAUNA_ST;
  // vida: a história em andamento não vai (acaba com o save); a festa marcada vai
  function packLife(l) {
    if (!l) return null;
    const out = Object.assign({}, l);
    out.story = null;
    if (out.party && out.party.on) out.party = null;
    return out;
  }
  Save.serialize = function (S) {
    const w = S.world, objs = [], extra = [], holy = [];
    for (let i = 0; i < w.objs.length; i++) {
      const o = w.objs[i];
      if (i < w.genCount) {
        const c = CODE[o.k] !== undefined ? CODE[o.k] : 0;
        objs.push(c, c === 2 ? (o.regrow || 0) : c === 3 ? o.ch : c === 4 ? o.fruit : 0, c === 4 ? Math.round(o.grow * 100) : 0);
      } else if (o.k === 'grave') extra.push({ x: o.x, y: o.y, name: o.name });
      else if (o.k === 'bush' && o.holy) holy.push([o.x, o.y, o.v || 0, o.fruit, Math.round(o.grow * 100)]);   // as árvores de Deus (Etapa 11)
    }
    const people = S.people.map((p) => {
      const q = {};
      for (const k in p) if (['path', 'pathI', 'act', 'px', 'py', 'stuck', 'fail', 'seenTile', 'talk', 'visiting', 'host', 'say', 'sayKind'].indexOf(k) < 0) q[k] = p[k];
      if (p.inTent) { q.inTent = 0; }
      q.sleeping = false;
      return q;
    });
    return {
      v: 1, game: 'genesis', seed: S.seed, t: S.t, rng: S.rng.s, camp: S.camp, siteLabel: S.siteLabel,
      stock: S.stock, vontades: S.vontades, nextPid: S.nextPid, nextBid: S.nextBid,
      chron: S.chron, goals: S.goals, stats: S.stats, over: S.over, arrived: S.arrived,
      people, buildings: S.buildings, objs, graves: extra, holy, god: S.god, seen: packSeen(S.seen), narr: packNarr(S.narr),
      tech: S.tech || null, fauna: packFauna(S.fauna), opts: S.opts || null, life: packLife(S.life),
      obras: G.Obras ? G.Obras.pack(S) : null, campo: G.Campo ? G.Campo.pack(S) : null,
      goalsPhase: S.goalsPhase || 1, era: S.era || '', famInit: !!S.famInit, savedAt: G.Net ? G.Net.now() : Date.now(),
      hist: S.hist ? { day: S.hist.day, s: S.hist.s, n: S.hist.n } : null,   // a memória da aldeia (0.12), para o jogo fechado
      povos: S.povos || null,   // Etapa 12: a convivência e as caravanas
    };
  };

  Save.deserialize = function (d) {
    if (!d || d.v !== 1 || d.game !== 'genesis') return null;
    const w = G.W.generate(d.seed);
    const K = ['gone', 'tree', 'stump', 'rock', 'bush'];
    for (let i = 0; i < w.genCount && i * 3 < d.objs.length; i++) {
      const o = w.objs[i], c = d.objs[i * 3], a = d.objs[i * 3 + 1], b = d.objs[i * 3 + 2];
      const k = K[c] || 'gone';
      if (k === 'gone') { G.W.removeObj(w, o); continue; }
      o.k = k;
      if (k === 'stump') o.regrow = a;
      else if (k === 'rock') o.ch = a;
      else if (k === 'bush') { o.fruit = a; o.grow = b / 100; }
      G.W.refreshBlock(w, o.y * w.W + o.x);
    }
    for (const g of d.graves || []) G.W.addObj(w, 'grave', g.x, g.y, { name: g.name });
    for (const h of d.holy || []) { const o = G.W.addObj(w, 'bush', h[0], h[1], { v: h[2], fruit: h[3], grow: h[4] / 100, holy: 1 }); G.W.refreshBlock(w, h[1] * w.W + h[0]); }
    for (const b of d.buildings) {
      for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) {
        const i = (b.y + dy) * w.W + b.x + dx;
        w.bgrid[i] = b.id; G.W.refreshBlock(w, i);
      }
    }
    const S = {
      v: 1, seed: d.seed, world: w, t: d.t, rng: new G.RNG(d.rng), camp: d.camp, siteLabel: d.siteLabel,
      stock: d.stock, vontades: d.vontades, people: d.people, buildings: d.buildings,
      nextPid: d.nextPid, nextBid: d.nextBid, chron: d.chron, events: [], goals: d.goals, stats: d.stats,
      over: d.over, arrived: d.arrived, god: d.god || null, narr: d.narr || null, savedAt: d.savedAt || 0,
      tech: d.tech || null, fauna: d.fauna || null, opts: d.opts || null, life: d.life || null,
      obras: d.obras || null, campo: d.campo || null,
      seen: unpackSeen(d.seen, w.W * w.H),
      goalsPhase: d.goalsPhase || 1, era: d.era || '', famInit: !!d.famInit,
      hist: d.hist ? { day: -2, s: d.hist.s || [null, null, null, null], n: d.hist.n || [0, 0, 0, 0] } : null,
      povos: d.povos || null,
    };
    for (const p of S.people) {
      p.path = null; p.pathI = 0; p.act = null; p.px = p.x; p.py = p.y; p.fail = {}; p.stuck = false;
      p.sleeping = false; p.inTent = 0;
      // quem estava em trabalho de parto volta direto para ele (a ação é recriada pela IA)
    }
    G.Sim.init(S);
    return S;
  };

  // ---------- armazenamento local (navegador) ----------
  function ls() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
  Save.store = function (S, extra) {
    const st = ls(); if (!st) return null;
    try {
      const d = Object.assign(Save.serialize(S), extra || {});
      const txt = JSON.stringify(d);
      st.setItem(C.SAVE_KEY, txt);
      return txt;
    } catch (e) { return null; }
  };
  // resumo curto para o ranking e para a tela de título
  Save.summary = function (S) {
    const ck = G.Sim.clock(S.t), alive = S.people.filter((p) => p.alive);
    return {
      ano: ck.year, estacao: C.SEASONS[ck.season], dia: ck.dos, anos: Math.floor((S.t - C.START_HOUR * 60) / (C.DAY_MIN * C.YEAR_DAYS)),
      vivos: alive.length, nomes: alive.map((p) => p.name).slice(0, 4).join(', '), local: S.siteLabel, fim: !!S.over,
      desc: G.Tech ? G.Tech.count(S) : 0, aldeia: !!(S.stats && S.stats.eraEnd),
    };
  };
  Save.read = function () {
    const st = ls(); if (!st) return null;
    try { const raw = st.getItem(C.SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  Save.clear = function () { const st = ls(); if (!st) return; try { st.removeItem(C.SAVE_KEY); } catch (e) { /* sem acesso */ } };
})(globalThis.G = globalThis.G || {});
