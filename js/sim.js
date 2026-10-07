/* Gods · simulação: tempo, clima, necessidades, construções, mortes, metas. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U, T = G.T;
  const Sim = G.Sim = {};

  // ---------- nomes, traços, aparência ----------
  const FEM = ['Iara', 'Jaci', 'Moema', 'Potira', 'Maíra', 'Tainá', 'Naiá', 'Ceci', 'Jurema', 'Iracema', 'Araci', 'Juçara',
    'Luzia', 'Rosa', 'Clara', 'Benedita', 'Inaê', 'Açucena', 'Amana', 'Irani'];
  const MASC = ['Aruã', 'Caiubi', 'Iberê', 'Kauê', 'Piatã', 'Raoni', 'Ubiratã', 'Cauã', 'Bento', 'Joaquim', 'Tomé', 'Chico',
    'Apoena', 'Jurandir', 'Ubirajara', 'Moacir', 'Ravi', 'Davi', 'Guaraci', 'Iuri'];
  const PAIRS = [['Trabalhador', 'Preguiçoso'], ['Resistente ao frio', 'Friorento'], ['Otimista', 'Pessimista'], ['Devoto', 'Cético']];
  const SOLO = ['Comilão', 'Ágil'];
  const TRAIT_DESC = {
    'Trabalhador': 'Trabalha 15% mais rápido e gosta de trabalhar.',
    'Preguiçoso': 'Trabalha 15% mais devagar e vive procurando sombra.',
    'Resistente ao frio': 'Perde calor 30% mais devagar.',
    'Friorento': 'Perde calor 30% mais rápido.',
    'Otimista': '+8 de humor.',
    'Pessimista': '−8 de humor.',
    'Devoto': 'Segue as Vontades com mais força.',
    'Cético': 'Pesa menos as Vontades e faz do jeito dele.',
    'Comilão': 'Sente fome 25% mais rápido.',
    'Ágil': 'Anda 15% mais rápido.',
  };
  // Etapa 12: as 5 primeiras de SKINS e de CLOTHS são dos humanos (makeLook só sorteia entre elas); as dos povos vêm depois
  const SKINS = [['#f2c79e', '#d49b73'], ['#e8b796', '#c28569'], ['#c28569', '#9a5f45'], ['#a8694a', '#7a4630'], ['#7a4a34', '#553022'],
    ['#f6e2cc', '#d2ae96'], ['#ecd0a2', '#c29c6c'], ['#cdb780', '#98824e'],                             // 5-7 elfos: clara, dourada, oliva
    ['#f0ae8a', '#c47a5a'], ['#da9068', '#a86444'], ['#b8704e', '#864a32'],                             // 8-10 anões: corados
    ['#e2a23c', '#a86a22'], ['#cf6a2e', '#94421e'], ['#a39c94', '#6c6560'], ['#7c5638', '#4e3424']];    // 11-14 pelagens: onça, guará, cinza, parda
  const HAIRS = ['#181425', '#2b1d1a', '#3e2731', '#3e2731', '#733e39', '#be4a2f'];
  const CLOTHS = [['#b86f50', '#733e39'], ['#c9a068', '#8a6440'], ['#8a7a4a', '#5e5230'], ['#9a6a8a', '#5e3a5a'], ['#6a8a9a', '#3e5a6a'],
    ['#3f8a5c', '#275c42'], ['#a8c69a', '#779a72'], ['#2c6a80', '#1b4658'], ['#7c9440', '#52642a'],     // 5-8 elfos: esmeralda, sálvia, petróleo, musgo
    ['#96603c', '#5e3a26'], ['#7a8394', '#4c5466'], ['#8e2f42', '#5a1c2c'], ['#b98a2c', '#7c5a1a'],     // 9-12 anões: couro, cinza-ferro, vinho, ocre
    ['#dccfae', '#a6987a'], ['#a8744c', '#6e4630'], ['#c23a34', '#84232a']];                            // 13-15 povo-fera: pano cru, couro, vermelho
  // Etapa 12: as cores de cada povo (índices em SKINS e CLOTHS; cabelos em hex)
  Sim.POVO_LOOK = {
    elfo: { skin: [5, 6, 7], hair: ['#ece6d2', '#e2b44a', '#181425', '#b4482c'], cloth: [5, 6, 7, 8] },
    anao: { skin: [8, 9, 10], hair: ['#c0501e', '#6a4226', '#221a1c', '#8c8680'], cloth: [9, 10, 11, 12] },
    fera: { skin: [11, 12, 13, 14], hair: ['#2b1a12', '#4a2c18', '#f0dcb0', '#8a4a22'], cloth: [13, 14, 15] },   // skin = a pelagem
  };

  const MEM = {
    comeuQuente: { t: 'Comeu comida quente', v: 5, d: 1440 },
    comeuCru: { t: 'Comeu peixe cru', v: -3, d: 720 },
    dormiuBarraca: { t: 'Dormiu na barraca', v: 4, d: 1440 },
    dormiuBem: { t: 'Dormiu bem abrigado', v: 6, d: 1440 },
    dormiuRelento: { t: 'Dormiu ao relento', v: -6, d: 1440 },
    passouFrio: { t: 'Passou frio', v: -8, d: 1440 },
    // Etapa 13: Memória
    velou: { t: 'Velou quem partiu', v: 2, d: 3 * 1440 },
    semDespedida: { t: 'Não pôde se despedir', v: -8, d: 20 * 1440 },
    visitouCova: { t: 'Levou flores a quem partiu', v: 3, d: 3 * 1440 },
    diaDosMortos: { t: 'Lembrou os que partiram', v: 5, d: 6 * 1440 },
    viagem: { t: 'Viu coisas na fumaça do rito', v: 4, d: 3 * 1440 },
    visaoRuim: { t: 'Teve uma visão ruim no rito', v: -6, d: 3 * 1440 },
    semRito: { t: 'Sente falta do rito', v: -4, d: 10 * 1440 },
    aceitou: { t: 'Ouviu Deus e ficou em paz', v: 4, d: 5 * 1440 },
    temeu: { t: 'Ouviu Deus e teve medo', v: -3, d: 3 * 1440 },
    promessa: { t: 'Ouviu uma promessa de Deus', v: 5, d: 5 * 1440 },
    promessaQuebrada: { t: 'Viu Deus faltar com a palavra', v: -6, d: 10 * 1440 },
    emPaz: { t: 'Está em paz com o fim', v: 6, d: 10 * 1440 },
    semResposta: { t: 'Perguntou e Deus não respondeu', v: -3, d: 3 * 1440 },
    contoMedo: { t: 'Ouviu um conto de dar medo', v: -2, d: 1440 },
    // Etapa 12
    povoUnido: { t: 'Viu dois povos virarem um só', v: 8, d: 7200 },
    tesouro: { t: 'Viu o brilho que saiu da mina', v: 4, d: 2880 },
    ganhouJoia: { t: 'Ganhou uma joia', v: 5, d: 4320 },
    passouFome: { t: 'Passou fome', v: -10, d: 1440 },
    passouSede: { t: 'Passou sede', v: -10, d: 1440 },
    conversou: { t: 'Conversou', v: 4, d: 1440 },
    fogueira: { t: 'Viu a primeira fogueira', v: 6, d: 3 * 1440 },
    obra: { t: 'Ergueu algo novo', v: 5, d: 2 * 1440 },
    chegada: { t: 'Começou uma vida nova', v: 5, d: 3 * 1440 },
    perdeuAlguem: { t: 'Perdeu alguém', v: -30, d: 60 * 1440 },
    oracaoAtendida: { t: 'Teve a oração atendida', v: 8, d: 2 * 1440 },
    oracaoIgnorada: { t: 'Rezou e ninguém respondeu', v: -5, d: 1440 },
    viuMilagre: { t: 'Viu um milagre', v: 4, d: 1440 },
    atingidoRaio: { t: 'Foi atingido por um raio', v: -15, d: 3 * 1440 },
    viuRaio: { t: 'Viu um raio cair perto', v: -3, d: 1440 },
    esperaFilho: { t: 'Espera um filho', v: 8, d: 45 * 1440 },
    nasceuFilho: { t: 'Um filho nasceu', v: 15, d: 10 * 1440 },
    nasceuIrmao: { t: 'Nasceu alguém da família', v: 6, d: 5 * 1440 },
    perdeuBebe: { t: 'Perdeu um bebê', v: -30, d: 45 * 1440 },
    perdeuCompanheiro: { t: 'Perdeu quem amava', v: -30, d: 60 * 1440 },
    perdeuFamilia: { t: 'Perdeu alguém da família', v: -30, d: 60 * 1440 },
    curado: { t: 'Foi curado por Deus', tf: 'Foi curada por Deus', v: 10, d: 3 * 1440 },
    brincou: { t: 'Brincou', v: 4, d: 720 },
    mordido: { t: 'Foi mordido por um lobo', tf: 'Foi mordida por um lobo', v: -12, d: 3 * 1440 },
    acolhido: { t: 'Foi acolhido pelo povo', tf: 'Foi acolhida pelo povo', v: 10, d: 5 * 1440 },
    chegouGente: { t: 'Chegou gente nova', v: 4, d: 2 * 1440 },
    fartura: { t: 'Tempo de fartura', v: 4, d: 3 * 1440 },
    mel: { t: 'Comeu mel', v: 5, d: 1440 },
    carneCrua: { t: 'Comeu carne crua', v: -3, d: 720 },
    descobriu: { t: 'Descobriu algo novo', v: 10, d: 5 * 1440 },
    aprendeu: { t: 'Aprendeu algo novo', v: 4, d: 2 * 1440 },
    // Etapa 6: a vida do povo
    ouviuHistoria: { t: 'Ouviu uma história ao pé do fogo', v: 5, d: 1440 },
    contouHistoria: { t: 'Contou uma história', v: 5, d: 1440 },
    festa: { t: 'Dançou na festa', v: 8, d: 3 * 1440 },
    consolado: { t: 'Foi consolado no luto', tf: 'Foi consolada no luto', v: 10, d: 5 * 1440 },
    consolou: { t: 'Consolou quem sofria', v: 3, d: 2 * 1440 },
    brigou: { t: 'Brigou com alguém', v: -6, d: 2 * 1440 },
    fezPazes: { t: 'Fez as pazes', v: 6, d: 2 * 1440 },
    aprendeuCom: { t: 'Aprendeu com os mais velhos', v: 4, d: 2 * 1440 },
    ensinou: { t: 'Ensinou quem está aprendendo', v: 4, d: 2 * 1440 },
    viuEstrela: { t: 'Viu uma estrela cadente', v: 4, d: 1440 },
    arcoIris: { t: 'Viu um arco-íris', v: 4, d: 1440 },
    luaCheia: { t: 'Noite de lua cheia', v: 3, d: 1440 },
    peTorcido: { t: 'Torceu o pé', v: -4, d: 1440 },
    passaros: { t: 'Viu as araras passarem', v: 2, d: 720 },
    sonhoBom: { t: 'Teve um sonho bonito', v: 4, d: 1440 },
    cantou: { t: 'Cantou com os outros', v: 4, d: 1440 },
    novoPar: { t: 'Encontrou um novo amor', v: 10, d: 5 * 1440 },
    agradeceu: { t: 'Agradeceu ao céu', v: 3, d: 1440 },
    // Etapa 8: invenções
    ouviuFlauta: { t: 'Ouviu a flauta ao pé do fogo', v: 6, d: 1440 },
    tocouFlauta: { t: 'Tocou flauta para o povo', v: 6, d: 1440 },
    festaTambor: { t: 'Dançou ao som do tambor', v: 10, d: 3 * 1440 },
    comeuCozido: { t: 'Comeu um cozido quente', v: 6, d: 1440 },
    // Etapa 9: bichos
    atacadoBicho: { t: 'Foi atacado por um bicho', tf: 'Foi atacada por um bicho', v: -10, d: 3 * 1440 },
    vencemos: { t: 'Viu o povo vencer a fera', v: 10, d: 3 * 1440 },
    lutou: { t: 'Lutou para defender os seus', v: 6, d: 2 * 1440 },
    cacouNovo: { t: 'Caçou um bicho que ninguém tinha caçado', v: 6, d: 2 * 1440 },
    // Etapa 10: campo
    plantou: { t: 'Plantou a roça', v: 3, d: 1440 },
    colheita: { t: 'Viu a colheita chegar', v: 6, d: 2 * 1440 },
    criacaoNova: { t: 'Viu chegar bicho de criação', v: 4, d: 1440 },
    tomouLeite: { t: 'Tomou leite fresco', v: 4, d: 720 },
    // relações livres (pedido do jogador na 0.10): só entre adultos
    noiteTres: { t: 'Passou a noite a três', v: 9, d: 2 * 1440 },
    noiteMuitos: { t: 'Esticou a festa noite adentro', v: 10, d: 2 * 1440 },
    // Etapa 11: Deus
    converteu: { t: 'Passou a acreditar', v: 10, d: 5 * 1440 },
    escolhido: { t: 'Foi escolhido por Deus', tf: 'Foi escolhida por Deus', v: 15, d: 10 * 1440 },
    ouviuSermao: { t: 'Ouviu a pregação ao pé do fogo', v: 5, d: 1440 },
    rezou: { t: 'Rezou ao pé da estátua', v: 3, d: 1440 },
  };
  Sim.MEM = MEM; Sim.TRAIT_DESC = TRAIT_DESC;

  // ---------- tempo ----------
  function clock(t) {
    const day = Math.floor(t / C.DAY_MIN);
    const doy = day % C.YEAR_DAYS;
    const season = Math.floor(doy / C.SEASON_DAYS);
    return { day, year: Math.floor(day / C.YEAR_DAYS) + 1, doy, season, dos: (doy % C.SEASON_DAYS) + 1, hour: (t % C.DAY_MIN) / 60 };
  }
  Sim.clock = clock;
  Sim.dateText = function (t) {
    const c = clock(t);
    return 'Ano ' + c.year + ', ' + C.SEASONS[c.season].toLowerCase() + ', dia ' + c.dos;
  };
  Sim.ageOf = function (S, p) { return Math.floor((S.t - p.born) / (C.DAY_MIN * C.YEAR_DAYS)); };
  Sim.has = function (p, tr) { return p.traits.indexOf(tr) >= 0; };

  // ---------- clima ----------
  function seasonBase(dayF) {
    const sd = C.SEASON_DAYS, bl = C.SEASON_BLEND_DAYS;
    const k = Math.floor(dayF / sd);
    const s = ((k % 4) + 4) % 4;
    const into = dayF - k * sd;
    const a = C.SEASON_TEMP[s];
    if (into < sd - bl) return a;
    const b = C.SEASON_TEMP[(s + 1) % 4];
    const f = (into - (sd - bl)) / bl;
    return a + (b - a) * f * f * (3 - 2 * f);
  }
  function dayRand(S, day) { return (G.hash2(day, 7, S.seed) * 2 - 1) * C.DAY_RANDOM; }
  function weatherOf(S, day) {
    const season = Math.floor((day % C.YEAR_DAYS) / C.SEASON_DAYS);
    const h = G.hash2(day, 13, S.seed);
    if (day === 0 || h >= C.RAIN_CHANCE[season]) return { kind: G.hash2(day, 17, S.seed) < 0.3 ? 'nublado' : 'limpo', start: 0, end: 0 };
    const start = 2 + G.hash2(day, 19, S.seed) * 18;
    return { kind: 'chuva', start, end: start + 3 + G.hash2(day, 23, S.seed) * 9 };
  }
  function precipNow(S) {
    const ck = S.ck, h = ck.hour;
    // nevasca, tempestade e seca mandam no céu (a chuva de Deus ainda vence a seca)
    const nar = G.Narr ? G.Narr.precip(S) : undefined;
    if (nar !== undefined) return nar;
    if (S.god && S.god.rainUntil > S.t) return seasonBase(ck.doy + h / 24) < 3.5 ? 'neve' : 'chuva';
    const today = weatherOf(S, ck.day), yest = ck.day > 0 ? weatherOf(S, ck.day - 1) : null;
    let on = today.kind === 'chuva' && h >= today.start && h < today.end;
    if (!on && yest && yest.kind === 'chuva' && yest.end > 24 && h + 24 < yest.end) on = true;
    if (!on) return null;
    return seasonBase(ck.doy + h / 24) < 3.5 ? 'neve' : 'chuva';
  }
  function ambient(S) {
    const ck = S.ck;
    const base = seasonBase(ck.doy + ck.hour / 24);
    const swing = C.DAY_SWING * Math.sin((ck.hour - 9) / 24 * 2 * Math.PI);
    const rnd = U.lerp(dayRand(S, ck.day), dayRand(S, ck.day + 1), ck.hour / 24);
    const pr = S.precip === 'chuva' ? C.RAIN_COLD : S.precip === 'neve' ? C.SNOW_COLD : 0;
    return base + swing + rnd + pr + (G.Narr ? G.Narr.tempMod(S) : 0);
  }
  Sim.seasonBase = seasonBase;
  Sim.weatherOf = weatherOf;
  Sim.daysToWinter = function (S) {
    const ck = S.ck;
    if (ck.season === 3) return 0;
    return 45 - ck.doy;
  };

  function tileTemp(S, i) {
    const t = S.world.tile[i];
    return S.temp + (t === T.MOUNTAIN ? C.MOUNTAIN_COLD : t === T.HILL ? C.HILL_COLD : 0);
  }
  function fireHeat(S, x, y) {
    let best = 0;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y), R = Sim.def(b).fire.r;
      let h = 0;
      if (d <= C.FIRE_FULL_R) h = C.FIRE_HEAT;
      else if (d < R) h = C.FIRE_HEAT * (R - d) / (R - C.FIRE_FULL_R);
      if (h > best) best = h;
    }
    return best;
  }
  Sim.fireHeat = fireHeat;
  function personTemp(S, p) {
    const w = S.world;
    if (p.carriedBy) { const c = G.Family.carrierOf(S, p); if (c && c.alive) return (c.tempHere !== undefined ? c.tempHere : 16) + 3; }
    const fh = fireHeat(S, p.x, p.y) * (p.sleeping && !p.inTent && p.fireShare !== undefined ? p.fireShare : 1);
    let t0 = tileTemp(S, Math.floor(p.y) * w.W + Math.floor(p.x)) + Math.max(fh, G.God.heatAt(S, p.x, p.y));
    if (p.inTent) { const b = Sim.building(S, p.inTent); if (b && b.built) t0 += Sim.def(b).heat || 0; }
    if (p.sleeping && p.manta) t0 += C.MANTA_HEAT;   // Etapa 7: manta tecida
    return t0;
  }
  Sim.personTemp = personTemp;

  // ---------- criação ----------
  Sim.traitClash = function (list, t) {
    return PAIRS.some((pr) => pr.indexOf(t) >= 0 && pr.some((x) => x !== t && list.indexOf(x) >= 0));
  };
  function pickTraits(rng) {
    const pool = [];
    PAIRS.forEach((pr) => pool.push(pr));
    SOLO.forEach((s) => pool.push([s]));
    const out = [];
    while (out.length < 2) {
      const grp = rng.pick(pool);
      if (grp.some((g) => out.indexOf(g) >= 0)) continue;
      const tr = rng.pick(grp);
      if (out.indexOf(tr) < 0) out.push(tr);
    }
    return out;
  }
  function makeLook(rng, sex) {
    return {
      skin: rng.int(0, 4), hair: rng.pick(HAIRS), cloth: rng.int(0, 4),   // só as cores dos humanos (as dos povos: Sim.POVO_LOOK)
      style: sex === 'F' ? rng.int(0, 1) : rng.int(0, 1), beard: sex === 'M' && rng.chance(0.35),
    };
  }
  Sim.colorsOf = function (look) {
    return { skin: SKINS[look.skin][0], skinD: SKINS[look.skin][1], hair: look.hair, cloth: CLOTHS[look.cloth][0], clothD: CLOTHS[look.cloth][1] };
  };
  Sim.randomNames = function (rng) { return [rng.pick(FEM), rng.pick(MASC)]; };
  Sim.namePool = { FEM, MASC };
  Sim.pickTraits = pickTraits; Sim.makeLook = makeLook;

  function makePerson(S, sex, name, age) {
    const rng = S.rng;
    return {
      id: S.nextPid++, name, sex, born: S.t - age * C.DAY_MIN * C.YEAR_DAYS - rng.int(0, C.YEAR_DAYS - 1) * C.DAY_MIN,
      traits: pickTraits(rng),
      skills: { coleta: 0, pesca: 0, construcao: 0, caca: 0, oficio: 0, plantio: 0, criacao: 0 }, tool: null, roupa: null,
      needs: { fome: 80 + rng.range(0, 10), sede: 75 + rng.range(0, 10), energia: 88, calor: 90, social: 70, saude: 100 },
      mood: 60, mem: [], x: 0, y: 0, px: 0, py: 0, dir: 0, walk: 0,
      path: null, pathI: 0, act: null, carry: null, alive: true, cause: '', diedAt: 0,
      sleeping: false, inTent: 0, say: null, sayId: 0, sayAt: -999, nextEval: 0, fail: {}, chatCool: 0, rel: {},
      dmg: { fome: 0, sede: 0, frio: 0 }, look: makeLook(rng, sex), tempHere: 16, touched: false, warned: {},
      bonds: {}, feud: {},   // Etapa 6: pares (id: afeto) e brigas (id: até quando)
    };
  }

  Sim.makePerson = makePerson;
  // Ato 1: as cinco metas que abrem a próxima fase e missões menores (opt), todas com recompensa em Poder (Etapa 6).
  // Missão que sobra passa para a fase seguinte.
  function makeGoals() {
    return [
      { id: 'olhar', text: 'Toque em alguém para ver o que sente', opt: true, reward: 3, done: false },
      { id: 'fogo', text: 'Acenda a primeira fogueira', reward: 6, done: false },
      { id: 'vontade', text: 'Mude uma Vontade', opt: true, reward: 2, done: false },
      { id: 'frutas20', text: 'Colha 20 frutas', opt: true, reward: 3, done: false },
      { id: 'agua10', text: 'Guarde 10 cabaças de água', opt: true, reward: 3, done: false },
      { id: 'barraca', text: 'Construa uma barraca', reward: 8, done: false },
      { id: 'peixe5', text: 'Pesque 5 peixes', opt: true, reward: 4, done: false },
      { id: 'milagre', text: 'Faça um milagre', opt: true, reward: 4, done: false },
      { id: 'historia', text: 'Ouça uma história ao pé do fogo', opt: true, reward: 4, done: false },
      { id: 'comida', text: 'Guarde ' + C.GOAL_FOOD + ' porções de comida', reward: 8, done: false },
      { id: 'lenha', text: 'Guarde ' + C.GOAL_WOOD + ' de madeira', reward: 6, done: false },
      { id: 'oracao', text: 'Atenda a uma oração', opt: true, reward: 6, done: false },
      { id: 'inverno', text: 'Sobreviva ao primeiro inverno', reward: 15, done: false },
    ];
  }
  Sim.makeGoals = makeGoals;
  // recompensa das metas das outras fases (e dos saves antigos)
  const REWARD = { filho: 10, camas: 6, estoque: 6, ajuda: 8, povo: 12, festa: 5, ensino: 4,
    d_pedra: 6, d_ferramentas: 6, d_conserva: 8, d_roupas: 8, d_ceramica: 10, d_aldeia: 15,
    o_fogueira: 4, o_caminho: 3, o_armazem: 5, o_tabuas: 4, o_casa: 12, o_oficinas: 8, o_mantas: 8, o_caminhos: 6, o_melhorias: 10,
    i_faca: 4, i_corda: 4, i_tres: 6, i_arco: 6, i_tambor: 6, i_todas: 15, b_tres: 5, b_seis: 8, b_luta: 6, b_onca: 10,
    c_roca: 6, c_cinco: 10, c_curral: 8, c_cerca: 6 };
  function fixGoals(S) {
    // save da 0.5 no Ato 1: a lista nova, com o que já estava feito
    if ((S.goalsPhase || 1) === 1 && !S.goals.some((g) => g.id === 'olhar')) {
      const done = new Set(S.goals.filter((g) => g.done).map((g) => g.id));
      S.goals = makeGoals();
      for (const g of S.goals) if (done.has(g.id)) { g.done = true; g.paid = true; }
    }
    for (const g of S.goals) {
      if (g.reward === undefined) g.reward = REWARD[g.id] || 0;
      if (g.done && g.paid === undefined) g.paid = true;   // o que já foi feito antes da recompensa existir não paga de novo
    }
  }

  Sim.newGame = function (seed, site, names, world) {
    const w = world || G.W.generate(seed);
    const S = {
      v: 1, seed: seed >>> 0, world: w, t: C.START_HOUR * 60,
      rng: new G.RNG((seed ^ 0xa5a5a5a5) >>> 0),
      camp: { x: site.x, y: site.y }, siteLabel: G.W.siteLabel(w, G.W.evalSite(w, site.x, site.y)),
      stock: Object.assign({}, C.START_STOCK), vontades: Object.assign({}, C.DEFAULT_VONTADES),
      people: [], buildings: [], nextPid: 1, nextBid: 1,
      chron: [], events: [], goals: makeGoals(), stats: { firstFire: false, firstTent: false, allGoals: false, winters: 0 },
      over: false, arrived: false,
    };
    S.ck = clock(S.t);
    S.precip = null; S.temp = 16;
    foundCamp(S);
    const [nf, nm] = names || Sim.randomNames(S.rng);
    const a = makePerson(S, 'F', nf, S.rng.int(19, 24));
    const b = makePerson(S, 'M', nm, S.rng.int(20, 26));
    S.people.push(a, b);
    arrive(S, [a, b]);
    Sim.init(S);
    return S;
  };

  function foundCamp(S) {
    const w = S.world;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = (S.camp.y + dy) * w.W + S.camp.x + dx;
      const o = G.W.objAt(w, i);
      if (o) G.W.removeObj(w, o);
    }
  }
  Sim.isCamp = function (S, i) {
    const w = S.world, x = i % w.W, y = (i / w.W) | 0;
    return x >= S.camp.x && x <= S.camp.x + 1 && y >= S.camp.y && y <= S.camp.y + 1;
  };

  function arrive(S, list) {
    const w = S.world, campI = S.camp.y * w.W + S.camp.x;
    const r = G.W.findNearest(w, campI, (i) => {
      const x = i % w.W, y = (i / w.W) | 0;
      return Math.hypot(x - S.camp.x, y - S.camp.y) >= 9 ? 1 : 0;
    }, 40);
    let path = [], sx = S.camp.x, sy = S.camp.y;
    if (r) { sx = r.idx % w.W; sy = (r.idx / w.W) | 0; path = r.path.slice().reverse().slice(1).concat([campI]); }
    list.forEach((p, k) => {
      p.x = sx + 0.5 + (k ? 0.35 : -0.35); p.y = sy + 0.5; p.px = p.x; p.py = p.y;
      p.act = { type: 'chegar', stage: 'go', t: 0, score: 999 };
      p.path = path.length ? path.slice() : null; p.pathI = 0;
    });
  }

  // ---------- memórias, fala, eventos ----------
  Sim.addMem = function (S, p, k) {
    const def = MEM[k]; if (!def) return;
    const ex = p.mem.find((m) => m.k === k);
    if (ex) ex.until = S.t + def.d; else p.mem.push({ k, until: S.t + def.d });
  };
  // kind: o jeito do balão (god, briga, festa, casal, historia, consolo)
  Sim.say = function (S, p, text, force, kind) {
    if (!force && S.t - p.sayAt < 40) return;
    p.say = text; p.sayId++; p.sayAt = S.t; p.sayKind = kind || '';
  };
  Sim.toast = function (S, text, tone) { S.events.push({ k: 'toast', text, tone: tone || '' }); };
  Sim.chron = function (S, text) { S.chron.push({ t: S.t, text }); S.events.push({ k: 'chron', text }); };
  Sim.float = function (S, x, y, text) { S.events.push({ k: 'float', x, y, text }); };

  // ---------- construções ----------
  Sim.building = function (S, id) { for (const b of S.buildings) if (b.id === id) return b; return null; };
  // Etapa 7: a definição da obra no nível dela. O nível 1 é o BUILD; cada melhoria troca o que muda;
  // no nível 3 da barraca entra a casa escolhida (HOUSES)
  const defCache = {};
  Sim.defOf = function (type, lv, kind) {
    lv = lv || 1;
    const key = type + ':' + lv + ':' + (kind || '');
    if (defCache[key]) return defCache[key];
    const base = C.BUILD[type];
    if (!base) return null;
    const d = Object.assign({}, base);
    delete d.up;
    for (let i = 2; i <= lv; i++) {
      const u = base.up && base.up[i - 2];
      if (!u) break;
      if (u.choose) { const h = C.HOUSES[kind]; if (h) Object.assign(d, h); }
      else Object.assign(d, u);
    }
    d.type = type; d.lv = lv; d.kind = kind || null;
    d.max = !(base.up && base.up[lv - 1]);   // último nível
    defCache[key] = d;
    return d;
  };
  Sim.def = (b) => Sim.defOf(b.type, b.lv, b.kind);
  // o que a obra ainda pede para poder ser marcada (vazio = pode): descoberta, obra no acampamento, material que ainda não existe
  Sim.needWhy = function (S, d) {
    const T = G.Tech;
    if (d.need && !T.known(S, d.need)) return 'pede ' + T.DISC[d.need].name.toLowerCase();
    const has = (t) => S.buildings.some((x) => x.built && x.type === t);
    if (d.needB && !has(d.needB)) return 'pede ' + (C.BUILD[d.needB].a === 'o' ? 'um ' : 'uma ') + C.BUILD[d.needB].name.toLowerCase();
    const cost = d.cost || {};
    if (cost.tabuas && !has('marcenaria')) return 'pede tábuas: construa uma marcenaria';
    if (cost.fibra && !T.known(S, 'cestos')) return 'pede fibra: vem com os cestos';
    if (cost.argila && !T.known(S, 'ceramica')) return 'pede argila: vem com a cerâmica';
    return '';
  };
  // melhorias possíveis de uma obra pronta: [{ lv, kind, def, why }] (why vazio = dá para marcar)
  Sim.upgrades = function (S, b) {
    if (!b.built || b.up || b.demol) return [];
    const base = C.BUILD[b.type], lv = b.lv || 1;
    const u = base && base.up && base.up[lv - 1];
    if (!u) return [];
    return (u.choose || [null]).map((kind) => {
      const d = Sim.defOf(b.type, lv + 1, kind);
      let why = Sim.needWhy(S, d);
      if (!why && kind && G.Obras && !G.Obras.envOk(S, b, C.HOUSES[kind].env)) why = 'pede ' + C.ENV[C.HOUSES[kind].env].name;
      return { lv: lv + 1, kind, def: d, why };
    });
  };
  Sim.canPlace = function (S, type, x, y) {
    const def = C.BUILD[type], w = S.world;
    if (def.near && Math.hypot(x + def.w / 2 - S.camp.x - 1, y + def.h / 2 - S.camp.y - 1) > def.near + 1) return 'Longe do estoque: tem que ficar a até ' + def.near + ' passos';
    if (def.env && G.Obras && !G.Obras.envOk(S, { x, y, w: def.w, h: def.h }, def.env)) return 'Pede ' + C.ENV[def.env].name;   // Etapa 12: a mina
    for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx < 1 || ty < 1 || tx >= w.W - 1 || ty >= w.H - 1) return 'Fora do mapa';
      const i = ty * w.W + tx;
      if (S.seen && !S.seen[i]) return 'A névoa cobre esse lugar';
      if (G.IS_WATER[w.tile[i]]) return 'Não dá para construir na água';
      if (def.soil && (w.tile[i] === T.SAND || w.tile[i] === T.MOUNTAIN)) return 'A roça pede terra boa: nada de areia ou pedra';   // Etapa 10
      if (w.bgrid[i] >= 0) return 'Já tem uma obra aqui';
      if (Sim.isCamp(S, i)) return 'Esse é o lugar do estoque';
      const o = G.W.objAt(w, i);
      if (o && o.k !== 'stump' && o.k !== 'bush') return o.k === 'tree' ? 'Tem uma árvore no caminho' : o.k === 'rock' ? 'Tem uma pedra no caminho' : 'Lugar ocupado';
    }
    return '';
  };
  Sim.placeBlueprint = function (S, type, x, y) {
    if (Sim.canPlace(S, type, x, y)) return null;
    const def = C.BUILD[type], w = S.world;
    const b = { id: S.nextBid++, type, lv: 1, kind: null, x, y, w: def.w, h: def.h, built: false, progress: 0,
      have: {}, fuel: 0, beds: [], up: null };
    for (const k of C.MATERIALS) b.have[k] = 0;
    for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
      const i = (y + dy) * w.W + x + dx;
      const o = G.W.objAt(w, i);
      if (o) G.W.removeObj(w, o);
      if (G.Obras) G.Obras.clearTile(S, i);   // a obra toma o lugar do caminho (e do caminho marcado)
      if (G.Campo) G.Campo.clearTile(S, i);   // e da cerca (Etapa 10)
      w.bgrid[i] = b.id; G.W.refreshBlock(w, i);
    }
    S.buildings.push(b);
    if (G.Campo) G.Campo.wallMark(S, b, true);   // a obra é parede para bicho (Etapa 10)
    Sim.refresh(S);
    return b;
  };
  Sim.removeBuilding = function (S, b) {
    const w = S.world;
    // devolve material entregue (na obra que mudava de lugar, o que já tinha chegado ao lugar novo)
    const src = b.up ? b.up.have : b.re ? b.re.have : b.built ? null : b.have;
    if (src) for (const k of C.MATERIALS) S.stock[k] += src[k] || 0;
    if (b.up) { b.up = null; Sim.refresh(S); return; }
    // 0.12: o lugar reservado de uma mudança sai junto com ela, e a mudança acaba se o lugar reservado sair
    if (b.site) { const o = Sim.building(S, b.site); if (o && o.demol && o.demol.site === b.id) o.demol = null; }
    if (b.demol && b.demol.site) { const st = Sim.building(S, b.demol.site); b.demol = null; if (st) Sim.removeBuilding(S, st); }
    if (b.batch) { S.stock[b.batch.k] += b.batch.n; b.batch = null; }   // a carga do moquém ou do jirau volta crua
    for (const p of S.people) {
      if (p.inTent === b.id) { G.AI.abort(S, p); p.inTent = 0; }
      if (p.act && p.act.b === b.id) G.AI.abort(S, p);
    }
    if (G.Campo) G.Campo.onRemoved(S, b);   // a colheita no chão volta ao estoque; os bichos procuram outro curral
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) {
      const i = (b.y + dy) * w.W + b.x + dx;
      w.bgrid[i] = -1; G.W.refreshBlock(w, i);
    }
    S.buildings.splice(S.buildings.indexOf(b), 1);
    Sim.refresh(S);
  };
  // ---------- demolir e mudar de lugar (0.12) ----------
  // tudo o que a obra custou até o nível em que está: material e trabalho
  Sim.totalCost = function (b) {
    const cost = {};
    let work = 0;
    for (let lv = 1; lv <= (b.lv || 1); lv++) {
      const d = Sim.defOf(b.type, lv, b.kind);
      for (const k in d.cost || {}) cost[k] = (cost[k] || 0) + d.cost[k];
      work += d.work || 0;
    }
    return { cost, work };
  };
  Sim.canDemolish = (S, b) => !!(b && b.built && !b.up && !b.demol && !b.site && !b.re);
  Sim.canMove = (S, b) => Sim.canDemolish(S, b) && !C.NO_MOVE[b.type];
  // demolir: o povo desmonta (Vontade de Construir) e metade do material volta ao estoque
  Sim.startDemolish = function (S, b) {
    if (!Sim.canDemolish(S, b)) return false;
    b.demol = { progress: 0, site: 0, work: Math.max(45, Math.round(Sim.totalCost(b).work * C.DEMOL_WORK)) };
    Sim.refresh(S);
    return true;
  };
  // o lugar novo serve? (o mesmo que para uma obra nova)
  Sim.canMoveTo = (S, b, x, y) => (Sim.canMove(S, b) ? Sim.canPlace(S, b.type, x, y) : 'Esta obra não muda de lugar');
  // mudar de lugar: o lugar novo fica reservado; o povo desmonta a obra, leva o que dá para aproveitar e ergue de novo lá
  Sim.startMove = function (S, b, x, y) {
    if (Sim.canMoveTo(S, b, x, y)) return null;
    const site = Sim.placeBlueprint(S, b.type, x, y);
    if (!site) return null;
    site.site = b.id; site.lv = b.lv || 1; site.kind = b.kind || null;
    b.demol = { progress: 0, site: site.id, work: Math.max(45, Math.round(Sim.totalCost(b).work * C.DEMOL_WORK)) };
    Sim.refresh(S);
    return site;
  };
  // desistir da demolição (ou da mudança: o lugar reservado é liberado)
  Sim.cancelDemolish = function (S, b) {
    if (!b || !b.demol) return false;
    const site = b.demol.site ? Sim.building(S, b.demol.site) : null;
    b.demol = null;
    if (site) Sim.removeBuilding(S, site);
    Sim.refresh(S);
    return true;
  };
  function evict(S, b) {
    for (const p of S.people) {
      if (p.inTent === b.id) { G.AI.abort(S, p); p.inTent = 0; }
      if (p.act && p.act.b === b.id) G.AI.abort(S, p);
    }
    if (b.guests) delete b.guests;
    if (b.batch) { S.stock[b.batch.k] += b.batch.n; b.batch = null; }   // a carga do moquém ou do jirau volta crua
  }
  function vacate(S, b) {
    const w = S.world;
    if (G.Campo) G.Campo.wallMark(S, b, false);
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) { const i = (b.y + dy) * w.W + b.x + dx; w.bgrid[i] = -1; G.W.refreshBlock(w, i); }
  }
  function occupy(S, b) {
    const w = S.world;
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) {
      const i = (b.y + dy) * w.W + b.x + dx, o = G.W.objAt(w, i);
      if (o) G.W.removeObj(w, o);
      if (G.Obras) G.Obras.clearTile(S, i);
      if (G.Campo) G.Campo.clearTile(S, i);
      w.bgrid[i] = b.id; G.W.refreshBlock(w, i);
    }
    if (G.Campo) G.Campo.wallMark(S, b, true);
  }
  const MATW = { madeira: 'madeira', pedra: 'pedra', argila: 'argila', tabuas: 'tábuas', fibra: 'fibra' };
  function finishDemolish(S, b) {
    const d = Sim.def(b), tot = Sim.totalCost(b), art = d.a === 'o' ? 'o' : 'a';
    const site = b.demol.site ? Sim.building(S, b.demol.site) : null;
    b.demol = null;
    evict(S, b);
    S.stats.demolished = (S.stats.demolished || 0) + 1;
    if (site) {
      // a mudança: o lugar reservado dá lugar à própria obra, por erguer, com o material que veio junto
      const x = site.x, y = site.y;
      site.site = 0;
      Sim.removeBuilding(S, site);
      vacate(S, b);
      b.x = x; b.y = y;
      occupy(S, b);
      const have = {};
      for (const k of C.MATERIALS) have[k] = Math.floor((tot.cost[k] || 0) * C.MOVE_KEEP);
      b.built = false; b.progress = 0;
      b.re = { cost: tot.cost, have, work: Math.max(60, Math.round(tot.work * C.MOVE_WORK)), progress: 0 };
      S.stats.moved = (S.stats.moved || 0) + 1;
      Sim.toast(S, (art === 'o' ? 'O ' : 'A ') + d.name.toLowerCase() + ' foi desmontad' + art + '. O povo leva o que deu para aproveitar para o lugar novo.', '');
    } else {
      const back = [];
      for (const k of C.MATERIALS) { const n = Math.floor((tot.cost[k] || 0) * C.DEMOL_REFUND); if (n > 0) { S.stock[k] = (S.stock[k] || 0) + n; back.push(n + ' de ' + (MATW[k] || k)); } }
      Sim.removeBuilding(S, b);
      Sim.chron(S, 'O povo desmontou ' + art + ' ' + d.name.toLowerCase() + '.' + (back.length ? ' Voltou ao estoque: ' + back.join(', ') + '.' : ''));
    }
    Sim.refresh(S);
  }

  // marca a melhoria (kind: a casa escolhida; sem kind, a primeira que dá)
  Sim.startUpgrade = function (S, b, kind) {
    if (b.demol || b.site || b.re) return false;
    const opts = Sim.upgrades(S, b).filter((o) => !o.why);
    const o = kind ? opts.find((x) => x.kind === kind) : opts[0];
    if (!o) return false;
    b.up = { lv: o.lv, kind: o.kind || null, have: {}, progress: 0 };
    for (const k of C.MATERIALS) b.up.have[k] = 0;
    Sim.refresh(S);
    return true;
  };
  Sim.upDef = (b) => (b.up ? Sim.defOf(b.type, b.up.lv, b.up.kind) : null);
  // obra em andamento: projeto novo ou melhoria
  Sim.jobOf = function (b) {
    // 0.12: o lugar reservado de uma mudança não é obra; a demolição e a obra que se ergue de novo são
    if (b.site) return null;
    if (b.demol) return { b, demol: true, cost: {}, have: {}, work: b.demol.work, get progress() { return b.demol.progress; }, set progress(v) { b.demol.progress = v; } };
    if (b.re) return { b, re: true, cost: b.re.cost, have: b.re.have, work: b.re.work, get progress() { return b.re.progress; }, set progress(v) { b.re.progress = v; } };
    if (!b.built) { const d = C.BUILD[b.type]; return { b, cost: d.cost, have: b.have, work: d.work, get progress() { return b.progress; }, set progress(v) { b.progress = v; } }; }
    if (b.up) { const d = Sim.upDef(b); return { b, cost: d.cost, have: b.up.have, work: d.work, get progress() { return b.up.progress; }, set progress(v) { b.up.progress = v; } }; }
    return null;
  };
  Sim.missing = function (job) {
    const out = {};
    for (const k of C.MATERIALS) out[k] = 0;
    for (const k in job.cost) out[k] = Math.max(0, job.cost[k] - (job.have[k] || 0));
    return out;
  };
  Sim.complete = function (S, b) {
    if (b.demol) { finishDemolish(S, b); return; }
    if (b.re) {
      // a obra que mudou de lugar está de pé de novo, como era (nível, moradores, o que guardava)
      const d = Sim.def(b);
      b.built = true; b.progress = 1; b.re = null;
      Sim.chron(S, (d.a === 'o' ? 'O ' : 'A ') + d.name.toLowerCase() + ' mudou de lugar.');
      S.people.forEach((p) => p.alive && Sim.addMem(S, p, 'obra'));
      Sim.refresh(S);
      return;
    }
    if (b.up) {
      const from = Sim.def(b);
      b.lv = b.up.lv; b.kind = b.up.kind || b.kind || null; b.up = null;
      const d = Sim.def(b);
      Sim.chron(S, (from.a === 'o' ? 'O ' : 'A ') + from.name.toLowerCase() + ' virou ' + d.name.toLowerCase() + '.');
      if (G.Obras) G.Obras.onUpgraded(S, b, from);
    } else {
      b.built = true; b.progress = 1;
      if (b.type === 'fogueira') {
        b.fuel = 3;
        if (!S.stats.firstFire) {
          S.stats.firstFire = true; Sim.chron(S, 'A primeira fogueira foi acesa.'); S.people.forEach((p) => p.alive && Sim.addMem(S, p, 'fogueira'));
          if (G.Life) G.Life.onFirstFire(S);
        }
        else Sim.toast(S, 'Fogueira pronta.');
      } else if (G.Tech && G.Tech.onBuilt(S, b)) {
        // moquém, jirau e forno: a Tech conta a história
      } else if (G.Obras && G.Obras.onBuilt(S, b)) {
        // armazém, marcenaria e tecelagem (Etapa 7)
      } else if (G.Campo && G.Campo.onBuilt(S, b)) {
        // roça e curral (Etapa 10)
      } else if (G.Deus && G.Deus.onBuilt(S, b)) {
        // a estátua (Etapa 11)
      } else if (G.Memoria && G.Memoria.onBuilt(S, b)) {
        // o cemitério (Etapa 13)
      } else {
        if (!S.stats.firstTent) { S.stats.firstTent = true; Sim.chron(S, 'Ergueram a primeira barraca.'); }
        else Sim.toast(S, C.BUILD[b.type].name + ' pronta.');
      }
    }
    S.people.forEach((p) => p.alive && Sim.addMem(S, p, 'obra'));
    Sim.refresh(S);
  };

  // ---------- contexto para a IA ----------
  Sim.refresh = function (S) {
    const ck = S.ck = clock(S.t);
    const st = S.stock;
    const alive = S.people.filter((p) => p.alive).length || 1;
    const ctx = S.ctx || (S.ctx = { bushFruit: 0 });
    ctx.alive = alive;
    ctx.hour = ck.hour;
    ctx.night = ck.hour >= 21 || ck.hour < 5;
    ctx.evening = ck.hour >= 19 && ck.hour < 21;
    let food = 0, fv = 0;
    for (const k of G.Tech.FOOD) { const n = st[k] || 0; food += n; fv += n * G.Tech.foodValue(k, S); }
    ctx.food = food;
    ctx.mouths = G.Family.mouths(S);
    ctx.foodDays = fv / (ctx.mouths * C.HUNGER_H * 24);
    let fire = null, lit = false, tents = 0;
    for (const b of S.buildings) {
      if (b.type === 'fogueira' && b.built) { if (b.fuel > 0) lit = true; if (!fire || b.fuel < fire.fuel) fire = b; }
      if (b.built && Sim.def(b).cap) tents++;
    }
    ctx.fire = fire; ctx.fireLit = lit; ctx.tents = tents;
    const nightH = ck.hour >= 18 || ck.hour < 7;
    const cold = S.temp < 13 || (nightH && S.temp < 16) || (S.precip && S.temp < 20);
    // com frio, ou com lobos rondando (o fogo espanta), a fogueira não pode apagar
    ctx.fireNeedsFuel = !!(fire && fire.fuel <= C.FIRE_REFUEL_AT && st.madeira > 0 && (cold || (G.Narr && G.Narr.wantFire(S))));
    // obra da vez: a primeira que dá para tocar (material entregue ou no estoque); senão, a primeira da fila
    let job = null, needs = null, doable = false;
    const short = {};
    for (const k of C.MATERIALS) short[k] = 0;
    for (const b of S.buildings) {
      const j = Sim.jobOf(b);
      if (!j) continue;
      const m = Sim.missing(j);
      let sum = 0, can = false;
      for (const k of C.MATERIALS) { sum += m[k]; short[k] += m[k]; if (m[k] > 0 && st[k] > 0) can = true; }
      const ok = sum === 0 || can;
      if (!job || (ok && !doable)) { job = j; needs = m; doable = ok; }
    }
    if (G.Campo) short.madeira += G.Campo.fenceShort(S);   // as cercas marcadas pedem vara (Etapa 10)
    for (const k of C.MATERIALS) short[k] = Math.max(0, short[k] - (st[k] || 0));
    ctx.job = job;
    ctx.jobNeeds = needs || Object.assign({}, short, { madeira: 0, pedra: 0, argila: 0, tabuas: 0, fibra: 0 });
    ctx.jobDoable = doable;
    ctx.matShort = short;   // o que falta no estoque para todas as obras marcadas
  };
  function countBushFruit(S) {
    let n = 0;
    for (const o of S.world.objs) {
      if (o.k === 'bush' && o.fruit > 0 && Math.abs(o.x - S.camp.x) < 24 && Math.abs(o.y - S.camp.y) < 24) n += o.fruit;
    }
    S.ctx.bushFruit = n;
  }

  // ---------- necessidades ----------
  function updateNeeds(S, p, dt) {
    const h = dt / 60, n = p.needs, has = Sim.has;
    const rest = p.sleeping ? C.SLEEP_METABOLISM : 1;
    const baby = !!p.carriedBy;
    const mm = baby ? { fome: 0.8, sede: 0.8, energia: 0, frio: 1.2 } : G.Family.needMult(S, p);
    n.fome -= C.HUNGER_H * h * rest * mm.fome * (has(p, 'Comilão') ? 1.25 : 1);
    n.sede -= C.THIRST_H * h * rest * mm.sede * (S.ck.season === 1 ? C.THIRST_SUMMER : 1) * (G.Narr ? G.Narr.thirstMult(S) : 1);
    if (baby) { n.energia = 100; n.social = 100; }
    else if (p.sleeping) {
      let rate = C.SLEEP_GROUND_H;
      if (p.inTent) { const b = Sim.building(S, p.inTent); rate = (b && Sim.def(b).sleep) || C.SLEEP_TENT_H; }
      if (p.rede) rate *= C.REDE_SLEEP;   // Etapa 7: rede tecida
      n.energia += rate * h;
    } else n.energia -= C.ENERGY_H * h * mm.energia;
    if (baby) { /* no colo, sempre acompanhado */ }
    else if (p.act && p.act.type === 'conversar' && p.act.chat && p.act.chat.on) n.social += C.CHAT_SOCIAL_H * h;
    else if (p.act && p.act.type === 'brincar' && p.act.stage === 'play') n.social += C.CHAT_SOCIAL_H * 0.5 * h;
    else if (p.act && ((p.act.type === 'ouvir' && p.act.stage === 'listen') || (p.act.type === 'historia' && p.act.stage === 'tell') ||
      (p.act.type === 'festa' && p.act.stage === 'dance'))) n.social += C.CHAT_SOCIAL_H * 0.8 * h;   // história e festa: companhia de todos
    else n.social -= C.SOCIAL_H * h;
    const tp = p.tempHere = personTemp(S, p);
    const cm = (has(p, 'Friorento') ? 1.3 : has(p, 'Resistente ao frio') ? 0.7 : 1) * mm.frio * G.Tech.coldMult(p, S);   // roupa de couro (costurada, com a agulha, esquenta mais)
    const deficit = C.COMFORT - tp;
    if (deficit > 0) {
      const floor = Math.max(0, 100 - deficit * C.COLD_SLOPE * cm);
      if (n.calor > floor) n.calor = Math.max(floor, n.calor - (C.COLD_RATE + deficit * C.COLD_RATE_DEG) * cm * h * (p.sleeping ? 1.1 : 1));
      else n.calor = Math.min(floor, n.calor + C.WARM_GAIN * h);
    } else n.calor += (C.WARM_GAIN - deficit * C.WARM_GAIN_DEG) * h;
    for (const k of ['fome', 'sede', 'energia', 'calor', 'social']) n[k] = U.clamp(n[k], 0, 100);
    let hurt = false;
    if (n.fome <= 0) { const d = C.HEALTH_DAY.fome / 24 * h; n.saude -= d; p.dmg.fome += d; hurt = true; }
    if (n.sede <= 0) { const d = C.HEALTH_DAY.sede / 24 * h; n.saude -= d; p.dmg.sede += d; hurt = true; }
    if (n.calor <= 0) { const d = C.HEALTH_DAY.frio / 24 * h; n.saude -= d; p.dmg.frio += d; hurt = true; }
    else if (n.calor < C.HYPOTHERMIA_BELOW) { const d = C.HYPOTHERMIA_DAY / 24 * h; n.saude -= d; p.dmg.frio += d; hurt = true; }
    if (!hurt && n.fome > 25 && n.sede > 25 && n.calor > 25) n.saude += C.HEALTH_REGEN_DAY / 24 * h * (G.Deus && G.Deus.saber(S, 'medicina') ? C.MEDICINA_REGEN : 1);
    n.saude = Math.min(100, n.saude);
    // saúde cheia: as feridas antigas não contam mais para a causa de uma morte futura
    if (n.saude >= 100) { const d = p.dmg; if (d.fome || d.sede || d.frio || d.raio || d.parto || d.lobo || d.onca || d.jacare || d.bicho) { d.fome = d.sede = d.frio = 0; d.raio = d.parto = d.lobo = d.onca = d.jacare = d.bicho = 0; } }
    if (S.safe && n.saude < C.OFFLINE_HEALTH_FLOOR) n.saude = C.OFFLINE_HEALTH_FLOOR;
    // desmaia de cansaço, menos quem está indo se aquecer: esse aguenta até chegar ao fogo
    if (!baby && n.energia <= 0 && !p.sleeping && (!p.act || ['dormir', 'beber', 'comer', 'parto', 'aquecer', 'fugir', 'fogo'].indexOf(p.act.type) < 0)) {
      G.AI.abort(S, p);
      G.AI.forceSleepHere(S, p);
    }
  }

  function hourlyPerson(S, p) {
    const n = p.needs;
    p.mem = p.mem.filter((m) => m.until > S.t);
    if (n.fome < 10) Sim.addMem(S, p, 'passouFome');
    if (n.sede < 10) Sim.addMem(S, p, 'passouSede');
    if (n.calor < 20) Sim.addMem(S, p, 'passouFrio');
    let m = 50;
    for (const me of p.mem) m += MEM[me.k].v;
    if (p.criado && G.Memoria) m += G.Memoria.mood(p);   // Etapa 13: quem cresceu ouvindo contos de medo ou de cuidado
    if (Sim.has(p, 'Otimista')) m += 8;
    if (Sim.has(p, 'Pessimista')) m -= 8;
    for (const k of ['fome', 'sede', 'calor', 'energia']) if (n[k] < 25) m -= 6;
    if (n.social < 20) m -= 4;
    if (n.saude < 50) m -= 8;
    if (p.joia) m += C.JOIA_MOOD;   // Etapa 12: quem usa joia anda de cabeça erguida
    p.mood = U.clamp(Math.round(m), 0, 100);
    // avisos ao jogador (uma vez por crise)
    warn(S, p, 'frio', n.calor < 25, p.name + ' está congelando.');
    warn(S, p, 'fome', n.fome < 15, p.name + ' está com muita fome.');
    warn(S, p, 'sede', n.sede < 15, p.name + ' está com muita sede.');
    warn(S, p, 'saude', n.saude < 40, p.name + ' está fraco. Saúde em ' + Math.round(n.saude) + '.');
    // surto de humor
    const h = S.ck.hour;
    const crisis = n.sede < 25 || n.fome < 20 || n.calor < 20 || n.energia < 25;
    if (p.mood < 12 && !crisis && h >= 7 && h < 17 && !p.sleeping && !p.carriedBy && !p.labor && G.Family.age(S, p) >= 12 && (!p.act || p.act.type !== 'greve') &&
      (p.greveAt === undefined || S.t - p.greveAt > 2 * C.DAY_MIN) && !(G.Deus && G.Deus.dom(S, 'temor')) && S.rng.chance(0.25)) {
      p.greveAt = S.t;
      G.AI.abort(S, p);
      G.AI.startGreve(S, p);
      Sim.toast(S, p.name + ' entrou em greve: "Chega! Não aguento mais."', 'bad');
    }
  }
  function warn(S, p, k, cond, text) {
    if (cond && !p.warned[k]) { p.warned[k] = true; Sim.toast(S, text, 'bad'); }
    else if (!cond && p.warned[k]) p.warned[k] = false;
  }

  // ---------- ciclos ----------
  // ---------- a memória da aldeia (0.12) ----------
  // Uma vez por dia, à meia-noite: quanto de cada coisa a aldeia costuma ter guardado por boca (o nível, numa média
  // por estação), quanto as habilidades e a prática das descobertas andam num dia e quanto se trabalha em obra.
  // Não muda nada na simulação: é o que o jogo fechado usa para os dias resumidos (offline.js), no lugar de simular
  // 300 dias pessoa por pessoa.
  const HIST_N = 12;   // a média pesa os últimos 12 dias de cada estação (mais ou menos o último ano)
  const ema = (old, v, n) => (old === undefined ? v : old + (v - old) / Math.min(n, HIST_N));
  function remember(S) {
    const h = S.hist || (S.hist = { day: -2, s: [null, null, null, null], n: [0, 0, 0, 0] });
    const day = S.ck.day;
    if (S.resumido) { h.last = null; h.day = day; return; }   // dia resumido não ensina nada: é a própria memória tocando
    const st = S.stock, mouths = Math.max(1, S.ctx ? S.ctx.mouths : 1);
    // quem trabalha: de 12 anos para cima, fora do colo
    let workers = 0;
    const sk = {};
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || G.Family.age(S, p) < 12) continue;
      workers++;
      for (const k in p.skills) sk[k] = (sk[k] || 0) + p.skills[k];
    }
    let prat = 0, open = 0;
    if (S.tech) for (const id in S.tech.prat) if (!S.tech.known[id]) { prat += S.tech.prat[id]; open++; }
    const snap = { sk, workers, prat, open, build: S.stats.buildMin || 0 };
    const se = (S.ck.season + (S.ck.dos === 1 ? 3 : 0)) % 4;   // a estação do dia que acabou
    const b = h.s[se] || (h.s[se] = { lv: {}, sk: {}, prat: 0, build: 0, nd: 0 });
    const n = ++h.n[se];
    for (const k in st) { const v = (st[k] || 0) / mouths; if (v || b.lv[k] !== undefined) b.lv[k] = +ema(b.lv[k], v, n).toFixed(3); }
    // o que anda de um dia para o outro só vale com dois dias seguidos vividos de verdade
    if (h.last && h.day === day - 1) {
      const nd = ++b.nd, w = Math.max(1, Math.min(workers, h.last.workers));
      for (const k in sk) b.sk[k] = +ema(b.sk[k], Math.max(0, (sk[k] - (h.last.sk[k] || 0)) / w), nd).toFixed(4);
      // a prática: por descoberta aberta (quando uma fecha, a soma cai: esse dia não conta)
      if (open && open === h.last.open && prat >= h.last.prat) b.prat = +ema(nd > 1 ? b.prat : undefined, (prat - h.last.prat) / open, nd).toFixed(3);
      b.build = +ema(nd > 1 ? b.build : undefined, Math.max(0, snap.build - h.last.build), nd).toFixed(1);
    }
    h.last = snap; h.day = day;
  }
  Sim.remember = remember;

  function daily(S) {
    const ck = S.ck, w = S.world;
    remember(S);
    const per = C.BUSH_DAYS_PER_FRUIT[ck.season];
    const bm = G.Narr ? G.Narr.bushMult(S) : 1;   // seca para, fartura acelera
    const terra = G.Deus && G.Deus.dom(S, 'terra') ? C.DOM.terraBush : 1;   // Etapa 11: Mão na Terra
    for (const o of w.objs) {
      if (o.k === 'bush') {
        if (o.holy) {
          // Etapa 11: a árvore criada por Deus dá fruta o ano todo, até no inverno e na seca
          if (o.fruit < C.ARVORE_MAX && !S.resumido) {
            o.grow += Math.max(1, bm) * terra / C.ARVORE_DAYS;
            if (o.grow >= 1) { const add = Math.floor(o.grow); o.fruit = Math.min(C.ARVORE_MAX, o.fruit + add); o.grow -= add; }
          }
          continue;
        }
        if (ck.season === 3) { o.fruit = 0; o.grow = 0; continue; }   // o inverno derruba as frutas que sobraram
        if (S.resumido) continue;   // dia resumido: a fruta colhida já entra pela média da aldeia
        if (per > 0 && bm > 0 && o.fruit < C.BUSH_MAX) {
          o.grow += bm / per * terra;
          if (o.grow >= 1) { const add = Math.floor(o.grow); o.fruit = Math.min(C.BUSH_MAX, o.fruit + add); o.grow -= add; }
        }
      } else if (o.k === 'stump') {
        o.regrow = (o.regrow || 0) + 1;
        const i = o.y * w.W + o.x;
        // no caminho, na trilha e no caminho marcado a árvore não volta (Etapa 7)
        if (o.regrow >= C.TREE_REGROW_DAYS && w.bgrid[i] < 0 && !Sim.isCamp(S, i) && !(w.road && (w.road[i] || w.roadJob[i])) && !(w.fence && (w.fence[i] || w.fenceJob[i])) &&
          !S.people.some((p) => p.alive && Math.floor(p.x) === o.x && Math.floor(p.y) === o.y)) {
          o.k = 'tree'; o.regrow = 0; G.W.refreshBlock(w, i);
        }
      }
    }
    // comida estraga no estoque: calor apressa, frio conserva; defumado e fruta seca quase não; potes de barro ajudam
    const rm = C.ROT_SEASON[ck.season] * (G.Obras ? G.Obras.storeMult(S) : 1), Te = G.Tech;   // o armazém guarda melhor (Etapa 7)
    let lost = 0;
    lost += rot(S, 'frutas', C.ROT_FRUIT * rm * Te.rotMult(S, 'frutas'));
    lost += rot(S, 'peixe', C.ROT_FISH * rm * Te.rotMult(S, 'peixe'));
    lost += rot(S, 'carne', C.ROT_MEAT * rm * Te.rotMult(S, 'carne'));
    lost += rot(S, 'defumado', C.ROT_DEFUMADO * rm);
    lost += rot(S, 'seca', C.ROT_SECA * rm);
    // Etapa 10: o que vem da roça dura (feijão e milho secos quase não estragam); ovo e leite, pouco
    for (const k of ['feijao', 'milho', 'abobora', 'mandioca']) if (S.stock[k]) lost += rot(S, k, C.ROCA[k].rot * rm);
    if (S.stock.ovos) lost += rot(S, 'ovos', C.ROT_OVOS * rm);
    if (S.stock.leite) lost += rot(S, 'leite', C.ROT_LEITE * rm);
    S.stats.rottedToday = lost;
    Te.onRot(S, lost);   // ver comida estragar ensina a conservar
    const season = C.SEASONS[ck.season];
    if (ck.dos === 1 && ck.day > 0) {
      if (ck.season === 3) Sim.chron(S, S.stats.winters === 0 ? 'Chegou o primeiro inverno.' : 'Começou o inverno.');
      else if (ck.season === 0) {
        S.stats.winters++;
        const alive = S.people.filter((p) => p.alive);
        if (S.stats.winters === 1 && alive.length) Sim.chron(S, 'O primeiro inverno terminou. ' + listNames(alive) + (alive.length > 1 ? ' sobreviveram.' : ' sobreviveu.'));
        else Sim.toast(S, 'Começou a ' + season.toLowerCase() + '.');
        if (G.Life && alive.length) G.Life.onSpring(S);   // agradecem pelo inverno vencido e fazem festa
      } else Sim.toast(S, 'Começou o ' + season.toLowerCase() + '.');
    }
    const dw = Sim.daysToWinter(S);
    if (dw === 10 || dw === 5) Sim.toast(S, 'O inverno chega em ' + dw + ' dias. Estoque comida e lenha.', 'warn');
    G.Family.daily(S);
    if (G.Narr) G.Narr.daily(S);
    G.Tech.daily(S);
    if (G.Obras) G.Obras.daily(S);
    if (G.Fauna) G.Fauna.daily(S);
    if (G.Campo) G.Campo.daily(S);   // Etapa 10: roça, criação, descobertas do campo
    if (G.Minas) G.Minas.daily(S);   // Etapa 12: as descobertas da mina
    if (G.Povos) G.Povos.daily(S);   // a convivência e as caravanas
    if (G.Memoria) G.Memoria.daily(S);   // Etapa 13: visitas à cova, promessas, o costume do rito
    if (G.Life) G.Life.daily(S);
  }
  function rot(S, k, rate) {
    if (S.resumido) return 0;   // dia resumido: o que estraga já está na média da aldeia
    const acc = S.stats.rotAcc || (S.stats.rotAcc = {});
    acc[k] = (acc[k] || 0) + (S.stock[k] || 0) * rate;
    const n = Math.floor(acc[k]);
    if (n <= 0) return 0;
    const lost = Math.min(n, S.stock[k]);
    S.stock[k] -= lost; acc[k] -= n;
    S.stats.rotted = (S.stats.rotted || 0) + lost;
    return lost;
  }
  function listNames(arr) {
    const n = arr.map((p) => p.name);
    return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1];
  }
  Sim.listNames = listNames;

  // dia resumido (jogo fechado): o povo está parado; da hora, só o que anda sozinho. Família (gravidez, parto, a
  // noite dos pares) e festa marcada, toda hora; humor e lembranças, quatro vezes por dia; metas, uma
  function hourlyRest(S) {
    const h = Math.floor(S.ck.hour);
    if (h % 6 === 0) for (const p of S.people) if (p.alive) hourlyPerson(S, p);
    G.Family.hourly(S);
    if (G.Narr) G.Narr.hourly(S);
    if (G.Memoria) G.Memoria.hourly(S);   // Etapa 13: sem cerimônia com o jogo fechado
    if (G.Life) G.Life.hourly(S);
    if (h === 12) checkGoals(S);
  }
  function hourly(S) {
    if (S.resumido) { hourlyRest(S); return; }
    countBushFruit(S);
    const low = S.ctx.foodDays < 2 && S.ctx.bushFruit < 6;
    if (low && !S.stats.foodWarn) { S.stats.foodWarn = true; Sim.toast(S, 'A comida está acabando. Suba Pesca ou Frutas nas Vontades.', 'warn'); }
    else if (S.ctx.foodDays > 4) S.stats.foodWarn = false;
    for (const p of S.people) if (p.alive) hourlyPerson(S, p);
    G.Family.hourly(S);
    if (G.Narr) G.Narr.hourly(S);
    G.Tech.hourly(S);
    if (G.Obras) G.Obras.hourly(S);
    if (G.Campo) G.Campo.hourly(S);
    if (G.Minas) G.Minas.hourly(S);   // Etapa 12: a ferramenta de ferro e a joia de quem passa pelo acampamento
    if (G.Povos) G.Povos.hourly(S);   // e a caravana que está para chegar
    if (G.Memoria) G.Memoria.hourly(S);   // Etapa 13: o corpo, o velório, o rito, o dia dos mortos
    if (G.Life) G.Life.hourly(S);
    checkGoals(S);
  }

  const GOAL_TEST = {
    fogo: (S) => S.stats.firstFire,
    barraca: (S) => S.stats.firstTent,
    comida: (S) => S.ctx.food >= C.GOAL_FOOD,
    lenha: (S) => S.stock.madeira >= C.GOAL_WOOD,
    inverno: (S) => S.stats.winters >= 1 && S.people.some((p) => p.alive),
    olhar: (S) => !!S.stats.inspected,
    vontade: (S) => !!S.stats.vontadeChanged,
    frutas20: (S) => (S.stats.got && S.stats.got.frutas || 0) >= 20,
    agua10: (S) => S.stock.agua >= 10,
    peixe5: (S) => (S.stats.got && S.stats.got.peixe || 0) >= 5,
    milagre: (S) => !!(S.god && S.god.miracles > 0),
    historia: (S) => (S.stats.stories || 0) > 0,
    oracao: (S) => !!(S.god && S.god.answered > 0),
    festa: (S) => (S.stats.parties || 0) > 0,
    ensino: (S) => (S.stats.taught || 0) > 0,
  };
  // metas que ainda contam para abrir a próxima fase (as missões opt não seguram)
  const core = (S) => S.goals.filter((g) => !g.opt);
  const leftover = (S) => S.goals.filter((g) => g.opt && !g.done);
  function checkGoals(S) {
    for (const g of S.goals) {
      if (g.done) continue;
      const fn = GOAL_TEST[g.id] || G.Family.goalTest[g.id] || G.Tech.goalTest[g.id] || (G.Obras && G.Obras.goalTest[g.id]) || (G.Inv && G.Inv.goalTest[g.id]) || (G.Bichos && G.Bichos.goalTest[g.id]) || (G.Campo && G.Campo.goalTest[g.id]) || (G.Deus && G.Deus.goalTest[g.id]) || (G.Povos && G.Povos.goalTest[g.id]) || (G.Minas && G.Minas.goalTest[g.id]) || (G.Memoria && G.Memoria.goalTest[g.id]);
      if (!fn || !fn(S)) continue;
      g.done = true;
      if (g.reward && S.god && !g.paid) { g.paid = true; G.God.gain(S, g.reward); }
      Sim.toast(S, 'Meta cumprida: ' + g.text.toLowerCase() + '.' + (g.reward ? ' +' + g.reward + ' de Poder.' : ''), 'good');
      S.events.push({ k: 'goal', id: g.id });
    }
    if (!S.goalsPhase || S.goalsPhase === 1) {
      if (!S.stats.allGoals && core(S).every((g) => g.done)) {
        S.stats.allGoals = true;
        Sim.chron(S, 'A base está pronta. O povo aprendeu a atravessar o inverno.');
      }
      if (S.stats.allGoals) {
        S.goalsPhase = 2; S.goals = G.Family.goals2().concat(missions(S, 2), leftover(S));
        Sim.toast(S, 'Novas metas: a família.', 'good');
        checkGoals(S);
      }
    } else if (S.goalsPhase === 2) {
      if (!S.stats.famGoals && core(S).every((g) => g.done)) {
        S.stats.famGoals = true;
        Sim.chron(S, 'A família cresceu. O povo já se sustenta com as próprias mãos.');
      }
      // Etapa 5: depois da família, as descobertas
      if (S.stats.famGoals) {
        S.goalsPhase = 3; S.goals = G.Tech.goals3().concat(missions(S, 3), leftover(S));
        Sim.toast(S, 'Novas metas: as descobertas.', 'good');
        checkGoals(S);
      }
    } else if (S.goalsPhase === 3) {
      // Etapa 7: depois das descobertas (e do fim da Era da Família), a aldeia: casas, oficinas, caminhos
      if (G.Obras && core(S).every((g) => g.done)) {
        S.stats.techGoals = true;
        S.goalsPhase = 4; S.goals = G.Obras.goals4().concat(missions(S, 4), leftover(S));
        Sim.toast(S, 'Novas metas: a aldeia.', 'good');
        checkGoals(S);
      }
    } else if (S.goalsPhase === 4) {
      if (!S.stats.aldeiaGoals && core(S).every((g) => g.done)) {
        S.stats.aldeiaGoals = true;
        Sim.chron(S, 'A aldeia tomou forma: casas, oficinas e caminhos ligando tudo.');
      }
    }
  }
  // missões pequenas das obras que entram em cada fase (Etapa 7)
  const missions = (S, phase) => (G.Obras ? G.Obras.missions(phase) : []).concat(G.Inv ? G.Inv.missions(phase) : [], G.Bichos ? G.Bichos.missions(phase) : [],
    G.Campo ? G.Campo.missions(phase) : [], G.Deus ? G.Deus.missions(phase) : [], G.Povos ? G.Povos.missions(phase) : [], G.Minas ? G.Minas.missions(phase) : [], G.Memoria ? G.Memoria.missions(phase) : [])
    .filter((m) => !S.goals.some((g) => g.id === m.id));
  Sim.checkGoals = checkGoals;
  Sim.daily = (S) => daily(S);   // para os testes

  function updateBuildings(S, dt) {
    for (const b of S.buildings) {
      if (b.type === 'fogueira' && b.built && b.fuel > 0) {
        const f = Sim.def(b).fire;   // a fogueira de pedras segura a lenha e a chuva
        b.fuel -= dt / 60 / f.burn * (S.precip === 'chuva' ? f.rain : 1) * (G.Narr ? G.Narr.fireMult(S) : 1);
        if (b.fuel <= 0) {
          b.fuel = 0;
          if (S.temp < 14 && S.people.some((p) => p.alive)) Sim.toast(S, 'A fogueira apagou.', 'warn');
        }
      }
    }
  }

  // ---------- morte ----------
  function die(S, p) {
    p.alive = false; p.diedAt = S.t;
    const d = p.dmg;
    p.cause = d.frio >= d.fome && d.frio >= d.sede ? 'frio' : d.sede >= d.fome ? 'sede' : 'fome';
    if ((d.raio || 0) > 0 && p.needs.saude <= 0 && (d.raio || 0) >= Math.max(d.frio, d.fome, d.sede)) p.cause = 'raio';
    if ((d.parto || 0) > 0 && (d.parto || 0) >= Math.max(d.frio, d.fome, d.sede, d.raio || 0)) p.cause = 'parto';
    // bichos (Etapa 9): lobo, onça, jacaré ou outro bicho; vence quem mais feriu
    const beasts = [['lobos', d.lobo || 0], ['onca', d.onca || 0], ['jacare', d.jacare || 0], ['bicho', d.bicho || 0]].sort((a, b) => b[1] - a[1]);
    if (beasts[0][1] > 0 && beasts[0][1] >= Math.max(d.frio, d.fome, d.sede, d.raio || 0, d.parto || 0)) p.cause = beasts[0][0];
    if (d.velhice) p.cause = 'velhice';
    S.stats.lastDeathAt = S.t;   // o Narrador dá um respiro depois de uma perda
    if (G.Narr) G.Narr.onDeath(S);
    G.AI.abort(S, p);
    p.sleeping = false;
    if (p.inTent) { const b = Sim.building(S, p.inTent); if (b) { p.x = b.x + 1; p.y = b.y + b.h + 0.5; } p.inTent = 0; }
    for (const b of S.buildings) b.beds = b.beds.filter((id) => id !== p.id);
    const w = S.world;
    // Etapa 13: o corpo espera o velório e o enterro. Com o jogo fechado, ou sem ninguém para carregar, a cova nasce ali
    if (!(G.Memoria && G.Memoria.onDeath(S, p))) {
      const r = G.W.findNearest(w, Math.floor(p.y) * w.W + Math.floor(p.x),
        (i) => (!G.W.objAt(w, i) && w.bgrid[i] < 0 && !Sim.isCamp(S, i) && !G.IS_WATER[w.tile[i]] ? 1 : 0), 30);
      if (r) G.W.addObj(w, 'grave', r.idx % w.W, (r.idx / w.W) | 0, { name: p.name, pid: p.id, t: S.t });
    }
    const causeTxt = { frio: 'de frio', sede: 'de sede', fome: 'de fome', raio: 'atingid' + (p.sex === 'F' ? 'a' : 'o') + ' por um raio', parto: 'no parto', velhice: 'de velhice', lobos: 'no ataque dos lobos',
      onca: 'no ataque da onça', jacare: 'no ataque de um jacaré', bicho: 'atacad' + (p.sex === 'F' ? 'a' : 'o') + ' por um bicho' }[p.cause];
    const age = Sim.ageOf(S, p);
    Sim.chron(S, p.name + ' morreu ' + causeTxt + (age < 1 ? ', com poucos meses.' : ', ' + (age < 12 ? 'com ' : 'aos ') + age + (age === 1 ? ' ano.' : ' anos.')));
    G.Family.onDeath(S, p);
    for (const q of S.people) if (q.alive && !q.mem.some((m) => m.k === 'perdeuCompanheiro' || m.k === 'perdeuFamilia')) Sim.addMem(S, q, 'perdeuAlguem');
    G.God.onDeath(S, p);
    if (G.Life) G.Life.onDeath(S, p);
    if (!S.people.some((q) => q.alive)) {
      S.over = true;
      Sim.chron(S, 'O povo se foi. Restam os túmulos e esta crônica.');
      S.events.push({ k: 'over' });
    }
  }

  // ---------- névoa: Deus vê e age só onde o povo já esteve ----------
  function reveal(S, x, y, r) {
    const w = S.world, seen = S.seen;
    let n = 0;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w.W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(w.H - 1, Math.ceil(y + r));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * w.W + tx;
      if (!seen[i] && (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2 <= r * r) { seen[i] = 1; n++; }
    }
    if (n) S.seenRev = (S.seenRev || 0) + 1;
    return n;
  }
  Sim.reveal = reveal;
  Sim.isSeen = function (S, x, y) {
    const w = S.world;
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return false;
    return !S.seen || S.seen[y * w.W + x] === 1;
  };
  function lookAround(S, p) {
    const i = Math.floor(p.y) * S.world.W + Math.floor(p.x);
    if (p.seenTile === i) return;
    p.seenTile = i;
    reveal(S, Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, (G.Deus ? G.Deus.seeR(S) : C.SEE_R) * (p.sangue && G.Povos ? G.Povos.sight(p) : 1));   // Olhos do Céu: mais longe; a vista longa do elfo (Etapa 12)
  }

  // a fogueira aquece bem só quem cabe em volta dela: os mais perto ganham o lugar
  function fireSeats(S) {
    const out = [];
    for (const p of S.people) { if (p.alive && p.sleeping && !p.inTent && !p.carriedBy) out.push(p); else p.fireShare = 1; }
    if (!out.length) return;
    for (const p of out) p.fireShare = C.FIRE_CROWD;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      const f = Sim.def(b).fire;
      const near = out.filter((p) => Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < f.r && p.fireShare < 1)
        .sort((a, c) => Math.hypot(b.x + 0.5 - a.x, b.y + 0.5 - a.y) - Math.hypot(b.x + 0.5 - c.x, b.y + 0.5 - c.y) || a.id - c.id);
      for (let i = 0; i < Math.min(f.seats, near.length); i++) near[i].fireShare = 1;
    }
  }

  // ---------- passo ----------
  Sim.step = function (S, dt) {
    if (S.over) return;
    const prevHour = Math.floor(S.t / 60), prevDay = Math.floor(S.t / C.DAY_MIN);
    S.t += dt;
    S.ck = clock(S.t);
    const newDay = Math.floor(S.t / C.DAY_MIN) !== prevDay;
    S.precip = precipNow(S);
    S.temp = ambient(S);
    if (newDay) { daily(S); G.God.daily(S); }
    if (Math.floor(S.t / 60) !== prevHour) { hourly(S); G.God.hourly(S); }
    // jogo fechado, dia resumido (offline.js): o calendário, a família e Deus andam de verdade (os ganchos acima);
    // o trabalho do dia entra pela média da própria aldeia (S.hist), sem simular pessoa por pessoa
    if (S.resumido) { const c = S.ctx, h = S.ck.hour; c.hour = h; c.night = h >= 21 || h < 5; c.evening = h >= 19 && h < 21; return; }
    updateBuildings(S, dt);
    Sim.refresh(S);
    fireSeats(S);
    for (const p of S.people) {
      if (!p.alive || p.carriedBy) continue;
      p.px = p.x; p.py = p.y;
      G.AI.tick(S, p, dt);
      updateNeeds(S, p, dt);
      if (S.seen) lookAround(S, p);
    }
    for (const p of S.people) {
      if (!p.alive || !p.carriedBy) continue;
      if (G.Family.followCarrier(S, p)) updateNeeds(S, p, dt);
      else p.needs.saude = -999;
    }
    if (G.Narr) G.Narr.step(S, dt);   // lobos e viajantes
    if (G.Fauna) G.Fauna.step(S, dt);   // capivaras
    if (G.Campo) G.Campo.step(S, dt);   // bichos de criação (Etapa 10)
    if (G.Deus && S.god && S.god.pending) G.Deus.tick(S, dt);   // o raio da estátua do trovão (Etapa 11)
    G.Tech.step(S, dt);   // moquém e jirau
    for (const p of S.people) if (p.alive && p.needs.saude <= 0) die(S, p);
  };
  Sim.advance = function (S, minutes) {
    const steps = Math.round(minutes / C.STEP_MIN);
    for (let i = 0; i < steps && !S.over; i++) Sim.step(S, C.STEP_MIN);
  };
  Sim.init = function (S) {
    if (G.Obras) G.Obras.init(S);   // antes de tudo: saves antigos (barraca avançada vira barraca nível 2)
    G.God.init(S);
    if (G.Deus) G.Deus.init(S);   // Etapa 11: glória, níveis, dons, nome, escolhidos
    G.Family.init(S);
    if (G.Narr) G.Narr.init(S);
    G.Tech.init(S);
    if (G.Fauna) G.Fauna.init(S);
    if (G.Bichos) G.Bichos.init(S);   // Etapa 9
    if (G.Campo) G.Campo.init(S);   // Etapa 10
    if (G.Minas) G.Minas.init(S);   // Etapa 12: metais
    if (G.Povos) G.Povos.init(S);   // Etapa 12: povos
    if (G.Life) G.Life.init(S);
    if (G.Memoria) G.Memoria.init(S);   // Etapa 13: corpos, contos, a erva e o rito
    fixGoals(S);
    if (!S.seen) {
      S.seen = new Uint8Array(S.world.W * S.world.H);
      reveal(S, S.camp.x + 1, S.camp.y + 1, S.t > C.START_HOUR * 60 + 60 ? C.SEE_OLD_SAVE : C.SEE_CAMP);
    }
    S.seenRev = (S.seenRev || 0) + 1;
    for (const p of S.people) if (p.alive) { p.seenTile = -1; lookAround(S, p); }
    S.ck = clock(S.t);
    S.precip = precipNow(S);
    S.temp = ambient(S);
    Sim.refresh(S);
    countBushFruit(S);
  };
})(globalThis.G = globalThis.G || {});
