# Alpine.js Cheat Sheet for Pines UI

Pines components are Alpine.js + Tailwind. Reading components without knowing Alpine leads to broken edits — Alpine's reactivity is what makes the components work, so understanding the directives is more important than understanding the Tailwind classes.

## The directives you will see in every Pines file

| Directive | What it does |
|---|---|
| `x-data="{ ... }"` | Declares a reactive state object scoped to this element and its children. Root of every interactive component. |
| `x-show="cond"` | Toggles `display: none` based on a boolean. Element stays in DOM. |
| `x-if="cond"` | Adds/removes from DOM. Must wrap a single `<template>`. |
| `x-on:click` / `@click` | Event listener. `@click.away` fires when the click is **outside** the element (essential for closing dropdowns). `@keydown.escape.window` listens globally. |
| `x-bind:class` / `:class` | Reactively binds an attribute. Object syntax `{ 'red-500': isError }` toggles classes. |
| `x-model` | Two-way binding for form inputs. |
| `x-text="expr"` | Sets element's textContent. |
| `x-html="expr"` | Sets innerHTML (only with trusted content). |
| `x-ref="name"` + `$refs.name` | Tag an element, then reference it from anywhere in the same `x-data` scope. |
| `x-init="..."` | Runs once when the component initializes. Often used to wire up event listeners. |
| `x-cloak` | Element hidden until Alpine boots. Pair with `<style>[x-cloak]{display:none !important}</style>` in `<head>`. |
| `x-transition` | Apply enter/leave CSS transitions. Pines uses the long form: `x-transition:enter`, `x-transition:enter-start`, `x-transition:enter-end`, `x-transition:leave`, etc. |
| `x-teleport="body"` | Moves the element to another part of the DOM at render time. Pines uses this for modals and dropdowns to escape `overflow:hidden` containers. |
| `x-trap` | Traps focus inside the element while it's shown. Requires the **focus plugin**. Pines modals use `x-trap.inert.noscroll`. |
| `x-collapse` | Animated height transition. Requires the **collapse plugin**. |

## Plugins that several Pines components depend on

Components that use these will silently fail without the plugins loaded:

- **@alpinejs/focus** — needed by anything with `x-trap` (modals, full-screen modal/menu, slide-over, command palette).
- **@alpinejs/collapse** — needed by anything with `x-collapse` (accordion).

Both plugin scripts must be loaded **before** the main Alpine script. The base templates in `templates/` already do this.

## Reading Pines components: a worked example

The modal component starts like this:

```html
<div x-data="{ modalOpen: false }"
     @keydown.escape.window="modalOpen = false"
     class="relative z-50 w-auto h-auto">
    <button @click="modalOpen=true">Open</button>
    <template x-teleport="body">
        <div x-show="modalOpen" x-cloak ...>
            <div ... x-trap.inert.noscroll="modalOpen" ...>
                ...
            </div>
        </div>
    </template>
</div>
```

What's happening:

1. `x-data="{ modalOpen: false }"` creates the state. Anywhere inside this `<div>` can read or write `modalOpen`.
2. `@keydown.escape.window` listens globally — pressing Escape anywhere closes the modal.
3. The trigger button flips `modalOpen` to true.
4. `x-teleport="body"` re-parents the modal to `<body>` so it isn't trapped by parent stacking contexts.
5. `x-show` toggles visibility; `x-cloak` keeps it hidden during initial Alpine boot.
6. `x-trap.inert.noscroll` keeps keyboard focus inside the modal, marks the rest of the page as `inert`, and locks scroll. **This requires the focus plugin.**

## Common pitfalls when copy-pasting Pines

1. **Forgetting `x-cloak` styles** — modals and dropdowns flash visible on page load. Add `<style>[x-cloak]{display:none !important}</style>` to `<head>`.
2. **Two components on one page sharing variable names** — each `x-data` scope is independent, but if you nest one Pines component inside another, the inner one inherits the outer's scope. Rename if needed.
3. **Multiple Alpine roots without `x-data`** — child elements that need `$refs` or `$dispatch` outside any `x-data` scope must have at least `x-data` on a parent.
4. **Build-time CSS purging** — Tailwind's JIT can purge classes that only appear inside `:class="{ ... }"` strings. With the CDN this isn't a problem; with a real build, configure `safelist` or use `content` paths that include the templates.
