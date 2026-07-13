# JSON-LD Schema Templates

Copy these exactly and fill placeholders. Rules that apply to all blocks:

- Everything in JSON-LD must be **visible on the page**; invisible structured
  data is a spam signal.
- One `SoftwareApplication` + one `FAQPage` per tool page. Guide pages use
  `HowTo` instead of `SoftwareApplication`.
- Validate after edits: paste the page URL into Google's Rich Results Test
  once deployed, or at minimum ensure the JSON parses.

## SoftwareApplication (every tool page)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{TOOL_NAME}}",
  "url": "https://{{DOMAIN}}/{{SLUG}}/",
  "description": "{{ONE_SENTENCE}}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any (web browser)",
  "browserRequirements": "Requires JavaScript",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

Notes: `offers.price: 0` is what makes "Free" eligible to show in rich
results. Do NOT add `aggregateRating` unless you actually collect ratings —
fake ratings risk a manual action.

## FAQPage (every tool page with an FAQ section)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{QUESTION_1_VERBATIM_FROM_PAGE}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{ANSWER_1_VERBATIM_FROM_PAGE}}"
      }
    },
    {
      "@type": "Question",
      "name": "{{QUESTION_2}}",
      "acceptedAnswer": { "@type": "Answer", "text": "{{ANSWER_2}}" }
    }
  ]
}
```

Notes: questions/answers must match the on-page FAQ text. Plain text only in
`text` (no HTML). 3-5 questions is the sweet spot.

## HowTo (guide pages only, replaces SoftwareApplication)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to {{TASK}}",
  "description": "{{ONE_SENTENCE}}",
  "totalTime": "PT2M",
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "{{STEP_1_SHORT}}", "text": "{{STEP_1_FULL}}" },
    { "@type": "HowToStep", "position": 2, "name": "{{STEP_2_SHORT}}", "text": "{{STEP_2_FULL}}" },
    { "@type": "HowToStep", "position": 3, "name": "{{STEP_3_SHORT}}", "text": "{{STEP_3_FULL}}" }
  ]
}
```

## BreadcrumbList (optional, add when hub/spoke depth exists)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://{{DOMAIN}}/" },
    { "@type": "ListItem", "position": 2, "name": "{{HUB_NAME}}", "item": "https://{{DOMAIN}}/{{HUB_SLUG}}/" },
    { "@type": "ListItem", "position": 3, "name": "{{PAGE_NAME}}", "item": "https://{{DOMAIN}}/{{SLUG}}/" }
  ]
}
```

## WebSite (homepage only)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{{SITE_NAME}}",
  "url": "https://{{DOMAIN}}/"
}
```
