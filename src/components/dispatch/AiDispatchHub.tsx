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
  Copy,
  Share2,
  Clipboard,
  Trash2,
  Key,
  Search,
  Download,
  History,
  X,
  ExternalLink,
  Calendar,
  Radio,
  LogOut,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { RideExtractionData } from '../../lib/ai/schema';
import { ClassifierRuleEngine, RegraClassificadorItem, ResultadoRuleEngine } from '../../lib/rules/classifier-engine';
import { TaxiDigitalApiClient } from '../../lib/taxi-digital/client';
import { ClassificationRuleValidator } from './ClassificationRuleValidator';
import { PainelStatusAoVivo } from './PainelStatusAoVivo';
import { ModalLoginDespachante } from '../auth/ModalLoginDespachante';
import { DespachanteUsuario, DESPACHANTES_PREDEFINIDOS } from '@/lib/auth/despachantes';

export interface AgendamentoLog {
  id: string;
  timestamp: string;
  operador: string;
  bookingId: string;
  voucher: string;
  status: string;
  passageiroNome: string;
  passageiroTelefone: string;
  contratoId: string;
  contratoNome: string;
  data: string;
  hora: string;
  tipo: string;
  origem: string;
  destino: string;
  categoriaNome: string;
  valorEstimado?: number;
  classificadores?: any;
  observacoes?: string;
}

const MiniMapaRota = dynamic(
  () => import('./MiniMapaRota').then((mod) => mod.MiniMapaRota),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 sm:h-56 w-full rounded-xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
        Carregando mapa Leaflet...
      </div>
    ),
  }
);

export interface CategoriaTaxiDigital {
  id: string;
  nome: string;
  valor: number;
  distanciaKm: number;
  tempoMinutos: number;
  precoFixo: boolean;
  capacidade?: number;
}

export interface DetalhesDespachoSucesso {
  bookingId: string;
  voucher: string;
  status: string;
  passageiroNome: string;
  passageiroTelefone: string;
  data: string;
  hora: string;
  tipo: string;
  origem: string;
  destino: string;
  categoriaNome: string;
  valorEstimado?: number;
  contratoNome: string;
  centroCusto?: string;
  solicitante?: string;
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
    id: 'voll-geral',
    nomeExibicao: 'VOLL (Corporativo Geral)',
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    palavrasChave: [
      'voll',
      'itau',
      'itaú',
      'itau unibanco',
      'itau-m',
      '#itau',
      'heineken',
      'hnk',
      '#hnk',
      'hnk-m',
      'reserva voll',
      'app voll',
      'agendamento voll',
    ],
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
        opcoesValidas: ['ITAU', 'VOLL', 'TAXI 2.0', 'HEINEKEN'],
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
    id: 'unipar-direto',
    nomeExibicao: 'UNIPAR (Corporativo Direto)',
    uiCliente: '4b5461d2-2dc4-4402-80a2-4ecbf97de9d7',
    palavrasChave: [
      'unipar direto',
      'unipar carbocloro',
      '@unipar.com',
      'solange.olivieri@unipar.com',
      '10300020',
      'solange',
      'traslado',
      'cubatão',
      'santo andré',
      'ucbr',
      'marcelo terra white',
    ],
    regras: [
      {
        numeroCampo: 0,
        nomeExibicao: 'Nome (Passageiro)',
        descricaoAjuda: 'Nome completo do colaborador',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_NOME',
      },
      {
        numeroCampo: 1,
        nomeExibicao: 'Empresa',
        descricaoAjuda: 'Unidade operacional Unipar',
        obrigatorio: true,
        tipoPreenchimento: 'LISTA_SUSPENSA',
        opcoesValidas: ['UNIPAR CARBOCLORO', 'UCBR - FC Cubatão', 'UCBR - SP Matriz', 'UNIPAR'],
        valorFixo: 'UNIPAR CARBOCLORO',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Centro de Custo',
        descricaoAjuda: 'Centro contábil Unipar (ex: 10300020)',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 3,
        nomeExibicao: 'Matrícula',
        descricaoAjuda: 'Matrícula funcional (se informada)',
        obrigatorio: false,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 5,
        nomeExibicao: 'Gestor / Solicitante',
        descricaoAjuda: 'Nome do solicitante ou gestor imediato',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
      {
        numeroCampo: 6,
        nomeExibicao: 'Justificativa / Motivo',
        descricaoAjuda: 'Motivo da viagem corporativa ou voo',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
      {
        numeroCampo: 7,
        nomeExibicao: 'Observação Operacional',
        descricaoAjuda: 'Observações operacionais para o motorista',
        obrigatorio: false,
        tipoPreenchimento: 'MANUAL_LIVRE',
      },
    ],
  },
  {
    id: 'unipar-voll',
    nomeExibicao: 'UNIPAR VOLL (Plataforma Voll)',
    uiCliente: '084dbe67-d889-49a6-af3e-8609d9122e23',
    palavrasChave: ['unipar voll', 'unipar-m', '#unipar-m', 'camaçari voll'],
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
        nomeExibicao: 'Login / Voucher Voll',
        descricaoAjuda: 'Código identificador Voll (#UNIPAR-M...)',
        obrigatorio: true,
        tipoPreenchimento: 'EXTRAIDO_IA_REGEX',
      },
      {
        numeroCampo: 2,
        nomeExibicao: 'Telefone Passageiro',
        descricaoAjuda: 'Telefone com DDD',
        obrigatorio: false,
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
    id: 'padrao-b2b',
    nomeExibicao: 'CLIENTES DIVERSOS (Faturamento B2B)',
    uiCliente: 'CLIENTE_PADRAO_01',
    palavrasChave: ['outros', 'avulso', 'padrao', 'spot'],
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

  // CONTRATOS DINÂMICOS & CONTROLE MANUAL
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState<string>('voll-geral');
  const [contratoAutoDetectado, setContratoAutoDetectado] = useState(false);
  const [contratoModoManual, setContratoModoManual] = useState(false);
  const contratoModoManualRef = useRef(false);

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
  const [resultadoDespacho, setResultadoDespacho] = useState<DetalhesDespachoSucesso | null>(null);
  const [copiadoVoucher, setCopiadoVoucher] = useState(false);
  const [copiadoTextoCompleto, setCopiadoTextoCompleto] = useState(false);
  const [origemCoords, setOrigemCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [colandoClipboard, setColandoClipboard] = useState(false);

  // ABAS PRINCIPAIS & AUTENTICAÇÃO DE DESPACHANTES
  const [abaPrincipal, setAbaPrincipal] = useState<'DESPACHO' | 'STATUS_AO_VIVO'>('DESPACHO');
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [despachanteAutenticado, setDespachanteAutenticado] = useState<DespachanteUsuario | null>(null);

  // ESTADOS DE AUDITORIA & HISTÓRICO (LOG)
  const [modalLogAberto, setModalLogAberto] = useState(false);
  const [nomeOperador, setNomeOperador] = useState('Eduardo (Gestor Geral)');
  const [editandoOperador, setEditandoOperador] = useState(false);
  const [historicoLogs, setHistoricoLogs] = useState<AgendamentoLog[]>([]);
  const [filtroLog, setFiltroLog] = useState('');
  const [logSelecionadoParaDetalhes, setLogSelecionadoParaDetalhes] = useState<AgendamentoLog | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('taxi20_auth_session');
      if (savedAuth) {
        try {
          const desp = JSON.parse(savedAuth);
          setDespachanteAutenticado(desp);
          setNomeOperador(desp.nome);
        } catch {}
      } else {
        const padrao = DESPACHANTES_PREDEFINIDOS[0];
        setDespachanteAutenticado(padrao);
        setNomeOperador(padrao.nome);
      }

      const savedLogs = localStorage.getItem('taxi20_historico_agendamentos');
      if (savedLogs) {
        try {
          setHistoricoLogs(JSON.parse(savedLogs));
        } catch {}
      }
    }
  }, []);

  const handleLoginSucesso = (desp: DespachanteUsuario) => {
    setDespachanteAutenticado(desp);
    setNomeOperador(desp.nome);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxi20_auth_session', JSON.stringify(desp));
      localStorage.setItem('taxi20_operador_atual', desp.nome);
    }
    setModalLoginAberto(false);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taxi20_auth_session');
    }
    setDespachanteAutenticado(null);
    setModalLoginAberto(true);
  };

  const handleSalvarOperador = (novoNome: string) => {
    const nome = novoNome.trim() || 'Operador Central';
    setNomeOperador(nome);
    setEditandoOperador(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxi20_operador_atual', nome);
    }
  };

  const exportarLogCsv = () => {
    if (historicoLogs.length === 0) {
      alert('Nenhum agendamento registrado no histórico para exportar.');
      return;
    }
    const headers = [
      'Data Criação',
      'Operador',
      'Booking ID',
      'Voucher',
      'Passageiro',
      'Telefone',
      'Contrato',
      'Data Corrida',
      'Horário',
      'Origem',
      'Destino',
      'Valor Previsto',
      'Status',
    ];
    const rows = historicoLogs.map((l) => [
      new Date(l.timestamp).toLocaleString('pt-BR'),
      `"${l.operador}"`,
      `"${l.bookingId}"`,
      `"${l.voucher}"`,
      `"${l.passageiroNome}"`,
      `"${l.passageiroTelefone}"`,
      `"${l.contratoNome}"`,
      `"${l.data}"`,
      `"${l.hora}"`,
      `"${l.origem.replace(/"/g, '""')}"`,
      `"${(l.destino || '').replace(/"/g, '""')}"`,
      l.valorEstimado ? `R$ ${l.valorEstimado.toFixed(2)}` : '',
      `"${l.status}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `log_agendamentos_taxi20_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLimparHistorico = () => {
    if (confirm('Tem certeza que deseja limpar o histórico de agendamentos local? Esta ação não pode ser desfeita.')) {
      setHistoricoLogs([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('taxi20_historico_agendamentos');
      }
    }
  };

  const taxiClientRef = useRef(new TaxiDigitalApiClient());

  const contratoAtual = CONTRATOS_DISPONIVEIS.find((c) => c.id === contratoSelecionadoId) || CONTRATOS_DISPONIVEIS[0];

  // Execução contínua da Rule Engine conectada ao nome e classificadores
  const resultadoRules: ResultadoRuleEngine = ClassifierRuleEngine.executar(
    contratoAtual.regras,
    {
      ...extractedData,
      passageiro: {
        nome: formPassageiro.nome || extractedData?.passageiro?.nome || '',
        telefone: formPassageiro.telefone || extractedData?.passageiro?.telefone,
        identificador: formPassageiro.identificador || extractedData?.passageiro?.identificador,
      },
    },
    dadosAutorizado,
    {
      ...valoresManuais,
      nomeSolicitante: valoresManuais.nomeSolicitante || formPassageiro.nome || '',
    }
  );

  const handleCopiarVoucher = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoVoucher(true);
    setTimeout(() => setCopiadoVoucher(false), 2500);
  };

  const handleCopiarConfirmacaoCompleta = (detalhes: DetalhesDespachoSucesso) => {
    let dataFormatada = detalhes.data;
    if (detalhes.data && detalhes.data.includes('-')) {
      const [yyyy, mm, dd] = detalhes.data.split('-');
      dataFormatada = `${dd}/${mm}/${yyyy}`;
    }
    const texto = `🚖 *CONFIRMAÇÃO DE TRASLADO - TÁXI 2.0*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *VOUCHER / BOOKING ID:* ${detalhes.bookingId}
🎫 *Código da Reserva / Ref:* ${detalhes.voucher}
👤 *Passageiro:* ${detalhes.passageiroNome} (${detalhes.passageiroTelefone || 'Sem tel'})
📅 *Data e Horário:* ${dataFormatada} às ${detalhes.hora}
📍 *Embarque:* ${detalhes.origem}
🏁 *Desembarque:* ${detalhes.destino || 'A definir'}
🏢 *Contrato:* ${detalhes.contratoNome}
🚗 *Categoria Táxi:* ${detalhes.categoriaNome}
${detalhes.centroCusto ? `💼 *Centro de Custo:* ${detalhes.centroCusto}\n` : ''}${detalhes.valorEstimado ? `💰 *Valor Estimado:* R$ ${detalhes.valorEstimado.toFixed(2)}\n` : ''}✅ *Status:* Agendado com sucesso na central Táxi Digital.`;

    navigator.clipboard.writeText(texto);
    setCopiadoTextoCompleto(true);
    setTimeout(() => setCopiadoTextoCompleto(false), 2500);
  };

  const handleNovoAgendamento = () => {
    setResultadoDespacho(null);
    setImagePreview(null);
    setTextInput('');
    setExtractedData(null);
    setFormPassageiro({ nome: '', telefone: '', identificador: '' });
    setFormViagem({ data: '', hora: '', tipo: 'AGENDADO' });
    setFormOrigem('');
    setFormDestino('');
    setFormObservacoes('');
    setValoresManuais({});
    setEstimativa(null);
    setCategoriasDisponiveis([]);
    setCategoriaSelecionadaId('');
    setOrigemCoords(null);
    setDestinoCoords(null);
  };

  const handleAlterarValorClassificador = (campo: string, valor: string) => {
    setValoresManuais((prev) => ({ ...prev, [campo]: valor }));
    if (campo === 'nomeSolicitante') {
      setFormPassageiro((prev) => ({ ...prev, nome: valor }));
    }
  };

  const carregarImagemEProcessar = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setActiveTab('PRINT');
      processarExtracaoImagem(base64);
    };
    reader.readAsDataURL(file);
  };

  // CLIPBOARD AUTOMÁTICO (MOBILE & DESKTOP COM 1 TOQUE)
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        alert('Seu navegador não suporta leitura direta da área de transferência.');
        return;
      }

      // 1. Tentar ler como itens binários (Imagens copiadas no celular/desktop)
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imageType = item.types.find((type) => type.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const file = new File([blob], 'clipboard-image.png', { type: imageType });

              // Carrega no preview e dispara extração IA
              carregarImagemEProcessar(file);
              return;
            }
          }
        } catch (binErr) {
          console.warn('Permissão de leitura de binário do clipboard não concedida, tentando texto:', binErr);
        }
      }

      // 2. Fallback: Se for texto copiado (ex: mensagem de WhatsApp com dados da corrida)
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setActiveTab('TEXTO');
        setTextInput(text);
        processarExtracaoTextoComConteudo(text);
      } else {
        alert('Nenhuma imagem ou texto encontrado na área de transferência.');
      }
    } catch (err) {
      console.warn('Permissão de clipboard negada ou falha ao ler:', err);
      alert('Dê permissão para colar ou use o comando de colar diretamente no campo.');
    }
  };

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
            carregarImagemEProcessar(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // ATALHO DE TECLADO: CTRL + ENTER PARA DISPARAR AGENDAMENTO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (resultadoRules.podeDespachar && !despachando) {
          handleDespacharCorrida();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resultadoRules.podeDespachar, despachando]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      carregarImagemEProcessar(file);
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
    const timeoutId = setTimeout(() => controller.abort(), 40000);

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
        alert('Tempo limite excedido ao processar print com IA. O sistema usará os dados inseridos ou você pode tentar novamente.');
      } else {
        alert('Aviso da IA: ' + (err.message || 'Falha ao processar print.'));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessingAi(false);
    }
  };

  const processarExtracaoTextoComConteudo = async (conteudoTexto: string) => {
    if (!conteudoTexto.trim()) return;
    setIsProcessingAi(true);
    setResultadoDespacho(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'TEXTO_LIVRE',
          conteudo: conteudoTexto,
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
        alert('Tempo limite excedido ao processar texto.');
      } else {
        alert('Aviso da IA: ' + (err.message || 'Falha ao processar texto.'));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessingAi(false);
    }
  };

  const processarExtracaoTexto = () => {
    processarExtracaoTextoComConteudo(textInput);
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

    // Auto-detecção inteligente do contrato da empresa (APENAS se o operador não tiver definido manualmente)
    let contratoFinalId = contratoSelecionadoId;

    if (!contratoModoManualRef.current) {
      const textoBusca = `${dados.empresaIdentificada || ''} ${dados.classificadores?.codigoOsChamado || ''} ${dados.origem?.enderecoCompleto || ''} ${dados.destino?.enderecoCompleto || ''} ${dados.observacoesOperacionais || ''} ${dados.classificadores?.centroCusto || ''}`.toLowerCase();
      const hasVollCode = /#?unipar-m/i.test(textoBusca);

      let contratoDetectado: ContratoCorporativo | undefined;
      if (hasVollCode) {
        contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) => c.id === 'unipar-voll');
      } else if (
        textoBusca.includes('10300020') ||
        textoBusca.includes('carbocloro') ||
        textoBusca.includes('unipar direto') ||
        textoBusca.includes('@unipar.com') ||
        textoBusca.includes('solange') ||
        textoBusca.includes('unipar')
      ) {
        contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) => c.id === 'unipar-direto');
      } else if (/#claro/i.test(textoBusca) || textoBusca.includes('claro') || textoBusca.includes('embratel')) {
        contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) => c.id === 'claro-voll');
      } else if (/#itau/i.test(textoBusca) || textoBusca.includes('itau') || textoBusca.includes('itaú') || textoBusca.includes('voll')) {
        contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) => c.id === 'voll-geral');
      } else {
        contratoDetectado = CONTRATOS_DISPONIVEIS.find((c) =>
          c.palavrasChave.some((kw) => textoBusca.includes(kw.toLowerCase()))
        );
      }

      if (contratoDetectado) {
        contratoFinalId = contratoDetectado.id;
        setContratoSelecionadoId(contratoDetectado.id);
        setContratoAutoDetectado(true);
      }
    } else {
      console.log('[AiDispatchHub] Mantendo contrato fixado manualmente pelo operador:', contratoSelecionadoId);
    }

    // Pré-preenchimento automático dos classificadores adaptado ao contrato
    adaptarClassificadoresParaContrato(contratoFinalId, dados, dados.passageiro?.nome);

    consultarAutorizado(dados.passageiro.identificador || dados.passageiro.nome);
    calcularEstimativaRota(
      dados.origem.enderecoCompleto,
      dados.destino?.enderecoCompleto,
      contratoFinalId,
      dados.agendamento.dataAgendamento,
      dados.agendamento.horaAgendamento
    );
  };

  const adaptarClassificadoresParaContrato = (
    contratoId: string,
    dadosAtuais?: RideExtractionData | null,
    passageiroNome?: string
  ) => {
    const dados = dadosAtuais !== undefined ? dadosAtuais : extractedData;
    const nome = passageiroNome || formPassageiro.nome;
    const novos: Record<string, string> = {};

    if (nome) {
      novos['nomeSolicitante'] = nome;
    }

    if (contratoId === 'unipar-direto') {
      novos['classificador1'] = 'UNIPAR CARBOCLORO';
      novos['classificador2'] = dados?.classificadores?.centroCusto || '10300020';
      if (dados?.classificadores?.solicitante) {
        novos['classificador5'] = dados.classificadores.solicitante;
      }
      if (dados?.observacoesOperacionais) {
        novos['classificador6'] = dados.observacoesOperacionais;
      }
    } else if (contratoId === 'unipar-voll') {
      if (dados?.classificadores?.codigoOsChamado) {
        novos['classificador1'] = dados.classificadores.codigoOsChamado;
      }
      if (formPassageiro.telefone) {
        novos['classificador2'] = formPassageiro.telefone;
      }
      if (dados?.classificadores?.centroCusto) {
        novos['classificador3'] = dados.classificadores.centroCusto;
      }
    } else if (contratoId === 'claro-voll') {
      if (dados?.classificadores?.codigoOsChamado) {
        novos['classificador1'] = dados.classificadores.codigoOsChamado;
      }
      novos['classificador2'] = 'TÁXI 2.0';
    } else if (contratoId === 'heineken-voll') {
      if (dados?.classificadores?.codigoOsChamado) {
        novos['classificador1'] = dados.classificadores.codigoOsChamado;
      }
      novos['classificador2'] = '0001 - UN ITU / CORPORATIVO';
      if (formPassageiro.telefone) {
        novos['classificador3'] = formPassageiro.telefone;
      }
    } else {
      if (dados?.classificadores?.codigoOsChamado) {
        novos['classificador1'] = dados.classificadores.codigoOsChamado;
      }
      if (dados?.classificadores?.centroCusto) {
        novos['classificador2'] = dados.classificadores.centroCusto;
      }
    }

    setValoresManuais((prev) => ({ ...prev, ...novos }));
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
      if (resJson.origemCoords) {
        setOrigemCoords(resJson.origemCoords);
      }
      if (resJson.destinoCoords) {
        setDestinoCoords(resJson.destinoCoords);
      }

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
          operador: nomeOperador || 'Operador Central',
        }),
      });

      const res = await response.json().catch(() => ({}));

      if (!response.ok || !res.status) {
        throw new Error(res.error || 'A central Táxi Digital rejeitou o agendamento.');
      }

      const catEscolhida = categoriasDisponiveis.find((c) => c.id === categoriaSelecionadaId);
      const detalhesSucesso: DetalhesDespachoSucesso = {
        bookingId: String(res.booking_id || res.voucher || 'VCH-TD'),
        voucher: res.voucher || 'VCH-AUTO',
        status: res.status_corrida || (formViagem.tipo === 'IMEDIATO' ? 'EM DESPACHO' : 'AGENDADA'),
        passageiroNome: formPassageiro.nome,
        passageiroTelefone: formPassageiro.telefone,
        data: formViagem.data,
        hora: formViagem.hora,
        tipo: formViagem.tipo,
        origem: formOrigem,
        destino: formDestino,
        categoriaNome: catEscolhida?.nome || 'Táxi Convencional',
        valorEstimado: estimativa?.valor,
        contratoNome: contratoAtual.nomeExibicao,
        centroCusto: resultadoRules.classificadoresProntos.classificador2 || '',
        solicitante: resultadoRules.classificadoresProntos.nomeSolicitante || '',
      };
      setResultadoDespacho(detalhesSucesso);

      // REGISTRO DE AUDITORIA & LOG ("QUEM FEZ")
      const novoLogItem: AgendamentoLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        operador: nomeOperador || 'Operador Central',
        bookingId: detalhesSucesso.bookingId,
        voucher: detalhesSucesso.voucher,
        status: detalhesSucesso.status,
        passageiroNome: formPassageiro.nome,
        passageiroTelefone: formPassageiro.telefone,
        contratoId: contratoSelecionadoId,
        contratoNome: contratoAtual.nomeExibicao,
        data: formViagem.data,
        hora: formViagem.hora,
        tipo: formViagem.tipo,
        origem: formOrigem,
        destino: formDestino,
        categoriaNome: detalhesSucesso.categoriaNome,
        valorEstimado: estimativa?.valor,
        classificadores: resultadoRules.classificadoresProntos,
        observacoes: formObservacoes,
      };

      setHistoricoLogs((prev) => {
        const atualizados = [novoLogItem, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem('taxi20_historico_agendamentos', JSON.stringify(atualizados.slice(0, 100)));
        }
        return atualizados;
      });

      fetch('/api/dispatch/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoLogItem),
      }).catch(() => {});
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
        <div className="w-full max-w-[1520px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
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

          {/* Seletor de Abas no Centro: Novo Despacho vs Painel ao Vivo */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setAbaPrincipal('DESPACHO')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                abaPrincipal === 'DESPACHO'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Novo Despacho</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaPrincipal('STATUS_AO_VIVO')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                abaPrincipal === 'STATUS_AO_VIVO'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Status ao Vivo (Frota)</span>
            </button>
          </div>

          {/* À direita: atalhos rápidos e identificação do despachante */}
          <div className="flex items-center gap-2">
            {/* Despachante Autenticado */}
            <button
              type="button"
              onClick={() => setModalLoginAberto(true)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Clique para trocar o despachante autenticado"
            >
              <div className={`w-6 h-6 rounded-lg ${despachanteAutenticado?.avatarCor || 'bg-blue-600'} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                {despachanteAutenticado?.nome.charAt(0) || 'D'}
              </div>
              <div className="hidden xl:block min-w-0">
                <div className="text-[11px] font-bold text-slate-900 truncate">
                  {despachanteAutenticado?.nome.split('(')[0].trim() || nomeOperador}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold uppercase">
                  {despachanteAutenticado?.perfil || 'Operador'} • Trocar
                </div>
              </div>
            </button>


            {/* Botão Log de Agendamentos Realizados */}
            <button
              type="button"
              onClick={() => setModalLogAberto(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Consultar histórico de agendamentos e quem realizou"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Log</span>
              {historicoLogs.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {historicoLogs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleNovoAgendamento}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Iniciar novo agendamento e limpar formulário"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>
      </header>


      {/* MODAL / DRAWER HISTÓRICO & AUDITORIA DE AGENDAMENTOS (LOG) */}
      {modalLogAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header do Log */}
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shadow-2xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Histórico & Log de Agendamentos</h3>
                  <p className="text-xs text-slate-500">
                    Registro de todas as corridas transmitidas para a central Táxi Digital e consulta de quem fez
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportarLogCsv}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Exportar registros em formato CSV para Excel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLogAberto(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar histórico"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Ferramentas: Identificação do Operador ("Quem Fez") + Filtro de Busca */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Quem Fez (Operador Atual) */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Operador Atual:</span>
                {editandoOperador ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={nomeOperador}
                      id="inputNomeOperador"
                      className="h-8 px-2.5 text-xs rounded-md border border-slate-300 font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSalvarOperador((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('inputNomeOperador') as HTMLInputElement;
                        handleSalvarOperador(input?.value || nomeOperador);
                      }}
                      className="h-8 px-2.5 rounded-md bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {nomeOperador}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditandoOperador(true)}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                )}
              </div>

              {/* Filtro de Busca */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filtroLog}
                  onChange={(e) => setFiltroLog(e.target.value)}
                  placeholder="Buscar por passageiro, voucher, operador..."
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Lista / Tabela de Agendamentos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {historicoLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700">Nenhum agendamento registrado ainda</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Assim que você validar e agendar corridas pela plataforma Táxi 2.0, o histórico registrará quem fez, horário e voucher.
                  </p>
                </div>
              ) : (
                historicoLogs
                  .filter((log) => {
                    if (!filtroLog.trim()) return true;
                    const termo = filtroLog.toLowerCase();
                    return (
                      log.passageiroNome.toLowerCase().includes(termo) ||
                      log.bookingId.toLowerCase().includes(termo) ||
                      log.voucher.toLowerCase().includes(termo) ||
                      log.operador.toLowerCase().includes(termo) ||
                      log.contratoNome.toLowerCase().includes(termo) ||
                      log.origem.toLowerCase().includes(termo)
                    );
                  })
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            {log.bookingId}
                          </span>
                          <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {log.contratoNome.split('(')[0].trim()}
                          </span>
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                            {log.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Operador: <strong className="text-slate-800">{log.operador}</strong></span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Dados da Corrida */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div className="sm:col-span-4">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Passageiro</span>
                          <span className="font-semibold text-slate-800">{log.passageiroNome}</span>
                          {log.passageiroTelefone && (
                            <span className="text-[11px] text-slate-500 block">{log.passageiroTelefone}</span>
                          )}
                        </div>

                        <div className="sm:col-span-5">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Trajeto</span>
                          <span className="text-slate-700 truncate block font-medium">De: {log.origem}</span>
                          {log.destino && (
                            <span className="text-slate-700 truncate block font-medium">Para: {log.destino}</span>
                          )}
                        </div>

                        <div className="sm:col-span-3 text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Agendamento</span>
                          <span className="font-semibold text-slate-900">{log.data} às {log.hora}</span>
                          {log.valorEstimado && (
                            <span className="text-[11px] font-bold text-blue-700 block">
                              R$ {log.valorEstimado.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            const texto = `🚖 *CONFIRMAÇÃO DE TRASLADO - TÁXI 2.0*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *VOUCHER / BOOKING ID:* ${log.bookingId}
🎫 *Código da Reserva / Ref:* ${log.voucher}
👤 *Passageiro:* ${log.passageiroNome} (${log.passageiroTelefone || 'Sem tel'})
📅 *Data e Horário:* ${log.data} às ${log.hora}
📍 *Embarque:* ${log.origem}
🏁 *Desembarque:* ${log.destino || 'A definir'}
🏢 *Contrato:* ${log.contratoNome}
🚗 *Categoria Táxi:* ${log.categoriaNome}
${log.valorEstimado ? `💰 *Valor Estimado:* R$ ${log.valorEstimado.toFixed(2)}\n` : ''}👤 *Operador Responsável:* ${log.operador}
✅ *Status:* Agendado com sucesso na central Táxi Digital.`;
                            navigator.clipboard.writeText(texto);
                            alert('Comprovante formatado copiado para a área de transferência!');
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Comprovante</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total de agendamentos no LOG: <strong>{historicoLogs.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                {historicoLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLimparHistorico}
                    className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                  >
                    Limpar Histórico Local
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalLogAberto(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OFICIAL DE CONFIRMAÇÃO DO SERVIÇO AGENDADO */}
      {resultadoDespacho && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Faixa Superior de Sucesso */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center relative">
              <button
                onClick={() => setResultadoDespacho(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar modal"
              >
                ✕
              </button>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Serviço Agendado com Sucesso!</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Corrida transmitida e confirmada pela Central Táxi Digital
              </p>
            </div>

            {/* Destaque Central: VOUCHER / BOOKING ID */}
            <div className="p-6 space-y-5">
              <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Número do Voucher (Booking ID)</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">Oficial</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-wider mt-1">
                    {resultadoDespacho.bookingId}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Ref. / Código da Reserva: <span className="font-semibold text-slate-800 font-mono">{resultadoDespacho.voucher}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopiarVoucher(resultadoDespacho.bookingId)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    copiadoVoucher
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiadoVoucher ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Detalhes do Serviço Agendado */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Passageiro</span>
                  <span className="font-semibold text-slate-900 truncate block">{resultadoDespacho.passageiroNome}</span>
                  {resultadoDespacho.passageiroTelefone && (
                    <span className="text-[11px] text-slate-500">{resultadoDespacho.passageiroTelefone}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Data e Horário</span>
                  <span className="font-semibold text-slate-900 block">
                    {resultadoDespacho.data} às {resultadoDespacho.hora}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {resultadoDespacho.status}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Origem (Embarque)</span>
                  <span className="font-medium text-slate-800 line-clamp-1">{resultadoDespacho.origem}</span>
                </div>

                {resultadoDespacho.destino && (
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Destino (Desembarque)</span>
                    <span className="font-medium text-slate-800 line-clamp-1">{resultadoDespacho.destino}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Categoria Táxi</span>
                  <span className="font-medium text-slate-800">{resultadoDespacho.categoriaNome}</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tarifa Prevista</span>
                  <span className="font-bold text-slate-900">
                    {resultadoDespacho.valorEstimado ? `R$ ${resultadoDespacho.valorEstimado.toFixed(2)}` : 'Tarifa Padrão'}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleCopiarConfirmacaoCompleta(resultadoDespacho)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                    copiadoTextoCompleto
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {copiadoTextoCompleto ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Mensagem Completa Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copiar Confirmação Formatada (WhatsApp / E-mail)</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleNovoAgendamento}
                    className="flex-1 py-2.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Novo Agendamento</span>
                  </button>

                  <button
                    onClick={() => setResultadoDespacho(null)}
                    className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANNER PERSISTENTE DE STATUS NO TOPO */}
      {resultadoDespacho && (
        <div className="max-w-[1520px] mx-auto px-4 md:px-6 pt-5">
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
                  Voucher / Booking ID: <span className="font-mono font-bold">{resultadoDespacho.bookingId}</span> • Ref: <span className="font-mono font-bold">{resultadoDespacho.voucher}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopiarConfirmacaoCompleta(resultadoDespacho)}
                className="text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Confirmação</span>
              </button>
              <button
                onClick={() => setResultadoDespacho(null)}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline px-2 py-1 cursor-pointer"
              >
                Fechar aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL FULL-WIDTH FLUIDA */}
      <main className="max-w-[1520px] mx-auto px-4 md:px-6 py-5">
        {abaPrincipal === 'STATUS_AO_VIVO' ? (
          <PainelStatusAoVivo
            onVoltarDespacho={() => setAbaPrincipal('DESPACHO')}
            operadorAtivoNome={despachanteAutenticado?.nome || nomeOperador}
          />
        ) : (
          <>
            {/* PASSO 1: SELEÇÃO DO CONTRATO CORPORATIVO BASE */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Selecione o Contrato Corporativo Base
                </h2>
                <p className="text-xs text-slate-500">
                  Os classificadores, regras de auditoria e validações de faturamento são carregados com base no contrato ativo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Contrato Ativo:</span>
              <span className="font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                {contratoAtual.nomeExibicao}
              </span>
            </div>
          </div>

          {/* Grade de Contratos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {CONTRATOS_DISPONIVEIS.map((c) => {
              const isSelected = c.id === contratoSelecionadoId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setContratoSelecionadoId(c.id);
                    contratoModoManualRef.current = true;
                    adaptarClassificadoresParaContrato(c.id);
                    if (formOrigem) {
                      calcularEstimativaRota(formOrigem, formDestino, c.id);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                  <div>
                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                      {c.nomeExibicao.split('(')[0].trim()}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {c.nomeExibicao.includes('(') ? `(${c.nomeExibicao.split('(')[1]}` : 'Corporativo'}
                    </div>
                  </div>
                  <div className="mt-2.5 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-400" />
                    <span>{c.regras.length} classificadores</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* COLUNA ESQUERDA: INGESTÃO & FEEDBACK (5 colunas) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            
            {/* Card de Ingestão de Chamados */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5">
              
              {/* Abas [Print / Imagem] e [Texto Livre] com identificador de Passo 2 */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="bg-slate-100 p-1 rounded-lg border border-slate-200/60 inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('PRINT')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                        activeTab === 'PRINT'
                          ? 'bg-white shadow-2xs font-semibold text-slate-900'
                          : 'text-slate-500 hover:text-slate-700 font-medium'
                      }`}
                    >
                      Print / Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('TEXTO')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                        activeTab === 'TEXTO'
                          ? 'bg-white shadow-2xs font-semibold text-slate-900'
                          : 'text-slate-500 hover:text-slate-700 font-medium'
                      }`}
                    >
                      Texto Livre
                    </button>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  OCR Inteligente
                </span>
              </div>

              {/* BOTÃO DE AÇÃO RÁPIDA: "📋 Colar da Área de Transferência" (Destaque para Mobile e Desktop) */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isProcessingAi || colandoClipboard}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Clipboard className="w-4 h-4" />
                <span>{colandoClipboard ? 'Lendo Clipboard...' : '📋 Colar da Área de Transferência'}</span>
              </button>

              {/* ABA PRINT / DROPZONE COMPACTA */}
              {activeTab === 'PRINT' && (
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Screenshot do Chamado"
                          className="w-full max-h-64 object-contain mx-auto"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <label
                            className="px-2.5 py-1 text-xs font-medium bg-slate-900/80 hover:bg-slate-900 text-white rounded-md shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                            title="Substituir por outra imagem"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Substituir</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setExtractedData(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-red-600/80 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                            title="Excluir imagem"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessingAi}
                        onClick={() => processarExtracaoImagem(imagePreview)}
                        className="w-full h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingAi ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Lendo dados do print com IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Processar com IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-2 pointer-events-none">
                        <div className="w-9 h-9 rounded-md bg-slate-200/80 text-slate-700 mx-auto flex items-center justify-center">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            Pressione <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded shadow-2xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded shadow-2xs">V</kbd> ou toque no botão colar
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ou clique para selecionar um arquivo de print
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
                    placeholder="Cole ou digite a mensagem de WhatsApp, e-mail ou chamado corporativo..."
                    className="w-full p-2.5 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none resize-none font-normal"
                  />
                  <button
                    disabled={isProcessingAi || !textInput.trim()}
                    onClick={processarExtracaoTexto}
                    className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando texto com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Processar com IA</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {extractedData && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
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

            {/* Card de Estimativa de Rota Táxi Digital */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5">
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
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Distância</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{estimativa.km} km</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Tempo</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{estimativa.minutos} min</div>
                    </div>
                    <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                      <div className="text-[10px] uppercase font-semibold text-blue-700">Tarifa Prevista</div>
                      <div className="text-sm font-bold text-blue-900 mt-0.5">R$ {estimativa.valor.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Categorias ativas */}
                  {categoriasDisponiveis.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-blue-600" />
                          Categoria Ativa
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {categoriasDisponiveis.length} {categoriasDisponiveis.length === 1 ? 'categoria' : 'categorias'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {categoriasDisponiveis.map((cat) => {
                          const isSelected = cat.id === categoriaSelecionadaId;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelecionarCategoria(cat)}
                              className={`w-full p-2 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                                    {cat.nome}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                      Selecionada
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {cat.precoFixo ? 'Preço Fechado' : 'Taxímetro Estimado'} • Cód. {cat.id}
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
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Distância</div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">~ -- km</div>
                    </div>
                    <div className="p-2 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Tempo</div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">~ -- min</div>
                    </div>
                    <div className="p-2 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 text-center">
                      <div className="text-[10px] uppercase font-medium text-slate-400">Tarifa Prevista</div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">R$ --,--</div>
                    </div>
                  </div>

                  {erroEstimativa ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
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

            {/* Mini Mapa Interativo (Leaflet) traçando a rota assim que os endereços forem extraídos pela IA */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Traçado da Rota no Mapa</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Leaflet / OpenStreetMap</span>
              </div>
              <MiniMapaRota
                origemCoords={origemCoords}
                destinoCoords={destinoCoords}
                origemTexto={formOrigem}
                destinoTexto={formDestino}
              />
            </div>

          </div>

          {/* COLUNA DIREITA: VALIDADOR OPERACIONAL (7 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
              
              {/* Header do Validador */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                      Validador Operacional
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Conferência dos classificadores exigidos pelo contrato ativo
                    </p>
                  </div>
                </div>

                {dadosAutorizado && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autorizado: Ativo
                  </span>
                )}
              </div>

              {/* LINHA 1: Contrato Corporativo (dropdown) + Tipo de Chamada + Data e Horário em grade horizontal única */}
              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/90">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5">
                  {/* Contrato Corporativo (5 colunas) */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>Contrato Corporativo</span>
                      </label>
                      <div className="flex items-center gap-1">
                        {contratoModoManual ? (
                          <span className="text-[9px] font-semibold text-slate-700 bg-slate-200 border border-slate-300 px-1 py-0.2 rounded">
                            Manual
                          </span>
                        ) : contratoAutoDetectado ? (
                          <span className="text-[9px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                            IA Auto
                          </span>
                        ) : null}
                        {contratoModoManual && (
                          <button
                            type="button"
                            onClick={() => {
                              setContratoModoManual(false);
                              contratoModoManualRef.current = false;
                            }}
                            className="text-[9px] text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                            title="Ativar detecção inteligente por IA"
                          >
                            Auto IA
                          </button>
                        )}
                      </div>
                    </div>
                    <select
                      value={contratoSelecionadoId}
                      onChange={(e) => {
                        const novoId = e.target.value;
                        setContratoSelecionadoId(novoId);
                        setContratoModoManual(true);
                        contratoModoManualRef.current = true;
                        setContratoAutoDetectado(false);
                        adaptarClassificadoresParaContrato(novoId);
                        calcularEstimativaRota(undefined, undefined, novoId);
                      }}
                      className="w-full h-8 px-2 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none cursor-pointer"
                    >
                      {CONTRATOS_DISPONIVEIS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nomeExibicao}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo de Chamada (3 colunas) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Tipo</label>
                    <select
                      value={formViagem.tipo}
                      onChange={(e) => setFormViagem({ ...formViagem, tipo: e.target.value as any })}
                      className="w-full h-8 px-2 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none cursor-pointer"
                    >
                      <option value="AGENDADO">Agendada (Futura)</option>
                      <option value="IMEDIATO">Imediata (Agora)</option>
                    </select>
                  </div>

                  {/* Data (2 colunas) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Data</label>
                    <input
                      type="date"
                      value={formViagem.data}
                      onChange={(e) => setFormViagem({ ...formViagem, data: e.target.value })}
                      className="w-full h-8 px-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none"
                    />
                  </div>

                  {/* Horário (2 colunas) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Horário</label>
                    <input
                      type="time"
                      value={formViagem.hora}
                      onChange={(e) => setFormViagem({ ...formViagem, hora: e.target.value })}
                      className="w-full h-8 px-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* LINHA 2: Nome Completo do Passageiro + Telefone / WhatsApp lado a lado (50% / 50%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nome Completo do Passageiro</span>
                  </label>
                  <input
                    type="text"
                    value={formPassageiro.nome}
                    placeholder="Nome completo do passageiro..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormPassageiro((prev) => ({ ...prev, nome: val }));
                      setValoresManuais((prev) => ({ ...prev, nomeSolicitante: val }));
                    }}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Telefone / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={formPassageiro.telefone}
                    placeholder="(00) 00000-0000"
                    onChange={(e) => setFormPassageiro((prev) => ({ ...prev, telefone: e.target.value }))}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* LINHA 3: Origem (Embarque) e Destino (Desembarque) em linha dupla compacta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0"></span>
                    <span>Origem (Embarque)</span>
                  </label>
                  <input
                    type="text"
                    value={formOrigem}
                    placeholder="Endereço de partida..."
                    onChange={(e) => setFormOrigem(e.target.value)}
                    onBlur={() => calcularEstimativaRota()}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none text-slate-900 font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 ring-2 ring-slate-100 shrink-0"></span>
                    <span>Destino (Desembarque)</span>
                  </label>
                  <input
                    type="text"
                    value={formDestino}
                    placeholder="Endereço de destino..."
                    onChange={(e) => setFormDestino(e.target.value)}
                    onBlur={() => calcularEstimativaRota()}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none text-slate-900 font-normal"
                  />
                </div>
              </div>

              {/* LINHA 4: Card de Regras de Faturamento e Auditoria com os classificadores em grade de 2 colunas */}
              <ClassificationRuleValidator
                resultado={resultadoRules}
                valoresManuais={valoresManuais}
                onAlterarValor={handleAlterarValorClassificador}
              />

              {/* LINHA 5: Observações para a Frota em campo horizontal de altura reduzida */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Observações para a Frota</span>
                </label>
                <input
                  type="text"
                  value={formObservacoes}
                  placeholder="Informações adicionais para o motorista (ex: portão de entrada, ferramentas, voo)..."
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-200 outline-none text-slate-900 font-normal"
                />
              </div>

              {/* BOTÃO DE AÇÃO PRIMÁRIA FIXO NA BASE COM VISUAL DOMINANTE E SUPORTE A CTRL + ENTER */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 px-4 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 rounded-b-xl border-t border-slate-200 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="text-xs text-slate-600 flex-1 min-w-0">
                  {!resultadoRules.podeDespachar ? (
                    <span className="text-amber-800 font-medium flex items-center gap-1.5 leading-snug">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      Preencha os campos obrigatórios acima para liberar o envio.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1.5 leading-snug">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Requisitos validados! Pressione <kbd className="bg-slate-100 text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-2xs ml-1">Ctrl + Enter</kbd>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!resultadoRules.podeDespachar || despachando}
                  onClick={handleDespacharCorrida}
                  className={`h-11 px-6 rounded-lg font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shrink-0 whitespace-nowrap shadow-sm ${
                    resultadoRules.podeDespachar
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer hover:shadow'
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
                      <span className="hidden lg:inline text-[10px] font-mono opacity-80 font-normal">
                        (Ctrl+Enter)
                      </span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>
          </>
        )}
      </main>

      {/* MODAL DE LOGIN DE DESPACHANTES */}
      <ModalLoginDespachante
        aberto={modalLoginAberto}
        onLoginSucesso={handleLoginSucesso}
        onFechar={() => setModalLoginAberto(false)}
      />

      {/* FOOTER OFICIAL DE CRÉDITOS */}
      <footer className="w-full mt-10 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-[1520px] mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Táxi 2.0 • Despacho Corporativo B2B Inteligente</span>
          </div>

          <div className="flex items-center gap-2.5 font-medium">
            <span>desenvolvido por <a href="https://agenciatx.ia.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">agenciatx.ia.br</a></span>
            <a href="https://postimg.cc/VdPzdcD6" target="_blank" rel="noopener noreferrer" className="inline-block transition-transform hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://i.postimg.cc/dtL3NsC8/atxia-new-08.png" alt="atxia-new-08" className="h-6 w-auto object-contain border-0" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
