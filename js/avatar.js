/* Gods · Etapa 21 (0.21): o Avatar. Você possui um adulto de fé alta e anda como ele: o toque no mapa leva o corpo
   dele até lá, e só o avatar fala com alguém escolhendo a frase, ensina um ofício na mão, aparta uma briga e puxa a
   reza. Custa Poder por hora e cansa o corpo; quando você sai, ele lembra daquilo como um sonho. Abusar assusta: o
   povo passa a temer os tomados. O filho gerado enquanto o pai ou a mãe estava possuído (sempre com o par que a
   pessoa já tinha) nasce abençoado: fé inteira, aprende depressa, tem um dom só dele (profeta, curador ou líder nato)
   e, de tempos em tempos, faz uma pergunta direto a você. Possuir não passa por cima da vontade de ninguém: a pessoa
   precisa ter fé alta, e nada além disso é descrito. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Av = G.Avatar = {};
  const Sim = () => G.Sim, Fam = () => G.Family, God = () => G.God;
  const here = (p) => p && p.alive && !p.fora && !p.carriedBy;

  Av.init = function (S) {
    const a = S.avatar || (S.avatar = {});
    a.pid = a.pid || 0;
    a.horas = a.horas || {};
    a.cool = a.cool || {};
    a.pergunta = a.pergunta || null;
    a.first = a.first || {};
    const st = S.stats;
    for (const k of ['possessoes', 'horasAvatar', 'abencoados', 'acoesAvatar', 'perguntas']) st[k] = st[k] || 0;
  };
  Av.ativo = (S) => !!(S.avatar && S.avatar.pid);
  Av.ativoEm = (S, p) => !!(S.avatar && p && S.avatar.pid === p.id);
  Av.quem = (S) => (Av.ativo(S) ? Fam().person(S, S.avatar.pid) : null);

  // ---------- possuir e soltar ----------
  Av.possuirWhy = function (S, p) {
    if (!S.avatar) Av.init(S);
    if (!here(p)) return 'só quem está na aldeia';
    if (Fam().age(S, p) < 18) return 'só um adulto';
    if ((p.fe || 0) < C.AVATAR_FE) return 'pede fé de ' + C.AVATAR_FE + ' ou mais';
    if (p.sleeping || p.labor) return 'agora não: ' + (p.labor ? 'está em trabalho de parto' : 'está dormindo');
    if (Av.ativo(S)) return 'você já está em alguém';
    if ((S.god.poder || 0) < C.AVATAR_PODER_H * 2) return 'pede ' + C.AVATAR_PODER_H * 2 + ' de Poder';
    return '';
  };
  Av.possuir = function (S, pid) {
    const p = Fam().person(S, pid), why = Av.possuirWhy(S, p);
    if (why) return { ok: false, why };
    S.avatar.pid = p.id; S.avatar.desde = S.t;
    p.tomado = S.t;
    G.AI.abort(S, p); p.nextEval = S.t;
    S.stats.possessoes++;
    if (!S.avatar.first.possuir) { S.avatar.first.possuir = S.t; Sim().chron(S, 'Pela primeira vez, Deus andou entre o povo nos olhos de ' + p.name + '.'); }
    return { ok: true };
  };
  Av.soltar = function (S, why) {
    const p = Av.quem(S);
    S.avatar.pid = 0;
    if (!p) return;
    delete p.tomado; delete p.avDest;
    if (p.alive) { G.AI.abort(S, p); p.nextEval = S.t; Sim().addMem(S, p, 'tomado'); }
    if (why && !S.safe) S.events.push({ k: 'toast', text: why, tone: 'warn' });
  };
  // o toque no mapa: o corpo vai até lá
  Av.mover = function (S, x, y) {
    const p = Av.quem(S);
    if (!p) return false;
    p.avDest = { x, y };
    G.AI.abort(S, p); p.nextEval = S.t;
    return true;
  };

  // ---------- o que só o avatar faz ----------
  // perto: quem está a até 3 passos (o alvo escolhido, se houver)
  function alvo(S, p, pid, r) {
    const q = pid ? Fam().person(S, pid) : null;
    if (q && here(q) && q !== p && Math.hypot(q.x - p.x, q.y - p.y) <= (r || 3)) return q;
    let best = null, bd = r || 3;
    for (const o of S.people) { if (!here(o) || o === p) continue; const d = Math.hypot(o.x - p.x, o.y - p.y); if (d <= bd) { bd = d; best = o; } }
    return best;
  }
  Av.ACOES = {
    consolar: { nome: 'Consolar', desc: 'Fala de perto com quem está triste: o descontentamento cai e o laço entre os dois cresce.' },
    encorajar: { nome: 'Encorajar', desc: 'Uma palavra de força: a pessoa ganha ânimo para o trabalho.' },
    pregar: { nome: 'Pregar', desc: 'Fala de Deus, de perto: a fé da pessoa sobe.' },
    ensinar: { nome: 'Ensinar na mão', desc: 'Mostra o ofício pegando junto: a pessoa aprende o jeito das técnicas que o avatar sabe, e um pouco de cada ofício.' },
    apartar: { nome: 'Apartar briga', desc: 'Entra no meio: quem planejava um malfeito ali perto desiste, e a raiva esfria.' },
    rezar: { nome: 'Puxar a reza', desc: 'Puxa a reza em voz alta: todos a até 6 passos rezam juntos, e a fé sobe.' },
  };
  Av.acaoWhy = function (S, k, pid) {
    const p = Av.quem(S);
    if (!p) return 'você não está em ninguém';
    if ((S.avatar.cool[k] || 0) > S.t) return 'de novo só daqui a pouco';
    if ((S.god.poder || 0) < C.AVATAR_ACAO) return 'pede ' + C.AVATAR_ACAO + ' de Poder';
    if (k === 'apartar') return S.people.some((q) => here(q) && q.plano && Math.hypot(q.x - p.x, q.y - p.y) <= 6) ? '' : 'ninguém por perto planeja malfeito';
    if (k === 'rezar') return '';
    return alvo(S, p, pid) ? '' : 'chegue perto de alguém (até 3 passos)';
  };
  Av.agir = function (S, k, pid) {
    const why = Av.acaoWhy(S, k, pid);
    if (why) return { ok: false, why };
    const p = Av.quem(S), q = alvo(S, p, pid), So = G.Soc;
    S.god.poder -= C.AVATAR_ACAO;
    S.avatar.cool[k] = S.t + 60;
    S.stats.acoesAvatar++;
    let txt = '';
    if (k === 'consolar') { if (So) q.desc = Math.max(0, (q.desc || 0) - 15); q.needs.social = Math.min(100, q.needs.social + 20); q.rel[p.id] = (q.rel[p.id] || 0) + 3; p.rel[q.id] = (p.rel[q.id] || 0) + 3; txt = p.name + ' consolou ' + q.name + '.'; }
    else if (k === 'encorajar') { q.needs.energia = Math.min(100, q.needs.energia + 15); q.animo = S.t + 8 * 60; txt = p.name + ' encorajou ' + q.name + '.'; }
    else if (k === 'pregar') { God().faith(S, q, 12); txt = p.name + ' falou de Deus para ' + q.name + '.'; }
    else if (k === 'ensinar') {
      const Ge = G.Gente;
      if (Ge) for (const id of Ge.TECNICAS) if (Ge.dom(S, p, id) >= C.DOM_MESTRE) Ge.aprende(S, q, id, 0.25, p);
      for (const sk in p.skills) if ((p.skills[sk] || 0) > (q.skills[sk] || 0)) q.skills[sk] += ((p.skills[sk] || 0) - (q.skills[sk] || 0)) * 0.2;
      txt = p.name + ' ensinou ' + q.name + ' pegando junto.';
    } else if (k === 'apartar') {
      const n = [];
      for (const o of S.people) if (here(o) && o.plano && Math.hypot(o.x - p.x, o.y - p.y) <= 6) { delete o.plano; if (o.raiva) o.raiva = {}; n.push(o); }
      txt = p.name + ' entrou no meio e apartou: ' + Sim().listNames(n) + ' desisti' + (n.length > 1 ? 'ram.' : 'u.');
    } else if (k === 'rezar') {
      const n = S.people.filter((o) => here(o) && o !== p && Math.hypot(o.x - p.x, o.y - p.y) <= 6);
      for (const o of n) God().faith(S, o, 8);
      God().faith(S, p, 4);
      txt = p.name + ' puxou a reza' + (n.length ? ', e ' + n.length + (n.length > 1 ? ' rezaram junto.' : ' rezou junto.') : ', sozinho.');
    }
    if (!S.safe) S.events.push({ k: 'toast', text: txt, tone: 'good' });
    return { ok: true, txt };
  };

  // ---------- de hora em hora: o custo, o cansaço e o medo dos tomados ----------
  Av.hourly = function (S) {
    if (!S.avatar) Av.init(S);
    const p = Av.quem(S);
    if (Av.ativo(S) && !here(p)) { Av.soltar(S); return; }
    if (p) {
      S.god.poder -= C.AVATAR_PODER_H;
      p.needs.energia = Math.max(0, p.needs.energia - C.AVATAR_CANSA);
      const h = S.avatar.horas[p.id] = (S.avatar.horas[p.id] || 0) + 1;
      S.stats.horasAvatar++;
      if (S.god.poder < C.AVATAR_PODER_H) Av.soltar(S, 'O Poder acabou: você saiu de ' + p.name + '.');
      // o corpo dorme sozinho de noite; só a fome, a sede e a saúde em perigo tiram você dele
      else if (p.needs.fome < 12 || p.needs.sede < 12 || p.needs.saude < 30) Av.soltar(S, 'O corpo de ' + p.name + ' precisa de cuidado: você saiu dele.');
      // quem vê o tomado tempo demais começa a temer
      else if (h > C.AVATAR_ABUSO_H && G.Soc) {
        for (const o of S.people) if (here(o) && o !== p && Math.hypot(o.x - p.x, o.y - p.y) <= 6) G.Soc.addDesc(S, o, 0.6, 'humor');
        if (!S.avatar.first.medo) { S.avatar.first.medo = S.t; Sim().chron(S, 'O povo começou a temer os tomados: ' + p.name + ' anda com um olhar que não é dele.'); }
      }
    }
    // o filho abençoado: o dom dele
    for (const q of S.people) {
      if (!here(q) || !q.abencoado || Fam().age(S, q) < 12) continue;
      const dom = q.abencoado.dom;
      if (dom === 'curador') for (const o of S.people) { if (here(o) && o !== q && Math.hypot(o.x - q.x, o.y - q.y) <= 6 && o.needs.saude < 90) o.needs.saude = Math.min(100, o.needs.saude + 1); }
      else if (dom === 'profeta') for (const o of S.people) { if (here(o) && o !== q && Math.hypot(o.x - q.x, o.y - q.y) <= 8) God().faith(S, o, 0.05); }
    }
  };

  // ---------- o filho abençoado ----------
  // a concepção enquanto o pai ou a mãe está possuído (sempre com o par que a pessoa já tinha: quem faz o par é a
  // família, de sempre; o avatar não escolhe ninguém)
  Av.marcaConcepcao = (S, mae, pai) => Av.ativo(S) && (S.avatar.pid === mae.id || (pai && S.avatar.pid === pai.id));
  const DONS = { profeta: 'profeta: perto dele, a fé de todos sobe devagar', curador: 'curador: perto dele, quem está ferido ou doente sara', lider: 'líder nato: quando crescer, o povo vai ouvi-lo' };
  Av.DONS = DONS;
  Av.nasceu = function (S, baby) {
    const ks = Object.keys(DONS), dom = ks[Math.floor(G.hash2(baby.id, 3, S.seed) * ks.length)];
    baby.abencoado = { dom, t: S.t };
    baby.fe = 100;
    S.stats.abencoados++;
    Sim().chron(S, baby.name + ' nasceu com uma marca de luz na testa: ' + (baby.sex === 'F' ? 'é a filha abençoada' : 'é o filho abençoado') + ', ' + DONS[dom] + '.');
  };
  // o líder nato: adulto, o povo passa a ouvi-lo (uma vez)
  function liderNato(S) {
    if (!G.Soc || !S.soc) return;
    for (const q of S.people) {
      if (!here(q) || !q.abencoado || q.abencoado.dom !== 'lider' || q.abencoado.lider || Fam().age(S, q) < 20) continue;
      q.abencoado.lider = S.t;
      S.soc.lider = q.id; S.soc.liderT = S.t;
      Sim().chron(S, 'O povo passou a ouvir ' + q.name + ', ' + (q.sex === 'F' ? 'a abençoada' : 'o abençoado') + ': fala, e todos param para ouvir.');
    }
  }
  // a pergunta do abençoado, direto para você (uma a cada AVATAR_PERGUNTA_D dias, a partir dos 8 anos)
  const PERGUNTAS = [
    { t: 'Por que a gente morre?', r: [['Para dar lugar a quem nasce.', 3, 2], ['Nem eu sei tudo.', 1, 6]] },
    { t: 'Você está sempre olhando?', r: [['Sempre.', 4, 1], ['Quando vocês me chamam.', 2, 3]] },
    { t: 'Posso pedir pelos outros, e não por mim?', r: [['Pode, e é o que mais escuto.', 3, 4], ['Peça pelo que precisar.', 1, 2]] },
    { t: 'O que tem do outro lado do mar?', r: [['Mais gente como vocês.', 2, 3], ['Vão ver com os próprios olhos.', 1, 5]] },
  ];
  function pergunta(S) {
    if (S.avatar.pergunta || S.safe || S.resumido) return;
    const q = S.people.find((o) => here(o) && o.abencoado && Fam().age(S, o) >= 8 && S.t - (o.abencoado.perg || o.abencoado.t) >= C.AVATAR_PERGUNTA_D * C.DAY_MIN);
    if (!q) return;
    const k = (S.stats.perguntas || 0) % PERGUNTAS.length;
    S.avatar.pergunta = { pid: q.id, k, t: S.t };
    q.abencoado.perg = S.t;
    S.events.push({ k: 'filho', pid: q.id });
  }
  Av.pending = (S) => {
    const pg = S.avatar && S.avatar.pergunta;
    if (!pg) return null;
    const q = Fam().person(S, pg.pid), P = PERGUNTAS[pg.k];
    return q ? { nome: q.name, texto: P.t, opcoes: P.r.map((x) => x[0]) } : null;
  };
  // a resposta: a fé da aldeia (e a do abençoado) sobe; a resposta franca o faz pensar, e a fé dele sobe mais
  Av.responder = function (S, i) {
    const pg = S.avatar.pergunta;
    if (!pg) return false;
    const q = Fam().person(S, pg.pid), R = PERGUNTAS[pg.k].r[i] || PERGUNTAS[pg.k].r[0];
    S.avatar.pergunta = null;
    S.stats.perguntas++;
    if (!q) return false;
    for (const o of S.people) if (here(o)) God().faith(S, o, R[1]);
    God().faith(S, q, R[2]);
    Sim().chron(S, q.name + ' perguntou a ' + (G.Deus ? G.Deus.call(S) : 'Deus') + ': “' + PERGUNTAS[pg.k].t + '” E ouviu: “' + R[0] + '”');
    return true;
  };
  Av.daily = function (S) {
    if (!S.avatar) Av.init(S);
    liderNato(S);
    pergunta(S);
  };
  // o abençoado aprende mais depressa
  Av.xp = (p) => (p.abencoado ? 1.5 : 1);
})(globalThis.G = globalThis.G || {});
