# ConversationId System Guide

**Last Updated**: 2025-01-03

## Quick Reference

`conversationId` links scenes to their conversation context (character description, quest data, conversation history).

---

## What is conversationId?

A unique identifier that groups scenes belonging to the same conversation thread with a character.

**Example**: All scenes in a conversation with Ms. Baker share `conversationId: "conv-baker-0"`

---

## When is conversationId created?

**During story load** by `loadStory.ts`:

```typescript
// Scans character-flow for metadata
const conversationId = hasMetadata ? `conv-${flowCounter++}` : undefined;
// Creates: "conv-0", "conv-1", "conv-2", etc.

// Stores metadata
conversationMetadata[conversationId] = {
  characterDescription: "Ms. Baker is a friendly baker...",
  successAnswer: "The king stole the cookie",
  questText: "Find out what happened"
};

// All dialogue scenes in this flow get the conversationId
scene.conversationId = conversationId;
```

---

## Where is conversationId stored?

### 1. Scene Objects
```typescript
{
  type: "character",
  text: "Help! My cookie is missing!",
  speaker: "right",
  conversationId: "conv-0", // ← Links to metadata
  "left-character": "leo",
  "right-character": "bakerMom"
}
```

### 2. Conversation Metadata (Module-level)
```typescript
// navigationMachine.ts
let currentConversationMetadata: ConversationMetadataMap = {
  "conv-0": {
    characterDescription: "Ms. Baker is...",
    successAnswer: "...",
    questText: "..."
  }
};
```

### 3. React Context (Legacy, optional)
```typescript
// FlowMetadataStore.tsx - For React components that need it
const metadata = useSceneConversationMetadata(scene);
const characterDesc = metadata?.characterDescription;
```

---

## How is conversationId used?

### AI Processing
```typescript
// XState callAI actor
const metadata = getConversationMetadata(input.conversationId);
const response = await callAI({
  questionText: input.questionText,
  characterDescription: metadata.characterDescription, // ← Critical!
  conversationHistory: []
});
```

**Why critical?** AI needs character personality context to generate appropriate responses.

### Quest Validation (Future)
```typescript
const metadata = getConversationMetadata(scene.conversationId);
const isCorrect = fuzzyMatch(userAnswer, metadata.successAnswer);
```

### Conversation History (Future)
```typescript
const history = conversationHistory[scene.conversationId];
// All questions/answers with this character
```

---

## The Inheritance Problem & Solution

### Problem: Dynamically Created Scenes

When user clicks "Ask", we create a **recording scene** on-the-fly. This scene needs `conversationId` to work with AI.

**Without inheritance** (old bug):
```typescript
// ❌ BUG: Recording scene has NO conversationId
const newScene = createRecordingScene(recordingId, background, left, right);
// newScene.conversationId = undefined

// Later, AI tries to process:
const metadata = getConversationMetadata(undefined); // ← Returns undefined
// Error: "Character description is required"
```

### Solution: Inherit from Parent

```typescript
// ✅ FIX: Extract conversationId from current scene
const currentScene = getCurrentNode()?.scene;
const conversationId = currentScene?.conversationId; // "conv-0"

// Pass to factory
const newScene = createRecordingScene(
  recordingId,
  conversationId, // ← Now recording scene has context!
  background,
  left,
  right
);

// Result: AI processing works!
const metadata = getConversationMetadata("conv-0"); // ✅ Returns metadata
```

---

## conversationId Lifecycle

```
1. Story Load (loadStory.ts)
   └─→ Scan character-flow for metadata
       └─→ Generate conversationId: "conv-0"
           └─→ Store metadata in map
               └─→ Assign conversationId to all dialogue scenes

2. User Interaction (Dynamic Scene Creation)
   └─→ Click "Ask" button
       └─→ Extract conversationId from current scene
           └─→ Pass to createRecordingScene()
               └─→ Recording scene inherits conversationId

3. AI Processing (callAI actor)
   └─→ Read conversationId from scene
       └─→ Lookup metadata: getConversationMetadata(conversationId)
           └─→ Use characterDescription in AI call

4. AI Response (createAIResponseScene)
   └─→ Create response scene with same conversationId
       └─→ Maintains conversation thread continuity
```

---

## Code Locations

### Scene Type Definition
```typescript
// src/core/types/scene.ts
export type CharacterScene = {
  type: "character";
  text: string;
  speaker?: "left" | "right";
  conversationId?: string; // ← Defined here
  // ...
};
```

### Story Loading
```typescript
// src/core/data/loadStory.ts
const conversationId = hasMetadata ? `conv-${flowCounter++}` : undefined;
conversationMetadata[conversationId] = { /* ... */ };
```

### Metadata Storage
```typescript
// src/core/navigation/machine/navigationMachine.ts
let currentConversationMetadata: ConversationMetadataMap = {};

export function getConversationMetadata(conversationId: string | undefined) {
  if (!conversationId) return undefined;
  return currentConversationMetadata[conversationId];
}
```

### Scene Factories
```typescript
// src/core/navigation/sceneFactoryFunctions.ts
export function createRecordingScene(
  recordingId: string,
  conversationId: string | undefined, // ← Accept as parameter
  currentBackground?: string,
  leftCharacter?: string,
  rightCharacter?: string
): CharacterScene {
  return {
    type: "character",
    sceneId: `recording-${Date.now()}-${random}`,
    recordingId,
    conversationId, // ← Include in scene
    // ...
  };
}
```

### XState Machine Usage
```typescript
// src/core/navigation/machine/navigationMachine.ts

// Action: Create recording scene with conversationId
handleAskButtonClicked: async () => {
  const scene = getCurrentNode()?.scene;
  const conversationId = scene?.conversationId; // Extract

  const newScene = createRecordingScene(
    recordingId,
    conversationId, // Pass
    background,
    leftChar,
    rightChar
  );
};

// Actor: Use conversationId for AI
const callAIService = fromPromise(async ({ input }) => {
  const metadata = getConversationMetadata(input.conversationId); // Lookup
  return await callAI({
    characterDescription: metadata.characterDescription, // Use
    // ...
  });
});
```

---

## Testing conversationId

### Verify Story Load
```typescript
test('loadStory generates conversationId for flows with metadata', async () => {
  const { story, flowMetadata } = await loadStory('/stories/test.json');

  expect(Object.keys(flowMetadata)).toContain('conv-0');
  expect(flowMetadata['conv-0'].characterDescription).toBeDefined();

  const firstScene = story.scenes[0];
  expect(firstScene.conversationId).toBe('conv-0');
});
```

### Verify Inheritance
```typescript
test('createRecordingScene includes conversationId', () => {
  const scene = createRecordingScene('rec-123', 'conv-0', 'bakery', 'leo', 'baker');

  expect(scene.conversationId).toBe('conv-0');
  expect(scene.recordingId).toBe('rec-123');
});
```

### Verify AI Lookup
```typescript
test('callAI service uses conversationId to get characterDescription', async () => {
  // Setup metadata
  currentConversationMetadata['conv-test'] = {
    characterDescription: 'A friendly baker',
    successAnswer: 'cookie',
    questText: 'Find the cookie'
  };

  const result = await callAIService({
    input: {
      questionText: 'What happened?',
      conversationId: 'conv-test'
    }
  });

  expect(result.responseText).toBeDefined();
});
```

---

## Common Issues

### Issue: "No conversation metadata found"
**Cause**: conversationId is undefined or doesn't exist in metadata map

**Debug**:
```typescript
console.log('Scene conversationId:', scene?.conversationId);
console.log('Available metadata:', Object.keys(currentConversationMetadata));
```

**Fix**: Ensure scene has conversationId and metadata was loaded

### Issue: "Character description is required"
**Cause**: conversationId lookup returned undefined or empty metadata

**Debug**:
```typescript
const metadata = getConversationMetadata(conversationId);
console.log('Metadata lookup result:', metadata);
```

**Fix**: Check that story JSON has CharacterDescription in character-flow

### Issue: Recording scene missing conversationId
**Cause**: Not passing conversationId to createRecordingScene()

**Debug**:
```typescript
// In handleAskButtonClicked action
const conversationId = getCurrentNode()?.scene?.conversationId;
console.log('ConversationId for recording scene:', conversationId);
```

**Fix**: Extract conversationId from parent scene and pass to factory

---

## Best Practices

### ✅ DO:
- Always pass `conversationId` when creating dynamic scenes
- Use `getConversationMetadata()` to lookup character context
- Include `conversationId` in log messages for debugging
- Test that scenes have `conversationId` before AI processing

### ❌ DON'T:
- Don't hardcode conversationId values
- Don't create scenes without conversationId if they need AI context
- Don't modify conversationMetadata after story load
- Don't confuse conversationId with recordingId (different purposes)

---

## Future Enhancements

### Planned Features:
1. **Conversation History Storage**
   - Store all messages per conversationId
   - Enable context-aware AI responses

2. **Multi-Character Conversations**
   - Support switching between characters
   - Maintain separate histories per conversationId

3. **Conversation State**
   - Track quest completion per conversationId
   - Enable branching dialogue based on history

4. **Conversation Analytics**
   - Track user engagement per character
   - Analyze conversation patterns

---

## Migration from flowId

**Old naming**:
- `flowId` (ambiguous - flow structure? metadata reference?)
- `useSceneFlowMetadata()`
- `FlowMetadataMap`

**New naming**:
- `conversationId` (clear - conversation context reference)
- `useSceneConversationMetadata()`
- `ConversationMetadataMap`

**Backwards compatibility**: Legacy exports maintained in `FlowMetadataStore.tsx`

---

## Summary

**conversationId** is the link between scenes and their conversation context. It enables:
- AI to generate character-appropriate responses
- Quest validation to check correct answers
- Conversation history to maintain context
- Character-specific state tracking

**Key Rule**: Dynamically created scenes must inherit `conversationId` from their parent scene.

---

**Need help?** Check [ARCHITECTURE_STATE_MANAGEMENT.md](./ARCHITECTURE_STATE_MANAGEMENT.md) for full system overview.
