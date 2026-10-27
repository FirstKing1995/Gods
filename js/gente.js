/* Gods · Gente viva (Etapa 15). Sem DOM.
   Cada um tem gostos (a comida, o trabalho e a estação de que gosta, e o que não suporta), um jeito que aprende com o
   resultado (o trabalho que rende vira hábito; o que dá errado ou machuca, a pessoa evita), pensamentos que dá para
   ler (com o porquê), conversas de verdade (o que viu, a fofoca, o combinado de amanhã, o gosto em comum), tentativas
   antes de cada descoberta, e o saber nas pessoas: o domínio de uma técnica se aprende perto de quem sabe e se perde
   com quem morre sem ensinar. Tudo nasce na primeira pergunta: o save antigo ganha gostos e jeito ao abrir. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const Ge = G.Gente = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Te = () => G.Tech;
  const DAY = () => C.DAY_MIN;
  const ela = (p) => p.sex === 'F';
  const oa = (p) => (ela(p) ? 'a' : 'o');
  const age = (S, p) => Fam().age(S, p);
  const person = (S, id) => Fam().person(S, id);
  const pick = (S, arr) => arr[Math.min(arr.length - 1, Math.floor(S.rng.next() * arr.length))];
  const hpick = (u, arr) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const the = (p) => (ela(p) ? 'a ' : 'o ') + p.name;
  const ofThe = (p) => (ela(p) ? 'da ' : 'do ') + p.name;
  const inThe = (p) => (ela(p) ? 'na ' : 'no ') + p.name;
  const has = (p, t) => p.traits && p.traits.indexOf(t) >= 0;
  const mem = (S, p, k) => !!p.mem && p.mem.some((m) => m.k === k && m.until > S.t);

  // ---------- estado ----------
  Ge.init = function (S) {
    const g = S.gente || (S.gente = {});
    g.med = g.med || {};      // rendimento médio por hora de cada trabalho (média móvel da aldeia)
    g.tent = g.tent || {};    // tentativas por descoberta: quantas já houve
    g.quem = g.quem || {};    // e quem tentou
    g.mestre = g.mestre || {};   // a primeira vez que alguém aprendeu cada técnica com outro
    const st = S.stats;
    for (const k of ['tentativas', 'conta', 'fofoca', 'combina', 'gostoPapo', 'desabafo', 'ensinoTec', 'aprendeuTec', 'perdeuTec', 'combinaFeito']) st[k] = st[k] || 0;
    // save de antes da 0.15: quem já usava uma técnica conhecida tem o jeito dela (não perde rendimento ao atualizar)
    if (!g.dom0) {
      g.dom0 = 1;
      for (const id of Ge.TECNICAS) {
        if (!(S.tech && S.tech.known[id])) continue;
        for (const p of S.people) if (p.alive && age(S, p) >= 12) (p.sabe || (p.sabe = {}))[id] = Math.max((p.sabe && p.sabe[id]) || 0, C.DOM_VELHO);
      }
    }
  };

  // ---------- gostos ----------
  // o nome de cada comida e de cada trabalho no texto
  Ge.COMIDA = { peixe: 'peixe', carne: 'carne', frutas: 'fruta', milho: 'milho', feijao: 'feijão', abobora: 'abóbora', mandioca: 'mandioca', ovos: 'ovo', leite: 'leite' };
  const QUERIA = { peixe: 'um peixe assado', carne: 'carne no fogo', frutas: 'uma fruta doce', milho: 'milho cozido', feijao: 'um feijão quente', abobora: 'abóbora cozida', mandioca: 'mandioca', ovos: 'ovo cozido', leite: 'leite' };
  Ge.TRAB = { pesca: 'pescar', madeira: 'cortar lenha', frutas: 'colher fruta', caca: 'caçar', agua: 'buscar água', pedra: 'quebrar pedra', construir: 'construir', oficio: 'o ofício', roca: 'mexer na roça', criacao: 'cuidar dos bichos', argila: 'cavar barro', mina: 'trabalhar na mina' };
  const COMIDAS = ['peixe', 'carne', 'frutas', 'peixe', 'carne', 'frutas', 'milho', 'feijao', 'abobora', 'mandioca'];
  const TRABS = ['pesca', 'madeira', 'frutas', 'caca', 'agua', 'pedra', 'construir', 'oficio', 'roca', 'criacao'];
  const TRAB_SET = new Set(TRABS.concat(['argila', 'mina']));
  const POVO_GOSTO = { elfo: { comida: 'frutas', trabalho: 'frutas' }, anao: { comida: 'carne', trabalho: 'oficio' }, fera: { comida: 'carne', trabalho: 'caca' } };
  Ge.EST = ['a primavera', 'o verão', 'o outono', 'o inverno'];
  // um sorteio fixo do mundo para cada pessoa (não gasta o sorteio da simulação)
  const hu = (S, p, k) => G.hash2(p.id * 31 + k * 101, 977 + k * 7, (S.seed >>> 0) ^ 0x5bd1e995);
  function nasce(S, p) {
    const pais = [person(S, p.mother), person(S, p.father)].filter((q) => q && q.gosto);
    const pv = POVO_GOSTO[p.povo];
    // cada gosto: às vezes puxa a um dos pais; às vezes, ao povo; senão, o próprio
    const de = (k, prop, proprio) => {
      if (pais.length && hu(S, p, k) < C.GOSTO_HERDA) return pais[Math.floor(hu(S, p, k + 1) * pais.length) % pais.length].gosto[prop];
      if (pv && pv[prop] && hu(S, p, k + 2) < 0.4) return pv[prop];
      return proprio;
    };
    const g = {};
    g.comida = de(1, 'comida', hpick(hu(S, p, 4), COMIDAS));
    g.enjoa = hpick(hu(S, p, 5), COMIDAS.filter((k) => k !== g.comida));
    g.trabalho = de(6, 'trabalho', hpick(hu(S, p, 9), TRABS));
    g.detesta = hpick(hu(S, p, 10), TRABS.filter((k) => k !== g.trabalho));
    g.estacao = de(11, 'estacao', Math.floor(hu(S, p, 14) * 4) % 4);
    return g;
  }
  Ge.gosto = (S, p) => p.gosto || (p.gosto = nasce(S, p));

  // ---------- o jeito: a IA que aprende ----------
  const jeitoIni = (g, wk) => (g.trabalho === wk ? C.JEITO_GOSTO : g.detesta === wk ? -C.JEITO_GOSTO : 0);
  Ge.jeito = function (S, p) {
    if (p.jeito) return p.jeito;
    const g = Ge.gosto(S, p), j = {};
    // o exemplo de casa: metade do jeito dos pais
    const pais = [person(S, p.mother), person(S, p.father)].filter((q) => q && q.jeito);
    for (const wk of TRAB_SET) {
      let v = jeitoIni(g, wk);
      if (pais.length) v += pais.reduce((a, q) => a + (q.jeito[wk] || 0), 0) / pais.length * C.JEITO_EXEMPLO;
      if (Math.abs(v) >= 0.01) j[wk] = Math.round(U.clamp(v, -1, 1) * 100) / 100;
    }
    p.jeito = j;
    return j;
  };
  const mexe = (S, p, wk, d) => { const j = Ge.jeito(S, p); j[wk] = Math.round(U.clamp((j[wk] || 0) + d, -1, 1) * 100) / 100; };
  // quanto a vontade de fazer um trabalho muda por quem a pessoa é: o gosto, o jeito e o combinado de ontem
  Ge.workMult = function (S, p, wk) {
    const g = Ge.gosto(S, p);
    let m = g.trabalho === wk ? C.GOSTO_TRAB : g.detesta === wk ? C.DETESTA_TRAB : 1;
    m *= 1 + C.JEITO_W * (Ge.jeito(S, p)[wk] || 0);
    const cb = p.combina;
    if (cb && cb.wk === wk && cb.de <= S.t && cb.ate > S.t) m *= C.COMBINA_W;
    return m;
  };
  // fazer o que gosta rende um pouco mais
  Ge.speedMult = (S, p, wk) => (p.gosto && p.gosto.trabalho === wk ? C.GOSTO_RENDE : 1);
  // o resultado: rendeu acima da média da aldeia, o jeito sobe; abaixo, desce
  Ge.onYield = function (S, p, wk, n, horas) {
    if (!S.gente || !TRAB_SET.has(wk) || !(horas > 0.1) || !(n > 0)) return;
    const r = n / horas, md = S.gente.med, m = md[wk];
    md[wk] = Math.round((m ? m * 0.9 + r * 0.1 : r) * 1000) / 1000;
    if (!m) return;
    mexe(S, p, wk, r >= m ? C.JEITO_SOBE : -C.JEITO_DESCE);
  };
  Ge.onFail = (S, p, wk) => { if (S.gente && TRAB_SET.has(wk)) mexe(S, p, wk, -C.JEITO_FALHA); };
  // mordido ou atacado no trabalho: aprende a evitar
  Ge.onHurt = function (S, p) {
    const a = p.act;
    if (!S.gente || !a || !TRAB_SET.has(a.type)) return;
    mexe(S, p, a.type, -C.JEITO_MORDIDA);
  };

  // ---------- comer o que gosta ----------
  // a comida preferida, se há no estoque e dá para comer agora (com fogo, o que precisa de fogo); a conservada fica
  // para o inverno, e com o estoque curto não se escolhe
  Ge.pratoFav = function (S, p, lit) {
    if (!p.gosto || S.ctx.foodDays < C.GOSTO_COMIDA_DIAS) return null;
    const k = p.gosto.comida, st = S.stock;
    if (!(st[k] > 0)) return null;
    if ((k === 'peixe' || k === 'carne' || k === 'feijao' || k === 'mandioca' || k === 'ovos') && !lit) return null;
    return k;
  };
  Ge.comeu = function (S, p, k) {
    if (!k || !p.gosto) return;
    if (k === p.gosto.comida) Sim().addMem(S, p, 'comeuOQueGosta');
    else if (k === p.gosto.enjoa) Sim().addMem(S, p, 'comeuOQueNaoGosta');
  };

  // ---------- o saber nas pessoas ----------
  // as técnicas que rendem mais, e o trabalho em que cada uma se aprende vendo
  Ge.TECNICAS = ['machado', 'rede', 'anzol', 'arco', 'cestos'];
  Ge.TEC_TRAB = { machado: ['madeira'], rede: ['pesca'], anzol: ['pesca'], arco: ['caca'], cestos: ['frutas', 'agua', 'argila'] };
  const TEC_NOME = { machado: 'o machado', rede: 'a rede de pesca', anzol: 'o anzol', arco: 'o arco', cestos: 'os cestos' };
  const DE_TEC = { machado: 'do machado', rede: 'da rede de pesca', anzol: 'do anzol', arco: 'do arco', cestos: 'dos cestos' };
  Ge.TEC_NOME = TEC_NOME;
  Ge.DE_TEC = DE_TEC;
  Ge.dom = (S, p, id) => (p && p.sabe && p.sabe[id]) || 0;
  // o ganho de uma técnica vale pela metade sem domínio e inteiro com ele: base + (cheio - base) × (½ + ½ domínio)
  Ge.ganho = (S, p, id, base, cheio) => base + (cheio - base) * (0.5 + 0.5 * Ge.dom(S, p, id));
  function aprende(S, p, id, d, mestre) {
    const sb = p.sabe || (p.sabe = {}), v0 = sb[id] || 0;
    if (v0 >= 1) return;
    const v = Math.min(1, v0 + d);
    sb[id] = Math.round(v * 1000) / 1000;
    if (v0 < C.DOM_MESTRE && v >= C.DOM_MESTRE) {
      S.stats.aprendeuTec++;
      const g = S.gente;
      if (mestre && !g.mestre[id]) { g.mestre[id] = S.t; Sim().chron(S, p.name + ' aprendeu o jeito ' + DE_TEC[id] + ' com ' + mestre.name + '. O saber passa de mão em mão.'); }
    }
  }
  Ge.aprende = aprende;
  // quem descobriu sabe; com a Revelação, quem sonhou; com um povo que já sabia, quem ensinou
  Ge.onDiscover = function (S, id, by) {
    if (!S.gente) return;
    if (by && Ge.TECNICAS.indexOf(id) >= 0) (by.sabe || (by.sabe = {}))[id] = 1;
    // as tentativas que vieram antes entram na história da descoberta
    const quem = S.gente.quem[id];
    if (quem && quem.length) {
      const c = S.chron.slice().reverse().find((x) => x.disc === id);
      const nomes = quem.filter((n) => !by || n !== by.name);
      if (c && nomes.length) c.text += ' Antes, ' + (nomes.length === 1 ? nomes[0] + ' tentou e não conseguiu.' : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] + ' tentaram e não conseguiram.');
    }
  };
  // quem morre leva o domínio: se era o último que sabia, a Crônica conta
  Ge.onDeath = function (S, dead) {
    if (!S.gente || !dead.sabe) return;
    for (const id of Ge.TECNICAS) {
      if ((dead.sabe[id] || 0) < C.DOM_MESTRE) continue;
      if (S.people.some((q) => q.alive && q !== dead && (q.sabe && q.sabe[id] || 0) >= C.DOM_MESTRE)) continue;
      // Etapa 16: o que está escrito na biblioteca não se perde
      if (G.Cidade && G.Cidade.escrito(S, id)) { Sim().chron(S, 'Com ' + dead.name + ' foi-se quem mais sabia o jeito ' + DE_TEC[id] + ', mas ele está escrito. Quem ler, aprende.'); continue; }
      S.stats.perdeuTec++;
      Sim().chron(S, 'Com ' + dead.name + ' foi-se o jeito ' + DE_TEC[id] + ': ninguém mais sabe tão bem. Vão ter de reaprender.');
    }
  };
  // de hora em hora: quem trabalha perto de quem sabe aprende vendo; sozinho, aprende devagar
  function aprendeVendo(S) {
    const T = Te(), ix = G.AI && G.AI.stepIdx ? G.AI.stepIdx(S) : null;
    const conhecidas = Ge.TECNICAS.filter((id) => T.known(S, id));
    if (!conhecidas.length) return;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || !p.act || age(S, p) < 7) continue;
      const wk = p.act.type;
      for (const id of conhecidas) {
        if (Ge.TEC_TRAB[id].indexOf(wk) < 0 || Ge.dom(S, p, id) >= 1) continue;
        let mestre = null;
        if (ix) {
          const gx = Math.floor(p.x / ix.cell), gy = Math.floor(p.y / ix.cell);
          for (let dx = -1; dx <= 1 && !mestre; dx++) for (let dy = -1; dy <= 1 && !mestre; dy++) {
            const l = ix.grid.get((gx + dx) * 4096 + gy + dy);
            if (l) mestre = l.find((q) => q !== p && q.act && Ge.TEC_TRAB[id].indexOf(q.act.type) >= 0 && Ge.dom(S, q, id) >= C.DOM_MESTRE && Math.hypot(q.x - p.x, q.y - p.y) <= C.DOM_PERTO_R) || null;
          }
        }
        aprende(S, p, id, mestre ? C.DOM_PERTO : C.DOM_SO, mestre);
      }
    }
  }

  // ---------- tentativas antes da descoberta ----------
  const TENTA = {
    pedra: 'lascar uma pedra batendo noutra', cestos: 'trançar folha de palmeira', lanca: 'amarrar uma ponta de pedra num pau', anzol: 'curvar um espinho para pescar',
    conserva: 'secar peixe na fumaça', ceramica: 'endurecer barro no fogo', faca: 'afiar uma lasca comprida', corda: 'torcer a fibra da embira', flauta: 'furar um bambu para soprar',
    tambor: 'esticar um couro num tronco oco', machado: 'prender uma pedra num cabo', agulha: 'furar um osso fino', arco: 'envergar uma vara com corda', rede: 'amarrar corda em malha',
    vasos: 'moldar um pote de barro', roca: 'plantar semente de fruta', algodao: 'fiar o algodão', criacao: 'prender um bicho no cercado', cerca: 'fincar uma cerca firme',
    mineracao: 'cavar fundo atrás do brilho da pedra', metalurgia: 'derreter a pedra vermelha no fogo',
  };
  const ERRO = ['e não deu certo', 'e quebrou na primeira vez', 'e desmanchou na mão', 'e quase deu certo', 'e errou, mas aprendeu alguma coisa'];
  const DUVIDA = ['Isso não vai dar certo.', 'Perda de tempo.', 'Vai desistir quando cansar.', 'Nunca vi isso funcionar.'];
  function abertas(S) {
    const T = Te(), out = [];
    const o = T.open(S); if (o) out.push(o);
    if (G.Inv) out.push(...G.Inv.openList(S));
    if (G.Campo) out.push(...G.Campo.openList(S));
    if (G.Minas) out.push(...G.Minas.openList(S));
    return out;
  }
  function tentativas(S) {
    const T = Te(), g = S.gente;
    for (const id of abertas(S)) {
      const pr = T.progress(S, id), lv = g.tent[id] || 0;
      if (!(lv < 1 && pr >= C.TENTA_A) && !(lv < 2 && pr >= C.TENTA_B)) continue;
      // quem mais praticou (a trilha guarda isso) ou alguém trabalhando agora
      const who = S.tech.who || {};
      let p = null, best = -1;
      for (const q of S.people) { if (!q.alive || q.carriedBy || age(S, q) < 10) continue; const h = who[q.id] || 0; if (h > best) { best = h; p = q; } }
      if (!p) continue;
      g.tent[id] = lv + 1;
      const quem = g.quem[id] || (g.quem[id] = []);
      if (quem.indexOf(p.name) < 0) quem.push(p.name);
      S.tech.prat[id] = (S.tech.prat[id] || 0) + T.need(id) * C.TENTA_PRAT;   // o erro também ensina
      S.stats.tentativas++;
      Sim().addMem(S, p, 'tentou');
      const txt = p.name + ' tentou ' + (TENTA[id] || 'uma coisa nova') + ' ' + pick(S, ERRO) + '.';
      Sim().toast(S, txt, '');
      // alguém que não acredita, por perto, duvida em voz alta
      const cetico = S.people.find((q) => q.alive && q !== p && !q.carriedBy && !q.sleeping && age(S, q) >= 12 && (has(q, 'Pessimista') || has(q, 'Cético')) && Math.hypot(q.x - p.x, q.y - p.y) < 12);
      if (cetico) Sim().say(S, cetico, pick(S, DUVIDA));
      Sim().say(S, p, pick(S, ['Amanhã eu tento de novo.', 'Quase!', 'Tem um jeito. Eu acho.']));
    }
  }

  // ---------- pensamentos ----------
  // o que mais pesa agora, com o porquê (sem sorteio: a ficha não fica mudando à toa)
  const CRIME_TXT = { comida: 'pegar comida a mais do estoque', folga: 'sumir na hora do trabalho', mentira: 'mentir', furto: 'roubar do estoque', surra: 'bater em alguém', ferir: 'ferir alguém de propósito', fogo: 'pôr fogo numa obra', matar: 'matar' };
  Ge.CRIME_TXT = CRIME_TXT;
  const CURIOSO = ['O que tem depois do rio?', 'Por que a lua muda de jeito?', 'Quando eu crescer, vou caçar onça.', 'Será que os peixes dormem?', 'Quero subir na árvore mais alta.', 'De onde vem a chuva?'];
  function saudade(S, p) {
    let best = null;
    for (const q of S.people) {
      if (q.alive || !q.diedAt || S.t - q.diedAt > 60 * DAY()) continue;
      const F = Fam();
      if (!(F.isPartner(p, q) || q.mother === p.id || q.father === p.id || p.mother === q.id || p.father === q.id || (p.rel && (p.rel[q.id] || 0) >= 10))) continue;
      if (!best || q.diedAt > best.diedAt) best = q;
    }
    return best;
  }
  // de quem a pessoa gosta (adulto, de 18 anos ou mais, sem parentesco próximo e sem par com ela)
  function queda(S, p) {
    if (!p.rel || age(S, p) < 18) return null;
    const F = Fam();
    let best = null, bv = C.QUEDA_REL;
    for (const id in p.rel) {
      const v = p.rel[id];
      if (v < bv) continue;
      const q = person(S, +id);
      if (!q || !q.alive || q.fora || age(S, q) < 18 || F.isPartner(p, q) || F.closeKin(S, p, q)) continue;
      bv = v; best = q;
    }
    return best;
  }
  function crimeVisto(S, p) {
    if (!S.soc || !S.soc.crimes) return null;
    for (let i = S.soc.crimes.length - 1; i >= 0; i--) {
      const c = S.soc.crimes[i];
      if (S.t - c.t > 8 * DAY()) break;
      if (c.wit && c.wit.indexOf(p.id) >= 0 && c.by !== p.id && CRIME_TXT[c.k]) { const a = person(S, c.by); if (a && a.alive) return { c, a }; }
    }
    return null;
  }
  Ge.crimeVisto = crimeVisto;
  Ge.pensa = function (S, p) {
    if (!p || !p.alive || p.fora) return null;
    const n = p.needs, a = age(S, p), F = Fam(), out = [];
    const add = (w, txt, why, k) => out.push({ w, txt, why, k });
    if (a < 3) return { txt: 'Colo, leite, sono.', why: 'É um bebê.', k: 'bebe' };
    const g = Ge.gosto(S, p);
    // o corpo
    if (n.sede < 25) add(95 - n.sede, 'Que sede…', 'Sede ' + Math.round(n.sede) + '.', 'sede');
    if (n.fome < 30) add(90 - n.fome, 'Tô com fome. Queria ' + QUERIA[g.comida] + '.', 'Fome ' + Math.round(n.fome) + '.', 'fome');
    if (n.calor < 30) add(88 - n.calor, 'Que frio. Preciso chegar perto de um fogo.', 'Frio ' + Math.round(n.calor) + '.', 'frio');
    if (n.energia < 18) add(70 - n.energia, 'Não aguento mais de cansaço.', 'Energia ' + Math.round(n.energia) + '.', 'cansaco');
    if (n.saude < 40) add(75 - n.saude, 'Dói tudo. Tô fraco' + (ela(p) ? 'a' : '') + '.', 'Saúde ' + Math.round(n.saude) + '.', 'saude');
    // o luto
    const fal = saudade(S, p);
    if (fal) add(72, 'Sinto falta ' + ofThe(fal) + '.', 'Perdeu ' + fal.name + ' há pouco.', 'luto');
    // a sociedade (Etapa 14)
    if (mem(S, p, 'injusticado')) add(78, 'Fui condenad' + oa(p) + ' sem culpa. Deus sabe.', 'Foi julgad' + oa(p) + ' por algo que não fez.', 'injusto');
    if (mem(S, p, 'ressentido')) add(60, 'Não foi justo o que fizeram comigo.', 'Guarda mágoa do julgamento.', 'magoa');
    if (mem(S, p, 'marcado')) add(55, 'Todo mundo olha a marca na minha testa.', 'Carrega a marca de Deus.', 'marca');
    if (mem(S, p, 'apanhou')) add(58, 'Ainda dói onde me bateram.', 'Apanhou há poucos dias.', 'apanhou');
    const viu = a >= 6 ? crimeVisto(S, p) : null;
    if (viu) {
      const franco = !G.Soc || !G.Soc.indole || G.Soc.indole(S, p).f > -30;
      add(52, 'Vi ' + the(viu.a) + ' ' + CRIME_TXT[viu.c.k] + '. ' + (franco ? 'Conto ou não conto?' : 'Melhor ficar quiet' + oa(p) + '.'), 'Viu com os próprios olhos.', 'viuCrime');
    }
    const desc = p.desc || 0;
    if (a >= 16 && desc >= 60) add(66, 'Tô pensando em ir embora daqui.', 'Descontente há tempo.', 'embora');
    else if (a >= 16 && desc >= 30) add(34, 'Não ando contente com a vida aqui.', 'O descontentamento cresce.', 'descontente');
    const feud = p.feud ? Object.keys(p.feud).find((id) => p.feud[id] > S.t) : null;
    if (feud) { const q = person(S, +feud); if (q && q.alive) add(32, cap1(the(q)) + ' me deve desculpas.', 'Brigaram há pouco.', 'briga'); }
    // a vida: o par, a casa, os filhos
    if (a >= 18 && !p.preg) {
      const partners = F.partners ? F.partners(S, p) : [];
      if (!partners.length && !fal) {
        const q = queda(S, p);
        add(30, q ? 'Fico pensando ' + inThe(q) + '.' : 'Queria alguém pra dividir a vida.', q ? 'Gosta muito ' + ofThe(q) + '.' : 'Não tem par.', 'par');
      }
    }
    if (mem(S, p, 'dormiuRelento') && a >= 12) add(40, 'Queria uma casa. Dormir ao relento cansa.', 'Dormiu fora de casa.', 'casa');
    if (p.preg && p.preg.known) add(36, 'Será menino ou menina?', 'Espera um filho.', 'gravida');
    if (a >= 3 && a < 12) {
      if (p.act && p.act.type === 'brincar') add(26, 'Brincar é a melhor coisa do dia!', 'Está brincando.', 'brincar');
      add(22, hpick(G.hash2(p.id, S.ck.day, 77), CURIOSO), 'Tem ' + a + ' anos e quer saber tudo.', 'curioso');
    }
    // o trabalho
    const at = p.act && TRAB_SET.has(p.act.type) ? p.act.type : null;
    if (at && at === g.detesta) add(36, 'Odeio ' + Ge.TRAB[at] + '.', 'Não gosta desse trabalho.', 'detesta');
    else if (at && at === g.trabalho) add(24, 'Gosto de ' + Ge.TRAB[at] + '.', 'É o trabalho de que mais gosta.', 'gosta');
    const cb = p.combina;
    if (cb && cb.ate > S.t) { const q = person(S, cb.com); if (q && q.alive) add(30, 'Combinei com ' + q.name + ' de ' + Ge.TRAB[cb.wk] + (cb.de > S.t ? ' amanhã cedo.' : ' hoje.'), 'Combinaram numa conversa.', 'combina'); }
    // a fé e o que viu
    const dz = S.god && S.god.name ? S.god.name : 'Deus';
    if (mem(S, p, 'oracaoAtendida')) add(46, 'Obrigad' + oa(p) + ', ' + dz + '. Ele ouviu.', 'Teve a oração atendida.', 'grato');
    else if (mem(S, p, 'oracaoIgnorada')) add(42, 'Rezei e ninguém respondeu.', 'A oração não foi atendida.', 'semResposta');
    if (mem(S, p, 'viuMilagre')) add(44, 'Eu vi o milagre com esses olhos.', 'Viu um milagre.', 'milagre');
    if (mem(S, p, 'mordido')) add(50, 'Não saio mais de noite longe do fogo.', 'Foi mordid' + oa(p) + ' por um lobo.', 'mordido');
    if (mem(S, p, 'tentou')) add(28, 'Quase deu certo. Amanhã eu tento de novo.', 'Tentou uma coisa nova e errou.', 'tentou');
    if (mem(S, p, 'aprendeuCom')) add(26, 'Aprendi uma coisa nova hoje.', 'Alguém ensinou.', 'aprendeu');
    if (mem(S, p, 'nasceuFilho')) add(48, 'Meu filho nasceu. Não cabe em mim.', 'Um filho nasceu.', 'filho');
    if (mem(S, p, 'novoPar')) add(40, 'Acho que tô apaixonad' + oa(p) + '.', 'Tem um par novo.', 'novoPar');
    // o gosto e o dia
    if (S.ck.season === g.estacao) add(10, 'Adoro ' + Ge.EST[g.estacao] + '.', 'É a estação de que mais gosta.', 'estacao');
    if (p.fe >= 85) add(12, 'Sinto que alguém olha por nós.', 'Fé ' + Math.round(p.fe) + '.', 'fe');
    if (p.mood >= 70) add(8, 'Que dia bom.', 'Humor ' + Math.round(p.mood) + '.', 'bom');
    else if (p.mood < 30) add(20, 'Que dia ruim…', 'Humor ' + Math.round(p.mood) + '.', 'ruim');
    add(1, 'Pensando na vida.', '', 'vida');
    let best = out[0];
    for (const o of out) if (o.w > best.w) best = o;
    return best;
  };

  // ---------- conversas ----------
  // o que contar: a lembrança mais forte que vale uma conversa
  const VIU = {
    viuMilagre: ['Você viu o milagre?', 'Eu vi com esses olhos.'],
    mordido: ['O lobo me pegou aquela noite.', 'Agora eu não durmo longe do fogo.'],
    atacadoBicho: ['Um bicho me atacou no mato.', 'Ainda tô tremendo.'],
    vencemos: ['Você viu a gente vencer a onça?', 'Vi! Que dia.'],
    nasceuFilho: ['Meu filho nasceu!', 'É a coisa mais bonita do mundo.'],
    viuRaio: ['O raio caiu pertinho de mim.', 'Achei que era o fim.'],
  };
  const LOUVA = ['Gente boa demais.', 'Dá pra contar em qualquer hora.', 'Trabalha que é uma beleza.', 'Tem um coração enorme.'];
  const CRITICA = ['Não confio.', 'Só pensa em si.', 'Fala demais e faz de menos.', 'Me tira do sério.'];
  const ADMIRA = ['É mesmo.', 'Concordo.', 'Também acho.'];
  const DUVIDA_F = ['Será?', 'Comigo nunca teve problema.', 'Não sei não…'];
  const ENSINO_TEC = {
    machado: ['Segura o machado mais embaixo e deixa o peso cair.', 'Assim? Nossa, entrou fundo!'],
    rede: ['Joga a rede aberta, num giro só.', 'Abriu inteirinha!'],
    anzol: ['Esconde o anzol na isca, que o peixe desconfia.', 'Pegou! Pegou!'],
    arco: ['Puxa até a orelha e solta devagar.', 'Foi longe!'],
    cestos: ['Trança apertado no fundo, que aguenta mais peso.', 'Ficou firme mesmo.'],
  };
  // uma conversa nova, se cabe; null deixa a conversa de sempre (life.js)
  Ge.dialog = function (S, a, b) {
    if (!S.gente || age(S, a) < 12 || age(S, b) < 12 || S.rng.next() >= C.GENTE_PAPO) return null;
    const opts = [];
    // ensinar uma técnica (de adulto para quem trabalha com ela e ainda não domina)
    for (const id of Ge.TECNICAS) {
      if (!Te().known(S, id)) continue;
      if (Ge.dom(S, a, id) >= C.DOM_MESTRE && Ge.dom(S, b, id) < 0.5 && age(S, a) >= 16) { opts.push(['tec', 3, id]); break; }
    }
    // contar o que viu
    const viu = crimeVisto(S, a);
    if (viu && viu.a !== b && (!G.Soc || G.Soc.indole(S, a).f > -30)) opts.push(['crime', 3, viu]);
    const lemb = Object.keys(VIU).find((k) => mem(S, a, k));
    if (lemb) opts.push(['viu', 2, lemb]);
    // fofoca: alguém que não está ali, de quem gosta muito ou não gosta
    let terceiro = null, tv = 0;
    if (a.rel) for (const id in a.rel) {
      const v = a.rel[id];
      if (Math.abs(v) < C.FOFOCA_REL || Math.abs(v) <= Math.abs(tv) || +id === b.id) continue;
      const q = person(S, +id);
      if (!q || !q.alive || q.fora || age(S, q) < 16 || Math.hypot(q.x - a.x, q.y - a.y) < 8) continue;
      terceiro = q; tv = v;
    }
    if (terceiro) opts.push(['fofoca', 1.5, terceiro]);
    // o combinado: os dois gostam do mesmo trabalho (ou têm jeito para ele)
    const ga = Ge.gosto(S, a), gb = Ge.gosto(S, b), ja = Ge.jeito(S, a), jb = Ge.jeito(S, b);
    const wk = ga.trabalho === gb.trabalho ? ga.trabalho : (ja[ga.trabalho] || 0) > 0.2 && (jb[ga.trabalho] || 0) > 0.2 ? ga.trabalho : null;
    if (wk && !a.combina && !b.combina && S.ck.hour >= 12 && wk !== 'roca' && wk !== 'criacao' && wk !== 'construir' && wk !== 'oficio') opts.push(['combina', 1.5, wk]);
    // o gosto
    opts.push(['gosto', 0.5, null]);
    // o desabafo: o que pesa (o que a pessoa pensa)
    const pz = Ge.pensa(S, a);
    if (pz && pz.w >= 30 && ['par', 'casa', 'embora', 'descontente', 'magoa', 'injusto', 'luto', 'detesta', 'semResposta'].indexOf(pz.k) >= 0) opts.push(['desabafo', 1.5, pz]);
    if (!opts.length) return null;
    let sum = 0;
    for (const o of opts) sum += o[1];
    let r = S.rng.next() * sum, ch = opts[0];
    for (const o of opts) { r -= o[1]; if (r <= 0) { ch = o; break; } }
    const fala = (pairs, kind, extra) => Object.assign({ kind, lines: pairs.filter((x) => x[1]).map(([by, text]) => ({ by, text })), at: [5, 15, 27], dur: 36 + pairs.length * 6 }, extra || {});
    const [k, , v] = ch;
    if (k === 'tec') { const t = ENSINO_TEC[v]; return fala([[0, t[0]], [1, t[1]]], 'ensinoTec', { teacher: a.id, learner: b.id, tec: v }); }
    if (k === 'crime') return fala([[0, 'Você não sabe o que eu vi.'], [1, 'O quê?'], [0, 'Vi ' + the(v.a) + ' ' + CRIME_TXT[v.c.k] + '.']], 'conta', { sobre: v.a.id, grave: (v.c.g || 1) >= 3 ? 1 : 0 });
    if (k === 'viu') return fala([[0, VIU[v][0]], [1, pick(S, ['Me conta direito.', 'Nossa…', 'E aí?'])], [0, VIU[v][1]]], 'conta', { lemb: v });
    if (k === 'fofoca') {
      const bom = tv > 0;
      return fala([[0, 'Sabe ' + the(v) + '? ' + pick(S, bom ? LOUVA : CRITICA)], [1, pick(S, (b.rel && (b.rel[v.id] || 0) * tv < 0) ? DUVIDA_F : ADMIRA)]], 'fofoca', { sobre: v.id, sinal: bom ? 1 : -1 });
    }
    if (k === 'combina') return fala([[0, 'Amanhã cedo vou ' + Ge.TRAB[v] + '. Vem junto?'], [1, pick(S, ['Vou sim!', 'Combinado.', 'Me chama quando sair.'])]], 'combina', { wk: v });
    if (k === 'gosto') {
      const same = ga.comida === gb.comida, nojo = gb.enjoa === ga.comida;
      return fala([[0, 'Você gosta de ' + Ge.COMIDA[ga.comida] + '?'], [1, same ? 'Adoro! É o que eu mais gosto.' : nojo ? 'Nem me fala. Não desce.' : 'Gosto. Mas prefiro ' + Ge.COMIDA[gb.comida] + '.']], 'gostoPapo', { igual: same ? 1 : 0 });
    }
    if (k === 'desabafo') return fala([[0, v.txt], [1, pick(S, ['Eu entendo.', 'Tô aqui, viu?', 'Vai passar.', 'Conta comigo.'])]], 'desabafo');
    return null;
  };
  // o que cada conversa nova muda
  Ge.afterChat = function (S, a, b, d) {
    if (!d || !S.gente) return;
    const st = S.stats, Sm = Sim();
    // a estima (p.rel) é a conta das conversas, sem teto: aqui só se soma ou se tira um pouco
    const rel = (x, id, v) => { x.rel[id] = Math.round(((x.rel[id] || 0) + v) * 10) / 10; };
    if (d.kind === 'ensinoTec') {
      const t = person(S, d.teacher), l = person(S, d.learner);
      if (t && l) { aprende(S, l, d.tec, C.DOM_ENSINO, t); Sm.addMem(S, l, 'aprendeuCom'); Sm.addMem(S, t, 'ensinou'); st.ensinoTec++; rel(l, t.id, 1); }
    } else if (d.kind === 'conta') {
      st.conta++;
      if (d.sobre) rel(b, d.sobre, d.grave ? -4 : -2);   // ouvir o que alguém fez muda o que se pensa dele
      else rel(b, a.id, 0.5);
    } else if (d.kind === 'fofoca') {
      st.fofoca++;
      // quem ouve puxa o que pensa na direção do que ouviu (de quem confia, mais), um pouco por conversa
      const q = person(S, d.sobre);
      if (q) {
        const alvo = U.clamp(a.rel[q.id] || 0, -C.FOFOCA_TETO, C.FOFOCA_TETO), cur = b.rel[q.id] || 0;
        const conf = (b.rel[a.id] || 0) >= 0 ? 1 : 0.3;
        if (alvo > 0 ? cur < alvo : cur > alvo) rel(b, q.id, U.clamp(C.FOFOCA_PUXA * (alvo - cur) * conf, -C.FOFOCA_MAX, C.FOFOCA_MAX));
      }
    } else if (d.kind === 'combina') {
      st.combina++;
      const amanha = Math.floor(S.t / DAY()) * DAY() + DAY();
      const cb = (com) => ({ wk: d.wk, com, de: amanha + 5 * 60, ate: amanha + 12 * 60 });
      a.combina = cb(b.id); b.combina = cb(a.id);
    } else if (d.kind === 'gostoPapo') {
      st.gostoPapo++;
      if (d.igual) { rel(a, b.id, 1); rel(b, a.id, 1); }
    } else if (d.kind === 'desabafo') {
      st.desabafo++;
      Sm.addMem(S, a, 'desabafou');
      rel(a, b.id, 1);
    }
  };

  // ---------- passo do tempo ----------
  Ge.hourly = function (S) {
    if (!S.gente) return;
    aprendeVendo(S);
    // o combinado: cada um que foi fazer marca; quando os dois foram, na mesma manhã, ganham o dia
    const h = S.ck.hour;
    for (const p of S.people) {
      const cb = p.combina;
      if (!cb) continue;
      if (cb.ate <= S.t) { delete p.combina; continue; }
      if (cb.feito || cb.de > S.t || !p.act || p.act.type !== cb.wk) continue;
      cb.fez = 1;
      const q = person(S, cb.com), qc = q && q.combina;
      if (q && q.alive && qc && qc.com === p.id && qc.fez) {
        cb.feito = qc.feito = 1;
        Sim().addMem(S, p, 'trabalhouJunto'); Sim().addMem(S, q, 'trabalhouJunto');
        p.rel[q.id] = (p.rel[q.id] || 0) + 1; q.rel[p.id] = (q.rel[p.id] || 0) + 1;
        S.stats.combinaFeito++;
      }
    }
    // o que se pensa às vezes sai em voz alta: só o que pesa, cada um na sua hora (um terço do povo por hora, em
    // rodízio), e a mesma frase uma vez só por hora (vinte pessoas dizendo a mesma coisa ao mesmo tempo soa a robô)
    if (h >= 6 && h < 22) {
      const ditos = new Set();
      for (const p of S.people) {
        if (!p.alive || p.carriedBy || p.sleeping || p.inTent || (p.id + Math.floor(h)) % 3 !== 0 || S.t - (p.sayAt || -1e9) < 60 || S.rng.next() > C.PENSA_FALA) continue;
        const pz = Ge.pensa(S, p);
        if (!pz || pz.w < 20 || pz.k === 'vida' || ditos.has(pz.txt)) continue;
        ditos.add(pz.txt);
        Sim().say(S, p, pz.txt, false, 'pensa');
      }
    }
  };
  Ge.daily = function (S) {
    if (!S.gente) return;
    tentativas(S);
    // a estação de que gosta
    for (const p of S.people) if (p.alive && p.gosto && p.gosto.estacao === S.ck.season && age(S, p) >= 3) Sim().addMem(S, p, 'estacaoQueGosta');
  };

  // ---------- jogo fechado ----------
  // no dia resumido ninguém conversa nem tenta; a técnica se aprende pela média (quem trabalha com ela chega à metade)
  Ge.resumo = function (S) {
    if (!S.gente) return;
    for (const id of Ge.TECNICAS) {
      if (!Te().known(S, id) || !S.people.some((q) => q.alive && Ge.dom(S, q, id) >= C.DOM_MESTRE)) continue;
      for (const p of S.people) if (p.alive && age(S, p) >= 12 && Ge.dom(S, p, id) < 0.5) aprende(S, p, id, C.DOM_SO * 6, null);
    }
  };
})(globalThis.G = globalThis.G || {});
