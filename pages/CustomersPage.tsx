import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { Customer, TableColumn } from '../types';
import { Plus, Edit, Trash2, X, Loader2, User } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const CustomersPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (!companyId) {
                const { data: userData } = await supabase
                    .from('company_users')
                    .select('company_id')
                    .eq('user_id', user.id)
                    .single();

                if (userData) {
                    setCompanyId(userData.company_id);
                    const { data: customersData } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('company_id', userData.company_id)
                        .order('created_at', { ascending: false });

                    if (customersData) setCustomers(customersData);
                } else {
                    console.error("User not associated with any company");
                    alert("Erro: Seu usuário não está associado a nenhuma empresa.");
                }
            } else {
                const { data: customersData } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false });

                if (customersData) setCustomers(customersData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) {
            alert("Erro: ID da empresa não encontrado. Tente recarregar a página.");
            return;
        }

        setSubmitLoading(true);
        try {
            let error;

            if (editingId) {
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address
                    })
                    .eq('id', editingId)
                    .eq('company_id', companyId);

                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('customers').insert([
                    {
                        company_id: companyId,
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address
                    }
                ]);
                error = insertError;
            }

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
            setEditingId(null);
            fetchData();
            alert(editingId ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
        } catch (error: any) {
            console.error("Catch error:", error);
            alert('Erro ao salvar cliente: ' + (error.message || JSON.stringify(error)));
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                const { error } = await supabase.from('customers').delete().eq('id', id);
                if (error) throw error;
                setCustomers(customers.filter((c) => c.id !== id));
            } catch (error: any) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingId(customer.id);
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || ''
        });
        setIsModalOpen(true);
    };

    const filteredCustomers = customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: TableColumn<Customer>[] = [
        {
            key: 'name',
            header: 'Nome',
            render: (customer) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 mr-3 flex items-center justify-center text-blue-600">
                        <User size={16} />
                    </div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                </div>
            )
        },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Telefone' },
        {
            key: 'actions',
            header: 'Ações',
            render: (customer) => (
                <div className="flex space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        aria-label={`Editar ${customer.name}`}
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-800"
                    >
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        aria-label={`Excluir ${customer.name}`}
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-800"
                    >
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 md:p-8 relative">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                <Input
                    id="customer-search"
                    type="search"
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs mb-4 sm:mb-0 sm:mr-4"
                />
                <Button variant="primary" icon={Plus} onClick={() => { setEditingId(null); setFormData({ name: '', email: '', phone: '', address: '' }); setIsModalOpen(true); }}>
                    Novo Cliente
                </Button>
            </div>

            <Card>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Carregando clientes...</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</div>
                ) : (
                    <Table data={filteredCustomers} columns={columns} rowKey="id" />
                )}
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                <textarea
                                    name="address"
                                    rows={2}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
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

export default CustomersPage;
