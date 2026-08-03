import React from 'react';
import { X, CheckCheck, Eye, ShieldCheck } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';

interface ReadReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  readers?: Array<{
    id: number;
    nickname: string;
    photo_url?: string | null;
    is_mentor?: boolean;
    read_at?: string;
  }>;
}

export const ReadReceiptsModal: React.FC<ReadReceiptsModalProps> = ({
  isOpen,
  onClose,
  readers = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-[#1f2c34] p-3.5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-bold text-sm">
              Visualizado por ({readers.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reader List */}
        <div className="p-3 overflow-y-auto space-y-2 text-slate-200 divide-y divide-slate-800/60">
          {readers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Eye className="w-8 h-8 text-slate-600" />
              <span>Mensagem enviada. Aguardando leitura dos membros.</span>
            </div>
          ) : (
            readers.map((r, i) => (
              <div key={r.id || i} className="pt-2 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {r.photo_url ? (
                    <img
                      src={resolveChatMediaUrl(r.photo_url)}
                      alt={r.nickname}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(r.nickname)} flex items-center justify-center font-bold text-xs text-white`}>
                      {getNicknameInitials(r.nickname)}
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {r.nickname}
                      {r.is_mentor && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                          👑 Mentor
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-emerald-400/90 block">
                      Visualizado ✓✓
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
