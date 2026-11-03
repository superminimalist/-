// /mafatih as a claude.ai artifact: dist/index.html (app + CSS inline) + dist/content.json (the book)
// node artifact/mafatih/build.mjs
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dist = join(here, "dist");
mkdirSync(dist, { recursive: true });

// ── data
const src = join(root, "content", "mafatih");
const index = JSON.parse(readFileSync(join(src, "index.json"), "utf8"));
const s = {};
for (const f of readdirSync(join(src, "s"))) s[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(src, "s", f), "utf8")).blocks;
writeFileSync(join(dist, "content.json"), JSON.stringify({ index, s }));

// ── js
const js = await build({
  entryPoints: [join(here, "main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  write: false,
  jsx: "automatic",
  alias: {
    "@/i18n/navigation": join(here, "shims/navigation.tsx"),
    "@/i18n/routing": join(here, "shims/routing.ts"),
    "next-intl": join(here, "shims/next-intl.ts"),
    "@": root,
  },
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_HIJRI_OFFSET_DAYS": '"0"' },
  legalComments: "none",
});

// ── css: tailwind over the mafatih components + the Mafatih block of app/globals.css
const globals = readFileSync(join(root, "app/globals.css"), "utf8");
const block = globals.slice(globals.indexOf("/* ───────────────────────── Mafatih"));
const input = `@import "tailwindcss" source(none);
@source "../../components/mafatih";
@source "../../lib/mafatih";
@source "./";
${block}
${readFileSync(join(here, "host.css"), "utf8")}`;
writeFileSync(join(here, ".tw-input.css"), input);
execSync(`npx @tailwindcss/cli -i ${join(here, ".tw-input.css")} -o ${join(dist, "app.css")} --minify`, { cwd: root, stdio: "inherit" });
const css = readFileSync(join(dist, "app.css"), "utf8");
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>마파티훌 지난</title>
<meta name="theme-color" content="#f2f4f6">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Noto+Naskh+Arabic:wght@400;600&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${code}</script>
`;
writeFileSync(join(dist, "index.html"), html);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KiB, content.json ${(readFileSync(join(dist, "content.json")).length / 1024).toFixed(0)} KiB`);
