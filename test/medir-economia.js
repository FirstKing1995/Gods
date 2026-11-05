// Gods · mede a economia ao longo dos anos: o estoque de cada recurso, o Poder, a glória e o nível de Deus, e o povo.
// Uso: node test/medir-economia.js [anos] [semente]. Roda uma vila de 30 que o "jogador" deixa decidir as obras e que
// atende as orações (como o teste de 20 anos da cidade), e imprime uma linha por ano.
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Family: F, God, Tech: T, Life: L, Campo: K, Deus: D, Povos: Pv, Minas: Mi, Soc: So } = G;
const DAYM = 1440, ANOS = +process.argv[2] || 8, SEED = +process.argv[3] || 42;

function spot(S, t, from) {
  for (let r = from || 2; r < 60; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (!Sim.canPlace(S, t, S.camp.x + dx, S.camp.y + dy)) return { x: S.camp.x + dx, y: S.camp.y + dy };
  }
  return null;
}
function build(S, t, from) { const at = spot(S, t, from); if (!at) return null; const b = Sim.placeBlueprint(S, t, at.x, at.y); Sim.complete(S, b); if (t === 'fogueira') b.fuel = 8; Sim.refresh(S); return b; }
function add(S, sex, age) {
  const q = Sim.makePerson(S, sex, null, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = F.age(S, q);
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); Mi.init(S);
  Pv.recount(S); q.fe = 60; So.indole(S, q);
}
const w = W.generate(SEED, C.MAP), S = Sim.newGame(SEED, W.bestSite(w), ['Iara', 'Aruã'], w);
S.stats.firstFire = true; S.arrived = true;
for (let k = 0; k < 28; k++) add(S, k % 2 ? 'M' : 'F', 20 + (k * 7) % 25);
build(S, 'fogueira');
for (let k = 0; k < 9; k++) build(S, 'barraca', 3);
S.narr.auto = 'acolher';
So.setModo(S, 'decide');
const RES = ['madeira', 'pedra', 'peixe', 'frutas', 'carne', 'defumado', 'argila', 'tabuas', 'fibra', 'feijao', 'milho', 'mandioca', 'minerio', 'ferro'];
let glory0 = 0;
const t0 = Date.now();
console.log('ano · vivos · nível Deus · Poder · glória · ganho/h · ' + RES.join(' '));
for (let d = 0; d < ANOS * C.YEAR_DAYS && !S.over; d++) {
  if (d % 3 === 0) {
    Object.assign(S.vontades, { madeira: 2, pesca: 3, frutas: 3, construir: 3, pedra: 2 });
    if (K.known(S, 'roca')) S.vontades.roca = 3;
    let q; while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer[0]); }
  }
  for (let s = 0; s < 720 && !S.over; s++) {
    Sim.step(S, 2);
    if (s % 30 === 0) for (const p of S.people) if (p.alive && p.prayer) { const kind = God.PRAYER_HELP[p.prayer.kind]; if (kind && kind !== 'raio' && !God.canCast(S, kind)) God.cast(S, kind, Math.floor(p.x), Math.floor(p.y)); }
    S.events.length = 0;
  }
  if ((d + 1) % C.YEAR_DAYS === 0) {
    const g = S.god, viv = S.people.filter((p) => p.alive), soma = viv.reduce((a, p) => a + p.fe / 100, 0);
    console.log(`${(d + 1) / C.YEAR_DAYS} · ${viv.length} · ${D.level(S)} · ${Math.round(g.poder)} · ${Math.round(g.glory || 0)} · ${(soma * C.POWER_PER_FAITH_H).toFixed(1)} · ` + RES.map((k) => Math.round(S.stock[k] || 0)).join(' '));
  }
}
console.log('(' + Math.round((Date.now() - t0) / 1000) + ' s)');
