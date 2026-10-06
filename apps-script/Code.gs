/**
 * Gods · servidor (Google Apps Script)
 * Contas, sessões, save na nuvem (arquivo no Drive, índice na planilha), hora do servidor e ranking.
 *
 * Instalação: veja apps-script/SETUP.md. Resumo:
 * 1) Crie uma planilha, abra Extensões > Apps Script e cole este arquivo.
 * 2) Rode a função setup() uma vez e autorize.
 * 3) Implantar > Nova implantação > App da Web: executar como "Eu", acesso "Qualquer pessoa".
 * 4) Copie a URL que termina em /exec para API_URL em js/config.js.
 */

var VERSAO = '0.10.0';
var ABAS = {
  contas: ['id', 'nome', 'email', 'sal', 'hash', 'criadoEm', 'ultimoAcesso', 'arquivoId', 'salvoEm', 'resumo'],
  sessoes: ['token', 'contaId', 'criadoEm', 'expiraEm'],
};
var SESSAO_DIAS = 30;
var SESSOES_MAX = 300;        // passou disso, as sessões vencidas saem de uma vez (a planilha fica leve)
var ITERACOES = 300;          // rodadas de SHA-256 na senha
var SAVE_MAX = 4000000;       // caracteres

// ---------- instalação ----------
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(ABAS).forEach(function (nome) {
    var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    sh.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]);
    sh.setFrozenRows(1);
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PASTA_ID')) props.setProperty('PASTA_ID', DriveApp.createFolder('Gods · saves').getId());
  if (!props.getProperty('PIMENTA')) props.setProperty('PIMENTA', Utilities.getUuid() + Utilities.getUuid());
  return 'Pronto. Agora publique como App da Web.';
}

// ---------- entrada HTTP ----------
function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || 'hora';
  var res = a === 'ranking' ? ranking() : { ok: true, versao: VERSAO };
  res.now = Date.now();
  return json(res);
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, erro: 'Pedido inválido.', now: Date.now() }); }
  var rotas = {
    hora: function () { return { ok: true, versao: VERSAO }; },
    cadastrar: cadastrar,
    entrar: entrar,
    sair: sair,
    salvar: salvar,
    carregar: carregar,
    apagar: apagar,
    ranking: ranking,
  };
  var fn = rotas[req && req.action];
  var res;
  try {
    res = fn ? fn(req) : { ok: false, erro: 'Ação desconhecida.' };
  } catch (err) {
    // falha passageira (trava ocupada, planilha lenta): o jogo tenta de novo sozinho nas ações que podem se repetir
    res = { ok: false, falha: true, erro: 'Erro no servidor: ' + (err && err.message ? err.message : err) };
  }
  res.now = Date.now();
  return json(res);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- planilha ----------
function aba(nome) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome); }
function col(nome, campo) { return ABAS[nome].indexOf(campo); }
function linhas(nome) {
  var sh = aba(nome), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, ABAS[nome].length).getValues();
}
function acharConta(campo, valor) {
  var rows = linhas('contas'), c = col('contas', campo);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][c]).toLowerCase() === String(valor).toLowerCase()) return { row: i + 2, v: rows[i] };
  }
  return null;
}
function travar(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- senha e sessão ----------
function hashSenha(senha, sal) {
  var pimenta = PropertiesService.getScriptProperties().getProperty('PIMENTA') || '';
  var h = sal + ':' + senha + ':' + pimenta;
  for (var i = 0; i < ITERACOES; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}
function novaSessao(contaId) {
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  var agora = Date.now();
  aba('sessoes').appendRow([token, contaId, agora, agora + SESSAO_DIAS * 86400000]);
  CacheService.getScriptCache().put('s:' + token, contaId, 21600);
  return token;
}
// as sessões vencidas saem de uma vez (sem apagar linha por linha): lê, filtra, limpa e escreve de volta
function limparSessoes() {
  var sh = aba('sessoes'), rows = linhas('sessoes'), agora = Date.now();
  if (rows.length <= SESSOES_MAX) return 0;
  var vivas = rows.filter(function (r) { return Number(r[3]) > agora; });
  if (vivas.length === rows.length) return 0;
  sh.getRange(2, 1, rows.length, ABAS.sessoes.length).clearContent();
  if (vivas.length) sh.getRange(2, 1, vivas.length, ABAS.sessoes.length).setValues(vivas);
  return rows.length - vivas.length;
}
function contaDaSessao(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var contaId = cache.get('s:' + token);
  if (!contaId) {
    var rows = linhas('sessoes'), agora = Date.now();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0] === token && Number(rows[i][3]) > agora) { contaId = rows[i][1]; break; }
    }
    if (!contaId) return null;
    cache.put('s:' + token, contaId, 21600);
  }
  return acharConta('id', contaId);
}
function exigirConta(req) {
  var c = contaDaSessao(String(req.token || ''));
  return c || null;
}
function semSessao() { return { ok: false, sessao: false, erro: 'Sua sessão expirou. Entre de novo.' }; }

// ---------- ações ----------
function cadastrar(req) {
  var nome = String(req.nome || '').trim().slice(0, 24);
  var email = String(req.email || '').trim().toLowerCase();
  var senha = String(req.senha || '');
  if (nome.length < 2) return { ok: false, erro: 'Escolha um nome com pelo menos 2 letras.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'Esse e-mail não parece válido.' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa de pelo menos 6 caracteres.' };
  return travar(function () {
    if (acharConta('email', email)) return { ok: false, erro: 'Já existe uma conta com esse e-mail. Tente entrar.' };
    var id = Utilities.getUuid(), sal = Utilities.getUuid(), agora = Date.now();
    aba('contas').appendRow([id, nome, email, sal, hashSenha(senha, sal), agora, agora, '', '', '']);
    return { ok: true, token: novaSessao(id), usuario: { nome: nome, email: email }, mundo: null };
  });
}

function entrar(req) {
  var email = String(req.email || '').trim().toLowerCase();
  var senha = String(req.senha || '');
  var c = acharConta('email', email);
  if (!c || hashSenha(senha, c.v[col('contas', 'sal')]) !== c.v[col('contas', 'hash')]) return { ok: false, erro: 'E-mail ou senha não conferem.' };
  aba('contas').getRange(c.row, col('contas', 'ultimoAcesso') + 1).setValue(Date.now());
  if (aba('sessoes').getLastRow() - 1 > SESSOES_MAX) { try { travar(limparSessoes); } catch (err) { /* fica para a próxima */ } }
  return { ok: true, token: novaSessao(c.v[0]), usuario: { nome: c.v[1], email: email }, mundo: resumoDe(c.v) };
}

function sair(req) {
  var token = String(req.token || '');
  CacheService.getScriptCache().remove('s:' + token);
  travar(function () {
    var sh = aba('sessoes'), rows = linhas('sessoes'), agora = Date.now();
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0] === token || Number(rows[i][3]) < agora) sh.deleteRow(i + 2);
    }
  });
  return { ok: true };
}

function salvar(req) {
  var c = exigirConta(req);
  if (!c) return semSessao();
  var dados = String(req.dados || '');
  if (!dados) return { ok: false, erro: 'Save vazio.' };
  if (dados.length > SAVE_MAX) return { ok: false, erro: 'Save grande demais.' };
  try { JSON.parse(dados); } catch (err) { return { ok: false, erro: 'Save corrompido.' }; }
  return travar(function () {
    var agora = Date.now();
    var arquivoId = String(c.v[col('contas', 'arquivoId')] || '');
    var arquivo = null;
    if (arquivoId) { try { arquivo = DriveApp.getFileById(arquivoId); } catch (err) { arquivo = null; } }
    if (arquivo) arquivo.setContent(dados);
    else {
      var pasta = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('PASTA_ID'));
      arquivo = pasta.createFile('mundo-' + c.v[0] + '.json', dados, MimeType.PLAIN_TEXT);
      arquivoId = arquivo.getId();
    }
    var resumo = JSON.stringify(limparResumo(req.resumo));
    aba('contas').getRange(c.row, col('contas', 'arquivoId') + 1, 1, 3).setValues([[arquivoId, agora, resumo]]);
    return { ok: true, savedAt: agora };
  });
}

function carregar(req) {
  var c = exigirConta(req);
  if (!c) return semSessao();
  var arquivoId = String(c.v[col('contas', 'arquivoId')] || '');
  if (!arquivoId) return { ok: true, dados: null };
  var dados;
  try { dados = DriveApp.getFileById(arquivoId).getBlob().getDataAsString(); } catch (err) { return { ok: true, dados: null }; }
  return { ok: true, dados: dados, savedAt: Number(c.v[col('contas', 'salvoEm')]) || 0, mundo: resumoDe(c.v) };
}

function apagar(req) {
  var c = exigirConta(req);
  if (!c) return semSessao();
  return travar(function () {
    var arquivoId = String(c.v[col('contas', 'arquivoId')] || '');
    if (arquivoId) { try { DriveApp.getFileById(arquivoId).setTrashed(true); } catch (err) { /* já foi */ } }
    aba('contas').getRange(c.row, col('contas', 'arquivoId') + 1, 1, 3).setValues([['', '', '']]);
    return { ok: true };
  });
}

function ranking() {
  var rows = linhas('contas'), lista = [];
  for (var i = 0; i < rows.length; i++) {
    var r = resumoDe(rows[i]);
    if (!r) continue;
    lista.push({ nome: rows[i][1], anos: r.anos || 0, vivos: r.vivos || 0, local: r.local || '', ano: r.ano || 1, desc: r.desc || 0, aldeia: !!r.aldeia });
  }
  lista.sort(function (a, b) { return b.anos - a.anos || b.vivos - a.vivos; });
  return { ok: true, lista: lista.slice(0, 20) };
}

function resumoDe(v) {
  var txt = v[col('contas', 'resumo')];
  if (!txt) return null;
  try { return JSON.parse(txt); } catch (err) { return null; }
}
function limparResumo(r) {
  r = r || {};
  var n = function (x) { x = Number(x); return isFinite(x) ? Math.max(0, Math.min(1e6, Math.floor(x))) : 0; };
  var s = function (x, m) { return String(x || '').slice(0, m); };
  return { ano: n(r.ano), estacao: s(r.estacao, 12), dia: n(r.dia), anos: n(r.anos), vivos: n(r.vivos), nomes: s(r.nomes, 80), local: s(r.local, 40), fim: !!r.fim,
    desc: Math.min(99, n(r.desc)), aldeia: !!r.aldeia };
}
