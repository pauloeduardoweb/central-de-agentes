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
  ChevronRight,
  Link2Off,
} from 'lucide-react';
import { SessionDrawer } from './SessionDrawer';
import { StatsCards } from './StatsCards';
import { Filters } from './Filters';

export interface OnlineUser {
  accessKeyId?: number;
  sessionRecordId?: number;
  id?: number;
  username: string;
  avatar: string | null;
  maskedKey: string;
  codigo?: string;
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
  tempoOnlineFormatted?: string;
  tempoOnlineSeconds?: number;
  lastActivityFormatted?: string;
  recentAction?: string;
  lastAction?: string;
  disconnectSource?: string;
  disconnectedAt?: string;
  hasActiveSession?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  bannedReason?: string;
  bannedAt?: string;
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

  const [richStats, setRichStats] = useState<{
    topCategories?: { name: string; count: number }[];
    devices?: { name: string; count: number; percentage: number }[];
    browsers?: { name: string; count: number }[];
    loginsToday?: { hour: string; count: number }[];
    longestSessions?: { name: string; codigo: string; tempoOnline: string; tempoOnlineSeconds: number; paginaAtual: string }[];
    shortestSessions?: { name: string; codigo: string; tempoOnline: string; tempoOnlineSeconds: number; paginaAtual: string }[];
    activityFeed?: any[];
  }>({});

  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'todos' | 'online' | 'ausente' | 'offline' | 'desconectados' | 'suspensos' | 'banidos'>('ativos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [deviceFilter, setDeviceFilter] = useState<string>('todos');
  const [browserFilter, setBrowserFilter] = useState<string>('todos');

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerStudent, setDrawerStudent] = useState<any | null>(null);

  // Administrative Modal States
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [activeModal, setActiveModal] = useState<'disconnect' | 'suspend' | 'ban' | 'reactivate' | 'history' | 'unlink' | null>(null);
  const [unlinkConfirmationInput, setUnlinkConfirmationInput] = useState<string>('');
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

  const getDisconnectSourceLabel = (src?: string) => {
    if (src === 'MENTOR_SINGLE') return 'Mentor — sessão individual';
    if (src === 'MENTOR_ALL') return 'Mentor — desconexão global';
    if (src === 'STUDENT_LOGOUT') return 'Aluno — botão Sair';
    return 'Mentor — sessão individual';
  };

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
      await fetchData(true);

      setTimeout(() => {
        setShowDisconnectAllModal(false);
        setDisconnectAllSuccessMsg(null);
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

        setRichStats({
          topCategories: statsData.topCategories || [],
          devices: statsData.devices || [],
          browsers: statsData.browsers || [],
          loginsToday: statsData.loginsToday || [],
          longestSessions: statsData.longestSessions || [],
          shortestSessions: statsData.shortestSessions || [],
          activityFeed: statsData.activityFeed || [],
          healthCheck: statsData.healthCheck,
          alerts: statsData.alerts || [],
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

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [studentCode, searchTerm]);

  const openActionModal = (e: React.MouseEvent, user: OnlineUser, modalType: 'disconnect' | 'suspend' | 'ban' | 'reactivate' | 'history' | 'unlink') => {
    e.stopPropagation(); // prevent opening drawer when clicking admin buttons
    setSelectedUser(user);
    setActiveModal(modalType);
    setActionReason('Vazamento ou revenda não autorizada de acesso');
    setCustomReason('');
    setShowBanConfirm(false);
    setUnlinkConfirmationInput('');
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
    setUnlinkConfirmationInput('');
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

      setActionSuccessMsg('✅ 1 sessão desconectada com sucesso.');
      await fetchData();
      setTimeout(() => {
        closeModal();
      }, 500);
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

  const executeUnlink = async () => {
    if (!selectedUser || actionLoading) return;

    setActionLoading(true);
    setActionError(null);

    const targetId = selectedUser.accessKeyId || selectedUser.id || encodeURIComponent(selectedUser.maskedKey);

    try {
      const res = await fetch(`/api/admin/access-keys/${targetId}/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: selectedUser.accessKeyId,
          sessionRecordId: selectedUser.sessionRecordId,
          targetCode: selectedUser.maskedKey,
          reason: 'Desvinculação manual solicitada pelo Mentor',
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
        throw new Error(data?.message || 'Erro ao desvincular chave.');
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.maskedKey === selectedUser.maskedKey) {
            return {
              ...u,
              username: undefined,
              usado: false,
              status: 'Offline',
              hasActiveSession: false,
              accessStatus: 'ACTIVE',
            };
          }
          return u;
        })
      );

      setActionSuccessMsg('Chave desvinculada com sucesso.');
      setTimeout(() => {
        closeModal();
        fetchData();
      }, 500);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Predicates
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

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const isSuspended = u.accessStatus === 'SUSPENDED';
    const isBanned = u.accessStatus === 'BANNED';

    let statusMatch = true;
    if (statusFilter === 'ativos') statusMatch = isUserOnline(u) || isUserAusente(u);
    else if (statusFilter === 'todos') statusMatch = isUserActive(u) && (Boolean(u.hasActiveSession) || isUserDesconectado(u));
    else if (statusFilter === 'online') statusMatch = isUserOnline(u);
    else if (statusFilter === 'ausente') statusMatch = isUserAusente(u);
    else if (statusFilter === 'offline') statusMatch = isUserOffline(u);
    else if (statusFilter === 'desconectados') statusMatch = isUserDesconectado(u);
    else if (statusFilter === 'suspensos') statusMatch = isSuspended;
    else if (statusFilter === 'banidos') statusMatch = isBanned;

    if (!statusMatch) return false;

    // Category Filter
    if (categoryFilter !== 'todas' && (u.currentPage || 'TikTok 2K') !== categoryFilter) {
      return false;
    }

    // Device Filter
    if (deviceFilter !== 'todos') {
      const os = (u.operatingSystem || u.device || '').toLowerCase();
      const dev = (u.deviceType || u.device || '').toLowerCase();
      if (deviceFilter === 'Windows' && !os.includes('win')) return false;
      if (deviceFilter === 'Android' && !os.includes('android') && !dev.includes('mobile')) return false;
      if (deviceFilter === 'iPhone' && !os.includes('ios') && !os.includes('iphone')) return false;
      if (deviceFilter === 'Mac' && !os.includes('mac')) return false;
      if (deviceFilter === 'Linux' && !os.includes('linux')) return false;
    }

    // Browser Filter
    if (browserFilter !== 'todos') {
      const br = (u.browserName || u.device || '').toLowerCase();
      if (browserFilter === 'Chrome' && !br.includes('chrome')) return false;
      if (browserFilter === 'Edge' && !br.includes('edge')) return false;
      if (browserFilter === 'Safari' && !br.includes('safari')) return false;
      if (browserFilter === 'Firefox' && !br.includes('firefox')) return false;
      if (browserFilter === 'Opera' && !br.includes('opera')) return false;
    }

    return true;
  });

  // Export Handlers
  const handleExportCSV = () => {
    const headers = ['Usuário', 'Chave', 'Status', 'Tempo Online', 'Última Atividade', 'Ação Recente', 'Página Atual', 'Dispositivo', 'IP'];
    const rows = filteredUsers.map(u => [
      u.username,
      u.maskedKey,
      u.status,
      u.connectedTime || u.tempoOnlineFormatted || '0s',
      u.lastActivity || u.lastActivityFormatted || 'Agora',
      u.recentAction || u.currentPage || 'Navegação',
      u.currentPage || 'TikTok 2K',
      u.device || 'Desconhecido',
      u.maskedIp || 'Oculto'
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monitoramento_alunos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headers = ['Usuário', 'Chave de Acesso', 'Status', 'Tempo Online', 'Última Atividade', 'Ação Recente', 'Página Atual', 'Dispositivo', 'IP'];
    const rows = filteredUsers.map(u => [
      u.username,
      u.maskedKey,
      u.status,
      u.connectedTime || u.tempoOnlineFormatted || '0s',
      u.lastActivity || u.lastActivityFormatted || 'Agora',
      u.recentAction || u.currentPage || 'Navegação',
      u.currentPage || 'TikTok 2K',
      u.device || 'Desconhecido',
      u.maskedIp || 'Oculto'
    ]);

    const csvContent = '\uFEFF' + [headers.join('\t'), ...rows.map(e => e.join('\t'))].join('\n');
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monitoramento_alunos_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Monitoramento - Mentor Geração Z Pro</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 4px; color: #000; }
            p { font-size: 12px; color: #555; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background-color: #f4f4f5; font-weight: 700; text-transform: uppercase; }
            tr:nth-child(even) { background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Geração Z Pro — Painel de Monitoramento 2.0</h1>
          <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')} | Total de alunos listados: ${filteredUsers.length}</p>
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Chave</th>
                <th>Status</th>
                <th>Tempo Online</th>
                <th>Última Atividade</th>
                <th>Página Atual</th>
                <th>Dispositivo</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.map(u => `
                <tr>
                  <td><strong>${u.username}</strong></td>
                  <td>${u.maskedKey}</td>
                  <td>${u.status}</td>
                  <td>${u.connectedTime || u.tempoOnlineFormatted || '0s'}</td>
                  <td>${u.lastActivity || u.lastActivityFormatted || 'Agora'}</td>
                  <td>${u.currentPage || 'TikTok 2K'}</td>
                  <td>${u.device || 'Desconhecido'}</td>
                  <td>${u.maskedIp || 'Oculto'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const openStudentDrawer = (user: OnlineUser) => {
    setDrawerStudent({
      username: user.username,
      maskedKey: user.maskedKey,
      codigo: user.codigo || user.maskedKey,
      _fullCode: user.codigo || user.maskedKey,
      device: user.device,
      maskedIp: user.maskedIp,
      sessionId: user.sessionRecordId || user.id,
      tempoOnlineFormatted: user.tempoOnlineFormatted || user.connectedTime || '0s',
      currentPage: user.currentPage,
      status: user.status,
      accessStatus: user.accessStatus,
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-zinc-900/90 p-3.5 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Monitoramento do Mentor
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Painel 2.0
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
            Auditoria e acompanhamento em tempo real das sessões de alunos.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end gap-y-2 pt-1 sm:pt-0 border-t sm:border-0 border-zinc-800/80">
          {lastUpdatedTime && (
            <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400">
              Atualizado: <strong className="text-amber-400">{lastUpdatedTime}</strong>
            </span>
          )}

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1.5 sm:space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            title="Atualizar dados agora"
            id="mentor-refresh-data-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Atualizando...' : 'ATUALIZAR AGORA'}</span>
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

      {/* 5 KPI Indicator Cards - 2 Columns on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-zinc-300">Online Agora</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-emerald-400"></span>
              </span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats.onlineNow}
            </span>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold">
              conectados
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">Interação nos últimos 90s</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-zinc-300">Total Membros</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats.totalMembers}
            </span>
            <span className="text-[10px] sm:text-[11px] text-amber-400 font-semibold">
              licenças
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">Chaves registradas</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-zinc-300">Acessos Hoje</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats.accessesToday}
            </span>
            <span className="text-[10px] sm:text-[11px] text-blue-300 font-semibold">
              sessões
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">A partir de 00:00h</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-zinc-300">Pico Hoje</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats.peakSimultaneous}
            </span>
            <span className="text-[10px] sm:text-[11px] text-purple-300 font-semibold">
              pico
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">Recorde do dia</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-zinc-300">Ausentes</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats.absentSessions}
            </span>
            <span className="text-[10px] sm:text-[11px] text-amber-400 font-semibold">
              ausentes
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">Inativos 90s-1h</p>
        </div>
      </div>

      {/* Rich Analytics Cards Section */}
      <StatsCards
        stats={richStats}
        onSelectStudent={(codigo) => {
          const found = users.find(u => u.maskedKey === codigo || u.codigo === codigo);
          if (found) openStudentDrawer(found);
        }}
      />

      {/* Advanced Filters Bar */}
      <Filters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        deviceFilter={deviceFilter}
        onDeviceFilterChange={setDeviceFilter}
        browserFilter={browserFilter}
        onBrowserFilterChange={setBrowserFilter}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('ativos');
          setCategoryFilter('todas');
          setDeviceFilter('todos');
          setBrowserFilter('todos');
        }}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onDisconnectAll={handleOpenDisconnectAll}
        activeSessionsCount={getActiveValidSessionsCount()}
      />

      {/* Main Student Monitoring Container */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
        
        {/* Mobile View: Individual Compact Student Cards (< 768px) */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-medium">Carregando alunos em tempo real...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <WifiOff className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-300">Nenhum aluno encontrado</p>
              <p className="text-xs text-zinc-500 mt-1">
                {searchTerm ? 'Nenhum registro atende aos critérios de busca.' : 'Nenhum registro nesta listagem.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user, idx) => {
              const isSuspended = user.accessStatus === 'SUSPENDED';
              const isBanned = user.accessStatus === 'BANNED';

              return (
                <div
                  key={idx}
                  onClick={() => openStudentDrawer(user)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 shadow-md ${
                    isBanned
                      ? 'bg-red-950/30 border-red-900/60'
                      : isSuspended
                      ? 'bg-orange-950/30 border-orange-900/60'
                      : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Line 1: Avatar + Name + Status + Key */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover border border-amber-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.username.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate flex items-center gap-1">
                          <span>{user.username}</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />
                        </p>
                        <span className="font-mono text-[10px] font-bold text-amber-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 inline-block mt-0.5">
                          {user.maskedKey}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                          <PauseCircle className="w-2.5 h-2.5" /> SUSPENSO
                        </span>
                      ) : isBanned ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-950/60 text-red-300 border border-red-800/60 flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5 text-red-400" /> BANIDO
                        </span>
                      ) : statusFilter === 'desconectados' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <WifiOff className="w-2.5 h-2.5" /> ENCERRADO
                        </span>
                      ) : user.status === 'Online' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                        </span>
                      ) : user.status === 'Ausente' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Ausente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span> Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line 2: Device & IP */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/50">
                    <div className="flex items-center space-x-1.5 truncate">
                      {user.deviceType === 'Mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                      <span className="truncate">{user.device}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-[10px] justify-end">
                      <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span>{user.maskedIp}</span>
                    </div>
                  </div>

                  {/* Line 3: Page + Time Online + Activity */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-purple-300 border border-zinc-800 truncate max-w-[140px]">
                      {user.recentAction || user.currentPage || 'TikTok 2K'}
                    </span>

                    <div className="flex items-center space-x-2 font-mono text-[10px]">
                      <span className="text-emerald-400 font-semibold">
                        ⏱️ {user.tempoOnlineFormatted || user.connectedTime || '0s'}
                      </span>
                      <span className="text-zinc-500">
                        {user.lastActivityFormatted || user.lastActivity || 'Agora'}
                      </span>
                    </div>
                  </div>

                  {/* Line 4: Compact Action Buttons Bar */}
                  <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
                    {!isSuspended && !isBanned && statusFilter !== 'desconectados' ? (
                      <button
                        onClick={(e) => openActionModal(e, user, 'disconnect')}
                        className="py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Encerrar Login"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Sair</span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-zinc-600 flex items-center justify-center font-mono">--</div>
                    )}

                    {isSuspended || isBanned ? (
                      <button
                        onClick={(e) => openActionModal(e, user, 'reactivate')}
                        className="py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Reativar"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span>Ativar</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => openActionModal(e, user, 'suspend')}
                        className="py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Suspender"
                      >
                        <PauseCircle className="w-3 h-3" />
                        <span>Susp.</span>
                      </button>
                    )}

                    {!isBanned ? (
                      <button
                        onClick={(e) => openActionModal(e, user, 'ban')}
                        className="py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Banir"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Banir</span>
                      </button>
                    ) : (
                      <div className="text-[10px] text-zinc-600 flex items-center justify-center font-mono">--</div>
                    )}

                    <button
                      onClick={(e) => openActionModal(e, user, 'unlink')}
                      className="py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      title="Desvincular chave de acesso (apaga cadastro e reseta a chave)"
                    >
                      <Link2Off className="w-3 h-3" />
                      <span>Desvinc.</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openStudentDrawer(user);
                      }}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                      title="Timeline"
                    >
                      <History className="w-3 h-3" />
                      <span>Timeline</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left border-collapse" id="mentor-monitoring-table">
            <thead>
              <tr className="bg-zinc-950 text-zinc-400 text-[11px] font-bold uppercase tracking-wider border-b border-zinc-800">
                <th className="py-3.5 px-4">Aluno / Usuário</th>
                <th className="py-3.5 px-4">Chave de Acesso</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Tempo Online</th>
                <th className="py-3.5 px-4">Última Atividade</th>
                <th className="py-3.5 px-4">Ação Recente / Página</th>
                <th className="py-3.5 px-4">Dispositivo</th>
                <th className="py-3.5 px-4">Endereço IP</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    <p className="text-xs font-medium">Carregando dados de presença em tempo real...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <WifiOff className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-zinc-300">Nenhum aluno encontrado</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {searchTerm ? 'Nenhum registro atende aos critérios de busca ou filtros.' : 'Nenhum registro nesta listagem.'}
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
                      onClick={() => openStudentDrawer(user)}
                      className={`hover:bg-zinc-800/50 cursor-pointer transition-colors group ${
                        isBanned ? 'bg-red-950/20' : isSuspended ? 'bg-orange-950/20' : ''
                      }`}
                    >
                      {/* Usuário / Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover border border-amber-500/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700 flex items-center justify-center font-bold text-xs uppercase">
                              {user.username.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                              <span>{user.username}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-[10px] text-zinc-500">Clique para ver timeline</p>
                          </div>
                        </div>
                      </td>

                      {/* Chave Mascarada */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300 text-[11px]">
                        <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
                          {user.maskedKey}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 inline-flex items-center space-x-1">
                            <PauseCircle className="w-3 h-3 text-orange-400" />
                            <span>SUSPENSO</span>
                          </span>
                        ) : isBanned ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/60 text-red-300 border border-red-800/60 inline-flex items-center space-x-1">
                            <Ban className="w-3 h-3 text-red-400" />
                            <span>BANIDO</span>
                          </span>
                        ) : statusFilter === 'desconectados' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
                            <WifiOff className="w-3 h-3 text-rose-400" />
                            <span>ENCERRADO</span>
                          </span>
                        ) : user.status === 'Online' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Online</span>
                          </span>
                        ) : user.status === 'Ausente' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Ausente</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Tempo Online */}
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        {user.tempoOnlineFormatted || user.connectedTime || '0 s'}
                      </td>

                      {/* Última Atividade */}
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                        {user.lastActivityFormatted || user.lastActivity || 'Agora'}
                      </td>

                      {/* Ação Recente / Página */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-950 text-purple-300 border border-zinc-800 inline-block">
                          {user.recentAction || user.currentPage || 'TikTok 2K'}
                        </span>
                      </td>

                      {/* Dispositivo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-zinc-300 text-xs">
                          {user.deviceType === 'Mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[130px]">{user.device}</span>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        <div className="flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-zinc-500" />
                          <span>{user.maskedIp}</span>
                        </div>
                      </td>

                      {/* Ações Administrativas */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Botão Encerrar Login (Desconectar) */}
                          {!isSuspended && !isBanned && statusFilter !== 'desconectados' && (
                            <button
                              onClick={(e) => openActionModal(e, user, 'disconnect')}
                              title="Encerrar Login (Desconectar aluno)"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Suspender ou Reativar */}
                          {isSuspended || isBanned ? (
                            <button
                              onClick={(e) => openActionModal(e, user, 'reactivate')}
                              title="Reativar Acesso"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => openActionModal(e, user, 'suspend')}
                              title="Suspender Chave"
                              className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Banir */}
                          {!isBanned && (
                            <button
                              onClick={(e) => openActionModal(e, user, 'ban')}
                              title="Banir Chave"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all hover:scale-105 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Desvincular Chave */}
                          <button
                            onClick={(e) => openActionModal(e, user, 'unlink')}
                            title="Desvincular Chave (apaga cadastro e reseta a chave)"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all hover:scale-105 cursor-pointer"
                          >
                            <Link2Off className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Histórico / Timeline Drawer */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openStudentDrawer(user);
                            }}
                            title="Ver Histórico & Timeline"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all hover:scale-105 cursor-pointer"
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
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Sessão MASTER ativa do Mentor Bigode. Todas as ações são auditadas.</span>
          </div>
          <span>Exibindo {filteredUsers.length} de {users.length} alunos monitorados</span>
        </div>
      </div>

      {/* Lateral Session History Drawer */}
      <SessionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        student={drawerStudent}
        studentCode={studentCode}
      />

      {/* Administrative Modals */}
      {/* Modal Disconnect */}
      {activeModal === 'disconnect' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Encerrar Login do Aluno</h3>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
              <p><strong>Aluno:</strong> {selectedUser.username}</p>
              <p><strong>Dispositivo:</strong> {selectedUser.device}</p>
              <p><strong>Página Atual:</strong> {selectedUser.currentPage}</p>
            </div>

            <p className="text-xs text-zinc-400">
              Esta ação encerrará o login do aluno imediatamente no servidor.
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
              <button onClick={closeModal} disabled={actionLoading} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={executeDisconnect}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoading ? 'Processando...' : 'ENCERRAR LOGIN AGORA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suspend */}
      {activeModal === 'suspend' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <PauseCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Suspender Chave de Acesso</h3>
                <p className="text-xs text-orange-300 font-mono font-bold mt-0.5">{selectedUser.maskedKey}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              O aluno será desconectado e impedido de acessar até ser reativado.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">Motivo da Suspensão:</label>
              <select
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  placeholder="Descreva o motivo..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
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
              <button onClick={closeModal} disabled={actionLoading} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={executeSuspend}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionLoading ? 'Processando...' : 'CONFIRMAR SUSPENSÃO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ban */}
      {activeModal === 'ban' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-red-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
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
                    <span>Esta chave será permanentemente bloqueada.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Motivo do Banimento:</label>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Vazamento ou revenda não autorizada de acesso">Vazamento ou revenda não autorizada de acesso</option>
                    <option value="Tentativa de ataque ou engenharia reversa">Tentativa de ataque ou engenharia reversa</option>
                    <option value="Violação grave dos termos de uso">Violação grave dos termos de uso</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>

                  {actionReason === 'Outro motivo' && (
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Descreva o motivo..."
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white"
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
                  <button onClick={closeModal} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
                    Cancelar
                  </button>
                  <button
                    onClick={() => setShowBanConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase"
                  >
                    BANIR CHAVE DEFINITIVAMENTE
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

                <p className="text-xs text-red-300">
                  Tem certeza que deseja banir permanentemente este aluno?
                </p>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button onClick={() => setShowBanConfirm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
                    Cancelar
                  </button>
                  <button
                    onClick={executeBan}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center space-x-2"
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Banimento</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Reactivate */}
      {activeModal === 'reactivate' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
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

            <p className="text-xs text-zinc-400">
              A chave voltará ao status ATIVO e o aluno poderá se conectar novamente.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button onClick={closeModal} disabled={actionLoading} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={executeReactivate}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs flex items-center space-x-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>CONFIRMAR REATIVAÇÃO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unlink Key */}
      {activeModal === 'unlink' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={closeModal}
              disabled={actionLoading}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Link2Off className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-400">⚠️</span> Desvincular chave de acesso?
                </h3>
                <p className="text-xs text-rose-300 font-medium mt-0.5">
                  Esta ação removerá permanentemente o vínculo desta chave com o aluno atual.
                </p>
              </div>
            </div>

            <div className="text-xs text-zinc-300 leading-relaxed space-y-1.5 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
              <p className="flex items-start gap-1.5"><span className="text-rose-400 font-bold select-none">•</span> <span>Perfil do chat será apagado.</span></p>
              <p className="flex items-start gap-1.5"><span className="text-rose-400 font-bold select-none">•</span> <span>Sessão será encerrada.</span></p>
              <p className="flex items-start gap-1.5"><span className="text-rose-400 font-bold select-none">•</span> <span>XP, favoritos, notificações e progresso serão removidos.</span></p>
              <p className="flex items-start gap-1.5"><span className="text-rose-400 font-bold select-none">•</span> <span>A chave continuará existindo e poderá ser utilizada novamente por outro aluno.</span></p>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono">Chave:</span>
                <span className="text-cyan-400 font-bold font-mono">{selectedUser.maskedKey}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono">Aluno:</span>
                <span className="text-zinc-200 font-semibold">{selectedUser.username || (selectedUser as any).maskedName || 'Aluno'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono">Status:</span>
                <span className="text-emerald-400 font-semibold">{selectedUser.accessStatus || 'ACTIVE'}</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-200 text-center pt-1">
              Tem certeza que deseja desvincular esta chave?
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium text-center">
                {actionSuccessMsg}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-semibold cursor-pointer transition-all"
              >
                Não, cancelar
              </button>

              <button
                type="button"
                onClick={executeUnlink}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-lg shadow-rose-950/50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desvinculando...</span>
                  </>
                ) : (
                  <span>Sim, desvincular</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Disconnect All */}
      {showDisconnectAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowDisconnectAllModal(false)}
              disabled={disconnectAllLoading}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Encerrar todos os logins?</h3>
                <p className="text-xs text-rose-300 font-semibold mt-0.5">Ação Global do Mentor</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Todos os alunos conectados ({getActiveValidSessionsCount()}) serão desconectados imediatamente.
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
                onClick={() => setShowDisconnectAllModal(false)}
                disabled={disconnectAllLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={executeDisconnectAll}
                disabled={disconnectAllLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center space-x-2 cursor-pointer"
              >
                {disconnectAllLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Encerrando...</span>
                  </>
                ) : (
                  <span>Encerrar Todos</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
