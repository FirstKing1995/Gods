/* Gods · as tribos (0.28). Você pode fazer nascer outra tribo no mesmo mapa, longe da primeira. Cada tribo é um estado
   inteiro da simulação (o mesmo motor), e as duas dividem o mapa, a névoa, os bichos, o relógio e o Deus. A primeira
   tribo guarda as outras (S.outras) e a relação entre elas (S.rel); as outras apontam para ela (S.base).
   Quando se encontram, a relação (de -100 a 100) anda sozinha pela fé de cada uma e pelo que você faz: perto de cima,
   trocam o que sobra e alguém vai morar com o outro povo; perto de baixo, roubam comida; no fundo, guerra, e depois
   trégua. Tudo o que acontece entre elas usa um sorteio próprio da relação: a vida de cada tribo não muda por isso. */
(function (G) {
  'use strict';
  const T = G.Tribos = {};
  const C = G.CFG;
  const Sim = () => G.Sim;
  const DAY = () => C.DAY_MIN;

  T.raiz = (S) => (S && S.base) || S;
  T.todas = (S) => { const A = T.raiz(S); return A ? [A].concat(A.outras || []) : []; };
  T.nome = (S) => (S.povo && S.povo.nome) || (S.tribo && S.tribo.nome) || 'a primeira tribo';
  const vivos = (S) => S.people.filter((p) => p.alive);
  const feMedia = (S) => { const v = vivos(S); return v.length ? v.reduce((a, p) => a + p.fe, 0) / v.length : 0; };

  // ---------- nascer uma tribo ----------
  T.criarWhy = function (S) {
    const A = T.raiz(S);
    if (!A || !A.god) return 'ainda não';
    if ((A.outras || []).length >= C.TRIBO_MAX - 1) return 'o mundo já tem ' + C.TRIBO_MAX + ' tribos';
    if (G.Deus && G.Deus.level(A) < C.TRIBO_NIVEL) return 'chega com o nível ' + C.TRIBO_NIVEL + ' de Deus';
    if (A.god.poder < C.TRIBO_CUSTO) return 'custa ' + C.TRIBO_CUSTO + ' de Poder';
    if (!T.lugar(A)) return 'não há lugar bom longe o bastante';
    return null;
  };
  // um lugar bom, longe de toda tribo (de preferência onde ninguém ainda foi)
  T.lugar = function (A) {
    const w = A.world, campos = T.todas(A).map((t) => t.camp);
    let best = null, bestSc = -1e9;
    for (const minD of [C.TRIBO_DIST, C.TRIBO_DIST * 0.65]) {
      for (let y = 12; y < w.H - 12; y += 4) for (let x = 12; x < w.W - 12; x += 4) {
        if (campos.some((c) => Math.hypot(c.x - x, c.y - y) < minD)) continue;
        const s = G.W.evalSite(w, x, y);
        if (!s.valid) continue;
        const sc = Math.min(s.trees, 40) + Math.min(s.rocks, 12) * 2 + Math.min(s.bushes, 20) * 2.5 - s.waterDist * 3 - s.cold * 30 + (s.waterDist <= 1 ? -6 : 0) + (A.seen[y * w.W + x] ? 0 : 8);
        if (sc > bestSc) { bestSc = sc; best = s; }
      }
      if (best) return best;
    }
    return null;
  };
  T.criar = function (S) {
    if (T.criarWhy(S)) return null;
    const A = T.raiz(S), w = A.world, s = T.lugar(A), n = (A.outras || []).length + 1;
    // nomes que ninguém das tribos usa
    const usados = new Set(); for (const t of T.todas(A)) for (const p of t.people) usados.add(p.name);
    const P = Sim().namePool, h = (A.t + n * 7919) >>> 0;
    const livre = (L, k) => { for (let i = 0; i < L.length; i++) { const nm = L[(h + k * 31 + i) % L.length]; if (!usados.has(nm)) return nm; } return L[h % L.length]; };
    const B = Sim().newGame(A.seed, { x: s.x, y: s.y }, [livre(P.FEM, 1), livre(P.MASC, 2)], w);
    // o mesmo relógio, o mesmo Deus, os mesmos bichos e a mesma névoa (o que uma tribo vê, Deus vê)
    for (let i = 0; i < B.seen.length; i++) if (B.seen[i]) A.seen[i] = 1;
    B.seen = A.seen; A.seenRev = (A.seenRev || 0) + 1;
    B.god = A.god; B.fauna = A.fauna;
    B.t = A.t; B.ck = Sim().clock(B.t); B.precip = A.precip; B.temp = A.temp;
    B.rng = new G.RNG(((A.seed ^ 0x9e3779b9) + n * 104729 + Math.floor(A.t)) >>> 0);
    B.base = A;
    B.tribo = { id: n, nome: n === 1 ? 'a segunda tribo' : 'a terceira tribo', t: A.t };
    A.tribo = A.tribo || { id: 0, nome: 'a primeira tribo' };
    A.outras = (A.outras || []).concat([B]);
    A.rel = A.rel || { pares: {} };
    B.rel = A.rel;
    for (const t of T.todas(A)) if (t !== B) T.par(A, t, B);
    A.god.poder -= C.TRIBO_CUSTO;
    const casal = B.people.map((p) => p.name).join(' e '), lugar = s ? G.W.siteLabel(w, s) : '';
    Sim().chron(A, 'Por vontade de ' + (G.Deus ? G.Deus.call(A) : 'Deus') + ', um casal novo, ' + casal + ', chegou ' + lugar + ', longe daqui. Ninguém da aldeia sabe deles ainda.');
    B.chron.push({ t: B.t, text: casal + ' chegaram ' + lugar + '. Começa ' + B.tribo.nome + '.' });
    return B;
  };

  // ---------- a relação entre duas tribos ----------
  const chave = (a, b) => Math.min(a.tribo.id, b.tribo.id) + '-' + Math.max(a.tribo.id, b.tribo.id);
  T.par = function (A, x, y) {
    const pares = A.rel.pares, k = chave(x, y);
    return pares[k] || (pares[k] = { v: 0, contato: false, ult: {}, r: (G.hash2(x.tribo.id + 3, y.tribo.id + 5, A.seed >>> 0) * 4294967296) >>> 0, hist: [] });
  };
  function sorte(par) { par.r = (Math.imul(par.r ^ (par.r >>> 15), 2246822507) + 0x6d2b79f5) >>> 0; return par.r / 4294967296; }
  T.palavra = (v) => (v >= 60 ? 'irmãos' : v >= 25 ? 'amigos' : v > -25 ? 'desconfiados' : v > -60 ? 'inimigos' : 'em guerra');
  function conta(par, x, y, txt, tom) {
    par.hist.push({ t: x.t, txt });
    if (par.hist.length > 12) par.hist.shift();
    for (const t of [x, y]) Sim().chron(t, txt);
    if (tom) for (const t of [x, y]) t.events.push({ k: 'tribo', tom, text: txt });
  }

  // ---------- a cada quadro (de hora em hora e de dia em dia do relógio comum) ----------
  T.passo = function (S) {
    const A = T.raiz(S);
    if (!A || !A.outras || !A.outras.length || A.safe) return;
    const h = Math.floor(A.t / 60), d = Math.floor(A.t / DAY());
    if (A.rel.h === undefined) { A.rel.h = h; A.rel.d = d; }
    if (h !== A.rel.h) { A.rel.h = h; horaria(A); }
    if (d !== A.rel.d) { A.rel.d = d; diaria(A); }
  };
  function perto(x, y, r) {
    for (const p of x.people) if (p.alive && !p.carriedBy && Math.abs(p.x - y.camp.x) <= r && Math.abs(p.y - y.camp.y) <= r) return p;
    return null;
  }
  function horaria(A) {
    const ts = T.todas(A);
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      const x = ts[i], y = ts[j], par = T.par(A, x, y);
      if (par.contato || !vivos(x).length || !vivos(y).length) continue;
      if (G.Eras && G.Eras.temEstacao && G.Eras.temEstacao(x) && G.Eras.temEstacao(y)) { encontro(A, par, x, y, 'Os trilhos dos dois povos se encontraram no meio do caminho, e o primeiro trem levou gente de um lado ao outro.'); continue; }   // 0.32
      if (G.Eras && G.Eras.temRadio && G.Eras.temRadio(x) && G.Eras.temRadio(y)) { encontro(A, par, x, y, 'Girando o botão do rádio, alguém ouviu uma voz de longe: era o outro povo.'); continue; }   // 0.34
      const p = perto(x, y, C.TRIBO_VE) || perto(y, x, C.TRIBO_VE);
      if (p) encontro(A, par, x, y, p.name + ' chegou perto de onde vive ' + (x.people.indexOf(p) >= 0 ? T.nome(y) : T.nome(x)) + '.');
    }
  }
  function encontro(A, par, x, y, como) {
    par.contato = true; par.t0 = A.t;
    // começa pela fé: quem acredita no mesmo Deus desconfia menos
    par.v = Math.round((feMedia(x) + feMedia(y)) / 2 - 50) * 0.4;
    conta(par, x, y, 'Pela primeira vez, ' + T.nome(x) + ' e ' + T.nome(y) + ' se viram. ' + como + ' Os dois povos rezam para o mesmo céu, mas não se conhecem.', 'good');
  }
  function diaria(A) {
    const ts = T.todas(A);
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      const x = ts[i], y = ts[j], par = T.par(A, x, y);
      const nx = vivos(x).length, ny = vivos(y).length;
      if (!nx || !ny) continue;
      if (!par.contato) {
        // caçadores e coletores se cruzam de vez em quando: mais fácil quanto mais perto e maior o povo
        const dist = Math.hypot(x.camp.x - y.camp.x, x.camp.y - y.camp.y);
        const ch = Math.max(0, 1 - dist / C.TRIBO_CRUZA) * Math.min(1, (nx + ny) / 30) * 0.12;
        if (sorte(par) < ch) encontro(A, par, x, y, 'Caçadores dos dois povos se cruzaram no mato.');
        continue;
      }
      // a fé dos dois puxa a relação: muita fé, para cima; pouca, para baixo
      const fe = (feMedia(x) + feMedia(y)) / 2;
      par.v *= 1 - C.TRIBO_VOLTA;   // sem nada acontecendo, a relação volta devagar para o meio
      par.v += fe >= 65 ? C.TRIBO_FE_SOBE : fe < 40 ? -C.TRIBO_FE_SOBE : 0;
      par.v = Math.max(-100, Math.min(100, par.v));
      acontece(A, par, x, y);
    }
  }
  const desde = (A, par, k) => (A.t - (par.ult[k] || -1e9)) / DAY();
  function acontece(A, par, x, y) {
    const v = par.v;
    const trem = G.Eras && G.Eras.temEstacao && G.Eras.temEstacao(x) && G.Eras.temEstacao(y);   // 0.32: de trem, troca-se mais vezes
    if (v >= 25 && desde(A, par, 'troca') >= (trem ? 3 : 5) && sorte(par) < 0.5) { troca(par, x, y); par.ult.troca = A.t; par.v += 2; return; }
    if (v >= 55 && desde(A, par, 'muda') >= 12 && sorte(par) < 0.4 && muda(par, x, y)) { par.ult.muda = A.t; par.v += 5; return; }
    if ((par.tregua || 0) > A.t) return;   // na trégua, ninguém rouba nem guerreia
    if (v <= -25 && desde(A, par, 'roubo') >= C.TRIBO_ROUBO_D && sorte(par) < 0.35) { roubo(par, x, y); par.ult.roubo = A.t; par.v -= 4; return; }
    if (v <= -60 && desde(A, par, 'guerra') >= C.TRIBO_GUERRA_D && sorte(par) < 0.5 && vivos(x).length >= 4 && vivos(y).length >= 4) { guerra(par, x, y); par.ult.guerra = A.t; par.v = -20; par.tregua = A.t + C.TRIBO_TREGUA_D * DAY(); }
  }
  const TROCA = ['peixe', 'frutas', 'carne', 'defumado', 'madeira', 'pedra', 'fibra', 'couro', 'argila', 'tabuas'];
  const NOME = { peixe: 'peixe', frutas: 'frutas', carne: 'carne', defumado: 'defumado', madeira: 'madeira', pedra: 'pedra', fibra: 'fibra', couro: 'couro', argila: 'argila', tabuas: 'tábuas' };
  function sobra(S) { let k = null, n = 0; for (const r of TROCA) if ((S.stock[r] || 0) > n) { n = S.stock[r]; k = r; } return k; }
  function troca(par, x, y) {
    const kx = sobra(x), ky = sobra(y);
    if (!kx || !ky) return;
    const m = G.Eras && G.Eras.temPorto && G.Eras.temPorto(x) && G.Eras.temPorto(y) ? 2 : 1;   // 0.30: de porto a porto, a troca rende o dobro
    const nx = Math.min(25 * m, Math.floor(x.stock[kx] * 0.15 * m)), ny = Math.min(25 * m, Math.floor(y.stock[ky] * 0.15 * m));
    if (nx < 2 || ny < 2) return;
    x.stock[kx] -= nx; y.stock[kx] = (y.stock[kx] || 0) + nx;
    y.stock[ky] -= ny; x.stock[ky] = (x.stock[ky] || 0) + ny;
    for (const t of [x, y]) Sim().aparaEstoque(t);
    conta(par, x, y, 'Gente de ' + T.nome(x) + ' e de ' + T.nome(y) + ' se encontrou na trilha para trocar: foram ' + nx + ' de ' + NOME[kx] + ' para um lado e ' + ny + ' de ' + NOME[ky] + ' para o outro.', 'good');
  }
  function solteiro(S) {
    const F = G.Family;
    return vivos(S).filter((p) => { const a = F.age(S, p); return a >= 18 && a <= 32 && !p.carriedBy && !p.escolhido && !p.preg && !(F.partners && F.partners(S, p).length) && !(G.Avatar && G.Avatar.ativoEm && G.Avatar.ativoEm(S, p)); })
      .sort((a, b) => a.id - b.id);
  }
  // alguém se encanta pelo outro povo e vai morar lá (sai como quem vai embora; chega como gente nova, com o mesmo jeito)
  function muda(par, x, y) {
    const [de, para] = vivos(x).length >= vivos(y).length ? [x, y] : [y, x];
    const cand = solteiro(de);
    if (!cand.length || vivos(de).length < 6) return false;
    const p = cand[Math.floor(sorte(par) * cand.length)], idade = G.Family.age(de, p);
    if (G.Soc && de.soc) G.Soc.sair(de, p, 'foi morar com ' + T.nome(para)); else { p.alive = false; p.fora = de.t; de.people.splice(de.people.indexOf(p), 1); }
    const q = Sim().makePerson(para, p.sex, p.name, idade);
    for (const k of ['traits', 'skills', 'indole', 'povo', 'sangue']) if (p[k] !== undefined) q[k] = JSON.parse(JSON.stringify(p[k]));
    q.fe = p.fe; q.x = para.camp.x + 1.5; q.y = para.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = G.Family.age(para, q);
    para.people.push(q);
    for (const f of ['Family', 'God', 'Deus', 'Tech', 'Life', 'Campo', 'Minas']) if (G[f] && G[f].init) G[f].init(para);
    if (G.Povos && G.Povos.recount) G.Povos.recount(para);
    conta(par, x, y, p.name + ' se encantou pela gente de ' + T.nome(para) + ' e foi morar com ' + (para.people.length > 1 ? 'eles' : 'ela') + '. Os dois povos agora têm parente do outro lado.', 'good');
    return true;
  }
  function roubo(par, x, y) {
    // rouba quem tem menos fé (ou menos comida)
    const [ladrao, vitima] = feMedia(x) <= feMedia(y) ? [x, y] : [y, x];
    const levou = [];
    for (const k of ['peixe', 'frutas', 'carne', 'defumado']) {
      const n = Math.floor((vitima.stock[k] || 0) * 0.15);
      if (n < 2) continue;
      vitima.stock[k] -= n; ladrao.stock[k] = (ladrao.stock[k] || 0) + n; levou.push(n + ' de ' + NOME[k]);
    }
    Sim().aparaEstoque(ladrao);
    if (!levou.length) return;
    conta(par, x, y, 'Gente de ' + T.nome(ladrao) + ' entrou de noite no estoque de ' + T.nome(vitima) + ' e levou ' + levou.join(', ') + '.', 'warn');
  }
  function guerra(par, x, y) {
    const mortos = [];
    const seguros = [];
    for (const t of [x, y]) {
      if (G.Eras && G.Eras.temCastelo && G.Eras.temCastelo(t)) { seguros.push(T.nome(t)); continue; }   // 0.29: o castelo segura
      const outro = t === x ? y : x, polv = (k) => G.Eras && G.Eras.temArsenal && G.Eras.temArsenal(k);   // 0.31: a pólvora
      const n = Math.max(polv(t) ? 0 : 1, (vivos(t).length > 40 ? 2 : 1) - (polv(t) ? 1 : 0) + (polv(outro) ? 1 : 0));
      const lut = vivos(t).filter((p) => !p.carriedBy && G.Family.age(t, p) >= 16).sort((a, b) => a.id - b.id);
      for (let k = 0; k < n && lut.length; k++) {
        const p = lut.splice(Math.floor(sorte(par) * lut.length), 1)[0];
        p.needs.saude = 0; p.dmg = p.dmg || {}; p.dmg.guerra = 100;
        Sim().die(t, p);
        p.cause = 'guerra';
        mortos.push(p.name + ' (' + T.nome(t) + ')');
      }
      for (const k of ['madeira', 'pedra', 'peixe', 'frutas']) t.stock[k] = Math.floor((t.stock[k] || 0) * 0.85);
    }
    conta(par, x, y, 'Guerra entre ' + T.nome(x) + ' e ' + T.nome(y) + '. ' + (mortos.length ? 'Morreram ' + mortos.join(', ') + '. ' : '') + (seguros.length ? 'O castelo de ' + seguros.join(' e de ') + ' segurou o ataque. ' : '') + 'Depois do sangue, os dois povos fizeram uma trégua de ' + C.TRIBO_TREGUA_D + ' dias, mas não esquecem.', 'warn');
  }

  // ---------- o que Deus faz pela relação ----------
  T.influirWhy = function (S, x, y, k) {
    const A = T.raiz(S), par = A.rel && A.rel.pares[chave(x, y)];
    if (!par || !par.contato) return 'os dois povos ainda não se conhecem';
    const custo = k === 'paz' ? C.TRIBO_PAZ : C.TRIBO_DISCORDIA;
    if (A.god.poder < custo) return 'custa ' + custo + ' de Poder';
    if (A.t - (par.ult.deus || -1e9) < DAY()) return 'uma vez por dia';
    return null;
  };
  T.influir = function (S, x, y, k) {
    if (T.influirWhy(S, x, y, k)) return false;
    const A = T.raiz(S), par = T.par(A, x, y);
    A.god.poder -= k === 'paz' ? C.TRIBO_PAZ : C.TRIBO_DISCORDIA;
    par.ult.deus = A.t;
    if (k === 'paz') {
      par.v = Math.min(100, par.v + C.TRIBO_INFLUI);
      conta(par, x, y, 'Na mesma noite, gente de ' + T.nome(x) + ' e de ' + T.nome(y) + ' sonhou com o mesmo fogo, e acordou com saudade de quem nem conhece direito.', 'good');
    } else {
      par.v = Math.max(-100, par.v - C.TRIBO_INFLUI);
      conta(par, x, y, 'Um boato correu entre ' + T.nome(x) + ' e ' + T.nome(y) + ': cada povo jura que o outro anda rondando à noite.', 'warn');
    }
    return true;
  };
  T.pares = function (S) {
    const A = T.raiz(S), ts = T.todas(A), out = [];
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) out.push({ x: ts[i], y: ts[j], i, j, par: T.par(A, ts[i], ts[j]) });
    return out;
  };
})(globalThis.G = globalThis.G || {});
