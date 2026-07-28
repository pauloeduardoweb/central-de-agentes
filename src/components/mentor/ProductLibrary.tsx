import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Pencil,
  Power,
  Trash2,
  Folder,
  Tag,
  Zap,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../../types';
import { ProductModal } from './ProductModal';

interface ProductLibraryProps {
  studentCode: string;
}

export const ProductLibrary: React.FC<ProductLibraryProps> = ({ studentCode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Todos');

  // Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load products from GET /api/admin/products
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/products', {
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('HTTP 403: Acesso negado. Apenas mentores possuem permissão.');
        }
        if (res.status === 401) {
          throw new Error('HTTP 401: Autenticação de mentor necessária.');
        }
        throw new Error(`Erro ao carregar produtos (Status ${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err: any) {
      console.error('[ProductLibrary Error]:', err);
      setError(err?.message || 'Não foi possível carregar a lista de produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [studentCode]);

  // Derived category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todas', ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pasta?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;

      const isAtivo = p.ativo === true || p.ativo === 1;
      const matchStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'Ativos' && isAtivo) ||
        (statusFilter === 'Inativos' && !isAtivo);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Stats
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.ativo === true || p.ativo === 1).length;
  const inactiveCount = totalCount - activeCount;

  // Actions
  const handleSaveProduct = async (productData: Partial<Product>) => {
    const isEdit = Boolean(productData.id);
    const url = isEdit ? `/api/admin/products/${productData.id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-access-code': studentCode,
      },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Erro ao salvar produto.');
    }

    showToast(isEdit ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
    await loadProducts();
  };

  const handleToggleStatus = async (product: Product) => {
    const currentAtivo = product.ativo === true || product.ativo === 1;
    const newStatus = !currentAtivo;

    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ ativo: newStatus ? 1 : 0 }),
      });

      if (!res.ok) {
        throw new Error('Erro ao alterar status.');
      }

      showToast(`Produto "${product.nome}" ${newStatus ? 'ativado' : 'desativado'}!`);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ativo: newStatus ? 1 : 0 } : p))
      );
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar status do produto.');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o produto "${product.nome}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
      });

      if (!res.ok) {
        throw new Error('Erro ao excluir produto.');
      }

      showToast(`Produto "${product.nome}" excluído com sucesso!`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir produto.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Info & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#020d14]/80 p-5 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-white tracking-tight">
              Biblioteca de Produtos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              Painel do Mentor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie o catálogo oficial de produtos ativos e inativos exibidos na Academia de Desafios.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar Produto</span>
        </button>
      </div>

      {/* Metric Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#020d14]/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total de Produtos</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#020d14]/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Produtos Ativos</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#020d14]/70 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Produtos Inativos</p>
            <p className="text-2xl font-black text-slate-400 mt-0.5">{inactiveCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#020d14]/60 p-4 rounded-xl border border-slate-800">
        
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, categoria ou pasta..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Categoria: {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
          >
            <option value="Todos">Status: Todos</option>
            <option value="Ativos">Status: Ativos</option>
            <option value="Inativos">Status: Inativos</option>
          </select>
        </div>

      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadProducts}
            className="px-3 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 text-white font-bold text-xs flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-400" />
          <p className="text-xs font-semibold">Carregando Biblioteca de Produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-[#020d14]/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tente ajustar seus termos de pesquisa ou crie um novo produto com o botão acima.
          </p>
        </div>
      ) : (
        /* Products Responsive Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const isAtivo = p.ativo === true || p.ativo === 1;

            return (
              <div
                key={p.id}
                className={`group relative bg-[#020d14]/90 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isAtivo
                    ? 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10'
                    : 'border-slate-800/80 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Image & Status Badge */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={p.imagem_principal}
                    alt={p.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md ${
                        isAtivo
                          ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900/90 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/80 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{p.xp || 25} XP</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/80 text-slate-300 text-[10px] font-semibold border border-slate-700">
                      {p.nivel || 'Fácil'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      <Tag className="w-3 h-3" />
                      <span>{p.categoria}</span>
                    </span>
                    <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                      {p.nome}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex items-center space-x-1.5 truncate">
                    <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{p.pasta}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center space-x-1 transition-colors"
                    title="Editar produto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`p-1.5 rounded-xl border transition-colors flex items-center justify-center ${
                      isAtivo
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                    title={isAtivo ? 'Desativar produto' : 'Ativar produto'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p)}
                    className="p-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 transition-colors flex items-center justify-center"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

    </div>
  );
};
