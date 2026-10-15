'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  Truck,
  CheckCircle2,
  FileText,
  Eye,
  RefreshCw,
  Clock,
  Copy,
  Check,
  User,
  X,
  Trash2,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Send,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Paperclip,
  Download,
} from 'lucide-react';
import { OrderItem, UserSession } from '@/types';
import { STATUS_CONFIG, ORDER_STATUS } from '@/lib/constants';
import NewOrderModal from '@/components/NewOrderModal';
import OrderDetailModal from '@/components/OrderDetailModal';
import ActionWorkflowModal from '@/components/ActionWorkflowModal';
import CancelOrderModal from '@/components/CancelOrderModal';
import DeleteOrderModal from '@/components/DeleteOrderModal';
import ReturnOrderModal from '@/components/ReturnOrderModal';
import ResubmitOrderModal from '@/components/ResubmitOrderModal';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimpleUser {
  id: string;
  name: string;
  username: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [counts, setCounts] = useState({
    aguardandoEmbarque: 0,
    aguardandoSeparacao: 0,
    aguardandoNotaFiscal: 0,
    faturados: 0,
    pendentesAjuste: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTab, setSelectedTab] = useState<'queue' | 'ALL' | string>('queue');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Paginação a cada 10 pedidos
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilteredOrders, setTotalFilteredOrders] = useState(0);

  // Resetar para a primeira página sempre que os filtros principais mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTab, selectedUserId, startDate, endDate]);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderItem | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [orderToReturn, setOrderToReturn] = useState<OrderItem | null>(null);
  const [orderToResubmit, setOrderToResubmit] = useState<OrderItem | null>(null);
  const [quickActionOrder, setQuickActionOrder] = useState<{
    order: OrderItem;
    action: 'EMBARQUE' | 'AUTORIZAR_FATURAMENTO' | 'EMITIR_NF';
  } | null>(null);

  // Carregar dados do usuário logado
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          const isTi = data.user.role === 'ADMIN' || data.user.departmentCode === 'TI';
          const isGerencia = data.user.departmentCode === 'GERENCIA_SUPERVISAO';
          const isGlobal = isTi || isGerencia;

          if (isGlobal) {
            // T.I e Gerência/Supervisão: visualizam toda a esteira da empresa
            // O filtro inicia em "Todos os Usuários" e a aba em "Todos os Pedidos"
            setSelectedUserId('');
            setSelectedTab('ALL');
          } else {
            // Demais usuários iniciam com o filtro habilitado para o próprio usuário
            setSelectedUserId(data.user.id);
            const isSolicitante =
              data.user.departmentCode === 'COMERCIAL' ||
              data.user.departmentCode === 'ASSISTENCIA_TECNICA' ||
              data.user.departmentCode === 'LICITACAO' ||
              data.user.departmentCode === 'ADMINISTRATIVO';
            if (isSolicitante) {
              setSelectedTab('ALL');
            } else {
              // Setores com esteira operacional pendente (Logística, Almoxarifado, Faturamento)
              setSelectedTab('queue');
            }
          }
        }
      });
  }, []);

  // Carregar lista de usuários para filtro
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => console.error('Erro ao buscar usuários:', err));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedUserId) params.set('userId', selectedUserId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', String(currentPage));
      params.set('limit', '10');

      if (selectedTab === 'queue') {
        params.set('queue', 'true');
      } else if (selectedTab !== 'ALL') {
        params.set('status', selectedTab);
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        if (data.counts) setCounts(data.counts);
        if (data.pagination) {
          setCurrentPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalFilteredOrders(data.pagination.totalOrders);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedTab, selectedUserId, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Exportar para Excel (.CSV com UTF-8 BOM e delimitador ';') de TODOS os pedidos filtrados
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedUserId) params.set('userId', selectedUserId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      if (selectedTab === 'queue') {
        params.set('queue', 'true');
      } else if (selectedTab !== 'ALL') {
        params.set('status', selectedTab);
      }
      params.set('all', 'true');

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      const exportList: OrderItem[] = data.orders || [];

      if (!exportList || exportList.length === 0) {
        alert('Não há pedidos disponíveis para exportação no filtro selecionado.');
        return;
      }

      const headers = [
        'Nº Pedido TOTVS',
        'Cliente / Razão Social',
        'Tipo de Pedido',
        'Urgente',
        'Status Atual',
        'Valor Total (R$)',
        'Solicitante',
        'Departamento Solicitante',
        'Data de Criação',
        'Romaneio',
        'Data Embarque',
        'Usuário Embarque',
        'Anexo Embarque',
        'Peso',
        'Volume',
        'Data Separação',
        'Usuário Separação',
        'Nº Nota Fiscal',
        'Data Nota Fiscal',
        'Usuário Faturamento',
        'Qtd Arquivos NF',
        'Qtd Boletos',
        'Observação de Separação',
        'Observação Fiscal',
        'Observação de Entrega',
        'Observações Gerais',
        'Motivo Devolução (se houver)',
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportList.map((o) => {
        const statusCfg = STATUS_CONFIG[o.status] || { label: o.status };
        let nfsCount = 0;
        if (o.invoiceFiles) {
          try {
            const parsed = JSON.parse(o.invoiceFiles);
            if (Array.isArray(parsed)) nfsCount = parsed.length;
          } catch {}
        }
        let boletosCount = 0;
        if (o.boletoFiles) {
          try {
            const parsed = JSON.parse(o.boletoFiles);
            if (Array.isArray(parsed)) boletosCount = parsed.length;
          } catch {}
        }

        return [
          escapeCsv(o.orderNumber),
          escapeCsv(o.customerName),
          escapeCsv(o.orderType || 'Venda'),
          escapeCsv(o.isUrgent ? 'SIM' : 'NÃO'),
          escapeCsv(statusCfg.label),
          escapeCsv(o.orderValue ? o.orderValue.toFixed(2).replace('.', ',') : ''),
          escapeCsv(o.createdBy?.name || ''),
          escapeCsv(o.createdBy?.department?.name || ''),
          escapeCsv(o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm:ss') : ''),
          escapeCsv(o.romaneio || ''),
          escapeCsv(o.embarqueDate ? format(new Date(o.embarqueDate), 'dd/MM/yyyy HH:mm:ss') : ''),
          escapeCsv(o.embarqueUserName || ''),
          escapeCsv(o.embarqueAttachment ? 'SIM' : 'NÃO'),
          escapeCsv(o.weight || ''),
          escapeCsv(o.volume || ''),
          escapeCsv(o.separationDate ? format(new Date(o.separationDate), 'dd/MM/yyyy HH:mm:ss') : ''),
          escapeCsv(o.separationUserName || ''),
          escapeCsv(o.invoiceNumber || ''),
          escapeCsv(o.invoiceDate ? format(new Date(o.invoiceDate), 'dd/MM/yyyy HH:mm:ss') : ''),
          escapeCsv(o.invoiceUserName || ''),
          escapeCsv(nfsCount),
          escapeCsv(boletosCount),
          escapeCsv(o.separationNotes || ''),
          escapeCsv(o.fiscalNotes || ''),
          escapeCsv(o.deliveryNotes || ''),
          escapeCsv(o.generalNotes || ''),
          escapeCsv(o.returnReason || ''),
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nowStr = format(new Date(), 'yyyy-MM-dd_HHmm');
      link.setAttribute('download', `Relatorio_Pedidos_TOTVS_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar pedidos para Excel:', err);
      alert('Erro ao gerar relatório de pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatRelative = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  const isFaturamento = currentUser?.departmentCode === 'FATURAMENTO';
  const isGerencia = currentUser?.departmentCode === 'GERENCIA_SUPERVISAO';
  const isSolicitanteDept =
    currentUser?.departmentCode === 'COMERCIAL' ||
    currentUser?.departmentCode === 'ASSISTENCIA_TECNICA' ||
    currentUser?.departmentCode === 'LICITACAO';
  const canCreateOrder =
    (isSolicitanteDept && currentUser?.permissions.canCreateOrder) ||
    currentUser?.role === 'ADMIN';

  const getFirstFile = (jsonStr?: string | null): { url: string; name: string } | null => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
        return parsed[0];
      }
    } catch {}
    return null;
  };

  const getQuickAction = (order: OrderItem) => {
    if (!currentUser) return null;
    // Gerência/Supervisão apenas visualiza
    if (isGerencia) return null;
    // Setores solicitantes (Comercial, Assistência Técnica, Licitação) não embarcam, não separam e não faturam
    if (isSolicitanteDept && currentUser.role !== 'ADMIN') return null;

    const isLogisticaOrAlmox =
      currentUser.departmentCode === 'LOGISTICA' ||
      currentUser.departmentCode === 'ALMOXARIFADO' ||
      currentUser.departmentCode === 'TRANSPORTE';

    // Etapa 1: Aguardando Embarque (Logística, Almoxarifado, Transporte ou Admin)
    if (
      order.status === ORDER_STATUS.AGUARDANDO_EMBARQUE &&
      (currentUser.permissions.canEmbarcar || isLogisticaOrAlmox || currentUser.role === 'ADMIN')
    ) {
      return {
        label: 'Embarcar',
        action: 'EMBARQUE' as const,
        icon: <Truck className="h-3.5 w-3.5" />,
        color: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/20',
      };
    }

    // Etapa 2: Aguardando Separação / Autorizar Faturamento (Almoxarifado, Logística ou Admin)
    if (
      order.status === ORDER_STATUS.AGUARDANDO_SEPARACAO &&
      (currentUser.permissions.canSeparar || isLogisticaOrAlmox || currentUser.role === 'ADMIN')
    ) {
      return {
        label: 'Autorizar Faturamento',
        action: 'AUTORIZAR_FATURAMENTO' as const,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20',
      };
    }

    // Etapa 3: Aguardando Nota Fiscal (Faturamento ou Admin)
    if (
      order.status === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL &&
      (isFaturamento || currentUser.permissions.canFaturar || currentUser.role === 'ADMIN')
    ) {
      return {
        label: 'Emitir NF',
        action: 'EMITIR_NF' as const,
        icon: <FileText className="h-3.5 w-3.5" />,
        color: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-600/20',
      };
    }

    return null;
  };

  // Mini-Stepper de 4 etapas para a linha da tabela (centralizado)
  const renderMiniStepper = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.AGUARDANDO_EMBARQUE;
    const currentStep = config.step;
    const isCanceled = status === ORDER_STATUS.CANCELADO;
    const isPendenteAjuste = status === ORDER_STATUS.PENDENTE_AJUSTE;

    if (isCanceled) {
      return (
        <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-2 py-0.5 rounded-full inline-block text-center">
          Cancelado
        </span>
      );
    }

    if (isPendenteAjuste) {
      return (
        <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-full inline-flex items-center justify-center space-x-1">
          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Ajuste Necessário</span>
        </span>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-1" title={`Etapa ${currentStep} de 4: ${config.label}`}>
        {[1, 2, 3, 4].map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          let bgClass = 'bg-slate-200 dark:bg-slate-700';
          if (isCompleted) bgClass = 'bg-emerald-500';
          else if (isCurrent) {
            if (step === 1) bgClass = 'bg-amber-500 animate-pulse';
            if (step === 2) bgClass = 'bg-blue-500 animate-pulse';
            if (step === 3) bgClass = 'bg-purple-500 animate-pulse';
            if (step === 4) bgClass = 'bg-emerald-500';
          }

          return (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all ${
                isCurrent ? 'w-5' : 'w-2.5'
              } ${bgClass}`}
            />
          );
        })}
      </div>
    );
  };

  const getClientInitials = (name: string) => {
    const clean = name.trim().replace(/Ltda|S\.A\.|ME|EPP|Eireli/gi, '').trim();
    const parts = clean.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Botões numéricos da paginação inteligente
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;

    const buttons = [];
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          type="button"
          onClick={() => setCurrentPage(1)}
          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis-start" className="px-1 text-slate-400 text-xs">
            ...
          </span>
        );
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const isCurrent = p === currentPage;
      buttons.push(
        <button
          key={p}
          type="button"
          onClick={() => setCurrentPage(p)}
          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
            isCurrent
              ? 'bg-[#00a8cc] text-white shadow-xs'
              : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {p}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis-end" className="px-1 text-slate-400 text-xs">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => setCurrentPage(totalPages)}
          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Esteira em Tempo Real</span>
            <span>&bull;</span>
            <span>Fluxo Operacional TOTVS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Painel de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie e acompanhe a transição de status dos pedidos entre os setores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Botão Atualizar */}
          <button
            onClick={() => fetchOrders()}
            title="Atualizar lista agora"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 flex items-center justify-center shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#00a8cc]' : ''}`} />
          </button>

          {/* Filtro de Data: De XXX até XXX */}
          <div className="flex items-center space-x-1.5 p-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs text-xs text-slate-600 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Botão ao lado para Zerar Data e Voltar a Mostrar Tudo */}
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            disabled={!startDate && !endDate}
            title={
              startDate || endDate
                ? 'Zerar filtro de data e voltar a mostrar tudo novamente'
                : 'Nenhum filtro de data aplicado'
            }
            className={`px-3 py-2 rounded-2xl border text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5 shrink-0 ${
              startDate || endDate
                ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 ring-2 ring-amber-400/20 active:scale-95 cursor-pointer'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw className={`h-3.5 w-3.5 ${startDate || endDate ? 'text-amber-600 dark:text-amber-400' : ''}`} />
            <span>Zerar Data</span>
          </button>

          {/* Botão de Exportar para Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            title="Exportar dados dos pedidos para Excel"
            className="px-3.5 py-2 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          {/* Botão Novo Pedido TOTVS */}
          {canCreateOrder && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#163765] to-[#00a8cc] hover:from-[#112c52] hover:to-[#0092b3] text-white text-xs font-semibold rounded-2xl shadow-md shadow-cyan-900/10 hover:shadow-cyan-900/20 transition-all duration-200 flex items-center space-x-2 active:scale-[0.98] shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Novo Pedido TOTVS</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards da Esteira Operacional (Pipeline Interativo) */}
      <div
        className={`grid gap-4 ${
          isFaturamento ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {/* Etapa 1: Aguardando Embarque */}
        {!isFaturamento && (
          <div
            onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_EMBARQUE)}
            className={`group relative cursor-pointer p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden ${
              selectedTab === ORDER_STATUS.AGUARDANDO_EMBARQUE
                ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600/60 hover:shadow-md'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                Etapa 01
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Truck className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {counts.aguardandoEmbarque}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
                Aguardando Embarque
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-between">
                <span>Setor: Logística</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium group-hover:translate-x-0.5 transition-transform">
                  Filtrar &rarr;
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Aguardando Separação (Almoxarifado) */}
        {!isFaturamento && (
          <div
            onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_SEPARACAO)}
            className={`group relative cursor-pointer p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden ${
              selectedTab === ORDER_STATUS.AGUARDANDO_SEPARACAO
                ? 'border-blue-400 ring-2 ring-blue-400/30 shadow-md'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/60 hover:shadow-md'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
                Etapa 02
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {counts.aguardandoSeparacao}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
                Aguardando Separação
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-between">
                <span>Setor: Almoxarifado</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
                  Filtrar &rarr;
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Aguardando Nota Fiscal */}
        <div
          onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_NOTA_FISCAL)}
          className={`group relative cursor-pointer p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden ${
            selectedTab === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL
              ? 'border-purple-400 ring-2 ring-purple-400/30 shadow-md'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600/60 hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 px-2 py-0.5 rounded-md">
              Etapa 03
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <FileText className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {counts.aguardandoNotaFiscal}
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
              Aguardando Nota Fiscal
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Setor: Faturamento</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-0.5 transition-transform">
                Filtrar &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* Etapa 4: Faturado (Concluído) */}
        <div
          onClick={() => setSelectedTab(ORDER_STATUS.FATURADO)}
          className={`group relative cursor-pointer p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden ${
            selectedTab === ORDER_STATUS.FATURADO
              ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
              Concluído
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {counts.faturados}
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
              Pedidos Faturados
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Fluxo finalizado</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
                Ver todos &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca Moderna */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Segmented Control Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto p-1 bg-slate-100/80 dark:bg-slate-800 rounded-2xl scrollbar-none">
            <button
              onClick={() => setSelectedTab('queue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                selectedTab === 'queue'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Minha Fila</span>
            </button>

            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Todos os Pedidos</span>
            </button>

            {!isFaturamento && (
              <button
                onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_EMBARQUE)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  selectedTab === ORDER_STATUS.AGUARDANDO_EMBARQUE
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Embarque</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                  {counts.aguardandoEmbarque}
                </span>
              </button>
            )}

            {!isFaturamento && (
              <button
                onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_SEPARACAO)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  selectedTab === ORDER_STATUS.AGUARDANDO_SEPARACAO
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Separação</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                  {counts.aguardandoSeparacao}
                </span>
              </button>
            )}

            <button
              onClick={() => setSelectedTab(ORDER_STATUS.AGUARDANDO_NOTA_FISCAL)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                selectedTab === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Nota Fiscal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                {counts.aguardandoNotaFiscal}
              </span>
            </button>

            <button
              onClick={() => setSelectedTab(ORDER_STATUS.FATURADO)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                selectedTab === ORDER_STATUS.FATURADO
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Faturados</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                {counts.faturados}
              </span>
            </button>

            {!isFaturamento && (
              <button
                onClick={() => setSelectedTab(ORDER_STATUS.PENDENTE_AJUSTE)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  selectedTab === ORDER_STATUS.PENDENTE_AJUSTE
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Pendentes de Ajuste</span>
                {counts.pendentesAjuste > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-700 text-white font-bold">
                    {counts.pendentesAjuste}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Filtro de Usuário e Campo de Busca Inteligente */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Seletor de Usuário */}
            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition appearance-none cursor-pointer"
              >
                <option value="">
                  {currentUser?.role === 'ADMIN' ||
                  currentUser?.departmentCode === 'TI' ||
                  currentUser?.departmentCode === 'GERENCIA_SUPERVISAO'
                    ? 'Todos os Usuários (Visão Geral)'
                    : currentUser?.departmentCode === 'LOGISTICA' ||
                      currentUser?.departmentCode === 'ALMOXARIFADO' ||
                      currentUser?.departmentCode === 'TRANSPORTE'
                    ? 'Todos (Logística, Almox. & Transporte)'
                    : `Todos do Departamento (${currentUser?.departmentName || 'Setor'})`}
                </option>
                {users.map((u) => {
                  const isMe = u.id === currentUser?.id;
                  const showDept =
                    currentUser?.role === 'ADMIN' ||
                    currentUser?.departmentCode === 'TI' ||
                    currentUser?.departmentCode === 'GERENCIA_SUPERVISAO' ||
                    currentUser?.departmentCode === 'LOGISTICA' ||
                    currentUser?.departmentCode === 'ALMOXARIFADO' ||
                    currentUser?.departmentCode === 'TRANSPORTE';
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {isMe ? ' (Você)' : ''}
                      {showDept && u.department?.name ? ` - ${u.department.name}` : ''}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Input de Busca */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar Nº Pedido TOTVS, Cliente..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 focus:border-transparent transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos Redesenhada */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
            <div className="h-8 w-8 border-3 border-[#00a8cc] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Carregando esteira operacional...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="h-14 w-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum pedido encontrado</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Não há pedidos correspondentes ao filtro atual.
              </p>
            </div>
            {canCreateOrder && (
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Incluir Novo Pedido</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5 text-center">Data de Criação</th>
                  <th className="py-3.5 px-5 text-center">Pedido</th>
                  <th className="py-3.5 px-5 text-center">Cliente</th>
                  <th className="py-3.5 px-5 text-center">Progresso</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center">Solicitante</th>
                  <th className="py-3.5 px-5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.AGUARDANDO_EMBARQUE;
                  const quickAction = getQuickAction(order);
                  const isCopied = copiedId === order.id;
                  const isCreator = currentUser?.id === order.createdById;
                  const isNotFaturado = order.status !== ORDER_STATUS.FATURADO;
                  const canCancel = !isGerencia && isCreator && isNotFaturado && order.status !== ORDER_STATUS.CANCELADO;
                  const canDelete = !isGerencia && isCreator && isNotFaturado;
                  const isSameDept = currentUser?.departmentId === order.createdBy?.department?.id;
                  const canDevolver = !isGerencia && !isSolicitanteDept && !!quickAction && order.status !== ORDER_STATUS.PENDENTE_AJUSTE;
                  const canResubmit = !isGerencia && (isCreator || isSameDept || currentUser?.role === 'ADMIN') && order.status === ORDER_STATUS.PENDENTE_AJUSTE;
                  const isBlinkingUrgent =
                    Boolean(order.isUrgent) &&
                    (order.status === ORDER_STATUS.AGUARDANDO_EMBARQUE ||
                      order.status === ORDER_STATUS.AGUARDANDO_SEPARACAO ||
                      order.status === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL);
                  const firstInvoice = getFirstFile(order.invoiceFiles);
                  const firstBoleto = getFirstFile(order.boletoFiles);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`transition cursor-pointer group ${
                        isBlinkingUrgent
                          ? 'urgent-blinking-row ring-1 ring-rose-400/50'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Data de Inclusão do Pedido */}
                      <td className="py-4 px-5 whitespace-nowrap text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-200">
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatRelative(order.createdAt)}
                        </div>
                      </td>

                      {/* Pedido TOTVS & Tipo */}
                      <td className="py-4 px-5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className="flex items-center justify-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-[#163765] dark:text-cyan-400 bg-blue-50/70 dark:bg-cyan-950/40 border border-blue-200/60 dark:border-cyan-800/60 px-2.5 py-1 rounded-lg">
                              #{order.orderNumber}
                            </span>
                            {order.isUrgent && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded shadow-xs ${
                                  isBlinkingUrgent
                                    ? 'bg-rose-600 text-white animate-pulse'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                }`}
                                title="Pedido com Prioridade Máxima"
                              >
                                Urgente
                              </span>
                            )}
                            <button
                              onClick={(e) => copyToClipboard(order.orderNumber, order.id, e)}
                              title="Copiar número do pedido"
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          {order.orderType && (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                              {order.orderType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cliente (sem sigla, centralizado) */}
                      <td className="py-4 px-5 text-center">
                        <div className="text-center">
                          <div className="font-semibold text-slate-900 dark:text-white max-w-[260px] truncate mx-auto" title={order.customerName}>
                            {order.customerName}
                          </div>
                          {order.customerCode && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              Cód: {order.customerCode}
                            </div>
                          )}
                          {order.status === ORDER_STATUS.PENDENTE_AJUSTE && order.returnReason && (
                            <div className="mt-1 flex items-center justify-center space-x-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[220px]" title={order.returnReason}>
                                Motivo: {order.returnReason}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Progresso (Mini Stepper) */}
                      <td className="py-4 px-5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          {renderMiniStepper(order.status)}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                            {statusCfg.step > 0 ? `Etapa ${statusCfg.step} de 4` : 'Cancelado'}
                          </div>
                        </div>
                      </td>

                      {/* Status Atual com Badge */}
                      <td className="py-4 px-5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bgColor} ${statusCfg.textColor} ${statusCfg.borderColor}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              order.status === ORDER_STATUS.FATURADO
                                ? 'bg-emerald-500'
                                : order.status === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL
                                ? 'bg-purple-500'
                                : order.status === ORDER_STATUS.AGUARDANDO_SEPARACAO
                                ? 'bg-blue-500'
                                : order.status === ORDER_STATUS.CANCELADO
                                ? 'bg-red-500'
                                : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Solicitante */}
                      <td className="py-4 px-5 whitespace-nowrap text-center">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {order.createdBy?.name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {order.createdBy?.department?.name || 'Solicitante'}
                        </div>
                      </td>

                      {/* Ação */}
                      <td
                        className="py-4 px-5 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Ação rápida de avanço na esteira */}
                          {quickAction && (
                            <button
                              onClick={() =>
                                setQuickActionOrder({
                                  order,
                                  action: quickAction.action,
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 active:scale-95 ${quickAction.color}`}
                            >
                              {quickAction.icon}
                              <span>{quickAction.label}</span>
                            </button>
                          )}

                          {/* Botão de Devolver Pedido por Divergência (para operadores das etapas 1, 2, 3) */}
                          {canDevolver && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToReturn(order);
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center space-x-1"
                              title="Devolver pedido ao criador por apontamento de problema"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Devolver</span>
                            </button>
                          )}

                          {/* Botão Ajustar & Reencaminhar (para o criador quando status for PENDENTE_AJUSTE) */}
                          {canResubmit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToResubmit(order);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center space-x-1.5 shadow-sm active:scale-95"
                              title="Ajustar dados e reencaminhar pedido diretamente para a etapa de origem"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Ajustar</span>
                            </button>
                          )}

                          {/* Visualizar Detalhes */}
                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="Ver histórico e detalhes do pedido"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Baixar Anexo de Embarque Direto */}
                          {order.embarqueAttachment && (
                            <a
                              href={order.embarqueAttachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={order.embarqueAttachmentName || 'anexo_embarque'}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition"
                              title={`Baixar Anexo de Embarque (${order.embarqueAttachmentName || 'Romaneio'})`}
                            >
                              <Truck className="h-4 w-4" />
                            </a>
                          )}

                          {/* Baixar Nota Fiscal Direto */}
                          {firstInvoice && (
                            <a
                              href={firstInvoice.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={firstInvoice.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition"
                              title={`Baixar Nota Fiscal (${firstInvoice.name})`}
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}

                          {/* Baixar Boleto Bancário Direto */}
                          {firstBoleto && (
                            <a
                              href={firstBoleto.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={firstBoleto.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-xl border border-purple-200 dark:border-purple-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 transition"
                              title={`Baixar Boleto Bancário (${firstBoleto.name})`}
                            >
                              <Paperclip className="h-4 w-4" />
                            </a>
                          )}

                          {/* Cancelar Pedido (visível apenas para o criador se o pedido não estiver faturado ou cancelado) */}
                          {canCancel && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToCancel(order);
                              }}
                              className="p-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition"
                              title="Cancelar pedido (ficará visível apenas para você)"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          {/* Excluir Pedido (visível apenas para o criador se o pedido não estiver faturado) */}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order);
                              }}
                              className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition"
                              title="Excluir pedido totalmente do sistema"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé com Informações de Registros e Paginação a cada 10 pedidos */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {totalFilteredOrders === 0 ? (
                <span>Nenhum pedido encontrado</span>
              ) : (
                <span>
                  Mostrando <strong className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * 10 + 1}</strong> a{' '}
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    {Math.min(currentPage * 10, totalFilteredOrders)}
                  </strong>{' '}
                  de <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalFilteredOrders}</strong> pedidos
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                {/* Primeira Página */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  title="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Página Anterior */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-1"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Páginas Numéricas */}
                <div className="flex items-center space-x-1">
                  {renderPaginationButtons()}
                </div>

                {/* Próxima Página */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-1"
                  title="Próxima página"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {/* Última Página */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  title="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
      </div>

      {/* Modal de Criação de Pedido */}
      <NewOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Modal de Detalhes do Pedido com Linha do Tempo */}
      <OrderDetailModal
        orderId={selectedOrderId}
        currentUser={currentUser}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={() => {
          fetchOrders();
        }}
      />

      {/* Modal de Transição de Workflow */}
      {quickActionOrder && (
        <ActionWorkflowModal
          isOpen={true}
          order={quickActionOrder.order}
          actionType={quickActionOrder.action}
          onClose={() => setQuickActionOrder(null)}
          onSuccess={() => {
            setQuickActionOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Modal Aprimorado de Cancelamento de Pedido */}
      <CancelOrderModal
        isOpen={!!orderToCancel}
        order={orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Modal Aprimorado de Exclusão Definitiva de Pedido */}
      <DeleteOrderModal
        isOpen={!!orderToDelete}
        order={orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Modal de Devolução por Problema/Divergência */}
      <ReturnOrderModal
        isOpen={!!orderToReturn}
        order={orderToReturn}
        onClose={() => setOrderToReturn(null)}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Modal de Ajuste e Reencaminhamento Direto para Etapa de Origem */}
      <ResubmitOrderModal
        isOpen={!!orderToResubmit}
        order={orderToResubmit}
        onClose={() => setOrderToResubmit(null)}
        onSuccess={() => {
          fetchOrders();
        }}
        onRequestCancel={(o) => setOrderToCancel(o)}
        onRequestDelete={(o) => setOrderToDelete(o)}
      />
    </div>
  );
}
