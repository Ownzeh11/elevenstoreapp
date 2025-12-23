import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { Sale, TableColumn, Product, SaleItem, Service, Transaction } from '../types';
import { ShoppingCart, Eye, RotateCcw, Filter, Plus, X, Loader2, UserPlus, Trash } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { createTransaction, createReversal } from '../utils/finance';

interface SalesPageProps {
  onSaleClick: () => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ onSaleClick }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    total: '0.00',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Sale Items State
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [newItem, setNewItem] = useState({ type: 'product' as 'product' | 'service', id: '', quantity: 1 });

  // Quick Customer State
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');

  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).openModal) {
      handleOpenModal();
      if ((location.state as any).defaultItemType === 'service') {
        setNewItem(prev => ({ ...prev, type: 'service' }));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSaleItems([]);
    setFormData({ customer: '', total: '0.00', date: new Date().toISOString().split('T')[0] });
    setNewItem({ type: 'product', id: '', quantity: 1 });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentCompanyId = companyId;

      if (!currentCompanyId) {
        const { data: userData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          currentCompanyId = userData.company_id;
          setCompanyId(userData.company_id);
        }
      }

      if (currentCompanyId) {
        // Fetch Sales
        const { data: salesData } = await supabase
          .from('sales')
          .select('*')
          .eq('company_id', currentCompanyId)
          .order('created_at', { ascending: false });

        if (salesData) setSales(salesData);

        // Fetch Products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', currentCompanyId)
          .eq('status', 'Em Estoque')
          .order('name');

        if (productsData) setProducts(productsData);

        // Fetch Services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', currentCompanyId)
          .order('name');

        if (servicesData) setServices(servicesData);

        // Fetch Customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', currentCompanyId)
          .order('name');

        if (customersData) setCustomersList(customersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    let itemObj: SaleItem | null = null;

    if (newItem.type === 'product') {
      const product = products.find(p => p.id === newItem.id);
      if (!product) return;
      itemObj = {
        product_id: product.id,
        product_name: product.name,
        quantity: Math.max(1, newItem.quantity),
        unit_price: product.price,
        total_price: product.price * Math.max(1, newItem.quantity)
      };
    } else {
      const service = services.find(s => s.id === newItem.id);
      if (!service) return;
      itemObj = {
        service_id: service.id,
        product_name: service.name, // Reuse product_name for display
        quantity: Math.max(1, newItem.quantity),
        unit_price: service.price,
        total_price: service.price * Math.max(1, newItem.quantity)
      };
    }

    if (itemObj) {
      setSaleItems([...saleItems, itemObj]);
      setNewItem({ ...newItem, id: '', quantity: 1 });
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  // Auto-calc total
  useEffect(() => {
    const total = saleItems.reduce((acc, item) => acc + item.total_price, 0);
    setFormData(prev => ({ ...prev, total: total.toFixed(2) }));
  }, [saleItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setSubmitLoading(true);
    try {
      // 1. Create Sale
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([
        {
          company_id: companyId,
          customer: formData.customer,
          total: parseFloat(formData.total),
          date: formData.date
        }
      ]).select().single();

      if (saleError) throw saleError;

      const newSaleId = saleData.id;

      // 2. Create Sale Items
      if (saleItems.length > 0) {
        const itemsToInsert = saleItems.map(item => ({
          sale_id: newSaleId,
          company_id: companyId,
          product_id: item.product_id || null,
          service_id: item.service_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }


      // 3. Create Financial Transactions (Split by Product and Service)
      const productTotal = saleItems.filter(i => i.product_id).reduce((acc, i) => acc + i.total_price, 0);
      const serviceTotal = saleItems.filter(i => i.service_id).reduce((acc, i) => acc + i.total_price, 0);

      const saleRef = `Venda #${String(saleData.display_id).padStart(4, '0')}`;

      if (productTotal > 0) {
        await createTransaction({
          company_id: companyId,
          description: `${saleRef} (Produtos) - ${formData.customer}`,
          amount: productTotal,
          type: 'income',
          reference_id: newSaleId,
          reference_type: 'sale',
          origin: 'product_sale',
          category: 'product'
        });
      }

      if (serviceTotal > 0) {
        await createTransaction({
          company_id: companyId,
          description: `${saleRef} (Serviços) - ${formData.customer}`,
          amount: serviceTotal,
          type: 'income',
          reference_id: newSaleId,
          reference_type: 'sale',
          origin: 'service_sale',
          category: 'service'
        });
      }

      // If no items (legacy or manual amount), create one unified entry
      if (productTotal === 0 && serviceTotal === 0 && parseFloat(formData.total) > 0) {
        await createTransaction({
          company_id: companyId,
          description: `${saleRef} - ${formData.customer}`,
          amount: parseFloat(formData.total),
          type: 'income',
          reference_id: newSaleId,
          reference_type: 'sale',
          origin: 'manual',
          category: 'other'
        });
      }

      setIsModalOpen(false);
      setFormData({ customer: '', total: '0.00', date: new Date().toISOString().split('T')[0] });
      setSaleItems([]);
      fetchData();
    } catch (error: any) {
      alert('Erro ao registrar venda: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setSubmitLoading(true);
    try {
      const { data, error } = await supabase.from('customers').insert([
        {
          company_id: companyId,
          name: quickCustomerName,
          phone: quickCustomerPhone,
        }
      ]).select();

      if (error) throw error;

      if (data && data[0]) {
        setCustomersList(prev => [...prev, data[0]]);
        setFormData(prev => ({ ...prev, customer: quickCustomerName }));
        alert("Cliente cadastrado com sucesso!");
        setIsCustomerModalOpen(false);
        setQuickCustomerName('');
        setQuickCustomerPhone('');
      }

    } catch (error: any) {
      alert('Erro ao criar cliente: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    // Customer/ID filter
    const matchesSearch = sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sale.display_id).includes(searchTerm.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (startDate || endDate) {
      const saleDate = new Date(sale.date);
      saleDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (saleDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (saleDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesDate;
  });

  const handleViewDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          product:products(name),
          service:services(name)
        `)
        .eq('sale_id', sale.id);

      if (error) throw error;
      setSelectedSaleItems(data || []);
    } catch (error: any) {
      alert('Erro ao buscar detalhes: ' + error.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRefund = async (sale: Sale) => {
    if (confirm(`Tem certeza que deseja estornar a venda ${formatId(sale.display_id)}? Isso gerará registros de estorno e retornará os produtos ao estoque.`)) {
      setLoading(true);
      try {
        // 1. Fetch transactions linked to this sale to create reversals
        const { data: relatedTxs, error: fetchTxError } = await supabase
          .from('transactions')
          .select('*')
          .eq('reference_id', sale.id)
          .eq('reference_type', 'sale');

        if (fetchTxError) throw fetchTxError;

        // 2. Create reversals for each related transaction
        if (relatedTxs && relatedTxs.length > 0) {
          for (const tx of relatedTxs) {
            await createReversal(tx as Transaction);
          }
        } else {
          // Fallback if no reference_id found (legacy sales)
          const txDescription = `Venda ${formatId(sale.display_id)}`;
          const { data: legacyTxs } = await supabase
            .from('transactions')
            .select('*')
            .ilike('description', `%${txDescription}%`);

          if (legacyTxs) {
            for (const tx of legacyTxs) {
              await createReversal(tx as Transaction);
            }
          }
        }

        // 3. Delete sale items to trigger stock restoration (via DB trigger)
        // Note: We DON'T delete the sale if we want strictly immutable history, 
        // but here the user said "Editing a sale... must generate a reversal + a new entry".
        // For refund, we could just mark it as refunded, but the existing code deletes it.
        // Let's stick to generating reversals and deleting the "current" sale record to keep the UI clean,
        // or just mark it. The prompt says "All financial movements must be immutable". 
        // It doesn't explicitly say the 'sales' table must be immutable, but 'financial movements' (transactions) MUST be.

        const { error: itemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', sale.id);

        if (itemsError) throw itemsError;

        const { error: saleError } = await supabase
          .from('sales')
          .delete()
          .eq('id', sale.id);

        if (saleError) throw saleError;

        alert(`Venda ${formatId(sale.display_id)} estornada com sucesso!`);
        fetchData();
      } catch (error: any) {
        alert('Erro ao estornar venda: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatId = (id: number) => {
    return `#${String(id).padStart(4, '0')}`;
  };

  const columns: TableColumn<Sale>[] = [
    {
      key: 'display_id',
      header: 'ID da Venda',
      render: (sale) => <span className="font-medium text-gray-900">{formatId(sale.display_id)}</span>
    },
    { key: 'customer', header: 'Cliente' },
    { key: 'date', header: 'Data', render: (sale) => new Date(sale.date).toLocaleDateString('pt-BR') },
    { key: 'total', header: 'Total', render: (sale) => `R$ ${sale.total.toFixed(2).replace('.', ',')}` },
    {
      key: 'actions',
      header: 'Ações',
      render: (sale) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            aria-label={`Ver Detalhes da venda ${sale.id}`}
            onClick={() => handleViewDetails(sale)}
            className="text-blue-600 hover:text-blue-800"
          >
            Ver Detalhes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            aria-label={`Estornar venda ${sale.id}`}
            onClick={() => handleRefund(sale)}
            className="text-red-600 hover:text-red-800"
          >
            Estornar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 relative">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Input
            id="sale-search"
            type="search"
            placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            icon={Filter}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={isFilterOpen ? 'bg-gray-100' : ''}
          >
            Filtrar
          </Button>
        </div>
        <Button variant="primary" icon={ShoppingCart} onClick={handleOpenModal}>
          Lançar Venda
        </Button>
      </div>

      {isFilterOpen && (
        <Card className="mb-6 bg-gray-50 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-gray-500 hover:text-gray-700"
            >
              Limpar Filtros
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando vendas...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma venda encontrada.</div>
        ) : (
          <Table data={filteredSales} columns={columns} rowKey="id" />
        )}
      </Card>

      {/* New Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lançar Nova Venda</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  list="customers-list"
                  name="customer"
                  required
                  placeholder="Selecione ou digite o nome"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.customer}
                  onChange={handleInputChange}
                />
                <datalist id="customers-list">
                  {customersList.map((c: any) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-indigo-600"
                  title="Novo Cliente Rápido"
                >
                  <UserPlus size={16} />
                </button>
              </div>

              <div className="border-t border-b py-4 my-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Itens da Venda</h4>
                <div className="flex gap-2 mb-2 items-end">
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'product' | 'service', id: '' })}
                    >
                      <option value="product">Produto</option>
                      <option value="service">Serviço</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {newItem.type === 'product' ? 'Produto' : 'Serviço'}
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={newItem.id}
                      onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {newItem.type === 'product' ? (
                        products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} - R$ {p.price.toFixed(2)}
                          </option>
                        ))
                      ) : (
                        services.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} - R$ {s.price.toFixed(2)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="w-16">
                    <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItem.id}
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Items List */}
                <div className="bg-gray-50 rounded-md p-2 max-h-40 overflow-y-auto space-y-2">
                  {saleItems.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">Nenhum item adicionado.</p>
                  ) : (
                    saleItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          <div className="text-gray-500 text-xs">
                            {item.quantity}x R$ {item.unit_price.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">R$ {item.total_price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="total"
                    required
                    readOnly
                    className="w-full rounded-md border-gray-300 shadow-sm bg-gray-100 sm:text-sm p-2 border cursor-not-allowed"
                    value={formData.total}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={submitLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Modal (Nested) */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Novo Cliente Rápido</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={quickCustomerPhone}
                  onChange={(e) => setQuickCustomerPhone(e.target.value)}
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sales Details Modal */}
      {isDetailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalhes da Venda {formatId(selectedSale.display_id)}
              </h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Cliente</p>
                  <p className="font-semibold">{selectedSale.customer}</p>
                </div>
                <div>
                  <p className="text-gray-500">Data</p>
                  <p className="font-semibold">{new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Qtd</th>
                      <th className="px-3 py-2 text-right">Preço</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detailsLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                          Carregando itens...
                        </td>
                      </tr>
                    ) : selectedSaleItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                          Nenhum item encontrado.
                        </td>
                      </tr>
                    ) : (
                      selectedSaleItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-medium">
                            {item.product?.name || item.service?.name || 'Item desconhecido'}
                          </td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">R$ {item.unit_price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold">R$ {item.total_price.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!detailsLoading && (
                    <tfoot className="bg-gray-50 font-bold border-t">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2 text-right">R$ {selectedSale.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;