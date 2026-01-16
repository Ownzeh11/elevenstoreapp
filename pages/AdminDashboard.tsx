import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Card from '../components/ui/Card';
import {
    Building2,
    Users,
    CreditCard,
    Activity,
    ShieldCheck,
    TrendingUp,
    AlertCircle,
    LayoutDashboard,
    Server,
    ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeCompanies: 0,
        totalUsers: 0,
        revenueEstimate: 0,
        systemHealth: 'Healthy'
    });
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGlobalData();
    }, []);

    const fetchGlobalData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Companies & Plans
            const { data: companies, error: companiesError } = await supabase
                .from('companies')
                .select('status, plan, saas_plans(id, price)');

            if (companiesError) throw companiesError;

            // 2. Fetch Users count
            const { count: usersCount, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (usersError) throw usersError;

            // 3. Fetch Recent Audit Logs
            const { data: logs, error: logsError } = await supabase
                .from('saas_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!logsError) {
                setRecentLogs(logs || []);
            }

            const active = companies?.filter(c => c.status === 'active').length || 0;

            // Real revenue calculation
            const revenue = companies?.reduce((acc, c: any) => {
                if (c.status !== 'active') return acc;
                // Handle both object and array formats from PostgREST join
                const planData = Array.isArray(c.saas_plans) ? c.saas_plans[0] : c.saas_plans;
                const planPrice = planData?.price || 0;
                return acc + Number(planPrice);
            }, 0) || 0;

            setStats({
                totalCompanies: companies?.length || 0,
                activeCompanies: active,
                totalUsers: usersCount || 0,
                revenueEstimate: revenue,
                systemHealth: 'Healthy'
            });
        } catch (error) {
            console.error('Error fetching global stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
            Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            'day'
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Activity className="w-5 h-5 animate-pulse" />
                        <span className="text-sm font-bold tracking-wider uppercase">SaaS Control Center</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Global</h1>
                    <p className="text-gray-500 mt-1">Status em tempo real do ecossistema ElevenStore.</p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={fetchGlobalData} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        Atualizar Dados
                    </button>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-bold uppercase">Meta 98%</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500">Total de Empresas</p>
                        <p className="text-3xl font-extrabold text-gray-900">{stats.totalCompanies}</p>
                        <p className="text-xs text-green-600 font-medium mt-1">+{stats.activeCompanies} ativas agora</p>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500">Usuários Totais</p>
                        <p className="text-3xl font-extrabold text-gray-900">{stats.totalUsers}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">Crescimento constante</p>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500">MRR Real</p>
                        <p className="text-3xl font-extrabold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenueEstimate)}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Sincronizado com planos</p>
                    </div>
                </Card>

                <Card className="p-6 bg-slate-900 border-none shadow-sm flex flex-col justify-between text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400">
                            <Server className="w-6 h-6" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Online</span>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="mt-4 relative z-10">
                        <p className="text-sm font-semibold text-slate-400">SaaS Health Score</p>
                        <p className="text-2xl font-bold">{stats.systemHealth}</p>
                        <p className="text-xs text-slate-500 mt-1">Latência global: 42ms</p>
                    </div>
                </Card>
            </div>

            {/* Secondary Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 border-none shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                            Atividades de Auditoria
                        </h3>
                        <Link to="/admin/logs" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
                            Ver tudo <ChevronRight className="w-3 h-3 ml-1" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentLogs.length > 0 ? (
                            recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors">
                                    <div className={`w-2 h-10 rounded-full mr-4 ${log.action.includes('delete') ? 'bg-red-500' :
                                        log.action.includes('suspend') ? 'bg-amber-500' : 'bg-indigo-500'
                                        }`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800">{log.action}</p>
                                        <p className="text-xs text-gray-500">{log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)})` : ''}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Nenhuma atividade registrada ainda.</p>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div>
                                <h3 className="text-xl font-bold mb-2">ElevenStore SaaS v1.2</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                                    Você está no Console de Administração. Todas as ações aqui são globais e afetam a disponibilidade do serviço para os clientes finais.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors">
                                    Docs Admin
                                </button>
                                <button className="px-6 py-2 bg-indigo-500/20 text-white border border-indigo-400/30 rounded-xl font-bold text-sm hover:bg-indigo-500/30 transition-colors">
                                    Suporte Dev
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-none shadow-sm flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Tarefas Pendentes</h4>
                            <p className="text-sm text-gray-500">Existem 3 empresas com pendências de pagamento ou documentos.</p>
                            <Link to="/admin/companies" className="text-sm font-bold text-indigo-600 mt-2 block">Visualizar Pendências</Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
