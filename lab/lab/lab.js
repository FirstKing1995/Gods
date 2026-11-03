/* Gods · laboratório de estilo. Roda o jogo de verdade numa vila de teste e deixa trocar, ao vivo:
   o cenário (a arte atual, Kenney Tiny Town, Cozy da Ishtar Pixels), a camada de clima (luz, noite azulada,
   brilho do fogo, vaga-lumes, pólen), o som ambiente (o sintetizado de hoje ou gravações reais) e a música
   (a de hoje, gerada, ou faixas gravadas com silêncio entre elas).
   Tudo aqui é CC0: ver lab/CREDITOS.md. Os saves e o som deste laboratório não se misturam com os do jogo. */
(function (G) {
  'use strict';
  const KEY = 'gods-lab.config';
  const BASE = { cena: 'atual', clima: true, amb: 'grav', ambSet: 1, mus: 'faixas', vAmb: 0.8, vMus: 0.5 };
  let cfg = Object.assign({}, BASE);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem guardar */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* sem guardar */ } };
  const LAB = G.Lab = { cfg };

  // ---------- a vila de teste: abre já crescida (39 pessoas, casas, roça) ----------
  function vilaPronta(forcar) {
    const C = G.CFG;
    try {
      if (!forcar && localStorage.getItem(C.SAVE_KEY)) return;
      const x = new XMLHttpRequest();
      x.open('GET', 'lab/vila.json', false); x.send();
      if (x.status !== 200) return;
      for (const k of Object.keys(localStorage)) if (k.indexOf(C.SAVE_KEY) === 0) localStorage.removeItem(k);
      const d = JSON.parse(x.responseText);
      d.savedAt = Date.now();   // sem o resumo de quem esteve fora
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(d));
    } catch (e) { /* sem a vila, o laboratório abre como o jogo */ }
  }
  vilaPronta(false);

  // ---------- cenário ----------
  const CENAS = {
    kenney: {
      nome: 'Kenney Tiny Town',
      chao: { 3: ['#d08c58', '#eaa56c', '#f4c08e'], 4: ['#6aa857', '#84c669', '#9ed67f'], 5: ['#4f8a45', '#5f9c50', '#76b061'],
        6: ['#78b35e', '#90c470', '#a8d488'], 8: ['#a6b65e', '#bcc870', '#d0d888'],
        0: ['#3f7f9a', '#4f93ad', '#64a8c0'], 1: ['#5aa3b8', '#6fb6c8', '#92cbd8'], 2: ['#5aa3b8', '#6fb6c8', '#92cbd8'] },
      detalhe: { tuft: '#4f8a45', tip: '#b4e08e' },
      arvores: { prim: ['kenney_0016', 'kenney_0005', 'kenney_0028'], ver: ['kenney_0016', 'kenney_0005', 'kenney_0004'], out: ['kenney_0015', 'kenney_0027', 'kenney_0003'] },
      pinheiro: ['kenney_0028', 'kenney_0004', 'kenney_0028'],
      pedras: null,
    },
    cozy: {
      nome: 'Cozy (Ishtar Pixels)',
      chao: { 3: ['#cf8e36', '#ebaa46', '#f2c26a'], 4: ['#6c6818', '#817b1a', '#a4a51e'], 5: ['#5a5216', '#6b6418', '#837e1c'],
        6: ['#7c7a1c', '#928e22', '#acaa2a'], 8: ['#9a8828', '#b09c32', '#c4b244'],
        0: ['#6f8360', '#7a8e69', '#8a9c73'], 1: ['#7f936c', '#8a9c73', '#a3b28c'], 2: ['#7f936c', '#8a9c73', '#a3b28c'] },
      detalhe: { tuft: '#5f521a', tip: '#a4a51e' },
      arvores: { prim: ['cozy_119', 'cozy_118', 'cozy_116'], ver: ['cozy_119', 'cozy_116', 'cozy_119'], out: ['cozy_116', 'cozy_117', 'cozy_118'] },
      pinheiro: ['cozy_119', 'cozy_118', 'cozy_119'],
      pedras: [['cozy_120', 'cozy_122'], ['cozy_124', 'cozy_126'], ['cozy_121', 'cozy_123']],
    },
  };
  const cena = CENAS[cfg.cena];
  if (cena) {
    // as cores do chão valem para primavera, verão e outono; o inverno segue com a neve de sempre
    const A = G.Art;
    for (let s = 0; s < 3; s++) {
      const old = A.TERRAIN[s];
      A.TERRAIN[s] = Object.assign({}, old, cena.chao);
      A.DETAIL[s] = Object.assign({}, A.DETAIL[s], cena.detalhe);
    }
    A.REGION_TERRAIN = [];   // as regiões perdem a cor própria: o pacote manda no chão
    const build0 = A.build;
    A.build = function () {
      const S = build0.apply(this, arguments);
      trocarSprites(S, cena);
      return S;
    };
  }
  function imagem(nome) {
    return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'lab/img/' + nome + '.png'; });
  }
  // a peça do pacote entra no lugar da original assentando no mesmo pé (o render lê _dx/_dy)
  function peca(orig, im) {
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    c.getContext('2d').drawImage(im, 0, 0);
    c._dx = (orig.width - im.width) / 2; c._dy = orig.height - im.height;
    return c;
  }
  async function trocarSprites(S, cn) {
    const nomes = new Set([].concat(cn.arvores.prim, cn.arvores.ver, cn.arvores.out, cn.pinheiro, cn.pedras ? cn.pedras.flat() : []));
    const img = {};
    await Promise.all([...nomes].map(async (n) => { img[n] = await imagem(n); }));
    const est = [cn.arvores.prim, cn.arvores.ver, cn.arvores.out];
    for (let s = 0; s < 3; s++) {
      for (let v = 0; v < 3; v++) {
        const im = img[est[s][v]];
        if (im && S.broad[s][v]) S.broad[s][v] = peca(S.broad[s][v], im);
        const nb = img[est[s][(v + 1) % 3]];
        if (nb && S.nobre[s][v]) S.nobre[s][v] = peca(S.nobre[s][v], nb);
        const pi = img[cn.pinheiro[v]];
        if (pi && S.arau[s][v]) S.arau[s][v] = peca(S.arau[s][v], pi);
      }
    }
    if (cn.pedras) for (let sz = 0; sz < 3; sz++) for (let v = 0; v < 2; v++) {
      const im = img[cn.pedras[sz][v]];
      if (im) S.rock[sz][0][v] = peca(S.rock[sz][0][v], im);
    }
  }

  // ---------- o estado do jogo (o jogo avisa o som a cada quadro) ----------
  let ST = null;
  const frame0 = G.Audio.frame;
  G.Audio.frame = function (state) { ST = state; return frame0.apply(this, arguments); };

  // ---------- clima: luz, noite azulada, brilho do fogo, vaga-lumes e pólen ----------
  let grade = null, fx = null, gx = null, fxx = null;
  const motes = [], flies = [];
  function montaClima() {
    const view = document.getElementById('view');
    const mk = (blend) => {
      const c = document.createElement('canvas');
      c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;mix-blend-mode:' + blend;
      view.after(c);
      return c;
    };
    fx = mk('screen'); grade = mk('soft-light');
    gx = grade.getContext('2d'); fxx = fx.getContext('2d');
    requestAnimationFrame(clima);
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function tom(h) {
    // a cor do ar por hora: manhã fresca, meio-dia claro, fim de tarde dourado, noite azul
    const K = [[0, [40, 70, 150, 0.55]], [5, [60, 80, 160, 0.5]], [6.5, [255, 170, 140, 0.35]], [9, [255, 236, 200, 0.18]], [15, [255, 226, 180, 0.2]],
      [17.5, [255, 160, 80, 0.45]], [19, [200, 110, 140, 0.45]], [20.5, [40, 70, 150, 0.55]], [24, [40, 70, 150, 0.55]]];
    for (let i = 0; i < K.length - 1; i++) {
      const [h0, a] = K[i], [h1, b] = K[i + 1];
      if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return a.map((v, k) => lerp(v, b[k], t)); }
    }
    return K[0][1];
  }
  function clima(now) {
    requestAnimationFrame(clima);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    for (const c of [grade, fx]) if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    gx.setTransform(dpr, 0, 0, dpr, 0, 0); fxx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, W, H); fxx.clearRect(0, 0, W, H);
    const S = ST;
    if (!cfg.clima || !S || document.body.dataset.mode !== 'game') return;
    const h = S.ck.hour, dark = G.R.darkness(h), inverno = S.ck.season === 3;
    // 1) o tom do ar (soft-light: tinge sem lavar) e a vinheta
    const [r, g, b, a] = tom(h);
    gx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a * (S.precip ? 0.5 : 1)).toFixed(3) + ')';
    gx.fillRect(0, 0, W, H);
    const vg = gx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,30,' + (0.35 + dark * 0.3).toFixed(2) + ')');
    gx.fillStyle = vg; gx.fillRect(0, 0, W, H);
    // 2) o brilho quente do fogo e das casas com gente, que cresce com o escuro
    const sc = G.R.scale(), TS = G.CFG.TILE;
    if (dark > 0.05) {
      for (const bd of S.buildings) {
        if (!bd.built) continue;
        const fogo = bd.type === 'fogueira' && bd.fuel > 0;
        const casa = !fogo && (bd.type === 'barraca' || bd.type === 'casa') && dark > 0.3;
        if (!fogo && !casa) continue;
        const p = G.R.toScreen((bd.x + (fogo ? 0.5 : 1)) * TS, (bd.y + (fogo ? 0.4 : 0.8)) * TS);
        const rad = TS * sc * (fogo ? 5 : 1.6) * (1 + Math.sin(now / 120 + bd.id) * (fogo ? 0.04 : 0.01));
        if (p.x < -rad || p.y < -rad || p.x > W + rad || p.y > H + rad) continue;
        const gr = fxx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        const al = (fogo ? 0.55 : 0.22) * Math.min(1, dark * 1.6);
        gr.addColorStop(0, 'rgba(255,170,80,' + al.toFixed(3) + ')'); gr.addColorStop(0.5, 'rgba(255,120,40,' + (al * 0.35).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,90,20,0)');
        fxx.fillStyle = gr; fxx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
      }
    }
    // 3) vaga-lumes de noite (menos no inverno e na chuva) e pólen nas manhãs e tardes
    const px = Math.max(1.5, sc * 0.9);
    if (dark > 0.35 && !inverno && !S.precip) {
      while (flies.length < 26) flies.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8, ph: Math.random() * 6, life: 4 + Math.random() * 6 });
    }
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      f.life -= 1 / 60; f.ph += 0.05; f.x += (f.vx + Math.sin(f.ph) * 8) / 60; f.y += (f.vy + Math.cos(f.ph * 0.7) * 6) / 60;
      if (f.life <= 0 || dark < 0.3) { flies.splice(i, 1); continue; }
      const on = Math.max(0, Math.sin(f.ph * 1.6)) * Math.min(1, f.life);
      if (on < 0.05) continue;
      const gr = fxx.createRadialGradient(f.x, f.y, 0, f.x, f.y, px * 5);
      gr.addColorStop(0, 'rgba(230,255,140,' + (0.9 * on).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(180,255,90,0)');
      fxx.fillStyle = gr; fxx.fillRect(f.x - px * 5, f.y - px * 5, px * 10, px * 10);
    }
    if (dark < 0.2 && !S.precip) while (motes.length < 18) motes.push({ x: Math.random() * W, y: Math.random() * H, vx: 4 + Math.random() * 6, vy: -2 - Math.random() * 3, ph: Math.random() * 6, life: 6 + Math.random() * 8 });
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life -= 1 / 60; m.ph += 0.03; m.x += (m.vx + Math.sin(m.ph) * 5) / 60; m.y += m.vy / 60;
      if (m.life <= 0 || dark > 0.25) { motes.splice(i, 1); continue; }
      fxx.fillStyle = 'rgba(255,240,200,' + (0.35 * Math.min(1, m.life / 2)).toFixed(3) + ')';
      fxx.fillRect(m.x, m.y, px, px);
    }
  }

  // ---------- som ambiente gravado ----------
  // cada camada tem duas opções (1 e 2) para comparar; todas em laço, cruzando conforme a hora, a chuva e o que está perto
  const CAMADAS = ['dia', 'brisa', 'rio', 'noite', 'fogo', 'chuva'];
  let ac = null, mestre = null;
  const camada = {};
  async function abreSom() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    mestre = ac.createGain(); mestre.connect(ac.destination);
    await carregaAmbiente();
    setInterval(ambiente, 250);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ac.suspend(); else ac.resume(); });
  }
  async function carregaAmbiente() {
    for (const k of CAMADAS) { if (camada[k]) { try { camada[k].src.stop(); } catch (e) { /* já parou */ } camada[k] = null; } }
    await Promise.all(CAMADAS.map(async (k) => {
      try {
        const buf = await ac.decodeAudioData(await (await fetch('lab/som/' + k + cfg.ambSet + '.mp3')).arrayBuffer());
        const src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = buf; src.loop = true; g.gain.value = 0;
        src.connect(g); g.connect(mestre); src.start(0, Math.random() * buf.duration);
        camada[k] = { src, g };
      } catch (e) { /* camada que não carregou fica muda */ }
    }));
  }
  function perto(S) {
    const w = S.world, cam = G.R.cam, TS = G.CFG.TILE, cx = Math.floor(cam.x / TS), cy = Math.floor(cam.y / TS);
    let agua = 0, n = 0;
    for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
      n++; if (G.IS_WATER[w.tile[y * w.W + x]]) agua++;
    }
    let fogo = 99;
    for (const b of S.buildings) if (b.type === 'fogueira' && b.built && b.fuel > 0) fogo = Math.min(fogo, Math.hypot(b.x + 0.5 - cam.x / TS, b.y + 0.5 - cam.y / TS));
    return { agua: n ? agua / n : 0, fogo };
  }
  function ambiente() {
    if (!ac) return;
    const t = ac.currentTime, S = ST, jogo = document.body.dataset.mode === 'game';
    mestre.gain.setTargetAtTime(cfg.amb === 'grav' && jogo ? cfg.vAmb : 0, t, 0.6);
    if (!S) return;
    const h = S.ck.hour, inv = S.ck.season === 3, chuva = S.precip === 'chuva';
    const noite = h >= 19.5 || h < 4.8 ? 1 : h >= 18.5 ? (h - 18.5) : h < 5.8 ? (5.8 - h) : 0;
    const dia = 1 - noite;
    const aurora = h >= 5 && h < 8 ? 1.3 : 1;
    const zoom = Math.min(1, 0.45 + G.R.scale() * 0.18);
    const p = perto(S);
    const alvo = {
      dia: dia * (inv ? 0.15 : 0.55) * aurora * (chuva ? 0.15 : 1),
      brisa: 0.22 + (inv ? 0.2 : 0) + (S.precip ? 0.1 : 0),
      rio: Math.min(1, p.agua * 1.6) * 0.7 * zoom,
      noite: noite * (inv ? 0.1 : 0.5) * (chuva ? 0.2 : 1),
      fogo: p.fogo < 14 ? (1 - p.fogo / 14) * 0.75 * zoom : 0,
      chuva: chuva ? 0.7 : S.precip === 'neve' ? 0.08 : 0,
    };
    for (const k of CAMADAS) if (camada[k]) camada[k].g.gain.setTargetAtTime(alvo[k], t, 1.5);
  }
  // o som sintetizado de hoje some quando o gravado está ligado (e volta quando desliga)
  function aplicaSint() {
    try {
      const pref = JSON.parse(localStorage.getItem('gods-lab.audio') || '{}');
      if (cfg.amb === 'grav') { if (!LAB.ambAntes) LAB.ambAntes = pref.amb > 0 ? pref.amb : 0.6; G.Audio.set('amb', 0); }
      else G.Audio.set('amb', LAB.ambAntes || 0.6);
      if (cfg.mus !== 'proc') { if (!LAB.musAntes) LAB.musAntes = pref.music > 0 ? pref.music : 0.5; G.Audio.set('music', 0); }
      else G.Audio.set('music', LAB.musAntes || 0.5);
    } catch (e) { /* segue */ }
  }

  // ---------- música gravada: uma faixa, depois silêncio, depois outra ----------
  const FAIXAS = [
    { arq: 'another-august', nome: 'Another August (cynicmusic)' },
    { arq: 'november-snow', nome: 'November Snow (cynicmusic)' },
    { arq: 'happy-lullaby', nome: 'Happy Lullaby (cynicmusic)' },
    { arq: 'town-theme', nome: 'Town Theme (cynicmusic)' },
  ];
  const tocador = new Audio();
  tocador.preload = 'none';
  let tocando = -1, pausaAte = 0, volAgora = 0;
  function proximaFaixa() {
    const fixa = cfg.mus.indexOf('faixa') === 0 ? +cfg.mus.slice(5) : -1;
    tocando = fixa >= 0 ? fixa : (tocando + 1 + Math.floor(Math.random() * (FAIXAS.length - 1))) % FAIXAS.length;
    tocador.src = 'lab/musica/' + FAIXAS[tocando].arq + '.mp3';
    tocador.currentTime = 0;
    tocador.play().catch(() => {});
    atualizaPainel();
  }
  tocador.addEventListener('ended', () => { pausaAte = performance.now() + 25000 + Math.random() * 45000; tocando = cfg.mus === 'faixas' ? tocando : tocando; atualizaPainel(); });
  setInterval(() => {
    const ligado = cfg.mus !== 'proc' && document.body.dataset.mode === 'game' && !document.hidden && ac;
    const S = ST, noite = S ? G.R.darkness(S.ck.hour) > 0.4 : false;
    const alvo = ligado ? cfg.vMus * (noite ? 0.75 : 1) : 0;
    volAgora += (alvo - volAgora) * 0.08;
    tocador.volume = Math.max(0, Math.min(1, volAgora));
    if (!ligado) { if (!tocador.paused && volAgora < 0.01) tocador.pause(); return; }
    if (tocador.paused && performance.now() > pausaAte) { if (tocador.src && !tocador.ended && tocador.currentTime > 0) tocador.play().catch(() => {}); else proximaFaixa(); }
  }, 100);

  // ---------- o painel ----------
  let painel = null;
  function opcoes(nome, lista, atual) {
    return '<label class="lab-l">' + nome + '<select data-k="' + nome + '">' + lista.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(atual) ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
  }
  function montaPainel() {
    const css = document.createElement('style');
    css.textContent = '#lab-btn{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 74px);z-index:60;font:600 13px var(--px,sans-serif);padding:8px 14px;border-radius:999px;border:2px solid #feae34;background:#262b44;color:#fee761;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35)}' +
      '@media (min-width:821px){#lab-btn{bottom:auto;top:12px}}' +
      '#lab-p{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 120px);z-index:61;width:min(360px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#262b44;color:#ead4aa;border:2px solid #3a4466;box-shadow:inset 0 0 0 2px #181425,0 6px 0 rgba(0,0,0,.35);padding:14px;font:13px/1.4 var(--px,sans-serif);display:grid;gap:10px}' +
      '@media (min-width:821px){#lab-p{bottom:auto;top:56px}}' +
      '#lab-p h3{margin:0;color:#fee761;font-size:15px}#lab-p .lab-l{display:grid;gap:4px}#lab-p select,#lab-p input[type=range]{width:100%;font:inherit;min-height:36px;background:#181425;color:#ead4aa;border:2px solid #3a4466}' +
      '#lab-p .lab-row{display:flex;gap:8px;align-items:center}#lab-p .lab-row input{width:22px;height:22px}#lab-p button{font:inherit;min-height:36px;background:#3a4466;color:#ead4aa;border:0;cursor:pointer}#lab-p small{color:#8b9bb4}';
    document.head.appendChild(css);
    const b = document.createElement('button');
    b.id = 'lab-btn'; b.type = 'button'; b.textContent = 'Laboratório';
    b.addEventListener('click', () => { painel.hidden = !painel.hidden; abreSom(); });
    document.body.appendChild(b);
    painel = document.createElement('div');
    painel.id = 'lab-p'; painel.hidden = true;
    document.body.appendChild(painel);
    desenhaPainel();
  }
  function desenhaPainel() {
    painel.innerHTML = '<h3>Laboratório de estilo</h3>' +
      opcoes('Cenário', [['atual', 'A · arte atual (feita por código)'], ['kenney', 'B · Kenney Tiny Town'], ['cozy', 'C · Cozy (Ishtar Pixels)']], cfg.cena) +
      '<label class="lab-row"><input type="checkbox" data-k="clima"' + (cfg.clima ? ' checked' : '') + '> Clima: luz quente, noite azul, brilho do fogo, vaga-lumes</label>' +
      opcoes('Som ambiente', [['grav', 'Gravado (natureza de verdade)'], ['sint', 'Sintetizado (o de hoje)']], cfg.amb) +
      opcoes('Gravações', [[1, 'Conjunto 1'], [2, 'Conjunto 2']], cfg.ambSet) +
      '<label class="lab-l">Volume do ambiente<input type="range" min="0" max="1" step="0.05" data-k="vAmb" value="' + cfg.vAmb + '"></label>' +
      opcoes('Música', [['faixas', 'Faixas gravadas, com silêncio entre elas'], ['proc', 'A de hoje (gerada pelo jogo)']].concat(FAIXAS.map((f, i) => ['faixa' + i, 'Só: ' + f.nome])), cfg.mus) +
      '<label class="lab-l">Volume da música<input type="range" min="0" max="1" step="0.05" data-k="vMus" value="' + cfg.vMus + '"></label>' +
      '<small id="lab-tocando">' + rotuloTocando() + '</small>' +
      '<div class="lab-row"><button type="button" data-a="hora">Pular 3 horas</button><button type="button" data-a="vila">Vila de teste de novo</button></div>' +
      '<small>Tudo aqui é CC0 (livre para vender): Kenney, Ishtar Pixels, Freesound e OpenGameArt. O cenário troca ao recarregar a página.</small>';
    painel.querySelectorAll('select,input').forEach((el) => el.addEventListener('change', muda));
    painel.querySelectorAll('input[type=range]').forEach((el) => el.addEventListener('input', muda));
    painel.querySelectorAll('button[data-a]').forEach((el) => el.addEventListener('click', acao));
  }
  function rotuloTocando() {
    if (cfg.mus === 'proc') return 'Música: a gerada pelo jogo.';
    if (tocando < 0) return 'Música: começa ao fechar este painel.';
    return tocador.paused ? 'Silêncio entre as músicas…' : 'Tocando: ' + FAIXAS[tocando].nome;
  }
  function atualizaPainel() { const el = document.getElementById('lab-tocando'); if (el) el.textContent = rotuloTocando(); }
  setInterval(atualizaPainel, 2000);
  const MAPA = { 'Cenário': 'cena', 'Som ambiente': 'amb', 'Gravações': 'ambSet', 'Música': 'mus' };
  function muda(e) {
    const el = e.target, k = MAPA[el.dataset.k] || el.dataset.k;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    const antes = cfg[k];
    cfg[k] = k === 'ambSet' ? +v : v;
    save();
    if (k === 'cena' && v !== antes) { location.reload(); return; }
    if (k === 'ambSet' && ac) carregaAmbiente();
    if (k === 'mus') { tocador.pause(); tocando = -1; pausaAte = 0; }
    aplicaSint();
    atualizaPainel();
  }
  function acao(e) {
    const a = e.target.dataset.a;
    if (a === 'hora' && ST) { ST.t += 180; ST.ck = G.Sim.clock(ST.t); }
    if (a === 'vila') { vilaPronta(true); location.reload(); }
  }
  // o som só pode nascer num toque: o primeiro toque na página já abre o laboratório de som
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { abreSom(); }, { once: true, passive: true });

  window.addEventListener('DOMContentLoaded', () => { montaClima(); montaPainel(); aplicaSint(); });
  if (document.readyState !== 'loading') { montaClima(); montaPainel(); aplicaSint(); }
})(globalThis.G);
