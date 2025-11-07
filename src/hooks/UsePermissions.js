// src/hooks/usePermissions.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    carregarPermissoes();
  }, []);

  const carregarPermissoes = async () => {
    try {
      // Pegar usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Buscar informações do usuário com perfil e permissões
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          perfis (
            id,
            nome,
            cor
          ),
          permissoes:perfis!inner (
            *
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserInfo(userData);
      setPermissions(userData.permissoes);

    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções auxiliares para verificar permissões específicas
  const pode = {
    // Ocorrências
    acessarOcorrencias: permissions?.pode_acessar_ocorrencias || false,
    criarOcorrencias: permissions?.pode_criar_ocorrencias || false,
    editarOcorrencias: permissions?.pode_editar_ocorrencias || false,
    excluirOcorrencias: permissions?.pode_excluir_ocorrencias || false,
    resolverOcorrencias: permissions?.pode_resolver_ocorrencias || false,
    verTodasOcorrencias: permissions?.pode_ver_todas_ocorrencias || false,

    // Visitas
    acessarVisitas: permissions?.pode_acessar_visitas || false,
    criarVisitas: permissions?.pode_criar_visitas || false,
    editarVisitas: permissions?.pode_editar_visitas || false,
    excluirVisitas: permissions?.pode_excluir_visitas || false,

    // Dashboard
    acessarDashboard: permissions?.pode_acessar_dashboard || false,
    verGraficos: permissions?.pode_ver_graficos || false,
    verRelatorios: permissions?.pode_ver_relatorios || false,
    exportarDados: permissions?.pode_exportar_dados || false,

    // Administração
    acessarAdministracao: permissions?.pode_acessar_administracao || false,
    gerenciarUsuarios: permissions?.pode_gerenciar_usuarios || false,
    gerenciarEmpresas: permissions?.pode_gerenciar_empresas || false,
    gerenciarSetores: permissions?.pode_gerenciar_setores || false,
    gerenciarTiposProblema: permissions?.pode_gerenciar_tipos_problema || false,
    gerenciarPerfis: permissions?.pode_gerenciar_perfis || false,

    // Especiais
    usarOcorrenciasRapidas: permissions?.pode_usar_ocorrencias_rapidas || false,
    anexarImagens: permissions?.pode_anexar_imagens || false,
  };

  return {
    permissions,
    userInfo,
    loading,
    pode,
    recarregar: carregarPermissoes
  };
};

export default usePermissions;