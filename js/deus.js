/* Gods · Deus (Etapa 11): o que Deus vira com o tempo. A fé, as orações e os milagres moram em god.js; aqui moram
   a glória e os níveis (de Espírito a Deus Maior), os dons (um a cada nível), o nome que o povo dá, os céticos que se
   convertem, o escolhido de fé inteira que recebe um poder (curar, pregar ou brilhar), a Bênção e os grandes atos:
   a estátua com milagre próprio, a espécie nova (um bicho, um peixe, uma árvore) e o conhecimento de outra era.
   Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const D = G.Deus = {};
  const God = () => G.God, Sim = () => G.Sim, Fam = () => G.Family;
  const DAY = () => C.DAY_MIN;
  const has = (p, t) => p.traits.indexOf(t) >= 0;
  const ela = (p) => p.sex === 'F';
  const oa = (p) => (ela(p) ? 'a' : 'o');
  const low1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const plain = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // uma entrada da Crônica que fala de Deus (se o nome mudar, a Crônica muda junto)
  function chron(S, text) { S.chron.push({ t: S.t, text, god: 1 }); S.events.push({ k: 'chron', text }); }

  // ---------- os dons ----------
  // side: de que jeito o povo vê quem escolhe esse dom (bom: bondoso · temido) — a oferta leva um do lado de Deus
  D.DONS = {
    fogo: { name: 'Fogo Sagrado', icon: 'fogo', side: 'bom', desc: 'O Calor dura um dia inteiro e aquece até 7 passos.' },
    maos: { name: 'Mãos de Luz', icon: 'cura', side: 'bom', desc: 'A Cura custa 12 e cura também, pela metade, quem está a até 2 passos.' },
    ceu: { name: 'Céu Generoso', icon: 'chuva', side: 'bom', desc: 'A Chuva custa 10, enche mais os arbustos, dá o dobro de água e adianta a roça 3 dias.' },
    trovao: { name: 'Trovão', icon: 'raio', side: 'temido', desc: 'O Raio custa 10, alcança o lobo e a onça mais longe e tira o dobro da árvore e da pedra.' },
    ouvido: { name: 'Ouvido Atento', icon: 'reza', side: 'bom', desc: 'As orações esperam o dobro do tempo, e cada oração atendida dá o dobro de Poder.' },
    olhos: { name: 'Olhos do Céu', icon: 'olho', side: '', desc: 'A névoa se abre metade mais longe em volta do povo: você vê e age mais longe.' },
    sonhos: { name: 'Sonhos Claros', icon: 'revelacao', side: '', desc: 'A Revelação custa 40 e já vale com 15% da prática.' },
    ventre: { name: 'Ventre Abençoado', icon: 'bebe', side: 'bom', desc: 'Nascem mais filhos, e o parto difícil acontece a metade das vezes.' },
    sentinela: { name: 'Sentinela', icon: 'lobo', side: 'temido', desc: 'O fogo aceso espanta lobo e onça 2 passos mais longe, e as mordidas tiram um quarto a menos.' },
    terra: { name: 'Mão na Terra', icon: 'roca', side: 'bom', desc: 'A roça rende 20% mais, e os arbustos dão fruta 30% mais depressa.' },
    temor: { name: 'Temor Sagrado', icon: 'raio', side: 'temido', desc: 'O povo segue as Vontades com mais força, e ninguém entra em greve.' },
    chama: { name: 'Fé que Aquece', icon: 'deus', side: '', desc: 'Sem sinais, a fé esfria só até 50 (antes, 35), e a fé rende 20% mais Poder.' },
  };
  D.DOM_ORDER = Object.keys(D.DONS);
  D.dom = (S, id) => !!(S && S.god && S.god.dons && S.god.dons.indexOf(id) >= 0);

  // ---------- estado ----------
  D.init = function (S) {
    const g = S.god;
    if (!g) return;
    // save de antes da 0.11: a glória é o Poder que já tem mais o que foi gasto nos milagres (uma conta aproximada)
    if (g.glory === undefined) g.glory = Math.round((g.poder || 0) + (g.miracles || 0) * 20);
    if (!g.lv) g.lv = 1;
    g.dons = g.dons || [];
    g.deeds = g.deeds || {};
    g.pending = g.pending || [];
    g.species = g.species || {};
    g.saber = g.saber || {};
    g.blessings = g.blessings || [];
    if (g.lastSermon === undefined) g.lastSermon = -1e9;
    for (const p of S.people) {
      if (p.sinais === undefined) p.sinais = 0;
      if (p.escolhido === undefined) p.escolhido = null;
    }
    applySpeciesNames(S);
    const st = S.stats;
    st.conversions = st.conversions || 0; st.anointed = st.anointed || 0; st.statues = st.statues || 0;
    st.sermons = st.sermons || 0; st.heals = st.heals || 0; st.rezas = st.rezas || 0; st.greatActs = st.greatActs || 0;
    // save de antes da 0.11 já numa fase adiantada: ganha as missões de Deus das fases que já passou (uma vez)
    if (!st.godMissions) {
      st.godMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of D.missions(f)) if (!S.goals.some((x) => x.id === m.id)) S.goals.push(m);
    }
    lightS = null;
  };

  // ---------- glória e níveis ----------
  D.level = (S) => (S && S.god && S.god.lv) || 1;
  D.levelDef = (lv) => C.GOD_LEVELS[Math.max(0, Math.min(C.GOD_LEVELS.length - 1, (lv || 1) - 1))];
  D.next = (S) => C.GOD_LEVELS[D.level(S)] || null;   // o próximo nível (null no último)
  D.isFiel = (S, p) => p.alive && !p.carriedBy && Fam().age(S, p) >= C.FIEL_AGE && p.fe >= C.FIEL_FE;
  D.fieis = function (S) { let n = 0; for (const p of S.people) if (D.isFiel(S, p)) n++; return n; };
  const LEVEL_TXT = {
    2: (S, n) => 'Com ' + n + ' fiéis rezando, o povo passou a ver Deus como Guardião. Com o nível 2 veio a Bênção.',
    3: (S, n) => D.call(S) + ' virou o Deus do Povo, com ' + n + ' fiéis. Já dá para dar poderes a um escolhido e erguer uma estátua.',
    4: (S) => D.call(S) + ' é agora o Deus Antigo: gerações inteiras rezam para o mesmo céu. Já dá para criar uma espécie nova.',
    5: (S) => D.call(S) + ' é o Deus Maior. Já dá para ensinar ao povo um saber de outra era.',
  };
  function checkLevel(S) {
    const g = S.god, nx = D.next(S);
    if (!nx || g.glory < nx.glory) return false;
    const n = D.fieis(S);
    if (n < nx.fieis) return false;
    g.lv++;
    chron(S, LEVEL_TXT[g.lv] ? LEVEL_TXT[g.lv](S, n) : 'Deus subiu ao nível ' + g.lv + '.');
    S.events.push({ k: 'godLevel', lv: g.lv });
    if (g.lv === 2 && !g.name) giveName(S);
    g.pending.push({ k: 'dom', lv: g.lv, offer: offerDons(S, g.lv) });
    return true;
  }
  D.checkLevel = checkLevel;

  // três dons para escolher, sempre os mesmos para o mesmo mundo; um deles do lado de Deus (bondoso ou temido)
  function offerDons(S, lv) {
    const g = S.god, taken = new Set(g.dons);
    for (const q of g.pending) if (q.k === 'dom') for (const id of q.offer) taken.add(id);
    const pool = D.DOM_ORDER.filter((id) => !taken.has(id)).map((id) => ({ id, h: G.hash2(lv * 97 + D.DOM_ORDER.indexOf(id), 53, S.seed >>> 0) }));
    pool.sort((a, b) => a.h - b.h);
    const out = pool.slice(0, 3).map((o) => o.id);
    const side = g.align > 20 ? 'bom' : g.align < -20 ? 'temido' : '';
    if (side && out.length === 3 && !out.some((id) => D.DONS[id].side === side)) {
      const alt = pool.find((o) => D.DONS[o.id].side === side);
      if (alt) out[2] = alt.id;
    }
    return out;
  }
  // o que espera a escolha do jogador (nome, dom): a interface mostra um de cada vez
  D.pending = (S) => (S.god && S.god.pending && S.god.pending[0]) || null;
  D.chooseDom = function (S, id) {
    const g = S.god, i = g.pending.findIndex((q) => q.k === 'dom');
    if (i < 0 || g.pending[i].offer.indexOf(id) < 0 || !D.DONS[id] || D.dom(S, id)) return false;
    g.pending.splice(i, 1);
    g.dons.push(id);
    const d = D.DONS[id];
    if (d.side === 'bom') God().align(S, 4); else if (d.side === 'temido') God().align(S, -4);   // o povo vê como Deus escolhe
    chron(S, D.call(S) + ' ganhou um dom: ' + d.name + '. ' + d.desc);
    if (id === 'olhos') for (const p of S.people) p.seenTile = -1;   // a névoa se abre já no próximo passo
    S.events.push({ k: 'dom', id });
    return true;
  };

  // ---------- o nome que o povo dá ----------
  const NA = ['A', 'I', 'U', 'Ja', 'Tu', 'Ra', 'Ma', 'Pi', 'Ya', 'Gua', 'Ta', 'Ca', 'Mo', 'Ibi', 'Ara', 'Na', 'Po', 'Cau'];
  const NB = ['ra', 'ci', 'ta', 'na', 'ru', 'ma', 'bi', 'ri', 'po', 'je', 'ne', 'ja', 'mi', 'to'];
  const NE = ['pã', 'rê', 'cy', 'tã', 'ú', 'ná', 'ri', 'mã', 'bá', 'í', 'rú', 'tê', 'guá'];
  // um nome inventado, sempre o mesmo para o mesmo mundo e a mesma vez (k): nada de nome de gente do povo
  D.makeGodName = function (S, k) {
    const seed = S.seed >>> 0;
    for (let t = 0; t < 60; t++) {
      const h = (i) => G.hash2((k || 0) * 131 + t * 17 + i, 911, seed);
      const n0 = NA[Math.floor(h(1) * NA.length)] + (h(2) < 0.55 ? NB[Math.floor(h(3) * NB.length)] : '') + NE[Math.floor(h(4) * NE.length)];
      const n = n0.charAt(0).toUpperCase() + n0.slice(1).toLowerCase();
      const pl = plain(n);
      if (n.length < 4 || n.length > 9 || /([aeiou])\1/.test(pl) || /[aeiou]{3}/.test(pl) || pl === 'tupa') continue;
      if (S.people.some((p) => plain(p.name) === pl)) continue;
      return n;
    }
    return 'Arapã';
  };
  // o título vem do que Deus mais fez (e de como o povo o vê: bondoso ou temido)
  const EPI = {
    calor: ['Aquele que Aquece', 'O Fogo que Vigia'], raio: ['O que Espanta a Fera', 'Senhor do Trovão'],
    chuva: ['Pai da Chuva', 'O que Segura as Nuvens'], cura: ['O que Cura', 'O que Dá e Tira a Vida'],
    revelacao: ['O que Sopra nos Sonhos', 'O que Tudo Sabe'], bencao: ['O que Abençoa a Terra', 'O Dono da Colheita'],
    oracao: ['O que Ouve', 'O que Vigia'], silencio: ['O Silencioso', 'O Silencioso'],
  };
  D.deedOf = function (S) {
    const d = (S.god && S.god.deeds) || {};
    let best = null, bn = 0;
    for (const k of ['calor', 'raio', 'chuva', 'cura', 'revelacao', 'bencao']) if ((d[k] || 0) > bn) { bn = d[k]; best = k; }
    if (best) return best;
    return (S.god && S.god.answered) > 0 ? 'oracao' : 'silencio';
  };
  D.epithetFor = (S) => EPI[D.deedOf(S)][S.god.align < -10 ? 1 : 0];
  D.call = (S) => (S && S.god && S.god.name) || 'Deus';
  // quem começou a chamar Deus pelo nome: quem tem mais fé (de 7 anos para cima)
  function namer(S) {
    return S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 7).sort((a, b) => b.fe - a.fe || a.born - b.born)[0] || null;
  }
  function giveName(S) {
    const g = S.god;
    g.nameRoll = 0;
    g.name = D.makeGodName(S, 0);
    g.epithet = D.epithetFor(S);
    const by = namer(S);
    g.namedBy = by ? by.name : ''; g.namedAt = S.t;
    chron(S, 'O povo deu um nome a Deus: ' + g.name + ', ' + g.epithet + '.' + (by ? ' Quem começou a chamar assim foi ' + by.name + ', que mais rezava.' : ''));
    g.pending.unshift({ k: 'nome' });
    S.events.push({ k: 'godName' });
  }
  D.giveName = giveName;
  // o jogador pode trocar o nome (a Crônica muda junto)
  D.rename = function (S, name) {
    const g = S.god;
    name = String(name || '').replace(/[<>"&]/g, '').trim().slice(0, 16);
    if (!name || !g.name || name === g.name) return false;
    const old = g.name;
    g.name = name;
    for (const c of S.chron) if (c.god && c.text.indexOf(old) >= 0) c.text = c.text.split(old).join(name);
    return true;
  };
  D.rollName = function (S) {
    const g = S.god;
    if (!g.name) return '';
    g.nameRoll = (g.nameRoll || 0) + 1;
    return D.makeGodName(S, g.nameRoll);
  };
  D.acceptName = function (S, name) {
    const g = S.god, i = g.pending.findIndex((q) => q.k === 'nome');
    if (i >= 0) g.pending.splice(i, 1);
    if (name) D.rename(S, name);
    return true;
  };

  // ---------- céticos que se convertem ----------
  // o cético junta sinais (milagre visto de perto, oração atendida, cura, pregação, sonho); com sinais e fé bastantes, vira devoto
  D.sinal = function (S, p, kind) {
    if (!p || !p.alive || !has(p, 'Cético')) return false;
    if (kind === 'milagre') { if (p.sinalDay !== undefined && S.ck.day - p.sinalDay < 2) return false; p.sinalDay = S.ck.day; }
    p.sinais = (p.sinais || 0) + (C.SINAL[kind] || 1);
    return tryConvert(S, p);
  };
  function tryConvert(S, p) {
    if ((p.sinais || 0) < C.CONVERTE_SINAIS || p.fe < C.CONVERTE_FE) return false;
    const i = p.traits.indexOf('Cético');
    if (i < 0) return false;
    p.traits[i] = 'Devoto';
    p.sinais = 0;
    S.stats.conversions = (S.stats.conversions || 0) + 1;
    Sim().addMem(S, p, 'converteu');
    if (S.stats.conversions === 1) chron(S, p.name + ', que nunca tinha acreditado, viu sinais demais e se converteu: agora é devot' + oa(p) + ' de ' + D.call(S) + '.');
    else Sim().toast(S, p.name + ' se converteu: agora é devot' + oa(p) + ' de ' + D.call(S) + '.', 'good');
    S.events.push({ k: 'converte', pid: p.id, x: p.x, y: p.y });
    God().faith(S, p, 10);
    return true;
  }
  D.tryConvert = tryConvert;

  // ---------- o escolhido ----------
  D.POWERS = {
    cura: { name: 'Mãos que curam', icon: 'cura', desc: 'Vai até quem está doente ou num parto difícil e cura com as mãos. Cada cura gasta ' + C.ESCOLHIDO_CURA + ' de Poder e atende a oração.' },
    palavra: { name: 'Palavra', icon: 'reza', desc: 'A cada 2 dias, de tardinha, prega ao pé do fogo: a fé de quem ouve sobe, e os céticos veem sinais.' },
    luz: { name: 'Luz', icon: 'verao', desc: 'Brilha como fogo aceso: lobo e onça não chegam perto, e quem está do lado se aquece.' },
  };
  const TITLES = { cura: ['Curandeira', 'Curandeiro'], palavra: ['Profetisa', 'Profeta'], luz: ['Guardiã', 'Guardião'] };
  D.title = (p) => (p && p.escolhido && TITLES[p.escolhido.power] ? TITLES[p.escolhido.power][ela(p) ? 0 : 1] : '');
  D.escolhidos = (S) => S.people.filter((p) => p.alive && p.escolhido);
  D.slots = (S) => C.ESCOLHIDOS[D.level(S)] || 0;
  // fé inteira: 100 agora, ou chegou a 100 nos últimos dias e ainda está perto
  D.full100 = (S, p) => p.fe >= 99.5 || (p.fe100At !== undefined && S.t - p.fe100At < C.FE100_DAYS * DAY() && p.fe >= 90);
  D.candidates = (S) => S.people.filter((p) => p.alive && !p.carriedBy && !p.escolhido && Fam().age(S, p) >= C.UNGIR_AGE && D.full100(S, p));
  D.anointWhy = function (S, p) {
    if (D.level(S) < 3) return 'chega com o nível 3 de Deus';
    if (!p || !p.alive || p.carriedBy) return 'escolha alguém do povo';
    if (p.escolhido) return 'já é ' + low1(D.title(p));
    if (Fam().age(S, p) < C.UNGIR_AGE) return 'precisa ter ' + C.UNGIR_AGE + ' anos';
    if (!D.full100(S, p)) return 'precisa chegar à fé inteira (100)';
    const n = D.escolhidos(S).length, max = D.slots(S);
    if (n >= max) return max === 1 ? 'já há um escolhido (no nível 4, dois)' : 'já há ' + max + ' escolhidos (o máximo neste nível)';
    if (S.god.poder < C.UNGIR_COST) return 'falta Poder: precisa de ' + C.UNGIR_COST;
    return '';
  };
  D.anoint = function (S, p, power) {
    if (!D.POWERS[power] || D.anointWhy(S, p)) return false;
    S.god.poder -= C.UNGIR_COST;
    p.escolhido = { power, t: S.t };
    S.stats.anointed = (S.stats.anointed || 0) + 1;
    const dela = ela(p) ? 'dela' : 'dele', a = oa(p);
    const what = { cura: 'pôs nas mãos ' + dela + ' o dom de curar', palavra: 'deu a ' + (ela(p) ? 'ela' : 'ele') + ' a Palavra', luz: (ela(p) ? 'a' : 'o') + ' encheu de luz' }[power];
    chron(S, D.call(S) + ' escolheu ' + p.name + ' e ' + what + '. Agora ' + p.name + ' é ' + a + ' ' + low1(D.title(p)) + ' do povo.');
    Sim().addMem(S, p, 'escolhido');
    for (const q of S.people) if (q.alive && q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 10) { God().faith(S, q, 4); Sim().addMem(S, q, 'viuMilagre'); }
    Sim().say(S, p, 'Eu sinto… ' + D.call(S) + ' está comigo.', true, 'god');
    S.events.push({ k: 'ungir', pid: p.id, x: p.x, y: p.y });
    return true;
  };
  // a graça vai embora quando a fé esfria (e o dom vai junto)
  function loseGrace(S, p) {
    const what = { cura: 'o dom de curar', palavra: 'a Palavra', luz: 'a luz' }[p.escolhido.power];
    p.escolhido = null; p.graceLost = S.t;
    chron(S, 'A fé de ' + p.name + ' esfriou, e com ela foi-se ' + what + '. ' + D.call(S) + ' pode escolher outra pessoa.');
  }
  // Mãos que curam: quem precisa (doente ou num parto difícil), o mais perto, que ninguém esteja curando
  D.needsHeal = (S, t) => !!(t && t.alive && ((t.labor && t.labor.hard && !t.labor.helped) || (t.needs.saude < 35 && !(t.healedAt && S.t - t.healedAt < 12 * 60))));
  D.healTarget = function (S, p) {
    if (!p.escolhido || p.escolhido.power !== 'cura' || S.safe || S.god.poder < C.ESCOLHIDO_CURA) return null;
    let best = null, bd = 60;
    for (const t of S.people) {
      if (t === p || !D.needsHeal(S, t)) continue;
      if (S.people.some((q) => q !== p && q.alive && q.act && q.act.type === 'curar' && q.act.tgt === t.id)) continue;
      const c = t.carriedBy ? Fam().person(S, t.carriedBy) || t : t;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };
  const HEAL_SAY = ['Levanta. {n} está com você.', 'Que a luz de {n} te cure.', 'Respira fundo. Já passou.'];
  D.heal = function (S, p, t) {
    if (S.god.poder < C.ESCOLHIDO_CURA || !D.needsHeal(S, t)) return false;
    S.god.poder -= C.ESCOLHIDO_CURA;
    const wasLabor = !!(t.labor && t.labor.hard && !t.labor.helped);
    t.needs.saude = Math.min(100, t.needs.saude + C.ESCOLHIDO_HEAL);
    if (t.labor) t.labor.helped = true;
    t.dmg.raio = 0; t.dmg.parto = 0;
    t.healedAt = S.t;
    Sim().addMem(S, t, 'curado');
    D.sinal(S, t, 'curado');
    God().faith(S, t, 6);
    God().answerTarget(S, ['parto', 'doente'], t.id);
    S.stats.heals = (S.stats.heals || 0) + 1;
    Sim().say(S, p, HEAL_SAY[S.stats.heals % HEAL_SAY.length].replace('{n}', D.call(S)), true, 'god');
    if (S.stats.heals === 1) chron(S, 'Pela primeira vez, ' + p.name + ' curou com as mãos: ' + t.name + (wasLabor ? ' passou pelo parto sem perigo.' : ' se levantou.'));
    const c = t.carriedBy ? Fam().person(S, t.carriedBy) || t : t;
    S.events.push({ k: 'miracle', kind: 'cura', x: Math.floor(c.x), y: Math.floor(c.y) });
    return true;
  };
  // Palavra: a pregação de tardinha (é uma história ao pé do fogo, com outras falas)
  D.sermonDue = (S, p) => !!(p && p.escolhido && p.escolhido.power === 'palavra' && !S.safe && S.t - (S.god.lastSermon || -1e9) >= C.SERMAO_GAP_D * DAY());
  const SERMAO = [
    (n) => ['Sentem aqui. Hoje eu vou falar de ' + n + '.', n + ' ouve cada um de vocês, até quem não acredita.', 'Rezem, e ninguém fica sozinho no escuro.'],
    (n) => ['Eu vi ' + n + ' num sonho, e ele me disse uma coisa.', 'Que cuidar uns dos outros é o jeito de rezar.', 'Guardem isso no peito.'],
    (n) => ['Lembram do inverno? Quem segurou a gente foi ' + n + '.', 'Ele não esquece de ninguém.', 'Agradeçam antes de dormir.'],
    (n, e) => (e ? ['Chamam ' + n + ' de ' + e + '.', 'E é mesmo: eu sinto isso todo dia.', 'Que a fé de vocês seja o fogo desta aldeia.'] : null),
    (n) => ['Quem duvida, olha pro céu hoje à noite.', 'Cada estrela é um olho de ' + n + '.', 'Ninguém aqui está sozinho.'],
  ];
  D.sermonLines = function (S) {
    const n = D.call(S), e = S.god.epithet ? low1(S.god.epithet) : '';
    const k = (S.stats.sermons || 0) % SERMAO.length;
    return SERMAO[k](n, e) || SERMAO[0](n, e);
  };
  D.sermonCall = (S) => 'Venham ouvir a palavra de ' + D.call(S) + '.';
  // noite de pregação: nos primeiros 45 minutos da tardinha, a vez é do profeta (depois, qualquer um conta história)
  D.sermonFirst = (S, p) => S.ck.hour < 18.25 && S.people.some((q) => q !== p && q.alive && !q.carriedBy && !q.labor && !q.sleeping && D.sermonDue(S, q) &&
    ((S.life && S.life.story && S.life.story.teller === q.id) || (() => { const f = G.Life.campFire(S, true); return !!f && Math.hypot(f.x + 0.5 - q.x, f.y + 0.5 - q.y) < C.SERMAO_LONGE; })()));
  D.onSermon = function (S, p, heard) {
    S.god.lastSermon = S.t;
    for (const q of heard) { God().faith(S, q, C.SERMAO_FE); D.sinal(S, q, 'sermao'); Sim().addMem(S, q, 'ouviuSermao'); }
    God().gain(S, heard.length * C.SERMAO_PODER);
    S.stats.sermons = (S.stats.sermons || 0) + 1;
    if (S.stats.sermons === 1) chron(S, 'Pela primeira vez, ' + p.name + ' pregou ao pé do fogo, falando de ' + D.call(S) + ', e ' + Sim().listNames(heard) + (heard.length > 1 ? ' ouviram.' : ' ouviu.'));
  };
  // Luz (e a estátua do fogo): um calor que espanta fera, como o fogo aceso
  let lightS = null, lightT = -1, lightList = [];
  D.lights = function (S) {
    if (lightS === S && lightT === S.t) return lightList;
    lightS = S; lightT = S.t; lightList = [];
    for (const p of S.people) if (p.alive && p.escolhido && p.escolhido.power === 'luz' && !p.inTent && !p.carriedBy) lightList.push({ x: p.x, y: p.y, r: C.LUZ_R, heat: C.LUZ_HEAT, pid: p.id });
    for (const b of S.buildings) {
      if (b.type !== 'estatua' || !b.built || b.milagre !== 'fogo') continue;
      lightList.push({ x: b.x + 1, y: b.y + 1, r: C.ESTATUA_R * Sim().def(b).god.reach, heat: C.ESTATUA_HEAT, bid: b.id });
    }
    return lightList;
  };
  D.heatAt = function (S, x, y) {
    let best = 0;
    for (const L of D.lights(S)) {
      const d = Math.hypot(L.x - x, L.y - y);
      if (d <= L.r) best = Math.max(best, L.heat * (d < L.r * 0.6 ? 1 : (L.r - d) / (L.r * 0.4)));
    }
    return best;
  };

  // ---------- Bênção ----------
  D.blessAt = function (S, x, y) {
    const bl = S.god && S.god.blessings;
    if (!bl || !bl.length) return 1;
    for (const b of bl) if (b.until > S.t && Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) <= b.r) return C.BENCAO_MULT;
    return 1;
  };

  // ---------- a estátua ----------
  D.MILAGRES = {
    fogo: { name: 'Fogo', icon: 'fogo', desc: 'Aquece em volta dela, dia e noite, e lobo e onça não chegam perto.' },
    chuva: { name: 'Chuva', icon: 'chuva', desc: 'A cada 8 dias chama a chuva: frutas, água no estoque e a roça crescendo.' },
    cura: { name: 'Cura', icon: 'cura', desc: 'Todo dia de manhã cura quem está mais fraco por perto, e parto perto dela nunca é difícil.' },
    trovao: { name: 'Trovão', icon: 'raio', desc: 'Quando lobo ou onça chegam perto, um raio cai sobre eles (uma vez por noite).' },
  };
  D.statues = (S) => S.buildings.filter((b) => b.type === 'estatua' && b.built);
  D.buildWhy = function (S, type) {
    if (type !== 'estatua') return '';
    if (D.level(S) < C.ESTATUA_LV) return 'chega com o nível ' + C.ESTATUA_LV + ' de Deus';
    const n = S.buildings.filter((b) => b.type === 'estatua').length, max = C.ESTATUAS[D.level(S)] || 0;
    if (n >= max) return max === 1 ? 'uma estátua por enquanto (no nível 4, duas)' : 'no nível ' + D.level(S) + ', até ' + max + ' estátuas';
    return '';
  };
  D.consecrateWhy = function (S, b, kind) {
    if (!b || b.type !== 'estatua' || !b.built) return 'a estátua ainda não está pronta';
    if (b.milagre) return 'já foi consagrada';
    if (!D.MILAGRES[kind]) return 'milagre desconhecido';
    if (D.statues(S).some((x) => x !== b && x.milagre === kind)) return 'outra estátua já tem esse milagre';
    if (S.god.poder < C.CONSAGRAR_COST) return 'falta Poder: precisa de ' + C.CONSAGRAR_COST;
    return '';
  };
  const CONSAGRA_TXT = {
    fogo: 'o milagre do fogo: aquece em volta dela, dia e noite, e fera nenhuma chega perto',
    chuva: 'o milagre da chuva: de tempos em tempos, ela chama a chuva sozinha',
    cura: 'o milagre da cura: de manhã, cura quem está mais fraco por perto',
    trovao: 'o milagre do trovão: fera que chega perto leva um raio',
  };
  D.consecrate = function (S, b, kind) {
    if (D.consecrateWhy(S, b, kind)) return false;
    S.god.poder -= C.CONSAGRAR_COST;
    b.milagre = kind; b.milagreAt = S.t; b.lastRain = S.t;
    S.stats.statues = (S.stats.statues || 0) + 1;
    chron(S, (S.stats.statues === 1 ? 'A primeira estátua de ' : 'Uma estátua de ') + D.call(S) + ' foi consagrada com ' + CONSAGRA_TXT[kind] + '.');
    for (const q of S.people) if (q.alive && Math.hypot(q.x - b.x - 1, q.y - b.y - 1) < 12) { God().faith(S, q, 5); Sim().addMem(S, q, 'viuMilagre'); D.sinal(S, q, 'milagre'); }
    God().align(S, kind === 'trovao' ? -3 : 3);
    S.events.push({ k: 'miracle', kind: 'consagrar', x: b.x + 1, y: b.y + 1 });
    lightS = null;
    return true;
  };
  D.reach = (S, b) => ((Sim().def(b).god || { reach: 1 }).reach || 1);
  // parto perto da estátua da cura nunca é difícil
  D.safeBirth = function (S, w) {
    for (const b of D.statues(S)) if (b.milagre === 'cura' && Math.hypot(w.x - b.x - 1, w.y - b.y - 1) <= C.ESTATUA_CURA_R * D.reach(S, b)) return true;
    return false;
  };
  function statueHour(S) {
    const h = Math.floor(S.ck.hour), Sm = Sim();
    for (const b of D.statues(S)) {
      if (!b.milagre) continue;
      const reach = D.reach(S, b), cx = b.x + 1, cy = b.y + 1;
      if (b.milagre === 'chuva' && h === 10 && S.t - (b.lastRain || 0) >= Math.round(C.ESTATUA_CHUVA_D / reach) * DAY() - 90) {
        b.lastRain = S.t;
        const r = God().cast(S, 'chuva', b.x, b.y, true);
        S.stats.statueRains = (S.stats.statueRains || 0) + 1;
        if (!S.safe) {
          if (S.stats.statueRains === 1) chron(S, 'A estátua de ' + D.call(S) + ' chamou a chuva sozinha. ' + (r && r.msg ? r.msg : ''));
          else Sm.toast(S, 'A estátua de ' + D.call(S) + ' chamou a chuva.', 'good');
        }
      }
      if (b.milagre === 'cura' && h === 6) {
        let best = null;
        for (const p of S.people) {
          if (!p.alive || p.needs.saude >= 70) continue;
          if (Math.hypot(p.x - cx, p.y - cy) > C.ESTATUA_CURA_R * reach) continue;
          if (!best || p.needs.saude < best.needs.saude) best = p;
        }
        if (best) {
          const low = best.needs.saude < 40;
          best.needs.saude = Math.min(100, best.needs.saude + C.ESTATUA_CURA);
          best.dmg.raio = 0; best.dmg.parto = 0;
          Sm.addMem(S, best, 'curado'); D.sinal(S, best, 'curado');
          God().answerTarget(S, ['doente'], best.id);
          S.stats.statueHeals = (S.stats.statueHeals || 0) + 1;
          if (!S.safe && low) Sm.toast(S, 'A estátua de ' + D.call(S) + ' curou ' + best.name + ' durante a noite.', 'good');
          S.events.push({ k: 'miracle', kind: 'cura', x: Math.floor(best.x), y: Math.floor(best.y) });
        }
      }
    }
  }
  // o trovão da estátua: olha de 10 em 10 minutos se há fera por perto (um raio por noite)
  let tickAcc = 0, tickS = null;
  D.tick = function (S, dt) {
    if (tickS !== S) { tickS = S; tickAcc = 0; }
    tickAcc += dt;
    if (tickAcc < 10) return;
    tickAcc = 0;
    const N = G.Narr;
    if (!N || !S.narr || !S.narr.ents.length) return;
    const night = Math.floor((S.t - 12 * 60) / DAY());
    for (const b of D.statues(S)) {
      if (b.milagre !== 'trovao' || b.boltNight === night) continue;
      const R = C.ESTATUA_TROVAO_R * D.reach(S, b), cx = b.x + 1, cy = b.y + 1;
      const e = S.narr.ents.find((x) => (x.k === 'lobo' || x.k === 'onca') && !x.gone && !x.hidden && x.state !== 'embora' && Math.hypot(x.x - cx, x.y - cy) <= R);
      if (!e) continue;
      b.boltNight = night;
      const fx = Math.floor(e.x), fy = Math.floor(e.y);
      S.events.push({ k: 'bolt', x: fx, y: fy });
      const msg = N.onRaio(S, fx, fy);
      S.stats.statueBolts = (S.stats.statueBolts || 0) + 1;
      if (!S.safe) {
        if (S.stats.statueBolts === 1) chron(S, 'Um raio saiu da estátua de ' + D.call(S) + ' e caiu sobre ' + (e.k === 'onca' ? 'a onça' : 'o lobo') + ' que rondava. ' + (msg || ''));
        else Sim().toast(S, 'A estátua de ' + D.call(S) + ' mandou um raio. ' + (msg || ''), 'good');
      }
    }
  };
  // a estátua pronta: falta consagrar (o jogador escolhe o milagre dela)
  D.onBuilt = function (S, b) {
    if (b.type !== 'estatua') return false;
    const n = S.buildings.filter((x) => x.type === 'estatua' && x.built).length;
    chron(S, (n === 1 ? 'Ergueram a primeira estátua de ' : 'Ergueram mais uma estátua de ') + D.call(S) + ' em pedra. Toque nela para consagrar com um milagre próprio.');
    S.events.push({ k: 'estatua', bid: b.id, x: b.x + 1, y: b.y + 1 });
    return true;
  };
  // reza da manhã ao pé da estátua (quem tem fé)
  D.wantPray = function (S, p) {
    const h = S.ck.hour;
    if (h < 6 || h >= 8.5 || p.prayedDay === S.ck.day || p.carriedBy || p.labor || p.sleeping || p.fe < 60 || Fam().age(S, p) < 7) return 0;
    if (!S.buildings.some((b) => b.type === 'estatua' && b.built)) return 0;
    if (G.Narr && (G.Narr.beastsOut(S) || G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade'))) return 0;
    if (p.needs.fome < 30 || p.needs.sede < 30 || p.needs.calor < 30 || p.needs.energia < 20) return 0;
    return 34 + (has(p, 'Devoto') ? 8 : 0) + (p.escolhido ? 10 : 0);
  };
  D.prayerStatue = function (S, p) {
    let best = null, bd = 40;
    for (const b of D.statues(S)) { const d = Math.hypot(b.x + 1 - p.x, b.y + 1 - p.y); if (d < bd) { bd = d; best = b; } }
    return best;
  };
  const MORNING = ['{n}, cuida da gente hoje.', 'Obrigad{a} pela noite, {n}.', '{n}, dá força pro trabalho.', 'Bom dia, {n}.'];
  D.prayLine = (S, p, k) => MORNING[k % MORNING.length].replace('{n}', D.call(S)).replace('{a}', oa(p));
  D.onPrayed = function (S, p, b) {
    p.prayedDay = S.ck.day;
    God().faith(S, p, C.REZA_FE * (Sim().def(b).god.reza || 1));
    God().gain(S, C.REZA_PODER);
    if (G.Minas && !S.resumido) G.Minas.offer(S, p, b);   // Etapa 12: a oferenda do que brilha (uma por estátua por dia)
    Sim().addMem(S, p, 'rezou');
    S.stats.rezas = (S.stats.rezas || 0) + 1;
    if (S.stats.rezas === 1) chron(S, 'Pela primeira vez, ' + p.name + ' rezou de manhã ao pé da estátua de ' + D.call(S) + '.');
  };

  // ---------- espécie nova ----------
  D.FORMS = {
    bicho: { name: 'Um bicho', icon: 'criatura', def: 'Luzeiro', desc: 'Um bicho manso pasta perto da aldeia: dá cria depressa e rende muita carne e couro na caça.' },
    peixe: { name: 'Um peixe', icon: 'peixeDeus', def: 'Lumiar', desc: 'Um peixe novo enche os rios e lagos: a pesca rende 35% mais.' },
    arvore: { name: 'Uma árvore', icon: 'arvoreDeus', def: 'Pé-de-luz', desc: 'Seis árvores nascem perto da aldeia e dão fruta o ano todo, até no inverno.' },
  };
  D.species = (S, form) => (S && S.god && S.god.species && S.god.species[form]) || null;
  D.speciesWhy = function (S, form) {
    if (D.level(S) < C.ESPECIE_LV) return 'chega com o nível ' + C.ESPECIE_LV + ' de Deus';
    if (!D.FORMS[form]) return 'forma desconhecida';
    if (D.species(S, form)) return 'já criada';
    if (S.god.poder < C.ESPECIE_COST) return 'falta Poder: precisa de ' + C.ESPECIE_COST;
    return '';
  };
  const cleanName = (n) => String(n || '').replace(/[<>"&]/g, '').trim().slice(0, 18);
  // o artigo do bicho criado ("um luzeiro", "uma lumiara")
  const artOf = (name) => (/a$/i.test(plain(name)) ? 'uma ' : 'um ') + name.toLowerCase();
  function applySpeciesNames(S) {
    const cr = C.BICHOS.criatura, b = S.god && S.god.species && S.god.species.bicho;
    if (!cr) return;
    cr.name = b ? b.name : D.FORMS.bicho.def;
    cr.art = artOf(cr.name);
  }
  D.createSpecies = function (S, form, name) {
    if (D.speciesWhy(S, form)) return false;
    const f = D.FORMS[form];
    name = cleanName(name) || f.def;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    S.god.poder -= C.ESPECIE_COST;
    S.god.species[form] = { name, t: S.t };
    S.stats.greatActs = (S.stats.greatActs || 0) + 1;
    const n = D.call(S);
    if (form === 'bicho') {
      applySpeciesNames(S);
      const herds = G.Fauna ? G.Fauna.addHerds(S, 'criatura', 2) : 0;
      chron(S, n + ' criou um bicho que o mundo nunca tinha visto: ' + artOf(name) + '. Pasta manso perto da aldeia' + (herds ? '' : ' (quando achar lugar)') + ', e a caça dele rende muito.');
    } else if (form === 'peixe') {
      chron(S, n + ' encheu os rios e lagos de um peixe novo, ' + artOf(name) + '. A pesca vai render mais.');
    } else {
      const k = plantTrees(S);
      chron(S, n + ' fez nascer ' + k + ' árvores novas perto da aldeia: ' + name.toLowerCase() + '. Dão fruta o ano todo, até no inverno.');
    }
    for (const q of S.people) if (q.alive) { God().faith(S, q, 5); Sim().addMem(S, q, 'viuMilagre'); }
    God().align(S, 4);
    S.events.push({ k: 'miracle', kind: 'criar', form, x: S.camp.x + 1, y: S.camp.y + 1 });
    return true;
  };
  // as árvores de Deus: arbustos de fruto (holy) em volta da aldeia, onde há lugar livre e já visto
  function plantTrees(S) {
    const w = S.world, cx = S.camp.x + 1, cy = S.camp.y + 1, seed = S.seed >>> 0;
    const holy = [];
    for (let k = 0; k < 600 && holy.length < C.ARVORE_N; k++) {
      const a = G.hash2(k, 7, seed) * Math.PI * 2, d = 5 + G.hash2(k, 11, seed) * (8 + k / 60);
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (x < 2 || y < 2 || x >= w.W - 2 || y >= w.H - 2) continue;
      const i = y * w.W + x;
      if (G.IS_WATER[w.tile[i]] || w.block[i] || w.bgrid[i] >= 0 || G.W.objAt(w, i) || Sim().isCamp(S, i)) continue;
      if ((w.road && (w.road[i] || w.roadJob[i])) || (w.fence && (w.fence[i] || w.fenceJob[i])) || (S.seen && !S.seen[i])) continue;
      if (holy.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2)) continue;
      holy.push(G.W.addObj(w, 'bush', x, y, { v: holy.length % 3, fruit: 3, grow: 0, holy: 1 }));
    }
    return holy.length;
  }
  D.plantTrees = plantTrees;

  // ---------- conhecimento avançado ----------
  D.SABERES = {
    roda: { name: 'A roda', icon: 'roda', desc: 'O carrinho de mão: cada um carrega 40% a mais, e obras e caminhos saem 25% mais rápidos.' },
    escrita: { name: 'A escrita', icon: 'escrita', desc: 'O saber fica escrito: todos aprendem metade mais rápido, as histórias ensinam o dobro, e as descobertas andam 25% mais depressa.' },
    medicina: { name: 'A medicina', icon: 'medicina', desc: 'Ervas e cuidado: o parto difícil cai à metade, a saúde volta metade mais rápido e a velhice chega mais tarde.' },
  };
  D.saber = (S, id) => !!(S && S.god && S.god.saber && S.god.saber[id]);
  D.saberWhy = function (S, id) {
    if (D.level(S) < C.SABER_LV) return 'chega com o nível ' + C.SABER_LV + ' de Deus';
    if (!D.SABERES[id]) return 'saber desconhecido';
    if (D.saber(S, id)) return 'o povo já sabe';
    if (S.god.poder < C.SABER_COST) return 'falta Poder: precisa de ' + C.SABER_COST;
    return '';
  };
  const SABER_TXT = {
    roda: 'uma roda que gira num eixo, e com ela o carrinho de mão',
    escrita: 'riscos que guardam as palavras: a escrita',
    medicina: 'as ervas que curam e o jeito de cuidar de quem está doente: a medicina',
  };
  D.grantSaber = function (S, id) {
    if (D.saberWhy(S, id)) return false;
    S.god.poder -= C.SABER_COST;
    S.god.saber[id] = S.t;
    S.stats.greatActs = (S.stats.greatActs || 0) + 1;
    const by = namer(S);
    chron(S, 'Numa noite, o povo inteiro sonhou o mesmo sonho: ' + D.call(S) + ' mostrou ' + SABER_TXT[id] + '. É um saber de outra era.' + (by ? ' ' + by.name + ' foi ' + (ela(by) ? 'a primeira' : 'o primeiro') + ' a acordar e contar.' : ''));
    for (const q of S.people) if (q.alive) { Sim().addMem(S, q, 'aprendeu'); God().faith(S, q, 5); }
    God().align(S, 2);
    S.events.push({ k: 'miracle', kind: 'saber', id, x: S.camp.x + 1, y: S.camp.y + 1 });
    return true;
  };

  // ---------- missões ----------
  D.missions = function (phase) {
    if (phase === 2) return [{ id: 'g_nivel2', text: 'Chegue ao nível 2 de Deus', opt: true, reward: 6, done: false }];
    if (phase === 3) return [
      { id: 'g_converte', text: 'Converta um cético', opt: true, reward: 8, done: false },
      { id: 'g_nivel3', text: 'Chegue ao nível 3 de Deus', opt: true, reward: 8, done: false },
    ];
    if (phase === 4) return [
      { id: 'g_escolhido', text: 'Dê poderes a um escolhido', opt: true, reward: 10, done: false },
      { id: 'g_estatua', text: 'Consagre uma estátua', opt: true, reward: 10, done: false },
      { id: 'g_ato', text: 'Crie uma espécie ou ensine um saber de outra era', opt: true, reward: 15, done: false },
    ];
    return [];
  };
  D.goalTest = {
    g_nivel2: (S) => D.level(S) >= 2,
    g_nivel3: (S) => D.level(S) >= 3,
    g_converte: (S) => (S.stats.conversions || 0) > 0,
    g_escolhido: (S) => (S.stats.anointed || 0) > 0,
    g_estatua: (S) => (S.stats.statues || 0) > 0,
    g_ato: (S) => Object.keys(S.god.species || {}).length + Object.keys(S.god.saber || {}).length > 0,
  };

  // ---------- ganchos ----------
  D.hourly = function (S) {
    const g = S.god;
    if (!g || !g.pending) return;
    if (g.blessings.length && g.blessings.some((b) => b.until <= S.t)) g.blessings = g.blessings.filter((b) => b.until > S.t);
    checkLevel(S);
    statueHour(S);
    // alguém chegou à fé inteira e cabe um escolhido: avisa (uma vez a cada 10 dias por pessoa)
    if (!S.safe && D.level(S) >= 3 && D.escolhidos(S).length < D.slots(S)) {
      for (const p of D.candidates(S)) {
        if (p.fe100Told && S.t - p.fe100Told < 10 * DAY()) continue;
        p.fe100Told = S.t;
        Sim().toast(S, p.name + ' chegou à fé inteira. Em Deus, você pode dar poderes a ' + (ela(p) ? 'ela' : 'ele') + '.', 'good');
        S.events.push({ k: 'fe100', pid: p.id });
        break;
      }
    }
  };
  D.daily = function (S) {
    for (const p of S.people) if (p.alive && p.escolhido && p.fe < C.GRACA_FE) loseGrace(S, p);
  };
  D.onDeath = function (S, p) {
    if (!p.escolhido || S.safe) return;
    const what = { cura: 'o dom de curar', palavra: 'a Palavra', luz: 'a luz' }[p.escolhido.power];
    Sim().toast(S, 'Com ' + p.name + ' foi-se também ' + what + '. ' + D.call(S) + ' pode escolher outra pessoa.', 'warn');
  };
  // efeitos lidos pelos outros módulos
  D.seeR = (S) => C.SEE_R * (D.dom(S, 'olhos') ? C.DOM.olhosMult : 1);
  D.pratMult = (S) => (D.saber(S, 'escrita') ? C.ESCRITA_PRAT : 1);
})(globalThis.G = globalThis.G || {});
