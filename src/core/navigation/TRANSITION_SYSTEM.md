# Transition Management System

## Overview

This system decouples **animation state** (what's visually transitioning) from **navigation state** (the logical scene graph). This prevents unwanted animation replays when scenes are inserted or deleted during transitions.

## Architecture

### Two-Layer Design

1. **Visual Layer (Frozen Snapshots)**
   - Managed by `TransitionManager`
   - Captures character data at the moment of navigation
   - Animations read ONLY from these snapshots
   - Independent from navigation mutations

2. **Logical Layer (Navigation Graph)**
   - Managed by `SceneManager`
   - Handles scene insertions, deletions, and rewiring
   - Can mutate freely without affecting ongoing animations

### Key Components

#### `TransitionManager` ([useTransitionManager.tsx](./useTransitionManager.tsx))
- Creates frozen snapshots of character data
- Manages `activeTransition` state
- Emits lifecycle events (begin, complete, cancel)
- Auto-completes transitions after 2 seconds

#### `SceneManager` ([SceneManager.tsx](../scenes/SceneManager.tsx))
- Calls `beginTransition()` BEFORE any navigation mutations
- Handles deferred deletion with `scheduleDeletionWithRewiring()`
- Processes pending deletions before new navigation

#### `CharacterOrchestrator` ([CharacterOrchestrator.tsx](../../features/characters/CharacterOrchestrator.tsx))
- Reads from `activeTransition` when available (priority 1)
- Falls back to live `navigationArray` when no transition (priority 2)
- Uses `transition.id` as React key for clean unmounting

## Navigation Flow

### Standard Navigation (A → B)

```
1. User scrolls
2. SceneManager.beginTransition(A_index, B_index, 'forward', navigationArray)
   └─> Captures frozen snapshot of A and B character data
3. SceneManager.processPendingDeletions()
   └─> Cleans up any scenes scheduled for deletion
4. SceneManager.setNavigationIndex(B_index)
   └─> Triggers re-render
5. CharacterOrchestrator re-renders
   └─> Reads from activeTransition.toCharacters (frozen B data)
6. After 2s: TransitionManager.onTransitionComplete()
   └─> Clears activeTransition
7. CharacterOrchestrator switches to reading from live navigationArray
```

### Navigation with Deletion (A → B, delete A)

```
1. User scrolls from A → B
2. SceneManager.beginTransition(A_index, B_index, 'forward', navigationArray)
   └─> Snapshot captures: fromCharacters (A), toCharacters (B)
3. SceneManager.scheduleDeletionWithRewiring(A_index)
   └─> Calculates rewiring: B should skip A when going backward
   └─> Schedules deletion for 3 seconds later
4. SceneManager.setNavigationIndex(B_index)
5. CharacterOrchestrator shows B using frozen snapshot
   └─> Even though A is scheduled for deletion, animation shows correct A→B transition
6. After 2s: Transition completes
7. After 3s: A is removed from navigationArray
   └─> Back navigation from B now skips to C (or null if A was head)
```

## Edge Cases

### 1. Deleting the Head Scene

**Scenario:** A (head) → B → C, delete A

**Handling:**
```typescript
calculateRewiring(A_index) returns:
{
  newPrevSceneId: null,  // B becomes new head
  targetIndex: B_index
}
```

**Result:** B.prevId = null, back navigation from B is disabled

### 2. Deleting Multiple Scenes in Sequence

**Scenario:** A → B → C, navigate to B (delete A), then navigate to C (delete B)

**Handling:**
- First navigation: B.prevId rewired to null
- Second navigation: C.prevId rewired to null
- Both deletions process after their respective transitions

**Result:** Each deletion cleanly updates pointers, no resurrection possible

### 3. Rapid Navigation (A → B → C before transition completes)

**Scenario:** User scrolls A → B, then immediately B → C

**Handling:**
```typescript
beginTransition(B_index, C_index) {
  if (activeTransition) {
    // Cancel previous A→B transition
    emit('transition-cancel', oldTransition)
  }
  // Create fresh B→C transition snapshot
  createNewSnapshot(B, C)
}
```

**Result:**
- Old A→B transition cancelled
- New B→C transition starts with correct snapshot
- No overlapping animations

### 4. Navigating Back to a Pending Scene

**Scenario:** Can user navigate back to A after it's scheduled for deletion?

**Answer:** No - impossible by design

**Reason:**
- `scheduleDeletionWithRewiring()` immediately updates B.prevId to skip A
- Back navigation logic uses rewired pointers
- A is architecturally unreachable from B onward

### 5. Scene Deletion During Active Recording

**Scenario:** User is recording in scene A, then navigates away

**Handling:**
- Recording states have `lockForward: true, lockBackward: true`
- Navigation is blocked until recording completes
- No deletion can occur while locked

**Result:** Safe - deletion only happens during unlocked states

### 6. Interrupted Deletion (navigation before timer expires)

**Scenario:** Scene A scheduled for deletion (3s timer), user navigates within 1s

**Handling:**
```typescript
processPendingDeletions() {
  // Cancel all pending timers
  pendingDeletions.forEach(clearTimeout)
  // Delete all immediately
  performDeletions()
}
```

**Result:** Pending deletions process immediately on new navigation, preventing accumulation

## React Key Strategy

### Why `transition.id` Keys Matter

```tsx
// ❌ BAD: React reuses component, animations skip
<CharacterPanel key={characterName} />

// ✅ GOOD: React creates new component each transition
<CharacterPanel
  key={activeTransition ? `transition-${activeTransition.id}` : `scene-${characterName}`}
/>
```

**Benefits:**
1. No state pollution between transitions
2. Clean unmounting of previous transition
3. Fresh animation state for each transition
4. Deterministic rendering behavior

## Testing Checklist

- [x] A → B transition shows A's characters during animation
- [x] After 2s, transition completes and shows B's characters
- [ ] A → B with A deletion: animation still shows A→B correctly
- [ ] After 3s, A disappears from navigation
- [ ] B's back navigation goes to C (skips deleted A)
- [ ] No animation replay when deletion timer fires
- [ ] Rapid A→B→C maintains correct snapshots
- [ ] Scene keys remain stable across re-renders
- [ ] Deleting head scene (A.prevId = undefined) works
- [ ] Multiple sequential deletions work correctly

## Performance Considerations

### Memory
- Each transition stores 2 character snapshots (~1KB each)
- Auto-cleanup after 2 seconds prevents accumulation
- Only 1 active transition at a time

### Computation
- `beginTransition()` runs synchronously at navigation start
- Snapshot extraction is O(1) - direct array access
- No expensive computations during transitions

### React Re-renders
- Changing `activeTransition` triggers exactly 1 re-render
- CharacterOrchestrator memoizes panel data
- No cascading re-renders from transition changes

## Future Enhancements

### Dynamic Transition Duration
Currently hardcoded to 2000ms. Could make configurable:
```typescript
const TRANSITION_DURATION_MS = scene.meta?.transitionDuration ?? 2000;
```

### Transition Easing
Add easing information to snapshots for smoother animations:
```typescript
interface TransitionSnapshot {
  // ...
  easing: 'ease-in-out' | 'linear' | 'ease-in' | 'ease-out';
}
```

### Transition Events for Analytics
```typescript
addEventListener('transition-begin', (snapshot) => {
  analytics.track('scene_transition', {
    from: snapshot.fromSceneId,
    to: snapshot.toSceneId,
    direction: snapshot.direction
  });
});
```

## Debugging

### Console Logging
All transition events are logged with prefixes:
- `[TransitionManager]` - Snapshot lifecycle
- `[SceneManager]` - Deletion and rewiring

### Common Issues

**Issue:** Animations replay on deletion
**Cause:** Not reading from `activeTransition`
**Fix:** Check CharacterOrchestrator prioritizes `activeTransition` over `navigationArray`

**Issue:** Scene resurrection after deletion
**Cause:** Rewiring not applied
**Fix:** Verify `calculateRewiring()` called before deletion

**Issue:** Transition never completes
**Cause:** Auto-completion timer cancelled
**Fix:** Check no errors thrown during transition, verify setTimeout not cleared

**Issue:** Multiple transitions overlap
**Cause:** Rapid navigation without cancellation
**Fix:** Ensure `beginTransition()` cancels `activeTransition` before creating new one
