import React, { useState, useEffect } from 'react';
import { isMasterKey } from '../../data/studentCodes';
import {
  Key,
  Plus,
  Search,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Ban,
  LogOut,
  Clock,
  Shield,
  UserCheck,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';

interface AccessKeyItem {
  id?: number;
  codigo: string;
  maskedKey: string;
  accessStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt?: string;
  expiresAt?: string;
  activeSessionId?: string | null;
  isOnline?: boolean;
  username?: string;
}

interface MentorAccessCodesProps {
  studentCode: string;
}

export const MentorAccessCodes: React.FC<MentorAccessCodesProps> = ({ studentCode }) => {
  const [keysList, setKeysList] = useState<AccessKeyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED'>('ALL');
  const [showFullKeys, setShowFullKeys] = useState<boolean>(false);

  // Generate Key Modal
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [generateQuantity, setGenerateQuantity] = useState<number>(1);
  const [customPrefix, setCustomPrefix] = useState<string>('GZPRO');
  const [generating, setGenerating] = useState<boolean>(false);
  const [newlyGeneratedKeys, setNewlyGeneratedKeys] = useState<string[]>([]);

  // Action Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [licenseStats, setLicenseStats] = useState<{
    totalLicenses: number;
    activeKeys: number;
    suspendedKeys: number;
    bannedKeys: number;
    neverUsed: number;
    alreadyUsed: number;
  }>({
    totalLicenses: 0,
    activeKeys: 0,
    suspendedKeys: 0,
    bannedKeys: 0,
    neverUsed: 0,
    alreadyUsed: 0,
  });

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/access-keys', {
        headers: {
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
          'x-master-key': studentCode,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.keys)) {
          const mapped: AccessKeyItem[] = data.keys.map((k: any) => ({
            id: k.id,
            codigo: k.codigo,
            maskedKey: k.maskedKey,
            accessStatus: k.accessStatus || 'ACTIVE',
            createdAt: k.createdAt || new Date().toISOString(),
            expiresAt: 'Vitalício',
            activeSessionId: k.hasSession ? 'active-sess' : null,
            isOnline: Boolean(k.isOnline),
            username: k.username,
            usado: Boolean(k.usado),
          }));
          setKeysList(mapped);
        }
        if (data.stats) {
          setLicenseStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('[MentorAccessCodes Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [studentCode]);

  const handleGenerateKeys = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/access-keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
          'x-master-key': studentCode,
        },
        body: JSON.stringify({
          quantity: generateQuantity,
          prefix: customPrefix,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.keys)) {
        const createdCodes = data.keys.map((k: any) => k.codigo);
        setNewlyGeneratedKeys(createdCodes);
        triggerToast(`${createdCodes.length} novas licenças de acesso geradas e salvas no MySQL!`);
        await loadKeys();
      } else {
        triggerToast(data.message || 'Erro ao gerar novas licenças.');
      }
    } catch (err) {
      console.error('[Generate Keys Error]:', err);
      triggerToast('Erro ao comunicar com o servidor.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Chave ${text} copiada para a área de transferência!`);
  };

  const filteredKeys = keysList.filter((k) => {
    const matchesSearch =
      k.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.maskedKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.username && k.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || k.accessStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/40 shadow-2xl text-white space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-cyan-900/90 text-cyan-200 border border-cyan-500/50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>SISTEMA DE LICENCIAMENTO MESTRE</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
              Gerenciamento de Códigos de Acesso & Licenças
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFullKeys(!showFullKeys)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            {showFullKeys ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4 text-cyan-400" />}
            <span>{showFullKeys ? 'Ocultar Chaves' : 'Exibir Chaves Completas'}</span>
          </button>

          <button
            onClick={loadKeys}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => {
              setNewlyGeneratedKeys([]);
              setShowGenerateModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs flex items-center space-x-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Gerar Novas Chaves</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400">Total de Licenças</span>
          <p className="text-xl font-black text-white mt-1">{licenseStats.totalLicenses || keysList.length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
          <span className="text-[11px] font-bold text-emerald-400">Ativas</span>
          <p className="text-xl font-black text-emerald-300 mt-1">
            {licenseStats.activeKeys ?? keysList.filter((k) => k.accessStatus === 'ACTIVE').length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30">
          <span className="text-[11px] font-bold text-amber-400">Suspensas</span>
          <p className="text-xl font-black text-amber-300 mt-1">
            {licenseStats.suspendedKeys ?? keysList.filter((k) => k.accessStatus === 'SUSPENDED').length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30">
          <span className="text-[11px] font-bold text-rose-400">Banidas</span>
          <p className="text-xl font-black text-rose-300 mt-1">
            {licenseStats.bannedKeys ?? keysList.filter((k) => k.accessStatus === 'BANNED').length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30">
          <span className="text-[11px] font-bold text-sky-400">Nunca Utilizadas</span>
          <p className="text-xl font-black text-sky-300 mt-1">
            {licenseStats.neverUsed ?? keysList.filter((k) => !k.usado).length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
          <span className="text-[11px] font-bold text-indigo-400">Já Utilizadas</span>
          <p className="text-xl font-black text-indigo-300 mt-1">
            {licenseStats.alreadyUsed ?? keysList.filter((k) => k.usado).length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código de acesso ou aluno..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({keysList.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Ativas ({keysList.filter((k) => k.accessStatus === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'SUSPENDED'
                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Suspensas ({keysList.filter((k) => k.accessStatus === 'SUSPENDED').length})
          </button>
          <button
            onClick={() => setStatusFilter('BANNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'BANNED'
                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Banidas ({keysList.filter((k) => k.accessStatus === 'BANNED').length})
          </button>
        </div>
      </div>

      {/* Keys Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Chave de Acesso</th>
              <th className="py-3 px-4">Aluno Vinculado</th>
              <th className="py-3 px-4">Status da Licença</th>
              <th className="py-3 px-4">Tipo de Acesso</th>
              <th className="py-3 px-4">Conexão Atual</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Nenhuma chave de acesso encontrada.
                </td>
              </tr>
            ) : (
              filteredKeys.map((keyItem) => (
                <tr key={keyItem.id || keyItem.codigo} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white flex items-center space-x-2">
                    <span>{showFullKeys ? keyItem.codigo : keyItem.maskedKey}</span>
                    <button
                      onClick={() => copyToClipboard(keyItem.codigo)}
                      className="p-1 text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Copiar código"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {keyItem.isMasterKey || isMasterKey(keyItem.codigo) ? 'Mentor Bigode (Sessão Mestra)' : (keyItem.username || 'Aluno Geração Z')}
                  </td>

                  <td className="py-3 px-4">
                    {keyItem.accessStatus === 'ACTIVE' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Ativa</span>
                      </span>
                    )}
                    {keyItem.accessStatus === 'SUSPENDED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1">
                        <PauseCircle className="w-3 h-3 text-amber-400" />
                        <span>Suspensa</span>
                      </span>
                    )}
                    {keyItem.accessStatus === 'BANNED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40 inline-flex items-center space-x-1">
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>Banida</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-cyan-300 font-semibold text-xs">
                    Vitalício
                  </td>

                  <td className="py-3 px-4">
                    {keyItem.isOnline ? (
                      <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Online</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 text-slate-500 font-medium text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        <span>Offline</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => copyToClipboard(keyItem.codigo)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer"
                    >
                      Copiar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Keys Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#031926] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  Gerar Novas Licenças de Acesso (Alunos)
                </h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {newlyGeneratedKeys.length > 0 ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{newlyGeneratedKeys.length} licenças criadas com sucesso!</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-xs">
                  {newlyGeneratedKeys.map((code) => (
                    <div key={code} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-cyan-300 font-bold">{code}</span>
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Prefix das Chaves</label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="Ex: GZPRO ou MENTORIA"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white uppercase focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Quantidade de Licenças a Gerar (1 a 20)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={generateQuantity}
                    onChange={(e) => setGenerateQuantity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cada nova chave gerada terá acesso vitalício e poderá ser entregue diretamente ao aluno.
                </p>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateKeys}
                    disabled={generating}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-2"
                  >
                    {generating ? 'Gerando...' : 'Gerar Agora'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
