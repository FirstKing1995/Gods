/* Gods · IA utilitária e ações dos cidadãos. Sem DOM.
   Cada cidadão dá nota a cada ação possível e executa a maior.
   As Vontades de Deus pesam no trabalho; as necessidades pesam mais quando apertam. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U, W = G.W, Sim = G.Sim;
  const AI = G.AI = {};
  const RUN = 0, DONE = 1, FAIL = -1;
  const DONE_QUIET = 2;   // terminou, mas sem o "bom dia" (acordou de madrugada para beber, por exemplo)

  const WORK = ['frutas', 'agua', 'madeira', 'pedra', 'pesca', 'caca', 'argila', 'construir', 'caminho', 'oficio', 'conservar', 'roca', 'criacao', 'cerca', 'mina', 'fogo'];   // mina: Etapa 12
  const VONT = { caminho: 'construir', cerca: 'construir' };   // caminho e cerca usam a Vontade de Construir (Etapas 7 e 10)
  const WORK_SET = new Set(WORK);
  const SKILL_OF = { frutas: 'coleta', agua: 'coleta', madeira: 'coleta', pedra: 'coleta', pesca: 'pesca', caca: 'caca', argila: 'coleta',
    construir: 'construcao', caminho: 'construcao', oficio: 'oficio', conservar: null, fogo: null, roca: 'plantio', criacao: 'criacao', cerca: 'construcao', mina: 'mineracao' };
  // reavaliadas a cada 20 min; alimentar o fogo não (é rápido, e largar no meio devolvia a lenha e recomeçava sem fim);
  // caçar e conservar também não (largar a caça no meio perdia a presa; a carga do moquém é curta)
  // caça, ofício e conservar não se reavaliam no meio: quem lasca segura a pedra na mão (o estoque parece vazio)
  // e largava a peça pela metade a cada reavaliação, sem nunca terminar
  // roça e criação também não (a colheita no cesto, a ração na mão: cada tarefa é curta e termina sozinha)
  const REEVAL = new Set(WORK.filter((w) => w !== 'fogo' && w !== 'caca' && w !== 'conservar' && w !== 'oficio' && w !== 'roca' && w !== 'criacao' && w !== 'mina')
    .concat(['vagar', 'brincar', 'aquecer', 'depositar', 'ouvir', 'festa']));
  const Fam = G.Family, Tech = G.Tech;
  AI.WORK = WORK;
  AI.LABEL = { frutas: 'Frutas', agua: 'Água', madeira: 'Madeira', pedra: 'Pedra', pesca: 'Pesca', caca: 'Caça', argila: 'Argila',
    construir: 'Construir', caminho: 'Caminhos', oficio: 'Ofício', conservar: 'Conservar', fogo: 'Fogo', roca: 'Roça', criacao: 'Criação', cerca: 'Cercas', mina: 'Mineração' };
  AI.SKILL_LABEL = { coleta: 'Coleta', pesca: 'Pesca', construcao: 'Construção', caca: 'Caça', oficio: 'Ofício', plantio: 'Plantio', criacao: 'Criação', mineracao: 'Mineração' };
  const RES_LABEL = { madeira: 'madeira', pedra: 'pedra', agua: 'água', frutas: 'frutas', peixe: 'peixe', carne: 'carne', couro: 'couro',
    argila: 'argila', defumado: 'defumado', seca: 'fruta seca', ferramentas: 'ferramentas', roupas: 'roupas',
    tabuas: 'tábuas', fibra: 'fibra', mantas: 'mantas', redes: 'redes',
    feijao: 'feijão', milho: 'milho', abobora: 'abóbora', mandioca: 'mandioca', ovos: 'ovos', leite: 'leite',
    carvao: 'carvão', minerio: 'minério', prata: 'prata', ouro: 'ouro', gemas: 'pedras preciosas', ferro: 'ferramentas de ferro', joias: 'joias' };
  AI.RES_LABEL = RES_LABEL;

  const LINES = {
    chegada: ['Chegamos.', 'Que lugar bonito.', 'Vamos ficar aqui.'],
    chegada2: ['Aqui tem futuro.', 'Vai dar certo.', 'É aqui.'],
    frio: ['Que frio!', 'Tô congelando…', 'Brr…'],
    sede: ['Tô morrendo de sede.', 'Preciso de água.'],
    fome: ['Que fome…', 'Minha barriga tá roncando.'],
    sono: ['Tô morto de sono.', 'Boa noite.', 'Até amanhã.'],
    acordar: ['Bom dia!', 'Dormi bem.', 'Que noite…', 'Mais um dia.'],
    madeira: ['Vou buscar lenha.', 'Mais madeira!'],
    pedra: ['Vou atrás de pedra.', 'Essa pedra serve.'],
    frutas: ['Olha, pitanga!', 'Vou colher frutas.'],
    agua: ['Vou encher as cabaças.'],
    pesca: ['Hoje tem peixe.', 'Vou pescar.'],
    peixe: ['Pesquei um!', 'Olha o tamanho desse!'],
    semPeixe: ['Nada hoje…', 'Os peixes fugiram.'],
    construir: ['Mãos à obra.', 'Vai ficar bonito.'],
    fogo: ['Vou cuidar do fogo.', 'O fogo tá baixo.'],
    chat: ['Lembra da nossa terra?', 'Você viu aquilo no céu?', 'Acho que alguém olha por nós.', 'Amanhã a gente termina.',
      'Ha ha!', 'Que dia…', 'Que bom que você tá aqui.', 'E se vier mais gente?', 'O inverno me assusta.'],
    greve: ['Chega! Não aguento mais.'],
    deus: ['Senti algo… uma presença.', 'Tem alguém aí em cima?', 'Estamos sendo vigiados?', 'Obrigado, céu.'],
    quente: ['Que calorzinho bom.'],
    casal: ['Que bom que você tá aqui.', 'Lembra quando a gente chegou?', 'Vamos dar conta.', 'Você é a minha casa.', 'Olha o céu hoje.'],
    crianca: ['Mãe, olha!', 'Pai, me ensina?', 'Quando eu crescer vou pescar.', 'Conta uma história?', 'Tô com fome!', 'Por que o céu é azul?'],
    brincar: ['Pega-pega!', 'Não me pega!', 'Achei uma pedra bonita!', 'Olha o que eu sei fazer!', 'Ha ha ha!'],
    parto: ['Tá vindo…', 'Respira…', 'Aguenta firme.'],
    lobos: ['Lobos!', 'Corre pro fogo!', 'Tem lobo aqui!'],
    caca: ['Hoje tem carne.', 'Silêncio… lá está.', 'Devagar, contra o vento.'],
    acertou: ['Peguei!', 'Na mosca!', 'Carne para todo mundo!'],
    achou: ['Olha isso!', 'Achei! Achei!', 'Como brilha!'],
    errou: ['Errei…', 'Quase!', 'Fugiu!'],
    escapou: ['Escaparam todas.', 'Hoje não deu.'],
    oficio: ['Vou fazer ferramentas.', 'Deixa eu lascar essa pedra.', 'Vou costurar um couro.'],
    marcenaria: ['Vou tirar umas tábuas.', 'Essa madeira é boa.', 'Tábua reta, casa firme.'],
    // Etapa 12
    mina: ['Vou descer na mina.', 'Hoje eu acho o veio.', 'Pedra não acaba lá embaixo.'],
    forja: ['Vou acender a forja.', 'Ferro quente, martelo firme.', 'Essa vai durar uma vida.'],
    ourives: ['Vou fazer uma coisa bonita.', 'Olha como brilha.'],
    tear: ['Vou tecer um pouco.', 'Um fio por cima, um por baixo…', 'Essa manta vai ficar quentinha.'],
    caminho: ['Vou abrir o caminho.', 'Por aqui a gente vai mais rápido.', 'Tirando o mato…'],
    conservar: ['Vou pôr o peixe no moquém.', 'Fruta no sol dura o inverno.', 'Guardar para o frio.'],
    argila: ['Vou buscar barro.', 'Esse barro é bom.'],
    festa: ['Ê!', 'Dança comigo!', 'Que noite!', 'Mais uma!', 'Ninguém vai dormir hoje!', 'Ô, ô, ô!'],
    semOuvinte: ['Ninguém quer ouvir hoje…', 'Fica pra amanhã, então.'],
    chamaHistoria: ['Quem quer ouvir uma história?', 'Vem cá, que eu vou contar uma coisa.', 'Senta aqui perto do fogo.'],
    // Etapa 8: invenções
    chamaMusica: ['Quem quer ouvir a flauta?', 'Vem, que hoje tem música.', 'Senta aqui, que eu vou tocar.'],
    tambor: ['Tum, tum, tum!', 'Mais forte!', 'Dança, povo!', 'Ninguém fica parado!'],
    rede: ['Vou jogar a rede.', 'Hoje a rede vem cheia.'],
    // Etapa 9: bichos e luta
    investida: ['Ele vem aí!', 'Cuidado, vem pra cima!', 'Segura firme!'],
    ferido: ['Acertei, mas fugiu!', 'Tá ferido!', 'Ainda não caiu!'],
    venceu: ['Foi embora!', 'Pronto, passou.', 'Ninguém mexe com a gente.'],
    acuada: ['Achei! Tá aqui!', 'Cerca ela!', 'Devagar… ela tá acuada.'],
    espera: ['Espera os outros…', 'Devagar. Vamos juntos.', 'Ela tá aí dentro.'],
    desiste: ['Sozinho não dá.', 'Ninguém veio… volto amanhã.'],
    arco: ['Daqui eu acerto.', 'Silêncio… mira…', 'Vou de arco hoje.'],
    // Etapa 10: campo
    roca: ['Vou para a roça.', 'Terra boa essa.', 'Cada cova, três sementes.'],
    capina: ['Tirando o mato…', 'O mato cresce mais que a planta!', 'Enxada na mão.'],
    colher: ['Olha que fartura!', 'A terra devolveu.', 'Colheita boa!'],
    criacao: ['Vou ver os bichos.', 'Pi, pi, pi… vem!', 'Bicho bem tratado dá mais.'],
    cerca: ['Vou fincar a cerca.', 'Estaca por estaca.', 'Aqui bicho não passa.'],
  };
  AI.LINES = LINES;

  // ---------- utilidades ----------
  const has = (p, t) => p.traits.indexOf(t) >= 0;
  function urg(v) { const u = (100 - v) / 100; return u <= 0 ? 0 : u * u; }
  function lvl(p, sk) { return Math.min(C.SKILL_MAX, Math.floor(Math.sqrt((p.skills[sk] || 0) / C.SKILL_XP_DIV))); }
  AI.lvl = lvl;
  let curS = null;   // estado do passo atual (para a fase da vida)
  function workSpeed(p, sk, wk) {
    let s = 1 + C.SKILL_BONUS * (sk ? lvl(p, sk) : 0);
    if (curS) s *= Fam.workFactor(curS, p);
    if (curS && wk) s *= Tech.speed(curS, p, wk);   // ferramenta de pedra
    if (curS && wk && curS.god && curS.god.blessings && curS.god.blessings.length && G.Deus) s *= G.Deus.blessAt(curS, p.x, p.y);   // a Bênção (Etapa 11)
    if (curS && wk && p.sangue && G.Povos) s *= G.Povos.speed(curS, p, wk);   // os dons de cada povo (Etapa 12)
    if (has(p, 'Trabalhador')) s *= 1.15;
    if (has(p, 'Preguiçoso')) s *= 0.85;
    if (p.needs.energia < 15) s *= 0.8;
    return s;
  }
  function tileOf(S, p) { return Math.floor(p.y) * S.world.W + Math.floor(p.x); }
  const ctxNight = (S) => !!(S.ctx && (S.ctx.night || S.ctx.evening));
  // quem carrega um bebê sente o frio dele também
  function feltCold(S, p) {
    let c = p.needs.calor;
    for (const b of S.people) if (b.alive && b.carriedBy === p.id && b.needs.calor < c) c = b.needs.calor;
    return c;
  }
  const person = (S, id) => Fam.person(S, id);   // (0.12: pelo índice da família)
  AI.person = person;
  function say(S, p, key, chance, force, kind) {
    if (chance !== undefined && S.rng.next() > chance) return;
    Sim.say(S, p, S.rng.pick(LINES[key]), force, kind);
  }
  function setPath(p, path) { p.path = path && path.length ? path : null; p.pathI = 0; }
  function moving(p) { return !!(p.path && p.pathI < p.path.length); }
  function face(p, tx, ty) {
    const dx = tx + 0.5 - p.x, dy = ty + 0.5 - p.y;
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) return;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3; else p.dir = dy > 0 ? 0 : 1;
  }
  function faceIdx(S, p, i) { face(p, i % S.world.W, (i / S.world.W) | 0); }

  // allowSlow: aceita parar dentro de outra obra (fogueira ou moquém cercados de barracas continuam alcançáveis)
  function route(S, p, test, maxCost, allowSlow) {
    let r = W.findNearest(S.world, tileOf(S, p), test, maxCost || 160);
    if (!r && allowSlow) r = W.findNearest(S.world, tileOf(S, p), test, maxCost || 160, true);
    if (!r) return null;
    setPath(p, r.path);
    return r;
  }
  function toCamp(S, p) { return route(S, p, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180); }
  function toBuilding(S, p, b) {
    const w = S.world;
    return route(S, p, (i) => {
      const x = i % w.W, y = (i / w.W) | 0;
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return 0;
      return x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h ? 1 : 0;
    }, 180, true);
  }
  function litFires(S) { return S.buildings.filter((b) => b.type === 'fogueira' && b.built && b.fuel > 0); }
  function litNearCamp(S) {
    return litFires(S).some((b) => Math.abs(b.x - S.camp.x) <= 8 && Math.abs(b.y - S.camp.y) <= 8);
  }
  function othersDoing(S, p, type) { return S.people.some((q) => q !== p && q.alive && q.act && q.act.type === type); }
  function fishTaken(S, p, i) { return S.people.some((q) => q !== p && q.alive && q.act && q.act.type === 'pesca' && q.act.spot === i); }
  function claimed(S, p, i) { return S.people.some((q) => q !== p && q.alive && q.act && q.act.spot === i && (q.act.type === 'argila' || q.act.type === 'pesca')); }

  function deposit(S, p) {
    const c = p.carry; if (!c) return;
    if (c.back) { giveBack(S, p); return; }   // material de uma tarefa que ficou pela metade
    // o primeiro filho que ajuda: o portão da Etapa 3
    if ((p.mother || p.father) && Fam.age(S, p) < 18 && c.k !== 'obra' && !S.stats.childHelped) {
      S.stats.childHelped = true;
      Sim.chron(S, p.name + ' ajudou pela primeira vez: trouxe ' + c.n + ' de ' + RES_LABEL[c.k] + ' para o estoque.');
    }
    if (c.k === 'obra') { for (const m of C.MATERIALS) S.stock[m] += c[m] || 0; }
    else if (c.k === 'caca') {
      S.stock.carne += c.carne; S.stock.couro += c.couro;
      Sim.float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + c.carne + ' carne' + (c.couro ? ' +' + c.couro + ' couro' : ''));
    } else if (c.k === 'cria') {
      // do curral (Etapa 10): ovos, leite e lã
      S.stock.ovos += c.ovos || 0; S.stock.leite += c.leite || 0;
      S.stats.ovosGot += c.ovos || 0; S.stats.leiteGot += c.leite || 0; S.stats.laGot += c.fibra || 0;
      const parts = [];
      if (c.ovos) parts.push('+' + c.ovos + (c.ovos === 1 ? ' ovo' : ' ovos'));
      if (c.leite) parts.push('+' + c.leite + ' leite');
      if (c.fibra) parts.push('+' + c.fibra + ' lã');
      Sim.float(S, S.camp.x + 1, S.camp.y + 0.6, parts.join(' '));
    } else if (c.k === 'agua') S.stock.agua = Math.min(Tech.waterCap(S), S.stock.agua + c.n);
    else S.stock[c.k] += c.n;
    if (c.fibra) { S.stock.fibra += c.fibra; S.stats.fibraGot = (S.stats.fibraGot || 0) + c.fibra; }   // embira da casca (Etapa 7) e lã (Etapa 10)
    if (c.k === 'frutas' || c.k === 'peixe') { const got = S.stats.got || (S.stats.got = {}); got[c.k] = (got[c.k] || 0) + c.n; }   // missões do Ato 1
    if (c.k !== 'obra' && c.k !== 'caca' && c.k !== 'cria') Sim.float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + c.n + ' ' + RES_LABEL[c.k] + (c.fibra ? ' +' + c.fibra + ' fibra' : ''));
    p.carry = null;
  }
  // devolve ao estoque o que a pessoa carregava para uma tarefa largada no meio
  function giveBack(S, p) {
    const c = p.carry;
    if (!c) return;
    if (c.back) { for (const k in c.back) S.stock[k] += c.back[k]; }
    p.carry = null;
  }

  // ---------- movimento ----------
  function move(S, p, dt) {
    if (!p.path) return;
    const w = S.world;
    let mult = Fam.walkFactor(S, p);
    if (has(p, 'Ágil')) mult *= 1.15;
    if (p.needs.energia < 15) mult *= 0.8;
    if (S.ck.season === 3) mult /= C.SNOW_SLOW;
    mult *= G.Narr.walkMult(S);   // nevasca: neve pelos joelhos
    if (p.carry && p.carry.n >= 6) mult *= 0.92;
    let budget = dt / C.WALK_MIN_PER_TILE * mult, guard = 0;
    while (budget > 1e-6 && p.path && p.pathI < p.path.length && guard++ < 24) {
      const idx = p.path[p.pathI];
      if (w.block[idx]) {
        const goal = p.path[p.path.length - 1];
        const np = w.block[goal] ? null : W.findPath(w, tileOf(S, p), goal, 300);
        if (!np) { p.path = null; p.stuck = true; return; }
        setPath(p, np);
        continue;
      }
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1) * (w.road ? C.ROAD_MULT[w.road[idx]] : 1) *   // caminho e trilha andam mais
        (w.fence && w.fence[idx] && !(w.road && w.road[idx] >= 2) ? 2 : 1);   // pular a cerca (Etapa 10; na porteira, não)
      const can = budget / cost;
      if (d > 1e-6) { if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3; else p.dir = dy > 0 ? 0 : 1; }
      if (d <= can) { p.x = tx; p.y = ty; budget -= d * cost; p.pathI++; p.walk += d; if (G.Obras) G.Obras.step(S, idx); }
      else { p.x += dx / d * can; p.y += dy / d * can; p.walk += can; budget = 0; }
    }
    if (p.path && p.pathI >= p.path.length) p.path = null;
  }

  // ---------- barracas ----------
  function pickTent(S, p) {
    const tents = S.buildings.filter((b) => b.built && Sim.def(b).cap);
    if (!tents.length) return null;
    const cap = (b) => Sim.def(b).cap;
    const mate = Fam.partnerOf(S, p);
    let mine = tents.find((b) => b.beds.indexOf(p.id) >= 0);
    if (mine && Fam.bedLoad(S, mine) > cap(mine)) {
      // passou do limite (alguém cresceu): sai primeiro quem não está com um par na barraca, o maior e mais velho
      const paired = (id) => { const q = person(S, id); return !!(q && Fam.partners(S, q).some((m) => mine.beds.indexOf(m.id) >= 0)); };
      const out = mine.beds.filter((id) => !paired(id)).map((id) => person(S, id)).filter(Boolean)
        .sort((a, b) => Fam.bedUnits(S, b) - Fam.bedUnits(S, a) || a.born - b.born)[0] || p;
      mine.beds.splice(mine.beds.indexOf(out.id), 1);
      if (out === p) mine = null;
    }
    const need = (g) => g.reduce((n, q) => n + Fam.bedUnits(S, q), 0);
    const fits = (b, g) => Fam.bedLoad(S, b) + need(g) <= cap(b);
    // mora sem nenhum par e o par de mais afeto tem lugar na barraca dele: vai morar junto
    // (se não tem filho pequeno dormindo ali; senão, fica e visita)
    if (mine && mate && Fam.age(S, p) >= 18 && !Fam.partners(S, p).some((q) => mine.beds.indexOf(q.id) >= 0)) {
      const mt = tents.find((b) => b !== mine && b.beds.indexOf(mate.id) >= 0);
      const kidsHere = mine.beds.some((id) => { const k = person(S, id); return k && k.alive && (k.mother === p.id || k.father === p.id) && Fam.age(S, k) < 12; });
      if (mt && !kidsHere && fits(mt, [p])) { mine.beds.splice(mine.beds.indexOf(p.id), 1); mt.beds.push(p.id); mine = mt; }
    }
    if (mine) return mine;
    const mateTent = mate ? tents.find((b) => b.beds.indexOf(mate.id) >= 0) : null;
    const holds = (b, ids) => b.beds.some((id) => ids.indexOf(id) >= 0);
    const parents = [p.mother, p.father].filter(Boolean);
    const kids = S.people.filter((q) => q.mother === p.id || q.father === p.id).map((q) => q.id);
    // casal dorme junto; criança perto dos pais; depois barraca vazia; depois qualquer lugar
    const choose = (g) => (mateTent && fits(mateTent, g) ? mateTent : null) ||
      tents.find((b) => fits(b, g) && holds(b, parents)) || tents.find((b) => fits(b, g) && holds(b, kids)) ||
      tents.find((b) => fits(b, g) && !b.beds.length) || tents.find((b) => fits(b, g));
    let g = mate && !mateTent ? [p, mate] : [p], pick = choose(g);
    if (!pick && g.length > 1) { g = [p]; pick = choose(g); }
    if (!pick) return null;
    for (const q of g) if (pick.beds.indexOf(q.id) < 0) pick.beds.push(q.id);
    return pick;
  }
  const homeOf = (S, q) => S.buildings.find((b) => b.built && Sim.def(b).cap && b.beds.indexOf(q.id) >= 0) || null;
  // noite de visita: quem tem par morando em outra barraca dorme lá em parte das noites
  // (a vontade de ficar em casa pesa VISIT_HOME mais o afeto dos pares que moram junto). Daí vêm filhos de pais diferentes.
  function visitTent(S, p, home) {
    if (!home || !p.bonds || Fam.age(S, p) < 18 || p.labor || (p.host && p.host > S.t)) return null;
    const night = S.t + 12 * 60;
    let stay = C.VISIT_HOME;
    const opts = [];
    for (const q of Fam.partners(S, p)) {
      if (Fam.age(S, q) < 18 || q.carriedBy) continue;
      const af = Fam.afeto(p, q);
      if (home.beds.indexOf(q.id) >= 0) { stay += af; continue; }
      if (q.visiting && q.visiting.until > S.t) continue;   // foi dormir com outro par
      const qt = homeOf(S, q);
      if (!qt || qt === home) continue;
      if (Fam.tentLoad(S, qt) + 1 > Sim.def(qt).cap + C.VISIT_SQUEEZE) continue;   // a visita divide a cama do par e aperta um pouco
      opts.push({ q, qt, w: af });
    }
    if (!opts.length) return null;
    let sum = stay;
    for (const o of opts) sum += o.w;
    let r = S.rng.next() * sum - stay;
    if (r < 0) return null;
    for (const o of opts) {
      r -= o.w;
      if (r > 0) continue;
      (o.qt.guests || (o.qt.guests = {}))[p.id] = night;
      p.visiting = { tent: o.qt.id, q: o.q.id, until: night };
      o.q.host = night;   // quem recebe fica em casa esta noite
      return o.qt;
    }
    return null;
  }
  function unguest(S, p) {
    if (!p.visiting) return;
    const b = Sim.building(S, p.visiting.tent);
    if (b && b.guests) delete b.guests[p.id];
    p.visiting = null;
  }
  AI.visitTent = visitTent;
  function enterTent(S, p, b) { p.inTent = b.id; p.x = b.x + 1; p.y = b.y + 1; p.px = p.x; p.py = p.y; }
  function exitTent(S, p) {
    const b = Sim.building(S, p.inTent);
    p.inTent = 0;
    if (!b) return;
    const w = S.world;
    const cands = [[b.x + 1, b.y + b.h], [b.x, b.y + b.h], [b.x - 1, b.y + 1], [b.x + b.w, b.y + 1], [b.x, b.y - 1], [b.x + 1, b.y - 1]];
    for (const [x, y] of cands) {
      if (x >= 0 && y >= 0 && x < w.W && y < w.H && !w.block[y * w.W + x] && !w.slow[y * w.W + x]) {
        p.x = x + 0.5; p.y = y + 0.5; p.px = p.x; p.py = p.y; return;
      }
    }
  }

  // ---------- ações ----------
  const ACT = {};

  ACT.chegar = {
    start() { return true; },
    run(S, p, a, dt) {
      if (moving(p)) return RUN;
      if (!a.said) {
        a.said = true; p.dir = 0;
        Sim.addMem(S, p, 'chegada');
        say(S, p, p === S.people[0] ? 'chegada' : 'chegada2', 1, true);
      }
      if (!S.arrived && S.people.every((q) => !q.alive || !q.act || q.act.type !== 'chegar' || !moving(q))) {
        S.arrived = true;
        Sim.chron(S, Sim.listNames(S.people.filter((q) => q.alive)) + ' chegaram ' + S.siteLabel + '.');
        S.events.push({ k: 'arrived' });
      }
      a.t += dt;
      return a.t >= 30 ? DONE : RUN;
    },
  };

  ACT.depositar = {
    start(S, p) { return !!p.carry && !!toCamp(S, p); },
    run(S, p) {
      if (moving(p)) return RUN;
      if (p.stuck) return FAIL;
      deposit(S, p);
      return DONE;
    },
  };

  ACT.beber = {
    start(S, p, a) {
      const w = S.world, here = tileOf(S, p);
      const wr = W.findNearest(w, here, (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 90);
      if (S.stock.agua > 0) {
        const cr = W.findNearest(w, here, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
        // com lobos ou onça rondando, bebe do estoque, perto do fogo
        if (cr && (!wr || cr.cost <= wr.cost + 3 || G.Narr.beastsOut(S))) { a.src = 'estoque'; setPath(p, cr.path); return true; }
      }
      if (!wr) return false;
      a.src = 'fonte'; a.water = W.waterAdj(w, wr.idx); setPath(p, wr.path);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'drink'; a.t = 0;
        if (a.src === 'fonte') { const wi = W.waterAdj(S.world, tileOf(S, p)); if (wi >= 0) faceIdx(S, p, wi); }
      }
      a.t += dt;
      if (a.t < 10) return RUN;
      const n = p.needs;
      if (a.src === 'estoque') {
        const units = Math.min(S.stock.agua, Math.ceil((100 - n.sede) / C.WATER_DRINK));
        if (units <= 0) {
          // a água do estoque acabou enquanto chegava: vai beber na fonte (antes ficava meia hora sem poder beber)
          const w = S.world, wr = W.findNearest(w, tileOf(S, p), (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 90);
          if (!wr) return FAIL;
          a.src = 'fonte'; a.stage = 'go'; a.t = 0; setPath(p, wr.path);
          return RUN;
        }
        S.stock.agua -= units; n.sede = Math.min(100, n.sede + units * C.WATER_DRINK);
      } else n.sede = 100;
      return DONE;
    },
  };

  ACT.comer = {
    start(S, p, a) {
      const w = S.world, here = tileOf(S, p);
      const r = W.findNearest(w, here, (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res), 60);
      const food = S.ctx.food;
      if (food > 0) {
        const cr = W.findNearest(w, here, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
        // longe de casa, com fruta no pé logo ali (ou quase nada no estoque): come no arbusto
        const bushFirst = r && (!cr || r.cost + 12 < cr.cost || food < 3);
        if (cr && !bushFirst) { a.src = 'estoque'; setPath(p, cr.path); return true; }
      }
      if (!r) return false;
      a.src = 'arbusto'; a.obj = r.data; a.obj.res = p.id; setPath(p, r.path);
      return true;
    },
    run(S, p, a, dt) {
      const n = p.needs;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'eat'; a.t = 0; a.next = 0;
        if (a.obj) face(p, a.obj.x, a.obj.y);
      }
      a.t += dt;
      if (a.t < a.next) return RUN;
      if (n.fome >= 88) return DONE;
      if (a.src === 'estoque') {
        // o fresco primeiro (estraga logo); o conservado fica para quando faltar (o inverno)
        const st = S.stock, fresh = st.peixe + st.carne, lit = litNearCamp(S), cm = Tech.cookMult(S);   // vasos (Etapa 8): cozido rende mais
        const roca = rocaDish(st, lit);   // Etapa 10: da roça, o que estraga primeiro (sem fogo, só milho e abóbora)
        if (st.leite > 0) {
          st.leite--; n.fome += C.LEITE_FOOD; n.sede = Math.min(100, n.sede + C.LEITE_SEDE); a.next = a.t + 5; a.dish = 'leite'; Sim.addMem(S, p, 'tomouLeite');
        }
        else if (st.ovos > 0 && lit) { st.ovos--; n.fome += C.OVOS_FOOD * cm; a.next = a.t + 8; a.dish = 'ovos'; Sim.addMem(S, p, cm > 1 ? 'comeuCozido' : 'comeuQuente'); }
        else if (fresh > 0 && lit) {
          const k = st.carne > st.peixe ? 'carne' : 'peixe';
          st[k]--; n.fome += (k === 'carne' ? C.CARNE_COOKED : C.FISH_COOKED) * cm; Sim.addMem(S, p, cm > 1 ? 'comeuCozido' : 'comeuQuente'); a.next = a.t + 25; a.hot = k;
        }
        else if (st.frutas > 0) { st.frutas--; n.fome += C.FRUIT_FOOD; a.next = a.t + 6; }
        else if (roca) eatRoca(S, p, a, roca, lit, cm);
        else if (st.defumado > 0) { st.defumado--; n.fome += C.DEFUMADO_FOOD; a.next = a.t + 15; a.kept = 'defumado'; }
        else if (st.seca > 0) { st.seca--; n.fome += C.SECA_FOOD; a.next = a.t + 6; a.kept = 'seca'; }
        else if (fresh > 0) {
          const k = st.carne > st.peixe ? 'carne' : 'peixe';
          st[k]--; n.fome += k === 'carne' ? C.CARNE_RAW : C.FISH_RAW; Sim.addMem(S, p, k === 'carne' ? 'carneCrua' : 'comeuCru'); a.next = a.t + 12;
        }
        else if (!lit && S.ctx.fire && st.madeira > 0 && rocaDish(st, true)) {
          // só sobrou feijão ou mandioca, que pedem fogo: acende a fogueira para cozinhar
          const f = S.ctx.fire;
          f.fuel = Math.max(f.fuel, 1); st.madeira--;
          eatRoca(S, p, a, rocaDish(st, true), true, cm);
        }
        else {
          if (n.fome > 40) return DONE;
          // o estoque acabou enquanto chegava: tenta um arbusto com fruta por perto
          const w = S.world, r = W.findNearest(w, tileOf(S, p), (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res), 60);
          if (!r) return FAIL;
          a.src = 'arbusto'; a.obj = r.data; a.obj.res = p.id; a.stage = 'go'; a.t = 0; setPath(p, r.path);
          return RUN;
        }
      } else {
        const o = a.obj;
        if (o.k !== 'bush' || o.fruit <= 0) return a.ate ? DONE : FAIL;
        o.fruit--; n.fome += C.FRUIT_FOOD; a.ate = true; a.next = a.t + 6;
      }
      n.fome = Math.min(100, n.fome);
      return RUN;
    },
  };

  // Etapa 10: o que vem da roça (o que estraga primeiro vai antes; cru, só milho e abóbora)
  const ROCA_EAT = ['mandioca', 'abobora', 'milho', 'feijao'];
  function rocaDish(st, lit) {
    for (const k of ROCA_EAT) if (st[k] > 0 && (lit || C.ROCA[k].raw > 0)) return k;
    return null;
  }
  function eatRoca(S, p, a, k, lit, cm) {
    const d = C.ROCA[k];
    S.stock[k]--;
    p.needs.fome += lit ? d.food * cm : d.raw;
    a.next = a.t + (lit ? 20 : 8); a.dish = k;
    if (lit) Sim.addMem(S, p, cm > 1 ? 'comeuCozido' : 'comeuQuente');
  }

  ACT.dormir = {
    start(S, p, a) {
      const w = S.world, fires = litFires(S), auras = S.god ? S.god.auras : [];
      // gelado, com fogo aceso: dorme junto do fogo esta noite (a barraca fria não esquenta ninguém)
      const frozen = feltCold(S, p) < C.SLEEP_BY_FIRE && (fires.length || auras.length);
      const home = frozen ? null : pickTent(S, p);
      // de noite, às vezes dorme na barraca de um par (de dia, cochilo é em casa)
      const guest = home && ctxNight(S) ? visitTent(S, p, home) : null;
      if (guest && toBuilding(S, p, guest)) { a.tent = guest.id; a.visit = true; return true; }
      if (guest) unguest(S, p);
      const tent = home;
      if (tent && toBuilding(S, p, tent)) { a.tent = tent.id; return true; }
      let r = null;
      if (fires.length || auras.length) {
        // dorme perto do fogo ou dentro do Calor de Deus
        const near = (i) => {
          const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
          if (fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R)) return 1;
          return auras.some((g) => Math.hypot(x - g.x - 0.5, y - g.y - 0.5) <= g.r * 0.55) ? 1 : 0;
        };
        r = W.findNearest(w, tileOf(S, p), near, 140) || W.findNearest(w, tileOf(S, p), near, 140, true);   // fogo cercado de obras: deita onde der
      }
      a.byFire = !!r;
      if (!r) r = W.findNearest(w, tileOf(S, p), (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
      setPath(p, r ? r.path : null);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        a.stage = 'sleep'; a.t = 0; p.sleeping = true; p.dir = 0;
        if (a.tent && !p.stuck) { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
        say(S, p, 'sono', 0.3);
      }
      a.t += dt;
      const n = p.needs, h = S.ck.hour, day = h >= 6 && h < 19;
      if (day && n.energia >= 75) return DONE;
      // Daqui para baixo, quem acorda fica um tempo sem poder deitar de novo (p.fail.dormir).
      // Sem isso, deitava no mesmo instante e ficava entrando e saindo da barraca,
      // ou, com sono demais, levantava para beber e deitava de novo sem nunca chegar à água.
      // acorda para beber ou comer (comer só se houver comida): alguns minutos bastam para escolher ir
      // (se beber ou comer está bloqueado agora, não adianta acordar: levantava e desmaiava de novo sem parar)
      if ((n.sede < 10 && !(p.fail.beber > S.t)) || (n.fome < 8 && (S.ctx.food > 0 || S.ctx.bushFruit > 0) && !(p.fail.comer > S.t))) { p.fail.dormir = S.t + 6; return DONE_QUIET; }
      // frio demais aqui, sem fogo por perto: levanta para se aquecer ou rezar (meia hora)
      // (quem desmaiou de cansaço só acorda assim depois de recuperar um pouco)
      if (feltCold(S, p) < 12 && !(a.faint && n.energia < 20) && Math.max(Sim.fireHeat(S, p.x, p.y), G.God.heatAt(S, p.x, p.y)) < 5) return FAIL;
      // descansado de madrugada: levanta se houver algo que valha mais que ficar deitado (olha a cada meia hora)
      if (n.energia >= 99 && S.t >= (a.look || 0)) {
        a.look = S.t + 30;
        let me = 0, best = 0;
        for (const c of scoreList(S, p)) { if (c.type === 'dormir') me = Math.max(me, c.score); else best = Math.max(best, c.score); }
        if (best > me + 5) return FAIL;
      }
      return RUN;
    },
    end(S, p, a, r) {
      unguest(S, p);
      if (!p.sleeping) return;
      p.sleeping = false;
      if (a.t >= 240) {
        const b = p.inTent ? Sim.building(S, p.inTent) : null;
        Sim.addMem(S, p, b ? ((b.lv || 1) >= 2 ? 'dormiuBem' : 'dormiuBarraca') : 'dormiuRelento');
      }
      if (p.inTent) exitTent(S, p);
      if (r === DONE) say(S, p, 'acordar', 0.35);
    },
  };

  ACT.aquecer = {
    start(S, p, a) {
      const w = S.world, fires = litFires(S), auras = S.god ? S.god.auras : [];
      const lights = G.Deus && S.god && S.god.pending ? G.Deus.lights(S).filter((L) => L.bid) : [];   // a estátua do fogo (Etapa 11)
      if (fires.length || auras.length || lights.length) {
        // fogueira acesa ou o Calor de Deus: o que estiver mais perto
        const r = route(S, p, (i) => {
          const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
          if (fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R)) return 1;
          if (lights.some((L) => Math.hypot(x - L.x, y - L.y) <= L.r * 0.55)) return 1;
          return auras.some((g) => Math.hypot(x - g.x - 0.5, y - g.y - 0.5) <= g.r * 0.55) ? 1 : 0;
        }, 140, true);
        if (r) { a.src = 'fogo'; return true; }
      }
      const tent = pickTent(S, p);
      if (tent && toBuilding(S, p, tent)) { a.src = 'barraca'; a.tent = tent.id; return true; }
      return false;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'warm'; a.t = 0;
        if (a.src === 'barraca') { const b = Sim.building(S, a.tent); if (!b) return FAIL; enterTent(S, p, b); }
        else if (G.God.heatAt(S, p.x, p.y) > Sim.fireHeat(S, p.x, p.y)) a.src = 'aura';
        else { const f = litFires(S)[0]; if (f) face(p, f.x, f.y); }
      }
      a.t += dt;
      if (feltCold(S, p) >= 95 || a.t > 150) return DONE;
      if (a.src === 'fogo' && !S.ctx.fireLit) return FAIL;
      if (a.src === 'aura' && !(G.God.heatAt(S, p.x, p.y) > 0)) return FAIL;
      if (a.t > 30 && p.needs.calor > 60 && S.rng.next() < 0.004) say(S, p, 'quente');
      return RUN;
    },
    end(S, p) { if (p.inTent && !p.sleeping) exitTent(S, p); },
  };

  ACT.conversar = {
    start(S, p, a) {
      const q = person(S, a.q);
      if (!q || !q.alive || q.sleeping || q.inTent) return false;
      const w = S.world, qi = tileOf(S, q), qx = qi % w.W, qy = (qi / w.W) | 0;
      const r = route(S, p, (i) => {
        if (i === qi) return 0;
        const x = i % w.W, y = (i / w.W) | 0;
        return Math.max(Math.abs(x - qx), Math.abs(y - qy)) <= 1 ? 1 : 0;
      }, 40);
      if (!r) return false;
      AI.abort(S, q);
      // Etapa 6: a conversa tem tipo e falas (pergunta e resposta, consolo, briga, pazes, ensinar, namoro)
      const d = G.Life ? G.Life.dialog(S, p, q, a.hint) : null;
      const chat = { a: p.id, b: q.id, on: false, over: false, t: 0, dur: d ? d.dur : 40 + S.rng.int(0, 30), d, li: 0 };
      a.chat = chat; a.with = q.id; a.kind = d ? d.kind : 'papo';
      q.act = { type: 'conversar', stage: 'wait', t: 0, chat, with: p.id, score: 50, kind: a.kind };
      q.path = null;
      return true;
    },
    run(S, p, a, dt) {
      const chat = a.chat;
      if (chat.over) return chat.t >= 20 ? DONE : FAIL;
      const other = person(S, a.with);
      if (!other || !other.alive || !other.act || other.act.chat !== chat) { chat.over = true; return chat.t >= 20 ? DONE : FAIL; }
      if (chat.a === p.id) {
        if (!chat.on) {
          if (moving(p)) return RUN;
          if (p.stuck) { chat.over = true; return FAIL; }
          chat.on = true;
        }
        chat.t += dt;
        const d = chat.d;
        if (d) {
          // cada fala na sua hora: quem puxou pergunta, o outro responde (os balões ficam lado a lado)
          while (chat.li < d.lines.length && chat.t >= d.at[Math.min(chat.li, d.at.length - 1)]) {
            const ln = d.lines[chat.li++];
            Sim.say(S, ln.by ? other : p, ln.text, true, d.style || '');
          }
        } else if (S.rng.next() < dt / 16) {
          const who = S.rng.next() < 0.5 ? p : other, kid = Fam.age(S, who) < 12;
          say(S, who, kid ? 'crianca' : Fam.isPartner(p, other) ? 'casal' : 'chat', 1);
        }
        if (chat.t >= chat.dur) { chat.over = true; return DONE; }
      } else {
        a.t += dt;
        if (!chat.on && a.t > 90) { chat.over = true; return FAIL; }
      }
      face(p, Math.floor(other.x), Math.floor(other.y));
      return RUN;
    },
    end(S, p, a) {
      const chat = a.chat; if (!chat) return;
      chat.over = true;
      const fight = chat.d && chat.d.kind === 'briga';
      p.chatCool = S.t + (fight ? 480 : 240);
      if (chat.t >= 20) {
        if (!fight) { Sim.addMem(S, p, 'conversou'); p.rel[a.with] = (p.rel[a.with] || 0) + 1; }
        if (chat.a === p.id) {
          const q = person(S, a.with);
          if (q) { if (!fight) Fam.onChat(S, p, q); if (G.Life) G.Life.afterChat(S, p, q, chat.d); }
        }
      }
    },
  };

  // ---------- Etapa 6: histórias, festas ----------
  // um lugar perto do fogo (a roda), longe o bastante para não pisar nele
  function toFireRing(S, p, f, r0, r1) {
    const w = S.world, fx = f.x + 0.5, fy = f.y + 0.5;
    // cada um no seu lugar da roda: não para onde já tem gente (ou onde alguém está indo)
    const taken = new Set();
    for (const q of S.people) {
      if (q === p || !q.alive || q.carriedBy) continue;
      taken.add(tileOf(S, q));
      if (q.path && q.path.length) taken.add(q.path[q.path.length - 1]);
    }
    const ring = (i) => {
      const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5, d = Math.hypot(x - fx, y - fy);
      return d >= r0 && d <= r1 && w.bgrid[i] < 0 ? 1 : 0;
    };
    return route(S, p, (i) => (ring(i) && !taken.has(i) ? 1 : 0), 90) || route(S, p, ring, 90);
  }
  // quem conta: vai para a roda do fogo, conta em três partes e quem está por perto vem ouvir
  ACT.historia = {
    start(S, p, a) {
      const Li = G.Life;
      if (!Li || !Li.canTell(S, p)) return false;
      const f = Li.campFire(S, true);
      if (!f || !toFireRing(S, p, f, 0.9, 2.2)) return false;
      if (!p.path) setPath(p, [tileOf(S, p)]);
      Li.startStory(S, p, f, a.hint === 'sermao' && !!(G.Deus && G.Deus.sermonDue(S, p)));   // a Palavra (Etapa 11): pregação
      a.fire = f.id;
      return true;
    },
    run(S, p, a, dt) {
      const st = S.life && S.life.story;
      if (!st || st.teller !== p.id) return FAIL;
      if (a.stage === 'go') {
        a.walk = (a.walk || 0) + dt;
        if (a.walk > (st.sermon ? 130 : 60) || S.ck.hour >= 20.5) { G.Life.endStory(S, p, false); return FAIL; }   // longe demais: fica para outro dia (o profeta vem de mais longe)
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'tell'; a.t = 0; st.on = true;
        const f = Sim.building(S, st.fire); if (f) { face(p, f.x, f.y); G.Life.lightFire(S, f, 1); }   // fogo apagado: acende para contar
        if (st.sermon) Sim.say(S, p, G.Deus.sermonCall(S), true, 'god');
        else say(S, p, st.music ? 'chamaMusica' : 'chamaHistoria', 1, true, 'historia');
        S.events.push({ k: 'story', on: true, x: p.x, y: p.y, sermon: !!st.sermon });
        for (const q of S.people) if (q !== p && q.alive) q.nextEval = Math.min(q.nextEval, S.t);   // quem está por perto pensa se vem ouvir
      }
      a.t += dt;
      // a história só anda com alguém ouvindo; quem ainda vem chegando, a gente espera
      const state = (id) => { const q = person(S, id); return q && q.alive && q.act && q.act.type === 'ouvir' ? q.act.stage : ''; };
      const listening = st.listeners.some((id) => state(id) === 'listen'), coming = st.listeners.some((id) => state(id) === 'go');
      if (listening) { st.told = (st.told || 0) + dt; G.Life.storyTick(S, p, st, st.told); }
      else if ((!coming && a.t >= 25) || a.t >= 70) {
        // se alguém já ouviu um bom pedaço, termina ali; se ninguém veio, fica para outro dia
        const some = Object.keys(st.heard).some((id) => st.heard[id] >= 15);
        if (!some) say(S, p, 'semOuvinte', 1, true);
        G.Life.endStory(S, p, some);
        return DONE;
      }
      if ((st.told || 0) >= st.dur) { G.Life.endStory(S, p, true); return DONE; }
      return RUN;
    },
    end(S, p, a) { const st = S.life && S.life.story; if (st && st.teller === p.id) G.Life.endStory(S, p, a.stage === 'tell' && Object.keys(st.heard).some((id) => st.heard[id] >= 15)); },
  };
  ACT.ouvir = {
    start(S, p, a) {
      const st = S.life && S.life.story;
      if (!st || !G.Life.canListen(S, p, st)) return false;
      const f = Sim.building(S, st.fire);
      if (!f || !toFireRing(S, p, f, 1.2, 3.2)) return false;
      if (!p.path) setPath(p, [tileOf(S, p)]);
      a.st = st.id; a.teller = st.teller;
      if (st.listeners.indexOf(p.id) < 0) st.listeners.push(p.id);
      return true;
    },
    run(S, p, a, dt) {
      const st = S.life && S.life.story;
      if (!st || st.id !== a.st) return (a.heard || 0) >= 15 ? DONE : FAIL;
      if (a.stage === 'go') {
        a.walk = (a.walk || 0) + dt;
        if (a.walk > 60) return FAIL;
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'listen';
      }
      const t = person(S, st.teller);
      if (t) face(p, Math.floor(t.x), Math.floor(t.y));
      a.t += dt;
      if (st.on && a.stage === 'listen') { a.heard = (a.heard || 0) + dt; st.heard[p.id] = a.heard; }
      return RUN;
    },
    end(S, p, a) {
      const st = S.life && S.life.story;
      if (st && st.id === a.st && (a.heard || 0) < 15) { const i = st.listeners.indexOf(p.id); if (i >= 0) st.listeners.splice(i, 1); }
    },
  };
  // ---------- Etapa 11: Deus ----------
  // um lugar livre em volta de um ponto (a estátua), fora das obras
  function toRing(S, p, cx, cy, r0, r1, maxCost) {
    const w = S.world, taken = new Set();
    for (const q of S.people) {
      if (q === p || !q.alive || q.carriedBy) continue;
      taken.add(tileOf(S, q));
      if (q.path && q.path.length) taken.add(q.path[q.path.length - 1]);
    }
    const ring = (i) => {
      const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5, d = Math.hypot(x - cx, y - cy);
      return d >= r0 && d <= r1 && w.bgrid[i] < 0 ? 1 : 0;
    };
    return route(S, p, (i) => (ring(i) && !taken.has(i) ? 1 : 0), maxCost || 90) || route(S, p, ring, maxCost || 90);
  }
  // reza da manhã: vai até a estátua, reza um pouco e segue o dia
  ACT.rezar = {
    start(S, p, a) {
      const b = G.Deus && G.Deus.prayerStatue(S, p);
      if (!b || !toRing(S, p, b.x + 1, b.y + 1, 1.4, 2.9, 120)) return false;
      if (!p.path) setPath(p, [tileOf(S, p)]);
      a.b = b.id;
      return true;
    },
    run(S, p, a, dt) {
      const b = Sim.building(S, a.b);
      if (!b || !b.built) return FAIL;
      if (a.stage === 'go') {
        a.walk = (a.walk || 0) + dt;
        if (a.walk > 90) return FAIL;
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'pray'; a.t = 0;
        face(p, b.x + 0.5, b.y + 0.5);
        Sim.say(S, p, G.Deus.prayLine(S, p, p.id + S.ck.day), true, 'god');
      }
      a.t += dt;
      if (a.t >= C.REZA_MIN) { G.Deus.onPrayed(S, p, b); return DONE; }
      return RUN;
    },
  };
  // o escolhido que cura: vai até quem está doente ou num parto difícil e cura com as mãos
  const healSpot = (S, t) => (t.carriedBy ? person(S, t.carriedBy) || t : t);
  function closeTo(S, p, c, r) {
    if (c.inTent) { const b = Sim.building(S, c.inTent); if (b) return p.x >= b.x - 1.6 && p.x <= b.x + b.w + 1.6 && p.y >= b.y - 1.6 && p.y <= b.y + b.h + 1.6; }
    return Math.hypot(c.x - p.x, c.y - p.y) <= (r || 1.9);
  }
  function healRoute(S, p, t) {
    const c = healSpot(S, t);
    if (c.inTent) { const b = Sim.building(S, c.inTent); if (b) return toBuilding(S, p, b); }
    const w = S.world, qi = tileOf(S, c), qx = qi % w.W, qy = (qi / w.W) | 0;
    return route(S, p, (i) => (Math.max(Math.abs(i % w.W - qx), Math.abs(((i / w.W) | 0) - qy)) <= 1 ? 1 : 0), 90, true);
  }
  ACT.curar = {
    start(S, p, a) {
      const t = person(S, a.q);
      if (!t || !G.Deus || !G.Deus.needsHeal(S, t) || S.god.poder < C.ESCOLHIDO_CURA) return false;
      a.tgt = t.id;
      if (closeTo(S, p, healSpot(S, t))) { setPath(p, [tileOf(S, p)]); return true; }
      if (!healRoute(S, p, t)) return false;
      if (!p.path) setPath(p, [tileOf(S, p)]);
      return true;
    },
    run(S, p, a, dt) {
      const t = person(S, a.tgt);
      if (!t || !t.alive || !G.Deus.needsHeal(S, t)) return DONE;   // alguém (ou Deus) já curou
      const c = healSpot(S, t);
      if (a.stage === 'go') {
        a.walk = (a.walk || 0) + dt;
        if (a.walk > 120) return FAIL;
        if (!closeTo(S, p, c)) {
          if (moving(p)) return RUN;
          a.tries = (a.tries || 0) + 1;
          if (p.stuck || a.tries > 4 || !healRoute(S, p, t)) return FAIL;
          return RUN;
        }
        p.path = null;
        a.stage = 'heal'; a.t = 0;
        face(p, Math.floor(c.x), Math.floor(c.y));
      }
      a.t += dt;
      if (!closeTo(S, p, c, 2.6)) { a.stage = 'go'; return healRoute(S, p, t) ? RUN : FAIL; }
      if (a.t >= 5) return G.Deus.heal(S, p, t) ? DONE : FAIL;
      return RUN;
    },
  };

  // festa: em volta do fogo, pulando de um lugar para outro da roda
  ACT.festa = {
    start(S, p, a) {
      const pt = S.life && S.life.party;
      if (!pt || !pt.on) return false;
      const f = Sim.building(S, pt.fire);
      if (!f || !f.built || !toFireRing(S, p, f, 1.2, 3.4)) return false;
      if (!p.path) setPath(p, [tileOf(S, p)]);
      a.fire = f.id;
      G.Life.joinParty(S, p);
      return true;
    },
    run(S, p, a, dt) {
      const pt = S.life && S.life.party;
      if (!pt || !pt.on) return DONE;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'dance'; a.t = 0;
      }
      a.t += dt;
      // quem bate o tambor (Etapa 8) fica no lugar; os outros pulam pela roda
      const drummer = pt.drummer === p.id;
      if (!drummer && !moving(p) && S.rng.next() < dt / 9) { const f = Sim.building(S, a.fire); if (f) danceHop(S, p, f); }
      if (drummer && !moving(p)) { const f = Sim.building(S, a.fire); if (f) face(p, f.x, f.y); }
      if (S.rng.next() < dt / 30) say(S, p, drummer ? 'tambor' : 'festa', 1, false, 'festa');
      return RUN;
    },
    end(S, p) { if (G.Life && G.Life.leaveParty) G.Life.leaveParty(S, p); },
  };
  // um pulo para outro lugar da roda
  function danceHop(S, p, f) {
    const w = S.world, here = tileOf(S, p);
    const busy = (i) => S.people.some((q) => q !== p && q.alive && !q.carriedBy && (tileOf(S, q) === i || (q.path && q.path[q.path.length - 1] === i)));
    for (let k = 0; k < 6; k++) {
      const ang = S.rng.next() * Math.PI * 2, r = 1.5 + S.rng.next() * 1.8;
      const x = Math.floor(f.x + 0.5 + Math.cos(ang) * r), y = Math.floor(f.y + 0.5 + Math.sin(ang) * r);
      if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
      const i = y * w.W + x;
      if (i === here || w.block[i] || w.slow[i] || w.bgrid[i] >= 0 || G.IS_WATER[w.tile[i]] || busy(i)) continue;
      const path = W.findPath(w, here, i, 30);
      if (path && path.length) { setPath(p, path); return true; }
    }
    return false;
  }

  ACT.vagar = {
    start(S, p, a) {
      const w = S.world;
      a.dur = 15 + S.rng.int(0, 20);
      for (let k = 0; k < 8; k++) {
        const x = S.camp.x + S.rng.int(-5, 6), y = S.camp.y + S.rng.int(-5, 6);
        if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
        const i = y * w.W + x;
        if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]]) continue;
        const path = W.findPath(w, tileOf(S, p), i, 60);
        if (path) { setPath(p, path); return true; }
      }
      return true;
    },
    run(S, p, a, dt) { if (moving(p)) return RUN; a.t += dt; return a.t >= a.dur ? DONE : RUN; },
  };

  // criança brinca perto do acampamento: corre, ri e ganha companhia
  ACT.brincar = {
    start(S, p, a) {
      const w = S.world;
      a.dur = 40 + S.rng.int(0, 40); a.hops = 0;
      return hop(S, p, a, w);
    },
    run(S, p, a, dt) {
      if (moving(p)) return RUN;
      a.stage = 'play';
      a.t += dt;
      if (S.rng.next() < dt / 30) say(S, p, 'brincar', 1);
      if (a.t >= a.dur) { Sim.addMem(S, p, 'brincou'); return DONE; }
      if (a.hops < 5 && S.rng.next() < dt / 8) hop(S, p, a, S.world);
      return RUN;
    },
  };
  function hop(S, p, a, w) {
    for (let k = 0; k < 6; k++) {
      const x = S.camp.x + S.rng.int(-4, 5), y = S.camp.y + S.rng.int(-4, 5);
      if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
      const i = y * w.W + x;
      if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]]) continue;
      const path = W.findPath(w, tileOf(S, p), i, 40);
      if (path) { setPath(p, path); a.hops++; return true; }
    }
    return a.hops > 0;
  }

  // trabalho de parto: vai para a barraca (ou perto do fogo) e fica até o bebê nascer
  ACT.parto = {
    start(S, p, a) {
      const fires = litFires(S), w = S.world;
      const tent = pickTent(S, p);
      const tentWarm = tent && S.temp + (Sim.def(tent).heat || 0) >= C.COMFORT;
      if (tent && (tentWarm || !fires.length) && toBuilding(S, p, tent)) { a.tent = tent.id; return true; }
      if (fires.length) route(S, p, (i) => {
        const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
        return fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R) ? 1 : 0;
      }, 140, true);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p) && !p.stuck) return RUN;
        a.stage = 'labor'; a.t = 0; p.dir = 0;
        if (a.tent) { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
      }
      a.t += dt;
      if (!p.labor) return DONE;
      if (S.rng.next() < dt / 50) say(S, p, 'parto', 1);
      return RUN;
    },
    end(S, p) { if (p.inTent && !p.sleeping) exitTent(S, p); },
  };

  ACT.greve = {
    start(S, p) { toCamp(S, p); return true; },
    run(S, p, a, dt) { if (moving(p)) return RUN; a.t += dt; return a.t >= 240 ? DONE : RUN; },
  };

  // lobos por perto: corre para o fogo aceso, a barraca ou o Calor de Deus e fica lá até eles irem embora
  ACT.fugir = {
    start(S, p, a) {
      const w = S.world, Nr = G.Narr;
      if (Nr.safeSpot(S, p)) { a.src = p.inTent ? 'barraca' : 'fogo'; a.stage = 'hide'; return true; }
      const r = route(S, p, (i) => (Nr.safeTile(S, i) ? 1 : 0), 120, true);
      if (r) { if (!p.path) setPath(p, [r.idx]); a.src = 'fogo'; }   // já está no tile: vai até o meio dele
      else {
        const tent = pickTent(S, p);
        if (tent && toBuilding(S, p, tent)) { a.src = 'barraca'; a.tent = tent.id; }
        else if (toCamp(S, p)) a.src = 'campo';   // sem abrigo: junto dos outros, no acampamento
        else return false;
      }
      say(S, p, 'lobos', 0.6, true);
      return true;
    },
    run(S, p, a, dt) {
      const Nr = G.Narr;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'hide'; a.t = 0; p.dir = 0;
        if (a.src === 'barraca') { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
      }
      a.t += dt;
      const n = p.needs, h = S.ck.hour;
      if (!Nr.beastsOut(S)) {
        // os lobos (ou a onça) foram embora: quem pegou no sono continua dormindo ali mesmo
        if (p.sleeping) { p.act = { type: 'dormir', stage: 'sleep', t: a.slept || 0, score: 50, byFire: a.src === 'fogo' }; return RUN; }
        return DONE;
      }
      // o fogo apagou e aqui ficou perigoso: procura outro abrigo
      if (a.src === 'fogo' && !p.sleeping && a.t > 4 && !Nr.safeSpot(S, p)) {
        a.stage = 'go';
        return ACT.fugir.start(S, p, a) ? RUN : FAIL;
      }
      if (p.sleeping) {
        a.slept = (a.slept || 0) + dt;
        // acorda com sede, fome ou frio (a urgência decide o resto)
        if (n.sede < 10 || (n.fome < 8 && S.ctx.food > 0) || feltCold(S, p) < 12) p.sleeping = false;
      } else if (n.energia < 25 || ((h >= 21 || h < 5) && n.energia < 70)) { p.sleeping = true; p.dir = 0; }
      return RUN;
    },
    end(S, p) {
      p.sleeping = false;
      if (p.inTent) exitTent(S, p);
    },
  };

  const danger = (S, i) => !!(G.Fauna && G.Fauna.dangerAt(S, i));
  function objOk(o, kind) {
    if (!o) return false;
    if (kind === 'madeira') return o.k === 'tree';
    if (kind === 'pedra') return o.k === 'rock' && o.ch > 0;
    if (kind === 'frutas') return o.k === 'bush';
    return true;
  }

  function gather(kind) {
    const sk = SKILL_OF[kind];
    return {
      start(S, p, a) {
        if (p.carry && p.carry.k !== kind) return false;
        if (p.carry && p.carry.n >= Fam.carryCap(S, p)) return false;
        const w = S.world;
        let test;
        // Etapa 10: a árvore ou a pedra que faz de parede numa roça ou num curral cercados fica onde está
        const gd = (kind === 'madeira' || kind === 'pedra') && G.Campo ? G.Campo.guarded(S) : null;
        const free = (o) => !gd || !gd.size || !gd.has(o.y * w.W + o.x);
        if (kind === 'madeira') test = (i) => W.adjObj(w, i, (o) => o.k === 'tree' && !o.res && free(o));
        else if (kind === 'pedra') test = (i) => W.adjObj(w, i, (o) => o.k === 'rock' && o.ch > 0 && !o.res && free(o));
        else if (kind === 'frutas') test = (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res);
        // Etapa 9: a margem onde um jacaré atacou fica marcada, e o povo evita trabalhar ali por um tempo
        else if (kind === 'agua') test = (i) => (W.waterAdj(w, i) >= 0 && !danger(S, i) ? 1 : 0);
        else if (kind === 'argila') test = (i) => (W.waterAdj(w, i) >= 0 && !claimed(S, p, i) && !danger(S, i) ? 1 : 0);   // barreiro: a beira d'água
        else test = (i) => (W.waterAdj(w, i) >= 0 && W.waterCount8(w, i) >= 2 && !fishTaken(S, p, i) && !danger(S, i) ? 1 : 0);
        // procura o alvo mais perto do acampamento (trabalho perto de casa), depois caminha até ele
        const campI = S.camp.y * w.W + S.camp.x;
        // perto de casa primeiro; acabou pedra (ou árvore) por perto, vai mais longe (pedra não nasce de novo)
        const r = W.findNearest(w, campI, test, C.SEARCH_MAX) || (kind === 'pedra' || kind === 'madeira' ? W.findNearest(w, campI, test, C.SEARCH_FAR) : null);
        if (!r) return false;
        const path = W.findPath(w, tileOf(S, p), r.idx, 300);
        if (!path) return false;
        setPath(p, path);
        if (typeof r.data === 'object') { a.obj = r.data; a.obj.res = p.id; }
        a.spot = r.idx; a.caught = 0;
        return true;
      },
      run(S, p, a, dt) {
        const w = S.world;
        if (a.stage === 'go') {
          if (moving(p)) return RUN;
          if (p.stuck) return FAIL;
          if (a.obj && !objOk(a.obj, kind)) return p.carry ? toHaul(S, p, a) : FAIL;
          a.stage = 'work'; a.t = 0; a.roll = 0; a.next = kind === 'frutas' ? C.HARVEST_MIN : 0;
          if (a.obj) face(p, a.obj.x, a.obj.y);
          else { const wi = W.waterAdj(w, tileOf(S, p)); if (wi >= 0) { faceIdx(S, p, wi); a.water = wi; } }
          if (!a.spoke) { a.spoke = true; say(S, p, kind === 'pesca' && Tech.known(S, 'rede') && S.rng.next() < 0.5 ? 'rede' : kind, 0.3); }
        }
        if (a.stage === 'work') {
          a.t += dt * workSpeed(p, sk, kind);
          p.skills[sk] += dt / 60 * Fam.xpFactor(S, p);
          if (kind === 'madeira') {
            if (!objOk(a.obj, kind)) return FAIL;
            if (a.t < C.CHOP_MIN) return RUN;
            a.obj.k = 'stump'; a.obj.regrow = 0; a.obj.res = 0;
            W.refreshBlock(w, a.obj.y * w.W + a.obj.x);
            p.carry = { k: 'madeira', n: C.TREE_WOOD, fibra: G.Obras ? G.Obras.embira(S) : 0 };
            S.events.push({ k: 'fell', x: a.obj.x, y: a.obj.y });
          } else if (kind === 'pedra') {
            if (!objOk(a.obj, kind)) return FAIL;
            if (a.t < C.MINE_MIN) return RUN;
            a.obj.ch--;
            p.carry = { k: 'pedra', n: C.ROCK_STONE };
            if (a.obj.ch <= 0) W.removeObj(w, a.obj);
          } else if (kind === 'frutas') {
            const o = a.obj;
            if (a.t < a.next) return RUN;
            const cap = Fam.carryCap(S, p), full = p.carry && p.carry.n >= cap;
            if (!full && o.k === 'bush' && o.fruit > 0) {
              o.fruit--;
              if (!p.carry) p.carry = { k: 'frutas', n: 0 };
              p.carry.n++;
              a.next = a.t + C.HARVEST_FRUIT_MIN;
              return RUN;
            }
            if (!full && p.carry && p.carry.n < cap - 1) {
              o.res = 0;
              const r = W.findNearest(w, tileOf(S, p), (i) => W.adjObj(w, i, (b) => b.k === 'bush' && b.fruit > 0 && !b.res), 10);
              if (r) { a.obj = r.data; a.obj.res = p.id; setPath(p, r.path); a.stage = 'go'; return RUN; }
            }
            if (!p.carry) return FAIL;
          } else if (kind === 'agua') {
            if (a.t < C.WATER_MIN) return RUN;
            const room = Tech.waterCap(S) - S.stock.agua;
            if (room <= 0) return DONE;
            // na seca o rio baixa: cada viagem rende menos; com cestos, cabem mais cabaças
            p.carry = { k: 'agua', n: Math.max(1, Math.min(Math.round((Fam.stage(S, p) === 'crianca' ? 3 : C.WATER_TRIP) * Tech.carryMult(S) * G.Narr.waterMult(S)), room)) };
          } else if (kind === 'argila') {
            if (a.t < C.ARGILA_MIN) return RUN;
            p.carry = { k: 'argila', n: Math.round(C.ARGILA_TRIP * Tech.carryMult(S)) };
          } else {
            if (a.t - a.roll >= C.FISH_ROLL) {
              a.roll += C.FISH_ROLL;
              let ch = C.FISH_CHANCE + C.FISH_CHANCE_LVL * lvl(p, 'pesca');
              if (S.ck.season === 3) ch *= C.FISH_WINTER;
              ch *= G.Narr.fishMult(S);   // seca e nevasca espantam, piracema enche o rio
              ch *= Tech.fishMult(S, p);   // anzol
              if (S.rng.next() < ch) {
                a.caught++;
                p.carry = { k: 'peixe', n: a.caught };
                say(S, p, 'peixe', 0.5);
                if (a.water >= 0) S.events.push({ k: 'splash', x: a.water % w.W, y: (a.water / w.W) | 0 });
              }
            }
            if (a.caught < (G.Inv ? G.Inv.fishMax(S) : C.FISH_MAX) && a.t < C.FISH_SESSION) return RUN;   // com a rede, mais por vez
            if (!a.caught) { say(S, p, 'semPeixe', 0.6); return DONE; }
          }
          return toHaul(S, p, a);
        }
        if (a.stage === 'haul') {
          if (moving(p)) return RUN;
          if (p.stuck) return FAIL;
          deposit(S, p);
          return DONE;
        }
        return RUN;
      },
    };
  }
  function toHaul(S, p, a) {
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    a.stage = 'haul';
    return toCamp(S, p) ? RUN : FAIL;
  }
  ACT.madeira = gather('madeira');
  ACT.pedra = gather('pedra');
  ACT.frutas = gather('frutas');
  ACT.agua = gather('agua');
  ACT.pesca = gather('pesca');
  ACT.argila = gather('argila');

  const MATS = C.MATERIALS;
  const sumMat = (o) => MATS.reduce((s, k) => s + (o[k] || 0), 0);
  ACT.construir = {
    start(S, p, a) {
      if (p.carry) return false;
      const job = S.ctx.job; if (!job) return false;
      const b = job.b, miss = Sim.missing(job);
      a.b = b.id;
      if (sumMat(miss) > 0) {
        let cap = Fam.carryCap(S, p);
        const take = {};
        for (const k of MATS) { const t = Math.max(0, Math.min(miss[k] || 0, S.stock[k] || 0, cap)); take[k] = t; cap -= t; }
        if (sumMat(take) === 0) return false;
        if (!toCamp(S, p)) return false;
        a.take = take; a.stage = 'fetch';
        return true;
      }
      if (!toBuilding(S, p, b)) return false;
      return true;
    },
    run(S, p, a, dt) {
      const b = Sim.building(S, a.b);
      if (!b) return FAIL;
      const job = Sim.jobOf(b);
      if (!job) return DONE;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const got = { k: 'obra', n: 0 };
        for (const k of MATS) { const t = Math.min(a.take[k] || 0, S.stock[k] || 0); S.stock[k] -= t; got[k] = t; got.n += t; }
        if (!got.n) return FAIL;
        p.carry = got;
        if (!toBuilding(S, p, b)) return FAIL;
        a.stage = 'deliver';
        return RUN;
      }
      if (a.stage === 'deliver') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        for (const k of MATS) job.have[k] = (job.have[k] || 0) + (p.carry[k] || 0);
        p.carry = null;
        Sim.refresh(S);
        return DONE;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        if (sumMat(Sim.missing(job)) > 0) return DONE;
        a.stage = 'build'; a.t = 0;
        face(p, b.x, b.y);
        say(S, p, 'construir', 0.3);
      }
      const wsp = workSpeed(p, 'construcao', 'construir');
      job.progress = job.progress + dt * wsp / job.work;
      S.stats.buildMin = (S.stats.buildMin || 0) + dt * wsp;   // a memória da aldeia (0.12): quanto se trabalha em obra
      p.skills.construcao += dt / 60 * Fam.xpFactor(S, p);
      a.t += dt;
      if (job.progress >= 1) { Sim.complete(S, b); return DONE; }
      return RUN;
    },
    end(S, p) {
      if (p.carry && p.carry.k === 'obra') { for (const k of MATS) S.stock[k] += p.carry[k] || 0; p.carry = null; }
    },
  };

  // Etapa 12: a mina. Vai até a boca, trabalha um turno lá dentro e traz o que saiu (pedra sempre; o resto é sorte)
  ACT.mina = {
    start(S, p, a) {
      if (p.carry || !G.Minas) return false;
      const b = G.Minas.pick(S, p);
      if (!b) return false;
      a.b = b.id;
      return !!toBuilding(S, p, b);
    },
    run(S, p, a, dt) {
      const Mi = G.Minas, b = Sim.building(S, a.b);
      if (a.stage === 'haul') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        if (p.carry && p.carry.mina) { Mi.deposit(S, p, p.carry.mina); p.carry = null; }
        return DONE;
      }
      if (!b || !b.built || b.demol) return FAIL;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'work'; a.t = 0;
        face(p, b.x + 1, b.y + 1);
        say(S, p, 'mina', 0.3);
      }
      a.t += dt * workSpeed(p, 'mineracao', 'mina');
      p.skills.mineracao = (p.skills.mineracao || 0) + dt / 60 * Fam.xpFactor(S, p);
      if (a.t < C.MINA_TURNO) return RUN;
      const got = Mi.yield(S, p, b);
      let n = 0;
      for (const k in got) n += got[k];
      p.carry = { k: got.ouro ? 'ouro' : got.prata ? 'prata' : got.minerio ? 'minerio' : got.carvao ? 'carvao' : 'pedra', n, mina: got };
      if (got.ouro || got.gemas) say(S, p, 'achou', 1, true);
      a.stage = 'haul';
      return toCamp(S, p) ? RUN : FAIL;
    },
    // largou no meio do caminho: o que já tinha saído da mina chega ao estoque assim mesmo
    end(S, p) { if (p.carry && p.carry.mina) { G.Minas.deposit(S, p, p.carry.mina); p.carry = null; } },
  };

  ACT.fogo = {
    start(S, p, a) {
      if (p.carry) return false;
      const f = S.ctx.fire;
      if (!f || S.stock.madeira <= 0) return false;
      a.b = f.id;
      // leva de uma vez o que cabe no fogo (antes eram 3 por viagem: na nevasca não dava conta)
      a.want = Math.max(1, Math.min(Fam.carryCap(S, p), S.stock.madeira, Math.ceil(C.FIRE_CAP - f.fuel)));
      if (!toCamp(S, p)) return false;
      a.stage = 'fetch';
      return true;
    },
    run(S, p, a) {
      const f = Sim.building(S, a.b);
      if (!f) return FAIL;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const n = Math.min(a.want, S.stock.madeira);
        if (n <= 0) return FAIL;
        S.stock.madeira -= n;
        p.carry = { k: 'madeira', n, fuel: true };
        if (!toBuilding(S, p, f)) return FAIL;
        a.stage = 'feed';
        return RUN;
      }
      if (moving(p)) return RUN;
      if (p.stuck) return FAIL;
      f.fuel = Math.min(C.FIRE_CAP, f.fuel + p.carry.n);
      p.carry = null;
      face(p, f.x, f.y);
      say(S, p, 'fogo', 0.15);
      Sim.refresh(S);
      return DONE;
    },
    end(S, p) { if (p.carry && p.carry.fuel) { S.stock.madeira += p.carry.n; p.carry = null; } },
  };

  // caça (lança): escolhe uma capivara, chega perto, arremessa; acertou, carneia e leva carne e couro.
  // Com o arco e flecha (Etapa 8), atira de longe, acerta mais e a flecha não espanta o bando
  const cacaR = (S, p) => (G.Inv ? G.Inv.cacaR(S) : C.CACA_R) + (p && p.sangue && G.Povos ? G.Povos.cacaReach(p) : 0);   // o olho de arqueiro alcança mais (Etapa 12)
  // a presa caiu: vai até ela para carnear
  function toCut(S, p, a, e) {
    const w = S.world, ex = Math.floor(e.x), ey = Math.floor(e.y);
    route(S, p, (i) => { const x = i % w.W, y = (i / w.W) | 0; return Math.max(Math.abs(x - ex), Math.abs(y - ey)) <= 1 ? 1 : 0; }, 60);
    a.stage = 'cut'; a.t = 0;
    return RUN;
  }
  function approach(S, p, e) {
    const w = S.world, ex = e.x, ey = e.y;
    const r = W.findNearest(w, tileOf(S, p), (i) => {
      const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
      return Math.hypot(x - ex, y - ey) <= cacaR(S, p) - 0.4 ? 1 : 0;
    }, 160);
    if (!r) return false;
    setPath(p, r.path.length ? r.path : null);
    return true;
  }
  ACT.caca = {
    start(S, p, a) {
      if (p.carry) return false;
      if (!Tech.hasTool(S, p)) {
        if (S.stock.ferro > 0) { S.stock.ferro--; p.tool = { dur: 100, fe: 1 }; }   // Etapa 12: a de ferro primeiro
        else {
          if (S.stock.ferramentas <= 0) return false;
          S.stock.ferramentas--; p.tool = { dur: 100 };   // a lança vem do estoque de ferramentas
        }
      }
      const e = G.Fauna.prey(S, p, 60);
      if (!e) return false;
      a.prey = e.id; e.res = p.id; a.shots = 0;
      if (!approach(S, p, e)) { e.res = 0; return false; }
      // Etapa 9: às vezes diz o bicho que vai caçar
      if (S.rng.next() < 0.25) Sim.say(S, p, 'Vou atrás ' + C.BICHOS[e.sp || 'capivara'].art.replace(/^uma /, 'daquela ').replace(/^um /, 'daquele ') + '.');
      else say(S, p, Tech.known(S, 'arco') && S.rng.next() < 0.5 ? 'arco' : 'caca', 0.4);
      return true;
    },
    run(S, p, a, dt) {
      const Fa = G.Fauna, e = Fa.get(S, a.prey);
      if (!e || e.gone) return a.stage === 'haul' ? ACT.depositar.run(S, p) : FAIL;
      if ((a.stage === 'go' || a.stage === 'aim') && e.state === 'morta') return toCut(S, p, a, e);   // caiu (na luta, por exemplo)
      if (a.stage === 'go') {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (e.state !== 'morta' && d <= cacaR(S, p)) { a.stage = 'aim'; a.t = 0; p.path = null; face(p, Math.floor(e.x), Math.floor(e.y)); return RUN; }
        a.t += dt;
        // a presa anda: refaz o caminho de tempos em tempos
        if (!moving(p) || a.t - (a.repath || 0) >= 15) {
          a.repath = a.t;
          if (p.stuck || !approach(S, p, e)) { p.stuck = false; a.fails = (a.fails || 0) + 1; if (a.fails > 3) return FAIL; }
        }
        return a.t > 240 ? FAIL : RUN;   // correu demais atrás
      }
      if (a.stage === 'aim') {
        if (Math.hypot(e.x - p.x, e.y - p.y) > cacaR(S, p) + 1.2) { a.stage = 'go'; a.t = 0; a.repath = -99; return RUN; }
        face(p, Math.floor(e.x), Math.floor(e.y));
        a.t += dt * workSpeed(p, 'caca', 'caca');
        p.skills.caca += dt / 60 * Fam.xpFactor(S, p);
        if (a.t < C.CACA_AIM_MIN) return RUN;
        a.shots++;
        const bow = !!(G.Inv && Tech.known(S, 'arco'));
        S.events.push({ k: 'throw', x1: p.x, y1: p.y - 0.4, x2: e.x, y2: e.y, bow });
        const bando = Fa.alive(S).filter((o) => o !== e && o.h === e.h && Math.hypot(o.x - e.x, o.y - e.y) < 7);
        if (S.rng.next() < C.CACA_HIT + C.CACA_HIT_LVL * lvl(p, 'caca') + (G.Inv ? G.Inv.cacaHit(S) : 0) + (p.sangue && G.Povos ? G.Povos.cacaHit(p) : 0)) {
          S.events.push({ k: 'hit', x: e.x, y: e.y });
          const r = Fa.hit ? Fa.hit(S, e, p) : (Fa.kill(S, e), 'morto');   // bicho grande pede mais de um acerto
          if (r === 'morto') {
            if (bow) S.stats.arrowKills = (S.stats.arrowKills || 0) + 1;
            for (const o of bando) Fa.scare(S, o, p.x, p.y);
            say(S, p, 'acertou', 0.8, true);
            return toCut(S, p, a, e);
          }
          if (r === 'investida') { say(S, p, 'investida', 1, true); a.t = 0; return RUN; }   // vem para cima: segura a mira
          say(S, p, 'ferido', 0.8, true);
          for (const o of bando) if (!bow) Fa.scare(S, o, p.x, p.y);
          if (a.shots >= (G.Inv ? G.Inv.cacaShots(S) : C.CACA_SHOTS)) return DONE;
          a.stage = 'go'; a.t = 0; a.repath = -99;
          return RUN;
        }
        Fa.scare(S, e, p.x, p.y);
        if (!bow) for (const o of bando) Fa.scare(S, o, p.x, p.y);   // a lança faz barulho; a flecha, não
        if (a.shots >= (G.Inv ? G.Inv.cacaShots(S) : C.CACA_SHOTS)) { say(S, p, 'escapou', 0.7, true); return DONE; }
        say(S, p, 'errou', 0.5);
        a.stage = 'go'; a.t = 0; a.repath = -99;
        return RUN;
      }
      if (a.stage === 'cut') {
        if (moving(p)) return RUN;
        face(p, Math.floor(e.x), Math.floor(e.y));
        a.t += dt;
        if (a.t < C.CACA_CUT_MIN) return RUN;
        Fa.remove(S, e);
        S.stats.hunted++;
        const sp = e.sp || 'capivara', hb = S.stats.huntedBy || (S.stats.huntedBy = {});
        hb[sp] = (hb[sp] || 0) + 1; S.stats.lastHunt = sp;
        if (!S.stats.firstHunt) { S.stats.firstHunt = true; Sim.chron(S, p.name + ' voltou da primeira caçada com ' + C.BICHOS[sp].art + ' nas costas.'); }
        else if (hb[sp] === 1) { Sim.chron(S, p.name + ' caçou ' + C.BICHOS[sp].art + ' pela primeira vez.'); Sim.addMem(S, p, 'cacouNovo'); }   // Etapa 9: cada bicho novo entra na Crônica
        const y = Fa.yieldOf ? Fa.yieldOf(S, sp) : G.Inv ? G.Inv.cacaYield(S) : { carne: C.CACA_CARNE, couro: C.CACA_COURO };   // com a faca, carneia melhor
        const faro = p.sangue && G.Povos ? G.Povos.cacaMeat(p) : 0;   // Etapa 12: o faro tira mais carne
        p.carry = { k: 'caca', carne: y.carne + faro, couro: y.couro, n: y.carne + faro + y.couro, sp };
        a.stage = 'haul';
        return toCamp(S, p) ? RUN : FAIL;
      }
      if (moving(p)) return RUN;
      if (p.stuck) return FAIL;
      deposit(S, p);
      return DONE;
    },
    end(S, p, a) {
      const e = G.Fauna.get(S, a.prey);
      if (e && e.res === p.id) e.res = 0;
    },
  };

  // Etapa 9: defender. Quem tem lança (ou arco) corre para ajudar quem foi atacado: chega ao alcance e ataca de
  // LUTA_MIN em LUTA_MIN minutos, até o bicho cair, fugir ou ir embora (ou a luta passar de 45 minutos)
  ACT.defender = {
    start(S, p, a) {
      const B = G.Bichos;
      if (!B || !a.tgt || B.over(S, a.tgt) || !B.armed(S, p)) return false;
      a.stage = 'go'; a.t = 0; a.repath = -1;
      return true;
    },
    run(S, p, a, dt) {
      const B = G.Bichos, e = B.ent(S, a.tgt), hunt = !!a.tgt.hunt;
      if (!e || B.over(S, a.tgt)) { say(S, p, 'venceu', 0.6, true); return DONE; }
      a.t += dt;
      // na caçada à onça, a caminhada até a toca é longa; na defesa, a luta é curta
      if (a.t > (hunt ? 360 : 45) || !B.armed(S, p) || p.needs.saude < 25) return DONE;
      const R = cacaR(S), d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > R) {
        a.stage = 'go';
        if (!moving(p) || S.t >= a.repath) {
          a.repath = S.t + (hunt && d > 8 ? 20 : 4);
          const w = S.world, ex = e.x, ey = e.y;
          const r = W.findNearest(w, tileOf(S, p), (i) => { const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5; return Math.hypot(x - ex, y - ey) <= R - 0.4 ? 1 : 0; }, hunt ? 240 : 80);
          if (!r) return FAIL;
          setPath(p, r.path.length ? r.path : null);
        }
        return RUN;
      }
      // chegou na toca: espera os outros (ninguém entra sozinho) e então acham a onça, que fica acuada (e brava)
      if (hunt && e.state === 'toca') {
        const near = S.people.filter((q) => q.alive && q.act && q.act.type === 'defender' && q.act.tgt && q.act.tgt.hunt && q.act.tgt.id === e.id &&
          Math.hypot(q.x - e.x, q.y - e.y) <= R + 2).length;
        if (near < 2) {
          if (a.stage !== 'wait') { a.stage = 'wait'; a.waited = 0; p.path = null; face(p, Math.floor(e.x), Math.floor(e.y)); say(S, p, 'espera', 1, true); }
          a.waited += dt;
          if (a.waited > 90) { say(S, p, 'desiste', 1, true); return DONE; }   // os outros não vieram: sozinho, ninguém entra
          return RUN;
        }
        G.Narr.corner(S, e, p); say(S, p, 'acuada', 1, true);
      }
      a.stage = 'aim'; p.path = null;
      face(p, Math.floor(e.x), Math.floor(e.y));
      a.aim = (a.aim || 0) + dt;
      if (a.aim < C.LUTA_MIN) return RUN;
      a.aim = 0;
      B.strike(S, p, a.tgt, false);
      return RUN;
    },
  };
  AI.startDefend = function (S, p, tgt) {
    if (p.act && (p.act.type === 'defender' || p.act.type === 'parto')) return false;
    if (p.act) end(S, p, 0);
    const a = { type: 'defender', score: 99, stage: 'go', t: 0, tgt };
    p.sleeping = false;
    if (!ACT.defender.start(S, p, a)) return false;
    p.act = a; p.nextEval = S.t + 60;
    return true;
  };

  // ofício (pedra lascada): no acampamento, lasca pedra e encaba ferramentas; com couro, costura roupas
  // Ofício: ferramentas e roupas no acampamento; tábuas na marcenaria, mantas e redes na tecelagem (Etapa 7)
  const PIECE = { ferramentas: 'ferramenta', roupas: 'roupa', tabuas: 'tábua', mantas: 'manta', redes: 'rede', ferro: 'ferramenta de ferro', joias: 'joia', joiasOuro: 'joia' };
  const craftPlan = (S, p) => (G.Obras ? G.Obras.oficioPlan(S, p) : Tech.oficioPlan(S));   // p (Etapa 12): quem não sabe forjar não pega o trabalho da forja
  const craftCost = (k) => (G.Obras ? G.Obras.costOf(k) : k === 'roupas' ? C.ROUPA_COST : C.TOOL_COST);
  ACT.oficio = {
    start(S, p, a) {
      if (p.carry) return false;
      const plan = craftPlan(S, p);
      if (!plan) return false;
      a.make = plan.k; a.shop = plan.b ? plan.b.id : 0;
      return !!toCamp(S, p);
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        // pega o material (volta ao estoque se largar no meio); na oficina, leva para até 3 peças de uma vez
        const cost = craftCost(a.make);
        let n = a.shop ? 3 : 1;
        for (const k in cost) n = Math.min(n, Math.floor((S.stock[k] || 0) / cost[k]));
        if (n <= 0) return FAIL;
        const back = {};
        for (const k in cost) { S.stock[k] -= cost[k] * n; back[k] = cost[k] * n; }
        p.carry = { k: 'oficio', n: 0, back };
        a.pieces = n; a.t = 0;
        if (a.shop) {
          const b = Sim.building(S, a.shop);
          if (!b || !b.built || !toBuilding(S, p, b)) return FAIL;
          a.stage = 'walk';
          return RUN;
        }
        a.stage = 'work'; p.dir = 0;
        say(S, p, 'oficio', 0.3);
      }
      if (a.stage === 'walk') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const b = Sim.building(S, a.shop);
        if (b) face(p, b.x + b.w / 2, b.y + b.h / 2);
        a.stage = 'work'; a.t = 0;
        say(S, p, a.make === 'tabuas' ? 'marcenaria' : a.make === 'ferro' ? 'forja' : a.make === 'joias' || a.make === 'joiasOuro' ? 'ourives' : 'tear', 0.4);
      }
      const b = a.shop ? Sim.building(S, a.shop) : null;
      if (a.shop && (!b || !b.built)) return FAIL;
      a.t += dt * workSpeed(p, 'oficio', 'oficio') * (p.sangue && G.Povos && G.Minas && G.Minas.isForge(a.make) ? G.Povos.speed(S, p, 'forja') : 1);   // o ferreiro nato (Etapa 12)
      p.skills.oficio += dt / 60 * Fam.xpFactor(S, p);
      const need = G.Obras ? G.Obras.minutesOf(S, a.make, b) : C.OFICIO_MIN * (a.make === 'roupas' ? 1.5 : 1);
      if (a.t < need) return RUN;
      // uma peça pronta
      a.t = 0;
      const cost = craftCost(a.make);
      for (const k in cost) p.carry.back[k] -= cost[k];
      if (G.Obras) G.Obras.make(S, a.make, 1); else Tech.make(S, a.make, 1);
      if (b) Sim.float(S, b.x + b.w / 2, b.y, '+1 ' + PIECE[a.make]);
      else Sim.float(S, S.camp.x + 1, S.camp.y + 0.6, '+1 ' + PIECE[a.make]);
      a.done = (a.done || 0) + 1;
      if (--a.pieces > 0) return RUN;
      p.carry = null;
      // no acampamento, se ainda falta e dá, emenda a próxima peça (até 3 por vez)
      if (!a.shop) {
        const next = craftPlan(S, p);
        if (next && !next.b && a.done < 3) { a.make = next.k; a.stage = 'go'; return RUN; }
      }
      return DONE;
    },
    end(S, p) { if (p.carry && p.carry.k === 'oficio') giveBack(S, p); },
  };

  // caminhos (Etapa 7): abre o caminho marcado, passo a passo; o de pedra leva pedra do estoque
  function nextRoad(S, p, a, far) {
    const w = S.world, stones = p.carry && p.carry.k === 'caminho' ? p.carry.n : 0;
    const test = (i) => (w.roadJob[i] && (w.roadJob[i] < 3 || stones > 0) ? 1 : 0);
    const r = W.findNearest(w, tileOf(S, p), test, far || 14);
    if (!r) return false;
    a.i = r.idx;
    if (r.path.length) setPath(p, r.path); else p.path = null;
    a.stage = 'go';
    return true;
  }
  ACT.caminho = {
    start(S, p, a) {
      if (p.carry) return false;
      const Ob = G.Obras, w = S.world;
      if (!Ob || !Ob.roadNeed(S)) return false;
      const stone = S.stock.pedra > 0;
      const r = W.findNearest(w, tileOf(S, p), (i) => (w.roadJob[i] && (w.roadJob[i] < 3 || stone) ? 1 : 0), C.SEARCH_FAR);
      if (!r) { S.obras.blockedUntil = S.t + 12 * 60; return false; }   // nada ao alcance: ninguém tenta por meio dia
      if (w.roadJob[r.idx] >= 3) {
        // de pedra: passa no estoque e leva o que dá
        const want = S.obras.jobs.filter((j) => j.lv >= 3).length;
        a.stones = Math.max(1, Math.min(Fam.carryCap(S, p), S.stock.pedra, want));
        if (!toCamp(S, p)) return false;
        a.stage = 'fetch';
        return true;
      }
      a.i = r.idx;
      if (r.path.length) setPath(p, r.path);
      a.stage = 'go';
      return true;
    },
    run(S, p, a, dt) {
      const Ob = G.Obras;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const n = Math.min(a.stones, S.stock.pedra);
        if (n <= 0) return FAIL;
        S.stock.pedra -= n;
        p.carry = { k: 'caminho', n, back: { pedra: n } };
        return nextRoad(S, p, a, C.SEARCH_FAR) ? RUN : FAIL;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'work';
        say(S, p, 'caminho', 0.2);
      }
      const j = Ob.jobAt(S, a.i);
      if (!j) return nextRoad(S, p, a) ? RUN : DONE;
      if (j.lv >= 3 && !(p.carry && p.carry.k === 'caminho' && p.carry.n > 0)) return DONE;   // acabou a pedra
      j.prog = (j.prog || 0) + dt * workSpeed(p, 'construcao', 'construir') / C.ROAD_WORK[j.lv];
      p.skills.construcao += dt / 60 * Fam.xpFactor(S, p) * 0.5;
      a.worked = (a.worked || 0) + dt;
      if (j.prog < 1) return RUN;
      if (j.lv >= 3) { p.carry.n--; p.carry.back.pedra--; if (p.carry.n <= 0) p.carry = null; }
      Ob.finishRoad(S, j);
      if (a.worked > 180) return DONE;   // três horas de caminho por vez
      return nextRoad(S, p, a) ? RUN : DONE;
    },
    end(S, p) { if (p.carry && p.carry.k === 'caminho') giveBack(S, p); },
  };

  // conservar (defumar e secar): leva peixe ou carne ao moquém, fruta ao jirau, e arma a carga
  ACT.conservar = {
    start(S, p, a) {
      if (p.carry) return false;
      const plan = Tech.conservePlan(S);
      if (!plan) return false;
      a.b = plan.b.id; a.k = plan.k; a.n = plan.n; a.wood = plan.wood;
      if (!toCamp(S, p)) return false;
      plan.b.loading = p.id;   // ninguém mais vai para esta obra
      a.stage = 'fetch';
      return true;
    },
    run(S, p, a, dt) {
      const b = Sim.building(S, a.b);
      if (!b || !b.built || b.batch) return FAIL;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const n = Math.min(a.n, Math.round(Fam.carryCap(S, p) * 1.2), S.stock[a.k]), wood = Math.min(a.wood, S.stock.madeira);
        if (n < 3 || wood < a.wood) return FAIL;
        S.stock[a.k] -= n; S.stock.madeira -= wood;
        const back = {}; back[a.k] = n; if (wood) back.madeira = wood;
        p.carry = { k: a.k, n, back };
        a.n = n;
        if (!toBuilding(S, p, b)) return FAIL;
        a.stage = 'go';
        say(S, p, 'conservar', 0.3);
        return RUN;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'load'; a.t = 0; face(p, b.x, b.y);
      }
      a.t += dt;
      if (a.t < 20) return RUN;
      p.carry = null;
      Tech.load(S, b, a.k, a.n);
      return DONE;
    },
    end(S, p, a) {
      const b = Sim.building(S, a.b);
      if (b && b.loading === p.id) b.loading = 0;
      if (p.carry && p.carry.back) giveBack(S, p);
    },
  };

  // ---------- Etapa 10: roça, criação e cercas ----------
  // para dentro da obra (a roça e o curral se trabalham por dentro)
  function toInside(S, p, b) {
    const w = S.world;
    return route(S, p, (i) => { const x = i % w.W, y = (i / w.W) | 0; return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h ? 1 : 0; }, 180, true);
  }
  const ROCA_MIN = { plant: 'ROCA_PLANT_MIN', weed: 'ROCA_WEED_MIN', harvest: 'ROCA_HARVEST_MIN' };
  // o que cabe no cesto na volta da roça (colheita vai em cesto e em saco: o dobro)
  const rocaCap = (S, p) => Fam.carryCap(S, p) * 2;
  // a tarefa ainda faz sentido quando a pessoa chega?
  function rocaStill(S, b, task, k) {
    const Ca = G.Campo, f = Ca.farmOf(b);
    if (task === 'plant') return f.st === 'vazia' && !Ca.plantWhy(S, k);
    if (task === 'weed') return f.st === 'crescendo' && !!f.mato && !f.weeded;
    if (task === 'harvest') return f.st === 'madura';
    return f.pile > 0;
  }
  ACT.roca = {
    start(S, p, a) {
      if (p.carry || !G.Campo) return false;
      const plan = G.Campo.rocaPlan(S, p);
      if (!plan) return false;
      a.b = plan.b.id; a.task = plan.kind; a.k = plan.k;
      if (!toInside(S, p, plan.b)) return false;
      if (a.task !== 'haul') G.Campo.reserve(S, plan.b, p);   // levar a colheita não reserva: vários levam juntos
      a.stage = 'go';
      return true;
    },
    run(S, p, a, dt) {
      const Ca = G.Campo, b = Sim.building(S, a.b);
      if (!b || !b.built) return FAIL;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        if (!rocaStill(S, b, a.task, a.k)) return DONE;   // outro fez antes: pensa de novo
        face(p, b.x + 1, b.y + 1);
        if (a.task === 'haul') { a.stage = 'load'; }
        else {
          a.stage = a.task; a.t = Ca.resume(b, a.task, a.k);
          say(S, p, a.task === 'weed' ? 'capina' : a.task === 'harvest' ? 'colher' : 'roca', 0.3);
        }
      }
      if (a.stage === 'plant' || a.stage === 'weed' || a.stage === 'harvest') {
        if (!rocaStill(S, b, a.stage, a.k)) { a.t = 0; return DONE; }
        a.t += dt * workSpeed(p, 'plantio', 'roca');
        p.skills.plantio = (p.skills.plantio || 0) + dt / 60 * Fam.xpFactor(S, p);
        if (a.t < C[ROCA_MIN[a.stage]]) return RUN;
        a.t = 0;
        if (a.stage === 'plant') { Ca.plant(S, b, a.k, p); return DONE; }
        if (a.stage === 'weed') { Ca.weed(S, b); return DONE; }
        Ca.harvest(S, b, p);
        Ca.release(S, b.id, p, null);   // colhida: a roça fica livre para o próximo plantio enquanto a colheita vai ao estoque
        a.stage = 'load';
      }
      if (a.stage === 'load') {
        const got = Ca.takePile(S, b, rocaCap(S, p));
        if (!got) return DONE;
        p.carry = { k: got.k, n: got.n };
        a.stage = 'haul';
        return toCamp(S, p) ? RUN : FAIL;
      }
      if (a.stage === 'haul') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        deposit(S, p);
        return DONE;
      }
      return RUN;
    },
    end(S, p, a) { if (G.Campo) G.Campo.release(S, a.b, p, a); },
  };

  // criação: recolhe ovos, leite e lã; leva ração no frio; abate quando o curral enche
  const CRIA_MIN = { collect: 'COLLECT_MIN', feed: 'FEED_MIN', slaughter: 'ABATE_MIN' };
  ACT.criacao = {
    start(S, p, a) {
      if (p.carry || !G.Campo) return false;
      const Ca = G.Campo, plan = Ca.criaPlan(S, p);
      if (!plan) return false;
      a.b = plan.b.id; a.task = plan.kind;
      if (a.task === 'feed') {
        a.want = Math.max(1, Math.min(rocaCap(S, p), plan.n, Ca.racao(S)));
        if (!toCamp(S, p)) return false;
        a.stage = 'fetch';
      } else {
        if (!toInside(S, p, plan.b)) return false;
        a.stage = 'go';
      }
      Ca.reserve(S, plan.b, p);
      return true;
    },
    run(S, p, a, dt) {
      const Ca = G.Campo, b = Sim.building(S, a.b);
      if (!b || !b.built) return FAIL;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const got = Ca.takeFeed(S, a.want);
        if (!got.n) return FAIL;
        p.carry = { k: 'racao', n: got.n, back: got.back };
        if (!toInside(S, p, b)) return FAIL;
        a.stage = 'go';
        return RUN;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'tend'; a.t = 0;
        face(p, b.x + 1, b.y + 1);
        say(S, p, 'criacao', 0.3);
      }
      if (a.stage === 'tend') {
        a.t += dt * workSpeed(p, 'criacao', 'criacao');
        p.skills.criacao = (p.skills.criacao || 0) + dt / 60 * Fam.xpFactor(S, p);
        if (a.t < C[CRIA_MIN[a.task]]) return RUN;
        if (a.task === 'feed') {
          if (p.carry && p.carry.k === 'racao') { Ca.feedPen(S, b, p.carry.n); p.carry = null; }
          return DONE;
        }
        const got = a.task === 'collect' ? Ca.collect(S, b, Fam.carryCap(S, p)) : Ca.slaughter(S, b, p);
        if (!got) return DONE;
        p.carry = got;
        a.stage = 'haul';
        return toCamp(S, p) ? RUN : FAIL;
      }
      if (a.stage === 'haul') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        deposit(S, p);
        return DONE;
      }
      return RUN;
    },
    end(S, p, a) {
      if (G.Campo) G.Campo.release(S, a.b, p);
      if (p.carry && p.carry.k === 'racao') giveBack(S, p);
    },
  };

  // cercas: finca a cerca marcada, passo a passo; cada passo leva uma vara de madeira do estoque
  function nextFence(S, p, a, far) {
    const w = S.world;
    if (!(p.carry && p.carry.k === 'cerca' && p.carry.n > 0)) return false;
    const r = W.findNearest(w, tileOf(S, p), (i) => (w.fenceJob[i] ? 1 : 0), far || 14);
    if (!r) return false;
    a.i = r.idx;
    if (r.path.length) setPath(p, r.path); else p.path = null;
    a.stage = 'go';
    return true;
  }
  ACT.cerca = {
    start(S, p, a) {
      if (p.carry) return false;
      const Ca = G.Campo, w = S.world;
      if (!Ca || !Ca.fenceNeed(S)) return false;
      const r = W.findNearest(w, tileOf(S, p), (i) => (w.fenceJob[i] ? 1 : 0), C.SEARCH_FAR);
      if (!r) { S.campo.blockedUntil = S.t + 12 * 60; return false; }   // nada ao alcance: ninguém tenta por meio dia
      a.wood = Math.max(1, Math.min(Fam.carryCap(S, p), S.stock.madeira, S.campo.fjobs.length * C.CERCA_WOOD));
      if (!toCamp(S, p)) return false;
      a.stage = 'fetch';
      return true;
    },
    run(S, p, a, dt) {
      const Ca = G.Campo;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const n = Math.min(a.wood, S.stock.madeira);
        if (n <= 0) return FAIL;
        S.stock.madeira -= n;
        p.carry = { k: 'cerca', n, back: { madeira: n } };
        return nextFence(S, p, a, C.SEARCH_FAR) ? RUN : FAIL;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'work';
        faceIdx(S, p, a.i);
        say(S, p, 'cerca', 0.2);
      }
      const j = Ca.fenceJobAt(S, a.i);
      if (!j) return nextFence(S, p, a) ? RUN : DONE;
      if (!(p.carry && p.carry.k === 'cerca' && p.carry.n > 0)) return DONE;
      j.prog = (j.prog || 0) + dt * workSpeed(p, 'construcao', 'construir') / C.CERCA_WORK;
      p.skills.construcao += dt / 60 * Fam.xpFactor(S, p) * 0.5;
      a.worked = (a.worked || 0) + dt;
      if (j.prog < 1) return RUN;
      p.carry.n -= C.CERCA_WOOD; p.carry.back.madeira -= C.CERCA_WOOD;
      if (p.carry.n <= 0) p.carry = null;
      Ca.finishFence(S, j);
      if (a.worked > 180) return DONE;   // três horas de cerca por vez
      return nextFence(S, p, a) ? RUN : DONE;
    },
    end(S, p) { if (p.carry && p.carry.k === 'cerca') giveBack(S, p); },
  };

  // ---------- notas ----------
  // com quem conversar: o mais perto; quem está bem procura primeiro quem está de luto (consolo).
  // Brigados se evitam até a raiva passar. Na lua cheia a conversa vai até as 23 h.
  function chatPartner(S, p) {
    const Li = G.Life;
    const late = S.ctx.night && !(Li && Li.moonUp(S) && S.ck.hour < 23 && S.ck.hour >= 18);
    if (late || p.chatCool > S.t) return null;
    const comfort = !!Li && p.mood >= 45 && Fam.age(S, p) >= 12 && !Li.grieving(S, p);
    let best = null, bd = 8, griever = null, gd = 14;
    for (const q of S.people) {
      if (q === p || !q.alive || q.carriedBy || q.labor || q.sleeping || q.inTent || q.chatCool > S.t) continue;
      if (Li && Li.avoid(S, p, q)) continue;
      const qa = q.act;
      if (qa && !(WORK_SET.has(qa.type) || qa.type === 'vagar')) continue;
      if (q.needs.sede < 30 || q.needs.fome < 25 || q.needs.calor < 30) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (comfort && d < gd && Li.grieving(S, q) && !Li.consoled(S, q)) { gd = d; griever = q; }
      if (d < bd) { bd = d; best = q; }
    }
    if (griever) return { q: griever, hint: 'consolo' };
    if (p.needs.social > 78 || !best) return null;
    return { q: best };
  }
  const fineNow = (p) => p.needs.fome >= 30 && p.needs.sede >= 30 && p.needs.energia >= 20 && p.needs.calor >= 30;
  function foodFactor(S) {
    const d = S.ctx.foodDays;
    if (d > 60) return 0.2;
    if (d > 40) return 0.5;
    return (1 + 0.5 * U.clamp((4 - d) / 4, 0, 1)) * (d < 1 ? 1.6 : 1);
  }
  function campNeed(S, wk, p) {
    const st = S.stock, ctx = S.ctx;
    switch (wk) {
      case 'frutas': return ctx.bushFruit > 0 ? foodFactor(S) * Math.min(1, ctx.bushFruit / 12) : 0;
      case 'pesca': return foodFactor(S) * 0.95;
      case 'agua': return st.agua >= Tech.waterCap(S) - 2 ? 0 : st.agua < 8 ? 1.3 : 1;
      case 'caca': {
        // capivara: couro para quem está sem roupa, e carne quando a comida aperta
        if (!G.Fauna.alive(S).length) return 0;
        const gap = Tech.needClothes(S) - st.roupas - Math.floor(st.couro / C.ROUPA_COST.couro);
        return Math.max(gap > 0 ? 1.3 : 0, foodFactor(S) * 0.7);
      }
      case 'argila': {
        if (ctx.matShort.argila > 0) return 2.0;
        const forno = S.buildings.some((b) => b.type === 'forno');
        return !forno && st.argila < C.BUILD.forno.cost.argila ? 0.8 : 0;
      }
      case 'oficio': { const plan = G.Obras ? G.Obras.oficioPlan(S, p) : Tech.oficioPlan(S); return plan ? (plan.gap >= 3 || plan.pri >= 4 ? 1.5 : 1.1) : 0; }
      case 'caminho': return G.Obras && G.Obras.roadNeed(S) ? 0.95 : 0;
      case 'conservar': {
        const plan = Tech.conservePlan(S);
        if (!plan) return 0;
        // verão e outono: é a hora de guardar para o inverno; com muito guardado, sem pressa
        const kept = Tech.keptDays(S) >= C.CONSERVA_DAYS[0] ? 0.5 : 1;
        return (S.ck.season === 1 || S.ck.season === 2 ? 1.5 : 1.1) * (plan.n >= 8 ? 1.1 : 0.9) * kept;
      }
      case 'madeira': {
        if (ctx.matShort.madeira > 0) return 2.2;
        let f = st.madeira < 10 ? 1.35 : st.madeira > 200 ? 0.15 : st.madeira > 100 ? 0.45 : 1;
        // Etapa 7: a fibra vem da embira das árvores cortadas (obra pedindo fibra, ou a tecelagem sem fibra)
        const Ob = G.Obras;
        if (Ob && Ob.embira(S) && (ctx.matShort.fibra > 0 || (Ob.shopOf(S, 'tecido') && st.fibra < C.REDE_FIBRA * 2 && (Ob.needMantas(S) > 0 || Ob.needRedes(S) > 0)))) f = Math.max(f, 1.4);
        // lenha para o frio: com fogueira e tempo frio, pouca lenha vira prioridade
        if (ctx.fire && (S.ck.season >= 2 || S.temp < 14)) {
          const days = st.madeira / 6;
          if (days < 5) f = Math.max(f, 1 + 0.9 * (5 - days) / 5);
        }
        return f;
      }
      case 'pedra': {
        if (ctx.matShort.pedra > 0) return 2.2;
        // ferramenta faltando e nenhuma pedra para lascar: buscar pedra vira prioridade
        if (st.pedra < 3 && Tech.known(S, 'pedra') && Tech.toolTarget(S) > st.ferramentas) return 1.8;
        return st.pedra > 40 ? 0.15 : st.pedra > 20 ? 0.5 : 1;
      }
      case 'construir': return ctx.jobDoable ? 1.35 : 0;
      case 'fogo': return ctx.fireNeedsFuel ? 1.6 : 0;
      // Etapa 10: colheita madura não espera (passa do ponto); plantar na primavera rende o ano
      case 'roca': {
        const plan = G.Campo ? G.Campo.rocaPlan(S, null) : null;
        if (!plan) return 0;
        return plan.kind === 'harvest' ? 1.7 : plan.kind === 'haul' ? 1.4 : plan.kind === 'weed' ? 1.25 : S.ck.season === 0 ? 1.3 : 1.1;
      }
      case 'criacao': {
        const plan = G.Campo ? G.Campo.criaPlan(S, null) : null;
        if (!plan) return 0;
        return plan.kind === 'feed' ? (plan.pri >= 3 ? 2 : 1.5) : plan.kind === 'collect' ? (plan.pri > 2 ? 1.35 : 1.15) : 1.1;
      }
      case 'cerca': return G.Campo && G.Campo.fenceNeed(S) ? 0.95 : 0;
      case 'mina': return G.Minas ? G.Minas.want(S) : 0;   // Etapa 12
    }
    return 1;
  }

  function scoreList(S, p) {
    const n = p.needs, ctx = S.ctx, out = [];
    const add = (type, s, extra) => {
      if (!(s > 0)) return;
      if (p.fail[type] && p.fail[type] > S.t) return;
      const o = { type, score: s + (S.rng.next() * 4 - 2) };
      if (extra) Object.assign(o, extra);
      out.push(o);
    };
    const crit = (v) => (v < C.CRITICAL ? C.CRITICAL_BONUS : 0);
    const dinner = ctx.hour >= 18 && ctx.hour < 22;
    if (p.carry) add('depositar', 44);
    // quase cheio não come nem bebe (senão o sorteio de ±2 fazia começar e largar na hora)
    if (n.sede < 85) add('beber', urg(n.sede) * 110 + crit(n.sede) + (dinner && n.sede < 70 ? C.EVENING_BONUS : 0));
    if ((ctx.food > 0 || ctx.bushFruit > 0) && n.fome < 85) add('comer', urg(n.fome) * 100 + crit(n.fome) + (dinner && n.fome < 70 ? C.EVENING_BONUS : 0));
    const st = Fam.stage(S, p);
    let sd = urg(n.energia) * 100 + (ctx.night ? 38 : 0) + (ctx.evening ? (st === 'crianca' ? 30 : 10) : 0) + (n.energia < 8 ? C.CRITICAL_BONUS : 0);
    if (!ctx.night && n.energia > 35) sd -= 25;
    add('dormir', sd);
    const heat = ctx.fireLit || ctx.tents > 0 || (S.god && S.god.auras.length > 0) || (G.Deus && S.god && S.god.pending && G.Deus.lights(S).some((L) => L.bid));
    const cal = feltCold(S, p);
    if (p.tempHere < C.COMFORT && heat && cal < 85) add('aquecer', urg(cal) * 115 + crit(cal));
    const cp = chatPartner(S, p);
    if (cp) add('conversar', cp.hint === 'consolo' ? 40 + urg(n.social) * 30 : urg(n.social) * 70 + 12, cp);
    // Etapa 6: festa, história ao pé do fogo
    const life = S.life;
    if (life && st !== 'bebe' && fineNow(p)) {
      if (life.party && life.party.on) add('festa', 70 + urg(n.social) * 20 + (st === 'crianca' || st === 'jovem' ? 6 : 0));
      if (life.story && life.story.teller !== p.id) {
        // par e filhos de quem conta vêm com mais vontade
        const t = person(S, life.story.teller), close = t && (Fam.isPartner(p, t) || p.mother === t.id || p.father === t.id);
        const holy = life.story.sermon && p.fe >= 60 ? 8 : 0;   // quem tem fé vem ouvir a pregação com mais vontade
        if (G.Life.canListen(S, p, life.story)) add('ouvir', 44 + urg(n.social) * 30 + (st === 'crianca' || st === 'jovem' ? 18 : 0) + (close ? 10 : 0) + holy);
      }
      else if (!life.story && G.Life.canTell(S, p)) {
        // o profeta prega (Etapa 11), se der tempo de chegar ao fogo (anda-se 8 minutos por passo)
        const f = G.Deus && G.Deus.sermonDue(S, p) ? G.Life.campFire(S, true) : null;
        if (f && Math.hypot(f.x + 0.5 - p.x, f.y + 0.5 - p.y) < C.SERMAO_LONGE) add('historia', G.Life.tellScore(S, p) + 20, { hint: 'sermao' });
        else add('historia', G.Life.tellScore(S, p));
      }
    }
    // Etapa 11: o escolhido que cura vai até quem precisa; de manhã, quem tem fé reza ao pé da estátua
    if (G.Deus && S.god && S.god.pending && st !== 'bebe') {
      if (p.escolhido && p.escolhido.power === 'cura') {
        const t = G.Deus.healTarget(S, p);
        if (t) add('curar', t.labor ? 110 : t.needs.saude < 20 ? 100 : 86, { q: t });   // acima de qualquer trabalho
      }
      const pr = G.Deus.wantPray(S, p);
      if (pr > 0) add('rezar', pr);
    }
    for (const wk of WORK) {
      const v = S.vontades[VONT[wk] || wk] | 0;
      if (!v || !Fam.canWork(S, p, wk) || !Tech.workOpen(S, wk)) continue;
      if (wk === 'fogo' && othersDoing(S, p, 'fogo')) continue;
      if (wk === 'caca' && !Tech.hasTool(S, p) && S.stock.ferramentas <= 0 && !(S.stock.ferro > 0)) continue;   // sem lança não se caça
      const vw = Math.pow(C.VONTADE_W[v], G.God.obedience(S, p));
      let s = C.WORK_BASE * vw * campNeed(S, wk, p);
      if (!(s > 0)) continue;
      if (has(p, 'Trabalhador')) s *= 1.15;
      if (has(p, 'Preguiçoso')) s *= 0.85;
      const sk = SKILL_OF[wk];
      if (sk) s *= 1 + 0.03 * lvl(p, sk);
      if (wk !== 'construir' && wk !== 'fogo' && othersDoing(S, p, wk)) s *= 0.8;
      const noite = p.sangue && G.Povos && G.Povos.has(p, 'noite');   // Etapa 12: os olhos da noite do povo-fera
      if (ctx.night && wk !== 'fogo') s *= noite ? C.DOM_NOITE : 0.45;
      else if (ctx.hour >= 17.5 && wk !== 'fogo' && !noite) s *= 0.75;   // de tardinha o trabalho afrouxa (é hora de história e de festa)
      s *= G.Narr.workMult(S, wk);   // nevasca, tempestade e lobos seguram o povo em casa
      add(wk, Math.min(C.WORK_CAP, s));
    }
    if (st === 'crianca') add('brincar', ctx.night ? 0 : 22 + urg(n.social) * 25);
    else add('vagar', has(p, 'Preguiçoso') ? 14 : 7);
    out.sort((a, b) => b.score - a.score);
    return out;
  }
  AI.scoreList = scoreList;

  // ---------- ciclo ----------
  function end(S, p, r) {
    const a = p.act; if (!a) return;
    p.act = null;
    const def = ACT[a.type];
    if (def && def.end) def.end(S, p, a, r);
    if (r === DONE && WORK_SET.has(a.type)) p.lastWork = a.type;   // para o "o que você fez hoje?"
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    p.path = null; p.stuck = false;
    if (r === FAIL) p.fail[a.type] = S.t + 30;
  }
  AI.abort = function (S, p) { end(S, p, 0); };

  AI.decide = function (S, p) {
    const list = scoreList(S, p);
    for (const c of list) {
      const a = { type: c.type, score: c.score, stage: 'go', t: 0 };
      if (c.q) a.q = c.q.id;
      if (c.hint) a.hint = c.hint;
      p.stuck = false;
      if (ACT[c.type].start(S, p, a)) { p.act = a; p.nextEval = S.t + C.REEVAL_MIN; return a; }
      if (a.obj && a.obj.res === p.id) a.obj.res = 0;
      p.fail[c.type] = S.t + 45;
      p.path = null;
    }
    return null;
  };

  // tenta só um tipo de ação (usado nas urgências)
  AI.decideType = function (S, p, type) {
    if (p.fail[type] && p.fail[type] > S.t) return null;
    const a = { type, score: 99, stage: 'go', t: 0 };
    p.stuck = false;
    if (ACT[type].start(S, p, a)) { p.act = a; p.nextEval = S.t + C.REEVAL_MIN; return a; }
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    p.fail[type] = S.t + 45; p.path = null;
    return null;
  };

  function urgentNeed(S, p, a) {
    if (p.urgentCool > S.t || p.sleeping || a.type === 'chegar' || a.type === 'parto') return null;
    const n = p.needs, ctx = S.ctx;
    // lobo por perto e longe do fogo: corre antes de tudo
    if (a.type !== 'fugir' && a.type !== 'defender' && G.Narr.threat(S, p)) return 'fugir';
    if (a.type === 'fugir') {
      // escondido: só sai para beber ou comer do estoque, e só se o estoque estiver na luz do fogo
      if (!G.Narr.safeXY(S, S.camp.x + 1, S.camp.y + 1)) return null;
      if (n.sede < 12 && S.stock.agua > 0) return 'beber';
      if (n.fome < 10 && ctx.food > 0) return 'comer';
      return null;
    }
    if (n.sede < 12 && a.type !== 'beber') return 'beber';
    if (n.fome < 10 && a.type !== 'comer' && (ctx.food > 0 || ctx.bushFruit > 0)) return 'comer';
    const cal = feltCold(S, p);
    // indo dormir junto do fogo já é se aquecer; alimentar o fogo também
    if (cal < 15 && p.tempHere < C.COMFORT && a.type !== 'aquecer' && a.type !== 'fogo' && !(a.type === 'dormir' && a.byFire)) {
      // o fogo está morrendo e ninguém foi cuidar dele: quem sente frio vai reacender (é o que aquece todo mundo).
      // Sem isso, na nevasca todos corriam para o fogo que se apagava e ninguém buscava lenha.
      if (ctx.fireNeedsFuel && S.stock.madeira > 0 && (S.vontades.fogo | 0) > 0 && Fam.canWork(S, p, 'fogo') && !othersDoing(S, p, 'fogo')) return 'fogo';
      if (ctx.fireLit || ctx.tents > 0 || (S.god && S.god.auras.length > 0) || (G.Deus && S.god && S.god.pending && G.Deus.lights(S).some((L) => L.bid))) return 'aquecer';
    }
    // quem está gelando termina de se aquecer antes de ir dormir (senão alterna entre os dois e congela)
    if (n.energia < 8 && a.type !== 'dormir' && a.type !== 'fogo' && !(a.type === 'aquecer' && cal < C.SLEEP_BY_FIRE)) return 'dormir';
    return null;
  }

  AI.tick = function (S, p, dt) {
    curS = S;
    if (p.labor && (!p.act || p.act.type !== 'parto')) {
      if (p.act) end(S, p, 0);
      const a = { type: 'parto', score: 999, stage: 'go', t: 0 };
      p.sleeping = false;
      ACT.parto.start(S, p, a); p.act = a;
    }
    if (!p.act) AI.decide(S, p);
    const a = p.act;
    if (!a) return;
    move(S, p, dt);
    const r = ACT[a.type].run(S, p, a, dt);
    Tech.onWork(S, p, a, dt);   // prática para as descobertas e desgaste da ferramenta
    if (r !== RUN) { end(S, p, r); AI.decide(S, p); return; }
    const need = urgentNeed(S, p, a);
    if (need && (need === 'fugir' || (a.type !== 'beber' && a.type !== 'comer'))) {
      end(S, p, 0);
      if (!AI.decideType(S, p, need)) { p.urgentCool = S.t + 30; AI.decide(S, p); }
      return;
    }
    if (S.t >= p.nextEval) {
      p.nextEval = S.t + C.REEVAL_MIN;
      if (REEVAL.has(a.type)) {
        const list = scoreList(S, p);
        const best = list[0];
        if (best && best.type !== a.type) {
          const cur = list.find((c) => c.type === a.type);
          const cs = cur ? cur.score : 0;
          // festa e história chamam: basta valer um pouco mais que o que está fazendo
          // o profeta larga o trabalho para pregar, e quem cura, para curar (Etapa 11)
          const call = (best.type === 'festa' || best.type === 'ouvir' || best.type === 'curar' || (best.type === 'historia' && best.hint === 'sermao')) && best.score > cs + 5;
          if (call || best.score > cs * 1.3 + 10) { end(S, p, 0); AI.decide(S, p); }
        }
      }
    }
  };

  AI.forceSleepHere = function (S, p) {
    p.act = { type: 'dormir', stage: 'sleep', t: 0, score: 99, faint: true };
    p.sleeping = true; p.path = null;
    if (!p.faintAt || S.t - p.faintAt > C.DAY_MIN) Sim.toast(S, p.name + ' desmaiou de cansaço.', 'warn');
    p.faintAt = S.t;
  };
  AI.startGreve = function (S, p) {
    const a = { type: 'greve', stage: 'go', t: 0, score: 99 };
    ACT.greve.start(S, p, a);
    p.act = a;
    say(S, p, 'greve', 1, true);
  };
  AI.touch = function (S, p) {
    if (!p.alive || p.sleeping || p.inTent) return;
    if (!p.touched || S.rng.next() < 0.2) { say(S, p, 'deus', 1, true); p.touched = true; }
  };

  const DISH = { leite: 'Tomando leite', ovos: 'Comendo ovos cozidos', feijao: 'Comendo feijão', milho: 'Comendo milho', abobora: 'Comendo abóbora', mandioca: 'Comendo mandioca' };
  const DOING = {
    madeira: ['Indo cortar madeira', 'Cortando uma árvore', 'Levando madeira'],
    pedra: ['Indo atrás de pedra', 'Quebrando pedra', 'Levando pedra'],
    frutas: ['Indo colher frutas', 'Colhendo frutas', 'Levando frutas'],
    agua: ['Indo buscar água', 'Enchendo as cabaças', 'Levando água'],
    pesca: ['Indo pescar', 'Pescando', 'Levando peixe'],
    argila: ['Indo buscar argila', 'Cavando barro na beira d\'água', 'Levando argila'],
  };
  AI.describe = function (S, p) {
    if (!p.alive) { const o = p.sex === 'F' ? 'a' : 'o'; return 'Morreu ' + ({ frio: 'de frio', sede: 'de sede', fome: 'de fome', raio: 'atingid' + o + ' por um raio', parto: 'no parto', velhice: 'de velhice', lobos: 'no ataque dos lobos',
      onca: 'no ataque da onça', jacare: 'no ataque de um jacaré', bicho: 'atacad' + o + ' por um bicho' }[p.cause] || ''); }
    if (p.carriedBy) { const c = person(S, p.carriedBy); return c ? (c.sleeping ? 'Dormindo no colo de ' : 'No colo de ') + c.name : 'Sozinho'; }
    const a = p.act;
    if (!a) return 'Pensando no que fazer';
    const st = a.stage;
    switch (a.type) {
      case 'chegar': return 'Chegando ao novo lar';
      case 'depositar': return 'Guardando no estoque';
      case 'beber': return st === 'go' ? 'Indo beber água' : 'Bebendo água';
      case 'comer': return st === 'go' ? 'Indo comer' : a.src === 'arbusto' ? 'Comendo frutas no pé' : a.hot === 'carne' ? 'Comendo carne assada' : a.hot ? 'Comendo peixe assado' :
        a.kept === 'defumado' ? 'Comendo defumado' : a.kept === 'seca' ? 'Comendo fruta seca' : a.dish ? DISH[a.dish] || 'Comendo' : 'Comendo';
      case 'caca': { const e = G.Fauna.get(S, a.prey), nm = e ? C.BICHOS[e.sp || 'capivara'].name.toLowerCase() : 'bicho', um = e ? C.BICHOS[e.sp || 'capivara'].art : 'um bicho';
        return st === 'aim' ? 'Mirando ' + um : st === 'cut' ? 'Carneando ' + um : st === 'haul' ? 'Levando carne' + (p.carry && p.carry.couro ? ' e couro' : '') : 'Caçando (' + nm + ')'; }
      case 'defender': return st === 'aim' ? 'Enfrentando ' + (G.Bichos ? G.Bichos.theOf(S, a.tgt) : 'o bicho') : st === 'wait' ? 'Esperando os outros perto da toca' : a.tgt && a.tgt.hunt ? 'Atrás da onça, na mata' : 'Correndo para ajudar';
      case 'oficio': {
        const doing = { roupas: 'Costurando roupa de couro', ferramentas: 'Lascando ferramentas', tabuas: 'Serrando tábuas na marcenaria', mantas: 'Tecendo uma manta', redes: 'Tecendo uma rede' }[a.make] || 'No ofício';
        const going = { roupas: 'roupas', ferramentas: 'ferramentas', tabuas: 'tábuas', mantas: 'uma manta', redes: 'uma rede' }[a.make] || 'o ofício';
        return st === 'work' ? doing : 'Indo fazer ' + going;
      }
      case 'caminho': return st === 'work' ? 'Abrindo caminho' : st === 'fetch' ? 'Pegando pedra para o caminho' : 'Indo abrir caminho';
      case 'roca': {
        const b = Sim.building(S, a.b), f = b && b.farm, nm = (k) => (C.ROCA[k] ? C.ROCA[k].name.toLowerCase() : 'a roça');
        if (st === 'plant') return 'Plantando ' + nm(a.k);
        if (st === 'weed') return 'Capinando a roça' + (f && f.k ? ' de ' + nm(f.k) : '');
        if (st === 'harvest') return 'Colhendo ' + (f && f.k ? nm(f.k) : 'a roça');
        if (st === 'haul') return 'Levando ' + (p.carry ? RES_LABEL[p.carry.k] || p.carry.k : 'a colheita') + ' para o estoque';
        return { plant: 'Indo plantar ' + nm(a.k), weed: 'Indo capinar a roça', harvest: 'Indo colher a roça', haul: 'Indo buscar a colheita' }[a.task] || 'Indo para a roça';
      }
      case 'criacao': {
        if (st === 'fetch') return 'Pegando ração para os bichos';
        if (st === 'haul') return p.carry && p.carry.k === 'caca' ? 'Levando carne do curral' : 'Levando ovos e leite para o estoque';
        if (st === 'tend') return a.task === 'feed' ? 'Dando ração aos bichos' : a.task === 'slaughter' ? 'Abatendo um bicho da criação' : 'Recolhendo ovos e leite';
        return a.task === 'feed' ? 'Levando ração ao curral' : 'Indo ao curral';
      }
      case 'cerca': return st === 'work' ? 'Fincando cerca' : st === 'fetch' ? 'Pegando varas para a cerca' : 'Indo fincar cerca';
      case 'conservar': {
        const b = Sim.building(S, a.b), moq = b && b.type === 'moquem';
        return st === 'fetch' ? 'Pegando comida para conservar' : st === 'load' ? (moq ? 'Armando o moquém' : 'Espalhando frutas no jirau') : moq ? 'Levando ao moquém' : 'Levando ao jirau';
      }
      case 'dormir': return p.sleeping ? (p.inTent ? 'Dormindo na barraca' : 'Dormindo ao relento') : 'Indo dormir';
      case 'aquecer': return st === 'go' ? 'Indo se aquecer' : p.inTent ? 'Se aquecendo na barraca' : a.src === 'aura' ? 'Se aquecendo no calor de Deus' : 'Se aquecendo no fogo';
      case 'conversar': {
        const o = person(S, a.with), nm = o ? o.name : '…', ch = a.chat;
        if (!ch || !ch.on) return a.kind === 'consolo' && ch && ch.a === p.id ? 'Indo consolar ' + nm : 'Indo conversar';
        const mine = ch.a === p.id, d = ch.d;
        switch (a.kind) {
          case 'consolo': return mine ? 'Consolando ' + nm : 'Recebendo o consolo de ' + nm;
          case 'briga': return 'Brigando com ' + nm;
          case 'pazes': return 'Fazendo as pazes com ' + nm;
          case 'casal': return 'De chamego com ' + nm;
          case 'ensino': return d && d.teacher === p.id ? 'Ensinando ' + nm : 'Aprendendo com ' + nm;
        }
        return 'Conversando com ' + nm;
      }
      case 'historia': { const sm = S.life && S.life.story && S.life.story.teller === p.id && S.life.story.sermon;
        return sm ? (st === 'tell' ? 'Pregando a palavra de ' + G.Deus.call(S) + ' ao pé do fogo' : 'Indo pregar ao pé do fogo') : st === 'tell' ? 'Contando uma história ao pé do fogo' : 'Indo contar uma história'; }
      case 'ouvir': { const t = person(S, a.teller), sm = S.life && S.life.story && S.life.story.id === a.st && S.life.story.sermon;
        return sm ? (st === 'listen' ? 'Ouvindo a pregação de ' + (t ? t.name : '…') : 'Indo ouvir a pregação') : st === 'listen' ? 'Ouvindo a história de ' + (t ? t.name : '…') : 'Indo ouvir uma história'; }
      case 'rezar': return st === 'pray' ? 'Rezando ao pé da estátua de ' + G.Deus.call(S) : 'Indo rezar na estátua';
      case 'curar': { const t = person(S, a.q); return st === 'heal' ? 'Curando ' + (t ? t.name : '…') + ' com as mãos' : 'Indo curar ' + (t ? t.name : '…'); }
      case 'festa': return st === 'dance' ? 'Dançando na festa' : 'Indo para a festa';
      case 'vagar': return 'Dando uma volta';
      case 'brincar': return st === 'play' ? 'Brincando' : 'Indo brincar';
      case 'parto': return p.labor && p.labor.hard && !p.labor.helped ? 'Em trabalho de parto difícil' : 'Em trabalho de parto';
      case 'greve': return 'Em greve';
      case 'fugir': return st === 'go' ? 'Fugindo dos lobos' : p.sleeping ? (p.inTent ? 'Dormindo na barraca' : 'Dormindo junto ao fogo') : p.inTent ? 'Escondido na barraca' : a.src === 'campo' ? 'Junto dos outros, com medo' : 'A salvo junto ao fogo';
      case 'construir': {
        const ob = a.b ? Sim.building(S, a.b) : null;
        if (ob && ob.demol) return st === 'build' ? 'Desmontando a obra' : 'Indo desmontar a obra';   // 0.12
        return st === 'fetch' ? 'Pegando material' : st === 'deliver' ? 'Levando material para a obra' : st === 'build' ? (ob && ob.re ? 'Erguendo a obra no lugar novo' : 'Construindo') : 'Indo para a obra';
      }
      case 'fogo': return st === 'fetch' ? 'Pegando lenha' : 'Alimentando a fogueira';
      case 'mina': return st === 'work' ? 'Trabalhando na mina' : st === 'haul' ? 'Trazendo o que saiu da mina' : 'Indo para a mina';   // Etapa 12
    }
    const d = DOING[a.type];
    if (d) return st === 'work' ? d[1] : st === 'haul' ? d[2] : d[0];
    return '…';
  };
})(globalThis.G = globalThis.G || {});
