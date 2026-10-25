import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TaxiDigitalConfig,
  GetClientsResponse,
  CheckAuthorizedRequest,
  CheckAuthorizedResponse,
  EstimateBookingRequest,
  EstimateBookingResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from './types';

export class TaxiDigitalApiClient {
  private http: AxiosInstance;
  private config: TaxiDigitalConfig;
  private mockMode: boolean;

  constructor(config?: Partial<TaxiDigitalConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.TAXI_DIGITAL_BASE_URL || 'https://api.taxidigital.net/APITD/',
      usuario: config?.usuario || process.env.TAXI_DIGITAL_USER || '',
      senha: config?.senha || process.env.TAXI_DIGITAL_PASS || '',
      uiClientePadrao: config?.uiClientePadrao || process.env.TAXI_DIGITAL_UI_CLIENTE || '',
      timeoutMs: config?.timeoutMs || 15000,
    };

    this.mockMode = !this.config.usuario || !this.config.senha;

    const authHeader = this.config.usuario && this.config.senha
      ? `Basic ${Buffer.from(`${this.config.usuario}:${this.config.senha}`).toString('base64')}`
      : '';

    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-Versao': '3',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        ...(this.config.uiClientePadrao ? { 'X-uiCliente': this.config.uiClientePadrao } : {}),
      },
    });

    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[Táxi Digital API Error]', error.message);
        return Promise.reject(error);
      }
    );
  }

  async getClients(): Promise<GetClientsResponse> {
    if (this.mockMode) {
      return {
        status: true,
        clients: [
          {
            id: 101,
            nome: 'Unipar Carbocloro S/A',
            razao_social: 'Unipar Carbocloro S.A.',
            cnpj: '45.892.381/0001-92',
            ui_cliente: 'UNIPAR_SP_01',
            ativo: true,
            classificadores_habilitados: [1, 2, 3, 4],
          },
        ],
      };
    }
    const response = await this.http.get<GetClientsResponse>('/api/establishment/clients/json');
    return response.data;
  }

  async checkAuthorized(params: CheckAuthorizedRequest): Promise<CheckAuthorizedResponse> {
    const headers: Record<string, string> = {};
    if (params.ui_cliente) headers['X-uiCliente'] = params.ui_cliente;

    if (this.mockMode) {
      const isValido = !params.unique_field.includes('BLOQUEADO');
      return {
        status: true,
        authorized: {
          id: 'AUTH-9921',
          nome: params.nome || 'Fábio Martins',
          unique_field: params.unique_field,
          email: 'fabio.martins@unipar.com',
          telefone: '(11) 98124-7700',
          departamento: 'Manutenção Industrial',
          centro_custo: 'CC Manutenção 2026',
          status_code: isValido ? 24 : 99,
          status_label: isValido ? 'ATIVO' : 'BLOQUEADO',
          saldo_voucher: 5000.0,
          limite_mensal: 10000.0,
          classificadores_padrao: {
            classificador1: '#UNIPAR-M2026',
            classificador2: 'CC Manutenção 2026',
          },
        },
      };
    }

    const response = await this.http.post<CheckAuthorizedResponse>(
      '/api/user/check_authorized/json',
      { unique_field: params.unique_field, nome: params.nome },
      { headers }
    );
    return response.data;
  }

  async estimateBooking(params: EstimateBookingRequest): Promise<EstimateBookingResponse> {
    const headers: Record<string, string> = {};
    if (params.ui_cliente) headers['X-uiCliente'] = params.ui_cliente;

    if (this.mockMode) {
      return {
        status: true,
        distancia_km: 24.8,
        tempo_estimado_minutos: 38,
        valor_estimado: 78.50,
        tarifa_bandeira: 1,
        detalhes_rota: {
          origem_resolvida: `${params.origem.endereco}`,
          destino_resolvido: `${params.destino.endereco}`,
        },
      };
    }

    const response = await this.http.post<EstimateBookingResponse>(
      '/api/booking/estimate/json',
      params,
      { headers }
    );
    return response.data;
  }

  async createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
    const headers: Record<string, string> = {};
    if (params.ui_cliente) headers['X-uiCliente'] = params.ui_cliente;

    const payload = {
      authorized_id: params.authorized_id,
      passageiro_nome: params.passageiro_nome,
      passageiro_telefone: params.passageiro_telefone,
      imediata: params.imediata,
      data_hora: params.data_hora_agendamento || null,
      origem: params.origem,
      destino: params.destino,
      tipo_pagamento: params.tipo_pagamento,
      ...params.classificadores,
      observacoes: params.observacoes,
      referencia_portal: params.referencia_externa,
    };

    if (this.mockMode) {
      throw new Error(
        'Acesso direto ao cliente Táxi Digital sem credenciais. O agendamento deve ser efetuado através da rota de servidor segura /api/taxi-digital/booking.'
      );
    }

    const response = await this.http.post<CreateBookingResponse>(
      '/api/booking/json',
      payload,
      { headers }
    );
    return response.data;
  }
}
