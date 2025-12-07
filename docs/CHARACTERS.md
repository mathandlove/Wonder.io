# Character Animation System

## Overview

The Character Animation System manages character panels, entrance/exit animations, and coordination with speech bubbles. It handles two side panels (left and right) that display animated character sprites.

## Architecture

```
CharacterOrchestrator
├── Manages panel ranges
├── Coordinates with NavigationGraph
└── Renders CharacterPanel components

CharacterPanel
├── Displays character sprite
├── Plays entrance/exit animations
├── Triggers jiggle on speech
└── Emits animation events

CharacterAnimationContext
├── Event bus for animation completion
├── Tracks entrance callbacks
└── Coordinates jiggle completion
```

## Key Components

### CharacterOrchestrator

Location: [src/features/characters/CharacterOrchestrator.tsx](../src/features/characters/CharacterOrchestrator.tsx)

**Responsibilities**:
1. Build panel ranges from navigation graph
2. Determine which characters should be visible at each scroll position
3. Render CharacterPanel for left and right sides
4. Use frozen snapshots for stable animation data

**Panel Range Calculation**:
```typescript
// Group scenes with same character configurations
const ranges = buildPanelRangesFromScenes(scenes);

// Example range:
{
  startIndex: 5,
  endIndex: 10,
  left: { visible: true, character: 'leo', pose: 'happy' },
  right: { visible: true, character: 'bakerMom', pose: 'neutral' }
}
```

**Transform Calculation**:
```typescript
// Panels move with scroll position
const transform = `translateY(${(rangeStartIndex - scrollOffset) * 100}vh)`;
```

### CharacterPanel

Location: [src/features/characters/CharacterPanel.tsx](../src/features/characters/CharacterPanel.tsx)

**Props**:
```typescript
interface CharacterPanelProps {
  side: 'left' | 'right';
  character: string;           // e.g., 'leo', 'bakerMom'
  pose?: string | null;
  previousCharacter?: string;  // For entrance detection
  nextCharacter?: string;      // For exit detection
  transform: string;           // CSS transform from orchestrator
  isVisible: boolean;          // Visibility flag
  sceneIndex: number;          // Current scene index
}
```

**Animation Lifecycle**:
1. **Entrance** (newCharacter = true):
   - Slide in from off-screen
   - Duration: 1.6s (defined in CSS)
   - Fires entrance-complete event

2. **Idle**:
   - Character static at rest position
   - Waiting for speech trigger

3. **Jiggle** (when speaking):
   - Bounce animation on speech bubble appear
   - Duration: 0.5s
   - Fires jiggle-complete event

4. **Exit** (aboutToSwap = true):
   - Slide out to off-screen
   - Duration: 1.0s
   - Character removed after animation

**Character Sprite Resolution**:
```typescript
const imagePath = `/stories/${storyId}.bundle/images/characters/${character}.sticker.webp`;
```

### CharacterAnimationContext

Location: [src/features/characters/CharacterAnimationContext.tsx](../src/features/characters/CharacterAnimationContext.tsx)

**Event Bus API**:
```typescript
// Register callback for entrance completion
registerEntranceCallback(sceneIndex, side, callback);

// Notify entrance complete
notifyEntranceComplete(sceneIndex, side);

// Notify jiggle complete
notifyJiggleComplete(sceneIndex, side);

// Listen for animation events
addEventListener('entrance-complete', listener);
addEventListener('jiggle-complete', listener);
```

**Use Case**: Speech bubble delays entrance until character animation completes

```typescript
// SpeechBubbleOrchestrator.tsx
useEffect(() => {
  characterAnimation.addEventListener('entrance-complete', (sceneIndex) => {
    if (sceneIndex === currentSceneIndex) {
      // Character entered, now show bubble
      setBubbleVisible(true);
    }
  });
}, []);
```

## Panel Metadata Injection

Location: [src/features/characters/adapters/injectPanelMetaFromFlows.ts](../src/features/characters/adapters/injectPanelMetaFromFlows.ts)

**Purpose**: Preprocess scenes to determine character transitions

**Algorithm**:
1. Iterate through all scenes
2. For each scene, look at previous and next scenes
3. Determine if characters are entering, exiting, or staying
4. Inject metadata into scene object

**Metadata Structure**:
```typescript
scene.meta = {
  panelLeft: {
    character: 'leo',
    previousCharacter: 'NOCHARACTER',  // Was empty
    nextCharacter: 'leo',              // Still there
    newCharacter: true,                // Entering!
    aboutToSwap: false                 // Not exiting
  },
  panelRight: {
    character: 'bakerMom',
    previousCharacter: 'bakerMom',
    nextCharacter: 'NOCHARACTER',     // Will exit
    newCharacter: false,
    aboutToSwap: true                  // Exiting!
  }
}
```

**Usage**:
```typescript
// Before rendering
const processedScenes = injectPanelMetaFromFlows(story.scenes);

// CharacterOrchestrator reads meta
const isEntering = scene.meta?.panelLeft?.newCharacter;
const isExiting = scene.meta?.panelLeft?.aboutToSwap;
```

## Animation Coordination

### Problem: Speech Bubble Timing

Speech bubbles should appear AFTER character entrance animation completes, but without blocking navigation.

**Solution**: Delayed transition via CSS

```typescript
// SpeechBubbleOrchestrator.tsx
const transition = isEntering && scrollDirection === 'forward'
  ? 'transform 0.4s ease-out 1.6s'  // Delay matches entrance duration
  : 'transform 0.4s ease-out 0s';   // No delay for backward scroll
```

### Problem: Multiple Characters Jigging

Both left and right characters might speak simultaneously - wait for both to finish jigging before unlocking scroll.

**Solution**: Jiggle completion tracking

```typescript
// CharacterAnimationContext.tsx
const notifyJiggleComplete = (sceneIndex, side) => {
  // Track completion per side
  jiggleCompletions[sceneIndex][side] = true;

  // Check if BOTH sides done
  if (jiggleCompletions[sceneIndex].left &&
      jiggleCompletions[sceneIndex].right) {
    // Fire global completion event
    eventListeners['jiggle-complete'].forEach(listener => {
      listener(sceneIndex);
    });
  }
};
```

## Character State Machine

Each character panel has an implicit state machine:

```
      ┌─────────────┐
      │   HIDDEN    │
      └─────────────┘
            ↓
      (newCharacter)
            ↓
      ┌─────────────┐
      │  ENTERING   │  ← 1.6s animation
      └─────────────┘
            ↓
      (entrance complete)
            ↓
      ┌─────────────┐
      │    IDLE     │
      └─────────────┘
            ↓ ↑
       (jiggle)
            ↓ ↑
      ┌─────────────┐
      │  SPEAKING   │  ← 0.5s jiggle
      └─────────────┘
            ↓
      (aboutToSwap)
            ↓
      ┌─────────────┐
      │   EXITING   │  ← 1.0s animation
      └─────────────┘
            ↓
      ┌─────────────┐
      │   HIDDEN    │
      └─────────────┘
```

## Panel Ranges

**Purpose**: Group scenes with identical character configurations to minimize re-renders

**Algorithm**:
```typescript
function buildPanelRangesFromScenes(scenes: Scene[]): PanelRange[] {
  const ranges: PanelRange[] = [];
  let currentRange: PanelRange | null = null;

  scenes.forEach((scene, index) => {
    const leftChar = scene['left-character'];
    const rightChar = scene['right-character'];

    if (!currentRange ||
        leftChar !== currentRange.left?.character ||
        rightChar !== currentRange.right?.character) {
      // Start new range
      currentRange = {
        startIndex: index,
        endIndex: index,
        left: leftChar ? { visible: true, character: leftChar } : undefined,
        right: rightChar ? { visible: true, character: rightChar } : undefined
      };
      ranges.push(currentRange);
    } else {
      // Extend current range
      currentRange.endIndex = index;
    }
  });

  return ranges;
}
```

**Example Output**:
```typescript
[
  { startIndex: 0, endIndex: 4, left: {character: 'leo'}, right: {character: 'bakerMom'} },
  { startIndex: 5, endIndex: 7, left: {character: 'leo'}, right: {character: 'chef'} },
  { startIndex: 8, endIndex: 10, left: {character: 'leo'}, right: undefined }
]
```

**Performance**: React only re-renders panels when range boundaries change, not on every scroll.

## Frozen Snapshots

**Problem**: Character animations need stable previous/current character data, but the navigation graph can be mutated during animations.

**Solution**: Use FrozenNodeSnapshot

```typescript
// NodeManager creates snapshot at transition
lastFrozenNode = {
  nodeId: currentNode.id,
  sceneId: currentNode.sceneId,
  scene: currentNode.scene,  // ← Includes character data
  sceneState: currentNode.sceneState
};

// CharacterOrchestrator reads from frozen snapshot
const prevScene = lastFrozenNode?.scene;
const prevLeftChar = prevScene?.['left-character'];
```

**Why?** If a scene is deleted during animation, we still have the previous character data for smooth exit animation.

## CSS Classes

Character panels use CSS classes for animations:

```css
/* src/features/characters/CharacterPanel.module.css */

.panel {
  position: fixed;
  width: 300px;
  height: 100vh;
  transition: transform 0.3s ease-out;
}

.panel-left {
  left: 0;
}

.panel-right {
  right: 0;
}

.character-entering-left {
  animation: slideInLeft 1.6s ease-out;
}

.character-entering-right {
  animation: slideInRight 1.6s ease-out;
}

.character-exiting-left {
  animation: slideOutLeft 1.0s ease-out;
}

.character-exiting-right {
  animation: slideOutRight 1.0s ease-out;
}

.character-jiggle {
  animation: jiggle 0.5s ease-in-out;
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes jiggle {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-10px); }
  75% { transform: translateY(-5px); }
}
```

## Debugging

### Debug Panel
Press `\` to see character info in the debug panel:

- Previous scene characters
- Current scene characters
- Next scene characters
- Animation states

### Logging
Enable character animation logging:

```typescript
// CharacterPanel.tsx
console.log('[CharacterPanel]', {
  side,
  character,
  isEntering: newCharacter,
  isExiting: aboutToSwap,
  sceneIndex
});
```

### Animation Event Logging
Track animation events:

```typescript
// CharacterAnimationContext.tsx
notifyEntranceComplete(sceneIndex, side) {
  console.log('[Animation] Entrance complete:', { sceneIndex, side });
  // ...
}

notifyJiggleComplete(sceneIndex, side) {
  console.log('[Animation] Jiggle complete:', { sceneIndex, side });
  // ...
}
```

## Common Issues

### Issue: Character doesn't appear
**Cause**: Missing character sprite file
**Fix**: Check `/public/stories/[story].bundle/images/characters/[name].sticker.webp`

### Issue: Entrance animation doesn't play
**Cause**: `newCharacter` flag not set
**Fix**: Check `injectPanelMetaFromFlows` output, verify previousCharacter vs character

### Issue: Speech bubble appears before character
**Cause**: Bubble transition delay not set
**Fix**: Check `hasEnteringAnimation` logic in SpeechBubbleOrchestrator

### Issue: Exit animation stutters
**Cause**: Scene deleted before animation completes
**Fix**: Use two-phase deletion (mark pendingRemoval → compact after delay)

## Best Practices

1. **Always use frozen snapshots** for animation data
2. **Inject panel metadata** before rendering scenes
3. **Coordinate animations** via CharacterAnimationContext events
4. **Delay dependent animations** (bubble after entrance) via CSS transitions
5. **Test transitions** between all character combinations (none → character → different character → none)

## Future Enhancements

1. **Multiple poses per character** (happy, sad, angry)
2. **Layered sprites** (body + expression + props)
3. **Lip sync** to audio waveform
4. **Idle animations** (breathing, blinking)
5. **Custom entrance/exit animations** per character type
