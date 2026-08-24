"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export interface StatusSlice {
  name: string;
  value: number;
  valor: number;
  color: string;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StatusSlice }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur px-3.5 py-2.5 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p>{d.value} pedido(s)</p>
      <p className="text-muted-foreground text-xs">
        {d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const paid = data.find((d) => d.name === "Pagos");
  const conversion = total > 0 ? Math.round(((paid?.value ?? 0) / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm h-full flex flex-col">
        <h3 className="font-semibold mb-1">🎯 Status dos Pedidos</h3>
        <p className="text-xs text-muted-foreground mb-4">Conversão de reservas em vendas</p>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 py-8">
          <span className="text-3xl opacity-40">🍩</span>
          Sem pedidos registrados ainda.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="font-semibold mb-1">🎯 Status dos Pedidos</h3>
      <p className="text-xs text-muted-foreground mb-2">Conversão de reservas em vendas</p>

      <div className="relative h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 3 : 0}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-3xl font-bold">{conversion}%</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">conversão</span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="font-semibold">
              {d.value} · {d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
