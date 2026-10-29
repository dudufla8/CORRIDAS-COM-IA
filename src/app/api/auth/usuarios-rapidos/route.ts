import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        login: true,
        perfil: true,
        avatarCor: true,
      },
      orderBy: [
        { perfil: 'asc' },
        { nome: 'asc' },
      ],
      take: 12,
    });

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    console.error('[API /api/auth/usuarios-rapidos] Erro:', error);
    return NextResponse.json({ usuarios: [] });
  }
}
