import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, Sparkles, X, Edit2, ChevronDown, Maximize2 } from 'lucide-react';

export interface CommunityAnnouncement {
  id: number;
  content: string;
  created_by?: string;
  created_at?: string;
  badge?: string;
}

interface CommunityAnnouncementBarProps {
  announcement?: CommunityAnnouncement | null;
  isMentor?: boolean;
  onSaveAnnouncement?: (text: string, badge?: string) => void;
  onCloseAnnouncement?: () => void;
}

export const CommunityAnnouncementBar: React.FC<CommunityAnnouncementBarProps> = ({
  announcement,
  isMentor = false,
  onSaveAnnouncement,
  onCloseAnnouncement,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [inputText, setInputText] = useState(announcement?.content || '');
  const [selectedBadge, setSelectedBadge] = useState(announcement?.badge || '📢 AVISO');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !isMentor) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (onSaveAnnouncement) {
      onSaveAnnouncement(inputText.trim(), selectedBadge);
    }
    setIsEditing(false);
  };

  const contentText = announcement?.content || '🎉 Seja bem-vindo à Comunidade Geração Z Pro! Respeite as regras e interaja diariamente para ganhar XP.';

  return (
    <>
      <div className="h-[40px] max-h-[40px] bg-gradient-to-r from-amber-950/90 via-[#182229] to-cyan-950/90 border-b border-amber-500/30 px-3 flex items-center justify-between shadow-md text-xs relative z-20 transition-all overflow-hidden shrink-0">
        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-2 w-full h-full py-0.5">
            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="bg-[#111b21] border border-amber-500/40 rounded-lg px-2 py-0.5 text-amber-300 font-bold text-[11px] focus:outline-none shrink-0"
            >
              <option value="📢 AVISO">📢 AVISO</option>
              <option value="🎉 ATUALIZAÇÃO">🎉 ATUALIZAÇÃO</option>
              <option value="🚀 NOVO AGENTE">🚀 NOVO AGENTE</option>
              <option value="🔴 LIVE">🔴 LIVE</option>
              <option value="💡 DICA MENTOR">💡 DICA MENTOR</option>
            </select>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite o comunicado oficial para a comunidade..."
              className="flex-1 bg-[#111b21] border border-slate-700 rounded-lg px-2 py-0.5 text-white text-xs focus:border-cyan-400 focus:outline-none truncate"
              maxLength={180}
              autoFocus
            />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="submit"
                className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Publicar
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            <div
              onClick={() => setShowFullModal(true)}
              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {announcement?.badge || '📢 COMUNICADO MENTOR'}
              </span>

              <p className="truncate text-slate-200 font-medium text-xs">
                {contentText}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowFullModal(true)}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-1.5 text-[10px] font-bold"
                title="Expandir Comunicado"
              >
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Ver</span>
              </button>

              {isMentor && (
                <button
                  onClick={() => {
                    setInputText(announcement?.content || '');
                    setIsEditing(true);
                  }}
                  className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-1.5 text-[10px] font-bold"
                  title="Editar Alerta"
                >
                  <Edit2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              <button
                onClick={() => {
                  setDismissed(true);
                  if (onCloseAnnouncement) onCloseAnnouncement();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar alerta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expand Full Announcement Modal Portal */}
      {showFullModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowFullModal(false)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#182229] border border-amber-500/50 rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {announcement?.badge || '📢 COMUNICADO OFICIAL DO MENTOR'}
              </span>

              <button
                onClick={() => setShowFullModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap py-2">
              {contentText}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFullModal(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

