import { NextRequest, NextResponse } from 'next/server';

// Memória em runtime para instâncias ativas do Next.js + resposta JSON
const LOGS_EM_MEMORIA: any[] = [];

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      status: true,
      total: LOGS_EM_MEMORIA.length,
      logs: LOGS_EM_MEMORIA.slice(0, 100),
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const logItem = await req.json();
    if (!logItem || !logItem.bookingId) {
      return NextResponse.json({ status: false, error: 'Dados do log inválidos' }, { status: 400 });
    }

    const itemCompleto = {
      ...logItem,
      id: logItem.id || `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: logItem.timestamp || new Date().toISOString(),
    };

    LOGS_EM_MEMORIA.unshift(itemCompleto);
    if (LOGS_EM_MEMORIA.length > 200) {
      LOGS_EM_MEMORIA.pop();
    }

    return NextResponse.json({ status: true, log: itemCompleto });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
