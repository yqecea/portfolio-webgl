#!/bin/sh
set -eu
# 2026-11-19 exceptions: historical Webflow CSS and generated Three.js bundle.
find src css pages scripts -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.html' \) \
  ! -path css/style.css ! -path src/webgl/vendor/three.js -print0 |
  xargs -0 awk 'FNR==1001 { print FILENAME " exceeds 1000 lines" > "/dev/stderr"; failed=1 } END { exit failed }' index.html 404.html

npm run check:static
npm run check:browser
