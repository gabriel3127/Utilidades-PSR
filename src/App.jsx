// App.jsx - ADAPTADO PARA SEU TOAST EXISTENTE
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Login from './components/Login';
import ListaOcorrencias from './components/ListaOcorrencias';
import DashboardGeral from './components/DashboardGeral';
import Administracao from './components/Administracao';
import DashboardVisitas from './components/DashboardVisitas';
import NotificationBell from './components/Notificationbell';
import { ToastContainer } from './components/ToastNotification'; // Importar seu toast
import AppWithRoutes from './AppWithRoutes';
import { LogOut, AlertTriangle, Truck, Settings, Menu, X, LayoutDashboard } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('Dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  
  const [headerVisivel, setHeaderVisivel] = useState(true);
  const [scrollAnterior, setScrollAnterior] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        carregarPermissoes(session.user.id, false);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        carregarPermissoes(session.user.id, false);
      } else {
        setUser(null);
        setUserInfo(null);
        setPermissions(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollAtual = window.pageYOffset;
      
      if (scrollAtual < scrollAnterior || scrollAtual < 10) {
        setHeaderVisivel(true);
      } 
      else if (scrollAtual > scrollAnterior && scrollAtual > 100) {
        setHeaderVisivel(false);
        setMenuMobileAberto(false);
      }
      
      setScrollAnterior(scrollAtual);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollAnterior]);

  const carregarPermissoes = async (userId, resetarAba = true) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          perfis (
            id,
            nome,
            cor
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (!userData) {
        alert('⚠️ Seu usuário não está cadastrado no sistema.\n\nPor favor, contate o administrador.');
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      if (error) throw error;

      setUserInfo(userData);

      if (!userData.perfil_id) {
        alert('⚠️ Seu usuário não tem um perfil atribuído.\n\nPor favor, contate o administrador.');
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      const { data: permData, error: permError } = await supabase
        .from('permissoes')
        .select('*')
        .eq('perfil_id', userData.perfil_id)
        .maybeSingle();

      if (permError) throw permError;

      if (!permData) {
        alert('⚠️ Seu perfil não tem permissões configuradas.\n\nPor favor, contate o administrador.');
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      setPermissions(permData);

      if (resetarAba) {
        if (permData.pode_acessar_ocorrencias) {
          setAbaAtiva('Dashboard');
        } else if (permData.pode_acessar_visitas) {
          setAbaAtiva('visitas');
        } else if (permData.pode_acessar_administracao) {
          setAbaAtiva('administracao');
        }
      }

    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      alert('❌ Erro ao carregar permissões: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair?')) {
      await supabase.auth.signOut();
      setUser(null);
      setUserInfo(null);
      setPermissions(null);
      setAbaAtiva('Dashboard');
    }
  };

  const handleMudarAba = (abaId) => {
    setAbaAtiva(abaId);
    setMenuMobileAberto(false);
  };

  // Callback para quando uma nova notificação chegar
  const handleNovaNotificacao = (notificacao) => {
  console.log('🎯 handleNovaNotificacao CHAMADO!', notificacao);
  console.log('🎯 Tipo:', notificacao.tipo);
  
  // Converter formato da notificação para o formato do seu toast
  const tipoToast = notificacao.tipo === 'ocorrencia' ? 'nova_ocorrencia' : 'nova_visita';
  
  console.log('🎯 Tipo Toast:', tipoToast);
  console.log('🎯 Vai disparar evento para ToastContainer');
  
  // Disparar evento para o seu ToastContainer
  const evento = new CustomEvent('nova-notificacao', {
    detail: {
      tipo: tipoToast,
      titulo: notificacao.titulo,
      descricao: notificacao.descricao
    }
  });
  
  console.log('🎯 Evento criado:', evento);
  window.dispatchEvent(evento);
  console.log('🎯 Evento disparado!');
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const pode = {
    acessarOcorrencias: permissions?.pode_acessar_ocorrencias || false,
    acessarVisitas: permissions?.pode_acessar_visitas || false,
    acessarAdministracao: permissions?.pode_acessar_administracao || false,
    verTodasOcorrencias: permissions?.pode_ver_todas_ocorrencias || false,
    criarOcorrencias: permissions?.pode_criar_ocorrencias || false,
    editarOcorrencias: permissions?.pode_editar_ocorrencias || false,
    excluirOcorrencias: permissions?.pode_excluir_ocorrencias || false,
    resolverOcorrencias: permissions?.pode_resolver_ocorrencias || false,
  };

  const abas = [
    {
      id: 'Dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      component: DashboardGeral,
      mostrar: pode.acessarOcorrencias
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências',
      icon: AlertTriangle,
      component: ListaOcorrencias,
      mostrar: pode.acessarOcorrencias
    },
    {
      id: 'visitas',
      label: 'Visitas',
      icon: Truck,
      component: DashboardVisitas,
      mostrar: pode.acessarVisitas
    },
    {
      id: 'administracao',
      label: 'Admin',
      icon: Settings,
      component: Administracao,
      mostrar: pode.acessarAdministracao
    }
  ].filter(aba => aba.mostrar);

  const ComponenteAtivo = abas.find(aba => aba.id === abaAtiva)?.component;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Container - Seu componente existente */}
      <ToastContainer />

      <header 
        className={`bg-white shadow-md border-b-4 border-orange-600 fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          headerVisivel ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuMobileAberto(!menuMobileAberto)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {menuMobileAberto ? (
                <X size={24} className="text-gray-700" />
              ) : (
                <Menu size={24} className="text-gray-700" />
              )}
            </button>

            <div>
              <h1 className="text-xl md:text-3xl font-bold text-orange-600">PSR EMBALAGENS</h1>
              <p className="text-xs md:text-sm text-gray-600">Sistema de Gestão</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Sino de Notificações */}
            <NotificationBell onNovaNotificacao={handleNovaNotificacao} />

            <div className="text-right hidden md:block">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 text-sm md:text-base">
                  {userInfo?.nome || user.email}
                </span>
                {userInfo?.perfis && (
                  <span 
                    className="text-xs px-2 py-1 rounded-full text-white font-medium"
                    style={{ backgroundColor: userInfo.perfis.cor }}
                  >
                    {userInfo.perfis.nome}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>

            {userInfo?.perfis && (
              <span 
                className="md:hidden text-xs px-2 py-1 rounded-full text-white font-medium"
                style={{ backgroundColor: userInfo.perfis.cor }}
              >
                {userInfo.perfis.nome}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 md:gap-2 bg-red-600 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base"
              title="Sair"
            >
              <LogOut size={16} className="md:w-5 md:h-5" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>

        {abas.length > 0 && (
          <div className="hidden md:block bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {abas.map((aba) => {
                  const Icon = aba.icon;
                  const isActive = abaAtiva === aba.id;
                  return (
                    <button
                      key={aba.id}
                      onClick={() => setAbaAtiva(aba.id)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{aba.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <div
        className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          menuMobileAberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuMobileAberto(false)}
      >
        <div
          className={`bg-white w-72 h-full shadow-2xl transition-transform duration-300 ${
            menuMobileAberto ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6 border-b-4 border-orange-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Menu</h2>
              <button
                onClick={() => setMenuMobileAberto(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-sm">
              <p className="font-semibold mb-1">{userInfo?.nome || user.email}</p>
              {userInfo?.perfis && (
                <span 
                  className="inline-block text-xs px-2 py-1 rounded-full bg-white text-gray-800 font-medium"
                >
                  {userInfo.perfis.nome}
                </span>
              )}
            </div>
          </div>

          <nav className="py-4">
            {abas.map((aba) => {
              const Icon = aba.icon;
              const isActive = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id}
                  onClick={() => handleMudarAba(aba.id)}
                  className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-base">{aba.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <LogOut size={20} />
              Sair do Sistema
            </button>
          </div>
        </div>
      </div>

      <div className="h-[140px] md:h-[168px]"></div>

      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {ComponenteAtivo ? (
          <ComponenteAtivo 
            userInfo={userInfo} 
            permissions={permissions}
            pode={pode}
            userRole={userInfo?.perfis?.nome?.toLowerCase()}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
              Sem Permissões
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              Você não tem permissão para acessar nenhum módulo do sistema.
              <br />
              Entre em contato com o administrador.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;