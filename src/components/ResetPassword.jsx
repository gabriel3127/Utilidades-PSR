// src/components/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('form'); // 'form', 'success', 'error'
  const [mensagem, setMensagem] = useState('');
  const [tokenValido, setTokenValido] = useState(false);

  useEffect(() => {
    // Verificar se tem token de reset na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'recovery') {
      setTokenValido(true);
    } else {
      setStatus('error');
      setMensagem('Link de recuperação inválido ou expirado');
    }
  }, []);

  const validarSenhas = () => {
    if (!novaSenha || !confirmarSenha) {
      alert('⚠️ Preencha ambos os campos de senha');
      return false;
    }

    if (novaSenha.length < 6) {
      alert('⚠️ A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (novaSenha !== confirmarSenha) {
      alert('⚠️ As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleResetSenha = async (e) => {
    e.preventDefault();

    if (!validarSenhas()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      setStatus('success');
      setMensagem('Senha alterada com sucesso!');

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setStatus('error');
      setMensagem(error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValido && status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
          <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Link Inválido</h2>
          <p className="text-gray-600 mb-6">{mensagem}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Senha Alterada!</h2>
          <p className="text-gray-600 mb-6">{mensagem}</p>
          <p className="text-sm text-gray-500 mb-6">Redirecionando para o login...</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Ir para Login Agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <img 
            src="/logo-psr.png" 
            alt="PSR Embalagens" 
            className="h-16 mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-orange-600 mb-2">PSR EMBALAGENS</h1>
          <p className="text-gray-600">Redefinir Senha</p>
        </div>

        <form onSubmit={handleResetSenha} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              🔒 Digite sua nova senha abaixo
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {mostrarSenha ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite a senha novamente"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
              <p className="text-red-600 text-sm mt-1">❌ As senhas não coincidem</p>
            )}
            {novaSenha && confirmarSenha && novaSenha === confirmarSenha && (
              <p className="text-green-600 text-sm mt-1">✅ As senhas coincidem</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !novaSenha || !confirmarSenha}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Alterando...
              </>
            ) : (
              'Alterar Senha'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
            >
              Voltar para Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}