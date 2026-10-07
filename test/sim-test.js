// Testes de balanceamento: roda a simulação sem navegador.
// Uso: node test/sim-test.js [seed...]
const path = require('path');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'save']) require(path.join(__dirname, '..', 'js', f + '.js'));
const G = globalThis.G, C = G.CFG;

function worldStats(seed) {
  const t0 = Date.now();
  const w = G.W.generate(seed);
  const ms = Date.now() - t0;
  const cnt = new Array(9).fill(0);
  for (let i = 0; i < w.tile.length; i++) cnt[w.tile[i]]++;
  const objs = {};
  for (const o of w.objs) objs[o.k + (o.sp ? ':' + o.sp : '')] = (objs[o.k + (o.sp ? ':' + o.sp : '')] || 0) + 1;
  const pct = cnt.map((c, i) => G.TNAME[i] + ' ' + (100 * c / w.tile.length).toFixed(1) + '%').join(' | ');
  return { ms, pct, objs, w };
}

function findSpot(S, type, near) {
  const d = C.BUILD[type];
  for (let r = 2; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = near.x + dx, y = near.y + dy;
      if (!G.Sim.canPlace(S, type, x, y)) return { x, y };
    }
  }
  return null;
}

function run(seed, opts) {
  const w = G.W.generate(seed);
  const site = G.W.bestSite(w);
  const S = G.Sim.newGame(seed, site, null, w);
  const log = [];
  const act = {};
  let minHealth = 100, winterStock = null, fireB = null, tentB = null, hungryH = 0, coldH = 0;
  const t0 = Date.now();
  const days = opts.days || 62;
  for (let d = 0; d < days && !S.over; d++) {
    const ck = G.Sim.clock(S.t);
    if (opts.plan) opts.plan(S, ck, { findSpot, get fire() { return fireB; }, set fire(v) { fireB = v; }, get tent() { return tentB; }, set tent(v) { tentB = v; } });
    if (ck.day === 45 && !winterStock) winterStock = Object.assign({}, S.stock);
    let tmin = 99, tmax = -99;
    for (let s = 0; s < C.DAY_MIN / C.STEP_MIN && !S.over; s++) {
      G.Sim.step(S, C.STEP_MIN);
      if (S.temp < tmin) tmin = S.temp; if (S.temp > tmax) tmax = S.temp;
      for (const p of S.people) if (p.alive) {
        const k = p.act ? p.act.type : 'nada';
        act[k] = (act[k] || 0) + 1;
        if (p.needs.saude < minHealth) minHealth = p.needs.saude;
        if (p.needs.fome < 20) hungryH += C.STEP_MIN / 60;
        if (p.needs.calor < 20) coldH += C.STEP_MIN / 60;
      }
      S.events.length = 0;
    }
    const c2 = G.Sim.clock(S.t);
    log.push({
      day: c2.day, season: C.SEASONS[c2.season], tmin: tmin.toFixed(0), tmax: tmax.toFixed(0),
      stock: Object.assign({}, S.stock),
      people: S.people.map((p) => p.alive ? `${p.name}[f${p.needs.fome | 0} s${p.needs.sede | 0} e${p.needs.energia | 0} c${p.needs.calor | 0} h${p.needs.saude | 0} m${p.mood}]` : `${p.name}†${p.cause}`).join(' '),
    });
  }
  const ms = Date.now() - t0;
  const total = Object.values(act).reduce((a, b) => a + b, 0);
  const actPct = Object.entries(act).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (100 * v / total).toFixed(1) + '%').join(', ');
  return { S, log, ms, minHealth, winterStock, actPct, site, hungryH, coldH };
}

// jogador competente: fogueira e barraca cedo, Vontades por estação
function goodPlan(S, ck, ref) {
  if (ck.day === 0 && !ref.fire) {
    const f = ref.findSpot(S, 'fogueira', { x: S.camp.x + 1, y: S.camp.y + 1 });
    ref.fire = f && G.Sim.placeBlueprint(S, 'fogueira', f.x, f.y);
    const t = ref.findSpot(S, 'barraca', { x: S.camp.x, y: S.camp.y });
    ref.tent = t && G.Sim.placeBlueprint(S, 'barraca', t.x, t.y);
  }
  if (ck.day === 15) Object.assign(S.vontades, { frutas: 3, madeira: 2, pedra: 1, pesca: 2 });
  if (ck.day === 25 && ref.tent && ref.tent.built) G.Sim.startUpgrade(S, ref.tent);
  if (ck.day === 30) Object.assign(S.vontades, { frutas: 3, madeira: 3, pedra: 2, pesca: 3 });
  if (ck.day === 45) Object.assign(S.vontades, { frutas: 1, madeira: 2, pedra: 1, pesca: 3 });
}
function fireOnlyPlan(S, ck, ref) {
  if (ck.day === 0 && !ref.fire) {
    const f = ref.findSpot(S, 'fogueira', { x: S.camp.x + 1, y: S.camp.y + 1 });
    ref.fire = f && G.Sim.placeBlueprint(S, 'fogueira', f.x, f.y);
  }
}

// fogueira e barraca, mas frutas e pesca no mínimo
function lowFoodPlan(S, ck, ref) {
  goodPlan(S, ck, ref);
  Object.assign(S.vontades, { frutas: 1, pesca: 1 });
}

const seeds = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
const list = seeds.length ? seeds : [1234, 777, 20260926, 42, 9001];
const verbose = !!process.env.V;

for (const seed of list) {
  const ws = worldStats(seed);
  console.log(`\n=== seed ${seed} · mundo em ${ws.ms} ms`);
  console.log(ws.pct);
  console.log(JSON.stringify(ws.objs));
  const scen = [['bom', goodPlan], ['só fogueira', fireOnlyPlan], ['pouca comida', lowFoodPlan], ['largado', null]];
  for (const [name, plan] of scen) {
    const r = run(seed, { plan, days: 62 });
    const alive = r.S.people.slice(0, 2).filter((p) => p.alive).length;
    const born = r.S.stats.births || 0;
    console.log(`-- ${name}: vivos ${alive}/2${born ? ' + ' + born + ' bebê' + (born > 1 ? 's' : '') : ''} · menor saúde ${r.minHealth.toFixed(0)} · horas com fome ${r.hungryH.toFixed(0)} · com frio ${r.coldH.toFixed(0)} · ${r.ms} ms p/ ${r.log.length} dias · local (${r.site.x},${r.site.y})`);
    console.log('   estoque no início do inverno:', JSON.stringify(r.winterStock), '· estragou no ano:', r.S.stats.rotted || 0);
    console.log('   atividades:', r.actPct);
    console.log('   crônica:', r.S.chron.map((c) => G.Sim.dateText(c.t) + ': ' + c.text).join(' / '));
    if (verbose) for (const l of r.log) console.log(`   d${l.day} ${l.season} ${l.tmin}..${l.tmax}°C ${JSON.stringify(l.stock)} ${l.people}`);
  }
}

// ida e volta do save
{
  const w = G.W.generate(555);
  const site = G.W.bestSite(w);
  const S = G.Sim.newGame(555, site, ['Iara', 'Aruã'], w);
  G.Sim.advance(S, 3 * C.DAY_MIN);
  const data = JSON.parse(JSON.stringify(G.Save.serialize(S)));
  const S2 = G.Save.deserialize(data);
  const same = S2.t === S.t && S2.stock.madeira === S.stock.madeira && S2.world.objs.filter((o) => o.k === 'stump').length === S.world.objs.filter((o) => o.k === 'stump').length;
  console.log('\nsave ida e volta:', same ? 'ok' : 'DIFERENTE', '· tamanho', JSON.stringify(data).length, 'bytes');
  G.Sim.advance(S2, C.DAY_MIN);
  console.log('continua depois de carregar:', S2.people.map((p) => p.name + ' ' + (p.act ? p.act.type : '-')).join(', '));
}
