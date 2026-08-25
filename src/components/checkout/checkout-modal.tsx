"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleId: string;
  raffleTitle: string;
  raffleCoverImage?: string | null;
  numbers: number[];
  totalAmount: number;
  promotionId?: string | null;
  promotionName?: string | null;
}

type Step = "form" | "pix" | "confirmed";

type PayMethod = "pix" | "pro";

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
  raffleCoverImage,
  numbers,
  totalAmount,
  promotionId = null,
  promotionName = null,
}: CheckoutModalProps) {
  const coverImage = raffleCoverImage || null;
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [isProcessing, setIsProcessing] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      setPayMethod("pix");
      setErrorMsg(null);
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

  const processOrder = async (method: PayMethod) => {
    setPayMethod(method);
    setIsProcessing(true);
    setErrorMsg(null);

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

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        // Resposta vazia ou HTML (timeout do servidor)
        setErrorMsg("O servidor demorou mais que o esperado. Aguarde 10 segundos e tente novamente.");
        setIsProcessing(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg((data.error as string) || "Erro ao gerar pedido. Tente novamente.");
        setIsProcessing(false);
        return;
      }

      setOrderId(data.orderId as string);

      if (data.expiresAt) setExpiresAt(new Date(data.expiresAt as string));

      // ── Fluxo Checkout Pro (cartão e outros métodos) ──
      if (method === "pro") {
        try {
          const proRes = await fetch(
            `/api/orders/checkout-pro?orderId=${encodeURIComponent(data.orderId as string)}&raffleId=${encodeURIComponent(raffleId)}`,
            { method: "POST" }
          );
          const proData = await proRes.json().catch(() => ({}) as Record<string, unknown>);

          if (proRes.ok && proData.sdk_url) {
            window.location.href = proData.sdk_url as string;
            return; // redirecionando — mantém isProcessing
          }
          setErrorMsg(
            (proData.error as string) || "Não foi possível abrir o pagamento com cartão. Tente pelo PIX."
          );
        } catch {
          setErrorMsg("Erro ao conectar ao Mercado Pago. Tente pelo PIX.");
        }
        setIsProcessing(false);
        return;
      }

      if ((data.pix as Record<string, unknown>)?.qrCodeBase64) {
        const pix = data.pix as Record<string, string>;
        setPixData({
          qrCodeBase64: pix.qrCodeBase64,
          copyPaste: pix.copyPaste,
          paymentId: pix.paymentId,
        });
        setStep("pix");
        setPollingActive(true);
      } else {
        router.push(`/checkout/sucesso/${data.orderId}`);
      }
    } catch {
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processOrder("pix");
  };

  const handleCheckoutPro = async () => {
    if (isProcessing) return;
    await processOrder("pro");
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop escuro sólido */}
      <div className="absolute inset-0 bg-black/85" onClick={step !== "confirmed" ? onClose : undefined} />

      {/* Modal Container */}
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        style={{ maxHeight: "95dvh", background: "#1a1a1a" }}
      >
        {/* ─── Cover Image Header ─── */}
        <div className="relative w-full aspect-square max-h-[40vh] sm:max-h-[50vh] bg-black overflow-hidden shrink-0 flex items-center justify-center">
          {coverImage ? (
            <>
              <img
                src={coverImage}
                alt={raffleTitle}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/20 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-amber-950/30">
              <span className="text-6xl mb-2">🎟️</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Rifa Oficial</span>
            </div>
          )}

          {/* Badge de Status */}
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow-lg backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {step === "form" ? "Finalizar Reserva" : step === "pix" ? "Pagamento PIX" : "Confirmado!"}
            </span>
          </div>

          {/* Botão Fechar */}
          {step !== "confirmed" && (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors text-sm font-bold disabled:opacity-40 backdrop-blur-sm border border-white/10"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}

          {/* Título da Rifa sobre a capa */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white drop-shadow-lg line-clamp-2">
              {raffleTitle}
            </h2>
          </div>
        </div>

        {/* ─── Accent Line ─── */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 shrink-0" />

        {/* ─── Modal Body ─── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5" style={{ background: "#1a1a1a", color: "#e5e5e5" }}>

          {/* ═══════════════════════════════
              STEP 1 — FORMULÁRIO
          ═══════════════════════════════ */}
          {step === "form" && (
            <div className="space-y-5">
              {/* Resumo do Pedido */}
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#242424", border: "1px solid #333" }}>
                {promotionName && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                    <span>📦</span>
                    <span>Pacote: {promotionName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: "#999" }}>Quantidade selecionada:</span>
                  <span className="font-bold text-white">
                    {numbers.length} cota{numbers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="max-h-16 overflow-y-auto pr-1 flex flex-wrap gap-1">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="px-2 py-0.5 rounded-md text-xs font-mono font-bold"
                      style={{ background: "#333", border: "1px solid #444", color: "#fff" }}
                    >
                      {String(n).padStart(3, "0")}
                    </span>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center" style={{ borderTop: "1px solid #333" }}>
                  <span className="text-sm font-bold" style={{ color: "#999" }}>Total a pagar:</span>
                  <span className="font-display font-black text-2xl" style={{ color: "#f59e0b" }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888" }}>
                    Nome Completo <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888" }}>
                    WhatsApp (com DDD) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                  />
                  <p className="text-[11px] mt-1" style={{ color: "#666" }}>
                    📱 O comprovante e seus números serão vinculados a este WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888" }}>
                    E-mail <span className="font-normal" style={{ color: "#666" }}>(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "#2a2a2a", border: "1px solid #444", color: "#fff" }}
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl font-display font-black text-base text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}
                  >
                    {isProcessing && payMethod === "pix" ? (
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

                  <button
                    type="button"
                    onClick={handleCheckoutPro}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: "#1f2d3a", border: "1.5px solid #009ee3", color: "#009ee3" }}
                  >
                    <span>💳</span>
                    <span>
                      {isProcessing && payMethod === "pro"
                        ? "Abrindo Mercado Pago..."
                        : "Pagar com Cartão ou outros métodos"}
                    </span>
                  </button>
                </div>

                {/* Erro inline — sem popup */}
                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                    <span className="text-base shrink-0">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}
              </form>

              <div className="text-center text-[11px] flex items-center justify-center gap-1.5 pt-1" style={{ color: "#555" }}>
                <span>🔒</span>
                <span>Ambiente 100% Criptografado & Seguro</span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════
              STEP 2 — QR CODE PIX
          ═══════════════════════════════ */}
          {step === "pix" && pixData && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Countdown */}
              {timeLeft !== null && (
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold"
                  style={{
                    background: timeLeft < 180 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${timeLeft < 180 ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
                    color: timeLeft < 180 ? "#ef4444" : "#f59e0b",
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

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-5 rounded-3xl relative" style={{ background: "#ffffff", border: "2px dashed rgba(245,158,11,0.4)" }}>
                {coverImage && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl overflow-hidden shadow-lg" style={{ border: "4px solid #fff" }}>
                    <img src={coverImage} alt={raffleTitle} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={coverImage ? "pt-8" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 object-contain"
                  />
                  <p className="text-[11px] text-center mt-2 font-medium" style={{ color: "#666" }}>
                    Abra o app do seu banco e escaneie o código
                  </p>
                </div>
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "#888" }}>
                  Ou copie a chave PIX Copia e Cola
                </label>
                <div className="flex rounded-2xl overflow-hidden" style={{ background: "#2a2a2a", border: "1px solid #444" }}>
                  <input
                    type="text"
                    readOnly
                    value={pixData.copyPaste}
                    className="flex-1 px-3.5 py-3 bg-transparent text-xs font-mono outline-none min-w-0 truncate"
                    style={{ color: "#ccc" }}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="shrink-0 px-5 font-bold text-xs transition-all flex items-center gap-1.5 text-white"
                    style={{ background: copied ? "#059669" : "linear-gradient(135deg, #f59e0b, #d97706)" }}
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

              {/* Indicador de Espera */}
              <div className="p-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-xs" style={{ background: "#242424", border: "1px solid #333", color: "#999" }}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-medium">Aguardando confirmação bancária em tempo real...</span>
              </div>

              {/* Botão de fallback */}
              <button
                onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                className="w-full py-3 rounded-2xl font-semibold text-xs transition-colors"
                style={{ background: "#242424", border: "1px solid #333", color: "#999" }}
              >
                Já realizei o pagamento →
              </button>
            </div>
          )}

          {/* ═══════════════════════════════
              STEP 3 — SUCESSO 🎉
          ═══════════════════════════════ */}
          {step === "confirmed" && (
            <div className="animate-in zoom-in-95 duration-400 text-center space-y-5 py-3">
              <div
                className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-lg"
                style={{ background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.3)" }}
              >
                🎉
              </div>

              <div>
                <h3 className="text-2xl font-display font-black" style={{ color: "#10b981" }}>
                  Pagamento Confirmado!
                </h3>
                <p className="text-xs mt-1" style={{ color: "#888" }}>
                  Suas cotas foram vinculadas ao seu nome com sucesso. Boa sorte!
                </p>
              </div>

              {/* Cotas Garantidas */}
              <div className="p-4 rounded-2xl text-left space-y-2" style={{ background: "#242424", border: "1px solid #333" }}>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "#888" }}>
                  Seus números oficiais:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {numbers.map((n) => (
                    <span
                      key={n}
                      className="px-2.5 py-1 font-mono font-black text-xs rounded-lg"
                      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}
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
                    className="w-full py-4 rounded-2xl font-display font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "#059669", boxShadow: "0 6px 20px rgba(5,150,105,0.3)" }}
                  >
                    <span>💬</span>
                    <span>Enviar Comprovante ao Vendedor</span>
                  </a>
                )}

                <button
                  onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
                  className="w-full py-3 rounded-2xl font-bold text-xs transition-colors"
                  style={{ background: "#242424", border: "1px solid #333", color: "#999" }}
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
