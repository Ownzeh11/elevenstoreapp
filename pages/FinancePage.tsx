import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Pill from '../components/ui/Pill';
import { Transaction, TableColumn } from '../types';
import { Plus, Edit, Trash2, ShoppingCart, Wrench, ArrowUp, ArrowDown, X, Loader2, DollarSign } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { createTransaction, createReversal, fetchTotalBalance } from '../utils/finance';

interface FinancePageProps {
  onServiceClick?: () => void;
  onSaleClick?: () => void;
}

const FinancePage: React.FC<FinancePageProps> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Transaction Form
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
  });

  // Totals
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);

  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).openModal) {
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

          // Calculate totals
          const income = typedData
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
          const expense = typedData
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

          setTotalIncome(income);
          setTotalExpense(expense);
          setCashBalance(income - expense);
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

    // Safeguard: Prevent expense if it exceeds balance
    if (formData.type === 'expense' && amount > cashBalance) {
      if (!confirm(`Atenção: Esta despesa (R$ ${amount.toFixed(2)}) ultrapassa o saldo atual em caixa (R$ ${cashBalance.toFixed(2)}). Deseja continuar mesmo assim?`)) {
        return;
      }
    }

    setSubmitLoading(true);
    try {
      if (editingId) {
        // Immutability: Reversal of old transaction + New transaction
        const oldTx = transactions.find(t => t.id === editingId);
        if (oldTx) {
          await createReversal(oldTx);
          await createTransaction({
            company_id: companyId,
            description: formData.description,
            amount: amount,
            type: formData.type,
            reference_id: oldTx.id,
            reference_type: 'manual', // Manual edit tracking
            origin: 'manual',
            category: 'other'
          });
        }
      } else {
        // Insert new
        await createTransaction({
          company_id: companyId,
          description: formData.description,
          amount: amount,
          type: formData.type,
          reference_type: 'manual',
          origin: 'manual',
          category: 'other'
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ description: '', amount: '', type: 'income' });
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar transação: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja estornar este registro? Todos os movimentos financeiros são mantidos para integridade.')) {
      try {
        const txToDelete = transactions.find(t => t.id === id);
        if (txToDelete) {
          await createReversal(txToDelete);
          // Instead of deleting, we let it stay but effectively neutralized by the reversal.
          // However, if the user really wants it GONE from the list, we'd need a 'deleted' flag.
          // The prompt says "All financial movements must be immutable (no silent overwrites)".
          // I will refresh the data. The reversal will appear in the stream.
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
    });
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ description: '', amount: '', type: 'income' });
    setIsModalOpen(true);
  };

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionTypeVariant = (type: string) => {
    return type === 'income' ? 'success' : 'danger';
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', type: 'income' });
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const columns: TableColumn<Transaction>[] = [
    { key: 'created_at', header: 'Data', render: (t) => formatDate(t.created_at) },
    { key: 'description', header: 'Descrição', cellClassName: 'font-medium' },
    {
      key: 'type',
      header: 'Tipo',
      render: (t) => (
        <Pill variant={getTransactionTypeVariant(t.type)}>
          {t.type === 'income' ? 'Receita' : 'Despesa'}
        </Pill>
      ),
    },
    { key: 'amount', header: 'Valor', render: (t) => formatCurrency(t.amount) },
    {
      key: 'actions',
      header: 'Ações',
      render: (transaction) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            aria-label={`Editar ${transaction.description}`}
            onClick={() => handleEdit(transaction)}
            className="text-blue-600 hover:text-blue-800"
          >
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            aria-label={`Excluir ${transaction.description}`}
            onClick={() => handleDelete(transaction.id)}
            className="text-red-600 hover:text-red-800"
          >
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 relative">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="flex flex-col bg-indigo-50 border-indigo-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-semibold text-indigo-700">Saldo Geral (Caixa)</h3>
            <DollarSign className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline mb-1">
            <span className={`text-2xl font-bold ${cashBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashBalance)}
            </span>
          </div>
          <p className="text-xs text-indigo-500 mt-2">Soma de todas entradas e saídas</p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-medium text-gray-500">Receitas Totais</h3>
            <ArrowUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalIncome)}
            </span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-medium text-gray-500">Despesas Totais</h3>
            <ArrowDown className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalExpense)}
            </span>
          </div>
        </Card>
      </div>

      {/* Entry Records */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 sm:mb-0">Registros Financeiros</h2>
          <Input
            id="transaction-search"
            type="search"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs mb-4 sm:mb-0 sm:mr-4"
          />
          <Button variant="primary" icon={Plus} onClick={handleOpenModal}>
            Novo Registro
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando finanças...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
        ) : (
          <Table data={filteredTransactions} columns={columns} rowKey="id" />
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  name="description"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.amount}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    name="type"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
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

export default FinancePage;