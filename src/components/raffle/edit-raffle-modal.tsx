"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ui/image-upload";

interface EditRaffleModalProps {
  raffle: {
    id: string;
    title: string;
    description: string | null;
    prize: string;
    pricePerNumber: number | string;
    minNumbers: number;
    maxNumbers: number;
    whatsappNumber: string | null;
    status: string;
    coverImage: string | null;
    images: string[];
  };
}

export function EditRaffleModal({ raffle }: EditRaffleModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: raffle.title,
    description: raffle.description || "",
    prize: raffle.prize,
    pricePerNumber: Number(raffle.pricePerNumber).toFixed(2),
    minNumbers: raffle.minNumbers.toString(),
    maxNumbers: raffle.maxNumbers.toString(),
    whatsappNumber: raffle.whatsappNumber || "",
    status: raffle.status,
    coverImage: raffle.coverImage || "",
    images: raffle.images || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/rifas/${raffle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          prize: formData.prize,
          pricePerNumber: Number(formData.pricePerNumber.replace(",", ".")),
          minNumbers: parseInt(formData.minNumbers),
          maxNumbers: parseInt(formData.maxNumbers),
          whatsappNumber: formData.whatsappNumber || null,
          status: formData.status,
          coverImage: formData.coverImage || null,
          images: formData.images || [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao salvar alterações");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverChange = (urls: string[]) => {
    setFormData((prev) => ({ ...prev, coverImage: urls[0] || "" }));
  };

  const handleGalleryChange = (urls: string[]) => {
    setFormData((prev) => ({ ...prev, images: urls }));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5"
      >
        ✏️ Editar Rifa
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background text-foreground w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-display text-xl font-bold">✏️ Editar Rifa</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Imagens com Upload Real */}
              <div className="space-y-4 pb-4 border-b border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  📸 Imagens da Rifa
                </h4>

                <ImageUpload
                  label="Imagem de Capa"
                  onImagesChange={handleCoverChange}
                  maxFiles={1}
                  initialImages={formData.coverImage ? [formData.coverImage] : []}
                />

                <ImageUpload
                  label="Galeria de Imagens"
                  onImagesChange={handleGalleryChange}
                  maxFiles={10}
                  initialImages={formData.images}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Título da Rifa
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Prêmio
                </label>
                <input
                  required
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Preço por Cota (R$)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={formData.pricePerNumber}
                    onChange={(e) => setFormData({ ...formData, pricePerNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="DRAFT">Rascunho (DRAFT)</option>
                    <option value="ACTIVE">Ativa / Lançada (ACTIVE)</option>
                    <option value="CLOSED">Encerrada (CLOSED)</option>
                    <option value="DRAWN">Sorteada (DRAWN)</option>
                    <option value="CANCELLED">Cancelada (CANCELLED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Mínimo por Compra
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minNumbers}
                    onChange={(e) => setFormData({ ...formData, minNumbers: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Máximo por Compra
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxNumbers}
                    onChange={(e) => setFormData({ ...formData, maxNumbers: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  WhatsApp para Contato
                </label>
                <input
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="DDD + Número"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
