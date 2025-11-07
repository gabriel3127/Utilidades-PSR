import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { LayoutDashboard, ClipboardList, AlertTriangle, Settings, LogOut, FileText } from 'lucide-react';
import DashboardGeral from './DashboardGeral';
import FormularioVisita from './FormularioVisita';
import DashboardVisitas from './DashboardVisitas';
import FormularioOcorrencia from './FormularioOcorrencia';
import ListaOcorrencias from './ListaOcorrencias';
import Administracao from './Administracao';

const SistemaPSR = ({ session }) => {
  const [telaAtual, setTelaAtual] = useState('dashboard');
  const [subTelaVisitas, setSubTelaVisitas] = useState('lista');
  const [subTelaOcorrencias, setSubTelaOcorrencias] = useState('lista');
  const [userRole, setUserRole] = useState('usuario');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUsuario();
  }, [session]);

  const carregarUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Pegar role e nome do user_metadata
        const role = user.user_metadata?.role || 'usuario';
        const nome = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
        
        setUserRole(role);
        setUserName(nome);
        
        console.log('Usuário carregado:', { nome, role }); // Debug
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const podeAcessarAdmin = userRole === 'admin';

  const renderContent = () => {
    switch (telaAtual) {
      case 'dashboard':
        return <DashboardGeral userRole={userRole} />;
      
      case 'visitas':
        if (subTelaVisitas === 'novo') {
          return <FormularioVisita userRole={userRole} onSalvar={() => setSubTelaVisitas('lista')} />;
        }
        return <DashboardVisitas userRole={userRole} onNovaVisita={() => setSubTelaVisitas('novo')} />;
      
      case 'ocorrencias':
        if (subTelaOcorrencias === 'novo') {
          return <FormularioOcorrencia userRole={userRole} onSalvar={() => setSubTelaOcorrencias('lista')} />;
        }
        return <ListaOcorrencias userRole={userRole} onNovaOcorrencia={() => setSubTelaOcorrencias('novo')} />;
      
      case 'admin':
        if (!podeAcessarAdmin) {
          return (
            <div className="max-w-7xl mx-auto px-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-800 mb-2">Acesso Negado</h3>
                <p className="text-red-600">Apenas administradores podem acessar esta área.</p>
              </div>
            </div>
          );
        }
        return <Administracao userRole={userRole} />;
      
      default:
        return <DashboardGeral userRole={userRole} />;
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'ADMIN' },
      gerente: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'GERENTE' },
      usuario: { bg: 'bg-green-100', text: 'text-green-800', label: 'USUÁRIO' },
      simples: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'SIMPLES' }
    };
    return badges[role] || badges.usuario;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const badge = getRoleBadge(userRole);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">PSR EMBALAGENS</h1>
              <p className="text-sm text-gray-500">Sistema de Gestão</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-xs rounded-full font-medium`}>
                {badge.label}
              </span>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => {
                setTelaAtual('dashboard');
                setSubTelaVisitas('lista');
                setSubTelaOcorrencias('lista');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                telaAtual === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setTelaAtual('visitas');
                setSubTelaVisitas('lista');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                telaAtual === 'visitas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Visitas Técnicas
            </button>

            <button
              onClick={() => {
                setTelaAtual('ocorrencias');
                setSubTelaOcorrencias('lista');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                telaAtual === 'ocorrencias'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Ocorrências
            </button>

            {podeAcessarAdmin && (
              <button
                onClick={() => {
                  setTelaAtual('admin');
                  setSubTelaVisitas('lista');
                  setSubTelaOcorrencias('lista');
                }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  telaAtual === 'admin'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Administração
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Sub-navigation for Visitas */}
      {telaAtual === 'visitas' && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSubTelaVisitas('lista')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  subTelaVisitas === 'lista'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Ver Visitas
              </button>
              <button
                onClick={() => setSubTelaVisitas('novo')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  subTelaVisitas === 'novo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Nova Visita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-navigation for Ocorrências */}
      {telaAtual === 'ocorrencias' && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSubTelaOcorrencias('lista')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  subTelaOcorrencias === 'lista'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Ver Ocorrências
              </button>
              <button
                onClick={() => setSubTelaOcorrencias('novo')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  subTelaOcorrencias === 'novo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Nova Ocorrência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="py-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default SistemaPSR;