import React, { useState } from 'react';
import GerenciarPerfis from './GerenciarPerfis';
import SetoresETipos from './SetoresETipos';
import GerenciarUsuarios from './GerenciarUsuarios';
import GerenciarEmpresas from './GerenciarEmpresas';
import GerenciarBackup from './GerenciarBackup';

const Administracao = ({ userRole }) => {
  const [abaAtiva, setAbaAtiva] = useState('usuarios');

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'usuarios':
        return <GerenciarUsuarios />;
      case 'empresas':
        return <GerenciarEmpresas />;
      case 'setores_tipos':
        return <SetoresETipos />;
      case 'perfis':
        return <GerenciarPerfis />;
      case 'backup':  // ← ADICIONAR ESTE CASE
        return <GerenciarBackup />;
      default:
        return <GerenciarUsuarios />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Administração</h2>
        <p className="text-gray-500 mt-1">Gerencie usuários e dados do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6 overflow-x-auto">
        {[
          { id: 'usuarios', label: 'Usuários' },
          { id: 'empresas', label: 'Empresas' },
          { id: 'setores_tipos', label: 'Setores e Tipos de Problema' },
          { id: 'perfis', label: 'Perfis e Permissões' },
          { id: 'backup', label: 'Backup' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAbaAtiva(tab.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              abaAtiva === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {renderConteudo()}
      </div>
    </div>
  );
};

export default Administracao;