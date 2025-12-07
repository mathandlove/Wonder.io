# Navigation Architecture - Quick Reference

## File Locations

```
src/core/navigation/
├── machine/
│   ├── types.ts              ← Event/Action/Command type definitions
│   ├── navigationMachine.ts  ← Add your states here
│   ├── navigationInterpreter.ts
│   └── actionCollector.ts
├── events/
│   └── navigationBus.ts      ← Import emit() from here
├── commands/
│   └── executor.ts           ← Map actions → commands
├── queue/
│   └── navigationQueue.ts
└── devtools/
    └── navigationLogger.ts
```

## Three-Step Pattern

### 1️⃣ Emit Event (from Component/Service)

```typescript
import { emit } from '@core/navigation/events/navigationBus';

emit({
  type: 'ANSWER_VALIDATED',
  nodeId: currentNodeId,
  isCorrect: true,
  feedback: 'Correct!',
});
```

### 2️⃣ Handle in Machine (navigationMachine.ts)

```typescript
// In actions setup:
actions: {
  toSuccess: ({ context }) => {
    emitAction(context, {
      type: 'TO_SUCCESS_DANCE',
      sourceNodeId: context.activeNodeId,
    });
  },
},

// In states:
states: {
  idle: {
    on: {
      ANSWER_VALIDATED: [
        { guard: ({ event }) => event.isCorrect, target: 'success', actions: 'toSuccess' },
        { guard: ({ event }) => !event.isCorrect, target: 'fail' },
      ],
    },
  },
  success: {
    after: { 2000: 'idle' },
  },
}
```

### 3️⃣ Execute Command (executor.ts - usually already done)

```typescript
case 'TO_SUCCESS_DANCE': {
  commands.push({ type: 'INSERT_AFTER', ... });
  commands.push({ type: 'NAVIGATE_TO', ... });
  break;
}
```

## Available Event Types

See [machine/types.ts](machine/types.ts) for full list:

- `TRANSCRIPT_READY` - STT completed
- `AI_DONE` - AI response ready
- `ANSWER_VALIDATED` - Answer checked
- `VIDEO_COMPLETE` - Animation finished
- `TIMEOUT` - Operation timed out
- `USER_NAVIGATE` - User scroll/click
- `RECORDING_STARTED` - Recording began
- `RECORDING_STOPPED` - Recording ended
- `INTERNAL_ERROR` - Error occurred

## Available Action Types

Actions are intents the machine emits:

- `TO_SUCCESS_DANCE` - Show success animation
- `TO_FAIL_DANCE` - Show fail animation
- `SET_STATE` - Update node dialogue state
- `NAV_FORWARD` - Navigate next
- `NAV_BACK` - Navigate previous
- `INSERT_RESPONSE_SCENE` - Add AI response scene
- `CLEANUP_TEMP_NODES` - Delete temporary nodes
- `LOG_ERROR` - Log error (doesn't mutate graph)

## Available Command Types

Commands are graph mutations:

- `INSERT_AFTER` - Insert node after another
- `REPLACE_NODE` - Replace node data
- `SET_NODE_STATE` - Update node state
- `NAVIGATE_TO` - Change active node
- `DELETE_NODE` - Remove node

## XState Patterns

### Delayed Transition
```typescript
success: {
  after: {
    2000: 'idle',  // Auto-transition after 2s
  },
}
```

### Conditional Branching
```typescript
on: {
  EVENT: [
    { guard: ({ event }) => event.score > 80, target: 'excellent' },
    { guard: ({ event }) => event.score > 60, target: 'good' },
    { target: 'okay' },  // default case
  ],
}
```

### Context Updates
```typescript
on: {
  EVENT: {
    target: 'next_state',
    actions: assign({
      someField: ({ event }) => event.value,
      anotherField: 'static value',
    }),
  },
}
```

### Parallel States
```typescript
type: 'parallel',
states: {
  audio: { /* ... */ },
  visual: { /* ... */ },
}
```

## Debugging Commands

```javascript
// Browser console:

// 1. View recent logs
window.__navigationLogger.printLogSummary()

// 2. Get detailed logs
window.__navigationLogger.getRecentLogs()

// 3. Clear logs
window.__navigationLogger.clearLogs()

// 4. Check queue status
import { getStats } from '@core/navigation/queue/navigationQueue'
getStats() // { queueLength, isProcessing, isStarted }

// 5. Inspect machine state
import { getServiceInstance } from '@core/navigation/machine/navigationInterpreter'
getServiceInstance().getSnapshot().value    // Current state
getServiceInstance().getSnapshot().context  // Current context
```

## Common Mistakes

### ❌ Don't: Direct Mutation
```typescript
import { insertSceneNodes } from '@core/navigation/navigationHelpers';
insertSceneNodes(nodeId, scene); // WRONG!
```

### ✅ Do: Emit Event
```typescript
import { emit } from '@core/navigation/events/navigationBus';
emit({ type: 'SCENE_INSERT_REQUESTED', nodeId, sceneData }); // RIGHT!
```

---

### ❌ Don't: setTimeout in Component
```typescript
setTimeout(() => {
  deleteNode(nodeId);
}, 2000);
```

### ✅ Do: Use Machine Delays
```typescript
states: {
  showing: {
    after: { 2000: { target: 'done', actions: 'cleanup' } }
  }
}
```

---

### ❌ Don't: Complex Conditional Logic in Component
```typescript
if (isCorrect && hasBonus && !hasError) {
  insertScene(success);
} else if (isCorrect && hasError) {
  insertScene(partial);
} else {
  insertScene(fail);
}
```

### ✅ Do: Use Machine Guards
```typescript
on: {
  RESULT: [
    { guard: 'isCorrectWithBonus', target: 'full_success' },
    { guard: 'isCorrectWithError', target: 'partial_success' },
    { target: 'failure' },
  ],
}
```

## Environment Variables

- `VITE_NAVIGATION_DEBUG=true` - Force enable logging in production

## Testing

```typescript
import { createActor } from 'xstate';
import { navigationMachine } from './navigationMachine';

const actor = createActor(navigationMachine);
actor.start();

actor.send({ type: 'ANSWER_VALIDATED', nodeId: '123', isCorrect: true });
expect(actor.getSnapshot().value).toBe('success_dance');
```

## Guardrails

Run before committing:

```bash
./scripts/check-navigation-guardrails.sh
```

This finds any direct mutator calls outside `commands/`.

## Need Help?

1. Check [README.md](README.md) for architecture overview
2. Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed examples
3. Check `machine/types.ts` for available events/actions/commands
4. Check logs: `window.__navigationLogger.printLogSummary()`
