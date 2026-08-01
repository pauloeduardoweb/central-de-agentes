import React from 'react';
import {
  Compass,
  UserCheck,
  LogOut,
  Layers,
  ArrowRight,
  Clock,
  Laptop,
  Globe,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export interface PathStep {
  id: number | string;
  page: string;
  category?: string;
  timestamp: string;
  eventType?: string;
  duration?: string;
  device?: string;
  ip?: string;
}

interface NavigationMapProps {
  steps: PathStep[];
  studentName?: string;
  maskedKey?: string;
  isOnline?: boolean;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  steps,
  studentName = 'Aluno',
  maskedKey = 'GZ-****-0000',
  isOnline = false,
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-950/60 rounded-2xl border border-zinc-800/80 text-zinc-500 text-xs">
        <Compass className="w-8 h-8 mx-auto mb-2 text-zinc-600 animate-spin-slow" />
        <p className="font-medium text-zinc-400">Nenhum percurso de navegação registrado ainda.</p>
        <p className="text-[11px] mt-1 text-zinc-600">A trajetória visual aparecerá conforme o aluno navegar no portal.</p>
      </div>
    );
  }

  // Reverse chronological list to show journey from start to finish or vice-versa
  const chronologicalSteps = [...steps].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getStepColor = (index: number, total: number, eventType?: string) => {
    if (eventType === 'LOGIN') return 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
    if (eventType === 'LOGOUT') return 'border-zinc-600 bg-zinc-800 text-zinc-400';
    if (eventType === 'MENTOR_DISCONNECT' || eventType === 'BAN' || eventType === 'SUSPEND') {
      return 'border-rose-500 bg-rose-500/10 text-rose-400';
    }
    if (index === total - 1 && isOnline) return 'border-amber-500 bg-amber-500/10 text-amber-400 animate-pulse';
    return 'border-purple-500/80 bg-purple-500/10 text-purple-300';
  };

  const formatStepTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-amber-950/30 border border-purple-500/20 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white">Mapa de Navegação e Percurso Visual</h4>
            <p className="text-[11px] text-zinc-400">Trilha percorrida por {studentName} ({maskedKey})</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
          {chronologicalSteps.length} {chronologicalSteps.length === 1 ? 'etapa' : 'etapas'}
        </span>
      </div>

      {/* Diagram Path Nodes */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-purple-500 before:to-amber-500">
        {chronologicalSteps.map((step, idx) => {
          const isLast = idx === chronologicalSteps.length - 1;
          const nodeStyle = getStepColor(idx, chronologicalSteps.length, step.eventType);

          return (
            <div key={step.id || idx} className="relative flex items-start space-x-3 text-xs group">
              {/* Bullet Node */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${nodeStyle}`}
              >
                {step.eventType === 'LOGIN' ? (
                  <UserCheck className="w-2.5 h-2.5" />
                ) : step.eventType === 'LOGOUT' ? (
                  <LogOut className="w-2.5 h-2.5" />
                ) : isLast && isOnline ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <Layers className="w-2.5 h-2.5" />
                )}
              </div>

              {/* Step Card */}
              <div className="flex-1 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors">
                      {step.page || 'Página Inicial'}
                    </span>
                    {step.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {step.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {formatStepTime(step.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-900">
                  <div className="flex items-center space-x-3">
                    {step.device && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Laptop className="w-3 h-3 text-blue-400" /> {step.device}
                      </span>
                    )}
                    {step.ip && (
                      <span className="flex items-center gap-1 text-zinc-400 font-mono">
                        <Globe className="w-3 h-3 text-purple-400" /> {step.ip}
                      </span>
                    )}
                  </div>
                  {isLast && isOnline && (
                    <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Localização Atual
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
