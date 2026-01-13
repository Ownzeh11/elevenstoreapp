// Add React import for `React.ElementType`
import React from 'react';

export interface Product {
  id: string;
  company_id: string;
  name: string;
  quantity: number;
  min_stock: number;
  status: string; // Simplified from union type for DB compatibility, or keep union if strict
  price: number;
  description?: string;
  icon: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  duration: number; // minutes
  duration_minutes?: number; // DB column
  price: number;
  display_id?: number;
}

export interface CalendarEvent {
  id: string;
  company_id: string;
  customer_name: string;
  service_id?: string;
  start_time: string; // ISO Timestamp (contains date and time)
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface Transaction {
  id: string;
  company_id: string;
  created_at: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  reference_id?: string;
  reference_type?: 'sale' | 'reversal' | 'initial' | 'manual';
  origin?: 'product_sale' | 'service_sale' | 'manual';
  category?: 'product' | 'service' | 'other';
  status?: 'paid' | 'pending';
  due_date?: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id?: string;
  service_id?: string;
  product_name?: string; // For display
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: string;
  company_id?: string;
  customer: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  discount_value: number;
  discount_type: 'amount' | 'percentage';
  total: number;
  payment_method: 'dinheiro' | 'cartão' | 'pix' | 'promissória';
  installments: number;
  down_payment?: number;
  display_id: number;
  items?: SaleItem[];
}

export interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType; // Icon component from lucide-react
}

export interface SummaryCardData {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

export interface RecentActivity {
  id: string;
  type: 'Venda' | 'Serviço' | 'Cliente';
  description: string;
  amount?: number;
  timeAgo: string;
  icon: React.ElementType;
}

export interface Company {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'blocked';
  plan: string;
  address?: string;
  phone?: string;
  currency?: string;
  expires_at?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  username?: string;
  role: 'USER' | 'SUPER_ADMIN';
  created_at: string;
}

// Move TableColumn interface from components/ui/Table.tsx to types.ts to make it exportable
export interface TableColumn<T> {
  key: keyof T | 'actions';
  header: string;
  render?: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}