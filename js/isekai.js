/* Gods · 0.40: dragões e almas de outro mundo. O dragão é o monstro maior: faz ninho na serra quando o povo já é grande,
   desce de tempos em tempos, põe fogo em casa e leva ouro; só um grupo forte tira ele de lá, e quem derruba vira lenda.
   As almas: de raro em raro nasce alguém lembrando de outra vida, num mundo que ninguém aqui conhece, e com um jeito único.
   Aos cinco anos a criança começa a falar disso, e cabe a você: guiar, deixar viver como quiser, ou fazer esquecer.
   Sorteio próprio, menos o bando (a mesma regra dos lobos). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Is = G.Isekai = {};
  const Sim = () => G.Sim, Fam = () => G.Family, R = () => G.Rpg;
  const DAY = () => C.DAY_MIN, YEAR = () => C.YEAR_DAYS * C.DAY_MIN;

  function hashN(a, b, c) {
    let x = (Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 40503) ^ Math.imul(c | 0, 69069)) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 1597334677) >>> 0; x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  }
  // ---------- o dragão ----------
  Is.dragaoAtivo = (S) => (S.ck.year >= C.DRAGAO_ANO || S.people.filter((p) => p.alive).length >= C.DRAGAO_GENTE) && S.people.filter((p) => p.alive).length >= 30;
  Is.temDragao = (S) => !!(S.monstros && S.monstros.covis.some((c) => c.m === 'dragao'));
  function dragaoDia(S) {
    if (!G.Monstros || S.safe || S.resumido || S.over) return;
    const m = G.Monstros.init(S);
    if (Is.temDragao(S) || !Is.dragaoAtivo(S)) return;
    if (!m.proxDragao) { m.proxDragao = S.t + (40 + hashN(S.seed, 1, 1) * 160) * DAY(); return; }
    if (S.t < m.proxDragao) return;
    m.proxDragao = S.t + C.DRAGAO_VOLTA * YEAR();
    const c = G.Monstros.novo(S, 'dragao');
    if (!c) return;
    c.nv = 3;
    S.stats.dragoes = (S.stats.dragoes || 0) + 1;
    Sim().chron(S, 'Uma sombra enorme passou por cima da vila e ninguém dormiu naquela noite. Um dragão fez ninho na serra.');
    S.events.push({ k: 'toast', text: 'Um dragão fez ninho perto daqui.', tone: 'bad' });
  }
  // quando o bando é o dragão: uma casa pega fogo (a primeira coisa que ele faz ao chegar)
  Is.aoDescer = function (S, c) {
    if (c.m !== 'dragao' || !G.Cidade || !G.Cidade.queima) return;
    const l = S.buildings.filter((b) => b.built && b.type === 'barraca' && !b.fogo);
    if (l.length) G.Cidade.queima(S, l[Math.floor(hashN(S.t | 0, c.id, 3) * l.length)]);
    if (S.stock.ouro > 0) { const n = Math.ceil(S.stock.ouro * C.DRAGAO_OURO); S.stock.ouro -= n; if (!S.safe) Sim().toast(S, 'O dragão levou ' + n + ' de ouro.', 'bad'); }
  };
  // quem dá o golpe final no dragão vira lenda
  Is.lenda = function (S, p) {
    const r = p.rpg;
    if (r) { r.lenda = 'Matador de Dragão'; if (R()) R().ganha(S, p, R().pede(r.nv) * 2, 'luta'); }
    S.stats.dragoesMortos = (S.stats.dragoesMortos || 0) + 1;
    for (const c of S.monstros.covis.filter((x) => x.m === 'dragao')) G.Monstros.remove(S, c.id);
    if (S.stock.ouro !== undefined) S.stock.ouro += C.DRAGAO_TESOURO;
    Sim().chron(S, p.name + ' derrubou o dragão diante de todo mundo. Do ninho na serra, o povo trouxe ' + C.DRAGAO_TESOURO + ' de ouro. Vão contar isso por muitos anos.');
    for (const q of S.people) if (q.alive && Sim().addMem) Sim().addMem(S, q, 'vencemos');
    if (G.Life && G.Life.party) G.Life.party(S, 'onca', { name: p.name });
  };
  // ---------- as almas de outro mundo ----------
  // os mundos são lembranças vagas, sem nome: a criança não sabe explicar
  Is.MUNDOS = [
    'uma cidade de torres de vidro, com luzes que nunca apagavam',
    'carroças que andavam sozinhas e um céu cheio de fios',
    'uma sala cheia de gente olhando para janelinhas que brilhavam',
    'uma escola enorme, e uma ponte, e um barulho muito alto',
    'um mar visto de cima, de dentro de um pássaro de ferro',
  ];
  Is.DONS = {
    rapido: { name: 'Aprende depressa', desc: 'Sabe como se aprende: a força sobe em dobro.' },
    sabio: { name: 'Sabe antes da hora', desc: 'Lembra de coisas que o povo ainda não descobriu: todo dia, a descoberta da vez chega mais perto.' },
    sorte: { name: 'Sorte absurda', desc: 'O grupo com esta pessoa conta como mais forte nas missões.' },
    ponte: { name: 'Fala com todos', desc: 'Para quem veio de outro mundo, todos os povos são iguais: a convivência entre eles sobe sozinha.' },
  };
  const LISTA = Object.keys(Is.DONS);
  Is.de = (p) => (p && p.outro && !p.outro.esqueceu ? p.outro : null);
  Is.tem = (p, d) => { const o = Is.de(p); return !!(o && o.dom === d); };
  Is.xp = (p) => (Is.tem(p, 'rapido') ? (p.outro.guia ? 3 : 2) : 1);
  // a cada nascimento, uma chance pequena; a primeira alma vem depois de umas tantas crianças
  // 0.42: um efeito animado na tela (nada na simulação; o dia resumido não tem tela)
  const fx = (S, k, x, y, o) => { if (!S.resumido && !S.safe && S.events) S.events.push(Object.assign({ k: 'fx', fx: k, x, y }, o || {})); };
  Is.onBirth = function (S, baby) {
    S.stats.nascidosI = (S.stats.nascidosI || 0) + 1;
    const r = hashN(baby.id, S.seed, 11);
    if (S.stats.nascidosI < C.ALMA_DEPOIS || r >= C.ALMA_CHANCE) return false;
    baby.outro = { t: S.t, mundo: Is.MUNDOS[Math.floor(hashN(baby.id, S.seed, 13) * Is.MUNDOS.length)], dom: LISTA[Math.floor(hashN(baby.id, S.seed, 17) * LISTA.length)], falou: 0, escolha: '' };
    S.stats.almas = (S.stats.almas || 0) + 1;
    fx(S, 'alma', baby.x - 0.5, baby.y - 0.4);
    return true;
  };
  Is.pendentes = (S) => S.people.filter((p) => p.alive && p.outro && p.outro.falou && !p.outro.escolha);
  Is.almas = (S) => S.people.filter((p) => p.alive && p.outro);
  function almaDia(S) {
    for (const p of S.people) {
      if (!p.alive || p.fora || !Is.de(p)) continue;
      const o = p.outro, age = Fam().age(S, p);
      if (!o.falou && age >= C.ALMA_FALA) {
        o.falou = S.t;
        Sim().chron(S, p.name + ', de ' + age + ' anos, começou a falar de coisas que ninguém ensinou: ' + o.mundo + '. Diz que já viveu antes.');
        if (!S.safe) { Sim().toast(S, p.name + ' lembra de outro mundo. Abra Deus → Heróis.', 'warn'); }
      }
      if (S.resumido) continue;
      if (o.dom === 'sabio' && age >= C.ALMA_FALA && G.Tech && G.Tech.open) { const a = G.Tech.open(S); if (a) G.Tech.addPractice(S, a, o.guia ? 6 : 3, null); }
      if (o.dom === 'ponte' && age >= C.ALMA_FALA && G.Povos && G.Povos.shift) G.Povos.shift(S, o.guia ? 0.1 : 0.05);
      // já crescido, desperta sozinho (o que veio de longe sabe o que é força)
      if (age >= 16 && R() && !R().de(p)) R().desperta(S, p);
    }
  }
  // ---------- a escolha de Deus ----------
  Is.ESCOLHAS = {
    guiar: { name: 'Guiar', custo: 40, desc: 'Você fala com esta alma nos sonhos: o dom dela fica mais forte, e a fé vai ao máximo.' },
    deixar: { name: 'Deixar viver', custo: 0, desc: 'Ela segue com o que lembra, do jeito dela.' },
    esquecer: { name: 'Fazer esquecer', custo: 20, desc: 'A lembrança some, com o dom junto. Vira uma criança como as outras.' },
  };
  Is.escolheWhy = function (S, p, k) {
    const E = Is.ESCOLHAS[k];
    if (!E || !p || !p.outro || p.outro.escolha) return 'não dá mais';
    if (E.custo && (!S.god || S.god.poder < E.custo)) return 'faltam ' + Math.ceil(E.custo - (S.god ? S.god.poder : 0)) + ' de Poder';
    return '';
  };
  Is.escolhe = function (S, p, k) {
    if (Is.escolheWhy(S, p, k)) return false;
    const E = Is.ESCOLHAS[k], o = p.outro;
    if (E.custo) S.god.poder -= E.custo;
    o.escolha = k;
    if (k === 'guiar') { o.guia = 1; p.fe = 100; Sim().chron(S, p.name + ' acordou calmo, dizendo que alguém explicou tudo durante a noite.'.replace('calmo', p.sex === 'F' ? 'calma' : 'calmo')); }
    else if (k === 'esquecer') { o.esqueceu = 1; Sim().chron(S, p.name + ' parou de falar do outro mundo. Quando perguntam, ri e não sabe do que estão falando.'); }
    else Sim().chron(S, 'O povo se acostumou com as histórias de ' + p.name + '. Ninguém sabe o que fazer com elas, e tudo bem.');
    return true;
  };
  // ---------- o relógio ----------
  Is.daily = function (S) { dragaoDia(S); almaDia(S); };
})(globalThis.G = globalThis.G || {});
