import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const login = (process.env.SEED_GESTOR_LOGIN || 'eduardo').trim().toLowerCase();
  const senha = process.env.SEED_GESTOR_SENHA?.trim();

  if (!senha) {
    console.warn(
      '[AVISO SEED] Variável SEED_GESTOR_SENHA não configurada no ambiente. Para cadastrar o primeiro Gestor via seed, configure SEED_GESTOR_LOGIN e SEED_GESTOR_SENHA (mínimo 8 caracteres) no .env.'
    );
    return;
  }

  if (senha.length < 8) {
    throw new Error('A senha definida em SEED_GESTOR_SENHA deve conter no mínimo 8 caracteres.');
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const gestor = await prisma.usuario.upsert({
    where: { login },
    update: {
      senhaHash,
      ativo: true,
      perfil: 'GESTOR',
    },
    create: {
      nome: 'Eduardo (Gestor Geral)',
      login,
      senhaHash,
      perfil: 'GESTOR',
      avatarCor: 'bg-blue-600',
      ativo: true,
    },
  });

  console.log(`[SEED] Usuário Gestor configurado com sucesso: ${gestor.login} (${gestor.nome}) [${gestor.perfil}]`);
}

main()
  .catch((e) => {
    console.error('[SEED ERRO]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
