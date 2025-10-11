import { ulid } from "ulid";

export type DeliveryStatus = 'draft' | 'recording' | 'pending' | 'sent' | 'error";
export type Sender = 'player' | 'npc";

export type Message = {
  id: string;            // ulid()
  sceneId: string;
  sender: Sender;
  text: string;
  status: DeliveryStatus;
  isInterim?: boolean;   // for partial STT
  ts: string;            // ISO
};

export const newId = () => ulid();
export const nowIso = () => new Date().toISOString();