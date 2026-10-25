'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  ClipboardPaste,
  Sparkles,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  FileText,
  Send,
  Loader2,
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  Trash2,
} from 'lucide-react';
import { RideExtractionData } from '../../lib/ai/schema';
import { AiDispatchExtractorService } from '../../lib/ai/extractor';
import { ClassifierRuleEngine, RegraClassificadorItem, ResultadoRuleEngine } from '../../lib/rules/classifier-engine';
import { TaxiDigitalApiClient } from '../../lib/taxi-digital/client';
import { ClassificationRuleValidator } from './ClassificationRuleValidator';

export interface ContratoCorporativo {
  id: string;
  nomeExibicao: string;
  uiCliente: string;
  palavrasChave: string[];
  regras: RegraClassificadorItem[];
}

export const CONTRATOS_DISPONIVEIS: ContratoCorporativo[] = [
  {
    id: 'unipar-camacari',
    nomeExibicao: 'Unipar Carbocloro - Filial Camaçari / BA',
    uiCliente: 'UNIPAR_CAMACARI_01',
    palavrasChave: ['unipar', 'carbocloro', 'camaçari', 'camacari', 'bahia', 'ba'],
    regras: [
      {
        numeroCampo: 1,
        nomeExibicao: 'Código do Agendamento / OS',
        descricaoAjuda: 'Código da ordem no formato #UNIPAR-M18368822',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
        regexPadrao: '^#?[A-Z0-9]+-[A-Z0-9]+$',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Centro de Custo / Área',
        descricaoAjuda: 'Centro contábil responsável pelo faturamento',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Projeto / Subprojeto',
        descricaoAjuda: 'Nome da planta ou projeto corporativo',
        obrigatorio: false,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 4,
        nomeExibicao: 'Filial de Faturamento',
        descricaoAjuda: 'Unidade operacional fixa',
        obrigatorio: true,
        tipoPreenchimento: 'VALOR_FIXO_CONTRATO',
        valorFixo: 'UNIPAR CAMAÇARI / BA',
      },
      {
        numeroCampo: 5,
        nomeExibicao: 'Matrícula do Aprovador',
        descricaoAjuda: 'Herdada do cadastro do passageiro',
        obrigatorio: false,
        tipoPreenchimento: 'HERDADO_AUTORIZADO',
      },
    ],
  },
  {
    id: 'unipar-cubatao',
    nomeExibicao: 'Unipar Carbocloro - Filial Cubatão / SP',
    uiCliente: 'UNIPAR_SP_01',
    palavrasChave: ['cubatão', 'cubatao', 'são paulo', 'sp', 'santo andré', 'capuava'],
    regras: [
      {
        numeroCampo: 1,
        nomeExibicao: 'Código da Ordem de Serviço (OS)',
        descricaoAjuda: 'Código identificador no formato #UNIPAR-M2026',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
        regexPadrao: '^#?[A-Z0-9]+-[A-Z0-9]+$',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Centro de Custo',
        descricaoAjuda: 'Centro contábil responsável pelo faturamento',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Projeto / Planta',
        descricaoAjuda: 'Nome da planta ou projeto corporativo',
        obrigatorio: false,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 4,
        nomeExibicao: 'Filial de Origem',
        descricaoAjuda: 'Unidade operacional fixa',
        obrigatorio: true,
        tipoPreenchimento: 'VALOR_FIXO_CONTRATO',
        valorFixo: 'UNIPAR CUBATÃO / SP',
      },
    ],
  },
  {
    id: 'padrao-b2b',
    nomeExibicao: 'Contrato Padrão B2B (Táxi 2.0)',
    uiCliente: 'CLIENTE_PADRAO_01',
    palavrasChave: [],
    regras: [
      {
        numeroCampo: 1,
        nomeExibicao: 'Código do Chamado / OS',
        descricaoAjuda: 'Número identificador do agendamento',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Centro de Custo',
        descricaoAjuda: 'Centro contábil',
        obrigatorio: false,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Motivo da Viagem',
        descricaoAjuda: 'Finalidade da corrida',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
    ],
  },
];

export const AiDispatchHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRINT' | 'TEXTO'>('PRINT');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // CONTRATOS DINÂMICOS
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState<string>('unipar-camacari');
  const [contratoAutoDetectado, setContratoAutoDetectado] = useState(false);

  const [extractedData, setExtractedData] = useState<RideExtractionData | null>(null);
  const [formPassageiro, setFormPassageiro] = useState({ nome: '', telefone: '', identificador: '' });
  const [formViagem, setFormViagem] = useState({ data: '', hora: '', tipo: 'AGENDADO' as 'AGENDADO' | 'IMEDIATO' });
  const [formOrigem, setFormOrigem] = useState('');
  const [formDestino, setFormDestino] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');

  const [valoresManuais, setValoresManuais] = useState<Record<string, string>>({});
  const [dadosAutorizado, setDadosAutorizado] = useState<any>(null);
  const [verificandoAutorizado, setVerificandoAutorizado] = useState(false);

  const [estimativa, setEstimativa] = useState<{ km: number; minutos: number; valor: number } | null>(null);
  const [calculandoEstimativa, setCalculandoEstimativa] = useState(false);
  const [despachando, setDespachando] = useState(false);
  const [resultadoDespacho, setResultadoDespacho] = useState<{ bookingId: string; voucher: string; status: string } | null>(null);

  const extractorRef = useRef(new AiDispatchExtractorService());
  const taxiClientRef = useRef(new TaxiDigitalApiClient());

  const contratoAtual = CONTRATOS_DISPONIVEIS.find((c) => c.id === contratoSelecionadoId) || CONTRATOS_DISPONIVEIS[0];

  const resultadoRules: ResultadoRuleEngine = ClassifierRuleEngine.executar(
    contratoAtual.regras,
    extractedData || undefined,
    dadosAutorizado,
    valoresManuais
  );

  // LISTENER DE CTRL+V (PASTE CLIPBOARD) - APENAS CARREGA A IMAGEM, SEM GASTAR TOKEN AUTOMÁTICO
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              setImagePreview(base64);
              setActiveTab('PRINT');
              // Usuário escolhe quando clicar no botão "Analisar com IA"
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processarExtracaoImagem = async (base64: string) => {
    setIsProcessingAi(true);
    setResultadoDespacho(null);
    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'IMAGEM_BASE64',
          conteudo: base64,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Erro HTTP ${response.status}`);
      }

      const dados: RideExtractionData = await response.json();
      aplicarDadosExtraidos(dados);
    } catch (err: any) {
      console.error('Erro na extração de imagem:', err);
      alert('Aviso da IA: ' + (err.message || 'Falha ao processar o print. Verifique a chave GEMINI_API_KEY.'));
    } finally {
      setIsProcessingAi(false);
    }
  };

  const processarExtracaoTexto = async () => {
    if (!textInput.trim()) return;
    setIsProcessingAi(true);
    setResultadoDespacho(null);
    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'TEXTO_LIVRE',
          conteudo: textInput,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Erro HTTP ${response.status}`);
      }

      const dados: RideExtractionData = await response.json();
      aplicarDadosExtraidos(dados);
    } catch (err: any) {
      console.error('Erro na extração de texto:', err);
      alert('Aviso da IA: ' + (err.message || 'Falha ao processar o texto.'));
    } finally {
      setIsProcessingAi(false);
    }
  };

  const aplicarDadosExtraidos = (dados: RideExtractionData) => {
    setExtractedData(dados);
    setFormPassageiro({
      nome: dados.passageiro.nome,
      telefone: dados.passageiro.telefone || '',
      identificador: dados.passageiro.identificador || '',
    });
    setFormViagem({
      data: dados.agendamento.dataAgendamento,
      hora: dados.agendamento.horaAgendamento,
      tipo: dados.agendamento.tipoAgendamento,
    });
    setFormOrigem(dados.origem.enderecoCompleto);
    setFormDestino(dados.destino?.enderecoCompleto || '');
    setFormObservacoes(dados.observacoesOperacionais || '');

    // Auto-detecção inteligente do contrato da empresa
    const textoBusca = `${dados.empresaIdentificada || ''} ${dados.origem?.enderecoCompleto || ''} ${dados.destino?.enderecoCompleto || ''} ${dados.classificadores?.codigoOsChamado || ''}`.toLowerCase();
    
    const contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) =>
      c.palavrasChave.some((kw) => textoBusca.includes(kw.toLowerCase()))
    );

    if (contratoDetectado) {
      setContratoSelecionadoId(contratoDetectado.id);
      setContratoAutoDetectado(true);
    }

    consultarAutorizado(dados.passageiro.identificador || dados.passageiro.nome);
    calcularEstimativaRota(dados.origem.enderecoCompleto, dados.destino?.enderecoCompleto);
  };

  const consultarAutorizado = async (identificador: string) => {
    if (!identificador) return;
    setVerificandoAutorizado(true);
    try {
      const res = await taxiClientRef.current.checkAuthorized({
        unique_field: identificador,
        nome: formPassageiro.nome,
      });
      if (res.status && res.authorized) {
        setDadosAutorizado(res.authorized);
      }
    } catch (err) {
      console.error('Erro ao consultar autorizado:', err);
    } finally {
      setVerificandoAutorizado(false);
    }
  };

  const calcularEstimativaRota = async (origemCustom?: string, destinoCustom?: string) => {
    const endOrigem = origemCustom || formOrigem;
    const endDestino = destinoCustom || formDestino;
    if (!endOrigem) return;

    setCalculandoEstimativa(true);
    try {
      const res = await taxiClientRef.current.estimateBooking({
        origem: {
          endereco: endOrigem,
          latitude: -25.501,
          longitude: -49.201,
        },
        destino: {
          endereco: endDestino || 'Centro',
          latitude: -23.654,
          longitude: -46.531,
        },
      });
      if (res.status) {
        setEstimativa({
          km: res.distancia_km,
          minutos: res.tempo_estimado_minutos,
          valor: res.valor_estimado,
        });
      }
    } catch (err) {
      console.error('Erro ao calcular estimativa:', err);
    } finally {
      setCalculandoEstimativa(false);
    }
  };

  const handleDespacharCorrida = async () => {
    if (!resultadoRules.podeDespachar) {
      alert('Atenção: Existem classificadores contratuais obrigatórios pendentes!');
      return;
    }

    setDespachando(true);
    try {
      const res = await taxiClientRef.current.createBooking({
        authorized_id: dadosAutorizado?.id || 'AUTH-9921',
        passageiro_nome: formPassageiro.nome,
        passageiro_telefone: formPassageiro.telefone,
        imediata: formViagem.tipo === 'IMEDIATO',
        data_hora_agendamento: `${formViagem.data} ${formViagem.hora}:00`,
        origem: { endereco: formOrigem, latitude: -25.501, longitude: -49.201 },
        destino: formDestino ? { endereco: formDestino, latitude: -23.654, longitude: -46.531 } : undefined,
        tipo_pagamento: 'VOUCHER_DIGITAL',
        classificadores: resultadoRules.classificadoresProntos,
        observacoes: formObservacoes,
        referencia_externa: `PORTAL-${Date.now()}`,
      });

      if (res.status) {
        setResultadoDespacho({
          bookingId: String(res.booking_id),
          voucher: res.voucher_codigo || 'VCH-AUTO',
          status: res.status_corrida || 'AGENDADA',
        });
      }
    } catch (err) {
      console.error('Falha no despacho:', err);
      alert('Erro ao despachar corrida para a API Táxi Digital.');
    } finally {
      setDespachando(false);
    }
  };

  const carregarExemploDemonstracao = () => {
    const textoDemo = 'Agendar uma corrida amanhã às 07:30 para o Fábio Martins da Unipar saindo da Av. das Torres 2184 para a fábrica em Santo André, CC Manutenção 2026, OS #UNIPAR-M2026.';
    setTextInput(textoDemo);
    setActiveTab('TEXTO');
    fetch('/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'TEXTO_LIVRE', conteudo: textoDemo }),
    })
      .then((res) => res.json())
      .then(aplicarDadosExtraidos)
      .catch((err) => console.error(err));
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 font-sans text-slate-800">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-[#101726] p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25">
            <Car className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                Táxi 2.0 B2B
              </span>
              <span className="text-xs text-slate-400">APITD v3 Integrada</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
              Hub de Despacho Inteligente Multimodal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={carregarExemploDemonstracao}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            Carregar Exemplo de Teste
          </button>
        </div>
      </header>

      {resultadoDespacho && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900 border-2 border-emerald-500/50 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-extrabold">
                Despacho Transmitido com Sucesso para Táxi Digital
              </div>
              <div className="text-lg font-black text-white">
                Booking ID: {resultadoDespacho.bookingId} • Voucher: {resultadoDespacho.voucher}
              </div>
              <div className="text-xs text-emerald-200/80">
                Status: {resultadoDespacho.status} • O chamado foi inserido no sistema da Táxi Digital.
              </div>
            </div>
          </div>
          <button
            onClick={() => setResultadoDespacho(null)}
            className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl"
          >
            Novo Despacho
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveTab('PRINT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'PRINT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-500" />
                  Print / Imagem (Ctrl+V)
                </button>
                <button
                  onClick={() => setActiveTab('TEXTO')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'TEXTO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  Texto Livre
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> IA Multimodal
              </span>
            </div>

            {activeTab === 'PRINT' && (
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="space-y-3 p-4 rounded-2xl border-2 border-amber-400 bg-amber-50/20 text-center">
                    <div className="max-h-60 overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Screenshot capturado" className="w-full max-h-60 object-contain mx-auto" />
                    </div>

                    <div className="text-xs font-bold text-amber-900 bg-amber-100/70 py-1.5 px-3 rounded-lg border border-amber-200/80">
                      📸 Print capturado com sucesso!
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingAi}
                        onClick={() => processarExtracaoImagem(imagePreview)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessingAi ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            Lendo print com Gemini Pro (OCR)...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
                            ✨ Analisar Imagem com Gemini Pro
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingAi}
                        onClick={() => {
                          setImagePreview(null);
                          setExtractedData(null);
                        }}
                        className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover imagem / Trocar print
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed rounded-2xl p-8 text-center border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/10 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-3 py-2 pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center shadow-sm">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Cole seu print diretamente aqui (<span className="text-amber-600 font-mono">Ctrl+V</span>)
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          ou clique aqui para selecionar um arquivo de imagem
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'TEXTO' && (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Cole ou digite a solicitação de corrida em linguagem natural..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-amber-500 outline-none resize-none"
                />
                <button
                  disabled={isProcessingAi || !textInput.trim()}
                  onClick={processarExtracaoTexto}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                >
                  {isProcessingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Processar Texto com IA
                    </>
                  )}
                </button>
              </div>
            )}

            {extractedData && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confiança da IA
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                    {Math.round(extractedData.scoreConfianca * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-500" />
                Estimativa e Viabilidade (Táxi Digital)
              </h3>
              <button
                onClick={() => calcularEstimativaRota()}
                disabled={calculandoEstimativa}
                className="text-xs font-semibold text-slate-500 hover:text-amber-600 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${calculandoEstimativa ? 'animate-spin' : ''}`} />
                Recalcular
              </button>
            </div>

            {estimativa ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Distância</div>
                  <div className="text-sm font-black text-slate-800">{estimativa.km} km</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Tempo</div>
                  <div className="text-sm font-black text-slate-800">{estimativa.minutos} min</div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Estimado</div>
                  <div className="text-sm font-black text-amber-700">R$ {estimativa.valor.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Defina origem e destino para cotação.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Validador Operacional</h2>
                <p className="text-xs text-slate-500">Conferência dos dados antes da transmissão à frota</p>
              </div>

              {dadosAutorizado && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Autorizado: ATIVO (24)
                </span>
              )}
            </div>

            {/* SELETOR DE CONTRATO B2B E CLASSIFICADORES */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Contrato Corporativo Selecionado
                </label>
                {contratoAutoDetectado ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-identificado pela IA
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">
                    ID Táxi Digital: <span className="font-mono text-slate-600 font-bold">{contratoAtual.uiCliente}</span>
                  </span>
                )}
              </div>
              <select
                value={contratoSelecionadoId}
                onChange={(e) => {
                  setContratoSelecionadoId(e.target.value);
                  setContratoAutoDetectado(false);
                }}
                className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none shadow-sm cursor-pointer"
              >
                {CONTRATOS_DISPONIVEIS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeExibicao} — ({c.regras.length} classificadores configurados)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                Os classificadores 1 a 20 abaixo carregam os nomes e regras específicas deste contrato.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Dados do Passageiro
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-medium text-slate-600">Nome Completo</label>
                  <input
                    type="text"
                    value={formPassageiro.nome}
                    placeholder="Nome do colaborador"
                    onChange={(e) => setFormPassageiro({ ...formPassageiro, nome: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formPassageiro.telefone}
                    placeholder="(00) 00000-0000"
                    onChange={(e) => setFormPassageiro({ ...formPassageiro, telefone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Data e Horário
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Tipo de Chamada</label>
                  <select
                    value={formViagem.tipo}
                    onChange={(e) => setFormViagem({ ...formViagem, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="AGENDADO">Agendada (Futura)</option>
                    <option value="IMEDIATO">Imediata (Agora)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Data</label>
                  <input
                    type="date"
                    value={formViagem.data}
                    onChange={(e) => setFormViagem({ ...formViagem, data: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Horário</label>
                  <input
                    type="time"
                    value={formViagem.hora}
                    onChange={(e) => setFormViagem({ ...formViagem, hora: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Trajeto
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Origem (Embarque)</label>
                  <input
                    type="text"
                    value={formOrigem}
                    placeholder="Endereço de partida"
                    onChange={(e) => setFormOrigem(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Destino (Desembarque)</label>
                  <input
                    type="text"
                    value={formDestino}
                    placeholder="Endereço de destino"
                    onChange={(e) => setFormDestino(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>
            </div>

            <ClassificationRuleValidator
              resultado={resultadoRules}
              valoresManuais={valoresManuais}
              onAlterarValor={(campo, valor) =>
                setValoresManuais((prev) => ({ ...prev, [campo]: valor }))
              }
            />

            <div className="pt-2">
              <button
                disabled={despachando || !formPassageiro.nome || !formOrigem}
                onClick={handleDespacharCorrida}
                className={`w-full py-4 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-3 transition-all shadow-lg ${
                  resultadoRules.podeDespachar
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-[#FF8A00] text-slate-950 hover:brightness-105 shadow-amber-500/25'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {despachando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transmitindo para Táxi Digital...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {resultadoRules.podeDespachar
                      ? 'Despachar Corrida para Táxi Digital'
                      : `Bloqueado: Preencha os ${resultadoRules.camposPendentesObrigatorios.length} classificadores pendentes`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
