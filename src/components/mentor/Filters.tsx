import React from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  RefreshCw,
  LogOut
} from 'lucide-react';

interface FiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: any) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  deviceFilter: string;
  onDeviceFilterChange: (dev: string) => void;
  browserFilter: string;
  onBrowserFilterChange: (browser: string) => void;
  onResetFilters: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onDisconnectAll: () => void;
  activeSessionsCount: number;
}

export const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  deviceFilter,
  onDeviceFilterChange,
  browserFilter,
  onBrowserFilterChange,
  onResetFilters,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onDisconnectAll,
  activeSessionsCount,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 mb-6 shadow-xl space-y-4">
      {/* Top row: Search input + Disconnect All + Export Buttons */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por código de acesso, nome, IP ou página..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
            id="mentor-search-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Disconnect All Button */}
          <button
            onClick={onDisconnectAll}
            className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm active:scale-95"
            id="mentor-disconnect-all-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Todos ({activeSessionsCount})</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
              title="Exportar CSV"
              id="export-csv-btn"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
              title="Exportar Excel"
              id="export-excel-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={onExportPDF}
              className="px-3 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
              title="Imprimir ou Salvar em PDF"
              id="export-pdf-btn"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3 text-amber-400" /> Status:
        </span>

        {[
          { key: 'ativos', label: 'Ativos' },
          { key: 'todos', label: 'Todos' },
          { key: 'online', label: 'Online' },
          { key: 'ausente', label: 'Ausente' },
          { key: 'offline', label: 'Offline' },
          { key: 'desconectados', label: 'Desconectados' },
          { key: 'suspensos', label: 'Suspensos' },
          { key: 'banidos', label: 'Banidos' },
        ].map((item) => {
          const active = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onStatusFilterChange(item.key)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                active
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Detailed Select Dropdowns (Category, Device, Browser) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* Category Select */}
        <div>
          <label className="block text-[10px] font-medium text-zinc-400 mb-1">Página / Categoria Atual</label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="todas">Todas as categorias</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Flow Ultra">Flow Ultra</option>
            <option value="TikTok 2K">TikTok 2K</option>
            <option value="Suporte">Suporte</option>
            <option value="Grupo Network">Grupo Network</option>
            <option value="Academia">Academia</option>
            <option value="Prompts">Prompts</option>
            <option value="Dashboard">Dashboard</option>
          </select>
        </div>

        {/* Device Select */}
        <div>
          <label className="block text-[10px] font-medium text-zinc-400 mb-1">Dispositivo / Sistema</label>
          <select
            value={deviceFilter}
            onChange={(e) => onDeviceFilterChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="todos">Todos os dispositivos</option>
            <option value="Windows">Windows</option>
            <option value="Android">Android</option>
            <option value="iPhone">iPhone / iOS</option>
            <option value="Mac">Mac OS</option>
            <option value="Linux">Linux</option>
          </select>
        </div>

        {/* Browser Select */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-zinc-400 mb-1">Navegador</label>
            <select
              value={browserFilter}
              onChange={(e) => onBrowserFilterChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="todos">Todos os navegadores</option>
              <option value="Chrome">Chrome</option>
              <option value="Edge">Edge</option>
              <option value="Safari">Safari</option>
              <option value="Firefox">Firefox</option>
              <option value="Opera">Opera</option>
            </select>
          </div>

          <button
            onClick={onResetFilters}
            className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Limpar Filtros"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
