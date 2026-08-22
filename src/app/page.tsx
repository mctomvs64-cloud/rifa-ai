import Link from "next/link";
import { db } from "@/lib/db";
import { RaffleCard } from "@/components/raffle/raffle-card";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "RifaAI — Rifas Online Seguras e Confiáveis",
  description:
    "Participe de rifas online com segurança. Pagamento via PIX, números garantidos e sorteio transparente.",
};

// Dados de rifas mudam em tempo real — renderiza no servidor a cada acesso
export const dynamic = "force-dynamic";

async function getActiveRaffles() {
  try {
    const raffles = await db.raffle.findMany({
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
    return { data: raffles, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || String(err) };
  }
}

export default async function HomePage() {
  const { data: raffles, error } = await getActiveRaffles();

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
            <span>{raffles.length} rifas ativas agora</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Rifas Online{" "}
            <span className="text-yellow-400">Seguras</span>{" "}
            e Transparentes
          </h1>

          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
            Pague via PIX, receba seus números na hora e acompanhe o sorteio ao
            vivo. Simples, seguro e confiável.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#rifas"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 font-semibold px-8 py-3 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              🎫 Ver Rifas Disponíveis
            </Link>
            <Link
              href="/cadastro?role=seller"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-3 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              🚀 Criar Minha Rifa
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Rifas Ativas", value: raffles.length.toString() },
            { label: "Pagamento", value: "PIX ⚡" },
            { label: "Sorteio", value: "Transparente" },
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
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            Como Funciona
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🎯",
                title: "Escolha seus números",
                desc: "Selecione quantos números quiser. Você pode escolher manualmente ou deixar o sistema sortear.",
              },
              {
                step: "02",
                icon: "⚡",
                title: "Pague via PIX",
                desc: "Escaneie o QR Code ou copie o código PIX. Pagamento instantâneo, confirmação automática.",
              },
              {
                step: "03",
                icon: "🏆",
                title: "Aguarde o sorteio",
                desc: "Seus números ficam garantidos. No dia do sorteio, você é notificado pelo WhatsApp.",
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
        </div>
      </section>

      {/* ── Rifas Ativas ── */}
      <section id="rifas" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold">
              Rifas Disponíveis
            </h2>
            <Link
              href="/rifas"
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>

          {raffles.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-4">🎫</p>
              <p className="font-medium">Nenhuma rifa ativa no momento.</p>
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
              {raffles.map((raffle) => (
                <RaffleCard
                  key={raffle.id}
                  raffle={{
                    ...raffle,
                    soldCount: raffle._count.numbers,
                    pricePerNumber: Number(raffle.pricePerNumber),
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
