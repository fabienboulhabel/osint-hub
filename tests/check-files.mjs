// Vérifications sans navigateur : syntaxe JavaScript et fichiers référencés présents
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

let errors = 0;
const fail = msg => { console.error("✗ " + msg); errors++; };

// 1. Syntaxe de tous les fichiers JavaScript
const js = ["sw.js", "data.js", "world.js", "land.js", "legal.js", ...readdirSync("js").filter(f => f.endsWith(".js")).map(f => "js/" + f)];
for (const f of js) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); console.log("✓ syntaxe " + f); }
  catch (e) { fail(`erreur de syntaxe dans ${f}\n${e.stderr}`); }
}

// 2. Chaque fichier local chargé par index.html existe
const html = readFileSync("index.html", "utf8");
for (const [, src] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("#")) continue;
  if (!existsSync(src)) fail(`index.html charge « ${src} », introuvable`);
}

// 3. Chaque module de js/ est bien chargé par index.html et mis en cache par sw.js
const sw = readFileSync("sw.js", "utf8");
for (const f of readdirSync("js").filter(f => f.endsWith(".js"))) {
  if (!html.includes(`src="js/${f}"`)) fail(`js/${f} n'est pas chargé par index.html`);
  if (!sw.includes(`"${f.replace(/\.js$/, "")}"`)) fail(`js/${f} n'est pas dans la liste du service worker (sw.js)`);
}

// 4. Aucune sauvegarde personnelle ne doit être publiée
for (const f of readdirSync(".")) if (/^osint-hub-(sauvegarde|auto)-.*\.json$/.test(f)) fail(`fichier personnel à ne pas publier : ${f}`);

if (errors) { console.error(`\n${errors} problème(s) détecté(s).`); process.exit(1); }
console.log("\nTout est en ordre.");
