/* Gods · Invenções (Etapa 8): os utensílios da aldeia.
   Faca, corda, flauta, tambor, machado, agulha, arco e flecha, rede de pesca e vasos.
   A trilha das descobertas (Etapa 5) anda uma de cada vez. As invenções são uma árvore: cada uma abre quando
   o que ela pede já existe e aprende com o seu próprio trabalho, várias ao mesmo tempo. A Revelação também
   serve (a que o jogador escolher na janela, ou a mais adiantada). Os efeitos moram onde o trabalho acontece:
   tech.js (velocidade, pesca, roupa, comida), ai.js (caça, pesca), life.js (flauta e tambor). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const I = G.Inv = {};
  const T = () => G.Tech, Sim = () => G.Sim;

  I.ORDER = ['faca', 'corda', 'flauta', 'tambor', 'machado', 'agulha', 'arco', 'rede', 'vasos'];
  // req: o que precisa existir (descoberta ou outra invenção) · art: como se fala dela numa frase
  I.DEF = {
    faca: { name: 'Faca', icon: 'faca', req: ['pedra'], art: 'a faca',
      learn: 'lascando no Ofício, cortando madeira e carneando a caça',
      gives: 'O Ofício trabalha 25% mais rápido, e cada caça rende 3 de carne e 1 de couro a mais.',
      story: (n) => n + ' afiou uma lasca comprida e amarrou num cabo: nasceu a faca.',
      hint: 'Com a faca, o Ofício anda mais rápido e a caça rende mais.' },
    corda: { name: 'Corda', icon: 'corda', req: ['cestos'], art: 'a corda',
      learn: 'tirando embira das árvores, colhendo, tecendo e construindo',
      gives: 'Obras e caminhos amarrados saem 20% mais rápidos. A corda abre o machado, o arco e a rede de pesca.',
      story: (n) => n + ' torceu fibra de embira até virar um fio grosso e forte: o povo inventou a corda.',
      hint: 'Obras e caminhos agora saem mais rápido.' },
    flauta: { name: 'Flauta', icon: 'flauta', req: ['faca'], art: 'a flauta',
      learn: 'contando e ouvindo histórias e dançando nas festas',
      gives: 'Algumas noites de história viram música: quem ouve a flauta fica de bom humor. A música do jogo ganha a flauta.',
      story: (n) => n + ' furou um bambu com a ponta da faca, soprou e saiu um canto: nasceu a flauta.',
      hint: 'De tardinha, alguém vai tocar flauta ao pé do fogo.' },
    tambor: { name: 'Tambor', icon: 'tambor', req: ['lanca'], art: 'o tambor',
      learn: 'dançando nas festas, costurando o couro e carneando a caça',
      gives: 'Festa com tambor aproxima o povo 50% mais. A música das festas ganha o tambor.',
      story: (n) => n + ' esticou um couro de capivara sobre um tronco oco e bateu: nasceu o tambor.',
      hint: 'A próxima festa vai ter tambor.' },
    machado: { name: 'Machado', icon: 'machado', req: ['corda'], art: 'o machado',
      learn: 'cortando madeira e construindo',
      gives: 'Com ferramenta, a madeira sai 60% mais rápido (antes, 20%).',
      story: (n) => n + ' amarrou uma pedra polida num cabo firme: com o machado, a árvore cai num instante.',
      hint: 'Cortar madeira agora é bem mais rápido.' },
    agulha: { name: 'Agulha', icon: 'agulha', req: ['faca'], art: 'a agulha',
      learn: 'costurando roupas e tecendo',
      gives: 'Roupa de couro costurada: 35% menos frio (antes, 25%) e dura metade a mais.',
      story: (n) => n + ' entalhou um osso fino com um furo na ponta: com a agulha, a roupa fecha bem.',
      hint: 'As roupas de couro agora esquentam mais e duram mais.' },
    arco: { name: 'Arco e flecha', icon: 'arco', req: ['corda', 'lanca'], art: 'o arco e a flecha',
      learn: 'caçando',
      gives: 'Quem caça atira de longe e acerta mais, e a flecha não espanta o bando.',
      story: (n) => n + ' vergou uma vara com uma corda esticada e atirou uma lança pequenina: nasceram o arco e a flecha.',
      hint: 'Quem caça agora atira de longe.' },
    rede: { name: 'Rede de pesca', icon: 'redePesca', req: ['corda', 'anzol'], art: 'a rede de pesca',
      learn: 'pescando',
      gives: 'O peixe fisga 35% mais, e cada pescaria traz até 2 peixes a mais.',
      story: (n) => n + ' trançou corda em malha e jogou na água: com a rede de pesca, o peixe vem aos montes.',
      hint: 'Quem pesca agora joga a rede.' },
    vasos: { name: 'Vasos', icon: 'vaso', req: ['ceramica'], art: 'os vasos',
      learn: 'cavando argila, cuidando do fogo e carregando água',
      gives: 'Peixe, carne, ovo e o que vem da roça, cozidos no vaso, sustentam 25% mais.',
      story: (n) => n + ' moldou um vaso de boca larga e pôs no fogo com água e peixe: o povo aprendeu a cozinhar.',
      hint: 'A comida cozida no vaso rende mais.' },
  };
  for (const id of I.ORDER) I.DEF[id].inv = true;
  // o que cada trabalho ensina (tipo:etapa da ação, e no Ofício também o que se faz → peso por hora)
  const TEACH = {
    faca: { 'oficio:work': 1, 'madeira:work': 0.25, 'caca:cut': 2 },
    corda: { 'madeira:work': 0.5, 'frutas:work': 0.3, 'construir:build': 0.5, 'oficio:work:mantas': 1.5, 'oficio:work:redes': 1.5 },
    flauta: { 'ouvir:listen': 0.25, 'historia:tell': 0.5, 'festa:dance': 0.5 },
    tambor: { 'festa:dance': 1, 'oficio:work:roupas': 1, 'caca:cut': 1 },
    machado: { 'madeira:work': 1, 'construir:build': 0.5 },
    agulha: { 'oficio:work:roupas': 2, 'oficio:work:mantas': 1, 'oficio:work:redes': 1 },
    arco: { 'caca:aim': 3, 'caca:go': 0.5 },
    rede: { 'pesca:work': 1 },
    vasos: { 'argila:work': 2, 'fogo:feed': 1, 'agua:work': 0.3 },
  };
  I.TEACH = TEACH;
  // do trabalho para as invenções: chave → [[id, peso]] (a busca por passo é só isso)
  const BY_KEY = {};
  for (const id of I.ORDER) for (const k in TEACH[id]) (BY_KEY[k] || (BY_KEY[k] = [])).push([id, TEACH[id][k]]);

  // entram na janela das Descobertas junto com a trilha
  Object.assign(T().DISC, I.DEF);

  // ---------- estado ----------
  I.init = function (S) {
    const t = S.tech;
    if (!t) return;
    t.whoInv = t.whoInv || {};
    if (t.aim === undefined) t.aim = null;
    const st = S.stats;
    st.arrowKills = st.arrowKills || 0; st.flutes = st.flutes || 0; st.drumParties = st.drumParties || 0;
    // save de antes da 0.8 já numa fase adiantada: ganha as missões das invenções das fases que já passou (uma vez)
    if (!st.invMissions) {
      st.invMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of I.missions(f)) if (!S.goals.some((g) => g.id === m.id)) S.goals.push(m);
    }
  };
  I.known = (S, id) => !!(S.tech && S.tech.known[id]);
  I.count = (S) => (S.tech ? I.ORDER.filter((id) => S.tech.known[id]).length : 0);
  // aberta: o que ela pede já existe e ninguém inventou ainda
  I.isOpen = function (S, id) {
    const t = S.tech, d = I.DEF[id];
    if (!t || !d || t.known[id]) return false;
    for (const r of d.req) if (!t.known[r]) return false;
    return true;
  };
  I.openList = (S) => I.ORDER.filter((id) => I.isOpen(S, id));
  I.need = (id) => C.INV_NEED[id];
  I.progress = (S, id) => (I.known(S, id) ? 1 : Math.min(1, ((S.tech && S.tech.prat[id]) || 0) / I.need(id)));
  // o que falta para abrir (nomes)
  I.missing = (S, id) => I.DEF[id].req.filter((r) => !(S.tech && S.tech.known[r])).map((r) => T().DISC[r].name.toLowerCase());

  // ---------- prática: chamada a cada passo de quem está agindo ----------
  function add(S, p, list, dt) {
    if (!list) return;
    const t = S.tech;
    for (const [id, w] of list) {
      if (!I.isOpen(S, id)) continue;
      const h = w * dt / 60 * (G.Deus ? G.Deus.pratMult(S) : 1);   // a escrita (Etapa 11) apressa
      t.prat[id] = (t.prat[id] || 0) + h;
      if (p) { const who = t.whoInv[id] || (t.whoInv[id] = {}); who[p.id] = (who[p.id] || 0) + h; }
    }
  }
  I.onWork = function (S, p, a, dt) {
    if (!S.tech || !S.tech.whoInv) return;
    const key = a.type + ':' + a.stage;
    add(S, p, BY_KEY[key], dt);
    if (a.make) add(S, p, BY_KEY[key + ':' + a.make], dt);
  };
  // quem mais praticou aquela invenção (de 7 anos para cima)
  I.inventor = function (S, id) {
    const who = (S.tech.whoInv && S.tech.whoInv[id]) || {};
    let best = null, bh = -1;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || G.Family.age(S, p) < 7) continue;
      const h = who[p.id] || 0;
      if (h > bh) { bh = h; best = p; }
    }
    return best;
  };
  // ---------- inventar ----------
  I.invent = function (S, id, p, how) {
    if (!I.DEF[id] || I.known(S, id)) return false;
    const by = p || I.inventor(S, id);
    if (!T().discover(S, id, by, how)) return false;
    if (S.tech.whoInv) delete S.tech.whoInv[id];
    if (S.tech.aim === id) S.tech.aim = null;
    if (I.count(S) === 1) Sim().toast(S, 'Primeira invenção! As invenções estão em Povo → Descobertas.', 'good');
    return true;
  };
  // uma vez por dia: a mais madura das que já passaram da conta pode virar ideia (uma por dia)
  I.daily = function (S) {
    if (!S.tech || !S.tech.whoInv) return;
    let best = null, br = 1;
    for (const id of I.ORDER) {
      if (!I.isOpen(S, id)) continue;
      const r = (S.tech.prat[id] || 0) / I.need(id);
      if (r >= br) { br = r; best = id; }
    }
    if (best && S.rng.chance(C.DISC_DAILY)) I.invent(S, best, null, 'pratica');
  };
  // a mais adiantada entre as abertas (para a Revelação), se já passou do mínimo
  I.best = function (S) {
    let best = null, bp = C.REVELACAO_MIN - 1e-9;
    for (const id of I.openList(S)) { const pr = I.progress(S, id); if (pr >= bp) { bp = pr; best = id; } }
    return best;
  };

  // ---------- efeitos (lidos por tech.js, ai.js, life.js, render e som) ----------
  const k = (S, id) => !!(S && S.tech && S.tech.known[id]);
  I.cacaR = (S) => (k(S, 'arco') ? C.ARCO_R : C.CACA_R);
  I.cacaHit = (S) => (k(S, 'arco') ? C.ARCO_HIT : 0);
  I.cacaShots = (S) => (k(S, 'arco') ? C.ARCO_SHOTS : C.CACA_SHOTS);
  I.cacaYield = (S) => ({ carne: C.CACA_CARNE + (k(S, 'faca') ? C.FACA_CARNE : 0), couro: C.CACA_COURO + (k(S, 'faca') ? C.FACA_COURO : 0) });
  I.fishMax = (S) => C.FISH_MAX + (k(S, 'rede') ? C.REDE_MAX : 0);
  I.cookMult = (S) => (k(S, 'vasos') ? C.VASO_FOOD : 1);
  I.drum = (S) => k(S, 'tambor');
  I.flute = (S) => k(S, 'flauta');

  // ---------- metas: missões pequenas (não seguram a fase), uma leva por fase ----------
  I.missions = function (phase) {
    if (phase === 2) return [{ id: 'i_faca', text: 'Invente a faca', opt: true, reward: 4, done: false }];
    if (phase === 3) return [
      { id: 'i_corda', text: 'Invente a corda', opt: true, reward: 4, done: false },
      { id: 'i_tres', text: 'Faça 3 invenções', opt: true, reward: 6, done: false },
    ];
    if (phase === 4) return [
      { id: 'i_arco', text: 'Cace com arco e flecha', opt: true, reward: 6, done: false },
      { id: 'i_tambor', text: 'Dance ao som do tambor', opt: true, reward: 6, done: false },
      { id: 'i_todas', text: 'Faça todas as invenções', opt: true, reward: 15, done: false },
    ];
    return [];
  };
  I.goalTest = {
    i_faca: (S) => I.known(S, 'faca'),
    i_corda: (S) => I.known(S, 'corda'),
    i_tres: (S) => I.count(S) >= 3,
    i_arco: (S) => (S.stats.arrowKills || 0) > 0,
    i_tambor: (S) => (S.stats.drumParties || 0) > 0,
    i_todas: (S) => I.count(S) >= I.ORDER.length,
  };
})(globalThis.G = globalThis.G || {});
