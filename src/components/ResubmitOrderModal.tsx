'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, AlertTriangle, AlertCircle, Trash2, Ban } from 'lucide-react';
import { OrderItem } from '@/types';
import { STATUS_CONFIG, ORDER_STATUS } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ResubmitOrderModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRequestCancel?: (order: OrderItem) => void;
  onRequestDelete?: (order: OrderItem) => void;
}

export default function ResubmitOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
  onRequestCancel,
  onRequestDelete,
}: ResubmitOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (order && isOpen) {
      setCustomerName(order.customerName || '');
      setCustomerCode(order.customerCode || '');
      setGeneralNotes(order.generalNotes || '');
      setResolutionNotes('');
      setError('');
    }
  }, [order, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!mounted || !isOpen || !order) return null;

  const returnStageCfg = order.returnOriginStage
    ? STATUS_CONFIG[order.returnOriginStage] || STATUS_CONFIG.AGUARDANDO_EMBARQUE
    : STATUS_CONFIG.AGUARDANDO_EMBARQUE;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REENCAMINHAR',
          payload: {
            customerName: customerName.trim(),
            customerCode: customerCode.trim() || null,
            generalNotes: generalNotes.trim() || null,
            resolutionNotes: resolutionNotes.trim() || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao reencaminhar pedido.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ajustar & Reencaminhar Pedido
                </h2>
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-800/60">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corrija os apontamentos para que o setor responsável continue o atendimento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Motivo da Divergência Apontado pelo Operador */}
        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-200/60 dark:border-rose-900/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center space-x-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Divergência apontada por {order.returnUserName || 'Operador'} ({order.returnUserDept || 'Setor'}):</span>
            </span>
            <span className="text-[11px] text-rose-700/80 dark:text-rose-400">
              {formatDate(order.returnDate)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/70 dark:border-rose-900/50 text-xs text-slate-800 dark:text-slate-200 italic">
            &ldquo;{order.returnReason}&rdquo;
          </div>
          <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">
            &rarr; Destino ao reencaminhar: <strong>{returnStageCfg.label} ({returnStageCfg.departmentResponsible})</strong>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleResubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome / Razão Social do Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Código Cliente (TOTVS)
              </label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações Gerais do Pedido
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ajustes Realizados / Resposta ao Setor <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={`Ex: Natureza de operação / dados fiscais corrigidos no TOTVS conforme solicitado. Pedido liberado para ${returnStageCfg.departmentResponsible}.`}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Opções alternativas para o Criador: Cancelar ou Excluir */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {onRequestCancel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestCancel(order);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center space-x-1"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancelar Pedido</span>
                </button>
              )}

              {onRequestDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestDelete(order);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center space-x-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>

            {/* Ação principal: Reencaminhar */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <span>Reencaminhando...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Reencaminhar para {returnStageCfg.departmentResponsible || 'Origem'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
