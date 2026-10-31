// Bundles the 3D world into ONE self-contained HTML (claude.ai artifact).
// node artifact/build.mjs → artifact/dist/index.html
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
mkdirSync(join(here, "dist"), { recursive: true });

const js = await build({
  entryPoints: [join(here, "main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  write: false,
  jsx: "automatic",
  alias: { "@": root },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
execSync(`npx @tailwindcss/cli -i ${join(here, "styles.css")} -o ${join(here, "dist/app.css")} --minify`, { cwd: root, stdio: "inherit" });
const css = readFileSync(join(here, "dist/app.css"), "utf8");
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>버츄얼 이맘바르가</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${code}</script>
</body>
</html>`;
writeFileSync(join(here, "dist/index.html"), html);
console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} KiB`);
