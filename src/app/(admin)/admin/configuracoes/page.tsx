import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function AdminConfiguracoesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN" || session.user.email !== "mctomvs64@gmail.com") {
    notFound();
  }

  const settings = await db.settings.findMany({
    orderBy: { key: "asc" },
  });

  const platformFee = settings.find((s) => s.key === "platform_fee_percent");
  const reservationMinutes = settings.find((s) => s.key === "reservation_minutes");
  const requireSellerApproval = settings.find((s) => s.key === "require_seller_approval");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">Configurações da Plataforma</h1>

      <form action="/api/admin/configuracoes" method="POST" className="space-y-6">
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
                defaultValue={platformFee?.value ?? "5"}
                className="w-32 px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
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
                defaultValue={reservationMinutes?.value ?? "15"}
                className="w-32 px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              <span className="text-muted-foreground">minutos</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo que os números ficam reservados aguardando pagamento PIX
            </p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-lg border-b pb-2">Cadastro de Vendedores</h2>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="require_seller_approval"
              name="require_seller_approval"
              defaultChecked={requireSellerApproval?.value === "true"}
              className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
            />
            <label htmlFor="require_seller_approval" className="text-sm font-medium cursor-pointer">
              Exigir aprovação manual para novos vendedores
            </label>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Se ativado, novos vendedores ficam com status PENDING até aprovação do admin
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t">
          <button
            type="submit"
            className="px-8 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
          >
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}