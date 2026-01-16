import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SaaSPlan, TableColumn } from '../types';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Pill from '../components/ui/Pill';
import Input from '../components/ui/Input';
import {
    Plus,
    Edit,
    Trash,
    Check,
    X,
    CreditCard,
    Users,
    Package,
    Briefcase,
    Zap,
    DollarSign,
    Settings
} from 'lucide-react';

const AdminPlansPage: React.FC = () => {
    const [plans, setPlans] = useState<SaaSPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        billing_cycle: 'monthly' as 'monthly' | 'yearly',
        max_users: 1,
        max_products: 10,
        max_customers: 10,
        features: [] as string[]
    });

    const AVAILABLE_FEATURES = [
        { id: 'finance', label: 'Módulo Financeiro' },
        { id: 'calendar', label: 'Agenda & Serviços' },
        { id: 'inventory', label: 'Relatórios de Estoque' },
        { id: 'sales', label: 'Gestão de Vendas' },
        { id: 'customers', label: 'Base de Clientes' },
        { id: 'audit_logs', label: 'Logs de Auditoria' }
    ];

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('saas_plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProcessing(true);

            if (editingPlan) {
                const { error } = await supabase
                    .from('saas_plans')
                    .update(formData)
                    .eq('id', editingPlan.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('saas_plans')
                    .insert([formData]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingPlan(null);
            setFormData({ name: '', price: 0, billing_cycle: 'monthly', max_users: 1, max_products: 10, max_customers: 10, features: [] });
            fetchPlans();
            alert('Plano salvo com sucesso!');
        } catch (error) {
            console.error('Error saving plan:', error);
            alert('Erro ao salvar plano.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Deseja realmente excluir este plano? Verifique se não há empresas vinculadas.')) return;
        try {
            setIsProcessing(true);
            const { error } = await supabase.from('saas_plans').delete().eq('id', id);
            if (error) throw error;
            fetchPlans();
        } catch (error: any) {
            console.error('Error deleting plan:', error);
            alert('Erro ao excluir plano: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditModal = (plan: SaaSPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            price: Number(plan.price),
            billing_cycle: plan.billing_cycle,
            max_users: plan.max_users,
            max_products: plan.max_products,
            max_customers: plan.max_customers,
            features: plan.features || []
        });
        setShowModal(true);
    };

    const toggleFeature = (featureId: string) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.includes(featureId)
                ? prev.features.filter(f => f !== featureId)
                : [...prev.features, featureId]
        }));
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Zap className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">Tier Builder</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Planos & Assinaturas</h1>
                    <p className="text-gray-500 mt-1">Defina camadas de precificação e limites de recursos.</p>
                </div>
                <Button onClick={() => { setEditingPlan(null); setShowModal(true); }} icon={Plus}>
                    Criar Novo Plano
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <Card key={i} className="h-64 animate-pulse bg-gray-100"></Card>)
                ) : (
                    plans.map((plan) => (
                        <Card key={plan.id} className="p-8 border-none shadow-sm bg-white hover:shadow-xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(plan)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-900 mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-3xl font-black text-indigo-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        / {plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}
                                    </span>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium flex items-center"><Users className="w-4 h-4 mr-2" /> Usuários</span>
                                        <span className="font-black text-gray-900">{plan.max_users}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium flex items-center"><Package className="w-4 h-4 mr-2" /> Produtos</span>
                                        <span className="font-black text-gray-900">{plan.max_products}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium flex items-center"><DollarSign className="w-4 h-4 mr-2" /> Clientes</span>
                                        <span className="font-black text-gray-900">{plan.max_customers}</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <div className="flex flex-wrap gap-2">
                                        {(plan.features || []).map(f => (
                                            <span key={f} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-wider">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Save Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">{editingPlan ? 'Editar Plano' : 'Novo Plano SaaS'}</h3>
                                <p className="text-sm text-gray-500">Configurações globais de limites e preço.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Nome do Plano" placeholder="Ex: Premium Plus" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Ciclo de Cobrança</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-gray-700"
                                        value={formData.billing_cycle}
                                        onChange={e => setFormData({ ...formData, billing_cycle: e.target.value as any })}
                                    >
                                        <option value="monthly">Mensal</option>
                                        <option value="yearly">Anual</option>
                                    </select>
                                </div>
                                <Input label="Preço (BRL)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required />
                                <Input label="Máximo de Usuários" type="number" value={formData.max_users} onChange={e => setFormData({ ...formData, max_users: Number(e.target.value) })} required />
                                <Input label="Máximo de Produtos" type="number" value={formData.max_products} onChange={e => setFormData({ ...formData, max_products: Number(e.target.value) })} required />
                                <Input label="Máximo de Clientes" type="number" value={formData.max_customers} onChange={e => setFormData({ ...formData, max_customers: Number(e.target.value) })} required />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 text-indigo-600">
                                    <Settings className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Recursos Inclusos</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {AVAILABLE_FEATURES.map((feature) => (
                                        <button
                                            key={feature.id}
                                            type="button"
                                            onClick={() => toggleFeature(feature.id)}
                                            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all group ${formData.features.includes(feature.id)
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-[10px] font-black uppercase text-left">{feature.label}</span>
                                            {formData.features.includes(feature.id) ? (
                                                <Check className="w-4 h-4 text-indigo-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-gray-200 group-hover:border-gray-300"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button type="submit" className="flex-1 shadow-xl shadow-indigo-600/20" disabled={isProcessing}>
                                    {isProcessing ? 'Gravando...' : 'Salvar Plano'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminPlansPage;
