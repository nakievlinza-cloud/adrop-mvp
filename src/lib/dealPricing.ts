export const PLATFORM_FEE_RATE = 0.15;
export const PAYMENT_ESCROW_FEE_RATE = 0.025;
export const TOTAL_BRAND_FEE_RATE = PLATFORM_FEE_RATE + PAYMENT_ESCROW_FEE_RATE;
export const MINIMUM_OFFER_BUDGET_USD = 100;
export const MINIMUM_PLATFORM_FEE_USD = 15;

export type DealPricingSnapshot = {
  creatorPayoutAmount?: number;
  platformFeeAmount?: number;
  paymentEscrowFeeAmount?: number;
  customerTotalAmount?: number;
  platformFeeRate?: number;
  paymentEscrowFeeRate?: number;
};

export type DealPricing = Required<DealPricingSnapshot>;
export type ViewsPaymentMeta = {
  cpm: number;
  minViews: number;
  maxPayout: number;
};

type ViewsPricingSource = DealPricingSnapshot & {
  paymentModel?: string | null;
  paymentDetails?: Partial<ViewsPaymentMeta> | null;
  budget?: number | null;
  price?: number | null;
  payoutStatus?: string | null;
  actualViews?: number | null;
  statsReviewDueAt?: any;
};

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatUsdAmount(value: number) {
  const normalized = roundMoney(value);
  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(2);
}

export function isViewsPaymentModel(paymentModel?: string | null) {
  return paymentModel === "За просмотры";
}

export function getViewsPaymentMeta(source?: ViewsPricingSource | null): ViewsPaymentMeta {
  const details = source?.paymentDetails || {};
  const fallbackMaxPayout = Number(details.maxPayout ?? source?.budget ?? source?.price ?? 0);

  return {
    cpm: roundMoney(Math.max(0, Number(details.cpm) || 0)),
    minViews: Math.max(0, Math.round(Number(details.minViews) || 0)),
    maxPayout: roundMoney(Math.max(0, fallbackMaxPayout || 0)),
  };
}

export function getViewsReviewDueDate(source?: ViewsPricingSource | null) {
  const rawValue = source?.statsReviewDueAt;

  if (!rawValue) return null;
  if (typeof rawValue?.toDate === "function") return rawValue.toDate();

  const normalized = new Date(rawValue);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

export function hasFinalizedViewsPricing(source?: ViewsPricingSource | null) {
  return (
    isViewsPaymentModel(source?.paymentModel) &&
    typeof source?.actualViews === "number" &&
    Number.isFinite(source.actualViews) &&
    typeof source?.creatorPayoutAmount === "number" &&
    Number.isFinite(source.creatorPayoutAmount) &&
    typeof source?.customerTotalAmount === "number" &&
    Number.isFinite(source.customerTotalAmount)
  );
}

export function calculateViewsPayout(
  actualViewsInput: number,
  source?: ViewsPricingSource | ViewsPaymentMeta | null,
) {
  const meta = source && "cpm" in source && "minViews" in source && "maxPayout" in source
    ? source
    : getViewsPaymentMeta(source as ViewsPricingSource | null | undefined);
  const actualViews = Math.max(0, Math.round(Number(actualViewsInput) || 0));
  const thresholdMet = meta.minViews <= 0 || actualViews >= meta.minViews;
  const rawCreatorPayout = thresholdMet ? roundMoney((actualViews / 1000) * meta.cpm) : 0;
  const creatorPayoutAmount = roundMoney(
    meta.maxPayout > 0 ? Math.min(rawCreatorPayout, meta.maxPayout) : rawCreatorPayout,
  );
  const pricing = calculateDealPricing(creatorPayoutAmount);

  return {
    ...pricing,
    actualViews,
    thresholdMet,
    rawCreatorPayout,
    capped: meta.maxPayout > 0 && rawCreatorPayout > meta.maxPayout,
  };
}

export function getViewsMaxDealPricing(source?: ViewsPricingSource | null) {
  return calculateDealPricing(getViewsPaymentMeta(source).maxPayout);
}

export function calculateDealPricing(creatorPayoutInput: number): DealPricing {
  const creatorPayoutAmount = roundMoney(Math.max(0, Number(creatorPayoutInput) || 0));
  const platformFeeAmount = roundMoney(creatorPayoutAmount * PLATFORM_FEE_RATE);
  const paymentEscrowFeeAmount = roundMoney(creatorPayoutAmount * PAYMENT_ESCROW_FEE_RATE);
  const customerTotalAmount = roundMoney(
    creatorPayoutAmount + platformFeeAmount + paymentEscrowFeeAmount,
  );

  return {
    creatorPayoutAmount,
    platformFeeAmount,
    paymentEscrowFeeAmount,
    customerTotalAmount,
    platformFeeRate: PLATFORM_FEE_RATE,
    paymentEscrowFeeRate: PAYMENT_ESCROW_FEE_RATE,
  };
}

export function resolveDealPricing(
  snapshot: DealPricingSnapshot | null | undefined,
  fallbackCreatorPayout: number,
): DealPricing {
  const hasCompleteSnapshot =
    snapshot &&
    [snapshot.creatorPayoutAmount, snapshot.platformFeeAmount, snapshot.paymentEscrowFeeAmount, snapshot.customerTotalAmount].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    );

  if (hasCompleteSnapshot) {
    return {
      creatorPayoutAmount: roundMoney(snapshot.creatorPayoutAmount || 0),
      platformFeeAmount: roundMoney(snapshot.platformFeeAmount || 0),
      paymentEscrowFeeAmount: roundMoney(snapshot.paymentEscrowFeeAmount || 0),
      customerTotalAmount: roundMoney(snapshot.customerTotalAmount || 0),
      platformFeeRate: snapshot.platformFeeRate || PLATFORM_FEE_RATE,
      paymentEscrowFeeRate: snapshot.paymentEscrowFeeRate || PAYMENT_ESCROW_FEE_RATE,
    };
  }

  return calculateDealPricing(fallbackCreatorPayout);
}

export function getCreatorPayoutAmount(
  snapshot: DealPricingSnapshot | null | undefined,
  fallbackCreatorPayout: number,
) {
  return resolveDealPricing(snapshot, fallbackCreatorPayout).creatorPayoutAmount;
}
