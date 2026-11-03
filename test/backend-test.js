// Testa apps-script/Code.gs com serviços simulados. Uso: node test/backend-test.js
const { makeGas } = require('./gas-mock');
const g = makeGas();
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FALHA') + ' · ' + msg); if (!cond) fails++; };

ok(g.ctx.setup().startsWith('Pronto'), 'setup cria abas e pasta');
ok(g.get('hora').ok && typeof g.get('hora').now === 'number', 'GET devolve a hora do servidor');
let r = g.post({ action: 'cadastrar', nome: 'D', email: 'x@y.com', senha: '123456' });
ok(!r.ok && /nome/.test(r.erro), 'recusa nome curto');
r = g.post({ action: 'cadastrar', nome: 'Dhione', email: 'email-ruim', senha: '123456' });
ok(!r.ok && /e-mail/.test(r.erro), 'recusa e-mail inválido');
r = g.post({ action: 'cadastrar', nome: 'Dhione', email: 'dhione@exemplo.com', senha: '123' });
ok(!r.ok && /senha/.test(r.erro), 'recusa senha curta');
r = g.post({ action: 'cadastrar', nome: 'Dhione', email: 'Dhione@Exemplo.com', senha: 'segredo1' });
ok(r.ok && r.token && r.usuario.email === 'dhione@exemplo.com', 'cria conta e já entra');
const t1 = r.token;
r = g.post({ action: 'cadastrar', nome: 'Outro', email: 'dhione@exemplo.com', senha: 'segredo2' });
ok(!r.ok && /Já existe/.test(r.erro), 'não deixa repetir e-mail');
const row = g.gas._sheets.get('contas').rows[1];
ok(row[4] && row[4] !== 'segredo1' && row[4].length > 20, 'senha guardada só como hash');
r = g.post({ action: 'entrar', email: 'dhione@exemplo.com', senha: 'errada' });
ok(!r.ok, 'senha errada não entra');
r = g.post({ action: 'entrar', email: 'DHIONE@exemplo.com', senha: 'segredo1' });
ok(r.ok && r.token && r.mundo === null, 'entra com e-mail em maiúsculas; ainda sem mundo');
const t2 = r.token;
r = g.post({ action: 'carregar', token: t2 });
ok(r.ok && r.dados === null, 'carregar sem mundo devolve vazio');
const save = JSON.stringify({ v: 1, game: 'genesis', t: 1234, people: [] });
r = g.post({ action: 'salvar', token: t2, dados: save, resumo: { ano: 2, estacao: 'Verão', dia: 3, anos: 1, vivos: 2, nomes: 'Iara, Aruã', local: 'à beira do rio' } });
ok(r.ok && r.savedAt > 0, 'salva o mundo no Drive');
const f1 = g.gas._sheets.get('contas').rows[1][7];
r = g.post({ action: 'salvar', token: t2, dados: save.replace('1234', '5678'), resumo: { ano: 2, anos: 1, vivos: 2 } });
ok(r.ok && g.gas._sheets.get('contas').rows[1][7] === f1, 'salvar de novo reaproveita o mesmo arquivo');
r = g.post({ action: 'carregar', token: t1 });
ok(r.ok && JSON.parse(r.dados).t === 5678 && r.savedAt > 0, 'outra sessão da mesma conta carrega o save mais novo');
r = g.post({ action: 'salvar', token: t2, dados: '{quebrado' });
ok(!r.ok && /corrompido/.test(r.erro), 'recusa save corrompido');
r = g.post({ action: 'salvar', token: 'token-falso', dados: save });
ok(!r.ok && r.sessao === false, 'token inválido pede novo login');
g.post({ action: 'cadastrar', nome: 'Maria', email: 'maria@exemplo.com', senha: 'segredo3' });
const tm = g.post({ action: 'entrar', email: 'maria@exemplo.com', senha: 'segredo3' }).token;
g.post({ action: 'salvar', token: tm, dados: save, resumo: { ano: 5, anos: 4, vivos: 6, local: 'ao pé da montanha', desc: 6, aldeia: true } });
r = g.post({ action: 'ranking' });
ok(r.ok && r.lista.length === 2 && r.lista[0].nome === 'Maria' && r.lista[0].anos === 4, 'ranking ordena por anos sobrevividos');
ok(r.lista[0].desc === 6 && r.lista[0].aldeia === true && r.lista[1].desc === 0 && r.lista[1].aldeia === false, 'ranking mostra descobertas e quem virou aldeia (save antigo: zero)');
r = g.post({ action: 'sair', token: t2 });
ok(r.ok, 'sair encerra a sessão');
r = g.post({ action: 'carregar', token: t2 });
ok(!r.ok && r.sessao === false, 'token de quem saiu não vale mais');
r = g.post({ action: 'apagar', token: t1 });
ok(r.ok && g.post({ action: 'carregar', token: t1 }).dados === null, 'apagar mundo limpa o save');
r = g.post({ action: 'qualquer' });
ok(!r.ok && /desconhecida/.test(r.erro), 'ação desconhecida responde erro');
// 0.10: sessões vencidas saem de uma vez quando passam do limite; as válidas ficam
{
  const sh = g.gas._sheets.get('sessoes'), velha = Date.now() - 1000;
  for (let i = 0; i < 320; i++) sh.appendRow(['velha' + i, 'x', velha - 86400000, velha]);
  const antes = sh.getLastRow();
  r = g.post({ action: 'entrar', email: 'maria@exemplo.com', senha: 'segredo3' });
  const depois = sh.getLastRow();
  ok(r.ok && antes > 320 && depois < 20 && g.post({ action: 'carregar', token: r.token }).ok && g.post({ action: 'carregar', token: tm }).ok, 'passou de 300 sessões: as vencidas saem de uma vez e as válidas continuam (' + antes + ' → ' + depois + ' linhas)');
}
// erro passageiro do servidor vem marcado, para o jogo tentar de novo
{
  const was = g.gas.LockService.getScriptLock;
  g.ctx.LockService.getScriptLock = () => ({ waitLock: () => { throw new Error('Lock timeout'); }, releaseLock: () => {} });
  r = g.post({ action: 'salvar', token: tm, dados: save, resumo: {} });
  ok(!r.ok && r.falha === true && /Lock timeout/.test(r.erro), 'trava ocupada: erro marcado como passageiro (o jogo tenta de novo)');
  g.ctx.LockService.getScriptLock = was;
}
// o cliente (js/net.js): tenta de novo o que pode se repetir, não repete o cadastro, e o tempo limite vira aviso claro

// ---------- 0.22: a visita a outros mundos ----------
{
  const A = g.post({ action: 'cadastrar', nome: 'Visitante', email: 'a@visita.com', senha: 'segredo1' }).token;
  const B = g.post({ action: 'cadastrar', nome: 'Visitado', email: 'b@visita.com', senha: 'segredo1' }).token;
  const mundo = JSON.stringify({ v: 1, game: 'genesis', t: 99, people: [] });
  g.post({ action: 'salvar', token: B, dados: mundo, resumo: { anos: 2, vivos: 9, abertura: 'ajuda' } });
  const lista = g.post({ action: 'ranking' }).lista, b = lista.find((x) => x.nome === 'Visitado');
  ok(!!b && !!b.id && b.abertura === 'ajuda', 'o ranking traz o id e a abertura de cada mundo');
  let v = g.post({ action: 'visitar', token: A, alvo: b.id });
  ok(v.ok && JSON.parse(v.dados).t === 99 && v.nome === 'Visitado', 'visitar abre o mundo salvo do outro');
  v = g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'praga' });
  ok(!v.ok && /só aceita ajuda/.test(v.erro), 'mundo "só ajuda" não recebe sabotagem');
  v = g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'comida' });
  ok(v.ok, 'manda ajuda');
  v = g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'explodir' });
  ok(!v.ok, 'ato que não existe é recusado');
  let rc = g.post({ action: 'recados', token: B });
  ok(rc.ok && rc.lista.length === 1 && rc.lista[0].tipo === 'comida' && rc.lista[0].deNome === 'Visitante', 'quem recebeu vê o recado e quem mandou');
  rc = g.post({ action: 'recados', token: B });
  ok(rc.ok && rc.lista.length === 0, 'o recado é entregue uma vez só');
  g.post({ action: 'salvar', token: B, dados: mundo, resumo: { anos: 2, vivos: 9, abertura: 'aberto' } });
  v = g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'boato' });
  ok(v.ok, 'mundo aberto recebe sabotagem');
  g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'material' });   // o terceiro do dia
  v = g.post({ action: 'recado', token: A, alvo: b.id, tipo: 'comida' });
  ok(!v.ok && /recados hoje/.test(v.erro), 'teto de recados por dia (3)');
  g.post({ action: 'salvar', token: B, dados: mundo, resumo: { anos: 2, vivos: 9, abertura: 'fechado' } });
  v = g.post({ action: 'visitar', token: A, alvo: b.id });
  ok(!v.ok && /fechado/.test(v.erro), 'mundo fechado não se visita');
  v = g.post({ action: 'recado', token: B, alvo: g.post({ action: 'ranking' }).lista.find((x) => x.nome === 'Visitado').id, tipo: 'comida' });
  ok(!v.ok, 'ninguém manda recado para o próprio mundo');
}

// ---------- 0.24: a voz das pessoas (Groq) ----------
{
  const T = g.post({ action: 'cadastrar', nome: 'Falante', email: 'f@voz.com', senha: 'segredo1' }).token;
  const pede = (msg, extra) => g.post(Object.assign({ action: 'falar', token: T, msg, pessoa: { nome: 'Iara', quem: 'mulher de 25 anos' }, contexto: 'Fé 80. Mãe de Tainá.' }, extra || {}));
  let v = pede('Olá, Iara.');
  ok(!v.ok && v.semVoz, 'sem a chave GROQ_API_KEY, a voz avisa que não está ligada');
  g.gas._props.set('GROQ_API_KEY', 'gsk_teste');
  v = pede('Olá, Iara.');
  const f = g.gas._fetches[g.gas._fetches.length - 1], corpo = JSON.parse(f.o.payload);
  ok(v.ok && v.texto === 'Estou aqui, Deus.', 'responde e limpa a fala (sem ação entre asteriscos nem aspas): ' + JSON.stringify(v.texto));
  ok(f.o.headers.Authorization === 'Bearer gsk_teste' && corpo.model === 'llama-3.3-70b-versatile', 'chama o Groq com a chave das propriedades e o modelo melhor');
  ok(/Iara/.test(corpo.messages[0].content) && /Mãe de Tainá/.test(corpo.messages[0].content) && corpo.messages[corpo.messages.length - 1].content === 'Olá, Iara.', 'a pessoa, os fatos e a fala do jogador vão no pedido');
  v = pede('E agora?', { hist: [{ r: 'u', t: 'Olá' }, { r: 'p', t: 'Oi, Deus.' }] });
  const m2 = JSON.parse(g.gas._fetches[g.gas._fetches.length - 1].o.payload).messages;
  ok(m2.length === 4 && m2[1].role === 'user' && m2[2].role === 'assistant', 'as últimas falas da conversa vão junto, com quem disse cada uma');
  ok(!pede('   ').ok, 'fala vazia é recusada');
  ok(!g.post({ action: 'falar', msg: 'oi' }).ok, 'sem conta, não fala');
  // o modelo melhor esgotado: cai para a reserva
  const g2 = makeGas({ fetch: (url, o) => (JSON.parse(o.payload).model === 'llama-3.3-70b-versatile' ? { code: 429, body: {} } : { code: 200, body: { choices: [{ message: { content: 'Reserva.' } }] } }) });
  g2.ctx.setup(); g2.gas._props.set('GROQ_API_KEY', 'k');
  const T2 = g2.post({ action: 'cadastrar', nome: 'Reserva', email: 'r@voz.com', senha: 'segredo1' }).token;
  v = g2.post({ action: 'falar', token: T2, msg: 'oi', pessoa: {}, contexto: '' });
  ok(v.ok && v.texto === 'Reserva.', 'cota do modelo melhor acabou: responde com o modelo reserva');
  const g3 = makeGas({ fetch: () => ({ code: 401, body: {} }) });
  g3.ctx.setup(); g3.gas._props.set('GROQ_API_KEY', 'k');
  const T3 = g3.post({ action: 'cadastrar', nome: 'Sem chave', email: 's@voz.com', senha: 'segredo1' }).token;
  v = g3.post({ action: 'falar', token: T3, msg: 'oi', pessoa: {}, contexto: '' });
  ok(!v.ok && /chave/.test(v.erro), 'chave recusada pelo Groq vira aviso claro');
  // teto por conta
  let ultima = null;
  for (let i = 0; i < 40; i++) ultima = pede('fala ' + i);
  ok(!ultima.ok && ultima.cota, 'teto de falas por conta a cada dia');
}

async function cliente() {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  let calls = [], plan = [];
  const fakeFetch = async (url, o) => {
    const body = JSON.parse(o.body); calls.push(body.action);
    const step = plan.shift() || 'ok';
    if (step === 'rede') throw new Error('rede');
    if (step === 'html') return { text: async () => '<html>erro</html>' };
    if (step === 'falha') return { text: async () => JSON.stringify({ ok: false, falha: true, erro: 'Erro no servidor: Lock timeout', now: Date.now() }) };
    if (step === 'demora') return new Promise((res, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))));
    return { text: async () => JSON.stringify({ ok: true, now: Date.now(), token: 't', usuario: { nome: 'D', email: 'd@x.com' } }) };
  };
  const store = new Map();
  const ctx = vm.createContext({ G: { CFG: { API_URL: 'https://exemplo/exec' } }, fetch: fakeFetch, AbortController, setTimeout, clearTimeout, Date, JSON, Math, Promise, URLSearchParams,
    location: { search: '' }, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } });
  ctx.globalThis = ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'net.js'), 'utf8'), ctx);
  const Net = ctx.G.Net;
  calls = []; plan = ['rede', 'ok'];
  let r = await Net.call('entrar', { email: 'd@x.com', senha: '123456' });
  ok(r.ok && calls.length === 2, 'cliente: falha de rede no entrar tenta mais uma vez e entra');
  calls = []; plan = ['html', 'ok'];
  r = await Net.call('carregar', { token: 't' });
  ok(r.ok && calls.length === 2, 'cliente: resposta estranha (página de erro) tenta mais uma vez');
  calls = []; plan = ['falha', 'ok'];
  r = await Net.call('salvar', { token: 't', dados: '{}' });
  ok(r.ok && calls.length === 2, 'cliente: erro passageiro do servidor tenta mais uma vez');
  calls = []; plan = ['rede', 'ok'];
  r = await Net.call('cadastrar', { nome: 'D', email: 'd@x.com', senha: '123456' });
  ok(!r.ok && r.offline && calls.length === 1, 'cliente: o cadastro não se repete sozinho (quem cuida é o login, que tenta entrar com os mesmos dados)');
  calls = []; plan = ['demora'];
  r = await Net.call('entrar', { email: 'd@x.com', senha: '123456' }, 60);
  ok(!r.ok && r.lenta && /demorou/.test(r.erro) && calls.length === 1, 'cliente: servidor que demora demais vira aviso claro (sem repetir a espera)');
}
const t0 = Date.now(); for (let i = 0; i < 5; i++) g.post({ action: 'entrar', email: 'maria@exemplo.com', senha: 'segredo3' });
console.log('\nentrar (com hash de senha) leva ~' + Math.round((Date.now() - t0) / 5) + ' ms no Node');
cliente().then(() => {
  console.log(fails ? fails + ' falha(s)' : 'tudo certo');
  process.exit(fails ? 1 : 0);
});
