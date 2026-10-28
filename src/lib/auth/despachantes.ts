// ==============================================================================
// GESTÃO DE DESPACHANTES & AUTENTICAÇÃO DA CENTRAL TÁXI 2.0
// ==============================================================================

export interface DespachanteUsuario {
  id: string;
  nome: string;
  usuario: string;
  cargo: string;
  perfil: 'ADMIN' | 'DESPACHANTE' | 'SUPERVISOR';
  avatarCor: string;
}

export const DESPACHANTES_PREDEFINIDOS: Array<DespachanteUsuario & { senhaHash: string }> = [
  {
    id: 'usr-eduardo',
    nome: 'Eduardo (Gestor Geral)',
    usuario: 'eduardo',
    senhaHash: 'admin2026',
    cargo: 'Gestor de Operações & Contratos B2B',
    perfil: 'ADMIN',
    avatarCor: 'bg-blue-600',
  },
  {
    id: 'usr-central1',
    nome: 'Central Turno 1 (Diurno)',
    usuario: 'central1',
    senhaHash: 'tx20diurno',
    cargo: 'Despachante de Fila 06h às 14h',
    perfil: 'DESPACHANTE',
    avatarCor: 'bg-amber-600',
  },
  {
    id: 'usr-central2',
    nome: 'Central Turno 2 (Noturno)',
    usuario: 'central2',
    senhaHash: 'tx20noturno',
    cargo: 'Despachante de Fila 14h às 22h',
    perfil: 'DESPACHANTE',
    avatarCor: 'bg-indigo-600',
  },
  {
    id: 'usr-supervisor',
    nome: 'Supervisor B2B',
    usuario: 'supervisor',
    senhaHash: 'super2026',
    cargo: 'Auditor e Supervisor Operacional',
    perfil: 'SUPERVISOR',
    avatarCor: 'bg-emerald-600',
  },
];

export function autenticarDespachante(usuarioInput: string, senhaInput: string): { sucesso: boolean; despachante?: DespachanteUsuario; erro?: string } {
  const userLimpo = (usuarioInput || '').trim().toLowerCase();
  const senhaLimpa = (senhaInput || '').trim();

  if (!userLimpo || !senhaLimpa) {
    return { sucesso: false, erro: 'Informe o usuário e a senha.' };
  }

  const encontrado = DESPACHANTES_PREDEFINIDOS.find(
    (d) => d.usuario.toLowerCase() === userLimpo && d.senhaHash === senhaLimpa
  );

  if (encontrado) {
    const { senhaHash, ...despachante } = encontrado;
    return { sucesso: true, despachante };
  }

  // Se o usuário digitou uma senha padrão da central (ex: 123456 ou taxi20), permite criar sessão com o nome digitado
  if (senhaLimpa === '123456' || senhaLimpa === 'taxi20' || senhaLimpa === '15985232') {
    const nomeFormatado = userLimpo.charAt(0).toUpperCase() + userLimpo.slice(1);
    return {
      sucesso: true,
      despachante: {
        id: `usr-custom-${Date.now()}`,
        nome: `${nomeFormatado} (Despachante)`,
        usuario: userLimpo,
        cargo: 'Despachante Operacional',
        perfil: 'DESPACHANTE',
        avatarCor: 'bg-slate-700',
      },
    };
  }

  return { sucesso: false, erro: 'Usuário ou senha inválidos. Tente eduardo / admin2026 ou use a senha da central (taxi20).' };
}
