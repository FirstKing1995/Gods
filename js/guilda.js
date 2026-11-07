/* Gods · 0.37: a taberna e a guilda de aventureiros. A taberna junta o povo à noite: o descontentamento cresce menos e
   mais gente acorda para a aventura. A guilda põe missões no quadro; quem já despertou forma grupo, sai pela beira do
   mapa e volta dias depois com prêmio e história, ou ferido, ou não volta. Cada aventureiro tem um rank pela força:
   Ferro, Bronze, Prata, Ouro, Platina e Lenda. Você segue sendo Deus: não escolhe quem vai, mas pode mandar um sonho
   (o grupo sai hoje) ou cobrir um grupo com a sua proteção (mais chance, e ninguém morre).
   Nada aqui gasta o S.rng: o sorteio é próprio, para não mudar o resto da história do mundo. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Gu = G.Guilda = {};
  const Sim = () => G.Sim, Fam = () => G.Family, R = () => G.Rpg, So = () => G.Soc;
  const DAY = () => C.DAY_MIN;

  Gu.RANKS = [
    { nome: 'Ferro', min: 1, cor: '#a4adb6' }, { nome: 'Bronze', min: 5, cor: '#c87a3e' }, { nome: 'Prata', min: 12, cor: '#dfe6ee' },
    { nome: 'Ouro', min: 25, cor: '#fee761' }, { nome: 'Platina', min: 40, cor: '#9fe8ff' }, { nome: 'Lenda', min: 55, cor: '#ff8ad0' },
  ];
  Gu.rankDe = (nv) => { let k = 0; for (let i = 0; i < Gu.RANKS.length; i++) if (nv >= Gu.RANKS[i].min) k = i; return k; };
  Gu.rank = (p) => (R() && R().de(p) ? Gu.RANKS[Gu.rankDe(p.rpg.nv)] : null);
  // rank: o da missão (quem vai precisa somar a força); dias: quanto dura; risco: o perigo de base; premio: o que traz
  Gu.TIPOS = {
    matilha: { nome: 'Espantar a matilha do vale', rank: 0, dias: [3, 6], risco: 0.1, premio: { carne: 16, couro: 5 },
      ok: ['{g} voltaram do vale com couro e carne: a matilha mudou de morro.', '{g} acharam a toca dos lobos e fizeram tanto barulho que eles não voltam tão cedo.'],
      mal: ['{g} voltaram do vale sem nada: a matilha era maior do que diziam.'] },
    erva: { nome: 'Buscar erva da serra', rank: 0, dias: [4, 7], risco: 0.07, premio: { frutas: 18, fibra: 8 },
      ok: ['{g} subiram a serra e voltaram de cesto cheio.', '{g} acharam o vale das ervas, que os velhos só conheciam de ouvir falar.'],
      mal: ['{g} procuraram a erva por dias e só acharam chuva.'] },
    caravana: { nome: 'Escoltar a caravana de sal', rank: 1, dias: [5, 9], risco: 0.12, premio: { sal: 10, ouro: 2 },
      ok: ['{g} levaram a caravana até o fim do caminho, e o dono pagou em sal e ouro.', 'Bandidos olharam para {g} e resolveram esperar a próxima caravana.'],
      mal: ['A caravana foi roubada no segundo dia. {g} voltaram de mãos vazias.'] },
    caverna: { nome: 'Descer à caverna funda', rank: 2, dias: [6, 10], risco: 0.18, premio: { minerio: 14, carvao: 10, ferro: 3 },
      ok: ['{g} desceram até onde a tocha não alcança e subiram com a mochila pesada de minério.', 'No fundo da caverna, {g} acharam um veio que ninguém tinha tocado.'],
      mal: ['A caverna desabou no caminho. {g} saíram por pouco, cobertos de pó.'] },
    ruinas: { nome: 'Explorar as ruínas antigas', rank: 2, dias: [7, 12], risco: 0.2, premio: { ouro: 6, sal: 6 }, saber: 30,
      ok: ['Nas ruínas, {g} acharam ouro e paredes cheias de sinais que o povo agora tenta entender.', '{g} voltaram das ruínas contando de uma gente que viveu aqui muito antes do casal.'],
      mal: ['As ruínas estavam vazias, e o chão cedeu duas vezes. {g} não quiseram ficar.'] },
    fera: { nome: 'Caçar a fera do morro', rank: 3, dias: [8, 13], risco: 0.28, premio: { carne: 40, couro: 14, ouro: 4 },
      ok: ['{g} voltaram arrastando a fera do morro. A vila inteira saiu para ver.', 'A fera do morro não vai mais descer: {g} trouxeram o couro como prova.'],
      mal: ['A fera do morro é maior do que contavam. {g} recuaram, e ela continua lá em cima.'] },
  };
  // 0.38: a missão de limpar um covil: o nome e o rank vêm do covil
  Gu.TIPOS.covil = { nome: 'Limpar o covil', rank: 1, dias: [5, 9], risco: 0.25, premio: { ouro: 5, couro: 6 },
    ok: ['{g} entraram no covil e saíram com o que restou lá dentro. O mato ficou quieto.', '{g} acabaram com o covil. Quem morava perto voltou a dormir de noite.'],
    mal: ['O covil era maior por dentro. {g} voltaram correndo, e ele continua lá.'] };
  Gu.rankM = (m) => (m.tipo === 'covil' ? Math.min(3, m.nv || 1) : Gu.TIPOS[m.tipo].rank);
  Gu.nomeM = (m) => (m.tipo === 'covil' ? 'Limpar: ' + (m.nome || 'o covil') : Gu.TIPOS[m.tipo].nome);
  const FORCA = [4, 10, 24, 50];   // a força somada que cada rank de missão pede
  const tem = (S, k) => S.buildings.some((b) => b.type === k && b.built);
  Gu.temTaberna = (S) => tem(S, 'taberna');
  Gu.temGuilda = (S) => tem(S, 'guilda');
  function sorte(S, sal) {
    let x = (Math.imul((S.t / 60) | 0, 40503) ^ Math.imul(sal | 0, 2654435761) ^ (S.seed | 0)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 15; x = Math.imul(x, 69069) >>> 0; x ^= x >>> 11;
    return (x >>> 0) / 4294967296;
  }
  Gu.init = function (S) {
    const g = S.guilda || (S.guilda = {});
    g.quadro = g.quadro || []; g.idas = g.idas || []; g.hist = g.hist || []; g.prox = g.prox || 0; g.nid = g.nid || 1;
    return g;
  };
  // quem pode sair: herói adulto que não fala por todos, sem bebê no colo, sem barriga, sem Deus no corpo
  function livre(S, p) {
    if (!R().de(p) || !p.alive || p.fora || p.carriedBy || p.labor || p.preg || p.escolhido) return false;
    if (S.soc && S.soc.lider === p.id) return false;
    if (S.avatar && S.avatar.pid === p.id) return false;
    if (Fam().age(S, p) < 16 || p.needs.saude < 50 || p.sick) return false;
    return !S.people.some((b) => b.alive && b.carriedBy === p.id);
  }
  Gu.livres = (S) => S.people.filter((p) => livre(S, p)).sort((a, b) => b.rpg.nv - a.rpg.nv || a.id - b.id);
  // o grupo de uma missão: os mais fortes até somar a força (de 2 a 4); null se não dá
  Gu.grupo = function (S, m) {
    const pede = FORCA[Gu.rankM(m)], l = Gu.livres(S);
    if (l.length < 2) return null;
    const vivos = S.people.filter((p) => p.alive).length;
    const sobra = Math.max(0, Math.min(4, vivos - C.GUILDA_FICAM));
    if (sobra < 2) return null;
    const out = [];
    let soma = 0;
    for (const p of l) { if (out.length >= sobra) break; out.push(p); soma += p.rpg.nv; if (out.length >= 2 && soma >= pede) break; }
    return soma >= pede ? out : null;
  };
  // a chance de dar certo: pela força do grupo contra a que a missão pede, e pelo perigo; a proteção de Deus soma
  Gu.chance = function (m, forca, n, protegido) {
    const T = Gu.TIPOS[m.tipo], pede = FORCA[Gu.rankM(m)];
    const c = 0.55 + 0.3 * Math.min(1.5, (forca - pede) / Math.max(1, pede)) + 0.03 * (n - 2) - T.risco * 0.5;
    return Math.max(0.1, Math.min(0.95, c + (protegido ? C.GUILDA_BENCAO : 0)));
  };
  // ---------- o quadro ----------
  function novaMissao(S) {
    // 0.38: covil sem missão vai primeiro para o quadro
    if (S.monstros) for (const c of S.monstros.covis) if (!S.guilda.quadro.some((m) => m.covil === c.id) && !S.guilda.idas.some((i) => i.covil === c.id)) { S.guilda.quadro.push({ id: S.guilda.nid++, tipo: 'covil', covil: c.id, nv: c.nv, nome: G.Monstros.nomeDe(c), t: S.t, ate: S.t + C.GUILDA_PRAZO * 4 * DAY() }); return; }
    const g = S.guilda, top = Math.max(0, ...S.people.filter((p) => R().de(p)).map((p) => p.rpg.nv));
    const pode = Object.keys(Gu.TIPOS).filter((k) => k !== 'covil' && FORCA[Gu.TIPOS[k].rank] <= Math.max(FORCA[0], top * 3));
    const fora = pode.filter((k) => !g.quadro.some((m) => m.tipo === k));
    const l = fora.length ? fora : pode;
    const tipo = l[Math.floor(sorte(S, g.nid * 7 + 1) * l.length)];
    g.quadro.push({ id: g.nid++, tipo, t: S.t, ate: S.t + C.GUILDA_PRAZO * DAY() });
  }
  function parte(S, m, grupo, sonho) {
    const g = S.guilda, T = Gu.TIPOS[m.tipo];
    const dias = T.dias[0] + sorte(S, m.id * 11) * (T.dias[1] - T.dias[0]);
    const forca = grupo.reduce((a, p) => a + p.rpg.nv, 0);
    g.quadro = g.quadro.filter((x) => x !== m);
    const ida = { id: m.id, tipo: m.tipo, covil: m.covil || 0, nv: m.nv || 0, nome: m.nome || '', t0: S.t, volta: S.t + dias * DAY(), ids: grupo.map((p) => p.id), nomes: grupo.map((p) => p.name), forca, sonho: sonho ? 1 : 0 };
    for (const p of grupo) { So().sair(S, p, 'missao'); p.away.vila = 0; p.away.mar = 1; p.away.missao = 1; }
    g.idas.push(ida);
    S.stats.missoesIdas = (S.stats.missoesIdas || 0) + 1;
    const txt = Sim().listNames(grupo) + ' pegaram no quadro da guilda: ' + Gu.nomeM(m).toLowerCase() + '.';
    if (S.stats.missoesIdas === 1) Sim().chron(S, 'A primeira missão da guilda saiu: ' + txt);
    else if (!S.safe) Sim().toast(S, txt, '');
    return ida;
  }
  // ---------- a volta ----------
  // rolagem: de 0 a 1 (abaixo da chance, deu certo). Os testes passam a deles
  Gu.volta = function (S, ida, rolagem) {
    const g = S.guilda, T = Gu.TIPOS[ida.tipo], Sm = Sim();
    g.idas = g.idas.filter((x) => x !== ida);
    const gente = ida.ids.map((id) => So().away(S, id)).filter((p) => p && !p.morto);
    if (!gente.length) return { ok: false, gente: [] };
    const chance = Gu.chance(ida, ida.forca, ida.ids.length, ida.protegido);
    const r = rolagem !== undefined ? rolagem : sorte(S, ida.id * 13 + 3);
    const ok = r < chance, mortos = [];
    if (!ok && !ida.protegido) gente.forEach((p, k) => { if (sorte(S, ida.id * 17 + k) < (rolagem !== undefined && rolagem >= 1 ? 1 : T.risco * C.GUILDA_MORTE)) mortos.push(p); });
    for (const p of mortos) { p.morto = S.t; p.cause = 'missao'; }
    const volta = gente.filter((p) => mortos.indexOf(p) < 0);
    const cx = S.camp.x + 1.5, cy = S.camp.y + 2.5;
    volta.forEach((p, k) => {
      So().voltar(S, p, cx + (k % 3), cy + Math.floor(k / 3));
      if (!ok) p.needs.saude = Math.max(25, p.needs.saude - 40);
      R().ganha(S, p, (ok ? 10 : 3) * (Gu.rankM(ida) + 1), 'luta');
      Sm.say(S, p, ok ? 'Voltamos!' : 'Foi por pouco.', true);
    });
    if (G.Soc && G.Soc.reindex) G.Soc.reindex(S);
    if (ok) for (const k in T.premio) if (S.stock[k] !== undefined) S.stock[k] += T.premio[k];
    if (ok && ida.covil && G.Monstros) { G.Monstros.remove(S, ida.covil); S.stats.covisLimpos = (S.stats.covisLimpos || 0) + 1; }   // 0.38
    if (ok && T.saber && G.Tech && G.Tech.open) { const a = G.Tech.open(S); if (a) G.Tech.addPractice(S, a, T.saber, null); }
    S.stats.missoes = (S.stats.missoes || 0) + 1; if (ok) S.stats.missoesOk = (S.stats.missoesOk || 0) + 1;
    S.stats.mortosMissao = (S.stats.mortosMissao || 0) + mortos.length;
    const frases = ok ? T.ok : T.mal, frase = frases[Math.floor(sorte(S, ida.id * 19) * frases.length)];
    const nomes = Sm.listNames(volta.length ? volta : gente);
    let txt = volta.length ? frase.replace('{g}', nomes) : 'O grupo que saiu para ' + Gu.nomeM(ida).toLowerCase() + ' não voltou.';
    if (mortos.length && volta.length) txt += ' ' + Sm.listNames(mortos) + (mortos.length > 1 ? ' ficaram' : ' ficou') + ' pelo caminho.';
    else if (mortos.length) txt += ' ' + Sm.listNames(mortos) + (mortos.length > 1 ? ' ficaram' : ' ficou') + ' por lá.';
    if (mortos.length) for (const q of S.people) if (q.alive) Sm.addMem(S, q, 'parenteFoi');
    if (ida.protegido && !ok) txt += ' Dizem que algo os trouxe de volta.';
    g.hist.unshift({ t: S.t, tipo: ida.tipo, ok, txt });
    g.hist = g.hist.slice(0, 12);
    if (Gu.rankM(ida) >= 2 || ida.covil || mortos.length || S.stats.missoes === 1) Sm.chron(S, txt);
    else if (!S.safe) Sm.toast(S, txt, ok ? 'good' : 'warn');
    return { ok, mortos, volta };
  };
  // ---------- o dia ----------
  Gu.daily = function (S) {
    const g = Gu.init(S);
    for (const ida of g.idas.slice()) if (S.t >= ida.volta) Gu.volta(S, ida);
    if (!Gu.temGuilda(S) || S.resumido || !R()) return;
    if (!g.aberta) { g.aberta = S.t; Sim().chron(S, 'A guilda abriu as portas e pregou o primeiro quadro de missões. Quem já sentiu a força crescer começa a olhar para ele.'); }
    g.quadro = g.quadro.filter((m) => m.ate > S.t);
    if (S.t >= g.prox && g.quadro.length < C.GUILDA_QUADRO) { novaMissao(S); g.prox = S.t + (2 + sorte(S, 31) * 5) * DAY(); }
    if (S.safe || g.idas.length >= C.GUILDA_GRUPOS || sorte(S, 37) > 0.35) return;
    for (const m of g.quadro) { const q = Gu.grupo(S, m); if (q) { parte(S, m, q); return; } }
  };
  // ---------- Deus ----------
  Gu.sonhoWhy = function (S, m) {
    if (!S.god || S.god.poder < C.GUILDA_SONHO) return 'faltam ' + Math.ceil(C.GUILDA_SONHO - (S.god ? S.god.poder : 0)) + ' de Poder';
    if (!Gu.grupo(S, m)) return 'ninguém tem força para esta ainda';
    return '';
  };
  Gu.sonho = function (S, id) {
    const m = S.guilda.quadro.find((x) => x.id === id);
    if (!m || Gu.sonhoWhy(S, m)) return false;
    S.god.poder -= C.GUILDA_SONHO;
    const ida = parte(S, m, Gu.grupo(S, m), true);
    Sim().toast(S, ida.nomes.join(', ') + ' sonharam com a mesma coisa e saíram antes do sol.', 'good');
    return true;
  };
  Gu.protegeWhy = function (S, ida) {
    if (ida.protegido) return 'este grupo já está coberto';
    if (!S.god || S.god.poder < C.GUILDA_PROTEGE) return 'faltam ' + Math.ceil(C.GUILDA_PROTEGE - (S.god ? S.god.poder : 0)) + ' de Poder';
    return '';
  };
  Gu.protege = function (S, id) {
    const ida = S.guilda.idas.find((x) => x.id === id);
    if (!ida || Gu.protegeWhy(S, ida)) return false;
    S.god.poder -= C.GUILDA_PROTEGE;
    ida.protegido = 1;
    Sim().toast(S, 'O grupo de ' + ida.nomes[0] + ' está sob a sua proteção: ninguém morre nesta viagem.', 'good');
    return true;
  };
  // a taberna: o descontentamento cresce menos, e mais gente acorda para a aventura
  Gu.descMult = (S) => (Gu.temTaberna(S) ? C.TABERNA_DESC : 1);
  Gu.despertarMult = (S) => (Gu.temTaberna(S) ? C.TABERNA_DESPERTA : 1);
})(globalThis.G = globalThis.G || {});
