// Gods · testes da 0.36: a raça da partida nova, chamar humanos, as classes, o nível de força e as habilidades.
// Uso: node test/rpg-test.js
globalThis.G = globalThis.G || {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'memoria', 'sociedade', 'gente', 'cidade', 'regioes', 'mar', 'eras', 'avatar', 'visita', 'tribos', 'rpg', 'save', 'offline']) require('../js/' + f + '.js');
G.CFG.WORLD_GEN = 1;
const { W, Sim, CFG: C, Povos: Pv, Rpg: R, Save, Family: F, Bichos: B, Tech: T, Narr: N } = G;

let ok = 0, bad = 0;
function check(name, cond, info) {
  if (cond) ok++; else bad++;
  if (!cond || process.env.V) console.log((cond ? 'ok    · ' : 'FALHA · ') + name + (info !== undefined ? ' · ' + info : ''));
}
const nova = (seed, raca) => { const w = W.generate(seed); return Sim.newGame(seed, W.bestSite(w), ['Ana', 'Beto'], w, raca); };

// ---------- a raça da partida ----------
{
  const H = nova(42), H2 = nova(42, 'humano');
  check('sem escolher, humanos, como sempre', !H.raca && H.people.every((p) => !p.povo && !p.sangue));
  check('escolher humanos é o mesmo mundo de sempre', H2.rng.s === H.rng.s && !H2.raca);
  for (const k of ['elfo', 'anao', 'fera']) {
    const S = nova(42, k);
    check(k + ': o casal é desse povo', S.raca === k && S.people.every((p) => p.povo === k && p.sangue[k] === 1 && p.velho === Pv.DEF[k].old));
    check(k + ': não fica esperando a própria caravana', S.povos.st[k].state === 'aqui' && Pv.outros(S).indexOf(k) < 0 && Pv.outros(S).indexOf('humano') >= 0);
    check(k + ': os humanos entram na fila das caravanas', Pv.nextKind(S) !== k);
    const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    check(k + ': o save guarda o povo fundador', R2.raca === k && R2.people.every((p) => p.povo === k));
    const v = N.visitorData(S, 'F', 25, 'mae', new Set());
    check(k + ': quem pede abrigo é do povo do mundo', v.povo === k);
    const h = N.visitorData(S, 'F', 25, 'mae', new Set(), 'humano');
    check(k + ': na caravana de humanos, humano', !h.povo);
  }
  const El = nova(7, 'elfo'), An = nova(7, 'anao');
  check('o elfo sozinho no mundo corta árvore', Pv.canWork(El.people[0], 'madeira', El));
  check('o anão sozinho no mundo pesca', Pv.canWork(An.people[0], 'pesca', An));
  const q = Sim.makePerson(El, 'M', 'Zé', 25); El.people.push(q); Pv.recount(El);
  check('chegou gente de fora: o elfo volta a não cortar', !Pv.canWork(El.people[0], 'madeira', El));
  const velho = nova(7);
  const e = Sim.makePerson(velho, 'F', 'Ela', 25); Pv.make(velho, e, 'elfo'); velho.people.push(e); Pv.recount(velho);
  check('em mundo de humanos o elfo segue sem cortar', !Pv.canWork(e, 'madeira', velho));
  const sv = Save.serialize(nova(11)); delete sv.raca;
  check('save antigo abre sem povo fundador', !Save.deserialize(JSON.parse(JSON.stringify(sv))).raca);
}
// ---------- chamar humanos ----------
{
  const S = nova(42); S.arrived = true;
  S.god.lv = 5; S.god.glory = 1e6; S.god.poder = 5000;
  const lv0 = C.POVO_CALL_LV; C.POVO_CALL_LV = 0;
  check('agora os humanos também podem ser chamados', Pv.callWhy(S, 'humano') === '', Pv.callWhy(S, 'humano'));
  const p0 = S.god.poder;
  check('chamar gasta o Poder e marca a caravana', Pv.call(S, 'humano') && S.god.poder === p0 - C.POVO_CALL && S.povos.due === 'humano');
  S.povos.due = null; S.povos.called = false;
  const g = Pv.spawn(S, 'humano');
  check('a caravana de humanos sai', !!g && g.povo === 'humano' && S.povos.st.humano.state === 'vindo', g && g.povo);
  check('enquanto vem, não dá para chamar outra', Pv.callWhy(S, 'humano') !== '');
  check('o aviso diz que vem vindo', /caminho/.test(Pv.status(S, 'humano')), Pv.status(S, 'humano'));
  const n0 = S.people.filter((p) => p.alive).length;
  // a caravana chega andando e pede para ficar; acolhida, entra no povo
  for (let s = 0; s < 720 * 4 && S.povos.st.humano.state !== 'aqui'; s++) { Sim.step(S, 2); S.events.length = 0; if (S.narr.groups[g.id] && S.narr.groups[g.id].state === 'esperando') N.decide(S, g.id, true); }
  check('acolhida, é gente nova e humana', S.povos.st.humano.state === 'aqui' && S.people.filter((p) => p.alive).length > n0 && S.people.filter((p) => p.alive).every((p) => !p.povo), S.people.length);
  C.POVO_CALL_LV = lv0;
}
// ---------- classes e nível ----------
{
  const S = nova(42); S.arrived = true;
  const a = S.people[0];
  check('ninguém nasce herói', !R.de(a) && R.nivel(a) === 0 && R.nome(a) === '');
  a.skills.pesca = 1e4;
  check('a profissão vem do melhor trabalho', /pescadora/i.test(R.profissao(a)), R.profissao(a));
  for (let k = 0; k < 8; k++) R.ganha(S, a, 4, 'luta');
  check('quem luta bastante desperta', !!R.de(a) && R.nivel(a) >= 1, a.rpg && a.rpg.cls);
  const hit0 = R.acerto(a, false), mor0 = R.mordida(a);
  a.rpg.xp = 0; a.rpg.nv = 4; R.ganha(S, a, R.pede(4), 'luta');
  check('no nível 5 chega a primeira habilidade', a.rpg.nv === 5 && a.rpg.habs.length === 1, a.rpg.habs.join());
  check('a força ajuda a acertar e a sofrer menos', R.acerto(a, false) > hit0 && R.mordida(a) < mor0);
  a.rpg.nv = 59; a.rpg.xp = 1e6; R.ganha(S, a, 1);
  check('o nível tem teto', a.rpg.nv === R.NIVEL_MAX && a.rpg.xp === 0, a.rpg.nv);
  // efeitos de cada habilidade
  const c = (cls, habs) => ({ alive: true, rpg: { cls, nv: 1, xp: 0, habs } });
  check('Pé ligeiro e Passada longa apressam', R.passo(c('arqueiro', ['veloz'])) === 1.1 && R.passo(c('explorador', ['passada'])) === 1.1 && R.passo(c('guerreiro', [])) === 1);
  check('Costas fortes carregam mais', R.cargaMult(c('explorador', ['carga'])) === 1.15);
  check('Couro grosso reduz a mordida', R.mordida(c('guerreiro', ['couraca'])) < R.mordida(c('guerreiro', [])));
  check('Tiro longo alcança mais', R.alcance(c('arqueiro', ['longo'])) === 2);
  check('todas as habilidades têm nome e cada classe tem três', Object.values(R.CLASSES).every((x) => x.habs.length === 3 && x.habs.every((h) => R.HABS[h])));
  // o povo puxa a classe
  const nasce = (k, n) => { const s = nova(n, k), p = s.people[0]; for (let i = 0; i < 8; i++) R.ganha(s, p, 4); return p.rpg.cls; };
  check('o anão tende a guerreiro, o elfo a arqueiro, a fera a caçador', nasce('anao', 3) === 'guerreiro' && nasce('elfo', 3) === 'arqueiro' && nasce('fera', 3) === 'cacador', [nasce('anao', 3), nasce('elfo', 3), nasce('fera', 3)].join());
  // a bênção
  const b = S.people[1]; S.god.poder = 200;
  const p0 = S.god.poder;
  check('Deus desperta quem ainda não despertou', R.abencoa(S, b) && !!R.de(b) && S.god.poder === p0 - R.BENCAO);
  check('uma bênção por dia', !R.abencoa(S, b) && /hoje/.test(R.bencaoWhy(S, b)));
  S.t += C.DAY_MIN + 1; S.ck = Sim.clock(S.t);
  const nv = b.rpg.nv;
  check('no outro dia, sobe o nível', R.abencoa(S, b) && b.rpg.nv > nv);
  S.god.poder = 0; S.t += C.DAY_MIN + 1;
  check('sem Poder, nada', !R.abencoa(S, b) && /Poder/.test(R.bencaoWhy(S, b)));
  // nem todo mundo é herói
  const V = nova(55); for (let k = 0; k < 20; k++) { const q = Sim.makePerson(V, k % 2 ? 'M' : 'F', 'P' + k, 25); q.x = V.camp.x; q.y = V.camp.y; V.people.push(q); }
  F.init(V);
  for (const p of V.people) for (let i = 0; i < 12; i++) R.ganha(V, p, 4, 'caca');
  check('só uma parte do povo desperta sozinha', R.herois(V).length <= Math.ceil(V.people.length * 0.25), R.herois(V).length);
  check('a criança não desperta', (() => { const k = Sim.makePerson(V, 'F', 'Kid', 8); V.people.push(k); for (let i = 0; i < 12; i++) R.ganha(V, k, 4); return !R.de(k); })());
  // salva e volta
  const R2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
  check('o save guarda a classe', R.nivel(R2.people.find((p) => p.id === b.id)) === b.rpg.nv);
  // sem gastar o sorteio do mundo
  const s0 = S.rng.s; for (let i = 0; i < 5; i++) R.daily(S);
  check('o dia do RPG não mexe no sorteio do mundo', S.rng.s === s0);
}
// ---------- cada povo aguenta começar sozinho ----------
{
  for (const k of ['elfo', 'anao', 'fera', 'humano']) {
    const S = nova(42, k); S.arrived = false;
    let err = '';
    try { for (let s = 0; s < 720 * 45 && !S.over; s++) { Sim.step(S, 2); if (s % 30 === 0) for (const p of S.people) if (p.alive && p.prayer) { const kind = G.God.PRAYER_HELP[p.prayer.kind]; if (kind && kind !== 'raio' && !G.God.canCast(S, kind)) G.God.cast(S, kind, Math.floor(p.x), Math.floor(p.y)); } S.events.length = 0; } } catch (e) { err = e.stack; }
    check(k + ': 45 dias sem erro', !err, err);
    check(k + ': o casal passa dos primeiros 45 dias', S.people.some((p) => p.alive), S.chron.slice(-2).map((c) => c.text).join(' | '));
    check(k + ': já levantou abrigo sozinho', S.buildings.some((b) => b.type === 'barraca' && b.built), S.buildings.map((b) => b.type + (b.built ? '' : '?')).join());
  }
}
console.log('unidades: ' + ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
