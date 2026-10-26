import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface ContratoConfig {
  uiCliente: string;
  contractNumber: string;
  authorizedId: string;
  userEmail: string;
}

const MAPA_CONTRATOS: Record<string, ContratoConfig> = {
  'claro-voll': {
    uiCliente: '94961e94-143a-49b8-a314-6db0bcb7a48d',
    contractNumber: '201',
    authorizedId: '913b9213-bbe7-4093-82dc-1b343bf85701',
    userEmail: 'tx20@voll.com.br',
  },
  'unipar-voll': {
    uiCliente: '084dbe67-d889-49a6-af3e-8609d9122e23',
    contractNumber: '55002',
    authorizedId: '84217e6b-7382-42fa-b45a-8e7ae627643a',
    userEmail: 'tx20@tx20.com',
  },
  'unipar-direto': {
    uiCliente: '4b5461d2-2dc4-4402-80a2-4ecbf97de9d7',
    contractNumber: '150',
    authorizedId: 'ea54e927-5520-4723-a02b-8461f3c6748a',
    userEmail: 'roberta.ariza@unipar.com',
  },
  'voll-geral': {
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    contractNumber: '55000',
    authorizedId: '6989e993-022a-468f-b6b6-609b455d7102',
    userEmail: 'contato@taxidoispontozero.com.br',
  },
};

async function geocodificarEndereco(endereco: string, fallbackLat = -22.824, fallbackLng = -43.003) {
  try {
    const limpo = endereco.replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim();
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(limpo)}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Taxi20-B2B/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        return { lat: coords[1], lng: coords[0] };
      }
    }
  } catch (e) {
    console.warn('[Geocoding] Falha ao obter coordenadas via Photon:', e);
  }
  return { lat: fallbackLat, lng: fallbackLng };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contratoId,
      passageiroNome,
      passageiroTelefone,
      data,
      hora,
      tipo,
      origem,
      destino,
      classificadores = {},
      observacoes = '',
      categoryId: categoryIdFromBody,
    } = body;

    const baseUrl = process.env.TAXI_DIGITAL_BASE_URL || 'https://api.taxidigital.net/APITD';
    const usuario = process.env.TAXI_DIGITAL_USER || 'apitx20@tx20.com.br';
    const senha = process.env.TAXI_DIGITAL_PASS || '15985232';
    const authHeader = 'Basic ' + Buffer.from(`${usuario}:${senha}`).toString('base64');

    // Mapeamento do contrato corporativo
    const contratoConfig = MAPA_CONTRATOS[contratoId] || MAPA_CONTRATOS['claro-voll'];

    // 1. Geocodificar origem e destino
    const coordsOrigem = await geocodificarEndereco(origem, -22.824, -43.003);
    const coordsDestino = destino ? await geocodificarEndereco(destino, -22.814, -43.247) : null;

    // 2. Formatar data e hora para Táxi Digital (DD/MM/AAAA)
    let dataFormatada = '';
    if (data && data.includes('-')) {
      const [yyyy, mm, dd] = data.split('-');
      dataFormatada = `${dd}/${mm}/${yyyy}`;
    } else {
      const hoje = new Date();
      dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    }
    const horaFormatada = hora || '08:00';
    const dataHoraRef = `${dataFormatada} ${horaFormatada}:00`;

    // 3. Obter Categoria de Táxi para a região (ou utilizar a selecionada pelo operador)
    let categoryId: number | undefined = categoryIdFromBody ? Number(categoryIdFromBody) : undefined;
    if (!categoryId) {
      try {
        const catRes = await fetch(`${baseUrl}/api/booking/categories/json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Versao': '3',
            Authorization: authHeader,
            'X-uiCliente': contratoConfig.uiCliente,
          },
          body: JSON.stringify({
            init_lat: coordsOrigem.lat,
            init_lng: coordsOrigem.lng,
            reference_date: dataHoraRef,
          }),
        });

        if (catRes.ok) {
          const catData = await catRes.json();
          const cats = catData.data?.categories || [];
          if (cats.length > 0) {
            categoryId = Number(cats[0].category_id);
          }
        }
      } catch (catErr) {
        console.warn('[Táxi Digital] Erro ao buscar categoria:', catErr);
      }
    }

    if (!categoryId) {
      categoryId = 13086; // Fallback para categoria padrão da região
    }

    // 4. Formatar telefone (apenas números)
    const telLimpo = (passageiroTelefone || '').replace(/\D/g, '') || '21968140578';
    const ddi = 55;

    // 5. Extrair código de agendamento/voucher do classificador 1 (remover '#' se houver)
    const voucherCodigo = classificadores.classificador1 || `PORTAL-${Date.now()}`;
    const cleanVoucher = voucherCodigo.replace(/^#/, '').trim();

    // Extrair número do endereço se presente
    const matchNumero = (origem || '').match(/,\s*(\d+)/) || (origem || '').match(/\bN[º°]?\s*(\d+)/i);
    const numeroOrigem = matchNumero ? matchNumero[1] : '';

    // 6. Montar classificadores estruturados para a API Táxi Digital
    const classificatorsArray: Array<{ field: number; field_value: string; field_id?: number }> = [];
    classificatorsArray.push({
      field: 1,
      field_value: cleanVoucher,
    });

    if (contratoId === 'claro-voll') {
      // No contrato Claro Voll, o classificador 2 é fixo como 'TÁXI 2.0' (id 5478219)
      classificatorsArray.push({
        field: 2,
        field_id: 5478219,
        field_value: 'TÁXI 2.0',
      });
    } else if (classificadores.classificador2) {
      classificatorsArray.push({
        field: 2,
        field_value: classificadores.classificador2,
      });
    }

    // 7. Hash randômico de 32 caracteres obrigatório pela API Táxi Digital
    const bookingHash = crypto.randomBytes(16).toString('hex');

    // 8. Payload oficial de criação de corrida
    const isAgendada = tipo !== 'IMEDIATO';
    const payloadAdd = {
      user_email: contratoConfig.userEmail,
      user_phone_ddi: ddi,
      user_phone: telLimpo,
      user_name: passageiroNome || 'Colaborador',
      requester_name: passageiroNome || 'Colaborador',
      booking_hash: bookingHash,
      external_authorization_id: cleanVoucher,
      init_address_name: origem || 'Endereço de Embarque',
      init_address_number: numeroOrigem,
      init_address_lat: coordsOrigem.lat,
      init_address_lng: coordsOrigem.lng,
      end_address_name: destino || 'Endereço de Desembarque',
      end_address_lat: coordsDestino ? coordsDestino.lat : undefined,
      end_address_lng: coordsDestino ? coordsDestino.lng : undefined,
      schedule: isAgendada ? 1 : 0,
      schedule_date: dataFormatada,
      schedule_time: horaFormatada,
      schedule_lead_time: 40,
      operator_observation: `${cleanVoucher} ${observacoes}`.trim(),
      contract_number: contratoConfig.contractNumber,
      payment_id: 2, // Voucher Eletrônico
      category_id: categoryId,
      user_platform: 1, // Web
      unique_fields: [
        {
          unique_field: contratoConfig.authorizedId,
          classificators: classificatorsArray,
        },
      ],
    };

    console.log('[Táxi Digital] Transmitindo agendamento para a central:', {
      contrato: contratoConfig.contractNumber,
      passageiro: passageiroNome,
      voucher: voucherCodigo,
      categoria: categoryId,
    });

    const addRes = await fetch(`${baseUrl}/api/booking/add/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Versao': '3',
        Authorization: authHeader,
        'X-uiCliente': contratoConfig.uiCliente,
      },
      body: JSON.stringify(payloadAdd),
    });

    const addData = await addRes.json().catch(() => ({}));

    if (!addRes.ok || addData.status !== 1) {
      console.error('[Táxi Digital Error]', addRes.status, addData);
      return NextResponse.json(
        {
          status: false,
          error: addData.message || 'Falha ao agendar corrida na central Táxi Digital.',
          code: addData.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: true,
      booking_id: String(addData.booking_code || addData.data),
      voucher: voucherCodigo,
      status_corrida: isAgendada ? 'AGENDADA' : 'EM_DESPACHO',
      register_date: addData.register_date,
      message: addData.message || 'Corrida agendada com sucesso na rede Táxi Digital.',
    });
  } catch (error: any) {
    console.error('[Booking Route Error]', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Erro interno ao processar agendamento.',
      },
      { status: 500 }
    );
  }
}
