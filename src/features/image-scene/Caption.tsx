import "./Caption.css";

type CaptionProps = {
  text: string;
  isActive: boolean; // driven by scene manager enter/leave
  direction: 'forward' | 'backward';
  align?: "center" | "bottom";
};

export default function Caption({ text, isActive, direction, align = 'bottom' }: CaptionProps) {
  // Determine animation class based on isActive state
  const animationClass = isActive ? 'caption--animate-in' : 'caption--pre';

  // Debug logging
  console.log('Caption render:', { text, isActive, direction, animationClass });

  return (
    <div
      className={`caption ${animationClass} ${align === 'center' ? 'caption--center' : ''}`}
      aria-hidden={!isActive}
      style={{ border: '2px solid red' }} // Temporary debug border
    >
      <p className="caption__text">{text}</p>
      <div style={{ position: 'fixed', top: 10, right: 10, background: 'yellow', padding: '5px', zIndex: 99999 }}>
        Caption isActive: {isActive ? 'YES' : 'NO'}
      </div>
    </div>
  );
}
