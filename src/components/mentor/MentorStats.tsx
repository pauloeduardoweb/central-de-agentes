import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Bot,
  Trophy,
  Users,
  Clock,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface MentorStatsProps {
  studentCode: string;
}

export const MentorStats: React.FC<MentorStatsProps> = ({ studentCode }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [updatedTime, setUpdatedTime] = useState<string>('');

  useEffect(() => {
    setUpdatedTime(new Date().toLocaleTimeString('pt-BR'));
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setUpdatedTime(new Date().toLocaleTimeString('pt-BR'));
      setLoading(false);
    }, 600);
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/40 shadow-2xl text-white space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>METRICAS AVANÇADAS • MASTER</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
              Estatísticas Globais & Telemetria da Plataforma
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Atualizado às: <strong className="text-cyan-300">{updatedTime}</strong>
          </span>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Top Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Interações com Agentes</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">14.820</p>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18% esta semana</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Agente Mais Utilizado</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-black text-amber-300 truncate">Gerador de Copy High-Ticket</p>
          <p className="text-[11px] text-slate-400">3.410 prompts executados</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Taxa de Conclusão de Desafios</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-300">84.2%</p>
          <p className="text-[11px] text-slate-400">342 desafios concluídos</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Horário de Pico</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-300">14:00h - 18:00h</p>
          <p className="text-[11px] text-slate-400">Maior engajamento diário</p>
        </div>

      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Agentes por Categoria */}
        <div className="p-5 rounded-2xl bg-[#020d14]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Uso de Agentes por Categoria</span>
            </h3>
            <span className="text-[10px] text-cyan-400 font-bold uppercase">Volume Total</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">TikTok 2K & Ganchos Virais</span>
                <span className="text-cyan-400">42%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">Vendas & Copywriting</span>
                <span className="text-amber-400">31%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '31%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">Tráfego Pago & Meta Ads</span>
                <span className="text-emerald-400">17%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '17%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-slate-300">Suporte & Onboarding</span>
                <span className="text-indigo-400">10%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por Dispositivo & Navegador */}
        <div className="p-5 rounded-2xl bg-[#020d14]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Dispositivos & Navegadores dos Alunos</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Telemetria</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Computador (Desktop)</span>
              <p className="text-lg font-black text-white">68.4%</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '68.4%' }}></div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Celular (Mobile)</span>
              <p className="text-lg font-black text-white">28.1%</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '28.1%' }}></div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Google Chrome</span>
              <p className="text-lg font-black text-white">74.2%</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Microsoft Edge & Safari</span>
              <p className="text-lg font-black text-white">21.8%</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
