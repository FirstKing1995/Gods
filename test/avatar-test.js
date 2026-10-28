// Gods · testes da Etapa 21 (Avatar). Uso: node test/avatar-test.js [anos | u] [sementes]
// 1) unidades: quem pode ser possuído, o corpo que obedece ao toque, as ações do avatar (consolar, encorajar, pregar,
//    ensinar, apartar, puxar a reza), o custo por hora, o corpo que pede descanso, o medo dos tomados, o filho
//    abençoado (concepção, nascimento, dom, a pergunta e a resposta, o líder nato) e o save
// 2) 20 anos em três mundos (a regra do GDD), com o jogador possuindo de vez em quando
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Family: F, God, Save, Tech: T, Life: L, Campo: K, Deus: D, Soc: So, Avatar: Av } = G;
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
function aldeia(seed, n) {
  const w = W.generate(seed, 192), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9; S.arrived = true; S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', 'Gente' + k, 25); q.x = S.camp.x + 1.5 + (k % 3); q.y = S.camp.y + 2.5; S.people.push(q); F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); So.indole(S, q); }
  for (const p of S.people) { p.fe = 90; p.x = S.camp.x + 1.5 + (p.id % 3) * 0.5; p.y = S.camp.y + 2.5; }
  Object.assign(S.stock, { madeira: 100, peixe: 300, frutas: 100, agua: 30 });
  S.god.poder = 5000;
  Sim.refresh(S);
  return S;
}

if (isMainThread && (process.argv[2] === 'u' || !process.argv[2])) {
  {
    const S = aldeia(42, 10);
    const kid = Sim.makePerson(S, 'F', 'Menina', 8); S.people.push(kid); kid.fe = 100;
    check('criança não se possui', /adulto/.test(Av.possuirWhy(S, kid)));
    const fraco = S.people[3]; fraco.fe = 40;
    check('quem tem pouca fé não se possui', /fé/.test(Av.possuirWhy(S, fraco)));
    const p = S.people[2];
    const r = Av.possuir(S, p.id);
    check('um adulto de fé alta pode ser possuído, e a Crônica conta a primeira vez', r.ok && Av.ativoEm(S, p) && S.chron.some((c) => /olhos de/.test(c.text)), r.why);
    check('só um de cada vez', /já está/.test(Av.possuirWhy(S, S.people[4])));
    // o corpo obedece ao toque
    const dest = { x: S.camp.x + 6, y: S.camp.y + 6 };
    Av.mover(S, dest.x, dest.y);
    for (let i = 0; i < 120; i++) { Sim.step(S, 2); S.events.length = 0; }
    check('o toque no chão leva o corpo até lá', Math.hypot(p.x - dest.x - 0.5, p.y - dest.y - 0.5) < 2, p.x.toFixed(1) + ',' + p.y.toFixed(1));
    check('e ele fica esperando a próxima ordem (não volta ao trabalho sozinho)', p.act && p.act.type === 'avatar');
    // as ações
    const q = S.people[5]; q.x = p.x + 1; q.y = p.y; q.desc = 40; q.fe = 50;
    const po0 = S.god.poder;
    const a1 = Av.agir(S, 'consolar', q.id);
    check('consolar: o descontentamento cai, e custa Poder', a1.ok && q.desc < 40 && S.god.poder === po0 - C.AVATAR_ACAO, a1.why);
    const fe0 = q.fe; Av.agir(S, 'pregar', q.id);
    check('pregar: a fé de quem ouve sobe', q.fe > fe0);
    check('a mesma ação não se repete logo em seguida', /de novo/.test(Av.acaoWhy(S, 'consolar', q.id)));
    p.sabe = { machado: 1 }; S.tech.known.machado = S.tech.known.machado || { t: S.t };
    const d0 = G.Gente.dom(S, q, 'machado');
    Av.agir(S, 'ensinar', q.id);
    check('ensinar na mão: o jeito do avatar passa para quem aprende', G.Gente.dom(S, q, 'machado') > d0);
    q.plano = { k: 'furto' };
    Av.agir(S, 'apartar');
    check('apartar: quem planejava um malfeito perto desiste', !q.plano);
    const outros = S.people.filter((o) => o !== p && Math.hypot(o.x - p.x, o.y - p.y) <= 6), fs0 = outros.map((o) => o.fe);
    Av.agir(S, 'rezar');
    check('puxar a reza: quem está perto reza junto e a fé sobe', outros.length > 0 && outros.some((o, i) => o.fe > fs0[i]));
    // o custo por hora e o medo
    S.avatar.horas[p.id] = C.AVATAR_ABUSO_H + 1;
    const p0 = S.god.poder;
    Av.hourly(S);
    check('possuir custa Poder por hora', S.god.poder === p0 - C.AVATAR_PODER_H);
    check('possuir demais assusta: o povo começa a temer os tomados', S.chron.some((c) => /temer os tomados/.test(c.text)));
    p.needs.fome = 5;
    Av.hourly(S);
    check('o corpo que pede descanso solta o avatar, e ele lembra como um sonho', !Av.ativo(S) && p.mem.some((m) => m.k === 'tomado'));
    // o filho abençoado
    Av.possuir(S, p.id);
    const par = S.people.find((o) => o.sex !== p.sex && F.age(S, o) >= 18 && o !== p);
    const mae = p.sex === 'F' ? p : par, pai = p.sex === 'F' ? par : p;
    check('a concepção com o pai ou a mãe possuído marca o bebê', Av.marcaConcepcao(S, mae, pai));
    const baby = Sim.makePerson(S, 'M', 'Bebê', 0); S.people.push(baby);
    Av.nasceu(S, baby);
    check('o abençoado nasce com fé inteira, um dom e a Crônica conta', baby.abencoado && baby.fe === 100 && Av.DONS[baby.abencoado.dom] && S.chron.some((c) => /marca de luz/.test(c.text)));
    check('o abençoado aprende mais depressa', Av.xp(baby) > 1);
    // a pergunta
    baby.born = S.t - 9 * 60 * DAYM; baby.abencoado.t = S.t - 40 * DAYM; baby.lastAge = 9;
    Av.daily(S);
    const pg = Av.pending(S);
    check('aos 8 anos ou mais, o abençoado pergunta direto a você', !!pg && pg.opcoes.length === 2, pg && pg.texto);
    const fp0 = baby.fe; baby.fe = 80;
    Av.responder(S, 1);
    check('a resposta vai para a Crônica, e a fé dele sobe', !Av.pending(S) && baby.fe > 80 && S.chron.some((c) => /perguntou a/.test(c.text)));
    // o líder nato
    baby.abencoado.dom = 'lider'; baby.born = S.t - 21 * 60 * DAYM; baby.lastAge = 21;
    Av.daily(S);
    check('o líder nato, adulto, passa a ser ouvido por todos', S.soc.lider === baby.id);
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check('o save guarda quem está possuído e o abençoado', S2.avatar.pid === S.avatar.pid && S2.people.find((o) => o.id === baby.id).abencoado.dom === 'lider');
  }
  console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') process.exit(bad ? 1 : 0);
}

// ===================== 20 anos =====================
function longRun(seed, years) {
  const S = aldeia(seed, 12);
  S.narr.nextBad = S.t + 20 * DAYM; S.narr.nextGood = S.t + 10 * DAYM; S.narr.auto = 'acolher';
  So.setModo(S, 'decide');
  const place = (t, from) => { const at = spot(S, t, from); return at ? Sim.placeBlueprint(S, t, at.x, at.y) : null; };
  place('fogueira', 2);
  const out = { seed, errors: [] };
  const t0 = Date.now();
  let hungry = 0, hrs = 0;
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (d % 3 === 0) {
        const pend = () => S.buildings.some((b) => (!b.built && !b.site) || b.up);
        if (!pend() && F.bedsTotal(S) < F.bedsNeeded(S) + 1 && S.stock.madeira >= 14) place('barraca', 3);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        if (K.known(S, 'roca')) { S.vontades.roca = 3; if (!pend() && S.buildings.filter((b) => b.type === 'roca').length < Math.max(2, Math.ceil(S.people.filter((p) => p.alive).length / 10))) place('roca', 4); }
        let q; while ((q = D.pending(S))) { if (q.k === 'nome') D.acceptName(S); else D.chooseDom(S, q.offer[0]); }
        if (Av.pending(S)) Av.responder(S, d % 2);
        // o jogador possui alguém por um dia, uma vez por estação, e prega e puxa a reza
        if (d % 15 === 0 && !Av.ativo(S)) { const cand = S.people.filter((o) => !Av.possuirWhy(S, o)), jovem = cand.find((o) => F.bodyAge(S, o) <= 40 && F.partners && F.partners(S, o).length), p = jovem || cand[0]; if (p) Av.possuir(S, p.id); }   // um adulto jovem que já tem par
        else if (d % 15 === 1 && Av.ativo(S)) { Av.agir(S, 'rezar'); Av.soltar(S); }
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
    possessoes: st.possessoes, horas: st.horasAvatar, abencoados: st.abencoados, perguntas: st.perguntas, save: JSON.stringify(Save.serialize(S)).length });
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
    console.log('\n' + YEARS + ' anos com o Avatar (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of res) {
      const tag = 'mundo ' + r.seed + ': ';
      if (r.errors && r.errors.length) { check(tag + 'sem erro', false, r.errors[0]); continue; }
      console.log('\nmundo ' + r.seed + ' · ' + r.sec.toFixed(0) + ' s · ' + r.alive + ' vivos · fome ' + r.hungry + '% · possessões ' + r.possessoes + ' (' + r.horas + ' h) · abençoados ' + r.abencoados + ' · perguntas ' + r.perguntas + ' · save ' + r.save);
      check(tag + 'a aldeia chega ao fim dos ' + YEARS + ' anos', r.alive >= 4 && !r.over, r.alive + ' vivos');
      check(tag + 'fome rara (menos de 5% do povo, em média)', r.hungry < 5, r.hungry + '%');
      if (YEARS >= 20) check(tag + 'o jogador possui gente ao longo dos anos', r.possessoes >= 10, r.possessoes);
    }
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  }
} else if (!isMainThread) {
  parentPort.postMessage(longRun(workerData.seed, workerData.years));
}
