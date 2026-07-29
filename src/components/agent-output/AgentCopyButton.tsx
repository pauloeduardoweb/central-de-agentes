import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AgentCopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export const AgentCopyButton: React.FC<AgentCopyButtonProps> = ({
  textToCopy,
  label = 'Copiar',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1.5 transition-all active:scale-95 ${className}`}
      title="Copiar para área de transferência"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-emerald-300 font-extrabold">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
