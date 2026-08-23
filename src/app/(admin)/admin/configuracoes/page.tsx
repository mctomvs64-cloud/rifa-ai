"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast-context";

export default function AdminConfiguracoesPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    platform_fee_percent: "5",
    reservation_minutes: "15",
    require_seller_approval: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/configuracoes");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setFormData({
              platform_fee_percent: data.settings.platform_fee_percent ?? "5",
              reservation_minutes: data.settings.reservation_minutes ?? "15",
              require_seller_approval: data.settings.require_seller_approval === "true",
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Erro ao salvar configurações", "error");
        return;
      }

      addToast("Configurações atualizadas com sucesso!", "success");
    } catch {
      addToast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <div className="animate-spin text-3xl mb-3">⚙️</div>
        <p>Carregando configurações da plataforma...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Configurações da Plataforma</h1>
        <p className="text-muted-foreground">Gerencie as regras financeiras e permissões de vendedores.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-lg border-b pb-2">Financeiro</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Taxa da Plataforma (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="platform_fee_percent"
                step="0.01"
                min="0"
                max="50"
                value={formData.platform_fee_percent}
                onChange={(e) => setFormData({ ...formData, platform_fee_percent: e.target.value })}
                className="w-32 px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all text-foreground"
              />
              <span className="text-muted-foreground">% por transação</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentual retido pela plataforma em cada venda. Ex: 5 = 5%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tempo de Reserva (minutos)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="reservation_minutes"
                min="1"
                max="120"
                value={formData.reservation_minutes}
                onChange={(e) => setFormData({ ...formData, reservation_minutes: e.target.value })}
                className="w-32 px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all text-foreground"
              />
              <span className="text-muted-foreground">minutos</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo que os números ficam reservados aguardando pagamento PIX
            </p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-lg border-b pb-2">Autorização de Vendedores</h2>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="require_seller_approval"
              name="require_seller_approval"
              checked={formData.require_seller_approval}
              onChange={(e) => setFormData({ ...formData, require_seller_approval: e.target.checked })}
              className="w-5 h-5 text-primary border-border rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="require_seller_approval" className="text-sm font-medium cursor-pointer text-foreground">
              Exigir aprovação manual para novos vendedores
            </label>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Se desativado, qualquer vendedor pode criar e publicar rifas imediatamente após o cadastro. Se ativado, o vendedor precisa ser aprovado no painel.
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Salvando...</span>
              </>
            ) : (
              "Salvar Configurações"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}