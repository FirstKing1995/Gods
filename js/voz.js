/* Gods · a voz das pessoas (0.24). Você fala com alguém do povo e a pessoa responde do jeito dela: a IA (Groq, pelo
   servidor do Apps Script) recebe os fatos que a simulação já decidiu (quem é, a família, o que lembra, o que pensa,
   como está o corpo, a fé) e só escreve a resposta. Nada do que ela diz muda o jogo; o que muda é ouvir Deus: a
   primeira conversa do dia com cada pessoa dá um pouco de fé e uma lembrança boa.
   Sem conta, sem internet ou sem cota, a janela avisa e o jogo segue igual. A conversa não vai para o save. */
(function (G) {
  'use strict';
  const V = G.Voz = {};
  const C = G.CFG;
  const conversas = new Map();   // pid → [{ r: 'u' | 'p', t }], só nesta sessão
  let S = null, pid = 0, ocupado = false, el = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  V.pode = (st, p) => !!(p && p.alive && !p.carriedBy && G.Family.age(st, p) >= 4);

  // ---------- os fatos da pessoa (o que a IA pode usar) ----------
  function quem(st, p) {
    const F = G.Family, a = F.age(st, p), kid = a < 13, F_ = p.sex === 'F';
    return (kid ? (F_ ? 'menina' : 'menino') : a >= 55 ? (F_ ? 'mulher velha' : 'homem velho') : F_ ? 'mulher' : 'homem') + ' de ' + a + ' anos';
  }
  V.contexto = function (st, p) {
    const F = G.Family, Sim = G.Sim, AI = G.AI, Ge = G.Gente, Dz = G.Deus, out = [];
    const F_ = p.sex === 'F', o = (m, f) => (F_ ? f : m);
    out.push('Nome: ' + p.name + ', ' + quem(st, p) + '.');
    out.push('O povo chama Deus de ' + (Dz ? Dz.call(st) : 'Deus') + '.');
    if (G.Eras && st.eras) { const e = G.Eras.info(st); out.push('O povo vive na ' + e.idade + (e.ordem ? ', e se organiza como ' + e.ordem : '') + '.'); }
    const h = st.ck.hour, est = ['primavera', 'verão', 'outono', 'inverno'][st.ck.season];
    out.push('Agora é ' + est + ', ' + (h < 5 || h >= 20 ? 'noite' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'fim de tarde') + (st.precip ? ', com ' + (st.precip === 'neve' ? 'neve' : 'chuva') : '') + '.');
    out.push('Fazendo agora: ' + AI.describe(st, p) + '.');
    if (Ge) { const pz = Ge.pensa(st, p); if (pz) out.push('Pensando: ' + pz.txt + (pz.why ? ' (' + pz.why + ')' : '')); }
    out.push('Fé em Deus: ' + Math.round(p.fe) + ' de 100. Humor: ' + Math.round(p.mood) + ' de 100.');
    const n = p.needs, corpo = [];
    if (n.fome < 30) corpo.push('com fome'); if (n.sede < 30) corpo.push('com sede'); if (n.energia < 25) corpo.push(o('cansado', 'cansada'));
    if (n.calor < 35) corpo.push('com frio'); if (n.saude < 50) corpo.push(o('fraco', 'fraca') + ' de saúde'); if (p.sick) corpo.push('com febre');
    if (p.preg && p.preg.known) corpo.push('grávida');
    if (corpo.length) out.push('O corpo: ' + corpo.join(', ') + '.');
    if (p.traits.length) out.push('Jeito: ' + p.traits.map((t) => t + (Sim.TRAIT_DESC[t] && !/\d/.test(Sim.TRAIT_DESC[t]) ? ' (' + Sim.TRAIT_DESC[t].replace(/\.$/, '') + ')' : '')).join('; ') + '.');   // sem os números do jogo
    // a família (vivos e mortos), sem inventar ninguém
    const fam = {};
    for (const k of F.family(st, p)) {
      const lbl = { companheira: 'companheira', companheiro: 'companheiro', 'mãe': 'mãe', pai: 'pai', filha: 'filha', filho: 'filho', 'irmã': 'irmã', 'irmão': 'irmão', 'avó': 'avó', 'avô': 'avô', neta: 'neta', neto: 'neto' }[k.r];
      if (!lbl) continue;
      (fam[lbl] = fam[lbl] || []).push(k.q.name + (k.q.alive ? (lbl.startsWith('fil') || lbl.startsWith('ne') ? ' (' + F.age(st, k.q) + ' anos)' : '') : ' (já morreu)'));
    }
    const fl = Object.keys(fam).map((k) => k + ': ' + fam[k].join(', '));
    out.push(fl.length ? 'Família: ' + fl.join('; ') + '.' : 'Não tem família viva por perto.');
    const mems = p.mem.slice().sort((a, b) => Math.abs(Sim.MEM[b.k].v) - Math.abs(Sim.MEM[a.k].v)).slice(0, 6).map((m) => { const d = Sim.MEM[m.k]; return F_ && d.tf ? d.tf : d.t; });
    if (mems.length) out.push('Lembranças fortes destes dias: ' + mems.join('; ') + '.');
    if (Ge && F.age(st, p) >= 3) { const g = Ge.gosto(st, p); out.push('Gosta de comer ' + Ge.COMIDA[g.comida] + ' e de ' + Ge.TRAB[g.trabalho] + '; não gosta de ' + Ge.COMIDA[g.enjoa] + ' nem de ' + Ge.TRAB[g.detesta] + '.'); }
    if (p.prayer) out.push('Rezou pedindo: ' + p.prayer.text);
    if (p.escolhido && Dz) out.push('É ' + Dz.title(p) + ', ' + o('escolhido', 'escolhida') + ' por Deus.');
    if (p.abencoado && G.Avatar) out.push('Nasceu ' + o('abençoado', 'abençoada') + ': ' + G.Avatar.DONS[p.abencoado.dom] + '.');
    if (p.talk && st.t - p.talk.t < C.DAY_MIN) out.push('Última conversa com alguém do povo: ' + p.talk.lines.map(([nm, t]) => nm + ' disse "' + t + '"').join(' '));
    return out.join('\n').slice(0, 2400);
  };

  // ---------- a janela ----------
  function monta() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'modal-voz'; el.className = 'modal'; el.hidden = true;
    el.innerHTML = '<div class="panel modal-card voz-card" role="dialog" aria-labelledby="voz-titulo">' +
      '<h2 id="voz-titulo">Falar</h2><p id="voz-sub" class="small muted"></p>' +
      '<div id="voz-log" class="voz-log talk" aria-live="polite"></div>' +
      '<p id="voz-aviso" class="small muted" hidden></p>' +
      '<form id="voz-form" class="voz-form"><input id="voz-msg" type="text" maxlength="300" autocomplete="off" placeholder="O que você diz?"><button type="submit" class="btn btn-gold" id="voz-ir">Falar</button></form>' +
      '<div class="modal-actions"><span class="small muted">A resposta é escrita por IA a partir da vida da pessoa no jogo.</span><button type="button" class="btn" id="voz-fechar">Fechar</button></div></div>';
    document.body.appendChild(el);
    el.querySelector('#voz-fechar').addEventListener('click', V.fechar);
    el.addEventListener('click', (e) => { if (e.target === el) V.fechar(); });
    el.querySelector('#voz-form').addEventListener('submit', (e) => { e.preventDefault(); enviar(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') V.fechar(); e.stopPropagation(); });
  }
  V.abrir = function (st, p) {
    if (!V.pode(st, p)) return;
    monta();
    S = st; pid = p.id;
    el.querySelector('#voz-titulo').textContent = 'Falar com ' + p.name;
    el.querySelector('#voz-sub').textContent = quem(st, p).replace(/^./, (c) => c.toUpperCase()) + ' · fé ' + Math.round(p.fe) + '. Fale como ' + (G.Deus ? G.Deus.call(st) : 'Deus') + ': só ' + (p.sex === 'F' ? 'ela' : 'ele') + ' ouve.';
    desenha();
    const sess = G.Net && G.Net.session();
    aviso(!G.Net || !G.Net.enabled() ? 'A voz das pessoas precisa do servidor do jogo.' : !sess ? 'Para conversar, entre com a sua conta na tela de início.' : '');
    el.hidden = false;
    setTimeout(() => el.querySelector('#voz-msg').focus(), 30);
  };
  V.fechar = function () { if (el) el.hidden = true; pid = 0; };
  V.aberta = () => !!(el && !el.hidden);
  function aviso(t) { const a = el.querySelector('#voz-aviso'); a.textContent = t; a.hidden = !t; }
  function desenha() {
    const p = S && S.people.find((q) => q.id === pid);
    const log = el.querySelector('#voz-log'), h = conversas.get(pid) || [];
    log.innerHTML = h.length ? h.map((m) => m.r === 'u' ? '<p class="voz-eu"><b>Você:</b> ' + esc(m.t) + '</p>' : '<p><b>' + esc(p ? p.name : '') + ':</b> “' + esc(m.t) + '”</p>').join('')
      : '<p class="small muted">Diga alguma coisa. ' + esc(p ? p.name : '') + ' responde do jeito ' + (p && p.sex === 'F' ? 'dela' : 'dele') + ', com o que viveu até aqui.</p>';
    if (ocupado) log.insertAdjacentHTML('beforeend', '<p class="small muted voz-espera">' + esc(p ? p.name : '') + ' pensa…</p>');
    log.scrollTop = log.scrollHeight;
  }
  async function enviar() {
    const inp = el.querySelector('#voz-msg'), msg = inp.value.trim();
    const p = S && S.people.find((q) => q.id === pid);
    if (!msg || ocupado || !p) return;
    const sess = G.Net && G.Net.session();
    if (!sess) { aviso('Para conversar, entre com a sua conta na tela de início.'); return; }
    const h = conversas.get(pid) || [];
    conversas.set(pid, h);
    h.push({ r: 'u', t: msg });
    inp.value = ''; ocupado = true; aviso(''); desenha();
    const quemFala = pid;
    const res = await G.Net.call('falar', { token: sess.token, msg, pessoa: { nome: p.name, quem: quem(S, p) }, contexto: V.contexto(S, p), hist: h.slice(-7, -1) }, 45000);
    ocupado = false;
    if (res.ok && res.texto) {
      h.push({ r: 'p', t: res.texto });
      ouviu(S, p);
      if (typeof res.restam === 'number' && res.restam <= 5) aviso(res.restam ? 'Ainda dá para falar ' + res.restam + (res.restam === 1 ? ' vez' : ' vezes') + ' hoje.' : 'Por hoje, foi a última fala.');
    } else {
      h.pop();
      inp.value = msg;
      aviso(res.erro || 'A voz não chegou agora.');
    }
    if (pid === quemFala) desenha();
  }
  // ouvir Deus: a primeira conversa do dia com cada pessoa dá fé e uma lembrança boa
  function ouviu(st, p) {
    if (!p.alive) return;
    const dia = Math.floor(st.t / C.DAY_MIN);
    if (p.vozDia === dia) return;
    p.vozDia = dia;
    p.fe = Math.min(100, p.fe + C.VOZ_FE);
    G.Sim.addMem(st, p, 'ouviuDeus');
    st.stats.vozes = (st.stats.vozes || 0) + 1;
  }
})(globalThis.G = globalThis.G || {});
