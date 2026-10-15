'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, X, AlertTriangle } from 'lucide-react';
import { OrderItem } from '@/types';

interface CancelOrderModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CancelOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCELAR' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao cancelar pedido.');
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col p-6 space-y-4">
        {/* Top Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
            <Ban className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Cancelar Pedido TOTVS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Confirme se realmente deseja cancelar o processamento deste pedido.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Pedido:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-cyan-400">
              #{order.orderNumber}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[220px] truncate">
              {order.customerName}
            </span>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Ao cancelar, o pedido receberá o status <strong>Cancelado</strong> e{' '}
            <strong>não aparecerá para nenhum outro departamento ou etapa</strong>. Ele ficará
            visível exclusivamente para você.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={loading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            {loading ? (
              <span>Cancelando...</span>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                <span>Confirmar Cancelamento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
