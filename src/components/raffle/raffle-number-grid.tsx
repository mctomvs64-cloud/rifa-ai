"use client";

import { useState, useCallback, useMemo } from "react";
import { formatRaffleNumber } from "@/lib/utils";

type NumberStatus = "AVAILABLE" | "RESERVED" | "SOLD";

interface RaffleNumberGridProps {
  numbers: Array<{ number: number; status: NumberStatus }>;
  maxSelectable: number;
  minSelectable: number;
  onSelectionChange: (selected: number[]) => void;
  selectedNumbers: number[];
}

const STATUS_STYLES: Record<NumberStatus, string> = {
  AVAILABLE: "raffle-number available",
  RESERVED: "raffle-number reserved",
  SOLD: "raffle-number sold",
};

const STATUS_TITLES: Record<NumberStatus, string> = {
  AVAILABLE: "Disponível — clique para selecionar",
  RESERVED: "Reservado — aguardando confirmação de pagamento",
  SOLD: "Vendido / Confirmado",
};

/**
 * Grid interativo e de alto padrão para seleção de cotas/números da rifa.
 */
export function RaffleNumberGrid({
  numbers,
  maxSelectable,
  minSelectable,
  onSelectionChange,
  selectedNumbers,
}: RaffleNumberGridProps) {
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "SELECTED" | "RESERVED" | "SOLD">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSet = useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  const handleNumberClick = useCallback(
    (num: number, status: NumberStatus) => {
      if (status !== "AVAILABLE") return;

      if (selectedSet.has(num)) {
        // Deseleciona
        onSelectionChange(selectedNumbers.filter((n) => n !== num));
      } else {
        // Seleciona — respeita limite máximo
        if (selectedNumbers.length >= maxSelectable) return;
        onSelectionChange([...selectedNumbers, num]);
      }
    },
    [selectedSet, selectedNumbers, maxSelectable, onSelectionChange]
  );

  // Quick random generator
  const handleRandomPick = useCallback(
    (quantity: number) => {
      const available = numbers
        .filter((n) => n.status === "AVAILABLE" && !selectedSet.has(n.number))
        .map((n) => n.number);

      if (available.length === 0) return;

      const toPick = Math.min(quantity, maxSelectable - selectedNumbers.length, available.length);
      if (toPick <= 0) return;

      const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, toPick);
      onSelectionChange([...selectedNumbers, ...shuffled]);
    },
    [numbers, selectedSet, maxSelectable, selectedNumbers, onSelectionChange]
  );

  const stats = useMemo(() => {
    let available = 0;
    let sold = 0;
    let reserved = 0;

    for (let i = 0; i < numbers.length; i++) {
      const s = numbers[i].status;
      if (s === "AVAILABLE") available++;
      else if (s === "SOLD") sold++;
      else if (s === "RESERVED") reserved++;
    }

    return { available, sold, reserved, total: numbers.length };
  }, [numbers]);

  const filteredNumbers = useMemo(() => {
    let list = numbers;

    if (filter === "AVAILABLE") {
      list = list.filter((n) => n.status === "AVAILABLE");
    } else if (filter === "SELECTED") {
      list = list.filter((n) => selectedSet.has(n.number));
    } else if (filter === "RESERVED") {
      list = list.filter((n) => n.status === "RESERVED");
    } else if (filter === "SOLD") {
      list = list.filter((n) => n.status === "SOLD");
    }

    if (searchTerm.trim()) {
      const cleanSearch = searchTerm.trim().replace(/\D/g, "");
      if (cleanSearch) {
        list = list.filter((n) => String(n.number).includes(cleanSearch) || formatRaffleNumber(n.number).includes(cleanSearch));
      }
    }

    return list;
  }, [numbers, filter, selectedSet, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── Barra de Atalhos Rápidos (+1, +5, +10, +25, +50, Aleatório) ── */}
      <div className="bg-muted/40 p-3.5 rounded-2xl border border-border/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span> Escolha rápida de cotas:
          </span>
          {selectedNumbers.length > 0 && (
            <button
              onClick={() => onSelectionChange([])}
              className="text-xs font-medium text-destructive hover:underline flex items-center gap-1 transition-colors"
            >
              <span>🗑️</span> Limpar seleção ({selectedNumbers.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[1, 5, 10, 25, 50].map((qty) => (
            <button
              key={qty}
              onClick={() => handleRandomPick(qty)}
              disabled={stats.available === 0 || selectedNumbers.length >= maxSelectable}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-background hover:bg-primary hover:text-primary-foreground border border-border/80 shadow-xs hover:shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              +{qty}
            </button>
          ))}

          <button
            onClick={() => handleRandomPick(minSelectable || 1)}
            disabled={stats.available === 0 || selectedNumbers.length >= maxSelectable}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs hover:shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>🎲</span> Sortear aleatório
          </button>
        </div>
      </div>

      {/* ── Filtros e Busca de Números ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Filtros em Abas */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium border transition-all ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilter("AVAILABLE")}
            className={`px-3 py-1.5 rounded-lg font-medium border transition-all flex items-center gap-1.5 ${
              filter === "AVAILABLE"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Disponíveis ({stats.available})
          </button>
          {selectedNumbers.length > 0 && (
            <button
              onClick={() => setFilter("SELECTED")}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-all flex items-center gap-1.5 animate-pulse ${
                filter === "SELECTED"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Selecionados ({selectedNumbers.length})
            </button>
          )}
          {stats.reserved > 0 && (
            <button
              onClick={() => setFilter("RESERVED")}
              className={`px-3 py-1.5 rounded-lg font-medium border transition-all flex items-center gap-1.5 ${
                filter === "RESERVED"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Reservados ({stats.reserved})
            </button>
          )}
          <button
            onClick={() => setFilter("SOLD")}
            className={`px-3 py-1.5 rounded-lg font-medium border transition-all flex items-center gap-1.5 ${
              filter === "SOLD"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Vendidos ({stats.sold})
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[160px] sm:w-48">
          <input
            type="text"
            placeholder="🔍 Buscar número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Grid de Números ── */}
      {filteredNumbers.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-muted/20 border border-dashed border-border/80">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm font-semibold text-foreground">Nenhum número encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente mudar o filtro ou limpar o campo de busca.
          </p>
        </div>
      ) : (
        <div className="number-grid">
          {filteredNumbers.map(({ number, status }) => {
            const isSelected = selectedSet.has(number);
            const isAvailable = status === "AVAILABLE";

            return (
              <button
                key={number}
                onClick={() => handleNumberClick(number, status)}
                disabled={!isAvailable && !isSelected}
                title={isSelected ? "Selecionado — clique para remover" : STATUS_TITLES[status]}
                className={
                  isSelected
                    ? "raffle-number selected animate-number-pop"
                    : STATUS_STYLES[status]
                }
                aria-label={`Cota ${formatRaffleNumber(number)} — ${
                  isSelected ? "Selecionado" : status
                }`}
                aria-pressed={isSelected}
              >
                <span>{formatRaffleNumber(number)}</span>
                {isSelected && (
                  <span className="text-[9px] leading-none opacity-90">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Aviso de limite ── */}
      {selectedNumbers.length >= maxSelectable && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            ⚠️ Limite máximo de {maxSelectable} cotas por compra atingido.
          </p>
        </div>
      )}
    </div>
  );
}
