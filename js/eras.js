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
    // 0.29: a Idade Média (o conselho chega a ela pelas estrelas)
    { nome: 'Idade Média', curto: 'castelos e moinhos', escrita: true, magia: 'estrelas', gente: 120, marco: ['moinho', 'castelo'], txt: 'O moinho gira e a pedra dos castelos sobe: começou a Idade Média.', txtM: 'As mais velhas aprenderam a ler as estrelas e o tempo das coisas: começou, do jeito do conselho, a Idade Média.' },
    // 0.30: a Idade das Navegações (o conselho chega a ela pelas marés)
    { nome: 'Idade das Navegações', curto: 'navegações e comércio', escrita: true, magia: 'mares', gente: 160, marco: ['porto', 'galeao'], txt: 'Velas grandes saem do porto e voltam cheias: começou a Idade das Navegações.', txtM: 'As mais velhas cantam para o mar, e o mar escuta: começou, do jeito do conselho, a Idade das Navegações.' },
    // 0.31: a Idade da Pólvora e da Imprensa (o conselho chega a ela pelos cantos)
    { nome: 'Idade da Pólvora e da Imprensa', curto: 'pólvora e imprensa', escrita: true, magia: 'cantos', gente: 200, marco: ['imprensa', 'universidade'], txt: 'A prensa imprime o que se sabe e a pólvora troveja: começou a Idade da Pólvora e da Imprensa.', txtM: 'As mais velhas cantam tudo o que sabem, e ninguém esquece mais nada: começou, do jeito do conselho, a Idade da Pólvora e da Imprensa.' },
    // 0.32: a Revolução Industrial (o conselho chega a ela pela seiva)
    { nome: 'Revolução Industrial', curto: 'vapor e fábricas', escrita: true, magia: 'seiva', gente: 260, marco: ['fabrica', 'estacao'], txt: 'A chaminé fuma e o trem apita: começou a Revolução Industrial.', txtM: 'As mais velhas falam com a seiva das árvores, e as oficinas trabalham como se tivessem máquina: começou, do jeito do conselho, a Revolução Industrial.' },
    // 0.33: a Era Elétrica (o conselho chega a ela pelo relâmpago)
    { nome: 'Era Elétrica', curto: 'luz e cidade grande', escrita: true, magia: 'raio', gente: 330, marco: ['usina', 'bonde'], txt: 'A cidade acendeu de noite e o bonde corre no trilho: começou a Era Elétrica.', txtM: 'As mais velhas guardaram o relâmpago em vasos de barro, e as casas acenderam sem fio nenhum: começou, do jeito do conselho, a Era Elétrica.' },
    // 0.34: a Era Moderna (o conselho chega a ela pelo eco)
    { nome: 'Era Moderna', curto: 'motor, rádio e hospital', escrita: true, magia: 'eco', gente: 420, marco: ['radio', 'hospitalgeral'], txt: 'A voz do rádio entra em todas as casas e o motor corre na estrada: começou a Era Moderna.', txtM: 'As mais velhas falam baixo na beira do rio, e o eco leva a voz delas a toda casa: começou, do jeito do conselho, a Era Moderna.' },
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
  E.crimeMult = (S) => (E.ordem(S) === 'reino' ? 0.85 : 1) * (E.temCastelo && E.temCastelo(S) ? C.CASTELO_CRIME : 1) * (E.temRadio(S) ? C.RADIO_CRIME : 1);   // 0.29: o castelo   // 0.34: o rádio
  E.trocaMult = (S) => (E.ordem(S) === 'reino' ? 1.3 : 1);
  E.xp = (S) => (E.ordem(S) === 'guildas' ? 1.15 : 1);
  E.cacaMult = (S) => (E.ordem(S) === 'clas' ? 1.25 : 1);
  E.descMult = (S) => (E.ordem(S) === 'assembleia' ? 0.75 : 1) * (E.temLuz(S) ? C.USINA_DESC : 1) * (G.Guilda ? G.Guilda.descMult(S) : 1);   // 0.33: a luz
  // no conselho, só mulher fala por todos (o matriarcado das elfas)
  E.candidatos = (S, list) => (E.ordem(S) === 'conselho' && list.some((p) => p.sex === 'F') ? list.filter((p) => p.sex === 'F') : list);

  // ---------- a magia: o outro caminho do conselho ----------
  const MAGIA = {
    runas: { nome: 'Runas', de: 'das runas', txt: 'As mais velhas gravaram runas nas pedras das casas: a pedra aquece, e quem dorme sente 4 °C a mais.' },
    ervas: { nome: 'Ervas', de: 'das ervas', txt: 'O conselho juntou o saber das ervas e dos cantos: a febre pesa bem menos, e a saúde volta mais depressa.' },
    circulos: { nome: 'Círculos', de: 'dos círculos', txt: 'Círculos de pedra em volta da roça: a terra rende 20% mais.' },
    eco: { nome: 'Eco', de: 'do eco', txt: 'O conselho aprendeu a falar com o eco: a voz das mais velhas chega a toda casa, o malfeito cai 20% e duas tribos se conhecem de longe.' },   // 0.34
    raio: { nome: 'Relâmpago', de: 'do relâmpago', txt: 'O conselho aprendeu a guardar o relâmpago em vasos de barro: as casas acendem à noite, o povo estuda até tarde e reclama menos.' },   // 0.33
    seiva: { nome: 'Seiva', de: 'da seiva', txt: 'O conselho aprendeu a falar com a seiva: a madeira, a fibra e o ferro obedecem, e as oficinas trabalham 30% mais depressa.' },   // 0.32
    cantos: { nome: 'Cantos', de: 'dos cantos', txt: 'O conselho canta tudo o que se sabe, de boca em boca: o povo aprende as descobertas 30% mais depressa.' },   // 0.31
    mares: { nome: 'Marés', de: 'das marés', txt: 'As mais velhas aprenderam o canto das marés: o navio sai na hora certa e o mar leva bem menos gente.' },   // 0.30
    estrelas: { nome: 'Estrelas', de: 'das estrelas', txt: 'As mais velhas leem as estrelas: sabem quando vem a chuva e a geada, e a praga pega a roça pela metade.' },   // 0.29
  };
  E.MAGIA = MAGIA;
  // o conselho aprende um saber por idade (a partir da Pedra Polida), em vez de esperar o metal
  function magia(S) {
    if (E.ordem(S) !== 'conselho') return;
    const ordem = ['runas', 'ervas', 'circulos', 'estrelas', 'mares', 'cantos', 'seiva', 'raio', 'eco'], e = S.eras;
    for (let k = 0; k < ordem.length; k++) {
      const id = ordem[k];
      if (e.magia[id]) continue;
      if (E.idade(S) >= k + 1 && S.ck.day % 10 === 0) { e.magia[id] = S.t; Sim().chron(S, MAGIA[id].txt); }
      return;
    }
  }
  E.temMagia = (S, id) => !!(S.eras && S.eras.magia[id]);
  E.calorCasa = (S) => (E.temMagia(S, 'runas') ? C.RUNAS_HEAT : 0);
  E.febreMult = (S) => (E.temMagia(S, 'ervas') ? 0.6 : 1) * (S.buildings.some((b) => b.type === 'hospitalgeral' && b.built) ? C.HGERAL_FEBRE : 1);   // 0.34: o hospital geral
  // 0.29: o moinho (qualquer um pronto) faz toda a roça render mais
  E.rocaMult = (S) => (E.temMagia(S, 'circulos') ? 1.2 : 1) * (S.buildings.some((b) => b.type === 'moinho' && b.built) ? C.MOINHO_ROCA : 1);
  E.temCastelo = (S) => S.buildings.some((b) => b.type === 'castelo' && b.built);
  E.temPorto = (S) => S.buildings.some((b) => b.type === 'porto' && b.built);   // 0.30
  // 0.31: o que apressa o aprendizado (a imprensa, a universidade e os cantos do conselho) e o arsenal
  const tem = (S, k) => S.buildings.some((b) => b.type === k && b.built);
  E.temArsenal = (S) => tem(S, 'arsenal');
  // 0.32: a fábrica e a seiva apressam as oficinas; a greve, enquanto dura, faz o contrário
  E.oficioMult = (S) => (tem(S, 'fabrica') ? C.FABRICA_OFICIO : 1) * (E.temMagia(S, 'seiva') ? C.SEIVA_OFICIO : 1) * (S.eras && S.eras.greve > S.t ? C.GREVE_OFICIO : 1) * (S.eras && S.eras.apagao > S.t ? C.APAGAO_OFICIO : 1) * (S.eras && S.eras.crise > S.t ? C.CRISE_OFICIO : 1);
  E.temEstacao = (S) => tem(S, 'estacao');
  // 0.34: o rádio (ou o eco do conselho) e os motores da garagem
  E.temRadio = (S) => tem(S, 'radio') || E.temMagia(S, 'eco');
  E.cargaMult = (S) => (tem(S, 'garagem') ? C.GARAGEM_CARGA : 1);
  // 0.33: a luz nas casas vem da usina (some no apagão) ou do relâmpago do conselho; o bonde apressa o passo de todos
  E.temLuz = (S) => !!(S.eras && (E.temMagia(S, 'raio') || (tem(S, 'usina') && !(S.eras.apagao > S.t))));
  E.walkMult = (S) => (tem(S, 'bonde') ? C.BONDE_ANDA : 1);
  E.pratMult = (S) => (tem(S, 'imprensa') ? C.IMPRENSA_PRAT : 1) * (tem(S, 'universidade') ? C.UNIV_PRAT : 1) * (E.temMagia(S, 'cantos') ? C.CANTOS_PRAT : 1) * (E.temLuz(S) ? C.USINA_PRAT : 1);

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
        const pega = 0.5 * (E.temMagia(S, 'estrelas') ? C.ESTRELAS_PRAGA : 1);   // 0.29: quem lê as estrelas planta na hora certa
        for (const b of rocas) b.farm.lost = Math.min(0.95, (b.farm.lost || 0) + pega);
        S.eras.prox.praga = S.t + 2 * YEAR(); S.stats.pragas++;
        Sim().chron(S, 'Uma praga de lagarta desceu na roça: ' + (rocas.length > 1 ? 'as ' + rocas.length + ' roças vão render' : 'a roça vai render') + ' a metade.');
        return;
      }
    }
    // bronze: a guerra com a vila de fora (se ela não gosta de nós); a muralha segura
    const v = S.soc && S.soc.vila;
    if (id >= 2 && v && !v.fim && (v.laco || 0) < 0 && pronto(S, 'guerra') && r < C.ERA_GUERRA / C.YEAR_DAYS) {
      S.eras.prox.guerra = S.t + 2 * YEAR(); S.stats.guerras++;
      if (G.Cidade && S.buildings.some((b) => (b.type === 'muralha' || b.type === 'castelo') && b.built)) { Sim().chron(S, 'Gente d' + (v.art || 'e') + ' ' + v.nome + ' veio armada, mas parou ' + (E.temCastelo(S) ? 'no castelo' : 'na muralha') + ' e voltou.'); return; }
      let levou = 0;
      for (const k of ['peixe', 'carne', 'frutas', 'milho', 'feijao', 'mandioca', 'defumado', 'seca']) { const n = Math.floor((S.stock[k] || 0) * 0.2); S.stock[k] -= n; levou += n; }
      const feridos = S.people.filter((p) => p.alive && !p.fora && Fam().age(S, p) >= 16).sort(() => S.rng.next() - 0.5).slice(0, 1 + Math.floor(S.rng.next() * 3));
      for (const p of feridos) { p.needs.saude = Math.max(5, p.needs.saude - 40); }
      v.laco = Math.max(-100, (v.laco || 0) - 10);
      Sim().chron(S, 'Guerra: gente d' + (v.art || 'e') + ' ' + v.nome + ' atacou de noite e levou ' + levou + ' de comida. ' + Sim().listNames(feridos) + (feridos.length > 1 ? ' saíram feridos.' : ' saiu ferido.'));
      return;
    }
    // 0.29: Idade Média: a Grande Peste (uma onda de febre pela trilha; o hospital encurta, as ervas aliviam)
    if (id >= 5 && G.Cidade && G.Cidade.adoece && S.cidade && pronto(S, 'peste') && r < C.ERA_PESTE / C.YEAR_DAYS) {
      const pode = S.people.filter((p) => p.alive && !p.fora && !p.sick && !(p.imune > S.t));
      const n = Math.max(1, Math.round(pode.length * C.PESTE_PARTE));
      for (let k = 0; k < n && pode.length; k++) G.Cidade.adoece(S, pode.splice(Math.floor(S.rng.next() * pode.length), 1)[0]);
      S.eras.prox.peste = S.t + 3 * YEAR(); S.stats.pestes = (S.stats.pestes || 0) + 1;
      Sim().chron(S, 'A Grande Peste chegou pela trilha: ' + n + (n === 1 ? ' pessoa caiu' : ' pessoas caíram') + ' de febre de uma vez. Quem tem casa de cura sofre menos.');
      return;
    }
    // 0.34: Era Moderna: a Grande Crise (o dinheiro some e as oficinas perdem o ritmo). Com mercado, a vila troca o que tem
    // e atravessa sem parar; sem ele, as oficinas caem por uns dias, e sem rádio o povo ainda se revolta
    if (id >= 10 && pronto(S, 'crise') && r < C.ERA_CRISE / C.YEAR_DAYS) {
      S.eras.prox.crise = S.t + 3 * YEAR(); S.stats.crises = (S.stats.crises || 0) + 1;
      if (G.Cidade && G.Cidade.nivel && G.Cidade.nivel(S, 'mercado')) { Sim().chron(S, 'A Grande Crise chegou: o dinheiro de fora perdeu o valor. Na banca do mercado, o povo trocou o que tinha, e a vila atravessou sem parar.'); return; }
      S.eras.crise = S.t + C.CRISE_D * DAY();
      if (!E.temRadio(S) && G.Soc && G.Soc.addDesc) for (const p of S.people) if (p.alive && !p.fora) G.Soc.addDesc(S, p, C.CRISE_DESC, 'humor');
      Sim().chron(S, 'A Grande Crise chegou: o dinheiro de fora perdeu o valor. Por ' + C.CRISE_D + ' dias, as oficinas perdem o ritmo. ' + (E.temRadio(S) ? 'A voz no rádio acalmou o povo.' : 'Sem uma voz que acalme, a praça encheu de gente brava.') + ' Um mercado teria segurado.');
      return;
    }
    // 0.33: Era Elétrica: o Apagão (a usina fica sem carvão). Com carvão guardado, os foguistas gastam e a luz nem pisca;
    // sem carvão, a cidade fica no escuro por uns dias e as oficinas perdem o ritmo
    if (id >= 9 && tem(S, 'usina') && pronto(S, 'apagao') && r < C.ERA_APAGAO / C.YEAR_DAYS) {
      S.eras.prox.apagao = S.t + 2 * YEAR(); S.stats.apagoes = (S.stats.apagoes || 0) + 1;
      if ((S.stock.carvao || 0) >= C.APAGAO_CARVAO) { S.stock.carvao -= C.APAGAO_CARVAO; Sim().chron(S, 'A caldeira da usina engasgou no meio da noite. Os foguistas jogaram ' + C.APAGAO_CARVAO + ' de carvão guardado, e a luz nem piscou.'); return; }
      S.eras.apagao = S.t + C.APAGAO_D * DAY();
      Sim().chron(S, 'Apagão: a usina ficou sem carvão, e a cidade inteira escureceu. Por ' + C.APAGAO_D + ' dias, nada de luz, e as oficinas perdem o ritmo. Carvão guardado teria evitado.');
      return;
    }
    // 0.32: Revolução Industrial: a Greve (com a fábrica, os operários param por uns dias); no jeito da assembleia ou das
    // guildas, quem trabalha tem voz e a greve não chega
    if (id >= 8 && tem(S, 'fabrica') && pronto(S, 'greve') && r < C.ERA_GREVE / C.YEAR_DAYS) {
      S.eras.prox.greve = S.t + 2 * YEAR(); S.stats.greves = (S.stats.greves || 0) + 1;
      if (E.ordem(S) === 'assembleia' || E.ordem(S) === 'guildas') { Sim().chron(S, 'Os operários da fábrica reclamaram das horas. Na roda ' + (E.ordem(S) === 'guildas' ? 'das guildas' : 'da assembleia') + ', foram ouvidos, e ninguém parou.'); return; }
      S.eras.greve = S.t + C.GREVE_D * DAY();
      Sim().chron(S, 'Greve: os operários cruzaram os braços na porta da fábrica. Por ' + C.GREVE_D + ' dias, as oficinas trabalham pela metade.');
      return;
    }
    // 0.31: Pólvora e Imprensa: a Revolta dos Panfletos (a palavra impressa corre, e o povo se agita); a guarda acalma
    if (id >= 7 && pronto(S, 'revolta') && r < C.ERA_REVOLTA / C.YEAR_DAYS) {
      S.eras.prox.revolta = S.t + 2 * YEAR(); S.stats.revoltas = (S.stats.revoltas || 0) + 1;
      if (G.Cidade && G.Cidade.nivel && G.Cidade.nivel(S, 'guarda')) { Sim().chron(S, 'Folhas impressas apareceram nas portas, chamando o povo contra quem manda. A guarda recolheu os papéis e conversou na praça: a raiva passou.'); return; }
      if (G.Soc && G.Soc.addDesc) for (const p of S.people) if (p.alive && !p.fora) G.Soc.addDesc(S, p, C.REVOLTA_DESC, 'humor');
      Sim().chron(S, 'Folhas impressas apareceram nas portas, chamando o povo contra quem manda. A praça encheu de gente brava. Uma guarda teria acalmado.');
      return;
    }
    // 0.30: Navegações: os piratas (velas estranhas na costa); a torre de vigia vê antes, e o povo esconde tudo
    if (id >= 6 && pronto(S, 'piratas') && S.buildings.some((b) => (b.type === 'porto' || b.type === 'navio' || b.type === 'galeao') && b.built) && r < C.ERA_PIRATAS / C.YEAR_DAYS) {
      S.eras.prox.piratas = S.t + 2 * YEAR(); S.stats.piratas = (S.stats.piratas || 0) + 1;
      if (E.temArsenal(S)) { Sim().chron(S, 'Velas estranhas apareceram na costa. Do arsenal saiu o trovão da pólvora, e os piratas viraram o barco antes de chegar à praia.'); return; }   // 0.31
      if (S.buildings.some((b) => b.type === 'torre' && b.built)) { Sim().chron(S, 'Velas estranhas apareceram na costa. A torre de vigia viu de longe, o povo escondeu tudo, e os piratas foram embora com as mãos vazias.'); return; }
      const levou = [];
      for (const k of ['peixe', 'carne', 'defumado', 'frutas', 'sal', 'ferro', 'ouro', 'tabuas']) { const n = Math.floor((S.stock[k] || 0) * C.PIRATAS_LEVA); if (n > 0) { S.stock[k] -= n; levou.push(n + ' de ' + ((G.AI && G.AI.RES_LABEL && G.AI.RES_LABEL[k]) || k)); } }
      Sim().chron(S, 'Piratas desceram de noite pela praia e levaram ' + (levou.length ? levou.join(', ') : 'o pouco que acharam') + '. Uma torre de vigia teria visto as velas antes.');
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
    reforma(S);
    estudos(S);
  };
  // 0.31: a cada UNIV_D dias, os estudiosos da universidade adiantam a descoberta da vez
  function estudos(S) {
    if (S.safe || S.resumido || !tem(S, 'universidade') || S.ck.day % C.UNIV_D !== 0) return;
    const aberta = G.Tech && G.Tech.open ? G.Tech.open(S) : null;
    if (!aberta) return;
    G.Tech.addPractice(S, aberta, C.UNIV_HORAS, null);
    S.stats.estudos = (S.stats.estudos || 0) + 1;
    if (S.stats.estudos === 1) Sim().chron(S, 'Os primeiros estudiosos da universidade passaram a noite com os livros: a descoberta que o povo procura chegou mais perto.');
  }
  // 0.35: a casa muda de forma com a idade, não só de cor: a barraca vira cabana, a cabana vira casa de madeira e taipa,
  // depois a casa caiada, o sobrado, a casa de tijolo, a casa de varanda e o prédio. Cada forma abriga mais e melhor
  E.CASAS = [null,
    { name: 'Cabana', a: 'a', heat: 10, cap: 6, sleep: 12, desc: 'Paredes de pau a pique e telhado de palha: +10 °C e 6 lugares.' },
    { name: 'Casa de madeira e taipa', a: 'a', heat: 12, cap: 6, sleep: 13, desc: 'Esteios de madeira e paredes de taipa: +12 °C e 6 lugares.' },
    { name: 'Casa caiada', a: 'a', heat: 14, cap: 7, sleep: 13, desc: 'Paredes brancas de cal e telha de barro: +14 °C e 7 lugares.' },
    { name: 'Sobrado', a: 'o', heat: 15, cap: 8, sleep: 14, desc: 'Dois andares e sacada de ferro: +15 °C e 8 lugares.' },
    { name: 'Casa de tijolo', a: 'a', heat: 16, cap: 8, sleep: 14, desc: 'Tijolo aparente e chaminé: +16 °C e 8 lugares.' },
    { name: 'Casa de varanda', a: 'a', heat: 18, cap: 9, sleep: 14, desc: 'Varanda com colunas e luz na porta: +18 °C e 9 lugares.' },
    { name: 'Prédio de apartamentos', a: 'o', heat: 20, cap: 12, sleep: 15, desc: 'Quatro andares de concreto: +20 °C e 12 lugares no chão de uma casa.' },
  ];
  E.formaCasa = (era) => (era >= 10 ? 7 : era >= 9 ? 6 : era >= 8 ? 5 : era >= 7 ? 4 : era >= 6 ? 3 : era >= 4 ? 2 : era >= 2 ? 1 : 0);
  // as oficinas e as instituições têm três formas: madeira e pedra, tijolo, concreto
  E.formaObra = (era) => (era >= 9 ? 3 : era >= 7 ? 2 : era >= 4 ? 1 : 0);
  // 0.27: quando o povo muda de idade, as construções vão sendo refeitas no jeito novo, poucas por dia (as mais antigas
  // primeiro). O jeito aparece no telhado: sapê até a Pedra Polida, sapê trançado no Bronze, tabuinha no Ferro, telha
  // de barro nos Reinos
  const REFORMA_TXT = { 2: 'desmontam as barracas e levantam cabanas de pau a pique', 3: 'trocam o sapê por tabuinhas de madeira', 4: 'erguem casas de madeira e taipa, e as oficinas ganham paredes firmes', 5: 'cobrem os telhados de ardósia', 6: 'caiam as casas de branco e cobrem com telha de olaria', 7: 'erguem sobrados de dois andares, e as oficinas passam para o tijolo', 8: 'levantam casas de tijolo com chaminé e telhado de zinco', 9: 'fazem casas de varanda, com a luz na porta, e as oficinas passam para o concreto', 10: 'derrubam as casas velhas e sobem prédios de apartamentos' };
  function reforma(S) {
    const idade = S.eras.idade || 0;
    if (idade < 2) return;
    const velhas = S.buildings.filter((b) => b.built && !b.demol && (b.era || 0) < idade);
    if (!velhas.length) return;
    velhas.sort((a, b) => (a.era || 0) - (b.era || 0) || a.id - b.id);
    const n = Math.max(1, Math.ceil(velhas.length * C.REFORMA_DIA));
    if ((S.eras.reformou || 0) < idade && REFORMA_TXT[idade]) { S.eras.reformou = idade; Sim().chron(S, 'Com a ' + E.IDADES[idade].nome + ', o povo começa a refazer as casas: ' + REFORMA_TXT[idade] + '.'); }
    for (let i = 0; i < n && i < velhas.length; i++) { velhas[i].era = idade; velhas[i].reformT = S.t; }   // 0.35: a obra fica com andaime por um dia
  }
  E.reforma = reforma;
  E.info = function (S) {
    const e = S.eras || {}, I = E.IDADES[e.idade || 0], O = e.ordem ? E.ORDENS[e.ordem] : null;
    return { idade: I.nome, prox: E.IDADES[(e.idade || 0) + 1] ? E.IDADES[(e.idade || 0) + 1].nome : '', falta: E.faltaWhy(S), ordem: O ? O.nome : '', ordemDesc: O ? O.desc : '', magia: Object.keys(e.magia || {}).map((k) => MAGIA[k].nome) };
  };
})(globalThis.G = globalThis.G || {});
