import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { obterSessaoDeRequest } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const EditarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  perfil: z.enum(['GESTOR', 'DESPACHANTE', 'AUDITOR']).optional(),
  ativo: z.boolean().optional(),
  novaSenha: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres').optional().or(z.literal('')),
  avatarCor: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await obterSessaoDeRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (session.perfil !== 'GESTOR') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o perfil GESTOR pode editar usuários.' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    const usuarioAtual = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioAtual) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseRes = EditarUsuarioSchema.safeParse(body);

    if (!parseRes.success) {
      return NextResponse.json(
        { error: parseRes.error.errors[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const { nome, perfil, ativo, novaSenha, avatarCor } = parseRes.data;

    // REGRA DE SEGURANÇA OBRIGATÓRIA:
    // Impeça o Gestor de desativar ou rebaixar a si mesmo se for o último Gestor ativo.
    const estaDesativandoGestor = usuarioAtual.perfil === 'GESTOR' && usuarioAtual.ativo && ativo === false;
    const estaRebaixandoGestor = usuarioAtual.perfil === 'GESTOR' && perfil && perfil !== 'GESTOR';

    if (estaDesativandoGestor || estaRebaixandoGestor) {
      const gestoresAtivosCount = await prisma.usuario.count({
        where: {
          perfil: 'GESTOR',
          ativo: true,
        },
      });

      if (gestoresAtivosCount <= 1) {
        return NextResponse.json(
          {
            error:
              'Operação bloqueada: Não é permitido desativar ou alterar o perfil do único Gestor ativo no sistema. Promova outro usuário a Gestor antes de efetuar esta alteração.',
          },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: any = {};
    if (nome !== undefined) dataToUpdate.nome = nome.trim();
    if (perfil !== undefined) dataToUpdate.perfil = perfil;
    if (ativo !== undefined) dataToUpdate.ativo = ativo;
    if (avatarCor !== undefined) dataToUpdate.avatarCor = avatarCor;

    if (novaSenha && novaSenha.trim().length >= 8) {
      dataToUpdate.senhaHash = await bcrypt.hash(novaSenha.trim(), 10);
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
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

    return NextResponse.json({ sucesso: true, usuario: usuarioAtualizado });
  } catch (error: any) {
    console.error(`[API PATCH /api/usuarios/${params.id}] Erro:`, error);
    return NextResponse.json({ error: 'Falha interna ao atualizar usuário.' }, { status: 500 });
  }
}
