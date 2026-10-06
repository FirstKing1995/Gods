/* Gods · tempo com o jogo fechado: o mundo segue numa fração da velocidade (o jogador escolhe), em modo seguro. Sem DOM.
   0.12: a volta é rápida. Antes, o tempo todo era simulado pessoa por pessoa (300 dias com 60 pessoas levavam 4 minutos).
   Agora o tempo fora tem dois ritmos:
   - dias resumidos (quase todos): o calendário, a família (idade, gravidez, parto, pares) e Deus (fé, Poder, níveis)
     andam de verdade, hora a hora, pelos ganchos da simulação; o trabalho do dia não é simulado pessoa por pessoa: o
     estoque volta ao nível que a aldeia costuma manter em cada estação, e as habilidades, a prática das descobertas e
     as obras marcadas andam no ritmo dela (S.hist, a memória que o jogo aberto anota todo dia em Sim.remember).
     Roça, curral, arbustos, roupas e trilhas ficam como estavam;
   - trechos inteiros: as últimas horas (para o povo estar onde a hora pede) e, enquanto o orçamento de relógio
     deixar, alguns dias pelo meio. A simulação de sempre, em modo seguro, com passo de 10 min.
   Aldeia que ainda não tem memória (save de antes da 0.12) vive inteiros os primeiros dois dias, para tê-la. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Off = G.Offline = {};
  const now = () => (globalThis.performance && performance.now ? performance.now() : Date.now());
  const DAY = 1440, DT = 10, DAWN = 180, TAIL = 240;   // passo dos trechos inteiros; o dia resumido fecha às 3 h; o fim inteiro dura 4 h

  Off.rate = (S) => C.OFFLINE_RATES[S && S.opts && S.opts.offline !== undefined ? S.opts.offline : C.OFFLINE_RATE_DEFAULT] || C.OFFLINE_RATES[C.OFFLINE_RATE_DEFAULT];

  // minutos de jogo que passam para um tempo real fora (ms)
  Off.minutesFor = function (awayMs, S) {
    if (!(awayMs > C.OFFLINE_MIN_SEC * 1000)) return 0;
    const perRealSec = C.DAY_MIN / C.REAL_SEC_PER_DAY * Off.rate(S);
    return Math.min(awayMs / 1000 * perRealSec, C.OFFLINE_MAX_DAYS * C.DAY_MIN);
  };

  // ---------- a memória da aldeia para uma estação ----------
  // os níveis e os ritmos da estação; do que a aldeia ainda não viveu nela com o jogo aberto, a média das outras
  function bucket(S, season) {
    const h = S.hist;
    if (!h) return null;
    const own = h.s[season];
    const lvSrc = own && h.n[season] >= 1 ? [own] : h.s.filter((b, i) => b && h.n[i] >= 1);
    if (!lvSrc.length) return null;
    const dSrc = own && own.nd >= 1 ? [own] : h.s.filter((b) => b && b.nd >= 1);
    const out = { lv: {}, sk: {}, prat: 0, build: 0 };
    for (const b of lvSrc) for (const k in b.lv) out.lv[k] = (out.lv[k] || 0) + b.lv[k] / lvSrc.length;
    for (const b of dSrc) {
      for (const k in b.sk) out.sk[k] = (out.sk[k] || 0) + b.sk[k] / dSrc.length;
      out.prat += (b.prat || 0) / dSrc.length; out.build += (b.build || 0) / dSrc.length;
    }
    return out;
  }
  Off.bucket = bucket;
  // a aldeia já tem alguma memória (níveis e ritmos)?
  const hasMemory = (S) => !!(S.hist && S.hist.s.some((b, i) => b && S.hist.n[i] >= 1) && S.hist.s.some((b) => b && b.nd >= 1));
  Off.hasMemory = hasMemory;

  const workersOf = (S) => { let n = 0; for (const p of S.people) if (p.alive && !p.carriedBy && G.Family.age(S, p) >= 12) n++; return n; };

  // ---------- um dia resumido: o que o dia teria feito ----------
  function replayDay(job) {
    const S = job.S, se = S.ck.season;
    const b = job.bk[se] !== undefined ? job.bk[se] : (job.bk[se] = bucket(S, se));
    stockDay(job, b);
    if (b) {
      // habilidades de quem trabalha (o jovem aprende mais depressa, como no jogo aberto)
      for (const p of S.people) {
        if (!p.alive || p.carriedBy) continue;
        const age = G.Family.age(S, p);
        if (age < 12) continue;
        const f = age < 18 ? 1.5 : 1;
        for (const k in b.sk) if (b.sk[k] > 0) p.skills[k] = (p.skills[k] || 0) + b.sk[k] * f;
      }
      // a prática das descobertas que o povo já vinha treinando (a ideia em si sai nos ganchos do dia, como sempre)
      if (b.prat > 0 && S.tech) { const pr = S.tech.prat; for (const id in pr) if (!S.tech.known[id]) pr[id] += b.prat; }
    }
    buildDay(job, b);
    lifeDay(S);
    G.Sim.refresh(S);
  }
  // estoque: cada coisa volta, aos poucos, ao nível que a aldeia costuma manter por boca nesta estação (é assim que
  // ela vive com o jogo aberto: junta quando falta, para quando sobra). Aldeia que saiu na miséria não fica nela:
  // com o tempo, junta pelo menos uns dias de comida e a lenha do fogo.
  function stockDay(job, b) {
    const S = job.S, T = G.Tech, st = S.stock, acc = job.acc, tg = {};
    const mouths = Math.max(1, S.ctx ? S.ctx.mouths : 1);
    if (b) { for (const k in b.lv) if (st[k] !== undefined) tg[k] = b.lv[k] * mouths; }
    else { for (const k of T.FOOD) if (st[k]) tg[k] = st[k]; }
    let fv = 0;
    for (const k of T.FOOD) fv += (tg[k] || 0) * T.foodValue(k, S);
    const floor = C.REST_FOOD_DAYS * mouths * C.HUNGER_H * 24;
    if (fv < floor) {
      if (fv > 0) { const f = floor / fv; for (const k of T.FOOD) if (tg[k]) tg[k] *= f; }
      else { const k = S.ck.season === 3 || st.frutas === undefined ? 'peixe' : 'frutas'; tg[k] = floor / (T.foodValue(k, S) || 1); }
    }
    tg.madeira = Math.max(tg.madeira || 0, Math.min(40, 5 * mouths));
    for (const k in tg) {
      if (st[k] === undefined) continue;
      acc[k] = (acc[k] || 0) + (tg[k] - st[k]) / C.REST_TAU;
      const n = Math.trunc(acc[k]);
      if (!n) continue;
      acc[k] -= n;
      st[k] = Math.max(0, st[k] + n);
    }
    const cap = T.waterCap(S);
    if (st.agua > cap) st.agua = cap;
  }
  // obra marcada: o material sai do estoque (o que se junta no mato, o povo vai buscar) e o trabalho anda no ritmo de
  // sempre da aldeia, com um mínimo: obra marcada antes de fechar o jogo não fica parada
  const RAW = { madeira: 1, pedra: 1, argila: 1, fibra: 1 };
  function buildDay(job, b) {
    const S = job.S, Sim = G.Sim;
    if (!(S.vontades.construir | 0)) return;
    const workers = workersOf(S);
    if (!workers) return;
    let min = Math.max(b ? b.build || 0 : 0, Math.min(workers, 4) * 90), fetch = Math.min(workers, 6) * 5;
    for (let guard = 0; guard < 6 && min > 0; guard++) {
      Sim.refresh(S);
      const j = S.ctx.job;
      if (!j) return;
      const miss = Sim.missing(j);
      let left = 0;
      for (const k in miss) {
        let take = Math.min(miss[k], S.stock[k] || 0);
        if (take > 0) S.stock[k] -= take;
        if (take < miss[k] && RAW[k] && fetch > 0) { const f = Math.min(miss[k] - take, fetch); fetch -= f; take += f; }
        if (take > 0) j.have[k] = (j.have[k] || 0) + take;
        left += miss[k] - take;
      }
      if (left > 0) return;   // falta material: fica para amanhã
      const need = (1 - j.progress) * j.work;
      if (min >= need) { min -= need; j.progress = 1; Sim.complete(S, j.b); job.built++; }
      else { j.progress += min / j.work; min = 0; }
    }
  }
  // a vida do dia, sem simular ninguém: comeram, beberam, dormiram e se aqueceram do que a aldeia tem; conversaram
  // (é da conversa que nascem os pares novos e que o afeto dos pares não esfria); os fiéis rezaram de manhã
  function lifeDay(S) {
    const F = G.Family, st = S.stock, D = G.Deus;
    const fed = S.ctx.foodDays > 0.5, warm = S.ck.season !== 3 || st.madeira > 0;
    const statue = D && S.buildings.some((x) => x.type === 'estatua' && x.built);
    const talkers = [];
    for (const p of S.people) {
      if (!p.alive) continue;
      const n = p.needs;
      if (fed) n.fome = Math.max(n.fome, 65);
      n.sede = Math.max(n.sede, 65);
      n.energia = Math.max(n.energia, 80);
      if (warm) n.calor = Math.max(n.calor, 60);
      n.social = Math.max(n.social, 55);
      if (fed && warm) n.saude = Math.min(100, n.saude + C.HEALTH_REGEN_DAY);
      if (p.carriedBy) continue;
      const age = F.age(S, p);
      if (age >= 7) talkers.push(p);
      if (statue && age >= 7 && p.fe >= 60 && !p.labor && S.rng.chance(C.REST_PRAY)) {
        const b = D.prayerStatue(S, p);
        if (b) D.onPrayed(S, p, b);
      }
    }
    // umas conversas por dia, ao acaso; com o par, vale o que vale no jogo aberto
    const n = talkers.length;
    if (n < 2) return;
    const chats = Math.max(1, Math.round(n * C.REST_CHATS));
    for (let i = 0; i < chats; i++) {
      const a = talkers[S.rng.int(0, n - 1)];
      // uma em cada seis é com um par, se tiver
      const ps = S.rng.chance(0.16) ? F.partners(S, a).filter((q) => !q.carriedBy) : null;
      const b = ps && ps.length ? ps[S.rng.int(0, ps.length - 1)] : talkers[S.rng.int(0, n - 1)];
      if (a === b || F.feuding(S, a, b)) continue;
      a.rel[b.id] = (a.rel[b.id] || 0) + 1; b.rel[a.id] = (b.rel[a.id] || 0) + 1;
      F.onChat(S, a, b);
      if (S.povos && S.povos.mixed && G.Povos) G.Povos.onChat(S, a, b, 'papo');   // Etapa 12: a conversa aproxima os povos
    }
    // e as histórias ao pé do fogo, noite sim, noite não
    if (S.povos && S.povos.mixed && G.Povos) G.Povos.onGather(S, talkers, C.CONV_HISTORIA / 2);
  }

  // ---------- o plano ----------
  const nextDawn = (t) => { const d = Math.floor((t - DAWN) / DAY) * DAY + DAWN; return d >= t ? d : d + DAY; };   // a próxima 3 h (t incluso)
  const dawnIdx = (t) => Math.floor((t - DAWN) / DAY);
  // minutes: quanto tempo de jogo passou; opts: { budget, hard } em ms de relógio (o padrão vem da configuração)
  Off.start = function (S, minutes, opts) {
    opts = opts || {};
    const t0 = S.t, tEnd = S.t + Math.max(0, Math.floor(minutes));
    const job = {
      S, t0, tEnd, total: Math.max(1, tEnd - t0), acc: {}, bk: {}, built: 0,
      budget: opts.budget || C.OFFLINE_BUDGET_MS, hard: opts.hard || C.OFFLINE_HARD_MS,
      spent: 0, msFull: 0, minFull: 0, msRest: 0, daysRest: 0, daysFull: 0,
      mode: 'full', until: tEnd, kind: 'tail', tailStart: t0, mids: [], planned: false, stop: false, done: false,
      before: { t: S.t, stock: Object.assign({}, S.stock), chron: S.chron.length, built: S.buildings.filter((b) => b.built).length, births: S.stats.births || 0 },
    };
    S.safe = true;
    Off.last = job; job.wall0 = now();   // para os testes e a medida
    Sim().refresh(S);
    if (tEnd - t0 <= 6 * 60) return job;   // saiu um instante: tudo inteiro
    job.tailStart = tEnd - TAIL;
    // aldeia sem memória: os dois primeiros dias inteiros (até passar a segunda meia-noite), para ela se conhecer
    const lead = hasMemory(S) ? t0 : (Math.floor(t0 / DAY) + 2) * DAY + 1;
    if (lead >= job.tailStart) { job.tailStart = t0; return job; }   // curto demais para resumir
    if (lead > t0) { job.until = lead; job.kind = 'lead'; }
    else {
      job.mode = 'rest';
      // o primeiro dia inteiro do meio é logo a primeira madrugada: mede o aparelho e deixa o povo dormindo em casa
      const d = nextDawn(t0);
      if (job.tailStart - d >= 4 * DAY) job.mids.push(d);
      else job.planned = true;
    }
    return job;
  };
  function Sim() { return G.Sim; }
  // medido o aparelho num trecho inteiro: quantos dias inteiros ainda cabem pelo meio, no orçamento
  function planMids(job) {
    const S = job.S, from = nextDawn(S.t), R = Math.floor((job.tailStart - from) / DAY);
    job.planned = true; job.mids = [];
    if (R < 6 || !(job.minFull > 0)) return;
    const perDay = job.msFull / job.minFull * DAY;   // ms de relógio por dia inteiro
    const restDay = job.daysRest >= 3 ? job.msRest / job.daysRest : perDay / 150;
    const m = Math.floor((job.budget - job.spent - perDay * TAIL / DAY - R * restDay) / perDay);
    const M = Math.max(0, Math.min(m, Math.floor(R / 6)));
    for (let i = 1; i <= M; i++) job.mids.push(from + Math.round(i * R / (M + 1)) * DAY);
  }
  function endRest(job) {
    const S = job.S;
    if (!S.resumido) return;
    S.resumido = false;
    if (G.Campo && G.Campo.afterRest) G.Campo.afterRest(S);
    Sim().refresh(S);
  }

  // roda até acabar ou até gastar maxMs; devolve true quando acabou
  Off.advance = function (job, maxMs) {
    const S = job.S, t0 = now();
    const over = () => now() - t0 > maxMs;
    while (!job.done && !S.over) {
      if (job.stop) { job.done = true; break; }
      if (job.mode === 'full') {
        // trecho inteiro: a simulação de sempre, em modo seguro
        const tA = now(), sA = S.t;
        let out = false, cut = false;
        while (S.t < job.until && !S.over) {
          Sim().step(S, Math.min(DT, job.until - S.t));
          if (S.events.length > 50) S.events.length = 0;
          // aparelho lento: o dia do meio para onde está (o começo, só passando do teto)
          const sp = job.spent + (now() - tA);
          if ((job.kind === 'mid' && sp > job.budget * 0.7) || (job.kind === 'lead' && sp > job.budget * 1.6)) { cut = true; break; }
          if (job.stop || over()) { out = true; break; }
        }
        const ms = now() - tA;
        job.msFull += ms; job.minFull += S.t - sA; job.spent += ms; job.daysFull += (S.t - sA) / DAY;
        if (out && S.t < job.until) break;
        if (S.t >= job.tEnd) { job.done = true; break; }
        // acabou um trecho inteiro: volta aos dias resumidos (com o que o trecho ensinou à memória da aldeia)
        job.bk = {};
        if (cut) { job.planned = true; job.mids = []; }
        else if (!job.planned) planMids(job);
        job.mode = 'rest';
      } else {
        // dias resumidos, hora a hora, até o próximo trecho inteiro (um dia do meio ou o fim)
        if (S.t >= job.tailStart) { endRest(job); job.mode = 'full'; job.kind = 'tail'; job.until = job.tEnd; continue; }
        if (job.mids.length && S.t >= job.mids[0]) {
          while (job.mids.length && job.mids[0] <= S.t) job.mids.shift();
          if (job.spent <= job.budget && S.t + DAY < job.tailStart) { endRest(job); job.mode = 'full'; job.kind = 'mid'; job.until = S.t + DAY; continue; }
        }
        S.resumido = true;
        const tA = now();
        let out = false;
        for (let h = 0; h < 24 && S.t < job.tailStart && !S.over; h++) {
          const d = dawnIdx(S.t);
          Sim().step(S, Math.min(60, job.tailStart - S.t));
          if (dawnIdx(S.t) !== d) { replayDay(job); job.daysRest++; S.events.length = 0; if (job.mids.length && S.t >= job.mids[0]) break; }
          if (h % 6 === 5 && (job.stop || over())) { out = true; break; }
        }
        if (S.events.length > 200) S.events.length = 0;
        const ms = now() - tA;
        job.msRest += ms; job.spent += ms;
        // aparelho lento demais até para resumir: o resto do tempo deixa de passar (o resumo diz quantos dias foram)
        if (job.spent > job.hard * 2) { endRest(job); job.tEnd = S.t; job.cut = true; job.done = true; break; }
        if (out) break;
      }
    }
    return job.done || S.over;
  };
  // 0 a 1, para a barra
  Off.progress = (job) => Math.max(0, Math.min(1, (job.S.t - job.t0) / job.total));
  Off.finish = function (job) {
    const S = job.S, before = job.before;
    job.wall = now() - job.wall0;
    endRest(job);
    S.events.length = 0;
    S.safe = false;
    for (const p of S.people) p.prayer = null;
    Sim().refresh(S);
    const alive = S.people.filter((p) => p.alive);
    return {
      minutes: S.t - before.t,
      days: (S.t - before.t) / C.DAY_MIN,
      from: before.t, to: S.t,
      stockBefore: before.stock, stockAfter: Object.assign({}, S.stock),
      newChron: S.chron.slice(before.chron),
      built: S.buildings.filter((b) => b.built).length - before.built,
      alive: alive.map((p) => ({ name: p.name, saude: Math.round(p.needs.saude), humor: p.mood })),
      born: (S.stats.births || 0) - before.births, planned: job.total / C.DAY_MIN,
      early: !!job.stop, cut: !!job.cut, ms: Math.round(job.spent), daysFull: +job.daysFull.toFixed(1), daysRest: job.daysRest,
    };
  };
  // tudo de uma vez (testes e Node)
  Off.run = function (S, minutes, opts) {
    const job = Off.start(S, minutes, opts);
    Off.advance(job, Infinity);
    return Off.finish(job);
  };
  // no navegador: fatias de ~80 ms com a tela respirando entre elas; devolve o trabalho (job.stop = true: "Entrar agora")
  Off.runAsync = function (S, minutes, onProgress, onDone) {
    const job = Off.start(S, minutes);
    const later = typeof MessageChannel !== 'undefined' ? (() => { const ch = new MessageChannel(); let fn = null; ch.port1.onmessage = () => { const f = fn; fn = null; if (f) f(); }; return (f) => { fn = f; ch.port2.postMessage(0); }; })() : (f) => setTimeout(f, 0);
    let last = 0;
    const tick = () => {
      const done = Off.advance(job, 80);
      if (done) { if (onProgress) onProgress(1, job); onDone(Off.finish(job)); return; }
      // a barra anda umas 8 vezes por segundo (pintar a cada fatia custaria mais que o cálculo)
      const t = now();
      if (t - last > 120) { last = t; if (onProgress) onProgress(Off.progress(job), job); setTimeout(tick, 0); }
      else later(tick);
    };
    setTimeout(tick, 0);
    return job;
  };
})(globalThis.G = globalThis.G || {});
