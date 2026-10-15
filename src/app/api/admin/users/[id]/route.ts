import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

interface RouteContext {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
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
    } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== existingUser.username) {
        const usernameInUse = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
        if (usernameInUse) {
          return NextResponse.json(
            { error: 'Este nome de usuário já está em uso' },
            { status: 409 }
          );
        }
        updateData.username = cleanUsername;
      }
    }

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    if (departmentId) updateData.departmentId = departmentId;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = Boolean(active);
    if (canCreateOrder !== undefined) updateData.canCreateOrder = Boolean(canCreateOrder);
    if (viewAllStages !== undefined) updateData.viewAllStages = Boolean(viewAllStages);
    if (canEmbarcar !== undefined) updateData.canEmbarcar = Boolean(canEmbarcar);
    if (canSeparar !== undefined) updateData.canSeparar = Boolean(canSeparar);
    if (canFaturar !== undefined) updateData.canFaturar = Boolean(canFaturar);
    if (canEditOrder !== undefined) updateData.canEditOrder = Boolean(canEditOrder);
    if (canCancelOrder !== undefined) updateData.canCancelOrder = Boolean(canCancelOrder);
    if (canManageUsers !== undefined) updateData.canManageUsers = Boolean(canManageUsers);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do usuário' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (currentUser.id === params.id) {
      return NextResponse.json(
        { error: 'Você não pode desativar seu próprio usuário atual' },
        { status: 400 }
      );
    }

    // Toggle active ou soft delete
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { active: !user.active },
    });

    return NextResponse.json({
      success: true,
      message: updated.active ? 'Usuário ativado com sucesso' : 'Usuário desativado com sucesso',
      active: updated.active,
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}
