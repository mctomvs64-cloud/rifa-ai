"use client";

import { formatCurrency } from "@/lib/utils";

export interface PromotionOffer {
  id: string;
  name: string;
  quantity: number;
  promoPrice: number;
  originalPrice: number;
  featured: boolean;
}

interface PromotionCardsProps {
  promotions: PromotionOffer[];
  availableCount: number;
  appliedId: string | null;
  onSelect: (promo: PromotionOffer) => void;
}

/**
 * Cards de pacotes promocionais exibidos na página da rifa.
 * Mostra quantidade, preço promocional e economia calculada automaticamente.
 */
export function PromotionCards({
  promotions,
  availableCount,
  appliedId,
  onSelect,
}: PromotionCardsProps) {
  if (promotions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display font-bold text-xl">Pacotes Promocionais</h2>
        <span className="text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent px-2.5 py-1 rounded-full">
          Economize mais
        </span>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {promotions.map((promo) => {
          const savings = promo.originalPrice - promo.promoPrice;
          const discountPercent = Math.round((savings / promo.originalPrice) * 100);
          const insufficient = availableCount < promo.quantity;
          const isApplied = appliedId === promo.id;

          return (
            <div
              key={promo.id}
              className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                isApplied
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              } ${promo.featured ? "border-accent" : ""}`}
            >
              {promo.featured && (
                <span className="absolute -top-3 left-4 text-[10px] font-bold uppercase tracking-wider bg-accent text-white px-2.5 py-1 rounded-full shadow-sm">
                  ⭐ Mais vantajoso
                </span>
              )}

              <div className="font-display font-bold text-lg mb-1">{promo.name}</div>
              <div className="text-sm text-muted-foreground mb-3">
                {promo.quantity} números
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-2xl text-primary">
                    {formatCurrency(promo.promoPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(promo.originalPrice)}
                  </span>
                </div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                  💰 economize {formatCurrency(savings)} ({discountPercent}% off)
                </div>
              </div>

              <button
                onClick={() => onSelect(promo)}
                disabled={insufficient}
                className={`mt-auto w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                  insufficient
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : isApplied
                      ? "bg-primary/10 text-primary border border-primary"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                }`}
              >
                {insufficient
                  ? `Apenas ${availableCount} disponíveis`
                  : isApplied
                    ? "✓ Pacote selecionado"
                    : "Quero esse pacote"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
