import React from 'react';
import { Menu } from 'lucide-react';
import Button from '../ui/Button';
import { ShoppingCart, Wrench } from 'lucide-react';

interface HeaderProps {
  title: string;
  onServiceClick?: () => void;
  onSaleClick?: () => void;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onServiceClick, onSaleClick, toggleSidebar }) => {
  return (
    <header className="flex items-center justify-between p-4 md:px-8 bg-white shadow-sm h-16 border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center">
        <button
          className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 mr-2"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex space-x-2">
        {onServiceClick && (
          <Button variant="outline" size="md" icon={Wrench} onClick={onServiceClick}>
            Lançar Serviço
          </Button>
        )}
        {onSaleClick && (
          <Button variant="primary" size="md" icon={ShoppingCart} onClick={onSaleClick}>
            Lançar Venda
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
