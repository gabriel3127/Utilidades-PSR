import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Edit, Trash2, FolderOpen, AlertCircle, ChevronRight, Save, X } from 'lucide-react';

const SetoresETipos = () => {
  const [setores, setSetores] = useState([]);
  const [setorSelecionado, setSetorSelecionado] = useState(null);
  const [tiposProblema, setTiposProblema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState(''); // 'setor' ou 'tipo'
  const [editando, setEditando] = useState(null);
  
  const [formSetor, setFormSetor] = useState({ nome: '' });
  const [formTipo, setFormTipo] = useState({ nome: '', cor: '#3b82f6' });

  useEffect(() => {
    carregarSetores();
  }, []);

  useEffect(() => {
    if (setorSelecionado) {
      carregarTiposDoSetor();
    }
  }, [setorSelecionado]);

  const carregarSetores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('setores')
        .select(`
          *,
          tipos_problema (count)
        `)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTiposDoSetor = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_problema')
        .select('*')
        .eq('setor_id', setorSelecionado.id)
        .order('nome');

      if (error) throw error;
      setTiposProblema(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
    }
  };

  const abrirModalSetor = (setor = null) => {
    setTipoModal('setor');
    setEditando(setor);
    setFormSetor(setor ? { nome: setor.nome } : { nome: '' });
    setModalAberto(true);
  };

  const abrirModalTipo = (tipo = null) => {
    if (!setorSelecionado) {
      alert('⚠️ Selecione um setor primeiro!');
      return;
    }
    setTipoModal('tipo');
    setEditando(tipo);
    setFormTipo(tipo ? { nome: tipo.nome, cor: tipo.cor } : { nome: '', cor: '#3b82f6' });
    setModalAberto(true);
  };

  const salvarSetor = async () => {
    if (!formSetor.nome.trim()) {
      alert('⚠️ Nome do setor é obrigatório!');
      return;
    }

    try {
      if (editando) {
        // Atualizar
        const { error } = await supabase
          .from('setores')
          .update({ nome: formSetor.nome })
          .eq('id', editando.id);

        if (error) throw error;
        alert('✅ Setor atualizado!');
      } else {
        // Criar
        const { error } = await supabase
          .from('setores')
          .insert([{ nome: formSetor.nome }]);

        if (error) throw error;
        alert('✅ Setor criado!');
      }

      setModalAberto(false);
      carregarSetores();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const salvarTipo = async () => {
    if (!formTipo.nome.trim()) {
      alert('⚠️ Nome do tipo é obrigatório!');
      return;
    }

    try {
      if (editando) {
        // Atualizar
        const { error } = await supabase
          .from('tipos_problema')
          .update({ 
            nome: formTipo.nome, 
            cor: formTipo.cor 
          })
          .eq('id', editando.id);

        if (error) throw error;
        alert('✅ Tipo de problema atualizado!');
      } else {
        // Criar
        const { error } = await supabase
          .from('tipos_problema')
          .insert([{ 
            nome: formTipo.nome, 
            cor: formTipo.cor,
            setor_id: setorSelecionado.id 
          }]);

        if (error) throw error;
        alert('✅ Tipo de problema criado!');
      }

      setModalAberto(false);
      carregarTiposDoSetor();
      carregarSetores(); // Atualizar contagem
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const excluirSetor = async (setor) => {
    if (!window.confirm(`⚠️ Excluir setor "${setor.nome}"?\n\nIsso também excluirá todos os tipos de problema deste setor!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('setores')
        .delete()
        .eq('id', setor.id);

      if (error) throw error;

      alert('✅ Setor excluído!');
      if (setorSelecionado?.id === setor.id) {
        setSetorSelecionado(null);
        setTiposProblema([]);
      }
      carregarSetores();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const excluirTipo = async (tipo) => {
    if (!window.confirm(`Excluir tipo "${tipo.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tipos_problema')
        .delete()
        .eq('id', tipo.id);

      if (error) throw error;

      alert('✅ Tipo excluído!');
      carregarTiposDoSetor();
      carregarSetores(); // Atualizar contagem
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro: ' + error.message);
    }
  };

  const cores = [
    { nome: 'Azul', valor: '#3b82f6' },
    { nome: 'Verde', valor: '#10b981' },
    { nome: 'Vermelho', valor: '#ef4444' },
    { nome: 'Amarelo', valor: '#f59e0b' },
    { nome: 'Roxo', valor: '#8b5cf6' },
    { nome: 'Rosa', valor: '#ec4899' },
    { nome: 'Laranja', valor: '#f97316' },
    { nome: 'Cinza', valor: '#6b7280' },
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
          <FolderOpen className="text-blue-600" />
          Setores e Tipos de Problema
        </h2>
        <p className="text-gray-500 mt-1">Organize os tipos de problema por setor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Setores */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Setores</h3>
              <button
                onClick={() => abrirModalSetor()}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Novo
              </button>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {setores.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum setor cadastrado</p>
                  <button
                    onClick={() => abrirModalSetor()}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Criar primeiro setor
                  </button>
                </div>
              ) : (
                setores.map((setor) => (
                  <div
                    key={setor.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      setorSelecionado?.id === setor.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSetorSelecionado(setor)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <FolderOpen className="text-blue-600" size={20} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{setor.nome}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {setor.tipos_problema?.[0]?.count || 0} tipo(s)
                          </div>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={() => abrirModalSetor(setor)}
                        className="flex-1 text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1"
                      >
                        <Edit size={14} />
                        Editar
                      </button>
                      <button
                        onClick={() => excluirSetor(setor)}
                        className="flex-1 text-red-600 hover:text-red-700 text-sm flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lista de Tipos de Problema */}
        <div className="lg:col-span-2">
          {setorSelecionado ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <FolderOpen size={24} />
                      {setorSelecionado.nome}
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Tipos de problema deste setor
                    </p>
                  </div>
                  <button
                    onClick={() => abrirModalTipo()}
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-semibold flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Novo Tipo
                  </button>
                </div>
              </div>

              <div className="p-6">
                {tiposProblema.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">Nenhum tipo de problema cadastrado</p>
                    <button
                      onClick={() => abrirModalTipo()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Criar Primeiro Tipo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tiposProblema.map((tipo) => (
                      <div
                        key={tipo.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-6 h-6 rounded flex-shrink-0 border-2 border-gray-300"
                            style={{ backgroundColor: tipo.cor }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 break-words">{tipo.nome}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Criado em {new Date(tipo.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <button
                            onClick={() => abrirModalTipo(tipo)}
                            className="flex-1 text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1"
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => excluirTipo(tipo)}
                            className="flex-1 text-red-600 hover:text-red-700 text-sm flex items-center justify-center gap-1"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Selecione um setor à esquerda para gerenciar seus tipos de problema
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editando ? 'Editar' : 'Novo'} {tipoModal === 'setor' ? 'Setor' : 'Tipo de Problema'}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {tipoModal === 'setor' ? (
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome do Setor *</label>
                  <input
                    type="text"
                    value={formSetor.nome}
                    onChange={(e) => setFormSetor({ ...formSetor, nome: e.target.value })}
                    placeholder="Ex: Produção, Expedição, Logística"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Nome do Tipo *</label>
                    <input
                      type="text"
                      value={formTipo.nome}
                      onChange={(e) => setFormTipo({ ...formTipo, nome: e.target.value })}
                      placeholder="Ex: Produto sem estoque"
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Cor</label>
                    <div className="grid grid-cols-4 gap-2">
                      {cores.map((cor) => (
                        <button
                          key={cor.valor}
                          onClick={() => setFormTipo({ ...formTipo, cor: cor.valor })}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formTipo.cor === cor.valor
                              ? 'border-gray-800 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: cor.valor }}
                          title={cor.nome}
                        >
                          {formTipo.cor === cor.valor && (
                            <span className="text-white text-xl">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={tipoModal === 'setor' ? salvarSetor : salvarTipo}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar
              </button>
              <button
                onClick={() => setModalAberto(false)}
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

export default SetoresETipos;