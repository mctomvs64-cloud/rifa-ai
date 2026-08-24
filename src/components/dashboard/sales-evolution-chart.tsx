"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface SalesPoint {
  date: string;
  label: string;
  valor: number;
  vendas: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SalesPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-1">{d.label}</p>
      <p className="text-emerald-600 font-bold">{d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
      <p className="text-muted-foreground text-xs">{d.vendas} venda(s) confirmada(s)</p>
    </div>
  );
}

export function SalesEvolutionChart({ data }: { data: SalesPoint[] }) {
  const hasData = data.some((d) => d.valor > 0);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">📈 Evolução de Vendas</h3>
        <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Receita confirmada por dia (PIX aprovado)</p>

      {!hasData ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
          <span className="text-3xl opacity-40">📊</span>
          As vendas confirmadas aparecerão aqui em um gráfico diário.
        </div>
      ) : (
        <div className="h-[240px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`
                }
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#10b981", strokeOpacity: 0.25 }} />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
