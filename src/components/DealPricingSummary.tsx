import {
  formatUsdAmount,
  getViewsMaxDealPricing,
  getViewsPaymentMeta,
  getViewsReviewDueDate,
  hasFinalizedViewsPricing,
  isViewsPaymentModel,
  resolveDealPricing,
  type DealPricingSnapshot,
} from "../lib/dealPricing";

type DealPricingSummaryProps = {
  pricing?: DealPricingSnapshot | null;
  fallbackPayoutAmount: number;
  title?: string;
  compact?: boolean;
};

export function DealPricingSummary({
  pricing,
  fallbackPayoutAmount,
  title = "Расчет оплаты",
  compact = false,
}: DealPricingSummaryProps) {
  const isViewsDeal = isViewsPaymentModel((pricing as any)?.paymentModel);
  const hasFinalViewsPricing = hasFinalizedViewsPricing(pricing as any);
  const viewsMeta = getViewsPaymentMeta({ ...(pricing as any), price: fallbackPayoutAmount });
  const viewsMaxPricing = getViewsMaxDealPricing({ ...(pricing as any), price: fallbackPayoutAmount });
  const statsDueDate = getViewsReviewDueDate(pricing as any);
  const resolvedPricing = resolveDealPricing(pricing, fallbackPayoutAmount);

  if (isViewsDeal && !hasFinalViewsPricing) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${compact ? "p-3" : "p-4"}`}>
        <div className={`mb-3 ${compact ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex items-start justify-between gap-3"}`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/45">{title}</p>
            <p className="text-xs text-foreground/55 mt-1">
              Финальная сумма появится после окна сбора статистики{statsDueDate ? ` до ${statsDueDate.toLocaleDateString("ru-RU")}` : ""}.
            </p>
          </div>
          <div className={`rounded-xl border border-white/10 bg-background/60 ${compact ? "w-full px-3 py-2 sm:w-auto sm:min-w-[132px]" : "min-w-[148px] px-3 py-2"} text-right`}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Максимум для бренда</div>
            <div className="font-mono font-semibold text-white">${formatUsdAmount(viewsMaxPricing.customerTotalAmount)}</div>
          </div>
        </div>

        <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"}`}>
          <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
            <div className="text-[11px] text-foreground/55">Ставка для креатора</div>
            <div className="font-mono font-bold text-green-400">
              {viewsMeta.cpm > 0 ? `$${formatUsdAmount(viewsMeta.cpm)} / 1K` : "Уточняется"}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
            <div className="text-[11px] text-foreground/55">Правило выплаты</div>
            <div className="text-sm font-medium text-white">
              {viewsMeta.minViews > 0
                ? `После ${viewsMeta.minViews} просмотров, до $${formatUsdAmount(viewsMeta.maxPayout)}`
                : `По факту просмотров, до $${formatUsdAmount(viewsMeta.maxPayout)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resolvedPricing.customerTotalAmount <= 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${compact ? "p-3" : "p-4"}`}>
      <div className={`mb-3 ${compact ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex items-start justify-between gap-3"}`}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/45">{title}</p>
          <p className="text-xs text-foreground/55 mt-1">
            {isViewsDeal && typeof (pricing as any)?.actualViews === "number"
              ? `Финальная сумма зафиксирована по ${(pricing as any).actualViews.toLocaleString("ru-RU")} просмотрам.`
              : "В итог уже включены сервис ADROP и безопасная сделка."}
          </p>
        </div>
        <div className={`rounded-xl border border-white/10 bg-background/60 ${compact ? "w-full px-3 py-2 sm:w-auto sm:min-w-[132px]" : "min-w-[148px] px-3 py-2"} text-right`}>
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Платит бренд</div>
          <div className="font-mono font-semibold text-white">${formatUsdAmount(resolvedPricing.customerTotalAmount)}</div>
        </div>
      </div>

      <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"}`}>
        <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
          <div className="text-[11px] text-foreground/55">Креатор получает</div>
          <div className="font-mono font-bold text-green-400">${formatUsdAmount(resolvedPricing.creatorPayoutAmount)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
          <div className="text-[11px] text-foreground/55">Что уже учтено в стоимости</div>
          <div className="text-sm font-medium text-white">Сервис ADROP и безопасная сделка</div>
        </div>
      </div>
    </div>
  );
}
