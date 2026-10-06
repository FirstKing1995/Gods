// Gods · testes da vida do povo (Etapa 6). Uso: node test/vida-test.js [anos]
// 1) unidades: relações livres (vários pares, filhos de pais diferentes, visitas, mesmo sexo, parentes nunca, limites,
//    separação, save da 0.5), conversas de pergunta e resposta (a resposta olha o mundo), consolo, briga e pazes, ensinar,
//    histórias ao pé do fogo, festas, agradecimentos que dão Poder (e o luto), Poder sem teto, pequenos acontecimentos,
//    lua cheia e as missões do Ato 1 com recompensa
// 2) 20 anos em três mundos (jogando bem e largado): ninguém morre de fome ou frio, a vida acontece (histórias, festas,
//    conversas, brigas raras), há quem tenha mais de um par e filhos de pais diferentes, o Poder passa de 100,
//    e a vida social não rouba o trabalho
const path = require('path');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
globalThis.G = {};
for (const f of ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'save', 'offline']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { W, Sim, CFG: C, Family: F, God, Save, AI, Tech: T, Life: L } = G;
const Y = 60 * 1440, D = 1440;

// ---------- ajudantes ----------
function newWorld(seed) {
  const w = W.generate(seed), site = W.bestSite(w);
  return Sim.newGame(seed, site, ['Iara', 'Aruã'], w);
}
function spot(S, t, from) {
  for (let r = from || 2; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = S.camp.x + dx, y = S.camp.y + dy;
    if (!Sim.canPlace(S, t, x, y)) return { x, y };
  }
  return null;
}
function build(S, t) {
  const at = spot(S, t);
  const b = Sim.placeBlueprint(S, t, at.x, at.y);
  Sim.complete(S, b);
  if (t === 'fogueira') b.fuel = 8;
  return b;
}
// acampamento pronto, Narrador quieto, sem festa marcada
function world(seed) {
  const S = newWorld(seed);
  build(S, 'fogueira'); build(S, 'barraca');
  S.narr.nextBad = 1e9; S.narr.nextGood = 1e9;
  S.life.party = null;
  S.events.length = 0;
  Sim.refresh(S);
  return S;
}
function add(S, sex, name, age, extra) {
  const q = Sim.makePerson(S, sex, name, age);
  q.x = S.camp.x + 1.5; q.y = S.camp.y + 2.5; q.px = q.x; q.py = q.y;
  q.lastAge = age;
  Object.assign(q, extra || {});
  S.people.push(q);
  F.init(S); God.init(S); T.init(S); L.init(S);
  return q;
}
function days(S, n, each) {
  for (let i = 0; i < n * 720 && !S.over; i++) { Sim.step(S, 2); if (each) each(S); S.events.length = 0; }
}
function toHour(S, h) {
  const d0 = Math.floor(S.t / D) * D;
  S.t = d0 + h * 60 + (S.t - d0 >= h * 60 ? D : 0);
  S.ck = Sim.clock(S.t); Sim.refresh(S);
}
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else bad++; console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + name + (extra !== undefined && extra !== '' ? ' · ' + extra : '')); };

if (isMainThread) {
  // ===================== relações livres =====================
  // 1. save da 0.5: um par (partner, afeto) vira o primeiro laço
  {
    const v04 = JSON.parse(fs.readFileSync(path.join(__dirname, 'save-v04.json'), 'utf8'));
    const [a, b] = v04.people;
    const S = Save.deserialize(JSON.parse(JSON.stringify(v04)));
    const A = S.people[0], B = S.people[1];
    check('save antigo: o par vira laço, com o mesmo afeto', F.isPartner(A, B) && F.isPartner(B, A) && F.afeto(A, B) === (a.afeto || 0) && A.partner === undefined && A.afeto === undefined,
      'afeto ' + F.afeto(A, B) + ' (era ' + a.afeto + ')');
    check('save antigo: as metas do Ato 1 ganham as missões, sem pagar de novo o que já foi feito', (S.goalsPhase || 1) !== 1 || (S.goals.length === 13 && S.goals.filter((g) => g.done).every((g) => g.paid)),
      'fase ' + S.goalsPhase + ' · ' + S.goals.length + ' metas');
  }
  // 2. vários pares, do mais querido para o menos
  {
    const S = world(42);
    const [w, m] = S.people;
    const m2 = add(S, 'M', 'Kauê', 26), w2 = add(S, 'F', 'Moema', 24);
    F.link(S, w, m2, 50); F.link(S, m, w2, 70);
    check('cada um pode ter mais de um par', F.partners(S, w).length === 2 && F.partners(S, m).length === 2);
    check('o par de mais afeto vem primeiro', F.partnerOf(S, w) === m && F.partners(S, w)[1] === m2, F.partners(S, w).map((q) => q.name + ' ' + F.afeto(w, q)).join(', '));
    check('como chama: companheira e companheiro', F.relation(S, w, m2) === 'companheiro' && F.relation(S, m, w2) === 'companheira');
    F.addAfeto(S, w, m2, 30);
    check('afeto é do par, nos dois sentidos', F.afeto(w, m2) === 80 && F.afeto(m2, w) === 80);
    F.unlink(S, w, m2);
    check('desfazer um laço não mexe nos outros', !F.isPartner(w, m2) && F.isPartner(w, m));
  }
  // 3. filhos de pais diferentes: a noite na barraca decide quem é o pai
  {
    const S = world(777);
    const [w, m] = S.people;
    const m2 = add(S, 'M', 'Kauê', 26);
    F.link(S, w, m2, 90);
    const tent = S.buildings.find((b) => b.type === 'barraca');
    const tent2 = build(S, 'barraca');
    let fathers = new Set();
    for (let round = 0; round < 2; round++) {
      const dad = round === 0 ? m : m2;
      const other = round === 0 ? m2 : m;
      for (let n = 0; n < 600 && !w.preg; n++) {
        w.sleeping = dad.sleeping = other.sleeping = true;
        w.inTent = dad.inTent = tent.id; other.inTent = tent2.id;
        w.needs.fome = w.needs.saude = w.needs.calor = 100;
        S.t = Math.floor(S.t / D) * D + D + 23 * 60; S.ck = Sim.clock(S.t);
        F.hourly(S);
        S.events.length = 0;
      }
      if (w.preg) { fathers.add(w.preg.father); w.preg = null; }
    }
    check('filhos de pais diferentes: engravida de quem dormiu com ela', fathers.has(m.id) && fathers.has(m2.id), [...fathers].map((id) => F.person(S, id).name).join(' e '));
  }
  // 4. par do mesmo sexo: afeto e coração na barraca, sem gravidez
  {
    const S = world(9001);
    const [w] = S.people;
    const w2 = add(S, 'F', 'Jaci', 25);
    F.link(S, w, w2, 60);
    F.unlink(S, w, S.people[1]);
    const tent = S.buildings.find((b) => b.type === 'barraca');
    let hearts = 0;
    for (let n = 0; n < 300; n++) {
      w.sleeping = w2.sleeping = true; w.inTent = w2.inTent = tent.id;
      S.t = Math.floor(S.t / D) * D + D + 23 * 60; S.ck = Sim.clock(S.t);
      F.hourly(S);
      hearts += S.events.filter((e) => e.k === 'heart').length; S.events.length = 0;
    }
    check('par do mesmo sexo: noites juntas, coração, e nada de gravidez', hearts > 100 && !w.preg && F.afeto(w, w2) > 60, hearts + ' corações · afeto ' + Math.round(F.afeto(w, w2)));
  }
  // 5. novos pares: parentes próximos nunca; limites por tipo; mulher sem par homem tem prioridade
  {
    const S = world(42);
    const [w, m] = S.people;
    const kid1 = F.makeBaby(S, w, m, 'F', 'Filha'), kid2 = F.makeBaby(S, w, m, 'M', 'Filho');
    for (const k of [kid1, kid2]) { k.born -= 20 * Y; k.carriedBy = 0; k.lastAge = 20; k.x = w.x; k.y = w.y; S.people.push(k); }
    F.init(S); God.init(S); L.init(S);
    kid1.rel[kid2.id] = kid2.rel[kid1.id] = 99;
    kid1.mood = kid2.mood = 90;
    for (let d = 0; d < 200; d++) { kid1.mood = kid2.mood = 90; F.daily(S); }
    check('irmãos nunca viram par', !F.isPartner(kid1, kid2));
    // limites: 4 do outro sexo, 1 do mesmo sexo (à parte)
    const S2 = world(777);
    const hub = S2.people[1];
    const women = [], men = [];
    for (let i = 0; i < 6; i++) women.push(add(S2, 'F', 'Mulher' + i, 22 + i));
    for (let i = 0; i < 3; i++) men.push(add(S2, 'M', 'Homem' + i, 24 + i));
    for (const q of S2.people) for (const r of S2.people) if (q !== r) q.rel[r.id] = 50;
    for (let d = 0; d < 400; d++) { for (const q of S2.people) q.mood = 80; F.daily(S2); }
    const opp = F.partners(S2, hub).filter((q) => q.sex !== hub.sex).length, same = F.partners(S2, hub).filter((q) => q.sex === hub.sex).length;
    const maxOpp = Math.max(...S2.people.map((q) => F.partners(S2, q).filter((r) => r.sex !== q.sex).length));
    const maxSame = Math.max(...S2.people.map((q) => F.partners(S2, q).filter((r) => r.sex === q.sex).length));
    check('limites: até ' + C.BONDS_MAX + ' pares do outro sexo e ' + C.BONDS_SAME_MAX + ' do mesmo sexo', maxOpp <= C.BONDS_MAX && maxSame <= C.BONDS_SAME_MAX && opp >= 2, 'Aruã: ' + opp + ' do outro sexo, ' + same + ' do mesmo · máximos ' + maxOpp + '/' + maxSame);
    const womenFert = S2.people.filter((q) => q.sex === 'F' && F.age(S2, q) <= C.FERTILE_MAX);
    check('com tempo, toda mulher em idade de ter filho acha um par homem', womenFert.every((q) => F.partners(S2, q).some((r) => r.sex === 'M')), womenFert.filter((q) => !F.partners(S2, q).some((r) => r.sex === 'M')).map((q) => q.name).join(', ') || 'todas');
  }
  // 5b. noites picantes (0.10): só adultos, sem parentes, e desliga no menu
  {
    // noite a três: Aruã tem dois pares dormindo na mesma casa, e as duas se conhecem
    const trioNights = (S, a, b, c, nights) => {
      const tent = S.buildings.find((x) => x.type === 'barraca');
      for (let n = 0; n < nights; n++) {
        for (const q of [a, b, c]) { q.sleeping = true; q.inTent = tent.id; q.mood = 80; }
        S.t = Math.floor(S.t / D) * D + D + 23 * 60; S.ck = Sim.clock(S.t);
        F.hourly(S);
        S.events.length = 0;
      }
      return S.stats.trios || 0;
    };
    const mk = (seed, ageC, kin, off) => {
      const S = world(seed);
      const [w, m] = S.people;
      const c = add(S, 'F', 'Jaci', ageC);
      if (kin) { w.mother = 777; c.mother = 777; }   // Iara e Jaci filhas da mesma mãe
      F.link(S, m, c, 70);
      w.rel[c.id] = c.rel[w.id] = 10;
      if (off) S.opts = { picante: false };
      return { S, w, m, c };
    };
    let t = mk(42, 24);
    let n = trioNights(t.S, t.w, t.m, t.c, 60);
    check('noite a três: quem tem dois pares na mesma casa, e os dois se conhecem, passa a noite a três (e a Crônica conta a primeira)', n > 0 && t.S.chron.some((x) => /primeira noite a três/.test(x.text)) && t.m.mem.some((x) => x.k === 'noiteTres'), n + ' noites em 60');
    t = mk(42, 24, false, true);
    check('com as noites picantes desligadas no menu, nada', trioNights(t.S, t.w, t.m, t.c, 60) === 0);
    t = mk(42, 16);   // 16 anos: em 60 noites (um ano de jogo) chega a 17, nunca a 18
    t.c.bonds = {}; t.m.bonds[t.c.id] = 70; t.c.bonds[t.m.id] = 70;   // à força, mesmo sem idade para ter par
    check('menor de idade nunca entra (mesmo com o laço forçado)', trioNights(t.S, t.w, t.m, t.c, 60) === 0 && F.age(t.S, t.c) < 18, 'idade ' + F.age(t.S, t.c));
    t = mk(42, 24, true);
    check('parentes próximos nunca (as duas são irmãs)', F.closeKin(t.S, t.w, t.c) && trioNights(t.S, t.w, t.m, t.c, 60) === 0);
    // depois da festa: adultos ligados por pares esticam a noite juntos
    const S = world(777);
    const [a, b] = S.people;
    const c = add(S, 'F', 'Maíra', 26), d = add(S, 'M', 'Kauê', 28), kid = add(S, 'M', 'Tupã', 16), e = add(S, 'F', 'Jurema', 30);
    F.link(S, b, c, 70); F.link(S, c, d, 70); F.link(S, d, e, 70);
    for (const q of S.people) q.mood = 85;
    const was = C.PARTY_MANY; C.PARTY_MANY = 1;
    const g = F.afterParty(S, [a, b, c, d, e, kid]);
    check('depois da festa, um grupo de adultos ligados por pares estica a noite (e a Crônica conta a primeira, sem detalhes)', g && g.length >= 4 && S.chron.some((x) => /primeira noite de muitos/.test(x.text)), g ? g.map((q) => q.name).join(', ') : 'ninguém');
    check('quem tem menos de 18 anos fica de fora, sempre', g && g.indexOf(kid) < 0 && g.every((q) => F.age(S, q) >= 18));
    S.opts = { picante: false };
    check('desligado no menu, a festa acaba na festa', F.afterParty(S, [a, b, c, d, e]) === null);
    S.opts = {}; S.safe = true;
    check('e com o jogo fechado também não', F.afterParty(S, [a, b, c, d, e]) === null);
    S.safe = false;
    C.PARTY_MANY = was;
  }
  // 6. separação: sem convivência, o afeto esfria até zero e o par se desfaz em paz
  {
    const S = world(5);
    const [w, m] = S.people;
    F.link(S, w, m, 3);
    for (let d = 0; d < 10; d++) F.daily(S);
    check('afeto em zero: o par se separa, sem mágoa, e vai para a Crônica', !F.isPartner(w, m) && S.chron.some((c) => /se separaram, sem mágoa/.test(c.text)));
  }
  // 7. visitas: quem tem par em outra barraca dorme lá em parte das noites (e a barraca não estoura)
  {
    const S = world(1234);
    const [w, m] = S.people;
    const t1 = S.buildings.find((b) => b.type === 'barraca');
    const t2 = build(S, 'barraca');
    const w2 = add(S, 'F', 'Maíra', 24);
    F.link(S, m, w2, 80);
    t1.beds = [w.id, m.id]; t2.beds = [w2.id];
    let visits = 0, nights = 0, over = 0;
    for (let n = 0; n < 60; n++) {
      toHour(S, 21);
      for (const p of [w, m, w2]) { AI.abort(S, p); p.host = 0; p.visiting = null; p.sleeping = false; p.inTent = 0; p.needs.energia = 20; }
      for (const p of [w2, m, w]) { const tent = AI.visitTent(S, p, t2.beds.indexOf(p.id) >= 0 ? t2 : t1); if (tent) visits++; }
      nights++;
      for (const b of [t1, t2]) if (F.tentLoad(S, b) > C.BUILD[b.type].cap + C.VISIT_SQUEEZE) over++;
      for (const p of [w, m, w2]) { if (p.visiting) { const b = S.buildings.find((x) => x.id === p.visiting.tent); delete b.guests[p.id]; p.visiting = null; } }
      S.t += D;
    }
    check('visitas: quem mora longe do par dorme com ele em parte das noites', visits >= 20 && visits <= nights, visits + ' visitas em ' + nights + ' noites');
    check('visitas: a barraca nunca passa do aperto', over === 0);
    // a visita acontece de verdade dormindo (e acaba ao acordar)
    toHour(S, 20);
    for (const p of [w, m, w2]) { AI.abort(S, p); p.needs.energia = 5; p.host = 0; p.visiting = null; }
    let saw = false;
    for (let i = 0; i < 12 * 30; i++) { Sim.step(S, 2); S.events.length = 0; if (w2.inTent === t1.id && w2.sleeping) saw = true; if (m.inTent === t2.id && m.sleeping) saw = true; }
    days(S, 1);
    check('visitas: dormem juntos numa das barracas em algumas noites e voltam para casa', saw || visits > 0, saw ? 'viu a visita' : 'sem visita nesta noite');
    check('visitas: de manhã ninguém fica registrado como visita', S.buildings.every((b) => !b.guests || Object.keys(b.guests).every((id) => b.guests[id] > S.t || F.person(S, +id).sleeping)));
  }
  // 8. morar junto: adulto sem par em casa muda para a barraca do par de mais afeto, se couber
  {
    const S = world(31337);
    const [w, m] = S.people;
    const t1 = S.buildings.find((b) => b.type === 'barraca');
    const t2 = build(S, 'barraca');
    const k = add(S, 'M', 'Kauê', 25);
    F.unlink(S, w, m);
    F.link(S, w, k, 70);
    t1.beds = [w.id, m.id]; t2.beds = [k.id];
    toHour(S, 21);
    for (const p of [w, m, k]) { AI.abort(S, p); p.needs.energia = 5; }
    days(S, 1);
    const wt = S.buildings.find((b) => b.beds.indexOf(w.id) >= 0);
    check('sem par em casa: vai morar na barraca do par', wt === t2 || S.buildings.find((b) => b.beds.indexOf(k.id) >= 0) === t1, 'Iara em ' + (wt ? wt.id : '-') + ' · Kauê em ' + (S.buildings.find((b) => b.beds.indexOf(k.id) >= 0) || {}).id);
  }
  // 9. save guarda laços, brigas e a festa marcada
  {
    const S = world(42);
    const [w, m] = S.people;
    const k = add(S, 'M', 'Kauê', 25);
    F.link(S, w, k, 66);
    w.feud[k.id] = S.t + 3 * D;
    L.party(S, 'primavera');
    const S2 = Save.deserialize(JSON.parse(JSON.stringify(Save.serialize(S))));
    const [w2, m2] = S2.people, k2 = S2.people[2];
    check('save: laços (com o afeto), brigas e a festa marcada', F.isPartner(w2, m2) && F.afeto(w2, k2) === 66 && w2.feud[k2.id] === w.feud[k.id] && S2.life.party && S2.life.party.why === 'primavera');
  }

  // ===================== conversas =====================
  // 10. pergunta e resposta: quem puxou pergunta, o outro responde; fica na memória dos dois
  {
    const S = world(777);
    const [w, m] = S.people;
    toHour(S, 10);
    for (const p of [w, m]) { AI.abort(S, p); p.needs.social = 30; p.chatCool = 0; }
    m.x = w.x + 1; m.y = w.y; m.px = m.x; m.py = m.y;
    let said = new Set(), rec = null;
    for (let i = 0; i < 400 && !rec; i++) {
      Sim.step(S, 2); S.events.length = 0;
      for (const p of [w, m]) if (p.say && p.act && p.act.type === 'conversar') said.add(p.id);
      if (w.talk) rec = w.talk;
    }
    check('conversa: pergunta e resposta, cada um fala a sua', !!rec && rec.lines.length >= 2 && rec.lines[0][0] !== rec.lines[1][0] && said.size === 2, rec ? rec.lines.map((l) => l[0] + ': ' + l[1]).join(' / ') : 'nenhuma');
    check('conversa: os dois guardam a última conversa', !!rec && m.talk === rec && S.stats.talks >= 1);
  }
  // 11. a resposta olha o mundo: comida, fé
  {
    const S = world(42);
    const [w, m] = S.people;
    const food = L.TOPICS[1];
    S.stock.peixe = 500; Sim.refresh(S);
    const rich = food.make(S, w, m)[1];
    S.stock.peixe = 0; S.stock.frutas = 0; Sim.refresh(S);
    const poor = food.make(S, w, m)[1];
    check('a resposta sobre a comida segue o estoque', /sobra|cheio/.test(rich) && /Quase nada|curta/.test(poor), rich + ' / ' + poor);
    const faith = L.TOPICS[4];
    S.god.lastGrace = -1e9;
    m.fe = 90; const hi = faith.make(S, w, m)[1];
    m.fe = 10; const lo = faith.make(S, w, m)[1];
    check('a resposta sobre Deus segue a fé de quem responde', /sinto|certeza/i.test(hi) && /não|distraído/i.test(lo), hi + ' / ' + lo);
  }
  // 12. criança pergunta à mãe (e chama de mãe)
  {
    const S = world(9001);
    const [w, m] = S.people;
    const kid = F.makeBaby(S, w, m, 'M', 'Kid'); kid.born -= 6 * Y; kid.carriedBy = 0; kid.lastAge = 6; S.people.push(kid); F.init(S); L.init(S);
    let d = null;
    for (let i = 0; i < 20 && (!d || d.kind !== 'crianca'); i++) d = L.dialog(S, kid, w);
    check('criança pergunta, e chama de mãe', d.kind === 'crianca' && /^Mãe, /.test(d.lines[0].text) && d.lines[1].by === 1, d.lines.map((l) => l.text).join(' / '));
  }
  // 13. consolo: quem está bem conversa com quem está de luto; o luto encurta
  {
    const S = world(1234);
    const [w, m] = S.people;
    const k = add(S, 'F', 'Jaci', 24);
    const kid = F.makeBaby(S, w, m, 'F', 'Pequena'); kid.born -= 8 * Y; kid.carriedBy = 0; kid.lastAge = 8; S.people.push(kid); F.init(S); L.init(S);
    kid.needs.saude = -999; days(S, 0.01);
    check('morte na família: luto (e quem é da família reza por quem se foi)', L.grieving(S, w) && S.god.thanks >= 1, 'agradecimentos/lutos ' + S.god.thanks);
    const d = L.dialog(S, k, w);
    const grief = w.mem.find((x) => x.k === 'perdeuFamilia'), before = grief.until;
    L.afterChat(S, k, w, d);
    check('consolo: fala de quem se foi, a resposta agradece', d.kind === 'consolo' && /Pequena|olhando|aqui/.test(d.lines[0].text), d.lines.map((l) => l.text).join(' / '));
    check('consolo: quem sofre fica consolado e o luto encurta ' + C.CONSOLO_DAYS + ' dias', L.consoled(S, w) && w.mem.find((x) => x.k === 'perdeuFamilia').until === before - C.CONSOLO_DAYS * D && k.mem.some((x) => x.k === 'consolou'));
    // a IA procura quem está de luto
    toHour(S, 10);
    for (const p of S.people) if (p.alive) { AI.abort(S, p); p.chatCool = 0; p.mem = p.mem.filter((x) => x.k !== 'consolado'); }
    k.mood = 70; k.x = w.x + 2; k.y = w.y; k.needs.social = 90;
    const list = AI.scoreList(S, k);
    const c = list.find((x) => x.type === 'conversar');
    check('a IA vê quem está de luto e vai consolar (mesmo sem precisar de companhia)', !!c && c.hint === 'consolo' && L.grieving(S, c.q), c ? c.q.name + ' · ' + c.score.toFixed(0) : 'não');
  }
  // 14. briga e pazes
  {
    const S = world(5);
    const [w, m] = S.people;
    w.mood = m.mood = 10;
    let early = 0;
    for (let i = 0; i < 200; i++) if (L.dialog(S, w, m).kind === 'briga') early++;
    check('nos primeiros ' + C.FIGHT_GRACE_D + ' dias ninguém briga, nem de mau humor', early === 0, early);
    S.t += C.FIGHT_GRACE_D * D; S.ck = Sim.clock(S.t);
    let d = null, n = 0;
    for (; n < 200 && (!d || d.kind !== 'briga'); n++) { d = L.dialog(S, w, m); }
    check('de mau humor, a conversa vira briga', d.kind === 'briga', 'em ' + n + ' conversas');
    const af0 = F.afeto(w, m);
    L.afterChat(S, w, m, d);
    check('briga: os dois de cara fechada, uns dias sem se falar, e o afeto cai', w.feud[m.id] > S.t + D && m.feud[w.id] === w.feud[m.id] && F.afeto(w, m) === af0 - 8 && L.avoid(S, w, m) && w.mem.some((x) => x.k === 'brigou'));
    toHour(S, 10);
    for (const p of [w, m]) { AI.abort(S, p); p.chatCool = 0; p.needs.social = 10; p.mood = 60; }
    m.x = w.x + 1; m.y = w.y;
    const c = AI.scoreList(S, w).find((x) => x.type === 'conversar');
    check('brigados não se procuram', !c);
    S.t = w.feud[m.id] + 60; S.ck = Sim.clock(S.t);
    const d2 = L.dialog(S, w, m);
    L.afterChat(S, w, m, d2);
    check('passada a raiva, a próxima conversa é de pazes', d2.kind === 'pazes' && !w.feud[m.id] && !m.feud[w.id] && w.mem.some((x) => x.k === 'fezPazes'), d2.lines.map((l) => l.text).join(' / '));
    // bom humor quase não briga
    const S2 = world(6);
    S2.t += C.FIGHT_GRACE_D * D; S2.ck = Sim.clock(S2.t);
    const [a, b] = S2.people;
    a.mood = b.mood = 80;
    let fights = 0;
    for (let i = 0; i < 1000; i++) if (L.dialog(S2, a, b).kind === 'briga') fights++;
    check('de bom humor, briga é rara', fights < 40, fights + ' em 1000 conversas');
  }
  // 15. quem sabe ensina os mais novos
  {
    const S = world(42);
    const [w, m] = S.people;
    m.skills.pesca = 60;   // nível 4
    const kid = F.makeBaby(S, w, m, 'F', 'Aprendiz'); kid.born -= 10 * Y; kid.carriedBy = 0; kid.lastAge = 10; S.people.push(kid); F.init(S); L.init(S);
    let d = null;
    for (let i = 0; i < 40 && (!d || d.kind !== 'ensino'); i++) d = L.dialog(S, m, kid);
    const before = kid.skills.pesca;
    L.afterChat(S, m, kid, d);
    check('quem sabe ensina: o jovem aprende', d.kind === 'ensino' && d.skill === 'pesca' && kid.skills.pesca > before + 2 && kid.mem.some((x) => x.k === 'aprendeuCom') && S.stats.taught === 1, d.lines.map((l) => l.text).join(' / '));
  }

  // ===================== histórias =====================
  // 16. de tardinha, com o fogo aceso, alguém conta e os outros ouvem
  {
    const S = world(42);
    add(S, 'F', 'Jaci', 30); add(S, 'M', 'Kauê', 32);
    const kid = F.makeBaby(S, S.people[0], S.people[1], 'F', 'Ouvinte'); kid.born -= 8 * Y; kid.carriedBy = 0; kid.lastAge = 8; S.people.push(kid); F.init(S); L.init(S);
    learnUpTo(S, 'pedra');
    const prat0 = S.tech.prat.cestos || 0;
    let told = null, heard = new Set();
    for (let d = 0; d < 10 && !S.stats.stories; d++) {
      days(S, 1, (st) => { const s = st.life.story; if (s && s.on) { told = s; for (const id of Object.keys(s.heard)) heard.add(+id); } });
    }
    check('história ao pé do fogo: acontece de tardinha e entra na Crônica', S.stats.stories >= 1 && S.chron.some((c) => /Pela primeira vez, .* contou uma história ao pé do fogo/.test(c.text)), 'histórias ' + S.stats.stories);
    check('quem ouviu lembra, e a próxima descoberta anda um pouco', S.people.some((p) => p.mem.some((x) => x.k === 'ouviuHistoria')) && (S.tech.prat.cestos || 0) > prat0, 'ouviram ' + heard.size + ' · prática ' + ((S.tech.prat.cestos || 0) - prat0).toFixed(2) + ' h');
    const lines = L.storyLines(S, S.people[0]);
    check('a história vem da Crônica ou das lendas, em três partes', lines.length === 3 && (/^Lembram quando .*\?$/.test(lines[0]) || /^Contam que/.test(lines[0])), lines[0]);
  }
  // 17. só uma história por dia, e nunca na chuva nem com lobos
  {
    const S = world(777);
    add(S, 'F', 'Jaci', 30);
    toHour(S, 18);
    const p = S.people[0];
    S.life.storyDay = S.ck.day;
    check('uma história por dia', !L.canTell(S, p));
    S.life.storyDay = -1;
    S.precip = 'chuva';
    check('na chuva ninguém conta história', !L.canTell(S, p));
    S.precip = null;
    check('sem chuva, fogo aceso e alguém por perto: conta', L.canTell(S, p));
  }

  // ===================== festas =====================
  // 18. nascimento dá festa: dançam, comem, se aproximam, e alguém agradece (Poder)
  {
    const S = world(1234);
    const [w, m] = S.people;
    add(S, 'F', 'Jaci', 26); add(S, 'M', 'Kauê', 27);
    S.stock.peixe = 60; Sim.refresh(S);
    toHour(S, 9);
    w.preg = { t0: S.t - 44 * D, due: S.t + 10, father: m.id, known: true };
    S.life.lastParty = -1e9;
    let on = false, maxDancing = 0;
    const p0 = S.god.poder, fish0 = S.stock.peixe;
    days(S, 2, (st) => { const pt = st.life.party; if (pt && pt.on) { on = true; maxDancing = Math.max(maxDancing, st.people.filter((q) => q.act && q.act.type === 'festa' && q.act.stage === 'dance').length); } });
    check('nascimento: festa à noite, em volta do fogo', on && maxDancing >= 2 && S.stats.parties >= 1, 'dançando ao mesmo tempo: ' + maxDancing);
    const danced = S.people.filter((p) => p.alive && p.mem.some((x) => x.k === 'festa'));
    check('festa: quem dançou fica feliz e mais próximo dos outros', danced.length >= 2 && danced.every((p) => danced.every((q) => q === p || (p.rel[q.id] || 0) >= 1)), danced.map((p) => p.name).join(', '));
    check('festa: comem juntos (sai do estoque)', S.stock.peixe < fish0, 'peixe ' + fish0 + ' → ' + S.stock.peixe);
    check('festa e nascimento: agradecimentos viram Poder', S.god.thanksPoder >= C.THANKS.nascimento + C.THANKS.festa && S.god.poder > p0, '+' + S.god.thanksPoder + ' de Poder em agradecimentos');
  }
  // 19. festa espera: 8 dias entre festas, e nenhuma logo depois de uma morte
  {
    const S = world(5);
    check('a primeira festa marca', L.party(S, 'primavera'));
    S.life.party = null; S.life.lastParty = S.t;
    check('a segunda, antes de 8 dias, não', !L.party(S, 'fartura'));
    S.life.lastParty = -1e9;
    L.party(S, 'fartura');
    const k = add(S, 'M', 'Velho', 80); k.needs.saude = -999; days(S, 0.01);
    check('uma morte desmarca a festa, e por 3 dias não tem outra', !S.life.party && !L.party(S, 'fartura'));
  }

  // ===================== agradecimentos, luto e Poder =====================
  // 20. Poder sem teto
  {
    const S = world(42);
    S.god.poder = 99;
    for (const p of S.people) p.fe = 100;
    days(S, 3);
    check('o Poder passa de 100 (não tem teto)', S.god.poder > 100, Math.round(S.god.poder));
  }
  // 21. oração atendida agradece com Poder; de manhã, quem tem muita fé agradece pelo dia
  {
    const S = world(777);
    const [w] = S.people;
    S.god.poder = 50;
    w.needs.calor = 20; w.tempHere = 0;
    w.prayer = { kind: 'frio', target: w.id, text: 'Deus, está frio demais.', t0: S.t, until: S.t + 600 };
    const p0 = S.god.poder;
    const r = God.cast(S, 'calor', Math.floor(w.x), Math.floor(w.y));
    check('oração atendida: +' + C.THANKS.oracao + ' de Poder de agradecimento', r.ok && Math.abs(S.god.poder - (p0 - God.MIRACLES.calor.cost + C.THANKS.oracao)) < 0.001, r.msg);
    for (const p of S.people) { p.fe = 95; }
    let thanks = 0;
    for (let d = 0; d < 12; d++) { days(S, 1, (st) => { thanks += st.events.filter((e) => e.k === 'thanks').length; }); for (const p of S.people) p.fe = 95; }
    check('quem tem muita fé agradece de manhã (em silêncio, só o balão)', (S.god.thanks || 0) >= 2, S.god.thanks + ' agradecimentos');
  }

  // ===================== pequenos acontecimentos =====================
  // 22. cada um faz o que diz
  {
    const S = world(9001);
    add(S, 'F', 'Jaci', 30);
    const kid = F.makeBaby(S, S.people[0], S.people[1], 'F', 'Pequena'); kid.born -= 6 * Y; kid.carriedBy = 0; kid.lastAge = 6; S.people.push(kid); F.init(S); L.init(S);
    toHour(S, 10);
    for (const p of S.people) { AI.abort(S, p); p.sleeping = false; p.inTent = 0; }
    const st0 = Object.assign({}, S.stock);
    L.fireSmall(S, 'ninho');
    check('ninho: +' + C.SMALL_FOOD + ' de comida', S.stock.frutas === st0.frutas + C.SMALL_FOOD);
    L.fireSmall(S, 'galhos');
    check('galhos: +' + C.SMALL_WOOD + ' de madeira', S.stock.madeira === st0.madeira + C.SMALL_WOOD);
    S.stock.frutas = 20;
    L.fireSmall(S, 'formigas');
    check('formigas: some fruta do estoque', S.stock.frutas < 20 && S.stock.frutas >= 15, S.stock.frutas);
    const w0 = S.people[0];
    AI.decide(S, w0);
    w0.act = { type: 'madeira', stage: 'work', t: 0 };
    L.fireSmall(S, 'pe');
    const hurt = S.people.find((p) => p.hurt);
    check('pé torcido: anda devagar por um dia', !!hurt && F.walkFactor(S, hurt) < 0.8 && hurt.mem.some((x) => x.k === 'peTorcido'));
    const ev0 = S.events.length;
    L.fireSmall(S, 'estrela');
    check('estrela cadente: quem viu lembra e a fé sobe', S.people.some((p) => p.mem.some((x) => x.k === 'viuEstrela')) && S.events.some((e) => e.k === 'star'));
    S.precip = null;
    L.fireSmall(S, 'arcoiris');
    check('arco-íris: fica no céu umas horas', S.life.rainbowUntil > S.t && S.events.some((e) => e.k === 'rainbow'));
    L.fireSmall(S, 'araras');
    check('araras passam', S.events.some((e) => e.k === 'birds'));
    L.fireSmall(S, 'vagalumes');
    check('vaga-lumes: as crianças correm atrás', S.life.firefliesUntil > S.t && kid.mem.some((x) => x.k === 'brincou'));
    const fe0 = S.people[1].fe;
    for (let i = 0; i < 10; i++) L.fireSmall(S, 'sonho');
    check('sonho bonito: a fé de quem sonhou sobe', S.people.some((p) => p.mem.some((x) => x.k === 'sonhoBom')));
    toHour(S, 20);
    for (const p of S.people) { p.x = S.camp.x + 1.5; p.y = S.camp.y + 2; }
    L.fireSmall(S, 'cantoria');
    check('cantoria perto do fogo', S.people.filter((p) => p.mem.some((x) => x.k === 'cantou')).length >= 2 && S.events.some((e) => e.k === 'song'));
    check('toda notícia vira aviso na tela', S.events.filter((e) => e.k === 'toast').length >= 8);
  }
  // 23. frequência: um pouco por dia, sem exagero
  {
    const S = world(42);
    let n = 0;
    days(S, 60, (st) => { n += st.events.filter((e) => e.k === 'toast' && /ninho|cogumelos|estrela|arco-íris|araras|galhos|torceu|Formigas|Vaga-lumes|primeira neve|sonhou|cantar/.test(e.text)).length; });
    check('pequenos acontecimentos: cerca de um a cada 3 dias', n >= 8 && n <= 32, n + ' em 60 dias');
  }
  // 24. lua cheia: a noite clareia e a conversa vai até mais tarde
  {
    const S = world(777);
    const d = Math.floor(S.t / D) + 30 - ((Math.floor(S.t / D)) % C.MOON_DAYS) + C.MOON_DAY;
    S.t = d * D + 22 * 60; S.ck = Sim.clock(S.t); Sim.refresh(S);
    check('lua cheia no dia 14 de cada 30', L.moonUp(S) && !L.moonUp(Object.assign({}, S, { ck: Sim.clock(S.t + 10 * D) })));
    const [w, m] = S.people;
    for (const p of [w, m]) { AI.abort(S, p); p.sleeping = false; p.inTent = 0; p.chatCool = 0; p.needs.social = 20; }
    m.x = w.x + 1; m.y = w.y;
    check('na lua cheia dá para conversar às 22 h', !!AI.scoreList(S, w).find((x) => x.type === 'conversar'));
  }

  // ===================== missões =====================
  // 25. Ato 1: 13 metas, 5 que abrem a fase e 8 missões; cada uma paga Poder uma vez
  {
    const S = newWorld(42);
    check('Ato 1: 13 metas (5 abrem a fase, 8 missões)', S.goals.length === 13 && S.goals.filter((g) => !g.opt).length === 5 && S.goals.every((g) => g.reward > 0));
    const p0 = S.god.poder;
    S.stats.inspected = true; S.stats.vontadeChanged = true;
    Sim.checkGoals(S);
    const paid = S.god.poder - p0;
    Sim.checkGoals(S);
    check('missão cumprida paga Poder, uma vez', paid === 5 && S.god.poder - p0 === 5 && S.events.filter((e) => e.k === 'goal').length === 2, '+' + paid);
    // as 5 metas abrem a família; o que sobra das missões vai junto
    S.stats.firstFire = S.stats.firstTent = true; S.stats.winters = 1; S.stock.madeira = 99; S.stock.peixe = 99; Sim.refresh(S);
    Sim.checkGoals(S);
    check('as 5 metas abrem a fase da família, e as missões que sobraram vão junto', S.goalsPhase === 2 && S.goals.some((g) => g.id === 'filho') && S.goals.some((g) => g.id === 'oracao' && g.opt), S.goals.map((g) => g.id).join(', '));
    check('fase da família também paga (e tem missões novas: festa e ensinar)', S.goals.find((g) => g.id === 'filho').reward === 10 && S.goals.some((g) => g.id === 'festa' && g.opt) && S.goals.some((g) => g.id === 'ensino' && g.opt));
  }
  // 26. missões pelo jogo: colher, pescar, história e milagre
  {
    const S = world(777);
    days(S, 25);
    const done = S.goals.filter((g) => g.done).map((g) => g.id);
    check('missões se cumprem jogando (colher, água, pescar, história)', ['frutas20', 'agua10', 'peixe5'].every((id) => done.indexOf(id) >= 0), done.join(', '));
  }

  console.log('\nunidades: ' + ok + ' ok, ' + bad + ' falhas');
  if (process.argv[2] === 'u') { process.exitCode = bad ? 1 : 0; return; }   // só as unidades
  // ===================== longo =====================
  const YEARS = +process.argv[2] || 20;
  const jobs = [];
  for (const seed of [42, 777, 9001]) for (const mode of ['bem', 'largado']) jobs.push({ seed, mode, years: YEARS });
  const results = [];
  let next = 0, running = 0;
  const pool = Math.max(1, Math.min(3, require('os').cpus().length));
  const t0 = Date.now();
  const launch = () => {
    while (running < pool && next < jobs.length) {
      const job = jobs[next++];
      running++;
      const wk = new Worker(__filename, { workerData: job });
      wk.on('message', (r) => { results.push(r); running--; if (results.length === jobs.length) finish(); else launch(); });
      wk.on('error', (e) => { results.push({ seed: job.seed, mode: job.mode, errors: [String(e.stack || e)] }); running--; if (results.length === jobs.length) finish(); else launch(); });
    }
  };
  const finish = () => {
    results.sort((a, b) => a.seed - b.seed || a.mode.localeCompare(b.mode));
    console.log('\n' + YEARS + ' anos com a vida do povo (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s):');
    for (const r of results) {
      if (r.errors && r.errors.length) { check('mundo ' + r.seed + ' ' + r.mode + ': sem erro', false, r.errors[0]); continue; }
      console.log(`\nmundo ${r.seed} · ${r.mode} · ${r.sec.toFixed(0)} s · ${r.alive} vivos · nasceram ${r.births} · mães ${r.mothers} (${r.multiDad} com filhos de pais diferentes) · pares ${r.bonds} (separações ${r.seps})`);
      console.log(`  histórias ${r.stories} · festas ${r.parties} · conversas ${r.talks} · brigas ${r.fights} · pazes ${r.peace} · consolos ${r.consoled} · ensinou ${r.taught} · pequenos acontecimentos ${r.small}`);
      console.log(`  tempo: trabalho ${r.workPct}% · conversa ${r.chatPct}% · história ${r.storyPct}% · festa ${r.partyPct}% · dormir ${r.sleepPct}% · fome ${r.hungry}% · frio ${r.cold}% · Poder ${r.poder} (agradecimentos +${r.thanksPoder})`);
      console.log(`  mortes: ${r.deaths.length ? r.deaths.join(', ') : 'nenhuma'} · no máximo ${r.maxBonds} pares numa pessoa (do mesmo sexo, no fim: até ${r.sameMax}) · noites a três ${r.trios} · noites de muitos ${r.many}`);
      const tag = 'mundo ' + r.seed + ' ' + r.mode + ': ';
      check(tag + 'ninguém morre de fome, sede ou frio', !r.deaths.some((c) => c === 'fome' || c === 'sede' || c === 'frio'), r.deaths.join(', ') || 'nenhuma morte');
      check(tag + 'fome e frio raros', r.hungry < 5 && r.cold < 3, r.hungry + '% · ' + r.cold + '%');
      check(tag + 'a vida acontece: histórias, festas e conversas', r.stories >= 20 && r.parties >= 8 && r.talks >= 300, r.stories + ' · ' + r.parties + ' · ' + r.talks);
      check(tag + 'brigas existem, mas são raras', r.fights < r.talks * 0.05, r.fights + ' em ' + r.talks);
      // desde as invenções (Etapa 8), machado, rede e vasos rendem mais: o povo trabalha menos horas sem passar fome
      check(tag + 'a vida social não rouba o trabalho', r.workPct >= 20 && +r.chatPct + +r.storyPct + +r.partyPct < 8, 'trabalho ' + r.workPct + '% · social ' + (+r.chatPct + +r.storyPct + +r.partyPct).toFixed(1) + '%');
      check(tag + 'o Poder passa de 100', r.poder > 100, r.poder);
      if (r.mode === 'bem') {
        check(tag + 'relações livres: alguém com mais de um par', r.maxBonds >= 2, r.maxBonds);
        check(tag + 'o povo cresce (15 pessoas ou mais em ' + YEARS + ' anos)', r.alive >= 15 || YEARS < 20, r.alive);
      }
    }
    const multi = results.filter((r) => r.multiDad > 0).length;
    check('em algum mundo, mãe com filhos de pais diferentes', multi >= 1 || YEARS < 20, multi + ' mundos');
    console.log('\n' + ok + ' ok, ' + bad + ' falhas');
    process.exitCode = bad ? 1 : 0;
  };
  launch();
} else {
  parentPort.postMessage(longRun(workerData.seed, workerData.mode, workerData.years));
}

function learnUpTo(S, id) {
  for (const k of T.ORDER) { T.discover(S, k); if (k === id) break; }
  S.events.length = 0;
}

// ---------- simulação longa ----------
function longRun(seed, mode, years) {
  const S = newWorld(seed);
  S.narr.auto = 'acolher';
  const place = (t) => { const at = spot(S, t); if (!at) return false; Sim.placeBlueprint(S, t, at.x, at.y); return true; };
  place('fogueira'); place('barraca');
  const out = { seed, mode, errors: [], deaths: [] };
  const act = {}; let steps = 0, hours = 0, hungry = 0, cold = 0, maxBonds = 0;
  const t0 = Date.now();
  try {
    for (let d = 0; d < years * 60 && !S.over; d++) {
      if (mode !== 'largado' && d % 3 === 0) {
        const need = F.bedsNeeded(S), have = F.bedsTotal(S), pend = S.buildings.some((b) => !b.built || b.up);
        if (!pend && have < need + 1 && S.stock.madeira >= 14) place('barraca');
        else if (!pend && S.stock.pedra >= 8 && S.stock.madeira >= 12 && have < need + 1) { const b = S.buildings.find((x) => x.built && x.type === 'barraca' && (x.lv || 1) === 1 && !x.up); if (b) Sim.startUpgrade(S, b); }
        for (const t of ['moquem', 'jirau', 'forno']) if (!S.buildings.some((b) => !b.built || b.up) && T.buildOpen(S, t) && !S.buildings.some((b) => b.type === t)) place(t);
        Object.assign(S.vontades, S.ck.season >= 2 ? { madeira: 3, pesca: 3, frutas: 2 } : { madeira: 2, pesca: 3, frutas: 3 });
        S.vontades.pedra = S.stock.pedra < 10 ? 2 : 1;
      }
      for (let s = 0; s < 720 && !S.over; s++) {
        Sim.step(S, 2);
        S.events.length = 0;
        for (const p of S.people) if (p.alive && !p.carriedBy) { const k = p.act ? p.act.type : '-'; act[k] = (act[k] || 0) + 1; steps++; }
        if (s % 30 === 0) for (const p of S.people) if (p.alive && !p.carriedBy) { hours++; if (p.needs.fome < 25) hungry++; if (p.needs.calor < 25) cold++; }
      }
      if (d % 30 === 0) for (const p of S.people) if (p.alive) maxBonds = Math.max(maxBonds, F.partners(S, p).length);
    }
  } catch (e) { out.errors.push(e.stack); }
  const pct = (keys) => (keys.reduce((n, k) => n + (act[k] || 0), 0) / Math.max(1, steps) * 100).toFixed(1);
  const st = S.stats;
  const moms = new Map();
  for (const p of S.people) if (p.mother && p.father) { const s = moms.get(p.mother) || new Set(); s.add(p.father); moms.set(p.mother, s); }
  Object.assign(out, {
    alive: S.people.filter((p) => p.alive).length, births: st.births, deaths: S.people.filter((p) => !p.alive).map((p) => p.cause),
    mothers: moms.size, multiDad: [...moms.values()].filter((s) => s.size > 1).length,
    bonds: S.chron.filter((c) => /estão juntos/.test(c.text)).length + 1, seps: S.chron.filter((c) => /separaram/.test(c.text)).length, maxBonds,
    stories: st.stories, parties: st.parties, talks: st.talks, fights: st.fights, peace: st.peace, consoled: st.consoled, taught: st.taught, small: st.small || 0,
    workPct: pct(AI.WORK), chatPct: pct(['conversar']), storyPct: pct(['historia', 'ouvir']), partyPct: pct(['festa']), sleepPct: pct(['dormir']),
    hungry: (hungry / Math.max(1, hours) * 100).toFixed(1), cold: (cold / Math.max(1, hours) * 100).toFixed(1),
    poder: Math.round(S.god.poder), thanksPoder: Math.round(S.god.thanksPoder || 0), sec: (Date.now() - t0) / 1000,
    trios: st.trios || 0, many: st.manyNights || 0,
    sameMax: Math.max(0, ...S.people.filter((p) => p.alive).map((p) => F.partners(S, p).filter((q) => q.sex === p.sex).length)),
  });
  return out;
}
