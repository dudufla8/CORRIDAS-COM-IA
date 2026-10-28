import { NextRequest, NextResponse } from 'next/server';
import { obterTodasCorridas, registrarNovaCorrida, atualizarStatusViaWebhook } from '@/lib/taxi-digital/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const corridas = obterTodasCorridas();
    return NextResponse.json({
      status: true,
      total: corridas.length,
      corridas,
      // Compatibilidade retroativa com chave 'logs'
      logs: corridas.map((c) => ({
        id: c.id,
        timestamp: c.criadoEm,
        operador: c.operador,
        bookingId: c.bookingId,
        voucher: c.voucher,
        status: c.status,
        passageiroNome: c.passageiroNome,
        passageiroTelefone: c.passageiroTelefone,
        contratoId: c.contratoId,
        contratoNome: c.contratoNome,
        data: c.data,
        hora: c.hora,
        tipo: c.tipo,
        origem: c.origem,
        destino: c.destino,
        categoriaNome: c.categoriaNome,
        valorEstimado: c.valorEstimado,
        valorFinal: c.valorFinal,
        motoristaNome: c.motoristaNome,
        veiculoPlaca: c.veiculoPlaca,
        observacoes: c.observacoes,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || (!body.bookingId && !body.voucher)) {
      return NextResponse.json({ status: false, error: 'Dados de corrida/log inválidos' }, { status: 400 });
    }

    // Se for uma requisição de simulação de atualização de status
    if (body.simularWebhook) {
      const atualizada = atualizarStatusViaWebhook({
        bookingId: body.bookingId,
        voucher: body.voucher,
        statusRaw: body.status,
        motoristaNome: body.motoristaNome,
        motoristaTelefone: body.motoristaTelefone,
        veiculoPlaca: body.veiculoPlaca,
        veiculoModelo: body.veiculoModelo,
        valorFinal: body.valorFinal,
      });
      return NextResponse.json({ status: true, corrida: atualizada });
    }

    const novaCorrida = registrarNovaCorrida({
      bookingId: String(body.bookingId || body.voucher || 'TD-AUTO'),
      voucher: String(body.voucher || body.bookingId || 'VCH-AUTO'),
      contratoId: body.contratoId || 'voll-geral',
      contratoNome: body.contratoNome || 'VOLL (Corporativo Geral)',
      passageiroNome: body.passageiroNome || 'Colaborador',
      passageiroTelefone: body.passageiroTelefone || '',
      data: body.data || new Date().toISOString().slice(0, 10),
      hora: body.hora || '08:00',
      tipo: body.tipo === 'IMEDIATO' ? 'IMEDIATO' : 'AGENDADO',
      origem: body.origem || '',
      destino: body.destino || '',
      categoriaNome: body.categoriaNome || 'Táxi Convencional',
      valorEstimado: body.valorEstimado ? Number(body.valorEstimado) : undefined,
      valorFinal: body.valorFinal ? Number(body.valorFinal) : undefined,
      status: body.status || (body.tipo === 'IMEDIATO' ? 'EM_ANDAMENTO' : 'AGENDADA'),
      motoristaNome: body.motoristaNome,
      motoristaTelefone: body.motoristaTelefone,
      veiculoPlaca: body.veiculoPlaca,
      veiculoModelo: body.veiculoModelo,
      operador: body.operador || 'Operador Central',
      operadorEmail: body.operadorEmail,
      classificadores: body.classificadores,
      observacoes: body.observacoes,
    });

    return NextResponse.json({ status: true, corrida: novaCorrida, log: novaCorrida });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
