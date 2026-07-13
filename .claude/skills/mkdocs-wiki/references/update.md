# Maintain flow — keeping the wiki and changelog in sync

Run this whenever `mkdocs.yml` exists and either (a) the user asked for a docs/changelog update, or (b) you just changed the project as part of any other task.

## 1. Find what happened since the last sync

```bash
MARKER=$(sed -n '1s/.*docs-sync: \([0-9a-f]*\).*/\1/p' docs/changelog.md)
git log --reverse --pretty=format:'%h%x09%ad%x09%s' --date=short \
  "${MARKER}..HEAD" -- . ':(exclude)docs' ':(exclude)mkdocs.yml'
```

The pathspec exclusion means commits that only touched the wiki never re-enter the changelog — that's what keeps the loop from feeding on itself.

Edge cases to handle rather than crash on:
- **Marker missing or invalid** → tell the user, then recover: locate the newest commit hash already cited in the changelog, or ask whether to re-derive from full history.
- **Marker commit no longer exists** (history rewrite, shallow clone) → `git merge-base` won't help; fall back to matching the newest changelog entry date against `git log --since`.
- **Nothing pending** → say "wiki already in sync" and stop. Never invent entries.
- **Uncommitted changes you just made** → commit the project work first (with the user's normal commit conventions), then sync. The changelog describes commits, not the working tree.

## 2. Understand each pending commit

For each commit decide two things: its changelog category, and which wiki pages it touches.

- If the project uses conventional commits, map directly: `feat`→Added, `fix`→Fixed, `refactor`/`perf`→Changed, `docs`/`chore`/`ci`/`test`→usually skip.
- If not, don't guess from the message alone — run `git show --stat <hash>` (and read the diff when the message is vague) to see what actually changed. The changelog line you write should describe the user-visible effect, which is often clearer than the commit message itself.
- For non-code projects: added/rewritten content → Added/Changed; corrections → Fixed.
- Group related commits into one line when they're clearly one piece of work landed in pieces ("Add export feature" across 4 commits = one Added line).

## 3. Update the wiki pages

For every commit that changes behavior, content, configuration, or structure:

1. Find the page(s) that describe the affected area. `grep -ril <keyword> docs/` is usually enough.
2. Rewrite those sections to describe the **current** state. Delete claims that are no longer true — stale docs are worse than missing docs.
3. If a user-facing feature has no page or section, create one and add it to `nav` in `mkdocs.yml`.
4. Internal-only changes (refactors, CI, tests) usually need no page edits — changelog judgment applies per `references/changelog.md`.

Write pages for a reader who wasn't in this conversation: no "we changed X to Y" narration, just how it works now.

## 4. Update the changelog

Follow `references/changelog.md` exactly. New entries go under `## [Unreleased]` unless a new git tag appeared among the pending commits — in that case promote the accumulated Unreleased entries into a `## [tag] - date` section.

## 5. Close the loop

```bash
git rev-parse --short HEAD   # this becomes the new marker value
```

1. Rewrite line 1 of `docs/changelog.md` with the new marker.
2. `mkdocs build --strict` if available; fix what it flags.
3. Commit all docs changes: `docs: sync wiki and changelog (<marker>..<new>)`.
4. In your reply to the user, summarize in one or two sentences what the wiki now covers — don't paste the changelog back at them.

Re-running the flow immediately after must find zero pending commits. If it wouldn't, something in steps 1 or 5 is broken — fix that first.
