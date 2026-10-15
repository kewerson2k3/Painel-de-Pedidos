import { AuthUserPayload } from '@/lib/auth';

export type UserSession = AuthUserPayload;

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface UserItem {
  id: string;
  name: string;
  username: string;
  departmentId: string;
  department?: DepartmentItem;
  role: string;
  active: boolean;
  canCreateOrder: boolean;
  viewAllStages: boolean;
  canEmbarcar: boolean;
  canSeparar: boolean;
  canFaturar: boolean;
  canEditOrder: boolean;
  canCancelOrder: boolean;
  canManageUsers: boolean;
  createdAt: string;
}

export interface OrderHistoryItem {
  id: string;
  orderId: string;
  userId?: string | null;
  userName: string;
  userDept: string;
  action: string;
  fromStatus?: string | null;
  toStatus: string;
  notes?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCode?: string | null;
  orderValue?: number | null;
  orderType?: string | null;
  isUrgent?: boolean;
  generalNotes?: string | null;
  separationNotes?: string | null;
  fiscalNotes?: string | null;
  deliveryNotes?: string | null;
  status: string;

  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    username: string;
    department?: DepartmentItem;
  };

  embarqueDate?: string | null;
  carrier?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  romaneio?: string | null;
  embarqueAttachment?: string | null;
  embarqueAttachmentName?: string | null;
  embarqueNotes?: string | null;
  embarqueUserName?: string | null;

  separationDate?: string | null;
  inspectorName?: string | null;
  weight?: string | null;
  volume?: string | null;
  separationUserName?: string | null;

  invoiceNumber?: string | null;
  invoiceAccessKey?: string | null;
  invoiceDate?: string | null;
  invoiceFiles?: string | null;
  boletoFiles?: string | null;
  invoiceNotes?: string | null;
  invoiceUserName?: string | null;

  returnReason?: string | null;
  returnOriginStage?: string | null;
  returnUserId?: string | null;
  returnUserName?: string | null;
  returnUserDept?: string | null;
  returnDate?: string | null;
  returnResolutionNotes?: string | null;

  history?: OrderHistoryItem[];
  createdAt: string;
  updatedAt: string;
}
