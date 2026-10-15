import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ORDER_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            department: true,
          },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const isCreator = order.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSeparationDept =
      user.departmentCode === 'LOGISTICA' || user.departmentCode === 'ALMOXARIFADO';
    const isFaturamentoDept = user.departmentCode === 'FATURAMENTO';
    const isTransporteDept = user.departmentCode === 'TRANSPORTE';

    const canViewSeparation = isAdmin || isCreator || isSeparationDept;
    const canViewFiscal = isAdmin || isCreator || isFaturamentoDept;
    const canViewDelivery = isAdmin || isCreator || isTransporteDept;

    const sanitizedOrder = {
      ...order,
      separationNotes: canViewSeparation ? order.separationNotes : null,
      fiscalNotes: canViewFiscal ? order.fiscalNotes : null,
      deliveryNotes: canViewDelivery ? order.deliveryNotes : null,
    };

    return NextResponse.json({ order: sanitizedOrder });
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar pedido' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { createdBy: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (user.departmentCode === 'GERENCIA_SUPERVISAO') {
      return NextResponse.json(
        { error: 'Gerência/Supervisão possui apenas permissão de visualização e não pode alterar pedidos.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, payload } = body;

    let newStatus = order.status;
    let actionLabel = '';
    const updateData: any = {};

    switch (action) {
      case 'EMBARQUE': {
        const canEmbarcarDept =
          user.departmentCode === 'LOGISTICA' ||
          user.departmentCode === 'ALMOXARIFADO' ||
          user.departmentCode === 'TRANSPORTE' ||
          user.role === 'ADMIN';

        if (!canEmbarcarDept || (!user.permissions.canEmbarcar && user.role !== 'ADMIN')) {
          return NextResponse.json(
            { error: 'Você não tem permissão para realizar o embarque deste pedido.' },
            { status: 403 }
          );
        }

        if (order.status !== ORDER_STATUS.AGUARDANDO_EMBARQUE) {
          return NextResponse.json(
            { error: 'Este pedido não está na etapa "Aguardando Embarque".' },
            { status: 400 }
          );
        }

        const romaneio = payload?.romaneio?.trim();
        if (!romaneio) {
          return NextResponse.json(
            { error: 'O preenchimento do campo Romaneio é obrigatório para realizar o embarque.' },
            { status: 400 }
          );
        }

        newStatus = ORDER_STATUS.AGUARDANDO_SEPARACAO;
        actionLabel = 'EMBARQUE';

        updateData.status = newStatus;
        updateData.embarqueDate = new Date();
        updateData.romaneio = romaneio;
        updateData.embarqueAttachment = payload?.embarqueAttachment || null;
        updateData.embarqueAttachmentName = payload?.embarqueAttachmentName || null;
        updateData.carrier = payload?.carrier?.trim() || null;
        updateData.vehiclePlate = payload?.vehiclePlate?.trim() || null;
        updateData.driverName = payload?.driverName?.trim() || null;
        updateData.embarqueNotes = payload?.embarqueNotes?.trim() || null;
        if (payload?.separationNotes !== undefined) {
          updateData.separationNotes = payload.separationNotes?.trim() || null;
        }
        updateData.embarqueUserId = user.id;
        updateData.embarqueUserName = user.name;
        break;
      }

      case 'AUTORIZAR_FATURAMENTO': {
        const canSepararDept =
          user.departmentCode === 'LOGISTICA' ||
          user.departmentCode === 'ALMOXARIFADO' ||
          user.departmentCode === 'TRANSPORTE' ||
          user.role === 'ADMIN';

        if (!canSepararDept || (!user.permissions.canSeparar && user.role !== 'ADMIN')) {
          return NextResponse.json(
            { error: 'Você não tem permissão para autorizar faturamento / separar pedido.' },
            { status: 403 }
          );
        }

        if (order.status !== ORDER_STATUS.AGUARDANDO_SEPARACAO) {
          return NextResponse.json(
            { error: 'Este pedido não está na etapa "Aguardando Separação".' },
            { status: 400 }
          );
        }

        const weight = payload?.weight?.trim();
        const volume = payload?.volume?.trim();
        if (!weight) {
          return NextResponse.json(
            { error: 'O preenchimento do campo Peso é obrigatório.' },
            { status: 400 }
          );
        }
        if (!volume) {
          return NextResponse.json(
            { error: 'O preenchimento do campo Volume é obrigatório.' },
            { status: 400 }
          );
        }

        newStatus = ORDER_STATUS.AGUARDANDO_NOTA_FISCAL;
        actionLabel = 'AUTORIZAR_FATURAMENTO';

        updateData.status = newStatus;
        updateData.separationDate = new Date();
        updateData.weight = weight;
        updateData.volume = volume;
        updateData.inspectorName = payload?.inspectorName?.trim() || user.name;
        if (payload?.separationNotes !== undefined) {
          updateData.separationNotes = payload.separationNotes?.trim() || null;
        }
        updateData.separationUserId = user.id;
        updateData.separationUserName = user.name;
        break;
      }

      case 'EMITIR_NF': {
        const canFaturarDept = user.departmentCode === 'FATURAMENTO' || user.role === 'ADMIN';
        if (!canFaturarDept || (!user.permissions.canFaturar && user.role !== 'ADMIN')) {
          return NextResponse.json(
            { error: 'Você não tem permissão para emitir Nota Fiscal / faturar pedidos.' },
            { status: 403 }
          );
        }

        if (order.status !== ORDER_STATUS.AGUARDANDO_NOTA_FISCAL) {
          return NextResponse.json(
            { error: 'Este pedido não está na etapa "Aguardando Nota Fiscal".' },
            { status: 400 }
          );
        }

        if (!payload?.invoiceNumber) {
          return NextResponse.json(
            { error: 'O número da Nota Fiscal é obrigatório.' },
            { status: 400 }
          );
        }

        newStatus = ORDER_STATUS.FATURADO;
        actionLabel = 'EMITIR_NF';

        updateData.status = newStatus;
        updateData.invoiceNumber = String(payload.invoiceNumber).trim();
        updateData.invoiceAccessKey = payload?.invoiceAccessKey?.trim() || null;
        if (payload?.fiscalNotes !== undefined) {
          updateData.fiscalNotes = payload.fiscalNotes?.trim() || null;
        }
        if (payload?.invoiceFiles !== undefined) {
          updateData.invoiceFiles = typeof payload.invoiceFiles === 'string' ? payload.invoiceFiles : JSON.stringify(payload.invoiceFiles);
        }
        if (payload?.boletoFiles !== undefined) {
          updateData.boletoFiles = typeof payload.boletoFiles === 'string' ? payload.boletoFiles : JSON.stringify(payload.boletoFiles);
        }
        updateData.invoiceNotes = payload?.invoiceNotes?.trim() || null;
        updateData.invoiceDate = new Date();
        updateData.invoiceUserId = user.id;
        updateData.invoiceUserName = user.name;
        break;
      }

      case 'DEVOLVER': {
        const canReturnFromEmbarque =
          order.status === ORDER_STATUS.AGUARDANDO_EMBARQUE &&
          (user.permissions.canEmbarcar || user.role === 'ADMIN');
        const canReturnFromSeparacao =
          order.status === ORDER_STATUS.AGUARDANDO_SEPARACAO &&
          (user.permissions.canSeparar || user.role === 'ADMIN');
        const canReturnFromFaturamento =
          order.status === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL &&
          (user.permissions.canFaturar || user.role === 'ADMIN');

        if (!canReturnFromEmbarque && !canReturnFromSeparacao && !canReturnFromFaturamento) {
          return NextResponse.json(
            { error: 'Você não tem permissão para apontar divergência nesta etapa do pedido.' },
            { status: 403 }
          );
        }

        const returnReason = String(payload?.reason || body?.reason || '').trim();
        if (!returnReason) {
          return NextResponse.json(
            { error: 'O motivo da devolução / divergência é obrigatório.' },
            { status: 400 }
          );
        }

        newStatus = ORDER_STATUS.PENDENTE_AJUSTE;
        actionLabel = 'DEVOLUCAO_DIVERGENCIA';

        updateData.status = newStatus;
        updateData.returnReason = returnReason;
        updateData.returnOriginStage = order.status;
        updateData.returnUserId = user.id;
        updateData.returnUserName = user.name;
        updateData.returnUserDept = user.departmentName;
        updateData.returnDate = new Date();
        break;
      }

      case 'REENCAMINHAR': {
        if (order.status !== ORDER_STATUS.PENDENTE_AJUSTE) {
          return NextResponse.json(
            { error: 'Apenas pedidos com status "Pendente de Ajuste" podem ser reencaminhados.' },
            { status: 400 }
          );
        }

        const isCreatorOrSameDept =
          order.createdById === user.id ||
          order.createdBy?.departmentId === user.departmentId ||
          user.role === 'ADMIN';

        if (!isCreatorOrSameDept) {
          return NextResponse.json(
            { error: 'Apenas usuários do mesmo departamento do solicitante podem reencaminhar este pedido.' },
            { status: 403 }
          );
        }

        const targetStage = order.returnOriginStage || ORDER_STATUS.AGUARDANDO_EMBARQUE;
        newStatus = targetStage;
        actionLabel = 'REENCAMINHAMENTO';

        const resNotes = String(payload?.resolutionNotes || body?.resolutionNotes || '').trim();
        updateData.status = newStatus;
        updateData.returnResolutionNotes = resNotes || 'Ajustes efetuados pelo solicitante.';

        const custName = payload?.customerName || body?.customerName;
        const custCode = payload?.customerCode !== undefined ? payload.customerCode : body?.customerCode;
        const genNotes = payload?.generalNotes !== undefined ? payload.generalNotes : (payload?.notes !== undefined ? payload.notes : (body?.generalNotes !== undefined ? body.generalNotes : body?.notes));

        if (custName) updateData.customerName = String(custName).trim();
        if (custCode !== undefined) updateData.customerCode = custCode ? String(custCode).trim() : null;
        if (genNotes !== undefined) updateData.generalNotes = genNotes ? String(genNotes).trim() : null;
        break;
      }

      case 'CANCELAR': {
        if (order.status === ORDER_STATUS.FATURADO) {
          return NextResponse.json(
            { error: 'Pedidos faturados não podem ser cancelados.' },
            { status: 400 }
          );
        }

        const isCreator = order.createdById === user.id;
        if (!isCreator) {
          return NextResponse.json(
            { error: 'Apenas o usuário de criação do pedido pode cancelar o pedido.' },
            { status: 403 }
          );
        }

        newStatus = ORDER_STATUS.CANCELADO;
        actionLabel = 'CANCELAMENTO';
        updateData.status = newStatus;
        break;
      }

      case 'EDITAR': {
        if (!user.permissions.canEditOrder && user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Você não tem permissão para editar dados do pedido.' },
            { status: 403 }
          );
        }

        actionLabel = 'EDICAO';
        if (payload?.customerName) updateData.customerName = payload.customerName.trim();
        if (payload?.customerCode !== undefined) updateData.customerCode = payload.customerCode?.trim() || null;
        if (payload?.orderValue !== undefined) {
          const val = payload.orderValue ? parseFloat(String(payload.orderValue).replace(',', '.')) : null;
          updateData.orderValue = isNaN(val as number) ? null : val;
        }
        if (payload?.generalNotes !== undefined) updateData.generalNotes = payload.generalNotes?.trim() || null;
        break;
      }

      default:
        return NextResponse.json({ error: 'Ação de workflow desconhecida.' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...updateData,
        history: {
          create: {
            userId: user.id,
            userName: user.name,
            userDept: user.departmentName,
            action: actionLabel,
            fromStatus: order.status,
            toStatus: newStatus,
            notes: payload?.notes || payload?.embarqueNotes || payload?.separationNotes || payload?.invoiceNotes || 'Transição de status executada.',
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, username: true, department: true },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Erro na ação de workflow:', error);
    return NextResponse.json({ error: 'Erro interno ao processar etapa do pedido.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (user.departmentCode === 'GERENCIA_SUPERVISAO') {
      return NextResponse.json(
        { error: 'Gerência/Supervisão possui apenas permissão de visualização e não pode excluir pedidos.' },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status === ORDER_STATUS.FATURADO) {
      return NextResponse.json(
        { error: 'Pedidos faturados não podem ser excluídos.' },
        { status: 400 }
      );
    }

    const isCreator = order.createdById === user.id;
    if (!isCreator) {
      return NextResponse.json(
        { error: 'Apenas o usuário de criação do pedido pode excluir o pedido.' },
        { status: 403 }
      );
    }

    await prisma.order.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Pedido excluído permanentemente com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir pedido.' }, { status: 500 });
  }
}
