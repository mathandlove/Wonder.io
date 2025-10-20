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
  | 'basic'           // 1. Just dialogue, no features visible (panel hidden below screen)
  | 'pre-feature'     // 2. Feature about to appear (scroll blocked down) - DEPRECATED, not currently used
  | 'input-ready'     // 4. Input UI ready for user (scroll blocked down) - DEPRECATED, not currently used
  | 'input-recording' // 5. User speaking (scroll blocked down)
  | 'waiting-for-finalize' // 5b. Waiting for final transcripts from STT (for Ask recording)
  | 'ai-waiting'      // 6. Waiting for AI response (scroll blocked down)
  | 'quest-basic'     // Quest state 1: Show dialogue with quest pending
  | 'quest-showing'   // Quest state 2: Quest UI visible (panel centered with Accept button)
  | 'quest-accepted'  // Quest state 3: Quest accepted, can continue
  | 'input-basic'     // Input state 1: Show dialogue with input pending
  | 'input-showInput' // Input state 2: Show input UI (microphone button, panel at bottom)
  | 'show-hint'       // Show hint overlay/modal
  | 'record-answer'   // Recording answer (like input-recording but for Answer button)
  | 'waiting-for-answer-finalize' // Waiting for final transcripts from STT (for Answer recording)
  | 'answer-waiting'  // Waiting for answer validation/AI processing (scroll blocked, panel centered)
  | 'answer-right'    // Correct answer feedback - show answer text centered with green glow
  | 'answer-wrong';   // Wrong answer feedback - show answer text centered with red glow

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