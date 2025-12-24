import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { Service, TableColumn } from '../types';
import { Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface ServicesPageProps {
  onSaleClick?: () => void;
  onNewServiceClick?: () => void; // Optional now as we handle it internally
}

const ServicesPage: React.FC<ServicesPageProps> = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Service Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
  });

  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).openModal) {
      setIsModalOpen(true);
      setEditingId(null);
      setFormData({ name: '', price: '', duration: '' });
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

      if (!companyId) {
        const { data: userData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          setCompanyId(userData.company_id);
          const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('company_id', userData.company_id)
            .order('created_at', { ascending: false });

          if (servicesData) setServices(servicesData);
        } else {
          console.warn("User profile or company link not found yet");
        }
      } else {
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (servicesData) setServices(servicesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      alert("Erro: ID da empresa não encontrado. Tente recarregar a página.");
      console.error("Company ID is missing");
      return;
    }

    setSubmitLoading(true);
    try {
      console.log("Submitting service:", {
        company_id: companyId,
        id: editingId,
        name: formData.name,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration)
      });

      let error;

      if (editingId) {
        const { error: updateError } = await supabase
          .from('services')
          .update({
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            duration_minutes: parseInt(formData.duration) || 30,
          })
          .eq('id', editingId)
          .eq('company_id', companyId);

        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('services').insert([
          {
            company_id: companyId,
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            duration_minutes: parseInt(formData.duration) || 30,
          }
        ]);
        error = insertError;
      }

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setIsModalOpen(false);
      setFormData({ name: '', price: '', duration: '' });
      setEditingId(null);
      fetchData();
      alert(editingId ? "Serviço atualizado com sucesso!" : "Serviço criado com sucesso!");
    } catch (error: any) {
      console.error("Catch error:", error);
      alert('Erro ao salvar serviço: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        setServices(services.filter((s) => s.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: (service.duration_minutes || service.duration || 30).toString()
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatId = (id?: number) => {
    if (!id) return '#----';
    return `#${String(id).padStart(4, '0')}`;
  };

  const columns: TableColumn<Service>[] = [
    {
      key: 'display_id' as keyof Service,
      header: 'ID',
      render: (service) => <span className="font-medium text-gray-900">{formatId(service.display_id)}</span>
    },
    { key: 'name', header: 'Serviço' },
    // Use the correct property from DB/Type which might need mapping if DB returns duration_minutes
    // Assuming type was updated or DB returns matches. 
    // Actually, DB has `duration_minutes`. UI Type has `duration`. Supabase returns DB columns.
    // We should probably map it or update Type. Let's assume for now we map it in render or fetch.
    {
      key: 'duration',
      header: 'Duração',
      render: (service: any) => `${service.duration_minutes || service.duration || 0} min`
    },
    { key: 'price', header: 'Preço', render: (service) => `R$ ${service.price.toFixed(2).replace('.', ',')}` },
    {
      key: 'actions',
      header: 'Ações',
      render: (service) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            aria-label={`Editar ${service.name}`}
            onClick={() => handleEdit(service)}
            className="text-blue-600 hover:text-blue-800"
          >
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            aria-label={`Excluir ${service.name}`}
            onClick={() => handleDelete(service.id)}
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
          id="service-search"
          type="search"
          placeholder="Pesquisar serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs mb-4 sm:mb-0 sm:mr-4"
        />
        <div className="flex space-x-2">
          <Button variant="primary" icon={Plus} onClick={() => { setEditingId(null); setFormData({ name: '', price: '', duration: '' }); setIsModalOpen(true); }}>
            Novo Serviço
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando serviços...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum serviço cadastrado.</div>
        ) : (
          <Table data={filteredServices} columns={columns} rowKey="id" />
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', price: '', duration: '' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    name="duration"
                    required
                    placeholder="30"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.duration}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', price: '', duration: '' }); }}
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

export default ServicesPage;