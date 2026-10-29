'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Edit2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioAutenticado } from './ModalLoginDespachante';

interface UsuarioCompleto {
  id: string;
  nome: string;
  login: string;
  perfil: 'GESTOR' | 'DESPACHANTE' | 'AUDITOR';
  avatarCor: string;
  ativo: boolean;
  criadoEm: string;
  ultimoAcessoEm?: string | null;
}

interface ModalGerenciarUsuariosProps {
  aberto: boolean;
  onFechar: () => void;
  usuarioLogado: UsuarioAutenticado | null;
}

const CORES_AVATAR = [
  { nome: 'Azul', classe: 'bg-blue-600' },
  { nome: 'Esmeralda', classe: 'bg-emerald-600' },
  { nome: 'Âmbar', classe: 'bg-amber-600' },
  { nome: 'Índigo', classe: 'bg-indigo-600' },
  { nome: 'Púrpura', classe: 'bg-purple-600' },
  { nome: 'Rosa', classe: 'bg-rose-600' },
  { nome: 'Ardósia', classe: 'bg-slate-700' },
];

export const ModalGerenciarUsuarios: React.FC<ModalGerenciarUsuariosProps> = ({
  aberto,
  onFechar,
  usuarioLogado,
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<'LISTA' | 'NOVO'>('LISTA');

  // Formulário de Criação
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novoPerfil, setNovoPerfil] = useState<'GESTOR' | 'DESPACHANTE' | 'AUDITOR'>('DESPACHANTE');
  const [novaSenha, setNovaSenha] = useState('');
  const [novaCor, setNovaCor] = useState('bg-blue-600');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Redefinição de Senha
  const [redefinindoId, setRedefinindoId] = useState<string | null>(null);
  const [senhaRedefinir, setSenhaRedefinir] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Edição rápida de Perfil/Nome
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editPerfil, setEditPerfil] = useState<'GESTOR' | 'DESPACHANTE' | 'AUDITOR'>('DESPACHANTE');

  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios || []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Falha ao carregar lista de usuários.');
      }
    } catch {
      toast.error('Erro de conexão ao carregar usuários.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto) {
      carregarUsuarios();
      setErroForm(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (novaSenha.trim().length < 8) {
      setErroForm('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          login: novoLogin.toLowerCase().trim(),
          senha: novaSenha,
          perfil: novoPerfil,
          avatarCor: novaCor,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErroForm(data.error || 'Erro ao cadastrar usuário.');
        toast.error(data.error || 'Erro ao cadastrar.');
        return;
      }

      toast.success(`Usuário ${novoLogin} cadastrado com sucesso!`);
      setNovoNome('');
      setNovoLogin('');
      setNovaSenha('');
      setAba('LISTA');
      carregarUsuarios();
    } catch {
      setErroForm('Falha de conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (u: UsuarioCompleto) => {
    const novoStatus = !u.ativo;
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: novoStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Não foi possível alterar status do usuário.');
        return;
      }

      toast.success(`Usuário ${u.login} ${novoStatus ? 'ativado' : 'desativado'} com sucesso.`);
      carregarUsuarios();
    } catch {
      toast.error('Erro de conexão ao atualizar usuário.');
    }
  };

  const handleSalvarRedefinicaoSenha = async (id: string) => {
    if (senhaRedefinir.trim().length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setSalvandoSenha(true);
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: senhaRedefinir }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Erro ao redefinir senha.');
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      setRedefinindoId(null);
      setSenhaRedefinir('');
    } catch {
      toast.error('Erro ao conectar ao servidor.');
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleSalvarEdicao = async (id: string) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editNome, perfil: editPerfil }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar alterações.');
        return;
      }

      toast.success('Usuário atualizado com sucesso!');
      setEditandoId(null);
      carregarUsuarios();
    } catch {
      toast.error('Erro ao salvar alterações.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                Gestão de Usuários & Operadores
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Controle de acessos, perfis operacionais e permissões da Central Táxi 2.0
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-4">
          <button
            type="button"
            onClick={() => setAba('LISTA')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              aba === 'LISTA'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operadores Cadastrados ({usuarios.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAba('NOVO')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              aba === 'NOVO'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto flex-1">
          {aba === 'LISTA' ? (
            <div className="space-y-3">
              {carregando ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Carregando operadores do banco...</span>
                </div>
              ) : usuarios.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Nenhum operador cadastrado no banco ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {usuarios.map((u) => {
                    const isSelf = usuarioLogado?.id === u.id;
                    const isEditing = editandoId === u.id;
                    const isResetting = redefinindoId === u.id;

                    return (
                      <div key={u.id} className="p-3.5 bg-white hover:bg-slate-50/60 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info do Usuário */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${u.avatarCor || 'bg-slate-700'} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs`}>
                              {u.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editNome}
                                    onChange={(e) => setEditNome(e.target.value)}
                                    className="h-7 px-2 text-xs border rounded-md"
                                  />
                                  <select
                                    value={editPerfil}
                                    onChange={(e) => setEditPerfil(e.target.value as any)}
                                    className="h-7 px-2 text-xs border rounded-md"
                                  >
                                    <option value="GESTOR">GESTOR</option>
                                    <option value="DESPACHANTE">DESPACHANTE</option>
                                    <option value="AUDITOR">AUDITOR</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleSalvarEdicao(u.id)}
                                    className="h-7 px-2 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">{u.nome}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                                      Você
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>@{u.login}</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-700">{u.perfil}</span>
                                <span>•</span>
                                <span className={u.ativo ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                                  {u.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditandoId(null);
                                } else {
                                  setEditandoId(u.id);
                                  setEditNome(u.nome);
                                  setEditPerfil(u.perfil);
                                }
                              }}
                              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isResetting) {
                                  setRedefinindoId(null);
                                } else {
                                  setRedefinindoId(u.id);
                                  setSenhaRedefinir('');
                                }
                              }}
                              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Key className="w-3 h-3 text-slate-400" />
                              <span>Senha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleAtivo(u)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                u.ativo
                                  ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {u.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </div>

                        {/* Sub-painel para Redefinição de Senha */}
                        {isResetting && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="password"
                              value={senhaRedefinir}
                              onChange={(e) => setSenhaRedefinir(e.target.value)}
                              placeholder="Digite a nova senha (mín 8 caracteres)"
                              className="h-8 px-3 text-xs border rounded-md bg-white flex-1 w-full"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                type="button"
                                disabled={salvandoSenha || senhaRedefinir.trim().length < 8}
                                onClick={() => handleSalvarRedefinicaoSenha(u.id)}
                                className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md disabled:opacity-50 cursor-pointer"
                              >
                                {salvandoSenha ? 'Salvando...' : 'Confirmar Nova Senha'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRedefinindoId(null)}
                                className="h-8 px-2.5 border rounded-md text-xs hover:bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Formulário de Criação */
            <form onSubmit={handleCriarUsuario} className="space-y-4 max-w-lg mx-auto">
              {erroForm && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{erroForm}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: Carlos Alberto Santos"
                  className="w-full h-9 px-3 text-xs border rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Usuário / Login (minúsculo)</label>
                  <input
                    type="text"
                    required
                    value={novoLogin}
                    onChange={(e) => setNovoLogin(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="ex: carlos.santos"
                    className="w-full h-9 px-3 text-xs border rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Perfil de Acesso</label>
                  <select
                    value={novoPerfil}
                    onChange={(e) => setNovoPerfil(e.target.value as any)}
                    className="w-full h-9 px-3 text-xs border rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-slate-800"
                  >
                    <option value="DESPACHANTE">DESPACHANTE (Agendamento & Logs)</option>
                    <option value="AUDITOR">AUDITOR (Apenas Visualização & Logs)</option>
                    <option value="GESTOR">GESTOR (Acesso Completo & Usuários)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Senha Inicial (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Defina uma senha com ao menos 8 caracteres"
                  className="w-full h-9 px-3 text-xs border rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cor do Avatar</label>
                <div className="flex items-center gap-2">
                  {CORES_AVATAR.map((c) => (
                    <button
                      key={c.classe}
                      type="button"
                      onClick={() => setNovaCor(c.classe)}
                      className={`w-7 h-7 rounded-lg ${c.classe} transition-transform cursor-pointer ${
                        novaCor === c.classe ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.nome}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAba('LISTA')}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{salvando ? 'Cadastrando...' : 'Cadastrar Usuário'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
