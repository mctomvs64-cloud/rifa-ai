"use client";

import { useState } from "react";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

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
          buyerName: formData.name,
          buyerPhone: formData.phone.replace(/\D/g, ""),
          buyerEmail: formData.email || undefined,
          ...(promotionId ? { promotionId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao gerar pedido.");
        setIsProcessing(false);
        return;
      }

      setOrderId(data.orderId);
      if (data.pix?.qrCodeBase64) {
        setPixData(data.pix);
      } else {
        // Se Mercado Pago falhar na config local, passa direto pro success status pendente
        router.push(`/checkout/sucesso/${data.orderId}`);
      }
    } catch (error) {
      alert("Erro de conexão.");
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      alert("Código PIX copiado!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-2xl border relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-display font-bold mb-1">Finalizar Compra</h2>
        <p className="text-sm text-muted-foreground mb-6 line-clamp-1">{raffleTitle}</p>
        
        {/* Resumo do Pedido */}
        <div className="bg-muted/30 rounded-xl p-4 mb-6 border">
          {promotionName && (
            <div className="flex justify-between items-center mb-2 text-sm font-medium text-primary">
              <span>📦 {promotionName}</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Números selecionados:</span>
            <span className="font-bold">{numbers.length}</span>
          </div>
          <div className="text-xs text-muted-foreground break-words max-h-20 overflow-y-auto">
            {numbers.map(n => String(n).padStart(3, '0')).join(", ")}
          </div>
          <div className="flex justify-between items-center font-display font-bold text-xl mt-4 pt-4 border-t">
            <span>Total a pagar:</span>
            <span className="text-accent">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {pixData ? (
          // Fluxo 2: Mostrar QR Code PIX
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm text-center font-medium border border-green-200">
              Pedido criado! Escaneie o QR Code ou copie o código PIX para pagar.
            </div>
            
            <div className="flex justify-center p-4 bg-white rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} 
                alt="QR Code PIX" 
                className="w-48 h-48"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">PIX Copia e Cola</label>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly 
                  value={pixData.copyPaste} 
                  className="w-full px-3 py-2 bg-muted border rounded-l-lg text-sm outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-r-lg font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>

            <button 
              onClick={() => router.push(`/checkout/sucesso/${orderId}`)}
              className="w-full py-3 bg-secondary text-secondary-foreground font-bold rounded-xl mt-4 border hover:bg-muted transition-colors"
            >
              Já paguei, ver status
            </button>
          </div>
        ) : (
          // Fluxo 1: Formulário de Dados
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome Completo *</label>
              <input 
                required 
                type="text" 
                placeholder="Seu nome" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp *</label>
              <input 
                required 
                type="tel" 
                placeholder="(11) 99999-9999" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usaremos este número para enviar seu comprovante.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-mail <span className="text-muted-foreground font-normal">(Opcional)</span></label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all" 
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl mt-2 flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {isProcessing ? "Gerando PIX..." : "Gerar PIX ⚡"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
