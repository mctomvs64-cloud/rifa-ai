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

  // ── Polling de Status com detecção de expiração ──────────────────
  const pollStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/status?orderId=${orderId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "PAID") {
        setPollingActive(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
        setWhatsappLink(data.whatsappLink ?? null);
        setStep("confirmed");
      } else if (data.status === "CANCELLED" || data.status === "EXPIRED") {
        setPollingActive(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      // Ignore background network blips
    }
  }, [orderId]);

  useEffect(() => {
    if (!pollingActive || !orderId) return;
    pollingRef.current = setInterval(pollStatus, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollingActive, orderId, pollStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset state when modal opens
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setFormData({ ...formData, phone: formatted });
  };

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 bg-black/70 backdrop-blur-sm"
    >
      <div
        className="bg-background text-foreground w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border relative overflow-hidden flex flex-col"
        style={{ maxHeight: "95dvh" }}
      >
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
              {step === "form" ? "📝" : step === "pix" ? "⚡" : "🎉"}
            </div>
            <div>
              <h2 className="text-xl font-display font-black tracking-tight text-foreground">
                {step === "form" ? "Finalizar Reserva" : step === "pix" ? "Pagamento PIX" : "Cotas Confirmadas!"}
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[240px] sm:max-w-[320px]">
                {raffleTitle}
              </p>
            </div>
          </div>

          {step !== "confirmed" && (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors text-sm font-bold disabled:opacity-40"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* ══════════════════════════════════
              STEP 1 — FORMULÁRIO DO COMPRADOR
          ══════════════════════════════════ */}
          {step === "form" && (
            <div className="space-y-5">
              {/* Card Resumo do Pedido */}
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                {promotionName && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    <span>📦</span>
                    <span>Pacote: {promotionName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Quantidade selecionada:</span>
                  <span className="font-bold text-foreground">
                    {numbers.length} cota{numbers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="max-h-16 overflow-y-auto pr-1 flex flex-wrap gap-1">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="px-2 py-0.5 bg-background border border-border/80 rounded-md text-xs font-mono font-bold text-foreground"
                    >
                      {String(n).padStart(3, "0")}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground">Total a pagar:</span>
                  <span className="font-display font-black text-2xl text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Formulário de Dados */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Nome Completo <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    WhatsApp (com DDD) <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    📱 O comprovante e seus números serão vinculados a este WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    E-mail <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl font-display font-black text-base bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin text-lg">⏳</span>
                        <span>Gerando QR Code PIX...</span>
                      </>
                    ) : (
                      <>
                        <span>Gerar PIX — {formatCurrency(totalAmount)}</span>
                        <span>⚡</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                <span>🔒</span>
                <span>Ambiente 100% Criptografado & Seguro</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              STEP 2 — QR CODE PIX & CONTAGEM
          ══════════════════════════════════ */}
          {step === "pix" && pixData && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Countdown Timer Badge */}
              {timeLeft !== null && (
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs font-bold bg-card"
                  style={{
                    background: timeLeft < 180 ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    borderColor: timeLeft < 180 ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)",
                    color: timeLeft < 180 ? "#dc2626" : "#d97706",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>Reserva temporária:</span>
                  </span>
                  <span className="font-mono text-sm tracking-wider">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}

              {/* QR Code Frame */}
              <div className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl border-2 border-dashed border-amber-500/40 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 object-contain"
                />
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Abra o app do seu banco e escaneie o código
                </p>
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ou copie a chave PIX Copia e Cola
                </label>
                <div className="flex rounded-2xl overflow-hidden border border-border bg-background shadow-xs">
                  <input
                    type="text"
                    readOnly
                    value={pixData.copyPaste}
                    className="flex-1 px-3.5 py-3 bg-transparent text-xs font-mono outline-none min-w-0 truncate text-foreground"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`shrink-0 px-5 font-bold text-xs transition-all flex items-center gap-1.5 text-white ${
                      copied
                        ? "bg-emerald-600"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                    }`}
                  >
                    {copied ? (
                      <>
                        <span>✓</span>
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Indicador de Espera do Webhook */}
              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-medium">Aguardando confirmação bancária em tempo real...</span>
              </div>

              {/* Botão de fallback */}
              <button
                onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                className="w-full py-3 rounded-2xl border border-border font-semibold text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Já realizei o pagamento →
              </button>
            </div>
          )}

          {/* ══════════════════════════════════
              STEP 3 — SUCESSO & COMPROVANTE 🎉
          ══════════════════════════════════ */}
          {step === "confirmed" && (
            <div className="animate-in zoom-in-95 duration-400 text-center space-y-5 py-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-4xl shadow-lg">
                🎉
              </div>

              <div>
                <h3 className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400">
                  Pagamento Confirmado!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Suas cotas foram vinculadas ao seu nome com sucesso. Boa sorte!
                </p>
              </div>

              {/* Cotas Garantidas */}
              <div className="p-4 rounded-2xl bg-card border border-border text-left space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Seus números oficiais:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs rounded-lg"
                    >
                      {String(n).padStart(3, "0")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-2.5 pt-2">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl font-display font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <span>💬</span>
                    <span>Enviar Comprovante ao Vendedor</span>
                  </a>
                )}

                <button
                  onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                  className="w-full py-3 rounded-2xl border border-border font-bold text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Ver Recibo Completo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
