import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundMuted, setSoundMuted } from '../../utils/soundEffects';

export const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());

  const handleToggle = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
      title={muted ? 'Ativar Efeitos Sonoros' : 'Desativar Efeitos Sonoros'}
      aria-label={muted ? 'Ativar Som' : 'Desativar Som'}
    >
      {muted ? (
        <>
          <VolumeX className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Som: Off</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Som: On</span>
        </>
      )}
    </button>
  );
};
