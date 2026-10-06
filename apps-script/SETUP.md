# Servidor do Gods (Google Planilhas + Apps Script)

O jogo funciona sem servidor: salva no navegador e pronto. O servidor serve para ter **conta**, **save na nuvem** (continuar em outro aparelho), **hora confiável** para o tempo offline e **ranking**. Leva uns 10 minutos e é gratuito.

## O que ele guarda

| Onde | O quê |
|---|---|
| Aba `contas` | id, nome, e-mail, sal, hash da senha, datas, id do arquivo do mundo, resumo (usado no ranking) |
| Aba `sessoes` | token de login, conta, validade (30 dias) |
| Pasta `Gods · saves` no seu Drive (em servidor montado antes da 0.12 ela continua se chamando `Gênesis · saves`, e funciona igual) | um arquivo JSON por mundo (de 16 KB no começo a uns 50 KB com a aldeia crescida) |

O mundo vai para um arquivo no Drive, e não para uma célula, porque uma célula de planilha aceita no máximo 50 mil caracteres e o save cresce junto com o povo.

## Instalação

1. **Crie a planilha.** Entre em [sheets.new](https://sheets.new) com a conta Google que vai hospedar o jogo e dê um nome, por exemplo `Gods · servidor`.
2. **Cole o código.** Na planilha, abra **Extensões → Apps Script**. Apague o conteúdo de `Código.gs` e cole o arquivo [`Code.gs`](Code.gs) inteiro.
3. **Cole o manifesto.** Em **Configurações do projeto** (engrenagem), marque *Mostrar o arquivo de manifesto "appsscript.json" no editor*. Abra `appsscript.json` e cole o conteúdo de [`appsscript.json`](appsscript.json). O fuso está em `America/Fortaleza`; troque se quiser.
4. **Rode `setup()` uma vez.** Na barra do editor, escolha a função `setup` e clique em **Executar**. O Google pede autorização; como o script é seu, ele avisa que o app não foi verificado: clique em **Avançado → Acessar (não seguro)** e permita. O `setup()` cria as abas, a pasta de saves e uma "pimenta" secreta para as senhas (fica em Propriedades do script).
5. **Publique como App da Web.** **Implantar → Nova implantação → App da Web**, com:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa** (não "qualquer pessoa com conta Google": o jogo chama o servidor sem login do Google)

   Copie a URL que termina em `/exec`.
6. **Ligue o jogo ao servidor.** Duas opções:
   - Cole a URL em `API_URL` no arquivo `js/config.js` e gere de novo o arquivo único com `node tools/build.js`.
   - Ou, sem mexer no código, abra o jogo uma vez com `?api=` e a URL, por exemplo `https://seu-usuario.github.io/gods/?api=https://script.google.com/macros/s/.../exec`. O endereço fica guardado naquele navegador.

Pronto: a tela inicial passa a mostrar **Entrar**, **Criar conta** e **Ranking**.

## Publicar o jogo no GitHub Pages

1. Crie um repositório (por exemplo `gods`) e suba a pasta do projeto. Quem já publicou com o nome antigo pode continuar no mesmo repositório: o endereço não muda.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O endereço fica `https://seu-usuario.github.io/gods/`. O `index.html` abre direto; `dist/gods.html` é a mesma coisa em arquivo único.

## Atualizar o servidor depois

Edite o código e vá em **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar**. A URL `/exec` continua a mesma, então o jogo não precisa mudar.

Na 0.10 o `Code.gs` mudou (limpa as sessões vencidas de uma vez quando passam de 300 e marca os erros passageiros, como trava ocupada, para o jogo tentar de novo): vale colar o arquivo novo e publicar uma nova versão.

## Erros ao criar conta ou entrar

Depois de um tempo sem ninguém chamar, o Apps Script "dorme" e a primeira resposta pode levar de 10 a 30 segundos. Desde a 0.10 o jogo lida com isso sozinho: acorda o servidor ao abrir a tela de título e a janela da conta, espera até 45 segundos no cadastro e no login, tenta de novo quando a rede falha ou o servidor tropeça e, se a conta foi criada mas a resposta se perdeu, entra direto com os mesmos dados. Se mesmo assim aparecer erro:

- **"O servidor respondeu algo inesperado"** o tempo todo: a implantação não está como "Qualquer pessoa", ou a URL não é a que termina em `/exec`.
- **"Erro no servidor: ..."**: abra **Execuções** no editor do Apps Script para ver o erro completo; se falar de autorização, rode `setup()` de novo e autorize.
- **Demora sempre, não só na primeira vez**: confira se a aba `sessoes` não ficou enorme (a 0.10 limpa as vencidas no login).

## Testar sem o Google

Os testes usam um Google de mentira (`test/gas-mock.js`) com planilha, Drive, cache e trava em memória:

```bash
node test/backend-test.js      # 29 verificações: cadastro, login, sessão, save, carregar, apagar, ranking, limpeza das sessões e o cliente (tentar de novo)
node test/dev-server.js        # jogo + servidor falso em http://localhost:8787/?api=http://localhost:8787/exec
```

No servidor de teste, `http://localhost:8787/__shift?ms=7200000` adianta o relógio do servidor em 2 horas, para ver o resumo de "Enquanto você esteve fora…".

## Como o jogo conversa com o servidor

- Um único `POST` para `/exec` com corpo JSON e `Content-Type: text/plain`. Esse tipo não dispara a checagem prévia de CORS, que o Apps Script não responde.
- Toda resposta traz `now`, a hora do servidor. O jogo usa essa hora para calcular quanto tempo você ficou fora, então mudar o relógio do celular não acelera o mundo.
- O jogo salva na nuvem a cada 3 minutos e ao fechar a aba (`navigator.sendBeacon`). Ao continuar, ele compara o save da nuvem com o do aparelho e abre o mais novo.
- Ações: `hora`, `cadastrar`, `entrar`, `sair`, `salvar`, `carregar`, `apagar`, `ranking`.

## Segurança: o que esperar

- As senhas nunca ficam em texto puro: são guardadas como SHA-256 com sal próprio de cada conta mais a pimenta do script, em 300 rodadas. É o que o Apps Script oferece; não é bcrypt nem argon2. Vale avisar os jogadores para não repetirem a senha do e-mail ou do banco.
- O token de sessão é aleatório (64 caracteres), vale 30 dias e é apagado em **Sair da conta**.
- Tudo passa por HTTPS (`script.google.com`).
- Não compartilhe a planilha: ela tem os e-mails dos jogadores.
- Ainda não existe "esqueci minha senha". Dá para fazer depois com `MailApp` mandando um código por e-mail.
- As cotas gratuitas do Apps Script aguentam bem um grupo de amigos. Se o jogo crescer para centenas de pessoas jogando ao mesmo tempo, o caminho é levar este mesmo contrato (as oito ações acima) para um backend como Firebase ou Supabase.
