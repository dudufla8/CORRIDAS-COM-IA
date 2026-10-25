import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: true,
    service: 'Webhook Táxi Digital (APITD v3)',
    timestamp: new Date().toISOString(),
    message: 'Endpoint de webhook ativo e pronto para receber notificações de status da Táxi Digital.',
  });
}

export async function POST(req: NextRequest) {
  try {
    let payload: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      const rawText = await req.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { raw: rawText };
      }
    }

    console.log('[Webhook Táxi Digital Recebido]:', JSON.stringify(payload, null, 2));

    // Mapeamento dos principais campos enviados pela Táxi Digital
    const bookingId = payload.booking_id || payload.id_corrida || payload.corrida_id || payload.id;
    const status = payload.status || payload.status_corrida || payload.situacao;
    const motorista = payload.motorista || payload.driver || {};
    const veiculo = payload.veiculo || payload.vehicle || {};
    const valor = payload.valor_final || payload.valor || payload.total;

    // Resposta padrão 200 OK para a Táxi Digital registrar a entrega com sucesso
    return NextResponse.json({
      status: true,
      message: 'Status de corrida atualizado com sucesso no Portal Táxi 2.0',
      data: {
        bookingId,
        status,
        motorista: motorista.nome || motorista,
        placa: veiculo.placa || payload.placa,
        valorFinal: valor,
        recebidoEm: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Erro no Webhook Táxi Digital]:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Falha ao processar webhook' },
      { status: 500 }
    );
  }
}
