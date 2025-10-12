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