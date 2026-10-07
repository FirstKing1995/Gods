/* Gods · interface (DOM): HUD, Vontades, povo, construir, Crônica, avisos e balões. */
(function (G) {
  'use strict';
  const C = G.CFG, Sim = G.Sim, AI = G.AI, A = G.Art;
  const UI = G.UI = {};
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icons = {};
  const ic = (n) => icons[n] || (icons[n] = A.iconURL(n));
  const pad = G.U.pad2;
  let S = null;
  UI.sel = { person: 0, building: 0 };

  const VORDER = ['frutas', 'pesca', 'caca', 'roca', 'criacao', 'agua', 'madeira', 'pedra', 'mina', 'argila', 'construir', 'oficio', 'conservar', 'fogo'];
  const VICON = { frutas: 'frutas', pesca: 'peixe', caca: 'lanca', agua: 'agua', madeira: 'madeira', pedra: 'pedra', argila: 'argila',
    construir: 'construir', oficio: 'ferramentas', conservar: 'moquem', fogo: 'fogo', roca: 'roca', criacao: 'galinha', mina: 'mina' };
  const VHELP = {
    frutas: 'Colher pitangas nos arbustos. Arbustos não dão fruta no inverno.',
    pesca: 'Pescar na beira da água. Peixe assado na fogueira sustenta mais.',
    caca: 'Caçar com a lança (os bichos ariscos, só com o arco): carne e couro para roupas. Precisa de ferramenta. Quem tem lança na mão também revida quando um bicho ataca.',
    agua: 'Encher as cabaças para beber no acampamento.',
    madeira: 'Cortar árvores. Lenha para a fogueira e para as obras. Depois dos cestos, cada árvore dá também 2 de fibra.',
    pedra: 'Quebrar pedras. Precisa para a fogueira, a barraca avançada e as ferramentas.',
    argila: 'Cavar barro na beira d\'água, para o forno de barro.',
    construir: 'Levar material, erguer e melhorar as obras que você marcar, abrir os caminhos e fincar as cercas marcadas.',
    oficio: 'Ferramentas (1 pedra e 1 madeira) e roupas de couro (2 couros). Com as oficinas: tábuas na marcenaria (2 madeira) e mantas e redes na tecelagem (fibra).',
    conservar: 'Levar peixe e carne ao moquém e frutas ao jirau: comida que dura o inverno.',
    fogo: 'Manter a fogueira acesa quando esfria.',
    roca: 'Plantar, capinar e colher nas roças, e levar a colheita ao estoque. No inverno só a mandioca cresce.',
    criacao: 'Recolher ovos, leite e lã no curral, levar ração aos bichos no frio e abater quando o curral enche. Criança de 7 anos já recolhe ovos.',
    mina: 'Trabalhar na mina: pedra sempre e, com sorte, carvão e minério; na mina funda, prata, ouro e pedras preciosas.',
  };
  const LEVELS = ['Proibido', 'Baixa', 'Normal', 'Máxima'];
  const NEEDS = [['fome', 'Fome', 'fome'], ['sede', 'Sede', 'sede'], ['energia', 'Energia', 'energia'], ['calor', 'Calor', 'calor'], ['social', 'Social', 'social'], ['saude', 'Saúde', 'saude']];
  const GOAL_HINT = {
    olhar: 'Toque em alguém no mapa ou na lista do Povo.',
    vontade: 'Nas Vontades, toque nos quadradinhos de um trabalho.',
    frutas20: 'Suba Frutas nas Vontades: colhem nas pitangueiras.',
    agua10: 'Suba Água nas Vontades.',
    peixe5: 'Suba Pesca nas Vontades.',
    milagre: 'Em Deus, escolha um milagre e toque no mapa.',
    historia: 'De tardinha, com o fogo aceso, alguém conta uma história.',
    oracao: 'Quando alguém rezar, toque na oração em Deus.',
    festa: 'Nascimento, descoberta e o fim do inverno dão festa à noite.',
    ensino: 'Quem sabe muito ensina os jovens de 7 a 17 anos.',
    filho: 'Um par de mulher e homem precisa dormir junto na barraca, com comida em dia.',
    camas: 'Barraca simples: um casal e uma criança. Marque outra.',
    estoque: 'Mais bocas: suba Frutas e Pesca nas Vontades.',
    ajuda: 'Aos 7 anos a criança colhe frutas e busca água.',
    povo: 'Cuide dos partos: a Cura salva um parto difícil.',
    fogo: 'Construir → Fogueira, perto do estoque.',
    barraca: 'Construir → Barraca simples, perto do fogo.',
    comida: 'Suba Frutas e Pesca nas Vontades.',
    lenha: 'Suba Madeira antes do outono.',
    inverno: 'Fogo aceso, comida e lenha até a primavera.',
    d_pedra: 'Quem corta madeira e quebra pedra acaba lascando uma pedra.',
    d_ferramentas: 'Suba Ofício: 1 pedra e 1 madeira viram uma ferramenta.',
    d_conserva: 'Construa moquém e jirau e suba Conservar, antes do inverno.',
    d_roupas: 'Suba Caça (couro) e Ofício (roupas): 2 couros por roupa.',
    d_ceramica: 'Quem busca água no barranco aprende o barro. A Revelação ajuda.',
    d_aldeia: 'Acolha quem pede abrigo e cuide dos partos.',
    o_fogueira: 'Toque na fogueira e escolha Melhorar: 8 pedras viram uma roda de pedras.',
    o_caminho: 'Construir → Caminho e arraste pelo chão. Construir, nas Vontades, abre.',
    o_armazem: 'Construir → Armazém, a até 8 passos do estoque.',
    o_tabuas: 'Construa uma marcenaria. O Ofício faz tábuas quando uma obra pede.',
    o_casa: 'Melhore uma barraca avançada. A casa depende do lugar: água, mata, campo ou serra.',
    o_oficinas: 'A marcenaria vem com a pedra lascada; a tecelagem, com os cestos.',
    o_mantas: 'Na tecelagem, o Ofício tece mantas com a fibra das árvores cortadas.',
    o_caminhos: 'Ligue o estoque à água, às obras e ao mato: por caminho se anda mais depressa.',
    o_melhorias: 'Toque numa obra pronta e escolha Melhorar.',
    // Etapa 8: invenções
    i_faca: 'A faca vem do Ofício, de cortar madeira e de carnear a caça. Veja em Povo → Descobertas → Invenções.',
    i_corda: 'A corda vem de tirar embira (cortando árvores), colher, tecer e construir.',
    i_tres: 'Várias invenções andam ao mesmo tempo, cada uma com o seu trabalho. Veja o que falta em Povo → Descobertas.',
    i_arco: 'Com o arco inventado, suba Caça nas Vontades.',
    i_tambor: 'Com o tambor inventado, a próxima festa tem batuque: nascimento, fim do inverno, fartura ou descoberta.',
    i_todas: 'A Revelação (tecla V) adianta a invenção que você escolher na janela das Descobertas.',
    // Etapa 9: bichos
    b_tres: 'Suba Caça nas Vontades. Bicho que ninguém caçou ainda atiça a curiosidade dos caçadores.',
    b_seis: 'Veado, jacu e tapiti são ariscos: só com o arco. O jacaré, só com o arco e quando toma sol.',
    b_luta: 'Com lança na mão, quem é atacado revida e quem está perto vem ajudar. Suba Ofício para ter ferramentas.',
    b_onca: 'Depois de um ataque, os caçadores vão atrás da onça na toca. Um Raio (R) em cima dela também serve.',
    // Etapa 10: campo
    c_roca: 'Construir → Roça (H), em terra boa perto de casa. Suba Roça nas Vontades.',
    c_cinco: 'Toque numa roça e escolha o que plantar. O algodão vem depois da roça; a mandioca aguenta o inverno.',
    c_curral: 'Construa um curral (Y): o mascate passa trocando bichos. Com macho e fêmea, nasce cria.',
    c_cerca: 'Construir → Cerca (X) e feche a volta toda. Árvore, pedra e água também servem de parede.',
    // Etapa 11: Deus
    g_nivel2: 'Atenda as orações: a glória (o Poder que o povo te dá) e os fiéis (fé 70 ou mais) fazem Deus subir. Veja em Deus.',
    g_converte: 'O cético se converte vendo sinais: milagres de perto, a oração dele atendida, curas e a pregação.',
    g_nivel3: 'O nível 3 pede mais fiéis: cuide da fé de quem tem 7 anos ou mais.',
    g_escolhido: 'Quem chega à fé inteira (100), com 16 anos ou mais, pode receber um poder: Deus → Escolhidos.',
    g_estatua: 'Construir → Estátua. Pronta, toque nela e escolha o milagre dela.',
    g_ato: 'No nível 4, crie uma espécie; no nível 5, ensine um saber. Deus → Grandes atos.',
    // Etapa 12: povos e minas
    p_acolher: 'As caravanas chegam depois que o acampamento vira aldeia. No nível 2, Deus pode chamar um povo: Deus → Povos.',
    p_casal: 'Os pares entre povos nascem da conversa, como os outros, e saem mais fácil com a convivência alta.',
    p_hibrido: 'Um casal de mulher e homem de povos diferentes pode ter um filho mestiço: um dom de cada lado.',
    p_tres: 'Acolha elfos, anões e povo-fera. Quem foi mandado seguir volta uma vez; depois, só chamando.',
    p_uniao: 'Festa, história ao pé do fogo, casais e filhos mistos aproximam. Briga afasta. Veja em Deus → Povos.',
    m_mina: 'Com a mineração (os anões trazem), Construir → Mina, encostada na serra ou perto de pedras.',
    m_ferraria: 'Com a metalurgia, Construir → Ferraria: 20 de pedra e 10 de madeira.',
    m_ferro: 'A forja pede 2 de minério e 1 de carvão, e alguém que saiba forjar: um anão, ou Ofício no nível 4.',
    m_ouro: 'O ouro só aparece na mina funda (nível 2) e na mina de veio (nível 3).',
    // Etapa 13: memória
    m_conto: 'Um milagre visto de perto vira conto, e quem viu conta nas noites de história. Veja em Deus → Memória.',
    m_velar: 'Quem morre é levado para junto do fogo e velado à tardinha. De manhã, o povo enterra.',
    m_flores: 'Nos dias depois do enterro, a família volta à cova com flores. Toque numa cova para ver de quem é.',
    m_rito: 'No nível 2 de Deus, o povo acha a erva-do-sonho na mata. No rito, ao escurecer, alguém pergunta: responda.',
    m_finados: 'No último dia do outono, à tarde, a aldeia vai ao cemitério com uma luz para cada cova.',
    m_reconto: 'Quem só ouviu um conto passa adiante e muda um detalhe. Veja em Deus → Memória.',
  };
  // estoque: os cinco de sempre e os da Etapa 5, que aparecem quando existem
  const RES = [['madeira', 'madeira'], ['pedra', 'pedra'], ['argila', 'argila'], ['tabuas', 'tabuas'], ['fibra', 'fibra'], ['agua', 'agua'], ['frutas', 'frutas'], ['peixe', 'peixe'], ['carne', 'carne'],
    ['feijao', 'feijao'], ['milho', 'milho'], ['abobora', 'abobora'], ['mandioca', 'mandioca'], ['ovos', 'ovos'], ['leite', 'leite'],
    ['defumado', 'defumado'], ['seca', 'frutaseca'], ['couro', 'couro'], ['ferramentas', 'ferramentas'], ['roupas', 'roupas'], ['mantas', 'mantas'], ['redes', 'redes'],
    ['carvao', 'carvao'], ['minerio', 'minerio'], ['ferro', 'ferro'], ['prata', 'prata'], ['ouro', 'ouro'], ['gemas', 'gemas'], ['joias', 'joias']];   // Etapa 12
  const RES_BASE = new Set(['madeira', 'pedra', 'agua', 'frutas', 'peixe']);
  const RES_NAME = { madeira: 'Madeira', pedra: 'Pedra', agua: 'Água', frutas: 'Frutas', peixe: 'Peixe', carne: 'Carne', couro: 'Couro', argila: 'Argila',
    defumado: 'Defumado (peixe e carne)', seca: 'Fruta seca', ferramentas: 'Ferramentas', roupas: 'Roupas de couro',
    tabuas: 'Tábuas', fibra: 'Fibra (embira, algodão e lã)', mantas: 'Mantas', redes: 'Redes de dormir',
    feijao: 'Feijão', milho: 'Milho', abobora: 'Abóbora', mandioca: 'Mandioca', ovos: 'Ovos', leite: 'Leite',
    carvao: 'Carvão', minerio: 'Minério de ferro', ferro: 'Ferramentas de ferro', prata: 'Prata', ouro: 'Ouro', gemas: 'Pedras preciosas', joias: 'Joias' };
  // o nome do material no meio de uma frase
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const TOM_DESC = {
    leve: 'Namoro de mãos dadas. Os pares têm filhos, e a Crônica não fala das noites.',
    picante: 'Noites a três e noites de muitos na Crônica, insinuadas e nunca descritas. Só entre adultos, sem parentes.',
    adulto: 'O povo fala de desejo sem rodeio, a Crônica diz quem transou com quem, e briga de adulto tem palavrão. Só entre adultos, sem parentes; nenhuma cena é descrita.',
  };
  const MAT_WORD = { madeira: 'madeira', pedra: 'pedra', argila: 'argila', tabuas: 'tábuas', fibra: 'fibra' };
  UI.RES_NAME = RES_NAME;

  // ---------- montagem ----------
  UI.init = function (hooks) {
    UI.hooks = hooks;
    // ícones estáticos
    document.querySelectorAll('#mobnav button').forEach((b) => {
      const n = { vontades: 'verao', construir: 'construir', deus: 'deus', povo: 'pessoa', cronica: 'cronica' }[b.dataset.open];
      b.querySelector('img').src = ic(n);
    });
    $('#btn-cronica img').src = ic('cronica');
    // Vontades
    $('#vontades').innerHTML = VORDER.map((w) => `
      <div class="vrow" data-w="${w}" title="${esc(VHELP[w])}">
        <img class="ico" src="${ic(VICON[w])}" alt="">
        <div class="lbl"><span>${AI.LABEL[w]}</span><span class="who"></span></div>
        <div class="meter" role="radiogroup" aria-label="Vontade: ${AI.LABEL[w]}">
          ${[0, 1, 2, 3].map((l) => `<button data-l="${l}" role="radio" aria-label="${LEVELS[l]}" title="${LEVELS[l]}">${l === 0 ? '<span>×</span>' : ''}</button>`).join('')}
        </div>
      </div>`).join('');
    $('#vontades').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-l]'); if (!b || !S) return;
      const w = b.closest('.vrow').dataset.w;
      if (S.vontades[w] !== +b.dataset.l) S.stats.vontadeChanged = true;
      S.vontades[w] = +b.dataset.l;
      paintVontades(true);
    });
    // construir (as das descobertas aparecem com elas; o armazém, depois do primeiro inverno) e a ferramenta de caminho
    const builds = [['fogueira', 'fogo'], ['barraca', 'barraca'], ['armazem', 'armazem'], ['moquem', 'moquem'], ['jirau', 'jirau'], ['forno', 'forno'],
      ['marcenaria', 'marcenaria'], ['tecelagem', 'tecelagem'], ['roca', 'roca'], ['curral', 'curral'], ['mina', 'mina'], ['ferraria', 'ferraria'], ['estatua', 'estatua'], ['cemiterio', 'cemiterio']];
    const SHORT = { barraca: 'Barraca', forno: 'Forno' };   // nome curto no botão (o painel fica em duas fileiras)
    $('#builds').innerHTML = builds.map(([t, icn]) => {
      const d = C.BUILD[t];
      return `<button class="btn bbtn" data-build="${t}" title="${esc(d.name + ': ' + d.desc)}">
        <img class="ico" src="${ic(icn)}" alt=""><span>${SHORT[t] || d.name}${d.key ? `<kbd>${d.key}</kbd>` : ''}</span>
        <span class="cost">${Object.keys(d.cost).length ? Object.keys(d.cost).map((k) => `<span data-c="${k}"><img src="${ic(k)}" alt="${RES_NAME[k]}"> ${d.cost[k]}</span>`).join('') : '<span>só trabalho</span>'}</span>
      </button>`;
    }).join('') + `<button class="btn bbtn" data-tool="caminho" title="Arraste pelo chão para marcar um caminho. Terra: só trabalho, anda-se 30% mais rápido. Pedra: 1 pedra por passo, 45% mais rápido.">
        <img class="ico" src="${ic('caminho')}" alt=""><span>Caminho<kbd>P</kbd></span><span class="cost"><span>arraste no chão</span></span>
      </button><button class="btn bbtn" data-tool="cerca" title="Arraste pelo chão para marcar uma cerca de vara: 1 madeira por passo. Bicho não passa; gente pula. Em cima de caminho vira porteira.">
        <img class="ico" src="${ic('cerca')}" alt=""><span>Cerca<kbd>X</kbd></span><span class="cost"><span data-c="madeira"><img src="${ic('madeira')}" alt="Madeira"> 1/passo</span></span>
      </button>`;
    $('#builds').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tool]'); if (t) { if (t.dataset.tool === 'cerca') UI.hooks.fence(); else UI.hooks.road(); return; }
      const b = e.target.closest('[data-build]'); if (!b) return;
      UI.hooks.place(b.dataset.build);
    });
    // Deus: milagres e orações
    const keys = { calor: 'Q', raio: 'R', chuva: 'U', cura: 'E', revelacao: 'V', bencao: 'Z' };
    $('#miracles').innerHTML = Object.keys(G.God.MIRACLES).map((k) => {
      const m = G.God.MIRACLES[k];
      return `<button class="btn mbtn" data-mir="${k}" title="${esc(m.desc)}"><img class="ico" src="${ic(m.icon)}" alt=""><span>${m.name} <kbd>${keys[k] || ''}</kbd></span><span class="cost">${m.cost} de Poder</span></button>`;
    }).join('');
    $('#miracles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mir]'); if (!b) return;
      UI.hooks.cast(b.dataset.mir);
    });
    $('#prayers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pid]'); if (!b || !S) return;
      const p = S.people.find((q) => q.id === +b.dataset.pid);
      if (!p || !p.prayer) return;
      // leva até quem precisa (na Cura, é o doente, não quem reza)
      const t = G.Family.person(S, p.prayer.target) || p;
      const shown = t.carriedBy ? (G.Family.person(S, t.carriedBy) || t) : t;
      UI.select(shown.id, 0, true);
      UI.hooks.cast(G.God.PRAYER_HELP[p.prayer.kind]);
    });
    // Etapa 11: a janela de Deus (níveis e dons, escolhidos, grandes atos)
    $('#btn-deus img').src = ic('deus');
    $('#btn-deus').addEventListener('click', () => {
      if (S && G.Deus && G.Deus.pending(S) && UI.hooks.godPending) UI.hooks.godPending();
      else if (S && G.Memoria && G.Memoria.pending(S) && UI.hooks.memPending) UI.hooks.memPending();   // Etapa 13
      else UI.deus();
    });
    $('#deus-close').addEventListener('click', () => { $('#modal-deus').hidden = true; });
    $('#modal-deus').addEventListener('click', (e) => {
      if (e.target === $('#modal-deus')) { $('#modal-deus').hidden = true; return; }
      const t = e.target.closest('[data-gtab]'); if (t) { UI.deus(t.dataset.gtab); return; }
      const b = e.target.closest('[data-gact]'); if (!b || !S || !G.Deus) return;
      godAct(b);
    });
    $('#modal-deus').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'deus-rename') { e.preventDefault(); godAct({ dataset: { gact: 'rename' } }); } });
    // árvore da família e descobertas
    $('#btn-tree img').src = ic('arvore');
    $('#btn-tree').addEventListener('click', () => UI.tree());
    $('#tree-close').addEventListener('click', () => { $('#modal-tree').hidden = true; });
    $('#btn-disc img').src = ic('lasca');
    $('#btn-disc').addEventListener('click', () => UI.disc());
    $('#disc-close').addEventListener('click', () => { $('#modal-disc').hidden = true; });
    $('#modal-disc').addEventListener('click', (e) => {
      const t = e.target.closest('[data-dtab]'); if (t) { UI.disc(t.dataset.dtab); return; }
      const b = e.target.closest('[data-reveal]'); if (!b) return;
      if (S && S.tech) S.tech.aim = b.dataset.reveal;   // a Revelação vai entregar esta (Etapa 8)
      $('#modal-disc').hidden = true;
      UI.hooks.cast('revelacao');
    });
    // povo
    $('#people').addEventListener('click', (e) => {
      const c = e.target.closest('[data-pid]'); if (!c) return;
      UI.select(+c.dataset.pid, 0, true);
    });
    // a lista: busca pelo nome e ordem (valem só nesta sessão)
    const search = $('#povo-search'), relist = () => { listSig = ''; $('#people').scrollTop = 0; if (S) paintPeople(); };
    search.addEventListener('input', () => { listQ = norm(search.value.trim()); relist(); });
    search.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (search.value) { search.value = ''; listQ = ''; relist(); e.preventDefault(); } else search.blur();
    });
    $('#povo-sort').addEventListener('change', (e) => { listSort = e.target.value; relist(); });
    // quem mexe na lista não vê os cartões trocarem de lugar debaixo do dedo
    for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown']) $('#p-povo').addEventListener(ev, listTouched, { passive: true });
    $('#people').addEventListener('scroll', listTouched, { passive: true });
    // a ficha da pessoa: seguir, anterior e próximo, voltar para a lista (celular), fechar
    $('#pessoa-follow img').src = ic('seguir') || ic('olho');
    const arrow = (d) => `<svg width="9" height="15" viewBox="0 0 6 10" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="${d}"/></svg>`;
    $('#pessoa-prev').innerHTML = arrow('M4 0h2v2H4zM2 2h2v2H2zM0 4h2v2H0zM2 6h2v2H2zM4 8h2v2H4z');
    $('#pessoa-next').innerHTML = arrow('M0 0h2v2H0zM2 2h2v2H2zM4 4h2v2H4zM2 6h2v2H2zM0 8h2v2H0z');
    $('#pessoa-close').addEventListener('click', () => UI.select(0, 0));
    $('#pessoa-follow').addEventListener('click', () => { if (S && UI.sel.person) UI.hooks.follow(UI.hooks.following() === UI.sel.person ? 0 : UI.sel.person); });
    $('#pessoa-prev').addEventListener('click', () => UI.step(-1));
    $('#pessoa-next').addEventListener('click', () => UI.step(1));
    $('#pessoa-list').addEventListener('click', () => UI.showList());
    $('#inspector').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !S) return;
      if (b.dataset.act === 'rename') {
        const kid = S.people.find((q) => q.id === UI.sel.person);
        if (kid) UI.birth(kid, null, true);
      }
      if (b.dataset.act === 'ungir') UI.deus('escolhidos');   // Etapa 11
      if (b.dataset.act === 'vercova') {   // Etapa 13: a câmera vai até a cova (ou até onde o corpo espera)
        const d = S.people.find((q) => q.id === UI.sel.person);
        if (d && d.cova) UI.hooks.center((d.cova[0] + 0.5) * C.TILE, (d.cova[1] + 0.5) * C.TILE);
        else if (d && d.corpo) UI.hooks.center(d.x * C.TILE, d.y * C.TILE);
      }
    });
    // a obra escolhida no mapa tem painel próprio (a evolução, remover, o que plantar)
    $('#obra-close').addEventListener('click', () => UI.select(0, 0));
    $('#obra').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !S) return;
      const bd = Sim.building(S, UI.sel.building); if (!bd) return;
      if (b.dataset.act === 'upgrade') {
        const kind = b.dataset.kind || null;
        if (Sim.startUpgrade(S, bd, kind)) {
          const d = Sim.upDef(bd);
          UI.toast('Melhoria marcada: ' + d.name.toLowerCase() + '. O povo vai levar ' + costText(d.cost) + '.', '');
          if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai trabalhar na obra.', 'warn');
        }
      }
      if (b.dataset.act === 'remove') {
        // obra marcada, melhoria marcada ou obra sendo erguida no lugar novo: desistir devolve o material entregue
        const d = Sim.def(bd), was = bd.up ? 'A melhoria foi desmarcada' : bd.site ? 'A mudança foi cancelada' : d.name + (d.a === 'o' ? ' removido' : ' removida');
        if (b.dataset.armed || bd.up || bd.site) { Sim.removeBuilding(S, bd); if (!bd.up && !S.buildings.includes(bd)) UI.select(0, 0); UI.toast(was + (bd.site ? '.' : '. Material devolvido ao estoque.'), ''); }
        else { b.dataset.armed = '1'; b.textContent = 'Confirmar'; }
        lastInsp = '';
        return;
      }
      // 0.12: demolir (o povo desmonta e metade do material volta) e mudar de lugar (desmonta e ergue de novo)
      if (b.dataset.act === 'demolish') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar demolição'; return; }
        if (Sim.startDemolish(S, bd)) {
          UI.toast('Demolição marcada. O povo desmonta e metade do material volta ao estoque.', '');
          if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai desmontar a obra.', 'warn');
        }
        lastInsp = '';
        return;
      }
      if (b.dataset.act === 'undemolish') { Sim.cancelDemolish(S, bd); UI.toast(bd.site ? 'Mudança cancelada.' : 'A obra fica onde está.', ''); lastInsp = ''; return; }
      if (b.dataset.act === 'move') {
        const d = Sim.def(bd), id = bd.id;
        UI.hooks.place(bd.type, {
          label: 'Mudar: ' + d.name.toLowerCase(), confirm: 'Mudar para cá', lv: bd.lv || 1, kind: bd.kind || null,
          canPlace: (x, y) => { const o = Sim.building(S, id); return o ? Sim.canMoveTo(S, o, x, y) : 'A obra não existe mais'; },
          onConfirm: (x, y) => {
            const o = Sim.building(S, id);
            if (!o || !Sim.startMove(S, o, x, y)) { UI.toast('Não deu para marcar a mudança.', 'warn'); return false; }
            UI.toast('Mudança marcada. O povo desmonta, leva três quartos do material e ergue de novo no lugar novo.', '');
            if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai fazer a mudança.', 'warn');
            lastInsp = '';
            return true;
          },
        });
        return;
      }
      if (b.dataset.act === 'back') UI.select(0, 0);
      if (b.dataset.act === 'pessoa') { if (+b.dataset.pid) UI.select(+b.dataset.pid, 0); return; }   // Etapa 13: do cemitério para a ficha
      if (b.dataset.act === 'consagrar' && G.Deus) {
        // Etapa 11: o milagre próprio da estátua
        const why = G.Deus.consecrateWhy(S, bd, b.dataset.k);
        if (why) { UI.toast('Não dá para consagrar: ' + why + '.', 'warn'); return; }
        G.Deus.consecrate(S, bd, b.dataset.k);
        lastInsp = '';
        UI.update(0, true);
        return;
      }
      if (b.dataset.act === 'crop' && bd.type === 'roca' && G.Campo) {
        // Etapa 10: o que plantar nesta roça (vazio: o povo escolhe pela estação e pelo que falta)
        const f = G.Campo.farmOf(bd), k = b.dataset.k || null;
        f.pick = k;
        const why = k ? G.Campo.plantWhy(S, k) : '';
        UI.toast(k ? 'Esta roça vai plantar ' + C.ROCA[k].name.toLowerCase() + (why ? ' (agora não dá: ' + why + ').' : '.') : 'O povo escolhe o que plantar nesta roça.', why ? 'warn' : '');
        return;
      }
      lastInsp = '';
    });
    // Crônica e painéis
    $('#btn-cronica').addEventListener('click', () => UI.sheet(document.body.dataset.sheet === 'cronica' ? '' : 'cronica'));
    $('#cronica-close').addEventListener('click', () => UI.sheet(''));
    document.querySelectorAll('#mobnav button').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.open;
      if (UI.isMobile() || n === 'cronica') UI.sheet(document.body.dataset.sheet === n ? '' : n);
      // em tela baixa a ficha fica no lugar da lista aberta (veja o CSS): aí o botão Povo traz a lista de volta
      else if (n === 'povo' && openSet.has('povo') && UI.sel.person && getComputedStyle($('#p-povo')).display === 'none') UI.select(0, 0);
      else UI.toggle(n);
    }));
    applyOpen();
    if (firstRun) { const v = document.querySelector('#mobnav [data-open="vontades"]'); if (v) v.classList.add('nudge'); }
    // velocidade e menu
    document.querySelectorAll('.spd[data-speed]').forEach((b) => b.addEventListener('click', () => UI.hooks.speed(+b.dataset.speed)));
    const pause = document.querySelector('.spd[data-speed="0"]');
    pause.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3" height="12" fill="currentColor"/><rect x="9" y="1" width="3" height="12" fill="currentColor"/></svg>';
    $('#btn-menu').innerHTML = '<svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true"><rect y="1" width="16" height="2" fill="currentColor"/><rect y="6" width="16" height="2" fill="currentColor"/><rect y="11" width="16" height="2" fill="currentColor"/></svg>';
    $('#btn-menu').addEventListener('click', () => { $('#menu').hidden = !$('#menu').hidden; });
    $('#menu-close').addEventListener('click', () => { $('#menu').hidden = true; });
    // tempo com o jogo fechado
    const off = $('#menu-offline');
    off.innerHTML = C.OFFLINE_RATE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    off.addEventListener('change', () => { if (!S) return; S.opts = S.opts || {}; S.opts.offline = +off.value; UI.toast('Com o jogo fechado: ' + C.OFFLINE_RATE_NAMES[+off.value] + '.'); });
    $('#menu-save').addEventListener('click', () => { UI.hooks.save(); });
    // o tom do mundo (0.12; antes, a chave das noites picantes): leve, picante ou adulto. Sempre só entre adultos
    $('#menu-tom').addEventListener('change', (e) => {
      if (!S) return;
      const v = e.target.value;
      S.opts = S.opts || {}; S.opts.tom = v; S.opts.picante = v !== 'leve';
      $('#tom-desc').textContent = TOM_DESC[v];
      UI.toast(v === 'adulto' ? 'Tom adulto (+18): o povo fala e a Crônica conta sem rodeio. Só entre adultos; nada é descrito.' : v === 'picante' ? 'Tom picante: noites a três e de muitos na Crônica, insinuadas.' : 'Tom leve: sem noites picantes neste mundo.', '');
    });
    // som: chave geral e as três trilhas (guardado neste aparelho)
    const Au = G.Audio;
    if (Au) {
      const sync = () => { $('#snd-on').checked = Au.pref.on; $('#snd-music').value = Math.round(Au.pref.music * 100); $('#snd-amb').value = Math.round(Au.pref.amb * 100); $('#snd-sfx').value = Math.round(Au.pref.sfx * 100); };
      sync();
      UI.syncSound = sync;
      $('#snd-on').addEventListener('change', (e) => { Au.unlock(); Au.set('on', e.target.checked); });
      for (const [id, k] of [['#snd-music', 'music'], ['#snd-amb', 'amb'], ['#snd-sfx', 'sfx']]) $(id).addEventListener('input', (e) => { Au.unlock(); Au.set(k, +e.target.value / 100); });
      // um clique de leve nos botões do jogo
      document.addEventListener('click', (e) => { if (e.target.closest('.vrow button, .bbtn, .mbtn, .spd, .pcard')) Au.ui('click'); });
    }
    // Narrador: dá para trocar no meio do jogo
    const ns = $('#menu-narr');
    ns.innerHTML = Object.keys(C.NARRADORES).map((k) => `<option value="${k}">${esc(C.NARRADORES[k].name)}</option>`).join('');
    ns.addEventListener('change', () => {
      if (!S || !G.Narr.setKind(S, ns.value)) return;
      const k = C.NARRADORES[ns.value];
      $('#narr-desc').textContent = k.desc;
      UI.toast('Narrador ' + k.name + '. ' + k.desc, '');
    });
    $('#menu-title').addEventListener('click', () => { $('#menu').hidden = true; UI.hooks.toTitle(); });
  };

  // quiet: quem chama pinta depois (UI.select)
  UI.sheet = function (name, quiet) {
    const was = document.body.dataset.sheet || '';
    if (name) document.body.dataset.sheet = name; else delete document.body.dataset.sheet;
    paintNav();
    if (was !== (name || '')) opened(quiet);
  };
  // um painel abriu ou fechou: pinta já o que apareceu (a lista fechada não é pintada) e avisa quem depende do espaço livre
  function opened(quiet) {
    if (S && !quiet) UI.update(0, true);
    if (UI.hooks && UI.hooks.panels) UI.hooks.panels();
  }
  UI.isMobile = () => window.matchMedia('(max-width: 820px)').matches;
  // No computador os painéis ficam fechados e abrem ao clicar (como no celular), cada um no seu canto; o que fica
  // aberto é lembrado neste aparelho. O painel da obra e a ficha da pessoa abrem quando se escolhe um dos dois no mapa
  // (ou a pessoa na lista), e por isso não são lembrados.
  const PANELS = ['vontades', 'construir', 'deus', 'povo', 'obra', 'pessoa'];
  const TRANSIENT = ['obra', 'pessoa'];
  let firstRun = false;
  const openSet = new Set((() => {
    try {
      const raw = localStorage.getItem('genesis-paineis');
      if (raw === null) { firstRun = true; return []; }
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((k) => PANELS.indexOf(k) >= 0 && TRANSIENT.indexOf(k) < 0) : [];
    } catch (e) { return []; }
  })());
  function saveOpen() { try { localStorage.setItem('genesis-paineis', JSON.stringify([...openSet].filter((k) => TRANSIENT.indexOf(k) < 0))); } catch (e) { /* sem guardar */ } }
  function applyOpen() {
    const v = [...openSet].join(' ');
    if (v) document.body.dataset.open = v; else delete document.body.dataset.open;
    paintNav();
  }
  function paintNav() {
    const mob = UI.isMobile(), sh = document.body.dataset.sheet || '';
    document.querySelectorAll('#mobnav button').forEach((b) => {
      const n = b.dataset.open;
      b.classList.toggle('on', mob || n === 'cronica' ? sh === n : openSet.has(n));
      b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false');
    });
  }
  UI.isOpen = (n) => (UI.isMobile() ? document.body.dataset.sheet === n : openSet.has(n));
  UI.toggle = function (n, on, quiet) {
    const want = on === undefined ? !openSet.has(n) : !!on;
    const changed = want !== openSet.has(n);
    if (changed) {
      if (want) openSet.add(n); else openSet.delete(n);
      applyOpen(); saveOpen();
    }
    if (n === 'vontades') { const v = document.querySelector('#mobnav .nudge'); if (v) v.classList.remove('nudge'); }
    if (changed) opened(quiet); else if (UI.hooks && UI.hooks.panels) UI.hooks.panels();
  };
  UI.closeAll = function () { if (!openSet.size) return false; openSet.clear(); applyOpen(); saveOpen(); if (UI.hooks && UI.hooks.panels) UI.hooks.panels(); return true; };
  window.addEventListener('resize', paintNav);

  UI.bind = function (state) {
    S = state;
    if (S.narr) { $('#menu-narr').value = S.narr.kind; $('#narr-desc').textContent = G.Narr.kind(S).desc; }
    $('#menu-offline').value = String(S.opts && S.opts.offline !== undefined ? S.opts.offline : C.OFFLINE_RATE_DEFAULT);
    { const t = ['leve', 'picante', 'adulto'][G.Family.tom(S)]; $('#menu-tom').value = t; $('#tom-desc').textContent = TOM_DESC[t]; }
    UI.sel = { person: 0, building: 0 };
    lastInsp = ''; listSig = ''; contoKey = ''; covaKey = '';
    // mundo novo: a lista e a ficha começam do zero (a busca e a ordem são da sessão, e ficam)
    cards.clear(); $('#people').innerHTML = ''; selCard = 0; inspPid = 0;
    for (const k of TRANSIENT) UI.toggle(k, false, true);
    $('#chron').innerHTML = '';
    for (const c of S.chron) addChron(c, false);
    $('#toasts').innerHTML = '';
    bubbles.forEach((b) => b.el.remove()); bubbles.clear();
    UI.update(0, true);
  };

  // Escolher uma pessoa abre a ficha dela (#p-pessoa); escolher uma obra, o painel da obra. Um fecha o outro, e
  // UI.select(0, 0) fecha os dois. A lista do povo fica como estava.
  UI.select = function (pid, bid, center) {
    UI.sel.person = pid || 0; UI.sel.building = bid || 0;
    G.R.overlay.selPerson = UI.sel.person; G.R.overlay.selBuilding = UI.sel.building;
    lastInsp = '';
    // seguir é de uma pessoa só: escolher outra (ou uma obra, ou ninguém) solta a câmera
    const fol = UI.hooks.following ? UI.hooks.following() : 0;
    if (fol && fol !== UI.sel.person) UI.hooks.follow(0);
    if (pid && S) {
      const p = S.people.find((q) => q.id === pid);
      if (p && p.alive) { AI.touch(S, p); S.stats.inspected = true; if (center) UI.hooks.center(p.x * C.TILE, p.y * C.TILE); }
    }
    if (UI.isMobile()) {
      const sh = document.body.dataset.sheet || '';
      if (bid) UI.sheet('obra', true);
      else if (pid) UI.sheet('pessoa', true);
      else if (TRANSIENT.indexOf(sh) >= 0) UI.sheet('', true);
    } else {
      UI.toggle('obra', !!bid, true);
      UI.toggle('pessoa', !!pid && !bid, true);
    }
    UI.update(0, true);
  };
  // anterior e próximo da ficha: os vivos, na ordem da lista (a câmera vai junto)
  UI.step = function (d) {
    if (!S) return;
    const ids = order().filter((p) => p.alive).map((p) => p.id);
    if (!ids.length) return;
    const i = ids.indexOf(UI.sel.person);
    listTouched();   // a ordem não muda no meio do passeio
    UI.select(ids[i < 0 ? (d > 0 ? 0 : ids.length - 1) : (i + d + ids.length) % ids.length], 0, true);
  };
  // da ficha de volta para a lista (no celular a ficha e a lista dividem a mesma gaveta), com o cartão escolhido à vista
  UI.showList = function () {
    if (UI.isMobile()) UI.sheet('povo'); else UI.toggle('povo', true);
    const c = cards.get(UI.sel.person);
    if (c) scrollTo($('#people'), c.el, true);
  };

  // ---------- atualização ----------
  let lastUpd = 0, lastInsp = '';
  UI.update = function (now, force) {
    if (!S) return;
    if (!force && now - lastUpd < 180) return;
    lastUpd = now;
    const ck = S.ck;
    $('#season-ico').src = ic(['primavera', 'verao', 'outono', 'inverno'][ck.season]);
    $('#season-name').textContent = C.SEASONS[ck.season];
    $('#season-day').textContent = 'dia ' + ck.dos;
    $('#year-label').textContent = 'Ano ' + ck.year;
    const dw = Sim.daysToWinter(S);
    const fc = $('#forecast');
    fc.textContent = ck.season === 3 ? 'Primavera em ' + (C.SEASON_DAYS - ck.dos + 1) + (C.SEASON_DAYS - ck.dos + 1 === 1 ? ' dia' : ' dias') : 'Inverno em ' + dw + (dw === 1 ? ' dia' : ' dias');
    fc.classList.toggle('soon', ck.season !== 3 && dw <= 10);
    paintEvent();
    const h = Math.floor(ck.hour), m = Math.floor((ck.hour - h) * 60 / 10) * 10;
    $('#clock').textContent = pad(h) + ':' + pad(m);
    $('#temp').textContent = Math.round(S.temp) + ' °C';
    const wk = S.precip || (Sim.weatherOf(S, ck.day).kind === 'nublado' ? 'nublado' : 'limpo');
    $('#weather-ico').src = ic(wk === 'limpo' && (ck.hour < 6 || ck.hour >= 19) ? 'energia' : wk);
    $('#weather-ico').alt = { limpo: 'Céu limpo', nublado: 'Nublado', chuva: 'Chuva', neve: 'Neve' }[wk];
    paintStock();
    paintVontades(false);
    paintGoals();
    paintBuilds();
    paintPeople();
    paintInspector();
    paintGod();
    document.querySelectorAll('.spd[data-speed]').forEach((b) => b.classList.toggle('on', +b.dataset.speed === UI.hooks.getSpeed()));
  };

  // faixa do almanaque: o que o Narrador trouxe (ou está trazendo)
  const EV_ICON = { lobos: 'lobo', nevasca: 'neve', tempestade: 'chuva', seca: 'seca', andarilho: 'pessoa', fartura: 'frutas', piracema: 'peixe', veranico: 'verao', onca: 'onca', mascate: 'mascate', praga: 'praga' };
  function paintEvent() {
    const el = $('#event-line'), st = G.Narr.status(S);
    if (!st) { if (!el.hidden) { el.hidden = true; delete document.body.dataset.ev; } return; }
    el.hidden = false; document.body.dataset.ev = st.k;
    el.className = 'event-line small ' + st.tone;
    const img = el.querySelector('img'), src = ic(EV_ICON[st.k] || 'deus');
    if (img.getAttribute('src') !== src) img.src = src;
    const sp = el.querySelector('span');
    if (sp.textContent !== st.text) sp.textContent = st.text;
  }
  function paintStock() {
    const st = S.stock, T = G.Tech;
    // o que ainda não existe no jogo não aparece; o que já apareceu fica, mesmo zerado
    const seen = S.stats.stockSeen || (S.stats.stockSeen = {});
    for (const [k] of RES) if (!RES_BASE.has(k) && st[k] > 0) seen[k] = 1;
    if (T.known(S, 'pedra')) seen.ferramentas = 1;
    const html = RES.filter(([k]) => RES_BASE.has(k) || seen[k]).map(([k, icn]) => `<span class="it" title="${RES_NAME[k]}"><img class="ico" src="${ic(icn)}" alt="${RES_NAME[k]}">${k === 'agua' ? st.agua + '/' + T.waterCap(S) : st[k]}</span>`).join('') +
      `<span class="food">Comida para <b>${S.ctx.foodDays < 1 ? 'menos de 1 dia' : Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias')}</b>` +
      (S.stats.rottedToday ? ` · estragaram ${S.stats.rottedToday} ontem` : '') + `</span>`;
    setHTML($('#stock'), html);
  }
  function paintVontades(force) {
    document.querySelectorAll('.vrow').forEach((row) => {
      const w = row.dataset.w, v = S.vontades[w] | 0;
      const open = G.Tech.workOpen(S, w);
      if (row.hidden === open) row.hidden = !open;
      if (!open) return;
      row.querySelectorAll('button').forEach((b) => {
        const l = +b.dataset.l;
        b.classList.toggle('fill', l > 0 && l <= v);
        b.classList.toggle('off0', l === 0 && v === 0);
        b.setAttribute('aria-checked', l === v ? 'true' : 'false');
      });
      const who = S.people.filter((p) => p.alive && p.act && p.act.type === w).map((p) => p.name);
      row.querySelector('.who').textContent = who.length ? who.join(', ') : '';
    });
  }
  // metas: quantas já foram e as próximas 4 (a primeira com a dica); cada uma mostra o Poder que rende
  function paintGoals() {
    const done = S.goals.filter((g) => g.done).length;
    $('#goals-title').textContent = (S.goalsPhase === 4 ? (S.stats.aldeiaGoals ? 'A aldeia tomou forma' : 'Metas da Aldeia') : S.stats.eraEnd ? 'Era da Família completa' : S.goalsPhase === 3 ? 'Metas das Descobertas' : S.goalsPhase === 2 ? 'Metas da Família' : 'Metas do Ato 1') +
      ' · ' + done + ' de ' + S.goals.length;
    const open = S.goals.filter((g) => !g.done).slice(0, 4);
    const html = open.map((g, i) => {
      const hint = i === 0 && GOAL_HINT[g.id] ? `<span class="hint">${esc(GOAL_HINT[g.id])}</span>` : '';
      const rw = g.reward ? `<span class="rw" title="Poder que a meta rende">+${g.reward}</span>` : '';
      return `<li class="${i === 0 ? 'next' : ''}${g.opt ? ' opt' : ''}"><span class="box"></span><span>${esc(g.text)}${hint}</span>${rw}</li>`;
    }).join('') || '<li class="done"><span class="box"></span><span>Todas cumpridas.</span></li>';
    setHTML($('#goals'), html);
  }
  function paintBuilds() {
    document.querySelectorAll('.bbtn').forEach((b) => {
      if (b.dataset.tool === 'cerca') {
        const open = G.Tech.known(S, 'cerca');
        if (b.hidden === open) b.hidden = !open;
        b.classList.toggle('on', !!(UI.hooks.fencing && UI.hooks.fencing()));
        const lack = b.querySelector('[data-c]'); if (lack) lack.classList.toggle('lack', S.stock.madeira < 1);
        return;
      }
      if (b.dataset.tool) { b.classList.toggle('on', !!(UI.hooks.roading && UI.hooks.roading())); return; }
      const d = C.BUILD[b.dataset.build];
      // Etapa 13: o cemitério aparece depois do primeiro inverno ou da primeira morte, e some quando já há um (o povo só usa um)
      const open = G.Tech.buildOpen(S, b.dataset.build) && (b.dataset.build !== 'cemiterio' || !G.Memoria || !S.memoria || (!G.Memoria.cemetery(S) && (S.stats.winters >= 1 || S.stats.lastDeathAt > 0 || S.memoria.corpos.length > 0)));
      if (b.hidden === open) b.hidden = !open;
      b.classList.toggle('on', UI.hooks.placing() === b.dataset.build);
      b.querySelectorAll('[data-c]').forEach((s) => s.classList.toggle('lack', S.stock[s.dataset.c] < d.cost[s.dataset.c]));
    });
  }
  function barCls(v) { return v < 25 ? 'low' : v < 50 ? 'mid' : ''; }
  UI.ageText = function (st, p) {
    const F = G.Family, y = F.age(st, p);
    if (y < 1) return p.sex === 'F' ? 'recém-nascida' : 'recém-nascido';
    const lbl = F.stageLabel(st, p);
    return (y === 1 ? '1 ano' : y + ' anos') + (lbl === 'adulto' || lbl === 'adulta' ? '' : ' · ' + lbl);
  };
  const anos = (y) => (y === 1 ? '1 ano' : y + ' anos');
  // quem morreu fica com a idade que tinha (a conta pelo relógio seguiria somando anos)
  const yearsOf = (p) => Math.max(0, Math.floor(((p.alive || !p.diedAt ? S.t : p.diedAt) - p.born) / (C.DAY_MIN * C.YEAR_DAYS)));
  // rola só a lista (scrollIntoView mexeria também nos painéis de fora)
  function scrollTo(list, el, center) {
    const a = list.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!a.height || !b.height) return;
    if (center) list.scrollTop += (b.top + b.height / 2) - (a.top + a.height / 2);
    else if (b.top < a.top) list.scrollTop += b.top - a.top - 4;
    else if (b.bottom > a.bottom) list.scrollTop += b.bottom - a.bottom + 4;
  }

  // ---------- a lista do povo ----------
  // Vila grande: busca pelo nome, quatro ordens e, com mais de COMPACT_AT vivos, cartões de uma linha. Cada cartão é
  // montado uma vez e guardado em `cards`; a cada pintura só muda o que mudou (texto e barras), e a lista fechada nem
  // isso. Mudou a gente ou a ordem: os cartões trocam de lugar, sem refazer o HTML.
  const COMPACT_AT = 16;
  const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  const worst = (p) => Math.min(p.needs.fome, p.needs.sede, p.needs.calor, p.needs.saude);
  const SORTS = {
    idade: (a, b) => a.born - b.born,                                    // os mais velhos primeiro (como sempre foi)
    nome: (a, b) => byName.compare(a.name, b.name),
    ajuda: (a, b) => worst(a) - worst(b),                                // a menor entre fome, sede, calor e saúde
    humor: (a, b) => a.mood - b.mood,                                    // os mais tristes primeiro
  };
  const cards = new Map();   // pid → { el, sig, age, doing, bars, v }
  let listQ = '', listSort = 'idade', listSig = '', listOrder = [], listAt = -1e9, listBusy = 0, listDrawn = null, selCard = 0;
  function listTouched() { listBusy = performance.now() + 4000; }
  // a ordem em uso (os vivos na frente), que também vale para o anterior e o próximo da ficha. Idade e nome só mudam
  // quando muda a gente; ajuda e humor mudam o tempo todo: refaz a cada 3 s, e nunca enquanto o jogador mexe na lista
  function order() {
    const now = performance.now(), dyn = listSort === 'ajuda' || listSort === 'humor';
    let sig = listSort + '|';
    for (const p of S.people) sig += p.id + (p.alive ? 'a' : 'd') + ',';
    if (sig !== listSig || (dyn && now - listAt > 3000 && now > listBusy)) {
      const f = SORTS[listSort] || SORTS.idade, dead = listSort === 'nome' ? SORTS.nome : SORTS.idade;
      const next = S.people.slice().sort((a, b) => (b.alive - a.alive) || (a.alive ? f(a, b) : dead(a, b)) || a.id - b.id);
      listSig = sig; listAt = now;
      if (next.length !== listOrder.length || next.some((p, i) => p !== listOrder[i])) listOrder = next;
    }
    return listOrder;
  }
  function cardHTML(p, compact) {
    const pv = p.sangue && G.Povos ? `<img class="ico pv" src="${ic(G.Povos.iconOf(p))}" alt="" title="${esc(G.Povos.label(p))}">` : '';   // Etapa 12
    const nm = `<span class="nm">${pv}${esc(p.name)}${p.alive ? '' : ' †'}${p.alive && p.escolhido && G.Deus ? ` <span class="ttl">${esc(G.Deus.title(p))}</span>` : ''}</span>`;
    const bars = p.alive ? `<div class="minibars">${NEEDS.slice(0, 4).map(([k, lbl, icn]) => `<div class="mb" title="${lbl}"><img class="ico" src="${ic(icn)}" alt=""><div class="bar"><i data-n="${k}"></i></div></div>`).join('')}</div>` : '';
    // compacto: nome, idade e o que faz numa linha só; barras finas
    if (compact) return `<div class="row1">${nm}<span class="small muted age"></span><span class="doing"></span></div>${bars}`;
    return `<div class="row1">${nm}<span class="small muted age"></span></div><div class="doing"></div>${bars}`;
  }
  function paintPeople() {
    const list = $('#people');
    let alive = 0;
    for (const p of S.people) if (p.alive) alive++;
    setText($('#povo-title'), 'Seu povo · ' + alive);
    if (!UI.isOpen('povo')) return;
    const ord = order(), compact = alive > COMPACT_AT;
    const key = (compact ? 'c' : 'f') + listQ;
    if (ord !== listDrawn || key !== list._key) {
      listDrawn = ord; list._key = key;
      const want = listQ ? ord.filter((p) => norm(p.name).indexOf(listQ) >= 0) : ord;
      const keep = new Set();
      let i = 0;
      for (const p of want) {
        let c = cards.get(p.id);
        if (!c) { c = { el: document.createElement('button'), sig: '' }; c.el.type = 'button'; c.el.dataset.pid = p.id; cards.set(p.id, c); }
        if (list.children[i] !== c.el) list.insertBefore(c.el, list.children[i] || null);
        keep.add(p.id); i++;
      }
      while (list.children.length > i) list.removeChild(list.lastChild);
      for (const id of [...cards.keys()]) if (!keep.has(id)) cards.delete(id);
      list.classList.toggle('compact', compact);
      const none = $('#povo-empty');
      if (none.hidden !== !!want.length) none.hidden = !!want.length;
    }
    const compactNow = list.classList.contains('compact');
    for (const p of ord) {
      const c = cards.get(p.id); if (!c) continue;
      // o cartão é refeito só quando muda quem ele é (nome, vivo, escolhido) ou o jeito da lista
      const sig = p.name + '|' + (p.alive ? 'a' : 'd') + (p.alive && p.escolhido ? p.escolhido.power : '') + (compactNow ? 'c' : 'f') + (p.povo || '');
      if (c.sig !== sig) {
        c.sig = sig;
        c.el.className = 'pcard' + (compactNow ? ' compact' : '') + (p.alive ? '' : ' dead') + (p.id === selCard ? ' sel' : '');
        c.el.innerHTML = cardHTML(p, compactNow);
        c.el.removeAttribute('title');
        c.age = c.el.querySelector('.age'); c.doing = c.el.querySelector('.doing'); c.bars = [...c.el.querySelectorAll('i[data-n]')]; c.v = {};
      }
      const y = yearsOf(p);
      const age = !p.alive || compactNow ? (y < 1 && p.alive ? 'bebê' : anos(y)) : UI.ageText(S, p);
      if (c.v.age !== age) { c.v.age = age; c.age.textContent = age; }
      const doing = AI.describe(S, p);
      if (c.v.doing !== doing) { c.v.doing = doing; c.doing.textContent = doing; if (compactNow) c.el.title = doing; }   // na linha só, o texto pode ficar cortado
      for (const b of c.bars) {
        const k = b.dataset.n, v = Math.max(0, Math.min(100, Math.round(p.needs[k])));
        if (c.v[k] !== v) { c.v[k] = v; b.style.width = v + '%'; b.className = barCls(v); }
      }
    }
    // o escolhido: só a moldura muda de cartão (e a lista rola até ele, se ele estiver fora da vista)
    if (selCard !== UI.sel.person) {
      const old = cards.get(selCard), cur = cards.get(UI.sel.person);
      if (old) old.el.classList.remove('sel');
      selCard = UI.sel.person;
      if (cur) { cur.el.classList.add('sel'); scrollTo(list, cur.el); }
    }
  }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  const fmtN = (n) => Math.floor(n).toLocaleString('pt-BR');
  function paintGod() {
    const g = S.god; if (!g) return;
    $('#poder-num').textContent = Math.floor(g.poder);
    $('#poder-bar').style.width = Math.min(100, g.poder / C.POWER_BAR * 100) + '%';
    $('#align-mark').style.left = ((g.align + 100) / 2) + '%';
    // Etapa 11: o nome, o nível e o que falta para o próximo
    const Dz = G.Deus;
    if (Dz && g.pending) {
      const lv = Dz.level(S), def = Dz.levelDef(lv), nx = Dz.next(S);
      setText($('#deus-title'), g.name || 'Deus');
      setText($('#deus-sub'), (g.name ? g.epithet + ' · ' : '') + def.name + ', nível ' + lv);
      setText($('#deus-next'), nx ? 'Nível ' + (lv + 1) + ': glória ' + fmtN(g.glory) + '/' + fmtN(nx.glory) + ' · fiéis ' + Dz.fieis(S) + '/' + nx.fieis : 'Níveis, dons e grandes atos');
      const bd2 = $('#badge-dom'), pend = !!Dz.pending(S) || !!(G.Memoria && G.Memoria.pending(S));
      if (bd2.hidden === pend) bd2.hidden = !pend;
      $('#btn-deus').classList.toggle('pend', pend);
    }
    document.querySelectorAll('.mbtn').forEach((b) => {
      const k = b.dataset.mir, m = G.God.MIRACLES[k], open = G.God.unlocked(S, k), cost = G.God.cost(S, k);
      b.classList.toggle('poor', g.poder < cost);
      b.classList.toggle('locked', !open);
      b.title = open ? m.desc : G.God.lockedText(k) + ' ' + m.desc;
      b.classList.toggle('on', UI.hooks.casting() === k);
      setText(b.querySelector('.cost'), cost + ' de Poder');
    });
    const pr = S.people.filter((p) => p.alive && p.prayer);
    const html = pr.map((p) => {
      const h = Math.max(0, Math.ceil((p.prayer.until - S.t) / 60));
      const help = G.God.MIRACLES[G.God.PRAYER_HELP[p.prayer.kind]].name;
      return `<li><button data-pid="${p.id}"><span class="q">“${esc(p.prayer.text)}”</span><span class="meta">${esc(p.name)} · faltam ${h} h · atenda com ${help}</span></button></li>`;
    }).join('');
    setHTML($('#prayers'), html);
    const bd = $('#badge-deus');
    if (bd) {
      const n = UI.isOpen('deus') ? 0 : pr.length;
      if (bd.hidden !== !n) bd.hidden = !n;
      if (n && bd.textContent !== String(n)) bd.textContent = String(n);
    }
  }
  // ---------- a ficha da pessoa (#p-pessoa) ----------
  // A ficha é uma pilha de blocos com nome, na ordem em que aparecem. Cada bloco só é trocado quando o HTML dele muda
  // (as barras mudam o tempo todo; um botão ali ao lado não some debaixo do clique). Bloco vazio não ocupa lugar.
  // Para acrescentar uma linha, basta mais uma entrada em `blocos`, em paintInspector.
  function paintBlocks(root, blocks) {
    let i = 0;
    for (const k of Object.keys(blocks)) {
      let el = root.children[i];
      if (!el || el.dataset.b !== k) {
        el = [...root.children].find((x) => x.dataset.b === k) || document.createElement('div');
        el.dataset.b = k; el.className = 'ib ib-' + k;
        root.insertBefore(el, root.children[i] || null);
      }
      setHTML(el, blocks[k] || '');
      i++;
    }
    while (root.children.length > i) root.removeChild(root.lastChild);
  }
  const sec = (title, html) => `<span class="small muted sec">${title}</span>${html}`;
  let inspPid = 0;
  function paintInspector() {
    paintObra();
    const el = $('#inspector');
    if (UI.sel.person) {
      const p = S.people.find((q) => q.id === UI.sel.person);
      if (!p) { UI.select(0, 0); return; }   // não existe mais (mundo trocado)
      if (!UI.isOpen('pessoa')) return;      // no celular a ficha divide a gaveta com os outros painéis
      const n = p.needs;
      const need = (icn, lbl, v) => { const w = Math.max(0, Math.min(100, Math.round(v))); return `<div class="need" title="${lbl}"><img class="ico" src="${ic(icn)}" alt=""><span>${lbl}</span><div class="bar"><i class="${barCls(w)}" style="width:${w}%"></i></div><span class="v">${w}</span></div>`; };
      const needs = NEEDS.map(([k, lbl, icn]) => need(icn, lbl, n[k])).join('') + need('humor', 'Humor', p.mood) + need('deus', 'Fé', p.fe);
      const mems = p.mem.slice().sort((a, b) => Math.abs(Sim.MEM[b.k].v) - Math.abs(Sim.MEM[a.k].v)).slice(0, 6)
        .map((m) => { const d = Sim.MEM[m.k]; return `<li class="${d.v >= 0 ? 'pos' : 'neg'}">${d.v > 0 ? '+' : ''}${d.v} ${esc(p.sex === 'F' && d.tf ? d.tf : d.t)}</li>`; }).join('');
      const skills = Object.keys(p.skills).filter((k) => AI.SKILL_LABEL[k] && (['coleta', 'pesca', 'construcao'].indexOf(k) >= 0 || p.skills[k] > 0))
        .map((k) => `<span>${AI.SKILL_LABEL[k]}</span><span>nível ${AI.lvl(p, k)}</span>`).join('');
      const F = G.Family;
      // família: par, pais, filhos, irmãos, avós, netos
      const groups = {};
      for (const k of F.family(S, p)) {
        const r = k.r, lbl = { companheira: 'Companheira', companheiro: 'Companheiro', 'mãe': 'Mãe', pai: 'Pai', filha: 'Filhos', filho: 'Filhos', 'irmã': 'Irmãos', 'irmão': 'Irmãos', 'avó': 'Avós', 'avô': 'Avós', neta: 'Netos', neto: 'Netos' }[r];
        if (!lbl) continue;
        const who = esc(k.q.name) + (k.q.alive ? (lbl === 'Filhos' || lbl === 'Irmãos' || lbl === 'Netos' ? ' (' + F.age(S, k.q) + ')' : '') : ' †');
        (groups[lbl] = groups[lbl] || []).push(who + (lbl.startsWith('Compan') && k.q.alive ? ' · afeto ' + Math.round(F.afeto(p, k.q)) : ''));
      }
      const fam = ['Companheira', 'Companheiro', 'Mãe', 'Pai', 'Filhos', 'Irmãos', 'Avós', 'Netos'].filter((k) => groups[k])
        .map((k) => `<span>${k}${k.startsWith('Compan') && groups[k].length > 1 ? 's' : ''}</span><span>${groups[k].join(', ')}</span>`).join('');
      let state = '';
      if (p.alive && p.labor) state = p.labor.hard && !p.labor.helped ? 'Parto difícil. A Cura salva mãe e bebê.' : 'Em trabalho de parto.';
      else if (p.alive && p.preg && p.preg.known) { const d = Math.max(1, Math.ceil((p.preg.due - S.t) / C.DAY_MIN)); state = 'Grávida · o bebê chega em ' + d + (d === 1 ? ' dia.' : ' dias.'); }
      const who = p.sex === 'F' ? 'Ela' : 'Ele';
      // Etapa 11: o escolhido, o cético que junta sinais, quem chegou à fé inteira
      let godLine = '';
      const Dz = G.Deus;
      if (p.alive && Dz && S.god && S.god.pending) {
        if (p.escolhido) godLine = `<p class="small god-line txt"><b>${esc(Dz.title(p))}</b> de ${esc(Dz.call(S))}: ${esc(Dz.POWERS[p.escolhido.power].desc)}</p>`;
        else if (Sim.has(p, 'Cético') && (p.sinais || 0) > 0) godLine = `<p class="small muted">Já viu ${Math.floor(p.sinais)} de ${C.CONVERTE_SINAIS} sinais de ${esc(Dz.call(S))}. Com os sinais e fé ${C.CONVERTE_FE}, se converte.</p>`;
        else if (Dz.full100(S, p) && F.age(S, p) >= C.UNGIR_AGE && !p.carriedBy) godLine = Dz.level(S) >= 3 ? `<p class="small god-line">Fé inteira. <button class="btn btn-small" data-act="ungir">Dar um poder</button></p>` : `<p class="small god-line">Fé inteira. No nível 3 de Deus, pode receber um poder.</p>`;
      }
      // Etapa 6: a última conversa e quem está brigado
      const talk = p.alive && p.talk && S.t - p.talk.t < 2 * C.DAY_MIN ? `<div class="talk"><span class="small muted">Última conversa${p.talk.kind === 'briga' ? ' (briga)' : p.talk.kind === 'consolo' ? ' (consolo)' : p.talk.kind === 'pazes' ? ' (pazes)' : ''}</span>${p.talk.lines.map(([n, t]) => `<p><b>${esc(n)}:</b> “${esc(t)}”</p>`).join('')}</div>` : '';
      const feud = p.alive && p.feud ? Object.keys(p.feud).filter((id) => p.feud[id] > S.t).map((id) => { const q = F.person(S, +id); return q && q.alive ? q.name : ''; }).filter(Boolean) : [];
      if (feud.length) state = (state ? state + ' ' : '') + 'Brigad' + (p.sex === 'F' ? 'a' : 'o') + ' com ' + feud.join(' e ') + ': sem se falar por uns dias.';
      // o cabeçalho da caixa: o nome (e o título de escolhido), quem é e a idade
      setHTML($('#pessoa-title'), esc(p.name) + (p.alive ? '' : ' †') + (p.alive && p.escolhido && Dz ? ` <span class="ttl">${esc(Dz.title(p))}</span>` : ''));
      setText($('#pessoa-sub'), who + ', ' + (p.alive ? UI.ageText(S, p) : anos(yearsOf(p))));
      paintSheetTools(p);
      // no alto o essencial (o que faz, o estado, a oração, os traços, o que carrega); depois as barras; depois a
      // família, as habilidades, as lembranças e a última conversa
      const blocos = {
        faz: `<p class="small">${p.alive ? esc(AI.describe(S, p)) + ' · ' + feel(p.tempHere) : esc(AI.describe(S, p)) + '.'}</p>`,
        cova: covaHTML(p),   // Etapa 13: o corpo, a cova, quem volta com flores
        estado: state ? `<p class="small preg">${esc(state)}</p>` : '',
        deus: godLine,
        rito: ritoLine(p),
        reza: p.prayer ? `<p class="story">Reza: “${esc(p.prayer.text)}”</p>` : '',
        tracos: `<div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(Sim.TRAIT_DESC[t])}">${esc(t)}</span>`).join('')}${criadoChip(p)}</div>`,
        povo: povoChips(p),   // Etapa 12: o povo da pessoa e os dons dela
        posses: p.alive ? gear(p) : '',
        barras: p.alive ? `<div class="needs">${needs}</div>` : '',
        familia: fam ? sec('Família', `<div class="kv fam">${fam}</div>`) : '',
        nome: p.alive && (p.mother || p.father) && F.age(S, p) < 3 ? '<div class="chips"><button class="btn btn-small" data-act="rename">Dar outro nome</button></div>' : '',
        saberes: p.carriedBy || !skills ? '' : sec('Habilidades', `<div class="kv">${skills}</div>`),
        lembrancas: mems ? sec('Lembranças', `<ul class="mems">${mems}</ul>`) : '',
        contos: contosPessoa(p),
        conversa: talk,
      };
      let box = el.firstElementChild;
      if (!box) { el.innerHTML = '<div class="insp"></div>'; box = el.firstElementChild; }
      paintBlocks(box, blocos);
      if (inspPid !== p.id) { inspPid = p.id; el.scrollTop = 0; }   // outra pessoa: a ficha volta para o alto
      return;
    }
    if (inspPid) { inspPid = 0; el.innerHTML = ''; }
  }
  // os botões da ficha: seguir (liga e desliga), a posição entre os vivos na ordem da lista, anterior e próximo
  function paintSheetTools(p) {
    const fol = $('#pessoa-follow'), on = !!p.alive && UI.hooks.following() === p.id;
    if (fol.disabled !== !p.alive) fol.disabled = !p.alive;
    if (fol.classList.contains('on') !== on) {
      fol.classList.toggle('on', on);
      fol.setAttribute('aria-pressed', on ? 'true' : 'false');
      fol.querySelector('span').textContent = on ? 'Seguindo' : 'Seguir';
    }
    const alive = order().filter((q) => q.alive), i = alive.indexOf(p);
    setText($('#pessoa-pos'), i >= 0 ? (i + 1) + ' de ' + alive.length : alive.length === 1 ? '1 vivo' : alive.length + ' vivos');
    const stuck = !alive.length || (alive.length === 1 && i === 0);   // não há para onde ir
    for (const id of ['#pessoa-prev', '#pessoa-next']) { const b = $(id); if (b.disabled !== stuck) b.disabled = stuck; }
  }
  // o painel da obra: o nível, o que ela faz agora, a evolução (melhorias) e remover
  function paintObra() {
    const el = $('#obra');
    const b = UI.sel.building ? Sim.building(S, UI.sel.building) : null;
    if (!b) {
      if (el.innerHTML) el.innerHTML = '';
      lastInsp = '';
      if (UI.sel.building) UI.select(0, 0);   // a obra saiu do mapa
      return;
    }
    const d = Sim.def(b), job = Sim.jobOf(b);
    const opts = Sim.upgrades(S, b);
    // 0.12: a obra pode estar sendo desmontada, mudando de lugar, sendo erguida de novo, ou ser só o lugar reservado
    const mov = b.site ? 's' : b.demol ? (b.demol.site ? 'm' : 'd') : b.re ? 'r' : '';
    const sig = b.id + ':' + (d.lv || 1) + (d.kind || '') + (b.built ? 1 : 0) + mov + (b.up ? 'u' + b.up.lv + (b.up.kind || '') : '') + '|' + opts.map((o) => (o.kind || '') + (o.why ? 0 : 1)).join(',');
    if (lastInsp !== sig) {
      lastInsp = sig;
      $('#obra-title').textContent = d.name;
      const wait = b.site ? ' · lugar reservado' : b.re ? ' · mudou para cá, por erguer' : b.built ? '' : ' · marcada, esperando o povo';
      const lv = C.BUILD[b.type].up ? `<p class="small muted">Nível ${d.lv || 1}${d.max ? ', o último' : ''}${wait}</p>` : wait ? '<p class="small muted">' + wait.slice(3, 4).toUpperCase() + wait.slice(4) + '</p>' : '';
      const btn = (act, text, icon) => `<button class="btn btn-small" data-act="${act}">${icon && ic(icon) ? '<img class="ico" src="' + ic(icon) + '" alt="">' : ''}${text}</button>`;
      const acts = b.site ? btn('remove', 'Cancelar mudança') :
        b.demol ? btn('undemolish', b.demol.site ? 'Cancelar mudança' : 'Cancelar demolição') :
        b.up ? btn('remove', 'Cancelar melhoria') :
        b.re ? btn('remove', 'Desistir da obra') :
        !b.built ? btn('remove', 'Cancelar obra') :
        (Sim.canMove(S, b) ? btn('move', 'Mudar de lugar', 'mover') : '') + btn('demolish', 'Demolir', 'demolir');
      el.innerHTML = `<div class="insp">
        ${lv}
        <p class="small muted">${esc(d.desc)}</p>
        <p class="small" id="bstatus"></p>
        <div id="bextra"></div>
        ${b.built && !b.up && !b.demol && opts.length ? upgradeHTML(b, opts) : ''}
        <div class="chips">${acts}</div>
        ${b.built && !b.up && !b.demol ? '<p class="small muted">' + (Sim.canMove(S, b) ? 'Mudar: o povo desmonta e ergue de novo no lugar que você marcar. ' : 'Esta obra não muda de lugar: marque outra e demola esta. ') + 'Demolir devolve metade do material.</p>' : ''}
      </div>`;
    }
    const st = el.querySelector('#bstatus'); if (st) st.textContent = buildingStatus(b, d, job);
    const ex = el.querySelector('#bextra'); if (ex) setHTML(ex, b.built ? (b.type === 'estatua' ? estatuaHTML(b) : b.type === 'cemiterio' ? cemHTML() : campoHTML(b)) : '');
  }
  function costText(cost) {
    const parts = Object.keys(cost || {}).map((k) => cost[k] + ' de ' + (MAT_WORD[k] || k));
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1] : parts[0] || 'nada';
  }
  // o que a obra está fazendo agora (atualiza a cada quadro)
  function buildingStatus(b, d, job) {
    const T = G.Tech;
    if (b.site) {
      const from = Sim.building(S, b.site);
      return 'Lugar reservado. ' + (from ? (Sim.def(from).a === 'o' ? 'O ' : 'A ') + Sim.def(from).name.toLowerCase() + ' vem para cá: o povo desmonta lá (' + Math.floor(((from.demol && from.demol.progress) || 0) * 100) + '%) e ergue de novo aqui.' : '');
    }
    if (b.demol) return (b.demol.site ? 'Mudando de lugar: o povo está desmontando. ' : 'Marcada para demolir. ') + 'Trabalho ' + Math.floor(b.demol.progress * 100) + '%' + (S.vontades.construir ? '.' : ' · Construir está proibido nas Vontades.');
    if (job) {
      const mats = Object.keys(job.cost);
      const need = mats.reduce((n, k) => n + job.cost[k], 0), have = mats.reduce((n, k) => n + Math.min(job.cost[k], job.have[k] || 0), 0);
      const short = mats.filter((k) => (job.have[k] || 0) < job.cost[k] && (S.stock[k] || 0) <= 0);
      return (b.up ? 'Melhorando para ' + Sim.upDef(b).name.toLowerCase() + '. ' : b.re ? 'Sendo erguida de novo. ' : 'Em obra. ') +
        'Material ' + have + '/' + need + (job.progress > 0 ? ' · trabalho ' + Math.floor(job.progress * 100) + '%' : '') +
        (short.length && job.progress <= 0 ? ' · falta ' + short.map((k) => MAT_WORD[k] || k).join(' e ') + ' no estoque' + (short.includes('tabuas') ? ' (a marcenaria faz)' : short.includes('fibra') ? ' (vem da casca das árvores cortadas)' : '') : '');
    }
    if (b.type === 'roca' && G.Campo) return rocaStatus(b);
    if (b.type === 'estatua' && G.Deus) return estatuaStatus(b);
    if (b.type === 'cemiterio') return G.Memoria && S.memoria ? cemStatus(b, d) : '';   // Etapa 13
    if (b.type === 'curral' && G.Campo) return curralStatus(b, d);
    const f = d.fire;
    if (b.type === 'fogueira') return (b.fuel > 0 ? 'Acesa · lenha ' + b.fuel.toFixed(1) + '/' + C.FIRE_CAP : 'Apagada · o povo reacende quando esfriar') +
      ' · ' + f.seats + ' dormem no calor · histórias para até ' + f.listen;
    if (b.type === 'moquem' || b.type === 'jirau') return batchText(b, d);
    if (b.type === 'forno') return 'Água no estoque: ' + S.stock.agua + ' de ' + T.waterCap(S) + '.';
    if (b.type === 'armazem') return 'Guardando comida para ' + Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias') + (S.stats.rottedToday ? ' · ontem estragaram ' + S.stats.rottedToday : '') + '. O lobo não leva nada.';
    if (b.type === 'mina' && G.Minas) {
      const Mi = G.Minas, who = S.people.filter((p) => p.alive && p.act && p.act.type === 'mina' && p.act.b === b.id).map((p) => p.name), got = S.stats.minaGot || {};
      const lv = d.mine.lv, Y = C.MINA_YIELD, pc = (k) => Math.round(Y[k][lv - 1] * 100) + '%';
      const saiu = ['carvao', 'minerio', 'prata', 'ouro', 'gemas'].filter((k) => got[k]).map((k) => got[k] + ' de ' + Mi.WORD[k]);
      return (who.length ? 'Lá dentro: ' + who.join(', ') + ' (' + who.length + ' de ' + d.mine.cap + '). ' : 'Vazia. Com Mineração nas Vontades, até ' + d.mine.cap + ' trabalham aqui. ') +
        'Cada turno dá ' + Y.pedra[lv - 1] + ' de pedra; a sorte: carvão ' + pc('carvao') + ', minério ' + pc('minerio') + (lv >= 2 ? ', prata ' + pc('prata') + ', ouro ' + pc('ouro') + ', pedra preciosa ' + pc('gemas') : '') + '.' +
        (saiu.length ? ' Já saíram ' + listPT(saiu) + '.' : '');
    }
    if (b.type === 'ferraria' && G.Minas) {
      const Mi = G.Minas, who = S.people.filter((p) => p.alive && p.act && p.act.type === 'oficio' && p.act.shop === b.id).map((p) => p.name), fs = Mi.forgers(S);
      return (who.length ? 'Na forja: ' + who.join(', ') + '. ' : fs.length ? 'Sabem forjar: ' + listPT(fs.slice(0, 4).map((p) => p.name)) + (fs.length > 4 ? ' e mais ' + (fs.length - 4) : '') + '. ' : 'Ninguém sabe forjar ainda: é coisa de ferreiro nato (os anões) ou de quem tem Ofício no nível ' + C.FORJA_LVL + '. ') +
        'Ferramenta de ferro: ' + C.FERRO_COST.minerio + ' de minério e ' + C.FERRO_COST.carvao + ' de carvão, em ' + Math.round(C.FERRO_MIN / d.shop.speed) + ' min. No estoque: minério ' + S.stock.minerio + ', carvão ' + S.stock.carvao + ', ferramentas de ferro ' + S.stock.ferro + '.' +
        (d.shop.joias ? ' Joia: 1 de prata ou de ouro, em ' + Math.round(C.JOIA_MIN / d.shop.speed) + ' min.' : '');
    }
    if (d.shop) {
      const who = S.people.filter((p) => p.alive && p.act && p.act.type === 'oficio' && p.act.shop === b.id).map((p) => p.name);
      const make = d.shop.k === 'tabuas' ? 'Tábuas: 2 de madeira dão 1, em ' + Math.round(C.TABUA_MIN / d.shop.speed) + ' min. No estoque: ' + S.stock.tabuas + '.' :
        'Manta: 3 de fibra · rede: 4 de fibra, em ' + Math.round(C.TECIDO_MIN / d.shop.speed) + ' min cada. Fibra no estoque: ' + S.stock.fibra + '.';
      return (who.length ? 'Trabalhando: ' + who.join(', ') + '. ' : 'Com Ofício nas Vontades, o povo trabalha aqui quando falta. ') + make;
    }
    const nm = (id) => { const q = S.people.find((x) => x.id === +id && x.alive); return q ? q.name : ''; };
    const guests = Object.keys(b.guests || {}).filter((id) => b.guests[id] > S.t).map(nm).filter(Boolean);
    return 'Dormem aqui: ' + (b.beds.map(nm).filter(Boolean).join(', ') || 'ninguém ainda') +
      ' · ' + G.Family.bedLoad(S, b) + ' de ' + d.cap + ' lugares · +' + d.heat + ' °C' + (guests.length ? ' · esta noite, de visita: ' + guests.join(', ') : '');
  }
  // ---------- Etapa 10: roça e curral no inspetor ----------
  const dias = (n) => (n === 1 ? '1 dia' : n + ' dias');
  function rocaStatus(b) {
    const K = G.Campo, f = K.farmOf(b), out = [];
    const nm = (k) => (C.ROCA[k] ? C.ROCA[k].name.toLowerCase() : '');
    if (f.st === 'vazia') {
      const k = K.cropOf(S, b), why = f.pick ? K.plantWhy(S, f.pick) : '';
      out.push(k ? 'Terra lavrada: o povo vai plantar ' + nm(k) + '.' : f.pick ? 'Esperando para plantar ' + nm(f.pick) + ': ' + why + '.' : 'Terra lavrada. No inverno só a mandioca vai para a terra.');
      if (!(S.vontades.roca | 0)) out.push('Roça está proibida nas Vontades.');
    } else if (f.st === 'crescendo') {
      const left = K.daysLeft(S, f.k, f.grow);
      out.push((f.k === 'algodao' ? 'Algodão' : C.ROCA[f.k].name) + ' crescendo: ' + Math.floor(f.grow * 100) + '%' + (left < Infinity ? ', madura em ' + dias(left) : ', parada no frio') + '.');
      if (f.mato && !f.weeded) out.push('O mato apareceu: falta capinar.');
      else if (f.weeded) out.push('Capinada.');
    } else out.push((C.ROCA[f.k].name) + ' madur' + (f.k === 'feijao' || f.k === 'milho' || f.k === 'algodao' ? 'o' : 'a') + ': hora de colher!' +
      (S.t - f.ripeAt > C.ROCA[f.k].ripe * C.DAY_MIN * 0.5 ? ' Já está passando do ponto.' : ''));
    if (f.st !== 'vazia') {
      const n = K.yieldOf(S, b);
      out.push('Colheita esperada: ' + n + (f.k === 'algodao' ? ' de fibra' : ' porções') + (f.lost > 0.01 ? ' (perdeu ' + Math.round(f.lost * 100) + '%)' : '') + ((f.bonus || 1) > 1 ? ' · fartura +25%' : '') + '.');
    }
    if (f.pile > 0) out.push('No chão, esperando quem leve: ' + f.pile + ' de ' + (f.pileK === 'fibra' ? 'algodão' : nm(f.pileK)) + '.');
    if (f.last && f.st === 'vazia') out.push('Última colheita: ' + f.last.n + (f.last.k === 'algodao' ? ' de algodão.' : ' de ' + nm(f.last.k) + '.'));
    if (G.Tech.known(S, 'cerca')) out.push(K.enclosed(S, b) ? 'Cercada: bicho do mato não entra.' : 'Aberta: bicho do mato pode entrar e comer.');
    return out.join(' ');
  }
  function curralStatus(b, d) {
    const K = G.Campo, pe = K.penOf(b), animals = K.animalsOf(S, b), out = [];
    if (!animals.length) out.push(K.known(S, 'criacao') ? 'Vazio. Um mascate passa por estas terras trocando bichos de criação.' : 'Vazio.');
    else out.push('Lugares: ' + (Math.round(K.load(S, b) * 10) / 10) + ' de ' + K.cap(S, b) + '.');
    const wait = [];
    if (pe.ovos >= 1) wait.push(Math.floor(pe.ovos) + (Math.floor(pe.ovos) === 1 ? ' ovo' : ' ovos'));
    if (pe.leite >= 1) wait.push(Math.floor(pe.leite) + ' de leite');
    if (pe.la >= 1) wait.push(Math.floor(pe.la) + ' de lã');
    if (wait.length) out.push('Esperando quem recolha: ' + listPT(wait) + '.');
    const need = K.feedNeed(S, b);
    if (animals.length && (S.ck.season === 3 || pe.feed > 0)) out.push('Ração no cocho para ' + (need > 0 ? Math.floor(pe.feed / need) : 0) + ' dias' + (pe.hungry ? ' · os bichos estão com fome!' : '') + '.');
    if (animals.length) out.push(K.enclosed(S, b) ? 'Cercado: o lobo não entra (a onça pula).' : 'Aberto: de noite o lobo pode levar um bicho.');
    if (animals.length && !(S.vontades.criacao | 0)) out.push('Criação está proibida nas Vontades.');
    return out.join(' ');
  }
  // o que plantar (roça) e quem mora no curral
  function campoHTML(b) {
    const K = G.Campo;
    if (b.type === 'roca') {
      const f = K.farmOf(b);
      const opt = (k, label, icon, title) => `<button class="btn btn-small crop${(f.pick || '') === k ? ' on' : ''}" data-act="crop" data-k="${k}" title="${esc(title)}">${icon ? `<img class="ico" src="${ic(icon)}" alt="">` : ''}${label}</button>`;
      return `<div class="crops"><span class="small muted">O que plantar</span><div class="chips">` + opt('', 'O povo escolhe', '', 'Pela estação e pelo que falta no estoque.') +
        K.crops(S).map((k) => { const c = C.ROCA[k]; return opt(k, c.name, k, c.days + ' dias na primavera · ' + c.yield + (c.fibra ? ' de fibra' : ' porções') + (k === 'mandioca' ? ' · cresce até no inverno' : '')); }).join('') + `</div></div>`;
    }
    if (b.type === 'curral') {
      const by = {};
      for (const a of K.animalsOf(S, b)) { const o = by[a.sp] || (by[a.sp] = { m: 0, f: 0 }); if (a.sex === 'M') o.m++; else o.f++; }
      const keys = C.CRIA_ORDER.filter((sp) => by[sp]);
      if (!keys.length) return '';
      return `<div class="chips herd">` + keys.map((sp) => {
        const o = by[sp], d = C.CRIA[sp], male = d.male ? d.male.toLowerCase() : 'macho', icon = sp === 'galinha' ? 'galinha' : sp === 'gado' ? 'vaca' : sp;
        return `<span class="chip" title="${esc(d.name)}"><img src="${ic('cria:' + icon)}" alt=""> ${o.m + o.f} · ${o.m} ${o.m === 1 ? male : male + 's'}</span>`;
      }).join('') + `</div>`;
    }
    return '';
  }
  // as melhorias possíveis: uma (ou as casas do lugar), com o custo e, quando não dá, o porquê
  const HOUSE_ICON = { oca: 'oca', palafita: 'palafita', barro: 'barro', pedra: 'casapedra' };
  function upgradeHTML(b, opts) {
    const house = opts.some((o) => o.kind);
    const rows = opts.map((o) => {
      const d = o.def, icon = o.kind ? HOUSE_ICON[o.kind] : 'melhorar';
      const cost = Object.keys(d.cost).map((k) => `<span data-c="${k}"><img src="${ic(k)}" alt="${esc(RES_NAME[k] || k)}"> ${d.cost[k]}</span>`).join('');
      return `<button class="btn uprow${o.why ? ' off' : ''}" data-act="upgrade"${o.kind ? ` data-kind="${o.kind}"` : ''}${o.why ? ' disabled' : ''} title="${esc(d.desc)}">
        <img class="ico" src="${ic(icon)}" alt=""><span class="nm">${esc(d.name)}</span><span class="cost">${cost}</span>
        <span class="why">${o.why ? esc(o.why.charAt(0).toUpperCase() + o.why.slice(1)) + '.' : esc(d.desc)}</span></button>`;
    }).join('');
    return `<div class="ups"><span class="small muted">${house ? 'Virar casa: a casa depende do lugar' : 'Melhorar'}</span>${rows}</div>`;
  }
  function feel(t) { return t >= 30 ? 'com calor' : t >= C.COMFORT ? 'confortável' : t >= 8 ? 'com frio' : t >= 0 ? 'com muito frio' : 'congelando'; }
  // ferramenta e roupa de quem está no inspetor
  // Etapa 12: o povo de alguém e os dons (com a fraqueza, de quem é do povo inteiro). Num mundo só de humanos, nada
  function povoChips(p) {
    const Pv = G.Povos;
    if (!Pv || !(S.povos && (S.povos.mixed || p.sangue))) return '';
    const fr = Pv.fraqOf(p), lb = Pv.label(p), b = Pv.body(p);
    const vida = 'Vive uns ' + Math.round(p.velho || b.old) + ' anos.';
    return `<div class="chips povo-chips"><span class="chip povo" title="${esc(vida)}"><img class="ico" src="${ic(Pv.iconOf(p))}" alt="">${esc(lb.charAt(0).toUpperCase() + lb.slice(1))}</span>` +
      Pv.donsOf(p).map((d) => `<span class="chip dom" title="${esc(Pv.DONS[d].desc)}">${esc(Pv.DONS[d].name)}</span>`).join('') +
      (fr ? `<span class="chip fraq" title="${esc(Pv.FRAQ[fr].desc)}">${esc(Pv.FRAQ[fr].name)}</span>` : '') + '</div>';
  }
  function gear(p) {
    const T = G.Tech, out = [];
    // Etapa 8: a ferramenta ganha o nome dos utensílios que o povo já inventou
    const kit = ['faca', 'machado', 'arco'].filter((id) => T.known(S, id)).map((id) => (id === 'arco' ? 'arco' : id));
    const tool = kit.length ? kit[0][0].toUpperCase() + listPT(kit).slice(1) : 'Ferramenta';
    if (T.known(S, 'pedra') && G.Family.age(S, p) >= 12) out.push(p.tool ? (p.tool.fe ? 'De ferro: ' + tool.toLowerCase() : tool) + ' ' + Math.max(1, Math.round(p.tool.dur)) + '%' : 'Sem ferramenta');
    if (p.joia) out.push('Joia');   // Etapa 12
    if (p.roupa) out.push((T.known(S, 'agulha') ? 'Roupa costurada ' : 'Roupa de couro ') + Math.max(1, Math.round(p.roupa.dur)) + '%');
    else if (S.stats.clothesMade && G.Family.age(S, p) >= 3) out.push('Sem roupa de couro');
    if (p.manta) out.push('Manta ' + Math.max(1, Math.round(p.manta.dur)) + '%');
    else if (S.stats.mantasMade && G.Family.age(S, p) >= 3) out.push('Sem manta');
    if (p.rede) out.push('Rede de dormir ' + Math.max(1, Math.round(p.rede.dur)) + '%');
    return out.length ? `<p class="small gear">${esc(out.join(' · '))}</p>` : '';
  }
  // moquém e jirau: o que está na grelha
  function batchText(b, d) {
    const q = b.batch, moq = b.type === 'moquem', cap = moq ? d.smoke.cap : d.dry.cap;
    if (!q) return moq ? 'Vazio. Cabem ' + cap + '. O povo arma quando há 4 ou mais de peixe ou carne e ' + C.MOQUEM_WOOD + ' de madeira (Conservar nas Vontades).' :
      S.ck.season === 3 ? 'Vazio. No inverno não há sol que seque fruta.' : 'Vazio. Cabem ' + cap + '. O povo espalha frutas quando há 4 ou mais (Conservar nas Vontades).';
    const h = Math.max(1, Math.ceil(q.left / 60));
    const what = q.n + ' ' + (q.k === 'frutas' ? (q.n === 1 ? 'fruta' : 'frutas') : q.k);
    return moq ? 'Defumando ' + what + ' · pronto em ' + h + ' h' : 'Secando ' + what + ' · faltam ' + h + ' h de sol' + (G.Tech.dryNow(S, b) ? '' : ' (parado: sem sol agora)');
  }
  function moodWord(m) { return m >= 75 ? 'radiante' : m >= 55 ? 'feliz' : m >= 40 ? 'em paz' : m >= 25 ? 'triste' : 'em desespero'; }
  function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }

  // ---------- Etapa 11: Deus (a estátua, a janela de Deus e a escolha do nome e do dom) ----------
  function estatuaStatus(b) {
    const Dz = G.Deus, reach = Dz.reach(S, b);
    const rz = S.people.filter((p) => p.alive && p.prayedDay === S.ck.day).length;
    const tail = rz ? ' Rezaram aqui hoje de manhã: ' + rz + '.' : '';
    if (!b.milagre) return 'Ainda sem milagre.' + tail;
    if (b.milagre === 'chuva') {
      const gap = Math.round(C.ESTATUA_CHUVA_D / reach) * C.DAY_MIN, d = Math.max(0, Math.ceil((gap - (S.t - (b.lastRain || 0))) / C.DAY_MIN));
      return 'Chama a chuva a cada ' + dias(Math.round(C.ESTATUA_CHUVA_D / reach)) + (d > 1 ? '; a próxima, em ' + dias(d) + '.' : '; a próxima, logo.') + tail;
    }
    if (b.milagre === 'fogo') return 'Aquece até ' + Math.round(C.ESTATUA_R * reach) + ' passos, dia e noite; lobo e onça não chegam perto.' + tail;
    if (b.milagre === 'cura') return 'Às 6h cura quem está fraco até ' + Math.round(C.ESTATUA_CURA_R * reach) + ' passos · curas: ' + (S.stats.statueHeals || 0) + '.' + tail;
    return 'Vigia ' + Math.round(C.ESTATUA_TROVAO_R * reach) + ' passos em volta, de noite · raios: ' + (S.stats.statueBolts || 0) + '.' + tail;
  }
  function estatuaHTML(b) {
    const Dz = G.Deus;
    if (!Dz) return '';
    if (b.milagre) {
      const m = Dz.MILAGRES[b.milagre];
      return `<div class="consagra done"><img class="ico" src="${ic(m.icon)}" alt=""><span><b>Milagre: ${esc(m.name.toLowerCase())}</b><span class="small">${esc(m.desc)}</span></span></div>`;
    }
    return `<p class="small">Escolha o milagre desta estátua (${C.CONSAGRAR_COST} de Poder). Ele acontece sozinho, para sempre, e cada estátua tem o seu.</p><div class="consagra">` +
      Object.keys(Dz.MILAGRES).map((k) => {
        const m = Dz.MILAGRES[k], why = Dz.consecrateWhy(S, b, k);
        return `<button class="btn btn-small mil${why ? ' off' : ''}" data-act="consagrar" data-k="${k}" title="${esc(why ? 'Agora não: ' + why : m.desc)}"><img class="ico" src="${ic(m.icon)}" alt=""><span><b>${esc(m.name)}</b><span class="small">${esc(why ? why : m.desc)}</span></span></button>`;
      }).join('') + '</div>';
  }
  // o que cada nível traz (na janela de Deus e na escolha do dom)
  const LEVEL_GIFT = {
    1: 'Os milagres do começo: Calor, Raio e Chuva (a Cura e a Revelação chegam com a vida do povo).',
    2: 'O povo te dá um nome · a Bênção (Z) · um dom.',
    3: 'Um escolhido com poder · uma estátua com milagre próprio · um dom.',
    4: 'Dois escolhidos e duas estátuas · uma espécie nova · um dom.',
    5: 'Três escolhidos e três estátuas · um saber de outra era · um dom.',
  };
  const LEVEL_LEAD = {
    2: 'O povo reza para você todo dia. Agora você é o Guardião deles, e com o nível veio a Bênção (Z): por 2 dias, o trabalho num lugar rende metade a mais.',
    3: 'Deus do Povo. Já dá para dar um poder a quem chegou à fé inteira e erguer uma estátua (Construir).',
    4: 'Deus Antigo: gerações inteiras rezam para o mesmo céu. Já dá para criar uma espécie nova (Deus → Grandes atos).',
    5: 'Deus Maior. Já dá para ensinar ao povo um saber de outra era (Deus → Grandes atos).',
  };
  let deusTab = 'nivel';
  UI.deus = function (tab) {
    if (!S || !S.god || !G.Deus || !S.god.pending) return;
    if (tab) deusTab = tab;
    const Dz = G.Deus, g = S.god;
    document.querySelectorAll('#modal-deus [data-gtab]').forEach((b) => { b.classList.toggle('on', b.dataset.gtab === deusTab); b.setAttribute('aria-selected', b.dataset.gtab === deusTab ? 'true' : 'false'); });
    $('#deus-mtitle').textContent = g.name ? g.name + ', ' + g.epithet : 'Deus';
    $('#deus-poder').textContent = fmtN(g.poder) + ' de Poder · glória ' + fmtN(g.glory);
    $('#deus-body').innerHTML = deusTab === 'escolhidos' ? escolhidosHTML(Dz, g) : deusTab === 'atos' ? atosHTML(Dz, g) : deusTab === 'povos' && G.Povos ? povosHTML(Dz, g) : deusTab === 'memoria' && G.Memoria && S.memoria ? memoriaHTML(Dz) : nivelHTML(Dz, g);
    $('#modal-deus').hidden = false;
  };
  // Etapa 12: os povos (quem são, os dons, a convivência entre eles) e o chamado de Deus
  function povosHTML(Dz, g) {
    const Pv = G.Povos, P = S.povos;
    const row = (k) => {
      const d = Pv.DEF[k], n = Pv.count(S, k), why = k === 'humano' ? null : Pv.callWhy(S, k);
      const dons = d.dons.map((x) => `<span class="chip dom" title="${esc(Pv.DONS[x].desc)}">${esc(Pv.DONS[x].name)}</span>`).join('') + (d.fraq ? `<span class="chip fraq" title="${esc(Pv.FRAQ[d.fraq].desc)}">${esc(Pv.FRAQ[d.fraq].name)}</span>` : '');
      const call = k === 'humano' ? '' : `<button type="button" class="btn btn-small" data-gact="chamar" data-k="${k}"${why ? ' disabled' : ''} title="${esc(why ? 'Agora não: ' + why : 'Uma caravana sai na manhã seguinte')}">Chamar (${C.POVO_CALL} de Poder)</button>${why ? `<span class="small muted">Agora não: ${esc(why)}.</span>` : ''}`;
      return `<li class="povo-row"><img class="ico ico-lg" src="${ic(d.icon)}" alt=""><div><b>${esc(d.name)}</b> <span class="small ttl">${esc(d.alias)}</span><span class="small">${esc(d.desc)}</span>
        <span class="small st">${esc(Pv.status(S, k))}</span><div class="chips">${dons}</div>${call ? `<div class="povo-call">${call}</div>` : ''}</div></li>`;
    };
    // a convivência: só entre os povos que já moram aqui
    const here = Pv.ORDER.filter((k) => Pv.count(S, k) > 0), pairs = [];
    for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) pairs.push([here[i], here[j]]);
    const word = (v) => (v >= 100 ? 'um povo só' : v >= 75 ? 'irmãos' : v >= 50 ? 'bons vizinhos' : v >= 30 ? 'se toleram' : v >= C.CONV_LOW ? 'se estranham' : 'à beira da briga');
    const conv = pairs.length ? pairs.map(([a, b]) => { const v = Pv.conv(S, a, b); return `<li><span class="small">${esc(Pv.DEF[a].name)} e ${esc(Pv.DEF[b].name.toLowerCase())} · <b>${Math.floor(v)}</b> · ${word(v)}</span><div class="bar ${v < 30 ? 'low' : v < 50 ? 'mid' : ''}"><i style="width:${Math.floor(v)}%"></i></div></li>`; }).join('') :
      '<li class="none small muted">Por enquanto a aldeia tem um povo só.</li>';
    const mest = Pv.count(S, 'meio');
    return `<p class="small muted">Outros povos chegam em caravanas depois que o acampamento vira aldeia, e pedem para ficar. Cada um tem o seu corpo, três dons e uma fraqueza. Filho de dois povos herda um dom de cada lado.${mest ? ' Mestiços na aldeia: ' + mest + '.' : ''}</p>
      <h3>Convivência</h3><ul class="convlist">${conv}</ul>
      <p class="small muted">Sobe com conversa, festa, história ao pé do fogo, pregação, casais e filhos mistos. Desce com briga. Abaixo de 50, briga-se mais e os pares saem devagar; em 100, viram um povo só.</p>
      <h3>Os povos</h3><ul class="donlist povolist">${Pv.ORDER.map(row).join('')}</ul>`;
  }
  function nivelHTML(Dz, g) {
    const lv = Dz.level(S), nx = Dz.next(S), fi = Dz.fieis(S);
    const ladder = C.GOD_LEVELS.map((L, i) => {
      const n = i + 1, st = n < lv ? 'done' : n === lv ? 'on' : '';
      const req = n === 1 ? 'o começo' : 'glória ' + fmtN(L.glory) + ' · ' + L.fieis + ' fiéis';
      return `<li class="${st}"><span class="lvn">${n}</span><div><b>${esc(L.name)}</b> <span class="small muted">${req}</span><span class="small">${esc(LEVEL_GIFT[n])}</span></div></li>`;
    }).join('');
    let prog = '';
    if (nx) {
      const gf = Math.min(1, g.glory / nx.glory), ff = Math.min(1, fi / Math.max(1, nx.fieis));
      const lack = [];
      if (g.glory < nx.glory) lack.push('glória: atenda as orações, e a fé do povo rende Poder todo dia');
      if (fi < nx.fieis) lack.push('fiéis: gente de 7 anos ou mais com fé 70; o cético só conta depois de convertido');
      prog = `<div class="lvprog"><span class="small">Para o nível ${lv + 1} (${esc(nx.name)}): glória ${fmtN(g.glory)} de ${fmtN(nx.glory)} · fiéis ${fi} de ${nx.fieis}</span>
        <div class="bar poder"><i style="width:${Math.round(Math.min(gf, ff) * 100)}%"></i></div>${lack.length ? `<span class="small muted">Falta ${esc(lack.join('; falta '))}.</span>` : '<span class="small muted">Tudo pronto: o nível chega na próxima hora.</span>'}</div>`;
    } else prog = '<p class="small">Você chegou ao nível mais alto.</p>';
    const pend = Dz.pending(S);
    const dons = g.dons.length ? g.dons.map((id) => { const d = Dz.DONS[id]; return `<li><img class="ico" src="${ic(d.icon)}" alt=""><div><b>${esc(d.name)}</b><span class="small">${esc(d.desc)}</span></div></li>`; }).join('') : '<li class="none small muted">Nenhum ainda: cada nível novo traz um dom para escolher.</li>';
    const nm = g.name ? `<p class="small">O povo te chama de <b>${esc(g.name)}</b>, ${esc(g.epithet)}.${g.namedBy ? ' Quem começou foi ' + esc(g.namedBy) + '.' : ''} O título vem do que você mais fez e de como o povo te vê.</p>
      <div class="name-row"><input id="deus-rename" maxlength="16" autocomplete="off" value="${esc(g.name)}" aria-label="Nome de Deus"><button type="button" class="btn btn-small" data-gact="rename">Trocar o nome</button></div>` :
      '<p class="small muted">Ainda sem nome: no nível 2, o povo te dá um.</p>';
    return `${pend ? `<button type="button" class="btn btn-gold" data-gact="pending">${pend.k === 'nome' ? 'O povo te deu um nome' : 'Escolha o dom do nível ' + pend.lv}</button>` : ''}
      <p class="small muted">A glória é todo o Poder que o povo já te deu (gastar não tira). Fiel é quem tem 7 anos ou mais e fé 70 ou mais. Cada nível pede os dois.</p>
      ${prog}<ol class="lvlist">${ladder}</ol><h3>Dons</h3><ul class="donlist">${dons}</ul><h3>Nome</h3>${nm}`;
  }
  function escolhidosHTML(Dz, g) {
    const lv = Dz.level(S);
    const powers = Object.keys(Dz.POWERS).map((k) => { const w = Dz.POWERS[k]; return `<li><img class="ico" src="${ic(w.icon)}" alt=""><div><b>${esc(w.name)}</b><span class="small">${esc(w.desc)}</span></div></li>`; }).join('');
    const intro = `<p class="small muted">Quem chega à fé inteira (100), com ${C.UNGIR_AGE} anos ou mais, pode receber um poder de ${esc(Dz.call(S))} (${C.UNGIR_COST} de Poder). Um no nível 3, dois no 4, três no 5. Se a fé esfriar abaixo de ${C.GRACA_FE}, o poder vai embora.</p>`;
    if (lv < 3) return intro + `<p class="small">Chega no nível 3 de Deus.</p><ul class="donlist">${powers}</ul>`;
    const cur = Dz.escolhidos(S), max = Dz.slots(S);
    const curHTML = cur.length ? cur.map((p) => { const w = Dz.POWERS[p.escolhido.power]; return `<li><img class="ico" src="${ic(w.icon)}" alt=""><div><b>${esc(p.name)}</b> <span class="small ttl">${esc(Dz.title(p))}</span><span class="small">${esc(w.name)} · fé ${Math.round(p.fe)}</span></div><button type="button" class="btn btn-small" data-gact="goto" data-pid="${p.id}">Ver</button></li>`; }).join('') : '<li class="none small muted">Ninguém ainda.</li>';
    const cands = Dz.candidates(S);
    let candHTML = '';
    if (cands.length) {
      candHTML = cands.map((p) => {
        const why = Dz.anointWhy(S, p);
        return `<li class="cand"><div><b>${esc(p.name)}</b> <span class="small muted">${Fam().age(S, p)} anos · fé ${Math.round(p.fe)}</span>${why ? `<span class="small warn">Agora não: ${esc(why)}.</span>` : ''}</div><div class="powbtns">` +
          Object.keys(Dz.POWERS).map((k) => `<button type="button" class="btn btn-small" data-gact="ungir" data-pid="${p.id}" data-power="${k}"${why ? ' disabled' : ''}><img class="ico" src="${ic(Dz.POWERS[k].icon)}" alt="">${esc(Dz.POWERS[k].name)}</button>`).join('') + '</div></li>';
      }).join('');
    } else {
      const near = S.people.filter((p) => p.alive && !p.carriedBy && !p.escolhido && Fam().age(S, p) >= C.UNGIR_AGE).sort((a, b) => b.fe - a.fe).slice(0, 3);
      candHTML = `<li class="none small muted">Ninguém com fé inteira agora. A fé sobe com orações atendidas, milagres vistos, a reza na estátua e a pregação.${near.length ? ' Mais perto: ' + near.map((p) => esc(p.name) + ' (' + Math.round(p.fe) + ')').join(', ') + '.' : ''}</li>`;
    }
    return intro + `<h3>Escolhidos · ${cur.length} de ${max}</h3><ul class="donlist">${curHTML}</ul><h3>Com fé inteira</h3><ul class="donlist cands">${candHTML}</ul><h3>Os poderes</h3><ul class="donlist">${powers}</ul>`;
  }
  function atosHTML(Dz, g) {
    const lv = Dz.level(S);
    // estátuas
    const sts = S.buildings.filter((b) => b.type === 'estatua'), max = C.ESTATUAS[lv] || 0;
    const stList = sts.length ? sts.map((b, i) => `<li><img class="ico" src="${ic(b.milagre ? Dz.MILAGRES[b.milagre].icon : 'estatua')}" alt=""><div><b>Estátua ${i + 1}</b><span class="small">${!b.built ? 'Em obra.' : b.milagre ? 'Milagre: ' + esc(Dz.MILAGRES[b.milagre].name.toLowerCase()) + '. ' + esc(Dz.MILAGRES[b.milagre].desc) : 'Sem milagre ainda: toque nela no mapa e escolha.'}</span></div><button type="button" class="btn btn-small" data-gact="gobuild" data-bid="${b.id}">Ver</button></li>`).join('') : '';
    const stTxt = lv < C.ESTATUA_LV ? 'Chega no nível ' + C.ESTATUA_LV + '.' : 'Estátuas: ' + sts.length + ' de ' + max + '. Marque em Construir → Estátua (' + costText(C.BUILD.estatua.cost) + '). Pronta, toque nela e escolha o milagre (' + C.CONSAGRAR_COST + ' de Poder).';
    // espécies
    const forms = Object.keys(Dz.FORMS).map((f) => {
      const F2 = Dz.FORMS[f], made = Dz.species(S, f), why = Dz.speciesWhy(S, f);
      if (made) return `<li class="made"><img class="ico" src="${ic(F2.icon)}" alt=""><div><b>${esc(made.name)}</b><span class="small">${esc(F2.desc)}</span><span class="small ok">Criad${f === 'arvore' ? 'a' : 'o'} por ${esc(Dz.call(S))}.</span></div></li>`;
      return `<li><img class="ico" src="${ic(F2.icon)}" alt=""><div><b>${esc(F2.name)}</b><span class="small">${esc(F2.desc)}</span>
        <div class="name-row"><input id="esp-${f}" maxlength="18" autocomplete="off" placeholder="${esc(F2.def)}" aria-label="Nome da espécie"${why ? ' disabled' : ''}><button type="button" class="btn btn-small" data-gact="especie" data-form="${f}"${why ? ' disabled' : ''}>Criar · ${C.ESPECIE_COST}</button></div>
        ${why ? `<span class="small muted">${esc(why)}.</span>` : ''}</div></li>`;
    }).join('');
    // saberes
    const sabs = Object.keys(Dz.SABERES).map((id) => {
      const s = Dz.SABERES[id], why = Dz.saberWhy(S, id), has = Dz.saber(S, id);
      return `<li${has ? ' class="made"' : ''}><img class="ico" src="${ic(s.icon)}" alt=""><div><b>${esc(s.name)}</b><span class="small">${esc(s.desc)}</span>${has ? '<span class="small ok">O povo já sabe.</span>' : why ? `<span class="small muted">${esc(why)}.</span>` : ''}</div>${has ? '' : `<button type="button" class="btn btn-small" data-gact="saber" data-id="${id}"${why ? ' disabled' : ''}>Ensinar · ${C.SABER_COST}</button>`}</li>`;
    }).join('');
    return `<h3>Estátua</h3><p class="small muted">${esc(stTxt)}</p>${stList ? `<ul class="donlist">${stList}</ul>` : ''}
      <h3>Espécie nova <span class="small muted">· nível ${C.ESPECIE_LV}</span></h3><ul class="donlist">${forms}</ul>
      <h3>Saber de outra era <span class="small muted">· nível ${C.SABER_LV}</span></h3><ul class="donlist">${sabs}</ul>`;
  }
  // ---------- Etapa 13: memória (os contos, os mortos, a erva-do-sonho) ----------
  // a ficha, o cemitério e a aba pedem isto a cada pintura: fica guardado por meia hora de jogo
  let contoKey = '', contoList = [], covaKey = '', covaList = [];
  function contos() {
    const Mm = G.Memoria, m = S.memoria;
    if (!Mm || !m) return [];
    const k = m.nc + '|' + m.contos.length + '|' + (S.stats.contados || 0) + '|' + Math.floor(S.t / 30);
    if (k !== contoKey) { contoKey = k; contoList = Mm.contosInfo(S); }
    return contoList;
  }
  function covas() {
    const Mm = G.Memoria;
    if (!Mm || !S.memoria) return [];
    const k = S.world.objs.length + '|' + Math.floor(S.t / 30);
    if (k !== covaKey) { covaKey = k; covaList = Mm.buried(S); }
    return covaList;
  }
  // dias até o dia dos mortos (o último dia do outono)
  const finadosEm = () => ((2 - S.ck.season + 4) % 4) * C.SEASON_DAYS + (C.SEASON_DAYS - S.ck.dos);
  // a ficha de quem morreu: onde está o corpo, a cova, quem volta com flores
  function covaHTML(p) {
    const Mm = G.Memoria;
    if (!Mm || !S.memoria || p.alive) return '';
    const oa = p.sex === 'F' ? 'a' : 'o', t = Mm.bodyText(S, p);
    if (!t) return '';
    const btn = (lbl) => `<div class="chips"><button class="btn btn-small" data-act="vercova"><img class="ico" src="${ic('cova')}" alt="">${lbl}</button></div>`;
    if (p.corpo) return `<p class="small cova-line">${esc(t)}.</p>` + (p.corpo.st > 0 ? btn('Ver onde está') : '');
    if (!p.cova) return '<p class="small cova-line muted">Ninguém achou o corpo: não teve velório nem cova.</p>';
    const o = G.W.objAt(S.world, p.cova[1] * S.world.W + p.cova[0]);
    const g = o && o.k === 'grave' ? Mm.graveInfo(S, o) : null;
    if (!g) return `<p class="small cova-line">${esc(t)}.</p>`;
    const bits = [(p.diedAt ? esc(Sim.dateText(p.diedAt)) + '. ' : '') + esc(t) + (g.rito.length ? ', com ' + esc(listPT(g.rito)) : '') + '.', g.velado ? 'Foi velad' + oa + ' ao pé do fogo.' : 'Não deu tempo de velar.'];
    if (g.flores) bits.push('Tem flores frescas na cova.');
    if (g.oferenda) bits.push('Deixaram uma oferenda.');
    if (g.kin && g.kin.length) bits.push('Quem volta com flores: ' + esc(listPT(g.kin.slice(0, 5))) + (g.kin.length > 5 ? ' e mais ' + (g.kin.length - 5) : '') + '.');
    return `<p class="small cova-line">${bits.join(' ')}</p>` + btn('Ver a cova');
  }
  // a ficha de quem vive: o rito (a ressaca, o apego) e a criança que cresce ouvindo contos
  function ritoLine(p) {
    if (!G.Memoria || !S.memoria || !p.alive) return '';
    const out = [];
    if (p.ressaca && p.ressaca > S.t) out.push('Esteve no rito: hoje acorda devagar e trabalha mais lento.');
    if ((p.rito || 0) >= C.RITO_APEGO) out.push('Apegad' + (p.sex === 'F' ? 'a' : 'o') + ' ao rito: sente falta quando a roda demora, e a erva já pesa na saúde.');
    else if (p.rito) out.push('Já sentou ' + (p.rito === 1 ? 'uma vez' : p.rito + ' vezes') + ' na roda da erva-do-sonho.');
    if (p.ouviu && !p.criado && (p.ouviu[0] || p.ouviu[1])) out.push('Cresce vendo e ouvindo: ' + p.ouviu[1] + ' de cuidado, ' + p.ouviu[0] + ' de medo. Aos ' + C.CRIADO_AGE + ' anos, isso fica nel' + (p.sex === 'F' ? 'a' : 'e') + '.');
    return out.length ? `<p class="small muted mem-line">${esc(out.join(' '))}</p>` : '';
  }
  function criadoChip(p) {
    if (p.criado === 'temente') return `<span class="chip fraq" title="Cresceu vendo e ouvindo um Deus de dar medo: a fé não esfria abaixo de ${C.TEMENTE_FE} e obedece mais às Vontades, mas o humor pesa um pouco.">Temente</span>`;
    if (p.criado === 'confiante') return `<span class="chip dom" title="Cresceu vendo e ouvindo um Deus que cuida: a fé assenta mais alto, sobe mais depressa, e o humor é melhor.">Confiante</span>`;
    return '';
  }
  function contosPessoa(p) {
    if (!p.alive || !p.contos) return '';
    const mine = contos().filter((c) => p.contos[c.id] !== undefined);
    if (!mine.length) return '';
    const como = (g) => (g <= 0 ? 'viu' : g === 1 ? 'ouviu de quem viu' : 'ouviu dos antigos');
    return sec('Contos que sabe', `<ul class="mems contos">${mine.slice(0, 6).map((c) => `<li>${esc(c.titulo)} <span class="muted">· ${como(p.contos[c.id])}</span></li>`).join('')}${mine.length > 6 ? `<li class="muted">e mais ${mine.length - 6}</li>` : ''}</ul>`);
  }
  // o painel do cemitério: o estado numa frase e quem está enterrado (toque no nome abre a ficha)
  function cemStatus(b, d) {
    const m = S.memoria, n = covas().length, fe = finadosEm(), esp = m.corpos.length;
    return (n ? (n === 1 ? 'Uma cova' : n + ' covas') : 'Nenhuma cova ainda') + '.' +
      (esp ? ' ' + (esp === 1 ? 'Uma pessoa espera' : esp + ' pessoas esperam') + ' o velório e o enterro.' : '') +
      (m.fin.on ? ' Hoje é o dia dos mortos: o povo está aqui, com uma luz em cada cova.' : ' Dia dos mortos: ' + (fe === 0 ? 'hoje, à tarde.' : fe === 1 ? 'amanhã, à tarde.' : 'daqui a ' + fe + ' dias, no último dia do outono.')) +
      (d.mem && d.mem.vale > 1 ? ' Com a cerca e o portal, a visita consola metade a mais.' : '');
  }
  function cemHTML() {
    const list = covas();
    if (!list.length) return '<p class="small muted">Quando alguém morrer, o povo vela ao pé do fogo e abre a cova aqui em volta.</p>';
    const row = (g) => {
      const marks = (g.flores ? `<img class="ico" src="${ic('flor')}" alt="flores" title="Flores frescas">` : '') + (g.oferenda ? `<img class="ico" src="${ic('frutas')}" alt="oferenda" title="Oferenda">` : '');
      const sub = g.ate ? 'ano ' + g.ate + ' · ' + anos(g.anos) + (g.causa ? ' · ' + g.causa : '') : 'cova antiga';
      return `<li><button type="button" class="cova-row" data-act="pessoa" data-pid="${g.pid || 0}"${g.pid ? '' : ' disabled'}><span class="nm">${esc(g.name)}</span><span class="marks">${marks}</span><span class="small muted sub">${esc(sub)}</span></button></li>`;
    };
    return sec('Quem está aqui', `<ul class="covalist">${list.slice(0, 40).map(row).join('')}</ul>${list.length > 40 ? `<p class="small muted">E mais ${list.length - 40}, mais antigas.</p>` : ''}`);
  }
  // Deus → Memória: o que contam de você, a erva-do-sonho e os mortos
  const LEI = {
    bencao: ['Abençoar', 'Abençoado: quem senta na roda sai com mais fé, e o povo te vê mais bondoso.'],
    livre: ['Deixar com o povo', 'Por conta do povo: fazem o rito quando querem.'],
    proibido: ['Proibir', 'Proibido: ninguém colhe a erva. Quem se apegou sente falta, e o povo te teme mais.'],
  };
  function memoriaHTML(Dz) {
    const Mm = G.Memoria, m = S.memoria, D = Dz.call(S);
    const TOM = { 1: ['de cuidado', 'bom'], 0: ['de espanto', ''], '-1': ['de medo', 'temido'] }, MAG = ['como foi', 'aumentado', 'virou lenda'];
    const list = contos();
    const row = (c) => {
      const tm = TOM[c.tone] || TOM[0];
      const quem = c.perdido ? 'ninguém vivo sabe contar' : (c.sabem === 1 ? '1 pessoa sabe' : c.sabem + ' sabem') + (c.viram ? ', ' + (c.viram === 1 ? '1 viu' : c.viram + ' viram') : ', nenhum viu');
      return `<li class="conto${c.perdido ? ' lost' : ''}"><img class="ico" src="${ic('conto')}" alt=""><div><b>${esc(c.titulo)}</b>
        <span class="small muted">${esc(c.quando)} · ${c.n ? 'contado ' + (c.n === 1 ? '1 vez' : c.n + ' vezes') : 'ainda não contado'} · ${quem}</span>
        <span class="small fala">${esc(c.conta[0])}</span>
        <span class="small muted">O que foi: ${esc(c.fato)}</span>
        <span class="small"><span class="side ${tm[1]}">conto ${tm[0]}</span> · ${MAG[Math.min(2, c.mag)]}</span></div></li>`;
    };
    const tem = S.people.filter((p) => p.alive && p.criado === 'temente').length, conf = S.people.filter((p) => p.alive && p.criado === 'confiante').length;
    const pend = Mm.pending(S), r = Mm.ritoInfo(S);
    let erva;
    if (!r.known) erva = `<p class="small muted">O povo ainda não conhece. A erva-do-sonho cresce na mata, perto da água. Quando ${esc(D)} chega ao nível ${C.ERVA_LV} e a aldeia tem ${C.RITO_MIN_POP} adultos, quem passa por lá acaba achando.</p>`;
    else {
      const btns = ['bencao', 'livre', 'proibido'].map((k) => `<button type="button" class="btn btn-small${r.lei === k ? ' on' : ''}" data-gact="lei" data-k="${k}" aria-pressed="${r.lei === k ? 'true' : 'false'}">${LEI[k][0]}</button>`).join('');
      const quando = r.lei === 'proibido' ? 'Não há rito.' : r.on ? 'O rito é agora, ao pé do fogo.' : r.hoje ? 'Hoje tem rito, ao escurecer.' : r.falta ? 'O próximo rito sai em ' + (r.falta === 1 ? '1 dia' : r.falta + ' dias') + ', se o dia for calmo.' : 'O próximo rito sai no primeiro dia calmo.';
      const prom = r.prom.map((x) => `<li class="small">Promessa de pé: ${x.k === 'fome' ? 'não faltar comida' : x.k === 'frio' ? 'ninguém morrer de frio' : 'ninguém morrer de fera'} · ${x.dias === 1 ? 'falta 1 dia' : 'faltam ' + x.dias + ' dias'}</li>`).join('');
      erva = `<p class="small">${quando} Ritos: ${r.ritos} · perguntas respondidas: ${r.respostas}${r.apegados ? ' · apegados: ' + r.apegados : ''}.</p>
        <div class="chips lei-row" role="group" aria-label="O que você diz do rito">${btns}</div><p class="small muted">${esc(LEI[r.lei][1])}</p>
        ${prom ? `<ul class="promlist">${prom}</ul>` : ''}
        <p class="small muted">A cada ${C.RITO_GAP_D} dias, num dia calmo, até ${C.RITO_MAX} adultos sentam em roda ao escurecer, no lugar da história. Só adulto entra: 18 anos ou mais, e nem grávida nem quem leva bebê. De vez em quando alguém faz uma pergunta, e a sua resposta vira conto. No dia seguinte a roda acorda devagar; quem senta demais se apega.</p>`;
    }
    const nc = covas().length, fe = finadosEm();
    return `${pend ? `<button type="button" class="btn btn-gold" data-gact="pendmem">${pend.k === 'erva' ? 'O povo achou a erva-do-sonho' : 'Uma pergunta espera resposta'}</button>` : ''}
      <p class="small muted">O que você faz de grande, e alguém vê, vira conto. Nas noites de história, quem viu conta; quem só ouviu passa adiante e muda um detalhe. Criança que cresce vendo e ouvindo um Deus de dar medo fica temente; um Deus que cuida, confiante.${tem || conf ? ' Hoje: ' + listPT([tem ? tem + (tem === 1 ? ' temente' : ' tementes') : '', conf ? conf + (conf === 1 ? ' confiante' : ' confiantes') : ''].filter(Boolean)) + '.' : ''}</p>
      <h3>A erva-do-sonho</h3>${erva}
      <h3>Os mortos</h3><p class="small">${nc ? (nc === 1 ? 'Uma cova' : nc + ' covas') : 'Nenhuma cova ainda'} · velórios: ${S.stats.velorios || 0} · dias dos mortos: ${S.stats.finados || 0}. ${m.fin.on ? 'Hoje é o dia dos mortos.' : 'O próximo dia dos mortos é ' + (fe === 0 ? 'hoje, à tarde.' : fe === 1 ? 'amanhã.' : 'daqui a ' + fe + ' dias.')}</p>
      <p class="small muted">Quem morre é levado para junto do fogo e velado à tardinha; de manhã, enterrado, cada povo do seu jeito. A família volta com flores, e no último dia do outono a aldeia inteira vai ao cemitério. Toque numa cova para ver de quem é.</p>
      <h3>O que contam de você${list.length ? ' · ' + list.length : ''}</h3>
      <ul class="donlist contolist">${list.length ? list.map(row).join('') : '<li class="none small muted">Nada ainda. Uma cura, a chuva na seca, o calor na nevasca, um raio: o que alguém vê de perto vira conto.</li>'}</ul>`;
  }
  // as três respostas (e o silêncio): o que cada uma faz, numa linha
  const FX_HINT = {
    luto: 'Consola quem está de luto.', 'prom:fome': 'É uma promessa: ' + C.PROMESSA_D + ' dias sem ninguém passar fome. Cumprida, a fé sobe; quebrada, cai e vira conto.',
    'prom:fera': 'É uma promessa: ' + C.PROMESSA_D + ' dias sem ninguém morrer de fera. Cumprida, a fé sobe; quebrada, cai e vira conto.',
    'prom:frio': 'É uma promessa: ninguém morre de frio até o fim do inverno. Cumprida, a fé sobe; quebrada, cai e vira conto.',
    'zelo:comida': 'Por ' + C.ZELO_COMIDA_D + ' dias, o povo junta comida com mais afinco.', 'zelo:lenha': 'Por ' + C.ZELO_COMIDA_D + ' dias, o povo junta lenha com mais afinco.',
    'zelo:tudo': 'Por ' + C.ZELO_TUDO_D + ' dias, todo trabalho rende um pouco mais.', 'conv:3': 'Aproxima os povos.', 'conv:-3': 'Afasta os povos.',
    'sinal:3': 'Quem perguntou fica bem mais perto de crer.', 'sinal:1': 'Quem perguntou fica um pouco mais perto de crer.', trovao: 'Um trovão cai perto do fogo.', saber: 'Adianta um pouco a descoberta em andamento.',
  };
  const MEM_HINT = { aceitou: 'A roda fica em paz.', promessa: 'A roda guarda a sua palavra.', emPaz: 'A roda fica em paz com o fim.' };
  UI.memPending = function (onDone) {
    const Mm = G.Memoria, info = S && Mm && Mm.pendingInfo(S);
    const m = $('#modal-dom'), ok = $('#dom-ok'), body = $('#dom-body');
    if (!info) { m.hidden = true; if (onDone) onDone(); return false; }
    const pd = Mm.pending(S);
    $('#dom-ico').src = ic(info.icon);
    $('#dom-title').textContent = info.title;
    $('#dom-lead').textContent = info.lead;
    const opt = (i, nm, ds, side) => `<button type="button" class="dom-opt mem-opt" role="radio" aria-checked="false" data-i="${i}"><span class="nm">${esc(nm)}</span>${ds ? `<span class="ds small">${esc(ds)}</span>` : ''}${side === 'bom' ? '<span class="side bom small">o povo te vê mais bondoso</span>' : side === 'temido' ? '<span class="side temido small">o povo te teme mais</span>' : ''}</button>`;
    let html;
    if (info.k === 'erva') html = info.opts.map((t, i) => { const k = t.indexOf(': '); return opt(i, t.slice(0, k), t.slice(k + 2, k + 3).toUpperCase() + t.slice(k + 3), i === 0 ? 'bom' : i === 2 ? 'temido' : ''); }).join('');
    else {
      html = Mm.Q[pd.q].a.map((a, i) => opt(i, '“' + a.t + '”', [FX_HINT[a.fx] || '', MEM_HINT[a.mem] || ''].filter(Boolean).join(' '), a.tone > 0 ? 'bom' : a.tone < 0 ? 'temido' : '')).join('') +
        opt(-1, info.quiet, 'Quem perguntou fica sem resposta, e a fé da roda esfria um pouco.', '');
    }
    body.innerHTML = '<div class="dom-opts" role="radiogroup" aria-label="' + (info.k === 'erva' ? 'O que você diz' : 'Respostas') + '">' + html + '</div>' +
      (info.k === 'erva' ? '<p class="small muted">Dá para mudar depois, em Deus → Memória.</p>' : '<p class="small muted">A resposta vira conto, e o povo vai repetir.</p>');
    let pick = null;
    ok.textContent = info.k === 'erva' ? 'Está dito' : 'Responder';
    ok.disabled = true;
    body.querySelectorAll('.dom-opt').forEach((b) => b.addEventListener('click', () => {
      pick = +b.dataset.i;
      body.querySelectorAll('.dom-opt').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      ok.disabled = false;
    }));
    $('#form-dom').onsubmit = (e) => {
      e.preventDefault();
      if (pick === null) return;
      Mm.answer(S, pick);
      m.hidden = true; contoKey = '';
      UI.update(0, true);
      if (Mm.pending(S)) UI.memPending(onDone); else if (onDone) onDone();
    };
    m.hidden = false;
    return true;
  };
  const Fam = () => G.Family;
  function godAct(b) {
    const Dz = G.Deus, a = b.dataset.gact;
    if (a === 'pending') { $('#modal-deus').hidden = true; if (UI.hooks.godPending) UI.hooks.godPending(); return; }
    // Etapa 13: a pergunta que espera, e o que Deus diz do rito (muda quando quiser)
    if (a === 'pendmem') { $('#modal-deus').hidden = true; if (UI.hooks.memPending) UI.hooks.memPending(); return; }
    if (a === 'lei' && G.Memoria) {
      const Mm = G.Memoria, pd = Mm.pending(S), k = b.dataset.k;
      if (pd && pd.k === 'erva') Mm.answer(S, ['bencao', 'livre', 'proibido'].indexOf(k)); else Mm.setLei(S, k);
      UI.deus('memoria'); UI.update(0, true);
      return;
    }
    if (a === 'rename') {
      const v = ($('#deus-rename') || {}).value || '';
      if (Dz.rename(S, v)) { UI.refreshChron(); UI.toast('Agora o povo te chama de ' + S.god.name + '.', 'good'); }
      UI.deus(); UI.update(0, true);
      return;
    }
    if (a === 'goto') { $('#modal-deus').hidden = true; UI.select(+b.dataset.pid, 0, true); return; }
    if (a === 'chamar' && G.Povos) {   // Etapa 12
      const why = G.Povos.callWhy(S, b.dataset.k);
      if (why) { UI.toast('Agora não: ' + why + '.', 'warn'); return; }
      G.Povos.call(S, b.dataset.k);
      UI.deus('povos'); UI.update(0, true);
      return;
    }
    if (a === 'gobuild') {
      const bd = Sim.building(S, +b.dataset.bid);
      $('#modal-deus').hidden = true;
      if (bd) { UI.select(0, bd.id); UI.hooks.center((bd.x + 1) * C.TILE, (bd.y + 1) * C.TILE); }
      return;
    }
    if (a === 'ungir') {
      const p = S.people.find((q) => q.id === +b.dataset.pid);
      const why = Dz.anointWhy(S, p);
      if (why) { UI.toast('Agora não: ' + why + '.', 'warn'); return; }
      if (Dz.anoint(S, p, b.dataset.power)) { UI.deus('escolhidos'); UI.update(0, true); }
      return;
    }
    if (a === 'especie') {
      const f = b.dataset.form, inp = $('#esp-' + f);
      const why = Dz.speciesWhy(S, f);
      if (why) { UI.toast('Agora não: ' + why + '.', 'warn'); return; }
      if (Dz.createSpecies(S, f, inp ? inp.value : '')) { UI.deus('atos'); UI.update(0, true); }
      return;
    }
    if (a === 'saber') {
      const why = Dz.saberWhy(S, b.dataset.id);
      if (why) { UI.toast('Agora não: ' + why + '.', 'warn'); return; }
      if (Dz.grantSaber(S, b.dataset.id)) { UI.deus('atos'); UI.update(0, true); }
    }
  }
  // o nome que o povo dá e o dom do nível novo: uma janela por vez (o jogo espera)
  UI.godPending = function (onDone) {
    const Dz = G.Deus, q = S && Dz && Dz.pending(S);
    const m = $('#modal-dom'), ok = $('#dom-ok'), body = $('#dom-body');
    if (!q) { m.hidden = true; if (onDone) onDone(); return false; }
    const g = S.god;
    const next = () => { m.hidden = true; UI.update(0, true); if (Dz.pending(S)) UI.godPending(onDone); else if (onDone) onDone(); };
    $('#dom-ico').src = ic('deus');
    if (q.k === 'nome') {
      $('#dom-title').textContent = 'O povo te deu um nome';
      $('#dom-lead').textContent = (g.namedBy ? g.namedBy + ' começou a te chamar de ' : 'O povo começou a te chamar de ') + g.name + ', ' + g.epithet + '. É assim que vão rezar daqui para a frente.';
      body.innerHTML = `<label for="dom-name">Nome</label><div class="name-row"><input id="dom-name" maxlength="16" autocomplete="off" required value="${esc(g.name)}"><button type="button" class="btn btn-small" id="dom-roll">Outro</button></div>
        <p class="small muted">O título (${esc(g.epithet)}) vem do que você mais fez e de como o povo te vê. Dá para trocar o nome depois, em Deus.</p>`;
      ok.textContent = 'Assim vão me chamar';
      ok.disabled = false;
      $('#dom-roll').onclick = () => { const n = Dz.rollName(S); if (n) $('#dom-name').value = n; };
      $('#form-dom').onsubmit = (e) => { e.preventDefault(); Dz.acceptName(S, $('#dom-name').value.trim()); UI.refreshChron(); next(); };
    } else {
      const lv = q.lv, def = Dz.levelDef(lv);
      $('#dom-title').textContent = 'Nível ' + lv + ': ' + def.name;
      $('#dom-lead').textContent = (LEVEL_LEAD[lv] || '') + ' Escolha um dom: ele fica para sempre.';
      body.innerHTML = '<div class="dom-opts" role="radiogroup" aria-label="Dons">' + q.offer.map((id) => {
        const d = Dz.DONS[id];
        const side = d.side === 'bom' ? '<span class="side bom small">o povo te vê mais bondoso</span>' : d.side === 'temido' ? '<span class="side temido small">o povo te teme mais</span>' : '';
        return `<button type="button" class="dom-opt" role="radio" aria-checked="false" data-dom="${id}"><img class="ico" src="${ic(d.icon)}" alt=""><span class="nm">${esc(d.name)}</span><span class="ds small">${esc(d.desc)}</span>${side}</button>`;
      }).join('') + '</div>';
      let pick = '';
      ok.textContent = 'Escolher este dom';
      ok.disabled = true;
      body.querySelectorAll('.dom-opt').forEach((b) => b.addEventListener('click', () => {
        pick = b.dataset.dom;
        body.querySelectorAll('.dom-opt').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
        ok.disabled = false;
      }));
      $('#form-dom').onsubmit = (e) => { e.preventDefault(); if (!pick) return; Dz.chooseDom(S, pick); next(); };
    }
    m.hidden = false;
    return true;
  };

  // ---------- eventos da simulação ----------
  UI.consume = function (state, now, quiet) {
    const ev = state.events;
    if (!ev.length) return;
    for (const e of ev) {
      if (G.Audio && !quiet) G.Audio.event(e, state);
      if (e.k === 'toast') UI.toast(e.text, e.tone);
      else if (e.k === 'prayer') UI.toast(e.text, 'prayer');
      else if (e.k === 'chron') { addChron({ t: state.t, text: e.text }, !e.birth); }
      else if (e.k === 'birth') { if (UI.hooks.birth) UI.hooks.birth(e.pid); }
      else if (e.k === 'float') UI.float(e.x, e.y, e.text);
      else if (e.k === 'over') UI.hooks.over();
      else if (e.k === 'choice') { if (UI.hooks.choice) UI.hooks.choice(e.gid); }
      else if (e.k === 'narr') { if (e.on && (e.ev === 'lobos' || e.ev === 'onca') && UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'disc') { if (e.hint) setTimeout(() => UI.toast(e.hint, 'good'), 1800); if (!$('#modal-disc').hidden) UI.disc(); }
      else if (e.k === 'era') { if (UI.hooks.era) UI.hooks.era(); }
      else if (e.k === 'godLevel') { if (UI.hooks.godPending && !quiet) setTimeout(UI.hooks.godPending, 1400); }   // Etapa 11: o nome e o dom
      else if (e.k === 'godName' || e.k === 'dom' || e.k === 'fe100') { /* só som */ }
      else if (e.k === 'bite') { G.R.event(e); if (UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'thanks') UI.toast(e.text, e.kind === 'luto' ? 'prayer' : 'thanks');
      else if (e.k === 'oferenda') { UI.toast(e.text, 'thanks'); const ob = Sim.building(state, e.bid); if (ob) UI.float(ob.x + 1, ob.y, '+' + e.poder + ' Poder'); }   // Etapa 12
      else if (e.k === 'povo') { /* só som */ }
      else if (e.k === 'memoria') {
        // Etapa 13: a pergunta abre a janela; o conto novo avisa; a resposta solta a fumaça no fogo do rito
        if (e.ev === 'pend') { if (UI.hooks.memPending && !quiet) setTimeout(UI.hooks.memPending, 900); }
        else if (e.ev === 'conto' && G.Memoria) { contoKey = ''; const c = contos().find((x) => x.id === e.id); if (c && state.stats.contos > 1) UI.toast('O povo tem um conto novo: “' + c.titulo + '”. Veja em Deus → Memória.', 'good'); }
        else if (e.ev === 'resposta') { const rt = state.memoria.erva.rite, f = (rt && Sim.building(state, rt.fire)) || (G.Life && G.Life.campFire(state, true)); if (f) { e.x = f.x; e.y = f.y; } }
        if (!$('#modal-deus').hidden && deusTab === 'memoria') UI.deus();
        G.R.event(e);
      }
      else if (e.k === 'festa' || e.k === 'story' || e.k === 'fight' || e.k === 'goal' || e.k === 'moon' || e.k === 'song') { /* só som */ }
      else if (e.k === 'fireLit') G.R.event(e);
      else if (e.k === 'star' || e.k === 'rainbow' || e.k === 'birds') G.R.event(e);
      else if (e.k === 'arrived') {
        if (!state.stats.firstFire && !state.buildings.length) {
          setTimeout(() => UI.toast('Eles chegaram. Marque uma fogueira perto do estoque: Construir → Fogueira.', 'good'), 2600);
          setTimeout(() => UI.toast('Toque em alguém para ver o que sente. As Vontades dizem o que priorizar.', ''), 7000);
        }
      }
      else G.R.event(e);
    }
    ev.length = 0;
  };
  UI.refreshChron = function () {
    $('#chron').innerHTML = '';
    for (const c of S.chron) addChron(c, false);
  };
  function addChron(c, toast) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span>`;
    const list = $('#chron');
    list.insertBefore(li, list.firstChild);
    if (toast) UI.toast(c.text, 'chron');
  }
  UI.toast = function (text, tone) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), tone === 'chron' ? 5200 : 4200);
    setTimeout(() => el.remove(), tone === 'chron' ? 5800 : 4800);
  };
  UI.float = function (x, y, text) {
    const s = G.R.toScreen(x * C.TILE, y * C.TILE);
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1700);
  };

  // ---------- balões de fala ----------
  // Cada fala fica o tempo de ser lida (em tempo real, qualquer que seja a velocidade do jogo): 5 s e mais um pouco
  // por letra (a história, mais). Fala nova de quem ainda está falando espera a vez numa fila curta; com fila, a fala
  // de agora sai depois do tempo mínimo de leitura.
  const bubbles = new Map();
  const readMs = (text, kind) => Math.min(11000, 5000 + 55 * (text || '').length) + (kind === 'historia' ? 3500 : 0);
  const minMs = (text, kind) => Math.min(6500, 2600 + 40 * (text || '').length) + (kind === 'historia' ? 1500 : 0);
  function showSay(b, p, it, now) {
    b.cur = it; b.t0 = now; b.el.textContent = it.text; b.w = 0;
    const god = it.kind === 'god' || AI.LINES.deus.indexOf(it.text) >= 0 || !!(p.prayer && p.prayer.text === it.text);
    b.el.className = 'bubble' + (god ? ' god' : it.kind ? ' ' + it.kind : '');
    b.el.dataset.who = p.name;
    if (G.Audio && p.alive) G.Audio.voice(p, it.kind, now);
  }
  UI.frame = function (now) {
    if (!S) return;
    const scale = G.R.scale();
    const shown = [];
    for (const p of S.people) {
      let b = bubbles.get(p.id);
      if (!b) { b = { el: document.createElement('div'), id: p.sayId, t0: 0, w: 0, h: 0, cur: null, q: [] }; b.el.className = 'bubble'; b.el.hidden = true; $('#fx').appendChild(b.el); bubbles.set(p.id, b); }
      if (p.sayId !== b.id) {
        b.id = p.sayId;
        if (p.say) { b.q.push({ text: p.say, kind: p.sayKind || '' }); if (b.q.length > 2) b.q.splice(0, b.q.length - 2); }
      }
      const cur = b.cur, age = now - b.t0;
      if (b.q.length && (!cur || age >= minMs(cur.text, cur.kind) || age >= readMs(cur.text, cur.kind))) showSay(b, p, b.q.shift(), now);
      const c = b.cur;
      const show = p.alive && c && now - b.t0 < readMs(c.text, c.kind) && b.t0 > 0 && scale >= 1.5;
      if (c && now - b.t0 >= readMs(c.text, c.kind) && !b.q.length) b.cur = null;
      if (!show) { if (!b.el.hidden) b.el.hidden = true; continue; }
      const s = G.R.toScreen(p.x * C.TILE, (p.inTent ? p.y - 1.6 : p.y) * C.TILE - 12);
      shown.push({ b, x: Math.round(s.x), y: Math.round(s.y) });
    }
    // conversa: a fala mais nova fica no lugar; a mais velha sobe se encostar (lê-se de cima para baixo)
    shown.sort((a, c) => c.b.t0 - a.b.t0);
    const placed = [];
    for (const it of shown) {
      const el = it.b.el;
      if (el.hidden) el.hidden = false;
      if (!it.b.w) { it.b.w = el.offsetWidth || 120; it.b.h = el.offsetHeight || 22; }
      const w = it.b.w, h = it.b.h;
      let y = it.y, up = false;
      for (let k = 0; k < 5; k++) {
        const hit = placed.find((r) => Math.abs(r.x - it.x) < (r.w + w) / 2 + 4 && y > r.y - r.h - 2 && y - h < r.y + 2);
        if (!hit) break;
        y = hit.y - hit.h - 6; up = true;
      }
      placed.push({ x: it.x, y, w, h });
      if (el.classList.contains('up') !== up) el.classList.toggle('up', up);
      el.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -100%)`;
    }
  };

  // ---------- escolha do local ----------
  UI.siteInfo = function (w, s) {
    if (!s) { $('#site-title').textContent = 'Nenhum lugar escolhido'; $('#site-stats').innerHTML = ''; $('#site-reason').hidden = true; $('#btn-start').disabled = true; return; }
    $('#site-title').textContent = s.valid ? G.TNAME[s.tile] + ', ' + G.W.siteLabel(w, s) : 'Aqui não dá';
    const clima = s.cold > 0.35 ? 'Frio (montanha)' : s.cold > 0.15 ? 'Fresco' : 'Ameno';
    $('#site-stats').innerHTML = [
      ['madeira', 'Árvores', s.trees], ['pedra', 'Pedras', s.rocks], ['frutas', 'Pitangueiras', s.bushes],
      ['agua', 'Água', s.waterDist >= 99 ? 'longe' : s.waterDist <= 1 ? 'ao lado (' + s.waterKind + ')' : 'a ' + s.waterDist + ' passos (' + s.waterKind + ')'],
      ['termometro', 'Clima', clima],
    ].map(([i, k, v]) => `<dt><img class="ico" src="${ic(i)}" alt="">${k}</dt><dd>${v}</dd>`).join('');
    $('#site-reason').hidden = s.valid;
    $('#site-reason').textContent = s.reason;
    $('#btn-start').disabled = !s.valid;
  };

  UI.askNames = function (rng, cb, back) {
    const f = $('#name-f'), m = $('#name-m');
    const [a, b] = Sim.randomNames(rng);
    f.value = a; m.value = b;
    // Narrador: Equilibrado vem marcado
    $('#narr-opts').innerHTML = Object.keys(C.NARRADORES).map((k) => {
      const n = C.NARRADORES[k];
      return `<label class="narr-opt"><input type="radio" name="narr" value="${k}"${k === C.NARR_DEFAULT ? ' checked' : ''}><b>${esc(n.name)}</b><span>${esc(n.desc)}</span></label>`;
    }).join('');
    $('#modal-names').hidden = false;
    const roll = (e) => {
      const t = e.target.closest('[data-roll]'); if (!t) return;
      const pool = t.dataset.roll === 'F' ? Sim.namePool.FEM : Sim.namePool.MASC;
      (t.dataset.roll === 'F' ? f : m).value = rng.pick(pool);
    };
    const form = $('#form-names');
    form.onclick = roll;
    form.onsubmit = (e) => {
      e.preventDefault();
      const nf = f.value.trim() || a, nm = m.value.trim() || b;
      const pick = form.querySelector('input[name="narr"]:checked');
      $('#modal-names').hidden = true;
      cb([nf, nm], pick ? pick.value : C.NARR_DEFAULT);
    };
    $('#btn-names-back').onclick = () => { $('#modal-names').hidden = true; if (back) back(); };
    setTimeout(() => f.focus(), 50);
  };

  // ---------- conta ----------
  UI.acct = function (tab, onSubmit) {
    const form = $('#form-acct');
    const set = (t) => {
      form.classList.toggle('criar', t === 'criar');
      form.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
      $('#acct-title').textContent = t === 'criar' ? 'Criar conta' : 'Entrar';
      $('#acct-submit').textContent = t === 'criar' ? 'Criar conta' : 'Entrar';
      $('#acct-senha').setAttribute('autocomplete', t === 'criar' ? 'new-password' : 'current-password');
      form.dataset.tab = t;
      $('#acct-erro').hidden = true;
    };
    set(tab);
    form.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => set(b.dataset.tab); });
    $('#modal-acct').hidden = false;
    $('#acct-cancel').onclick = () => { $('#modal-acct').hidden = true; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#acct-submit');
      btn.disabled = true; const label = btn.textContent; btn.textContent = 'Aguarde…';
      const res = await onSubmit(form.dataset.tab, { nome: $('#acct-nome').value.trim(), email: $('#acct-email').value.trim(), senha: $('#acct-senha').value });
      btn.disabled = false; btn.textContent = label;
      if (res && res.ok) { $('#modal-acct').hidden = true; $('#acct-senha').value = ''; }
      else { const er = $('#acct-erro'); er.textContent = (res && res.erro) || 'Não deu certo. Tente de novo.'; er.hidden = false; }
    };
    setTimeout(() => (tab === 'criar' ? $('#acct-nome') : $('#acct-email')).focus(), 50);
  };
  UI.ranking = function (list, erro) {
    $('#rank-list').innerHTML = erro ? `<li>${esc(erro)}</li>` : (list && list.length ? list.map((r) => `<li><b>${esc(r.nome)}</b> — ${r.anos ? r.anos + (r.anos === 1 ? ' ano' : ' anos') : 'primeiro ano'} <span>· ${esc(r.local || '')} · ${r.vivos} ${r.vivos === 1 ? 'vivo' : 'vivos'}${r.desc ? ' · ' + r.desc + (r.desc === 1 ? ' descoberta' : ' descobertas') : ''}${r.aldeia ? ' · virou aldeia' : ''}</span></li>`).join('') : '<li>Ninguém no ranking ainda.</li>');
    $('#modal-rank').hidden = false;
    $('#rank-close').onclick = () => { $('#modal-rank').hidden = true; };
  };
  // o mundo ainda está seguindo (ausência longa): progresso na mesma janela
  // job: o cálculo em andamento (offline.js); "Entrar agora" para onde estiver e mostra o resumo do que passou
  UI.awayProgress = function (f, minutes, job) {
    const total = Math.max(1, Math.round(minutes / C.DAY_MIN));
    $('#away-title').textContent = 'Enquanto você esteve fora…';
    $('#away-lead').textContent = 'O mundo está seguindo: dia ' + Math.min(total, Math.round(total * f)) + ' de ' + total + '.';
    $('#away-bar').hidden = false;
    $('#away-bar i').style.width = (f * 100).toFixed(1) + '%';
    if ($('#modal-away').hidden) { $('#away-stats').innerHTML = ''; $('#away-chron').innerHTML = ''; }
    $('#away-ok').hidden = true;
    const now = $('#away-now');
    if (job && now.hidden) {
      now.hidden = false; now.disabled = false; now.textContent = 'Entrar agora';
      now.onclick = () => { job.stop = true; now.disabled = true; now.textContent = 'Entrando…'; };
    }
    $('#modal-away').hidden = false;
  };
  UI.away = function (r, onOk) {
    $('#away-bar').hidden = true; $('#away-ok').hidden = false; $('#away-now').hidden = true;
    const days = Math.round(r.days), plan = Math.round(r.planned || r.days);
    const span = 'de ' + Sim.dateText(r.from).toLowerCase() + ' até ' + Sim.dateText(r.to).toLowerCase() + '.';
    const nd = (n) => n + (n === 1 ? ' dia' : ' dias');
    $('#away-lead').textContent = days < 1 ? (r.early ? 'Você entrou logo: passaram poucas horas.' : 'Passaram poucas horas. O povo seguiu a vida.') :
      r.early && plan > days ? 'Você entrou antes do fim: passaram ' + nd(days) + ' dos ' + plan + ', ' + span :
      r.cut && plan > days ? 'Este aparelho não deu conta de tudo: passaram ' + nd(days) + ' dos ' + plan + ', ' + span :
      'Passaram ' + nd(days) + ', ' + span;
    const RS = RES.map(([k]) => k).filter((k) => RES_BASE.has(k) || r.stockAfter[k] || r.stockBefore[k]);
    // o povo: numa vila grande, um número e só quem não está bem
    const many = r.alive.length > 12, weak = r.alive.filter((a) => a.saude < 70).slice(0, 8);
    const row = (a) => `<dt><img class="ico" src="${ic('pessoa')}" alt="">${esc(a.name)}</dt><dd>saúde ${a.saude} · ${moodWord(a.humor)}</dd>`;
    const povo = `<dt><img class="ico" src="${ic('pessoa')}" alt="">Povo</dt><dd>${r.alive.length} ${r.alive.length === 1 ? 'pessoa' : 'pessoas'}${r.born ? ' <span class="small muted">(' + r.born + (r.born === 1 ? ' nascimento' : ' nascimentos') + ')</span>' : ''}</dd>` +
      (r.built ? `<dt><img class="ico" src="${ic('construir')}" alt="">Obras</dt><dd>${r.built} ${r.built === 1 ? 'ficou pronta' : 'ficaram prontas'}</dd>` : '');
    $('#away-stats').innerHTML = povo + RS.map((k) => {
      const d = r.stockAfter[k] - r.stockBefore[k];
      return `<dt><img class="ico" src="${ic(k)}" alt="">${RES_NAME[k]}</dt><dd>${r.stockAfter[k]} <span class="small muted">(${d >= 0 ? '+' : ''}${d})</span></dd>`;
    }).join('') + (many ? weak : r.alive).map(row).join('');
    $('#away-chron').innerHTML = r.newChron.slice().reverse().map((c) => `<li><span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span></li>`).join('');
    $('#modal-away').hidden = false;
    $('#away-ok').onclick = () => { $('#modal-away').hidden = true; if (onOk) onOk(); };
  };
  UI.busy = function (text) {
    $('#away-title').textContent = text || 'Enquanto você esteve fora…';
  };

  // ---------- nascimento: Deus dá o nome ----------
  UI.birth = function (baby, onDone, rename) {
    const F = G.Family, ela = baby.sex === 'F';
    const mom = F.person(S, baby.mother), dad = F.person(S, baby.father);
    const pais = [mom, dad].filter(Boolean).map((q) => q.name).join(' e ');
    const ck = S.ck;
    $('#birth-ico').src = ic('bebe');
    $('#birth-title').textContent = rename ? 'Outro nome para ' + baby.name : ela ? 'Nasceu uma menina!' : 'Nasceu um menino!';
    $('#birth-lead').textContent = rename ? (ela ? 'Filha' : 'Filho') + ' de ' + pais + '.' :
      (ela ? 'Filha' : 'Filho') + ' de ' + pais + ', ' + C.SEASONS[ck.season].toLowerCase() + ' do ano ' + ck.year + '. Que nome ' + (ela ? 'ela' : 'ele') + ' vai ter?';
    $('#form-birth .modal-actions .small').textContent = rename ? '' : 'O jogo fica pausado até você decidir.';
    const input = $('#birth-name');
    input.value = baby.name;
    $('#birth-roll').onclick = () => { input.value = F.pickName(S, baby.sex); };
    $('#form-birth').onsubmit = (e) => {
      e.preventDefault();
      F.rename(S, baby.id, input.value);
      $('#modal-birth').hidden = true;
      listSig = ''; lastInsp = '';   // o nome novo entra na ordem da lista
      UI.refreshChron();
      if (!rename) UI.toast('Bem-vind' + (ela ? 'a' : 'o') + ', ' + baby.name + '.', 'chron');
      if (onDone) onDone();
    };
    $('#modal-birth').hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 50);
  };

  // ---------- viajantes: acolher ou mandar seguir ----------
  UI.choice = function (gid, onDone) {
    const info = G.Narr.groupInfo(S, gid);
    if (!info) { if (onDone) onDone(null); return false; }
    const ps = info.people, one = ps.length === 1;
    const mom = ps.find((q) => q.role === 'mae'), dad = ps.find((q) => q.role === 'pai'), kid = ps.find((q) => q.role === 'filho');
    const close = (accept) => { $('#modal-choice').hidden = true; if (onDone) onDone(accept); };
    $('#choice-yes').onclick = () => close(true);
    $('#choice-no').onclick = () => close(false);
    if (info.kind === 'mascate' && info.offer && G.Campo) {
      // Etapa 10: o mascate mostra os bichos e diz o que quer em troca
      const K = G.Campo, o = info.offer, p = ps[0], ok = K.canPay(S, o.pay), pen = K.bestPen(S, C.CRIA[o.sp].size * (o.m + o.f));
      $('#choice-ico').src = ic('mascate');
      $('#choice-title').textContent = 'Um mascate quer trocar';
      $('#choice-lead').textContent = (p ? p.name + ', mascate de estrada, ' : 'O mascate ') + 'chegou tocando ' + K.animalsText(o.sp, o.m, o.f) + '. Em troca, pede ' + K.payText(o.pay) + '.';
      const d = C.CRIA[o.sp], kinds = [];
      for (let i = 0; i < o.m; i++) kinds.push(['M', o.sp === 'galinha' ? 'galo' : o.sp === 'gado' ? 'boi' : o.sp === 'ovelha' ? 'carneiro' : o.sp]);
      for (let i = 0; i < o.f; i++) kinds.push(['F', o.sp === 'gado' ? 'vaca' : o.sp]);
      const give = { galinha: 'Põe ovo quase todo dia', coelho: 'Dá cria depressa', porco: 'Engorda com as sobras', ovelha: 'Dá lã na primavera', gado: 'Dá leite todo dia' }[o.sp];
      $('#choice-people').innerHTML = kinds.map(([sx, key]) => `<li><img class="cria" src="${ic('cria:' + key)}" alt="">
        <div class="nm">${esc(sx === 'M' && d.male ? d.male : d.name)}<span class="small">${sx === 'M' ? 'macho' : 'fêmea'}</span></div>
        <div class="chips"><span class="chip">${esc(sx === 'F' || o.sp === 'coelho' || o.sp === 'porco' ? give : 'Sem ele não nasce cria')}</span><span class="chip">Abate: ${d.carne} de carne</span></div></li>`).join('');
      $('#choice-note').textContent = (pen ? 'No curral: ' + Math.floor(K.room(S, pen) * 10) / 10 + ' lugares livres.' : 'Não há lugar no curral para eles.') + (ok ? '' : ' Já não há o que pagar: o que ele pediu saiu do estoque.') + ' Dispensar não custa nada: outro mascate passa daqui a um tempo.';
      $('#choice-yes').textContent = 'Trocar';
      $('#choice-yes').disabled = !ok || !pen;
      $('#choice-no').textContent = 'Dispensar';
      $('#modal-choice').hidden = false;
      setTimeout(() => (ok && pen ? $('#choice-yes') : $('#choice-no')).focus(), 50);
      return true;
    }
    $('#choice-yes').disabled = false;
    $('#choice-no').textContent = 'Mandar seguir';
    $('#choice-ico').src = ic('pessoa');
    const Pv = G.Povos, PD = info.kind === 'povo' && Pv ? Pv.DEF[info.povo] : null;
    if (PD) {
      // Etapa 12: a caravana de um povo
      $('#choice-ico').src = ic(PD.icon);
      $('#choice-title').textContent = 'Uma caravana ' + PD.de + ' pede para ficar';
      $('#choice-lead').textContent = cap1(PD.alias) + '. ' + PD.desc + ' Se ficarem, trazem ' + Pv.giftText(info.povo, true) + '.';
    } else if (info.kind === 'casal') {
      $('#choice-title').textContent = 'Um casal pede abrigo';
      $('#choice-lead').textContent = (mom ? mom.name : '') + ' e ' + (dad ? dad.name : '') + ' vêm de longe' +
        (kid ? ', com ' + (kid.sex === 'F' ? 'a filha ' : 'o filho ') + kid.name + ', de ' + kid.age + ' anos' : '') +
        '. Contam que perderam tudo no último inverno e pedem para ficar.';
    } else {
      const p = ps[0], ela = p.sex === 'F';
      $('#choice-title').textContent = ela ? 'Uma andarilha pede abrigo' : 'Um andarilho pede abrigo';
      $('#choice-lead').textContent = p.name + ', ' + p.age + ' anos, chegou pela trilha com uma trouxa nas costas. ' + (ela ? 'Ela' : 'Ele') + ' pede para ficar e trabalhar.';
    }
    const roleTxt = { mae: 'mãe', pai: 'pai', filho: null, so: null };
    $('#choice-people').innerHTML = ps.map((p, i) => `<li><canvas data-i="${i}" width="8" height="14"></canvas>
      <div class="nm">${esc(p.name)}<span class="small">${p.age} anos${roleTxt[p.role] ? ' · ' + roleTxt[p.role] : p.role === 'filho' ? ' · ' + (p.sex === 'F' ? 'filha' : 'filho') : ''}</span></div>
      <div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(Sim.TRAIT_DESC[t])}">${esc(t)}</span>`).join('')}</div></li>`).join('') +
      (PD ? `<li class="povo-dons"><img class="ico ico-lg" src="${ic(PD.icon)}" alt=""><div class="nm">Dons ${esc(PD.de)}<span class="small">Vivem uns ${PD.old} anos</span></div><div class="chips">` +
        PD.dons.map((d) => `<span class="chip dom" title="${esc(Pv.DONS[d].desc)}">${esc(Pv.DONS[d].name)}</span>`).join('') + (PD.fraq ? `<span class="chip fraq" title="${esc(Pv.FRAQ[PD.fraq].desc)}">${esc(Pv.FRAQ[PD.fraq].name)}</span>` : '') + '</div></li>' : '');
    ps.forEach((p, i) => {
      const cv = $('#choice-people').querySelector(`canvas[data-i="${i}"]`);
      // criança (até 11 anos) no desenho de criança, mais baixo no quadro
      const kid = p.age < 12, q = { id: 'c' + gid + ':' + i, sex: p.sex, look: p.look };
      const x2 = cv.getContext('2d');
      if (kid) x2.drawImage(A.kidSheet(q).sheet, 0, 0, 6, 11, 1, 3, 6, 11);
      else x2.drawImage(A.personSheet(q).sheet, 0, 0, 8, 14, 0, 0, 8, 14);
    });
    const beds = G.Family.bedsTotal(S), need = G.Family.bedsNeeded(S) + ps.length * 2;
    $('#choice-note').textContent = 'Hoje: comida para ' + Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias') +
      ' · barracas com ' + beds + ' lugares, ' + (need > beds ? 'faltariam ' + (need - beds) : 'sobrariam ' + (beds - need)) + ' com ' + (one ? 'quem chegou' : 'eles') + '.' +
      (info.kind === 'casal' ? ' Recusar é para sempre: não vem outro casal.' : '') +
      (PD ? ' Povos diferentes começam se estranhando: conversa, festa e história aproximam. Mandados seguir, voltam uma vez, daqui a uns anos.' : '');
    $('#choice-yes').textContent = one ? 'Acolher' : PD ? 'Acolher a caravana' : 'Acolher os três';
    $('#modal-choice').hidden = false;
    setTimeout(() => $('#choice-yes').focus(), 50);
    return true;
  };

  // ---------- árvore da família (SVG montado aqui) ----------
  UI.tree = function () {
    if (!S) return;
    const F = G.Family, people = S.people.slice();
    const gen = new Map();
    const g = (p) => {
      if (gen.has(p.id)) return gen.get(p.id);
      gen.set(p.id, 0);
      let v = 0;
      for (const id of [p.mother, p.father]) { const q = F.person(S, id); if (q) v = Math.max(v, g(q) + 1); }
      gen.set(p.id, v);
      return v;
    };
    people.forEach(g);
    // quem chegou de fora fica na geração de um par que nasceu aqui
    const bondIds = (p) => Object.keys(p.bonds || {}).map(Number);
    for (const p of people) {
      if (p.mother || p.father) continue;
      for (const id of bondIds(p)) { const q = F.person(S, id); if (q && (q.mother || q.father)) { gen.set(p.id, gen.get(q.id)); break; } }
    }
    const rows = [];
    for (const p of people) { const r = gen.get(p.id); (rows[r] = rows[r] || []).push(p); }
    // quem teve filho junto também fica lado a lado, se der
    const coParent = new Set();
    for (const p of people) if (p.mother && p.father) { coParent.add(p.mother + '-' + p.father); coParent.add(p.father + '-' + p.mother); }
    const mates = (p, row) => row.filter((q) => q !== p && (F.isPartner(p, q) || coParent.has(p.id + '-' + q.id)));
    const order = new Map();
    const pkey = (p) => Math.min(order.has(p.mother) ? order.get(p.mother) : 1e9, order.has(p.father) ? order.get(p.father) : 1e9);
    for (let ri = 0; ri < rows.length; ri++) {
      const row = (rows[ri] || []).sort((a, b) => pkey(a) - pkey(b) || a.born - b.born);
      // quem tem mais pares vai no meio, os pares dos dois lados
      const out = [];
      const byHub = row.slice().sort((a, b) => mates(b, row).length - mates(a, row).length || row.indexOf(a) - row.indexOf(b));
      const placed = new Set();
      for (const p of row) {
        if (placed.has(p.id)) continue;
        const hub = byHub.find((h) => !placed.has(h.id) && (h === p || mates(p, row).indexOf(h) >= 0) && mates(h, row).length > mates(p, row).length) || p;
        const ms = mates(hub, row).filter((q) => !placed.has(q.id));
        const left = ms.filter((_, i) => i % 2 === 1).reverse(), right = ms.filter((_, i) => i % 2 === 0);
        for (const q of left.concat([hub], right)) if (!placed.has(q.id)) { placed.add(q.id); out.push(q); }
        if (!placed.has(p.id)) { placed.add(p.id); out.push(p); }
      }
      rows[ri] = out;
      out.forEach((p, i) => order.set(p.id, ri * 1000 + i));
    }
    const NW = 112, NH = 46, GX = 14, GY = 50, PAD = 16;
    const widest = Math.max(1, ...rows.map((r) => (r ? r.length : 0)));
    const Wd = Math.max(360, widest * NW + (widest - 1) * GX + PAD * 2);
    const pos = new Map();
    rows.forEach((row, ri) => {
      const w = row.length * NW + (row.length - 1) * GX;
      row.forEach((p, i) => pos.set(p.id, { x: (Wd - w) / 2 + i * (NW + GX), y: PAD + 12 + ri * (NH + GY) }));   // +12: lugar para o arco dos pares
    });
    const Hd = PAD * 2 + 12 + rows.length * NH + (rows.length - 1) * GY;
    let lines = '', nodes = '';
    // pares: traço entre os dois, com um coração (lado a lado); de longe, um arco por cima
    const near = (a, b) => a.y === b.y && Math.abs(a.x - b.x) <= NW + GX + 1;
    const done = new Set();
    for (const p of people) {
      for (const id of bondIds(p)) {
        const q = F.person(S, id), key = Math.min(p.id, id) + '-' + Math.max(p.id, id);
        if (!q || done.has(key) || !pos.has(q.id)) continue;
        done.add(key);
        const a = pos.get(p.id), b = pos.get(q.id);
        if (a.y !== b.y) continue;
        if (near(a, b)) {
          const x1 = Math.min(a.x, b.x) + NW, x2 = Math.max(a.x, b.x), y = a.y + NH / 2;
          lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="t-couple"/><circle cx="${(x1 + x2) / 2}" cy="${y}" r="3.5" class="t-heart"/>`;
        } else {
          const x1 = a.x + NW / 2, x2 = b.x + NW / 2, y = a.y, mx = (x1 + x2) / 2, top = y - 16;
          lines += `<path d="M${x1} ${y}Q${mx} ${top * 2 - y} ${x2} ${y}" class="t-couple t-arc"/><circle cx="${mx}" cy="${top}" r="3.5" class="t-heart"/>`;
        }
      }
    }
    // filhos: descem do meio do par (lado a lado) ou de baixo da mãe
    const fams = new Map();
    for (const p of people) {
      if (!p.mother && !p.father) continue;
      const k = [p.mother, p.father].sort().join('-');
      (fams.get(k) || fams.set(k, []).get(k)).push(p);
    }
    for (const [k, kids] of fams) {
      const par = k.split('-').map(Number).filter(Boolean).map((id) => pos.get(id)).filter(Boolean);
      if (!par.length) continue;
      const side = par.length === 2 && near(par[0], par[1]);
      const mom = pos.get(kids[0].mother) || par[0];
      const px = side ? (Math.min(par[0].x, par[1].x) + NW + Math.max(par[0].x, par[1].x)) / 2 : mom.x + NW / 2;
      const py = side ? par[0].y + NH / 2 : mom.y + NH;
      const ks = kids.map((c) => pos.get(c.id)).filter(Boolean);
      if (!ks.length) continue;
      const by = ks[0].y - GY / 2;
      const xs = ks.map((c) => c.x + NW / 2);
      lines += `<path d="M${px} ${py}V${by}" class="t-line"/>`;
      lines += `<path d="M${Math.min(px, ...xs)} ${by}H${Math.max(px, ...xs)}" class="t-line"/>`;
      for (const x of xs) lines += `<path d="M${x} ${by}V${ks[0].y}" class="t-line"/>`;
    }
    for (const p of people) {
      const a = pos.get(p.id);
      const age = p.alive ? UI.ageText(S, p) : '† ' + anos(yearsOf(p));
      nodes += `<g class="t-node${p.alive ? '' : ' dead'}${p.sex === 'F' ? ' f' : ' m'}" data-pid="${p.id}" transform="translate(${a.x},${a.y})">` +
        `<rect width="${NW}" height="${NH}" rx="6"/><text x="10" y="19" class="t-name">${esc(p.name)}</text><text x="10" y="35" class="t-age">${esc(age)}</text></g>`;
    }
    $('#tree').innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" width="${Wd}" height="${Hd}" role="img" aria-label="Árvore da família">${lines}${nodes}</svg>`;
    $('#tree').onclick = (e) => {
      const n = e.target.closest('[data-pid]'); if (!n) return;
      const id = +n.getAttribute('data-pid'), q = F.person(S, id);
      if (!q) return;
      $('#modal-tree').hidden = true;
      UI.select(q.carriedBy ? q.carriedBy : id, 0, true);
      if (q.carriedBy) UI.select(id, 0, false);
    };
    $('#modal-tree').hidden = false;
    // começa com o casal fundador no meio (no celular a árvore rola para os lados)
    const box = $('#tree');
    box.scrollLeft = Math.max(0, (box.scrollWidth - box.clientWidth) / 2);
  };

  // ---------- descobertas: a trilha ----------
  // Descobertas: a trilha da Era da Família (Etapa 5) e as invenções (Etapa 8), em duas abas
  let discTab = 'trilha';
  const listPT = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
  UI.disc = function (tab) {
    if (!S) return;
    if (tab) discTab = tab;
    const T = G.Tech, I = G.Inv, open = T.open(S);
    const reveal = (id) => {
      if (!G.God.unlocked(S, 'revelacao')) return '';
      if (T.revealable(S, id)) return `<button class="btn btn-small" data-reveal="${id}">Revelar (${C.REVELACAO_COST} de Poder)</button>`;
      return `<span class="small muted">Revelação: a partir de ${Math.round(C.REVELACAO_MIN * 100)}% da prática.</span>`;
    };
    const knownTxt = (d, k) => (k.how === 'revelacao' ? 'Revelada a ' : d.inv ? 'Inventada por ' : 'Descoberta por ') + esc(k.by || 'alguém') + ' · ' + esc(Sim.dateText(k.t).toLowerCase());
    const row = (id, cls, status, bar, act) => { const d = T.DISC[id];
      return `<li class="${cls}"><img class="ico ico-lg" src="${ic(d.icon)}" alt="">
        <div><b>${esc(d.name)}</b><span class="small gives">${esc(d.gives)}</span><span class="small st">${status}</span>${bar}${act}</div></li>`; };
    const learning = (id, pr) => ['Aprendendo ' + esc(T.DISC[id].learn) + ' · ' + Math.floor(pr * 100) + '% da prática', `<div class="bar"><i style="width:${Math.floor(pr * 100)}%"></i></div>`];
    $('#disc-list').innerHTML = T.ORDER.map((id, i) => {
      const k = S.tech.known[id];
      if (k) return row(id, 'known', knownTxt(T.DISC[id], k), '', '');
      if (id === open) { const [st, bar] = learning(id, T.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
      return row(id, 'locked', i === 0 ? 'Depois da primeira fogueira' : 'Depois de ' + esc(T.DISC[T.ORDER[i - 1]].name.toLowerCase()), '', '');
    }).join('');
    if (I) {
      $('#inv-list').innerHTML = I.ORDER.map((id) => {
        const k = S.tech.known[id];
        if (k) return row(id, 'known', knownTxt(T.DISC[id], k), '', '');
        if (I.isOpen(S, id)) { const [st, bar] = learning(id, I.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
        return row(id, 'locked', '<span class="req">Pede ' + esc(listPT(I.missing(S, id))) + '</span>', '', '');
      }).join('');
      $('#inv-count').textContent = '(' + I.count(S) + ' de ' + I.ORDER.length + ')';
    }
    // Etapa 10: as descobertas do campo (roça, algodão, cerca e criação), no mesmo jeito das invenções
    const K = G.Campo;
    if (K) {
      $('#campo-list').innerHTML = K.ORDER.map((id) => {
        const k = S.tech.known[id];
        if (k) return row(id, 'known', knownTxt(T.DISC[id], k), '', '');
        if (K.isOpen(S, id)) { const [st, bar] = learning(id, K.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
        return row(id, 'locked', '<span class="req">Pede ' + esc(listPT(K.missing(S, id))) + '</span>', '', '');
      }).join('');
      $('#campo-count').textContent = '(' + K.count(S) + ' de ' + K.ORDER.length + ')';
    }
    // Etapa 12: as descobertas da mina (mineração e metalurgia), no mesmo jeito
    const Mi = G.Minas;
    if (Mi) {
      $('#mina-list').innerHTML = Mi.ORDER.map((id) => {
        const k = S.tech.known[id];
        if (k) return row(id, 'known', k.how === 'povo' ? 'Ensinada por ' + esc(k.by || 'quem veio de fora') + ' · ' + esc(Sim.dateText(k.t).toLowerCase()) : knownTxt(T.DISC[id], k), '', '');
        if (Mi.isOpen(S, id)) { const [st, bar] = learning(id, Mi.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
        return row(id, 'locked', '<span class="req">Pede ' + esc(listPT(Mi.missing(S, id))) + '</span>', '', '');
      }).join('');
      $('#mina-count').textContent = '(' + Mi.count(S) + ' de ' + Mi.ORDER.length + ')';
    }
    const cur = discTab === 'inv' && I ? 'inv' : discTab === 'campo' && K ? 'campo' : discTab === 'mina' && Mi ? 'mina' : 'trilha', inv = cur !== 'trilha';
    $('#disc-list').hidden = cur !== 'trilha'; $('#inv-list').hidden = cur !== 'inv'; $('#campo-list').hidden = cur !== 'campo'; $('#mina-list').hidden = cur !== 'mina';
    for (const b of document.querySelectorAll('.disc-tabs [data-dtab]')) b.classList.toggle('on', b.dataset.dtab === cur);
    $('#disc-intro').textContent = cur === 'inv'
      ? 'Cada invenção abre quando o que ela pede já existe e aprende com o seu próprio trabalho: várias andam ao mesmo tempo. A Revelação entrega a que você escolher, se o povo já passou de ' + Math.round(C.REVELACAO_MIN * 100) + '% da prática.'
      : cur === 'mina' ? 'Os metais começam com a cerâmica: quem quebra pedra aprende a mineração, e quem trabalha na mina, a metalurgia. Os anões já chegam sabendo as duas, e ensinam.'
      : cur === 'campo' ? 'O campo começa com a cerâmica: primeiro a roça; dela vêm o algodão, a criação e, com a corda, a cerca. Cada uma aprende com o seu próprio trabalho, e a Revelação entrega a que você escolher.'
        : 'O povo aprende fazendo: cada descoberta vem da prática, uma depois da outra. A Revelação de Deus entrega a próxima antes da hora.';
    const alive = S.people.filter((p) => p.alive).length;
    $('#disc-era').hidden = inv;
    $('#disc-era').textContent = S.stats.eraEnd ? 'A Era da Família se fechou em ' + Sim.dateText(S.stats.eraEnd).toLowerCase() + '.' :
      'Para fechar a Era da Família: ' + C.ALDEIA_POP + ' pessoas (hoje ' + alive + ') e a cerâmica' + (T.known(S, 'ceramica') ? ' (já descoberta).' : '.');
    $('#modal-disc').hidden = false;
  };

  // ---------- fim da Era da Família ----------
  UI.eraEnd = function (onDone) {
    const st = S.stats, alive = S.people.filter((p) => p.alive), dead = S.people.filter((p) => !p.alive);
    const years = Math.max(1, Math.floor((st.eraEnd - C.START_HOUR * 60) / (C.DAY_MIN * C.YEAR_DAYS)));
    const gens = Math.max(1, ...S.people.map(function gen(p) { const m = G.Family.person(S, p.mother), f = G.Family.person(S, p.father); return 1 + Math.max(m ? gen(m) : 0, f ? gen(f) : 0); }));
    $('#era-ico').src = ic('pote');
    // só o que o povo tem de fato
    const has = ['fogo'];
    if (G.Tech.known(S, 'pedra')) has.push('ferramentas de pedra');
    if (st.hunted) has.push('caça');
    if (st.conserved) has.push('comida guardada para o inverno');
    has.push(S.tech && S.tech.potes ? 'potes de barro' : 'o segredo do barro');
    $('#era-lead').textContent = 'Em ' + years + (years === 1 ? ' ano' : ' anos') + ', o casal que chegou ' + S.siteLabel + ' virou um povo de ' + alive.length +
      ' pessoas, com ' + has.slice(0, -1).join(', ') + ' e ' + has[has.length - 1] + '. O acampamento virou aldeia.';
    $('#era-stats').innerHTML = [
      ['pessoa', 'Vivos', alive.length], ['bebe', 'Nasceram', st.births || 0], ['arvore', 'Gerações', gens],
      ['lasca', 'Descobertas', G.Tech.count(S) + ' de ' + G.Tech.ORDER.length], ['deus', 'Milagres', S.god ? S.god.miracles : 0],
      ['reza', 'Orações atendidas', S.god ? S.god.answered : 0], ['cronica', 'Túmulos', dead.length],
    ].map(([i, k, v]) => `<dt><img class="ico" src="${ic(i)}" alt="">${k}</dt><dd>${v}</dd>`).join('');
    $('#era-ok').onclick = () => { $('#modal-era').hidden = true; if (onDone) onDone(); };
    $('#modal-era').hidden = false;
    setTimeout(() => $('#era-ok').focus(), 50);
  };

  UI.showOver = function (state) {
    $('#over-chron').innerHTML = state.chron.slice().reverse().map((c) => `<li><span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span></li>`).join('');
    $('#scr-over').hidden = false;
  };
})(globalThis.G = globalThis.G || {});
