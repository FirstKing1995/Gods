// Gods · testes da 0.27: os cinco poderes novos dos escolhidos e a reforma das construções a cada idade.
// Uso: node test/poderes-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'save']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Deus: D, Campo: K, Tech: T, Eras: E } = G;
const DAYM = 1440;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
function mundo(seed) {
  const w = W.generate(seed), S = Sim.newGame(seed, W.bestSite(w), ['Iara', 'Aruã'], w);
  S.arrived = true;
  return S;
}
function obra(S, t, from) {
  for (let r = from || 3; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) { const b = Sim.placeBlueprint(S, t, x, y); return b; }
  }
  return null;
}

// ---------- os poderes ----------
{
  check('os oito poderes têm nome, ícone, descrição, título e o que se perde', Object.keys(D.POWERS).length === 8 &&
    Object.keys(D.POWERS).every((k) => D.POWERS[k].name && D.POWERS[k].icon && D.POWERS[k].desc && D.POWER_WHAT[k]));
  const S = mundo(42), [a, b] = S.people;
  a.escolhido = { power: 'forca', t: S.t };
  check('a Força é sentida perto, não longe', D.poderPerto(S, a.x + 2, a.y, 'forca', C.ESC_FORCA_R) && !D.poderPerto(S, a.x + 30, a.y, 'forca', C.ESC_FORCA_R));
  check('um poder não vale pelo outro', !D.poderPerto(S, a.x, a.y, 'paz', 50));
  a.inTent = 1; S.t++;
  check('dentro da barraca, o poder não alcança ninguém', !D.poderPerto(S, a.x, a.y, 'forca', 5));
  a.inTent = 0; S.t++;
  // Semear: a roça perto rende mais
  S.tech.known.roca = { t: S.t, by: 'teste', how: 'pratica' };
  const r = obra(S, 'roca', 4);
  Sim.complete(S, r);
  r.farm = r.farm || {}; r.farm.k = 'milho';
  a.escolhido = null; S.t++;
  const sem = K.yieldOf(S, r);
  a.escolhido = { power: 'colheita', t: S.t }; a.x = r.x + 1; a.y = r.y + 1; S.t++;
  const com = K.yieldOf(S, r);
  check('Semear: a roça perto rende ' + Math.round((C.ESC_COLHEITA - 1) * 100) + '% mais', com >= Math.round(sem * C.ESC_COLHEITA) - 1 && com > sem, sem + ' → ' + com);
  // Sabedoria: a prática das descobertas anda mais perto do sábio
  b.escolhido = { power: 'sabedoria', t: S.t }; S.t++;
  const aberta = T.open(S);
  if (aberta) {
    const p0 = S.tech.prat[aberta] || 0;
    T.addPractice(S, aberta, 1, a);
    check('a prática soma normalmente', (S.tech.prat[aberta] || 0) - p0 === 1);
  }
  check('Sabedoria: perto do sábio conta', D.poderPerto(S, b.x, b.y, 'sabedoria', C.ESC_SABIO_R));
  // Paz: com a Paz, a briga de quem está perto acaba mais cedo
  b.escolhido = { power: 'paz', t: S.t };
  a.x = b.x + 1; a.y = b.y;
  a.feud = { [b.id]: S.t + 3 * DAYM };
  const fim0 = a.feud[b.id];
  S.god.pending = S.god.pending || [];
  D.hourly(S);
  check('Paz: a briga perto do Pacificador acaba ' + C.ESC_PAZ_H + ' h mais cedo por hora', a.feud[b.id] === fim0 - C.ESC_PAZ_H * 60, (fim0 - a.feud[b.id]) / 60 + ' h');
  check('Paz: o título', D.title(b) === (b.sex === 'F' ? 'Pacificadora' : 'Pacificador'));
}

// ---------- a reforma a cada idade ----------
{
  const S = mundo(777);
  E.init(S);
  for (let k = 0; k < 20; k++) { const bb = obra(S, 'barraca', 3); if (bb) Sim.complete(S, bb); }
  const casas = S.buildings.filter((x) => x.built);
  check('erguidas na Pedra Lascada, ficam no jeito dela', casas.length >= 10 && casas.every((x) => (x.era || 0) === 0), casas.length + ' casas');
  S.eras.idade = 3;
  E.reforma(S);
  const n1 = casas.filter((x) => x.era === 3).length;
  check('na Idade do Ferro, a reforma começa por poucas', n1 >= 1 && n1 <= Math.ceil(casas.length * C.REFORMA_DIA), n1 + ' de ' + casas.length);
  check('e a Crônica conta', S.chron.some((c) => /refazer as casas/.test(c.text)));
  for (let d = 0; d < 40; d++) E.reforma(S);
  check('em algumas semanas, todas no jeito novo', casas.every((x) => x.era === 3));
  const nova = obra(S, 'barraca', 3); Sim.complete(S, nova);
  check('a casa nova já nasce no jeito da idade', nova.era === 3);
  const chr = S.chron.length; E.reforma(S);
  check('a Crônica não repete', S.chron.length === chr);
  // o save guarda a idade de cada construção
  const S2 = G.Save.deserialize(JSON.parse(JSON.stringify(G.Save.serialize(S))));
  check('o save guarda o jeito de cada construção', S2.buildings.filter((x) => x.built).every((x) => x.era === 3));
}

console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
