/* Gods · 0.39: a magia para todos os povos. Algumas pessoas nascem com o dom (os elfos mais, o povo-fera menos). Quem tem o
   dom e vê a torre de magia acorda como mago ou sacerdote: o mago lança fogo na luta (o golpe dele vale o dobro, e a bola de
   fogo atinge quem está perto); o sacerdote cura o povo todo dia e ergue a fé. Deus pode dar o dom a quem não nasceu com
   ele. O conselho das mais velhas segue com a magia dele, à parte; aqui é o saber de cada um. Sorteio próprio. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Ma = G.Magia = {};
  const Sim = () => G.Sim, Fam = () => G.Family, R = () => G.Rpg;

  function sorte(S, p, sal) {
    let x = (Math.imul(p.id | 0, 2654435761) ^ Math.imul((S.t / 60) | 0, 40503) ^ Math.imul(sal | 0, 69069)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }
  // nasce ou não com o dom: fixo por pessoa, sem guardar nem sortear do mundo
  const CHANCE = { elfo: 0.16, humano: 0.06, anao: 0.03, fera: 0.03, meio: 0.08 };
  function hashDom(S, p) {
    let x = (Math.imul(p.id | 0, 40503) ^ Math.imul(S.seed | 0, 2654435761) ^ 0x5bd1e995) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 13;
    return (x >>> 0) / 4294967296;
  }
  Ma.temDom = function (S, p) {
    if (p.domDado) return true;
    const k = G.Povos ? G.Povos.of(p) : 'humano';
    return hashDom(S, p) < (CHANCE[k] || CHANCE.humano);
  };
  const tem = (S, k) => S.buildings.some((b) => b.type === k && b.built);
  Ma.temTorre = (S) => tem(S, 'torremagia');
  const adulto = (S, p) => p.alive && !p.fora && !p.carriedBy && Fam().age(S, p) >= 14;
  const conjurador = (p) => { const r = R() && R().de(p); return r && (r.cls === 'mago' || r.cls === 'sacerdote') ? r.cls : ''; };
  Ma.classe = conjurador;
  // quem tem fé alta vira sacerdote; os outros, mago
  function acorda(S, p, motivo) {
    const cls = (p.fe || 0) >= C.MAGIA_FE_SACERDOTE && sorte(S, p, 21) < 0.6 ? 'sacerdote' : 'mago';
    if (!R().desperta(S, p, cls)) return false;
    S.stats.magos = (S.stats.magos || 0) + 1;
    const nome = R().nome(p).toLowerCase();
    if (S.stats.magos === 1) Sim().chron(S, p.name + ' olhou para a torre e sentiu o que sempre esteve ali: ' + (p.sex === 'F' ? 'é a primeira ' : 'é o primeiro ') + nome + ' do povo. ' + (motivo || ''));
    return true;
  }
  // ---------- o dia ----------
  Ma.daily = function (S) {
    if (S.resumido || !R()) return;
    const torre = Ma.temTorre(S);
    for (const p of S.people) {
      if (!p.alive || p.fora || p.carriedBy) continue;
      const c = conjurador(p);
      if (!c) {
        if (torre && !R().de(p) && adulto(S, p) && Ma.temDom(S, p) && sorte(S, p, 3) < C.MAGIA_ACORDA) acorda(S, p);
        continue;
      }
      if (torre) R().ganha(S, p, 2);   // a torre ensina
      if (c === 'sacerdote') cura(S, p);
      if (c === 'sacerdote' && R().tem(p, 'prece')) for (const q of S.people) if (q.alive && !q.fora && q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 6 && G.God && G.God.addFaith) G.God.addFaith(S, q, 0.5);
    }
  };
  // 0.42: um efeito animado na tela (nada na simulação; o dia resumido não tem tela)
  const fx = (S, k, x, y, o) => { if (!S.resumido && !S.safe && S.events) S.events.push(Object.assign({ k: 'fx', fx: k, x, y }, o || {})); };
  // o sacerdote cura um por dia: quem mais precisa, a qualquer distância na vila
  function cura(S, p) {
    const r = p.rpg, alvo = S.people.filter((q) => q.alive && !q.fora && q.needs.saude < 85).sort((a, b) => a.needs.saude - b.needs.saude)[0];
    if (!alvo) return false;
    const n = C.MAGIA_CURA + r.nv * 1.5;
    alvo.needs.saude = Math.min(100, alvo.needs.saude + n);
    fx(S, 'sacerdote', alvo.x - 0.5, alvo.y - 0.4);
    if (R().tem(p, 'milagre') && alvo.sick) { alvo.sick = null; if (!S.safe) Sim().toast(S, p.name + ' curou a febre de ' + alvo.name + '.', 'good'); }
    if (!S.safe) Sim().float(S, alvo.x, alvo.y, '+saúde');
    R().ganha(S, p, 1);
    S.stats.curasMagia = (S.stats.curasMagia || 0) + 1;
    return true;
  }
  Ma.cura = cura;
  // ---------- a luta ----------
  Ma.dano = (p) => (conjurador(p) === 'mago' ? 2 : 1);
  Ma.conjura = (p) => conjurador(p) === 'mago';
  // a bola de fogo atinge quem está perto de quem levou o golpe
  Ma.espalha = function (S, e, p) {
    if (!R().tem(p, 'bola') || !S.narr) return 0;
    let n = 0;
    for (const o of S.narr.ents) if (o !== e && o.m && !o.gone && Math.hypot(o.x - e.x, o.y - e.y) < 2.5) { n++; G.Monstros.golpe(S, o, p, 1); }
    return n;
  };
  Ma.acerto = (p) => (R().tem(p, 'faisca') ? 0.1 : 0);
  // ---------- Deus dá o dom ----------
  Ma.domWhy = function (S, p) {
    if (!p || !adulto(S, p)) return 'só quem já cresceu';
    if (R().de(p)) return 'já despertou de outro jeito';
    if (!S.god || S.god.poder < C.MAGIA_DOM) return 'faltam ' + Math.ceil(C.MAGIA_DOM - (S.god ? S.god.poder : 0)) + ' de Poder';
    return '';
  };
  Ma.daDom = function (S, p) {
    if (Ma.domWhy(S, p)) return false;
    S.god.poder -= C.MAGIA_DOM;
    p.domDado = S.t;
    fx(S, 'dom', p.x - 0.5, p.y - 0.5, { treme: 2, ms: 260 });
    acorda(S, p, 'Dizem que veio num sonho.');
    if (!S.safe) Sim().toast(S, p.name + ' acordou com o dom: ' + R().nome(p).toLowerCase() + '.', 'good');
    return true;
  };
})(globalThis.G = globalThis.G || {});
