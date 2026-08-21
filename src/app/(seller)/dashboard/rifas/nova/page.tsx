"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export default function CreateRafflePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    prize: "",
    pricePerNumber: "",
    totalNumbers: "100",
    minNumbers: "1",
    maxNumbers: "50",
    whatsappNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          prize: formData.prize,
          pricePerNumber: Number(formData.pricePerNumber.replace(",", ".")),
          totalNumbers: parseInt(formData.totalNumbers),
          minNumbers: parseInt(formData.minNumbers),
          maxNumbers: parseInt(formData.maxNumbers),
          whatsappNumber: formData.whatsappNumber,
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Criar Nova Rifa</h1>
      <p className="text-muted-foreground mb-8">
        Preencha os dados abaixo para configurar sua nova rifa. Ela será salva como rascunho e você poderá adicionar fotos antes de publicar.
      </p>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 md:p-8 shadow-sm space-y-6">
        
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
              <label className="block text-sm font-medium mb-1">Total de Números *</label>
              <select
                name="totalNumbers"
                value={formData.totalNumbers}
                onChange={handleChange as any}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              >
                <option value="100">100 números (00 a 99)</option>
                <option value="1000">1.000 números (000 a 999)</option>
                <option value="10000">10.000 números (0000 a 9999)</option>
                <option value="100000">100.000 números (00000 a 99999)</option>
              </select>
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
          <div className="text-xl font-display font-bold text-green-600 dark:text-green-400">
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
