import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SettingsPage: React.FC = () => {
  // Account settings state
  const [username, setUsername] = useState('João Silva');
  const [email, setEmail] = useState('joao.silva@elevenstore.com');
  const [password, setPassword] = useState('');

  // Company settings state
  const [companyName, setCompanyName] = useState('ElevenStore LTDA');
  const [address, setAddress] = useState('Rua Principal, 123');
  const [phone, setPhone] = useState('(XX) XXXXX-XXXX');
  const [currency, setCurrency] = useState('BRL');

  const handleAccountSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Configurações da conta salvas!');
    console.log({ username, email, password });
  };

  const handleCompanySave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Configurações da empresa salvas!');
    console.log({ companyName, address, phone, currency });
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Account Settings */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Configurações da Conta</h2>
        <form onSubmit={handleAccountSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="username"
              label="Nome de Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de Usuário"
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <Input
              id="password"
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>
          <Button type="submit" variant="primary" className="mt-4">
            Salvar
          </Button>
        </form>
      </Card>

      {/* Company Settings */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Configurações da Empresa</h2>
        <form onSubmit={handleCompanySave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              placeholder="Endereço"
            />
            <Input
              id="phone"
              label="Telefone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone"
            />
            <Input
              id="currency"
              label="Moeda"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="Moeda"
            />
          </div>
          <Button type="submit" variant="primary" className="mt-4">
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
