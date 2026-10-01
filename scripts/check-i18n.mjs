// Fails when a translation key used in source (t("a.b") / labelKey: "a.b") is missing
// from public/i18n/en.json, the reference language. Dynamic keys are not checked.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const en = JSON.parse(readFileSync("public/i18n/en.json", "utf8"));
const has = (key) =>
  key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), en) !==
    undefined || en[key] !== undefined;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) files.push(path);
  }
})("src");

const patterns = [/\bt\(\s*"([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+)"/g, /(?:labelKey|titleKey):\s*"([^"]+)"/g];
const missing = new Map();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const re of patterns) for (const [, key] of text.matchAll(re)) if (!has(key)) missing.set(key, file);
}
if (missing.size) {
  console.error(`Missing ${missing.size} translation key(s) in public/i18n/en.json:`);
  for (const [key, file] of missing) console.error(`  ${key}  (${file})`);
  process.exit(1);
}
console.log(`i18n: all literal keys present (${files.length} files scanned)`);
