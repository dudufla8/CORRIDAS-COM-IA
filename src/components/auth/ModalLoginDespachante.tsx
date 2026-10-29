'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  login: string;
  perfil: 'GESTOR' | 'DESPACHANTE' | 'AUDITOR';
  avatarCor: string;
}

interface ModalLoginDespachanteProps {
  aberto: boolean;
  onLoginSucesso: (usuario: UsuarioAutenticado) => void;
  onFechar?: () => void;
}

export const ModalLoginDespachante: React.FC<ModalLoginDespachanteProps> = ({
  aberto,
  onLoginSucesso,
  onFechar,
}) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [usuariosRapidos, setUsuariosRapidos] = useState<Array<{ id: string; nome: string; login: string; perfil: string; avatarCor: string }>>([]);
  const senhaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      setErro(null);
      // Carrega os operadores ativos do banco para a barra de acesso rápido
      fetch('/api/auth/usuarios-rapidos')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.usuarios)) {
            setUsuariosRapidos(data.usuarios);
          }
        })
        .catch(() => {});
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: usuario, senha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErro(data.error || 'Falha na autenticação.');
        return;
      }

      if (data.sucesso && data.usuario) {
        onLoginSucesso(data.usuario);
      } else {
        setErro('Resposta inválida do servidor.');
      }
    } catch {
      setErro('Erro de conexão ao autenticar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSelecionarOperadorRapido = (op: { login: string }) => {
    setUsuario(op.login);
    setSenha('');
    setErro(null);
    setTimeout(() => {
      senhaInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header com Identidade Visual */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md border border-amber-400">
            🚕
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Central de Despacho Táxi 2.0
          </h2>
          <p className="text-xs text-slate-500">
            Identifique-se para assinar agendamentos corporativos e telemetria
          </p>
        </div>

        {/* Seleção Rápida de Operadores (carregados do Banco de Dados) */}
        {usuariosRapidos.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Acesso Rápido de Operadores
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {usuariosRapidos.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelecionarOperadorRapido(u)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    usuario.toLowerCase() === u.login.toLowerCase()
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg ${u.avatarCor || 'bg-slate-700'} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{u.nome.split('(')[0].trim()}</div>
                    <div className="text-[10px] text-slate-500 truncate">{u.perfil}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Usuário / Login</span>
            </label>
            <input
              type="text"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ex: eduardo ou despachante1"
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Senha de Acesso</span>
            </label>
            <input
              ref={senhaInputRef}
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha de acesso"
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800 transition-all font-medium"
            />
          </div>

          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando || !usuario.trim() || !senha}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{carregando ? 'Autenticando...' : 'Entrar na Central Táxi 2.0'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
