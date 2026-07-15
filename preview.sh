#!/usr/bin/env bash
# Local build + preview for the markdown-website static site.
#
#   ./preview.sh              build once, serve dist/ at http://localhost:8000
#   ./preview.sh --watch      also rebuild automatically when site/ changes
#   ./preview.sh --port=8080  serve on a different port
#
# Mirrors exactly what the GitHub Pages workflow does (tailwind build +
# build.py) so what you see here is what ships on push to main.
#
# Needs bash (uses pipefail) — re-exec under bash if invoked via `sh`.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8000}"
WATCH=false
for arg in "$@"; do
  case "$arg" in
    --watch|-w) WATCH=true ;;
    --port=*) PORT="${arg#*=}" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

build_site() {
  tailwindcss -i site/assets/input.css -o site/assets/site.css --minify
  python3 build.py
}

echo "Building site..."
build_site
echo "Build complete -> dist/"

# Production is a GitHub Pages *project* site, so build.py rewrites
# root-relative asset/link paths to live under a base path (e.g.
# /markdown-online). Serving dist/ straight from "/" would 404 every
# asset, so mirror that base path locally via a symlink instead.
base_path=$(python3 -c "import build; print(build.BASE_PATH)")
if [ -n "$base_path" ]; then
  serve_root=$(mktemp -d)
  mkdir -p "$serve_root$(dirname "$base_path")"
  ln -sfn "$(pwd)/dist" "$serve_root$base_path"
  serve_dir="$serve_root"
  preview_path="$base_path/"
else
  serve_dir="dist"
  preview_path="/"
fi

cleanup() {
  [ -n "${watch_pid:-}" ] && kill "$watch_pid" 2>/dev/null
  [ -n "${stamp_file:-}" ] && rm -f "$stamp_file"
  [ -n "${serve_root:-}" ] && rm -rf "$serve_root"
}
trap cleanup EXIT

if [ "$WATCH" = true ]; then
  echo "Watch mode: checking site/ for changes every second..."
  stamp_file=$(mktemp)
  (
    while true; do
      sleep 1
      if [ -n "$(find site -type f -newer "$stamp_file")" ]; then
        touch "$stamp_file"
        echo "Change detected, rebuilding..."
        build_site || echo "Build failed, waiting for next change..."
      fi
    done
  ) &
  watch_pid=$!
fi

echo "Serving at http://localhost:$PORT$preview_path (Ctrl+C to stop)"
python3 -m http.server -d "$serve_dir" "$PORT"
