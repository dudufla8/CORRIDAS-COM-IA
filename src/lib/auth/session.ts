import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const COOKIE_NAME = 'taxi20_session';
const SECRET_KEY = process.env.AUTH_SECRET || 'taxi20-default-jwt-secret-replace-in-env-2026';
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

export interface SessionUser {
  id: string;
  nome: string;
  login: string;
  perfil: 'GESTOR' | 'DESPACHANTE' | 'AUDITOR';
  avatarCor: string;
}

// Controle simples de taxa de tentativas de login por chave (IP + Login)
const loginAttemptsMap = new Map<string, { count: number; blockedUntil: number }>();

export function verificarRateLimit(chave: string): { permitido: boolean; restanteSegundos?: number } {
  const agora = Date.now();
  const registro = loginAttemptsMap.get(chave);

  if (registro) {
    if (agora < registro.blockedUntil) {
      const restanteSegundos = Math.ceil((registro.blockedUntil - agora) / 1000);
      return { permitido: false, restanteSegundos };
    }
    // Se o bloqueio expirou, limpa
    if (registro.blockedUntil && agora >= registro.blockedUntil) {
      loginAttemptsMap.delete(chave);
    }
  }

  return { permitido: true };
}

export function registrarTentativaFalha(chave: string) {
  const agora = Date.now();
  const registro = loginAttemptsMap.get(chave) || { count: 0, blockedUntil: 0 };
  registro.count += 1;

  if (registro.count >= 5) {
    // Bloqueia por 5 minutos após 5 tentativas consecutivas
    registro.blockedUntil = agora + 5 * 60 * 1000;
  }

  loginAttemptsMap.set(chave, registro);
}

export function limparTentativas(chave: string) {
  loginAttemptsMap.delete(chave);
}

export async function criarTokenSessao(usuario: SessionUser): Promise<string> {
  return await new SignJWT({
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    avatarCor: usuario.avatarCor,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(encodedSecret);
}

export async function verificarTokenSessao(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return {
      id: payload.id as string,
      nome: payload.nome as string,
      login: payload.login as string,
      perfil: payload.perfil as 'GESTOR' | 'DESPACHANTE' | 'AUDITOR',
      avatarCor: payload.avatarCor as string,
    };
  } catch {
    return null;
  }
}

export async function obterSessaoDoCookie(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verificarTokenSessao(token);
  } catch {
    return null;
  }
}

export async function obterSessaoDeRequest(req: NextRequest): Promise<SessionUser | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verificarTokenSessao(token);
  } catch {
    return null;
  }
}

export function aplicarCookieSessao(res: NextResponse, token: string): NextResponse {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 horas
  });
  return res;
}

export function removerCookieSessao(res: NextResponse): NextResponse {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
