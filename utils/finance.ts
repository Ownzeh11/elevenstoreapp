import { supabase } from './supabaseClient';
import { Transaction } from '../types';

export const createTransaction = async (data: {
    company_id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    reference_id?: string;
    reference_type?: 'sale' | 'reversal' | 'initial' | 'manual';
    origin?: 'product_sale' | 'service_sale' | 'manual';
    category?: string;
    status?: 'paid' | 'pending';
    due_date?: string;
}) => {
    // Default status to 'paid' if not provided
    const payload = {
        ...data,
        status: data.status || 'paid'
    };
    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) throw error;
};

export const createReversal = async (transaction: Transaction) => {
    const reversalData = {
        company_id: transaction.company_id,
        description: `Estorno: ${transaction.description}`,
        amount: transaction.amount,
        type: transaction.type === 'income' ? 'expense' : 'income',
        reference_id: transaction.id,
        reference_type: 'reversal' as const,
        origin: transaction.origin,
        category: transaction.category,
        status: transaction.status,
        due_date: transaction.due_date
    };

    const { error } = await supabase.from('transactions').insert([reversalData]);
    if (error) throw error;
};

export const fetchTotalBalance = async (companyId: string) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, status, reference_type')
        .eq('company_id', companyId);

    if (error) throw error;

    const rawIncome = data
        .filter(t => t.type === 'income' && (!t.status || t.status === 'paid') && t.reference_type !== 'reversal')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const reversalExpenses = data
        .filter(t => t.type === 'expense' && (!t.status || t.status === 'paid') && t.reference_type === 'reversal')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const rawExpense = data
        .filter(t => t.type === 'expense' && (!t.status || t.status === 'paid') && t.reference_type !== 'reversal')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const reversalIncomes = data
        .filter(t => t.type === 'income' && (!t.status || t.status === 'paid') && t.reference_type === 'reversal')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const income = rawIncome - reversalExpenses;
    const expense = rawExpense - reversalIncomes;

    return income - expense;
};

export const deleteTransaction = async (id: string) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
