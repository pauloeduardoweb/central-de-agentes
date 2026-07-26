import React from 'react';
import { X, ExternalLink, Globe, Sparkles, Cpu, Zap, ShieldCheck, BookOpen, Users } from 'lucide-react';

interface GeracaoZProModalProps {
  onClose: () => void;
  onOpenOfficialAgent: () => void;
}

export const GeracaoZProModal: React.FC<GeracaoZProModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      
      <div className="relative w-full max-w-3xl my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Gradient */}
        <div className="relative p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl">
              Z
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">PLATAFORMA OFICIAL GERAÇÃO Z PRO</span>
              <h2 className="text-2xl font-black">Mentoria Geração Z Pro</h2>
            </div>
          </div>

          <p className="text-sm text-emerald-50 max-w-xl leading-relaxed font-medium">
            A maior plataforma brasileira para quem deseja vender no TikTok Shop utilizando Inteligência Artificial, Agentes IA e automações inteligentes.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Agentes Especializados</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Agentes exclusivos para TikTok Shop e TikTok Dark, desenvolvidos para criar conteúdos virais, vender mais e acelerar seus resultados com Inteligência Artificial.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Automação Inteligente</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Crie fluxos automatizados com IA, APIs e ferramentas No-Code para economizar tempo, produzir mais e escalar seus resultados.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capacitação & Cursos</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Aprenda estratégias práticas para vender como Afiliado no TikTok Shop, criar conteúdos virais e dominar a Inteligência Artificial na prática.
              </p>
            </div>
          </div>

          {/* Detailed Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Tudo o que você encontra dentro do Geração Z Pro</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Agentes Exclusivos:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Agentes especializados para TikTok Shop e TikTok Dark capazes de criar roteiros, prompts, imagens, vídeos, estratégias de vendas e automações.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <Users className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Grupo Exclusivo & Suporte:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Networking entre alunos, atualizações constantes e suporte direto com o Mentor Bigode para acelerar sua evolução.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <Globe className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Ferramentas Integradas de IA:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Utilize Flow Ultra, Gemini Ultra, ChatGPT e outras ferramentas para criar conteúdos, automatizar tarefas e aumentar sua produtividade.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA inside Modal */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-400">Pronto para começar?</p>
              <p className="text-xs text-slate-300">Explore os agentes, ferramentas e treinamentos disponíveis na plataforma e comece a colocar seu conhecimento em prática.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
