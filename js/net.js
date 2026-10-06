/* Gods · conexão com o servidor (Google Apps Script). Sem servidor configurado, o jogo fica só local. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Net = G.Net = {};
  const SK = 'genesis.sessao', AK = 'genesis.api';
  Net.offset = 0;   // relógio do servidor − relógio do aparelho

  function ls() { try { return globalThis.localStorage || null; } catch (e) { return null; } }

  Net.url = function () {
    let u = C.API_URL || '';
    const st = ls();
    try {
      const q = new URLSearchParams(location.search).get('api');
      if (q && st) st.setItem(AK, q);
      if (!u && st) u = st.getItem(AK) || '';
    } catch (e) { /* sem acesso */ }
    return String(u).trim();
  };
  Net.enabled = () => !!Net.url();
  Net.now = () => Date.now() + Net.offset;

  Net.session = function () {
    const st = ls(); if (!st) return null;
    try { return JSON.parse(st.getItem(SK) || 'null'); } catch (e) { return null; }
  };
  Net.setSession = function (s) {
    const st = ls(); if (!st) return;
    try { if (s) st.setItem(SK, JSON.stringify(s)); else st.removeItem(SK); } catch (e) { /* sem acesso */ }
  };

  // Uma ida ao servidor. O Apps Script parado há um tempo acorda devagar (a primeira resposta pode levar 10 a 30 s),
  // então o tempo limite é folgado e, nas ações que podem se repetir sem estrago, uma falha de rede, uma resposta
  // estranha ou um erro passageiro do servidor (trava ocupada, planilha lenta) tenta mais uma vez.
  const AGAIN = { hora: 1, entrar: 1, carregar: 1, ranking: 1, salvar: 1 };
  async function once(url, action, data, timeoutMs) {
    const body = JSON.stringify(Object.assign({ action }, data || {}));
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let late = false;
    const timer = setTimeout(() => { late = true; if (ctl) ctl.abort(); }, timeoutMs || 30000);
    const t0 = Date.now();
    try {
      const r = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctl ? ctl.signal : undefined });
      const txt = await r.text();
      let js;
      try { js = JSON.parse(txt); } catch (e) { return { ok: false, erro: 'O servidor respondeu algo inesperado. Tente de novo em alguns segundos; se continuar, confira o endereço do Apps Script.', estranha: true }; }
      if (js && typeof js.now === 'number') Net.offset = js.now - Math.round((t0 + Date.now()) / 2);
      if (js && js.ok === false && js.sessao === false) Net.setSession(null);
      warmAt = Date.now();
      return js;
    } catch (e) {
      if (late) return { ok: false, erro: 'O servidor demorou demais para responder (depois de um tempo parado, ele acorda devagar). Tente de novo em alguns segundos.', lenta: true, offline: true };
      return { ok: false, erro: 'Sem conexão com o servidor. O jogo segue salvando neste aparelho.', offline: true };
    } finally {
      clearTimeout(timer);
    }
  }
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  Net.call = async function (action, data, timeoutMs) {
    const url = Net.url();
    if (!url) return { ok: false, erro: 'Servidor não configurado.' };
    let res = await once(url, action, data, timeoutMs);
    if (!res.ok && AGAIN[action] && ((res.offline && !res.lenta) || res.estranha || res.falha)) {
      await wait(1500);
      res = await once(url, action, data, timeoutMs);
    }
    return res;
  };
  // acorda o servidor antes da hora (ao abrir a tela de título ou a janela da conta): a primeira resposta é a lenta
  let warmAt = 0;
  Net.warm = function () {
    if (!Net.enabled() || Date.now() - warmAt < 4 * 60 * 1000) return;
    warmAt = Date.now();
    once(Net.url(), 'hora', {}, 45000).then((r) => { if (!r.ok) warmAt = 0; });
  };

  // envio sem esperar resposta (ao fechar a aba)
  Net.beacon = function (action, data) {
    const url = Net.url();
    if (!url || typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    try { return navigator.sendBeacon(url, new Blob([JSON.stringify(Object.assign({ action }, data || {}))], { type: 'text/plain;charset=utf-8' })); } catch (e) { return false; }
  };
})(globalThis.G = globalThis.G || {});
