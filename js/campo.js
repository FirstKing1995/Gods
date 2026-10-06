/* Gods · Campo (Etapa 10): a roça, a criação e as cercas.
   Quatro descobertas do campo, numa árvore (como as invenções): Roça → Algodão, Cerca e Criação.
   Roça: obra de 3 x 3 onde o povo planta feijão, milho, abóbora, mandioca e algodão, capina o mato, colhe e leva ao
   estoque. O inverno para tudo, menos a mandioca. Bicho do mato come roça aberta; a cerca segura.
   Criação: curral com galinhas, coelhos, porcos, ovelhas e gado, que chegam com o mascate (troca). Dão cria, ovos,
   leite e lã; no inverno pedem ração; o lobo leva bicho de curral aberto, e a onça pula a cerca.
   Cercas: marcadas no mapa como os caminhos; bicho não passa, gente pula (em cima de caminho vira porteira). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, W = G.W;
  const K = G.Campo = {};
  const T = () => G.Tech, Sim = () => G.Sim, Fam = () => G.Family;
  const DAY = () => C.DAY_MIN;
  const rint = (S, a, b) => S.rng.int(a, b);

  // ---------- descobertas do campo ----------
  K.ORDER = ['roca', 'algodao', 'cerca', 'criacao'];
  // req: o que precisa existir (descoberta ou invenção) · art: como se fala dela numa frase
  K.DEF = {
    roca: { name: 'Roça', icon: 'roca', req: ['ceramica'], art: 'a roça',
      learn: 'colhendo frutas, secando sementes no jirau e cavando o barro',
      gives: 'Libera a roça: feijão, milho, abóbora e mandioca plantados perto de casa, e a Vontade Roça.',
      story: (n) => n + ' viu brotar as sementes que caíram do jirau e entendeu: a terra devolve o que se planta. Nasceu a roça.',
      hint: 'Construir → Roça (tecla H), em terra boa perto de casa. Suba Roça nas Vontades.' },
    algodao: { name: 'Algodão', icon: 'algodao', req: ['roca'], art: 'o algodão',
      learn: 'plantando e colhendo na roça e tecendo',
      gives: 'Planta-se algodão na roça: cada colheita dá fibra para a tecelagem.',
      story: (n) => n + ' abriu um capulho branco e torceu o primeiro fio de algodão: agora a roça também dá fibra.',
      hint: 'Toque numa roça e escolha Algodão, ou deixe o povo escolher.' },
    cerca: { name: 'Cerca', icon: 'cerca', req: ['roca', 'corda'], art: 'a cerca',
      learn: 'construindo, cortando madeira, abrindo caminhos e plantando',
      gives: 'Cercas de vara marcadas no mapa: bicho do mato não entra na roça, e a criação não foge nem vira comida de lobo.',
      story: (n) => n + ' fincou estacas e amarrou varas em volta da roça: nasceu a cerca, e os bichos do mato ficaram do lado de fora.',
      hint: 'Construir → Cerca (tecla X) e arraste pelo chão. Feche a volta toda: árvore, pedra e água também servem de parede.' },
    criacao: { name: 'Criação', icon: 'galinha', req: ['roca'], art: 'a criação',
      learn: 'caçando e cuidando da roça',
      gives: 'Libera o curral e a Vontade Criação. Passam mascates trocando bichos de criação.',
      story: (n) => n + ' pegou um filhote que se perdeu do bando e o criou com as sobras da roça: o povo aprendeu a criar bichos.',
      hint: 'Construa um curral (tecla Y). Um mascate vai passar com bichos para trocar.' },
  };
  for (const id of K.ORDER) K.DEF[id].campo = true;
  // o que cada trabalho ensina (tipo:etapa, e no Ofício também o que se faz → peso por hora)
  const TEACH = {
    roca: { 'frutas:work': 1, 'conservar:load': 2, 'argila:work': 0.5 },
    algodao: { 'roca:plant': 1, 'roca:harvest': 1, 'oficio:work:mantas': 1, 'oficio:work:redes': 1 },
    cerca: { 'construir:build': 0.6, 'madeira:work': 0.3, 'caminho:work': 0.5, 'roca:plant': 0.6 },
    criacao: { 'caca:cut': 1.5, 'caca:aim': 0.3, 'roca:harvest': 1, 'roca:plant': 0.5, 'roca:weed': 0.5 },
  };
  K.TEACH = TEACH;
  const BY_KEY = {};
  for (const id of K.ORDER) for (const k in TEACH[id]) (BY_KEY[k] || (BY_KEY[k] = [])).push([id, TEACH[id][k]]);
  Object.assign(T().DISC, K.DEF);   // entram na janela das Descobertas (aba Campo)

  K.known = (S, id) => !!(S.tech && S.tech.known[id]);
  K.count = (S) => (S.tech ? K.ORDER.filter((id) => S.tech.known[id]).length : 0);
  K.isOpen = function (S, id) {
    const t = S.tech, d = K.DEF[id];
    if (!t || !d || t.known[id]) return false;
    for (const r of d.req) if (!t.known[r]) return false;
    return true;
  };
  K.openList = (S) => K.ORDER.filter((id) => K.isOpen(S, id));
  K.need = (id) => C.CAMPO_NEED[id];
  K.progress = (S, id) => (K.known(S, id) ? 1 : Math.min(1, ((S.tech && S.tech.prat[id]) || 0) / K.need(id)));
  K.missing = (S, id) => K.DEF[id].req.filter((r) => !(S.tech && S.tech.known[r])).map((r) => T().DISC[r].name.toLowerCase());
  function practice(S, p, list, dt) {
    if (!list) return;
    const t = S.tech;
    for (const [id, w] of list) {
      if (!K.isOpen(S, id)) continue;
      const h = w * dt / 60 * (G.Deus ? G.Deus.pratMult(S) : 1);   // a escrita (Etapa 11) apressa
      t.prat[id] = (t.prat[id] || 0) + h;
      if (p) { const who = t.whoCampo[id] || (t.whoCampo[id] = {}); who[p.id] = (who[p.id] || 0) + h; }
    }
  }
  K.onWork = function (S, p, a, dt) {
    if (!S.tech || !S.tech.whoCampo) return;
    const key = a.type + ':' + a.stage;
    practice(S, p, BY_KEY[key], dt);
    if (a.make) practice(S, p, BY_KEY[key + ':' + a.make], dt);
  };
  function inventor(S, id) {
    const who = (S.tech.whoCampo && S.tech.whoCampo[id]) || {};
    let best = null, bh = -1;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 7) continue;
      const h = who[p.id] || 0;
      if (h > bh) { bh = h; best = p; }
    }
    return best;
  }
  K.invent = function (S, id, p, how) {
    if (!K.DEF[id] || K.known(S, id)) return false;
    if (!T().discover(S, id, p || inventor(S, id), how)) return false;
    if (S.tech.whoCampo) delete S.tech.whoCampo[id];
    if (S.tech.aim === id) S.tech.aim = null;
    if (K.count(S) === 1) Sim().toast(S, 'Primeira descoberta do campo! Veja em Povo → Descobertas → Campo.', 'good');
    return true;
  };
  // a mais adiantada entre as abertas (para a Revelação), se já passou do mínimo
  K.best = function (S) {
    let best = null, bp = C.REVELACAO_MIN - 1e-9;
    for (const id of K.openList(S)) { const pr = K.progress(S, id); if (pr >= bp) { bp = pr; best = id; } }
    return best;
  };

  // ---------- estado ----------
  const ST_OF = ['vazia', 'crescendo', 'madura'];
  K.init = function (S) {
    const w = S.world, n = w.W * w.H;
    const c = S.campo || (S.campo = {});
    if (!w.fence || w.fence.length !== n) w.fence = new Uint8Array(n);
    if (!w.fenceJob || w.fenceJob.length !== n) w.fenceJob = new Uint8Array(n);
    // obras que são parede para bicho (tudo menos roça e curral): contam na área cercada
    w.bwall = new Uint8Array(n);
    for (const b of S.buildings) K.wallMark(S, b, true);
    // o que veio do save: cercas em runs, bichos em listas curtas
    if (typeof c.fence === 'string' && G.Obras && G.Obras.unpackRuns) G.Obras.unpackRuns(c.fence, w.fence);
    delete c.fence;
    c.fjobs = (c.fjobs || []).map((j) => (Array.isArray(j) ? { i: j[0], prog: j[1] || 0 } : j)).filter((j) => j && j.i >= 0 && j.i < n && !w.fence[j.i]);
    for (const j of c.fjobs) w.fenceJob[j.i] = 1;
    c.fences = K.fenceCount(S);
    c.bichos = (c.bichos || []).map((a) => (Array.isArray(a) ? { id: a[0], sp: C.CRIA_ORDER[a[1]] || 'galinha', sex: a[2] ? 'M' : 'F', pen: a[3], x: a[4], y: a[5], born: a[6] || 0 } : a));
    for (const a of c.bichos) { a.path = null; a.pathI = 0; a.px = a.x; a.py = a.y; a.walk = 0; a.dir = a.dir || 2; a.wait = 10; }
    c.nextId = c.nextId || 1;
    c.fenceRev = (c.fenceRev || 0) + 1;
    if (c.mascateAt === undefined) c.mascateAt = 0;
    c.mascates = c.mascates || 0;
    for (const b of S.buildings) {
      if (b.type === 'roca') { const f = farmOf(b); f.res = 0; if (typeof f.st === 'number') f.st = ST_OF[f.st] || 'vazia'; }
      if (b.type === 'curral') penOf(b).res = 0;
    }
    for (const p of S.people) {
      if (p.skills.plantio === undefined) p.skills.plantio = 0;
      if (p.skills.criacao === undefined) p.skills.criacao = 0;
    }
    if (S.tech) S.tech.whoCampo = S.tech.whoCampo || {};
    const st = S.stats;
    st.harvests = st.harvests || 0; st.harvestBy = st.harvestBy || {}; st.harvested = st.harvested || 0;
    st.raids = st.raids || 0; st.criaBorn = st.criaBorn || 0; st.criaLost = st.criaLost || 0; st.fencesBuilt = st.fencesBuilt || 0;
    st.ovosGot = st.ovosGot || 0; st.leiteGot = st.leiteGot || 0; st.laGot = st.laGot || 0; st.abates = st.abates || 0;
    // save de antes da 0.10 já na fase da aldeia: ganha as missões do campo (uma vez)
    if (!st.campoMissions) {
      st.campoMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of K.missions(f)) if (!S.goals.some((g) => g.id === m.id)) S.goals.push(m);
    }
    encCache.clear();
  };
  K.pack = function (S) {
    const c = S.campo, w = S.world;
    if (!c) return null;
    const out = Object.assign({}, c);
    out.fence = G.Obras && G.Obras.packRuns ? G.Obras.packRuns(w.fence) : '';
    out.fjobs = c.fjobs.map((j) => [j.i, +(j.prog || 0).toFixed(3)]);
    out.bichos = c.bichos.map((a) => [a.id, Math.max(0, C.CRIA_ORDER.indexOf(a.sp)), a.sex === 'M' ? 1 : 0, a.pen, +a.x.toFixed(2), +a.y.toFixed(2), Math.round(a.born || 0)]);
    return out;
  };

  // ---------- roça ----------
  function farmOf(b) {
    return b.farm || (b.farm = { pick: null, k: null, st: 'vazia', grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, pile: 0, pileK: null, res: 0, ripeAt: 0, last: null, wk: null });
  }
  K.farmOf = farmOf;
  K.isRoca = (b) => !!b && b.type === 'roca';
  K.rocas = (S) => S.buildings.filter((b) => b.type === 'roca' && b.built);
  K.crops = (S) => C.ROCA_ORDER.filter((k) => k !== 'algodao' || K.known(S, 'algodao'));
  K.cropName = (k) => (C.ROCA[k] ? C.ROCA[k].name : '');
  const seca = (S) => !!(G.Narr && G.Narr.is(S, 'seca')) && !(S.god && S.god.rainUntil > S.t);
  // quanto a cultura cresce num dia daquela estação (fração do caminho até madurar)
  function rateOn(S, k, season) {
    const d = C.ROCA[k];
    let r = C.ROCA_GROW[season];
    if (season === 3) r = d.winter || 0;
    return r / d.days;
  }
  K.rate = (S, k) => rateOn(S, k, S.ck.season) * (seca(S) ? C.ROCA_SECA : 1);
  // dias até madurar, do ponto em que está (Infinity se o inverno pega antes)
  K.daysLeft = function (S, k, grow) {
    let g = grow || 0, doy = S.ck.doy + S.ck.hour / 24;
    for (let d = 0; d < 120; d++) {
      const season = Math.floor(((doy + d) % C.YEAR_DAYS) / C.SEASON_DAYS);
      const r = rateOn(S, k, season);
      if (r <= 0) return Infinity;
      g += r;
      if (g >= 1) return d + 1;
    }
    return Infinity;
  };
  // dá para plantar agora? ('' = dá) — o inverno só aceita a mandioca, e a planta tem de madurar antes da geada
  K.plantWhy = function (S, k) {
    if (!C.ROCA[k]) return 'cultura desconhecida';
    if (k === 'algodao' && !K.known(S, 'algodao')) return 'pede o algodão';
    if (S.ck.season === 3 && k !== 'mandioca') return 'no inverno só a mandioca cresce';
    if (k !== 'mandioca' && K.daysLeft(S, k, 0) === Infinity) return 'não dá tempo de madurar antes do inverno';
    return '';
  };
  // o que plantar: a escolha do jogador (se dá agora), senão o povo escolhe pela necessidade e pela estação
  K.cropOf = function (S, b) {
    const f = farmOf(b);
    if (f.pick) return K.plantWhy(S, f.pick) ? null : f.pick;
    return K.autoCrop(S, b);
  };
  K.autoCrop = function (S, b) {
    const ok = K.crops(S).filter((k) => !K.plantWhy(S, k));
    if (!ok.length) return null;
    if (ok.length === 1) return ok[0];
    const st = S.stock, growing = {}, rocas = K.rocas(S);
    for (const r of rocas) if (r !== b && r.farm && r.farm.k && r.farm.st !== 'vazia') growing[r.farm.k] = (growing[r.farm.k] || 0) + 1;
    // no outono, a mandioca garante o inverno; algodão quando falta fibra, e só com mais de uma roça (comida primeiro).
    // A fibra que falta conta as mantas e redes que o povo ainda precisa (com a tecelagem) e as obras marcadas
    const Ob = G.Obras, tear = !!(Ob && Ob.shopOf && Ob.shopOf(S, 'tecido'));
    const want = 20 + (tear ? 3 * Math.max(0, Ob.needMantas(S)) + 4 * Math.max(0, Ob.needRedes(S)) : 0) + ((S.ctx && S.ctx.matShort && S.ctx.matShort.fibra) || 0);
    const cotton = rocas.length >= 2 && (st.fibra || 0) < want && !growing.algodao;
    const fed = !!(S.ctx && S.ctx.foodDays >= 20);   // com comida folgada, a fibra que falta passa na frente
    const base = { feijao: 1, milho: 1.1, abobora: 0.9, mandioca: S.ck.season === 2 ? 1.6 : 0.7, algodao: cotton ? (fed ? 3 : 1.05) : 0.12 };
    let best = null, bs = -1;
    for (const k of ok) {
      const have = k === 'algodao' ? (st.fibra || 0) : (st[k] || 0);
      const s = base[k] / (1 + (have + (growing[k] || 0) * C.ROCA[k].yield) / 40);
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  };
  // quanto a roça rende (adubo, fartura, perdas)
  K.yieldOf = function (S, b) {
    const f = farmOf(b), d = C.ROCA[f.k];
    if (!d) return 0;
    const mult = (Sim().def(b).farm || { mult: 1 }).mult;
    const terra = G.Deus && G.Deus.dom(S, 'terra') ? C.DOM.terraRoca : 1;   // Etapa 11: Mão na Terra
    return Math.max(0, Math.round(d.yield * mult * (f.bonus || 1) * terra * (1 - Math.min(0.95, f.lost || 0))));
  };
  // tarefa da roça para alguém (ou só para saber se há): colher, levar a colheita, capinar, plantar
  K.rocaPlan = function (S, p) {
    let best = null, bs = -1e9;
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      // reservada por quem está trabalhando nela: só dá para ajudar a levar a colheita (vários levam juntos)
      const taken = f.res && f.res !== (p ? p.id : -1) && busyWith(S, f.res, b.id, 'roca');
      let kind = null, pri = 0, k = f.k;
      if (!taken && f.st === 'madura') { kind = 'harvest'; pri = 3 + (S.t - f.ripeAt > C.ROCA[f.k].ripe * DAY() * 0.6 ? 1 : 0); }
      else if (f.pile > haulers(S, b, p) * 18) { kind = 'haul'; pri = 2.5; }
      else if (taken) continue;
      else if (f.st === 'crescendo' && f.mato && !f.weeded) { kind = 'weed'; pri = 2; }
      else if (f.st === 'vazia') { k = K.cropOf(S, b); if (k) { kind = 'plant'; pri = S.ck.season === 0 ? 1.8 : 1.5; } }
      if (!kind) continue;
      const dist = p ? Math.hypot(b.x + 1.5 - p.x, b.y + 1.5 - p.y) : 0;
      const sc = pri * 10 - dist * 0.2;
      if (sc > bs) { bs = sc; best = { b, kind, k }; }
    }
    return best;
  };
  // quantos já vão levar a colheita desta roça (fora quem pergunta)
  function haulers(S, b, p) {
    let n = 0;
    for (const q of S.people) if (q !== p && q.alive && q.act && q.act.type === 'roca' && q.act.b === b.id && q.act.task === 'haul' && q.act.stage === 'go') n++;
    return n;
  }
  // a pessoa que reservou ainda está fazendo isso?
  function busyWith(S, pid, bid, type) {
    const q = S.people.find((x) => x.id === pid);
    return !!(q && q.alive && q.act && q.act.type === type && q.act.b === bid);
  }
  K.reserve = (S, b, p) => { if (b.farm) b.farm.res = p.id; if (b.pen) b.pen.res = p.id; };
  K.release = function (S, bid, p, a) {
    const b = Sim().building(S, bid);
    if (!b) return;
    if (b.farm && b.farm.res === p.id) {
      b.farm.res = 0;
      // o trabalho feito pela metade fica guardado (quem voltar continua dali)
      if (a && (a.stage === 'plant' || a.stage === 'weed' || a.stage === 'harvest') && a.t > 0) b.farm.wk = { task: a.stage, t: a.t, k: a.k };
    }
    if (b.pen && b.pen.res === p.id) b.pen.res = 0;
  };
  K.resume = function (b, task, k) {
    const f = b.farm, wk = f && f.wk;
    if (!wk || wk.task !== task || (task === 'plant' && wk.k !== k)) return 0;
    f.wk = null;
    return wk.t || 0;
  };
  K.plant = function (S, b, k, p) {
    const f = farmOf(b);
    if (f.st !== 'vazia' || K.plantWhy(S, k)) return false;
    Object.assign(f, { k, st: 'crescendo', grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, plantedAt: S.t, wk: null, told: 0 });
    S.stats.planted = (S.stats.planted || 0) + 1;
    if (S.stats.planted === 1) Sim().chron(S, (p ? p.name + ' plantou' : 'Plantaram') + ' a primeira roça: ' + C.ROCA[k].name.toLowerCase() + '.');
    if (p) Sim().addMem(S, p, 'plantou');
    return true;
  };
  K.weed = function (S, b) {
    const f = farmOf(b);
    f.mato = 0; f.weeded = true; f.wk = null;
    return true;
  };
  K.harvest = function (S, b, p) {
    const f = farmOf(b);
    if (f.st !== 'madura') return 0;
    const k = f.k, d = C.ROCA[k], n = K.yieldOf(S, b), st = S.stats;
    f.pile += n; f.pileK = d.fibra ? 'fibra' : k;
    f.last = { k, n, t: S.t };
    Object.assign(f, { st: 'vazia', k: null, grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, wk: null });
    st.harvests++; st.harvested += n;
    st.harvestBy[k] = (st.harvestBy[k] || 0) + 1;
    const Sm = Sim();
    if (st.harvests === 1) {
      Sm.chron(S, (p ? p.name + ' colheu' : 'Colheram') + ' a primeira roça: ' + n + (d.fibra ? ' de algodão' : ' de ' + d.name.toLowerCase()) + '. A terra devolveu o que o povo plantou.');
      if (G.Life) G.Life.party(S, 'colheita', { k });
    } else if (st.harvestBy[k] === 1) Sm.chron(S, 'A primeira colheita de ' + d.name.toLowerCase() + ': ' + n + (d.fibra ? ' de fibra para a tecelagem.' : ' porções.'));
    for (const q of S.people) if (q.alive && Math.hypot(q.x - b.x - 1.5, q.y - b.y - 1.5) < 8) Sm.addMem(S, q, 'colheita');
    S.events.push({ k: 'harvest', x: b.x + 1.5, y: b.y + 1.5, crop: k });
    return n;
  };
  // tira da colheita no chão o que cabe nas mãos
  K.takePile = function (S, b, cap) {
    const f = farmOf(b);
    if (f.pile <= 0) return null;
    const n = Math.min(f.pile, cap);
    f.pile -= n;
    const k = f.pileK;
    if (f.pile <= 0) { f.pile = 0; f.pileK = null; }
    return { k, n };
  };

  // ---------- criação ----------
  function penOf(b) { return b.pen || (b.pen = { ovos: 0, leite: 0, la: 0, feed: 0, hungry: 0, res: 0, births: {} }); }
  K.penOf = penOf;
  K.isPen = (b) => !!b && b.type === 'curral';
  K.pens = (S) => S.buildings.filter((b) => b.type === 'curral' && b.built);
  K.animalsOf = (S, b) => (S.campo ? S.campo.bichos.filter((a) => a.pen === b.id) : []);
  K.load = (S, b) => K.animalsOf(S, b).reduce((s, a) => s + C.CRIA[a.sp].size, 0);
  K.cap = (S, b) => (Sim().def(b).pen || { cap: 0 }).cap;
  K.room = (S, b) => K.cap(S, b) - K.load(S, b);
  K.herd = (S, sp) => (S.campo ? S.campo.bichos.filter((a) => !sp || a.sp === sp).length : 0);
  const feedNeed = (S, b) => K.animalsOf(S, b).reduce((s, a) => s + C.CRIA[a.sp].feed, 0);
  K.feedNeed = feedNeed;
  const RACAO = ['milho', 'abobora', 'mandioca', 'feijao'];
  K.racao = (S) => RACAO.reduce((s, k) => s + (S.stock[k] || 0), 0);
  // um bicho novo no curral (x, y: onde ele aparece; ele anda até o curral)
  function spawnAnimal(S, sp, sex, pen, x, y) {
    const c = S.campo;
    const a = { id: c.nextId++, sp, sex, pen: pen ? pen.id : 0, x, y, px: x, py: y, dir: 2, walk: 0, path: null, pathI: 0, wait: 0, born: S.t };
    c.bichos.push(a);
    return a;
  }
  function penSpot(S, b) {
    // um lugar dentro do curral
    return { x: b.x + 0.5 + rint(S, 0, b.w - 1), y: b.y + 0.5 + rint(S, 0, b.h - 1) };
  }
  // o curral com mais lugar para um bicho desse tamanho
  function bestPen(S, size) {
    let best = null, br = -1e9;
    for (const b of K.pens(S)) { const r = K.room(S, b); if (r >= size && r > br) { br = r; best = b; } }
    return best;
  }
  K.bestPen = bestPen;
  // chegam bichos (troca com o mascate): aparecem em (x, y) e vão para o curral
  K.receive = function (S, offer, x, y) {
    const d = C.CRIA[offer.sp], out = [];
    const sexes = [];
    for (let i = 0; i < offer.m; i++) sexes.push('M');
    for (let i = 0; i < offer.f; i++) sexes.push('F');
    const first = K.herd(S) === 0;
    for (const sx of sexes) {
      const pen = bestPen(S, d.size);
      const a = spawnAnimal(S, offer.sp, sx, pen, x + (S.rng.next() - 0.5) * 1.2, y + 0.3 + S.rng.next() * 0.6);
      a.wait = 0;
      out.push(a);
      // a primeira cria vem depois do tempo da espécie (não no dia em que chegam)
      if (pen) { const pe = penOf(pen); if (pe.births[offer.sp] === undefined) pe.births[offer.sp] = S.ck.day; }
    }
    S.stats.criaGot = (S.stats.criaGot || 0) + out.length;
    const txt = arrivedText(offer.sp, offer.m, offer.f) + ' ao curral';
    if (first) Sim().chron(S, txt + ': a criação começou.');
    else Sim().toast(S, txt + '.', 'good');
    for (const q of S.people) if (q.alive && Math.hypot(q.x - S.camp.x - 1, q.y - S.camp.y - 1) < 10) Sim().addMem(S, q, 'criacaoNova');
    return out;
  };
  // "um galo e duas galinhas", "um casal de porcos", "um boi e uma vaca"
  const NUM_M = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis'], NUM_F = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis'];
  const count = (n, fem, one, many) => (fem ? NUM_F : NUM_M)[n] ? (fem ? NUM_F : NUM_M)[n] + ' ' + (n === 1 ? one : many) : n + ' ' + many;
  const PAIR = { galinha: ['galo', 'galos', 'galinha', 'galinhas'], gado: ['boi', 'bois', 'vaca', 'vacas'], ovelha: ['carneiro', 'carneiros', 'ovelha', 'ovelhas'] };
  function animalsText(sp, m, f) {
    const P = PAIR[sp];
    if (P) return count(m, false, P[0], P[1]) + ' e ' + count(f, true, P[2], P[3]);
    const pl = { coelho: 'coelhos', porco: 'porcos' }[sp] || C.CRIA[sp].name.toLowerCase() + 's';
    if (m === 1 && f === 1) return 'um casal de ' + pl;
    return count(m + f, false, C.CRIA[sp].name.toLowerCase(), pl);
  }
  K.animalsText = animalsText;
  // "Chegou um casal de coelhos", "Chegaram um galo e duas galinhas"
  const arrivedText = (sp, m, f) => ((m === 1 && f === 1 && !PAIR[sp]) || m + f === 1 ? 'Chegou ' : 'Chegaram ') + animalsText(sp, m, f);
  K.arrivedText = arrivedText;
  K.nameOf = (a) => (a.sex === 'M' && C.CRIA[a.sp].male ? C.CRIA[a.sp].male : C.CRIA[a.sp].name);

  // tarefa da criação: recolher ovos, leite e lã; levar ração no frio; abater quando o curral enche
  K.criaPlan = function (S, p) {
    let best = null, bs = -1e9;
    const winterish = S.ck.season === 3 || (S.ck.season === 2 && S.ck.dos >= 8);
    const kid = !!(p && Fam().stage(S, p) === 'crianca');   // criança recolhe ovo e dá ração, não abate
    for (const b of K.pens(S)) {
      const pe = penOf(b);
      if (pe.res && pe.res !== (p ? p.id : -1) && busyWith(S, pe.res, b.id, 'criacao')) continue;
      const animals = K.animalsOf(S, b);
      if (!animals.length && !(pe.ovos >= 1 || pe.leite >= 1 || pe.la >= 1)) continue;
      const cands = [];
      if (pe.leite >= 3 || pe.ovos >= 4 || pe.la >= 3 || (pe.ovos + pe.leite + pe.la >= 2 && S.ck.hour >= 15)) cands.push({ kind: 'collect', pri: pe.leite >= 3 ? 2.6 : 2 });
      const need = feedNeed(S, b);
      if (winterish && need > 0 && pe.feed < need * 4 && K.racao(S) > 0) cands.push({ kind: 'feed', pri: pe.hungry ? 3.2 : 2.2, n: Math.ceil(need * 6 - pe.feed) });
      const load = K.load(S, b), cap = K.cap(S, b), food = S.ctx ? S.ctx.foodDays : 20;
      if (!kid && K.slaughterPick(S, b) && (load > cap || (load >= cap * 0.85 && food < 12) || (pe.hungry >= 2 && K.racao(S) <= 0) || (load >= cap * 0.75 && S.ck.season === 2 && S.ck.dos >= 10)))
        cands.push({ kind: 'slaughter', pri: load > cap ? 2.4 : 1.6 });
      for (const c of cands) {
        const dist = p ? Math.hypot(b.x + 1.5 - p.x, b.y + 1.5 - p.y) : 0;
        const sc = c.pri * 10 - dist * 0.2;
        if (sc > bs) { bs = sc; best = Object.assign({ b }, c); }
      }
    }
    return best;
  };
  // quem vai para o abate: da espécie com mais bichos além do casal (macho sobrando primeiro, depois o mais velho)
  K.slaughterPick = function (S, b) {
    const animals = K.animalsOf(S, b), by = {};
    for (const a of animals) (by[a.sp] || (by[a.sp] = [])).push(a);
    let best = null, bs = 0;
    for (const sp in by) {
      const list = by[sp], males = list.filter((a) => a.sex === 'M'), fem = list.length - males.length;
      if (list.length <= C.CRIA_KEEP) continue;
      // sobra: machos além de um (ou fêmeas além do que o curral aguenta), pesado pelo tamanho
      const extra = list.length - C.CRIA_KEEP, sc = extra * C.CRIA[sp].size;
      if (sc <= bs) continue;
      bs = sc;
      const pick = males.length > 1 ? males.sort((x, y) => x.born - y.born)[0] : fem > 1 ? list.filter((a) => a.sex === 'F').sort((x, y) => x.born - y.born)[0] : null;
      if (pick) best = pick;
    }
    return best;
  };
  K.collect = function (S, b, cap) {
    const pe = penOf(b);
    const ovos = Math.min(Math.floor(pe.ovos), cap), leite = Math.min(Math.floor(pe.leite), Math.max(0, cap - ovos)), la = Math.min(Math.floor(pe.la), Math.max(0, cap - ovos - leite));
    if (!ovos && !leite && !la) return null;
    pe.ovos -= ovos; pe.leite -= leite; pe.la -= la;
    return { k: 'cria', ovos, leite, fibra: la, n: ovos + leite + la };
  };
  K.feedPen = function (S, b, n) { penOf(b).feed += n; };
  // tira ração do estoque (o que estraga primeiro vai antes)
  K.takeFeed = function (S, n) {
    const back = {};
    let got = 0;
    for (const k of ['mandioca', 'abobora', 'milho', 'feijao']) {
      const t = Math.min(n - got, S.stock[k] || 0);
      if (t > 0) { S.stock[k] -= t; back[k] = t; got += t; }
      if (got >= n) break;
    }
    return { n: got, back };
  };
  K.slaughter = function (S, b, p) {
    const a = K.slaughterPick(S, b);
    if (!a) return null;
    removeAnimal(S, a);
    const d = C.CRIA[a.sp], faca = T().known(S, 'faca');
    const carne = d.carne + (faca ? Math.round(C.FACA_CARNE / 2) : 0), couro = d.couro;
    S.stats.abates++;
    if (S.stats.abates === 1) Sim().chron(S, (p ? p.name + ' abateu' : 'Abateram') + ' ' + d.art.replace(/^uma /, 'a primeira ').replace(/^um /, 'o primeiro ') + ' da criação: carne sem precisar caçar.');
    return { k: 'caca', carne, couro, n: carne + couro, sp: a.sp };
  };
  function removeAnimal(S, a) {
    const c = S.campo, i = c.bichos.indexOf(a);
    if (i >= 0) c.bichos.splice(i, 1);
  }
  K.removeAnimal = removeAnimal;

  // ---------- cercas ----------
  K.fenceWhy = function (S, i) {
    const w = S.world;
    if (i < 0 || i >= w.W * w.H) return 'Fora do mapa';
    const x = i % w.W, y = (i / w.W) | 0;
    if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) return 'Fora do mapa';
    if (S.seen && !S.seen[i]) return 'A névoa cobre esse lugar';
    if (G.IS_WATER[w.tile[i]]) return 'Não dá cerca na água (a água já faz de parede)';
    if (w.bgrid[i] >= 0) return 'Já tem uma obra aqui';
    if (Sim().isCamp(S, i)) return 'Esse é o lugar do estoque';
    const ob = W.objAt(w, i);
    if (ob && ob.k === 'tree') return 'Tem uma árvore aqui (a árvore já faz de parede)';
    if (ob && ob.k === 'rock') return 'Tem uma pedra aqui (a pedra já faz de parede)';
    if (ob && ob.k === 'grave') return 'Aí tem um túmulo';
    return '';
  };
  function setFence(S, i, v) {
    const w = S.world;
    if (w.fence[i] === v) return;
    w.fence[i] = v;
    S.campo.fenceRev++;
    S.campo.fences += v ? 1 : -1;
    S.events.push({ k: 'fence', i });
  }
  K.markFence = function (S, i, on) {
    const w = S.world, c = S.campo;
    if (!on) {
      const had = !!(w.fence[i] || w.fenceJob[i]);
      if (w.fenceJob[i]) { c.fjobs = c.fjobs.filter((j) => j.i !== i); w.fenceJob[i] = 0; }
      if (w.fence[i]) setFence(S, i, 0);
      return had;
    }
    if (K.fenceWhy(S, i) || w.fence[i] || w.fenceJob[i]) return false;
    c.fjobs.push({ i, prog: 0 });
    w.fenceJob[i] = 1;
    c.blockedUntil = 0;
    return true;
  };
  // obra marcada ou removida: casa, fogueira, oficina... são parede para bicho (a cerca pode encostar nelas)
  const NOT_WALL = { roca: 1, curral: 1 };
  K.wallMark = function (S, b, on) {
    const w = S.world;
    if (!w.bwall || NOT_WALL[b.type]) return;
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) w.bwall[(b.y + dy) * w.W + b.x + dx] = on ? 1 : 0;
    if (S.campo) S.campo.fenceRev++;
  };
  // uma obra erguida em cima da cerca: a cerca (e a marcada) sai dali
  K.clearTile = function (S, i) {
    const w = S.world;
    if (!w.fence) return;
    if (w.fenceJob[i]) { S.campo.fjobs = S.campo.fjobs.filter((j) => j.i !== i); w.fenceJob[i] = 0; }
    if (w.fence[i]) setFence(S, i, 0);
  };
  K.fenceNeed = function (S) {
    const c = S.campo;
    if (!c || !c.fjobs.length || c.blockedUntil > S.t) return 0;
    return S.stock.madeira >= C.CERCA_WOOD ? 1 : 0;
  };
  K.fenceShort = (S) => (S.campo ? S.campo.fjobs.length * C.CERCA_WOOD : 0);
  K.fenceJobAt = (S, i) => (S.campo ? S.campo.fjobs.find((j) => j.i === i) : null);
  K.finishFence = function (S, j) {
    const w = S.world, c = S.campo;
    const ob = W.objAt(w, j.i);
    if (ob && (ob.k === 'stump' || ob.k === 'bush')) W.removeObj(w, ob);
    w.fenceJob[j.i] = 0;
    c.fjobs.splice(c.fjobs.indexOf(j), 1);
    setFence(S, j.i, 1);
    S.stats.fencesBuilt++;
    if (S.stats.fencesBuilt === 1) Sim().chron(S, 'Fincaram a primeira cerca. Bicho não passa; gente pula.');
  };
  // porteira: cerca em cima de caminho de terra ou de pedra (o povo passa sem pular)
  K.gate = (w, i) => !!(w.fence && w.fence[i] && w.road && w.road[i] >= 2);
  K.fenceCount = (S) => { const f = S.world.fence; let n = 0; if (f) for (let i = 0; i < f.length; i++) if (f[i]) n++; return n; };

  // ---------- área cercada ----------
  // Da obra para fora, pelos passos que um bicho anda (sem cerca, sem água, sem árvore ou pedra), em cruz: se chega
  // na beira do mapa ou passa de CERCA_MAX_AREA passos, está aberta. Senão, é a área cercada (lista e conjunto).
  const encCache = new Map();
  let fillStamp = null, fillN = 0, fillId = 0;
  K.encl = function (S, b) {
    const w = S.world, key = (w.rev || 0) + ':' + (S.campo ? S.campo.fenceRev : 0) + ':' + b.x + ',' + b.y + ':' + b.w;
    const hit = encCache.get(b.id);
    if (hit && hit.key === key && hit.w === w) return hit;
    const r = flood(S, b);
    r.key = key; r.w = w;
    encCache.set(b.id, r);
    return r;
  };
  K.enclosed = (S, b) => !K.encl(S, b).open;
  function flood(S, b) {
    const w = S.world, n = w.W * w.H, Wd = w.W, fence = w.fence;
    if (!fillStamp || fillN !== n) { fillStamp = new Uint32Array(n); fillN = n; fillId = 0; }
    fillId++;
    const list = [];
    const q = [];
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) { const i = (b.y + dy) * Wd + b.x + dx; fillStamp[i] = fillId; q.push(i); }
    let open = false;
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      list.push(i);
      if (list.length > C.CERCA_MAX_AREA) { open = true; break; }
      const x = i % Wd, y = (i / Wd) | 0;
      if (x <= 0 || y <= 0 || x >= Wd - 1 || y >= w.H - 1) { open = true; break; }
      for (const ni of [i - 1, i + 1, i - Wd, i + Wd]) {
        if (fillStamp[ni] === fillId) continue;
        fillStamp[ni] = fillId;
        if (w.block[ni] || G.IS_WATER[w.tile[ni]] || (fence && fence[ni]) || (w.bwall && w.bwall[ni])) continue;
        q.push(ni);
      }
    }
    if (open) return { open: true, list: null, set: null, size: list.length };
    return { open: false, list, set: new Set(list), size: list.length };
  }
  K.inside = (S, b, i) => { const e = K.encl(S, b); return !e.open && e.set.has(i); };
  // árvores e pedras que fazem de parede numa roça ou num curral cercados: o povo não corta nem quebra (cortada, a
  // volta abriria). Só as da beira, com o lado de fora livre; as que ficam dentro do cercado podem sair.
  let guardKey = '', guardW = null, guardSet = new Set();
  K.guarded = function (S) {
    const w = S.world, c = S.campo;
    if (!c || !w.fence) return guardSet.size ? (guardSet = new Set()) : guardSet;
    const farm = S.buildings.filter((b) => (b.type === 'roca' || b.type === 'curral') && b.built);
    const key = (w.rev || 0) + ':' + c.fenceRev + ':' + farm.map((b) => b.id).join(',');
    if (key === guardKey && guardW === w) return guardSet;
    guardKey = key; guardW = w;
    const set = new Set(), Wd = w.W;
    const free = (i) => !w.block[i] && !G.IS_WATER[w.tile[i]] && !w.fence[i] && !(w.bwall && w.bwall[i]);
    for (const b of farm) {
      const e = K.encl(S, b);
      if (e.open) continue;
      for (const i of e.list) for (const ni of [i - 1, i + 1, i - Wd, i + Wd]) {
        if (e.set.has(ni) || set.has(ni) || !w.block[ni]) continue;
        const o = W.objAt(w, ni);
        if (!o || (o.k !== 'tree' && o.k !== 'rock')) continue;
        if ([ni - 1, ni + 1, ni - Wd, ni + Wd].some((nj) => !e.set.has(nj) && free(nj))) set.add(ni);
      }
    }
    guardSet = set;
    return set;
  };
  // como fica com a cerca marcada pronta (para avisar o jogador enquanto ele marca)
  K.enclPlanned = function (S, b) {
    const w = S.world, save = w.fence;
    const both = new Uint8Array(save.length);
    for (let i = 0; i < save.length; i++) both[i] = save[i] || w.fenceJob[i] ? 1 : 0;
    w.fence = both;
    try { return flood(S, b); } finally { w.fence = save; }
  };

  // ---------- movimento da criação ----------
  function tileFree(S, i, pen) {
    const w = S.world;
    return !w.block[i] && !G.IS_WATER[w.tile[i]] && !(w.fence && w.fence[i]) && !(w.bwall && w.bwall[i]) && (w.bgrid[i] < 0 || (pen && w.bgrid[i] === pen.id)) && !Sim().isCamp(S, i);
  }
  function setPath(a, path) { a.path = path && path.length ? path : null; a.pathI = 0; }
  function moveAnimal(S, a, dt, speed) {
    const w = S.world;
    let budget = dt / C.WALK_MIN_PER_TILE * speed, guard = 0;
    while (budget > 1e-6 && a.path && a.pathI < a.path.length && guard++ < 24) {
      const idx = a.path[a.pathI];
      if (w.block[idx] || (w.fence && w.fence[idx]) || (w.bwall && w.bwall[idx])) { a.path = null; break; }
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1);
      const can = budget / cost;
      if (d > 1e-6) { if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 2 : 3; else a.dir = dy > 0 ? 0 : 1; }
      if (d <= can) { a.x = tx; a.y = ty; budget -= d * cost; a.pathI++; a.walk += d; }
      else { a.x += dx / d * can; a.y += dy / d * can; a.walk += can; budget = 0; }
    }
    if (a.path && a.pathI >= a.path.length) a.path = null;
  }
  // para onde vai: de noite (ou com chuva) para dentro do curral; de dia, pasta na área cercada ou em volta do curral
  function wanderTarget(S, a, pen) {
    const w = S.world, hr = S.ck.hour;
    const home = pen || null;
    if (home && (hr >= 19 || hr < 6 || S.precip || (G.Narr && (G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade'))))) {
      const here = Math.floor(a.y) * w.W + Math.floor(a.x);
      if (w.bgrid[here] === home.id) return -1;   // já está dentro: fica
      const sp = penSpot(S, home);
      return Math.floor(sp.y) * w.W + Math.floor(sp.x);
    }
    if (home) {
      const e = K.encl(S, home);
      if (!e.open) {
        for (let k = 0; k < 8; k++) { const i = e.list[rint(S, 0, e.list.length - 1)]; if (tileFree(S, i, home)) return i; }
        return -1;
      }
    }
    const cx = home ? home.x + 1 : S.camp.x + 1, cy = home ? home.y + 1 : S.camp.y + 1, R = home ? C.CRIA_ROAM : 6;
    for (let k = 0; k < 8; k++) {
      const x = cx + rint(S, -R, R), y = cy + rint(S, -R, R);
      if (x < 2 || y < 2 || x >= w.W - 2 || y >= w.H - 2) continue;
      const i = y * w.W + x;
      if (tileFree(S, i, home)) return i;
    }
    return -1;
  }
  K.step = function (S, dt) {
    const c = S.campo;
    if (!c || !c.bichos.length) return;
    const w = S.world;
    for (const a of c.bichos) {
      a.px = a.x; a.py = a.y;
      const d = C.CRIA[a.sp];
      if (a.path) { moveAnimal(S, a, dt, d.speed); continue; }
      a.wait -= dt;
      if (a.wait > 0) continue;
      a.wait = rint(S, 40, 150);
      const pen = a.pen ? Sim().building(S, a.pen) : null;
      const goal = wanderTarget(S, a, pen && pen.built ? pen : null);
      if (goal < 0) continue;
      const here = Math.floor(a.y) * w.W + Math.floor(a.x);
      if (goal === here) continue;
      setPath(a, W.findPath(w, here, goal, 70, 2));
    }
  };

  // ---------- quando uma obra fica pronta ou sai ----------
  K.onBuilt = function (S, b) {
    const Sm = Sim(), first = !S.buildings.some((x) => x !== b && x.built && x.type === b.type);
    if (b.type === 'roca') {
      farmOf(b);
      if (first) Sm.toast(S, 'Roça pronta. Suba Roça nas Vontades: o povo planta, capina e colhe. Toque na roça para escolher o que plantar.', 'good');
      else Sm.toast(S, 'Roça pronta.');
      return true;
    }
    if (b.type === 'curral') {
      penOf(b);
      const c = S.campo;
      if (first) {
        Sm.toast(S, 'Curral pronto. Dizem que um mascate passa por estas terras trocando bichos de criação.', 'good');
        if (!c.mascateAt || c.mascateAt > S.t + C.MASCATE_FIRST_D[1] * DAY()) c.mascateAt = S.t + rint(S, C.MASCATE_FIRST_D[0], C.MASCATE_FIRST_D[1]) * DAY();
      } else Sm.toast(S, 'Curral pronto.');
      // bichos soltos (sem curral) vão para o curral novo
      for (const a of c.bichos) if (!a.pen || !Sm.building(S, a.pen)) { if (K.room(S, b) >= C.CRIA[a.sp].size) { a.pen = b.id; a.wait = 0; } }
      return true;
    }
    return false;
  };
  K.onRemoved = function (S, b) {
    K.wallMark(S, b, false);
    if (b.type === 'roca' && b.farm && b.farm.pile > 0) { S.stock[b.farm.pileK] = (S.stock[b.farm.pileK] || 0) + b.farm.pile; b.farm.pile = 0; }
    if (b.type === 'curral' && S.campo) {
      const pe = b.pen || {};
      S.stock.ovos += Math.floor(pe.ovos || 0); S.stock.leite += Math.floor(pe.leite || 0); S.stock.fibra += Math.floor(pe.la || 0);
      for (const a of S.campo.bichos) if (a.pen === b.id) { const o = bestPen(S, C.CRIA[a.sp].size); a.pen = o && o !== b ? o.id : 0; a.wait = 0; }
    }
    encCache.delete(b.id);
  };

  // ---------- hora, dia ----------
  K.hourly = function (S) {
    const c = S.campo;
    if (!c) return;
    if (S.resumido) return;   // dia resumido (jogo fechado): a roça e o curral ficam como estavam; o que rendem entra pela média
    // a roça cresce (e o mato aparece no meio do caminho)
    const Sm = Sim();
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (f.st !== 'crescendo' || !C.ROCA[f.k]) continue;
      f.grow += K.rate(S, f.k) / 24;
      if (!f.mato && !f.weeded && f.grow >= C.ROCA_WEED_AT) f.mato = S.t;
      if (f.grow >= 1) {
        f.grow = 1; f.st = 'madura'; f.ripeAt = S.t;
        if (!(S.vontades.roca | 0) && !f.told) { f.told = 1; Sm.toast(S, 'A roça de ' + C.ROCA[f.k].name.toLowerCase() + ' madurou. Suba Roça nas Vontades para colher.', 'warn'); }
      }
    }
    if (S.safe) return;
    // de noite: o lobo leva bicho de curral aberto; a onça pula até a cerca
    const hr = S.ck.hour, night = hr >= 20 || hr < 5, Nr = G.Narr;
    if (night && Nr && c.bichos.length) {
      const wolves = Nr.wolvesOut(S), onca = Nr.is(S, 'onca');
      for (const b of K.pens(S)) {
        const pe = penOf(b);
        if (pe.lostDay === S.ck.day + (hr < 5 ? -1 : 0)) continue;   // uma perda por curral por noite
        const animals = K.animalsOf(S, b);
        if (!animals.length) continue;
        let who = null;
        if (wolves && !K.enclosed(S, b) && S.rng.chance(C.CRIA_WOLF_H)) who = 'lobos';
        else if (onca && S.rng.chance(C.CRIA_ONCA_H)) who = 'onca';
        if (!who) continue;
        const prey = animals.filter((a) => a.sp !== 'gado' || who === 'onca');
        if (!prey.length) continue;
        const a = prey[rint(S, 0, prey.length - 1)];
        removeAnimal(S, a);
        pe.lostDay = S.ck.day + (hr < 5 ? -1 : 0);
        S.stats.criaLost++;
        const nm = C.CRIA[a.sp].art;
        if (who === 'lobos') {
          if (!S.stats.wolfPen) { S.stats.wolfPen = true; Sm.chron(S, 'Os lobos levaram ' + nm + ' do curral aberto. Cerca fechada guarda a criação.'); }
          else Sm.toast(S, 'Os lobos levaram ' + nm + ' do curral.', 'bad');
        } else Sm.toast(S, 'A onça pulou a cerca e levou ' + nm + ' do curral.', 'bad');
        S.events.push({ k: 'penLoss', x: b.x + 1.5, y: b.y + 1.5, sp: a.sp });
      }
    }
    // o mascate
    mascateTick(S);
  };
  // depois dos dias resumidos do jogo fechado: roça que ficou parada crescendo e que o inverno não deixa seguir volta a
  // ser terra lavrada (sem a geada levar a culpa); a madura e a mandioca esperam quem colha
  K.afterRest = function (S) {
    if (!S.campo) return;
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (f.st === 'crescendo' && f.k !== 'mandioca' && S.ck.season === 3) Object.assign(f, { st: 'vazia', k: null, grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, wk: null });
      else if (f.st === 'madura') f.ripeAt = S.t;   // o prazo de passar do ponto conta de agora
      else if (f.mato && !f.weeded) f.mato = S.t;
    }
  };
  K.daily = function (S) {
    const c = S.campo;
    if (!c) return;
    // descobertas do campo pela prática (a mais madura, uma por dia)
    if (S.tech && S.tech.whoCampo) {
      let best = null, br = 1;
      for (const id of K.ORDER) {
        if (!K.isOpen(S, id)) continue;
        const r = (S.tech.prat[id] || 0) / K.need(id);
        if (r >= br) { br = r; best = id; }
      }
      if (best && S.rng.chance(C.DISC_DAILY)) K.invent(S, best, null, 'pratica');
    }
    if (S.resumido) return;   // dia resumido: nada de mato, geada, cria ou ração (veja K.hourly)
    const Sm = Sim(), winter = S.ck.season === 3;
    // roças: mato que tomou conta, colheita passando do ponto, geada
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (!f.k) continue;
      const d = C.ROCA[f.k], nm = d.name.toLowerCase();
      if (f.st === 'crescendo') {
        if (winter && f.k !== 'mandioca') {
          Object.assign(f, { st: 'vazia', k: null, grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, wk: null });
          if (!S.stats.frost) { S.stats.frost = true; Sm.chron(S, 'A geada queimou a roça de ' + nm + ' que não deu tempo de colher. No inverno só a mandioca aguenta.'); }
          else Sm.toast(S, 'A geada queimou a roça de ' + nm + '.', 'bad');
          continue;
        }
        if (f.mato && !f.weeded && !f.matoLost && S.t - f.mato >= C.ROCA_WEED_DAYS * DAY()) {
          f.matoLost = true; f.lost = Math.min(0.95, (f.lost || 0) + C.ROCA_WEED_LOSS);
          Sm.toast(S, 'O mato tomou conta da roça de ' + nm + ': vai render menos. Capinar é trabalho da Vontade Roça.', 'warn');
        }
      } else if (f.st === 'madura') {
        const over = (S.t - f.ripeAt) / DAY() - d.ripe;
        if (over > 0) {
          f.lost = Math.min(1, (f.lost || 0) + (winter && f.k !== 'mandioca' ? 0.25 : C.ROCA_SPOIL_DAY));
          if (f.lost >= 0.95) {
            Object.assign(f, { st: 'vazia', k: null, grow: 0, mato: 0, weeded: false, lost: 0, bonus: 1, wk: null });
            Sm.toast(S, 'A roça de ' + nm + ' passou do ponto e se perdeu no pé.', 'bad');
          }
        }
      }
      f.matoLost = f.st === 'crescendo' ? f.matoLost : false;
    }
    if (!S.safe) raids(S);
    // criação: crias, ovos, leite, lã, ração
    const byPen = new Map();
    for (const a of c.bichos) { if (!byPen.has(a.pen)) byPen.set(a.pen, []); byPen.get(a.pen).push(a); }
    for (const b of K.pens(S)) {
      const pe = penOf(b), animals = byPen.get(b.id) || [];
      if (!animals.length) { pe.hungry = 0; continue; }
      const by = {};
      for (const a of animals) (by[a.sp] || (by[a.sp] = [])).push(a);
      // ovos e leite (o leite de ontem azeda no curral; a lã sai na tosquia, no começo da primavera)
      const galinhas = (by.galinha || []).filter((a) => a.sex === 'F').length, vacas = (by.gado || []).filter((a) => a.sex === 'F').length;
      pe.ovos = Math.min(40, pe.ovos + galinhas * C.CRIA.galinha.ovos * (winter ? 0.4 : 1));
      pe.leite = vacas * C.CRIA.gado.leite * (winter ? 0.5 : 1);
      if (S.ck.season === 0 && S.ck.dos === 1 && by.ovelha) pe.la = Math.min(60, pe.la + by.ovelha.length * C.CRIA.ovelha.la);
      // ração: no inverno o pasto some
      if (winter) {
        const need = feedNeed(S, b);
        if (pe.feed >= need) { pe.feed -= need; pe.hungry = 0; }
        else {
          pe.feed = 0; pe.hungry++;
          if (pe.hungry >= C.CRIA_HUNGRY_DAYS && !S.safe) {
            const weak = animals.slice().sort((x, y) => C.CRIA[y.sp].size - C.CRIA[x.sp].size || x.born - y.born)[0];
            removeAnimal(S, weak);
            S.stats.criaLost++;
            pe.hungry = C.CRIA_HUNGRY_DAYS - 2;
            Sm.toast(S, C.CRIA[weak.sp].art.replace(/^u/, 'U') + ' morreu de fome no curral. No inverno os bichos pedem ração: milho, abóbora ou mandioca (Vontade Criação).', 'bad');
          }
        }
      } else pe.hungry = 0;
      // crias (fora do inverno), se há macho e fêmea e lugar no curral
      if (winter) continue;
      let load = animals.reduce((s, a) => s + C.CRIA[a.sp].size, 0);
      const cap = K.cap(S, b);
      for (const sp of C.CRIA_ORDER) {
        const list = by[sp];
        if (!list || !list.some((a) => a.sex === 'M') || !list.some((a) => a.sex === 'F')) continue;
        const d = C.CRIA[sp], last = pe.births[sp] === undefined ? -1e9 : pe.births[sp];
        if (S.ck.day - last < d.birth) continue;
        const n = Math.min(d.litter, Math.floor((cap - load) / d.size + 1e-9));
        if (n <= 0) continue;
        pe.births[sp] = S.ck.day;
        for (let i = 0; i < n; i++) {
          const sp2 = penSpot(S, b);
          spawnAnimal(S, sp, S.rng.chance(0.5) ? 'M' : 'F', b, sp2.x, sp2.y);
          load += d.size;
        }
        S.stats.criaBorn += n;
        const bornBy = S.stats.criaBornBy || (S.stats.criaBornBy = {});
        bornBy[sp] = (bornBy[sp] || 0) + n;
        if (bornBy[sp] === n) Sm.chron(S, (n > 1 ? 'Nasceram as primeiras crias' : 'Nasceu a primeira cria') + ' de ' + d.name.toLowerCase() + ' no curral.');
      }
    }
    // bichos sem curral procuram um com lugar
    for (const a of c.bichos) if (!a.pen || !Sm.building(S, a.pen)) { const o = bestPen(S, C.CRIA[a.sp].size); a.pen = o ? o.id : 0; }
    // cercado (missão)
    if (!S.stats.enclosed) for (const b of S.buildings) if ((b.type === 'roca' || b.type === 'curral') && b.built && K.enclosed(S, b)) { S.stats.enclosed = true; break; }
  };

  // bicho do mato come roça aberta (ou fechada com o bando do lado de dentro); criação solta cisca a roça do lado
  const RAIDERS = ['capivara', 'porco', 'veado', 'anta', 'tapiti'];
  function raids(S) {
    const Sm = Sim(), fa = S.fauna;
    const loose = K.pens(S).filter((b) => K.animalsOf(S, b).length && !K.enclosed(S, b));
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (!f.k || (f.st !== 'crescendo' && f.st !== 'madura') || (f.st === 'crescendo' && f.grow < 0.3) || f.lost >= C.ROCA_RAID_MAX) continue;   // semente recém-plantada não atrai
      if (f.raidDay !== undefined && S.ck.day - f.raidDay < C.ROCA_RAID_GAP) continue;   // depois de um estrago, uns dias de sossego
      const e = K.encl(S, b), cx = b.x + 1.5, cy = b.y + 1.5, nm = C.ROCA[f.k].name.toLowerCase();
      let by = null;
      if (fa) for (const h of fa.herds) {
        if (RAIDERS.indexOf(h.sp) < 0 || Math.hypot(h.x - cx, h.y - cy) > C.ROCA_RAID_R) continue;
        if (!e.open && !e.set.has(h.y * S.world.W + h.x)) continue;   // o bando está do lado de fora da cerca
        const alive = fa.ents.filter((x) => x.h === h.id && x.state !== 'morta' && !x.gone && !x.hidden);
        if (!alive.length || !S.rng.chance(C.ROCA_RAID_DAY)) continue;
        by = C.BICHOS[h.sp];
        if (G.Fauna && G.Fauna.raid) G.Fauna.raid(S, alive[0], b);   // um deles vai até a roça
        break;
      }
      let txt = '';
      if (by) txt = (by.name === 'Veado' || by.name === 'Tapiti' ? by.name + 's' : by.name === 'Porco-do-mato' ? 'Porcos-do-mato' : by.name + 's') + ' entraram na roça de ' + nm + ' e comeram parte.';
      else if (e.open) {
        const near = loose.find((p) => Math.hypot(p.x + 1.5 - cx, p.y + 1.5 - cy) <= 9);
        if (near && S.rng.chance(0.12)) { const a = K.animalsOf(S, near)[0]; txt = C.CRIA[a.sp].name + (a.sp === 'gado' ? 's' : 's') + ' soltas no pasto ciscaram a roça de ' + nm + '.'; }
      }
      if (!txt) continue;
      f.lost = Math.min(C.ROCA_RAID_MAX, (f.lost || 0) + C.ROCA_RAID_LOSS);
      f.raidDay = S.ck.day;
      S.stats.raids++;
      if (S.stats.raids === 1) Sm.chron(S, txt + (K.known(S, 'cerca') ? ' Uma cerca em volta resolve.' : ' Se ao menos a roça tivesse cerca…'));
      else if (!f.raidTold) Sm.toast(S, txt + (K.known(S, 'cerca') ? ' Uma cerca em volta resolve.' : ''), 'warn');
      f.raidTold = true;
    }
  }

  // ---------- milagres e Narrador ----------
  K.onChuva = function (S, x, y, days) {
    let n = 0;
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (f.st !== 'crescendo' || Math.hypot(b.x + 1.5 - x, b.y + 1.5 - y) > C.CHUVA_R) continue;
      f.grow = Math.min(0.999, f.grow + (days || C.ROCA_CHUVA_D) / C.ROCA[f.k].days);   // Céu Generoso (Etapa 11): 3 dias
      n++;
    }
    return n;
  };
  K.onFartura = function (S) { for (const b of K.rocas(S)) { const f = farmOf(b); if (f.st === 'crescendo') f.bonus = Math.max(f.bonus || 1, C.ROCA_FARTURA); } };
  // Etapa 11: a Bênção sobre a roça plantada faz a colheita render metade a mais
  K.onBencao = function (S, x, y, r) {
    let n = 0;
    for (const b of K.rocas(S)) {
      const f = farmOf(b);
      if (!f.k || Math.hypot(b.x + 1.5 - x - 0.5, b.y + 1.5 - y - 0.5) > r + 1.5) continue;
      f.bonus = Math.max(f.bonus || 1, C.BENCAO_MULT);
      n++;
    }
    return n;
  };
  // praga: gafanhotos numa roça que está crescendo (a de maior colheita)
  K.growing = (S) => K.rocas(S).filter((b) => farmOf(b).st === 'crescendo' && farmOf(b).k !== 'algodao');
  K.pest = function (S) {
    const list = K.growing(S).filter((b) => (b.farm.lost || 0) < 0.5);
    if (!list.length) return '';
    const b = list.sort((x, y) => K.yieldOf(S, y) - K.yieldOf(S, x))[0], f = b.farm;
    f.lost = Math.min(0.95, (f.lost || 0) + C.ROCA_PRAGA);
    S.stats.pests = (S.stats.pests || 0) + 1;
    S.events.push({ k: 'praga', x: b.x + 1.5, y: b.y + 1.5 });
    return 'Uma nuvem de gafanhotos baixou na roça de ' + C.ROCA[f.k].name.toLowerCase() + ': metade da colheita se foi.';
  };

  // ---------- mascate: troca bichos de criação ----------
  // o que o povo pode dar sem se apertar (valor de cada coisa, o que guarda)
  function tradable(S) {
    const st = S.stock, out = {}, V = C.TRADE_VALUE, keep = C.TRADE_KEEP, Te = T();
    const food = S.ctx ? S.ctx.foodDays : 0;
    for (const k in V) {
      let have = st[k] || 0;
      if (k === 'ferramentas') have -= Math.max(keep.ferramentas, Te.toolTarget ? Te.toolTarget(S) : 3);
      else if (k === 'roupas') have -= Te.needClothes ? Te.needClothes(S) : 0;
      else if (k === 'mantas' || k === 'redes') have -= G.Obras ? Math.max(0, k === 'mantas' ? G.Obras.needMantas(S) + st.mantas : G.Obras.needRedes(S) + st.redes) : 0;
      else if (keep[k] !== undefined) have -= keep[k];
      else if (Te.FOOD.indexOf(k) >= 0) have = food >= 20 ? Math.floor(have / 2) : 0;   // comida: só com folga, e no máximo a metade
      if (have > 0) out[k] = Math.floor(have);
    }
    return out;
  }
  K.payFor = function (S, price) {
    const av = tradable(S), V = C.TRADE_VALUE;
    // Etapa 12: o que brilha (prata, ouro, pedra preciosa) é a moeda: paga-se primeiro com ela
    const coin = { gemas: 3, ouro: 2, prata: 1 };
    const keys = Object.keys(av).sort((a, b) => (coin[b] || 0) - (coin[a] || 0) || av[b] * V[b] - av[a] * V[a]);
    const pay = {};
    let left = price;
    for (const k of keys) {
      if (left <= 1e-9) break;
      const n = Math.min(av[k], Math.ceil(left / V[k] - 1e-9));
      if (n <= 0) continue;
      pay[k] = n; left -= n * V[k];
    }
    return left > 1e-9 ? null : pay;
  };
  K.canPay = (S, pay) => !!pay && Object.keys(pay).every((k) => (S.stock[k] || 0) >= pay[k]);
  K.pay = function (S, pay) { for (const k in pay) S.stock[k] -= pay[k]; };
  const WORD = { couro: ['couro', 'couros'], ferramentas: ['ferramenta', 'ferramentas'], roupas: ['roupa de couro', 'roupas de couro'], mantas: ['manta', 'mantas'],
    redes: ['rede de dormir', 'redes de dormir'], tabuas: ['tábua', 'tábuas'], defumado: ['de defumado', 'de defumado'], seca: ['de fruta seca', 'de fruta seca'],
    feijao: ['de feijão', 'de feijão'], milho: ['de milho', 'de milho'], abobora: ['abóbora', 'abóboras'], mandioca: ['de mandioca', 'de mandioca'],
    prata: ['de prata', 'de prata'], ouro: ['de ouro', 'de ouro'], gemas: ['pedra preciosa', 'pedras preciosas'], joias: ['joia', 'joias'],
    fibra: ['de fibra', 'de fibra'], carne: ['de carne', 'de carne'], peixe: ['peixe', 'peixes'], argila: ['de argila', 'de argila'], pedra: ['de pedra', 'de pedra'], madeira: ['de madeira', 'de madeira'] };
  K.payText = function (pay) {
    const parts = Object.keys(pay).map((k) => pay[k] + ' ' + (WORD[k] ? WORD[k][pay[k] === 1 ? 0 : 1] : k));
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1] : parts[0] || 'nada';
  };
  // a oferta: a primeira espécie que o povo ainda não tem (se couber no curral e der para pagar); tendo todas, a mais rara
  K.offer = function (S) {
    if (!K.pens(S).length) return null;
    const have = {};
    for (const a of S.campo.bichos) have[a.sp] = (have[a.sp] || 0) + 1;
    const missing = C.CRIA_ORDER.filter((sp) => !have[sp]);
    const cands = missing.length ? missing : C.CRIA_ORDER.slice().sort((a, b) => (have[a] || 0) - (have[b] || 0));
    for (const sp of cands) {
      const [m, f, price] = C.MASCATE_OFFER[sp], d = C.CRIA[sp];
      if (!bestPen(S, d.size * (m + f))) continue;
      const pay = K.payFor(S, price);
      if (!pay) continue;
      return { sp, m, f, price, pay };
    }
    return null;
  };
  function mascateTick(S) {
    const c = S.campo, hr = S.ck.hour;
    if (!c.mascateAt || S.t < c.mascateAt || hr < 8 || hr >= 15 || S.ck.season === 3 || !K.known(S, 'criacao') || !K.pens(S).length) return;
    const Nr = G.Narr;
    if (!Nr || !Nr.spawnMascate || Nr.pending(S) || (S.narr && Object.keys(S.narr.groups).length) || Nr.beastsOut(S)) { c.mascateAt = S.t + 6 * 60; return; }
    const off = K.offer(S);
    if (!off) {
      c.mascateAt = S.t + 5 * DAY();
      if (!c.poorTold) { c.poorTold = true; Sim().toast(S, 'Um mascate passou longe: o povo não tinha o que trocar, ou o curral estava cheio. Ele troca por couro, ferramentas, tábuas, mantas e comida guardada.', 'warn'); }
      return;
    }
    if (!Nr.spawnMascate(S, off)) { c.mascateAt = S.t + 12 * 60; return; }
    c.mascates++;
    const all = C.CRIA_ORDER.every((sp) => K.herd(S, sp) > 0 || sp === off.sp);
    const gap = all ? C.MASCATE_LATER_D : C.MASCATE_D;
    c.mascateAt = S.t + rint(S, gap[0], gap[1]) * DAY();
  }
  // o mascate chegou e o povo aceitou: paga e recebe (x, y: onde ele está)
  K.trade = function (S, offer, x, y) {
    if (!K.canPay(S, offer.pay) || !bestPen(S, C.CRIA[offer.sp].size)) return false;
    K.pay(S, offer.pay);
    K.receive(S, offer, x, y);
    S.stats.trades = (S.stats.trades || 0) + 1;
    return true;
  };

  // ---------- o que aparece quando o jogador toca ----------
  K.info = function (S, a) {
    const d = C.CRIA[a.sp], nm = K.nameOf(a);
    const give = a.sp === 'galinha' ? (a.sex === 'F' ? 'Põe ovos' : 'Canta de madrugada') : a.sp === 'gado' ? (a.sex === 'F' ? 'Dá leite' : 'Puxa a cria') :
      a.sp === 'ovelha' ? 'Dá lã na tosquia da primavera' : a.sp === 'coelho' ? 'Dá cria depressa, e carne com pele' : 'Engorda com as sobras e dá muita carne';
    const pen = a.pen ? Sim().building(S, a.pen) : null;
    const where = pen ? (K.enclosed(S, pen) ? ' Vive num curral cercado.' : ' Vive num curral aberto: de noite o lobo pode levar.') : ' Está sem curral.';
    return nm + '. ' + give + '. No abate rende ' + d.carne + ' de carne' + (d.couro ? ' e ' + d.couro + ' de couro' : '') + '.' + where;
  };

  // ---------- metas ----------
  K.missions = function (phase) {
    if (phase === 4) return [
      { id: 'c_roca', text: 'Colha a primeira roça', opt: true, reward: 6, done: false },
      { id: 'c_cinco', text: 'Colha as cinco culturas', opt: true, reward: 10, done: false },
      { id: 'c_curral', text: 'Tenha 10 bichos de criação', opt: true, reward: 8, done: false },
      { id: 'c_cerca', text: 'Cerque uma roça ou um curral', opt: true, reward: 6, done: false },
    ];
    return [];
  };
  K.goalTest = {
    c_roca: (S) => (S.stats.harvests || 0) > 0,
    c_cinco: (S) => C.ROCA_ORDER.every((k) => ((S.stats.harvestBy || {})[k] || 0) > 0),
    c_curral: (S) => K.herd(S) >= 10,
    c_cerca: (S) => !!S.stats.enclosed,
  };
})(globalThis.G = globalThis.G || {});
