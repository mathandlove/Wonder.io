#!/bin/bash

# Script to systematically update import paths after refactoring

echo "Fixing import paths..."

# Core modules
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from ['"'"'"]\.\.*/dialogue/|from "@core/dialogue/|g' \
  -e 's|from ['"'"'"]\.\.*/recording/|from "@core/recording/|g' \
  -e 's|from ['"'"'"]\.\.*/quest/|from "@core/quest/|g' \
  -e 's|from ['"'"'"]\.\.*/context/NavigationContext|from "@core/navigation/NavigationContext|g' \
  -e 's|from ['"'"'"]\.\.*/context/CharacterAnimationContext|from "@features/characters/CharacterAnimationContext|g' \
  -e 's|from ['"'"'"]\.\.*/context/EntranceGateContext|from "@features/characters/EntranceGateContext|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useSceneNavigation|from "@core/navigation/useSceneNavigation|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useStepScroll|from "@core/scroll/useStepScroll|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useScrollLock|from "@core/scroll/useScrollLock|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useScrollLockManager|from "@core/scroll/useScrollLockManager|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useScrollOffset|from "@shared/hooks/useScrollOffset|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useScrollManager|from "@shared/hooks/useScrollManager|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useEntranceGate|from "@shared/hooks/useEntranceGate|g' \
  -e 's|from ['"'"'"]\.\.*/hooks/useStory|from "@shared/hooks/useStory|g' \
  -e 's|from ['"'"'"]\.\.*/scenes/registry/sceneBus|from "@core/bus/sceneBus|g' \
  -e 's|from ['"'"'"]\.\.*/scenes/registry/SceneBusProvider|from "@core/bus/SceneBusProvider|g' \
  -e 's|from ['"'"'"]\.\.*/types/scene|from "@core/types/scene|g' \
  -e 's|from ['"'"'"]\.\.*/types/background|from "@shared/types/background|g' \
  {} \;

# Features
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from ['"'"'"]\.\.*/chat/|from "@features/chat/|g' \
  -e 's|from ['"'"'"]\.\.*/background/|from "@features/background/|g' \
  -e 's|from ['"'"'"]\.\.*/characters/|from "@features/characters/|g' \
  -e 's|from ['"'"'"]\.\.*/scenes/|from "@features/scenes/|g' \
  {} \;

# Shared
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from ['"'"'"]\.\.*/components/ui/|from "@shared/ui/|g' \
  -e 's|from ['"'"'"]\.\.*/components/|from "@shared/components/|g' \
  -e 's|from ['"'"'"]\.\.*/utils/|from "@shared/utils/|g' \
  -e 's|from ['"'"'"]\.\.*/data/|from "@shared/data/|g' \
  {} \;

echo "Import paths updated!"
