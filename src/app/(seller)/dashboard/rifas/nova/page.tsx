"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

export default function CreateRafflePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    prize: "",
    description: "",
    pricePerNumber: "",
    totalNumbers: "100",
    minNumbers: "1",
    maxNumbers: "50",
    whatsappNumber: "",
    coverImage: "",
    images: [] as string[],
  });

  const [promotions, setPromotions] = useState<{ quantity: string; promoPrice: string }[]>([]);

  const handleAddPromotion = () => {
    setPromotions([...promotions, { quantity: "", promoPrice: "" }]);
  };

  const handlePromotionChange = (index: number, field: "quantity" | "promoPrice", value: string) => {
    const updated = [...promotions];
    updated[index][field] = value;
    setPromotions(updated);
  };

  const handleRemovePromotion = (index: number) => {
    setPromotions(promotions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validPromotions = promotions
        .filter((p) => p.quantity && p.promoPrice)
        .map((p) => ({
          quantity: parseInt(p.quantity),
          promoPrice: Number(p.promoPrice.replace(",", ".")),
        }));

      const response = await fetch("/api/rifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          pricePerNumber: Number(formData.pricePerNumber.replace(",", ".")),
          totalNumbers: parseInt(formData.totalNumbers),
          minNumbers: parseInt(formData.minNumbers),
          maxNumbers: parseInt(formData.maxNumbers),
          whatsappNumber: formData.whatsappNumber,
          coverImage: formData.coverImage || null,
          images: formData.images,
          promotions: validPromotions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Erro ao criar rifa");
        return;
      }

      const { raffle } = await response.json();
      router.push(`/dashboard/rifas/${raffle.id}`);
    } catch (error) {
      alert("Erro de conexão ao criar a rifa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverChange = (urls: string[]) => {
    setFormData((prev) => ({ ...prev, coverImage: urls[0] || "" }));
  };

  const handleImagesChange = (urls: string[]) => {
    setFormData((prev) => ({ ...prev, images: urls }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Criar Nova Rifa</h1>
      <p className="text-muted-foreground mb-8">
        Preencha os dados abaixo para configurar sua nova rifa. Ela será salva como rascunho e você poderá adicionar fotos antes de publicar.
      </p>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 md:p-8 shadow-sm space-y-6">
        {/* Imagens */}
        <div className="space-y-4 pt-4">
          <h2 className="font-semibold text-lg border-b pb-2">Imagens da Rifa</h2>

          <ImageUpload
            label="Imagem de Capa (Principal)"
            onImagesChange={handleCoverChange}
            maxFiles={1}
            initialImages={formData.coverImage ? [formData.coverImage] : []}
          />

          <ImageUpload
            label="Galeria de Imagens (Opcional)"
            onImagesChange={handleImagesChange}
            maxFiles={10}
            initialImages={formData.images}
          />

          <p className="text-xs text-muted-foreground">
            A imagem de capa será usada nas listagens e no checkout. A galeria aparece na página da rifa.
          </p>
        </div>

        {/* Dados Principais */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Informações Básicas</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Título da Rifa *</label>
            <input
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ex: iPhone 15 Pro Max + R$ 5.000 no PIX"
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição Detalhada</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva a rifa, regras, condições de entrega, etc."
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prêmio (Descrição curta) *</label>
            <input
              required
              name="prize"
              value={formData.prize}
              onChange={handleChange}
              placeholder="Ex: iPhone 15 Pro Max 256GB Titanium"
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Configurações Financeiras e Cotas */}
        <div className="space-y-4 pt-4">
          <h2 className="font-semibold text-lg border-b pb-2">Valores e Cotas</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valor por número (R$) *</label>
              <input
                required
                name="pricePerNumber"
                type="number"
                step="0.01"
                min="0.50"
                value={formData.pricePerNumber}
                onChange={handleChange}
                placeholder="0,50"
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total de Números (Livre) *</label>
              <input
                required
                type="number"
                name="totalNumbers"
                min="10"
                value={formData.totalNumbers}
                onChange={handleChange}
                placeholder="Ex: 100, 1000, 5500"
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1">Ex: 100 (00 a 99), 1000 (000 a 999).</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mínimo por compra</label>
              <input
                type="number"
                name="minNumbers"
                min="1"
                value={formData.minNumbers}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Máximo por compra</label>
              <input
                type="number"
                name="maxNumbers"
                min="1"
                value={formData.maxNumbers}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Pacotes Promocionais */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-lg">Pacotes Promocionais</h2>
            <button
              type="button"
              onClick={handleAddPromotion}
              className="text-sm bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-md font-medium transition-colors"
            >
              + Adicionar Pacote
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Crie descontos para quem comprar mais números. Ex: "Compre 10 por R$ 4,50"
          </p>

          <div className="space-y-3">
            {promotions.map((promo, index) => (
              <div key={index} className="flex gap-3 items-start p-3 bg-muted/40 rounded-lg border">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Quantidade de números</label>
                  <input
                    type="number"
                    min="2"
                    placeholder="Ex: 10"
                    value={promo.quantity}
                    onChange={(e) => handlePromotionChange(index, "quantity", e.target.value)}
                    className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Valor do Pacote (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 45,00"
                    value={promo.promoPrice}
                    onChange={(e) => handlePromotionChange(index, "promoPrice", e.target.value)}
                    className="w-full px-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => handleRemovePromotion(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Remover pacote"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {promotions.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                Nenhum pacote promocional configurado.
              </div>
            )}
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-4 pt-4">
          <h2 className="font-semibold text-lg border-b pb-2">Contato</h2>

          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp para receber comprovantes</label>
            <p className="text-xs text-muted-foreground mb-2">
              Se deixado em branco, será usado o número cadastrado no seu perfil.
            </p>
            <input
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="Ex: 11999999999"
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Resumo Arrecadação */}
        <div className="p-4 bg-muted/50 rounded-lg border flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Potencial de Arrecadação</div>
            <div className="text-xs text-muted-foreground">Caso venda todos os números</div>
          </div>
          <div className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">
            {formData.pricePerNumber && formData.totalNumbers
              ? formatCurrency(
                  Number(formData.pricePerNumber.replace(",", ".")) * Number(formData.totalNumbers)
                )
              : "R$ 0,00"}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-muted font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar Rascunho →"}
          </button>
        </div>
      </form>
    </div>
  );
}