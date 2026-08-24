"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export interface RaffleRank {
  title: string;
  receita: number;
  sold: number;
}

function RankTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RaffleRank }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-lg text-sm">
      <p className="font-semibold max-w-[220px] truncate">{d.title}</p>
      <p className="text-emerald-600 font-bold">
        {d.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <p className="text-muted-foreground text-xs">{d.sold} cota(s) vendida(s)</p>
    </div>
  );
}

export function TopRafflesChart({ data }: { data: RaffleRank[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm h-full flex flex-col">
        <h3 className="font-semibold mb-1">🏆 Rifas por Receita</h3>
        <p className="text-xs text-muted-foreground mb-4">Ranking de arrecadação</p>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 py-8">
          <span className="text-3xl opacity-40">🏆</span>
          Crie rifas para ver o ranking aqui.
        </div>
      </div>
    );
  }

  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="font-semibold mb-1">🏆 Rifas por Receita</h3>
      <p className="text-xs text-muted-foreground mb-4">Ranking de arrecadação confirmada</p>

      <div className="flex-1 min-h-[180px] -ml-4" style={{ height: Math.max(180, data.length * 52) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="title"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={130}
              tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
            />
            <Tooltip content={<RankTooltip />} cursor={{ fill: "currentColor", opacity: 0.04 }} />
            <Bar dataKey="receita" radius={[0, 8, 8, 0]} barSize={22}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
