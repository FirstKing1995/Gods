/* Gods · a IA nos momentos importantes (0.25). O jogo segue decidindo tudo; a IA (Groq, pela rota narrar do Apps
   Script) só escreve, a partir do que a simulação já decidiu:
   - sozinha, nos momentos raros: a cena e o nome de cada descoberta, o nome e a história da primeira obra de cada
     tipo (e das grandes obras), a lenda de cada idade que passa, o mito que o povo conta de Deus a cada ano, a reza
     de quem tem fé alta (ou é escolhido, abençoado, ou pede pela vida), a pergunta do filho abençoado nas palavras dele
   - quando você pede: a conversa inteira entre duas pessoas, e o que o povo acha de uma decisão
   Travas: uma fila com prioridade, um pedido por vez com folga entre eles, o orçamento do dia neste aparelho (igual
   ao do servidor) e o teto do servidor. Sem conta, sem internet ou sem cota, fica o texto de sempre e nada quebra. */
(function (G) {
  'use strict';
  const IA = G.Ia = {};
  const C = G.CFG;
  const AUTO_DIA = 20, REZAS_DIA = 4, FOLGA_MS = 6000, FILA_MAX = 8;
  const PRIOR = { lenda: 5, descoberta: 4, pergunta: 4, mito: 3, obra: 2, oracao: 1 };
  const REZA_VIDA = { cura: 1, parto: 1, luto: 1, fome: 1 };
  let S = null, fila = [], ocupado = false, proxima = 0, olhado = 0;
  let vistos = null;   // as obras prontas já vistas neste mundo (não vai para o save: refaz ao abrir)
  const rezasVistas = new Map();

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sess = () => (G.Net && G.Net.enabled() ? G.Net.session() : null);
  const deus = (st) => (G.Deus ? G.Deus.call(st) : 'Deus');
  const lugar = (st) => (st.povo && st.povo.nome) || 'a aldeia';

  // ---------- orçamento do dia neste aparelho ----------
  function gasto() {
    const d = Math.floor(Date.now() / 864e5);
    try { const o = JSON.parse(localStorage.getItem('gods.ia') || '{}'); if (o.d === d) return o; } catch (e) { /* sem guardar */ }
    return { d, n: 0, rezas: 0 };
  }
  function guarda(o) { try { localStorage.setItem('gods.ia', JSON.stringify(o)); } catch (e) { /* sem guardar */ } }
  IA.restam = () => Math.max(0, AUTO_DIA - gasto().n);

  // ---------- o que já foi visto (vai no save, para não pedir duas vezes a mesma coisa) ----------
  function prepara(st) {
    if (!st.ia) st.ia = { chron: st.chron.length, tipos: {}, obras: {}, idade: st.eras ? st.eras.idade || 0 : 0, idadeT: st.t, ano: st.ck.year, nomes: {} };
    if (!st.ia.ini) { for (const b of st.buildings) if (b.built) st.ia.tipos[b.type] = 1; st.ia.ini = 1; }
    vistos = new Set(st.buildings.filter((b) => b.built).map((b) => b.id));
    rezasVistas.clear();
    for (const p of st.people) if (p.prayer) rezasVistas.set(p.id, p.prayer.t0);
    fila = [];
  }

  // ---------- a cada quadro: olha o que acabou de acontecer (uma vez por segundo) ----------
  IA.frame = function (st) {
    if (!st) return;
    if (st !== S) { S = st; prepara(st); }
    const agora = performance.now();
    if (agora - olhado < 1000) return;
    olhado = agora;
    if (st.resumido || st.over) return;
    olha(st);   // marca o que aconteceu mesmo sem conta (ao entrar, não pede o que ficou para trás)
    if (sess()) anda(st); else fila = [];
  };
  function poe(item) {
    const chave = item.tipo + ':' + (item.chave || '');
    if (fila.some((f) => f.tipo + ':' + (f.chave || '') === chave)) return;
    fila.push(item);
    fila.sort((a, b) => PRIOR[b.tipo] - PRIOR[a.tipo]);
    if (fila.length > FILA_MAX) fila.length = FILA_MAX;   // o menos importante sai
  }
  function olha(st) {
    const ia = st.ia;
    // descobertas: as linhas novas da Crônica que trazem uma descoberta
    if (st.chron.length < ia.chron) ia.chron = st.chron.length;
    for (let i = ia.chron; i < st.chron.length; i++) { const c = st.chron[i]; if (c.disc && !c.ia) poe({ tipo: 'descoberta', chave: c.disc, ci: i }); }
    ia.chron = st.chron.length;
    // obras: a primeira de cada tipo e as grandes obras
    for (const b of st.buildings) {
      if (!b.built || vistos.has(b.id)) continue;
      vistos.add(b.id);
      const grande = G.Cidade && G.Cidade.isGrande && G.Cidade.isGrande(b);
      if (ia.tipos[b.type] && !grande) continue;
      ia.tipos[b.type] = 1;
      if (b.type !== 'barraca' || grande) poe({ tipo: 'obra', chave: b.id, bid: b.id });
    }
    // lendas: a idade que acabou de passar
    const idade = st.eras ? st.eras.idade || 0 : 0;
    if (idade > ia.idade) { poe({ tipo: 'lenda', chave: ia.idade, de: ia.idade, t0: ia.idadeT || 0, t1: st.t }); ia.idade = idade; ia.idadeT = st.t; }
    // mitos: uma vez por ano, se Deus agiu
    if (st.ck.year > ia.ano) {
      const t0 = st.t - C.YEAR_DAYS * C.DAY_MIN, atos = st.chron.filter((c) => c.god && c.t >= t0);
      if (atos.length >= 2) poe({ tipo: 'mito', chave: st.ck.year, t0 });
      ia.ano = st.ck.year;
    }
    // rezas: só as importantes, e poucas por dia
    for (const p of st.people) {
      if (!p.alive || !p.prayer || rezasVistas.get(p.id) === p.prayer.t0) continue;
      rezasVistas.set(p.id, p.prayer.t0);
      const imp = p.fe >= 60 || p.escolhido || p.abencoado || REZA_VIDA[p.prayer.kind];
      if (imp && !p.prayer.ia && gasto().rezas < REZAS_DIA) poe({ tipo: 'oracao', chave: p.id + ':' + p.prayer.t0, pid: p.id, t0: p.prayer.t0 });
    }
    // a pergunta do abençoado
    const pg = st.avatar && st.avatar.pergunta;
    if (pg && !pg.ia) poe({ tipo: 'pergunta', chave: pg.pid + ':' + pg.t, pid: pg.pid, t: pg.t });
  }

  // ---------- a fila: um pedido por vez, com folga ----------
  async function anda(st) {
    if (ocupado || !fila.length || performance.now() < proxima) return;
    const o = gasto();
    if (o.n >= AUTO_DIA) { fila = []; return; }
    const item = fila.shift(), fatos = fatosDe(st, item);
    if (!fatos) return;
    ocupado = true;
    o.n++; if (item.tipo === 'oracao') o.rezas++;
    guarda(o);
    const res = await G.Net.call('narrar', { token: sess().token, tipo: item.tipo, fatos }, 45000);
    ocupado = false;
    proxima = performance.now() + FOLGA_MS;
    if (res.cota) { const g = gasto(); g.n = AUTO_DIA; guarda(g); fila = []; return; }
    if (!res.ok || !res.texto || st !== S) return;
    aplica(st, item, res.texto);
  }

  // ---------- os fatos de cada tipo ----------
  function pessoa(st, id) { return st.people.find((q) => q.id === id) || null; }
  function base(st) {
    const e = G.Eras && st.eras ? G.Eras.info(st) : null;
    return ['Lugar: ' + lugar(st) + '.', 'O povo chama Deus de ' + deus(st) + '.', e ? 'O povo vive na ' + e.idade + '.' : '', 'Gente viva: ' + st.people.filter((p) => p.alive).length + '.'].filter(Boolean).join('\n');
  }
  function fatosDe(st, it) {
    if (it.tipo === 'descoberta') {
      const c = st.chron[it.ci];
      return c ? base(st) + '\nA descoberta (como o jogo contou): ' + c.text : '';
    }
    if (it.tipo === 'obra') {
      const b = G.Sim.building(st, it.bid);
      if (!b) return '';
      const d = G.Sim.def(b);
      return base(st) + '\nA obra: ' + d.name + '. ' + d.desc + '\nÉ a primeira desse tipo que o povo ergueu' + (G.Cidade && G.Cidade.isGrande && G.Cidade.isGrande(b) ? ', e é uma grande obra, que levou muito tempo e muita gente' : '') + '.';
    }
    if (it.tipo === 'lenda') {
      const nome = G.Eras ? G.Eras.IDADES[it.de].nome : 'os primeiros tempos';
      const fatos = st.chron.filter((c) => c.t >= it.t0 && c.t <= it.t1 && !c.lenda && !c.mito).map((c) => G.Sim.dateText(c.t) + ': ' + c.text);
      if (!fatos.length) return '';
      return base(st) + '\nA idade que terminou: ' + nome + '.\nO que aconteceu nela:\n' + fatos.slice(-28).join('\n');
    }
    if (it.tipo === 'mito') {
      const atos = st.chron.filter((c) => c.god && c.t >= it.t0).map((c) => c.text);
      return atos.length ? base(st) + '\nO que ' + deus(st) + ' fez neste ano, pelo que o povo viu:\n' + atos.slice(-15).join('\n') : '';
    }
    if (it.tipo === 'oracao') {
      const p = pessoa(st, it.pid);
      if (!p || !p.prayer || p.prayer.t0 !== it.t0 || !G.Voz) return '';
      return G.Voz.contexto(st, p) + '\nO pedido da reza (como o jogo escreveu): ' + p.prayer.text;
    }
    if (it.tipo === 'pergunta') {
      const p = pessoa(st, it.pid), pg = G.Avatar && G.Avatar.pending(st);
      if (!p || !pg || !G.Voz) return '';
      return G.Voz.contexto(st, p) + '\nA pergunta (como o jogo escreveu): ' + pg.texto;
    }
    return '';
  }

  // ---------- o texto que chegou ----------
  function separa(texto, rotulo) {
    const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    let nome = '';
    const re = new RegExp('^' + rotulo + '\\s*:\\s*', 'i');
    if (linhas.length && re.test(linhas[0])) nome = linhas.shift().replace(re, '').replace(/[."]+$/, '').trim();
    return { nome, resto: linhas.join(' ') };
  }
  function aplica(st, it, texto) {
    const UI = G.UI;
    if (it.tipo === 'descoberta') {
      const c = st.chron[it.ci];
      if (!c) return;
      const { nome, resto } = separa(texto, 'Nome');
      c.ia = resto; c.iaNome = nome;
      if (nome) st.ia.nomes[it.chave] = nome;
      if (UI && UI.refreshChron) UI.refreshChron();
      if (UI && UI.toast) UI.toast(nome ? 'O povo chama a descoberta de ' + nome + '.' : resto, 'chron');
    } else if (it.tipo === 'obra') {
      const b = G.Sim.building(st, it.bid);
      if (!b) return;
      const { nome, resto } = separa(texto, 'Nome');
      st.ia.obras[b.id] = { nome: nome || G.Sim.def(b).name, hist: resto };
      if (UI && UI.toast) UI.toast((nome ? nome + '. ' : '') + resto, 'chron');
    } else if (it.tipo === 'lenda' || it.tipo === 'mito') {
      const { nome, resto } = separa(texto, 'Título');
      const c = { t: st.t, text: resto, titulo: nome || (it.tipo === 'lenda' ? 'Uma lenda' : 'O que contam de ' + deus(st)) };
      c[it.tipo] = 1;
      st.chron.push(c);
      st.ia.chron = st.chron.length;
      if (UI && UI.refreshChron) UI.refreshChron();
      if (UI && UI.toast) UI.toast((it.tipo === 'lenda' ? 'Nasceu uma lenda: ' : 'Um mito sobre você: ') + c.titulo + '. Veja a Crônica.', 'chron');
    } else if (it.tipo === 'oracao') {
      const p = pessoa(st, it.pid);
      if (p && p.prayer && p.prayer.t0 === it.t0) p.prayer.ia = texto.replace(/^["“]|["”]$/g, '');
    } else if (it.tipo === 'pergunta') {
      const pg = st.avatar && st.avatar.pergunta;
      if (!pg || pg.pid !== it.pid || pg.t !== it.t) return;
      pg.ia = texto.split('\n')[0].replace(/^["“]|["”]$/g, '');
      const el = document.getElementById('filho-texto'), m = document.getElementById('modal-filho');
      if (el && m && !m.hidden) el.textContent = '“' + pg.ia + '”';
    }
  }

  // ---------- o que você pede: a conversa inteira e a opinião do povo ----------
  let caixa = null;
  function mostra(titulo, html) {
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.id = 'modal-ia'; caixa.className = 'modal'; caixa.hidden = true;
      caixa.innerHTML = '<div class="panel modal-card voz-card" role="dialog" aria-labelledby="ia-titulo"><h2 id="ia-titulo"></h2><div id="ia-corpo" class="voz-log talk"></div>' +
        '<div class="modal-actions"><span class="small muted">Escrito por IA a partir do que aconteceu no jogo.</span><button type="button" class="btn" id="ia-fechar">Fechar</button></div></div>';
      document.body.appendChild(caixa);
      caixa.querySelector('#ia-fechar').addEventListener('click', () => { caixa.hidden = true; });
      caixa.addEventListener('click', (e) => { if (e.target === caixa) caixa.hidden = true; });
    }
    caixa.querySelector('#ia-titulo').textContent = titulo;
    caixa.querySelector('#ia-corpo').innerHTML = html;
    caixa.hidden = false;
  }
  const falas = (texto) => texto.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([^:]{1,30}):\s*(.+)$/);
    return m ? '<p><b>' + esc(m[1]) + ':</b> “' + esc(m[2].replace(/^["“]|["”]$/g, '')) + '”</p>' : '<p>' + esc(l) + '</p>';
  }).join('');
  async function pede(tipo, fatos) {
    const s = sess();
    if (!s) return { ok: false, erro: G.Net && G.Net.enabled() ? 'Para isso, entre com a sua conta na tela de início.' : 'Isso precisa do servidor do jogo.' };
    return G.Net.call('narrar', { token: s.token, tipo, fatos }, 45000);
  }
  IA.podeConversa = (st, p) => !!(p && p.alive && p.talk && p.talk.lines && p.talk.lines.length && st.t - p.talk.t < 2 * C.DAY_MIN);
  IA.conversa = async function (st, p) {
    if (!IA.podeConversa(st, p)) return;
    const outroNome = p.talk.lines.map(([n]) => n).find((n) => n !== p.name);
    const q = st.people.find((x) => x.name === outroNome && x.alive);
    mostra('A conversa de ' + p.name + (q ? ' e ' + q.name : ''), '<p class="small muted">Ouvindo…</p>');
    const fatos = [base(st), 'Pessoa 1:\n' + G.Voz.contexto(st, p), q ? 'Pessoa 2:\n' + G.Voz.contexto(st, q) : '',
      'A conversa começou assim: ' + p.talk.lines.map(([n, t]) => n + ': ' + t).join(' / ') + (p.talk.kind ? ' (era uma conversa de ' + p.talk.kind + ')' : '')].filter(Boolean).join('\n\n');
    const r = await pede('conversa', fatos);
    mostra('A conversa de ' + p.name + (q ? ' e ' + q.name : ''), r.ok ? falas(r.texto) : '<p class="small muted">' + esc(r.erro || 'A IA não respondeu agora.') + '</p>');
  };
  // na janela de decisão (acolher, o mascate, quem foi embora...): o povo opina
  function montaOpiniao() {
    const card = document.querySelector('#modal-choice .choice-card'), acts = card && card.querySelector('.modal-actions');
    if (!acts || document.getElementById('choice-ia')) return;
    acts.insertAdjacentHTML('beforebegin', '<div id="choice-ia-box"><button type="button" class="btn btn-small" id="choice-ia">Ouvir o povo</button><div id="choice-ia-txt" class="talk"></div></div>');
    document.getElementById('choice-ia').addEventListener('click', opina);
    new MutationObserver(() => { if (document.getElementById('modal-choice').hidden) document.getElementById('choice-ia-txt').innerHTML = ''; })
      .observe(document.getElementById('modal-choice'), { attributes: true, attributeFilter: ['hidden'] });
  }
  async function opina() {
    const st = S, box = document.getElementById('choice-ia-txt');
    if (!st || !G.Voz) return;
    const adultos = st.people.filter((p) => p.alive && !p.carriedBy && G.Family.age(st, p) >= 16).sort((a, b) => b.fe - a.fe);
    if (adultos.length < 2) { box.innerHTML = '<p class="small muted">Ainda não há gente bastante para opinar.</p>'; return; }
    const a = adultos[0], b = adultos[adultos.length - 1];
    box.innerHTML = '<p class="small muted">O povo pensa…</p>';
    const tx = (id) => (document.getElementById(id) || {}).innerText || '';
    const fatos = [base(st), 'A decisão: ' + tx('choice-title') + '. ' + tx('choice-lead') + ' ' + tx('choice-people').slice(0, 500) + ' ' + tx('choice-note'),
      'As opções: ' + tx('choice-yes') + ' ou ' + tx('choice-no') + '.', 'Quem fala primeiro:\n' + G.Voz.contexto(st, a), 'Quem fala depois:\n' + G.Voz.contexto(st, b)].join('\n\n');
    const r = await pede('decisao', fatos);
    box.innerHTML = r.ok ? falas(r.texto) : '<p class="small muted">' + esc(r.erro || 'A IA não respondeu agora.') + '</p>';
  }
  IA.init = function () { montaOpiniao(); };
})(globalThis.G = globalThis.G || {});
