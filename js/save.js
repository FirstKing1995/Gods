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
  // a Memória vai inteira, menos o rito e o dia dos mortos em andamento (recomeçam do zero ao abrir)
  function packMem(m) {
    const out = Object.assign({}, m);
    out.erva = Object.assign({}, m.erva, { rite: null });
    out.fin = { year: m.fin.year || 0, velas: m.fin.velas || 0, day: m.fin.day || 0 };
    return out;
  }
  Save.serialize = function (S) {
    const w = S.world, objD = [], extra = [], holy = [];
    for (let i = 0; i < w.objs.length; i++) {
      const o = w.objs[i];
      if (i < w.genCount) {
        // 0.16: só o que mudou desde a geração (árvore de pé e pedra inteira são como nasceram e não vão)
        if (o.k === 'tree' || (o.k === 'rock' && o.ch === (o.big ? 4 : 2))) continue;
        const c = CODE[o.k] !== undefined ? CODE[o.k] : 0;
        objD.push(i, c, c === 2 ? (o.regrow || 0) : c === 3 ? o.ch : c === 4 ? o.fruit : 0, c === 4 ? Math.round(o.grow * 100) : 0);
      } else if (o.k === 'grave') {
        // Etapa 13: a cova guarda quem é, quando foi, o rito e as flores
        const g = { x: o.x, y: o.y, name: o.name };
        for (const f of ['pid', 't', 'r', 'vel', 'laje', 'fl', 'of']) if (o[f]) g[f] = o[f];
        extra.push(g);
      }
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
      v: 1, game: 'genesis', seed: S.seed, size: w.W, t: S.t, rng: S.rng.s, camp: S.camp, siteLabel: S.siteLabel,
      stock: S.stock, vontades: S.vontades, nextPid: S.nextPid, nextBid: S.nextBid,
      chron: S.chron, goals: S.goals, stats: S.stats, over: S.over, arrived: S.arrived,
      people, buildings: S.buildings, objD, graves: extra, holy, god: S.god, seen: packSeen(S.seen), narr: packNarr(S.narr),
      tech: S.tech || null, fauna: packFauna(S.fauna), opts: S.opts || null, life: packLife(S.life),
      obras: G.Obras ? G.Obras.pack(S) : null, campo: G.Campo ? G.Campo.pack(S) : null,
      goalsPhase: S.goalsPhase || 1, era: S.era || '', famInit: !!S.famInit, savedAt: G.Net ? G.Net.now() : Date.now(),
      hist: S.hist ? { day: S.hist.day, s: S.hist.s, n: S.hist.n } : null,   // a memória da aldeia (0.12), para o jogo fechado
      povos: S.povos || null,   // Etapa 12: a convivência e as caravanas
      memoria: G.Memoria && S.memoria ? packMem(S.memoria) : null,   // Etapa 13: corpos, contos, a erva e o rito
      soc: G.Soc && S.soc ? G.Soc.pack(S) : null,   // Etapa 14: crimes, líder, pedidos, quem foi embora, a vila de fora
      gente: S.gente || null,   // Etapa 15: a média de cada trabalho, as tentativas, quem aprendeu com quem
      povo: S.povo || null,   // 0.16: o nome e o título do lugar
    };
  };

  Save.deserialize = function (d) {
    if (!d || d.v !== 1 || d.game !== 'genesis') return null;
    const w = G.W.generate(d.seed, d.size || C.MAP);
    const K = ['gone', 'tree', 'stump', 'rock', 'bush'];
    // 0.16: só o que mudou desde a geração (no mapa enorme, a lista inteira pesava demais)
    if (d.objD) for (let j = 0; j + 3 < d.objD.length; j += 4) {
      const o = w.objs[d.objD[j]];
      if (!o) continue;
      const k = K[d.objD[j + 1]] || 'gone', a = d.objD[j + 2], b = d.objD[j + 3];
      if (k === 'gone') { G.W.removeObj(w, o); continue; }
      o.k = k;
      if (k === 'stump') o.regrow = a;
      else if (k === 'rock') o.ch = a;
      else if (k === 'bush') { o.fruit = a; o.grow = b / 100; }
      G.W.refreshBlock(w, o.y * w.W + o.x);
    }
    for (let i = 0; d.objs && i < w.genCount && i * 3 < d.objs.length; i++) {
      const o = w.objs[i], c = d.objs[i * 3], a = d.objs[i * 3 + 1], b = d.objs[i * 3 + 2];
      const k = K[c] || 'gone';
      if (k === 'gone') { G.W.removeObj(w, o); continue; }
      o.k = k;
      if (k === 'stump') o.regrow = a;
      else if (k === 'rock') o.ch = a;
      else if (k === 'bush') { o.fruit = a; o.grow = b / 100; }
      G.W.refreshBlock(w, o.y * w.W + o.x);
    }
    for (const g of d.graves || []) { const o = G.W.addObj(w, 'grave', g.x, g.y, { name: g.name }); for (const f of ['pid', 't', 'r', 'vel', 'laje', 'fl', 'of']) if (g[f]) o[f] = g[f]; }
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
      memoria: d.memoria || null,
      soc: d.soc || null,
      gente: d.gente || null,
      povo: d.povo || null,
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
  // 0.16: vários mundos. Até a 0.15 havia uma chave só, e o mundo novo apagava o antigo. Agora cada mundo mora na sua
  // chave (o de antes da 0.16 segue na de sempre, como o mundo 'a') e um índice pequeno guarda o resumo de cada um,
  // para a tela de título listar sem abrir os saves grandes. Save.slot é o mundo aberto.
  const IDX = C.SAVE_KEY + '.mundos';
  const keyOf = (id) => (id === 'a' ? C.SAVE_KEY : C.SAVE_KEY + '.' + id);
  Save.slot = '';
  Save.erro = '';   // 'cheio' quando o navegador recusou por falta de espaço
  function ls() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
  function readIdx(st) { try { const l = JSON.parse(st.getItem(IDX) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function writeIdx(st, l) { try { st.setItem(IDX, JSON.stringify(l)); } catch (e) { /* o índice é refeito na próxima */ } }
  // o resumo de um save: o casal que chegou primeiro, onde, quando, quantos vivem
  function metaOf(id, d) {
    const ppl = (d.people || []).slice().sort((a, b) => a.id - b.id), casal = ppl.slice(0, 2).map((p) => p.name);
    return {
      id, seed: d.seed, size: d.size || C.MAP, casal: casal.join(' e '), local: d.siteLabel || '', t: d.t,
      vivos: ppl.filter((p) => p.alive).length, over: !!d.over, savedAt: d.savedAt || 0, conta: d.conta || '',
      aldeia: !!(d.stats && d.stats.eraEnd),
    };
  }
  Save.newSlot = function () { Save.slot = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); return Save.slot; };
  Save.store = function (S, extra) {
    const st = ls(); if (!st) return null;
    if (!Save.slot) Save.newSlot();
    try {
      const d = Object.assign(Save.serialize(S), extra || {});
      const txt = JSON.stringify(d);
      st.setItem(keyOf(Save.slot), txt);
      const l = readIdx(st).filter((m) => m.id !== Save.slot);
      l.push(metaOf(Save.slot, d));
      writeIdx(st, l);
      Save.erro = '';
      return txt;
    } catch (e) { Save.erro = /quota/i.test(String(e && (e.name + e.message))) ? 'cheio' : 'falha'; return null; }
  };
  // os mundos guardados neste aparelho, do mais recente ao mais antigo (o save de antes da 0.16 entra na lista aqui)
  Save.list = function () {
    const st = ls(); if (!st) return [];
    let l = readIdx(st);
    if (!l.some((m) => m.id === 'a')) {
      try {
        const raw = st.getItem(C.SAVE_KEY), d = raw ? JSON.parse(raw) : null;
        if (d && d.game === 'genesis') { l.push(metaOf('a', d)); writeIdx(st, l); }
      } catch (e) { /* save velho ilegível: fica fora da lista */ }
    }
    l = l.filter((m) => { try { return !!st.getItem(keyOf(m.id)); } catch (e) { return false; } });
    return l.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  };
  Save.remove = function (id) {
    const st = ls(); if (!st || !id) return;
    try { st.removeItem(keyOf(id)); } catch (e) { /* sem acesso */ }
    writeIdx(st, readIdx(st).filter((m) => m.id !== id));
    if (Save.slot === id) Save.slot = '';
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
  // um mundo pelo id (sem id: o aberto; sem mundo aberto: o mais recente)
  Save.read = function (id) {
    const st = ls(); if (!st) return null;
    const k = id || Save.slot || (Save.list()[0] || {}).id;
    if (!k) return null;
    try { const raw = st.getItem(keyOf(k)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  // apaga só o mundo aberto (os outros ficam)
  Save.clear = function () { if (Save.slot) Save.remove(Save.slot); };
})(globalThis.G = globalThis.G || {});
