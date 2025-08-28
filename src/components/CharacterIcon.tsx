import React from 'react';

interface CharacterIconProps {
  id: string;
  x: number;
  y: number;
  name: string;
  description: string;
  emoji?: string;
  onClick?: () => void;
}

const CharacterIcon: React.FC<CharacterIconProps> = ({
  id,
  x,
  y,
  name,
  description,
  emoji = '👤',
  onClick
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
    }
  };

  return (
    <button
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        w-12 h-12 bg-white rounded-full shadow-lg
        flex items-center justify-center text-2xl
        transition-all duration-200
        hover:scale-110 hover:shadow-xl hover:ring-4 hover:ring-purple-400 hover:ring-opacity-60
        focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-80 focus:scale-110
        cursor-pointer z-20
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
      onClick={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      aria-label={`Character: ${name}`}
      aria-describedby={`character-desc-${id}`}
      role="button"
      tabIndex={0}
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="sr-only">{name}</span>
      <div 
        id={`character-desc-${id}`} 
        className="sr-only"
      >
        {description}
      </div>
    </button>
  );
};

export default CharacterIcon;