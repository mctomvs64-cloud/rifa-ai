"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleId: string;
  raffleTitle: string;
  numbers: number[];
  totalAmount: number;
  promotionId?: string | null;
  promotionName?: string | null;
}

type Step = "form" | "pix" | "confirmed";

interface PixData {
  qrCodeBase64: string;
  copyPaste: string;
  paymentId?: string;
}

export function CheckoutModal({
  isOpen,
  onClose,
  raffleId,
  raffleTitle,
  numbers,
  totalAmount,
  promotionId = null,
  promotionName = null,
}: CheckoutModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;
    timerRef.current = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(timerRef.current!);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [expiresAt]);

  // ── Polling de Status ─────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/status?orderId=${orderId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "PAID") {
        setPollingActive(false);
        clearInterval(pollingRef.current!);
        setWhatsappLink(data.whatsappLink ?? null);
        setStep("confirmed");
      } else if (data.status === "CANCELLED" || data.status === "EXPIRED") {
        setPollingActive(false);
        clearInterval(pollingRef.current!);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [orderId]);

  useEffect(() => {
    if (!pollingActive || !orderId) return;
    pollingRef.current = setInterval(pollStatus, 5000);
    return () => clearInterval(pollingRef.current!);
  }, [pollingActive, orderId, pollStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollingRef.current!);
      clearInterval(timerRef.current!);
    };
  }, []);

  // Reset state when modal reopens
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setPixData(null);
      setOrderId(null);
      setIsProcessing(false);
      setCopied(false);
      setTimeLeft(null);
      setExpiresAt(null);
      setPollingActive(false);
      setWhatsappLink(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId,
          numbers,
          buyerName: formData.name.trim(),
          buyerPhone: formData.phone.replace(/\D/g, ""),
          buyerEmail: formData.email.trim() || undefined,
          ...(promotionId ? { promotionId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao gerar pedido. Tente novamente.");
        setIsProcessing(false);
        return;
      }

      setOrderId(data.orderId);

      if (data.expiresAt) setExpiresAt(new Date(data.expiresAt));

      if (data.pix?.qrCodeBase64) {
        setPixData({
          qrCodeBase64: data.pix.qrCodeBase64,
          copyPaste: data.pix.copyPaste,
          paymentId: data.pix.paymentId,
        });
        setStep("pix");
        setPollingActive(true);
      } else {
        // PIX falhou — redireciona para página de acompanhamento
        router.push(`/checkout/sucesso/${data.orderId}`);
      }
    } catch {
      alert("Erro de conexão. Verifique sua internet e tente novamente.");
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!pixData?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback para execCommand
      const el = document.createElement("textarea");
      el.value = pixData.copyPaste;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border relative overflow-hidden"
        style={{ maxHeight: "95dvh", overflowY: "auto" }}
      >
        {/* Header gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="p-6">
          {/* Close button */}
          {step !== "confirmed" && (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-30 text-sm"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}

          {/* ══════════════════════════════════
              STEP 1 — Formulário
          ══════════════════════════════════ */}
          {step === "form" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-display font-bold mb-1">Finalizar Compra</h2>
              <p className="text-sm text-muted-foreground mb-5 truncate">{raffleTitle}</p>

              {/* Resumo */}
              <div className="bg-muted/40 rounded-2xl p-4 mb-5 border border-border/50">
                {promotionName && (
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-primary">
                    <span>📦</span>
                    <span>{promotionName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-bold">{numbers.length} número{numbers.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed mb-3 max-h-16 overflow-y-auto">
                  {numbers.map((n) => String(n).padStart(3, "0")).join(" · ")}
                </div>
                <div className="flex justify-between items-center font-display font-bold text-xl pt-3 border-t border-border/50">
                  <span>Total</span>
                  <span className="text-accent">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Nome Completo <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/40 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    WhatsApp <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/40 outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Seu comprovante será enviado neste número.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    E-mail{" "}
                    <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/40 outline-none transition-all text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all disabled:opacity-60 shadow-lg mt-2"
                  style={{
                    background: isProcessing
                      ? "var(--muted)"
                      : "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin text-lg">⏳</span>
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      Gerar PIX — {formatCurrency(totalAmount)}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════
              STEP 2 — QR Code PIX
          ══════════════════════════════════ */}
          {step === "pix" && pixData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center text-3xl">
                  🔑
                </div>
                <h2 className="text-xl font-display font-bold">Pague com PIX</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escaneie o QR Code ou copie o código abaixo
                </p>
              </div>

              {/* Timer */}
              {timeLeft !== null && (
                <div
                  className="flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 border"
                  style={{
                    background: timeLeft < 120 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                    borderColor: timeLeft < 120 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)",
                    color: timeLeft < 120 ? "rgb(220,38,38)" : "rgb(22,163,74)",
                  }}
                >
                  <span>⏱</span>
                  <span>Expira em {formatTime(timeLeft)}</span>
                </div>
              )}

              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-2xl border border-border shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-52 h-52 object-contain"
                />
              </div>

              {/* PIX Copia e Cola */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  PIX Copia e Cola
                </label>
                <div className="flex rounded-xl overflow-hidden border border-border">
                  <input
                    type="text"
                    readOnly
                    value={pixData.copyPaste}
                    className="flex-1 px-3 py-3 bg-muted text-xs outline-none min-w-0 truncate"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="shrink-0 px-5 font-bold text-sm transition-all"
                    style={{
                      background: copied
                        ? "rgb(22,163,74)"
                        : "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                      color: "white",
                    }}
                  >
                    {copied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* Polling indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Aguardando confirmação do pagamento...
              </div>

              <button
                onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                className="w-full py-3 rounded-xl border border-border font-semibold text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Já paguei, ver meu pedido →
              </button>
            </div>
          )}

          {/* ══════════════════════════════════
              STEP 3 — Pagamento Confirmado 🎉
          ══════════════════════════════════ */}
          {step === "confirmed" && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center space-y-5 py-4">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-xl"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                🎉
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-green-600">
                  Pagamento Confirmado!
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Seus{" "}
                  <strong className="text-foreground">{numbers.length} número{numbers.length !== 1 ? "s" : ""}</strong>{" "}
                  estão garantidos para o sorteio.
                </p>
              </div>

              <div className="bg-muted/40 rounded-2xl p-4 border border-border/50 text-sm space-y-2 text-left">
                <div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mb-2">
                  Seus números
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold"
                    >
                      {String(n).padStart(3, "0")}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                  >
                    💬 Confirmar no WhatsApp
                  </a>
                )}
                <button
                  onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                  className="w-full py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Ver detalhes do pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
