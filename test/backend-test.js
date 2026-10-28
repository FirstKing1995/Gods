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
