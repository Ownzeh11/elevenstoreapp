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
    Server
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeCompanies: 0,
        totalUsers: 0,
        revenueEstimate: 0,
        systemHealth: 'Healthy'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    const fetchGlobalStats = async () => {
        try {
            setLoading(true);

            // 1. Fetch Companies count
            const { data: companies, error: companiesError } = await supabase
                .from('companies')
                .select('status, plan');

            if (companiesError) throw companiesError;

            // 2. Fetch Users count (approximate via profiles)
            const { count: usersCount, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (usersError) throw usersError;

            const active = companies?.filter(c => c.status === 'active').length || 0;

            // Mock revenue estimation logic
            const revenue = companies?.reduce((acc, c) => {
                if (c.status !== 'active') return acc;
                if (c.plan === 'premium') return acc + 299;
                if (c.plan === 'standard') return acc + 99;
                return acc;
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Activity className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">SaaS Control Center</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Global</h1>
                    <p className="text-gray-500 mt-1">Visão geral do ecossistema ElevenStore.</p>
                </div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
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

                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500">Usuários Totais</p>
                        <p className="text-3xl font-extrabold text-gray-900">{stats.totalUsers}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">Crescimento constante</p>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-none shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500">MRR Estimado</p>
                        <p className="text-3xl font-extrabold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenueEstimate)}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Baseado nos planos ativos</p>
                    </div>
                </Card>

                <Card className="p-6 bg-slate-900 border-none shadow-sm flex flex-col justify-between text-white">
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400">
                            <Server className="w-6 h-6" />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-400">Status do Sistema</p>
                        <p className="text-xl font-bold">{stats.systemHealth}</p>
                        <p className="text-xs text-slate-500 mt-1">Todos os serviços operacionais</p>
                    </div>
                </Card>
            </div>

            {/* Secondary Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 border-none shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center">
                        <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                        Atividades Recentes do SaaS
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-2 h-10 bg-indigo-500 rounded-full mr-4"></div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Nova Empresa Criada</p>
                                <p className="text-xs text-gray-500">ElevenStore Premium - 2 horas atrás</p>
                            </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-2 h-10 bg-amber-500 rounded-full mr-4"></div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Assinatura Expirada</p>
                                <p className="text-xs text-gray-500">Empresa ID: a1b2... - 5 horas atrás</p>
                            </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
                            <div className="w-2 h-10 bg-gray-300 rounded-full mr-4"></div>
                            <p className="text-sm text-gray-400 italic">Mais atividades sendo sincronizadas...</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-2">ElevenStore SaaS v1.2</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed">
                                Você está no Console de Administração. Todas as ações aqui são globais e afetam a disponibilidade do serviço para os clientes finais.
                            </p>
                        </div>
                        <div className="pt-8">
                            <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors">
                                Documentação do Admin
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
