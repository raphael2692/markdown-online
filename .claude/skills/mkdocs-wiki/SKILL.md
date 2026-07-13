---
name: mkdocs-wiki
description: Set up and maintain a MkDocs (Material) documentation wiki for any git project — coding or not — and keep its changelog permanently in sync with git history. Use whenever the user mentions mkdocs, a docs site, wiki, project documentation, changelog, release notes, or says things like "set up docs", "document this project", "update the wiki", "sync the changelog". ALSO use proactively, without being asked, at the end of ANY task in which you added, changed, fixed, or removed something in a repository that contains mkdocs.yml — before finishing that task, update the affected wiki pages and sync the changelog with the new commits. If a repo has mkdocs.yml and you changed the project, this skill applies.
---

# MkDocs Wiki Maintainer

Every project gets one wiki (MkDocs + Material theme) that stays truthful, and one changelog that is always derivable from — and synced with — git history. This skill has two jobs:

1. **Setup**: if the repo has no `mkdocs.yml`, scaffold a docs site.
2. **Maintain**: if it does, bring the wiki pages and the changelog up to date with everything that happened in git since the last sync.

## Routing — decide which flow you're in

Check for `mkdocs.yml` in the repo root (also check `docs/mkdocs.yml`):

- **Not found** → first-time setup. Read `references/setup.md` and follow it. Setup always ends with an initial changelog backfilled from git history and a sync marker written, so the maintain flow works from day one.
- **Found** → maintain flow. Read `references/update.md`. The changelog sync is a mandatory part of this flow, never optional — read `references/changelog.md` for the exact format rules.
- **User asked only about the changelog** ("sync the changelog", "update release notes") → still run the maintain flow, because a commit that deserves a changelog line usually also affects a wiki page. If it genuinely touches no documented behavior, only the changelog changes — that's fine.
- **No git repo at all** → the changelog sync depends on git. Offer to `git init` and make an initial commit first. Don't silently skip the git part; syncing with git is the point of this skill.

## Core principles

**Git is the single source of truth.** The changelog is never written from memory or from what you think you did — it is derived from `git log`. This is what makes the sync reliable and repeatable: anyone (you, a future Claude session, the user) can verify the changelog against history.

**Sync state lives in the changelog itself.** Line 1 of `docs/changelog.md` is an HTML comment holding the last-synced commit:

```
<!-- docs-sync: 4f3a2b1 -->
```

This marker travels with the repo, is versioned like everything else, and needs no extra state files. Every maintain run reads it, processes `marker..HEAD`, and rewrites it. If the marker is missing (someone deleted it, or the changelog was hand-edited), tell the user and rebuild it: find the newest commit already mentioned in the changelog, or fall back to a full-history re-derivation.

**The changelog records what changed; the pages describe how things work now.** Never paste diffs or commit messages into guide pages. A feature commit produces (a) one or more changelog lines and (b) an update to the page that describes that feature's current behavior. If no page describes it yet and it's user-facing, create one.

**Works for non-code projects too.** For a research folder, a book draft, a legal-documents repo: "features" are new or restructured content, "fixes" are corrections. The wiki describes the project's structure and contents; the changelog logs meaningful content changes. Skip trivial noise (typo commits, formatting-only) — summarize or omit, using judgment.

**Idempotent and boring.** Running the maintain flow twice in a row must produce zero changes the second time. If it wouldn't, the marker handling is wrong — fix that before anything else.

## The end-of-task duty

This is the part that makes the wiki "self-maintaining": whenever you complete work that changed a repo containing `mkdocs.yml` — even if the user never mentioned documentation — run the maintain flow before declaring the task done. Commit code changes first, then sync docs, then commit the docs with a `docs: sync wiki and changelog` message. The user should never have to ask "did you update the docs?"; the answer is structurally yes.

## Quick reference — the sync mechanism

```bash
# 1. Read the marker
MARKER=$(sed -n '1s/.*docs-sync: \([0-9a-f]*\).*/\1/p' docs/changelog.md)

# 2. List pending commits, oldest first, excluding docs-only commits
git log --reverse --pretty=format:'%h%x09%ad%x09%s' --date=short \
  "${MARKER}..HEAD" -- . ':(exclude)docs' ':(exclude)mkdocs.yml'

# 3. ...update pages and changelog (see references/)...

# 4. Point the marker at current HEAD, then commit the docs.
#    The pathspec exclusion in step 2 keeps the docs commit itself
#    from generating changelog noise on the next run.
```

For large backlogs (50+ pending commits), don't write one changelog line per commit — group by theme and by tag/date, and say so to the user. A changelog nobody can read is worse than a short one.

## Finishing checklist (every invocation)

1. Wiki pages reflect current behavior/content — no page contradicts the code or files.
2. `docs/changelog.md` covers every non-trivial commit up to HEAD, marker updated.
3. `mkdocs.yml` nav includes any pages you created.
4. `mkdocs build --strict` passes (if mkdocs is installed in the environment; if not installed and installation isn't possible, say so instead of pretending).
5. Docs changes are committed with a `docs:` prefixed message.
