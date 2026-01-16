import React from 'react';
import { Link } from 'react-router-dom';
import { USER_NAV_ITEMS, ADMIN_NAV_ITEMS } from '../../constants';
import { User, ChevronRight, LogOut, Shield, Settings2 } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  role?: 'USER' | 'SUPER_ADMIN';
}

const Sidebar: React.FC<SidebarProps> = ({ activePath, onNavigate, isOpen, toggleSidebar, role }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col`}
      >
        {/* Logo Section */}
        <div className="flex items-center p-4 h-16 border-b border-gray-200">
          <div className="flex h-8 w-8 mr-3 shrink-0">
            {role === 'SUPER_ADMIN' ? (
              <div className="w-full h-full bg-slate-800 rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
            ) : (
              <>
                <div className="w-[45%] h-full bg-blue-600 rounded-l-md mr-[10%]"></div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="h-[45%] bg-orange-400 rounded-tr-md"></div>
                  <div className="h-[45%] bg-indigo-200 rounded-br-md"></div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xl text-gray-800 leading-none">
              <span className="font-bold">Eleven</span>Store
            </span>
            {role === 'SUPER_ADMIN' && (
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Control Center</span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {(role === 'SUPER_ADMIN' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS).map((item) => {
            const isActive = activePath === item.path;
            const isAdminPath = item.path.startsWith('/admin');

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  if (isOpen) toggleSidebar();
                }}
                className={`flex items-center px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200 ${isActive
                    ? (isAdminPath ? 'bg-indigo-50 text-indigo-700 font-medium' : 'bg-blue-50 text-blue-700 font-medium')
                    : ''
                  }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive ? (isAdminPath ? 'text-indigo-600' : 'text-blue-600') : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              // The auth state listener in App.tsx will handle the redirect
            }}
            className="flex items-center w-full text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="flex-1 text-left font-medium">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
