import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Pill from '../components/ui/Pill';
import { Product, TableColumn } from '../types';
import { Plus, Edit, Trash2, Search, X, Loader2 } from 'lucide-react';
import { PRODUCT_ICONS } from '../constants';
import { supabase } from '../utils/supabaseClient';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Product Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    min_stock: '',
    status: 'Em Estoque',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get current user and company
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch company_id if not set (could actuaalized be optimized)
      if (!companyId) {
        const { data: userData, error: userError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          setCompanyId(userData.company_id);
          // Fetch products for this company
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', userData.company_id)
            .order('created_at', { ascending: false });

          if (productsData) setProducts(productsData);
        }
      } else {
        // Company ID known, just fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (productsData) setProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      alert("Erro: Empresa não identificada.");
      return;
    }

    if (!formData.quantity || !formData.min_stock) {
      alert("Quantidade e Estoque Mínimo são obrigatórios.");
      return;
    }

    setSubmitLoading(true);
    try {
      let error;

      if (editingId) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            quantity: parseInt(formData.quantity) || 0,
            min_stock: parseInt(formData.min_stock) || 0,
            status: formData.status,
            description: formData.description,
          })
          .eq('id', editingId)
          .eq('company_id', companyId);

        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('products').insert([
          {
            company_id: companyId,
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            quantity: parseInt(formData.quantity) || 0,
            min_stock: parseInt(formData.min_stock) || 0,
            status: formData.status,
            description: formData.description,
            icon: 'default'
          }
        ]);
        error = insertError;
      }

      if (error) throw error;

      // Reset and reload
      setIsModalOpen(false);
      setFormData({ name: '', price: '', quantity: '', min_stock: '', status: 'Em Estoque', description: '' });
      setEditingId(null);
      fetchData(); // Refresh list
      alert(editingId ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
    } catch (error: any) {
      alert('Erro ao salvar produto: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setProducts(products.filter((product) => product.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      min_stock: product.min_stock.toString(),
      status: product.status,
      description: product.description || ''
    });
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Em Estoque': return 'success';
      case 'Baixo Estoque': return 'warning';
      case 'Esgotado': return 'danger';
      default: return 'default';
    }
  };

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Produto',
      render: (product) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-xs font-bold text-gray-500">
            {product.name.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{product.name}</span>
        </div>
      ),
    },
    { key: 'quantity', header: 'Qtd' },
    {
      key: 'price',
      header: 'Preço',
      render: (product) => `R$ ${product.price?.toFixed(2)}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <Pill variant={getStatusVariant(product.status)}>
          {product.status}
        </Pill>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (product) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            aria-label={`Editar ${product.name}`}
            onClick={() => handleEdit(product)}
            className="text-blue-600 hover:text-blue-800"
          >
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            aria-label={`Excluir ${product.name}`}
            onClick={() => handleDelete(product.id)}
            className="text-red-600 hover:text-red-800"
          >
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 relative">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <Input
          id="product-search"
          type="search"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs mb-4 sm:mb-0 sm:mr-4"
        />
        <Button variant="primary" icon={Plus} onClick={() => { setEditingId(null); setFormData({ name: '', price: '', quantity: '', min_stock: '', status: 'Em Estoque', description: '' }); setIsModalOpen(true); }}>
          Novo Produto
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando produtos...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum produto cadastrado.</div>
        ) : (
          <Table data={filteredProducts} columns={columns} rowKey="id" />
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', price: '', quantity: '', min_stock: '', status: 'Em Estoque', description: '' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    name="min_stock"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Em Estoque">Em Estoque</option>
                  <option value="Baixo Estoque">Baixo Estoque</option>
                  <option value="Esgotado">Esgotado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', price: '', quantity: '', min_stock: '', status: 'Em Estoque', description: '' }); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;