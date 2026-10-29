import { NextRequest, NextResponse } from 'next/server';
import { AiDispatchExtractorService } from '@/lib/ai/extractor';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo, conteudo, mimeType, customApiKey } = body;

    if (!conteudo) {
      return NextResponse.json(
        { error: 'Conteúdo para extração não fornecido.' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-gemini-key') || '';
    const keyToUse = (process.env.GEMINI_API_KEY || customApiKey || headerKey || '').trim();

    if (!keyToUse || keyToUse.includes('...') || keyToUse.length < 20) {
      console.error('[API /api/ai/extract] Chave GEMINI_API_KEY ausente ou inválida no servidor.');
      return NextResponse.json(
        {
          error: 'Chave do Google Gemini (GEMINI_API_KEY) ausente ou inválida nas variáveis de ambiente da Vercel.',
          codigo: 'CHAVE_AUSENTE_OU_INVALIDA',
        },
        { status: 401 }
      );
    }

    const extractor = new AiDispatchExtractorService(keyToUse);
    const resultado = await extractor.extrairSolicitacaoCorrida({
      tipo: tipo || 'TEXTO_LIVRE',
      conteudo,
      mimeType,
      dataReferenciaIso: new Date().toISOString(),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    const status = error.status || 500;
    const mensagem = error.message || 'Falha ao processar solicitação com IA.';
    console.error(`[API /api/ai/extract] Erro (${status}):`, {
      message: mensagem,
      details: error.details || null,
      model: error.model || null,
    });
    return NextResponse.json(
      {
        error: mensagem,
        codigo: error.codigo || 'ERRO_EXTRACAO',
        detalhes: error.details || null,
      },
      { status }
    );
  }
}
