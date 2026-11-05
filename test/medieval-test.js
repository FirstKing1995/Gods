// Gods · testes da 0.29: a Idade Média (o que pede, o moinho, o castelo, a magia das estrelas, a Grande Peste).
// Uso: node test/medieval-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Eras: E, Cidade: Ci, Tribos: Tb, Campo: K } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed, n) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  for (let k = 0; k < (n || 0); k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][k % 30], 25); q.x = S.camp.x + 1; q.y = S.camp.y + 2; S.people.push(q); }
  G.Family.init(S); Sim.refresh(S); E.init(S);
  return S;
}
function ergue(S, t) {
  for (let r = 3; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); Sim.complete(S, b); return b; }
  }
  return null;
}

{
  check('a Idade Média é a sexta idade', E.IDADES.length === 6 && E.IDADES[5].nome === 'Idade Média');
  const S = mundo(42, 70);
  check('nos Reinos ainda não há moinho nem castelo', Ci.openWhy(S, 'moinho') !== '' && Ci.openWhy(S, 'castelo') !== '');
  S.eras.idade = 4;
  ergue(S, 'marcenaria');   // obra com tábuas pede a marcenaria (regra da Etapa 16)
  check('nos Reinos, o moinho abre', Ci.openWhy(S, 'moinho') === '');
  check('o castelo abre com 60 pessoas', Ci.openWhy(S, 'castelo') === '', Ci.openWhy(S, 'castelo'));
  check('o castelo é grande obra', Ci.GRANDES.indexOf('castelo') >= 0 && C.BUILD.castelo.grande);
  const falta = E.faltaWhy(S);
  check('para a Idade Média falta gente e o moinho ou o castelo', /120 pessoas/.test(falta) && /moinho ou castelo/.test(falta), falta);
  // o moinho faz a roça render mais
  const r0 = E.rocaMult(S);
  ergue(S, 'moinho');
  check('com o moinho, a roça rende ' + Math.round((C.MOINHO_ROCA - 1) * 100) + '% mais', Math.abs(E.rocaMult(S) - r0 * C.MOINHO_ROCA) < 1e-9);
  // o castelo: menos malfeito
  const c0 = E.crimeMult(S);
  ergue(S, 'castelo');
  check('com o castelo, o malfeito cai ' + Math.round((1 - C.CASTELO_CRIME) * 100) + '%', Math.abs(E.crimeMult(S) - c0 * C.CASTELO_CRIME) < 1e-9);
  // com gente bastante, passa para a Idade Média
  for (let k = 0; k < 60; k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][(k + 7) % 30], 22); q.x = S.camp.x + 2; q.y = S.camp.y + 3; S.people.push(q); }
  if (G.Deus) { S.god.saber = S.god.saber || {}; S.god.saber.escrita = S.t; }
  E.daily(S);
  check('com 120 pessoas, a escrita e o castelo: Idade Média', E.idade(S) === 5, E.faltaWhy(S));
  check('a Crônica conta', S.chron.some((c) => /Idade Média/.test(c.text)));
  // a reforma em ardósia
  for (let d = 0; d < 40; d++) E.reforma(S);
  check('em algumas semanas, as obras ficam no jeito da Idade Média', S.buildings.filter((b) => b.built).every((b) => b.era === 5));
  // a Grande Peste
  S.eras.prox = {};
  const C0 = C.ERA_PESTE; C.ERA_PESTE = 1e6;   // força o sorteio
  const doentes0 = S.people.filter((p) => p.sick).length;
  E.daily(S);
  C.ERA_PESTE = C0;
  const doentes = S.people.filter((p) => p.sick).length;
  check('a Grande Peste derruba de uma vez uns ' + Math.round(C.PESTE_PARTE * 100) + '% do povo', doentes - doentes0 >= Math.round(S.people.filter((p) => p.alive).length * C.PESTE_PARTE) - 2 && S.chron.some((c) => /Grande Peste/.test(c.text)), (doentes - doentes0) + ' doentes');
  check('e só volta depois de uns anos', S.eras.prox.peste > S.t + 2 * C.YEAR_DAYS * DAYM);
}

// ---------- o castelo na guerra entre tribos ----------
{
  const A = mundo(777, 10);
  A.god.lv = 2; A.god.poder = 500;
  const B = Tb.criar(A);
  for (let k = 0; k < 10; k++) { const q = Sim.makePerson(B, k % 2 ? 'M' : 'F', Sim.namePool[k % 2 ? 'MASC' : 'FEM'][(k + 15) % 30], 25); q.x = B.camp.x + 1; q.y = B.camp.y + 2; B.people.push(q); }
  for (const T of [A, B]) Sim.refresh(T);
  ergue(A, 'castelo');
  const par = Tb.par(A, A, B);
  par.contato = true; par.v = -90; par.ult = {};
  const vA = A.people.filter((p) => p.alive).length, vB = B.people.filter((p) => p.alive).length;
  let guerra = false;
  for (let d = 0; d < 40 && !guerra; d++) { A.t += DAYM; B.t += DAYM; Tb.passo(A); guerra = par.hist.some((h) => /Guerra/.test(h.txt)); }
  check('na guerra, quem tem castelo não perde ninguém', guerra && A.people.filter((p) => p.alive).length === vA && B.people.filter((p) => p.alive).length < vB, vA + '/' + vB);
  check('e a Crônica conta o castelo', par.hist.some((h) => /castelo/.test(h.txt)));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
