import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Clipboard, 
  Briefcase, 
  AlertTriangle, 
  FileText, 
  Check, 
  ChevronRight,
  ChevronLeft,
  Star,
  Package,
  TrendingUp,
  MessageCircle
} from 'lucide-react';

const FormularioVisita = ({ onSalvar }) => {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    dataVisita: new Date().toISOString().split('T')[0],
    nomeConsultor: '',
    nomeCliente: '',
    pessoaContato: '',
    segmentoCliente: '',
    porteCliente: '',
    avaliacaoAtendimento: '',
    avaliacaoVariedade: '',
    avaliacaoEntrega: '',
    comentariosFeedback: '',
    produtosUtilizados: [],
    volumePercentual: '',
    motivoNaoCompra: '',
    produtosNaoOferecemos: '',
    interesseExpandir: '',
    temReclamacao: '',
    tiposReclamacao: [],
    detalheReclamacao: '',
    gravidadeReclamacao: '',
    acaoProposta: '',
    satisfacaoSolucao: '',
    observacoesGerais: '',
    proximosPassos: '',
    prioridadeAcompanhamento: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const etapas = [
    {
      id: 0,
      titulo: 'Dados Básicos',
      icone: Clipboard,
      cor: 'bg-blue-600',
      campos: ['dataVisita', 'nomeConsultor', 'nomeCliente', 'pessoaContato', 'segmentoCliente', 'porteCliente']
    },
    {
      id: 1,
      titulo: 'Avaliações',
      icone: Star,
      cor: 'bg-green-600',
      campos: ['avaliacaoAtendimento', 'avaliacaoVariedade', 'avaliacaoEntrega', 'comentariosFeedback']
    },
    {
      id: 2,
      titulo: 'Produtos',
      icone: Package,
      cor: 'bg-purple-600',
      campos: ['produtosUtilizados', 'volumePercentual', 'interesseExpandir']
    },
    {
      id: 3,
      titulo: 'Oportunidades',
      icone: TrendingUp,
      cor: 'bg-orange-600',
      campos: ['motivoNaoCompra', 'produtosNaoOferecemos']
    },
    {
      id: 4,
      titulo: 'Reclamações',
      icone: AlertTriangle,
      cor: 'bg-red-600',
      campos: ['temReclamacao', 'tiposReclamacao', 'detalheReclamacao', 'gravidadeReclamacao', 'acaoProposta', 'satisfacaoSolucao']
    },
    {
      id: 5,
      titulo: 'Finalizar',
      icone: MessageCircle,
      cor: 'bg-indigo-600',
      campos: ['observacoesGerais', 'proximosPassos', 'prioridadeAcompanhamento']
    }
  ];

  const proximaEtapa = () => {
    if (etapaAtual < etapas.length - 1) {
      setEtapaAtual(etapaAtual + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setSalvando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('visitas_tecnicas')
        .insert([
          {
            user_id: user.id,
            data_visita: formData.dataVisita,
            nome_consultor: formData.nomeConsultor,
            nome_cliente: formData.nomeCliente,
            pessoa_contato: formData.pessoaContato,
            segmento_cliente: formData.segmentoCliente,
            porte_cliente: formData.porteCliente,
            avaliacao_atendimento: formData.avaliacaoAtendimento,
            avaliacao_variedade: formData.avaliacaoVariedade,
            avaliacao_entrega: formData.avaliacaoEntrega,
            comentarios_feedback: formData.comentariosFeedback,
            produtos_utilizados: formData.produtosUtilizados,
            volume_percentual: formData.volumePercentual,
            motivo_nao_compra: formData.motivoNaoCompra,
            produtos_nao_oferecemos: formData.produtosNaoOferecemos,
            interesse_expandir: formData.interesseExpandir,
            tem_reclamacao: formData.temReclamacao,
            tipos_reclamacao: formData.tiposReclamacao,
            detalhe_reclamacao: formData.detalheReclamacao,
            gravidade_reclamacao: formData.gravidadeReclamacao,
            acao_proposta: formData.acaoProposta,
            satisfacao_solucao: formData.satisfacaoSolucao,
            observacoes_gerais: formData.observacoesGerais,
            proximos_passos: formData.proximosPassos,
            prioridade_acompanhamento: formData.prioridadeAcompanhamento
          }
        ]);

      if (error) throw error;

      alert('✅ Visita salva com sucesso!');
      if (onSalvar) onSalvar();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const BotaoOpcao = ({ opcao, selecionado, onClick, cor = 'blue' }) => {
    const getCoresBotao = (cor, selecionado) => {
      if (selecionado) {
        switch (cor) {
          case 'green': return 'bg-green-600 text-white border-green-600';
          case 'red': return 'bg-red-600 text-white border-red-600';
          case 'orange': return 'bg-orange-600 text-white border-orange-600';
          case 'yellow': return 'bg-yellow-500 text-white border-yellow-500';
          case 'gray': return 'bg-gray-600 text-white border-gray-600';
          default: return 'bg-blue-600 text-white border-blue-600';
        }
      }
      return 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:shadow-md active:scale-95';
    };

    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all min-h-[44px] flex items-center justify-center ${getCoresBotao(cor, selecionado)} ${
          selecionado ? 'shadow-lg scale-105' : ''
        }`}
      >
        {selecionado && <Check size={14} className="mr-1" />}
        <span className="text-center leading-tight">{opcao}</span>
      </button>
    );
  };

  const RatingEstrelas = ({ valor, onChange }) => {
    const opcoes = [
      { label: 'Péssimo', value: 'Péssimo', stars: 1 },
      { label: 'Ruim', value: 'Ruim', stars: 2 },
      { label: 'Regular', value: 'Regular', stars: 3 },
      { label: 'Bom', value: 'Bom', stars: 4 },
      { label: 'Excelente', value: 'Excelente', stars: 5 }
    ];

    return (
      <div className="grid grid-cols-5 gap-1">
        {opcoes.map((opcao) => (
          <button
            key={opcao.value}
            type="button"
            onClick={() => onChange(opcao.value)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all min-h-[70px] ${
              valor === opcao.value
                ? 'bg-yellow-500 text-white border-yellow-600 shadow-lg'
                : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400'
            }`}
          >
            <Star 
              size={16} 
              fill={valor === opcao.value ? 'white' : 'none'}
              className="mb-1"
            />
            <span className="text-xs font-medium text-center leading-tight">{opcao.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // ETAPA 0: DADOS BÁSICOS
  const renderEtapa0 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Data da Visita *</label>
        <input
          type="date"
          value={formData.dataVisita}
          onChange={(e) => handleChange('dataVisita', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Consultor *</label>
        <select
          value={formData.nomeConsultor}
          onChange={(e) => handleChange('nomeConsultor', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          required
        >
          <option value="">Selecione...</option>
          <option value="Gabriel">Gabriel</option>
          <option value="Maria">Maria</option>
          <option value="João">João</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Nome do Cliente *</label>
        <input
          type="text"
          placeholder="Razão social ou nome fantasia"
          value={formData.nomeCliente}
          onChange={(e) => handleChange('nomeCliente', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Pessoa de Contato</label>
        <input
          type="text"
          placeholder="Nome e cargo"
          value={formData.pessoaContato}
          onChange={(e) => handleChange('pessoaContato', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Segmento *</label>
        <div className="grid grid-cols-2 gap-2">
          {['Alimentício', 'Farmacêutico', 'Cosméticos', 'Industrial', 'Outros'].map(seg => (
            <BotaoOpcao
              key={seg}
              opcao={seg}
              selecionado={formData.segmentoCliente === seg}
              onClick={() => handleChange('segmentoCliente', seg)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Porte *</label>
        <div className="grid grid-cols-3 gap-2">
          {['Pequeno', 'Médio', 'Grande'].map(porte => (
            <BotaoOpcao
              key={porte}
              opcao={porte}
              selecionado={formData.porteCliente === porte}
              onClick={() => handleChange('porteCliente', porte)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ETAPA 1: AVALIAÇÕES
  const renderEtapa1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Atendimento</label>
        <RatingEstrelas
          valor={formData.avaliacaoAtendimento}
          onChange={(val) => handleChange('avaliacaoAtendimento', val)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Produtos</label>
        <RatingEstrelas
          valor={formData.avaliacaoVariedade}
          onChange={(val) => handleChange('avaliacaoVariedade', val)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Entrega</label>
        <RatingEstrelas
          valor={formData.avaliacaoEntrega}
          onChange={(val) => handleChange('avaliacaoEntrega', val)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Comentários</label>
        <textarea
          value={formData.comentariosFeedback}
          onChange={(e) => handleChange('comentariosFeedback', e.target.value)}
          placeholder="Observações sobre as avaliações..."
          maxLength="300"
          className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 300 caracteres</span>
          <span className={formData.comentariosFeedback.length > 250 ? 'text-orange-600 font-medium' : ''}>
            {formData.comentariosFeedback.length}/300
          </span>
        </div>
      </div>
    </div>
  );

  // ETAPA 2: PRODUTOS
  const renderEtapa2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Produtos Utilizados</label>
        <div className="space-y-2">
          {[
            'Marmitas e embalagens',
            'Copos e descartáveis',
            'Sacolas e bobinas',
            'Produtos para eventos',
            'Higiene e limpeza',
            'Produtos sustentáveis',
            'Outros'
          ].map(prod => (
            <label
              key={prod}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.produtosUtilizados.includes(prod)
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-blue-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.produtosUtilizados.includes(prod)}
                onChange={() => handleCheckboxChange('produtosUtilizados', prod)}
                className="w-5 h-5 text-blue-600"
              />
              <span className="text-sm font-medium">{prod}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Volume PSR (%)</label>
        <div className="grid grid-cols-2 gap-2">
          {['0-25', '26-50', '51-75', '76-100'].map(vol => (
            <BotaoOpcao
              key={vol}
              opcao={`${vol}%`}
              selecionado={formData.volumePercentual === vol}
              onClick={() => handleChange('volumePercentual', vol)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Interesse em Expandir?</label>
        <div className="grid grid-cols-2 gap-3">
          {['Sim', 'Não'].map(opt => (
            <BotaoOpcao
              key={opt}
              opcao={opt}
              selecionado={formData.interesseExpandir === opt}
              onClick={() => handleChange('interesseExpandir', opt)}
              cor={opt === 'Sim' ? 'green' : 'gray'}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ETAPA 3: OPORTUNIDADES
  const renderEtapa3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Por que NÃO compra outros produtos?</label>
        <textarea
          value={formData.motivoNaoCompra}
          onChange={(e) => handleChange('motivoNaoCompra', e.target.value)}
          placeholder="Preço, qualidade, desconhecimento..."
          maxLength="400"
          className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 400 caracteres</span>
          <span className={formData.motivoNaoCompra.length > 350 ? 'text-orange-600 font-medium' : ''}>
            {formData.motivoNaoCompra.length}/400
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Produtos que NÃO oferecemos</label>
        <textarea
          value={formData.produtosNaoOferecemos}
          onChange={(e) => handleChange('produtosNaoOferecemos', e.target.value)}
          placeholder="Produtos, volumes, fornecedores..."
          maxLength="400"
          className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 400 caracteres</span>
          <span className={formData.produtosNaoOferecemos.length > 350 ? 'text-orange-600 font-medium' : ''}>
            {formData.produtosNaoOferecemos.length}/400
          </span>
        </div>
      </div>
    </div>
  );

  // ETAPA 4: RECLAMAÇÕES
  const renderEtapa4 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Houve Reclamação?</label>
        <div className="grid grid-cols-2 gap-3">
          {['Sim', 'Não'].map(opt => (
            <BotaoOpcao
              key={opt}
              opcao={opt}
              selecionado={formData.temReclamacao === opt}
              onClick={() => handleChange('temReclamacao', opt)}
              cor={opt === 'Sim' ? 'red' : 'green'}
            />
          ))}
        </div>
      </div>

      {formData.temReclamacao === 'Sim' && (
        <>
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Tipos</label>
            <div className="space-y-2">
              {[
                'Qualidade',
                'Preço',
                'Atraso',
                'Atendimento',
                'Produto errado',
                'Embalagem',
                'Falta estoque',
                'Cobrança',
                'Comunicação',
                'Outros'
              ].map(tipo => (
                <label
                  key={tipo}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.tiposReclamacao.includes(tipo)
                      ? 'bg-red-50 border-red-500'
                      : 'bg-white border-gray-300 hover:border-red-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.tiposReclamacao.includes(tipo)}
                    onChange={() => handleCheckboxChange('tiposReclamacao', tipo)}
                    className="w-5 h-5 text-red-600"
                  />
                  <span className="text-sm font-medium">{tipo}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Detalhes</label>
            <textarea
              value={formData.detalheReclamacao}
              onChange={(e) => handleChange('detalheReclamacao', e.target.value)}
              placeholder="Descreva a reclamação..."
              maxLength="400"
              className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Máximo 400 caracteres</span>
              <span className={formData.detalheReclamacao.length > 350 ? 'text-orange-600 font-medium' : ''}>
                {formData.detalheReclamacao.length}/400
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Gravidade</label>
            <div className="space-y-2">
              {['Comentário pontual', 'Incômodo moderado', 'Problema significativo'].map(grav => (
                <BotaoOpcao
                  key={grav}
                  opcao={grav}
                  selecionado={formData.gravidadeReclamacao === grav}
                  onClick={() => handleChange('gravidadeReclamacao', grav)}
                  cor="orange"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Ação Proposta</label>
            <textarea
              value={formData.acaoProposta}
              onChange={(e) => handleChange('acaoProposta', e.target.value)}
              placeholder="Solução proposta..."
              maxLength="300"
              className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Máximo 300 caracteres</span>
              <span className={formData.acaoProposta.length > 250 ? 'text-orange-600 font-medium' : ''}>
                {formData.acaoProposta.length}/300
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Cliente Satisfeito?</label>
            <div className="grid grid-cols-2 gap-3">
              {['Sim', 'Não'].map(opt => (
                <BotaoOpcao
                  key={opt}
                  opcao={opt}
                  selecionado={formData.satisfacaoSolucao === opt}
                  onClick={() => handleChange('satisfacaoSolucao', opt)}
                  cor={opt === 'Sim' ? 'green' : 'red'}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ETAPA 5: FINALIZAR
  const renderEtapa5 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Observações Gerais</label>
        <textarea
          value={formData.observacoesGerais}
          onChange={(e) => handleChange('observacoesGerais', e.target.value)}
          placeholder="Impressões, condições, relacionamento..."
          maxLength="500"
          className="w-full border-2 border-gray-300 rounded-lg p-3 h-32 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 500 caracteres</span>
          <span className={formData.observacoesGerais.length > 450 ? 'text-orange-600 font-medium' : ''}>
            {formData.observacoesGerais.length}/500
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Próximos Passos</label>
        <textarea
          value={formData.proximosPassos}
          onChange={(e) => handleChange('proximosPassos', e.target.value)}
          placeholder="Enviar orçamento, agendar visita..."
          maxLength="400"
          className="w-full border-2 border-gray-300 rounded-lg p-3 h-32 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 400 caracteres</span>
          <span className={formData.proximosPassos.length > 350 ? 'text-orange-600 font-medium' : ''}>
            {formData.proximosPassos.length}/400
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Prioridade</label>
        <div className="grid grid-cols-3 gap-2">
          {['Baixa', 'Média', 'Alta'].map(prior => (
            <BotaoOpcao
              key={prior}
              opcao={prior}
              selecionado={formData.prioridadeAcompanhamento === prior}
              onClick={() => handleChange('prioridadeAcompanhamento', prior)}
              cor={prior === 'Alta' ? 'red' : prior === 'Média' ? 'yellow' : 'green'}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderEtapaAtual = () => {
    switch (etapaAtual) {
      case 0: return renderEtapa0();
      case 1: return renderEtapa1();
      case 2: return renderEtapa2();
      case 3: return renderEtapa3();
      case 4: return renderEtapa4();
      case 5: return renderEtapa5();
      default: return null;
    }
  };

  const EtapaAtual = etapas[etapaAtual];
  const Icone = EtapaAtual.icone;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress Bar - Fixed */}
      <div className="sticky top-0 bg-white shadow-md z-10 flex-shrink-0">
        <div className="flex overflow-x-auto scrollbar-hide">
          {etapas.map((etapa, idx) => {
            const IconeEtapa = etapa.icone;
            return (
              <button
                key={etapa.id}
                onClick={() => setEtapaAtual(idx)}
                className={`flex-1 min-w-[70px] p-2 border-b-4 transition-all ${
                  idx === etapaAtual
                    ? `${etapa.cor.replace('bg-', 'border-')} bg-blue-50`
                    : idx < etapaAtual
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <IconeEtapa 
                  size={18} 
                  className={`mx-auto mb-1 ${
                    idx === etapaAtual ? 'text-blue-600' :
                    idx < etapaAtual ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <p className={`text-xs font-medium leading-tight ${
                  idx === etapaAtual ? 'text-blue-600' :
                  idx < etapaAtual ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {etapa.titulo}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Etapa - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-24">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-full ${EtapaAtual.cor}`}>
                <Icone size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{EtapaAtual.titulo}</h2>
                <p className="text-sm text-gray-600">Etapa {etapaAtual + 1} de {etapas.length}</p>
              </div>
            </div>

            {renderEtapaAtual()}
          </div>
        </div>
      </div>

      {/* Navegação Fixa - Fixed */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          {etapaAtual > 0 && (
            <button
              onClick={etapaAnterior}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
            >
              <ChevronLeft size={18} />
              Voltar
            </button>
          )}
          
          {etapaAtual < etapas.length - 1 ? (
            <button
              onClick={proximaEtapa}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg text-sm"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50 text-sm"
            >
              <Check size={18} />
              {salvando ? 'Salvando...' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioVisita;