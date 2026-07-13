---
name: seo-tool-pages
description: >-
  Build and grow a static, ad-monetized "tool site" (one page per micro-utility) engineered to rank on Google — page anatomy, JSON-LD schema, meta/canonical/OG tags, sitemap, internal linking, Core Web Vitals, and ad placement. Use this skill whenever the user works on the markdown-tools website or any programmatic-SEO static site: adding a new tool page, writing page copy, "make this rank", "add a converter page", sitemap/robots questions, AdSense/Carbon integration, meta tags, structured data, or launch checklists. Trigger even if SEO isn't mentioned — on this project, every new page IS an SEO task. Pair with pines-ui for UI components and markdown-browser-ops for the tool logic.
---

# SEO Tool Pages

This skill turns a static site into a collection of pages that each target one long-tail search query ("markdown table generator", "markdown to word converter") and monetize via ads. The whole business model is: rank → traffic → ad impressions. So **every decision optimizes for (1) Google ranking, (2) page speed, (3) not getting demoted as thin content** — in that order.

## Non-negotiable rules

These come first because violating any one of them quietly kills the whole project:

1. **Real content in the initial HTML.** Google must see the H1, intro, how-to, and FAQ as static markup — never rendered by JavaScript. The interactive widget is *layered onto* a page that reads as a complete article without JS. Never build these pages as an SPA shell.
2. **One page = one query intent.** A page targets exactly one primary keyword phrase plus its close variants. Don't merge "markdown to pdf" and "markdown to word" into one page; don't split "md to pdf" and "markdown to pdf" into two.
3. **No thin duplicates.** Every page needs genuinely unique copy: a distinct intro, a use-case paragraph, page-specific FAQ answers. If you catch yourself find-and-replacing a keyword through a template's prose, stop and rewrite the prose for that page. Google's helpful-content system demotes entire *sites*, not just pages — one batch of thin pages can sink the good ones.
4. **No render-blocking third-party JS.** Tailwind must be a pre-built purged CSS file (standalone CLI), never the CDN Play script in production. Alpine and conversion libraries load with `defer`. Ad scripts load `async` and never before content.
5. **Everything client-side.** No backend. This keeps hosting free, TTFB near zero, and lets every page truthfully claim "your files never leave your browser" — the site's core differentiator. Say it on every page.

## Anatomy of a tool page

Every tool page follows the same skeleton, in this order. Read `references/page-template.html` for the full annotated markup and copy from it — don't reconstruct from memory.

1. `<head>`: unique `<title>` (≤60 chars, keyword first), unique `<meta name="description">` (≤155 chars, includes keyword + "free" + "no upload"), canonical URL, OG/Twitter tags, JSON-LD blocks.
2. Header with site nav (shared, keep tiny).
3. `<h1>` containing the primary keyword naturally ("Markdown to PDF Converter").
4. One-sentence value proposition directly under the H1 — this is what shows in AI Overviews and what users scan first.
5. **The tool widget** — above the fold. Users came to convert something; make them wait for nothing. Build it with pines-ui components + markdown-browser-ops logic.
6. First ad slot (below the tool, never above it).
7. "How to use" — 3-4 numbered steps, written as real instructions.
8. 2-3 short sections of genuinely useful prose: what the conversion does, edge cases, why output might differ, when to use an alternative. This is the unique-content payload; 250-500 words total is the target. Write for the reader, not the crawler.
9. FAQ — 3-5 questions matching real "People Also Ask" phrasings, marked up with FAQPage schema.
10. "Related tools" — 3-6 internal links with descriptive anchor text (see internal linking below).
11. Footer (shared): about, privacy policy, contact, GitHub link.

## Structured data

Every tool page carries two JSON-LD blocks: `SoftwareApplication` (the tool) and `FAQPage` (the FAQ). Pages that are guides rather than tools use `HowTo` instead of `SoftwareApplication`. Copy exact templates from `references/schema-templates.md` — schema errors are worse than no schema, so after editing, mentally validate: every question in the visible FAQ appears in the JSON-LD verbatim, and nothing appears in JSON-LD that isn't visible on the page (that's a spam signal).

## Keyword → page mapping workflow

When adding pages, work from the tiered keyword map in `references/keyword-map.md`. The strategy:

- **Skip head terms initially.** "markdown to pdf" alone is dominated by entrenched tools. The page still gets built (it's the hub), but expected traffic comes from the long tail.
- **Build tier-2/3 pages first**: "json to markdown table", "markdown to google docs", "remove markdown formatting", "chatgpt output to word". Lower volume, drastically lower competition, and they accumulate domain authority that eventually lifts the head-term pages.
- **Mine the LLM angle.** Queries like "convert chatgpt markdown to word" are new, growing, and have almost no dedicated competition. Any query pattern of the form *[LLM output problem] + [destination format]* is a candidate page.
- One new page = one entry in the keyword map with: primary keyword, 2-3 variants, search-intent note, and its hub. Keep the map updated; it doubles as the site's roadmap.

## Internal linking

Structure the site as hubs and spokes. Hubs are the head-term pages ("Markdown to PDF"), spokes are the long-tail variants ("Markdown to PDF with page numbers"). Rules:

- Every spoke links up to its hub in the intro prose, and the hub links down to all its spokes in "Related tools".
- Cross-link spokes only when genuinely related (converter ↔ its reverse converter, generator ↔ its validator).
- Anchor text is the target page's keyword ("markdown table generator"), never "click here".
- Every page must be reachable within 2 clicks from the homepage. The homepage lists all tools grouped by hub.

## Site-level files

- `sitemap.xml` — regenerate whenever pages are added/removed; every URL with `<lastmod>`. The build script should do this automatically from the page list.
- `robots.txt` — allow everything, reference the sitemap.
- `404.html`, `/privacy`, `/about` — AdSense approval requires privacy policy and identifiable ownership; write these before applying.
- Canonicals: every page self-canonicalizes with the full `https://` URL, no trailing-slash ambiguity (pick one form and enforce it site-wide).

## Core Web Vitals budget

Targets: LCP < 1.5s, CLS < 0.05, INP < 100ms. Practical rules:

- Purged Tailwind file < 15 KB — small enough to consider inlining in `<head>`.
- Heavy conversion libraries (docx generation, PDF helpers) are lazy-loaded on first interaction with the widget, not at page load. Pattern in markdown-browser-ops.
- **Reserve ad-slot space with a fixed-dimension container** (`min-height` on the wrapper) so ads never shift layout. CLS from ads is the #1 way tool sites fail CWV.
- No web fonts, or one font with `font-display: swap`. System font stack is fine and free.
- All images (rare on this site) get explicit `width`/`height` and `loading="lazy"`.

## Monetization placement

- Slot 1: below the tool widget. Slot 2: between prose sections. Slot 3 (optional): end of page above footer. Never above the H1, never inside the tool widget, never more ad than content on screen.
- Dev audiences block ads heavily — expect 30-50% blocked impressions. Prefer Carbon Ads / EthicalAds for this niche if approved (less blocked, better RPM for dev traffic); AdSense as fallback/complement.
- Add ads only after the site has ~10 real pages and some traffic. An empty site with ads gets rejected by AdSense and looks spammy to Google.

## Launch & growth checklist

Read `references/launch-checklist.md` when the user asks about deploying, launching, or "what's next". It covers: Cloudflare Pages deploy, Search Console + sitemap submission, the HN/Reddit/Product Hunt launch playbook, open-sourcing for backlinks, and the monthly content cadence.

## Division of labor with other skills

- **pines-ui**: all UI components (buttons, tabs, toasts, textareas). Exception: production pages use built Tailwind CSS, not the CDN script from pines' base templates — that override is deliberate and CWV-driven.
- **markdown-browser-ops**: everything inside the tool widget — libraries, conversion logic, download/copy behavior.
- **mkdocs-wiki**: if the repo has `mkdocs.yml`, sync the internal wiki + changelog after adding pages, per that skill's end-of-task duty. The wiki is internal documentation; it is NOT part of the public site and must not be deployed with it.
