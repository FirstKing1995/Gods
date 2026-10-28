/* Gods · Etapa 16 (0.17): grandes obras e instituições.
   As grandes obras (templo, muralha, torre de vigia, aqueduto) pedem centenas de peças e meses de muitas mãos, sobem
   em fases e valem para a aldeia inteira. As instituições (escola, biblioteca, hospital, guarda, brigada do fogo,
   mercado) aparecem quando a sociedade pede, sobem de nível e pedem gente fixa, que sai do trabalho comum: só com
   fartura. A febre e o fogo por acaso são os desafios que dão serviço ao hospital e à brigada. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Ci = G.Cidade = {};
  const Sim = () => G.Sim, Fam = () => G.Family;
  const DAY = () => C.DAY_MIN;

  const GRANDES = ['templo', 'muralha', 'torre', 'aqueduto', 'ponte'];   // a ponte de pedra veio com a Etapa 17
  const INST = ['guarda', 'brigada', 'hospital', 'escola', 'biblioteca', 'mercado'];   // a ordem em que o líder olha
  Ci.GRANDES = GRANDES; Ci.INST = INST;
  Ci.isCidade = (t) => GRANDES.indexOf(t) >= 0 || INST.indexOf(t) >= 0;
  Ci.isGrande = (b) => !!(b && C.BUILD[b.type] && C.BUILD[b.type].grande && !b.built);

  const here = (p) => p.alive && !p.fora && !p.carriedBy;
  const vivos = (S) => S.people.filter((p) => p.alive && !p.fora).length;
  const age = (S, p) => Fam().age(S, p);
  const oa = (p) => (p.sex === 'F' ? 'a' : 'o');
  const escrita = (S) => !!(G.Deus && G.Deus.saber(S, 'escrita'));
  const criancas = (S) => S.people.filter((p) => here(p) && age(S, p) >= 3 && age(S, p) < 13).length;
  const chron = (S, t) => Sim().chron(S, t);
  const toast = (S, t, k) => Sim().toast(S, t, k === undefined ? '' : k);

  Ci.init = function (S) {
    const c = S.cidade || (S.cidade = {});
    c.escrito = c.escrito || {};
    c.first = c.first || {};
    c.peste = c.peste || null;
    c.fogos = c.fogos || 0;
    c.faisca = c.faisca || 0;
    const st = S.stats;
    for (const k of ['aulas', 'servMin', 'doentes', 'mortesPeste', 'curados', 'trocasMercado', 'fogosAcaso']) st[k] = st[k] || 0;
  };

  // ---------- quando cada uma aparece ----------
  const ABRE = {
    torre: (S) => (vivos(S) >= 15 ? '' : 'pede uma aldeia de 15 pessoas'),
    templo: (S) => (vivos(S) >= 20 ? '' : 'pede uma aldeia de 20 pessoas'),
    muralha: (S) => (vivos(S) >= 30 ? '' : 'pede uma vila de 30 pessoas'),
    aqueduto: (S) => (vivos(S) >= 30 ? '' : 'pede uma vila de 30 pessoas'),
    ponte: (S) => (vivos(S) >= 15 ? '' : 'pede uma aldeia de 15 pessoas'),
    escola: (S) => (!escrita(S) ? 'pede a escrita' : criancas(S) < 12 ? 'pede 12 crianças na aldeia' : ''),
    biblioteca: (S) => (escrita(S) ? '' : 'pede a escrita'),
    hospital: (S) => (vivos(S) >= 40 ? '' : 'pede 40 pessoas'),
    guarda: (S) => ((S.stats.crimesG && S.stats.crimesG[3] > 0) ? '' : 'aparece depois do primeiro crime grave'),
    brigada: (S) => ((S.stats.incendios || 0) + ((S.cidade && S.cidade.fogos) || 0) > 0 ? '' : 'aparece depois do primeiro incêndio'),
    mercado: (S) => (S.soc && S.soc.vila && !S.soc.vila.fim ? '' : 'pede uma vila de fora para trocar'),
  };
  // '' pode; texto: por que não; null: não é obra desta etapa
  Ci.openWhy = function (S, type) {
    if (!ABRE[type]) return null;
    if (type !== 'ponte' && S.buildings.some((b) => b.type === type)) return 'a aldeia já tem ' + (C.BUILD[type].a === 'o' ? 'o seu ' : 'a sua ') + C.BUILD[type].name.toLowerCase();
    const w = ABRE[type](S);
    // a obra que pede tábua só abre com a marcenaria de pé (senão a grande obra parava no meio, sem explicação)
    if (!w && C.BUILD[type].cost.tabuas && !S.buildings.some((b) => b.type === 'marcenaria' && b.built)) return 'pede tábuas: construa uma marcenaria';
    return w;
  };

  // ---------- quem serve ----------
  const CARGO = { escola: ['professor', 'professora'], biblioteca: ['bibliotecário', 'bibliotecária'], hospital: ['curandeiro', 'curandeira'],
    guarda: ['guarda', 'guarda'], brigada: ['bombeiro', 'bombeira'], mercado: ['feirante', 'feirante'] };
  const SKILL = { escola: null, biblioteca: 'oficio', hospital: 'coleta', guarda: 'caca', brigada: 'construcao', mercado: 'oficio' };
  Ci.cargoNome = (S, p) => { const b = p.cargo ? Sim().building(S, p.cargo) : null; return b && CARGO[b.type] ? CARGO[b.type][p.sex === 'F' ? 1 : 0] : ''; };
  const instOf = (b) => { const d = Sim().def(b); return d && d.inst ? d.inst : null; };
  Ci.staffOf = (S, b) => S.people.filter((p) => here(p) && p.cargo === b.id);
  // ativa: alguém serviu ali ontem ou hoje (com o jogo fechado, basta ter quem sirva)
  function ativa(S, b) {
    if (!b.built || !instOf(b)) return false;
    if (S.resumido) return Ci.staffOf(S, b).length > 0;
    const sv = b.serv;
    return !!(sv && S.ck.day - sv.day <= 1 && (sv.min >= C.PROF_MIN || (sv.prev || 0) >= C.PROF_MIN));
  }
  Ci.ativa = ativa;
  // o nível de cada instituição em serviço (com cache por hora: a escola entra na conta de aprender de cada um)
  let cacheT = -1, cache = {};
  Ci.nivel = function (S, k) {
    const h = Math.floor(S.t / 60);
    if (h !== cacheT) {
      cacheT = h; cache = {};
      for (const b of S.buildings) if (b.built && instOf(b) && ativa(S, b)) cache[b.type] = Math.max(cache[b.type] || 0, b.lv || 1);
    }
    return cache[k] || 0;
  };
  Ci.feita = (S, k) => S.buildings.find((b) => b.type === k && b.built) || null;

  function candidatos(S) {
    const L = S.soc ? S.soc.lider : 0;
    return S.people.filter((p) => here(p) && !p.cargo && age(S, p) >= 18 && Fam().bodyAge(S, p) < C.OLD_HEAVY_AGE && !p.exilio && !p.pena && p.id !== L);
  }
  function nota(p, k) {
    const sk = SKILL[k];
    let v = sk ? (p.skills[sk] || 0) : Object.keys(p.skills).reduce((a, s) => a + (p.skills[s] || 0), 0) / 4;
    if (Sim().has(p, 'Trabalhador')) v += 2;
    if (Sim().has(p, 'Preguiçoso')) v -= 4;
    return v;
  }
  function contratar(S) {
    const fd = S.ctx ? S.ctx.foodDays : 0, soltos = [];
    for (const p of S.people) {
      if (!p.cargo) continue;
      const b = Sim().building(S, p.cargo);
      if (!p.alive || p.fora || !b || !b.built || !instOf(b)) { p.cargo = 0; continue; }
      if (fd < C.PROF_SOLTA) { p.cargo = 0; soltos.push(p); }
    }
    if (soltos.length && !S.resumido) toast(S, 'A comida está curta: ' + Sim().listNames(soltos) + (soltos.length > 1 ? ' deixaram' : ' deixou') + ' o posto e ' + (soltos.length > 1 ? 'voltaram' : 'voltou') + ' ao trabalho comum.', 'warn');
    if (fd < C.PROF_FARTURA) return;
    for (const b of S.buildings) {
      const ins = b.built ? instOf(b) : null;
      if (!ins) continue;
      const have = Ci.staffOf(S, b);
      for (let k = ins.staff; k < have.length; k++) have[k].cargo = 0;
      for (let n = have.length; n < ins.staff; n++) {
        const cand = candidatos(S).sort((a, c) => nota(c, b.type) - nota(a, b.type) || a.id - c.id);
        const p = cand[0];
        if (!p) break;
        p.cargo = b.id;
        G.AI.abort(S, p);
        const nome = CARGO[b.type][p.sex === 'F' ? 1 : 0];
        if (!S.cidade.first['c_' + b.type]) {
          S.cidade.first['c_' + b.type] = S.t;
          chron(S, p.name + ' virou ' + (p.sex === 'F' ? 'a primeira ' : 'o primeiro ') + nome + ' da aldeia. Sai do trabalho comum para servir ' + (C.BUILD[b.type].a === 'o' ? 'no ' : 'na ') + Sim().def(b).name.toLowerCase() + '.');
        } else if (!S.resumido) toast(S, p.name + ' agora é ' + nome + '.');
      }
    }
  }

  // a IA: quem tem posto vai para lá no horário de trabalho
  Ci.want = function (S, p) {
    if (!p.cargo || p.sleeping || p.labor || p.carriedBy) return 0;
    const h = S.ck.hour;
    if (h < 8 || h >= 17) return 0;
    const b = Sim().building(S, p.cargo);
    if (!b || !b.built) return 0;
    if (p.needs.fome < 30 || p.needs.sede < 30 || p.needs.energia < 20) return 0;
    if (p.servDia === S.ck.day && (p.servMin || 0) >= C.SERVIR_MIN * 3) return 0;
    return C.WORK_CAP + 3;
  };
  Ci.alvo = (S, p) => (p.cargo ? Sim().building(S, p.cargo) : null);
  Ci.serviu = function (S, p, b, min) {
    const day = S.ck.day;
    if (!b.serv || b.serv.day !== day) b.serv = { day, min: 0, prev: b.serv && b.serv.day === day - 1 ? b.serv.min : 0 };
    b.serv.min += min;
    if (p.servDia !== day) { p.servDia = day; p.servMin = 0; }
    p.servMin += min;
    S.stats.servMin += min;
    const sk = SKILL[b.type];
    if (sk) p.skills[sk] = (p.skills[sk] || 0) + min / 60 * 0.5;
  };
  Ci.fazendo = function (b) {
    return { escola: 'Dando aula', biblioteca: 'Copiando o que se sabe', hospital: 'Cuidando dos doentes', guarda: 'De vigia', brigada: 'Cuidando dos baldes', mercado: 'Na banca de troca' }[b.type] || 'No posto';
  };

  // ---------- efeitos ----------
  // quanto se aprende: a escola (o adulto que estuda) e o arquivo (todos)
  Ci.xp = function (S, p) {
    let f = 1;
    const e = Ci.nivel(S, 'escola');
    if (e >= 2 && age(S, p) >= 16) f *= C.ESCOLA_XP[e];
    if (Ci.nivel(S, 'biblioteca') >= 3) f *= C.ARQUIVO_XP;
    return f;
  };
  // a aula do dia: cada criança ganha prática em dois ofícios e o jeito das técnicas que alguém sabe (ou que está escrito)
  const OFICIOS = ['coleta', 'pesca', 'construcao', 'caca', 'oficio', 'plantio', 'criacao'];
  function aula(S) {
    const lv = Ci.nivel(S, 'escola');
    if (!lv) return;
    const Ge = G.Gente, T = G.Tech;
    const tecs = Ge ? Ge.TECNICAS.filter((id) => T.known(S, id) && (S.cidade.escrito[id] || S.people.some((q) => here(q) && Ge.dom(S, q, id) >= C.DOM_MESTRE))) : [];
    let n = 0;
    for (const p of S.people) {
      if (!here(p)) continue;
      const a = age(S, p);
      if (a < 6 || a >= 16) continue;
      for (let k = 0; k < 2; k++) {
        const sk = OFICIOS[(p.id * 7 + S.ck.day * 3 + k * 5) % OFICIOS.length];
        if (p.skills[sk] !== undefined) p.skills[sk] += 0.8 * lv;
      }
      for (const id of tecs) Ge.aprende(S, p, id, C.DOM_PERTO * 2 * lv, null);
      n++;
    }
    if (!n) return;
    S.stats.aulas += n;
    if (!S.cidade.first.aula) { S.cidade.first.aula = S.t; chron(S, 'Primeiro dia de aula: ' + n + (n > 1 ? ' crianças sentaram' : ' criança sentou') + ' para aprender o que os grandes sabem.'); }
  }
  // a estante: o jeito de quem sabe vira escrito; na biblioteca, quem trabalha nele aprende pelo livro
  function estante(S) {
    const lv = Ci.nivel(S, 'biblioteca'), Ge = G.Gente;
    if (!lv || !Ge) return;
    for (const id of Ge.TECNICAS) {
      if (S.cidade.escrito[id] || !G.Tech.known(S, id)) continue;
      if (!S.people.some((q) => here(q) && Ge.dom(S, q, id) >= C.DOM_MESTRE)) continue;
      S.cidade.escrito[id] = S.t;
      chron(S, 'O jeito ' + Ge.DE_TEC[id] + ' foi escrito na ' + Sim().def(Ci.feita(S, 'biblioteca')).name.toLowerCase() + '. Agora não se perde mais.');
    }
    if (lv < 2) return;
    for (const p of S.people) {
      if (!here(p) || age(S, p) < 12) continue;
      for (const id of Ge.TECNICAS) if (S.cidade.escrito[id] && Ge.dom(S, p, id) > 0 && Ge.dom(S, p, id) < 1) Ge.aprende(S, p, id, C.DOM_PERTO, null);
    }
  }
  Ci.escrito = (S, id) => !!(S.cidade && S.cidade.escrito[id]);
  // a guarda: menos malfeito, e quem vigia vê o que acontece perto (com a torre, também de noite)
  Ci.crimeMult = (S) => C.GUARDA_CRIME[Ci.nivel(S, 'guarda')];
  Ci.guardas = function (S, x, y, out, autor) {
    const lv = Ci.nivel(S, 'guarda');
    if (!lv) return;
    const b = Ci.feita(S, 'guarda'), torre = Ci.feita(S, 'torre');
    let r = 10 + 4 * lv;
    if (torre) r += 8;
    if (S.ctx.night && !torre && lv < 3) return;
    if (Math.hypot(x - b.x - 1.5, y - b.y - 1.5) > r && lv < 3) return;
    for (const q of Ci.staffOf(S, b)) if (q !== autor && out.indexOf(q.id) < 0) out.push(q.id);
  };
  // a brigada: apaga mais vezes e mais cedo; o quartel não depende da água do estoque
  Ci.apaga = (S) => C.BRIGADA_APAGA[Ci.nivel(S, 'brigada')];
  Ci.fogoMin = (S) => (Ci.nivel(S, 'brigada') ? 0.5 : 1);
  Ci.semAgua = (S) => Ci.nivel(S, 'brigada') >= 3;
  // a muralha: lobo e onça não entram, e a comida guardada lá dentro fica
  Ci.dentro = function (S, x, y) {
    for (const b of S.buildings) {
      if (b.type !== 'muralha' || !b.built) continue;
      if (Math.hypot(x - (S.camp.x + 1), y - (S.camp.y + 1)) <= C.BUILD.muralha.wall.r) return true;
    }
    return false;
  };
  // o templo é lugar de reza (vale o dobro)
  Ci.templos = (S) => S.buildings.filter((b) => b.type === 'templo' && b.built);

  // ---------- a febre ----------
  function adoece(S, p) {
    const hl = Ci.nivel(S, 'hospital');
    const d = C.PESTE_D[0] + S.rng.next() * (C.PESTE_D[1] - C.PESTE_D[0]);
    p.sick = S.t + d * (hl ? 0.7 : 1) * DAY();
    S.stats.doentes++;
    if (S.cidade.peste) S.cidade.peste.n++;
  }
  Ci.adoece = adoece;
  const podePegar = (S, p) => here(p) && !p.sick && !(p.imune > S.t);
  function pesteDia(S) {
    const c = S.cidade, hl = Ci.nivel(S, 'hospital');
    if (!c.peste) {
      if (S.safe || S.resumido || vivos(S) < C.PESTE_GENTE) return;
      const ch = C.PESTE_ANO / C.YEAR_DAYS * (S.ck.season === 3 ? 1.6 : 1);
      if (S.rng.next() >= ch) return;
      const cand = S.people.filter((p) => podePegar(S, p) && age(S, p) >= 6);
      if (!cand.length) return;
      const p0 = S.rng.pick(cand);
      c.peste = { t0: S.t, n: 0, mortes: 0 };
      adoece(S, p0);
      chron(S, 'Uma febre apareceu na aldeia. ' + p0.name + ' foi ' + (p0.sex === 'F' ? 'a primeira' : 'o primeiro') + ' a cair de cama.' + (hl ? '' : ' Não há casa de cura.'));
      toast(S, 'Febre na aldeia: ' + p0.name + ' adoeceu. Ela passa de um para outro, mais dentro de casa.', 'warn');
      return;
    }
    // passa adiante: quem dorme na mesma casa pega mais; na rua, menos. A enfermaria isola, o hospital quase fecha
    const doentes = S.people.filter((p) => here(p) && p.sick);
    if (!doentes.length) {
      const pz = c.peste;
      chron(S, 'A febre passou. Adoeceram ' + pz.n + (pz.mortes ? '; ' + (pz.mortes > 1 ? pz.mortes + ' morreram.' : 'um morreu.') : ', e ninguém morreu.'));
      c.peste = null;
      return;
    }
    const iso = hl >= 3 ? 0.35 : hl >= 2 ? 0.6 : 1;
    const novos = [];
    for (const d of doentes) {
      const casa = S.buildings.find((b) => b.beds && b.beds.indexOf(d.id) >= 0);
      for (const q of S.people) {
        if (!podePegar(S, q) || novos.indexOf(q) >= 0) continue;
        const junto = casa && casa.beds.indexOf(q.id) >= 0;
        if (S.rng.next() < (junto ? C.PESTE_PEGA : C.PESTE_RUA / Math.max(1, doentes.length * 0.5)) * iso) novos.push(q);
      }
    }
    for (const q of novos) adoece(S, q);
  }
  // de hora em hora: a febre tira saúde (mais da criança e do velho); a casa de cura segura, e cura a ferida
  function pesteHora(S) {
    const hl = Ci.nivel(S, 'hospital');
    for (const p of S.people) {
      if (!p.alive || p.fora) continue;
      if (p.sick) {
        if (S.t >= p.sick) {
          delete p.sick; p.imune = S.t + C.YEAR_DAYS * DAY();
          S.stats.curados++;
          continue;
        }
        const a = age(S, p), fraco = a < 6 || Fam().bodyAge(S, p) >= C.OLD_HEAVY_AGE;
        const dmg = C.PESTE_H * C.HOSP_CURA[hl] * (fraco ? 1.6 : 1) * (G.Eras ? G.Eras.febreMult(S) : 1);   // as ervas do conselho
        p.needs.saude -= dmg;
        p.dmg.doenca = (p.dmg.doenca || 0) + dmg;
        if (p.needs.saude <= 0) Sim().die(S, p);
      } else if (hl && p.needs.saude < 70) p.needs.saude = Math.min(100, p.needs.saude + 0.5 * hl);
      // a enfermaria ajuda no parto difícil, sem milagre
      if (hl >= 2 && p.labor && p.labor.hard && !p.labor.helped) {
        p.labor.helped = true;
        if (!S.cidade.first.parto) { S.cidade.first.parto = S.t; chron(S, 'Pela primeira vez, a ' + Sim().def(Ci.feita(S, 'hospital')).name.toLowerCase() + ' ajudou num parto difícil: ' + p.name + ' teve quem segurasse a mão.'); }
      }
    }
  }
  Ci.workMult = (S, p) => (p.sick ? 0.5 : 1);
  Ci.onDeath = function (S, p) { if (p.sick && S.cidade && S.cidade.peste) S.cidade.peste.mortes++; if (p.cause === 'doenca') S.stats.mortesPeste++; delete p.sick; };

  // ---------- o fogo por acaso ----------
  // no verão sem chuva, numa aldeia de muitas casas de palha, uma faísca pega numa casa de dia
  const PALHA = (b) => b.type === 'barraca' && (!b.kind || b.kind === 'oca' || b.kind === 'palafita');
  function faiscaDia(S) {
    const c = S.cidade;
    if (S.safe || S.resumido || c.faisca || S.ck.season !== 1 || S.precip) return;
    const casas = S.buildings.filter((b) => b.built && PALHA(b) && !b.fogo);
    if (casas.length < C.FOGO_ACASO_CASAS || S.rng.next() >= C.FOGO_ACASO) return;
    c.faisca = S.t + (10 + S.rng.next() * 7) * 60;
  }
  function faiscaHora(S) {
    const c = S.cidade;
    if (!c.faisca || S.t < c.faisca) return;
    c.faisca = 0;
    if (S.precip || !S.soc) return;
    const casas = S.buildings.filter((b) => b.built && PALHA(b) && !b.fogo);
    if (!casas.length) return;
    const b = S.rng.pick(casas);
    b.fogo = S.t; S.soc.arde = 1;
    c.fogos++; S.stats.fogosAcaso++;
    for (const q of S.people) if (here(q) && q.inTent === b.id && !q.labor) { G.AI.abort(S, q); q.fail.dormir = S.t + C.FOGO_MIN + 15; q.nextEval = S.t; }
    if (!S.safe) S.events.push({ k: 'soc', ev: 'fogo', on: true, bid: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const d = Sim().def(b);
    toast(S, 'Uma faísca pegou na palha ' + (d.a === 'o' ? 'do ' : 'da ') + d.name.toLowerCase() + '. Fogo!', 'warn');
    if (c.fogos === 1) chron(S, 'Uma faísca do verão seco pegou na palha ' + (d.a === 'o' ? 'do ' : 'da ') + d.name.toLowerCase() + '. Foi o primeiro fogo sem culpado.');
  }

  // ---------- a troca da feira ----------
  const TROCA = ['madeira', 'pedra', 'argila', 'tabuas', 'fibra', 'frutas', 'peixe', 'carne', 'feijao', 'milho', 'mandioca', 'couro', 'sal', 'nobre'];
  function feira(S) {
    const lv = Ci.nivel(S, 'mercado'), v = S.soc && S.soc.vila;
    if (!lv || !v || v.fim || S.ck.day % C.MERCADO_D[lv]) return;
    Ci.troca(S, C.MERCADO_N[lv], '', lv >= 3 ? 1 : 0.4);
  }
  // uma troca com a vila de fora: o que mais sobra vira o que mais falta (quem: quem leva, quando não é o mercado)
  Ci.troca = function (S, N, quem, laco) {
    if (G.Eras) N = Math.round(N * G.Eras.trocaMult(S));   // o reino de leis escritas é comerciante
    const v = S.soc && S.soc.vila, st = S.stock;
    if (!v || v.fim) return false;
    const ks = TROCA.filter((k) => st[k] !== undefined);
    if (ks.length < 2) return false;
    const sobra = ks.slice().sort((a, b) => (st[b] || 0) - (st[a] || 0))[0];
    const falta = ks.filter((k) => k !== sobra).sort((a, b) => (st[a] || 0) - (st[b] || 0))[0];
    if ((st[sobra] || 0) < N * 2 || (st[falta] || 0) >= st[sobra] / 2) return false;
    const veio = Math.round(N * 0.8);
    st[sobra] -= N; st[falta] = (st[falta] || 0) + veio;
    v.laco = Math.min(100, (v.laco || 0) + (laco || 0.4));
    S.stats.trocasMercado++;
    const nome = (k) => (G.AI && G.AI.LABEL && G.AI.LABEL[k]) || C.ITEM_NAMES && C.ITEM_NAMES[k] || k;
    const onde = quem ? 'Com ' + quem : 'Na ' + Sim().def(Ci.feita(S, 'mercado')).name.toLowerCase();
    const txt = onde + ', ' + N + ' de ' + nome(sobra).toLowerCase() + ' viraram ' + veio + ' de ' + nome(falta).toLowerCase() + ', com gente ' + (v.art ? 'd' + v.art + ' ' : 'de ') + v.nome + '.';
    if (S.stats.trocasMercado === 1) chron(S, 'Primeira troca na banca: ' + txt.charAt(0).toLowerCase() + txt.slice(1));
    else if (!S.resumido) toast(S, txt, 'good');
    return true;
  };

  // ---------- o líder: marca a instituição que falta e sobe de nível a que não dá mais conta ----------
  Ci.FALTA = {
    guarda: 'Depois do crime grave, o povo quer alguém de vigia.', brigada: 'Depois do fogo, o povo quer baldes prontos.',
    hospital: 'Gente demais para cuidar sem uma casa de cura.', escola: 'As crianças precisam de quem ensine.',
    biblioteca: 'O que se sabe precisa ficar escrito.', mercado: 'A troca com a vila de fora pede um lugar.',
  };
  Ci.NOME_OBRA = { guarda: 'um posto de vigia', brigada: 'uma fila de baldes', hospital: 'a casa do curandeiro', escola: 'uma roda de ensino',
    biblioteca: 'uma estante', mercado: 'uma banca de troca' };
  Ci.faltas = function (S) {
    if (S.buildings.some((b) => INST.indexOf(b.type) >= 0 && (!b.built || b.up))) return [];
    for (const k of INST) if (Ci.openWhy(S, k) === '' && G.Tech.buildOpen(S, k)) return [{ type: k, why: k }];
    return [];
  };
  const SOBE = {
    escola: (S, lv) => (lv === 1 ? criancas(S) >= 20 : vivos(S) >= 80),
    biblioteca: (S, lv) => vivos(S) >= (lv === 1 ? 50 : 100),
    hospital: (S, lv) => (lv === 1 ? vivos(S) >= 60 || S.stats.doentes >= 8 : vivos(S) >= 100 || S.stats.mortesPeste >= 3),
    guarda: (S, lv) => ((S.stats.crimesG && S.stats.crimesG[3]) || 0) >= (lv === 1 ? 3 : 6) || vivos(S) >= (lv === 1 ? 70 : 120),
    brigada: (S, lv) => (S.stats.incendios || 0) + S.cidade.fogos >= (lv === 1 ? 2 : 4) || vivos(S) >= (lv === 1 ? 70 : 120),
    mercado: (S, lv) => S.stats.trocasMercado >= (lv === 1 ? 6 : 20),
  };
  function subir(S) {
    const s = S.soc;
    if (!s || !G.Soc || s.modo !== 'decide' || S.resumido) return;
    if (S.buildings.some((b) => INST.indexOf(b.type) >= 0 && (!b.built || b.up))) return;
    const L = G.Soc.lider(S);
    if (!L) return;
    for (const k of INST) {
      const b = S.buildings.find((x) => x.type === k && x.built);
      if (!b || (b.lv || 1) >= 3 || !SOBE[k](S, b.lv || 1)) continue;
      const up = Sim().defOf(k, (b.lv || 1) + 1);
      if (!up || Object.keys(up.cost).some((m) => up.cost[m] > Math.floor((S.stock[m] || 0) * C.SOC_TETO))) continue;
      if (!Sim().startUpgrade(S, b)) continue;
      b.povo = 1;
      toast(S, L.name + ' marcou a melhoria ' + (C.BUILD[k].a === 'o' ? 'do ' : 'da ') + Sim().def(b).name.toLowerCase() + ' para ' + up.name.toLowerCase() + ': ela não dá mais conta.');
      return;
    }
  }

  // ---------- obra pronta ----------
  Ci.onBuilt = function (S, b) {
    if (!Ci.isCidade(b.type)) return false;
    if (b.type === 'ponte') { if (G.Regioes) G.Regioes.ponte(S, b); return true; }   // Etapa 17
    const d = C.BUILD[b.type];
    if (d.grande) {
      const dias = b.t0 ? Math.max(1, Math.round((S.t - b.t0) / DAY())) : 0;
      chron(S, (d.a === 'o' ? 'O ' : 'A ') + d.name.toLowerCase() + ' ficou ' + (d.a === 'o' ? 'pronto' : 'pronta') + (dias ? ', depois de ' + dias + ' dias de obra e muitas mãos.' : '.') + ' ' + d.desc.split(':')[0].split('.')[0] + '.');
      if (b.type === 'torre') Sim().reveal(S, b.x + 1, b.y + 1, d.watch.r);
      for (const p of S.people) if (p.alive) Sim().addMem(S, p, 'obra');
    } else {
      chron(S, (d.a === 'o' ? 'O ' : 'A ') + d.name.toLowerCase() + ' ficou ' + (d.a === 'o' ? 'pronto' : 'pronta') + '. ' + d.desc.split('.')[0] + '.');
    }
    return true;
  };

  // ---------- o relógio ----------
  Ci.daily = function (S) {
    if (!S.cidade) Ci.init(S);
    cacheT = -1;
    for (const b of S.buildings) if (b.serv && b.serv.day < S.ck.day - 1) b.serv = null;
    contratar(S);
    aula(S);
    estante(S);
    pesteDia(S);
    faiscaDia(S);
    feira(S);
    subir(S);
    for (const b of S.buildings) if (b.type === 'torre' && b.built) Sim().reveal(S, b.x + 1, b.y + 1, C.BUILD.torre.watch.r);
  };
  Ci.hourly = function (S) {
    if (!S.cidade) Ci.init(S);
    pesteHora(S);
    faiscaHora(S);
    const aq = S.buildings.find((b) => b.type === 'aqueduto' && b.built);
    if (aq) S.stock.agua = Math.min(G.Tech.waterCap(S), (S.stock.agua || 0) + C.BUILD.aqueduto.water.h);
  };

  // ---------- grandes obras: o quanto já chegou de material (o povo constrói até onde ele deixa) ----------
  Ci.frac = function (job) {
    let tot = 0, have = 0;
    for (const k in job.cost) { tot += job.cost[k]; have += Math.min(job.cost[k], job.have[k] || 0); }
    return tot ? have / tot : 1;
  };
  Ci.podeErguer = (job) => !!(job && job.b && Ci.isGrande(job.b) && job.progress < Ci.frac(job) - 0.002);
  Ci.parada = (S, b) => Ci.isGrande(b) && S.ctx && S.ctx.foodDays < C.GRANDE_FARTURA;   // a fome segura a grande obra

  // ---------- para a ficha ----------
  Ci.info = function (S, b) {
    const ins = instOf(b);
    if (!ins || !b.built) return null;
    const st = Ci.staffOf(S, b);
    return { staff: st.map((p) => p.name), quer: ins.staff, ativa: ativa(S, b), cargo: CARGO[b.type] };
  };
  Ci.status = function (S) {
    const c = S.cidade || {};
    return { peste: c.peste ? { n: c.peste.n, doentes: S.people.filter((p) => here(p) && p.sick).length } : null, escrito: Object.keys(c.escrito || {}) };
  };
  // os motivos e os nomes que o líder usa ao marcar (a Sociedade carrega antes)
  if (G.Soc) { Object.assign(G.Soc.FALTA, Ci.FALTA); if (G.Soc.NOME_OBRA) Object.assign(G.Soc.NOME_OBRA, Ci.NOME_OBRA); }
})(globalThis.G = globalThis.G || {});
