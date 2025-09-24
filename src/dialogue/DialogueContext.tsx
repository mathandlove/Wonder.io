import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from "react";
import type { Message } from "./types";
import { newId, nowIso } from "./types";

type State = {
  messagesById: Record<string, Message>;
  orderByScene: Record<string, string[]>;  // sceneId -> [messageId...]
  // Legacy state from old DialogueProvider
  isWaitingPending: boolean;
  assistantText: string;
  userText: string;
  turnId: number;
  hasAdvancedForTurn: boolean;
};

type BeginRecording = { type: 'BEGIN_RECORDING'; sceneId: string; id: string };
type UpdateRecording = { type: 'UPDATE_RECORDING'; id: string; partialText: string; isInterim?: boolean };
type EndRecording = { type: 'END_RECORDING'; id: string; finalText: string };
type AppendNpc = { type: 'APPEND_NPC'; sceneId: string; id: string; text: string };
type SetStatus = { type: 'SET_STATUS'; id: string; status: Message['status'] };

// Legacy actions from old DialogueProvider
type SetWaitingPending = { type: 'SET_WAITING_PENDING'; value: boolean };
type SetAssistantText = { type: 'SET_ASSISTANT_TEXT'; text: string };
type SetUserText = { type: 'SET_USER_TEXT'; text: string };
type IncrementTurnId = { type: 'INCREMENT_TURN_ID' };
type SetHasAdvancedForTurn = { type: 'SET_HAS_ADVANCED_FOR_TURN'; value: boolean };
type ResetForNewTurn = { type: 'RESET_FOR_NEW_TURN' };

type Action = BeginRecording | UpdateRecording | EndRecording | AppendNpc | SetStatus |
              SetWaitingPending | SetAssistantText | SetUserText | IncrementTurnId |
              SetHasAdvancedForTurn | ResetForNewTurn;

const initialState: State = {
  messagesById: {},
  orderByScene: {},
  // Legacy state
  isWaitingPending: false,
  assistantText: "",
  userText: "",
  turnId: 0,
  hasAdvancedForTurn: false
};

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
    // Legacy actions
    case 'SET_WAITING_PENDING':
      return { ...state, isWaitingPending: action.value };
    case 'SET_ASSISTANT_TEXT':
      return { ...state, assistantText: action.text };
    case 'SET_USER_TEXT':
      return { ...state, userText: action.text };
    case 'INCREMENT_TURN_ID':
      return { ...state, turnId: state.turnId + 1 };
    case 'SET_HAS_ADVANCED_FOR_TURN':
      return { ...state, hasAdvancedForTurn: action.value };
    case 'RESET_FOR_NEW_TURN':
      return {
        ...state,
        isWaitingPending: true,
        assistantText: "",
        userText: "",
        turnId: state.turnId + 1,
        hasAdvancedForTurn: false
      };
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

  // Legacy functions from old DialogueProvider
  const resetForNewTurn = useCallback(() => {
    dispatch({ type: 'RESET_FOR_NEW_TURN' });
  }, []);

  const arriveAtWaiting = useCallback(() => {
    dispatch({ type: 'SET_WAITING_PENDING', value: false });
  }, []);

  const submitUserMessage = useCallback((message: string) => {
    // Clear any previous assistant text first
    dispatch({ type: 'SET_ASSISTANT_TEXT', text: '' });
    // Set user text
    dispatch({ type: 'SET_USER_TEXT', text: message });
  }, []);

  const startAssistantRequest = useCallback(async (prompt: string) => {
    resetForNewTurn();

    try {
      // Example: call your /api/assistant endpoint
      const res = await fetch("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ prompt }),
        headers: { "Content-Type": "application/json" },
      });

      const text = await res.text();
      dispatch({ type: 'SET_ASSISTANT_TEXT', text });
    } catch (error) {
      console.error('Assistant request failed:', error);
    }
  }, [resetForNewTurn]);

  return {
    state,
    beginRecording,
    updateRecording,
    endRecording,
    getMessagesForScene,
    // Legacy API
    isWaitingPending: state.isWaitingPending,
    assistantText: state.assistantText,
    userText: state.userText,
    turnId: state.turnId,
    hasAdvancedForTurn: state.hasAdvancedForTurn,
    resetForNewTurn,
    arriveAtWaiting,
    submitUserMessage,
    startAssistantRequest
  };
}

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const value = useDialogueValue();

  // Debug key controls from old DialogueProvider
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        value.startAssistantRequest("The Cookies they are found");
      } else if (e.key === "w" || e.key === "W") {
        value.resetForNewTurn();
      } else if (e.key === "r" || e.key === "R") {
        value.resetForNewTurn();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDialogue() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogue must be used within DialogueProvider");
  return ctx;
}