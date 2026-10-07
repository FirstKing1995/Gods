/* Gods · números de balanceamento v0.6 (Etapas 1 a 5: MVP da Era da Família; Etapa 6: Vida).
   Tudo que é ajuste de jogo mora aqui. Unidades: minutos e horas DE JOGO. */
(function (G) {
  'use strict';
  G.CFG = {
    VERSION: '0.13.0',
    SAVE_KEY: 'genesis.save.v1',
    // endereço do Web App do Google Apps Script (termina em /exec). Vazio = jogo só local.
    API_URL: '',
    CLOUD_SAVE_SEC: 180,

    // ---- mapa ----
    MAP: 128,            // 128 x 128 tiles
    TILE: 16,            // px por tile
    CHUNK: 16,           // tiles por bloco de render

    // ---- tempo: 1 hora real = 1 ano em 1x ----
    DAY_MIN: 1440,
    SEASON_DAYS: 15,
    YEAR_DAYS: 60,
    REAL_SEC_PER_DAY: 60,          // 1x: 1 dia = 1 min real
    SPEEDS: [0, 1, 2, 5, 10, 20],
    STEP_MIN: 2,                   // passo fixo da simulação
    START_HOUR: 7,

    // ---- clima ----
    SEASONS: ['Primavera', 'Verão', 'Outono', 'Inverno'],
    SEASON_TEMP: [16, 25, 11, 1],  // °C médio de cada estação
    SEASON_BLEND_DAYS: 3,          // transição suave nos últimos dias
    DAY_SWING: 5,                  // ±°C ao longo do dia
    DAY_RANDOM: 3,                 // sorteio ±°C por dia
    MOUNTAIN_COLD: -4, HILL_COLD: -2,
    RAIN_CHANCE: [0.30, 0.15, 0.35, 0.30],
    RAIN_COLD: -2, SNOW_COLD: -3,
    COMFORT: 16,                   // abaixo disso, perde calor

    // ---- necessidades (por hora de jogo) ----
    HUNGER_H: 80 / 24,
    THIRST_H: 120 / 24, THIRST_SUMMER: 1.3,
    ENERGY_H: 5,
    SLEEP_GROUND_H: 9, SLEEP_TENT_H: 12, SLEEP_TENT2_H: 13,
    SOCIAL_H: 30 / 24, CHAT_SOCIAL_H: 70,
    SLEEP_METABOLISM: 0.6,         // fome e sede caem mais devagar dormindo
    // frio: o calor do corpo cai até um piso que depende da temperatura
    // piso = 100 - (conforto - T) * COLD_SLOPE  -> 3 °C: 22 · -4 °C: 0
    COLD_SLOPE: 6, COLD_RATE: 5, COLD_RATE_DEG: 0.5,
    WARM_GAIN: 6, WARM_GAIN_DEG: 1.2,
    HEALTH_DAY: { fome: 35, sede: 70, frio: 90 },   // perda por dia com a necessidade em zero
    HYPOTHERMIA_BELOW: 10, HYPOTHERMIA_DAY: 30,
    HEALTH_REGEN_DAY: 18,
    PREGNANT_ENERGY: 1.3, PREGNANT_HUNGER: 1.3,     // grávida cansa e come mais

    // ---- comida e água ----
    FRUIT_FOOD: 25, FISH_COOKED: 45, FISH_RAW: 22, WATER_DRINK: 40,
    START_STOCK: { madeira: 0, pedra: 0, agua: 0, frutas: 8, peixe: 0, carne: 0, defumado: 0, seca: 0, couro: 0, argila: 0, ferramentas: 0, roupas: 0,
      tabuas: 0, fibra: 0, mantas: 0, redes: 0, feijao: 0, milho: 0, abobora: 0, mandioca: 0, ovos: 0, leite: 0 },
    ROT_FRUIT: 0.04, ROT_FISH: 0.08,            // parte do estoque que estraga por dia
    ROT_SEASON: [1, 1.5, 1, 0.3],               // verão apressa, inverno conserva

    // ---- movimento ----
    WALK_MIN_PER_TILE: 8,
    COST: [Infinity, 2.5, 2.5, 1.1, 1, 1.25, 1.15, 1.4, 1],   // por tipo de tile
    SNOW_SLOW: 1.15,

    // ---- trabalho ----
    CARRY: 10,
    CHOP_MIN: 150, TREE_WOOD: 8, TREE_REGROW_DAYS: 45,
    MINE_MIN: 110, ROCK_STONE: 4,
    HARVEST_MIN: 10, HARVEST_FRUIT_MIN: 8,
    BUSH_MAX: 3, BUSH_DAYS_PER_FRUIT: [4, 4, 6, 0],   // 0 = não produz
    WATER_MIN: 20, WATER_TRIP: 6, WATER_CAP: 30,
    FISH_SESSION: 180, FISH_ROLL: 30, FISH_CHANCE: 0.14, FISH_CHANCE_LVL: 0.03,
    FISH_WINTER: 0.5, FISH_MAX: 4,
    SEARCH_MAX: 55,                // custo máx. de busca de alvos
    SEARCH_FAR: 130,               // pedra e madeira: quando acaba perto, vão mais longe
    BUILD_PASS_COST: 6,            // passar por dentro de uma obra custa 6x (só quando não há outro jeito)

    // ---- fogo ----
    FIRE_CAP: 8, FIRE_BURN_H: 5, FIRE_RAIN: 1.5, FIRE_REFUEL_AT: 3,
    FIRE_HEAT: 22, FIRE_FULL_R: 1.6, FIRE_MAX_R: 5,
    FIRE_SEATS: 4, FIRE_CROWD: 0.4,   // quem dorme ao relento: 4 cabem no calor da fogueira, o resto pega só 40%
    SLEEP_BY_FIRE: 25,             // com o calor do corpo abaixo disso, dorme junto do fogo e termina de se aquecer antes de dormir

    // ---- habilidades ----
    SKILL_XP_DIV: 3, SKILL_BONUS: 0.06, SKILL_MAX: 10,

    // ---- construções ----
    // Etapa 7: toda obra evolui no lugar. 'up' lista os níveis 2, 3...: cada um soma ao nível de baixo (custo e trabalho
    // são só da melhoria). No nível 3, a barraca vira a casa que o lugar pede (HOUSES). need: descoberta que abre;
    // needB: obra que precisa existir (de pé) no acampamento.
    BUILD: {
      // fire: burn = horas por lenha · rain = pressa na chuva · seats = quantos dormem no calor ao relento · r = raio do calor
      // listen = ouvintes de uma história · story/party = quanto a história ensina e a festa aproxima
      fogueira: { name: 'Fogueira', a: 'a', key: 'F', w: 1, h: 1, cost: { madeira: 4, pedra: 4 }, work: 60,
        fire: { burn: 5, rain: 1.5, seats: 4, r: 5, listen: 10, story: 1, party: 1 },
        desc: 'Aquece num raio de 5 passos, ilumina a noite e cozinha peixe.',
        up: [
          { name: 'Fogueira de pedras', cost: { pedra: 8 }, work: 120, fire: { burn: 7, rain: 0.8, seats: 6, r: 6, listen: 12, story: 1, party: 1 },
            desc: 'Roda de pedras: a lenha dura 40% mais, a chuva quase não apaga, 6 dormem no calor e o calor vai a 6 passos.' },
          { name: 'Fogueira do centro', cost: { pedra: 10, tabuas: 6 }, work: 240, fire: { burn: 8, rain: 0.6, seats: 8, r: 7, listen: 16, story: 1.5, party: 1.5 },
            desc: 'Bancos em volta: 16 ouvem as histórias, que ensinam 50% mais, e a festa aproxima mais. 8 dormem no calor.' },
        ] },
      // cap: lugares (adulto e jovem ocupam 2, criança 1, bebê vai no colo) · sleep: energia por hora dormindo
      barraca: { name: 'Barraca simples', a: 'a', key: 'B', w: 2, h: 2, cost: { madeira: 14 }, work: 240, heat: 8, cap: 5, sleep: 12,
        desc: '+8 °C para quem dorme. Cabe um casal e uma criança.',
        up: [
          { name: 'Barraca avançada', cost: { madeira: 12, pedra: 8 }, work: 360, heat: 12, cap: 6, sleep: 13,
            desc: '+12 °C e sono melhor. Cabe um casal e duas crianças.' },
          { choose: ['oca', 'palafita', 'barro', 'pedra'] },
        ] },
      // Etapa 5: liberadas pelas descobertas (need)
      moquem: { name: 'Moquém', a: 'o', key: 'M', w: 1, h: 1, cost: { madeira: 6, pedra: 2 }, work: 90, need: 'conserva', smoke: { cap: 10 },
        desc: 'Grelha de varas sobre brasa: defuma peixe e carne, que quase não estragam.',
        up: [{ name: 'Moquém grande', cost: { madeira: 6, pedra: 6 }, work: 120, smoke: { cap: 20 }, desc: 'Grelha dobrada: defuma 20 de uma vez.' }] },
      jirau: { name: 'Jirau', a: 'o', key: 'J', w: 2, h: 1, cost: { madeira: 6 }, work: 90, need: 'conserva', dry: { cap: 12, rain: false },
        desc: 'Estrado de varas ao sol: seca frutas, que atravessam o inverno.',
        up: [{ name: 'Jirau coberto', cost: { tabuas: 6, fibra: 4 }, work: 120, dry: { cap: 20, rain: true }, desc: 'Coberto de palha: seca 20 de uma vez e segue secando na chuva.' }] },
      forno: { name: 'Forno de barro', a: 'o', key: 'O', w: 2, h: 2, cost: { argila: 12, pedra: 6, madeira: 8 }, work: 300, need: 'ceramica', potes: 1,
        desc: 'Queima potes de barro: o estoque guarda o dobro de água e a comida dura mais.',
        up: [{ name: 'Forno grande', cost: { argila: 12, pedra: 8 }, work: 300, potes: 2, desc: 'Potes grandes: guardam 90 de água, e a comida estraga 40% menos.' }] },
      // Etapa 12: a mina (ao pé da serra) e a ferraria. mine: quantos mineiros por vez e o nível da sorte
      mina: { name: 'Mina', a: 'a', key: '', w: 2, h: 2, cost: { madeira: 10 }, work: 300, need: 'mineracao', env: 'serra', mine: { cap: 2, lv: 1 },
        desc: 'Uma boca cavada ao pé da serra: dá pedra sempre e, com sorte, carvão e minério de ferro. Dois mineiros por vez.',
        up: [
          { name: 'Mina funda', cost: { madeira: 12, tabuas: 8 }, work: 360, mine: { cap: 3, lv: 2 },
            desc: 'Escoras de tábua deixam cavar mais fundo: mais minério, e aparecem a prata e, de vez em quando, ouro e pedra preciosa. Três mineiros.' },
          { name: 'Mina de veio', cost: { tabuas: 10, pedra: 10 }, work: 420, need: 'metalurgia', mine: { cap: 4, lv: 3 },
            desc: 'Trilho, carrinho e lampião: quatro mineiros seguem o veio. Mais prata, ouro e pedras preciosas.' },
        ] },
      ferraria: { name: 'Ferraria', a: 'a', key: '', w: 2, h: 2, cost: { pedra: 20, madeira: 10 }, work: 360, need: 'metalurgia', shop: { k: 'ferro', speed: 1 },
        desc: 'Forja de pedra com fole e bigorna: de 2 de minério e 1 de carvão sai uma ferramenta de ferro.',
        up: [{ name: 'Ferraria com ourives', cost: { pedra: 10, tabuas: 8 }, work: 300, shop: { k: 'ferro', speed: 1.3, joias: true },
          desc: 'Forja 30% mais depressa e ganha a bancada do ourives: de 1 de prata ou de ouro sai uma joia.' }] },
      // Etapa 7: obras novas
      armazem: { name: 'Armazém', a: 'o', key: 'G', w: 2, h: 2, cost: { madeira: 16, pedra: 6 }, work: 300, store: { rot: 0.75 }, near: 8, open: 'inverno',
        desc: 'Guarda a comida do estoque: estraga 25% menos e o lobo não leva. Tem que ficar a até 8 passos do estoque.',
        up: [{ name: 'Armazém de tábuas', cost: { tabuas: 12, argila: 6 }, work: 360, store: { rot: 0.55 }, desc: 'Fechado e alto: a comida estraga 45% menos.' }] },
      // shop: oficina do Ofício · k = o que sai dela · speed = rapidez
      marcenaria: { name: 'Marcenaria', a: 'a', key: 'K', w: 2, h: 2, cost: { madeira: 14, pedra: 4 }, work: 300, need: 'pedra', shop: { k: 'tabuas', speed: 1 },
        desc: 'Bancada de trabalho: o Ofício faz tábuas (2 madeira dão 1 tábua), que as obras maiores pedem.',
        up: [{ name: 'Marcenaria com bancada', cost: { tabuas: 8, pedra: 4 }, work: 240, shop: { k: 'tabuas', speed: 2 }, desc: 'Bancada firme: tábua em metade do tempo.' }] },
      tecelagem: { name: 'Tecelagem', a: 'a', key: 'L', w: 2, h: 2, cost: { madeira: 10, fibra: 6 }, work: 240, need: 'cestos', shop: { k: 'tecido', speed: 1 },
        desc: 'Tear de varas: o Ofício tece mantas (quem dorme com uma sente menos frio) e redes (o sono rende mais).',
        up: [{ name: 'Tear grande', cost: { tabuas: 8, fibra: 4 }, work: 240, shop: { k: 'tecido', speed: 2 }, desc: 'Tear de tábuas: manta e rede em metade do tempo.' }] },
      // Etapa 10: o campo. A roça não pede material, só o trabalho de limpar o terreno (soil: não vai em areia nem em pedra)
      roca: { name: 'Roça', a: 'a', key: 'H', w: 3, h: 3, cost: {}, work: 180, need: 'roca', soil: true, farm: { mult: 1 },
        desc: 'Terra lavrada para plantar feijão, milho, abóbora, mandioca e, depois, algodão. O povo planta, capina e colhe (Roça nas Vontades).',
        up: [{ name: 'Roça adubada', cost: { madeira: 4 }, work: 120, need: 'criacao', farm: { mult: 1.3 },
          desc: 'Esterco do curral misturado na terra: a roça rende 30% mais.' }] },
      curral: { name: 'Curral', a: 'o', key: 'Y', w: 3, h: 3, cost: { madeira: 12 }, work: 240, need: 'criacao', pen: { cap: 8 },
        desc: 'Abrigo com cocho para os bichos de criação: 8 lugares (galinha e coelho ocupam meio; vaca, dois). De dia eles pastam em volta; de noite, dormem aqui.',
        up: [{ name: 'Curral grande', cost: { madeira: 10, tabuas: 6 }, work: 240, pen: { cap: 14 }, desc: 'Cercado maior, com abrigo de tábuas: 14 lugares.' }] },
      // Etapa 11: a estátua de Deus (nível 3). Pronta, Deus a consagra com um milagre próprio, que acontece sozinho
      estatua: { name: 'Estátua', a: 'a', key: '', w: 2, h: 2, cost: { pedra: 30, madeira: 10 }, work: 480, god: { reach: 1, reza: 1 },
        desc: 'A imagem de Deus em pedra. Consagrada, faz o milagre dela sozinho; quem tem fé reza ali de manhã.',
        up: [{ name: 'Estátua com altar', cost: { pedra: 20, tabuas: 6 }, work: 360, god: { reach: 1.5, reza: 2 },
          desc: 'Um altar de pedra aos pés dela: o milagre da estátua vai metade mais longe, e quem reza ali ganha o dobro de fé.' }] },
      // Etapa 13: o marco do cemitério. As covas se abrem em volta dele, em fileiras (mem.r: até onde vão; vale: quanto
      // valem a visita e o dia dos mortos). Se ninguém marcar, o povo escolhe o lugar na primeira morte
      cemiterio: { name: 'Cemitério', a: 'o', key: '', w: 2, h: 2, cost: { madeira: 4 }, work: 60, mem: { r: 6, vale: 1 },
        desc: 'O lugar dos que partiram. O povo vela ao pé do fogo, enterra aqui, traz flores e volta todo ano, no último dia do outono.',
        up: [{ name: 'Cemitério cercado', cost: { madeira: 20 }, work: 300, mem: { r: 8, vale: 1.5 },
          desc: 'Uma cerca baixa e um portal de madeira: cabe mais gente, e a visita e o dia dos mortos consolam metade a mais.' }] },
    },
    // nível 3 da barraca: a casa que o lugar pede (env: o que precisa ter em volta)
    HOUSES: {
      oca: { name: 'Oca', cost: { madeira: 26, fibra: 14 }, work: 600, heat: 14, cap: 12, sleep: 13, env: 'mata',
        desc: 'Casa grande de varas e palha, para muitas famílias: 12 lugares e +14 °C.' },
      palafita: { name: 'Palafita', cost: { tabuas: 14, madeira: 8 }, work: 540, heat: 13, cap: 8, sleep: 14, env: 'agua', needB: 'marcenaria',
        desc: 'Casa de tábuas sobre esteios, na beira d’água: 8 lugares, +13 °C e sono fresco.' },
      barro: { name: 'Casa de barro', cost: { argila: 16, madeira: 8 }, work: 540, heat: 16, cap: 8, sleep: 14, env: 'campo', need: 'ceramica',
        desc: 'Paredes de taipa, no campo aberto: 8 lugares e +16 °C.' },
      pedra: { name: 'Casa de pedra', cost: { pedra: 24, madeira: 8 }, work: 660, heat: 18, cap: 8, sleep: 14, env: 'serra', need: 'pedra',
        desc: 'Paredes de pedra, perto da serra: a mais quente, +18 °C, com 8 lugares.' },
    },
    // o que cada ambiente pede, olhando em volta da obra
    ENV: {
      agua: { name: 'água a até 3 passos' },
      mata: { name: 'mata por perto', forest: 14, trees: 5 },
      campo: { name: 'campo aberto em volta', open: 30 },
      serra: { name: 'colina, montanha ou pedras por perto', hill: 10, rocks: 3 },
    },
    MATERIALS: ['madeira', 'pedra', 'argila', 'tabuas', 'fibra'],   // o que as obras podem pedir
    // 0.12: demolir é trabalho do povo (uma parte do trabalho de erguer) e devolve metade do material; mudar de lugar é
    // desmontar e erguer de novo no lugar novo, levando três quartos do material (o resto sai do estoque)
    DEMOL_WORK: 0.35, DEMOL_REFUND: 0.5, MOVE_KEEP: 0.75, MOVE_WORK: 0.6, NO_MOVE: { roca: 1, curral: 1 },
    // caminhos: 0 nada · 1 trilha (se forma sozinha onde muita gente passa) · 2 caminho de terra · 3 caminho de pedra
    ROAD_MULT: [1, 0.85, 0.7, 0.55],
    ROAD_WORK: [0, 0, 12, 18],           // minutos de trabalho por passo de caminho
    ROAD_COST: [null, null, {}, { pedra: 1 }],
    TRAIL_ON: 60, TRAIL_OFF: 20, TRAIL_DECAY: 0.94,   // pegadas por passo para virar trilha, para sumir, e o que fica de um dia pro outro
    // oficinas (Ofício): tábua, manta e rede
    TABUA_MIN: 40, TABUA_WOOD: 2, TABUA_KEEP: 6,
    TECIDO_MIN: 90, MANTA_FIBRA: 3, REDE_FIBRA: 4,
    MANTA_HEAT: 5, MANTA_WEAR_DAY: 0.5, REDE_SLEEP: 1.15, REDE_WEAR_DAY: 0.4,
    EMBIRA: 2,                           // fibra que cada árvore cortada dá (depois dos cestos)
    ARMAZEM_NEAR: 8,

    // ---- névoa: Deus vê e age só onde o povo já esteve ----

    SEE_CAMP: 10, SEE_R: 6, SEE_OLD_SAVE: 22,


    // ---- IA ----
    VONTADE_W: [0, 0.5, 1, 1.6],
    WORK_BASE: 32, WORK_CAP: 75, CRITICAL: 15, CRITICAL_BONUS: 70, EVENING_BONUS: 18,
    DEFAULT_VONTADES: { frutas: 2, agua: 2, madeira: 2, pedra: 1, pesca: 2, caca: 2, argila: 1, construir: 2, oficio: 2, conservar: 2, fogo: 3, roca: 2, criacao: 2, mina: 2 },
    REEVAL_MIN: 20,

    // ---- Deus (Etapa 2) ----
    FAITH_START: 50, POWER_START: 15, POWER_PER_FAITH_H: 0.22,
    PRAYER_HOURS: 12, PRAYER_COOLDOWN_H: 24, PRAYER_ANSWERED_COOLDOWN_H: 12,
    FAITH_ANSWER: 15, FAITH_ANSWER_SEEN: 6, FAITH_IGNORED: -8, FAITH_IGNORED_SEEN: -2,
    FAITH_MIRACLE_SEEN: 3, FAITH_DEATH: -8,
    CALOR_HEAT: 18, CALOR_R: 5, CALOR_HOURS: 12,
    CHUVA_R: 12, CHUVA_HOURS: 6, CHUVA_FRUIT: 2, CHUVA_WATER: 10,
    RAIO_R: 0.9, RAIO_DAMAGE: 35,

    // ---- tempo com o jogo fechado ----
    // tempo com o jogo fechado: fração do 1x (o jogador escolhe no menu; padrão metade)
    OFFLINE_RATES: [0.1, 0.25, 0.5, 1], OFFLINE_RATE_NAMES: ['1/10 (1 h fora = 6 dias)', '1/4 (1 h fora = 15 dias)', 'metade (1 h fora = 30 dias)', 'igual ao 1x (1 h fora = 1 ano)'],
    OFFLINE_RATE_DEFAULT: 2, OFFLINE_MAX_DAYS: 300, OFFLINE_MIN_SEC: 120, OFFLINE_HEALTH_FLOOR: 25,
    // 0.12: a volta tem orçamento de relógio. Até BUDGET, entram dias inteiros pelo meio; passou de HARD, o que falta
    // vira dia resumido; passou do dobro de HARD (aparelho muito lento), o resto do tempo deixa de passar
    OFFLINE_BUDGET_MS: 2500, OFFLINE_HARD_MS: 7000,
    // dias resumidos: o estoque volta ao nível de sempre da aldeia em REST_TAU dias; nunca abaixo de REST_FOOD_DAYS de
    // comida; REST_PRAY dos fiéis rezam de manhã; REST_CHATS conversas por pessoa por dia
    REST_TAU: 8, REST_FOOD_DAYS: 30, REST_PRAY: 0.6, REST_CHATS: 0.35,

    // ---- povos (Etapa 12) ----
    // convivência entre dois povos (0 a 100): começa em CONV_START. O dia a dia soma pouco e tem teto por par de povos
    // por dia (CONV_DAY; metade a mais quando um dos dois é humano, o povo acolhedor): a conversa CONV_CHAT (em dobro
    // com um acolhedor; quatro vezes ao ensinar ou consolar), a história CONV_HISTORIA, a pregação CONV_SERMAO e cada
    // mestiço vivo CONV_PONTE. Os acontecimentos somam por fora do teto: as pazes CONV_PAZES, a festa CONV_FESTA, cada
    // casal misto CONV_CASAL, cada filho mestiço CONV_FILHO; a briga tira CONV_BRIGA. Abaixo de 50 briga-se até
    // CONV_FIGHT a mais e os pares saem mais devagar; abaixo de CONV_LOW o jogo avisa. Em 100 os dois povos viram um
    // só, de uma vez por todas. Nos testes de 20 anos a primeira união sai de 5 a 9 anos depois da primeira caravana
    CONV_START: 20, CONV_LOW: 15, CONV_DAY: 0.2, CONV_DAY_HUM: 1.5,
    CONV_CHAT: 0.03, CONV_HISTORIA: 0.15, CONV_SERMAO: 0.15, CONV_PONTE: 0.03,
    CONV_PAZES: 0.5, CONV_FESTA: 1, CONV_CASAL: 1, CONV_FILHO: 4, CONV_BRIGA: 3, CONV_FIGHT: 0.6,
    // os dons
    DOM_PEDRA: 1.6, DOM_OBRA: 1.4, DOM_MATA: 1.5, DOM_FERREIRO: 1.6, DOM_VERSATIL: 1.15, DOM_ARQUEIRO_HIT: 0.2, DOM_ARQUEIRO_R: 1.2,
    DOM_FARO_CARNE: 3, DOM_GARRAS_HIT: 0.25, DOM_GARRAS_BITE: 0.5, DOM_VISTA: 2, DOM_NOITE: 0.9,
    // as caravanas: a primeira sai POVO_FIRST_D dias depois de a aldeia se formar (ou a partir do ano POVO_YEAR, com
    // POVO_MIN_POP pessoas); as outras, a cada POVO_GAP_D dias; quem foi mandado seguir volta uma vez, POVO_VOLTA_D
    // dias depois. Deus pode chamar um povo (nível POVO_CALL_LV, POVO_CALL de Poder)
    POVO_FIRST_D: [20, 40], POVO_GAP_D: [90, 150], POVO_VOLTA_D: 180, POVO_YEAR: 6, POVO_MIN_POP: 6, POVO_MAX_POP: 150, POVO_CALL: 300, POVO_CALL_LV: 2,

    // ---- minas e metais (Etapa 12) ----
    MINA_NEED: { mineracao: 90, metalurgia: 80 },
    // um turno na mina (MINA_TURNO min de trabalho) dá pedra sempre e, por sorte, o resto; por nível da mina (1, 2, 3).
    // n: quantos saem quando sai. A mão de pedra do anão multiplica a sorte
    MINA_TURNO: 120, MINA_SORTE_ANAO: 1.4,
    MINA_YIELD: { pedra: [4, 4, 5], carvao: [0.45, 0.5, 0.5], minerio: [0.3, 0.5, 0.55], prata: [0, 0.14, 0.2], ouro: [0, 0.04, 0.1], gemas: [0, 0.02, 0.07], n: { carvao: 2, minerio: 2 } },
    // a forja: uma ferramenta de ferro pede minério e carvão; rende mais (e mais ainda no machado), gasta um terço,
    // segura melhor a mordida e ajuda na luta. Forja quem é ferreiro nato ou tem Ofício no nível FORJA_LVL
    FERRO_COST: { minerio: 2, carvao: 1 }, FERRO_MIN: 110, JOIA_MIN: 90, FORJA_LVL: 4,
    FERRO_BONUS: 1.45, FERRO_MACHADO: 1.9, FERRO_WEAR: 0.3, FERRO_BITE: 0.8, FERRO_LUTA: 0.1,
    // o que brilha: oferenda ao pé da estátua (Poder, uma por estátua por dia), troca com o mascate e a joia, que
    // levanta o humor de quem usa
    OFERENDA: { prata: 8, ouro: 20, gemas: 40 }, OFERENDA_KEEP: 0, JOIA_MOOD: 3,   // (quanto valem na troca: TRADE_VALUE)

    // ---- metas do Ato 1 ----
    GOAL_FOOD: 60, GOAL_WOOD: 60,
    GOAL_FOOD_DAYS: 10, GOAL_PEOPLE: 6,

    // ---- família (Etapa 3) · tempo em anos de jogo (1 ano = 60 dias = 1 h real em 1x) ----
    CHILD_HELP_AGE: 7, OLD_AGE: 60, CARRY_CHILD: 5,
    AFETO_START: 60, AFETO_CHAT: 2, AFETO_NIGHT: 1, AFETO_MIN: 40, AFETO_DECAY: 0.5,
    COUPLE_TALKS: 6, COUPLE_DAILY: 0.1,
    // Etapa 6: relações livres. Até 4 pares do outro sexo por pessoa; cada par que já tem pesa 0,6 na chance de outro
    // (no máximo 2 vezes); mulher em idade de ter filho e sem par homem tem o dobro de chance com um homem (é daí que o povo cresce);
    // pares do mesmo sexo existem, sem filhos, à parte (não tiram lugar dos outros).
    // Visita: quem tem par em outra barraca dorme lá em parte das noites (divide a cama do par; aperta a barraca em até 2 lugares).
    // 0.10 (pedido do jogador): até 3 pares do mesmo sexo (antes 1), e eles nascem com um pouco mais de facilidade.
    BONDS_MAX: 4, BONDS_SAME_MAX: 3, BOND_MORE: 0.6, BOND_FERTILE: 2, BOND_SAME_SEX: 0.4, BOND_AGE_MAX: 55, VISIT_HOME: 30, VISIT_SQUEEZE: 2,
    // noites picantes (só adultos, sem parentes próximos; desliga no menu): quem tem dois pares dormindo na mesma casa,
    // e os dois se dão (conversam ou também são par), tem TRIO_NIGHT de chance por noite de uma noite a três; depois da
    // festa, um grupo de 4 ou mais adultos ligados por pares tem PARTY_MANY de chance de esticar a noite junto
    TRIO_NIGHT: 0.15, TRIO_TALKS: 4, PARTY_MANY: 0.3, PARTY_MANY_MIN: 4, PARTY_MANY_MAX: 8,
    FERTILE_MAX: 45, BIRTH_SPACING_Y: 1.5, CONCEIVE_NIGHT: 0.06,
    PREGNANCY_Y: 0.75, PREG_KNOWN_DAYS: 6, LATE_PREG_DAYS: 10,
    LABOR_H: 4, BIRTH_RISK: 0.15, BIRTH_RISK_TENT: -0.05, BIRTH_RISK_FIRE: -0.03, BIRTH_RISK_WEAK: 0.1,
    LABOR_HARD_DMG_H: 12, BIRTH_LOSS_HARD: 0.25,
    NURSE_COST: 4, TRAIT_INHERIT: 0.5,
    OLD_DEATH_BASE: 0.03, OLD_DEATH_STEP: 0.02,
    CURA_HEAL: 60,

    // ---- Narrador (Etapa 4) · dias de jogo ----
    // gap: dias entre desastres · sev: força dos desastres · goodGap: dias entre alívios
    // small: primeiro dia com um aperto pequeno (tempestade) · start: primeiro dia com desastre grande
    // quiet: dias sem nada acontecer que o diretor tolera antes de puxar um alívio (ou um aperto pequeno)
    NARR_DEFAULT: 'equilibrado',
    NARRADORES: {
      // aim: chance de nevasca em cada inverno e de seca em cada verão
      pacifico: { name: 'Pacífico', desc: 'Desastres raros e brandos. Para ver a família crescer.', gap: [24, 34], sev: 0.7, goodGap: [16, 24], small: 42, start: 75, aim: [0.6, 0.35], quiet: 15 },
      equilibrado: { name: 'Equilibrado', desc: 'Aperto e alívio em ritmo de história. O jeito pensado para o jogo.', gap: [14, 20], sev: 1, goodGap: [20, 30], small: 32, start: 60, aim: [0.8, 0.55], quiet: 11 },
      implacavel: { name: 'Implacável', desc: 'Desastres frequentes e duros. Para ser posto à prova.', gap: [8, 12], sev: 1.35, goodGap: [26, 38], small: 24, start: 60, aim: [0.95, 0.75], quiet: 8 },
    },
    NARR_LOSS_DAYS: 10,            // depois de uma morte: respiro e, se der, um alívio
    NARR_CALM_FOOD: 15,            // comida para 15 dias e todos bem: o aperto vem mais cedo
    NEVASCA_COLD: -6, NEVASCA_DAYS: [1.5, 2.5], NEVASCA_WALK: 0.75, NEVASCA_FIRE: 1.8, NEVASCA_WORK: 0.35, NEVASCA_FISH: 0.3,
    SECA_DAYS: [9, 13], SECA_THIRST: 1.35, SECA_HEAT: 3, SECA_WATER: 0.5, SECA_FISH: 0.6, SECA_WILT: 0.35,
    TEMPESTADE_H: [4, 7], TEMPESTADE_COLD: -4,
    LOBO_BITE: 16, LOBO_BITE_MIN: 15, LOBO_BITES: 2, LOBO_BITES_PERSON: 3, LOBO_STEAL: 6, LOBO_FIRE_R: 4.5, LOBO_SEE: 7, LOBO_SPEED: 1.25,
    FARTURA_DAYS: 8, FARTURA_R: 26, PIRACEMA_DAYS: 6, PIRACEMA_FISH: 1.8, VERANICO_HEAT: 6, VERANICO_DAYS: [2, 3], MEL_FOOD: 15, MEL_DAYS: 60,
    ANDARILHO_MAX_POP: 12, ANDARILHO_DAYS: 120,
    SEGUNDO_CASAL_H: 30,           // horas depois do 18º aniversário do primogênito

    // ---- Descobertas (Etapa 5) ----
    // prática: horas de trabalho que ensinam cada descoberta (só contam depois da anterior); passou da conta,
    // cada dia tem DISC_DAILY de chance de alguém ter a ideia. A trilha é uma só, em ordem.
    DISC_NEED: { pedra: 90, cestos: 120, lanca: 200, anzol: 2500, conserva: 350, ceramica: 400 },
    DISC_DAILY: 0.35,
    REVELACAO_COST: 60, REVELACAO_MIN: 0.3,   // a Revelação entrega a próxima quando o povo já passou de 30% da prática
    // ferramentas (pedra lascada) e roupas (couro): durabilidade de 100
    TOOL_BONUS: 1.2, TOOL_WEAR_H: 1.5, TOOL_WEAR_FISH_H: 0.5, ANZOL_FISH: 1.5,
    ROUPA_COLD: 0.75, ROUPA_WEAR_DAY: 0.8, ROUPA_WEAR_WINTER: 0.8,
    OFICIO_MIN: 60, TOOL_COST: { pedra: 1, madeira: 1 }, ROUPA_COST: { couro: 2 },
    CESTO_CARRY: 1.5,              // cestos: carrega metade a mais
    LANCA_BITE: 0.75,              // com a lança na mão, a mordida do lobo pega menos
    // caça (lança): capivaras em bandos perto da água
    CACA_HIT: 0.4, CACA_HIT_LVL: 0.04, CACA_SHOTS: 3, CACA_R: 2.6, CACA_AIM_MIN: 15, CACA_CUT_MIN: 40,
    CACA_CARNE: 8, CACA_COURO: 2, CACA_KEEP: 2,   // o povo deixa sempre um casal no bando (senão acaba a caça)
    CARNE_COOKED: 50, CARNE_RAW: 18, ROT_MEAT: 0.08,
    FAUNA_HERDS: 5, FAUNA_HERD: [3, 5], FAUNA_MAX: 7, FAUNA_BIRTH_DAYS: 15, FAUNA_NEW_HERD_DAYS: 40, FAUNA_LONELY_DAYS: 20,
    FAUNA_SPEED: 0.6, FAUNA_FLEE: 1.5, FAUNA_SEE: 4, FAUNA_HOME_R: 6, FAUNA_DIST: [10, 46],
    // conservação (defumar e secar)
    MOQUEM_CAP: 10, MOQUEM_H: 8, MOQUEM_WOOD: 2,
    JIRAU_CAP: 12, JIRAU_H: 14,
    DEFUMADO_FOOD: 40, SECA_FOOD: 20, ROT_DEFUMADO: 0.004, ROT_SECA: 0.008,
    CONSERVA_DAYS: [15, 30],       // conservado para 15 dias: conserva com menos pressa; para 30, para
    // cerâmica: argila na beira d'água, forno de barro, potes
    ARGILA_MIN: 60, ARGILA_TRIP: 6, POTES_WATER_CAP: 60, POTES_ROT: 0.7, POTES2_WATER_CAP: 90, POTES2_ROT: 0.6,
    ALDEIA_POP: 15,                // 15 pessoas + cerâmica: a Era da Família se fecha (portão do MVP)

    // ---- Vida (Etapa 6) ----
    // histórias: 45 a 60 min de tardinha (17h30 às 20h), até 10 ouvintes; cada ouvinte vale 0,25 h de prática na próxima descoberta
    STORY_MIN: [45, 60], STORY_LISTEN: 10, STORY_PRACTICE: 0.25,
    // festas: no máximo uma a cada 8 dias, 3 h em volta do fogo; comem 1 porção cada se houver comida para 3 dias
    PARTY_GAP_DAYS: 8, PARTY_H: 3, PARTY_FOOD_DAYS: 3,
    // conversas: brigas (chance base e com humor abaixo de 30), dias sem se falar; quem ensina dá 3 h de prática;
    // o consolo encurta o luto em 4 dias
    FIGHT_BASE: 0.012, FIGHT_LOW: 0.12, FIGHT_GRACE_D: 20, FEUD_DAYS: [2, 4], TEACH_XP: 3, CONSOLO_DAYS: 4,
    // agradecimentos: Poder que cada um dá
    THANKS: { nascimento: 6, primavera: 8, festa: 5, fartura: 4, descoberta: 4, oracao: 3, manha: 1, luto: 2 },
    // pequenos acontecimentos: chance por dia; lua cheia no dia 14 de cada 30
    SMALL_DAILY: 0.35, SMALL_FOOD: 3, SMALL_WOOD: 4, PE_WALK: 0.7, MOON_DAYS: 30, MOON_DAY: 14,
    POWER_BAR: 100,                // a barra de Poder enche em 100 (o Poder não tem teto)

    // ---- Invenções (Etapa 8) ----
    // Uma árvore, não uma trilha: cada invenção abre quando o que ela pede já existe e aprende com o seu trabalho,
    // várias ao mesmo tempo. Prática em horas de trabalho, como nas descobertas; passou da conta, cada dia tem
    // DISC_DAILY de chance de alguém ter a ideia (no máximo uma invenção por dia).
    INV_NEED: { faca: 70, corda: 100, flauta: 90, tambor: 70, machado: 150, agulha: 60, arco: 60, rede: 1800, vasos: 120 },
    CORDA_BUILD: 1.2,                          // corda: obras e caminhos amarrados, 20% mais rápidos
    FACA_OFICIO: 1.25, FACA_CARNE: 3, FACA_COURO: 1,   // faca: Ofício 25% mais rápido; carneia melhor
    MACHADO_BONUS: 1.6,                        // machado: com ferramenta, a madeira sai 60% mais rápido (em vez de 20%)
    AGULHA_COLD: 0.65, AGULHA_WEAR: 0.67,      // roupa costurada: 35% menos frio (em vez de 25%) e dura metade a mais
    REDE_FISH: 1.35, REDE_MAX: 2,              // rede de pesca: fisga 35% mais, e cada pescaria traz até 2 peixes a mais
    ARCO_R: 4.4, ARCO_HIT: 0.15, ARCO_SHOTS: 4,   // arco e flecha: atira de longe, acerta mais, e a flecha não espanta o bando
    VASO_FOOD: 1.25,                           // vasos: peixe, carne, ovo e roça cozidos no vaso sustentam 25% mais
    TAMBOR_PARTY: 1.5,                         // tambor: a festa aproxima 50% mais
    FLAUTA_STORY: 0.4,                         // flauta: 40% das noites de história viram música

    // ---- Bichos (Etapa 9) ----
    // hab: onde vive (agua: beira d'água · mata: dentro ou na borda da floresta · mataAgua: mata perto da água ·
    // campo: campo aberto · lago: beira de lago ou rio largo). n: quantos bandos no mapa · herd: tamanho do bando ao
    // nascer · max: teto do bando · speed/flee: andar e fugir · see: arisco, foge de quem chega a essa distância
    // (0 = só foge quando atacado; com see maior que o alcance da lança, só o arco chega) · night: anda de noite e
    // se esconde de dia · hp: acertos para abater · carne/couro: o que rende · birth: dias entre filhotes ·
    // charge: chance de partir para cima de quem atacou · bite: o dano da mordida (ou da chifrada)
    BICHOS: {
      capivara: { name: 'Capivara', art: 'uma capivara', hab: 'agua', n: 5, herd: [3, 5], max: 7, speed: 0.6, flee: 1.5, see: 0, hp: 1, carne: 8, couro: 2, birth: 15,
        desc: 'Pasta em bando na beira d’água.' },
      veado: { name: 'Veado', art: 'um veado', hab: 'mata', n: 3, herd: [2, 4], max: 5, speed: 0.8, flee: 2.2, see: 4, hp: 1, carne: 10, couro: 2, birth: 22,
        desc: 'Arisco: foge de quem chega a 4 passos.' },
      porco: { name: 'Porco-do-mato', art: 'um porco-do-mato', hab: 'mata', n: 2, herd: [4, 6], max: 8, speed: 0.7, flee: 1.4, see: 0, hp: 2, carne: 12, couro: 2, birth: 16, charge: 0.5, bite: 12,
        desc: 'Anda em vara. Ferido, parte para cima de quem atacou.' },
      paca: { name: 'Paca', art: 'uma paca', hab: 'mataAgua', n: 3, herd: [1, 2], max: 3, speed: 0.7, flee: 1.8, see: 3, hp: 1, carne: 7, couro: 1, birth: 26, night: true,
        desc: 'Sai de noite, perto da água na mata; de dia fica na toca.' },
      tatu: { name: 'Tatu', art: 'um tatu', hab: 'campo', n: 3, herd: [1, 2], max: 3, speed: 0.4, flee: 0.9, see: 2, hp: 1, carne: 5, couro: 0, birth: 26,
        desc: 'Fuça o campo devagar. Fácil de pegar.' },
      anta: { name: 'Anta', art: 'uma anta', hab: 'mataAgua', n: 2, herd: [1, 2], max: 3, speed: 0.6, flee: 1.3, see: 3, hp: 3, carne: 24, couro: 4, birth: 40, charge: 0.25, bite: 16,
        desc: 'O maior bicho da mata. Pede três acertos e às vezes se vira contra quem ataca.' },
      jacu: { name: 'Jacu', art: 'um jacu', hab: 'mata', n: 3, herd: [2, 4], max: 6, speed: 0.5, flee: 2.8, see: 4, hp: 1, carne: 3, couro: 0, birth: 14, bird: true,
        desc: 'Ave da mata. Voa longe quando alguém chega perto.' },
      tapiti: { name: 'Tapiti', art: 'um tapiti', hab: 'campo', n: 3, herd: [2, 4], max: 7, speed: 0.9, flee: 2.4, see: 3.5, hp: 1, carne: 2, couro: 1, birth: 10,
        desc: 'Coelho do campo. Rápido, e dá cria depressa.' },
      jacare: { name: 'Jacaré', art: 'um jacaré', hab: 'lago', n: 3, herd: [1, 1], max: 1, speed: 0.5, flee: 1.2, see: 0, hp: 2, carne: 12, couro: 3, birth: 0, bite: 20, predator: true,
        desc: 'Toma sol na beira do lago e ataca quem trabalha perto da água.' },
      // Etapa 11: o bicho que Deus cria (não nasce no mundo: aparece com o grande ato; o nome é o que o jogador der)
      criatura: { name: 'Luzeiro', art: 'um luzeiro', hab: 'deus', n: 0, herd: [4, 5], max: 9, speed: 0.55, flee: 1.4, see: 0, hp: 1, carne: 14, couro: 3, birth: 8,
        desc: 'Criado por Deus: manso, pasta perto da aldeia, dá cria depressa e muita carne.', created: true },
    },
    CACA_NOVO: 10, CACA_REPETE: 3,  // na escolha da presa: bicho nunca caçado vale mais; o da última caçada, um pouco menos
    // jacaré: chance por hora de atacar quem trabalha a até JACARE_R passos dele na beira d'água; depois do ataque,
    // o povo evita aquela margem por JACARE_AVOID_D dias. Mora num lago a JACARE_DIST passos ou mais do acampamento; de
    // madrugada, às vezes (JACARE_MOVE) muda de lugar dentro de JACARE_ROAM passos, e às vezes (JACARE_LURE) vai para
    // perto de onde o povo andou pescando. Entre um ataque e outro, no mundo todo, pelo menos JACARE_GAP_D dias
    JACARE_GAP_D: 90, JACARE_R: 2.5, JACARE_HOUR: 0.1, JACARE_AVOID_D: 30, JACARE_COOL_D: 2, JACARE_DIST: 10, JACARE_ROAM: 12, JACARE_MOVE: 0.15, JACARE_LURE: 0.2,
    // luta: quem tem lança (ou arco) revida quando um bicho ataca, e quem está perto e armado vem ajudar
    LUTA_HIT: 0.35, LUTA_MIN: 6, LUTA_R: 7, LUTA_HELP: 3, LOBO_HP: 2, LOBO_KILL: 0.4,
    // onça (Narrador): ronda o acampamento por 2 ou 3 noites; ataca quem está sozinho no escuro; de dia some na mata
    ONCA_NIGHTS: [2, 3], ONCA_HP: 4, ONCA_BITE: 28, ONCA_SEE: 6, ONCA_SPEED: 1.3, ONCA_CARNE: 14, ONCA_COURO: 4,
    // caçada à onça: na manhã depois de um ataque, 2 ou 3 adultos armados vão atrás dela na toca (e só entram juntos);
    // acuada, ela dá botes (ONCA_POUNCE da mordida, a cada ONCA_POUNCE_MIN minutos, em quem estiver a até ONCA_POUNCE_R) e,
    // se os caçadores recuam ou a luta passa de ONCA_ACUADA minutos, escapa e vai embora de vez
    ONCA_HUNT: 3, ONCA_HUNT_H: [7, 12], ONCA_ACUADA: 30, ONCA_POUNCE: 0.6, ONCA_POUNCE_MIN: 8, ONCA_POUNCE_R: 5,

    // ---- Campo (Etapa 10) ----
    // descobertas do campo: prática em horas de trabalho, como as invenções (uma árvore, várias ao mesmo tempo)
    CAMPO_NEED: { roca: 120, algodao: 70, cerca: 70, criacao: 75 },
    // culturas (numa roça de 3 x 3): dias até madurar no ritmo da primavera, porções colhidas, comida de cada porção
    // (cozida no fogo; crua, o que diz raw; 0 = não se come cru), o que estraga por dia no estoque. A mandioca é a
    // única que cresce no inverno (devagar) e espera muito tempo no chão depois de madura; o algodão vira fibra
    ROCA: {
      feijao: { name: 'Feijão', days: 12, yield: 40, food: 30, raw: 0, rot: 0.004, ripe: 8 },
      milho: { name: 'Milho', days: 18, yield: 54, food: 28, raw: 14, rot: 0.006, ripe: 10 },
      abobora: { name: 'Abóbora', days: 20, yield: 36, food: 40, raw: 18, rot: 0.01, ripe: 12 },
      mandioca: { name: 'Mandioca', days: 30, yield: 70, food: 34, raw: 0, rot: 0.03, ripe: 40, winter: 0.5 },
      algodao: { name: 'Algodão', days: 24, yield: 24, fibra: true, ripe: 10 },
    },
    ROCA_ORDER: ['feijao', 'milho', 'abobora', 'mandioca', 'algodao'],
    ROCA_GROW: [1, 1.15, 0.75, 0],   // ritmo do crescimento por estação (primavera, verão, outono, inverno)
    ROCA_SECA: 0.4,                  // na seca a roça quase para (a Chuva de Deus rega: +ROCA_CHUVA_D dias)
    ROCA_CHUVA_D: 2,
    ROCA_PLANT_MIN: 120, ROCA_WEED_MIN: 60, ROCA_HARVEST_MIN: 90,
    ROCA_WEED_AT: 0.45, ROCA_WEED_DAYS: 4, ROCA_WEED_LOSS: 0.35,   // o mato sai no meio do crescimento; sem capina em 4 dias, perde 35%
    ROCA_SPOIL_DAY: 0.1,             // madura e esquecida no pé: perde 10% por dia (no inverno, 25%)
    ROCA_FARTURA: 1.25,              // tempo de fartura: a roça que está crescendo rende 25% mais
    ROCA_PRAGA: 0.5,                 // praga (gafanhotos): metade da colheita de uma roça
    ROCA_RAID_R: 16, ROCA_RAID_DAY: 0.08, ROCA_RAID_LOSS: 0.1, ROCA_RAID_MAX: 0.4, ROCA_RAID_GAP: 3,   // bicho do mato come roça aberta (um estrago a cada 3 dias, no máximo)
    // criação: tamanho no curral (lugares), dias entre crias (fora do inverno), quantos nascem, o que dá por dia
    // (ovos, leite) ou por ano (lã, na tosquia da primavera), o que rende no abate, e a ração de inverno (porções por dia)
    CRIA: {
      galinha: { name: 'Galinha', male: 'Galo', art: 'uma galinha', size: 0.5, birth: 8, litter: 2, carne: 4, couro: 0, ovos: 0.5, feed: 0.1, speed: 0.55 },
      coelho: { name: 'Coelho', art: 'um coelho', size: 0.5, birth: 9, litter: 2, carne: 4, couro: 1, feed: 0.1, speed: 0.6 },
      porco: { name: 'Porco', art: 'um porco', size: 1, birth: 20, litter: 2, carne: 18, couro: 1, feed: 0.4, speed: 0.5 },
      ovelha: { name: 'Ovelha', male: 'Carneiro', art: 'uma ovelha', size: 1, birth: 30, litter: 1, carne: 12, couro: 2, la: 3, feed: 0.3, speed: 0.5 },
      gado: { name: 'Vaca', male: 'Boi', art: 'uma vaca', size: 2, birth: 45, litter: 1, carne: 36, couro: 5, leite: 3, feed: 0.6, speed: 0.45 },
    },
    CRIA_ORDER: ['galinha', 'coelho', 'porco', 'ovelha', 'gado'],
    CRIA_ROAM: 5,                    // solto (curral sem cerca), pasta a até 5 passos do curral
    CRIA_HUNGRY_DAYS: 6,             // no inverno sem ração: depois de 6 dias, os bichos começam a morrer
    CRIA_KEEP: 2,                    // o povo deixa sempre um casal de cada espécie
    CRIA_WOLF_H: 0.25, CRIA_ONCA_H: 0.12,   // de noite, chance por hora de o lobo (curral aberto) ou a onça (pula a cerca) levar um bicho
    COLLECT_MIN: 20, FEED_MIN: 15, ABATE_MIN: 40,
    OVOS_FOOD: 18, LEITE_FOOD: 14, LEITE_SEDE: 12, ROT_OVOS: 0.06, ROT_LEITE: 0.5,
    // mascate: passa trocando bichos de criação por coisas do povo (valor de cada coisa e o que o povo não troca)
    MASCATE_FIRST_D: [2, 4], MASCATE_D: [20, 34], MASCATE_LATER_D: [50, 80],
    MASCATE_OFFER: { galinha: [1, 2, 9], coelho: [1, 1, 8], porco: [1, 1, 16], ovelha: [1, 1, 20], gado: [1, 1, 34] },   // machos, fêmeas, preço
    TRADE_VALUE: { couro: 2.5, ferramentas: 3, roupas: 5, mantas: 5, redes: 4, tabuas: 1.5, defumado: 1, seca: 0.8, feijao: 0.8, milho: 0.6,
      abobora: 0.6, mandioca: 0.5, fibra: 0.8, carne: 0.6, peixe: 0.5, argila: 0.3, pedra: 0.2, madeira: 0.15, prata: 5, ouro: 10, gemas: 14, joias: 9 },
    TRADE_KEEP: { couro: 4, ferramentas: 3, tabuas: 6, fibra: 8, madeira: 40, pedra: 20, argila: 12 },
    // cercas: 1 madeira e 12 minutos por passo; quem passa pela cerca pula (3 vezes mais devagar); cerca em cima
    // de caminho de terra ou de pedra vira porteira (o povo passa, bicho não). Área cercada: até 1.600 passos
    CERCA_WOOD: 1, CERCA_WORK: 12, CERCA_PASS: 3, CERCA_MAX_AREA: 1600,

    // ---- Deus (Etapa 11) ----
    // Glória: todo o Poder que o povo já deu (a fé de cada hora, os agradecimentos, as orações atendidas, as metas);
    // gastar Poder não tira glória. O nível pede glória e fiéis (7 anos ou mais, com fé de FIEL_FE para cima).
    // Medido em 20 anos em três mundos (0.11): quem atende as orações chega ao nível 2 com 0,6 a 0,7 ano, ao 3 com 3,5
    // a 4,1, ao 4 com 8 a 10 e ao 5 com 12 a 14; quem larga junta glória (a fé de cada hora rende), mas fica com 1 a 3
    // fiéis, e por isso no nível 1 ou 2.
    GOD_LEVELS: [
      { name: 'Espírito', glory: 0, fieis: 0 },
      { name: 'Guardião', glory: 500, fieis: 2 },
      { name: 'Deus do Povo', glory: 2500, fieis: 4 },
      { name: 'Deus Antigo', glory: 8000, fieis: 7 },
      { name: 'Deus Maior', glory: 20000, fieis: 10 },
    ],
    FIEL_FE: 70, FIEL_AGE: 7,
    // cético que vê sinais demais se converte: CONVERTE_SINAIS sinais e fé de CONVERTE_FE para cima.
    // Sinais: um milagre visto de perto (no máximo um a cada 2 dias), a própria oração atendida, a Cura no corpo, a
    // pregação ouvida, o sonho da Revelação
    CONVERTE_SINAIS: 24, CONVERTE_FE: 65,
    SINAL: { milagre: 1, atendida: 2, curado: 3, sermao: 2, sonho: 4, conto: 1, rito: 2, visao: 3 },   // conto, rito e visão: Etapa 13
    // o escolhido: quem chegou à fé inteira (100) nos últimos FE100_DAYS dias e ainda tem 90, com 16 anos ou mais.
    // Ungir custa UNGIR_COST; um por vez no nível 3, dois no 4, três no 5. Abaixo de GRACA_FE, perde a graça
    UNGIR_COST: 150, UNGIR_AGE: 16, FE100_DAYS: 5, GRACA_FE: 70, ESCOLHIDOS: [0, 0, 0, 1, 2, 3],
    ESCOLHIDO_CURA: 8, ESCOLHIDO_HEAL: 40,          // Mãos que curam: cada cura gasta 8 de Poder e dá 40 de saúde
    SERMAO_GAP_D: 2, SERMAO_FE: 5, SERMAO_PODER: 1, SERMAO_LONGE: 15,   // Palavra: uma pregação a cada 2 dias, de tardinha, por quem está a até 15 passos do fogo
    LUZ_R: 3.5, LUZ_HEAT: 10,                        // Luz: lobo e onça não chegam; quem está perto se aquece
    // Bênção (nível 2): um lugar abençoado por BENCAO_H horas; quem trabalha ali rende BENCAO_MULT
    BENCAO_COST: 25, BENCAO_R: 6, BENCAO_H: 48, BENCAO_MULT: 1.5,
    // grandes atos. Estátua: obra do povo (nível 3; uma por nível acima do 2), consagrada com um milagre próprio
    ESTATUA_LV: 3, ESTATUAS: [0, 0, 0, 1, 2, 3], CONSAGRAR_COST: 400,
    ESTATUA_R: 6, ESTATUA_HEAT: 12, ESTATUA_CHUVA_D: 8, ESTATUA_CURA: 30, ESTATUA_CURA_R: 8, ESTATUA_TROVAO_R: 10,
    REZA_FE: 3, REZA_PODER: 1, REZA_MIN: 30,        // quem tem fé reza de manhã ao pé da estátua
    // espécie nova (nível 4): um bicho manso para caçar, um peixe que enche os rios ou uma árvore que dá fruta o ano todo
    ESPECIE_LV: 4, ESPECIE_COST: 1500, ARVORE_N: 6, ARVORE_MAX: 5, ARVORE_DAYS: 2, PEIXE_FISH: 1.35,
    // conhecimento avançado (nível 5): a roda, a escrita, a medicina
    SABER_LV: 5, SABER_COST: 2500,
    RODA_CARRY: 1.4, RODA_BUILD: 1.25, ESCRITA_XP: 1.5, ESCRITA_STORY: 2, ESCRITA_PRAT: 1.25,
    MEDICINA_BIRTH: 0.5, MEDICINA_REGEN: 1.5, MEDICINA_OLD: 0.6,
    // ---- Etapa 13: Memória ----
    // o corpo: quem está a até CORPO_VER passos acha na hora (ou se foi perto do acampamento); sem ninguém achar em
    // CORPO_MAX_D dias, não há velório nem cova e o luto da família dobra. Achado, alguém leva para junto do fogo
    CORPO_VER: 10, CORPO_CAMP: 14, CORPO_MAX_D: 3, CARREGA_AGE: 16,
    // o velório: de VELORIO_H[0] a VELORIO_H[1], ao pé do fogo. Quem fica VELAR_MIN minutos (a família, VELAR_FAM) sofre
    // o luto por VELORIO_LUTO do tempo que faltava e ganha VELORIO_FE de fé. Enterro na manhã seguinte (ENTERRO_H)
    VELORIO_H: [17, 21], VELAR_MIN: 30, VELAR_FAM: 60, VELORIO_LUTO: 0.5, VELORIO_FE: 1,
    ENTERRO_H: [6, 17], ENTERRO_MIN: 45, LAJE_PEDRA: 2, ARVORE_COVA_D: 20,
    // a visita à cova: no dia do enterro, a cada VISITA_LUTO_D dias nos primeiros VISITA_LUTO_ATE, e todo ano no dia em
    // que a pessoa se foi (quem não deixou família é lembrado pelo amigo mais chegado, com VISITA_AMIGO de amizade).
    // Fica VISITA_MIN minutos, deixa flores por FLOR_D dias (e uma fruta, se sobram FRUTA_SOBRA),
    // e o luto encurta VISITA_CURA dias
    VISITA_H: [7, 16], VISITA_MIN: 15, VISITA_LUTO_D: 5, VISITA_LUTO_ATE: 20, VISITA_CURA: 4, VISITA_FE: 1, VISITA_AMIGO: 6, FLOR_D: 6, FRUTA_SOBRA: 10,
    // o dia dos mortos: no último dia do outono, das FINADOS_H[0] às FINADOS_H[1], com FINADOS_MIN_POP vivos e uma cova
    FINADOS_H: [15, 18], FINADOS_MIN: 40, FINADOS_MIN_POP: 4, FINADOS_FE: 2, FINADOS_CURA: 10, FINADOS_VELAS_H: 6,
    CONV_FINADOS: 1, CONV_RITO: 1.5,      // convivência: o dia dos mortos junto, e o casal de dois povos que junta os dois ritos
    // a História de Deus: um ato grande visto por alguém vira conto (um de cada tipo a cada CONTO_GAP_D dias; no máximo
    // CONTO_MAX guardados). Na noite de história, quem sabe um conto conta um com chance CONTO_CHANCE (o mesmo conto
    // só volta à roda depois de CONTO_REPETE_D dias). Quem conta sem
    // ter visto muda um detalhe com chance CONTO_DERIVA. Ouvir dá CONTO_FE de fé (o de medo, menos, e assusta)
    CONTO_GAP_D: 240, CONTO_MAX: 18, CONTO_VER: 12, CONTO_CURA: 40, CONTO_CHANCE: 0.4, CONTO_REPETE_D: 20, CONTO_DERIVA: 0.5, CONTO_FE: 1.5,
    // a criança que cresce ouvindo contos (dos 3 anos até CRIADO_AGE, o fim da infância): com CRIADO_MIN contos de um
    // tom e metade a mais que do outro, fica temente (a fé não cai de TEMENTE_FE, obedece mais, humor -CRIADO_HUMOR)
    // ou confiante (a fé esfria até CONFIANTE_FE acima do comum, ganha fé 20% mais depressa, humor +CRIADO_HUMOR).
    // O conto sem tom próprio (o raio na fera, o nome, a estátua...) nasce com o tom de como o povo vê Deus, quando o
    // alinhamento passa de CONTO_TOM_ALIGN para um lado
    CRIADO_AGE: 12, CONTO_TOM_ALIGN: 15, CRIADO_MIN: 3, CRIADO_HUMOR: 3, TEMENTE_FE: 50, TEMENTE_OBED: 0.15, CONFIANTE_FE: 10, CONFIANTE_GANHO: 1.2,
    // a erva-do-sonho: ERVA_SPOTS canteiros na mata úmida, de ERVA_DIST passos do acampamento. Quem passa a ERVA_VER
    // passos acha (com Deus no nível ERVA_LV e gente bastante para a roda; sem ninguém passar, em ERVA_ACASO_D dias
    // um caçador acha)
    ERVA_SPOTS: 3, ERVA_DIST: [9, 32], ERVA_VER: 4, ERVA_LV: 2, ERVA_ACASO_D: 60, ERVA_MIN: 20,
    // o rito: no máximo um a cada RITO_GAP_D dias, das RITO_H[0] às RITO_H[1] (ao cair da noite, no lugar da
    // história: quem já foi dormir não levanta para ele), só adultos (18 anos de verdade), de
    // RITO_MIN_POP a RITO_MAX pessoas (quem está a até RITO_PERTO passos do fogo; anda-se devagar), RITO_MIN minutos
    // ao pé do fogo. Dá fé, uma lembrança boa (ou ruim: RITO_RUIM,
    // a segunda chance para quem já se apegou) e um pouco de prática (RITO_SABER do que falta). No dia seguinte o
    // trabalho rende RITO_RESSACA por RITO_RESSACA_H horas. Com RITO_APEGO ritos seguidos a saúde paga (RITO_APEGO_SAUDE)
    // e, sem rito por RITO_FALTA_D dias, vem a falta. O costume esfria um rito a cada RITO_ESQUECE_D dias (quem vai a
    // todos os ritos soma mais depressa do que esfria: aldeia pequena, ou quem conduz, acaba se apegando)
    RITO_GAP_D: 15, RITO_H: [18, 21], RITO_MIN: 60, RITO_MIN_POP: 3, RITO_MAX: 6, RITO_PERTO: 10, RITO_FE: 2, RITO_RUIM: [0.1, 0.3], RITO_SAUDE: 6,
    RITO_SABER: 0.03, RITO_RESSACA: 0.8, RITO_RESSACA_H: 14, RITO_APEGO: 4, RITO_APEGO_SAUDE: 3, RITO_FALTA_D: 15, RITO_ESQUECE_D: 30,
    // a pergunta do rito espera a resposta até VISAO_ESPERA_H horas (depois, vale o silêncio). As respostas: uma
    // promessa vale PROMESSA_D dias (a do frio, até o fim do inverno; cumprida, +PROMESSA_FE de fé; quebrada,
    // -PROMESSA_QUEBRA); o zelo faz o trabalho render ZELO_COMIDA (só a comida, ou só a lenha, ZELO_COMIDA_D dias) ou
    // ZELO_TUDO (tudo, ZELO_TUDO_D dias)
    // (uma pergunta a cada VISAO_GAP_D dias, no máximo: nos outros ritos o povo só vê coisas na fumaça)
    VISAO_ESPERA_H: 10, VISAO_GAP_D: 30, PROMESSA_D: 30, PROMESSA_FE: 3, PROMESSA_QUEBRA: 6, ZELO_COMIDA: 1.1, ZELO_COMIDA_D: 10, ZELO_TUDO: 1.05, ZELO_TUDO_D: 5,
    // os dons (um a cada nível, do 2 ao 5): os números de cada um
    DOM: {
      fogoH: 24, fogoR: 7,                        // Fogo Sagrado: o Calor dura 24 h e vai a 7 passos
      maosCost: 12, maosR: 2, maosHeal: 0.5,      // Mãos de Luz: a Cura custa 12 e cura pela metade quem está a até 2 passos
      ceuCost: 10, ceuFruit: 2, ceuRoca: 3,       // Céu Generoso: a Chuva custa 10, enche mais os arbustos, dobra a água e adianta a roça 3 dias
      trovaoCost: 10, trovaoR: 2.6, trovaoMult: 2,   // Trovão: o Raio custa 10, alcança o bicho mais longe e dobra madeira e pedra
      ouvidoMult: 2,                              // Ouvido Atento: orações esperam o dobro e agradecem o dobro
      olhosMult: 1.5,                             // Olhos do Céu: a névoa se abre metade mais longe
      sonhosCost: 40, sonhosMin: 0.15,            // Sonhos Claros
      ventreConceive: 1.5, ventreRisk: 0.5,       // Ventre Abençoado
      sentinelaR: 2, sentinelaBite: 0.75,         // Sentinela
      terraRoca: 1.2, terraBush: 1.3,             // Mão na Terra
      temorObed: 0.3,                             // Temor Sagrado (e ninguém entra em greve)
      chamaFloor: 50, chamaPoder: 1.2,            // Fé que Aquece
    },
  };
})(globalThis.G = globalThis.G || {});
