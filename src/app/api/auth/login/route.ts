import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  aplicarCookieSessao,
  criarTokenSessao,
  limparTentativas,
  registrarTentativaFalha,
  verificarRateLimit,
} from '@/lib/auth/session';

const LoginSchema = z.object({
  login: z.string().min(1, 'Informe o usuário/login'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const parseRes = LoginSchema.safeParse(body);

    if (!parseRes.success) {
      return NextResponse.json(
        { error: parseRes.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const loginNormalizado = parseRes.data.login.trim().toLowerCase();
    const senha = parseRes.data.senha;
    const rateLimitKey = `${ip}:${loginNormalizado}`;

    // Verificação de taxa de tentativas
    const rateLimit = verificarRateLimit(rateLimitKey);
    if (!rateLimit.permitido) {
      return NextResponse.json(
        {
          error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado. Tente novamente em ${rateLimit.restanteSegundos} segundos.`,
        },
        { status: 429 }
      );
    }

    // Busca usuário no banco
    const usuario = await prisma.usuario.findUnique({
      where: { login: loginNormalizado },
    });

    if (!usuario) {
      registrarTentativaFalha(rateLimitKey);
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    if (!usuario.ativo) {
      return NextResponse.json(
        { error: 'Este usuário está inativo no sistema. Procure um Gestor para reativação.' },
        { status: 403 }
      );
    }

    // Validação da senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      registrarTentativaFalha(rateLimitKey);
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    // Sucesso: limpa tentativas e atualiza timestamp de acesso
    limparTentativas(rateLimitKey);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcessoEm: new Date() },
    });

    const sessionUser = {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perfil: usuario.perfil,
      avatarCor: usuario.avatarCor,
    };

    const token = await criarTokenSessao(sessionUser);
    const response = NextResponse.json({
      sucesso: true,
      usuario: sessionUser,
    });

    return aplicarCookieSessao(response, token);
  } catch (error: any) {
    console.error('[API /api/auth/login] Erro interno:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar login.' },
      { status: 500 }
    );
  }
}
