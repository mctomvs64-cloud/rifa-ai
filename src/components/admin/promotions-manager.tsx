"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface PromotionItem {
  id: string;
  name: string;
  quantity: number;
  promoPrice: number;
  originalPrice: number;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  startsAt: string | null;
  endsAt: string | null;
  usageCount: number;
  raffleId: string | null;
  raffleTitle: string | null;
}

interface PromotionsManagerProps {
  initialPromotions: PromotionItem[];
  raffles: Array<{ id: string; title: string }>;
}

const emptyForm = {
  name: "",
  quantity: 10,
  promoPrice: "",
  originalPrice: "",
  active: true,
  featured: false,
  startsAt: "",
  endsAt: "",
  raffleId: "",
};

export function PromotionsManager({ initialPromotions, raffles }: PromotionsManagerProps) {
  const [promotions, setPromotions] = useState<PromotionItem[]>(initialPromotions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const savings =
    Number(form.promoPrice) > 0 && Number(form.originalPrice) > 0
      ? Number(form.originalPrice) - Number(form.promoPrice)
      : 0;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (promo: PromotionItem) => {
    setEditingId(promo.id);
    setForm({
      name: promo.name,
      quantity: promo.quantity,
      promoPrice: String(promo.promoPrice),
      originalPrice: String(promo.originalPrice),
      active: promo.active,
      featured: promo.featured,
      startsAt: promo.startsAt ? promo.startsAt.slice(0, 16) : "",
      endsAt: promo.endsAt ? promo.endsAt.slice(0, 16) : "",
      raffleId: promo.raffleId ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      quantity: Number(form.quantity),
      promoPrice: Number(form.promoPrice),
      originalPrice: Number(form.originalPrice),
      active: form.active,
      featured: form.featured,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      raffleId: form.raffleId || null,
    };

    try {
      const res = await fetch(
        editingId ? `/api/promotions/${editingId}` : "/api/promotions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao salvar promoção.");
        setSaving(false);
        return;
      }

      const saved: PromotionItem = {
        ...data.promotion,
        promoPrice: Number(data.promotion.promoPrice),
        originalPrice: Number(data.promotion.originalPrice),
        raffleTitle:
          promotions.find((p) => p.id === data.promotion.id)?.raffleTitle ??
          raffles.find((r) => r.id === data.promotion.raffleId)?.title ??
          null,
      };

      setPromotions((prev) =>
        editingId
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved]
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      alert("Erro de conexão.");
    }
    setSaving(false);
  };

  const toggleActive = async (promo: PromotionItem) => {
    const res = await fetch(`/api/promotions/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promo.active }),
    });
    if (res.ok) {
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, active: !p.active } : p))
      );
    } else {
      alert("Erro ao alterar status.");
    }
  };

  const handleDelete = async (promo: PromotionItem) => {
    if (!confirm(`Excluir a promoção "${promo.name}"?`)) return;

    const res = await fetch(`/api/promotions/${promo.id}`, { method: "DELETE" });
    if (res.ok) {
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
    } else {
      alert("Erro ao excluir.");
    }
  };

  // ── Drag-and-drop ──
  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;

    const reordered = [...promotions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setPromotions(reordered.map((p, i) => ({ ...p, sortOrder: i })));
    setDragIndex(null);

    await fetch("/api/promotions/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {promotions.length} promoção(ões) cadastrada(s)
        </p>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg font-medium transition-colors"
        >
          + Nova Promoção
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-xl p-6 shadow-sm space-y-4"
        >
          <h2 className="font-display text-lg font-bold">
            {editingId ? "Editar Promoção" : "Nova Promoção"}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input
                required
                type="text"
                placeholder='Ex: "Pacote 50 números"'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantidade de números *</label>
              <input
                required
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rifa (opcional)</label>
              <select
                value={form.raffleId}
                onChange={(e) => setForm({ ...form, raffleId: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg outline-none"
              >
                <option value="">Todas as rifas</option>
                {raffles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Preço promocional (R$) *</label>
              <input
                required
                type="number"
                step="0.01"
                min={0.01}
                placeholder="399.00"
                value={form.promoPrice}
                onChange={(e) => setForm({ ...form, promoPrice: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Preço original (R$) *</label>
              <input
                required
                type="number"
                step="0.01"
                min={0.01}
                placeholder="449.50"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Início (opcional)</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fim (opcional)</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Economia calculada automaticamente */}
          {savings > 0 && (
            <div className="text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2.5 rounded-lg">
              💰 Economia do comprador: <strong>{formatCurrency(savings)}</strong> (
              {Math.round((savings / Number(form.originalPrice)) * 100)}% de desconto)
            </div>
          )}

          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-[var(--primary,#7c3aed)]"
              />
              Ativa (visível no site)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="w-4 h-4 accent-[var(--accent,#f59e0b)]"
              />
              ⭐ Destaque (&quot;Mais vendido&quot;)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar promoção"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-6 py-2.5 rounded-lg font-medium border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista com drag-and-drop */}
      {promotions.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/20 border-dashed">
          <p className="text-muted-foreground">Nenhuma promoção criada ainda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {promotions.map((promo, index) => (
            <li
              key={promo.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragIndex(null)}
              className={`bg-card border rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4 cursor-grab active:cursor-grabbing transition-opacity ${
                dragIndex === index ? "opacity-40" : ""
              } ${promo.active ? "" : "opacity-60"}`}
            >
              <span title="Arraste para reordenar" className="text-muted-foreground select-none">
                ⠿
              </span>

              <div className="flex-1 min-w-[200px]">
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  {promo.featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                      ⭐ Destaque
                    </span>
                  )}
                  {promo.name}
                  {!promo.active && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      Inativa
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {promo.raffleTitle ? `Rifa: ${promo.raffleTitle}` : "Todas as rifas"}
                  {" · "}
                  Usos: {promo.usageCount}
                  {promo.endsAt &&
                    ` · Termina em ${new Date(promo.endsAt).toLocaleDateString("pt-BR")}`}
                </div>
              </div>

              <div className="text-right min-w-[140px]">
                <div className="font-display font-bold">{formatCurrency(promo.promoPrice)}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="line-through">{formatCurrency(promo.originalPrice)}</span>{" "}
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    economize {formatCurrency(promo.originalPrice - promo.promoPrice)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{promo.quantity} números</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(promo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    promo.active
                      ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      : "border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                >
                  {promo.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => openEdit(promo)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(promo)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
