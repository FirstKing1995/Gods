/* Gods · Narrador (Etapa 4). Um diretor lê o mundo todo dia e escolhe o próximo acontecimento,
   para a tensão andar numa curva: mundo calmo e farto puxa aperto; perda recente puxa respiro;
   nunca dois desastres grandes seguidos.
   Desastres: nevasca, seca, lobos e tempestade. Alívios: fartura, piracema e andarilho.
   Fixo: no 18º aniversário do primogênito chega um segundo casal pedindo abrigo.
   Lobos e viajantes são entidades simples: andam por caminhos e só entram no povo quando acolhidos. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U, W = G.W;
  const N = G.Narr = {};
  const Sim = () => G.Sim, Fam = () => G.Family;
  const D = () => C.DAY_MIN;

  N.EVENTS = {
    nevasca: { name: 'Nevasca', bad: true, big: true, icon: 'neve' },
    seca: { name: 'Seca', bad: true, big: true, icon: 'seca' },
    lobos: { name: 'Lobos', bad: true, big: true, icon: 'lobo' },
    tempestade: { name: 'Tempestade', bad: true, big: false, icon: 'chuva' },
    fartura: { name: 'Fartura', bad: false, icon: 'frutas' },
    piracema: { name: 'Piracema', bad: false, icon: 'peixe' },
    andarilho: { name: 'Andarilho', bad: false, icon: 'pessoa' },
    veranico: { name: 'Veranico', bad: false, icon: 'verao' },
    mel: { name: 'Mel', bad: false, icon: 'mel' },
    onca: { name: 'Onça', bad: true, big: true, icon: 'onca' },   // Etapa 9
    praga: { name: 'Praga', bad: true, big: false, icon: 'praga' },   // Etapa 10: gafanhotos na roça
  };
  const WARN = {
    nevasca: 'O céu fechou no norte e o vento esfriou. Amanhã vem nevasca: juntem lenha e fiquem perto do fogo.',
    lobos: 'Uivos na mata. Esta noite, todos perto do fogo.',
    tempestade: 'O vento mudou e o céu escureceu. Vem tempestade.',
    onca: 'Pegadas de onça perto do acampamento. De noite, ninguém sozinho no escuro.',
  };
  const SAY = { nevasca: 'Vem nevasca…', lobos: 'Ouviu isso? Lobos.', tempestade: 'Vem água aí.', onca: 'Olha o tamanho dessas pegadas… onça.' };

  N.kind = (S) => C.NARRADORES[S && S.narr && S.narr.kind] || C.NARRADORES[C.NARR_DEFAULT];
  N.is = (S, k) => !!(S.narr && S.narr.active[k]);
  function alive(S) { return S.people.filter((p) => p.alive); }
  function rint(S, a, b) { return S.rng.int(a, b); }
  function rr(S, ab) { return ab[0] + (ab[1] - ab[0]) * S.rng.next(); }
  function camp(S) { return { x: S.camp.x + 1, y: S.camp.y + 1 }; }

  // ---------- estado ----------
  N.init = function (S) {
    const n = S.narr || (S.narr = {});
    if (!C.NARRADORES[n.kind]) n.kind = C.NARR_DEFAULT;
    if (n.nextBad === undefined) n.nextBad = null;
    if (n.nextGood === undefined) n.nextGood = null;
    if (n.plan === undefined) n.plan = null;
    n.active = n.active || {};
    n.ents = n.ents || [];
    n.groups = n.groups || {};
    n.nextEnt = n.nextEnt || 1;
    n.counts = n.counts || {};
    n.log = n.log || [];
    if (n.lastBad === undefined) n.lastBad = null;
    if (n.lastGood === undefined) n.lastGood = null;
    if (n.couple === undefined) n.couple = null;
    for (const e of n.ents) { if (e.px === undefined) { e.px = e.x; e.py = e.y; } }
    // saves antigos: se alguém nascido aqui já passou dos 18, o segundo casal vem logo
    if (!n.couple) {
      const first = S.people.filter((p) => p.alive && (p.mother || p.father) && Fam().age(S, p) >= 18).sort((a, b) => a.born - b.born)[0];
      if (first) N.onAdult(S, first, true);
    }
  };
  N.setKind = function (S, kind) {
    if (!C.NARRADORES[kind] || !S.narr) return false;
    S.narr.kind = kind;
    return true;
  };

  // ---------- efeitos no mundo (consultados pela simulação e pela IA) ----------
  N.tempMod = function (S) {
    const a = S.narr && S.narr.active;
    if (!a) return 0;
    let m = 0;
    if (a.nevasca) m += C.NEVASCA_COLD * N.kind(S).sev;
    if (a.seca) m += C.SECA_HEAT;
    if (a.tempestade) m += C.TEMPESTADE_COLD;
    if (a.veranico) m += C.VERANICO_HEAT;
    return m;
  };
  // undefined: o clima de sempre decide
  N.precip = function (S) {
    const a = S.narr && S.narr.active;
    if (!a) return undefined;
    if (a.nevasca) return 'neve';
    if (a.tempestade) return 'chuva';
    if (a.seca && !(S.god && S.god.rainUntil > S.t)) return null;
    return undefined;
  };
  N.walkMult = (S) => (N.is(S, 'nevasca') ? C.NEVASCA_WALK : 1);
  N.fireMult = (S) => (N.is(S, 'nevasca') ? C.NEVASCA_FIRE : 1);
  N.thirstMult = (S) => (N.is(S, 'seca') ? C.SECA_THIRST : 1);
  N.waterMult = (S) => (N.is(S, 'seca') ? C.SECA_WATER : 1);
  N.fishMult = (S) => (N.is(S, 'seca') ? C.SECA_FISH : N.is(S, 'nevasca') ? C.NEVASCA_FISH : N.is(S, 'piracema') ? C.PIRACEMA_FISH : 1);
  N.workMult = (S, wk) => (wk === 'fogo' ? 1 : N.is(S, 'nevasca') ? C.NEVASCA_WORK : N.is(S, 'tempestade') ? 0.5 : N.beastsOut(S) ? 0.3 : 1);
  // noite de lobos ou de onça (avisada ou já começada): o fogo tem de ficar aceso
  N.wantFire = (S) => { const n = S.narr; return !!(n && ((n.plan && (n.plan.k === 'lobos' || n.plan.k === 'onca') && n.plan.warned) || n.active.lobos || n.active.onca || N.beastsOut(S))); };
  N.bushMult = (S) => (N.is(S, 'seca') ? 0 : N.is(S, 'fartura') ? 2 : 1);

  // ---------- o diretor ----------
  N.daily = function (S) {
    const n = S.narr;
    if (!n) return;
    // seca: os arbustos murcham
    if (n.active.seca) for (const o of S.world.objs) if (o.k === 'bush' && !o.holy && o.fruit > 0 && S.rng.chance(C.SECA_WILT)) o.fruit--;
    if (S.safe) return;   // com o jogo fechado o Narrador descansa
    decide(S);
  };
  function busy(S) {
    const n = S.narr;
    return !!n.plan || n.ents.length > 0 || Object.keys(n.active).some((k) => N.EVENTS[k] && N.EVENTS[k].bad);
  }
  function calm(S) {
    if (!S.ctx || S.ctx.foodDays < C.NARR_CALM_FOOD) return false;
    return alive(S).every((p) => p.needs.saude >= 70 && !p.prayer);
  }
  // o inverno quase sempre traz nevasca e o verão às vezes traz seca: no começo da estação o diretor marca a janela
  const AIM = { 3: { k: 'nevasca', i: 0, win: 11 }, 1: { k: 'seca', i: 1, win: 8 } };
  function aimSeason(S) {
    const n = S.narr, ck = S.ck, a = AIM[ck.season];
    if (ck.dos !== 1) return;
    n.aim = a && S.rng.chance(N.kind(S).aim[a.i]) ? { k: a.k, day: ck.day + rint(S, 1, a.win - 4), until: ck.day + a.win - 1 } : null;
  }
  function bigOk(S) {
    const last = S.narr.lastBad, k = N.kind(S);
    return !last || !last.big || S.ck.day - last.day >= 2 * k.gap[1];
  }
  function decide(S) {
    const n = S.narr, k = N.kind(S), day = S.ck.day;
    if (n.nextBad === null) n.nextBad = Math.max(day + 3, k.small + rint(S, 0, 4));
    if (n.nextGood === null) n.nextGood = day + rint(S, k.goodGap[0], k.goodGap[1]);
    aimSeason(S);
    if (n.aim && day > n.aim.until) n.aim = null;
    if (busy(S)) return;
    const lossAt = S.stats.lastDeathAt;
    const loss = lossAt !== undefined && S.t - lossAt < C.NARR_LOSS_DAYS * D();
    if (loss) {
      // perda recente: respiro, e um alívio se couber
      n.nextBad = Math.max(n.nextBad, day + 5);
      n.nextGood = Math.min(n.nextGood, day + 1);
    } else if (calm(S) && (!n.lastBad || day - n.lastBad.day >= k.gap[0])) {
      // tudo calmo e farto: o aperto vem mais cedo
      n.nextBad = Math.min(n.nextBad, day);
    }
    // a janela da estação (nevasca, seca) passa na frente, se já faz um tempo desde o último aperto
    if (n.aim && !loss && day >= n.aim.day && day >= k.start && bigOk(S) && !(n.aim.k === 'seca' && N.is(S, 'fartura')) &&
      (!n.lastBad || day - n.lastBad.day >= Math.round(k.gap[0] * 0.6))) {
      const e = { k: n.aim.k, big: true };
      n.aim = null;
      plan(S, e); n.nextBad = day + Math.round(rr(S, k.gap) * 1.15);
      return;
    }
    // silêncio longo (nada do Narrador há k.quiet dias): puxa um alívio; se não houver, um aperto pequeno
    const lastAny = n.log.length ? n.log[n.log.length - 1].day : 0;
    const quiet = S.stats.winters >= 1 && day - lastAny >= k.quiet;
    if (quiet) n.nextGood = Math.min(n.nextGood, day);
    if (day >= n.nextBad && day >= k.small) {
      const e = pickBad(S);
      if (e) { plan(S, e); n.nextBad = day + Math.round(rr(S, k.gap) * (e.big ? 1.15 : 0.85)); return; }
      n.nextBad = day + 1;
    }
    if (day >= n.nextGood && S.stats.winters >= 1) {
      const e = pickGood(S);
      if (e) { plan(S, e); n.nextGood = day + rint(S, k.goodGap[0], k.goodGap[1]); return; }
      n.nextGood = day + 2;
      if (quiet && !loss) {
        const b = pickBad(S, true);
        if (b) { plan(S, b); n.nextBad = Math.max(n.nextBad, day + Math.round(k.gap[0] * 0.6)); }
      }
    }
  }
  function thisSeason(S, key) {
    const s = Math.floor(S.ck.day / C.SEASON_DAYS);
    return S.narr.log.some((e) => e.k === key && Math.floor(e.day / C.SEASON_DAYS) === s);
  }
  function weighted(S, list) {
    let sum = 0;
    for (const c of list) sum += c.w;
    let r = S.rng.next() * sum;
    for (const c of list) { r -= c.w; if (r <= 0) return c; }
    return list[list.length - 1];
  }
  // small: só apertos pequenos (tempestade, ou dois lobos)
  function pickBad(S, small) {
    const n = S.narr, ck = S.ck, k = N.kind(S), last = n.lastBad;
    if (small) {
      const out = [];
      if (ck.season <= 2 && !(last && last.k === 'tempestade' && ck.day - last.day < 6)) out.push({ k: 'tempestade', w: 1, big: false, opts: {} });
      if (alive(S).length >= 2 && ck.day >= k.start && !(last && last.k === 'lobos' && ck.day - last.day < 6)) out.push({ k: 'lobos', w: 1, big: false, opts: { pack: 2 } });
      return out.length ? weighted(S, out) : null;
    }
    // antes do primeiro inverno, só um aperto pequeno (uma tempestade de outono avisa que o mundo tem humor)
    if (ck.day < k.start) return ck.season <= 2 && !(last && last.k === 'tempestade') ? { k: 'tempestade', w: 1, big: false, opts: {} } : null;
    // grande depois de grande, só se já faz tempo
    const big = bigOk(S);
    const out = [];
    const add = (key, w, isBig, opts) => { if (w > 0 && (isBig ? big : true) && (!last || last.k !== key)) out.push({ k: key, w, big: isBig, opts: opts || {} }); };
    if (ck.season === 3 && ck.dos <= 11 && !thisSeason(S, 'nevasca') && !N.is(S, 'veranico')) add('nevasca', 2, true);
    if (ck.season === 1 && ck.dos <= 8 && !thisSeason(S, 'seca') && !N.is(S, 'fartura')) add('seca', 1.5, true);
    if (alive(S).length >= 2) {
      // a matilha cresce com os anos
      let pack = U.clamp(Math.round((2 + Math.floor((ck.year - 1) / 5)) * k.sev), 2, 6);
      // matilha grande só quando pode vir desastre grande e a estação não está guardando a vez da nevasca ou da seca
      if (!big || n.aim) pack = Math.min(pack, 3);
      add('lobos', [1, 0.8, 1.4, 1.2][ck.season], pack >= 4, { pack });
    }
    // Etapa 9: a onça, a partir do segundo ano, no máximo uma vez a cada 60 dias
    if (alive(S).length >= 3 && ck.year >= 2 && !n.log.some((e) => e.k === 'onca' && ck.day - e.day < 60)) add('onca', 0.7, true);
    if (ck.season <= 2) add('tempestade', 1, false);
    // Etapa 10: gafanhotos numa roça que está crescendo (verão e outono, no máximo uma vez a cada 40 dias)
    if (G.Campo && (ck.season === 1 || ck.season === 2) && G.Campo.growing(S).length && !n.log.some((e) => e.k === 'praga' && ck.day - e.day < 40)) add('praga', 0.6, false);
    return out.length ? weighted(S, out) : null;
  }
  function bushesNear(S) {
    const c = camp(S);
    let n = 0;
    for (const o of S.world.objs) if (o.k === 'bush' && Math.hypot(o.x - c.x, o.y - c.y) <= C.FARTURA_R) n++;
    return n;
  }
  function pickGood(S) {
    const n = S.narr, ck = S.ck, last = n.lastGood;
    const out = [];
    if ((ck.season === 1 || ck.season === 2) && !N.is(S, 'seca') && !N.is(S, 'fartura') && bushesNear(S) >= 6 &&
      !n.log.some((e) => e.k === 'fartura' && ck.day - e.day < 40)) out.push({ k: 'fartura', w: 2 });
    // mel: uma colmeia achada no mato (fora do inverno)
    if (ck.season <= 2 && !n.log.some((e) => e.k === 'mel' && ck.day - e.day < C.MEL_DAYS)) out.push({ k: 'mel', w: 1.2 });
    // veranico: uns dias de sol no meio do inverno
    if (ck.season === 3 && ck.dos <= 12 && !N.is(S, 'nevasca') && !(n.plan && n.plan.k === 'nevasca') && !thisSeason(S, 'veranico')) out.push({ k: 'veranico', w: 2 });
    if (ck.season === 0 && ck.dos <= 12 && !N.is(S, 'piracema')) out.push({ k: 'piracema', w: 2 });
    // andarilho: raro (no máximo um a cada ANDARILHO_DAYS) e só enquanto o povo é pequeno
    if (ck.season <= 2 && alive(S).length < C.ANDARILHO_MAX_POP && !Object.keys(n.groups).length &&
      !n.log.some((e) => e.k === 'andarilho' && ck.day - e.day < C.ANDARILHO_DAYS)) out.push({ k: 'andarilho', w: 1 });
    const fresh = out.filter((c) => !last || c.k !== last.k);
    const list = fresh.length ? fresh : out;
    return list.length ? weighted(S, list) : null;
  }
  function plan(S, e) {
    const d0 = Math.floor(S.t / D()) * D();
    const h = (x) => d0 + Math.round(x * 60);
    let warnAt, at;
    switch (e.k) {
      case 'nevasca': warnAt = h(7 + S.rng.next() * 3); at = h(27 + S.rng.next() * 5); break;   // aviso de manhã, começa na madrugada seguinte
      case 'lobos': warnAt = h(18 + S.rng.next()); at = h(20.5 + S.rng.next() * 1.5); break;
      case 'onca': warnAt = h(16 + S.rng.next() * 1.5); at = h(19.5 + S.rng.next()); break;
      case 'tempestade': warnAt = h(10 + S.rng.next() * 3); at = warnAt + 90; break;
      default: warnAt = at = h(7 + S.rng.next() * 4);
    }
    S.narr.plan = { k: e.k, warnAt, at, warned: false, opts: e.opts || {} };
  }
  // o mais velho acordado fala pelo povo
  function voice(S) {
    return alive(S).filter((p) => !p.sleeping && !p.carriedBy && Fam().age(S, p) >= 12).sort((a, b) => a.born - b.born)[0] || null;
  }

  N.hourly = function (S) {
    const n = S.narr;
    if (!n) return;
    const p = n.plan;
    if (p) {
      if (S.safe) { p.warnAt += 60; p.at += 60; }
      else {
        if (!p.warned && S.t >= p.warnAt) {
          p.warned = true;
          if (WARN[p.k]) {
            Sim().toast(S, WARN[p.k], 'warn');
            S.events.push({ k: 'narr', ev: p.k, warn: true });
            const v = voice(S);
            if (v) Sim().say(S, v, SAY[p.k], true);
          }
        }
        if (S.t >= p.at) { n.plan = null; start(S, p.k, p.opts); }
      }
    }
    const c = n.couple;
    if (c && c.state === 'planejado' && S.t >= c.at && !S.safe) {
      const hr = S.ck.hour;
      if (hr >= 8 && hr < 16 && !n.ents.some((e) => e.k === 'lobo')) startCouple(S);
    }
    for (const k of Object.keys(n.active)) {
      if (k !== 'lobos' && k !== 'onca' && S.t >= n.active[k].until) finish(S, k);
    }
  };

  function start(S, k, o) {
    const n = S.narr, ev = N.EVENTS[k], sev = N.kind(S).sev, Sm = Sim(), day = S.ck.day;
    switch (k) {
      case 'nevasca':
        delete n.active.veranico;   // a nevasca acaba com o veranico
        n.active.nevasca = { t0: S.t, until: S.t + Math.round(rr(S, C.NEVASCA_DAYS) * (0.8 + 0.2 * sev) * D()) };
        Sm.chron(S, 'Começou uma nevasca.');
        break;
      case 'seca':
        n.active.seca = { t0: S.t, until: S.t + Math.round(rr(S, C.SECA_DAYS) * (0.8 + 0.2 * sev)) * D() };
        Sm.chron(S, 'Não chove há dias. Começou a seca.');
        break;
      case 'tempestade': {
        n.active.tempestade = { t0: S.t, until: S.t + Math.round(rr(S, C.TEMPESTADE_H) * 60) };
        let out = false;
        for (const b of S.buildings) if (b.type === 'fogueira' && b.built && b.fuel > 0) { b.fuel = 0; out = true; }
        Sm.toast(S, 'Caiu uma tempestade.' + (out ? ' O vento apagou a fogueira.' : ''), 'bad');
        break;
      }
      case 'lobos': {
        const made = spawnWolves(S, o.pack || 2);
        if (!made) return;
        n.active.lobos = { t0: S.t, pack: made, bites: 0, stolen: 0, killed: 0, fought: 0, hurt: [] };
        Sm.toast(S, (made === 2 ? 'Dois lobos rondam' : made + ' lobos rondam') + ' o acampamento!', 'bad');
        break;
      }
      case 'onca': {
        if (!spawnOnca(S)) return;
        const nights = rint(S, C.ONCA_NIGHTS[0], C.ONCA_NIGHTS[1]);
        n.active.onca = { t0: S.t, until: S.t + nights * D() - 3 * 60, bites: 0, hurt: [], fought: 0, killedBy: '' };
        Sm.toast(S, 'Uma onça ronda o acampamento!', 'bad');
        S.events.push({ k: 'roar' });
        break;
      }
      case 'fartura': {
        const c = camp(S);
        for (const b of S.world.objs) if (b.k === 'bush' && Math.hypot(b.x - c.x, b.y - c.y) <= C.FARTURA_R) b.fruit = Math.max(b.fruit, C.BUSH_MAX);
        n.active.fartura = { t0: S.t, until: S.t + C.FARTURA_DAYS * D() };
        Sm.chron(S, 'Os arbustos carregaram como nunca: é tempo de fartura.');
        if (G.Campo) G.Campo.onFartura(S);   // Etapa 10: a roça que está crescendo também rende mais
        for (const p of alive(S)) Sm.addMem(S, p, 'fartura');
        if (G.Life) G.Life.onGood(S, 'fartura');
        break;
      }
      case 'piracema':
        n.active.piracema = { t0: S.t, until: S.t + C.PIRACEMA_DAYS * D() };
        Sm.chron(S, 'Os peixes subiram o rio: é a piracema.');
        if (G.Life) G.Life.onGood(S, 'piracema');
        break;
      case 'veranico':
        n.active.veranico = { t0: S.t, until: S.t + Math.round(rr(S, C.VERANICO_DAYS) * D()) };
        Sm.chron(S, 'Veranico: o sol voltou por uns dias no meio do inverno.');
        break;
      case 'mel': {
        S.stock.frutas += C.MEL_FOOD;
        const v = voice(S);
        Sm.chron(S, (v ? v.name + ' achou' : 'Acharam') + ' uma colmeia no oco de um tronco: mel para vários dias.');
        S.events.push({ k: 'float', x: S.camp.x + 1, y: S.camp.y + 0.6, text: '+' + C.MEL_FOOD + ' comida' });
        for (const p of alive(S)) Sm.addMem(S, p, 'mel');
        if (G.Life) G.Life.onGood(S, 'mel');
        break;
      }
      case 'praga': {
        const txt = G.Campo ? G.Campo.pest(S) : '';
        if (!txt) return;   // a roça foi colhida antes: os gafanhotos passaram longe
        Sm.chron(S, txt);
        break;
      }
      case 'andarilho': {
        const sex = balanceSex(S);
        const g = spawnGroup(S, 'andarilho', [visitorData(S, sex, rint(S, 18, 32), 'so', new Set())]);
        if (!g) return;
        Sm.toast(S, 'Alguém vem pela trilha.', '');
        break;
      }
    }
    const big = ev.bad && (k === 'lobos' ? (o.pack || 2) >= 4 : ev.big);
    n.counts[k] = (n.counts[k] || 0) + 1;
    n.log.push(big ? { day, k, big: 1 } : { day, k });
    if (n.log.length > 80) n.log.splice(0, n.log.length - 80);
    if (ev.bad) n.lastBad = { k, day, big };
    else n.lastGood = { k, day };
    S.events.push({ k: 'narr', ev: k, on: true });
  }

  function finish(S, k) {
    const n = S.narr, a = n.active[k], Sm = Sim();
    if (!a) return;
    delete n.active[k];
    switch (k) {
      case 'nevasca': Sm.chron(S, 'A nevasca passou.'); break;
      case 'seca':
        Sm.chron(S, 'Choveu, enfim. A seca acabou.');
        if (S.god) S.god.rainUntil = Math.max(S.god.rainUntil, S.t + 240);
        break;
      case 'tempestade': Sm.toast(S, 'A tempestade passou.', ''); break;
      case 'fartura': Sm.toast(S, 'A fartura acabou. Os arbustos voltam ao ritmo de sempre.', ''); break;
      case 'piracema': Sm.toast(S, 'A piracema acabou.', ''); break;
      case 'veranico': Sm.toast(S, 'O veranico acabou. O frio voltou.', 'warn'); break;
      case 'lobos': Sm.chron(S, wolvesStory(S, a)); break;
      case 'onca': Sm.chron(S, oncaStory(S, a)); break;
    }
    S.events.push({ k: 'narr', ev: k, on: false });
  }
  function wolvesStory(S, a) {
    const names = a.hurt.map((id) => Fam().person(S, id)).filter(Boolean);
    const did = [];
    if (names.length) did.push('atacaram ' + Sim().listNames(names));
    if (a.stolen) did.push('levaram ' + a.stolen + ' de comida');
    let txt = did.length ? 'Os lobos ' + (did.length > 1 ? did[0] + ' e ' + did[1] : did[0]) + '.' : 'Os lobos rondaram a noite toda, mas o fogo guardou o povo.';
    if (a.killed) txt += a.killed === 1 ? ' Um deles ficou pelo caminho.' : ' ' + a.killed + ' deles ficaram pelo caminho.';
    return txt;
  }
  function oncaStory(S, a) {
    const Sm = Sim(), P = (ids) => (ids || []).map((id) => Fam().person(S, id)).filter(Boolean);
    const hurt = P(a.hurt), hunt = P(a.hunt), pounced = P(a.pounced), out = [];
    if (hurt.length) out.push('A onça atacou ' + Sm.listNames(hurt) + '.');
    if (hunt.length) {
      const fem = pounced.every((q) => q.sex === 'F'), ferid = pounced.length > 1 ? (fem ? ' saíram feridas' : ' saíram feridos') : fem ? ' saiu ferida' : ' saiu ferido';
      out.push((hurt.length ? 'Depois, ' : '') + Sm.listNames(hunt) + ' foram atrás dela na mata' + (pounced.length ? '; ' + Sm.listNames(pounced) + ferid : '') + '.');
    }
    if (a.killedBy === 'raio') out.push('O raio de Deus abateu a onça. O povo ficou com a pele e a carne dela.');
    else if (a.killedBy) out.push(a.killedBy + (hunt.length ? ' deu o golpe final.' : ' enfrentou a onça e venceu.') + ' O povo ficou com a pele e a carne dela.');
    else if (a.escaped) out.push('Ferida, ela escapou e não voltou mais.');
    else if (hurt.length || hunt.length) out.push(a.fought ? 'Ela levou golpes do povo e sumiu na mata.' : 'Ela sumiu na mata.');
    else out.push(a.fought ? 'A onça rondou o acampamento, levou golpes do povo e sumiu na mata.' : 'A onça rondou o acampamento por umas noites, mas ninguém ficou sozinho no escuro.');
    return out.join(' ');
  }

  // uma morte: o aperto que estava para vir fica para depois (respiro)
  const PASSED = { nevasca: 'O vento virou: a nevasca passou longe.', tempestade: 'O céu abriu. A tempestade passou longe.', lobos: 'Os uivos se afastaram.', onca: 'As pegadas da onça seguiram para longe.' };
  N.onDeath = function (S) {
    const n = S.narr;
    if (!n) return;
    const p = n.plan;
    if (p && N.EVENTS[p.k].bad) {
      n.plan = null;
      if (p.warned && PASSED[p.k]) Sim().toast(S, PASSED[p.k], '');
    }
    n.nextBad = Math.max(n.nextBad || 0, S.ck.day + 5);
  };

  // ---------- milagres que o Narrador escuta ----------
  N.onChuva = function (S) {
    const n = S.narr;
    if (!n || !n.active.seca) return '';
    delete n.active.seca;
    Sim().chron(S, 'A chuva de Deus quebrou a seca.');
    for (const p of alive(S)) G.God.faith(S, p, 4);
    S.events.push({ k: 'narr', ev: 'seca', on: false });
    return 'A seca acabou.';
  };
  // killR: até onde o raio abate (o dom do Trovão, na Etapa 11, alcança mais longe)
  N.onRaio = function (S, x, y, killR) {
    const n = S.narr;
    if (!n) return null;
    const cx = x + 0.5, cy = y + 0.5, kr = killR || 1.6;
    // a onça (Etapa 9): o raio abate ou espanta até a noite seguinte
    const onca = n.ents.find((e) => e.k === 'onca' && !e.gone && !e.hidden && Math.hypot(e.x - cx, e.y - cy) < 6);
    if (onca) {
      G.God.answerKind(S, ['onca']);
      G.God.align(S, 2);
      for (const p of alive(S)) if (Math.hypot(p.x - cx, p.y - cy) < 10) { G.God.faith(S, p, 3); Sim().addMem(S, p, 'viuMilagre'); }
      if (Math.hypot(onca.x - cx, onca.y - cy) < kr) {
        onca.gone = true;
        const a = n.active.onca;
        if (a) a.killedBy = 'raio';
        S.stock.carne += C.ONCA_CARNE; S.stock.couro += C.ONCA_COURO;
        S.stats.oncasKilled = (S.stats.oncasKilled || 0) + 1;
        return 'O raio abateu a onça: +' + C.ONCA_CARNE + ' carne e +' + C.ONCA_COURO + ' couro no estoque.';
      }
      toDen(S, onca);
      return 'O trovão espantou a onça para a mata.';
    }
    const wolves = n.ents.filter((e) => e.k === 'lobo' && !e.gone);
    if (!wolves.length) return null;
    let hit = null, bd = kr;
    for (const e of wolves) { const d = Math.hypot(e.x - cx, e.y - cy); if (d < bd) { bd = d; hit = e; } }
    if (!hit && !wolves.some((e) => Math.hypot(e.x - cx, e.y - cy) < 6)) return null;
    const a = n.active.lobos;
    if (hit) { hit.gone = true; if (a) a.killed++; }
    for (const e of wolves) if (!e.gone) goAway(S, e);
    G.God.answerKind(S, ['lobos']);
    G.God.align(S, 2);
    for (const p of alive(S)) if (Math.hypot(p.x - cx, p.y - cy) < 10) { G.God.faith(S, p, 3); Sim().addMem(S, p, 'viuMilagre'); }
    return hit ? 'O raio abateu um lobo. A matilha fugiu.' : 'O trovão espantou os lobos.';
  };

  // ---------- entidades: lobos e viajantes ----------
  function newEnt(S, k, x, y, extra) {
    const n = S.narr;
    const e = Object.assign({ id: n.nextEnt++, k, x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5, dir: 0, walk: 0, path: null, pathI: 0, state: 'vindo', t: 0 }, extra || {});
    n.ents.push(e);
    return e;
  }
  function setPath(e, path) { e.path = path && path.length ? path : null; e.pathI = 0; }
  // um lugar a d tiles do acampamento, de onde dá para chegar andando
  function edgeSpot(S, dmin, dmax) {
    const w = S.world, c = camp(S), campI = S.camp.y * w.W + S.camp.x;
    for (let k = 0; k < 50; k++) {
      const a = S.rng.next() * Math.PI * 2, d = dmin + S.rng.next() * (dmax - dmin);
      const x = Math.round(c.x + Math.cos(a) * d), y = Math.round(c.y + Math.sin(a) * d);
      if (x < 2 || y < 2 || x >= w.W - 2 || y >= w.H - 2) continue;
      const i = y * w.W + x;
      if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]]) continue;
      const path = W.findPath(w, i, campI, 500);
      if (path && path.length) return { x, y, i };
    }
    return null;
  }
  function entMove(S, e, dt, speed, wolf) {
    if (!e.path) return;
    const w = S.world;
    let budget = dt / C.WALK_MIN_PER_TILE * speed * N.walkMult(S), guard = 0;
    while (budget > 1e-6 && e.path && e.pathI < e.path.length && guard++ < 24) {
      const idx = e.path[e.pathI];
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      if (w.block[idx] || (wolf && (w.slow[idx] || (e.k === 'lobo' && w.fence && w.fence[idx]) || (e.state !== 'embora' && repelAt(S, tx, ty))))) { e.path = null; break; }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1);
      const can = budget / cost;
      if (d > 1e-6) { if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? 2 : 3; else e.dir = dy > 0 ? 0 : 1; }
      if (d <= can) { e.x = tx; e.y = ty; budget -= d * cost; e.pathI++; e.walk += d; }
      else { e.x += dx / d * can; e.y += dy / d * can; e.walk += can; budget = 0; }
    }
    if (e.path && e.pathI >= e.path.length) e.path = null;
  }

  N.step = function (S, dt) {
    const n = S.narr;
    if (!n || !n.ents.length) return;
    if (S.safe && n.ents.some((e) => e.k === 'lobo' || e.k === 'onca')) {
      // com o jogo fechado os lobos e a onça vão embora sem ninguém ver
      n.ents = n.ents.filter((e) => e.k !== 'lobo' && e.k !== 'onca');
      if (n.active.lobos) finish(S, 'lobos');
      if (n.active.onca) finish(S, 'onca');
    }
    for (const e of n.ents) {
      if (e.gone) continue;
      e.px = e.x; e.py = e.y;
      if (e.k === 'lobo') wolfStep(S, e, dt); else if (e.k === 'onca') oncaStep(S, e, dt); else visitorStep(S, e, dt);
    }
    n.ents = n.ents.filter((e) => !e.gone);
    for (const gid of Object.keys(n.groups)) {
      const g = n.groups[gid];
      if (g.state !== 'vindo' && g.state !== 'esperando' && !n.ents.some((e) => e.gid === g.id)) delete n.groups[gid];
    }
    if (n.active.lobos && !n.ents.some((e) => e.k === 'lobo')) finish(S, 'lobos');
    if (n.active.onca && !n.ents.some((e) => e.k === 'onca')) finish(S, 'onca');
  };

  // ---------- lobos ----------
  // Sentinela (Etapa 11): o fogo aceso espanta mais longe
  const fireR = (S) => C.LOBO_FIRE_R + (G.Deus && G.Deus.dom(S, 'sentinela') ? C.DOM.sentinelaR : 0);
  N.fireR = fireR;
  function repelAt(S, x, y) {
    const R = fireR(S);
    for (const b of S.buildings) if (b.type === 'fogueira' && b.built && b.fuel > 0 && Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) < R) return true;
    return G.God.heatAt(S, x, y) > 0;
  }
  N.safeXY = repelAt;
  // para onde correr: um tile bem dentro da luz do fogo ou do Calor de Deus (na beirada o lobo ainda alcança)
  N.safeTile = function (S, i) {
    const w = S.world, x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
    const R = fireR(S);
    for (const b of S.buildings) if (b.type === 'fogueira' && b.built && b.fuel > 0 && Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) < R - 0.8) return true;
    if (S.god) for (const a of S.god.auras) if (Math.hypot(a.x + 0.5 - x, a.y + 0.5 - y) < a.r - 0.8) return true;
    if (G.Deus && S.god && S.god.pending) for (const L of G.Deus.lights(S)) if (Math.hypot(L.x - x, L.y - y) < L.r - 0.8) return true;   // a Luz e a estátua do fogo
    return false;
  };
  // a salvo: na barraca, no colo, perto do fogo aceso ou dentro do Calor de Deus
  N.safeSpot = function (S, p) { return !!(p.inTent || p.carriedBy || repelAt(S, p.x, p.y)); };
  N.wolvesOut = (S) => !!(S.narr && S.narr.ents.some((e) => e.k === 'lobo' && e.state !== 'embora'));
  N.wolvesNear = (S, x, y, r) => !!(S.narr && S.narr.ents.some((e) => e.k === 'lobo' && e.state !== 'embora' && Math.hypot(e.x - x, e.y - y) < r));
  // Etapa 9: feras por perto (lobos, ou a onça fora da toca)
  const prowling = (e) => (e.k === 'lobo' && e.state !== 'embora') || (e.k === 'onca' && e.state !== 'embora' && e.state !== 'toca');
  N.oncaOut = (S) => !!(S.narr && S.narr.ents.some((e) => e.k === 'onca' && prowling(e)));
  N.beastsOut = (S) => !!(S.narr && S.narr.ents.some(prowling));
  // perigo para a IA: lobo (ou onça) por perto e a pessoa fora de abrigo
  N.threat = function (S, p) {
    const n = S.narr;
    if (!n || !n.ents.length || p.carriedBy || N.safeSpot(S, p)) return null;
    for (const e of n.ents) if (prowling(e) && Math.hypot(e.x - p.x, e.y - p.y) < (e.k === 'onca' ? C.ONCA_SEE : C.LOBO_SEE)) return e;
    return null;
  };
  function guarded(S, p) {
    let k = 0;
    for (const q of S.people) {
      if (q === p || !q.alive || q.sleeping || q.carriedBy || Fam().age(S, q) < 16) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) <= 3) k++;
    }
    return k >= 2;
  }
  // quantas mordidas cada um aguenta numa noite (o Implacável morde mais)
  function biteCap(S) { return C.LOBO_BITES_PERSON + (N.kind(S).sev > 1.2 ? 1 : 0); }
  function bitten(S, p) { const a = S.narr.active.lobos; return a && a.bitten ? a.bitten[p.id] || 0 : 0; }
  // lobo não ataca criança: vai atrás de quem tem 12 anos ou mais, sozinho e fora de abrigo
  function prey(S, e) {
    let best = null, bd = C.LOBO_SEE * 2.2;
    const cap = biteCap(S);
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 12 || N.safeSpot(S, p) || guarded(S, p) || bitten(S, p) >= cap) continue;
      if (e.skip && e.skip[p.id] > S.t) continue;   // do outro lado da cerca: o lobo desiste um tempo
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function stockOpen(S) {
    if (!(S.ctx && S.ctx.food > 0)) return false;
    const c = camp(S);
    return !repelAt(S, c.x, c.y);
  }
  function spawnWolves(S, pack) {
    const spot = edgeSpot(S, 16, 22);
    if (!spot) return 0;
    for (let i = 0; i < pack; i++) newEnt(S, 'lobo', spot.x, spot.y, { home: spot.i, bites: 0, fur: S.rng.int(0, 2), ring: S.rng.next() * Math.PI * 2 });
    return pack;
  }
  function goAway(S, e) {
    if (e.state === 'embora') return;
    e.state = 'embora'; e.path = null; e.leftAt = e.t;
  }
  // caminho de lobo: não pisa em obra nem na luz do fogo, nem passa a cerca (Etapa 10; a onça pula)
  const heap = new G.Heap();
  let gB = null, fB = null, sB = null, cB = null, stp = 0;
  function wolfRoute(S, e, test, maxCost) {
    const w = S.world, n = w.W * w.H;
    if (!gB || gB.length !== n) { gB = new Float32Array(n); fB = new Int32Array(n); sB = new Uint32Array(n); cB = new Uint32Array(n); stp = 0; }
    stp++; heap.clear();
    const start = Math.floor(e.y) * w.W + Math.floor(e.x), fence = e.k === 'lobo' ? w.fence : null;
    gB[start] = 0; sB[start] = stp; heap.push(0, start);
    while (heap.size()) {
      const cur = heap.pop();
      if (cB[cur] === stp) continue;
      cB[cur] = stp;
      if (cur !== start && test(cur)) {
        const out = [];
        let c = cur;
        while (c !== start) { out.push(c); c = fB[c]; }
        return out.reverse();
      }
      const cx = cur % w.W, cy = (cur / w.W) | 0, gc = gB[cur];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
        const ni = ny * w.W + nx;
        if (w.block[ni] || w.slow[ni]) continue;
        if (dx && dy && (w.block[cy * w.W + nx] || w.block[ny * w.W + cx])) continue;
        if (fence && (fence[ni] || (dx && dy && (fence[cy * w.W + nx] || fence[ny * w.W + cx])))) continue;
        if (repelAt(S, nx + 0.5, ny + 0.5)) continue;
        const ng = gc + (dx && dy ? Math.SQRT2 : 1) * C.COST[w.tile[ni]];
        if (ng > maxCost) continue;
        if (sB[ni] !== stp || ng < gB[ni]) { sB[ni] = stp; gB[ni] = ng; fB[ni] = cur; heap.push(ng, ni); }
      }
    }
    return null;
  }
  // ronda: um ponto em volta do acampamento, fora do alcance do fogo
  function routeRing(S, e) {
    const w = S.world, c = camp(S);
    for (let k = 0; k < 6; k++) {
      e.ring += 0.6 + S.rng.next() * 0.9;
      const R = fireR(S) + 2.5 + S.rng.next() * 2;
      const x = Math.round(c.x + Math.cos(e.ring) * R), y = Math.round(c.y + Math.sin(e.ring) * R);
      if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
      const goal = y * w.W + x;
      const r = wolfRoute(S, e, (i) => i === goal, 60);
      if (r) { setPath(e, r); return true; }
    }
    e.wait = (e.wait || 0) + 1;
    return false;
  }
  function wolfStep(S, e, dt) {
    e.t += dt;
    const hr = S.ck.hour, night = hr >= 19 || hr < 5.5;
    if (e.state !== 'embora' && (!night || e.t > 9 * 60 || repelAt(S, e.x, e.y))) goAway(S, e);
    const w = S.world;
    switch (e.state) {
      case 'vindo':
      case 'rondar': {
        const p = prey(S, e);
        if (p) { e.state = 'atacar'; e.target = p.id; e.path = null; e.repath = -1e9; break; }
        if (!e.fed && stockOpen(S)) { e.state = 'roubar'; e.path = null; break; }
        if (!e.path) { e.state = 'rondar'; routeRing(S, e); }
        break;
      }
      case 'atacar': {
        const p = Fam().person(S, e.target);
        if (!p || !p.alive || N.safeSpot(S, p) || guarded(S, p) || bitten(S, p) >= biteCap(S)) { e.state = 'rondar'; e.path = null; break; }
        if (Math.hypot(p.x - e.x, p.y - e.y) <= 1.5) { e.path = null; bite(S, e, p); break; }   // 1,5: alcança também na diagonal
        if (!e.path || S.t - e.repath >= 8) {
          e.repath = S.t;
          const px = Math.floor(p.x), py = Math.floor(p.y);
          const r = wolfRoute(S, e, (i) => Math.max(Math.abs(i % w.W - px), Math.abs(((i / w.W) | 0) - py)) <= 1, 70);
          if (r) setPath(e, r);
          else {
            e.state = 'rondar'; e.path = null;
            if (S.campo && S.campo.fences > 0) (e.skip || (e.skip = {}))[p.id] = S.t + 30;   // cercado: não fica tentando a cada passo
          }
        }
        break;
      }
      case 'roubar': {
        if (!stockOpen(S)) { e.state = 'rondar'; e.path = null; break; }
        const c = camp(S);
        if (Math.abs(e.x - c.x) <= 1.6 && Math.abs(e.y - c.y) <= 1.6) { steal(S, e); goAway(S, e); break; }
        if (!e.path) {
          const r = wolfRoute(S, e, (i) => Sim().isCamp(S, i), 90);
          if (r) setPath(e, r); else { e.state = 'rondar'; e.fed = true; }
        }
        break;
      }
      case 'embora': {
        if (!e.path) {
          const c = camp(S), d = Math.hypot(e.x - c.x, e.y - c.y);
          if (d > 18 || e.t - e.leftAt > 180) { e.gone = true; break; }
          const r = wolfRoute(S, e, (i) => Math.hypot(i % w.W - c.x, ((i / w.W) | 0) - c.y) > 19, 140);
          if (r) setPath(e, r); else e.gone = true;
        }
        break;
      }
    }
    if (!e.gone) entMove(S, e, dt, e.state === 'embora' ? C.LOBO_SPEED * 1.2 : C.LOBO_SPEED, true);
  }
  function bite(S, e, p) {
    // uma mordida por vez: nem o lobo nem a vítima levam outra antes de LOBO_BITE_MIN
    if (S.t < (e.nextBite || 0) || S.t < (p.biteCool || 0)) return;
    const a = S.narr.active.lobos, Sm = Sim();
    p.biteCool = S.t + C.LOBO_BITE_MIN;
    if (a) { a.bitten = a.bitten || {}; a.bitten[p.id] = (a.bitten[p.id] || 0) + 1; }
    const dmg = C.LOBO_BITE * N.kind(S).sev * (G.Tech ? G.Tech.biteMult(S, p) : 1);   // com a lança na mão, pega menos
    p.needs.saude -= dmg;
    p.dmg.lobo = (p.dmg.lobo || 0) + dmg;
    e.nextBite = S.t + C.LOBO_BITE_MIN; e.bites++;
    e.dir = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? (p.x > e.x ? 2 : 3) : (p.y > e.y ? 0 : 1);
    Sm.addMem(S, p, 'mordido');
    if (a) { a.bites++; if (a.hurt.indexOf(p.id) < 0) { a.hurt.push(p.id); Sm.toast(S, 'Um lobo atacou ' + p.name + '!', 'bad'); } }
    S.events.push({ k: 'bite', x: p.x, y: p.y, pid: p.id });
    Sm.say(S, p, 'Socorro!', true);
    // quem foi atacado acorda e corre para o abrigo (e reza)
    if (p.act && p.act.type === 'fugir') p.sleeping = false;
    else if (p.act) G.AI.abort(S, p);
    G.God.cry(S, p, 'lobos');
    // Etapa 9: quem tem lança revida, e quem está perto e armado vem ajudar
    if (G.Bichos) { const tgt = { kind: 'narr', id: e.id }; G.Bichos.fightBack(S, p, tgt); if (!e.gone && e.state !== 'embora') G.Bichos.alarm(S, p, tgt); }
    if (!e.gone && e.bites >= C.LOBO_BITES) goAway(S, e);
  }

  // ---------- luta (Etapa 9): um acerto no lobo ou na onça ----------
  N.hitEnt = function (S, e, p) {
    const n = S.narr, Sm = Sim();
    // no lobo, um golpe em cheio (LOBO_KILL) derruba de uma vez; senão ele foge ferido
    e.hp = (e.hp === undefined ? (e.k === 'onca' ? C.ONCA_HP : C.LOBO_HP) : e.hp) - (e.k === 'lobo' && S.rng.chance(C.LOBO_KILL) ? 2 : 1);
    const bow = G.Tech && G.Tech.known(S, 'arco');
    if (e.k === 'lobo') {
      const a = n.active.lobos;
      if (a) a.fought = (a.fought || 0) + 1;
      if (e.hp <= 0) {
        e.gone = true;
        if (a) a.killed++;
        S.stats.wolvesKilled = (S.stats.wolvesKilled || 0) + 1;
        if (S.stats.wolvesKilled === 1) Sm.chron(S, p.name + ' enfrentou um lobo e o derrubou ' + (bow ? 'com uma flecha.' : 'com a lança.'));
        else Sm.toast(S, p.name + ' derrubou um lobo.', 'good');
        for (const o of n.ents) if (o.k === 'lobo' && !o.gone) goAway(S, o);   // o resto da matilha foge
        return 'morto';
      }
      goAway(S, e);
      return 'fugiu';
    }
    if (e.k === 'onca') {
      const a = n.active.onca;
      if (a) a.fought = (a.fought || 0) + 1;
      if (e.hp <= 0) {
        e.gone = true;
        if (a) a.killedBy = p.name;
        S.stats.oncasKilled = (S.stats.oncasKilled || 0) + 1;
        S.stock.carne += C.ONCA_CARNE; S.stock.couro += C.ONCA_COURO;
        Sm.float(S, e.x, e.y, '+' + C.ONCA_CARNE + ' carne +' + C.ONCA_COURO + ' couro');
        Sm.toast(S, p.name + ' venceu a onça!', 'good');
        for (const q of S.people) if (q.alive && Math.hypot(q.x - e.x, q.y - e.y) < 10) Sm.addMem(S, q, 'vencemos');
        if (G.Life) G.Life.party(S, 'onca', { name: p.name });
        return 'morto';
      }
      if (e.state === 'acuada') return 'ferido';   // acuada, briga até o fim (ou até achar uma brecha e escapar)
      if (e.hp <= 1) goAway(S, e); else toDen(S, e);   // ferida, some na mata; muito ferida, vai embora de vez
      return 'fugiu';
    }
    return 'fugiu';
  };

  // ---------- onça (Etapa 9) ----------
  // chega de noite, ronda fora da luz do fogo e espera alguém sozinho no escuro; dá um bote (um por noite), fica na
  // luta um tempo e volta para a toca na mata; de dia some. Depois de 2 ou 3 noites, vai embora (ou cai na luta)
  function spawnOnca(S) {
    const spot = edgeSpot(S, 18, 24), den = edgeSpot(S, 14, 20);   // a toca, na mata perto (a meio dia de caminhada)
    if (!spot) return 0;
    newEnt(S, 'onca', spot.x, spot.y, { hp: C.ONCA_HP, den: den ? den.i : spot.i, ring: S.rng.next() * Math.PI * 2, bites: 0 });
    return 1;
  }
  const nightOf = (S) => Math.floor((S.t - 12 * 60) / D());   // a noite vai das 19 h às 5 h da manhã seguinte
  function toDen(S, e) {
    e.state = 'toca'; e.target = 0;
    const d0 = Math.floor(S.t / D()) * D();
    e.back = (S.ck.hour >= 12 ? d0 + D() : d0) + 19 * 60 + Math.round(S.rng.next() * 90);
    const den = e.den;
    const r = wolfRoute(S, e, (i) => i === den, 400);
    setPath(e, r);
    if (!r) e.hidden = true;
  }
  function oncaPrey(S, e) {
    if (e.bitNight === nightOf(S)) return null;
    let best = null, bd = C.ONCA_SEE * 2.2;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 12 || N.safeSpot(S, p) || guarded(S, p)) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function oncaBite(S, e, p) {
    if (S.t < (p.biteCool || 0)) return;
    const a = S.narr.active.onca, Sm = Sim();
    p.biteCool = S.t + C.LOBO_BITE_MIN;
    const dmg = C.ONCA_BITE * N.kind(S).sev * (G.Tech ? G.Tech.biteMult(S, p) : 1);
    p.needs.saude -= dmg;
    p.dmg.onca = (p.dmg.onca || 0) + dmg;
    e.bitNight = nightOf(S); e.bites++;
    e.dir = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? (p.x > e.x ? 2 : 3) : (p.y > e.y ? 0 : 1);
    Sm.addMem(S, p, 'atacadoBicho');
    if (a) { a.bites++; if (a.hurt.indexOf(p.id) < 0) a.hurt.push(p.id); }
    Sm.toast(S, 'A onça atacou ' + p.name + '!', 'bad');
    S.events.push({ k: 'bite', x: p.x, y: p.y, sp: 'onca', pid: p.id });
    S.events.push({ k: 'roar' });
    Sm.say(S, p, 'Socorro!', true);
    if (p.act && p.act.type === 'fugir') p.sleeping = false;
    else if (p.act) G.AI.abort(S, p);
    G.God.cry(S, p, 'onca');
    // fica um tempo na luta (é quando o povo pode acertar), depois volta para a toca
    e.state = 'luta'; e.lutaUntil = S.t + 20; e.path = null;
    if (G.Bichos) { const tgt = { kind: 'narr', id: e.id }; G.Bichos.fightBack(S, p, tgt); if (!e.gone && e.state === 'luta') G.Bichos.alarm(S, p, tgt); }
  }
  // caçada (Etapa 9): os caçadores chegaram na toca e acharam a onça
  N.corner = function (S, e, p) {
    if (e.state !== 'toca') return;
    e.state = 'acuada'; e.hidden = false; e.path = null;
    e.acuadaUntil = S.t + C.ONCA_ACUADA; e.nextBite = S.t + C.ONCA_POUNCE_MIN * 0.75; e.lastNear = S.t;
    e.dir = p.x > e.x ? 2 : 3;
    Sim().toast(S, p.name + ' achou a onça na toca!', 'warn');
    S.events.push({ k: 'roar' });
  };
  // acuada, a onça dá um bote em quem está mais perto
  function oncaPounce(S, e, p) {
    const a = S.narr.active.onca, Sm = Sim();
    const dmg = C.ONCA_BITE * C.ONCA_POUNCE * N.kind(S).sev * (G.Tech ? G.Tech.biteMult(S, p) : 1);
    p.needs.saude -= dmg;
    p.dmg.onca = (p.dmg.onca || 0) + dmg;
    e.dir = p.x > e.x ? 2 : 3;
    Sm.addMem(S, p, 'atacadoBicho');
    if (a) { a.pounced = a.pounced || []; if (a.pounced.indexOf(p.id) < 0) { a.pounced.push(p.id); Sm.toast(S, 'A onça pulou em cima de ' + p.name + '!', 'bad'); } }
    S.events.push({ k: 'bite', x: p.x, y: p.y, sp: 'onca', pid: p.id });
    S.events.push({ k: 'roar' });
    Sm.say(S, p, S.rng.pick(['Ai!', 'Segura ela!', 'Me acertou!']), true);
    G.God.cry(S, p, 'onca');
    if (G.Bichos) G.Bichos.fightBack(S, p, { kind: 'narr', id: e.id, hunt: true });
  }
  function oncaStep(S, e, dt) {
    e.t += dt;
    const a = S.narr.active.onca, hr = S.ck.hour, night = hr >= 19 || hr < 5.5, w = S.world;
    if (e.state !== 'embora' && e.state !== 'acuada' && (!a || S.t >= a.until)) goAway(S, e);
    else if (e.state !== 'embora' && e.state !== 'toca' && e.state !== 'luta' && e.state !== 'acuada' && (!night || repelAt(S, e.x, e.y))) toDen(S, e);
    switch (e.state) {
      case 'toca':
        if (night && S.t >= (e.back || 0)) { e.state = 'rondar'; e.path = null; e.hidden = false; }
        else if (!e.path) e.hidden = true;
        // de manhã, depois de um ataque, o povo vai atrás dela (uma vez)
        if (G.Bichos && !e.hunted && e.bites > 0 && e.hidden && hr >= C.ONCA_HUNT_H[0] && hr < C.ONCA_HUNT_H[1]) G.Bichos.oncaHunt(S, e);
        break;
      case 'acuada': {
        // acuada na toca: dá botes em quem chega perto; se os caçadores recuam (ou a luta demora demais), escapa e vai embora de vez
        if (S.people.some((q) => q.alive && q.act && q.act.type === 'defender' && q.act.tgt && q.act.tgt.id === e.id && Math.hypot(q.x - e.x, q.y - e.y) <= C.ONCA_POUNCE_R + 2)) e.lastNear = S.t;
        if (S.t >= e.acuadaUntil || S.t - (e.lastNear || 0) > 10) { goAway(S, e); if (a) a.escaped = true; break; }
        if (S.t >= (e.nextBite || 0)) {
          // o bote vai num dos caçadores que estão perto (não sempre no mesmo); criança, nunca
          const near = S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 12 && Math.hypot(p.x - e.x, p.y - e.y) < C.ONCA_POUNCE_R);
          const hunters = near.filter((p) => p.act && p.act.type === 'defender');
          e.nextBite = S.t + C.ONCA_POUNCE_MIN;
          if (near.length) oncaPounce(S, e, S.rng.pick(hunters.length ? hunters : near));
        }
        break;
      }
      case 'vindo':
      case 'rondar': {
        const p = oncaPrey(S, e);
        if (p) { e.state = 'atacar'; e.target = p.id; e.path = null; e.repath = -1e9; break; }
        if (!e.path) routeRing(S, e);
        break;
      }
      case 'atacar': {
        const p = Fam().person(S, e.target);
        if (!p || !p.alive || N.safeSpot(S, p) || guarded(S, p) || e.bitNight === nightOf(S)) { e.state = 'rondar'; e.path = null; break; }
        if (Math.hypot(p.x - e.x, p.y - e.y) <= 1.5) { e.path = null; oncaBite(S, e, p); break; }
        if (!e.path || S.t - e.repath >= 6) {
          e.repath = S.t;
          const px = Math.floor(p.x), py = Math.floor(p.y);
          const r = wolfRoute(S, e, (i) => Math.max(Math.abs(i % w.W - px), Math.abs(((i / w.W) | 0) - py)) <= 1, 70);
          if (r) setPath(e, r); else { e.state = 'rondar'; e.path = null; }
        }
        break;
      }
      case 'luta':
        if (S.t >= e.lutaUntil) toDen(S, e);
        break;
      case 'embora': {
        e.hidden = false;
        if (!e.path) {
          const c = camp(S), d = Math.hypot(e.x - c.x, e.y - c.y);
          if (d > 18 || e.t - (e.leftAt || e.t) > 180) { e.gone = true; break; }
          const r = wolfRoute(S, e, (i) => Math.hypot(i % w.W - c.x, ((i / w.W) | 0) - c.y) > 19, 140);
          if (r) setPath(e, r); else e.gone = true;
        }
        break;
      }
    }
    if (!e.gone && !e.hidden && e.state !== 'luta' && e.state !== 'acuada') entMove(S, e, dt, e.state === 'embora' || e.state === 'toca' ? C.ONCA_SPEED * 1.1 : C.ONCA_SPEED, e.state !== 'toca');
  }
  function steal(S, e) {
    const st = S.stock, a = S.narr.active.lobos;
    e.fed = true;
    // Etapa 7: com armazém de pé, a comida está guardada; o lobo fareja e vai embora sem nada
    if (G.Obras && G.Obras.guarded(S)) {
      if (a && !a.guardedToast) { a.guardedToast = true; Sim().toast(S, 'Um lobo farejou o armazém, mas não achou jeito de entrar.', 'good'); }
      return;
    }
    let take = C.LOBO_STEAL, got = 0;
    // o lobo quer carne e peixe; na falta, leva o que houver
    for (const k of ['carne', 'peixe', 'defumado', 'frutas', 'seca']) { const n = Math.min(take, st[k] || 0); st[k] -= n; take -= n; got += n; }
    e.fed = true;
    if (a) a.stolen += got;
    if (got) {
      Sim().toast(S, 'Um lobo levou ' + got + ' de comida do estoque.', 'bad');
      S.events.push({ k: 'float', x: S.camp.x + 1, y: S.camp.y + 0.6, text: '−' + got + ' comida' });
    }
  }

  // ---------- viajantes: andarilho e segundo casal ----------
  function freeName(S, sex, used) {
    const pool = sex === 'F' ? Sim().namePool.FEM : Sim().namePool.MASC;
    const taken = new Set(S.people.filter((q) => q.alive).map((q) => q.name));
    for (const u of used) taken.add(u);
    const free = pool.filter((x) => !taken.has(x));
    const name = S.rng.pick(free.length ? free : pool);
    used.add(name);
    return name;
  }
  N.visitorData = (S, sex, age, role, used) => visitorData(S, sex, age, role, used);   // Etapa 12: as caravanas dos povos
  function visitorData(S, sex, age, role, used) {
    return { sex, name: freeName(S, sex, used), age, traits: Sim().pickTraits(S.rng), look: Sim().makeLook(S.rng, sex), role };
  }
  // o sexo que falta entre os adultos sem par (sangue novo para os casais que virão)
  function balanceSex(S) {
    let f = 0, m = 0;
    for (const p of alive(S)) {
      const age = Fam().age(S, p);
      if (age < 14 || age > 40 || Fam().partners(S, p).length) continue;
      if (p.sex === 'F') f++; else m++;
    }
    return f === m ? (S.rng.chance(0.5) ? 'F' : 'M') : f < m ? 'F' : 'M';
  }
  function spawnGroup(S, kind, members) {
    const spot = edgeSpot(S, 14, 20);
    if (!spot) return null;
    const n = S.narr, g = { id: n.nextEnt++, kind, state: 'vindo', ents: [], home: spot.i, t0: S.t };
    members.forEach((pd, k) => { g.ents.push(newEnt(S, 'visita', spot.x, spot.y, { gid: g.id, pd, off: k }).id); });
    n.groups[g.id] = g;
    return g;
  }
  function visitorStep(S, e, dt) {
    const n = S.narr, g = n.groups[e.gid], w = S.world;
    if (!g) { e.gone = true; return; }
    e.t += dt;
    if (e.state === 'vindo') {
      const c = camp(S);
      if (!e.path) {
        if (Math.hypot(e.x - c.x, e.y - c.y) <= 3.2 || e.t > 12 * 60) {
          e.state = 'esperando'; e.dir = 0;
          if (g.ents.every((id) => { const o = n.ents.find((x) => x.id === id); return !o || o.state === 'esperando'; })) arrived(S, g);
        } else {
          const path = W.findPath(w, Math.floor(e.y) * w.W + Math.floor(e.x), S.camp.y * w.W + S.camp.x, 500);
          // para um pouco antes do estoque, cada um num lugar
          setPath(e, path ? path.slice(0, Math.max(1, path.length - 2 - e.off)) : null);
          if (!path) e.t = 1e9;
        }
      }
    } else if (e.state === 'indo') {
      if (!e.path) {
        const c = camp(S);
        if (Math.hypot(e.x - c.x, e.y - c.y) > 16 || e.t - (e.leftAt || 0) > 240) { e.gone = true; return; }
        const path = W.findPath(w, Math.floor(e.y) * w.W + Math.floor(e.x), g.home, 600);
        if (path) setPath(e, path); else e.gone = true;
      }
    }
    entMove(S, e, dt, 1, false);
  }
  function describeGroup(S, g) {
    const n = S.narr, pds = g.ents.map((id) => n.ents.find((x) => x.id === id)).filter(Boolean).map((e) => e.pd);
    return pds;
  }
  function arrived(S, g) {
    const n = S.narr;
    g.state = 'esperando';
    const pds = describeGroup(S, g), Sm = Sim();
    if (g.kind === 'mascate') {
      // Etapa 10: o mascate mostra os bichos e diz o que quer em troca
      const o = g.offer, txt = 'Chegou um mascate, ' + (pds[0] ? pds[0].name : '') + ', com ' + G.Campo.animalsText(o.sp, o.m, o.f) + ' para trocar.';
      if (!S.stats.mascateSeen) { S.stats.mascateSeen = true; Sm.chron(S, txt); } else Sm.toast(S, txt, '');
    } else if (g.kind === 'povo') {
      // Etapa 12: a caravana de um povo
      const D = G.Povos.DEF[g.povo];
      Sm.chron(S, 'Chegou uma caravana ' + D.de + ', ' + D.alias + ': ' + Sm.listNames(pds) + '. Pedem para ficar.');
    } else if (g.kind === 'casal') {
      const mom = pds.find((p) => p.role === 'mae'), dad = pds.find((p) => p.role === 'pai'), kid = pds.find((p) => p.role === 'filho');
      Sm.chron(S, 'Chegou um casal pedindo abrigo: ' + (mom ? mom.name : '') + ' e ' + (dad ? dad.name : '') +
        (kid ? ', com ' + (kid.sex === 'F' ? 'a filha ' : 'o filho ') + kid.name + ', de ' + kid.age + ' anos' : '') + '.');
    } else if (pds[0]) Sm.chron(S, (pds[0].sex === 'F' ? 'Uma andarilha chegou' : 'Um andarilho chegou') + ' ao acampamento: ' + pds[0].name + ', ' + pds[0].age + ' anos.');
    if (n.auto) { N.decide(S, g.id, n.auto === 'acolher'); return; }
    if (!S.safe) S.events.push({ k: 'choice', gid: g.id });
  }
  // quem espera resposta (para a janela de decisão, inclusive na volta do jogo fechado)
  N.pending = function (S) {
    const n = S.narr;
    if (!n) return null;
    for (const gid of Object.keys(n.groups)) if (n.groups[gid].state === 'esperando') return n.groups[gid];
    return null;
  };
  N.groupInfo = function (S, gid) {
    const n = S.narr, g = n && n.groups[gid];
    if (!g) return null;
    return { id: g.id, kind: g.kind, people: describeGroup(S, g), offer: g.offer || null, povo: g.povo || null };
  };
  N.decide = function (S, gid, accept) {
    const n = S.narr, g = n && n.groups[gid];
    if (!g || g.state !== 'esperando') return false;
    const ents = g.ents.map((id) => n.ents.find((x) => x.id === id)).filter(Boolean);
    const Sm = Sim(), F = Fam();
    if (g.kind === 'mascate') {
      // Etapa 10: troca (paga e recebe os bichos, que vão para o curral) ou dispensa; o mascate segue viagem
      const e = ents[0], o = g.offer, Ca = G.Campo;
      const ok = !!(accept && Ca && Ca.trade(S, o, e ? e.x : S.camp.x + 1, e ? e.y : S.camp.y + 1));
      g.traded = ok;   // os bichos já foram para o curral: o mascate segue sozinho
      if (ok) Sm.toast(S, 'Troca feita: ' + Ca.payText(o.pay) + ' por ' + Ca.animalsText(o.sp, o.m, o.f) + '.', 'good');
      else if (accept) Sm.toast(S, 'A troca não deu: faltou o que pagar, ou lugar no curral. O mascate seguiu viagem.', 'warn');
      else Sm.toast(S, 'O mascate seguiu viagem.', '');
      for (const x of ents) { x.state = 'indo'; x.path = null; x.leftAt = x.t; }
      g.state = 'indo';
      S.events.push({ k: 'narr', ev: 'mascate', on: false });
      return true;
    }
    if (accept) {
      const made = [];
      for (const e of ents) {
        const pd = e.pd;
        const p = Sm.makePerson(S, pd.sex, pd.name, pd.age);
        p.traits = pd.traits.slice(); p.look = pd.look;
        if (pd.povo && G.Povos) G.Povos.make(S, p, pd.povo, pd.look);   // Etapa 12: gente de outro povo
        p.x = e.x; p.y = e.y; p.px = p.x; p.py = p.y; p.dir = e.dir;
        p.lastAge = pd.age; p.joined = S.t;
        S.people.push(p);
        made.push({ p, role: pd.role });
        e.gone = true;
      }
      G.God.init(S); if (G.Deus) G.Deus.init(S); F.init(S);
      const mom = made.find((m) => m.role === 'mae'), dad = made.find((m) => m.role === 'pai'), kid = made.find((m) => m.role === 'filho');
      if (mom && dad) F.link(S, mom.p, dad.p, 70);
      if (kid) { kid.p.mother = mom ? mom.p.id : 0; kid.p.father = dad ? dad.p.id : 0; }
      for (const m of made) Sm.addMem(S, m.p, 'acolhido');
      for (const q of alive(S)) if (!made.some((m) => m.p === q)) Sm.addMem(S, q, 'chegouGente');
      G.God.align(S, 3);
      const count = alive(S).length;
      const names = made.map((m) => m.p);
      Sm.chron(S, Sm.listNames(names) + (names.length > 1 ? ' foram acolhidos.' : names[0].sex === 'F' ? ' foi acolhida.' : ' foi acolhido.') + ' Agora são ' + count + '.');
      g.state = 'acolhido';
      if (g.kind === 'casal' && n.couple) n.couple.state = 'acolhido';
      if (g.kind === 'povo' && G.Povos) G.Povos.onWelcome(S, g.povo, made);
      if (G.Life) G.Life.onWelcome(S, names);   // festa de boas-vindas
    } else {
      for (const e of ents) { e.state = 'indo'; e.path = null; e.leftAt = e.t; }
      g.state = 'indo';
      Sm.chron(S, 'O povo mandou seguir ' + Sm.listNames(ents.map((e) => ({ name: e.pd.name }))) + '.');
      if (g.kind === 'casal' && n.couple) n.couple.state = 'recusado';
      if (g.kind === 'povo' && G.Povos) G.Povos.onRefused(S, g.povo);
    }
    S.events.push({ k: 'narr', ev: g.kind === 'casal' ? 'casal' : g.kind === 'povo' ? 'povo' : 'andarilho', on: false });
    return true;
  };

  // Etapa 12: a caravana de um povo vem pela trilha como os viajantes (quem são: povos.js)
  N.spawnPovo = function (S, kind, members) {
    const g = spawnGroup(S, 'povo', members);
    if (!g) return null;
    g.povo = kind;
    return g;
  };

  // Etapa 10: o mascate vem pela trilha como os viajantes, tocando os bichos que quer trocar
  N.spawnMascate = function (S, offer) {
    const pd = visitorData(S, 'M', rint(S, 30, 55), 'mascate', new Set());
    const g = spawnGroup(S, 'mascate', [pd]);
    if (!g) return null;
    g.offer = offer;
    Sim().toast(S, 'Um mascate vem pela trilha, tocando ' + G.Campo.animalsText(offer.sp, offer.m, offer.f) + '.', '');
    S.events.push({ k: 'narr', ev: 'mascate', on: true });
    return g;
  };

  // segundo casal: marcado no 18º aniversário do primogênito
  N.onAdult = function (S, p, soon) {
    const n = S.narr;
    if (!n || n.couple) return;
    n.couple = { state: 'planejado', at: S.t + (soon ? 6 : C.SEGUNDO_CASAL_H) * 60, forId: p.id, sex: p.sex === 'F' ? 'M' : 'F', age: Fam().age(S, p) };
  };
  function startCouple(S) {
    const n = S.narr, c = n.couple, used = new Set();
    const kidAge = U.clamp(c.age + S.rng.int(-1, 1), 17, 20);
    const mom = visitorData(S, 'F', kidAge + S.rng.int(19, 25), 'mae', used);
    const dad = visitorData(S, 'M', mom.age + S.rng.int(-2, 4), 'pai', used);
    const kid = visitorData(S, c.sex, kidAge, 'filho', used);
    kid.look.skin = S.rng.chance(0.5) ? mom.look.skin : dad.look.skin;
    kid.look.hair = S.rng.chance(0.5) ? mom.look.hair : dad.look.hair;
    const g = spawnGroup(S, 'casal', [mom, dad, kid]);
    if (!g) { c.at = S.t + 6 * 60; return; }
    c.state = 'vindo'; c.gid = g.id;
    Sim().toast(S, 'Três viajantes vêm pela trilha.', '');
    S.events.push({ k: 'narr', ev: 'casal', on: true });
  }

  // ---------- para a interface ----------
  // o que está acontecendo agora (ou vai acontecer), para a faixa do almanaque
  N.status = function (S) {
    const n = S.narr;
    if (!n) return null;
    const left = (until) => {
      const h = Math.max(0, (until - S.t) / 60);
      return h >= 36 ? Math.ceil(h / 24) + ' dias' : h >= 20 ? 'até amanhã' : Math.max(1, Math.round(h)) + ' h';
    };
    const a = n.active;
    if (a.onca) {
      const hunting = S.people.some((p) => p.alive && p.act && p.act.type === 'defender' && p.act.tgt && p.act.tgt.hunt);
      return { k: 'onca', text: hunting ? 'Caçada à onça' : N.oncaOut(S) ? 'Onça rondando' : 'Onça por perto · ' + left(a.onca.until), tone: 'bad' };
    }
    if (a.lobos || N.wolvesOut(S)) return { k: 'lobos', text: 'Lobos rondando', tone: 'bad' };
    if (a.nevasca) return { k: 'nevasca', text: 'Nevasca · ' + left(a.nevasca.until), tone: 'bad' };
    if (a.tempestade) return { k: 'tempestade', text: 'Tempestade · ' + left(a.tempestade.until), tone: 'bad' };
    if (a.seca) return { k: 'seca', text: 'Seca · ' + left(a.seca.until), tone: 'bad' };
    if (n.plan && n.plan.warned && WARN[n.plan.k]) {
      const soon = { nevasca: 'Nevasca chegando', lobos: 'Uivos na mata', tempestade: 'Tempestade chegando', onca: 'Pegadas de onça' }[n.plan.k];
      return { k: n.plan.k, text: soon, tone: 'warn' };
    }
    const g = Object.values(n.groups).find((x) => x.state === 'vindo' || x.state === 'esperando');
    if (g) return g.kind === 'mascate' ? { k: 'mascate', text: 'Mascate chegando', tone: 'good' } : g.kind === 'povo' ? { k: 'andarilho', text: 'Caravana ' + G.Povos.DEF[g.povo].de + ' chegando', tone: 'good' } :
      { k: 'andarilho', text: g.kind === 'casal' ? 'Viajantes chegando' : 'Andarilho chegando', tone: 'good' };
    if (a.fartura) return { k: 'fartura', text: 'Fartura · ' + left(a.fartura.until), tone: 'good' };
    if (a.piracema) return { k: 'piracema', text: 'Piracema · ' + left(a.piracema.until), tone: 'good' };
    if (a.veranico) return { k: 'veranico', text: 'Veranico · ' + left(a.veranico.until), tone: 'good' };
    return null;
  };
})(globalThis.G = globalThis.G || {});
