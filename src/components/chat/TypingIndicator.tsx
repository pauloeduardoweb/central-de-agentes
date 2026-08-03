import React from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (!typingUsers || typingUsers.length === 0) return null;

  let label = '';
  if (typingUsers.length === 1) {
    label = `${typingUsers[0]} está digitando...`;
  } else if (typingUsers.length === 2) {
    label = `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`;
  } else {
    label = `${typingUsers[0]}, ${typingUsers[1]} e mais ${typingUsers.length - 2} estão digitando...`;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 rounded-full w-fit animate-fade-in my-1 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
      </div>
      <span className="font-medium tracking-tight">{label}</span>
    </div>
  );
};
