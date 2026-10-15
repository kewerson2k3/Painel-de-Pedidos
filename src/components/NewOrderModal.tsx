'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PlusCircle, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

import { ORDER_TYPES } from '@/lib/constants';

export default function NewOrderModal({ isOpen, onClose, onSuccess }: NewOrderModalProps) {
  const [mounted, setMounted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('Venda');
  const [isUrgent, setIsUrgent] = useState(false);
  const [separationNotes, setSeparationNotes] = useState('');
  const [fiscalNotes, setFiscalNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar com ESC e travar scroll do body
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orderNumber.trim()) {
      setError('Informe o Número do Pedido no TOTVS.');
      return;
    }

    if (!customerName.trim()) {
      setError('Informe a Razão Social ou Nome do Cliente.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          customerName,
          orderType,
          isUrgent,
          separationNotes,
          fiscalNotes,
          deliveryNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar pedido.');
      }

      // Limpar formulário e fechar
      setOrderNumber('');
      setCustomerName('');
      setOrderType('Venda');
      setIsUrgent(false);
      setSeparationNotes('');
      setFiscalNotes('');
      setDeliveryNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-[#00a8cc] flex items-center justify-center border border-cyan-100 dark:border-cyan-900/60">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Novo Pedido TOTVS</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Insira os dados para iniciar o fluxo operacional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados Principais do TOTVS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nº do Pedido (TOTVS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 104582"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo do Pedido <span className="text-red-500">*</span>
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition cursor-pointer"
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome / Razão Social do Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Hospital Municipal Santa Clara Ltda"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          {/* Caixa de Seleção Urgente */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isUrgent
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 ring-2 ring-rose-400/30'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Pedido Urgente
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-600 text-white shadow-xs">
                    Prioridade Máxima
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Ficará piscando em vermelho claro nas Etapas 1, 2 e 3 e ficará posicionado no topo da lista de pedidos.
                </p>
              </div>
            </label>
          </div>

          {/* Observação de Separação (Logística / Almoxarifado) */}
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Observação de Separação
              </label>
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
                Visível apenas: Logística & Almoxarifado
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Ex: separar com prioridade, embarcar itens de RRT, conferir item com N/S: 598956..."
              value={separationNotes}
              onChange={(e) => setSeparationNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
            />
          </div>

          {/* Observação Fiscal (Faturamento) */}
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Observação Fiscal
              </label>
              <span className="text-[10px] font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 px-2 py-0.5 rounded-md">
                Visível apenas: Faturamento
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Ex: CFOP específico para remessa em comodato, natureza de operação, dados adicionais..."
              value={fiscalNotes}
              onChange={(e) => setFiscalNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
            />
          </div>

          {/* Observação de Entrega (Transporte) */}
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Observação de Entrega
              </label>
              <span className="text-[10px] font-medium text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 px-2 py-0.5 rounded-md">
                Visível apenas: Transporte
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Ex: agendamento com antecedência de 24h, entrega exclusiva pela manhã, modal específico..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] transition"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-[#163765] to-[#00a8cc] hover:from-[#112c52] hover:to-[#0092b3] text-white font-semibold text-xs rounded-xl shadow-md shadow-cyan-900/10 hover:shadow-cyan-900/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Cadastrar Pedido</span>
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
