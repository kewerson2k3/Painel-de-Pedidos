'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Truck,
  CheckCircle2,
  FileText,
  Ban,
  AlertCircle,
  Paperclip,
  UploadCloud,
  Trash2,
  Loader2,
} from 'lucide-react';
import { OrderItem } from '@/types';

interface UploadedFile {
  url: string;
  name: string;
  size?: number;
}

interface ActionWorkflowModalProps {
  isOpen: boolean;
  order: OrderItem | null;
  actionType: 'EMBARQUE' | 'AUTORIZAR_FATURAMENTO' | 'EMITIR_NF' | 'CANCELAR' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ActionWorkflowModal({
  isOpen,
  order,
  actionType,
  onClose,
  onSuccess,
}: ActionWorkflowModalProps) {
  const [mounted, setMounted] = useState(false);

  // Campos específicos
  const [romaneio, setRomaneio] = useState('');
  const [embarqueAttachment, setEmbarqueAttachment] = useState<UploadedFile | null>(null);
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [separationNotes, setSeparationNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [fiscalNotes, setFiscalNotes] = useState('');
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedFile[]>([]);
  const [boletoFiles, setBoletoFiles] = useState<UploadedFile[]>([]);

  // Estados de controle
  const [uploadingEmbarque, setUploadingEmbarque] = useState(false);
  const [uploadingInvoices, setUploadingInvoices] = useState(false);
  const [uploadingBoletos, setUploadingBoletos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const embarqueInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const boletoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Preencher valores ao abrir o modal
  useEffect(() => {
    if (order && isOpen) {
      setRomaneio(order.romaneio || '');
      setWeight(order.weight || '');
      setVolume(order.volume || '');
      setSeparationNotes(order.separationNotes || '');
      setFiscalNotes(order.fiscalNotes || '');
      setInvoiceNumber(order.invoiceNumber || '');

      if (order.embarqueAttachment) {
        setEmbarqueAttachment({
          url: order.embarqueAttachment,
          name: order.embarqueAttachmentName || 'Anexo Romaneio',
        });
      } else {
        setEmbarqueAttachment(null);
      }

      if (order.invoiceFiles) {
        try {
          const parsed = JSON.parse(order.invoiceFiles);
          setInvoiceFiles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setInvoiceFiles([]);
        }
      } else {
        setInvoiceFiles([]);
      }

      if (order.boletoFiles) {
        try {
          const parsed = JSON.parse(order.boletoFiles);
          setBoletoFiles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setBoletoFiles([]);
        }
      } else {
        setBoletoFiles([]);
      }

      setError('');
    }
  }, [order, isOpen, actionType]);

  // Fechar com ESC e travar scroll
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

  if (!isOpen || !order || !actionType || !mounted) return null;

  // Funções de upload
  const handleUploadEmbarque = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEmbarque(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar upload do arquivo.');
      }

      setEmbarqueAttachment(data.file);
    } catch (err: any) {
      setError(err.message || 'Falha ao anexar arquivo.');
    } finally {
      setUploadingEmbarque(false);
      if (embarqueInputRef.current) embarqueInputRef.current.value = '';
    }
  };

  const handleUploadInvoices = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingInvoices(true);
    setError('');

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar upload da Nota Fiscal.');
      }

      setInvoiceFiles((prev) => [...prev, ...(data.files || [])]);
    } catch (err: any) {
      setError(err.message || 'Falha ao anexar Nota Fiscal.');
    } finally {
      setUploadingInvoices(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = '';
    }
  };

  const handleUploadBoletos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingBoletos(true);
    setError('');

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar upload de boletos.');
      }

      setBoletoFiles((prev) => [...prev, ...(data.files || [])]);
    } catch (err: any) {
      setError(err.message || 'Falha ao anexar boleto.');
    } finally {
      setUploadingBoletos(false);
      if (boletoInputRef.current) boletoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (actionType === 'EMBARQUE') {
      if (!romaneio.trim()) {
        setError('O campo Romaneio é obrigatório para confirmar o embarque.');
        return;
      }
    } else if (actionType === 'AUTORIZAR_FATURAMENTO') {
      if (!weight.trim()) {
        setError('O campo Peso é obrigatório para autorizar o faturamento.');
        return;
      }
      if (!volume.trim()) {
        setError('O campo Volume é obrigatório para autorizar o faturamento.');
        return;
      }
    } else if (actionType === 'EMITIR_NF') {
      if (!invoiceNumber.trim()) {
        setError('O número da Nota Fiscal é obrigatório para concluir o faturamento.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {};

      if (actionType === 'EMBARQUE') {
        payload.romaneio = romaneio.trim();
        payload.embarqueAttachment = embarqueAttachment?.url || null;
        payload.embarqueAttachmentName = embarqueAttachment?.name || null;
        payload.separationNotes = separationNotes.trim();
      } else if (actionType === 'AUTORIZAR_FATURAMENTO') {
        payload.weight = weight.trim();
        payload.volume = volume.trim();
        payload.separationNotes = separationNotes.trim();
      } else if (actionType === 'EMITIR_NF') {
        payload.invoiceNumber = invoiceNumber.trim();
        payload.fiscalNotes = fiscalNotes.trim();
        payload.invoiceFiles = invoiceFiles;
        payload.boletoFiles = boletoFiles;
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          payload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar etapa do pedido.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const getTitleAndIcon = () => {
    switch (actionType) {
      case 'EMBARQUE':
        return {
          title: 'Confirmar Embarque do Pedido',
          subtitle: 'Avança o status para "Aguardando Separação"',
          icon: <Truck className="h-5 w-5 text-blue-500" />,
          buttonText: 'Confirmar Embarque',
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'AUTORIZAR_FATURAMENTO':
        return {
          title: 'Autorizar Faturamento (Pedido Separado)',
          subtitle: 'Avança o status para "Aguardando Nota Fiscal"',
          icon: <CheckCircle2 className="h-5 w-5 text-purple-500" />,
          buttonText: 'Autorizar Faturamento',
          buttonClass: 'bg-purple-600 hover:bg-purple-700',
        };
      case 'EMITIR_NF':
        return {
          title: 'Emitir Nota Fiscal (Faturar)',
          subtitle: 'Registra a NF e conclui o pedido como "Faturado"',
          icon: <FileText className="h-5 w-5 text-emerald-500" />,
          buttonText: 'Finalizar Faturamento',
          buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'CANCELAR':
        return {
          title: 'Cancelar Pedido TOTVS',
          subtitle: 'O pedido será marcado como Cancelado',
          icon: <Ban className="h-5 w-5 text-red-500" />,
          buttonText: 'Confirmar Cancelamento',
          buttonClass: 'bg-red-600 hover:bg-red-700',
        };
    }
  };

  const info = getTitleAndIcon();

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              {info.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{info.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{info.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo do Pedido com Romaneio abaixo do Pedido quando aplicável */}
        <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div>
                Pedido:{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-cyan-400">
                  #{order.orderNumber}
                </span>
              </div>
              {(actionType === 'AUTORIZAR_FATURAMENTO' || actionType === 'EMITIR_NF') && (
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  Embarque / Romaneio:{' '}
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {order.romaneio || 'Não informado'}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right truncate max-w-[220px]">
              <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                {order.customerName}
              </div>
              {order.orderType && (
                <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                  {order.orderType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================= ETAPA 1: EMBARQUE ======================= */}
          {actionType === 'EMBARQUE' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Romaneio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ROM-2026-9988 ou número do romaneio"
                  value={romaneio}
                  onChange={(e) => setRomaneio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>

              {/* Inserir Anexo (PDF, XLSX, XLS, etc) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Anexar Arquivo (PDF, Excel, Planilha, etc.)
                </label>
                <input
                  ref={embarqueInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleUploadEmbarque}
                />

                {embarqueAttachment ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {embarqueAttachment.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmbarqueAttachment(null)}
                      className="text-red-500 hover:text-red-700 transition p-1"
                      title="Remover anexo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => embarqueInputRef.current?.click()}
                    disabled={uploadingEmbarque}
                    className="w-full py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-2 transition"
                  >
                    {uploadingEmbarque ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Enviando anexo...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 text-slate-400" />
                        <span>Clique para selecionar anexo do embarque</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Observação de Separação (vem preenchido com a do criador) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observação de Separação
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruções ou observações específicas para separação no almoxarifado..."
                  value={separationNotes}
                  onChange={(e) => setSeparationNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>
            </>
          )}

          {/* ======================= ETAPA 2: AUTORIZAR FATURAMENTO ======================= */}
          {actionType === 'AUTORIZAR_FATURAMENTO' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Peso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 45.5 kg"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Volume <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 3 caixas / 1 pallet"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              {/* Observação de Separação (vem preenchido com a do criador) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observação de Separação
                </label>
                <textarea
                  rows={3}
                  placeholder="Observação da separação efetuada..."
                  value={separationNotes}
                  onChange={(e) => setSeparationNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>
            </>
          )}

          {/* ======================= ETAPA 3: EMITIR NF ======================= */}
          {actionType === 'EMITIR_NF' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número da Nota Fiscal (NF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 000.124.580"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>

              {/* Inserir NF (pode ser mais de 1) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Anexar Nota(s) Fiscal(is) (PDF, XML, etc.)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {invoiceFiles.length} anexo(s)
                  </span>
                </div>
                <input
                  ref={invoiceInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xml,.xlsx,.xls,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleUploadInvoices}
                />
                <button
                  type="button"
                  onClick={() => invoiceInputRef.current?.click()}
                  disabled={uploadingInvoices}
                  className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-2 transition mb-2"
                >
                  {uploadingInvoices ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Fazendo upload de NF...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                      <span>Adicionar arquivo(s) de Nota Fiscal</span>
                    </>
                  )}
                </button>

                {invoiceFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {invoiceFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Paperclip className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate text-slate-800 dark:text-slate-200">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInvoiceFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-0.5 ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inserir Boleto (pode ser mais de 1) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Anexar Boleto(s) Bancário(s)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {boletoFiles.length} anexo(s)
                  </span>
                </div>
                <input
                  ref={boletoInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleUploadBoletos}
                />
                <button
                  type="button"
                  onClick={() => boletoInputRef.current?.click()}
                  disabled={uploadingBoletos}
                  className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-2 transition mb-2"
                >
                  {uploadingBoletos ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Fazendo upload de boletos...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                      <span>Adicionar arquivo(s) de Boleto</span>
                    </>
                  )}
                </button>

                {boletoFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {boletoFiles.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Paperclip className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <span className="truncate text-slate-800 dark:text-slate-200">{b.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBoletoFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-0.5 ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observação Fiscal (vem preenchido com a do criador) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observação Fiscal
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruções tributárias, CFOP, alíquotas ou observações fiscais..."
                  value={fiscalNotes}
                  onChange={(e) => setFiscalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white dark:focus:bg-slate-800 transition"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploadingEmbarque || uploadingInvoices || uploadingBoletos}
              className={`px-5 py-2 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 ${info.buttonClass}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{info.buttonText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
