import Link from "next/link";
import { db } from "@/lib/db";
import { RaffleCard } from "@/components/raffle/raffle-card";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "VaquinhaAI — Vaquinhas Beneficentes com Sorteio de Prêmios",
  description:
    "Apoie causas que você acredita! A cada doação via PIX você ganha números para o sorteio de prêmios. Transparente e seguro.",
};

// Dados de rifas mudam em tempo real — renderiza no servidor a cada acesso
export const dynamic = "force-dynamic";

async function getActiveCampaigns() {
  try {
    const campaigns = await db.raffle.findMany({
      where: { status: "ACTIVE" },
      include: {
        seller: { select: { name: true, image: true } },
        _count: {
          select: {
            numbers: {
              where: { status: "SOLD" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return { data: campaigns, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || String(err) };
  }
}

export default async function HomePage() {
  const { data: campaigns, error } = await getActiveCampaigns();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-900 text-white p-10">
        <div>
          <h1 className="text-3xl font-bold mb-4">Erro de Servidor (Debug)</h1>
          <pre className="bg-black/50 p-6 rounded text-sm overflow-auto max-w-4xl">{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* ── Hero Section ── */}
      <section className="hero-bg text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{campaigns.length} vaquinhas ativas agora</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Vaquinhas Beneficentes{" "}
            <span className="text-yellow-400">com Prêmios</span>
          </h1>

          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-4">
            Doe via PIX e ganhe números para o sorteio de prêmios incríveis.{" "}
            <strong>A cada R$10 doados, você recebe 1 número.</strong>
          </p>
          <p className="text-sm text-blue-200 max-w-xl mx-auto mb-8">
            Sorteio realizado externamente pelo organizador com total transparência.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#campanhas"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 font-semibold px-8 py-3 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              💚 Ver Vaquinhas Ativas
            </Link>
            <Link
              href="/cadastro?role=seller"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-3 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              🚀 Criar Minha Vaquinha
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Vaquinhas Ativas", value: campaigns.length.toString() },
            { label: "Doação via", value: "PIX ⚡" },
            { label: "Sorteio", value: "Externo" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/10 border border-white/20 rounded-xl p-4"
            >
              <div className="font-display text-2xl font-bold text-yellow-400">
                {stat.value}
              </div>
              <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como Funciona ── */}
      <section className="py-16 px-4 bg-white dark:bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">
            Como Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-sm">
            Simples, transparente e beneficente. Você doa e concorre a prêmios ao mesmo tempo.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "💚",
                title: "Escolha sua doação",
                desc: "Selecione quantos números quer ganhar. Cada R$10 doado equivale a 1 número no sorteio.",
              },
              {
                step: "02",
                icon: "⚡",
                title: "Doe via PIX",
                desc: "Escaneie o QR Code ou copie o código PIX. Pagamento instantâneo e confirmação automática.",
              },
              {
                step: "03",
                icon: "🏆",
                title: "Aguarde o sorteio",
                desc: "Seus números ficam garantidos. O organizador realiza o sorteio externo e anuncia o vencedor.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-1">
                  Passo {item.step}
                </div>
                <h3 className="font-display font-bold text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Aviso legal */}
          <div className="mt-10 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center max-w-2xl mx-auto">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              ⚖️ <strong>Esta plataforma opera como vaquinha beneficente.</strong> Os sorteios são realizados
              externamente pelo organizador de cada campanha, de forma transparente e divulgados aos participantes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Campanhas Ativas ── */}
      <section id="campanhas" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold">
              Vaquinhas Disponíveis
            </h2>
            <Link
              href="/rifas"
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-4">💚</p>
              <p className="font-medium">Nenhuma vaquinha ativa no momento.</p>
              <p className="text-sm mt-1">
                Volte em breve ou{" "}
                <Link
                  href="/cadastro?role=seller"
                  className="text-primary hover:underline"
                >
                  crie a sua
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <RaffleCard
                  key={campaign.id}
                  raffle={{
                    ...campaign,
                    soldCount: campaign._count.numbers,
                    pricePerNumber: Number(campaign.pricePerNumber),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
