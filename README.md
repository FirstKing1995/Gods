# Gods · Etapa 22 (Outros jogadores) · versão 0.22

## O que mudou na 0.22

**Outros deuses.** No mapa do mundo (tecla M), o botão **Outros deuses** (pede estar com a conta). Ali:
- **A abertura do seu mundo**: Fechado (ninguém visita), Só ajuda (o padrão: visitam e só podem ajudar) ou Aberto (visitam, ajudam e podem sabotar). Vai junto com o save na nuvem.
- **A lista dos outros deuses** com o mundo salvo na nuvem. **Visitar** abre o mundo do outro como ele foi salvo pela última vez: o mapa inteiro (com as regiões, as obras e o povo), o ano, quantos vivem, a idade e a Crônica.
- **Mandar**, pago com o seu Poder:

| Ajuda | Custo | O que faz |
|---|---|---|
| Comida | 30 | 40 de peixe no estoque dele |
| Material | 30 | 30 de madeira e 20 de pedra |
| Bênção | 60 | a fé de todo o povo dele sobe 5 |
| Milagre | 150 | todos os doentes e feridos de lá saram |

| Sabotagem (só em mundo aberto) | Custo | O que faz |
|---|---|---|
| Praga | 120 | a roça dele perde um terço do que está crescendo |
| Seca curta | 150 | metade da água do estoque some |
| Boato | 100 | a fé de todo o povo cai 5 |

**Os limites.** Cada deus manda até 3 recados por dia, e cada mundo sofre no máximo 2 sabotagens por dia. A sabotagem nunca mata ninguém nem destrói obra. A fé alta do povo (média 80 ou mais) segura qualquer sabotagem, e a estátua ou o templo seguram metade delas. Ninguém perde um mundo enquanto está fora.

**O recado.** Tudo passa pelo servidor que já existe (a planilha e o Apps Script), sem tempo real. O recado fica guardado e é aplicado quando o dono abre o jogo (junto com o save na nuvem); a Crônica dele conta quem mandou o quê, e ele pode responder visitando de volta.

**Para funcionar, o servidor precisa da versão nova.** Copie o arquivo `apps-script/Code.gs` (desta pasta, no seu computador) para o Apps Script da planilha, rode `setup()` uma vez (ele cria a aba "recados") e faça **Implantar > Gerenciar implantações > Editar > Nova versão**, mantendo a mesma URL. Enquanto o servidor for o antigo, a janela Outros deuses avisa isso e o resto do jogo segue normal.

---

# Gods · Etapa 21 (Avatar) · versão 0.21

## O que mudou na 0.21

**Possuir um cidadão.** Na ficha de um adulto com fé 80 ou mais, o botão **Possuir**. A câmera passa a segui-lo e o toque no chão leva o corpo dele até lá; ele espera ali a próxima ordem, em vez de voltar ao trabalho. As urgências do corpo (fome, sede, frio) ainda passam na frente, e de noite o corpo dorme como qualquer um, junto do par que já tinha. Custa 6 de Poder por hora e cansa um pouco a pessoa; quando o Poder acaba ou o corpo corre perigo (fome, sede ou saúde baixa), você sai. Ela lembra daquilo como um sonho.

**O que só o avatar faz** (perto de alguém, a até 3 passos; cada ação custa 5 de Poder e só se repete depois de uma hora):
- **Consolar**: o descontentamento de quem ouve cai, e o laço entre os dois cresce.
- **Encorajar**: a pessoa ganha ânimo.
- **Pregar**: a fé de quem ouve sobe.
- **Ensinar na mão**: quem aprende pega o jeito das técnicas que o avatar sabe, e um pouco de cada ofício.
- **Apartar briga**: quem planejava um malfeito ali perto desiste.
- **Puxar a reza**: todos a até 6 passos rezam juntos, e a fé sobe.

**O risco.** Quem fica tomado tempo demais assusta quem vê: o povo passa a temer os tomados, e o descontentamento de quem está perto sobe.

**O filho abençoado.** O filho concebido enquanto o pai ou a mãe estava possuído (sempre com o par que a pessoa já tinha; o avatar não escolhe ninguém, e nada disso é descrito) nasce com uma marca de luz na testa: fé inteira, aprende 50% mais depressa e tem um dom só dele:
- **profeta**: perto dele, a fé de todos sobe devagar;
- **curador**: perto dele, quem está ferido ou doente sara;
- **líder nato**: aos 20 anos, o povo passa a ouvi-lo.

A partir dos 8 anos, de mês em mês, o abençoado faz uma pergunta direto a você, numa janela, e você responde escolhendo. A resposta entra na Crônica e muda a fé dele e da aldeia.

---

# Gods · Etapas 19 e 20 (Eras) · versão 0.20

## O que mudou na 0.20

**Dois eixos.** A escala (acampamento, aldeia, vila, cidade, reino) já vinha da 0.16. Agora há também a **idade**, o que o povo sabe fazer. Ela aparece no painel do Povo, com o que falta para a próxima.

| Idade | Pede (descoberta, gente, obra-marco) | O desafio que ela traz |
|---|---|---|
| Pedra lascada | (o começo) | |
| Pedra polida e campo | cerâmica e roça, 12 pessoas, o forno | a praga de lagarta, que come metade da roça |
| Bronze | mineração, 25 pessoas, a mina ou a estátua | a guerra: a vila de fora que não gosta de nós ataca de noite e leva comida (a muralha segura) |
| Ferro | metalurgia, 45 pessoas, a ferraria ou a escola | a fome da cidade grande, quando a cidade cresce mais que a roça |
| Reinos | a escrita, 80 pessoas, o templo ou a muralha | a briga pela sucessão quando morre quem governa |

**O rumo da sociedade** se firma na Pedra Polida e vem do povo que é maioria (pode mudar, no máximo uma vez por ano, quando o povo muda):
- **Humanos: reino de leis escritas.** O malfeito cai 15%, e cada troca (mercado, barco) rende 30% mais.
- **Elfos: conselho das mais velhas.** Quem fala por todos é mulher (o matriarcado). E a **magia no lugar da máquina**: o conselho aprende as runas (a pedra das casas aquece, +4 °C), as ervas (a febre pesa 40% menos) e os círculos (a roça rende 20% mais), e passa de idade com elas, sem precisar de mineração nem de metalurgia. Uma sociedade pode viver sem metal nenhum.
- **Anões: guildas de ofício.** Todos aprendem 15% mais depressa.
- **Povo-fera: clãs e campeões.** A caçada é a lei: a caça rende 25% mais carne.
- **Aldeia bem misturada: assembleia.** Todos falam na roda: o descontentamento cresce 25% menos.

As idades seguintes (revolução industrial, tecnologia, IA e espaço) ficam para depois, como o GDD diz, quando o jogo aguentar cidades grandes.

---

# Gods · Etapa 18 (Barcos e outras terras) · versão 0.19

## O que mudou na 0.19

**Três barcos**, que se constroem na beira d'água e pedem a corda:
- **Canoa** (madeira e fibra): no rio e no lago, a pesca rende 25% mais.
- **Barco** (tábuas, fibra e 2 mantas para a vela): a pesca de mar rende 45% mais, e ele leva carga até a vila de fora uma vez por semana, mesmo sem mercado.
- **Navio** (tábuas, fibra, madeira, 6 mantas e 4 ferramentas de ferro; pede água funda por perto): vai ao mar aberto. As mantas e o ferro saem do estoque quando você marca a obra.

**Expedição.** Na ficha do navio, você escolhe quantos vão (de 3 a 8) e quanta comida levam, e manda partir. Vão os adultos que mais pescam. O navio sai pela beira do mundo e volta em uma ou duas estações. Mais gente e mais comida, menos perigo, mas o perigo nunca some: às vezes o mar leva um ou dois, e às vezes o navio não volta.

**Terra nova.** A expedição pode achar terra além do mar (até quatro). Cada terra nasce da semente do mundo, com outra mistura de regiões, e a viagem traz o que ela tem de bom: madeira nobre, sal, ouro, peixe, couro. Muitas vezes há lá um **povo do mar**, que só se conhece chegando: pescadores de rede longa, navegantes que leem as estrelas, guerreiros de canoa desconfiados, artesãos que trocam tudo por sal.

**Colônia.** No mapa do mundo (tecla M), cada terra achada aparece com as suas regiões e o seu povo, e com o botão de fundar colônia: vão 6 pessoas e 60 de comida no navio. A colônia vive resumida (cresce com fartura, sofre no inverno, se dá bem ou mal com o povo do mar), e a cada estação o navio volta de lá com notícia e carga. Sem navio, ninguém vai e ninguém traz.

**Uma terra por vez na tela.** A colônia não se joga: ela é acompanhada pelo mapa do mundo e pela Crônica. O GDD falava da câmera trocando de terra; jogar duas terras ao mesmo tempo pesaria demais no celular, então fica para quando o jogo aguentar.

---

# Gods · Etapa 17 (Mundo grande) · versão 0.18

## O que mudou na 0.18

**Mapa Gigante.** Na escolha do lugar, um quarto tamanho: **Gigante** (384 × 384, nove vezes o mapa de antes da 0.16). O padrão continua Grande. Um dia de jogo no mapa Gigante custa o mesmo que nos outros, e o save guarda só o que mudou (cerca de 60 mil caracteres no começo).

**Seis regiões.** Todo mundo novo nasce com elas, a partir de um clima em manchas largas (seco ou úmido), da altitude e da distância do mar. A borda entre uma e outra é natural, sem linha reta.

| Região | O chão | Recurso | Bicho | Perigo |
|---|---|---|---|---|
| Litoral | areia clara de praia | sal (a salina na areia) | | |
| Mangue | lama e água escura | | caranguejo | mosquito (febre) |
| Serra alta | pedra fria, neve no alto | ouro (o veio na pedra) | | frio: 5 °C a menos |
| Sertão | chão seco e amarelado | mandacaru (fruta) | cabra | calor (3 °C a mais) e roça que rende 25% menos |
| Mata fechada | árvore em toda parte | madeira nobre (o jequitibá) | | |
| Pântano | poças, junco | | | mosquito (febre) |

- **Sal**: quem quebra a salina traz sal. Com sal no estoque, a carne e o peixe estragam metade (vai 1 de sal por dia).
- **Madeira nobre**: o jequitibá dá madeira comum e mais 2 de madeira nobre. Vale muito na feira.
- **Ouro do veio**: a pedra grande da serra dá pedra e, em 3 de cada 10 golpes, ouro.
- **O mosquito** do mangue e do pântano passa a febre da etapa 16, mais de noite.
- A primeira vez que alguém do povo pisa em cada região entra na Crônica.

**Mapa do mundo** (botão Mapa ou tecla M): o mundo inteiro, só o que o povo já viu, com a cor de cada região, as obras, o povo, o centro e a vila de fora. A legenda mostra as regiões que o povo já conhece.

**Ponte de pedra** (grande obra, da etapa 16): vai em cima do rio ou da água rasa, com terra dos dois lados. Pronta, a água do caminho vira chão de pedra: atravessa-se ligeiro, e o bicho de criação também passa.

**Grande estátua**: o terceiro nível da estátua, num pedestal de pedra. O milagre vai duas vezes e meia mais longe, e quem reza ali ganha o triplo de fé.

**O save antigo abre como era.** O gerador do mundo ganhou um número de versão: o mundo salvo antes da 0.18 é refeito sem regiões, tile por tile igual. O GDD pedia que o mundo antigo virasse o centro do mapa grande; isso mexeria em casas e caminhos já feitos, então ficou de fora.

---

# Gods · Etapa 16 (Grandes obras e instituições) · versão 0.17

## O que mudou na 0.17

A etapa 16 do roteiro traz duas famílias de obra: as grandes obras, que levam meses e marcam o mundo, e as instituições, que a sociedade pede quando cresce.

**Grandes obras.** Cada uma pede centenas de peças e muitas mãos e sobe em fases: o povo constrói até onde o material entregue deixa, sem esperar tudo chegar, e no mapa ela aparece de baixo para cima, com andaimes. Uma obra comum que dá para fazer passa na frente, para a grande não travar a aldeia.
- **Torre de vigia** (abre com 15 pessoas): a névoa se abre e fica aberta num raio de 24 passos; com a guarda, quem vigia vê também de noite e mais longe.
- **Templo** (20 pessoas): lugar de reza da manhã, preferido à estátua; quem reza ali ganha o dobro de fé.
- **Muralha** (30 pessoas): um anel de pedra de 16 passos em volta do centro, com portão. Lá dentro, lobo e onça não pegam ninguém, e ninguém leva a comida guardada.
- **Aqueduto** (30 pessoas e a cerâmica): o estoque de água se enche sozinho, e ninguém precisa mais ir buscar.

**Instituições**, cada uma com três níveis (palha, tábuas, pedra). Aparecem quando a sociedade pede, e no modo "O povo decide" o líder marca a que falta e sobe de nível a que não dá mais conta:

| Casa | Aparece com | Níveis | O que faz |
|---|---|---|---|
| Escola | a escrita e 12 crianças | roda de ensino, escola, faculdade | a criança aprende de dia o que os grandes sabem, inclusive o jeito das técnicas sem precisar ver; depois, o adulto aprende 15% e 35% mais depressa |
| Biblioteca | a escrita | estante, biblioteca, arquivo | o jeito das técnicas fica escrito e não se perde com quem morre; quem trabalha nele aprende pelo livro; no arquivo, todos aprendem 15% mais |
| Hospital | 40 pessoas | curandeiro, enfermaria, hospital | a febre tira menos saúde, a ferida sara, o parto difícil tem quem ajude; o hospital quase fecha o contágio |
| Guarda | o primeiro crime grave | vigia, guarda, delegacia | o malfeito cai (25%, 50%, 60%) e o que acontece perto da guarda tem testemunha |
| Brigada do fogo | o primeiro incêndio | fila de baldes, brigada, quartel | apaga mais vezes e em metade do tempo; o quartel não depende da água do estoque |
| Mercado | a vila de fora | banca, feira, mercado | troca o que sobra pelo que falta com a vila de fora: por semana, a cada três dias, todo dia |

**Profissões.** Cada instituição pede gente fixa (professor, bibliotecário, curandeiro, guarda, bombeiro, feirante; uma, duas ou três pessoas por nível), escolhida pelo ofício que mais combina. Quem tem posto serve lá das 8 às 17 e sai do trabalho comum. Só com fartura: com 3 dias de comida ou mais alguém é chamado; abaixo de 1,5 dia, todos voltam à roça. A instituição só vale enquanto alguém serve nela.

**Os desafios da etapa.**
- **A febre.** Numa aldeia de 15 pessoas ou mais aparece de vez em quando, mais no inverno. Passa de um para outro, muito mais entre quem dorme na mesma casa. Dura de 5 a 9 dias, e enquanto dura a pessoa rende metade e a saúde não volta. A criança e o velho sofrem mais. Quem sara fica imune por um ano.
- **O fogo por acaso.** No verão seco, numa aldeia com 6 casas de palha ou mais, uma faísca pode pegar numa casa de dia. É o fogo que abre a brigada.

---

# Gods · versão 0.16 (Mundos e casas)

## O que mudou na 0.16

**Correções**
- **Vários mundos.** Até a 0.15, começar um mundo novo apagava o antigo (havia uma gaveta só no navegador). Agora cada mundo fica guardado na sua, e a tela de início ganhou **Seus mundos**: a lista com o casal, o lugar, o tamanho, a data e quantos vivem, com Jogar e Apagar (que pede confirmação). O save de antes da 0.16 entra na lista sozinho. O mundo que acaba também fica guardado. A nuvem continua com um mundo por conta: o último jogado.
- **O povo constrói a casa que falta.** Eram três falhas juntas: (1) o líder só marcava a barraca com 2,5 vezes o material dela no estoque (o teto de 40%), e ninguém juntava madeira para uma obra que ainda não existia; (2) a conta olhava só o total de lugares, então quem sobrava em barracas pela metade dormia na rua com a conta "fechando"; (3) com o jogo fechado ninguém marcava casa, e quem nascia ou crescia longe da vista voltava dormindo ao relento. Agora a casa é marcada sem esperar o estoque (o povo vai buscar a madeira), conta quem está de fato sem lugar, passa na frente das outras obras quando há gente na rua e também é marcada com o jogo fechado. No modo "Só eu marco", um aviso lembra quando alguém dorme fora.
- **Ninguém mais passa dos 100 por engano.** O modo seguro do jogo fechado pulava a morte por velhice: quem jogava muito com o jogo fechado via humanos com mais de 100 anos (num teste, oito velhos de 70 a 87 passaram 3 anos fora sem nenhuma morte). Agora a velhice vale com o jogo fechado também (só não leva o último vivo). Elfos e anões seguem vivendo mais, como sempre: a velhice deles chega aos 150 e aos 110.
- **Velho trabalha como velho.** Antes, o idoso rendia 80% em qualquer serviço até morrer. Agora a força cai ano a ano (80% aos 60, 58% aos 70, 35% depois dos 80), o passo fica mais lento, depois dos 70 só faz trabalho leve (colher, pescar, ofício, roça, fogo; nada de cortar árvore, quebrar pedra, caçar, minerar ou construir) e escolhe trabalhar menos, sobrando tempo para contar história e ensinar.
- Pessoa sem fé marcada (NaN) parava de trabalhar sem aviso: agora começa do meio.
- O número da versão no código ainda dizia 0.14.

**O centro e o nome do lugar**
- **O estoque tem várias bocas.** Continua sendo um estoque só (a aldeia divide tudo), mas agora cada armazém pronto também recebe e entrega: quem carrega leva à boca mais perto, e quem precisa comer, beber ou buscar material tira da mais perto. Antes, tudo ia ao quadrado do centro, que virava um formigueiro.
- **O armazém pode ficar em qualquer lugar** (antes, só a até 8 passos do centro). Um bairro de casas a 14 passos ou mais de todo estoque faz o líder pedir um armazém no meio dele.
- **Mudar o centro**: no painel do Povo, *Mudar o centro*, e você escolhe o lugar como se fosse uma obra. No modo "O povo decide", o líder também muda o centro sozinho para o meio das casas quando a aldeia cresce para longe dele (no máximo a cada 60 dias); em "O povo pede", ele só sugere.
- **O lugar tem nome e título**, que sobem com o povo e ficam: acampamento, aldeia (8 pessoas), vila (30), cidade (80) e reino (200). Ao virar aldeia, o líder dá o nome; você troca quando quiser no painel do Povo (*Dar nome* / *Trocar o nome*). Cada subida entra na Crônica.

**Mapa maior**
- Na escolha do lugar, três tamanhos: **Médio** (128 × 128, o de antes), **Grande** (192 × 192, o padrão, 2,25 vezes a área) e **Enorme** (256 × 256, 4 vezes). A escolha fica lembrada. Saves antigos abrem no tamanho de antes.
- De longe, o mapa aparece inteiro na hora (uma imagem só do mundo, com árvores e pedras), em vez de ser montado aos pedaços.
- Zoom novo de 0,5x no jogo (roda do mouse, − ou pinça) para ver a região de longe.
- Nos mapas maiores há mais bandos de bichos espalhados longe do acampamento.
- O save guarda só o que mudou desde a geração do mundo: o do mapa enorme pesa quase o mesmo que o médio pesava.

**Visual**
- Vento nas copas: o alto de cada árvore balança um pixel numa rajada que atravessa o mapa; mais forte na chuva, na tempestade e na nevasca.
- Sombras de nuvem passando devagar pelo chão durante o dia.
- O ar de cada estação: folhas secas caindo no outono, pétalas na primavera, borboletas de dia na primavera e no verão.
- Cantos da tela escurecidos de leve, e a tela de início com um texto que diz do que o jogo trata.

**Arte nova**
- Paleta própria, terrosa, com a sombra puxando para o azul e a luz para o amarelo, no lugar da paleta pronta e do verde de néon. Vale para tudo: chão, plantas, gente, bichos, casas e itens.
- O chão tem manchas grandes de tom com a borda em pontilhado ordenado (antes, um ponto de cor sorteado por pixel); o capim nasce em touceiras, a flor em canteiros de uma cor só e a mata tem folha caída. A água ganhou ondinhas.
- Árvores de copa em tufos, com luz e sombra em cada tufo; a araucária virou candelabro, com os andares de galhos e os pompons nas pontas; pedras desenhadas à mão, com face clara, rachadura e musgo.
- Gente, bichos e obras ganharam o acabamento de luz do alto à esquerda, e o contorno preto virou um tom escuro da própria cor. As pessoas têm cintura, mãos e sombra no rosto.

*A 0.16 foi de correções e de visual; a etapa 16 do roteiro (Grandes obras e instituições) saiu na 0.17.*

---

# Gods · Etapa 15 (Gente viva) · versão 0.15

*O jogo se chamava Gênesis até a 0.11. O nome mudou; os saves, o endereço e o servidor continuam os mesmos.*

Um casal. Um lugar. Todas as eras.

Você é Deus. Escolhe onde um casal vai morar, define as Vontades do povo e marca as obras. Eles decidem sozinhos como sobreviver: comer, beber, dormir, se aquecer, conversar e trabalhar. Quando o aperto passa do limite, rezam para você. A 0.5 fechou o MVP: do primeiro inverno ao fim da Era da Família, com o Narrador, a família que cresce e a trilha das descobertas. A 0.6 deu vida ao povo: som e música, relações livres, conversas, histórias, festas e orações de agradecimento. A 0.7 mexeu nas obras: toda obra evolui no lugar (a fogueira vira fogueira de pedras e depois fogueira do centro; a barraca vira casa, e a casa é a que o lugar pede: oca na mata, palafita na beira d'água, casa de barro no campo, casa de pedra na serra), chegam o armazém, a marcenaria (tábuas) e a tecelagem (mantas e redes), e você pinta caminhos no mapa, enquanto o próprio povo abre trilhas por onde mais passa. A 0.8 trouxe as invenções: faca, corda, flauta, tambor, machado, agulha, arco e flecha, rede de pesca e vasos, numa árvore em que cada uma aprende com o seu próprio trabalho. A 0.9 trouxe os bichos: veado, porco-do-mato, paca, tatu, anta, jacu e tapiti para caçar (os ariscos, só com o arco), o jacaré na beira dos lagos e a onça rondando de noite, e o povo que luta: quem tem lança revida e quem está perto e armado vem ajudar. A 0.10 abriu o campo: a roça de feijão, milho, abóbora, mandioca e algodão; a criação de galinhas, coelhos, porcos, ovelhas e gado, que chegam com um mascate; e as cercas. A 0.11 foi sobre você: Deus sobe de nível com a glória e os fiéis, ganha um dom a cada nível e um nome que o povo dá; os céticos se convertem vendo sinais; quem chega à fé inteira pode receber um poder (curar, pregar ou brilhar); e chegam os grandes atos: a Bênção, a estátua com milagre próprio, uma espécie nova criada por você e um saber de outra era. A 0.12 trouxe os outros povos (elfos, anões e povo-fera, que chegam em caravanas, convivem e se misturam) e as minas (carvão, ferro, prata, ouro e pedras preciosas). A 0.13 foi sobre a memória: o povo vela os seus mortos ao pé do fogo, enterra, volta com flores e tem o seu dia dos mortos; o que você faz de grande vira conto, e o conto muda de boca em boca; e uma erva achada na mata abre um rito em que alguém, de vez em quando, olha para cima e faz uma pergunta. A 0.14 trouxe a sociedade: cada pessoa ganhou índole, e quem tem a índole torta, na hora ruim, pega o que não é seu, bate, mente, põe fogo; você vê tudo, e o povo só sabe o que alguém viu; o povo escolhe um líder, julga ao pé do fogo e às vezes erra; você castiga na medida, mostra a verdade em sonho ou perdoa; o povo constrói sozinho o que falta; e quem não está contente junta os seus e vai embora fundar outra vila. A 0.14 também mexeu no que pesava no jogo: o 1x ficou quatro vezes mais calmo, uma aldeia de 300 pessoas roda sem travar, a Crônica não se enche de pares e nascimentos e a tela de início não mostra mais os nomes do povo. Esta versão (0.15) é sobre gente viva: cada pessoa tem gostos (a comida, o trabalho, a estação) e um jeito que aprende com o que dá certo e com o que machuca; dá para ler o que ela está pensando, e por quê; as conversas contam o que viram, fofocam, combinam o trabalho de amanhã e desabafam; antes de cada descoberta, alguém tenta e erra; e o saber mora nas pessoas: o jeito do machado se aprende vendo quem sabe, e vai embora com quem morre sem ensinar.

## O que já funciona

**Etapa 1 · Base**
- Mundo gerado por seed (128 × 128 tiles): mar, lagos, rios rasos, areia, campo, floresta, colinas e montanhas.
- Escolha do local com prévia de árvores, pedras, pitangueiras, água e clima.
- Casal com IA utilitária: fome, sede, energia, calor, social, saúde e humor; traços herdáveis; habilidades que sobem com a prática; memórias que mexem no humor.
- Vontades de 0 (proibido) a 3 (máxima) para frutas, pesca, água, madeira, pedra, construir e fogo.
- Obras: fogueira, barraca simples e barraca avançada (melhoria).
- Tempo: em 1x, um dia leva 4 minutos (uma hora de jogo, 10 segundos; um ano de 60 dias, 4 horas). Pausa, 1x, 2x, 5x, 10x, 20x e 50x. (Até a 0.13, o 1x era 4 vezes mais rápido.)
- Estações com temperatura, dia e noite, chuva e neve. Sem abrigo, o inverno mata.
- Comida que estraga (peixe mais rápido, no verão mais ainda), arbustos sem fruta no inverno, pesca mais difícil no frio.
- Crônica automática, metas do Ato 1, morte permanente com túmulo, fim de jogo.
- Arte em pixel toda gerada por código: nenhum arquivo de imagem.
- Funciona no computador e no celular (toque, arrastar e pinça).

**Etapa 2 · Fé e nuvem**
- **Fé** por pessoa (0 a 100). Devotos começam em 65, céticos em 35. Fé alta faz o povo seguir melhor as Vontades.
- **Poder** nasce da fé e, desde a 0.6, não tem teto: dá para guardar para os grandes atos que vêm nas próximas etapas. A barra enche em 100; o número segue subindo.
- **Orações**: com frio, fome ou sede de verdade, a pessoa reza. Atender dá +15 de fé (e +6 para quem viu); ignorar por 12 horas tira 8.
- **Milagres**: Calor (10 de Poder, aquece um lugar por 12 horas e o povo vai até ele), Raio (15, derruba árvore ou pedra e manda o material para o estoque; em alguém, fere 35 de saúde e a fé sobe pelo medo) e Chuva (15, frutas fora de época e água no estoque).
- **Névoa**: Deus só vê e age onde o povo já esteve. O mapa se abre conforme eles andam; milagres e obras só valem em lugar conhecido.
- **Temido ↔ Bondoso**: atender orações puxa para bondoso; raios em pessoas, para temido. O povo temido obedece mais, o bondoso ganha fé mais fácil.
- **Conta e nuvem** (opcional): e-mail e senha, save na nuvem a cada 3 minutos e ao fechar a aba, continuar em outro aparelho, ranking dos povos.
- **O mundo segue com o jogo fechado**, na velocidade que você escolher no menu: de 6 dias a 1 ano por hora fora (o padrão: 1 hora fora = 30 dias), no máximo 300 dias por volta, em modo seguro: ninguém morre enquanto você não está olhando. Na volta, uma barra mostra o mundo seguindo e um resumo mostra o que mudou. Com conta, o tempo vem da hora do servidor.

**Etapa 3 · Família**
- **Idades**: bebê (0 a 2, vai no colo), criança (3 a 11, brinca e, a partir dos 7, colhe frutas e busca água), jovem (12 a 17, aprendiz: faz todo trabalho, rende 75% e aprende mais rápido), adulto (18 a 59) e idoso (60+, mais lento; perto dele os jovens aprendem ainda mais). Da velhice ninguém escapa.
- **Pares**: o afeto sobe com conversa, festa e noites juntos na mesma barraca, e um coração aparece sobre ela. Filhos só entre adultos que não sejam parentes próximos. (Desde a 0.6, cada um pode ter mais de um par: veja a Etapa 6.)
- **Gravidez** de 0,75 ano (45 dias). A grávida come 30% a mais, cansa mais e, nos últimos 10 dias, trabalha e anda mais devagar.
- **Parto** de 4 horas, na barraca (ou junto ao fogo, se a barraca estiver fria). Em 15% das vezes é difícil (menos com barraca e fogueira, mais se a mãe estiver fraca): a mãe e o pai rezam; sem ajuda ela perde saúde e o bebê pode não sobreviver. Com o jogo fechado, o parto nunca é difícil.
- **Milagre Cura** (tecla E, 20 de Poder): +60 de saúde em quem está no ponto e salva o parto difícil. Chega com o primeiro filho.
- **Você dá o nome**: o jogo pausa no nascimento e sugere um nome. Dá para trocar depois, no painel da pessoa, enquanto ela é pequena.
- **Bebês no colo**: mamam de hora em hora (a mãe come e bebe mais), vão para o colo do pai quando nasce outro e andam sozinhos aos 3 anos.
- **Barracas por lugares**: adulto e jovem ocupam 2, criança 1, bebê nenhum. A simples tem 5 lugares (um casal e uma criança), a avançada 6. Cada um mora com o par de mais afeto; quem mora sem par vai morar com ele quando há lugar. Quem sobra dorme ao relento, e só 4 cabem no calor da fogueira.
- **Frio em família**: crianças e idosos sentem mais frio. Quem está gelado dorme junto do fogo em vez de ir para a barraca fria, e quem carrega um bebê vai se aquecer quando o bebê esfria, mesmo sem sentir frio.
- **Árvore da família** (tecla T ou botão Árvore no painel do povo): gerações, pares e filhos; quem já morreu aparece apagado, com †. Pares que não ficam lado a lado se ligam por um arco pontilhado.
- **Metas da Família**, depois do primeiro inverno: receber o primeiro filho, ter barraca para todos, guardar comida para 10 dias, ver um filho crescer e ajudar, chegar a 6 pessoas.
- **Crônica** com a primeira gravidez, os nascimentos, a primeira ajuda de uma criança, os 18 anos de cada filho e as mortes com a idade. Nascimento, luto e brincadeira mexem no humor.

**Etapa 4 · Narrador**
- **Um diretor lê o mundo todo dia** e escolhe o próximo acontecimento: mundo calmo e farto puxa aperto, uma morte puxa respiro (o desastre marcado é cancelado e vem um alívio), nunca dois desastres grandes seguidos. Se passa tempo demais sem nada, ele puxa um alívio ou um aperto pequeno.
- **Três personalidades**, escolhidas ao mandar o casal e trocáveis no menu: **Pacífico** (desastres a cada 24 a 34 dias, mais brandos), **Equilibrado** (14 a 20 dias, o padrão) e **Implacável** (8 a 12 dias, mais duros). Antes do primeiro inverno só vem tempestade; desastre grande, só depois dele.
- **Nevasca** (inverno, com aviso na véspera): 6 °C a menos e neve, anda-se mais devagar, o fogo come lenha quase duas vezes mais rápido e quase ninguém sai para trabalhar. Quem sente frio vai buscar lenha quando o fogo está morrendo.
- **Seca** (verão, 9 a 13 dias): mais calor e sede, as pitangueiras param e murcham, cada viagem de água rende metade e o peixe some. A Chuva de Deus quebra a seca.
- **Lobos** (à noite, com uivos no fim da tarde): a matilha cresce com os anos e ronda o acampamento. Quem fica na luz do fogo aceso, na barraca ou no Calor de Deus está a salvo; quem está sozinho no escuro corre para o fogo e reza. Criança não é atacada. Cada um leva no máximo 3 mordidas por noite (4 no Implacável). Com o estoque fora da luz do fogo, lobo leva comida. Um Raio perto de um lobo abate um e espanta o resto; o fogo fica aceso nas noites de lobo.
- **Tempestade** (aperto pequeno, algumas horas): apaga a fogueira, esfria e molha.
- **Alívios**: fartura (os arbustos carregam), piracema (peixe em dobro na primavera), mel achado no mato, veranico (sol no meio do inverno) e andarilho, que pede abrigo.
- **Segundo casal**: um dia depois do 18º aniversário do primogênito chega um casal pedindo abrigo, com um filho ou filha do gênero oposto ao do primogênito e da mesma idade. O jogo pausa e você decide: acolher ou mandar seguir (recusar é para sempre).
- **Na tela**: faixa do evento no almanaque (vermelho aperto, amarelo aviso, verde alívio), neve de lado na nevasca, relâmpagos na tempestade, luz amarelada na seca, olhos brilhando no escuro, e o tempo volta a 1x quando os lobos aparecem. Toque num lobo ou num viajante para saber o que fazer.
- Com o jogo fechado, o Narrador descansa: nada novo começa e os lobos vão embora.

**Etapa 5 · Descobertas**
- **A trilha**: pedra lascada → cestos → lança → anzol → defumar e secar → cerâmica. Só a próxima da trilha ganha prática, e cada uma se aprende num trabalho: cortar madeira e quebrar pedra ensinam a pedra lascada; colher frutas e carregar água, os cestos; trabalhar a madeira, mirar e ver lobos rondando, a lança; pescar muito, o anzol; cuidar do fogo e ver comida estragar, a defumação; buscar água no barranco, a cerâmica. Com a prática completa, a ideia chega em poucos dias para quem mais praticou. A trilha começa depois da primeira fogueira.
- **Revelação** (tecla V, 60 de Poder): toque em alguém de 7 anos ou mais e ele sonha com a próxima descoberta, se o povo já tiver 30% da prática. Chega com a primeira descoberta.
- **Ferramentas de pedra**: +20% para cortar madeira, quebrar pedra, construir, cavar argila e caçar. Cada uma dura cerca de 67 horas de trabalho pesado (pescar gasta um terço) e quebra; quem trabalha pega outra do estoque. O **Ofício** (nova Vontade) lasca ferramentas (1 pedra + 1 madeira) e costura roupas.
- **Cestos**: cada viagem rende metade a mais. **Anzol**: com ferramenta, o peixe rende 50% mais.
- **Lança e caça**: capivaras vivem em bandos perto da água, pastam de dia, dormem à noite e fogem de quem chega. A **Caça** (nova Vontade) mira, lança (nem toda lançada acerta) e traz 8 de carne e 2 de couro. O povo sempre deixa o casal do bando, que volta a crescer; bando que acaba reaparece em outro canto. Com a lança na mão, a mordida do lobo dói menos. Um Raio numa capivara também vira carne e couro.
- **Roupas de couro** (2 couros): 25% menos frio. Gastam com o tempo (mais no inverno) e se desfazem em cerca de um ano; quem passa pelo acampamento veste a do estoque.
- **Defumar e secar**: o **moquém** defuma 10 peixes ou carnes em 8 horas com 2 de lenha; o **jirau** seca 12 frutas com 14 horas de sol (nada à noite, na chuva ou no inverno). Defumado e fruta seca quase não estragam: é o preparo para o inverno. **Conservar** (nova Vontade) cuida disso e para quando já há um mês de comida guardada.
- **Ordem de comer**: o fresco assado primeiro (estraga logo), depois frutas, defumado, fruta seca e, só sem fogo e sem outra coisa, peixe ou carne crus.
- **Cerâmica**: **Argila** (nova Vontade) na beira da água e o **forno de barro** (12 argila, 6 pedra, 8 madeira). Os potes guardam o dobro de água e peixe, carne e frutas estragam 30% menos.
- **Fim da Era da Família**: com a cerâmica e 15 pessoas vivas, o jogo pausa e mostra o que o povo virou (vivos, nascidos, gerações, descobertas, milagres, túmulos). O acampamento vira aldeia e o jogo continua.
- **Metas das Descobertas**, depois das da família: descobrir a pedra lascada, fazer 5 ferramentas, guardar 30 porções conservadas, vestir 5 pessoas com couro, descobrir a cerâmica e chegar a 15 pessoas.
- **Na tela**: janela das Descobertas (tecla I ou Povo → Descobertas) com a trilha, a prática de cada uma e o que ela dá; as Vontades e obras novas aparecem quando são liberadas; o painel da pessoa mostra a ferramenta e a roupa com o quanto ainda duram; fumaça no moquém, frutas mudando de cor no jirau, lança no ar na caça, roupa de couro no boneco.
- **Ranking** com quantas descobertas cada povo fez e quem virou aldeia (precisa do `Code.gs` novo; veja abaixo).
- **Ajustes do teste da 0.4**: o menu ganhou o botão Fechar (e fecha com Esc ou tocando no mapa; no celular ele não cobre mais o botão ≡), as velocidades 10x e 20x, e o tempo com o jogo fechado ficou mais rápido e ajustável.

**Etapa 6 · Vida**
- **Som e música**, tudo gerado no próprio jogo (nenhum arquivo de áudio): o machado, a pedra, o martelo, a água e a lança de quem está na tela, as obras prontas, cada milagre, orações, nascimento, morte, descobertas, lobos uivando e rosnando, trovão na tempestade; de ambiente, pássaros de dia (mais no amanhecer), grilos, sapos e coruja de noite, vento, chuva, o rio perto da câmera e o estalo do fogo. Longe da câmera, tudo fica mais baixo. A música é gerada na hora, em escala pentatônica, e muda com o jogo: dia, tarde, noite, inverno, perigo (lobos, nevasca, parto difícil), festa e história. Toca em frases e descansa entre elas. No menu: chave do som e volume de música, ambiente e efeitos (fica guardado neste aparelho); tecla N liga e desliga. O navegador só libera o som depois do primeiro toque.
- **Relações livres**: não existe monogamia. Cada adulto pode ter até 4 pares do outro sexo e 1 do mesmo sexo (3 desde a 0.10; esses sem filhos, e sem tirar lugar dos outros). Ter par não impede outro; só pesa um pouco. Mulher em idade de ter filho e sem par homem tem o dobro de chance de achar um. Quem tem par morando em outra barraca dorme lá em parte das noites (a visita divide a cama do par), e daí vêm filhos de pais diferentes. Sem convivência, o afeto esfria e o par se desfaz, sem mágoa. Nos testes de 35 anos, o povo da 0.6 teve de 9 a 11 mães (na 0.5, 4 ou 5) e de 36 a 43 filhos por mundo (na 0.5, de 22 a 30; parte dessa diferença vem da fogueira cercada, que a 0.6 também corrigiu).
- **Conversas de pergunta e resposta**, e a resposta olha o mundo: "Tem comida pro inverno?" "O estoque tá cheio." ou "Quase nada."; "Você acha que alguém olha por nós?" responde conforme a fé de quem ouve; o que cada um fez no dia, o tempo, o bebê que nasceu, a descoberta nova, os lobos da outra noite, quem morreu. Criança pergunta à mãe ("Mãe, por que o céu é azul?"), pares namoram, e os balões aparecem um em cima do outro, na ordem da conversa. O painel da pessoa mostra a última conversa.
- **Histórias ao pé do fogo**: de tardinha, alguém (os mais velhos gostam) chama e conta; se o fogo estiver apagado, quem conta acende com lenha do estoque; quem está por perto vem ouvir. A história é uma lembrança da Crônica ("Lembram quando a primeira fogueira foi acesa?") ou uma lenda do povo. Quem ouve fica feliz, e cada ouvinte vale um pouco de prática na próxima descoberta.
- **Festas**: nascimento, fim do inverno, fartura, piracema, descoberta, gente nova acolhida, a primeira fogueira e o fim da era dão festa à noite, em volta do fogo (aceso na hora, se estiver apagado). Dançam (com música de festa), comem uma porção cada (se o estoque aguenta), ficam mais próximos uns dos outros (é daí que nascem pares) e alguém agradece. No máximo uma a cada 8 dias, e nunca logo depois de uma morte.
- **Consolo no luto**: quem está bem procura quem perdeu alguém da família e conversa; o luto encurta 4 dias a cada consolo. Quem era mais próximo de quem morreu reza por ele.
- **Brigas e pazes**: de mau humor, a conversa pode virar briga (balão vermelho), menos nos primeiros 20 dias, quando o casal ainda está se ajeitando: os dois ficam de 2 a 4 dias sem se falar, e entre pares o afeto cai. Passada a raiva, a próxima conversa é de pazes. De bom humor, briga é rara.
- **Os mais velhos ensinam**: quem tem nível 3 ou mais num ofício ensina os jovens de 7 a 17 anos a pescar, colher, construir, caçar ou lascar pedra (3 horas de prática de uma vez).
- **Orações de agradecimento**: dão Poder. Pelo filho que nasceu (+6), pelo inverno vencido (+8), pela festa (+5), pela fartura e pela piracema (+4), pela ideia de uma descoberta (+4), pela oração atendida (+3) e, de manhã, quem tem muita fé agradece pelo dia (+1). No luto, a oração por quem se foi também conta (+2).
- **Pequenos acontecimentos**, cerca de um a cada 3 dias: ninho com ovos, cogumelos depois da chuva, estrela cadente (quem viu faz um pedido), arco-íris, araras passando, galhos que o vento derrubou, pé torcido, formigas no estoque, vaga-lumes, a primeira neve do ano, um sonho bonito e cantoria perto do fogo. E a **lua cheia**, no dia 14 de cada 30: a noite clareia e a conversa vai até mais tarde.
- **Mais missões no começo, com recompensa em Poder**: o Ato 1 tem 13 metas. As 5 de sempre abrem a próxima fase; as outras 8 são missões menores (tocar em alguém, mudar uma Vontade, colher 20 frutas, guardar 10 cabaças, pescar 5 peixes, fazer um milagre, ouvir uma história, atender uma oração). Missão que sobra passa para a fase seguinte, que ganha duas novas (ver uma festa, ver alguém ensinar). O painel mostra quantas já foram e as próximas 4, cada uma com o Poder que rende.
- **Na tela**: dança com pulinhos e notas de música, balões com o jeito de cada fala (briga, namoro, festa, consolo, história), estrela cadente, arco-íris, araras cruzando o céu, vaga-lumes piscando e a noite mais clara na lua cheia.
- **Correções para jogos longos**: fogueira, moquém e barracas cercados de outras obras continuam alcançáveis (antes o fogo cercado apagava para sempre e o povo morria de frio depois de uns 25 anos), e quando a pedra (que não nasce de novo) acaba perto de casa, o povo vai buscar mais longe.

**Etapa 7 · Obras**
- **Toda obra evolui no lugar.** Toque na obra pronta: o painel mostra cada melhoria com o custo e, quando ainda não dá, o que falta ("pede cerâmica", "pede uma marcenaria"). A obra segue funcionando enquanto a melhoria é feita, e cancelar devolve o material. O custo e o trabalho são só da melhoria.
  - **Fogueira** → **fogueira de pedras** (8 pedra: a lenha dura 40% mais, a chuva quase não apaga, 6 dormem no calor e o calor vai a 6 passos) → **fogueira do centro** (10 pedra e 6 tábuas: bancos em volta, 16 ouvem as histórias, que ensinam 50% mais, a festa aproxima mais e 8 dormem no calor).
  - **Barraca simples** → **barraca avançada** → **casa**, a que o lugar pede, olhando em volta: **oca** na mata (26 madeira e 14 fibra; 12 lugares, +14 °C, para muitas famílias), **palafita** com água a até 3 passos (14 tábuas e 8 madeira, pede uma marcenaria; 8 lugares, +13 °C e sono fresco), **casa de barro** no campo aberto (16 argila e 8 madeira, pede a cerâmica; 8 lugares, +16 °C) e **casa de pedra** perto de colina, montanha ou pedras (24 pedra e 8 madeira; 8 lugares, +18 °C, a mais quente, com fumaça na chaminé). As quatro aparecem no painel, cada uma com o porquê de dar ou não dar ali.
  - **Moquém grande** (defuma 20 de uma vez), **jirau coberto** (seca 20 e segue secando na chuva), **forno grande** (potes que guardam 90 de água, e a comida estraga 40% menos), **armazém de tábuas**, **marcenaria com bancada** e **tear grande** (a oficina faz o dobro).
- **Armazém** (tecla G, 16 madeira e 6 pedra): abre depois do primeiro inverno, com aviso, e tem que ficar a até 8 passos do estoque. Guarda a comida: estraga 25% menos (45% no armazém de tábuas) e o lobo não leva nada.
- **Marcenaria** (tecla K, depois da pedra lascada): o Ofício faz tábuas, 2 madeira para cada uma. Faz o que as obras marcadas pedem e deixa umas 6 de folga. Tábua é o que a fogueira do centro, a palafita, o jirau coberto e as melhorias das oficinas pedem.
- **Tecelagem** (tecla L, depois dos cestos, com fibra): quem corta árvore tira embira da casca (2 de fibra por árvore). O Ofício tece **mantas** (3 fibra: quem dorme com uma sente 5 °C a menos de frio; dura uns três anos) e **redes** (4 fibra: o sono rende 15% mais). No outono e no inverno a manta passa na frente da rede e da tábua. Quem passa pelo acampamento pega a sua do estoque, e o boneco dorme coberto.
- **Caminhos** (tecla P ou o botão Caminho, em Construir): arraste pelo chão para marcar. **Terra** só pede trabalho (12 minutos por passo) e anda-se 30% mais rápido; **pedra** leva 1 pedra por passo (18 minutos) e anda-se 45% mais rápido; **Desfazer** tira o marcado ou o feito. Quem abre é a Vontade de Construir. Não dá caminho na água, na névoa, em cima de obra, árvore, pedra ou túmulo; o caminho limpa tocos e arbustos, e ali a árvore não volta. Uma obra erguida em cima do caminho toma o lugar dele.
- **Trilhas sozinhas**: onde muita gente passa todo dia, a grama gasta e vira trilha (anda-se 15% mais rápido); sem ninguém passando, ela some. O caminho se desenha ligado, com curvas e cruzamentos.
- **Metas**: a fase da família ganha duas missões (melhorar a fogueira, +4 de Poder; abrir um caminho, +3) e a das descobertas mais duas (erguer um armazém, +5; fazer as primeiras tábuas, +4). Depois das descobertas chegam as **metas da aldeia**: a primeira casa (+12), marcenaria e tecelagem (+8), 5 pessoas com manta (+8), 30 passos de caminho (+6) e 8 melhorias (+10). Cumpridas todas, a Crônica registra que a aldeia tomou forma.
- **Na tela**: cada nível tem o seu desenho (a roda de pedras e o chão calçado da fogueira, a oca de palha, a palafita sobre esteios, a casa de barro, a casa de pedra, o armazém de tábuas, as bancadas), o fogo maior clareia mais longe, o caminho aparece enquanto você pinta, o marcado fica em cor de terra (ou cinza, se for de pedra) com uma barrinha de quanto já foi aberto, faíscas douradas quando uma melhoria fica pronta, e o som da serra na marcenaria e do tear na tecelagem.
- **Painel de obras** mais compacto (cabe no computador e no celular), com a dica de cada ferramenta logo acima dele.

**Etapa 8 · Invenções**
- **Uma árvore, não uma trilha.** A trilha das descobertas continua uma depois da outra. As invenções abrem quando o que elas pedem já existe e cada uma aprende com o seu próprio trabalho, então várias andam ao mesmo tempo. Na janela das Descobertas (tecla I), a aba **Invenções** mostra as nove, o que cada uma dá, a prática de cada uma e o que falta para abrir. Com a prática completa, a ideia chega para quem mais praticou (no máximo uma invenção por dia), com festa e Crônica.
- **Faca** (depois da pedra lascada; aprende no Ofício, cortando madeira e carneando): o Ofício trabalha 25% mais rápido, e cada capivara rende 3 de carne e 1 de couro a mais.
- **Corda** (depois dos cestos; aprende tirando embira, colhendo, tecendo e construindo): obras e caminhos saem 20% mais rápidos. Abre o machado, o arco e a rede de pesca.
- **Flauta** (depois da faca; aprende contando e ouvindo histórias e dançando): parte das noites de história vira música ao pé do fogo, com notas no ar, e quem ouve fica de bom humor.
- **Tambor** (depois da lança; aprende dançando, costurando o couro e carneando): na festa, um adulto bate o tambor e os outros dançam em volta; a festa aproxima o povo 50% mais.
- **Machado** (depois da corda; aprende cortando madeira e construindo): com ferramenta, a madeira sai 60% mais rápido (antes, 20%), com golpes mais rápidos no som.
- **Agulha** (depois da faca; aprende costurando roupas e tecendo): a roupa de couro costurada tira 35% do frio (antes, 25%) e dura metade a mais.
- **Arco e flecha** (depois da corda e da lança; aprende caçando): quem caça atira de longe (4,4 passos, antes 2,6), acerta mais, tem 4 flechas em vez de 3 lançadas, e a flecha não espanta o bando.
- **Rede de pesca** (depois da corda e do anzol; aprende pescando): o peixe fisga 35% mais, e cada pescaria traz até 2 peixes a mais.
- **Vasos** (depois da cerâmica; aprende cavando argila, cuidando do fogo e carregando água): peixe e carne cozidos no vaso sustentam 25% mais, e a comida guardada rende mais dias.
- **Revelação**: além da próxima descoberta da trilha, entrega invenções. Na janela, o botão **Revelar** de cada invenção com 30% da prática escolhe qual; pela tecla V, vai a próxima da trilha e, se ela ainda não está pronta, a invenção mais adiantada.
- **Missões novas**, com Poder: inventar a faca (+4) na fase da família; inventar a corda (+4) e fazer 3 invenções (+6) nas descobertas; caçar com arco e flecha (+6), dançar ao som do tambor (+6) e fazer todas as invenções (+15) na aldeia.
- **Na tela**: o machado de pedra polida, o arco com a flecha na corda (e a flecha voando reta, de penas vermelhas), a faca na hora de carnear e de cortar o couro, a agulha com a linha vermelha, a rede lançada na água, a flauta na boca de quem toca, o tambor ao lado da fogueira e, na festa, na frente de quem bate, e o vaso no fogo soltando vapor. O painel da pessoa dá nome à ferramenta ("Faca, machado e arco 64%") e diz quando a roupa é costurada.
- **No som**: antes da flauta, a melodia da música é cantarolada; depois, é a flauta. Antes do tambor, a festa é na palma e no chocalho; depois, tem bumbo, batuque e viradas. O arco tem o som da corda e da flecha, e a noite de flauta tem música própria.

**Etapa 9 · Bichos**
- **Oito bichos novos, cada um no seu lugar e com o seu jeito.** Veado e jacu na mata (ariscos: fogem de quem chega perto), porco-do-mato na mata (anda em vara; ferido, pode partir para cima de quem atacou), paca na mata perto da água (sai ao escurecer; de dia fica na toca), anta na mata perto da água (o maior bicho: pede três acertos e às vezes se vira contra quem ataca), tatu e tapiti no campo, jacaré na beira dos lagos. As capivaras continuam na beira d'água. Os bandos crescem (o tapiti dá cria depressa, a anta devagar) e, quando um acaba, outro aparece em outro lugar.
- **Caçar**: com a lança, capivara, porco-do-mato e tatu; os ariscos (veado, paca, anta, jacu e tapiti) só com o arco e flecha; o jacaré, só com o arco e quando está tomando sol. Cada bicho rende o seu (a anta dá 24 de carne e 4 de couro; o tatu, 5 de carne). Quem caça prefere o que rende mais e está mais perto, mas bicho que ninguém caçou ainda atiça a curiosidade, e a primeira caçada de cada um entra na Crônica.
- **Jacaré**: de dia toma sol no ninho, na beira do lago; de noite fica na água. Quem pesca, busca água ou cava argila a menos de 3 passos dele pode levar um bote. Depois do ataque ele mergulha, e o povo evita aquela margem por 30 dias.
- **O povo luta e se defende.** Quem é atacado (por lobo, onça, jacaré, porco-do-mato ou anta) e tem lança na mão revida na hora, e quem está perto (até 7 passos), acordado, adulto e armado corre para ajudar (até 3). Cada acerto tira vida do bicho. O lobo pode cair de um golpe só ou fugir ferido, e um lobo caído espanta a matilha.
- **Onça** (evento do Narrador, a partir do 2º ano, com 3 pessoas ou mais): ronda o acampamento por 2 ou 3 noites. De noite ataca quem está sozinho no escuro (fogo aceso, barraca e gente junta a mantêm longe); de dia some na toca. Na manhã seguinte a um ataque, 2 ou 3 dos melhores caçadores vão atrás dela na mata (ninguém vai sozinho, nem com chuva ou muito frio), esperam uns aos outros perto da toca e a acuam. Acuada, ela dá botes em quem está perto. Vencida, vira carne, couro e festa; se os caçadores recuam, ela escapa ferida e não volta mais. O Raio em cima dela abate; perto, espanta para a mata. Quem é atacado reza ("Deus, a onça!"), e o Raio atende.
- **Mortes e memórias**: a Crônica diz quem morreu no ataque da onça, de um jacaré ou de outro bicho. Quem é atacado fica abalado por uns dias; quem luta, ou vê o povo vencer a fera, fica orgulhoso.
- **Missões novas**, com Poder: caçar 3 tipos de bicho (+5) nas descobertas; caçar 6 tipos (+8), revidar o ataque de um bicho (+6) e vencer uma onça (+10) na aldeia.
- **Na tela**: cada bicho com o seu desenho (a paca pintada, o tatu de cascos, a anta de tromba, o jacu de papo vermelho, o tapiti de orelha em pé), o jacu voando de asas batendo, o jacaré tomando sol ou só com os olhos de fora da água, a onça pintada (agachada na luta, com um "!" quando está acuada), os olhos da onça e do jacaré brilhando no escuro, o "!" do porco que vem para cima, a poeira da investida e o respingo do acerto. Tocar num bicho diz o que ele é, onde vive e o que rende (ou o que falta para caçá-lo).
- **No som**: o esturro da onça (e, de noite, ao longe, enquanto ela ronda), o grunhido do porco-do-mato e da anta, o bote do jacaré, a revoada do jacu e o baque do acerto. A música de perigo toca também com a onça por perto.
- **Correção**: lobo, onça e bicho que investe agora alcançam quem está na diagonal (antes paravam do lado, sem morder).

**Etapa 10 · Campo**
- **Quatro descobertas do campo, numa árvore** (como as invenções), a partir da cerâmica: a **Roça** (aprende colhendo frutas, secando no jirau e cavando o barro) e, depois dela, o **Algodão** (plantando, colhendo e tecendo), a **Criação** (carneando a caça e cuidando da roça: plantando, capinando e colhendo) e, com a corda, a **Cerca** (construindo, cortando madeira, abrindo caminhos e plantando). Na janela das Descobertas (tecla I), a aba **Campo** mostra as quatro, com a prática de cada uma; a Revelação também entrega as do campo.
- **Roça** (tecla H): 3 × 3 em terra boa (nada de areia ou pedra). Não pede material, só o trabalho de lavrar. A **Roça** (nova Vontade) planta, capina o mato que aparece no meio do crescimento (sem capina em 4 dias, a roça perde 35%), colhe e leva ao estoque; vários ajudam a carregar. Colheita madura esquecida no pé passa do ponto e vai se perdendo. Quem trabalha na roça ganha a habilidade Plantio, e capinar gasta a ferramenta.
- **Cinco culturas** (dias até madurar, no ritmo da primavera; o verão acelera, o outono atrasa e o inverno para):
  - **Feijão**: 12 dias, 40 porções. Só se come cozido; seco, quase não estraga.
  - **Milho**: 18 dias, 54 porções. Cozido ou cru; quase não estraga.
  - **Abóbora**: 20 dias, 36 porções, a porção que mais sustenta. Cozida ou crua.
  - **Mandioca**: 30 dias, 70 porções. A única que cresce no inverno (devagar) e espera 40 dias no chão depois de madura. Só cozida, e estraga mais depressa no estoque.
  - **Algodão** (com a descoberta do algodão): 24 dias, 24 de fibra para a tecelagem.
- **O que plantar**: toque na roça e escolha, ou deixe **O povo escolhe**, que olha a estação e o que falta no estoque (no outono, mandioca para o inverno; algodão quando a fibra acaba, e só com mais de uma roça, porque a comida vem primeiro). Ninguém planta o que não dá tempo de madurar antes do inverno, e a **geada** queima o que ficou no pé (menos a mandioca).
- **Roça adubada** (melhoria: 4 madeira, pede a criação): esterco do curral na terra, rende 30% mais. No **tempo de fartura**, a roça que está crescendo rende 25% mais; a **Chuva de Deus** rega (a roça cresce 2 dias de uma vez); na **seca**, ela quase para. A **praga** é um aperto novo do Narrador, no verão e no outono: gafanhotos levam metade da colheita da maior roça.
- **Bicho do mato come roça aberta**: um bando de capivaras, porcos-do-mato, veados, antas ou tapitis a até 16 passos entra e come 10% (no máximo 40% da roça, com uns dias de sossego entre um estrago e outro), e dá para ver um deles indo até lá. Criação solta perto da roça também cisca.
- **Curral** (tecla Y, 12 madeira, com a criação): abrigo com cocho e 8 lugares (galinha e coelho ocupam meio; vaca e boi, dois). O **curral grande** (10 madeira e 6 tábuas) tem 14. De dia os bichos pastam a até 5 passos do curral (ou em todo o cercado, se houver cerca); de noite e na chuva, ficam nele.
- **O mascate**: pronto o primeiro curral, um mascate passa em 2 a 4 dias tocando a primeira espécie que o povo ainda não tem (um galo e duas galinhas; ou um casal de coelhos, de porcos, de ovelhas, ou um boi e uma vaca) e pede em troca o que sobra: couro, ferramentas, roupas, mantas, redes, tábuas, fibra e comida guardada (comida, só com folga, e no máximo a metade). O povo não troca o que precisa. O jogo pausa e você decide: **Trocar** ou dispensar. Outro passa em 20 a 34 dias (50 a 80, quando o povo já tem as cinco), nunca no inverno. Sem o que trocar, ele passa longe e volta depois.
- **Cinco criações**: a **galinha** põe meio ovo por dia; o **coelho** dá cria depressa, carne e pele; o **porco** engorda com as sobras (18 de carne); a **ovelha** dá 3 de lã na tosquia do começo da primavera (a lã vira fibra); a **vaca** dá 3 de leite por dia, e o gado rende 36 de carne e 5 de couro. Com macho e fêmea e lugar no curral, nascem crias (a galinha a cada 8 dias, a vaca a cada 45), nunca no inverno.
- **Criação** (nova Vontade): recolhe ovos, leite e lã (criança de 7 anos já recolhe ovo), leva ração no frio e abate quando o curral enche, sempre deixando um casal de cada espécie (vai primeiro o macho que sobra). Quem cuida ganha a habilidade Criação. Ovo e leite são comida: o leite vai primeiro (azeda depressa e ainda mata a sede).
- **Inverno no curral**: o pasto some e os bichos pedem ração, tirada do estoque (mandioca, abóbora, milho ou feijão, o que estraga primeiro vai antes). Sem ração por 6 dias, eles começam a morrer.
- **Lobo e onça**: nas noites de lobo, a matilha leva um bicho do curral aberto (gado não); a onça pula até a cerca.
- **Cercas** (tecla X, e arraste pelo chão como o caminho): 1 madeira e 12 minutos por passo, fincadas pela Vontade Construir; falta de madeira para a cerca puxa o corte de madeira. Bicho do mato e de criação não passam; gente pula (3 vezes mais devagar). Cerca em cima de caminho de terra ou de pedra vira **porteira**: o povo passa sem pular e bicho continua do lado de fora. Para cercar, feche a volta toda: árvore, pedra, água e as outras obras também servem de parede (a roça e o curral, não), e bicho não passa na quina entre duas cercas na diagonal. Com a cerca na mão, as roças e currais cercados ficam verdes e os abertos, com o contorno vermelho; o painel da obra também diz se está cercada.
- **Comida do campo**: feijão e mandioca só cozidos (com o fogo apagado e só isso no estoque, alguém acende a fogueira para cozinhar), milho e abóbora também crus; os vasos rendem também no cozido da roça e no ovo. A roça vai à festa, e o ovo e o leite contam nos dias de comida.
- **Missões novas** na fase da aldeia, com Poder: colher a primeira roça (+6), colher as cinco culturas (+10), ter 10 bichos de criação (+8) e cercar uma roça ou um curral (+6). A primeira colheita dá festa.
- **Na tela**: a roça em leiras (o broto e cada cultura crescendo e madura: o feijão de vagem, o milho de espiga e pendão, a abóbora rasteira, a mandioca de haste vermelha, o algodão de capulho branco), o mato no meio, a palha da última colheita, a colheita no chão esperando quem leve, a terra mais escura da roça adubada e a neve em cima no inverno; o curral com o cocho e o curral grande de tábuas; galinha, galo, coelho, porco, ovelha, carneiro, vaca e boi pastando; as cercas de vara que se emendam sozinhas, a porteira no caminho e a cerca marcada com estaca e barbante; a enxada na mão de quem capina; o mascate com os bichos na frente; os gafanhotos da praga e as penas do bicho levado. Tocar num bicho de criação diz o que ele dá e se vive num curral cercado.
- **No som**: a enxada, a colheita, o galo cantando de madrugada, galinha, porco, ovelha e vaca perto da câmera, os gafanhotos e o sininho do mascate.
- **O povo não corta a árvore que faz de parede**: árvore ou pedra que fecha a volta de uma roça ou de um curral cercados fica onde está (quem vai buscar madeira ou pedra procura outra); as que ficam do lado de dentro podem sair.

**Ajustes pedidos depois da 0.9** (entram na 0.10)
- **Falas que dá tempo de ler**: cada balão fica pelo menos 5 segundos, mais um pouco por letra (a história, mais ainda), qualquer que seja a velocidade do jogo; quem fala de novo antes da hora espera a vez numa fila curta.
- **Painéis como no celular, também no computador**: Vontades, Construir, Deus, Povo e Crônica começam fechados e abrem ao clicar na barra do canto de baixo, à direita; vários podem ficar abertos, cada um no seu canto, e o jogo lembra neste aparelho o que ficou aberto. Esc (sem nada escolhido) fecha todos. Quando alguém reza, o botão Deus mostra quantas orações esperam.
- **A obra tem painel próprio**: tocar numa obra abre o painel dela (nível, o que ela faz agora, a evolução com o custo de cada melhoria, remover, o que plantar na roça, quem mora no curral), separado da lista do povo, com o botão Fechar.
- **Relações ainda mais livres**: cada adulto pode ter até 4 pares do outro sexo e, agora, até 3 do mesmo sexo (antes, 1), sem precisar se separar de ninguém; o par só se desfaz se passar tempo demais sem convivência.
- **Noites picantes**: quem tem dois pares dormindo na mesma casa, e os dois se dão, às vezes passa a noite a três; depois da festa, um grupo de adultos ligados por pares pode esticar a noite junto, na casa maior. A primeira de cada vai para a Crônica (as outras, às vezes, num aviso), com corações sobre a casa, e o namoro dos pares fica mais atrevido. Sempre só entre adultos (18 anos ou mais), nunca entre parentes próximos nem brigados, nada descrito, e nunca com o jogo fechado. Dá para desligar no menu (Noites picantes).
- **Conta e servidor**: o jogo acorda o servidor antes da hora (ao abrir a tela de título e a janela da conta), porque depois de um tempo parado o Apps Script demora para responder; no cadastro e no login espera até 45 segundos; quando a rede falha ou o servidor tropeça (trava ocupada, planilha lenta), tenta de novo sozinho; e se a conta foi criada mas a resposta se perdeu no caminho, entra direto com os mesmos dados, em vez de dizer que o e-mail já existe. O servidor passou a limpar as sessões vencidas de uma vez, para a planilha não crescer sem fim.

**Etapa 11 · Deus**
- **Glória e níveis**: a glória é todo o Poder que o povo já te deu (a fé de cada hora, os agradecimentos, as orações atendidas, as metas); gastar Poder não tira glória. Fiel é quem tem 7 anos ou mais e fé 70 ou mais. Cada nível pede os dois:
  - **1 · Espírito**: o começo.
  - **2 · Guardião** (glória 500 e 2 fiéis): o povo te dá um nome, chega a **Bênção** e um dom.
  - **3 · Deus do Povo** (2.500 e 4 fiéis): um escolhido com poder, uma estátua e um dom.
  - **4 · Deus Antigo** (8.000 e 7 fiéis): dois escolhidos, duas estátuas, uma espécie nova e um dom.
  - **5 · Deus Maior** (20.000 e 10 fiéis): três escolhidos, três estátuas, um saber de outra era e um dom.
  Quem atende as orações chega ao Guardião no primeiro ano; os níveis de cima dependem de o povo crescer com fé. Quem larga o povo fica no Espírito ou no Guardião.
- **O nome que o povo te dá**: no nível 2, quem mais reza começa a te chamar por um nome inventado (sempre o mesmo para o mesmo mundo) e um título que vem do que você mais fez e de como o povo te vê: Pai da Chuva ou O que Segura as Nuvens, O que Cura ou O que Dá e Tira a Vida, Senhor do Trovão, O que Ouve, O Silencioso… O jogo pausa: dá para aceitar, sortear outro ou escrever o seu. Daí em diante as orações, os agradecimentos, o luto, as conversas e a Crônica usam o nome (trocar depois, em Deus, muda a Crônica junto).
- **Dons** (um a cada nível, escolhido entre três; a oferta é a mesma para o mesmo mundo e sempre traz um do seu lado, bondoso ou temido): **Fogo Sagrado** (o Calor dura 24 h e alcança 7 passos), **Mãos de Luz** (a Cura custa 12 e sara pela metade quem está do lado), **Céu Generoso** (a Chuva custa 10, enche mais os arbustos, dá o dobro de água e adianta a roça 3 dias), **Trovão** (o Raio custa 10, abate o lobo e a onça mais longe e a árvore e a pedra rendem o dobro), **Ouvido Atento** (as orações esperam o dobro e cada uma atendida dá o dobro de Poder), **Olhos do Céu** (a névoa abre metade mais longe), **Sonhos Claros** (a Revelação custa 40 e vale com 15% da prática), **Ventre Abençoado** (mais filhos e o parto difícil pela metade), **Sentinela** (o fogo espanta a fera 2 passos mais longe e a mordida pega menos), **Mão na Terra** (a roça rende 20% mais e os arbustos dão fruta 30% mais depressa), **Temor Sagrado** (o povo segue as Vontades com mais força e ninguém entra em greve) e **Fé que Aquece** (sem sinais, a fé esfria só até 50, e a fé rende 20% mais Poder). O dom bondoso puxa o povo a te ver mais bondoso; o temido, mais temido.
- **Céticos que se convertem**: o cético junta sinais: um milagre visto de perto (um a cada 2 dias), a própria oração atendida, a cura no corpo, a pregação ouvida, o sonho da Revelação. Com 24 sinais e fé 65, vira devoto (a primeira conversão vai para a Crônica). O painel da pessoa mostra quantos sinais ela já viu.
- **O escolhido**: quem chega à fé inteira (100), com 16 anos ou mais, pode receber um poder (150 de Poder), no painel da pessoa ou em Deus → Escolhidos. A fé do escolhido fica perto de 90; se esfriar abaixo de 70, o poder vai embora. Um halo em cima da cabeça mostra quem é.
  - **Mãos que curam** (Curandeira ou Curandeiro): larga o que está fazendo e vai até quem está doente (saúde abaixo de 35) ou num parto difícil, e cura com as mãos (8 de Poder por cura, 40 de saúde); a oração é atendida.
  - **Palavra** (Profetisa ou Profeta): a cada 2 dias, de tardinha, prega ao pé do fogo, no lugar da história (quando está a até 15 passos do fogo, os primeiros 45 minutos da tardinha são dele): a fé de quem ouve sobe, o cético vê um sinal e cada ouvinte dá 1 de Poder.
  - **Luz** (Guardiã ou Guardião): brilha como fogo aceso, de dia e de noite: lobo e onça não chegam perto e quem está do lado se aquece.
- **Bênção** (tecla Z, nível 2, 25 de Poder): por 2 dias, todo trabalho num lugar (6 passos) rende metade a mais (colher, pescar, caçar, cortar, construir, plantar), e a roça plantada ali dá metade a mais na colheita. O chão brilha verde e dourado enquanto dura.
- **A estátua** (Construir → Estátua, nível 3: 30 pedra e 10 madeira; uma no nível 3, duas no 4, três no 5): pronta, toque nela e escolha o milagre dela (400 de Poder), que acontece sozinho, para sempre (cada estátua tem um diferente):
  - **Fogo**: aquece 6 passos em volta, dia e noite, e fera nenhuma chega perto.
  - **Chuva**: a cada 8 dias, às 10 h, chama a Chuva sem gastar Poder.
  - **Cura**: todo dia às 6 h cura quem está mais fraco por perto, e parto perto dela nunca é difícil.
  - **Trovão**: quando lobo ou onça chegam a 10 passos, de noite, um raio cai sobre eles (um por noite).
  De manhã, quem tem fé vai rezar ao pé da estátua (sobe a fé e dá Poder). A **estátua com altar** (melhoria: 20 pedra e 6 tábuas) leva o milagre metade mais longe (a chuva, a cada 5 dias) e a reza vale o dobro.
- **Espécie nova** (nível 4, 1.500 de Poder cada, com o nome que você der): **um bicho** manso e dourado que pasta perto da aldeia, dá cria depressa e rende 14 de carne na caça; **um peixe** que enche rios e lagos (a pesca rende 35% mais); ou **uma árvore**: seis nascem perto da aldeia e dão fruta dourada o ano todo, até no inverno e na seca.
- **Saber de outra era** (nível 5, 2.500 de Poder cada; o povo inteiro sonha o mesmo sonho): **a roda** (o carrinho de mão: cada um carrega 40% a mais, e obras, caminhos e cercas saem 25% mais rápidos), **a escrita** (todos aprendem metade mais rápido, as histórias ensinam o dobro e as descobertas andam 25% mais depressa) e **a medicina** (o parto difícil cai à metade, a saúde volta metade mais rápido e a velhice chega mais tarde).
- **A janela de Deus** (o botão no painel de Deus, que mostra quanto falta para o próximo nível): abas **Níveis e dons** (a escada dos cinco níveis, o que falta, os dons e o nome), **Escolhidos** (os de agora, quem tem fé inteira, com um botão para cada poder) e **Grandes atos** (as estátuas, as espécies e os saberes, com o motivo quando ainda não dá).
- **Missões novas**, com Poder: chegar ao nível 2 (+6, na fase da família); converter um cético (+8) e chegar ao nível 3 (+8, nas descobertas); dar poderes a um escolhido (+10), consagrar uma estátua (+10) e criar uma espécie ou ensinar um saber (+15, na aldeia).
- **Com o jogo fechado**: a estátua continua fazendo o milagre dela, Deus sobe de nível, e o nome e o dom esperam você voltar (o jogo pausa e pergunta). Ninguém prega.
- **Na tela**: a estátua de braços erguidos, com a cor do milagre no nicho do pedestal e uma luz girando em volta da cabeça (sem milagre, o sinal de Deus pisca em cima, chamando o toque), as velas do altar, o halo do escolhido (verde de quem cura, branco da Palavra, dourado da Luz), a luz que ele e a estátua do fogo espalham na noite, o chão abençoado, as faíscas de quem trabalha na Bênção e de quem reza, as árvores de fruta dourada e o bicho criado, dourado de pintas claras.
- **No som**: um acorde para o nível novo, o nome e o dom, e um sino para o escolhido, a conversão e a estátua consagrada.

**Etapa 12 · Povos e minas**

*Povos*
- **Três povos de fora**, além dos humanos do casal. Chegam em **caravanas** (um casal, um filho e mais um ou dois adultos sem par), pedem para ficar, e o jogo pausa para você decidir. Cada povo tem o seu corpo, três dons e uma fraqueza:
  - **Elfos**, o povo da mata: esguios, de orelha pontuda. Vivem 150 anos, têm poucos filhos (40% da chance) e comem 15% menos. Dons: **Filho da mata** (colhe frutas 50% mais depressa), **Olho de arqueiro** (na caça, +20% de acerto e 1,2 passo a mais de alcance) e **Vista longa** (a névoa abre o dobro por onde passa). Fraqueza: não derrubam árvore.
  - **Anões**, o povo da serra: baixos, largos, barbudos (as anãs, de tranças). Vivem 110 anos, sentem 30% menos frio, carregam 30% a mais, comem 10% a mais e andam 12% mais devagar. Dons: **Mão de pedra** (quebra pedra e minera 60% mais depressa e acha 40% mais veio), **Ferreiro nato** (já nasce sabendo forjar, 60% mais depressa) e **Mestre de obra** (constrói 40% mais depressa). Fraqueza: não pescam.
  - **Povo-fera**, o povo do campo: gente de pelo, orelha de bicho e rabo. Vivem 50 anos, têm mais filhos (20% a mais), sentem metade do frio, andam 10% mais depressa. Dons: **Faro** (a caça arisca não os percebe, e cada bicho rende 3 de carne a mais), **Garras** (lutam sem lança, +25% de acerto, e a mordida dói a metade) e **Olhos da noite** (seguem trabalhando de tardinha e de noite). Fraqueza: comem 40% a mais.
  - **Humanos**: **Acolhedor** (a conversa com outro povo aproxima em dobro), **Versátil** (vivendo com outros povos, aprende 15% mais depressa) e **Sangue bom** (o filho mestiço vive os anos do povo que vive mais). Sem fraqueza. Num mundo só de humanos, nada disto mexe em nada.
- **A idade do corpo**: todo mundo é criança até os 12 e adulto aos 18. Depois, os anos de adulto se esticam até a velhice de cada povo: um elfo de 84 anos tem o corpo de um humano de 39. É a idade do corpo que decide a fase da vida, até quando se tem filho e par, e a velhice.
- **Quem vem primeiro** depende do terreno em volta do estoque: muita mata chama os elfos; serra e pedra, os anões; campo aberto, o povo-fera. A primeira caravana sai de 20 a 40 dias depois que o acampamento vira aldeia (ou a partir do ano 6, com 6 pessoas); as outras, a cada 90 a 150 dias, nunca no inverno. Quem é mandado seguir volta uma vez, 180 dias depois; mandado seguir de novo, só volta chamado.
- **O que trazem**: os anões, a mineração e a metalurgia (ensinam na chegada), três ferramentas de ferro, minério e carvão; os elfos, fruta seca e fresca e, para quem já usa a lança, o arco; o povo-fera, carne de caça e couro.
- **Deus chama** (nível 2, 300 de Poder, em Deus → Povos): a caravana do povo escolhido sai na manhã seguinte, mesmo no inverno. Serve para trazer quem foi mandado seguir, ou mais gente de um povo que já mora aqui.
- **Convivência** entre cada dois povos, de 0 a 100 (começa em 20). O dia a dia soma pouco e tem teto de 0,2 por dia para cada par de povos (0,3 quando um deles é humano): a conversa (+0,03; em dobro com um humano; quatro vezes quando alguém ensina ou consola), a história ao pé do fogo (+0,15), a pregação (+0,15) e cada mestiço vivo (+0,03 por dia). Os acontecimentos somam por fora do teto: as pazes (+0,5), a festa (+1, e mais com fogo grande e tambor), cada casal misto (+1) e cada filho mestiço (+4). A briga tira 3. Abaixo de 50, briga-se até 60% a mais entre os dois povos e os pares saem mais devagar; acima, o contrário. Abaixo de 15 o jogo avisa. Em 100, os dois povos viram um só, de uma vez por todas (a briga já não afasta): Crônica, festa e lembrança boa para todo mundo. Nos testes de 20 anos, a primeira união sai de 5 a 9 anos depois da primeira caravana; festa, pregação, casais e filhos mistos encurtam o caminho.
- **Mestiços**: o filho de dois povos tem o sangue pela metade de cada um, as cores de um dos pais, os traços na medida do sangue (a orelha pequena, um pouco mais baixo, a orelhinha de bicho), um dom de cada lado e o dom **Ponte**. Não herda fraqueza. O corpo (quanto vive, come, carrega) é a média. O sangue de fora se dilui: com um quarto ainda é mestiço; com um oitavo, é do povo da maioria de novo. Filho de pai e mãe do mesmo povo de fora ganha nome desse povo.
- **Na ficha de cada um**: o povo (passe o mouse e veja quanto vive), os dons e a fraqueza, e na lista do povo um rostinho ao lado do nome de quem não é humano. **Deus → Povos** mostra os quatro povos, quantos moram aqui, a convivência par a par e o botão de chamar.
- **Missões novas**, com Poder: acolher um povo (+8), ver um casal de povos diferentes (+6), ver nascer um mestiço (+10), ter os quatro povos (+12) e levar dois povos a viver como um só (+15).

*Minas e metais*
- **Duas descobertas novas**, na aba **Metais** das Descobertas: a **mineração** (pede a cerâmica; aprende-se quebrando pedra e cavando barro) e a **metalurgia** (pede a mineração; aprende-se trabalhando na mina). A Revelação serve para as duas. Os anões já chegam sabendo, e ensinam.
- **A mina** (Construir → Mina: 10 de madeira; tem que encostar na serra, em colina, montanha ou perto de pedras): com a Vontade **Mineração**, o povo trabalha em turnos de 2 horas lá dentro. Cada turno dá pedra (4) e, por sorte, 2 de carvão (45% dos turnos) e 2 de minério de ferro (30%). Dois mineiros por vez. Pedra que não acaba mais.
  - **Mina funda** (12 de madeira e 8 tábuas): três mineiros; minério em 50% dos turnos, e aparecem a prata (14%), o ouro (4%) e as pedras preciosas (2%).
  - **Mina de veio** (10 tábuas e 10 de pedra, pede a metalurgia): quatro mineiros, 5 de pedra por turno; prata 20%, ouro 10%, pedra preciosa 7%.
  Com o estoque cheio de tudo, a mina rasa para sozinha; a funda segue devagar, atrás do que brilha.
- **A ferraria** (Construir → Ferraria: 20 de pedra e 10 de madeira, pede a metalurgia): no Ofício, de 2 de minério e 1 de carvão sai uma **ferramenta de ferro**, em 110 minutos. Forja quem é ferreiro nato (os anões) ou quem tem Ofício no nível 4. A **ferraria com ourives** (10 de pedra e 8 tábuas) forja 30% mais depressa e faz **joias**: uma de cada 1 de prata ou de ouro.
- **Ferramenta de ferro**: o trabalho rende 45% a mais (com a de pedra, 20%) e, com o machado, 90% (60%); gasta um terço; na luta, +10% de acerto e a mordida pega 20% menos. Quem está sem ferramenta pega primeiro a de ferro, e quem passa pelo estoque troca a de pedra (a de pedra ainda boa volta para o estoque).
- **O que brilha**: prata, ouro e pedras preciosas são **oferenda** (de manhã, quem reza ao pé da estátua leva uma: 8, 20 e 40 de Poder; uma por estátua por dia; com ourives e gente ainda sem joia, a prata e o ouro ficam primeiro para ele), **moeda** (o mascate aceita, e é com isso que se paga primeiro: 5, 10 e 14 por peça) e **joia** (cada adulto usa uma: +3 de humor para sempre).
- **Missões novas**: abrir uma mina (+6), erguer uma ferraria (+6), forjar a primeira ferramenta de ferro (+8) e achar ouro (+10).

*Ajustes de uso (pedidos de quem joga)*
- **A ficha da pessoa numa caixa própria**: tocar em alguém (no mapa, na lista, numa oração) abre a ficha, sem abrir a lista do povo. No alto, o que ela faz, o estado, a oração, os traços, o povo e os dons; depois as barras, a família, as habilidades e as lembranças. Setas para a pessoa anterior e a próxima.
- **Seguir alguém**: o botão Seguir da ficha (ou dois toques na pessoa) prende a câmera nela. Arrastar o mapa, andar com o teclado, Esc ou escolher outra pessoa solta. O zoom não solta.
- **Posicionar a obra antes de confirmar**: o toque só posiciona o fantasma. Dá para tocar em outro lugar, arrastar o fantasma, ajustar com as setas, e só então Confirmar (Enter) ou Cancelar (Esc). Se o lugar não serve, a faixa diz por quê.
- **Mudar uma obra de lugar**: toque na obra pronta → Mudar de lugar, posicione e confirme. O lugar novo fica reservado; o povo desmonta a obra (35% do trabalho de erguer), leva três quartos do material e ergue de novo lá (60% do trabalho; o quarto que falta sai do estoque). É a mesma obra: nível, moradores, tudo. Roça e curral não mudam de lugar.
- **Demolir**: toque na obra pronta → Demolir (pede confirmação). O povo desmonta e metade do material volta ao estoque. Dá para desistir antes de acabar.
- **A lista do povo para vila grande**: busca por nome, ordem (idade, nome, quem precisa de ajuda, humor) e cartões de uma linha quando passa de 16 pessoas.
- **A volta depois de muito tempo fora ficou rápida**: 300 dias com 30 pessoas levavam 1 minuto e 40 segundos de cálculo; agora, 2 segundos (com 60 pessoas, de 4 minutos para 3 segundos). O jogo aberto anota todo dia a **memória da aldeia**: quanto de cada coisa ela costuma guardar por boca em cada estação, e em que ritmo aprende e constrói. Com o jogo fechado, quase todos os dias são **resumidos**: o calendário, a família (idade, gravidez, parto, pares, as noites de visita) e Deus (fé, Poder, níveis, a reza da manhã) andam de verdade, hora a hora, e o trabalho do dia entra pela memória: o estoque volta ao nível de sempre (nunca abaixo de 30 dias de comida), as habilidades e as descobertas andam, a obra marcada fica pronta. As últimas 4 horas, e alguns dias pelo meio enquanto o aparelho der conta, são simulados por inteiro, para o povo estar onde a hora pede. **Entrar agora** para o cálculo onde estiver. Em aparelho lento, o que não couber no tempo vira dia resumido.
- **Tom do mundo** (menu ≡, no lugar da chave das noites picantes): **Leve** (sem noites picantes), **Picante** (o de sempre: insinuado) e **Adulto (+18)**: o par fala de desejo sem rodeio, a Crônica diz quem transou com quem, e briga de adulto tem palavrão. Em qualquer tom, só entre adultos (18 anos de verdade), nunca entre parentes; nenhuma cena é descrita nem desenhada.
- **Na tela**: os três povos e os mestiços com corpo próprio (adultos e crianças), a ferraria com a brasa que pulsa e solta fagulha quando alguém forja, a mina nos três níveis com o lampião aceso quando há gente dentro, a obra sendo desmontada com contorno vermelho e um X, o lugar reservado com as setas, e vinte ícones novos.
- **No som**: a bigorna, a picareta, a caravana chegando, a oferenda e o acorde de dois povos virando um.

**Etapa 13 · Memória**

*Os mortos*
- **O corpo espera.** Quem morre já não vira cova na hora. O corpo fica onde caiu até alguém ver (a 10 passos de alguém de 7 anos ou mais, ou a 14 do estoque). Um adulto (16 anos ou mais, com saúde) vai buscar e leva no ombro para junto do fogo, onde ele fica numa esteira, entre duas velas. Se ninguém vê em 3 dias, não há velório nem cova: a família fica com "Não pôde se despedir" (−8 de humor por 20 dias) e o luto dura o dobro.
- **O velório**: à tardinha (das 17 às 21 h) do dia em que o corpo chega ao fogo, ou do dia seguinte se chegou tarde, vem todo mundo de 5 anos ou mais, a família primeiro, e cada um diz a sua despedida. A criança pergunta se ela não vai acordar; o elfo diz "Vira árvore"; o anão, "Pedra sobre pedra"; o povo-fera, "Corre livre". A família fica uma hora; os outros, meia. Quem velou ganha "Velou quem partiu" (+2), +1 de fé, e sofre o luto pela metade do tempo que faltava. Nessa noite não há história ao pé do fogo.
- **O enterro**: na manhã seguinte (das 6 às 17 h), alguém leva o corpo e abre a cova (45 minutos). Sem cemitério marcado, o povo escolhe um canto fora da aldeia (de 7 a 22 passos do estoque, em chão livre e longe da água) e põe ali um marco. As covas se abrem em fileiras em volta dele, com um passo de folga entre uma e outra.
- **Cada povo do seu jeito**: o humano, uma estaca com uma vela; o elfo, um monte de terra em que nasce uma árvore depois de 20 dias; o anão, uma laje (2 de pedra do estoque); o povo-fera, uma estaca com penas, e os uivos de todos eles na hora em que o velório acaba. O mestiço segue o sangue que tem mais. Quem tinha par de outro povo leva os dois ritos, e isso aproxima os dois povos (+1,5 de convivência).
- **As visitas**: nos dias 5, 10, 15 e 20 depois do enterro, os dois mais chegados voltam com flores (das 7 às 16 h; quem tem 7 anos ou mais). Quando faz um ano, e todo ano depois, vai a família inteira. Quem não deixou família é visitado pelo amigo mais próximo. A visita deixa flores na cova por 6 dias (e uma fruta de oferenda por 3, se há 10 ou mais no estoque), dá "Levou flores a quem partiu" (+3), +1 de fé e encurta o luto em 4 dias.
- **O dia dos mortos**: no último dia do outono, das 15 às 18 h, a aldeia (com 4 pessoas ou mais e ao menos uma cova) vai junto ao cemitério, cada um com uma vela. Vale "Lembrou os que partiram" (+5 por 6 dias), +2 de fé e 10 dias a menos de luto, aproxima os povos (+1), e de noite cada cova fica com uma luz acesa por 6 horas. Nessa noite, a história da roda é sempre um conto de Deus.
- **O cemitério** (Construir → Cemitério: 4 de madeira; o botão aparece depois do primeiro inverno ou da primeira morte, e some quando já há um): serve para você escolher o lugar antes que o povo escolha. Toque nele para ver quem está enterrado. Melhorado para **cemitério cercado** (20 de madeira: uma cerca baixa em volta das covas e um portal), a visita e o dia dos mortos valem metade a mais.
- **Tocar numa cova**, ou em quem espera o enterro, abre a ficha de quem morreu: onde está, como foi enterrado, se foi velado, se há flores, e quem volta para visitar. O botão **Ver a cova** leva a câmera até lá.
- **Com o jogo fechado** não há velório: quem morre é enterrado sem cerimônia, no cemitério se houver. As covas de antes da 0.13 continuam no mapa, como covas antigas.

*A História de Deus*
- **O que você faz de grande vira conto**, se alguém de 5 anos ou mais vê de perto (a até 12 passos; o que vale para a aldeia inteira, todos veem): a cura de quem estava mal, a chuva que acaba com a seca, o calor na nevasca, o raio na fera, o raio em gente (o castigo), a revelação em sonho, o nome, o escolhido, a estátua consagrada, a espécie criada, o saber ensinado, o povo chamado, a resposta no rito, a promessa cumprida ou quebrada, e o silêncio (alguém rezou, não foi atendido e morreu de fome, sede ou frio). Sai no máximo um conto novo de cada tipo a cada 240 dias, e a aldeia guarda até 18.
- **Quem viu conta**: nas noites de história, 4 vezes em 10 a história é um conto (o que faz mais tempo que não se ouve; o mesmo só volta à roda depois de 20 dias). Quem ouve passa a saber e ganha fé: +1,5 se é conto de cuidado, +0,9 se é de espanto ou de medo (e o de medo deixa "Ouviu um conto de dar medo", −2 por um dia). Para o cético, cada conto ouvido vale um sinal (dos 24 que ele precisa ver).
- **Quem só ouviu muda um detalhe**: metade das vezes, ao recontar, o conto **cresce** (como foi → aumentado → lenda: a cura vira ressurreição, a chuva vira quarenta dias) ou **puxa para o jeito como o povo te vê**: com o alinhamento abaixo de −15, os contos vão virando contos de medo; acima de +15, de cuidado. A abertura diz de onde veio: "Eu vi com estes olhos", "Minha mãe contava que", "Dizem os antigos que".
- **O tom do conto**: a cura, a chuva, o calor, o sonho, a espécie e o saber nascem contos de cuidado; o castigo e o silêncio, de medo; a resposta do rito e a promessa, do jeito que foram. Os outros (o raio na fera, o nome, o escolhido, a estátua, o povo chamado) nascem com o tom de como o povo te vê: de medo com o alinhamento abaixo de −15, de cuidado acima de +15, de espanto no meio.
- **A criança que cresce vendo e ouvindo**: até os 12 anos, cada conto de medo ou de cuidado que a criança vê nascer (a partir dos 5) ou ouve contar (a partir dos 3) fica marcado. Aos 12, com 3 ou mais de um tom (e uma vez e meia os do outro), ela fica **temente** (a fé não esfria abaixo de 50, obedece mais às Vontades, −3 de humor) ou **confiante** (a fé assenta 10 pontos acima, sobe 20% mais depressa, +3 de humor). É para a vida toda, e aparece na ficha. É assim que o Deus temido ou bondoso atravessa gerações.
- **Deus → Memória** mostra cada conto: como o povo conta hoje, o que foi de verdade, quantas vezes foi contado, quantos sabem e quantos viram, o tom e o tamanho. Conto que ninguém vivo sabe contar fica apagado na lista. A ficha de cada um lista os contos que a pessoa sabe e de onde vieram (viu, ouviu de quem viu, ouviu dos antigos).

*A erva-do-sonho e o rito*
- **A erva** cresce em três canteiros na mata, perto da água, de 9 a 32 passos do estoque. Com Deus no nível 2 e três adultos na aldeia, quem passa a 4 passos de um canteiro acha (se ninguém passa em 60 dias, o melhor caçador acaba achando). O jogo pausa e pergunta o que você diz: **abençoar** (cada roda dá 1 de fé a mais, e o povo te vê mais bondoso), **deixar com o povo**, ou **proibir** (ninguém colhe, o povo te teme mais, e quem já se apegou sente falta). Dá para mudar depois, em Deus → Memória.
- **O rito**: a cada 15 dias, num dia calmo (sem fera, nevasca, tempestade, festa nem morto por enterrar), quem conduz convida de manhã até 5 adultos, os de mais fé primeiro, com um pouco de acaso. Conduz o profeta, se houver; senão, o adulto mais velho com fé 30 ou mais. Ele vai colher uma folha; duas horas antes de escurecer os convidados largam o trabalho e vêm para o fogo; das 18 às 21 h sentam em roda, no lugar da história, cada um por uma hora, e de vez em quando alguém diz o que vê. Com chuva na hora, fica para dali a três dias.
- **Só adulto senta na roda**: 18 anos de verdade ou mais, com saúde 50 ou mais, e nem grávida nem quem carrega bebê.
- **O que a roda dá**: +2 de fé, "Viu coisas na fumaça do rito" (+4 por 3 dias), dois sinais para o cético e, para a aldeia, 3% da prática da descoberta em andamento. **O que cobra**: nas 14 horas seguintes, o trabalho de quem sentou rende 20% menos; uma vez em dez a viagem é ruim ("Teve uma visão ruim no rito", −6 por 3 dias, e 6 de saúde a menos). Quem já sentou em 4 rodas está **apegado**: a visão ruim sai três vezes em dez, cada roda tira mais 3 de saúde, e 15 dias sem rito dão "Sente falta do rito" (−4). O costume esfria sozinho: uma roda a menos na conta a cada 30 dias.
- **A pergunta**: no máximo uma a cada 30 dias, 45 minutos depois de a roda abrir, alguém olha para cima e pergunta. O jogo pausa e mostra três respostas e o silêncio. São dez perguntas, e qual sai depende do que a aldeia vive: "Para onde foi Fulana?" (alguém morreu há menos de 30 dias; pergunta um parente), "Vai faltar comida?" (menos de 10 dias de comida), "O inverno vai ser duro?" (no outono), "A fera vai voltar?", "Os que vieram de fora também são teus?" (dois povos se estranhando), "Você existe mesmo, ou é só a fumaça?" (um cético na roda), "Meus filhos vão viver mais do que eu?" (quem tem filho pequeno), "O que tem depois da morte?" (um idoso), "Por que você fez a gente?" e "O que você quer de nós?".
- **As respostas**: uma de cuidado (mais fé, e o povo te vê mais bondoso: de +6 a +10), uma do meio (pouca fé e um efeito prático: o povo junta comida ou lenha 10% mais depressa por 10 dias, todo trabalho rende 5% a mais por 5 dias, a descoberta anda 3%, ou a roda fica em paz) e uma de medo (fé na hora, e o povo te teme mais: de −10 a −15; "Escute o trovão" faz cair um raio perto do fogo). Três são **promessas** ("Não vai faltar", "Eu vigio por vocês", "Eu aqueço vocês"): cumprida em 30 dias (a do frio, até o fim do inverno), +3 de fé para todos e o conto "A promessa cumprida"; quebrada (alguém passou fome de verdade, a fera matou, o frio matou), −6 de fé, −10 no alinhamento, "Viu Deus faltar com a palavra" por 10 dias e um conto, "A promessa quebrada". O silêncio tira 2 de fé da roda e deixa quem perguntou sem resposta.
- **A resposta vira conto**, e o povo repete; para o cético que estava na roda, vale três sinais. Em Deus → Memória ficam a lei do rito, quando sai o próximo, as promessas de pé e quantos estão apegados.
- **Com o jogo fechado** não há rito, nem pergunta, nem dia dos mortos. Pergunta que ficou esperando vale como silêncio.
- **Missões novas**, com Poder: ouvir o povo contar um feito seu (+6), ver um velório (+6), ver alguém levar flores a uma cova (+5), responder a uma pergunta do rito (+8), passar um dia dos mortos com o povo (+8) e ver um conto ser contado por quem não viu (+8).

*Na tela e no som*
- O corpo na esteira entre duas velas e no ombro de quem leva; as covas de cada povo, a árvore do elfo crescida, as flores e a oferenda; a vela na mão de quem vela e de quem lembra, e a flor na mão de quem visita; a luz de cada cova na noite do dia dos mortos; o marco e o portal do cemitério, com a cerca em volta das covas; a erva-do-sonho no mato; a fumaça lilás do rito e a roda balançando devagar; a fumaça dourada, lilás ou vermelha da resposta. Oito ícones novos.
- O sino do velório, a terra da cova, as flores, os sinos do dia dos mortos, a flauta grave do rito, a pergunta, as três respostas e o conto novo.

**Etapa 14 · Sociedade**

*Antes de tudo, a correção da IA*
- **Quem leva comida nas costas come dela.** Com fome de verdade (abaixo de 25) e a mais de 12 passos de casa, quem carrega caça, peixe ou fruta para onde está e come da carga, uma porção de cada vez, até a fome chegar a 60; o resto segue para o estoque. E quem fica sem energia nenhuma a mais de 10 passos de casa dorme ali mesmo, em vez de atravessar a noite andando. E quem está a mais de 20 passos de casa, com fome e comida no estoque, só para numa fruta do caminho de volta (antes ia de arbusto em arbusto, cada vez mais longe, e podia morrer de fome com o estoque cheio). Era o defeito da caçadora que morreu de fome com carne nas costas e o estoque cheio: no mundo em que isso acontecia, jogado do mesmo jeito por 16 anos, ninguém mais morre.

*A índole*
- **Cada pessoa tem índole**, em três eixos de −100 a 100: a **mão** (generosa ou egoísta), o **gênio** (manso ou violento) e a **palavra** (franca ou mentirosa). Quase todo mundo nasce do lado bom, mas em toda geração nasce gente com um defeito, e o filho puxa um pouco aos pais. A ficha mostra só o que se destaca (30 ou mais para um lado: "Generoso", "Violenta"; de 65 em diante, "Muito generoso"), e o rótulo diz o que mais pesou até ali.
- **A vida empurra**: cada dia com a lembrança da fome fecha a mão; cada dia depois de uma bronca na frente de todos azeda o gênio; até os 14 anos a criança vai puxando aos pais; a fé (60 ou mais) conserta devagar o que está torto, mas só com um Deus que não é temido (com um Deus temido, a fé ensina a esconder, e a palavra piora); os contos de cuidado amansam e abrem a mão, os de medo ensinam a mentir; o líder é exemplo para quem tem de 12 a 21 anos, para o bem e para o mal. A natureza pesa mais que a criação: o que mais muda alguém é a resposta ao que fez. A pena cumprida melhora 8 pontos, o castigo na medida 10, o perdão 6. Ficar sem resposta piora, e apanhar, ser condenado sem culpa ou levar um castigo pesado demais azedam o gênio.

*Os crimes*
- **Oito coisas que não se faz**, em três gravidades. **Leve**: pegar comida a mais do estoque, fugir do trabalho, mentir (jogar em outro a culpa do que fez, ou inventar coisas de um desafeto). **Médio**: roubar do estoque (uma joia, uma ferramenta; de noite) e bater. **Grave**: ferir de propósito, pôr fogo numa obra (de noite) e matar.
- **Quem faz**: só quem tem a índole torta naquele eixo, e na hora ruim: com fome, com o estoque no fim, de mau humor, humilhado, brigado com alguém. Quem tem a mão aberta, o gênio manso e a palavra franca nunca tenta. O leve começa aos 12 anos; roubar e bater, aos 14; o grave, aos 16. A violência é sempre contra um desafeto (alguém com quem a pessoa está brigada), que tem 14 anos ou mais; ferir pede que já tenha havido surra entre os dois, e matar, duas; e quem bate esfria três dias antes de levantar a mão de novo. Nos primeiros 40 dias do mundo, e em aldeia com menos de 6 pessoas de 12 anos ou mais, não há crime.
- **Você vê tudo; o povo só sabe o que alguém viu.** Testemunha é quem está acordado a até 6 passos (de noite, 3). O par e o parente próximo de quem fez se calam (a não ser que a vítima também seja deles), e o mentiroso amigo de quem fez, também; criança conta tudo. No mapa, um olho aparece sobre o que só você viu e uma máscara sobre o que o povo viu; a aba **Deus → Sociedade** lista tudo, com o que o povo sabe de cada caso.
- **O fogo posto**: a obra de madeira e palha (barraca, armazém, jirau, moquém, marcenaria, tecelagem, curral) arde por uma hora e meia, e quem dormia dentro acorda e sai. O jogo pausa e pergunta: **mandar a Chuva**, que apaga na hora, ou **deixar com o povo**. Com o povo, quanto mais gente acordada por perto (até 14 passos), maior a chance de apagarem, gastando 4 de água (com cinco pessoas, 9 em 10; sem água no estoque, um terço disso); a janela diz a chance. Se não apagam, a obra se vai (no armazém, com 30% da comida) e quem morava ali fica sem teto.
- **O que ninguém resolve esfria**: o leve em 12 dias, o médio em 30, o grave em 90. Fica por isso mesmo, e quem fez e ficou sem resposta piora.

*O julgamento ao pé do fogo*
- **O leve se resolve com uma bronca** do líder na frente de todos, às 17 h, sem reunir ninguém.
- **O médio e o grave vão a julgamento**: às 17 h o líder (sem líder, o adulto mais velho) chama o povo de 12 anos ou mais para o pé do fogo. Esperam quem falta por 50 minutos; com menos de 3 pessoas de 16 anos ou mais além do acusado, fica para outro dia. Aberto, ouve-se por 35 minutos (o juiz diz por que estão ali, quem viu fala, o acusado responde) e quem tem 16 anos ou mais decide. Nessa noite não há história. Com festa, velório, fera, nevasca ou tempestade, o julgamento espera.
- **O veredito não é a verdade**: quem viu pesa o que viu; quem não viu pesa o que ouviu, o quanto gosta do acusado, se é da família dele ou da vítima, a ficha de quem já foi julgado, se chegou há menos de um ano e meio e, com mais de um povo na aldeia, a convivência (baixa, a culpa cai em quem é de fora). Um líder mentiroso atiça o preconceito; um líder franco dá mais peso a quem viu.
- **Quando ninguém viu** mas o estrago aparece (o roubo, a surra em quem dormia, o fogo), o povo desconfia de alguém: de quem tem ficha, de quem chegou há pouco, de quem é de fora, de quem estava brigado com a vítima. Quem fez deixa pista, mas nem sempre basta: às vezes o julgado é outro. E quem fez pode mentir e jogar a culpa num desafeto.
- **As penas**: trabalho para todos (roubo, 3 dias e devolver o que pegou; surra, 4; ferimento, 10; incêndio, 12), em que a pessoa rende 35% a mais e não vai a festa, ou **exílio** (quem matou, e quem faz algo grave já tendo duas marcas na ficha). O líder violento sobe um degrau; o muito manso troca o exílio por trabalho, menos para quem matou. Quem é mandado embora parte ao amanhecer.
- **Inocente condenado**: a Crônica avisa (só você sabe quem foi), ele e quem viu a verdade ficam descontentes e, se a pena é o exílio, o jogo pausa e pergunta: mostrar a verdade em sonho, ou deixar.

*Você castiga, mostra a verdade e perdoa*
- **Seis castigos**, pela ficha de quem fez ou pela aba: aviso em sonho (5 de Poder), marca na testa por 20 dias (10), doença leve de 4 dias (12), raio por perto (15), exílio (25) e morte (40).
- **A medida**: para o leve, o sonho ou a marca; para o médio, a marca, a doença ou o raio por perto; para o grave, o raio por perto, o exílio ou a morte. Se o povo já cobrou, a medida é só o aviso. **Na medida**, ensina (a índole de quem fez melhora 10 pontos), a fé sobe (+8 em quem levou; +3 em todos, se foi à vista) e nasce o conto "A medida de Fulano". **Leve demais**, quem sofreu esperava mais (−3 de fé na família da vítima). **Pesado demais**, vira medo: −5 no alinhamento por degrau a mais, descontentamento em todos (mais na família), o conto "A mão pesada", e quem levou fica mais violento. **Em quem não fez nada**: −10 no alinhamento, −12 de fé em quem sabia (−25 na família), gente pensando em ir embora e o conto "O castigo sem culpa".
- **Limites**: ninguém com menos de 12 anos é castigado; de 12 a 15, só o aviso ou a marca.
- **Mostrar em sonho** (8 de Poder): o líder, ou quem tem mais fé, sonha com o que aconteceu. O povo passa a saber quem foi, o inocente é solto (e volta, se já tinha partido) e o caso vai a julgamento.
- **Perdoar diante de todos** (6 de Poder): acaba a pena, +15 de fé em quem foi perdoado, a índole melhora 6 pontos e o povo te vê mais bondoso (de +4 a +6 no alinhamento, conforme a gravidade). Se é coisa média ou grave e ninguém pagou ainda, a família da vítima acha cedo demais (−4 de fé). Vira o conto "O perdão de Fulano".

*O líder*
- **Com 5 adultos, o povo escolhe quem fala por todos**, entre quem tem 20 anos ou mais. Cada um de 16 anos ou mais pesa o que o seu povo respeita: o humano, quem é querido; o elfo, quem viveu mais; o anão, quem mais sabe fazer; o povo-fera, quem tem mais força. Mão aberta e palavra franca ajudam; ficha de julgado atrapalha muito.
- O líder chama o julgamento, dá a bronca, sonha a verdade e, se você deixar, marca as obras. A voz só muda quando outro passa a ter 25% mais respeito (o povo confere todo começo de ano), ou quando o líder morre, é condenado ou vai embora; a vaga se preenche na tardinha seguinte. Um cocar marca o líder no mapa.
- **Líder de índole ruim** desgasta a aldeia um pouco por dia (até um limite: sozinho não manda ninguém embora), pesa a mão ou atiça o preconceito no julgamento e é mau exemplo para os jovens.

*Obras por conta própria*
- Três modos, em Deus → Sociedade: **O povo decide** (o padrão: o líder marca sozinho, se o custo cabe em 40% de cada material do estoque), **O povo pede** (o líder aponta o lugar, que fica no mapa com um ponto de interrogação, e espera o seu sim por 5 dias; "Agora não" vale por 10) e **Só eu marco** (como era até a 0.13).
- **O que o líder vê que falta**, de manhã (sem líder, quem olha é o adulto mais velho): **casa** (gente sem lugar há 2 dias ou mais, contando as casas marcadas e as melhorias em andamento), **fogueira** (casa a mais de 9 passos de qualquer fogo), **armazém** (comida estragando dia após dia), **cerca** em volta da roça (bicho entrou nos últimos 12 dias) e **mina** (pedra abaixo de 6 por 2 dias).
- **Numa aldeia grande, várias obras ao mesmo tempo**: uma, e mais uma a cada 12 adultos, até 8 (no modo O povo pede, uma pergunta de cada vez). Com obras demais por fazer, inclusive as suas, o líder espera.
- **Falta casa e há uma barraca avançada** que pode virar a casa grande do lugar (com 2 lugares a mais, pelo menos): o povo melhora a barraca em vez de erguer outra.

*Quem não está contente*
- **O descontentamento** de cada um (16 anos ou mais) sobe a cada dia ruim: sem casa (+3), fome (+3), frio (+2), a vida ruim (humor abaixo de 25, fora do luto: +2), povos que se estranham (+2), injustiça (+4), e ainda líder de índole ruim e medo de Deus (alinhamento abaixo de −30), que desgastam até 45 e param. Num dia sem nada disso, cai 1,5 (2,5 com bom humor). A ficha diz quando alguém "não anda contente" (30) e quando "pensa em ir embora" (60), e por quê.
- **O aviso**: em aldeia com 10 adultos ou mais, quando 4 chegam a 60, juntam-se em volta de quem está pior (até 8, e nunca mais de 45% dos adultos; o par vai junto se também não está contente, quem ama alguém contente fica, e os filhos de menos de 14 anos vão com os pais) e avisam que vão embora. O jogo pausa. Você tem um dia para responder: **deixar ir**; **convencer com um milagre** (25 de Poder: ficam, com +10 de fé, mas o motivo continua); ou **prometer** o que eles pedem (casa para todos em 12 dias, comida para 5 dias em 10, lenha e fogo em 8, uma festa em 8, paz entre os povos em 15, justiça em 6, outro líder em 6, um Deus mais brando em 15).
- **Promessa cumprida**: ficam, +8 de fé, o povo te vê mais bondoso e nasce o conto "A palavra cumprida". **Quebrada**: −6 de fé em todo mundo, −4 no alinhamento, o conto "A palavra quebrada", e eles partem na hora, de mal com a aldeia. Sem resposta, vão.

*A vila de fora*
- **Eles vão de verdade**: levam duas porções por cabeça (até um quarto do estoque), andam de 40 a 72 passos e fundam outra vila, que aparece no mapa (três cabanas e um fogo) e ganha nome. Quem foi sai da lista do povo, mas continua na árvore da família e tem ficha ("Foi embora com o grupo. Vive em Jurema"). Quem ficou sente a falta do parente e do amigo. Depois da partida, o povo leva um mês sem pensar nisso de novo.
- **A vila vive resumida**, sem simular ninguém: tem um bem-estar que sobe e desce com as estações, nascem filhos, os velhos morrem, e tem um **laço** com a aldeia (de mal, distante, em paz, de bem). A cada 12 a 24 dias, fora do inverno, acontece algo:
  - **Troca** (laço de −20 para cima): dois vêm pela trilha, trazem de 6 a 12 do que falta aqui e levam do que sobra. Aproxima.
  - **Casamento** (laço 15 ou mais, um por ano): alguém sem par daqui vai morar lá, ou alguém de lá vem morar aqui. Nunca entre parentes próximos. Aproxima mais.
  - **Briga** (laço −25 ou menos): de madrugada, levam 15% da comida do estoque (até 25 porções; a metade, se há armazém).
  - **Outro deus** (depois de um ano, se saíram por medo ou por injustiça, com pouca fé, ou se estão de mal): passam a rezar para outro nome. Um milagre seu a até 9 passos de quem vier de lá os traz de volta.
  - **A volta** (no aperto, ou de bem depois de dois anos): até 6 adultos, com os filhos, inclusive os nascidos lá, pedem para voltar. O jogo pausa: receber (o povo te vê mais bondoso) ou mandar seguir (o laço cai muito).
- **Você pode** mandar um **presente** (20 porções; aproxima; um a cada 10 dias) ou **trovejar** sobre ela (15 de Poder: um ano sem briga, o laço cai e o povo daqui te teme mais).
- **O exilado** vai bater na porta da vila de fora, se ela existe; senão, some no mundo. Tem ficha do mesmo jeito.

*O que pesava no jogo*
- **Mais calmo**: em 1x, um dia leva 4 minutos (até a 0.13, 1 minuto): dá tempo de ver o povo viver. Pausa, 1x, 2x, 5x, 10x, 20x e 50x. Com o jogo fechado, a conta é a de antes, e os nomes das opções dizem quanto passa (1 hora fora: 6 dias, 15 dias, 30 dias ou um ano).
- **Aldeia grande sem travar**: com 300 pessoas, cada passo da simulação leva cerca de 4 ms no computador (era 16). Quem volta para o acampamento, vai a uma obra ou procura lugar perto do fogo busca o caminho na direção do alvo, em vez de varrer o mapa em roda; as contagens do povo (quem leva bebê, quem precisa de roupa, quem faz o quê, quem está em cada canto do mapa) são feitas uma vez por passo; os bichos só olham quem está perto; a tela monta só quem está à vista, e o balão de fala de quem está fora dela nem é posto no lugar.
- **Um tanto de tempo por quadro**, como nos jogos de cidade: se a aldeia é grande demais para a velocidade pedida, o mundo anda o que dá, a tela segue fluida, e o botão da velocidade fica laranja, avisando que o mundo não está acompanhando.
- **A Crônica sem excesso de romance**: guarda o primeiro par da aldeia (os outros passam num aviso), as separações viram aviso, e numa aldeia de mais de 40 pessoas o nascimento não pausa o jogo nem vai um a um para a Crônica; todo começo de primavera ela conta o ano que passou (quantos nasceram, quantos morreram, quantos são).
- **A tela de início** mostra o mundo salvo pela data e por quantas pessoas vivem, sem os nomes.

*O resto*
- **Com o jogo fechado** não há crime, julgamento, aviso nem partida; a vila de fora só anda nos números.
- **Missões novas**, com Poder: ver o povo escolher quem fala por todos (+6), ver um julgamento ao pé do fogo (+6), castigar alguém na medida certa (+8), perdoar alguém diante de todos (+6) e deixar o povo marcar uma obra por conta própria (+6).
- **Na tela**: a aba Sociedade (o líder, os modos de obra, os pedidos, quem não está contente, a vila de fora e tudo o que você viu), a índole e a pena na ficha, a janela de castigar com as seis medidas, a janela do aviso, a do fogo e a da volta; no mapa, o cocar do líder, a marca na testa, o olho e a máscara sobre o que acabou de acontecer, a balança sobre o fogo do julgamento, as chamas e as cinzas da obra queimada, o pedido do líder com o ponto de interrogação, e a vila de fora com a fumaça do fogo. Dez ícones novos.
- **No som**: o que só você viu e o que o povo viu, o golpe, o fogo posto e o fogo apagado, o chamado do julgamento e os dois vereditos, a bronca, cada castigo, o perdão, a verdade em sonho, o líder escolhido, o pedido, o aviso de partida, a vila nova e o saque.

**Etapa 15 · Gente viva**

*Gostos*
- **Cada pessoa tem gostos**: a comida de que mais gosta e a que não desce, o trabalho de que mais gosta e o que detesta, e a estação preferida. O mesmo mundo dá sempre os mesmos gostos. A comida, o trabalho e a estação de que gosta puxam a um dos pais em pouco mais de um terço das vezes; e o povo pesa: o elfo tende à fruta (para comer e para colher), o anão à carne e ao ofício, o povo-fera à carne e à caça.
- **O trabalho de que gosta** pesa 15% a mais na hora de escolher o que fazer e rende 10% a mais; o que detesta pesa 20% a menos. A necessidade e as suas Vontades continuam mandando mais: ninguém deixa a aldeia sem água porque não gosta de buscar.
- **Comer o que gosta**: com comida para 6 dias ou mais no estoque, cada um come primeiro a sua preferida, se há (peixe, carne, feijão e mandioca, com fogo aceso). Comer o que gosta alegra o dia (+4 de humor); o que não desce, −2. Com o estoque curto, ninguém escolhe.
- **A estação preferida** deixa o humor 2 pontos acima nos dias dela.

*O jeito: o povo aprende com o que dá certo*
- **Cada um tem um jeito para cada trabalho**, de −1 a 1. Começa no gosto (+0,3 no que gosta, −0,3 no que detesta) e no exemplo de casa (a metade do jeito dos pais).
- **O resultado ensina**: quem entrega no estoque o que trouxe (lenha, pedra, fruta, água, peixe, barro, caça, colheita) tem o que rendeu por hora comparado com a média da aldeia naquele trabalho. Acima da média, o jeito sobe 0,05; abaixo, desce 0,04; quem volta sem achar nada perde 0,02. Mordido por lobo ou atacado por bicho no meio do trabalho, perde 0,25: aprende a evitar.
- **O jeito pesa** até 25% na escolha do que fazer, para mais ou para menos. Com o tempo, cada um tende a fazer mais o que faz bem e a fugir do que deu errado.

*Pensamentos*
- **A ficha diz o que a pessoa está pensando, e por quê**: o que mais pesa naquela hora. A sede, a fome (com a comida que queria), o frio, o cansaço, a dor; a saudade de quem morreu há pouco; a condenação sem culpa, a mágoa do julgamento, a marca na testa, a surra; o crime que viu ("conto ou não conto?"); a vontade de ir embora; o par que não tem (só de 18 anos para cima; às vezes, alguém que não sai da cabeça, sempre adulto e nunca parente); a casa que falta; o filho que vai nascer; a brincadeira e as perguntas da criança; o trabalho que detesta ou de que gosta; o combinado com alguém; a oração atendida ou sem resposta; o milagre visto; a mordida do lobo; a tentativa que quase deu certo; o filho que nasceu; a estação de que gosta.
- **Às vezes em voz alta**: de dia, cada um, na sua hora, pode dizer o que pensa, num balão tracejado. Só o que pesa de verdade, e a mesma frase uma vez só por hora na aldeia inteira.

*Conversas de verdade*
- **Quase metade das conversas** entre quem tem 12 anos ou mais agora é de um destes tipos (as de antes continuam):
  - **Contar o que viu**: o crime (quem é franco conta; quem ouve passa a pensar pior de quem fez, mais ainda se foi grave), o milagre, a mordida do lobo, o bicho que atacou, a onça vencida, o filho que nasceu, o raio que caiu perto.
  - **A fofoca**: fala de alguém que não está ali, de quem gosta muito ou de quem não gosta. Quem ouve puxa um pouco o que pensa dessa pessoa na direção do que ouviu (mais, se confia em quem falou). A fama nasce assim.
  - **O combinado**: dois que gostam do mesmo trabalho (ou têm jeito para ele) combinam, de tarde, ir juntos na manhã seguinte. Nessa manhã, até o meio-dia, a vontade daquele trabalho sobe 30% para os dois; se os dois vão, ganham o dia (+3 de humor) e ficam mais próximos.
  - **O gosto**: "Você gosta de peixe?" O gosto igual aproxima.
  - **O desabafo**: quem tem algo pesando (o par que não tem, a casa, a vontade de ir embora, a mágoa, o luto, o trabalho que detesta, a oração sem resposta) conta, e quem ouve acolhe (+3 de humor para quem desabafou).
  - **Ensinar uma técnica**: quem domina uma técnica (16 anos ou mais) ensina a quem ainda não domina.

*Descobertas por tentativa*
- **Antes de cada descoberta, alguém tenta**: quando a prática chega à metade, e de novo perto do fim, quem mais praticou tenta e erra ("Iara tentou prender uma pedra num cabo e quebrou na primeira vez."). O erro também ensina (5% da prática), e um pessimista ou um cético por perto duvida em voz alta. Quando a descoberta sai, a Crônica conta quem tentou antes.

*O saber nas pessoas*
- **As técnicas que mais rendem moram nas pessoas**: o machado, a rede de pesca, o anzol, o arco e os cestos. Cada um domina cada técnica de 0 a 1. Quem descobriu domina inteira. Sem domínio, o ganho da técnica vale a metade (o machado de pedra corta 1,4 vez mais rápido em vez de 1,6); com domínio, inteiro; no meio, no meio.
- **Aprende-se vendo**: quem faz o mesmo trabalho a até 8 passos de quem domina sobe 0,06 por hora; sozinho, 0,01. **Sendo ensinado** numa conversa, sobe 0,3 de uma vez. A primeira vez que alguém aprende uma técnica com outro, a Crônica conta.
- **Quem morre leva o que sabia**: se era o último que dominava, a Crônica avisa, e a aldeia volta a render menos até alguém reaprender. A descoberta continua da aldeia: a técnica nunca se perde, só a mão boa para ela.

*Na tela e com o jogo fechado*
- **Na ficha**: **Pensando** (com o porquê) e o **Jeito**: do que gosta, do que não gosta, em que é bom, o que evita, as técnicas que domina, as que está aprendendo e as que ainda não, e o combinado com alguém.
- **Com o jogo fechado**, ninguém conversa nem tenta nada; quem fica aprende a técnica devagar, um pouco por dia, até chegar à metade.
- **Numa aldeia de 300 pessoas**, a Gente viva custa cerca de 7% a mais por passo da simulação.

## Controles

| Ação | Computador | Celular |
| --- | --- | --- |
| Mover a câmera | arrastar ou WASD / setas | arrastar |
| Zoom | roda do mouse, + e − | pinça |
| Pausar / velocidade | Espaço, 1 a 6 (1x, 2x, 5x, 10x, 20x, 50x) | botões no canto |
| Marcar fogueira / barraca | F / B | Construir |
| Marcar moquém / jirau / forno de barro | M / J / O | Construir |
| Marcar armazém / marcenaria / tecelagem | G / K / L | Construir |
| Marcar roça / curral | H / Y | Construir |
| Marcar caminho (Terra, Pedra ou Desfazer) | P, depois arraste pelo chão (botão direito mexe o mapa) | Construir → Caminho, depois arraste com um dedo (dois mexem o mapa) |
| Marcar cerca (Cercar ou Desfazer) | X, depois arraste pelo chão | Construir → Cerca, depois arraste com um dedo |
| Melhorar uma obra | clique na obra pronta → Melhorar, no painel da obra | toque na obra pronta → Melhorar |
| Escolher o que plantar | clique na roça pronta → O que plantar | toque na roça pronta → O que plantar |
| Trocar com o mascate | quando ele chega, o jogo pausa: Trocar ou dispensar | o mesmo |
| Milagres: Calor / Raio / Chuva / Cura / Revelação / Bênção | Q / R / U / E / V / Z, depois clique no mapa | Deus, depois toque no mapa |
| Níveis, dons, escolhidos e grandes atos | Deus → o botão embaixo do alinhamento | Deus → o mesmo botão |
| Dar um poder a quem tem fé inteira | clique na pessoa → Dar um poder (ou Deus → Escolhidos) | toque na pessoa → Dar um poder |
| Marcar uma estátua e escolher o milagre dela | Construir → Estátua; pronta, clique nela e escolha o milagre | Construir → Estátua; pronta, toque nela |
| Atender uma oração | clique na oração (painel de Deus), depois em quem precisa | Deus → toque na oração, depois em quem precisa |
| Espantar lobos e a onça | R, depois clique perto do lobo ou da onça (em cima da onça, abate) | Deus → Raio, depois toque perto do lobo ou da onça |
| Ver o que é um bicho (do mato ou de criação) | clique no bicho | toque no bicho |
| Trocar o Narrador | menu ≡ → Narrador | menu ≡ → Narrador |
| Árvore da família | T | Povo → Árvore |
| Descobertas, invenções, campo e metais | I (abas Trilha, Invenções, Campo e Metais) | Povo → Descobertas |
| Crônica | C | Crônica |
| Menu (salvar, Narrador, tempo com o jogo fechado, som) | ≡ (Esc ou clique no mapa fecha) | ≡ (Fechar ou toque no mapa) |
| Ligar ou desligar o som | N | menu ≡ → Som |
| Abrir e fechar os painéis (Vontades, Construir, Deus, Povo, Crônica) | a barra no canto de baixo, à direita (Esc, sem nada escolhido, fecha todos) | a barra de baixo |
| Ver e melhorar uma obra | clique na obra (abre o painel dela) | toque na obra |
| Tom do mundo (leve, picante ou adulto +18) | menu ≡ → Tom do mundo | menu ≡ → Tom do mundo |
| Ver alguém (a ficha) e passar para o anterior ou o próximo | clique na pessoa; , e . | toque na pessoa; as setas da ficha |
| Seguir alguém com a câmera | Seguir, na ficha, ou dois cliques na pessoa (arrastar o mapa solta) | Seguir, na ficha, ou dois toques |
| Posicionar uma obra | clique posiciona, setas ajustam, Enter confirma, Esc cancela | toque posiciona, arraste o fantasma, Confirmar |
| Mudar uma obra de lugar ou demolir | clique na obra pronta → Mudar de lugar ou Demolir | toque na obra pronta → o mesmo |
| Marcar mina / ferraria | Construir → Mina (junto da serra) / Ferraria | Construir |
| Acolher ou mandar seguir uma caravana | quando ela chega, o jogo pausa e pergunta | o mesmo |
| Ver os povos, a convivência e chamar um povo | Deus → o botão embaixo do alinhamento → Povos | Deus → o mesmo botão → Povos |
| Entrar antes do fim, na volta de muito tempo fora | Entrar agora | Entrar agora |
| Marcar o cemitério | Construir → Cemitério (depois do primeiro inverno ou da primeira morte) | Construir |
| Ver de quem é uma cova | clique na cova (abre a ficha de quem morreu); Ver a cova, na ficha, leva a câmera | toque na cova |
| Ver quem está enterrado | clique no cemitério | toque no cemitério |
| Responder à pergunta do rito | quando alguém pergunta, o jogo pausa: escolha uma das três respostas ou o silêncio | o mesmo |
| Ver os contos, a lei do rito e as promessas | Deus → o botão embaixo do alinhamento → Memória | Deus → o mesmo botão → Memória |
| Ver o líder, os pedidos de obra, quem não está contente, a vila de fora e o que você viu | Deus → o botão embaixo do alinhamento → Sociedade | Deus → o mesmo botão → Sociedade |
| Castigar alguém (e perdoar, quando você viu algo) | clique na pessoa → Castigar ou Perdoar; ou pela aba Sociedade, em cada caso | toque na pessoa → o mesmo |
| Mostrar em sonho quem foi | Deus → Sociedade → Mostrar em sonho, no caso que o povo não sabe | o mesmo |
| Escolher quem marca as obras | Deus → Sociedade → Só eu marco, O povo pede ou O povo decide | o mesmo |
| Responder a um pedido de obra do líder | clique no lugar com o ponto de interrogação (abre a aba) → Pode fazer ou Agora não | toque no lugar → o mesmo |
| Responder a quem avisa que vai embora | o jogo pausa e pergunta: deixar ir, convencer com um milagre ou prometer | o mesmo |
| Apagar um fogo posto | o jogo pausa e pergunta: mandar a Chuva ou deixar com o povo | o mesmo |
| Saber da vila de fora, mandar um presente ou trovejar | clique na vila no mapa; Deus → Sociedade | toque na vila; Deus → Sociedade |
| Receber de volta quem foi embora | quando eles chegam, o jogo pausa e pergunta | o mesmo |
| Cancelar | Esc ou botão direito | Cancelar |

## Jogar com conta (opcional)

Sem servidor, o jogo salva só no navegador. Para ter conta, save na nuvem e ranking, instale o servidor em Google Planilhas + Apps Script seguindo [apps-script/SETUP.md](apps-script/SETUP.md) (uns 10 minutos, gratuito) e cole a URL `/exec` em `API_URL`, no arquivo `js/config.js`. Também dá para abrir o jogo uma vez com `?api=URL`.

Já tem o servidor instalado? Cole o `Code.gs` desta versão por cima do antigo e publique uma nova versão (Implantar → Gerenciar implantações → lápis → Nova versão). A URL continua a mesma. Sem atualizar, tudo funciona, só o ranking não mostra descobertas nem aldeia. Da 0.6 para a 0.9 o servidor só mudou o número da versão; na 0.10 ele mudou de verdade (limpa as sessões vencidas e marca os erros passageiros para o jogo tentar de novo), então vale reimplantar. As melhorias do lado do jogo (acordar o servidor antes, esperar mais, tentar de novo, entrar direto quando o cadastro já tinha dado certo) valem mesmo sem reimplantar.

## Publicar no GitHub Pages

1. Crie um repositório público (ex.: `gods`). Quem já publicou com o nome antigo pode continuar no mesmo repositório: o endereço não muda.
2. Envie o conteúdo desta pasta para a raiz do repositório (pode arrastar os arquivos em "Add file → Upload files").
3. Em Settings → Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`.
4. Em um ou dois minutos o jogo abre em `https://SEU-USUARIO.github.io/gods/` (ou no endereço de sempre, se o repositório é o antigo).

Quer um arquivo só? `dist/gods.html` tem tudo embutido e abre direto no navegador, sem servidor. (Até a 0.11 ele se chamava `dist/genesis.html`: se o antigo ficou publicado, apague.)

Os saves das etapas anteriores continuam valendo (e começam com as noites picantes ligadas; o menu desliga): o casal antigo vira casal ao carregar, o Narrador começa Equilibrado e, se algum filho já passou dos 18, o segundo casal chega em poucas horas. Na versão 0.5, o save antigo ganha capivaras e começa a trilha das descobertas do zero (a prática conta a partir do carregamento). Na 0.6, o par de cada um vira o primeiro laço (com o mesmo afeto), e o Ato 1 ganha as missões novas, sem pagar de novo o que já estava feito. Na 0.7, a barraca avançada vira barraca de nível 2, a melhoria que estava em andamento continua, o estoque ganha tábuas, fibra, mantas e redes zerados, e o mapa começa sem caminhos. Na 0.8, as invenções começam sem prática (as que o povo já pode aprender ficam abertas na hora), e o save que já está numa fase adiantada ganha as missões das invenções daquela fase e das anteriores. Na 0.9, os bichos novos chegam ao mapa (as capivaras continuam, e as caçadas de antes contam como capivara), o save numa fase adiantada ganha as missões dos bichos, e cada bicho passa a ir no save numa lista curta (com mais de cem bichos no mapa, o save ficaria 17 KB maior). Na 0.10, o campo começa vazio (sem roça, curral nem cerca) e as descobertas do campo começam sem prática (já abertas, se o povo tem a cerâmica); o save que está na fase da aldeia ganha as missões do campo, uma vez só. Na 0.11, Deus começa no nível 1 com a glória calculada pelo Poder guardado e pelos milagres já feitos (se passar do nível, ele sobe na primeira hora, um nível por vez, e o nome e os dons esperam você escolher); o save numa fase adiantada ganha as missões de Deus das fases que já passou, uma vez só. Na 0.12, o save de qualquer versão abre no Gods sem perder nada: os três povos começam longe: na aldeia formada há mais de um mês, a primeira caravana chega em um ou dois dias (fora do inverno, com 6 pessoas ou mais); no acampamento, depois que ele virar aldeia; o estoque ganha carvão, minério, prata, ouro, pedras preciosas, ferro e joias zerados; a mineração já aparece aberta para quem tem a cerâmica, sem prática; o tom do mundo começa em Picante (ou em Leve, para quem tinha desligado as noites picantes); as obras de antes podem ser mudadas de lugar e demolidas; o save numa fase adiantada ganha as missões dos povos e das minas, uma vez só. A aldeia ainda não tem memória: na primeira volta depois de atualizar, o jogo simula por inteiro os dois primeiros dias (alguns segundos a mais) para aprender o ritmo dela, e daí em diante a volta é a rápida. Na 0.13, as covas de antes continuam no mapa como covas antigas (o toque diz de quem é), sem flores nem visitas; os contos começam do zero (o que você fez antes não vira conto); a erva-do-sonho nasce na mata e, com Deus no nível 2, é achada nos primeiros dias; o save numa fase adiantada ganha as missões da memória, uma vez só. Na 0.14, cada pessoa do save ganha a índole que teria de nascença (a mesma, toda vez que o save abre), a aldeia começa sem líder (com 5 adultos, o povo escolhe um na primeira tardinha), as obras passam ao modo O povo decide (quem dormia ao relento ganha casa sem você marcar; a aba Sociedade volta para Só eu marco), ninguém começa descontente, e o save numa fase adiantada ganha as missões da sociedade, uma vez só. Quem ficou preso atrás da mata (a árvore que voltou no toco fechava, às vezes, a única saída de um canto) derruba a árvore do caminho quando a sede aperta; daqui em diante, a árvore não volta onde fecharia passagem. Na 0.15, cada pessoa ganha os gostos que teria de nascença (os mesmos, toda vez que o save abre) e um jeito que começa neles; quem tem 12 anos ou mais já domina as técnicas que a aldeia conhece, e o rendimento quase não muda ao atualizar; as tentativas e a média de cada trabalho começam do zero.

## Estrutura

```
index.html              telas, HUD e janelas (conta, ranking, resumo da volta, nascimento, árvore, viajantes)
css/style.css           interface
css/digits.css          dígitos legíveis (Jersey 10 recortado, embutido)
js/core.js              seed, ruído, heap
js/config.js            todos os números de balanceamento e API_URL
js/world.js             geração do mundo e pathfinding (A* e Dijkstra)
js/sim.js               tempo, clima, necessidades, obras (erguer, melhorar, mudar de lugar e demolir), mortes, metas e a memória da aldeia
js/family.js            idades (a real e a do corpo), laços (relações livres, visitas, noites a três e de muitos, só entre adultos), o tom do mundo, gravidez, parto, bebês no colo, parentesco
js/life.js              Vida: conversas de pergunta e resposta, histórias, festas, consolo, brigas e pazes, ensinar, agradecimentos e pequenos acontecimentos
js/tech.js              Descobertas: a trilha, a prática, a Revelação, ferramentas, roupas, moquém, jirau, potes e o fim da era
js/invencoes.js         Invenções: a árvore (faca, corda, flauta, tambor, machado, agulha, arco e flecha, rede de pesca e vasos), a prática de cada uma e os efeitos
js/obras.js             Obras: níveis e casas por ambiente, armazém, marcenaria, tecelagem, mantas e redes, caminhos, trilhas e as metas da aldeia
js/fauna.js             bichos: nove espécies (capivara, veado, porco-do-mato, paca, tatu, anta, jacu, tapiti e jacaré), cada uma no seu lugar, com bandos, pasto, fuga, voo, investida, o bote do jacaré e a escolha da presa
js/bichos.js            a luta: revidar, ajudar, golpes e acertos, a caçada à onça, o que aparece ao tocar num bicho e as missões dos bichos
js/campo.js             Campo: as quatro descobertas do campo, a roça (cinco culturas, mato, colheita, geada, praga, bicho do mato), a criação (curral, crias, ovos, leite, lã, ração, abate, lobo e onça), o mascate e as cercas (porteira, área cercada)
js/ai.js                IA utilitária e ações dos cidadãos (inclui brincar, parto, caça, ofício, conservar, contar e ouvir histórias, dançar, roça, criação e cercas)
js/god.js               Fé, Poder (sem teto) e glória, orações, agradecimentos, milagres (com a Revelação e a Bênção), temido ↔ bondoso, e os ganchos dos dons
js/deus.js              Deus (Etapa 11): níveis, dons, o nome que o povo dá, céticos que se convertem, o escolhido (curar, pregar, brilhar), a estátua e os quatro milagres, a reza da manhã, a espécie nova, os saberes e as missões
js/narrator.js          Narrador: diretor de eventos, desastres, alívios, lobos, a onça, a praga, viajantes, o mascate, o segundo casal e as caravanas dos povos
js/povos.js             Povos (Etapa 12): elfos, anões e povo-fera (corpo, dons, fraqueza, nomes), a idade do corpo, os mestiços e a herança, a convivência, as caravanas, o chamado de Deus e as missões
js/minas.js             Minas (Etapa 12): mineração e metalurgia, a mina e os turnos, o que sai de cada nível, a ferraria, o ferro e as joias, a oferenda e as missões
js/memoria.js           Memória (Etapa 13): o corpo, o velório, o enterro, o cemitério, as visitas e o dia dos mortos; os contos de Deus, quem sabe cada um e como mudam; a erva-do-sonho, o rito, as dez perguntas, as respostas e as promessas; as missões
js/sociedade.js         Sociedade (Etapa 14): a índole e o que a empurra, os oito crimes e as testemunhas, o fogo posto, o julgamento ao pé do fogo e as penas, os seis castigos de Deus e a medida, a verdade em sonho, o perdão, o líder, as obras por conta própria, o descontentamento, os dissidentes, a vila de fora e as missões
js/gente.js             Gente viva (Etapa 15): os gostos, o jeito que aprende com o resultado, os pensamentos com o porquê, as conversas novas (contar o que viu, fofoca, combinado, gosto, desabafo, ensinar uma técnica), as tentativas antes da descoberta e o domínio das técnicas nas pessoas
js/save.js              save compacto (seed + o que mudou, cada bicho numa lista curta, as cercas em trechos; 16 KB no começo, 35 KB com 7 pessoas, 51 KB com 14)
js/offline.js           o mundo com o jogo fechado: dias resumidos pela memória da aldeia, dias inteiros nas pontas e pelo meio, e o corte para aparelho lento
js/net.js               conversa com o servidor (Apps Script): acorda antes, espera o bastante e tenta de novo o que pode se repetir
js/art.js               sprites em pixel gerados por código (gente, bichos e cada obra em cada nível: fogueiras, barraca, oca, palafita, casas de barro e de pedra, oficinas, armazém, roça, curral, cercas e bichos de criação)
js/render.js            terreno em blocos (com caminhos, trilhas e cercas), luz da noite, clima, raios, auras, corações, lobos, a onça, viajantes e o mascate, os bichos (e o jacu voando, o jacaré na água, os olhos no escuro), a roça em fileiras, o curral e a criação, lanças, dança, estrela cadente, arco-íris, araras, vaga-lumes e gafanhotos
js/audio.js             som: efeitos, ambiente e música gerativa com Web Audio (nenhum arquivo)
js/ui.js                painéis que abrem e fecham (no computador e no celular), o painel da obra, avisos, balões de fala (empilhados na conversa, cada um o tempo de ser lido), nascimento, árvore, descobertas, fim da era e controles de som
js/main.js              laço, telas, conta, mouse, toque e teclado
apps-script/Code.gs     servidor: contas, sessões, save no Drive, ranking
apps-script/SETUP.md    como instalar o servidor
test/sim-test.js        balanceamento do primeiro ano, sem navegador
test/family-test.js     25 verificações da família e 20 anos em três mundos
test/narrator-test.js   29 verificações do Narrador e 20 anos com as três personalidades
test/tech-test.js       101 verificações das descobertas e 20 anos em três mundos (bem, com Revelação e largado)
test/vida-test.js       verificações da vida do povo (relações livres, conversas, histórias, festas, orações, pequenos acontecimentos, missões) e 20 anos em três mundos
test/obras-test.js      verificações das obras (níveis, casas, armazém, oficinas, caminhos, trilhas, metas, save) e 20 anos em três mundos
test/invencoes-test.js  verificações das invenções (árvore, prática, Revelação, efeitos na conta e na prática, missões, save) e 20 anos em três mundos
test/bichos-test.js     verificações dos bichos (espécies, caça, jacaré, luta, lobos, onça, mortes, missões, save) e 20 anos em três mundos
test/deus-test.js       142 verificações de Deus (glória e níveis, o nome, os doze dons, conversão, escolhidos, Bênção, estátua e os quatro milagres, reza, espécie nova, saberes, missões, save e jogo fechado) e 20 anos em três mundos
test/campo-test.js      148 verificações do campo (descobertas, roça, culturas, estações, praga, bicho do mato, cercas, a árvore que faz de parede, criação, lobo e onça, mascate, comida, missões, save) e 20 anos em três mundos
test/offline-test.js    35 verificações da volta (a memória da aldeia, os dias resumidos, o estoque, as obras, a família, o corte no aparelho lento, Entrar agora) e a comparação com o jeito antigo, 120 dias em dois mundos
test/povos-test.js      112 verificações dos povos e das minas (corpo, dons, fraquezas, idade do corpo, herança, convivência, caravanas, o chamado, mina, ferraria, ferro, joias, oferenda, moeda, missões, save, mundo só de humanos intacto) e 20 anos em três mundos acolhendo, mandando seguir e chamando
test/memoria-test.js    324 verificações da memória (o corpo, o velório, o enterro de cada povo, as visitas, o dia dos mortos, os contos e a deriva, a criança temente e a confiante, a erva, o rito só de adultos, as dez perguntas e as trinta respostas, as promessas, o apego, missões, save e jogo fechado) e 20 anos em três mundos respondendo com cuidado, com medo e sem responder
test/sociedade-test.js  464 verificações da sociedade (a correção da IA, a índole, cada crime e quem viu, o julgamento e o veredito, as penas, os seis castigos e a medida, o sonho, o perdão, o líder de cada povo, os três modos de obra, o descontentamento, o aviso e as três respostas, a partida, a vila de fora, save e jogo fechado) e 20 anos em três mundos cuidando, com a mão pesada e largado
test/gente-test.js      55 verificações da gente viva (os gostos e a herança, o trabalho e a comida de que gosta, o jeito, os pensamentos, cada conversa nova e o que ela muda, o combinado, as tentativas, o domínio das técnicas, save, save antigo, jogo fechado e o custo numa aldeia de 300) e 20 anos em três mundos jogando bem e largado
test/save-v04.json      save real da versão 0.4, para conferir que ele abre nas versões seguintes
test/backend-test.js    29 verificações do servidor com um Google de mentira (e do cliente: tentar de novo, não repetir o cadastro, aviso de demora)
test/dev-server.js      jogo + servidor falso em localhost:8787
test/art.html           folha de sprites para conferir a arte
test/art7.html          folha de sprites das obras da 0.7
test/obras7.html        uma aldeia montada com todas as obras, para conferir a arte no mapa
test/bichos9.html       folha de sprites dos bichos da 0.9 (de lado, andando, abatidos, o jacu voando, o jacaré na água)
test/campo10.html       folha de sprites do campo da 0.10 (a roça em cada fase, o curral, as cercas e as porteiras, os bichos de criação, os ícones)
test/deus11.html        folha de sprites de Deus da 0.11 (a estátua com cada milagre, nos dois níveis, as árvores de Deus, o bicho criado e os ícones)
test/povos12.html       folha de sprites da 0.12 (os três povos e os mestiços, adultos e crianças, a mina e a ferraria em cada nível, as marcas de mudar e demolir, os itens e os ícones)
test/memoria13.html     folha de sprites da 0.13 (o corpo na esteira, as covas de cada povo, a árvore, as flores, a oferenda, as velas, o cemitério nos dois níveis, a erva-do-sonho e os ícones)
test/sociedade14.html   folha de sprites da 0.14 (a vila de fora, com gente e vazia, e os dez ícones sobre a grama, a neve, a noite e o fundo dos painéis)
tools/build.js          gera dist/gods.html (arquivo único)
tools/cachew.js         pré-carga dos testes longos: guarda cada mundo de 20 anos terminado, para a fila interrompida retomar de onde parou
```

A simulação não depende do navegador. `node test/sim-test.js` roda o primeiro ano em cinco mundos e compara quatro jeitos de jogar (bem, só com fogueira, pouca comida e largado). `node test/family-test.js` confere parentesco, barracas, gravidez, parto difícil com Cura, desmame, velhice, save e frio, e depois roda 20 anos em três mundos, jogando bem e só com o essencial, de olho em quem fica deitando e levantando sem parar (cerca de 10 minutos; `node test/family-test.js 5` roda 5 anos). `node test/narrator-test.js` confere cada acontecimento, os lobos, o Raio, os viajantes, o segundo casal, o save e o jogo fechado, e depois roda 20 anos em três mundos com cada personalidade, checando as regras do diretor e o portão da etapa: depois do primeiro ano, nunca mais de 15 dias sem acontecer nada (cerca de 9 minutos). `node test/tech-test.js` confere a trilha, a Revelação, ferramentas, roupas, caça, moquém, jirau, a ordem de comer, o forno, o fim da era, o save (inclusive um save da 0.4) e o jogo fechado, e depois roda 20 anos em três mundos jogando bem, jogando bem com a Revelação e largado, com o portão da etapa: a trilha inteira e o fim da era jogando bem, ninguém morrendo de fome ou frio e as capivaras nunca sumindo (cerca de 9 minutos). `node test/vida-test.js` confere as relações livres (vários pares, filhos de pais diferentes, visitas, limites, separação, save antigo, e as noites picantes: só entre adultos, nunca entre parentes, e a chave do menu), as conversas, o consolo, a briga e as pazes, o ensinar, as histórias, as festas, os agradecimentos, o Poder sem teto, os pequenos acontecimentos, a lua cheia e as missões, e depois roda 20 anos em três mundos jogando bem e largado (cerca de 6 minutos; `node test/vida-test.js u` roda só as verificações). `node test/obras-test.js` confere os níveis de cada obra, as quatro casas e o porquê de cada uma, o fogo maior, o armazém (abre depois do inverno, guarda a comida, o lobo não leva), tábuas, fibra, mantas e redes, os caminhos (marcar, abrir, andar mais rápido, pedra, desfazer, tocos), as trilhas, as metas e o save, e depois roda 20 anos em três mundos jogando bem e largado (cerca de 5 minutos). `node test/invencoes-test.js` confere a árvore das invenções, a prática de cada uma, quem inventa, a Revelação escolhida, cada efeito na conta e numa simulação curta (a flecha acerta, a rede traz mais peixe, a flauta toca, o tambor bate na festa, o cozido rende mais), as missões e o save, e depois roda 20 anos em três mundos jogando bem, com a Revelação e largado (cerca de 9 minutos; `node test/invencoes-test.js u` roda só as verificações). `node test/bichos-test.js` confere as nove espécies e o lugar de cada uma, o save antigo (as capivaras continuam e os bichos novos chegam), o que se caça com a lança e com o arco, a escolha da presa, a anta e o porco-do-mato, o jacaré e a margem marcada, revidar e ajudar, os lobos que caem ou fogem, a onça (o ataque, a caçada na manhã seguinte, o Raio), as mortes na Crônica, as missões, o save e o jogo fechado, e depois roda 20 anos em três mundos jogando bem e largado (cerca de 6 minutos; `node test/bichos-test.js u` roda só as verificações). `node test/campo-test.js` confere a árvore do campo, a prática e a Revelação, onde a roça pode ir, cada passo da roça (plantar, capinar, colher, levar), as estações, a geada e a mandioca, o que o povo escolhe plantar, o adubo, a fartura, a Chuva e a praga, o bicho do mato na roça aberta, as cercas (marcar, fincar, fechar a volta, a brecha, a árvore que serve de parede, a porteira, a quina na diagonal), a criação (crias, ovos, leite, lã, ração, fome, abate, o curral cheio), o lobo e a onça no curral, o mascate e o que o povo aceita dar, a comida da roça, as missões, o save e o jogo fechado, e depois roda 20 anos em três mundos jogando bem, com a Revelação e largado, com o portão da etapa: ninguém morrendo de fome, sede ou frio, colheitas todo ano, as cinco culturas colhidas, a criação passando de 10 bichos, a roça cercada e o mascate trocando (cerca de 10 minutos; `node test/campo-test.js u` roda só as verificações). `node test/deus-test.js` confere a glória e os níveis (um por vez, com glória e fiéis), a oferta de dons (a mesma no mesmo mundo, sem repetir, com um do lado de Deus), o nome (o título pelo que Deus mais fez, as falas com o nome, trocar e a Crônica junto), cada um dos doze dons, os sinais e a conversão do cético, o escolhido (quem pode, ungir, a fé perto de 90, perder a graça, a curandeira indo curar, a pregação de tardinha, a Luz que espanta a fera), a Bênção (no trabalho e na roça), a estátua (os quatro milagres, a reza da manhã, o altar, o parto a salvo), as três espécies e os três saberes, as missões, o save e o jogo fechado, e depois roda 20 anos em três mundos com Deus usando tudo, só atendendo as orações e largado, com o portão da etapa: quem cuida chega ao nível 4, dá poderes a escolhidos que curam e pregam, consagra estátuas e faz grandes atos, e ninguém morre de fome, sede ou frio (cerca de 15 minutos; `node test/deus-test.js u` roda só as verificações). `node test/offline-test.js u` confere a volta com o jogo fechado: a memória da aldeia (o que ela anota, estação por estação), os dias resumidos (calendário, idade, gravidez e parto, pares, fé, Poder, o estoque que volta ao nível de sempre e nunca fica abaixo de 30 dias de comida, as habilidades, as descobertas, a obra marcada que fica pronta), ninguém morrendo, o save antigo sem memória (dois dias inteiros primeiro), o corte no aparelho lento e o Entrar agora; sem o `u`, compara o jeito novo com o antigo em 120 dias de dois mundos (cerca de 1 minuto). `node test/povos-test.js u` confere os povos e as minas: o corpo, os dons e a fraqueza de cada povo, a idade do corpo, a herança do mestiço e o sangue que se dilui, a convivência (o que sobe, o teto do dia a dia, o que desce, a união que não se repete nem se desfaz), as caravanas (quem vem primeiro, acolher, mandar seguir, a volta, o chamado de Deus), o que cada povo traz e ensina, a mineração e a metalurgia, a mina em cada nível, a ferraria, a ferramenta de ferro, as joias, a oferenda, a moeda do mascate, mudar de lugar e demolir, o tom do mundo (só adultos, nunca parentes, em qualquer tom), as missões, o save, e que, num mundo só de humanos, corpo, dons e convivência não entram na conta; sem o `u`, roda 20 anos em três mundos acolhendo todo mundo, mandando seguir e chamando, com o portão da etapa: os três povos chegam, nascem mestiços, a convivência sobe devagar e cada par de povos se une uma vez só, a mina e a ferraria trabalham, o ferro chega à mão do povo, o ourives faz joias e ninguém morre de fome, sede ou frio (cerca de 30 minutos). `node test/memoria-test.js u` confere a memória: o corpo que espera, quem acha e quem leva, o velório (quem vem, o luto pela metade), o enterro e o rito de cada povo, o cemitério escolhido pelo povo e o marcado por você, as visitas e as flores, o dia dos mortos, o que cada ato de Deus vira de conto, quem sabe cada conto, a deriva de quem reconta, o tom com que o conto nasce, a criança temente e a confiante (pelo que vê e pelo que ouve), a erva e as três leis, o rito só de adultos (18 anos de verdade, sem grávida e sem bebê no colo), as dez perguntas e as trinta respostas, as promessas cumpridas e quebradas, a ressaca e o apego, as missões, o save e o jogo fechado; sem o `u`, roda 20 anos em três mundos respondendo com cuidado, com medo e sem responder, com o portão da etapa: só adulto no rito, nenhum corpo esquecido, cada morto com a sua cova, os velhos velados e enterrados no cemitério, a família voltando com flores, o dia dos mortos todo ano, os contos passando a quem não viu, a erva achada antes do ano 10, as perguntas respondidas e, com um Deus bondoso, as crianças crescendo confiantes (cerca de 35 minutos). `node test/sociedade-test.js u` confere a sociedade: a correção da IA (comer da carga, dormir no caminho), a índole de nascença (a mesma no mesmo mundo, sem gastar o sorteio da simulação) e o que a empurra, cada um dos oito crimes, quem vê e quem conta, a mentira que joga a culpa em outro, a raiva que o violento guarda e a pausa depois do golpe, o fogo posto (quem acorda, a água, a Chuva, o armazém), a bronca e o julgamento (quem vem, o quórum, o voto, o inocente condenado), as penas e o exílio, os seis castigos e as quatro medidas, os limites de idade, o sonho que mostra a verdade, o perdão, o líder de cada povo e a troca de líder, os três modos de obra e as cinco faltas, o descontentamento, o aviso e as três respostas, a caminhada e a fundação da vila, a troca, o casamento, a briga, o outro deus e a volta, as missões, o save (o de antes da 0.14 também) e o jogo fechado; sem o `u`, roda 20 anos em três mundos cuidando (o povo decide as obras, castigo na medida, verdade em sonho, perdão a quem pagou, promessa a quem avisa), com a mão pesada (falta casa, castigo dois degraus acima, deixa ir quem quiser) e largado, com o portão da etapa: ninguém de menos de 12 anos castigado ou julgado, nenhuma vítima de violência com menos de 14, nenhum par entre parentes (nem com quem vem da vila de fora), ninguém que partiu sobrando na lista do povo, líder antes do ano 4, crimes em todo mundo mas a maioria leve e os graves raros e, entre os mundos, mais medo e mais descontentamento com a mão pesada, gente que avisa, vai embora e funda a vila, e a aldeia e a vila trocando (cerca de 40 minutos). `node test/gente-test.js u` confere a gente viva: os gostos (fixos no mundo, herdados em parte, puxados pelo povo), o trabalho de que gosta (pontua e rende mais), comer o que gosta, o jeito (o resultado ensina, a mordida afasta, o exemplo dos pais), os pensamentos (o que pesa mais, com o porquê; o par só entre adultos e nunca com parente), cada conversa nova e o que ela muda, o combinado que vira trabalho junto, as tentativas antes da descoberta, o domínio das técnicas (quem descobre, quem aprende vendo, quem é ensinado, o último que sabe e morre), o save, o save antigo, o jogo fechado e o custo numa aldeia de 300; sem o `u`, roda 20 anos em três mundos jogando bem e largado, com o portão da etapa: ninguém morre de fome, sede ou frio, quem gosta de um trabalho o faz mais que a média (e quem detesta, menos), cada conversa nova acontece, há tentativas, a trilha anda e o domínio do machado se espalha (cerca de 30 minutos). Desde a 0.12, com as caravanas acolhidas, as aldeias dos testes antigos ficam maiores e cada suíte de 20 anos leva de 10 a 50 minutos (os tempos ditos acima são da versão em que cada teste nasceu); os quinze em fila levam cerca de 4 horas em dois processadores (numa máquina mais lenta, de 5 a 8). Mexeu em `js/config.js`? Rode os quinze de novo. Para a fila não recomeçar do zero se for interrompida, rode cada teste com `CACHEW_DIR=pasta node --require ./tools/cachew.js test/nome-test.js`: cada mundo de 20 anos terminado fica guardado, e a rodada seguinte retoma do mundo em que parou (a chave leva o conteúdo do teste; passe em `CACHEW_TAG` um resumo de `js/`, para o cache cair quando o código do jogo mudar).

Depois de alterar o código, rode `node tools/build.js` para atualizar `dist/gods.html`.

## Créditos

Fontes: Pixelify Sans e Crimson Pro (Google Fonts) e os dígitos do Jersey 10 (The Soft Type Project), todas sob a SIL Open Font License 1.1.

## Próximas etapas

A 0.22 fechou a etapa 22 (Outros jogadores), a última do roteiro. A 0.21 fechou a etapa 21 (Avatar). A 0.20 fechou as etapas 19 e 20 (Eras). A 0.19 fechou a etapa 18 (Barcos e outras terras). A 0.18 fechou a etapa 17 (Mundo grande), com a ponte de pedra e a grande estátua que tinham ficado da 16. A 0.17 fechou a etapa 16 (Grandes obras e instituições). A 0.15 fechou a etapa 15 (Gente viva), o último dos pedidos urgentes de 12 de outubro: gostos, pensamentos, conversas de verdade, descobertas por tentativa e o saber que passa de mão em mão. A 0.14 tinha fechado a etapa 14 (Sociedade), com a correção da IA que a abria, os três pedidos de 5 de outubro (gente ruim e castigo pela gravidade, obras por conta própria, quem vai embora e funda outra vila) e os outros pedidos urgentes de 12 de outubro (o povo constrói o que precisa sem você marcar, o 1x mais calmo, a aldeia de 300 pessoas sem travar, a Crônica sem excesso de romance e a tela de início sem os nomes). O resto segue nesta ordem (o detalhe de cada etapa está no documento de design):

- **Depois**: revolução industrial, tecnologia, IA e espaço.
