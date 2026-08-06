import React, { useEffect } from 'react';
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  Lock,
  UserCheck,
  Sparkles,
  Bot,
  AlertTriangle,
  Scale,
  ExternalLink,
  Clock,
  RefreshCw,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { TechGridBackground } from '../components/TechGridBackground';

interface TermsPageProps {
  onNavigateHome?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigateHome }) => {
  useEffect(() => {
    document.title = 'Termos de Serviço | Geração Z Pro';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Termos de Serviço da plataforma Geração Z Pro.');

    window.scrollTo(0, 0);
  }, []);

  const handleBackToHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#020912] text-slate-100 flex flex-col relative font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <TechGridBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#020912]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide">
                Geração Z Pro
              </span>
              <span className="text-xs text-slate-400 block sm:inline sm:ml-2">
                • Termos de Serviço
              </span>
            </div>
          </div>

          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar para o início</span>
            <span className="sm:hidden">Início</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title & Subtitle */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Documentação Legal Oficial
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Termos de Serviço
          </h1>
          <p className="text-sm sm:text-base text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Última atualização: Agosto de 2026
          </p>
        </div>

        {/* Intro Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 border border-cyan-500/20 mb-8 backdrop-blur-sm">
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Bem-vindo ao <strong className="text-cyan-300 font-semibold">Geração Z Pro</strong>. Por favor, leia atentamente os Termos de Serviço apresentados abaixo antes de utilizar nossas ferramentas e funcionalidades.
          </p>
        </div>

        {/* Sections Container */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">1. Aceitação</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Ao utilizar o Geração Z Pro, o usuário concorda com estes Termos de Serviço.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">2. Sobre o Geração Z Pro</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O Geração Z Pro é uma plataforma que utiliza inteligência artificial para auxiliar criadores de conteúdo, empreendedores e profissionais de marketing na criação de conteúdos, automações, agentes inteligentes e ferramentas de produtividade.
            </p>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">3. Conta do Usuário</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O usuário é responsável pela segurança de sua conta e pelas atividades realizadas através dela.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">4. Responsabilidade do Usuário</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O usuário é responsável por todo conteúdo criado, publicado ou compartilhado utilizando a plataforma.
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">5. Integração com TikTok</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                O Geração Z Pro poderá integrar-se às APIs oficiais do TikTok mediante autorização do usuário.
              </p>
              <p className="text-cyan-300 font-medium">
                A plataforma nunca solicita a senha da conta TikTok.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">6. Inteligência Artificial</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Os conteúdos gerados pela IA devem ser revisados antes da utilização comercial ou publicação.
            </p>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">7. Atividades Proibidas</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
                É proibido utilizar a plataforma para:
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>atividades ilegais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>violação de direitos autorais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>spam</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>fraudes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>violação das políticas do TikTok</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>acesso não autorizado a terceiros</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">8. Propriedade Intelectual</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Todo o software, identidade visual e funcionalidades do Geração Z Pro pertencem ao projeto.
            </p>
          </section>

          {/* Section 9 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">9. Serviços de Terceiros</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              A plataforma poderá utilizar integrações externas como TikTok e outros serviços.
            </p>
          </section>

          {/* Section 10 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">10. Disponibilidade</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              As funcionalidades poderão ser atualizadas, modificadas ou removidas quando necessário.
            </p>
          </section>

          {/* Section 11 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">11. Limitação de Responsabilidade</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O Geração Z Pro não é responsável por bloqueios realizados por plataformas terceiras nem por prejuízos decorrentes do uso inadequado da plataforma.
            </p>
          </section>

          {/* Section 12 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">12. Alterações</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Os Termos poderão ser atualizados a qualquer momento.
            </p>
          </section>

          {/* Section 13 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">13. Contato</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-2">
                Para dúvidas, esclarecimentos ou solicitações sobre estes Termos, entre em contato:
              </p>
              <a
                href="mailto:paulo.eduardo.eduardo.web@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium hover:bg-cyan-500/20 transition-colors text-sm sm:text-base"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                paulo.eduardo.eduardo.web@gmail.com
              </a>
            </div>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 cursor-pointer text-sm sm:text-base"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para o início
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#020912]/90 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Geração Z Pro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
