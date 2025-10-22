# Animation Fix Summary

## Issues Fixed

### 1. Double Animation Problem ✅

**Symptom:** Characters were animating twice when transitioning between scenes.

**Root Cause:** Two separate mechanisms triggering animations:
1. React key changes from `transition.id` causing component unmount/remount
2. AnimNonce system incrementing and changing internal component keys

**Solution:**
- Removed animNonce system entirely
- Changed to stable React keys that don't change on transitions
- Component stays mounted and reacts to prop changes
- Only one animation trigger mechanism now

**Files Changed:**
- [src/features/characters/CharacterOrchestrator.tsx](src/features/characters/CharacterOrchestrator.tsx)
  - Removed animNonce state and increment logic
  - Changed keys to stable `'character-panel-left'` and `'character-panel-right'`
- [src/features/characters/CharacterPanel.tsx](src/features/characters/CharacterPanel.tsx)
  - Removed animNonce prop
  - Changed internal div key to just `characterName`

### 2. Missing Entrance Animation Problem ✅

**Symptom:** When transitioning from baker to fox, entrance animation no longer played.

**Root Cause:** The transition snapshot was capturing the wrong `previousCharacter`:
```typescript
// Before: toCharacters.previousCharacter came from navigationArray[toIndex - 1]
// This might not be baker if indices aren't consecutive

toCharacters: {
  left: {
    character: 'fox',
    previousCharacter: 'NOCHARACTER', // ❌ Wrong!
    // ...
  }
}
```

CharacterPanel checks: `newCharacter = previousCharacter !== characterName`
- If `previousCharacter = 'NOCHARACTER'` and `characterName = 'fox'` → triggers animation ✅
- But if `previousCharacter = 'fox'` and `characterName = 'fox'` → no animation ❌

**Solution:** Override `previousCharacter` in the transition snapshot to use the "from" character:

```typescript
// After: Explicitly set previousCharacter to the "from" character
const adjustedToSnapshot: CharacterSnapshot = {
  ...toSnapshot,
  left: {
    ...toSnapshot.left,
    previousCharacter: fromSnapshot.left.character, // ✅ Use baker as previous
  },
  right: {
    ...toSnapshot.right,
    previousCharacter: fromSnapshot.right.character,
  },
};
```

Now when transitioning baker → fox:
```typescript
toCharacters: {
  left: {
    character: 'fox',
    previousCharacter: 'baker', // ✅ Correct!
    // ...
  }
}
```

CharacterPanel receives:
- `characterName = 'fox'`
- `previousCharacter = 'baker'`
- `newCharacter = true` (baker !== fox)
- Animation triggers! ✅

**Files Changed:**
- [src/core/navigation/useTransitionManager.tsx](src/core/navigation/useTransitionManager.tsx)
  - Added logic to override `previousCharacter` in toSnapshot
  - Added detailed console logging for debugging

## How It Works Now

### Transition Flow (Baker → Fox)

```
1. User scrolls forward
   ↓
2. SceneManager calls beginTransition(bakerIndex, foxIndex, 'forward')
   ↓
3. TransitionManager captures snapshots:
   - fromSnapshot: { left: { character: 'baker' } }
   - toSnapshot: { left: { character: 'fox', previousCharacter: '???' } }
   ↓
4. Override previousCharacter:
   adjustedToSnapshot.left.previousCharacter = fromSnapshot.left.character
   // Now: previousCharacter = 'baker'
   ↓
5. Store snapshot with corrected previousCharacter
   ↓
6. CharacterOrchestrator receives props from snapshot:
   - characterName = 'fox'
   - previousCharacter = 'baker'
   ↓
7. CharacterPanel calculates:
   newCharacter = ('baker' !== 'fox' && 'fox' !== 'NOCHARACTER')
   // newCharacter = true ✅
   ↓
8. getCurrentPhase() returns 'entering'
   ↓
9. CSS entrance animation plays ONCE ✅
   ↓
10. After 2s: Transition completes
    ↓
11. Component stays mounted (stable key)
12. Props update to live navigationArray
```

## Key Principles

### 1. Component Stability
- CharacterPanel stays mounted across all transitions
- Uses stable React keys that never change
- Reacts to prop changes, not key changes

### 2. Prop-Driven Animations
- Props update from frozen snapshot during transition
- CharacterPanel's internal logic determines when to animate
- No unmount/remount = no double animations

### 3. Correct Context
- Transition snapshot provides the correct "previous" character
- previousCharacter in snapshot = the character we're transitioning FROM
- This ensures `previousCharacter !== characterName` check works correctly

## Debugging

### Console Logs Added

**TransitionManager:**
```typescript
console.log('[TransitionManager] 🎬 Begin transition:', {
  id: transitionId,
  from: fromItem.sceneId,
  to: toItem.sceneId,
  direction,
  leftTransition: 'baker → fox',
  rightTransition: 'NOCHARACTER → NOCHARACTER',
  toSnapshot: {
    leftPrev: 'baker',
    leftCurrent: 'fox',
    rightPrev: 'NOCHARACTER',
    rightCurrent: 'NOCHARACTER',
  }
});
```

**CharacterPanel:**
```typescript
console.log('[CharacterPanel left] 🎭 Entrance animation triggered:', {
  characterName: 'fox',
  previousCharacter: 'baker',
  newCharacter: true,
  scrollDirection: 'forward'
});
```

### What to Look For

✅ **Correct Behavior:**
- TransitionManager shows: `leftTransition: 'baker → fox'`
- TransitionManager shows: `toSnapshot.leftPrev: 'baker'`
- CharacterPanel logs: `Entrance animation triggered`
- Animation plays once

❌ **Incorrect Behavior:**
- TransitionManager shows: `toSnapshot.leftPrev: 'fox'` (same as current)
- CharacterPanel doesn't log animation trigger
- No animation plays

## Testing Checklist

- [x] Build successful (no new TypeScript errors)
- [ ] Baker → Fox transition plays entrance animation once
- [ ] Fox → Baker backward transition plays exit animation once
- [ ] Rapid navigation (A → B → C) maintains correct animations
- [ ] No double animations on any transition
- [ ] Console logs show correct previousCharacter in snapshots

## Files Modified

1. **[src/features/characters/CharacterOrchestrator.tsx](src/features/characters/CharacterOrchestrator.tsx)**
   - Removed animNonce state variables
   - Removed animNonce increment logic
   - Changed to stable React keys
   - Removed unused imports

2. **[src/features/characters/CharacterPanel.tsx](src/features/characters/CharacterPanel.tsx)**
   - Removed animNonce prop
   - Changed internal div key to `characterName` only
   - Added debug logging for entrance animations

3. **[src/core/navigation/useTransitionManager.tsx](src/core/navigation/useTransitionManager.tsx)**
   - Added logic to override previousCharacter in toSnapshot
   - Set toSnapshot.previousCharacter = fromSnapshot.character
   - Added detailed console logging

## Performance Impact

✅ **Improved:**
- No unnecessary component unmounting/remounting
- Reduced React reconciliation work
- Smoother transitions

✅ **Memory:**
- Same memory footprint (frozen snapshots already existed)
- No additional state tracking needed

## Next Steps

1. **Manual Testing** - Verify animations play correctly
2. **Remove Debug Logs** - Once verified, remove console.log statements
3. **Monitor** - Watch for any edge cases in production
