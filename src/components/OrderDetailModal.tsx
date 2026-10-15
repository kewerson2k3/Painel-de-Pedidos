'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  User,
  Truck,
  CheckCircle2,
  FileText,
  AlertCircle,
  Calendar,
  Building,
  DollarSign,
  Ban,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Send,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  Download,
} from 'lucide-react';
import { OrderItem, UserSession } from '@/types';
import { STATUS_CONFIG, ORDER_STATUS } from '@/lib/constants';
import ActionWorkflowModal from './ActionWorkflowModal';
import ReturnOrderModal from './ReturnOrderModal';
import ResubmitOrderModal from './ResubmitOrderModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderDetailModalProps {
  orderId: string | null;
  currentUser: UserSession | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export default function OrderDetailModal({
  orderId,
  currentUser,
  onClose,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [activeWorkflowModal, setActiveWorkflowModal] = useState<
    'EMBARQUE' | 'AUTORIZAR_FATURAMENTO' | 'EMITIR_NF' | 'CANCELAR' | null
  >(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar com ESC e travar scroll do body
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !activeWorkflowModal) {
        onClose();
      }
    };

    if (orderId) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [orderId, activeWorkflowModal, onClose]);

  React.useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    const fetchOrderDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar pedido.');
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || 'Erro ao obter dados do pedido.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  const parsedInvoiceFiles: { url: string; name: string; size?: number }[] = React.useMemo(() => {
    if (!order?.invoiceFiles) return [];
    try {
      const data = JSON.parse(order.invoiceFiles);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [order?.invoiceFiles]);

  const parsedBoletoFiles: { url: string; name: string; size?: number }[] = React.useMemo(() => {
    if (!order?.boletoFiles) return [];
    try {
      const data = JSON.parse(order.boletoFiles);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [order?.boletoFiles]);

  if (!orderId || !mounted) return null;

  const currentStatusConfig = order?.status
    ? STATUS_CONFIG[order.status] || STATUS_CONFIG.AGUARDANDO_EMBARQUE
    : STATUS_CONFIG.AGUARDANDO_EMBARQUE;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const isGerencia = currentUser?.departmentCode === 'GERENCIA_SUPERVISAO';
  const isSolicitanteDept =
    currentUser?.departmentCode === 'COMERCIAL' ||
    currentUser?.departmentCode === 'ASSISTENCIA_TECNICA' ||
    currentUser?.departmentCode === 'LICITACAO';

  const isLogisticaOrAlmox =
    currentUser?.departmentCode === 'LOGISTICA' ||
    currentUser?.departmentCode === 'ALMOXARIFADO' ||
    currentUser?.departmentCode === 'TRANSPORTE';

  const canEmbarcar =
    !isGerencia &&
    !isSolicitanteDept &&
    (currentUser?.permissions.canEmbarcar || isLogisticaOrAlmox || currentUser?.role === 'ADMIN') &&
    order?.status === ORDER_STATUS.AGUARDANDO_EMBARQUE;

  const canSeparar =
    !isGerencia &&
    !isSolicitanteDept &&
    (currentUser?.permissions.canSeparar || isLogisticaOrAlmox || currentUser?.role === 'ADMIN') &&
    order?.status === ORDER_STATUS.AGUARDANDO_SEPARACAO;

  const canFaturar =
    !isGerencia &&
    !isSolicitanteDept &&
    (currentUser?.departmentCode === 'FATURAMENTO' || currentUser?.permissions.canFaturar || currentUser?.role === 'ADMIN') &&
    order?.status === ORDER_STATUS.AGUARDANDO_NOTA_FISCAL;

  const isCreator = currentUser?.id === order?.createdById;

  const canCancel =
    !isGerencia &&
    isCreator &&
    order?.status !== ORDER_STATUS.FATURADO &&
    order?.status !== ORDER_STATUS.CANCELADO;

  const canDevolver =
    !isGerencia &&
    !isSolicitanteDept &&
    (canEmbarcar || canSeparar || canFaturar);

  const canResubmit =
    !isGerencia &&
    (isCreator || currentUser?.departmentId === order?.createdBy?.department?.id || currentUser?.role === 'ADMIN') &&
    order?.status === ORDER_STATUS.PENDENTE_AJUSTE;

  const stages = [
    { key: 'AGUARDANDO_EMBARQUE', label: '1. Inclusão & Embarque', step: 1 },
    { key: 'AGUARDANDO_SEPARACAO', label: '2. Separação', step: 2 },
    { key: 'AGUARDANDO_NOTA_FISCAL', label: '3. Faturamento', step: 3 },
    { key: 'FATURADO', label: '4. Faturado', step: 4 },
  ];

  const getStepState = (stepNumber: number) => {
    const currentStep = currentStatusConfig.step;
    if (order?.status === ORDER_STATUS.CANCELADO) return 'canceled';
    if (currentStep > stepNumber) return 'completed';
    if (currentStep === stepNumber) return 'current';
    return 'upcoming';
  };

  const modalContent = (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-6 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-base font-bold text-[#163765] dark:text-cyan-400 bg-blue-50/70 dark:bg-cyan-950/40 border border-blue-200/60 dark:border-cyan-800/60 px-3 py-1 rounded-xl">
                #{order?.orderNumber || '...'}
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {order?.customerName || 'Detalhes do Pedido'}
              </span>
              {order && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${currentStatusConfig.bgColor} ${currentStatusConfig.textColor} ${currentStatusConfig.borderColor}`}
                >
                  {currentStatusConfig.label}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Botão Rápido Baixar Embarque */}
              {order?.embarqueAttachment && (
                <a
                  href={order.embarqueAttachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={order.embarqueAttachmentName || 'anexo_embarque'}
                  className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                  title={`Baixar Embarque (${order.embarqueAttachmentName || 'Anexo'})`}
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Baixar Embarque</span>
                </a>
              )}

              {/* Botão Rápido Baixar NF */}
              {parsedInvoiceFiles.length > 0 && (
                <a
                  href={parsedInvoiceFiles[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={parsedInvoiceFiles[0].name}
                  className="px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                  title={`Baixar Nota Fiscal (${parsedInvoiceFiles[0].name})`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Baixar NF</span>
                </a>
              )}

              {/* Botão Rápido Baixar Boleto */}
              {parsedBoletoFiles.length > 0 && (
                <a
                  href={parsedBoletoFiles[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={parsedBoletoFiles[0].name}
                  className="px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                  title={`Baixar Boleto Bancário (${parsedBoletoFiles[0].name})`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Baixar Boleto</span>
                </a>
              )}

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
              <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Carregando detalhes do pedido...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {error}
            </div>
          ) : order ? (
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stepper Visual de Etapas */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Progresso na Esteira Operacional:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {stages.map((st) => {
                    const state = getStepState(st.step);
                    return (
                      <div
                        key={st.key}
                        className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                          state === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                            : state === 'current'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : state === 'canceled'
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <div className="text-[11px] font-bold mb-0.5">{st.label}</div>
                        <div className="text-[10px]">
                          {state === 'completed' && 'Concluído ✓'}
                          {state === 'current' && 'Em Andamento'}
                          {state === 'upcoming' && 'Pendente'}
                          {state === 'canceled' && 'Cancelado'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Central de Documentos & Downloads (Embarque, NF e Boleto) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Documentos & Downloads do Pedido</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Acesso direto aos anexos operacionais
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Download Embarque */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Anexo de Embarque</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {order.romaneio ? `Romaneio: ${order.romaneio}` : 'Romaneio não registrado'}
                      </div>
                    </div>
                    <div className="pt-2.5">
                      {order.embarqueAttachment ? (
                        <a
                          href={order.embarqueAttachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={order.embarqueAttachmentName || 'anexo_embarque'}
                          className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="truncate">Baixar Embarque</span>
                        </a>
                      ) : (
                        <span className="block text-center text-[10px] text-slate-400 dark:text-slate-500 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                          {order.embarqueDate ? 'Sem anexo inserido' : 'Pendente de Embarque'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Download Nota Fiscal */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Nota Fiscal (NF)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {order.invoiceNumber ? `NF: ${order.invoiceNumber}` : 'NF não emitida'}
                      </div>
                    </div>
                    <div className="pt-2.5 space-y-1.5">
                      {parsedInvoiceFiles.length > 0 ? (
                        parsedInvoiceFiles.map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={f.name || `nota_fiscal_${order.invoiceNumber || order.orderNumber}`}
                            className="w-full py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 shadow-xs"
                            title={f.name}
                          >
                            <Download className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Baixar NF {parsedInvoiceFiles.length > 1 ? `#${i + 1}` : ''}</span>
                          </a>
                        ))
                      ) : (
                        <span className="block text-center text-[10px] text-slate-400 dark:text-slate-500 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                          {order.invoiceDate ? 'NF sem arquivo anexo' : 'Pendente de Emissão'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Download Boletos */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <Paperclip className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>Boleto Bancário</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {parsedBoletoFiles.length > 0
                          ? `${parsedBoletoFiles.length} boleto(s) anexado(s)`
                          : 'Nenhum boleto anexado'}
                      </div>
                    </div>
                    <div className="pt-2.5 space-y-1.5">
                      {parsedBoletoFiles.length > 0 ? (
                        parsedBoletoFiles.map((b, i) => (
                          <a
                            key={i}
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={b.name || `boleto_${order.orderNumber}`}
                            className="w-full py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 shadow-xs"
                            title={b.name}
                          >
                            <Download className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Baixar Boleto {parsedBoletoFiles.length > 1 ? `#${i + 1}` : ''}</span>
                          </a>
                        ))
                      ) : (
                        <span className="block text-center text-[10px] text-slate-400 dark:text-slate-500 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                          Nenhum boleto disponível
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta de Divergência se o pedido estiver Pendente de Ajuste */}
              {order.status === ORDER_STATUS.PENDENTE_AJUSTE && (
                <div className="p-4 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center space-x-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Pedido com Divergência Apontada:</span>
                    </div>
                    <div className="text-xs text-rose-800 dark:text-rose-300">
                      Devolvido por <strong>{order.returnUserName} ({order.returnUserDept})</strong>: &ldquo;{order.returnReason}&rdquo;
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400">
                      Ao reencaminhar, retornará diretamente para:{' '}
                      <strong>
                        {STATUS_CONFIG[order.returnOriginStage || '']?.label || 'Início da Esteira'}
                        {STATUS_CONFIG[order.returnOriginStage || '']?.departmentResponsible
                          ? ` (${STATUS_CONFIG[order.returnOriginStage || ''].departmentResponsible})`
                          : ''}
                      </strong>
                    </div>
                  </div>

                  {canResubmit && (
                    <button
                      onClick={() => setIsResubmitModalOpen(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Ajustar & Reencaminhar</span>
                    </button>
                  )}
                </div>
              )}

              {/* Botão de Ação Rápida no Topo se houver ação pendente para o perfil logado */}
              {(canEmbarcar || canSeparar || canFaturar) && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Ação Pendente pelo seu Departamento:</span>
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      {canEmbarcar && 'Este pedido está aguardando você registrar o Embarque da mercadoria.'}
                      {canSeparar && 'Este pedido está aguardando a Separação física e autorização de faturamento.'}
                      {canFaturar && 'Este pedido está aguardando você emitir e registrar a Nota Fiscal.'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Botão Devolver por Divergência */}
                    {canDevolver && (
                      <button
                        onClick={() => setIsReturnModalOpen(true)}
                        className="px-3.5 py-2 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
                        title="Apontar problema e devolver pedido ao criador"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Devolver</span>
                      </button>
                    )}

                    {canEmbarcar && (
                      <button
                        onClick={() => setActiveWorkflowModal('EMBARQUE')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Confirmar Embarque</span>
                      </button>
                    )}

                    {canSeparar && (
                      <button
                        onClick={() => setActiveWorkflowModal('AUTORIZAR_FATURAMENTO')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Autorizar Faturamento</span>
                      </button>
                    )}

                    {canFaturar && (
                      <button
                        onClick={() => setActiveWorkflowModal('EMITIR_NF')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Emitir Nota Fiscal</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grid de Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados do Cliente e Pedido */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Dados do Pedido</span>
                  </h3>
                  <div className="text-xs space-y-1.5">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Cliente / Razão Social:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{order.customerName}</span>
                    </div>
                    {order.orderValue && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Valor Aproximado:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {order.orderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Tipo de Pedido:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {order.orderType || 'Venda'}
                      </span>
                    </div>
                    {order.isUrgent && (
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Prioridade:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-600 text-white animate-pulse">
                          Urgente
                        </span>
                      </div>
                    )}
                    {order.romaneio && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Romaneio:</span>{' '}
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{order.romaneio}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Data de Inclusão:</span>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{formatDate(order.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Incluído por:</span>{' '}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {order.createdBy?.name || 'Sistema'} (
                        {order.createdBy?.department?.name || 'Administrativo'})
                      </span>
                    </div>

                    {/* Divisão nítida entre dados do cliente e as observações departamentais */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Observações & Instruções Departamentais
                      </div>
                    </div>

                    {order.separationNotes && (
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-300">
                          <span>Instruções de Separação:</span>
                          <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400">Logística & Almoxarifado</span>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-200 italic">&ldquo;{order.separationNotes}&rdquo;</p>
                      </div>
                    )}
                    {order.fiscalNotes && (
                      <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300">
                          <span>Instruções Fiscais:</span>
                          <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400">Faturamento</span>
                        </div>
                        <p className="text-xs text-purple-800 dark:text-purple-200 italic">&ldquo;{order.fiscalNotes}&rdquo;</p>
                      </div>
                    )}
                    {order.deliveryNotes && (
                      <div className="p-2.5 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-900 dark:text-sky-300">
                          <span>Instruções de Entrega:</span>
                          <span className="text-[10px] font-normal text-sky-600 dark:text-sky-400">Transporte</span>
                        </div>
                        <p className="text-xs text-sky-800 dark:text-sky-200 italic">&ldquo;{order.deliveryNotes}&rdquo;</p>
                      </div>
                    )}
                    {order.generalNotes && !order.separationNotes && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                        &ldquo;{order.generalNotes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumo Operacional por Setor */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Resumo das Etapas Operacionais</span>
                  </h3>

                  <div className="text-xs space-y-2.5">
                    {/* Embarque */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>Embarque (Logística):</span>
                        <span className={order.embarqueDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                          {order.embarqueDate ? 'Realizado ✓' : 'Pendente'}
                        </span>
                      </div>
                      {order.embarqueDate && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                          {order.romaneio && (
                            <div>
                              Romaneio: <strong className="text-blue-600 dark:text-blue-400">{order.romaneio}</strong>
                            </div>
                          )}
                          {order.embarqueAttachment && (
                            <div className="pt-0.5 flex items-center space-x-1">
                              <Paperclip className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                              <a
                                href={order.embarqueAttachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 font-medium"
                              >
                                <span>{order.embarqueAttachmentName || 'Ver anexo do embarque'}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          )}
                          {order.carrier && <div>Transp: <strong>{order.carrier}</strong></div>}
                          <div>Data: {formatDate(order.embarqueDate)} por {order.embarqueUserName}</div>
                        </div>
                      )}
                    </div>

                    {/* Separação (Almoxarifado) */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>Separação (Almoxarifado):</span>
                        <span className={order.separationDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                          {order.separationDate ? 'Separado & Autorizado ✓' : 'Pendente'}
                        </span>
                      </div>
                      {order.separationDate && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                          {order.weight && (
                            <div>
                              Peso: <strong>{order.weight}</strong>
                            </div>
                          )}
                          {order.volume && (
                            <div>
                              Volume: <strong>{order.volume}</strong>
                            </div>
                          )}
                          {order.inspectorName && <div>Conferente: {order.inspectorName}</div>}
                          <div>Data: {formatDate(order.separationDate)} por {order.separationUserName}</div>
                        </div>
                      )}
                    </div>

                    {/* Faturamento */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>Nota Fiscal (Faturamento):</span>
                        <span className={order.invoiceDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                          {order.invoiceDate ? 'Emitida ✓' : 'Pendente'}
                        </span>
                      </div>
                      {order.invoiceDate && (
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                          <div>Nº NF: <strong>{order.invoiceNumber}</strong></div>

                          {/* Lista de NFs anexadas */}
                          {parsedInvoiceFiles.length > 0 && (
                            <div className="space-y-0.5 pt-0.5">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                Arquivo(s) de Nota Fiscal:
                              </span>
                              {parsedInvoiceFiles.map((f, i) => (
                                <div key={i} className="flex items-center space-x-1">
                                  <Paperclip className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5 font-medium truncate"
                                  >
                                    <span className="truncate">{f.name}</span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Lista de Boletos anexados */}
                          {parsedBoletoFiles.length > 0 && (
                            <div className="space-y-0.5 pt-0.5">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                Boleto(s) Bancário(s):
                              </span>
                              {parsedBoletoFiles.map((b, i) => (
                                <div key={i} className="flex items-center space-x-1">
                                  <Paperclip className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <a
                                    href={b.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 font-medium truncate"
                                  >
                                    <span className="truncate">{b.name}</span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          <div>Data: {formatDate(order.invoiceDate)} por {order.invoiceUserName}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Linha do Tempo / Histórico de Auditoria Completo */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>Histórico & Linha do Tempo (Auditoria)</span>
                </h3>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {order.history && order.history.length > 0 ? (
                    order.history.map((hist) => {
                      const toCfg = STATUS_CONFIG[hist.toStatus] || STATUS_CONFIG.AGUARDANDO_EMBARQUE;
                      return (
                        <div key={hist.id} className="relative text-xs">
                          <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 shadow-sm" />
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {hist.userName} ({hist.userDept})
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatDate(hist.createdAt)}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                            Status:{' '}
                            <span className={`font-semibold ${toCfg.textColor}`}>
                              {toCfg.label}
                            </span>
                          </div>
                          {hist.notes && (
                            <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic">
                              &ldquo;{hist.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500">Nenhum histórico registrado.</div>
                  )}
                </div>
              </div>

              {/* Botão de Cancelamento para perfis com permissão */}
              {canCancel && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveWorkflowModal('CANCELAR')}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center space-x-1 hover:underline"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancelar este pedido TOTVS</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal de Transição de Workflow */}
      {activeWorkflowModal && (
        <ActionWorkflowModal
          isOpen={true}
          order={order}
          actionType={activeWorkflowModal}
          onClose={() => setActiveWorkflowModal(null)}
          onSuccess={() => {
            setActiveWorkflowModal(null);
            onOrderUpdated();
            // Recarregar os detalhes do pedido
            if (orderId) {
              fetch(`/api/orders/${orderId}`)
                .then((r) => r.json())
                .then((d) => d.order && setOrder(d.order));
            }
          }}
        />
      )}

      {/* Modal de Devolução por Divergência */}
      <ReturnOrderModal
        isOpen={isReturnModalOpen}
        order={order}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={() => {
          setIsReturnModalOpen(false);
          onOrderUpdated();
          if (orderId) {
            fetch(`/api/orders/${orderId}`)
              .then((r) => r.json())
              .then((d) => d.order && setOrder(d.order));
          }
        }}
      />

      {/* Modal de Ajuste e Reencaminhamento */}
      <ResubmitOrderModal
        isOpen={isResubmitModalOpen}
        order={order}
        onClose={() => setIsResubmitModalOpen(false)}
        onSuccess={() => {
          setIsResubmitModalOpen(false);
          onOrderUpdated();
          if (orderId) {
            fetch(`/api/orders/${orderId}`)
              .then((r) => r.json())
              .then((d) => d.order && setOrder(d.order));
          }
        }}
      />
    </>
  );

  return createPortal(modalContent, document.body);
}

