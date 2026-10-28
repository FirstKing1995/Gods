/* Gods · Etapa 22 (0.22): outros jogadores. Pelo servidor de contas que já existe (a planilha e o Apps Script), sem
   tempo real: você abre o mundo de outro deus como ele foi salvo pela última vez, anda pelo mapa dele e lê a Crônica.
   Dá para ajudar (comida, material, uma bênção, um milagre) ou, se o dono deixou, sabotar (uma praga, uma seca curta,
   um boato que baixa a fé), sempre pago com o seu Poder, com teto por dia, e nunca matando ninguém nem destruindo
   obra. A visita deixa um recado, que o mundo visitado aplica quando o dono abre o jogo; quem recebeu vê quem foi.
   Cada mundo escolhe: fechado, só ajuda ou aberto. Estátuas, templo e fé alta seguram a sabotagem. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const V = G.Visita = {};
  const Sim = () => G.Sim;

  V.ABERTURA = { fechado: 'Fechado: ninguém visita', ajuda: 'Só ajuda: visitam e só podem ajudar', aberto: 'Aberto: visitam, ajudam e podem sabotar' };
  V.init = function (S) {
    const v = S.visita || (S.visita = {});
    v.abertura = v.abertura || 'ajuda';
    v.recebidos = v.recebidos || [];
    const st = S.stats;
    for (const k of ['ajudasDadas', 'sabotagensDadas', 'ajudasRecebidas', 'sabotagensRecebidas', 'sabotagensSeguradas', 'visitas']) st[k] = st[k] || 0;
  };
  V.setAbertura = (S, k) => { if (V.ABERTURA[k]) { if (!S.visita) V.init(S); S.visita.abertura = k; } };

  // o que dá para mandar: o custo em Poder do seu mundo, e se é ajuda ou sabotagem
  V.ATOS = {
    comida: { nome: 'Mandar comida', ajuda: true, custo: 30, desc: '40 de peixe chegam ao estoque dele.' },
    material: { nome: 'Mandar material', ajuda: true, custo: 30, desc: '30 de madeira e 20 de pedra.' },
    bencao: { nome: 'Uma bênção', ajuda: true, custo: 60, desc: 'A fé de todo o povo dele sobe 5.' },
    milagre: { nome: 'Um milagre', ajuda: true, custo: 150, desc: 'Todos os doentes e feridos de lá saram.' },
    praga: { nome: 'Uma praga', ajuda: false, custo: 120, desc: 'A roça dele perde um terço do que está crescendo.' },
    seca: { nome: 'Uma seca curta', ajuda: false, custo: 150, desc: 'Metade da água do estoque dele some.' },
    boato: { nome: 'Um boato', ajuda: false, custo: 100, desc: 'A fé de todo o povo dele cai 5.' },
  };
  // pode mandar? (o servidor confere de novo: a abertura do outro e o teto por dia)
  V.atoWhy = function (S, k, alvo) {
    const A = V.ATOS[k];
    if (!A) return 'esse ato não existe';
    if (!alvo || alvo.abertura === 'fechado') return 'esse mundo está fechado';
    if (!A.ajuda && alvo.abertura !== 'aberto') return 'esse mundo só aceita ajuda';
    if ((S.god.poder || 0) < A.custo) return 'pede ' + A.custo + ' de Poder';
    return '';
  };
  V.pagar = function (S, k) {
    const A = V.ATOS[k];
    S.god.poder -= A.custo;
    S.stats[A.ajuda ? 'ajudasDadas' : 'sabotagensDadas']++;
  };

  // o recado que chegou: aplica no mundo de quem recebeu. Nunca mata, nunca destrói obra. A sabotagem pode ser
  // segurada: pela estátua ou pelo templo (metade das vezes) e pela fé alta do povo (média 80 ou mais)
  function segura(S, r) {
    const fe = S.people.filter((p) => p.alive).reduce((a, p, _, l) => a + (p.fe || 0) / l.length, 0);
    if (fe >= 80) return 'a fé do povo';
    if (S.buildings.some((b) => (b.type === 'estatua' || b.type === 'templo') && b.built) && G.hash2(r.id ? String(r.id).length : 1, S.ck.day, S.seed) < 0.5) return 'a estátua';
    return '';
  }
  V.aplicar = function (S, r) {
    if (!S.visita) V.init(S);
    const A = V.ATOS[r.tipo];
    if (!A || S.visita.recebidos.indexOf(r.id) >= 0) return false;
    S.visita.recebidos.push(r.id);
    if (S.visita.recebidos.length > 200) S.visita.recebidos.shift();
    const de = String(r.deNome || 'um deus de longe').slice(0, 30), vivos = S.people.filter((p) => p.alive);
    if (!A.ajuda) {
      const s = segura(S, r);
      if (s) { S.stats.sabotagensSeguradas++; Sim().chron(S, 'Um deus de longe, ' + de + ', mandou ' + A.nome.toLowerCase() + ', mas ' + s + ' segurou.'); return true; }
    }
    if (r.tipo === 'comida') S.stock.peixe = (S.stock.peixe || 0) + 40;
    else if (r.tipo === 'material') { S.stock.madeira += 30; S.stock.pedra += 20; }
    else if (r.tipo === 'bencao') for (const p of vivos) G.God.faith(S, p, 5);
    else if (r.tipo === 'milagre') for (const p of vivos) { p.needs.saude = 100; delete p.sick; }
    else if (r.tipo === 'praga') { for (const b of S.buildings) if (b.type === 'roca' && b.farm && b.farm.st === 'crescendo') b.farm.lost = Math.min(0.95, (b.farm.lost || 0) + 0.33); }
    else if (r.tipo === 'seca') S.stock.agua = Math.floor((S.stock.agua || 0) / 2);
    else if (r.tipo === 'boato') for (const p of vivos) G.God.faith(S, p, -5);
    S.stats[A.ajuda ? 'ajudasRecebidas' : 'sabotagensRecebidas']++;
    Sim().chron(S, 'Um deus de longe, ' + de + ', ' + (A.ajuda ? 'ajudou: ' : 'mexeu aqui: ') + A.nome.toLowerCase() + '. ' + A.desc.replace(/ dele\b| de lá\b/g, '').replace(/ do povo dele/g, ' do povo'));
    return true;
  };
  // o que mostrar do mundo visitado (o save dele, aberto só para ler)
  V.resumoDe = function (Sv) {
    const ck = Sim().clock(Sv.t), vivos = Sv.people.filter((p) => p.alive);
    const lugar = G.Obras && G.Obras.povoacao ? G.Obras.povoacao(Sv) : null;
    return {
      ano: ck.year, estacao: C.SEASONS[ck.season], vivos: vivos.length, lugar: lugar ? lugar.label : '', idade: G.Eras && Sv.eras ? G.Eras.info(Sv).idade : '',
      deus: (Sv.god && Sv.god.name) || 'um deus sem nome', cronica: (Sv.chron || []).slice(-14).map((c) => c.text),
    };
  };
})(globalThis.G = globalThis.G || {});
