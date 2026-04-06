export type PaymentNetwork = "trc20" | "erc20" | "bep20";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

export interface PaymentRecord {
  id: string;
  userId: string;
  type: "deposit";
  status: PaymentStatus;
  network: PaymentNetwork;
  networkLabel?: string;
  address: string;
  requestedAmount: number;
  payableAmount: number;
  txHash?: string | null;
  explorerUrl?: string | null;
  reference: string;
  createdAt?: any;
  updatedAt?: any;
  expiresAt?: any;
  note?: string | null;
  retryOf?: string | null;
}

export type PaymentNetworkConfig = {
  id: PaymentNetwork;
  label: string;
  enabled: boolean;
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: "Ожидает оплаты",
    className: "bg-sky-500/10 text-sky-300 border border-sky-500/20",
    dotClassName: "bg-sky-300",
  },
  processing: {
    label: "В обработке",
    className: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20",
    dotClassName: "bg-yellow-300",
  },
  completed: {
    label: "Зачислен",
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
    dotClassName: "bg-green-400",
  },
  cancelled: {
    label: "Отменен",
    className: "bg-red-500/10 text-red-300 border border-red-500/20",
    dotClassName: "bg-red-300",
  },
  failed: {
    label: "Ошибка",
    className: "bg-red-500/10 text-red-300 border border-red-500/20",
    dotClassName: "bg-red-300",
  },
};

export function shouldShowRepeatPayment(status: PaymentStatus) {
  return status === "cancelled" || status === "processing";
}

export function toDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return null;
}

export function formatPaymentDate(value: any) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatUsdtAmount(value: number) {
  return Number(value || 0).toFixed(3);
}
