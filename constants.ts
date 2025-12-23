import { NavItem } from './types';
import { LayoutDashboard, Package, Wrench, CalendarDays, DollarSign, ShoppingCart, Settings, User } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Produtos', icon: Package },
  { path: '/services', label: 'Serviços', icon: Wrench },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays },
  { path: '/finance', label: 'Financeiro', icon: DollarSign },
  { path: '/sales', label: 'Vendas', icon: ShoppingCart },
  { path: '/customers', label: 'Clientes', icon: User },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export const PRODUCT_ICONS: { [key: string]: string } = {
  tshirt: 'https://picsum.photos/32/32?random=1',
  pants: 'https://picsum.photos/32/32?random=2',
  shoe: 'https://picsum.photos/32/32?random=3',
  dress: 'https://picsum.photos/32/32?random=4',
  jacket: 'https://picsum.photos/32/32?random=5',
  default: 'https://picsum.photos/32/32?random=6', // Default icon if not found
};
