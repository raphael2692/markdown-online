# Launch & Growth Checklist

Read this when the user asks about deploying, launching, submitting to Google, getting backlinks, or "what's next".

## Phase 0 — Before deploy

- [ ] 8-12 pages built and each passes the per-page checklist (bottom of this file)
- [ ] `/about/` and `/privacy/` pages exist (AdSense hard requirement; also trust signals for Google)
- [ ] `sitemap.xml` generated and referenced from `robots.txt`
- [ ] Custom `404.html`
- [ ] Favicon + OG defaults
- [ ] Run Lighthouse locally on 2-3 pages: Performance ≥ 95, SEO = 100. Fix before shipping, not after.

## Phase 1 — Deploy (Cloudflare Pages)

1. Push repo to GitHub (public — see backlinks below).
2. Cloudflare Pages → connect repo → build command runs the site build script → output dir `dist/`.
3. Attach the custom domain, enforce HTTPS, pick canonical host (`www` or apex) and redirect the other.
4. Verify canonical URLs in the HTML match the live host exactly.

## Phase 2 — Google

1. Google Search Console → verify domain property (DNS record).
2. Submit `sitemap.xml`.
3. Request indexing manually for the homepage + top 5 pages (Inspect URL → Request indexing).
4. Also register Bing Webmaster Tools (imports from GSC in one click; Bing/DuckDuckGo traffic is small but free).
5. Expect: indexing within days, meaningful impressions after 4-8 weeks, rankings movement 3-6 months. Do not judge the project before month 3.

## Phase 3 — Backlinks (the actual ranking lever)

On-page SEO gets you eligible; links get you ranked. Cheapest effective plays for this niche, in order:

1. **Open-source the repo.** GitHub repos earn stars → profile links → occasional organic mentions. Put the live URL in the repo description and README.
2. **Show HN** post: title like "Show HN: Browser-only markdown tools (nothing uploaded)". The privacy angle is the hook. Post weekday morning US time. Even a modest thread = dozens of quality links from aggregators that scrape HN.
3. **Product Hunt** launch a week later.
4. **Reddit**: r/webdev, r/SideProject, r/ChatGPT (for the LLM-cleanup tools — "made a tool to fix pasted ChatGPT formatting" is native content there). Never spam; answer real threads where the tool solves the asked problem.
5. **Dev.to / Hashnode article**: "How I built X" with a link — these domains have high authority and articles rank on their own.
6. Answer relevant Stack Overflow questions ONLY where the tool is genuinely the answer, and disclose it's yours.

## Phase 4 — Monetization

- Apply to ad networks only after: 10+ pages, privacy policy live, and some organic traffic showing in GSC (AdSense rejects empty sites).
- Order of preference for dev audiences: EthicalAds / Carbon Ads (less ad-blocked, contextual, ~$1-3 RPM realistic) → AdSense (broader fill).
- Once approved, ads go only in the reserved fixed-height slots (already in the page template). Re-run Lighthouse after adding ad scripts; CLS regressions here are the norm.
- Set expectations honestly with the user: dev traffic + ad blockers means revenue per 1k visits is low; volume is the game, and each new ranking page compounds.

## Phase 5 — Cadence (monthly)

- 2-4 new Tier-2/3 pages from the keyword map.
- GSC review: which queries get impressions but poor CTR → rewrite those titles/descriptions; which pages rank 8-20 → strengthen (more unique prose, more internal links pointing at them).
- Check Core Web Vitals report in GSC; fix regressions.
- If a page has zero impressions after 3 months, revisit: wrong keyword, cannibalized by a sibling page, or thin content.

## Per-page pre-publish checklist

- [ ] Unique title ≤60 chars, keyword-first; unique description ≤155 chars
- [ ] Canonical set; page in sitemap
- [ ] H1 = one, contains keyword; heading order sane (h1→h2→h3)
- [ ] Tool works with JS enabled; page reads as a complete article with JS disabled
- [ ] SoftwareApplication + FAQPage JSON-LD present, valid, matches visible content
- [ ] 250-500 words of prose that would survive a "was this written for humans?" test
- [ ] 3-6 internal links out; at least 2 other pages link in
- [ ] Ad slots have fixed min-height (zero CLS)
- [ ] Lighthouse: Performance ≥95, SEO 100, no console errors
