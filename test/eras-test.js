// Gods · testes das Etapas 19 e 20 (Eras). Uso: node test/eras-test.js [anos | u] [sementes]
// 1) unidades: a passagem de idade (o que falta, a Crônica), o rumo de cada povo (reino, conselho, guildas, clãs,
//    assembleia) e o que ele muda, a magia do conselho (runas, ervas, círculos, e a idade passando sem metal), os
//    desafios (praga, guerra com a muralha ou sem, fome da cidade, sucessão) e o save
// 2) 20 anos em três mundos (a regra do GDD), a partir de uma aldeia que já sabe o básico
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Soc: So, Eras: E, Povos: Pv } = G;
const DAYM = 1440, Y = 60 * DAYM;
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
function aldeia(seed, n, kind) {
  const w = W.generate(seed, 192), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9; S.arrived = true; S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) {
    const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', 'Gente' + k, 25); q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; S.people.push(q);
    F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); if (kind) Pv.make(S, q, kind); So.indole(S, q);
  }
  if (kind) for (const p of S.people.slice(0, 2)) Pv.make(S, p, kind);
  Pv.recount(S);
  for (const id of ['pedra', 'cestos', 'lanca', 'corda', 'ceramica', 'roca']) S.tech.known[id] = S.tech.known[id] || { t: S.t, by: 'teste', how: 'pratica' };
  Object.assign(S.stock, { madeira: 300, pedra: 300, tabuas: 200, argila: 100, fibra: 60, peixe: 600, frutas: 200, agua: 30 });
  Sim.refresh(S);
  return S;
}
const dia = (S) => { S.t += DAYM; S.ck = Sim.clock(S.t); Sim.refresh(S); E.daily(S); };

if (isMainThread && (process.argv[2] === 'u' || !process.argv[2])) {
  {
    const S = aldeia(42, 14);
    check('o mundo começa na Idade da Pedra Lascada', E.idade(S) === 0 && E.info(S).idade === 'Idade da Pedra Lascada');
    check('o que falta para a próxima: a obra-marco (o forno)', /forno/.test(E.faltaWhy(S)), E.faltaWhy(S));
    const r0 = S.rng.s; dia(S);
    check('na pedra lascada, as Eras não gastam o sorteio do mundo', S.rng.s === r0);
    build(S, 'forno', 3);
    dia(S);
    check('com a cerâmica, a roça, 12 pessoas e o forno, passa para a Pedra Polida, e a Crônica conta', E.idade(S) === 1 && S.chron.some((c) => /Pedra Polida/.test(c.text)));
    dia(S);
    check('aldeia de humanos toma o rumo do reino de leis escritas', E.ordem(S) === 'reino' && E.crimeMult(S) < 1 && E.trocaMult(S) > 1, E.ordem(S));
    check('o bronze pede a mineração e 25 pessoas', /minera/.test(E.faltaWhy(S)) && /25 pessoas/.test(E.faltaWhy(S)), E.faltaWhy(S));
    // a praga
    const roca = build(S, 'roca', 4);
    const f = K.farmOf ? K.farmOf(roca) : (roca.farm = { st: 'crescendo', lost: 0 });
    f.st = 'crescendo'; f.lost = 0;
    const rng = S.rng.next; S.rng.next = () => 0;
    dia(S);
    S.rng.next = rng;
    check('a praga da pedra polida come metade da roça', f.lost >= 0.5 && S.stats.pragas === 1);
    // a guerra (no bronze) e a muralha
    S.eras.idade = 2;
    S.soc.vila = { nome: 'Pedra Alta', art: 'a', x: 1, y: 1, t0: S.t, bem: 60, laco: -30, filhos: [], n: 4, mortes: 0, fim: 0 };
    const comida0 = S.stock.peixe;
    S.rng.next = () => 0;
    dia(S);
    S.rng.next = rng;
    check('na Idade do Bronze, a vila de fora que não gosta de nós ataca e leva comida', S.stats.guerras === 1 && S.stock.peixe < comida0 && S.chron.some((c) => /Guerra/.test(c.text)));
    // sucessão nos reinos
    S.eras.idade = 4;
    So.eleger(S, true);
    const L0 = So.lider(S);
    if (L0) { E.onDeath(S, L0); }
    check('nos reinos, a morte do líder abre a briga pela sucessão', !!L0 && S.stats.sucessoes === 1);
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check('o save guarda a idade e o rumo', S2.eras.idade === 4 && S2.eras.ordem === 'reino');
  }
  {
    // o conselho das elfas: matriarcado e magia no lugar do metal
    const S = aldeia(777, 26, 'elfo');
    build(S, 'forno', 3);
    dia(S); dia(S);
    check('aldeia de elfos toma o rumo do conselho das mais velhas', E.ordem(S) === 'conselho', E.ordem(S) + ' · ' + JSON.stringify(S.povos.n));
    So.eleger(S, true);
    const L0 = So.lider(S);
    check('no conselho, quem fala por todos é mulher', !!L0 && L0.sex === 'F');
    for (let k = 0; k < 12; k++) dia(S);
    check('o conselho aprende as runas: a casa aquece', E.temMagia(S, 'runas') && E.calorCasa(S) === C.RUNAS_HEAT);
    build(S, 'mina', 3) || build(S, 'estatua', 3);
    S.buildings.push({ id: 9999, type: 'estatua', built: true, x: 0, y: 0, w: 2, h: 2, lv: 1, beds: [], have: {} });
    for (let k = 0; k < 3; k++) dia(S);
    check('com as runas, o conselho chega ao Bronze sem mineração', E.idade(S) >= 2 && !T.known(S, 'mineracao'), E.idade(S) + ' · ' + E.faltaWhy(S));
    for (let k = 0; k < 12; k++) dia(S);
    check('e depois as ervas: a febre pesa menos', E.temMagia(S, 'ervas') && E.febreMult(S) < 1);
  }
  {
    // guildas, clãs, assembleia
    const Sa = aldeia(9001, 14, 'anao'); build(Sa, 'forno', 3); dia(Sa); dia(Sa);
    check('aldeia de anões: guildas, e todos aprendem mais depressa', E.ordem(Sa) === 'guildas' && E.xp(Sa) > 1, E.ordem(Sa));
    const Sf = aldeia(5, 14, 'fera'); build(Sf, 'forno', 3); dia(Sf); dia(Sf);
    check('aldeia do povo-fera: clãs, e a caça rende mais', E.ordem(Sf) === 'clas' && E.cacaMult(Sf) > 1, E.ordem(Sf));
    const Sm = aldeia(11, 14);
    for (const p of Sm.people.slice(0, 7)) Pv.make(Sm, p, 'elfo');
    Pv.recount(Sm); build(Sm, 'forno', 3); dia(Sm); dia(Sm);
    check('aldeia bem misturada: assembleia, e o descontentamento cresce menos', E.ordem(Sm) === 'assembleia' && E.descMult(Sm) < 1, E.ordem(Sm));
  }
  console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exit(bad ? 1 : 0);
}

// ===================== 20 anos =====================
function longRun(seed, years) {
  const S = aldeia(seed, 24);
  S.narr.nextBad = S.t + 20 * DAYM; S.narr.nextGood = S.t + 10 * DAYM; S.narr.auto = 'acolher';
  So.setModo(S, 'decide');
  const place = (t, from) => { const at = spot(S, t, from); return at ? Sim.placeBlueprint(S, t, at.x, at.y) : null; };
  const out = { seed, errors: [], idades: [] };
  const t0 = Date.now();
  let hungry = 0, hrs = 0, idade = 0;
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const pend = () => S.buildings.some((b) => (!b.built && !b.site && !C.BUILD[b.type].grande) || b.up);
        if (!pend() && F.bedsTotal(S) < F.bedsNeeded(S) + 1 && S.stock.madeira >= 14) place('barraca', 3);
        for (const t of ['forno', 'marcenaria', 'mina', 'ferraria', 'armazem']) if (!pend() && T.buildOpen(S, t) && !S.buildings.some((b) => b.type === t) && S.ctx.foodDays > 5) place(t, 3);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 30 ? 2 : 1;
        if (T.known(S, 'mineracao')) S.vontades.mina = 2;
        if (K.known(S, 'roca')) { S.vontades.roca = 3; if (!pend() && S.buildings.filter((b) => b.type === 'roca').length < Math.max(2, Math.ceil(S.people.filter((p) => p.alive).length / 10))) place('roca', 4); }
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
      if (E.idade(S) > idade) { idade = E.idade(S); out.idades.push(E.IDADES[idade].curto + ' no ano ' + (Math.floor(d / 60) + 1)); }
    }
  } catch (e) { out.errors.push(String(e.stack || e)); }
  const st = S.stats;
  Object.assign(out, { alive: S.people.filter((p) => p.alive).length, over: !!S.over, sec: (Date.now() - t0) / 1000, hungry: Math.round(hungry / Math.max(1, hrs) * 100),
    idade: E.info(S).idade, ordem: E.info(S).ordem, falta: E.faltaWhy(S), pragas: st.pragas, guerras: st.guerras, fomes: st.fomesCidade, sucessoes: st.sucessoes, save: JSON.stringify(Save.serialize(S)).length });
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
    console.log('\n' + YEARS + ' anos de Eras (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of res) {
      const tag = 'mundo ' + r.seed + ': ';
      if (r.errors && r.errors.length) { check(tag + 'sem erro', false, r.errors[0]); continue; }
      console.log('\nmundo ' + r.seed + ' · ' + r.sec.toFixed(0) + ' s · ' + r.alive + ' vivos · fome ' + r.hungry + '% · ' + r.idade + ' · ' + (r.ordem || 'sem rumo'));
      console.log('  passagens: ' + (r.idades.join(', ') || 'nenhuma') + ' · para a próxima: ' + r.falta + ' · pragas ' + r.pragas + ' · guerras ' + r.guerras + ' · fomes da cidade ' + r.fomes + ' · sucessões ' + r.sucessoes + ' · save ' + r.save);
      check(tag + 'a aldeia chega ao fim dos ' + YEARS + ' anos', r.alive >= 4 && !r.over, r.alive + ' vivos');
      check(tag + 'fome rara (menos de 5% do povo, em média)', r.hungry < 5, r.hungry + '%');
      if (YEARS >= 20) check(tag + 'a aldeia passa de idade pelo menos uma vez', r.idades.length >= 1, r.idades.join(', '));
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  }
} else if (!isMainThread) {
  parentPort.postMessage(longRun(workerData.seed, workerData.years));
}
