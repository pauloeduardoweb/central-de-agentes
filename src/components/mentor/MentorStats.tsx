import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Bot,
  Trophy,
  Clock,
  Shield,
  Monitor,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface MentorStatsProps {
  studentCode: string;
}

interface StatsData {
  totalInteractions: number;
  mostUsedAgent: string | null;
  challengeCompletionRate: string;
  peakHour: string | null;
  categories: Array<{ name: string; count: number; percentage: number; color: string }>;
  devices: Array<{ name: string; count: number; percentage: number }>;
  browsers: Array<{ name: string; count: number; percentage: number }>;
  updatedAt?: string;
}

export const MentorStats: React.FC<MentorStatsProps> = ({ studentCode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [updatedTime, setUpdatedTime] = useState<string>('');
  const [stats, setStats] = useState<StatsData>({
    totalInteractions: 0,
    mostUsedAgent: null,
    challengeCompletionRate: '0%',
    peakHour: null,
    categories: [],
    devices: [],
    browsers: [],
  });

  const fetchRealStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'x-access-code': studentCode,
          'x-master-key': studentCode,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            totalInteractions: data.totalInteractions || 0,
            mostUsedAgent: data.mostUsedAgent || null,
            challengeCompletionRate: data.challengeCompletionRate || '0%',
            peakHour: data.peakHour || null,
            categories: data.categories || [],
            devices: data.devices || [],
            browsers: data.browsers || [],
          });
        }
      }
    } catch (err) {
      console.warn('[MentorStats] Error fetching real stats:', err);
    } finally {
      setLoading(false);
      setUpdatedTime(new Date().toLocaleTimeString('pt-BR'));
    }
  };

  useEffect(() => {
    fetchRealStats();
  }, [studentCode]);

  const handleRefresh = () => {
    fetchRealStats();
  };

  const getBarColorClass = (color: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-400';
      case 'emerald':
        return 'bg-emerald-400';
      case 'indigo':
        return 'bg-indigo-400';
      case 'rose':
        return 'bg-rose-400';
      case 'fuchsia':
        return 'bg-fuchsia-400';
      default:
        return 'bg-cyan-400';
    }
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
              <span>MÉTRICAS REAIS • MASTER</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
              Estatísticas Globais & Telemetria Real
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Atualizado às: <strong className="text-cyan-300">{updatedTime || '--:--:--'}</strong>
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
          <p className="text-2xl font-black text-white">
            {stats.totalInteractions.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.totalInteractions > 0 ? 'Total registrado na plataforma' : 'Dados ainda não disponíveis'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Agente Mais Utilizado</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-black text-amber-300 truncate">
            {stats.mostUsedAgent || 'Nenhum agente utilizado'}
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.mostUsedAgent ? 'Maior número de prompts' : 'Dados ainda não disponíveis'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Taxa de Conclusão de Desafios</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-300">
            {stats.challengeCompletionRate}
          </p>
          <p className="text-[11px] text-slate-400">Calculado a partir de desafios jogados</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#02121e]/90 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Horário de Pico</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-300">
            {stats.peakHour || 'Aguardando dados'}
          </p>
          <p className="text-[11px] text-slate-400">Maior engajamento de uso</p>
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
            <span className="text-[10px] text-cyan-400 font-bold uppercase">Categorias Reais</span>
          </div>

          {stats.categories.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Dados ainda não disponíveis. Interaja com os agentes para contabilizar as métricas por categoria.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {stats.categories.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="text-cyan-400">{cat.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getBarColorClass(cat.color)}`}
                      style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribuição por Dispositivo & Navegador */}
        <div className="p-5 rounded-2xl bg-[#020d14]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Dispositivos & Navegadores dos Alunos</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Telemetria Real</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {stats.devices.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-slate-500 text-xs">
                Dados ainda não disponíveis. A telemetria de acesso será exibida conforme as sessões ativas.
              </div>
            ) : (
              <>
                {stats.devices.map((dev, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{dev.name}</span>
                    <p className="text-lg font-black text-white">{dev.percentage}%</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${dev.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
                {stats.browsers.map((brow, idx) => (
                  <div key={`brow-${idx}`} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{brow.name}</span>
                    <p className="text-lg font-black text-white">{brow.percentage}%</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
