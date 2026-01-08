import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import imageCompression from 'browser-image-compression';
import { 
  AlertTriangle, 
  Save, 
  X, 
  Check, 
  Camera, 
  User,
  ChevronRight,
  ChevronLeft,
  Building,
  Tag,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

const FormularioOcorrencia = ({ onSalvar, userRole, ocorrenciaParaEditar, userInfo }) => {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [setoresFiltrados, setSetoresFiltrados] = useState([]);
  const [tiposProblema, setTiposProblema] = useState([]);
  const [tiposProblemaFiltrados, setTiposProblemaFiltrados] = useState([]);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [imagemFile, setImagemFile] = useState(null);
  const [imagemPreview, setImagemPreview] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [restricoes, setRestricoes] = useState({
    empresas: [],
    setores: []
  });

  const primeiraRenderizacao = useRef(true);
  
  const [formData, setFormData] = useState({
    cliente: '',
    nfe: '',
    nota_retida: false,
    empresa_id: '',
    setor_id: '',
    tipo_problema_id: '',
    status: 'Em Andamento',
    prioridade: 'Média',
    localizacao: '',
    descricao: ''
  });

  const etapas = [
    {
      id: 0,
      titulo: 'Cliente',
      icone: User,
      cor: 'bg-orange-600',
      campos: ['cliente', 'nfe', 'nota_retida']
    },
    {
      id: 1,
      titulo: 'Classificação',
      icone: Building,
      cor: 'bg-blue-600',
      campos: ['empresa_id', 'setor_id', 'tipo_problema_id']
    },
    {
      id: 2,
      titulo: 'Detalhes',
      icone: Tag,
      cor: 'bg-purple-600',
      campos: ['status', 'prioridade', 'localizacao']
    },
    {
      id: 3,
      titulo: 'Descrição',
      icone: FileText,
      cor: 'bg-green-600',
      campos: ['descricao']
    },
    {
      id: 4,
      titulo: 'Imagem',
      icone: ImageIcon,
      cor: 'bg-indigo-600',
      campos: ['imagem']
    }
  ];

  useEffect(() => {
    carregarDadosAuxiliares();
    carregarUsuarioLogado();
    carregarRestricoes();
  }, []);

  const carregarRestricoes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('perfil_id')
        .eq('id', user.id)
        .single();

      if (!userData?.perfil_id) return;

      const { data: empresasRestricoes } = await supabase
        .from('perfis_empresas')
        .select('empresa_id')
        .eq('perfil_id', userData.perfil_id);

      const { data: setoresRestricoes } = await supabase
        .from('perfis_setores')
        .select('setor_id')
        .eq('perfil_id', userData.perfil_id);

      setRestricoes({
        empresas: empresasRestricoes?.map(r => r.empresa_id) || [],
        setores: setoresRestricoes?.map(r => r.setor_id) || []
      });

    } catch (error) {
      console.error('Erro ao carregar restrições:', error);
    }
  };

  useEffect(() => {
    if (ocorrenciaParaEditar) {
      setModoEdicao(true);
      primeiraRenderizacao.current = true;
      setFormData({
        cliente: ocorrenciaParaEditar.cliente || '',
        nfe: ocorrenciaParaEditar.nfe || '',
        nota_retida: ocorrenciaParaEditar.nota_retida || false,
        empresa_id: ocorrenciaParaEditar.empresa_id || '',
        setor_id: ocorrenciaParaEditar.setor_id || '',
        tipo_problema_id: ocorrenciaParaEditar.tipo_problema_id || '',
        status: ocorrenciaParaEditar.status || 'Em Andamento',
        prioridade: ocorrenciaParaEditar.prioridade || 'Média',
        localizacao: ocorrenciaParaEditar.localizacao || '',
        descricao: ocorrenciaParaEditar.descricao || ''
      });
      if (ocorrenciaParaEditar.imagem_url) {
        setImagemPreview(ocorrenciaParaEditar.imagem_url);
      }
    }
  }, [ocorrenciaParaEditar]);

  const carregarUsuarioLogado = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioLogado({
          id: user.id,
          nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
          email: user.email
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const carregarDadosAuxiliares = async () => {
    const [
      { data: empresasData },
      { data: setoresData },
      { data: tiposProblemaData }
    ] = await Promise.all([
      supabase.from('empresas').select('*').order('nome'),
      supabase.from('setores').select('*').order('nome'),
      supabase.from('tipos_problema').select('*').order('nome')
    ]);

    setEmpresas(empresasData || []);
    setSetores(setoresData || []);
    setTiposProblema(tiposProblemaData || []);
  };

  useEffect(() => {
    if (!empresas.length || !setores.length) return;

    let empresasPermitidas = empresas;
    if (restricoes.empresas.length > 0) {
      empresasPermitidas = empresas.filter(e => restricoes.empresas.includes(e.id));
    }
    setEmpresasFiltradas(empresasPermitidas);

    if (empresasPermitidas.length === 1 && !formData.empresa_id) {
      setFormData(prev => ({ ...prev, empresa_id: empresasPermitidas[0].id }));
    }

    let setoresPermitidos = setores;
    if (restricoes.setores.length > 0) {
      setoresPermitidos = setores.filter(s => restricoes.setores.includes(s.id));
    }
    setSetoresFiltrados(setoresPermitidos);

    if (setoresPermitidos.length === 1 && !formData.setor_id) {
      setFormData(prev => ({ ...prev, setor_id: setoresPermitidos[0].id }));
    }
  }, [empresas, setores, restricoes]);

  useEffect(() => {
    if (formData.setor_id) {
      const tiposFiltrados = tiposProblema.filter(
        tipo => tipo.setor_id === parseInt(formData.setor_id)
      );
      setTiposProblemaFiltrados(tiposFiltrados);
      
      // Se for a primeira renderização de edição, não limpar
      if (primeiraRenderizacao.current && modoEdicao) {
        primeiraRenderizacao.current = false;
        return; // Sai aqui, não limpa
      }
      
      // Caso contrário, verifica se o tipo existe
      if (formData.tipo_problema_id) {
        const tipoExiste = tiposFiltrados.some(
          tipo => tipo.id === parseInt(formData.tipo_problema_id)
        );
        if (!tipoExiste) {
          setFormData(prev => ({ ...prev, tipo_problema_id: '' }));
        }
      }
    } else {
      setTiposProblemaFiltrados([]);
      if (!modoEdicao) {
        setFormData(prev => ({ ...prev, tipo_problema_id: '' }));
      }
    }
  }, [formData.setor_id, tiposProblema, modoEdicao]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const comprimirImagem = async (file) => {
    try {
      console.log('📸 Original:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      // ⭐ CONFIGURAÇÃO RECOMENDADA
      const options = {
        maxSizeMB: 0.5,              // 500KB
        maxWidthOrHeight: 1280,      // HD padrão
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQualidade: 0.7        // 70% qualidade
      };
      
      const compressedFile = await imageCompression(file, options);
      
      console.log('✅ Comprimido:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('📊 Economia:', ((1 - compressedFile.size / file.size) * 100).toFixed(0), '%');
      
      return compressedFile;
    } catch (error) {
      console.error('❌ Erro:', error);
      return file;
    }
  };

  const handleImagemChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Imagem muito grande! Máximo 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('❌ Apenas imagens são permitidas!');
      return;
    }

    setUploadando(true);
    const compressedFile = await comprimirImagem(file);
    setImagemFile(compressedFile);
    setUploadando(false);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagemPreview(reader.result);
    };
    reader.readAsDataURL(compressedFile);
  };

  const removerImagem = () => {
    setImagemFile(null);
    setImagemPreview(null);
  };

  const uploadImagem = async () => {
    if (!imagemFile) return null;

    setUploadando(true);
    try {
      const fileExt = imagemFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ocorrencias-imagens')
        .upload(filePath, imagemFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ocorrencias-imagens')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('❌ Erro ao fazer upload da imagem: ' + error.message);
      return null;
    } finally {
      setUploadando(false);
    }
  };

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
    if (!formData.cliente || formData.cliente.trim() === '') {
      alert('❌ O campo Cliente é obrigatório!');
      setEtapaAtual(0);
      return;
    }

    if (!formData.empresa_id || !formData.setor_id || !formData.tipo_problema_id) {
      alert('❌ Preencha todos os campos de classificação!');
      setEtapaAtual(1);
      return;
    }
    
    setSalvando(true);

    try {
      if (!usuarioLogado) {
        alert('❌ Usuário não identificado!');
        setSalvando(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      let imagemUrl = imagemPreview;
      
      if (imagemFile) {
        imagemUrl = await uploadImagem();
        if (!imagemUrl && imagemFile) {
          setSalvando(false);
          return;
        }
      }

      const dadosParaSalvar = {
        cliente: formData.cliente,
        nfe: formData.nfe || null,
        nota_retida: formData.nota_retida,
        descricao: formData.descricao || null,
        empresa_id: parseInt(formData.empresa_id),
        setor_id: parseInt(formData.setor_id),
        tipo_problema_id: parseInt(formData.tipo_problema_id),
        status: formData.status,
        prioridade: formData.prioridade,
        localizacao: formData.localizacao || null,
        imagem_url: imagemUrl
      };

      let error;

      if (modoEdicao && ocorrenciaParaEditar) {
        dadosParaSalvar.updated_by = user?.id || usuarioLogado.id;
        
        const result = await supabase
          .from('occurrences')
          .update(dadosParaSalvar)
          .eq('id', ocorrenciaParaEditar.id);
        
        error = result.error;
      } else {
        const result = await supabase
          .from('occurrences')
          .insert([dadosParaSalvar]);
        
        error = result.error;
      }

      if (error) throw error;

      alert(modoEdicao ? '✅ Ocorrência atualizada!' : '✅ Ocorrência cadastrada!');
      
      if (onSalvar) onSalvar();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const BotaoOpcao = ({ opcao, selecionado, onClick, cor = 'orange' }) => {
    const getCoresBotao = (cor, selecionado) => {
      if (selecionado) {
        switch (cor) {
          case 'green': return 'bg-green-600 text-white border-green-600';
          case 'red': return 'bg-red-600 text-white border-red-600';
          case 'blue': return 'bg-blue-600 text-white border-blue-600';
          case 'yellow': return 'bg-yellow-500 text-white border-yellow-500';
          case 'gray': return 'bg-gray-600 text-white border-gray-600';
          default: return 'bg-orange-600 text-white border-orange-600';
        }
      }
      return 'bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:shadow-md active:scale-95';
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

  // ETAPA 0: CLIENTE
  const renderEtapa0 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Solicitante/Origem: *
        </label>
        <input
          type="text"
          value={formData.cliente}
          onChange={(e) => handleInputChange('cliente', e.target.value)}
          placeholder="Nome ou ID do cliente"
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Numero do documento: *</label>
        <input
          type="text"
          value={formData.nfe}
          onChange={(e) => handleInputChange('nfe', e.target.value)}
          placeholder="Número da Nota Fiscal"
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
      </div>

      <div 
        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
          formData.nota_retida 
            ? 'bg-yellow-100 border-yellow-400' 
            : 'bg-white border-gray-300 hover:border-yellow-300'
        }`}
        onClick={() => handleInputChange('nota_retida', !formData.nota_retida)}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex-shrink-0">
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              formData.nota_retida 
                ? 'bg-yellow-500 border-yellow-600' 
                : 'bg-white border-gray-300'
            }`}>
              {formData.nota_retida && <Check size={16} className="text-white" />}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📋</span>
              <span className="text-sm font-bold text-gray-800">Nota Retida</span>
            </div>
            <p className="text-xs text-gray-600">
              Marque se a nota ficou retida no cliente
            </p>
          </div>
        </label>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <User size={20} className="text-blue-600" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Registrado por</p>
            <p className="font-medium text-gray-800">{usuarioLogado?.nome || 'Carregando...'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ETAPA 1: CLASSIFICAÇÃO
  const renderEtapa1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Empresa *</label>
        <select
          value={formData.empresa_id}
          onChange={(e) => handleInputChange('empresa_id', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          disabled={empresasFiltradas.length === 1}
          required
        >
          <option value="">Selecione...</option>
          {empresasFiltradas.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nome}</option>
          ))}
        </select>
        {empresasFiltradas.length === 1 && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <Check size={12} /> Selecionado automaticamente
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Setor *</label>
        <select
          value={formData.setor_id}
          onChange={(e) => handleInputChange('setor_id', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          disabled={setoresFiltrados.length === 1}
          required
        >
          <option value="">Selecione...</option>
          {setoresFiltrados.map(set => (
            <option key={set.id} value={set.id}>{set.nome}</option>
          ))}
        </select>
        {setoresFiltrados.length === 1 && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <Check size={12} /> Selecionado automaticamente
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Tipo de Problema *</label>
        <select
          value={formData.tipo_problema_id}
          onChange={(e) => handleInputChange('tipo_problema_id', e.target.value)}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          disabled={!formData.setor_id}
          required
        >
          <option value="">
            {formData.setor_id ? 'Selecione...' : 'Selecione um setor primeiro'}
          </option>
          {tiposProblemaFiltrados.map(tipo => (
            <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
          ))}
        </select>
        {formData.setor_id && tiposProblemaFiltrados.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Este setor não tem tipos cadastrados
          </p>
        )}
      </div>
    </div>
  );

  // ETAPA 2: DETALHES
  const renderEtapa2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Status</label>
        <div className="grid grid-cols-2 gap-3">
          {['Em Andamento', 'Resolvido'].map(status => (
            <BotaoOpcao
              key={status}
              opcao={status}
              selecionado={formData.status === status}
              onClick={() => handleInputChange('status', status)}
              cor={status === 'Resolvido' ? 'green' : 'blue'}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-700">Prioridade</label>
        <div className="grid grid-cols-3 gap-2">
          {['Baixa', 'Média', 'Alta'].map(prior => (
            <BotaoOpcao
              key={prior}
              opcao={prior}
              selecionado={formData.prioridade === prior}
              onClick={() => handleInputChange('prioridade', prior)}
              cor={prior === 'Alta' ? 'red' : prior === 'Média' ? 'yellow' : 'green'}
            />
          ))}
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'gerente') && (
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Localização</label>
          <input
            type="text"
            value={formData.localizacao}
            onChange={(e) => handleInputChange('localizacao', e.target.value)}
            placeholder="Ex: Prédio A, Sala 10"
            className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>
      )}
    </div>
  );

  // ETAPA 3: DESCRIÇÃO
  const renderEtapa3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">Descrição Detalhada</label>
        <textarea
          value={formData.descricao}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          placeholder="Descreva a ocorrência com o máximo de detalhes..."
          rows="8"
          maxLength="500"
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Máximo 500 caracteres</span>
          <span className={formData.descricao.length > 450 ? 'text-orange-600 font-medium' : ''}>
            {formData.descricao.length}/500
          </span>
        </div>
      </div>
    </div>
  );

  // ETAPA 4: IMAGEM
  const renderEtapa4 = () => (
    <div className="space-y-4">
      {!imagemPreview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 hover:bg-orange-50 transition-all">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImagemChange}
            className="hidden"
            id="imagem-upload"
            disabled={salvando || uploadando}
          />
          <label htmlFor="imagem-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-orange-100 p-4 rounded-full">
                <Camera className="w-12 h-12 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-700 font-medium text-lg">Tirar Foto</p>
                <p className="text-sm text-gray-500 mt-1">ou selecionar da galeria</p>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG até 5MB</p>
              </div>
            </div>
          </label>
        </div>
      ) : (
        <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
          <div className="relative">
            <img 
              src={imagemPreview} 
              alt="Preview" 
              className="w-full max-h-96 object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={removerImagem}
              disabled={salvando || uploadando}
              className="absolute top-2 right-2 bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
          {imagemFile && (
            <p className="text-sm text-gray-600 text-center mt-3 truncate">
              📎 {imagemFile.name}
            </p>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <span className="font-semibold">Dica:</span> Uma foto clara ajuda a resolver o problema mais rápido!
        </p>
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
                    ? `${etapa.cor.replace('bg-', 'border-')} bg-orange-50`
                    : idx < etapaAtual
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <IconeEtapa 
                  size={18} 
                  className={`mx-auto mb-1 ${
                    idx === etapaAtual ? 'text-orange-600' :
                    idx < etapaAtual ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <p className={`text-xs font-medium leading-tight ${
                  idx === etapaAtual ? 'text-orange-600' :
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
                <h2 className="text-xl font-bold text-gray-800">
                  {modoEdicao ? 'Editar' : 'Nova'} - {EtapaAtual.titulo}
                </h2>
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg text-sm"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={salvando || uploadando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50 text-sm"
            >
              <Save size={18} />
              {uploadando ? 'Enviando...' : salvando ? 'Salvando...' : modoEdicao ? 'Atualizar' : 'Cadastrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioOcorrencia;