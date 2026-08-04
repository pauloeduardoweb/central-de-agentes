import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Flag, Users, Pin, CheckCircle, Ban, AlertTriangle, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';

interface ChatModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentCode: string;
  onClearGeneralChat?: () => void;
}

export const ChatModerationModal: React.FC<ChatModerationModalProps> = ({
  isOpen,
  onClose,
  studentCode,
  onClearGeneralChat,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'members' | 'notice' | 'clear'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [noticeContent, setNoticeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Excluir Perfil state
  const [deletingProfileTarget, setDeletingProfileTarget] = useState<any | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  // Limpar Conversa Geral state
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [preserveNotices, setPreserveNotices] = useState(true);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chat/reports', {
        headers: { 'x-access-code': studentCode },
      });
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chat/profiles', {
        headers: { 'x-access-code': studentCode },
      });
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (err) {
      console.error('Error fetching chat profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'reports') fetchReports();
      if (activeTab === 'members') fetchProfiles();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (profileId: number, status: 'SUSPENDED' | 'BANNED' | 'ACTIVE', reason: string) => {
    try {
      const endpoint = status === 'SUSPENDED' ? 'suspend' : status === 'BANNED' ? 'ban' : 'reactivate';
      const res = await fetch(`/api/admin/chat/profiles/${profileId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Ação executada com sucesso.`);
        fetchProfiles();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeContent.trim()) return;

    try {
      const res = await fetch('/api/admin/chat/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ roomId: 1, content: noticeContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Aviso oficial publicado com sucesso!');
        setNoticeContent('');
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error publishing notice:', err);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ reason: 'Removida pela moderação do Mentor' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg('Mensagem excluída.');
        fetchReports();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleExecuteDeleteProfile = async () => {
    if (!deletingProfileTarget || isDeletingProfile) return;
    setIsDeletingProfile(true);
    try {
      const res = await fetch(`/api/admin/chat-profiles/${deletingProfileTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-access-code': studentCode,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg('Perfil do Bate-papo excluído com sucesso.');
        setDeletingProfileTarget(null);
        fetchProfiles();
        setTimeout(() => setActionMsg(null), 3000);
      } else {
        alert(data?.message || 'Erro ao excluir perfil.');
      }
    } catch (err: any) {
      console.error('Error deleting chat profile:', err);
      alert('Erro ao comunicar com o servidor.');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const handleExecuteClearChat = async () => {
    if (isClearingChat) return;
    setIsClearingChat(true);
    try {
      const res = await fetch('/api/admin/chat/rooms/1/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ preserveNotices }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg('Conversa geral limpa com sucesso.');
        setClearStep(0);
        if (onClearGeneralChat) onClearGeneralChat();
        setTimeout(() => setActionMsg(null), 3000);
      } else {
        alert(data?.message || 'Erro ao limpar conversa geral.');
      }
    } catch (err: any) {
      console.error('Error clearing chat room:', err);
      alert('Erro ao comunicar com o servidor.');
    } finally {
      setIsClearingChat(false);
    }
  };

  const filteredProfiles = profiles.filter((p) =>
    p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b141a] border border-amber-500/40 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#111b21] via-[#1f2c34] to-[#111b21] p-4 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                Painel de Moderação do Bate-papo
              </h3>
              <p className="text-amber-400/80 text-xs">Gestão exclusiva do Mentor Bigode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#111b21] px-4 pt-3 flex space-x-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'reports'
                ? 'bg-[#0b141a] text-amber-300 border-t-2 border-x border-amber-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Denúncias ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'members'
                ? 'bg-[#0b141a] text-emerald-300 border-t-2 border-x border-emerald-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alunos do Chat ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notice')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'notice'
                ? 'bg-[#0b141a] text-cyan-300 border-t-2 border-x border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Publicar Aviso Oficial</span>
          </button>

          <button
            onClick={() => setActiveTab('clear')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'clear'
                ? 'bg-[#0b141a] text-rose-300 border-t-2 border-x border-rose-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Limpar Conversa Geral</span>
          </button>
        </div>

        {/* Action feedback */}
        {actionMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-200">
          
          {/* TAB 1: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-[#111b21] rounded-2xl border border-slate-800">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  Nenhuma denúncia pendente na comunidade.
                </div>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="p-3.5 bg-[#111b21] border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-amber-400" />
                        Motivo: {rep.reason}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Denunciado por: {rep.reporter_nickname}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#0b141a] rounded-lg border border-slate-800 text-xs">
                      <span className="text-emerald-400 font-bold text-[11px] block mb-0.5">
                        {rep.author_nickname} (Tel: {rep.author_phone || 'Privado'})
                      </span>
                      <p className="text-slate-200 italic">
                        "{rep.message_content}"
                      </p>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleDeleteMessage(rep.message_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Apagar Mensagem
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(rep.author_profile_id, 'SUSPENDED', rep.reason)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:bg-amber-900 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Suspender Aluno
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nickname ou telefone..."
                className="w-full bg-[#111b21] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <div className="space-y-2">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="p-3 bg-[#111b21] border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{p.nickname}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.chat_status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : p.chat_status === 'SUSPENDED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        }`}>
                          {p.chat_status === 'ACTIVE' ? 'Ativo' : p.chat_status === 'SUSPENDED' ? 'Suspenso' : 'Banido'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        WhatsApp: {p.phone} • Msgs: {p.message_count || 0} • Denúncias: {p.report_count || 0}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {p.chat_status === 'ACTIVE' ? (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'SUSPENDED', 'Ação direta do Mentor')}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-semibold hover:bg-amber-900 cursor-pointer"
                          >
                            Suspender
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'BANNED', 'Ação direta do Mentor')}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-semibold hover:bg-rose-900 cursor-pointer"
                          >
                            Banir
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'ACTIVE', 'Reativado pelo Mentor')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reativar
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingProfileTarget(p)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 text-[11px] font-bold hover:bg-rose-900 flex items-center gap-1 cursor-pointer"
                        title="Excluir perfil do Bate-papo"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        Excluir perfil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NOTICE */}
          {activeTab === 'notice' && (
            <form onSubmit={handlePublishNotice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Texto do Aviso Fixo no Topo do Chat
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Escreva a mensagem oficial que ficará fixada no topo da sala de bate-papo para todos os alunos..."
                  className="w-full bg-[#111b21] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!noticeContent.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-950/50 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Publicar e Fixar Aviso</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CLEAR CHAT */}
          {activeTab === 'clear' && (
            <div className="space-y-4 p-4 bg-[#111b21] border border-rose-500/30 rounded-2xl">
              <div className="flex items-center space-x-3 text-rose-400 border-b border-rose-500/20 pb-3">
                <Trash2 className="w-6 h-6" />
                <div>
                  <h4 className="text-sm font-bold text-white">Área de Manutenção: Limpar Conversa Geral</h4>
                  <p className="text-xs text-rose-300/80">Ação administrativa destrutiva para a sala principal</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Esta função remove todas as mensagens de texto, mídias (fotos, GIFs, áudios), respostas, reações, favoritos e menções da sala principal. Perfis de usuários, chaves de acesso e pontuações de XP serão preservados.
              </p>

              <div className="p-3 bg-[#0b141a] rounded-xl border border-slate-800 flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="tabPreserveNotices"
                  checked={preserveNotices}
                  onChange={(e) => setPreserveNotices(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <label htmlFor="tabPreserveNotices" className="text-xs text-slate-200 cursor-pointer font-medium">
                  Preservar Avisos Oficiais do Mentor
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setClearStep(1)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Iniciar Limpeza da Conversa Geral</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: EXCLUIR PERFIL DO BATE-PAPO */}
      {deletingProfileTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white relative">
            <button
              onClick={() => !isDeletingProfile && setDeletingProfileTarget(null)}
              disabled={isDeletingProfile}
              className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-rose-500/30 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Excluir perfil do Bate-papo?</h3>
                <p className="text-xs text-rose-300 font-medium mt-0.5">Operação Administrativa do Bate-papo</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0b141a] p-3 rounded-xl border border-slate-800">
              O aluno perderá o perfil, foto, nickname, XP, favoritos e demais dados da comunidade. A chave de acesso continuará válida e o aluno poderá entrar novamente na plataforma, mas precisará recriar seu perfil do Bate-papo.
            </p>

            <div className="p-3 bg-[#0b141a] rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Nickname:</span>
                <span className="text-emerald-400 font-bold">{deletingProfileTarget.nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chave mascarada:</span>
                <span className="text-cyan-300 font-bold">{deletingProfileTarget.codigo || 'GZ-***'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Telefone:</span>
                <span className="text-slate-200">{deletingProfileTarget.phone || 'Privado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status atual:</span>
                <span className="text-amber-300 font-bold">
                  {deletingProfileTarget.chat_status === 'ACTIVE' ? 'Ativo' : deletingProfileTarget.chat_status === 'SUSPENDED' ? 'Suspenso' : 'Banido'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProfileTarget(null)}
                disabled={isDeletingProfile}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteProfile}
                disabled={isDeletingProfile}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center space-x-1.5"
              >
                {isDeletingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, excluir perfil</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLEAR CHAT STEP 1 */}
      {clearStep === 1 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-amber-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white relative">
            <button onClick={() => setClearStep(0)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-amber-500/30 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Limpar toda a conversa geral?</h3>
                <p className="text-xs text-amber-300 font-medium mt-0.5">Confirmação Etapa 1 de 2</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0b141a] p-3.5 rounded-xl border border-slate-800">
              Todas as mensagens, fotos, GIFs, áudios e interações da sala principal serão removidos permanentemente.
            </p>

            <div className="p-3 bg-[#0b141a] rounded-xl border border-slate-800 flex items-center space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="modal1PreserveNotices"
                checked={preserveNotices}
                onChange={(e) => setPreserveNotices(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <label htmlFor="modal1PreserveNotices" className="text-xs text-slate-200 cursor-pointer font-medium">
                Preservar Avisos Oficiais do Mentor
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setClearStep(0)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setClearStep(2)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLEAR CHAT STEP 2 */}
      {clearStep === 2 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-rose-500/60 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white relative">
            <button
              onClick={() => !isClearingChat && setClearStep(0)}
              disabled={isClearingChat}
              className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-rose-500/30 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Confirmação final</h3>
                <p className="text-xs text-rose-400 font-bold mt-0.5">Etapa Final de Segurança</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-rose-200 bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/40 leading-relaxed">
              Esta ação não pode ser desfeita. Tem certeza que deseja apagar todo o histórico do Bate-papo Geral?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setClearStep(1)}
                disabled={isClearingChat}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Não, voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteClearChat}
                disabled={isClearingChat}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-rose-950/50"
              >
                {isClearingChat ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando conversa...</span>
                  </>
                ) : (
                  <span>Sim, limpar conversa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
