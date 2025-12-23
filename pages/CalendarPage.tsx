import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CalendarEvent, Service } from '../types';
import { Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customer: '',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
  });

  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).openModal) {
      setIsModalOpen(true);
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

      let currentCompanyId = companyId;

      if (!currentCompanyId) {
        const { data: userData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          currentCompanyId = userData.company_id;
          setCompanyId(userData.company_id);
        }
      }

      if (currentCompanyId) {
        // Fetch events
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('*')
          .eq('company_id', currentCompanyId);

        if (appointmentsData) setEvents(appointmentsData);

        // Fetch services for dropdown
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', currentCompanyId);

        if (servicesData) setServices(servicesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 for Sunday
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  // Adjust firstDay to be 0 for Monday, 6 for Sunday (PT-BR week starts on Monday often in business context, but standard is Sunday=0)
  // Let's stick to standard Sunday start for calendar grid conformity or match previous logic
  // Previous logic: 0(Sun) -> 6, 1(Mon) -> 0. Monday start.
  const startDayOffset = (firstDay === 0) ? 6 : firstDay - 1;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentMonthEvents = events.filter(event => {
    // event.start_time is ISO string e.g. "2024-09-01T09:00:00+00:00"
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    return (
      eventDate.getFullYear() === currentDate.getFullYear() &&
      eventDate.getMonth() === currentDate.getMonth()
    );
  });

  const getDayEvents = (day: number): CalendarEvent[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    // Iterate events to find match. Comparing strings is safer for timezones if local matches
    return currentMonthEvents.filter(event => {
      if (!event.start_time) return false;
      const d = new Date(event.start_time);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setSubmitLoading(true);
    try {
      // Combine date and time
      const datetime = new Date(`${formData.date}T${formData.time}:00`);

      if (editingId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            customer_name: formData.customer,
            service_id: formData.service_id || null,
            start_time: datetime.toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointments').insert([
          {
            company_id: companyId,
            customer_name: formData.customer,
            service_id: formData.service_id || null,
            start_time: datetime.toISOString(),
            status: 'scheduled'
          }
        ]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ customer: '', service_id: '', date: new Date().toISOString().split('T')[0], time: '09:00' });
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar agendamento: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      setSubmitLoading(true);
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', editingId);
        if (error) throw error;
        setIsModalOpen(false);
        setEditingId(null);
        fetchData();
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    const d = new Date(event.start_time);
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().substring(0, 5);

    setEditingId(event.id);
    setFormData({
      customer: event.customer_name,
      service_id: event.service_id || '',
      date,
      time
    });
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ customer: '', service_id: '', date: new Date().toISOString().split('T')[0], time: '09:00' });
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button variant="outline" size="md" onClick={goToPreviousMonth} icon={ChevronLeft}>
            Anterior
          </Button>
          <Button variant="outline" size="md" onClick={goToNextMonth} className="flex items-center">
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenModal} className="w-full sm:w-auto">
            Novo Agendamento
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="grid grid-cols-7 text-center border-b border-gray-200 bg-gray-50 rounded-t-lg">
          {dayLabels.map((day) => (
            <div key={day} className="px-4 py-3 text-sm font-medium text-gray-700">
              {day.substring(0, 3)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-gray-200 border-gray-200">
          {Array.from({ length: startDayOffset }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square bg-gray-50 border-b border-gray-200"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = getDayEvents(day);
            return (
              <div key={day} className="aspect-square p-2 border-b border-gray-200 flex flex-col items-start overflow-hidden hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-gray-900">{day}</span>
                <div className="flex flex-col gap-1 mt-1 w-full overflow-y-auto max-h-[80px]">
                  {dayEvents.map((event) => {
                    const timeString = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEdit(event)}
                        className="text-xs p-1 rounded-md border text-left bg-blue-50 text-blue-800 border-blue-100 truncate w-full"
                        title={`${event.customer_name} - ${timeString}`}
                      >
                        <p className="font-semibold truncate">{event.customer_name}</p>
                        <p className="text-[10px]">{timeString}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  name="customer"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.customer}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <input
                    type="time"
                    name="time"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.time}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (Opcional)</label>
                <select
                  name="service_id"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.service_id}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={submitLoading}
                >
                  Cancelar
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300"
                  >
                    Excluir
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? 'Salvar Alterações' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
