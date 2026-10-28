// Gods · testes da Etapa 17 (Mundo grande). Uso: node test/regioes-test.js [anos | u] [sementes]
// 1) unidades: as seis regiões (em todo mundo novo, com tamanho razoável), o save de antes refaz o mundo igualzinho,
//    o que nasce em cada região, a madeira nobre, o sal e o ouro do veio, o sal que conserva, a serra fria e o sertão
//    quente, a roça do sertão, o mosquito, o caranguejo e a cabra, a ponte de pedra, a grande estátua, o mapa gigante
//    (quanto custa gerar e um dia de jogo) e o save
// 2) 20 anos em três mundos gigantes (a regra do GDD), com o jogador de sempre
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Povos: Pv, Minas: Mi, Soc: So, Cidade: Ci, Regioes: Rg, Fauna: Fa } = G;
const DAYM = 1440, REG = G.REG;
let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function newGame(seed, size) { const w = W.generate(seed, size); return Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w); }
const terra = (w) => { const c = new Array(7).fill(0); let n = 0; for (let i = 0; i < w.reg.length; i++) if (!G.IS_WATER[w.tile[i]]) { c[w.reg[i]]++; n++; } return c.map((x) => x / n); };
const acha = (w, f) => { for (let i = 0; i < w.W * w.H; i++) if (f(i)) return i; return -1; };

if (isMainThread && (process.argv[2] === 'u' || !process.argv[2])) {
  {
    for (const seed of [42, 777, 9001, 5]) {
      const w = W.generate(seed, 256), p = terra(w);
      check('mundo ' + seed + ': as seis regiões aparecem, nenhuma toma o mapa', p.slice(1).every((x) => x > 0.005) && p.every((x) => x < 0.5), p.map((x) => (x * 100).toFixed(0)).join(' · '));
    }
    const w = W.generate(42, 192);
    const tem = (k, f) => w.objs.some((o) => o.k !== 'gone' && f(o) && w.reg[o.y * w.W + o.x] === k);
    check('o jequitibá nasce na mata fechada', tem(REG.MATA, (o) => o.sp === 'nobre'));
    check('o mandacaru nasce no sertão', tem(REG.SERTAO, (o) => o.sp === 'cacto'));
    check('a salina nasce no litoral', tem(REG.LITORAL, (o) => o.sal));
    check('o veio de ouro nasce na serra alta', tem(REG.SERRA, (o) => o.ouro));
    check('o junco nasce no pântano, e a árvore de raiz no mangue', tem(REG.PANTANO, (o) => o.k === 'junco') && tem(REG.MANGUE, (o) => o.sp === 'mangue'));
    // o save de antes (sem gen) refaz o mundo como era: nem região nem chão mudam
    const S = newGame(42, 192);
    const d = Save.serialize(S); delete d.gen;
    const S1 = Save.deserialize(JSON.parse(JSON.stringify(d)));
    const w0 = W.generate(42, 192, 1);
    check('o save de antes refaz o mundo sem regiões, tile por tile', !S1.world.reg && S1.world.tile.every((t, i) => t === w0.tile[i]));
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check('o save novo guarda a geração e volta com as regiões', S2.world.gen === 2 && !!S2.world.reg && S2.world.tile.every((t, i) => t === S.world.tile[i]));
  }
  {
    // recursos e o que eles fazem
    const S = newGame(42, 192);
    const p = S.people[0];
    const nob = S.world.objs.find((o) => o.sp === 'nobre');
    const c = { k: 'madeira', n: C.TREE_WOOD, nobre: C.NOBRE_WOOD };
    G.Regioes.trouxe(S, p, c);
    check('o jequitibá dá madeira nobre, e a Crônica conta a primeira', S.stock.nobre === C.NOBRE_WOOD && S.chron.some((x) => /madeira nobre/.test(x.text)) && !!nob);
    G.Regioes.trouxe(S, p, { k: 'pedra', n: 1, ouro: 1 });
    check('o veio da serra dá ouro', (S.stock.ouro || 0) >= 1 && S.chron.some((x) => /achou ouro/.test(x.text)));
    Object.assign(S.stock, { carne: 100, peixe: 100, sal: 5 });
    const st0 = S.stats.rotted || 0;
    Sim.daily(S);
    const comSal = (S.stats.rotted || 0) - st0;
    Object.assign(S.stock, { carne: 100, peixe: 100, sal: 0 });
    const st1 = S.stats.rotted || 0;
    Sim.daily(S);
    const semSal = (S.stats.rotted || 0) - st1;
    check('com sal no estoque, a carne e o peixe estragam menos', comSal < semSal, comSal + ' contra ' + semSal);
    const w = S.world, iS = acha(w, (i) => w.reg[i] === REG.SERRA && !G.IS_WATER[w.tile[i]]), iT = acha(w, (i) => w.reg[i] === REG.SERTAO && w.tile[i] === G.T.GRASS), iC = acha(w, (i) => w.reg[i] === 0 && w.tile[i] === G.T.GRASS);
    const temp = (i) => { p.x = i % w.W + 0.5; p.y = ((i / w.W) | 0) + 0.5; return Sim.personTemp(S, p); };
    check('a serra alta é mais fria e o sertão mais quente que o campo', temp(iS) < temp(iC) && temp(iT) > temp(iC), temp(iS).toFixed(1) + ' · ' + temp(iC).toFixed(1) + ' · ' + temp(iT).toFixed(1));
    check('a roça do sertão rende menos', Rg.rocaMult(S, { x: iT % w.W - 1, y: ((iT / w.W) | 0) - 1 }) < 1);
  }
  {
    // o mosquito, os bichos, a ponte
    const S = newGame(777, 256);
    S.seen.fill(1);
    const w = S.world, p = S.people[0];
    const iM = acha(w, (i) => (w.reg[i] === REG.MANGUE || w.reg[i] === REG.PANTANO) && !G.IS_WATER[w.tile[i]]);
    p.x = iM % w.W + 0.5; p.y = ((iM / w.W) | 0) + 0.5;
    const old = C.MOSQUITO_H; C.MOSQUITO_H = 1;
    Rg.hourly(S);
    C.MOSQUITO_H = old;
    check('o mosquito do mangue e do pântano passa a febre', !!p.sick && S.stats.mosquito === 1);
    check('a primeira vez numa região entra na Crônica', S.chron.some((x) => /mangue|pântano/.test(x.text)));
    const habOk = (sp, k) => { for (let i = 0; i < w.W * w.H; i += 7) if (w.reg[i] === k && !G.IS_WATER[w.tile[i]]) { /* qualquer lugar da região serve de teste */ } return C.BICHOS[sp] && C.BICHOS[sp].hab; };
    check('o caranguejo é do mangue e a cabra é do sertão', habOk('caranguejo') === 'mangue' && habOk('cabra') === 'sertao');
    const sps = (S.fauna.ents || []).map((e) => e.sp);
    check('o mundo novo já nasce com caranguejo e cabra', sps.indexOf('caranguejo') >= 0 && sps.indexOf('cabra') >= 0, [...new Set(sps)].join(', '));
    // a ponte: acha um trecho de rio com terra dos dois lados
    let at = null;
    for (let i = 0; i < w.W * w.H && !at; i++) { const x = i % w.W, y = (i / w.W) | 0; if (w.tile[i] === G.T.RIVER && Rg.ponteWhy(S, x, y) === '') at = { x, y }; }
    check('dá para pôr uma ponte num rio com terra dos dois lados', !!at);
    check('na terra seca não vai ponte', /em cima do rio/.test(Rg.ponteWhy(S, S.camp.x, S.camp.y)));
    if (at) {
      const n0 = G.W.findPath(w, ((at.y) * w.W + at.x - 3), ((at.y) * w.W + at.x + 4), 400);
      const b = Sim.placeBlueprint(S, 'ponte', at.x, at.y);
      check('a ponte entra como obra', !!b && b.type === 'ponte');
      Sim.complete(S, b);
      const ok2 = !S.buildings.some((x) => x.type === 'ponte') && w.road[at.y * w.W + at.x] === 3;
      check('pronta, a água vira chão de pedra e a obra sai do caminho', ok2);
      check('e a Crônica conta', S.chron.some((x) => /ponte de pedra ficou pronta/.test(x.text)));
      check('o bicho de criação passa pela ponte', !G.W.wall(w, at.y * w.W + at.x, 2));
    }
    // a grande estátua: o nível 3 da estátua
    const up = C.BUILD.estatua.up;
    check('a estátua ganhou o nível da grande estátua', up.length === 2 && up[1].god.reach > up[0].god.reach && up[1].god.reza > up[0].god.reza);
  }
  {
    // o mapa gigante: gerar, montar o jogo e um dia
    const t0 = Date.now();
    const S = newGame(9001, 384);
    const tg = Date.now() - t0;
    check('o mapa gigante (384) nasce em menos de 3 segundos', tg < 3000, tg + ' ms');
    const t1 = Date.now();
    for (let i = 0; i < 720; i++) { Sim.step(S, 2); S.events.length = 0; }
    const td = Date.now() - t1;
    check('um dia no mapa gigante, com o casal, roda em menos de 4 segundos', td < 4000, td + ' ms');
    const sz = JSON.stringify(Save.serialize(S)).length;
    check('o save do mapa gigante fica pequeno (só o que mudou)', sz < 80000, sz + ' caracteres');
    check('o seletor tem o mapa Gigante', C.MAP_SIZES.some((m) => m.n === 384));
  }
  console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exit(bad ? 1 : 0);
}

// ===================== 20 anos =====================
function spot(S, t, from, max) {
  for (let r = from || 2; r < (max || 60); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function longRun(seed, years) {
  const S = newGame(seed, 384);
  S.narr.auto = 'acolher';
  const place = (t, from) => { const at = spot(S, t, from); return at ? Sim.placeBlueprint(S, t, at.x, at.y) : null; };
  place('fogueira'); place('barraca');
  const out = { seed, errors: [], deaths: {}, alive: 0 };
  const t0 = Date.now();
  let hungry = 0, hrs = 0;
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const pend = () => S.buildings.some((b) => (!b.built && !b.site && !C.BUILD[b.type].grande) || b.up);
        if (!pend() && F.bedsTotal(S) < F.bedsNeeded(S) + 1 && S.stock.madeira >= 14) place('barraca');
        for (const t of ['moquem', 'jirau', 'forno', 'marcenaria', 'armazem']) if (!pend() && T.buildOpen(S, t) && !S.buildings.some((b) => b.type === t) && S.ctx.foodDays > 4) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
        if (T.known(S, 'lanca')) S.vontades.caca = 3;
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
    }
  } catch (e) { out.errors.push(String(e.stack || e)); }
  for (const p of S.people) if (!p.alive && p.cause) out.deaths[p.cause] = (out.deaths[p.cause] || 0) + 1;
  const st = S.stats;
  Object.assign(out, { alive: S.people.filter((p) => p.alive).length, over: !!S.over, sec: (Date.now() - t0) / 1000, hungry: Math.round(hungry / Math.max(1, hrs) * 100),
    vistas: Object.keys(S.regioes.vistas).map((k) => G.RNAME[k]).join(', '), sal: st.salGot || 0, nobre: st.nobreGot, ouro: st.ouroVeio, mosquito: st.mosquito,
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
    console.log('\n' + YEARS + ' anos no mapa gigante (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of res) {
      const tag = 'mundo ' + r.seed + ': ';
      if (r.errors && r.errors.length) { check(tag + 'sem erro', false, r.errors[0]); continue; }
      console.log('\nmundo ' + r.seed + ' · ' + r.sec.toFixed(0) + ' s · ' + r.alive + ' vivos · mortes: ' + JSON.stringify(r.deaths) + ' · fome ' + r.hungry + '%');
      console.log('  regiões conhecidas: ' + (r.vistas || 'nenhuma') + ' · madeira nobre ' + r.nobre + ' · ouro do veio ' + r.ouro + ' · febre do mosquito ' + r.mosquito + ' · save ' + r.save + ' caracteres');
      check(tag + 'a aldeia chega ao fim dos ' + YEARS + ' anos', r.alive >= 2 && !r.over, r.alive + ' vivos');
      check(tag + 'o save fica abaixo de 1 MB', r.save < 1e6, r.save);
      check(tag + 'fome rara (menos de 5% do povo, em média)', r.hungry < 5, r.hungry + '%');
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  }
} else if (!isMainThread) {
  parentPort.postMessage(longRun(workerData.seed, workerData.years));
}
