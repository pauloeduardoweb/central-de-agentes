import React from 'react';
import {
  Server,
  Database,
  Activity,
  Cpu,
  Clock,
  Zap,
  CheckCircle,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export interface HealthMetrics {
  serverStatus: string;
  dbStatus: string;
  avgHeartbeat: string;
  memoryUsage: string;
  uptime: string;
  latencyMs: number;
  lastUpdate: string;
}

interface HealthCheckCardProps {
  health?: HealthMetrics;
  onRefresh?: () => void;
  loading?: boolean;
}

export const HealthCheckCard: React.FC<HealthCheckCardProps> = ({
  health = {
    serverStatus: 'Online',
    dbStatus: 'Conectado (MySQL)',
    avgHeartbeat: '3.0 s',
    memoryUsage: '48 MB',
    uptime: '12m',
    latencyMs: 8,
    lastUpdate: new Date().toLocaleTimeString('pt-BR'),
  },
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between h-[290px] md:h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Health Check do Servidor</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            </h3>
            <p className="text-[11px] text-zinc-400">Status em tempo real do ecossistema</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Atualizar diagnóstico"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
        {/* Express Server */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Servidor Node</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            {health.serverStatus}
          </span>
        </div>

        {/* Database MySQL */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Banco MySQL</span>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono truncate max-w-[90px]">
            {health.dbStatus}
          </span>
        </div>

        {/* Heartbeat Interval */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Heartbeat Média</span>
          </div>
          <span className="text-[11px] font-bold text-blue-400 font-mono">
            {health.avgHeartbeat}
          </span>
        </div>

        {/* Latency */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Latência DB</span>
          </div>
          <span className="text-[11px] font-bold text-purple-300 font-mono">
            {health.latencyMs} ms
          </span>
        </div>

        {/* Memory RAM */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Uso RAM</span>
          </div>
          <span className="text-[11px] font-bold text-cyan-300 font-mono">
            {health.memoryUsage}
          </span>
        </div>

        {/* Uptime */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Uptime Ativo</span>
          </div>
          <span className="text-[11px] font-bold text-orange-300 font-mono">
            {health.uptime}
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-400" /> API V3.0 Ativa
        </span>
        <span className="font-mono">Última checagem: {health.lastUpdate}</span>
      </div>
    </div>
  );
};
