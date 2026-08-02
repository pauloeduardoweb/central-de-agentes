import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  Laptop,
  Globe,
  Ban,
  PauseCircle,
  Bell,
  ChevronRight,
  Filter
} from 'lucide-react';

export interface AlertItem {
  id: string | number;
  type: 'NEW_LOGIN' | 'NEW_STUDENT' | 'ABSENT' | 'DUPLICATE_LOGIN' | 'DEVICE_CHANGE' | 'IP_CHANGE' | 'FRAUD' | 'DISCONNECT' | 'BAN' | 'SUSPEND';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  studentCode?: string;
  timestamp: string;
}

interface AlertsCentralProps {
  alerts: AlertItem[];
  onSelectStudent?: (code: string) => void;
}

export const AlertsCentral: React.FC<AlertsCentralProps> = ({
  alerts = [],
  onSelectStudent,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const filtered = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const getAlertBadge = (type: AlertItem['type'], severity: AlertItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return { color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: Ban };
      case 'HIGH':
        return { color: 'bg-red-500/20 text-red-300 border-red-500/40', icon: ShieldAlert };
      case 'MEDIUM':
        return { color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: AlertTriangle };
      default:
        return { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: UserCheck };
    }
  };

  const formatAlertTime = (isoString: string) => {
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
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col h-[290px] md:h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bell className="w-4 h-4 animate-bounce" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Central de Alertas e Segurança</h3>
            <p className="text-[11px] text-zinc-400">Notificações operacionais do Mentor</p>
          </div>
        </div>

        {/* Severity Filter pills */}
        <div className="flex items-center space-x-1 text-[10px]">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-2 py-0.5 rounded-full border transition-colors ${
              filterSeverity === 'ALL'
                ? 'bg-zinc-700 text-white border-zinc-600 font-bold'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            Todos ({alerts.length})
          </button>
          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`px-2 py-0.5 rounded-full border transition-colors ${
              filterSeverity === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-rose-300'
            }`}
          >
            Críticos
          </button>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-500">
            Nenhum alerta registrado nesta categoria.
          </div>
        ) : (
          filtered.map((item) => {
            const badge = getAlertBadge(item.type, item.severity);
            const Icon = badge.icon;

            return (
              <div
                key={item.id}
                onClick={() => item.studentCode && onSelectStudent && onSelectStudent(item.studentCode)}
                className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all flex items-start space-x-3 text-xs group cursor-pointer"
              >
                <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${badge.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                      {formatAlertTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed truncate">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
