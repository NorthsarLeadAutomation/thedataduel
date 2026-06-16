#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// build.js — The Data Duel Static Site Generator
//
// Usage: node build.js
//
// Reads content/*.md → outputs articles/*.html + index.html
// ════════════════════════════════════════════════════════════════════════════

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "content");
const ARTICLES_DIR = join(__dirname, "articles");

// ── SVG fragments ─────────────────────────────────────────────────────────

const LOGO_SVG = `<svg class="logo-emblem" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <circle cx="19" cy="19" r="18" fill="none" stroke="#f5c842" stroke-width="2.5"/>
  <circle cx="19" cy="19" r="14.5" fill="#0a1628"/>
  <text x="19" y="24" text-anchor="middle" font-size="16" font-family="system-ui,sans-serif" fill="#f5c842" font-weight="700">★</text>
</svg>`;

const FOOTER_LOGO_SVG = `<svg width="22" height="22" viewBox="0 0 38 38" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:6px">
  <circle cx="19" cy="19" r="18" fill="none" stroke="#f5c842" stroke-width="2.5"/>
  <circle cx="19" cy="19" r="14.5" fill="#0a1628"/>
  <text x="19" y="24" text-anchor="middle" font-size="16" font-family="system-ui,sans-serif" fill="#f5c842" font-weight="700">★</text>
</svg>`;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Infer badge type from filename stem. */
function inferBadge(stem) {
  if (stem.includes("-vs-")) return "Comparison";
  if (stem.startsWith("best-") || stem.startsWith("top-")) return "Roundup";
  if (stem.endsWith("-review")) return "Review";
  return "Article";
}

/** Extract title (first `# ` heading) from markdown source. */
function extractTitle(src) {
  const m = /^#\s+(.+)$/m.exec(src);
  return m ? m[1].trim() : "Untitled";
}

/**
 * Extract first non-empty paragraph for use as an excerpt.
 * Strips markdown syntax for plain text.
 */
function extractExcerpt(src, maxLen = 220) {
  const lines = src.split("\n");
  let inFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;

    // Skip headings, blockquotes, blank lines, HTML comments
    if (
      line.startsWith("#") ||
      line.startsWith(">") ||
      line.startsWith("<!--") ||
      line.trim() === ""
    ) continue;

    const clean = line
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")   // bold/italic
      .replace(/`([^`]+)`/g, "$1")                 // code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")     // links
      .replace(/[_*~`]/g, "")
      .trim();

    if (clean.length > 20) {
      return clean.length > maxLen ? clean.slice(0, maxLen - 1) + "…" : clean;
    }
  }
  return "";
}

/** HTML-escape a string. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── HTML fragments ────────────────────────────────────────────────────────

function pageHead(title, description, cssPath = "../style.css") {
  const desc = esc(description || `${title} — The Data Duel`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${desc}">
  <title>${esc(title)} | The Data Duel</title>
  <link rel="stylesheet" href="${cssPath}">
</head>
<body>`;
}

function siteHeader(homeHref = "/") {
  return `<header class="site-header" role="banner">
  <div class="site-header-inner">
    <a href="${homeHref}" class="site-logo" aria-label="The Data Duel home">
      ${LOGO_SVG}
      <span class="site-logo-text">THE DATA DUEL</span>
    </a>
    <nav class="site-nav" aria-label="Site navigation">
      <a href="${homeHref}">Home</a>
    </nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer" role="contentinfo">
  <div class="site-footer-inner">
    <span class="footer-logo">
      ${FOOTER_LOGO_SVG}
      THE DATA DUEL
    </span>
    <p>© 2026 The Data Duel. Independent reviews. Affiliate disclosure: some links may earn a commission.</p>
  </div>
</footer>
</body>
</html>`;
}

// ── Badge class helper ────────────────────────────────────────────────────

function badgeClass(badge) {
  if (badge === "Review") return "card-badge-review";
  if (badge === "Comparison") return "card-badge-comparison";
  return "card-badge-roundup";
}

function articleBadgeClass(badge) {
  if (badge === "Review") return "article-header-badge-review";
  if (badge === "Comparison") return "article-header-badge-comparison";
  return "article-header-badge-roundup";
}

// ── Preferred article order for homepage ─────────────────────────────────

const PREFERRED_ORDER = [
  "best-email-marketing-tools-2026",
  "kit-review",
  "kit-vs-mailchimp",
  "kit-vs-moosend",
  "moosend-review",
  "moosend-vs-mailchimp",
];

// ── Load articles ─────────────────────────────────────────────────────────

async function loadArticles() {
  let files;
  try {
    files = await readdir(CONTENT_DIR);
  } catch {
    console.error(`ERROR: Could not read content dir: ${CONTENT_DIR}`);
    return [];
  }

  const metas = [];
  for (const file of files.filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    try {
      const src = await readFile(join(CONTENT_DIR, file), "utf8");
      metas.push({
        slug,
        title: extractTitle(src),
        excerpt: extractExcerpt(src),
        badge: inferBadge(slug),
        date: "June 2026",
        src,
      });
    } catch (err) {
      console.warn(`  WARN: Could not read ${file}: ${err.message}`);
    }
  }

  // Sort: preferred order first, then alphabetical
  metas.sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a.slug);
    const bi = PREFERRED_ORDER.indexOf(b.slug);
    if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return metas;
}

// ── Generate index.html ───────────────────────────────────────────────────

function generateHomepage(articles) {
  const cards = articles
    .map(
      (a) => `      <article class="article-card" role="listitem">
        <div class="card-badge ${badgeClass(a.badge)}">${esc(a.badge)}</div>
        <h2 class="card-title">${esc(a.title)}</h2>
        <p class="card-excerpt">${esc(a.excerpt)}</p>
        <div class="card-footer">
          <span class="card-meta">${esc(a.date)}</span>
          <a href="/articles/${esc(a.slug)}" class="read-more" aria-label="Read ${esc(a.title)}">Read More →</a>
        </div>
      </article>`,
    )
    .join("\n");

  return `${pageHead(
    "The Data Duel — Independent Email Marketing Reviews",
    "Independent reviews and comparisons for email marketing tools. No fluff, real verdicts.",
    "style.css",
  )}

${siteHeader("/")}

<main id="main-content">
  <div class="section-heading">
    <h2>Latest Articles</h2>
    <p class="section-subhead">Honest, independently researched reviews and comparisons. Affiliate links where noted.</p>
  </div>
  <div class="articles-grid" role="list">
${cards}
  </div>
</main>

${siteFooter()}`;
}

// ── Generate article page ─────────────────────────────────────────────────

async function generateArticlePage(meta) {
  let htmlBody;
  try {
    htmlBody = await marked.parse(meta.src);
  } catch {
    htmlBody = `<pre>${esc(meta.src)}</pre>`;
  }

  // Replace /visit/ links with broker subdomain placeholder
  htmlBody = htmlBody.replace(
    /href="\/visit\//g,
    'href="https://broker.thedataduel.com/visit/',
  );
  // Also replace any absolute broker URLs that may appear
  htmlBody = htmlBody.replace(
    /https?:\/\/[^"'\s]*\/visit\//g,
    "https://broker.thedataduel.com/visit/",
  );

  const description = `${meta.title} — Independent reviews and comparisons for email marketing tools. The Data Duel.`;

  return `${pageHead(meta.title, description, "../style.css")}

${siteHeader("/")}

<main class="article-page" id="main-content">
  <div class="article-nav" aria-label="Breadcrumb">
    <div class="article-nav-inner">
      <a href="/" class="back-link">Back to all articles</a>
    </div>
  </div>

  <header class="article-header">
    <div class="card-badge ${badgeClass(meta.badge)}" style="margin-bottom:1rem">${esc(meta.badge)}</div>
    <div class="affiliate-disclosure" role="note">
      The Data Duel may earn a commission if you purchase through affiliate links in this content, at no extra cost to you.
    </div>
  </header>

  <div class="article-body">
    ${htmlBody}
  </div>
</main>

${siteFooter()}`;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏗  The Data Duel — Static Site Builder");
  console.log("━".repeat(50));

  // Ensure output dir exists
  await mkdir(ARTICLES_DIR, { recursive: true });

  // Load all articles
  console.log(`\n📂 Reading content from: ${CONTENT_DIR}`);
  const articles = await loadArticles();
  console.log(`   Found ${articles.length} articles`);

  if (articles.length === 0) {
    console.error("❌ No articles found. Aborting.");
    process.exit(1);
  }

  // Generate article pages
  console.log("\n📝 Generating article pages:");
  const generated = [];
  for (const meta of articles) {
    const html = await generateArticlePage(meta);
    const outPath = join(ARTICLES_DIR, `${meta.slug}.html`);
    await writeFile(outPath, html, "utf8");
    console.log(`   ✅ articles/${meta.slug}.html`);
    generated.push(`articles/${meta.slug}.html`);
  }

  // Generate homepage
  console.log("\n🏠 Generating index.html:");
  const indexHtml = generateHomepage(articles);
  const indexPath = join(__dirname, "index.html");
  await writeFile(indexPath, indexHtml, "utf8");
  console.log("   ✅ index.html");

  console.log("\n━".repeat(50));
  console.log(`✅ Build complete — ${generated.length + 1} files written`);
  console.log(`   Output: ${__dirname}`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
