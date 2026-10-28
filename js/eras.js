/* Gods · Etapas 19 e 20 (0.20): as Eras. Dois eixos: a escala (acampamento, aldeia, vila, cidade, reino, que já vem
   da 0.16) e a idade, o que o povo sabe fazer: pedra lascada, pedra polida e campo, bronze, ferro e reinos. Cada
   passagem pede descobertas, gente e uma obra-marco. O povo que é maioria dá o rumo (a ordem da sociedade): humanos,
   reinos e leis escritas; elfos, o conselho das mais velhas e a magia no lugar da máquina; anões, as guildas; povo-
   fera, os clãs e a caçada como lei; aldeia bem misturada, a assembleia. Cada idade traz o seu desafio, que o
   Narrador conta: a praga na roça, a guerra com a vila de fora, a fome da cidade grande, a briga pela sucessão. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const E = G.Eras = {};
  const Sim = () => G.Sim, Fam = () => G.Family;
  const DAY = () => C.DAY_MIN, YEAR = () => C.YEAR_DAYS * C.DAY_MIN;
  const vivos = (S) => S.people.filter((p) => p.alive && !p.fora).length;
  const sabe = (S, id) => !!(S.tech && S.tech.known[id]);
  const feita = (S, k) => S.buildings.some((b) => b.type === k && b.built);

  // ---------- as idades ----------
  // pede: descobertas (ou, no conselho, o saber da magia que faz o mesmo), gente, a obra-marco
  E.IDADES = [
    { nome: 'Idade da Pedra Lascada', curto: 'pedra lascada' },
    { nome: 'Idade da Pedra Polida', curto: 'pedra polida e campo', disc: ['ceramica', 'roca'], gente: 12, marco: ['forno'], txt: 'A pedra agora é polida, a terra é lavrada e o barro vira pote: começou a Idade da Pedra Polida.' },
    { nome: 'Idade do Bronze', curto: 'bronze', disc: ['mineracao'], magia: 'runas', gente: 25, marco: ['mina', 'estatua'], txt: 'Do fundo da serra sai o primeiro metal: começou a Idade do Bronze.', txtM: 'As runas gravadas na pedra fazem o que o metal faria: começou, do jeito do conselho, a Idade do Bronze.' },
    { nome: 'Idade do Ferro', curto: 'ferro', disc: ['metalurgia'], magia: 'ervas', gente: 45, marco: ['ferraria', 'escola'], txt: 'O ferro bate na bigorna: começou a Idade do Ferro.', txtM: 'As ervas e os cantos curam e fortalecem sem forja nenhuma: começou, do jeito do conselho, a Idade do Ferro.' },
    { nome: 'Idade dos Reinos', curto: 'reinos', escrita: true, magia: 'circulos', gente: 80, marco: ['templo', 'muralha'], txt: 'A aldeia virou reino: lei escrita, obra grande e quem governa. Começou a Idade dos Reinos.' },
  ];
  E.init = function (S) {
    const e = S.eras || (S.eras = {});
    e.idade = e.idade || 0;
    e.ordem = e.ordem || '';
    e.magia = e.magia || {};
    e.prox = e.prox || {};
    const st = S.stats;
    for (const k of ['pragas', 'guerras', 'fomesCidade', 'sucessoes']) st[k] = st[k] || 0;
  };
  E.idade = (S) => (S.eras ? S.eras.idade : 0);
  // o que falta para a próxima idade ('' se nada)
  E.faltaWhy = function (S) {
    const k = E.idade(S) + 1, I = E.IDADES[k];
    if (!I) return 'já é a última idade';
    const conselho = S.eras.ordem === 'conselho', falta = [];
    if (I.disc) for (const d of I.disc) if (!sabe(S, d) && !(conselho && I.magia && S.eras.magia[I.magia])) falta.push(conselho && I.magia ? 'o saber ' + MAGIA[I.magia].de : 'a descoberta ' + ((G.Tech.DISC[d] || (G.Inv && G.Inv.DISC && G.Inv.DISC[d]) || { name: d }).name || d).toLowerCase());
    if (I.escrita && !(G.Deus && G.Deus.saber(S, 'escrita'))) falta.push('a escrita');
    if (vivos(S) < I.gente) falta.push(I.gente + ' pessoas');
    if (I.marco && !I.marco.some((m) => feita(S, m))) falta.push((I.marco.length > 1 ? 'uma destas obras: ' : 'a obra ') + I.marco.map((m) => C.BUILD[m].name.toLowerCase()).join(' ou '));
    return falta.length ? 'falta ' + falta.join(', ') : '';
  };
  function passa(S) {
    const k = E.idade(S) + 1, I = E.IDADES[k];
    if (!I || E.faltaWhy(S)) return false;
    S.eras.idade = k;
    S.eras.desde = S.t;
    const pelaMagia = S.eras.ordem === 'conselho' && I.magia && S.eras.magia[I.magia] && I.disc && !I.disc.every((d) => sabe(S, d));
    Sim().chron(S, pelaMagia ? I.txtM : I.txt);
    if (!S.safe) S.events.push({ k: 'toast', text: I.nome + '.', tone: 'good' });
    for (const p of S.people) if (p.alive) Sim().addMem(S, p, 'obra');
    return true;
  }

  // ---------- o rumo: a ordem da sociedade, pelo povo que é maioria ----------
  E.ORDENS = {
    reino: { nome: 'Reino de leis escritas', povo: 'humanos', desc: 'Leis escritas e comércio: o malfeito cai 15%, e cada troca rende 30% mais.' },
    conselho: { nome: 'Conselho das mais velhas', povo: 'elfos', desc: 'Quem fala por todos é a mulher mais respeitada; a magia faz o que o metal faria (runas, ervas, círculos).' },
    guildas: { nome: 'Guildas de ofício', povo: 'anões', desc: 'Cada ofício tem a sua guilda: todos aprendem 15% mais depressa.' },
    clas: { nome: 'Clãs e campeões', povo: 'povo-fera', desc: 'A caçada é a lei: a caça rende 25% mais carne.' },
    assembleia: { nome: 'Assembleia', povo: 'aldeia misturada', desc: 'Todos falam na roda: o descontentamento cresce 25% menos.' },
  };
  function ordemDe(S) {
    const n = (S.povos && S.povos.n) || { humano: vivos(S) }, tot = Math.max(1, Object.values(n).reduce((a, b) => a + b, 0));
    const pc = (k) => (n[k] || 0) / tot;
    if (pc('elfo') > 0.5) return 'conselho';   // maioria: mais da metade
    if (pc('anao') > 0.5) return 'guildas';
    if (pc('fera') > 0.5) return 'clas';
    if (pc('humano') >= 0.6) return 'reino';
    return 'assembleia';
  }
  // o rumo só se firma a partir da Pedra Polida, e muda (devagar, no máximo uma vez por ano) quando o povo muda
  function rumo(S) {
    if (E.idade(S) < 1) return;
    const e = S.eras, nova = ordemDe(S);
    if (nova === e.ordem || (e.ordemT && S.t - e.ordemT < YEAR())) return;
    const antes = e.ordem;
    e.ordem = nova; e.ordemT = S.t;
    const O = E.ORDENS[nova];
    Sim().chron(S, (antes ? 'O jeito de governar mudou: ' : 'A sociedade tomou um rumo: ') + O.nome.toLowerCase() + ', o jeito d' + (O.povo === 'aldeia misturada' ? 'e uma ' : 'os ') + O.povo + '. ' + O.desc);
    if (nova === 'conselho' && G.Soc && S.soc && S.soc.lider) { const L = G.Family.person(S, S.soc.lider); if (L && L.sex !== 'F') G.Soc.eleger(S, true); }
  }
  E.ordem = (S) => (S.eras ? S.eras.ordem : '');
  // os efeitos de cada ordem (ganchos pequenos, chamados de onde a coisa acontece)
  E.crimeMult = (S) => (E.ordem(S) === 'reino' ? 0.85 : 1);
  E.trocaMult = (S) => (E.ordem(S) === 'reino' ? 1.3 : 1);
  E.xp = (S) => (E.ordem(S) === 'guildas' ? 1.15 : 1);
  E.cacaMult = (S) => (E.ordem(S) === 'clas' ? 1.25 : 1);
  E.descMult = (S) => (E.ordem(S) === 'assembleia' ? 0.75 : 1);
  // no conselho, só mulher fala por todos (o matriarcado das elfas)
  E.candidatos = (S, list) => (E.ordem(S) === 'conselho' && list.some((p) => p.sex === 'F') ? list.filter((p) => p.sex === 'F') : list);

  // ---------- a magia: o outro caminho do conselho ----------
  const MAGIA = {
    runas: { nome: 'Runas', de: 'das runas', txt: 'As mais velhas gravaram runas nas pedras das casas: a pedra aquece, e quem dorme sente 4 °C a mais.' },
    ervas: { nome: 'Ervas', de: 'das ervas', txt: 'O conselho juntou o saber das ervas e dos cantos: a febre pesa bem menos, e a saúde volta mais depressa.' },
    circulos: { nome: 'Círculos', de: 'dos círculos', txt: 'Círculos de pedra em volta da roça: a terra rende 20% mais.' },
  };
  E.MAGIA = MAGIA;
  // o conselho aprende um saber por idade (a partir da Pedra Polida), em vez de esperar o metal
  function magia(S) {
    if (E.ordem(S) !== 'conselho') return;
    const ordem = ['runas', 'ervas', 'circulos'], e = S.eras;
    for (let k = 0; k < ordem.length; k++) {
      const id = ordem[k];
      if (e.magia[id]) continue;
      if (E.idade(S) >= k + 1 && S.ck.day % 10 === 0) { e.magia[id] = S.t; Sim().chron(S, MAGIA[id].txt); }
      return;
    }
  }
  E.temMagia = (S, id) => !!(S.eras && S.eras.magia[id]);
  E.calorCasa = (S) => (E.temMagia(S, 'runas') ? C.RUNAS_HEAT : 0);
  E.febreMult = (S) => (E.temMagia(S, 'ervas') ? 0.6 : 1);
  E.rocaMult = (S) => (E.temMagia(S, 'circulos') ? 1.2 : 1);

  // ---------- o desafio de cada idade ----------
  const pronto = (S, k) => !(S.eras.prox[k] > S.t);
  function desafios(S) {
    if (S.safe || S.resumido) return;
    const id = E.idade(S);
    if (id < 1) return;   // na pedra lascada não há desafio de era (e o sorteio do mundo fica como era)
    const r = S.rng.next();
    // pedra polida: a praga na roça (a lagarta come o que está crescendo)
    if (id >= 1 && pronto(S, 'praga') && r < C.ERA_PRAGA / C.YEAR_DAYS) {
      const rocas = S.buildings.filter((b) => b.type === 'roca' && b.built && b.farm && b.farm.st === 'crescendo');
      if (rocas.length) {
        for (const b of rocas) b.farm.lost = Math.min(0.95, (b.farm.lost || 0) + 0.5);
        S.eras.prox.praga = S.t + 2 * YEAR(); S.stats.pragas++;
        Sim().chron(S, 'Uma praga de lagarta desceu na roça: ' + (rocas.length > 1 ? 'as ' + rocas.length + ' roças vão render' : 'a roça vai render') + ' a metade.');
        return;
      }
    }
    // bronze: a guerra com a vila de fora (se ela não gosta de nós); a muralha segura
    const v = S.soc && S.soc.vila;
    if (id >= 2 && v && !v.fim && (v.laco || 0) < 0 && pronto(S, 'guerra') && r < C.ERA_GUERRA / C.YEAR_DAYS) {
      S.eras.prox.guerra = S.t + 2 * YEAR(); S.stats.guerras++;
      if (G.Cidade && S.buildings.some((b) => b.type === 'muralha' && b.built)) { Sim().chron(S, 'Gente d' + (v.art || 'e') + ' ' + v.nome + ' veio armada, mas parou na muralha e voltou.'); return; }
      let levou = 0;
      for (const k of ['peixe', 'carne', 'frutas', 'milho', 'feijao', 'mandioca', 'defumado', 'seca']) { const n = Math.floor((S.stock[k] || 0) * 0.2); S.stock[k] -= n; levou += n; }
      const feridos = S.people.filter((p) => p.alive && !p.fora && Fam().age(S, p) >= 16).sort(() => S.rng.next() - 0.5).slice(0, 1 + Math.floor(S.rng.next() * 3));
      for (const p of feridos) { p.needs.saude = Math.max(5, p.needs.saude - 40); }
      v.laco = Math.max(-100, (v.laco || 0) - 10);
      Sim().chron(S, 'Guerra: gente d' + (v.art || 'e') + ' ' + v.nome + ' atacou de noite e levou ' + levou + ' de comida. ' + Sim().listNames(feridos) + (feridos.length > 1 ? ' saíram feridos.' : ' saiu ferido.'));
      return;
    }
    // ferro: a fome da cidade grande (a cidade cresce mais que a roça)
    if (id >= 3 && vivos(S) >= 60 && S.ctx.foodDays < 4 && pronto(S, 'fome')) {
      S.eras.prox.fome = S.t + YEAR(); S.stats.fomesCidade++;
      if (G.Soc) for (const p of S.people) if (p.alive && !p.fora) G.Soc.addDesc(S, p, 8, 'fome');
      Sim().chron(S, 'A cidade cresceu mais que a roça: há fila na porta do armazém, e o povo reclama da fome.');
    }
  }
  // reinos: quando o líder morre, a briga pela sucessão
  E.onDeath = function (S, p) {
    if (!S.eras || E.idade(S) < 4 || !S.soc || S.soc.lider !== p.id || S.safe) return;
    S.stats.sucessoes++;
    if (G.Soc) for (const q of S.people) if (q.alive && !q.fora && S.rng.next() < 0.5) G.Soc.addDesc(S, q, 6, 'humor');
    Sim().chron(S, 'Com a morte de ' + p.name + ', ' + (S.eras.ordem === 'conselho' ? 'as mais velhas' : 'os de mais nome') + ' disputam quem fica no lugar. O povo se divide.');
  };

  // ---------- o relógio ----------
  E.daily = function (S) {
    if (!S.eras) E.init(S);
    passa(S);
    rumo(S);
    magia(S);
    desafios(S);
  };
  E.info = function (S) {
    const e = S.eras || {}, I = E.IDADES[e.idade || 0], O = e.ordem ? E.ORDENS[e.ordem] : null;
    return { idade: I.nome, prox: E.IDADES[(e.idade || 0) + 1] ? E.IDADES[(e.idade || 0) + 1].nome : '', falta: E.faltaWhy(S), ordem: O ? O.nome : '', ordemDesc: O ? O.desc : '', magia: Object.keys(e.magia || {}).map((k) => MAGIA[k].nome) };
  };
})(globalThis.G = globalThis.G || {});
