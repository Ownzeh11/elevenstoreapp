import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { RecentActivity, SummaryCardData, Sale, Service } from '../types';
import {
  ShoppingCart,
  Wrench,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  UserPlus,
  DollarSign
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface DashboardPageProps {
  onServiceClick: () => void;
  onSaleClick: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onServiceClick, onSaleClick }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState({
    cashBalance: 0,
    salesToday: 0,
    servicesToday: 0,
    expensesToday: 0,
    customersTotal: 0,
    productsLow: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userData) return;
      const companyId = userData.company_id;

      // 1. Fetch Sales (Global to get unique customers, but we can also use customers table)
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // 2. Fetch All Transactions for Balance
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, type, category, created_at, reference_type, status')
        .eq('company_id', companyId);

      // 3. Fetch Low Stock Products
      const { data: allProducts } = await supabase
        .from('products')
        .select('quantity, min_stock')
        .eq('company_id', companyId);

      const lowStockCount = allProducts?.filter(p => p.quantity < p.min_stock).length || 0;

      // 4. Fetch Customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // 5. Build Activities (Latest 10 combined)
      const { data: latestTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      const combinedActivities: RecentActivity[] = [];

      latestTransactions?.forEach((tx: any) => {
        combinedActivities.push({
          id: tx.id,
          type: tx.category === 'service' ? 'Serviço' : 'Venda',
          description: tx.description,
          amount: tx.amount,
          timeAgo: new Date(tx.created_at).toLocaleDateString(),
          icon: tx.type === 'income' ? ArrowUp : ArrowDown
        });
      });

      setActivities(combinedActivities);

      // 6. Calculate Stats
      const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const todayStr = getLocalDateString();

      const income = allTransactions?.filter(t => t.type === 'income' && (!t.status || t.status === 'paid')) || [];
      const expenses = allTransactions?.filter(t => t.type === 'expense' && (!t.status || t.status === 'paid')) || [];

      const cashBalance = income.reduce((acc, t) => acc + Number(t.amount), 0) - expenses.reduce((acc, t) => acc + Number(t.amount), 0);

      const todayTxs = allTransactions?.filter(t => {
        if (!t.created_at) return false;
        const txLocalDate = getLocalDateString(new Date(t.created_at));
        return txLocalDate === todayStr;
      }) || [];

      // Net Sales = Today's Item Income - Today's Item Reversals
      const salesToday = todayTxs
        .filter(t => t.category !== 'service' && t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0) -
        todayTxs
          .filter(t => t.category !== 'service' && t.type === 'expense' && t.reference_type === 'reversal')
          .reduce((acc, t) => acc + Number(t.amount), 0);

      const servicesToday = todayTxs
        .filter(t => t.category === 'service' && t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0) -
        todayTxs
          .filter(t => t.category === 'service' && t.type === 'expense' && t.reference_type === 'reversal')
          .reduce((acc, t) => acc + Number(t.amount), 0);

      // Expenses Today = Everything that is NOT a reversal
      const expensesToday = todayTxs
        .filter(t => t.type === 'expense' && t.reference_type !== 'reversal')
        .reduce((acc, t) => acc + Number(t.amount), 0);

      setStats({
        cashBalance,
        salesToday,
        servicesToday,
        expensesToday,
        customersTotal: customersCount || 0,
        productsLow: lowStockCount
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards: SummaryCardData[] = [
    {
      title: 'Saldo em Caixa',
      value: `R$ ${stats.cashBalance.toFixed(2).replace('.', ',')}`,
      change: 'Saldo real-time',
      trend: stats.cashBalance >= 0 ? 'up' : 'down',
      icon: DollarSign,
    },
    {
      title: 'Vendas Hoje',
      value: `R$ ${stats.salesToday.toFixed(2).replace('.', ',')}`,
      change: 'Somente produtos',
      trend: 'neutral',
      icon: ShoppingCart,
    },
    {
      title: 'Serviços Hoje',
      value: `R$ ${stats.servicesToday.toFixed(2).replace('.', ',')}`,
      change: 'Somente serviços',
      trend: 'neutral',
      icon: Wrench,
    },
    {
      title: 'Despesas Hoje',
      value: `R$ ${stats.expensesToday.toFixed(2).replace('.', ',')}`,
      change: 'Saídas totais',
      trend: 'down',
      icon: ArrowDown,
    },
  ];

  const renderActivityIcon = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'Venda':
        return <ShoppingCart className="h-5 w-5 text-blue-500" />;
      case 'Serviço':
        return <Wrench className="h-5 w-5 text-purple-500" />;
      case 'Cliente':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  // Override click handlers to navigate
  const handleServiceClick = () => navigate('/sales', { state: { openModal: true, defaultItemType: 'service' } });
  const handleSaleClick = () => navigate('/sales', { state: { openModal: true } });

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Bem-vindo(a) de volta!</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, index) => (
          <Card key={index} className="flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-medium text-gray-500">{card.title}</h3>
              <card.icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline mb-1 flex-wrap sm:flex-nowrap">
              <span className="text-2xl font-bold text-gray-900 whitespace-nowrap">{card.value}</span>
              {card.change && (
                <span
                  className={`ml-2 text-sm font-medium flex items-center whitespace-nowrap ${card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}
                >
                  {card.trend === 'up' && <ArrowUp className="h-4 w-4 mr-1 shrink-0" />}
                  {card.trend === 'down' && <ArrowDown className="h-4 w-4 mr-1 shrink-0" />}
                  <span className="truncate">{card.change}</span>
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Atividades Recentes</h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma atividade recente.</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center flex-grow">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 mr-3">
                    {renderActivityIcon(activity)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description.split(' - ')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.description.split(' - ')[1] || ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end sm:flex-row sm:items-baseline sm:space-x-4">
                  {activity.amount !== undefined && activity.amount > 0 && (
                    <span className="text-sm font-semibold text-gray-900 sm:min-w-[80px] text-right">
                      R$ {activity.amount.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 sm:min-w-[100px] text-right">
                    {activity.timeAgo}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
