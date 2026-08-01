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
  Info,
  Compass,
  FileText,
  PieChart,
  CheckCircle2,
  Download
} from 'lucide-react';
import { NavigationMap, PathStep } from './NavigationMap';

interface TimelineEvent {
  id: number;
  codigo: string;
  maskedKey: string;
  sessionId?: string | number | null;
  eventType:
    | 'LOGIN'
    | 'LOGOUT'
    | 'HEARTBEAT'
    | 'CATEGORY_CHANGE'
    | 'PAGE_CHANGE'
    | 'MENTOR_DISCONNECT'
    | 'DISCONNECT_ALL'
    | 'SUSPEND'
    | 'BAN'
    | 'REACTIVATE';
  page?: string | null;
  category?: string | null;
  device?: string | null;
  browser?: string | null;
  ip?: string | null;
  details?: string | null;
  mentorResponsavel?: string | null;
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
  browserName?: string;
  operatingSystem?: string;
  category?: string;
  loginAt?: string;
  lastHeartbeatAt?: string;
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'HISTORY' | 'NAV_MAP'>('OVERVIEW');
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
        return { label: 'Login de Acesso', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: UserCheck };
      case 'LOGOUT':
        return { label: 'Logout Encerramento', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40', icon: LogOut };
      case 'CATEGORY_CHANGE':
      case 'PAGE_CHANGE':
        return { label: page || 'Troca de Página', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Layers };
      case 'MENTOR_DISCONNECT':
      case 'DISCONNECT_ALL':
        return { label: 'Encerrado pelo Mentor', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: ShieldAlert };
      case 'SUSPEND':
        return { label: 'Suspenso', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: PauseCircle };
      case 'BAN':
        return { label: 'Banido', color: 'bg-red-950/60 text-red-300 border-red-800/60', icon: Ban };
      case 'REACTIVATE':
        return { label: 'Reativado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: PlayCircle };
      default:
        return { label: 'Atividade Geral', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40', icon: Activity };
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '--/--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Convert timeline events into path steps for Navigation Map
  const pathSteps: PathStep[] = timeline.map((ev, idx) => ({
    id: ev.id || idx,
    page: ev.page || 'TikTok 2K',
    category: ev.category || ev.page || 'Geral',
    timestamp: ev.createdAt,
    eventType: ev.eventType,
    device: ev.device || undefined,
    ip: ev.ip || undefined,
  }));

  const handleExportCSV = () => {
    if (timeline.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Tipo Evento', 'Página', 'Categoria', 'Dispositivo', 'IP', 'Detalhes'];
    const rows = timeline.map((e) => [
      e.id,
      new Date(e.createdAt).toLocaleString('pt-BR'),
      e.eventType,
      e.page || '',
      e.category || '',
      e.device || '',
      e.ip || '',
      e.details || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_${student.maskedKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div
        className="w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        id="session-drawer-panel"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-white">{student.username}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                {student.maskedKey}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                  student.status === 'Online'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : student.status === 'Ausente'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {student.status || 'Offline'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400 inline" />
              <span>Painel de Auditoria e Diagnóstico em Tempo Real</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            id="session-drawer-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Tabs Bar */}
        <div className="px-6 bg-zinc-950 border-b border-zinc-800 flex space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-amber-400 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" /> Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'TIMELINE'
                ? 'border-amber-400 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-amber-400 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Histórico Tabela
          </button>
          <button
            onClick={() => setActiveTab('NAV_MAP')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'NAV_MAP'
                ? 'border-amber-400 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Mapa de Navegação
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. VISÃO GERAL (OVERVIEW) */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-amber-400" /> Dispositivo
                  </span>
                  <span className="text-zinc-200 font-semibold block truncate">{student.device || 'Não identificado'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400" /> IP Registrado
                  </span>
                  <span className="text-zinc-200 font-mono font-semibold block truncate">{student.maskedIp || 'Oculto'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Tempo Online
                  </span>
                  <span className="text-emerald-400 font-bold block">{student.tempoOnlineFormatted || '0 s'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" /> Página Atual
                  </span>
                  <span className="text-purple-300 font-semibold block truncate">{student.currentPage || 'TikTok 2K'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Login em
                  </span>
                  <span className="text-zinc-300 font-mono block">
                    {formatTime(student.loginAt)} ({formatDate(student.loginAt)})
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-amber-400" /> Licença
                  </span>
                  <span className="text-amber-400 font-semibold block">Vitalícia</span>
                </div>
              </div>

              {/* Stats Summary Box */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-zinc-400 border-b border-zinc-900 pb-2">
                  Métricas de Acesso & Auditoria
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Total Eventos</span>
                    <span className="text-sm font-bold text-white font-mono">{timeline.length}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Logins</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {timeline.filter((e) => e.eventType === 'LOGIN').length || 1}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Encerrados</span>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      {timeline.filter((e) => e.eventType === 'MENTOR_DISCONNECT' || e.eventType === 'DISCONNECT_ALL').length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Páginas Lidas</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">
                      {timeline.filter((e) => e.eventType === 'CATEGORY_CHANGE' || e.eventType === 'PAGE_CHANGE').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Carregando linha do tempo do aluno...</span>
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-xs">Nenhum evento recente registrado para este aluno.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6">
                  {timeline.map((item, idx) => {
                    const badge = getEventBadge(item.eventType, item.page);
                    const IconComp = badge.icon;

                    return (
                      <div key={item.id || idx} className="relative group">
                        <div className="absolute -left-[31px] top-1 p-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 group-hover:border-amber-400 group-hover:text-amber-400 transition-colors">
                          <IconComp className="w-3 h-3" />
                        </div>

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

                          {item.page && (item.eventType === 'CATEGORY_CHANGE' || item.eventType === 'PAGE_CHANGE') && (
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
          )}

          {/* 3. HISTÓRICO TABELA */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-zinc-400">Tabela Consolidada de Atividades</span>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-medium text-xs flex items-center gap-1.5 transition-colors border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Evento</th>
                      <th className="p-3">Página</th>
                      <th className="p-3">Dispositivo</th>
                      <th className="p-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {timeline.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-zinc-500">
                          Nenhum registro encontrado no histórico.
                        </td>
                      </tr>
                    ) : (
                      timeline.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="p-3 font-mono text-[11px]">
                            {formatDate(row.createdAt)} {formatTime(row.createdAt)}
                          </td>
                          <td className="p-3 font-semibold text-amber-300">{row.eventType}</td>
                          <td className="p-3">{row.page || '-'}</td>
                          <td className="p-3 text-zinc-400">{row.device || '-'}</td>
                          <td className="p-3 font-mono text-zinc-400">{row.ip || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. MAPA DE NAVEGAÇÃO */}
          {activeTab === 'NAV_MAP' && (
            <NavigationMap
              steps={pathSteps}
              studentName={student.username}
              maskedKey={student.maskedKey}
              isOnline={student.status === 'Online'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
