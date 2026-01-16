import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Profile, Company, TableColumn } from '../types';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Pill from '../components/ui/Pill';
import Input from '../components/ui/Input';
import {
    Users,
    Search,
    Plus,
    UserPlus,
    Trash,
    Edit,
    Shield,
    Filter,
    X,
    Building2,
    Mail,
    Key,
    UserCog
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const AdminUsersPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const companyIdFilter = searchParams.get('company_id');

    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyIdFilter || 'all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'owner',
        company_id: companyIdFilter || ''
    });

    useEffect(() => {
        fetchData();
    }, [selectedCompanyId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Companies for dropdown
            const { data: companiesData } = await supabase.from('companies').select('id, name');
            setCompanies(companiesData || []);

            // 2. Fetch Users with company info
            let query = supabase
                .from('company_users')
                .select(`
                    user_id,
                    role,
                    profile:profiles(id, email, username, created_at),
                    company:companies(id, name)
                `);

            if (selectedCompanyId !== 'all') {
                query = query.eq('company_id', selectedCompanyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);

        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company_id) {
            alert('Selecione uma empresa para vincular o novo usuário.');
            return;
        }

        try {
            setIsProcessing(true);
            const { data, error: fnError } = await supabase.functions.invoke('manage-company-admin', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    company_id: formData.company_id,
                    role: formData.role
                }
            });

            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);

            setShowCreateModal(false);
            setFormData({ email: '', password: '', role: 'owner', company_id: companyIdFilter || '' });
            fetchData();
            alert('Usuário criado e vinculado com sucesso!');
        } catch (error: any) {
            console.error('Error creating user:', error);
            alert('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Deseja realmente excluir este usuário? Esta ação removerá o acesso dele permanentemente.')) return;

        try {
            setIsProcessing(true);
            const { error: fnError } = await supabase.functions.invoke('manage-company-admin', {
                body: {
                    action: 'delete_user',
                    user_id: userId
                }
            });

            if (fnError) throw fnError;

            fetchData();
            alert('Usuário excluído!');
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert('Erro ao excluir usuário: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: TableColumn<any>[] = [
        {
            key: 'profile',
            header: 'Usuário',
            render: (item) => (
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black mr-3 shadow-inner">
                        {item.profile?.email?.substring(0, 1).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 leading-none mb-1">{item.profile?.email}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Criado em {new Date(item.profile?.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'company',
            header: 'Empresa',
            render: (item) => (
                <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{item.company?.name || 'Sem Empresa'}</span>
                </div>
            )
        },
        {
            key: 'role',
            header: 'Nível de Acesso',
            render: (item) => (
                <Pill variant={item.role === 'owner' ? 'info' : 'default'} className="uppercase font-bold text-[10px] tracking-widest">
                    {item.role === 'owner' ? 'Proprietário' : 'Membro'}
                </Pill>
            )
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (item) => (
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleDeleteUser(item.user_id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
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
                        <UserCog className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">Identity Manager</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Usuários & Permissões</h1>
                    <p className="text-gray-500 mt-1">Controle centralizado de acessos para todas as empresas do ecossistema.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} icon={UserPlus}>
                    Adicionar Usuário
                </Button>
            </div>

            {/* Filter Area */}
            <Card className="p-4 border-none shadow-sm bg-white flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por e-mail ou empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all outline-none text-sm placeholder:font-medium"
                    />
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="bg-gray-50 text-gray-700 font-bold text-sm px-4 py-3 rounded-2xl border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all w-full md:w-64"
                    >
                        <option value="all">Todas as Empresas</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </Card>

            {/* Table Area */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Identidades...</p>
                    </div>
                ) : (
                    <Table data={filteredUsers} columns={columns} rowKey={(item) => `${item.user_id}-${item.company?.id}`} />
                )}
            </Card>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Novo Acesso</h3>
                                <p className="text-sm text-gray-500">Crie credenciais e vincule a uma empresa.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-6">
                            <div className="space-y-4">
                                <Input
                                    label="E-mail do Usuário"
                                    type="email"
                                    placeholder="usuario@email.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    icon={Mail}
                                />
                                <Input
                                    label="Senha Provisória"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    icon={Key}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                                        <Building2 className="w-3 h-3 mr-1" /> Empresa Vinculada
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-gray-700"
                                        value={formData.company_id}
                                        onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                                        <Shield className="w-3 h-3 mr-1" /> Nível de Acesso
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-gray-700"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        required
                                    >
                                        <option value="owner">Proprietário (Admin)</option>
                                        <option value="member">Membro (Operacional)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                                <Button type="submit" className="flex-1 shadow-xl shadow-indigo-600/20" disabled={isProcessing}>
                                    {isProcessing ? 'Criando...' : 'Confirmar Acesso'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
