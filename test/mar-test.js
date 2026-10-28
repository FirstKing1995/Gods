// Gods · testes da Etapa 18 (Barcos e outras terras). Uso: node test/mar-test.js [anos | u] [sementes]
// 1) unidades: os três barcos (onde vão, o que pedem), a pesca da canoa e do barco, a carga do barco, a expedição
//    (quem vai, a comida, o navio que some do porto), a volta (com terra nova, povo do mar e carga; com perdidos; o
//    navio que não volta), a colônia (fundar, a vida resumida, o navio que traz notícia e carga) e o save
// 2) 20 anos em três mundos (a regra do GDD), com expedições e colônia
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Soc: So, Mar: Mr } = G;
const DAYM = 1440;
let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function spot(S, t, from, max) {
  for (let r = from || 2; r < (max || 80); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t, from) { const at = spot(S, t, from); if (!at) return null; const b = Sim.placeBlueprint(S, t, at.x, at.y); Sim.complete(S, b); Sim.refresh(S); return b; }
// uma aldeia de n adultos que já sabe fazer corda, com estoque farto
function aldeia(seed, n) {
  const w = W.generate(seed, 192), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9; S.arrived = true; S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', 'Gente' + k, 25); q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; S.people.push(q); F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); So.indole(S, q); }
  for (const id of ['pedra', 'cestos', 'corda']) S.tech.known[id] = S.tech.known[id] || { t: S.t, by: 'teste', how: 'pratica' };
  Object.assign(S.stock, { madeira: 300, tabuas: 200, fibra: 60, mantas: 20, ferro: 10, peixe: 400, frutas: 100, agua: 30 });
  build(S, 'marcenaria', 3);
  Sim.refresh(S);
  return S;
}

if (isMainThread && (process.argv[2] === 'u' || !process.argv[2])) {
  {
    const S = aldeia(42, 14);
    check('os três barcos pedem corda e vão na beira d\'água', ['canoa', 'barco', 'navio'].every((k) => C.BUILD[k].need === 'corda' && C.BUILD[k].env));
    check('o navio pede água funda por perto', C.BUILD.navio.env === 'mar');
    const ca = build(S, 'canoa', 2);
    check('a canoa vai na beira d\'água', !!ca);
    const p0 = Mr.pescaMult(S);
    const ba0 = S.stock.mantas, ba = build(S, 'barco', 2);
    check('o barco tira 2 mantas do estoque ao ser marcado (a vela)', !!ba && S.stock.mantas === ba0 - 2);
    check('a canoa pesca mais, e o barco mais ainda', p0 === C.CANOA_PESCA && Mr.pescaMult(S) === C.BARCO_PESCA);
    const at = spot(S, 'navio', 2);
    S.stock.mantas = 1;
    check('sem mantas no estoque, o navio não pode ser marcado', !!at && /mantas/.test(Sim.canPlace(S, 'navio', at.x, at.y)), at ? Sim.canPlace(S, 'navio', at.x, at.y) : 'sem lugar');
    S.stock.mantas = 20;
    const nv = build(S, 'navio', 2);
    check('o navio vai onde há água funda', !!nv && S.stock.ferro === 6, nv ? 'ferro ' + S.stock.ferro : 'sem lugar');
    // o barco leva carga até a vila de fora (sem mercado)
    S.soc.vila = { nome: 'Pedra Alta', art: 'a', x: 1, y: 1, t0: S.t, bem: 60, laco: 10, filhos: [], n: 4, mortes: 0, fim: 0 };
    S.stock.couro = 0;
    S.t = Math.ceil(S.t / (7 * DAYM)) * 7 * DAYM + 9 * 60; S.ck = Sim.clock(S.t);
    Mr.daily(S);
    check('o barco leva carga até a vila de fora uma vez por semana', S.stats.cargas >= 1);
    check('a Crônica conta o primeiro barco de cada tipo', ['canoa', 'barco', 'navio'].every((k) => S.mar.first[k]));
    // a expedição
    const n0 = S.people.length, food0 = S.stock.peixe + S.stock.frutas;
    check('a expedição pede tripulação dentro do limite', /vão de/.test(Mr.partirWhy(S, 12, 30)));
    const r = Mr.partir(S, 5, 60);
    check('a expedição parte: 5 saem da aldeia, a comida vai junto e o navio some do porto', r.ok && S.people.length === n0 - 5 && S.stock.peixe + S.stock.frutas <= food0 - 60 && nv.mar === 1, r.why);
    check('quem foi continua com a sua história (fora da aldeia, achável pelo id)', r.gente.every((p) => So.away(S, p.id) === p));
    check('com o navio no mar, não sai outra', /no mar|navio/.test(Mr.partirWhy(S, 3, 30)));
    // a volta com terra nova: o sorteio cai no melhor caso
    const rng = S.rng.next; S.rng.next = () => 0.99;
    S.t = S.mar.viagem.volta + 1; S.ck = Sim.clock(S.t);
    const v1 = Mr.chegada(S);
    S.rng.next = rng;
    check('o navio volta com todos', v1.ok && S.people.length === n0 && nv.mar === 0);
    S.rng.next = () => 0.5;
    S.mar.viagem = { t0: S.t, volta: S.t, ids: r.gente.slice(0, 3).map((p) => p.id), comida: 60, nav: nv.id };
    for (const p of r.gente.slice(0, 3)) { So.sair(S, p, 'mar'); p.away.vila = 0; }
    nv.mar = 1;
    const v2 = Mr.chegada(S);
    S.rng.next = rng;
    check('e acha terra além do mar, com regiões e, às vezes, um povo do mar', S.mar.terras.length >= 1 && S.mar.terras[0].mistura.length >= 1, JSON.stringify(S.mar.terras.map((t) => t.nome + ':' + t.mistura.join('/') + (t.povo ? ':' + t.povo.nome : ''))));
    check('a Crônica conta a terra achada e o que trouxeram', S.chron.some((x) => /Acharam terra|Voltaram a/.test(x.text)));
    // a colônia
    const t0 = S.mar.terras[0];
    check('dá para fundar colônia na terra achada', Mr.fundarWhy(S, t0.id) === '', Mr.fundarWhy(S, t0.id));
    const nAntes = S.people.length, fc = Mr.fundar(S, t0.id);
    check('a colônia leva ' + C.COLONIA_GENTE + ' pessoas e a comida', fc.ok && S.people.length === nAntes - C.COLONIA_GENTE && S.mar.colonias.length === 1);
    check('não se funda duas na mesma terra', /já há/.test(Mr.fundarWhy(S, t0.id)));
    const st0 = JSON.stringify(S.stock);
    for (let d = 0; d < C.SEASON_DAYS + 1; d++) { S.t += DAYM; S.ck = Sim.clock(S.t); Mr.daily(S); }
    check('a cada estação, o navio volta da colônia com notícia e carga', S.chron.some((x) => /voltou de Nova/.test(x.text)) && JSON.stringify(S.stock) !== st0);
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check('o save guarda as terras, a colônia e quem foi', S2.mar.terras.length === S.mar.terras.length && S2.mar.colonias[0].nome === S.mar.colonias[0].nome);
  }
  {
    // o navio que não volta
    const S = aldeia(777, 14);
    const nv = build(S, 'navio', 2);
    if (nv) {
      const r = Mr.partir(S, 4, 30);
      const rng = S.rng.next; S.rng.next = () => 0.0;
      S.t = S.mar.viagem.volta + 1; S.ck = Sim.clock(S.t);
      const v = Mr.chegada(S);
      S.rng.next = rng;
      check('às vezes o navio não volta: a tripulação fica no mar e o navio se perde', v.perdido && r.gente.every((p) => p.morto) && !S.buildings.some((b) => b.type === 'navio'));
      check('e a Crônica conta', S.chron.some((x) => /navio não voltou/.test(x.text)));
    } else check('o mundo 777 tem lugar para navio perto do acampamento', false);
  }
  console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exit(bad ? 1 : 0);
}

// ===================== 20 anos =====================
function longRun(seed, years) {
  const S = aldeia(seed, 16);
  S.narr.nextBad = S.t + 20 * DAYM; S.narr.nextGood = S.t + 10 * DAYM; S.narr.auto = 'acolher';
  So.setModo(S, 'decide');
  const place = (t, from) => { const at = spot(S, t, from); return at ? Sim.placeBlueprint(S, t, at.x, at.y) : null; };
  const out = { seed, errors: [] };
  const t0 = Date.now();
  let hungry = 0, hrs = 0;
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const pend = () => S.buildings.some((b) => (!b.built && !b.site) || b.up);
        if (!pend() && F.bedsTotal(S) < F.bedsNeeded(S) + 1 && S.stock.madeira >= 14) place('barraca', 3);
        // o jogador junta o pano e o ferro do navio (no jogo, vêm da tecelagem e da ferraria)
        if (!S.buildings.some((b) => b.type === 'navio') && S.buildings.some((b) => b.type === 'barco' && b.built)) { S.stock.mantas = Math.max(S.stock.mantas || 0, 6); S.stock.ferro = Math.max(S.stock.ferro || 0, 4); }
        for (const t of ['canoa', 'barco', 'navio']) if (!pend() && T.buildOpen(S, t) && !S.buildings.some((b) => b.type === t) && S.ctx.foodDays > 5 && (!C.BUILD[t].extra || Object.keys(C.BUILD[t].extra).every((k) => (S.stock[k] || 0) >= C.BUILD[t].extra[k]))) place(t, 2);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (K.known(S, 'roca')) { S.vontades.roca = 3; if (!pend() && S.buildings.filter((b) => b.type === 'roca').length < Math.max(2, Math.ceil(S.people.filter((p) => p.alive).length / 10))) place('roca', 4); }
        // o jogador manda uma expedição por ano e funda colônia na primeira terra achada
        if (S.ck.season === 0 && !S.mar.viagem && Mr.navioLivre(S) && S.ctx.foodDays > 6) {
          const t = S.mar.terras.find((x) => !Mr.fundarWhy(S, x.id));
          if (t && !S.mar.colonias.length) Mr.fundar(S, t.id); else if (!Mr.partirWhy(S, 5, 60)) Mr.partir(S, 5, 60);
        }
        let q; while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer[0]); }
        const sp = So.pending(S); if (sp && sp.k === 'diss') So.dissResp(S, 'ir');
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        if (s % 30 === 0) {
          for (const p of S.people) if (p.alive && p.prayer) { const kind = God.PRAYER_HELP[p.prayer.kind]; if (kind && kind !== 'raio' && !God.canCast(S, kind)) God.cast(S, kind, Math.floor(p.x), Math.floor(p.y)); }
          hrs++; const vv = S.people.filter((p) => p.alive); hungry += vv.filter((p) => p.needs.fome < 15).length / Math.max(1, vv.length);
        }
        S.events.length = 0;
      }
    }
  } catch (e) { out.errors.push(String(e.stack || e)); }
  const st = S.stats;
  Object.assign(out, { alive: S.people.filter((p) => p.alive).length, over: !!S.over, sec: (Date.now() - t0) / 1000, hungry: Math.round(hungry / Math.max(1, hrs) * 100),
    barcos: ['canoa', 'barco', 'navio'].filter((k) => S.buildings.some((b) => b.type === k && b.built)).join(', '), viagens: st.viagens, naufragios: st.naufragios, perdidos: st.perdidosMar,
    terras: S.mar.terras.map((t) => t.nome + (t.povo ? ' (' + t.povo.nome + ')' : '')).join('; '), colonias: S.mar.colonias.map((c) => c.nome + ' ' + c.n).join('; '), cargas: st.cargas,
    save: JSON.stringify(Save.serialize(S)).length });
  return out;
}
if (isMainThread && process.argv[2] && process.argv[2] !== 'u') {
  const YEARS = +process.argv[2] || 20;
  const SEEDS = process.argv[3] ? process.argv[3].split(',').map(Number) : [42, 777, 9001];
  const res = [];
  let n = 0;
  const t0 = Date.now();
  for (const seed of SEEDS) {
    const wk = new Worker(__filename, { workerData: { seed, years: YEARS } });
    wk.on('message', (r) => { res.push(r); if (++n === SEEDS.length) fim(); });
    wk.on('error', (e) => { res.push({ seed, errors: [String(e.stack || e)] }); if (++n === SEEDS.length) fim(); });
  }
  function fim() {
    res.sort((a, b) => a.seed - b.seed);
    console.log('\n' + YEARS + ' anos com o mar (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of res) {
      const tag = 'mundo ' + r.seed + ': ';
      if (r.errors && r.errors.length) { check(tag + 'sem erro', false, r.errors[0]); continue; }
      console.log('\nmundo ' + r.seed + ' · ' + r.sec.toFixed(0) + ' s · ' + r.alive + ' vivos · fome ' + r.hungry + '% · barcos: ' + (r.barcos || 'nenhum'));
      console.log('  viagens ' + r.viagens + ' (naufrágios ' + r.naufragios + ', perdidos no mar ' + r.perdidos + ') · terras: ' + (r.terras || 'nenhuma') + ' · colônias: ' + (r.colonias || 'nenhuma') + ' · cargas ' + r.cargas + ' · save ' + r.save);
      check(tag + 'a aldeia chega ao fim dos ' + YEARS + ' anos', r.alive >= 4 && !r.over, r.alive + ' vivos');
      check(tag + 'fome rara (menos de 5% do povo, em média)', r.hungry < 5, r.hungry + '%');
      check(tag + 'o save fica abaixo de 1 MB', r.save < 1e6, r.save);
      if (YEARS >= 20) check(tag + 'o povo faz barcos e manda expedições', r.viagens >= 2, r.viagens + ' viagens');
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  }
} else if (!isMainThread) {
  parentPort.postMessage(longRun(workerData.seed, workerData.years));
}
