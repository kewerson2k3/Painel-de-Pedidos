export const ORDER_STATUS = {
  AGUARDANDO_EMBARQUE: 'AGUARDANDO_EMBARQUE',
  AGUARDANDO_SEPARACAO: 'AGUARDANDO_SEPARACAO',
  AGUARDANDO_NOTA_FISCAL: 'AGUARDANDO_NOTA_FISCAL',
  FATURADO: 'FATURADO',
  CANCELADO: 'CANCELADO',
  PENDENTE_AJUSTE: 'PENDENTE_AJUSTE',
} as const;

export type OrderStatusType = keyof typeof ORDER_STATUS;

export const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    step: number;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    departmentResponsible: string;
  }
> = {
  AGUARDANDO_EMBARQUE: {
    label: 'Aguardando Embarque',
    step: 1,
    color: 'amber',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    textColor: 'text-amber-700 dark:text-amber-400',
    departmentResponsible: 'Logística',
  },
  AGUARDANDO_SEPARACAO: {
    label: 'Aguardando Separação',
    step: 2,
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800/60',
    textColor: 'text-blue-700 dark:text-blue-400',
    departmentResponsible: 'Almoxarifado', // Alterado da 2ª etapa para Almoxarifado conforme solicitado
  },
  AGUARDANDO_NOTA_FISCAL: {
    label: 'Aguardando Nota Fiscal',
    step: 3,
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800/60',
    textColor: 'text-purple-700 dark:text-purple-400',
    departmentResponsible: 'Faturamento',
  },
  FATURADO: {
    label: 'Faturado',
    step: 4,
    color: 'emerald',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    departmentResponsible: 'Concluído',
  },
  CANCELADO: {
    label: 'Cancelado',
    step: 0,
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800/60',
    textColor: 'text-red-700 dark:text-red-400',
    departmentResponsible: 'Cancelado',
  },
  PENDENTE_AJUSTE: {
    label: 'Pendente de Ajuste',
    step: 0,
    color: 'rose',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800/60',
    textColor: 'text-rose-700 dark:text-rose-400',
    departmentResponsible: 'Solicitante (Criador)',
  },
};

export const WORKFLOW_ACTIONS = {
  CRIACAO: 'Inclusão de Pedido',
  EMBARQUE: 'Embarque Realizado (Logística)',
  AUTORIZAR_FATURAMENTO: 'Separação Realizada & Faturamento Autorizado (Almoxarifado)',
  EMITIR_NF: 'Nota Fiscal Emitida (Faturado)',
  DEVOLUCAO_DIVERGENCIA: 'Divergência Apontada / Devolvido ao Criador',
  REENCAMINHAMENTO: 'Pedido Ajustado & Reencaminhado',
  EDICAO: 'Alteração de Dados',
  CANCELAMENTO: 'Cancelamento de Pedido',
};

export const ORDER_TYPES = [
  'Venda',
  'Locação',
  'Comodato',
  'Demonstração',
  'Transferência',
  'Serviço',
  'Insumo',
] as const;
