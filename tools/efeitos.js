// Gods · monta js/efeitos.js a partir do pacote PVFX Foundry (CC0, nerijs). Embute só os efeitos que o jogo usa,
// no nível "strict" (paleta curta, sem meio-transparente: combina com o pixel art). Rode de novo ao mudar a lista.
// Uso: node tools/efeitos.js [pasta do pacote]   (padrão: ../../pacotes/pvfx-foundry/conteudo)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pack = process.argv[2] || path.join(root, '..', '..', 'pacotes', 'pvfx-foundry', 'conteudo');
// nome no jogo -> efeito do pacote
const USA = {
  raio: 'lightning/lightning-strike',
  nuvem: 'lightning/thunder-cloud',
  cura: 'holy/holy-heal',
  bencao: 'holy/angel-feathers',
  revelacao: 'arcane/magic-circle',
  calor: 'fire/ground-flames',
  chuva: 'water/water-splash',
  grande: 'holy/divine-beam',
  luz: 'holy/resurrect',
  nivel: 'ui/level-up',
  dom: 'explosions/arcane-burst',
  alma: 'arcane/teleport-in',
  golpe: 'impacts/hit-spark',
  forte: 'impacts/crit-hit',
  poeira: 'smoke/dust-puff',
  fogo: 'fire/fireball-impact',
  sacerdote: 'nature/bloom-heal',
  esmaga: 'impacts/ground-slam',
  pedras: 'impacts/rock-shatter',
  chamas: 'fire/fire-pillar',
  explosao: 'explosions/big-explosion',
  fumaca: 'smoke/smoke-bomb',
  brilho: 'ui/star-burst-pickup',
};
const out = {};
let bytes = 0;
for (const k in USA) {
  const dir = path.join(pack, 'effects', USA[k], 'strict', 'packed');
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const png = fs.readFileSync(path.join(dir, 'sprite-sheet.png'));
  bytes += png.length;
  // cada quadro: [x, y, largura, altura no sheet, deslocamento x, y dentro da tela do efeito, duração em ms]
  const f = m.frames.map((q) => [q.sheet.x, q.sheet.y, q.sheet.width, q.sheet.height, q.trim_bounds[0], q.trim_bounds[1], Math.round(q.duration.numerator_ms / q.duration.denominator)]);
  out[k] = { src: USA[k], img: 'data:image/png;base64,' + png.toString('base64'), pv: m.pivot, sz: m.source_size, loop: m.loop_mode === 'loop' ? 1 : 0, f };
}
const txt = '/* Gods · efeitos animados (0.42), gerado por tools/efeitos.js. Não edite à mão.\n' +
  '   PVFX Foundry 1.0.0, de nerijs (https://nerijs.itch.io/pvfx-foundry), CC0 1.0: domínio público, uso comercial livre. */\n' +
  '(function (G) {\n  G.EFX_DADOS = ' + JSON.stringify(out) + ';\n})(globalThis.G = globalThis.G || {});\n';
fs.writeFileSync(path.join(root, 'js', 'efeitos.js'), txt);
console.log('js/efeitos.js', Object.keys(out).length, 'efeitos,', Math.round(bytes / 1024), 'KB de imagem,', Math.round(txt.length / 1024), 'KB no arquivo');
