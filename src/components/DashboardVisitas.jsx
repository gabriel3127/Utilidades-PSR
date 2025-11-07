import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import FormularioVisita from './FormularioVisita';
import { RefreshCw, Star, Clipboard, Truck, Briefcase, AlertTriangle, X, Plus, List } from 'lucide-react';

const DashboardVisitas = () => {
  const [dataInicio, setDataInicio] = useState(() => {
    const data = new Date();
    data.setDate(data.getDate() - 30);
    return data.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [visitaSelecionada, setVisitaSelecionada] = useState(null);
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    buscarVisitas();
  }, [dataInicio, dataFim]);

  const buscarVisitas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visitas_tecnicas')
      .select('*')
      .gte('data_visita', dataInicio)
      .lte('data_visita', dataFim)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar visitas:', error);
    } else {
      setVisitas(data || []);
    }
    setLoading(false);
  };

  const totalVisitas = visitas.length;
  
  const calcularMedia = (campo) => {
    const mapeamento = { 'Péssimo': 1, 'Ruim': 2, 'Regular': 3, 'Bom': 4, 'Excelente': 5 };
    const valores = visitas
      .map(v => mapeamento[v[campo]])
      .filter(v => v !== undefined);
    
    if (valores.length === 0) return '0.0';
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    return media.toFixed(1);
  };

  const mediaAtendimento = calcularMedia('avaliacao_atendimento');
  const mediaProdutos = calcularMedia('avaliacao_variedade');
  const mediaEntrega = calcularMedia('avaliacao_entrega');
  const oportunidades = visitas.filter(v => v.interesse_expandir === 'Sim').length;
  const reclamacoes = visitas.filter(v => v.tem_reclamacao === 'Sim').length;

  const contarOcorrencias = (campo) => {
    const count = {};
    visitas.forEach(v => {
      const valor = v[campo];
      if (Array.isArray(valor)) {
        valor.forEach(item => {
          count[item] = (count[item] || 0) + 1;
        });
      } else if (valor) {
        count[valor] = (count[valor] || 0) + 1;
      }
    });
    return count;
  };

  const produtosCount = contarOcorrencias('produtos_utilizados');
  const segmentosCount = contarOcorrencias('segmento_cliente');
  const reclamacoesCount = contarOcorrencias('tipos_reclamacao');
  const porteCount = contarOcorrencias('porte_cliente');
  const volumeCount = contarOcorrencias('volume_percentual');

  // GRÁFICO OTIMIZADO - MESMO PADRÃO DO LISTAOCORRENCIAS
  const PieChart = ({ data, title, subtitle }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    if (total === 0) return null;
    
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

  const MetricCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white p-4 md:p-5 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 md:p-3 rounded-lg ${color}`}>
          <Icon size={18} className="text-white md:w-5 md:h-5" />
        </div>
      </div>
      <p className="text-xs md:text-sm text-gray-600 mb-2">{title}</p>
      <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className={`text-xs ${subtitle.includes('atenção') ? 'text-red-500' : 'text-green-600'}`}>
        {subtitle}
      </p>
    </div>
  );

  const getPrioridadeBadge = (prioridade) => {
    const colors = {
      'Alta': 'bg-red-100 text-red-700',
      'Média': 'bg-yellow-100 text-yellow-700',
      'Baixa': 'bg-blue-100 text-blue-700'
    };
    return colors[prioridade] || colors.Baixa;
  };

  if (mostrarFormulario) {
    return (
      <div className="pb-6">
        <div className="mb-4 sticky top-0 bg-gray-100 z-10 py-3 -mx-4 px-4">
          <button
            onClick={() => {
              setMostrarFormulario(false);
              buscarVisitas();
            }}
            className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full md:w-auto justify-center font-semibold"
          >
            <List size={20} />
            Voltar para Dashboard
          </button>
        </div>
        <FormularioVisita
          onSalvar={() => {
            setMostrarFormulario(false);
            buscarVisitas();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Cabeçalho Mobile Otimizado */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Visitas Técnicas</h1>
            <p className="text-sm text-gray-600 mt-1">Dashboard de visitas</p>
          </div>
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg px-3 py-2 text-center">
            <Clipboard className="w-5 h-5 text-blue-700 mx-auto mb-1" />
            <p className="text-xs text-blue-700 font-medium">Total</p>
            <p className="text-xl font-bold text-blue-800">{totalVisitas}</p>
          </div>
        </div>
        
        <button
          onClick={() => setMostrarFormulario(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
        >
          <Plus size={20} />
          Nova Visita
        </button>
      </div>

      {/* Filtros de Data - Mobile Otimizado */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Período</h3>
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
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                const hoje = new Date().toISOString().split('T')[0];
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                setDataInicio(seteDiasAtras.toISOString().split('T')[0]);
                setDataFim(hoje);
              }}
              className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs transition-colors"
            >
              7 dias
            </button>
            <button
              onClick={() => {
                const hoje = new Date().toISOString().split('T')[0];
                const trintaDiasAtras = new Date();
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
                setDataFim(hoje);
              }}
              className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs transition-colors"
            >
              30 dias
            </button>
            <button
              onClick={() => {
                const hoje = new Date().toISOString().split('T')[0];
                const noventaDiasAtras = new Date();
                noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);
                setDataInicio(noventaDiasAtras.toISOString().split('T')[0]);
                setDataFim(hoje);
              }}
              className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs transition-colors"
            >
              90 dias
            </button>
          </div>
          <button
            onClick={buscarVisitas}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas - Grid Responsivo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={Clipboard}
          title="Total"
          value={totalVisitas}
          subtitle="Visitas realizadas"
          color="bg-blue-500"
        />
        <MetricCard
          icon={Star}
          title="Atendimento"
          value={`${mediaAtendimento}/5`}
          subtitle="Média"
          color="bg-green-500"
        />
        <MetricCard
          icon={Star}
          title="Produtos"
          value={`${mediaProdutos}/5`}
          subtitle="Média"
          color="bg-green-500"
        />
        <MetricCard
          icon={Truck}
          title="Entrega"
          value={`${mediaEntrega}/5`}
          subtitle="Média"
          color="bg-green-500"
        />
        <MetricCard
          icon={Briefcase}
          title="Oportunidades"
          value={oportunidades}
          subtitle="Interesse expandir"
          color="bg-orange-500"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Reclamações"
          value={reclamacoes}
          subtitle={reclamacoes > 0 ? "Requerem atenção" : "Tudo em ordem"}
          color="bg-red-500"
        />
      </div>

      {/* Gráficos - Grid Responsivo */}
      <div className="grid grid-cols-2 gap-3">
        {Object.keys(produtosCount).length > 0 && (
          <PieChart 
            data={produtosCount} 
            title="Produtos Utilizados"
            subtitle="Produtos da empresa"
          />
        )}
        {Object.keys(segmentosCount).length > 0 && (
          <PieChart 
            data={segmentosCount} 
            title="Segmentos"
            subtitle="Por tipo"
          />
        )}
        {Object.keys(porteCount).length > 0 && (
          <PieChart 
            data={porteCount} 
            title="Porte"
            subtitle="Por tamanho"
          />
        )}
        {Object.keys(volumeCount).length > 0 && (
          <PieChart 
            data={volumeCount} 
            title="Volume PSR"
            subtitle="% de utilização"
          />
        )}
        {Object.keys(reclamacoesCount).length > 0 && (
          <PieChart 
            data={reclamacoesCount} 
            title="Reclamações"
            subtitle="Por categoria"
          />
        )}
      </div>

      {/* Lista Mobile Otimizada */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">Visitas Recentes ({visitas.length})</h3>
        </div>
        
        {visitas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clipboard size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold mb-2">Nenhuma visita cadastrada</p>
            <button
              onClick={() => setMostrarFormulario(true)}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Plus size={18} />
              Cadastrar Primeira
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visitas.slice(0, 10).map((visita) => (
              <div
                key={visita.id}
                onClick={() => setVisitaSelecionada(visita)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-base">{visita.nome_cliente}</h4>
                    <p className="text-sm text-gray-600">{visita.nome_consultor}</p>
                  </div>
                  {visita.prioridade_acompanhamento && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeBadge(visita.prioridade_acompanhamento)}`}>
                      {visita.prioridade_acompanhamento}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>📅 {new Date(visita.data_visita).toLocaleDateString('pt-BR')}</span>
                  <span>• {visita.segmento_cliente}</span>
                  {visita.avaliacao_atendimento && (
                    <span>• ⭐ {visita.avaliacao_atendimento}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Mobile Otimizado - VERSÃO COMPLETA */}
      {visitaSelecionada && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setVisitaSelecionada(null)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex-1">
                <h3 className="text-xl font-bold">{visitaSelecionada.nome_cliente}</h3>
                <p className="text-blue-100 text-sm">
                  {new Date(visitaSelecionada.data_visita).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setVisitaSelecionada(null)}
                className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-4">
                {/* Informações Gerais */}
                <div>
                  <h4 className="font-bold text-sm mb-2 text-blue-900">Informações Gerais</h4>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-2 text-sm">
                    <div><span className="font-semibold">Consultor:</span> {visitaSelecionada.nome_consultor}</div>
                    <div><span className="font-semibold">Segmento:</span> {visitaSelecionada.segmento_cliente}</div>
                    {visitaSelecionada.porte_cliente && (
                      <div><span className="font-semibold">Porte:</span> {visitaSelecionada.porte_cliente}</div>
                    )}
                    {visitaSelecionada.pessoa_contato && (
                      <div><span className="font-semibold">Contato:</span> {visitaSelecionada.pessoa_contato}</div>
                    )}
                  </div>
                </div>

                {/* Avaliações */}
                {(visitaSelecionada.avaliacao_atendimento || visitaSelecionada.avaliacao_variedade || visitaSelecionada.avaliacao_entrega) && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Avaliações</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {visitaSelecionada.avaliacao_atendimento && (
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Atendimento</p>
                          <p className="text-lg font-bold text-blue-900">{visitaSelecionada.avaliacao_atendimento}</p>
                        </div>
                      )}
                      {visitaSelecionada.avaliacao_variedade && (
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Produtos</p>
                          <p className="text-lg font-bold text-blue-900">{visitaSelecionada.avaliacao_variedade}</p>
                        </div>
                      )}
                      {visitaSelecionada.avaliacao_entrega && (
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Entrega</p>
                          <p className="text-lg font-bold text-blue-900">{visitaSelecionada.avaliacao_entrega}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comentários de Feedback */}
                {visitaSelecionada.comentarios_feedback && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Comentários sobre o Feedback</h4>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {visitaSelecionada.comentarios_feedback}
                      </p>
                    </div>
                  </div>
                )}

                {/* Produtos */}
                {visitaSelecionada.produtos_utilizados && visitaSelecionada.produtos_utilizados.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Produtos Utilizados</h4>
                    <div className="flex flex-wrap gap-2">
                      {visitaSelecionada.produtos_utilizados.map((produto, i) => (
                        <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          {produto}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interesse e Volume */}
                {(visitaSelecionada.volume_percentual || visitaSelecionada.interesse_expandir) && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Interesse e Volume</h4>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-2 text-sm">
                      {visitaSelecionada.volume_percentual && (
                        <div>
                          <span className="font-semibold">Volume de produtos PSR:</span> {visitaSelecionada.volume_percentual}%
                        </div>
                      )}
                      {visitaSelecionada.interesse_expandir && (
                        <div>
                          <span className="font-semibold">Interesse em expandir compras:</span> {visitaSelecionada.interesse_expandir}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Oportunidades */}
                {(visitaSelecionada.motivo_nao_compra || visitaSelecionada.produtos_nao_oferecemos) && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Oportunidades</h4>
                    <div className="space-y-2">
                      {visitaSelecionada.motivo_nao_compra && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Por que não compra outros produtos:</p>
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded text-sm text-gray-700">
                            {visitaSelecionada.motivo_nao_compra}
                          </div>
                        </div>
                      )}
                      {visitaSelecionada.produtos_nao_oferecemos && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Produtos que não oferecemos:</p>
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded text-sm text-gray-700">
                            {visitaSelecionada.produtos_nao_oferecemos}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reclamações */}
                {visitaSelecionada.tem_reclamacao === 'Sim' && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-orange-600 flex items-center gap-2">
                      <AlertTriangle size={18} />
                      Reclamações
                    </h4>
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg space-y-2">
                      {visitaSelecionada.tipos_reclamacao && visitaSelecionada.tipos_reclamacao.length > 0 && (
                        <div>
                          <p className="font-semibold text-xs mb-2">Tipos:</p>
                          <div className="flex flex-wrap gap-2">
                            {visitaSelecionada.tipos_reclamacao.map((tipo, i) => (
                              <span key={i} className="bg-orange-200 text-orange-900 px-2 py-1 rounded-full text-xs">
                                {tipo}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {visitaSelecionada.detalhe_reclamacao && (
                        <div>
                          <p className="font-semibold text-xs">Detalhes:</p>
                          <p className="text-sm text-gray-700 mt-1">{visitaSelecionada.detalhe_reclamacao}</p>
                        </div>
                      )}
                      {visitaSelecionada.gravidade_reclamacao && (
                        <div>
                          <p className="font-semibold text-xs">Gravidade:</p>
                          <p className="text-sm text-gray-700 mt-1">{visitaSelecionada.gravidade_reclamacao}</p>
                        </div>
                      )}
                      {visitaSelecionada.acao_proposta && (
                        <div>
                          <p className="font-semibold text-xs">Ação proposta:</p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border border-orange-100 mt-1">
                            {visitaSelecionada.acao_proposta}
                          </p>
                        </div>
                      )}
                      {visitaSelecionada.satisfacao_solucao && (
                        <div>
                          <p className="font-semibold text-xs">Cliente satisfeito:</p>
                          <p className="text-sm text-gray-700 mt-1">{visitaSelecionada.satisfacao_solucao}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {visitaSelecionada.observacoes_gerais && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Observações Gerais</h4>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {visitaSelecionada.observacoes_gerais}
                      </p>
                    </div>
                  </div>
                )}

                {/* Próximos Passos */}
                {visitaSelecionada.proximos_passos && (
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-blue-900">Próximos Passos</h4>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {visitaSelecionada.proximos_passos}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardVisitas;