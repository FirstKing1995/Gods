/* Gods · Povos (Etapa 12): elfos, anões e povo-fera chegam em caravanas e pedem para ficar. Cada povo tem o seu corpo
   (quanto vive, quanto come, como anda, como sente frio), três dons e uma fraqueza. Filho de dois povos é mestiço:
   herda um dom de cada lado e é ponte entre eles. A convivência entre dois povos (0 a 100) cresce com a conversa, a
   festa, a história, os casais e os filhos mistos, e cai com as brigas; baixa, briga-se mais e formam-se menos pares.
   Humano puro não carrega nada disto (p.povo, p.sangue e p.dons ficam vazios): num mundo só de humanos a simulação é
   a de sempre. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const Pv = G.Povos = {};
  const Sim = () => G.Sim, Fam = () => G.Family, Tech = () => G.Tech;
  const DAY = () => C.DAY_MIN;

  Pv.ORDER = ['humano', 'elfo', 'anao', 'fera'];
  Pv.OUTROS = ['elfo', 'anao', 'fera'];
  // old: a idade em que a velhice chega · fert: filhos · walk: passo · cold: quanto o frio pega · fome · carry: carga
  // trait: o traço da aparência (p.look) · terr: o terreno de onde vêm
  Pv.DEF = {
    humano: { name: 'Humanos', um: 'humano', uma: 'humana', os: 'os humanos', de: 'de humanos', icon: 'humano', alias: 'o povo do casal',
      old: 60, fert: 1, walk: 1, cold: 1, fome: 1, carry: 1, dons: ['acolhedor', 'versatil', 'sangue'], fraq: null,
      desc: 'O povo do casal fundador. Vive uns 60 anos, faz de tudo e se dá com todo mundo.' },
    elfo: { name: 'Elfos', um: 'elfo', uma: 'elfa', os: 'os elfos', de: 'de elfos', icon: 'elfo', alias: 'o povo da mata', trait: 'orelha', terr: 'mata',
      old: 150, fert: 0.4, walk: 1, cold: 1, fome: 0.85, carry: 1, dons: ['mata', 'arqueiro', 'vista'], fraq: 'arvore',
      desc: 'Esguios, de orelha pontuda. Vivem 150 anos e têm poucos filhos. Colhem como ninguém e atiram de longe, mas não derrubam árvore.' },
    anao: { name: 'Anões', um: 'anão', uma: 'anã', os: 'os anões', de: 'de anões', icon: 'anao', alias: 'o povo da serra', trait: 'anao', terr: 'serra',
      old: 110, fert: 0.7, walk: 0.88, cold: 0.7, fome: 1.1, carry: 1.3, dons: ['pedra', 'ferreiro', 'obra'], fraq: 'seco',
      desc: 'Baixos, largos e barbudos. Vivem 110 anos, aguentam o frio e carregam muito. Quebram pedra, mineram, forjam e constroem; andam devagar e não pescam.' },
    fera: { name: 'Povo-fera', um: 'fera', uma: 'fera', os: 'o povo-fera', de: 'do povo-fera', um1: true, icon: 'fera', alias: 'o povo do campo', trait: 'fera', terr: 'campo',
      old: 50, fert: 1.2, walk: 1.1, cold: 0.5, fome: 1.4, carry: 1.1, dons: ['faro', 'garras', 'noite'], fraq: 'fome',
      desc: 'Gente de pelo, orelha de bicho e rabo. Vivem 50 anos e têm muitos filhos. Farejam a caça, lutam com as garras e enxergam no escuro; o pelo espanta o frio, e a fome é de bicho.' },
  };
  Pv.DONS = {
    acolhedor: { name: 'Acolhedor', icon: 'uniao', desc: 'Faz amizade com qualquer povo: a conversa aproxima em dobro.' },
    versatil: { name: 'Versátil', icon: 'humano', desc: 'Vivendo com outros povos, aprende 15% mais depressa.' },
    sangue: { name: 'Sangue bom', icon: 'meio', desc: 'O filho que tiver com outro povo vive os anos do povo que vive mais.' },
    mata: { name: 'Filho da mata', icon: 'frutas', desc: 'Colhe frutas 50% mais depressa.' },
    arqueiro: { name: 'Olho de arqueiro', icon: 'elfo', desc: 'Na caça, acerta mais e de mais longe.' },
    vista: { name: 'Vista longa', icon: 'olho', desc: 'Enxerga o dobro de longe: a névoa abre mais por onde passa.' },
    pedra: { name: 'Mão de pedra', icon: 'pedra', desc: 'Quebra pedra e minera 60% mais depressa, e acha mais veio na mina.' },
    ferreiro: { name: 'Ferreiro nato', icon: 'ferraria', desc: 'Já nasce sabendo forjar, e forja 60% mais depressa.' },
    obra: { name: 'Mestre de obra', icon: 'construir', desc: 'Constrói 40% mais depressa.' },
    faro: { name: 'Faro', icon: 'fera', desc: 'A caça não o percebe chegar, e cada bicho rende mais carne.' },
    garras: { name: 'Garras', icon: 'fera', desc: 'Luta sem lança: acerta mais, e a mordida dói a metade.' },
    noite: { name: 'Olhos da noite', icon: 'fera', desc: 'Segue trabalhando de tardinha e de noite, quando os outros param.' },
    ponte: { name: 'Ponte', icon: 'meio', desc: 'Filho de dois povos: todo dia aproxima um pouco os povos dos pais.' },
  };
  Pv.FRAQ = {
    arvore: { name: 'Não derruba árvore', desc: 'Um elfo não corta madeira.' },
    seco: { name: 'Pé no seco', desc: 'Um anão não pesca.' },
    fome: { name: 'Fome de bicho', desc: 'Come 40% mais.' },
  };
  // nomes de cada povo (inventados para o jogo)
  Pv.NAMES = {
    elfo: { F: ['Ilanê', 'Sairê', 'Elunaí', 'Narilã', 'Tielê', 'Aluí', 'Milenã', 'Evaí', 'Luriê', 'Sanilê'], M: ['Taliel', 'Ereví', 'Luanir', 'Ilmar', 'Enoã', 'Valiê', 'Arelin', 'Silvã', 'Niaron', 'Calinê'] },
    anao: { F: ['Brunda', 'Dorga', 'Kelma', 'Gurdis', 'Tolga', 'Marda', 'Ruvka', 'Hodra', 'Berga', 'Druma'], M: ['Durgo', 'Krag', 'Tormo', 'Grumek', 'Dolvar', 'Bruk', 'Hargo', 'Urdek', 'Molgar', 'Rundo'] },
    fera: { F: ['Raxa', 'Nhara', 'Jurê', 'Xaia', 'Miara', 'Tixa', 'Suçá', 'Graúna', 'Aruxa', 'Nhaí'], M: ['Rauã', 'Jagu', 'Guará', 'Turuna', 'Karu', 'Naguá', 'Tarrã', 'Jurupi', 'Xoró', 'Açuã'] },
  };

  // ---------- quem é quem ----------
  const HUM = { humano: 1 };
  Pv.of = (p) => (p && p.povo) || 'humano';
  Pv.blood = (p) => (p && p.sangue) || HUM;
  Pv.donsOf = (p) => (p.dons ? p.dons : Pv.DEF[Pv.of(p)] ? Pv.DEF[Pv.of(p)].dons : Pv.DEF.humano.dons);
  Pv.has = (p, don) => Pv.donsOf(p).indexOf(don) >= 0;
  // a fraqueza é só de quem é do povo inteiro (o mestiço não herda)
  Pv.fraqOf = (p) => (p.povo && p.povo !== 'meio' && Pv.DEF[p.povo] ? Pv.DEF[p.povo].fraq : null);
  // os povos de alguém para a convivência: o mestiço conta pelos dois (ou três) lados
  Pv.sides = (p) => (p.povo === 'meio' && p.sangue ? Object.keys(p.sangue) : [Pv.of(p)]);
  // o corpo, pela mistura do sangue
  const bodies = new WeakMap();
  Pv.body = function (p) {
    let b = bodies.get(p);
    if (b && b.of === p.sangue) return b;
    const bl = Pv.blood(p);
    b = { of: p.sangue, old: 0, fert: 0, walk: 0, cold: 0, fome: 0, carry: 0 };
    for (const k in bl) { const d = Pv.DEF[k] || Pv.DEF.humano; for (const f of ['old', 'fert', 'walk', 'cold', 'fome', 'carry']) b[f] += d[f] * bl[k]; }
    bodies.set(p, b);
    return b;
  };
  // como se diz o povo de alguém: "elfa", "anão", "mestiço de elfo e humano"
  Pv.label = function (p) {
    const k = Pv.of(p), fem = p.sex === 'F';
    if (k !== 'meio') return fem ? Pv.DEF[k].uma : Pv.DEF[k].um;
    const ks = Object.keys(p.sangue).sort((a, b) => p.sangue[b] - p.sangue[a]);
    return (fem ? 'mestiça de ' : 'mestiço de ') + ks.map((x) => Pv.DEF[x].um).join(ks.length > 2 ? ', ' : ' e ').replace(/, ([^,]*)$/, ' e $1');
  };
  Pv.iconOf = (p) => (Pv.of(p) === 'meio' ? 'meio' : Pv.DEF[Pv.of(p)].icon);
  // a idade de verdade de quem tem o corpo de tantos anos (para criar gente de um povo)
  Pv.realAge = (kind, bodyAge) => (bodyAge <= 18 ? bodyAge : Math.round(18 + (bodyAge - 18) * (Pv.DEF[kind].old - 18) / (C.OLD_AGE - 18)));
  Pv.lookOf = function (S, kind, sex, look) {
    const d = Pv.DEF[kind], L = Sim().POVO_LOOK[kind], r = S.rng;
    const out = Object.assign({}, look, { skin: r.pick(L.skin), hair: r.pick(L.hair), cloth: r.pick(L.cloth) });
    out[d.trait] = 2;
    if (kind !== 'anao') out.beard = false;   // a barba do anão vem do traço; elfo e fera não têm
    return out;
  };
  // faz de alguém (recém-criado como humano) gente de um povo
  Pv.make = function (S, p, kind, look) {
    const d = Pv.DEF[kind];
    if (!d || kind === 'humano') return p;
    p.povo = kind; p.sangue = { [kind]: 1 }; p.velho = d.old;
    p.look = look || Pv.lookOf(S, kind, p.sex, p.look);
    delete p.dons;
    return p;
  };
  Pv.pickName = function (S, kind, sex, used) {
    const pool = (Pv.NAMES[kind] || {})[sex === 'F' ? 'F' : 'M'] || [];
    const taken = new Set(S.people.filter((q) => q.alive).map((q) => q.name));
    if (used) for (const u of used) taken.add(u);
    const free = pool.filter((n) => !taken.has(n));
    const name = S.rng.pick(free.length ? free : pool);
    if (used) used.add(name);
    return name;
  };
  // tem gente de outro povo na aldeia? (o que liga tudo o que é de convivência)
  Pv.mixed = (S) => !!(S.povos && S.povos.mixed);
  function recount(S) {
    const P = S.povos; if (!P) return;
    const n = { humano: 0, elfo: 0, anao: 0, fera: 0, meio: 0 };
    for (const p of S.people) if (p.alive) n[Pv.of(p)] = (n[Pv.of(p)] || 0) + 1;
    P.n = n;
    P.mixed = n.elfo + n.anao + n.fera + n.meio > 0;
  }
  Pv.recount = recount;
  Pv.count = (S, kind) => (S.povos && S.povos.n ? S.povos.n[kind] || 0 : kind === 'humano' ? S.people.filter((p) => p.alive).length : 0);

  // ---------- o que os dons e o corpo mudam ----------
  Pv.canWork = function (p, wk) {
    const f = Pv.fraqOf(p);
    if (f === 'arvore' && wk === 'madeira') return false;
    if (f === 'seco' && wk === 'pesca') return false;
    return true;
  };
  // velocidade num trabalho (só para quem tem sangue de outro povo; 'forja' é o Ofício na ferraria)
  Pv.speed = function (S, p, wk) {
    const ds = Pv.donsOf(p);
    let s = 1;
    if ((wk === 'pedra' || wk === 'mina') && ds.indexOf('pedra') >= 0) s *= C.DOM_PEDRA;
    if ((wk === 'construir' || wk === 'caminho' || wk === 'cerca') && ds.indexOf('obra') >= 0) s *= C.DOM_OBRA;
    if (wk === 'frutas' && ds.indexOf('mata') >= 0) s *= C.DOM_MATA;
    if (wk === 'forja' && ds.indexOf('ferreiro') >= 0) s *= C.DOM_FERREIRO;
    return s;
  };
  // aprender: o versátil (todo humano, e o mestiço que herdou) aprende mais depressa vivendo com outros povos
  Pv.xp = (S, p) => (Pv.mixed(S) && Pv.has(p, 'versatil') ? C.DOM_VERSATIL : 1);
  Pv.cacaHit = (p) => (Pv.has(p, 'arqueiro') ? C.DOM_ARQUEIRO_HIT : 0);
  Pv.cacaReach = (p) => (Pv.has(p, 'arqueiro') ? C.DOM_ARQUEIRO_R : 0);
  Pv.cacaMeat = (p) => (Pv.has(p, 'faro') ? C.DOM_FARO_CARNE : 0);
  Pv.lutaHit = (p) => (Pv.has(p, 'garras') ? C.DOM_GARRAS_HIT : 0);
  Pv.bite = (p) => (Pv.has(p, 'garras') ? C.DOM_GARRAS_BITE : 1);
  Pv.sight = (p) => (Pv.has(p, 'vista') ? C.DOM_VISTA : 1);
  // quem pode forjar: o ferreiro nato, ou quem já é bom de Ofício
  Pv.canForge = (S, p) => (p.sangue && Pv.has(p, 'ferreiro')) || G.AI.lvl(p, 'oficio') >= C.FORJA_LVL;

  // ---------- herança: o filho de dois povos ----------
  Pv.inherit = function (S, baby, mom, dad) {
    if (!(mom && mom.sangue) && !(dad && dad.sangue)) return;   // humano com humano: nada muda
    const a = Pv.blood(mom), b = dad ? Pv.blood(dad) : a, bl = {};
    for (const k in a) bl[k] = (bl[k] || 0) + a[k] / 2;
    for (const k in b) bl[k] = (bl[k] || 0) + b[k] / 2;
    // sangue de menos de um oitavo se dilui; quem tem sete oitavos de um povo é desse povo
    let sum = 0, top = null;
    for (const k in bl) { if (bl[k] < 0.124) delete bl[k]; else sum += bl[k]; }
    for (const k in bl) { bl[k] = +(bl[k] / sum).toFixed(3); if (!top || bl[k] > bl[top]) top = k; }
    const pure = bl[top] >= 0.874, r = S.rng;
    // a aparência: as cores de um dos pais, e os traços na medida do sangue
    const src = dad && r.chance(0.5) ? dad : mom;
    baby.look.skin = src.look.skin; baby.look.cloth = (dad && r.chance(0.5) ? dad : mom).look.cloth;
    for (const k of Pv.OUTROS) { const sh = pure ? (k === top ? 1 : 0) : bl[k] || 0; baby.look[Pv.DEF[k].trait] = sh >= 0.75 ? 2 : sh >= 0.25 ? 1 : 0; }
    baby.look.beard = false;
    if (pure && top === 'humano') return;   // o sangue de fora se diluiu: humano de novo
    baby.povo = pure ? top : 'meio';
    baby.sangue = pure ? { [top]: 1 } : bl;
    let old = 0;
    for (const k in baby.sangue) old += Pv.DEF[k].old * baby.sangue[k];
    if (!pure) {
      // um dom de cada lado (diferentes) e a ponte; com o Sangue bom de um dos pais, vive os anos do povo que vive mais
      const pool = (q) => Pv.donsOf(q).filter((d) => d !== 'ponte');
      const d1 = r.pick(pool(mom)), rest = pool(dad || mom).filter((d) => d !== d1), d2 = rest.length ? r.pick(rest) : null;
      baby.dons = [d1].concat(d2 ? [d2] : [], ['ponte']);
      if (Pv.has(mom, 'sangue') || (dad && Pv.has(dad, 'sangue'))) for (const k in baby.sangue) old = Math.max(old, Pv.DEF[k].old);
    }
    baby.velho = Math.round(old);
  };
  // o nome do bebê: de pai e mãe do mesmo povo de fora, um nome desse povo
  Pv.babyName = function (S, sex, mom, dad) {
    const k = mom && dad && mom.povo && mom.povo === dad.povo && Pv.NAMES[mom.povo] ? mom.povo : null;
    return k ? Pv.pickName(S, k, sex) : null;
  };

  // ---------- convivência ----------
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  Pv.conv = function (S, a, b) {
    if (a === b || !S.povos) return 100;
    const v = S.povos.conv[key(a, b)];
    return v === undefined ? C.CONV_START : v;
  };
  // os dois povos já viraram um só? (a união não se desfaz)
  Pv.united = (S, a, b) => !!(S.povos && S.povos.uni && S.povos.uni[key(a, b)]);
  // routine: o dia a dia (conversa, história, pregação, mestiços) tem teto por par de povos por dia; o que acontece
  // de vez em quando (festa, casal, filho, pazes, briga) soma por fora
  function addConv(S, a, b, d, routine) {
    if (a === b || !S.povos || !d) return;
    const P = S.povos, k = key(a, b);
    if (P.uni && P.uni[k]) return;
    if (routine && d > 0) {
      const day = P.day || (P.day = {});
      const room = C.CONV_DAY * (a === 'humano' || b === 'humano' ? C.CONV_DAY_HUM : 1) - (day[k] || 0);
      if (room <= 1e-9) return;
      d = Math.min(d, room);
      day[k] = +((day[k] || 0) + d).toFixed(4);
    }
    const old = Pv.conv(S, a, b), v = U.clamp(old + d, 0, 100);
    P.conv[k] = +v.toFixed(3);
    if (v >= 100) {
      (P.uni || (P.uni = {}))[k] = S.t;
      S.stats.unioes = (S.stats.unioes || 0) + 1;
      Sim().chron(S, cap(Pv.DEF[a].os) + ' e ' + Pv.DEF[b].os + ' já não se veem como dois povos: viraram um só.');
      for (const p of S.people) if (p.alive) Sim().addMem(S, p, 'povoUnido');
      if (G.Life && G.Life.party) G.Life.party(S, 'uniao');
    } else if (v < C.CONV_LOW && old >= C.CONV_LOW) Sim().toast(S, cap(Pv.DEF[a].os) + ' e ' + Pv.DEF[b].os + ' andam se estranhando: vão brigar mais e se juntar menos. Festa e história aproximam.', 'warn');
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // entre duas pessoas: muda a convivência de cada par de povos dos dois (o mestiço divide pelos lados)
  function between(S, p, q, d, routine) {
    const A = Pv.sides(p), B = Pv.sides(q);
    let n = 0;
    for (const a of A) for (const b of B) if (a !== b) n++;
    if (!n) return;
    for (const a of A) for (const b of B) if (a !== b) addConv(S, a, b, d / n, routine);
  }
  // a convivência entre duas pessoas: a pior entre os povos dos dois (100 se são do mesmo povo)
  Pv.pair = function (S, p, q) {
    if (!Pv.mixed(S)) return 100;
    let v = 100;
    for (const a of Pv.sides(p)) for (const b of Pv.sides(q)) v = Math.min(v, Pv.conv(S, a, b));
    return v;
  };
  const diff = (p, q) => (p.povo || 'humano') !== (q.povo || 'humano') || p.povo === 'meio';
  Pv.onChat = function (S, a, b, kind) {
    if (!Pv.mixed(S) || !diff(a, b)) return;
    if (kind === 'briga') { between(S, a, b, -C.CONV_BRIGA); return; }
    const dbl = Pv.has(a, 'acolhedor') || Pv.has(b, 'acolhedor') ? 2 : 1;
    if (kind === 'pazes') between(S, a, b, C.CONV_PAZES * dbl);
    else between(S, a, b, (kind === 'ensino' || kind === 'consolo' ? C.CONV_CHAT * 4 : C.CONV_CHAT) * dbl, true);
  };
  // história e pregação: todo mundo que estava junto se aproxima (d por par de povos presentes; conta no teto do dia)
  Pv.onGather = function (S, list, d, party) {
    if (!Pv.mixed(S)) return;
    const ks = new Set();
    for (const p of list) for (const k of Pv.sides(p)) ks.add(k);
    const arr = [...ks];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) addConv(S, arr[i], arr[j], d, !party);
  };
  // a festa: um acontecimento, soma por fora do teto do dia
  Pv.onParty = (S, list, d) => Pv.onGather(S, list, d, true);
  Pv.onBond = function (S, a, b) {
    if (!Pv.mixed(S) || !diff(a, b)) return;
    between(S, a, b, C.CONV_CASAL);
    S.stats.casaisMistos = (S.stats.casaisMistos || 0) + 1;
    if (S.stats.casaisMistos === 1) Sim().chron(S, a.name + ' e ' + b.name + ' são o primeiro casal de povos diferentes: ' + art(a) + ' e ' + art(b) + '.');
  };
  const art = (p) => (Pv.of(p) === 'meio' ? (p.sex === 'F' ? 'uma ' : 'um ') + Pv.label(p) : (p.sex === 'F' ? 'uma ' : 'um ') + Pv.label(p));
  Pv.onBirth = function (S, baby, mom, dad) {
    if (!baby.sangue) return;
    recount(S);
    if (baby.povo !== 'meio') return;
    if (mom && dad) between(S, mom, dad, C.CONV_FILHO);
    S.stats.mesticos = (S.stats.mesticos || 0) + 1;
    if (S.stats.mesticos === 1) Sim().chron(S, baby.name + ' é a primeira criança de dois povos: ' + Pv.label(baby) + '. Herdou um dom de cada lado, e vai ser ponte entre eles.');
  };
  // brigas e pares entre povos que se estranham
  Pv.fightMult = function (S, a, b) {
    if (!Pv.mixed(S) || !diff(a, b)) return 1;
    const v = Pv.pair(S, a, b);
    return v >= 50 ? 1 - (v - 50) / 50 * 0.3 : 1 + (50 - v) / 50 * C.CONV_FIGHT;
  };
  Pv.bondMult = function (S, a, b) {
    if (!Pv.mixed(S) || !diff(a, b)) return 1;
    return U.clamp(Pv.pair(S, a, b) / 50, 0.3, 1.5);
  };
  // filhos: o casal é tão fértil quanto os dois (a média geométrica)
  Pv.fert = (w, m) => Math.sqrt(Pv.body(w).fert * Pv.body(m).fert);

  // ---------- as caravanas ----------
  // de onde vem cada povo: o que há em volta do acampamento decide quem chega primeiro
  function terrain(S) {
    const w = S.world, cx = S.camp.x, cy = S.camp.y, R = 34, T = G.T;
    let tree = 0, rock = 0, mount = 0, grass = 0;
    for (let y = Math.max(1, cy - R); y < Math.min(w.H - 1, cy + R); y += 2) for (let x = Math.max(1, cx - R); x < Math.min(w.W - 1, cx + R); x += 2) {
      const t = w.tile[y * w.W + x];
      if (t === T.MOUNTAIN) mount++; else if (!G.IS_WATER[t]) grass++;
    }
    for (const o of w.objs) if (Math.abs(o.x - cx) < R && Math.abs(o.y - cy) < R) { if (o.k === 'tree' || o.k === 'stump') tree++; else if (o.k === 'rock') rock++; }
    return { elfo: tree / 14, anao: mount / 6 + rock / 5, fera: grass / 55 - tree / 40 };
  }
  Pv.terrain = terrain;
  function nextKind(S) {
    const P = S.povos;
    if (!P.order) { const t = terrain(S); P.order = Pv.OUTROS.slice().sort((a, b) => t[b] - t[a] || a.localeCompare(b)); }
    for (const k of P.order) if (P.st[k].state === 'longe') return k;
    for (const k of P.order) if (P.st[k].state === 'recusado' && P.st[k].n < 2 && S.t >= P.st[k].at + C.POVO_VOLTA_D * DAY()) return k;
    return null;
  }
  Pv.nextKind = nextKind;
  // a caravana: um casal com um filho e mais um ou dois adultos sem par (daí nascem os casais mistos)
  function members(S, kind) {
    const N = G.Narr, used = new Set(), r = S.rng;
    const mk = (sex, body, role) => {
      const pd = N.visitorData(S, sex, Pv.realAge(kind, body), role, used);
      pd.name = Pv.pickName(S, kind, sex, used);
      pd.povo = kind; pd.look = Pv.lookOf(S, kind, sex, pd.look);
      return pd;
    };
    const mom = mk('F', r.int(24, 34), 'mae'), dad = mk('M', r.int(24, 38), 'pai');
    const kid = mk(r.chance(0.5) ? 'F' : 'M', r.int(4, 12), 'filho');
    const out = [mom, dad, kid, mk(r.chance(0.5) ? 'F' : 'M', r.int(18, 28), 'so')];
    if (r.chance(0.6)) out.push(mk(out[3].sex === 'F' ? 'M' : 'F', r.int(18, 30), 'so'));
    return out;
  }
  function spawn(S, kind) {
    const N = G.Narr, P = S.povos;
    if (!N || !N.spawnPovo) return null;
    const g = N.spawnPovo(S, kind, members(S, kind));
    if (!g) return null;
    const st = P.st[kind];
    st.state = 'vindo'; st.gid = g.id; st.at = S.t; st.n = (st.n || 0) + 1;
    P.due = null; P.called = false;
    return g;
  }
  Pv.spawn = spawn;
  // o que cada povo traz quando é acolhido
  Pv.GIFTS = {
    elfo: { seca: 15, frutas: 10 },
    anao: { ferro: 3, minerio: 4, carvao: 4 },
    fera: { carne: 16, couro: 6 },
  };
  // o que trazem (long: com o que ensinam, para a janela de quem pede para ficar)
  Pv.giftText = function (kind, long) {
    return kind === 'anao' ? (long ? 'a mineração e a metalurgia, ' : '') + 'três ferramentas de ferro, minério e carvão' :
      kind === 'elfo' ? 'cestos de fruta seca e fruta fresca' + (long ? ' e, para quem já usa a lança, o arco' : '') : 'carne de caça e couro curtido';
  };
  // "os elfos ficaram", "o povo-fera ficou": o verbo concorda com o nome do povo
  const verb = (kind, pl, sg) => (Pv.DEF[kind].um1 ? sg : pl);
  // chamados pelo Narrador quando a caravana é acolhida ou mandada seguir
  Pv.onWelcome = function (S, kind, made) {
    const P = S.povos, st = P.st[kind], Sm = Sim(), gift = Pv.GIFTS[kind] || {};
    st.state = 'aqui'; st.at = S.t;
    for (const k in gift) if (S.stock[k] !== undefined) S.stock[k] += gift[k];
    const first = !S.stats.povosAcolhidos;
    S.stats.povosAcolhidos = (S.stats.povosAcolhidos || 0) + 1;
    recount(S);
    // os anões ensinam a mina e a forja; os elfos, o arco (a quem já tem a lança)
    const teacher = made.find((m) => m.role !== 'filho') || made[0];
    if (kind === 'anao' && G.Minas) for (const id of ['mineracao', 'metalurgia']) G.Minas.teach(S, id, teacher ? teacher.p : null);
    if (kind === 'elfo' && G.Inv && Tech().known(S, 'lanca') && !Tech().known(S, 'arco') && G.Inv.DEF.arco) G.Inv.invent(S, 'arco', teacher ? teacher.p : null, 'povo');
    Sm.chron(S, cap(Pv.DEF[kind].os) + verb(kind, ' ficaram. Trouxeram ', ' ficou. Trouxe ') + Pv.giftText(kind) + '.' + (first ? ' Agora a aldeia tem mais de um povo: a convivência entre eles começa baixa, e cresce com conversa, festa e história.' : ''));
    if (S.vontades && S.vontades.mina === undefined) S.vontades.mina = C.DEFAULT_VONTADES.mina || 2;
    P.next = S.t + Math.round((C.POVO_GAP_D[0] + S.rng.next() * (C.POVO_GAP_D[1] - C.POVO_GAP_D[0])) * DAY());
    S.events.push({ k: 'povo', kind, on: true });
  };
  Pv.onRefused = function (S, kind) {
    const P = S.povos, st = P.st[kind];
    st.state = 'recusado'; st.at = S.t;
    S.stats.povosRecusados = (S.stats.povosRecusados || 0) + 1;
    P.next = S.t + Math.round((C.POVO_GAP_D[0] + S.rng.next() * (C.POVO_GAP_D[1] - C.POVO_GAP_D[0])) * DAY());
    if (st.n < 2) Sim().toast(S, cap(Pv.DEF[kind].os) + verb(kind, ' seguiram viagem. Dizem que passam', ' seguiu viagem. Diz que passa') + ' de novo daqui a uns anos.', '');
  };
  // a caravana se perdeu no caminho (sem lugar para chegar): volta a ser esperada
  Pv.onLost = function (S, kind) { const st = S.povos && S.povos.st[kind]; if (st && st.state === 'vindo') { st.state = st.n > 1 ? 'recusado' : 'longe'; st.n = Math.max(0, st.n - 1); } };

  // Deus chama um povo (nível 2, POVO_CALL de Poder): a caravana sai na manhã seguinte
  Pv.callWhy = function (S, kind) {
    const P = S.povos, g = S.god;
    if (!P || !Pv.DEF[kind] || kind === 'humano') return 'povo desconhecido';
    if (!G.Deus || G.Deus.level(S) < C.POVO_CALL_LV) return 'chega no nível ' + C.POVO_CALL_LV + ' de Deus';
    if (P.st[kind].state === 'vindo' || P.due) return 'já há uma caravana a caminho';
    if (G.Narr && G.Narr.pending(S)) return 'há viajantes esperando resposta';
    if (g.poder < C.POVO_CALL) return 'faltam ' + Math.ceil(C.POVO_CALL - g.poder) + ' de Poder';
    return '';
  };
  Pv.call = function (S, kind) {
    if (Pv.callWhy(S, kind)) return false;
    const P = S.povos;
    S.god.poder -= C.POVO_CALL;
    P.due = kind; P.called = true;
    S.stats.povosChamados = (S.stats.povosChamados || 0) + 1;
    Sim().toast(S, 'Você chamou ' + Pv.DEF[kind].os + '. Uma caravana se põe a caminho.', 'good');
    return true;
  };

  // ---------- estado, hora e dia ----------
  Pv.init = function (S) {
    const P = S.povos || (S.povos = { conv: {}, st: {}, next: 0, order: null, due: null, called: false });
    P.conv = P.conv || {}; P.st = P.st || {};
    for (const k of Pv.OUTROS) P.st[k] = P.st[k] || { state: 'longe', n: 0, at: 0 };
    P.uni = P.uni || {}; P.day = P.day || {};
    for (const k in P.conv) if (P.conv[k] >= 100 && !P.uni[k]) P.uni[k] = S.t;
    recount(S);
    const st = S.stats;
    // save de antes da 0.12 já na fase da aldeia: ganha as missões dos povos (uma vez)
    if (!st.povoMissions) {
      st.povoMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of Pv.missions(f)) if (!S.goals.some((g) => g.id === m.id)) S.goals.push(m);
    }
  };
  // de manhã, com o caminho livre, a caravana esperada aparece na beira do mapa
  Pv.hourly = function (S) {
    const P = S.povos;
    if (!P || !P.due || S.safe || S.over) return;
    const h = S.ck.hour, N = G.Narr;
    if (h < 8 || h >= 15 || (S.ck.season === 3 && !P.called)) return;
    if (!N || Object.keys(S.narr.groups).length || N.beastsOut(S) || N.is(S, 'nevasca') || N.is(S, 'tempestade')) return;
    const kind = P.due;
    if (spawn(S, kind)) {
      Sim().toast(S, 'Uma caravana ' + Pv.DEF[kind].de + ' vem pela trilha.', '');
      S.events.push({ k: 'narr', ev: 'povo', on: true });
    }
  };
  Pv.daily = function (S) {
    const P = S.povos;
    if (!P) return;
    recount(S);
    P.day = {};   // o teto do dia a dia recomeça
    // a ponte: cada mestiço aproxima um pouco os povos que tem no sangue
    if (P.mixed) {
      for (const p of S.people) {
        if (!p.alive || p.povo !== 'meio' || !p.sangue || Fam().age(S, p) < 3) continue;
        const ks = Object.keys(p.sangue);
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) addConv(S, ks[i], ks[j], C.CONV_PONTE, true);
      }
    }
    if (S.safe || S.over || S.resumido) return;
    // quando sai a próxima caravana: a primeira, algum tempo depois de a aldeia se formar (ou no ano 6); as outras, com folga
    const alive = S.people.filter((p) => p.alive).length;
    if (!P.next) {
      if (S.stats.eraEnd) P.next = S.stats.eraEnd + Math.round((C.POVO_FIRST_D[0] + S.rng.next() * (C.POVO_FIRST_D[1] - C.POVO_FIRST_D[0])) * DAY());
      else if (S.ck.year >= C.POVO_YEAR && alive >= C.POVO_MIN_POP) P.next = S.t + Math.round((5 + S.rng.next() * 10) * DAY());
      return;
    }
    if (P.due || S.t < P.next || alive < C.POVO_MIN_POP || alive >= C.POVO_MAX_POP) return;
    const kind = nextKind(S);
    if (kind) P.due = kind;
    else P.next = S.t + 30 * DAY();
  };

  // ---------- metas ----------
  Pv.missions = function (phase) {
    if (phase === 4) return [
      { id: 'p_acolher', text: 'Acolha um povo de fora', opt: true, reward: 8, done: false },
      { id: 'p_casal', text: 'Veja um casal de povos diferentes', opt: true, reward: 6, done: false },
      { id: 'p_hibrido', text: 'Veja nascer um filho de dois povos', opt: true, reward: 10, done: false },
      { id: 'p_tres', text: 'Tenha os quatro povos na aldeia', opt: true, reward: 12, done: false },
      { id: 'p_uniao', text: 'Leve dois povos a viver como um só', opt: true, reward: 15, done: false },
    ];
    return [];
  };
  Pv.goalTest = {
    p_acolher: (S) => (S.stats.povosAcolhidos || 0) > 0,
    p_casal: (S) => (S.stats.casaisMistos || 0) > 0,
    p_hibrido: (S) => (S.stats.mesticos || 0) > 0,
    p_tres: (S) => !!S.povos && Pv.OUTROS.every((k) => S.povos.st[k].state === 'aqui' && Pv.count(S, k) > 0),
    p_uniao: (S) => (S.stats.unioes || 0) > 0,
  };
  // para a interface: o estado de cada povo numa frase
  Pv.status = function (S, kind) {
    const P = S.povos, n = Pv.count(S, kind);
    if (kind === 'humano') return n + (n === 1 ? ' pessoa' : ' pessoas');
    const st = P ? P.st[kind] : null;
    if (!st) return '';
    if (st.state === 'aqui') return n ? n + ' na aldeia' : 'Já moraram aqui, mas não resta ninguém';
    if (st.state === 'vindo') return 'Uma caravana vem a caminho';
    if (st.state === 'recusado') return st.n < 2 ? 'O povo mandou seguir. Passam de novo um dia' : 'O povo mandou seguir duas vezes. Só voltam se você chamar';
    return P.due === kind ? 'Uma caravana está para sair' : 'Ainda não vieram';
  };
})(globalThis.G = globalThis.G || {});
