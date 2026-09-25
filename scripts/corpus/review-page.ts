/**
 * Generates data/corpus/review.html: a self-contained page (no server, works offline)
 * where the clinician reviews every screened article and exports her decisions.
 * Put the exported file at data/corpus/decisions.json; corpus:build then only
 * includes the articles she kept.
 *
 *   pnpm corpus:review
 */
import fs from "node:fs";
import path from "node:path";
import { CORPUS_DIR, readArticle, readJson, SCREENING_FILE, summarize, type Screening } from "./bioc";

const screening = readJson<Record<string, Screening>>(SCREENING_FILE, {});
const topics = readJson<Record<string, string[]>>(path.join(CORPUS_DIR, "candidates.json"), {});

const LEVEL_ORDER = { A: 0, B: 1, C: 2 } as const;

const articles = Object.entries(screening)
  .map(([id, s]) => {
    const passages = readArticle(id);
    if (!passages) return null;
    const a = summarize(passages);
    return {
      id,
      title: a.title,
      year: a.year,
      fullText: a.fullText,
      abstract: a.abstract,
      url: `https://pmc.ncbi.nlm.nih.gov/articles/${id}/`,
      topics: topics[id] ?? [],
      suggested: s.keep ? "keep" : "drop",
      level: s.level,
      type: s.type,
      reason: s.reason,
    };
  })
  .filter((a) => a !== null)
  .sort((a, b) => (a.suggested === b.suggested ? LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (b.year ?? 0) - (a.year ?? 0) : a.suggested === "keep" ? -1 : 1));

if (articles.length === 0) {
  console.error("Nothing screened yet (data/corpus/screening.json is empty).");
  process.exit(1);
}

// Embedded as JSON; "</" is escaped so article text can't close the script tag.
const data = JSON.stringify(articles).replace(/<\//g, "<\\/");

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revue du corpus</title>
<link rel="icon" href="data:,">
<style>
  :root { --bg:#efede5; --card:#fff; --line:#e4e1d8; --ink:#1f2624; --soft:#4a524f; --muted:#7c837f; --primary:#2a6b5c; --tint:#e6f0ec; --warn:#f8e3d3; --warn-ink:#a9522a; --muted-bg:#e8e7f4; --muted-ink:#55568a; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#161b1a; --card:#1f2624; --line:#2e3935; --ink:#eef1ef; --soft:#c9cfcb; --muted:#8f9894; --primary:#5fb39e; --tint:#23413a; --warn:#4a2f22; --warn-ink:#f0b596; --muted-bg:#2d2d45; --muted-ink:#b9baf0; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { position:sticky; top:0; z-index:2; background:var(--bg); border-bottom:1px solid var(--line); padding:14px 16px; }
  .wrap { max-width:960px; margin:0 auto; }
  h1 { font:500 24px/1.2 Georgia, serif; margin:0 0 4px; }
  .hint { color:var(--muted); font-size:13px; margin:0 0 10px; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  select, button { font:inherit; font-size:13px; border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:8px; padding:6px 10px; }
  button { cursor:pointer; }
  button.primary { background:var(--primary); border-color:var(--primary); color:#fff; font-weight:600; }
  .count { color:var(--soft); font-size:13px; margin-inline-start:auto; }
  main { padding:16px; }
  article { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin-bottom:10px; }
  article.drop { opacity:.62; }
  .meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:12px; color:var(--muted); margin-bottom:4px; }
  .badge { border-radius:999px; padding:1px 8px; font-size:11.5px; font-weight:600; }
  .A { background:var(--tint); color:var(--primary); } .B { background:var(--muted-bg); color:var(--muted-ink); } .C { background:var(--warn); color:var(--warn-ink); }
  h2 { font-size:15px; font-weight:600; margin:0 0 4px; }
  h2 a { color:inherit; text-decoration:none; } h2 a:hover { text-decoration:underline; }
  .reason { font-size:13px; color:var(--soft); margin:0 0 6px; }
  details { font-size:13px; color:var(--soft); } summary { cursor:pointer; color:var(--primary); }
  .actions { display:flex; gap:6px; margin-top:8px; }
  .actions button[aria-pressed="true"].keep { background:var(--primary); border-color:var(--primary); color:#fff; }
  .actions button[aria-pressed="true"].dropb { background:var(--warn-ink); border-color:var(--warn-ink); color:#fff; }
  .changed { font-size:11.5px; color:var(--warn-ink); align-self:center; }
</style>
</head>
<body>
<header><div class="wrap">
  <h1>Revue du corpus</h1>
  <p class="hint">Articles en libre accès proposés pour la bibliothèque du collègue expert. Chaque article est pré-trié (niveau A : directement utile en pratique, B : utile, C : marginal) ; gardez ou écartez-le, puis exportez vos décisions. Vos choix sont enregistrés dans ce navigateur au fur et à mesure.</p>
  <div class="bar">
    <select id="topic" aria-label="Thème"><option value="">Tous les thèmes</option></select>
    <select id="level" aria-label="Niveau"><option value="">Tous les niveaux</option><option>A</option><option>B</option><option>C</option></select>
    <select id="status" aria-label="Décision"><option value="">Toutes les décisions</option><option value="keep">Gardés</option><option value="drop">Écartés</option><option value="changed">Modifiés par vous</option></select>
    <span class="count" id="count"></span>
    <button class="primary" id="export">Exporter mes décisions</button>
  </div>
</div></header>
<main class="wrap" id="list"></main>
<script>
const ARTICLES = ${data};
const KEY = "corpus-review-v1";
const TYPES = { review: "Revue", trial: "Essai", observational: "Observationnel", qualitative: "Qualitatif", assessment: "Évaluation", case: "Cas", other: "Autre" };
const TOPICS = { sensory: "Sensoriel", "autism-behavior": "Autisme et comportement", "fine-motor": "Motricité fine", dcd: "TDC", feeding: "Alimentation", adhd: "TDAH", "cerebral-palsy": "Paralysie cérébrale", "self-care": "Autonomie", school: "École", play: "Jeu", "early-intervention": "Intervention précoce", "ot-general": "Ergothérapie" };
let decisions = {};
try { decisions = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(decisions)); } catch {} };
const decision = (a) => decisions[a.id] || a.suggested;

const topicSelect = document.getElementById("topic");
[...new Set(ARTICLES.flatMap((a) => a.topics))].sort().forEach((t) => topicSelect.add(new Option(TOPICS[t] || t, t)));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function render() {
  const t = topicSelect.value, l = document.getElementById("level").value, st = document.getElementById("status").value;
  const shown = ARTICLES.filter((a) => (!t || a.topics.includes(t)) && (!l || a.level === l) &&
    (!st || (st === "changed" ? decisions[a.id] && decisions[a.id] !== a.suggested : decision(a) === st)));
  const kept = ARTICLES.filter((a) => decision(a) === "keep").length;
  document.getElementById("count").textContent = shown.length + " affichés · " + kept + " gardés sur " + ARTICLES.length;
  document.getElementById("list").innerHTML = shown.map((a) => {
    const d = decision(a);
    return '<article class="' + d + '" data-id="' + a.id + '">' +
      '<div class="meta"><span class="badge ' + a.level + '">' + a.level + '</span>' + esc(TYPES[a.type] || a.type) + " · " + (a.year || "?") +
      (a.fullText ? "" : " · résumé seul") + " · " + a.topics.map((x) => esc(TOPICS[x] || x)).join(", ") + '</div>' +
      '<h2><a href="' + a.url + '" target="_blank" rel="noreferrer">' + esc(a.title) + '</a></h2>' +
      '<p class="reason">' + esc(a.reason) + '</p>' +
      (a.abstract ? '<details><summary>Résumé</summary><p>' + esc(a.abstract) + '</p></details>' : '') +
      '<div class="actions"><button class="keep" aria-pressed="' + (d === "keep") + '" data-d="keep">Garder</button>' +
      '<button class="dropb" aria-pressed="' + (d === "drop") + '" data-d="drop">Écarter</button>' +
      (decisions[a.id] && decisions[a.id] !== a.suggested ? '<span class="changed">modifié</span>' : '') + '</div></article>';
  }).join("");
}

document.getElementById("list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-d]");
  if (!btn) return;
  decisions[btn.closest("article").dataset.id] = btn.dataset.d;
  save();
  render();
});
["topic", "level", "status"].forEach((id) => document.getElementById(id).addEventListener("change", render));
document.getElementById("export").addEventListener("click", () => {
  const out = { exportedAt: new Date().toISOString(), decisions: Object.fromEntries(ARTICLES.map((a) => [a.id, decision(a)])) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "decisions.json" });
  link.click();
  URL.revokeObjectURL(url);
});
render();
</script>
</body>
</html>`;

const out = path.join(CORPUS_DIR, "review.html");
fs.writeFileSync(out, html);
const kept = articles.filter((a) => a.suggested === "keep").length;
console.log(`Wrote ${out}: ${articles.length} articles (${kept} suggested to keep).`);
