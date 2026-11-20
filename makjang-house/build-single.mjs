// 단일 HTML 빌드 (오프라인 전용, 서버 불필요) → dist/makjang-house.html
// node build-single.mjs
import fs from 'node:fs';
import path from 'node:path';

const R = path.dirname(new URL(import.meta.url).pathname);
const read = (f) => fs.readFileSync(path.join(R, f), 'utf8');
const MODS = ['shared/data.js', 'shared/engine.js', 'shared/bot.js', 'shared/table.js', 'public/app.js'];
const id = (f) => 'M_' + path.basename(f, '.js');

const wrap = (f) => {
  let src = read(f);
  const names = [...src.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
  src = src
    .replace(/^import \* as (\w+) from '[^']*\/(\w+)\.js';$/gm, (_, a, m) => `const ${a} = M_${m};`)
    .replace(/^import \{([^}]+)\} from '[^']*\/(\w+)\.js';$/gm, (_, a, m) => `const {${a}} = M_${m};`)
    .replace(/^export (?=(?:async )?(?:function|const|let|class) )/gm, '');
  if (/^\s*(import|export)\b/m.test(src)) throw new Error('unhandled import/export in ' + f);
  return `const ${id(f)} = (() => {\n${src}\nreturn { ${names.join(', ')} };\n})();`;
};

const html = read('public/index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"'));
const css = read('public/style.css').replace(
  '.screen { display: none; height: 100%; overflow-y: auto; padding: 16px; }',
  '.screen { display: none; height: 100%; overflow-y: auto; padding-block: 16px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }'
);
const out = `<title>막장하우스</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0b2a1c">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700;900&display=swap">
<style>
:root { color-scheme: dark; }
html, body { height: 100%; background: #06150e; }
${css}
#scr-game.active { padding-left: max(10px, env(safe-area-inset-left, 0px)); padding-right: max(10px, env(safe-area-inset-right, 0px)); }
</style>
${body}
<script type="module">
window.__ARTIFACT__ = true;
${MODS.map(wrap).join('\n\n')}
</script>
`;
fs.mkdirSync(path.join(R, 'dist'), { recursive: true });
fs.writeFileSync(path.join(R, 'dist/makjang-house.html'), out);
console.log('dist/makjang-house.html', (out.length / 1024).toFixed(1) + 'KB');
