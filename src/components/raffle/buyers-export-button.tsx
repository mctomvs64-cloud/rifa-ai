"use client";

export interface BuyerRecord {
  id: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  quantity: number;
  totalAmount: number;
  createdAt: string;
  numbers: number[];
}

const STATUS_LABELS: Record<string, string> = {
  PAID: "PAGO",
  PENDING: "PENDENTE",
  EXPIRED: "EXPIRADO",
};

function escapeCsv(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function BuyersExportButton({ records, raffleTitle }: { records: BuyerRecord[]; raffleTitle: string }) {
  const handleExport = () => {
    const header = ["Status", "Nome", "Telefone", "Email", "Qtd Cotas", "Valor Total (R$)", "Numeros", "Data Compra", "ID Pedido"];
    const rows = records.map((r) =>
      [
        STATUS_LABELS[r.status] ?? r.status,
        r.buyerName,
        r.buyerPhone,
        r.buyerEmail ?? "",
        String(r.quantity),
        r.totalAmount.toFixed(2).replace(".", ","),
        r.numbers.join(" "),
        new Date(r.createdAt).toLocaleString("pt-BR"),
        r.id,
      ]
        .map(escapeCsv)
        .join(";")
    );

    const csv = "\uFEFF" + [header.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `compradores-${raffleTitle.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={records.length === 0}
      className="border bg-background hover:bg-muted text-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      title="Baixar planilha com todos os compradores e leads"
    >
      📥 Baixar CSV
    </button>
  );
}
