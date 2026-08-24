"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency, formatDateTime, calcRaffleProgress } from "@/lib/utils";
import { RaffleNumberGrid } from "./raffle-number-grid";
import { PromotionCards, type PromotionOffer } from "./promotion-cards";
import { CheckoutModal } from "../checkout/checkout-modal";

interface RafflePageClientProps {
  raffle: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    prize: string;
    pricePerNumber: number;
    totalNumbers: number;
    minNumbers: number;
    maxNumbers: number;
    drawDate: string | null;
    coverImage: string | null;
    images: string[];
    status: string;
    whatsappNumber: string | null;
    seller: {
      name: string;
      image: string | null;
      phone: string | null;
    };
  };
  numbers: Array<{ number: number; status: "AVAILABLE" | "RESERVED" | "SOLD" }>;
  stats: {
    soldCount: number;
    reservedCount: number;
    availableCount: number;
  };
  promotions: PromotionOffer[];
}

export function RafflePageClient({ raffle, numbers, stats, promotions }: RafflePageClientProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionOffer | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const totalAmount = appliedPromotion
    ? appliedPromotion.promoPrice
    : selectedNumbers.length * raffle.pricePerNumber;

  const progressPercent = calcRaffleProgress(stats.soldCount, raffle.totalNumbers);

  const handleSelectionChange = (selected: number[]) => {
    // Qualquer ajuste manual no grid desvincula promoção fixa se a quantidade mudar
    if (appliedPromotion && selected.length !== appliedPromotion.quantity) {
      setAppliedPromotion(null);
    }
    setSelectedNumbers(selected);
  };

  const handleSelectPromotion = (promo: PromotionOffer) => {
    if (isCheckoutOpen) return;

    // Se o mesmo pacote já está aplicado, desseleciona
    if (appliedPromotion?.id === promo.id) {
      setAppliedPromotion(null);
      return;
    }

    // Valida se ainda existem números suficientes disponíveis
    const available = numbers.filter((n) => n.status === "AVAILABLE");
    if (available.length < promo.quantity) {
      alert(`Restam apenas ${available.length} cotas disponíveis.`);
      return;
    }

    // Sorteia automaticamente a quantidade do pacote entre os disponíveis
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, promo.quantity).map((n) => n.number);

    setAppliedPromotion(promo);
    setSelectedNumbers(picked);
  };

  const handleCheckout = () => {
    if (selectedNumbers.length < raffle.minNumbers) {
      alert(`Selecione pelo menos ${raffle.minNumbers} cota${raffle.minNumbers > 1 ? "s" : ""}.`);
      return;
    }
    setIsCheckoutOpen(true);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start pb-20 lg:pb-8">
      {/* ══════════════════════════════════════════════════════
          COLUNA ESQUERDA (4 cols desktop) — Informações & Cart
      ══════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4 space-y-6">
        {/* Card Principal da Rifa */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          {/* Imagem / Cover */}
          <div className="relative h-64 bg-slate-900 overflow-hidden group">
            {raffle.coverImage ? (
              <Image
                src={raffle.coverImage}
                alt={raffle.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 text-amber-400">
                <span className="text-7xl mb-2">🎟️</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Rifa Oficial</span>
              </div>
            )}

            {/* Badges Flutuantes */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Ativa
              </span>
            </div>

            {raffle.drawDate && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs flex items-center justify-between border border-white/10">
                <span className="text-slate-300">Data do Sorteio:</span>
                <span className="font-bold text-amber-400">{formatDateTime(raffle.drawDate)}</span>
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-5">
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight text-foreground leading-snug mb-1">
                {raffle.title}
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <span>🏆 Prêmio:</span>
                <span>{raffle.prize}</span>
              </div>
            </div>

            {/* Preço Unitário */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-muted/80 to-muted/40 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Valor por cota</span>
                <span className="font-display font-black text-2xl text-foreground">
                  {formatCurrency(raffle.pricePerNumber)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Total de cotas</span>
                <span className="font-bold text-sm text-foreground">{raffle.totalNumbers}</span>
              </div>
            </div>

            {/* Barra de Progresso de Vendas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span>📊</span> Progresso de vendas
                </span>
                <span className="text-primary font-black">{progressPercent}%</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(3, progressPercent))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                <span>🟢 {stats.availableCount} livres</span>
                <span>🟡 {stats.reservedCount} reservadas</span>
                <span>🔒 {stats.soldCount} pagas</span>
              </div>
            </div>

            {/* Descrição se houver */}
            {raffle.description && (
              <div className="pt-2 border-t border-border text-xs text-muted-foreground leading-relaxed">
                {raffle.description}
              </div>
            )}

            {/* Garantias & Segurança */}
            <div className="pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Pagamento instantâneo e seguro via <strong>PIX</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Comprovante e confirmação automática no WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span>Reserva garantida por 15 minutos até o pagamento</span>
              </div>
            </div>
          </div>
        </div>

        {/* Carrinho / Sticky Checkout Lateral */}
        <div className="bg-card border-2 border-primary/20 rounded-3xl p-6 shadow-xl sticky top-24 space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <span>🛒</span> Seu Carrinho
            </h3>
            {selectedNumbers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {selectedNumbers.length} selecionada{selectedNumbers.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {selectedNumbers.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground space-y-2">
              <div className="text-3xl opacity-60">👆</div>
              <p className="text-xs font-medium">Selecione suas cotas no painel ao lado para continuar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pacote Promocional Ativo */}
              {appliedPromotion && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex justify-between items-center font-bold text-amber-700 dark:text-amber-300">
                    <span>📦 {appliedPromotion.name}</span>
                    <button
                      onClick={() => {
                        setAppliedPromotion(null);
                        setSelectedNumbers([]);
                      }}
                      className="text-muted-foreground hover:text-destructive underline text-[11px]"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    Economia de {formatCurrency(appliedPromotion.originalPrice - appliedPromotion.promoPrice)}!
                  </div>
                </div>
              )}

              {/* Lista compacta de números selecionados */}
              <div className="max-h-24 overflow-y-auto pr-1 flex flex-wrap gap-1">
                {selectedNumbers.map((num) => (
                  <span
                    key={num}
                    className="px-2 py-0.5 bg-muted border border-border/80 rounded-md text-xs font-mono font-bold text-foreground"
                  >
                    {String(num).padStart(3, "0")}
                  </span>
                ))}
              </div>

              {/* Total & Botão */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor Total:</span>
                  <span className="font-display font-black text-2xl text-foreground">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-2xl font-display font-black text-base tracking-wide bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Pagar com PIX</span>
                  <span>⚡</span>
                </button>

                <p className="text-[11px] text-center text-muted-foreground">
                  🔒 Seus números serão reservados por 15min ao gerar o PIX.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          COLUNA DIREITA (8 cols desktop) — Promoções & Grid
      ══════════════════════════════════════════════════════ */}
      <div className="lg:col-span-8 space-y-8">
        {/* Pacotes Promocionais */}
        {promotions.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <PromotionCards
              promotions={promotions}
              availableCount={stats.availableCount}
              appliedId={appliedPromotion?.id ?? null}
              onSelect={handleSelectPromotion}
            />
          </div>
        )}

        {/* Grid de Cotas */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-foreground tracking-tight">
                Escolha suas cotas da sorte
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clique nos números para selecionar ou use a escolha rápida.
              </p>
            </div>
          </div>

          <RaffleNumberGrid
            numbers={numbers}
            maxSelectable={raffle.maxNumbers}
            minSelectable={raffle.minNumbers}
            selectedNumbers={selectedNumbers}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BARRA FLUTUANTE MOBILE (Fixa no rodapé quando selecionado)
      ══════════════════════════════════════════════════════ */}
      {selectedNumbers.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground font-medium">
                {selectedNumbers.length} cota{selectedNumbers.length > 1 ? "s" : ""} selecionada{selectedNumbers.length > 1 ? "s" : ""}
              </div>
              <div className="font-display font-black text-xl text-foreground">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md flex items-center gap-2"
            >
              <span>Pagar PIX</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          raffleId={raffle.id}
          raffleTitle={raffle.title}
          raffleCoverImage={raffle.coverImage}
          numbers={selectedNumbers}
          totalAmount={totalAmount}
          promotionId={appliedPromotion?.id ?? null}
          promotionName={appliedPromotion?.name ?? null}
        />
      )}
    </div>
  );
}
