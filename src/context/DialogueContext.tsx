import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type DialogueState = {
  isWaitingPending: boolean;
  assistantText: string;
  userText: string;
  turnId: number;
  hasAdvancedForTurn: boolean;
};

type DialogueContextType = DialogueState & {
  startAssistantRequest: (prompt: string) => void;
  submitUserMessage: (message: string) => void;
  resetForNewTurn: () => void;
  arriveAtWaiting: () => void;
};

const DialogueContext = createContext<DialogueContextType | null>(null);

export function DialogueProvider({ children }: { children: React.ReactNode }) {
  const [isWaitingPending, setIsWaitingPending] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [userText, setUserText] = useState("");
  const [turnId, setTurnId] = useState(0);
  const [hasAdvancedForTurn, setHasAdvancedForTurn] = useState(false);


  // Reset function for starting a new turn
  const resetForNewTurn = useCallback(() => {
    setIsWaitingPending(true);
    setAssistantText("");
    setUserText("");
    setTurnId(prev => prev + 1);
    setHasAdvancedForTurn(false);
  }, []);

  // Function called by WaitingScene when it becomes active
  const arriveAtWaiting = useCallback(() => {
    setIsWaitingPending(false);
  }, []);


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

  const submitUserMessage = useCallback((message: string) => {
    console.log(`[DialogueContext] User message submitted: "${message}"`);

    // Clear any previous assistant text first
    setAssistantText("");

    // Set user text which will trigger PageFactory to create left-speaker scene
    setUserText(message);

    // Simulate AI processing after user scene is created
    setTimeout(() => {
      console.log(`[DialogueContext] Simulating AI request for: "${message}"`);
      setIsWaitingPending(true);

      // Simulate AI response after delay
      setTimeout(() => {
        const aiResponse = `AI response to: "${message}"`;
        console.log(`[DialogueContext] Setting AI response: "${aiResponse}"`);
        setAssistantText(aiResponse);
        setIsWaitingPending(false);
      }, 500);
    }, 200);
  }, []);

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
      userText,
      turnId,
      hasAdvancedForTurn,
      startAssistantRequest,
      submitUserMessage,
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