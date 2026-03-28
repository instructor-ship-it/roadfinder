#!/bin/bash
# Documentation Sync Check Script
# Run this before releases to ensure documentation is up to date

echo "📋 Documentation Sync Check"
echo "============================"

# Check version consistency
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
README_VERSION=$(grep 'version-RC' README.md | head -1 | sed 's/.*RC%20\([0-9.]*\).*/\1/')

echo ""
echo "🔍 Version Check:"
echo "  package.json: $PACKAGE_VERSION"
echo "  README.md: RC $README_VERSION"

if [[ "$PACKAGE_VERSION" != "$README_VERSION" ]]; then
  echo "  ⚠️  Version mismatch! Update README.md badge"
else
  echo "  ✅ Versions match"
fi

# Check for TODO comments
echo ""
echo "🔍 TODO Comments:"
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [[ "$TODO_COUNT" -gt 0 ]]; then
  echo "  ⚠️  Found $TODO_COUNT TODO/FIXME comments"
  grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
else
  echo "  ✅ No TODO comments found"
fi

# Check test coverage
echo ""
echo "🔍 Test Status:"
TEST_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)
echo "  Test files: $TEST_FILES"

# Check for console.log in production code
echo ""
echo "🔍 Console.log Check:"
CONSOLE_COUNT=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | wc -l)
if [[ "$CONSOLE_COUNT" -gt 0 ]]; then
  echo "  ⚠️  Found $CONSOLE_COUNT console.log statements (consider using a logger)"
else
  echo "  ✅ No console.log statements found"
fi

# Check documentation files exist
echo ""
echo "🔍 Documentation Files:"
DOCS=("README.md" "CONTRIBUTING.md" "LICENSE" ".env.example")
for doc in "${DOCS[@]}"; do
  if [[ -f "$doc" ]]; then
    echo "  ✅ $doc exists"
  else
    echo "  ❌ $doc missing"
  fi
done

echo ""
echo "============================"
echo "📋 Documentation sync check complete!"
