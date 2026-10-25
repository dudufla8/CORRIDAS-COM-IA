'use client';

import React from 'react';
import { ResultadoRuleEngine } from '../../lib/rules/classifier-engine';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, UserCheck, Lock } from 'lucide-react';

interface ClassificationRuleValidatorProps {
  resultado: ResultadoRuleEngine;
  valoresManuais: Record<string, string>;
  onAlterarValor: (campo: string, valor: string) => void;
}

export const ClassificationRuleValidator: React.FC<ClassificationRuleValidatorProps> = ({
  resultado,
  valoresManuais,
  onAlterarValor,
}) => {
  const camposVisiveis = resultado.detalhesCampos.filter(
    (c) => c.nomeExibicao !== `Classificador ${c.numeroCampo}` || c.valor !== ''
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Classificadores Corporativos & Auditoria (1 a 20)
            </h3>
            <p className="text-xs text-slate-500">
              Regras contratuais obrigatórias para faturamento na Táxi Digital
            </p>
          </div>
        </div>

        {resultado.podeDespachar ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Auditado & Aprovado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            {resultado.camposPendentesObrigatorios.length} Pendência(s)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {camposVisiveis.map((campo) => {
          const isPendente = !campo.valido;
          const valorAtual = valoresManuais[campo.chaveCampo] ?? campo.valor;

          return (
            <div
              key={campo.chaveCampo}
              className={`p-3 rounded-xl border transition-all ${
                isPendente
                  ? 'border-rose-300 bg-rose-50/40'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <span>{campo.nomeExibicao}</span>
                  {campo.status === 'PENDENTE_OBRIGATORIO' && (
                    <span className="text-rose-500 text-xs font-bold">*</span>
                  )}
                </label>

                <div className="flex items-center gap-1">
                  {campo.origemPreenchimento === 'IA_EXTRAIDO' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" /> IA
                    </span>
                  )}
                  {campo.origemPreenchimento === 'HERDADO_PERFIL' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                      <UserCheck className="w-2.5 h-2.5" /> Perfil
                    </span>
                  )}
                  {campo.origemPreenchimento === 'VALOR_FIXO' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Fixo
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {campo.chaveCampo}
                  </span>
                </div>
              </div>

              <input
                type="text"
                value={valorAtual}
                placeholder={`Informe ${campo.nomeExibicao.toLowerCase()}...`}
                onChange={(e) => onAlterarValor(campo.chaveCampo, e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-medium outline-none transition-colors ${
                  isPendente
                    ? 'border-rose-400 bg-white text-rose-900 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 bg-white text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                }`}
              />

              {campo.mensagemErro && (
                <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {campo.mensagemErro}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
