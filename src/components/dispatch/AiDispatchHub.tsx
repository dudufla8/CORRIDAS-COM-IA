'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Sparkles,
  Car,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Loader2,
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  Camera,
  RotateCcw,
  AlertCircle,
  MapPin,
  Check,
} from 'lucide-react';
import { RideExtractionData } from '../../lib/ai/schema';
import { ClassifierRuleEngine, RegraClassificadorItem, ResultadoRuleEngine } from '../../lib/rules/classifier-engine';
import { TaxiDigitalApiClient } from '../../lib/taxi-digital/client';
import { ClassificationRuleValidator } from './ClassificationRuleValidator';

export interface CategoriaTaxiDigital {
  id: string;
  nome: string;
  valor: number;
  distanciaKm: number;
  tempoMinutos: number;
  precoFixo: boolean;
  capacidade?: number;
}

export interface ContratoCorporativo {
  id: string;
  nomeExibicao: string;
  uiCliente: string;
  palavrasChave: string[];
  regras: RegraClassificadorItem[];
}

export const CONTRATOS_DISPONIVEIS: ContratoCorporativo[] = [
  {
    id: 'unipar-voll',
    nomeExibicao: 'UNIPAR VOLL (Plataforma Voll)',
    uiCliente: '084dbe67-d889-49a6-af3e-8609d9122e23',
    palavrasChave: ['unipar voll', 'unipar carbocloro voll', 'unipar-m', 'camaçari'],
    regras: [
      {
        numeroCampo: 0,
        nomeExibicao: 'Nome do Passageiro',
        descricaoAjuda: 'Nome completo do colaborador',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
      {
        numeroCampo: 1,
        nomeExibicao: 'Login',
        descricaoAjuda: 'Login ou identificador do usuário no sistema',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Telefone Passageiro',
        descricaoAjuda: 'Telefone com DDD',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Centro de Custo',
        descricaoAjuda: 'Centro contábil Unipar',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
    ],
  },
  {
    id: 'unipar-direto',
    nomeExibicao: 'UNIPAR (Corporativo Direto)',
    uiCliente: '4b5461d2-2dc4-4402-80a2-4ecbf97de9d7',
    palavrasChave: ['unipar direto', 'unipar carbocloro', 'cubatão', 'santo andré', 'ucbr'],
    regras: [
      {
        numeroCampo: 0,
        nomeExibicao: 'Nome (Colaborador / Solicitante)',
        descricaoAjuda: 'Nome completo do solicitante ou passageiro',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
      {
        numeroCampo: 1,
        nomeExibicao: 'Empresa',
        descricaoAjuda: 'Unidade operacional Unipar',
        obrigatorio: false,
        tipoPreenchimento: 'LISTA_SUSPENSA',
        opcoesValidas: ['UCBR - FC Cubatão', 'UCBR - SP Matriz', 'UNIPAR'],
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Centro de Custo',
        descricaoAjuda: 'Centro contábil da Unipar',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Matrícula',
        descricaoAjuda: 'Matrícula funcional',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 5,
        nomeExibicao: 'Gestor',
        descricaoAjuda: 'Nome do gestor imediato',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
      {
        numeroCampo: 6,
        nomeExibicao: 'Justificativa',
        descricaoAjuda: 'Motivo da viagem corporativa',
        obrigatorio: true,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
      {
        numeroCampo: 7,
        nomeExibicao: 'Observação',
        descricaoAjuda: 'Observações operacionais para o motorista',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
    ],
  },
  {
    id: 'claro-voll',
    nomeExibicao: 'CLARO VOLL (Plataforma Voll)',
    uiCliente: '94961e94-143a-49b8-a314-6db0bcb7a48d',
    palavrasChave: ['claro voll', 'claro', 'embratel', 'net claro', 'claro brasil', 'brasilcenter', '#claro'],
    regras: [
      {
        numeroCampo: 0,
        nomeExibicao: 'Nome (Solicitante / Passageiro)',
        descricaoAjuda: 'Nome oficial do colaborador',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
      {
        numeroCampo: 1,
        nomeExibicao: 'Voucher',
        descricaoAjuda: 'Código da reserva ou voucher (ex: #CLARO-M18456160)',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
        regexPadrao: '^#?[A-Z0-9]+-[A-Z0-9]+$',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Empresa',
        descricaoAjuda: 'Empresa autorizada',
        obrigatorio: true,
        tipoPreenchimento: 'LISTA_SUSPENSA',
        opcoesValidas: ['TÁXI 2.0', 'CLARO - BRASILCENTER', 'CLARO'],
        valorFixo: 'TÁXI 2.0',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Informações - Contatos',
        descricaoAjuda: 'Telefone ou ramal de contato',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
    ],
  },
  {
    id: 'voll-geral',
    nomeExibicao: 'VOLL (Corporativo Geral)',
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    palavrasChave: ['voll', 'itau', 'itaú', 'itau unibanco', 'itau-m', '#itau', 'reserva voll', 'app voll', 'agendamento voll'],
    regras: [
      {
        numeroCampo: 0,
        nomeExibicao: 'Nome (Solicitante / Passageiro)',
        descricaoAjuda: 'Nome oficial do colaborador',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
      {
        numeroCampo: 1,
        nomeExibicao: 'Voucher Voll',
        descricaoAjuda: 'Identificador do agendamento Voll (ex: #ITAU-M18383400)',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
        regexPadrao: '^#?[A-Z0-9]+-[A-Z0-9]+$',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Empresa',
        descricaoAjuda: 'Empresa solicitante',
        obrigatorio: false,
        tipoPreenchimento: 'LISTA_SUSPENSA',
        opcoesValidas: ['ITAU', 'VOLL', 'TAXI 2.0'],
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Código de Acesso',
        descricaoAjuda: 'Código classificador na central (ex: itau-0002, itau-0001, voll-004)',
        obrigatorio: true,
        tipoPreenchimento: 'LISTA_SUSPENSA',
        opcoesValidas: ['itau-0002', 'itau-0001', 'voll-004', 'tx20-001'],
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
        numeroCampo: 0,
        nomeExibicao: 'Nome',
        descricaoAjuda: 'Nome do solicitante',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
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
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState<string>('claro-voll');
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
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaTaxiDigital[]>([]);
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<string>('');
  const [calculandoEstimativa, setCalculandoEstimativa] = useState(false);
  const [erroEstimativa, setErroEstimativa] = useState<string | null>(null);
  const [despachando, setDespachando] = useState(false);
  const [resultadoDespacho, setResultadoDespacho] = useState<{ bookingId: string; voucher: string; status: string } | null>(null);

  const taxiClientRef = useRef(new TaxiDigitalApiClient());

  const contratoAtual = CONTRATOS_DISPONIVEIS.find((c) => c.id === contratoSelecionadoId) || CONTRATOS_DISPONIVEIS[0];

  const resultadoRules: ResultadoRuleEngine = ClassifierRuleEngine.executar(
    contratoAtual.regras,
    extractedData || undefined,
    dadosAutorizado,
    valoresManuais
  );

  // LISTENER DE CTRL+V (PASTE CLIPBOARD)
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

  // Otimização e compressão de print para envio ultra-rápido à IA (reduz de 5MB para ~150KB)
  const otimizarPrintBase64 = (base64: string, maxDim = 1400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && base64.length < 400000) {
          resolve(base64);
          return;
        }
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const processarExtracaoImagem = async (base64: string) => {
    setIsProcessingAi(true);
    setResultadoDespacho(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const base64Otimizado = await otimizarPrintBase64(base64);
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'IMAGEM_BASE64',
          conteudo: base64Otimizado,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Erro HTTP ${response.status}`);
      }

      const dados: RideExtractionData = await response.json();
      aplicarDadosExtraidos(dados);
    } catch (err: any) {
      console.error('Erro na extração de imagem:', err);
      if (err.name === 'AbortError') {
        alert('Tempo limite de 30s excedido ao processar print com IA. Tente novamente ou use a aba de texto.');
      } else {
        alert('Aviso da IA: ' + (err.message || 'Falha ao processar o print. Verifique a chave GEMINI_API_KEY.'));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessingAi(false);
    }
  };

  const processarExtracaoTexto = async () => {
    if (!textInput.trim()) return;
    setIsProcessingAi(true);
    setResultadoDespacho(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'TEXTO_LIVRE',
          conteudo: textInput,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Erro HTTP ${response.status}`);
      }

      const dados: RideExtractionData = await response.json();
      aplicarDadosExtraidos(dados);
    } catch (err: any) {
      console.error('Erro na extração de texto:', err);
      if (err.name === 'AbortError') {
        alert('Tempo limite de 30s excedido ao processar texto.');
      } else {
        alert('Aviso da IA: ' + (err.message || 'Falha ao processar o texto.'));
      }
    } finally {
      clearTimeout(timeoutId);
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
    const textoBusca = `${dados.empresaIdentificada || ''} ${dados.classificadores?.codigoOsChamado || ''} ${dados.origem?.enderecoCompleto || ''} ${dados.destino?.enderecoCompleto || ''}`.toLowerCase();

    const contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) =>
      c.palavrasChave.some((kw) => textoBusca.includes(kw.toLowerCase()))
    );

    const contratoFinalId = contratoDetectado ? contratoDetectado.id : contratoSelecionadoId;
    if (contratoDetectado) {
      setContratoSelecionadoId(contratoDetectado.id);
      setContratoAutoDetectado(true);
    }

    // Pré-preenchimento automático dos classificadores e campo NOME
    const novosValores: Record<string, string> = {};
    if (dados.passageiro?.nome) {
      novosValores['nomeSolicitante'] = dados.passageiro.nome;
    }
    if (dados.classificadores?.codigoOsChamado) {
      novosValores['classificador1'] = dados.classificadores.codigoOsChamado;
    }
    if (dados.classificadores?.centroCusto) {
      novosValores['classificador2'] = dados.classificadores.centroCusto;
    }
    if (/itau|itaú/i.test(textoBusca)) {
      novosValores['classificador2'] = 'ITAU';
      novosValores['classificador3'] = 'itau-0002';
    }
    setValoresManuais((prev) => ({ ...prev, ...novosValores }));

    consultarAutorizado(dados.passageiro.identificador || dados.passageiro.nome);
    calcularEstimativaRota(
      dados.origem.enderecoCompleto,
      dados.destino?.enderecoCompleto,
      contratoFinalId,
      dados.agendamento.dataAgendamento,
      dados.agendamento.horaAgendamento
    );
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

  const calcularEstimativaRota = async (
    origemCustom?: string,
    destinoCustom?: string,
    contratoIdCustom?: string,
    dataCustom?: string,
    horaCustom?: string
  ) => {
    const endOrigem = origemCustom || formOrigem;
    const endDestino = destinoCustom || formDestino;
    const cid = contratoIdCustom || contratoSelecionadoId;
    const dt = dataCustom || formViagem.data;
    const hr = horaCustom || formViagem.hora;

    if (!endOrigem) return;

    setCalculandoEstimativa(true);
    setErroEstimativa(null);
    try {
      const res = await fetch('/api/taxi-digital/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: cid,
          origem: endOrigem,
          destino: endDestino,
          data: dt,
          hora: hr,
        }),
      });

      const resJson = await res.json().catch(() => ({}));
      if (resJson.status && resJson.categories && resJson.categories.length > 0) {
        setCategoriasDisponiveis(resJson.categories);

        // Se a categoria selecionada anteriormente ainda existir na lista retornada, mantém
        const catExistente = resJson.categories.find((c: any) => c.id === categoriaSelecionadaId);
        const catEscolhida = catExistente || resJson.categories[0];
        setCategoriaSelecionadaId(catEscolhida.id);

        setEstimativa({
          km: catEscolhida.distanciaKm,
          minutos: catEscolhida.tempoMinutos,
          valor: catEscolhida.valor,
        });
      } else if (resJson.status && resJson.totalCategorias === 0) {
        setCategoriasDisponiveis([]);
        setEstimativa(null);
        setErroEstimativa(`Nenhuma categoria da Táxi Digital encontrada para este contrato nesta região.`);
      } else if (resJson.valorEstimado) {
        setCategoriasDisponiveis([]);
        setEstimativa({
          km: resJson.distanciaKm || 0,
          minutos: resJson.tempoMinutos || 35,
          valor: resJson.valorEstimado || 0,
        });
      } else {
        setCategoriasDisponiveis([]);
        setEstimativa(null);
      }
    } catch (err) {
      console.error('Erro ao calcular estimativa e buscar categorias:', err);
      setErroEstimativa('Não foi possível obter a estimativa da Táxi Digital.');
    } finally {
      setCalculandoEstimativa(false);
    }
  };

  const handleSelecionarCategoria = (cat: CategoriaTaxiDigital) => {
    setCategoriaSelecionadaId(cat.id);
    setEstimativa({
      km: cat.distanciaKm,
      minutos: cat.tempoMinutos,
      valor: cat.valor,
    });
  };

  const handleDespacharCorrida = async () => {
    if (!resultadoRules.podeDespachar) {
      alert('Atenção: Existem regras contratuais obrigatórias pendentes.');
      return;
    }

    setDespachando(true);
    try {
      const response = await fetch('/api/taxi-digital/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: contratoSelecionadoId,
          categoryId: categoriaSelecionadaId,
          passageiroNome: formPassageiro.nome,
          passageiroTelefone: formPassageiro.telefone,
          tipo: formViagem.tipo,
          data: formViagem.data,
          hora: formViagem.hora,
          origem: formOrigem,
          destino: formDestino,
          classificadores: resultadoRules.classificadoresProntos,
          observacoes: formObservacoes,
        }),
      });

      const res = await response.json().catch(() => ({}));

      if (!response.ok || !res.status) {
        throw new Error(res.error || 'A central Táxi Digital rejeitou o agendamento.');
      }

      setResultadoDespacho({
        bookingId: String(res.booking_id),
        voucher: res.voucher || 'VCH-AUTO',
        status: res.status_corrida || 'AGENDADA',
      });
    } catch (err: any) {
      console.error('Falha no despacho:', err);
      alert('Aviso da Central Táxi Digital: ' + (err.message || 'Falha ao agendar corrida.'));
    } finally {
      setDespachando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. TOPBAR PROFISSIONAL FIXA DE PONTA A PONTA */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo e Nome da Aplicação */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-28 sm:w-32 flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-taxi20.png"
                alt="Táxi 2.0"
                className="max-h-9 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block h-5 w-px bg-slate-200"></div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Despacho Corporativo B2B
              </h1>
              <p className="text-[11px] text-slate-500">Automação de Agendamentos</p>
            </div>
          </div>

          {/* Status da Conexão Táxi Digital */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>APITD v3 Conectado</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Central Táxi 2.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* FEEDBACK DE CORRIDA AGENDADA */}
      {resultadoDespacho && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-950">
                  Corrida transmitida com sucesso para a frota!
                </h4>
                <p className="text-xs text-emerald-800">
                  ID Táxi Digital: <span className="font-mono font-bold">{resultadoDespacho.bookingId}</span> • Voucher: <span className="font-mono font-bold">{resultadoDespacho.voucher}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setResultadoDespacho(null)}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline px-3 py-1"
            >
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: INGESTÃO DE PRINT / TEXTO E ESTIMATIVA (5 colunas) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
            
            {/* Card de Upload / Dropzone */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="bg-slate-100 p-1 rounded-lg border border-slate-200/60 inline-flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('PRINT')}
                    className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
                      activeTab === 'PRINT'
                        ? 'bg-white shadow-sm font-semibold text-slate-800'
                        : 'text-slate-500 hover:text-slate-700 font-medium'
                    }`}
                  >
                    Print / Imagem
                  </button>
                  <button
                    onClick={() => setActiveTab('TEXTO')}
                    className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
                      activeTab === 'TEXTO'
                        ? 'bg-white shadow-sm font-semibold text-slate-800'
                        : 'text-slate-500 hover:text-slate-700 font-medium'
                    }`}
                  >
                    Texto Livre
                  </button>
                </div>

                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  OCR Inteligente
                </span>
              </div>

              {/* ABA PRINT / DROPZONE COMPACTA */}
              {activeTab === 'PRINT' && (
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Screenshot"
                          className="w-full max-h-72 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setExtractedData(null);
                          }}
                          className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium bg-slate-900/80 hover:bg-slate-900 text-white rounded-md shadow-sm transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Substituir imagem
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessingAi}
                        onClick={() => processarExtracaoImagem(imagePreview)}
                        className="w-full h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingAi ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Lendo dados do print com IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Analisar com IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-3 pointer-events-none">
                        <div className="w-10 h-10 rounded-md bg-slate-200/80 text-slate-700 mx-auto flex items-center justify-center">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            Pressione <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded shadow-2xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded shadow-2xs">V</kbd> para colar o print
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            ou clique para selecionar um arquivo de imagem
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA TEXTO */}
              {activeTab === 'TEXTO' && (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Cole ou digite a mensagem do chamado corporativo..."
                    className="w-full p-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none resize-none font-normal"
                  />
                  <button
                    disabled={isProcessingAi || !textInput.trim()}
                    onClick={processarExtracaoTexto}
                    className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando texto com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analisar com IA</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {extractedData && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span className="font-medium text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Índice de Confiança da IA
                  </span>
                  <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {Math.round(extractedData.scoreConfianca * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Card de Estimativa e Viabilidade */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-slate-700" />
                  Estimativa de Rota (Táxi Digital)
                </h3>
                <button
                  onClick={() => calcularEstimativaRota()}
                  disabled={calculandoEstimativa}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${calculandoEstimativa ? 'animate-spin' : ''}`} />
                  Recalcular
                </button>
              </div>

              {estimativa ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Distância</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{estimativa.km} km</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Tempo</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{estimativa.minutos} min</div>
                    </div>
                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-blue-700">Tarifa Prevista</div>
                      <div className="text-sm font-bold text-blue-900 mt-0.5">R$ {estimativa.valor.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* LISTA DE CATEGORIAS DA TÁXI DIGITAL */}
                  {categoriasDisponiveis.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-600" />
                          Categoria do Táxi
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {categoriasDisponiveis.length} {categoriasDisponiveis.length === 1 ? 'categoria ativa' : 'categorias ativas'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {categoriasDisponiveis.map((cat) => {
                          const isSelected = cat.id === categoriaSelecionadaId;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelecionarCategoria(cat)}
                              className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/70 shadow-2xs ring-1 ring-blue-600'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                                    {cat.nome}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] font-semibold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded">
                                      Selecionada
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {cat.precoFixo ? 'Preço Tabelado Fechado' : 'Taxímetro Estimado'} • Cód. {cat.id}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                  R$ {cat.valor.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Distância</div>
                      <div className="text-sm font-semibold text-slate-400 mt-0.5">~ -- km</div>
                    </div>
                    <div className="p-2.5 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Tempo</div>
                      <div className="text-sm font-semibold text-slate-400 mt-0.5">~ -- min</div>
                    </div>
                    <div className="p-2.5 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Tarifa Prevista</div>
                      <div className="text-sm font-semibold text-slate-400 mt-0.5">R$ --,--</div>
                    </div>
                  </div>

                  {erroEstimativa ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-950">Aviso da Táxi Digital</div>
                        <div className="text-[11px] text-amber-800 mt-0.5">{erroEstimativa}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 text-center">
                      Aguardando preenchimento de origem e destino para consultar categorias e valor oficial
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO OPERACIONAL E CLASSIFICADORES (7 colunas) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-6">
              
              {/* Header do Validador */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                    Validador Operacional
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conferência e preenchimento dos dados antes do envio
                  </p>
                </div>

                {dadosAutorizado && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autorizado: Ativo
                  </span>
                )}
              </div>

              {/* SELETOR DE CONTRATO B2B SÓBRIO */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    Contrato Corporativo
                  </label>
                  {contratoAutoDetectado ? (
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      Identificado pela IA
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 font-mono text-xs px-2 py-0.5 rounded border border-slate-200/60">
                      {contratoAtual.uiCliente}
                    </span>
                  )}
                </div>

                <select
                  value={contratoSelecionadoId}
                  onChange={(e) => {
                    const novoId = e.target.value;
                    setContratoSelecionadoId(novoId);
                    setContratoAutoDetectado(false);
                    calcularEstimativaRota(undefined, undefined, novoId);
                  }}
                  className="w-full h-10 px-3 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none shadow-2xs cursor-pointer"
                >
                  {CONTRATOS_DISPONIVEIS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeExibicao}
                    </option>
                  ))}
                </select>
              </div>

              {/* DADOS DO PASSAGEIRO */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Dados do Passageiro
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-700">Nome Completo</label>
                    <input
                      type="text"
                      value={formPassageiro.nome}
                      placeholder="Nome do colaborador"
                      onChange={(e) => setFormPassageiro({ ...formPassageiro, nome: e.target.value })}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formPassageiro.telefone}
                      placeholder="(00) 00000-0000"
                      onChange={(e) => setFormPassageiro({ ...formPassageiro, telefone: e.target.value })}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* DATA E HORÁRIO */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Data e Horário
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Tipo de Chamada</label>
                    <select
                      value={formViagem.tipo}
                      onChange={(e) => setFormViagem({ ...formViagem, tipo: e.target.value as any })}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none bg-white text-slate-900 cursor-pointer"
                    >
                      <option value="AGENDADO">Agendada (Futura)</option>
                      <option value="IMEDIATO">Imediata (Agora)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Data</label>
                    <input
                      type="date"
                      value={formViagem.data}
                      onChange={(e) => setFormViagem({ ...formViagem, data: e.target.value })}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Horário</label>
                    <input
                      type="time"
                      value={formViagem.hora}
                      onChange={(e) => setFormViagem({ ...formViagem, hora: e.target.value })}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* TRAJETO COM TRAÇO VERTICAL (ESTILO UBER / GOOGLE MAPS) */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Trajeto da Corrida
                </h4>

                <div className="flex gap-3">
                  {/* Traço Vertical com Pontos A e B */}
                  <div className="flex flex-col items-center pt-8 pb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex-shrink-0"></span>
                    <span className="w-0.5 flex-1 bg-slate-200 my-1"></span>
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 ring-4 ring-slate-100 flex-shrink-0"></span>
                  </div>

                  {/* Campos de Origem e Destino */}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">Origem (Embarque)</label>
                      <input
                        type="text"
                        value={formOrigem}
                        placeholder="Endereço de partida..."
                        onChange={(e) => setFormOrigem(e.target.value)}
                        onBlur={() => calcularEstimativaRota()}
                        className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900 font-normal"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">Destino (Desembarque)</label>
                      <input
                        type="text"
                        value={formDestino}
                        placeholder="Endereço de destino..."
                        onChange={(e) => setFormDestino(e.target.value)}
                        onBlur={() => calcularEstimativaRota()}
                        className="w-full h-10 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900 font-normal"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REGRAS DE FATURAMENTO E CLASSIFICADORES */}
              <ClassificationRuleValidator
                resultado={resultadoRules}
                valoresManuais={valoresManuais}
                onAlterarValor={(campo, val) =>
                  setValoresManuais((prev) => ({ ...prev, [campo]: val }))
                }
              />

              {/* OBSERVAÇÕES OPERACIONAIS */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Observações para a Frota
                </label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  placeholder="Informações adicionais para o motorista (ex: portão de entrada, ferramentas)..."
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none text-slate-900 resize-none font-normal"
                />
              </div>

              {/* 7. FOOTER STICKY: BARRA DE AÇÃO FIXA */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs py-3.5 px-5 -mx-5 -mb-5 rounded-b-xl border-t border-slate-200 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="text-xs text-slate-600 flex-1 min-w-0 pr-2">
                  {!resultadoRules.podeDespachar ? (
                    <span className="text-amber-800 font-medium flex items-center gap-1.5 leading-snug">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      Preencha os campos obrigatórios acima para liberar o envio.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1.5 leading-snug">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Todos os requisitos contratuais foram validados.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!resultadoRules.podeDespachar || despachando}
                  onClick={handleDespacharCorrida}
                  className={`h-11 px-6 rounded-md font-medium text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shrink-0 whitespace-nowrap ${
                    resultadoRules.podeDespachar
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm cursor-pointer'
                      : 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  {despachando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transmitindo...
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4" />
                      AGENDAR CORRIDA NO TÁXI 2.0
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
