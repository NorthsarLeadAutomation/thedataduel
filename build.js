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

const LOGO_SVG = `<img src="/assets/northstar-logo-transparent.png" class="logo-emblem" width="38" height="38" alt="Northstar Lead Automation" style="object-fit:contain;vertical-align:middle;"/>`;

const FOOTER_LOGO_SVG = `<img src="/assets/northstar-logo-transparent.png" width="22" height="22" alt="Northstar Lead Automation" style="vertical-align:middle;margin-right:6px;object-fit:contain;"/>`;

// ── Affiliate CTA map ─────────────────────────────────────────────────────
// Maps article slug keywords → affiliate tools to show
// Broker slugs: convertkit, moosend
const AFFILIATE_TOOLS = {
  kit: {
    name: "Kit (ConvertKit)",
    url: "https://broker.thedataduel.com/visit/convertkit",
    tagline: "Best for creators & newsletters",
    color: "#FB6970",
  },
  moosend: {
    name: "Moosend",
    url: "https://broker.thedataduel.com/visit/moosend",
    tagline: "Best value for budget-conscious teams",
    color: "#1a73e8",
  },
};

// Which tools to show CTAs for, per article slug
const ARTICLE_CTAS = {
  "kit-review":                         ["kit"],
  "moosend-review":                      ["moosend"],
  "kit-vs-mailchimp":                    ["kit"],
  "kit-vs-moosend":                      ["kit", "moosend"],
  "moosend-vs-mailchimp":               ["moosend"],
  "kit-vs-getresponse-2026":            ["kit"],
  "getresponse-vs-mailchimp-2026":      ["moosend"],
  "best-email-marketing-tools-2026":    ["kit", "moosend"],
  "best-kit-alternatives-2026":         ["moosend"],
  "moosend-vs-kit-budget":              ["moosend", "kit"],
  "top-3-getresponse-alternatives-creators": ["kit", "moosend"],
  "webflow-vs-wordpress-2026":          [],
  // Pricing breakdown articles
  "mailchimp-pricing-hidden-costs-2026":  ["moosend", "kit"],
  "moosend-pricing-breakdown-2026":       ["moosend"],
  "kit-pricing-breakdown-2026":           ["kit"],
  // Topic cluster articles
  "mailchimp-vs-moosend-deliverability":  ["moosend"],
  "how-to-migrate-mailchimp-to-kit":      ["kit", "moosend"],
  "email-marketing-for-small-business-2026": ["moosend", "kit"],
};

function buildFloatingPanel(slug) {
  const keys = ARTICLE_CTAS[slug] ?? [];
  if (keys.length === 0) return "";

  const buttons = keys.map((key) => {
    const tool = AFFILIATE_TOOLS[key];
    const short = key === "kit" ? "Kit" : "Moosend";
    return '<a href="' + tool.url + '" class="floating-affiliate-btn" target="_blank" rel="noopener noreferrer sponsored" aria-label="Try ' + tool.name + '">'
      + '<span class="floating-affiliate-label">' + short + '</span>'
      + '<span class="floating-affiliate-arrow">&rarr;</span>'
      + '</a>';
  }).join("\n");

  return '<div class="floating-affiliate" aria-label="Quick links">'
    + buttons
    + '</div>';
}

function buildCtaBlock(slug, position) {
  const keys = ARTICLE_CTAS[slug] ?? [];
  if (keys.length === 0) return "";

  const buttons = keys.map((key) => {
    const tool = AFFILIATE_TOOLS[key];
    return '<a href="' + tool.url + '" class="cta-btn" target="_blank" rel="noopener noreferrer sponsored"'
      + ' style="background:' + tool.color + ';color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:1rem;font-weight:700;display:inline-block;margin:6px 8px;">'
      + ' Try ' + tool.name + ' &rarr;</a>';
  }).join("\n");

  const labels = keys.map((k) => AFFILIATE_TOOLS[k].tagline).join(" &nbsp;&middot;&nbsp; ");
  const extraClass = position === 'top' ? ' cta-block--top' : ' cta-block--bottom';

  return '<div class="cta-block' + extraClass + '" style="background:#0d1f3c;border:1.5px solid #f5c842;border-radius:12px;padding:28px 24px;margin:40px 0;text-align:center;">'
    + '<p style="color:#f5c842;font-weight:700;font-size:1.05rem;margin:0 0 6px;">Ready to get started?</p>'
    + '<p style="color:#c8d4e8;font-size:0.9rem;margin:0 0 20px;">' + labels + '</p>'
    + buttons
    + '</div>';
}

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
  <meta name="google-site-verification" content="HIjNz2NWbekE8rQXEvGSYci2ef8CfpAmLNFURcFGbtQ" />
  <title>${esc(title)} | The Data Duel</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
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
      <a href="https://northstarleadautomation.com" target="_blank" rel="noopener noreferrer">NLA</a>
    </nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer" role="contentinfo">
  <div class="site-footer-inner">
    ${buildNewsletterBox()}
    <span class="footer-logo">
      ${FOOTER_LOGO_SVG}
      THE DATA DUEL
    </span>
    <p>© 2026 The Data Duel. Independent reviews. Affiliate disclosure: some links may earn a commission.</p>
    <p style="margin-top:0.5rem;font-size:0.8rem;">
      <a href="/privacy" style="color:var(--muted);text-decoration:none;">Privacy Policy</a>
      <span style="margin:0 6px;opacity:0.5;">·</span>
      <a href="/terms" style="color:var(--muted);text-decoration:none;">Terms of Service</a>
    </p>
    <p style="margin-top:1rem">
      <a href="https://northstarleadautomation.com" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;opacity:0.85;transition:opacity 0.2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">
        <img src="/assets/northstar-logo.png" alt="Northstar Lead Automation" style="height:32px;width:auto;vertical-align:middle">
      </a>
    </p>
  </div>
</footer>
</body>
</html>`;
}

// ── Newsletter signup box ───────────────────────────────────────────────────
// KIT FORM: Replace FORM_UID_HERE with actual Kit form UID once Maccs creates Kit account
// The placeholder UID lives in ONE place — change it here and rebuild.
const KIT_FORM_UID = "ee8ea56c13";

function buildNewsletterBox() {
  return `<div class="newsletter-box">
  <h3>📬 Get the Weekly Data Duel</h3>
  <p>One honest comparison. Every Tuesday. No fluff.</p>
  <!-- KIT FORM: Replace FORM_UID_HERE with actual Kit form UID once Maccs creates Kit account -->
  <script async data-uid="${KIT_FORM_UID}" src="https://thedataduel.ck.page/${KIT_FORM_UID}/index.js"><\/script>
  <form class="newsletter-form" action="#" onsubmit="return false;">
    <input type="email" placeholder="Your email address" required />
    <button type="submit">Subscribe Free</button>
  </form>
  <p class="newsletter-microcopy">No spam. Unsubscribe anytime. Powered by Kit.</p>
</div>`;
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

  <section class="about-section" aria-label="About the reviewer">
    <h2 class="about-heading">About the Reviewer</h2>
    <p class="about-text">Silicon Valley born and raised. 20+ years of professional experience. And apparently this is what I do for fun.</p>
    <p class="about-text">I test email marketing tools so you don&#8217;t have to sit through 47 demo calls. Honest reviews, zero BS. Enjoy the Duel. &#x2694;&#xFE0F;</p>
  </section>
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

  // Strip the redundant "Last updated" italic metadata line from markdown
  // (keep the blockquote grey-box disclosure — that's the preferred style)
  htmlBody = htmlBody.replace(/<p><em>Last updated:[^<]*<\/em><\/p>\s*/gi, '');

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
${buildJsonLd(meta)}

${siteHeader("/")}

<main class="article-page" id="main-content">
  <div class="article-nav" aria-label="Breadcrumb">
    <div class="article-nav-inner">
      <a href="/" class="back-link">Back to all articles</a>
    </div>
  </div>

  <header class="article-header">
    <div class="card-badge ${badgeClass(meta.badge)}" style="margin-bottom:1rem">${esc(meta.badge)}</div>

  </header>

  <div class="article-body">
    ${buildCtaBlock(meta.slug, 'top')}
    ${htmlBody}
    ${buildNewsletterBox()}
    ${buildCtaBlock(meta.slug, 'bottom')}
  </div>
</main>

${buildFloatingPanel(meta.slug)}

${siteFooter()}`;
}

// ── JSON-LD schema for article pages ────────────────────────────────────
function buildJsonLd(meta) {
  const schema = {
    "@context": "https://schema.org",
    "@type": meta.badge === "Comparison" ? "Article" : "Review",
    "headline": meta.title,
    "description": meta.excerpt,
    "url": "https://thedataduel.com/articles/" + meta.slug,
    "datePublished": meta.date,
    "dateModified": meta.date,
    "author": { "@type": "Organization", "name": "The Data Duel", "url": "https://thedataduel.com" },
    "publisher": { "@type": "Organization", "name": "The Data Duel", "url": "https://thedataduel.com" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "https://thedataduel.com/articles/" + meta.slug }
  };
  return '<script type="application/ld+json">' + JSON.stringify(schema) + '<\/script>';
}

// ── Legal pages ───────────────────────────────────────────────────────────
function generateTermsPage() {
  return `${pageHead('Terms of Service', 'Terms of Service for The Data Duel.', 'style.css')}
${siteHeader('/')}
<main class="article-page" id="main-content">
  <div class="article-nav" aria-label="Breadcrumb">
    <div class="article-nav-inner">
      <a href="/" class="back-link">Back to home</a>
    </div>
  </div>
  <div class="article-body">
    <h1>Terms of Service</h1>
    <p class="affiliate-disclosure"><em>Last updated: June 2026</em></p>
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using The Data Duel (thedataduel.com), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use this site.</p>
    <h2>2. Informational Content</h2>
    <p>All content on The Data Duel is provided for informational purposes only. Reviews, comparisons, and recommendations reflect the opinions of Northstar Lead Automation based on independent research. Nothing on this site constitutes professional financial, legal, or technical advice.</p>
    <h2>3. Affiliate Disclosure</h2>
    <p>The Data Duel participates in affiliate programs. Some links on this site may earn us a commission if you make a purchase — at no additional cost to you. Affiliate relationships do not influence our editorial opinions. All reviews are independent.</p>
    <h2>4. Accuracy of Information</h2>
    <p>We make reasonable efforts to keep pricing, feature, and availability information accurate. However, software products change frequently. Always verify current details directly with the vendor before making a purchase decision.</p>
    <h2>5. External Links</h2>
    <p>This site links to third-party websites, including affiliate partners. We are not responsible for the content, privacy practices, or availability of those sites.</p>
    <h2>6. Intellectual Property</h2>
    <p>All original content, design, and code on The Data Duel is owned by Northstar Lead Automation. You may share articles with attribution but may not republish or reproduce content in full without written permission.</p>
    <h2>7. Limitation of Liability</h2>
    <p>The Data Duel and Northstar Lead Automation are not liable for any damages arising from your use of this site or reliance on its content.</p>
    <h2>8. Changes to Terms</h2>
    <p>We reserve the right to update these terms at any time. Continued use of the site following any changes constitutes acceptance of the revised terms.</p>
    <h2>9. Contact</h2>
    <p>Questions? Email us at <a href="mailto:support@northstarleadautomation.com">support@northstarleadautomation.com</a>.</p>
  </div>
</main>
${siteFooter()}`;
}

function generatePrivacyPage() {
  return `${pageHead('Privacy Policy', 'Privacy Policy for The Data Duel.', 'style.css')}
${siteHeader('/')}
<main class="article-page" id="main-content">
  <div class="article-nav" aria-label="Breadcrumb">
    <div class="article-nav-inner">
      <a href="/" class="back-link">Back to home</a>
    </div>
  </div>
  <div class="article-body">
    <h1>Privacy Policy</h1>
    <p class="affiliate-disclosure"><em>Last updated: June 2026</em></p>
    <p>Northstar Lead Automation (\"we,\" \"us,\" or \"our\") operates The Data Duel at thedataduel.com. This Privacy Policy explains what information we collect, how we use it, and your rights.</p>
    <h2>1. Information We Collect</h2>
    <h3>a) Automatically Collected</h3>
    <ul>
      <li><strong>Click tracking:</strong> When you click an affiliate link, our broker (broker.thedataduel.com) records a click ID and the destination. This is used solely to attribute commissions accurately. No personally identifying information is stored.</li>
      <li><strong>Usage data:</strong> Like most websites, we may log standard server data such as page views, referrer URLs, and browser type through our hosting provider.</li>
    </ul>
    <h3>b) Provided by You</h3>
    <ul>
      <li><strong>Email address:</strong> If you subscribe to our newsletter, your email address is collected and stored by Kit (ConvertKit). See Kit's <a href="https://kit.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</li>
    </ul>
    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To send the weekly Data Duel newsletter (email subscribers only)</li>
      <li>To track affiliate commissions for accounting purposes</li>
      <li>To improve the site based on anonymous usage patterns</li>
    </ul>
    <h2>3. Cookies</h2>
    <p>Our affiliate tracking system may set a short-lived session identifier when you click an affiliate link. This is used only for commission attribution and expires quickly. We do not use advertising tracking cookies or behavioral profiling.</p>
    <h2>4. Third-Party Services</h2>
    <ul>
      <li><strong>Kit (ConvertKit)</strong> — newsletter delivery. <a href="https://kit.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
      <li><strong>Moosend</strong> — affiliate partner. <a href="https://moosend.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
      <li><strong>Cloudflare</strong> — hosting and CDN. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
    </ul>
    <h2>5. Data Sharing</h2>
    <p>We do not sell, rent, or trade your personal information. We share data only with the service providers listed above, as necessary to operate the site and newsletter.</p>
    <h2>6. Your Rights</h2>
    <p>You may unsubscribe from the newsletter at any time using the link in any email. To request deletion of your data, contact us at <a href="mailto:support@northstarleadautomation.com">support@northstarleadautomation.com</a>.</p>
    <h2>7. Children</h2>
    <p>This site is not directed at children under 13. We do not knowingly collect data from children.</p>
    <h2>8. Changes to This Policy</h2>
    <p>We may update this Privacy Policy. We will post the revised policy on this page with an updated date.</p>
    <h2>9. Contact</h2>
    <p>Questions? Email: <a href="mailto:support@northstarleadautomation.com">support@northstarleadautomation.com</a></p>
  </div>
</main>
${siteFooter()}`;
}

// ── Sitemap generator ─────────────────────────────────────────────────────
function generateSitemap(articles) {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    `  <url><loc>https://thedataduel.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`,
    `  <url><loc>https://thedataduel.com/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority><lastmod>${today}</lastmod></url>`,
    `  <url><loc>https://thedataduel.com/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority><lastmod>${today}</lastmod></url>`
  ];
  for (const a of articles) {
    urls.push(`  <url><loc>https://thedataduel.com/articles/${a.slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

// ── llms.txt generator (AI agent discovery) ──────────────────────────────
function generateLlmsTxt(articles) {
  const lines = [
    "# The Data Duel",
    "> Independent, data-driven reviews and comparisons of email marketing tools. No sponsorships. Affiliate links disclosed.",
    "",
    "## About",
    "The Data Duel publishes honest head-to-head comparisons, in-depth reviews, and roundups of email marketing software including Kit (ConvertKit), Moosend, GetResponse, Mailchimp, and alternatives. All pricing data is independently verified.",
    "",
    "## Articles"
  ];
  for (const a of articles) {
    lines.push(`- [${a.title}](https://thedataduel.com/articles/${a.slug}): ${a.excerpt}`);
  }
  lines.push("");
  lines.push("## Data Feed");
  lines.push("- Structured JSON: https://thedataduel.com/articles.json");
  lines.push("- Sitemap: https://thedataduel.com/sitemap.xml");
  return lines.join("\n");
}

// ── articles.json feed (structured data for AI agents) ───────────────────
function generateArticlesFeed(articles) {
  return {
    site: "The Data Duel",
    url: "https://thedataduel.com",
    description: "Independent reviews and comparisons of email marketing tools.",
    updated: new Date().toISOString(),
    articles: articles.map((a) => ({
      title: a.title,
      slug: a.slug,
      url: "https://thedataduel.com/articles/" + a.slug,
      type: a.badge,
      excerpt: a.excerpt,
      date: a.date,
      affiliates: (ARTICLE_CTAS[a.slug] ?? []).map((k) => AFFILIATE_TOOLS[k].name)
    }))
  };
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

  // Generate legal pages
  const termsHtml = generateTermsPage();
  await writeFile(join(__dirname, "terms.html"), termsHtml, "utf8");
  console.log("   ✅ terms.html");

  const privacyHtml = generatePrivacyPage();
  await writeFile(join(__dirname, "privacy.html"), privacyHtml, "utf8");
  console.log("   ✅ privacy.html");

  // Generate sitemap.xml
  const sitemapXml = generateSitemap(articles);
  await writeFile(join(__dirname, "sitemap.xml"), sitemapXml, "utf8");
  console.log("   ✅ sitemap.xml");

  // Generate llms.txt (AI agent discovery file)
  const llmsTxt = generateLlmsTxt(articles);
  await writeFile(join(__dirname, "llms.txt"), llmsTxt, "utf8");
  console.log("   ✅ llms.txt");

  // Generate articles.json (structured JSON feed for AI agents)
  const articlesFeed = generateArticlesFeed(articles);
  await writeFile(join(__dirname, "articles.json"), JSON.stringify(articlesFeed, null, 2), "utf8");
  console.log("   ✅ articles.json");

  console.log("\n━".repeat(50));
  console.log(`✅ Build complete — ${generated.length + 1} files written`);
  console.log(`   Output: ${__dirname}`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
