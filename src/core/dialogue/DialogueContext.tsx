import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Message, ConversationTurn } from "./types";
import { newId, nowIso } from "./types";

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

type BeginRecording = { type: 'BEGIN_RECORDING'; sceneId: string; id: string };
type UpdateRecording = { type: 'UPDATE_RECORDING'; id: string; partialText: string; isInterim?: boolean };
type EndRecording = { type: 'END_RECORDING'; id: string; finalText: string };
type AppendNpc = { type: 'APPEND_NPC'; sceneId: string; id: string; text: string };
type SetStatus = { type: 'SET_STATUS'; id: string; status: Message['status'] };
type StartConversion = { type: 'START_CONVERSION'; playerMessageId: string; npcMessageId: string };
type CompleteConversion = { type: 'COMPLETE_CONVERSION'; playerMessageId: string; npcMessageId: string };

type Action = BeginRecording | UpdateRecording | EndRecording | AppendNpc | SetStatus | StartConversion | CompleteConversion;

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
        orderByScene: { ...state.orderByScene, [action.sceneId]: [...scene, id] },
        conversationTurns: state.conversationTurns
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
        orderByScene: { ...state.orderByScene, [action.sceneId]: [...scene, id] },
        conversationTurns: state.conversationTurns
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
    // Get sceneId BEFORE dispatching, to avoid stale closure
    const sceneId = state.messagesById[id]?.sceneId;
    if (!sceneId) {
      console.error('❌ endRecording: Message not found:', id);
      return;
    }

    dispatch({ type: 'END_RECORDING', id, finalText });

    try {
      console.log('🤖 Calling LLM service...');
      // call LLM/reply service here; get npcText
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const npcText = await (window as any).services?.replyTo?.(finalText) ?? "I hear you!"; // replace with real service
      console.log('✅ LLM response:', npcText);

      const npcId = newId();
      console.log('📝 Creating NPC message:', { sceneId, npcId, npcText });

      dispatch({ type: 'SET_STATUS', id, status: 'sent' });
      dispatch({ type: 'APPEND_NPC', sceneId, id: npcId, text: npcText });

      // hand off to quest logic elsewhere
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).services?.onTurnComplete?.({ sceneId, playerId: id, npcText });
    } catch (e) {
      console.error('❌ endRecording error:', e);
      dispatch({ type: 'SET_STATUS', id, status: 'error' });
    }
  };

  const getMessagesForScene = useCallback((sceneId: string): Message[] => {
    const messageIds = state.orderByScene[sceneId] ?? [];
    const messages = messageIds.map(id => state.messagesById[id]);
    return messages;
  }, [state]);

  const startConversion = (playerMessageId: string, npcMessageId: string) => {
    dispatch({ type: 'START_CONVERSION', playerMessageId, npcMessageId });
  };

  const completeConversion = (playerMessageId: string, npcMessageId: string) => {
    dispatch({ type: 'COMPLETE_CONVERSION', playerMessageId, npcMessageId });
  };

  const getPendingConversions = useCallback((): ConversationTurn[] => {
    return state.conversationTurns;
  }, [state.conversationTurns]);

  return {
    state,
    beginRecording,
    updateRecording,
    endRecording,
    getMessagesForScene,
    startConversion,
    completeConversion,
    getPendingConversions
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