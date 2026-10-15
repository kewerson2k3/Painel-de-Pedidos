import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'painel-pedidos-super-secret-jwt-key-2026-totvs';
const COOKIE_NAME = 'painel_session';

export interface AuthUserPayload {
  id: string;
  name: string;
  username: string;
  role: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  permissions: {
    canCreateOrder: boolean;
    viewAllStages: boolean;
    canEmbarcar: boolean;
    canSeparar: boolean;
    canFaturar: boolean;
    canEditOrder: boolean;
    canCancelOrder: boolean;
    canManageUsers: boolean;
  };
}

export function signToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUserPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getCurrentUserFromReq(req: NextRequest): AuthUserPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
