import React, { useState, useEffect } from 'react';
import { X, Package, Image as ImageIcon, Folder, Tag, Zap, ShieldAlert, Check } from 'lucide-react';
import { Product } from '../../types';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pasta, setPasta] = useState('');
  const [imagemPrincipal, setImagemPrincipal] = useState('');
  const [nivel, setNivel] = useState<'Facil' | 'Medio' | 'Dificil'>('Facil');
  const [xp, setXp] = useState(25);
  const [ativo, setAtivo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setNome(product.nome || '');
      setCategoria(product.categoria || '');
      setPasta(product.pasta || '');
      setImagemPrincipal(product.imagem_principal || '');
      setNivel(product.nivel || 'Facil');
      setXp(product.xp || 25);
      setAtivo(product.ativo === true || product.ativo === 1);
    } else {
      setNome('');
      setCategoria('Ferramentas');
      setPasta('');
      setImagemPrincipal('');
      setNivel('Facil');
      setXp(25);
      setAtivo(true);
    }
  }, [product]);

  // Auto-generate folder slug from name if empty
  const handleNameChange = (val: string) => {
    setNome(val);
    if (!product && (!pasta || pasta.trim() === '')) {
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPasta(slug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('O nome do produto é obrigatório.');
      return;
    }
    if (!categoria.trim()) {
      setError('A categoria do produto é obrigatória.');
      return;
    }
    if (!pasta.trim()) {
      setError('O nome da pasta é obrigatório.');
      return;
    }
    if (!imagemPrincipal.trim()) {
      setError('A URL da imagem principal é obrigatória.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        id: product?.id,
        nome: nome.trim(),
        categoria: categoria.trim(),
        pasta: pasta.trim().toLowerCase().replace(/\s+/g, '-'),
        imagem_principal: imagemPrincipal.trim(),
        nivel,
        xp: Number(xp) || 25,
        ativo: ativo ? 1 : 0,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar o produto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#020d14] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {product ? 'Editar Produto' : 'Adicionar Novo Produto'}
              </h2>
              <p className="text-xs text-slate-400">
                Preencha as informações do produto para a Biblioteca do Mentor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
              Nome do Produto <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Package className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={nome}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Kit de Ferramentas 46 Peças"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                required
              />
            </div>
          </div>

          {/* Categoria & Pasta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
                Categoria <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Ferramentas, Moda, Eletrônicos"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
                Nome da Pasta (Identificador Único) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Folder className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={pasta}
                  onChange={(e) => setPasta(e.target.value)}
                  placeholder="Ex: kit-de-ferramentas-46-pecas"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* URL da Imagem Principal */}
          <div>
            <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
              URL da Imagem Principal <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="url"
                value={imagemPrincipal}
                onChange={(e) => setImagemPrincipal(e.target.value)}
                placeholder="https://midia.geracaozpro.com/produtos/..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                required
              />
            </div>
            {imagemPrincipal && (
              <div className="mt-2 flex items-center space-x-3 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                <img
                  src={imagemPrincipal}
                  alt="Pré-visualização"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-slate-400 truncate max-w-md">
                  Pré-visualização da imagem principal
                </span>
              </div>
            )}
          </div>

          {/* Nível, XP & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
                Nível de Dificuldade
              </label>
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              >
                <option value="Facil">Fácil</option>
                <option value="Medio">Médio</option>
                <option value="Dificil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
                Pontos de XP
              </label>
              <div className="relative">
                <Zap className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={xp}
                  onChange={(e) => setXp(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-200 mb-1.5">
                Status do Produto
              </label>
              <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 cursor-pointer hover:bg-slate-800/80 transition-colors">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-600"
                />
                <span className={`text-xs font-bold ${ativo ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {ativo ? 'Ativo (Visível)' : 'Inativo (Oculto)'}
                </span>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{product ? 'Atualizar Produto' : 'Cadastrar Produto'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
