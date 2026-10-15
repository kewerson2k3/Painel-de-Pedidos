'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X, AlertCircle } from 'lucide-react';
import { OrderItem } from '@/types';
import { STATUS_CONFIG } from '@/lib/constants';

interface ReturnOrderModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReturnOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: ReturnOrderModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

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

  const currentStatusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.AGUARDANDO_EMBARQUE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Por favor, informe detalhadamente o motivo da divergência / devolução.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEVOLVER',
          payload: { reason: reason.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao devolver pedido.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Devolver Pedido ao Criador
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apontar divergência ou problema na etapa atual
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

        {/* Resumo do Pedido e Etapa */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            Pedido: <span className="font-mono font-bold text-slate-900 dark:text-cyan-400">#{order.orderNumber}</span>
          </div>
          <div>
            Etapa Atual: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentStatusCfg.label}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-300">
            <strong>Como funciona:</strong> Ao confirmar a devolução, o pedido sairá da sua fila operacional e receberá o status{' '}
            <span className="font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
              Pendente de Ajuste
            </span>. O usuário criador (<strong>{order.createdBy?.name || 'Solicitante'}</strong>) receberá o chamado para corrigir os dados, reencaminhar, cancelar ou excluir.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Motivo da Divergência / O que precisa ser ajustado <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Ex: Produto sem saldo físico no almoxarifado. Favor verificar se o lote no TOTVS está correto ou solicitar troca do item com o cliente."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Devolvendo...</span>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  <span>Confirmar Devolução</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
