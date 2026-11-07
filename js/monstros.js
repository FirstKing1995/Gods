/* Gods · 0.38: monstros e covis. Com a vila grande ou com a guilda aberta, aparecem covis no mapa (a toca de goblins, a
   poça das gosmas, a cripta, o ninho de aranhas, a caverna do ogro). De tempos em tempos, de noite, sai um bando: anda como
   os lobos, rouba e morde quem está longe do fogo, e os heróis vão para cima. Cada golpe conta: o monstro tem vida e não
   foge ferido. Enquanto o covil existe, ele cresce. A guilda põe a missão de limpar no quadro; Deus pode esmagar o covil
   de uma vez, se quiser pagar. O sorteio é próprio, menos o lugar de onde o bando sai (a mesma regra dos lobos). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Mo = G.Monstros = {};
  const Sim = () => G.Sim, Fam = () => G.Family, R = () => G.Rpg;
  const DAY = () => C.DAY_MIN, YEAR = () => C.YEAR_DAYS * C.DAY_MIN;

  Mo.TIPOS = {
    gosma: { name: 'Gosma', art: 'uma gosma', pl: 'As gosmas', de: 'de gosmas', fem: 1, covil: 'Poça das gosmas', hp: 2, forca: 0.6, pack: [3, 5], min: 0, ouro: 0 },
    goblin: { name: 'Goblin', art: 'um goblin', pl: 'Os goblins', de: 'de goblins', covil: 'Toca dos goblins', hp: 2, forca: 0.7, pack: [3, 6], min: 0, ouro: 1 },
    esqueleto: { name: 'Esqueleto', art: 'um esqueleto', pl: 'Os esqueletos', de: 'de esqueletos', covil: 'Cripta esquecida', hp: 3, forca: 1, pack: [3, 5], min: 5, ouro: 1 },
    aranha: { name: 'Aranha gigante', art: 'uma aranha gigante', pl: 'As aranhas gigantes', de: 'de aranhas', fem: 1, covil: 'Ninho de aranhas', hp: 3, forca: 1.2, pack: [2, 4], min: 5, ouro: 0 },
    ogro: { name: 'Ogro', art: 'um ogro', pl: 'Os ogros', de: 'de ogros', covil: 'Caverna do ogro', hp: 7, forca: 2, pack: [1, 2], min: 10, ouro: 3 },
  };
  function sorte(S, sal) {
    let x = (Math.imul((S.t / 60) | 0, 40503) ^ Math.imul(sal | 0, 2654435761) ^ (S.seed | 0)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 15; x = Math.imul(x, 69069) >>> 0; x ^= x >>> 11;
    return (x >>> 0) / 4294967296;
  }
  Mo.init = function (S) {
    const m = S.monstros || (S.monstros = {});
    m.covis = m.covis || []; m.prox = m.prox || 0; m.nid = m.nid || 1;
    return m;
  };
  const vivos = (S) => S.people.filter((p) => p.alive).length;
  Mo.ativo = (S) => (G.Guilda && G.Guilda.temGuilda(S)) || vivos(S) >= C.MONSTRO_GENTE;
  Mo.covil = (S, id) => (S.monstros ? S.monstros.covis.find((c) => c.id === id) : null);
  Mo.nomeDe = (c) => Mo.TIPOS[c.m].covil;
  // um lugar longe da vila, em terra livre e sem obra
  function lugar(S) {
    const w = S.world;
    for (let k = 0; k < 60; k++) {
      const a = sorte(S, 100 + k) * Math.PI * 2, d = C.COVIL_DIST[0] + sorte(S, 200 + k) * (C.COVIL_DIST[1] - C.COVIL_DIST[0]);
      const x = Math.round(S.camp.x + Math.cos(a) * d), y = Math.round(S.camp.y + Math.sin(a) * d);
      if (x < 3 || y < 3 || x >= w.W - 3 || y >= w.H - 3) continue;
      const i = y * w.W + x;
      if (w.block[i] || G.IS_WATER[w.tile[i]] || w.bgrid[i] >= 0) continue;
      if (S.monstros.covis.some((c) => Math.hypot(c.x - x, c.y - y) < 12)) continue;
      return { x, y };
    }
    return null;
  }
  Mo.novo = function (S, tipo) {
    const m = Mo.init(S), ano = S.ck.year, ks = Object.keys(Mo.TIPOS).filter((k) => Mo.TIPOS[k].min <= ano);
    const k = tipo || ks[Math.floor(sorte(S, m.nid * 3) * ks.length)], at = lugar(S);
    if (!at) return null;
    const c = { id: m.nid++, m: k, x: at.x, y: at.y, nv: 1, t: S.t, ataque: S.t + (C.COVIL_RAID[0] + sorte(S, m.nid) * (C.COVIL_RAID[1] - C.COVIL_RAID[0])) * DAY(), bandos: 0 };
    m.covis.push(c);
    S.stats.covis = (S.stats.covis || 0) + 1;
    const T = Mo.TIPOS[k];
    if (S.stats.covis === 1) Sim().chron(S, 'Quem foi longe voltou contando: há um covil no mato, ' + T.covil.toLowerCase() + '. À noite, sai coisa de lá. Até agora, ninguém foi ver de perto.');
    else if (!S.safe) Sim().toast(S, 'Apareceu um covil no mapa: ' + T.covil + '.', 'warn');
    return c;
  };
  Mo.remove = function (S, id) { const m = Mo.init(S); m.covis = m.covis.filter((c) => c.id !== id); };
  // ---------- o dia e a hora ----------
  Mo.daily = function (S) {
    const m = Mo.init(S);
    if (S.resumido || S.safe || S.over || !Mo.ativo(S)) return;
    if (!m.prox) m.prox = S.t + (5 + sorte(S, 11) * 15) * DAY();
    if (S.t >= m.prox) {
      if (m.covis.length < C.COVIL_MAX) Mo.novo(S);
      m.prox = S.t + (C.COVIL_NOVO[0] + sorte(S, 13) * (C.COVIL_NOVO[1] - C.COVIL_NOVO[0])) * DAY();
    }
    // quem deixa o covil em paz vê ele crescer
    for (const c of m.covis) if (c.nv < 3 && S.t - c.t > c.nv * C.COVIL_CRESCE * YEAR()) { c.nv++; Sim().toast(S, Mo.nomeDe(c) + ' cresceu: os bandos vêm maiores.', 'warn'); }
  };
  Mo.hourly = function (S) {
    const m = S.monstros;
    if (!m || S.safe || S.over || S.resumido || !S.narr) return;
    const A = S.narr.active.lobos;
    if (A && A.monstro) Mo.chamaHerois(S);
    if (!m.covis.length) return;
    const h = S.ck.hour;
    if (h < 20 || h >= 22 || S.narr.active.lobos || S.narr.active.onca) return;
    for (const c of m.covis) {
      if (S.t < c.ataque) continue;
      Mo.bando(S, c);
      return;
    }
  };
  Mo.bando = function (S, c) {
    const T = Mo.TIPOS[c.m], n = T.pack[0] + Math.floor(sorte(S, c.id * 5) * (T.pack[1] - T.pack[0] + 1)) + (c.nv - 1);
    c.ataque = S.t + (C.COVIL_RAID[0] + sorte(S, c.id * 7) * (C.COVIL_RAID[1] - C.COVIL_RAID[0])) * DAY();
    const made = G.Narr.spawnMonstros(S, c.m, n);
    if (!made) return 0;
    c.bandos++; S.stats.bandos = (S.stats.bandos || 0) + 1;
    if (S.stats.bandos === 1) Sim().chron(S, 'Pela primeira vez, ' + T.pl.toLowerCase() + ' vieram até a vila. O povo correu para o fogo.');
    Mo.chamaHerois(S);
    return made;
  };
  // os heróis saem para a luta (os mais fortes primeiro; quem está ferido fica)
  Mo.chamaHerois = function (S) {
    if (!R()) return 0;
    const es = S.narr.ents.filter((e) => e.m && !e.gone && e.state !== 'embora');
    if (!es.length) return 0;
    const hs = R().herois(S).filter((p) => !p.carriedBy && !p.labor && Fam().age(S, p) >= 16 && p.needs.saude >= 40 && !(p.act && p.act.type === 'defender')).slice(0, C.MONSTRO_HEROIS);
    let n = 0;
    hs.forEach((p, k) => { p.sleeping = false; if (p.inTent) { const b = Sim().building(S, p.inTent); if (b) { p.x = b.x + 1; p.y = b.y + b.h + 0.5; p.px = p.x; p.py = p.y; } p.inTent = 0; } if (G.AI.startDefend(S, p, { kind: 'narr', id: es[k % es.length].id })) n++; });
    return n;
  };
  // ---------- o golpe ----------
  // um golpe no monstro: ele tem vida e não foge ferido; caiu, conta, e às vezes deixa alguma coisa
  Mo.golpe = function (S, e, p) {
    const T = Mo.TIPOS[e.m], a = S.narr.active.lobos, Sm = Sim();
    e.hp = (e.hp === undefined ? T.hp : e.hp) - 1;
    if (a) a.fought = (a.fought || 0) + 1;
    if (e.hp > 0) return 'acertou';
    e.gone = true;
    if (a) a.killed++;
    S.stats.monstros = (S.stats.monstros || 0) + 1;
    if (R()) R().ganha(S, p, 6 + T.hp * 2, 'luta');
    if (T.ouro && S.stock.ouro !== undefined && sorte(S, e.id) < 0.25) { S.stock.ouro += T.ouro; Sm.float(S, e.x, e.y, '+' + T.ouro + ' ouro'); }
    if (S.stats.monstros === 1) Sm.chron(S, p.name + ' enfrentou ' + T.art + ' e derrubou. O povo ficou olhando, e no outro dia todo mundo queria aprender a lutar.');
    else Sm.toast(S, p.name + ' derrubou ' + T.art + '.', 'good');
    return 'morto';
  };
  Mo.mordida = (e) => Mo.TIPOS[e.m].forca;
  // ---------- Deus ----------
  Mo.esmagaWhy = function (S) { return !S.god || S.god.poder < C.COVIL_ESMAGA ? 'faltam ' + Math.ceil(C.COVIL_ESMAGA - (S.god ? S.god.poder : 0)) + ' de Poder' : ''; };
  Mo.esmaga = function (S, id) {
    const c = Mo.covil(S, id);
    if (!c || Mo.esmagaWhy(S)) return false;
    S.god.poder -= C.COVIL_ESMAGA;
    Mo.remove(S, id);
    S.stats.covisLimpos = (S.stats.covisLimpos || 0) + 1;
    Sim().chron(S, 'A terra se abriu sobre ' + Mo.nomeDe(c).toLowerCase() + '. Ninguém do povo viu, mas no outro dia o mato estava quieto.');
    S.events.push({ k: 'toast', text: 'O covil não existe mais.', tone: 'good' });
    return true;
  };
})(globalThis.G = globalThis.G || {});
