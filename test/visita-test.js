// Gods · testes da Etapa 22 (Outros jogadores), do lado do jogo. Uso: node test/visita-test.js
// (o servidor tem o teste dele: node test/backend-test.js)
// a abertura do mundo (no save e no resumo que vai ao ranking), o que dá para mandar e quanto custa, o recado que
// chega (cada ajuda, cada sabotagem, nunca duas vezes o mesmo), o que segura a sabotagem e o resumo do mundo visitado
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'save', 'offline']) require('../js/' + f + '.js');
const { W, Sim, Save, Visita: V, Family: F, God } = G;
let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
const w = W.generate(42, 128), S = Sim.newGame(42, W.bestSite(w), ['Iara', 'Aruã'], w);
for (let k = 0; k < 6; k++) { const q = Sim.makePerson(S, k % 2 ? 'M' : 'F', 'G' + k, 25); S.people.push(q); F.init(S); God.init(S); }
for (const p of S.people) p.fe = 50;
S.god.poder = 1000;
check('o mundo começa aberto só para ajuda', S.visita.abertura === 'ajuda' && Save.summary(S).abertura === 'ajuda');
V.setAbertura(S, 'aberto');
check('o resumo que vai ao ranking leva a abertura', Save.summary(S).abertura === 'aberto');
const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
check('o save guarda a abertura', S2.visita.abertura === 'aberto');
const alvoAjuda = { abertura: 'ajuda' }, alvoAberto = { abertura: 'aberto' };
check('para quem só aceita ajuda, sabotagem não sai', /só aceita ajuda/.test(V.atoWhy(S, 'praga', alvoAjuda)) && V.atoWhy(S, 'comida', alvoAjuda) === '');
check('mundo fechado não recebe nada', /fechado/.test(V.atoWhy(S, 'comida', { abertura: 'fechado' })));
const p0 = S.god.poder; V.pagar(S, 'milagre');
check('mandar custa o Poder do seu mundo', S.god.poder === p0 - V.ATOS.milagre.custo);
S.god.poder = 10;
check('sem Poder, não manda', /Poder/.test(V.atoWhy(S, 'comida', alvoAberto)));
// o recado chega
const peixe0 = S.stock.peixe || 0;
V.aplicar(S, { id: 'r1', tipo: 'comida', deNome: 'Ana' });
check('a comida chega ao estoque, e a Crônica diz quem mandou', S.stock.peixe === peixe0 + 40 && S.chron.some((c) => /Ana/.test(c.text)));
V.aplicar(S, { id: 'r1', tipo: 'comida', deNome: 'Ana' });
check('o mesmo recado não se aplica duas vezes', S.stock.peixe === peixe0 + 40);
const fe0 = S.people.map((p) => p.fe);
V.aplicar(S, { id: 'r2', tipo: 'boato', deNome: 'Zé' });
check('o boato baixa a fé (sem matar ninguém)', S.people.every((p, i) => p.fe <= fe0[i]) && S.people.every((p) => p.alive));
S.stock.agua = 30;
for (const p of S.people) p.fe = 95;
V.aplicar(S, { id: 'r3', tipo: 'seca', deNome: 'Zé' });
check('com a fé alta do povo, a sabotagem é segurada', S.stock.agua === 30 && S.stats.sabotagensSeguradas === 1 && S.chron.some((c) => /segurou/.test(c.text)));
for (const p of S.people) { p.fe = 40; p.needs.saude = 30; }
V.aplicar(S, { id: 'r4', tipo: 'milagre', deNome: 'Ana' });
check('o milagre sara todo mundo', S.people.every((p) => p.needs.saude === 100));
const r = V.resumoDe(S);
check('o resumo do mundo visitado traz o ano, quantos vivem e a Crônica', r.vivos === S.people.length && r.cronica.length > 0 && r.ano >= 1);
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
