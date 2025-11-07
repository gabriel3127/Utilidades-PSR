import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const DashboardGeral = ({ pode, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisitas: 0,
    visitasEsteMes: 0,
    totalOcorrencias: 0,
    ocorrenciasAbertas: 0,
    ocorrenciasResolvidas: 0
  });
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    
    try {
      // Buscar visitas
      const { data: visitas } = await supabase
        .from('visitas_tecnicas')
        .select('*')
        .order('created_at', { ascending: false });

      // Buscar ocorrências
      const { data: ocorrencias } = await supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false });

      // Calcular estatísticas
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const visitasEsteMes = visitas?.filter(v => 
        new Date(v.created_at) >= primeiroDiaMes
      ).length || 0;

      const ocorrenciasAbertas = ocorrencias?.filter(o => 
        o.status === 'Em Andamento'
      ).length || 0;

      const ocorrenciasResolvidas = ocorrencias?.filter(o => 
        o.status === 'Resolvido'
      ).length || 0;

      setStats({
        totalVisitas: visitas?.length || 0,
        visitasEsteMes,
        totalOcorrencias: ocorrencias?.length || 0,
        ocorrenciasAbertas,
        ocorrenciasResolvidas
      });

      // Combinar atividades recentes
      const atividades = [
        ...(visitas?.slice(0, 3).map(v => ({
          id: v.id,
          tipo: 'visita',
          titulo: `Visita - ${v.nome_cliente}`,
          descricao: `Consultor: ${v.nome_consultor}`,
          data: v.created_at,
          icon: <FileText className="w-5 h-5 text-blue-600" />
        })) || []),
        ...(ocorrencias?.slice(0, 3).map(o => ({
          id: o.id,
          tipo: 'ocorrencia',
          titulo: `Ocorrência - ${o.cliente || 'Sem cliente'}`,
          descricao: o.descricao?.substring(0, 100) || '',
          data: o.created_at,
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />
        })) || [])
      ].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6);

      setAtividadesRecentes(atividades);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, bgColor }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Dashboard Geral</h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button 
          onClick={carregarDados}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={FileText}
          title="Visitas Técnicas"
          value={stats.totalVisitas}
          subtitle={`${stats.visitasEsteMes} este mês`}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        
        <StatCard
          icon={AlertTriangle}
          title="Total de Ocorrências"
          value={stats.totalOcorrencias}
          subtitle="Todas as ocorrências"
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
        
        <StatCard
          icon={Clock}
          title="Ocorrências Abertas"
          value={stats.ocorrenciasAbertas}
          subtitle="Aguardando resolução"
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        
        <StatCard
          icon={CheckCircle}
          title="Ocorrências Resolvidas"
          value={stats.ocorrenciasResolvidas}
          subtitle="Finalizadas"
          color="text-green-600"
          bgColor="bg-green-100"
        />
        
        <StatCard
          icon={TrendingUp}
          title="Taxa de Resolução"
          value={stats.totalOcorrencias > 0 
            ? `${Math.round((stats.ocorrenciasResolvidas / stats.totalOcorrencias) * 100)}%`
            : '0%'}
          subtitle="Ocorrências resolvidas"
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        
        <StatCard
          icon={FileText}
          title="Visitas Este Mês"
          value={stats.visitasEsteMes}
          subtitle="Período atual"
          color="text-indigo-600"
          bgColor="bg-indigo-100"
        />
      </div>

      {/* Atividades Recentes */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Atividades Recentes</h3>
        </div>
        
        {atividadesRecentes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-semibold mb-2">Nenhuma atividade registrada ainda</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {atividadesRecentes.map((atividade) => (
                <div 
                  key={`${atividade.tipo}-${atividade.id}`}
                  className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="mt-1">
                    {atividade.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{atividade.titulo}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{atividade.descricao}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(atividade.data).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    atividade.tipo === 'visita' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {atividade.tipo === 'visita' ? 'Visita' : 'Ocorrência'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardGeral;