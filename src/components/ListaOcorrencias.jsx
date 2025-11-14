import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import FormularioOcorrencia from './FormularioOcorrencia';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  User, 
  Building, 
  Tag, 
  MapPin,
  RefreshCw,
  X,
  Clock,
  CheckCircle,
  Edit,
  FileText,
  List,
  Trash2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Download
} from 'lucide-react';

const ListaOcorrencias = ({ userRole, pode, userInfo }) => {
  const [loading, setLoading] = useState(true);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [ocorrenciasFiltradas, setOcorrenciasFiltradas] = useState([]);
  const [detalheSelecionado, setDetalheSelecionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ocorrenciaParaEditar, setOcorrenciaParaEditar] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  
  // Filtros de data
  const [dataInicio, setDataInicio] = useState(() => {
    const data = new Date();
    data.setDate(data.getDate() - 30);
    return data.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  // Dados auxiliares
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [tiposProblema, setTiposProblema] = useState([]);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    status: '',
    prioridade: '',
    empresa_id: '',
    setor_id: ''
  });

  // Verificar permissões (usar props ou valores padrão)
  const podeEditar = pode?.editarOcorrencias || userRole === 'admin' || userRole === 'gerente';
  const podeResolver = pode?.resolverOcorrencias || userRole === 'admin' || userRole === 'gerente';
  const podeVerDashboard = pode?.acessarAdministracao || userRole === 'admin' || userRole === 'gerente';
  const podeCriar = pode?.criarOcorrencias || userRole === 'admin' || userRole === 'gerente' || userRole === 'usuario';
  const podeExcluir = pode?.excluirOcorrencias || userRole === 'admin';

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim]);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, ocorrencias]);

  const carregarDados = async () => {
    setLoading(true);
    
    try {
      const [
        { data: ocorrenciasData },
        { data: empresasData },
        { data: setoresData },
        { data: tiposProblemaData }
      ] = await Promise.all([
        supabase
          .from('occurrences')
          .select(`
            *, 
            tipos_problema(nome, cor), 
            setores(nome), 
            empresas(nome)
          `)
          .gte('created_at', dataInicio + 'T00:00:00')
          .lte('created_at', dataFim + 'T23:59:59')
          .order('created_at', { ascending: false }),
        supabase.from('empresas').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('tipos_problema').select('*').order('nome')
      ]);

      setOcorrencias(ocorrenciasData || []);
      setEmpresas(empresasData || []);
      setSetores(setoresData || []);
      setTiposProblema(tiposProblemaData || []);
      
      // Buscar informações dos usuários para as ocorrências
      if (ocorrenciasData && ocorrenciasData.length > 0) {
        await carregarUsuariosDasOcorrencias(ocorrenciasData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuariosDasOcorrencias = async (ocorrenciasData) => {
    try {
      const userIds = new Set();
      ocorrenciasData.forEach(o => {
        if (o.created_by) userIds.add(o.created_by);
        if (o.updated_by) userIds.add(o.updated_by);
        if (o.resolved_by) userIds.add(o.resolved_by);
      });

      if (userIds.size === 0) return;

      const { data: usersData } = await supabase
        .from('users')
        .select('id, nome, email')
        .in('id', Array.from(userIds));

      if (!usersData) return;

      const usersMap = {};
      usersData.forEach(user => {
        usersMap[user.id] = user;
      });

      const ocorrenciasComUsuarios = ocorrenciasData.map(o => ({
        ...o,
        created_by_user: o.created_by ? usersMap[o.created_by] : null,
        updated_by_user: o.updated_by ? usersMap[o.updated_by] : null,
        resolved_by_user: o.resolved_by ? usersMap[o.resolved_by] : null
      }));

      setOcorrencias(ocorrenciasComUsuarios);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...ocorrencias];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(o => 
        o.cliente?.toLowerCase().includes(busca) ||
        o.nfe?.toLowerCase().includes(busca) ||
        o.descricao?.toLowerCase().includes(busca)
      );
    }

    if (filtros.status) {
      resultado = resultado.filter(o => o.status === filtros.status);
    }

    if (filtros.prioridade) {
      resultado = resultado.filter(o => o.prioridade === filtros.prioridade);
    }

    if (filtros.empresa_id) {
      resultado = resultado.filter(o => o.empresa_id === parseInt(filtros.empresa_id));
    }

    if (filtros.setor_id) {
      resultado = resultado.filter(o => o.setor_id === parseInt(filtros.setor_id));
    }

    setOcorrenciasFiltradas(resultado);
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      status: '',
      prioridade: '',
      empresa_id: '',
      setor_id: ''
    });
  };

  const resolverOcorrenciaRapida = async (ocorrenciaId) => {
    if (!podeResolver) {
      alert('❌ Você não tem permissão para resolver ocorrências!');
      return;
    }

    if (!window.confirm('Marcar esta ocorrência como resolvida?')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('occurrences')
        .update({ status: 'Resolvido' })
        .eq('id', ocorrenciaId);

      if (error) throw error;

      alert('✅ Ocorrência marcada como resolvida!');
      
      if (detalheSelecionado?.id === ocorrenciaId) {
        setDetalheSelecionado(null);
      }
      
      carregarDados();

    } catch (error) {
      console.error('Erro ao resolver ocorrência:', error);
      alert('❌ Erro ao resolver ocorrência: ' + error.message);
    }
  };

  const excluirOcorrencia = async (ocorrenciaId) => {
    if (!podeExcluir) {
      alert('❌ Você não tem permissão para excluir ocorrências!');
      return;
    }

    if (!window.confirm('⚠️ ATENÇÃO! Deseja realmente EXCLUIR esta ocorrência?\n\nEsta ação não pode ser desfeita!')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('occurrences')
        .delete()
        .eq('id', ocorrenciaId);

      if (error) throw error;

      alert('✅ Ocorrência excluída com sucesso!');
      setDetalheSelecionado(null);
      carregarDados();

    } catch (error) {
      console.error('Erro ao excluir ocorrência:', error);
      alert('❌ Erro ao excluir ocorrência: ' + error.message);
    }
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      'Baixa': 'bg-green-100 text-green-800 border-green-200',
      'Média': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Alta': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[prioridade] || colors['Média'];
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Em Andamento': <Clock className="w-4 h-4 text-blue-600" />,
      'Resolvido': <CheckCircle className="w-4 h-4 text-green-600" />
    };
    return icons[status] || icons['Em Andamento'];
  };

  // Contar ocorrências
  const contarOcorrencias = (campo, usarNomeRelacionado = false) => {
    const count = {};
    ocorrencias.forEach(o => {
      let valor;
      if (usarNomeRelacionado) {
        valor = o[campo]?.nome;
      } else {
        valor = o[campo];
      }
      
      if (valor) {
        count[valor] = (count[valor] || 0) + 1;
      }
    });
    return count;
  };

  const setorCount = contarOcorrencias('setores', true);
  const empresaCount = contarOcorrencias('empresas', true);
  const prioridadeCount = contarOcorrencias('prioridade');
  const tipoProblemaCount = contarOcorrencias('tipos_problema', true);

  // Componente de Gráfico de Pizza RESPONSIVO
  const PieChart = ({ data, title, subtitle }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const colors = ['#ea580c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    if (total === 0 || !podeVerDashboard) return null;
    
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-1 text-sm md:text-base">{title}</h3>
        <p className="text-xs text-gray-500 uppercase mb-4 md:mb-6">{subtitle}</p>
        <div className="flex items-center justify-center mb-4 md:mb-6">
          <div className="relative w-40 h-40 md:w-56 md:h-56">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {Object.entries(data).map(([key, value], index) => {
                const percentage = (value / total) * 100;
                const angle = (percentage / 100) * 360;
                
                let currentAngle = 0;
                Object.values(data).slice(0, index).forEach(v => {
                  currentAngle += (v / total) * 360;
                });
                
                const x1 = 50 + 45 * Math.cos((currentAngle * Math.PI) / 180);
                const y1 = 50 + 45 * Math.sin((currentAngle * Math.PI) / 180);
                const x2 = 50 + 45 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                const y2 = 50 + 45 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const pathData = [
                  `M 50 50`,
                  `L ${x1} ${y1}`,
                  `A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  `Z`
                ].join(' ');
                
                return (
                  <path
                    key={key}
                    d={pathData}
                    fill={colors[index % colors.length]}
                    opacity={hoveredIndex === index ? 0.8 : 1}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="transition-opacity cursor-pointer"
                  />
                );
              })}
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-white rounded-full w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center shadow-inner">
                <div className="text-xl md:text-2xl font-bold text-gray-800">{total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {Object.entries(data).map(([key, value], index) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return (
              <div 
                key={key}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer text-xs md:text-sm"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="font-medium text-gray-700 truncate">{key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{value}</span>
                  <span className="text-gray-500">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Se estiver mostrando formulário
  if (mostrarFormulario) {
    return (
      <div className="pb-6">
        <div className="mb-4 sticky top-0 bg-gray-100 z-10 py-3 -mx-4 px-4">
          <button
            onClick={() => {
              setMostrarFormulario(false);
              setOcorrenciaParaEditar(null);
              carregarDados();
            }}
            className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full justify-center font-semibold"
          >
            <List size={20} />
            Voltar para Lista
          </button>
        </div>
        <FormularioOcorrencia
          userRole={userRole}
          userInfo={userInfo}
          ocorrenciaParaEditar={ocorrenciaParaEditar}
          onSalvar={() => {
            setMostrarFormulario(false);
            setOcorrenciaParaEditar(null);
            carregarDados();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Cabeçalho Mobile com Contador */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ocorrências</h1>
            <p className="text-sm text-gray-600 mt-1">Gestão de ocorrências</p>
          </div>
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg px-3 py-2 text-center">
            <Clock className="w-5 h-5 text-yellow-700 mx-auto mb-1" />
            <p className="text-xs text-yellow-700 font-medium">Em Andamento</p>
            <p className="text-xl font-bold text-yellow-800">
              {ocorrencias.filter(o => o.status === 'Em Andamento').length}
            </p>
          </div>
        </div>
        
        {podeCriar && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-md"
          >
            <Plus size={20} />
            Nova Ocorrência
          </button>
        )}
      </div>

      {/* Dashboard Compacto Mobile - Apenas para Admin e Gerente */}
      {podeVerDashboard && (
        <div className="grid grid-cols-2 gap-3">
          <PieChart data={setorCount} title="Por Setor" />
          <PieChart data={empresaCount} title="Por Empresa" />
          <PieChart data={prioridadeCount} title="Prioridade" />
          <PieChart data={tipoProblemaCount} title="Tipo" />
        </div>
      )}

      {/* Filtros de Data */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <button
            onClick={carregarDados}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Botão de Filtros Colapsável */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
            {Object.values(filtros).some(v => v) && (
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                Ativos
              </span>
            )}
          </div>
          {mostrarFiltros ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {mostrarFiltros && (
          <div className="p-4 pt-0 space-y-3 border-t">
            <input
              type="text"
              placeholder="🔍 Buscar..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            />
            
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            >
              <option value="">Todos os Status</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvido">Resolvido</option>
            </select>
            
            <select
              value={filtros.prioridade}
              onChange={(e) => setFiltros({ ...filtros, prioridade: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            >
              <option value="">Todas Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
            
            <select
              value={filtros.setor_id}
              onChange={(e) => setFiltros({ ...filtros, setor_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            >
              <option value="">Todos Setores</option>
              {setores.map(set => (
                <option key={set.id} value={set.id}>{set.nome}</option>
              ))}
            </select>
            
            <select
              value={filtros.empresa_id}
              onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            >
              <option value="">Todas Empresas</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
            
            {Object.values(filtros).some(v => v) && (
              <button
                onClick={limparFiltros}
                className="w-full text-sm text-red-600 hover:text-red-700 flex items-center justify-center gap-1 py-2"
              >
                <X size={16} />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de Ocorrências Mobile */}
      {ocorrenciasFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold mb-2">Nenhuma ocorrência encontrada</p>
          {podeCriar && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
            >
              <Plus size={18} />
              Cadastrar Primeira
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {ocorrenciasFiltradas.map((ocorrencia) => (
            <div 
              key={ocorrencia.id}
              onClick={() => setDetalheSelecionado(ocorrencia)}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 active:bg-gray-50"
            >
              {/* Cabeçalho do Card */}
              <div className="mb-3">
                {/* Linha 1: ID e Status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-orange-600">
                    #{String(ocorrencia.id).slice(0, 8)}
                  </span>
                  {getStatusIcon(ocorrencia.status)}
                </div>
                
                {/* Linha 2: Cliente (MAIOR) e Prioridade lado a lado */}
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900 text-lg flex-1 truncate">
                    {ocorrencia.cliente || 'Sem cliente'}
                  </h3>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 whitespace-nowrap flex-shrink-0 ${getPrioridadeColor(ocorrencia.prioridade)}`}>
                    {ocorrencia.prioridade}
                  </span>
                </div>
              </div>
              
              {/* Info Badges */}
              <div className="flex flex-wrap gap-2 mb-2">
                {ocorrencia.nfe && (
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    NFE: {ocorrencia.nfe}
                  </span>
                )}
                {ocorrencia.nota_retida && (
                  <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center gap-1 border border-yellow-300">
                    📋 Nota Retida
                  </span>
                )}
                {ocorrencia.imagem_url && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                    📷 Com foto
                  </span>
                )}
              </div>
              
              {/* Descrição Truncada */}
              {ocorrencia.descricao && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{ocorrencia.descricao}</p>
              )}
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(ocorrencia.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span className="truncate">{ocorrencia.empresas?.nome || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span className="truncate">{ocorrencia.tipos_problema?.nome || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate">{ocorrencia.setores?.nome || '-'}</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-2 border-t">
                {podeEditar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOcorrenciaParaEditar(ocorrencia);
                      setMostrarFormulario(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                )}
                
                {podeResolver && ocorrencia.status === 'Em Andamento' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolverOcorrenciaRapida(ocorrencia.id);
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={16} />
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes Mobile */}
      {detalheSelecionado && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetalheSelecionado(null)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="bg-orange-600 text-white p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">#{String(detalheSelecionado.id).slice(0, 8)}</h3>
                  <p className="text-white text-lg font-bold">{detalheSelecionado.cliente || 'Sem cliente'}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white ${
                    detalheSelecionado.prioridade === 'Alta' ? 'text-red-600' :
                    detalheSelecionado.prioridade === 'Média' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {detalheSelecionado.prioridade}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {podeExcluir && (
                  <button
                    onClick={() => excluirOcorrencia(detalheSelecionado.id)}
                    className="p-2 hover:bg-red-700 bg-red-600 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setDetalheSelecionado(null)}
                  className="p-2 hover:bg-orange-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Conteúdo do Modal - Scrollable */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-4">
                {/* Imagem - THUMBNAIL PEQUENO */}
                {detalheSelecionado.imagem_url && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-gray-800">Imagem Anexada</h4>
                    <div 
                      className="relative bg-gray-50 border-2 border-gray-200 rounded-lg p-2 cursor-pointer hover:border-orange-500 transition-colors group"
                      onClick={() => setImagemAmpliada(detalheSelecionado.imagem_url)}
                    >
                      <img 
                        src={detalheSelecionado.imagem_url} 
                        alt="Thumbnail" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                        <div className="bg-white bg-opacity-0 group-hover:bg-opacity-90 p-3 rounded-full transition-all">
                          <ZoomIn className="w-6 h-6 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-2 font-medium">
                        📷 Toque para ampliar
                      </p>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <h4 className="font-bold text-sm mb-2 text-gray-800">Status</h4>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    {getStatusIcon(detalheSelecionado.status)}
                    <span className="font-medium text-sm">{detalheSelecionado.status}</span>
                  </div>
                </div>

                {/* Descrição */}
                {detalheSelecionado.descricao && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-gray-800">Descrição</h4>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {detalheSelecionado.descricao}
                      </p>
                    </div>
                  </div>
                )}

                {/* Informações */}
                {/* Histórico de Ações - NOVO */}
                <div>
                  <h4 className="font-bold text-sm mb-2 text-gray-800">Histórico</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
                    
                    {/* Criação */}
                    <div className="p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="bg-green-100 p-1.5 rounded-full flex-shrink-0">
                          <Plus size={14} className="text-green-700" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">Criado</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(detalheSelecionado.created_at).toLocaleString('pt-BR')}
                          </p>
                          {detalheSelecionado.created_by_user && (
                            <p className="text-xs text-blue-600 font-medium mt-0.5">
                              por {detalheSelecionado.created_by_user.nome}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Última Edição */}
                    {detalheSelecionado.updated_at && detalheSelecionado.updated_at !== detalheSelecionado.created_at && (
                      <div className="p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="bg-blue-100 p-1.5 rounded-full flex-shrink-0">
                            <Edit size={14} className="text-blue-700" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">Última Edição</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(detalheSelecionado.updated_at).toLocaleString('pt-BR')}
                            </p>
                            {detalheSelecionado.updated_by_user && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                por {detalheSelecionado.updated_by_user.nome}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resolução */}
                    {detalheSelecionado.status === 'Resolvido' && detalheSelecionado.resolved_at && (
                      <div className="p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="bg-green-100 p-1.5 rounded-full flex-shrink-0">
                            <CheckCircle size={14} className="text-green-700" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">Resolvido</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(detalheSelecionado.resolved_at).toLocaleString('pt-BR')}
                            </p>
                            {detalheSelecionado.resolved_by_user && (
                              <p className="text-xs text-green-600 font-medium mt-0.5">
                                por {detalheSelecionado.resolved_by_user.nome}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem Ampliada */}
      {imagemAmpliada && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            {/* Botões de Controle */}
            <div className="absolute top-0 right-0 flex gap-2 z-10">
              <a
                href={imagemAmpliada}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={20} />
              </a>
              <button
                onClick={() => setImagemAmpliada(null)}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors shadow-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Imagem */}
            <img 
              src={imagemAmpliada} 
              alt="Imagem ampliada" 
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Dica */}
            <p className="text-white text-center mt-4 text-sm">
              Toque fora da imagem para fechar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaOcorrencias;