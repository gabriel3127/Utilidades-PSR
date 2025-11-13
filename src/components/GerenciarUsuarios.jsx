import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Edit, Trash2, Save, X, Users, AlertCircle, Mail, Shield } from 'lucide-react';

const GerenciarUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConvite, setModalConvite] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: '', // Será definido quando os perfis carregarem
    senha: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  // Definir perfil padrão quando perfis carregarem
  useEffect(() => {
    if (perfis.length > 0 && !formData.role) {
      // Buscar perfil "Usuario" ou pegar o primeiro
      const perfilPadrao = perfis.find(p => p.nome === 'Usuario') || perfis[0];
      setFormData(prev => ({ ...prev, role: perfilPadrao.nome }));
    }
  }, [perfis]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar perfis disponíveis PRIMEIRO
      const { data: perfisData, error: perfisError } = await supabase
        .from('perfis')
        .select('*')
        .order('nome');
      
      if (perfisError) throw perfisError;
      setPerfis(perfisData || []);

      // Carregar usuários da tabela users (não do auth.admin)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*, perfis(nome, cor)')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setUsuarios(usersData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('❌ Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalConvite = () => {
    const perfilPadrao = perfis.find(p => p.nome === 'Usuario') || perfis[0];
    setFormData({
      nome: '',
      email: '',
      role: perfilPadrao?.nome || '',
      senha: ''
    });
    setModalConvite(true);
  };

  const abrirModalEditar = (usuario) => {
    setEditando(usuario);
    setFormData({
      nome: usuario.nome || '',
      email: usuario.email,
      role: usuario.perfis?.nome || 'Usuario',
      senha: '' // Não mostramos a senha atual
    });
    setModalAberto(true);
  };

  const convidarUsuario = async () => {
    if (!formData.email.trim() || !formData.senha) {
      alert('⚠️ Email e senha são obrigatórios!');
      return;
    }

    if (formData.senha.length < 6) {
      alert('⚠️ A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    if (!formData.role) {
      alert('⚠️ Selecione um perfil/role!');
      return;
    }

    try {
      // Pegar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado para criar usuários');
      }

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rapid-worker`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.senha,
            nome: formData.nome || formData.email.split('@')[0],
            role: formData.role // Nome do perfil (Admin, Gerente, etc)
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      alert('✅ Usuário criado com sucesso!\n\n' + 
            'Email: ' + formData.email + '\n' +
            'Role: ' + result.user.role + '\n' +
            '🔒 Role salva com segurança em app_metadata');
      
      setModalConvite(false);
      carregarDados();
      
    } catch (error) {
      console.error('Erro ao convidar:', error);
      
      let mensagem = 'Erro ao criar usuário: ';
      
      if (error.message?.includes('already registered') || error.message?.includes('já está cadastrado')) {
        mensagem = '⚠️ Este email já está cadastrado no sistema!';
      } else if (error.message?.includes('email')) {
        mensagem = '⚠️ Email inválido!';
      } else if (error.message?.includes('admin')) {
        mensagem = '⚠️ Apenas administradores podem criar usuários!';
      } else if (error.message?.includes('autenticado') || error.message?.includes('Token')) {
        mensagem = '⚠️ Erro de autenticação. Faça logout e login novamente.';
      } else {
        mensagem += error.message;
      }
      
      alert(mensagem);
    }
  };

  const atualizarUsuario = async () => {
    if (!editando) return;

    try {
      // 1. Buscar perfil_id
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('id')
        .eq('nome', formData.role)
        .single();

      if (perfilError) throw perfilError;

      // 2. Atualizar tabela users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          nome: formData.nome || formData.email.split('@')[0],
          perfil_id: perfilData.id
        })
        .eq('id', editando.id);

      if (updateError) throw updateError;

      // 3. Se forneceu nova senha, atualizar no auth
      if (formData.senha && formData.senha.length >= 6) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.senha
        });
        
        if (passwordError) {
          console.warn('Aviso: Não foi possível atualizar senha:', passwordError.message);
        }
      }

      alert('✅ Usuário atualizado com sucesso!');
      setModalAberto(false);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('❌ Erro ao atualizar usuário: ' + error.message);
    }
  };

  const enviarEmailResetSenha = async (email) => {
    if (!window.confirm(`📧 Enviar email de redefinição de senha para ${email}?`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      alert(`✅ Email de redefinição de senha enviado para ${email}!\n\nO usuário receberá um link para criar uma nova senha.`);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      alert('❌ Erro ao enviar email: ' + error.message);
    }
  };

  const excluirUsuario = async (usuario) => {
    if (!window.confirm(`⚠️ Excluir usuário "${usuario.email}"?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      // Excluir da tabela users (cascade vai cuidar das relações)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', usuario.id);

      if (error) throw error;

      alert('✅ Usuário excluído com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro ao excluir usuário: ' + error.message);
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
              <Users className="text-blue-600" />
              Gerenciar Usuários
            </h3>
            <p className="text-sm text-gray-500 mt-1">Usuários do sistema com suas roles</p>
          </div>
          <button
            onClick={abrirModalConvite}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Convidar Usuário
          </button>
        </div>

        {usuarios.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum usuário cadastrado</p>
            <button
              onClick={abrirModalConvite}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Convidar Primeiro Usuário
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perfil/Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((user) => {
                  const role = user.perfis?.nome || 'Sem perfil';
                  const nome = user.nome || user.email?.split('@')[0];
                  const cor = user.perfis?.cor || '#6b7280';
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cor + '20' }}
                          >
                            <span className="font-semibold" style={{ color: cor }}>
                              {nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{nome}</div>
                            <div className="text-xs text-gray-500">
                              ✅ Ativo
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ 
                            backgroundColor: cor + '20',
                            color: cor
                          }}
                        >
                          {role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => abrirModalEditar(user)}
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => enviarEmailResetSenha(user.email)}
                            className="text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
                            title="Enviar email de redefinição de senha"
                          >
                            <Mail size={16} />
                            Reset
                          </button>
                          <button
                            onClick={() => excluirUsuario(user)}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={16} />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Convidar Usuário */}
      {modalConvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Convidar Novo Usuário</h3>
                <p className="text-xs text-gray-500 mt-1">🔐 Usando Supabase Authentication</p>
              </div>
              <button
                onClick={() => setModalConvite(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  📧 Um email de confirmação será enviado para o usuário com instruções de acesso.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo do usuário"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Senha Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 A senha será criada no Supabase Authentication. O usuário pode alterá-la após o primeiro login.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Perfil/Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {perfis.map(perfil => (
                    <option key={perfil.id} value={perfil.nome}>
                      {perfil.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={convidarUsuario}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                Convidar Usuário
              </button>
              <button
                onClick={() => setModalConvite(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Usuário */}
      {modalAberto && editando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Editar Usuário</h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nova Senha (opcional)
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Deixe em branco para manter a atual"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Perfil/Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {perfis.map(perfil => (
                    <option key={perfil.id} value={perfil.nome}>
                      {perfil.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={atualizarUsuario}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar Alterações
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

export default GerenciarUsuarios;