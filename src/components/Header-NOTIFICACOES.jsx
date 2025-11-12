import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Menu, X, LogOut, User, Settings, Home, FileText, Users, BarChart3 } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Header = ({ userRole, userName, onLogout, currentPage, onNavigate }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [podeReceberNotificacoes, setPodeReceberNotificacoes] = useState(false);

  useEffect(() => {
    verificarPermissaoNotificacoes();
  }, [userRole]);

  const verificarPermissaoNotificacoes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se o usuário tem permissão para receber notificações
      const { data } = await supabase
        .from('users')
        .select(`
          perfil:perfis(
            perfis_permissoes(permissao)
          )
        `)
        .eq('id', user.id)
        .single();

      const permissoes = data?.perfil?.perfis_permissoes || [];
      const temPermissao = permissoes.some(p => 
        p.permissao === 'receber_notificacoes' || 
        p.permissao === 'receber_notificacoes_setor'
      );
      
      setPodeReceberNotificacoes(temPermissao);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      // Para admins e gerentes, permitir por padrão
      setPodeReceberNotificacoes(['admin', 'gerente'].includes(userRole));
    }
  };

  const menuItems = [
    { 
      id: 'home', 
      label: 'Dashboard', 
      icon: Home, 
      visible: true 
    },
    { 
      id: 'ocorrencias', 
      label: 'Ocorrências', 
      icon: FileText, 
      visible: true 
    },
    { 
      id: 'visitas', 
      label: 'Visitas', 
      icon: Users, 
      visible: userRole === 'admin' || userRole === 'gerente' || userRole === 'vendedor'
    },
    { 
      id: 'relatorios', 
      label: 'Relatórios', 
      icon: BarChart3, 
      visible: userRole === 'admin' || userRole === 'gerente'
    },
    { 
      id: 'configuracoes', 
      label: 'Configurações', 
      icon: Settings, 
      visible: userRole === 'admin'
    }
  ];

  const handleNavigation = (pageId) => {
    onNavigate(pageId);
    setMenuAberto(false);
  };

  return (
    <>
      {/* Header Principal */}
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          {/* Logo e Menu Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            >
              {menuAberto ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PSR</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-orange-600">PSR Embalagens</h1>
                <p className="text-xs text-gray-600">Sistema de Gestão</p>
              </div>
            </div>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.filter(item => item.visible).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Ações do Usuário */}
          <div className="flex items-center gap-2">
            {/* Sino de Notificações - Só aparece se tiver permissão */}
            {podeReceberNotificacoes && <NotificationBell />}
            
            {/* Badge do Usuário */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 truncate max-w-24">
                  {userName || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </div>

            {/* Botão Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Menu Mobile Dropdown */}
        {menuAberto && (
          <div className="md:hidden border-t bg-white">
            <nav className="p-4 space-y-2">
              {/* Informações do Usuário */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{userName || 'Usuário'}</p>
                  <p className="text-sm text-gray-500 capitalize">{userRole}</p>
                </div>
              </div>

              {/* Menu Items */}
              {menuItems.filter(item => item.visible).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm font-medium rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Overlay para fechar menu mobile */}
      {menuAberto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}
    </>
  );
};

export default Header;