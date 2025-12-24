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
    Trash
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
    const [addUserFormData, setAddUserFormData] = useState({ email: '', role: 'member' });
    const [isAddingUser, setIsAddingUser] = useState(false);
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
            const { data, error } = await supabase
                .from('companies')
                .insert([{ name: newCompanyName, status: 'active', plan: 'standard' }])
                .select()
                .single();

            if (error) throw error;
            setCompanies([data, ...companies]);
            setShowCreateModal(false);
            setNewCompanyName('');
        } catch (error) {
            console.error('Error creating company:', error);
        }
    };

    const handleEditCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    name: editFormData.name,
                    plan: editFormData.plan,
                    expires_at: editFormData.expires_at || null
                })
                .eq('id', selectedCompany.id);

            if (error) throw error;
            setCompanies(companies.map(c => c.id === selectedCompany.id ? { ...c, ...editFormData, expires_at: editFormData.expires_at || null } : c));
            setShowEditModal(false);
        } catch (error) {
            console.error('Error updating company:', error);
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
        } catch (error) {
            console.error('Error fetching company users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;
        setIsAddingUser(true);
        try {
            // 1. Find user by email in profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', addUserFormData.email)
                .single();

            if (profileError || !profile) {
                alert('Usuário não encontrado. Peça para o usuário se cadastrar primeiro.');
                return;
            }

            // 2. Insert into company_users
            const { error: insertError } = await supabase
                .from('company_users')
                .insert([
                    {
                        company_id: selectedCompany.id,
                        user_id: profile.id,
                        role: addUserFormData.role
                    }
                ]);

            if (insertError) {
                if (insertError.code === '23505') {
                    alert('Este usuário já faz parte desta empresa.');
                } else {
                    throw insertError;
                }
                return;
            }

            setAddUserFormData({ email: '', role: 'member' });
            fetchCompanyUsers(selectedCompany.id);
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Erro ao adicionar usuário.');
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
        setShowEditModal(true);
    };

    const openUsersModal = (company: Company) => {
        setSelectedCompany(company);
        fetchCompanyUsers(company.id);
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
                            <div className="pt-4 flex justify-end space-x-3">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    Criar Empresa
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
                            <div className="pt-4 flex justify-end space-x-3">
                                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Users Modal */}
            {showUsersModal && selectedCompany && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Usuários da Empresa</h3>
                                <p className="text-sm text-gray-500">{selectedCompany.name}</p>
                            </div>
                            <button onClick={() => setShowUsersModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Add User Form */}
                        <div className="px-6 pb-4 border-b">
                            <form onSubmit={handleAddUser} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Convidar por Email</label>
                                    <Input
                                        value={addUserFormData.email}
                                        onChange={(e) => setAddUserFormData({ ...addUserFormData, email: e.target.value })}
                                        placeholder="usuario@email.com"
                                        required
                                        className="py-1.5"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Cargo</label>
                                    <select
                                        className="w-full px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                        value={addUserFormData.role}
                                        onChange={(e) => setAddUserFormData({ ...addUserFormData, role: e.target.value })}
                                    >
                                        <option value="owner">Dono</option>
                                        <option value="admin">Admin</option>
                                        <option value="member">Membro</option>
                                    </select>
                                </div>
                                <Button type="submit" disabled={isAddingUser} className="mb-[2px] h-[38px]">
                                    {isAddingUser ? '...' : <UserPlus className="w-4 h-4" />}
                                </Button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                            {loadingUsers ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : companyUsers.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    Nenhum usuário vinculado a esta empresa.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {companyUsers.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <span className="text-indigo-600 font-extrabold text-xs">{(item.profile?.email || 'U').substring(0, 1).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.profile?.email || 'Usuário s/ Email'}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-gray-400 font-mono">ID: {item.user_id.substring(0, 8)}</span>
                                                        <select
                                                            className="text-[10px] font-bold text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:underline"
                                                            value={item.role}
                                                            onChange={(e) => handleUpdateUserRole(item.user_id, e.target.value)}
                                                        >
                                                            <option value="owner">Dono</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="member">Membro</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveUser(item.user_id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Remover Usuário"
                                            >
                                                <UserMinus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setShowUsersModal(false)}>
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
