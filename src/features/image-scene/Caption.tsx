import "./Caption.css";

type CaptionProps = {
  text: string;
  align?: "center" | "bottom";
};

export default function Caption({ text, align = 'bottom' }: CaptionProps) {
  return (
    <div
      className={`caption caption--animate-in ${align === 'center' ? 'caption--center' : ''}`}
    >
      <p className="caption__text">{text}</p>
    </div>
  );
}
