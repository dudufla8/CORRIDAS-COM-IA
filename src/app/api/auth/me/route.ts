import { NextRequest, NextResponse } from 'next/server';
import { obterSessaoDeRequest, removerCookieSessao } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await obterSessaoDeRequest(req);
    if (!session) {
      return NextResponse.json({ autenticado: false, usuario: null });
    }

    // Valida se o usuário ainda existe e está ativo no banco
    const usuarioBanco = await prisma.usuario.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        nome: true,
        login: true,
        perfil: true,
        avatarCor: true,
        ativo: true,
      },
    });

    if (!usuarioBanco || !usuarioBanco.ativo) {
      const resp = NextResponse.json({ autenticado: false, usuario: null });
      return removerCookieSessao(resp);
    }

    return NextResponse.json({
      autenticado: true,
      usuario: {
        id: usuarioBanco.id,
        nome: usuarioBanco.nome,
        login: usuarioBanco.login,
        perfil: usuarioBanco.perfil,
        avatarCor: usuarioBanco.avatarCor,
      },
    });
  } catch (error) {
    console.error('[API /api/auth/me] Erro ao validar sessão:', error);
    return NextResponse.json({ autenticado: false, usuario: null }, { status: 500 });
  }
}
