import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Company, SaaSPlan, TableColumn } from '../types';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Pill from '../components/ui/Pill';
import Input from '../components/ui/Input';
import {
    Shield,
    Plus,
    Search,
    Building2,
    Users,
    Calendar,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    PauseCircle,
    Edit,
    X,
    Trash,
    ExternalLink,
    CreditCard,
    Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminCompaniesPage: React.FC = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plans, setPlans] = useState<SaaSPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPurgeModal, setShowPurgeModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Form States
    const [createFormData, setCreateFormData] = useState({
        name: '',
        cnpj_cpf: '',
        billing_email: '',
        saas_plan_id: '',
        status: 'active' as Company['status']
    });

    const [editFormData, setEditFormData] = useState({
        name: '',
        cnpj_cpf: '',
        billing_email: '',
        saas_plan_id: '',
        status: 'active' as Company['status'],
        renewal_date: '',
        enabled_modules: [] as string[]
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [purgeConfirmationName, setPurgeConfirmationName] = useState('');
    const [stats, setStats] = useState({ total: 0, active: 0, issue: 0 });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch Plans
            const { data: plansData } = await supabase.from('saas_plans').select('*');
            setPlans(plansData || []);

            // Fetch Companies
            const { data: companiesData, error } = await supabase
                .from('companies')
                .select('*, saas_plans(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map the plan name from the join
            const companiesWithPlanNames = (companiesData || []).map(c => ({
                ...c,
                plan_name: (c as any).saas_plans?.name || 'Manual'
            }));

            setCompanies(companiesWithPlanNames);

            // Calculate stats
            const active = companiesWithPlanNames.filter(c => c.status === 'active').length;
            const issue = companiesWithPlanNames.filter(c => c.status !== 'active').length;
            setStats({ total: companiesWithPlanNames.length, active, issue });

            // Set default plan for create form if plans exist
            if (plansData?.length && !createFormData.saas_plan_id) {
                setCreateFormData(prev => ({ ...prev, saas_plan_id: plansData[0].id }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProcessing(true);
            const { data: company, error } = await supabase
                .from('companies')
                .insert([{
                    name: createFormData.name,
                    cnpj_cpf: createFormData.cnpj_cpf,
                    billing_email: createFormData.billing_email,
                    saas_plan_id: createFormData.saas_plan_id,
                    status: 'active',
                    // Set default renewal to 1 month from now
                    renewal_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            setShowCreateModal(false);
            setCreateFormData({ name: '', cnpj_cpf: '', billing_email: '', saas_plan_id: plans[0]?.id || '', status: 'active' });
            fetchInitialData();
            alert('Empresa criada com sucesso!');
        } catch (error) {
            console.error('Error creating company:', error);
            alert('Erro ao criar empresa.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        try {
            setIsProcessing(true);
            const { error } = await supabase
                .from('companies')
                .update({
                    name: editFormData.name,
                    cnpj_cpf: editFormData.cnpj_cpf,
                    billing_email: editFormData.billing_email,
                    saas_plan_id: editFormData.saas_plan_id,
                    status: editFormData.status,
                    renewal_date: editFormData.renewal_date || null,
                    enabled_modules: editFormData.enabled_modules
                })
                .eq('id', selectedCompany.id);

            if (error) throw error;

            setShowEditModal(false);
            fetchInitialData();
            alert('Dados da empresa atualizados!');
        } catch (error) {
            console.error('Error updating company:', error);
            alert('Erro ao atualizar empresa.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePurgeCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        if (purgeConfirmationName.trim().toLowerCase() !== selectedCompany.name.trim().toLowerCase()) {
            alert('O nome da empresa digitado não coincide.');
            return;
        }

        try {
            setIsProcessing(true);
            const { data, error } = await supabase.functions.invoke('manage-company-admin', {
                body: { action: 'purge_company', company_id: selectedCompany.id }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setShowPurgeModal(false);
            setPurgeConfirmationName('');
            fetchInitialData();
            alert('Empresa removida permanentemente.');
        } catch (error: any) {
            console.error('Error purging company:', error);
            alert('Erro ao expurgar empresa: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditModal = (company: Company) => {
        setSelectedCompany(company);
        setEditFormData({
            name: company.name,
            cnpj_cpf: company.cnpj_cpf || '',
            billing_email: company.billing_email || '',
            saas_plan_id: company.saas_plan_id || '',
            status: company.status,
            renewal_date: company.renewal_date ? new Date(company.renewal_date).toISOString().split('T')[0] : '',
            enabled_modules: company.enabled_modules || []
        });
        setShowEditModal(true);
    };

    const toggleModule = (module: string) => {
        setEditFormData(prev => ({
            ...prev,
            enabled_modules: prev.enabled_modules.includes(module)
                ? prev.enabled_modules.filter(m => m !== module)
                : [...prev.enabled_modules, module]
        }));
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj_cpf?.includes(searchTerm)
    );

    const columns: TableColumn<Company>[] = [
        {
            key: 'name',
            header: 'Empresa',
            render: (item) => (
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mr-3 flex-shrink-0">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 leading-none mb-1">{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{item.cnpj_cpf || 'CNPJ/CPF não informado'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'plan',
            header: 'Assinatura',
            render: (item: any) => (
                <div className="flex flex-col">
                    <Pill variant="info" className="uppercase text-[10px] font-bold w-fit mb-1">
                        {item.plan_name}
                    </Pill>
                    <span className="text-[10px] text-gray-400 font-medium">Renovação: {item.renewal_date ? new Date(item.renewal_date).toLocaleDateString() : 'N/A'}</span>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (item) => {
                const variants: any = { active: 'success', suspended: 'warning', overdue: 'warning', blocked: 'danger', canceled: 'default' };
                const labels: any = { active: 'Ativo', suspended: 'Suspenso', overdue: 'Atrasado', blocked: 'Bloqueado', canceled: 'Cancelado' };
                return <Pill variant={variants[item.status] || 'default'}>{labels[item.status] || item.status}</Pill>;
            }
        },
        {
            key: 'actions',
            header: 'Ações de Contrato',
            render: (item) => (
                <div className="flex items-center space-x-2">
                    <button onClick={() => openEditModal(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Gerenciar Contrato">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate(`/admin/users?company_id=${item.id}`)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Ir para Usuários"
                    >
                        <Users className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setSelectedCompany(item); setPurgeConfirmationName(''); setShowPurgeModal(true); }}
                        className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Expurgar Empresa"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">Subscription Manager</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão de Empresas</h1>
                    <p className="text-gray-500 mt-1">Contratos, planos e disponibilidade global do serviço.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
                    Adicionar Empresa
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="p-6 border-none shadow-sm flex items-center space-x-4 bg-white hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contratos Ativos</p>
                        <p className="text-3xl font-black text-gray-900">{stats.active}</p>
                    </div>
                </Card>
                <Card className="p-6 border-none shadow-sm flex items-center space-x-4 bg-white hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pendências/Atrasos</p>
                        <p className="text-3xl font-black text-gray-900">{stats.issue}</p>
                    </div>
                </Card>
                <Card className="p-6 border-none shadow-sm flex items-center space-x-4 bg-slate-900 text-white hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total na Base</p>
                        <p className="text-3xl font-black">{stats.total}</p>
                    </div>
                </Card>
            </div>

            {/* Table Area */}
            <Card className="border-none shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou CNPJ/CPF..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-sm placeholder:font-medium"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Carregando Clientes...</p>
                    </div>
                ) : (
                    <Table data={filteredCompanies} columns={columns} rowKey="id" />
                )}
            </Card>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Novo Cliente SaaS</h3>
                                <p className="text-sm text-gray-500">Inicie uma nova jornada de contrato.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCompany} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Nome da Empresa" placeholder="ElevenStore LTDA" value={createFormData.name} onChange={e => setCreateFormData({ ...prev => prev, name: e.target.value })} required className="md:col-span-2" />
                                <Input label="CNPJ / CPF" placeholder="00.000.000/0001-00" value={createFormData.cnpj_cpf} onChange={e => setCreateFormData(prev => ({ ...prev, cnpj_cpf: e.target.value }))} />
                                <Input label="Email Financeiro" type="email" placeholder="financeiro@empresa.com" value={createFormData.billing_email} onChange={e => setCreateFormData(prev => ({ ...prev, billing_email: e.target.value }))} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                                    <CreditCard className="w-3 h-3 mr-1" /> Plano de Assinatura
                                </label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-bold text-gray-700"
                                    value={createFormData.saas_plan_id}
                                    onChange={e => setCreateFormData(prev => ({ ...prev, saas_plan_id: e.target.value }))}
                                    required
                                >
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}/{p.billing_cycle === 'monthly' ? 'mês' : 'ano'}</option>)}
                                </select>
                            </div>

                            <div className="pt-6 border-t flex items-center justify-between">
                                <p className="text-xs text-gray-400 font-medium">Acesso inicial será via convite por e-mail.</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Voltar</Button>
                                    <Button type="submit" disabled={isProcessing}>{isProcessing ? 'Criando...' : 'Finalizar Cadastro'}</Button>
                                </div>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Edit / Contract Management Modal */}
            {showEditModal && selectedCompany && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">Gestão de Contrato</h3>
                                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{selectedCompany.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleEditCompany} className="space-y-8">
                            {/* Section 1: Basic Data */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 text-indigo-600">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Informações Cadastrais</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Razão Social / Nome" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
                                    <Input label="Documento (CNPJ/CPF)" value={editFormData.cnpj_cpf} onChange={e => setEditFormData({ ...editFormData, cnpj_cpf: e.target.value })} />
                                    <Input label="E-mail de Cobrança" type="email" value={editFormData.billing_email} onChange={e => setEditFormData({ ...editFormData, billing_email: e.target.value })} />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Próxima Renovação</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all outline-none font-bold"
                                            value={editFormData.renewal_date}
                                            onChange={e => setEditFormData({ ...editFormData, renewal_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Subscription */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 text-indigo-600">
                                    <CreditCard className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Assinatura & Status</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Plano Atual</label>
                                        <select
                                            className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none"
                                            value={editFormData.saas_plan_id}
                                            onChange={e => setEditFormData({ ...editFormData, saas_plan_id: e.target.value })}
                                        >
                                            {plans.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Status da Conta</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl font-black outline-none"
                                            value={editFormData.status}
                                            onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                                        >
                                            <option value="active">ATIVO</option>
                                            <option value="suspended">SUSPENSO</option>
                                            <option value="overdue">ATRASO NO PAGAMENTO</option>
                                            <option value="blocked">BLOQUEIO TÉCNICO</option>
                                            <option value="canceled">CANCELADO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Module Control */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 text-indigo-600">
                                    <Layout className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Módulos Habilitados</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {['finance', 'calendar', 'inventory', 'sales', 'customers', 'reports'].map((module) => (
                                        <button
                                            key={module}
                                            type="button"
                                            onClick={() => toggleModule(module)}
                                            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all group ${editFormData.enabled_modules.includes(module)
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-[10px] font-black uppercase">{module}</span>
                                            {editFormData.enabled_modules.includes(module) ? (
                                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-gray-200 group-hover:border-gray-300"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center space-x-2 text-gray-400">
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs font-bold">Gestão de acessos é feita separadamente em Usuários.</span>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                                    <Button type="submit" className="flex-1 md:flex-none shadow-xl shadow-indigo-600/20" disabled={isProcessing}>
                                        {isProcessing ? 'Salvando...' : 'Salvar Contrato'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Purge / Danger Zone Modal */}
            {showPurgeModal && selectedCompany && (
                <div className="fixed inset-0 bg-red-950/40 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
                    <Card className="w-full max-w-md p-8 shadow-2xl border-none ring-1 ring-red-500/20">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <Trash className="w-8 h-8 text-red-600 animate-bounce" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Expurgar Tudo?</h3>
                            <p className="text-red-600 font-black uppercase text-[10px] tracking-[0.2em] mt-2">Operação de Alto Risco</p>
                        </div>

                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-8 space-y-3">
                            <div className="flex items-center text-red-700 font-bold text-xs uppercase italic">
                                <AlertCircle className="w-4 h-4 mr-2" /> Atenção Admin
                            </div>
                            <p className="text-xs text-red-800 leading-relaxed font-medium">
                                Esta ação irá <strong>DESTRUIR</strong> todos os registros, transações, clientes e configurações da empresa vinculada. Não há botão "desfazer".
                            </p>
                        </div>

                        <form onSubmit={handlePurgeCompany} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block w-full">
                                    Digite <span className="text-red-700 font-black">{selectedCompany.name}</span>
                                </label>
                                <Input
                                    id="purge-confirmation"
                                    value={purgeConfirmationName}
                                    onChange={(e) => setPurgeConfirmationName(e.target.value)}
                                    placeholder="NOME DA EMPRESA EM LETRAS EXATAS"
                                    required
                                    className="border-red-200 focus:ring-red-500 text-center font-black placeholder:font-bold"
                                />
                            </div>
                            <div className="flex flex-col space-y-3">
                                <Button
                                    type="submit"
                                    variant="danger"
                                    className="w-full py-6 font-black tracking-widest shadow-xl shadow-red-600/20"
                                    disabled={isProcessing || purgeConfirmationName.trim().toLowerCase() !== selectedCompany.name.trim().toLowerCase()}
                                >
                                    {isProcessing ? 'REMOVENDO...' : 'CONFIRMAR PURGA TOTAL'}
                                </Button>
                                <button
                                    type="button"
                                    className="text-xs font-bold text-gray-400 hover:text-gray-600 py-2 transition-colors"
                                    onClick={() => setShowPurgeModal(false)}
                                    disabled={isProcessing}
                                >
                                    Pensei melhor, Cancelar.
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminCompaniesPage;
