import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { obterSessaoDeRequest } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CriarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  login: z
    .string()
    .min(3, 'Login deve ter no mínimo 3 caracteres')
    .max(50, 'Login muito longo')
    .regex(/^[a-z0-9._-]+$/, 'Login deve conter apenas letras minúsculas, números, ponto, hífen ou underline'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  perfil: z.enum(['GESTOR', 'DESPACHANTE', 'AUDITOR'], {
    errorMap: () => ({ message: 'Perfil inválido. Escolha GESTOR, DESPACHANTE ou AUDITOR' }),
  }),
  avatarCor: z.string().optional().default('bg-blue-600'),
});

// GET /api/usuarios - Lista todos os usuários (apenas para GESTOR)
export async function GET(req: NextRequest) {
  try {
    const session = await obterSessaoDeRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (session.perfil !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o perfil GESTOR pode gerenciar usuários.' },
        { status: 403 }
      );
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        login: true,
        perfil: true,
        avatarCor: true,
        ativo: true,
        criadoEm: true,
        ultimoAcessoEm: true,
      },
      orderBy: [
        { ativo: 'desc' },
        { perfil: 'asc' },
        { nome: 'asc' },
      ],
    });

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    console.error('[API GET /api/usuarios] Erro:', error);
    return NextResponse.json({ error: 'Falha ao listar usuários.' }, { status: 500 });
  }
}

// POST /api/usuarios - Cria um novo usuário (apenas para GESTOR)
export async function POST(req: NextRequest) {
  try {
    const session = await obterSessaoDeRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (session.perfil !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o perfil GESTOR pode cadastrar novos usuários.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseRes = CriarUsuarioSchema.safeParse(body);

    if (!parseRes.success) {
      return NextResponse.json(
        { error: parseRes.error.errors[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { nome, login, senha, perfil, avatarCor } = parseRes.data;
    const loginNormalizado = login.trim().toLowerCase();

    // Verifica se login já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { login: loginNormalizado },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: `O login "${loginNormalizado}" já está em uso por outro operador.` },
        { status: 409 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        login: loginNormalizado,
        senhaHash,
        perfil,
        avatarCor: avatarCor || 'bg-blue-600',
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        login: true,
        perfil: true,
        avatarCor: true,
        ativo: true,
        criadoEm: true,
        ultimoAcessoEm: true,
      },
    });

    return NextResponse.json({ sucesso: true, usuario: novoUsuario }, { status: 201 });
  } catch (error: any) {
    console.error('[API POST /api/usuarios] Erro:', error);
    return NextResponse.json({ error: 'Falha interna ao criar usuário.' }, { status: 500 });
  }
}
