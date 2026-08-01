import React from 'react';
import {
  Activity,
  Layers,
  Laptop,
  Globe,
  Clock,
  UserCheck,
  TrendingUp,
  BarChart2,
  PieChart,
  Smartphone,
  ChevronRight
} from 'lucide-react';

interface ActivityItem {
  id: number;
  codigo: string;
  maskedKey: string;
  eventType: string;
  page?: string;
  device?: string;
  details?: string;
  createdAt: string;
}

interface StatsCardsProps {
  stats: {
    topCategories?: { name: string; count: number }[];
    devices?: { name: string; count: number; percentage: number }[];
    browsers?: { name: string; count: number }[];
    loginsToday?: { hour: string; count: number }[];
    longestSessions?: { name: string; codigo: string; tempoOnline: string; tempoOnlineSeconds: number; paginaAtual: string }[];
    shortestSessions?: { name: string; codigo: string; tempoOnline: string; tempoOnlineSeconds: number; paginaAtual: string }[];
    activityFeed?: ActivityItem[];
  };
  onSelectStudent?: (codigo: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onSelectStudent }) => {
  const {
    topCategories = [],
    devices = [],
    browsers = [],
    loginsToday = [],
    longestSessions = [],
    shortestSessions = [],
    activityFeed = [],
  } = stats;

  const formatFeedTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const sec = Math.floor(diffMs / 1000);
      if (sec < 60) return `há ${sec}s`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `há ${min}m`;
      const hr = Math.floor(min / 60);
      return `há ${hr}h`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Atividade em Tempo Real */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Atividade em Tempo Real</h3>
              <p className="text-[11px] text-zinc-400">Feed de ações recentes dos alunos</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Ao vivo
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {activityFeed.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">
              Nenhuma atividade recente registrada.
            </div>
          ) : (
            activityFeed.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => onSelectStudent && onSelectStudent(item.codigo)}
                className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer transition-all flex items-center justify-between text-xs group"
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
                      {item.maskedKey}
                    </span>
                    <span className="text-zinc-400 ml-1.5 font-normal">
                      {item.details || (item.page ? `abriu ${item.page}` : 'realizou ação')}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
                  {formatFeedTime(item.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Top Categorias */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/80 mb-3">
          <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Top Categorias Acessadas</h3>
            <p className="text-[11px] text-zinc-400">Páginas mais populares no momento</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {topCategories.map((cat, idx) => {
            const maxCount = Math.max(...topCategories.map(c => c.count), 1);
            const widthPct = Math.min(100, Math.max(8, (cat.count / maxCount) * 100));

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span className="font-medium truncate">{cat.name}</span>
                  <span className="font-mono text-purple-300 shrink-0">{cat.count} acessos</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dispositivos e Sistemas */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/80 mb-3">
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Laptop className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Sistemas & Dispositivos</h3>
            <p className="text-[11px] text-zinc-400">Distribuição por plataforma</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {devices.map((dev, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-zinc-900 text-blue-400 border border-zinc-800">
                  {dev.name === 'Android' || dev.name === 'iPhone' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">{dev.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{dev.count} conexões</span>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg font-mono">
                {dev.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Navegadores */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/80 mb-3">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Navegadores Utilizados</h3>
            <p className="text-[11px] text-zinc-400">Browser dos alunos</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {browsers.map((b, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs">
              <span className="text-zinc-300 font-medium">{b.name}</span>
              <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Logins Hoje (Gráfico por Hora) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/80 mb-3">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart2 className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Logins de Hoje</h3>
            <p className="text-[11px] text-zinc-400">Volume de acessos por hora</p>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-between gap-1 pt-4 pb-1">
          {loginsToday.map((h, idx) => {
            const maxLogins = Math.max(...loginsToday.map(item => item.count), 1);
            const heightPct = Math.min(100, Math.max(10, (h.count / maxLogins) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
                <span className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-amber-400 transition-opacity">
                  {h.count}
                </span>
                <div
                  className="w-full bg-zinc-800 group-hover:bg-amber-400 rounded-t transition-all duration-300"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[8px] font-mono text-zinc-500 truncate">
                  {idx % 4 === 0 ? h.hour : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Sessões Mais Longas */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-[320px]">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/80 mb-3">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Sessões Mais Longas</h3>
            <p className="text-[11px] text-zinc-400">Alunos com maior tempo contínuo</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {longestSessions.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">
              Nenhum aluno online no momento.
            </div>
          ) : (
            longestSessions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => onSelectStudent && onSelectStudent(s.codigo)}
                className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between text-xs hover:border-zinc-700 cursor-pointer transition-colors group"
              >
                <div>
                  <span className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors block">
                    {s.name || s.codigo}
                  </span>
                  <span className="text-[10px] text-zinc-500">{s.paginaAtual}</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  {s.tempoOnline}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
