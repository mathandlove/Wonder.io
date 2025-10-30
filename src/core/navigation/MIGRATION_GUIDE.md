# Navigation Architecture Migration Guide

This guide shows you how to incrementally migrate features from the old direct-mutation pattern to the new event-driven architecture.

## Quick Start

The machine starts with a single `idle` state. You add states as you migrate features.

### Example: Migrating Answer Validation

Let's walk through migrating the answer validation flow as a complete example.

#### Before (Current Code)

```typescript
// In RecordPanelOrchestrator.tsx
if (answerIsCorrect) {
  const successScene = createSuccessDanceScene();
  insertSceneNodes(currentNodeId, successScene);
  forceAdvanceNavigation('forward');

  setTimeout(() => {
    deleteNode(successDanceNodeId);
  }, 2000);
}
```

**Problems:**
- Direct graph mutations scattered across components
- Timing logic mixed with business logic
- Hard to test, hard to trace

#### After (Event-Driven)

**Step 1: Emit Event from Component**

```typescript
// In RecordPanelOrchestrator.tsx
import { emit } from '@core/navigation/events/navigationBus';

if (answerIsCorrect) {
  emit({
    type: 'ANSWER_VALIDATED',
    nodeId: currentNodeId,
    isCorrect: true,
    feedback: 'Great job!',
  });
}
```

**Step 2: Add States to Machine**

```typescript
// In navigationMachine.ts
import { setup, assign } from 'xstate';
import { emitAction } from './actionCollector';

export const navigationMachine = setup({
  actions: {
    toSuccessDance: ({ context }) => {
      emitAction(context, {
        type: 'TO_SUCCESS_DANCE',
        sourceNodeId: context.activeNodeId,
      });
    },

    cleanupDance: ({ context }) => {
      emitAction(context, {
        type: 'CLEANUP_TEMP_NODES',
        nodeIds: context.tempNodeIds || [],
      });
    },
  },
}).createMachine({
  id: 'navigation',
  initial: 'idle',
  context: {
    activeNodeId: '',
    dialogueState: 'idle',
    tempNodeIds: [],
    // ... other fields
  },
  states: {
    idle: {
      on: {
        ANSWER_VALIDATED: [
          {
            guard: ({ event }) => event.isCorrect,
            target: 'success_dance',
            actions: [
              assign({ activeNodeId: ({ event }) => event.nodeId }),
              'toSuccessDance',
            ],
          },
          {
            guard: ({ event }) => !event.isCorrect,
            target: 'fail_dance',
            // ... similar pattern
          },
        ],
      },
    },

    success_dance: {
      // Automatically cleanup and return to idle after 2 seconds
      after: {
        2000: {
          target: 'idle',
          actions: 'cleanupDance',
        },
      },
      on: {
        // Allow user to skip by navigating
        USER_NAVIGATE: {
          target: 'idle',
          actions: 'cleanupDance',
        },
      },
    },

    // Add fail_dance state similarly...
  },
});
```

**Step 3: Handle Commands in Executor**

The executor already has mappings for `TO_SUCCESS_DANCE` and `CLEANUP_TEMP_NODES`, so no changes needed! But if you need a new command:

```typescript
// In executor.ts
export function actionsToCommands(
  context: NavigationContext,
  actions: NavigationAction[]
): NavigationCommand[] {
  const commands: NavigationCommand[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'TO_SUCCESS_DANCE': {
        const newNodeId = ulid();
        commands.push({
          type: 'INSERT_AFTER',
          afterNodeId: action.sourceNodeId,
          newNode: {
            nodeId: newNodeId,
            sceneId: `success-dance-${newNodeId}`,
            sceneKind: 'success-dance',
            sceneState: { type: 'static' },
          },
        });
        commands.push({
          type: 'NAVIGATE_TO',
          targetNodeId: newNodeId,
        });
        break;
      }
      // ... other cases
    }
  }

  return commands;
}
```

**Benefits:**
- ✅ All timing logic in one place (machine state)
- ✅ Testable: Just send events and check state transitions
- ✅ Traceable: Logs show event → state → action → command
- ✅ No race conditions: Queue ensures sequential execution

## Migration Checklist

For each feature you migrate:

- [ ] **Identify the flow**: What events trigger what mutations?
- [ ] **Define event types**: Add to `machine/types.ts` if needed
- [ ] **Add machine states**: Update `navigationMachine.ts`
- [ ] **Create actions**: Add to machine's `actions` setup
- [ ] **Update executor**: Map new actions to commands (if needed)
- [ ] **Replace mutations with events**: Change component code
- [ ] **Test**: Verify event → state → command → mutation
- [ ] **Remove TODO comment**: Clean up the old violation marker

## Common Patterns

### Pattern 1: Simple State Transition

**Use case:** Recording starts/stops

```typescript
// Event emission
emit({ type: 'RECORDING_STARTED', nodeId, recordingType: 'question' });

// Machine state
states: {
  idle: {
    on: {
      RECORDING_STARTED: {
        target: 'recording',
        actions: assign({ recordingType: ({ event }) => event.recordingType }),
      },
    },
  },
  recording: {
    on: {
      RECORDING_STOPPED: 'processing',
    },
  },
}
```

### Pattern 2: Delayed Transition

**Use case:** Show feedback for N seconds, then cleanup

```typescript
// No explicit timeout in component - machine handles it!

// Machine state
success_feedback: {
  after: {
    2000: { target: 'idle', actions: 'cleanup' },
  },
}
```

### Pattern 3: Conditional Branching

**Use case:** Different paths based on data

```typescript
states: {
  processing: {
    on: {
      RESULT_READY: [
        { guard: ({ event }) => event.score >= 80, target: 'excellent' },
        { guard: ({ event }) => event.score >= 60, target: 'good' },
        { target: 'needs_improvement' },
      ],
    },
  },
}
```

### Pattern 4: Compound Actions

**Use case:** Multiple mutations that must happen together

```typescript
// Machine action
actions: {
  insertAndNavigate: ({ context, event }) => {
    emitActions(context, [
      { type: 'INSERT_RESPONSE_SCENE', afterNodeId: event.nodeId, responseText: event.response },
      { type: 'NAV_FORWARD', fromNodeId: event.nodeId },
    ]);
  },
}

// State transition
AI_DONE: {
  target: 'idle',
  actions: 'insertAndNavigate',
}
```

## Testing Examples

### Test 1: State Transitions

```typescript
import { createActor } from 'xstate';
import { navigationMachine } from './navigationMachine';

test('correct answer leads to success state', () => {
  const actor = createActor(navigationMachine);
  actor.start();

  actor.send({
    type: 'ANSWER_VALIDATED',
    nodeId: 'test-node',
    isCorrect: true,
  });

  expect(actor.getSnapshot().value).toBe('success_dance');
});
```

### Test 2: Delayed Transitions

```typescript
test('success state auto-transitions after 2 seconds', async () => {
  jest.useFakeTimers();
  const actor = createActor(navigationMachine);
  actor.start();

  actor.send({ type: 'ANSWER_VALIDATED', nodeId: 'test', isCorrect: true });
  expect(actor.getSnapshot().value).toBe('success_dance');

  jest.advanceTimersByTime(2000);
  expect(actor.getSnapshot().value).toBe('idle');

  jest.useRealTimers();
});
```

### Test 3: Command Generation

```typescript
import { actionsToCommands } from '../commands/executor';

test('TO_SUCCESS_DANCE generates insert and navigate commands', () => {
  const context = { activeNodeId: 'node-123', /* ... */ };
  const actions = [{ type: 'TO_SUCCESS_DANCE', sourceNodeId: 'node-123' }];

  const commands = actionsToCommands(context, actions);

  expect(commands).toHaveLength(2);
  expect(commands[0].type).toBe('INSERT_AFTER');
  expect(commands[1].type).toBe('NAVIGATE_TO');
});
```

## Debugging Tips

### 1. Enable Logging

Logging is enabled by default in dev mode. You'll see color-coded logs:

- 🟢 **Green**: Events (input to machine)
- 🔵 **Blue**: Actions (machine output)
- 🟠 **Orange**: Commands (queued for execution)

### 2. Inspect Logs in Console

```javascript
// In browser console:
window.__navigationLogger.printLogSummary()
window.__navigationLogger.getRecentLogs()
```

### 3. XState DevTools

```javascript
// The interpreter exposes the actor for debugging
window.__xstate__.actor

// Or import and inspect directly
import { getServiceInstance } from '@core/navigation/machine/navigationInterpreter';
const service = getServiceInstance();
console.log(service.getSnapshot().value); // Current state
console.log(service.getSnapshot().context); // Current context
```

### 4. Pause the Queue

```typescript
// Useful for inspecting queued commands before they execute
import { getStats } from '@core/navigation/queue/navigationQueue';

console.log(getStats());
// { queueLength: 3, isProcessing: false, isStarted: true }
```

## FAQ

### Q: Do I need to migrate everything at once?
**A:** No! The machine starts in `idle` and only manages flows you've explicitly added states for. Old code continues to work.

### Q: What if I need the same mutation from multiple states?
**A:** Create a reusable action and reference it from multiple transitions:

```typescript
actions: {
  navigateForward: ({ context }) => {
    emitAction(context, { type: 'NAV_FORWARD', fromNodeId: context.activeNodeId });
  },
},

states: {
  state_a: {
    on: { NEXT: { target: 'state_b', actions: 'navigateForward' } }
  },
  state_c: {
    on: { DONE: { target: 'idle', actions: 'navigateForward' } }
  },
}
```

### Q: Can I still read from the store directly?
**A:** Yes! Only *mutations* must go through the event bus. Reads are unrestricted:

```typescript
const currentNode = useNavigationStore(selectCurrentNode);
```

### Q: How do I handle async operations (like AI calls)?
**A:** Emit an event when the async operation completes:

```typescript
// Start AI request
const response = await callAI(question);

// When it completes, emit event
emit({
  type: 'AI_DONE',
  nodeId: currentNodeId,
  response: response.text,
});
```

The machine will handle the state transition and any subsequent mutations.

## Next Steps

1. **Pick your first feature** - Start with something small and self-contained
2. **Follow the migration checklist** - Add states, emit events, test
3. **Remove the TODO comment** - Clean up after successful migration
4. **Run guardrails check** - Verify: `./scripts/check-navigation-guardrails.sh`

Happy migrating! 🚀
