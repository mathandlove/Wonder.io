import { useDialogue } from "../../dialogue/DialogueContext";
import { useNavigation } from "../../context/NavigationContext";
import type { Message } from "../../dialogue/types";
import "./BubbleOrchestrator.css";

interface BubbleOrchestratorProps {
  className?: string;
}

export default function BubbleOrchestrator({ className }: BubbleOrchestratorProps) {
  const { getMessagesForScene } = useDialogue();
  const { visibleScenes, currentIndex } = useNavigation();

  const currentSceneId = visibleScenes[currentIndex]?.sceneId || 'default';
  const messages = getMessagesForScene(currentSceneId);

  return (
    <div className={`bubble-orchestrator ${className || ''}`}>
      <div className="messages-container">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const bubbleClass = `message-bubble ${message.sender} ${message.status}`;

  return (
    <div className={bubbleClass}>
      <div className="message-content">
        {message.isInterim && <span className="interim-indicator">...</span>}
        <span className="message-text">{message.text || (message.status === 'recording' ? 'Listening...' : '')}</span>
      </div>
      {message.status === 'error' && (
        <div className="message-error">Failed to send</div>
      )}
      {message.status === 'pending' && (
        <div className="message-pending">Sending...</div>
      )}
    </div>
  );
}