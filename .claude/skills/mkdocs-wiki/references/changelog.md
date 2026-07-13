# Changelog format

`docs/changelog.md` follows Keep a Changelog conventions, with one addition: the sync marker on line 1. The file is both a human document and the skill's state — treat its structure as load-bearing.

## Template

```markdown
<!-- docs-sync: 4f3a2b1 -->
# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); entries are derived from git history.

## [Unreleased]

### Added
- Export to CSV from the reports view (`a1b2c3d`)

### Fixed
- Date parsing failed for non-UTC timezones (`d4e5f6a`)

## [1.2.0] - 2026-05-14

### Added
- ...
```

## Rules

- **Marker**: exactly one HTML comment on line 1, `<!-- docs-sync: <short-sha> -->`. Never move it, never duplicate it.
- **Categories** (only include the ones with content, in this order): Added, Changed, Deprecated, Removed, Fixed, Security.
- **Entries** are one line each, written for a user of the project, not a reader of the diff: "Export to CSV from the reports view", not "add csv_exporter.py". End with the short commit hash in backticks — that's the audit trail back to git. When one line covers several commits, list up to three hashes.
- **Versions**: sections match git tags exactly (name and tag date). No tags in the repo → everything stays under `[Unreleased]`, and that's fine. Never invent version numbers.
- **What to skip**: merge commits, version-bump commits, formatting/lint-only, typo fixes, changes to the wiki itself. When several skipped-worthy commits together amount to something meaningful ("cleaned up the whole test suite"), one Changed line summarizing them is better than silence or noise — judgment call, lean toward the reader's interest.
- **Never rewrite history**: existing released sections are append-only. If a past entry turns out to be wrong, fix it and mention the correction to the user; don't silently reshape old sections during routine syncs.
- **Language**: match the language the rest of the wiki is written in.

## Non-code projects

Same format, adapted vocabulary: Added = new documents/sections/material, Changed = restructured or substantially rewritten content, Removed = retired content, Fixed = factual or reference corrections. The commit-hash audit trail rule still applies — that's what keeps the changelog verifiably synced with git rather than a diary.
