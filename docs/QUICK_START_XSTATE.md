# XState Quick Start Guide

**For developers new to the XState architecture**

---

## 5-Minute Overview

### The Three Layers

```
React (View) → Emits Events → XState (Orchestration) → Updates → Zustand (Data) → Renders → React
```

1. **React**: Just renders UI and emits events
2. **XState**: Makes all decisions, calls services (AI, validation)
3. **Zustand**: Stores navigation graph and current state

### Golden Rules

1. **Never mutate stores from React** - Emit events instead
2. **Never call async operations from React** - Let XState handle via actors
3. **Never put business logic in React** - Keep components pure

---

## Common Tasks

### Task 1: Add a Button Action

**Goal**: User clicks button → Something happens

```typescript
// ✅ CORRECT WAY

// 1. In React component - Just emit event
function MyComponent() {
  const handleClick = () => {
    navigationBus.emit({ type: 'MY_BUTTON_CLICKED' });
  };

  return <button onClick={handleClick}>Do Something</button>;
}

// 2. In XState machine - Handle event
myState: {
  on: {
    MY_BUTTON_CLICKED: {
      actions: 'handleMyButtonClick', // or inline: () => console.log('clicked')
      target: 'nextState' // optional: transition to new state
    }
  }
}

// 3. In actions - Update store if needed
actions: {
  handleMyButtonClick: () => {
    useNavigationStore.getState().updateSomething();
  }
}
```

---

### Task 2: Call an API

**Goal**: Fetch data from backend

```typescript
// ✅ CORRECT WAY

// 1. Create pure service function
// src/features/myFeature/myService.ts
export async function fetchData(input: { id: string }) {
  const response = await fetch(`/api/data/${input.id}`);
  return await response.json();
}

// 2. Create XState actor
// navigationMachine.ts
const fetchDataService = fromPromise(async ({ input }) => {
  return await fetchData({ id: input.id });
});

// Register in machine
actors: {
  fetchData: fetchDataService,
}

// 3. Invoke from state
myState: {
  invoke: {
    src: 'fetchData',
    input: () => ({ id: getCurrentNode()?.id }),
    onDone: {
      target: 'success',
      actions: 'handleDataReceived'
    },
    onError: {
      target: 'error',
      actions: 'handleError'
    }
  }
}
```

---

### Task 3: Access ConversationId

**Goal**: Get character context for current scene

```typescript
// In XState action or actor
const scene = getCurrentNode()?.scene;
const conversationId = scene?.conversationId;

// Lookup metadata
const metadata = getConversationMetadata(conversationId);
const characterDescription = metadata?.characterDescription;

// Use in AI call
const response = await callAI({
  questionText: scene.questionText,
  characterDescription,
  conversationHistory: []
});
```

---

### Task 4: Create a Dynamic Scene

**Goal**: Create scene on-the-fly (like recording scene)

```typescript
// XState action
createMyScene: () => {
  // 1. Get current context
  const scene = getCurrentNode()?.scene;
  const conversationId = scene?.conversationId; // ← IMPORTANT: Inherit!
  const background = scene?.background;

  // 2. Create scene using factory
  const newScene = createMyScene(
    uniqueId,
    conversationId, // ← Pass conversationId
    background
  );

  // 3. Insert into graph
  const currentNodeId = getCurrentNodeId();
  insertSceneNodes(currentNodeId, newScene);

  // 4. Navigate (optional)
  advanceNavigation('forward');
}
```

---

## Debugging Tips

### Tip 1: Watch Console Logs

Look for these log patterns:
```
✅ [NavigationMachine] State changed to: { machineState: '...', scene: '...', phase: '...' }
✅ [NavigationMachine] 🤖 AI Service called with: { conversationId: '...' }
✅ [NavigationMachine] 📝 Storing transcript in scene: ...
```

### Tip 2: Check XState Inspector

Open browser console and look for inspector link:
```
XState Inspector: https://stately.ai/viz?inspect
```

Visualize machine state in real-time!

### Tip 3: Verify ConversationId

```typescript
// Add to your component/action
console.log('Scene conversationId:', getCurrentNode()?.scene?.conversationId);
console.log('Available metadata:', Object.keys(currentConversationMetadata));
```

### Tip 4: Check Event Flow

```typescript
// In navigationBus.subscribe (navigationInterpreter.ts)
console.log('[NavigationInterpreter] Received event:', event.type, event);
```

---

## Common Mistakes

### ❌ Mistake 1: Mutating Store from React

```typescript
// ❌ DON'T DO THIS
function MyComponent() {
  const handleClick = () => {
    useNavigationStore.getState().updateScene({ text: 'new text' });
  };
}

// ✅ DO THIS
function MyComponent() {
  const handleClick = () => {
    navigationBus.emit({ type: 'UPDATE_SCENE_REQUESTED', text: 'new text' });
  };
}
```

### ❌ Mistake 2: Calling AI from useEffect

```typescript
// ❌ DON'T DO THIS
useEffect(() => {
  if (phase === 'ai-waiting') {
    callAI(); // Can create infinite loop!
  }
}, [phase]);

// ✅ DO THIS
// Let XState invoke AI actor (already implemented in askWaitingForAI state)
```

### ❌ Mistake 3: Forgetting ConversationId

```typescript
// ❌ DON'T DO THIS
const newScene = createRecordingScene(recordingId, background);
// Scene has no conversationId → AI will fail

// ✅ DO THIS
const conversationId = getCurrentNode()?.scene?.conversationId;
const newScene = createRecordingScene(recordingId, conversationId, background);
```

### ❌ Mistake 4: Business Logic in React

```typescript
// ❌ DON'T DO THIS
function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch('/api/data');
      const data = await response.json();
      setData(data);
      // Now what? How does XState know? How do we handle errors?
    }
    fetchData();
  }, []);
}

// ✅ DO THIS
// Create XState actor and invoke it from machine state
```

---

## Cheat Sheet

### Event Emission
```typescript
import * as navigationBus from '@core/navigation/events/navigationBus';

navigationBus.emit({
  type: 'MY_EVENT',
  payload: data
});
```

### Store Reading (React)
```typescript
import { useNavigationStore } from '@core/navigation/navigationStore';

// Subscribe to specific slice
const currentNode = useNavigationStore(state => state.getCurrentNode());
const phase = useNavigationStore(state => state.getCurrentPhase());
```

### Store Writing (XState only)
```typescript
// In XState action
useNavigationStore.getState().updateCurrentSceneProperties({ text: 'new' });
useNavigationStore.getState().advance('forward');
```

### ConversationId Lookup
```typescript
import { getConversationMetadata } from '@core/navigation/machine/navigationMachine';

const metadata = getConversationMetadata(conversationId);
const characterDesc = metadata?.characterDescription;
```

### Creating Scenes
```typescript
import { createRecordingScene, createAIResponseScene } from '@core/navigation/sceneFactoryFunctions';

const scene = createRecordingScene(recordingId, conversationId, bg, left, right);
const aiScene = createAIResponseScene(responseText, conversationId, bg, left, right);
```

---

## Where to Learn More

1. **Full Architecture** → [ARCHITECTURE_STATE_MANAGEMENT.md](./ARCHITECTURE_STATE_MANAGEMENT.md)
2. **ConversationId System** → [CONVERSATION_ID_GUIDE.md](./CONVERSATION_ID_GUIDE.md)
3. **Migration Details** → [MIGRATION_2025_01_XSTATE_AI.md](./MIGRATION_2025_01_XSTATE_AI.md)
4. **XState Docs** → [https://xstate.js.org/docs/](https://xstate.js.org/docs/)
5. **Zustand Docs** → [https://docs.pmnd.rs/zustand](https://docs.pmnd.rs/zustand)

---

## Need Help?

1. Check existing documentation first
2. Search codebase for similar patterns
3. Ask in team chat
4. Create GitHub issue with `[Architecture]` tag

---

**Happy coding! Remember: React is just the view. XState is the brain. 🧠**
