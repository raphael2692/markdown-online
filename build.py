#!/usr/bin/env python3
"""Build script: site/ -> dist/.

Copies static files, expands shared partials (<!--#include path--> comments),
substitutes site-wide tokens, generates sitemap.xml and robots.txt, and runs
basic per-page validation. Run after any change under site/.
"""
import re
import shutil
import sys
from datetime import date
from pathlib import Path

# TODO: replace with the real domain once one is chosen — this is the only
# place it needs to change; every page sources it from __SITE_URL__.
SITE_URL = "https://example.com"
SITE_NAME = "Markdown Tools"
GITHUB_URL = "https://github.com/"

ROOT = Path(__file__).parent
SITE = ROOT / "site"
DIST = ROOT / "dist"

INCLUDE_RE = re.compile(r"<!--#include ([\w./-]+)-->")
TOKENS = {
    "__SITE_URL__": SITE_URL.rstrip("/"),
    "__SITE_NAME__": SITE_NAME,
    "__GITHUB_URL__": GITHUB_URL,
    "__YEAR__": str(date.today().year),
}


def expand_includes(html, seen=()):
    def repl(match):
        rel = match.group(1)
        if rel in seen:
            raise ValueError(f"circular include: {rel}")
        included = (SITE / rel).read_text()
        return expand_includes(included, seen + (rel,))

    return INCLUDE_RE.sub(repl, html)


def substitute_tokens(text):
    for token, value in TOKENS.items():
        text = text.replace(token, value)
    return text


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    html_files = []
    for src in sorted(SITE.rglob("*")):
        rel = src.relative_to(SITE)
        if rel.parts[0] == "partials" or rel == Path("assets/input.css"):
            continue
        dest = DIST / rel
        if src.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix == ".html":
            html = expand_includes(src.read_text())
            html = substitute_tokens(html)
            dest.write_text(html)
            html_files.append(rel)
        else:
            shutil.copy2(src, dest)

    write_sitemap(html_files)
    write_robots()
    validate(html_files)


def write_sitemap(html_files):
    urls = []
    for rel in sorted(html_files):
        if rel.name != "index.html":
            continue  # clean-URL site: only directory index pages are canonical
        url_path = "" if rel.parent == Path(".") else f"{rel.parent.as_posix()}/"
        urls.append(f"{SITE_URL}/{url_path}")
    lastmod = date.today().isoformat()
    body = "\n".join(f"  <url><loc>{u}</loc><lastmod>{lastmod}</lastmod></url>" for u in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n"
    )
    (DIST / "sitemap.xml").write_text(xml)


def write_robots():
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")


def validate(html_files):
    errors = []
    for rel in html_files:
        html = (DIST / rel).read_text()
        is_error_page = rel.name == "404.html"

        if "<title>" not in html:
            errors.append(f"{rel}: missing <title>")
        if 'rel="canonical"' not in html and not is_error_page:
            errors.append(f"{rel}: missing canonical link")
        if html.count("<h1") > 1:
            errors.append(f"{rel}: more than one <h1>")

        leftover = set(re.findall(r"__[A-Z_]+__", html))
        if leftover:
            errors.append(f"{rel}: unsubstituted token(s) {sorted(leftover)}")

    if errors:
        print("Build validation FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)
    print(f"Built {len(html_files)} pages -> dist/. Validation passed.")


if __name__ == "__main__":
    build()
