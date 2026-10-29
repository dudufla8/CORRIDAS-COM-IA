import { NextResponse } from 'next/server';
import { removerCookieSessao } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ sucesso: true, mensagem: 'Sessão encerrada com sucesso.' });
  return removerCookieSessao(response);
}
