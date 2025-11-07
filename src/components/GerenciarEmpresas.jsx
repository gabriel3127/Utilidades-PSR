import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Edit, Trash2, Save, X, Building2, AlertCircle } from 'lucide-react';

const GerenciarEmpresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: ''
  });

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      alert('❌ Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (empresa = null) => {
    setEditando(empresa);
    setFormData(empresa ? {
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || ''
    } : {
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: ''
    });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!formData.nome.trim()) {
      alert('⚠️ Nome da empresa é obrigatório!');
      return;
    }

    try {
      if (editando) {
        // Atualizar
        const { error } = await supabase
          .from('empresas')
          .update(formData)
          .eq('id', editando.id);

        if (error) throw error;
        alert('✅ Empresa atualizada com sucesso!');
      } else {
        // Criar
        const { error } = await supabase
          .from('empresas')
          .insert([formData]);

        if (error) throw error;
        alert('✅ Empresa criada com sucesso!');
      }

      setModalAberto(false);
      carregarEmpresas();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    }
  };

  const excluir = async (empresa) => {
    if (!window.confirm(`⚠️ Excluir empresa "${empresa.nome}"?\n\nIsso removerá todas as ocorrências e dados relacionados!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresa.id);

      if (error) throw error;

      alert('✅ Empresa excluída com sucesso!');
      carregarEmpresas();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro ao excluir: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="text-blue-600" />
              Gerenciar Empresas
            </h3>
            <p className="text-sm text-gray-500 mt-1">Empresas cadastradas no sistema</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Nova Empresa
          </button>
        </div>

        {empresas.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma empresa cadastrada</p>
            <button
              onClick={() => abrirModal()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Cadastrar Primeira Empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Cadastro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {empresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{empresa.nome}</div>
                      {empresa.endereco && (
                        <div className="text-xs text-gray-500 mt-1">{empresa.endereco}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {empresa.cnpj || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {empresa.telefone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => abrirModal(empresa)}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => excluir(empresa)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-800">
                {editando ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: PSR Embalagens Matriz"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={salvar}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editando ? 'Salvar Alterações' : 'Criar Empresa'}
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

export default GerenciarEmpresas;