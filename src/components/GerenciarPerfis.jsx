import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Shield, Edit, Save, X, ChevronRight, Plus, Trash2, AlertCircle } from 'lucide-react';

const GerenciarPerfis = () => {
  const [perfis, setPerfis] = useState([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Modal de criar/editar perfil
  const [modalPerfil, setModalPerfil] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(null);
  const [formPerfil, setFormPerfil] = useState({
    nome: '',
    descricao: '',
    cor: '#3b82f6'
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (perfilSelecionado) {
      carregarPermissoes();
      carregarEmpresasPerfil();
      carregarSetoresPerfil();
    }
  }, [perfilSelecionado]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [
        { data: perfisData },
        { data: empresasData },
        { data: setoresData }
      ] = await Promise.all([
        supabase.from('perfis').select('*').order('nome'),
        supabase.from('empresas').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome')
      ]);

      setPerfis(perfisData || []);
      setEmpresas(empresasData || []);
      setSetores(setoresData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPermissoes = async () => {
    try {
      const { data, error } = await supabase
        .from('permissoes')
        .select('*')
        .eq('perfil_id', perfilSelecionado.id)
        .single();

      if (error) throw error;
      setPermissoes(data);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    }
  };

  const carregarEmpresasPerfil = async () => {
    try {
      const { data, error } = await supabase
        .from('perfis_empresas')
        .select('empresa_id')
        .eq('perfil_id', perfilSelecionado.id);

      if (error) throw error;
      setEmpresasSelecionadas(data.map(pe => pe.empresa_id));
    } catch (error) {
      console.error('Erro ao carregar empresas do perfil:', error);
    }
  };

  const carregarSetoresPerfil = async () => {
    try {
      const { data, error } = await supabase
        .from('perfis_setores')
        .select('setor_id')
        .eq('perfil_id', perfilSelecionado.id);

      if (error) throw error;
      setSetoresSelecionados(data.map(ps => ps.setor_id));
    } catch (error) {
      console.error('Erro ao carregar setores do perfil:', error);
    }
  };

  const abrirModalPerfil = (perfil = null) => {
    setEditandoPerfil(perfil);
    setFormPerfil(perfil ? {
      nome: perfil.nome,
      descricao: perfil.descricao || '',
      cor: perfil.cor || '#3b82f6'
    } : {
      nome: '',
      descricao: '',
      cor: '#3b82f6'
    });
    setModalPerfil(true);
  };

  const salvarPerfil = async () => {
    if (!formPerfil.nome.trim()) {
      alert('⚠️ Nome do perfil é obrigatório!');
      return;
    }

    try {
      if (editandoPerfil) {
        // Atualizar
        const { error } = await supabase
          .from('perfis')
          .update(formPerfil)
          .eq('id', editandoPerfil.id);

        if (error) throw error;
        alert('✅ Perfil atualizado!');
      } else {
        // Criar novo
        const { data: novoPerfil, error: perfilError } = await supabase
          .from('perfis')
          .insert([formPerfil])
          .select()
          .single();

        if (perfilError) throw perfilError;

        // Criar permissões padrão para o novo perfil
        const { error: permError } = await supabase
          .from('permissoes')
          .insert([{
            perfil_id: novoPerfil.id,
            pode_acessar_ocorrencias: true,
            pode_criar_ocorrencias: true,
            pode_acessar_visitas: true,
            pode_acessar_dashboard: true
          }]);

        if (permError) throw permError;

        alert('✅ Perfil criado com sucesso!');
      }

      setModalPerfil(false);
      carregarDados();
      if (editandoPerfil && perfilSelecionado?.id === editandoPerfil.id) {
        // Recarregar perfil selecionado se foi editado
        const { data } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', editandoPerfil.id)
          .single();
        setPerfilSelecionado(data);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const excluirPerfil = async (perfil) => {
    // Não permitir excluir perfil Admin
    if (perfil.nome === 'Admin') {
      alert('⚠️ Não é possível excluir o perfil Admin!');
      return;
    }

    if (!window.confirm(`⚠️ Excluir perfil "${perfil.nome}"?\n\nIsso removerá todas as permissões associadas!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('perfis')
        .delete()
        .eq('id', perfil.id);

      if (error) throw error;

      alert('✅ Perfil excluído!');
      if (perfilSelecionado?.id === perfil.id) {
        setPerfilSelecionado(null);
        setPermissoes(null);
      }
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const handlePermissaoChange = (campo) => {
    setPermissoes({
      ...permissoes,
      [campo]: !permissoes[campo]
    });
  };

  const handleEmpresaToggle = (empresaId) => {
    if (empresasSelecionadas.includes(empresaId)) {
      setEmpresasSelecionadas(empresasSelecionadas.filter(id => id !== empresaId));
    } else {
      setEmpresasSelecionadas([...empresasSelecionadas, empresaId]);
    }
  };

  const handleSetorToggle = (setorId) => {
    if (setoresSelecionados.includes(setorId)) {
      setSetoresSelecionados(setoresSelecionados.filter(id => id !== setorId));
    } else {
      setSetoresSelecionados([...setoresSelecionados, setorId]);
    }
  };

const salvarPermissoes = async () => {
    if (!perfilSelecionado || !permissoes) return;

    setSalvando(true);
    try {
        // 1. SALVAR PERMISSÕES BÁSICAS
        const { error: permError } = await supabase
        .from('permissoes')
        .update({
            ...permissoes,
            updated_at: new Date().toISOString()
        })
        .eq('perfil_id', perfilSelecionado.id);

        if (permError) throw permError;

        // 2. GERENCIAR EMPRESAS
        // 2.1 Deletar todas as empresas associadas existentes
        const { error: deleteEmpresasError } = await supabase
        .from('perfis_empresas')
        .delete()
        .eq('perfil_id', perfilSelecionado.id);

        if (deleteEmpresasError) throw deleteEmpresasError;

        // 2.2 Inserir apenas as empresas selecionadas (se houver)
        // Se empresasSelecionadas está vazio = acesso total (não insere nada)
        if (empresasSelecionadas.length > 0) {
        const empresasToInsert = empresasSelecionadas.map(empresa_id => ({
            perfil_id: perfilSelecionado.id,
            empresa_id: empresa_id,
            created_at: new Date().toISOString()
        }));

        const { error: insertEmpresasError } = await supabase
            .from('perfis_empresas')
            .insert(empresasToInsert);

        if (insertEmpresasError) throw insertEmpresasError;
        }

        // 3. GERENCIAR SETORES
        // 3.1 Deletar todos os setores associados existentes
        const { error: deleteSetoresError } = await supabase
        .from('perfis_setores')
            .delete()
            .eq('perfil_id', perfilSelecionado.id);

        if (deleteSetoresError) throw deleteSetoresError;

        // 3.2 Inserir apenas os setores selecionados (se houver)
        // Se setoresSelecionados está vazio = acesso total (não insere nada)
        if (setoresSelecionados.length > 0) {
        const setoresToInsert = setoresSelecionados.map(setor_id => ({
            perfil_id: perfilSelecionado.id,
            setor_id: setor_id,
            created_at: new Date().toISOString()
        }));

        const { error: insertSetoresError } = await supabase
            .from('perfis_setores')
            .insert(setoresToInsert);

        if (insertSetoresError) throw insertSetoresError;
        }

        // 4. SUCESSO!
        alert('✅ Permissões salvas com sucesso!');
        
        // Recarregar dados para refletir as mudanças
        await carregarEmpresasPerfil();
        await carregarSetoresPerfil();
        
    } catch (error) {
        console.error('Erro ao salvar permissões:', error);
        alert('❌ Erro ao salvar: ' + error.message);
    } finally {
        setSalvando(false);
    }
    };

  const permissoesConfig = [
    {
      titulo: '📋 Ocorrências',
      permissoes: [
        { campo: 'pode_acessar_ocorrencias', label: 'Acessar módulo de ocorrências' },
        { campo: 'pode_criar_ocorrencias', label: 'Criar novas ocorrências' },
        { campo: 'pode_editar_ocorrencias', label: 'Editar ocorrências' },
        { campo: 'pode_excluir_ocorrencias', label: 'Excluir ocorrências' },
        { campo: 'pode_resolver_ocorrencias', label: 'Resolver ocorrências' },
        { campo: 'pode_ver_todas_ocorrencias', label: 'Ver todas as ocorrências (não só as próprias)' },
      ]
    },
    {
      titulo: '🚗 Visitas Técnicas',
      permissoes: [
        { campo: 'pode_acessar_visitas', label: 'Acessar módulo de visitas' },
        { campo: 'pode_criar_visitas', label: 'Criar novas visitas' },
        { campo: 'pode_editar_visitas', label: 'Editar visitas' },
        { campo: 'pode_excluir_visitas', label: 'Excluir visitas' },
      ]
    },
    {
      titulo: '📊 Dashboard e Relatórios',
      permissoes: [
        { campo: 'pode_acessar_dashboard', label: 'Acessar dashboard' },
        { campo: 'pode_ver_graficos', label: 'Ver gráficos e estatísticas' },
        { campo: 'pode_ver_relatorios', label: 'Ver relatórios detalhados' },
        { campo: 'pode_exportar_dados', label: 'Exportar dados' },
      ]
    },
    {
      titulo: '⚙️ Administração',
      permissoes: [
        { campo: 'pode_acessar_administracao', label: 'Acessar painel de administração' },
        { campo: 'pode_gerenciar_usuarios', label: 'Gerenciar usuários' },
        { campo: 'pode_gerenciar_empresas', label: 'Gerenciar empresas' },
        { campo: 'pode_gerenciar_setores', label: 'Gerenciar setores' },
        { campo: 'pode_gerenciar_tipos_problema', label: 'Gerenciar tipos de problema' },
        { campo: 'pode_gerenciar_perfis', label: 'Gerenciar perfis e permissões' },
      ]
    },
    {
      titulo: '⚡ Recursos Especiais',
      permissoes: [
        { campo: 'pode_usar_ocorrencias_rapidas', label: 'Usar ocorrências rápidas' },
        { campo: 'pode_anexar_imagens', label: 'Anexar imagens nas ocorrências' },
      ]
    }
  ];

  const cores = [
    { nome: 'Roxo', valor: '#9333ea' },
    { nome: 'Azul', valor: '#3b82f6' },
    { nome: 'Verde', valor: '#10b981' },
    { nome: 'Cinza', valor: '#6b7280' },
    { nome: 'Vermelho', valor: '#ef4444' },
    { nome: 'Amarelo', valor: '#f59e0b' },
    { nome: 'Rosa', valor: '#ec4899' },
    { nome: 'Laranja', valor: '#f97316' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-blue-600" />
          Gerenciar Perfis e Permissões
        </h2>
        <p className="text-gray-500 mt-1">Configure as permissões de cada perfil de usuário</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Perfis */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Perfis Disponíveis</h3>
              <button
                onClick={() => abrirModalPerfil()}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Novo
              </button>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {perfis.map((perfil) => (
                <div
                  key={perfil.id}
                  className={`p-4 transition-colors ${
                    perfilSelecionado?.id === perfil.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => setPerfilSelecionado(perfil)}
                    className="w-full flex items-center justify-between text-left mb-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: perfil.cor }}
                      ></div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{perfil.nome}</div>
                        {perfil.descricao && (
                          <div className="text-xs text-gray-500 mt-1">{perfil.descricao}</div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400" size={20} />
                  </button>
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => abrirModalPerfil(perfil)}
                      className="flex-1 text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    {perfil.nome !== 'Admin' && (
                      <button
                        onClick={() => excluirPerfil(perfil)}
                        className="flex-1 text-red-600 hover:text-red-700 text-sm flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel de Permissões */}
        <div className="lg:col-span-2">
          {perfilSelecionado && permissoes ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit size={24} />
                  Permissões: {perfilSelecionado.nome}
                </h3>
                <p className="text-blue-100 text-sm mt-1">{perfilSelecionado.descricao}</p>
              </div>

              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                {permissoesConfig.map((grupo) => (
                  <div key={grupo.titulo} className="border-b pb-6 last:border-b-0">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">{grupo.titulo}</h4>
                    <div className="space-y-3">
                      {grupo.permissoes.map((perm) => (
                        <label
                          key={perm.campo}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={permissoes[perm.campo] || false}
                            onChange={() => handlePermissaoChange(perm.campo)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Empresas e Setores para Ocorrências */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    🏢 Restrições de Acesso para Ocorrências
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure quais empresas e setores este perfil pode acessar ao criar/visualizar ocorrências.
                    Deixe vazio para permitir acesso total.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Empresas */}
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">EMPRESAS</span>
                      </h5>
                      {empresas.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          Nenhuma empresa cadastrada
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {empresas.map((empresa) => (
                            <label
                              key={empresa.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={empresasSelecionadas.includes(empresa.id)}
                                onChange={() => handleEmpresaToggle(empresa.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{empresa.nome}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {empresasSelecionadas.length === 0 ? '✅ Acesso a todas as empresas' : `🔒 Acesso a ${empresasSelecionadas.length} empresa(s)`}
                      </p>
                    </div>

                    {/* Setores */}
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">SETORES</span>
                      </h5>
                      {setores.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          Nenhum setor cadastrado
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {setores.map((setor) => (
                            <label
                              key={setor.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={setoresSelecionados.includes(setor.id)}
                                onChange={() => handleSetorToggle(setor.id)}
                                className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">{setor.nome}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {setoresSelecionados.length === 0 ? '✅ Acesso a todos os setores' : `🔒 Acesso a ${setoresSelecionados.length} setor(es)`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={salvarPermissoes}
                  disabled={salvando}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {salvando ? 'Salvando...' : 'Salvar Permissões'}
                </button>
                <button
                  onClick={() => {
                    setPerfilSelecionado(null);
                    setPermissoes(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Selecione um perfil à esquerda para editar suas permissões
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar Perfil */}
      {modalPerfil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editandoPerfil ? 'Editar Perfil' : 'Novo Perfil'}
              </h3>
              <button
                onClick={() => setModalPerfil(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nome do Perfil *</label>
                <input
                  type="text"
                  value={formPerfil.nome}
                  onChange={(e) => setFormPerfil({ ...formPerfil, nome: e.target.value })}
                  placeholder="Ex: Supervisor, Operador, Coordenador"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Descrição</label>
                <textarea
                  value={formPerfil.descricao}
                  onChange={(e) => setFormPerfil({ ...formPerfil, descricao: e.target.value })}
                  placeholder="Breve descrição do perfil..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Cor</label>
                <div className="grid grid-cols-4 gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor.valor}
                      onClick={() => setFormPerfil({ ...formPerfil, cor: cor.valor })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formPerfil.cor === cor.valor
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                      title={cor.nome}
                    >
                      {formPerfil.cor === cor.valor && (
                        <span className="text-white text-xl">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={salvarPerfil}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editandoPerfil ? 'Salvar Alterações' : 'Criar Perfil'}
              </button>
              <button
                onClick={() => setModalPerfil(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarPerfis;