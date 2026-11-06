// Gods · testes da 0.31: a Idade da Pólvora e da Imprensa (a imprensa, a universidade, o arsenal, os cantos,
// a Revolta dos Panfletos). Uso: node test/polvora-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Tribos: Tb, Tech: T } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, n, idade) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  for (let k = 0; k < (n || 0); k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1; q.y = S.camp.y + 2; S.people.push(q); }
  G.Family.init(S); Sim.refresh(S); E.init(S);
  S.eras.idade = idade || 0;
  Object.assign(S.stock, { ferro: 30, carvao: 30, pedra: 200, tabuas: 150, madeira: 200 });
  return S;
}
function ergue(S, t) {
  for (let r = 3; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); Sim.complete(S, b); Sim.refresh(S); return b; }
  }
  return null;
}

{
  check('a Pólvora e a Imprensa é a oitava idade', E.IDADES[7] && E.IDADES[7].nome === 'Idade da Pólvora e da Imprensa' && E.IDADES[7].marco.join() === 'imprensa,universidade');
  const S = mundo(42, 110, 5);
  check('na Idade Média ainda não', Ci.openWhy(S, 'imprensa') !== '' && Ci.openWhy(S, 'universidade') !== '' && Ci.openWhy(S, 'arsenal') !== '');
  S.eras.idade = 6;
  check('nas Navegações, a imprensa pede a estante', /estante/.test(Ci.openWhy(S, 'imprensa') || ''));
  check('a universidade pede a roda de ensino', /roda de ensino/.test(Ci.openWhy(S, 'universidade') || ''));
  check('o arsenal pede a ferraria', /ferraria/.test(Ci.openWhy(S, 'arsenal') || ''));
  ergue(S, 'marcenaria'); ergue(S, 'biblioteca'); ergue(S, 'escola'); S.tech.known.metalurgia = { t: S.t, by: 'teste', how: 'pratica' }; ergue(S, 'ferraria');
  check('com estante, roda e ferraria, as três abrem', Ci.openWhy(S, 'imprensa') === '' && Ci.openWhy(S, 'universidade') === '' && Ci.openWhy(S, 'arsenal') === '',
    [Ci.openWhy(S, 'imprensa'), Ci.openWhy(S, 'universidade'), Ci.openWhy(S, 'arsenal')].join(' | '));
  const p0 = E.pratMult(S);
  ergue(S, 'imprensa');
  check('com a imprensa, aprende-se ' + Math.round((C.IMPRENSA_PRAT - 1) * 100) + '% mais depressa', Math.abs(E.pratMult(S) - p0 * C.IMPRENSA_PRAT) < 1e-9);
  check('a imprensa tirou o ferro do estoque', S.stock.ferro === 30 - C.BUILD.imprensa.extra.ferro);
  ergue(S, 'universidade');
  check('com a universidade, mais ainda', Math.abs(E.pratMult(S) - p0 * C.IMPRENSA_PRAT * C.UNIV_PRAT) < 1e-9);
  // os estudiosos adiantam a descoberta da vez
  const aberta = T.open(S);
  if (aberta) {
    while (S.ck.day % C.UNIV_D !== 0) { S.t += DAYM; S.ck = Sim.clock(S.t); }
    const h0 = S.tech.prat[aberta] || 0;
    E.daily(S);
    check('a cada ' + C.UNIV_D + ' dias, a universidade adianta a descoberta da vez', (S.tech.prat[aberta] || 0) - h0 >= C.UNIV_HORAS, aberta);
  } else check('há uma descoberta aberta para a universidade adiantar', true);
  // a Revolta dos Panfletos
  S.eras.idade = 7; S.eras.prox = {};
  const R0 = C.ERA_REVOLTA; C.ERA_REVOLTA = 1e6;
  E.daily(S);
  C.ERA_REVOLTA = R0;
  check('a Revolta dos Panfletos agita o povo', S.chron.some((c) => /Folhas impressas/.test(c.text)) && S.stats.revoltas === 1);
}

// ---------- a pólvora na guerra e contra os piratas ----------
{
  const A = mundo(777, 50, 6);
  A.god.lv = 2; A.god.poder = 500;
  const B = Tb.criar(A);
  for (let k = 0; k < 50; k++) { const q = Sim.makePerson(B, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][(k + 13) % 30], 25); q.x = B.camp.x + 1; q.y = B.camp.y + 2; B.people.push(q); }
  for (const t of [A, B]) Sim.refresh(t);
  A.tech.known.metalurgia = { t: A.t, by: 'teste', how: 'pratica' };
  ergue(A, 'marcenaria'); ergue(A, 'ferraria'); ergue(A, 'arsenal');
  const par = Tb.par(A, A, B);
  par.contato = true; par.v = -90; par.ult = {};
  const vA = A.people.filter((p) => p.alive).length, vB = B.people.filter((p) => p.alive).length;
  let guerra = false;
  for (let d = 0; d < 40 && !guerra; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); guerra = par.hist.some((h) => /Guerra/.test(h.txt)); }
  const mA = vA - A.people.filter((p) => p.alive).length, mB = vB - B.people.filter((p) => p.alive).length;
  check('na guerra, com a pólvora, perde-se menos e o outro perde mais', guerra && mA < mB, mA + ' de cá, ' + mB + ' de lá');
  // os piratas não desembarcam
  A.eras.idade = 6; A.eras.prox = {};
  ergue(A, 'canoa'); A.buildings.push({ id: 99999, type: 'navio', built: true, x: 0, y: 0, w: 1, h: 1 });
  Object.assign(A.stock, { sal: 40 });
  const P0 = C.ERA_PIRATAS; C.ERA_PIRATAS = 1e6;
  E.daily(A);
  C.ERA_PIRATAS = P0;
  check('com o arsenal, os piratas não desembarcam', A.stock.sal === 40 && A.chron.some((c) => /trovão da pólvora/.test(c.text)));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
