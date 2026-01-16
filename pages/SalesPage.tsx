import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { Sale, TableColumn, Product, SaleItem, Service, Transaction } from '../types';
import { ShoppingCart, Eye, RotateCcw, Filter, Plus, X, Loader2, UserPlus, Trash, Tag, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { createTransaction, createReversal } from '../utils/finance';

interface SalesPageProps {
  onSaleClick: () => void;
}

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

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
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [saleInstallments, setSaleInstallments] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false); // This one is still used for sale_items fetching

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    subtotal: '0.00',
    discount_value: '0',
    discount_type: 'amount' as 'amount' | 'percentage',
    total: '0.00',
    date: getLocalDateString(),
    payment_method: 'dinheiro' as 'dinheiro' | 'cartão' | 'pix',
    installments: '1',
    down_payment: ''
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
    setFormData({
      customer: '',
      subtotal: '0.00',
      discount_value: '0',
      discount_type: 'amount',
      total: '0.00',
      date: getLocalDateString(new Date()),
      payment_method: 'dinheiro',
      installments: '1',
      down_payment: ''
    });
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
    const subtotal = saleItems.reduce((acc, item) => acc + item.total_price, 0);
    const discountVal = parseFloat(formData.discount_value) || 0;
    let total = subtotal;

    if (formData.discount_type === 'percentage') {
      total = subtotal * (1 - discountVal / 100);
    } else {
      total = subtotal - discountVal;
    }

    setFormData(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      total: Math.max(0, total).toFixed(2)
    }));
  }, [saleItems, formData.discount_value, formData.discount_type]);

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
          subtotal: parseFloat(formData.subtotal),
          discount_value: parseFloat(formData.discount_value),
          discount_type: formData.discount_type,
          total: parseFloat(formData.total),
          date: formData.date,
          payment_method: formData.payment_method,
          installments: parseInt(formData.installments) || 1,
          down_payment: parseFloat(formData.down_payment) || 0
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
      const saleRef = `Venda #${String(saleData.display_id).padStart(4, '0')}`;
      const installmentsCount = parseInt(formData.installments) || 1;
      const downPaymentValue = parseFloat(formData.down_payment) || 0;

      // Calculate totals for splitting
      const finalTotal = parseFloat(formData.total);
      const amountToInstall = finalTotal - downPaymentValue;

      // 1. Handle Down Payment
      if (downPaymentValue > 0) {
        // Find which part (product/service) the down payment belongs to proportionally
        const productTotal = saleItems.filter(it => it.product_id).reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        const serviceTotal = saleItems.filter(it => it.service_id).reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        const subtotal = productTotal + serviceTotal;

        const ratioProduct = subtotal > 0 ? productTotal / subtotal : 0.5;
        const ratioService = subtotal > 0 ? serviceTotal / subtotal : 0.5;

        if (productTotal > 0) {
          await createTransaction({
            company_id: companyId,
            description: `${saleRef} (Entrada - Prod) - ${formData.customer}`,
            amount: downPaymentValue * ratioProduct,
            type: 'income',
            reference_id: newSaleId,
            reference_type: 'sale',
            origin: 'product_sale',
            category: 'Vendas',
            status: 'paid',
            due_date: formData.date
          });
        }
        if (serviceTotal > 0) {
          await createTransaction({
            company_id: companyId,
            description: `${saleRef} (Entrada - Serv) - ${formData.customer}`,
            amount: downPaymentValue * ratioService,
            type: 'income',
            reference_id: newSaleId,
            reference_type: 'sale',
            origin: 'service_sale',
            category: 'Vendas',
            status: 'paid',
            due_date: formData.date
          });
        }
      }

      // 2. Handle Installments
      if (amountToInstall > 0) {
        const installmentsToCreate = installmentsCount;
        const amountPerInstalment = amountToInstall / installmentsToCreate;

        const productTotal = saleItems.filter(it => it.product_id).reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        const serviceTotal = saleItems.filter(it => it.service_id).reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        const subtotal = productTotal + serviceTotal;

        const ratioProduct = subtotal > 0 ? productTotal / subtotal : 1;
        const ratioService = subtotal > 0 ? serviceTotal / subtotal : 0;

        const [year, month, day] = formData.date.split('-').map(Number);

        for (let i = 0; i < installmentsToCreate; i++) {
          // Increment by 30 days per installment
          const dueDate = new Date(year, month - 1, day + ((i + 1) * 30));
          const dueDateStr = getLocalDateString(dueDate);

          // If 1 installment and no down payment and NOT credit card, mark as paid
          // Otherwise, follow the rule: Cartier/Promissoria/Pix installments are pending, except first cash/pix installment
          const isFirstInstallment = i === 0;
          let status: 'paid' | 'pending' = 'pending';

          if (downPaymentValue === 0 && isFirstInstallment && installmentsCount === 1 && (formData.payment_method === 'dinheiro' || formData.payment_method === 'pix')) {
            status = 'paid';
          }

          if (productTotal > 0) {
            await createTransaction({
              company_id: companyId,
              description: `${saleRef} (Prod) ${i + 1}/${installmentsToCreate} - ${formData.customer}`,
              amount: amountPerInstalment * ratioProduct,
              type: 'income',
              reference_id: newSaleId,
              reference_type: 'sale',
              origin: 'product_sale',
              category: 'Vendas',
              status: status,
              due_date: dueDateStr
            });
          }

          if (serviceTotal > 0) {
            await createTransaction({
              company_id: companyId,
              description: `${saleRef} (Serv) ${i + 1}/${installmentsToCreate} - ${formData.customer}`,
              amount: amountPerInstalment * ratioService,
              type: 'income',
              reference_id: newSaleId,
              reference_type: 'sale',
              origin: 'service_sale',
              category: 'Vendas',
              status: status,
              due_date: dueDateStr
            });
          }
        }
      }

      setIsModalOpen(false);
      setFormData({
        customer: '',
        subtotal: '0.00',
        discount_value: '0',
        discount_type: 'amount',
        total: '0.00',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'dinheiro',
        installments: '1',
        down_payment: ''
      });
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
      // Use string comparison for YYYY-MM-DD
      if (startDate && sale.date < startDate) matchesDate = false;
      if (endDate && sale.date > endDate) matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  // Calculate period stats
  const periodStats = filteredSales.reduce((acc, sale) => {
    const subtotal = sale.subtotal || sale.total;
    acc.count += 1;
    acc.subtotal += subtotal;
    acc.discount += subtotal - sale.total;
    acc.total += sale.total;
    return acc;
  }, { count: 0, subtotal: 0, discount: 0, total: 0 });

  const fetchSaleDetails = async (sale: Sale) => {
    try {
      setLoadingDetails(true);
      setSelectedSaleDetail(sale);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', sale.id)
        .eq('reference_type', 'sale')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setSaleInstallments(transactions || []);
    } catch (error) {
      console.error('Error fetching sale details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (sale: Sale) => {
    setIsDetailsModalOpen(true);
    setDetailsLoading(true); // For sale_items
    await fetchSaleDetails(sale); // For transactions/installments
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
        // This includes installments (reference_type='sale' and reference_id=sale.id)
        const { data: relatedTxs, error: fetchTxError } = await supabase
          .from('transactions')
          .select('*')
          .eq('reference_id', sale.id);

        if (fetchTxError) throw fetchTxError;

        // 2. Create reversals for each related transaction
        if (relatedTxs && relatedTxs.length > 0) {
          for (const tx of relatedTxs) {
            // Check if a reversal already exists for this transaction to avoid duplicates
            const { data: existingReversal } = await supabase
              .from('transactions')
              .select('id')
              .eq('reference_id', tx.id)
              .eq('reference_type', 'reversal')
              .maybeSingle();

            if (!existingReversal) {
              await createReversal(tx as Transaction);
            }
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
    { key: 'date', header: 'Data', render: (sale) => formatDateDisplay(sale.date) },
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
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 pb-6 border-b border-gray-200">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</span>
                <ShoppingCart size={16} className="text-blue-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">{periodStats.count}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bruto</span>
                <DollarSign size={16} className="text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">R$ {periodStats.subtotal.toFixed(2).replace('.', ',')}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Descontos</span>
                <Tag size={16} className="text-red-400" />
              </div>
              <div className="text-xl font-bold text-red-600">R$ {periodStats.discount.toFixed(2).replace('.', ',')}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Líquido</span>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <div className="text-xl font-bold text-indigo-700">R$ {periodStats.total.toFixed(2).replace('.', ',')}</div>
            </div>
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
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cliente</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="customers-list"
                      name="customer"
                      required
                      placeholder="Selecione ou digite o nome"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border pr-8"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                      title="Novo Cliente Rápido"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Itens da Venda</h4>
                  <div className="flex gap-2 mb-2 items-end">
                    <div className="w-20">
                      <label className="block text-[10px] text-gray-500 mb-0.5">Tipo</label>
                      <select
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-1.5 border"
                        value={newItem.type}
                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'product' | 'service', id: '' })}
                      >
                        <option value="product">Prod</option>
                        <option value="service">Serv</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        {newItem.type === 'product' ? 'Produto' : 'Serviço'}
                      </label>
                      <select
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-1.5 border"
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
                    <div className="w-12">
                      <label className="block text-[10px] text-gray-500 mb-0.5">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-1.5 border"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newItem.id}
                      className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 shadow-sm"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="bg-white rounded border border-gray-200 p-1 max-h-32 overflow-y-auto space-y-1">
                    {saleItems.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-2">Nenhum item adicionado.</p>
                    ) : (
                      saleItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] bg-gray-50/50 p-1.5 rounded border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="font-medium text-gray-700 block truncate">{item.product_name}</span>
                            <div className="text-gray-400 text-[10px]">
                              {item.quantity}un x R$ {item.unit_price.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">R$ {item.total_price.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Desconto</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        name="discount_value"
                        className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                        value={formData.discount_value}
                        onChange={handleInputChange}
                      />
                      <select
                        name="discount_type"
                        className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border bg-gray-50"
                        value={formData.discount_type}
                        onChange={handleInputChange}
                      >
                        <option value="amount">R$</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1 text-right">Subtotal (R$)</label>
                    <input
                      type="number"
                      readOnly
                      className="w-full rounded-md border-gray-200 shadow-none bg-gray-50 text-gray-500 text-xs p-2 border text-right cursor-not-allowed"
                      value={formData.subtotal}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="total"
                      required
                      readOnly
                      className="w-full rounded-md border-gray-300 shadow-sm bg-indigo-50 text-indigo-700 font-bold text-base p-2 border cursor-not-allowed"
                      value={formData.total}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data</label>
                    <input
                      type="date"
                      name="date"
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                      value={formData.date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Forma de Pagamento</label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartão">Cartão</option>
                      <option value="pix">Pix</option>
                      <option value="promissória">Promissória</option>
                    </select>
                  </div>
                  {/* Conditionally show installments for Cartão and Promissória in the SAME row */}
                  {(formData.payment_method === 'cartão' || formData.payment_method === 'promissória') && (
                    <div className="animate-in slide-in-from-right-2 duration-200">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Parcelas</label>
                      <select
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2 border"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Second row for Entrada if Parcelas > 1 */}
                {(formData.payment_method === 'cartão' || formData.payment_method === 'promissória') && parseInt(formData.installments) > 1 && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entrada (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                      placeholder="0,00"
                      value={formData.down_payment}
                      onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
                    />
                  </div>
                )}

              </div>

              <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
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
        </div >
      )}

      {/* New Customer Modal (Nested) */}
      {
        isCustomerModalOpen && (
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
        )
      }
      {/* Sales Details Modal */}
      {
        isDetailsModalOpen && selectedSaleDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

              <div className="flex justify-between items-center p-3 border-b bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">
                  Venda {formatId(selectedSaleDetail.display_id)}
                </h3>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Cliente</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedSaleDetail.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Data</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateDisplay(selectedSaleDetail.date)}</p>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-center w-12">Qtd</th>
                        <th className="px-3 py-2 text-right">Preço</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailsLoading ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-400 italic">
                            Carregando itens...
                          </td>
                        </tr>
                      ) : selectedSaleItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                            Nenhum item encontrado.
                          </td>
                        </tr>
                      ) : (
                        selectedSaleItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-3 py-1.5 font-medium text-gray-700">
                              {item.product?.name || item.service?.name || 'Item desconhecido'}
                            </td>
                            <td className="px-3 py-1.5 text-center text-gray-500">{item.quantity}</td>
                            <td className="px-3 py-1.5 text-right text-gray-500">R$ {item.unit_price.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-gray-900">R$ {item.total_price.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {!detailsLoading && (
                      <tfoot className="bg-gray-50/50 border-t border-gray-100 text-[11px]">
                        {selectedSaleDetail.discount_value > 0 && (
                          <>
                            <tr className="text-gray-500">
                              <td colSpan={3} className="px-3 py-1 text-right">Subtotal:</td>
                              <td className="px-3 py-1 text-right">R$ {(selectedSaleDetail.total + (selectedSaleDetail.discount_type === 'percentage' ? (selectedSaleDetail.total / (1 - selectedSaleDetail.discount_value / 100)) * (selectedSaleDetail.discount_value / 100) : selectedSaleDetail.discount_value)).toFixed(2)}</td>
                            </tr>
                            <tr className="text-red-500">
                              <td colSpan={3} className="px-3 py-1 text-right">Desconto ({selectedSaleDetail.discount_type === 'percentage' ? `${selectedSaleDetail.discount_value}%` : `R$ ${selectedSaleDetail.discount_value.toFixed(2)}`}):</td>
                              <td className="px-3 py-1 text-right">- R$ {(selectedSaleDetail.discount_type === 'percentage' ? (selectedSaleDetail.total / (1 - selectedSaleDetail.discount_value / 100)) * (selectedSaleDetail.discount_value / 100) : selectedSaleDetail.discount_value).toFixed(2)}</td>
                            </tr>
                          </>
                        )}
                        <tr className="font-bold text-indigo-700 bg-indigo-50/30 text-xs border-t border-indigo-100">
                          <td colSpan={3} className="px-3 py-2 text-right uppercase tracking-wider">Total:</td>
                          <td className="px-3 py-2 text-right text-sm">R$ {selectedSaleDetail.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Pagamento</p>
                      <p className="text-xs font-semibold text-gray-700 capitalize flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                        {selectedSaleDetail.payment_method}
                      </p>
                    </div>
                    {selectedSaleDetail.installments > 1 && (
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Plano</p>
                        <p className="text-xs font-semibold text-gray-700">
                          {selectedSaleDetail.installments}x {selectedSaleDetail.down_payment ? `(entrada R$ ${selectedSaleDetail.down_payment.toFixed(2)})` : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {saleInstallments.length > 0 && (
                    <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-100">
                      <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-indigo-500" />
                        Cronograma de Recebimento
                      </h4>
                      <div className="max-h-32 overflow-y-auto pr-1">
                        <table className="w-full text-[10px] text-left">
                          <thead>
                            <tr className="text-gray-400 font-bold border-b border-gray-100 uppercase tracking-tighter">
                              <th className="py-1">Data</th>
                              <th className="py-1">Descrição</th>
                              <th className="py-1 text-right">Valor</th>
                              <th className="py-1 text-center">Sta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {saleInstallments.map((inst, idx) => (
                              <tr key={inst.id} className="text-gray-600 hover:bg-white transition-colors">
                                <td className="py-1.5 font-medium">{inst.due_date ? new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                <td className="py-1.5 truncate max-w-[90px]" title={inst.description}>
                                  {inst.description.includes('(') ? inst.description.split(')')[1].trim() : inst.description}
                                </td>
                                <td className="py-1.5 text-right font-bold text-gray-900">R$ {inst.amount.toFixed(2)}</td>
                                <td className="py-1.5 text-center">
                                  <span className={`px-1 py-0.5 rounded-[3px] text-[8px] font-bold uppercase ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {inst.status === 'paid' ? 'Ok' : '...'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 border-t flex justify-end bg-gray-50/50">
                <Button
                  onClick={() => setIsDetailsModalOpen(false)}
                  variant="primary"
                  size="sm"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};


export default SalesPage;