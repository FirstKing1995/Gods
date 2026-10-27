/* Gods · Etapa 17 (0.18): o mundo grande e as regiões. O mundo de geração 2 tem seis regiões (litoral, mangue,
   serra alta, sertão, mata fechada e pântano), cada uma com o seu chão, bicho, recurso e perigo; o recurso raro mora
   longe (sal no litoral, ouro na serra, madeira nobre na mata). Aqui ficam o que a região faz com o povo (a primeira
   vez em cada uma, o mosquito, a roça do sertão), a ponte de pedra e o mapa do mundo. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Rg = G.Regioes = {};
  const Sim = () => G.Sim;
  const R = () => G.REG;

  Rg.init = function (S) {
    const r = S.regioes || (S.regioes = {});
    r.vistas = r.vistas || {};   // a primeira vez que alguém pisou em cada região
    const st = S.stats;
    for (const k of ['salGot', 'nobreGot', 'ouroVeio', 'mosquito', 'pontes']) st[k] = st[k] || 0;
  };
  Rg.de = (S, x, y) => { const w = S.world; return w.reg ? w.reg[Math.floor(y) * w.W + Math.floor(x)] : 0; };
  Rg.nome = (k) => G.RNAME[k] || '';

  // o que a região conta da primeira vez que alguém do povo pisa nela
  const PRIMEIRA = {
    1: 'chegou ao litoral: areia, maré e, na beira, o sal que o mar deixa.',
    2: 'entrou no mangue: lama até o joelho, caranguejo e mosquito.',
    3: 'subiu a serra alta: frio de doer e, na pedra, riscos de ouro.',
    4: 'entrou no sertão: seco, quente, cacto e cabra solta.',
    5: 'entrou na mata fechada: árvore que não acaba e, entre elas, o jequitibá, madeira nobre.',
    6: 'chegou ao pântano: junco, água parada, jacaré e febre.',
  };
  function primeiras(S) {
    const v = S.regioes.vistas;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy) continue;
      const k = Rg.de(S, p.x, p.y);
      if (!k || v[k]) continue;
      v[k] = S.t;
      Sim().chron(S, p.name + ' ' + PRIMEIRA[k]);
    }
  }
  // o mosquito do mangue e do pântano passa a febre (a da Etapa 16) para quem está ali; de noite, o dobro
  function mosquito(S) {
    if (!G.Cidade || !S.cidade || S.safe) return;
    const noite = S.ctx && S.ctx.night;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || p.sick || p.imune > S.t) continue;
      const k = Rg.de(S, p.x, p.y);
      if (k !== 2 && k !== 6) continue;
      if (S.rng.next() >= C.MOSQUITO_H * (noite ? 2 : 1)) continue;
      if (!S.cidade.peste) {
        S.cidade.peste = { t0: S.t, n: 0, mortes: 0 };
        Sim().chron(S, p.name + ' voltou ' + (k === 2 ? 'do mangue' : 'do pântano') + ' com febre: foi o mosquito.');
      }
      G.Cidade.adoece(S, p);
      S.stats.mosquito++;
    }
  }
  // o que chega da região: a madeira nobre do jequitibá e o ouro do veio
  Rg.trouxe = function (S, p, c) {
    if (c.nobre) {
      S.stock.nobre = (S.stock.nobre || 0) + c.nobre; S.stats.nobreGot += c.nobre;
      if (S.stats.nobreGot === c.nobre) Sim().chron(S, p.name + ' derrubou um jequitibá na mata fechada e trouxe a primeira madeira nobre.');
    }
    if (c.ouro) {
      S.stock.ouro = (S.stock.ouro || 0) + c.ouro; S.stats.ouroVeio += c.ouro;
      if (S.stats.ouroVeio === 1) Sim().chron(S, p.name + ' quebrou uma pedra da serra e achou ouro dentro.');
    }
  };
  Rg.hourly = function (S) {
    if (!S.regioes) Rg.init(S);
    if (!S.world.reg) return;
    primeiras(S);
    mosquito(S);
  };
  Rg.daily = function (S) {
    if (!S.regioes) Rg.init(S);
    const sal = S.stock.sal || 0;
    if (sal > 0 && !S.regioes.salVisto) { S.regioes.salVisto = S.t; Sim().chron(S, 'Chegou sal ao estoque: a carne e o peixe salgados duram o dobro.'); }
  };
  // a roça do sertão rende menos (a seca longa)
  Rg.rocaMult = (S, b) => (Rg.de(S, b.x + 1, b.y + 1) === 4 ? C.SERTAO_ROCA : 1);

  // ---------- a ponte de pedra ----------
  // vai em cima do rio ou da água rasa (nunca da funda) e precisa de terra dos dois lados, a até 8 passos
  function travessia(S, x, y) {
    const w = S.world, T = G.T, agua = (tx, ty) => tx >= 0 && ty >= 0 && tx < w.W && ty < w.H && G.IS_WATER[w.tile[ty * w.W + tx]];
    const best = [];
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let a = 0, b = 0;
      while (a < 9 && agua(x - dx * (a + 1), y - dy * (a + 1)) && agua(x + dy - dx * (a + 1), y + dx - dy * (a + 1))) a++;
      while (b < 9 && agua(x + dx * (2 + b), y + dy * (2 + b)) && agua(x + dy + dx * (2 + b), y + dx + dy * (2 + b))) b++;
      if (a < 9 && b < 9) best.push({ dx, dy, a, b, n: a + b + 2 });
    }
    best.sort((p, q) => p.n - q.n);
    return best[0] || null;
  }
  Rg.ponteWhy = function (S, x, y) {
    const w = S.world, T = G.T;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx < 1 || ty < 1 || tx >= w.W - 1 || ty >= w.H - 1) return 'Fora do mapa';
      const i = ty * w.W + tx;
      if (S.seen && !S.seen[i]) return 'A névoa cobre esse lugar';
      if (!G.IS_WATER[w.tile[i]]) return 'A ponte vai em cima do rio ou da água rasa';
      if (w.tile[i] === T.DEEP) return 'A água funda é larga demais para ponte';
      if (w.bgrid[i] >= 0) return 'Já tem uma obra aqui';
    }
    return travessia(S, x, y) ? '' : 'Precisa de terra dos dois lados, a até 8 passos';
  };
  // pronta: a água do caminho vira chão de pedra (o caminho de pedra, desenhado por cima da água) e a obra sai
  Rg.ponte = function (S, b) {
    const w = S.world, tv = travessia(S, b.x, b.y);
    const marcar = (tx, ty) => { const i = ty * w.W + tx; if (G.IS_WATER[w.tile[i]] && G.Obras) G.Obras.setRoad(S, i, 3); };
    if (tv) for (let k = -tv.a; k < 2 + tv.b; k++) { marcar(b.x + tv.dx * k, b.y + tv.dy * k); marcar(b.x + tv.dy + tv.dx * k, b.y + tv.dx + tv.dy * k); }
    S.stats.pontes++;
    Sim().chron(S, 'A ponte de pedra ficou pronta: agora se atravessa o rio a pé enxuto, e o bicho de criação também passa.');
    Sim().removeBuilding(S, b);
    if (G.R && G.R.invalidate) G.R.invalidate();
  };

  // ---------- o mapa do mundo ----------
  // o que o mapa mostra: o tamanho, quanto já foi visto, e as regiões que o povo já conhece
  Rg.mapaInfo = function (S) {
    const w = S.world, seen = S.seen;
    let vis = 0;
    for (let i = 0; i < seen.length; i++) if (seen[i]) vis++;
    const conhecidas = Object.keys((S.regioes && S.regioes.vistas) || {}).map((k) => G.RNAME[k]);
    const pc = vis / seen.length * 100;
    return { W: w.W, visto: pc < 10 ? Math.round(pc * 10) / 10 : Math.round(pc), conhecidas, gen: w.gen || 1 };
  };
})(globalThis.G = globalThis.G || {});
