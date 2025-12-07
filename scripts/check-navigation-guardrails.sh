#!/bin/bash

# Navigation Architecture Guardrails Checker
#
# This script ensures that navigation graph mutators are only called
# from within src/core/navigation/commands/*.
#
# Any violations should be refactored to use the event bus instead.

set -e

echo "🔍 Checking navigation architecture guardrails..."
echo ""

# Define the mutator functions we want to guard
MUTATORS=(
  "insertSceneNodes"
  "insertNode"
  "replaceNode"
  "deleteNode"
  "forceAdvance"
  "setActive"
)

# Track violations
VIOLATIONS=0

for mutator in "${MUTATORS[@]}"; do
  echo "Checking for direct calls to: $mutator"

  # Search for calls to this mutator outside the commands folder
  # Exclude:
  # - src/core/navigation/commands/ (allowed)
  # - src/core/navigation/navigationStore.ts (definitions)
  # - src/core/navigation/queue/ (executor)
  # - test files
  # - node_modules

  RESULTS=$(grep -r "$mutator" src/ \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    | grep -v "src/core/navigation/commands/" \
    | grep -v "src/core/navigation/navigationStore.ts" \
    | grep -v "src/core/navigation/queue/" \
    | grep -v "\.test\." \
    | grep -v "\.spec\." \
    | grep -v "^[[:space:]]*\/\/" \
    | grep -v "^[[:space:]]*\*" \
    | grep "$mutator(" \
    || true)

  if [ ! -z "$RESULTS" ]; then
    echo "  ❌ Found violations:"
    echo "$RESULTS" | while IFS= read -r line; do
      echo "     $line"
    done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "  ✅ No violations"
  fi
  echo ""
done

if [ $VIOLATIONS -gt 0 ]; then
  echo "❌ Found $VIOLATIONS mutator(s) with direct calls outside commands/"
  echo ""
  echo "To fix:"
  echo "1. Replace direct mutator calls with event emissions:"
  echo "   import { emit } from '@core/navigation/events/navigationBus';"
  echo "   emit({ type: 'USER_NAVIGATE', nodeId, direction: 'forward' });"
  echo ""
  echo "2. The machine will process the event and emit the appropriate commands"
  exit 1
else
  echo "✅ All guardrails passing!"
  exit 0
fi
