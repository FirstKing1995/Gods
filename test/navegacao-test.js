// Gods · testes da 0.30: a Idade das Navegações (o porto, o galeão, o comércio de longe, as marés, os piratas).
// Uso: node test/navegacao-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Mar: M, Family: F, God, Deus: D, Tech: T, Life: L, Campo: K, Soc: So } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function spot(S, t, from) {
  for (let r = from || 2; r < 80; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t, from) { const at = spot(S, t, from); if (!at) return null; const b = Sim.placeBlueprint(S, t, at.x, at.y); Sim.complete(S, b); Sim.refresh(S); return b; }
// uma cidade na costa, nos Reinos ou depois, com estoque farto (como a aldeia do teste do mar)
function cidade(seed, n, idade) {
  const w = W.generate(seed, 192), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9; S.arrived = true; S.seen.fill(1);
  for (let k = 0; k < n - 2; k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; S.people.push(q); }
  F.init(S); God.init(S); D.init(S); T.init(S); L.init(S); K.init(S); E.init(S);
  for (const id of ['pedra', 'cestos', 'corda']) S.tech.known[id] = S.tech.known[id] || { t: S.t, by: 'teste', how: 'pratica' };
  Object.assign(S.stock, { madeira: 300, tabuas: 200, fibra: 60, mantas: 30, ferro: 20, peixe: 400, frutas: 100, agua: 30, pedra: 200 });
  build(S, 'marcenaria', 3);
  S.eras.idade = idade;
  Sim.refresh(S);
  return S;
}

{
  check('a Idade das Navegações é a sétima idade', E.IDADES[6] && E.IDADES[6].nome === 'Idade das Navegações' && E.IDADES[6].marco.join() === 'porto,galeao');
  const S = cidade(42, 30, 4);
  check('nos Reinos ainda não há porto nem galeão', Ci.openWhy(S, 'porto') !== '' && Ci.openWhy(S, 'galeao') !== '');
  S.eras.idade = 5;
  check('na Idade Média, o porto abre', Ci.openWhy(S, 'porto') === '', Ci.openWhy(S, 'porto'));
  check('o galeão pede o porto pronto', /porto/.test(Ci.openWhy(S, 'galeao') || ''));
  const porto = build(S, 'porto', 2);
  check('o porto vai na beira do mar', !!porto, porto ? '' : 'sem lugar');
  check('com o porto, o galeão abre', Ci.openWhy(S, 'galeao') === '', Ci.openWhy(S, 'galeao'));
  const gal = build(S, 'galeao', 2);
  check('o galeão vai na água funda', !!gal);
  check('o galeão vai primeiro e leva até ' + C.GALEAO_GENTE, M.navioLivre(S) === gal && M.tripMax(S) === C.GALEAO_GENTE);
  const v = { ids: new Array(8), comida: 120 };
  check('com o porto, a viagem é metade mais segura', Math.abs(M.perigo(Object.assign({ porto: 1 }, v)) - M.perigo(v) * C.PORTO_PERIGO) < 1e-9);
  check('as marés do conselho também seguram', M.perigo(Object.assign({ mares: 1 }, v)) < M.perigo(v));
  const r = M.partir(S, 12, 120);
  check('a expedição de 12 sai no galeão', r.ok && S.mar.viagem.galeao === 1 && S.mar.viagem.porto === 1, r.why);
  // o comércio de longe
  S.stock.peixe = 300; S.stock.sal = 0; S.mar.comercio = 0;
  M.daily(S);
  check('um barco de fora troca o que sobra por sal', S.stock.sal > 0 && S.stock.peixe < 300 && S.chron.some((c) => /barco de fora/.test(c.text)), 'sal ' + S.stock.sal + ', peixe ' + S.stock.peixe);
  const sal1 = S.stock.sal;
  S.t += DAYM; S.ck = Sim.clock(S.t); M.daily(S);
  check('e só volta depois de ' + C.COMERCIO_D + ' dias', S.stock.sal === sal1);
}

// ---------- os piratas ----------
{
  const S = cidade(42, 30, 6);
  build(S, 'navio', 2);
  Object.assign(S.stock, { sal: 40, ferro: 20, peixe: 300 });
  S.eras.prox = {};
  const P0 = C.ERA_PIRATAS; C.ERA_PIRATAS = 1e6;
  E.daily(S);
  check('na Idade das Navegações, piratas levam parte do estoque', S.stock.sal < 40 && S.chron.some((c) => /Piratas/.test(c.text)), 'sal ' + S.stock.sal);
  check('e voltam só depois de uns anos', S.eras.prox.piratas > S.t + C.YEAR_DAYS * DAYM);
  const S2 = cidade(777, 30, 6);
  build(S2, 'navio', 2); build(S2, 'torre', 3);
  Object.assign(S2.stock, { sal: 40 });
  S2.eras.prox = {};
  E.daily(S2);
  C.ERA_PIRATAS = P0;
  check('com a torre de vigia, o povo esconde tudo', S2.stock.sal === 40 && S2.chron.some((c) => /torre de vigia viu/.test(c.text)));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
