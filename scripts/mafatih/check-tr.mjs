// Validate a translation overlay against the extracted text.
// node scripts/mafatih/check-tr.mjs content/mafatih/translations/chunk-07.json [chunkNo]
// With chunkNo, also checks that every block assigned in scripts/mafatih/chunks.json is covered.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [file, chunkNo] = process.argv.slice(2);
const root = join(import.meta.dirname, "..", "..");
const skel = (t) => t.replace(/[ً-ْٰ\s]/g, "");
const hangul = /[가-힣]/;
const errors = [];
let tr;
try {
  tr = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.log(`INVALID JSON: ${e.message}`);
  process.exit(1);
}

let n = 0;
for (const [sid, entries] of Object.entries(tr)) {
  let blocks;
  try {
    blocks = JSON.parse(readFileSync(join(root, "content/mafatih/s", `${sid}.json`), "utf8")).blocks;
  } catch {
    errors.push(`${sid}: no such section`);
    continue;
  }
  for (const [i, o] of Object.entries(entries)) {
    n++;
    const b = blocks[Number(i)];
    const at = `${sid}[${i}]`;
    if (!b) errors.push(`${at}: no block at this index`);
    else if (b.t !== "ar") errors.push(`${at}: block is "${b.t}", not Arabic`);
    else if (!o.c || !skel(b.x).startsWith(skel(o.c))) errors.push(`${at}: "c" does not match the start of the block (${b.x.slice(0, 30)}…)`);
    if (!o.en || o.en.length < 2) errors.push(`${at}: missing en`);
    if (!o.ko || !hangul.test(o.ko)) errors.push(`${at}: missing/invalid ko`);
    if (o.ar !== undefined && skel(o.ar).length < skel(b?.x ?? "").length * 0.6) errors.push(`${at}: "ar" much shorter than the block; must cover the same span`);
  }
}

if (chunkNo) {
  // coverage across every part file of this chunk: chunk-NN.json, chunk-NN-p2.json, …
  const dir = join(root, "content/mafatih/translations");
  const nn = String(chunkNo).padStart(2, "0");
  const all = {};
  for (const f of readdirSync(dir).filter((f) => f.startsWith(`chunk-${nn}`) && f.endsWith(".json")))
    for (const [sid, e] of Object.entries(JSON.parse(readFileSync(join(dir, f), "utf8")))) Object.assign((all[sid] ??= {}), e);
  const chunk = JSON.parse(readFileSync(join(root, "scripts/mafatih/chunks.json"), "utf8")).find((c) => c.chunk === Number(chunkNo));
  let missing = 0;
  for (const s of chunk?.sections ?? []) for (const i of s.idx) if (!all[s.id]?.[String(i)]) { missing++; if (missing <= 40) errors.push(`${s.id}[${i}]: assigned but not translated yet`); }
  if (missing > 40) errors.push(`… ${missing} untranslated in total`);
}

if (errors.length) {
  console.log(`${errors.length} problem(s) in ${n} entries:\n` + errors.slice(0, 60).join("\n"));
  process.exit(1);
}
console.log(`OK ${n} entries`);
