import { Product, Service, CalendarEvent, Transaction, Sale, RecentActivity } from '../types';
import { ShoppingCart, Wrench, UserPlus, Package, Clock, DollarSign, CalendarDays } from 'lucide-react';

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Camiseta Básica Branca', quantity: 150, status: 'Em Estoque', icon: 'tshirt' },
  { id: 'p2', name: 'Calça Jeans Masculina', quantity: 5, status: 'Baixo Estoque', icon: 'pants' },
  { id: 'p3', name: 'Tênis Esportivo', quantity: 0, status: 'Esgotado', icon: 'shoe' },
  { id: 'p4', name: 'Tênis Básica Farta', quantity: 100, status: 'Em Estoque', icon: 'shoe' },
  { id: 'p5', name: 'Calça Jeans Masculina', quantity: 5, status: 'Baixo Estoque', icon: 'pants' },
  { id: 'p6', name: 'Tênis Esportivo', quantity: 0, status: 'Esgotado', icon: 'shoe' },
  { id: 'p7', name: 'Vestido Floral', quantity: 20, status: 'Em Estoque', icon: 'dress' },
  { id: 'p8', name: 'Jaqueta de Couro', quantity: 2, status: 'Baixo Estoque', icon: 'jacket' },
];

export const mockServices: Service[] = [
  { id: 's1', name: 'Manutenção de Celular', duration: 60, price: 150.00 },
  { id: 's2', name: 'Troca de Tela', duration: 45, price: 250.00 },
  { id: 's3', name: 'Formatação', duration: 90, price: 120.00 },
  { id: 's4', name: 'Limpeza Interna', duration: 30, price: 80.00 },
  { id: 's5', name: 'Instalação de Software', duration: 120, price: 180.00 },
];

export const mockCalendarEvents: CalendarEvent[] = [
  { id: 'e1', title: 'Corte de Cabelo', time: '10:00', date: '2024-09-02', type: 'cabelo' },
  { id: 'e2', title: 'Manutenção PC', time: '14:00', date: '2024-09-02', type: 'pc' },
  { id: 'e3', title: 'Revisão Carro', time: '09:00', date: '2024-09-04', type: 'carro' },
  { id: 'e4', title: 'Instalação Ar Con', time: '11:00', date: '2024-09-06', type: 'ar_con' },
  { id: 'e5', title: 'Corte de Cabelo', time: '13:00', date: '2024-09-10', type: 'cabelo' },
  { id: 'e6', title: 'Consultoria', time: '15:00', date: '2024-09-12', type: 'consultoria' },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', date: '15/01/2024', description: 'Venda #1025 - Ana Silva', type: 'Produto', value: 150.00 },
  { id: 't2', date: '14/01/2024', description: 'Serviço: Manutenção - Carlos Souza', type: 'Serviço', value: 200.00 },
  { id: 't3', date: '14/01/2024', description: 'Venda #1026 - Pedro Oliveira', type: 'Produto', value: 300.00 },
  { id: 't4', date: '13/01/2024', description: 'Venda #1027 - Juliana Pereira', type: 'Produto', value: 75.00 },
  { id: 't5', date: '12/01/2024', description: 'Serviço: Troca de Tela - Ana Silva', type: 'Serviço', value: 250.00 },
  { id: 't6', date: '12/01/2024', description: 'Venda #1028 - Ricardo Mendes', type: 'Produto', value: 120.00 },
];

export const mockSales: Sale[] = [
  { id: 'v1', customer: 'Ana Silva', date: '05/10/2023', total: 89.99 },
  { id: 'v2', customer: 'Ricardo Mendes', date: '04/10/2023', total: 299.00 },
  { id: 'v3', customer: 'Ricardo Mendes', date: '04/10/2023', total: 299.00 },
  { id: 'v4', customer: 'Carlos Souza', date: '05/10/2023', total: 150.00 },
  { id: 'v5', customer: 'Ricardo Mendes', date: '05/10/2023', total: 299.00 },
  { id: 'v6', customer: 'Ricardo Mendes', date: '04/10/2023', total: 299.00 },
];

export const mockRecentActivities: RecentActivity[] = [
  { id: 'ra1', type: 'Venda', description: 'Venda #1024 Cliente: Ana Silva', amount: 89.99, timeAgo: '2 minutos atrás', icon: ShoppingCart },
  { id: 'ra2', type: 'Serviço', description: 'Serviço: Manutenção Cliente: Carlos Souza', amount: 150.00, timeAgo: '15 minutos atrás', icon: Wrench },
  { id: 'ra3', type: 'Cliente', description: 'Novo Cliente Cadastrado Juliana Pereira', timeAgo: '30 minutos atrás', icon: UserPlus },
  { id: 'ra4', type: 'Venda', description: 'Venda #1023 Cliente: Ricardo Mendes', amount: 299.00, timeAgo: '1 hora atrás', icon: ShoppingCart },
  { id: 'ra5', type: 'Serviço', description: 'Serviço: Troca de Tela Cliente: Pedro Silva', amount: 250.00, timeAgo: '3 horas atrás', icon: Wrench },
];
