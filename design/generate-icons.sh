#!/usr/bin/env bash
# Regenerates the Android launcher icon PNGs from design/logo.svg.
#
# The adaptive-icon vector drawable
# (App_Resources/Android/src/main/res/drawable/ic_launcher_foreground.xml) is
# hand-authored to mirror this SVG at half scale, since Android's
# VectorDrawable format has no reliable automated SVG converter available
# here. If you change design/logo.svg, update that file's paths/transforms
# to match before re-running this script.
set -euo pipefail

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "error: rsvg-convert is required (e.g. \`pacman -S librsvg\` / \`apt install librsvg2-bin\`)" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
logo_svg="$script_dir/icon.svg"
res_dir="$repo_root/App_Resources/Android/src/main/res"

densities=(
  "mdpi:48"
  "hdpi:72"
  "xhdpi:96"
  "xxhdpi:144"
  "xxxhdpi:192"
)

for pair in "${densities[@]}"; do
  density="${pair%%:*}"
  size="${pair##*:}"
  out="$res_dir/mipmap-$density/ic_launcher.png"
  rsvg-convert -a -w "$size" -h "$size" "$logo_svg" -o "$out"
  echo "wrote $out (${size}x${size})"
done
