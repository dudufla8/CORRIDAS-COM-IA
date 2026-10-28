'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  DollarSign,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { CorridaAoVivo } from '@/lib/taxi-digital/store';

interface PainelStatusAoVivoProps {
  onVoltarDespacho: () => void;
  operadorAtivoNome?: string;
}

export const PainelStatusAoVivo: React.FC<PainelStatusAoVivoProps> = ({
  onVoltarDespacho,
  operadorAtivoNome,
}) => {
  const [corridas, setCorridas] = useState<CorridaAoVivo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [corridaSelecionada, setCorridaSelecionada] = useState<CorridaAoVivo | null>(null);
  const [simulandoId, setSimulandoId] = useState<string | null>(null);

  const carregarCorridas = async () => {
    try {
      setCarregando(true);
      const res = await fetch('/api/dispatch/history');
      if (res.ok) {
        const data = await res.json();
        setCorridas(data.corridas || []);
      }
    } catch (err) {
      console.error('Erro ao carregar status ao vivo:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarCorridas();
    const interval = setInterval(carregarCorridas, 6000); // Polling a cada 6 segundos
    return () => clearInterval(interval);
  }, []);

  const handleSimularWebhook = async (corrida: CorridaAoVivo, proximoStatus: string) => {
    setSimulandoId(corrida.id);
    try {
      let motorista = corrida.motoristaNome;
      let placa = corrida.veiculoPlaca;
      let valorFinal = corrida.valorFinal;

      if (proximoStatus === 'MOTORISTA_A_CAMINHO') {
        motorista = motorista || 'José Carlos Alcantara (Táxi 2.0)';
        placa = placa || 'BRA-2E19';
      } else if (proximoStatus === 'CONCLUIDA') {
        valorFinal = corrida.valorEstimado ? corrida.valorEstimado * 0.98 : 74.5;
      }

      await fetch('/api/dispatch/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simularWebhook: true,
          bookingId: corrida.bookingId,
          voucher: corrida.voucher,
          status: proximoStatus,
          motoristaNome: motorista,
          motoristaTelefone: '(13) 99182-3344',
          veiculoPlaca: placa,
          veiculoModelo: 'Chevrolet Spin 7 Lugares',
          valorFinal: valorFinal,
        }),
      });

      await carregarCorridas();
    } finally {
      setSimulandoId(null);
    }
  };

  // Contadores
  const total = corridas.length;
  const emAndamento = corridas.filter((c) => c.status === 'EM_ANDAMENTO' || c.status === 'MOTORISTA_A_CAMINHO').length;
  const agendadas = corridas.filter((c) => c.status === 'AGENDADA').length;
  const concluidas = corridas.filter((c) => c.status === 'CONCLUIDA').length;
  const faturamentoTotal = corridas.reduce((acc, c) => acc + (c.valorFinal || c.valorEstimado || 0), 0);

  const filtradas = corridas.filter((c) => {
    if (filtroStatus !== 'TODOS' && c.status !== filtroStatus) return false;
    if (!filtroTexto.trim()) return true;
    const t = filtroTexto.toLowerCase();
    return (
      c.passageiroNome.toLowerCase().includes(t) ||
      c.voucher.toLowerCase().includes(t) ||
      c.bookingId.toLowerCase().includes(t) ||
      c.contratoNome.toLowerCase().includes(t) ||
      (c.motoristaNome && c.motoristaNome.toLowerCase().includes(t)) ||
      (c.veiculoPlaca && c.veiculoPlaca.toLowerCase().includes(t)) ||
      c.operador.toLowerCase().includes(t)
    );
  });

  const getBadgeStatus = (status: CorridaAoVivo['status']) => {
    switch (status) {
      case 'MOTORISTA_A_CAMINHO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
            <Radio className="w-3 h-3 text-amber-600" />
            Motorista a Caminho
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Em Andamento
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Concluída
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Agendada na Frota
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Painel de Status ao Vivo & Telemetria Webhook
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recepção em tempo real de status da Táxi Digital (motorista, placa e fechamento financeiro)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={carregarCorridas}
            disabled={carregando}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Atualizar lista agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${carregando ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={onVoltarDespacho}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>+ Novo Despacho</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Despachadas</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{total}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Histórico da central</span>
        </div>

        <div className="bg-white rounded-xl border border-amber-200/80 p-4 shadow-xs bg-amber-50/20">
          <span className="text-[11px] font-semibold text-amber-700 uppercase block flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
            Em Trânsito / A Caminho
          </span>
          <div className="text-2xl font-black text-amber-950 mt-1">{emAndamento}</div>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Atendimento ativo</span>
        </div>

        <div className="bg-white rounded-xl border border-blue-200/80 p-4 shadow-xs bg-blue-50/20">
          <span className="text-[11px] font-semibold text-blue-700 uppercase block flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            Agendadas
          </span>
          <div className="text-2xl font-black text-blue-950 mt-1">{agendadas}</div>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Aguardando horário</span>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200/80 p-4 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase block flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            Faturamento Previsto/Real
          </span>
          <div className="text-2xl font-black text-emerald-950 mt-1">R$ {faturamentoTotal.toFixed(2)}</div>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">{concluidas} corridas concluídas</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por passageiro, voucher, placa, motorista..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['TODOS', 'AGENDADA', 'MOTORISTA_A_CAMINHO', 'EM_ANDAMENTO', 'CONCLUIDA'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                filtroStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'TODOS'
                ? 'Todos'
                : st === 'AGENDADA'
                ? 'Agendadas'
                : st === 'MOTORISTA_A_CAMINHO'
                ? 'A Caminho'
                : st === 'EM_ANDAMENTO'
                ? 'Em Andamento'
                : 'Concluídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Corridas ao Vivo */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Activity className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma corrida encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Assim que os agendamentos forem realizados ou notificações de webhook chegarem da Táxi Digital, o feed será atualizado automaticamente aqui.
          </p>
          <button
            type="button"
            onClick={onVoltarDespacho}
            className="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            Realizar Novo Despacho
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all shadow-xs space-y-3"
            >
              {/* Linha 1: Contrato, Voucher, Status e Ações */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold text-xs border border-blue-200">
                    {c.contratoNome.split('(')[0].trim()}
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {c.voucher}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {c.bookingId}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {getBadgeStatus(c.status)}

                  {/* Simulador rápido de Webhook para testes */}
                  <div className="flex items-center gap-1">
                    {c.status === 'AGENDADA' && (
                      <button
                        type="button"
                        disabled={simulandoId === c.id}
                        onClick={() => handleSimularWebhook(c, 'MOTORISTA_A_CAMINHO')}
                        className="text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded cursor-pointer"
                        title="Simular Webhook: Motorista aceitou a corrida"
                      >
                        ⚡ Simular Aceite
                      </button>
                    )}
                    {c.status === 'MOTORISTA_A_CAMINHO' && (
                      <button
                        type="button"
                        disabled={simulandoId === c.id}
                        onClick={() => handleSimularWebhook(c, 'EM_ANDAMENTO')}
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded cursor-pointer"
                        title="Simular Webhook: Passageiro embarcou"
                      >
                        ⚡ Simular Embarque
                      </button>
                    )}
                    {c.status === 'EM_ANDAMENTO' && (
                      <button
                        type="button"
                        disabled={simulandoId === c.id}
                        onClick={() => handleSimularWebhook(c, 'CONCLUIDA')}
                        className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded cursor-pointer"
                        title="Simular Webhook: Corrida finalizada com valor final"
                      >
                        ⚡ Simular Conclusão
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Linha 2: Dados da Viagem e Motorista */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                {/* Passageiro e Rota (6 cols) */}
                <div className="md:col-span-6 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.passageiroNome}</span>
                    {c.passageiroTelefone && (
                      <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.passageiroTelefone}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                      <span className="truncate">
                        <strong className="text-slate-800">Origem:</strong> {c.origem}
                      </span>
                    </div>
                    {c.destino && (
                      <div className="flex items-start gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                        <span className="truncate">
                          <strong className="text-slate-800">Destino:</strong> {c.destino}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Motorista e Veículo (4 cols) */}
                <div className="md:col-span-4 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Frota / Veículo</span>
                  {c.motoristaNome || c.veiculoPlaca ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{c.motoristaNome || 'Motorista Táxi 2.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.veiculoPlaca && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px] border border-slate-700 tracking-wider">
                            {c.veiculoPlaca}
                          </span>
                        )}
                        {c.veiculoModelo && (
                          <span className="text-slate-500 text-[11px] truncate">
                            {c.veiculoModelo}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic flex items-center gap-1 py-1">
                      <Clock className="w-3 h-3" />
                      Aguardando atribuição de motorista pela central
                    </div>
                  )}
                </div>

                {/* Faturamento e Operador (2 cols) */}
                <div className="md:col-span-2 text-right space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {c.valorFinal ? 'Valor Faturado' : 'Tarifa Prevista'}
                    </span>
                    <span className="text-base font-black text-slate-900">
                      R$ {(c.valorFinal || c.valorEstimado || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate">
                    Despachante: <strong className="text-slate-600">{c.operador}</strong>
                  </div>
                </div>
              </div>

              {/* Linha 3: Horário agendado & Detalhes */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span>
                    📅 Corrida para: <strong className="text-slate-700">{c.data} às {c.hora}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    🕒 Criado em: {new Date(c.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCorridaSelecionada(c)}
                  className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Linha do Tempo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes e Linha do Tempo da Corrida */}
      {corridaSelecionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Linha do Tempo do Chamado</h3>
                <p className="text-xs text-slate-500">Voucher: {corridaSelecionada.voucher} • ID: {corridaSelecionada.bookingId}</p>
              </div>
              <button
                type="button"
                onClick={() => setCorridaSelecionada(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {corridaSelecionada.eventos && corridaSelecionada.eventos.length > 0 ? (
                corridaSelecionada.eventos.map((ev, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      {idx < corridaSelecionada.eventos.length - 1 && (
                        <span className="w-0.5 h-full bg-slate-200 my-1"></span>
                      )}
                    </div>
                    <div className="pb-3">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(ev.timestamp).toLocaleString('pt-BR')}
                      </span>
                      <strong className="text-slate-800 block mt-0.5">{ev.status}</strong>
                      <p className="text-slate-600 mt-0.5">{ev.descricao}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">Sem eventos adicionais registrados.</div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCorridaSelecionada(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
