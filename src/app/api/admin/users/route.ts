import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        departmentId: true,
        department: {
          select: { id: true, name: true, code: true },
        },
        canCreateOrder: true,
        viewAllStages: true,
        canEmbarcar: true,
        canSeparar: true,
        canFaturar: true,
        canEditOrder: true,
        canCancelOrder: true,
        canManageUsers: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      username,
      password,
      departmentId,
      role = 'USER',
      active = true,
      canCreateOrder = false,
      viewAllStages = false,
      canEmbarcar = false,
      canSeparar = false,
      canFaturar = false,
      canEditOrder = false,
      canCancelOrder = false,
      canManageUsers = false,
    } = body;

    if (!name || !username || !password || !departmentId) {
      return NextResponse.json(
        { error: 'Nome, Usuário, Senha e Departamento são obrigatórios' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este login' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        departmentId,
        role,
        active,
        canCreateOrder,
        viewAllStages,
        canEmbarcar,
        canSeparar,
        canFaturar,
        canEditOrder,
        canCancelOrder,
        canManageUsers,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        departmentId: true,
        department: true,
        canCreateOrder: true,
        viewAllStages: true,
        canEmbarcar: true,
        canSeparar: true,
        canFaturar: true,
        canEditOrder: true,
        canCancelOrder: true,
        canManageUsers: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
