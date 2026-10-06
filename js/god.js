/* Gods · Deus: Fé, Poder, orações, milagres e alinhamento (Etapa 2). Os níveis, os dons, o nome e os grandes atos
   (Etapa 11) moram em deus.js: aqui só os ganchos (God.gain soma Poder e glória; os dons mudam custo e alcance). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const God = G.God = {};
  const Dz = () => G.Deus;
  const dom = (S, id) => !!(G.Deus && G.Deus.dom(S, id));
  const DM = () => C.DOM || {};

  God.MIRACLES = {
    calor: { name: 'Calor', cost: 10, r: 5, icon: 'fogo', desc: 'Aquece e protege um lugar por uma noite inteira.', answers: 'frio lobos' },
    raio: { name: 'Raio', cost: 15, r: 0.9, icon: 'raio', desc: 'Derruba árvore ou pedra e espanta lobos e onça. Em alguém, pune.', answers: 'lobos onca' },
    chuva: { name: 'Chuva', cost: 15, r: 12, icon: 'chuva', desc: 'Frutas fora de época, cabaças cheias e roça crescendo.', answers: 'fome sede' },
    cura: { name: 'Cura', cost: 20, r: 0.9, icon: 'cura', desc: 'Devolve a saúde de alguém e salva um parto difícil.', answers: 'parto doente', unlock: 'familia' },
    revelacao: { name: 'Revelação', cost: C.REVELACAO_COST, r: 0.9, icon: 'revelacao', desc: 'Num sonho, entrega a alguém a próxima descoberta, se o povo já começou a entender.', answers: '', unlock: 'descoberta' },
    bencao: { name: 'Bênção', cost: C.BENCAO_COST, r: C.BENCAO_R, icon: 'bencao', desc: 'Por 2 dias, quem trabalha ali colhe, caça, pesca e junta metade a mais, e a roça ali rende metade a mais na colheita.', answers: '', unlock: 'nivel2' },
  };
  const LOCKED = { familia: 'A Cura chega com o primeiro filho.', descoberta: 'A Revelação chega com a primeira descoberta.', nivel2: 'A Bênção chega com o nível 2 de Deus.' };
  const PRAYERS = {
    frio: ['Deus, está frio demais.', 'Céu, manda um pouco de calor.'],
    fome: ['Deus, temos fome.', 'Céu, não deixa a gente passar fome.'],
    sede: ['Deus, precisamos de água.', 'Céu, manda chuva, por favor.'],
    lobos: ['Deus, os lobos!', 'Céu, espanta esses lobos!', 'Deus, protege a gente dos lobos!'],
    onca: ['Deus, a onça!', 'Céu, tira essa onça daqui!', 'Deus, protege a gente da onça!'],
  };
  const THANKS = ['Ele ouviu!', 'Obrigado, céu!', 'Eu sabia que alguém olhava por nós.'];
  God.PRAYER_HELP = { frio: 'calor', fome: 'chuva', sede: 'chuva', parto: 'cura', doente: 'cura', lobos: 'raio', onca: 'raio' };
  const PRAYER_H = { lobos: 2, onca: 2 };   // prazo curto: lobo e onça não esperam
  God.unlocked = (S, kind) => {
    const m = God.MIRACLES[kind];
    if (!m || !m.unlock) return true;
    if (m.unlock === 'familia') return (S.stats.births || 0) > 0;
    if (m.unlock === 'descoberta') return !!(G.Tech && G.Tech.count(S) > 0);
    if (m.unlock === 'nivel2') return !!(G.Deus && G.Deus.level(S) >= 2);
    return false;
  };
  God.lockedText = (kind) => LOCKED[(God.MIRACLES[kind] || {}).unlock] || '';
  // Etapa 11: os dons mudam o preço e o alcance dos milagres
  God.cost = function (S, kind) {
    const m = God.MIRACLES[kind];
    if (!m) return 0;
    const d = DM();
    if (kind === 'cura' && dom(S, 'maos')) return d.maosCost;
    if (kind === 'chuva' && dom(S, 'ceu')) return d.ceuCost;
    if (kind === 'raio' && dom(S, 'trovao')) return d.trovaoCost;
    if (kind === 'revelacao' && dom(S, 'sonhos')) return d.sonhosCost;
    return m.cost;
  };
  God.radius = function (S, kind) {
    const m = God.MIRACLES[kind];
    if (!m) return 0;
    if (kind === 'calor' && dom(S, 'fogo')) return DM().fogoR;
    return m.r;
  };
  // todo Poder que entra passa por aqui: a glória é o Poder que Deus já recebeu na vida (não cai quando se gasta)
  God.gain = function (S, n) {
    const g = S.god;
    if (!g || !(n > 0)) return;
    g.poder += n;
    g.glory = (g.glory || 0) + n;
  };
  // nas falas, depois que o povo dá um nome, "Deus" (e o "céu" a quem se fala) vira o nome
  God.named = function (S, text) {
    const n = S && S.god && S.god.name;
    return n && text ? String(text).replace(/\bDeus\b/g, n).replace(/(^|\s)[Cc]éu(?=[,.!?]|$)/g, '$1' + n) : text;
  };

  const has = (p, t) => p.traits.indexOf(t) >= 0;
  function Sim() { return G.Sim; }

  God.init = function (S) {
    if (!S.god) S.god = { poder: C.POWER_START, align: 0, auras: [], rainUntil: 0, lastGrace: -1e9, answered: 0, ignored: 0, miracles: 0 };
    for (const p of S.people) {
      if (p.fe === undefined) p.fe = has(p, 'Devoto') ? 65 : has(p, 'Cético') ? 35 : C.FAITH_START;
      if (p.prayer === undefined) p.prayer = null;
      if (p.prayCool === undefined) p.prayCool = 0;
    }
  };

  // fé com peso dos traços e do alinhamento
  God.faith = function (S, p, delta) {
    if (!p.alive || !delta) return;
    let d = delta;
    if (d > 0) { if (has(p, 'Devoto')) d *= 1.5; if (has(p, 'Cético')) d *= 0.5; if (S.god.align > 30) d *= 1.2; }
    else { if (has(p, 'Devoto')) d *= 0.5; if (has(p, 'Cético')) d *= 1.5; if (S.god.align < -30) d *= 0.7; }
    p.fe = U.clamp(p.fe + d, 0, 100);
    if (p.fe >= 99.5) p.fe100At = S.t;   // Etapa 11: fé inteira (quem chega lá pode virar escolhido)
  };
  God.align = function (S, d) { S.god.align = U.clamp(S.god.align + d, -100, 100); };

  // expoente que aplica às Vontades: fé alta obedece mais
  God.obedience = function (S, p) {
    let o = 0.6 + 0.8 * (p.fe === undefined ? 50 : p.fe) / 100;
    if (has(p, 'Devoto')) o += 0.2;
    if (has(p, 'Cético')) o -= 0.25;
    if (S.god && S.god.align < -30) o += 0.15;
    if (dom(S, 'temor')) o += DM().temorObed;
    return U.clamp(o, 0.35, 1.8);
  };

  God.heatAt = function (S, x, y) {
    if (!S.god) return 0;
    let best = 0;
    for (const a of S.god.auras) {
      const d = Math.hypot(a.x + 0.5 - x, a.y + 0.5 - y);
      if (d <= a.r) best = Math.max(best, C.CALOR_HEAT * (d < a.r * 0.6 ? 1 : (a.r - d) / (a.r * 0.4)));
    }
    if (G.Deus && S.god.pending) best = Math.max(best, G.Deus.heatAt(S, x, y));   // a Luz do escolhido e a estátua do fogo
    return best;
  };

  function near(p, x, y, r) { return Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5)) <= r; }

  // ---------- orações ----------
  const PRAY_FOR = {
    filha: (q) => 'Deus, cure minha filha ' + q.name + '.', filho: (q) => 'Deus, cure meu filho ' + q.name + '.',
    companheira: (q) => 'Deus, salve a ' + q.name + '.', companheiro: (q) => 'Deus, salve o ' + q.name + '.',
    'mãe': () => 'Deus, cure a minha mãe.', pai: () => 'Deus, cure o meu pai.',
    'irmã': (q) => 'Deus, cuida da ' + q.name + '.', 'irmão': (q) => 'Deus, cuida do ' + q.name + '.',
  };
  function wantPrayer(S, p) {
    const n = p.needs, ctx = S.ctx, Fm = G.Family;
    const cura = God.unlocked(S, 'cura');
    // parto difícil: ela reza, e quem ama reza por ela
    if (p.labor && p.labor.hard && !p.labor.helped) return { kind: 'parto', target: p.id, text: God.named(S, 'Deus, me ajuda neste parto!') };
    for (const mate of Fm.partners(S, p)) {
      if (mate.labor && mate.labor.hard && !mate.labor.helped) return { kind: 'parto', target: mate.id, text: God.named(S, 'Deus, salva a ' + mate.name + ' e o bebê!') };
    }
    if (cura) {
      for (const k of Fm.family(S, p)) {
        const q = k.q;
        if (!q.alive || q.labor || q.needs.saude >= 35 || !PRAY_FOR[k.r]) continue;
        if (S.people.some((o) => o.prayer && o.prayer.kind === 'doente' && o.prayer.target === q.id)) continue;
        return { kind: 'doente', target: q.id, text: God.named(S, PRAY_FOR[k.r](q)) };
      }
      if (n.saude < 30 && !p.labor) return { kind: 'doente', target: p.id, text: God.named(S, 'Deus, me cura.') };
    }
    const th = G.Narr && G.Narr.threat(S, p);
    if (th) { const k = th.k === 'onca' ? 'onca' : 'lobos'; return { kind: k, target: p.id, text: God.named(S, S.rng.pick(PRAYERS[k])) }; }
    if (n.calor < 35 && p.tempHere < 10 && !(ctx.fireLit && G.Sim.fireHeat(S, p.x, p.y) > 5) && !(G.Deus && G.Deus.heatAt(S, p.x, p.y) > 5)) return { kind: 'frio', target: p.id, text: God.named(S, S.rng.pick(PRAYERS.frio)) };
    if (n.fome < 25 && ctx.food === 0 && ctx.bushFruit < 3) return { kind: 'fome', target: p.id, text: God.named(S, S.rng.pick(PRAYERS.fome)) };
    if (n.sede < 25 && S.stock.agua === 0) return { kind: 'sede', target: p.id, text: God.named(S, S.rng.pick(PRAYERS.sede)) };
    return null;
  }
  function stillNeeds(S, p, pr) {
    const n = p.needs, kind = pr.kind;
    const t = G.Family.person(S, pr.target) || p;
    if (kind === 'frio') return n.calor < 60;
    if (kind === 'fome') return n.fome < 55 && S.ctx.food < 3;
    if (kind === 'sede') return n.sede < 60;
    if (kind === 'parto') return !!(t.alive && t.labor && t.labor.hard && !t.labor.helped);
    if (kind === 'doente') return t.alive && t.needs.saude < 60;
    if (kind === 'lobos') return !!(G.Narr && G.Narr.wolvesOut(S));
    if (kind === 'onca') return !!(G.Narr && G.Narr.oncaOut(S));
    return false;
  }
  // agradecimento (e luto): não pede nada, não espera resposta; a fé de quem agradece vira Poder (Etapa 6)
  God.thank = function (S, p, text, poder, loud, kind) {
    const g = S.god;
    if (!g || !p || !p.alive) return false;
    God.gain(S, poder);
    g.thanks = (g.thanks || 0) + 1;
    g.thanksPoder = (g.thanksPoder || 0) + poder;
    if (kind !== 'luto') { God.faith(S, p, 2); G.Sim.addMem(S, p, 'agradeceu'); }
    text = God.named(S, text);
    if (text) G.Sim.say(S, p, text, true, 'god');
    if (loud && text) S.events.push({ k: 'thanks', pid: p.id, kind: kind || 'gratidao', poder, text: p.name + (kind === 'luto' ? ' reza: “' : ' agradece: “') + text + '” +' + poder + ' de Poder' });
    return true;
  };
  const MORNING = [(p) => 'Obrigad' + (p.sex === 'F' ? 'a' : 'o') + ' por mais um dia.', () => 'Bom dia, céu.', () => 'Cuida da gente hoje, tá?'];
  God.hourly = function (S) {
    const g = S.god, Sm = G.Sim;
    // Poder nasce da fé do povo, e não tem teto (Etapa 6): guarde para os grandes atos
    let sum = 0;
    for (const p of S.people) if (p.alive) sum += p.fe / 100;
    God.gain(S, sum * C.POWER_PER_FAITH_H * (dom(S, 'chama') ? DM().chamaPoder : 1));
    g.auras = g.auras.filter((a) => a.until > S.t);
    if (G.Deus && g.pending) G.Deus.hourly(S);   // Etapa 11: níveis, estátuas, avisos
    if (S.safe) return;   // com o jogo fechado ninguém reza nem é ignorado
    // de manhã, quem tem muita fé agradece pelo dia
    if (Math.floor(S.ck.hour) === 7) {
      for (const p of S.people) {
        if (!p.alive || p.sleeping || p.carriedBy || p.prayer || G.Family.age(S, p) < 7) continue;
        if (p.fe < (has(p, 'Devoto') ? 55 : 70) || !S.rng.chance(0.3)) continue;
        God.thank(S, p, S.rng.pick(MORNING)(p), C.THANKS.manha, false);
      }
    }
    for (const p of S.people) {
      if (!p.alive) continue;
      if (p.prayer) {
        if (!stillNeeds(S, p, p.prayer)) { p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60; continue; }
        if (S.t >= p.prayer.until) {
          God.faith(S, p, C.FAITH_IGNORED);
          for (const q of S.people) if (q !== p && q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 10) God.faith(S, q, C.FAITH_IGNORED_SEEN);
          Sm.addMem(S, p, 'oracaoIgnorada');
          g.ignored++;
          Sm.toast(S, 'Ninguém respondeu à oração de ' + p.name + '. A fé caiu.', 'bad');
          p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60;
        }
        continue;
      }
      if (p.carriedBy || G.Family.age(S, p) < 5) continue;
      const want = wantPrayer(S, p);
      if (!want) continue;
      // no parto se reza acordado ou não, de barraca ou não
      if (want.kind !== 'parto' && (p.sleeping || p.inTent || p.prayCool > S.t)) continue;
      // parto: prazo é o próprio parto; o resto espera 12 h
      const until = want.kind === 'parto' ? G.Family.person(S, want.target).labor.until : S.t + (PRAYER_H[want.kind] || C.PRAYER_HOURS) * 60 * (dom(S, 'ouvido') ? 2 : 1);
      p.prayer = { kind: want.kind, target: want.target, text: want.text, t0: S.t, until };
      Sm.say(S, p, want.text, true);
      S.events.push({ k: 'prayer', pid: p.id, text: p.name + ' reza: “' + want.text + '”' });
    }
  };

  God.daily = function (S) {
    const g = S.god;
    const graced = S.t - g.lastGrace < 3 * C.DAY_MIN;
    const base = graced ? 70 : dom(S, 'chama') ? DM().chamaFloor : 35;
    for (const p of S.people) {
      if (!p.alive) continue;
      // sem sinal de Deus a fé esfria até 35; com sinais recentes, aquece até 70; o escolhido fica perto de 90
      const target = p.escolhido ? Math.max(base, 90) : base;
      if (p.fe > target) p.fe = Math.max(target, p.fe - 0.7);
      else p.fe = Math.min(target, p.fe + 0.7);
    }
    if (G.Deus && g.pending) G.Deus.daily(S);
    // o alinhamento volta devagar ao centro
    g.align = g.align > 0 ? Math.max(0, g.align - 1) : Math.min(0, g.align + 1);
  };

  // oração que ninguém atendeu a tempo (ex.: o parto acabou sem ajuda)
  God.ignorePrayers = function (S, kinds, targetId) {
    const Sm = G.Sim;
    for (const p of S.people) {
      if (!p.alive || !p.prayer || kinds.indexOf(p.prayer.kind) < 0 || p.prayer.target !== targetId) continue;
      God.faith(S, p, C.FAITH_IGNORED);
      Sm.addMem(S, p, 'oracaoIgnorada');
      S.god.ignored++;
      p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60;
    }
  };
  // pedido na hora, sem esperar a volta do relógio (mordida de lobo ou de onça)
  God.cry = function (S, p, kind) {
    if (S.safe || !p.alive || p.prayer || p.carriedBy || G.Family.age(S, p) < 5 || !PRAYERS[kind]) return false;
    const text = God.named(S, S.rng.pick(PRAYERS[kind]));
    p.prayer = { kind, target: p.id, text, t0: S.t, until: S.t + (PRAYER_H[kind] || C.PRAYER_HOURS) * 60 * (dom(S, 'ouvido') ? 2 : 1) };
    G.Sim.say(S, p, text, true);
    S.events.push({ k: 'prayer', pid: p.id, text: p.name + ' reza: “' + text + '”' });
    return true;
  };
  God.onBirth = function (S, baby, mom, dad) {
    for (const q of [mom, dad]) if (q && q.alive) God.faith(S, q, C.FAITH_MIRACLE_SEEN);
  };
  God.onDeath = function (S, dead) {
    for (const q of S.people) if (q.alive) God.faith(S, q, C.FAITH_DEATH);
    if (G.Deus && S.god && S.god.pending) G.Deus.onDeath(S, dead);
  };

  // a oração atendida: o agradecimento vira Poder (o dobro com o Ouvido Atento), e o cético vê um sinal
  function thanked(S, p) {
    const th = C.THANKS.oracao * (dom(S, 'ouvido') ? DM().ouvidoMult : 1);
    S.god.answered++;
    God.gain(S, th); S.god.thanksPoder = (S.god.thanksPoder || 0) + th;
    God.align(S, 5);
    S.events.push({ k: 'toast', text: 'Você atendeu à oração de ' + p.name + '. A fé subiu, e o agradecimento dá +' + th + ' de Poder.', tone: 'good' });
    if (G.Deus) G.Deus.sinal(S, p, 'atendida');
  }
  function answer(S, kindNeeded, x, y, r) {
    const Sm = G.Sim;
    let n = 0;
    for (const p of S.people) {
      if (!p.alive || !p.prayer) continue;
      if (kindNeeded.indexOf(p.prayer.kind) < 0) continue;
      if (!near(p, x, y, r + 1)) continue;
      God.faith(S, p, C.FAITH_ANSWER);
      for (const q of S.people) if (q !== p && q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 10) God.faith(S, q, C.FAITH_ANSWER_SEEN);
      Sm.addMem(S, p, 'oracaoAtendida');
      Sm.say(S, p, God.named(S, S.rng.pick(THANKS)), true, 'god');
      thanked(S, p);
      // atendida, pode pedir de novo quando o milagre acabar
      p.prayer = null; p.prayCool = S.t + C.PRAYER_ANSWERED_COOLDOWN_H * 60;
      n++;
    }
    return n;
  }

  // atende todas as orações de um tipo, estejam onde estiverem (o raio que espanta a matilha salva todo mundo)
  God.answerKind = function (S, kinds) { return answer(S, kinds, 0, 0, Infinity); };

  function answerTarget(S, kinds, targetId) {
    const Sm = G.Sim;
    let n = 0;
    for (const p of S.people) {
      if (!p.alive || !p.prayer || kinds.indexOf(p.prayer.kind) < 0 || p.prayer.target !== targetId) continue;
      God.faith(S, p, C.FAITH_ANSWER);
      Sm.addMem(S, p, 'oracaoAtendida');
      Sm.say(S, p, God.named(S, S.rng.pick(THANKS)), true, 'god');
      thanked(S, p);
      p.prayer = null; p.prayCool = S.t + C.PRAYER_ANSWERED_COOLDOWN_H * 60;
      n++;
    }
    return n;
  }
  God.answerTarget = answerTarget;
  // quem a Cura alcança: o mais fraco perto do toque (bebês no colo contam)
  God.curaTarget = function (S, x, y) {
    let best = null;
    for (const p of S.people) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
      if (d > 1.3) continue;
      if (!best || p.needs.saude < best.needs.saude || (p.labor && !best.labor)) best = p;
    }
    return best;
  };

  // quem recebe a Revelação: a pessoa mais perto do toque, de 7 anos para cima
  God.dreamTarget = function (S, x, y) {
    let best = null, bd = 1.3;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || G.Family.age(S, p) < 7) continue;
      const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
      if (d <= bd) { bd = d; best = p; }
    }
    return best;
  };

  // ---------- milagres ----------
  God.canCast = function (S, kind) {
    const m = God.MIRACLES[kind];
    if (!m) return 'Milagre desconhecido';
    if (!God.unlocked(S, kind)) return God.lockedText(kind);
    if (kind === 'revelacao') { const why = G.Tech.canReveal(S); if (why) return why; }
    const cost = God.cost(S, kind);
    if (S.god.poder < cost) return 'Falta Poder: precisa de ' + cost + '.';
    return '';
  };
  // free: o milagre que a estátua faz sozinha (sem custo, sem névoa, não conta como milagre do jogador)
  God.cast = function (S, kind, x, y, free) {
    const why = free ? (God.MIRACLES[kind] ? '' : 'Milagre desconhecido') : God.canCast(S, kind);
    if (why) return { ok: false, msg: why };
    const Sm = G.Sim, w = S.world, g = S.god, Dd = Dz(), dm = DM();
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return { ok: false, msg: 'Fora do mundo.' };
    if (!free && !Sm.isSeen(S, x, y)) return { ok: false, msg: 'A névoa cobre esse lugar. Deus só age onde o povo já esteve.' };
    const healed = kind === 'cura' ? God.curaTarget(S, x, y) : null;
    if (kind === 'cura' && !healed) return { ok: false, msg: 'Toque em alguém para curar.' };
    const dreamer = kind === 'revelacao' ? God.dreamTarget(S, x, y) : null;
    if (kind === 'revelacao' && !dreamer) return { ok: false, msg: 'Toque em alguém (de 7 anos ou mais) para revelar.' };
    if (!free) {
      g.poder -= God.cost(S, kind);
      g.miracles++;
      if (g.deeds) g.deeds[kind] = (g.deeds[kind] || 0) + 1;   // Etapa 11: o que Deus mais faz vira o título dele
    }
    g.lastGrace = S.t;
    let msg = '';
    // quem viu, se admira (e o cético conta um sinal)
    for (const p of S.people) if (p.alive && near(p, x, y, 8)) {
      God.faith(S, p, C.FAITH_MIRACLE_SEEN);
      if (kind !== 'raio') Sm.addMem(S, p, 'viuMilagre');
      if (Dd) Dd.sinal(S, p, 'milagre');
    }
    if (kind === 'revelacao') {
      const id = G.Tech.reveal(S, dreamer);
      God.faith(S, dreamer, C.FAITH_ANSWER);
      for (const q of S.people) if (q.alive && q !== dreamer) God.faith(S, q, C.FAITH_MIRACLE_SEEN);
      God.align(S, 3);
      if (Dd) Dd.sinal(S, dreamer, 'sonho');
      Sm.say(S, dreamer, 'Eu vi… eu sei como fazer!', true);
      msg = 'Revelação: ' + dreamer.name + ' sonhou com ' + G.Tech.DISC[id].name.toLowerCase() + '.';
      S.events.push({ k: 'miracle', kind, x: Math.floor(dreamer.x), y: Math.floor(dreamer.y) });
    } else if (kind === 'cura') {
      const h = healed, wasLabor = !!(h.labor && h.labor.hard && !h.labor.helped);
      h.needs.saude = Math.min(100, h.needs.saude + C.CURA_HEAL);
      h.dmg.raio = 0; h.dmg.parto = 0;
      if (h.labor) h.labor.helped = true;
      Sm.addMem(S, h, 'curado');
      God.faith(S, h, C.FAITH_ANSWER_SEEN);
      God.align(S, 4);
      if (Dd) Dd.sinal(S, h, 'curado');
      answerTarget(S, ['parto', 'doente'], h.id);
      // Mãos de Luz: quem está do lado também sara (pela metade)
      let also = [];
      if (dom(S, 'maos')) {
        for (const q of S.people) {
          if (!q.alive || q === h || q.needs.saude >= 95 || Math.hypot(q.x - h.x, q.y - h.y) > dm.maosR) continue;
          q.needs.saude = Math.min(100, q.needs.saude + C.CURA_HEAL * dm.maosHeal);
          q.dmg.raio = 0;
          if (q.labor) q.labor.helped = true;
          Sm.addMem(S, q, 'curado');
          answerTarget(S, ['parto', 'doente'], q.id);
          also.push(q);
        }
      }
      msg = 'Cura sobre ' + h.name + ': a saúde voltou.' + (wasLabor ? ' O parto vai correr bem.' : '') + (also.length ? ' A luz tocou também ' + Sm.listNames(also) + '.' : '');
      S.events.push({ k: 'miracle', kind, x: Math.floor(h.x), y: Math.floor(h.y) });
    } else if (kind === 'calor') {
      const r = God.radius(S, 'calor'), hours = dom(S, 'fogo') ? dm.fogoH : C.CALOR_HOURS;
      g.auras.push({ x, y, r, until: S.t + hours * 60 });
      God.align(S, 3);
      const n = answer(S, 'frio lobos', x, y, r);
      msg = 'Calor sobre o lugar por ' + hours + ' horas.' + (n ? '' : '');
      S.events.push({ k: 'miracle', kind, x, y });
    } else if (kind === 'bencao') {
      // Etapa 11: por 2 dias, o trabalho ali rende metade a mais (e a roça ali, na colheita)
      const r = God.radius(S, 'bencao');
      g.blessings = g.blessings || [];
      g.blessings.push({ x, y, r, until: S.t + C.BENCAO_H * 60 });
      const rocas = G.Campo && G.Campo.onBencao ? G.Campo.onBencao(S, x, y, r) : 0;
      God.align(S, 2);
      for (const p of S.people) if (p.alive && near(p, x, y, r)) God.faith(S, p, 2);
      msg = 'Bênção sobre o lugar por ' + Math.round(C.BENCAO_H / 24) + ' dias: quem trabalha ali rende metade a mais.' + (rocas ? (rocas === 1 ? ' A roça abençoada vai dar mais na colheita.' : ' As roças abençoadas vão dar mais na colheita.') : '');
      S.events.push({ k: 'miracle', kind, x, y });
    } else if (kind === 'chuva') {
      g.rainUntil = Math.max(g.rainUntil, S.t + C.CHUVA_HOURS * 60);
      const ceu = dom(S, 'ceu');
      let fruits = 0;
      for (const o of w.objs) {
        if (o.k !== 'bush' || Math.hypot(o.x - x, o.y - y) > C.CHUVA_R) continue;
        const before = o.fruit, cap = o.holy ? C.ARVORE_MAX : C.BUSH_MAX;
        o.fruit = Math.max(before, Math.min(cap, o.fruit + C.CHUVA_FRUIT * (ceu ? dm.ceuFruit : 1)));
        fruits += o.fruit - before;
      }
      const water = Math.min(C.CHUVA_WATER * (ceu ? 2 : 1), G.Tech.waterCap(S) - S.stock.agua);
      if (Math.hypot(S.camp.x - x, S.camp.y - y) <= C.CHUVA_R + 2) S.stock.agua += Math.max(0, water);
      God.align(S, 3);
      answer(S, 'fome sede', x, y, C.CHUVA_R);
      Sm.refresh(S);
      const dry = G.Narr ? G.Narr.onChuva(S) : '';
      const rocas = G.Campo ? G.Campo.onChuva(S, x, y, ceu ? dm.ceuRoca : 0) : 0;   // Etapa 10: a roça molhada cresce uns dias de uma vez
      msg = 'Chuva abençoada: ' + fruits + ' frutas nasceram nos arbustos.' + (rocas ? (rocas === 1 ? ' A roça cresceu a olhos vistos.' : ' As roças cresceram a olhos vistos.') : '') + (dry ? ' ' + dry : '');
      S.events.push({ k: 'miracle', kind, x, y });
    } else if (kind === 'raio') {
      S.events.push({ k: 'bolt', x, y });
      const i = y * w.W + x;
      // lobo perto do raio: o raio é dele (e o trovão espanta a matilha)
      const trov = dom(S, 'trovao');
      const wolf = G.Narr ? G.Narr.onRaio(S, x, y, trov ? dm.trovaoR : 0) : null;
      const hit = wolf ? null : S.people.find((p) => p.alive && !p.inTent && near(p, x, y, C.RAIO_R));
      const game = wolf || hit || !G.Fauna ? null : G.Fauna.onRaio(S, x, y);   // capivara: carne e couro
      const o = wolf || game ? null : G.W.objAt(w, i);
      if (wolf) msg = wolf;
      else if (game) msg = game;
      else if (hit) {
        hit.needs.saude -= C.RAIO_DAMAGE;
        hit.dmg.raio = (hit.dmg.raio || 0) + C.RAIO_DAMAGE;
        Sm.addMem(S, hit, 'atingidoRaio');
        God.faith(S, hit, 6);
        for (const q of S.people) if (q !== hit && q.alive) { Sm.addMem(S, q, 'viuRaio'); God.faith(S, q, 4); }
        God.align(S, -15);
        Sm.say(S, hit, 'Perdão! Perdão!', true);
        msg = 'O raio atingiu ' + hit.name + '. O povo teme você.';
      } else if (o && o.k === 'tree') {
        o.k = 'stump'; o.regrow = 0; G.W.refreshBlock(w, i);
        const wood = C.TREE_WOOD * (trov ? dm.trovaoMult : 1);
        S.stock.madeira += wood;
        msg = 'O raio derrubou uma árvore: +' + wood + ' madeira no estoque.';
        for (const q of S.people) if (q.alive && near(q, x, y, 8)) Sm.addMem(S, q, 'viuRaio');
      } else if (o && o.k === 'rock') {
        const stone = o.ch * C.ROCK_STONE * (trov ? dm.trovaoMult : 1);
        G.W.removeObj(w, o);
        S.stock.pedra += stone;
        msg = 'O raio partiu a pedra: +' + stone + ' pedra no estoque.';
        for (const q of S.people) if (q.alive && near(q, x, y, 8)) Sm.addMem(S, q, 'viuRaio');
      } else {
        msg = 'O raio caiu no chão. O povo olhou para o céu.';
        for (const q of S.people) if (q.alive && near(q, x, y, 10)) God.faith(S, q, 2);
      }
      Sm.refresh(S);
    }
    return { ok: true, msg };
  };
})(globalThis.G = globalThis.G || {});
