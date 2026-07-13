---
name: pines-ui
description: Build frontends with Pines UI — copy-paste components built on Alpine.js and Tailwind CSS. Use this skill whenever the user mentions Pines, asks for a UI component (modal, dropdown, toast, accordion, tabs, command palette, slide-over, date picker, tooltip, etc.) and is working in plain HTML, Django templates, Laravel/Blade, or any server-rendered context where they want lightweight interactive widgets without a heavy JS framework. Also use when the user asks to scaffold a page or base template with Alpine + Tailwind, or wants to add interactive behavior (dropdowns, modals, etc.) to an existing Django/Jinja/Blade site. Trigger this skill even when "Pines" isn't named — if the user wants Alpine+Tailwind components and Pines covers the request, it's the right tool.
---

# Pines UI

Pines is a copy-paste component library built on **Alpine.js + Tailwind CSS**. There's no `npm install pines`, no build step, no JavaScript runtime to bundle. Each component is a self-contained HTML snippet you drop into a page that already loads Alpine and Tailwind.

This skill bundles all 47 components from the upstream Pines repo, plus base templates that load the right CDN dependencies, plus references for Alpine.js patterns and Django integration.

## When to reach for this skill

- The user wants a specific component (modal, dropdown, tabs, toast, accordion, command palette, slide-over, date picker, etc.) and isn't using React/Vue.
- The user wants to scaffold a server-rendered page (Django, Flask, Laravel, Rails) with interactive UI but doesn't want a SPA.
- The user mentions Pines, Alpine.js, Tailwind UI, or "TALL stack".
- The user has a Django project and wants client-side interactivity for a few elements.

If the user is building a React/Vue/Svelte app, this skill isn't the right fit — point them to shadcn/ui, Headless UI, or Radix instead.

## How Pines works

Each component is plain HTML with `x-data="{...}"` (state), `x-show` / `@click` / `x-transition` (interaction), and Tailwind classes (styling). To use one:

1. Make sure the host page loads Alpine, Tailwind, and the `x-cloak` style. The base template handles this.
2. Open the relevant component file under `components/`.
3. Copy the snippet into the body where you want it.
4. If the component uses `x-trap` (modal, slide-over, command palette, full-screen menu), the host page needs the `@alpinejs/focus` plugin.
5. If the component uses `x-collapse` (accordion), the host page needs the `@alpinejs/collapse` plugin.

The base templates already include both plugins, so this is handled by default.

## Workflow

### 1. Find the right component

Read `references/component-index.md` first — it's a one-page table of all 47 components with one-line descriptions. Scan it for the user's request before opening any individual file. Mapping common requests to slugs:

- "popup" / "dialog" → `modal` (or `full-screen-modal` for full-bleed)
- "side panel" / "drawer" → `slide-over`
- "search bar with results" → `command`
- "notification" → `toast` (transient) or `alert` (static)
- "menu that opens on click" → `dropdown-menu`
- "menu that opens on right-click" → `context-menu`
- "menu that opens on hover" → `hover-card`
- "tabs" → `tabs`
- "calendar input" → `date-picker`
- "switch / toggle" → `switch`
- "loading bar" → `progress`
- "carousel-ish scrolling content" → `marquee`
- "navigation bar with mega-menu" → `navigation-menu`

If unsure between two, open both files — they're short.

### 2. Read the component

Each slug has a main file at `components/<slug>.html` (the canonical version) and often an examples folder at `components/<slug>-examples/` with variations. Start with the main file. If the user wants something the main version doesn't cover (different colors, different behavior, alternate layout), check the examples folder before writing custom variations from scratch.

### 3. Set up the host page

If the user has no existing template, copy `templates/base.html` (plain HTML) or `templates/base_django.html` (Django) and paste components into the marked spot. If they have an existing template, check that it loads:

- Alpine.js (defer)
- Tailwind CSS
- `@alpinejs/focus` and `@alpinejs/collapse` (load these BEFORE alpine, both with `defer`)
- `<style>[x-cloak]{display:none !important}</style>` in `<head>`

If anything's missing, add it. Pines components silently fail when their plugin dependencies are absent.

### 4. Compose, don't rewrite

When the user asks for "a contact form with a date picker, a textarea, and a submit button", don't generate the form from scratch — copy the `text-input`, `textarea`, `date-picker`, and `button` snippets and arrange them inside a `<form>`. Pines components are designed to coexist; if two components both define `x-data`, they live in independent scopes by default.

### 5. Customize via Tailwind classes

Pines uses neutral Tailwind classes (`bg-neutral-950`, `text-neutral-700`, etc.). Theme by editing those classes directly — there's no design-token system. Replace `bg-neutral-950` with `bg-indigo-600` for a brand color, etc.

## Editing Pines components

Most edits are straightforward Tailwind class swaps. For behavioral changes, edit the `x-data` object and the `@click` / `x-show` / `:class` expressions. Read `references/alpine-cheatsheet.md` if you're not fluent in Alpine — it covers `x-data`, `x-show`, `x-transition`, `x-teleport`, `x-trap`, `x-cloak`, refs, and the gotchas that bite when copy-pasting.

## Django specifics

For Django projects, prefer `templates/base_django.html` over the plain template — it has the right `{% block %}` structure. Pines + Django has a few small interaction points (escaping server values for `x-data`, CSRF in forms, partials for reuse) covered in `references/django-integration.md`. Read it when working in a Django context.

## Production caveats

The CDN setup ships unused Tailwind classes and isn't optimized. For real production, the user should swap to a Tailwind build step (Tailwind CLI, Vite, or `django-tailwind`) and `npm install alpinejs` rather than the CDN. Mention this if the user is past the prototyping stage, but don't push it on a quick demo.

## Component index

See `references/component-index.md` for the full table. The 47 components break into rough buckets:

- **Layout/feedback**: alert, badge, banner, card, progress, table
- **Triggers/menus**: button, dropdown-menu, context-menu, menubar, navigation-menu, hover-card, popover
- **Overlays**: modal, full-screen-modal, slide-over, full-screen-menu, command, tooltip
- **Forms**: checkbox, radio-group, switch, range-slider, select, combobox, text-input, textarea, textarea-auto-resize, date-picker, rating
- **Navigation**: tabs, breadcrumbs, pagination, table-of-contents, sticky-header
- **Content/effects**: accordion, marquee, image-gallery, video, retro-grid, text-animation, typing-effect, quotes, monaco-editor
- **Utility**: copy-to-clipboard, toast

## Files in this skill

- `components/<slug>.html` — canonical version of each component
- `components/<slug>-examples/` — variations (where they exist upstream)
- `templates/base.html` — minimal CDN starter
- `templates/base_django.html` — Django-flavored starter with `{% block %}` structure
- `references/component-index.md` — the full component table; **read this before searching**
- `references/alpine-cheatsheet.md` — Alpine directives used by Pines, with worked examples
- `references/django-integration.md` — Django gotchas (escaping, CSRF, includes, htmx)
