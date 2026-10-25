export interface TaxiDigitalConfig {
  baseUrl?: string;
  usuario: string;
  senha: string;
  uiClientePadrao?: string;
  timeoutMs?: number;
}

export interface TaxiDigitalEstablishmentClient {
  id: string | number;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  ui_cliente: string;
  ativo: boolean;
  classificadores_habilitados?: number[];
}

export interface GetClientsResponse {
  status: boolean;
  code?: number;
  message?: string;
  clients: TaxiDigitalEstablishmentClient[];
}

export interface CheckAuthorizedRequest {
  ui_cliente?: string;
  nome?: string;
  unique_field: string;
}

export interface CheckAuthorizedResponse {
  status: boolean;
  code?: number;
  message?: string;
  authorized?: {
    id: string | number;
    nome: string;
    unique_field: string;
    email?: string;
    telefone?: string;
    departamento?: string;
    centro_custo?: string;
    status_code: number;     // 24 = ATIVO
    status_label?: string;
    saldo_voucher?: number;
    limite_mensal?: number;
    classificadores_padrao?: Record<string, string>;
  };
}

export interface CoordenadaGeo {
  latitude: number;
  longitude: number;
  endereco: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface EstimateBookingRequest {
  ui_cliente?: string;
  origem: CoordenadaGeo;
  destino: CoordenadaGeo;
  categoria_veiculo?: string;
}

export interface EstimateBookingResponse {
  status: boolean;
  code?: number;
  distancia_km: number;
  tempo_estimado_minutos: number;
  valor_estimado: number;
  tarifa_bandeira?: number;
  detalhes_rota?: {
    polyline?: string;
    origem_resolvida: string;
    destino_resolvido: string;
  };
}

export interface ClassificadoresTaxiDigital {
  classificador1?: string;
  classificador2?: string;
  classificador3?: string;
  classificador4?: string;
  classificador5?: string;
  classificador6?: string;
  classificador7?: string;
  classificador8?: string;
  classificador9?: string;
  classificador10?: string;
  classificador11?: string;
  classificador12?: string;
  classificador13?: string;
  classificador14?: string;
  classificador15?: string;
  classificador16?: string;
  classificador17?: string;
  classificador18?: string;
  classificador19?: string;
  classificador20?: string;
}

export interface CreateBookingRequest {
  ui_cliente?: string;
  authorized_id: string | number;
  imediata: boolean;
  data_hora_agendamento?: string;
  passageiro_nome: string;
  passageiro_telefone: string;
  origem: CoordenadaGeo;
  destino?: CoordenadaGeo;
  tipo_pagamento: 'VOUCHER_DIGITAL' | 'FATURADO';
  classificadores: ClassificadoresTaxiDigital;
  observacoes?: string;
  referencia_externa?: string;
}

export interface CreateBookingResponse {
  status: boolean;
  code?: number;
  message?: string;
  booking_id: string | number;
  voucher_codigo?: string;
  status_corrida?: string;
  previsao_chegada_motorista_minutos?: number;
  valor_estimado?: number;
}
