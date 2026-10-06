/* Gods · Descobertas (Etapa 5): a trilha do conhecimento da Era da Família.
   Pedra lascada → Cestos → Lança → Anzol → Defumar e secar → Cerâmica.
   Cada descoberta vem da prática (quem pesca muito inventa o anzol) ou da Revelação de Deus.
   Aqui também moram as ferramentas e roupas que gastam, a conservação (moquém e jirau),
   a cerâmica (potes) e o fim da Era da Família. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const T = G.Tech = {};
  const Sim = () => G.Sim, Fam = () => G.Family;

  // ---------- a trilha ----------
  T.ORDER = ['pedra', 'cestos', 'lanca', 'anzol', 'conserva', 'ceramica'];
  T.DISC = {
    pedra: { name: 'Pedra lascada', icon: 'lasca', learn: 'cortando madeira e quebrando pedra',
      gives: 'Ferramentas de pedra: +20% para cortar madeira, quebrar pedra, construir e cavar. Libera o Ofício e a marcenaria.',
      story: (n) => n + ' bateu uma pedra na outra e tirou uma lasca afiada: o povo descobriu a pedra lascada.',
      hint: 'Suba Ofício nas Vontades: é lá que se fazem as ferramentas. A marcenaria já pode ser construída.' },
    cestos: { name: 'Cestos', icon: 'cesto', learn: 'colhendo frutas e carregando água',
      gives: 'Cada um carrega metade a mais. Quem corta árvore tira embira da casca (fibra), e a tecelagem fica liberada.',
      story: (n) => n + ' trançou folhas e cipó e fez o primeiro cesto: agora cada viagem rende mais.',
      hint: 'Cada viagem agora traz metade a mais. Com fibra, dá para construir a tecelagem.' },
    lanca: { name: 'Lança', icon: 'lanca', learn: 'trabalhando a madeira e enfrentando lobos',
      gives: 'Libera a Caça: os bichos da mata, do campo e da beira d\'água dão carne e couro. Com lança na mão, o povo enfrenta lobo e onça.',
      story: (n) => n + ' prendeu uma lasca na ponta de uma vara: nasceu a lança, e com ela a caça.',
      hint: 'Suba Caça nas Vontades: cada bicho dá carne, e quase todos dão couro para roupas.' },
    anzol: { name: 'Anzol', icon: 'anzol', learn: 'pescando',
      gives: 'Com ferramenta, o peixe fisga 50% mais.',
      story: (n) => n + ' entalhou um osso em gancho: com o anzol, o peixe não escapa mais tão fácil.',
      hint: 'Pescador com ferramenta agora pega bem mais peixe.' },
    conserva: { name: 'Defumar e secar', icon: 'moquem', learn: 'cuidando do fogo e vendo a comida estragar',
      gives: 'Libera o moquém (defuma peixe e carne) e o jirau (seca frutas): comida que atravessa o inverno.',
      story: (n) => n + ' esqueceu um peixe sobre a fumaça e ele não estragou: o povo aprendeu a defumar e a secar.',
      hint: 'Construa um moquém e um jirau e suba Conservar nas Vontades.' },
    ceramica: { name: 'Cerâmica', icon: 'pote', learn: 'buscando água no barranco',
      gives: 'Libera a Argila e o forno de barro: potes guardam o dobro de água e a comida dura mais. Com ' + C.ALDEIA_POP + ' pessoas, fecha a Era da Família.',
      story: (n) => 'Um cesto forrado de barro caiu no fogo e virou pote. ' + n + ' entendeu primeiro: o povo descobriu a cerâmica.',
      hint: 'Suba Argila nas Vontades e construa um forno de barro.' },
  };
  // o que cada trabalho ensina (tipo:etapa da ação → peso por hora)
  const TEACH = {
    pedra: { 'madeira:work': 1, 'pedra:work': 1.5, 'construir:build': 0.5 },
    cestos: { 'frutas:work': 1, 'agua:work': 1 },
    lanca: { 'madeira:work': 1, 'caca:aim': 1 },
    anzol: { 'pesca:work': 1 },
    conserva: { 'fogo:feed': 2 },
    ceramica: { 'agua:work': 1, 'argila:work': 1 },
  };
  // trabalhos que usam ferramenta (e a gastam)
  const TOOL_WORK = { madeira: 'work', pedra: 'work', construir: 'build', caca: 'aim', argila: 'work', pesca: 'work', roca: 'weed', mina: 'work' };   // capinar gasta a enxada (Etapa 10)
  // trabalhos novos: quando abrem
  T.WORK_NEED = { oficio: 'pedra', caca: 'lanca', conservar: 'conserva', argila: 'ceramica', roca: 'roca', criacao: 'criacao', cerca: 'cerca', mina: 'mineracao' };
  // comida: quanto sustenta cada porção (Etapa 10: o que vem da roça e da criação)
  T.FOOD = ['peixe', 'carne', 'frutas', 'defumado', 'seca', 'feijao', 'milho', 'abobora', 'mandioca', 'ovos', 'leite'];
  const FOOD_V = () => ({ peixe: C.FISH_COOKED, carne: C.CARNE_COOKED, frutas: C.FRUIT_FOOD, defumado: C.DEFUMADO_FOOD, seca: C.SECA_FOOD,
    feijao: C.ROCA.feijao.food, milho: C.ROCA.milho.food, abobora: C.ROCA.abobora.food, mandioca: C.ROCA.mandioca.food, ovos: C.OVOS_FOOD, leite: C.LEITE_FOOD });
  let foodV = null;
  // o que vai ao fogo no vaso (Etapa 8: cozido rende mais)
  T.COOKED = { peixe: 1, carne: 1, feijao: 1, milho: 1, abobora: 1, mandioca: 1, ovos: 1 };
  T.foodValue = (k, S) => ((foodV || (foodV = FOOD_V()))[k] || 0) * (T.COOKED[k] && S ? T.cookMult(S) : 1);
  T.cookMult = (S) => (G.Inv ? G.Inv.cookMult(S) : 1);

  // ---------- estado ----------
  T.init = function (S) {
    const t = S.tech || (S.tech = {});
    t.known = t.known || {};
    t.prat = t.prat || {};
    t.who = t.who || {};
    if (t.wolves === undefined) t.wolves = S.narr && S.narr.counts ? (S.narr.counts.lobos || 0) : 0;
    if (t.potes === undefined) t.potes = false;
    for (const k of Object.keys(C.START_STOCK)) if (S.stock[k] === undefined) S.stock[k] = 0;
    for (const k of Object.keys(C.DEFAULT_VONTADES)) if (S.vontades[k] === undefined) S.vontades[k] = C.DEFAULT_VONTADES[k];
    for (const b of S.buildings) if (b.loading) b.loading = 0;   // quem estava carregando o moquém não existe mais (save)
    for (const p of S.people) {
      if (p.tool === undefined) p.tool = null;
      if (p.roupa === undefined) p.roupa = null;
      if (p.skills.caca === undefined) p.skills.caca = 0;
      if (p.skills.oficio === undefined) p.skills.oficio = 0;
    }
    S.stats.toolsMade = S.stats.toolsMade || 0;
    S.stats.clothesMade = S.stats.clothesMade || 0;
    S.stats.conserved = S.stats.conserved || 0;
    S.stats.hunted = S.stats.hunted || 0;
    if (G.Inv) G.Inv.init(S);   // Etapa 8
  };
  T.known = (S, id) => !!(S.tech && S.tech.known[id]);
  T.count = (S) => (S.tech ? T.ORDER.filter((k) => S.tech.known[k]).length : 0);
  // a próxima da trilha, se já dá para aprender (a pedra lascada pede a primeira fogueira)
  T.open = function (S) {
    if (!S.tech) return null;
    for (let i = 0; i < T.ORDER.length; i++) {
      const k = T.ORDER[i];
      if (S.tech.known[k]) continue;
      const prev = i ? T.ORDER[i - 1] : null;
      if (prev ? S.tech.known[prev] : S.stats.firstFire) return k;
      return null;
    }
    return null;
  };
  T.need = (id) => C.DISC_NEED[id] || (C.INV_NEED && C.INV_NEED[id]) || (C.CAMPO_NEED && C.CAMPO_NEED[id]) || (C.MINA_NEED && C.MINA_NEED[id]);
  T.progress = (S, id) => (S.tech && S.tech.known[id] ? 1 : Math.min(1, ((S.tech && S.tech.prat[id]) || 0) / T.need(id)));
  T.workOpen = (S, wk) => !T.WORK_NEED[wk] || T.known(S, T.WORK_NEED[wk]);
  T.buildOpen = (S, type) => { const d = C.BUILD[type]; return !!d && (!d.need || T.known(S, d.need)) && !(G.Obras && G.Obras.openWhy(S, type)); };

  // ---------- prática: chamada pela IA a cada passo de quem está agindo ----------
  T.onWork = function (S, p, a, dt) {
    const key = a.type + ':' + a.stage;
    // ferramenta: pega do estoque ao começar, gasta com o uso
    if (TOOL_WORK[a.type] === a.stage && (a.type !== 'pesca' || T.known(S, 'anzol'))) {
      if (T.known(S, 'pedra')) T.useTool(S, p, dt, a.type === 'pesca' ? C.TOOL_WEAR_FISH_H : C.TOOL_WEAR_H);
    }
    if (G.Inv) G.Inv.onWork(S, p, a, dt);   // as invenções (Etapa 8) aprendem com o próprio trabalho
    if (G.Campo) G.Campo.onWork(S, p, a, dt);   // e as descobertas do campo (Etapa 10)
    if (G.Minas) G.Minas.onWork(S, p, a, dt);   // e as da mina (Etapa 12)
    const open = T.open(S);
    if (!open) return;
    const w = TEACH[open][key];
    if (!w) return;
    T.addPractice(S, open, w * dt / 60 * (G.Deus ? G.Deus.pratMult(S) : 1), p);   // a escrita (Etapa 11) apressa
  };
  T.addPractice = function (S, id, h, p) {
    const t = S.tech;
    t.prat[id] = (t.prat[id] || 0) + h;
    if (p) t.who[p.id] = (t.who[p.id] || 0) + h;
  };
  // comida estragando ensina a conservar (um décimo de hora por porção perdida)
  T.onRot = function (S, lost) {
    if (lost > 0 && T.open(S) === 'conserva') T.addPractice(S, 'conserva', lost * 0.1, null);
  };

  // ---------- descobrir ----------
  function discoverer(S) {
    const t = S.tech;
    let best = null, bh = -1;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 7) continue;
      const h = t.who[p.id] || 0;
      if (h > bh) { bh = h; best = p; }
    }
    return best;
  }
  T.discover = function (S, id, p, how) {
    const t = S.tech, d = T.DISC[id], Sm = Sim();
    if (!d || t.known[id]) return false;
    const by = p || discoverer(S);
    t.known[id] = { t: S.t, by: by ? by.name : '', how: how || 'pratica' };
    const trail = T.ORDER.indexOf(id) >= 0;
    if (trail) t.who = {};   // a prática das invenções (Etapa 8) tem conta própria
    const name = by ? by.name : 'Alguém';
    const txt = how === 'revelacao' ? 'Num sonho, Deus mostrou a ' + name + ' o segredo: ' + d.name.toLowerCase() + '. ' + d.gives.split('.')[0] + '.' :
      how === 'povo' ? name + ' ensinou ao povo ' + (d.art || d.name.toLowerCase()) + ', que a gente d' + (by && by.sex === 'F' ? 'ela' : 'ele') + ' já conhecia. ' + d.gives.split('.')[0] + '.' : d.story(name);   // Etapa 12: o que um povo traz
    S.chron.push({ t: S.t, text: txt, disc: id });
    S.events.push({ k: 'chron', text: txt });
    S.events.push({ k: 'disc', id, hint: d.hint });
    if (by) Sm.addMem(S, by, 'descobriu');
    for (const q of S.people) if (q.alive && q !== by) Sm.addMem(S, q, 'aprendeu');
    if (G.Life) G.Life.onDiscover(S, id, by, how);   // quem descobriu agradece, e tem festa
    // o primeiro de cada ferramenta nasce junto com a ideia
    if (id === 'pedra' || id === 'lanca') S.stock.ferramentas++;
    if (trail && T.count(S) === 1) Sm.toast(S, 'Primeira descoberta! Veja a trilha em Povo → Descobertas.', 'good');
    Sm.refresh(S);
    return true;
  };

  // ---------- Revelação (milagre) ----------
  // o que ela entrega: a que o jogador escolheu na janela das Descobertas (se já dá), senão a próxima da trilha,
  // senão a invenção mais adiantada (Etapa 8), senão a do campo (Etapa 10). Só vale o que o povo já começou a entender.
  const openAny = (S, id) => !!id && (T.open(S) === id || !!(G.Inv && G.Inv.isOpen(S, id)) || !!(G.Campo && G.Campo.isOpen(S, id)) || !!(G.Minas && G.Minas.isOpen(S, id)));
  // Sonhos Claros (Etapa 11): a Revelação já vale com menos prática
  T.revMin = (S) => (G.Deus && G.Deus.dom(S, 'sonhos') ? C.DOM.sonhosMin : C.REVELACAO_MIN);
  T.revealable = (S, id) => openAny(S, id) && T.progress(S, id) >= T.revMin(S);
  T.revealTarget = function (S) {
    if (!S.tech) return null;
    const aim = S.tech.aim;
    if (T.revealable(S, aim)) return aim;
    const open = T.open(S);
    if (T.revealable(S, open)) return open;
    const inv = G.Inv ? G.Inv.best(S) : null, cam = G.Campo ? G.Campo.best(S) : null, min = G.Minas ? G.Minas.best(S) : null;
    const ic = inv && cam ? (T.progress(S, cam) > T.progress(S, inv) ? cam : inv) : inv || cam;
    if (ic && min) return T.progress(S, min) > T.progress(S, ic) ? min : ic;   // Etapa 12: as da mina
    return ic || min;
  };
  T.canReveal = function (S) {
    if (T.revealTarget(S)) return '';
    const cands = [T.open(S)].concat(G.Inv ? G.Inv.openList(S) : [], G.Campo ? G.Campo.openList(S) : [], G.Minas ? G.Minas.openList(S) : []).filter(Boolean);
    if (!cands.length) {
      const all = T.count(S) >= T.ORDER.length && (!G.Inv || G.Inv.count(S) >= G.Inv.ORDER.length) && (!G.Campo || G.Campo.count(S) >= G.Campo.ORDER.length) && (!G.Minas || G.Minas.count(S) >= G.Minas.ORDER.length);
      if (all) return 'O povo já sabe tudo o que esta era ensina.';
      return S.stats.firstFire ? 'Ainda não há o que revelar.' : 'Ainda não há o que revelar: falta a primeira fogueira.';
    }
    const id = cands.sort((a, b) => T.progress(S, b) - T.progress(S, a))[0], pr = T.progress(S, id);
    return 'O povo ainda não está pronto para entender ' + T.DISC[id].name.toLowerCase() + ' (' + Math.floor(pr * 100) + '% da prática; precisa de ' + Math.round(T.revMin(S) * 100) + '%).';
  };
  T.reveal = function (S, p) {
    const id = T.revealTarget(S);
    if (!id) return null;
    if (G.Inv && G.Inv.DEF[id]) G.Inv.invent(S, id, p, 'revelacao');
    else if (G.Campo && G.Campo.DEF[id]) G.Campo.invent(S, id, p, 'revelacao');
    else if (G.Minas && G.Minas.DEF[id]) G.Minas.invent(S, id, p, 'revelacao');
    else T.discover(S, id, p, 'revelacao');
    S.tech.aim = null;
    return id;
  };

  // ---------- ferramentas ----------
  T.useTool = function (S, p, dt, wear) {
    if (!p.tool) {
      // Etapa 12: havendo ferramenta de ferro no estoque, é ela que se pega
      if (S.stock.ferro > 0) { S.stock.ferro--; p.tool = { dur: 100, fe: 1 }; }
      else {
        if (S.stock.ferramentas <= 0) return;
        S.stock.ferramentas--;
        p.tool = { dur: 100 };
      }
    }
    p.tool.dur -= wear * dt / 60 * (p.tool.fe ? C.FERRO_WEAR : 1);
    if (p.tool.dur <= 0) {
      p.tool = null;
      S.stats.toolsBroken = (S.stats.toolsBroken || 0) + 1;
      Sim().say(S, p, S.stock.ferramentas > 0 ? 'Quebrou! Vou pegar outra.' : 'Quebrou a ferramenta!', true);
      if (S.stock.ferramentas <= 0 && !S.stats.toolWarn) {
        S.stats.toolWarn = true;
        Sim().toast(S, S.stock.pedra < C.TOOL_COST.pedra ? 'As ferramentas estão acabando e falta pedra para lascar outras. Veja Pedra e Ofício nas Vontades.' : 'As ferramentas estão acabando. Suba Ofício nas Vontades.', 'warn');
      }
    }
  };
  T.hasTool = (S, p) => !!(p.tool && T.known(S, 'pedra'));
  // bônus de velocidade no trabalho: a ferramenta de pedra e, na Etapa 8, o machado, a corda e a faca
  T.speed = function (S, p, wk) {
    let s = 1;
    if (T.hasTool(S, p) && (wk === 'madeira' || wk === 'pedra' || wk === 'construir' || wk === 'argila' || wk === 'caca' || wk === 'roca' || wk === 'mina'))
      s = p.tool.fe ? (wk === 'madeira' && T.known(S, 'machado') ? C.FERRO_MACHADO : C.FERRO_BONUS) : wk === 'madeira' && T.known(S, 'machado') ? C.MACHADO_BONUS : C.TOOL_BONUS;   // a de ferro rende mais (Etapa 12)
    if (wk === 'construir' && T.known(S, 'corda')) s *= C.CORDA_BUILD;
    if (wk === 'construir' && G.Deus && G.Deus.saber(S, 'roda')) s *= C.RODA_BUILD;   // o carrinho de mão (Etapa 11)
    if (wk === 'oficio' && T.known(S, 'faca')) s *= C.FACA_OFICIO;
    return s;
  };
  // Etapa 11: o peixe criado por Deus, o carrinho de mão (a roda) e a Sentinela
  T.fishMult = (S, p) => (T.known(S, 'anzol') && T.hasTool(S, p) ? C.ANZOL_FISH : 1) * (T.known(S, 'rede') ? C.REDE_FISH : 1) * (G.Deus && G.Deus.species(S, 'peixe') ? C.PEIXE_FISH : 1);
  T.carryMult = (S) => (T.known(S, 'cestos') ? C.CESTO_CARRY : 1) * (G.Deus && G.Deus.saber(S, 'roda') ? C.RODA_CARRY : 1);
  T.biteMult = (S, p) => (T.known(S, 'lanca') && T.hasTool(S, p) ? C.LANCA_BITE * (p.tool.fe ? C.FERRO_BITE : 1) : 1) * (G.Deus && G.Deus.dom(S, 'sentinela') ? C.DOM.sentinelaBite : 1) *
    (p.sangue && G.Povos ? G.Povos.bite(p) : 1);   // Etapa 12: a lança de ferro e as garras do povo-fera
  T.coldMult = (p, S) => (p.roupa ? (S && T.known(S, 'agulha') ? C.AGULHA_COLD : C.ROUPA_COLD) : 1);   // costurada com agulha, mais quente
  // quantas ferramentas guardar: quem trabalha (12+) e ainda não tem, mais uma folga
  T.workers = (S) => S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 12);
  T.toolTarget = function (S) {
    const ws = T.workers(S);
    return Math.max(2, Math.ceil(ws.length * 0.3)) + ws.filter((p) => !p.tool).length - (S.stock.ferro || 0);   // as de ferro guardadas contam (Etapa 12)
  };
  // quem ainda precisa de roupa (a partir dos 3 anos; bebê vai enrolado no colo)
  T.needClothes = (S) => S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 3 && (!p.roupa || p.roupa.dur < 15)).length;

  // ---------- ofício: o que fazer agora ----------
  T.oficioPlan = function (S) {
    if (!T.known(S, 'pedra')) return null;
    const st = S.stock;
    const clothesGap = T.needClothes(S) - st.roupas;
    const toolGap = T.toolTarget(S) - st.ferramentas;
    const canCloth = clothesGap > 0 && st.couro >= C.ROUPA_COST.couro;
    const canTool = toolGap > 0 && st.pedra >= C.TOOL_COST.pedra && st.madeira >= C.TOOL_COST.madeira;
    if (canCloth && (!canTool || S.ck.season >= 2 || clothesGap >= toolGap)) return { k: 'roupas', gap: clothesGap };
    if (canTool) return { k: 'ferramentas', gap: toolGap };
    if (canCloth) return { k: 'roupas', gap: clothesGap };
    return null;
  };
  T.make = function (S, k, n) {
    S.stock[k] += n;
    if (k === 'ferramentas') S.stats.toolsMade += n; else S.stats.clothesMade += n;
    if (k === 'roupas' && !S.stats.firstClothes) { S.stats.firstClothes = true; Sim().chron(S, 'Ficou pronta a primeira roupa de couro. Quem veste sente menos frio.'); }
    if (k === 'ferramentas') S.stats.toolWarn = false;
  };

  // ---------- conservação: moquém e jirau ----------
  T.dryNow = (S, b) => S.ck.season !== 3 && (!S.precip || !!(b && Sim().def(b).dry.rain)) && S.ck.hour >= 7 && S.ck.hour < 18;   // o jirau coberto seca na chuva
  // a próxima carga: qual obra, o quê e quanto
  // dias de comida já conservada (defumado e fruta seca) para o povo todo
  T.keptDays = function (S) {
    const st = S.stock, mouths = S.ctx ? S.ctx.mouths : 2;
    return (st.defumado * C.DEFUMADO_FOOD + st.seca * C.SECA_FOOD) / (mouths * C.HUNGER_H * 24);
  };
  T.conservePlan = function (S) {
    if (!T.known(S, 'conserva')) return null;
    if (T.keptDays(S) >= C.CONSERVA_DAYS[1]) return null;   // já tem o bastante guardado
    const st = S.stock;
    let best = null;
    for (const b of S.buildings) {
      if (!b.built || b.batch || b.loading) continue;
      const d = Sim().def(b);
      if (b.type === 'moquem' && st.madeira >= C.MOQUEM_WOOD) {
        const k = st.peixe >= st.carne ? 'peixe' : 'carne';
        const n = Math.min(d.smoke.cap, st[k]);
        if (n >= 4 && (!best || n > best.n)) best = { b, k, n, wood: C.MOQUEM_WOOD };
      } else if (b.type === 'jirau' && S.ck.season !== 3) {
        const n = Math.min(d.dry.cap, st.frutas);
        if (n >= 4 && (!best || n > best.n)) best = { b, k: 'frutas', n, wood: 0 };
      }
    }
    return best;
  };
  T.load = function (S, b, k, n) {
    b.batch = { k, n, left: (b.type === 'moquem' ? C.MOQUEM_H : C.JIRAU_H) * 60 };
    b.loading = 0;
  };

  // ---------- passo, hora, dia ----------
  T.step = function (S, dt) {
    for (const b of S.buildings) {
      const q = b.batch;
      if (!q) continue;
      if (b.type === 'jirau' && !T.dryNow(S, b)) continue;   // fruta só seca com sol (ou coberta)
      q.left -= dt;
      if (q.left > 0) continue;
      const out = b.type === 'moquem' ? 'defumado' : 'seca';
      S.stock[out] += q.n;
      S.stats.conserved += q.n;
      b.batch = null;
      Sim().float(S, b.x + b.w / 2, b.y, '+' + q.n + (out === 'seca' ? ' fruta seca' : ' defumado'));
      if (!S.stats.firstConserve) {
        S.stats.firstConserve = true;
        Sim().chron(S, out === 'seca' ? 'As primeiras frutas secaram no jirau. Vão durar o inverno.' : 'Saiu o primeiro peixe do moquém: defumado, quase não estraga.');
      }
    }
  };
  T.hourly = function (S) {
    // quem passa pelo acampamento sem roupa pega uma do estoque
    if (S.stock.roupas > 0) {
      for (const p of S.people) {
        if (S.stock.roupas <= 0) break;
        if (!p.alive || p.carriedBy || Fam().age(S, p) < 3 || (p.roupa && p.roupa.dur >= 15)) continue;
        if (Math.hypot(p.x - S.camp.x - 1, p.y - S.camp.y - 1) > 7) continue;
        S.stock.roupas--;
        p.roupa = { dur: 100 };
      }
    }
  };
  T.daily = function (S) {
    const t = S.tech, Sm = Sim();
    // lobos rondando ensinam a lança
    const wolves = S.narr && S.narr.counts ? (S.narr.counts.lobos || 0) : 0;
    if (wolves > t.wolves) { if (T.open(S) === 'lanca') T.addPractice(S, 'lanca', 15 * (wolves - t.wolves), null); t.wolves = wolves; }
    // descoberta pela prática
    const open = T.open(S);
    if (open && t.prat[open] >= T.need(open) && S.rng.chance(C.DISC_DAILY)) T.discover(S, open, null, 'pratica');
    if (G.Inv) G.Inv.daily(S);   // invenções (Etapa 8)
    // roupa gasta com o tempo (mais no inverno)
    let torn = 0;
    for (const p of S.people) {
      if (!p.alive || !p.roupa || S.resumido) continue;   // dia resumido (jogo fechado): a roupa fica como estava
      p.roupa.dur -= (C.ROUPA_WEAR_DAY + (S.ck.season === 3 ? C.ROUPA_WEAR_WINTER : 0)) * (T.known(S, 'agulha') ? C.AGULHA_WEAR : 1);
      if (p.roupa.dur <= 0) { p.roupa = null; torn++; }
    }
    if (torn && S.stock.roupas <= 0) Sm.toast(S, torn === 1 ? 'Uma roupa de couro se desfez. Faça outras no Ofício.' : torn + ' roupas de couro se desfizeram. Faça outras no Ofício.', 'warn');
    T.checkEra(S);
  };

  // ---------- cerâmica e o fim da Era da Família ----------
  // potes: 1 com o primeiro forno; 2 com um forno grande de pé (Etapa 7)
  T.potesLv = function (S) {
    if (!S.tech || !S.tech.potes) return 0;
    let lv = 1;
    for (const b of S.buildings) if (b.built && b.type === 'forno') lv = Math.max(lv, Sim().def(b).potes || 1);
    return lv;
  };
  T.waterCap = (S) => { const lv = T.potesLv(S); return lv >= 2 ? C.POTES2_WATER_CAP : lv ? C.POTES_WATER_CAP : C.WATER_CAP; };
  T.rotMult = (S, k) => { const lv = T.potesLv(S); return lv && (k === 'frutas' || k === 'peixe' || k === 'carne') ? (lv >= 2 ? C.POTES2_ROT : C.POTES_ROT) : 1; };
  T.onBuilt = function (S, b) {
    const Sm = Sim();
    if (b.type === 'forno') {
      if (!S.tech.potes) {
        S.tech.potes = true;
        Sm.chron(S, 'O forno de barro queimou os primeiros potes. Cabe o dobro de água e a comida dura mais.');
      } else Sm.toast(S, 'Forno de barro pronto.');
      return true;
    }
    if (b.type === 'moquem' || b.type === 'jirau') {
      const first = !S.buildings.some((x) => x !== b && x.built && x.type === b.type);
      if (first) Sm.toast(S, C.BUILD[b.type].name + ' pronto. Suba Conservar nas Vontades.', 'good');
      else Sm.toast(S, C.BUILD[b.type].name + ' pronto.');
      return true;
    }
    return false;
  };
  T.checkEra = function (S) {
    if (S.stats.eraEnd || !T.known(S, 'ceramica')) return false;
    const alive = S.people.filter((p) => p.alive).length;
    if (alive < C.ALDEIA_POP) return false;
    S.stats.eraEnd = S.t;
    S.era = 'aldeia';
    Sim().chron(S, 'O povo chegou a ' + alive + ' pessoas e aprendeu a cerâmica: a Era da Família se fecha. O acampamento virou aldeia.');
    S.events.push({ k: 'era', era: 'aldeia' });
    if (G.Life) G.Life.onEra(S);
    return true;
  };

  // ---------- metas das descobertas (fase 3) ----------
  T.goals3 = function () {
    return [
      { id: 'd_pedra', text: 'Descubra a pedra lascada', reward: 6, done: false },
      { id: 'd_ferramentas', text: 'Faça 5 ferramentas', reward: 6, done: false },
      { id: 'd_conserva', text: 'Guarde 30 porções conservadas', reward: 8, done: false },
      { id: 'd_roupas', text: 'Vista 5 pessoas com couro', reward: 8, done: false },
      { id: 'd_ceramica', text: 'Descubra a cerâmica', reward: 10, done: false },
      { id: 'd_aldeia', text: 'Chegue a ' + C.ALDEIA_POP + ' pessoas', reward: 15, done: false },
    ];
  };
  T.goalTest = {
    d_pedra: (S) => T.known(S, 'pedra'),
    d_ferramentas: (S) => S.stats.toolsMade >= 5,
    d_conserva: (S) => S.stock.defumado + S.stock.seca >= 30,
    d_roupas: (S) => S.people.filter((p) => p.alive && p.roupa).length >= 5,
    d_ceramica: (S) => T.known(S, 'ceramica'),
    d_aldeia: (S) => S.people.filter((p) => p.alive).length >= C.ALDEIA_POP,
  };
})(globalThis.G = globalThis.G || {});
