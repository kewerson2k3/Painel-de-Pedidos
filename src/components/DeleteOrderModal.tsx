'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertOctagon } from 'lucide-react';
import { OrderItem } from '@/types';

interface DeleteOrderModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: DeleteOrderModalProps) {
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

  const handleConfirmDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao excluir pedido.');
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
          <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-900/60">
            <Trash2 className="h-6 w-6" />
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
            Excluir Pedido Definitivamente
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Esta operação irá remover o pedido totalmente do sistema.
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

        {/* Danger Warning Callout */}
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-800 dark:text-red-300 flex items-start space-x-2.5">
          <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Atenção: Ação Irreversível!</strong> O pedido e todos os registros do histórico de
            auditoria serão <strong>excluídos permanentemente</strong> do banco de dados.
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            {loading ? (
              <span>Excluindo...</span>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Sim, Excluir Pedido</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
