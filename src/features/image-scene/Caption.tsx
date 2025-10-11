import "./Caption.css";

type CaptionProps = {
  text: string;
  isActive: boolean; // driven by scene manager enter/leave
  direction: 'forward' | 'backward";
  align?: "center" | "bottom";
};

export default function Caption({ text, isActive, direction }: CaptionProps) {




  // Determine animation class based on phase and direction
  /*
  let animationClass = direction === 'backward' ? "caption--pre-reverse" : "caption--pre";
  if (phase === 'leaving') {
    animationClass = direction === 'backward' ? "caption--animate-out-reverse" : "caption--animate-out";
  } else if (phase === 'entering') {
    animationClass = "caption--animate-in";
  }
    */

  return (
    <div
      className={[
        "caption",
      ].join(" ")}
      style={{
        border: '3px solid blue', // Debug border
        zIndex: 9999, // Force on top
        display: 'block' // Force display
      }}
      aria-hidden={false}
    >
      <div className="caption__paper">
        <p className="caption__text" style={{ color: 'red', fontSize: '24px' }}>{text}</p>
      </div>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        background: 'green',
        color: 'white',
        padding: '10px',
        zIndex: 10000
      }}>
        DEBUG: isActive={isActive ? 'YES' : 'NO'}
      </div>
    </div>
  );
}