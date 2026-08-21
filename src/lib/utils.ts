import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge de classes Tailwind com suporte a condicionais */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata valor em reais brasileiro */
export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

/** Formata número de telefone brasileiro */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13) {
    // +55 11 99999-9999
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 11) {
    // 11 99999-9999
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  return phone;
}

/** Formata número da cota com zeros à esquerda */
export function formatRaffleNumber(num: number, padLength = 3): string {
  return String(num).padStart(padLength, "0");
}

/** Calcula a taxa da plataforma */
export function calculateFees(
  totalAmount: number,
  feePercent: number
): { platformFee: number; sellerAmount: number } {
  const platformFee = (totalAmount * feePercent) / 100;
  const sellerAmount = totalAmount - platformFee;
  return {
    platformFee: Math.round(platformFee * 100) / 100,
    sellerAmount: Math.round(sellerAmount * 100) / 100,
  };
}

/** Gera um slug URL-friendly a partir de um texto */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Gera um slug único com sufixo aleatório */
export function generateUniqueSlug(text: string): string {
  const base = generateSlug(text);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/** Formata data para exibição em pt-BR */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/** Formata data e hora para exibição em pt-BR */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Calcula o progresso de venda de uma rifa (%) */
export function calcRaffleProgress(sold: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((sold / total) * 100);
}

/** Verifica se uma data está no passado */
export function isExpired(date: Date | string): boolean {
  return new Date(date) < new Date();
}

/** Formata tempo restante até uma data */
export function formatTimeRemaining(targetDate: Date | string): string {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "Expirado";

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
