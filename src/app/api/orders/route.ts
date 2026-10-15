import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ORDER_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const queueOnly = searchParams.get('queue') === 'true';
    const filterUserId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const allParam = searchParams.get('all') === 'true';

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitParam || '10', 10) || 10);

    // Construção das condições de visibilidade por departamento/permissões
    const isGerencia = user.departmentCode === 'GERENCIA_SUPERVISAO';
    const isTi = user.role === 'ADMIN' || user.departmentCode === 'TI';
    const isGlobalViewer = isTi || isGerencia;

    const isFaturamento = !isGlobalViewer && user.departmentCode === 'FATURAMENTO';
    const isLogistica =
      !isGlobalViewer &&
      (user.departmentCode === 'LOGISTICA' ||
        user.departmentCode === 'TRANSPORTE' ||
        user.permissions?.canEmbarcar);
    const isAlmoxarifado =
      !isGlobalViewer &&
      (user.departmentCode === 'ALMOXARIFADO' ||
        user.permissions?.canSeparar);

    const whereConditions: any = {};

    // Se for departamento Faturamento: visualiza APENAS as etapas de Aguardando Nota Fiscal e Faturado
    if (isFaturamento) {
      const allowedFat = [ORDER_STATUS.AGUARDANDO_NOTA_FISCAL, ORDER_STATUS.FATURADO];
      if (statusFilter && allowedFat.includes(statusFilter as any)) {
        whereConditions.status = statusFilter;
      } else {
        whereConditions.status = { in: allowedFat };
      }
    } else if (statusFilter && statusFilter !== 'ALL') {
      // 2. Filtro específico de status se solicitado
      whereConditions.status = statusFilter;
    }

    // 1. Filtro de busca textual
    if (search.trim()) {
      whereConditions.OR = [
        { orderNumber: { contains: search.trim() } },
        { customerName: { contains: search.trim() } },
        { customerCode: { contains: search.trim() } },
      ];
    }

    // Filtro por intervalo de datas de criação (De / Até)
    if (startDate.trim() || endDate.trim()) {
      whereConditions.createdAt = {};
      if (startDate.trim()) {
        const start = new Date(startDate.trim());
        start.setHours(0, 0, 0, 0);
        whereConditions.createdAt.gte = start;
      }
      if (endDate.trim()) {
        const end = new Date(endDate.trim());
        end.setHours(23, 59, 59, 999);
        whereConditions.createdAt.lte = end;
      }
    }

    // 3. Filtro por usuário específico (criador, operador de embarque, separação ou faturamento)
    let targetUserFilter: any = null;
    if (filterUserId.trim()) {
      const targetUser = await prisma.user.findUnique({
        where: { id: filterUserId.trim() },
        include: { department: true },
      });

      if (targetUser) {
        const isTargetGlobal =
          targetUser.role === 'ADMIN' ||
          targetUser.department?.code === 'TI' ||
          targetUser.department?.code === 'GERENCIA_SUPERVISAO';

        // Se o usuário filtrado for T.I ou Gerência/Supervisão, ele é um supervisor/visualizador global.
        // Não restringimos a esteira para createdById=targetUser.id, mantendo a visão global completa.
        if (!isTargetGlobal) {
          const isTargetLogistica =
            targetUser.department?.code === 'LOGISTICA' ||
            targetUser.department?.code === 'TRANSPORTE' ||
            targetUser.canEmbarcar;
          const isTargetAlmoxarifado =
            targetUser.department?.code === 'ALMOXARIFADO' ||
            targetUser.canSeparar;
          const isTargetFaturamento =
            targetUser.department?.code === 'FATURAMENTO' ||
            targetUser.canFaturar;
          const isTargetSolicitante =
            targetUser.department?.code === 'COMERCIAL' ||
            targetUser.department?.code === 'ASSISTENCIA_TECNICA' ||
            targetUser.department?.code === 'LICITACAO';

          const userConditions: any[] = [
            { createdById: targetUser.id },
            { embarqueUserId: targetUser.id },
            { separationUserId: targetUser.id },
            { invoiceUserId: targetUser.id },
          ];

          if (isTargetLogistica) {
            userConditions.push({ status: ORDER_STATUS.AGUARDANDO_EMBARQUE });
          }
          if (isTargetAlmoxarifado) {
            userConditions.push({ status: ORDER_STATUS.AGUARDANDO_SEPARACAO });
          }
          if (isTargetFaturamento) {
            userConditions.push({ status: ORDER_STATUS.AGUARDANDO_NOTA_FISCAL });
          }
          if (isTargetSolicitante) {
            userConditions.push({
              AND: [
                { status: ORDER_STATUS.PENDENTE_AJUSTE },
                { createdBy: { departmentId: targetUser.departmentId } },
              ],
            });
          }

          targetUserFilter = { OR: userConditions };
          whereConditions.AND = [
            ...(whereConditions.AND || []),
            targetUserFilter,
          ];
        }
      }
    }

    // 4. Regra de visibilidade baseada no perfil e departamento do usuário:
    if (!isGlobalViewer) {
      if (queueOnly) {
        // Aba "Minha Fila" - Pedidos que aguardam ação direta do departamento
        if (isLogistica && !isAlmoxarifado && !isFaturamento) {
          whereConditions.status = ORDER_STATUS.AGUARDANDO_EMBARQUE;
        } else if (isAlmoxarifado && !isLogistica && !isFaturamento) {
          whereConditions.status = ORDER_STATUS.AGUARDANDO_SEPARACAO;
        } else if (isFaturamento) {
          whereConditions.status = ORDER_STATUS.AGUARDANDO_NOTA_FISCAL;
        } else {
          // Para outros setores (Comercial, Assistência Técnica, Licitação), a fila são os pedidos ativos criados por eles
          whereConditions.createdBy = { departmentId: user.departmentId };
          whereConditions.status = {
            in: [
              ORDER_STATUS.AGUARDANDO_EMBARQUE,
              ORDER_STATUS.AGUARDANDO_SEPARACAO,
              ORDER_STATUS.AGUARDANDO_NOTA_FISCAL,
              ORDER_STATUS.PENDENTE_AJUSTE,
            ],
          };
        }
      } else {
        // Visão normal de listagem
        const visibilityOr: any[] = [];

        // Quem incluiu ou pertence ao departamento solicitante vê todo o processo do início ao fim
        visibilityOr.push({ createdBy: { departmentId: user.departmentId } });

        // Logística e Almoxarifado podem visualizar todas as etapas da esteira
        if (isLogistica || isAlmoxarifado) {
          visibilityOr.push({
            status: {
              in: [
                ORDER_STATUS.AGUARDANDO_EMBARQUE,
                ORDER_STATUS.AGUARDANDO_SEPARACAO,
                ORDER_STATUS.AGUARDANDO_NOTA_FISCAL,
                ORDER_STATUS.FATURADO,
                ORDER_STATUS.PENDENTE_AJUSTE,
              ],
            },
          });
        }

        // Faturamento vê apenas Aguardando Nota Fiscal e Faturado
        if (isFaturamento) {
          visibilityOr.push({
            status: { in: [ORDER_STATUS.AGUARDANDO_NOTA_FISCAL, ORDER_STATUS.FATURADO] },
          });
        }

        whereConditions.AND = [
          ...(whereConditions.AND || []),
          { OR: visibilityOr },
        ];
      }
    }

    // 5. REGRA ESTRITA PARA PEDIDOS CANCELADOS:
    // Pedidos cancelados NÃO devem aparecer para nenhum outro departamento ou etapa,
    // ficando visíveis APENAS para o usuário que criou (ou Administrador geral)
    if (user.role !== 'ADMIN') {
      whereConditions.NOT = [
        ...(whereConditions.NOT || []),
        {
          AND: [
            { status: ORDER_STATUS.CANCELADO },
            { createdById: { not: user.id } },
          ],
        },
      ];
    }

    // Contagem total de pedidos que atendem aos filtros atuais (para a paginação)
    const totalOrders = await prisma.order.count({
      where: whereConditions,
    });
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    // Buscar pedidos com suporte à paginação (ou todos se allParam === true)
    const findArgs: any = {
      where: whereConditions,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            department: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { isUrgent: 'desc' },
        { createdAt: 'asc' },
      ],
    };

    if (!allParam) {
      findArgs.skip = (page - 1) * limit;
      findArgs.take = limit;
    }

    const orders = await prisma.order.findMany(findArgs);

    // Mascarar campos de observação para departamentos que não possuem permissão de visualização
    const sanitizedOrders = orders.map((order) => {
      const isCreator = order.createdById === user.id;
      const isAdmin = user.role === 'ADMIN';

      // Observação de Separação: visualizado apenas por Logística, Almoxarifado, Criador ou Admin
      const isSeparationDept =
        user.departmentCode === 'LOGISTICA' || user.departmentCode === 'ALMOXARIFADO';
      const isFaturamentoDept = user.departmentCode === 'FATURAMENTO';
      const isTransporteDept = user.departmentCode === 'TRANSPORTE';

      const canViewSeparation = isAdmin || isCreator || isSeparationDept;
      const canViewFiscal = isAdmin || isCreator || isFaturamentoDept;
      const canViewDelivery = isAdmin || isCreator || isTransporteDept;

      return {
        ...order,
        separationNotes: canViewSeparation ? order.separationNotes : null,
        fiscalNotes: canViewFiscal ? order.fiscalNotes : null,
        deliveryNotes: canViewDelivery ? order.deliveryNotes : null,
      };
    });

    // Contadores globais para os cards de métricas (respeitando visibilidade)
    let baseCountFilter: any = {};
    if (isGlobalViewer || isLogistica || isAlmoxarifado) {
      baseCountFilter = {};
    } else if (isFaturamento) {
      baseCountFilter = {
        status: { in: [ORDER_STATUS.AGUARDANDO_NOTA_FISCAL, ORDER_STATUS.FATURADO] },
      };
    } else {
      // Setores solicitantes (Comercial, Assistência Técnica, Licitação)
      baseCountFilter = { createdBy: { departmentId: user.departmentId } };
    }

    if (user.role !== 'ADMIN') {
      baseCountFilter.NOT = [
        ...(baseCountFilter.NOT || []),
        {
          AND: [
            { status: ORDER_STATUS.CANCELADO },
            { createdById: { not: user.id } },
          ],
        },
      ];
    }

    // Se houver filtro de datas (De / Até), atualiza os contadores dos cards para o período
    if (startDate.trim() || endDate.trim()) {
      baseCountFilter.createdAt = {};
      if (startDate.trim()) {
        const start = new Date(startDate.trim());
        start.setHours(0, 0, 0, 0);
        baseCountFilter.createdAt.gte = start;
      }
      if (endDate.trim()) {
        const end = new Date(endDate.trim());
        end.setHours(23, 59, 59, 999);
        baseCountFilter.createdAt.lte = end;
      }
    }

    // Se houver filtro por usuário específico (e não for supervisor global), reflete com exatidão nos contadores
    if (targetUserFilter) {
      baseCountFilter.AND = [
        ...(baseCountFilter.AND || []),
        targetUserFilter,
      ];
    }

    const [countEmbarque, countSeparacao, countFaturamento, countFaturados, countPendentes] = await Promise.all([
      isFaturamento
        ? Promise.resolve(0)
        : prisma.order.count({
            where: {
              ...baseCountFilter,
              status: ORDER_STATUS.AGUARDANDO_EMBARQUE,
            },
          }),
      isFaturamento
        ? Promise.resolve(0)
        : prisma.order.count({
            where: {
              ...baseCountFilter,
              status: ORDER_STATUS.AGUARDANDO_SEPARACAO,
            },
          }),
      prisma.order.count({
        where: {
          ...baseCountFilter,
          status: ORDER_STATUS.AGUARDANDO_NOTA_FISCAL,
        },
      }),
      prisma.order.count({
        where: {
          ...baseCountFilter,
          status: ORDER_STATUS.FATURADO,
        },
      }),
      isFaturamento
        ? Promise.resolve(0)
        : prisma.order.count({
            where: {
              ...baseCountFilter,
              status: ORDER_STATUS.PENDENTE_AJUSTE,
            },
          }),
    ]);

    return NextResponse.json({
      orders: sanitizedOrders,
      pagination: {
        page: allParam ? 1 : page,
        limit: allParam ? totalOrders : limit,
        totalOrders,
        totalPages,
      },
      counts: {
        aguardandoEmbarque: countEmbarque,
        aguardandoSeparacao: countSeparacao,
        aguardandoNotaFiscal: countFaturamento,
        faturados: countFaturados,
        pendentesAjuste: countPendentes,
        total: countEmbarque + countSeparacao + countFaturamento + countFaturados + countPendentes,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: 'Erro ao listar pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const canCreateDept =
      user.departmentCode === 'COMERCIAL' ||
      user.departmentCode === 'ASSISTENCIA_TECNICA' ||
      user.departmentCode === 'LICITACAO' ||
      user.role === 'ADMIN';

    if (!canCreateDept || (!user.permissions?.canCreateOrder && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Apenas os setores Comercial, Assistência Técnica e Licitação podem incluir pedidos no portal.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      orderNumber,
      customerName,
      customerCode,
      orderType,
      isUrgent,
      separationNotes,
      generalNotes,
      fiscalNotes,
      deliveryNotes,
    } = body;

    if (!orderNumber || !customerName) {
      return NextResponse.json(
        { error: 'Número do Pedido (TOTVS) e Nome do Cliente são obrigatórios' },
        { status: 400 }
      );
    }

    const cleanOrderNumber = String(orderNumber).trim();

    // Verificar se já existe pedido com este número
    const existing = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: `O Pedido TOTVS nº ${cleanOrderNumber} já está cadastrado no sistema.` },
        { status: 409 }
      );
    }

    const effectiveSeparationNotes = separationNotes?.trim() || generalNotes?.trim() || null;
    const effectiveOrderType = orderType?.trim() || 'Venda';
    const effectiveIsUrgent = Boolean(isUrgent);

    // Criar pedido com status inicial AGUARDANDO_EMBARQUE
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: cleanOrderNumber,
        customerName: customerName.trim(),
        customerCode: customerCode ? customerCode.trim() : null,
        orderType: effectiveOrderType,
        isUrgent: effectiveIsUrgent,
        separationNotes: effectiveSeparationNotes,
        generalNotes: effectiveSeparationNotes,
        fiscalNotes: fiscalNotes ? fiscalNotes.trim() : null,
        deliveryNotes: deliveryNotes ? deliveryNotes.trim() : null,
        status: ORDER_STATUS.AGUARDANDO_EMBARQUE,
        createdById: user.id,
        history: {
          create: {
            userId: user.id,
            userName: user.name,
            userDept: user.departmentName,
            action: 'CRIACAO',
            toStatus: ORDER_STATUS.AGUARDANDO_EMBARQUE,
            notes: effectiveIsUrgent
              ? `Pedido TOTVS nº ${cleanOrderNumber} (URGENTE - ${effectiveOrderType}) cadastrado no portal. Aguardando Embarque.`
              : `Pedido TOTVS nº ${cleanOrderNumber} (${effectiveOrderType}) cadastrado no portal. Aguardando Embarque.`,
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, username: true, department: true },
        },
        history: true,
      },
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Erro ao incluir pedido:', error);
    return NextResponse.json({ error: 'Erro interno ao cadastrar pedido' }, { status: 500 });
  }
}
