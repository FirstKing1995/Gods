/* Gods · 0.36: o começo do RPG. Você segue como Deus; quem vira herói é o povo. Cada um tem uma profissão (o trabalho em
   que é melhor), e quem luta, caça ou anda longe pode despertar uma classe: guerreiro, arqueiro, caçador ou explorador.
   A classe tem nível de força, que sobe com o que a pessoa faz, e habilidades que chegam nos níveis 5, 12 e 25. Deus
   pode abençoar alguém: desperta quem ainda não despertou e empurra o nível de quem já despertou.
   Nada aqui gasta o S.rng: o sorteio é próprio, para o mundo de sempre seguir igual onde não há herói. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const R = G.Rpg = {};
  const Sim = () => G.Sim, Fam = () => G.Family;

  R.CLASSES = {
    guerreiro: { name: 'Guerreiro', nameF: 'Guerreira', cor: '#e43b44', desc: 'Fica na frente quando o bicho vem. Acerta mais e sofre menos.', habs: ['golpe', 'couraca', 'revide'] },
    arqueiro: { name: 'Arqueiro', nameF: 'Arqueira', cor: '#63c74d', desc: 'Olho treinado e mão firme. Acerta de longe, antes de o bicho chegar.', habs: ['certeiro', 'longo', 'veloz'] },
    cacador: { name: 'Caçador', nameF: 'Caçadora', cor: '#feae34', desc: 'Lê o rastro e o vento. O bicho não o percebe, e rende mais carne.', habs: ['rastro', 'passoLeve', 'carneada'] },
    mago: { name: 'Mago', nameF: 'Maga', cor: '#b080ff', magia: true, desc: 'Nasceu com o dom. Na luta, o golpe dele é fogo e vale o dobro.', habs: ['faisca', 'escudo', 'bola'] },
    sacerdote: { name: 'Sacerdote', nameF: 'Sacerdotisa', cor: '#fff0a0', magia: true, desc: 'Nasceu com o dom e com a fé. Todo dia cura quem mais precisa.', habs: ['prece', 'escudo', 'milagre'] },
    explorador: { name: 'Explorador', nameF: 'Exploradora', cor: '#2ce8f5', desc: 'Conhece todo caminho. Anda mais depressa, carrega mais e sempre volta com alguma coisa.', habs: ['passada', 'carga', 'achador'] },
  };
  R.HABS = {
    faisca: { name: 'Faísca certeira', desc: 'O fogo acerta 10% mais.' },
    escudo: { name: 'Escudo de luz', desc: 'A mordida dói 30% menos.' },
    bola: { name: 'Bola de fogo', desc: 'O golpe atinge também os monstros que estão perto.' },
    prece: { name: 'Prece em voz alta', desc: 'Quem está perto ganha fé todo dia.' },
    milagre: { name: 'Mão que sara', desc: 'A cura também tira a febre.' },
    golpe: { name: 'Golpe firme', desc: 'Acerta 10% mais na luta.' },
    couraca: { name: 'Couro grosso', desc: 'A mordida dói 25% menos.' },
    revide: { name: 'Revide certo', desc: 'Quem morde sempre leva o troco, se ele estiver armado.' },
    certeiro: { name: 'Certeiro', desc: 'Acerta 10% mais na caça e na luta.' },
    longo: { name: 'Tiro longo', desc: 'Caça de 2 passos mais longe.' },
    veloz: { name: 'Pé ligeiro', desc: 'Anda 10% mais depressa.' },
    rastro: { name: 'Lê o rastro', desc: 'Acerta 10% mais na caça.' },
    passoLeve: { name: 'Passo leve', desc: 'O bicho arisco não foge dele.' },
    carneada: { name: 'Mão de carneador', desc: 'Cada bicho rende mais carne.' },
    passada: { name: 'Passada longa', desc: 'Anda 10% mais depressa.' },
    carga: { name: 'Costas fortes', desc: 'Carrega 15% mais por viagem.' },
    achador: { name: 'Achador', desc: 'Volta e meia acha sal, minério ou ouro pelo caminho.' },
  };
  R.NIVEL_HAB = [5, 12, 25];
  R.NIVEL_MAX = 60;
  R.BENCAO = 40;   // o Poder que uma bênção custa
  const PROF = {
    coleta: ['Coletor', 'Coletora'], pesca: ['Pescador', 'Pescadora'], madeira: ['Lenhador', 'Lenhadora'], pedra: ['Pedreiro', 'Pedreira'],
    caca: ['Caçador', 'Caçadora'], construcao: ['Construtor', 'Construtora'], oficio: ['Artesão', 'Artesã'], roca: ['Lavrador', 'Lavradora'],
    criacao: ['Criador', 'Criadora'], mina: ['Mineiro', 'Mineira'], cura: ['Curandeiro', 'Curandeira'], ervas: ['Erveiro', 'Erveira'],
  };
  // ---------- sorteio próprio ----------
  function sorte(S, p, sal) {
    let x = (Math.imul(p.id | 0, 2654435761) ^ Math.imul(Math.floor(S.t / 60), 40503) ^ Math.imul(sal | 0, 69069)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }
  // ---------- quem é quem ----------
  const adulto = (S, p) => p.alive && !p.fora && !p.carriedBy && Fam().age(S, p) >= 16;
  R.de = (p) => (p && p.rpg && p.rpg.cls ? p.rpg : null);
  R.tem = (p, h) => !!(p && p.rpg && p.rpg.habs && p.rpg.habs.indexOf(h) >= 0);
  R.nome = (p) => { const r = R.de(p); if (!r) return ''; const c = R.CLASSES[r.cls]; return p.sex === 'F' ? c.nameF : c.name; };
  R.nivel = (p) => { const r = R.de(p); return r ? r.nv : 0; };
  R.pede = (nv) => Math.round(8 * Math.pow(nv, 1.3));   // o xp de um nível ao próximo
  // a profissão: o trabalho em que a pessoa é melhor (só depois que ela já é boa em alguma coisa)
  R.profissao = function (p) {
    let top = '', v = 0;
    for (const k in p.skills) if (PROF[k] && p.skills[k] > v) { v = p.skills[k]; top = k; }
    const lv = top && G.AI ? G.AI.lvl(p, top) : 0;
    if (!top || lv < 1) return '';
    const nome = PROF[top][p.sex === 'F' ? 1 : 0];
    return lv >= 8 ? 'Mestre ' + nome.toLowerCase() : lv >= 4 ? nome : 'Aprendiz de ' + PROF[top][0].toLowerCase();
  };
  // ---------- o despertar ----------
  // a classe vem do que a pessoa faz e do povo dela; empate, do sorteio dela mesma
  function classeDe(S, p) {
    const o = (p.rpg && p.rpg.por) || {}, povo = G.Povos ? G.Povos.of(p) : 'humano';
    const peso = { guerreiro: (o.luta || 0) + (povo === 'anao' ? 8 : 0), arqueiro: (o.caca || 0) * 0.5 + (povo === 'elfo' ? 10 : 0) + (G.Tech && G.Tech.known(S, 'arco') ? 5 : 0), cacador: (o.caca || 0) + (povo === 'fera' ? 8 : 0), explorador: (o.anda || 0) };
    let best = 'explorador', bv = -1;
    for (const k in peso) { const v = peso[k] + sorte(S, p, k.length) * 3; if (v > bv) { bv = v; best = k; } }
    return best;
  }
  const herois = (S) => S.people.filter((p) => p.alive && R.de(p));
  R.herois = (S) => herois(S).sort((a, b) => b.rpg.nv - a.rpg.nv || a.id - b.id);
  const teto = (S) => Math.max(2, Math.ceil(S.people.filter((p) => p.alive).length * 0.25));   // nem todo mundo é herói
  // 0.42: um efeito animado na tela (nada na simulação; o dia resumido não tem tela)
  const fx = (S, k, x, y, o) => { if (!S.resumido && !S.safe && S.events) S.events.push(Object.assign({ k: 'fx', fx: k, x, y }, o || {})); };
  R.desperta = function (S, p, cls) {
    if (R.de(p)) return false;
    const r = p.rpg || (p.rpg = { por: {} });
    r.cls = cls || classeDe(S, p); r.nv = 1; r.xp = r.xp0 || 0; r.habs = []; delete r.xp0; r.t = S.t;
    const c = R.CLASSES[r.cls], nome = R.nome(p);
    S.stats.herois = (S.stats.herois || 0) + 1;
    fx(S, 'luz', p.x - 0.5, p.y - 0.4);
    if (S.stats.herois === 1) Sim().chron(S, p.name + ' despertou como ' + nome.toLowerCase() + ': é a primeira pessoa do povo a sentir a própria força crescer. ' + c.desc);
    else if (!S.safe) Sim().toast(S, p.name + ' despertou como ' + nome.toLowerCase() + '.', 'good');
    sobe(S, p);
    return true;
  };
  function sobe(S, p) {
    const r = p.rpg;
    while (r.nv < R.NIVEL_MAX && r.xp >= R.pede(r.nv)) {
      r.xp -= R.pede(r.nv); r.nv++;
      fx(S, 'nivel', p.x - 0.5, p.y - 0.4);
      const k = R.NIVEL_HAB.indexOf(r.nv);
      if (k >= 0) {
        const h = R.CLASSES[r.cls].habs[k];
        if (r.habs.indexOf(h) < 0) r.habs.push(h);
        if (!S.safe) Sim().toast(S, p.name + ' chegou ao nível ' + r.nv + ' e aprendeu: ' + R.HABS[h].name + '.', 'good');
      }
      if (r.nv === 25 || r.nv === 50) Sim().chron(S, p.name + ', ' + (p.sex === 'F' ? 'a ' : 'o ') + R.nome(p).toLowerCase() + ', chegou ao nível ' + r.nv + ' de força. O povo já conta histórias sobre o que ' + (p.sex === 'F' ? 'ela' : 'ele') + ' faz.');
    }
    if (r.nv >= R.NIVEL_MAX) r.xp = 0;
  }
  // a experiência: por = 'luta', 'caca' ou 'anda'. Quem ainda não despertou guarda; ao juntar bastante, desperta
  R.ganha = function (S, p, n, por) {
    if (!p || !p.alive) return;
    const r = p.rpg || (p.rpg = { por: {} });
    r.por = r.por || {};
    if (por) r.por[por] = (r.por[por] || 0) + n;
    if (G.Isekai) n *= G.Isekai.xp(p);   // 0.40: quem veio de outro mundo
    if (r.cls) { r.xp += n; sobe(S, p); return; }
    r.xp0 = (r.xp0 || 0) + n;
    if (r.xp0 >= 30 && adulto(S, p) && herois(S).length < teto(S)) R.desperta(S, p);
  };
  // ---------- os efeitos (ganchos pequenos, chamados de onde a coisa acontece) ----------
  R.acerto = (p, caca) => { const r = R.de(p); if (!r) return 0; return Math.min(0.2, r.nv * 0.006) + (R.tem(p, 'golpe') && !caca ? 0.1 : 0) + (R.tem(p, 'certeiro') ? 0.1 : 0) + (R.tem(p, 'rastro') && caca ? 0.1 : 0) + (R.tem(p, 'faisca') ? 0.1 : 0); };
  R.mordida = (p) => { const r = R.de(p); if (!r) return 1; return (1 - Math.min(0.3, r.nv * 0.008)) * (R.tem(p, 'couraca') ? 0.75 : 1) * (R.tem(p, 'escudo') ? 0.7 : 1); };
  R.passo = (p) => (R.tem(p, 'veloz') || R.tem(p, 'passada') ? 1.1 : 1);
  R.cargaMult = (p) => (R.tem(p, 'carga') ? 1.15 : 1);
  R.alcance = (p) => (R.tem(p, 'longo') ? 2 : 0);
  R.carne = (p) => (R.tem(p, 'carneada') ? 2 : 0);
  // ---------- o dia ----------
  R.daily = function (S) {
    if (S.resumido) return;
    for (const p of S.people) {
      if (!adulto(S, p)) continue;
      const r = p.rpg;
      if (r && r.cls === 'explorador') {
        R.ganha(S, p, 2, 'anda');
        if (R.tem(p, 'achador') && !S.safe && sorte(S, p, 7) < 0.04) { const k = ['sal', 'minerio', 'ouro'][Math.floor(sorte(S, p, 8) * 3)]; if (S.stock[k] !== undefined) { S.stock[k] += 1; Sim().toast(S, p.name + ' achou ' + (k === 'minerio' ? 'minério' : k) + ' pelo caminho.', 'good'); } }
      } else if (r && r.cls) { if (sorte(S, p, 5) < 0.3) R.ganha(S, p, 1); }
      else if (Fam().age(S, p) <= 40 && sorte(S, p, 3) < 0.004 * (G.Guilda ? G.Guilda.despertarMult(S) : 1)) R.ganha(S, p, 4, 'anda');   // de vez em quando, alguém sai para ver o que tem depois do morro
    }
  };
  // ---------- Deus abençoa ----------
  R.bencaoWhy = function (S, p) {
    if (!S.god) return 'sem Deus';
    if (!p || !adulto(S, p)) return 'só quem já é adulto';
    if ((p.rpg && p.rpg.bencao) > S.t - C.DAY_MIN) return 'já foi abençoado hoje';
    if (S.god.poder < R.BENCAO) return 'faltam ' + Math.ceil(R.BENCAO - S.god.poder) + ' de Poder';
    return '';
  };
  R.abencoa = function (S, p) {
    if (R.bencaoWhy(S, p)) return false;
    S.god.poder -= R.BENCAO;
    const r = p.rpg || (p.rpg = { por: {} });
    r.bencao = S.t;
    if (!r.cls) R.desperta(S, p);
    else { r.xp += R.pede(r.nv); sobe(S, p); if (!S.safe) Sim().toast(S, p.name + ' sentiu a sua bênção: nível ' + r.nv + '.', 'good'); }
    return true;
  };
})(globalThis.G = globalThis.G || {});
