import React, { useState } from 'react';
import { BarChart2, CheckCircle2, Plus, PlusCircle, Sparkles } from 'lucide-react';

export interface PollOption {
  index: number;
  label: string;
  count: number;
  percentage: number;
}

export interface PollData {
  id: number;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOption: number | null;
  created_at: string;
}

interface PollCardProps {
  poll: PollData | null;
  isMentor?: boolean;
  onVote: (pollId: number, optionIndex: number) => void;
  onCreatePoll?: (question: string, options: string[]) => void;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  isMentor = false,
  onVote,
  onCreatePoll,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreatePoll || !questionInput.trim() || !option1.trim() || !option2.trim()) return;
    const opts = [option1.trim(), option2.trim()];
    if (option3.trim()) opts.push(option3.trim());
    onCreatePoll(questionInput.trim(), opts);
    setShowCreateModal(false);
    setQuestionInput('');
    setOption1('');
    setOption2('');
    setOption3('');
  };

  return (
    <div className="mx-auto max-w-xl my-3 px-2">
      {poll ? (
        <div className="bg-gradient-to-br from-[#182229] to-[#111b21] border border-teal-500/40 rounded-2xl p-4 shadow-xl text-slate-100 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                  Enquete da Comunidade
                </span>
                <h3 className="font-bold text-sm text-white">{poll.question}</h3>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full">
              {poll.totalVotes} voto(s)
            </span>
          </div>

          {/* Options list */}
          <div className="space-y-2.5">
            {poll.options.map((opt) => {
              const isSelected = poll.userVotedOption === opt.index;
              return (
                <button
                  key={opt.index}
                  onClick={() => onVote(poll.id, opt.index)}
                  className={`w-full text-left p-3 rounded-xl border relative transition-all group overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/20 text-white shadow-md'
                      : 'border-slate-800 bg-[#202c33]/60 hover:bg-[#202c33] text-slate-200'
                  }`}
                >
                  {/* Progress Bar Background */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                      isSelected ? 'bg-emerald-500/20' : 'bg-slate-700/20'
                    }`}
                    style={{ width: `${opt.percentage}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                            : 'border-slate-600 group-hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="font-medium truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 font-bold">
                      <span className="text-slate-400 text-[11px]">{opt.count}</span>
                      <span className={isSelected ? 'text-emerald-400' : 'text-slate-300'}>
                        {opt.percentage}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Note / Mentor Action */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {poll.userVotedOption !== null
                ? '✓ Você já votou nesta enquete.'
                : 'Clique na sua opção para registrar seu voto.'}
            </span>

            {isMentor && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Enquete</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#182229] border border-dashed border-teal-500/40 text-center text-xs space-y-2 my-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-100">Nenhuma enquete criada.</h3>
          <p className="text-slate-400 max-w-sm mx-auto text-xs">Acompanhe aqui as pesquisas e votações da comunidade.</p>
          {isMentor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Enquete Oficial</span>
            </button>
          )}
        </div>
      )}

      {/* Mentor Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111b21] border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-teal-300">
                <Sparkles className="w-4 h-4" /> Criar Enquete da Comunidade
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Pergunta da Enquete</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Qual próximo conteúdo você quer ver na aula?"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Opção 1</label>
                <input
                  type="text"
                  required
                  placeholder="Primeira opção"
                  value={option1}
                  onChange={(e) => setOption1(e.target.value)}
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Opção 2</label>
                <input
                  type="text"
                  required
                  placeholder="Segunda opção"
                  value={option2}
                  onChange={(e) => setOption2(e.target.value)}
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Opção 3 (Opcional)</label>
                <input
                  type="text"
                  placeholder="Terceira opção"
                  value={option3}
                  onChange={(e) => setOption3(e.target.value)}
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md"
                >
                  Publicar Enquete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
