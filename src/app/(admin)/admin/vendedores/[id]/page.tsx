"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/toast-context";

export default function AdminSellerEditPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const sellerId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    image: "",
    status: "ACTIVE",
    role: "SELLER",
  });

  const fetchSeller = async () => {
    try {
      const res = await fetch(`/api/admin/vendedores/${sellerId}`);
      if (!res.ok) throw new Error("Vendedor não encontrado");
      const data = await res.json();
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        image: data.image || "",
        status: data.status || "ACTIVE",
        role: data.role || "SELLER",
      });
    } catch {
      addToast("Erro ao carregar vendedor", "error");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchSeller();
    }
  }, [sellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/vendedores/${sellerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar");
      }

      addToast("Vendedor atualizado com sucesso!", "success");
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Erro ao salvar", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a href="/admin/vendedores" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          ← Voltar
        </a>
        <h1 className="font-display text-3xl font-bold">Editar Vendedor</h1>
        <p className="text-muted-foreground">Gerencie os dados da conta do vendedor</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Informações da Conta</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Nome Completo *</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp (com DDD)</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
              placeholder="11999999999"
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL da Foto de Perfil</label>
            <input
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://exemplo.com/foto.jpg"
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1">Link direto para imagem (avatar)</p>
          </div>

          {formData.image && (
            <div className="flex items-center gap-3">
              <img src={formData.image} alt="Preview" className="w-16 h-16 rounded-full object-cover border" />
              <span className="text-sm text-muted-foreground">Preview da foto atual</span>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="font-semibold text-lg border-b pb-2">Status e Permissões</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Status da Conta</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="PENDING">Pendente</option>
              <option value="SUSPENDED">Suspenso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            >
              <option value="SELLER">Vendedor</option>
              <option value="BUYER">Comprador</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">⚠️ Alterar para ADMIN dá acesso total ao painel</p>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-muted font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}