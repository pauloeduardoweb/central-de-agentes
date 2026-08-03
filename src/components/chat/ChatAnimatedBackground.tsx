import React from 'react';
import { Sparkles, MessageSquare, Flame, HelpCircle } from 'lucide-react';

interface ChatAnimatedBackgroundProps {
  children?: React.ReactNode;
  variant?: 'ROOM_LIST' | 'ACTIVE_ROOM';
  isEmpty?: boolean;
  onSelectSuggestion?: (text: string) => void;
}

export const ChatAnimatedBackground: React.FC<ChatAnimatedBackgroundProps> = ({
  children,
  isEmpty = false,
  onSelectSuggestion,
}) => {
  const suggestions = [
    {
      icon: Flame,
      text: '🔥 Qual a estratégia mais lucrativa de tráfego pago hoje?',
      color: 'bg-[#E7F3FF] border-[#BAE6FD] text-[#075985] hover:bg-[#D0E8FF]',
    },
    {
      icon: MessageSquare,
      text: '💬 Como faço para validar minha oferta com suporte do Mentor?',
      color: 'bg-[#E7F8F3] border-[#A7F3D0] text-[#006D5B] hover:bg-[#CFFAF0]',
    },
    {
      icon: Sparkles,
      text: '⚡ Dica para aumentar minha taxa de conversão no WhatsApp',
      color: 'bg-[#FFF4C6] border-[#FDE68A] text-[#715B00] hover:bg-[#FFEC9E]',
    },
    {
      icon: HelpCircle,
      text: '📌 Regras e diretrizes da Comunidade Geração Z Pro',
      color: 'bg-[#F3E8FF] border-[#DDD6FE] text-[#6B21A8] hover:bg-[#E9D5FF]',
    },
  ];

  return (
    <div className="relative w-full h-full bg-[#EFEAE2] flex flex-col overflow-hidden">
      {/* Light WhatsApp pattern overlay background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23111B21' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
            <div className="max-w-md w-full bg-[#FFFFFF]/90 backdrop-blur-md border border-[#DADDE1] rounded-3xl p-6 shadow-lg space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E7F8F3] border border-[#A7F3D0] flex items-center justify-center text-[#006D5B] text-2xl shadow-xs">
                💬
              </div>

              <div>
                <h3 className="font-bold text-lg text-[#111B21]">
                  Seja o primeiro a conversar!
                </h3>
                <p className="text-xs text-[#667781] mt-1 leading-relaxed">
                  Esta sala está silenciosa no momento. Envie uma dúvida ou selecione uma das sugestões abaixo para iniciar o papo com a comunidade.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#667781] block">
                  Sugestões Rápidas:
                </span>
                {suggestions.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectSuggestion && onSelectSuggestion(item.text.replace(/^[^\s]+\s*/, ''))}
                      className={`w-full text-left text-xs p-3 rounded-xl border ${item.color} transition-all duration-200 active:scale-95 hover:shadow-xs flex items-center gap-2.5 group cursor-pointer font-medium`}
                    >
                      <IconComp className="w-4 h-4 shrink-0 opacity-80 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
