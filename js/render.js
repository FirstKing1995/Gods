/* Gods · renderizador: terreno em blocos, objetos, pessoas, luz da noite e clima. */
(function (G) {
  'use strict';
  const C = G.CFG, A = G.Art, T = G.T, U = G.U;
  const R = G.R = {};
  const TS = C.TILE, CH = C.CHUNK, CPX = TS * CH;
  const IS_WATER = G.IS_WATER;

  let cv, ctx, W = 0, H = 0, dpr = 1, sc = 3, ox = 0, oy = 0;
  const cam = R.cam = { x: 1024, y: 1024, zoom: 3 };
  const chunks = new Map();
  let chunkKey = '';
  let light, lctx;
  const parts = [];
  const drops = [], splashes = [];
  const bolts = [];
  const spears = [];
  const stars = [], flocks = [], glows = [];   // Etapa 6: estrela cadente, araras, vaga-lumes
  let lastNow = 0;
  R.overlay = { ghost: null, ring: null, selPerson: 0, selBuilding: 0, follow: 0 };   // follow: quem a câmera segue

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    [light, lctx] = A.mk(8, 8);
    R.resize();
  };
  R.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.max(1, Math.floor(cv.clientWidth * dpr)); H = Math.max(1, Math.floor(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    light.width = Math.max(1, Math.ceil(W / 4)); light.height = Math.max(1, Math.ceil(H / 4));
  };
  function scale() { const s = cam.zoom * dpr; return s >= 1 ? Math.max(1, Math.round(s)) : s; }
  R.scale = () => sc / dpr;
  R.toScreen = function (wx, wy) { return { x: (wx * sc + ox) / dpr, y: (wy * sc + oy) / dpr }; };
  R.toWorld = function (sx, sy) { return { x: (sx * dpr - ox) / sc, y: (sy * dpr - oy) / sc }; };
  R.fitZoom = function (w) { const s = R.sizeCSS(); return Math.min(s.w / (w.W * TS), s.h / (w.H * TS)) * 0.92; };
  R.sizeCSS = () => ({ w: W / dpr, h: H / dpr });

  // ---------- paletas empacotadas ----------
  let PAL = null;
  function pack(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  }
  function buildPal() {
    PAL = A.TERRAIN.map((seas) => { const o = []; for (let t = 0; t < 9; t++) o[t] = seas[t].map(pack); return o; });
    PAL.foam = [pack('#cfe6e2'), pack('#cfe6e2'), pack('#d8e6dc'), pack('#eef3f6')];
    PAL.wet = [pack('#8a7048'), pack('#8e744a'), pack('#86704e'), pack('#a29c98')];
    PAL.detail = A.DETAIL.map((d) => ({ tuft: pack(d.tuft), tip: pack(d.tip), flowers: d.flowers.map(pack), leaf: d.leaf.map(pack) }));
    PAL.pebble = [pack('#938a8c'), pack('#6d6672'), pack('#bdb2a6')];
    PAL.snowSpark = pack('#ffffff');
    // Etapa 17: as cores do chão de cada região, por estação
    PAL.reg = (A.REGION_TERRAIN || []).map((seas) => { const o = []; for (const rg in seas) { o[rg] = []; for (const t in seas[rg]) o[rg][t] = seas[rg][t].map(pack); } return o; });
  }

  // trama ordenada 4x4 (de -0.5 a 0.5) e os tufos de capim desenhados à mão (l = ponta clara, d = base escura)
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
  const TUFTS = [['..l..', 'l.d.l', '.ddd.'], ['.l.', 'ld.', '.d.'], ['l.l', '.d.'], ['l', 'd'], ['.l..', 'ld.l', '.dd.']];
  // ruído de valor suave numa grade de 2^sh px
  function vnoise(wx, wy, sh, seed) {
    const gx = wx >> sh, gy = wy >> sh, s = 1 << sh;
    let fx = (wx - (gx << sh)) / s, fy = (wy - (gy << sh)) / s;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = G.hash2(gx, gy, seed), b = G.hash2(gx + 1, gy, seed), c = G.hash2(gx, gy + 1, seed), d = G.hash2(gx + 1, gy + 1, seed);
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }
  // relevo: diferença de altura na diagonal, por tile (interpolada por pixel = sombra suave)
  let shadeW = null, shadeF = null;
  function shadeField(w) {
    if (shadeW === w) return shadeF;
    const f = new Float32Array(w.W * w.H), e = w.elev;
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1), x1 = Math.min(w.W - 1, x + 1), y1 = Math.min(w.H - 1, y + 1);
      f[y * w.W + x] = e[y0 * w.W + x0] - e[y1 * w.W + x1];
    }
    shadeW = w; shadeF = f;
    return f;
  }
  function bil(f, a, b, c, d, tx, ty) {
    const top = f[a] + (f[b] - f[a]) * tx, bot = f[c] + (f[d] - f[c]) * tx;
    return top + (bot - top) * ty;
  }

  // 0.16: o mundo inteiro numa imagem pequena (OVP px por tile), para o zoom bem de longe; refeita só quando muda o
  // mundo ou a estação
  const OVP = 3;
  let ovKey = '', ovImg = null;
  function overview(w, season) {
    const key = w.seed + ':' + w.W + ':' + season;
    if (key === ovKey && ovImg) return ovImg;
    if (!PAL) buildPal();
    const N = w.W * OVP, M = w.H * OVP, [c, x] = A.mk(N, M);
    const img = x.createImageData(N, M), buf = new Uint32Array(img.data.buffer), pal = PAL[season], shade = shadeField(w);
    const tree = pal[T.FOREST][0], rock = PAL.pebble[0], bush = pal[T.FOREST][2];
    for (let ty = 0; ty < w.H; ty++) for (let tx = 0; tx < w.W; tx++) {
      const i = ty * w.W + tx, t = w.tile[i], rg = w.reg ? w.reg[i] : 0, rp = rg && PAL.reg[season] && PAL.reg[season][rg], tones = rp && rp[t] ? rp[t] : pal[t];   // Etapa 17: a cor da região
      let tone = 1;
      if (!IS_WATER[t]) { const d = shade[i]; if (d > 0.03) tone = 2; else if (d < -0.03) tone = 0; }
      else if (t === T.DEEP) tone = w.elev[i] < 0.2 ? 0 : w.elev[i] < 0.27 ? 1 : 2;
      const o = w.objGrid[i] >= 0 ? w.objs[w.objGrid[i]] : null, k = o ? o.k : '';
      for (let py = 0; py < OVP; py++) for (let px = 0; px < OVP; px++) {
        let col = tones[tone];
        if (k === 'tree' && (px + py) % 3 !== 2) col = tree;
        else if (k === 'rock' && px === 1 && py >= 1) col = rock;
        else if (k === 'bush' && px === 1 && py === 1) col = bush;
        buf[(ty * OVP + py) * N + tx * OVP + px] = col;
      }
    }
    x.putImageData(img, 0, 0);
    ovKey = key; ovImg = c;
    return c;
  }
  // Etapa 17: o mapa do mundo, um pixel por passo (mais, no mapa menor): só o que o povo já viu, com o chão de cada
  // região; as obras, o povo, o centro e a vila de fora por cima
  R.REGCOR = ['', '#dcc08c', '#386660', '#d6dae4', '#c8a66c', '#2c4a2f', '#5b6b3a'];
  R.mapaMundo = function (S, cv) {
    if (!PAL) buildPal();
    const w = S.world, N = w.W, px = Math.max(1, Math.floor(384 / N)), season = S.ck.season, pal = PAL[season], seen = S.seen;
    cv.width = N * px; cv.height = N * px;
    const [tc, tx] = A.mk(N, N), img = tx.createImageData(N, N), buf = new Uint32Array(img.data.buffer), escuro = pack('#141218');
    for (let i = 0; i < N * N; i++) {
      if (seen && !seen[i]) { buf[i] = escuro; continue; }
      const t = w.tile[i], rg = w.reg ? w.reg[i] : 0, rp = rg && PAL.reg[season] && PAL.reg[season][rg];
      buf[i] = rp && rp[t] ? rp[t][1] : pal[t][1];
    }
    tx.putImageData(img, 0, 0);
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(tc, 0, 0, N * px, N * px);
    x.fillStyle = '#e2cfa4';
    for (const b of S.buildings) x.fillRect(b.x * px, b.y * px, Math.max(2, b.w * px), Math.max(2, b.h * px));
    x.fillStyle = '#f2da72';
    for (const p of S.people) if (p.alive && !p.fora && !p.carriedBy) x.fillRect(Math.floor(p.x) * px, Math.floor(p.y) * px, Math.max(1, px), Math.max(1, px));
    x.strokeStyle = '#f2da72'; x.lineWidth = Math.max(1, px);
    x.strokeRect((S.camp.x - 2) * px, (S.camp.y - 2) * px, 6 * px, 6 * px);
    const v = S.soc && S.soc.vila;
    if (v && !v.fim && v.x >= 0 && v.x < N) { x.fillStyle = '#c8423a'; x.fillRect((v.x - 1) * px, (v.y - 1) * px, 4 * px, 4 * px); }
    return G.Regioes ? G.Regioes.mapaInfo(S) : { W: N, visto: 0, conhecidas: [], gen: 1 };
  };
  function renderChunk(w, cx, cy, season) {
    if (!PAL) buildPal();
    const [c, x] = A.mk(CPX, CPX);
    const img = x.createImageData(CPX, CPX);
    const buf = new Uint32Array(img.data.buffer);
    const pal = PAL[season], seed = w.seed, Wt = w.W, Ht = w.H, REG = w.reg || null;
    const MG = 2, M = CPX + MG * 2;
    const types = new Uint8Array(M * M), E = new Float32Array(M * M), SH = new Float32Array(M * M);
    const shade = shadeField(w);
    const ox0 = cx * CPX - MG, oy0 = cy * CPX - MG;
    for (let j = 0; j < M; j++) {
      const wy = oy0 + j, fy = wy / TS - 0.5;
      let y0 = Math.floor(fy); const ty = fy - y0; let y1 = y0 + 1;
      y0 = y0 < 0 ? 0 : y0 >= Ht ? Ht - 1 : y0; y1 = y1 < 0 ? 0 : y1 >= Ht ? Ht - 1 : y1;
      for (let i = 0; i < M; i++) {
        const wx = ox0 + i, fx = wx / TS - 0.5;
        let x0 = Math.floor(fx); const tx = fx - x0; let x1 = x0 + 1;
        x0 = x0 < 0 ? 0 : x0 >= Wt ? Wt - 1 : x0; x1 = x1 < 0 ? 0 : x1 >= Wt ? Wt - 1 : x1;
        const a = y0 * Wt + x0, b = y0 * Wt + x1, cc = y1 * Wt + x0, d = y1 * Wt + x1;
        const e = bil(w.elev, a, b, cc, d, tx, ty), m = bil(w.moist, a, b, cc, d, tx, ty), r = bil(w.riv, a, b, cc, d, tx, ty);
        const jit = (vnoise(wx, wy, 3, seed + 5) - 0.5) * 0.016 + (G.hash2(wx, wy, seed + 6) - 0.5) * 0.0015;
        const k = j * M + i;
        types[k] = G.W.classify(e + jit, m, r + jit * 0.4);
        E[k] = e;
        SH[k] = bil(shade, a, b, cc, d, tx, ty);
      }
    }
    const foam = PAL.foam[season], wet = PAL.wet[season];
    for (let j = MG; j < M - MG; j++) {
      for (let i = MG; i < M - MG; i++) {
        const k = j * M + i, t = types[k], wx = ox0 + i, wy = oy0 + j;
        let tones = pal[t];
        if (REG) {   // Etapa 17: a região do pixel (a borda entre uma e outra é tremida, para não sair em quadrados)
          const gx = Math.min(Wt - 1, Math.max(0, ((wx + (vnoise(wx, wy, 3, seed + 91) - 0.5) * 14) / TS) | 0)), gy = Math.min(Ht - 1, Math.max(0, ((wy + (vnoise(wy, wx, 3, seed + 93) - 0.5) * 14) / TS) | 0));
          const rp = PAL.reg[season] && PAL.reg[season][REG[gy * Wt + gx]];
          if (rp && rp[t]) tones = rp[t];
        }
        const h = G.hash2(wx, wy, seed + 9);
        let col;
        if (IS_WATER[t]) {
          const n1 = !IS_WATER[types[k - 1]] || !IS_WATER[types[k + 1]] || !IS_WATER[types[k - M]] || !IS_WATER[types[k + M]];
          if (n1) col = foam;
          else {
            const n2 = !IS_WATER[types[k - 2]] || !IS_WATER[types[k + 2]] || !IS_WATER[types[k - 2 * M]] || !IS_WATER[types[k + 2 * M]];
            if (t === T.DEEP) {
              const e = E[k];
              let tone = e < 0.2 ? 0 : e < 0.27 ? 1 : 2;
              if (h < 0.12 && tone > 0) tone--;
              col = n2 ? tones[2] : tones[tone];
            } else col = n2 ? tones[2] : tones[1];
            // ondinhas: traços curtos e desencontrados, em vez de pontos soltos
            if (!n2 && (wy + ((wx >> 3) & 1) * 3) % 6 === 0 && G.hash2(wx >> 2, wy, seed + 13) < 0.3) col = tones[2];
          }
        } else {
          // manchas grandes de tom, com a borda em pontilhado ordenado (a trama de quem desenha pixel, não ruído)
          let tone = 1;
          const bay = BAYER4[(wy & 3) * 4 + (wx & 3)];
          const hb = vnoise(wx, wy, 5, seed + 21) + bay * 0.07;
          if (hb < 0.33) tone = 0; else if (hb > 0.69) tone = 2;
          const dE = SH[k] + bay * 0.01;
          const th = (t === T.HILL || t === T.MOUNTAIN) ? 0.018 : 0.042;
          if (dE > th) tone = Math.min(2, tone + 1); else if (dE < -th) tone = Math.max(0, tone - 1);
          col = tones[tone];
          const nearW = IS_WATER[types[k - 1]] || IS_WATER[types[k + 1]] || IS_WATER[types[k - M]] || IS_WATER[types[k + M]];
          if (nearW) col = wet;
        }
        buf[(j - MG) * CPX + (i - MG)] = col;
      }
    }
    // detalhes: tufos, flores, pedrinhas
    const det = PAL.detail[season];
    const at = (px, py) => types[(py + MG) * M + px + MG];
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const gx = cx * CH + tx, gy = cy * CH + ty;
      if (gx >= Wt || gy >= Ht) continue;
      const t = w.tile[gy * Wt + gx];
      if (IS_WATER[t]) continue;
      // 0.16: o capim nasce em touceiras (onde a mancha é densa, muitos tufos; fora dela, quase nada) e a flor em
      // canteiros de uma cor só. Antes, um tufo e uma flor de cor sorteada por tile: o confete que denunciava o código
      const put = (px, py, c) => { if (px >= 0 && py >= 0 && px < CPX && py < CPX && at(px, py) === t) buf[py * CPX + px] = c; };
      const stamp = (st, px, py) => {
        for (let r = 0; r < st.length; r++) for (let q = 0; q < st[r].length; q++) {
          const ch = st[r][q];
          if (ch !== '.') put(px + q - (st[r].length >> 1), py + r - st.length + 1, ch === 'l' ? det.tip : det.tuft);
        }
      };
      const dens = vnoise(gx * TS, gy * TS, 6, seed + 33), hk0 = G.hash2(gx, gy, seed + 41);
      if (t === T.SAND || t === T.MOUNTAIN) {
        for (let n = 0; n < 2; n++) {
          if (G.hash2(gx + n, gy - n, seed + 41) > 0.4) continue;
          const px = tx * TS + 2 + Math.floor(G.hash2(gx * 3 + n, gy, seed + 31) * 12), py = ty * TS + 3 + Math.floor(G.hash2(gx, gy * 3 + n, seed + 37) * 11);
          put(px, py, PAL.pebble[1]); put(px + 1, py, PAL.pebble[0]); put(px, py - 1, PAL.pebble[2]);
        }
        continue;
      }
      const nT = season === 3 ? (hk0 < 0.4 ? 1 : 0) : t === T.FOREST ? 2 : dens > 0.62 ? 5 : dens > 0.45 ? 2 : hk0 < 0.5 ? 1 : 0;
      for (let n = 0; n < nT; n++) {
        const hx = G.hash2(gx * 3 + n, gy, seed + 31), hy = G.hash2(gx, gy * 3 + n, seed + 37), hs = G.hash2(gx + n, gy - n, seed + 43);
        const px = tx * TS + 2 + Math.floor(hx * 12), py = ty * TS + 3 + Math.floor(hy * 12);
        if (season === 3) { if (hs < 0.5) put(px, py, PAL.snowSpark); else stamp(TUFTS[3], px, py); continue; }
        stamp(TUFTS[Math.floor(hs * TUFTS.length)], px, py);
      }
      if (t === T.FOREST) {
        // chão da mata: folha caída, uma ou duas
        if (det.leaf.length) for (let n = 0; n < 2; n++) {
          const hl = G.hash2(gx - n, gy + n * 7, seed + 61);
          if (hl < 0.45) put(tx * TS + 1 + Math.floor(G.hash2(gx, gy + n, seed + 63) * 14), ty * TS + 1 + Math.floor(G.hash2(gx + n, gy, seed + 67) * 14), det.leaf[Math.floor(hl * 9) % det.leaf.length]);
        }
      } else if (det.flowers.length) {
        const fp = vnoise(gx * TS, gy * TS, 6, seed + 57) + (hk0 - 0.5) * 0.12;
        if (fp > (season === 0 ? 0.6 : 0.7)) {
          const f = det.flowers[Math.floor(G.hash2(gx >> 2, gy >> 2, seed + 59) * det.flowers.length)];
          const nf = 1 + Math.floor(G.hash2(gx, gy, seed + 53) * (season === 0 ? 4 : 3));
          for (let n = 0; n < nf; n++) {
            const px = tx * TS + 2 + Math.floor(G.hash2(gx * 5 + n, gy, seed + 71) * 12), py = ty * TS + 3 + Math.floor(G.hash2(gx, gy * 5 + n, seed + 73) * 11);
            put(px, py + 1, det.tuft);
            put(px, py, f);
            if (season === 0 && n % 2 === 0) { put(px - 1, py, f); put(px + 1, py, f); put(px, py - 1, f); }
          }
        }
      }
    }
    // Etapa 7: trilhas e caminhos, pintados no chão
    if (w.road && w.roadCount) roadsIntoChunk(w, cx, cy, season, buf);
    x.putImageData(img, 0, 0);
    return c;
  }

  // ---------- caminhos no chão (Etapa 7) ----------
  // cada passo de caminho liga o centro dele aos vizinhos com caminho (8 direções): o pixel é caminho se estiver
  // a menos de r do centro ou de uma dessas ligações. Assim a curva e a diagonal saem contínuas.
  // 1 trilha (grama gasta) · 2 terra batida · 3 pedra
  const ROAD_R = [0, 3.6, 4.6, 5.3];
  let RPAL = null;
  function roadPal() {
    const p = (a) => a.map(pack);
    const warm = { trail: p(['#8a7448', '#a8905c']), dirt: p(['#6e4a2e', '#946644', '#b0845a']), stone: p(['#4a5474', '#6c7896', '#8b9bb4', '#a8b4c8']), pebble: pack('#c8b48e') };
    const snow = { trail: p(['#b8b4b0', '#d0ccc8']), dirt: p(['#9a908a', '#b8aea6', '#d0c8c2']), stone: p(['#6e7890', '#9aa6ba', '#b4c0d0', '#ccd6e2']), pebble: pack('#eef3f9') };
    RPAL = [warm, warm, warm, snow];
  }
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - (ax + vx * t), dy = py - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }
  const N8R = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function roadsIntoChunk(w, cx, cy, season, buf) {
    if (!RPAL) roadPal();
    const pal = RPAL[season], road = w.road, Wt = w.W, Ht = w.H, seed = w.seed;
    const lvAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= Wt || ty >= Ht ? 0 : road[ty * Wt + tx]);
    const deg = (tx, ty) => (lvAt(tx, ty) ? (lvAt(tx + 1, ty) ? 1 : 0) + (lvAt(tx - 1, ty) ? 1 : 0) + (lvAt(tx, ty + 1) ? 1 : 0) + (lvAt(tx, ty - 1) ? 1 : 0) : 0);
    let best = 0, margin = 0, jit = 0;
    const check = (d, lv) => {
      const r = ROAD_R[lv] + jit * (lv === 1 ? 2.2 : 1.1);
      if (d <= r && (lv > best || (lv === best && r - d > margin))) { best = lv; margin = r - d; }
    };
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const gx = cx * CH + tx, gy = cy * CH + ty;
      if (gx >= Wt || gy >= Ht) continue;
      // os passos de caminho aqui e em volta
      const cand = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = lvAt(gx + dx, gy + dy); if (v) cand.push([gx + dx, gy + dy, v]); }
      if (!cand.length) continue;
      for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
        const wx = gx * TS + px, wy = gy * TS + py, fx = wx + 0.5, fy = wy + 0.5;
        jit = G.hash2(wx, wy, seed + 71) - 0.5;
        best = 0; margin = 0;
        for (const [ax, ay, av] of cand) {
          const acx = ax * TS + 8, acy = ay * TS + 8;
          check(Math.hypot(fx - acx, fy - acy), av);
          for (const [ddx, ddy] of N8R) {
            const bv = lvAt(ax + ddx, ay + ddy);
            if (!bv) continue;
            // diagonal que corta o canto: só nas curvas (num cruzamento ou num T ela viraria uma pracinha)
            if (ddx && ddy && (deg(ax + ddx, ay) >= 3 || deg(ax, ay + ddy) >= 3)) continue;
            check(segDist(fx, fy, acx, acy, acx + ddx * TS, acy + ddy * TS), Math.min(av, bv));
          }
        }
        if (!best) continue;
        const o = (ty * TS + py) * CPX + tx * TS + px, h = G.hash2(wx, wy, seed + 73);
        if (best === 1) {
          // trilha: grama gasta, mais falhada na beirada
          if (h < (margin < 1.2 ? 0.45 : 0.85)) buf[o] = pal.trail[h < 0.25 ? 0 : 1];
        } else if (best === 2) {
          let c = margin < 1 ? pal.dirt[0] : pal.dirt[1];
          if (margin >= 1 && h < 0.07) c = pal.dirt[2];
          else if (margin >= 1.5 && h > 0.975) c = pal.pebble;
          buf[o] = c;
        } else {
          // pedras encaixadas, fiadas de 3 px desencontradas, e meio-fio escuro
          const row = Math.floor(wy / 3), off = row % 2 ? 2 : 0;
          const mortar = wy % 3 === 0 || (wx + off) % 4 === 0;
          let c;
          if (margin < 0.9) c = pal.stone[0];
          else if (mortar) c = pal.stone[0];
          else {
            const cell = G.hash2(Math.floor((wx + off) / 4), row, seed + 77);
            c = cell < 0.33 ? pal.stone[1] : cell < 0.75 ? pal.stone[2] : pal.stone[3];
            if ((wx + off) % 4 === 1 && wy % 3 === 1) c = pal.stone[3];
          }
          buf[o] = c;
        }
      }
    }
  }

  // chunks que precisam ser refeitos (um caminho mudou): o velho segue na tela até o novo ficar pronto
  const dirty = new Set();
  function dirtyTile(i) {
    const Wt = lastS ? lastS.world.W : C.MAP, x = i % Wt, y = (i / Wt) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= Wt || ty >= Wt) continue;
      dirty.add(Math.floor(tx / CH) + ',' + Math.floor(ty / CH));
    }
  }
  R.invalidate = function () { chunks.clear(); dirty.clear(); chunkKey = ''; };

  // ---------- partículas ----------
  function spawn(p) { if (parts.length < 400) parts.push(p); }
  const olhos = [];   // Etapa 14: onde algo que não se devia acabou de acontecer (o olho de Deus, uns segundos)
  R.event = function (e) {
    if (e.k === 'road') { dirtyTile(e.i); return; }
    if (e.k === 'upgrade') {
      // obra melhorada: faíscas douradas subindo em volta
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2, r = (0.6 + Math.random() * 0.8) * TS;
        spawn({ x: e.x * TS + Math.cos(a) * r, y: e.y * TS + Math.sin(a) * r * 0.6, vx: 0, vy: -12 - Math.random() * 16, g: 0, life: 1.1 + Math.random() * 0.7, col: Math.random() < 0.6 ? '#feae34' : '#fee761' });
      }
      return;
    }
    if (e.k === 'bolt') {
      bolts.push({ x: e.x, y: e.y, t0: performance.now(), seed: Math.random() * 1000 });
      for (let i = 0; i < 18; i++) spawn({ x: e.x * TS + 8, y: e.y * TS + 10, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, g: 90, life: 0.7, col: Math.random() < 0.5 ? '#fee761' : '#ffffff' });
      return;
    }
    if (e.k === 'heart') {
      const nh = e.many ? Math.min(12, 3 + e.many * 2) : 3;   // noite a três ou de muitos: mais corações
      for (let i = 0; i < nh; i++) spawn({ x: e.x * TS + 6 + (Math.random() - 0.5) * (e.many ? 22 : 10), y: e.y * TS - 2 - (i % 4) * 5, vx: (Math.random() - 0.5) * (e.many ? 8 : 4), vy: -6 - Math.random() * 4, g: 0, life: 2.4 + (i % 4) * 0.3 + (e.many ? 0.8 : 0), spr: 'heart' });
      return;
    }
    if (e.k === 'miracle') {
      const col = e.kind === 'chuva' ? '#9fe8ff' : e.kind === 'cura' ? '#9be070' : '#fee761';
      // Etapa 11: os grandes atos espalham mais luz (e mais longe)
      const big = e.kind === 'consagrar' || e.kind === 'criar' || e.kind === 'saber', n = big ? 60 : e.kind === 'bencao' ? 40 : 26, R0 = big ? 6 : e.kind === 'bencao' ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * R0 * TS;
        spawn({ x: e.x * TS + 8 + Math.cos(a) * r, y: e.y * TS + 8 + Math.sin(a) * r, vx: 0, vy: -10 - Math.random() * 18, g: 0, life: 1.4 + Math.random() * (big ? 1.6 : 1), col: big && Math.random() < 0.3 ? '#ffffff' : col });
      }
      return;
    }
    if (e.k === 'ungir' || e.k === 'converte' || e.k === 'estatua') {
      // escolhido, convertido, estátua pronta: uma coluna de luz subindo
      const col = e.k === 'converte' ? '#9fe8ff' : '#fee761';
      for (let i = 0; i < 34; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 10, y: e.y * TS + 2 - Math.random() * 6, vx: (Math.random() - 0.5) * 3, vy: -18 - Math.random() * 26, g: 0, life: 1.2 + Math.random() * 1.2, col: Math.random() < 0.3 ? '#ffffff' : col });
      return;
    }
    if (e.k === 'fireLit') {
      // fagulhas subindo quando acendem o fogo
      for (let i = 0; i < 12; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 8, y: e.y * TS + 8, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 22, g: -4, life: 0.9 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#feae34' : '#fee761' });
      return;
    }
    if (e.k === 'soc') {
      // Etapa 14: o que só Deus viu (um olho escuro), o que o povo viu (vermelho), o golpe, o fogo, o castigo, o perdão
      const X = e.x !== undefined ? e.x * TS + 8 : 0, Y = e.y !== undefined ? e.y * TS + 6 : 0;
      const puff = (n, cols, up, spread, life) => { for (let i = 0; i < n; i++) spawn({ x: X + (Math.random() - 0.5) * (spread || 12), y: Y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 10, vy: -(up || 10) - Math.random() * (up || 10), g: 0, life: (life || 1) + Math.random() * 0.6, col: cols[Math.floor(Math.random() * cols.length)] }); };
      if (e.ev === 'crime') { if (e.known) puff(e.g >= 2 ? 14 : 8, ['#e43b44', '#f6757a', '#181425']); else puff(e.g >= 2 ? 10 : 6, ['#3a4466', '#5a6988', '#181425'], 6); olhos.push({ x: e.x, y: e.y, t0: performance.now(), known: !!e.known, g: e.g }); }
      else if (e.ev === 'golpe') { for (let i = 0; i < 10; i++) spawn({ x: X, y: Y - 2, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 30, g: 80, life: 0.5, col: Math.random() < 0.5 ? '#ffffff' : '#e43b44' }); }
      else if (e.ev === 'fogo') { if (e.on) puff(20, ['#f77622', '#feae34', '#fee761'], 18, 26, 1.2); else if (e.burned) puff(40, ['rgba(40,40,52,0.8)', 'rgba(90,96,112,0.7)', '#181425'], 14, 30, 2.4); else puff(26, ['rgba(220,240,255,0.8)', 'rgba(159,232,255,0.7)'], 12, 26, 1.6); }
      else if (e.ev === 'julg') { if (e.aberto) puff(16, ['#feae34', '#fee761'], 14, 14); else if (!e.on) puff(18, e.cond === 1 ? ['#e43b44', '#a22633'] : e.cond === 0 ? ['#9be070', '#63c74d'] : ['#8b9bb4'], 12, 20); }
      else if (e.ev === 'bronca') puff(6, ['#8b9bb4', '#c0cbdc'], 8, 8);
      else if (e.ev === 'castigo') { puff(e.nv >= 4 ? 4 : 16, e.nv === 1 ? ['#b58be0', '#ead4aa'] : e.nv === 2 ? ['#e43b44', '#a22633'] : e.nv === 3 ? ['#8fb86a', '#4a6b3a'] : ['#c0cbdc'], 12, 10, 1.3); }
      else if (e.ev === 'perdao' || e.ev === 'sinal') { for (let i = 0; i < 28; i++) { const a = Math.random() * Math.PI * 2, r = (0.3 + Math.random() * 0.9) * TS; spawn({ x: X + Math.cos(a) * r, y: Y + Math.sin(a) * r * 0.5, vx: 0, vy: -10 - Math.random() * 16, g: 0, life: 1.4 + Math.random(), col: Math.random() < 0.6 ? '#fee761' : '#ffffff' }); } }
      else if (e.ev === 'lider' && lastS) { const p = lastS.people.find((q) => q.id === e.pid); if (p) for (let i = 0; i < 18; i++) spawn({ x: p.x * TS + (Math.random() - 0.5) * 12, y: p.y * TS - 8, vx: 0, vy: -8 - Math.random() * 12, g: 0, life: 1.2 + Math.random() * 0.8, col: Math.random() < 0.6 ? '#feae34' : '#fee761' }); }
      else if (e.ev === 'obra' || e.ev === 'pedido') puff(10, ['#b86f50', '#e4a672', '#8b9bb4'], 8, 20);
      else if (e.ev === 'partida' || e.ev === 'aviso' || e.ev === 'exilio' || e.ev === 'saque') puff(12, e.ev === 'saque' ? ['#3a4466', '#181425'] : ['#b86f50', '#c9a068', '#8b9bb4'], 8, 26, 1.4);
      else if (e.ev === 'vila') puff(26, ['rgba(200,204,216,0.8)', 'rgba(140,148,170,0.7)'], 16, 20, 2.6);
      else if (e.ev === 'injusto') puff(12, ['#3a4466', '#68386c'], 8, 10, 1.6);
      return;
    }
    if (e.k === 'memoria') {
      // Etapa 13: a terra da cova, as pétalas de quem visita, a fumaça que responde
      if (e.ev === 'enterro') for (let i = 0; i < 12; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 12, y: e.y * TS + 10, vx: (Math.random() - 0.5) * 16, vy: -8 - Math.random() * 12, g: 40, life: 0.8, col: Math.random() < 0.6 ? '#6b4a36' : '#8a6a4a' });
      else if (e.ev === 'flores') for (let i = 0; i < 7; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 12, y: e.y * TS + 6, vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 8, g: 6, life: 1.4 + Math.random() * 0.6, col: ['#f6757a', '#fee761', '#ffffff'][i % 3] });
      else if (e.ev === 'resposta' && e.x !== undefined) {
        const col = e.tone > 0 ? '#fee761' : e.tone < 0 ? '#e43b44' : '#b58be0';
        for (let i = 0; i < 32; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 14, y: e.y * TS + 4 - Math.random() * 6, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 24, g: 0, life: 1.4 + Math.random() * 1.4, col: Math.random() < 0.3 ? '#ffffff' : col });
      }
      return;
    }
    if (e.k === 'fell') {
      for (let i = 0; i < 10; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 10, y: e.y * TS + 2, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, g: 40, life: 1.2, col: Math.random() < 0.6 ? '#3e8948' : '#733e39' });
    } else if (e.k === 'splash') {
      for (let i = 0; i < 6; i++) spawn({ x: e.x * TS + 8, y: e.y * TS + 8, vx: (Math.random() - 0.5) * 24, vy: -14 - Math.random() * 10, g: 50, life: 0.6, col: '#c8f4ff' });
    } else if (e.k === 'throw') {
      // lança voando de quem caça até a capivara
      spears.push({ x1: e.x1 * TS, y1: e.y1 * TS - 6, x2: e.x2 * TS, y2: e.y2 * TS - 3, t0: performance.now(), bow: !!e.bow });
    } else if (e.k === 'star') {
      // nos cantos de cima (o meio de cima é dos avisos), riscando para o lado de fora
      const left = Math.random() < 0.5;
      stars.push({ t0: performance.now(), x: (left ? 0.3 - Math.random() * 0.12 : 0.7 + Math.random() * 0.12) * W, y: (0.1 + Math.random() * 0.2) * H, dx: (left ? -1 : 1) * (0.2 + Math.random() * 0.1) * W, dy: 0.16 * H });
    } else if (e.k === 'birds') {
      const n = 5 + Math.floor(Math.random() * 4), fromLeft = Math.random() < 0.5, y0 = (0.2 + Math.random() * 0.4) * H;
      flocks.push({ t0: performance.now(), fromLeft, birds: Array.from({ length: n }, (_, i) => ({ dx: -i * 18 * dpr - Math.random() * 10 * dpr, dy: (Math.random() - 0.5) * 50 * dpr, k: i % 3, ph: Math.random() * 6 })), y0 });
    } else if (e.k === 'fight') {
      for (let i = 0; i < 8; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 8, y: e.y * TS - 12, vx: (Math.random() - 0.5) * 24, vy: -8 - Math.random() * 10, g: 20, life: 0.8, col: Math.random() < 0.6 ? '#e43b44' : '#feae34' });
    } else if (e.k === 'hit') {
      // acerto: lasca branca e um respingo
      for (let i = 0; i < 7; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 6, y: e.y * TS - 4 + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 14, g: 55, life: 0.5, col: Math.random() < 0.5 ? '#ffffff' : '#e43b44' });
    } else if (e.k === 'beast') {
      // investida: poeira levantando
      for (let i = 0; i < 8; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 10, y: e.y * TS + 2, vx: (Math.random() - 0.5) * 20, vy: -6 - Math.random() * 8, g: 10, life: 0.9, col: 'rgba(200,170,120,0.8)' });
    } else if (e.k === 'birdsUp') {
      // revoada: umas penas escuras
      for (let i = 0; i < 3; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 6, y: e.y * TS - 6, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 6, g: 12, life: 1.1, col: '#3e3034' });
    } else if (e.k === 'harvest') {
      // Etapa 10: colheita (grãos e folhas pulando) · praga (gafanhotos) · bicho levado do curral (penas)
      const col = { milho: '#fee761', abobora: '#f77622', feijao: '#c9a068', mandioca: '#c28569', algodao: '#ffffff' }[e.crop] || '#fee761';
      for (let i = 0; i < 14; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 36, y: e.y * TS + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 10, vy: -10 - Math.random() * 12, g: 18, life: 1 + Math.random() * 0.6, col: Math.random() < 0.6 ? col : '#63c74d' });
    } else if (e.k === 'praga') {
      for (let i = 0; i < 40; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 50, y: e.y * TS + (Math.random() - 0.5) * 44 - 6, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 14, g: 0, life: 1.5 + Math.random() * 2, col: Math.random() < 0.5 ? '#9be070' : '#265c42' });
    } else if (e.k === 'penLoss') {
      for (let i = 0; i < 8; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 12, y: e.y * TS - 4, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 8, g: 8, life: 1.6, col: Math.random() < 0.6 ? '#f2eee4' : '#c8bfae' });
    } else if (e.k === 'bite') {
      // mordida: respingo vermelho e um risco branco
      for (let i = 0; i < 10; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 6, y: e.y * TS - 4 + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 30, vy: -12 - Math.random() * 16, g: 60, life: 0.7, col: Math.random() < 0.7 ? '#e43b44' : '#ffffff' });
    }
  };
  // 0.16: o que paira no ar conforme a estação, só na área à vista: folhas secas no outono, pétalas na primavera,
  // borboletas de dia no verão e na primavera (wob: vai e vem de lado; flap: bate as asas)
  const view = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const LEAF = ['#e4a672', '#b86f50', '#be4a2f', '#feae34'], PETAL = ['#f6757a', '#ffd0dc', '#fff4f4'], WING = ['#fee761', '#ffffff', '#f77622', '#2ce8f5'];
  function ambient(S, dt) {
    if (parts.length > 320 || sc < 1) return;
    const se = S.ck.season, dia = darkness(S.ck.hour) < 0.25, area = Math.max(1, (view.x1 - view.x0) * (view.y1 - view.y0) / (TS * TS * 600));
    const rx = () => view.x0 + Math.random() * (view.x1 - view.x0), ry = () => view.y0 + Math.random() * (view.y1 - view.y0);
    if (se === 2 && Math.random() < dt * 5 * area * wind) spawn({ x: rx(), y: view.y0 + Math.random() * (view.y1 - view.y0) * 0.6, vx: 7 * wind + Math.random() * 5, vy: 5 + Math.random() * 4, g: 0, life: 3 + Math.random() * 3, col: LEAF[(Math.random() * 4) | 0], wob: 9, ph: Math.random() * 6, sz: Math.random() < 0.4 ? 2 : 1 });
    if (se === 0 && !S.precip && Math.random() < dt * 2 * area) spawn({ x: rx(), y: ry(), vx: 4 * wind + Math.random() * 3, vy: 2 + Math.random() * 2, g: 0, life: 3 + Math.random() * 2, col: PETAL[(Math.random() * 3) | 0], wob: 6, ph: Math.random() * 6 });
    if ((se === 0 || se === 1) && dia && !S.precip && Math.random() < dt * 0.5 * area) spawn({ x: rx(), y: ry(), vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 6, g: 0, life: 6 + Math.random() * 5, col: WING[(Math.random() * 4) | 0], wob: 14, ph: Math.random() * 6, flap: 1 });
  }
  function updateParts(dt, S, now) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) { p.ph += dt * (p.flap ? 2.2 : 3.1); p.x += Math.sin(p.ph) * p.wob * dt; if (p.flap) p.y += Math.cos(p.ph * 1.7) * p.wob * 0.6 * dt; }
    }
    if (!S) return;
    ambient(S, dt);
    // festa: notas de música sobre quem dança; cantoria: sobre o fogo; a flauta (Etapa 8): sobre quem toca
    const flute = S.life && S.life.story && S.life.story.on && S.life.story.music ? S.life.story.teller : 0;
    for (const q of S.people) {
      if (!q.alive || !q.act) continue;
      const on = (q.act.type === 'festa' && q.act.stage === 'dance') || (flute === q.id && q.act.type === 'historia' && q.act.stage === 'tell');
      if (!on || Math.random() > dt * (flute === q.id ? 1.6 : 0.9)) continue;
      spawn({ x: q.x * TS + (Math.random() - 0.5) * 6, y: q.y * TS - 16, vx: (Math.random() - 0.5) * 6, vy: -9, g: 0, life: 1.6, spr: Math.random() < 0.5 ? 'note' : 'note2' });
    }
    const vasos = G.Tech.known(S, 'vasos');
    // vaga-lumes: piscam perto do acampamento de noite
    if (S.life && S.life.firefliesUntil > S.t && darkness(S.ck.hour) > 0.3 && Math.random() < dt * 6 && glows.length < 40) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 9;
      glows.push({ x: (S.camp.x + 1 + Math.cos(a) * r) * TS, y: (S.camp.y + 1 + Math.sin(a) * r) * TS, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 2 + Math.random() * 2, ph: Math.random() * 6 });
    }
    for (let i = glows.length - 1; i >= 0; i--) { const g = glows[i]; g.life -= dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.life <= 0) glows.splice(i, 1); }
    for (const b of S.buildings) {
      // moquém armado: fumaça fina
      if (b.type === 'moquem' && b.batch && Math.random() < dt * 3) spawn({ x: b.x * TS + 6 + Math.random() * 5, y: b.y * TS + 2, vx: (Math.random() - 0.5) * 3, vy: -7 - Math.random() * 4, g: 0, life: 2.6, col: 'smoke' });
      // casa de pedra com gente dentro no frio: fumaça na chaminé (Etapa 7)
      if (b.kind === 'pedra' && b.built && S.temp < 14 && Math.random() < dt * 2.5 && FX && FX.tent.has(b.id)) {
        spawn({ x: b.x * TS + 23 + Math.random() * 2, y: b.y * TS - 3, vx: 1 + Math.random() * 2, vy: -6 - Math.random() * 3, g: 0, life: 2.4, col: 'smoke' });
      }
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      if (Math.random() < dt * 5) spawn({ x: b.x * TS + 8 + (Math.random() - 0.5) * 3, y: b.y * TS + 4, vx: (Math.random() - 0.5) * 3, vy: -8 - Math.random() * 4, g: 0, life: 2.2, col: 'smoke' });
      if (vasos && Math.random() < dt * 2) spawn({ x: b.x * TS + 7 + Math.random() * 3, y: b.y * TS + 3, vx: (Math.random() - 0.5) * 2, vy: -6 - Math.random() * 3, g: 0, life: 1.4, col: 'rgba(234,240,248,0.7)' });   // vapor do vaso
      if (Math.random() < dt * 2.5) spawn({ x: b.x * TS + 8, y: b.y * TS + 6, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 10, g: 0, life: 0.7, col: '#feae34' });
    }
  }

  // ---------- helpers de desenho ----------
  function blit(img, wx, wy, alpha) {
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(wx * sc + ox), Math.round(wy * sc + oy), Math.round(img.width * sc), Math.round(img.height * sc));
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }
  function rect(wx, wy, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(wx * sc + ox), Math.round(wy * sc + oy), Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
  }

  function darkness(h) {
    if (h >= 7 && h < 17.5) return 0;
    if (h >= 17.5 && h < 19.5) return (h - 17.5) / 2 * 0.64;
    if (h >= 4.5 && h < 7) return 0.64 * (1 - (h - 4.5) / 2.5);
    return h >= 23 || h < 3 ? 0.7 : 0.64;
  }
  R.darkness = darkness;

  // ---------- quadro ----------
  // 0.14: um passe só pelo povo a cada quadro (quem leva bebê no colo, quem está em cada casa, quem trabalha na forja
  // e na mina); antes, cada pessoa e cada casa desenhada varria o povo inteiro, e com 300 pessoas o quadro pesava
  let FX = null;
  const NADA = [];
  function frameIdx(S) {
    const carried = new Map(), tent = new Map(), forja = new Set(), mina = new Map();
    for (const p of S.people) {
      if (!p.alive) continue;
      if (p.carriedBy) { const l = carried.get(p.carriedBy); if (l) l.push(p); else carried.set(p.carriedBy, [p]); }
      if (p.inTent) {
        let t = tent.get(p.inTent);
        if (!t) { t = { labor: null, sleepers: 0, n: 0 }; tent.set(p.inTent, t); }
        t.n++;
        if (p.labor && !t.labor) t.labor = p;
        if (p.sleeping && !p.carriedBy) t.sleepers++;
      }
      const a = p.act;
      if (a && a.stage === 'work') {
        if (a.type === 'oficio') forja.add(a.shop);
        else if (a.type === 'mina') mina.set(a.b, (mina.get(a.b) || 0) + 1);
      }
    }
    return { carried, tent, forja, mina };
  }
  let lastS = null;
  R.draw = function (S, alpha, now, world) {
    lastS = S || null;
    FX = S ? frameIdx(S) : null;
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const w = S ? S.world : world;
    if (!w) return;
    sc = scale();
    const season = S ? S.ck.season : 0;
    const Nw = G.Narr;
    wind = !S ? 1 : Nw && (Nw.is(S, 'tempestade') || Nw.is(S, 'nevasca')) ? 2.4 : S.precip ? 1.5 : season === 2 ? 1.2 : 1;
    const key = w.seed + ':' + season;
    if (key !== chunkKey) { chunks.clear(); chunkKey = key; }
    ox = Math.round(W / 2 - cam.x * sc); oy = Math.round(H / 2 - cam.y * sc);
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.fillStyle = '#0c3a68';
    ctx.fillRect(0, 0, W, H);
    // área visível em px do mundo
    const vx0 = -ox / sc, vy0 = -oy / sc, vx1 = (W - ox) / sc, vy1 = (H - oy) / sc;
    const cx0 = Math.max(0, Math.floor(vx0 / CPX)), cy0 = Math.max(0, Math.floor(vy0 / CPX));
    const cx1 = Math.min(Math.ceil(w.W / CH) - 1, Math.floor(vx1 / CPX)), cy1 = Math.min(Math.ceil(w.H / CH) - 1, Math.floor(vy1 / CPX));
    let budget = R.chunkBudget || 3;   // pedaços do chão refeitos por quadro (main.js sobe isto para um quadro inteiro de uma vez)
    // 0.16: de muito longe (a escolha do lugar no mapa grande), uma imagem só do mundo inteiro, com as árvores e as pedras
    // já pintadas nela: montar 144 pedaços em alta e desenhar dez mil árvores minúsculas travava a tela por segundos
    const far = sc * TS < 5;
    if (far) {
      const img = overview(w, season);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, ox, oy, Math.round(w.W * TS * sc), Math.round(w.H * TS * sc));
      ctx.imageSmoothingEnabled = sc < 1;
    }
    if (!far) for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cx + ',' + cy;
      let c = chunks.get(k);
      if ((!c || dirty.has(k)) && budget > 0) { budget--; dirty.delete(k); c = renderChunk(w, cx, cy, season); chunks.set(k, c); }
      if (!c) continue;
      ctx.drawImage(c, Math.round(cx * CPX * sc + ox), Math.round(cy * CPX * sc + oy), Math.ceil(CPX * sc), Math.ceil(CPX * sc));
    }
    const tx0 = Math.max(0, Math.floor(vx0 / TS) - 2), ty0 = Math.max(0, Math.floor(vy0 / TS) - 2);
    const tx1 = Math.min(w.W - 1, Math.ceil(vx1 / TS) + 2), ty1 = Math.min(w.H - 1, Math.ceil(vy1 / TS) + 3);
    // brilho na água
    if (sc >= 1.5) {
      const tt = now / 1000;
      const spark = season === 3 ? '#eef6fb' : '#bff3ff';
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const t = w.tile[ty * w.W + tx];
        if (!IS_WATER[t]) continue;
        const h = G.hash2(tx, ty, 99);
        const ph = (tt * (0.25 + h * 0.35) + h * 10) % 1;
        if (ph < 0.22) {
          const px = tx * TS + 3 + Math.floor(G.hash2(tx, ty, 7) * 9), py = ty * TS + 3 + Math.floor(G.hash2(ty, tx, 7) * 9);
          rect(px, py, ph < 0.11 ? 2 : 3, 1, spark);
        }
      }
    }
    // tapete do estoque, bancos e caminhos marcados (no chão), auras de Calor
    if (S) { drawCamp(S); drawGround(S, tx0, ty0, tx1, ty1); }
    if (S && S.god) drawAuras(S, now);
    // lista ordenada por y
    const list = [], fence = S ? w.fence : null;
    const levado = {};
    if (!far) for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (fence && fence[ty * w.W + tx]) list.push({ y: ty * TS + 13, fe: ty * w.W + tx });   // cercas (Etapa 10)
      const oi = w.objGrid[ty * w.W + tx];
      if (oi < 0) continue;
      const o = w.objs[oi];
      if (o.k === 'gone') continue;
      list.push({ y: ty * TS + 14, o });
    }
    if (S) {
      for (const b of S.buildings) {
        if (b.x + b.w < tx0 || b.x > tx1 || b.y + b.h < ty0 || b.y > ty1) continue;
        // Etapa 10: a roça em três fileiras de plantas (quem anda no meio fica entre elas); o curral com a cerca de trás e a da frente
        if (b.type === 'roca' && b.built) { for (let r = 0; r < 3; r++) list.push({ y: (b.y + r + 1) * TS - 2, b, row: r }); if (!G.Sim.jobOf(b)) continue; }
        if (b.type === 'curral') { list.push({ y: b.y * TS + 1, b, part: 'back' }); list.push({ y: (b.y + b.h) * TS - 1, b, part: 'front' }); continue; }
        list.push({ y: (b.y + b.h) * TS - 1, b });
      }
      for (const p of S.people) {
        if (!p.alive || p.inTent || p.carriedBy) continue;
        const x = U.lerp(p.px, p.x, alpha), y = U.lerp(p.py, p.y, alpha);
        // 0.14: só quem está à vista (antes, todo o povo era montado a cada quadro, mesmo fora da tela)
        if (x < tx0 - 2 || x > tx1 + 2 || y < ty0 - 2 || y > ty1 + 3) continue;
        list.push({ y: y * TS + 4, p, x, y });
      }
      // Etapa 14: a vila de fora, as cinzas do que o fogo levou e os pedidos do líder
      if (S.soc) {
        const v = S.soc.vila;
        if (v && !v.longe && v.x + 2 >= tx0 && v.x - 2 <= tx1 && v.y + 1 >= ty0 && v.y - 1 <= ty1 && G.Sim.isSeen(S, v.x, v.y)) list.push({ y: (v.y + 1) * TS, soc: 'vila', v });
        for (const c of S.soc.cinzas) list.push({ y: c.y * TS + 2, soc: 'cinza', c });
        for (const q of S.soc.pedidos) list.push({ y: (q.y + (q.tiles ? 0 : C.BUILD[q.type].h)) * TS - 1, soc: 'pedido', q });
      }
      // Etapa 13: quem morreu e espera o enterro (no chão, na esteira do velório, ou no ombro de quem leva)
      if (S.memoria && S.memoria.corpos.length) for (const id of S.memoria.corpos) {
        const d = G.Family.person(S, id), c = d && d.corpo;
        if (!c || !G.Sim.isSeen(S, Math.floor(d.x), Math.floor(d.y))) continue;
        if (c.by) levado[c.by] = d; else list.push({ y: d.y * TS + 2, corpo: d });
      }
      // bichos: só onde o povo já viu (a paca de dia fica na toca)
      if (S.fauna) for (const e of S.fauna.ents) {
        if (e.gone || e.hidden || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
        const x = U.lerp(e.px, e.x, alpha), y = U.lerp(e.py, e.y, alpha);
        if (x < tx0 - 1 || x > tx1 + 1 || y < ty0 - 1 || y > ty1 + 1) continue;
        list.push({ y: y * TS + 3, c: e, x, y });
      }
      // bichos de criação (Etapa 10)
      if (S.campo) for (const a of S.campo.bichos) {
        if (!G.Sim.isSeen(S, Math.floor(a.x), Math.floor(a.y))) continue;
        const x = U.lerp(a.px, a.x, alpha), y = U.lerp(a.py, a.y, alpha);
        if (x < tx0 - 1 || x > tx1 + 1 || y < ty0 - 1 || y > ty1 + 1) continue;
        list.push({ y: y * TS + 3, cr: a, x, y });
      }
      // lobos e viajantes: só onde o povo já viu (na névoa, só os uivos)
      if (S.narr) for (const e of S.narr.ents) {
        if (e.gone || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
        const x = U.lerp(e.px, e.x, alpha), y = U.lerp(e.py, e.y, alpha);
        if (x < tx0 - 1 || x > tx1 + 1 || y < ty0 - 1 || y > ty1 + 1) continue;
        list.push({ y: y * TS + 4, e, x, y });
      }
    }
    list.sort((a, b) => a.y - b.y);
    const snow = season === 3;
    for (const it of list) {
      if (it.o) drawObj(it.o, season, snow, sc < 1, S, now);
      else if (it.corpo) drawCorpo(it.corpo, now);
      else if (it.b) drawBuilding(S, it.b, now, it.row, it.part);
      else if (it.e) drawEnt(S, it.e, it.x, it.y, now);
      else if (it.c) drawBicho(it.c, it.x, it.y, now);
      else if (it.fe !== undefined) drawFence(S, it.fe, snow);
      else if (it.cr) drawCria(S, it.cr, it.x, it.y);
      else if (it.soc) drawSoc(S, it, now);
      else { drawPerson(S, it.p, it.x, it.y, now); if (levado[it.p.id]) blit(A.spr.corpo, it.x * TS - 7, it.y * TS - 15); }
    }
    // Etapa 14: o fogo posto (chamas por cima da obra), o julgamento (a balança sobre o fogo) e o olho de Deus
    if (S && S.soc) {
      if (S.soc.arde) for (const b of S.buildings) {
        if (!b.fogo || b.x + b.w < tx0 || b.x > tx1 || b.y + b.h < ty0 || b.y > ty1) continue;
        const bw = b.w * TS, bh = b.h * TS;
        for (let k = 0; k < 7; k++) {
          const fx = b.x * TS + 2 + ((k * 37 + b.id * 13) % Math.max(1, bw - 6)), ph = Math.floor(now / 110 + k * 1.7) % 4, fh = 5 + ((k * 5 + ph * 3) % 7);
          const fy = b.y * TS + bh - 6 - ((k * 11) % Math.max(1, bh - 10));
          rect(fx, fy - fh, 3, fh, '#f77622'); rect(fx + 1, fy - fh + 1, 1, Math.max(1, fh - 2), '#fee761'); rect(fx + 1, fy - fh - 1 - (ph % 2), 1, 1, '#feae34');
        }
        if (Math.random() < 0.5) spawn({ x: b.x * TS + Math.random() * bw, y: b.y * TS + 4, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, g: 0, life: 2 + Math.random(), col: Math.random() < 0.4 ? '#f77622' : 'rgba(60,60,72,0.7)' });
      }
      const J = S.soc.julg;
      if (J) { const f = G.Sim.building(S, J.fire); if (f) { const ic = A.icon('julg'), bob = Math.round(Math.sin(now / 300) * 1); blit(ic, (f.x + 0.5) * TS - ic.width / 2, f.y * TS - 16 + bob, J.st === 'on' ? 1 : 0.6); } }
    }
    for (let i = olhos.length - 1; i >= 0; i--) {
      const o = olhos[i], t = (performance.now() - o.t0) / 1000;
      if (t > 4) { olhos.splice(i, 1); continue; }
      const ic = A.icon(o.known ? 'crime' : 'olho');
      blit(ic, o.x * TS + 8 - ic.width / 2, o.y * TS - 12 - t * 3, Math.max(0, Math.min(1, 2 - t / 2)));
    }
    // Etapa 13: a fumaça do rito sobe do fogo, lilás e cinza
    const rito = S && S.memoria && S.memoria.erva.rite;
    if (rito && rito.on && Math.random() < 0.35) {
      const f = G.Sim.building(S, rito.fire);
      if (f) spawn({ x: (f.x + 0.5) * TS + (Math.random() - 0.5) * 10, y: (f.y + 0.2) * TS, vx: (Math.random() - 0.5) * 5, vy: -9, g: 0, life: 2.6, col: Math.random() < 0.5 ? 'rgba(181,139,224,0.55)' : 'rgba(192,203,220,0.4)' });
    }
    if (spears.length) drawSpears(now);
    // partículas
    view.x0 = vx0; view.y0 = vy0; view.x1 = vx1; view.y1 = vy1;
    updateParts(dt, S, now);
    for (const p of parts) {
      if (p.spr) blit(A.spr[p.spr], p.x - 2, p.y - 2, Math.min(1, p.life / 1.2));
      else if (p.col === 'smoke') { const a = Math.min(1, p.life / 2.2); rect(p.x, p.y, 2, 2, 'rgba(192,203,220,' + (a * 0.5).toFixed(2) + ')'); }
      else if (p.flap) { const open = Math.floor(now / 110 + p.ph * 10) % 2; rect(p.x - (open ? 1 : 0), p.y, open ? 3 : 1, 1, p.col); rect(p.x, p.y + 1, 1, 1, '#3f2832'); }
      else rect(p.x, p.y, p.sz || 1, 1, p.col);
    }
    // 0.16: sombras de nuvem passando devagar pelo chão (de dia, com o céu limpo ou nublado)
    if (S) drawClouds(S, w, now);
    // névoa sobre o que o povo ainda não viu
    if (S && S.seen) drawFog(S);
    // sobreposições do jogador
    const ov = R.overlay;
    if (ov.ghost) drawGhost(S, ov.ghost, now);
    if (S && ov.brush) drawBrush(S, ov.brush);
    if (ov.cast) drawCast(ov.cast, now);
    if (S && ov.selPerson) {
      const p = S.people.find((q) => q.id === ov.selPerson);
      if (p && p.alive) {
        const x = p.inTent ? p.x : U.lerp(p.px, p.x, alpha), y = p.inTent ? p.y - 1.4 : U.lerp(p.py, p.y, alpha);
        const bob = Math.round(Math.sin(now / 220) * 1.5), kid = G.Family.stage(S, p) === 'crianca';
        blit(A.spr.chevron, x * TS - 3.5, y * TS - (kid ? 15 : 19) + bob);
      }
    }
    if (S && ov.selBuilding) {
      const b = S.buildings.find((q) => q.id === ov.selBuilding);
      if (b) outline(b.x * TS, b.y * TS, b.w * TS, b.h * TS, '#feae34');
    }
    // noite
    if (S) {
      drawLight(S, now);
      if ((S.narr && S.narr.ents.length) || S.fauna) drawEyes(S, alpha);
      drawWeather(S, dt);
      drawSky(S, now);
    }
    if (S && ov.follow) drawFollow(S, ov.follow, alpha, now);   // por cima da noite: quem é seguido aparece a qualquer hora
    if (ov.ring) drawRing(ov.ring);
    if (ov.beam) drawBeam(ov, now);
    if (bolts.length) drawBolts(now);
  };

  // quem a câmera segue: quatro cantos de visor em volta da pessoa (da barraca, se ela está dentro; de quem carrega,
  // se é bebê de colo), pulsando de leve
  function drawFollow(S, pid, alpha, now) {
    const p = S.people.find((q) => q.id === pid);
    if (!p || !p.alive) return;
    let q = p;
    if (p.carriedBy) { const c = S.people.find((z) => z.id === p.carriedBy && z.alive); if (c) q = c; }
    let x, y, w, h;
    if (q.inTent) {
      const b = S.buildings.find((z) => z.id === q.inTent);
      if (!b) return;
      x = b.x * TS - 2; y = b.y * TS - 5; w = b.w * TS + 4; h = b.h * TS + 7;
    } else {
      const wx = Math.round(U.lerp(q.px, q.x, alpha) * TS), wy = Math.round(U.lerp(q.py, q.y, alpha) * TS), kid = G.Family.stage(S, q) === 'crianca';
      x = wx - (kid ? 6 : 7); y = wy - (kid ? 10 : 13); w = kid ? 12 : 14; h = kid ? 16 : 19;
    }
    const g = Math.round(Math.sin(now / 280) * 0.6 + 0.6), L = 4;
    x -= g; y -= g; w += g * 2; h += g * 2;
    // cada canto: dois traços (o escuro por baixo dá contraste na grama, na água e na neve)
    for (const [ox2, oy2, col] of [[1, 1, '#181425'], [0, 0, '#2ce8f5']]) {
      for (const [cx, sx] of [[x, 1], [x + w - 1, -1]]) for (const [cy, sy] of [[y, 1], [y + h - 1, -1]]) {
        rect(Math.min(cx, cx + sx * (L - 1)) + ox2, cy + oy2, L, 1, col);
        rect(cx + ox2, Math.min(cy, cy + sy * (L - 1)) + oy2, 1, L, col);
      }
    }
  }

  // ---------- névoa ----------
  // um pixel por tile, em degraus (borda mais clara), desenhado sem suavizar para ficar no estilo pixel
  let fogCv = null, fogCtx = null, fogRev = -1, fogWorld = null;
  function drawFog(S) {
    const w = S.world, seen = S.seen, Wt = w.W, Ht = w.H;
    if (!fogCv || fogWorld !== w) { [fogCv, fogCtx] = A.mk(Wt, Ht); fogWorld = w; fogRev = -1; }
    if (fogRev !== S.seenRev) {
      fogRev = S.seenRev;
      const img = fogCtx.createImageData(Wt, Ht), d = img.data;
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
        const i = y * Wt + x, o = i * 4;
        d[o] = 24; d[o + 1] = 20; d[o + 2] = 37;
        if (seen[i]) { d[o + 3] = 0; continue; }
        let near = 3;
        for (let dy = -2; dy <= 2 && near > 1; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= Wt || ny >= Ht || !seen[ny * Wt + nx]) continue;
          const c = Math.max(Math.abs(dx), Math.abs(dy));
          if (c < near) near = c;
        }
        d[o + 3] = near === 1 ? 150 : near === 2 ? 200 : 232;
      }
      fogCtx.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fogCv, ox, oy, Wt * TS * sc, Ht * TS * sc);
    ctx.restore();
  }

  function drawAuras(S, now) {
    // Etapa 11: a Bênção (um brilho verde-dourado no chão) e a Luz do escolhido e da estátua do fogo
    for (const b of S.god.blessings || []) {
      if (b.until <= S.t) continue;
      const cx = (b.x + 0.5) * TS * sc + ox, cy = (b.y + 0.5) * TS * sc + oy, r = b.r * TS * sc;
      const left = (b.until - S.t) / (C.BENCAO_H * 60), pulse = 0.5 + 0.5 * Math.sin(now / 800);
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, 'rgba(155,224,112,' + (0.10 + 0.04 * pulse) * Math.min(1, left * 4) + ')');
      g.addColorStop(0.8, 'rgba(254,231,97,' + 0.06 * Math.min(1, left * 4) + ')');
      g.addColorStop(1, 'rgba(254,231,97,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.12) spawn({ x: (b.x + 0.5) * TS + (Math.random() - 0.5) * b.r * TS * 1.5, y: (b.y + 0.5) * TS + (Math.random() - 0.5) * b.r * TS * 1.5, vx: 0, vy: -6, g: 0, life: 1.3, col: Math.random() < 0.5 ? '#9be070' : '#fee761' });
    }
    if (G.Deus && S.god.pending) {
      const night = S.ck.hour >= 18.5 || S.ck.hour < 5.5;
      for (const L of G.Deus.lights(S)) {
        const cx = L.x * TS * sc + ox, cy = L.y * TS * sc + oy, r = L.r * TS * sc, pulse = 0.5 + 0.5 * Math.sin(now / 500 + (L.pid || L.bid || 0));
        ctx.save();
        const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
        g.addColorStop(0, 'rgba(254,231,97,' + ((night ? 0.2 : 0.09) + 0.05 * pulse) + ')');
        g.addColorStop(1, 'rgba(254,174,52,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    for (const a of S.god.auras) {
      const cx = (a.x + 0.5) * TS * sc + ox, cy = (a.y + 0.5) * TS * sc + oy, r = a.r * TS * sc;
      const left = (a.until - S.t) / (C.CALOR_HOURS * 60);
      const pulse = 0.5 + 0.5 * Math.sin(now / 600);
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, 'rgba(254,174,52,' + (0.16 + 0.06 * pulse) * Math.min(1, left * 3) + ')');
      g.addColorStop(1, 'rgba(254,174,52,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.25) spawn({ x: (a.x + 0.5) * TS + (Math.random() - 0.5) * a.r * TS * 1.4, y: (a.y + 0.5) * TS + (Math.random() - 0.5) * a.r * TS * 1.4, vx: 0, vy: -12, g: 0, life: 1.1, col: '#feae34' });
    }
  }

  function drawCast(c, now) {
    const cx = (c.x + 0.5) * TS * sc + ox, cy = (c.y + 0.5) * TS * sc + oy;
    const col = c.kind === 'chuva' ? '#2ce8f5' : c.kind === 'raio' ? '#ffffff' : c.kind === 'cura' ? '#63c74d' : '#feae34';
    ctx.save();
    ctx.lineWidth = Math.max(2, dpr * 2);
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.lineDashOffset = -now / 40;
    ctx.strokeStyle = c.ok ? col : '#e43b44';
    const r = Math.max(0.6, c.r) * TS * sc;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.12; ctx.fillStyle = c.ok ? col : '#e43b44'; ctx.fill();
    ctx.globalAlpha = 1;
    const s = Math.max(3, TS * sc * 0.35);
    ctx.fillStyle = c.ok ? col : '#e43b44';
    ctx.fillRect(cx - s / 2, cy - 1, s, 2); ctx.fillRect(cx - 1, cy - s / 2, 2, s);
    ctx.restore();
  }

  function drawBolts(now) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], t = (now - b.t0) / 1000;
      if (t > 0.5) { bolts.splice(i, 1); continue; }
      const tx = (b.x + 0.5) * TS * sc + ox, ty = (b.y + 0.6) * TS * sc + oy;
      if (t < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - t / 0.12)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      const a = 1 - t / 0.5;
      const step = Math.max(6, TS * sc * 0.9);
      const pts = [];
      let x = tx + Math.sin(b.seed) * TS * sc * 3, y = -10;
      while (y < ty) {
        pts.push([x, y]);
        y += step;
        x += (Math.sin(b.seed + y * 0.37) + Math.sin(b.seed * 1.7 + y * 0.11)) * step * 0.45;
        x += (tx - x) * Math.min(1, y / ty) * 0.35;
      }
      pts.push([tx, ty]);
      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = 'rgba(254,231,97,' + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = Math.max(4, sc * 2.4);
      ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(2, sc);
      ctx.stroke();
      ctx.restore();
    }
  }

  // coluna de luz: o momento em que o casal chega
  function drawBeam(ov, now) {
    const b = ov.beam, t = (now - b.t0) / 1000;
    if (t > 6) { ov.beam = null; return; }
    const a = t < 0.7 ? t / 0.7 : t > 4 ? Math.max(0, (6 - t) / 2) : 1;
    const cx = Math.round(b.x * TS * sc + ox), by = Math.round(b.y * TS * sc + oy);
    const wd = Math.round(TS * 2.4 * sc), step = Math.max(2, Math.round(sc * 2));
    ctx.save();
    for (let y = 0; y < by; y += step) {
      const f = y / by;
      ctx.fillStyle = 'rgba(254,231,97,' + (0.5 * a * f * f).toFixed(3) + ')';
      ctx.fillRect(cx - wd / 2, y, wd, step);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 * a * f).toFixed(3) + ')';
      ctx.fillRect(cx - wd / 8, y, wd / 4, step);
    }
    const g = ctx.createRadialGradient(cx, by, 0, cx, by, wd * 1.6);
    g.addColorStop(0, 'rgba(254,231,97,' + (0.6 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(254,231,97,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - wd * 1.6, by - wd * 1.6, wd * 3.2, wd * 3.2);
    const px = Math.max(2, Math.round(sc));
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.6 + i / 14) % 1;
      const sx = cx + Math.sin(i * 12.9 + t * 2) * wd * 0.7, sy = by - ph * wd * 3;
      ctx.fillStyle = 'rgba(255,244,184,' + ((1 - ph) * a).toFixed(3) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), px, px);
    }
    ctx.restore();
  }

  function outline(x, y, w, h, col) {
    const t = Math.max(1, Math.round(sc / 3));
    ctx.fillStyle = col;
    const X = Math.round(x * sc + ox), Y = Math.round(y * sc + oy), Wd = Math.round(w * sc), Hd = Math.round(h * sc);
    const seg = Math.max(2, Math.round(sc * 2));
    for (let i = 0; i < Wd; i += seg * 2) { ctx.fillRect(X + i, Y, Math.min(seg, Wd - i), t); ctx.fillRect(X + i, Y + Hd - t, Math.min(seg, Wd - i), t); }
    for (let i = 0; i < Hd; i += seg * 2) { ctx.fillRect(X, Y + i, t, Math.min(seg, Hd - i)); ctx.fillRect(X + Wd - t, Y + i, t, Math.min(seg, Hd - i)); }
  }

  // Etapa 13: o corpo enrolado na esteira; no velório, uma vela de cada lado
  function drawCorpo(d, now) {
    const S = A.spr, wx = d.x * TS, wy = d.y * TS;
    blit(S.corpo, wx - 7, wy - 3);
    if (d.corpo.st === 2) {
      const f = Math.floor(now / 260) % 2;
      blit(S.velaCova[f], wx - 11, wy - 4); blit(S.velaCova[1 - f], wx + 8, wy - 4);
    }
  }
  // o cemitério cercado: a cerca baixa dá a volta nas covas
  function cercaCem(S, b) {
    let x0 = b.x, y0 = b.y, x1 = b.x + 1, y1 = b.y + 1;
    for (const o of G.Memoria.graves(S)) {
      if (!o.pid || Math.abs(o.x - b.x) > 20 || Math.abs(o.y - b.y) > 20) continue;
      x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x); y1 = Math.max(y1, o.y);
    }
    const X0 = x0 * TS - 6, Y0 = y0 * TS - 5, X1 = (x1 + 1) * TS + 5, Y1 = (y1 + 1) * TS + 4;
    const post = (x, y) => { rect(x, y - 4, 2, 5, '#9a5e42'); rect(x, y - 4, 2, 1, '#d49a6a'); };
    rect(X0, Y0 - 2, X1 - X0 + 1, 1, '#733e39'); rect(X0, Y1 - 2, X1 - X0 + 1, 1, '#733e39');
    rect(X0, Y0 - 2, 1, Y1 - Y0, '#733e39'); rect(X1, Y0 - 2, 1, Y1 - Y0, '#733e39');
    for (let x = X0; x <= X1; x += 8) { post(x, Y0); post(x, Y1); }
    for (let y = Y0 + 8; y < Y1; y += 8) { post(X0, y); post(X1 - 1, y); }
  }
  // 0.16: vento nas copas. O alto da árvore anda um pixel de lado numa onda que atravessa o mapa (a rajada passa de
  // árvore em árvore); o tronco fica parado. Na chuva o vento sobe, na tempestade e na nevasca mais ainda
  let wind = 1;
  function swayOf(o, now) {
    const ph = now / 1000 * 1.25 - o.x * 0.31 - o.y * 0.12;
    return Math.round((Math.sin(ph) + Math.sin(ph * 0.47 + o.id) * 0.45) * 0.62 * wind);
  }
  function blitTree(img, wx, wy, trunk, dx) {
    if (!dx) { blit(img, wx, wy); return; }
    const cut = img.height - trunk, X = (v) => Math.round(v * sc + ox), Y = (v) => Math.round(v * sc + oy), w = Math.round(img.width * sc);
    ctx.drawImage(img, 0, 0, img.width, cut, X(wx + dx), Y(wy), w, Y(wy + cut) - Y(wy));
    ctx.drawImage(img, 0, cut, img.width, trunk, X(wx), Y(wy + cut), w, Y(wy + img.height) - Y(wy + cut));
  }
  function drawObj(o, season, snow, tiny, st, now) {
    const bx = o.x * TS, by = o.y * TS;
    const S = A.spr;
    switch (o.k) {
      case 'tree': {
        const arau = o.sp === 'arau', dx = tiny ? 0 : swayOf(o, now || 0);
        if (!tiny) blit(S.bigShadow, bx - 3 + (dx > 0 ? 1 : 0), by + 11);
        if (arau) blitTree(S.arau[season][o.v], bx - 3, by + 13 - 30, 8, dx);
        else if (o.sp === 'nobre') blitTree(S.nobre[season][o.v % 3], bx - 3, by + 13 - 23, 6, dx);   // Etapa 17
        else if (o.sp === 'mangue') blitTree(S.mangue[season][o.v % 2], bx - 2, by + 13 - 20, 8, dx);
        else blitTree(S.broad[season][o.v], bx - 3, by + 13 - 23, 6, dx);
        break;
      }
      case 'stump': blit(S.stump[snow ? 1 : 0], bx + 3, by + 7); break;
      case 'junco': blit(S.junco[season][o.v % 2], bx + 3, by + 2); break;   // Etapa 17
      case 'bush':
        if (o.sp === 'cacto') { blit(S.cacto[season][o.fruit > 0 ? 1 : 0], bx + 2, by + 3); break; }   // Etapa 17: o mandacaru
        if (o.holy) {
          // Etapa 11: a árvore de Deus, de fruta dourada (e um brilho de vez em quando)
          blit(S.holyBush[Math.min(5, o.fruit)], bx + 1, by + 4);
          if (!tiny && ((performance.now() / 650 + o.id * 1.7) % 6) < 0.35) rect(bx + 4 + (o.id % 7), by + 5 + (o.id % 3), 1, 1, '#fee761');
        } else blit(S.bush[season][Math.min(3, o.fruit)], bx + 1, by + 4);
        break;
      case 'rock': {
        if (o.sal) { blit(S.salina, bx + 1, by + 9); break; }   // Etapa 17: a salina e o veio de ouro
        if (o.ouro) { const im = S.veio[o.v % 2][snow ? 1 : 0]; blit(im, bx + 8 - im.width / 2, by + 14 - im.height); break; }
        const sz = o.big ? (o.ch >= 3 ? 2 : 1) : 0;
        const img = S.rock[sz][snow ? 1 : 0][o.v % 2];
        blit(img, bx + 8 - img.width / 2, by + 14 - img.height);
        break;
      }
      case 'grave': {
        // Etapa 13: a cova de cada povo (a antiga, sem rito, segue com a lápide de sempre), flores, oferenda e vela
        const r = o.r ? o.r.charAt(0) : '';
        if (!r) blit(S.grave, bx + 3, by + 3);
        else if (r === 'e' && st && st.t - o.t > G.CFG.ARVORE_COVA_D * G.CFG.DAY_MIN) blit(S.cova.arv, bx + 2, by - 1);
        else blit(r === 'a' && !o.laje ? S.cova.a0 : S.cova[r] || S.cova.h, bx + 3, by + 3);
        if (st && !tiny) {
          if (o.fl > st.t) blit(S.florCova, bx + 1, by + 12);
          if (o.of > st.t) blit(S.ofertaCova, bx + 11, by + 12);
          if (st.memoria && (st.memoria.fin.velas || 0) > st.t) blit(S.velaCova[Math.floor((now || 0) / 260 + o.id) % 2], bx + 12, by + 8);
        }
        break;
      }
      case 'erva': if (!tiny) blit(S.erva, bx + 3, by + 5); break;
    }
  }

  function drawCamp(S) {
    const x = S.camp.x * TS, y = S.camp.y * TS;
    blit(A.spr.mat, x, y);
    const st = S.stock, it = A.spr.item;
    const pile = (img, n, x0, y0, cols, dx, dy, max) => {
      const k = Math.min(max, n);
      for (let i = 0; i < k; i++) {
        const cx = i % cols, cy = Math.floor(i / cols);
        blit(img, x0 + cx * dx + (cy % 2) * 2, y0 - cy * dy);
      }
    };
    pile(it.madeira, Math.ceil(st.madeira / 5), x + 4, y + 11, 2, 8, 3, 8);
    pile(it.pedra, Math.ceil(st.pedra / 4), x + 20, y + 11, 2, 6, 3, 6);
    pile(it.frutas, Math.ceil(st.frutas / 8), x + 4, y + 24, 2, 8, 3, 6);
    pile(it.peixe, Math.ceil(st.peixe / 4), x + 19, y + 24, 2, 6, 2, 6);
    pile(it.agua, Math.ceil(st.agua / 6), x + 13, y + 26, 3, 4, 0, 5);
  }

  // no chão, debaixo de todos: os bancos da fogueira do centro e os caminhos marcados (ainda por abrir)
  function drawGround(S, tx0, ty0, tx1, ty1) {
    const S2 = A.spr;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || (b.lv || 1) < 3) continue;
      if (b.x < tx0 - 2 || b.x > tx1 + 2 || b.y < ty0 - 2 || b.y > ty1 + 2) continue;
      const bx = b.x * TS, by = b.y * TS;
      blit(S2.bench.h, bx + 2, by - 7); blit(S2.bench.h, bx + 2, by + 19);
      blit(S2.bench.v, bx - 9, by + 4); blit(S2.bench.v, bx + 20, by + 4);
    }
    // Etapa 10: a terra da roça (com o mato e a palha da última colheita), o chão do curral e as cercas marcadas
    const season = S.ck.season;
    for (const b of S.buildings) {
      if ((b.type !== 'roca' && b.type !== 'curral') || b.x + b.w < tx0 - 1 || b.x > tx1 + 1 || b.y + b.h < ty0 - 1 || b.y > ty1 + 1) continue;
      const bx = b.x * TS, by = b.y * TS, al = b.built ? undefined : 0.45, lv = b.lv || 1;
      if (b.type === 'curral') { blit(A.curral(Math.min(2, lv), 'ground'), bx, by - 12, al); continue; }
      blit(A.rocaSoil(season === 3 ? 'snow' : lv >= 2 ? 'rich' : 'warm'), bx, by, al);
      const f = b.farm;
      if (!f || !b.built) continue;
      if (f.st === 'crescendo' && f.mato && !f.weeded) blit(A.rocaWeeds(), bx, by);
      else if (f.st === 'vazia' && f.last && S.t - f.last.t < 8 * C.DAY_MIN && season !== 3) blit(A.rocaStubble(f.last.k === 'algodao'), bx, by);
    }
    const fj = S.campo && S.campo.fjobs;
    if (fj && fj.length) for (const j of fj) {
      const x = j.i % S.world.W, y = (j.i / S.world.W) | 0;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      // estaca fincada e o barbante marcando
      rect(x * TS + 2, y * TS + 7, TS - 4, 1, 'rgba(234,212,170,0.75)');
      rect(x * TS + 7, y * TS + 3, 2, 9, 'rgba(154,94,66,0.85)');
      rect(x * TS + 7, y * TS + 3, 2, 1, 'rgba(254,174,52,0.9)');
      if (j.prog > 0) rect(x * TS + 2, y * TS + TS - 3, (TS - 4) * Math.min(1, j.prog), 2, '#63c74d');
    }
    const mu = S.buildings.find((b) => b.type === 'muralha');
    if (mu) drawMuralha(S, mu, tx0, ty0, tx1, ty1);   // Etapa 16
    const w = S.world, jobs = S.obras && S.obras.jobs;
    if (!jobs || !jobs.length) return;
    for (const j of jobs) {
      const x = j.i % w.W, y = (j.i / w.W) | 0;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      rect(x * TS + 2, y * TS + 2, TS - 4, TS - 4, j.lv >= 3 ? 'rgba(139,155,180,0.5)' : 'rgba(184,138,94,0.5)');
      rect(x * TS + 2, y * TS + 2, TS - 4, 1, 'rgba(254,174,52,0.7)');
      if (j.prog > 0) rect(x * TS + 2, y * TS + TS - 4, (TS - 4) * Math.min(1, j.prog), 2, '#63c74d');
    }
  }

  // o tambor está nas mãos de alguém que já chegou na roda da festa (Etapa 8)?
  function drumPlaying(S) {
    const pt = S.life && S.life.party;
    if (!pt || !pt.on || !pt.drummer) return false;
    const q = S.people.find((x) => x.id === pt.drummer);
    return !!(q && q.alive && q.act && q.act.type === 'festa' && q.act.stage === 'dance' && !(q.path && q.pathI < q.path.length));
  }
  // a figura da obra no nível dela (Etapa 7): casas, oficinas, armazém
  function houseImg(d) { const S2 = A.spr; return d.lv >= 3 && d.kind ? S2.house[d.kind] : S2.house[d.lv >= 2 ? 2 : 1]; }
  function drawBuilding(S, b, now, row, part) {
    const S2 = A.spr, bx = b.x * TS, by = b.y * TS;
    const ghost = !b.built, d = G.Sim.def(b), lv = d.lv || 1;
    if (b.type === 'roca') {
      // Etapa 10: uma fileira das plantas (a terra fica no chão, em drawGround); a entrada sem fileira só desenha a obra
      if (row !== undefined) { drawRocaRow(S, b, row); return; }
    } else if (b.type === 'curral') {
      blit(A.curral(Math.min(2, lv), part === 'back' ? 'back' : 'front'), bx, by - 12, ghost ? 0.45 : undefined);
      if (part === 'back') return;
    } else if (b.type === 'fogueira') {
      const lit = b.built && b.fuel > 0, F = S2.fireLv[Math.min(3, lv)];
      const img = lit ? F.lit[Math.floor(now / 140) % 3] : F.out;
      blit(img, bx, by - 2, ghost ? 0.45 : undefined);
      // Etapa 8: com os vasos, a panela no fogo; com o tambor, ele fica ao lado da fogueira do acampamento (menos na festa)
      if (lit && G.Tech.known(S, 'vasos')) blit(S2.vasoFogo, bx + 5, by + 3);
      if (b.built && G.Tech.known(S, 'tambor') && G.Life && G.Life.campFire(S) === b && !drumPlaying(S)) blit(S2.tambor, bx + 17, by + 4);
    } else if (b.type === 'moquem' || b.type === 'jirau' || b.type === 'forno') {
      drawWorks(S2, b, bx, by, ghost, now, lv);
    } else if (S2.cidade && S2.cidade[b.type]) {
      drawCidade(S, S2, b, bx, by, ghost, lv);   // Etapa 16
    } else if (S2.shop[b.type]) {
      drawShop(S, S2, b, bx, by, ghost, lv, now);
    } else if (b.type === 'estatua') {
      // Etapa 11: a estátua (o nicho com a cor do milagre); consagrada, uma luz gira em volta da cabeça
      // Etapa 17: a grande estátua sobe num pedestal de pedra
      const ped = lv >= 3 ? 7 : 0, img = A.statue(lv, b.built ? b.milagre : null), top = by + 31 - img.height - ped;
      blit(S2.bigShadow, bx + 6, by + 27, ghost ? 0.4 : undefined);
      if (ped) { rect(bx + 3, by + 24, 26, 8, '#6d6672'); rect(bx + 3, by + 24, 26, 2, '#bdb2a6'); rect(bx + 3, by + 31, 26, 1, '#2b2733'); rect(bx + 5, by + 27, 22, 1, '#938a8c'); }
      blit(img, bx, top, ghost ? 0.45 : undefined);
      if (b.built && b.milagre) {
        const col = A.GEM[b.milagre] || '#fee761';
        for (let k = 0; k < 6; k++) {
          const ang = now / 900 + k * Math.PI / 3;
          rect(bx + 16 + Math.cos(ang) * 6 - 0.5, top + 8 + Math.sin(ang) * 2.5, 1, 1, k % 2 ? '#ffffff' : col);
        }
        if (Math.random() < 0.04) spawn({ x: bx + 16 + (Math.random() - 0.5) * 12, y: top + 10, vx: 0, vy: -8, g: 0, life: 1.2, col });
      } else if (b.built) {
        // ainda sem milagre: o sinal de Deus pulsa em cima, chamando o toque
        const icon = A.icon('deus'), bob = Math.round(Math.sin(now / 300) * 1.5);
        blit(icon, bx + 16 - icon.width / 2, top - 12 + bob, 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(now / 400)));
      }
    } else {
      const img = houseImg(d);
      const top = by + 31 - img.height;
      blit(S2.bigShadow, bx + 5, by + 26, ghost ? 0.4 : undefined);
      blit(img, bx, top, ghost ? 0.45 : undefined);
      // parto dentro da barraca: um sinal acima dela
      const dentro = FX && FX.tent.get(b.id);
      const labor = dentro ? dentro.labor : null;
      if (labor && !ghost) {
        const bob = Math.round(Math.sin(now / 250) * 1);
        const icon = A.icon(labor.labor.hard && !labor.labor.helped ? 'reza' : 'bebe');
        blit(icon, bx + 16 - icon.width / 2, top - 13 + bob);
      }
      // zzz de quem dorme dentro
      const sleepers = dentro ? dentro.sleepers : 0;
      if (sleepers && !ghost) {
        const t = (now / 1000) % 2;
        for (let i = 0; i < 2; i++) {
          const ph = (t + i) % 2;
          blit(S2.z, bx + 22 + ph * 3, top - 3 - ph * 6, Math.max(0, 1 - ph / 2));
        }
      }
    }
    const job = G.Sim.jobOf(b);
    if (job) {
      // 0.12: a obra sendo desmontada tem contorno e barra vermelhos, e a marca em cima (o X, ou as setas se vai mudar)
      const dem = !!job.demol;
      outline(bx, by, b.w * TS, b.h * TS, dem ? '#e43b44' : '#feae34');
      let need = 0, have = 0;
      for (const k in job.cost) { need += job.cost[k]; have += Math.min(job.cost[k], job.have[k] || 0); }
      const f = job.progress > 0 || !need ? job.progress : have / need * 0.999;
      rect(bx + 1, by - 5, b.w * TS - 2, 3, '#181425');
      rect(bx + 2, by - 4, (b.w * TS - 4) * U.clamp(f, 0, 1), 1, dem ? '#e43b44' : job.progress > 0 ? '#63c74d' : '#feae34');
      if (dem) { const m = b.demol.site ? S2.mover : S2.demolir, bob = Math.round(Math.sin(now / 300) * 1); blit(m, bx + b.w * TS / 2 - 4.5, by - 16 + bob); }
    } else if (b.site) {
      // o lugar reservado de uma mudança: o contorno tracejado e as setas
      outline(bx, by, b.w * TS, b.h * TS, '#feae34');
      blit(S2.mover, bx + b.w * TS / 2 - 4.5, by + b.h * TS / 2 - 4.5 + Math.round(Math.sin(now / 300) * 1));
    }
    if (b.type === 'fogueira' && b.built) {
      rect(bx + 2, by + 15, 12, 2, '#181425');
      rect(bx + 3, by + 15.5, 10 * b.fuel / C.FIRE_CAP, 1, b.fuel > C.FIRE_REFUEL_AT ? '#feae34' : '#e43b44');
    }
  }

  // Etapa 10: as plantas de uma fileira da roça, e a colheita no chão esperando quem leve
  function drawRocaRow(S, b, r) {
    const f = b.farm, bx = b.x * TS, by = b.y * TS;
    if (!f) return;
    if (f.k && (f.st === 'crescendo' || f.st === 'madura')) {
      const stage = f.st === 'madura' ? 3 : f.grow < 0.1 ? 0 : f.grow < 0.45 ? 1 : 2;
      blit(A.rocaRow(f.k, stage, r), bx, by + r * TS - 14);
    }
    if (r === 2 && f.pile > 0) {
      const it = A.spr.item[f.pileK] || A.spr.item.milho, n = Math.min(4, Math.ceil(f.pile / 15));
      for (let i = 0; i < n; i++) blit(it, bx + 34 + (i % 2) * 6, by + 40 - Math.floor(i / 2) * 4);
    }
  }
  // cerca: o mourão e as varas até os vizinhos (a porteira, em cima do caminho, com tábuas claras e sem mourão no meio)
  function drawFence(S, i, snow) {
    const w = S.world, f = w.fence, x = i % w.W, y = (i / w.W) | 0, road = w.road;
    const gateAt = (j) => !!(road && road[j] >= 2);
    const e = x + 1 < w.W && f[i + 1], s = y + 1 < w.H && f[i + w.W], g = gateAt(i);
    const lone = !e && !s && !(x > 0 && f[i - 1]) && !(y > 0 && f[i - w.W]);
    const m = (e ? 1 : 0) | (s ? 2 : 0) | (e && (g || gateAt(i + 1)) ? 4 : 0) | (s && (g || gateAt(i + w.W)) ? 8 : 0) | (g ? 0 : 16) | (snow ? 32 : 0) | (lone ? 64 : 0);
    blit(A.fence(m), x * TS, y * TS - 10);
  }
  // bichos de criação: de lado; pintinho nos primeiros dias; galo, carneiro e boi têm a figura deles
  function criaKey(S, a) {
    if (a.sp === 'galinha') return S.t - (a.born || 0) < 10 * C.DAY_MIN ? 'pinto' : a.sex === 'M' ? 'galo' : 'galinha';
    if (a.sp === 'ovelha') return a.sex === 'M' ? 'carneiro' : 'ovelha';
    if (a.sp === 'gado') return a.sex === 'M' ? 'boi' : 'vaca';
    return a.sp;
  }
  function drawCria(S, a, x, y) {
    const key = criaKey(S, a), d = A.CRIA[key], wx = x * TS, wy = y * TS;
    const side = sideOf('c' + a.id, a) === 3 ? 1 : 0;
    const frame = a.path ? 1 + (Math.floor(a.walk * 4) % 2) : 0;
    const sh = A.spr[d.w >= 16 ? 'midShadow' : 'shadow'];
    blit(sh, wx - sh.width / 2, wy + 1);
    const alt = a.id % 3 === 0 && key !== 'galo' && key !== 'pinto' && key !== 'carneiro';
    ctx.drawImage(A.criaSheet(key, alt), frame * d.w, side * d.h, d.w, d.h, Math.round((wx - d.w / 2) * sc + ox), Math.round((wy + 3 - d.h) * sc + oy), Math.round(d.w * sc), Math.round(d.h * sc));
  }
  // moquém, jirau e forno de barro: a obra (no nível dela) e o que está nela
  function drawWorks(S2, b, bx, by, ghost, now, lv) {
    const al = ghost ? 0.45 : undefined, big = lv >= 2;
    if (b.type === 'moquem') {
      // o grande tem duas grelhas: a de cima começa 2 px mais alto
      blit(big ? S2.works2.moquem : S2.moquem, bx, big ? by - 3 : by - 2, al);
      const q = b.batch;
      if (q && !ghost) {
        const it = A.spr.item[q.k === 'carne' ? 'carne' : 'peixe'];
        const done = 1 - q.left / (C.MOQUEM_H * 60);
        const decks = big && q.n > 10 ? [by - 4, by] : [big ? by - 4 : by - 2];
        for (const y of decks) {
          // o peixe escurece na fumaça
          blit(done > 0.5 ? A.spr.item.defumado : it, bx + 3, y); blit(done > 0.5 ? A.spr.item.defumado : it, bx + 8, y + 1);
        }
      }
      return;
    }
    if (b.type === 'jirau') {
      // o coberto tem o mesmo estrado, com o telhado 12 px acima
      blit(big ? S2.works2.jirau : S2.jirau, bx, big ? by - 7 : by + 2, al);
      const q = b.batch;
      if (q && !ghost) {
        const done = 1 - q.left / (C.JIRAU_H * 60);
        const col = done < 0.33 ? '#e43b44' : done < 0.66 ? '#be4a2f' : '#d77643';   // vermelha, depois passa, depois seca
        const n = Math.min(big ? 20 : 12, q.n);
        for (let i = 0; i < n; i++) { const k = i % 12, fx = bx + 4 + k * 2 + (i % 2) + (i >= 12 ? 1 : 0), fy = by + 3 + (i % 3 === 0 ? 0 : 1) - (i >= 12 ? 1 : 0); rect(fx, fy, 1.5, 1.5, col); }
      }
      return;
    }
    blit(S2.bigShadow, bx + 5, by + 27, ghost ? 0.4 : undefined);
    if (big) blit(S2.works2.forno, bx, by - 1, al);
    else blit(S2.forno, bx, by + 1, al);
  }
  // Etapa 16: grandes obras e instituições. A grande obra em andamento sobe de baixo para cima até onde o trabalho
  // chegou, com o desenho inteiro apagadinho atrás e os andaimes por cima
  function drawCidade(S, S2, b, bx, by, ghost, lv) {
    if (b.mar) return;   // Etapa 18: o navio está no mar
    const set = S2.cidade[b.type], img = Array.isArray(set) ? set[Math.max(1, Math.min(set.length - 1, lv))] : set;
    const base = by + b.h * TS, top = base - img.height, gr = C.BUILD[b.type].grande;
    blit(S2.bigShadow, bx + b.w * TS / 2 - 10, base - 5, ghost ? 0.4 : undefined);
    if (!gr || b.built || !(b.progress > 0)) { blit(img, bx, top, ghost ? 0.45 : undefined); return; }
    const vis = Math.max(2, Math.round(img.height * Math.min(1, b.progress))), sy = img.height - vis;
    blit(img, bx, top, 0.22);
    const X = (v) => Math.round(v * sc + ox), Y = (v) => Math.round(v * sc + oy);
    ctx.drawImage(img, 0, sy, img.width, vis, X(bx), Y(top + sy), Math.round(img.width * sc), Y(top + img.height) - Y(top + sy));
    const yS = top + sy;
    for (let x = bx + 2; x < bx + img.width - 1; x += 7) rect(x, yS - 6, 1, Math.min(10, vis + 6), '#93683f');
    rect(bx + 1, yS - 4, img.width - 2, 1, '#6e4a35');
  }
  // Etapa 16: o anel da muralha em volta do centro, pedra por pedra (sobe junto com a obra); o portão fica de fora
  function drawMuralha(S, mu, tx0, ty0, tx1, ty1) {
    const r = C.BUILD.muralha.wall.r, cx = (S.camp.x + 1) * TS, cy = (S.camp.y + 1) * TS, R = r * TS;
    if ((S.camp.x + 1 + r) < tx0 - 1 || (S.camp.x + 1 - r) > tx1 + 1 || (S.camp.y + 1 + r) < ty0 - 1 || (S.camp.y + 1 - r) > ty1 + 1) return;
    const n = Math.round(2 * Math.PI * R / 5), frac = mu.built ? 1 : Math.min(1, mu.progress || 0);
    const gx = (mu.x + mu.w / 2) * TS, gy = (mu.y + mu.h / 2) * TS;
    for (let k = 0; k < Math.round(n * frac); k++) {
      const a = k / n * Math.PI * 2, px = Math.round(cx + Math.cos(a) * R), py = Math.round(cy + Math.sin(a) * R);
      if (Math.hypot(px - gx, py - gy) < 30) continue;
      rect(px - 3, py - 4, 6, 5, k % 3 ? '#8b9bb4' : '#a2aec4');
      rect(px - 3, py - 4, 6, 1, '#c0cbdc');
      rect(px - 3, py + 1, 6, 1, '#3a4466');
    }
  }
  // armazém, marcenaria e tecelagem: a obra e um pouco do que ela guarda ou faz
  function drawShop(S, S2, b, bx, by, ghost, lv, now) {
    const imgs = S2.shop[b.type], img = imgs[Math.min(imgs.length - 1, lv)], top = by + 31 - img.height;
    blit(S2.bigShadow, bx + 5, by + 26, ghost ? 0.4 : undefined);
    if (b.type === 'cemiterio' && !ghost && lv >= 2 && G.Memoria) cercaCem(S, b);   // Etapa 13
    blit(img, bx, top, ghost ? 0.45 : undefined);
    if (ghost) return;
    const st = S.stock, it = S2.item;
    if (b.type === 'marcenaria') {
      // tábuas prontas encostadas
      const n = Math.min(3, Math.ceil((st.tabuas || 0) / 4));
      for (let i = 0; i < n; i++) blit(it.tabuas, bx + 20 + (i % 2), by + 27 - i * 2);
    } else if (b.type === 'tecelagem') {
      const nf = Math.min(2, Math.ceil((st.fibra || 0) / 6));
      for (let i = 0; i < nf; i++) blit(it.fibra, bx + 1 + i * 3, by + 26 - i);
      const nm = Math.min(3, st.mantas || 0);
      for (let i = 0; i < nm; i++) blit(it.mantas, bx + 11 + (i % 2), by + 27 - i * 2);
      if ((st.redes || 0) > 0) blit(it.redes, bx + 22, by + 28);
    } else if (b.type === 'ferraria') {
      // Etapa 12: com alguém na forja, a brasa pulsa, sobem fagulhas e a fumaça sai pela chaminé
      const on = !!FX && FX.forja.has(b.id);
      if (on) {
        const f = 0.5 + 0.5 * Math.sin(now / 130), x0 = lv >= 2 ? [6, 12] : [8];
        for (const xo of x0) { rect(bx + xo, top + (lv >= 2 ? 21 : 20), lv >= 2 ? 4 : 6, 3, f > 0.5 ? '#fee761' : '#feae34'); rect(bx + xo + 1, top + (lv >= 2 ? 20 : 19), 2, 1, '#f77622'); }
        if (Math.random() < 0.18) spawn({ x: bx + 10 + Math.random() * 3, y: top + 1, vx: (Math.random() - 0.5) * 3, vy: -7, g: 0, life: 1.6, col: 'rgba(192,203,220,0.55)' });
        if (Math.random() < 0.12) spawn({ x: bx + 20 + Math.random() * 4, y: top + 18, vx: (Math.random() - 0.5) * 14, vy: -16, g: 30, life: 0.5, col: '#fee761' });
      }
      const nf = Math.min(3, S.stock.ferro || 0);
      for (let i = 0; i < nf; i++) blit(it.ferro, bx + 24 + (i % 2) * 2, by + 28 - i * 2);
    } else if (b.type === 'mina') {
      // quem está lá dentro: um lampião aceso na boca; e o que saiu, empilhado ao lado
      const n = FX ? FX.mina.get(b.id) || 0 : 0;
      if (n) { const f = Math.sin(now / 170) > 0 ? '#fee761' : '#feae34'; rect(bx + 15, top + (lv >= 2 ? 19 : 20), 2, 2, f); rect(bx + 14, top + (lv >= 2 ? 20 : 21), 4, 1, 'rgba(254,174,52,0.35)'); }
      if ((S.stock.minerio || 0) > 0) blit(it.minerio, bx + 1, by + 29);
      if ((S.stock.carvao || 0) > 0) blit(it.carvao, bx + 24, by + 30);
    } else if (b.type === 'armazem') {
      // cestos cheios quando há comida guardada
      const n = Math.min(3, Math.floor((S.ctx ? S.ctx.foodDays : 0) / 6));
      const kinds = ['frutas', 'peixe', 'defumado'];
      for (let i = 0; i < n; i++) blit(it[st[kinds[i]] > 0 ? kinds[i] : 'frutas'], bx + 6 + i * 8, by + 30);
    }
  }
  // bichos da Etapa 9: só de lado; subindo ou descendo, olham para o último lado para onde andaram
  const lastSide = new Map();
  function sideOf(key, e) {
    if (e.dir === 2 || e.dir === 3) { lastSide.set(key, e.dir); return e.dir; }
    return lastSide.get(key) || 2;
  }
  const SHADOW = { anta: 'midShadow', onca: 'midShadow', jacare: 'bigShadow' };
  function drawBicho(e, x, y, now) {
    const sp = e.sp || 'capivara';
    if (sp === 'capivara') { drawCapi(e, x, y); return; }
    const wx = x * TS, wy = y * TS, d = A.BEAST[sp];
    if (e.state === 'morta') { blit(A.beastDead(sp), wx - d.w / 2, wy + 3 - d.h); return; }
    const side = sideOf('f' + e.id, e) === 3 ? 1 : 0;
    if (sp === 'jacare' && e.inWater && e.wx !== undefined) {
      // dentro d'água: só os olhos e o focinho de fora, e uma marola em volta
      const jx = e.wx * TS, jy = e.wy * TS, ww = A.JACARE_WATER_W, wh = A.JACARE_WATER_H, t = now / 650 + e.id;
      rect(jx - 7 + Math.sin(t) * 1.5, jy + 2, 4, 1, 'rgba(200,244,255,0.55)');
      rect(jx + 3 - Math.sin(t) * 1.5, jy + 2, 4, 1, 'rgba(200,244,255,0.55)');
      ctx.drawImage(A.jacareWater(), 0, side * wh, ww, wh, Math.round((jx - ww / 2) * sc + ox), Math.round((jy - 1) * sc + oy), Math.round(ww * sc), Math.round(wh * sc));
      return;
    }
    if (sp === 'jacu' && e.fly) {
      // voando: as asas batem, um pouco acima do chão (a sombra fica embaixo)
      const fw = A.JACU_FLY_W, fh = A.JACU_FLY_H, f = Math.floor(now / 110 + e.id) % 2;
      blit(A.spr.shadow, wx - 5, wy + 1);
      ctx.drawImage(A.birdFly(), f * fw, side * fh, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((wy - 16) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
      return;
    }
    const moving = !!e.path, frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
    const sh = A.spr[SHADOW[sp] || 'shadow'];
    blit(sh, wx - sh.width / 2, wy + 1);
    ctx.drawImage(A.beastSheet(sp, e.big), frame * d.w, side * d.h, d.w, d.h, Math.round((wx - d.w / 2) * sc + ox), Math.round((wy + 3 - d.h) * sc + oy), Math.round(d.w * sc), Math.round(d.h * sc));
    if (sp === 'criatura' && Math.random() < 0.015) spawn({ x: wx + (Math.random() - 0.5) * 10, y: wy - 6, vx: 0, vy: -6, g: 0, life: 1, col: '#fee761' });   // o bicho de Deus brilha (Etapa 11)
    if (e.state === 'investida') bang(wx, wy + 3 - d.h - 2, now);   // vem para cima: um "!" vermelho
  }
  // "!" de perigo em cima de um bicho
  function bang(wx, wy, now) {
    const b = Math.round(Math.sin(now / 120) * 1);
    rect(wx - 1, wy - 7 + b, 3, 5, '#181425'); rect(wx - 1, wy - 1 + b, 3, 2, '#181425');
    rect(wx, wy - 6 + b, 1, 3, '#e43b44'); rect(wx, wy + b, 1, 1, '#e43b44');
  }
  // capivaras (e a abatida, deitada)
  function drawCapi(e, x, y) {
    const wx = x * TS, wy = y * TS;
    if (e.state === 'morta') { blit(A.capiDead(), wx - 7, wy - 5); return; }
    const sh = A.capiSheet(e.id % 2), fw = A.CAPI_W, fh = A.CAPI_H;
    const moving = !!e.path;
    const frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
    blit(A.spr.shadow, wx - 5, wy + 1);
    ctx.drawImage(sh, frame * fw, e.dir * fh, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((wy - 6) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
  }
  // lança no ar: 0,3 s de voo, em arco; a flecha (Etapa 8) vai reta e mais rápida, com as penas vermelhas
  function drawSpears(now) {
    for (let i = spears.length - 1; i >= 0; i--) {
      const s = spears[i], t = (now - s.t0) / (s.bow ? 180 : 300);
      if (t > 1) { spears.splice(i, 1); continue; }
      const x = s.x1 + (s.x2 - s.x1) * t, y = s.y1 + (s.y2 - s.y1) * t - (s.bow ? Math.sin(t * Math.PI) * 1.5 : Math.sin(t * Math.PI) * 6);
      const d = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1, ux = (s.x2 - s.x1) / d, uy = (s.y2 - s.y1) / d;
      if (s.bow) { for (let k = 0; k < 5; k++) rect(x - ux * k, y - uy * k, 1, 1, k === 0 ? '#c0cbdc' : k >= 3 ? '#e43b44' : '#e4a672'); continue; }
      for (let k = 0; k < 6; k++) rect(x - ux * k, y - uy * k, 1, 1, k < 2 ? '#c0cbdc' : '#b86f50');
    }
  }
  // Etapa 8: arco na mão de quem caça (a corda puxa para trás quando mira, com a flecha no lugar)
  function drawBow(wx, top, dir, aiming) {
    const b = dir === 3 ? -1 : 1, x = dir === 3 ? wx - 5 : wx + 4;
    const curve = [0, 1, 1, 2, 2, 2, 1, 1, 0];
    for (let i = 0; i < 9; i++) rect(x + curve[i] * b, top - 1 + i, 1, 1, '#733e39');
    const pull = aiming ? 2 : 0;
    for (let i = 1; i < 8; i++) { const off = pull ? Math.round(pull * (1 - Math.abs(i - 4) / 4)) : 0; rect(x - off * b, top - 1 + i, 1, 1, 'rgba(234,212,170,0.9)'); }
    if (aiming) { for (let k = 0; k < 5; k++) rect(x - 2 * b + k * b, top + 3, 1, 1, k === 4 ? '#c0cbdc' : k === 0 ? '#e43b44' : '#e4a672'); }
  }
  // faca curta na mão (carnear a caça, cortar o couro)
  function drawKnife(wx, wy, d, swing) {
    const fx = d === 3 ? -1 : 1, hx = d >= 2 ? wx + fx * 3 : wx + 3, hy = wy - 3 + (swing ? 1 : 0);
    rect(hx, hy, 1, 2, '#733e39');
    rect(hx + fx, hy - 2, 1, 3, '#c0cbdc');
  }
  // flauta na boca de quem toca
  function drawFlute(wx, top, d) {
    const fx = d === 3 ? -1 : 1, y = top + 4;
    for (let k = 0; k < 5; k++) rect(wx + fx * (1 + k), y + (d === 0 ? k >> 1 : 0), 1, 1, k === 2 || k === 4 ? '#733e39' : '#e4a672');
  }
  // tambor na frente de quem bate, com as mãos subindo e descendo
  function drawDrum(wx, wy, d, now) {
    const img = A.spr.tambor, x = d === 2 ? wx + 2 : d === 3 ? wx - 9 : wx - 3, y = wy - 5;
    blit(img, x, y);
    const up = Math.floor(now / 150) % 2;
    rect(x + 1, y - 1 - up, 2, 1, '#e8b796'); rect(x + 4, y - 2 + up, 2, 1, '#e8b796');
  }
  // rede de pesca: a corda da mão até a malha na água, que sobe e desce
  function drawNet(p, wx, wy, swing) {
    const d = p.dir, fx = d === 3 ? -1 : 1;
    const nx = wx + (d === 2 ? 9 : d === 3 ? -9 : 1), ny = wy + (d === 0 ? 7 : d === 1 ? -13 : 1) + (swing ? 1 : 0);
    const hx = d >= 2 ? wx + fx * 3 : wx + 3, hy = wy - 4;
    for (let i = 0; i <= 5; i++) rect(hx + (nx - hx) * i / 5, hy + (ny - hy) * i / 5, 1, 1, '#c9a068');
    for (let yy = 0; yy < 5; yy++) for (let xx = -3; xx <= 3; xx++) {
      if ((xx + yy) % 2 !== 0 || Math.abs(xx) > 3 - (yy >> 1)) continue;
      rect(nx + xx, ny + yy - 1, 1, 1, 'rgba(234,212,170,0.85)');
    }
    rect(nx, ny - 2, 1, 1, '#e43b44');
  }
  // quem caça leva a lança em pé
  function drawSpear(wx, top, dir) {
    const x = dir === 3 ? wx - 5 : wx + 4;
    for (let i = 0; i < 12; i++) rect(x, top - 4 + i, 1, 1, i < 2 ? '#c0cbdc' : '#b86f50');
  }

  const TOOL = { madeira: 'axe', pedra: 'pick', construir: 'hammer', pesca: 'rod', argila: 'pick', oficio: 'hammer', caminho: 'pick', roca: 'hoe', cerca: 'hammer' };
  function drawPerson(S, p, x, y, now) {
    const st = G.Family.stage(S, p), kid = st === 'crianca';
    const sheet = kid ? A.kidSheet(p) : A.personSheet(p, st === 'idoso');
    const fw = kid ? A.KID_W : 8, fh = kid ? A.KID_H : 14;
    const wx = x * TS, wy = y * TS;
    blit(A.spr.shadow, wx - 6, wy + 2);
    const a = p.act;
    const babies = (FX && FX.carried.get(p.id)) || NADA;
    if (p.sleeping) {
      blit(sheet.sleep, wx - (kid ? 5 : 7), wy - (kid ? 3 : 5));
      // manta tecida por cima (Etapa 7)
      if (p.manta) {
        // do pescoço aos pés (a cabeça fica de fora, à esquerda)
        const mw = kid ? 5 : 8, mh = kid ? 5 : 6, mx = wx + (kid ? 1 : -1), my = wy - (kid ? 2 : 4);
        rect(mx, my, mw, mh, '#e43b44');
        for (let k = 1; k < mw; k += 3) rect(mx + k, my, 1, mh, '#feae34');
        rect(mx, my + mh - 1, mw, 1, '#a22633');
      }
      babies.forEach((b, i) => blit(A.bundle(b.look.skin), wx + 3 + i * 4, wy - 3));
      const t = (now / 1000) % 2;
      blit(A.spr.z, wx + 4 + t * 2, wy - 12 - t * 5, Math.max(0, 1 - t / 2));
      return;
    }
    const moving = p.path && p.pathI < p.path.length;
    let frame = 0;
    if (moving) frame = 1 + (Math.floor(p.walk * 5) % 2);
    const work = a && (a.stage === 'work' || a.stage === 'build' || (a.type === 'roca' && (a.stage === 'plant' || a.stage === 'weed' || a.stage === 'harvest')) || (a.type === 'criacao' && a.stage === 'tend'));
    const swing = work ? Math.floor(now / 260) % 2 : 0;
    const drummer = a && a.type === 'festa' && S.life && S.life.party && S.life.party.drummer === p.id && !moving;   // Etapa 8
    const dance = a && a.type === 'festa' && a.stage === 'dance' && !moving && !drummer;
    const trance = a && a.type === 'memoria' && a.m && a.m.k === 'rito' && a.stage === 'stay' && !moving;   // Etapa 13: a roda balança devagar
    const dy = work && swing ? 1 : dance ? -((Math.floor(now / 170) + p.id) % 2) * 2 : trance ? (Math.floor(now / 520) + p.id) % 2 : 0;
    const img = sheet.sheet;
    const sx = frame * fw, sy = p.dir * fh, top = kid ? wy - 7 : wy - 10;
    ctx.drawImage(img, sx, sy, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((top + dy) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
    // barriga de grávida, depois dos primeiros dias
    if (p.preg && S.t - p.preg.t0 > 15 * C.DAY_MIN) {
      const col = G.Sim.colorsOf(p.look).cloth, by = top + 7 + dy;
      if (p.dir === 2) rect(wx + 3, by, 1, 2, col); else if (p.dir === 3) rect(wx - 4, by, 1, 2, col);
      else { rect(wx - 4, by + 1, 1, 1, col); rect(wx + 3, by + 1, 1, 1, col); }
    }
    // bebê no colo, na altura do peito
    babies.forEach((b, i) => {
      const bw = A.bundle(b.look.skin);
      const bx0 = p.dir === 2 ? wx + 1 : p.dir === 3 ? wx - 6 : wx - 2 - i * 3;
      if (p.dir !== 1) blit(bw, bx0 + (p.dir >= 2 ? 0 : i * 5), top + 6 + dy);
    });
    const Tk = (id) => G.Tech.known(S, id);
    if (work) drawTool(S, p, a, wx, wy, swing);
    else if (a && (a.type === 'caca' || a.type === 'defender') && (a.stage === 'go' || a.stage === 'aim' || a.stage === 'wait')) { if (Tk('arco')) drawBow(wx, top, p.dir, a.stage === 'aim'); else drawSpear(wx, top, p.dir); }   // na luta (Etapa 9), também
    else if (a && a.type === 'caca' && a.stage === 'cut' && Tk('faca')) drawKnife(wx, wy, p.dir, Math.floor(now / 220) % 2);
    else if (a && a.type === 'historia' && a.stage === 'tell' && S.life && S.life.story && S.life.story.music) drawFlute(wx, top, p.dir);
    else if (drummer) drawDrum(wx, wy, p.dir, now);
    // Etapa 11: o escolhido tem um halo (curar: verde; Palavra: branco; Luz: dourado); quem reza na estátua, mãos para o alto
    if (p.escolhido) {
      const col = p.escolhido.power === 'cura' ? '#9be070' : p.escolhido.power === 'palavra' ? '#ffffff' : '#fee761';
      const hy = top - 2 + dy + Math.round(Math.sin(now / 400) * 0.5);
      rect(wx - 2, hy, 4, 1, col); rect(wx - 3, hy + 1, 1, 1, col); rect(wx + 2, hy + 1, 1, 1, col);
    }
    // Etapa 14: o cocar do líder, a marca de Deus na testa, e o olho sobre quem vai fazer o que não deve (você vê tudo)
    if (S.soc && !kid) {
      if (S.soc.lider === p.id) { const hy = top - 2 + dy; rect(wx - 2, hy + 1, 1, 1, '#e43b44'); rect(wx - 1, hy, 1, 2, '#feae34'); rect(wx, hy - 1, 1, 3, '#fee761'); rect(wx + 1, hy, 1, 2, '#feae34'); rect(wx + 2, hy + 1, 1, 1, '#e43b44'); }
      if (p.marca > S.t && p.dir !== 1) rect(p.dir === 2 ? wx + 1 : p.dir === 3 ? wx - 2 : wx - 1, top + 2 + dy, p.dir === 0 ? 2 : 1, 1, '#e43b44');
      if (p.plano && a && a.type === 'soc' && a.m && a.m.k === 'crime') { const ic = A.icon('olho'), bob = Math.round(Math.sin(now / 250) * 1); blit(ic, wx - ic.width / 2, top - 12 + bob, 0.85); }
    }
    // Etapa 13: a vela de quem vela e de quem lembra os mortos, as flores de quem visita, a fumaça na cabeça de quem está na roda
    if (a && a.type === 'memoria' && a.m && !moving && p.dir !== 1) {
      const mk = a.m.k, hx = p.dir === 3 ? wx - 4 : wx + 3;
      if ((mk === 'velar' || mk === 'finados') && a.stage === 'stay') { rect(hx, top + 6, 1, 2, '#ead4aa'); rect(hx, top + 5, 1, 1, (Math.floor(now / 200) + p.id) % 2 ? '#fee761' : '#feae34'); }
      else if (mk === 'cova' && a.stage === 'stay') { rect(hx, top + 6, 1, 2, '#3e8948'); rect(hx, top + 5, 1, 1, ['#f6757a', '#fee761', '#ffffff'][p.id % 3]); }
    }
    if (trance && Math.random() < 0.04) spawn({ x: wx + (Math.random() - 0.5) * 6, y: top - 1, vx: (Math.random() - 0.5) * 3, vy: -6, g: 0, life: 1.4, col: 'rgba(181,139,224,0.7)' });
    if (a && a.type === 'rezar' && a.stage === 'pray' && Math.random() < 0.03) spawn({ x: wx + (Math.random() - 0.5) * 6, y: top + 2, vx: 0, vy: -9, g: 0, life: 1, col: '#fee761' });
    if (a && a.type === 'curar' && a.stage === 'heal' && Math.random() < 0.2) spawn({ x: wx + (Math.random() - 0.5) * 10, y: top + 6, vx: (Math.random() - 0.5) * 4, vy: -7, g: 0, life: 0.9, col: '#9be070' });
    if (work && S.god && S.god.blessings && S.god.blessings.length && G.Deus && G.Deus.blessAt(S, p.x, p.y) > 1 && Math.random() < 0.05) spawn({ x: wx + (Math.random() - 0.5) * 8, y: top + 4, vx: 0, vy: -8, g: 0, life: 0.8, col: '#fee761' });
    if (p.prayer) {
      const icon = A.icon('reza'), bob = Math.round(Math.sin(now / 250) * 1);
      blit(icon, wx - icon.width / 2, top - 8 - (p.carry ? 6 : 0) + bob);
    }
    if (p.carry && !work) {
      const it = A.spr.item[carryKind(p.carry)];
      if (it) blit(it, wx - it.width / 2, top - it.height);
    }
  }
  // Etapa 14: a vila de fora (com fumaça, se há gente), as cinzas de uma obra queimada, o pedido do líder (a obra em
  // fantasma, com um ponto de interrogação)
  function interroga(wx, wy, now) {
    const b = Math.round(Math.sin(now / 260) * 1), y = wy + b, K = '#181425', Y = '#fee761';
    rect(wx - 3, y - 1, 7, 9, K);
    rect(wx - 2, y, 5, 1, Y); rect(wx + 2, y + 1, 1, 2, Y); rect(wx - 2, y + 1, 1, 1, Y); rect(wx, y + 3, 2, 1, Y); rect(wx, y + 4, 1, 1, Y); rect(wx, y + 6, 1, 1, Y);
  }
  function drawSoc(S, it, now) {
    if (it.soc === 'vila') {
      const v = it.v, img = A.vilaFora(!!v.fim);
      blit(img, (v.x + 0.5) * TS - img.width / 2, (v.y + 1) * TS - img.height);
      if (!v.fim && Math.random() < 0.12) spawn({ x: (v.x + 0.5) * TS + 6, y: (v.y + 1) * TS - 6, vx: (Math.random() - 0.5) * 3, vy: -7, g: 0, life: 3, col: 'rgba(200,204,216,0.6)' });
      return;
    }
    if (it.soc === 'cinza') {
      const c = it.c, x0 = c.x * TS, y0 = c.y * TS, w = c.w * TS, h = c.h * TS;
      for (let k = 0; k < 14; k++) { const px = x0 + 2 + ((k * 29 + c.x * 7) % (w - 5)), py = y0 + 6 + ((k * 17 + c.y * 5) % (h - 8)); rect(px, py, 2 + (k % 3), 1 + (k % 2), k % 3 ? 'rgba(24,20,37,0.5)' : 'rgba(90,96,112,0.5)'); }
      rect(x0 + 4, y0 + h - 12, 1, 8, '#181425'); rect(x0 + w - 6, y0 + h - 10, 1, 6, '#181425'); rect(x0 + w / 2, y0 + h - 14, 1, 9, '#262b44');
      return;
    }
    const q = it.q;
    if (q.tiles) {
      const Wd = S.world.W;
      for (const i of q.tiles) rect((i % Wd) * TS + 6, Math.floor(i / Wd) * TS + 7, 4, 3, 'rgba(254,231,97,0.55)');
      const b = G.Sim.building(S, q.pid);
      if (b) interroga((b.x + b.w / 2) * TS, b.y * TS - 12, now);
      return;
    }
    const d = C.BUILD[q.type];
    drawBuilding(S, { id: -q.id, type: q.type, x: q.x, y: q.y, w: d.w, h: d.h, built: false, lv: 1, kind: null, progress: 0, have: {}, fuel: 0, beds: [] }, now);
    interroga((q.x + d.w / 2) * TS, q.y * TS - 10, now);
  }
  // o que aparece nas costas: material de obra, pedra do caminho, material do ofício
  function carryKind(c) {
    if (c.k === 'obra') return ['madeira', 'pedra', 'tabuas', 'argila', 'fibra'].find((k) => c[k] > 0) || 'madeira';
    if (c.k === 'caminho') return 'pedra';
    if (c.k === 'oficio') { const b = c.back || {}; return ['madeira', 'fibra', 'couro', 'pedra'].find((k) => b[k] > 0) || ''; }
    return c.k;
  }
  // lobos e viajantes (gente de fora ainda não entra no povo: desenha com a folha de uma pessoa qualquer)
  const fakes = new Map();
  function drawEnt(S, e, x, y, now) {
    const wx = x * TS, wy = y * TS;
    const moving = !!e.path;
    if (e.k === 'onca') {
      // a onça (Etapa 9): na toca, some; acuada ou na luta, agachada
      if (e.hidden) return;
      const d = A.BEAST.onca, side = sideOf('n' + e.id, e) === 3 ? 1 : 0;
      const frame = moving ? 1 + (Math.floor(e.walk * 3) % 2) : 0, low = e.state === 'acuada' || e.state === 'luta' ? 1 : 0;
      blit(A.spr.midShadow, wx - 7.5, wy + 1);
      const al = e.state === 'embora' ? Math.max(0.35, 1 - (e.t - (e.leftAt || e.t)) / 120) : 1;
      if (al < 1) ctx.globalAlpha = al;
      ctx.drawImage(A.beastSheet('onca'), frame * d.w, side * d.h, d.w, d.h, Math.round((wx - d.w / 2) * sc + ox), Math.round((wy + 3 - d.h + low) * sc + oy), Math.round(d.w * sc), Math.round(d.h * sc));
      if (al < 1) ctx.globalAlpha = 1;
      if (e.state === 'acuada') bang(wx, wy + 3 - d.h - 2, now);
      return;
    }
    if (e.k === 'lobo') {
      const sh = A.wolfSheet(e.fur || 0), fw = A.WOLF_W, fh = A.WOLF_H;
      const frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
      blit(A.spr.shadow, wx - 5, wy + 2);
      // indo embora: some aos poucos
      const al = e.state === 'embora' ? Math.max(0.35, 1 - (e.t - (e.leftAt || e.t)) / 120) : 1;
      if (al < 1) ctx.globalAlpha = al;
      ctx.drawImage(sh, frame * fw, e.dir * fh, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((wy - 6) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
      if (al < 1) ctx.globalAlpha = 1;
      return;
    }
    let f = fakes.get(e.id);
    if (!f) { f = { id: 'v' + e.id, sex: e.pd.sex, look: e.pd.look }; fakes.set(e.id, f); }
    const sheet = A.personSheet(f);
    const frame = moving ? 1 + (Math.floor(e.walk * 5) % 2) : 0, top = wy - 10;
    blit(A.spr.shadow, wx - 6, wy + 2);
    ctx.drawImage(sheet.sheet, frame * 8, e.dir * 14, 8, 14, Math.round((wx - 4) * sc + ox), Math.round(top * sc + oy), Math.round(8 * sc), Math.round(14 * sc));
    // trouxa nas costas
    const bx = e.dir === 2 ? wx - 6 : e.dir === 3 ? wx + 2 : wx - 2;
    if (e.dir !== 0) rect(bx, top + 6, 4, 4, '#8a6440');
    const g = S.narr.groups[e.gid];
    // o mascate (Etapa 10) vem tocando os bichos que quer trocar
    if (g && g.kind === 'mascate' && g.offer && !g.traded) {
      const o = g.offer, n = Math.min(3, o.m + o.f), fr = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
      for (let k = 0; k < n; k++) {
        const key = o.sp === 'galinha' ? (k === 0 ? 'galo' : 'galinha') : o.sp === 'gado' ? (k === 0 ? 'boi' : 'vaca') : o.sp === 'ovelha' ? (k === 0 ? 'carneiro' : 'ovelha') : o.sp;
        const d = A.CRIA[key], side = e.dir === 3 ? 1 : 0;
        const ax = e.dir === 2 ? wx - 9 - k * 8 : e.dir === 3 ? wx + 9 + k * 8 : wx + (k - 1) * 9, ay = wy + (e.dir === 0 ? -5 : e.dir === 1 ? 6 : 1) + (k % 2) * 2;
        blit(A.spr.shadow, ax - 5, ay + 1);
        ctx.drawImage(A.criaSheet(key), fr * d.w, side * d.h, d.w, d.h, Math.round((ax - d.w / 2) * sc + ox), Math.round((ay + 3 - d.h) * sc + oy), Math.round(d.w * sc), Math.round(d.h * sc));
      }
    }
    // esperando resposta: um balão com interrogação
    if (g && g.state === 'esperando') {
      const icon = A.icon('pergunta'), bob = Math.round(Math.sin(now / 260 + e.id) * 1);
      blit(icon, wx - icon.width / 2, top - 11 + bob);
    }
  }
  // olhos de lobo brilhando no escuro
  function drawEyes(S, alpha) {
    const dark = Math.max(darkness(S.ck.hour), S.precip ? 0.2 : 0);
    if (dark < 0.3) return;
    const col = 'rgba(254,231,97,' + Math.min(1, dark * 1.4).toFixed(2) + ')';
    // a onça e o jacaré na água (Etapa 9): o olho do lado para onde olham
    const eye = (sp, key, e, x, y, w) => { const [ex, ey] = A.BEAST_EYES[sp], side = sideOf(key, e); rect(x + (side === 3 ? w - 1 - ex : ex), y + ey, 1, 1, col); };
    for (const e of S.narr.ents) {
      if (e.k !== 'onca' || e.gone || e.hidden || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
      const d = A.BEAST.onca, low = e.state === 'acuada' || e.state === 'luta' ? 1 : 0;
      eye('onca', 'n' + e.id, e, U.lerp(e.px, e.x, alpha) * TS - d.w / 2, U.lerp(e.py, e.y, alpha) * TS + 3 - d.h + low, d.w);
    }
    if (S.fauna) for (const e of S.fauna.ents) {
      if (e.sp !== 'jacare' || !e.inWater || e.wx === undefined || e.gone || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
      const side = sideOf('f' + e.id, e), ww = A.JACARE_WATER_W;
      rect(e.wx * TS - ww / 2 + (side === 3 ? ww - 3 : 2), e.wy * TS, 1, 1, col);
    }
    for (const e of S.narr.ents) {
      if (e.k !== 'lobo' || e.gone || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
      const x = U.lerp(e.px, e.x, alpha) * TS - A.WOLF_W / 2, y = U.lerp(e.py, e.y, alpha) * TS - 6;
      const moving = !!e.path, frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
      const bob = e.dir < 2 && frame === 1 ? 1 : 0;
      for (const [ex, ey] of A.WOLF_EYES[e.dir]) rect(x + ex, y + ey + bob, 1, 1, col);
    }
  }
  function drawTool(S, p, a, wx, wy, swing) {
    const Tk = (id) => G.Tech.known(S, id);
    const weaving = a.type === 'oficio' && (a.make === 'mantas' || a.make === 'redes');   // no tear, só as mãos
    let kind = a.type === 'construir' ? 'hammer' : weaving ? null : TOOL[a.type];
    if (a.type === 'roca' && a.stage === 'harvest') kind = null;   // colhe com as mãos
    // Etapa 8: a roupa se corta com a faca e se costura com a agulha; a rede vai para a água; o machado tem cabeça maior
    if (a.type === 'oficio' && a.make === 'roupas') kind = Tk('agulha') ? 'needle' : Tk('faca') ? 'knife' : null;
    if (a.type === 'pesca' && Tk('rede')) { drawNet(p, wx, wy, swing); return; }
    if (kind === 'knife') { drawKnife(wx, wy, p.dir, swing); return; }
    const d = p.dir, fx = d === 3 ? -1 : 1;
    const hx = d >= 2 ? wx + fx * 3 : wx + 3, hy = wy - 4;
    if (kind === 'needle') {
      const ny = hy - 1 + (swing ? 1 : 0);
      rect(hx, ny, 1, 3, '#dfe6f0'); rect(hx + fx, ny + 2 - (swing ? 1 : 0), 1, 1, '#e43b44'); rect(hx + fx * 2, ny + 3, 1, 1, '#e43b44');
      return;
    }
    if (kind === 'axe' && Tk('machado')) kind = 'bigaxe';
    if (kind === 'rod') {
      const tipx = d === 2 ? wx + 9 : d === 3 ? wx - 9 : wx + 5, tipy = d === 1 ? wy - 14 : wy - 11;
      for (let i = 0; i <= 5; i++) rect(hx + (tipx - hx) * i / 5, hy + (tipy - hy) * i / 5, 1, 1, '#733e39');
      const ly = d === 1 ? wy - 10 : wy + 2 + (swing ? 1 : 0);
      for (let yy = tipy; yy < ly; yy++) rect(tipx, yy, 1, 1, 'rgba(234,212,170,0.8)');
      return;
    }
    if (!kind) return;
    const up = swing === 0;
    const tx = d >= 2 ? hx + fx * (up ? 1 : 3) : hx + (up ? 0 : 1), ty = up ? hy - 5 : hy - 1;
    for (let i = 0; i < 4; i++) rect(tx - (d === 3 ? -i * 0 : 0), ty + i, 1, 1, '#733e39');
    const head = kind === 'axe' || kind === 'bigaxe' ? '#c0cbdc' : kind === 'pick' || kind === 'hoe' ? '#8b9bb4' : '#5a6988';
    if (kind === 'bigaxe') { rect(tx - (d === 3 ? 2 : 0), ty - 2, 3, 3, head); rect(tx, ty + 1, 1, 1, '#e4a672'); return; }   // pedra polida amarrada
    if (kind === 'hoe') { rect(tx - (d === 3 ? 2 : 0), ty - 1, 3, 1, head); rect(tx + (d === 3 ? -2 : 2), ty, 1, 1, head); return; }   // enxada (Etapa 10)
    rect(tx - (kind === 'pick' ? 1 : 0), ty - 1, kind === 'pick' ? 3 : 2, 2, head);
  }

  // a figura da obra para o fantasma de quem está posicionando: o nível 1 de cada uma ou, quando o fluxo pede (mover
  // uma obra pronta), o nível e o tipo de casa dados; dy: onde o desenho encosta no chão da obra, como em drawBuilding
  function ghostImg(type, lv, kind) {
    const S2 = A.spr;
    lv = lv || 1;
    if (type === 'fogueira') return { img: lv >= 2 ? S2.fireLv[Math.min(3, lv)].out : S2.fireOut, dy: -2 };
    if (type === 'moquem') return lv >= 2 ? { img: S2.works2.moquem, dy: -3 } : { img: S2.moquem, dy: -2 };
    if (type === 'jirau') return lv >= 2 ? { img: S2.works2.jirau, dy: -7 } : { img: S2.jirau, dy: 2 };
    if (type === 'forno') return lv >= 2 ? { img: S2.works2.forno, dy: -1 } : { img: S2.forno, dy: 1 };
    if (type === 'roca') return { img: A.rocaSoil(lv >= 2 ? 'rich' : 'warm'), dy: 0 };
    if (type === 'estatua') { const img = A.statue(Math.min(2, lv), null); return { img, dy: 31 - img.height }; }   // Etapa 11
    if (type === 'curral') {
      const k = Math.min(2, lv), key = 'curralGhost' + k;
      if (!S2[key]) {
        const parts = ['ground', 'back', 'front'].map((p) => A.curral(k, p));
        const [c, x] = A.mk(Math.max(...parts.map((i) => i.width)), Math.max(...parts.map((i) => i.height)));
        for (const i of parts) x.drawImage(i, 0, 0);
        S2[key] = c;
      }
      return { img: S2[key], dy: -12 };
    }
    if (S2.cidade && S2.cidade[type]) { const set = S2.cidade[type], im = Array.isArray(set) ? set[Math.max(1, Math.min(3, lv))] : set; return { img: im, dy: C.BUILD[type].h * TS - im.height }; }   // Etapa 16
    const shop = S2.shop[type];
    const img = shop ? shop[Math.max(1, Math.min(shop.length - 1, lv))] : houseImg({ lv, kind });
    return { img, dy: 31 - img.height };
  }
  // seta de 3 x 5 px, com contorno escuro, apontando para fora (dir: 0 cima, 1 direita, 2 baixo, 3 esquerda)
  function arrowMark(cx, cy, dir, col) {
    const ax = dir === 1 ? 1 : dir === 3 ? -1 : 0, ay = dir === 2 ? 1 : dir === 0 ? -1 : 0;
    const strip = (k, half, c) => { if (ax) rect(cx + ax * k, cy - half, 1, half * 2 + 1, c); else rect(cx - half, cy + ay * k, half * 2 + 1, 1, c); };
    for (const [k, half] of [[-1, 3], [0, 3], [1, 2], [2, 1], [3, 0]]) strip(k, half, '#181425');
    for (const [k, half] of [[0, 2], [1, 1], [2, 0]]) strip(k, half, col);
  }
  function drawGhost(S, g, now) {
    if (!S) return;
    const gi = g.type === 'centro' ? { img: A.spr.mat, dy: 0 } : ghostImg(g.type, g.lv, g.kind);   // 0.16: o centro novo
    const def = C.BUILD[g.type] || { w: 2, h: 2 };
    blit(gi.img, g.x * TS, g.y * TS + gi.dy, 0.6);
    ctx.fillStyle = g.ok ? 'rgba(254,174,52,0.22)' : 'rgba(228,59,68,0.35)';
    ctx.fillRect(Math.round(g.x * TS * sc + ox), Math.round(g.y * TS * sc + oy), Math.round(def.w * TS * sc), Math.round(def.h * TS * sc));
    outline(g.x * TS, g.y * TS, def.w * TS, def.h * TS, g.ok ? '#feae34' : '#e43b44');
    // preso no lugar (esperando o Confirmar): quatro setinhas em volta dizem que dá para arrastar e ajustar
    if (g.pinned) {
      const x0 = g.x * TS, y0 = g.y * TS, w = def.w * TS, h = def.h * TS, col = g.ok ? '#fee761' : '#ff8a8f';
      const bob = Math.round(Math.sin((now || 0) / 260) * 0.7 + 0.7), mx = x0 + (w >> 1), my = y0 + (h >> 1);
      arrowMark(mx, y0 - 4 - bob, 0, col); arrowMark(x0 + w + 3 + bob, my, 1, col);
      arrowMark(mx, y0 + h + 3 + bob, 2, col); arrowMark(x0 - 4 - bob, my, 3, col);
    }
  }
  // pincel do caminho: os passos que o dedo (ou o mouse) está marcando
  function drawBrush(S, br) {
    const w = S.world;
    // cerca (Etapa 10): as roças e currais já cercados ficam verdes (os abertos, com o contorno vermelho)
    if (br.fence && G.Campo && S.campo) {
      for (const b of S.buildings) {
        if ((b.type !== 'roca' && b.type !== 'curral') || !b.built) continue;
        const e = G.Campo.encl(S, b);
        if (!e.open) for (const i of e.list) rect((i % w.W) * TS, ((i / w.W) | 0) * TS, TS, TS, 'rgba(99,199,77,0.16)');
        outline(b.x * TS, b.y * TS, b.w * TS, b.h * TS, e.open ? '#e43b44' : '#63c74d');
      }
    }
    const col = br.lv === 0 ? 'rgba(228,59,68,0.45)' : br.fence ? 'rgba(154,94,66,0.6)' : br.lv >= 3 ? 'rgba(192,203,220,0.55)' : 'rgba(210,160,110,0.55)';
    for (const t of br.tiles) {
      const x = t.i % w.W, y = (t.i / w.W) | 0;
      rect(x * TS + 1, y * TS + 1, TS - 2, TS - 2, t.ok ? col : 'rgba(228,59,68,0.3)');
    }
    if (br.hover >= 0) {
      const x = br.hover % w.W, y = (br.hover / w.W) | 0;
      outline(x * TS, y * TS, TS, TS, br.hoverOk ? '#feae34' : '#e43b44');
    }
  }

  function drawRing(r) {
    const cx = (r.x + 0.5) * TS * sc + ox, cy = (r.y + 0.5) * TS * sc + oy, rad = r.r * TS * sc;
    ctx.save();
    ctx.lineWidth = Math.max(2, dpr * 2);
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.strokeStyle = r.ok ? '#feae34' : '#e43b44';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = r.ok ? 'rgba(254,174,52,0.12)' : 'rgba(228,59,68,0.12)';
    ctx.fill();
    // coluna de luz no centro
    ctx.fillStyle = r.ok ? '#fee761' : '#e43b44';
    const s = Math.max(3, TS * sc * 0.5);
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
  }

  // Etapa 6: arco-íris, estrela cadente, araras e vaga-lumes (por cima da noite, para brilhar)
  // 0.16: a sombra de uma nuvem: várias manchas redondas e macias numa tela pequena, esticada no chão
  let cloudImg = null;
  function cloudShape() {
    const [c, x] = A.mk(96, 56);
    const lobes = [[30, 30, 22], [52, 24, 20], [70, 32, 18], [44, 38, 16], [20, 36, 12], [80, 26, 11]];
    for (const [cx, cy, r] of lobes) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(18,22,48,0.55)'); g.addColorStop(0.65, 'rgba(18,22,48,0.35)'); g.addColorStop(1, 'rgba(18,22,48,0)');
      x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    return c;
  }
  function drawClouds(S, w, now) {
    const dark = darkness(S.ck.hour);
    if (dark > 0.4) return;
    if (!cloudImg) cloudImg = cloudShape();
    const fade = 1 - dark / 0.4, t = now / 1000, Wp = w.W * TS, Hp = w.H * TS;
    const n = Math.round(w.W * w.H / 1400) + 4, spanX = Wp + 1400, spanY = Hp + 900;
    const vx0 = -ox / sc, vy0 = -oy / sc, vx1 = (W - ox) / sc, vy1 = (H - oy) / sc;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let k = 0; k < n; k++) {
      const hx = G.hash2(k, 1, w.seed), hy = G.hash2(k, 2, w.seed), hs = G.hash2(k, 3, w.seed);
      const s = 3.2 + hs * 3.6, cw = 96 * s, ch = 56 * s;
      const x = ((hx * spanX + t * (5 + hs * 4) * wind) % spanX) - 900, y = ((hy * spanY + t * 1.6 * wind) % spanY) - 600;
      if (x + cw < vx0 || x > vx1 || y + ch < vy0 || y > vy1) continue;
      ctx.globalAlpha = (0.16 + hs * 0.1) * fade * (S.precip ? 0.6 : 1);
      ctx.drawImage(cloudImg, Math.round(x * sc + ox), Math.round(y * sc + oy), Math.round(cw * sc), Math.round(ch * sc));
    }
    ctx.restore();
  }

  function drawSky(S, now) {
    const l = S.life;
    if (l && l.rainbowUntil > S.t) {
      const left = (l.rainbowUntil - S.t) / 150, a = Math.min(1, left * 3, (1 - left) * 6) * 0.2;
      const cx = W * 0.5, cy = H * 1.05, r0 = Math.max(W, H) * 0.62, band = Math.max(3, 5 * dpr);
      const cols = ['#e43b44', '#f77622', '#fee761', '#63c74d', '#0099db', '#68386c'];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineWidth = band;
      cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r0 - i * band, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      ctx.restore();
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i], t = (now - s.t0) / 900;
      if (t > 1) { stars.splice(i, 1); continue; }
      const x = s.x + s.dx * t, y = s.y + s.dy * t, px = Math.max(2, Math.round(dpr * 2));
      for (let k = 0; k < 12; k++) {
        const f = k / 12;
        ctx.fillStyle = 'rgba(255,250,220,' + ((1 - f) * (1 - t * 0.6)).toFixed(3) + ')';
        ctx.fillRect(Math.round(x - s.dx * 0.05 * k), Math.round(y - s.dy * 0.05 * k), px, px);
      }
    }
    for (let i = flocks.length - 1; i >= 0; i--) {
      const f = flocks[i], t = (now - f.t0) / 5000;
      if (t > 1) { flocks.splice(i, 1); continue; }
      const span = W + 300 * dpr;
      for (const b of f.birds) {
        const x0 = -150 * dpr + span * t + b.dx, x = f.fromLeft ? x0 : W - x0, y = f.y0 + b.dy - t * 60 * dpr + Math.sin(now / 300 + b.ph) * 4 * dpr;
        const img = A.spr.arara[b.k][Math.floor(now / 160 + b.ph) % 2], s2 = Math.max(2, Math.round(sc * 0.9));
        ctx.save();
        if (!f.fromLeft) { ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, img.width * s2, img.height * s2); }
        else ctx.drawImage(img, Math.round(x), Math.round(y), img.width * s2, img.height * s2);
        ctx.restore();
      }
    }
    for (const g of glows) {
      const on = Math.sin(now / 180 + g.ph) > 0.2;
      if (!on) continue;
      const x = g.x * sc + ox, y = g.y * sc + oy, r = Math.max(2, sc);
      ctx.fillStyle = 'rgba(200,255,120,0.9)'; ctx.fillRect(Math.round(x), Math.round(y), r, r);
      ctx.fillStyle = 'rgba(200,255,120,0.25)'; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 3, r * 3);
    }
  }

  function drawLight(S, now) {
    const h = S.ck.hour;
    let dark = darkness(h);
    if (G.Life && S.life && G.Life.moonUp(S) && !S.precip) dark *= 0.7;   // lua cheia: a noite clareia
    if (S.precip) dark = Math.max(dark, S.precip === 'chuva' ? 0.24 : 0.16);
    const Nr = G.Narr;
    if (Nr && Nr.is(S, 'tempestade')) dark = Math.max(dark, 0.36);
    if (Nr && Nr.is(S, 'nevasca')) dark = Math.max(dark, 0.26);
    const dusk = h >= 16.5 && h < 19.5 ? Math.sin((h - 16.5) / 3 * Math.PI) : 0;
    const dawn = h >= 4.5 && h < 7.5 ? Math.sin((h - 4.5) / 3 * Math.PI) : 0;
    if (dusk > 0) { ctx.fillStyle = 'rgba(247,118,34,' + (dusk * 0.16).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (dawn > 0) { ctx.fillStyle = 'rgba(246,117,122,' + (dawn * 0.12).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (dark <= 0.01) return;
    const lw = light.width, lh = light.height;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = 'rgba(14,12,40,' + dark.toFixed(3) + ')';
    lctx.fillRect(0, 0, lw, lh);
    lctx.globalCompositeOperation = 'destination-out';
    // 0.14: só os fogos cuja luz chega à tela
    const fires = S.buildings.filter((b) => {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) return false;
      const cx = (b.x + 0.5) * TS * sc + ox, cy = (b.y + 0.4) * TS * sc + oy, r = TS * sc * (G.Sim.def(b).fire.r + 0.5);
      return cx + r >= 0 && cx - r <= W && cy + r >= 0 && cy - r <= H;
    });
    if (S.god) for (const a of S.god.auras) {
      const cx = ((a.x + 0.5) * TS * sc + ox) / 4, cy = ((a.y + 0.5) * TS * sc + oy) / 4, r = a.r * TS * sc / 4;
      for (const [f, al] of [[1.0, 0.3], [0.7, 0.6], [0.4, 0.9]]) { lctx.fillStyle = 'rgba(0,0,0,' + al + ')'; lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill(); }
    }
    // Etapa 11: a Luz do escolhido e a estátua do fogo clareiam a noite
    if (G.Deus && S.god && S.god.pending) for (const L of G.Deus.lights(S)) {
      const cx = (L.x * TS * sc + ox) / 4, cy = (L.y * TS * sc + oy) / 4, r = L.r * TS * sc / 4;
      for (const [f, al] of [[1.0, 0.3], [0.7, 0.6], [0.4, 0.9]]) { lctx.fillStyle = 'rgba(0,0,0,' + al + ')'; lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill(); }
    }
    // Etapa 13: as velas do velório e as das covas na noite do dia dos mortos
    if (G.Memoria && S.memoria && (S.memoria.corpos.length || (S.memoria.fin.velas || 0) > S.t)) for (const L of G.Memoria.lights(S)) {
      const fl = 1 + Math.sin(now / 110 + L.x * 7) * 0.07;
      const cx = (L.x * TS * sc + ox) / 4, cy = (L.y * TS * sc + oy) / 4, r = L.r * TS * sc * fl / 4;
      for (const [f, al] of [[1.0, 0.25], [0.55, 0.6]]) { lctx.fillStyle = 'rgba(0,0,0,' + al + ')'; lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill(); }
    }
    for (const b of fires) {
      const fl = 1 + Math.sin(now / 90 + b.id) * 0.04 + Math.sin(now / 37) * 0.02;
      const cx = ((b.x + 0.5) * TS * sc + ox) / 4, cy = ((b.y + 0.4) * TS * sc + oy) / 4;
      const r = TS * sc * (G.Sim.def(b).fire.r + 0.2) * fl / 4;   // a fogueira maior clareia mais longe
      const steps = [[1.0, 0.35], [0.72, 0.7], [0.45, 1]];
      for (const [f, a] of steps) {
        lctx.fillStyle = 'rgba(0,0,0,' + a + ')';
        lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill();
      }
    }
    // quem está com fogo por perto tem pouca luz própria; céu estrelado fica para depois
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(light, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of fires) {
      const cx = (b.x + 0.5) * TS * sc + ox, cy = (b.y + 0.4) * TS * sc + oy;
      const r = TS * sc * (G.Sim.def(b).fire.r - 1.8);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(247,118,34,' + (0.22 * dark / 0.64).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(247,118,34,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // gota nova: cai até um ponto do chão (visão de cima), onde vira respingo
  function newDrop(anywhere) {
    return { x: Math.random() * W * 1.15, y: anywhere ? Math.random() * H : -Math.random() * 40 * dpr, ly: Math.random() * H, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 };
  }

  let flash = 0, flashWait = 2;
  function drawWeather(S, dt) {
    const kind = S.precip, Nr = G.Narr;
    const blizzard = !!(Nr && Nr.is(S, 'nevasca')), storm = !!(Nr && Nr.is(S, 'tempestade'));
    // seca: o dia fica amarelado e parado
    if (Nr && Nr.is(S, 'seca') && darkness(S.ck.hour) < 0.3) { ctx.fillStyle = 'rgba(247,150,50,0.09)'; ctx.fillRect(0, 0, W, H); }
    // tempestade: relâmpagos
    if (storm) {
      flashWait -= dt;
      if (flashWait <= 0) { flash = 0.14; flashWait = 2.5 + Math.random() * 5; if (G.Audio) G.Audio.sfx('trovao', undefined, undefined, 0.6, 0.25 + Math.random() * 0.6); }
      if (flash > 0) { ctx.fillStyle = 'rgba(235,240,255,' + (flash * 2.2).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); flash -= dt; }
    }
    // nevasca: tudo branco de vento
    if (blizzard) { ctx.fillStyle = 'rgba(214,226,240,0.2)'; ctx.fillRect(0, 0, W, H); }
    const area = (W * H) / (dpr * dpr);
    const target = kind ? Math.min(kind === 'neve' ? (blizzard ? 560 : 260) : 380, Math.round(area / (kind === 'neve' ? (blizzard ? 2600 : 6000) : 3800))) : 0;
    while (drops.length < target) drops.push(newDrop(true));
    if (drops.length > target) drops.length = target;
    if (!kind) { splashes.length = 0; return; }
    const px = Math.max(1, Math.round(dpr * 2));
    if (kind === 'chuva') {
      ctx.fillStyle = 'rgba(30,40,74,0.2)'; ctx.fillRect(0, 0, W, H);
      const w = Math.max(1, Math.round(dpr)), seg = px * 1.6;
      ctx.fillStyle = 'rgba(178,220,246,0.62)';
      for (const d of drops) {
        d.y += 700 * dpr * d.s * dt; d.x -= 150 * dpr * d.s * dt;
        if (d.y >= d.ly) {
          if (splashes.length < 220) splashes.push({ x: d.x, y: d.ly, t: 0 });
          Object.assign(d, newDrop(false));
          continue;
        }
        // rastro para cima e para a direita, oposto ao movimento
        for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(d.x + i * seg * 0.21), Math.round(d.y - i * seg), w, Math.ceil(seg));
      }
      ctx.fillStyle = 'rgba(214,236,250,0.75)';
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.t += dt;
        if (s.t > 0.2) { splashes.splice(i, 1); continue; }
        const r = px * (0.8 + s.t * 9);
        ctx.fillRect(Math.round(s.x - r), Math.round(s.y), w, w);
        ctx.fillRect(Math.round(s.x + r), Math.round(s.y), w, w);
        ctx.fillRect(Math.round(s.x), Math.round(s.y - r * 0.6), w, w);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const d of drops) {
        d.ph += dt;
        if (blizzard) {
          // vento de lado, neve rápida
          d.y += 150 * dpr * d.s * dt; d.x += (220 + Math.sin(d.ph * 2) * 40) * dpr * d.s * dt;
          if (d.y > H || d.x > W + 10) { d.y = Math.random() * H * 0.6 - 10; d.x = -10 - Math.random() * W * 0.3; }
          ctx.fillRect(Math.round(d.x), Math.round(d.y), px * 2, px);
          continue;
        }
        d.y += 55 * dpr * d.s * dt; d.x += Math.sin(d.ph * 1.3) * 18 * dpr * dt;
        if (d.y > H) { d.y = -6; d.x = Math.random() * W; }
        ctx.fillRect(Math.round(d.x), Math.round(d.y), px, px);
      }
    }
  }
})(globalThis.G = globalThis.G || {});
