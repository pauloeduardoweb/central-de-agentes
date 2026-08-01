import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Laptop,
  Globe,
  ShieldAlert,
  UserCheck,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  LogOut,
  Ban,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Info
} from 'lucide-react';

interface TimelineEvent {
  id: number;
  codigo: string;
  maskedKey: string;
  sessionId?: string | number | null;
  eventType: 'LOGIN' | 'LOGOUT' | 'HEARTBEAT' | 'CATEGORY_CHANGE' | 'MENTOR_DISCONNECT' | 'SUSPEND' | 'BAN' | 'REACTIVATE';
  page?: string | null;
  device?: string | null;
  ip?: string | null;
  details?: string | null;
  createdAt: string;
}

interface StudentDetail {
  username: string;
  maskedKey: string;
  device: string;
  maskedIp: string;
  sessionId?: string | number | null;
  tempoOnlineFormatted?: string;
  currentPage?: string;
  status?: string;
  accessStatus?: string;
  codigo?: string;
  _fullCode?: string;
}

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentDetail | null;
  studentCode: string; // mentor access code for auth
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({
  isOpen,
  onClose,
  student,
  studentCode,
}) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const targetIdOrCode = student._fullCode || student.codigo || student.maskedKey;
        const res = await fetch(`/api/admin/student-history/${encodeURIComponent(targetIdOrCode)}`, {
          headers: {
            'x-access-code': studentCode,
            'x-student-access-code': studentCode,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.history)) {
            setTimeline(data.history);
          }
        }
      } catch (err) {
        console.warn('[SessionDrawer Fetch History Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, student, studentCode]);

  if (!isOpen || !student) return null;

  const getEventBadge = (eventType: TimelineEvent['eventType'], page?: string | null) => {
    switch (eventType) {
      case 'LOGIN':
        return { label: 'Entrou', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: UserCheck };
      case 'LOGOUT':
        return { label: 'Saiu', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40', icon: LogOut };
      case 'CATEGORY_CHANGE':
        return { label: page || 'Navegou', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Layers };
      case 'MENTOR_DISCONNECT':
        return { label: 'Encerrado pelo Mentor', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: ShieldAlert };
      case 'SUSPEND':
        return { label: 'Suspenso', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: PauseCircle };
      case 'BAN':
        return { label: 'Banido', color: 'bg-red-950/60 text-red-300 border-red-800/60', icon: Ban };
      case 'REACTIVATE':
        return { label: 'Reativado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: PlayCircle };
      default:
        return { label: 'Atividade', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40', icon: Activity };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div
        className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out"
        id="session-drawer-panel"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white">{student.username}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                {student.maskedKey}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400 inline" />
              <span>Histórico Completo do Aluno</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            id="session-drawer-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-1 flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-amber-400" /> Dispositivo
            </span>
            <span className="text-zinc-200 font-medium">{student.device || 'Não identificado'}</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> IP Registrado
            </span>
            <span className="text-zinc-200 font-mono">{student.maskedIp || 'Oculto'}</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Tempo Online
            </span>
            <span className="text-emerald-400 font-semibold">{student.tempoOnlineFormatted || '0 s'}</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> Página Atual
            </span>
            <span className="text-purple-300 font-medium">{student.currentPage || 'TikTok 2K'}</span>
          </div>
        </div>

        {/* Timeline Header */}
        <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Linha do Tempo
          </span>
          <span className="text-[11px] text-zinc-500">Ordem Cronológica</span>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Carregando histórico do aluno...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Info className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">Nenhum evento registrado ainda para este aluno.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6">
              {timeline.map((item, idx) => {
                const badge = getEventBadge(item.eventType, item.page);
                const IconComp = badge.icon;

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[31px] top-1 p-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 group-hover:border-amber-400 group-hover:text-amber-400 transition-colors">
                      <IconComp className="w-3 h-3" />
                    </div>

                    {/* Timeline Item Content */}
                    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 hover:border-zinc-700 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1.5 ${badge.color}`}>
                          <IconComp className="w-3 h-3" />
                          {badge.label}
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-mono text-zinc-300 block">{formatTime(item.createdAt)}</span>
                          <span className="text-[10px] text-zinc-500 font-mono block">{formatDate(item.createdAt)}</span>
                        </div>
                      </div>

                      {item.page && item.eventType === 'CATEGORY_CHANGE' && (
                        <p className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-amber-400 inline" /> Navegou para <span className="text-amber-300 font-bold">{item.page}</span>
                        </p>
                      )}

                      {item.details && (
                        <p className="text-xs text-zinc-400 bg-zinc-900/60 p-2 rounded border border-zinc-800/60">
                          {item.details}
                        </p>
                      )}

                      {item.device && (
                        <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-800/40">
                          <span>{item.device}</span>
                          <span>IP: {item.ip || 'Oculto'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
