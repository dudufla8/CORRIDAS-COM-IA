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
    const keyToUse = process.env.GEMINI_API_KEY || customApiKey || headerKey || '';

    const extractor = new AiDispatchExtractorService(keyToUse);
    const resultado = await extractor.extrairSolicitacaoCorrida({
      tipo: tipo || 'TEXTO_LIVRE',
      conteudo,
      mimeType,
      dataReferenciaIso: new Date().toISOString(),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Erro no endpoint de extração por IA:', error);
    return NextResponse.json(
      { error: error.message || 'Falha interna ao processar IA multimodal.' },
      { status: 500 }
    );
  }
}
