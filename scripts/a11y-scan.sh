#!/bin/bash
# Accessibility scan script for WAP repo
# Outputs findings to stdout for audit documentation

echo "=== A11Y SCAN RESULTS ==="
echo ""

echo "--- 1. IMAGES WITHOUT ALT ATTRIBUTE ---"
grep -rn '<img' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  # Check if the same line or next 2 lines contain alt=
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  if ! sed -n "${lineno},$((lineno+2))p" "$file" | grep -q 'alt='; then
    echo "$file:$lineno: MISSING ALT"
  fi
done
echo ""

echo "--- 2. CLICKABLE DIVS/SPANS (role=button without keyboard handler) ---"
grep -rn 'role="button"' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  if ! sed -n "${lineno},$((lineno+3))p" "$file" | grep -q 'onKeyDown\|onKeyUp\|tabIndex'; then
    echo "$file:$lineno: role=button without keyboard handler or tabIndex"
  fi
done
echo ""

echo "--- 3. ONCLICK ON NON-INTERACTIVE ELEMENTS (div/span without role/button/link) ---"
grep -rn 'onClick={' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | grep -E '<div|<span' | while read line; do
  if ! echo "$line" | grep -q 'role='; then
    echo "$line"
  fi
done | head -30
echo ""

echo "--- 4. INPUTS WITHOUT LABELS ---"
grep -rn '<input' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  if ! echo "$line" | grep -q 'aria-label\|aria-labelledby\|id='; then
    echo "$line"
  fi
done | head -30
echo ""

echo "--- 5. SELECTS WITHOUT LABELS ---"
grep -rn '<select' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  if ! echo "$line" | grep -q 'aria-label\|aria-labelledby\|id='; then
    echo "$line"
  fi
done | head -20
echo ""

echo "--- 6. TEXTAREAS WITHOUT LABELS ---"
grep -rn '<textarea' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  if ! echo "$line" | grep -q 'aria-label\|aria-labelledby\|id='; then
    echo "$line"
  fi
done | head -20
echo ""

echo "--- 7. PAGES WITHOUT H1 ---"
for f in $(find app -name 'page.tsx' -o -name 'page.jsx' | grep -v node_modules | sort); do
  if ! grep -q '<h1' "$f"; then
    echo "$f: no h1"
  fi
done | head -30
echo ""

echo "--- 8. TABLES WITHOUT SCOPE ---"
grep -rn '<th' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | while read line; do
  if ! echo "$line" | grep -q 'scope='; then
    echo "$line"
  fi
done | head -30
echo ""

echo "--- 9. MODAL DIALOGS (need focus trap, escape, aria-modal check) ---"
grep -rn 'modal\|dialog\|Dialog' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | grep -i 'overlay\|backdrop\|modal' | head -20
echo ""

echo "--- 10. ARIA-LIVE REGIONS ---"
grep -rn 'aria-live\|role="status"\|role="alert"' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | wc -l
echo "aria-live/alert/status occurrences (should be > 0 for dynamic content)"
echo ""

echo "--- 11. FOCUS OUTLINE SUPPRESSION (outline-none) ---"
grep -rn 'outline-none\|outline-none' --include='*.tsx' --include='*.jsx' app components | grep -v 'node_modules' | grep -v 'focus-visible' | head -20
echo ""

echo "--- 12. SKIP LINKS ---"
grep -rn 'skip-link\|skipLink' --include='*.tsx' --include='*.jsx' --include='*.css' app components css | grep -v 'node_modules' | head -10
echo ""

echo "=== END SCAN ==="
