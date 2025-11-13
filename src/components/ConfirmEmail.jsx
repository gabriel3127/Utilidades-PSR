// src/pages/ConfirmEmail.tsx ou ConfirmEmail.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Supabase já lida com o token automaticamente
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (data.session) {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Confirmando seu e-mail...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">❌ Erro: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-green-600 text-xl">✅ E-mail confirmado com sucesso!</p>
        <p className="mt-2">Redirecionando para o login...</p>
      </div>
    </div>
  );
}