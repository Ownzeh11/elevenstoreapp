import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SaaSAuditLog, TableColumn } from '../types';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Pill from '../components/ui/Pill';
import {
    History,
    Search,
    Filter,
    ShieldCheck,
    AlertTriangle,
    Info,
    Trash2,
    RefreshCw,
    Calendar
} from 'lucide-react';

const AdminLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<SaaSAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [entityFilter, setEntityFilter] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, [entityFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('saas_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (entityFilter !== 'all') {
                query = query.eq('entity_type', entityFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionIcon = (action: string) => {
        if (action.includes('delete') || action.includes('purge')) return <Trash2 className="w-4 h-4 text-red-500" />;
        if (action.includes('error')) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        return <Info className="w-4 h-4 text-indigo-500" />;
    };

    const columns: TableColumn<SaaSAuditLog>[] = [
        {
            key: 'created_at',
            header: 'Data/Hora',
            render: (item) => (
                <div className="flex items-center space-x-2 text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs font-mono">{new Date(item.created_at).toLocaleString()}</span>
                </div>
            )
        },
        {
            key: 'action',
            header: 'Evento',
            render: (item) => (
                <div className="flex items-center">
                    <div className="mr-3 p-1.5 bg-gray-50 rounded-lg">
                        {getActionIcon(item.action)}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.action}</span>
                </div>
            )
        },
        {
            key: 'entity_type',
            header: 'Entidade',
            render: (item) => (
                <Pill variant="default" className="uppercase text-[9px] font-black tracking-widest bg-slate-100 border-slate-200">
                    {item.entity_type}
                </Pill>
            )
        },
        {
            key: 'entity_id',
            header: 'Alvo (ID)',
            render: (item) => (
                <span className="text-[10px] text-gray-400 font-mono">
                    {item.entity_id ? `${item.entity_id.substring(0, 8)}...` : 'N/A'}
                </span>
            )
        },
        {
            key: 'details',
            header: 'Detalhes',
            render: (item) => (
                <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-gray-500 italic">
                    {JSON.stringify(item.details)}
                </div>
            )
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <History className="w-5 h-5" />
                        <span className="text-sm font-bold tracking-wider uppercase">Audit Trail</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Logs de Auditoria</h1>
                    <p className="text-gray-500 mt-1">Histórico completo de ações administrativas no sistema.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizar</span>
                </button>
            </div>

            <Card className="p-4 border-none shadow-sm bg-white flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Filtrar por ação ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all outline-none text-sm placeholder:font-medium"
                    />
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="bg-gray-50 text-gray-700 font-bold text-sm px-4 py-3 rounded-2xl border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all w-full md:w-48"
                    >
                        <option value="all">Todas Entidades</option>
                        <option value="company">Empresas</option>
                        <option value="user">Usuários</option>
                        <option value="plan">Planos</option>
                        <option value="system">Sistema</option>
                    </select>
                </div>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Lendo Auditoria...</p>
                    </div>
                ) : logs.length > 0 ? (
                    <Table data={filteredLogs} columns={columns} rowKey="id" />
                ) : (
                    <div className="p-20 text-center">
                        <ShieldCheck className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">Nenhum log encontrado</h3>
                        <p className="text-sm text-gray-400">O histórico de auditoria está limpo.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminLogsPage;
