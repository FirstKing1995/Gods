/* Gods · som (Etapa 6). Tudo nasce aqui mesmo, com Web Audio: nenhum arquivo de áudio.
   Três trilhas com volume próprio (música, ambiente, efeitos) e uma chave geral, guardadas neste aparelho.
   - Efeitos: as ações de quem está na tela (machado, pedra, martelo, água, lança), as obras, os milagres,
     as orações, nascimento, morte, descobertas, lobos, festas e os pequenos acontecimentos. Longe da câmera, mais baixo.
   - Ambiente: pássaros de dia, grilos e sapos de noite, coruja, vento, chuva, rio perto da câmera e o estalo do fogo.
   - Música: gerada na hora, em escala pentatônica, com humor que segue o jogo: dia, tarde, noite, inverno,
     perigo (lobos, nevasca, parto difícil), festa e história ao pé do fogo. Toca em frases e descansa entre elas.
   O navegador só libera o som depois do primeiro toque ou tecla. */
(function (G) {
  'use strict';
  const A = G.Audio = {};
  const KEY = 'genesis.audio';
  const pref = { on: true, master: 0.8, music: 0.5, amb: 0.6, sfx: 0.8 };
  try { const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY); if (raw) Object.assign(pref, JSON.parse(raw)); } catch (e) { /* sem acesso */ }
  A.pref = pref;
  let ctx = null, master = null, comp = null, bus = {}, verb = null, noiseBuf = null;
  let started = false, hidden = false, S = null, mode = 'title', speed = 1;
  const lastPlay = {};
  let voices = 0;

  function savePref() { try { globalThis.localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* sem acesso */ } }
  A.ok = () => !!ctx && ctx.state === 'running';

  // ---------- montagem (no primeiro gesto) ----------
  A.init = function () {
    const go = () => { A.unlock(); };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go, { passive: true });
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (!ctx) return;
      if (hidden) ctx.suspend().catch(() => {}); else if (pref.on) ctx.resume().catch(() => {});
    });
  };
  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended' && pref.on && !hidden) ctx.resume().catch(() => {}); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    build(ctx);
    if (!pref.on) ctx.suspend().catch(() => {});
    started = true;
    startAmbient();
    loop();
  };
  function build(c) {
    master = c.createGain();
    comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(c.destination);
    for (const k of ['music', 'amb', 'sfx']) { bus[k] = c.createGain(); bus[k].connect(master); }
    // eco de sala (impulso gerado): música e alguns efeitos
    verb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    bus.verb = c.createGain(); bus.verb.gain.value = 0.28;
    verb.connect(bus.verb); bus.verb.connect(master);
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyPref();
  }
  function applyPref() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(pref.on ? pref.master : 0, t, 0.05);
    bus.music.gain.setTargetAtTime(pref.music * 0.9, t, 0.1);
    bus.amb.gain.setTargetAtTime(pref.amb * 0.9, t, 0.1);
    bus.sfx.gain.setTargetAtTime(pref.sfx, t, 0.05);
  }
  A.set = function (k, v) {
    if (k === 'on') pref.on = !!v; else pref[k] = Math.max(0, Math.min(1, +v || 0));
    savePref(); applyPref();
    if (ctx) { if (pref.on && !hidden) ctx.resume().catch(() => {}); else if (!pref.on) ctx.suspend().catch(() => {}); }
  };
  A.toggle = function () { A.unlock(); A.set('on', !pref.on); return pref.on; };

  // ---------- peças ----------
  const T = () => ctx.currentTime;
  function env(g, t, a, peak, d, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, end || 0.0001), t + a + d);
  }
  function out(dest, pan, wet) {
    // saída com pan (StereoPanner quando existe) e um pouco de eco se wet
    let node = dest;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(dest); node = p; }
    if (wet) { const s = ctx.createGain(); s.gain.value = wet; s.connect(verb); const m = ctx.createGain(); m.connect(node); m.connect(s); return m; }
    return node;
  }
  function tone(type, f, t, a, d, peak, dest, f2, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
    if (detune) o.detune.value = detune;
    env(g, t, a, peak, d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.05);
    voices++; o.onended = () => { voices--; };
    return o;
  }
  function noise(t, dur, type, f, q, a, peak, dest, f2) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    env(g, t, a, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
    voices++; s.onended = () => { voices--; };
    return s;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);   // nota MIDI -> Hz

  // ---------- efeitos ----------
  // cada receita: (t, saída, força) -> duração
  const SFX = {
    machado(t, o, v) { noise(t, 0.07, 'bandpass', 900 + Math.random() * 300, 1.4, 0.002, 0.5 * v, o); tone('sine', 150, t, 0.002, 0.12, 0.35 * v, o, 60); return 0.15; },
    pedra(t, o, v) { noise(t, 0.04, 'bandpass', 2600, 5, 0.001, 0.4 * v, o); tone('triangle', 1700 + Math.random() * 400, t, 0.001, 0.09, 0.12 * v, o); return 0.1; },
    martelo(t, o, v) { noise(t, 0.05, 'bandpass', 700, 2, 0.001, 0.45 * v, o); tone('sine', 220, t, 0.001, 0.08, 0.2 * v, o, 120); return 0.1; },
    lasca(t, o, v) { noise(t, 0.03, 'highpass', 3500, 1, 0.001, 0.3 * v, o); tone('triangle', 2400, t + 0.02, 0.001, 0.05, 0.08 * v, o); return 0.06; },
    cavar(t, o, v) { noise(t, 0.12, 'lowpass', 900, 1, 0.01, 0.28 * v, o, 300); return 0.15; },
    agua(t, o, v) { noise(t, 0.3, 'lowpass', 3200, 1, 0.01, 0.3 * v, o, 400); return 0.32; },
    peixe(t, o, v) { SFX.agua(t, o, v); tone('sine', 700, t + 0.12, 0.005, 0.12, 0.12 * v, o, 1100); return 0.3; },
    colher(t, o, v) { noise(t, 0.08, 'bandpass', 2200, 1.5, 0.01, 0.12 * v, o); return 0.1; },
    lanca(t, o, v) { noise(t, 0.28, 'bandpass', 800, 2, 0.02, 0.3 * v, o, 2600); return 0.3; },
    acerto(t, o, v) { tone('sine', 110, t, 0.002, 0.2, 0.45 * v, o, 50); noise(t, 0.08, 'lowpass', 800, 1, 0.002, 0.3 * v, o); return 0.22; },
    queda(t, o, v) { noise(t, 0.6, 'lowpass', 1400, 1, 0.01, 0.5 * v, o, 120); tone('sine', 90, t + 0.25, 0.01, 0.4, 0.35 * v, o, 40); return 0.8; },
    obra(t, o, v) {
      for (let i = 0; i < 3; i++) noise(t + i * 0.13, 0.05, 'bandpass', 650, 2, 0.001, 0.4 * v, o);
      [60, 64, 67, 72].forEach((m, i) => pluck(hz(m + 12), t + 0.45 + i * 0.1, 0.5, 0.18 * v, o));
      return 1.2;
    },
    fogo(t, o, v) { noise(t, 0.5, 'lowpass', 500, 1, 0.08, 0.35 * v, o); for (let i = 0; i < 6; i++) crackle(t + Math.random() * 0.5, o, v * 0.8); return 0.6; },
    nascimento(t, o, v) { [76, 79, 81, 84, 86, 88].forEach((m, i) => bell(hz(m), t + i * 0.16, 0.16 * v, o, 1.6)); return 2.4; },
    morte(t, o, v) { bell(hz(45), t, 0.35 * v, o, 4); bell(hz(52), t + 0.9, 0.22 * v, o, 3.5); return 4.5; },
    descoberta(t, o, v) {
      [72, 74, 76, 79, 81, 84, 86].forEach((m, i) => pluck(hz(m), t + i * 0.07, 0.45, 0.16 * v, o));
      noise(t + 0.3, 0.9, 'highpass', 7000, 1, 0.1, 0.07 * v, o); return 1.3;
    },
    era(t, o, v) {
      [55, 62, 67, 71, 74, 79].forEach((m, i) => pluck(hz(m), t + i * 0.12, 0.8, 0.2 * v, o));
      pad([hz(55), hz(62), hz(67), hz(71)], t + 0.7, 2.6, 0.08 * v, o); return 3.4;
    },
    calor(t, o, v) { pad([hz(50), hz(57), hz(62)], t, 1.6, 0.14 * v, o, 1800); noise(t, 1.2, 'lowpass', 600, 1, 0.4, 0.15 * v, o); return 1.8; },
    chuva(t, o, v) { noise(t, 1.6, 'bandpass', 1300, 0.8, 0.5, 0.3 * v, o); for (let i = 0; i < 8; i++) tone('sine', 900 + Math.random() * 900, t + 0.3 + Math.random() * 1.2, 0.002, 0.05, 0.06 * v, o, 500); return 1.9; },
    cura(t, o, v) { [67, 71, 74, 79, 83].forEach((m, i) => bell(hz(m), t + i * 0.05, 0.12 * v, o, 2.2)); return 2.4; },
    revelacao(t, o, v) {
      const osc = tone('sine', hz(72), t, 0.4, 2.2, 0.12 * v, o, hz(91));
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = 12; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + 2.7);
      pad([hz(60), hz(67), hz(76)], t + 0.3, 2.4, 0.06 * v, o, 2400); return 2.8;
    },
    trovao(t, o, v) { noise(t, 0.08, 'highpass', 2500, 1, 0.001, 0.5 * v, o); noise(t + 0.05, 2.4, 'lowpass', 900, 1, 0.02, 0.7 * v, o, 90); return 2.6; },
    oracao(t, o, v) { bell(hz(81), t, 0.12 * v, o, 2); return 2; },
    atendida(t, o, v) { bell(hz(76), t, 0.14 * v, o, 1.4); bell(hz(83), t + 0.18, 0.14 * v, o, 1.8); return 2; },
    ignorada(t, o, v) { bell(hz(57), t, 0.12 * v, o, 1.4); bell(hz(52), t + 0.25, 0.12 * v, o, 1.8); return 2.1; },
    obrigado(t, o, v) { bell(hz(79), t, 0.1 * v, o, 1.2); bell(hz(83), t + 0.14, 0.1 * v, o, 1.2); bell(hz(86), t + 0.28, 0.1 * v, o, 1.6); return 1.9; },
    coracao(t, o, v) { tone('sine', 1180, t, 0.004, 0.08, 0.07 * v, o); tone('sine', 1480, t + 0.1, 0.004, 0.12, 0.07 * v, o); return 0.25; },
    meta(t, o, v) { pluck(hz(84), t, 0.5, 0.16 * v, o); pluck(hz(88), t + 0.09, 0.7, 0.14 * v, o); return 0.8; },
    aviso(t, o, v) { tone('triangle', 330, t, 0.005, 0.18, 0.1 * v, o); tone('triangle', 262, t + 0.14, 0.005, 0.2, 0.1 * v, o); return 0.4; },
    uivo(t, o, v) { howl(t, o, v, 1); howl(t + 0.7 + Math.random() * 0.6, o, v * 0.7, 1.12); return 3; },
    rosnado(t, o, v) { tone('sawtooth', 85, t, 0.02, 0.35, 0.18 * v, o, 70); noise(t, 0.35, 'lowpass', 500, 1, 0.02, 0.3 * v, o); return 0.4; },
    briga(t, o, v) { tone('square', 620, t, 0.003, 0.07, 0.05 * v, o); tone('square', 590, t + 0.08, 0.003, 0.07, 0.05 * v, o); return 0.2; },
    estrela(t, o, v) { for (let i = 0; i < 7; i++) tone('sine', hz(96 - i * 2), t + i * 0.05, 0.003, 0.3, 0.05 * v, o); return 0.8; },
    arcoiris(t, o, v) { [72, 76, 79, 84, 88].forEach((m, i) => bell(hz(m), t + i * 0.12, 0.07 * v, o, 1.4)); return 1.6; },
    araras(t, o, v) { for (let i = 0; i < 4; i++) { const s = t + i * 0.28 + Math.random() * 0.1, f = 1300 + Math.random() * 500; tone('sawtooth', f, s, 0.01, 0.12, 0.05 * v, bandOut(o, f * 1.4, 3), f * 0.6); } return 1.4; },
    lua(t, o, v) { owl(t, o, v); return 1.2; },
    canto(t, o, v) { [67, 69, 71, 74, 71, 69, 67].forEach((m, i) => flute(hz(m), t + i * 0.32, 0.3, 0.09 * v, o)); return 2.4; },
    clique(t, o, v) { tone('triangle', 1800, t, 0.001, 0.03, 0.05 * v, o); return 0.04; },
    // Etapa 7: serrote na marcenaria (vai e volta) e a batida do tear
    serra(t, o, v) { noise(t, 0.16, 'bandpass', 1700, 3, 0.02, 0.2 * v, o, 2600); noise(t + 0.2, 0.16, 'bandpass', 2500, 3, 0.02, 0.18 * v, o, 1600); return 0.4; },
    tear(t, o, v) { tone('triangle', 520, t, 0.001, 0.04, 0.08 * v, o); noise(t, 0.03, 'bandpass', 1200, 2, 0.001, 0.12 * v, o); tone('triangle', 390, t + 0.16, 0.001, 0.04, 0.06 * v, o); return 0.22; },
    // Etapa 8: a corda do arco e a flecha cortando o ar
    flecha(t, o, v) { tone('triangle', 190, t, 0.001, 0.14, 0.14 * v, o, 110); noise(t + 0.02, 0.16, 'bandpass', 2600, 2, 0.005, 0.16 * v, o, 5200); return 0.2; },
    // Etapa 9: o esturro da onça (grunhidos graves, cada vez mais juntos), o porco-do-mato, o bote do jacaré e a revoada
    esturro(t, o, v) {
      let s = t;
      for (let i = 0; i < 6; i++) { tone('sawtooth', 96 - i * 4, s, 0.02, 0.2, 0.22 * v, bandOut(o, 340, 1.1), 68); noise(s, 0.2, 'lowpass', 480, 1, 0.02, 0.24 * v, o); s += 0.34 - i * 0.03; }
      return 2;
    },
    grunhido(t, o, v) { for (let i = 0; i < 3; i++) { const s = t + i * 0.14; tone('square', 150 + Math.random() * 30, s, 0.005, 0.08, 0.08 * v, bandOut(o, 600, 2), 110); noise(s, 0.08, 'bandpass', 900, 2, 0.005, 0.15 * v, o); } return 0.5; },
    bote(t, o, v) { noise(t, 0.5, 'lowpass', 2400, 1, 0.005, 0.5 * v, o, 300); tone('sine', 120, t, 0.002, 0.15, 0.4 * v, o, 50); noise(t + 0.05, 0.03, 'highpass', 3000, 1, 0.001, 0.3 * v, o); return 0.6; },
    revoada(t, o, v) { for (let i = 0; i < 8; i++) noise(t + i * 0.045, 0.03, 'bandpass', 1800 + Math.random() * 900, 2, 0.002, 0.12 * v, o); tone('sine', 1500, t + 0.05, 0.01, 0.1, 0.03 * v, o, 1900); return 0.45; },
    // Etapa 10: a enxada na terra, a colheita, os bichos do curral, os gafanhotos e o sininho do mascate
    // Etapa 11: Deus sobe de nível, o dom, o escolhido, a conversão, a estátua consagrada, a espécie nova, o saber e a Bênção
    nivel(t, o, v) {
      [67, 71, 74, 79, 83, 86].forEach((m, i) => bell(hz(m), t + i * 0.11, 0.13 * v, o, 2.2));
      pad([hz(55), hz(62), hz(67), hz(71)], t + 0.5, 2.8, 0.07 * v, o, 2600); return 3.4;
    },
    dom(t, o, v) { [79, 83, 86, 91].forEach((m, i) => bell(hz(m), t + i * 0.07, 0.1 * v, o, 1.6)); return 1.9; },
    ungir(t, o, v) {
      [72, 79, 84, 88].forEach((m, i) => bell(hz(m), t + i * 0.09, 0.12 * v, o, 2.4));
      noise(t + 0.2, 1.4, 'highpass', 6500, 1, 0.3, 0.06 * v, o); return 2.6;
    },
    converte(t, o, v) { [69, 72, 76, 81].forEach((m, i) => bell(hz(m), t + i * 0.13, 0.11 * v, o, 2)); pad([hz(57), hz(64), hz(69)], t + 0.4, 2, 0.05 * v, o, 2200); return 2.6; },
    consagrar(t, o, v) {
      bell(hz(48), t, 0.22 * v, o, 3.2);
      [67, 72, 76, 79, 84].forEach((m, i) => bell(hz(m), t + 0.5 + i * 0.1, 0.1 * v, o, 2));
      pad([hz(48), hz(55), hz(64)], t + 0.3, 2.6, 0.07 * v, o, 1800); return 3.4;
    },
    criar(t, o, v) {
      tone('sine', 220, t, 0.3, 1.2, 0.1 * v, o, 1320);
      [72, 76, 79, 84, 88, 91].forEach((m, i) => bell(hz(m), t + 0.6 + i * 0.08, 0.09 * v, o, 1.8));
      noise(t + 0.4, 1.6, 'highpass', 5000, 1, 0.4, 0.05 * v, o); return 2.8;
    },
    saber(t, o, v) {
      pad([hz(50), hz(57), hz(62), hz(69)], t, 3, 0.08 * v, o, 2400);
      [74, 78, 81, 86].forEach((m, i) => bell(hz(m), t + 0.8 + i * 0.22, 0.09 * v, o, 2.2)); return 3.4;
    },
    bencao(t, o, v) {
      pad([hz(60), hz(67), hz(72)], t, 1.8, 0.07 * v, o, 2000);
      for (let i = 0; i < 6; i++) tone('sine', hz(88 + (i % 3) * 3), t + 0.2 + i * 0.12, 0.003, 0.25, 0.04 * v, o); return 2;
    },
    enxada(t, o, v) { noise(t, 0.09, 'lowpass', 1100, 1, 0.003, 0.3 * v, o, 350); noise(t + 0.02, 0.05, 'bandpass', 2400, 2, 0.002, 0.08 * v, o); return 0.12; },
    colheita(t, o, v) { for (let i = 0; i < 5; i++) noise(t + i * 0.07, 0.07, 'bandpass', 1800 + Math.random() * 800, 1.5, 0.01, 0.1 * v, o); [72, 76, 79].forEach((m, i) => pluck(hz(m), t + 0.35 + i * 0.09, 0.5, 0.12 * v, o)); return 0.9; },
    galo(t, o, v) {
      // có-có-ri-cóóó: quatro notas subindo e a última comprida caindo
      const b = bandOut(o, 1300, 1.6), s0 = 560 + Math.random() * 60;
      [[0, 1, 0.1], [0.14, 1.1, 0.1], [0.3, 1.45, 0.14], [0.5, 1.35, 0.55]].forEach(([dt, k, d], i) => tone('sawtooth', s0 * k, t + dt, 0.01, d, 0.09 * v, b, i === 3 ? s0 * 0.95 : s0 * k * 1.05));
      return 1.2;
    },
    galinha(t, o, v) { const b = bandOut(o, 1100, 2); for (let i = 0; i < 3; i++) tone('square', 480 + Math.random() * 80, t + i * 0.11, 0.004, 0.05, 0.05 * v, b, 380); return 0.4; },
    porco(t, o, v) { const b = bandOut(o, 750, 3); for (let i = 0; i < 2; i++) tone('sawtooth', 190 + Math.random() * 30, t + i * 0.18, 0.01, 0.12, 0.11 * v, b, 150); return 0.45; },
    ovelha(t, o, v) {
      const osc = tone('sawtooth', 330 + Math.random() * 40, t, 0.03, 0.55, 0.08 * v, bandOut(o, 1000, 2), 300);
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 9; lg.gain.value = 35; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + 0.7);
      return 0.7;
    },
    vaca(t, o, v) { tone('sawtooth', 118, t, 0.12, 1, 0.14 * v, bandOut(o, 520, 1.4), 150); tone('sawtooth', 236, t + 0.05, 0.12, 0.9, 0.03 * v, bandOut(o, 700, 2), 290); return 1.2; },
    praga(t, o, v) { for (let i = 0; i < 3; i++) noise(t + i * 0.3, 0.9, 'bandpass', 3200 + i * 400, 4, 0.2, 0.08 * v, o); return 1.8; },
    // Etapa 12: a bigorna da forja, a picareta na mina, a caravana que chega, a oferenda e dois povos que viram um
    bigorna(t, o, v) { bell(hz(96 + Math.floor(Math.random() * 3)), t, 0.16 * v, o, 0.5); noise(t, 0.03, 'highpass', 4500, 1, 0.001, 0.25 * v, o); return 0.2; },
    picareta(t, o, v) { noise(t, 0.05, 'bandpass', 1800, 4, 0.001, 0.4 * v, o); tone('triangle', 900 + Math.random() * 300, t, 0.001, 0.1, 0.12 * v, o, 500); noise(t + 0.08, 0.12, 'lowpass', 500, 1, 0.01, 0.12 * v, o); return 0.2; },
    caravana(t, o, v) { [62, 67, 69, 74].forEach((m, i) => pluck(hz(m), t + i * 0.16, 0.6, 0.16 * v, o)); bell(hz(86), t + 0.7, 0.07 * v, o, 1.4); return 1.8; },
    oferenda(t, o, v) { bell(hz(84), t, 0.11 * v, o, 1.8); bell(hz(91), t + 0.2, 0.09 * v, o, 2.2); noise(t + 0.1, 0.8, 'highpass', 8000, 1, 0.2, 0.05 * v, o); return 2.4; },
    uniao(t, o, v) { pad([hz(60), hz(64), hz(67), hz(72)], t, 2.2, 0.1 * v, o, 2200); [72, 76, 79, 84].forEach((m, i) => bell(hz(m), t + 0.3 + i * 0.18, 0.1 * v, o, 1.8)); return 3; },
    sino(t, o, v) { bell(hz(88), t, 0.08 * v, o, 0.8); bell(hz(88), t + 0.22, 0.07 * v, o, 0.8); bell(hz(91), t + 0.44, 0.06 * v, o, 1); return 1.4; },
    // Etapa 13: o velório (dois sinos graves), a terra da cova, as flores, o dia dos mortos, o rito e a pergunta na fumaça
    velorio(t, o, v) { bell(hz(50), t, 0.2 * v, o, 3.6); bell(hz(50), t + 1.5, 0.15 * v, o, 3.6); pad([hz(50), hz(57)], t, 3.8, 0.05 * v, o, 1200); return 5.2; },
    enterro(t, o, v) { SFX.cavar(t, o, v); SFX.cavar(t + 0.4, o, v * 0.8); SFX.cavar(t + 0.8, o, v * 0.6); bell(hz(57), t + 1.2, 0.13 * v, o, 3); return 4.2; },
    flores(t, o, v) { pluck(hz(76), t, 0.6, 0.1 * v, o); pluck(hz(79), t + 0.15, 0.7, 0.09 * v, o); pluck(hz(83), t + 0.32, 0.9, 0.08 * v, o); return 1.3; },
    finados(t, o, v) { [57, 60, 64, 67].forEach((m, i) => bell(hz(m), t + i * 0.75, 0.13 * v, o, 3)); pad([hz(45), hz(52), hz(57)], t, 4.2, 0.06 * v, o, 1400); return 5.4; },
    rito(t, o, v) { pad([hz(43), hz(50), hz(55)], t, 3.8, 0.09 * v, o, 900); [62, 65, 67, 65, 62].forEach((m, i) => flute(hz(m), t + 0.4 + i * 0.5, 0.45, 0.07 * v, o)); return 4.2; },
    visao(t, o, v) { tone('sine', hz(69), t, 0.3, 1.6, 0.08 * v, o, hz(81)); [81, 84, 88].forEach((m, i) => bell(hz(m), t + 0.5 + i * 0.18, 0.08 * v, o, 2)); noise(t + 0.2, 1.4, 'highpass', 6000, 1, 0.4, 0.04 * v, o); return 2.8; },
    respBoa(t, o, v) { pad([hz(60), hz(64), hz(67)], t, 2.4, 0.08 * v, o, 2200); [72, 76, 79, 84].forEach((m, i) => bell(hz(m), t + 0.2 + i * 0.16, 0.1 * v, o, 2)); return 3; },
    respMeio(t, o, v) { pad([hz(57), hz(62), hz(69)], t, 2.2, 0.07 * v, o, 1800); bell(hz(74), t + 0.3, 0.1 * v, o, 2); bell(hz(69), t + 0.7, 0.08 * v, o, 2); return 2.8; },
    respMedo(t, o, v) { bell(hz(45), t, 0.2 * v, o, 3.2); bell(hz(51), t + 0.5, 0.13 * v, o, 3); noise(t, 1.6, 'lowpass', 400, 1, 0.3, 0.16 * v, o, 120); return 3.6; },
    conto(t, o, v) { [62, 67, 69, 74].forEach((m, i) => pluck(hz(m), t + i * 0.17, 0.7, 0.12 * v, o)); return 1.5; },
  };
  function bandOut(o, f, q) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; b.connect(o); return b; }
  function crackle(t, o, v) { noise(t, 0.012 + Math.random() * 0.02, 'highpass', 2000 + Math.random() * 3000, 1, 0.001, (0.1 + Math.random() * 0.25) * v, o); }
  function howl(t, o, v, k) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330 * k, t); osc.frequency.linearRampToValueAtTime(620 * k, t + 0.6); osc.frequency.linearRampToValueAtTime(560 * k, t + 1.6); osc.frequency.linearRampToValueAtTime(380 * k, t + 2.2);
    l.frequency.value = 5.5; lg.gain.value = 9; l.connect(lg); lg.connect(osc.detune);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.4); g.gain.setValueAtTime(0.12 * v, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    osc.connect(g); g.connect(o);
    osc.start(t); l.start(t); osc.stop(t + 2.4); l.stop(t + 2.4);
    voices++; osc.onended = () => { voices--; };
  }
  function owl(t, o, v) {
    for (const [dt, f] of [[0, 400], [0.38, 380], [0.6, 390]]) tone('sine', f, t + dt, 0.04, 0.22, 0.07 * v, o, f * 0.93);
  }
  // instrumentos (também usados pela música)
  function pluck(f, t, d, vel, o) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(Math.min(8000, f * 6), t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.2), t + d);
    fl.connect(o);
    tone('triangle', f, t, 0.004, d, vel, fl);
    tone('sine', f * 2, t, 0.004, d * 0.5, vel * 0.3, fl);
  }
  function bell(f, t, vel, o, d) {
    [[1, 1], [2, 0.4], [2.76, 0.25], [5.4, 0.12]].forEach(([m, g], i) => tone('sine', f * m, t, 0.003, d / (1 + i * 0.8), vel * g, o));
  }
  function pad(fs, t, d, vel, o, cut) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut || 900; fl.connect(o);
    for (const f of fs) for (const dt of [-7, 7]) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = dt;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel / fs.length, t + Math.min(0.9, d * 0.4));
      g.gain.setValueAtTime(vel / fs.length, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.8);
      osc.connect(g); g.connect(fl); osc.start(t); osc.stop(t + d + 0.9);
      voices++; osc.onended = () => { voices--; };
    }
  }
  // cantarolado (antes da flauta existir, Etapa 8): boca fechada, som abafado
  function hum(f, t, d, vel, o) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = Math.min(2200, f * 2.6); fl.Q.value = 2; fl.connect(o);
    tone('triangle', f, t, 0.07, d, vel, fl);
    tone('sine', f * 2, t, 0.07, d * 0.8, vel * 0.22, fl);
  }
  function flute(f, t, d, vel, o) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    l.frequency.value = 5; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(8, t + Math.min(0.3, d)); l.connect(lg); lg.connect(osc.detune);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.06); g.gain.setValueAtTime(vel * 0.85, t + Math.max(0.07, d - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
    osc.connect(g); g.connect(o);
    osc.start(t); l.start(t); osc.stop(t + d + 0.15); l.stop(t + d + 0.15);
    voices++; osc.onended = () => { voices--; };
    noise(t, d * 0.8, 'bandpass', f * 2, 6, 0.03, vel * 0.12, o);
  }
  function drum(kind, t, vel, o) {
    if (kind === 'palma') { noise(t, 0.05, 'bandpass', 1400, 1, 0.001, 0.35 * vel, o); noise(t + 0.012, 0.04, 'bandpass', 2300, 1.5, 0.001, 0.2 * vel, o); return; }
    if (kind === 'bumbo') { tone('sine', 120, t, 0.002, 0.28, 0.5 * vel, o, 45); return; }
    if (kind === 'taiko') { tone('sine', 85, t, 0.004, 0.7, 0.55 * vel, o, 38); noise(t, 0.1, 'lowpass', 600, 1, 0.002, 0.2 * vel, o); return; }
    if (kind === 'tapa') { noise(t, 0.07, 'bandpass', 1800, 1.5, 0.001, 0.3 * vel, o); return; }
    noise(t, 0.035, 'highpass', 6500, 1, 0.002, 0.12 * vel, o);   // chocalho
  }

  // posição: mais baixo longe da câmera, e de um lado ou de outro
  function place(x, y) {
    if (x === undefined || !G.R || !G.R.cam) return { g: 1, pan: 0 };
    const cam = G.R.cam, TS = G.CFG.TILE, s = G.R.scale ? G.R.scale() : 3;
    const halfW = (window.innerWidth / 2) / (TS * s), halfH = (window.innerHeight / 2) / (TS * s);
    const dx = x - cam.x / TS, dy = y - cam.y / TS;
    const d = Math.hypot(dx / Math.max(4, halfW), dy / Math.max(4, halfH));
    const g = d <= 0.8 ? 1 : Math.max(0, 1 - (d - 0.8) / 0.9);
    const zoom = Math.min(1, 0.55 + s * 0.15);
    return { g: g * g * zoom, pan: Math.max(-0.8, Math.min(0.8, dx / Math.max(4, halfW))) };
  }
  // toca um efeito: gap mínimo por tipo, limite de vozes, posição
  const GAP = { serra: 0.3, tear: 0.2, flecha: 0.15, machado: 0.12, pedra: 0.1, martelo: 0.12, agua: 0.2, peixe: 0.3, colher: 0.2, lanca: 0.2, cavar: 0.2, lasca: 0.12, coracao: 1.2, oracao: 0.8, obrigado: 1, briga: 1, meta: 0.4, clique: 0.05, aviso: 1.5, uivo: 4,
    esturro: 3, grunhido: 0.6, bote: 1, revoada: 0.5, acerto: 0.1, enxada: 0.15, colheita: 0.8, galo: 4, galinha: 1.2, porco: 1.5, ovelha: 2, vaca: 3, praga: 2, sino: 2 };
  A.sfx = function (name, x, y, vol, delay) {
    if (!A.ok() || !pref.on || !SFX[name]) return;
    const now = T();
    if (now - (lastPlay[name] || -9) < (GAP[name] || 0.3) || voices > 60) return;
    const p = place(x, y);
    if (p.g < 0.04) return;
    lastPlay[name] = now;
    const wet = { nivel: 0.6, dom: 0.5, ungir: 0.5, converte: 0.5, consagrar: 0.6, criar: 0.6, saber: 0.6, bencao: 0.4, nascimento: 0.5, morte: 0.6, descoberta: 0.4, era: 0.5, cura: 0.5, revelacao: 0.6, oracao: 0.5, atendida: 0.4, obrigado: 0.4, uivo: 0.5, lua: 0.5, canto: 0.4, arcoiris: 0.5, estrela: 0.4, esturro: 0.45, velorio: 0.6, enterro: 0.4, flores: 0.4, finados: 0.6, rito: 0.5, visao: 0.6, respBoa: 0.5, respMeio: 0.5, respMedo: 0.6, conto: 0.4 }[name] || 0.1;
    SFX[name](now + 0.02 + (delay || 0), out(bus.sfx, p.pan, wet), p.g * (vol === undefined ? 1 : vol));
  };
  A.ui = function (name) { if (name === 'click') A.sfx('clique'); };

  // fala: um murmúrio curto, mais agudo para mulher e criança (só de perto e sem pressa)
  A.voice = function (p, kind, now) {
    if (!A.ok() || speed >= 3 || !S || kind === 'god') return;
    const s = G.R && G.R.scale ? G.R.scale() : 3;
    if (s < 2) return;
    const pos = place(p.x, p.y);
    if (pos.g < 0.3) return;
    const t = T(), key = 'voz';
    if (t - (lastPlay[key] || -9) < 0.12) return;
    lastPlay[key] = t;
    const kid = G.Family && G.Family.age(S, p) < 12;
    const base = (p.sex === 'F' ? 330 : 190) * (kid ? 1.5 : 1) * (1 + ((p.id * 37) % 10) / 60);
    const o = out(bus.sfx, pos.pan, 0.05), n = 2 + Math.floor(Math.random() * 3);
    const mood = kind === 'briga' ? 1.25 : kind === 'historia' ? 0.9 : 1;
    for (let i = 0; i < n; i++) {
      const f = base * mood * (1 + (Math.random() - 0.4) * 0.35);
      tone('triangle', f, t + i * 0.075, 0.008, 0.06, 0.035 * pos.g, bandOut(o, f * 2.2, 1.2), f * (kind === 'briga' ? 0.8 : 1.05));
    }
  };

  // ---------- eventos da simulação -> som ----------
  A.event = function (e, st) {
    if (!A.ok()) return;
    switch (e.k) {
      case 'fell': A.sfx('queda', e.x + 0.5, e.y + 0.5); break;
      case 'splash': A.sfx('peixe', e.x + 0.5, e.y + 0.5); break;
      case 'throw': A.sfx(e.bow ? 'flecha' : 'lanca', e.x1, e.y1); break;
      case 'bite': A.sfx(e.sp === 'jacare' ? 'bote' : e.sp === 'porco' || e.sp === 'anta' ? 'grunhido' : 'rosnado', e.x, e.y); break;
      // Etapa 9: acerto, esturro da onça, investida, revoada
      case 'hit': A.sfx('acerto', e.x, e.y); break;
      case 'roar': A.sfx('esturro'); break;
      case 'beast': A.sfx('grunhido', e.x, e.y); break;
      case 'birdsUp': A.sfx('revoada', e.x, e.y); break;
      case 'bolt': A.sfx('trovao'); break;
      case 'miracle': {
        const k = { revelacao: 'revelacao', cura: 'cura', chuva: 'chuva', bencao: 'bencao', consagrar: 'consagrar', criar: 'criar', saber: 'saber' }[e.kind] || 'calor';
        A.sfx(k, k === 'criar' || k === 'saber' ? undefined : e.x + 0.5, k === 'criar' || k === 'saber' ? undefined : e.y + 0.5, 1.2);
        break;
      }
      // Etapa 11
      case 'godLevel': A.sfx('nivel'); break;
      case 'dom': A.sfx('dom'); break;
      case 'ungir': A.sfx('ungir', e.x, e.y); break;
      case 'converte': A.sfx('converte', e.x, e.y); break;
      case 'heart': A.sfx('coracao', e.x + 0.5, e.y + 0.5); break;
      case 'birth': A.sfx('nascimento'); break;
      case 'disc': A.sfx('descoberta'); break;
      case 'era': A.sfx('era'); break;
      case 'over': A.sfx('morte'); break;
      case 'prayer': A.sfx('oracao'); break;
      case 'thanks': A.sfx(e.kind === 'luto' ? 'oracao' : 'obrigado'); break;
      case 'goal': A.sfx('meta'); break;
      case 'fight': A.sfx('briga', e.x, e.y); break;
      case 'star': A.sfx('estrela'); break;
      case 'rainbow': A.sfx('arcoiris'); break;
      case 'birds': A.sfx('araras'); break;
      case 'moon': A.sfx('lua'); break;
      case 'song': A.sfx('canto', e.x + 0.5, e.y + 0.5); break;
      case 'fireLit': A.sfx('fogo', e.x + 0.5, e.y + 0.5, 0.7); break;
      case 'upgrade': A.sfx('obra', e.x, e.y); break;
      case 'oferenda': A.sfx('oferenda'); break;   // Etapa 12
      case 'povo': A.sfx('atendida'); break;
      case 'memoria':   // Etapa 13
        if (e.ev === 'velorio') { if (e.on) A.sfx('velorio'); }
        else if (e.ev === 'uivo') A.sfx('uivo');
        else if (e.ev === 'enterro') A.sfx('enterro', e.x + 0.5, e.y + 0.5);
        else if (e.ev === 'flores') A.sfx('flores', e.x + 0.5, e.y + 0.5);
        else if (e.ev === 'finados') { if (e.on) A.sfx('finados'); }
        else if (e.ev === 'rito') { if (e.on) A.sfx('rito'); }
        else if (e.ev === 'pend') A.sfx('visao');
        else if (e.ev === 'conto') A.sfx('conto');
        else if (e.ev === 'resposta') A.sfx(e.tone > 0 ? 'respBoa' : e.tone < 0 ? 'respMedo' : 'respMeio');
        break;
      case 'narr': if (e.on && e.ev === 'lobos') A.sfx('uivo'); else if (e.on && e.ev === 'mascate') A.sfx('sino'); else if (e.on && e.ev === 'povo') A.sfx('caravana'); else if (e.warn && (e.ev === 'nevasca' || e.ev === 'tempestade')) A.sfx('aviso'); break;
      // Etapa 10
      case 'harvest': A.sfx('colheita', e.x, e.y); break;
      case 'praga': A.sfx('praga', e.x, e.y); break;
      case 'penLoss': A.sfx('rosnado', e.x, e.y); break;
      case 'chron':
        if (/ morreu /.test(e.text || '')) A.sfx('morte');
        else if (/primeira fogueira/.test(e.text || '')) A.sfx('fogo');
        else if (/viraram um só/.test(e.text || '')) A.sfx('uniao');
        else if (/Ergueram|Montaram|virou|ficou pronta|forno de barro queimou/.test(e.text || '')) A.sfx('obra');
        break;
      case 'toast':
        if (/pronta\.|pronto\./.test(e.text || '')) A.sfx('obra');
        else if (/Ninguém respondeu/.test(e.text || '')) A.sfx('ignorada');
        else if (/Você atendeu/.test(e.text || '')) A.sfx('atendida');
        break;
    }
  };

  // ---------- ambiente ----------
  let amb = null, nextChirp = 0, nextCricket = 0, nextOwl = 0, nextFrog = 0, nextCrack = 0, nextHowl = 0, nextWork = 0, nextRoar = 0, nextFarm = 0;
  function loopNoise(type, f, q) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(bus.amb); s.start();
    return { s, fl, g };
  }
  function startAmbient() {
    amb = { wind: loopNoise('lowpass', 500, 0.6), rain: loopNoise('bandpass', 1500, 0.5), river: loopNoise('bandpass', 520, 0.6), fire: loopNoise('lowpass', 260, 0.7), gust: loopNoise('bandpass', 1400, 8) };
    // vento que respira: um LFO lento no filtro
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.07; lg.gain.value = 260; l.connect(lg); lg.connect(amb.wind.fl.frequency); l.start();
    const l2 = ctx.createOscillator(), lg2 = ctx.createGain(); l2.frequency.value = 0.13; lg2.gain.value = 500; l2.connect(lg2); lg2.connect(amb.gust.fl.frequency); l2.start();
  }
  const ramp = (p, v, k) => p.setTargetAtTime(v, T(), k || 0.8);
  // água e fogo perto do centro da tela
  function around(st) {
    const w = st.world, cam = G.R.cam, TS = G.CFG.TILE, cx = Math.floor(cam.x / TS), cy = Math.floor(cam.y / TS);
    let water = 0, n = 0;
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
      n++; if (G.IS_WATER[w.tile[y * w.W + x]]) water++;
    }
    let fire = 99;
    for (const b of st.buildings) if (b.type === 'fogueira' && b.built && b.fuel > 0) fire = Math.min(fire, Math.hypot(b.x + 0.5 - cam.x / TS, b.y + 0.5 - cam.y / TS));
    return { water: n ? water / n : 0, fire };
  }
  function ambient(st, t) {
    if (!amb) return;
    const s = G.R && G.R.scale ? G.R.scale() : 3, near = Math.min(1, 0.4 + s * 0.2);
    let hour = 10, season = 0, precip = null, blizzard = false, storm = false, wolves = false, onca = false;
    if (st) {
      hour = st.ck.hour; season = st.ck.season; precip = st.precip;
      blizzard = !!(G.Narr && G.Narr.is(st, 'nevasca')); storm = !!(G.Narr && G.Narr.is(st, 'tempestade'));
      wolves = !!(G.Narr && G.Narr.wolvesOut(st));
      onca = !!(G.Narr && G.Narr.oncaOut && G.Narr.oncaOut(st));
    }
    const night = hour >= 19.5 || hour < 5, dawn = hour >= 5 && hour < 8;
    const a = st ? around(st) : { water: 0.2, fire: 99 };
    ramp(amb.wind.g.gain, (blizzard ? 0.5 : season === 3 ? 0.2 : storm ? 0.3 : 0.07) + (night ? 0.02 : 0));
    ramp(amb.gust.g.gain, blizzard ? 0.1 : storm ? 0.05 : season === 3 ? 0.02 : 0);
    ramp(amb.rain.g.gain, precip === 'chuva' ? (storm ? 0.42 : 0.26) : precip === 'neve' ? 0.05 : 0, 1.2);
    ramp(amb.river.g.gain, Math.min(0.28, a.water * 0.5) * near * (season === 3 ? 0.6 : 1));
    const fireG = a.fire < 12 ? (1 - a.fire / 12) * 0.22 * near : 0;
    ramp(amb.fire.g.gain, fireG, 0.4);
    const busy = voices > 40;
    // estalos do fogo
    if (fireG > 0.02 && t > nextCrack && !busy) { nextCrack = t + 0.05 + Math.random() * 0.35; crackle(t, bus.amb, fireG * 2.2); }
    // pássaros de dia (menos no inverno, nada na chuva); coro no amanhecer
    if (!night && !precip && season !== 3 && t > nextChirp && !busy) {
      nextChirp = t + (dawn ? 0.4 : 1.2) + Math.random() * (dawn ? 1.2 : 3.5);
      const f = 2200 + Math.random() * 2600, n = 1 + Math.floor(Math.random() * 4), pan = Math.random() * 1.4 - 0.7;
      const o = out(bus.amb, pan, 0.2);
      for (let i = 0; i < n; i++) tone('sine', f, t + i * 0.11, 0.005, 0.07, 0.035, o, f * (0.8 + Math.random() * 0.5));
    }
    // grilos de noite (não no inverno)
    if (night && season !== 3 && !precip && t > nextCricket && !busy) {
      nextCricket = t + 0.35 + Math.random() * 0.5;
      const f = 4200 + Math.random() * 500, o = out(bus.amb, Math.random() * 1.2 - 0.6);
      for (let i = 0; i < 3; i++) tone('sine', f, t + i * 0.045, 0.003, 0.025, 0.012, o);
    }
    // sapos perto da água, noites de primavera e verão
    if (night && season <= 1 && a.water > 0.05 && t > nextFrog && !busy) {
      nextFrog = t + 1.5 + Math.random() * 4;
      const o = out(bus.amb, Math.random() - 0.5);
      for (let i = 0; i < 2; i++) tone('sawtooth', 160 + Math.random() * 40, t + i * 0.16, 0.01, 0.08, 0.025, bandOut(o, 450, 4), 130);
    }
    // coruja, de vez em quando
    if (night && t > nextOwl && !precip) { nextOwl = t + 25 + Math.random() * 40; if (Math.random() < 0.5) owl(t, out(bus.amb, Math.random() - 0.5, 0.4), 0.7); }
    // lobos rondando: uivos de tempos em tempos
    if (wolves && t > nextHowl) { nextHowl = t + 9 + Math.random() * 12; A.sfx('uivo'); }
    // a onça rondando no escuro: um esturro de vez em quando, longe
    if (onca && night && t > nextRoar) { nextRoar = t + 25 + Math.random() * 35; A.sfx('esturro', undefined, undefined, 0.55); }
    // quem está trabalhando na tela: o som do trabalho, no ritmo de cada ferramenta
    if (st && t > nextWork && speed > 0) { nextWork = t + 0.18; workSounds(st); }
    // Etapa 10: a bicharada do curral (o galo canta de madrugada)
    if (st && st.campo && st.campo.bichos.length && t > nextFarm && speed > 0 && !busy) farmSounds(st, t, dawn);
  }
  const WORK_SFX = { madeira: ['machado', 0.75], pedra: ['pedra', 0.6], construir: ['martelo', 0.55], oficio: ['lasca', 0.9], argila: ['cavar', 1.1], agua: ['agua', 1.6], frutas: ['colher', 1.1], pesca: ['agua', 4.5], conservar: ['colher', 1.5],
    caminho: ['cavar', 0.9], tabuas: ['serra', 0.9], tecido: ['tear', 0.8], cerca: ['martelo', 0.7], plant: ['enxada', 0.9], weed: ['enxada', 0.7], harvest: ['colher', 1],
    mina: ['picareta', 0.8], forja: ['bigorna', 0.7] };   // Etapa 12
  const workAt = new Map();
  function workSounds(st) {
    let n = 0;
    const now = T();
    for (const p of st.people) {
      if (!p.alive || !p.act || n >= 3) continue;
      const a = p.act;
      let ws = WORK_SFX[a.type === 'oficio' && a.make === 'tabuas' ? 'tabuas' : a.type === 'oficio' && (a.make === 'mantas' || a.make === 'redes') ? 'tecido' :
        a.type === 'oficio' && (a.make === 'ferro' || a.make === 'joias' || a.make === 'joiasOuro') ? 'forja' : a.type];
      if (a.type === 'madeira' && G.Tech && G.Tech.known(st, 'machado')) ws = ['machado', 0.5];   // com o machado, golpes mais rápidos
      const field = a.type === 'roca' && WORK_SFX[a.stage];   // Etapa 10: a roça tem o som de cada etapa
      if (field) ws = field;
      if (!ws || !(a.stage === 'work' || a.stage === 'build' || field)) continue;
      if (now < (workAt.get(p.id) || 0)) continue;
      workAt.set(p.id, now + ws[1] * (0.85 + Math.random() * 0.3));
      A.sfx(ws[0], p.x, p.y, 0.7);
      n++;
    }
  }

  // os bichos do curral perto da câmera: um de cada vez, de tempos em tempos; o galo, de madrugada
  const FARM_SFX = { galinha: 'galinha', porco: 'porco', ovelha: 'ovelha', gado: 'vaca' };
  function farmSounds(st, t, dawn) {
    nextFarm = t + 4 + Math.random() * 8;
    const cam = G.R.cam, TS = G.CFG.TILE, cx = cam.x / TS, cy = cam.y / TS;
    const near = st.campo.bichos.filter((a) => Math.abs(a.x - cx) < 16 && Math.abs(a.y - cy) < 12);
    if (!near.length) return;
    const rooster = dawn && near.find((a) => a.sp === 'galinha' && a.sex === 'M');
    if (rooster) { A.sfx('galo', rooster.x, rooster.y, 0.8); return; }
    if (st.ck.hour < 6 || st.ck.hour >= 20) return;   // de noite o curral dorme
    const a = near[Math.floor(Math.random() * near.length)], k = FARM_SFX[a.sp];
    if (k) A.sfx(k, a.x, a.y, 0.6);
  }

  // ---------- música ----------
  const MOODS = {
    dia: { root: 62, scale: [0, 2, 4, 7, 9], bpm: 84, lead: 'pluck', pad: true, bass: true, prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], vol: 0.8, rest: [10, 22] },
    tarde: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 72, lead: 'flute', pad: true, bass: true, prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], vol: 0.7, rest: [12, 26] },
    noite: { root: 57, scale: [0, 3, 5, 7, 10], bpm: 60, lead: 'bell', pad: true, bass: false, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], vol: 0.6, rest: [14, 30] },
    inverno: { root: 52, scale: [0, 3, 5, 7, 10], bpm: 56, lead: 'bell', pad: true, bass: false, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [0, 3, 7]], vol: 0.6, rest: [16, 34] },
    perigo: { root: 50, scale: [0, 1, 5, 7, 8], bpm: 96, lead: 'pluck', pad: false, bass: true, drums: 'taiko', prog: [[0, 7, 12], [1, 8, 13], [0, 7, 12], [-2, 5, 10]], vol: 0.75, rest: [0, 0] },
    festa: { root: 55, scale: [0, 2, 4, 7, 9], bpm: 116, lead: 'flute', pad: false, bass: true, drums: 'festa', prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], vol: 0.85, rest: [0, 0] },
    historia: { root: 57, scale: [0, 2, 3, 7, 9], bpm: 58, lead: 'flute', pad: true, bass: false, drone: true, prog: [[0, 7, 12], [0, 7, 12], [-2, 5, 10], [0, 7, 12]], vol: 0.5, rest: [0, 0] },
    // Etapa 8: noite de flauta ao pé do fogo
    flauta: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 66, lead: 'flute', pad: true, bass: false, prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [0, 4, 7]], vol: 0.62, rest: [0, 0] },
  };
  // a flauta e o tambor só entram na música depois de inventados (Etapa 8): antes, a melodia é cantarolada e a festa é na palma
  const knows = (id) => !!(S && G.Tech && G.Tech.known(S, id));
  const leadOf = (m) => (m.lead === 'flute' && !knows('flauta') ? 'hum' : m.lead);
  const mus = { mood: 'dia', next: 0, bar: 0, beat: 0, phrase: 0, motif: null, restUntil: 0, want: 'dia', gain: null, drone: null };
  function wantMood(st) {
    if (!st || mode !== 'game') return 'dia';
    const Nr = G.Narr, l = st.life;
    if (l && l.party && l.party.on) return 'festa';
    if ((Nr && (Nr.beastsOut(st) || Nr.is(st, 'nevasca'))) || st.people.some((p) => p.alive && p.labor && p.labor.hard && !p.labor.helped)) return 'perigo';
    if (l && l.story && l.story.on) return l.story.music ? 'flauta' : 'historia';
    const h = st.ck.hour;
    if (h >= 20 || h < 5) return 'noite';
    if (st.ck.season === 3) return 'inverno';
    if (h >= 16) return 'tarde';
    return 'dia';
  }
  function scaleNote(m, deg, oct) {
    const sc = m.scale, n = sc.length;
    const o = Math.floor(deg / n), d = ((deg % n) + n) % n;
    return m.root + 12 * (o + (oct || 0)) + sc[d];
  }
  function newMotif() {
    // 2 compassos de 8 colcheias: passos pequenos, notas que descansam
    const rhythm = [[1, 0, 1, 0, 1, 1, 0, 0], [1, 0, 0, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 0, 1, 0], [1, 0, 1, 1, 0, 0, 0, 0]];
    let deg = Math.floor(Math.random() * 3) + 2;
    const notes = [];
    for (let b = 0; b < 2; b++) {
      const r = rhythm[Math.floor(Math.random() * rhythm.length)];
      for (let i = 0; i < 8; i++) {
        if (!r[i]) { notes.push(null); continue; }
        deg += [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
        deg = Math.max(0, Math.min(8, deg));
        notes.push(deg);
      }
    }
    return notes;
  }
  function musicTick() {
    const t = T();
    mus.want = wantMood(S);
    const urgent = mus.want === 'perigo' || mus.want === 'festa';
    // troca de humor: na virada da frase (perigo e festa entram logo)
    if (mus.want !== mus.mood && (urgent || mus.beat === 0 || t < mus.restUntil)) {
      mus.mood = mus.want; mus.bar = 0; mus.beat = 0; mus.phrase = 0; mus.motif = null;
      if (t < mus.restUntil && urgent) mus.restUntil = 0;
      if (mus.next < t) mus.next = t + 0.1;
    }
    const m = MOODS[mus.mood];
    if (!mus.gain) { mus.gain = ctx.createGain(); mus.gain.connect(bus.music); mus.gain.gain.value = 0; }
    mus.gain.gain.setTargetAtTime(m.vol, t, 1.2);
    if (t < mus.restUntil) { droneOff(); return; }
    if (m.drone) droneOn(m); else droneOff();
    const spb = 60 / m.bpm / 2;   // colcheia
    if (mus.next < t - 0.5) mus.next = t + 0.05;
    while (mus.next < t + 0.3) {
      playStep(m, mus.next, spb);
      mus.next += spb * (mus.mood === 'festa' || mus.mood === 'perigo' ? 1 : (mus.beat % 2 ? 0.94 : 1.06));   // um balanço de leve
      mus.beat = (mus.beat + 1) % 16;
      if (mus.beat === 0) {
        mus.bar += 2;
        if (mus.bar % 8 === 0) {
          mus.phrase++;
          mus.motif = Math.random() < 0.35 ? null : mus.motif;
          // descansa entre as frases (menos na festa e no perigo)
          if (m.rest[1] > 0 && mus.phrase >= 2 + Math.floor(Math.random() * 2)) {
            mus.phrase = 0;
            mus.restUntil = mus.next + m.rest[0] + Math.random() * (m.rest[1] - m.rest[0]);
            break;
          }
        }
      }
    }
  }
  function playStep(m, t, spb) {
    const o = out(mus.gain, 0, 0.35);
    const chord = m.prog[Math.floor(mus.bar / 2) % m.prog.length];
    const b = mus.beat;
    if (!mus.motif) mus.motif = newMotif();
    // acorde de fundo no começo de cada compasso
    if (m.pad && b % 8 === 0) pad(chord.map((x) => hz(m.root - 12 + x)), t, spb * 8 * 0.95, 0.07, o, 700);
    if (m.bass && b % 4 === 0) {
      const f = hz(m.root - 24 + chord[0] + (b % 8 === 4 && m.bpm > 80 ? 7 : 0));
      tone('sine', f, t, 0.01, spb * 3, 0.16, o); tone('triangle', f, t, 0.01, spb * 2, 0.05, o);
    }
    // melodia: o motivo, subindo ou descendo um pouco a cada frase
    const deg = mus.motif[b];
    if (deg !== null && deg !== undefined && Math.random() < 0.92) {
      const shift = [0, 0, 1, -1][mus.phrase % 4] + (mus.bar % 8 >= 4 ? 1 : 0);
      const f = hz(scaleNote(m, deg + shift, m.lead === 'bell' ? 1 : 0));
      const ld = leadOf(m);
      if (ld === 'pluck') pluck(f, t, spb * 2.2, 0.12, o);
      else if (ld === 'bell') bell(f, t, 0.06, o, spb * 6);
      else if (ld === 'hum') hum(f, t, spb * 1.6, 0.07, o);
      else flute(f, t, spb * 1.6, 0.075, o);
    }
    // batuque
    if (m.drums === 'festa' && knows('tambor')) {
      if (b % 4 === 0) drum('bumbo', t, 0.9, o);
      if (b % 4 === 2) drum('tapa', t, 0.8, o);
      if (b % 2 === 1) drum('chocalho', t, 0.8, o);
      if (b === 0 && mus.bar % 4 === 0) drum('taiko', t, 0.55, o);
      if (b === 14 || b === 15) drum('tapa', t, 0.55, o);   // virada no fim do compasso
    } else if (m.drums === 'festa') {
      if (b % 4 === 2) drum('palma', t, 0.9, o);   // sem tambor: palmas e chocalho
      if (b % 2 === 1) drum('chocalho', t, 0.7, o);
    } else if (m.drums === 'taiko') {
      if (b % 8 === 0 || b % 8 === 3) drum('taiko', t, 0.7, o);
      if (b % 2 === 1) drum('chocalho', t, 0.4, o);
    }
  }
  function droneOn(m) {
    if (mus.drone) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(mus.gain);
    const oscs = [0, 7].map((x, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m.root - 24 + x); o.detune.value = i ? 4 : -4; return o; });
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380; fl.connect(g);
    for (const o of oscs) { o.connect(fl); o.start(); }
    g.gain.setTargetAtTime(0.05, T(), 1.5);
    mus.drone = { g, oscs };
  }
  function droneOff() {
    if (!mus.drone) return;
    const d = mus.drone; mus.drone = null;
    d.g.gain.setTargetAtTime(0, T(), 0.6);
    setTimeout(() => { for (const o of d.oscs) { try { o.stop(); } catch (e) { /* já parou */ } } }, 3000);
  }

  // ---------- laço (a cada 100 ms, fora do quadro de desenho) ----------
  function loop() {
    setInterval(() => {
      if (!ctx || hidden || ctx.state !== 'running') return;
      try { ambient(S, T()); musicTick(); } catch (e) { /* som nunca derruba o jogo */ }
    }, 100);
  }
  // o jogo avisa o estado a cada quadro
  A.frame = function (state, m, spd) { S = state; mode = m; speed = spd; };

  // ---------- teste: cada efeito gera som de verdade (roda num OfflineAudioContext) ----------
  A.selfTest = async function () {
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!OAC) return { ok: false, err: 'sem OfflineAudioContext' };
    const res = {};
    const saved = { ctx, master, comp, bus, verb, noiseBuf, voices };
    for (const name of Object.keys(SFX)) {
      const oc = new OAC(2, 44100 * 5, 44100);
      ctx = oc; bus = {}; build(oc);
      master.gain.value = 1; bus.sfx.gain.value = 1;
      SFX[name](0.05, out(bus.sfx, 0.3, 0.2), 1);
      const buf = await oc.startRendering();
      let peak = 0, sum = 0, bad = false;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad = true; const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
      }
      res[name] = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / (buf.length * buf.numberOfChannels)).toFixed(4), bad };
    }
    // música: cada humor, antes e depois da flauta e do tambor (Etapa 8)
    const savedS = S, savedMus = Object.assign({}, mus);
    for (const inv of [false, true]) for (const mood of Object.keys(MOODS)) {
      const oc = new OAC(2, 44100 * 4, 44100);
      ctx = oc; bus = {}; build(oc);
      master.gain.value = 1; bus.music.gain.value = 1;
      S = { tech: { known: inv ? { flauta: 1, tambor: 1 } : {} } };
      mus.gain = oc.createGain(); mus.gain.connect(bus.music); mus.gain.gain.value = 1;
      Object.assign(mus, { mood, bar: 0, beat: 0, phrase: 0, motif: null });
      const m = MOODS[mood], spb = 60 / m.bpm / 2;
      for (let i = 0; i < 16; i++) { playStep(m, 0.05 + i * spb, spb); mus.beat = (mus.beat + 1) % 16; }
      const buf = await oc.startRendering();
      let peak = 0, bad = false;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { if (!isFinite(d[i])) bad = true; peak = Math.max(peak, Math.abs(d[i])); } }
      res['musica:' + mood + (inv ? '+flauta+tambor' : '')] = { peak: +peak.toFixed(3), bad };
    }
    S = savedS; Object.assign(mus, savedMus);
    ({ ctx, master, comp, bus, verb, noiseBuf, voices } = saved);
    return { ok: true, res };
  };
  A.names = () => Object.keys(SFX);
  A.state = () => ({ ctx: ctx ? ctx.state : 'nenhum', mood: mus.mood, want: mus.want, voices, pref: Object.assign({}, pref) });
})(globalThis.G = globalThis.G || {});
