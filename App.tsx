import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ServicesPage from './pages/ServicesPage';
import CalendarPage from './pages/CalendarPage';
import FinancePage from './pages/FinancePage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminPlaceholder from './pages/AdminPlaceholder';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import { USER_NAV_ITEMS, ADMIN_NAV_ITEMS } from './constants';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from './utils/supabaseClient';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState<string>(location.pathname === '/' ? '/' : location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle(); // Use maybeSingle to avoid errors if profile is still syncing

      setProfile(profileData);

      if (uid) {
        // Fetch company mapping and company info
        const { data: mappingData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', uid)
          .maybeSingle();

        if (mappingData?.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', mappingData.company_id)
            .maybeSingle();

          if (companyData) {
            setCompany(companyData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile/company:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Fetch background but don't block with global Loading spinner
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setCompany(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Update activePath when location changes, handling root path specifically
    const currentPath = location.pathname === '/' ? '/' : location.pathname;
    setActivePath(currentPath);
  }, [location.pathname]);

  const getPageTitle = (path: string) => {
    const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
    const navItems = isSuperAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
    const navItem = navItems.find(item => item.path === path);
    return navItem ? navItem.label : 'ElevenStore';
  };

  const handleNavigate = (path: string) => {
    setActivePath(path);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLaunchService = () => {
    handleNavigate('/sales');
    navigate('/sales', { state: { openModal: true, defaultItemType: 'service' } });
  };

  const handleLaunchSale = () => {
    handleNavigate('/sales');
    navigate('/sales', { state: { openModal: true } });
  };

  const handleNewService = () => {
    alert('Novo Serviço clicked!');
    // Implement new service form/modal
  };

  const handleNewAppointment = () => {
    alert('Novo Agendamento clicked!');
    // Implement new appointment form/modal
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  // --- Strict License/Access Blocking ---
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const isSuspended = company && company.status !== 'active';
  const noCompany = !company && !loading;

  if (!isSuperAdmin && (isSuspended || noCompany)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[9999] px-4">
        <Card className="max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-t-red-600 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto flex items-center justify-center mb-6">
            <img src="/logo.png" alt="ElevenStore Logo" className="h-12 w-auto object-contain grayscale" />
          </div>

          {isSuspended ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Bloqueado</h2>
              <p className="text-gray-600 mb-8 text-lg font-medium leading-relaxed">
                Sua licença expirou ou está bloqueada. Entre em contato com o suporte.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Vínculo Pendente</h2>
              <p className="text-gray-600 mb-8 text-lg font-medium leading-relaxed">
                Seu usuário ainda não está associado a nenhuma empresa. Por favor, aguarde o convite ou entre em contato com o administrador.
              </p>
            </>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              <Shield className="w-4 h-4" />
              <span>Sair da Conta</span>
            </Button>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Tentar Novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  // ---------------------------------------
  return (
    <div className="flex w-full min-h-screen bg-gray-50 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activePath={activePath} onNavigate={handleNavigate} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} role={profile?.role} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:ml-64 overflow-hidden relative"> {/* Adjust margin for sidebar */}
          <Header
            title={getPageTitle(activePath)}
            onServiceClick={
              !isSuperAdmin && (activePath === '/' || activePath === '/finance' || activePath === '/sales') &&
                (company?.status === 'active')
                ? handleLaunchService
                : undefined
            }
            onSaleClick={
              !isSuperAdmin && (activePath === '/' || activePath === '/finance' || activePath === '/sales') &&
                (company?.status === 'active')
                ? handleLaunchSale
                : undefined
            }
            toggleSidebar={toggleSidebar}
          />
          <main className="flex-1 overflow-y-auto relative">
            <Routes>
              {/* Redirect Super Admin from root to admin dashboard */}
              {isSuperAdmin && location.pathname === '/' && (
                <Route path="/" element={<div className="p-8"><p className="animate-pulse">Redirecionando para o Console de Administração...</p>{React.useEffect(() => { navigate('/admin'); }, [])}</div>} />
              )}

              {/* Company Level Routes (Hidden from Super Admin) */}
              {!isSuperAdmin && (
                <>
                  <Route path="/" element={<DashboardPage onServiceClick={handleLaunchService} onSaleClick={handleLaunchSale} />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/services" element={<ServicesPage onSaleClick={handleLaunchSale} onNewServiceClick={handleNewService} />} />
                  <Route path="/calendar" element={<CalendarPage onNewAppointmentClick={handleNewAppointment} />} />
                  <Route path="/finance" element={<FinancePage onServiceClick={handleLaunchService} onSaleClick={handleLaunchSale} />} />
                  <Route path="/sales" element={<SalesPage onSaleClick={handleLaunchSale} />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </>
              )}

              {/* Super Admin Routes */}
              {isSuperAdmin && (
                <>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/companies" element={<AdminCompaniesPage />} />
                  <Route path="/admin/plans" element={<AdminPlaceholder title="Planos & Assinaturas" description="Gerencie modelos de preços, limites de recursos e períodos de teste do SaaS." />} />
                  <Route path="/admin/users" element={<AdminPlaceholder title="Usuários & Acessos" description="Controle global de permissões, papéis administrativos e auditoria de usuários." />} />
                  <Route path="/admin/billing" element={<AdminPlaceholder title="Financeiro SaaS" description="Visão consolidada de faturas, inadimplência e projeção de receita MRR." />} />
                  <Route path="/admin/logs" element={<AdminPlaceholder title="Logs de Sistema" description="Rastreamento completo de ações administrativas e auditoria de segurança." />} />
                  <Route path="/admin/settings" element={<AdminPlaceholder title="Configurações Globais" description="Parâmetros gerais do sistema, chaves de API e variáveis de ambiente SaaS." />} />
                </>
              )}

              {/* Fallback for unauthorized access or missing routes */}
              <Route path="*" element={<div className="p-8 text-center"><p className="text-gray-500">Página não encontrada ou acesso restrito.</p><Button onClick={() => navigate(isSuperAdmin ? '/admin' : '/')} className="mt-4">Voltar ao Início</Button></div>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;