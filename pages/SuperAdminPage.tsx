import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Company, Profile, TableColumn } from '../types';
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
    UserCog,
    Calendar,
    TrendingUp,
    AlertCircle,
    MoreVertical,
    CheckCircle2,
    XCircle,
    PauseCircle,
    UserPlus,
    Edit,
    X,
    UserMinus,
    Trash,
    Lock,
    Key
} from 'lucide-react';

const SuperAdminPage: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [editFormData, setEditFormData] = useState({ name: '', plan: '', expires_at: '' });
    const [companyUsers, setCompanyUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [addUserFormData, setAddUserFormData] = useState({ email: '', role: 'owner', password: '' });
    const [createAdminData, setCreateAdminData] = useState({ email: '', password: '' });
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
    const [editAdminData, setEditAdminData] = useState({ email: '', password: '' });
    const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0 });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);

            // Calculate simple stats
            const active = data?.filter(c => c.status === 'active').length || 0;
            const suspended = data?.filter(c => c.status !== 'active').length || 0;
            setStats({ total: data?.length || 0, active, suspended });
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreatingCompany(true);

            // 1. Create Company
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .insert([{
                    name: newCompanyName,
                    status: 'active',
                    plan: 'standard'
                }])
                .select()
                .single();

            if (companyError) throw companyError;

            // 2. Create Admin User via Edge Function
            if (createAdminData.email && createAdminData.password) {
                const { error: fnError } = await supabase.functions.invoke('manage-company-admin', {
                    body: {
                        email: createAdminData.email,
                        password: createAdminData.password,
                        company_id: company.id,
                        role: 'owner'
                    }
                });

                if (fnError) {
                    console.error('Error creating admin user:', fnError);
                    alert('Empresa criada, mas erro ao criar usuário administrador: ' + fnError.message);
                }
            }

            setCompanies([company, ...companies]);
            setShowCreateModal(false);
            setNewCompanyName('');
            setCreateAdminData({ email: '', password: '' });

            // Refresh stats
            fetchCompanies();
        } catch (error) {
            console.error('Error creating company:', error);
            alert('Erro ao criar empresa.');
        } finally {
            setIsCreatingCompany(false);
        }
    };

    const handleEditCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        try {
            setIsUpdatingCompany(true);

            // 1. Update Company Basic Info
            const { error: companyError } = await supabase
                .from('companies')
                .update({
                    name: editFormData.name,
                    plan: editFormData.plan,
                    expires_at: editFormData.expires_at || null
                })
                .eq('id', selectedCompany.id);

            if (companyError) throw companyError;

            // 2. Update Admin User if email/password provided
            if (editAdminData.email) {
                const { error: fnError } = await supabase.functions.invoke('manage-company-admin', {
                    body: {
                        email: editAdminData.email,
                        password: editAdminData.password || undefined,
                        company_id: selectedCompany.id,
                        role: 'owner'
                    }
                });

                if (fnError) {
                    console.error('Error updating admin user:', fnError);
                    alert('Empresa atualizada, mas erro ao atualizar administrador: ' + fnError.message);
                }
            }

            setCompanies(companies.map(c => c.id === selectedCompany.id ? { ...c, ...editFormData, expires_at: editFormData.expires_at || null } : c));
            setShowEditModal(false);
            setEditAdminData({ email: '', password: '' });

            // Refresh stats in case of changes
            fetchCompanies();
        } catch (error) {
            console.error('Error updating company:', error);
            alert('Erro ao atualizar empresa.');
        } finally {
            setIsUpdatingCompany(false);
        }
    };

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar esta empresa e todos os seus dados? Esta ação é irreversível.')) return;
        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCompanies(companies.filter(c => c.id !== id));
            fetchCompanies();
        } catch (error) {
            console.error('Error deleting company:', error);
            alert('Erro ao deletar empresa. Pode haver dados vinculados que impedem a exclusão direta.');
        }
    };

    const fetchCompanyUsers = async (companyId: string) => {
        try {
            setLoadingUsers(true);
            const { data, error } = await supabase
                .from('company_users')
                .select(`
                    user_id,
                    role,
                    profile:profiles(id, email, created_at)
                `)
                .eq('company_id', companyId);

            if (error) throw error;
            setCompanyUsers(data || []);
            return data;
        } catch (error) {
            console.error('Error fetching company users:', error);
            return [];
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        setIsAddingUser(true);
        try {
            // Use Edge Function to create/link user
            const { error: fnError } = await supabase.functions.invoke('manage-company-admin', {
                body: {
                    email: addUserFormData.email,
                    password: addUserFormData.password || undefined,
                    company_id: selectedCompany.id,
                    role: addUserFormData.role
                }
            });

            if (fnError) throw fnError;

            setAddUserFormData({ email: '', role: 'member', password: '' });
            fetchCompanyUsers(selectedCompany.id);
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Erro ao adicionar/criar usuário.');
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!selectedCompany) return;
        if (!confirm('Remover este usuário desta empresa?')) return;

        try {
            const { error } = await supabase
                .from('company_users')
                .delete()
                .eq('company_id', selectedCompany.id)
                .eq('user_id', userId);

            if (error) throw error;
            setCompanyUsers(companyUsers.filter(cu => cu.user_id !== userId));
        } catch (error) {
            console.error('Error removing user:', error);
            alert('Erro ao remover usuário.');
        }
    };

    const handleUpdateUserRole = async (userId: string, role: string) => {
        if (!selectedCompany) return;
        try {
            const { error } = await supabase
                .from('company_users')
                .update({ role })
                .eq('company_id', selectedCompany.id)
                .eq('user_id', userId);

            if (error) throw error;
            setCompanyUsers(companyUsers.map(cu => cu.user_id === userId ? { ...cu, role } : cu));
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Erro ao atualizar cargo.');
        }
    };

    const openEditModal = (company: Company) => {
        setSelectedCompany(company);
        setEditFormData({
            name: company.name,
            plan: company.plan || 'standard',
            expires_at: company.expires_at ? new Date(company.expires_at).toISOString().split('T')[0] : ''
        });
        setEditAdminData({ email: '', password: '' });
        setShowEditModal(true);
    };

    const openUsersModal = (company: Company) => {
        setSelectedCompany(company);
        setAddUserFormData({ email: '', role: 'owner', password: '' });
        fetchCompanyUsers(company.id).then((users: any) => {
            if (users && users.length > 0) {
                setAddUserFormData({
                    email: users[0].profile?.email || '',
                    role: 'owner',
                    password: ''
                });
            }
        });
        setShowUsersModal(true);
    };

    const updateCompanyStatus = async (id: string, status: Company['status']) => {
        try {
            const { error } = await supabase
                .from('companies')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            setCompanies(companies.map(c => c.id === id ? { ...c, status } : c));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: TableColumn<Company>[] = [
        {
            key: 'name',
            header: 'Empresa',
            render: (item) => (
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">ID: {item.id.substring(0, 8)}...</p>
                    </div>
                </div>
            )
        },
        {
            key: 'plan',
            header: 'Plano',
            render: (item) => (
                <Pill variant="info" className="uppercase tracking-wider">
                    {item.plan}
                </Pill>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (item) => {
                const variants: Record<string, any> = {
                    active: 'success',
                    suspended: 'warning',
                    blocked: 'danger'
                };
                const labels: Record<string, string> = {
                    active: 'Ativo',
                    suspended: 'Suspenso',
                    blocked: 'Bloqueado'
                };
                return (
                    <Pill variant={variants[item.status] || 'default'}>
                        {labels[item.status] || item.status}
                    </Pill>
                );
            }
        },
        {
            key: 'created_at',
            header: 'Criado em',
            render: (item) => (
                <span className="text-gray-500 font-medium">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (item) => (
                <div className="flex space-x-2">
                    {item.status === 'active' ? (
                        <button
                            onClick={() => updateCompanyStatus(item.id, 'suspended')}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Suspender"
                        >
                            <PauseCircle className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => updateCompanyStatus(item.id, 'active')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ativar"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => updateCompanyStatus(item.id, 'blocked')}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Bloquear"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Detalhes"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => openUsersModal(item)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Gerenciar Usuários"
                    >
                        <UserCog className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handleDeleteCompany(item.id)}
                        className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar Empresa"
                    >
                        <Trash className="w-5 h-5" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">Painel de Controle</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Gerenciamento global de empresas e acessos do SaaS.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
                    Nova Empresa
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="flex items-center p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-none shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mr-4">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Total de Empresas</p>
                        <p className="text-2xl font-extrabold text-gray-900">{stats.total}</p>
                    </div>
                </Card>
                <Card className="flex items-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mr-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Empresas Ativas</p>
                        <p className="text-2xl font-extrabold text-gray-900">{stats.active}</p>
                    </div>
                </Card>
                <Card className="flex items-center p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mr-4">
                        <PauseCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Suspensas/Bloqueadas</p>
                        <p className="text-2xl font-extrabold text-gray-900">{stats.suspended}</p>
                    </div>
                </Card>
            </div>

            {/* Filter & Table */}
            <Card className="overflow-hidden border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Listagem de Clientes</h2>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar empresa por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <Table
                        data={filteredCompanies}
                        columns={columns}
                        rowKey="id"
                    />
                )}
            </Card>

            {/* Create Company Modal (Simplified) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Nova Empresa</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <Input
                                label="Nome da Empresa"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                placeholder="Ex: ElevenStore São Paulo"
                                required
                            />

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center space-x-2 text-indigo-600 mb-4">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Acesso do Administrador</span>
                                </div>
                                <div className="space-y-3">
                                    <Input
                                        label="Email do Admin"
                                        type="email"
                                        value={createAdminData.email}
                                        onChange={(e) => setCreateAdminData({ ...createAdminData, email: e.target.value })}
                                        placeholder="admin@empresa.com"
                                        required
                                    />
                                    <Input
                                        label="Senha Provisória"
                                        type="password"
                                        value={createAdminData.password}
                                        onChange={(e) => setCreateAdminData({ ...createAdminData, password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-500 italic">
                                        Este usuário será criado automaticamente e vinculado como Dono da empresa.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreatingCompany}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isCreatingCompany}>
                                    {isCreatingCompany ? 'Criando...' : 'Criar Empresa & Admin'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Edit Company Modal */}
            {showEditModal && selectedCompany && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Editar Detalhes</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditCompany} className="space-y-4">
                            <Input
                                label="Nome da Empresa"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                required
                            />
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700">Plano</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={editFormData.plan}
                                    onChange={(e) => setEditFormData({ ...editFormData, plan: e.target.value })}
                                >
                                    <option value="free">Free</option>
                                    <option value="standard">Standard</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700">Data de Expiração</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    value={editFormData.expires_at}
                                    onChange={(e) => setEditFormData({ ...editFormData, expires_at: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center space-x-2 text-indigo-600 mb-4">
                                    <Key className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Gestão de Administrador</span>
                                </div>
                                <div className="space-y-3">
                                    <Input
                                        label="Alterar Email do Admin"
                                        type="email"
                                        value={editAdminData.email}
                                        onChange={(e) => setEditAdminData({ ...editAdminData, email: e.target.value })}
                                        placeholder="Novo email (opcional)"
                                    />
                                    <Input
                                        label="Resetar Senha"
                                        type="password"
                                        value={editAdminData.password}
                                        onChange={(e) => setEditAdminData({ ...editAdminData, password: e.target.value })}
                                        placeholder="Nova senha (opcional)"
                                    />
                                    <p className="text-[10px] text-gray-500 italic">
                                        Preencha apenas se desejar alterar o email ou resetar a senha do administrador principal.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={isUpdatingCompany}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isUpdatingCompany}>
                                    {isUpdatingCompany ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* User Management Modal (Single User per Company) */}
            {showUsersModal && selectedCompany && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Gerenciar Usuário</h3>
                                <p className="text-sm text-gray-500">{selectedCompany.name}</p>
                            </div>
                            <button onClick={() => setShowUsersModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {loadingUsers ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {companyUsers.length > 0 ? (
                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-4">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <span className="text-indigo-600 font-extrabold">{(companyUsers[0].profile?.email || 'U').substring(0, 1).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{companyUsers[0].profile?.email || 'Usuário s/ Email'}</p>
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Usuário Verificado</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-3 rounded-xl border border-yellow-100 mb-4">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-xs font-medium">Nenhum usuário vinculado a esta empresa.</p>
                                    </div>
                                )}

                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                                                {companyUsers.length > 0 ? 'Mudar Email de Login' : 'Email de Acesso'}
                                            </label>
                                            <Input
                                                value={addUserFormData.email}
                                                onChange={(e) => setAddUserFormData({ ...addUserFormData, email: e.target.value })}
                                                placeholder="usuario@email.com"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">
                                                {companyUsers.length > 0 ? 'Nova Senha (deixe vazio se não quiser mudar)' : 'Senha de Acesso'}
                                            </label>
                                            <Input
                                                type="password"
                                                value={addUserFormData.password}
                                                onChange={(e) => setAddUserFormData({ ...addUserFormData, password: e.target.value })}
                                                placeholder="••••••••"
                                                required={companyUsers.length === 0}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button type="submit" disabled={isAddingUser} className="w-full h-11 shadow-lg shadow-indigo-200">
                                            {isAddingUser ? 'Aguarde...' : companyUsers.length > 0 ? 'Salvar Novas Credenciais' : 'Criar e Vincular Usuário'}
                                        </Button>
                                    </div>

                                    {companyUsers.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUser(companyUsers[0].user_id)}
                                            className="w-full text-center text-xs text-red-400 hover:text-red-600 font-medium py-2 transition-colors"
                                        >
                                            Remover vínculo deste usuário
                                        </button>
                                    )}
                                </form>
                            </div>
                        )}

                        <div className="pt-6 border-t mt-6 flex justify-end">
                            <Button variant="outline" onClick={() => setShowUsersModal(false)} className="w-full md:w-auto">
                                Fechar
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SuperAdminPage;
