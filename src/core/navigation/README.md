# Navigation Architecture

## Overview

The navigation system has been refactored to use **XState** as the single decision-making brain, with strict separation between:
- **Events** (domain signals from UI/media/AI)
- **State Machine** (decision logic)
- **Commands** (graph mutations)

## Architecture Diagram

```
┌─────────────┐
│   UI / AI   │
│   / Media   │
└──────┬──────┘
       │ emit(event)
       ▼
┌─────────────────────┐
│   Event Bus         │  ← Single intake point
│  (navigationBus)    │
└──────┬──────────────┘
       │ forward to machine
       ▼
┌─────────────────────┐
│  XState Machine     │  ← Deterministic logic
│ (navigationMachine) │
└──────┬──────────────┘
       │ emit action intents
       ▼
┌─────────────────────┐
│  Action Collector   │  ← Convert intents to commands
│ (actionCollector)   │
└──────┬──────────────┘
       │ actionsToCommands()
       ▼
┌─────────────────────┐
│  Command Executor   │  ← Map actions to operations
│    (executor)       │
└──────┬──────────────┘
       │ enqueue(command)
       ▼
┌─────────────────────┐
│  Command Queue      │  ← Concurrency=1
│ (navigationQueue)   │
└──────┬──────────────┘
       │ sequential execution
       ▼
┌─────────────────────┐
│ Graph Mutators      │  ← Only place that changes state
│ (navigationStore)   │
└─────────────────────┘
```

## Key Principles

### 1. **Single Event Intake**
All domain events flow through `navigationBus.emit()`:
```typescript
import { emit } from '@core/navigation/events/navigationBus';

emit({
  type: 'TRANSCRIPT_READY',
  nodeId: currentNodeId,
  transcript: text,
  recordingType: 'question'
});
```

### 2. **Machine as Brain**
The XState machine receives events and decides what should happen:
- No direct state mutations
- Only emits action intents
- Pure, testable logic

### 3. **Command Queue for Mutations**
Graph mutations happen sequentially through a queue:
- Concurrency = 1 (no race conditions)
- Commands are atomic operations
- Queue can be paused/resumed for debugging

### 4. **Strict Import Boundaries**
Graph mutators (`insertNode`, `deleteNode`, etc.) can **only** be imported from:
- `src/core/navigation/commands/` (the executor)
- `src/core/navigation/queue/` (the queue runner)

All other code must use the event bus.

## File Structure

```
src/core/navigation/
├── machine/
│   ├── navigationMachine.ts      # XState machine definition
│   ├── navigationInterpreter.ts  # Machine lifecycle management
│   ├── types.ts                   # Event/Action/Command types
│   └── actionCollector.ts         # Convert actions → commands
├── events/
│   └── navigationBus.ts           # Event bus (single subscriber)
├── commands/
│   └── executor.ts                # Action → command mapping
├── queue/
│   └── navigationQueue.ts         # Sequential command processing
├── store/
│   └── navigationSelectors.ts     # Read-only graph access
├── devtools/
│   └── navigationLogger.ts        # Structured logging
└── README.md                      # This file
```

## Event Flow Examples

### Example 1: User Records a Question

```typescript
// 1. User presses microphone button
emit({
  type: 'RECORDING_STARTED',
  nodeId,
  recordingType: 'question'
});

// 2. Machine transitions to dialogue.input state

// 3. User releases microphone
emit({
  type: 'RECORDING_STOPPED',
  nodeId,
  recordingType: 'question'
});

// 4. STT completes
emit({
  type: 'TRANSCRIPT_READY',
  nodeId,
  transcript: "What is the capital of France?",
  recordingType: 'question'
});

// 5. Machine transitions to dialogue.ai_waiting
// 6. Machine emits SET_STATE action
// 7. Executor converts to SET_NODE_STATE command
// 8. Queue executes: updateNodeState(nodeId, 'ai-waiting')
```

### Example 2: Answer is Correct

```typescript
// 1. AI validates answer
emit({
  type: 'ANSWER_VALIDATED',
  nodeId,
  isCorrect: true
});

// 2. Machine transitions to dialogue.answer_right
// 3. After 1 second, machine auto-transitions to feedback.success_dance
// 4. Machine emits TO_SUCCESS_DANCE action
// 5. Executor converts to:
//    - INSERT_AFTER(success-dance scene)
//    - NAVIGATE_TO(new scene)
// 6. Queue executes commands sequentially
```

## Development Tools

### Logging
Enable structured logging in development:
```typescript
// Automatically enabled in DEV mode
// Or set: VITE_NAVIGATION_DEBUG=true

// Access in console:
window.__navigationLogger.printLogSummary()
window.__navigationLogger.getRecentLogs()
window.__navigationLogger.clearLogs()
```

Logs are color-coded:
- 🟢 **Green**: Events (from UI/AI)
- 🔵 **Blue**: Actions (from machine)
- 🟠 **Orange**: Commands (to graph)

### Guardrails Check
Run the guardrails script to find violations:
```bash
./scripts/check-navigation-guardrails.sh
```

This script searches for direct mutator calls outside the `commands/` folder.

## Migration Guide

### Before (Anti-pattern)
```typescript
// ❌ Direct graph mutation
import { insertSceneNodes } from '@core/navigation/navigationHelpers';

function handleAnswer(isCorrect: boolean) {
  if (isCorrect) {
    const successScene = createSuccessScene();
    insertSceneNodes(currentNodeId, successScene);
    forceAdvanceNavigation('forward');
  }
}
```

### After (Event-driven)
```typescript
// ✅ Emit event, let machine handle it
import { emit } from '@core/navigation/events/navigationBus';

function handleAnswer(isCorrect: boolean) {
  emit({
    type: 'ANSWER_VALIDATED',
    nodeId: currentNodeId,
    isCorrect
  });
  // Machine will:
  // 1. Transition to answer_right state
  // 2. Wait 1 second
  // 3. Emit TO_SUCCESS_DANCE action
  // 4. Insert scene + navigate via commands
}
```

## Testing

The new architecture makes testing much easier:

### Test Events → State Transitions
```typescript
import { navigationMachine } from '@core/navigation/machine/navigationMachine';
import { createActor } from 'xstate';

test('correct answer leads to success dance', () => {
  const actor = createActor(navigationMachine);
  actor.start();

  actor.send({ type: 'ANSWER_VALIDATED', nodeId: '123', isCorrect: true });

  expect(actor.getSnapshot().value).toEqual({ dialogue: 'answer_right' });

  // After 1 second delay
  jest.advanceTimersByTime(1000);

  expect(actor.getSnapshot().value).toEqual({ feedback: 'success_dance' });
});
```

### Test Commands → Graph Mutations
```typescript
import { actionsToCommands } from '@core/navigation/commands/executor';

test('TO_SUCCESS_DANCE creates insert + navigate commands', () => {
  const context = { activeNodeId: 'node-123', /* ... */ };
  const actions = [{ type: 'TO_SUCCESS_DANCE', sourceNodeId: 'node-123' }];

  const commands = actionsToCommands(context, actions);

  expect(commands).toEqual([
    { type: 'INSERT_AFTER', afterNodeId: 'node-123', newNode: { /* ... */ } },
    { type: 'NAVIGATE_TO', targetNodeId: expect.any(String) },
  ]);
});
```

## FAQ

### Q: Why XState instead of simple state management?
**A:** XState provides:
- Visual state charts for debugging
- Guaranteed deterministic transitions
- Built-in guards and delayed transitions
- Type-safe events and context

### Q: What about performance? Isn't this over-engineered?
**A:** The event bus and queue add negligible overhead (~1ms per event). The benefit of eliminating race conditions and making the flow traceable far outweighs any performance cost.

### Q: Can I still use `useNavigationStore` for reads?
**A:** Yes! Read access is unrestricted. Use selectors:
```typescript
import { useNavigationStore, selectCurrentNode } from '@core/navigation/navigationStore';

const currentNode = useNavigationStore(selectCurrentNode);
```

### Q: How do I debug the machine?
**A:** Use XState DevTools:
1. Open browser console
2. Run: `window.__xstate__.actor` (exposed by interpreter)
3. Visualize state at: https://stately.ai/viz

### Q: What if I need to mutate the graph synchronously?
**A:** The queue processes commands synchronously. If you need atomicity across multiple operations, emit a single event that the machine will handle as a compound action.

## Status

- ✅ **Tickets 1-10**: Complete
- ✅ **Machine**: Blank slate with `idle` state - ready for incremental migration
- 📋 **Next**: Add states to the machine as you migrate features

## Migration Strategy

The machine starts blank (`idle` state only). Add states incrementally:

### Step 1: Pick a Feature to Migrate
Choose a self-contained flow (e.g., "answer validation → success/fail dance").

### Step 2: Add States to the Machine
```typescript
// in navigationMachine.ts
states: {
  idle: { /* ... */ },

  // Add your new states
  answer_validated: {
    on: {
      ANSWER_VALIDATED: [
        { guard: ({ event }) => event.isCorrect, target: 'success_dance' },
        { guard: ({ event }) => !event.isCorrect, target: 'fail_dance' },
      ],
    },
  },

  success_dance: {
    after: { 2000: 'idle' },
  },
}
```

### Step 3: Emit Events Instead of Direct Mutations
```typescript
// Replace this:
insertSceneNodes(nodeId, successScene);

// With this:
emit({ type: 'ANSWER_VALIDATED', nodeId, isCorrect: true });
```

### Step 4: Test the Flow
Verify events → state transitions → commands → graph mutations.

## Contributing

When adding new navigation features:

1. **Define the event** in `machine/types.ts`
2. **Add machine state + transitions** in `navigationMachine.ts`
3. **Add actions to emit commands** in the machine's `actions` setup
4. **Map actions to commands** in `commands/executor.ts` (if new command types needed)
5. **Emit from UI/AI** using `navigationBus.emit()`
6. **Test** event → state → command flow

Never directly call graph mutators outside the `commands/` folder.
