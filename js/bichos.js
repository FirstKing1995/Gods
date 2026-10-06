/* Gods · luta (Etapa 9): o povo luta e se defende. Quando um bicho ataca (lobo, onça, jacaré, porco-do-mato ou anta),
   quem foi atacado revida se tem lança na mão (ou o arco), e quem está perto e armado vem ajudar. Cada acerto tira
   vida do bicho: ferido, ele foge; sem vida, cai. Lobo e onça moram no Narrador; o resto, na fauna. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const B = G.Bichos = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Tech = () => G.Tech;

  // armado: ferramenta na mão (a lança vem dela) e a lança já descoberta
  B.armed = (S, p) => !!(p && p.alive && ((p.tool && Tech().known(S, 'lanca')) || (p.sangue && G.Povos && G.Povos.has(p, 'garras') && Fam().age(S, p) >= 12)));   // Etapa 12: o povo-fera luta com as garras
  // o alvo de uma luta: { kind: 'fauna' | 'narr', id } → a entidade, se ainda existe
  B.ent = function (S, tgt) {
    if (!tgt) return null;
    const e = tgt.kind === 'narr' ? (S.narr ? S.narr.ents.find((x) => x.id === tgt.id) : null) : G.Fauna.get(S, tgt.id);
    return e && !e.gone ? e : null;
  };
  // a luta acabou? (o bicho caiu, foi embora, fugiu ou mergulhou)
  B.over = function (S, tgt) {
    const e = B.ent(S, tgt);
    if (!e) return true;
    if (tgt.kind === 'narr') return e.state === 'embora' || (e.state === 'toca' && !tgt.hunt);   // na caçada, a toca é o destino
    return e.state === 'morta' || e.state === 'fuga' || (e.sp === 'jacare' && e.inWater);
  };
  const SP_NAME = { lobo: 'lobo', onca: 'onça' }, SP_THE = { lobo: 'o lobo', onca: 'a onça' };
  B.theOf = (S, tgt) => { const e = B.ent(S, tgt); if (!e) return 'o bicho'; return tgt.kind === 'narr' ? SP_THE[e.k] || 'o bicho' : (C.BICHOS[e.sp] || C.BICHOS.capivara).art.replace(/^uma /, 'a ').replace(/^um /, 'o '); };
  B.nameOf = (S, tgt) => { const e = B.ent(S, tgt); if (!e) return 'bicho'; return tgt.kind === 'narr' ? SP_NAME[e.k] || e.k : (C.BICHOS[e.sp] || C.BICHOS.capivara).name.toLowerCase(); };
  const ATTACK = { jacare: (p) => 'Um jacaré atacou ' + p.name + ' na beira d’água!', porco: (p) => 'Um porco-do-mato partiu para cima de ' + p.name + '!',
    anta: (p) => 'Uma anta ferida derrubou ' + p.name + '!' };

  // mordida (ou chifrada) de um bicho da fauna: dói e assusta; quem pode, revida; quem está perto e armado, ajuda
  B.bite = function (S, src, p, dmg, kind) {
    if (!p.alive || S.safe) return;
    const Sm = Sim(), sev = G.Narr ? G.Narr.kind(S).sev : 1;
    if (S.t < (p.biteCool || 0)) return;
    p.biteCool = S.t + C.LOBO_BITE_MIN;
    const hurt = dmg * sev * (Tech().biteMult ? Tech().biteMult(S, p) : 1);   // com a lança na mão, pega menos
    p.needs.saude -= hurt;
    const cause = kind === 'jacare' ? 'jacare' : 'bicho';
    p.dmg[cause] = (p.dmg[cause] || 0) + hurt;
    Sm.addMem(S, p, 'atacadoBicho');
    S.events.push({ k: 'bite', x: p.x, y: p.y, sp: kind, pid: p.id });
    Sm.say(S, p, 'Socorro!', true);
    if (ATTACK[kind]) Sm.toast(S, ATTACK[kind](p), 'bad');
    S.stats.beastAttacks = (S.stats.beastAttacks || 0) + 1;
    if (kind === 'jacare' && !S.stats.firstJacare) { S.stats.firstJacare = true; Sm.chron(S, 'Um jacaré atacou ' + p.name + ' na beira d’água. Aquela margem ficou marcada.'); }
    const tgt = { kind: src.kind, id: src.e ? src.e.id : src.id };
    B.fightBack(S, p, tgt);
    B.alarm(S, p, tgt);
    // quem foi atacado larga o que fazia (a IA escolhe o próximo passo, longe dali)
    if (p.act && p.act.type !== 'fugir' && p.act.type !== 'defender') G.AI.abort(S, p);
  };

  // revidar: quem foi atacado e tem a lança na mão tenta acertar na hora
  B.fightBack = function (S, p, tgt) {
    if (!B.armed(S, p) || p.needs.saude <= 0 || B.over(S, tgt)) return false;
    if (!S.rng.chance(B.hitChance(S, p) * 0.8)) { Sim().say(S, p, 'Sai daqui!', true); return false; }
    B.strike(S, p, tgt, true);
    return true;
  };
  B.hitChance = (S, p) => C.LUTA_HIT + C.CACA_HIT_LVL * G.AI.lvl(p, 'caca') + (Tech().known(S, 'arco') ? C.ARCO_HIT : 0) +
    (p.tool && p.tool.fe ? C.FERRO_LUTA : 0) + (p.sangue && G.Povos ? G.Povos.lutaHit(p) : 0);   // Etapa 12: a lança de ferro e as garras

  // um golpe (lança) ou uma flechada, já decidido que acertou (sure) ou jogando a chance
  B.strike = function (S, p, tgt, sure) {
    const e = B.ent(S, tgt);
    if (!e) return 'fim';
    const bow = Tech().known(S, 'arco');
    S.events.push({ k: 'throw', x1: p.x, y1: p.y - 0.4, x2: e.x, y2: e.y, bow });
    S.stats.strikes = (S.stats.strikes || 0) + 1;
    if (!sure && !S.rng.chance(B.hitChance(S, p))) { Sim().say(S, p, S.rng.pick(['Errei!', 'Quase!', 'Mais uma!']), false); return 'errou'; }
    S.events.push({ k: 'hit', x: e.x, y: e.y });
    p.skills.caca = (p.skills.caca || 0) + 0.5;
    S.stats.fightHits = (S.stats.fightHits || 0) + 1;
    Sim().addMem(S, p, 'lutou');
    if (tgt.kind === 'narr') return G.Narr.hitEnt(S, e, p);
    const r = G.Fauna.hit(S, e, p);
    if (r === 'morto') B.onKill(S, p, e);
    return r;
  };
  // um bicho perigoso abatido na luta (fora da caça): o povo carneia ali mesmo
  B.onKill = function (S, p, e) {
    const d = G.Fauna.spec(e), Sm = Sim(), y = G.Fauna.yieldOf(S, e.sp);
    const k = S.stats.beastsKilled || (S.stats.beastsKilled = {});
    k[e.sp] = (k[e.sp] || 0) + 1;
    // na caça, quem caçou carneia e leva; na luta, a carne vai direto (e a caça, se era dela, segue normal)
    if (p.act && p.act.type === 'caca' && p.act.prey === e.id) return;
    e.gone = true;
    S.stock.carne += y.carne; S.stock.couro += y.couro;
    Sm.float(S, e.x, e.y, '+' + y.carne + ' carne' + (y.couro ? ' +' + y.couro + ' couro' : ''));
    if (k[e.sp] === 1) Sm.chron(S, p.name + ' enfrentou ' + d.art + ' e venceu.');
  };

  // ajuda: quem está perto, acordado, adulto e armado corre para lutar junto (no máximo LUTA_HELP)
  B.alarm = function (S, victim, tgt) {
    if (S.safe || B.over(S, tgt)) return 0;
    const e = B.ent(S, tgt), AI = G.AI;
    const cands = S.people.filter((q) => q !== victim && q.alive && !q.carriedBy && !q.sleeping && !q.inTent && !q.labor &&
      Fam().age(S, q) >= 16 && B.armed(S, q) && q.needs.saude >= 40 && !(q.act && (q.act.type === 'defender' || q.act.type === 'parto')) &&
      Math.hypot(q.x - e.x, q.y - e.y) <= C.LUTA_R)
      .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, C.LUTA_HELP);
    let n = 0;
    for (const q of cands) if (AI.startDefend(S, q, tgt)) n++;
    if (n) { S.stats.defended = (S.stats.defended || 0) + 1; Sim().say(S, cands[0], S.rng.pick(['Aguenta aí!', 'Tô indo!', 'Larga ele!']), true); }
    return n;
  };

  // pega uma lança do estoque, se não tem uma na mão
  B.arm = function (S, p) {
    if (!p.tool && Tech().known(S, 'lanca') && S.stock.ferramentas > 0) { S.stock.ferramentas--; p.tool = { dur: 100 }; }
    return B.armed(S, p);
  };
  // caçada à onça: na manhã depois de um ataque, 2 ou 3 adultos armados (os melhores caçadores) vão atrás dela na toca.
  // Ninguém vai sozinho: com menos de dois, o povo espera ela ir embora
  B.oncaHunt = function (S, e) {
    if (S.safe || e.gone || e.state !== 'toca') return 0;
    // com chuva, nevasca ou muito frio, fica para amanhã
    if (S.precip || S.temp < 6 || (G.Narr && (G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade')))) return 0;
    const AI = G.AI, busy = (q) => q.act && (q.act.type === 'defender' || q.act.type === 'parto' || q.act.type === 'festa');
    const cands = S.people.filter((q) => q.alive && !q.carriedBy && !q.sleeping && !q.inTent && !q.labor && !q.preg &&
      Fam().age(S, q) >= 16 && Fam().bodyAge(S, q) < 60 && q.needs.saude >= 60 && !busy(q) && (B.armed(S, q) || (Tech().known(S, 'lanca') && S.stock.ferramentas > 0)))
      .sort((a, b) => AI.lvl(b, 'caca') - AI.lvl(a, 'caca') || b.needs.saude - a.needs.saude);
    if (cands.length < 2) return 0;
    const tgt = { kind: 'narr', id: e.id, hunt: true }, went = [];
    for (const q of cands) {
      if (went.length >= C.ONCA_HUNT) break;
      if (B.arm(S, q) && AI.startDefend(S, q, tgt)) went.push(q);
    }
    if (went.length < 2) { for (const q of went) AI.abort(S, q); return 0; }
    const a = S.narr.active.onca;
    if (a) a.hunt = went.map((q) => q.id);
    e.hunted = true;
    const Sm = Sim();
    Sm.toast(S, Sm.listNames(went) + ' foram atrás da onça na mata.', 'warn');
    Sm.say(S, went[0], S.rng.pick(['Hoje a gente acaba com isso.', 'Vamos atrás dela.', 'Ninguém vai sozinho.']), true);
    S.events.push({ k: 'oncaHunt', ids: a ? a.hunt.slice() : [] });
    return went.length;
  };

  // o que aparece quando o jogador toca num bicho
  B.info = function (S, e) {
    const d = C.BICHOS[e.sp || 'capivara'], fem = /^uma /.test(d.art), T = Tech();
    if (e.state === 'morta') return d.name + ' abatid' + (fem ? 'a' : 'o') + '. Quem caçou vai carnear e levar ao estoque.';
    const y = G.Fauna.yieldOf(S, e.sp), rend = y.carne + ' de carne' + (y.couro ? ' e ' + y.couro + ' de couro' : '');
    const lanca = T.known(S, 'lanca'), arco = T.known(S, 'arco');
    let how;
    if (e.sp === 'jacare') how = arco ? 'Com Caça nas Vontades, quem tem arco abate o jacaré quando ele toma sol: ' + rend + '.' : 'Só com arco e flecha dá para caçar um jacaré.';
    else if (!lanca) how = 'Quando o povo descobrir a lança, vira ' + rend + '.';
    else if (G.Fauna.needsBow(e.sp) && !arco) how = 'Arisc' + (fem ? 'a' : 'o') + ' demais para a lança: com o arco e flecha, vira ' + rend + '.';
    else how = 'Com Caça nas Vontades, rende ' + rend + '.';
    return d.name + '. ' + d.desc + ' ' + how;
  };
  B.oncaInfo = 'Onça. De noite ataca quem está sozinho no escuro; fogo aceso e gente junta a mantêm longe. Depois de um ataque, os caçadores vão atrás dela. Um Raio (R) em cima dela abate; perto, espanta.';

  // ---------- saves e metas ----------
  B.init = function (S) {
    const st = S.stats;
    st.huntedBy = st.huntedBy || {};
    // save de antes da 0.9 que já caçou: as capivaras de antes contam como capivara
    if ((st.hunted || 0) > 0 && !Object.keys(st.huntedBy).length) st.huntedBy.capivara = st.hunted;
    st.oncasKilled = st.oncasKilled || 0; st.fightHits = st.fightHits || 0;
    // save de antes da 0.9 já numa fase adiantada: ganha as missões dos bichos das fases que já passou (uma vez)
    if (!st.bichoMissions) {
      st.bichoMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of B.missions(f)) if (!S.goals.some((g) => g.id === m.id)) S.goals.push(m);
    }
  };
  B.kinds = (S) => Object.keys(S.stats.huntedBy || {}).filter((k) => S.stats.huntedBy[k] > 0).length;
  // missões pequenas (não seguram a fase)
  B.missions = function (phase) {
    if (phase === 3) return [{ id: 'b_tres', text: 'Cace 3 tipos de bicho', opt: true, reward: 5, done: false }];
    if (phase === 4) return [
      { id: 'b_seis', text: 'Cace 6 tipos de bicho', opt: true, reward: 8, done: false },
      { id: 'b_luta', text: 'Revide o ataque de um bicho', opt: true, reward: 6, done: false },
      { id: 'b_onca', text: 'Vença uma onça', opt: true, reward: 10, done: false },
    ];
    return [];
  };
  B.goalTest = {
    b_tres: (S) => B.kinds(S) >= 3,
    b_seis: (S) => B.kinds(S) >= 6,
    b_luta: (S) => (S.stats.fightHits || 0) > 0,
    b_onca: (S) => (S.stats.oncasKilled || 0) > 0,
  };
})(globalThis.G = globalThis.G || {});
