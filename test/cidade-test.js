// Gods · testes da Etapa 16 (Grandes obras e instituições). Uso: node test/cidade-test.js [anos | u] [sementes]
// 1) unidades: quando cada obra aparece, a grande obra que sobe em fases sem tomar a vez das outras, quem serve
//    (contratar com fartura, soltar com fome, ir ao posto), a aula, a estante e o saber que não se perde, a febre
//    (pega dentro de casa, tira saúde, a casa de cura segura e cura), o fogo por acaso e a brigada, a guarda (menos
//    malfeito, testemunha), a feira com a vila de fora, a muralha, o aqueduto, o templo, o líder que marca e sobe de
//    nível, e o save
// 2) 20 anos em três mundos (a regra do GDD): uma vila de 30 que já sabe escrever, o povo decide as obras e o
//    jogador ergue as grandes obras quando abrem
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;   // 0.18: estes testes foram montados nos mapas de antes das regiões (as regiões têm o teste delas)
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Povos: Pv, Minas: Mi, Soc: So, Cidade: Ci, Gente: Ge } = G;
const Y = 60 * 1440, DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}

// ---------- ajudantes ----------
function newWorld(seed) { const w = W.generate(seed), site = W.bestSite(w); return Sim.newGame(seed, site, ['Iara', 'Aruã'], w); }
function spot(S, t, from, max) {
  for (let r = from || 2; r < (max || 60); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function place(S, t, from) { const at = spot(S, t, from); return at ? Sim.placeBlueprint(S, t, at.x, at.y) : null; }
function build(S, t, from) { const b = place(S, t, from); if (!b) return null; Sim.complete(S, b); if (t === 'fogueira') b.fuel = 8; Sim.refresh(S); return b; }
function add(S, sex, name, age) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y; q.lastAge = F.age(S, q);
  S.people.push(q);
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); Mi.init(S);
  Pv.recount(S); q.fe = 80; So.indole(S, q);
  return q;
}
function setAge(S, p, a) { p.born = S.t - a * Y - 5 * DAYM; p.lastAge = Math.floor(a); }
function jump(S, day, hour) { S.t = day * DAYM + hour * 60; S.ck = Sim.clock(S.t); Sim.refresh(S); }
// uma vila pronta, em paz: n adultos de boa índole (e kids crianças), casas, fogo e fartura
function vila(seed, n, kids, o) {
  const S = newWorld(seed);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  if (S.life) S.life.party = null;
  S.stats.firstFire = true; S.arrived = true;
  S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) add(S, k % 2 ? 'M' : 'F', 'Gente' + k, 25);
  for (let k = 0; k < (kids || 0); k++) add(S, k % 2 ? 'M' : 'F', 'Cria' + k, 8);
  build(S, 'fogueira');
  for (let k = 0; k < Math.ceil((n + (kids || 0)) / 4) + 2; k++) build(S, 'barraca', 3);
  build(S, 'marcenaria', 4);
  Object.assign(S.stock, { madeira: 600, pedra: 600, agua: 30, frutas: 200, peixe: 600, tabuas: 300, argila: 200, fibra: 100 });
  for (const id of ['pedra', 'cestos', 'lanca', 'machado', 'ceramica']) if (!T.known(S, id)) S.tech.known[id] = { t: S.t, by: 'teste', how: 'pratica' };
  if (!o || o.escrita !== false) { S.god.saber = S.god.saber || {}; S.god.saber.escrita = S.t; }
  jump(S, C.SOC_GRACA_D + 4, 9);
  S.people.forEach((p, k) => { p.indole = { g: 50, m: 50, f: 50 }; p.indAc = {}; p.traits = []; p.fe = 80; p.act = null; p.path = null;
    p.x = S.camp.x + 0.5 + (k % 6); p.y = S.camp.y + 2.5 + Math.floor(k / 6); p.px = p.x; p.py = p.y;
    setAge(S, p, p.name.startsWith('Cria') ? 8 : k < 2 ? 30 : 25); });
  S.events.length = 0; S.chron.length = 0;
  Sim.refresh(S);
  return S;
}
const horas = (S, h) => { for (let i = 0; i < h * 30; i++) { Sim.step(S, 2); S.events.length = 0; } };
const chronHas = (S, re) => S.chron.some((c) => re.test(c.text));

if (isMainThread && process.argv[2] === 'u' || isMainThread && !process.argv[2]) {
  // ===================== unidades =====================
  {
    const S = vila(11, 12, 0, { escrita: false });
    check('o templo só abre com 20 pessoas', /20 pessoas/.test(Ci.openWhy(S, 'templo')), Ci.openWhy(S, 'templo'));
    check('a escola pede a escrita', /escrita/.test(Ci.openWhy(S, 'escola')));
    check('a guarda só aparece depois do primeiro crime grave', /crime grave/.test(Ci.openWhy(S, 'guarda')));
    S.stats.crimesG[3] = 1;
    check('depois do crime grave, a guarda abre', Ci.openWhy(S, 'guarda') === '' && T.buildOpen(S, 'guarda'));
    check('a brigada abre depois do primeiro fogo', /incêndio/.test(Ci.openWhy(S, 'brigada')) && ((S.stats.incendios = 1), Ci.openWhy(S, 'brigada') === ''));
    check('obra que não é desta etapa não é com ela', Ci.openWhy(S, 'barraca') === null);
    build(S, 'guarda');
    check('uma guarda por aldeia', /já tem/.test(Ci.openWhy(S, 'guarda')));
  }
  {
    // a grande obra: sobe com o que chegou e não toma a vez das outras
    const S = vila(12, 24, 0);
    check('com 24 pessoas, o templo abre', Ci.openWhy(S, 'templo') === '' && T.buildOpen(S, 'templo'));
    const st = S.stock; st.pedra = 40; st.madeira = 15; st.tabuas = 12;   // um quarto do templo
    const tp = place(S, 'templo', 4);
    S.vontades.construir = 3;
    horas(S, 30);
    const job = Sim.jobOf(tp), fr = Ci.frac(job);
    check('o povo leva o material que há para a grande obra', fr > 0.2, (fr * 100).toFixed(0) + '% entregue');
    check('a grande obra sobe sem esperar tudo chegar, até onde o material deixa', tp.progress > 0.05 && tp.progress <= fr + 0.01, (tp.progress * 100).toFixed(1) + '% de ' + (fr * 100).toFixed(0) + '%');
    check('e não fica pronta antes do material', !tp.built);
    st.madeira += 30;
    const bar = place(S, 'barraca', 3);
    Sim.refresh(S);
    check('uma obra comum que dá para fazer pega a vez da grande obra', S.ctx.job && S.ctx.job.b === bar, S.ctx.job && S.ctx.job.b.type);
    Object.assign(st, { pedra: 400, madeira: 200, tabuas: 200 });
    for (let d = 0; d < 40 && !tp.built; d++) horas(S, 24);
    check('com o material todo e muitas mãos, o templo fica pronto em semanas', tp.built, (tp.progress * 100).toFixed(0) + '%');
    check('a Crônica conta o templo pronto', chronHas(S, /templo ficou pronto/));
    // o templo é lugar de reza e vale o dobro
    const p = S.people.find((q) => F.age(S, q) >= 20);
    p.fe = 90; const fe0 = p.fe;
    D.onPrayed(S, p, tp);
    check('rezar no templo dá o dobro da fé da reza', Math.abs(p.fe - fe0 - C.REZA_FE * 2) < 0.6 || p.fe === 100, (p.fe - fe0).toFixed(1));
    check('o templo é lugar de reza da manhã', D.prayerStatue(S, p) === tp);
  }
  {
    // quem serve
    const S = vila(13, 44, 0);
    const h = build(S, 'hospital');
    jump(S, S.ck.day + 1, 6);
    Ci.daily(S);
    const cur = Ci.staffOf(S, h);
    check('com fartura, a casa de cura ganha um curandeiro', cur.length === 1, cur.map((q) => q.name).join(','));
    check('a Crônica conta o primeiro curandeiro', chronHas(S, /primeir[oa] curandeir[oa]/));
    const lider = So.lider(S);
    check('o líder não vira curandeiro', !lider || lider.cargo !== h.id);
    jump(S, S.ck.day, 8);
    horas(S, 8);
    check('o curandeiro vai ao posto e serve', h.serv && h.serv.min >= C.PROF_MIN, h.serv ? h.serv.min.toFixed(0) + ' min' : 'nada');
    check('servindo, a casa de cura está em serviço', Ci.nivel(S, 'hospital') === 1);
    for (const k of ['frutas', 'peixe', 'carne', 'feijao', 'milho', 'mandioca', 'abobora', 'seca', 'defumado']) S.stock[k] = 0;
    Sim.refresh(S);
    Ci.daily(S);
    check('com a comida curta, quem servia volta ao trabalho comum', !S.people.some((q) => q.cargo), S.ctx.foodDays.toFixed(1) + ' dias de comida');
  }
  {
    // a escola e a biblioteca
    const S = vila(14, 14, 14);
    check('com a escrita e 14 crianças, a escola abre', Ci.openWhy(S, 'escola') === '');
    const e = build(S, 'escola'), bi = build(S, 'biblioteca');
    S.tech.known.machado = S.tech.known.machado || { t: S.t, by: 'teste', how: 'pratica' };
    const mestre = S.people.find((q) => q.name === 'Gente0'); mestre.sabe = { machado: 1 };
    Ci.daily(S);
    for (const b of [e, bi]) b.serv = { day: S.ck.day, min: 200, prev: 200 };
    const kid = S.people.find((q) => q.name === 'Cria0');
    const sk0 = Object.values(kid.skills).reduce((a, v) => a + v, 0), dom0 = Ge.dom(S, kid, 'machado');
    Ci.daily(S);
    for (const b of [e, bi]) b.serv = { day: S.ck.day, min: 200, prev: 200 };
    Ci.daily(S);
    const sk1 = Object.values(kid.skills).reduce((a, v) => a + v, 0);
    check('na aula, a criança ganha prática', sk1 > sk0 + 1, sk0.toFixed(1) + ' → ' + sk1.toFixed(1));
    check('e aprende o jeito do machado sem ver quem sabe', Ge.dom(S, kid, 'machado') > dom0, Ge.dom(S, kid, 'machado').toFixed(3));
    check('a estante escreve o jeito de quem sabe', Ci.escrito(S, 'machado'));
    mestre.alive = false;
    Ge.onDeath(S, mestre);
    check('morto o último que sabia, o jeito escrito não se perde', chronHas(S, /está escrito/) && !chronHas(S, /Vão ter de reaprender/));
    e.lv = 2; S.t += 60;
    Ci.nivel(S, 'escola');
    const adulto = S.people.find((q) => q.alive && q.name === 'Gente1');
    check('a escola de nível 2 faz o adulto aprender mais', Ci.xp(S, adulto) > 1.1, Ci.xp(S, adulto).toFixed(2));
  }
  {
    // a febre e a casa de cura
    const S = vila(15, 20, 0);
    const casa = S.buildings.find((b) => b.type === 'barraca' && b.built);
    const doente = S.people[0];
    horas(S, 1);
    casa.beds = S.people.slice(0, 4).map((q) => q.id);
    S.cidade.peste = { t0: S.t, n: 0, mortes: 0 };
    Ci.adoece(S, doente);
    let pegou = 0;
    for (let k = 0; k < 6; k++) { Ci.daily(S); }
    pegou = S.people.filter((q) => q.sick || q.imune).length;
    check('a febre passa para quem dorme na mesma casa', S.people.slice(1, 4).some((q) => q.sick), pegou + ' com febre');
    const s0 = doente.needs.saude;
    Ci.hourly(S);
    const semCura = s0 - doente.needs.saude;
    const h = build(S, 'hospital');
    h.serv = { day: S.ck.day, min: 300, prev: 300 };
    Ci.nivel(S, 'x'); S.t += 60; Ci.nivel(S, 'x');
    const s1 = doente.needs.saude;
    Ci.hourly(S);
    const comCura = s1 - doente.needs.saude;
    check('com a casa de cura, a febre tira menos saúde', comCura < semCura * 0.6, semCura.toFixed(2) + ' → ' + comCura.toFixed(2) + ' por hora');
    doente.sick = S.t - 1;
    Ci.hourly(S);
    check('passado o tempo, a febre vai embora e a pessoa fica imune', !doente.sick && doente.imune > S.t);
    const v = S.people[5]; v.needs.saude = 0.1; v.sick = S.t + 3 * DAYM; v.dmg.doenca = 50;
    Ci.hourly(S);
    check('quem morre de febre tem a causa certa', !v.alive && v.cause === 'doenca', v.cause);
  }
  {
    // o fogo por acaso, a brigada, a guarda
    const S = vila(16, 20, 0);
    jump(S, Math.ceil(S.ck.day / 60) * 60 + 20, 9);   // verão
    S.precip = null;
    const old = C.FOGO_ACASO; C.FOGO_ACASO = 1;
    Ci.daily(S);
    C.FOGO_ACASO = old;
    check('no verão seco, numa aldeia de palha, uma faísca é marcada para o dia', S.cidade.faisca > S.t);
    S.t = S.cidade.faisca + 1; S.ck = Sim.clock(S.t);
    Ci.hourly(S);
    check('e a palha pega fogo', S.buildings.some((b) => b.fogo) && chronHas(S, /faísca/));
    check('o fogo sem culpado abre a brigada', Ci.openWhy(S, 'brigada') === '');
    const br = build(S, 'brigada'); br.serv = { day: S.ck.day, min: 300, prev: 300 };
    S.t += 60; Ci.nivel(S, 'x');
    check('a brigada apaga mais e mais cedo', Ci.apaga(S) > 0 && Ci.fogoMin(S) < 1);
    S.stats.crimesG[3] = 1;
    const g = build(S, 'guarda'); g.lv = 2; g.serv = { day: S.ck.day, min: 300, prev: 300 };
    S.t += 60; Ci.nivel(S, 'x');
    check('a guarda segura o malfeito', Ci.crimeMult(S) < 0.6, Ci.crimeMult(S));
    const gu = S.people.find((q) => q.alive && F.age(S, q) >= 20 && !q.cargo);
    gu.cargo = g.id;
    S.ctx.night = false;
    const out = []; Ci.guardas(S, g.x + 1, g.y + 1, out, null);
    if (process.env.V) console.log('debug guarda', Ci.nivel(S, 'guarda'), S.ctx.night, Ci.staffOf(S, g).map((q) => q.name), gu.name, gu.alive, gu.fora, gu.carriedBy);
    check('quem está de guarda é testemunha do que acontece perto', out.indexOf(gu.id) >= 0);
  }
  {
    // a feira, a muralha, o aqueduto
    const S = vila(17, 34, 0);
    S.soc.vila = { nome: 'Pedra Alta', art: 'a', x: 1, y: 1, t0: S.t, bem: 60, laco: 10, filhos: [], n: 4, mortes: 0, fim: 0 };
    check('com a vila de fora, o mercado abre', Ci.openWhy(S, 'mercado') === '');
    const m = build(S, 'mercado'); m.lv = 3; m.serv = { day: S.ck.day, min: 300, prev: 300 };
    S.t += 60; Ci.nivel(S, 'x');
    S.stock.couro = 0; const mad = S.stock.madeira;
    Ci.daily(S);
    check('na feira, o que sobra vira o que falta', S.stats.trocasMercado === 1 && S.stock.madeira < mad, S.stats.trocasMercado + ' troca');
    const mu = place(S, 'muralha', 18);
    check('a muralha abre com 30 pessoas', !!mu);
    Sim.complete(S, mu); Sim.refresh(S);
    const dentro = S.people[0];
    check('atrás da muralha, ninguém é presa de lobo', G.Narr.safeSpot(S, dentro));
    S.stock.agua = 0;
    const aq = build(S, 'aqueduto', 6);
    check('o aqueduto abre com a cerâmica e 30 pessoas', !!aq);
    Ci.hourly(S); Ci.hourly(S);
    check('o aqueduto enche o estoque de água sozinho', S.stock.agua >= C.BUILD.aqueduto.water.h * 2);
  }
  {
    // o líder marca a instituição e sobe de nível; o save guarda tudo
    const S = vila(18, 44, 0);
    So.setModo(S, 'decide');
    S.stats.crimesG[3] = 1;
    const fal = So.faltas(S).find((f) => f.type === 'guarda');
    check('depois do crime grave, falta uma guarda para o líder', !!fal);
    So.eleger(S, true);
    So.planejarObra(S);
    const gb = S.buildings.find((b) => b.type === 'guarda');
    check('o líder marca a guarda sozinho', !!gb && gb.povo === 1);
    Sim.complete(S, gb);
    build(S, 'marcenaria');   // a melhoria pede tábuas
    S.stats.crimesG[3] = 3;
    Ci.daily(S);
    check('com mais crime grave, o líder sobe a guarda de nível', !!gb.up, gb.up ? 'nível ' + gb.up.lv : 'não subiu');
    const p = S.people.find((q) => q.cargo) || S.people[3];
    p.sick = S.t + DAYM; S.cidade.escrito.rede = S.t;
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    const p2 = S2.people.find((q) => q.id === p.id);
    check('o save guarda quem serve, quem está com febre e o que está escrito', p2 && p2.sick === p.sick && p2.cargo === p.cargo && S2.cidade && S2.cidade.escrito.rede === S.cidade.escrito.rede);
  }
  console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exit(bad ? 1 : 0);
}

// ===================== 20 anos =====================
function longRun(seed, years) {
  const S = vila(seed, 30, 6);
  S.narr.nextBad = S.t + 20 * DAYM; S.narr.nextGood = S.t + 10 * DAYM;   // os desastres voltam
  S.narr.auto = 'acolher';
  So.setModo(S, 'decide');
  const out = { seed, errors: [], obras: [], inst: {}, deaths: {}, alive: 0 };
  const t0 = Date.now();
  let hungry = 0, hrs = 0;
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2, construir: 3 } : { madeira: 2, pesca: 3, frutas: 3, construir: 3 });
        S.vontades.pedra = S.stock.pedra < 60 ? 3 : 1;
        if (K.known(S, 'roca')) { S.vontades.roca = 3; if (S.buildings.filter((b) => b.type === 'roca').length < Math.max(3, Math.ceil(S.people.filter((p) => p.alive).length / 12)) && !S.buildings.some((b) => !b.built && !C.BUILD[b.type].grande)) place(S, 'roca', 5); }
        // o jogador ergue as grandes obras quando abrem, uma de cada vez
        if (!S.buildings.some((b) => Ci.isGrande(b))) for (const k of Ci.GRANDES) if (T.buildOpen(S, k) && !S.buildings.some((b) => b.type === k)) { const b = place(S, k, k === 'muralha' ? 17 : 5); if (b) { out.obras.push(k); break; } }
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
  for (const b of S.buildings) if (Ci.isCidade(b.type)) out.inst[b.type] = (b.built ? 'nível ' + (b.lv || 1) : 'em obra ' + Math.round((b.progress || 0) * 100) + '%') + (C.BUILD[b.type].inst ? ' · ' + Ci.staffOf(S, b).length + ' no posto' : '');
  const st = S.stats;
  Object.assign(out, { alive: S.people.filter((p) => p.alive).length, over: !!S.over, sec: (Date.now() - t0) / 1000, hungry: Math.round(hungry / Math.max(1, hrs) * 100),
    aulas: st.aulas, servH: Math.round(st.servMin / 60), doentes: st.doentes, mortesPeste: st.mortesPeste, curados: st.curados, fogos: st.fogosAcaso, incendios: st.incendios || 0,
    trocas: st.trocasMercado, crimes: st.crimes, graves: st.crimesG[3], escrito: Object.keys(S.cidade.escrito).length,
    save: JSON.stringify(Save.serialize(S)).length });
  return out;
}

if (isMainThread && process.argv[2] !== 'u') {
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
    console.log('\n' + YEARS + ' anos de vila (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of res) {
      const tag = 'mundo ' + r.seed + ': ';
      if (r.errors && r.errors.length) { check(tag + 'sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · mortes: ${JSON.stringify(r.deaths)} · fome ${r.hungry}% das horas`);
      console.log('  grandes obras marcadas: ' + (r.obras.join(', ') || 'nenhuma') + ' · ' + JSON.stringify(r.inst));
      console.log(`  aulas ${r.aulas} · horas servidas ${r.servH} · febre: ${r.doentes} doentes, ${r.mortesPeste} mortes, ${r.curados} curados · faíscas ${r.fogos} · obras queimadas ${r.incendios} · trocas na feira ${r.trocas} · crimes ${r.crimes} (graves ${r.graves}) · técnicas escritas ${r.escrito} · save ${r.save} caracteres`);
      check(tag + 'a vila chega ao fim dos ' + YEARS + ' anos', r.alive >= 10 && !r.over, r.alive + ' vivos');
      check(tag + 'o save fica abaixo de 1 MB (o servidor guarda num arquivo do Drive)', r.save < 1e6, r.save);
      if (YEARS < 20) continue;
      check(tag + 'pelo menos duas grandes obras ficam prontas', Object.values(r.inst).filter((v, i) => /nível/.test(v) && C.BUILD[Object.keys(r.inst)[i]].grande).length >= 2, JSON.stringify(r.inst));
      check(tag + 'o povo ergue instituições e alguém serve nelas', Object.keys(r.inst).filter((k) => C.BUILD[k].inst).length >= 2 && r.servH > 100, r.servH + ' horas');
      check(tag + 'a febre não acaba com a vila (mortes de febre menos de um terço dos doentes)', r.mortesPeste <= Math.max(2, r.doentes / 3), r.mortesPeste + ' de ' + r.doentes);
      check(tag + 'fome rara (menos de 5% do povo, em média, com fome forte)', r.hungry < 5, r.hungry + '%');
      check(tag + 'ninguém morre de fome', !r.deaths.fome, (r.deaths.fome || 0) + ' mortes');
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  }
} else if (!isMainThread) {
  parentPort.postMessage(longRun(workerData.seed, workerData.years));
}
