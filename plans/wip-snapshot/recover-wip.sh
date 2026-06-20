#!/usr/bin/env bash
# recover-wip.sh — restore the user's pre-improve WIP for the 6 files
# that the advisor commits (4798cdf, c99420a, f62517c) captured.
#
# USAGE:
#   cd portfolio-webgl
#   bash plans/wip-snapshot/recover-wip.sh
#
# WHAT THIS DOES:
#   The user's pre-improve WIP was never independently committed. It
#   was combined with my advisor changes in 3 commits (4798cdf SRI,
#   c99420a self-host, f62517c Oracle follow-up). To recover the WIP
#   without losing the WIP itself, this script:
#
#     1. Resets the 6 touched files back to a40c4c8 (pre-WIP baseline)
#     2. Applies user-wip.patch, which contains the WIP diff
#     3. Leaves the files in the user's pre-improve WIP state
#
# After this runs, the 6 files are in the WIP state. The WIP for the
# OTHER 6+ files (.gitignore, css/style.css, src/about/AnimationLock.js,
# src/core/MobileAnimations.js, src/ui/CursorCanvas.js, src/ui/Menu.js,
# src/ui/PageTransition.js, D pages/credits.html, ?? assets/,
# ?? src/scroll/SmoothVerticalScroll.js) is still untouched in the
# working tree as uncommitted changes.
#
# After the script, the user can:
#   - Inspect with: git diff a40c4c8 -- <file>
#   - Commit the WIP as: git commit -am 'WIP: pre-improve-cycle state'
#   - Cherry-pick the advisor's non-conflicting work (CSS, firebase.json,
#     src/audio/, CLAUDE.md, LICENSE, plans/) on top.
#
# This script is non-destructive on the rest of the working tree.
# It only touches the 6 files in the recovery set.

set -euo pipefail
cd "$(dirname "$0")/../.."

WIP_FILES=(
  index.html
  pages/about.html
  pages/contact.html
  pages/work.html
  src/main.js
  src/webgl/WebGLApp.js
)

echo "=== Step 1: record current HEAD ==="
START=$(git rev-parse HEAD)
echo "Current HEAD: $START"

echo "=== Step 2: verify worktree is clean (no staged or unstaged changes to the 6 WIP files) ==="
DIRTY=$(git status --porcelain -- "${WIP_FILES[@]}" || true)
if [ -n "$DIRTY" ]; then
  echo "ERROR: You have staged or unstaged changes to one or more WIP files:"
  echo "$DIRTY"
  echo "Stash or commit them first, then re-run this script."
  exit 1
fi
echo "Clean."

echo "=== Step 3: reset the 6 WIP files to a40c4c8 (pre-WIP baseline) ==="
git checkout a40c4c8 -- "${WIP_FILES[@]}"

echo "=== Step 4: apply user-wip.patch (adds WIP on top of a40c4c8) ==="
PATCH="plans/wip-snapshot/user-wip.patch"
if git apply --check "$PATCH" 2>/dev/null; then
  git apply "$PATCH"
  echo "Patch applied."
else
  echo "ERROR: user-wip.patch does not apply cleanly to a40c4c8."
  echo "This indicates the WIP recovery artifact is stale."
  exit 1
fi

echo "=== Step 5: show the result ==="
git diff --stat a40c4c8 -- "${WIP_FILES[@]}"
echo ""
echo "(status of these files: staged+unstaged+untracked)"
git status --short -- "${WIP_FILES[@]}"

echo ""
echo "=== Step 6: re-apply GSAP 3.13.0 (CVE-2020-28478 fix, plan 010) ==="
echo "Without this, the recovered HTML reverts to GSAP 3.2.6 (vulnerable)."
echo "The user's WIP didn't touch the GSAP version line, so the version"
echo "bump can be safely re-applied without clobbering any WIP changes."
for f in index.html pages/about.html pages/contact.html pages/work.html; do
  if grep -q 'gsap/3.2.6' "$f"; then
    sed -i "s|gsap/3.2.6/gsap.min.js|gsap/3.13.0/gsap.min.js|; s|sha384-Xfig962KkXx0xvL1ZwxVQ0niWczaeyKY3oGBBBWrlDj2/+7MAJya/AqlPnqPEUTE|sha384-HOvlOYPIs/zjoIkWUGXkVmXsjr8GuZLV+Q+rcPwmJOVZVpvTSXQChiN4t9Euv9Vc|; s|gsap/3.2.6/EaselPlugin.min.js|gsap/3.13.0/EaselPlugin.min.js|; s|sha384-8vzMZ49+T5k78oALwlE1qBYy0uh+Mz5nrxfBFTDTWxPMB/1e/aB2Z3uDLtacUIu7|sha384-gcbVULrCAP9hrGBa+1R57lCCOgkLr3j7ZYySlj0akrckbdlZQgExJEQyNIdDYqBM|" "$f"
    echo "  $f: re-applied GSAP 3.13.0"
  else
    echo "  $f: already 3.13.0 (or no GSAP tag)"
  fi
done

echo ""
echo "=== Step 7: re-apply self-hosted asset URLs (plan 007) ==="
echo "Without this, src/main.js and src/webgl/WebGLApp.js revert to the"
echo "external jsDelivr CDN (cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana)."
echo "The user's WIP didn't touch the URL lines, so the swap to local"
echo "assets/ paths is safe to re-apply without clobbering WIP changes."
for f in src/main.js src/webgl/WebGLApp.js; do
  if grep -q 'cdn.jsdelivr.net/gh/niccolomiranda' "$f"; then
    sed -i \
      -e "s|https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sound/mainSound.mp3|../assets/sound/mainSound.mp3|" \
      -e "s|https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sound/rollovers/rol05.mp3|../assets/sound/rollovers/rol05.mp3|" \
      -e "s|https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana@72fab3c/sphere/matCap0.jpg|../../assets/sphere/matCap0.jpg|" \
      -e "s|https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sphere/slice2.fbx|../../assets/sphere/slice2.fbx|" \
      "$f"
    echo "  $f: re-applied self-hosted asset URLs"
  else
    echo "  $f: already self-hosted (or no matching URLs)"
  fi
done

echo ""
echo "=== Done ==="
echo "The 6 WIP files are now in the user's pre-improve WIP state."
echo "Other WIP files (.gitignore, css/style.css, src/about/AnimationLock.js, etc.)"
echo "are still uncommitted in the working tree as the user left them."
echo ""
echo "To commit the WIP as a separate snapshot:"
echo "  git add ${WIP_FILES[*]}"
echo "  git commit -m 'WIP: pre-improve-cycle state'"
echo ""
echo "To forward-port the advisor's non-conflicting work:"
echo "  cherry-pick the CSS, firebase.json, src/audio/, CLAUDE.md,"
echo "  LICENSE, and plans/ changes on top of this WIP commit."
