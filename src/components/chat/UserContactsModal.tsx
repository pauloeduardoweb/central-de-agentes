import React, { useState, useEffect } from 'react';
import { X, Users, UserMinus, UserCheck, Search, ShieldCheck } from 'lucide-react';
import { getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

interface UserContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentCode: string;
  onSelectProfile?: (profile: any) => void;
}

export const UserContactsModal: React.FC<UserContactsModalProps> = ({
  isOpen,
  onClose,
  studentCode,
  onSelectProfile,
}) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchContacts = async () => {
    if (!studentCode) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/contacts', {
        headers: { 'x-access-code': studentCode },
      });
      const data = await res.json();
      if (data.contacts) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveContact = async (contactId: number, nickname: string) => {
    try {
      const res = await fetch(`/api/chat/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'x-access-code': studentCode },
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Contato ${nickname} removido.`);
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error removing contact:', err);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b141a] border border-[#00A884]/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#111b21] p-4 border-b border-[#263A43] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#182F2A] border border-[#00A884]/50 flex items-center justify-center text-[#00A884]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Meus Contatos</h3>
              <p className="text-[#AEBAC1] text-xs">Sua lista de contatos na comunidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Msg */}
        {actionMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-[#182F2A] border border-[#00A884]/40 rounded-xl text-[#00A884] text-xs text-center font-bold">
            {actionMsg}
          </div>
        )}

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nos contatos..."
              className="w-full bg-[#111b21] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00A884]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 pt-2 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Carregando contatos...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-[#111b21] rounded-2xl border border-slate-800 space-y-2">
              <UserCheck className="w-8 h-8 text-[#00A884] mx-auto opacity-50" />
              <p className="font-semibold text-slate-300">
                {searchTerm ? 'Nenhum contato encontrado na busca.' : 'Você ainda não possui contatos salvos.'}
              </p>
              <p className="text-[11px] text-slate-500">
                Clique no perfil de um colega no bate-papo e selecione "Adicionar aos Meus Contatos".
              </p>
            </div>
          ) : (
            filteredContacts.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-[#111b21] border border-slate-800 rounded-xl flex items-center justify-between hover:border-[#00A884]/30 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {c.photo_url ? (
                    <img
                      src={resolveChatMediaUrl(c.photo_url)}
                      alt={c.nickname}
                      className="w-10 h-10 rounded-full object-cover border border-[#00A884]/50 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#182229] border border-[#00A884]/50 flex items-center justify-center font-bold text-xs text-[#00A884] shrink-0">
                      {getNicknameInitials(c.nickname)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">{c.nickname}</span>
                      {Boolean(c.is_moderator) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Mod
                        </span>
                      )}
                    </div>
                    {c.bio && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.bio}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      if (onSelectProfile) onSelectProfile(c);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#182F2A] border border-[#00A884]/40 text-[#00A884] hover:bg-[#1E3B34] text-[11px] font-semibold cursor-pointer"
                  >
                    Ver Perfil
                  </button>

                  <button
                    onClick={() => handleRemoveContact(c.id, c.nickname)}
                    className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-400 hover:bg-rose-900/80 cursor-pointer"
                    title="Remover Contato"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
