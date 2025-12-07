# ChatGateway + ChatFlowOrchestrator Usage Example

This document shows how to use the refactored chat system with proper separation of concerns.

## Architecture Overview

```
┌─────────────────────┐
│ RecordingComponent  │  (User records/types input)
└──────────┬──────────┘
           │ transcript
           ▼
┌─────────────────────┐
│ ChatFlowOrchestrator│  (Coordinates the flow)
└──────────┬──────────┘
           │ calls
           ▼
┌─────────────────────┐
│   ChatGateway       │  (API boundary - text in, text out)
└──────────┬──────────┘
           │ response
           ▼
┌─────────────────────┐
│ ChatFlowOrchestrator│  (Creates scenes, manages navigation)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   PageFactory       │  (Creates scene objects)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   SceneManager      │  (Inserts scenes into navigation)
└─────────────────────┘
```

## Setup Providers

Wrap your app with the necessary providers:

```tsx
import { ChatGatewayProvider } from '@features/chat/gateway';
import { DialogueProvider } from '@core/dialogue';
import { PageFactoryProvider } from '@core/navigation/PageFactory';

function App() {
  return (
    <DialogueProvider>
      <PageFactoryProvider>
        <ChatGatewayProvider>
          <YourApp />
        </ChatGatewayProvider>
      </PageFactoryProvider>
    </DialogueProvider>
  );
}
```

## Usage in Components

### Example 1: Process a transcript after recording

```tsx
import { useChatFlowOrchestrator } from '@core/dialogue';

function RecordingHandler() {
  const chatFlow = useChatFlowOrchestrator({
    onError: (error) => console.error('Chat error:', error),
    onResponseReceived: (text) => console.log('AI responded:', text),
    onSceneCreated: (scene) => console.log('Scene created:', scene.sceneId)
  });

  const handleRecordingComplete = async (transcript: string, recordingId: string) => {
    // Simple: just pass transcript and recording ID
    await chatFlow.processTranscript(transcript, recordingId);
    // The orchestrator handles everything else:
    // - Calls ChatGateway for AI response
    // - Creates response scene with PageFactory
    // - Inserts scene into navigation
    // - Navigates to the new scene
  };

  return (
    <button
      onClick={() => handleRecordingComplete("Hello, how are you?", "rec-123")}
      disabled={chatFlow.isProcessing}
    >
      {chatFlow.isProcessing ? 'Processing...' : 'Send Message'}
    </button>
  );
}
```

### Example 2: Process custom input with metadata

```tsx
import { useChatFlowOrchestrator } from '@core/dialogue';
import type { ChatInput } from '@features/chat/gateway';

function CustomChatInput() {
  const chatFlow = useChatFlowOrchestrator();

  const handleSubmit = async (text: string) => {
    const input: ChatInput = {
      text,
      recordingId: undefined, // No recording, just typed input
      metadata: {
        timestamp: new Date(),
        speaker: 'left',
        currentBackground: 'kitchen',
        leftCharacter: 'leo',
        rightCharacter: 'bakerMom'
      }
    };

    await chatFlow.processUserInput(input);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
      handleSubmit(input.value);
    }}>
      <input name="message" placeholder="Type a message..." />
      <button type="submit" disabled={chatFlow.isProcessing}>
        Send
      </button>
      {chatFlow.lastError && <div className="error">{chatFlow.lastError}</div>}
    </form>
  );
}
```

### Example 3: Integration with RecordPanelOrchestrator

```tsx
// In RecordPanelOrchestrator.tsx
import { useChatFlowOrchestrator } from '@core/dialogue';

export function RecordingOrchestrator() {
  const chatFlow = useChatFlowOrchestrator();

  const handleRecordingComplete = useCallback(async (
    transcript: string,
    recordingId: string
  ) => {


    // Let ChatFlowOrchestrator handle the rest
    await chatFlow.processTranscript(transcript, recordingId);

    // The orchestrator will:
    // 1. Call ChatGateway to get AI response
    // 2. Create a response scene
    // 3. Insert it into navigation
    // 4. Navigate to the new scene
  }, [chatFlow]);

  // ... rest of your recording orchestrator logic
}
```

## Direct ChatGateway Usage (Advanced)

If you need just the chat API without scene creation (e.g., for testing):

```tsx
import { useChatGateway } from '@features/chat/gateway';

function DirectChatExample() {
  const gateway = useChatGateway();

  const sendMessage = async (text: string) => {
    const response = await gateway.submitChat({
      text,
      metadata: {
        timestamp: new Date(),
        speaker: 'left'
      }
    });

    if (response.success) {
      console.log('Got response:', response.text);
      // You handle what to do with response.text
    } else {
      console.error('Error:', response.error);
    }
  };

  return (
    <button onClick={() => sendMessage("Hello!")}>
      Send Direct Message
    </button>
  );
}
```

## Benefits of This Architecture

1. **Separation of Concerns**
   - ChatGateway: API boundary only (text in, text out)
   - ChatFlowOrchestrator: Business logic (scene creation, navigation)
   - Easy to test each part independently

2. **Flexibility**
   - Use ChatFlowOrchestrator for full flow (most common)
   - Use ChatGateway directly for custom flows
   - Easy to swap mock/real backend

3. **Maintainability**
   - Clear responsibilities for each component
   - Easy to find and modify behavior
   - No hidden dependencies

4. **Testability**
   - Mock ChatGateway for testing orchestrator
   - Mock PageFactory for testing chat flow
   - Test gateway independently of scene system
