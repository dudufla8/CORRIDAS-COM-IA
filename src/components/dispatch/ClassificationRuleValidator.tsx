'use client';

import React from 'react';
import { ResultadoRuleEngine } from '../../lib/rules/classifier-engine';
import { AlertCircle, CheckCircle2, ShieldCheck, Sparkles, UserCheck, Lock } from 'lucide-react';

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

  const pendencias = resultado.camposPendentesObrigatorios.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Cabeçalho Limpo e Sóbrio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            Regras de Faturamento e Auditoria
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Validação dos campos exigidos para faturamento na central
          </p>
        </div>

        <div>
          {resultado.podeDespachar ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Regras Validadas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {pendencias} {pendencias === 1 ? 'campo obrigatório pendente' : 'campos obrigatórios pendentes'}
            </span>
          )}
        </div>
      </div>

      {/* Grade de Classificadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {camposVisiveis.map((campo) => {
          const isPendente = !campo.valido;
          const valorAtual = valoresManuais[campo.chaveCampo] ?? campo.valor;

          return (
            <div
              key={campo.chaveCampo}
              className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1 truncate">
                  <span>{campo.nomeExibicao}</span>
                  {campo.status === 'PENDENTE_OBRIGATORIO' && (
                    <span className="text-red-500 font-bold">*</span>
                  )}
                </label>

                <div className="flex items-center gap-1">
                  {campo.chaveCampo === 'nomeSolicitante' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Nome Oficial
                    </span>
                  )}
                  {campo.origemPreenchimento === 'IA_EXTRAIDO' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" /> IA
                    </span>
                  )}
                  {campo.origemPreenchimento === 'HERDADO_PERFIL' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                      <UserCheck className="w-2.5 h-2.5" /> Perfil
                    </span>
                  )}
                  {campo.origemPreenchimento === 'VALOR_FIXO' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Fixo
                    </span>
                  )}
                </div>
              </div>

              {campo.opcoesValidas && campo.opcoesValidas.length > 0 ? (
                <select
                  value={valorAtual}
                  onChange={(e) => onAlterarValor(campo.chaveCampo, e.target.value)}
                  className={`w-full h-9 px-3 text-xs rounded-md border font-medium outline-none transition-colors bg-white cursor-pointer ${
                    isPendente
                      ? 'border-red-400 text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-2 focus:ring-slate-100'
                  }`}
                >
                  <option value="">Selecione uma opção...</option>
                  {campo.opcoesValidas.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={valorAtual}
                  placeholder={`Informe ${campo.nomeExibicao.toLowerCase()}...`}
                  onChange={(e) => onAlterarValor(campo.chaveCampo, e.target.value)}
                  className={`w-full h-9 px-3 text-xs rounded-md border font-normal outline-none transition-colors bg-white ${
                    isPendente
                      ? 'border-red-400 text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-2 focus:ring-slate-100'
                  }`}
                />
              )}

              {campo.mensagemErro && (
                <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
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
