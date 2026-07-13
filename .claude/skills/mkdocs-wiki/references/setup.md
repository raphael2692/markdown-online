# First-time setup

Goal: leave the repo with a working MkDocs Material site, a nav that fits this specific project, a changelog backfilled from the full git history, and the sync marker set — so every future run only needs the maintain flow.

## 1. Understand the project first

Spend a moment reading before scaffolding. Look at the README, the top-level structure, the git history shape (tags? conventional commits? one author or many?). The wiki should mirror what the project actually is:

- **Code project** (has pyproject.toml / package.json / go.mod / src/…): plan pages for installation, usage/guide, configuration, and — only if the project is a library — an API reference section.
- **Non-code project** (documents, research, designs, data): plan pages for overview, structure ("what lives where"), and one page per major content area.

Don't create empty stub pages "for later". A 3-page wiki that is entirely true beats a 10-page skeleton of TODOs.

## 2. Install MkDocs

Pick the least invasive option that works in this environment, in this order:

1. Python project managed by uv → `uv add --dev mkdocs mkdocs-material`
2. Python project with pip/venv → `pip install mkdocs mkdocs-material` (respect an existing venv)
3. Anything else (JS project, non-code repo) → keep it out of the project's own dependencies: `uv tool install mkdocs --with mkdocs-material` or `pipx install mkdocs` + inject material. Plain `pip install --user` is the last resort.

If installation is impossible (no network, restricted env), still create all the files — they're plain text — and tell the user how to install and run `mkdocs serve` themselves.

## 3. Scaffold

Create `mkdocs.yml` in the repo root:

```yaml
site_name: <project name, humanized>
theme:
  name: material
  features:
    - navigation.sections
    - content.code.copy
nav:
  - Home: index.md
  - <project-appropriate pages>
  - Changelog: changelog.md
markdown_extensions:
  - admonition
  - pymdownx.superfences
```

Then:

- `docs/index.md` — seed from the README (rewrite, don't just copy: the wiki homepage should orient a reader, not duplicate the repo landing page).
- The project-appropriate pages planned in step 1, written from what you actually observed in the repo.
- `docs/changelog.md` — see step 4.
- Add `site/` to `.gitignore` (create the file if needed).

Do NOT set up deployment (GitHub Pages, CI) unless the user asks — but do mention once, at the end, that it's available.

## 4. Backfill the changelog from git history

This is what makes the changelog "synced with git" from the very first day, not just going forward. Read `references/changelog.md` for the format, then:

- If the repo has tags: one `## [tag] - date` section per tag, derived from the commits in each tag range; anything after the newest tag goes under `## [Unreleased]`.
- No tags: a single `## [Unreleased]` section, grouped by Keep-a-Changelog category. If history is long (50+ commits), summarize by theme rather than listing every commit — note in the entry that early history was summarized.
- Skip noise: merge commits, typo fixes, formatting-only changes.
- First line of the file is the sync marker pointing at current HEAD:
  `<!-- docs-sync: $(git rev-parse --short HEAD) -->`

## 5. Verify and hand off

1. Run `mkdocs build --strict` — fix any broken nav links it reports.
2. Commit everything with `docs: set up mkdocs wiki with backfilled changelog`.
3. Tell the user: how to preview (`mkdocs serve`), that the changelog now tracks git automatically whenever Claude works on the repo, and offer the two optional extras — GitHub Pages deployment, and a `post-commit` git hook that prints a "wiki may need syncing" reminder for commits made outside Claude sessions. Only implement extras on request.
