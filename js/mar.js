/* Gods · Etapa 18 (0.19): barcos e outras terras. A canoa pesca melhor no rio e no lago; o barco pesca no mar e leva
   carga até a vila de fora; o navio vai ao mar aberto. Com o navio, você manda uma expedição (quantos vão e quanta
   comida levam): ela sai pela beira do mapa e volta em uma ou duas estações com o que achou, ou não volta. A terra
   achada nasce da semente do mundo, com outra mistura de regiões e, às vezes, um povo do mar que só se conhece
   chegando lá. Numa terra achada dá para fundar colônia, que vive resumida: os navios trazem notícia e carga.
   Uma terra por vez na tela: a colônia não se joga, é acompanhada pelo mapa do mundo. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const M = G.Mar = {};
  const Sim = () => G.Sim, Fam = () => G.Family, So = () => G.Soc;
  const DAY = () => C.DAY_MIN;
  const here = (p) => p.alive && !p.fora && !p.carriedBy;

  M.init = function (S) {
    const m = S.mar || (S.mar = {});
    m.viagem = m.viagem || null;
    m.terras = m.terras || [];
    m.colonias = m.colonias || [];
    m.first = m.first || {};
    const st = S.stats;
    for (const k of ['viagens', 'naufragios', 'terras', 'colonias', 'cargas', 'perdidosMar']) st[k] = st[k] || 0;
  };
  const navios = (S) => S.buildings.filter((b) => b.type === 'navio' && b.built);
  const tem = (S, k) => S.buildings.some((b) => b.type === k && b.built);
  M.navioLivre = (S) => navios(S).find((b) => !b.mar) || null;

  // ---------- a pesca e a carga ----------
  // a canoa pesca mais no rio e no lago; o barco, mais ainda (pesca de mar)
  M.pescaMult = (S) => (tem(S, 'barco') ? C.BARCO_PESCA : tem(S, 'canoa') ? C.CANOA_PESCA : 1);
  // o barco leva carga até a vila de fora: uma troca por semana, mesmo sem mercado
  function cargaBarco(S) {
    const v = S.soc && S.soc.vila;
    if (!v || v.fim || !tem(S, 'barco') || S.ck.day % 7 || !G.Cidade || G.Cidade.nivel(S, 'mercado')) return;
    if (G.Cidade.troca(S, C.MERCADO_N[1], 'o barco')) S.stats.cargas++;
  }

  // ---------- a expedição ----------
  // quem pode ir: adulto de 18 a 50, com saúde, sem bebê no colo e sem cargo de líder; os que mais pescam primeiro
  M.marujos = function (S) {
    const L = S.soc ? S.soc.lider : 0;
    return S.people.filter((p) => here(p) && Fam().age(S, p) >= 18 && Fam().bodyAge(S, p) <= 50 && p.needs.saude >= 60 && p.id !== L && !p.labor && !p.preg &&
      !S.people.some((b) => b.carriedBy === p.id)).sort((a, b) => (b.skills.pesca || 0) - (a.skills.pesca || 0) || a.id - b.id);
  };
  const COMIDA = ['peixe', 'carne', 'defumado', 'seca', 'frutas', 'milho', 'feijao', 'mandioca', 'abobora'];
  const comidaTem = (S) => COMIDA.reduce((s, k) => s + (S.stock[k] || 0), 0);
  function tiraComida(S, n) {
    for (const k of ['defumado', 'seca', 'peixe', 'carne', 'milho', 'feijao', 'mandioca', 'abobora', 'frutas']) {
      const t = Math.min(n, S.stock[k] || 0);
      S.stock[k] -= t; n -= t;
      if (n <= 0) break;
    }
  }
  M.partirWhy = function (S, n, comida) {
    if (!M.navioLivre(S)) return 'precisa de um navio pronto no porto';
    if (S.mar.viagem) return 'o navio já está no mar';
    if (n < C.MAR_TRIPULACAO[0] || n > C.MAR_TRIPULACAO[1]) return 'vão de ' + C.MAR_TRIPULACAO[0] + ' a ' + C.MAR_TRIPULACAO[1];
    if (M.marujos(S).length < n) return 'não há ' + n + ' adultos com saúde para ir';
    if (comidaTem(S) < comida) return 'não há ' + comida + ' de comida no estoque';
    if (S.people.filter((p) => p.alive && !p.fora).length - n < 4) return 'a aldeia ficaria vazia demais';
    return '';
  };
  // sair: a tripulação deixa a aldeia (como quem vai para fora: o parentesco fica) e o navio some do porto
  function embarca(S, gente, why) {
    for (const p of gente) { So().sair(S, p, why); p.away.vila = 0; p.away.mar = 1; }
  }
  M.partir = function (S, n, comida) {
    const why = M.partirWhy(S, n, comida);
    if (why) return { ok: false, why };
    const nav = M.navioLivre(S), gente = M.marujos(S).slice(0, n);
    tiraComida(S, comida);
    embarca(S, gente, 'mar');
    nav.mar = 1;
    const dias = C.MAR_DIAS[0] + S.rng.next() * (C.MAR_DIAS[1] - C.MAR_DIAS[0]);
    S.mar.viagem = { t0: S.t, volta: S.t + dias * DAY(), ids: gente.map((p) => p.id), comida, nav: nav.id };
    S.stats.viagens++;
    Sim().chron(S, Sim().listNames(gente) + ' embarcaram no navio com ' + comida + ' de comida e saíram pela beira do mundo. Voltam em uma ou duas estações, se voltarem.');
    return { ok: true, gente };
  };
  // o perigo da viagem: menos com mais gente e mais comida (até um ponto)
  M.perigo = (v) => Math.max(C.MAR_PERIGO_MIN, C.MAR_PERIGO - 0.02 * v.ids.length - Math.min(0.1, v.comida / 600));

  // ---------- a terra nova ----------
  const TERRAS = ['Ilha do Sol Poente', 'Terra das Três Pedras', 'Costa Vermelha', 'Ilha Comprida', 'Terra dos Ventos', 'Baía Funda'];
  const POVOS = [
    { nome: 'os Marajuçu', jeito: 'pescadores de rede longa, que vivem em casas sobre a água' },
    { nome: 'os Abaréu', jeito: 'navegantes que leem as estrelas e não plantam nada' },
    { nome: 'os Iporã', jeito: 'guerreiros de canoa, desconfiados de quem chega pelo mar' },
    { nome: 'os Corujé', jeito: 'artesãos do barro e da concha, que trocam tudo por sal' },
  ];
  function terraNova(S) {
    const k = S.mar.terras.length, seed = ((S.seed >>> 0) ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
    // a mistura de regiões vem de um mundo pequeno gerado da semente (o mesmo jeito do mundo de cá)
    const w = G.W.generate(seed, 96, 2), conta = new Array(7).fill(0);
    let terra = 0;
    for (let i = 0; i < w.tile.length; i++) if (!G.IS_WATER[w.tile[i]]) { conta[w.reg[i]]++; terra++; }
    const mistura = conta.map((n, r) => [r, n / Math.max(1, terra)]).filter((x) => x[0] && x[1] >= 0.08).sort((a, b) => b[1] - a[1]).map((x) => G.RNAME[x[0]]);
    const h = G.hash2(k, 7, S.seed);
    const t = { id: k, nome: TERRAS[(k + Math.floor(G.hash2(3, 5, S.seed) * TERRAS.length)) % TERRAS.length], seed, mistura, t: S.t, povo: h < C.MAR_POVO ? Object.assign({ laco: 0 }, POVOS[Math.floor(G.hash2(k, 9, S.seed) * POVOS.length)]) : null };
    S.mar.terras.push(t);
    S.stats.terras++;
    return t;
  }
  // o que a viagem traz: o que a terra achada tem de bom
  function carga(S, t, n) {
    const out = {};
    const mapa = { 'Mata fechada': 'nobre', 'Litoral': 'sal', 'Serra alta': 'ouro', 'Mangue': 'peixe', 'Sertão': 'couro', 'Pântano': 'fibra', 'Campo': 'frutas' };
    for (const r of t.mistura.slice(0, 2)) { const k = mapa[r]; if (k) out[k] = (out[k] || 0) + (k === 'ouro' ? 2 : 6) + n; }
    for (const k in out) S.stock[k] = (S.stock[k] || 0) + out[k];
    return Object.keys(out).map((k) => out[k] + ' de ' + (G.AI && G.AI.RES_LABEL && G.AI.RES_LABEL[k] || k)).join(', ');
  }
  // a volta: tudo bem, alguns perdidos no mar, ou o navio que não volta
  function chegada(S) {
    const v = S.mar.viagem, nav = Sim().building(S, v.nav);
    S.mar.viagem = null;
    const gente = v.ids.map((id) => So().away(S, id)).filter((p) => p && !p.morto);
    const r = S.rng.next(), pg = M.perigo(v);
    if (r < pg * 0.35) {
      // o navio não voltou
      for (const p of gente) { p.morto = S.t; p.cause = 'mar'; }
      if (nav) Sim().removeBuilding(S, nav);
      S.stats.naufragios++; S.stats.perdidosMar += gente.length;
      Sim().chron(S, 'O navio não voltou. ' + Sim().listNames(gente) + ' ficaram no mar.');
      for (const q of S.people) if (q.alive) Sim().addMem(S, q, 'parenteFoi');
      return { ok: false, perdido: true };
    }
    const perdidos = r < pg ? gente.slice(0, 1 + Math.floor(S.rng.next() * Math.min(2, gente.length - 1))) : [];
    for (const p of perdidos) { p.morto = S.t; p.cause = 'mar'; }
    S.stats.perdidosMar += perdidos.length;
    const volta = gente.filter((p) => perdidos.indexOf(p) < 0);
    const cx = S.camp.x + 1.5, cy = S.camp.y + 2.5;
    volta.forEach((p, k) => So().voltar(S, p, cx + (k % 3), cy + Math.floor(k / 3)));
    if (nav) nav.mar = 0;
    let txt = 'O navio voltou' + (perdidos.length ? ', sem ' + Sim().listNames(perdidos) + ', que o mar levou' : ' com todos') + '.';
    const nova = S.mar.terras.length < C.MAR_TERRAS && S.rng.next() < C.MAR_ACHA;
    const t = nova ? terraNova(S) : S.mar.terras.length ? S.mar.terras[Math.floor(S.rng.next() * S.mar.terras.length)] : null;
    if (t) {
      if (nova) txt += ' Acharam terra além do mar: ' + t.nome + ' (' + t.mistura.join(', ').toLowerCase() + ').' + (t.povo ? ' Lá vivem ' + t.povo.nome + ', ' + t.povo.jeito + '.' : ' Ninguém vive lá.');
      else txt += ' Voltaram a ' + t.nome + '.';
      const c = carga(S, t, volta.length);
      if (c) txt += ' Trouxeram ' + c + '.';
      if (t.povo) t.povo.laco = Math.min(100, t.povo.laco + (t.povo.nome === 'os Iporã' ? -3 : 6));
    } else txt += ' Não acharam terra nenhuma, só mar.';
    Sim().chron(S, txt);
    return { ok: true, terra: t, nova, perdidos: perdidos.length };
  }
  M.chegada = chegada;   // para os testes

  // ---------- a colônia ----------
  M.fundarWhy = function (S, id) {
    const t = S.mar.terras[id];
    if (!t) return 'essa terra não foi achada';
    if (S.mar.colonias.some((c) => c.terra === id && !c.fim)) return 'já há uma colônia lá';
    if (!M.navioLivre(S) || S.mar.viagem) return 'precisa do navio no porto';
    if (M.marujos(S).length < C.COLONIA_GENTE) return 'precisa de ' + C.COLONIA_GENTE + ' adultos com saúde para ir';
    if (comidaTem(S) < C.COLONIA_COMIDA) return 'precisa de ' + C.COLONIA_COMIDA + ' de comida para levar';
    if (S.people.filter((p) => p.alive && !p.fora).length - C.COLONIA_GENTE < 6) return 'a aldeia ficaria vazia demais';
    return '';
  };
  M.fundar = function (S, id) {
    const why = M.fundarWhy(S, id);
    if (why) return { ok: false, why };
    const t = S.mar.terras[id], gente = M.marujos(S).slice(0, C.COLONIA_GENTE);
    tiraComida(S, C.COLONIA_COMIDA);
    embarca(S, gente, 'colonia');
    const c = { id: S.mar.colonias.length, terra: id, nome: 'Nova ' + t.nome.split(' ').slice(-1)[0], ids: gente.map((p) => p.id), n: gente.length, t0: S.t, bem: 60, prox: S.t + C.SEASON_DAYS * DAY(), fim: 0 };
    S.mar.colonias.push(c);
    S.stats.colonias++;
    Sim().chron(S, Sim().listNames(gente) + ' partiram no navio para fundar ' + c.nome + ', em ' + t.nome + '.' + (t.povo ? ' Vão viver perto d' + t.povo.nome + '.' : ''));
    return { ok: true, c };
  };
  // a colônia vive resumida: cresce com fartura, sofre no inverno, e a cada estação o navio traz notícia e carga
  function coloniaDia(S, c) {
    const t = S.mar.terras[c.terra], h = (k) => G.hash2(S.ck.day * 7 + k, c.id, 5150);
    c.bem = Math.max(0, Math.min(100, c.bem + (S.ck.season === 3 ? -0.4 : 0.3) + (t.povo ? t.povo.laco / 400 : 0) + (h(1) - 0.5)));
    // nasce gente com fartura, até o que a terra sustenta (a colônia é pequena: COLONIA_MAX); morre gente todo ano
    if (c.bem > 45 && c.n >= 2 && h(2) < (c.n / 2) * C.VILA_NASC / C.YEAR_DAYS * Math.max(0, 1 - c.n / C.COLONIA_MAX)) c.n++;
    if (h(3) < c.n * (c.bem < 20 ? 0.08 : 0.015) / C.YEAR_DAYS && c.n > 0) c.n--;
    if (c.n <= 0) { c.fim = S.t; Sim().chron(S, 'Em ' + c.nome + ' não mora mais ninguém.'); return; }
    if (S.t < c.prox) return;
    c.prox = S.t + C.SEASON_DAYS * DAY();
    if (!navios(S).length) return;   // sem navio, ninguém vai e ninguém traz
    const vem = Math.round(4 + c.n * (c.bem / 100) * 2), k = t.mistura[0] === 'Mata fechada' ? 'nobre' : t.mistura[0] === 'Litoral' ? 'sal' : 'peixe';
    S.stock[k] = (S.stock[k] || 0) + vem;
    S.stats.cargas++;
    const novas = c.bem > 70 ? 'vão bem, e mandam dizer que a terra é boa' : c.bem > 35 ? 'seguem firmes' : 'passam aperto e pedem ajuda';
    const povo = t.povo ? (t.povo.laco > 30 ? ' Com ' + t.povo.nome + ' vivem em paz e trocam.' : t.povo.laco < -10 ? ' ' + t.povo.nome.charAt(0).toUpperCase() + t.povo.nome.slice(1) + ' não querem eles por perto.' : '') : '';
    if (t.povo) t.povo.laco = Math.max(-100, Math.min(100, t.povo.laco + (h(4) - 0.4) * 6));
    Sim().chron(S, 'O navio voltou de ' + c.nome + ' (' + c.n + (c.n === 1 ? ' pessoa' : ' pessoas') + '): ' + novas + '.' + povo + ' Trouxe ' + vem + ' de ' + ((G.AI && G.AI.RES_LABEL[k]) || k) + '.');
  }

  // ---------- o relógio ----------
  M.daily = function (S) {
    if (!S.mar) M.init(S);
    const v = S.mar.viagem;
    if (v && S.t >= v.volta) chegada(S);
    cargaBarco(S);
    for (const c of S.mar.colonias) if (!c.fim) coloniaDia(S, c);
    // o primeiro barco de cada tipo
    for (const k of ['canoa', 'barco', 'navio']) if (!S.mar.first[k] && tem(S, k)) {
      S.mar.first[k] = S.t;
      Sim().chron(S, { canoa: 'A primeira canoa foi para a água: no rio e no lago, a pesca rende mais.', barco: 'O primeiro barco saiu pela costa: a pesca de mar rende mais, e ele leva carga até a vila de fora.', navio: 'O navio está pronto no porto. O mar aberto espera uma expedição.' }[k]);
    }
  };
  // para o mapa do mundo e a ficha do navio
  M.info = function (S) {
    const m = S.mar || {};
    return {
      viagem: m.viagem ? { dias: Math.max(0, Math.ceil((m.viagem.volta - S.t) / DAY())), n: m.viagem.ids.length } : null,
      terras: (m.terras || []).map((t) => ({ id: t.id, nome: t.nome, mistura: t.mistura, povo: t.povo ? t.povo.nome + ', ' + t.povo.jeito : '', colonia: (m.colonias || []).find((c) => c.terra === t.id && !c.fim) || null, why: M.fundarWhy(S, t.id) })),
    };
  };
})(globalThis.G = globalThis.G || {});
