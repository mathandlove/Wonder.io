

function TypingDots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: 40, textAlign: "left" }}>
      <span>•</span><span style={{ opacity: 0.6 }}>•</span><span style={{ opacity: 0.3 }}>•</span>
    </span>
  );
}

export function WaitingBubble() {

  return (

      <div
        style={{
          background: "rgba(255,255,255,0.98)",
          padding: "24px 28px",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          border: "2px solid #e0e0e0",
          maxWidth: 520,
          lineHeight: 1.35,
          fontSize: "1.125rem",
        }}
      >
        <TypingDots />
      </div>

  );
}