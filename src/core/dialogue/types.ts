import { ulid } from "ulid";

export type DeliveryStatus =
  | 'draft'       // Initial state
  | 'recording'   // Mic is pressed, showing live text
  | 'pending'     // Mic released, waiting for AI response
  | 'sent'        // Successfully sent to AI
  | 'converting'  // AI response received, creating permanent scenes
  | 'converted'   // Scenes created and conversation moved to character scenes
  | 'error';      // Error occurred

// State machine for image captions
export type ImageState =
  | 'hidden'      // Caption not yet shown
  | 'showing';    // Caption is visible after first scroll attempt (then unlocks)

// State machine for dialogue scenes with interactive features (quest/input)
export type DialogueState =
  | 'basic'           // 1. Just dialogue, no features visible
  | 'pre-feature'     // 2. Feature about to appear (scroll blocked down)
  | 'show-quest'      // 3. Quest UI visible (scroll blocked up & down)
  | 'input-ready'     // 4. Input UI ready for user (scroll blocked down)
  | 'input-recording' // 5. User speaking (scroll blocked down)
  | 'ai-waiting'      // 6. Waiting for AI response (scroll blocked down)
  | 'quest-basic'     // Quest state 1: Show dialogue with quest pending
  | 'quest-showing'   // Quest state 2: Quest UI visible
  | 'quest-accepted'  // Quest state 3: Quest accepted, can continue
  | 'input-basic'     // Input state 1: Show dialogue with input pending
  | 'input-showInput'; // Input state 2: Show input UI (microphone button)

export type Sender = 'player' | 'npc';

export type Message = {
  id: string;            // ulid()
  sceneId: string;       // ID of the interactive-bubble scene this message belongs to
  sender: Sender;
  text: string;
  status: DeliveryStatus;
  isInterim?: boolean;   // for partial STT results
  ts: string;            // ISO timestamp
};

// Represents a conversation turn that will be converted to permanent scenes
export type ConversationTurn = {
  playerMessageId: string;
  npcMessageId: string;
  sceneId: string;  // The interactive-bubble scene ID
};

export const newId = () => ulid();
export const nowIso = () => new Date().toISOString();