// ==============================================================================
// STORE CENTRAL DE CORRIDAS AO VIVO & EVENTOS DE WEBHOOK (TÁXI DIGITAL)
// ==============================================================================

export interface EventoCorrida {
  timestamp: string;
  status: string;
  descricao: string;
}

export interface CorridaAoVivo {
  id: string;
  bookingId: string;
  voucher: string;
  contratoId: string;
  contratoNome: string;
  passageiroNome: string;
  passageiroTelefone: string;
  data: string;
  hora: string;
  tipo: 'AGENDADO' | 'IMEDIATO';
  origem: string;
  destino: string;
  categoriaNome: string;
  valorEstimado?: number;
  valorFinal?: number;
  status: 'AGENDADA' | 'MOTORISTA_A_CAMINHO' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  motoristaNome?: string;
  motoristaTelefone?: string;
  veiculoPlaca?: string;
  veiculoModelo?: string;
  operador: string;
  operadorEmail?: string;
  classificadores?: Record<string, any>;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
  eventos: EventoCorrida[];
}

// Global singleton para reter estado entre invocações Next.js no servidor
declare global {
  // eslint-disable-next-line no-var
  var __TAXI20_CORRIDAS_STORE__: CorridaAoVivo[] | undefined;
}

if (!global.__TAXI20_CORRIDAS_STORE__) {
  global.__TAXI20_CORRIDAS_STORE__ = [];
}

const corridasStore: CorridaAoVivo[] = global.__TAXI20_CORRIDAS_STORE__;

export function obterTodasCorridas(): CorridaAoVivo[] {
  return [...corridasStore];
}

export function registrarNovaCorrida(dados: Omit<CorridaAoVivo, 'id' | 'criadoEm' | 'atualizadoEm' | 'eventos'>): CorridaAoVivo {
  const agora = new Date().toISOString();
  const id = `CORRIDA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const nova: CorridaAoVivo = {
    ...dados,
    id,
    criadoEm: agora,
    atualizadoEm: agora,
    eventos: [
      {
        timestamp: agora,
        status: dados.status || 'AGENDADA',
        descricao: `Agendamento criado com sucesso pelo despachante ${dados.operador}.`,
      },
    ],
  };

  // Se já existir registro com o mesmo bookingId ou voucher, atualiza
  const indexExistente = corridasStore.findIndex(
    (c) => (dados.bookingId && c.bookingId === dados.bookingId) || (dados.voucher && c.voucher === dados.voucher)
  );

  if (indexExistente >= 0) {
    corridasStore[indexExistente] = { ...corridasStore[indexExistente], ...nova, atualizadoEm: agora };
    return corridasStore[indexExistente];
  }

  corridasStore.unshift(nova);
  if (corridasStore.length > 500) {
    corridasStore.pop();
  }

  return nova;
}

export function atualizarStatusViaWebhook(params: {
  bookingId?: string;
  voucher?: string;
  statusRaw?: string;
  motoristaNome?: string;
  motoristaTelefone?: string;
  veiculoPlaca?: string;
  veiculoModelo?: string;
  valorFinal?: number;
}): CorridaAoVivo | null {
  const agora = new Date().toISOString();
  const identificador = (params.bookingId || params.voucher || '').trim().toLowerCase();

  let corrida = corridasStore.find(
    (c) =>
      (params.bookingId && c.bookingId.toLowerCase() === params.bookingId.toLowerCase()) ||
      (params.voucher && c.voucher.toLowerCase() === params.voucher.toLowerCase())
  );

  // Normalização do status Táxi Digital
  let statusNormalizado: CorridaAoVivo['status'] = 'AGENDADA';
  const s = (params.statusRaw || '').toUpperCase();
  if (s.includes('CONCLU') || s.includes('FINAL') || s === 'COMPLETED') {
    statusNormalizado = 'CONCLUIDA';
  } else if (s.includes('ANDAMENTO') || s.includes('IN_PROGRESS') || s.includes('EM_VIAGEM')) {
    statusNormalizado = 'EM_ANDAMENTO';
  } else if (s.includes('CAMINHO') || s.includes('ACCEPTED') || s.includes('ACEITO') || s.includes('MOTORISTA')) {
    statusNormalizado = 'MOTORISTA_A_CAMINHO';
  } else if (s.includes('CANCEL') || s.includes('REJECT')) {
    statusNormalizado = 'CANCELADA';
  } else {
    statusNormalizado = 'AGENDADA';
  }

  if (corrida) {
    corrida.status = statusNormalizado;
    corrida.atualizadoEm = agora;
    if (params.motoristaNome) corrida.motoristaNome = params.motoristaNome;
    if (params.motoristaTelefone) corrida.motoristaTelefone = params.motoristaTelefone;
    if (params.veiculoPlaca) corrida.veiculoPlaca = params.veiculoPlaca;
    if (params.veiculoModelo) corrida.veiculoModelo = params.veiculoModelo;
    if (params.valorFinal !== undefined && params.valorFinal !== null) {
      corrida.valorFinal = Number(params.valorFinal);
    }

    corrida.eventos.push({
      timestamp: agora,
      status: statusNormalizado,
      descricao: `Atualização de status via Webhook Táxi Digital (${params.statusRaw || statusNormalizado}).`,
    });

    return corrida;
  }

  // Se não foi encontrada, cria um registro rápido com o webhook
  const novoRegistro: CorridaAoVivo = {
    id: `WH-${Date.now()}`,
    bookingId: params.bookingId || 'TD-SEM-ID',
    voucher: params.voucher || 'VCH-EXT',
    contratoId: 'voll-geral',
    contratoNome: 'VOLL (Corporativo Geral)',
    passageiroNome: 'Passageiro Informado na Frota',
    passageiroTelefone: '',
    data: agora.slice(0, 10),
    hora: agora.slice(11, 16),
    tipo: 'IMEDIATO',
    origem: 'Origem Frota Táxi Digital',
    destino: 'Destino Frota Táxi Digital',
    categoriaNome: 'Táxi Convencional',
    status: statusNormalizado,
    motoristaNome: params.motoristaNome,
    motoristaTelefone: params.motoristaTelefone,
    veiculoPlaca: params.veiculoPlaca,
    veiculoModelo: params.veiculoModelo,
    valorFinal: params.valorFinal ? Number(params.valorFinal) : undefined,
    operador: 'Sistema / Webhook TD',
    criadoEm: agora,
    atualizadoEm: agora,
    eventos: [
      {
        timestamp: agora,
        status: statusNormalizado,
        descricao: `Corrida recebida diretamente via Webhook Táxi Digital.`,
      },
    ],
  };

  corridasStore.unshift(novoRegistro);
  return novoRegistro;
}
