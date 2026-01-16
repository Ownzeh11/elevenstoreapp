import { NavItem } from './types';
import {
  LayoutDashboard,
  Package,
  Wrench,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  Settings,
  User,
  Building2,
  Users,
  CreditCard,
  Activity,
  ShieldCheck,
  FileSearch
} from 'lucide-react';

export const USER_NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Produtos', icon: Package, module: 'inventory' },
  { path: '/services', label: 'Serviços', icon: Wrench, module: 'calendar' },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays, module: 'calendar' },
  { path: '/finance', label: 'Financeiro', icon: DollarSign, module: 'finance' },
  { path: '/sales', label: 'Vendas', icon: ShoppingCart, module: 'sales' },
  { path: '/customers', label: 'Clientes', icon: User, module: 'customers' },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { path: '/admin', label: 'Dashboard Global', icon: LayoutDashboard },
  { path: '/admin/companies', label: 'Empresas', icon: Building2 },
  { path: '/admin/plans', label: 'Planos & Assinaturas', icon: ShieldCheck },
  { path: '/admin/users', label: 'Usuários & Permissões', icon: Users },
  { path: '/admin/billing', label: 'Financeiro / SaaS', icon: CreditCard },
  { path: '/admin/logs', label: 'Logs de Auditoria', icon: FileSearch },
  { path: '/admin/settings', label: 'Configurações Sistema', icon: Settings },
];

export const NAV_ITEMS = USER_NAV_ITEMS; // Fallback or default

export const PRODUCT_ICONS: { [key: string]: string } = {
  tshirt: 'https://picsum.photos/32/32?random=1',
  pants: 'https://picsum.photos/32/32?random=2',
  shoe: 'https://picsum.photos/32/32?random=3',
  dress: 'https://picsum.photos/32/32?random=4',
  jacket: 'https://picsum.photos/32/32?random=5',
  default: 'https://picsum.photos/32/32?random=6', // Default icon if not found
};
