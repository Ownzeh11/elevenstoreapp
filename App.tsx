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
import { NAV_ITEMS } from './constants';
import { supabase } from './utils/supabaseClient';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState<string>(location.pathname === '/' ? '/' : location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Update activePath when location changes, handling root path specifically
    const currentPath = location.pathname === '/' ? '/' : location.pathname;
    setActivePath(currentPath);
  }, [location.pathname]);

  const getPageTitle = (path: string) => {
    const navItem = NAV_ITEMS.find(item => item.path === path);
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

  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      <Sidebar activePath={activePath} onNavigate={handleNavigate} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64"> {/* Adjust margin for sidebar */}
        <Header
          title={getPageTitle(activePath)}
          onServiceClick={activePath === '/' || activePath === '/finance' || activePath === '/sales' ? handleLaunchService : undefined}
          onSaleClick={activePath === '/' || activePath === '/finance' || activePath === '/sales' ? handleLaunchSale : undefined}
          toggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage onServiceClick={handleLaunchService} onSaleClick={handleLaunchSale} />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/services" element={<ServicesPage onSaleClick={handleLaunchSale} onNewServiceClick={handleNewService} />} />
            <Route path="/calendar" element={<CalendarPage onNewAppointmentClick={handleNewAppointment} />} />
            <Route path="/finance" element={<FinancePage onServiceClick={handleLaunchService} onSaleClick={handleLaunchSale} />} />
            <Route path="/sales" element={<SalesPage onSaleClick={handleLaunchSale} />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
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