/* Gods · Memória (Etapa 13): a morte ganha rito, e o que Deus faz vira história contada.
   1) Quem morre deixa um corpo. Achado, alguém leva para junto do fogo; à tardinha o povo vela, na manhã seguinte
      enterra no cemitério (o marco é uma obra; sem marco, o povo escolhe o lugar). Cada povo se despede do seu jeito.
      A família volta à cova com flores, e todo ano, no último dia do outono, a aldeia vai junta: o dia dos mortos.
   2) Um ato grande de Deus, visto por alguém, vira conto. Nas noites de história o conto passa adiante; quem conta
      sem ter visto muda um detalhe. A criança que cresce ouvindo contos de medo fica temente; de cuidado, confiante.
   3) A erva-do-sonho nasce na mata úmida. Achada, vira rito: à noite, só adultos, ao pé do fogo. No meio do rito
      alguém faz uma pergunta a Deus, e o jogo pausa para o jogador escolher uma de três respostas.
   Com o jogo fechado não há velório, visita, rito nem pergunta: os corpos são enterrados sem cerimônia. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const M = G.Memoria = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Wd = () => G.W, Pv = () => G.Povos, Dz = () => G.Deus, Gd = () => G.God, Lf = () => G.Life;
  const DAY = C.DAY_MIN;
  const age = (S, p) => Fam().age(S, p);
  const person = (S, id) => Fam().person(S, id);
  const has = (p, t) => p.traits && p.traits.indexOf(t) >= 0;
  const oa = (p) => (p.sex === 'F' ? 'a' : 'o');
  const ela = (p) => (p.sex === 'F' ? 'ela' : 'ele');
  const rest = (S) => !!(S.safe || S.resumido);
  const ev = (S, o) => { if (!S.safe) S.events.push(Object.assign({ k: 'memoria' }, o)); };
  const hourOf = (S) => Math.floor(S.ck.hour + 1e-6);
  const within = (S, r) => S.ck.hour >= r[0] && S.ck.hour < r[1];
  // sorteio que não mexe no sorteio do mundo (para falas e para a forma do conto)
  const pk = (arr, n) => arr[Math.abs(Math.floor(n)) % arr.length];
  const GRIEF = { perdeuAlguem: 1, perdeuCompanheiro: 1, perdeuFamilia: 1, perdeuBebe: 1 };
  const KIN = { 'mãe': 1, pai: 1, filha: 1, filho: 1, 'irmã': 1, 'irmão': 1, 'avó': 1, 'avô': 1, neta: 1, neto: 1 };

  // ---------- estado ----------
  M.init = function (S) {
    const m = S.memoria || (S.memoria = {});
    m.corpos = m.corpos || []; m.contos = m.contos || []; m.nc = m.nc || 1; m.kindAt = m.kindAt || {};
    m.pend = m.pend || []; m.prom = m.prom || []; m.fin = m.fin || { year: 0 };
    m.erva = m.erva || { known: 0, lei: '', last: -1e9, tem: -1, hoje: -1 };
    m.corpos = m.corpos.filter((id) => { const d = person(S, id); return d && !d.alive && d.corpo; });
    for (const id of m.corpos) { const d = person(S, id); if (d.corpo.res && !levando(S, d)) solta(S, d); }   // ao abrir o save, ninguém está com o corpo no colo
    ervaSpots(S);
    const st = S.stats;
    for (const k of ['velorios', 'enterros', 'visitas', 'finados', 'contos', 'contados', 'recontos', 'ritos', 'respostas']) st[k] = st[k] || 0;
    // save de antes da 0.13 numa fase adiantada: ganha as missões da Memória (uma vez)
    if (!st.memMissions) {
      st.memMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const g of M.missions(f)) if (!S.goals.some((x) => x.id === g.id)) S.goals.push(g);
    }
  };

  // ---------- parentes, povos e ritos ----------
  function kinIds(S, d) {
    const out = new Set();
    for (const q of Fam().partners(S, d)) out.add(q.id);
    for (const k of Fam().family(S, d)) if (k.q && k.q.alive && KIN[k.r]) out.add(k.q.id);
    return out;
  }
  const isKin = (d, p) => !!(d.corpo && d.corpo.kin && d.corpo.kin.indexOf(p.id) >= 0);
  // quem volta à cova: a família viva (de 7 anos para cima); quem não deixou família é lembrado pelo amigo mais chegado
  function visitantes(S, d) {
    const kin = [...kinIds(S, d)].map((id) => person(S, id)).filter((q) => q && q.alive && age(S, q) >= 7);
    if (kin.length) return kin.sort((a, b) => (Fam().isPartner(b, d) ? 1 : 0) - (Fam().isPartner(a, d) ? 1 : 0) || a.id - b.id);
    const am = S.people.filter((q) => q.alive && !q.carriedBy && age(S, q) >= 7 && ((q.rel && q.rel[d.id]) || 0) >= C.VISITA_AMIGO).sort((a, b) => b.rel[d.id] - a.rel[d.id] || a.id - b.id)[0];
    return am ? [am] : [];
  }
  // o povo que manda no rito: o do morto (o mestiço, pelo sangue que tem mais)
  function povoDe(p) {
    if (!p.povo) return 'humano';
    if (p.povo !== 'meio' || !p.sangue) return p.povo;
    return Object.keys(p.sangue).sort((a, b) => p.sangue[b] - p.sangue[a] || a.localeCompare(b))[0] || 'humano';
  }
  const RITO_LETRA = { humano: 'h', elfo: 'e', anao: 'a', fera: 'f' };
  const RITO_NOME = { h: 'uma vela acesa', e: 'uma árvore plantada em cima', a: 'uma laje de pedra', f: 'os uivos do povo-fera' };
  M.RITO_NOME = RITO_NOME;
  const canCarry = (S, p) => p.alive && !p.carriedBy && !p.labor && !p.sleeping && age(S, p) >= C.CARREGA_AGE && !Fam().carrying(S, p) && p.needs.saude >= 40 && p.needs.energia >= 15;

  // ---------- o chão ----------
  function freeTile(S, i) {
    const w = S.world;
    return i >= 0 && i < w.W * w.H && !Wd().objAt(w, i) && w.bgrid[i] < 0 && !Sim().isCamp(S, i) && !G.IS_WATER[w.tile[i]] && w.tile[i] !== G.T.MOUNTAIN;
  }
  // onde o corpo fica no velório: um lugar livre a dois ou três passos do fogo (de preferência do lado de baixo)
  function wakeSpot(S) {
    const w = S.world, L = Lf();
    const f = (L && L.campFire(S, true)) || S.buildings.find((b) => b.type === 'fogueira' && b.built);
    const cx = f ? f.x : S.camp.x + 1, cy = f ? f.y : S.camp.y + 1;
    let best = -1, bd = 1e9;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dy), i = (cy + dy) * w.W + cx + dx;
      if (d < 2 || d > 4.2 || cx + dx < 1 || cy + dy < 1 || cx + dx >= w.W - 1 || cy + dy >= w.H - 1 || !freeTile(S, i)) continue;
      const s = d + (dy < 0 ? 0.7 : 0) + (S.memoria.corpos.some((id) => { const q = person(S, id); return q && q.corpo && q.corpo.wi === i; }) ? 9 : 0);
      if (s < bd) { bd = s; best = i; }
    }
    return best >= 0 ? best : (cy + 2) * w.W + cx;
  }
  // o marco do cemitério (a obra); pronto ou ainda marcado, é em volta dele que as covas se abrem
  function cemB(S) {
    const m = S.memoria;
    let b = m.cem ? Sim().building(S, m.cem) : null;
    if (b && b.type !== 'cemiterio') b = null;
    if (!b) { b = S.buildings.find((x) => x.type === 'cemiterio' && x.built) || S.buildings.find((x) => x.type === 'cemiterio' && !x.site) || null; m.cem = b ? b.id : 0; }
    return b;
  }
  M.cemetery = cemB;
  // sem marco, o povo escolhe o lugar: perto, mas fora da aldeia, em chão livre e longe da água
  function autoCem(S) {
    const w = S.world, Sm = Sim();
    let best = null, bs = 1e9;
    for (let r = 7; r <= 22 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = S.camp.x + dx, y = S.camp.y + dy;
      if (x < 4 || y < 4 || x >= w.W - 5 || y >= w.H - 5 || Sm.canPlace(S, 'cemiterio', x, y)) continue;
      let free = 0, wet = 0;
      for (let yy = y - 4; yy <= y + 5; yy++) for (let xx = x - 4; xx <= x + 5; xx++) {
        const i = yy * w.W + xx;
        if (G.IS_WATER[w.tile[i]]) wet++;
        else if (!((xx - x) & 1) && !((yy - y) & 1) && freeTile(S, i)) free++;
      }
      if (free < 10 || wet > 4) continue;
      const s = Math.abs(Math.hypot(dx, dy) - 10) + wet * 0.5 - free * 0.05;
      if (s < bs) { bs = s; best = { x, y }; }
    }
    if (!best) return null;
    const b = Sm.placeBlueprint(S, 'cemiterio', best.x, best.y);
    if (!b) return null;
    b.auto = 1;
    Sm.complete(S, b);
    return b;
  }
  // a próxima cova: em fileiras, com um passo de folga, o mais perto possível do marco
  function plotNear(S, b) {
    const w = S.world, ax = b.x, ay = b.y, r0 = (Sim().def(b).mem || { r: 6 }).r;
    for (let rr = r0; rr <= r0 + 10; rr += 2) {
      let best = -1, bd = 1e9;
      for (let y = ay - rr; y <= ay + 1 + rr; y++) for (let x = ax - rr; x <= ax + 1 + rr; x++) {
        if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1 || ((x - ax) & 1) || ((y - ay) & 1)) continue;
        const i = y * w.W + x, d = Math.hypot(x - ax - 0.5, y - ay - 0.5);
        if (d < 2.4 || d > rr + 0.5 || !freeTile(S, i) || taken(S, i)) continue;
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  const taken = (S, i) => S.memoria.corpos.some((id) => { const q = person(S, id); return q && q.corpo && q.corpo.pi === i; });
  // todas as covas com nome (as do cemitério e as antigas, de antes da 0.13)
  function graves(S) {
    const w = S.world, out = [];
    for (let i = w.genCount; i < w.objs.length; i++) if (w.objs[i].k === 'grave') out.push(w.objs[i]);
    return out;
  }
  M.graves = graves;
  const graveAt = (S, x, y) => { const o = Wd().objAt(S.world, y * S.world.W + x); return o && o.k === 'grave' ? o : null; };

  // ---------- a morte ----------
  const seenBy = (S, d) => Math.hypot(d.x - S.camp.x - 1, d.y - S.camp.y - 1) <= C.CORPO_CAMP ||
    S.people.some((q) => q.alive && q !== d && !q.carriedBy && age(S, q) >= 7 && Math.hypot(q.x - d.x, q.y - d.y) <= C.CORPO_VER);
  // chamado por Sim quando alguém morre. true: o corpo espera o velório e o enterro (a cova não nasce na hora)
  M.onDeath = function (S, p) {
    const m = S.memoria;
    if (!m) return false;
    // morreu de fome, frio ou sede depois de rezar sem resposta: o silêncio de Deus vira conto
    if (!S.safe && (p.cause === 'fome' || p.cause === 'frio' || p.cause === 'sede') && (p.prayer || p.mem.some((x) => x.k === 'oracaoIgnorada'))) m.calou = { a: p.name, sx: p.sex };   // vira conto na hora seguinte
    if (rest(S)) return false;
    if (!S.people.some((q) => q.alive && q !== p && !q.carriedBy && age(S, q) >= C.CARREGA_AGE)) return false;   // não sobrou quem carregue
    const c = p.corpo = { st: 0, t: S.t, kin: [...kinIds(S, p)], r: RITO_LETRA[povoDe(p)] || 'h' };
    const par = Fam().partners(S, p).map((q) => RITO_LETRA[povoDe(q)] || 'h').find((l) => l !== c.r);
    if (par) c.r2 = par;
    if (seenBy(S, p)) c.st = 1;
    m.corpos.push(p.id);
    return true;
  };
  // cova sem cerimônia (jogo fechado, ninguém para carregar, tempo demais): no cemitério, se houver; senão, ali mesmo
  function quickBury(S, d) {
    const w = S.world, b = cemB(S);
    let i = b ? plotNear(S, b) : -1;
    if (i < 0) {
      const r = Wd().findNearest(w, Math.floor(d.y) * w.W + Math.floor(d.x), (j) => (freeTile(S, j) ? 1 : 0), 30);
      i = r ? r.idx : -1;
    }
    grave(S, d, i, null);
  }
  function grave(S, d, i, by) {
    const w = S.world, m = S.memoria, c = d.corpo || {};
    m.corpos = m.corpos.filter((id) => id !== d.id);
    delete d.corpo;
    if (i < 0) { d.semCova = 1; return null; }
    const x = i % w.W, y = (i / w.W) | 0;
    const o = Wd().addObj(w, 'grave', x, y, { name: d.name, pid: d.id, t: S.t, r: (c.r || 'h') + (c.r2 || '') });
    if (c.velado) o.vel = 1;
    if (c.r === 'a' && by && S.stock.pedra >= C.LAJE_PEDRA) { S.stock.pedra -= C.LAJE_PEDRA; o.laje = 1; }
    d.x = x + 0.5; d.y = y + 0.5; d.cova = [x, y];
    S.stats.enterros++;
    return o;
  }
  // o enterro de verdade: quem cavou, a família que vem depois, a primeira cova na Crônica
  function bury(S, d, i, by) {
    const Sm = Sim();
    const o = grave(S, d, i, by);
    if (!o) return;
    for (const q of visitantes(S, d)) q.vis = { x: o.x, y: o.y, d: S.ck.day, pid: d.id };
    const onde = cemB(S) ? 'no cemitério' : 'perto de onde caiu';
    if (S.stats.enterros === 1) Sm.chron(S, by.name + ' abriu a primeira cova ' + onde + ', e ' + d.name + ' ficou ali, com ' + RITO_NOME[o.r.charAt(0)] + '. Quem ficou vai voltar com flores.');
    else Sm.toast(S, d.name + ' foi enterrad' + oa(d) + ' ' + onde + '.', '');
    ev(S, { ev: 'enterro', x: o.x, y: o.y, r: o.r });
  }
  // ninguém achou o corpo: sem despedida, o luto da família dura o dobro
  function lost(S, d) {
    const m = S.memoria, kin = d.corpo.kin;
    m.corpos = m.corpos.filter((id) => id !== d.id);
    delete d.corpo;
    d.semCova = 1;
    for (const id of kin) {
      const q = person(S, id);
      if (!q || !q.alive) continue;
      Sim().addMem(S, q, 'semDespedida');
      for (const x of q.mem) if (GRIEF[x.k]) x.until = S.t + (x.until - S.t) * 2;
    }
    Sim().chron(S, 'Ninguém achou ' + d.name + '. Não houve velório nem cova, e a família vai demorar mais a se consolar.');
  }
  // a vaga do corpo só vale enquanto quem reservou está mesmo com a tarefa (o save não guarda a ação de ninguém)
  function levando(S, d) {
    const q = d.corpo.res ? person(S, d.corpo.res) : null, a = q && q.alive ? q.act : null;
    return !!(a && a.type === 'memoria' && a.m && a.m.carry === d.id);
  }
  // a vaga se perdeu (o save, um susto): quem levava tem a vez de retomar por uma hora
  function solta(S, d) {
    const c = d.corpo;
    if (c.by) { c.pref = c.by; c.prefT = S.t; }
    c.res = 0; c.by = 0;
  }
  const vez = (S, c, p) => !c.pref || c.pref === p.id || S.t - c.prefT > 60 || !person(S, c.pref) || !canCarry(S, person(S, c.pref));
  // de hora em hora: achar, velar, enterrar (as tarefas em si são da IA: M.want e M.task)
  function bodies(S) {
    const m = S.memoria, h = hourOf(S), day = S.ck.day, Sm = Sim();
    for (const id of m.corpos.slice()) {
      const d = person(S, id), c = d && d.corpo;
      if (!c) { m.corpos = m.corpos.filter((x) => x !== id); continue; }
      if (rest(S)) { quickBury(S, d); continue; }
      const dias = (S.t - c.t) / DAY;
      if (c.st === 0) {
        if (seenBy(S, d)) c.st = 1;
        else if (dias >= C.CORPO_MAX_D) { lost(S, d); continue; }
      }
      if (c.res && !levando(S, d)) solta(S, d);
      // passou tempo demais (ninguém pôde carregar): enterra sem cerimônia
      if (c.st >= 1 && dias >= C.CORPO_MAX_D + 1 && !c.by) { quickBury(S, d); continue; }
      if (c.st === 2 && !c.fim && (day > c.vel || (day === c.vel && h >= C.VELORIO_H[1]))) endWake(S, d);
      else if (c.st === 2 && !c.sino && day === c.vel && h >= C.VELORIO_H[0] && h < C.VELORIO_H[1]) { c.sino = 1; ev(S, { ev: 'velorio', on: true, pid: d.id }); Sm.toast(S, 'O povo se junta ao pé do fogo para velar ' + d.name + '.', ''); }
    }
  }
  function endWake(S, d) {
    const c = d.corpo, Sm = Sim();
    c.fim = 1;
    c.velado = (c.n || 0) >= 1;
    if (!c.velado) return;
    S.stats.velorios++;
    if (S.stats.velorios === 1) Sm.chron(S, 'O povo passou a tardinha ao lado de ' + d.name + ', ao pé do fogo, e cada um disse a sua despedida. Foi o primeiro velório.');
    // o povo-fera uiva; o casal de dois povos junta os dois ritos, e isso aproxima os povos
    if (c.r === 'f' || c.r2 === 'f') { ev(S, { ev: 'uivo' }); for (const q of S.people) if (q.alive && !q.sleeping && q.povo === 'fera') Sm.say(S, q, 'Auuuu…', true); }
    if (c.r2 && Pv() && Pv().onRite) Pv().onRite(S, c.r, c.r2);
    ev(S, { ev: 'velorio', on: false, pid: d.id });
  }
  // o velório ou o rito desta noite seguram a história (hoje a roda é deles)
  M.blockStory = function (S) {
    const m = S.memoria, e = m.erva;
    if (e.rite || (e.hoje === S.ck.day && e.tem === S.ck.day)) return true;
    return !!(m.corpos.length && m.corpos.some((id) => { const d = person(S, id); return d && d.corpo && d.corpo.st === 2 && d.corpo.vel === S.ck.day && !d.corpo.fim; }));
  };

  // ---------- o que cada um quer fazer (para a IA) ----------
  const ADULTO = 18;
  // quem pode entrar no rito: só adulto (18 anos de verdade), acordado, com saúde, sem bebê no colo e sem barriga
  const apto = (S, p) => p.alive && !p.carriedBy && !p.labor && !p.preg && age(S, p) >= ADULTO && p.needs.saude >= 50 && !Fam().carrying(S, p);
  M.canRite = (S, p) => apto(S, p) && !p.sleeping;
  M.want = function (S, p) {
    const m = S.memoria;
    if (!m || rest(S)) return null;
    const e = m.erva, day = S.ck.day;
    if (!m.corpos.length && !m.fin.on && !e.rite && e.hoje !== day && !p.vis) return null;
    const a = age(S, p);
    if (m.fin.on && a >= 5 && !(m.fin.foi && m.fin.foi[p.id])) return { k: 'finados', score: 78 };
    if (e.rite && p.ritoDia !== day && e.rite.part.indexOf(p.id) >= 0 && M.canRite(S, p)) {
      // os convidados vêm para o fogo antes de a roda abrir (anda-se devagar) e esperam sentados
      if (!e.rite.on || S.t - e.rite.t0 < 120) return { k: 'rito', score: 88 };
    }
    for (const id of m.corpos) {
      const d = person(S, id), c = d && d.corpo;
      if (!c) continue;
      if (c.st === 2 && !c.fim && c.vel === day && within(S, C.VELORIO_H) && p.velou !== d.id && a >= 5) return { k: 'velar', score: isKin(d, p) ? 96 : a < 12 ? 60 : 80 };
      if (c.st === 1 && !c.res && canCarry(S, p) && vez(S, c, p)) return { k: 'corpo', score: 90 };
      if (c.st === 2 && c.fim && !c.res && within(S, C.ENTERRO_H) && canCarry(S, p) && vez(S, c, p)) return { k: 'enterrar', score: 90 };
    }
    if (p.vis) {
      if (day - p.vis.d > 2 || !graveAt(S, p.vis.x, p.vis.y)) delete p.vis;
      else if (within(S, C.VISITA_H) && a >= 7) return { k: 'cova', score: 62 };
    }
    if (e.hoje === day && e.cond === p.id && e.tem !== day && S.ck.hour >= 7 && S.ck.hour < 16) return { k: 'erva', score: 70 };
    return null;
  };
  // o lugar e o tempo de cada tarefa. carry: o corpo vai junto (busca em bx, by; leva até x, y)
  M.task = function (S, p, k) {
    const m = S.memoria, w = S.world, e = m.erva, day = S.ck.day;
    if (!m || rest(S)) return null;
    if (k === 'finados') {
      if (!m.fin.on) return null;
      return { k, x: m.fin.x, y: m.fin.y, r0: 1.4, r1: 5.5, min: C.FINADOS_MIN, far: 300, walk: 360 };
    }
    if (k === 'rito') {
      const f = e.rite && Sim().building(S, e.rite.fire);
      if (!f || e.rite.part.indexOf(p.id) < 0 || !M.canRite(S, p)) return null;
      return { k, x: f.x + 0.5, y: f.y + 0.5, r0: 1.2, r1: 3.4, min: C.RITO_MIN, far: 320, walk: 400 };
    }
    if (k === 'cova') {
      const v = p.vis, o = v && graveAt(S, v.x, v.y);
      if (!o) { delete p.vis; return null; }
      return { k, x: v.x + 0.5, y: v.y + 0.5, r0: 0.7, r1: 1.6, min: C.VISITA_MIN, pid: o.pid || 0, far: 300, walk: 360 };
    }
    if (k === 'erva') {
      if (e.hoje !== day || e.cond !== p.id) return null;
      const spots = (e.spots || []).map((s, si) => ({ s, si, d: Math.hypot(s[0] - p.x, s[1] - p.y) })).filter((o) => !(e.ruim && e.ruim[o.si])).sort((a, b) => a.d - b.d);
      if (!spots.length) return null;
      const t = spots[0];
      return { k, x: t.s[0] + 0.5, y: t.s[1] + 0.5, r0: 0.7, r1: 1.6, min: C.ERVA_MIN, si: t.si, far: 320, walk: 480 };
    }
    for (const id of m.corpos) {
      const d = person(S, id), c = d && d.corpo;
      if (!c) continue;
      if (k === 'velar' && c.st === 2 && !c.fim && c.vel === day && p.velou !== d.id) {
        return { k, x: d.x, y: d.y, r0: 1.1, r1: 3.6, min: isKin(d, p) ? C.VELAR_FAM : C.VELAR_MIN, pid: d.id, far: 240, walk: 300 };
      }
      if (k === 'corpo' && c.st === 1 && !c.res && canCarry(S, p)) {
        if (c.wi === undefined) c.wi = wakeSpot(S);
        c.res = p.id; c.resT = S.t;
        return { k, carry: d.id, pid: d.id, bx: d.x, by: d.y, x: c.wi % w.W + 0.5, y: ((c.wi / w.W) | 0) + 0.5, r0: 0, r1: 1.2, min: 5, far: 420, walk: 600 };
      }
      if (k === 'enterrar' && c.st === 2 && c.fim && !c.res && canCarry(S, p)) {
        const b = cemB(S) || autoCem(S);
        const pi = b ? plotNear(S, b) : -1;
        if (pi < 0) { quickBury(S, d); return null; }
        c.pi = pi; c.res = p.id; c.resT = S.t;
        return { k, carry: d.id, pid: d.id, bx: d.x, by: d.y, x: pi % w.W + 0.5, y: ((pi / w.W) | 0) + 0.5, r0: 0.6, r1: 1.7, min: C.ENTERRO_MIN, far: 420, walk: 600 };
      }
    }
    return null;
  };
  // a tarefa ainda vale? (a cada passo de quem a faz)
  M.valid = function (S, p, a) {
    const m = S.memoria, t = a.m, e = m.erva;
    if (!t || rest(S)) return false;
    if (t.k === 'finados') return m.fin.on || a.stage === 'stay';
    if (t.k === 'rito') return !!e.rite;
    if (t.k === 'cova') return !!graveAt(S, Math.floor(t.x), Math.floor(t.y));
    if (t.k === 'erva') return e.hoje === S.ck.day;
    const d = person(S, t.pid), c = d && d.corpo;
    if (!c) return false;
    if (t.k === 'velar') return c.st === 2 && (!c.fim || a.stage === 'stay');
    if (t.k === 'corpo') return c.st === 1 && c.res === p.id;
    return c.st === 2 && !!c.fim && c.res === p.id;
  };
  // pegou o corpo; enquanto anda, o corpo vai junto
  M.lift = function (S, p, a) { const d = person(S, a.m.carry); if (d && d.corpo) { d.corpo.by = p.id; d.corpo.resT = S.t; } };
  M.carried = function (S, p, a) { const d = person(S, a.m.carry); if (d && d.corpo) { d.x = p.x; d.y = p.y; d.corpo.resT = S.t; } };
  const OFICIO = { coleta: 'achar fruta', pesca: 'pescar', caca: 'caçar', construcao: 'erguer uma casa', oficio: 'lascar a pedra', plantio: 'plantar', criacao: 'cuidar dos bichos', mineracao: 'tirar pedra da serra' };
  function wakeLine(S, p, d) {
    const n = p.id * 7 + d.id * 3 + S.ck.day, a = age(S, p), D = Dz() ? Dz().call(S) : 'Deus';
    if (a < 10) return pk(['El' + (d.sex === 'F' ? 'a' : 'e') + ' não vai acordar?', 'Por que tá todo mundo quieto?', 'Tá dormindo?'], n);
    const meu = p.povo || 'humano';
    if (meu === 'elfo' && n % 3 === 0) return 'Vira árvore, ' + d.name + '.';
    if (meu === 'anao' && n % 3 === 0) return 'Pedra sobre pedra, ' + d.name + '.';
    if (meu === 'fera' && n % 3 === 0) return 'Corre livre, ' + d.name + '.';
    if (isKin(d, p)) {
      let best = '', bv = 0;
      if (d.skills) for (const k in OFICIO) if ((d.skills[k] || 0) > bv) { bv = d.skills[k]; best = k; }
      const arr = ['Vai em paz, ' + d.name + '.', 'Ainda ontem a gente conversava.', 'Descansa. A gente cuida do resto.'];
      if (best && age(S, d) >= 12) arr.push('Ninguém sabia ' + OFICIO[best] + ' como ' + ela(d) + '.');
      return pk(arr, n);
    }
    return pk(['Vai em paz.', 'Era gente boa.', 'A gente cuida dos teus.', 'Que ' + D + ' te receba.', 'Um dia sou eu.'], n);
  }
  const RITO_FALA = ['Vejo o rio subindo pro céu…', 'As estrelas estão descendo.', 'Minha mão tem luz.', 'O fogo está falando.', 'Tudo é uma coisa só.', 'Eu ouço alguém respirando lá em cima.', 'O chão está cantando.'];
  // chegou ao lugar: uma fala
  M.arrive = function (S, p, a) {
    const t = a.m, Sm = Sim(), n = p.id * 5 + S.ck.day;
    if (t.k === 'velar') { const d = person(S, t.pid); if (d) Sm.say(S, p, wakeLine(S, p, d), true); }
    else if (t.k === 'cova') Sm.say(S, p, pk(['Trouxe flor pra você.', 'Por aqui está tudo bem.', 'Sinto sua falta.', 'Vim contar as novidades.', 'Queria que você visse a aldeia agora.'], n), true);
    else if (t.k === 'finados') { if (n % 3 === 0) Sm.say(S, p, pk(['Lembro de todos.', 'Um dia a gente se vê.', 'Cada cova aqui tem um nome.', 'Estamos aqui por causa deles.'], n), false); }
    else if (t.k === 'enterrar') { const d = person(S, t.pid); if (d) Sm.say(S, p, 'Descansa, ' + d.name + '.', true); }
  };
  // enquanto fica: no rito, de vez em quando alguém diz o que vê
  M.stay = function (S, p, a, dt) {
    if (a.m.k !== 'rito') return;
    const r = S.memoria.erva.rite;
    if (!r || !r.on) { a.t = 0; return; }   // a roda ainda não abriu: espera sentado
    a.fala = (a.fala || 12 + (p.id % 9)) - dt;
    if (a.fala <= 0) { a.fala = 22 + (p.id % 7) * 3; Sim().say(S, p, pk(RITO_FALA, p.id + Math.floor(S.t / 20)), false, 'god'); }
  };
  // terminou: o efeito de cada tarefa
  M.done = function (S, p, a) {
    const m = S.memoria, t = a.m, Sm = Sim(), w = S.world;
    if (t.k === 'corpo') {
      const d = person(S, t.carry), c = d && d.corpo;
      if (!c) return;
      d.x = t.x; d.y = t.y; c.by = 0; c.res = 0; c.st = 2;
      c.vel = S.ck.hour < C.VELORIO_H[1] - 2 ? S.ck.day : S.ck.day + 1;
      Sm.toast(S, p.name + ' trouxe ' + d.name + ' para junto do fogo. O velório é ' + (c.vel === S.ck.day ? 'hoje' : 'amanhã') + ', à tardinha.', '');
    } else if (t.k === 'enterrar') {
      const d = person(S, t.carry), c = d && d.corpo;
      if (!c) return;
      const pi = c.pi !== undefined && freeTile(S, c.pi) ? c.pi : -1;
      if (pi < 0) quickBury(S, d); else bury(S, d, pi, p);
    } else if (t.k === 'velar') {
      const d = person(S, t.pid), c = d && d.corpo;
      if (!c) return;
      c.n = (c.n || 0) + 1;
      p.velou = d.id;
      Sm.addMem(S, p, 'velou');
      // quem velou sofre o luto pela metade do tempo que faltava
      for (const x of p.mem) if (GRIEF[x.k]) x.until = S.t + (x.until - S.t) * C.VELORIO_LUTO;
      Gd().faith(S, p, C.VELORIO_FE);
    } else if (t.k === 'cova') {
      const o = graveAt(S, Math.floor(t.x), Math.floor(t.y));
      delete p.vis;
      if (!o) return;
      const vale = cemVale(S, o);
      o.fl = S.t + C.FLOR_D * DAY;
      if (S.stock.frutas >= C.FRUTA_SOBRA) { S.stock.frutas--; o.of = S.t + 3 * DAY; }
      Sm.addMem(S, p, 'visitouCova');
      for (const x of p.mem) if (GRIEF[x.k]) x.until = Math.max(S.t + DAY, x.until - C.VISITA_CURA * vale * DAY);
      Gd().faith(S, p, C.VISITA_FE * vale);
      S.stats.visitas++;
      if (S.stats.visitas === 1) Sm.chron(S, p.name + ' voltou à cova de ' + o.name + ' com flores. Quem partiu não foi esquecido.');
      ev(S, { ev: 'flores', x: o.x, y: o.y });
    } else if (t.k === 'finados') {
      const f = m.fin;
      (f.foi || (f.foi = {}))[p.id] = 1; f.n = (f.n || 0) + 1;
      const vale = cemB(S) ? (Sim().def(cemB(S)).mem || { vale: 1 }).vale : 1;
      Sm.addMem(S, p, 'diaDosMortos');
      for (const x of p.mem) if (GRIEF[x.k]) x.until = Math.max(S.t + DAY, x.until - C.FINADOS_CURA * vale * DAY);
      Gd().faith(S, p, C.FINADOS_FE * vale);
    } else if (t.k === 'erva') {
      m.erva.tem = S.ck.day;
      Sm.say(S, p, 'Hoje tem rito.', true, 'god');
    } else if (t.k === 'rito') viajou(S, p);
  };
  // largou no meio: o corpo fica onde está, a vaga volta
  M.drop = function (S, p, a, noWay) {
    const m = S.memoria, t = a.m;
    if (!m || !t) return;
    if (t.carry) { const d = person(S, t.carry), c = d && d.corpo; if (c && c.res === p.id) { c.res = 0; c.by = 0; } }
    else if (t.k === 'erva' && noWay) (m.erva.ruim || (m.erva.ruim = {}))[t.si] = 1;
  };
  M.describe = function (S, p, a) {
    const t = a.m, st = a.stage;
    if (!t) return 'Pensando no que fazer';
    const d = t.pid ? person(S, t.pid) : null, nm = d ? d.name : 'quem partiu';
    switch (t.k) {
      case 'corpo': return st === 'fetch' ? 'Indo buscar ' + nm : st === 'carry' ? 'Levando ' + nm + ' para junto do fogo' : 'Deitando ' + nm + ' ao pé do fogo';
      case 'enterrar': return st === 'fetch' ? 'Indo buscar ' + nm + ' para o enterro' : st === 'carry' ? 'Levando ' + nm + ' ao cemitério' : 'Abrindo a cova de ' + nm;
      case 'velar': return st === 'go' ? 'Indo ao velório de ' + nm : 'Velando ' + nm;
      case 'cova': return st === 'go' ? 'Indo à cova de ' + nm + ', com flores' : 'Na cova de ' + nm;
      case 'finados': return st === 'go' ? 'Indo ao cemitério' : 'Lembrando os que partiram';
      case 'erva': return st === 'go' ? 'Indo colher a erva-do-sonho' : 'Colhendo a erva-do-sonho';
      case 'rito': return st === 'go' ? 'Indo para o rito' : 'No rito, ao pé do fogo';
    }
    return 'Pensando no que fazer';
  };
  // quanto a visita vale nesta cova (o cemitério cercado consola mais)
  function cemVale(S, o) {
    const b = cemB(S);
    if (!b || !b.built || Math.hypot(o.x - b.x, o.y - b.y) > 20) return 1;
    return (Sim().def(b).mem || { vale: 1 }).vale || 1;
  }
  // o trabalho de quem acordou do rito (rende menos) e o zelo que uma resposta de Deus deixou
  const COMIDA = { frutas: 1, pesca: 1, caca: 1, roca: 1, criacao: 1, conservar: 1 };
  M.speed = function (S, p, wk) {
    let k = 1;
    if (p.ressaca && p.ressaca > S.t) k *= C.RITO_RESSACA;
    const z = S.memoria && S.memoria.zelo;
    if (z && z.until > S.t) { if (z.k === 'tudo') k *= C.ZELO_TUDO; else if (z.k === 'lenha' ? wk === 'madeira' || wk === 'fogo' : COMIDA[wk]) k *= C.ZELO_COMIDA; }
    return k;
  };
  // como a criança foi criada (pelos contos que ouviu): pesa no humor
  M.mood = (p) => (p.criado === 'temente' ? -C.CRIADO_HUMOR : p.criado === 'confiante' ? C.CRIADO_HUMOR : 0);

  // ---------- visitas e o dia dos mortos ----------
  function flagVisits(S) {
    const day = S.ck.day;
    for (const o of graves(S)) {
      if (!o.pid) continue;
      const d = person(S, o.pid);
      if (!d || d.alive) continue;
      const dias = day - Math.floor(o.t / DAY);
      if (dias <= 0) continue;
      const ano = dias % C.YEAR_DAYS === 0, luto = dias <= C.VISITA_LUTO_ATE && dias % C.VISITA_LUTO_D === 0;
      if (!ano && !luto) continue;
      // no luto, só quem era mais chegado (até dois); no dia em que faz um ano, a família toda
      const kin = visitantes(S, d), who = ano ? kin : kin.slice(0, 2);
      for (const q of who) if (!q.vis) q.vis = { x: o.x, y: o.y, d: day, pid: d.id };
    }
  }
  function finados(S) {
    const m = S.memoria, f = m.fin, h = hourOf(S), Sm = Sim();
    if (f.on) {
      if (h < C.FINADOS_H[1] && h >= C.FINADOS_H[0]) return;
      f.on = false;
      const ps = Object.keys(f.foi || {}).map((id) => person(S, +id)).filter((p) => p && p.alive);
      f.foi = null;
      if (ps.length < 3) return;
      S.stats.finados++;
      f.velas = S.t + C.FINADOS_VELAS_H * 60;
      if (Pv() && S.povos && S.povos.mixed) Pv().onParty(S, ps, C.CONV_FINADOS);
      if (S.stats.finados === 1) Sm.chron(S, 'No último dia do outono, o povo foi junto ao lugar dos mortos, acendeu uma luz em cada cova e ficou até escurecer. Vai ser assim todo ano: é o dia dos mortos.');
      else Sm.toast(S, 'Dia dos mortos: ' + ps.length + ' pessoas foram lembrar os que partiram.', '');
      ev(S, { ev: 'finados', on: false });
      return;
    }
    if (h !== C.FINADOS_H[0] || f.year === S.ck.year || S.ck.season !== 2 || S.ck.dos !== C.SEASON_DAYS) return;
    f.year = S.ck.year;
    const gs = graves(S);
    if (!gs.length || S.people.filter((p) => p.alive).length < C.FINADOS_MIN_POP || m.corpos.length) return;
    if (G.Narr && (G.Narr.beastsOut(S) || G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade'))) return;
    // o lugar: o marco do cemitério; sem marco, a cova mais nova
    const b = cemB(S), last = gs[gs.length - 1];
    f.x = b ? b.x + 1 : last.x + 0.5; f.y = b ? b.y + 1 : last.y + 0.5;
    f.on = true; f.foi = {}; f.n = 0; f.day = S.ck.day;
    Sm.toast(S, 'É o último dia do outono: o povo vai ao lugar dos mortos.', '');
    ev(S, { ev: 'finados', on: true });
  }
  // velas acesas (para o desenho da noite): o velório e as covas na noite do dia dos mortos
  M.lights = function (S) {
    const m = S.memoria, out = [];
    if (!m) return out;
    for (const id of m.corpos) { const d = person(S, id), c = d && d.corpo; if (c && c.st === 2 && !c.by) out.push({ x: d.x, y: d.y, r: 2.4, vela: 1 }); }
    if (m.fin.velas && m.fin.velas > S.t) { let n = 0; for (const o of graves(S)) { if (n++ >= 30) break; out.push({ x: o.x + 0.5, y: o.y + 0.5, r: 1.5, vela: 1 }); } }
    return out;
  };

  // ---------- a História de Deus ----------
  // o tom com que o conto nasce: +1 cuidado, -1 medo, 0 espanto
  const TOM = { cura: 1, chuva: 1, calor: 1, raioFera: 0, castigo: -1, sonho: 1, nome: 0, escolhido: 0, estatua: 0, especie: 1, saber: 1, chamado: 0, visao: 0, silencio: -1, promessa: 0 };
  const FERA = { onca: ['a onça', 'onças', 'a onça'], lobos: ['a matilha', 'lobos', 'o lobo'] };
  const eE = (c) => (c.sx === 'F' ? 'ela' : 'ele');
  const oE = (c) => (c.sx === 'F' ? 'a' : 'o');
  // o miolo do conto, em três tamanhos: como foi, aumentado, lenda
  const CORE = {
    cura: [(c, D) => c.a + ' estava para morrer, e ' + D + ' pôs a mão nel' + (c.sx === 'F' ? 'a' : 'e') + '. Levantou no mesmo dia.',
      (c, D) => c.a + ' já não respirava. ' + D + ' soprou, e ' + eE(c) + ' abriu os olhos.',
      (c, D) => c.a + ' tinha morrido fazia três dias. ' + D + ' chamou pelo nome, e ' + eE(c) + ' voltou andando.'],
    chuva: [(c, D) => 'a terra rachava de seca, e ' + D + ' mandou chuva.',
      (c, D) => 'não chovia fazia um ano inteiro. ' + D + ' chorou por nós, e o rio voltou a correr.',
      (c, D) => 'o rio tinha virado pó. ' + D + ' abriu o céu com as mãos, e choveu quarenta dias.'],
    calor: [(c, D) => 'na pior noite do inverno, ' + D + ' acendeu um calor no meio de nós.',
      (c, D) => 'a neve já cobria as casas. ' + D + ' desceu e passou a noite aquecendo cada um.',
      (c, D) => 'o mundo tinha virado gelo. ' + D + ' pôs um pedaço do sol no meio da aldeia.'],
    raioFera: [(c, D) => FERA[c.x1 || 'lobos'][0] + ' rondava o fogo, e ' + D + ' derrubou com um raio.',
      (c, D) => 'eram mais de vinte ' + FERA[c.x1 || 'lobos'][1] + '. ' + D + ' mandou um raio para cada.',
      (c, D) => FERA[c.x1 || 'lobos'][2] + ' era do tamanho de uma casa. ' + D + ' partiu ao meio com o trovão.'],
    castigo: [(c, D) => D + ' mandou um raio em ' + c.a + '. Ninguém soube bem por quê.',
      (c, D) => c.a + ' zombou de ' + D + ', e o raio veio na mesma hora.',
      (c, D) => c.a + ' quis ser maior que ' + D + '. Sobrou só a sombra no chão.'],
    sonho: [(c, D) => c.a + ' dormiu sem saber e acordou sabendo. Foi ' + D + ' que ensinou no sonho.',
      (c, D) => D + ' sentou ao lado de ' + c.a + ' a noite inteira, ensinando.',
      (c, D) => D + ' levou ' + c.a + ' até o céu e mostrou como se faz tudo o que a gente sabe.'],
    nome: [(c, D) => 'foi ' + c.w + ' quem primeiro chamou ' + D + ' pelo nome, e ' + D + ' ouviu.',
      (c, D) => D + ' disse o próprio nome no ouvido de ' + c.w + ', e ninguém mais esqueceu.',
      (c, D) => 'antes do nome não tinha nada. ' + D + ' falou o nome, e o mundo começou.'],
    escolhido: [(c, D) => D + ' escolheu ' + c.a + ' no meio de todos.',
      (c, D) => 'uma luz desceu em ' + c.a + ', e desde então ' + eE(c) + ' não é como nós.',
      (c, D) => c.a + ' já nasceu marcad' + oE(c) + ' por ' + D + ', e os bichos baixavam a cabeça quando ' + eE(c) + ' passava.'],
    estatua: [(c, D) => 'o povo ergueu a estátua, e ' + D + ' entrou nela.',
      (c, D) => 'a estátua abriu os olhos no dia em que ficou pronta.',
      (c, D) => 'ninguém ergueu a estátua. Ela nasceu da pedra numa noite, do tamanho de ' + D + '.'],
    especie: [(c, D) => D + ' fez ' + (c.a || 'um bicho novo') + ' com as próprias mãos e soltou no mundo para nós.',
      (c, D) => D + ' tirou ' + (c.a || 'um bicho novo') + ' de dentro de um sonho e deu de presente.',
      (c, D) => 'no começo não tinha ' + (c.a || 'bicho nenhum') + '. ' + D + ' riu, e do riso nasceu.'],
    saber: [(c, D) => 'todo mundo sonhou o mesmo sonho, e de manhã a gente conhecia ' + (c.x1 || 'uma coisa nova') + '.',
      (c, D) => D + ' desceu de noite e mostrou ' + (c.x1 || 'uma coisa nova') + ' a cada um, de casa em casa.',
      (c, D) => 'a gente não sabia nada. ' + D + ' abriu a cabeça do povo e pôs lá dentro ' + (c.x1 || 'o que a gente sabe') + '.'],
    chamado: [(c, D) => D + ' chamou ' + (c.x1 || 'os de fora') + ', e eles vieram de longe.',
      (c, D) => (c.x1 || 'os de fora') + ' andaram um ano inteiro atrás da voz de ' + D + '.',
      (c, D) => D + ' fez ' + (c.x1 || 'os de fora') + ' de outro barro, do outro lado do mundo, e mandou para cá.'],
    visao: [(c, D) => c.a + ' perguntou na fumaça, e ' + D + ' respondeu: “' + c.r + '”',
      (c, D) => D + ' apareceu no meio da fumaça e disse a ' + c.a + ': “' + c.r + '”',
      (c, D) => D + ' sentou com a gente em volta do fogo e disse: “' + c.r + '”'],
    silencio: [(c, D) => c.a + ' rezou até o fim, e ' + D + ' não respondeu.',
      (c, D) => c.a + ' chamou por ' + D + ' três noites. O céu ficou calado.',
      (c, D) => D + ' virou o rosto, e ' + c.a + ' se foi sem resposta. Por isso a gente reza baixo.'],
    promessa: [(c, D) => (c.r ? D + ' prometeu, e cumpriu.' : D + ' prometeu, e não cumpriu.'),
      (c, D) => (c.r ? 'o que ' + D + ' diz na fumaça acontece. Sempre aconteceu.' : D + ' disse uma coisa na fumaça e fez outra.'),
      (c, D) => (c.r ? 'a palavra de ' + D + ' é mais firme que a serra.' : 'houve um tempo em que ' + D + ' mentiu para nós. Os antigos não esquecem.')],
  };
  const TITULO = {
    cura: (c) => 'A cura de ' + c.a, chuva: () => 'A chuva na seca', calor: () => 'O fogo na nevasca', raioFera: (c) => 'O raio e ' + FERA[c.x1 || 'lobos'][0],
    castigo: (c) => 'O castigo de ' + c.a, sonho: (c) => 'O sonho de ' + c.a, nome: () => 'O nome', escolhido: (c) => c.a + ', ' + (c.sx === 'F' ? 'a escolhida' : 'o escolhido'),
    estatua: () => 'A estátua', especie: (c) => 'A criação' + (c.a ? ': ' + c.a : ''), saber: () => 'O sonho de todos', chamado: () => 'O chamado',
    visao: () => 'A resposta na fumaça', silencio: (c) => 'O silêncio', promessa: (c) => (c.r ? 'A promessa cumprida' : 'A promessa quebrada'),
  };
  // o que aconteceu de verdade (para pôr ao lado do que o povo conta)
  const FATO = {
    cura: (c) => 'Você curou ' + c.a + ', que estava mal.', chuva: () => 'Você mandou chuva no meio da seca.', calor: () => 'Você pôs o Calor sobre a aldeia na nevasca.',
    raioFera: (c) => 'Seu raio caiu sobre ' + FERA[c.x1 || 'lobos'][0] + '.', castigo: (c) => 'Seu raio atingiu ' + c.a + '.', sonho: (c) => 'Você revelou a ' + c.a + ', em sonho, uma descoberta' + (c.x1 ? ': ' + c.x1 : '') + '.',
    nome: (c) => 'O povo passou a te chamar pelo nome; ' + c.w + ' foi quem começou.', escolhido: (c) => 'Você deu um poder a ' + c.a + '.', estatua: () => 'Você consagrou uma estátua.',
    especie: (c) => 'Você criou uma espécie nova' + (c.a ? ': ' + c.a : '') + '.', saber: (c) => 'Você ensinou ' + (c.x1 || 'um saber') + ' ao povo inteiro, num sonho.', chamado: (c) => 'Você chamou ' + (c.x1 || 'um povo de fora') + ', e a caravana foi acolhida.',
    visao: (c) => 'No rito, ' + c.a + ' fez uma pergunta e você respondeu: “' + c.r + '”', silencio: (c) => c.a + ' rezou, ninguém respondeu, e ' + eE(c) + ' morreu.',
    promessa: (c) => (c.r ? 'Você fez uma promessa no rito, e ela se cumpriu.' : 'Você fez uma promessa no rito, e ela não se cumpriu.'),
  };
  const FIM = [['É bom não deixar %D zangado.', 'Por isso não se brinca com o céu.', 'Quando troveja, a gente baixa a cabeça.'],
    ['E foi assim.', 'Quem estava lá lembra.', 'Nunca esqueçam disso.'],
    ['Por isso ninguém aqui dorme com medo.', '%D cuida de nós.', 'Quem tem %D não está sozinho.']];
  const conto = (S, id) => S.memoria.contos.find((c) => c.id === id) || null;
  const sabem = (S, c) => S.people.filter((p) => p.alive && p.contos && p.contos[c.id] !== undefined);
  // um ato grande, visto por alguém, vira conto. d: { a, sx, x1, r, x, y } (x, y: onde foi; sem eles, todo mundo viu)
  M.deed = function (S, k, d) {
    const m = S.memoria;
    if (!m || S.safe || !CORE[k]) return null;
    d = d || {};
    if (m.kindAt[k] !== undefined && S.t - m.kindAt[k] < C.CONTO_GAP_D * DAY) return null;
    const wit = S.people.filter((p) => p.alive && !p.carriedBy && age(S, p) >= 5 && (d.x === undefined || Math.hypot(p.x - d.x, p.y - d.y) <= C.CONTO_VER));
    if (!wit.length) return null;
    m.kindAt[k] = S.t;
    // o tom com que nasce: o que veio dito (a resposta do rito, a promessa), ou o do ato; o ato sem tom próprio pega
    // o de como o povo vê Deus (temido ou bondoso)
    const al = S.god ? S.god.align : 0;
    const c = { id: m.nc++, k, t: S.t, tone: d.tone !== undefined ? d.tone : TOM[k] || (Math.abs(al) >= C.CONTO_TOM_ALIGN ? Math.sign(al) : 0), mag: 0, gen: 0, n: 0, last: 0 };
    for (const f of ['a', 'sx', 'x1', 'r']) if (d[f] !== undefined) c[f] = d[f];
    c.w = wit.slice().sort((a, b) => b.fe - a.fe || a.id - b.id)[0].name;
    m.contos.push(c);
    for (const p of wit) {
      (p.contos || (p.contos = {}))[c.id] = 0;
      // a criança que vê o ato guarda o tom dele, como guarda o do conto que ouve
      if (c.tone && !p.criado && age(S, p) < C.CRIADO_AGE) { const o = p.ouviu || (p.ouviu = [0, 0]); o[c.tone < 0 ? 0 : 1]++; }
    }
    S.stats.contos++;
    trim(S);
    if (S.stats.contos === 1) Sim().chron(S, 'O povo já tem o que contar de ' + Dz().call(S) + ': “' + TITULO[k](c) + '”. Nas noites de história o conto vai passar adiante, e cada um conta do seu jeito.');
    ev(S, { ev: 'conto', id: c.id });
    return c;
  };
  // passou do limite: sai primeiro o conto que ninguém mais sabe; depois o mais antigo de um tipo que tem outro mais
  // novo ("O raio e a matilha" de dez anos atrás); por fim, o mais antigo de todos
  function trim(S) {
    const m = S.memoria;
    while (m.contos.length > C.CONTO_MAX) {
      const n = {};
      for (const c of m.contos) n[c.k] = (n[c.k] || 0) + 1;
      const sai = m.contos.find((c) => !sabem(S, c).length) || m.contos.find((c) => n[c.k] > 1) || m.contos[0];
      m.contos.splice(m.contos.indexOf(sai), 1);
      for (const p of S.people) if (p.contos) delete p.contos[sai.id];
    }
  }
  // as três falas de quem conta: a abertura diz de onde veio (vi, me contaram, dizem os antigos)
  function tell(S, c, g) {
    const D = Dz() ? Dz().call(S) : 'Deus', n = c.id * 7 + c.n;
    const core = CORE[c.k][Math.min(c.mag, CORE[c.k].length - 1)](c, D);
    const open = g <= 0 ? 'Eu vi com estes olhos: ' : g === 1 ? pk(['Minha mãe contava que ', 'Meu pai contava que ', 'Quem me contou viu: '], n) : pk(['Dizem os antigos que ', 'Contam que ', 'Os antigos juram que '], n);
    const mid = g <= 0 ? pk(['Eu estava lá.', 'Parece que foi ontem.', 'Quem estava lá lembra.'], n) : g === 1 ? pk(['Eu era criança quando ouvi.', 'Contaram pra mim, eu conto pra vocês.', 'Foi antes de vocês nascerem.'], n) : pk(['Faz tanto tempo que ninguém sabe o ano.', 'Assim me contaram.', 'É mais velho que a aldeia.'], n);
    return [open + core, mid, pk(FIM[c.tone + 1], n).replace('%D', D)];
  }
  // na noite de história, quem sabe um conto às vezes conta um (o que faz mais tempo que não se ouve)
  M.storyFor = function (S, p) {
    const m = S.memoria;
    if (!m || !m.contos.length || !p.contos) return null;
    const mine = m.contos.filter((c) => p.contos[c.id] !== undefined && (!c.last || S.t - c.last >= C.CONTO_REPETE_D * DAY));
    if (!mine.length) return null;
    if (m.fin.day !== S.ck.day && S.rng.next() >= C.CONTO_CHANCE) return null;   // no dia dos mortos, a noite é dos contos
    mine.sort((a, b) => a.last - b.last || a.id - b.id);
    return { conto: mine[0].id, lines: tell(S, mine[0], p.contos[mine[0].id]) };
  };
  // quem conta sem ter visto muda um detalhe: aumenta, ou puxa para o jeito como o povo vê Deus
  function drift(S, c, p) {
    const al = S.god ? S.god.align : 0, r = S.rng.next();
    if (r < 0.5 && c.mag < 2) { c.mag++; return; }
    const puxa = Math.abs(al) >= 15 ? Math.sign(al) : has(p, 'Pessimista') ? -1 : has(p, 'Otimista') ? 1 : 0;
    if (puxa && Math.abs(c.tone + puxa) <= 1) c.tone += puxa;
    else if (c.mag < 2) c.mag++;
  }
  // a história acabou: quem ouviu passa a saber o conto (uma geração depois de quem contou)
  M.onStory = function (S, p, st, heard) {
    const c = conto(S, st.conto), Sm = Sim();
    if (!c || !p.contos) return;
    const g = p.contos[c.id] || 0;
    c.n++; c.last = S.t; S.stats.contados++;
    if (g > 0) { S.stats.recontos++; if (S.rng.next() < C.CONTO_DERIVA) drift(S, c, p); }
    for (const q of heard) {
      const a = age(S, q);
      if (a < 3) continue;
      if (!q.contos || q.contos[c.id] === undefined) { (q.contos || (q.contos = {}))[c.id] = g + 1; if (g + 1 > c.gen) c.gen = g + 1; }
      if (c.tone < 0) { Gd().faith(S, q, C.CONTO_FE * 0.6); Sm.addMem(S, q, 'contoMedo'); } else Gd().faith(S, q, C.CONTO_FE * (c.tone > 0 ? 1 : 0.6));
      if (Dz()) Dz().sinal(S, q, 'conto');
      if (a < C.CRIADO_AGE && c.tone && !q.criado) { const o = q.ouviu || (q.ouviu = [0, 0]); o[c.tone < 0 ? 0 : 1]++; }
    }
    if (S.stats.contados === 1) Sm.chron(S, 'Pela primeira vez, ' + p.name + ' contou ao pé do fogo um feito de ' + Dz().call(S) + ': “' + TITULO[c.k](c) + '”.');
  };
  // para a tela "O que contam de você"
  M.contosInfo = function (S) {
    const m = S.memoria;
    if (!m) return [];
    return m.contos.slice().sort((a, b) => b.t - a.t).map((c) => {
      const s = sabem(S, c), g = s.length ? Math.min.apply(null, s.map((p) => p.contos[c.id])) : c.gen;
      const best = s.length ? Math.max.apply(null, s.map((p) => p.contos[c.id])) : c.gen;
      return { id: c.id, titulo: TITULO[c.k](c), conta: tell(S, c, best), fato: FATO[c.k](c), quando: Sim().dateText(c.t), n: c.n, sabem: s.length, viram: s.filter((p) => p.contos[c.id] === 0).length,
        gen: best, tone: c.tone, mag: c.mag, perdido: !s.length, minGen: g };
    });
  };
  // no fim da infância (CRIADO_AGE), os contos que a criança ouviu deixam marca
  function criar(S, p) {
    const o = p.ouviu || [0, 0];
    delete p.ouviu;
    p.criado = o[0] >= C.CRIADO_MIN && o[0] >= o[1] * 1.5 ? 'temente' : o[1] >= C.CRIADO_MIN && o[1] >= o[0] * 1.5 ? 'confiante' : 'livre';
    if (p.criado === 'livre') return;
    S.stats.criados = (S.stats.criados || 0) + 1;
    if (S.stats.criados === 1) Sim().chron(S, p.name + ' cresceu entre contos de ' + (p.criado === 'temente' ? 'medo, e ficou temente a ' : 'cuidado, e ficou confiante em ') + Dz().call(S) + '. O que a criança vê e ouve de ' + Dz().call(S) + ' fica nela.');
  }
  // para Deus: a fé de quem foi criado nos contos
  M.feAlvo = (p, base) => (p.criado === 'temente' ? Math.max(base, C.TEMENTE_FE) : p.criado === 'confiante' ? base + C.CONFIANTE_FE : base);

  // ---------- a erva-do-sonho e o rito ----------
  const wet = (w, x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (G.IS_WATER[w.tile[(y + dy) * w.W + x + dx]]) return true; return false; };
  // os canteiros saem do mundo e do acampamento: sempre os mesmos, sem mexer no sorteio do jogo
  function ervaSpots(S) {
    const w = S.world, e = S.memoria.erva;
    if (!e.spots) {
      const find = (needWet) => {
        const cand = [];
        for (let y = 3; y < w.H - 3; y++) for (let x = 3; x < w.W - 3; x++) {
          const i = y * w.W + x;
          if (w.tile[i] !== G.T.FOREST || Wd().objAt(w, i) || w.bgrid[i] >= 0) continue;
          const d = Math.hypot(x - S.camp.x, y - S.camp.y);
          if (d < C.ERVA_DIST[0] || d > C.ERVA_DIST[1] || (needWet && !wet(w, x, y))) continue;
          cand.push([x, y, d + G.hash2(x, y, S.seed) * 8]);
        }
        cand.sort((a, b) => a[2] - b[2]);
        const out = [];
        for (const c of cand) { if (out.length >= C.ERVA_SPOTS) break; if (out.every((s) => Math.hypot(s[0] - c[0], s[1] - c[1]) >= 8)) out.push([c[0], c[1]]); }
        return out;
      };
      e.spots = find(true);
      if (!e.spots.length) e.spots = find(false);
    }
    for (const s of e.spots) { const i = s[1] * w.W + s[0], o = Wd().objAt(w, i); if (!o) Wd().addObj(w, 'erva', s[0], s[1], {}); }
  }
  function discover(S, p) {
    const m = S.memoria, e = m.erva, D = Dz().call(S);
    e.known = S.t;
    Sim().chron(S, p.name + ' achou na mata uma erva de cheiro forte, que ninguém conhecia. Mascou uma folha e passou a noite conversando com ' + D + '. O povo chamou de erva-do-sonho.');
    Sim().addMem(S, p, 'viagem');
    // o jogador decide o que o rito vai ser (sem resposta em um dia, o povo segue por conta própria)
    m.pend.push({ k: 'erva', pid: p.id, t: S.t, until: S.t + DAY });
    ev(S, { ev: 'pend' });
  }
  function ervaHourly(S) {
    const e = S.memoria.erva;
    if (e.known || !e.spots || !e.spots.length || !Dz() || Dz().level(S) < C.ERVA_LV) return;
    if (S.people.filter((p) => apto(S, p)).length < C.RITO_MIN_POP) return;   // ainda não há gente para a roda
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || age(S, p) < 14) continue;
      for (const s of e.spots) if (Math.hypot(p.x - s[0] - 0.5, p.y - s[1] - 0.5) <= C.ERVA_VER) { discover(S, p); return; }
    }
    // ninguém passa por lá: depois de um tempo, alguém que anda longe acaba achando
    if (!e.wait) e.wait = S.t;
    if (S.t - e.wait < C.ERVA_ACASO_D * DAY) return;
    const who = S.people.filter((p) => p.alive && !p.carriedBy && age(S, p) >= ADULTO).sort((a, b) => ((b.skills && b.skills.caca) || 0) - ((a.skills && a.skills.caca) || 0) || a.id - b.id)[0];
    if (who) discover(S, who);
  }
  // o jogador muda a lei do rito: abençoado, livre ou proibido
  M.setLei = function (S, lei) {
    const m = S.memoria, e = m.erva, D = Dz().call(S), Sm = Sim();
    if (!e.known || ['bencao', 'livre', 'proibido'].indexOf(lei) < 0 || e.lei === lei) return false;
    const antes = e.lei;
    e.lei = lei;
    if (lei === 'bencao') { Gd().align(S, 3); Sm.chron(S, D + ' abençoou o rito da erva-do-sonho: quem senta na roda sai com mais fé.'); }
    else if (lei === 'proibido') {
      Gd().align(S, -3);
      e.rite = null; e.hoje = -1;
      Sm.chron(S, D + ' proibiu a erva-do-sonho. Ninguém mais colhe.');
      for (const p of S.people) if (p.alive && (p.rito || 0) >= C.RITO_APEGO) Sm.addMem(S, p, 'semRito');
    } else if (antes) Sm.toast(S, 'O rito da erva-do-sonho fica por conta do povo.', '');
    return true;
  };
  // quem conduz: o profeta, se houver; senão, o adulto mais velho com alguma fé
  function condutor(S, ok) {
    return ok.find((p) => p.escolhido && p.escolhido.power === 'palavra') || ok.filter((p) => p.fe >= 30).sort((a, b) => a.born - b.born || a.id - b.id)[0] || null;
  }
  function riteTick(S) {
    const m = S.memoria, e = m.erva, h = hourOf(S), day = S.ck.day, N = G.Narr, H0 = C.RITO_H[0];
    if (!e.known || e.lei === 'proibido' || (m.pend[0] && m.pend[0].k === 'erva')) { e.rite = null; return; }
    const adia = () => { e.rite = null; e.hoje = -1; e.last = S.t - (C.RITO_GAP_D - 3) * DAY; };   // fica para daqui a três dias
    if (e.rite && e.rite.on) {
      if (h >= C.RITO_H[1] || h < H0) endRite(S);
      else if (!e.rite.asked && S.t - e.rite.t0 >= 45) ask(S);
      return;
    }
    if (h === 7 && e.hoje !== day && S.t - e.last >= C.RITO_GAP_D * DAY) {
      // hoje tem rito? só em dia calmo, sem morto por enterrar, sem festa, com fogo e gente bastante
      const calm = !(N && (N.beastsOut(S) || N.is(S, 'nevasca') || N.is(S, 'tempestade'))) && !m.corpos.length && !(S.life && S.life.party) && !(S.ck.season === 2 && S.ck.dos === C.SEASON_DAYS);
      const fire = S.buildings.some((b) => b.type === 'fogueira' && b.built);
      const ok = calm && fire ? S.people.filter((p) => apto(S, p)) : [];
      const c = ok.length >= C.RITO_MIN_POP ? condutor(S, ok) : null;
      if (c) {
        // quem conduz convida: os de mais fé primeiro, com um pouco de acaso (às vezes um cético senta na roda)
        const rest2 = ok.filter((p) => p !== c).sort((a, b) => (b.fe + G.hash2(b.id, day, S.seed) * 50) - (a.fe + G.hash2(a.id, day, S.seed) * 50) || a.id - b.id);
        e.hoje = day; e.cond = c.id; e.conv = [c.id].concat(rest2.slice(0, C.RITO_MAX - 1).map((p) => p.id));
      }
    }
    if (e.hoje !== day) return;
    // duas horas antes, com a erva colhida, a roda fica marcada e os convidados vêm vindo
    if (!e.rite && h >= H0 - 2 && h < H0 && e.tem === day) {
      const f = Lf().campFire(S, true);
      if (f) e.rite = { t0: Math.floor(S.t / DAY) * DAY + H0 * 60, fire: f.id, part: (e.conv || []).slice(), fez: 0, asked: false, on: false };
    }
    // os convidados largam o trabalho e vêm (quem come, bebe ou dorme termina primeiro)
    if (e.rite && !e.rite.on && h < H0 && G.AI) {
      for (const id of e.rite.part) {
        const p = person(S, id), a = p && p.act;
        if (a && M.canRite(S, p) && (G.AI.WORK.indexOf(a.type) >= 0 || a.type === 'vagar' || a.type === 'conversar')) G.AI.abort(S, p);
      }
    }
    if (h === H0) {
      if (!e.rite || S.precip || !Sim().building(S, e.rite.fire)) { adia(); return; }   // sem erva, sem fogo ou com chuva
      e.rite.on = true; e.rite.t0 = S.t;
      ev(S, { ev: 'rito', on: true });
    } else if (h > H0 && e.rite && !e.rite.on) adia();
  }
  // cada um que ficou até o fim da roda
  function viajou(S, p) {
    const e = S.memoria.erva, Sm = Sim();
    if (!p.rito) p.ritoD = S.t;
    p.rito = (p.rito || 0) + 1; p.ritoT = S.t; p.ritoDia = S.ck.day;
    p.ressaca = S.t + C.RITO_RESSACA_H * 60;
    const apego = p.rito >= C.RITO_APEGO;
    const ruim = S.rng.next() < C.RITO_RUIM[apego ? 1 : 0];
    Sm.addMem(S, p, ruim ? 'visaoRuim' : 'viagem');
    if (ruim) p.needs.saude = Math.max(5, p.needs.saude - C.RITO_SAUDE);
    if (apego) p.needs.saude = Math.max(5, p.needs.saude - C.RITO_APEGO_SAUDE);
    Gd().faith(S, p, C.RITO_FE + (e.lei === 'bencao' ? 1 : 0));
    if (Dz()) Dz().sinal(S, p, 'rito');
    if (e.rite) e.rite.fez++;
  }
  function endRite(S) {
    const m = S.memoria, e = m.erva, r = e.rite, Sm = Sim();
    e.rite = null; e.last = S.t; e.hoje = -1;
    ev(S, { ev: 'rito', on: false });
    if (!r || r.fez < 2) return;
    S.stats.ritos++;
    // a roda abre a cabeça: um pouco de prática para o que o povo está perto de descobrir
    const open = G.Tech && G.Tech.open(S), c = person(S, e.cond);
    if (open && G.Tech.need) G.Tech.addPractice(S, open, G.Tech.need(open) * C.RITO_SABER, c && c.alive ? c : null);
    if (S.stats.ritos === 1) Sm.chron(S, 'De noite, ao pé do fogo, ' + r.fez + ' adultos sentaram em roda com a erva-do-sonho. Viram coisas, riram, choraram. Amanhã vão acordar devagar. Foi o primeiro rito.');
  }

  // ---------- a pergunta e as três respostas ----------
  // fe: a fé de quem estava na roda · al: como o povo te vê · mem: a lembrança que fica · fx: o que mais acontece
  const Q = {
    morte: { q: (c) => 'Para onde foi ' + c.m + '?', a: [
      { t: 'Está comigo.', tone: 1, fe: 3, al: 10, fx: 'luto' },
      { t: 'Voltou para a terra, e a terra é de vocês.', tone: 0, fe: 1, mem: 'aceitou' },
      { t: 'Isso não se pergunta.', tone: -1, fe: 2, al: -15, mem: 'temeu' }] },
    fome: { q: () => 'Vai faltar comida?', a: [
      { t: 'Não vai faltar.', tone: 1, fe: 2, al: 8, mem: 'promessa', fx: 'prom:fome' },
      { t: 'Guardem mais do que comem.', tone: 0, fe: 1, fx: 'zelo:comida' },
      { t: 'Quem trabalha, come.', tone: -1, fe: 2, al: -12, mem: 'temeu', fx: 'zelo:tudo' }] },
    fera: { q: () => 'A fera vai voltar?', a: [
      { t: 'Eu vigio por vocês.', tone: 1, fe: 2, al: 8, mem: 'promessa', fx: 'prom:fera' },
      { t: 'Fiquem perto do fogo.', tone: 0, fe: 1, mem: 'aceitou' },
      { t: 'A fera também é minha.', tone: -1, fe: 2, al: -12, mem: 'temeu' }] },
    inverno: { q: () => 'O inverno vai ser duro?', a: [
      { t: 'Eu aqueço vocês.', tone: 1, fe: 2, al: 8, mem: 'promessa', fx: 'prom:frio' },
      { t: 'Juntem lenha enquanto é tempo.', tone: 0, fe: 1, fx: 'zelo:lenha' },
      { t: 'O frio também é meu.', tone: -1, fe: 2, al: -12, mem: 'temeu' }] },
    povos: { q: (c) => (c.fora ? 'A gente, que veio de longe, também é teu?' : 'Os que vieram de fora também são teus?'), a: [
      { t: 'Todos são meus.', tone: 1, fe: 1, al: 8, fx: 'conv:3' },
      { t: 'Vocês que se entendam.', tone: 0, fe: -1 },
      { t: 'Os primeiros são os primeiros.', tone: -1, fe: 1, al: -10, fx: 'conv:-3' }] },
    duvida: { q: () => 'Você existe mesmo, ou é só a fumaça?', a: [
      { t: 'Olhe a sua mão. Fui eu que fiz.', tone: 1, fe: 2, al: 6, fx: 'sinal:3' },
      { t: 'Acredite no que você vê.', tone: 0, fe: 0, mem: 'aceitou', fx: 'sinal:1' },
      { t: 'Escute o trovão.', tone: -1, fe: 3, al: -12, mem: 'temeu', fx: 'trovao' }] },
    filhos: { q: () => 'Meus filhos vão viver mais do que eu?', a: [
      { t: 'Vão, e os filhos deles também.', tone: 1, fe: 3, al: 8, mem: 'promessa' },
      { t: 'Depende do que vocês fizerem hoje.', tone: 0, fe: 1, fx: 'zelo:tudo' },
      { t: 'Não queira saber.', tone: -1, fe: 2, al: -12, mem: 'temeu' }] },
    depois: { q: () => 'O que tem depois da morte?', a: [
      { t: 'Tem eu, esperando.', tone: 1, fe: 3, al: 8, mem: 'emPaz' },
      { t: 'Tem a lembrança de quem fica.', tone: 0, fe: 1, mem: 'aceitou' },
      { t: 'Nada que seja da sua conta.', tone: -1, fe: 2, al: -15, mem: 'temeu' }] },
    porque: { q: () => 'Por que você fez a gente?', a: [
      { t: 'Para não ficar só.', tone: 1, fe: 3, al: 10 },
      { t: 'Para ver o que vocês fazem.', tone: 0, fe: 1, fx: 'saber' },
      { t: 'Para me servir.', tone: -1, fe: 2, al: -15, mem: 'temeu', fx: 'zelo:tudo' }] },
    querer: { q: () => 'O que você quer de nós?', a: [
      { t: 'Que cuidem uns dos outros.', tone: 1, fe: 2, al: 10, mem: 'aceitou' },
      { t: 'Que aprendam.', tone: 0, fe: 1, fx: 'saber' },
      { t: 'Que me obedeçam.', tone: -1, fe: 2, al: -15, mem: 'temeu', fx: 'zelo:tudo' }] },
  };
  M.Q = Q;
  // a pergunta sai do que a aldeia está vivendo; não repete a última se houver outra. part: quem está na roda
  M.pickQ = function (S, part) {
    const e = S.memoria.erva, N = G.Narr, c = [];
    const recent = S.people.filter((p) => !p.alive && S.t - p.diedAt < 30 * DAY).sort((a, b) => b.diedAt - a.diedAt)[0];
    if (recent) c.push({ q: 'morte', who: part.find((p) => kinIds(S, recent).has(p.id)) || null, c: { m: recent.name } });
    if (S.ctx && S.ctx.foodDays < 10) c.push({ q: 'fome' });
    if (S.ck.season === 2) c.push({ q: 'inverno' });   // no outono, o medo é o inverno
    if ((N && N.beastsOut(S)) || S.people.some((p) => !p.alive && S.t - p.diedAt < 30 * DAY && (p.cause === 'lobos' || p.cause === 'onca' || p.cause === 'jacare' || p.cause === 'bicho'))) c.push({ q: 'fera' });
    if (S.povos && S.povos.mixed && Pv()) {
      let low = 100;
      for (const k in S.povos.conv) low = Math.min(low, S.povos.conv[k]);
      const fora = part.find((p) => p.povo && p.povo !== 'meio'), hum = part.find((p) => !p.povo);
      if (low < 60 && (fora || hum)) c.push({ q: 'povos', who: (S.ck.day % 2 && fora) || hum || fora });
    }
    const cet = part.find((p) => has(p, 'Cético'));
    if (cet) c.push({ q: 'duvida', who: cet });
    const pai = part.find((p) => Fam().childrenOf(S, p).some((k) => k.alive && age(S, k) < 12));
    if (pai) c.push({ q: 'filhos', who: pai });
    const velho = part.find((p) => Fam().stage(S, p) === 'idoso');
    if (velho) c.push({ q: 'depois', who: velho });
    c.push({ q: 'porque' }, { q: 'querer' });   // as de sempre, uma de cada vez
    const pick = c.find((x) => x.q !== e.lastQ) || c[0];
    const who = pick.who || part.slice().sort((a, b) => b.fe - a.fe || a.id - b.id)[0];
    return { q: pick.q, who, c: pick.q === 'povos' ? { fora: !!who.povo } : pick.c || {} };
  };
  function ask(S) {
    const m = S.memoria, r = m.erva.rite;
    // só pergunta quem já está sentado na roda (ou já esteve); com menos de dois, espera a hora seguinte
    const part = r.part.map((id) => person(S, id)).filter((p) => p && p.alive && (p.ritoDia === S.ck.day || (p.act && p.act.type === 'memoria' && p.act.m && p.act.m.k === 'rito' && p.act.stage === 'stay')));
    if (part.length < 2) return;
    r.asked = true;
    if (S.t - (m.erva.lastAsk || -1e9) < C.VISAO_GAP_D * DAY) return;   // desta vez a roda só vê coisas na fumaça
    m.erva.lastAsk = S.t;
    const k = M.pickQ(S, part);
    const pd = { k: 'visao', q: k.q, pid: k.who.id, part: part.map((p) => p.id), c: k.c, t: S.t, until: S.t + C.VISAO_ESPERA_H * 60 };
    m.pend.push(pd);
    Sim().say(S, k.who, Q[pd.q].q(pd.c), true, 'god');
    ev(S, { ev: 'pend' });
  }
  // o que mais uma resposta faz
  function fx(S, f, pd, part, who) {
    const m = S.memoria, Sm = Sim();
    if (!f) return;
    const [k, v] = f.split(':');
    if (k === 'luto') { for (const p of S.people) if (p.alive) for (const x of p.mem) if (GRIEF[x.k]) x.until = Math.max(S.t + DAY, x.until - 15 * DAY); }
    else if (k === 'prom') {
      // a promessa do frio vale até o fim do inverno que vem
      const fimInverno = (Math.floor(S.t / (DAY * C.YEAR_DAYS)) + 1) * DAY * C.YEAR_DAYS;
      m.prom = m.prom.filter((x) => x.k !== v);
      m.prom.push({ k: v, t: S.t, until: v === 'frio' ? fimInverno : S.t + C.PROMESSA_D * DAY });
    }
    else if (k === 'zelo') m.zelo = { k: v, until: S.t + (v === 'tudo' ? C.ZELO_TUDO_D : C.ZELO_COMIDA_D) * DAY };
    else if (k === 'conv') { if (Pv() && Pv().shift) Pv().shift(S, +v); }
    else if (k === 'sinal') { if (who && Dz()) for (let i = 0; i < +v; i++) Dz().sinal(S, who, 'visao'); }
    else if (k === 'trovao') { const f0 = S.memoria.erva.rite && Sm.building(S, S.memoria.erva.rite.fire); S.events.push({ k: 'bolt', x: f0 ? f0.x + 3 : S.camp.x, y: f0 ? f0.y - 2 : S.camp.y, far: 1 }); for (const p of part) Sm.addMem(S, p, 'viuRaio'); }
    else if (k === 'saber') { const open = G.Tech && G.Tech.open(S); if (open && G.Tech.need) G.Tech.addPractice(S, open, G.Tech.need(open) * C.RITO_SABER, who || null); }
  }
  M.pending = (S) => (S.memoria && S.memoria.pend && S.memoria.pend[0]) || null;
  // o que a janela mostra: título, a fala, as três respostas (e o silêncio)
  M.pendingInfo = function (S) {
    const pd = M.pending(S);
    if (!pd) return null;
    const who = person(S, pd.pid), D = Dz().call(S), nm = who ? who.name : 'Alguém';
    if (pd.k === 'erva') return { k: 'erva', icon: 'erva', title: 'A erva-do-sonho', lead: nm + ' achou na mata uma erva que faz sonhar acordado. O povo quer sentar em roda com ela, à noite, para falar com ' + D + '. Só os adultos. O que você diz?',
      opts: ['Abençoar o rito: quem senta na roda sai com mais fé.', 'Deixar com eles: o povo faz o rito quando quiser.', 'Proibir: ninguém colhe a erva.'], quiet: '' };
    return { k: 'visao', icon: 'visao', title: 'Uma pergunta na fumaça', lead: 'No meio do rito, ' + nm + ' olha para cima e pergunta: “' + Q[pd.q].q(pd.c) + '”', opts: Q[pd.q].a.map((x) => x.t), quiet: 'Ficar em silêncio' };
  };
  // a resposta do jogador (0, 1 ou 2); qualquer outra coisa é o silêncio
  M.answer = function (S, i) {
    const m = S.memoria, pd = m && m.pend[0], Sm = Sim();
    if (!pd) return false;
    m.pend.shift();
    if (pd.k === 'erva') { M.setLei(S, ['bencao', 'livre', 'proibido'][i] || 'livre'); return true; }
    const part = pd.part.map((id) => person(S, id)).filter((p) => p && p.alive), who = person(S, pd.pid), D = Dz().call(S);
    m.erva.lastQ = pd.q;
    const A = i === 0 || i === 1 || i === 2 ? Q[pd.q].a[i] : null;
    if (!A) {
      // o silêncio: quem perguntou fica sem resposta, e a fé da roda esfria um pouco
      if (who && who.alive) Sm.addMem(S, who, 'semResposta');
      for (const p of part) Gd().faith(S, p, -2);
      if (!S.safe) Sm.toast(S, (who ? who.name : 'Alguém') + ' perguntou na fumaça, e ' + D + ' ficou em silêncio.', 'warn');
      return true;
    }
    for (const p of part) {
      if (A.fe) Gd().faith(S, p, A.fe);
      if (A.mem) Sm.addMem(S, p, A.mem);
      if (Dz()) Dz().sinal(S, p, 'visao');
    }
    if (A.al) Gd().align(S, A.al);
    fx(S, A.fx, pd, part, who);
    S.stats.respostas++;
    M.deed(S, 'visao', { a: who ? who.name : 'alguém', sx: who ? who.sex : 'M', r: A.t, tone: A.tone });
    Sm.toast(S, D + ' respondeu a ' + (who ? who.name : 'quem perguntou') + ': “' + A.t + '”', A.tone < 0 ? 'warn' : 'good');
    if (S.stats.respostas === 1) Sm.chron(S, 'No rito, ' + (who ? who.name : 'alguém') + ' perguntou: “' + Q[pd.q].q(pd.c) + '” E ' + D + ' respondeu: “' + A.t + '” Foi a primeira vez que o povo ouviu uma resposta.');
    ev(S, { ev: 'resposta', tone: A.tone });
    return true;
  };
  // promessa feita no rito: cumprida, a fé sobe; quebrada, cai, e vira conto
  function promises(S) {
    const m = S.memoria, Sm = Sim(), D = Dz().call(S);
    for (const pr of m.prom.slice()) {
      let broken = false;
      if (pr.k === 'fome') broken = S.people.some((p) => p.alive && !p.carriedBy && p.needs.fome < 8);   // alguém passando fome de verdade
      else if (pr.k === 'fera') broken = S.people.some((p) => !p.alive && p.diedAt > pr.t && (p.cause === 'lobos' || p.cause === 'onca' || p.cause === 'jacare' || p.cause === 'bicho'));
      else if (pr.k === 'frio') broken = S.people.some((p) => !p.alive && p.diedAt > pr.t && p.cause === 'frio');
      if (!broken && S.t < pr.until) continue;
      m.prom.splice(m.prom.indexOf(pr), 1);
      const txt = pr.k === 'fome' ? 'que não ia faltar comida' : pr.k === 'frio' ? 'que ia aquecer o povo no inverno' : 'que ia vigiar contra a fera';
      for (const p of S.people) {
        if (!p.alive || age(S, p) < 7) continue;
        Gd().faith(S, p, broken ? -C.PROMESSA_QUEBRA : C.PROMESSA_FE);
        if (broken) Sm.addMem(S, p, 'promessaQuebrada');
      }
      if (broken) { Gd().align(S, -10); Sm.chron(S, D + ' prometeu ' + txt + (pr.k === 'fome' ? ', e faltou.' : pr.k === 'frio' ? ', e o frio levou gente.' : ', e a fera levou gente.') + ' O povo não esquece.'); }
      else Sm.toast(S, D + ' prometeu ' + txt + ', e cumpriu. A fé do povo cresce.', 'good');
      M.deed(S, 'promessa', { r: broken ? 0 : 1, tone: broken ? -1 : 1 });
    }
  }

  // ---------- hora e dia ----------
  M.hourly = function (S) {
    const m = S.memoria;
    if (!m) return;
    bodies(S);
    if (rest(S)) {
      // jogo fechado: a pergunta fica sem resposta, o rito e o dia dos mortos não acontecem
      while (m.pend.length) M.answer(S, -1);
      m.erva.rite = null; m.fin.on = false; m.fin.foi = null;
      return;
    }
    while (m.pend.length && S.t >= m.pend[0].until) M.answer(S, -1);
    if (m.calou) { M.deed(S, 'silencio', m.calou); m.calou = null; }
    ervaHourly(S);
    riteTick(S);
    finados(S);
  };
  M.daily = function (S) {
    const m = S.memoria;
    if (!m) return;
    if (m.zelo && m.zelo.until <= S.t) m.zelo = null;
    for (const p of S.people) {
      if (!p.alive) continue;
      // o costume do rito esfria com o tempo; quem se apegou sente falta
      if (p.rito && S.t - (p.ritoD || p.ritoT || 0) > C.RITO_ESQUECE_D * DAY) { p.rito--; p.ritoD = S.t; if (!p.rito) { delete p.rito; delete p.ritoT; delete p.ritoD; } }
      if ((p.rito || 0) >= C.RITO_APEGO && S.t - (p.ritoT || 0) > C.RITO_FALTA_D * DAY && !rest(S)) Sim().addMem(S, p, 'semRito');
      if (p.ouviu && !p.criado && age(S, p) >= C.CRIADO_AGE) criar(S, p);
    }
    if (rest(S)) return;
    flagVisits(S);
    if (m.prom.length) promises(S);
  };

  // ---------- obra, metas, interface ----------
  M.onBuilt = function (S, b) {
    if (b.type !== 'cemiterio') return false;
    const m = S.memoria, Sm = Sim();
    if (!m.cem || !Sm.building(S, m.cem)) m.cem = b.id;
    if ((b.lv || 1) >= 2) Sm.chron(S, 'O cemitério ganhou cerca e portal. Quem vem lembrar os seus se consola mais.');
    else if (b.auto) Sm.chron(S, 'O povo separou um canto para os seus mortos, ' + lado(S, b) + ' da aldeia. É ali que vão abrir as covas.');
    else Sm.chron(S, 'O povo marcou o lugar do cemitério, ' + lado(S, b) + ' da aldeia.');
    return true;
  };
  function lado(S, b) {
    const dx = b.x - S.camp.x, dy = b.y - S.camp.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'a leste' : 'a oeste') : dy > 0 ? 'ao sul' : 'ao norte';
  }
  const CAUSA = { frio: 'de frio', sede: 'de sede', fome: 'de fome', raio: 'de um raio', parto: 'no parto', velhice: 'de velhice', lobos: 'no ataque dos lobos', onca: 'no ataque da onça', jacare: 'no ataque de um jacaré', bicho: 'atacado por um bicho' };
  // o que a cova mostra ao toque
  M.graveInfo = function (S, o) {
    const d = (o.pid && person(S, o.pid)) || S.people.find((p) => !p.alive && p.name === o.name && !p.corpo) || null;
    const out = { name: o.name, antiga: !o.pid, flores: !!(o.fl && o.fl > S.t), oferenda: !!(o.of && o.of > S.t), rito: o.r ? o.r.split('').map((l) => RITO_NOME[l]).filter(Boolean) : [], velado: !!o.vel, laje: !!o.laje };
    if (!d) return out;
    const Y = DAY * C.YEAR_DAYS, y0 = Math.floor(d.born / Y) + 1, y1 = Math.floor(d.diedAt / Y) + 1;
    out.pid = d.id; out.sex = d.sex; out.povo = Pv() ? Pv().label(d) : '';
    out.de = y0; out.ate = y1; out.anos = Math.floor((d.diedAt - d.born) / Y);
    out.causa = (CAUSA[d.cause] || '').replace('atacado', 'atacad' + oa(d));
    out.kin = [...kinIds(S, d)].map((id) => person(S, id)).filter((q) => q && q.alive).map((q) => q.name);
    const line = S.chron.find((c) => Math.abs(c.t - d.diedAt) < 2 && c.text.indexOf(d.name) === 0);
    out.cron = line ? line.text : '';
    return out;
  };
  // quem está enterrado (mais novo primeiro), para o painel do cemitério
  M.buried = (S) => graves(S).slice().sort((a, b) => (b.t || 0) - (a.t || 0)).map((o) => M.graveInfo(S, o));
  // o estado do corpo de quem morreu (para a ficha)
  M.bodyText = function (S, d) {
    const c = d.corpo;
    if (c) return c.st === 0 ? 'Ninguém achou ainda' : c.by ? 'Sendo levad' + oa(d) : c.st === 1 ? 'Espera quem ' + oa(d) + ' leve para junto do fogo' : c.fim ? 'Espera o enterro' : 'No velório, ao pé do fogo';
    if (d.cova) return 'Enterrad' + oa(d) + (cemB(S) ? ' no cemitério' : '');
    return d.semCova ? 'Sem cova' : '';
  };
  // o rito numa frase (para a aba de Deus)
  M.ritoInfo = function (S) {
    const m = S.memoria, e = m.erva;
    if (!e.known) return { known: false };
    const falta = Math.max(0, Math.ceil((C.RITO_GAP_D * DAY - (S.t - e.last)) / DAY));
    return { known: true, lei: e.lei || 'livre', ritos: S.stats.ritos, respostas: S.stats.respostas, on: !!e.rite, hoje: e.hoje === S.ck.day, falta, apegados: S.people.filter((p) => p.alive && (p.rito || 0) >= C.RITO_APEGO).length,
      prom: m.prom.map((x) => ({ k: x.k, dias: Math.max(0, Math.ceil((x.until - S.t) / DAY)) })) };
  };
  M.missions = function (phase) {
    if (phase === 2) return [{ id: 'm_conto', text: 'Ouça o povo contar um feito seu', opt: true, reward: 6, done: false }];
    if (phase === 3) return [
      { id: 'm_velar', text: 'Veja o povo velar quem partiu', opt: true, reward: 6, done: false },
      { id: 'm_flores', text: 'Veja alguém levar flores a uma cova', opt: true, reward: 5, done: false }];
    if (phase === 4) return [
      { id: 'm_rito', text: 'Responda a uma pergunta do rito', opt: true, reward: 8, done: false },
      { id: 'm_finados', text: 'Passe um dia dos mortos com o povo', opt: true, reward: 8, done: false },
      { id: 'm_reconto', text: 'Veja um conto ser contado por quem não viu', opt: true, reward: 8, done: false }];
    return [];
  };
  M.goalTest = {
    m_conto: (S) => (S.stats.contados || 0) > 0,
    m_velar: (S) => (S.stats.velorios || 0) > 0,
    m_flores: (S) => (S.stats.visitas || 0) > 0,
    m_rito: (S) => (S.stats.respostas || 0) > 0,
    m_finados: (S) => (S.stats.finados || 0) > 0,
    m_reconto: (S) => (S.stats.recontos || 0) > 0,
  };
})(globalThis.G = globalThis.G || {});
