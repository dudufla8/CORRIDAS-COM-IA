'use client';

import React, { useState } from 'react';
import { ShieldCheck, User, Lock, KeyRound, Check, LogIn, ArrowRight } from 'lucide-react';
import {
  DespachanteUsuario,
  DESPACHANTES_PREDEFINIDOS,
  autenticarDespachante,
} from '@/lib/auth/despachantes';

interface ModalLoginDespachanteProps {
  aberto: boolean;
  onLoginSucesso: (despachante: DespachanteUsuario) => void;
  onFechar?: () => void;
  bloquearFechamento?: boolean;
}

export const ModalLoginDespachante: React.FC<ModalLoginDespachanteProps> = ({
  aberto,
  onLoginSucesso,
  onFechar,
  bloquearFechamento = false,
}) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = autenticarDespachante(usuario, senha);
      if (res.sucesso && res.despachante) {
        onLoginSucesso(res.despachante);
      } else {
        setErro(res.erro || 'Falha na autenticação.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handlePredefinido = (d: (typeof DESPACHANTES_PREDEFINIDOS)[0]) => {
    setUsuario(d.usuario);
    setSenha(d.senhaHash);
    setErro(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
            Identifique-se para assinar os agendamentos corporativos e telemetria
          </p>
        </div>

        {/* Seleção Rápida de Despachante */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Acesso Rápido de Operadores
          </span>
          <div className="grid grid-cols-2 gap-2">
            {DESPACHANTES_PREDEFINIDOS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handlePredefinido(d)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  usuario === d.usuario
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg ${d.avatarCor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                  {d.nome.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{d.nome.split('(')[0].trim()}</div>
                  <div className="text-[10px] text-slate-500 truncate">{d.cargo.split(' ')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

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
              placeholder="ex: eduardo ou central1"
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Senha de Acesso</span>
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800 transition-all font-medium"
            />
          </div>

          {erro && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {erro}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{carregando ? 'Autenticando...' : 'Entrar na Central Táxi 2.0'}</span>
            </button>
          </div>
        </form>

        {!bloquearFechamento && onFechar && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Continuar como convidado
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
