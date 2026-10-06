// Monta as versões de arquivo único: dist/gods.html (GitHub Pages, abre direto) e dist/artifact.html (sem <html>/<head>/<body>).
// Uso: node tools/build.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const body = html.split('<!--BODY-->')[1].split('<!--/BODY-->')[0].trim();
const css = read('css/digits.css') + '\n' + read('css/style.css');
const order = ['core', 'config', 'world', 'sim', 'family', 'life', 'tech', 'invencoes', 'obras', 'fauna', 'bichos', 'campo', 'ai', 'god', 'deus', 'narrator', 'povos', 'minas', 'save', 'offline', 'net', 'art', 'render', 'audio', 'ui', 'main'];
const js = order.map((f) => '/* ---- js/' + f + '.js ---- */\n' + read('js/' + f + '.js')).join('\n');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Pixelify+Sans:wght@400;500;600;700&display=swap">';
const safeJs = js.replace(/<\/script/gi, '<\\/script');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const full = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Gods</title>
<meta name="description" content="Um casal. Um lugar. Todas as eras. Simulador de sobrevivência em pixel art em que você é Deus.">
<meta name="theme-color" content="#181425">
${fonts}
<style>
${css}
</style>
</head>
<body data-mode="title">
${body}
<script>
${safeJs}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'dist/gods.html'), full);
// o nome antigo do arquivo (até a 0.11) não é mais gerado: apague dist/genesis.html se ele ainda estiver publicado
try { fs.unlinkSync(path.join(root, 'dist/genesis.html')); } catch (e) { /* já não existe */ }
const artifact = `<title>Gods</title>
${fonts}
<style>
${css}
</style>
${body}
<script>
${safeJs}
</script>
`;
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);
console.log('dist/gods.html', (full.length / 1024).toFixed(0) + ' KB');
console.log('dist/artifact.html', (artifact.length / 1024).toFixed(0) + ' KB');
