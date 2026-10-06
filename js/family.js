/* Gods · família (Etapa 3): idades, laços, gravidez, parto, bebês no colo e parentesco. Sem DOM.
   Etapa 6: relações livres. Cada adulto pode ter até BONDS_MAX pares, de qualquer sexo (p.bonds = { id: afeto });
   filhos nascem de mulher com homem, que podem ser de pares diferentes. Nunca entre parentes próximos.
   A intimidade é abstraída: o par dorme junto na barraca e aparece um coração. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const F = G.Family = {};
  const YEAR = () => C.DAY_MIN * C.YEAR_DAYS;
  const Sim = () => G.Sim;

  // ---------- fases da vida ----------
  F.stageOfAge = (age) => (age < 3 ? 'bebe' : age < 12 ? 'crianca' : age < 18 ? 'jovem' : age < C.OLD_AGE ? 'adulto' : 'idoso');
  F.age = (S, p) => Math.floor((S.t - p.born) / YEAR());
  F.ageYears = (S, p) => (S.t - p.born) / YEAR();
  // Etapa 12: os povos envelhecem em ritmos diferentes. A idade do corpo: até os 18 é a de verdade; depois, os anos de
  // adulto se esticam até a velhice do povo (p.velho; nos humanos, 60: tudo como sempre). É ela que decide a fase da
  // vida, até quando se tem filho e par, e a velhice. Adulto é sempre quem tem 18 anos de verdade.
  F.bodyAge = (S, p) => { const a = F.age(S, p), old = p.velho; return !old || old === C.OLD_AGE || a <= 18 ? a : Math.floor(18 + (a - 18) * (C.OLD_AGE - 18) / (old - 18)); };
  F.stage = (S, p) => F.stageOfAge(F.bodyAge(S, p));
  const LABEL = {
    F: { bebe: 'bebê', crianca: 'criança', jovem: 'jovem', adulto: 'adulta', idoso: 'idosa' },
    M: { bebe: 'bebê', crianca: 'criança', jovem: 'jovem', adulto: 'adulto', idoso: 'idoso' },
  };
  F.stageLabel = (S, p) => LABEL[p.sex === 'F' ? 'F' : 'M'][F.stage(S, p)];
  F.isAdult = (S, p) => F.age(S, p) >= 18;

  // (0.12: índice por id, refeito quando entra gente; antes era uma busca na lista inteira a cada chamada)
  const byId = new WeakMap();
  function person(S, id) {
    if (!id) return null;
    const list = S.people;
    let m = byId.get(list);
    if (!m || m.n !== list.length) { m = new Map(); for (const q of list) m.set(q.id, q); m.n = list.length; byId.set(list, m); }
    return m.get(id) || null;
  }
  F.person = person;

  // quem trabalha em quê: criança só colhe frutas e busca água, a partir dos 7
  F.canWork = function (S, p, wk) {
    const st = F.stage(S, p);
    if (st === 'bebe' || p.labor || (p.rest && p.rest > S.t)) return false;   // resguardo depois do parto
    if (p.sangue && G.Povos && !G.Povos.canWork(p, wk)) return false;   // Etapa 12: elfo não derruba árvore, anão não pesca
    if (st === 'crianca') return F.age(S, p) >= C.CHILD_HELP_AGE && (wk === 'frutas' || wk === 'agua' || wk === 'criacao');   // Etapa 10: ovos e ração
    return true;
  };
  F.carrying = (S, p) => S.people.some((b) => b.alive && b.carriedBy === p.id);
  F.latePregnant = (S, p) => !!(p.preg && p.preg.due - S.t < C.LATE_PREG_DAYS * C.DAY_MIN);
  F.workFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'crianca' ? 0.5 : st === 'jovem' ? 0.75 : st === 'idoso' ? 0.8 : 1;
    if (F.carrying(S, p)) f *= 0.85;
    if (F.latePregnant(S, p)) f *= 0.7;
    return f;
  };
  F.walkFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'crianca' ? 0.9 : st === 'idoso' ? 0.85 : 1;
    if (F.latePregnant(S, p)) f *= 0.85;
    if (p.hurt && p.hurt.until > S.t) f *= p.hurt.walk;   // pé torcido
    if (p.sangue && G.Povos) f *= G.Povos.body(p).walk;   // Etapa 12: o passo de cada povo
    return f;
  };
  F.carryCap = (S, p) => Math.round((F.stage(S, p) === 'crianca' ? C.CARRY_CHILD : C.CARRY) * (G.Tech ? G.Tech.carryMult(S) : 1) * (p.sangue && G.Povos ? G.Povos.body(p).carry : 1));   // cestos: metade a mais; o anão carrega mais
  // aprender: jovem aprende mais rápido, e mais ainda perto de um idoso
  F.xpFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'jovem' ? 1.5 : st === 'crianca' ? 1.2 : 1;
    if ((st === 'jovem' || st === 'crianca') && S.people.some((q) => q.alive && q !== p && F.stage(S, q) === 'idoso' && Math.hypot(q.x - p.x, q.y - p.y) < 6)) f *= 1.25;
    if (G.Deus && G.Deus.saber(S, 'escrita')) f *= C.ESCRITA_XP;   // a escrita (Etapa 11): todos aprendem mais rápido
    if (S.povos && S.povos.mixed && G.Povos) f *= G.Povos.xp(S, p);   // Etapa 12: o versátil aprende com os outros povos
    return f;
  };
  F.nursing = (S, p) => p.sex === 'F' && S.people.some((b) => b.alive && b.mother === p.id && F.stage(S, b) === 'bebe' && b.carriedBy === p.id);
  // multiplicadores de necessidade por fase e estado
  F.needMult = function (S, p) {
    const st = F.stage(S, p);
    const m = { fome: 1, sede: 1, energia: 1, frio: 1 };
    if (st === 'crianca') { m.fome = 0.6; m.sede = 0.65; m.energia = 1.15; m.frio = 1.15; }
    else if (st === 'jovem') { m.fome = 0.85; m.sede = 0.9; }
    else if (st === 'idoso') { m.fome = 0.9; m.energia = 1.2; m.frio = 1.15; }
    if (p.preg) { m.fome *= C.PREGNANT_HUNGER; m.energia *= C.PREGNANT_ENERGY; }
    if (F.nursing(S, p)) { m.fome *= 1.15; m.sede *= 1.15; }
    if (p.sangue && G.Povos) { const b = G.Povos.body(p); m.fome *= b.fome; m.frio *= b.cold; }   // Etapa 12: o corpo de cada povo
    return m;
  };
  // bocas para o cálculo de "comida para N dias"
  F.mouths = function (S) {
    let n = 0;
    for (const p of S.people) {
      if (!p.alive) continue;
      if (F.stage(S, p) === 'bebe') { if (!F.nursing(S, person(S, p.carriedBy) || p)) n += 0.3; continue; }
      n += F.needMult(S, p).fome;
    }
    return Math.max(1, n);
  };
  // lugar na barraca: adulto e jovem 2, criança 1, bebê vai no colo
  F.bedUnits = function (S, p) { const st = F.stage(S, p); return st === 'bebe' ? 0 : st === 'crianca' ? 1 : 2; };
  // só os moradores (sem as visitas desta noite): é a conta para dar lugar fixo
  F.bedLoad = function (S, b) {
    let n = 0;
    for (const id of b.beds) { const q = person(S, id); if (q && q.alive) n += F.bedUnits(S, q); }
    return n;
  };
  // moradores e quem veio dormir com um par esta noite (a visita divide a cama do par: 1 lugar)
  F.tentLoad = function (S, b) {
    let n = F.bedLoad(S, b);
    if (b.guests) for (const id in b.guests) {
      if (b.guests[id] <= S.t) { delete b.guests[id]; continue; }
      const q = person(S, +id);
      if (q && q.alive && b.beds.indexOf(q.id) < 0) n += 1;
    }
    return n;
  };
  F.bedsNeeded = function (S) { let n = 0; for (const p of S.people) if (p.alive) n += F.bedUnits(S, p); return n; };
  F.bedsTotal = function (S) {
    let n = 0;
    for (const b of S.buildings) if (b.built && G.Sim.def(b).cap) n += G.Sim.def(b).cap;
    return n;
  };

  // ---------- parentesco ----------
  function ancestors(S, p, depth, out) {
    if (!p || depth <= 0) return out;
    for (const id of [p.mother, p.father]) {
      if (!id) continue;
      out.add(id);
      ancestors(S, person(S, id), depth - 1, out);
    }
    return out;
  }
  // próximo = um é ascendente do outro até avós, ou têm um ascendente em comum até avós (irmãos, tios, primos)
  F.closeKin = function (S, a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return true;
    const A = ancestors(S, a, 2, new Set([a.id])), B = ancestors(S, b, 2, new Set([b.id]));
    for (const x of A) if (B.has(x)) return true;
    return false;
  };
  F.childrenOf = (S, p) => S.people.filter((q) => q.mother === p.id || q.father === p.id);
  F.siblingsOf = (S, p) => S.people.filter((q) => q !== p && ((p.mother && q.mother === p.mother) || (p.father && q.father === p.father)));
  // ---------- laços ----------
  F.isPartner = (p, q) => !!(p && q && p.bonds && p.bonds[q.id] !== undefined);
  F.afeto = (p, q) => (F.isPartner(p, q) ? p.bonds[q.id] : 0);
  // pares vivos, do maior afeto para o menor
  F.partners = function (S, p) {
    const out = [];
    if (p.bonds) for (const id in p.bonds) { const q = person(S, +id); if (q && q.alive) out.push(q); }
    return out.sort((a, b) => p.bonds[b.id] - p.bonds[a.id] || a.id - b.id);
  };
  F.partnerOf = (S, p) => F.partners(S, p)[0] || null;   // o par de mais afeto
  // como p chama q
  F.relation = function (S, p, q) {
    const fem = q.sex === 'F';
    if (F.isPartner(p, q)) return fem ? 'companheira' : 'companheiro';
    if (p.mother === q.id) return 'mãe';
    if (p.father === q.id) return 'pai';
    if (q.mother === p.id || q.father === p.id) return fem ? 'filha' : 'filho';
    if ((p.mother && q.mother === p.mother) || (p.father && q.father === p.father)) return fem ? 'irmã' : 'irmão';
    const gp = [person(S, p.mother), person(S, p.father)];
    if (gp.some((x) => x && (x.mother === q.id || x.father === q.id))) return fem ? 'avó' : 'avô';
    const gc = F.childrenOf(S, p);
    if (gc.some((x) => x.id === q.mother || x.id === q.father)) return fem ? 'neta' : 'neto';
    return '';
  };
  F.family = function (S, p) {
    const out = [];
    for (const q of S.people) { if (q === p) continue; const r = F.relation(S, p, q); if (r) out.push({ q, r }); }
    return out;
  };

  // ---------- nomes e herança ----------
  F.pickName = function (S, sex, mom, dad) {
    const own = G.Povos && mom && dad ? G.Povos.babyName(S, sex, mom, dad) : null;   // Etapa 12: pai e mãe do mesmo povo de fora
    if (own) return own;
    const pool = sex === 'F' ? Sim().namePool.FEM : Sim().namePool.MASC;
    const used = new Set(S.people.filter((q) => q.alive).map((q) => q.name));
    const free = pool.filter((n) => !used.has(n));
    return S.rng.pick(free.length ? free : pool);
  };
  function inheritTraits(S, mom, dad) {
    const Sm = Sim(), out = [];
    const cands = [].concat(mom ? mom.traits : [], dad ? dad.traits : []);
    for (const t of cands) {
      if (out.length >= 2 || out.indexOf(t) >= 0) continue;
      if (Sm.traitClash(out, t)) continue;
      if (S.rng.chance(C.TRAIT_INHERIT)) out.push(t);
    }
    const extra = Sm.pickTraits(S.rng);
    for (const t of extra) { if (out.length >= 2) break; if (out.indexOf(t) < 0 && !Sm.traitClash(out, t)) out.push(t); }
    return out;
  }
  function inheritLook(S, mom, dad, sex) {
    const a = mom ? mom.look : null, b = dad ? dad.look : null;
    const base = Sim().makeLook(S.rng, sex);
    if (a && b) {
      const lo = Math.min(a.skin, b.skin), hi = Math.max(a.skin, b.skin);
      base.skin = S.rng.int(lo, hi);
      base.hair = S.rng.chance(0.5) ? a.hair : b.hair;
    }
    return base;
  }

  // ---------- pares ----------
  F.link = function (S, a, b, afeto) {
    (a.bonds || (a.bonds = {}))[b.id] = afeto;
    (b.bonds || (b.bonds = {}))[a.id] = afeto;
  };
  F.unlink = function (S, a, b) {
    if (a.bonds) delete a.bonds[b.id];
    if (b.bonds) delete b.bonds[a.id];
  };
  F.addAfeto = function (S, a, b, d) {
    if (!F.isPartner(a, b)) return;
    const v = U.clamp((a.bonds[b.id] || 0) + d, 0, 100);
    a.bonds[b.id] = v;
    if (b.bonds) b.bonds[a.id] = v;
  };
  F.onChat = function (S, p, q, extra) {
    if (F.isPartner(p, q)) F.addAfeto(S, p, q, C.AFETO_CHAT + (extra || 0));
  };
  // brigados não se aproximam até fazer as pazes
  F.feuding = (S, a, b) => !!((a.feud && a.feud[b.id] > S.t) || (b.feud && b.feud[a.id] > S.t));
  // pares de cada tipo: do outro sexo (até BONDS_MAX) e do mesmo sexo (até BONDS_SAME_MAX, à parte)
  const countKind = (S, p, same) => {
    let n = 0;
    if (p.bonds) for (const id in p.bonds) { const q = person(S, +id); if (q && q.alive && (q.sex === p.sex) === same) n++; }
    return n;
  };
  // quem ainda pode ter mais um par
  F.canBond = (S, p) => p.alive && !p.carriedBy && F.age(S, p) >= 18 && F.bodyAge(S, p) <= C.BOND_AGE_MAX;
  // novos pares: quem conversa muito, anda de bem com a vida e não é parente próximo.
  // Ter par não impede outro; só pesa um pouco (BOND_MORE por par do mesmo tipo que já tem).
  function formBonds(S) {
    // (0.12: as mesmas condições de sempre, as baratas primeiro; com 80 pessoas são três mil pares por dia)
    const free = S.people.filter((p) => F.canBond(S, p));
    // quantos pares de cada tipo cada um tem: contado uma vez e corrigido quando nasce um par novo
    const cnt = new Map();
    const kind = (p, same) => { const key = p.id * 2 + (same ? 1 : 0); let n = cnt.get(key); if (n === undefined) { n = countKind(S, p, same); cnt.set(key, n); } return n; };
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      const a = free[i], b = free[j];
      if (a.mood < 40 || b.mood < 40) continue;
      const talks = Math.min(a.rel[b.id] || 0, b.rel[a.id] || 0);
      if (talks < C.COUPLE_TALKS) continue;
      if (F.isPartner(a, b) || F.feuding(S, a, b)) continue;
      const same = a.sex === b.sex, max = same ? C.BONDS_SAME_MAX : C.BONDS_MAX;
      const na = kind(a, same), nb = kind(b, same);
      if (na >= max || nb >= max) continue;
      if (F.closeKin(S, a, b)) continue;
      let ch = C.COUPLE_DAILY * Math.pow(C.BOND_MORE, Math.min(2, na + nb));
      if (same) ch *= C.BOND_SAME_SEX;
      else {
        const w = a.sex === 'F' ? a : b;
        if (F.bodyAge(S, w) <= C.FERTILE_MAX && !F.partners(S, w).some((m) => m.sex === 'M')) ch *= C.BOND_FERTILE;   // quer ter filho
      }
      if (S.povos && S.povos.mixed && G.Povos) ch *= G.Povos.bondMult(S, a, b);   // Etapa 12: povos que se estranham se juntam menos
      if (!S.rng.chance(ch)) continue;
      F.link(S, a, b, 55);
      cnt.set(a.id * 2 + (same ? 1 : 0), na + 1); cnt.set(b.id * 2 + (same ? 1 : 0), nb + 1);
      if (S.povos && S.povos.mixed && G.Povos) G.Povos.onBond(S, a, b);
      S.stats.bonds = (S.stats.bonds || 0) + 1;
      Sim().chron(S, a.name + ' e ' + b.name + ' estão juntos.');
      if (G.Life) G.Life.onBond(S, a, b);
    }
  }
  // o afeto esfria sem conversa e sem noites juntos; chegou a zero, o par se desfaz em paz
  function coolBonds(S) {
    for (const p of S.people) {
      if (!p.alive || !p.bonds) continue;
      for (const q of F.partners(S, p)) {
        if (p.id > q.id) continue;   // cada par uma vez
        const d = C.AFETO_DECAY + (p.mood < 25 ? 0.5 : 0) + (q.mood < 25 ? 0.5 : 0);
        F.addAfeto(S, p, q, -d);
        if (F.afeto(p, q) > 0) continue;
        F.unlink(S, p, q);
        Sim().chron(S, p.name + ' e ' + q.name + ' se separaram, sem mágoa.');
      }
    }
  }

  // ---------- gravidez e parto ----------
  function youngestChildAge(S, w) {
    let best = Infinity;
    for (const q of S.people) if (q.alive && q.mother === w.id) best = Math.min(best, F.ageYears(S, q));
    return best;
  }
  // a noite de um dia resumido: cada um na sua casa, e quem tem par morando em outra dorme lá em parte das noites,
  // com os mesmos pesos da visita de verdade (AI: visitTent). Devolve pessoa → casa em que passou a noite.
  function restNight(S) {
    const Sm = Sim(), home = new Map(), load = new Map(), loc = new Map(), host = new Set();
    for (const b of S.buildings) {
      if (!b.built || !b.beds || !Sm.def(b).cap) continue;
      load.set(b.id, b.beds.length);
      for (const id of b.beds) home.set(id, b);
    }
    for (const p of S.people) if (p.alive && !p.carriedBy && home.has(p.id)) loc.set(p.id, home.get(p.id).id);
    for (const p of S.people) {
      if (!loc.has(p.id) || !p.bonds || p.labor || host.has(p.id) || F.age(S, p) < 18) continue;
      const h = home.get(p.id), opts = [];
      let stay = C.VISIT_HOME;
      for (const q of F.partners(S, p)) {
        if (q.carriedBy || F.age(S, q) < 18) continue;
        const af = F.afeto(p, q), qt = home.get(q.id);
        if (qt === h) { stay += af; continue; }
        if (!qt || loc.get(q.id) !== qt.id) continue;   // sem casa, ou foi dormir com outro par
        if (load.get(qt.id) + 1 > Sm.def(qt).cap + C.VISIT_SQUEEZE) continue;
        opts.push({ q, qt, w: af });
      }
      if (!opts.length) continue;
      let sum = stay;
      for (const o of opts) sum += o.w;
      let r = S.rng.next() * sum - stay;
      if (r < 0) continue;
      for (const o of opts) {
        r -= o.w;
        if (r > 0) continue;
        loc.set(p.id, o.qt.id); load.set(o.qt.id, load.get(o.qt.id) + 1); load.set(h.id, load.get(h.id) - 1);
        host.add(o.q.id);   // quem recebe fica em casa esta noite
        break;
      }
    }
    return loc;
  }
  // uma vez por noite: pares que dormem na mesma barraca (moradores ou visita), afeto alto e o corpo em dia
  function nightTogether(S) {
    const hearts = new Set();
    let said = false;
    // dia resumido (jogo fechado, offline.js): ninguém anda; quem dorme com quem sai do mesmo sorteio da noite de visita
    const rest = !!S.resumido, loc = rest ? restNight(S) : null;
    for (const w of S.people) {
      if (!w.alive || !w.bonds || (rest ? !loc.has(w.id) : !w.sleeping || !w.inTent)) continue;
      const here = rest ? F.partners(S, w).filter((q) => loc.get(q.id) === loc.get(w.id))
        : F.partners(S, w).filter((q) => q.sleeping && q.inTent === w.inTent);
      if (!here.length) continue;
      for (const q of here) {
        if (w.id < q.id) F.addAfeto(S, w, q, C.AFETO_NIGHT);   // cada par uma vez
        if (rest) continue;
        if (F.afeto(w, q) >= C.AFETO_MIN && !hearts.has(w.inTent)) {
          hearts.add(w.inTent);
          const tb = Sim().building(S, w.inTent);
          if (tb) S.events.push({ k: 'heart', x: tb.x + 1, y: tb.y });
          // tom adulto (0.12): a noite do par é dita sem rodeio, uma vez por noite no máximo (os dois com 18 ou mais)
          if (tb && !said && F.adulto(S) && !S.safe && grown(S, w) && grown(S, q) && !F.closeKin(S, w, q) && S.rng.chance(0.2)) {
            said = true;
            S.stats.sexo = (S.stats.sexo || 0) + 1;
            Sim().toast(S, S.rng.pick([w.name + ' e ' + q.name + ' transaram ' + houseName(S, tb) + ' esta noite.', 'Noite de sexo ' + houseName(S, tb) + ': ' + w.name + ' e ' + q.name + '.', w.name + ' e ' + q.name + ' fizeram amor ' + houseName(S, tb) + ' até tarde.']), 'amor');
          }
        }
      }
      // gravidez: mulher com um par homem, adultos, sem parentesco próximo
      if (w.sex !== 'F' || w.preg || w.labor) continue;
      const aw = F.age(S, w);
      if (aw < 18 || F.bodyAge(S, w) > C.FERTILE_MAX) continue;
      const men = here.filter((m) => m.sex === 'M' && F.age(S, m) >= 18 && F.afeto(w, m) >= C.AFETO_MIN && !F.closeKin(S, w, m));
      if (!men.length) continue;
      if (youngestChildAge(S, w) < C.BIRTH_SPACING_Y) continue;
      const n = w.needs;
      if (n.fome < 30 || n.saude < 50 || n.calor < 40) continue;
      // com mais de um par na barraca, o de mais afeto tem mais chance
      let sum = 0;
      for (const m of men) sum += F.afeto(w, m);
      let r = S.rng.next() * sum, m = men[0];
      for (const x of men) { r -= F.afeto(w, x); if (r <= 0) { m = x; break; } }
      if (S.rng.next() < C.CONCEIVE_NIGHT * (F.afeto(w, m) / 100) * (G.Deus && G.Deus.dom(S, 'ventre') ? C.DOM.ventreConceive : 1) * ((w.sangue || m.sangue) && G.Povos ? G.Povos.fert(w, m) : 1)) {
        w.preg = { t0: S.t, due: S.t + Math.round(C.PREGNANCY_Y * YEAR()), father: m.id, known: false };
      }
    }
  }
  // ---------- noites picantes (0.10, pedido do jogador) ----------
  // Só entre adultos (18 anos ou mais), sem parentesco próximo entre ninguém do grupo e sem briga; tudo insinuado,
  // nunca descrito. Desliga no menu (S.opts.picante === false) e não acontece com o jogo fechado.
  // 0.12: o tom do mundo, escolhido no menu. 0 leve (sem noites picantes), 1 picante (insinuado, o padrão), 2 adulto
  // (+18: sexo entre adultos dito sem rodeio e briga com palavrão; nada é descrito nem desenhado). Em qualquer tom,
  // só gente de 18 anos ou mais, sem parentesco próximo. Saves antigos: picante === false é o tom leve.
  F.tom = (S) => { const o = (S && S.opts) || {}; return o.tom ? (o.tom === 'adulto' ? 2 : o.tom === 'leve' ? 0 : 1) : o.picante === false ? 0 : 1; };
  F.adulto = (S) => F.tom(S) === 2;
  const spicy = (S) => F.tom(S) >= 1 && !S.safe;
  F.spicy = spicy;
  const grown = (S, p) => !!(p && p.alive && !p.carriedBy && F.age(S, p) >= 18);
  function clean(S, list) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (F.closeKin(S, list[i], list[j]) || F.feuding(S, list[i], list[j])) return false;
    }
    return true;
  }
  function closer(S, list, afeto) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const x = list[i], y = list[j];
      if (F.isPartner(x, y)) F.addAfeto(S, x, y, afeto);
      x.rel[y.id] = (x.rel[y.id] || 0) + 1; y.rel[x.id] = (y.rel[x.id] || 0) + 1;
    }
  }
  const houseName = (S, b) => { const d = b ? Sim().def(b) : null; return d ? (d.a === 'o' ? 'no ' : 'na ') + d.name.toLowerCase() : 'na barraca'; };
  // noite a três: alguém com dois pares dormindo na mesma casa, e os dois se dão (conversam ou também são par)
  function threesome(S) {
    const byTent = new Map();
    for (const p of S.people) if (grown(S, p) && p.sleeping && p.inTent && p.mood >= 45) { const l = byTent.get(p.inTent) || []; l.push(p); byTent.set(p.inTent, l); }
    for (const [tid, list] of byTent) {
      if (list.length < 3) continue;
      for (const a of list) {
        const ps = list.filter((q) => q !== a && F.isPartner(a, q) && F.afeto(a, q) >= C.AFETO_MIN);
        if (ps.length < 2) continue;
        const ok = [];
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
          const b = ps[i], c = ps[j];
          const know = F.isPartner(b, c) || Math.min(b.rel[c.id] || 0, c.rel[b.id] || 0) >= C.TRIO_TALKS;
          if (know && clean(S, [a, b, c])) ok.push([b, c]);
        }
        if (!ok.length || !S.rng.chance(C.TRIO_NIGHT)) continue;
        const [b, c] = ok[S.rng.int(0, ok.length - 1)];
        trio(S, tid, [a, b, c]);
        break;   // uma por casa por noite
      }
    }
  }
  function trio(S, tid, three) {
    const Sm = Sim(), st = S.stats;
    st.trios = (st.trios || 0) + 1;
    closer(S, three, 3);
    for (const q of three) Sm.addMem(S, q, 'noiteTres');
    const tb = Sm.building(S, tid), names = Sm.listNames(three), where = houseName(S, tb);
    if (tb) S.events.push({ k: 'heart', x: tb.x + 1, y: tb.y, many: 3 });
    const ad = F.adulto(S);
    if (st.trios === 1) Sm.chron(S, ad ? 'A primeira noite a três do povo: ' + names + ' transaram juntos ' + where + ', e de manhã ninguém fingiu que foi sem querer.' :
      'A primeira noite a três do povo: ' + names + ' passaram a noite juntos ' + where + ', e dormir foi o de menos.');
    else if (S.rng.chance(0.35)) Sm.toast(S, S.rng.pick(ad ? ['Sexo a três ' + where + ': ' + names + '.', names + ' transaram juntos ' + where + ' esta noite.', 'De novo os três na mesma cama ' + where + ': ' + names + '. O povo já nem estranha.'] :
      ['Noite animada ' + where + ': ' + names + '.', names + ' dividiram a mesma cama ' + where + ' esta noite.', 'De novo a três ' + where + ': ' + names + '. O povo já nem estranha.']), 'amor');
  }
  // depois da festa: um grupo de adultos ligados por pares (cada um tem par no grupo) estica a noite junto
  F.afterParty = function (S, ps) {
    if (!spicy(S)) return null;
    const adults = ps.filter((q) => grown(S, q) && F.bodyAge(S, q) <= C.BOND_AGE_MAX && q.mood >= 50 && !q.labor && F.partners(S, q).length);
    if (adults.length < C.PARTY_MANY_MIN) return null;
    let best = [];
    for (const seed of adults) {
      const g = [seed];
      for (let grew = true; grew && g.length < C.PARTY_MANY_MAX;) {
        grew = false;
        for (const q of adults) {
          if (g.length >= C.PARTY_MANY_MAX || g.indexOf(q) >= 0) continue;
          if (!g.some((m) => F.isPartner(m, q) && F.afeto(m, q) >= C.AFETO_MIN)) continue;
          if (!clean(S, g.concat([q]))) continue;
          g.push(q); grew = true;
        }
      }
      if (g.length > best.length) best = g;
    }
    if (best.length < C.PARTY_MANY_MIN || !S.rng.chance(C.PARTY_MANY)) return null;
    const Sm = Sim(), st = S.stats;
    st.manyNights = (st.manyNights || 0) + 1;
    closer(S, best, 2);
    for (const q of best) Sm.addMem(S, q, 'noiteMuitos');
    // a casa de quem tem mais lugar
    let home = null;
    for (const q of best) {
      const b = S.buildings.find((x) => x.built && x.beds && x.beds.indexOf(q.id) >= 0);
      if (b && (!home || (Sm.def(b).cap || 0) > (Sm.def(home).cap || 0))) home = b;
    }
    if (home) S.events.push({ k: 'heart', x: home.x + 1, y: home.y, many: best.length });
    const names = Sm.listNames(best), where = home ? houseName(S, home) : 'na barraca maior';
    const ad = F.adulto(S);
    if (st.manyNights === 1) Sm.chron(S, ad ? 'Depois da festa, ' + names + ' não foram cada um para a sua casa: a festa acabou em sexo ' + where + ', todos com todos. Foi a primeira noite de muitos do povo; no dia seguinte ninguém tocou no assunto, mas todo mundo sorria.' :
      'Depois da festa, ' + names + ' não foram cada um para a sua casa: a festa continuou ' + where + '. Foi a primeira noite de muitos do povo; no dia seguinte ninguém tocou no assunto, mas todo mundo sorria.');
    else if (S.rng.chance(0.5)) Sm.toast(S, ad ? 'A festa acabou em sexo ' + where + ': ' + names + '.' : 'A festa continuou ' + where + ': ' + names + ' esticaram a noite juntos.', 'amor');
    return best;
  };

  function pregnancyHour(S) {
    const Sm = Sim();
    for (const w of S.people) {
      if (!w.alive) { w.preg = null; w.labor = null; continue; }
      if (w.preg && !w.preg.known && S.t - w.preg.t0 >= C.PREG_KNOWN_DAYS * C.DAY_MIN) {
        w.preg.known = true;
        const dad = person(S, w.preg.father);
        if (!S.stats.firstPreg) { S.stats.firstPreg = true; Sm.chron(S, w.name + ' espera o primeiro filho do povo.'); }
        else Sm.toast(S, w.name + ' está grávida.', 'good');
        Sm.addMem(S, w, 'esperaFilho'); if (dad && dad.alive) Sm.addMem(S, dad, 'esperaFilho');
      }
      if (w.preg && !w.labor && S.t >= w.preg.due) startLabor(S, w);
      if (w.labor) {
        const L = w.labor;
        if (L.hard && !L.helped && !S.safe) { w.needs.saude -= C.LABOR_HARD_DMG_H; w.dmg.parto = (w.dmg.parto || 0) + C.LABOR_HARD_DMG_H; }
        if (S.t >= L.until) giveBirth(S, w);
      }
    }
  }
  function startLabor(S, w) {
    const Sm = Sim();
    let risk = C.BIRTH_RISK;
    if (S.buildings.some((b) => b.built && G.Sim.def(b).cap)) risk += C.BIRTH_RISK_TENT;
    if (S.ctx && S.ctx.fireLit) risk += C.BIRTH_RISK_FIRE;
    if (w.needs.saude < 50 || w.needs.fome < 25) risk += C.BIRTH_RISK_WEAK;
    // Etapa 11: o Ventre Abençoado e a medicina cortam o risco; perto da estátua da cura o parto nunca é difícil
    const Dz = G.Deus;
    if (Dz && Dz.dom(S, 'ventre')) risk *= C.DOM.ventreRisk;
    if (Dz && Dz.saber(S, 'medicina')) risk *= C.MEDICINA_BIRTH;
    let hard = !S.safe && S.rng.next() < Math.max(0.02, risk);
    if (hard && Dz && Dz.safeBirth(S, w)) { hard = false; S.stats.statueBirths = (S.stats.statueBirths || 0) + 1; }
    w.labor = { t0: S.t, until: S.t + C.LABOR_H * 60, hard, helped: false };
    G.AI.abort(S, w);
    if (hard) Sm.toast(S, 'O parto de ' + w.name + ' está difícil. Ela vai precisar de você.', 'bad');
    else Sm.toast(S, w.name + ' entrou em trabalho de parto.', 'good');
  }
  F.makeBaby = function (S, mom, dad, sex, name) {
    const Sm = Sim();
    const p = Sm.makePerson(S, sex, name, 0);
    p.born = S.t;
    p.traits = inheritTraits(S, mom, dad);
    p.look = inheritLook(S, mom, dad, sex);
    p.needs = { fome: 100, sede: 100, energia: 100, calor: 100, social: 100, saude: 100 };
    p.mother = mom ? mom.id : 0; p.father = dad ? dad.id : 0;
    p.carriedBy = mom && mom.alive ? mom.id : 0;
    p.x = mom ? mom.x : S.camp.x + 1; p.y = mom ? mom.y : S.camp.y + 1; p.px = p.x; p.py = p.y;
    p.inTent = mom ? mom.inTent : 0;
    p.fe = mom ? Math.round((mom.fe + (dad ? dad.fe : mom.fe)) / 2) : 50;
    p.prayer = null; p.prayCool = 0;
    p.lastAge = 0;
    return p;
  };
  function giveBirth(S, w) {
    const Sm = Sim();
    const dad = person(S, w.preg ? w.preg.father : 0);
    const hard = w.labor.hard && !w.labor.helped;
    w.preg = null; w.labor = null;
    w.rest = S.t + C.DAY_MIN; w.needs.energia = Math.max(10, w.needs.energia - 25);
    if (hard) G.God.ignorePrayers(S, ['parto'], w.id);
    if (hard && S.rng.next() < C.BIRTH_LOSS_HARD) {
      Sm.chron(S, 'O bebê de ' + w.name + ' não sobreviveu ao parto.');
      Sm.addMem(S, w, 'perdeuBebe'); if (dad && dad.alive) Sm.addMem(S, dad, 'perdeuBebe');
      return null;
    }
    const sex = S.rng.chance(0.5) ? 'F' : 'M';
    const baby = F.makeBaby(S, w, dad, sex, F.pickName(S, sex, w, dad));
    if (G.Povos) G.Povos.inherit(S, baby, w, dad);   // Etapa 12: o povo, o sangue e os dons
    // o bebê mais velho passa para o colo do pai
    if (dad && dad.alive) for (const b of S.people) if (b.alive && b.carriedBy === w.id && !F.carrying(S, dad)) b.carriedBy = dad.id;
    S.people.push(baby);
    S.stats.births = (S.stats.births || 0) + 1;
    const first = S.stats.births === 1;
    const txt = 'Nasceu ' + baby.name + ', ' + (sex === 'F' ? 'filha' : 'filho') + ' de ' + w.name + (dad ? ' e ' + dad.name : '') + '.' +
      (first ? ' É a primeira criança do povo.' : '');
    S.chron.push({ t: S.t, text: txt, pid: baby.id, born: true });
    S.events.push({ k: 'chron', text: txt, birth: !S.safe });
    S.events.push({ k: 'birth', pid: baby.id });
    Sm.addMem(S, w, 'nasceuFilho'); if (dad && dad.alive) Sm.addMem(S, dad, 'nasceuFilho');
    for (const q of S.people) if (q.alive && q !== w && q !== dad && q !== baby && F.closeKin(S, q, baby)) Sm.addMem(S, q, 'nasceuIrmao');
    if (first && !S.stats.eraEnd) { S.era = 'familia'; Sm.chron(S, 'Começa a Era da Família.'); }
    G.God.onBirth(S, baby, w, dad);
    if (G.Povos) G.Povos.onBirth(S, baby, w, dad);
    if (G.Life) G.Life.onBirth(S, baby, w, dad);   // agradecem e fazem festa
    return baby;
  }
  // renomear depois (Deus dá o nome): troca também na Crônica
  F.rename = function (S, pid, name) {
    const p = person(S, pid);
    name = String(name || '').trim().slice(0, 14);
    if (!p || !name || name === p.name) return false;
    const old = p.name;
    p.name = name;
    for (const c of S.chron) if (c.pid === pid) c.text = c.text.replace(old, name);
    return true;
  };

  // ---------- bebês ----------
  F.carrierOf = (S, b) => person(S, b.carriedBy);
  function newCarrier(S, b) {
    const fam = [person(S, b.mother), person(S, b.father)].concat(F.siblingsOf(S, b))
      .filter((q) => q && q.alive && F.age(S, q) >= 12 && !q.carriedBy);
    const any = S.people.filter((q) => q.alive && q !== b && F.age(S, q) >= 12);
    const c = fam[0] || any[0] || null;
    b.carriedBy = c ? c.id : 0;
    return c;
  }
  // o bebê vai onde quem o carrega vai
  F.followCarrier = function (S, b) {
    let c = F.carrierOf(S, b);
    if (!c || !c.alive) c = newCarrier(S, b);
    if (!c) return false;
    b.x = c.x; b.y = c.y; b.px = c.px; b.py = c.py;
    b.inTent = c.inTent; b.sleeping = c.sleeping; b.dir = c.dir;
    return true;
  };
  // mamar ou comer do estoque, de hora em hora
  function feedBabies(S) {
    for (const b of S.people) {
      if (!b.alive || !b.carriedBy) continue;
      const n = b.needs;
      if (n.fome > 70 && n.sede > 70) continue;
      const c = F.carrierOf(S, b);
      if (!c) continue;
      if (c.id === b.mother && c.needs.fome > 20 && c.needs.sede > 20) {
        n.fome = 100; n.sede = 100;
        c.needs.fome -= C.NURSE_COST; c.needs.sede -= C.NURSE_COST;
        continue;
      }
      // sem mãe por perto: papinha do estoque (fruta, peixe, carne, e o conservado por último) e água
      const st = S.stock;
      if (n.fome <= 70) { const k = ['frutas', 'peixe', 'carne', 'seca', 'defumado'].find((f) => st[f] > 0); if (k) { st[k]--; n.fome = 100; } }
      if (n.sede <= 70 && st.agua > 0) { st.agua--; n.sede = 100; }
      else if (n.sede <= 70 && c.needs.sede > 30) n.sede = Math.min(100, n.sede + 40);
    }
  }
  // desmame: aos 3 anos a criança anda sozinha
  function wean(S, b) {
    const c = F.carrierOf(S, b);
    b.carriedBy = 0;
    b.sleeping = false; b.inTent = 0;
    if (c) { b.x = c.x; b.y = c.y; b.px = b.x; b.py = b.y; }
    b.act = null; b.path = null;
  }

  // ---------- aniversários e velhice ----------
  function birthday(S, p, age) {
    const Sm = Sim();
    const ela = p.sex === 'F';
    if (age === 3) { wean(S, p); Sm.toast(S, p.name + ' já anda sozinh' + (ela ? 'a' : 'o') + '.', 'good'); }
    else if (age === C.CHILD_HELP_AGE) Sm.toast(S, p.name + ' fez ' + age + ' anos e já ajuda: colhe frutas e busca água.', 'good');
    else if (age === 12) Sm.toast(S, p.name + ' fez 12 anos e virou aprendiz: agora faz todo trabalho.', 'good');
    else if (age === 18) {
      const first = !S.stats.firstAdult && (p.mother || p.father);
      if (first) S.stats.firstAdult = true;
      Sm.chron(S, (first ? 'A primeira criança do povo cresceu: ' : '') + p.name + ' fez 18 anos.');
      // o primogênito virou adulto: o Narrador manda um segundo casal pedindo abrigo
      if ((p.mother || p.father) && G.Narr) G.Narr.onAdult(S, p);
    } else if (age === (p.velho || C.OLD_AGE)) Sm.toast(S, p.name + ' fez ' + age + ' anos: ensina os jovens, mas já não tem a mesma força.');
    else Sm.toast(S, 'Aniversário de ' + p.name + ': ' + age + ' anos.');
  }
  function oldAge(S, p, age) {
    if (S.safe || age < C.OLD_AGE) return;
    const yearly = (C.OLD_DEATH_BASE + (age - C.OLD_AGE) * C.OLD_DEATH_STEP) * (G.Deus && G.Deus.saber(S, 'medicina') ? C.MEDICINA_OLD : 1);   // a medicina adia a velhice
    if (S.rng.next() < yearly / C.YEAR_DAYS) { p.dmg.velhice = 999; p.needs.saude = -999; }   // abaixo de zero: a cura natural do passo não salva
  }

  // ---------- metas da família ----------
  F.goals2 = function () {
    return [
      { id: 'filho', text: 'Receba o primeiro filho', reward: 10, done: false },
      { id: 'camas', text: 'Tenha barraca para todos', reward: 6, done: false },
      { id: 'estoque', text: 'Guarde comida para ' + C.GOAL_FOOD_DAYS + ' dias', reward: 6, done: false },
      { id: 'festa', text: 'Veja o povo fazer uma festa', opt: true, reward: 5, done: false },
      { id: 'ajuda', text: 'Veja um filho crescer e ajudar', reward: 8, done: false },
      { id: 'ensino', text: 'Veja alguém ensinar um jovem', opt: true, reward: 4, done: false },
      { id: 'povo', text: 'Chegue a ' + C.GOAL_PEOPLE + ' pessoas', reward: 12, done: false },
    ];
  };
  F.goalTest = {
    filho: (S) => (S.stats.births || 0) > 0,
    camas: (S) => F.bedsNeeded(S) > 4 && F.bedsTotal(S) >= F.bedsNeeded(S),
    estoque: (S) => S.ctx.foodDays >= C.GOAL_FOOD_DAYS,
    ajuda: (S) => !!S.stats.childHelped,
    povo: (S) => S.people.filter((p) => p.alive).length >= C.GOAL_PEOPLE,
  };

  // ---------- ganchos chamados pela simulação ----------
  F.init = function (S) {
    S.stats.births = S.stats.births || 0;
    for (const p of S.people) {
      // saves até a 0.5: um só par (partner, afeto) vira o primeiro laço
      if (p.bonds === undefined) { p.bonds = {}; if (p.partner) p.bonds[p.partner] = p.afeto || 0; }
      delete p.partner; delete p.afeto;
      if (p.mother === undefined) p.mother = 0;
      if (p.father === undefined) p.father = 0;
      if (p.preg === undefined) p.preg = null;
      if (p.labor === undefined) p.labor = null;
      if (p.carriedBy === undefined) p.carriedBy = 0;
    }
    // o casal que chegou junto já é um casal
    if (!S.famInit) {
      S.famInit = true;
      const [a, b] = S.people;
      if (a && b && !F.partners(S, a).length && !F.partners(S, b).length && !a.mother && !b.mother) F.link(S, a, b, C.AFETO_START);
    }
    // quem dormia de visita não está mais lá (save)
    for (const b of S.buildings) if (b.guests) delete b.guests;
    for (const p of S.people) { p.visiting = null; p.host = 0; }
    for (const b of S.people) if (b.alive && b.carriedBy) F.followCarrier(S, b);
  };
  F.hourly = function (S) {
    const h = Math.floor(S.ck.hour);
    if (h === 23) { nightTogether(S); if (spicy(S)) threesome(S); }
    pregnancyHour(S);
    feedBabies(S);
  };
  F.daily = function (S) {
    for (const p of S.people) {
      if (!p.alive) continue;
      const age = F.age(S, p);
      if (p.lastAge !== undefined && age > p.lastAge) birthday(S, p, age);
      p.lastAge = age;
      oldAge(S, p, p.velho ? F.bodyAge(S, p) : age);
    }
    coolBonds(S);
    formBonds(S);
  };
  F.onDeath = function (S, p) {
    const Sm = Sim();
    p.preg = null; p.labor = null;
    if (p.carriedBy) p.carriedBy = 0;
    // quem estava no colo passa para outro
    for (const b of S.people) if (b.alive && b.carriedBy === p.id) { if (!newCarrier(S, b)) b.needs.saude = -999; }
    for (const q of F.partners(S, p)) Sm.addMem(S, q, 'perdeuCompanheiro');
    for (const k of F.family(S, p)) if (k.q.alive && (k.r === 'mãe' || k.r === 'pai' || k.r === 'filha' || k.r === 'filho' || k.r === 'irmã' || k.r === 'irmão')) Sm.addMem(S, k.q, 'perdeuFamilia');
    // o par de quem morreu dorme onde der: a visita desta noite acaba
    for (const b of S.buildings) if (b.guests) delete b.guests[p.id];
  };
})(globalThis.G = globalThis.G || {});
