import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useNavigation } from "./NavigationContext";

type DialogueState = {
  isWaitingPending: boolean;
  assistantText: string;
  turnId: number;
  hasAdvancedForTurn: boolean;
};

type DialogueContextType = DialogueState & {
  startAssistantRequest: (prompt: string) => void;
  resetForNewTurn: () => void;
  arriveAtWaiting: () => void;
};

const DialogueContext = createContext<DialogueContextType | null>(null);

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const [isWaitingPending, setIsWaitingPending] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [turnId, setTurnId] = useState(0);
  const [hasAdvancedForTurn, setHasAdvancedForTurn] = useState(false);
  const { goToNext } = useNavigation();


  // Reset function for starting a new turn
  const resetForNewTurn = useCallback(() => {
    setIsWaitingPending(true);
    setAssistantText("");
    setTurnId(prev => prev + 1);
    setHasAdvancedForTurn(false);
  }, []);

  // Function called by WaitingScene when it becomes active
  const arriveAtWaiting = useCallback(() => {
    setIsWaitingPending(false);
  }, []);

  // Auto-advance to next scene when assistant message arrives (only once per turn)
  useEffect(() => {
    if (assistantText && !hasAdvancedForTurn) {
       setHasAdvancedForTurn(true);
      goToNext();
     }
   }, [assistantText, hasAdvancedForTurn, turnId, goToNext]);

  // Debug key controls:
  // - 'm' => simulate message arrival with fixed text
  // - 'w' => return to waiting state
  // - 'r' => reset for new turn
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        setAssistantText("The Cookies they are found");
        // Keep isWaitingPending true - let WaitingScene clear it via arriveAtWaiting()
      } else if (e.key === "w" || e.key === "W") {
        setAssistantText("");
        setIsWaitingPending(true);
      } else if (e.key === "r" || e.key === "R") {
        resetForNewTurn();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [turnId, resetForNewTurn]);

  const startAssistantRequest = useCallback(async (prompt: string) => {
    resetForNewTurn();

    // Example: call your /api/assistant endpoint
    const res = await fetch("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ prompt }),
      headers: { "Content-Type": "application/json" },
    });

    const text = await res.text();
    setAssistantText(text);
    // Keep isWaitingPending true - let WaitingScene clear it via arriveAtWaiting()
    // Auto-advance will trigger via useEffect when assistantText is set
  }, [resetForNewTurn]);

  return (
    <DialogueContext.Provider value={{
      isWaitingPending,
      assistantText,
      turnId,
      hasAdvancedForTurn,
      startAssistantRequest,
      resetForNewTurn,
      arriveAtWaiting
    }}>
      {children}
    </DialogueContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogue() {
  const ctx = useContext(DialogueContext);
  if (!ctx) throw new Error("useDialogue must be used within DialogueProvider");
  return ctx;
}