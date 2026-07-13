# Keyword → Page Map

This is the site roadmap. Each row becomes one page. Build order: Tier 2 → Tier 3 → Tier 1 (hubs exist early as pages, but expect them to rank last). When the user asks "what page should we build next?", pick the highest-priority unbuilt row, or propose a new LLM-angle row.

Statuses: `todo | built | live`. This file is versioned with the repo — update it every time a page ships (seeded from the `seo-tool-pages` skill's bundled copy).

## Tier 1 — Head terms (hubs; high volume, brutal competition)

| Slug | Primary keyword | Variants | Intent | Status |
|---|---|---|---|---|
| markdown-to-html | markdown to html | md to html converter | devs embedding content | **built** |
| markdown-to-pdf | markdown to pdf | md to pdf, convert markdown to pdf | convert a doc | todo |
| markdown-to-word | markdown to word | markdown to docx, md to doc | paste into Word workflows | todo |
| markdown-editor | markdown editor online | markdown preview online | write + preview | **built** |
| markdown-table-generator | markdown table generator | table to markdown, md table maker | build/paste tables | todo |

## Tier 2 — Long tail with clear tool intent (build these first)

| Slug | Primary keyword | Variants | Intent | Hub | Status |
|---|---|---|---|---|---|
| html-to-markdown | html to markdown | convert html to md | migrate content | markdown-to-html | todo |
| csv-to-markdown-table | csv to markdown table | excel to markdown table | data → docs/README | markdown-table-generator | todo |
| json-to-markdown-table | json to markdown table | json to md | API output → docs | markdown-table-generator | todo |
| remove-markdown | remove markdown formatting | strip markdown, markdown to plain text | clean up LLM output | markdown-to-html | todo |
| markdown-to-google-docs | markdown to google docs | paste markdown into google docs | office workflows | markdown-to-word | todo |
| word-to-markdown | word to markdown | docx to md | migrate docs | markdown-to-word | todo |
| markdown-link-generator | markdown link generator | markdown hyperlink format | quick syntax | markdown-editor | todo |
| markdown-to-jira | markdown to jira | jira wiki markup converter | ticket workflows | markdown-to-html | todo |
| markdown-checklist | markdown checkbox / checklist syntax | github task list | quick syntax | markdown-editor | todo |
| escape-markdown | escape markdown characters | markdown special characters | bots/API authors | markdown-editor | todo |

## Tier 3 — The LLM angle (low volume, near-zero competition, growing fast)

Pattern: *[LLM output problem] + [destination]*. Invent new rows freely on this pattern.

| Slug | Primary keyword | Intent | Hub | Status |
|---|---|---|---|---|
| chatgpt-to-word | convert chatgpt to word | paste AI output into Word without asterisks | markdown-to-word | todo |
| chatgpt-to-google-docs | chatgpt markdown to google docs | same, for Docs | markdown-to-google-docs | todo |
| clean-ai-text | remove asterisks from ai text | strip ** and ## from LLM output | remove-markdown | todo |
| llm-output-to-pdf | ai answer to pdf | share LLM answer as PDF | markdown-to-pdf | todo |
| markdown-for-prompts | escape text for llm prompt | prep text for prompts | escape-markdown | todo |

## Adding a new row — checklist

1. One clear intent, not already covered by another row.
2. Verify the phrasing people actually use (autocomplete, People Also Ask, Reddit threads) before committing to the slug.
3. Assign a hub. If no hub fits, question whether the page belongs on this site.
4. Slug = primary keyword, hyphenated, no stop words where natural.
