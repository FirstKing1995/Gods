/* Gods · mundo: geração por seed, objetos, passagem e pathfinding. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;

  const T = { DEEP: 0, SHALLOW: 1, RIVER: 2, SAND: 3, GRASS: 4, FOREST: 5, HILL: 6, MOUNTAIN: 7, DRY: 8 };
  const IS_WATER = [1, 1, 1, 0, 0, 0, 0, 0, 0];
  const TNAME = ['Água funda', 'Água rasa', 'Rio', 'Areia', 'Campo', 'Floresta', 'Colina', 'Montanha', 'Campo seco'];

  // mesma regra para tiles (jogo) e pixels (arte)
  function classify(e, m, r) {
    if (e < 0.30) return T.DEEP;
    if (e < 0.345) return T.SHALLOW;
    if (r < 0.024 && e < 0.70) return T.RIVER;
    if (e < 0.375) return T.SAND;
    if (e > 0.765) return T.MOUNTAIN;
    if (e > 0.675) return T.HILL;
    if (m > 0.60) return T.FOREST;
    if (m < 0.33) return T.DRY;
    return T.GRASS;
  }

  function generate(seed) {
    const N = C.MAP, W = N, H = N, n = W * H;
    const nE = new G.Simplex(seed >>> 0);
    const nM = new G.Simplex((seed ^ 0x51ed27) >>> 0);
    const nR = new G.Simplex((seed ^ 0x2b7e15) >>> 0);
    const w = {
      seed: seed >>> 0, W, H,
      elev: new Float32Array(n), moist: new Float32Array(n), riv: new Float32Array(n),
      tile: new Uint8Array(n), block: new Uint8Array(n), slow: new Uint8Array(n),
      objGrid: new Int32Array(n).fill(-1), bgrid: new Int32Array(n).fill(-1),
      objs: [],
    };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const nx = (x + 0.5) / W * 2 - 1, ny = (y + 0.5) / H * 2 - 1;
        let e = 0.5 + 0.62 * nE.fbm(x / 58, y / 58, 5, 2, 0.5);
        const box = Math.max(Math.abs(nx), Math.abs(ny));
        const rad = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
        e -= U.smooth(0.62, 1.0, Math.max(box, rad * 1.05)) * 0.5 + U.smooth(0.88, 1.0, box) * 0.35;
        const m = 0.5 + 0.65 * nM.fbm(x / 44 + 40, y / 44 - 20, 4, 2, 0.5);
        const r = Math.abs(nR.fbm(x / 62 + 7, y / 62 - 3, 3, 2, 0.5));
        w.elev[i] = e; w.moist[i] = m; w.riv[i] = r;
        w.tile[i] = classify(e, m, r);
      }
    }
    placeObjects(w);
    w.genCount = w.objs.length;
    for (let i = 0; i < n; i++) refreshBlock(w, i);
    return w;
  }

  function addObj(w, k, x, y, props) {
    const o = { id: w.objs.length, k, x, y, res: 0 };
    if (props) Object.assign(o, props);
    w.objs.push(o);
    w.objGrid[y * w.W + x] = o.id;
    return o;
  }

  function placeObjects(w) {
    const s = w.seed, W = w.W;
    for (let y = 1; y < w.H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, t = w.tile[i];
        if (IS_WATER[t]) continue;
        const h = G.hash2(x, y, s + 101), hv = G.hash2(x, y, s + 202), e = w.elev[i];
        const v = Math.floor(hv * 3);
        const tree = (arau) => addObj(w, 'tree', x, y, { sp: arau ? 'arau' : 'broad', v });
        const bush = () => addObj(w, 'bush', x, y, { v, fruit: hv < 0.5 ? 2 : 1, grow: 0 });
        const rock = (big) => addObj(w, 'rock', x, y, { v, big: big ? 1 : 0, ch: big ? 4 : 2 });
        switch (t) {
          case T.FOREST: if (h < 0.40) tree(e > 0.62); else if (h < 0.43) bush(); break;
          case T.GRASS: if (h < 0.06) tree(false); else if (h < 0.08) bush(); else if (h < 0.088) rock(false); break;
          case T.DRY: if (h < 0.025) tree(false); else if (h < 0.04) bush(); else if (h < 0.065) rock(false); break;
          case T.HILL: if (h < 0.09) rock(hv > 0.5); else if (h < 0.16) tree(e > 0.7); else if (h < 0.18) bush(); break;
          case T.MOUNTAIN: if (h < 0.13) rock(true); else if (h < 0.19) tree(true); break;
          case T.SAND: if (h < 0.012) rock(false); break;
        }
      }
    }
  }

  function objAt(w, i) { const o = w.objGrid[i]; return o >= 0 ? w.objs[o] : null; }

  // obras não bloqueiam: dá para passar por elas devagar (ninguém fica preso num canto fechado por barracas),
  // mas nunca são destino de caminho
  function refreshBlock(w, i) {
    let b = 0;
    if (w.tile[i] === T.DEEP) b = 1;
    else {
      const o = objAt(w, i);
      if (o && (o.k === 'tree' || o.k === 'rock')) b = 1;
    }
    if (w.block[i] !== b) { w.block[i] = b; w.rev = (w.rev || 0) + 1; }   // rev: a área cercada é refeita
    w.slow[i] = w.bgrid[i] >= 0 ? 1 : 0;
  }

  function removeObj(w, o) {
    const i = o.y * w.W + o.x;
    if (w.objGrid[i] === o.id) w.objGrid[i] = -1;
    o.k = 'gone';
    refreshBlock(w, i);
  }

  // ---------- pathfinding ----------
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let gBuf = null, fromBuf = null, seenBuf = null, closedBuf = null, stamp = 0;
  const heap = new G.Heap();

  function ensure(n) {
    if (!gBuf || gBuf.length !== n) {
      gBuf = new Float32Array(n); fromBuf = new Int32Array(n);
      seenBuf = new Uint32Array(n); closedBuf = new Uint32Array(n); stamp = 0;
    }
    stamp++;
    if (stamp > 0xfffffff0) { seenBuf.fill(0); closedBuf.fill(0); stamp = 1; }
    heap.clear();
  }

  function rebuild(start, end) {
    const out = [];
    let c = end;
    while (c !== start) { out.push(c); c = fromBuf[c]; }
    out.reverse();
    return out;
  }

  // beast: 0 = gente (pula a cerca, mais devagar; em cima de caminho a cerca é porteira), 1 = bicho do mato (a cerca e
  // as obras seguram), 2 = bicho de criação (e a água também). Bicho não passa na quina entre duas cercas.
  // bwall: obra que é parede para bicho (casa, fogueira, oficina...); roça e curral não são
  const wall = (w, i, beast) => (w.fence && w.fence[i] === 1) || (w.bwall && w.bwall[i] === 1) || (beast === 2 && IS_WATER[w.tile[i]] === 1);
  function expand(w, cur, onEdge, beast) {
    const W = w.W, cx = cur % W, cy = (cur / W) | 0, fence = w.fence;
    for (let k = 0; k < 8; k++) {
      const nx = cx + NB[k][0], ny = cy + NB[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
      const ni = ny * W + nx;
      if (w.block[ni]) continue;
      if (k >= 4 && (w.block[cy * W + nx] || w.block[ny * W + cx])) continue;
      let c = NB[k][2] * C.COST[w.tile[ni]] * (w.slow[ni] ? C.BUILD_PASS_COST : 1) * (w.road ? C.ROAD_MULT[w.road[ni]] : 1);
      if (beast) {
        if (wall(w, ni, beast) || (k >= 4 && (wall(w, cy * W + nx, beast) || wall(w, ny * W + cx, beast)))) continue;
      } else if (fence && fence[ni] && !(w.road && w.road[ni] >= 2)) c *= C.CERCA_PASS;
      onEdge(ni, c, nx, ny);
    }
  }

  // A* até um tile
  function findPath(w, start, goal, maxCost, beast) {
    if (start === goal) return [];
    if (w.block[goal] || (beast && wall(w, goal, beast))) return null;
    maxCost = maxCost || 400;
    ensure(w.W * w.H);
    const W = w.W, gx = goal % W, gy = (goal / W) | 0;
    // com caminhos e trilhas o passo pode custar menos que 1: a estimativa encolhe para o A* ainda achar o caminho bom
    const hk = w.roadCount ? 0.8 : 1;
    const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy)) * hk; };
    gBuf[start] = 0; seenBuf[start] = stamp;
    heap.push(h(start % W, (start / W) | 0), start);
    let cur, gc;
    const edge = (ni, c, nx, ny) => {
      const ng = gc + c;
      if (ng > maxCost) return;
      if (seenBuf[ni] !== stamp || ng < gBuf[ni]) {
        seenBuf[ni] = stamp; gBuf[ni] = ng; fromBuf[ni] = cur;
        heap.push(ng + h(nx, ny), ni);
      }
    };
    while (heap.size()) {
      cur = heap.pop();
      if (cur === goal) return rebuild(start, goal);
      if (closedBuf[cur] === stamp) continue;
      closedBuf[cur] = stamp;
      gc = gBuf[cur];
      expand(w, cur, edge, beast);
    }
    return null;
  }

  // Dijkstra até o primeiro tile que passa no teste (allowSlow: também dentro de obras, quando não há outro jeito)
  function findNearest(w, start, test, maxCost, allowSlow, beast) {
    maxCost = maxCost || C.SEARCH_MAX;
    ensure(w.W * w.H);
    gBuf[start] = 0; seenBuf[start] = stamp;
    heap.push(0, start);
    let cur, gc;
    const edge = (ni, c) => {
      const ng = gc + c;
      if (ng > maxCost) return;
      if (seenBuf[ni] !== stamp || ng < gBuf[ni]) {
        seenBuf[ni] = stamp; gBuf[ni] = ng; fromBuf[ni] = cur;
        heap.push(ng, ni);
      }
    };
    while (heap.size()) {
      cur = heap.pop();
      if (closedBuf[cur] === stamp) continue;
      closedBuf[cur] = stamp;
      gc = gBuf[cur];
      const r = w.slow[cur] && !allowSlow ? 0 : test(cur);
      if (r) return { idx: cur, path: rebuild(start, cur), data: r, cost: gc };
      expand(w, cur, edge, beast);
    }
    return null;
  }

  // ---------- consultas ----------
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function adjObj(w, i, pred) {
    const W = w.W, x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + N8[k][0], ny = y + N8[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
      const o = objAt(w, ny * W + nx);
      if (o && pred(o)) return o;
    }
    return null;
  }
  function waterAdj(w, i) {
    if (IS_WATER[w.tile[i]]) return -1;
    const W = w.W, x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + N8[k][0], ny = y + N8[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
      const ni = ny * W + nx;
      if (IS_WATER[w.tile[ni]]) return ni;
    }
    return -1;
  }
  function waterCount8(w, i) {
    const W = w.W, x = i % W, y = (i / W) | 0;
    let c = 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + N8[k][0], ny = y + N8[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
      if (IS_WATER[w.tile[ny * W + nx]]) c++;
    }
    return c;
  }

  function campFree(w, x, y) {
    if (x < 2 || y < 2 || x > w.W - 4 || y > w.H - 4) return false;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = (y + dy) * w.W + (x + dx);
      if (IS_WATER[w.tile[i]]) return false;
      const o = objAt(w, i);
      if (o && (o.k === 'tree' || o.k === 'rock')) return false;
    }
    return true;
  }

  // avaliação de um local para a escolha inicial
  function evalSite(w, x, y) {
    const W = w.W, R = 10;
    const out = { x, y, valid: false, trees: 0, rocks: 0, bushes: 0, waterDist: 99, waterKind: '', cold: 0, reason: '' };
    if (x < 0 || y < 0 || x >= W || y >= w.H) { out.reason = 'Fora do mapa'; return out; }
    const t = w.tile[y * W + x];
    let coldTiles = 0, landTiles = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
      const i = ny * W + nx, tt = w.tile[i];
      const o = objAt(w, i);
      if (o) { if (o.k === 'tree') out.trees++; else if (o.k === 'rock') out.rocks++; else if (o.k === 'bush') out.bushes++; }
      if (!IS_WATER[tt]) { landTiles++; if (tt === T.MOUNTAIN || tt === T.HILL) coldTiles++; }
    }
    for (let r = 0; r <= 30 && out.waterDist === 99; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= w.H) continue;
        const tt = w.tile[ny * W + nx];
        if (IS_WATER[tt]) {
          const d = Math.round(Math.hypot(dx, dy));
          if (d < out.waterDist) { out.waterDist = d; out.waterKind = tt === T.RIVER ? 'rio' : 'lago'; }
        }
      }
    }
    out.cold = landTiles ? coldTiles / landTiles : 0;
    out.tile = t;
    if (IS_WATER[t]) out.reason = 'Não dá para acampar na água';
    else if (t === T.MOUNTAIN) out.reason = 'Pedra demais para acampar';
    else if (!campFree(w, x, y)) out.reason = 'Precisa de um espaço livre de 2 × 2';
    else out.valid = true;
    return out;
  }

  // melhor local automático (testes e sugestão)
  function bestSite(w) {
    let best = null, bestScore = -1e9;
    for (let y = 12; y < w.H - 12; y += 3) for (let x = 12; x < w.W - 12; x += 3) {
      const s = evalSite(w, x, y);
      if (!s.valid) continue;
      const sc = Math.min(s.trees, 40) * 1 + Math.min(s.rocks, 12) * 2 + Math.min(s.bushes, 20) * 2.5
        - s.waterDist * 3 - s.cold * 30 + (s.waterDist <= 1 ? -6 : 0);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    return best;
  }

  function siteLabel(w, s) {
    if (s.waterDist <= 4) return s.waterKind === 'rio' ? 'à beira do rio' : 'à beira do lago';
    if (s.cold > 0.35) return 'ao pé da montanha';
    if (s.trees > 45) return 'à floresta';
    return 'ao campo aberto';
  }

  G.T = T; G.IS_WATER = IS_WATER; G.TNAME = TNAME;
  G.W = {
    classify, generate, addObj, objAt, refreshBlock, removeObj, wall,
    findPath, findNearest, adjObj, waterAdj, waterCount8, campFree, evalSite, bestSite, siteLabel,
    idx: (w, x, y) => y * w.W + x,
  };
})(globalThis.G = globalThis.G || {});
