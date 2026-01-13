import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabaseClient';
import { Loader2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  // Account settings state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Company settings state
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('BRL');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) setUsername(profile.username || '');

      // Fetch Company
      const { data: userData } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (userData) {
        setCompanyId(userData.company_id);
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single();

        if (company) {
          setCompanyName(company.name || '');
          setAddress(company.address || '');
          setPhone(company.phone || '');
          setCurrency(company.currency || 'BRL');
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAccount(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update Auth Email/Password if changed
      if (email !== user.email || password) {
        const updates: any = {};
        if (email !== user.email) updates.email = email;
        if (password) updates.password = password;

        const { error: authError } = await supabase.auth.updateUser(updates);
        if (authError) throw authError;
      }

      alert('Configurações da conta salvas com sucesso!');
      setPassword(''); // Clear password field
    } catch (error: any) {
      console.error('Error saving account:', error);
      alert('Erro ao salvar configurações da conta: ' + error.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setSavingCompany(true);
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName,
          address,
          phone,
          currency
        })
        .eq('id', companyId);

      if (error) throw error;
      alert('Configurações da empresa salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving company:', error);
      alert('Erro ao salvar configurações da empresa: ' + error.message);
    } finally {
      setSavingCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Account Settings */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          Configurações da Conta
        </h2>
        <form onSubmit={handleAccountSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              id="username"
              label="Nome de Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: João Silva"
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <Input
              id="password"
              label="Nova Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingAccount} className="min-w-[120px]">
              {savingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {savingAccount ? 'Salvando...' : 'Salvar Conta'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Company Settings */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Configurações da Empresa</h2>
        <form onSubmit={handleCompanySave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="companyName"
              label="Nome da Empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da Empresa"
            />
            <Input
              id="address"
              label="Endereço"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço completo"
            />
            <Input
              id="phone"
              label="Telefone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
            />
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Moeda</label>
              <select
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingCompany} className="min-w-[120px]">
              {savingCompany ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {savingCompany ? 'Salvando...' : 'Salvar Empresa'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
