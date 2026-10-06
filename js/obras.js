/* Gods · Obras (Etapa 7): toda obra evolui no lugar, a casa que o lugar pede, o armazém, as oficinas
   (marcenaria e tecelagem), os caminhos que o povo abre e as trilhas que se formam sozinhas, mantas e redes.
   Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const O = G.Obras = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Tech = () => G.Tech;
  const TT = () => G.T;
  const DAY = () => C.DAY_MIN;

  // ---------- estado ----------
  O.init = function (S) {
    const w = S.world, n = w.W * w.H;
    // saves antigos: a barraca avançada vira barraca de nível 2; a melhoria antiga (to) vira o nível 2
    for (const b of S.buildings) {
      if (b.type === 'barraca2') { b.type = 'barraca'; b.lv = 2; }
      if (!b.lv) b.lv = 1;
      if (b.kind === undefined) b.kind = null;
      if (b.up && b.up.to) b.up = { lv: (b.lv || 1) + 1, kind: null, have: Object.assign({}, b.up.have), progress: b.up.progress || 0 };
      for (const src of [b.have, b.up && b.up.have]) if (src) for (const k of C.MATERIALS) if (src[k] === undefined) src[k] = 0;
    }
    for (const k of Object.keys(C.START_STOCK)) if (S.stock[k] === undefined) S.stock[k] = 0;
    const o = S.obras || (S.obras = {});
    if (!w.road || w.road.length !== n) w.road = new Uint8Array(n);
    if (!w.foot || w.foot.length !== n) w.foot = new Float32Array(n);
    if (!w.roadJob || w.roadJob.length !== n) w.roadJob = new Uint8Array(n);
    // o que veio do save
    if (o.roads) { unpackRuns(o.roads, w.road); o.roads = null; }
    if (o.foot) { for (let i = 0; i + 1 < o.foot.length; i += 2) w.foot[o.foot[i]] = o.foot[i + 1]; o.foot = null; }
    w.roadCount = 0;
    for (let i = 0; i < n; i++) if (w.road[i]) w.roadCount++;
    o.jobs = (o.jobs || []).filter((j) => j && j.i >= 0 && j.i < n);
    for (const j of o.jobs) w.roadJob[j.i] = j.lv;
    o.trails = o.trails || 0;
    for (const p of S.people) {
      if (p.manta === undefined) p.manta = null;
      if (p.rede === undefined) p.rede = null;
    }
    const st = S.stats;
    st.tabuasMade = st.tabuasMade || 0; st.mantasMade = st.mantasMade || 0; st.redesMade = st.redesMade || 0;
    st.roadsBuilt = st.roadsBuilt || 0; st.upgrades = st.upgrades || 0; st.fibraGot = st.fibraGot || 0;
  };

  // runs (valor, quantos) em base 36: o caminho de um mapa inteiro cabe em poucos bytes
  function packRuns(a) {
    const out = [];
    let cur = a[0], n = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === cur) n++;
      else { out.push(cur + ':' + n.toString(36)); cur = a[i]; n = 1; }
    }
    out.push(cur + ':' + n.toString(36));
    return out.join('.');
  }
  function unpackRuns(str, into) {
    let i = 0;
    for (const part of String(str).split('.')) {
      const [v, m] = part.split(':');
      const n = parseInt(m, 36) || 0, val = +v || 0;
      if (val) into.fill(val, i, Math.min(into.length, i + n));
      i += n;
    }
  }
  O.packRuns = packRuns;
  O.unpackRuns = unpackRuns;
  O.pack = function (S) {
    const w = S.world, o = S.obras || {};
    const foot = [];
    if (w.foot) for (let i = 0; i < w.foot.length; i++) if (w.foot[i] >= 1) foot.push(i, Math.round(w.foot[i]));
    return { roads: w.road ? packRuns(w.road) : '', foot, jobs: (o.jobs || []).map((j) => ({ i: j.i, lv: j.lv, prog: +(j.prog || 0).toFixed(3) })), trails: o.trails || 0 };
  };

  // ---------- definição, ambiente ----------
  const def = (b) => Sim().def(b);
  const built = (S, t) => S.buildings.some((b) => b.built && b.type === t);
  O.built = built;
  // o que tem em volta da obra (raio 4 do centro): água, mata, campo aberto, serra
  O.envOf = function (S, b) {
    const w = S.world, T = TT(), W = w.W;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    let water = false, forest = 0, open = 0, hill = 0, trees = 0, rocks = 0;
    for (let y = Math.floor(cy - 5); y <= Math.ceil(cy + 5); y++) for (let x = Math.floor(cx - 5); x <= Math.ceil(cx + 5); x++) {
      if (x < 0 || y < 0 || x >= W || y >= w.H) continue;
      const i = y * W + x, t = w.tile[i], d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // água a até 3 passos da beira da obra
      if (G.IS_WATER[t]) {
        const dx = Math.max(b.x - x, 0, x - (b.x + b.w - 1)), dy = Math.max(b.y - y, 0, y - (b.y + b.h - 1));
        if (Math.max(dx, dy) <= 3) water = true;
      }
      if (d <= 4.5) {
        if (t === T.FOREST) forest++;
        else if (t === T.GRASS || t === T.DRY || t === T.SAND) open++;
        else if (t === T.HILL || t === T.MOUNTAIN) hill++;
      }
      if (d <= 5.5) {
        const ob = G.W.objAt(w, i);
        if (ob && ob.k === 'tree') trees++;
        else if (ob && ob.k === 'rock') rocks++;
      }
    }
    const E = C.ENV;
    return {
      agua: water,
      mata: forest >= E.mata.forest || trees >= E.mata.trees,
      campo: open >= E.campo.open,
      serra: hill >= E.serra.hill || rocks >= E.serra.rocks,
    };
  };
  O.envOk = (S, b, env) => !!O.envOf(S, b)[env];

  // ---------- armazém ----------
  // quanto a comida estraga (o melhor armazém de pé, perto do estoque)
  O.storeMult = function (S) {
    let m = 1;
    for (const b of S.buildings) if (b.built && b.type === 'armazem') m = Math.min(m, def(b).store.rot);
    return m;
  };
  O.guarded = (S) => built(S, 'armazem');   // lobo não leva a comida guardada

  // ---------- quando uma obra fica pronta ----------
  O.onBuilt = function (S, b) {
    const Sm = Sim(), first = !S.buildings.some((x) => x !== b && x.built && x.type === b.type);
    if (b.type === 'armazem') {
      if (first) Sm.chron(S, 'Ergueram o primeiro armazém. A comida estraga menos, e o lobo não leva mais nada do estoque.');
      else Sm.toast(S, 'Armazém pronto.');
      return true;
    }
    if (b.type === 'marcenaria') {
      if (first) { Sm.chron(S, 'A primeira marcenaria ficou pronta. Agora o Ofício faz tábuas.'); Sm.toast(S, 'Marcenaria pronta. O Ofício faz tábuas quando uma obra pede.', 'good'); }
      else Sm.toast(S, 'Marcenaria pronta.');
      return true;
    }
    if (b.type === 'tecelagem') {
      if (first) { Sm.chron(S, 'Montaram o primeiro tear. O Ofício vai tecer mantas e redes.'); Sm.toast(S, 'Tecelagem pronta. Mantas esquentam o sono; redes fazem render.', 'good'); }
      else Sm.toast(S, 'Tecelagem pronta.');
      return true;
    }
    // Etapa 12
    if (b.type === 'mina') {
      if (first) { Sm.chron(S, 'Abriram a primeira mina, morro adentro. Dela sai pedra sem fim e, com sorte, carvão e minério.'); Sm.toast(S, 'Mina pronta. Suba Mineração nas Vontades.', 'good'); }
      else Sm.toast(S, 'Mina pronta.');
      return true;
    }
    if (b.type === 'ferraria') {
      if (first) { Sm.chron(S, 'A primeira ferraria ficou pronta: a forja acesa, o fole, a bigorna. Com minério e carvão, o Ofício faz ferramentas de ferro.'); Sm.toast(S, 'Ferraria pronta. Forja quem é ferreiro nato ou bom de Ofício.', 'good'); }
      else Sm.toast(S, 'Ferraria pronta.');
      return true;
    }
    return false;
  };
  O.onUpgraded = function (S, b, from) {
    S.stats.upgrades = (S.stats.upgrades || 0) + 1;
    const d = def(b);
    if (d.kind && !(S.stats.houses || {})[d.kind]) {
      const h = S.stats.houses || (S.stats.houses = {});
      h[d.kind] = true;
      Sim().toast(S, 'A primeira ' + d.name.toLowerCase() + ' do povo. Cabem ' + d.cap + '.', 'good');
    }
    S.people.forEach((p) => p.alive && Sim().addMem(S, p, 'obra'));
    S.events.push({ k: 'upgrade', x: b.x + b.w / 2, y: b.y + b.h / 2 });
  };

  // ---------- caminhos ----------
  function setRoad(S, i, v) {
    const w = S.world, was = w.road[i];
    if (was === v) return;
    w.road[i] = v;
    w.roadCount += (v ? 1 : 0) - (was ? 1 : 0);
    S.events.push({ k: 'road', i });
  }
  O.setRoad = setRoad;
  // o jogador marca: lv 2 = caminho de terra, lv 3 = de pedra, 0 = desmanchar
  // por que não dá caminho aqui ('' = dá)
  O.roadWhy = function (S, i) {
    const w = S.world;
    if (i < 0 || i >= w.W * w.H) return 'Fora do mapa';
    if (S.seen && !S.seen[i]) return 'A névoa cobre esse lugar';
    if (G.IS_WATER[w.tile[i]]) return 'Não dá caminho na água';
    if (w.bgrid[i] >= 0) return 'Já tem uma obra aqui';
    if (Sim().isCamp(S, i)) return 'Esse é o lugar do estoque';
    const ob = G.W.objAt(w, i);
    if (ob && ob.k === 'tree') return 'Tem uma árvore no caminho';
    if (ob && ob.k === 'rock') return 'Tem uma pedra no caminho';
    if (ob && ob.k === 'grave') return 'Aí tem um túmulo';   // túmulo ninguém pisa
    return '';
  };
  O.canRoad = (S, i) => !O.roadWhy(S, i);
  // uma obra erguida em cima do caminho: o caminho (e o que estava marcado) sai dali
  O.clearTile = function (S, i) {
    const w = S.world;
    if (!w.road) return;
    if (w.roadJob[i]) { S.obras.jobs = S.obras.jobs.filter((j) => j.i !== i); w.roadJob[i] = 0; }
    if (w.road[i]) setRoad(S, i, 0);
    if (w.foot) w.foot[i] = 0;
  };
  O.markRoad = function (S, i, lv) {
    const w = S.world, o = S.obras;
    if (lv === 0) {
      // desmancha: some o caminho marcado e o feito (a trilha volta a ser grama com o tempo)
      const had = w.road[i] >= 2 || w.roadJob[i];
      o.jobs = o.jobs.filter((j) => j.i !== i);
      w.roadJob[i] = 0;
      if (w.road[i] >= 2) setRoad(S, i, 0);
      return had;
    }
    if (!O.canRoad(S, i) || w.road[i] >= lv || w.roadJob[i] >= lv) return false;
    const j = o.jobs.find((x) => x.i === i);
    if (j) j.lv = lv; else o.jobs.push({ i, lv, prog: 0 });
    w.roadJob[i] = lv;
    o.blockedUntil = 0;   // caminho novo: vale olhar de novo
    return true;
  };
  // há caminho para abrir? (de pedra só com pedra no estoque)
  O.roadNeed = function (S) {
    const o = S.obras;
    if (!o || !o.jobs.length || o.blockedUntil > S.t) return 0;   // o que sobrou marcado não tem como chegar (cercado de árvores)
    return o.jobs.some((j) => j.lv < 3 || S.stock.pedra > 0) ? 1 : 0;
  };
  O.jobAt = (S, i) => (S.obras ? S.obras.jobs.find((j) => j.i === i) : null);
  O.finishRoad = function (S, j) {
    const w = S.world;
    // o caminho limpa o toco e o arbusto do lugar
    const ob = G.W.objAt(w, j.i);
    if (ob && (ob.k === 'stump' || ob.k === 'bush')) G.W.removeObj(w, ob);
    setRoad(S, j.i, j.lv); w.roadJob[j.i] = 0;
    S.obras.jobs.splice(S.obras.jobs.indexOf(j), 1);
    S.stats.roadsBuilt++;
    if (S.stats.roadsBuilt === 1) Sim().chron(S, 'Abriram o primeiro caminho. Por ele se anda mais depressa.');
  };
  // quem anda deixa pegada: onde muita gente passa, a grama gasta e vira trilha
  O.step = function (S, i) {
    const w = S.world;
    if (w.foot && w.road[i] <= 1) w.foot[i] += 1;
  };
  O.daily = function (S) {
    const w = S.world, o = S.obras;
    if (!w.foot || S.resumido) return;   // dia resumido (jogo fechado): ninguém anda, e a trilha, a manta e a rede ficam como estavam
    let made = 0;
    for (let i = 0; i < w.foot.length; i++) {
      const f = w.foot[i];
      if (f <= 0) continue;
      const nf = f * C.TRAIL_DECAY;
      w.foot[i] = nf < 0.5 ? 0 : nf;
      if (w.road[i] === 0 && f >= C.TRAIL_ON && !G.IS_WATER[w.tile[i]] && w.bgrid[i] < 0 && !Sim().isCamp(S, i)) { setRoad(S, i, 1); made++; }
      else if (w.road[i] === 1 && nf < C.TRAIL_OFF) setRoad(S, i, 0);
    }
    if (made && !o.trails) Sim().toast(S, 'De tanto passarem, abriu-se uma trilha no mato. Por ela se anda mais depressa.', 'good');
    o.trails += made;
    // o armazém abre depois do primeiro inverno
    if (!S.stats.armazemOpen && S.stats.winters >= 1) {
      S.stats.armazemOpen = true;
      Sim().toast(S, 'Nova obra: o armazém. Guarda a comida do estoque: estraga menos e o lobo não leva.', 'good');
    }
    // gente com manta e rede: gastam com o uso
    for (const p of S.people) {
      if (!p.alive) continue;
      if (p.manta) { p.manta.dur -= C.MANTA_WEAR_DAY * (S.ck.season === 3 ? 1.5 : 1); if (p.manta.dur <= 0) p.manta = null; }
      if (p.rede) { p.rede.dur -= C.REDE_WEAR_DAY; if (p.rede.dur <= 0) p.rede = null; }
    }
  };

  // ---------- oficinas: tábuas, mantas e redes ----------
  const nearCamp = (S, p) => Math.hypot(p.x - S.camp.x - 1, p.y - S.camp.y - 1) <= 7;
  O.hourly = function (S) {
    // quem passa pelo acampamento sem manta ou rede pega uma do estoque
    const st = S.stock;
    if (st.mantas <= 0 && st.redes <= 0) return;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 3 || !nearCamp(S, p)) continue;
      if (st.mantas > 0 && (!p.manta || p.manta.dur < 10)) { st.mantas--; p.manta = { dur: 100 }; }
      if (st.redes > 0 && (!p.rede || p.rede.dur < 10)) { st.redes--; p.rede = { dur: 100 }; }
    }
  };
  const users = (S) => S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 3);
  O.needMantas = (S) => users(S).filter((p) => !p.manta || p.manta.dur < 15).length - S.stock.mantas;
  O.needRedes = (S) => users(S).filter((p) => !p.rede || p.rede.dur < 15).length - S.stock.redes;
  // tábuas: o que as obras marcadas pedem, mais uma folga pequena
  O.needTabuas = function (S) {
    const short = S.ctx && S.ctx.matShort ? S.ctx.matShort.tabuas || 0 : 0;
    return Math.max(short, C.TABUA_KEEP - S.stock.tabuas);
  };
  const shopOf = (S, k) => {
    let best = null;
    for (const b of S.buildings) if (b.built && def(b).shop && def(b).shop.k === k && (!best || def(b).shop.speed > def(best).shop.speed)) best = b;
    return best;
  };
  O.shopOf = shopOf;
  // o que o Ofício faz agora: ferramentas e roupas (Etapa 5) ou, nas oficinas, tábuas, mantas e redes
  // p (Etapa 12): para quem é o plano. O trabalho da forja só entra para quem sabe forjar
  O.oficioPlan = function (S, p) {
    const base = Tech().oficioPlan(S);
    if (!Tech().known(S, 'pedra')) return null;
    const st = S.stock, cold = S.ck.season >= 2;
    const cand = [];
    if (base) cand.push(Object.assign({ pri: base.k === 'roupas' && cold ? 5 : base.k === 'ferramentas' && base.gap >= 3 ? 4.5 : 3 }, base));
    const marc = shopOf(S, 'tabuas'), tec = shopOf(S, 'tecido');
    if (marc && st.madeira >= C.TABUA_WOOD + 2) {
      const gap = O.needTabuas(S), short = S.ctx && S.ctx.matShort ? S.ctx.matShort.tabuas || 0 : 0;
      if (gap > 0) cand.push({ k: 'tabuas', gap, b: marc, pri: short > 0 ? 4 : 1.5 });
    }
    if (tec) {
      const gm = O.needMantas(S), gr = O.needRedes(S);
      if (gm > 0 && st.fibra >= C.MANTA_FIBRA) cand.push({ k: 'mantas', gap: gm, b: tec, pri: cold ? 4.2 : 2.5 });
      if (gr > 0 && st.fibra >= C.REDE_FIBRA) cand.push({ k: 'redes', gap: gr, b: tec, pri: 2 });
    }
    if (G.Minas && (!p || (G.Povos && G.Povos.canForge(S, p)))) for (const pl of G.Minas.plans(S)) cand.push(pl);   // Etapa 12: ferro e joias
    if (!cand.length) return null;
    cand.sort((a, b) => b.pri - a.pri || b.gap - a.gap);
    return cand[0];
  };
  O.costOf = (k) => (G.Minas && G.Minas.isForge(k) ? G.Minas.costOf(k) : k === 'tabuas' ? { madeira: C.TABUA_WOOD } : k === 'mantas' ? { fibra: C.MANTA_FIBRA } : k === 'redes' ? { fibra: C.REDE_FIBRA } : k === 'roupas' ? C.ROUPA_COST : C.TOOL_COST);
  O.minutesOf = function (S, k, b) {
    if (G.Minas && G.Minas.isForge(k)) return G.Minas.minutesOf(S, k, b);   // Etapa 12
    if (k === 'tabuas') return C.TABUA_MIN / (b ? def(b).shop.speed : 1);
    if (k === 'mantas' || k === 'redes') return C.TECIDO_MIN / (b ? def(b).shop.speed : 1);
    return C.OFICIO_MIN * (k === 'roupas' ? 1.5 : 1);
  };
  O.make = function (S, k, n) {
    if (G.Minas && G.Minas.isForge(k)) return G.Minas.make(S, k, n);   // Etapa 12
    if (k === 'ferramentas' || k === 'roupas') return Tech().make(S, k, n);
    S.stock[k] += n;
    const st = S.stats, Sm = Sim();
    if (k === 'tabuas') { st.tabuasMade += n; if (st.tabuasMade === n) Sm.chron(S, 'Saíram as primeiras tábuas da marcenaria.'); }
    if (k === 'mantas') { st.mantasMade += n; if (st.mantasMade === n) Sm.chron(S, 'Ficou pronta a primeira manta. Quem dorme com ela sente menos frio.'); }
    if (k === 'redes') { st.redesMade += n; if (st.redesMade === n) Sm.chron(S, 'Teceram a primeira rede de dormir. O sono rende mais.'); }
  };
  // fibra: quem corta árvore tira embira da casca (depois dos cestos)
  O.embira = (S) => (Tech().known(S, 'cestos') ? C.EMBIRA : 0);

  // ---------- metas ----------
  // missões pequenas que ensinam as obras (não seguram a fase): na família e nas descobertas
  O.missions = function (phase) {
    if (phase === 2) return [
      { id: 'o_fogueira', text: 'Melhore a fogueira', opt: true, reward: 4, done: false },
      { id: 'o_caminho', text: 'Abra um caminho', opt: true, reward: 3, done: false },
    ];
    if (phase === 3) return [
      { id: 'o_armazem', text: 'Erga um armazém', opt: true, reward: 5, done: false },
      { id: 'o_tabuas', text: 'Faça as primeiras tábuas', opt: true, reward: 4, done: false },
    ];
    return [];
  };
  // fase 4, depois das descobertas: a aldeia
  O.goals4 = function () {
    return [
      { id: 'o_casa', text: 'Erga a primeira casa', reward: 12, done: false },
      { id: 'o_oficinas', text: 'Tenha marcenaria e tecelagem', reward: 8, done: false },
      { id: 'o_mantas', text: 'Agasalhe 5 pessoas com mantas', reward: 8, done: false },
      { id: 'o_caminhos', text: 'Abra 30 passos de caminho', reward: 6, done: false },
      { id: 'o_melhorias', text: 'Faça 8 melhorias', reward: 10, done: false },
    ];
  };
  O.goalTest = {
    o_fogueira: (S) => S.buildings.some((b) => b.built && b.type === 'fogueira' && b.lv >= 2),
    o_caminho: (S) => (S.stats.roadsBuilt || 0) > 0,
    o_armazem: (S) => built(S, 'armazem'),
    o_tabuas: (S) => (S.stats.tabuasMade || 0) > 0,
    o_casa: (S) => Object.keys(S.stats.houses || {}).length > 0,
    o_oficinas: (S) => built(S, 'marcenaria') && built(S, 'tecelagem'),
    o_mantas: (S) => S.people.filter((p) => p.alive && p.manta).length >= 5,
    o_caminhos: (S) => (S.stats.roadsBuilt || 0) >= 30,
    o_melhorias: (S) => (S.stats.upgrades || 0) >= 8,
  };

  // obra que só abre depois de algo além de uma descoberta (o armazém, depois do primeiro inverno)
  O.openWhy = function (S, type) {
    const d = C.BUILD[type];
    if (d && d.open === 'inverno' && !(S.stats.winters >= 1)) return 'abre depois do primeiro inverno';
    if (type === 'estatua') return G.Deus ? G.Deus.buildWhy(S, type) : 'chega com o nível 3 de Deus';   // Etapa 11
    return '';
  };
})(globalThis.G = globalThis.G || {});
