/* Gods · Minas e metais (Etapa 12): a mina ao pé da serra dá pedra sem fim, carvão e minério de ferro; mais fundo, prata,
   ouro e pedras preciosas. A ferraria forja ferramentas de ferro (rendem mais e duram três vezes mais) e, com ourives,
   joias. Prata, ouro e pedras preciosas viram oferenda ao pé da estátua (Poder) e moeda com o mascate.
   Duas descobertas, no jeito das do campo: a mineração (quebrando pedra) e a metalurgia (trabalhando na mina).
   Os anões trazem as duas quando são acolhidos. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const M = G.Minas = {};
  const Sim = () => G.Sim, Fam = () => G.Family, T = () => G.Tech;

  M.RES = ['carvao', 'minerio', 'prata', 'ouro', 'gemas', 'ferro', 'joias'];
  M.TESOURO = ['prata', 'ouro', 'gemas'];
  M.ORDER = ['mineracao', 'metalurgia'];
  M.DEF = {
    mineracao: { name: 'Mineração', icon: 'mina', req: ['ceramica'], art: 'a mineração',
      learn: 'quebrando pedra e cavando o barro',
      gives: 'Libera a mina, que se abre ao pé da serra, e a Vontade Mineração: pedra sem fim, carvão e minério de ferro; mais fundo, prata, ouro e pedras preciosas.',
      story: (n) => n + ' seguiu um veio escuro na pedra e cavou morro adentro: nasceu a mineração.',
      hint: 'Construir → Mina, encostada na serra ou perto de pedras. Suba Mineração nas Vontades.' },
    metalurgia: { name: 'Metalurgia', icon: 'ferraria', req: ['mineracao'], art: 'a metalurgia',
      learn: 'trabalhando na mina, queimando o barro e lascando pedra',
      gives: 'Libera a ferraria: de minério e carvão saem ferramentas de ferro, que rendem mais e duram três vezes mais. Com ourives, prata e ouro viram joias.',
      story: (n) => n + ' deixou o minério na brasa mais forte e viu a pedra escorrer e endurecer de novo: o povo aprendeu a tirar ferro da pedra.',
      hint: 'Construir → Ferraria. Quem forja é ferreiro nato (os anões) ou quem já é bom de Ofício (nível ' + C.FORJA_LVL + ').' },
  };
  for (const id of M.ORDER) M.DEF[id].mina = true;
  // o que cada trabalho ensina (tipo:etapa → peso por hora)
  const TEACH = {
    mineracao: { 'pedra:work': 1.2, 'argila:work': 0.4 },
    metalurgia: { 'mina:work': 1, 'argila:work': 0.3, 'oficio:work': 0.25 },
  };
  M.TEACH = TEACH;
  const BY_KEY = {};
  for (const id of M.ORDER) for (const k in TEACH[id]) (BY_KEY[k] || (BY_KEY[k] = [])).push([id, TEACH[id][k]]);
  Object.assign(T().DISC, M.DEF);   // entram na janela das Descobertas (aba Metais)

  M.known = (S, id) => !!(S.tech && S.tech.known[id]);
  M.count = (S) => (S.tech ? M.ORDER.filter((id) => S.tech.known[id]).length : 0);
  M.isOpen = function (S, id) {
    const t = S.tech, d = M.DEF[id];
    if (!t || !d || t.known[id]) return false;
    for (const r of d.req) if (!t.known[r]) return false;
    return true;
  };
  M.openList = (S) => M.ORDER.filter((id) => M.isOpen(S, id));
  M.need = (id) => C.MINA_NEED[id];
  M.progress = (S, id) => (M.known(S, id) ? 1 : Math.min(1, ((S.tech && S.tech.prat[id]) || 0) / M.need(id)));
  M.missing = (S, id) => M.DEF[id].req.filter((r) => !(S.tech && S.tech.known[r])).map((r) => T().DISC[r].name.toLowerCase());
  M.onWork = function (S, p, a, dt) {
    const t = S.tech;
    if (!t || !t.whoMina) return;
    const list = BY_KEY[a.type + ':' + a.stage];
    if (!list) return;
    for (const [id, w] of list) {
      if (!M.isOpen(S, id)) continue;
      const h = w * dt / 60 * (G.Deus ? G.Deus.pratMult(S) : 1);
      t.prat[id] = (t.prat[id] || 0) + h;
      if (p) { const who = t.whoMina[id] || (t.whoMina[id] = {}); who[p.id] = (who[p.id] || 0) + h; }
    }
  };
  function inventor(S, id) {
    const who = (S.tech.whoMina && S.tech.whoMina[id]) || {};
    let best = null, bh = -1;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || Fam().age(S, p) < 7) continue;
      const h = who[p.id] || 0;
      if (h > bh) { bh = h; best = p; }
    }
    return best;
  }
  M.invent = function (S, id, p, how) {
    if (!M.DEF[id] || M.known(S, id)) return false;
    if (!T().discover(S, id, p || inventor(S, id), how)) return false;
    if (S.tech.whoMina) delete S.tech.whoMina[id];
    if (S.tech.aim === id) S.tech.aim = null;
    return true;
  };
  // os anões ensinam o que sabem (e a que vem antes, se faltar)
  M.teach = function (S, id, p) {
    if (!S.tech || !M.DEF[id] || M.known(S, id)) return false;
    return M.invent(S, id, p, 'povo');
  };
  // a mais adiantada entre as abertas (para a Revelação), se já passou do mínimo
  M.best = function (S) {
    let best = null, bp = T().revMin(S) - 1e-9;
    for (const id of M.openList(S)) { const pr = M.progress(S, id); if (pr >= bp) { bp = pr; best = id; } }
    return best;
  };

  // ---------- estado ----------
  M.init = function (S) {
    const st = S.stock;
    for (const k of M.RES) if (st[k] === undefined) st[k] = 0;
    for (const p of S.people) if (p.skills && p.skills.mineracao === undefined) p.skills.mineracao = 0;
    if (S.tech) S.tech.whoMina = S.tech.whoMina || {};
    const s = S.stats;
    s.minaTurnos = s.minaTurnos || 0; s.minaGot = s.minaGot || {}; s.ferroMade = s.ferroMade || 0; s.joiasMade = s.joiasMade || 0; s.oferendas = s.oferendas || 0;
    if (!s.minaMissions) {
      s.minaMissions = true;
      const ph = S.goalsPhase || 1;
      if (S.goals) for (let f = 2; f <= ph; f++) for (const m of M.missions(f)) if (!S.goals.some((g) => g.id === m.id)) S.goals.push(m);
    }
  };

  // ---------- a mina ----------
  const def = (b) => Sim().def(b);
  M.mines = (S) => S.buildings.filter((b) => b.type === 'mina' && b.built && !b.demol);
  M.inside = (S, b) => S.people.filter((p) => p.alive && p.act && p.act.type === 'mina' && p.act.b === b.id).length;
  M.cap = (b) => def(b).mine.cap;
  // a mina com vaga mais perto de quem vai trabalhar
  M.pick = function (S, p) {
    let best = null, bd = 1e9;
    for (const b of M.mines(S)) {
      if (M.inside(S, b) >= M.cap(b)) continue;
      const d = Math.hypot(b.x + 1 - p.x, b.y + 1 - p.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  };
  // quanto a Vontade Mineração pesa agora (para a IA): obra pedindo pedra, a forja sem minério, ou estoque já cheio
  M.want = function (S) {
    if (!M.mines(S).some((b) => M.inside(S, b) < M.cap(b))) return 0;
    const st = S.stock, short = S.ctx && S.ctx.matShort ? S.ctx.matShort.pedra || 0 : 0;
    if (short > 0) return 2;
    const forja = S.buildings.some((b) => b.type === 'ferraria' && b.built);
    if (forja && (st.minerio < 4 || st.carvao < 2)) return 1.5;
    // estoque cheio de tudo: a mina rasa para; a funda segue devagar, atrás do que brilha
    if (st.pedra > 100 && st.carvao > 40 && st.minerio > 40) return M.mines(S).some((b) => def(b).mine.lv >= 2) ? 0.35 : 0;
    if (st.pedra > 60 && st.carvao > 20 && st.minerio > 20) return 0.5;
    return st.pedra < 15 ? 1.1 : 0.85;
  };
  // o que sai de um turno: pedra sempre; o resto é sorte, e melhora com a mina mais funda e com a mão de pedra
  M.yield = function (S, p, b) {
    const lv = Math.min(3, def(b).mine.lv || 1), Y = C.MINA_YIELD, r = S.rng;
    const luck = p.sangue && G.Povos && G.Povos.has(p, 'pedra') ? C.MINA_SORTE_ANAO : 1;
    const out = { pedra: Y.pedra[lv - 1] };
    for (const k of ['carvao', 'minerio', 'prata', 'ouro', 'gemas']) {
      const ch = Y[k][lv - 1] * luck;
      if (ch > 0 && r.next() < ch) out[k] = Y.n[k] || 1;
    }
    return out;
  };
  // a carga chega ao estoque
  M.deposit = function (S, p, items) {
    const st = S.stock, got = S.stats.minaGot, Sm = Sim(), parts = [];
    for (const k in items) {
      const n = items[k]; if (!n) continue;
      st[k] = (st[k] || 0) + n;
      got[k] = (got[k] || 0) + n;
      parts.push('+' + n + ' ' + M.WORD[k]);
      if (k !== 'pedra' && got[k] === n) {
        // a primeira vez de cada coisa entra na Crônica
        Sm.chron(S, k === 'carvao' ? 'Saiu da mina o primeiro carvão: queima mais forte que lenha, e é o que a forja pede.' :
          k === 'minerio' ? p.name + ' trouxe da mina uma pedra pesada e cor de ferrugem: minério de ferro.' :
          k === 'prata' ? p.name + ' achou prata na mina. Brilha como a lua, e serve de oferenda e de troca.' :
          k === 'ouro' ? p.name + ' achou ouro na mina! O povo inteiro foi ver de perto.' :
          p.name + ' tirou da mina uma pedra que brilha por dentro. Ninguém tinha visto nada igual.');
        if (k === 'ouro' || k === 'gemas') for (const q of S.people) if (q.alive) Sm.addMem(S, q, 'tesouro');
      }
    }
    S.stats.minaTurnos++;
    if (parts.length) Sm.float(S, S.camp.x + 1, S.camp.y + 0.6, parts.join(' '));
  };
  M.WORD = { pedra: 'pedra', carvao: 'carvão', minerio: 'minério', prata: 'prata', ouro: 'ouro', gemas: 'pedra preciosa', ferro: 'ferramenta de ferro', joias: 'joia' };

  // ---------- a ferraria ----------
  M.forge = (S) => { let best = null; for (const b of S.buildings) if (b.type === 'ferraria' && b.built && !b.demol && (!best || def(b).shop.speed > def(best).shop.speed)) best = b; return best; };
  M.forgers = (S) => S.people.filter((p) => p.alive && !p.carriedBy && Fam().age(S, p) >= 12 && G.Povos && G.Povos.canForge(S, p));
  // quantas ferramentas de ferro ainda faltam: quem trabalha e não tem uma, mais uma de folga
  M.ferroGap = function (S) {
    const ws = T().workers(S);
    return ws.filter((p) => !(p.tool && p.tool.fe)).length + 1 - (S.stock.ferro || 0);
  };
  M.joiaGap = (S) => S.people.filter((p) => p.alive && !p.carriedBy && !p.joia && Fam().age(S, p) >= 18).length - (S.stock.joias || 0);
  // o que a forja pode fazer agora (para o plano do Ofício): [{ k, gap, b, pri }]
  M.plans = function (S) {
    const f = M.forge(S), st = S.stock, out = [];
    if (!f) return out;
    const gf = M.ferroGap(S);
    if (gf > 0 && st.minerio >= C.FERRO_COST.minerio && st.carvao >= C.FERRO_COST.carvao) out.push({ k: 'ferro', gap: gf, b: f, pri: gf >= 3 ? 4.6 : 3.2, forja: true });   // quem sabe forjar faz ferro antes de lascar pedra
    if (def(f).shop.joias) {
      const gj = M.joiaGap(S);
      if (gj > 0 && (st.prata >= 1 || st.ouro >= 1)) out.push({ k: st.prata >= 1 ? 'joias' : 'joiasOuro', gap: gj, b: f, pri: 1.3, forja: true });
    }
    return out;
  };
  M.costOf = (k) => (k === 'ferro' ? C.FERRO_COST : k === 'joias' ? { prata: 1 } : k === 'joiasOuro' ? { ouro: 1 } : null);
  M.minutesOf = (S, k, b) => (k === 'ferro' ? C.FERRO_MIN : C.JOIA_MIN) / (b ? def(b).shop.speed : 1);
  M.make = function (S, k, n) {
    const st = S.stats, Sm = Sim();
    if (k === 'ferro') {
      S.stock.ferro += n; st.ferroMade += n; st.toolWarn = false;
      if (st.ferroMade === n) Sm.chron(S, 'Saiu da forja a primeira ferramenta de ferro. Corta, cava e quebra como nenhuma de pedra.');
    } else {
      S.stock.joias += n; st.joiasMade += n;
      if (st.joiasMade === n) Sm.chron(S, 'O ourives terminou a primeira joia. Quem usa anda de cabeça erguida.');
    }
  };
  M.isForge = (k) => k === 'ferro' || k === 'joias' || k === 'joiasOuro';

  // ---------- hora e dia ----------
  // quem passa pelo acampamento troca a ferramenta de pedra pela de ferro, e o adulto sem joia pega uma
  M.hourly = function (S) {
    const st = S.stock;
    if (!(st.ferro > 0) && !(st.joias > 0)) return;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || p.sleeping || p.inTent) continue;
      if (Math.hypot(p.x - S.camp.x - 1, p.y - S.camp.y - 1) > 7) continue;
      const age = Fam().age(S, p);
      if (st.ferro > 0 && age >= 12 && p.tool && !p.tool.fe) {
        if (p.tool.dur >= 50) st.ferramentas++;   // a de pedra ainda boa volta para o estoque
        st.ferro--; p.tool = { dur: 100, fe: 1 };
      }
      if (st.joias > 0 && age >= 18 && !p.joia) { st.joias--; p.joia = 1; Sim().addMem(S, p, 'ganhouJoia'); }
    }
  };
  M.daily = function (S) {
    // as descobertas da mina pela prática (a mais madura, uma por dia)
    if (S.tech && S.tech.whoMina) {
      let best = null, br = 1;
      for (const id of M.ORDER) {
        if (!M.isOpen(S, id)) continue;
        const r = (S.tech.prat[id] || 0) / M.need(id);
        if (r >= br) { br = r; best = id; }
      }
      if (best && S.rng.chance(C.DISC_DAILY)) M.invent(S, best, null, 'pratica');
    }
  };
  // a oferenda: de manhã, quem reza ao pé da estátua leva o que brilha (uma por estátua por dia). Devolve o Poder dado
  M.offer = function (S, p, b) {
    if (!b || b.oferDay === S.ck.day) return 0;
    const st = S.stock;
    // com ourives e gente ainda sem joia, a prata e o ouro ficam primeiro para ele (até duas peças)
    const f = M.forge(S), keep = f && def(f).shop.joias ? Math.max(C.OFERENDA_KEEP, Math.min(2, M.joiaGap(S))) : C.OFERENDA_KEEP;
    const k = st.gemas > 0 ? 'gemas' : st.ouro > keep ? 'ouro' : st.prata > keep ? 'prata' : null;
    if (!k) return 0;
    st[k]--; b.oferDay = S.ck.day;
    const poder = C.OFERENDA[k];
    G.God.gain(S, poder);
    S.stats.oferendas++;
    S.stats.oferPoder = (S.stats.oferPoder || 0) + poder;
    const what = k === 'gemas' ? 'uma pedra preciosa' : k === 'ouro' ? 'ouro' : 'prata';
    if (S.stats.oferendas === 1) Sim().chron(S, p.name + ' deixou ' + what + ' ao pé da estátua: a primeira oferenda do povo. +' + poder + ' de Poder.');
    S.events.push({ k: 'oferenda', bid: b.id, pid: p.id, what: k, poder, text: p.name + ' ofereceu ' + what + ': +' + poder + ' de Poder' });
    return poder;
  };
  // ---------- metas ----------
  M.missions = function (phase) {
    if (phase === 4) return [
      { id: 'm_mina', text: 'Abra uma mina', opt: true, reward: 6, done: false },
      { id: 'm_ferraria', text: 'Erga uma ferraria', opt: true, reward: 6, done: false },
      { id: 'm_ferro', text: 'Forje a primeira ferramenta de ferro', opt: true, reward: 8, done: false },
      { id: 'm_ouro', text: 'Ache ouro na mina', opt: true, reward: 10, done: false },
    ];
    return [];
  };
  M.goalTest = {
    m_mina: (S) => S.buildings.some((b) => b.type === 'mina' && b.built),
    m_ferraria: (S) => S.buildings.some((b) => b.type === 'ferraria' && b.built),
    m_ferro: (S) => (S.stats.ferroMade || 0) > 0,
    m_ouro: (S) => ((S.stats.minaGot || {}).ouro || 0) > 0,
  };
})(globalThis.G = globalThis.G || {});
