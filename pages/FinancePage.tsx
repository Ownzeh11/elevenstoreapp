import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Pill from '../components/ui/Pill';
import { Transaction, TableColumn } from '../types';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, X, Loader2, DollarSign, CheckCircle, Clock, Printer, FileText } from 'lucide-react';

import { supabase } from '../utils/supabaseClient';
import { createTransaction, createReversal } from '../utils/finance';

const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'receivables' | 'categories'>('cashflow');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dbCategories, setDbCategories] = useState<any[]>([]);


  // New Transaction Form
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    status: 'paid' as 'paid' | 'pending',
    due_date: new Date().toISOString().split('T')[0]
  });


  // Totals
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [pendingReceivables, setPendingReceivables] = useState(0);

  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/finance/categories') {
      setActiveTab('categories');
    } else if (location.state && (location.state as any).openModal) {
      handleOpenModal();
      if ((location.state as any).type) {
        setFormData(prev => ({ ...prev, type: (location.state as any).type }));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchData();
  }, []);

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
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('*')
          .eq('company_id', currentCompanyId)
          .order('created_at', { ascending: false });

        if (transactionData) {
          const typedData = transactionData as Transaction[];
          setTransactions(typedData);

          // Calculate totals (only paid for balance)
          // Net Income = Sum(Income) - Sum(Expense from Reversals)
          // Net Expense = Sum(Expense) - Sum(Income from Reversals)

          const rawIncome = typedData
            .filter(t => t.type === 'income' && (t.status === 'paid' || !t.status) && t.reference_type !== 'reversal')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          const reversalExpenses = typedData
            .filter(t => t.type === 'expense' && (t.status === 'paid' || !t.status) && t.reference_type === 'reversal')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          const rawExpense = typedData
            .filter(t => t.type === 'expense' && (t.status === 'paid' || !t.status) && t.reference_type !== 'reversal')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          const reversalIncomes = typedData
            .filter(t => t.type === 'income' && (t.status === 'paid' || !t.status) && t.reference_type === 'reversal')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          const income = rawIncome - reversalExpenses;
          const expense = rawExpense - reversalIncomes;

          const pending = typedData
            .filter(t => t.type === 'income' && t.status === 'pending' && t.reference_type !== 'reversal')
            .filter(t => !typedData.some(rev => rev.reference_id === t.id && rev.reference_type === 'reversal'))
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          setTotalIncome(income);
          setTotalExpense(expense);
          setCashBalance(income - expense);
          setPendingReceivables(pending);
        }

        // Fetch categories
        const { data: categoryData } = await supabase
          .from('transaction_categories')
          .select('*')
          .eq('company_id', currentCompanyId)
          .order('name');

        if (categoryData) {
          setDbCategories(categoryData);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    const amount = parseFloat(formData.amount) || 0;

    if (formData.type === 'expense' && amount > cashBalance) {
      if (!confirm(`Atenção: Esta despesa (R$ ${amount.toFixed(2)}) ultrapassa o saldo atual em caixa (R$ ${cashBalance.toFixed(2)}). Deseja continuar mesmo assim?`)) {
        return;
      }
    }

    setSubmitLoading(true);
    try {
      if (editingId) {
        const oldTx = transactions.find(t => t.id === editingId);
        if (oldTx) {
          await createReversal(oldTx);
          await createTransaction({
            company_id: companyId,
            description: formData.description,
            amount: amount,
            type: formData.type,
            reference_id: oldTx.id,
            reference_type: 'manual',
            origin: 'manual',
            category: formData.category || 'other',
            status: formData.status,
            due_date: formData.due_date
          });
        }
      } else {
        await createTransaction({
          company_id: companyId,
          description: formData.description,
          amount: amount,
          type: formData.type,
          reference_type: 'manual',
          origin: 'manual',
          category: formData.category || 'other',
          status: formData.status,
          due_date: formData.due_date
        });
      }


      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ description: '', amount: '', type: 'income', category: '', status: 'paid', due_date: new Date().toISOString().split('T')[0] });
      fetchData();

    } catch (error: any) {
      alert('Erro ao salvar transação: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid' })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Erro ao confirmar recebimento: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja estornar este registro?')) {
      try {
        const txToDelete = transactions.find(t => t.id === id);
        if (txToDelete) {
          await createReversal(txToDelete);
          fetchData();
        }
      } catch (error: any) {
        alert('Erro ao estornar: ' + error.message);
      }
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category || '',
      status: transaction.status || 'paid',
      due_date: transaction.due_date || new Date().toISOString().split('T')[0]
    });

    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ description: '', amount: '', type: 'income', category: '', status: 'paid', due_date: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);

  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || t.category === categoryFilter;

    if (activeTab === 'cashflow') {
      return matchesSearch && matchesCategory && (t.status === 'paid' || !t.status);
    } else if (activeTab === 'receivables') {
      // For receivables, show pending income that hasn't been reversed
      const isReversed = transactions.some(rev =>
        rev.reference_id === t.id &&
        rev.reference_type === 'reversal'
      );
      return matchesSearch && matchesCategory && t.status === 'pending' && t.type === 'income' && !isReversed && t.reference_type !== 'reversal';
    }
    return false;
  });

  // Keep datalist options but also add DB categories
  const allCategoryNames = Array.from(new Set([
    ...transactions.map(t => t.category),
    ...dbCategories.map(c => c.name),
    'Aluguel', 'Salário', 'Marketing', 'Fornecedores', 'Infraestrutura', 'Impostos', 'Manutenção', 'Vendas'
  ].filter(Boolean))) as string[];


  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const columns: TableColumn<Transaction>[] = [
    {
      key: 'due_date',
      header: activeTab === 'cashflow' ? 'Data' : 'Vencimento',
      render: (t) => formatDate(t.due_date || t.created_at)
    },
    { key: 'description', header: 'Descrição', cellClassName: 'font-medium' },
    { key: 'category', header: 'Categoria', render: (t) => t.category || '-' },
    { key: 'amount', header: 'Valor', render: (t) => formatCurrency(t.amount) },

    {
      key: 'actions',
      header: 'Ações',
      render: (t) => (
        <div className="flex space-x-2">
          {t.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              icon={CheckCircle}
              onClick={() => handleReceive(t.id)}
              className="text-green-600 hover:text-green-800"
              title="Receber"
            />
          )}
          {t.reference_type !== 'reversal' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={Edit}
                onClick={() => handleEdit(t)}
                className="text-blue-600 hover:text-blue-800"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => handleDelete(t.id)}
                className="text-red-600 hover:text-red-800"
              />
            </>
          )}
        </div>

      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 relative max-w-7xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-indigo-50 border-indigo-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Saldo em Caixa</h3>
            <DollarSign size={20} className="text-indigo-600" />
          </div>
          <div>
            <div className={`text-2xl font-bold mt-2 ${cashBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(cashBalance)}
            </div>
            <p className="text-xs text-indigo-500 mt-1">Líquido confirmado</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Receitas (Confirmadas)</h3>
            <ArrowUp size={20} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-gray-900">{formatCurrency(totalIncome)}</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Despesas (Pagas)</h3>
            <ArrowDown size={20} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-gray-900">{formatCurrency(totalExpense)}</div>
        </Card>

        <Card className="bg-amber-50 border-amber-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">A Receber</h3>
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold mt-2 text-gray-900">{formatCurrency(pendingReceivables)}</div>
            <p className="text-xs text-amber-600 mt-1">Vendas parceladas/pendentes</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex p-4 pb-0 bg-gray-50/50">
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'cashflow'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Fluxo de Caixa
            </button>
            <button
              onClick={() => setActiveTab('receivables')}
              className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'receivables'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Contas a Receber
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Categorias
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'categories' ? (
            <CategoryManager companyId={companyId!} onUpdate={fetchData} />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeTab === 'cashflow' ? 'Movimentações Realizadas' : 'Futuros Recebimentos'}
                </h2>
                <div className="flex w-full sm:w-auto gap-3">
                  <select
                    className="w-full sm:w-48 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Todas Categorias</option>
                    {allCategoryNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <Input
                    id="search"
                    type="search"
                    placeholder="Buscar descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    variant="secondary"
                    icon={FileText}
                    onClick={() => setIsReportOpen(true)}
                  >
                    Relatório
                  </Button>
                  <Button variant="primary" icon={Plus} onClick={handleOpenModal}>
                    Nova Transação
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-20 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhuma transação encontrada nesta categoria.
                </div>
              ) : (
                <Table data={filteredTransactions} columns={columns} rowKey="id" />
              )}
            </>
          )}
        </div>

      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <Input
                id="description"
                label="Descrição"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Ex: Aluguel, Venda de Produto..."
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="amount"
                  label="Valor (R$)"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                />

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Tipo</label>
                  <select
                    name="type"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="income">Receita (Entrada)</option>
                    <option value="expense">Despesa (Saída)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Categoria</label>
                <input
                  list="categories-list"
                  name="category"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Ex: Aluguel, Salário, Marketing..."
                />
                <datalist id="categories-list">
                  {allCategoryNames.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <select
                    name="status"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="paid">Confirmado / Pago</option>
                    <option value="pending">Pendente (Agendado)</option>
                  </select>
                </div>

                <Input
                  id="due_date"
                  label="Data / Vencimento"
                  name="due_date"
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={submitLoading}>
                  {submitLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Relatório */}
      {isReportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 px-4 print-container">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Relatório Financeiro</h3>
                <p className="text-sm text-gray-500">Posição em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="hidden sm:flex"
                >
                  Imprimir
                </Button>
                <button onClick={() => setIsReportOpen(false)} className="text-gray-400 hover:text-gray-600 print:hidden">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow print-area" id="finance-report-print">
              {/* Cabeçalho exclusivo para impressão */}
              <div className="hidden print:block mb-8">
                <div className="flex justify-between items-end border-b-2 border-gray-900 pb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">Fluxo de Caixa</h1>
                    <p className="text-gray-600 mt-1">Movimentações financeiras da empresa</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 print:border print:p-4 print:rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Receitas (Confirmadas)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Despesas (Pagas)</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="col-span-2 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Saldo Final</p>
                  <p className={`text-3xl font-bold ${cashBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(cashBalance)}
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 print:border-gray-900">
                    <th className="py-3 font-semibold text-gray-700 print:text-gray-900">Data</th>
                    <th className="py-3 font-semibold text-gray-700 print:text-gray-900">Descrição</th>
                    <th className="py-3 font-semibold text-gray-700 print:text-gray-900">Categoria</th>
                    <th className="py-3 font-semibold text-gray-700 text-right print:text-gray-900">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 print:divide-gray-200">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-gray-700">{formatDate(t.due_date || t.created_at)}</td>
                      <td className="py-4">
                        <p className={`font-medium ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                          {t.description}
                        </p>
                      </td>
                      <td className="py-4 text-gray-700">{t.category || '-'}</td>
                      <td className={`py-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="hidden print:block mt-16 text-center text-xs text-gray-400 border-t pt-8">
                <p>Este relatório é para uso interno e reflete a posição do caixa no momento da geração.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end shrink-0 print:hidden">
              <Button onClick={() => setIsReportOpen(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          aside, header, footer, button, .print\\:hidden {
            display: none !important;
          }

          .md\\:ml-64, main, #root {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .p-4.md\\:p-8 > *:not(.print-container), 
          .grid, 
          .shadow-2xl:not(.print-container),
          .max-w-7xl > *:not(.print-container) {
            display: none !important;
          }

          .print-area {
            position: relative !important;
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            visibility: visible !important;
          }

          .fixed {
            position: relative !important;
            display: block !important;
            background: white !important;
            z-index: auto !important;
          }

          .bg-black, .bg-opacity-50 {
            display: none !important;
          }

          #finance-report-print, 
          #finance-report-print * {
            visibility: visible !important;
          }
          
          table {
            width: 100% !important;
            border-spacing: 0 !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            border-bottom: 1px solid #eee !important;
          }
        }
      `}} />
    </div>
  );
};


const CategoryManager: React.FC<{ companyId: string, onUpdate: () => void }> = ({ companyId, onUpdate }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense' | 'both'>('both');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchCategories();
  }, [companyId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('transaction_categories')
          .update({ name: newName.trim(), type: newType })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transaction_categories')
          .insert([{ company_id: companyId, name: newName.trim(), type: newType }]);
        if (error) throw error;
      }

      setNewName('');
      setNewType('both');
      setEditingId(null);
      fetchCategories();
      onUpdate();
    } catch (error: any) {
      alert('Erro ao salvar categoria: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso não apagará as transações já existentes com esta categoria.')) return;

    try {
      const { error } = await supabase
        .from('transaction_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
      onUpdate();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleEdit = (cat: any) => {
    setNewName(cat.name);
    setNewType(cat.type);
    setEditingId(cat.id);
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('Deseja inicializar com as categorias padrão (Aluguel, Salário, Internet, etc.)?')) return;

    const defaults = [
      { name: 'Aluguel', type: 'expense' },
      { name: 'Salário', type: 'expense' },
      { name: 'Marketing', type: 'expense' },
      { name: 'Internet/Telefone', type: 'expense' },
      { name: 'Limpeza', type: 'expense' },
      { name: 'Fornecedores', type: 'expense' },
      { name: 'Energia/Água', type: 'expense' },
      { name: 'Venda de Produtos', type: 'income' },
      { name: 'Serviços Automotivos', type: 'income' },
    ];

    try {
      setLoading(true);
      const payload = defaults.map(d => ({ ...d, company_id: companyId }));
      const { error } = await supabase.from('transaction_categories').insert(payload);
      if (error) throw error;
      fetchCategories();
      onUpdate();
    } catch (error: any) {
      alert('Erro ao inicializar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!companyId) return <div className="p-12 text-center text-gray-500">Buscando informações da empresa...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-50 border-gray-200">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-semibold text-gray-700">
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </label>
            <Input
              id="cat-name"
              placeholder="Ex: Aluguel, Internet..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48 space-y-1">
            <label className="block text-sm font-semibold text-gray-700">Tipo</label>
            <select
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              value={newType}
              onChange={e => setNewType(e.target.value as any)}
            >
              <option value="both">Ambos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {editingId && (
              <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setNewName(''); }}>Cancelar</Button>
            )}
            <Button type="submit" variant="primary" icon={editingId ? CheckCircle : Plus}>
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Card key={cat.id} className="flex justify-between items-center p-4 hover:shadow-md transition-shadow group">
                <div>
                  <p className="font-bold text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">
                    {cat.type === 'both' ? 'Receita & Despesa' : cat.type === 'income' ? 'Receita' : 'Despesa'}
                  </p>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Edit}
                    onClick={() => handleEdit(cat)}
                    className="text-blue-400 hover:text-blue-600"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(cat.id)}
                    className="text-gray-400 hover:text-red-600"
                  />
                </div>
              </Card>
            ))}
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 mb-4 italic">Nenhuma categoria personalizada cadastrada.</p>
              <Button variant="secondary" size="sm" icon={Plus} onClick={handleInitializeDefaults}>
                Inicializar Categorias Padrão
              </Button>
            </div>
          ) : (
            <div className="flex justify-center pt-4">
              <button onClick={handleInitializeDefaults} className="text-xs text-indigo-600 hover:underline">Adicionar padrões faltantes</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancePage;