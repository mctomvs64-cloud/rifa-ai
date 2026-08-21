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
  RESERVED: "Reservado — aguardando pagamento",
  SOLD: "Vendido",
};

/**
 * Grid interativo de números da rifa.
 * Performance: usa useMemo para evitar re-renders desnecessários.
 * Mobile-first: tamanho mínimo de toque 40px.
 */
export function RaffleNumberGrid({
  numbers,
  maxSelectable,
  minSelectable,
  onSelectionChange,
  selectedNumbers,
}: RaffleNumberGridProps) {
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "SELECTED">("ALL");

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

  const filteredNumbers = useMemo(() => {
    switch (filter) {
      case "AVAILABLE":
        return numbers.filter((n) => n.status === "AVAILABLE");
      case "SELECTED":
        return numbers.filter((n) => selectedSet.has(n.number));
      default:
        return numbers;
    }
  }, [numbers, filter, selectedSet]);

  const stats = useMemo(() => {
    const available = numbers.filter((n) => n.status === "AVAILABLE").length;
    const sold = numbers.filter((n) => n.status === "SOLD").length;
    const reserved = numbers.filter((n) => n.status === "RESERVED").length;
    return { available, sold, reserved };
  }, [numbers]);

  return (
    <div className="space-y-4">
      {/* Legenda + Stats */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            Todos ({numbers.length})
          </button>
          <button
            onClick={() => setFilter("AVAILABLE")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
              filter === "AVAILABLE"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="w-2 h-2 rounded-sm bg-muted border border-border" />
            Disponíveis ({stats.available})
          </button>
          {selectedNumbers.length > 0 && (
            <button
              onClick={() => setFilter("SELECTED")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
                filter === "SELECTED"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              <span className="w-2 h-2 rounded-sm bg-accent" />
              Selecionados ({selectedNumbers.length})
            </button>
          )}
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm bg-muted-foreground/30" />
            Vendidos ({stats.sold})
          </span>
        </div>

        {/* Botão "Sortear aleatório" */}
        <button
          onClick={() => {
            const available = numbers
              .filter((n) => n.status === "AVAILABLE" && !selectedSet.has(n.number))
              .map((n) => n.number);
            const qty = Math.min(minSelectable, available.length);
            const shuffled = available.sort(() => Math.random() - 0.5).slice(0, qty);
            onSelectionChange([...selectedNumbers, ...shuffled].slice(0, maxSelectable));
          }}
          className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
        >
          🎲 Sortear para mim
        </button>
      </div>

      {/* Grid de números */}
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
              aria-label={`Número ${formatRaffleNumber(number)} — ${
                isSelected ? "Selecionado" : status
              }`}
              aria-pressed={isSelected}
            >
              {formatRaffleNumber(number)}
            </button>
          );
        })}
      </div>

      {/* Aviso de limite */}
      {selectedNumbers.length >= maxSelectable && (
        <p className="text-xs text-center text-muted-foreground">
          Limite de {maxSelectable} números atingido. Remova um para adicionar outro.
        </p>
      )}
    </div>
  );
}
