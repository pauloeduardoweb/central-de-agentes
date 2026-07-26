import React, { useState } from 'react';
import { X, Download, Upload, Check, Copy, FileJson, AlertCircle } from 'lucide-react';
import { Agent } from '../types';

interface ExportModalProps {
  agents: Agent[];
  onImportBackup: (importedAgents: Agent[]) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ agents, onImportBackup, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [backupJsonInput, setBackupJsonInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const jsonString = JSON.stringify(agents, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus-agentes-gpt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = () => {
    setRestoreError(null);
    try {
      const parsed = JSON.parse(backupJsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('O arquivo de backup deve ser uma lista válida de agentes em JSON.');
      }
      onImportBackup(parsed);
      onClose();
    } catch (err: any) {
      setRestoreError(err.message || 'Erro ao restaurar arquivo de backup.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Backup e Exportação dos Agentes
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Download & Copy Backup Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <FileJson className="w-4 h-4 text-emerald-500" />
              <span>Exportar Todos os seus ({agents.length}) Agentes:</span>
            </h3>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup (.json)</span>
              </button>

              <button
                onClick={handleCopy}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-200 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
              </button>
            </div>
          </div>

          {/* Restore Backup Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Restaurar Backup de um Arquivo JSON:</span>
            </h3>

            <textarea
              rows={4}
              value={backupJsonInput}
              onChange={(e) => setBackupJsonInput(e.target.value)}
              placeholder="Cole aqui o conteúdo do seu arquivo .json de backup para restaurar seus agentes..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50"
            />

            {restoreError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{restoreError}</span>
              </div>
            )}

            <button
              onClick={handleRestore}
              disabled={!backupJsonInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurar Agentes do Backup</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
