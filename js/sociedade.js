/* Gods · Sociedade (Etapa 14): até aqui todo mundo era bom. Agora cada pessoa tem índole (generosa ou egoísta, mansa
   ou violenta, franca ou mentirosa), que a vida empurra: a fome, a humilhação, o exemplo dos pais, a fé, os contos.
   Quem tem a índole ruim, na hora ruim, faz o que não deve: leve (pegar comida a mais, fugir do trabalho, mentir),
   médio (roubar ferramenta ou joia, bater) ou grave (ferir de propósito, pôr fogo, matar). Deus vê tudo; o povo só
   sabe o que alguém viu. À tardinha, ao pé do fogo, o líder chama o julgamento: o veredito depende de quem viu, de
   quem gosta de quem e da convivência entre os povos (baixa, a culpa cai em quem é de fora). As penas: bronca,
   trabalho, devolver, exílio. Deus castiga na medida (aviso em sonho, marca, doença leve, raio por perto, exílio,
   morte): a medida certa ensina; pesada demais vira medo; em inocente, custa a fé de quem sabia. O perdão público
   puxa Deus para o lado bondoso. O líder é o mais respeitado (cada povo respeita uma coisa) e, se o jogador deixar,
   marca as obras que faltam. Gente descontente junta de 4 a 8 e avisa que vai embora: o jogador deixa ir, convence
   com um milagre ou promete algo. Se forem, fundam outra vila, que vive resumida: troca, casa, briga, pode inventar
   outro deus e pode voltar. Com o jogo fechado, nada disto acontece: a vila de fora só anda nos números. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const So = G.Soc = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Wd = () => G.W, Pv = () => G.Povos, Dz = () => G.Deus, Gd = () => G.God, Lf = () => G.Life, Mm = () => G.Memoria, Nr = () => G.Narr;
  const DAY = C.DAY_MIN, YEAR = C.DAY_MIN * C.YEAR_DAYS;
  const age = (S, p) => Fam().age(S, p);
  const person = (S, id) => Fam().person(S, id);
  const rest = (S) => !!(S.safe || S.resumido);
  const ev = (S, o) => { if (!S.safe) S.events.push(Object.assign({ k: 'soc' }, o)); };
  const oa = (p) => (p.sex === 'F' ? 'a' : 'o');
  const ela = (p) => (p.sex === 'F' ? 'ela' : 'ele');
  const pk = (arr, n) => arr[Math.abs(Math.floor(n)) % arr.length];
  const hourOf = (S) => Math.floor(S.ck.hour + 1e-6);
  // sorteio fixo do mundo, que não mexe no sorteio da simulação (para o que é testado toda hora e quase nunca acontece)
  const hsh = (S, a, b) => G.hash2(a | 0, b | 0, S.seed >>> 0);
  const here = (p) => p.alive && !p.carriedBy;
  const has = (p, t) => !!(p.traits && p.traits.indexOf(t) >= 0);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const godChron = (S, text) => { S.chron.push({ t: S.t, text, god: 1 }); S.events.push({ k: 'chron', text }); };
  const D = (S) => (Dz() ? Dz().call(S) : 'Deus');
  const mem = (p, k) => !!(p.mem && p.mem.some((m) => m.k === k));
  const adults = (S, min) => S.people.filter((p) => here(p) && age(S, p) >= (min || 18));

  // ---------- estado ----------
  So.init = function (S) {
    const s = S.soc || (S.soc = {});
    s.nc = s.nc || 1; s.crimes = s.crimes || []; s.lider = s.lider || 0; s.liderT = s.liderT || 0;
    s.modo = s.modo || 'decide'; s.pedidos = s.pedidos || []; s.recusa = s.recusa || {}; s.np = s.np || 1;
    s.fora = s.fora || []; s.pend = s.pend || []; s.cinzas = s.cinzas || [];
    s.julg = null;                      // ao abrir o save, não há julgamento no meio (o crime continua aberto)
    if (s.diss === undefined) s.diss = null;
    if (s.vila === undefined) s.vila = null;
    s.dissCool = s.dissCool || 0; s.rot = s.rot || 0; s.semCama = s.semCama || 0; s.semPedra = s.semPedra || 0;
    for (const p of s.fora) { p.alive = false; p.act = null; p.path = null; if (!p.fail) p.fail = {}; }
    foraIdx = null;
    for (const p of S.people) { if (!p.indole) p.indole = natural(S, p); delete p.plano; }
    for (const p of s.fora) if (!p.indole) p.indole = natural(S, p);
    // quem ia embora quando o jogo fechou: a caminhada recomeça de onde a pessoa está
    const st = S.stats;
    for (const k of ['crimes', 'crimesVistos', 'julgamentos', 'injusticas', 'castigos', 'castigosJustos', 'perdoes', 'exilados', 'dissidentes', 'obrasPovo', 'pedidos', 'trocasVila', 'casamentosVila', 'brigasVila', 'voltas']) st[k] = st[k] || 0;
    st.crimesG = st.crimesG || [0, 0, 0, 0];
    // save de antes da 0.14 numa fase adiantada: ganha as missões da Sociedade (uma vez)
    if (!st.socMissions) {
      st.socMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const g of So.missions(f)) if (!S.goals.some((x) => x.id === g.id)) S.goals.push(g);
    }
  };

  // ---------- quem foi embora ----------
  // Sai de S.people (não conta como vivo nem como morto) e fica em S.soc.fora, com alive = false e fora = quando saiu.
  // Family.person ainda acha pelo id: o parentesco de quem ficou não se perde (nunca um par entre parentes).
  let foraIdx = null;
  So.away = function (S, id) {
    const s = S.soc;
    if (!s || !s.fora.length) return null;
    if (!foraIdx || foraIdx.list !== s.fora || foraIdx.n !== s.fora.length) {
      foraIdx = { list: s.fora, n: s.fora.length, m: new Map() };
      for (const q of s.fora) foraIdx.m.set(q.id, q);
    }
    return foraIdx.m.get(id) || null;
  };
  const vivosFora = (S) => S.soc.fora.filter((q) => !q.morto);
  // tira alguém da aldeia: why = 'dissidente' | 'exilio' | 'casou'
  function sair(S, p, why) {
    const s = S.soc, F = Fam(), Sm = Sim();
    if (S.people.indexOf(p) < 0) return false;
    G.AI.abort(S, p);
    // o bebê no colo vai junto
    for (const b of S.people.slice()) if (b !== p && b.alive && b.carriedBy === p.id) sair(S, b, why);
    for (const b of S.buildings) { if (b.beds) b.beds = b.beds.filter((id) => id !== p.id); if (b.guests) delete b.guests[p.id]; }
    if (p.escolhido) { p.escolhido = null; }
    if (s.lider === p.id) { s.lider = 0; s.liderVago = S.t; }
    p.prayer = null; p.sleeping = false; p.inTent = 0; p.carry = null; p.visiting = null; p.host = 0; p.carriedBy = 0;
    delete p.plano; delete p.pena; delete p.exilio;
    S.people.splice(S.people.indexOf(p), 1);
    p.alive = false; p.fora = S.t; p.away = { why, vila: s.vila && !s.vila.fim ? 1 : 0 };
    s.fora.push(p);
    foraIdx = null;
    if (F.reindex) F.reindex(S);
    if (Pv() && Pv().recount) Pv().recount(S);
    return true;
  }
  // os laços de par entre quem foi e quem ficou se desfazem (quem ficou sente)
  function soltaPares(S, gone, memK) {
    const F = Fam(), Sm = Sim();
    for (const p of gone) {
      if (!p.bonds) continue;
      for (const id of Object.keys(p.bonds)) {
        const q = person(S, +id);
        if (!q || !q.alive) continue;       // quem ficou
        F.unlink(S, p, q);
        Sm.addMem(S, q, memK || 'parenteFoi');
      }
    }
  }
  // quem ficou e é da família de quem foi
  function saudade(S, gone) {
    const F = Fam(), Sm = Sim(), ids = new Set(gone.map((p) => p.id));
    for (const q of S.people) {
      if (!here(q)) continue;
      if (ids.has(q.mother) || ids.has(q.father) || gone.some((p) => p.mother === q.id || p.father === q.id || (p.mother && p.mother === q.mother) || (p.father && p.father === q.father))) Sm.addMem(S, q, 'parenteFoi');
      else if (gone.some((p) => (q.rel[p.id] || 0) >= 6)) Sm.addMem(S, q, 'amigoFoi');
    }
  }
  // volta para a aldeia quem estava fora (o mesmo id, a mesma história)
  function voltar(S, p, x, y) {
    const s = S.soc, i = s.fora.indexOf(p);
    if (i < 0 || p.morto) return false;
    s.fora.splice(i, 1);
    foraIdx = null;
    p.alive = true; delete p.fora; delete p.away;
    p.needs = { fome: 70, sede: 70, energia: 75, calor: 90, social: 65, saude: Math.max(70, Math.min(100, p.needs ? p.needs.saude : 80)) };
    p.mem = []; p.act = null; p.path = null; p.pathI = 0; p.sleeping = false; p.inTent = 0; p.carry = null; p.fail = {}; p.stuck = false;
    p.x = x; p.y = y; p.px = x; p.py = y; p.desc = 5; p.descWhy = {}; p.say = null; p.nextEval = 0; p.carriedBy = 0;
    p.dmg = { fome: 0, sede: 0, frio: 0 }; p.preg = null; p.labor = null; p.warned = {};
    p.lastAge = age(S, p);
    S.people.push(p);
    if (Fam().reindex) Fam().reindex(S);
    return true;
  }
  // depois que todos voltaram: os pares que não vieram ficam para trás
  function podaPares(S, list) {
    for (const p of list) if (p.bonds) for (const id of Object.keys(p.bonds)) { const q = person(S, +id); if (!q || !q.alive) delete p.bonds[id]; }
  }

  // ---------- índole ----------
  So.AX = ['g', 'm', 'f'];
  So.EIXO = {
    g: { nome: 'Mão', bom: ['generosa', 'generoso'], ruim: ['egoísta', 'egoísta'], desc: 'Divide o que tem, ou pega o que é dos outros.' },
    m: { nome: 'Gênio', bom: ['mansa', 'manso'], ruim: ['violenta', 'violento'], desc: 'Resolve na conversa, ou na mão.' },
    f: { nome: 'Palavra', bom: ['franca', 'franco'], ruim: ['mentirosa', 'mentiroso'], desc: 'Diz o que viu, ou o que convém.' },
  };
  // a índole de nascença: um sorteio fixo do mundo (não gasta o sorteio da simulação), puxado para o lado bom;
  // o filho puxa um pouco aos pais (INDOLE_HERDA da distância deles ao comum). A natureza pesa mais que a criação:
  // em toda geração nasce gente com defeito, e o que mais muda alguém depois é a pena, o castigo na medida e o perdão
  function natural(S, p) {
    const seed = S.seed >>> 0, out = {};
    const ps = [person(S, p.mother), person(S, p.father)].filter((q) => q && q.indole);
    So.AX.forEach((k, i) => {
      const u = (G.hash2(p.id * 7 + i, 311 + i * 13, seed) + G.hash2(p.id * 13 + i, 733, seed)) / 2;
      let v = (u - 0.5) * C.INDOLE_SPREAD + C.INDOLE_MEAN;
      if (ps.length) v += (ps.reduce((a, q) => a + q.indole[k], 0) / ps.length - C.INDOLE_MEAN) * C.INDOLE_HERDA;
      out[k] = v;
    });
    if (has(p, 'Trabalhador')) out.g += 8;
    if (has(p, 'Preguiçoso')) out.g -= 8;
    if (has(p, 'Comilão')) out.g -= 6;
    if (has(p, 'Otimista')) out.m += 8;
    if (has(p, 'Pessimista')) out.m -= 8;
    if (has(p, 'Devoto')) out.f += 6;
    for (const k of So.AX) out[k] = Math.round(U.clamp(out[k], -100, 100));
    return out;
  }
  const ind = (S, p) => p.indole || (p.indole = natural(S, p));
  So.indole = ind;
  // o quanto a índole é ruim num eixo, de 0 a 1
  const ruim = (S, p, k) => Math.max(0, -ind(S, p)[k]) / 100;
  // empurra um eixo e guarda a conta por motivo (para a tela dizer por que a pessoa mudou)
  function puxa(S, p, k, d, why) {
    if (!d) return;
    const I = ind(S, p), old = I[k];
    I[k] = U.clamp(old + d, -100, 100);
    if (why) {
      const ac = p.indAc || (p.indAc = {}), row = ac[k] || (ac[k] = {});
      row[why] = +((row[why] || 0) + (I[k] - old)).toFixed(2);
    }
  }
  So.puxa = puxa;
  So.MOTIVO = { fome: 'a fome', humilhacao: 'a humilhação', pais: 'o exemplo dos pais', fe: 'a fé', medo: 'o medo de Deus', conto: 'os contos de cuidado', contoMedo: 'os contos de medo',
    pena: 'a pena cumprida', castigo: 'o castigo na medida', pesado: 'o castigo pesado demais', perdao: 'o perdão', impune: 'ter ficado sem resposta', apanhou: 'ter apanhado', injustica: 'a injustiça', lider: 'o exemplo do líder' };
  // os rótulos de alguém: só os eixos que passam de INDOLE_ROTULO, para um lado ou para o outro
  So.rotulos = function (S, p) {
    const I = ind(S, p), out = [], f = p.sex === 'F' ? 0 : 1;
    for (const k of So.AX) {
      const v = I[k];
      if (Math.abs(v) < C.INDOLE_ROTULO) continue;
      out.push({ k, v: Math.round(v), bom: v > 0, txt: (v > 0 ? So.EIXO[k].bom : So.EIXO[k].ruim)[f], forte: Math.abs(v) >= 65 });
    }
    return out;
  };
  // o motivo que mais pesou em cada eixo (para a tela)
  So.porque = function (p, k) {
    const row = p.indAc && p.indAc[k];
    if (!row) return null;
    let best = null, bv = 0;
    for (const w in row) if (Math.abs(row[w]) > Math.abs(bv)) { bv = row[w]; best = w; }
    return best && Math.abs(bv) >= 3 ? { why: best, d: bv, txt: So.MOTIVO[best] || best } : null;
  };
  // o que a vida faz com a índole, dia a dia
  function driftDia(S) {
    const al = S.god ? S.god.align : 0, L = person(S, S.soc.lider);
    for (const p of S.people) {
      if (!here(p)) continue;
      const I = ind(S, p), a = age(S, p);
      if (a < 5) continue;
      if (mem(p, 'passouFome') && I.g > -C.IND_CHAO) puxa(S, p, 'g', -C.IND_FOME, 'fome');
      if (mem(p, 'humilhado') && I.m > -C.IND_CHAO) puxa(S, p, 'm', -C.IND_HUMILHA, 'humilhacao');
      if (a < C.IND_PAIS_AGE) {
        const ps = [person(S, p.mother), person(S, p.father)].filter((q) => q && q.alive && q.indole);
        if (ps.length) for (const k of So.AX) puxa(S, p, k, (ps.reduce((s, q) => s + q.indole[k], 0) / ps.length - I[k]) * C.IND_PAIS, 'pais');
      }
      // a fé conserta devagar o que está torto (não faz santo de ninguém); com um Deus temido, ensina a esconder
      if ((p.fe || 0) >= 60 && a >= 7) {
        if (al >= -15) { for (const k of So.AX) if (I[k] < 0) puxa(S, p, k, C.IND_FE, 'fe'); }
        else if (I.f > -C.IND_CHAO) puxa(S, p, 'f', -C.IND_MEDO, 'medo');
      }
      // o líder é exemplo para os jovens (até IND_TETO para o bem, até o chão para o mal)
      if (L && L !== p && a >= 12 && a < 22) for (const k of So.AX) {
        const d = ind(S, L)[k];
        if (d >= C.INDOLE_ROTULO && I[k] < C.IND_TETO) puxa(S, p, k, C.IND_LIDER, 'lider');
        else if (d <= -C.INDOLE_ROTULO && I[k] > -C.IND_CHAO) puxa(S, p, k, -C.IND_LIDER, 'lider');
      }
    }
  }
  // um conto ouvido ao pé do fogo: o de cuidado amansa e abre a mão; o de medo ensina a esconder
  So.onConto = function (S, p, tone) {
    if (!S.soc || !tone || !here(p)) return;
    const I = ind(S, p);
    if (tone > 0) { if (I.g < C.IND_TETO) puxa(S, p, 'g', C.IND_CONTO, 'conto'); if (I.m < C.IND_TETO) puxa(S, p, 'm', C.IND_CONTO, 'conto'); }
    else { if (I.f > -C.IND_CHAO) puxa(S, p, 'f', -C.IND_CONTO, 'contoMedo'); if (I.m > -C.IND_CHAO) puxa(S, p, 'm', -C.IND_CONTO / 2, 'contoMedo'); }
  };

  // ---------- crimes ----------
  // g: a gravidade (1 leve · 2 médio · 3 grave) · ax: o eixo da índole de onde vem
  const CRIME = So.CRIME = {
    comida: { g: 1, ax: 'g', nome: 'Comida a mais' },
    folga: { g: 1, ax: 'g', nome: 'Fuga do trabalho' },
    mentira: { g: 1, ax: 'f', nome: 'Mentira' },
    furto: { g: 2, ax: 'g', nome: 'Roubo' },
    surra: { g: 2, ax: 'm', nome: 'Surra' },
    ferir: { g: 3, ax: 'm', nome: 'Ferimento de propósito' },
    fogo: { g: 3, ax: 'm', nome: 'Incêndio' },
    matar: { g: 3, ax: 'm', nome: 'Morte' },
  };
  So.GRAV = ['', 'leve', 'médio', 'grave'];
  function crimeTxt(c) {
    switch (c.k) {
      case 'comida': return 'pegou comida a mais do estoque';
      case 'folga': return 'fugiu do trabalho';
      case 'mentira': return c.vicN ? (c.culpa ? 'jogou em ' + c.vicN + ' a culpa do que fez' : 'inventou coisas sobre ' + c.vicN) : 'mentiu';
      case 'furto': return 'roubou ' + (c.o || 'do estoque');
      case 'surra': return 'bateu em ' + c.vicN;
      case 'ferir': return 'feriu ' + c.vicN + ' de propósito';
      case 'fogo': return 'pôs fogo ' + (c.o || 'numa obra');
      case 'matar': return 'matou ' + c.vicN;
    }
    return 'fez o que não devia';
  }
  So.crimeTxt = crimeTxt;
  const aberto = (c) => c.st === 'aberto';

  function podeCrime(S) {
    if (rest(S) || !S.arrived || S.t < C.SOC_GRACA_D * DAY) return false;
    let n = 0;
    for (const p of S.people) if (here(p) && age(S, p) >= 12) n++;
    return n >= C.SOC_MIN_GENTE;
  }
  // de quem p anda com raiva: brigado com ele, de 14 anos para cima (quem já apanhou ou bateu vem primeiro)
  function desafeto(S, p) {
    let best = null, bv = -1;
    if (p.feud) for (const id in p.feud) {
      if (!(p.feud[id] > S.t)) continue;
      const q = person(S, +id);
      if (!q || !here(q) || age(S, q) < 14) continue;
      const v = ((p.rixa && p.rixa[id]) || 0) * 10 + (p.feud[id] - S.t) / DAY;
      if (v > bv) { bv = v; best = q; }
    }
    return best;
  }
  // depois de uma briga (life.js chama): quem tem o gênio violento guarda a raiva RANCOR vezes mais tempo.
  // É nesses dias que ele pode ir tirar satisfação
  So.onBriga = function (S, a, b) {
    if (!S.soc) return;
    for (const [x, y] of [[a, b], [b, a]]) {
      if (!x.feud || !(x.feud[y.id] > S.t) || ind(S, x).m >= -15) continue;
      x.feud[y.id] = Math.round(S.t + (x.feud[y.id] - S.t) * C.RANCOR);
    }
  };
  // o que pega fogo: obra de madeira e palha, de pé e sem mudança no meio
  const BURN = { barraca: 1, armazem: 1, jirau: 1, moquem: 1, marcenaria: 1, tecelagem: 1, curral: 1 };
  function alvoFogo(S, p) {
    const Sm = Sim(), foe = desafeto(S, p);
    const list = S.buildings.filter((b) => BURN[b.type] && Sm.canDemolish(S, b) && !b.fogo && !(b.beds && b.beds.indexOf(p.id) >= 0));
    if (!list.length) return null;
    if (foe) { const h = list.find((b) => b.beds && b.beds.indexOf(foe.id) >= 0); if (h) return h; }
    // quem guarda mágoa do julgamento mira a casa de quem o julgou
    if (mem(p, 'ressentido') || mem(p, 'humilhado') || mem(p, 'injusticado')) {
      const cs = S.soc.crimes;
      for (let i = cs.length - 1; i >= 0; i--) {
        if (cs[i].cond !== p.id || !cs[i].juiz) continue;
        const h = list.find((b) => b.beds && b.beds.indexOf(cs[i].juiz) >= 0);
        if (h) return h;
        break;
      }
    }
    return list.find((b) => b.type === 'armazem') || list.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y) || a.id - b.id)[0];
  }
  // de hora em hora: quem tem a índole ruim, na hora ruim, resolve fazer o que não deve. O sorteio é fixo do mundo
  // (não gasta o da simulação): numa aldeia de gente boa, nada muda
  function tentar(S) {
    if (!podeCrime(S)) return;
    const s = S.soc, h = hourOf(S), hi = Math.floor(S.t / 60);
    if (h < 6) return;
    const work = h >= 8 && h < 17, st = S.stock;
    for (const p of S.people) {
      if (!here(p) || p.plano || p.pena || p.exilio || p.labor || p.sleeping) continue;
      const I = ind(S, p);
      if (I.g > 24 && I.m > -15 && I.f > -15) continue;       // gente boa não tem o que tentar
      const a = age(S, p);
      if (a < 12) continue;
      if (s.diss && s.diss.ids.indexOf(p.id) >= 0) continue;
      const bg = ruim(S, p, 'g'), bm = ruim(S, p, 'm'), bf = ruim(S, p, 'f');
      const fome = p.needs.fome < 35, pouco = S.ctx.foodDays < 2, opts = [];
      if (S.ctx.food >= 4 && (bg > 0.15 || (fome && I.g < 25))) opts.push(['comida', (C.CR_COMIDA * bg + (fome ? 0.03 : 0)) * (pouco ? 2 : 1)]);
      if (work && (bg > 0.15 || (has(p, 'Preguiçoso') && I.g < 10))) opts.push(['folga', C.CR_FOLGA * bg + (has(p, 'Preguiçoso') ? 0.01 : 0)]);
      if (bf > 0.15) opts.push(['mentira', C.CR_MENTIRA * bf]);
      if (a >= 14 && bg > 0.25 && ((st.joias || 0) > 0 || st.ferramentas > 0 || (st.ferro || 0) > 0)) opts.push(['furto', C.CR_FURTO * bg]);
      if (a >= 14 && bm > 0.15) {
        // quem acabou de bater esfria uns dias antes de levantar a mão de novo
        const foe = p.semViol > S.t ? null : desafeto(S, p);
        if (foe) {
          const rx = (p.rixa && p.rixa[foe.id]) || 0;
          opts.push(['surra', C.CR_SURRA * bm * (p.mood < 30 ? 1.5 : 1), foe.id]);
          if (a >= 16 && I.m <= C.CR_M_FERIR && rx >= 1) opts.push(['ferir', C.CR_FERIR * bm, foe.id]);
          if (a >= 16 && I.m <= C.CR_M_MATAR && rx >= 2) opts.push(['matar', C.CR_MATAR * bm, foe.id]);
        }
        // o fogo é vingança: de quem foi humilhado, de quem guarda mágoa do julgamento (a pena acabou, a mágoa não),
        // de quem foi condenado sem culpa, de quem já não aguenta a aldeia, ou de quem tem rixa de sangue com alguém
        // (já houve golpe entre os dois): o alvo é a casa do desafeto, ou a de quem o julgou
        const rixaFoe = !!foe && ((p.rixa && p.rixa[foe.id]) || 0) >= 1;
        if (a >= 16 && I.m <= C.CR_M_FOGO && (rixaFoe || mem(p, 'humilhado') || mem(p, 'ressentido') || mem(p, 'injusticado') || (p.desc || 0) >= 60)) opts.push(['fogo', C.CR_FOGO * bm]);
      }
      for (let i = 0; i < opts.length; i++) {
        const o = opts[i];
        if (hsh(S, p.id * 31 + i * 7 + 5, hi) >= o[1] / 16) continue;
        planejar(S, p, o[0], o[2]);
        break;
      }
    }
  }
  // decidiu: a mentira é dita na hora; o resto pede ir até lá (o roubo e o fogo esperam a noite)
  function planejar(S, p, k, vicId) {
    if (k === 'mentira') { mentir(S, p); return null; }
    const pl = { k, t: S.t, ate: S.t + 30 * 60 };
    if (k === 'surra' || k === 'ferir' || k === 'matar') pl.vic = vicId;
    if (k === 'furto' || k === 'fogo') pl.noite = 1;
    if (k === 'fogo') { const b = alvoFogo(S, p); if (!b) return null; pl.bid = b.id; }
    if (k === 'folga') pl.ate = S.t + 3 * 60;
    if (k === 'comida') pl.ate = S.t + 6 * 60;
    p.plano = pl;
    p.nextEval = Math.min(p.nextEval || 0, S.t);
    return pl;
  }
  So.planejar = planejar;   // para os testes
  // quem estava acordado e perto viu (de noite, só quem está quase em cima); a vítima acordada sabe quem foi
  function testemunhas(S, p, x, y, vic) {
    const R = S.ctx.night ? C.SOC_VER_NOITE : C.SOC_VER, out = [];
    for (const q of S.people) {
      if (q === p || !here(q) || q.sleeping || q.inTent || age(S, q) < 6) continue;
      if (Math.hypot(q.x - x, q.y - y) <= R) out.push(q.id);
    }
    if (vic && vic.alive && !vic.sleeping && out.indexOf(vic.id) < 0) out.push(vic.id);
    return out;
  }
  // a testemunha conta o que viu? Par e parente próximo de quem fez calam (a não ser que a vítima também seja deles);
  // o mentiroso amigo de quem fez, também. Criança conta tudo.
  function conta(S, q, autor, vic) {
    if (vic && q.id === vic.id) return true;
    if (age(S, q) < 10) return true;
    const F = Fam();
    const meu = (x) => !!x && (F.isPartner(q, x) || q.mother === x.id || q.father === x.id || x.mother === q.id || x.father === q.id || (!!q.mother && q.mother === x.mother));
    if (meu(autor) && !meu(vic)) return false;
    if (ind(S, q).f < -30 && (q.rel[autor.id] || 0) >= 6) return false;
    return true;
  }
  function vistoPor(S, c) {
    const ws = c.wit.map((id) => person(S, id)).filter((q) => q && q.id !== c.vic);
    if (!ws.length) return c.vicN ? c.vicN + ' sabe quem foi.' : 'O povo ficou sabendo.';
    return ws.length === 1 ? ws[0].name + ' viu.' : ws.length === 2 ? ws[0].name + ' e ' + ws[1].name + ' viram.' : ws[0].name + ' e mais ' + (ws.length - 1) + ' viram.';
  }
  function avisar(S, c, p) {
    const s = S.soc, Sm = Sim(), st = S.stats, txt = p.name + ' ' + crimeTxt(c);
    const quem = c.known ? vistoPor(S, c) : '';
    const key = c.k + (c.known ? 1 : 0);
    if (!st.primeiroCrime) {
      st.primeiroCrime = true;
      godChron(S, 'Pela primeira vez, alguém do povo fez o que não devia: ' + txt + '. ' + (c.known ? quem : 'Ninguém viu. Só você.') + ' Você vê tudo; o povo só sabe o que alguém viu.');
    } else if (c.g >= 3) {
      if (c.known) Sm.chron(S, cap(txt) + '. ' + quem);
      else godChron(S, 'Ninguém viu, mas ' + txt + '.');
    } else if (c.g === 2 || !(s.avisado && s.avisado[key])) {
      Sm.toast(S, c.known ? txt + '. ' + quem : 'Só você viu: ' + txt + '.', c.g >= 2 ? 'bad' : 'warn');
    }
    (s.avisado || (s.avisado = {}))[key] = 1;
    ev(S, { ev: 'crime', id: c.id, g: c.g, kind: c.k, known: c.known, x: c.x, y: c.y });
  }
  // anota o crime: quem viu, se o povo sabe quem foi (known), se deixou marca que o povo nota (dano)
  function registrar(S, p, k, o) {
    const s = S.soc, def = CRIME[k], vic = o.vic || null;
    const x = o.x !== undefined ? o.x : p.x, y = o.y !== undefined ? o.y : p.y;
    const wit = o.wit || testemunhas(S, p, x, y, vic);
    const c = { id: s.nc++, k, g: def.g, by: p.id, byN: p.name, bySx: p.sex, t: S.t, x: Math.floor(x), y: Math.floor(y), wit, st: 'aberto' };
    if (vic) { c.vic = vic.id; c.vicN = vic.name; }
    if (o.o) c.o = o.o;
    if (o.culpa) c.culpa = 1;
    if (o.furto) c.furto = o.furto;
    if (o.bid) c.bid = o.bid;
    c.known = wit.some((id) => { const q = person(S, id); return !!q && conta(S, q, p, vic); }) ? 1 : 0;
    c.dano = o.dano ? 1 : 0;
    s.crimes.push(c);
    S.stats.crimes++; S.stats.crimesG[def.g]++;
    const ck = S.stats.crimesK || (S.stats.crimesK = {});
    ck[k] = (ck[k] || 0) + 1;
    if (c.known) S.stats.crimesVistos++;
    if (def.g >= 2) for (const id of wit) { const q = person(S, id); if (q && q !== vic) Sim().addMem(S, q, k === 'matar' ? 'viuMorte' : 'viuCrime'); }
    avisar(S, c, p);
    while (s.crimes.length > C.CRIME_MAX) { const i = s.crimes.findIndex((x) => !aberto(x)); s.crimes.splice(i >= 0 ? i : 0, 1); }
    return c;
  }
  // em quem a culpa cai: o desafeto de quem mente, ou quem é de fora (o povo com quem o dele menos se dá, o recém-chegado)
  function bode(S, p, c) {
    const foe = desafeto(S, p);
    if (foe && (!c || foe.id !== c.vic)) return foe;
    const mixed = !!(S.povos && S.povos.mixed && Pv());
    let best = null, bv = 0;
    for (const q of S.people) {
      if (!here(q) || q === p || age(S, q) < 14 || (c && q.id === c.vic) || Fam().isPartner(p, q) || Fam().closeKin(S, p, q)) continue;
      const v = (mixed ? (100 - Pv().pair(S, p, q)) / 20 : 0) + (q.joined && S.t - q.joined < 1.5 * YEAR ? 2 : 0) + (q.ficha || 0) - (p.rel[q.id] || 0) * 0.3 + hsh(S, p.id * 5 + q.id, S.ck.day);
      if (v > bv) { bv = v; best = q; }
    }
    return bv >= 1.2 ? best : null;
  }
  // a mentira: joga em outro a culpa do que fez (se o povo notou e não sabe de quem), ou inventa coisas de um desafeto.
  // Ninguém vê uma mentira: só Deus sabe.
  function mentir(S, p) {
    const s = S.soc, Sm = Sim();
    const meu = s.crimes.find((c) => aberto(c) && c.by === p.id && c.dano && !c.known && !c.sus);
    const alvo = bode(S, p, meu);
    if (!alvo) return null;
    if (meu) {
      meu.sus = alvo.id; meu.acus = p.id;
      return registrar(S, p, 'mentira', { vic: alvo, culpa: 1, wit: [] });
    }
    Sm.addMem(S, alvo, 'difamado');
    for (const q of S.people) if (here(q) && q !== alvo && q !== p && (q.rel[alvo.id] || 0) > 0 && hsh(S, q.id * 3 + alvo.id, S.ck.day) < 0.3) q.rel[alvo.id]--;
    alvo.ficha = (alvo.ficha || 0) + 0.5;     // a fama fica
    return registrar(S, p, 'mentira', { vic: alvo, wit: [] });
  }
  So.mentir = mentir;
  // chegou a hora: faz
  function cometer(S, p) {
    const pl = p.plano, Sm = Sim(), st = S.stock;
    if (!pl) return null;
    delete p.plano;
    const k = pl.k, cx = S.camp.x + 1, cy = S.camp.y + 1;
    if (k === 'comida') {
      let n = 2 + Math.floor(S.rng.next() * 3), got = 0;
      for (const f of ['frutas', 'peixe', 'carne', 'seca', 'defumado', 'milho', 'abobora']) while (n > 0 && st[f] > 0) { st[f]--; n--; got++; }
      if (!got) return null;
      p.needs.fome = Math.min(100, p.needs.fome + got * 18);
      return registrar(S, p, 'comida', { dano: S.ctx.foodDays < 2, x: cx, y: cy });
    }
    if (k === 'furto') {
      let what = null, n = 1;
      if ((st.joias || 0) > 0) { st.joias--; what = 'joias'; }
      else if ((st.ferro || 0) > 0) { st.ferro--; what = 'ferro'; }
      else if (st.ferramentas > 0) { n = Math.min(2, st.ferramentas); st.ferramentas -= n; what = 'ferramentas'; }
      if (!what) return null;
      p.furto = { k: what, n };
      const o = what === 'joias' ? 'uma joia do estoque' : what === 'ferro' ? 'uma ferramenta de ferro do estoque' : (n > 1 ? n + ' ferramentas' : 'uma ferramenta') + ' do estoque';
      return registrar(S, p, 'furto', { dano: 1, o, furto: { k: what, n }, x: cx, y: cy });
    }
    if (k === 'folga') {
      p.needs.energia = Math.min(100, p.needs.energia + 15);
      return registrar(S, p, 'folga', {});
    }
    if (k === 'fogo') {
      const b = Sm.building(S, pl.bid);
      if (!b || !Sm.canDemolish(S, b) || b.fogo) return null;
      b.fogo = S.t; S.soc.arde = 1;
      // quem dorme ali dentro acorda com o fogo, sai, e só volta a deitar quando ele acabar
      for (const q of S.people) if (here(q) && q !== p && q.inTent === b.id && !q.labor) {
        G.AI.abort(S, q);
        q.fail.dormir = S.t + C.FOGO_MIN + 15; q.nextEval = S.t;
      }
      const d = Sm.def(b), onde = (d.a === 'o' ? 'no ' : 'na ') + d.name.toLowerCase();
      const c = registrar(S, p, 'fogo', { dano: 1, o: onde, bid: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 });
      Sm.toast(S, 'Fogo ' + onde + '! Com água no estoque e gente acordada por perto, o povo apaga. A Chuva apaga na hora.', 'bad');
      ev(S, { ev: 'fogo', on: true, bid: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 });
      for (const q of S.people) if (here(q) && !q.sleeping) q.nextEval = Math.min(q.nextEval || 0, S.t);
      return c;
    }
    const v = person(S, pl.vic);
    if (!v || !here(v) || Math.hypot(v.x - p.x, v.y - p.y) > 3.2) return null;
    const wit = testemunhas(S, p, v.x, v.y, k === 'matar' ? null : v).filter((id) => k !== 'matar' || id !== v.id);   // o morto não conta o que viu
    (p.rixa || (p.rixa = {}))[v.id] = (p.rixa[v.id] || 0) + 1;
    (v.rixa || (v.rixa = {}))[p.id] = (v.rixa[p.id] || 0) + 1;
    const until = S.t + 10 * DAY;
    (p.feud || (p.feud = {}))[v.id] = until; (v.feud || (v.feud = {}))[p.id] = until;
    if (Fam().isPartner(p, v)) Fam().addAfeto(S, p, v, -30);
    p.semViol = S.t + C.VIOL_PAUSA_D * DAY;
    if (S.povos && S.povos.mixed && Pv()) Pv().onChat(S, p, v, 'briga');
    v.desc = Math.min(100, (v.desc || 0) + 8);
    ev(S, { ev: 'golpe', x: v.x, y: v.y, kind: k });
    if (k === 'surra') {
      const d = C.SURRA_DANO[0] + S.rng.next() * (C.SURRA_DANO[1] - C.SURRA_DANO[0]);
      v.needs.saude = Math.max(Math.min(v.needs.saude, C.SURRA_MIN), v.needs.saude - d);
      Sm.addMem(S, v, 'apanhou'); puxa(S, v, 'm', -1.5, 'apanhou');
      Sm.say(S, p, pk(['Isso é pra você aprender!', 'Falei que ia ter troco.', 'Agora cala a boca.'], p.id + S.ck.day), true, 'briga');
      return registrar(S, p, 'surra', { vic: v, dano: 1, wit, x: v.x, y: v.y });
    }
    if (k === 'ferir') {
      const d = C.FERIR_DANO[0] + S.rng.next() * (C.FERIR_DANO[1] - C.FERIR_DANO[0]);
      v.needs.saude = Math.max(Math.min(v.needs.saude, C.FERIR_MIN), v.needs.saude - d);
      Sm.addMem(S, v, 'feridoProp'); puxa(S, v, 'm', -2, 'apanhou');
      return registrar(S, p, 'ferir', { vic: v, dano: 1, wit, x: v.x, y: v.y });
    }
    const c = registrar(S, p, 'matar', { vic: v, dano: 1, wit, x: v.x, y: v.y });
    v.dmg.crime = 999; v.needs.saude = -999; v.mortoPor = p.id;
    return c;
  }
  So.cometer = cometer;

  // ---------- o fogo posto ----------
  function apagou(S, b, txt) {
    delete b.fogo;
    Sim().toast(S, txt + '.', 'good');
    ev(S, { ev: 'fogo', on: false, bid: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 });
  }
  function queimou(S, b) {
    const Sm = Sim(), s = S.soc, d = Sm.def(b), st = S.stock;
    const moradores = (b.beds || []).map((id) => person(S, id)).filter((q) => q && q.alive);
    let perdeu = 0;
    if (b.type === 'armazem') for (const f of ['frutas', 'peixe', 'carne', 'seca', 'defumado', 'feijao', 'milho', 'abobora', 'mandioca', 'ovos', 'leite']) { const n = Math.floor((st[f] || 0) * C.FOGO_COMIDA); if (n > 0) { st[f] -= n; perdeu += n; } }
    b.batch = null; b.up = null;
    s.cinzas.push({ x: b.x, y: b.y, w: b.w, h: b.h, t: S.t });
    if (s.cinzas.length > 8) s.cinzas.shift();
    for (const q of S.people) if (here(q) && (moradores.indexOf(q) >= 0 || Math.hypot(q.x - b.x, q.y - b.y) <= 10)) Sm.addMem(S, q, 'incendio');
    for (const q of moradores) q.desc = Math.min(100, (q.desc || 0) + 10);
    delete b.fogo;
    const txt = 'O fogo levou ' + (d.a === 'o' ? 'o ' : 'a ') + d.name.toLowerCase() + '.' + (moradores.length ? ' ' + Sm.listNames(moradores) + (moradores.length > 1 ? ' ficaram' : ' ficou') + ' sem teto.' : '') + (perdeu ? ' Foram-se ' + perdeu + ' porções de comida.' : '');
    ev(S, { ev: 'fogo', on: false, burned: 1, x: b.x + b.w / 2, y: b.y + b.h / 2 });
    Sm.removeBuilding(S, b);
    Sm.chron(S, txt);
    S.stats.incendios = (S.stats.incendios || 0) + 1;
  }
  // enquanto arde: a chuva apaga na hora; passado FOGO_MIN, ou o povo apagou (gente acordada por perto e água no estoque) ou a obra se foi
  function fogos(S) {
    for (const b of S.buildings.slice()) {
      if (!b.fogo) continue;
      if (S.precip === 'chuva' || (S.god && S.god.rainUntil > S.t)) { apagou(S, b, 'A chuva apagou o fogo'); continue; }
      if (S.t - b.fogo < C.FOGO_MIN) continue;
      let n = 0;
      for (const q of S.people) if (here(q) && !q.sleeping && age(S, q) >= 12 && Math.hypot(q.x - b.x, q.y - b.y) <= 14) n++;
      const ch = Math.min(0.9, 0.15 + 0.15 * n) * (S.stock.agua >= C.FOGO_AGUA ? 1 : 0.35);
      if (S.rng.next() < ch) { S.stock.agua = Math.max(0, S.stock.agua - C.FOGO_AGUA); apagou(S, b, 'O povo apagou o fogo a tempo'); }
      else queimou(S, b);
    }
    S.soc.arde = S.buildings.some((b) => b.fogo) ? 1 : 0;
  }

  // ---------- o julgamento ao pé do fogo ----------
  // o quanto alguém é "de fora" para a maioria (0 a 1): a pior convivência do povo dele com o povo maior
  function estranho(S, q) {
    const P = Pv();
    if (!P || !S.povos || !S.povos.mixed) return 0;
    let maior = 'humano', mn = -1;
    for (const k of P.ORDER) { const n = P.count(S, k); if (n > mn) { mn = n; maior = k; } }
    let v = 100;
    for (const k of P.sides(q)) v = Math.min(v, P.conv(S, k, maior));
    return Math.max(0, (60 - v) / 60);
  }
  So.estranho = estranho;
  // ninguém viu: em quem o povo desconfia? A ficha, quem chegou há pouco, quem é de fora, quem brigou com a vítima.
  // Quem fez deixa alguma pista. Sem um nome que se destaque, não há a quem julgar
  function suspeito(S, c) {
    if (c.sus) { const q = person(S, c.sus); if (q && here(q)) return q; c.sus = 0; }
    if (c.semSus) return null;
    const vic = person(S, c.vic);
    let best = null, bv = 0;
    for (const q of S.people) {
      if (!here(q) || age(S, q) < 14 || q.id === c.vic) continue;
      let v = (q.ficha || 0) * 1.5 + (q.joined && S.t - q.joined < 1.5 * YEAR ? 1.5 : 0) + (q.id === c.by ? C.SUSP_PISTA : 0) + hsh(S, c.id * 11 + q.id, 77) * 1.5 + estranho(S, q) * 2;
      if (vic && vic.alive && Fam().feuding(S, q, vic)) v += 2.5;
      if (q.id === S.soc.lider) v -= 2;
      if (v > bv) { bv = v; best = q; }
    }
    if (!best || bv < C.SUSP_MIN) { c.semSus = 1; return null; }
    c.sus = best.id;
    return best;
  }
  // o caso de hoje: o mais grave que o povo sabe (viu quem foi, ou notou o estrago e desconfia de alguém)
  function pauta(S) {
    let best = null;
    for (const c of S.soc.crimes) {
      if (!aberto(c) || c.adiado > S.t) continue;
      let acc = null;
      if (c.known) acc = person(S, c.by);
      else if (c.dano && c.g >= 2) acc = suspeito(S, c);
      if (!acc || !here(acc) || acc.exilio) continue;
      if (!best || c.g > best.c.g || (c.g === best.c.g && c.t < best.c.t)) best = { c, acc };
    }
    return best;
  }
  function juizDe(S, acc) {
    const L = person(S, S.soc.lider);
    if (L && here(L) && L !== acc) return L;
    return adults(S, 18).filter((q) => q !== acc).sort((a, b) => a.born - b.born || a.id - b.id)[0] || null;
  }
  function podeReunir(S) {
    const Li = Lf();
    if (rest(S) || !Li) return null;
    if (S.life && S.life.party && S.life.party.on) return null;
    if (Mm() && S.memoria && Mm().blockStory(S)) return null;
    if (Nr() && (Nr().is(S, 'nevasca') || Nr().is(S, 'tempestade') || Nr().beastsOut(S))) return null;
    return Li.campFire(S, true);
  }
  const BRONCA = { comida: 'Aqui cada um come a sua parte, %n.', folga: 'O trabalho é de todos, %n.', mentira: 'Palavra torta não se diz aqui, %n.' };
  // o que é leve se resolve com uma bronca na frente de todos, sem reunir o povo
  function bronca(S, c, acc, juiz) {
    const Sm = Sim();
    c.st = 'julgado'; c.pena = 'bronca'; c.julgT = S.t; c.cond = acc.id; c.juiz = juiz.id;
    S.stats.julgamentos++;
    Sm.addMem(S, acc, 'humilhado');
    acc.ficha = (acc.ficha || 0) + 1;
    if (acc.id === c.by) puxa(S, acc, CRIME[c.k].ax, 2, 'pena');
    Sm.say(S, juiz, (BRONCA[c.k] || 'Que não se repita, %n.').replace('%n', acc.name), true);
    Sm.toast(S, acc.name + ' levou uma bronca de ' + juiz.name + ' na frente de todos: ' + crimeTxt(c) + '.', '');
    ev(S, { ev: 'bronca', x: acc.x, y: acc.y });
  }
  // à tardinha, o líder (ou o mais velho) chama
  function chamar(S) {
    const s = S.soc;
    if (s.julg || rest(S)) return;
    const pt = pauta(S);
    if (!pt) return;
    const c = pt.c, acc = pt.acc, juiz = juizDe(S, acc);
    if (!juiz) return;
    if (c.g === 1) { bronca(S, c, acc, juiz); return; }
    const f = podeReunir(S);
    if (!f || adults(S, 16).length < C.JULG_QUORUM + 1) { c.adiado = S.t + 20 * 60; return; }
    const part = S.people.filter((q) => here(q) && age(S, q) >= 12 && !q.labor && !q.exilio).map((q) => q.id);
    s.julg = { cid: c.id, acc: acc.id, juiz: juiz.id, fire: f.id, day: S.ck.day, t0: S.t, st: 'chama', part, foi: {}, fala: 0 };
    Sim().toast(S, juiz.name + ' chamou o povo para o pé do fogo. Vão julgar ' + acc.name + ': ' + (c.known ? '' : 'dizem que ') + crimeTxt(c) + '.', 'warn');
    ev(S, { ev: 'julg', on: true, x: f.x, y: f.y });
    for (const q of S.people) if (here(q)) q.nextEval = Math.min(q.nextEval || 0, S.t);
  }
  So.chamar = chamar;
  const presentes = (S, J) => J.part.map((id) => person(S, id)).filter((q) => q && here(q) && q.act && q.act.type === 'soc' && q.act.m && q.act.m.k === 'julgar' && q.act.stage === 'stay');
  function fimJulg(S, res) {
    const s = S.soc, J = s.julg;
    if (!J) return;
    s.julg = null;
    const f = Sim().building(S, J.fire);
    ev(S, { ev: 'julg', on: false, x: f ? f.x : S.camp.x, y: f ? f.y : S.camp.y, cond: res ? (res.cond ? 1 : 0) : -1 });
    for (const q of S.people) if (here(q)) q.nextEval = Math.min(q.nextEval || 0, S.t);
  }
  function falas(S, J, c, acc, pres, dt) {
    const Sm = Sim(), step = Math.floor(dt / 7);
    if (step === J.fala) return;
    J.fala = step;
    const juiz = person(S, J.juiz), n = c.id * 3 + step, culp = acc.id === c.by;
    const wit = pres.filter((q) => c.wit.indexOf(q.id) >= 0 && q !== acc), povo = pres.filter((x) => x !== acc && x !== juiz);
    if (step === 1 && juiz) Sm.say(S, juiz, c.known ? 'Estamos aqui porque ' + acc.name + ' ' + crimeTxt(c) + '.' : 'Dizem que ' + acc.name + ' ' + crimeTxt(c) + '. Quem viu?', true);
    else if (step === 2 && wit[0]) Sm.say(S, wit[0], pk(['Eu vi. Foi ' + ela(acc) + '.', 'Vi com estes olhos.', 'Eu estava lá.'], n), true);
    else if (step === 2 && povo[0]) Sm.say(S, povo[n % povo.length], pk(['Ninguém viu, mas todo mundo sabe.', 'Só pode ter sido ' + ela(acc) + '.', 'Eu não vi nada.'], n), true);
    else if (step === 3 && pres.indexOf(acc) >= 0) Sm.say(S, acc, culp ? (ind(S, acc).f < -20 ? pk(['Não fui eu!', 'Estão inventando.', 'Eu nem estava lá.'], n) : pk(['Fui eu. Errei.', 'Não sei o que me deu.', 'Eu faço por onde consertar.'], n)) : pk(['Não fui eu! Eu juro!', 'Vocês me conhecem.', 'Por que eu?'], n), true);
    else if (step === 4 && povo.length) { const q = povo[n % povo.length]; Sm.say(S, q, pk(['Que pague pelo que fez.', 'Todo mundo erra.', 'E se não foi ' + ela(acc) + '?', 'Isso não pode ficar assim.'], n + q.id), true); }
  }
  // a pena pelo tamanho do que foi feito; o líder violento pesa a mão, o manso dá mais uma chance
  function penaDe(S, c, acc, juiz) {
    const Ij = juiz ? ind(S, juiz) : { m: 0 };
    let nv = c.g === 3 ? (c.k === 'matar' ? 4 : 3) : 2;          // 2 trabalho curto · 3 trabalho longo · 4 exílio
    if ((acc.ficha || 0) >= 2 && nv === 3) nv = 4;                 // quem já foi julgado duas vezes
    if (Ij.m <= -30 && nv < 4) nv++;
    else if (Ij.m >= 65 && nv === 4 && c.k !== 'matar') nv = 3;
    if (nv >= 4) return { k: 'exilio' };
    const base = C.PENA_DIAS[c.k] || (c.g === 3 ? 10 : 3);
    return { k: 'trabalho', dias: nv === 3 && c.g === 2 ? base * 2 : base, devolve: c.k === 'furto' ? 1 : 0 };
  }
  function devolver(S, p) {
    if (!p.furto) return false;
    S.stock[p.furto.k] = (S.stock[p.furto.k] || 0) + p.furto.n;
    delete p.furto;
    return true;
  }
  const meuDe = (S, q, x) => !!x && (q === x || Fam().isPartner(q, x) || Fam().closeKin(S, q, x));
  function condenar(S, c, acc, pena, culp) {
    const s = S.soc, Sm = Sim(), vic = person(S, c.vic);
    c.st = 'julgado'; c.pena = pena.k; c.cond = acc.id; c.dias = pena.dias || 0;
    acc.ficha = (acc.ficha || 0) + 1;
    Sm.addMem(S, acc, 'humilhado');
    if (ind(S, acc).m <= -15) Sm.addMem(S, acc, 'ressentido');     // o de gênio ruim guarda a mágoa para depois da pena
    if (pena.devolve && culp && devolver(S, acc)) c.devolveu = 1;
    if (pena.k === 'trabalho') acc.pena = { k: 'trabalho', ate: S.t + pena.dias * DAY, cid: c.id, dias: pena.dias };
    else {
      // vai embora ao amanhecer (dá tempo de Deus dizer alguma coisa)
      acc.exilio = { t: (Math.floor(S.t / DAY) + 1) * DAY + 6 * 60, por: 'povo', cid: c.id };
      if (!culp) { s.pend.push({ k: 'inocente', cid: c.id, pid: acc.id, t: S.t }); ev(S, { ev: 'pend' }); }
    }
    if (s.lider === acc.id) { s.lider = 0; s.liderVago = S.t; }
    const penaTxt = pena.k === 'exilio' ? 'vai embora da aldeia ao amanhecer' : pena.dias + ' dias de trabalho' + (c.devolveu ? ', e devolveu o que pegou' : '');
    if (culp) {
      for (const q of S.people) if (here(q) && q !== acc && (meuDe(S, q, vic) || c.wit.indexOf(q.id) >= 0)) Sm.addMem(S, q, 'justica');
      if (c.g >= 3 || pena.k === 'exilio') Sm.chron(S, 'O povo julgou ' + acc.name + ' ao pé do fogo: ' + crimeTxt(c) + '. A pena: ' + penaTxt + '.');
      else Sm.toast(S, 'O povo julgou ' + acc.name + ': ' + penaTxt + '.', '');
    } else {
      c.injusto = 1; S.stats.injusticas++;
      Sm.addMem(S, acc, 'injusticado'); addDesc(S, acc, 30, 'injustica'); puxa(S, acc, 'm', -3, 'injustica');
      for (const q of S.people) {
        if (!here(q) || q === acc || q.id === c.by) continue;
        if (c.wit.indexOf(q.id) >= 0) { Sm.addMem(S, q, 'injustica'); addDesc(S, q, 12, 'injustica'); }
        else if (meuDe(S, q, acc)) { Sm.addMem(S, q, 'injustica'); addDesc(S, q, 15, 'injustica'); }
      }
      const autor = person(S, c.by);
      if (autor && here(autor)) puxa(S, autor, CRIME[c.k].ax, -2, 'impune');
      godChron(S, 'O povo condenou ' + acc.name + ' por algo que ' + ela(acc) + ' não fez (' + penaTxt + '). Só você sabe que foi ' + c.byN + ' quem ' + crimeTxt(c) + '. Um sonho pode mostrar a verdade.');
      ev(S, { ev: 'injusto', id: c.id, x: acc.x, y: acc.y });
    }
  }
  // o veredito: cada adulto presente pesa o que viu, de quem gosta, e o quanto o acusado é "de fora"
  function veredito(S, J, c, acc, pres) {
    const Sm = Sim(), F = Fam(), juiz = person(S, J.juiz), vic = person(S, c.vic);
    const culp = acc.id === c.by, Ij = juiz ? ind(S, juiz) : { g: 0, m: 0, f: 0 };
    const mixed = !!(S.povos && S.povos.mixed && Pv());
    let sim = 0, nao = 0;
    for (const v of pres) {
      if (v === acc || age(S, v) < 16) continue;
      let lean = 0;
      if (c.wit.indexOf(v.id) >= 0) {
        if (culp) lean += conta(S, v, acc, vic) ? 3 * (Ij.f >= 30 ? 1.3 : 1) : -2;
        else lean += ind(S, v).f > -30 ? -3 : 0.5;                 // viu que não foi essa pessoa
      } else {
        if (c.known && culp) lean += 1.5;                           // o que as testemunhas contaram
        lean -= Math.min(1.5, (v.rel[acc.id] || 0) / 8);           // quem gosta do acusado
        if (F.isPartner(v, acc) || F.closeKin(S, v, acc)) lean -= 2.5;
        if (vic && meuDe(S, v, vic)) lean += 1.5;
        let pre = Math.min(1.5, (acc.ficha || 0) * 0.5) + (acc.joined && S.t - acc.joined < 1.5 * YEAR ? 0.5 : 0);
        if (mixed) pre += (100 - Pv().pair(S, v, acc)) / 50 * 1.2;   // convivência baixa: a culpa cai em quem é de fora
        if (Ij.f <= -30) pre *= 1.5;                                // o líder mentiroso atiça
        lean += pre;
        if (c.acus && c.acus !== v.id) lean += 0.6;                 // a mentira que correu
      }
      lean += hsh(S, c.id * 17 + v.id, 5) - 0.5;
      if (lean > 0.6) sim++; else nao++;
    }
    const cond = sim > nao;
    S.stats.julgamentos++;
    c.julgT = S.t; c.votos = [sim, nao]; c.juiz = J.juiz;
    let pena = null;
    if (cond) {
      pena = penaDe(S, c, acc, juiz);
      if (juiz) Sm.say(S, juiz, pena.k === 'exilio' ? 'Aqui você não fica mais, ' + acc.name + '.' : acc.name + ', você vai trabalhar por todos: ' + pena.dias + ' dias.', true);
      condenar(S, c, acc, pena, culp);
    } else {
      if (juiz) Sm.say(S, juiz, 'Não há o que cobrar de ' + acc.name + '.', true);
      if (culp) {
        c.st = 'absolvido';
        for (const q of S.people) if (here(q) && meuDe(S, q, vic)) { Sm.addMem(S, q, 'semJustica'); addDesc(S, q, 8, 'injustica'); }
        Sm.toast(S, 'O povo não achou culpa em ' + acc.name + ' (' + sim + ' a ' + nao + '). Você sabe que foi ' + ela(acc) + '.', 'warn');
      } else {
        c.sus = 0; c.acus = 0; c.semSus = 1;
        Sm.toast(S, 'O povo não achou culpa em ' + acc.name + ' (' + sim + ' a ' + nao + '). E não foi mesmo.', '');
      }
    }
    fimJulg(S, { cond, pena });
  }
  // o julgamento, passo a passo: espera o povo chegar, ouve, decide
  function julgTick(S) {
    const s = S.soc, J = s.julg;
    if (!J) return;
    const c = s.crimes.find((x) => x.id === J.cid), acc = person(S, J.acc), f = Sim().building(S, J.fire);
    if (!c || !acc || !here(acc) || !f || !aberto(c) || S.ck.day !== J.day || rest(S)) { fimJulg(S, null); return; }
    const pres = presentes(S, J);
    if (J.st === 'chama') {
      const todos = J.part.every((id) => { const q = person(S, id); return !q || !here(q) || q.sleeping || (q.act && q.act.type === 'soc' && q.act.stage === 'stay'); });
      if (S.t - J.t0 < C.JULG_ESPERA && !todos) return;
      if (pres.filter((q) => q !== acc && age(S, q) >= 16).length < C.JULG_QUORUM) {
        if (S.t - J.t0 < C.JULG_ESPERA * 2) return;
        c.adiado = S.t + 12 * 60; c.tent = (c.tent || 0) + 1;
        Sim().toast(S, 'Pouca gente veio: o julgamento de ' + acc.name + ' ficou para outro dia.', '');
        fimJulg(S, null);
        return;
      }
      J.st = 'on'; J.tOn = S.t; J.fala = 0;
      if (Lf()) Lf().lightFire(S, f, 1);
      ev(S, { ev: 'julg', on: true, aberto: 1, x: f.x, y: f.y });
      return;
    }
    const dt = S.t - J.tOn;
    falas(S, J, c, acc, pres, dt);
    if (dt >= C.JULG_MIN) veredito(S, J, c, acc, pres);
  }
  So.blockStory = (S) => !!(S.soc && S.soc.julg && S.soc.julg.day === S.ck.day);
  // a pena cumprida pode mudar a índole (em quem tinha culpa); em inocente, só deixa mágoa
  function penas(S) {
    const s = S.soc, Sm = Sim();
    for (const p of S.people) {
      if (!here(p)) continue;
      if (p.marca && S.t >= p.marca) delete p.marca;
      if (p.doente && S.t >= p.doente) delete p.doente;
      if (!p.pena || S.t < p.pena.ate) continue;
      const c = s.crimes.find((x) => x.id === p.pena.cid), culp = !c || c.by === p.id, dias = p.pena.dias;
      delete p.pena;
      if (c) c.cumprida = 1;
      if (culp) {
        const ax = c ? CRIME[c.k].ax : 'g';
        puxa(S, p, ax, ind(S, p)[ax] <= -60 ? C.IND_PENA / 2 : C.IND_PENA, 'pena');
        Sm.addMem(S, p, 'cumpriuPena');
        Sm.toast(S, p.name + ' cumpriu a pena: ' + dias + ' dias de trabalho.', 'good');
      } else { addDesc(S, p, 20, 'injustica'); puxa(S, p, 'm', -4, 'injustica'); }
    }
  }
  // o tempo passa: o que ninguém julgou esfria (e quem fez e ficou sem resposta piora)
  function esfriar(S) {
    for (const c of S.soc.crimes) {
      if (!aberto(c)) continue;
      const autor = person(S, c.by);
      if (!autor || !autor.alive) { c.st = 'fechado'; continue; }
      if (S.t - c.t < C.CRIME_FRIO[c.g - 1] * DAY) continue;
      c.st = 'frio';
      if (!c.deus && here(autor)) puxa(S, autor, CRIME[c.k].ax, -C.IND_IMPUNE, 'impune');
    }
  }

  // ---------- o exílio ----------
  // para onde vai quem é mandado embora: a vila de fora, se existe; senão, longe, por onde dá para andar
  function destinoFora(S) {
    const s = S.soc, v = s.vila;
    if (v && !v.fim && !v.longe) return { x: v.x + 0.5, y: v.y + 0.5 };
    if (s.longeXY && S.t - s.longeXY.t < 20 * DAY) return s.longeXY;
    const st = sitio(S, 28, 46);
    s.longeXY = st ? { x: st.x + 0.5, y: st.y + 0.5, t: S.t } : { x: S.camp.x + 1.5, y: S.camp.y + 14.5, t: S.t };
    return s.longeXY;
  }
  // por: 'povo' (o julgamento) | 'deus'. A pessoa parte agora; some quando chega longe
  function exilar(S, p, por, c) {
    if (!here(p) || p.exilio && p.exilio.t <= S.t) return false;
    p.exilio = { t: S.t, por, cid: c ? c.id : 0 };
    delete p.pena; delete p.plano;
    G.AI.abort(S, p);
    p.nextEval = S.t;
    return true;
  }
  // chegou longe (ou não achou caminho): deixa a aldeia de vez
  function partiu(S, p) {
    const s = S.soc, Sm = Sim(), F = Fam(), ex = p.exilio || { por: 'povo' };
    // o bebê fica com quem fica
    for (const b of S.people) if (b.alive && b.carriedBy === p.id) b.carriedBy = 0;
    const pares = F.partners(S, p);
    for (const q of pares) { F.unlink(S, p, q); Sm.addMem(S, q, 'parExilado'); addDesc(S, q, 12, ex.por === 'deus' ? 'medo' : 'injustica'); }
    saudade(S, [p]);
    const nome = p.name;
    sair(S, p, 'exilio');
    S.stats.exilados++;
    if (s.vila && !s.vila.fim) { s.vila.n++; s.vila.laco = U.clamp(s.vila.laco - 4, -100, 100); }
    Sm.chron(S, nome + ' deixou a aldeia, mandad' + oa(p) + ' embora ' + (ex.por === 'deus' ? 'por ' + D(S) : 'pelo povo') + '.' + (s.vila && !s.vila.fim ? ' Foi bater na porta d' + s.vila.art + ' ' + s.vila.nome + '.' : ''));
    ev(S, { ev: 'exilio', x: p.x, y: p.y });
    if (s.lider === 0) s.liderVago = S.t;
  }

  // ---------- Deus castiga, mostra a verdade e perdoa ----------
  const CASTIGO = So.CASTIGO = [null,
    { k: 'sonho', nome: 'Aviso em sonho', desc: 'Só a pessoa fica sabendo. Na medida do que é leve.' },
    { k: 'marca', nome: 'Marca na testa', desc: 'Todos veem, por ' + C.MARCA_D + ' dias. Na medida do leve e do médio.' },
    { k: 'doenca', nome: 'Doença leve', desc: 'Uns dias de fraqueza, sem risco. Na medida do médio.' },
    { k: 'raio', nome: 'Raio por perto', desc: 'Cai ao lado, sem ferir. Na medida do médio e do grave.' },
    { k: 'exilio', nome: 'Exílio', desc: 'Vai embora da aldeia. Na medida do grave.' },
    { k: 'morte', nome: 'Morte', desc: 'Um raio que não erra. Só na medida do grave.' }];
  // o crime mais grave de alguém que ainda não teve resposta de Deus
  So.crimeDe = function (S, p) {
    let best = null;
    for (const c of S.soc.crimes) if (c.by === p.id && !c.deus && (!best || c.g > best.g || (c.g === best.g && c.t > best.t))) best = c;
    return best;
  };
  // a medida: 'inocente' | 'leve' | 'justo' | 'pesado'
  So.medida = function (S, p, nv) {
    const c = So.crimeDe(S, p);
    if (!c) return { m: 'inocente', c: null, fx: null };
    let fx = C.CASTIGO_FAIXA[c.g];
    if (c.st === 'julgado' && c.cond === p.id) fx = [1, 1];     // o povo já cobrou: mais que um aviso é pesar a mão
    return { m: nv < fx[0] ? 'leve' : nv > fx[1] ? 'pesado' : 'justo', c, fx };
  };
  So.castigoWhy = function (S, p, nv) {
    if (!S.god || !CASTIGO[nv]) return 'Não dá';
    if (!p || !here(p)) return 'Não está na aldeia';
    const a = age(S, p);
    if (a < 12) return 'Criança não se castiga';
    if (a < 16 && nv > 2) return 'Antes dos 16 anos, só o aviso ou a marca';
    if (p.labor) return 'Está em trabalho de parto';
    if (p.exilio) return 'Já está indo embora';
    const cost = C.CASTIGO_CUSTO[nv - 1];
    if (S.god.poder < cost) return 'Falta Poder: precisa de ' + cost + '.';
    return '';
  };
  // a verdade apareceu: quem pagava por outro deixa de pagar (e volta, se já tinha ido)
  function inocentar(S, c) {
    const Sm = Sim(), q = person(S, c.cond);
    if (!c.injusto || !q) return null;
    c.injusto = 0; c.cond = 0;
    if (q.fora) {
      if (q.away && q.away.why === 'exilio' && !q.morto && voltar(S, q, S.camp.x + 1.5, S.camp.y + 3.5)) {
        podaPares(S, [q]);
        if (S.soc.vila && !S.soc.vila.fim && q.id) S.soc.vila.n = Math.max(0, S.soc.vila.n - 1);
        Gd().init(S); if (Dz()) Dz().init(S); Fam().init(S);
        Sm.chron(S, q.name + ' voltou do exílio: a verdade apareceu, e o povo foi buscar.');
      } else return q;
    }
    if (q.pena && q.pena.cid === c.id) delete q.pena;
    if (q.exilio && q.exilio.cid === c.id) delete q.exilio;
    q.ficha = Math.max(0, (q.ficha || 0) - 1);
    q.mem = q.mem.filter((m) => m.k !== 'injusticado' && m.k !== 'humilhado');
    Sm.addMem(S, q, 'inocentado');
    q.desc = Math.max(0, (q.desc || 0) - 30);
    for (const o of S.people) if (here(o) && mem(o, 'injustica')) { o.mem = o.mem.filter((m) => m.k !== 'injustica'); o.desc = Math.max(0, (o.desc || 0) - 12); }
    S.soc.pend = S.soc.pend.filter((x) => !(x.k === 'inocente' && x.cid === c.id));
    return q;
  }
  So.castigar = function (S, pid, nv) {
    const p = person(S, pid), why = So.castigoWhy(S, p, nv);
    if (why) return { ok: false, msg: why };
    const Sm = Sim(), F = Fam(), God = Gd(), g = S.god;
    const med = So.medida(S, p, nv), c = med.c, m = med.m, nome = p.name;
    g.poder -= C.CASTIGO_CUSTO[nv - 1];
    S.stats.castigos++;
    g.lastGrace = S.t;
    const perto = S.people.filter((q) => here(q) && q !== p && dist(q, p) <= 8);
    const px = p.x, py = p.y;
    // o castigo em si
    if (nv === 1) { Sm.addMem(S, p, 'avisoSonho'); Sm.say(S, p, 'Sonhei que ' + D(S) + ' me olhava…', true, 'god'); }
    else if (nv === 2) { p.marca = S.t + C.MARCA_D * DAY; Sm.addMem(S, p, 'marcado'); Sm.say(S, p, 'O que é isso na minha testa?!', true, 'god'); }
    else if (nv === 3) { p.doente = S.t + C.DOENCA_D * DAY; p.needs.saude = Math.max(Math.min(p.needs.saude, 30), p.needs.saude - C.DOENCA_DANO); Sm.addMem(S, p, 'doenteDeus'); }
    else if (nv === 4) { S.events.push({ k: 'bolt', x: Math.floor(px) + 1, y: Math.floor(py) }); Sm.addMem(S, p, 'viuRaio'); Sm.say(S, p, 'Perdão! Perdão!', true); for (const q of perto) Sm.addMem(S, q, 'viuRaio'); }
    else if (nv === 5) exilar(S, p, 'deus', c);
    else { S.events.push({ k: 'bolt', x: Math.floor(px), y: Math.floor(py) }); p.dmg.raio = 999; p.needs.saude = -999; for (const q of perto) Sm.addMem(S, q, 'viuRaio'); }
    ev(S, { ev: 'castigo', nv, m, x: px, y: py });
    const publico = nv >= 2, vivo = nv < 6;
    const todos = S.people.filter((q) => here(q) && q !== p && age(S, q) >= 5);
    let msg;
    if (m === 'justo') {
      S.stats.castigosJustos++;
      c.deus = nv; c.deusM = 'justo';
      if (publico) {
        c.known = 1;
        if (c.injusto) { const q = inocentar(S, c); if (q) Sm.chron(S, 'Com o castigo de ' + nome + ', o povo entendeu que ' + q.name + ' não tinha feito nada.'); }
        if (aberto(c) || c.st === 'absolvido' || c.st === 'frio') c.st = 'castigado';
        for (const q of todos) { God.faith(S, q, 3); Sm.addMem(S, q, 'justicaDivina'); }
      }
      if (vivo) { const ax = CRIME[c.k].ax; puxa(S, p, ax, ind(S, p)[ax] <= -60 ? C.IND_CASTIGO / 2 : C.IND_CASTIGO, 'castigo'); God.faith(S, p, 8); }
      if (Mm() && publico) Mm().deed(S, 'justica', { a: nome, sx: p.sex, x1: crimeTxt(c) });
      msg = 'Na medida. ' + (publico ? 'O povo entendeu: ' + nome + ' ' + crimeTxt(c) + '.' : nome + ' entendeu o recado.');
    } else if (m === 'leve') {
      c.deus = nv; c.deusM = 'leve';
      if (publico) c.known = 1;
      puxa(S, p, CRIME[c.k].ax, 2, 'castigo');
      const vic = person(S, c.vic);
      for (const q of todos) if (meuDe(S, q, vic)) { Sm.addMem(S, q, 'semJustica'); God.faith(S, q, -3); }
      msg = 'Leve para o que ' + ela(p) + ' fez (' + So.GRAV[c.g] + '). ' + (c.vicN ? 'Quem sofreu esperava mais.' : 'Pouco muda.');
    } else if (m === 'pesado') {
      const ex = nv - med.fx[1];
      c.deus = nv; c.deusM = 'pesado';
      if (publico) { c.known = 1; if (aberto(c) || c.st === 'frio' || c.st === 'absolvido') c.st = 'castigado'; if (c.injusto) inocentar(S, c); }
      God.align(S, -5 * ex);
      for (const q of todos) { God.faith(S, q, 2); Sm.addMem(S, q, 'castigoPesado'); addDesc(S, q, (meuDe(S, q, p) ? 10 : 3) * ex, 'medo'); }
      if (vivo) puxa(S, p, 'm', -5, 'pesado');
      if (Mm()) Mm().deed(S, 'pesado', { a: nome, sx: p.sex, x: px, y: py });
      msg = 'Pesado demais para algo ' + So.GRAV[c.g] + (c.st === 'julgado' ? ' que o povo já tinha cobrado' : '') + '. O povo ficou com medo.';
    } else {
      // inocente: quem sabia que a pessoa não fez nada perde a fé. Se o povo a tinha condenado, só a família e quem viu a verdade sabem
      S.stats.castigosInocente = (S.stats.castigosInocente || 0) + 1;
      const cond = S.soc.crimes.find((x) => x.cond === p.id && x.by !== p.id && x.injusto);
      God.align(S, -10);
      for (const q of todos) {
        const meu = meuDe(S, q, p);
        if (cond && !meu && cond.wit.indexOf(q.id) < 0 && q.id !== cond.by) continue;
        God.faith(S, q, meu ? -25 : -12); Sm.addMem(S, q, 'castigoInjusto'); addDesc(S, q, meu ? 30 : 15, 'medo');
      }
      if (vivo) { God.faith(S, p, -30); addDesc(S, p, 40, 'medo'); puxa(S, p, 'm', -6, 'injustica'); }
      if (Mm()) Mm().deed(S, 'pesado', { a: nome, sx: p.sex, x1: 'inocente', x: px, y: py });
      msg = nome + ' não tinha feito nada. Quem sabia disso perdeu a fé.';
    }
    return { ok: true, m, msg };
  };
  // um sonho mostra a alguém do povo quem foi de verdade
  So.revelarWhy = function (S, c) {
    if (!c) return 'Não há o que mostrar';
    if (c.known && !c.injusto) return 'O povo já sabe quem foi';
    if (S.god.poder < C.REVELAR_CUSTO) return 'Falta Poder: precisa de ' + C.REVELAR_CUSTO + '.';
    return '';
  };
  So.revelar = function (S, cid) {
    const s = S.soc, c = s.crimes.find((x) => x.id === cid), why = So.revelarWhy(S, c);
    if (why) return { ok: false, msg: why };
    const Sm = Sim(), autor = person(S, c.by);
    S.god.poder -= C.REVELAR_CUSTO;
    S.god.lastGrace = S.t;
    // quem sonha: o líder, ou quem tem mais fé
    const sonha = (person(S, s.lider) && here(person(S, s.lider)) && s.lider !== c.by ? person(S, s.lider) : null) ||
      S.people.filter((q) => here(q) && age(S, q) >= 14 && q.id !== c.by).sort((a, b) => (b.fe || 0) - (a.fe || 0) || a.id - b.id)[0] || null;
    c.known = 1; c.rev = S.t; c.sus = 0; c.acus = 0; c.semSus = 0;
    const livre = c.injusto ? inocentar(S, c) : null;
    if (autor && here(autor)) { if (c.st !== 'perdoado' && c.st !== 'castigado') { c.st = 'aberto'; c.adiado = 0; c.t = Math.max(c.t, S.t - (C.CRIME_FRIO[c.g - 1] - 6) * DAY); } }
    else if (aberto(c)) c.st = 'fechado';
    if (sonha) { Gd().faith(S, sonha, 5); Sm.say(S, sonha, 'Eu sonhei. Eu vi quem foi.', true, 'god'); }
    Gd().align(S, 1);
    S.stats.revelados = (S.stats.revelados || 0) + 1;
    const txt = (sonha ? sonha.name + ' sonhou' : 'O povo sonhou') + ' com o que aconteceu: foi ' + c.byN + ' quem ' + crimeTxt(c) + '.' + (livre ? ' ' + livre.name + ' não tinha feito nada, e o povo pediu desculpa.' : '');
    Sm.chron(S, txt);
    ev(S, { ev: 'revelado', id: c.id });
    return { ok: true, msg: txt };
  };
  // o perdão público: um sinal sobre quem errou, diante de todos
  So.perdaoWhy = function (S, c) {
    if (!c) return 'Não há o que perdoar';
    const autor = person(S, c.by);
    if (!autor || !here(autor)) return 'Quem fez não está na aldeia';
    if (c.st === 'perdoado' || c.deus === 'perdao') return 'Já foi perdoado';
    if (S.god.poder < C.PERDAO_CUSTO) return 'Falta Poder: precisa de ' + C.PERDAO_CUSTO + '.';
    return '';
  };
  So.perdoar = function (S, cid) {
    const s = S.soc, c = s.crimes.find((x) => x.id === cid), why = So.perdaoWhy(S, c);
    if (why) return { ok: false, msg: why };
    const Sm = Sim(), God = Gd(), p = person(S, c.by), vic = person(S, c.vic);
    S.god.poder -= C.PERDAO_CUSTO;
    S.god.lastGrace = S.t;
    const pagou = !!c.cumprida || (c.deus && c.deus !== 'perdao');
    if (c.injusto) inocentar(S, c);
    c.st = 'perdoado'; c.deus = 'perdao'; c.known = 1; c.perdao = S.t;
    if (p.pena && p.pena.cid === c.id) delete p.pena;
    if (p.exilio && p.exilio.cid === c.id && p.exilio.t > S.t) delete p.exilio;
    God.align(S, 3 + c.g);
    God.faith(S, p, 15);
    Sm.addMem(S, p, 'perdoado');
    const ax = CRIME[c.k].ax;
    puxa(S, p, ax, ind(S, p)[ax] <= -60 ? 2 : C.IND_PERDAO, 'perdao');
    for (const q of S.people) {
      if (!here(q) || q === p || age(S, q) < 5) continue;
      if (c.g >= 2 && !pagou && meuDe(S, q, vic)) { Sm.addMem(S, q, 'semJustica'); God.faith(S, q, -4); }
      else { Sm.addMem(S, q, 'viuPerdao'); God.faith(S, q, 1); }
    }
    S.stats.perdoes++;
    if (Mm()) Mm().deed(S, 'perdao', { a: p.name, sx: p.sex });
    Sm.say(S, p, pk(['Eu não mereço… obrigad' + oa(p) + '.', 'Eu vou ser outra pessoa.', D(S) + ' me perdoou.'], c.id), true, 'god');
    const txt = D(S) + ' perdoou ' + p.name + ' diante de todos' + (c.g >= 2 && !pagou && vic && vic.alive ? '. ' + vic.name + ' achou cedo demais.' : '.');
    Sm.chron(S, txt);
    ev(S, { ev: 'perdao', x: p.x, y: p.y });
    return { ok: true, msg: txt };
  };

  // ---------- o líder ----------
  const lv = (p, sk) => G.AI.lvl(p, sk);
  // o que cada povo respeita: o humano, o afeto; o elfo, a idade; o anão, o ofício; o povo-fera, a força
  const RESP = {
    humano: (S, v, c) => Math.min(60, (v.rel[c.id] || 0) * 4) + (Fam().isPartner(v, c) || Fam().closeKin(S, v, c) ? 15 : 0) + c.mood * 0.2,
    elfo: (S, v, c) => Math.min(100, age(S, c) * 1.2),
    anao: (S, v, c) => (lv(c, 'oficio') + lv(c, 'construcao')) * 5 + (c.skills.mineracao ? lv(c, 'mineracao') * 3 : 0),
    fera: (S, v, c) => lv(c, 'caca') * 7 + c.needs.saude * 0.25 + (Pv() && Pv().has(c, 'garras') ? 10 : 0) + (Fam().bodyAge(S, c) <= 45 ? 10 : 0),
  };
  So.RESPEITA = { humano: 'quem é querido', elfo: 'quem viveu mais', anao: 'quem mais sabe fazer', fera: 'quem tem mais força' };
  function respeito(S, v, c, tally) {
    const sides = Pv() ? Pv().sides(v) : ['humano'];
    let r = 0;
    for (const k of sides) { const x = (RESP[k] || RESP.humano)(S, v, c) / sides.length; r += x; if (tally) tally[RESP[k] ? k : 'humano'] = (tally[RESP[k] ? k : 'humano'] || 0) + x; }
    const I = ind(S, c);
    r += I.g * 0.15 + I.f * 0.1 - (c.ficha || 0) * 12 + (c.escolhido ? 10 : 0) + (v === c ? 5 : 0);
    return Math.max(0, r);
  }
  So.candidatos = (S) => S.people.filter((p) => here(p) && age(S, p) >= 20 && !p.exilio && !p.pena && !p.labor && p.id !== S.soc.vetado && !(S.soc.diss && S.soc.diss.ids.indexOf(p.id) >= 0));
  function placar(S) {
    const vs = adults(S, 16);
    return So.candidatos(S).map((c) => { const t = {}; return { p: c, t, r: vs.reduce((a, v) => a + respeito(S, v, c, t), 0) }; }).sort((a, b) => b.r - a.r || a.p.id - b.p.id);
  }
  So.placar = placar;
  const PORQUE = { humano: 'É a pessoa mais querida da aldeia.', elfo: 'É quem viveu mais.', anao: 'É quem mais sabe fazer com as mãos.', fera: 'É quem tem mais força.' };
  // escolhe (ou troca) o líder. force: mesmo que o de agora ainda sirva
  function eleger(S, force) {
    const s = S.soc, Sm = Sim();
    if (rest(S) || adults(S, 18).length < C.LIDER_MIN) return null;
    const pl = placar(S);
    if (!pl.length) return null;
    const cur = person(S, s.lider), top = pl[0];
    const vale = cur && here(cur) && !cur.exilio;
    if (vale && !force) {
      const mine = pl.find((x) => x.p === cur);
      if (top.p === cur || (mine && top.r < mine.r * C.LIDER_TROCA)) return cur;
    }
    if (vale && top.p === cur) return cur;
    s.lider = top.p.id; s.liderT = S.t; delete s.liderVago;
    S.stats.lideres = (S.stats.lideres || 0) + 1;
    let bk = 'humano', bv = -1;
    for (const k in top.t) if (top.t[k] > bv) { bv = top.t[k]; bk = k; }
    s.liderPq = bk;
    Sm.chron(S, (vale ? 'O povo passou a ouvir ' + top.p.name + ' no lugar de ' + cur.name + '. ' : S.stats.lideres === 1 ? 'O povo escolheu quem fala por todos: ' + top.p.name + '. ' : 'O povo escolheu outra voz: ' + top.p.name + '. ') + PORQUE[bk] +
      (S.stats.lideres === 1 ? ' É quem chama o julgamento ao pé do fogo e, se você deixar, quem marca as obras que faltam.' : ''));
    ev(S, { ev: 'lider', pid: top.p.id });
    return top.p;
  }
  So.eleger = eleger;
  So.lider = (S) => { const p = S.soc ? person(S, S.soc.lider) : null; return p && here(p) ? p : null; };
  So.liderInfo = function (S) {
    const L = So.lider(S);
    if (!L) return null;
    const s = S.soc;
    return { p: L, desde: s.liderT, porque: PORQUE[s.liderPq || 'humano'], rot: So.rotulos(S, L), ruim: So.rotulos(S, L).filter((r) => !r.bom).length };
  };

  // ---------- obras por conta própria ----------
  So.MODOS = {
    eu: ['Só eu marco', 'O povo espera você marcar cada obra.'],
    pede: ['O povo pede', 'O líder aponta o lugar e espera o seu sim.'],
    decide: ['O povo decide', 'O líder marca sozinho o que falta, usando até ' + Math.round(C.SOC_TETO * 100) + '% de cada material do estoque. Numa aldeia grande, várias obras ao mesmo tempo.'],
  };
  So.FALTA = { casa: 'Tem gente dormindo ao relento.', longe: 'As casas de lá ficam longe do estoque.', fogo: 'Há casa longe de qualquer fogo.', armazem: 'A comida está estragando no estoque.', cerca: 'Bicho entrou na roça.', mina: 'Falta pedra.' };
  So.setModo = function (S, m) {
    if (!So.MODOS[m]) return false;
    S.soc.modo = m;
    if (m === 'eu') S.soc.pedidos = [];
    return true;
  };
  // um lugar para a obra, o mais perto de (cx, cy), sem encostar em outra obra nem tapar caminho
  function lugar(S, type, cx, cy, r0, r1) {
    const Sm = Sim(), w = S.world, def = C.BUILD[type];
    const folga = (x, y) => {
      for (let yy = y - 1; yy <= y + def.h; yy++) for (let xx = x - 1; xx <= x + def.w; xx++) {
        if (xx < 1 || yy < 1 || xx >= w.W - 1 || yy >= w.H - 1) return false;
        const i = yy * w.W + xx;
        if (w.bgrid[i] >= 0 || Sm.isCamp(S, i) || (w.road && (w.road[i] || (w.roadJob && w.roadJob[i]))) || (w.fence && (w.fence[i] || w.fenceJob[i]))) return false;
      }
      return true;
    };
    for (let r = r0; r <= r1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (!Sm.canPlace(S, type, x, y) && folga(x, y)) return { x, y };
    }
    return null;
  }
  // 0.16: quem não tem lugar fixo em casa nenhuma (em lugares de cama). Até a 0.15 a conta era só o total (lugares
  // pedidos contra lugares de pé): três sozinhos em barracas pela metade dormiam ao relento com o total "fechando", e o
  // líder nunca marcava a casa que faltava
  // A cama fixa só é dada na hora de dormir: quem ainda não tem uma procura agora (como faria ao deitar), para a casa
  // que acabou de ficar pronta não contar como falta
  function semTeto(S) {
    const F = Fam(), dentro = new Set();
    for (const b of S.buildings) if (b.built && b.beds) for (const id of b.beds) dentro.add(id);
    let n = 0;
    for (const p of S.people) {
      if (!here(p) || dentro.has(p.id) || !F.bedUnits(S, p)) continue;
      const t = G.AI && G.AI.pickTent ? G.AI.pickTent(S, p) : null;
      if (t) { for (const id of t.beds) dentro.add(id); continue; }
      n += F.bedUnits(S, p);
    }
    return n;
  }
  So.semTeto = semTeto;
  const faltaCasa = (S) => Fam().bedsNeeded(S) > capFutura(S) || semTeto(S) > capFutura(S) - Fam().bedsTotal(S);
  // o que falta, na ordem em que o líder olha
  function faltas(S) {
    const s = S.soc, Sm = Sim(), K = G.Campo, out = [];
    const tem = (t) => S.buildings.some((b) => b.type === t);
    if (s.semCama >= 2 && faltaCasa(S)) out.push({ type: 'barraca', why: 'casa' });
    const fires = S.buildings.filter((b) => b.type === 'fogueira');
    const casa = S.buildings.find((b) => b.built && Sm.def(b).cap && !fires.some((f) => Math.hypot(f.x - b.x, f.y - b.y) <= C.SOC_FOGO_LONGE));
    if (casa) out.push({ type: 'fogueira', why: 'fogo', perto: casa });
    if (s.rot >= C.SOC_ROT && !tem('armazem') && G.Tech.buildOpen(S, 'armazem')) out.push({ type: 'armazem', why: 'armazem' });
    // 0.16: um bairro de casas longe de todo estoque pede um armazém no meio dele (é por ali que vão entregar e pegar)
    else if (G.Tech.buildOpen(S, 'armazem') && !S.buildings.some((b) => b.type === 'armazem' && !b.built)) { const b = bairroLonge(S); if (b) out.push({ type: 'armazem', why: 'longe', perto: b }); }
    if (K && K.known(S, 'cerca') && S.campo && !S.campo.fjobs.length) {
      const b = S.buildings.find((x) => x.type === 'roca' && x.built && x.farm && x.farm.raidDay !== undefined && S.ck.day - x.farm.raidDay <= 12 && !K.enclosed(S, x));
      if (b) out.push({ type: 'cerca', why: 'cerca', perto: b });
    }
    if (s.semPedra >= 2 && !tem('mina') && C.BUILD.mina && G.Tech.buildOpen(S, 'mina')) out.push({ type: 'mina', why: 'mina' });
    return out;
  }
  So.faltas = faltas;
  // 0.16: a casa mais longe de qualquer estoque (o centro ou um armazém), se houver CENTRO_LONGE passos ou mais e
  // pelo menos 3 casas por ali
  function bairroLonge(S) {
    const Sm = Sim(), stores = [{ x: S.camp.x, y: S.camp.y }].concat(S.buildings.filter((b) => b.type === 'armazem' && b.built));
    const dist = (b) => Math.min(...stores.map((s) => Math.hypot(s.x - b.x, s.y - b.y)));
    const casas = S.buildings.filter((b) => b.built && Sm.def(b).cap);
    let far = null;
    for (const b of casas) if (dist(b) >= C.CENTRO_LONGE && (!far || dist(b) > dist(far))) far = b;
    if (!far || casas.filter((b) => Math.hypot(b.x - far.x, b.y - far.y) <= 8).length < 3) return null;
    return far;
  }
  So.bairroLonge = bairroLonge;
  // 0.16: o líder muda o centro para o meio das casas, quando a aldeia cresceu para longe dele (no modo "O povo pede",
  // só sugere; em "Só eu marco", fica com você). No máximo uma vez a cada CENTRO_MUDA_D dias
  function centroDia(S) {
    const s = S.soc, Sm = Sim();
    if (s.modo === 'eu' || S.t - (S.stats.centroT || 0) < C.CENTRO_MUDA_D * DAY) return;
    const casas = S.buildings.filter((b) => b.built && Sm.def(b).cap);
    if (casas.length < 4) return;
    const mx = Math.round(casas.reduce((a, b) => a + b.x + b.w / 2, 0) / casas.length) - 1, my = Math.round(casas.reduce((a, b) => a + b.y + b.h / 2, 0) / casas.length) - 1;
    if (Math.hypot(mx - S.camp.x, my - S.camp.y) < C.CENTRO_LONGE + 4) return;
    let at = null;
    for (let r = 0; r <= 8 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || Sm.campWhy(S, mx + dx, my + dy)) continue;
      at = { x: mx + dx, y: my + dy }; break;
    }
    if (!at) return;
    const L = So.lider(S) || adults(S, 18).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    if (s.modo === 'pede') {
      if (s.centroPedido && S.t - s.centroPedido < 20 * DAY) return;
      s.centroPedido = S.t;
      Sm.toast(S, (L ? L.name : 'O povo') + ' acha que o centro devia ficar no meio das casas. Dá para mudar no painel do Povo, em Mudar o centro.', '');
      return;
    }
    Sm.moveCamp(S, at.x, at.y, L ? L.name : 'O povo');
  }
  So.centroDia = centroDia;
  // os lugares de dormir que vão existir: as obras de pé, as marcadas e as melhorias em andamento (pelo nível que vão ter)
  function capFutura(S) {
    const Sm = Sim();
    let cap = 0;
    for (const b of S.buildings) {
      const d = b.up ? Sm.defOf(b.type, b.up.lv, b.up.kind) : Sm.def(b);
      if (d && d.cap) cap += d.cap;
    }
    return cap;
  }
  So.capFutura = capFutura;
  // quantas obras do povo podem andar ao mesmo tempo: uma, e mais uma a cada SOC_OBRAS_POR adultos (até SOC_OBRAS_MAX)
  So.obrasMax = (S) => Math.min(C.SOC_OBRAS_MAX, 1 + Math.floor(adults(S, 16).length / C.SOC_OBRAS_POR));
  const obrasAtivas = (S) => S.buildings.filter((b) => b.povo && (!b.built || b.up)).length + (S.campo && S.campo.fjobs.some((j) => j.povo) ? 1 : 0);
  // a casa que vale melhorar: a barraca avançada que pode virar a casa grande do lugar (a de mais lugares)
  function casaMelhor(S) {
    const Sm = Sim();
    let best = null;
    for (const b of S.buildings) {
      if (b.type !== 'barraca' || !b.built || b.up || b.demol || b.site || b.re || (b.lv || 1) < 2) continue;
      for (const o of Sm.upgrades(S, b)) {
        if (o.why) continue;
        const d = Sm.defOf(b.type, o.lv, o.kind), ganho = (d.cap || 0) - (Sm.def(b).cap || 0);
        if (ganho >= 2 && (!best || ganho > best.ganho)) best = { b, kind: o.kind, ganho, cost: d.cost || {} };
      }
    }
    return best;
  }
  function ondeObra(S, f) {
    const Sm = Sim(), w = S.world, K = G.Campo, cx = S.camp.x + 1, cy = S.camp.y + 1;
    if (f.type === 'cerca') {
      const b = f.perto, tiles = [];
      for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue;
        const i = y * w.W + x;
        if (!K.fenceWhy(S, i) && !w.fence[i] && !w.fenceJob[i]) tiles.push(i);
      }
      return tiles.length >= 4 ? { x: b.x, y: b.y, tiles } : null;
    }
    if (f.type === 'fogueira') return f.perto ? lugar(S, 'fogueira', f.perto.x + 1, f.perto.y + 1, 2, 5) : null;
    // 0.16: o armazém não fica mais preso ao centro: o das casas longe vai para o meio delas
    if (f.type === 'armazem') return f.perto ? lugar(S, 'armazem', f.perto.x + 1, f.perto.y + 1, 2, 9) : lugar(S, 'armazem', cx, cy, 2, 9);
    if (f.type === 'mina') return lugar(S, 'mina', cx, cy, 3, 40);
    // a casa nova perto das outras
    const casas = S.buildings.filter((b) => Sm.def(b).cap);
    const mx = casas.length ? casas.reduce((a, b) => a + b.x, 0) / casas.length : cx, my = casas.length ? casas.reduce((a, b) => a + b.y, 0) / casas.length : cy;
    return lugar(S, 'barraca', mx, my, 2, 14) || lugar(S, 'barraca', cx, cy, 3, 22);
  }
  const custoDe = (q) => (q.type === 'cerca' ? { madeira: q.tiles.length * C.CERCA_WOOD } : C.BUILD[q.type].cost || {});
  So.custoDe = custoDe;
  // cabe no teto? O povo só compromete uma parte do que há de cada material
  function cabe(S, q) {
    const cost = custoDe(q);
    for (const k in cost) if (cost[k] > Math.floor((S.stock[k] || 0) * C.SOC_TETO)) return false;
    return true;
  }
  const NOME_OBRA = { barraca: 'uma barraca', fogueira: 'uma fogueira', armazem: 'um armazém', cerca: 'uma cerca em volta da roça', mina: 'uma mina' };
  function marcar(S, q, L) {
    const Sm = Sim(), K = G.Campo;
    let ok = false;
    if (q.type === 'cerca') {
      for (const i of q.tiles) if (K.markFence(S, i, true)) { ok = true; const j = K.fenceJobAt(S, i); if (j) j.povo = 1; }
    } else {
      if (Sm.canPlace(S, q.type, q.x, q.y)) { const at = ondeObra(S, { type: q.type, why: q.why, perto: Sm.building(S, q.pid) }); if (!at) return false; q.x = at.x; q.y = at.y; }
      const b = Sm.placeBlueprint(S, q.type, q.x, q.y);
      if (b) { b.povo = 1; ok = true; }
    }
    if (!ok) return false;
    S.stats.obrasPovo++;
    const txt = (L ? L.name : 'O povo') + ' marcou ' + NOME_OBRA[q.type] + ': ' + So.FALTA[q.why].charAt(0).toLowerCase() + So.FALTA[q.why].slice(1);
    if (S.stats.obrasPovo === 1) Sm.chron(S, 'Pela primeira vez o povo marcou uma obra por conta própria. ' + txt);
    else Sm.toast(S, txt, '');
    ev(S, { ev: 'obra', x: q.x, y: q.y, type: q.type });
    return true;
  }
  // de manhã o líder olha o que falta. Modo 'pede': deixa o pedido e espera; 'decide': marca, se couber no teto
  function planejarObra(S) {
    const s = S.soc;
    if (rest(S) || s.modo === 'eu') return null;
    // sem líder, quem olha é o adulto mais velho
    const L = So.lider(S) || adults(S, 18).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    if (!L) return null;
    s.pedidos = s.pedidos.filter((q) => S.t - q.t < C.PEDIDO_D * DAY);
    if (s.pedidos.length) return null;
    const max = So.obrasMax(S);
    delete s.espera;
    let primeiro = null;
    // 0.16: gente dormindo ao relento passa na frente. Com a fila cheia de obras (do jogador ou do povo), a casa que
    // faltava esperava para sempre; agora uma casa entra mesmo assim, se nenhuma outra está sendo erguida
    const casaAndando = S.buildings.some((b) => b.type === 'barraca' && (!b.built || b.up));
    // numa aldeia grande, várias de uma vez (no modo "pede", uma pergunta de cada vez)
    for (let k = 0; k < max; k++) {
      const cheio = obrasAtivas(S) >= max || S.buildings.filter((b) => !b.built || b.up).length >= max + 2;
      if (cheio && (k > 0 || casaAndando)) break;
      const q = umaObra(S, L, cheio ? 'casa' : '');
      if (!q) break;
      primeiro = primeiro || q;
      if (s.modo === 'pede' || cheio) break;
    }
    return primeiro;
  }
  So.planejarObra = planejarObra;
  // 0.16: com o jogo fechado, o líder também marca a casa que falta. Antes, quem nascia ou crescia longe da vista
  // voltava dormindo na rua: os dias resumidos erguiam as obras marcadas, mas ninguém marcava a casa
  So.casaFechado = function (S) {
    const s = S.soc;
    if (!s || s.modo === 'eu' || s.pedidos.length || !faltaCasa(S)) return null;
    if (S.buildings.some((b) => b.type === 'barraca' && (!b.built || b.up))) return null;
    const L = So.lider(S) || adults(S, 18).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    if (!L) return null;
    s.semCama = Math.max(s.semCama, 2);
    return umaObra(S, L, 'casa');
  };
  // so: só olha este motivo ('casa'); vazio, olha tudo o que falta
  function umaObra(S, L, so) {
    const s = S.soc;
    for (const f of faltas(S)) {
      if (so && f.why !== so) continue;
      if (s.recusa[f.type] > S.t) continue;
      const at = ondeObra(S, f);
      if (!at) { s.recusa[f.type] = S.t + 5 * DAY; continue; }
      const q = { id: s.np++, type: f.type, why: f.why, x: at.x, y: at.y, t: S.t, by: L.id };
      if (f.perto) q.pid = f.perto.id;
      if (at.tiles) q.tiles = at.tiles;
      if (s.modo === 'pede') {
        s.pedidos.push(q); S.stats.pedidos++;
        Sim().toast(S, L.name + ' pede ' + NOME_OBRA[q.type] + ': ' + So.FALTA[q.why].charAt(0).toLowerCase() + So.FALTA[q.why].slice(1) + ' O lugar está marcado com um ponto de interrogação.', '');
        ev(S, { ev: 'pedido', id: q.id, x: q.x, y: q.y });
        return q;
      }
      // falta casa: se uma barraca avançada pode virar a casa grande do lugar e o material cabe, melhora (mais lugares no mesmo chão)
      if (f.type === 'barraca') {
        const m = casaMelhor(S);
        if (m && Object.keys(m.cost).every((k) => m.cost[k] <= Math.floor((S.stock[k] || 0) * C.SOC_TETO)) && Sim().startUpgrade(S, m.b, m.kind)) {
          m.b.povo = 1;
          S.stats.obrasPovo++;
          const d = Sim().defOf(m.b.type, m.b.up.lv, m.b.up.kind);
          const txt = L.name + ' marcou a melhoria de uma barraca para ' + d.name.toLowerCase() + ' (' + d.cap + ' lugares): tem gente dormindo ao relento';
          if (S.stats.obrasPovo === 1) Sim().chron(S, 'Pela primeira vez o povo marcou uma obra por conta própria. ' + txt + '.');
          else Sim().toast(S, txt + '.', '');
          ev(S, { ev: 'obra', x: m.b.x, y: m.b.y, type: 'barraca' });
          return { type: 'melhoria', why: 'casa', x: m.b.x, y: m.b.y, bid: m.b.id };
        }
      }
      // 0.16: casa não espera o estoque. Com o teto de 40%, a barraca de 14 de madeira pedia 35 guardados, e ninguém
      // juntava madeira para uma obra que não existia: o povo dormia na rua para sempre. Marcada, a obra pede o
      // material que falta e o povo vai buscar
      if (f.why !== 'casa' && !cabe(S, q)) { s.espera = { type: f.type, why: f.why, t: S.t }; continue; }
      if (marcar(S, q, L)) return q;
    }
    return null;
  }
  So.aprovar = function (S, id) {
    const s = S.soc, i = s.pedidos.findIndex((q) => q.id === id);
    if (i < 0) return false;
    const q = s.pedidos.splice(i, 1)[0];
    return marcar(S, q, So.lider(S));
  };
  So.recusar = function (S, id) {
    const s = S.soc, i = s.pedidos.findIndex((q) => q.id === id);
    if (i < 0) return false;
    const q = s.pedidos.splice(i, 1)[0];
    s.recusa[q.type] = S.t + C.RECUSA_D * DAY;
    // quem dorme ao relento e ouviu o não
    if (q.why === 'casa') for (const p of S.people) if (here(p) && mem(p, 'dormiuRelento') && !S.buildings.some((b) => b.beds && b.beds.indexOf(p.id) >= 0)) addDesc(S, p, 5, 'cama');
    return true;
  };

  // ---------- descontentamento ----------
  So.DESC = { cama: 'falta casa', fome: 'passaram fome', frio: 'passaram frio', humor: 'a vida aqui anda ruim', povo: 'os povos não se entendem', injustica: 'viram injustiça', lider: 'não confiam em quem manda', medo: 'têm medo de Deus' };
  function addDesc(S, p, d, why) {
    if (!p || !here(p) || age(S, p) < 16) return;
    p.desc = U.clamp((p.desc || 0) + d, 0, 100);
    if (d > 0 && why) { const w = p.descWhy || (p.descWhy = {}); w[why] = +((w[why] || 0) + d).toFixed(1); }
  }
  So.addDesc = addDesc;
  const LUTO = { perdeuAlguem: 1, perdeuCompanheiro: 1, perdeuFamilia: 1, perdeuBebe: 1 };
  function descDia(S) {
    const F = Fam(), L = So.lider(S), al = S.god ? S.god.align : 0, P = Pv();
    const semCama = F.bedsNeeded(S) > F.bedsTotal(S);
    const Li = L ? ind(S, L) : null;
    const liderRuim = Li ? So.AX.filter((k) => Li[k] <= -C.INDOLE_ROTULO).length : 0;
    const mixed = !!(P && S.povos && S.povos.mixed);
    let maior = 'humano';
    if (mixed) { let mn = -1; for (const k of P.ORDER) { const n = P.count(S, k); if (n > mn) { mn = n; maior = k; } } }
    for (const p of S.people) {
      if (!here(p) || age(S, p) < 16) continue;
      let up = 0;
      const add = (d, why) => { if (d > 0) { up += d; addDesc(S, p, d, why); } };
      if (semCama && mem(p, 'dormiuRelento') && !S.buildings.some((b) => b.beds && b.beds.indexOf(p.id) >= 0)) add(C.DESC_CAMA, 'cama');
      if (mem(p, 'passouFome')) add(C.DESC_FOME, 'fome');
      if (mem(p, 'passouFrio')) add(C.DESC_FRIO, 'frio');
      if (p.mood < 25 && !p.mem.some((m) => LUTO[m.k])) add(C.DESC_HUMOR, 'humor');
      if (mixed && P.sides(p).some((k) => k !== maior && P.conv(S, k, maior) < C.CONV_LOW)) add(C.DESC_POVO, 'povo');
      if (mem(p, 'injustica') || mem(p, 'injusticado')) add(C.DESC_INJ, 'injustica');
      // o líder ruim e o medo de Deus desgastam, mas sozinhos não levam ninguém embora (param em DESC_TETO)
      if (liderRuim && L !== p && (p.desc || 0) < C.DESC_TETO) add(C.DESC_LIDER * liderRuim, 'lider');
      if (al < -30 && (p.desc || 0) < C.DESC_TETO) add(C.DESC_MEDO, 'medo');
      if (!up && p.desc) {
        p.desc = Math.max(0, p.desc - C.DESC_CAI - (p.mood >= 60 ? 1 : 0));
        if (!p.desc) p.descWhy = {};
      }
    }
  }

  // ---------- dissidentes ----------
  // o que Deus pode prometer para cada motivo, o prazo em dias e como se vê que cumpriu
  const PROM = So.PROM = {
    cama: { txt: 'Casa para todos', dias: 12, ok: (S) => Fam().bedsNeeded(S) <= Fam().bedsTotal(S), como: 'Erga casas até caber todo mundo.' },
    fome: { txt: 'Comida farta', dias: 10, ok: (S) => S.ctx.foodDays >= 5, como: 'Junte comida para 5 dias no estoque.' },
    frio: { txt: 'Lenha e fogo', dias: 8, ok: (S) => S.stock.madeira >= 30 && !!S.ctx.fireLit, como: 'Guarde 30 de madeira e mantenha o fogo aceso.' },
    humor: { txt: 'Dias melhores', dias: 8, ok: (S, d) => (S.stats.parties || 0) > (d.prom.base || 0), como: 'Dê motivo para uma festa.' },
    povo: { txt: 'Paz entre os povos', dias: 15, ok: (S) => !Pv() || !S.povos || !Object.keys(S.povos.conv || {}).some((k) => S.povos.conv[k] < C.CONV_LOW + 5 && !(S.povos.uni && S.povos.uni[k])), como: 'Festa e história aproximam os povos.' },
    injustica: { txt: 'Justiça', dias: 6, ok: (S) => !S.soc.crimes.some((c) => c.injusto), como: 'Mostre em sonho quem foi de verdade.' },
    lider: { txt: 'Outra voz para o povo', dias: 6, ok: (S, d) => S.soc.liderT > d.prom.t0 || !S.soc.lider, como: 'O povo escolhe outro líder na próxima tardinha.' },
    medo: { txt: 'Um Deus mais brando', dias: 15, ok: (S, d) => S.god.align >= Math.min(-20, (d.prom.base || -100) + 12), como: 'Cure, aqueça, perdoe: o que puxa para o lado bondoso.' },
  };
  const NOMES_VILA = ['Buriti', 'Taquari', 'Jurema', 'Araçá', 'Itaoca', 'Cambuí', 'Guapé', 'Sapucaí', 'Piraí', 'Carandá', 'Mutum', 'Ibirá', 'Jataí', 'Pindaíba', 'Cajuru', 'Imbé'];
  // gente descontente se junta: de DISS_MIN a DISS_MAX adultos, em volta de quem está pior; os pares que também não
  // estão contentes vão junto (quem ama alguém contente fica); os filhos pequenos vão com os pais
  function juntar(S) {
    const s = S.soc, F = Fam(), Sm = Sim();
    if (rest(S) || s.diss || S.t < s.dissCool) return null;
    const ad = adults(S, 18);
    if (ad.length < C.DISS_ALDEIA) return null;
    const pode = (p) => !p.pena && !p.exilio && !p.escolhido && p.id !== s.lider && !p.labor;
    const cand = ad.filter((p) => (p.desc || 0) >= C.DISS_DESC && pode(p));
    if (cand.length < C.DISS_MIN) return null;
    cand.sort((a, b) => b.desc - a.desc || a.id - b.id);
    const cab = cand[0];
    const outros = cand.slice(1).sort((a, b) => (cab.rel[b.id] || 0) - (cab.rel[a.id] || 0) || b.desc - a.desc || a.id - b.id);
    const max = Math.min(C.DISS_MAX, Math.floor(ad.length * C.DISS_FRAC));
    const set = new Set([cab].concat(outros).slice(0, max).map((p) => p.id));
    for (const id of [...set]) {
      const p = person(S, id);
      for (const q of F.partners(S, p)) {
        if (set.has(q.id) || age(S, q) < 18) continue;
        if ((q.desc || 0) >= C.DISS_DESC / 3 && set.size < max + 2 && pode(q)) set.add(q.id);
        else if (F.afeto(p, q) >= 50 && p !== cab) set.delete(p.id);
      }
    }
    const grupo = [...set].map((id) => person(S, id)).filter((q) => q && here(q));
    if (grupo.length < C.DISS_MIN) { s.dissCool = S.t + 5 * DAY; return null; }
    const kids = [];
    for (const k of S.people) {
      if (!k.alive || set.has(k.id) || age(S, k) >= 14) continue;
      const mo = person(S, k.mother), fa = person(S, k.father);
      const moH = !!(mo && mo.alive), faH = !!(fa && fa.alive);
      if ((moH && set.has(mo.id) && (!faH || set.has(fa.id))) || (faH && set.has(fa.id) && !moH)) kids.push(k.id);
    }
    const tal = {};
    for (const p of grupo) for (const k in p.descWhy || {}) tal[k] = (tal[k] || 0) + p.descWhy[k];
    let motivo = 'humor', mv = 0;
    for (const k in tal) if (tal[k] > mv) { mv = tal[k]; motivo = k; }
    s.diss = { ids: grupo.map((p) => p.id), kids, cab: cab.id, motivo, t0: S.t, st: 'aviso', prazo: S.t + C.DISS_PRAZO_H * 60, chegou: {} };
    s.pend.push({ k: 'diss', t: S.t });
    Sm.chron(S, Sm.listNames(grupo.slice(0, 3)) + (grupo.length > 3 ? ' e mais ' + (grupo.length - 3) : '') + ' avisaram que vão embora: ' + motivoTxt(S, motivo) + '.' + (kids.length ? ' Levam ' + kids.length + (kids.length > 1 ? ' crianças.' : ' criança.') : ''));
    Sm.say(S, cab, pk(['Aqui não dá mais.', 'A gente vai procurar outro lugar.', 'Quem quiser, vem com a gente.'], cab.id + S.ck.day), true);
    ev(S, { ev: 'pend' });
    ev(S, { ev: 'aviso', x: cab.x, y: cab.y });
    return s.diss;
  }
  So.juntar = juntar;
  const motivoTxt = (S, k) => (k === 'medo' ? 'têm medo de ' + D(S) : So.DESC[k] || So.DESC.humor);
  So.dissInfo = function (S) {
    const d = S.soc && S.soc.diss;
    if (!d) return null;
    const ps = d.ids.map((id) => person(S, id)).filter(Boolean), pr = PROM[d.motivo] || PROM.humor;
    return { st: d.st, nomes: ps.map((p) => p.name), n: ps.length, kids: d.kids.length, cab: person(S, d.cab), motivo: d.motivo, motivoTxt: motivoTxt(S, d.motivo),
      prazoH: Math.max(0, Math.ceil((d.prazo - S.t) / 60)), promTxt: pr.txt, promDias: pr.dias, promComo: pr.como, custo: C.DISS_MILAGRE,
      prom: d.prom ? { txt: (PROM[d.prom.k] || pr).txt, como: (PROM[d.prom.k] || pr).como, dias: Math.max(0, Math.ceil((d.prom.ate - S.t) / DAY)) } : null };
  };
  // a resposta de Deus ao aviso: 'ir' | 'milagre' | 'promessa'
  So.dissResp = function (S, r) {
    const s = S.soc, d = s.diss, Sm = Sim();
    if (!d || d.st !== 'aviso') return { ok: false, msg: 'Não há aviso esperando resposta.' };
    const gente = d.ids.map((id) => person(S, id)).filter((p) => p && here(p));
    if (r === 'milagre') {
      if (S.god.poder < C.DISS_MILAGRE) return { ok: false, msg: 'Falta Poder: precisa de ' + C.DISS_MILAGRE + '.' };
      S.god.poder -= C.DISS_MILAGRE; S.god.miracles++; S.god.lastGrace = S.t;
      for (const p of gente) { p.desc = Math.max(0, (p.desc || 0) - 45); Gd().faith(S, p, 10); Sm.addMem(S, p, 'viuMilagre'); if (Dz()) Dz().sinal(S, p, 'milagre'); }
      Gd().align(S, 1);
      s.diss = null; s.dissCool = S.t + 20 * DAY;
      s.pend = s.pend.filter((x) => x.k !== 'diss');
      const cab = person(S, d.cab);
      if (cab) ev(S, { ev: 'sinal', x: cab.x, y: cab.y });
      Sm.chron(S, 'Um sinal de ' + D(S) + ' segurou quem ia embora. O motivo continua: ' + motivoTxt(S, d.motivo) + '.');
      return { ok: true, msg: 'Ficaram. O motivo continua.' };
    }
    if (r === 'promessa') {
      const k = PROM[d.motivo] ? d.motivo : 'humor', pr = PROM[k];
      d.st = 'promessa';
      d.prom = { k, t0: S.t, ate: S.t + pr.dias * DAY, base: k === 'humor' ? (S.stats.parties || 0) : k === 'medo' ? S.god.align : 0 };
      for (const p of gente) { p.desc = Math.max(0, (p.desc || 0) - 25); Sm.addMem(S, p, 'promessa'); }
      if (k === 'lider') { s.vetado = s.lider; s.lider = 0; s.liderVago = S.t; }
      s.pend = s.pend.filter((x) => x.k !== 'diss');
      Sm.chron(S, D(S) + ' prometeu a quem ia embora: ' + pr.txt.toLowerCase() + ', em ' + pr.dias + ' dias. ' + pr.como);
      return { ok: true, msg: 'Prometido: ' + pr.txt.toLowerCase() + ', em ' + pr.dias + ' dias.' };
    }
    irEmbora(S, 10);
    return { ok: true, msg: S.soc.diss && S.soc.diss.sai <= S.t ? 'Estão de saída.' : 'Saem ao amanhecer.' };
  };
  // decidido: saem ao amanhecer (ou já, se é dia). laco: como a vila de fora vai olhar para cá
  function irEmbora(S, laco) {
    const s = S.soc, d = s.diss, h = S.ck.hour;
    if (!d) return;
    d.st = 'indo'; d.laco = laco;
    d.sai = h >= 6 && h < 14 ? S.t : (Math.floor(S.t / DAY) + (h >= 6 ? 1 : 0)) * DAY + 6 * 60;
    s.pend = s.pend.filter((x) => x.k !== 'diss');
    const v = s.vila;
    if (v && !v.fim && !v.longe) d.dest = { x: v.x + 0.5, y: v.y + 0.5 };
    else {
      const st = sitio(S, C.VILA_DIST, C.VILA_DIST_MAX);
      d.dest = st ? { x: st.x + 0.5, y: st.y + 0.5 } : { x: S.camp.x + 1.5, y: S.camp.y + 1.5 };
      if (!st) d.longe = 1;
    }
  }
  // a promessa: cumprida antes do prazo, ficam; passou o prazo sem cumprir, vão na hora
  function promessaDia(S) {
    const s = S.soc, d = s.diss, Sm = Sim();
    if (!d || d.st !== 'promessa') return;
    const pr = PROM[d.prom.k], ok = pr.ok(S, d);
    if (!ok && S.t < d.prom.ate) return;
    const gente = d.ids.map((id) => person(S, id)).filter((p) => p && here(p));
    if (ok) {
      for (const p of gente) { p.desc = Math.min(p.desc || 0, 15); p.descWhy = {}; Gd().faith(S, p, 8); }
      Gd().align(S, 2);
      if (Mm()) Mm().deed(S, 'palavra', { r: 1, tone: 1 });
      Sm.chron(S, D(S) + ' prometeu ' + pr.txt.toLowerCase() + ' e cumpriu. Quem ia embora ficou.');
      S.stats.promessasOk = (S.stats.promessasOk || 0) + 1;
      s.diss = null; s.dissCool = S.t + C.DISS_COOL_D * DAY;
      return;
    }
    for (const p of S.people) if (here(p) && age(S, p) >= 7) { Gd().faith(S, p, -6); Sm.addMem(S, p, 'promessaQuebrada'); }
    Gd().align(S, -4);
    if (Mm()) Mm().deed(S, 'palavra', { r: 0, tone: -1 });
    Sm.chron(S, D(S) + ' prometeu ' + pr.txt.toLowerCase() + ' e não cumpriu. Quem esperava não espera mais.');
    S.stats.promessasNao = (S.stats.promessasNao || 0) + 1;
    irEmbora(S, -30);
  }
  // um lugar para a outra vila: de dmin a dmax passos do estoque, em chão firme, com espaço em volta e caminho até lá
  function sitio(S, dmin, dmax) {
    const w = S.world, Wd_ = Wd(), cx = S.camp.x + 1, cy = S.camp.y + 1, campI = S.camp.y * w.W + S.camp.x;
    const livre = (x, y) => {
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
        if (xx < 4 || yy < 4 || xx >= w.W - 4 || yy >= w.H - 4) return false;
        const i = yy * w.W + xx;
        if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]] || w.bgrid[i] >= 0) return false;
      }
      return true;
    };
    const cands = [];
    for (let d = dmin + 1; d <= dmax; d += 4) for (let k = 0; k < 24; k++) {
      const a = (k + hsh(S, d, 31) ) / 24 * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (!livre(x, y)) continue;
      // água por perto vale
      let agua = 0;
      for (let yy = y - 6; yy <= y + 6; yy += 2) for (let xx = x - 6; xx <= x + 6; xx += 2) if (xx > 0 && yy > 0 && xx < w.W && yy < w.H && G.IS_WATER[w.tile[yy * w.W + xx]]) agua++;
      if (Math.hypot(x - cx, y - cy) < dmin) continue;
      cands.push({ x, y, s: d - dmin - Math.min(6, agua) * 2 });
    }
    cands.sort((a, b) => a.s - b.s || a.x - b.x || a.y - b.y);
    for (let i = 0; i < cands.length && i < 14; i++) {
      const c = cands[i], path = Wd_.findPath(w, campI, c.y * w.W + c.x, 1400);
      if (path && path.length) return c;
    }
    return null;
  }
  So.sitio = sitio;
  // levam comida para o caminho: duas porções por cabeça, até um quarto do que há
  function provisoes(S, n) {
    const st = S.stock;
    let quer = n * 2, total = 0;
    const ks = ['seca', 'defumado', 'frutas', 'peixe', 'carne', 'milho', 'feijao', 'abobora', 'mandioca'];
    for (const k of ks) total += st[k] || 0;
    quer = Math.min(quer, Math.floor(total / 4));
    let got = 0;
    for (const k of ks) while (quer > 0 && st[k] > 0) { st[k]--; quer--; got++; }
    return got;
  }
  // a caminhada: saem juntos; quando todos chegaram (ou passou muito tempo), a vila está fundada
  function dissTick(S) {
    const s = S.soc, d = s.diss;
    if (!d || d.st !== 'indo' || S.t < d.sai) return;
    const todos = d.ids.concat(d.kids).map((id) => person(S, id)).filter((p) => p && p.alive && S.people.indexOf(p) >= 0);
    if (!d.saiu) {
      d.saiu = 1;
      const got = provisoes(S, todos.length);
      for (const p of todos) { if (p.carriedBy) continue; p.needs.fome = Math.max(p.needs.fome, 88); p.needs.sede = Math.max(p.needs.sede, 88); p.needs.energia = Math.max(p.needs.energia, 75); if (p.sleeping || p.inTent) G.AI.abort(S, p); p.nextEval = S.t; }
      d.levou = got;
      ev(S, { ev: 'partida', x: S.camp.x, y: S.camp.y });
    }
    const andam = todos.filter((p) => !p.carriedBy);
    if (!andam.length || d.longe || andam.every((p) => d.chegou[p.id]) || S.t - d.sai > C.DISS_ANDA_H * 60) fundar(S);
  }
  function fundar(S) {
    const s = S.soc, d = s.diss, Sm = Sim(), F = Fam();
    const gente = d.ids.concat(d.kids).map((id) => person(S, id)).filter((p) => p && p.alive && S.people.indexOf(p) >= 0);
    s.diss = null; s.dissCool = S.t + C.DISS_COOL_D * DAY;
    if (!gente.length) return null;
    const set = new Set(gente.map((p) => p.id));
    for (const b of S.people) if (b.alive && b.carriedBy && set.has(b.carriedBy)) { set.add(b.id); if (gente.indexOf(b) < 0) gente.push(b); }
    // os laços de par com quem fica se desfazem
    for (const p of gente) if (p.bonds) for (const id of Object.keys(p.bonds)) { const q = person(S, +id); if (q && q.alive && !set.has(q.id)) { F.unlink(S, p, q); Sm.addMem(S, q, 'parenteFoi'); } }
    const cab = person(S, d.cab), nAd = gente.filter((p) => age(S, p) >= 18).length, fe = gente.reduce((a, p) => a + (p.fe || 0), 0) / gente.length;
    let v = s.vila;
    const nova = !v || v.fim;
    if (nova) {
      const used = v ? v.nome : '';
      let nome = NOMES_VILA[Math.floor(hsh(S, 17, 91) * NOMES_VILA.length)];
      if (nome === used) nome = NOMES_VILA[(NOMES_VILA.indexOf(nome) + 1) % NOMES_VILA.length];
      v = s.vila = { nome, x: Math.floor(d.dest.x), y: Math.floor(d.dest.y), longe: d.longe ? 1 : 0, t0: S.t, bem: 60, laco: d.laco || 0, deus: '', motivo: d.motivo, cab: cab ? cab.name : '', filhos: [], hist: [], mortes: 0,
        prox: S.t + (C.VILA_EVENTO_D[0] + S.rng.next() * (C.VILA_EVENTO_D[1] - C.VILA_EVENTO_D[0])) * DAY, feIda: Math.round(fe) };
    } else v.laco = U.clamp(v.laco + (d.laco || 0) / 2, -100, 100);
    saudade(S, gente);
    for (const p of gente.slice()) if (S.people.indexOf(p) >= 0) sair(S, p, 'dissidente');
    for (const p of gente) p.away.vila = 1;
    S.stats.dissidentes += gente.length;
    const passos = Math.round(Math.hypot(v.x - S.camp.x - 1, v.y - S.camp.y - 1));
    const quem = (cab ? cab.name : 'Um grupo') + (gente.length > 1 ? ' e mais ' + (gente.length - 1) : '');
    Sm.chron(S, nova ? quem + ' foram embora (' + motivoTxt(S, d.motivo) + ') e fundaram outra vila, ' + v.nome + (v.longe ? ', longe daqui.' : ', a ' + passos + ' passos daqui.') + ' Ela segue a vida por conta própria: pode trocar, casar e brigar com a de cá, e pode voltar.'
      : quem + ' foram embora (' + motivoTxt(S, d.motivo) + ') e se juntaram a ' + v.nome + '.');
    vhist(S, nova ? 'Fundada por ' + (cab ? cab.name : 'quem saiu') + ', com ' + gente.length + ' pessoas.' : 'Chegaram mais ' + gente.length + ' da aldeia.');
    Gd().align(S, -2);
    ev(S, { ev: 'vila', nova: nova ? 1 : 0, x: v.x, y: v.y });
    if (!s.lider) s.liderVago = S.t;
    return v;
  }
  So.fundar = fundar;

  // ---------- a vila de fora, resumida ----------
  function vhist(S, text) { const v = S.soc.vila; if (!v) return; v.hist.push({ t: S.t, text }); if (v.hist.length > 12) v.hist.shift(); }
  const daVila = (S) => vivosFora(S).filter((q) => q.away && q.away.vila);
  So.vilaPop = (S) => (S.soc && S.soc.vila && !S.soc.vila.fim ? daVila(S).length + S.soc.vila.filhos.length : 0);
  // um dia na vila de fora, sem simular ninguém: o bem-estar sobe e desce com as estações, nascem filhos, os velhos se vão
  function vilaDia(S) {
    const s = S.soc, v = s.vila;
    if (!v || v.fim) return;
    const gente = daVila(S), F = Fam(), day = S.ck.day;
    if (gente.length + v.filhos.length <= 0) { v.fim = S.t; Sim().chron(S, 'Em ' + v.nome + ' não mora mais ninguém.'); return; }
    const r = (k) => hsh(S, day * 7 + k, 4242);
    v.bem = U.clamp(v.bem + (S.ck.season === 3 ? -0.5 : 0.25) + (r(1) - 0.5) * 1.2, 0, 100);
    v.laco = U.clamp(v.laco + (v.laco < 5 ? 0.08 : v.laco > 30 ? -0.03 : 0), -100, 100);
    const ad = gente.filter((q) => { const a = F.bodyAge(S, q); return a >= 18 && a <= 42; });
    const fs = ad.filter((q) => q.sex === 'F'), ms = ad.filter((q) => q.sex === 'M');
    if (fs.length && ms.length && v.bem > 30 && r(2) < Math.min(fs.length, ms.length) * C.VILA_NASC / C.YEAR_DAYS) {
      const mae = fs[Math.floor(r(3) * fs.length)], pai = ms[Math.floor(r(4) * ms.length)];
      if (!F.closeKin(S, mae, pai)) v.filhos.push({ t: S.t, sex: r(5) < 0.5 ? 'F' : 'M', mae: mae.id, pai: pai.id });
    }
    for (const q of gente) {
      const a = F.bodyAge(S, q);
      const yearly = a >= C.OLD_AGE ? C.OLD_DEATH_BASE + (a - C.OLD_AGE) * C.OLD_DEATH_STEP : v.bem < 15 ? 0.05 : 0.004;
      if (hsh(S, day * 13 + q.id, 99) < yearly / C.YEAR_DAYS) { q.morto = S.t; v.mortes++; v.novas = (v.novas || []).concat(q.name).slice(-4); }
    }
    if (!rest(S) && S.t >= v.prox) vilaEvento(S);
  }
  const grupoVila = (S) => { const n = S.narr; if (!n) return null; for (const gid in n.groups) { const g = n.groups[gid]; if (g.kind === 'vila' && g.state !== 'indo' && g.state !== 'acolhido' && g.state !== 'fim') return g; } return null; };
  const pdDe = (S, q) => ({ sex: q.sex, name: q.name, age: age(S, q), traits: q.traits, look: q.look, role: 'vila', povo: q.povo || '', pid: q.id });
  function vilaEvento(S) {
    const s = S.soc, v = s.vila, N = Nr();
    v.prox = S.t + (C.VILA_EVENTO_D[0] + S.rng.next() * (C.VILA_EVENTO_D[1] - C.VILA_EVENTO_D[0])) * DAY;
    if (!N || S.ck.season === 3 || N.beastsOut(S) || N.pending(S) || grupoVila(S) || s.diss) { v.prox = S.t + 3 * DAY; return null; }
    const opts = [];
    if (!v.deus && S.t - v.t0 > YEAR && (v.motivo === 'medo' || v.motivo === 'injustica' || v.feIda < 45 || v.laco < -20)) opts.push(['deus', 3]);
    if (v.bem < 25 || (v.laco >= 50 && S.t - v.t0 > 2 * YEAR)) opts.push(['volta', v.bem < 25 ? 4 : 1.5]);
    if (v.laco <= -25 && !(v.medo > S.t)) opts.push(['briga', 3]);
    if (v.laco >= 15 && S.t - (v.casouT || -1e9) > YEAR) opts.push(['casamento', 2]);
    if (v.laco >= -20) opts.push(['troca', 3]);
    if (!opts.length) return null;
    let sum = 0;
    for (const o of opts) sum += o[1];
    let x = S.rng.next() * sum, k = opts[0][0];
    for (const o of opts) { x -= o[1]; if (x <= 0) { k = o[0]; break; } }
    return So.vilaFaz(S, k);
  }
  So.vilaFaz = function (S, k) {
    const s = S.soc, v = s.vila, Sm = Sim(), N = Nr(), F = Fam();
    if (!v || v.fim) return null;
    const gente = daVila(S), ad = gente.filter((q) => age(S, q) >= 18);
    if (k === 'deus') {
      v.deus = Dz() ? Dz().makeGodName(S, 7) : 'Outro';
      if (v.deus === D(S)) v.deus = Dz().makeGodName(S, 9);
      v.deusT = S.t;
      vhist(S, 'Passaram a rezar para ' + v.deus + '.');
      Sm.chron(S, 'Em ' + v.nome + ' já não rezam para ' + D(S) + '. Dizem que quem cuida deles é ' + v.deus + '. Um milagre diante de quem vier de lá pode trazê-los de volta.');
      return k;
    }
    if (k === 'briga') {
      v.saque = (Math.floor(S.t / DAY) + 1) * DAY + 2 * 60;      // de madrugada
      return k;
    }
    if (!ad.length) return null;
    if (k === 'troca') {
      const quem = ad.slice().sort((a, b) => hsh(S, a.id, S.ck.day) - hsh(S, b.id, S.ck.day)).slice(0, Math.min(2, ad.length));
      const g = N.spawnVila(S, quem.map((q) => pdDe(S, q)), v, { what: 'troca' });
      if (!g) return null;
      Sm.toast(S, 'Gente de ' + v.nome + ' vem pela trilha: ' + Sm.listNames(quem) + ', para trocar.', '');
      return k;
    }
    if (k === 'casamento') {
      const livres = S.people.filter((p) => here(p) && age(S, p) >= 18 && F.bodyAge(S, p) <= 40 && !F.partners(S, p).length && p.id !== s.lider && !p.escolhido && !p.pena && !p.exilio && !p.labor && !p.preg);
      if (!livres.length) return null;
      const aqui = livres.sort((a, b) => (b.desc || 0) - (a.desc || 0) || a.id - b.id)[0];
      const la = ad.filter((q) => q.sex !== aqui.sex && F.bodyAge(S, q) <= 40 && !Object.keys(q.bonds || {}).some((id) => { const o = person(S, +id); return o && o.fora && !o.morto; }) && !F.closeKin(S, aqui, q))
        .sort((a, b) => Math.abs(age(S, a) - age(S, aqui)) - Math.abs(age(S, b) - age(S, aqui)) || a.id - b.id)[0] || null;
      v.casouT = S.t;
      if (la && ((aqui.desc || 0) >= 30 || S.rng.next() < 0.4)) {
        // quem é daqui vai morar lá
        saudade(S, [aqui]);
        const nome = aqui.name;
        sair(S, aqui, 'casou');
        aqui.away.vila = 1;
        F.link(S, aqui, la, 55);
        v.laco = U.clamp(v.laco + 12, -100, 100);
        S.stats.casamentosVila++;
        vhist(S, nome + ' veio da aldeia para casar com ' + la.name + '.');
        Sm.chron(S, nome + ' foi morar em ' + v.nome + ': casou com ' + la.name + ', que tinha ido embora.');
        return k;
      }
      const pd = la ? pdDe(S, la) : Object.assign(N.visitorData(S, aqui.sex === 'F' ? 'M' : 'F', U.clamp(age(S, aqui) + S.rng.int(-3, 3), 18, 38), 'vila', new Set()), { povo: '' });
      const g = N.spawnVila(S, [pd], v, { what: 'casar', com: aqui.id });
      if (!g) return null;
      Sm.toast(S, pd.name + ', de ' + v.nome + ', vem pela trilha: quer casar com ' + aqui.name + ' e morar aqui.', 'good');
      return k;
    }
    if (k === 'volta') {
      const vem = ad.slice().sort((a, b) => a.id - b.id).slice(0, 6), ids = new Set(vem.map((q) => q.id));
      const kids = gente.filter((q) => age(S, q) < 18 && (ids.has(q.mother) || ids.has(q.father)));
      const fl = v.filhos.map((f, i) => i).filter((i) => ids.has(v.filhos[i].mae) || ids.has(v.filhos[i].pai));
      const todos = vem.concat(kids);
      const g = N.spawnVila(S, todos.map((q) => pdDe(S, q)), v, { what: 'volta', filhos: fl, porque: v.bem < 25 ? 'aperto' : 'saudade' });
      if (!g) return null;
      Sm.toast(S, 'Gente de ' + v.nome + ' vem pela trilha: ' + Sm.listNames(vem.slice(0, 3)) + (todos.length > 3 ? ' e mais ' + (todos.length - 3) : '') + '.', '');
      return k;
    }
    return null;
  };
  // a caravana chegou ao estoque (narrator.js chama)
  So.onChegou = function (S, g) {
    const s = S.soc, v = s.vila, Sm = Sim(), N = Nr(), st = S.stock;
    if (!v) { N.sendAway(S, g.id); return; }
    const pds = N.groupInfo(S, g.id).people;
    if (g.what === 'troca') {
      // trazem o que falta aqui; levam do que sobra (se não sobra nada, deixam de presente)
      const falta = ['pedra', 'couro', 'fibra', 'argila', 'seca', 'defumado'].sort((a, b) => (st[a] || 0) - (st[b] || 0))[0];
      const sobra = ['frutas', 'peixe', 'madeira', 'milho', 'feijao', 'carne'].sort((a, b) => (st[b] || 0) - (st[a] || 0))[0];
      const n = 6 + Math.floor(S.rng.next() * 7), leva = (st[sobra] || 0) >= n * 2 ? n : 0;
      st[falta] = (st[falta] || 0) + n;
      if (leva) st[sobra] -= leva;
      v.laco = U.clamp(v.laco + 6, -100, 100);
      S.stats.trocasVila++;
      const RL = G.AI.RES_LABEL || {};
      const txt = Sm.listNames(pds) + ', de ' + v.nome + ', ' + (pds.length > 1 ? 'trouxeram ' : 'trouxe ') + n + ' de ' + (RL[falta] || falta) + (leva ? ' e ' + (pds.length > 1 ? 'levaram ' : 'levou ') + leva + ' de ' + (RL[sobra] || sobra) + '.' : ', de presente.');
      if (S.stats.trocasVila === 1) Sm.chron(S, txt + ' É a primeira troca com a vila de quem foi embora.'); else Sm.toast(S, txt, 'good');
      vhist(S, 'Troca com a aldeia.');
      novas(S, pds);
      g.sai = S.t + 180;
      return;
    }
    if (g.what === 'casar') {
      const aqui = person(S, g.com), pd = pds[0];
      if (!aqui || !here(aqui) || !pd || Fam().partners(S, aqui).length) { N.sendAway(S, g.id); return; }
      const e = N.entsOf(S, g.id)[0];
      let novo = pd.pid ? So.away(S, pd.pid) : null;
      if (novo) { voltar(S, novo, e ? e.x : S.camp.x + 1.5, e ? e.y : S.camp.y + 3.5); podaPares(S, [novo]); }
      else {
        novo = Sm.makePerson(S, pd.sex, pd.name, pd.age);
        novo.traits = pd.traits.slice(); novo.look = pd.look;
        novo.x = e ? e.x : S.camp.x + 1.5; novo.y = e ? e.y : S.camp.y + 3.5; novo.px = novo.x; novo.py = novo.y;
        novo.lastAge = pd.age; novo.joined = S.t;
        S.people.push(novo);
      }
      N.endGroup(S, g.id);
      Gd().init(S); if (Dz()) Dz().init(S); Fam().init(S);
      ind(S, novo);
      Fam().link(S, aqui, novo, 55);
      Sm.addMem(S, novo, 'acolhido'); Sm.addMem(S, aqui, 'novoPar');
      v.laco = U.clamp(v.laco + 12, -100, 100);
      S.stats.casamentosVila++;
      vhist(S, novo.name + ' foi morar na aldeia: casou com ' + aqui.name + '.');
      Sm.chron(S, novo.name + ', de ' + v.nome + ', veio morar aqui: casou com ' + aqui.name + '.');
      if (Pv() && Pv().recount) Pv().recount(S);
      return;
    }
    if (g.what === 'volta') {
      g.state = 'esperando';
      Sm.chron(S, Sm.listNames(pds.slice(0, 3)) + (pds.length > 3 ? ' e mais ' + (pds.length - 3) : '') + ', de ' + v.nome + ', ' + (g.porque === 'aperto' ? 'passam aperto e' : 'sentem falta daqui e') + ' pedem para voltar.');
      if (S.narr.auto) { So.decide(S, g, S.narr.auto === 'acolher'); return; }
      if (!S.safe) S.events.push({ k: 'choice', gid: g.id });
      return;
    }
    N.sendAway(S, g.id);
  };
  // as notícias que a visita traz: quem morreu lá, e o outro deus
  function novas(S, pds) {
    const v = S.soc.vila, Sm = Sim();
    if (v.novas && v.novas.length) { Sm.toast(S, 'Notícia de ' + v.nome + ': ' + Sm.listNames(v.novas.map((n) => ({ name: n }))) + (v.novas.length > 1 ? ' morreram lá.' : ' morreu lá.'), ''); v.novas = []; }
    const ids = new Set(pds.map((x) => x.pid));
    for (const q of S.people) {
      if (!here(q)) continue;
      if (pds.some((x) => { const o = So.away(S, x.pid); return o && (o.mother === q.id || o.father === q.id || q.mother === o.id || q.father === o.id || (o.mother && o.mother === q.mother) || (q.rel[o.id] || 0) >= 6); })) Sm.addMem(S, q, 'visitaVila');
      if (v.deus && (q.fe || 0) < 35 && age(S, q) >= 12) Gd().faith(S, q, -3);     // ouviu falar de outro deus
    }
    return ids;
  }
  // os de fora que pediram para voltar: acolher ou mandar seguir (narrator.js chama, pela janela de escolha)
  So.decide = function (S, g, accept) {
    const s = S.soc, v = s.vila, Sm = Sim(), N = Nr(), F = Fam();
    if (!g || g.kind !== 'vila' || g.state !== 'esperando') return false;
    const ents = N.entsOf(S, g.id);
    if (!accept) {
      N.sendAway(S, g.id);
      if (v) { v.laco = U.clamp(v.laco - 25, -100, 100); v.bem = Math.max(0, v.bem - 10); vhist(S, 'A aldeia não quis receber quem pedia para voltar.'); }
      Sm.chron(S, 'O povo mandou seguir quem pedia para voltar.');
      S.events.push({ k: 'narr', ev: 'andarilho', on: false });
      return true;
    }
    const made = [];
    for (const e of ents) {
      const q = e.pd && e.pd.pid ? So.away(S, e.pd.pid) : null;
      if (q && !q.morto && voltar(S, q, e.x, e.y)) made.push(q);
    }
    podaPares(S, made);
    // os filhos que nasceram lá
    const fl = (g.filhos || []).slice().sort((a, b) => b - a), mset = new Set(made.map((q) => q.id));
    for (const i of fl) {
      const f = v && v.filhos[i];
      if (!f) continue;
      const mae = mset.has(f.mae) ? person(S, f.mae) : null, pai = mset.has(f.pai) ? person(S, f.pai) : null;
      if (!mae && !pai) continue;
      const b = F.makeBaby(S, mae, pai, f.sex, F.pickName(S, f.sex, mae, pai));
      // quem ficou lá continua sendo pai ou mãe (o parentesco vale para os pares e para a árvore)
      if (!b.mother && f.mae) b.mother = f.mae;
      if (!b.father && f.pai) b.father = f.pai;
      b.born = f.t; b.lastAge = age(S, b);
      if (Pv()) Pv().inherit(S, b, mae, pai);
      if (age(S, b) >= 3 || !mae) { b.carriedBy = 0; const c = mae || pai; b.x = c.x; b.y = c.y; b.px = b.x; b.py = b.y; b.inTent = 0; }
      b.needs = { fome: 75, sede: 75, energia: 80, calor: 90, social: 70, saude: 100 };
      S.people.push(b);
      made.push(b);
      v.filhos.splice(i, 1);
    }
    N.endGroup(S, g.id);
    if (F.reindex) F.reindex(S);
    Gd().init(S); if (Dz()) Dz().init(S); F.init(S);
    if (Pv() && Pv().recount) Pv().recount(S);
    for (const q of made) { ind(S, q); Sm.addMem(S, q, 'acolhido'); }
    for (const q of S.people) if (here(q) && made.indexOf(q) < 0) Sm.addMem(S, q, 'voltouGente');
    S.stats.voltas += made.length;
    Gd().align(S, 3);
    Sm.chron(S, Sm.listNames(made.filter((q) => age(S, q) >= 14).slice(0, 4)) + (made.length > 4 ? ' e os seus' : '') + (made.length > 1 ? ' voltaram' : ' voltou') + ' para a aldeia. Agora são ' + S.people.filter((p) => p.alive).length + '.');
    if (v) {
      vhist(S, made.length + ' voltaram para a aldeia.');
      if (daVila(S).length + v.filhos.length <= 0) { v.fim = S.t; Sm.chron(S, v.nome + ' ficou vazia.'); }
    }
    if (Lf()) Lf().onWelcome(S, made.filter((q) => age(S, q) >= 3));
    S.events.push({ k: 'narr', ev: 'andarilho', on: false });
    return true;
  };
  // um milagre diante de quem veio de lá: voltam a rezar para o Deus daqui
  So.onMilagre = function (S, kind, x, y) {
    const s = S.soc, v = s && s.vila;
    if (!v || v.fim || !v.deus || kind === 'raio') return;
    const g = grupoVila(S);
    if (!g) return;
    if (!Nr().entsOf(S, g.id).some((e) => Math.hypot(e.x - x, e.y - y) <= 9)) return;
    const old = v.deus;
    v.deus = ''; v.laco = U.clamp(v.laco + 15, -100, 100);
    if (Gd().gain) Gd().gain(S, 10);
    vhist(S, 'Viram um milagre de ' + D(S) + ' e voltaram a rezar para ele.');
    Sim().chron(S, 'Quem veio de ' + v.nome + ' viu o milagre com os próprios olhos. Lá, ' + old + ' foi esquecido: voltaram a rezar para ' + D(S) + '.');
  };
  // de madrugada, quem está de mal com a aldeia vem buscar comida
  function saque(S) {
    const s = S.soc, v = s.vila, Sm = Sim(), st = S.stock;
    if (!v || !v.saque || S.t < v.saque) return;
    delete v.saque;
    if (rest(S) || v.fim) return;
    const ks = ['frutas', 'peixe', 'carne', 'seca', 'defumado', 'milho', 'feijao'];
    let total = 0;
    for (const k of ks) total += st[k] || 0;
    let quer = Math.min(25, Math.floor(total * 0.15));
    if (S.buildings.some((b) => b.type === 'armazem' && b.built)) quer = Math.floor(quer / 2);
    let got = 0;
    for (const k of ks) while (quer > 0 && st[k] > 0) { st[k]--; quer--; got++; }
    v.laco = U.clamp(v.laco - 8, -100, 100);
    S.stats.brigasVila++;
    if (!got) return;
    for (const q of S.people) if (here(q) && age(S, q) >= 12) Sm.addMem(S, q, 'saqueado');
    const txt = 'De madrugada, gente de ' + v.nome + ' levou ' + got + ' porções do estoque.';
    if (S.stats.brigasVila === 1) Sm.chron(S, txt + ' Um presente acalma; o trovão assusta.'); else Sm.toast(S, txt, 'bad');
    vhist(S, 'Buscaram comida na aldeia, de madrugada.');
    ev(S, { ev: 'saque', x: S.camp.x, y: S.camp.y });
  }
  // o que o jogador pode fazer com a vila de fora: mandar um presente (comida) ou trovejar sobre ela
  So.presenteWhy = function (S) {
    const v = S.soc.vila;
    if (!v || v.fim) return 'Não há vila de fora';
    if (v.presente > S.t) return 'O último presente ainda está fresco';
    let total = 0;
    for (const k of ['frutas', 'peixe', 'carne', 'seca', 'defumado', 'milho', 'feijao']) total += S.stock[k] || 0;
    return total < C.VILA_PRESENTE * 2 ? 'Falta comida: precisa de ' + C.VILA_PRESENTE * 2 + ' porções no estoque' : '';
  };
  So.presente = function (S) {
    const why = So.presenteWhy(S), v = S.soc.vila, st = S.stock;
    if (why) return { ok: false, msg: why };
    let quer = C.VILA_PRESENTE;
    for (const k of ['seca', 'defumado', 'frutas', 'peixe', 'carne', 'milho', 'feijao']) while (quer > 0 && st[k] > 0) { st[k]--; quer--; }
    v.laco = U.clamp(v.laco + 15, -100, 100); v.bem = Math.min(100, v.bem + 8); v.presente = S.t + 10 * DAY;
    Gd().align(S, 1);
    vhist(S, 'A aldeia mandou comida de presente.');
    Sim().toast(S, 'O povo levou ' + C.VILA_PRESENTE + ' porções de presente a ' + v.nome + '.', 'good');
    return { ok: true, msg: 'Presente entregue.' };
  };
  So.trovejarWhy = function (S) {
    const v = S.soc.vila;
    if (!v || v.fim) return 'Não há vila de fora';
    return S.god.poder < C.VILA_TROVAO ? 'Falta Poder: precisa de ' + C.VILA_TROVAO + '.' : '';
  };
  So.trovejar = function (S) {
    const why = So.trovejarWhy(S), v = S.soc.vila;
    if (why) return { ok: false, msg: why };
    S.god.poder -= C.VILA_TROVAO;
    v.laco = U.clamp(v.laco - 10, -100, 100); v.medo = S.t + YEAR; delete v.saque;
    Gd().align(S, -5);
    if (!v.longe) S.events.push({ k: 'bolt', x: v.x, y: v.y - 1 });
    vhist(S, 'Um raio caiu ao lado da vila. Ficaram com medo.');
    Sim().toast(S, 'O trovão caiu ao lado de ' + v.nome + '. Por um ano, ninguém de lá vem buscar nada.', 'warn');
    return { ok: true, msg: 'Eles entenderam.' };
  };
  So.vilaInfo = function (S) {
    const s = S.soc, v = s && s.vila;
    if (!v) return null;
    const gente = daVila(S);
    const laco = v.laco >= 40 ? 'de bem' : v.laco >= 10 ? 'em paz' : v.laco > -25 ? 'distante' : 'de mal';
    return { nome: v.nome, fim: v.fim || 0, x: v.x, y: v.y, longe: !!v.longe, pop: gente.length + v.filhos.length, adultos: gente.filter((q) => age(S, q) >= 18).length, nascidos: v.filhos.length,
      desde: v.t0, bem: Math.round(v.bem), laco: Math.round(v.laco), lacoTxt: laco, deus: v.deus || '', motivo: motivoTxt(S, v.motivo), cab: v.cab, hist: v.hist.slice().reverse(),
      gente: gente.map((q) => ({ id: q.id, name: q.name, age: age(S, q), sex: q.sex })), medo: v.medo > S.t };
  };

  // ---------- o que cada um quer fazer (para a IA) ----------
  So.want = function (S, p) {
    const s = S.soc;
    if (!s || rest(S)) return null;
    if (p.exilio && S.t >= p.exilio.t) return { k: 'exilio', score: 97 };
    const d = s.diss;
    if (d && d.st === 'indo' && S.t >= d.sai && !d.longe && (d.ids.indexOf(p.id) >= 0 || d.kids.indexOf(p.id) >= 0)) return { k: 'partir', score: 96 };
    const J = s.julg;
    if (J && J.day === S.ck.day && J.part.indexOf(p.id) >= 0) return { k: 'julgar', score: p.id === J.acc ? 95 : 86 };
    const pl = p.plano;
    if (pl) {
      if (S.t > pl.ate) { delete p.plano; return null; }
      if (!pl.noite || S.ctx.night) return { k: 'crime', score: 82 };
    }
    return null;
  };
  // o lugar e o tempo de cada tarefa. alvo: vai até uma pessoa; fimOk: acabar no meio não é falha
  So.task = function (S, p, k) {
    const s = S.soc, Sm = Sim();
    if (!s || rest(S)) return null;
    if (k === 'julgar') {
      const J = s.julg, f = J && Sm.building(S, J.fire);
      if (!f || J.part.indexOf(p.id) < 0) return null;
      return { k, jid: J.cid, x: f.x + 0.5, y: f.y + 0.5, r0: 1.2, r1: 4.4, min: 1e9, far: 260, walk: 180, fimOk: 1 };
    }
    if (k === 'exilio') {
      if (!p.exilio) return null;
      const d = destinoFora(S);
      return { k, x: d.x, y: d.y, r0: 0, r1: 4.5, min: 5, far: 900, walk: 1500 };
    }
    if (k === 'partir') {
      const d = s.diss;
      if (!d || d.st !== 'indo' || !d.dest) return null;
      return { k, x: d.dest.x, y: d.dest.y, r0: 0, r1: 5, min: 1e9, far: 900, walk: 1800, fimOk: 1 };
    }
    if (k === 'crime') {
      const pl = p.plano;
      if (!pl) return null;
      const cx = S.camp.x + 1, cy = S.camp.y + 1;
      if (pl.k === 'comida' || pl.k === 'furto') return { k, x: cx, y: cy, r0: 0, r1: 2.3, min: pl.k === 'furto' ? 8 : 5, far: 200, walk: 300 };
      if (pl.k === 'folga') {
        const a = hsh(S, p.id, S.ck.day) * Math.PI * 2, r = 9 + hsh(S, p.id + 3, S.ck.day) * 4;
        return { k, x: cx + 0.5 + Math.cos(a) * r, y: cy + 0.5 + Math.sin(a) * r, r0: 0, r1: 3.5, min: 150, far: 200, walk: 240 };
      }
      if (pl.k === 'fogo') {
        const b = Sm.building(S, pl.bid);
        if (!b || !b.built || b.fogo) { delete p.plano; return null; }
        return { k, x: b.x + b.w / 2, y: b.y + b.h / 2, r0: 0.9, r1: 2.8, min: 8, far: 200, walk: 300 };
      }
      const v = person(S, pl.vic);
      if (!v || !here(v)) { delete p.plano; return null; }
      if (v.inTent) return null;
      return { k, alvo: v.id, min: pl.k === 'surra' ? 4 : 5, far: 160, walk: 240 };
    }
    return null;
  };
  So.valid = function (S, p, a) {
    const s = S.soc, t = a.m;
    if (!s || !t || rest(S)) return false;
    if (t.k === 'julgar') return !!(s.julg && s.julg.cid === t.jid);
    if (t.k === 'exilio') return !!p.exilio;
    if (t.k === 'partir') return !!(s.diss && s.diss.st === 'indo');
    if (t.k === 'crime') {
      const pl = p.plano;
      if (!pl) return false;
      if (pl.vic) { const v = person(S, pl.vic); return !!v && here(v) && !v.inTent; }
      return true;
    }
    return false;
  };
  So.arrive = function (S, p, a) {
    const s = S.soc, t = a.m;
    if (t.k === 'julgar' && s.julg) s.julg.foi[p.id] = 1;
    else if (t.k === 'partir' && s.diss) s.diss.chegou[p.id] = 1;
    else if (t.k === 'crime' && p.plano && p.plano.k === 'folga') Sim().say(S, p, pk(['Ninguém vai dar falta…', 'Só um pouquinho.', 'Que trabalhem os outros.'], p.id + S.ck.day), false);
  };
  So.stay = function () {};
  So.done = function (S, p, a) {
    const t = a.m;
    if (t.k === 'crime') cometer(S, p);
    else if (t.k === 'exilio') partiu(S, p);
  };
  // largou: noWay = não achou caminho; fail = desistiu no meio (longe demais, preso). Uma urgência (sede, fome) não conta
  So.drop = function (S, p, a, noWay, fail) {
    const s = S.soc, t = a.m;
    if (!s) return;
    const k = t ? t.k : a.hint;
    if (k === 'crime') { if (noWay && p.plano && !p.plano.vic) delete p.plano; }
    else if (k === 'exilio' && (noWay || fail) && p.exilio) { p.exilio.fail = (p.exilio.fail || 0) + 1; if (p.exilio.fail >= 2 && p.alive) partiu(S, p); }
    else if (k === 'partir' && (noWay || fail) && s.diss) s.diss.chegou[p.id] = 1;
  };
  const CRIME_INDO = { comida: 'Indo pegar comida escondido', furto: 'Indo roubar do estoque', folga: 'Fugindo do trabalho', fogo: 'Indo pôr fogo numa obra', surra: 'Indo tirar satisfação', ferir: 'Indo atrás de alguém, com raiva', matar: 'Indo atrás de alguém, com raiva' };
  const CRIME_LA = { comida: 'Pegando comida a mais', furto: 'Roubando do estoque', folga: 'Escondido, sem fazer nada', fogo: 'Pondo fogo', surra: 'Batendo', ferir: 'Ferindo de propósito', matar: 'Matando' };
  So.describe = function (S, p, a) {
    const t = a.m, st = a.stage, s = S.soc;
    if (!t) return 'Pensando no que fazer';
    switch (t.k) {
      case 'julgar': { const J = s.julg, acc = J ? person(S, J.acc) : null;
        if (J && p.id === J.acc) return st === 'go' ? 'Indo para o próprio julgamento' : 'Sendo julgad' + oa(p) + ' ao pé do fogo';
        return st === 'go' ? 'Indo para o julgamento' : 'No julgamento' + (acc ? ' de ' + acc.name : ''); }
      case 'exilio': return 'Indo embora da aldeia';
      case 'partir': return st === 'go' ? 'Indo embora com o grupo' : 'Esperando os outros no lugar novo';
      case 'crime': { const k = p.plano ? p.plano.k : 'folga'; return st === 'go' ? CRIME_INDO[k] : CRIME_LA[k]; }
    }
    return 'Pensando no que fazer';
  };
  // quem cumpre pena trabalha mais (e não vai à festa); quem adoeceu de castigo, menos
  So.workMult = (S, p) => (p.pena ? C.PENA_WORK : 1) * (p.doente > S.t ? 0.6 : 1);
  So.semLazer = (S, p) => !!p.pena;

  // ---------- o que espera a resposta do jogador ----------
  So.pending = (S) => (S.soc && S.soc.pend && S.soc.pend[0]) || null;
  So.pendInfo = function (S) {
    const q = So.pending(S), s = S.soc;
    if (!q) return null;
    if (q.k === 'diss') { const d = So.dissInfo(S); return d && d.st === 'aviso' ? Object.assign({ k: 'diss' }, d) : null; }
    if (q.k === 'inocente') {
      const c = s.crimes.find((x) => x.id === q.cid), p = person(S, q.pid);
      if (!c || !p || !c.injusto) return null;
      return { k: 'inocente', cid: c.id, nome: p.name, sx: p.sex, crime: crimeTxt(c), autor: c.byN, custo: C.REVELAR_CUSTO, pode: !So.revelarWhy(S, c) };
    }
    return null;
  };
  // r: para o aviso de quem vai embora, 'ir' | 'milagre' | 'promessa'; para o inocente, 'revelar' | 'deixar'
  So.pendResp = function (S, r) {
    const q = So.pending(S), s = S.soc;
    if (!q) return { ok: false, msg: '' };
    if (q.k === 'diss') return So.dissResp(S, r);
    s.pend.shift();
    if (q.k === 'inocente' && r === 'revelar') return So.revelar(S, q.cid);
    return { ok: true, msg: '' };
  };
  // limpa o que já não vale (a pessoa morreu, o prazo passou)
  function pendLimpa(S) {
    const s = S.soc;
    if (!s.pend.length) return;
    s.pend = s.pend.filter((q) => {
      if (q.k === 'diss') return !!(s.diss && s.diss.st === 'aviso');
      if (q.k === 'inocente') { const c = s.crimes.find((x) => x.id === q.cid), p = person(S, q.pid); return !!(c && c.injusto && p && here(p) && p.exilio && p.exilio.t > S.t); }
      return false;
    });
  }

  // ---------- o relógio ----------
  // a cada passo, só enquanto há julgamento, fogo ou gente indo embora
  So.tick = function (S) {
    const s = S.soc;
    if (!s) return;
    if (s.julg) julgTick(S);
    if (s.arde) fogos(S);
    if (s.diss && s.diss.st === 'indo') dissTick(S);
  };
  So.busy = (S) => !!(S.soc && (S.soc.julg || S.soc.arde || (S.soc.diss && S.soc.diss.st === 'indo')));
  // o ladrão e o incendiário acordam de madrugada (se não estão cansados demais)
  function madrugada(S) {
    for (const p of S.people) {
      if (!here(p) || !p.plano || !p.plano.noite || !p.sleeping || p.needs.energia < 45) continue;
      G.AI.abort(S, p);
      p.fail.dormir = S.t + 90; p.nextEval = S.t;
    }
  }
  So.hourly = function (S) {
    const s = S.soc;
    if (!s || rest(S)) return;
    const h = hourOf(S);
    if (!s.arde && S.buildings.some((b) => b.fogo)) s.arde = 1;
    pendLimpa(S);
    tentar(S);
    if (h === C.JULG_H) chamar(S);
    if (h === 18 && !So.lider(S)) eleger(S);
    if (h === 7) planejarObra(S);
    if (h >= 23 || h <= 2) madrugada(S);
    saque(S);
    const d = s.diss;
    if (d && d.st === 'aviso' && S.t >= d.prazo) irEmbora(S, 0);      // sem resposta, vão
    // a visita da vila de fora se despede
    const g = grupoVila(S);
    if (g && g.sai && S.t >= g.sai) { delete g.sai; Nr().sendAway(S, g.id); }
  };
  So.daily = function (S) {
    const s = S.soc, F = Fam();
    if (!s) return;
    for (const p of S.people) if (!p.indole) p.indole = natural(S, p);
    vilaDia(S);
    if (rest(S)) return;
    s.semCama = F.bedsNeeded(S) > F.bedsTotal(S) || semTeto(S) > 0 ? s.semCama + 1 : 0;
    // 0.16: no modo "só eu marco", ninguém marca a casa por você: o aviso lembra (no 2º dia e depois a cada 5)
    if (s.modo === 'eu' && s.semCama >= 2 && (s.semCama - 2) % 5 === 0 && !S.buildings.some((b) => b.type === 'barraca' && !b.built)) {
      const n = S.people.filter((p) => here(p) && F.bedUnits(S, p) && !S.buildings.some((b) => b.built && b.beds && b.beds.indexOf(p.id) >= 0)).length;
      if (n) Sim().toast(S, (n === 1 ? 'Uma pessoa dorme' : n + ' pessoas dormem') + ' ao relento. Marque uma casa em Construir, ou deixe o povo decidir as obras em Povo.', 'warn');
    }
    s.rot = +(s.rot * 0.7 + (S.stats.rottedToday || 0) * 0.3).toFixed(2);
    s.semPedra = S.stock.pedra < C.SOC_PEDRA ? s.semPedra + 1 : 0;
    if (s.cinzas.length) s.cinzas = s.cinzas.filter((c) => S.t - c.t < 20 * DAY);
    driftDia(S);
    descDia(S);
    penas(S);
    esfriar(S);
    promessaDia(S);
    juntar(S);
    centroDia(S);
    if (S.ck.dos === 1 && S.ck.season === 0) eleger(S);       // todo começo de ano o povo confere se a voz ainda é a mesma
  };
  // a morte de alguém: o líder, o acusado, quem ia embora
  So.onDeath = function (S, p) {
    const s = S.soc;
    if (!s) return;
    if (s.lider === p.id) { s.lider = 0; s.liderVago = S.t; }
    delete p.plano; delete p.pena; delete p.exilio;
    if (s.julg && s.julg.acc === p.id) fimJulg(S, null);
    if (s.diss) {
      const d = s.diss;
      d.ids = d.ids.filter((id) => id !== p.id); d.kids = d.kids.filter((id) => id !== p.id);
      if (d.ids.length < 2) { s.diss = null; s.pend = s.pend.filter((x) => x.k !== 'diss'); }
    }
    if (p.mortoPor) for (const q of S.people) if (here(q) && age(S, q) >= 16) addDesc(S, q, 6, 'medo');
  };

  // ---------- save ----------
  So.pack = function (S) {
    const s = S.soc, out = Object.assign({}, s);
    out.julg = null;
    out.fora = s.fora.map((p) => {
      const q = {};
      for (const k in p) if (['path', 'pathI', 'act', 'px', 'py', 'stuck', 'fail', 'seenTile', 'talk', 'visiting', 'host', 'say', 'sayKind'].indexOf(k) < 0) q[k] = p[k];
      return q;
    });
    return out;
  };

  // ---------- missões ----------
  So.missions = function (phase) {
    if (phase === 3) return [{ id: 's_lider', text: 'Veja o povo escolher quem fala por todos', opt: true, reward: 6, done: false }];
    if (phase === 4) return [
      { id: 's_julg', text: 'Veja um julgamento ao pé do fogo', opt: true, reward: 6, done: false },
      { id: 's_medida', text: 'Castigue alguém na medida certa', opt: true, reward: 8, done: false },
      { id: 's_perdao', text: 'Perdoe alguém diante de todos', opt: true, reward: 6, done: false },
      { id: 's_obra', text: 'Deixe o povo marcar uma obra por conta própria', opt: true, reward: 6, done: false }];
    return [];
  };
  So.goalTest = {
    s_lider: (S) => (S.stats.lideres || 0) > 0,
    s_julg: (S) => (S.stats.julgamentos || 0) > 0,
    s_medida: (S) => (S.stats.castigosJustos || 0) > 0,
    s_perdao: (S) => (S.stats.perdoes || 0) > 0,
    s_obra: (S) => (S.stats.obrasPovo || 0) > 0,
  };

  // ---------- para a interface ----------
  // os crimes, do mais novo para o mais velho, com o que o povo sabe e o que só Deus sabe
  So.crimesInfo = function (S) {
    const s = S.soc;
    if (!s) return [];
    return s.crimes.slice().sort((a, b) => b.t - a.t).map((c) => {
      const autor = person(S, c.by), cond = c.cond ? person(S, c.cond) : null, sus = c.sus ? person(S, c.sus) : null;
      const aqui = !!(autor && here(autor));
      let povo;
      if (c.st === 'julgado') povo = (cond ? cond.name : c.byN) + ': ' + (c.pena === 'bronca' ? 'levou uma bronca' : c.pena === 'exilio' ? 'exílio' : c.dias + ' dias de trabalho' + (c.cumprida ? ' (cumpridos)' : '')) + (c.injusto ? ' · inocente!' : '');
      else if (c.st === 'absolvido') povo = 'O povo não achou culpa';
      else if (c.st === 'perdoado') povo = 'Perdoado por Deus';
      else if (c.st === 'castigado') povo = 'Castigado por Deus';
      else if (c.st === 'frio') povo = c.known ? 'Ficou por isso mesmo' : 'O povo nunca soube';
      else if (c.st === 'fechado') povo = 'Quem fez não está mais aqui';
      else povo = c.known ? 'O povo sabe: vai a julgamento' : c.dano ? (sus ? 'Ninguém viu. Desconfiam de ' + sus.name : 'O povo notou, mas não sabe quem foi') : 'Ninguém viu. Só você';
      return { id: c.id, k: c.k, g: c.g, grav: So.GRAV[c.g], nome: CRIME[c.k].nome, by: c.by, byN: c.byN, txt: c.byN + ' ' + crimeTxt(c), quando: Sim().dateText(c.t), t: c.t, st: c.st, known: !!c.known, dano: !!c.dano,
        soVoce: !c.known, injusto: !!c.injusto, cond: cond ? cond.name : '', sus: sus && !c.known ? sus.name : '', povo, deus: c.deus || 0, deusM: c.deusM || '', aqui, vic: c.vicN || '',
        podeCastigar: aqui && !c.deus, podePerdoar: !So.perdaoWhy(S, c), podeRevelar: !So.revelarWhy(S, c), aberto: aberto(c) };
    });
  };
  // a pessoa, para o painel
  So.pessoaInfo = function (S, p) {
    const I = ind(S, p), c = S.soc ? So.crimeDe(S, p) : null;
    return { indole: { g: Math.round(I.g), m: Math.round(I.m), f: Math.round(I.f) }, rot: So.rotulos(S, p), pq: So.AX.map((k) => So.porque(p, k)), desc: Math.round(p.desc || 0),
      descPq: p.descWhy ? Object.keys(p.descWhy).sort((a, b) => p.descWhy[b] - p.descWhy[a])[0] || '' : '', pena: p.pena ? { dias: Math.max(0, Math.ceil((p.pena.ate - S.t) / DAY)) } : null,
      marca: p.marca > S.t, doente: p.doente > S.t, exilio: !!p.exilio, lider: !!(S.soc && S.soc.lider === p.id), ficha: Math.floor(p.ficha || 0),
      crime: c ? { id: c.id, g: c.g, grav: So.GRAV[c.g], txt: crimeTxt(c), faixa: So.medida(S, p, 1).fx } : null };
  };
  // quem foi embora, para o painel
  So.foraTxt = function (S, p) {
    const v = S.soc ? S.soc.vila : null, w = p.away ? p.away.why : '';
    if (p.morto) return 'Morreu longe daqui' + (v ? ', em ' + v.nome : '');
    const onde = p.away && p.away.vila && v && !v.fim ? '. Vive em ' + v.nome : '';
    return (w === 'exilio' ? 'Foi mandad' + oa(p) + ' embora' : w === 'casou' ? 'Foi morar fora: casou' : 'Foi embora com o grupo') + onde;
  };
  So.pedidosInfo = function (S) {
    const s = S.soc;
    if (!s) return [];
    return s.pedidos.map((q) => ({ id: q.id, type: q.type, nome: NOME_OBRA[q.type], why: So.FALTA[q.why], x: q.x, y: q.y, tiles: q.tiles || null, custo: custoDe(q), dias: Math.max(0, Math.ceil(C.PEDIDO_D - (S.t - q.t) / DAY)) }));
  };
})(globalThis.G = globalThis.G || {});
