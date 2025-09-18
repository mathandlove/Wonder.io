
import { motion } from "framer-motion";

type WaitingBubbleProps = {
  layoutId?: string;
  variant?: "peek" | "full";
  text?: string;
  isTyping?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

function TypingDots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: 40, textAlign: "left" }}>
      <span>•</span><span style={{ opacity: 0.6 }}>•</span><span style={{ opacity: 0.3 }}>•</span>
    </span>
  );
}

export function WaitingBubble({
  layoutId = "waitingBubble",
  variant = "full",
  text,
  isTyping = true,
  className,
  style,
}: WaitingBubbleProps) {
  const isPeek = variant === "peek";

  return (
    <motion.div
      layoutId={layoutId}
      layout
      // Do not set an initial mount pose so we get a continuous layout animation
      initial={false}
      animate={{
        scale: isPeek ? 0.95 : 1,
        y: isPeek ? 12 : 0,
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }}
      style={{ pointerEvents: "auto", ...style }}
      className={className}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.98)",
          padding: isPeek ? "16px 20px" : "24px 28px",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          border: "2px solid #e0e0e0",
          maxWidth: 520,
          lineHeight: 1.35,
          fontSize: isPeek ? "1rem" : "1.125rem",
        }}
      >
        {text ? <p style={{ margin: 0 }}>{text}</p> : isTyping ? <TypingDots /> : null}
      </div>
    </motion.div>
  );
}