import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const where: any = { active: true };

    const isGlobalViewer =
      user.role === 'ADMIN' ||
      user.departmentCode === 'TI' ||
      user.departmentCode === 'GERENCIA_SUPERVISAO';

    if (!isGlobalViewer) {
      const isLogisticaOrAlmox =
        user.departmentCode === 'LOGISTICA' ||
        user.departmentCode === 'ALMOXARIFADO' ||
        user.departmentCode === 'TRANSPORTE' ||
        user.permissions.canEmbarcar ||
        user.permissions.canSeparar;

      if (isLogisticaOrAlmox) {
        // Logística e Almoxarifado visualizam usuários de ambos os setores + Transporte
        where.department = {
          code: { in: ['LOGISTICA', 'ALMOXARIFADO', 'TRANSPORTE'] },
        };
      } else {
        // Demais departamentos (ex: Faturamento, Comercial, Assistência Técnica) só visualizam usuários do mesmo departamento
        where.departmentId = user.departmentId;
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        department: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro ao buscar lista de usuários' }, { status: 500 });
  }
}
