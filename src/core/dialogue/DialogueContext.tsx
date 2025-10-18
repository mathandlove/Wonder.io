import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Message, ConversationTurn } from "./types";
import { nowIso } from "./types";

type State = {
  messagesById: Record<string, Message>;
  orderByScene: Record<string, string[]>;  // sceneId -> [messageId...]
  conversationTurns: ConversationTurn[];   // Tracks player-NPC pairs ready for scene conversion
};

const initialState: State = {
  messagesById: {},
  orderByScene: {},
  conversationTurns: []
};

// NOTE: Recording actions removed - recording is now handled by RecordingContext
type SetStatus = { type: 'SET_STATUS'; id: string; status: Message['status'] };
type StartConversion = { type: 'START_CONVERSION'; playerMessageId: string; npcMessageId: string };
type CompleteConversion = { type: 'COMPLETE_CONVERSION'; playerMessageId: string; npcMessageId: string };

type Action = SetStatus | StartConversion | CompleteConversion;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATUS': {
      const prev = state.messagesById[action.id];
      if (!prev) return state;
      return {
        ...state,
        messagesById: { ...state.messagesById, [action.id]: { ...prev, status: action.status, ts: nowIso() } }
      };
    }
    case 'START_CONVERSION': {
      const playerMsg = state.messagesById[action.playerMessageId];
      const npcMsg = state.messagesById[action.npcMessageId];
      if (!playerMsg || !npcMsg) return state;

      // Create conversation turn to track this pair
      const turn: ConversationTurn = {
        playerMessageId: action.playerMessageId,
        npcMessageId: action.npcMessageId,
        sceneId: playerMsg.sceneId
      };

      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.playerMessageId]: { ...playerMsg, status: 'converting', ts: nowIso() },
          [action.npcMessageId]: { ...npcMsg, status: 'converting', ts: nowIso() }
        },
        conversationTurns: [...state.conversationTurns, turn]
      };
    }
    case 'COMPLETE_CONVERSION': {
      const playerMsg = state.messagesById[action.playerMessageId];
      const npcMsg = state.messagesById[action.npcMessageId];
      if (!playerMsg || !npcMsg) return state;

      // Remove this turn from pending conversions
      const updatedTurns = state.conversationTurns.filter(
        turn => turn.playerMessageId !== action.playerMessageId || turn.npcMessageId !== action.npcMessageId
      );

      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.playerMessageId]: { ...playerMsg, status: 'converted', ts: nowIso() },
          [action.npcMessageId]: { ...npcMsg, status: 'converted', ts: nowIso() }
        },
        conversationTurns: updatedTurns
      };
    }
    default: return state;
  }
}

const Ctx = createContext<null | (ReturnType<typeof useDialogueValue>)>(null);

function useDialogueValue() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // NOTE: Recording methods removed - recording is now handled by RecordingContext
  // Message and conversion tracking kept for future use

  const startConversion = (playerMessageId: string, npcMessageId: string) => {
    dispatch({ type: 'START_CONVERSION', playerMessageId, npcMessageId });
  };

  const completeConversion = (playerMessageId: string, npcMessageId: string) => {
    dispatch({ type: 'COMPLETE_CONVERSION', playerMessageId, npcMessageId });
  };

  const getPendingConversions = useCallback((): ConversationTurn[] => {
    return state.conversationTurns;
  }, [state.conversationTurns]);

  const getMessagesForScene = useCallback((sceneId: string): Message[] => {
    const messageIds = state.orderByScene[sceneId] ?? [];
    const messages = messageIds.map(id => state.messagesById[id]);
    return messages;
  }, [state]);

  return {
    state,
    startConversion,
    completeConversion,
    getPendingConversions,
    getMessagesForScene
  };
}

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const value = useDialogueValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogue() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogue must be used within DialogueProvider");
  return ctx;
}