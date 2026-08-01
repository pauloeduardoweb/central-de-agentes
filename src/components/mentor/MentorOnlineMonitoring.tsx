import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  UserCheck,
  TrendingUp,
  Clock,
  RefreshCw,
  Search,
  Monitor,
  Smartphone,
  WifiOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  LogOut,
  Ban,
  PauseCircle,
  PlayCircle,
  History,
  X,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

interface OnlineUser {
  accessKeyId?: number;
  sessionRecordId?: number;
  id?: number;
  username: string;
  avatar: string | null;
  maskedKey: string;
  status: 'Online' | 'Ausente' | 'Offline';
  accessStatus?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  currentPage: string;
  deviceType: string;
  operatingSystem: string;
  browserName: string;
  device: string;
  maskedIp: string;
  loginAt: string;
  lastActivity: string;
  connectedTime: string;
  disconnectSource?: string;
  disconnectedAt?: string;
  hasActiveSession?: boolean;
}

interface MemberStats {
  onlineNow: number;
  totalMembers: number;
  accessesToday: number;
  peakSimultaneous: number;
  absentSessions: number;
  updatedAt: string;
}

interface HistoryEntry {
  id: number;
  targetMaskedKey: string;
  actionType: string;
  reason: string;
  adminIdentifier: string;
  ipAddress: string;
  createdAt: string;
}

interface MentorOnlineMonitoringProps {
  studentCode: string;
}

export const MentorOnlineMonitoring: React.FC<MentorOnlineMonitoringProps> = ({ studentCode }) => {
  const [stats, setStats] = useState<MemberStats>({
    onlineNow: 0,
    totalMembers: 200,
    accessesToday: 0,
    peakSimultaneous: 0,
    absentSessions: 0,
    updatedAt: new Date().toLocaleTimeString('pt-BR'),
  });

  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'todos' | 'online' | 'ausente' | 'offline' | 'desconectados' | 'suspensos' | 'banidos'>('ativos');

  const getDisconnectSourceLabel = (src?: string) => {
    if (src === 'MENTOR_SINGLE') return 'Mentor — sessão individual';
    if (src === 'MENTOR_ALL') return 'Mentor — desconexão global';
    if (src === 'STUDENT_LOGOUT') return 'Aluno — botão Sair';
    return 'Mentor — sessão individual';
  };

  // Administrative Modal States
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [activeModal, setActiveModal] = useState<'disconnect' | 'suspend' | 'ban' | 'reactivate' | 'history' | null>(null);
  const [actionReason, setActionReason] = useState<string>('Vazamento ou revenda não autorizada de acesso');
  const [customReason, setCustomReason] = useState<string>('');
  const [showBanConfirm, setShowBanConfirm] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // History Modal States
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Disconnect All Modal States
  const [showDisconnectAllModal, setShowDisconnectAllModal] = useState<boolean>(false);
  const [disconnectAllLoading, setDisconnectAllLoading] = useState<boolean>(false);
  const [disconnectAllError, setDisconnectAllError] = useState<string | null>(null);
  const [disconnectAllSuccessMsg, setDisconnectAllSuccessMsg] = useState<string | null>(null);
  const [backendActiveSessionsCount, setBackendActiveSessionsCount] = useState<number | null>(null);
  const [noSessionsNotification, setNoSessionsNotification] = useState<string | null>(null);

  const getActiveValidSessionsCount = () => {
    if (typeof backendActiveSessionsCount === 'number') {
      return backendActiveSessionsCount;
    }
    return users.filter((u: any) => Boolean(u.hasActiveSession)).length;
  };

  const handleOpenDisconnectAll = () => {
    setNoSessionsNotification(null);
    const activeCount = getActiveValidSessionsCount();

    if (activeCount <= 0) {
      setNoSessionsNotification('Nenhuma sessão ativa encontrada.');
      setTimeout(() => {
        setNoSessionsNotification((prev) => (prev === 'Nenhuma sessão ativa encontrada.' ? null : prev));
      }, 4000);
      return;
    }

    setDisconnectAllError(null);
    setDisconnectAllSuccessMsg(null);
    setShowDisconnectAllModal(true);
  };

  const executeDisconnectAll = async () => {
    if (disconnectAllLoading) return;

    setDisconnectAllLoading(true);
    setDisconnectAllError(null);
    setDisconnectAllSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/users/disconnect-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
        },
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Não foi possível encerrar todas as sessões. Tente novamente.');
      }

      if (!data) {
        throw new Error('Não foi possível processar a resposta do servidor. Tente novamente.');
      }

      const count = data.disconnectedCount ?? data.count ?? 0;
      const successText = count === 1
        ? '✅ 1 sessão desconectada com sucesso.'
        : `✅ ${count} sessões desconectadas com sucesso.`;

      setDisconnectAllSuccessMsg(successText);

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.hasActiveSession || u.status === 'Online' || u.status === 'Ausente') {
            return {
              ...u,
              status: 'Offline',
              presenceStatus: 'Offline',
              hasActiveSession: false,
              disconnectSource: 'MENTOR_ALL',
              disconnectedAt: new Date().toISOString(),
            };
          }
          return u;
        })
      );

      setTimeout(() => {
        setShowDisconnectAllModal(false);
        setDisconnectAllSuccessMsg(null);
        fetchData(true);
      }, 1500);
    } catch (err: any) {
      setDisconnectAllError(err.message || 'Não foi possível encerrar todas as sessões. Tente novamente.');
    } finally {
      setDisconnectAllLoading(false);
    }
  };

  const fetchData = async (isManualRefresh = false, searchOverride?: string) => {
    if (isManualRefresh) setRefreshing(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-access-code': studentCode,
        'x-student-access-code': studentCode,
      };

      const termToUse = searchOverride !== undefined ? searchOverride : searchTerm;
      const searchParam = termToUse.trim() ? `?search=${encodeURIComponent(termToUse.trim())}` : '';

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/member-stats', { headers }),
        fetch(`/api/admin/online-users${searchParam}`, { headers }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          onlineNow: statsData.onlineNow ?? 0,
          totalMembers: statsData.totalMembers ?? 200,
          accessesToday: statsData.accessesToday ?? 0,
          peakSimultaneous: statsData.peakSimultaneous ?? 0,
          absentSessions: statsData.absentSessions ?? 0,
          updatedAt: new Date().toLocaleTimeString('pt-BR'),
        });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData.users)) {
          setUsers(usersData.users);
        }
        if (typeof usersData.activeSessionsCount === 'number') {
          setBackendActiveSessionsCount(usersData.activeSessionsCount);
        }
      }

      setLastUpdatedTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.warn('[Mentor Monitoring Fetch Error]:', err);
      setErrorMsg('Servidor indisponível no momento. Exibindo última leitura gravada.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [studentCode, searchTerm]);

  const openActionModal = (user: OnlineUser, modalType: 'disconnect' | 'suspend' | 'ban' | 'reactivate' | 'history') => {
    setSelectedUser(user);
    setActiveModal(modalType);
    setActionReason('Vazamento ou revenda não autorizada de acesso');
    setCustomReason('');
    setShowBanConfirm(false);
    setActionError(null);
    setActionSuccessMsg(null);

    if (modalType === 'history') {
      fetchUserHistory(user);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setShowBanConfirm(false);
    setActionError(null);
    setActionSuccessMsg(null);
  };

  const fetchUserHistory = async (userParam?: OnlineUser) => {
    const userToUse = userParam || selectedUser;
    if (!userToUse) return;

    setHistoryLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-access-code': studentCode,
      };
      const targetId = userToUse.accessKeyId || userToUse.id || encodeURIComponent(userToUse.maskedKey);
      const res = await fetch(`/api/admin/access-keys/${targetId}/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      } else {
        setHistoryList([]);
      }
    } catch (err) {
      console.error('[Fetch History Error]:', err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const executeDisconnect = async () => {
    if (!selectedUser || actionLoading) return;
    setActionLoading(true);
    setActionError(null);

    const targetId = selectedUser.sessionRecordId || selectedUser.accessKeyId || selectedUser.id || encodeURIComponent(selectedUser.maskedKey);

    try {
      const res = await fetch(`/api/admin/users/${targetId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: selectedUser.accessKeyId,
          sessionRecordId: selectedUser.sessionRecordId,
          targetCode: selectedUser.maskedKey,
          reason: 'Desconexão manual solicitada pelo Mentor',
        }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || 'Erro ao desconectar sessão.');
      }

      // Optimistically update local user line immediately
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (
            (selectedUser.sessionRecordId && u.sessionRecordId === selectedUser.sessionRecordId) ||
            u.maskedKey === selectedUser.maskedKey
          ) {
            return {
              ...u,
              status: 'Offline',
              presenceStatus: 'Offline',
              hasActiveSession: false,
              disconnectSource: 'MENTOR_SINGLE',
              disconnectedAt: new Date().toISOString(),
            };
          }
          return u;
        })
      );

      setActionSuccessMsg('✅ 1 sessão desconectada com sucesso.');
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 300);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeSuspend = async () => {
    if (!selectedUser || actionLoading) return;
    setActionLoading(true);
    setActionError(null);

    const finalReason = actionReason === 'Outro motivo' && customReason.trim()
      ? customReason.trim()
      : actionReason;

    const targetId = selectedUser.accessKeyId || selectedUser.id || encodeURIComponent(selectedUser.maskedKey);

    try {
      const res = await fetch(`/api/admin/access-keys/${targetId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: selectedUser.accessKeyId,
          sessionRecordId: selectedUser.sessionRecordId,
          targetCode: selectedUser.maskedKey,
          reason: finalReason,
        }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || 'Erro ao suspender chave.');
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.maskedKey === selectedUser.maskedKey) {
            return {
              ...u,
              accessStatus: 'SUSPENDED',
              status: 'Offline',
              presenceStatus: 'Offline',
              hasActiveSession: false,
            };
          }
          return u;
        })
      );

      setActionSuccessMsg('Chave suspensa com sucesso!');
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 300);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeBan = async () => {
    if (!selectedUser || actionLoading) return;

    const finalReason = actionReason === 'Outro motivo' && customReason.trim()
      ? customReason.trim()
      : actionReason;

    if (!finalReason.trim()) {
      setActionError('Por favor, especifique o motivo do banimento.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const targetId = selectedUser.accessKeyId || selectedUser.id || encodeURIComponent(selectedUser.maskedKey);

    try {
      const res = await fetch(`/api/admin/access-keys/${targetId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: selectedUser.accessKeyId,
          sessionRecordId: selectedUser.sessionRecordId,
          targetCode: selectedUser.maskedKey,
          reason: finalReason,
        }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || 'Erro ao banir chave.');
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.maskedKey === selectedUser.maskedKey) {
            return {
              ...u,
              accessStatus: 'BANNED',
              status: 'Offline',
              presenceStatus: 'Offline',
              hasActiveSession: false,
            };
          }
          return u;
        })
      );

      setActionSuccessMsg('Chave banida com sucesso!');
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 300);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeReactivate = async () => {
    if (!selectedUser || actionLoading) return;
    setActionLoading(true);
    setActionError(null);

    const targetId = selectedUser.accessKeyId || selectedUser.id || encodeURIComponent(selectedUser.maskedKey);

    try {
      const res = await fetch(`/api/admin/access-keys/${targetId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: selectedUser.accessKeyId,
          sessionRecordId: selectedUser.sessionRecordId,
          targetCode: selectedUser.maskedKey,
        }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || 'Erro ao reativar chave.');
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.maskedKey === selectedUser.maskedKey) {
            return {
              ...u,
              accessStatus: 'ACTIVE',
            };
          }
          return u;
        })
      );

      setActionSuccessMsg('Chave reativada com sucesso!');
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 300);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper predicate functions for strict mutual exclusion
  const isUserActive = (u: OnlineUser) => u.accessStatus !== 'SUSPENDED' && u.accessStatus !== 'BANNED';
  const isUserDesconectado = (u: OnlineUser) =>
    isUserActive(u) &&
    !u.hasActiveSession &&
    Boolean(u.disconnectedAt) &&
    Boolean(u.disconnectSource) &&
    ['MENTOR_SINGLE', 'MENTOR_ALL', 'STUDENT_LOGOUT'].includes(u.disconnectSource!);
  const isUserOnline = (u: OnlineUser) => isUserActive(u) && Boolean(u.hasActiveSession) && u.status === 'Online';
  const isUserAusente = (u: OnlineUser) => isUserActive(u) && Boolean(u.hasActiveSession) && u.status === 'Ausente';
  const isUserOffline = (u: OnlineUser) => isUserActive(u) && Boolean(u.hasActiveSession) && u.status === 'Offline';

  // Filter users list by status (search filtering is handled on backend)
  const filteredUsers = users.filter((u) => {
    const isSuspended = u.accessStatus === 'SUSPENDED';
    const isBanned = u.accessStatus === 'BANNED';

    if (statusFilter === 'ativos') return isUserOnline(u) || isUserAusente(u);
    if (statusFilter === 'todos') return isUserActive(u) && (Boolean(u.hasActiveSession) || isUserDesconectado(u));
    if (statusFilter === 'online') return isUserOnline(u);
    if (statusFilter === 'ausente') return isUserAusente(u);
    if (statusFilter === 'offline') return isUserOffline(u);
    if (statusFilter === 'desconectados') return isUserDesconectado(u);
    if (statusFilter === 'suspensos') return isSuspended;
    if (statusFilter === 'banidos') return isBanned;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#020d14]/90 p-4 rounded-2xl border border-cyan-500/20 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-lg font-black text-white tracking-tight">
              Monitoramento em Tempo Real
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Servidor Ativo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhamento ao vivo de sessões ativas, status de presença e ações de controle de chaves.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto flex-wrap justify-end gap-y-2">
          {lastUpdatedTime && (
            <span className="text-[11px] font-mono text-slate-400">
              Última atualização: <strong className="text-cyan-300">{lastUpdatedTime}</strong>
            </span>
          )}

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            title="Atualizar dados de conexões agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Atualizando...' : 'ATUALIZAR AGORA'}</span>
          </button>

          <button
            onClick={handleOpenDisconnectAll}
            disabled={disconnectAllLoading}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-400/50 text-xs font-bold flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            title="Encerrar todas as sessões ativas de alunos"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>🔄 Desconectar Todas as Sessões</span>
          </button>
        </div>
      </div>

      {noSessionsNotification && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between space-x-2 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{noSessionsNotification}</span>
          </div>
          <button onClick={() => setNoSessionsNotification(null)} className="text-amber-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 5 KPI Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Online Agora */}
        <div className="p-4 rounded-2xl bg-[#031d2e]/90 border border-cyan-400/40 shadow-lg shadow-cyan-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Online Agora</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.onlineNow}
            </span>
            <span className="text-[11px] text-emerald-400 ml-2 font-semibold">
              usuários conectados
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Atividade nos últimos 90s</p>
        </div>

        {/* Card 2: Total de Membros */}
        <div className="p-4 rounded-2xl bg-[#020d14]/80 border border-slate-800 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Total de Membros</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.totalMembers}
            </span>
            <span className="text-[11px] text-cyan-400 ml-2 font-semibold">
              licenças cadastradas
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Geração Z Pro (Alunos)</p>
        </div>

        {/* Card 3: Acessos Hoje */}
        <div className="p-4 rounded-2xl bg-[#020d14]/80 border border-slate-800 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Acessos Hoje</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.accessesToday}
            </span>
            <span className="text-[11px] text-indigo-300 ml-2 font-semibold">
              sessões iniciadas
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Desde 00:00h</p>
        </div>

        {/* Card 4: Pico Simultâneo */}
        <div className="p-4 rounded-2xl bg-[#020d14]/80 border border-slate-800 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Pico Simultâneo</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.peakSimultaneous}
            </span>
            <span className="text-[11px] text-purple-300 ml-2 font-semibold">
              máximo hoje
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Recorde de acessos</p>
        </div>

        {/* Card 5: Ausentes */}
        <div className="p-4 rounded-2xl bg-[#020d14]/80 border border-slate-800 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Sessões Ausentes</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.absentSessions}
            </span>
            <span className="text-[11px] text-amber-400 ml-2 font-semibold">
              ausentes
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sem interação entre 90s e 1h</p>
        </div>

      </div>

      {/* User Sessions Table & Filters */}
      <div className="p-5 rounded-2xl bg-[#020d14]/90 border border-cyan-500/20 space-y-4">
        
        {/* Search & Status Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuário, chave, página ou dispositivo..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex-wrap gap-y-1">
            <button
              onClick={() => setStatusFilter('ativos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'ativos'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ativos ({users.filter((u) => isUserOnline(u) || isUserAusente(u)).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({users.filter((u) => isUserActive(u) && (Boolean(u.hasActiveSession) || isUserDesconectado(u))).length})
            </button>

            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'online'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Online ({users.filter(isUserOnline).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('ausente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'ausente'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Ausente ({users.filter(isUserAusente).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'offline'
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Offline ({users.filter(isUserOffline).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('desconectados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'desconectados'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Desconectados ({users.filter(isUserDesconectado).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('suspensos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'suspensos'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Suspensos ({users.filter((u) => u.accessStatus === 'SUSPENDED').length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('banidos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'banidos'
                  ? 'bg-red-950 text-red-300 border border-red-500/50'
                  : 'text-slate-400 hover:text-red-300'
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-red-400" />
              <span>Banidos ({users.filter((u) => u.accessStatus === 'BANNED').length})</span>
            </button>
          </div>

        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Usuário / Aluno</th>
                <th className="py-3 px-4">Chave de Acesso</th>
                <th className="py-3 px-4">
                  {statusFilter === 'suspensos'
                    ? 'Motivo da Suspensão'
                    : statusFilter === 'banidos'
                    ? 'Motivo do Banimento'
                    : 'Status de Conexão'}
                </th>
                <th className="py-3 px-4">
                  {statusFilter === 'suspensos'
                    ? 'Data da Suspensão'
                    : statusFilter === 'banidos'
                    ? 'Data do Banimento'
                    : statusFilter === 'desconectados'
                    ? 'Data da Desconexão'
                    : 'Página Atual'}
                </th>
                <th className="py-3 px-4">Dispositivo</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4 text-center">
                  {statusFilter === 'desconectados' ? 'Desconectado Por / Ações' : 'Ações Administrativas'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                    <p className="text-xs font-medium">Carregando sessões ativas do servidor...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <WifiOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">Nenhuma sessão encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Nenhum registro nesta categoria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isSuspended = user.accessStatus === 'SUSPENDED';
                  const isBanned = user.accessStatus === 'BANNED';

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-cyan-950/20 transition-colors group ${
                        isBanned ? 'bg-red-950/10' : isSuspended ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Usuário / Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover border border-cyan-500/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-xs uppercase">
                              {user.username.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {user.username}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Conectado há: <span className="text-cyan-400 font-medium">{user.connectedTime}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Chave Mascarada */}
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300 text-[11px]">
                        <span className="px-2 py-1 rounded bg-slate-900 border border-cyan-500/20">
                          {user.maskedKey}
                        </span>
                      </td>

                      {/* Status / Motivo */}
                      <td className="py-3 px-4">
                        {statusFilter === 'suspensos' || isSuspended ? (
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/50 inline-flex items-center space-x-1.5">
                              <PauseCircle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>SUSPENSA</span>
                            </span>
                            {user.suspensionReason && (
                              <p className="text-[10px] text-amber-300/80 mt-1 max-w-[180px] truncate" title={user.suspensionReason}>
                                {user.suspensionReason}
                              </p>
                            )}
                          </div>
                        ) : statusFilter === 'banidos' || isBanned ? (
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-500/50 inline-flex items-center space-x-1.5">
                              <Ban className="w-3 h-3 text-red-400 shrink-0" />
                              <span>BANIDA</span>
                            </span>
                            {user.bannedReason && (
                              <p className="text-[10px] text-red-300/80 mt-1 max-w-[180px] truncate" title={user.bannedReason}>
                                {user.bannedReason}
                              </p>
                            )}
                          </div>
                        ) : statusFilter === 'desconectados' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40 inline-flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span>Desconectado</span>
                          </span>
                        ) : user.status === 'Online' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 inline-flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Online</span>
                          </span>
                        ) : user.status === 'Ausente' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Ausente</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700 inline-flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Página Atual / Data */}
                      <td className="py-3 px-4">
                        {statusFilter === 'suspensos' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 inline-block">
                            {user.suspendedAt ? new Date(user.suspendedAt).toLocaleString('pt-BR') : user.currentPage}
                          </span>
                        ) : statusFilter === 'banidos' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 inline-block">
                            {user.bannedAt ? new Date(user.bannedAt).toLocaleString('pt-BR') : '-'}
                          </span>
                        ) : statusFilter === 'desconectados' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 inline-block">
                            {user.disconnectedAt ? new Date(user.disconnectedAt).toLocaleString('pt-BR') : user.lastActivity ? new Date(user.lastActivity).toLocaleString('pt-BR') : '-'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 inline-block">
                            {user.currentPage}
                          </span>
                        )}
                      </td>

                      {/* Dispositivo & Navegador */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-300 text-xs">
                          {user.deviceType === 'Mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                          <span>{user.device}</span>
                        </div>
                      </td>

                      {/* Endereço IP Protegido */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>{user.maskedIp}</span>
                        </div>
                      </td>

                      {/* AÇÕES ADMINISTRATIVAS / DESCONECTADO POR */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1 sm:flex-row sm:space-y-0 sm:space-x-1.5">
                          {statusFilter === 'desconectados' && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-900 text-cyan-300 border border-cyan-500/30">
                              {getDisconnectSourceLabel(user.disconnectSource)}
                            </span>
                          )}

                          {/* Botão Desconectar (apenas para não suspensos / não banidos e não na aba desconectados) */}
                          {!isSuspended && !isBanned && statusFilter !== 'desconectados' && (
                            <button
                              onClick={() => openActionModal(user, 'disconnect')}
                              title="Desconectar sessão ativa imediatamente"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Suspender ou Reativar */}
                          {isSuspended || isBanned ? (
                            <button
                              onClick={() => openActionModal(user, 'reactivate')}
                              title="Reativar acesso da chave"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => openActionModal(user, 'suspend')}
                              title="Suspender chave temporariamente"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Banir */}
                          {!isBanned && (
                            <button
                              onClick={() => openActionModal(user, 'ban')}
                              title="Banir chave permanentemente"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Histórico */}
                          <button
                            onClick={() => openActionModal(user, 'history')}
                            title="Ver histórico de ações administrativas"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:scale-105 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ações administrativas auditadas e restritas à sessão MASTER do Mentor.</span>
          </div>
          <span>Exibindo {filteredUsers.length} de {users.length} sessões registradas</span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DESCONECTAR SESSÃO */}
      {/* ========================================================= */}
      {activeModal === 'disconnect' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-amber-950/50 space-y-5 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Desconectar Sessão Ativa</h3>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <p><strong>Aluno:</strong> {selectedUser.username}</p>
              <p><strong>Dispositivo:</strong> {selectedUser.device}</p>
              <p><strong>Página Atual:</strong> {selectedUser.currentPage}</p>
            </div>

            <p className="text-xs text-slate-400">
              Esta ação encerrará a sessão ativa do aluno imediatamente no servidor. Na próxima verificação periódica (heartbeat), a aplicação do aluno será redirecionada para a tela de login.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDisconnect}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoading ? 'Processando...' : 'DESCONECTAR AGORA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SUSPENDER CHAVE */}
      {/* ========================================================= */}
      {activeModal === 'suspend' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-amber-950/50 space-y-5 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <PauseCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Suspender Chave de Acesso</h3>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              O aluno será desconectado e não conseguirá mais autenticar enquanto a chave permanecer no status <strong>SUSPENSA</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Motivo da Suspensão:</label>
              <select
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Suspeita de compartilhamento de chave">Suspeita de compartilhamento de chave</option>
                <option value="Uso indevido dos recursos da plataforma">Uso indevido dos recursos da plataforma</option>
                <option value="Inadimplência ou renegociação financeira">Inadimplência ou renegociação financeira</option>
                <option value="Solicitação do próprio aluno">Solicitação do próprio aluno</option>
                <option value="Outro motivo">Outro motivo</option>
              </select>

              {actionReason === 'Outro motivo' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo da suspensão..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeSuspend}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoading ? 'Processando...' : 'CONFIRMAR SUSPENSÃO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: BANIR CHAVE */}
      {/* ========================================================= */}
      {activeModal === 'ban' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-red-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-red-950/60 space-y-5 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!showBanConfirm ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Banir Chave de Acesso</h3>
                    <p className="text-xs text-red-400 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">AÇÃO DE SEGURANÇA CRÍTICA</strong>
                    <span>Esta chave será permanentemente bloqueada. Todos os acessos serão interrompidos imediatamente.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Motivo do Banimento (Obrigatório):</label>
                  <select
                    value={actionReason}
                    onChange={(e) => {
                      setActionReason(e.target.value);
                      setActionError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Vazamento ou revenda não autorizada de acesso">Vazamento ou revenda não autorizada de acesso</option>
                    <option value="Tentativa de ataque ou engenharia reversa">Tentativa de ataque ou engenharia reversa</option>
                    <option value="Violação grave dos termos de uso">Violação grave dos termos de uso</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>

                  {actionReason === 'Outro motivo' && (
                    <textarea
                      value={customReason}
                      onChange={(e) => {
                        setCustomReason(e.target.value);
                        setActionError(null);
                      }}
                      placeholder="Descreva detalhadamente o motivo do banimento..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  )}
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const finalReason = actionReason === 'Outro motivo' ? customReason.trim() : actionReason;
                      if (!finalReason) {
                        setActionError('Por favor, descreva o motivo do banimento.');
                        return;
                      }
                      setActionError(null);
                      setShowBanConfirm(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2 font-mono uppercase tracking-wider"
                  >
                    <span>BANIR CHAVE DEFINITIVAMENTE</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Confirmar Banimento</h3>
                    <p className="text-xs text-red-400 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-3">
                  <p className="text-sm font-bold text-red-200">
                    Tem certeza que deseja banir permanentemente esta chave?
                  </p>
                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-lg border border-red-900/40 font-mono">
                    <p><span className="text-slate-400 font-semibold font-sans">Aluno/Usuário:</span> {selectedUser.username}</p>
                    <p><span className="text-slate-400 font-semibold font-sans">Chave Mascarada:</span> <span className="text-red-300 font-bold">{selectedUser.maskedKey}</span></p>
                    <p><span className="text-slate-400 font-semibold font-sans">Motivo:</span> {actionReason === 'Outro motivo' ? customReason : actionReason}</p>
                  </div>
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setShowBanConfirm(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeBan}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{actionLoading ? 'Processando...' : 'Confirmar Banimento'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: REATIVAR CHAVE */}
      {/* ========================================================= */}
      {activeModal === 'reactivate' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-emerald-950/50 space-y-5 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reativar Chave de Acesso</h3>
                <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Esta ação removerá o bloqueio da chave e permitirá que o aluno efetue login normalmente na plataforma.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeReactivate}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoading ? 'Processando...' : 'CONFIRMAR REATIVAÇÃO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: HISTÓRICO DE AÇÕES DE ACESSO */}
      {/* ========================================================= */}
      {activeModal === 'history' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-cyan-950/50 space-y-4 relative max-h-[85vh] flex flex-col">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Histórico da Chave</h3>
                <p className="text-xs text-cyan-300 font-mono font-bold">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {historyLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs">Consultando auditoria do servidor...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhuma ação administrativa registrada para esta chave até o momento.
                </div>
              ) : (
                historyList.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-[10px] px-2 py-0.5 rounded ${
                        entry.actionType === 'BAN'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : entry.actionType === 'SUSPEND'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : entry.actionType === 'REACTIVATE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {entry.actionType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-slate-200 font-medium pt-1">
                      <strong>Motivo:</strong> {entry.reason || 'Sem motivo especificado'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>Admin: {entry.adminIdentifier}</span>
                      <span>IP: {entry.ipAddress}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: DESCONECTAR TODAS AS SESSÕES */}
      {/* ========================================================= */}
      {showDisconnectAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#020d14] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-rose-950/50 space-y-5 relative">
            <button
              onClick={() => {
                if (!disconnectAllLoading) {
                  setShowDisconnectAllModal(false);
                  setDisconnectAllError(null);
                  setDisconnectAllSuccessMsg(null);
                }
              }}
              disabled={disconnectAllLoading}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Desconectar todas as sessões?</h3>
                <p className="text-xs text-rose-300 font-semibold mt-0.5">Ação Administrativa de Alto Impacto</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
              <p className="text-sm font-bold text-rose-200">
                ⚠️ Desconectar todas as sessões?
              </p>
              <p className="text-xs text-rose-100 font-bold">
                {getActiveValidSessionsCount()} {getActiveValidSessionsCount() === 1 ? 'sessão será encerrada.' : 'sessões serão encerradas.'}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Todos os alunos conectados precisarão realizar login novamente.
              </p>
            </div>

            {disconnectAllError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{disconnectAllError}</span>
              </div>
            )}

            {disconnectAllSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{disconnectAllSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  if (!disconnectAllLoading) {
                    setShowDisconnectAllModal(false);
                    setDisconnectAllError(null);
                    setDisconnectAllSuccessMsg(null);
                  }
                }}
                disabled={disconnectAllLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={executeDisconnectAll}
                disabled={disconnectAllLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {disconnectAllLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desconectando...</span>
                  </>
                ) : (
                  <span>Desconectar Todas</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
