# Navigation System Deep Dive

## Overview

The Navigation System is the backbone of Wonder.io 2.0, managing how users move through scenes and states in the story. It uses a **doubly-linked node graph** for efficient insertions, deletions, and traversal.

## Core Concepts

### Scenes vs Nodes

**Scene**: A visual unit defined in the story JSON
- Rendered as one 100vh DOM element
- Can have multiple internal states
- Examples: Character dialogue, image with caption, full-screen text

**Node**: A navigation stop within a scene
- Represents one state the scene can be in
- Multiple nodes can belong to the same scene
- User scrolls between nodes (but UI only changes for different scenes)

Example: Character scene with quest

```
sceneId: "scene-123"
├── Node 1: dialogue:basic (panel hidden)
├── Node 2: dialogue:quest-showing (quest UI)
└── Node 3: dialogue:input-showInput (input UI)
```

Visual result: Same DOM element, different UI overlays

### Why Doubly-Linked Graph?

**Problem with Array-Based Navigation:**
- Inserting/deleting scenes = O(n) reindexing
- Unstable indices break React keys
- Animation data gets lost during mutations

**Solution: Doubly-Linked Graph:**
```typescript
interface Node {
  id: NodeId;           // Stable, never changes
  prevId: NodeId | null; // ← Previous node
  nextId: NodeId | null; // → Next node
  // ... data
}
```

**Benefits:**
- O(1) insertion/deletion (just rewire pointers)
- Stable IDs for React keys
- Frozen snapshots protect animation data
- Two-phase deletion allows graceful animation cleanup

## Data Structures

### NavigationGraph

Located: [src/core/navigation/navigationGraphTypes.ts](../src/core/navigation/navigationGraphTypes.ts)

```typescript
interface NavigationGraph {
  byId: Record<NodeId, Node>;      // Fast node lookup
  order: NodeId[];                 // Iteration order (debugging)
  currentId: NodeId | null;        // Current position
  lastFrozenNode: FrozenNodeSnapshot | null; // Previous state for animations
  historyVersion: number;          // Triggers React updates on mutations
  sceneRegistry?: SceneRegistry;   // Optional: Fast scene operations
}
```

### Node

```typescript
interface Node {
  // Identity
  id: NodeId;                    // Stable unique ID
  sceneId: SceneId;              // Parent scene
  stateKey: string;              // Semantic name ("dialogue:quest-showing")

  // Data
  scene: Scene;                  // Original scene object
  sceneState: SceneState;        // Current state (type + data)
  stateMeta?: { pose?, timing? };

  // Graph pointers
  prevId: NodeId | null;
  nextId: NodeId | null;

  // Lifecycle
  status: 'active' | 'pendingRemoval';
}
```

### FrozenNodeSnapshot

Immutable snapshot for animations:

```typescript
interface FrozenNodeSnapshot {
  nodeId: NodeId;
  sceneId: SceneId;
  stateKey: string;
  sceneState: SceneState;
  scene: Scene;
}
```

**Why frozen?**
- Character animations need stable previous/current character data
- Graph can be mutated during animation (scene deletion, insertion)
- Snapshot taken at transition start, never changes

## NodeManager

Located: [src/core/navigation/NodeManager.tsx](../src/core/navigation/NodeManager.tsx)

The NodeManager is the primary API for navigation operations.

### Initialization

```typescript
const nodeManager = useNodeManager();

// Load story scenes
nodeManager.setScenes(scenes);
```

This builds the initial navigation graph from scenes.

### Navigation Methods

```typescript
// Move to next node
nodeManager.goNext();

// Move to previous node
nodeManager.goPrev();

// Jump to specific scene
nodeManager.goToScene(sceneId);

// Get current node
const node = nodeManager.getCurrentNode();

// Get current node ID
const id = nodeManager.getCurrentNodeId();
```

### Graph Mutations

```typescript
// Insert new scene after current
nodeManager.insertSceneAfterCurrent(newScene);

// Delete scene range
nodeManager.deleteSceneRange(startNodeId, endNodeId);

// Update node state
nodeManager.updateNodeState(nodeId, newSceneState);
```

### Scene Factory Integration

The NodeManager works with SceneFactory to create dynamic scenes:

```typescript
// SceneFactory creates scenes on-the-fly
const recordingScene = sceneFactory.createRecordingScene(baseScene, recordingId);

// NodeManager inserts it into the graph
nodeManager.insertSceneAfterCurrent(recordingScene);
```

## Navigation Flow

### 1. User Scrolls/Keys

[ScrollControl](../src/core/scroll/ScrollControl.tsx) detects user input:

```typescript
// Scroll wheel / arrow keys
→ Check locks (if locked, prevent scroll)
→ Call nodeManager.goNext() or nodeManager.goPrev()
```

### 2. NodeManager Updates Graph

```typescript
// goNext() implementation
function goNext() {
  const current = byId[currentId];
  // Lock logic now handled by XState machines

  // Traverse pointers
  const next = byId[current.nextId];
  if (!next || next.status === 'pendingRemoval') return;

  // Create frozen snapshot
  lastFrozenNode = freezeNode(current);

  // Update current
  currentId = next.id;
  historyVersion++;  // Trigger React update
}
```

### 3. React Re-Renders

Components using `useNodeManager()` see the update:

```typescript
const { getCurrentNode } = useNodeManager();
const node = getCurrentNode(); // ← New node!
```

### 4. Orchestrators React

- **CharacterOrchestrator**: Checks if characters changed → trigger animations
- **BackgroundOrchestrator**: Updates background position
- **SpeechBubbleOrchestrator**: Shows/hides bubbles
- **ScrollControl**: Scrolls DOM to new scene

## State-Based Locking

Some dialogue states lock navigation:

```typescript
type DialogueState =
  | 'quest-showing'        // Lock forward until quest accepted
  | 'input-recording'      // Lock both during recording
  | 'answer-waiting'       // Lock both while AI processes
  | 'ai-waiting'           // Lock both while waiting
  // ... many more
```

**Implementation**: Each node computes locks from its `sceneState`:

```typescript
// Lock logic now managed by XState machines
// Each scene type (image, dialogue, etc.) has its own state machine
// that controls when navigation is allowed
```

## Two-Phase Deletion

### Problem
You can't delete nodes immediately during animations - the animation needs stable data!

### Solution
**Phase 1**: Mark as pendingRemoval (immediate)
```typescript
node.status = 'pendingRemoval';
```

**Phase 2**: Compact from graph (deferred)
```typescript
setTimeout(() => {
  // Rewire neighbors
  const prev = byId[node.prevId];
  const next = byId[node.nextId];
  if (prev) prev.nextId = node.nextId;
  if (next) next.prevId = node.prevId;

  // Remove from byId
  delete byId[node.id];
}, ANIMATION_DURATION + BUFFER);
```

**Navigation**: Skips `pendingRemoval` nodes automatically:

```typescript
// goNext() skips deleted nodes
let next = byId[current.nextId];
while (next && next.status === 'pendingRemoval') {
  next = byId[next.nextId];
}
```

## Scene Registry (Optional)

For fast scene-level operations:

```typescript
interface SceneRegistry {
  byId: {
    [sceneId]: {
      firstNodeId,  // First node of scene
      lastNodeId,   // Last node of scene
      nodeCount     // Total nodes
    }
  },
  order: [sceneId1, sceneId2, ...]
}
```

**Use Case**: Delete entire scene in O(1)

```typescript
function deleteScene(sceneId: SceneId) {
  const sceneInfo = sceneRegistry.byId[sceneId];

  // Mark all nodes in range as pendingRemoval
  let node = byId[sceneInfo.firstNodeId];
  while (node) {
    node.status = 'pendingRemoval';
    if (node.id === sceneInfo.lastNodeId) break;
    node = byId[node.nextId];
  }

  // Schedule compaction
  scheduleCompaction(sceneInfo.firstNodeId, sceneInfo.lastNodeId);
}
```

## Building the Graph

Located: [src/core/navigation/buildNavigationArray.ts](../src/core/navigation/buildNavigationArray.ts)

### Algorithm

1. **Flatten scenes into nodes**
   ```typescript
   for (const scene of scenes) {
     if (scene.type === 'character' && scene.States?.includes('input')) {
       // Multiple states
       nodes.push(createNode(scene, 'dialogue:basic'));
       nodes.push(createNode(scene, 'dialogue:quest-showing'));
       nodes.push(createNode(scene, 'dialogue:input-showInput'));
     } else {
       // Single state
       nodes.push(createNode(scene, 'static'));
     }
   }
   ```

2. **Wire pointers**
   ```typescript
   for (let i = 0; i < nodes.length; i++) {
     nodes[i].prevId = i > 0 ? nodes[i-1].id : null;
     nodes[i].nextId = i < nodes.length-1 ? nodes[i+1].id : null;
   }
   ```

3. **Build graph**
   ```typescript
   return {
     byId: Object.fromEntries(nodes.map(n => [n.id, n])),
     order: nodes.map(n => n.id),
     currentId: nodes[0].id,
     lastFrozenNode: null,
     historyVersion: 1
   };
   ```

## Graph Operations

### Insert Scene

```typescript
function insertSceneAfterCurrent(scene: Scene) {
  const current = byId[currentId];
  const next = byId[current.nextId];

  // Create new node
  const newNode = createNode(scene);

  // Wire pointers
  newNode.prevId = current.id;
  newNode.nextId = current.nextId;
  current.nextId = newNode.id;
  if (next) next.prevId = newNode.id;

  // Add to graph
  byId[newNode.id] = newNode;
  order.splice(order.indexOf(currentId) + 1, 0, newNode.id);

  historyVersion++;
}
```

### Delete Scene Range

```typescript
function deleteSceneRange(startId: NodeId, endId: NodeId) {
  // Mark all nodes in range
  let node = byId[startId];
  while (node) {
    node.status = 'pendingRemoval';
    if (node.id === endId) break;
    node = byId[node.nextId];
  }

  // Schedule compaction
  setTimeout(() => compactRange(startId, endId), DELAY);

  historyVersion++;
}
```

### Compact Range

```typescript
function compactRange(startId: NodeId, endId: NodeId) {
  const start = byId[startId];
  const end = byId[endId];
  const prev = byId[start.prevId];
  const next = byId[end.nextId];

  // Rewire neighbors
  if (prev) prev.nextId = next?.id || null;
  if (next) next.prevId = prev?.id || null;

  // Remove from byId and order
  let node = start;
  while (node) {
    delete byId[node.id];
    order = order.filter(id => id !== node.id);
    if (node.id === endId) break;
    node = byId[node.nextId];
  }

  historyVersion++;
}
```

## Debugging

### StepScrollDebug Component

Press `\` to toggle the debug panel:

[StepScrollDebug.tsx](../src/core/scroll/StepScrollDebug.tsx)

Shows:
- Current node ID and scene ID
- Node state (dialogue:quest-showing, etc.)
- Character positions (prev/current/next)
- Graph statistics (total nodes, version)
- Lock states

### Logging

Add logging to NodeManager operations:

```typescript
function goNext() {
  console.log('[NodeManager] goNext', { from: currentId });
  // ... operation
  console.log('[NodeManager] now at', { to: currentId });
}
```

## Common Patterns

### Check if scene changed

```typescript
const prevNode = lastFrozenNode;
const currNode = getCurrentNode();

if (prevNode?.sceneId !== currNode?.sceneId) {
  // Scene changed! Trigger scroll animation
}
```

### Check if character changed

```typescript
const prevLeft = prevNode?.scene['left-character'];
const currLeft = currNode?.scene['left-character'];

if (prevLeft !== currLeft) {
  // Left character changed! Trigger entrance
}
```

### Skip deleted nodes

```typescript
let node = byId[startId];
while (node && node.status === 'pendingRemoval') {
  node = byId[node.nextId];
}
```

## Performance Considerations

- **O(1) navigation**: Pointer traversal
- **O(1) insertion**: Wire pointers only
- **O(1) deletion**: Mark + schedule compaction
- **O(n) scene range deletion**: Must traverse range (but only once)

## Future Improvements

1. **Undo/Redo**: Stack of rewiring operations
2. **Branching**: Multiple nextId pointers (choose-your-own-adventure)
3. **Parallel scenes**: Independent storylines
4. **Save/Load**: Serialize graph to JSON
