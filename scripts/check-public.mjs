// Fails the build if private information reaches this public repo's own content.
// Demos in public/demos are third-party-style data snapshots, so only secret patterns apply there.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const TEXT = new Set([".astro", ".json", ".md", ".mjs", ".ts", ".txt", ".yml", ".html", ".js", ".css"]);
const SKIP = new Set(["node_modules", "dist", ".astro", ".git", "vendor", "package-lock.json", "check-public.mjs"]);

const SECRETS = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["API key", /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,})\b/],
  ["URL with credentials", /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@'"]+:[^@\s'"]{3,}@/i],
  ["private artifact link", /claude\.ai\/(?:code\/)?artifact/],
];
const PRIVATE = [
  ["phone number", /\+\d{1,3}[ -]?\d{3}[ -]?\d{3}[ -]?\d{4}\b/],
  ["money amount", /(?:\$\s?\d|\b\d[\d,.]*\s?(?:USD|MXN)\b)/],
  ["pay or rate wording", /\b(?:pay floor|hourly rate|per hour|tarifa|valuaci[oó]n|valoraci[oó]n)\b/i],
  ["tax or immigration status", /\b(?:persona f[ií]sica|W-2|visa|US work authorization)\b/i],
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.has(extname(name))) yield path;
  }
}

const problems = [];
for (const path of files(".")) {
  if (path === "CLAUDE.md") continue; // Lists the rules, so it names these terms on purpose.
  const text = readFileSync(path, "utf8");
  const rules = path.startsWith(join("public", "demos")) ? SECRETS : [...SECRETS, ...PRIVATE];
  for (const [label, pattern] of rules) {
    if (pattern.test(text)) problems.push(`${path}: ${label}`);
  }
}

// Fontshare fonts (ITF Free Font License) may not be distributed from a public repo.
// They load from the Fontshare API in Base.astro instead.
for (const name of readdirSync(join("public", "fonts"))) {
  if (/tanker|clash|sharpie/i.test(name)) problems.push(`public/fonts/${name}: Fontshare font file`);
}

if (problems.length) {
  console.error("Public content check failed:\n" + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("Public content check passed.");
