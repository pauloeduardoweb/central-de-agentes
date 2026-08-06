import React, { useEffect } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Database,
  Share2,
  Bot,
  Key,
  Trash2,
  Cookie,
  ExternalLink,
  Users,
  RefreshCw,
  Mail,
  CheckCircle2,
  Clock,
  Eye,
  Server,
  FileText,
} from 'lucide-react';
import { TechGridBackground } from '../components/TechGridBackground';

interface PrivacyPageProps {
  onNavigateHome?: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigateHome }) => {
  useEffect(() => {
    document.title = 'Política de Privacidade | Geração Z Pro';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Política de Privacidade da plataforma Geração Z Pro e de suas integrações.'
    );

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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide">
                Geração Z Pro
              </span>
              <span className="text-xs text-slate-400 block sm:inline sm:ml-2">
                • Política de Privacidade
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
            Proteção de Dados & Privacidade
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Política de Privacidade
          </h1>
          <p className="text-sm sm:text-base text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Última atualização: 6 de agosto de 2026
          </p>
        </div>

        {/* Intro Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 border border-cyan-500/20 mb-8 backdrop-blur-sm">
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            A sua privacidade é fundamental para nós. Esta Política de Privacidade descreve de forma transparente como o <strong className="text-cyan-300 font-semibold">Geração Z Pro</strong> coleta, utiliza, armazena e protege as informações dos usuários na plataforma e em suas integrações oficiais.
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
              <h2 className="text-lg font-bold text-white">1. Introdução</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Esta Política de Privacidade explica como o Geração Z Pro coleta, utiliza, armazena e protege informações dos usuários ao utilizar a plataforma e suas integrações.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">2. Informações Coletadas</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
                O Geração Z Pro poderá coletar:
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>nome e informações de perfil;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>endereço de e-mail;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>dados de autenticação e sessão;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>informações técnicas do dispositivo e navegador;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>conteúdos enviados pelo usuário;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>registros de utilização da plataforma;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>informações autorizadas pelo usuário em integrações com terceiros, incluindo TikTok.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">3. Integração com o TikTok</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                Quando o usuário conecta sua conta TikTok, o Geração Z Pro utiliza as APIs oficiais do TikTok.
              </p>
              <p>
                O acesso ocorre somente após autorização expressa do usuário.
              </p>
              <p className="text-cyan-300 font-medium">
                O Geração Z Pro não solicita nem armazena a senha da conta TikTok.
              </p>
              <p>
                As informações acessadas dependem dos escopos autorizados pelo usuário e aprovados pelo TikTok.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">4. Finalidades do Tratamento</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
                As informações poderão ser utilizadas para:
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>autenticar usuários;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>fornecer funcionalidades da plataforma;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>personalizar a experiência;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>processar conteúdos e automações solicitadas;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>manter segurança e prevenção contra fraudes;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>melhorar o desempenho da plataforma;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>cumprir obrigações legais;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>fornecer suporte ao usuário.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">5. Conteúdo e Inteligência Artificial</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                Conteúdos enviados à plataforma poderão ser processados por sistemas de inteligência artificial para executar as funcionalidades solicitadas pelo usuário.
              </p>
              <p>
                O Geração Z Pro não utilizará conteúdos privados para finalidades incompatíveis com o serviço contratado.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Share2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">6. Compartilhamento de Dados</h2>
            </div>
            <div className="pl-11 space-y-3">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Dados poderão ser compartilhados somente:
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>com provedores necessários para a operação da plataforma;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>com serviços de hospedagem, banco de dados e processamento;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>com plataformas integradas autorizadas pelo usuário;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>quando exigido por obrigação legal;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>para proteção contra fraude, abuso ou ameaça à segurança.</span>
                </li>
              </ul>
              <p className="text-cyan-300 font-semibold pt-1">
                O Geração Z Pro não vende dados pessoais dos usuários.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">7. Armazenamento e Segurança</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O Geração Z Pro utiliza medidas técnicas e administrativas para proteger as informações contra acesso não autorizado, perda, alteração ou divulgação indevida. Nenhum sistema é totalmente imune a riscos, mas são adotadas práticas razoáveis de segurança.
            </p>
          </section>

          {/* Section 8 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">8. Tokens e Autorizações do TikTok</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                Tokens de acesso e atualização, quando utilizados, devem ser armazenados de forma segura no servidor.
              </p>
              <p>
                O usuário poderá revogar a autorização concedida ao Geração Z Pro por meio das configurações de sua conta TikTok ou da própria plataforma.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Server className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">9. Retenção de Dados</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              Os dados serão mantidos pelo período necessário para fornecer os serviços, cumprir obrigações legais e proteger direitos legítimos. Após o encerramento da conta, os dados poderão ser excluídos ou anonimizados, salvo quando a retenção for exigida por lei.
            </p>
          </section>

          {/* Section 10 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">10. Direitos do Usuário</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
                O usuário poderá solicitar:
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>acesso aos seus dados;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>correção de informações;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>exclusão de dados;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>revogação de consentimento;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>informações sobre o tratamento;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1">•</span>
                  <span>portabilidade, quando aplicável.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">11. Exclusão de Conta e Dados</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              O usuário poderá solicitar a exclusão de sua conta e dos dados associados entrando em contato pelo e-mail indicado nesta Política.
            </p>
          </section>

          {/* Section 12 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Cookie className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">12. Cookies e Tecnologias Semelhantes</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              A plataforma poderá utilizar cookies, armazenamento local e tecnologias semelhantes para autenticação, segurança, preferências e análise de funcionamento.
            </p>
          </section>

          {/* Section 13 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">13. Serviços de Terceiros</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                Serviços externos utilizados pelo Geração Z Pro possuem suas próprias políticas de privacidade e termos.
              </p>
              <p>
                O uso do TikTok também está sujeito às políticas oficiais do TikTok.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">14. Menores de Idade</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11">
              A plataforma não é destinada a menores que não possuam capacidade legal ou autorização válida para utilizar os serviços.
            </p>
          </section>

          {/* Section 15 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">15. Alterações nesta Política</h2>
            </div>
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed pl-11 space-y-2">
              <p>
                Esta Política poderá ser atualizada periodicamente.
              </p>
              <p>
                A versão mais recente estará sempre disponível nesta página.
              </p>
            </div>
          </section>

          {/* Section 16 */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">16. Contato</h2>
            </div>
            <div className="pl-11">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-2">
                Para dúvidas, solicitações ou exercício de direitos relacionados à privacidade:
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
