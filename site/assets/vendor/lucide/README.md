# Lucide icons (vendored, v1.24.0)

Reference SVG source for icons used across the site, from `lucide-static@1.24.0` (ISC license, see LICENSE).

These files are the source of truth to copy from — pages inline the `<svg>` markup directly rather than
loading these files at runtime, so icons stay themeable via `currentColor` / Tailwind classes and work
with JavaScript disabled.

Convention: `class="lucide h-4 w-4"`, keep `stroke-width="2"` unless a button needs a bolder/lighter weight.
To add a new icon, fetch it from `https://unpkg.com/lucide-static@1.24.0/icons/<name>.svg`, save it here,
then inline its `<path>`/shape children into the page using the same wrapper attributes as existing icons.
