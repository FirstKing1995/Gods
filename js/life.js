/* Gods · Vida (Etapa 6): o dia a dia do povo além do trabalho. Sem DOM.
   Conversas de pergunta e resposta (a resposta olha o mundo: a comida, o tempo, a fé de quem responde),
   histórias ao pé do fogo, festas, consolo no luto, brigas e pazes, os mais velhos ensinando os mais novos,
   orações de agradecimento (dão Poder) e de luto, e pequenos acontecimentos: ninho, cogumelos, estrela cadente,
   arco-íris, araras, galhos, pé torcido, formigas, vaga-lumes, primeira neve, sonho, cantoria e lua cheia. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const L = G.Life = {};
  const Sim = () => G.Sim, Fam = () => G.Family, God = () => G.God;
  const DAY = () => C.DAY_MIN;
  const ela = (p) => p.sex === 'F';
  const oa = (p) => (ela(p) ? 'a' : 'o');
  const pick = (S, arr) => arr[Math.min(arr.length - 1, Math.floor(S.rng.next() * arr.length))];
  const alive = (S) => S.people.filter((p) => p.alive);
  const person = (S, id) => Fam().person(S, id);
  const age = (S, p) => Fam().age(S, p);
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const low1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const the = (p) => (ela(p) ? 'a ' : 'o ') + p.name;   // "a Iara", "o Aruã"
  const ofThe = (p) => (ela(p) ? 'da ' : 'do ') + p.name;
  const forThe = (p) => (ela(p) ? 'pela ' : 'pelo ') + p.name;

  // ---------- estado ----------
  L.init = function (S) {
    const l = S.life || (S.life = {});
    l.story = null;   // história e festa em andamento não atravessam o save
    if (l.party && l.party.on) l.party = null;
    if (l.party === undefined) l.party = null;
    if (l.lastParty === undefined) l.lastParty = -1e9;
    if (l.storyDay === undefined) l.storyDay = -1;
    if (l.small === undefined) l.small = null;
    l.counts = l.counts || {};
    l.nextId = l.nextId || 1;
    if (l.fightToast === undefined) l.fightToast = -1e9;
    if (l.rainbowUntil === undefined) l.rainbowUntil = 0;
    if (l.firefliesUntil === undefined) l.firefliesUntil = 0;
    for (const p of S.people) if (p.feud === undefined) p.feud = {};
    const st = S.stats;
    st.stories = st.stories || 0; st.parties = st.parties || 0; st.fights = st.fights || 0; st.peace = st.peace || 0;
    st.consoled = st.consoled || 0; st.taught = st.taught || 0; st.talks = st.talks || 0;
  };

  // ---------- luto ----------
  const GRIEF = ['perdeuCompanheiro', 'perdeuFamilia', 'perdeuBebe'];
  L.grieving = (S, p) => p.mem.some((m) => GRIEF.indexOf(m.k) >= 0 && m.until > S.t);
  L.consoled = (S, p) => p.mem.some((m) => m.k === 'consolado' && m.until > S.t);
  // de quem p sente falta: o morto mais recente que era par ou família
  function missing(S, p, days) {
    let best = null;
    for (const q of S.people) {
      if (q.alive || q === p || S.t - q.diedAt > (days || 60) * DAY()) continue;
      if (!Fam().relation(S, p, q)) continue;
      if (!best || q.diedAt > best.diedAt) best = q;
    }
    return best;
  }
  function lastDeath(S, days) {
    let best = null;
    for (const q of S.people) if (!q.alive && S.t - q.diedAt <= days * DAY() && (!best || q.diedAt > best.diedAt)) best = q;
    return best;
  }
  function lastBirth(S, days) {
    let best = null;
    for (const q of S.people) if (q.alive && (q.mother || q.father) && S.t - q.born <= days * DAY() && (!best || q.born > best.born)) best = q;
    return best;
  }
  function recentDisc(S, days) {
    const k = S.tech && S.tech.known;
    if (!k) return null;
    let best = null;
    for (const id in k) if (S.t - k[id].t <= days * DAY() && (!best || k[id].t > best.t)) best = { id, t: k[id].t, by: k[id].by };
    return best;
  }
  const recentNarr = (S, key, days) => !!(S.narr && S.narr.log.some((e) => e.k === key && S.ck.day - e.day <= days));
  const kidsOf = (S, p) => S.people.filter((q) => q.alive && (q.mother === p.id || q.father === p.id));

  // ---------- conversas ----------
  // cada linha: { by: 0 (quem puxou) | 1 (quem respondeu), text, style }
  const AT = [5, 15, 27];
  function dlg(kind, pairs, extra) {
    const lines = [];
    for (const [by, text] of pairs) if (text) lines.push({ by, text });
    return Object.assign({ kind, lines, at: AT, dur: 36 + lines.length * 6 }, extra || {});
  }
  const SONHOS = [
    ['a gente voava por cima do rio.', 'Deve ser sinal de coisa boa.'],
    ['o inverno não acabava nunca.', 'Credo. Bate na madeira.'],
    ['uma capivara falava comigo.', 'E o que ela disse?'],
    ['tinha uma luz enorme no céu.', 'Eu também já sonhei com isso…'],
    ['a gente morava numa casa de pedra.', 'Casa de pedra? Que ideia.'],
  ];
  const WORK_ANS = {
    frutas: ['Colhi pitanga até encher o cesto.', 'Andei atrás de fruta a manhã toda.'],
    agua: ['Busquei água. Três viagens.', 'Enchi as cabaças no rio.'],
    madeira: ['Cortei lenha até doer o braço.', 'Derrubei uma árvore grande.'],
    pedra: ['Quebrei pedra a manhã toda.', 'Achei umas pedras boas lá pro norte.'],
    pesca: ['Pesquei. O rio tava generoso.', 'Fiquei na beira do rio. Peixe que é bom, pouco.'],
    caca: ['Fui caçar na mata.', 'Passei o dia de tocaia.', 'Segui rastro de bicho o dia todo.'],
    argila: ['Cavei barro na beira d\'água.'],
    construir: ['Trabalhei na obra.', 'Amarrei vara o dia inteiro.'],
    oficio: ['Lasquei pedra e fiz ferramenta.', 'Costurei couro.'],
    conservar: ['Arrumei o moquém.', 'Espalhei fruta no jirau.'],
    fogo: ['Cuidei do fogo.'],
    // Etapa 10: campo
    roca: ['Passei o dia na roça.', 'Capinei a roça. O mato não dá trégua.', 'Plantei, cova por cova.'],
    criacao: ['Cuidei dos bichos do curral.', 'Recolhi os ovos. Tinha um escondido no capim.', 'Dei ração para a bicharada.'],
    cerca: ['Finquei cerca o dia todo.', 'Amarrei vara na cerca nova.'],
  };
  const DISC_ART = { pedra: 'a pedra lascada', cestos: 'os cestos', lanca: 'a lança', anzol: 'o anzol', conserva: 'o moquém e o jirau', ceramica: 'a cerâmica' };
  const artOf = (id) => DISC_ART[id] || (G.Tech.DISC[id] && G.Tech.DISC[id].art) || '';   // as invenções (Etapa 8) trazem o seu
  // tópicos do papo: ok diz quando cabe; make devolve [pergunta, resposta]
  const TOPICS = [
    { w: 1, make(S, a, b) {
      const pr = S.precip;
      if (pr === 'neve') return ['Olha a neve caindo.', pick(S, ['Linda. Mas gelada demais.', 'Amanhã os pequenos vão querer brincar nela.'])];
      if (pr === 'chuva') return ['Essa chuva não para?', pick(S, ['Deixa chover. O rio agradece.', 'Pelo menos as cabaças enchem.'])];
      if (S.temp < 6) return ['Que frio!', S.ctx.fireLit ? 'Chega mais perto do fogo.' : 'Precisamos acender o fogo.'];
      if (S.temp > 26) return ['Que calor, né?', 'Dá vontade de morar dentro do rio.'];
      const rain = Sim().weatherOf(S, S.ck.day).kind === 'chuva' && S.ck.hour < Sim().weatherOf(S, S.ck.day).start;
      return ['Será que chove hoje?', rain ? 'Vai chover. Senti no joelho.' : 'Hoje não. O céu tá limpo.'];
    } },
    { w: 1.2, make(S, a) {
      const d = S.ctx.foodDays;
      const q = S.ck.season >= 2 ? 'Tem comida pra atravessar o inverno?' : 'Como tá a comida?';
      return [q, d >= 30 ? pick(S, ['Tem de sobra. Pode ficar tranquil' + oa(a) + '.', 'O estoque tá cheio.']) : d >= 12 ? 'Dá, se ninguém exagerar.' :
        d >= 4 ? 'Tá curta. Amanhã eu vou pescar cedo.' : 'Quase nada. Precisamos de peixe e fruta.'];
    } },
    { w: 0.7, ok: (S) => S.ck.season >= 1 && S.stats.firstFire, make(S) {
      const m = S.stock.madeira;
      return ['E a lenha, vai dar?', m >= 60 ? 'Tem pilha pra muitas noites.' : m >= 20 ? 'Dá umas noites. Melhor cortar mais.' : 'Tá acabando. Vou cortar amanhã.'];
    } },
    { w: 1.5, ok: (S) => S.ck.season === 2 && Sim().daysToWinter(S) <= 12, make(S) {
      return ['O inverno tá chegando.', pick(S, ['Eu sei. Já sinto no vento.', 'Dessa vez a gente tá pronto.', 'Tomara que seja manso.'])];
    } },
    { w: 1, make(S, a, b) {
      const g = S.god;
      if (g && S.t - g.lastGrace < 3 * DAY()) return ['Você viu o milagre?', pick(S, ['Vi! Até agora tô arrepiad' + oa(b) + '.', 'Vi. Tem alguém cuidando da gente.'])];
      return ['Você acha que alguém olha por nós?', b.fe >= 65 ? pick(S, ['Eu sinto. Tem alguém lá em cima.', 'Tenho certeza.']) :
        b.fe <= 35 ? pick(S, ['Acho que não. É a gente e a gente.', 'Se olha, anda distraído.']) : 'Às vezes acho que sim.'];
    } },
    { w: 0.5, ok: (S) => S.god && S.god.miracles > 0, make(S, a, b) {
      // Etapa 11: depois que o povo dá um nome a Deus, o papo muda
      const n = S.god.name;
      if (n) return ['Você reza pra ' + n + '?', b.fe >= 60 ? 'Todo dia. ' + n + ' ouve a gente.' : b.fe >= 40 ? 'Às vezes. Quando aperta.' : 'Não sei se ' + n + ' escuta.'];
      return ['Será que ele tem nome, o lá de cima?', b.fe >= 50 ? 'Deve ter. Um dia ele conta pra gente.' : 'Se tem, nunca disse.'];
    } },
    { w: 2, ok: (S) => recentDisc(S, 20), make(S) {
      const k = recentDisc(S, 20), d = G.Tech.DISC[k.id];
      const verb = d && d.inv ? 'inventou' : 'descobriu';
      return ['Viu o que ' + (k.by || 'o povo') + ' ' + verb + '?', pick(S, [cap1(artOf(k.id) || d.name) + '! Quem diria.', 'Vi! Vai ajudar muito.'])];
    } },
    { w: 2, ok: (S) => lastBirth(S, 15), make(S) {
      const k = lastBirth(S, 15), dad = person(S, k.father);
      return ['Viu ' + (ela(k) ? 'a pequena ' : 'o pequeno ') + k.name + '?', pick(S, ['Vi. É a cara ' + (dad ? ofThe(dad) : 'da mãe') + '.', 'Vi! Chorou a noite toda.', 'Uma bênção.'])];
    } },
    { w: 3, ok: (S, a) => missing(S, a, 30), make(S, a) {
      const d = missing(S, a, 30);
      return ['Sinto falta ' + ofThe(d) + '.', pick(S, ['Eu também. Todo dia.', (ela(d) ? 'Ela' : 'Ele') + ' ia gostar de ver isso aqui.'])];
    } },
    { w: 2, ok: (S) => recentNarr(S, 'lobos', 8), make(S) {
      return ['Ouviu os lobos aquela noite?', pick(S, ['Ouvi. Não durmo longe do fogo.', 'Ouvi. Meu coração quase saiu pela boca.'])];
    } },
    { w: 1.5, ok: (S) => recentNarr(S, 'nevasca', 10), make(S) { return ['Que nevasca foi aquela…', 'Achei que a barraca ia voar.']; } },
    { w: 1.5, ok: (S) => recentNarr(S, 'seca', 12), make(S) { return ['Lembra da seca?', 'Nem me fala. O rio parecia um fio.']; } },
    { w: 1, ok: (S, a, b) => age(S, b) >= 12, make(S, a, b) {
      return ['O que você fez hoje?', WORK_ANS[b.lastWork] ? pick(S, WORK_ANS[b.lastWork]) : 'Descansei um pouco. Ninguém é de ferro.'];
    } },
    { w: 0.6, ok: (S, a, b) => !a.mother && !a.father && !b.mother && !b.father, make(S) {
      return ['Lembra da nossa terra?', pick(S, ['Lembro. Mas aqui é casa agora.', 'Às vezes sonho com ela.'])];
    } },
    { w: 0.6, make(S) { return ['E se vier mais gente?', alive(S).length < 8 ? 'Tomara. Tem lugar pra todo mundo.' : 'Vai precisar de mais barraca.']; } },
    { w: 0.6, make(S) { const s = pick(S, SONHOS); return ['Sonhei que ' + s[0], s[1]]; } },
    { w: 1, ok: (S, a, b) => kidsOf(S, b).length, make(S, a, b) {
      const k = pick(S, kidsOf(S, b)), n = age(S, k);
      return ['Como tá ' + the(k) + '?', n < 1 ? 'Mamando e dormindo. Graças.' : pick(S, ['Crescendo rápido. Já tem ' + n + (n === 1 ? ' ano.' : ' anos.'), 'Dá trabalho, mas é minha alegria.'])];
    } },
    { w: 2, ok: (S) => S.life && S.t - S.life.lastParty < 3 * DAY(), make(S) { return ['Que festa, hein?', pick(S, ['Dancei até cansar.', 'Ainda tô com a música na cabeça.'])]; } },
    { w: 3, ok: (S, a) => a.needs.fome < 30, make(S) { return ['Tô com uma fome…', S.ctx.food > 0 ? 'Tem comida no estoque. Vai lá.' : 'Eu também. Vamos colher fruta?']; } },
    { w: 3, ok: (S, a) => a.needs.calor < 35, make(S) { return ['Tô gelado até os ossos.', S.ctx.fireLit ? 'Vem pro fogo.' : 'Alguém precisa acender o fogo.']; } },
    { w: 1, ok: (S) => S.ck.hour >= 16, make(S) { return ['Que dia…', pick(S, ['Amanhã tem mais.', 'Pelo menos ninguém passou fome.', 'Tô moído.'])]; } },
  ];
  // os tópicos com gênero no fim ('gelado', 'moído', 'pronto') se ajustam a quem fala
  function fixGender(S, lines, a, b) {
    for (const ln of lines) {
      const who = ln.by ? b : a;
      if (ela(who)) ln.text = ln.text.replace(/(gelad|moíd|pront)o\b/g, '$1a');
    }
    return lines;
  }
  const CASAL = [
    ['Você é a minha casa.', 'E você a minha.'],
    ['Olha o céu hoje.', 'Bonito. Mas eu prefiro olhar pra você.'],
    ['Lembra de quando a gente se conheceu?', 'Lembro de cada detalhe.'],
    ['Que bom que você tá aqui.', 'Não ia estar em outro lugar.'],
    ['Me dá a mão?', 'Sempre.'],
    ['Guardei a fruta mais doce pra você.', 'Por isso que eu gosto de você.'],
  ];
  // 0.10: com as noites picantes ligadas, o namoro dos pares (sempre adultos) fica mais atrevido
  const CASAL_PICANTE = [
    ['Hoje à noite você vem pra minha rede?', 'Só se você prometer não dormir cedo.'],
    ['Tá frio. Me esquenta mais tarde?', 'Guarda um lugar debaixo da manta.'],
    ['Sonhei com você de novo.', 'Sonho bom ou sonho de dar vergonha?'],
    ['Tô com saudade das nossas noites.', 'Hoje eu durmo lá.'],
    ['Fecha a barraca cedo hoje?', 'E quem disse que a gente vai dormir?'],
    ['Me dá um beijo antes do trabalho?', 'Um só não dá.'],
  ];
  // 0.12, tom adulto (+18, escolhido no menu): o par fala de desejo sem rodeio. Só adultos; nada é descrito
  const CASAL_ADULTO = [
    ['Quero você hoje à noite.', 'Então não demora no trabalho.'],
    ['Ontem foi bom demais.', 'Hoje tem mais.'],
    ['Tô com vontade de você desde cedo.', 'Eu também. Espera escurecer.'],
    ['Dorme lá em casa hoje. Sem dormir.', 'Combinado.'],
    ['Vamos transar hoje?', 'Hoje, amanhã e depois.'],
    ['Você fica uma delícia suando assim.', 'Para, que tem gente olhando.'],
    ['Me espera sem roupa?', 'Só se você chegar cedo.'],
  ];
  const KID_Q = [
    ['Por que o céu é azul?', ['Porque alguém lá em cima pintou assim.', 'Ninguém sabe ainda. Descobre pra mim?']],
    ['Quando eu crescer posso caçar?', ['Pode. Mas primeiro aprende a pescar.', 'Quando tiver força pra lança.']],
    ['O que tem depois do rio?', ['Mais mundo. Um dia a gente vai ver.', 'Muita coisa que ninguém viu.']],
    ['Conta uma história?', ['De noite, perto do fogo.', 'Hoje à noite eu conto.']],
    ['Por que o fogo é quente?', ['Porque é um pedaço do sol.', 'Pra gente não passar frio.']],
    ['Posso brincar no rio?', ['Só no raso, e com alguém olhando.', 'Pode, mas não vai longe.']],
    ['Olha o que eu achei!', ['Que pedra bonita!', 'Guarda. Pode servir pra alguma coisa.']],
    ['Por que as estrelas não caem?', ['Porque alguém segura elas lá em cima.', 'Às vezes caem. Faz um pedido quando cair.']],
  ];
  const ADULT_KID = [
    ['O que você aprendeu hoje?', ['Que peixe gosta de minhoca!', 'A subir na árvore!', 'Nada. Brinquei o dia todo.']],
    ['Já tomou água hoje?', ['Já! Duas cabaças.', 'Esqueci…']],
    ['Tá com frio?', ['Um pouquinho.', 'Não! Eu sou forte.']],
  ];
  const KIDS2 = [['Vamos brincar?', 'Vamos! Você pega.'], ['Aposto que eu corro mais que você.', 'Duvido!'], ['Achei um besouro!', 'Deixa eu ver!']];
  // quem sabe ensina: a pergunta e a resposta de cada ofício
  const TEACH = {
    pesca: ['Olha: segura a linha assim e espera.', 'Assim? Acho que beliscou!', 'pescar'],
    coleta: ['Escolhe a fruta mais vermelha. Essa ainda tá verde.', 'Essa aqui? Tá bem vermelhinha.', 'colher'],
    construcao: ['Amarra o cipó bem firme, senão desmancha.', 'Assim tá firme?', 'construir'],
    caca: ['Segura a lança assim, e mira no ombro.', 'Tá pesada… mas eu consigo.', 'caçar'],
    oficio: ['Bate a pedra de lado, que a lasca sai fina.', 'Saiu! Olha que afiada.', 'lascar pedra'],
  };
  const BRIGA = [
    (a, b) => ['Você não fez nada hoje!', 'E você, que só fala?'],
    (a, b) => ['Foi você que deixou o fogo apagar!', 'Não fui eu! Me deixa em paz.'],
    (a, b) => ['Você comeu a minha parte!', 'Comi nada! Tá doid' + oa(a) + '?'],
    (a, b) => ['Para de reclamar!', 'Reclamo sim, tá tudo errado!'],
    (a, b) => ['Sai da minha frente!', 'Sai você!'],
  ];
  // tom adulto: adulto brigando com adulto solta palavrão
  const BRIGA_ADULTA = [
    (a, b) => ['Você não fez porra nenhuma hoje!', 'E você, que só sabe encher o saco?'],
    (a, b) => ['Foi você que deixou o fogo apagar, seu merda!', 'Não fui eu! Vai à merda.'],
    (a, b) => ['Você comeu a minha parte, desgraçad' + oa(b) + '!', 'Comi porra nenhuma! Tá doid' + oa(a) + '?'],
    (a, b) => ['Cala essa boca!', 'Calo nada. Tá tudo uma merda mesmo!'],
    (a, b) => ['Some da minha frente!', 'Some você, cacete!'],
  ];
  const PAZES = [['Desculpa por aquilo.', 'Tudo bem. Já passou.'], ['Eu tava de cabeça quente.', 'Eu também. Vamos esquecer.'], ['Paz?', 'Paz.']];

  function skillLevel(p, sk) { return G.AI.lvl(p, sk); }
  function bestSkill(S, p) {
    let best = null, bl = 0;
    for (const sk of Object.keys(TEACH)) {
      if (sk === 'caca' && !G.Tech.known(S, 'lanca')) continue;
      if (sk === 'oficio' && !G.Tech.known(S, 'pedra')) continue;
      const l = skillLevel(p, sk);
      if (l > bl) { bl = l; best = sk; }
    }
    return bl >= 3 ? best : null;
  }
  function fightChance(S, a, b) {
    if (age(S, a) < 12 || age(S, b) < 12) return 0;
    if (S.t < C.FIGHT_GRACE_D * DAY()) return 0;   // o começo é em paz: o casal ainda está se ajeitando
    let ch = C.FIGHT_BASE;
    for (const p of [a, b]) {
      if (p.mood < 30) ch += C.FIGHT_LOW;
      if (p.traits.indexOf('Pessimista') >= 0) ch += 0.02;
      if (p.traits.indexOf('Otimista') >= 0) ch -= 0.01;
    }
    if (S.povos && S.povos.mixed && G.Povos) ch *= G.Povos.fightMult(S, a, b);   // Etapa 12: povos que se estranham brigam mais
    return Math.max(0, ch);
  }
  // monta a conversa: o tipo e as falas. hint 'consolo' vem da IA (quem viu alguém de luto)
  L.dialog = function (S, a, b, hint) {
    const F = Fam(), ka = age(S, a), kb = age(S, b);
    // pazes: brigaram e a raiva já passou
    if ((a.feud && a.feud[b.id]) || (b.feud && b.feud[a.id])) {
      const [q, r] = pick(S, PAZES);
      return dlg('pazes', [[0, q], [1, r]]);
    }
    // consolo: quem está bem conversa com quem está de luto
    if (ka >= 12 && !L.grieving(S, a) && L.grieving(S, b) && (hint === 'consolo' || !L.consoled(S, b))) {
      const d = missing(S, b, 60);
      const q = d ? pick(S, ['Sinto muito ' + forThe(d) + '.', (ela(d) ? 'Ela' : 'Ele') + ' tá olhando por você lá de cima.', 'Eu tô aqui, viu? Pro que precisar.']) : 'Eu tô aqui, viu? Pro que precisar.';
      return dlg('consolo', [[0, q], [1, pick(S, ['Obrigad' + oa(b) + '. Dói muito.', 'Ainda não acredito.', 'Ajuda saber que você tá aqui.'])]], { style: 'consolo' });
    }
    // briga: gente de mau humor se estranha
    if (S.rng.next() < fightChance(S, a, b)) {
      const [q, r] = pick(S, F.adulto && F.adulto(S) && ka >= 18 && kb >= 18 ? BRIGA_ADULTA : BRIGA)(a, b);
      return dlg('briga', [[0, q], [1, r]], { at: [3, 10], dur: 22, style: 'briga' });
    }
    // ensinar: quem sabe (nível 3+) com quem está aprendendo (7 a 17 anos)
    const teacher = ka >= 18 && kb >= 7 && kb < 18 ? a : kb >= 18 && ka >= 7 && ka < 18 ? b : null;
    if (teacher && S.rng.next() < 0.5) {
      const sk = bestSkill(S, teacher);
      if (sk) {
        const learner = teacher === a ? b : a, t = TEACH[sk];
        const pairs = teacher === a ? [[0, t[0]], [1, t[1]]] : [[0, 'Me ensina a ' + t[2] + '?'], [1, 'Ensino. ' + t[0]], [0, t[1]]];
        return dlg('ensino', pairs, { teacher: teacher.id, learner: learner.id, skill: sk });
      }
    }
    // criança com adulto
    if (ka >= 3 && ka < 12 && kb >= 12) {
      const [q, rs] = pick(S, KID_Q), rel = F.relation(S, a, b);
      const call = rel === 'mãe' || rel === 'pai' || rel === 'avó' || rel === 'avô' ? cap1(rel) + ', ' + low1(q) : q;
      let r = pick(S, rs);
      if (q === 'Conta uma história?' && S.ck.hour >= 18) r = 'Vem pro fogo que eu conto.';
      return dlg('crianca', [[0, call], [1, r]]);
    }
    if (kb >= 3 && kb < 12 && ka >= 12) {
      const [q, rs] = pick(S, ADULT_KID);
      return dlg('crianca', [[0, q], [1, pick(S, rs)]]);
    }
    if (ka < 12 && kb < 12) { const [q, r] = pick(S, KIDS2); return dlg('crianca', [[0, q], [1, r]]); }
    // par: namoro
    if (F.isPartner(a, b) && S.rng.next() < 0.6) {
      const hot = F.spicy && F.spicy(S) && F.age(S, a) >= 18 && F.age(S, b) >= 18 && S.rng.next() < 0.35;
      const [q, r] = pick(S, hot ? (F.adulto(S) ? CASAL_ADULTO.concat(CASAL_PICANTE) : CASAL_PICANTE) : CASAL);
      return dlg('casal', [[0, q], [1, r]], { style: 'casal' });
    }
    // papo: um tópico que caiba agora
    const opts = TOPICS.filter((t) => !t.ok || t.ok(S, a, b));
    let sum = 0;
    for (const t of opts) sum += t.w;
    let r = S.rng.next() * sum, top = opts[0];
    for (const t of opts) { r -= t.w; if (r <= 0) { top = t; break; } }
    const [q, ans] = top.make(S, a, b);
    const d = dlg('papo', [[0, q], [1, ans]]);
    fixGender(S, d.lines, a, b);
    return d;
  };

  // depois da conversa: o que cada tipo muda
  L.afterChat = function (S, a, b, d) {
    if (!d) return;
    const Sm = Sim(), F = Fam();
    S.stats.talks++;
    if (S.povos && S.povos.mixed && G.Povos) G.Povos.onChat(S, a, b, d.kind);   // Etapa 12: a conversa aproxima os povos (a briga afasta)
    const rec = { t: S.t, kind: d.kind, lines: d.lines.map((ln) => [(ln.by ? b : a).name, ln.text]) };
    a.talk = rec; b.talk = rec;
    if (d.kind === 'casal') F.addAfeto(S, a, b, 2);
    else if (d.kind === 'consolo') {
      Sm.addMem(S, b, 'consolado'); Sm.addMem(S, a, 'consolou');
      // o consolo encurta o luto
      for (const m of b.mem) if (GRIEF.indexOf(m.k) >= 0) m.until = Math.max(S.t + 5 * DAY(), m.until - C.CONSOLO_DAYS * DAY());
      a.rel[b.id] = (a.rel[b.id] || 0) + 1; b.rel[a.id] = (b.rel[a.id] || 0) + 1;
      S.stats.consoled++;
      if (!S.stats.firstConsolo) { S.stats.firstConsolo = true; Sm.toast(S, a.name + ' consolou ' + b.name + '. O luto pesa menos quando se divide.', 'good'); }
    } else if (d.kind === 'ensino') {
      const t = person(S, d.teacher), l = person(S, d.learner);
      if (t && l) {
        l.skills[d.skill] = (l.skills[d.skill] || 0) + C.TEACH_XP * F.xpFactor(S, l);
        Sm.addMem(S, l, 'aprendeuCom'); Sm.addMem(S, t, 'ensinou');
        S.stats.taught++;
        if (!S.stats.firstTeach) { S.stats.firstTeach = true; Sm.toast(S, t.name + ' ensinou ' + l.name + ' a ' + TEACH[d.skill][2] + '. Quem aprende com os mais velhos aprende mais rápido.', 'good'); }
      }
    } else if (d.kind === 'briga') {
      Sm.addMem(S, a, 'brigou'); Sm.addMem(S, b, 'brigou');
      const until = S.t + Math.round((C.FEUD_DAYS[0] + S.rng.next() * (C.FEUD_DAYS[1] - C.FEUD_DAYS[0])) * DAY());
      (a.feud || (a.feud = {}))[b.id] = until; (b.feud || (b.feud = {}))[a.id] = until;
      if (F.isPartner(a, b)) F.addAfeto(S, a, b, -8);
      S.stats.fights++;
      if (S.t - S.life.fightToast > 2 * DAY()) { S.life.fightToast = S.t; Sm.toast(S, a.name + ' e ' + b.name + ' brigaram. Vão ficar uns dias sem se falar.', 'warn'); }
      S.events.push({ k: 'fight', x: a.x, y: a.y });
    } else if (d.kind === 'pazes') {
      if (a.feud) delete a.feud[b.id];
      if (b.feud) delete b.feud[a.id];
      Sm.addMem(S, a, 'fezPazes'); Sm.addMem(S, b, 'fezPazes');
      a.rel[b.id] = (a.rel[b.id] || 0) + 1; b.rel[a.id] = (b.rel[a.id] || 0) + 1;
      if (F.isPartner(a, b)) F.addAfeto(S, a, b, 4);
      S.stats.peace++;
      Sm.toast(S, a.name + ' e ' + b.name + ' fizeram as pazes.', 'good');
    }
  };
  // quem brigou evita a pessoa até a raiva passar; depois, a próxima conversa é de pazes
  L.avoid = (S, a, b) => !!((a.feud && a.feud[b.id] > S.t) || (b.feud && b.feud[a.id] > S.t));

  // ---------- histórias ao pé do fogo ----------
  // a fogueira do acampamento. Com 'unlit', vale também a apagada, se há lenha no estoque para acender
  L.campFire = function (S, unlit) {
    let best = null, bd = 1e9;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built) continue;
      const out = b.fuel <= 0.5;
      if (out && !(unlit && S.stock.madeira >= 1)) continue;
      const d = Math.hypot(b.x - S.camp.x, b.y - S.camp.y);
      if (d >= 9) continue;
      const sc = d + (out ? 6 : 0);   // acesa ganha da apagada
      if (sc < bd) { bd = sc; best = b; }
    }
    return best;
  };
  // de tardinha, quem vai contar história ou abrir a festa acende o fogo com lenha do estoque (1 lenha = 5 h)
  L.lightFire = function (S, f, n) {
    if (!f || f.fuel > 0.5) return false;
    const k = Math.min(n || 1, Math.floor(S.stock.madeira));
    if (k <= 0) return false;
    S.stock.madeira -= k; f.fuel += k;
    S.events.push({ k: 'fireLit', x: f.x, y: f.y });
    return true;
  };
  const storyHour = (S) => S.ck.hour >= 17.5 && S.ck.hour < 19.5;   // de tardinha, antes do sono
  function calmEvening(S) {
    return storyHour(S) && !S.precip && !(G.Narr && (G.Narr.beastsOut(S) || G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade'))) && !(S.life.party && S.life.party.on);
  }
  const fine = (p) => p.needs.fome >= 30 && p.needs.sede >= 30 && p.needs.energia >= 20 && p.needs.calor >= 30 && p.needs.saude >= 40;
  L.canTell = function (S, p) {
    const l = S.life;
    if (!l || l.story || l.storyDay === S.ck.day || !calmEvening(S)) return false;
    if (p.carriedBy || p.labor || age(S, p) < 14 || !fine(p)) return false;
    if (G.Memoria && S.memoria && G.Memoria.blockStory(S)) return false;   // Etapa 13: noite de velório ou de rito não tem história
    if (G.Deus && S.god && S.god.pending && G.Deus.sermonFirst(S, p)) return false;   // Etapa 11: a vez é do profeta
    const f = L.campFire(S, true);
    if (!f) return false;
    // alguém para ouvir
    return S.people.some((q) => q !== p && q.alive && !q.carriedBy && !q.sleeping && age(S, q) >= 3 && Math.hypot(q.x - f.x, q.y - f.y) < 16);
  };
  L.tellScore = (S, p) => 44 + (Fam().stage(S, p) === 'idoso' ? 20 : 0) + (kidsOf(S, p).some((k) => age(S, k) >= 3) ? 6 : 0) + (p.traits.indexOf('Otimista') >= 0 ? 4 : 0);
  // a fogueira manda: de pedras, 12 ouvintes; do centro, com bancos, 16 (Etapa 7)
  L.fireDef = (S, id) => { const f = Sim().building(S, id); return f ? Sim().def(f).fire : C.BUILD.fogueira.fire; };
  L.canListen = function (S, p, st) {
    if (!st || st.teller === p.id || p.carriedBy || p.sleeping || age(S, p) < 3 || st.listeners.length >= L.fireDef(S, st.fire).listen) return false;
    const f = Sim().building(S, st.fire);
    return !!f && Math.hypot(p.x - f.x, p.y - f.y) < 10 && fine(p);
  };
  const LEGENDS = [
    ['Contam que, no começo, o céu era escuro, até alguém lá de cima acender o sol.', 'Por isso a gente acorda com ele.'],
    ['Contam que o lobo já foi amigo do homem, até tentar roubar o fogo.', 'Desde então ele ronda, mas não chega perto.'],
    ['Contam que o rio nasce das lágrimas de uma estrela que se perdeu.', 'Por isso a água é tão fria de manhã.'],
    ['Contam que cada fogueira acesa é uma estrela a mais no céu.', 'Olhem pra cima e contem.'],
    ['Contam que o trovão é Deus pigarreando antes de falar.', 'E quando ele fala, a gente escuta.'],
    ['Contam que a pitanga é vermelha porque guarda um pedaço do pôr do sol.', 'Por isso é doce no fim da tarde.'],
    ['Contam que o inverno é o mundo dormindo, e a primavera é ele acordando com fome.', 'Por isso a gente guarda comida.'],
    ['Contam que a capivara ensinou a gente a nadar, e cobrou em pitanga.', 'Até hoje ela cobra.'],
    ['Contam que quem planta uma árvore nunca morre de todo.', 'Fica morando nela.'],
  ];
  const STORY_END = ['E é por isso que estamos aqui.', 'Nunca esqueçam disso.', 'Por isso a gente cuida uns dos outros.', 'Quem não acredita pergunta pro vento.', 'E foi assim.'];
  const REACT = ['E depois?', 'Nossa…', 'Conta de novo!', 'Ha ha!', 'É verdade isso?', 'Que medo!', 'Que bonito.'];
  // uma lembrança do povo (a Crônica vira história) ou uma lenda
  function storyLines(S, teller) {
    const old = S.chron.filter((c) => S.t - c.t > 3 * DAY() && !/^Começa |^A Era |^Novas metas|^O povo mandou/.test(c.text));
    if (old.length >= 2 && S.rng.next() < 0.6) {
      const c = pick(S, old);
      let t = c.text.split(/\.\s/)[0].replace(/\.$/, '');
      if (t.indexOf(':') > 0) t = t.slice(0, t.indexOf(':'));
      const mid = pick(S, ['Eu estava lá. Nunca vou esquecer.', 'Parece que foi ontem.', 'Foi assim que tudo mudou.', 'Quem estava lá lembra.']);
      return ['Lembram quando ' + low1(t) + '?', mid, pick(S, STORY_END)];
    }
    const lg = pick(S, LEGENDS);
    return [lg[0], lg[1], pick(S, ['Juro que é verdade!', 'Minha mãe me contou, e a mãe dela contou pra ela.', 'E até hoje é assim.'])];
  }
  // com a flauta (Etapa 8), algumas noites a história vira música: quem conta toca, e a fala do meio é a flauta
  const MUSIC_OPEN = ['Hoje eu vou tocar.', 'Escutem essa.', 'Essa eu aprendi com o vento.', 'Essa é das antigas.'];
  const MUSIC_END = ['Essa é pra quem já se foi.', 'E pra quem ainda vai chegar.', 'Pronto. Agora dá pra dormir.', ''];
  const MUSIC_REACT = ['Que bonito…', 'Toca mais uma!', 'Parece passarinho.', 'Me deu saudade.', 'Que sono bom…'];
  const SERMON_REACT = ['Amém.', 'É verdade.', 'Eu sinto isso.', 'Que bonito…', 'Fala mais!', 'Eu acredito.'];
  // sermon (Etapa 11): o escolhido da Palavra prega em vez de contar
  L.startStory = function (S, p, f, sermon) {
    const l = S.life;
    const mem = !sermon && G.Memoria && S.memoria ? G.Memoria.storyFor(S, p) : null;   // Etapa 13: quem sabe um conto de Deus às vezes conta um
    const music = !sermon && !mem && !!(G.Inv && G.Inv.flute(S)) && S.rng.next() < C.FLAUTA_STORY;
    const lines = sermon ? G.Deus.sermonLines(S) : mem ? mem.lines : music ? [pick(S, MUSIC_OPEN), '', pick(S, MUSIC_END)] : storyLines(S, p);
    const dur = C.STORY_MIN[0] + Math.round(S.rng.next() * (C.STORY_MIN[1] - C.STORY_MIN[0]));
    l.story = { id: l.nextId++, teller: p.id, fire: f.id, on: false, t0: S.t, dur, lines, li: 0, listeners: [], heard: {}, music, sermon: !!sermon, conto: mem ? mem.conto : 0 };
    l.storyDay = S.ck.day;
    return l.story;
  };
  // o que a história diz a cada momento (e quem ouve reage)
  L.storyTick = function (S, p, st, t) {
    const at = [4, st.dur * 0.4, st.dur * 0.8];
    while (st.li < st.lines.length && t >= at[st.li]) { const ln = st.lines[st.li++]; if (ln) Sim().say(S, p, ln, true, 'historia'); }
    if (st.li >= 1 && S.rng.next() < 0.03) {
      const ls = st.listeners.map((id) => person(S, id)).filter((q) => q && q.alive && q.act && q.act.type === 'ouvir' && q.act.stage === 'listen');
      if (ls.length) Sim().say(S, pick(S, ls), pick(S, st.sermon ? SERMON_REACT : st.music ? MUSIC_REACT : REACT), false);
    }
  };
  L.endStory = function (S, p, full) {
    const l = S.life, st = l.story;
    if (!st || st.teller !== p.id) return;
    l.story = null;
    if (!full) return;
    const Sm = Sim();
    const heard = Object.keys(st.heard).filter((id) => st.heard[id] >= 15).map((id) => person(S, +id)).filter((q) => q && q.alive);
    if (!heard.length) return;
    if (st.sermon) {
      // a pregação (Etapa 11): a fé de quem ouve sobe, o cético vê um sinal, e Deus ganha Poder
      Sm.addMem(S, p, 'contouHistoria');
      for (const q of heard) q.rel[p.id] = (q.rel[p.id] || 0) + 1;
      if (S.povos && S.povos.mixed && G.Povos) G.Povos.onGather(S, heard.concat([p]), C.CONV_SERMAO);
      G.Deus.onSermon(S, p, heard);
      S.events.push({ k: 'story', on: false });
      return;
    }
    if (st.music) {
      // a flauta não ensina a descoberta, mas faz bem a quem ouve e aproxima de quem toca
      Sm.addMem(S, p, 'tocouFlauta');
      for (const q of heard) { Sm.addMem(S, q, 'ouviuFlauta'); q.rel[p.id] = (q.rel[p.id] || 0) + 1; }
      S.stats.flutes = (S.stats.flutes || 0) + 1;
      if (S.stats.flutes === 1) Sm.chron(S, 'Pela primeira vez, ' + p.name + ' tocou flauta ao pé do fogo, e ' + Sm.listNames(heard) + (heard.length > 1 ? ' ficaram quietinhos ouvindo.' : ' ficou quietinh' + oa(heard[0]) + ' ouvindo.'));
      S.events.push({ k: 'story', on: false });
      return;
    }
    Sm.addMem(S, p, 'contouHistoria');
    for (const q of heard) { Sm.addMem(S, q, 'ouviuHistoria'); q.rel[p.id] = (q.rel[p.id] || 0) + 1; }
    if (st.conto && G.Memoria) G.Memoria.onStory(S, p, st, heard);   // Etapa 13: o conto passa a quem ouviu
    if (S.povos && S.povos.mixed && G.Povos) G.Povos.onGather(S, heard.concat([p]), C.CONV_HISTORIA);   // Etapa 12
    // histórias espalham o saber: a próxima descoberta anda um pouco
    const open = G.Tech.open(S);
    const esc = G.Deus && G.Deus.saber(S, 'escrita') ? C.ESCRITA_STORY : 1;   // com a escrita (Etapa 11), a história ensina o dobro
    if (open && heard.length) G.Tech.addPractice(S, open, C.STORY_PRACTICE * heard.length * L.fireDef(S, st.fire).story * esc, null);
    S.stats.stories++;
    if (S.stats.stories === 1) Sm.chron(S, 'Pela primeira vez, ' + p.name + ' contou uma história ao pé do fogo' + (heard.length ? ', e ' + Sm.listNames(heard) + (heard.length > 1 ? ' ouviram.' : ' ouviu.') : '.'));
    S.events.push({ k: 'story', on: false });
  };

  // ---------- festas ----------
  const PARTY_TXT = {
    nascimento: (S, x) => { const b = person(S, x.pid); return b ? 'Nasceu ' + b.name + '.' : 'Nasceu uma criança.'; },
    primavera: () => 'O inverno acabou.',
    fartura: () => 'É tempo de fartura.',
    piracema: () => 'A piracema chegou.',
    descoberta: (S, x) => (G.Tech.DISC[x.id] && G.Tech.DISC[x.id].inv ? 'Nova invenção: ' : 'Nova descoberta: ') + (artOf(x.id) || 'algo novo') + '.',
    acolhida: (S, x) => 'Chegou gente nova: ' + x.names + '.',
    fogo: () => 'Acenderam a primeira fogueira.',
    era: () => 'O acampamento virou aldeia.',
    onca: (S, x) => 'A onça foi vencida' + (x.name ? ' por ' + x.name : '') + '.',
    uniao: () => 'Dois povos viraram um só.',   // Etapa 12
    colheita: (S, x) => 'A primeira colheita da roça' + (x.k && C.ROCA[x.k] ? ', de ' + C.ROCA[x.k].name.toLowerCase() : '') + '.',   // Etapa 10
  };
  L.partyText = (S, pt) => (PARTY_TXT[pt.why] ? PARTY_TXT[pt.why](S, pt) : '');
  // marca uma festa para a tardinha (hoje, se ainda dá; senão amanhã)
  L.party = function (S, why, extra) {
    const l = S.life;
    if (!l || l.party || S.over) return false;
    if (S.t - l.lastParty < C.PARTY_GAP_DAYS * DAY()) return false;
    if (S.stats.lastDeathAt !== undefined && S.t - S.stats.lastDeathAt < 3 * DAY()) return false;   // de luto não tem festa
    const d0 = Math.floor(S.t / DAY()) * DAY();
    let at = d0 + 19 * 60;
    if (S.t > d0 + 17 * 60) at += DAY();
    l.party = Object.assign({ why, at, until: at + C.PARTY_H * 60, on: false, fire: 0, joined: [], tries: 0 }, extra || {});
    return true;
  };
  L.joinParty = function (S, p) {
    const pt = S.life.party;
    if (!pt) return;
    if (pt.joined.indexOf(p.id) < 0) pt.joined.push(p.id);
    if (pt.drum && !pt.drummer && age(S, p) >= 12) { pt.drummer = p.id; pt.drummedBy = pt.drummedBy || p.id; }
  };
  // quem batia o tambor saiu da roda: passa para outro adulto que ainda dança
  L.leaveParty = function (S, p) {
    const pt = S.life && S.life.party;
    if (!pt || pt.drummer !== p.id) return;
    pt.drummer = 0;
    const next = pt.joined.map((id) => person(S, id)).find((q) => q && q !== p && q.alive && age(S, q) >= 12 && q.act && q.act.type === 'festa');
    if (next) { pt.drummer = next.id; pt.drummedBy = pt.drummedBy || next.id; }
  };
  function startParty(S) {
    const l = S.life, pt = l.party, Sm = Sim();
    const f = L.campFire(S, true);
    const bad = !f || (G.Narr && (G.Narr.beastsOut(S) || G.Narr.is(S, 'nevasca') || G.Narr.is(S, 'tempestade'))) || S.precip === 'chuva';
    if (bad) {
      // fica para amanhã (uma vez); depois, deixa para outra ocasião
      if (pt.tries++ < 1) { pt.at += DAY(); pt.until += DAY(); } else l.party = null;
      return;
    }
    L.lightFire(S, f, 2);   // festa é em volta do fogo: se estava apagado, acendem
    pt.on = true; pt.fire = f.id;
    pt.drum = !!(G.Inv && G.Inv.drum(S)); pt.drummer = 0;   // com o tambor (Etapa 8), um adulto bate e os outros dançam
    Sm.toast(S, 'Festa no acampamento hoje! ' + L.partyText(S, pt), 'good');
    // a música acorda quem deitou cedo e ainda tem pique; os outros pensam se vão
    for (const p of S.people) {
      if (!p.alive || p.carriedBy) continue;
      p.nextEval = Math.min(p.nextEval || 0, S.t);
      if (!p.sleeping || p.labor || p.needs.energia < 40 || !fine(p)) continue;
      G.AI.abort(S, p);
    }
    S.events.push({ k: 'festa', on: true });
  }
  function endParty(S) {
    const l = S.life, pt = l.party, Sm = Sim(), F = Fam();
    l.party = null; l.lastParty = S.t;
    S.events.push({ k: 'festa', on: false });
    const ps = pt.joined.map((id) => person(S, id)).filter((q) => q && q.alive);
    if (ps.length < 2) { if (!S.safe) Sm.toast(S, 'A festa não pegou: estavam todos cansados.', ''); return; }
    S.stats.parties++;
    if (S.stats.parties === 1) Sm.chron(S, 'A primeira festa do povo. ' + L.partyText(S, pt) + ' ' + Sm.listNames(ps) + ' dançaram em volta do fogo até tarde.');
    // comida da festa: uma porção para cada um, se o estoque aguenta (peixe e carne assados primeiro)
    let fed = 0;
    if (S.ctx.foodDays > C.PARTY_FOOD_DAYS) {
      for (const q of ps) {
        const k = ['peixe', 'carne', 'frutas', 'abobora', 'milho', 'feijao', 'mandioca', 'ovos', 'defumado', 'seca'].find((x) => S.stock[x] > 0);   // Etapa 10: a roça também vai à festa
        if (!k) break;
        S.stock[k]--; q.needs.fome = Math.min(100, q.needs.fome + G.Tech.foodValue(k)); fed++;
      }
    }
    for (const q of ps) Sm.addMem(S, q, pt.drum ? 'festaTambor' : 'festa');
    if (pt.drum) {
      S.stats.drumParties = (S.stats.drumParties || 0) + 1;
      const dr = person(S, pt.drummedBy || pt.drummer);
      if (S.stats.drumParties === 1) Sm.chron(S, 'A primeira festa com tambor: ' + (dr ? dr.name + ' bateu o couro' : 'o tambor bateu') + ' a noite toda, e ninguém ficou parado.');
    }
    // quem dançou junto fica mais próximo (daí nascem pares); em volta da fogueira do centro, mais ainda; com tambor, mais ainda
    const pm = L.fireDef(S, pt.fire).party * (pt.drum ? C.TAMBOR_PARTY : 1);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      a.rel[b.id] = (a.rel[b.id] || 0) + pm; b.rel[a.id] = (b.rel[a.id] || 0) + pm;
      if (F.isPartner(a, b)) F.addAfeto(S, a, b, 3 * pm);
    }
    if (S.povos && S.povos.mixed && G.Povos) G.Povos.onParty(S, ps, C.CONV_FESTA * pm);   // Etapa 12: a festa aproxima os povos
    // 0.10: adultos ligados por pares podem esticar a noite juntos (só adultos; desliga no menu)
    if (F.afterParty) F.afterParty(S, ps);
    // quem tem mais fé agradece pela noite
    const v = ps.filter((q) => age(S, q) >= 7).sort((a, b) => b.fe - a.fe)[0];
    if (v) God().thank(S, v, pick(S, ['Obrigad' + oa(v) + ', céu, por esta noite.', 'Obrigad' + oa(v) + ' por tudo que a gente tem.']), C.THANKS.festa, true);
    if (fed && !S.stats.partyFed) { S.stats.partyFed = true; Sm.toast(S, 'Comeram ' + fed + (fed === 1 ? ' porção' : ' porções') + ' na festa. Festa boa é festa com estoque cheio.', ''); }
  }

  // ---------- agradecimentos e luto ----------
  L.onBirth = function (S, baby, mom, dad) {
    const v = mom && mom.alive ? mom : dad && dad.alive ? dad : null;
    if (v && !S.safe) God().thank(S, v, 'Obrigad' + oa(v) + ', céu, ' + forThe(baby) + '.', C.THANKS.nascimento, true);
    else if (v) God().thank(S, v, '', C.THANKS.nascimento, false);
    L.party(S, 'nascimento', { pid: baby.id });
  };
  L.onDeath = function (S, dead) {
    const l = S.life;
    if (l && l.party && !l.party.on) { l.party = null; if (!S.safe) Sim().toast(S, 'A festa ficou para outro dia.', ''); }
    // quem era mais próximo reza por quem se foi
    const F = Fam();
    const kin = S.people.filter((q) => q.alive && !q.carriedBy && age(S, q) >= 7 && F.relation(S, q, dead))
      .sort((a, b) => (F.isPartner(b, dead) ? 1 : 0) - (F.isPartner(a, dead) ? 1 : 0) || b.fe - a.fe)[0];
    if (!kin) return;
    const txt = 'Deus, recebe ' + the(dead) + ' aí em cima.';
    God().thank(S, kin, S.safe ? '' : txt, C.THANKS.luto, !S.safe, 'luto');
  };
  L.onSpring = function (S) {
    const al = alive(S).filter((p) => !p.carriedBy && age(S, p) >= 7);
    if (!al.length) return;
    const v = al.slice().sort((a, b) => a.born - b.born)[0];
    God().thank(S, v, S.safe ? '' : 'Obrigad' + oa(v) + ' por mais um inverno vencido.', C.THANKS.primavera, !S.safe);
    L.party(S, 'primavera');
  };
  L.onGood = function (S, k) {
    const al = alive(S).filter((p) => !p.carriedBy && age(S, p) >= 7 && !p.sleeping);
    const v = al.sort((a, b) => b.fe - a.fe)[0];
    if (v && (k === 'fartura' || k === 'piracema' || k === 'mel')) {
      const txt = { fartura: 'Obrigad' + oa(v) + ' pela fartura!', piracema: 'Obrigad' + oa(v) + ' pelos peixes, céu!', mel: 'Obrigad' + oa(v) + ' pelo mel!' }[k];
      God().thank(S, v, S.safe ? '' : txt, C.THANKS.fartura, !S.safe);
    }
    if (k === 'fartura' || k === 'piracema') L.party(S, k);
  };
  L.onDiscover = function (S, id, by, how) {
    if (by && by.alive && how !== 'revelacao' && how !== 'povo' && by.fe >= 45 && !S.safe) God().thank(S, by, 'Obrigad' + oa(by) + ' pela ideia, céu!', C.THANKS.descoberta, true);
    L.party(S, 'descoberta', { id });
  };
  L.onWelcome = function (S, made) { L.party(S, 'acolhida', { names: Sim().listNames(made) }); };
  L.onFirstFire = function (S) { L.party(S, 'fogo'); };
  L.onEra = function (S) { const l = S.life; if (l) { l.lastParty = -1e9; l.party = null; } L.party(S, 'era'); };
  L.onBond = function (S, a, b) { Sim().addMem(S, a, 'novoPar'); Sim().addMem(S, b, 'novoPar'); };

  // ---------- pequenos acontecimentos ----------
  // cada um: quando cabe (ok), a hora (h) e o que faz (run)
  const someone = (S, test) => { const ps = alive(S).filter((p) => !p.carriedBy && !p.sleeping && age(S, p) >= 7 && (!test || test(p))); return ps.length ? pick(S, ps) : null; };
  const awake = (S) => alive(S).filter((p) => !p.sleeping && !p.inTent);
  const SMALL = {
    ninho: { w: 1, ok: (S) => S.ck.season <= 1, h: [8, 16], run(S) {
      const p = someone(S); if (!p) return null;
      S.stock.frutas += C.SMALL_FOOD; Sim().float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + C.SMALL_FOOD + ' comida');
      Sim().say(S, p, 'Olha só: ovos!', true);
      return p.name + ' achou um ninho com ovos na mata: +' + C.SMALL_FOOD + ' de comida.';
    } },
    cogumelos: { w: 1, ok: (S) => S.ck.season === 2, h: [8, 15], run(S) {
      S.stock.frutas += C.SMALL_FOOD + 1; Sim().float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + (C.SMALL_FOOD + 1) + ' comida');
      return 'Nasceram cogumelos perto do acampamento: +' + (C.SMALL_FOOD + 1) + ' de comida.';
    } },
    estrela: { w: 1.2, ok: (S) => S.ck.season !== 3 || S.rng.next() < 0.5, h: [20, 22.5], run(S) {
      const seen = awake(S);
      if (!seen.length) return null;
      for (const p of seen) { Sim().addMem(S, p, 'viuEstrela'); God().faith(S, p, 2); }
      S.events.push({ k: 'star' });
      const v = pick(S, seen);
      Sim().say(S, v, pick(S, ['Uma estrela caiu! Faz um pedido!', 'Olha! Uma estrela cadente!']), true);
      return 'Uma estrela cadente riscou o céu. ' + (seen.length > 1 ? 'Quem viu fez um pedido.' : v.name + ' fez um pedido.');
    } },
    arcoiris: { w: 1.2, ok: (S) => S.ck.season !== 3 && Sim().weatherOf(S, S.ck.day).kind === 'chuva', h: [9, 17], run(S) {
      if (S.precip) return null;
      S.life.rainbowUntil = S.t + 150;
      for (const p of awake(S)) { Sim().addMem(S, p, 'arcoIris'); God().faith(S, p, 1); }
      S.events.push({ k: 'rainbow' });
      return 'Um arco-íris abriu no céu depois da chuva.';
    } },
    araras: { w: 1, ok: (S) => S.ck.season <= 1, h: [7, 11], run(S) {
      for (const p of awake(S)) Sim().addMem(S, p, 'passaros');
      S.events.push({ k: 'birds' });
      return 'Um bando de araras passou gritando por cima do acampamento.';
    } },
    galhos: { w: 1, ok: (S) => S.ck.season >= 2, h: [7, 16], run(S) {
      S.stock.madeira += C.SMALL_WOOD; Sim().float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + C.SMALL_WOOD + ' madeira');
      return 'O vento derrubou galhos secos perto do acampamento: +' + C.SMALL_WOOD + ' de madeira.';
    } },
    pe: { w: 0.7, h: [9, 16], run(S) {
      const p = someone(S, (q) => age(S, q) >= 12 && !q.preg && q.needs.saude > 60 && q.act && G.AI.WORK.indexOf(q.act.type) >= 0);
      if (!p) return null;
      p.hurt = { until: S.t + DAY(), walk: C.PE_WALK };
      p.needs.saude -= 6;
      Sim().addMem(S, p, 'peTorcido'); Sim().say(S, p, 'Ai! Meu pé!', true);
      return p.name + ' torceu o pé. Vai andar devagar por um dia.';
    } },
    formigas: { w: 0.8, ok: (S) => S.ck.season <= 1 && S.stock.frutas >= 8, h: [10, 17], run(S) {
      const n = Math.min(S.stock.frutas, 3 + S.rng.int(0, 2));
      S.stock.frutas -= n; Sim().float(S, S.camp.x + 1, S.camp.y + 0.6, '−' + n + ' frutas');
      return 'Formigas acharam o estoque: −' + n + ' frutas.';
    } },
    vagalumes: { w: 1, ok: (S) => S.ck.season === 1, h: [20, 22], run(S) {
      S.life.firefliesUntil = S.t + 180;
      const kids = awake(S).filter((p) => age(S, p) >= 3 && age(S, p) < 12);
      for (const k of kids) Sim().addMem(S, k, 'brincou');
      return 'Vaga-lumes piscaram na beira da água.' + (kids.length ? ' As crianças correram atrás.' : '');
    } },
    neve: { w: 3, ok: (S) => S.ck.season === 3 && S.precip === 'neve' && !S.life.counts['neve' + S.ck.year], h: [8, 17], run(S) {
      S.life.counts['neve' + S.ck.year] = 1;
      const kids = awake(S).filter((p) => age(S, p) >= 3 && age(S, p) < 12);
      for (const k of kids) Sim().addMem(S, k, 'brincou');
      return 'Caiu a primeira neve do ano.' + (kids.length ? ' As crianças fizeram bonecos de neve.' : '');
    } },
    sonho: { w: 0.8, h: [6, 8], run(S) {
      const p = someone(S, (q) => age(S, q) >= 12);
      if (!p) return null;
      Sim().addMem(S, p, 'sonhoBom'); God().faith(S, p, 5);
      Sim().say(S, p, 'Sonhei com uma luz… e ela sabia o meu nome.', true, 'god');
      return p.name + ' sonhou com uma luz no céu e acordou sorrindo.';
    } },
    cantoria: { w: 1, ok: (S) => alive(S).length >= 3 && S.ctx.fireLit, h: [19, 21], run(S) {
      const f = L.campFire(S); if (!f) return null;
      const near = awake(S).filter((p) => Math.hypot(p.x - f.x, p.y - f.y) < 8 && age(S, p) >= 3);
      if (near.length < 2) return null;
      for (const p of near) Sim().addMem(S, p, 'cantou');
      const v = pick(S, near);
      Sim().say(S, v, pick(S, ['Lá lá lá, o rio vai pro mar…', 'Ô fogo que aquece, ô noite que cai…']), true, 'festa');
      S.events.push({ k: 'song', x: f.x, y: f.y });
      return v.name + ' começou a cantar perto do fogo, e os outros acompanharam.';
    } },
  };
  L.SMALL = SMALL;
  // uma vez por dia: talvez marque um pequeno acontecimento para uma hora do dia
  function planSmall(S) {
    const l = S.life;
    l.small = null;
    if (S.ck.day < 2 || S.rng.next() >= C.SMALL_DAILY) return;
    const opts = Object.keys(SMALL).filter((k) => !SMALL[k].ok || SMALL[k].ok(S));
    let sum = 0;
    for (const k of opts) sum += SMALL[k].w;
    let r = S.rng.next() * sum, k = opts[0];
    for (const x of opts) { r -= SMALL[x].w; if (r <= 0) { k = x; break; } }
    if (!k) return;
    const [h0, h1] = SMALL[k].h, d0 = Math.floor(S.t / DAY()) * DAY();
    l.small = { k, at: d0 + Math.round((h0 + S.rng.next() * (h1 - h0)) * 60) };
  }
  L.fireSmall = function (S, k) {
    const txt = SMALL[k].run(S);
    if (!txt) return false;
    S.life.counts[k] = (S.life.counts[k] || 0) + 1;
    S.stats.small = (S.stats.small || 0) + 1;
    Sim().toast(S, txt, '');
    return true;
  };

  // ---------- lua cheia ----------
  L.moonDay = (S, day) => (day % C.MOON_DAYS) === C.MOON_DAY;
  L.moonUp = function (S) {
    const d = S.ck.day, h = S.ck.hour;
    return (L.moonDay(S, d) && h >= 18) || (d > 0 && L.moonDay(S, d - 1) && h < 5);
  };

  // ---------- ganchos ----------
  L.hourly = function (S) {
    const l = S.life;
    if (!l) return;
    const h = Math.floor(S.ck.hour);
    // festa: começa e acaba
    if (l.party) {
      if (S.safe && !l.party.on) l.party = null;   // com o jogo fechado ninguém dança
      else if (!l.party.on && S.t >= l.party.at) startParty(S);
      else if (l.party.on && S.t >= l.party.until) endParty(S);
    }
    if (S.safe) return;
    if (l.small && S.t >= l.small.at) { const k = l.small.k; l.small = null; L.fireSmall(S, k); }
    if (h === 19 && L.moonDay(S, S.ck.day) && !S.precip) {
      for (const p of awake(S)) Sim().addMem(S, p, 'luaCheia');
      Sim().toast(S, 'Lua cheia. Hoje ninguém quer dormir cedo.', '');
      S.events.push({ k: 'moon' });
    }
  };
  L.daily = function (S) {
    if (!S.life) return;
    planSmall(S);
    // pé torcido sara
    for (const p of S.people) if (p.hurt && p.hurt.until <= S.t) p.hurt = null;
  };
  // para os testes
  L.TOPICS = TOPICS; L.storyLines = storyLines; L.planSmall = planSmall;
})(globalThis.G = globalThis.G || {});
