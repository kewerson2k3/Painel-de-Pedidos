import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Buscar versão mais recente do banco de dados (caso permissões tenham mudado)
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { department: true },
    });

    if (!user || !user.active) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const updatedPayload = {
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

    return NextResponse.json({ user: updatedPayload });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return NextResponse.json({ error: 'Erro ao verificar sessão' }, { status: 500 });
  }
}
