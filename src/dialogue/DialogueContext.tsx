import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Message } from "./types";
import { newId, nowIso } from "./types";

type State = {
  messagesById: Record<string, Message>;
  orderByScene: Record<string, string[]>;  // sceneId -> [messageId...]
};

type BeginRecording = { type: 'BEGIN_RECORDING'; sceneId: string; id: string };
type UpdateRecording = { type: 'UPDATE_RECORDING'; id: string; partialText: string; isInterim?: boolean };
type EndRecording = { type: 'END_RECORDING'; id: string; finalText: string };
type AppendNpc = { type: 'APPEND_NPC'; sceneId: string; id: string; text: string };
type SetStatus = { type: 'SET_STATUS'; id: string; status: Message['status'] };

type Action = BeginRecording | UpdateRecording | EndRecording | AppendNpc | SetStatus;

const initialState: State = { messagesById: {}, orderByScene: {} };

function reducer(state: State, action: Action): State {

  switch (action.type) {
    case 'BEGIN_RECORDING': {
      const id = action.id;
      const msg: Message = {
        id, sceneId: action.sceneId, sender: 'player',
        text: '', status: 'recording', isInterim: true, ts: nowIso()
      };
      const scene = state.orderByScene[action.sceneId] ?? [];
      const newState = {
        messagesById: { ...state.messagesById, [id]: msg },
        orderByScene: { ...state.orderByScene, [action.sceneId]: [...scene, id] }
      };
      return newState;
    }
    case 'UPDATE_RECORDING': {
      const prev = state.messagesById[action.id];
      if (!prev) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.id]: { ...prev, text: action.partialText, isInterim: !!action.isInterim, ts: nowIso() }
        }
      };
    }
    case 'END_RECORDING': {
      const prev = state.messagesById[action.id];
      if (!prev) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.id]: { ...prev, text: action.finalText, isInterim: false, status: 'pending', ts: nowIso() }
        }
      };
    }
    case 'APPEND_NPC': {
      const id = action.id;
      const msg: Message = {
        id, sceneId: action.sceneId, sender: 'npc',
        text: action.text, status: 'sent', ts: nowIso()
      };
      const scene = state.orderByScene[action.sceneId] ?? [];
      return {
        messagesById: { ...state.messagesById, [id]: msg },
        orderByScene: { ...state.orderByScene, [action.sceneId]: [...scene, id] }
      };
    }
    case 'SET_STATUS': {
      const prev = state.messagesById[action.id];
      if (!prev) return state;
      return {
        ...state,
        messagesById: { ...state.messagesById, [action.id]: { ...prev, status: action.status, ts: nowIso() } }
      };
    }
    default: return state;
  }
}

const Ctx = createContext<null | (ReturnType<typeof useDialogueValue>)>(null);

function useDialogueValue() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // public API
  const beginRecording = (sceneId: string) => {
    const id = newId();
    dispatch({ type: 'BEGIN_RECORDING', sceneId, id });
    return id;
  };

  const updateRecording = (id: string, partialText: string, opts?: { isInterim?: boolean }) => {
    dispatch({ type: 'UPDATE_RECORDING', id, partialText, isInterim: opts?.isInterim });
  };

  const endRecording = async (id: string, finalText: string) => {
    dispatch({ type: 'END_RECORDING', id, finalText });
    try {
      // call LLM/reply service here; get npcText
      const npcText = await (window as any).services?.replyTo?.(finalText) ?? "I hear you!"; // replace with real service
      const sceneId = state.messagesById[id]?.sceneId!;
      dispatch({ type: 'SET_STATUS', id, status: 'sent' });
      dispatch({ type: 'APPEND_NPC', sceneId, id: newId(), text: npcText });
      // hand off to quest logic elsewhere
      (window as any).services?.onTurnComplete?.({ sceneId, playerId: id, npcText });
    } catch (e) {
      dispatch({ type: 'SET_STATUS', id, status: 'error' });
    }
  };

  const getMessagesForScene = useCallback((sceneId: string): Message[] => {
    const messageIds = state.orderByScene[sceneId] ?? [];
    const messages = messageIds.map(id => state.messagesById[id]);
    return messages;
  }, [state]);

  return { state, beginRecording, updateRecording, endRecording, getMessagesForScene };
}

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const value = useDialogueValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDialogue() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogue must be used within DialogueProvider");
  return ctx;
}