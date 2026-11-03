/* Gods · clima (0.23, do laboratório de estilo). Duas camadas por cima do mundo, sem tocar no desenho dele:
   - o tom do ar (mistura soft-light): manhã fresca, meio-dia claro, fim de tarde dourado, noite azul; e a vinheta
   - a luz (mistura screen): o brilho quente do fogo e das casas no escuro, vaga-lumes de noite, pólen de dia
   Só aparece em jogo; com "reduzir movimento" do aparelho, fica o tom e a luz, sem os bichinhos voando. */
(function (G) {
  'use strict';
  const Cl = G.Clima = {};
  let grade = null, fx = null, gx = null, fxx = null, S = null, ligado = false;
  const motes = [], flies = [];
  const calmo = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  Cl.init = function () {
    const view = document.getElementById('view');
    if (!view || grade) return;
    const mk = (blend) => {
      const c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;mix-blend-mode:' + blend;
      view.after(c);
      return c;
    };
    fx = mk('screen'); grade = mk('soft-light');
    gx = grade.getContext('2d'); fxx = fx.getContext('2d');
    requestAnimationFrame(quadro);
  };
  // o jogo avisa o estado a cada quadro (null fora do jogo)
  Cl.frame = function (state) { S = state; };

  const lerp = (a, b, t) => a + (b - a) * t;
  // a cor do ar por hora: [r, g, b, força]
  const TOM = [[0, [40, 70, 150, 0.55]], [5, [60, 80, 160, 0.5]], [6.5, [255, 170, 140, 0.35]], [9, [255, 236, 200, 0.18]], [15, [255, 226, 180, 0.2]],
    [17.5, [255, 160, 80, 0.45]], [19, [200, 110, 140, 0.45]], [20.5, [40, 70, 150, 0.55]], [24, [40, 70, 150, 0.55]]];
  function tom(h) {
    for (let i = 0; i < TOM.length - 1; i++) {
      const [h0, a] = TOM[i], [h1, b] = TOM[i + 1];
      if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return a.map((v, k) => lerp(v, b[k], t)); }
    }
    return TOM[0][1];
  }

  function quadro(now) {
    requestAnimationFrame(quadro);
    const st = S, W = innerWidth, H = innerHeight;
    if (!st) { if (ligado) { gx.clearRect(0, 0, grade.width, grade.height); fxx.clearRect(0, 0, fx.width, fx.height); ligado = false; } return; }
    ligado = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [grade, fx]) if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    gx.setTransform(dpr, 0, 0, dpr, 0, 0); fxx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, W, H); fxx.clearRect(0, 0, W, H);
    const h = st.ck.hour, dark = G.R.darkness(h), inverno = st.ck.season === 3;
    // 1) o tom do ar e a vinheta
    const [r, g, b, a] = tom(h);
    gx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a * (st.precip ? 0.5 : 1)).toFixed(3) + ')';
    gx.fillRect(0, 0, W, H);
    const vg = gx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,30,' + (0.35 + dark * 0.3).toFixed(2) + ')');
    gx.fillStyle = vg; gx.fillRect(0, 0, W, H);
    // 2) o brilho quente do fogo e das casas (as casas só bem de noite), que cresce com o escuro
    const sc = G.R.scale(), TS = G.CFG.TILE;
    if (dark > 0.05) {
      for (const bd of st.buildings) {
        if (!bd.built) continue;
        const fogo = bd.type === 'fogueira' && bd.fuel > 0;
        const casa = !fogo && bd.type === 'barraca' && dark > 0.3;
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
    if (calmo) return;
    // 3) vaga-lumes de noite (menos no inverno e na chuva) e pólen de dia
    const px = Math.max(1.5, sc * 0.9);
    if (dark > 0.35 && !inverno && !st.precip) while (flies.length < 26) flies.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8, ph: Math.random() * 6, life: 4 + Math.random() * 6 });
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
    if (dark < 0.2 && !st.precip) while (motes.length < 18) motes.push({ x: Math.random() * W, y: Math.random() * H, vx: 4 + Math.random() * 6, vy: -2 - Math.random() * 3, ph: Math.random() * 6, life: 6 + Math.random() * 8 });
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life -= 1 / 60; m.ph += 0.03; m.x += (m.vx + Math.sin(m.ph) * 5) / 60; m.y += m.vy / 60;
      if (m.life <= 0 || dark > 0.25) { motes.splice(i, 1); continue; }
      fxx.fillStyle = 'rgba(255,240,200,' + (0.35 * Math.min(1, m.life / 2)).toFixed(3) + ')';
      fxx.fillRect(m.x, m.y, px, px);
    }
  }
})(globalThis.G = globalThis.G || {});
