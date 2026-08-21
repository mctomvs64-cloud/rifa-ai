"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

interface OrderData {
  orderId: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  paidAt: string | null;
  expiresAt: string | null;
  whatsappLink: string | null;
  raffle: { title: string; slug: string };
  numbers: number[];
}

export default function CheckoutSuccessClient({
  initialOrder,
  totalAmount,
}: {
  initialOrder: OrderData;
  totalAmount: number;
}) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPaid = order.status === "PAID";
  const isCancelled = order.status === "CANCELLED" || order.status === "EXPIRED";

  // ── Countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!order.expiresAt || isPaid) return;
    const expires = new Date(order.expiresAt);
    timerRef.current = setInterval(() => {
      const diff = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(timerRef.current!);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [order.expiresAt, isPaid]);

  // ── Polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaid || isCancelled) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/status?orderId=${order.orderId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: OrderData = await res.json();
        setOrder(data);
        if (data.status === "PAID" || data.status === "CANCELLED" || data.status === "EXPIRED") {
          clearInterval(pollingRef.current!);
        }
      } catch {
        // Ignore silently
      }
    }, 5000);

    return () => clearInterval(pollingRef.current!);
  }, [order.orderId, isPaid, isCancelled]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-8 text-center">

          {/* Status icon */}
          <div className="flex justify-center mb-6">
            {isPaid ? (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-xl"
                style={{ background: "linear-gradient(135deg, #22c55e, #15803d)" }}
              >
                🎉
              </div>
            ) : isCancelled ? (
              <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-5xl shadow-inner">
                ❌
              </div>
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-xl animate-pulse"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                ⏳
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">
            {isPaid
              ? "Pagamento Confirmado!"
              : isCancelled
              ? "Pedido Cancelado"
              : "Aguardando Pagamento"}
          </h1>

          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {isPaid
              ? "Seus números estão garantidos para o sorteio. Boa sorte! 🍀"
              : isCancelled
              ? "Este pedido foi cancelado ou expirou. Os números voltaram a ficar disponíveis."
              : "Já pagou? Estamos aguardando a confirmação automática do banco."}
          </p>

          {/* Timer para pendente */}
          {!isPaid && !isCancelled && timeLeft !== null && (
            <div
              className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 border mb-6"
              style={{
                background: timeLeft < 120 ? "rgba(239,68,68,0.08)" : "rgba(251,191,36,0.1)",
                borderColor: timeLeft < 120 ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.4)",
                color: timeLeft < 120 ? "rgb(220,38,38)" : "rgb(180,130,0)",
              }}
            >
              <span>⏱</span>
              <span>Expira em {formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Polling indicator */}
          {!isPaid && !isCancelled && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              Verificando pagamento automaticamente...
            </div>
          )}

          {/* Detalhes do pedido */}
          <div className="bg-muted/40 rounded-2xl p-6 text-left space-y-4 mb-8 border border-border/50">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Rifa
              </div>
              <div className="font-semibold">{order.raffle.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                  Total Pago
                </div>
                <div className="font-display text-xl font-bold text-accent">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                  Status
                </div>
                <div
                  className={`font-bold text-sm ${
                    isPaid
                      ? "text-green-600"
                      : isCancelled
                      ? "text-red-500"
                      : "text-yellow-600"
                  }`}
                >
                  {isPaid ? "✅ PAGO" : isCancelled ? "❌ CANCELADO" : "⏳ PENDENTE"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                Seus Números ({order.numbers.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {order.numbers.map((n) => (
                  <span
                    key={n}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      isPaid
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-background border-border text-foreground"
                    }`}
                  >
                    {String(n).padStart(3, "0")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            {isPaid && order.whatsappLink && (
              <a
                href={order.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-base shadow-lg transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
              >
                💬 Confirmar com o Vendedor no WhatsApp
              </a>
            )}

            <Link
              href={`/rifas/${order.raffle.slug}`}
              className="w-full block py-3.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all text-sm"
            >
              ← Voltar para a Rifa
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
