# Scene/State Navigation Implementation Plan

## Overview
This document outlines the implementation of a unified scene/state navigation system where scenes and their states are treated as a flat array of navigation items.

## Core Concept
**Single Navigation Index**: Instead of tracking `sceneIndex` + `sceneState` separately, we have one `navigationIndex` that points to a specific scene/state pair.

## Example Navigation Array

```typescript
// Story has: Image → Dialogue with quest+input → Text scene

navigationArray = [
  // Image scene (2 states)
  { scene: img1, sceneId: 'img1', sceneState: { type: 'image', state: 'hidden' }, lockForward: true },
  { scene: img1, sceneId: 'img1', sceneState: { type: 'image', state: 'showing' }, lockForward: false },

  // Dialogue scene (6 states - full flow)
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'pre-feature' }, lockForward: true },
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'show-quest' }, lockForward: true, lockBackward: true },
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'input-ready' }, lockForward: true },
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'input-recording' }, lockForward: true },
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'ai-waiting' }, lockForward: true },
  { scene: dlg1, sceneId: 'dlg1', sceneState: { type: 'dialogue', state: 'basic' }, lockForward: false },

  // Text scene (1 state)
  { scene: txt1, sceneId: 'txt1', sceneState: { type: 'simple' }, lockForward: false },
]
```

## Navigation Behavior

### Scrolling Between States (Same Scene)
```
navigationIndex: 2 → 3
sceneId: 'dlg1' → 'dlg1'
Action: NO scroll animation, just UI overlay changes (quest appears)
```

### Scrolling Between Scenes
```
navigationIndex: 7 → 8
sceneId: 'dlg1' → 'txt1'
Action: YES scroll animation to next scene
```

## Implementation Steps

### Phase 1: Type System ✅
- [x] Create `DialogueState` type
- [x] Create `SceneState` union type
- [x] Create `NavigationItem` interface
- [x] Add helper functions (`isSameScene`, `shouldScroll`)

### Phase 2: Navigation Array Builder ✅
- [x] Create `buildNavigationArray(scenes: Scene[]): NavigationItem[]`
- [x] Expand scenes into navigation items based on their `States` field
- [x] Assign scroll locks based on state type

**Scene Expansion Rules:**
```typescript
// Image scene with caption
scene.type === 'image' → [
  { sceneState: { type: 'image', state: 'hidden' }, lockForward: true },
  { sceneState: { type: 'image', state: 'showing' }, lockForward: false }
]

// Dialogue with States: ["quest", "input"]
scene.States === ["quest", "input"] → [
  { sceneState: { type: 'dialogue', state: 'pre-feature' }, lockForward: true },
  { sceneState: { type: 'dialogue', state: 'show-quest' }, lockForward: true, lockBackward: true },
  { sceneState: { type: 'dialogue', state: 'input-ready' }, lockForward: true },
  { sceneState: { type: 'dialogue', state: 'input-recording' }, lockForward: true },
  { sceneState: { type: 'dialogue', state: 'ai-waiting' }, lockForward: true },
  { sceneState: { type: 'dialogue', state: 'basic' }, lockForward: false }
]

// Simple scene (text, title, etc)
!scene.States → [
  { sceneState: { type: 'simple' }, lockForward: false }
]
```

### Phase 3: SceneManager Integration ✅
- [x] Store `navigationArray` in SceneManager
- [x] Add `navigationIndex` (kept currentIndex for backward compatibility)
- [x] Add `getCurrentScene()` helper (returns unique scene for rendering)
- [x] Add `getCurrentNavigationItem()` helper
- [x] Add `getCurrentSceneId()` helper

### Phase 4: Scroll System Updates ✅
- [x] Update `useStepScroll` to accept navigationArray
- [x] Check `shouldScroll(from, to)` before animating
- [x] If same scene: skip scroll animation (state change only)
- [x] If different scene: animate scroll normally
- [x] Update ScrollControl to pass navigationArray from SceneManager

### Phase 5: Content Lock Updates
- [ ] Update `useContentLocks` to read lock flags from NavigationItem
- [ ] Simplify - just return `navigationArray[index].lockForward`

### Phase 6: State Transitions
- [ ] Add `transitionToNextState()` method
- [ ] Quest accept → increments navigationIndex
- [ ] Mic press → increments navigationIndex
- [ ] AI response → increments navigationIndex

### Phase 7: PageMaker Integration
- [ ] Support inserting new NavigationItems dynamically
- [ ] When dialogue converts to scenes, splice into navigation array

## Key Questions Resolved

1. **Who builds the array?** SceneManager during initial load
2. **Visual scrolling?** Only when sceneId changes
3. **Index tracking?** Single navigationIndex is source of truth
4. **Dynamic changes?** PageMaker can insert/modify navigation array

## Benefits

1. **Simplicity**: One index, one array, one source of truth
2. **Predictable**: Linear navigation is easy to reason about
3. **Flexible**: Easy to add/remove/reorder states
4. **Testable**: Navigation array can be inspected and tested
5. **Debuggable**: Can visualize entire user journey
