import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Usuário desativado pelo administrador' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      departmentId: user.department.id,
      departmentName: user.department.name,
      departmentCode: user.department.code,
      permissions: {
        canCreateOrder: user.canCreateOrder,
        viewAllStages: user.viewAllStages,
        canEmbarcar: user.canEmbarcar,
        canSeparar: user.canSeparar,
        canFaturar: user.canFaturar,
        canEditOrder: user.canEditOrder,
        canCancelOrder: user.canCancelOrder,
        canManageUsers: user.canManageUsers,
      },
    };

    const token = signToken(payload);

    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar autenticação' },
      { status: 500 }
    );
  }
}
