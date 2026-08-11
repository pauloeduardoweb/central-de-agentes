import React, { useState, useEffect } from 'react';
import {
  Flame,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Lock,
  Unlock,
  Clock,
  Check,
} from 'lucide-react';

export interface MinerStudentItem {
  accessKeyId: number;
  codigo: string;
  maskedKey: string;
  name?: string;
  nickname?: string | null;
  username: string;
  productMinerEnabled: boolean;
  productMinerEnabledAt?: string | null;
  productMinerEnabledBy?: string | null;
  createdAt: string;
}

interface MentorMinerAccessProps {
  studentCode: string;
}

export const MentorMinerAccess: React.FC<MentorMinerAccessProps> = ({ studentCode }) => {
  const [students, setStudents] = useState<MinerStudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [showFullKeys, setShowFullKeys] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showActivateAllModal, setShowActivateAllModal] = useState<boolean>(false);
  const [activatingAll, setActivatingAll] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/product-miner/admin/students', {
        headers: {
          'x-student-access-code': studentCode,
          'x-access-code': studentCode,
          'x-master-key': studentCode,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.students)) {
          setStudents(data.students);
        }
      }
    } catch (err) {
      console.error('[MentorMinerAccess Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [studentCode]);

  const handleToggleAccess = async (student: MinerStudentItem) => {
    setTogglingId(student.accessKeyId);
    const newStatus = !student.productMinerEnabled;
    try {
      const res = await fetch('/api/product-miner/admin/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-access-code': studentCode,
          'x-access-code': studentCode,
          'x-master-key': studentCode,
        },
        body: JSON.stringify({
          accessKeyId: student.accessKeyId,
          codigo: student.codigo,
          enabled: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(
          newStatus
            ? `Acesso ao Minerador ATIVADO para ${student.username}`
            : `Acesso ao Minerador DESATIVADO para ${student.username}`
        );
        setStudents((prev) =>
          prev.map((s) =>
            s.accessKeyId === student.accessKeyId
              ? {
                  ...s,
                  productMinerEnabled: newStatus,
                  productMinerEnabledAt: newStatus ? new Date().toISOString() : s.productMinerEnabledAt,
                }
              : s
          )
        );
      } else {
        triggerToast(data.message || 'Erro ao alterar permissão do minerador.');
      }
    } catch (err) {
      console.error('[Toggle Access Error]:', err);
      triggerToast('Falha na comunicação com o servidor.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleActivateAll = async () => {
    if (activatingAll) return;
    setActivatingAll(true);
    try {
      const res = await fetch('/api/product-miner/admin/activate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-access-code': studentCode,
          'x-access-code': studentCode,
          'x-master-key': studentCode,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(data.message || 'Acesso ao Minerador ativado para todos os alunos!');
        const nowIso = new Date().toISOString();
        setStudents((prev) =>
          prev.map((s) => ({
            ...s,
            productMinerEnabled: true,
            productMinerEnabledAt: s.productMinerEnabled ? s.productMinerEnabledAt : nowIso,
          }))
        );
        setShowActivateAllModal(false);
      } else {
        triggerToast(data.message || 'Erro ao liberar minerador em massa.');
      }
    } catch (err) {
      console.error('[Activate All Error]:', err);
      triggerToast('Falha na comunicação com o servidor.');
    } finally {
      setActivatingAll(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (student.name && student.name.toLowerCase().includes(term)) ||
      (student.nickname && student.nickname.toLowerCase().includes(term)) ||
      student.username.toLowerCase().includes(term) ||
      student.codigo.toLowerCase().includes(term) ||
      student.maskedKey.toLowerCase().includes(term);

    const matchesFilter =
      filterStatus === 'ALL' ||
      (filterStatus === 'ENABLED' && student.productMinerEnabled) ||
      (filterStatus === 'DISABLED' && !student.productMinerEnabled);

    return matchesSearch && matchesFilter;
  });

  const totalCount = students.length;
  const enabledCount = students.filter((s) => s.productMinerEnabled).length;
  const disabledCount = totalCount - enabledCount;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Não liberado';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Não liberado';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Não liberado';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border border-cyan-400 text-cyan-200 shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-amber-500/40 p-4 sm:p-6 shadow-2xl shadow-cyan-950/60 overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Módulo Premium</span>
              </span>
              <span className="text-xs text-cyan-300/80 font-mono font-medium">Acesso Vitalício Opcional</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Acesso ao Minerador de Produtos
            </h2>
            <p className="text-xs sm:text-sm text-cyan-100/80 max-w-2xl leading-relaxed">
              Gerencie individualmente a liberação do módulo <strong className="text-amber-300">Minerar Produtos</strong>.
              Apenas os alunos ativados pelo Mentor verão o menu e terão acesso ao buscador de produtos virais.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {disabledCount > 0 && (
              <button
                type="button"
                onClick={() => setShowActivateAllModal(true)}
                disabled={loading || activatingAll}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Ativar todos</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadStudents}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center space-x-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#0a192f]/90 border border-cyan-500/30 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total de Alunos</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a192f]/90 border border-emerald-500/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Acesso Minerador Liberado</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{enabledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a192f]/90 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sem Acesso ao Minerador</p>
            <p className="text-xl sm:text-2xl font-black text-slate-300 mt-0.5">{disabledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0a192f]/90 border border-cyan-500/30">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, nickname ou chave..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Quick status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ENABLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'ENABLED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Ativos ({enabledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DISABLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'DISABLED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Inativos ({disabledCount})
          </button>
          <button
            type="button"
            onClick={() => setShowFullKeys(!showFullKeys)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1 shrink-0 cursor-pointer"
            title={showFullKeys ? 'Ocultar Chaves' : 'Mostrar Chaves'}
          >
            {showFullKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Students Table / List */}
      <div className="rounded-2xl bg-[#0a192f]/90 border border-cyan-500/30 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Carregando dados dos alunos...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum aluno encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cyan-500/20 bg-cyan-950/40 text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Nickname</th>
                  <th className="py-3 px-4">Chave / Código</th>
                  <th className="py-3 px-4">Status Minerador</th>
                  <th className="py-3 px-4">Data de Ativação</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10 text-xs">
                {filteredStudents.map((student) => {
                  const isToggling = togglingId === student.accessKeyId;
                  const keyDisplay = showFullKeys ? student.codigo : student.maskedKey;
                  const displayName = student.name || student.username;

                  return (
                    <tr
                      key={student.accessKeyId}
                      className="hover:bg-cyan-950/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-[10px] text-slate-950 font-black shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[160px] sm:max-w-[200px]">
                            {displayName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {student.nickname ? (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]">
                            @{student.nickname}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                        {keyDisplay}
                      </td>

                      <td className="py-3.5 px-4">
                        {student.productMinerEnabled ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ATIVO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            <XCircle className="w-3 h-3 text-slate-500" />
                            <span>INATIVO</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(student.productMinerEnabledAt)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(student)}
                          disabled={isToggling}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 ml-auto cursor-pointer disabled:opacity-50 ${
                            student.productMinerEnabled
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-emerald-950/30'
                          }`}
                        >
                          {isToggling ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : student.productMinerEnabled ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-rose-400" />
                              <span>Desativar Minerador</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ativar Minerador</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Ativar Todos */}
      {showActivateAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0a192f] border border-amber-500/40 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">Liberar Minerador para Todos</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Deseja liberar o Minerador para todos os alunos atualmente sem acesso?
                </p>
                <p className="text-[11px] text-amber-300/80 pt-1">
                  {disabledCount} {disabledCount === 1 ? 'aluno será ativado' : 'alunos serão ativados'} imediatamente. Alunos que já possuem acesso não serão alterados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowActivateAllModal(false)}
                disabled={activatingAll}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleActivateAll}
                disabled={activatingAll}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {activatingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ativando...</span>
                  </>
                ) : (
                  <span>Ativar todos</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
