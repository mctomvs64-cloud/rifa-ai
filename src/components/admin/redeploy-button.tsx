"use client";

import { useState } from "react";

export function RedeployButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRedeploy = async () => {
    const confirmed = window.confirm(
      "⚠️ Isso vai iniciar um novo deploy completo do site na Netlify.\n\nO processo leva 2–5 minutos. Confirmar?"
    );
    if (!confirmed) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/admin/redeploy", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Erro ao iniciar deploy.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Deploy iniciado!");
      // Reset after 8 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 8000);
    } catch {
      setStatus("error");
      setMessage("Erro de conexão com o servidor.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRedeploy}
        disabled={status === "loading"}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
          ${status === "loading"
            ? "bg-muted text-muted-foreground cursor-wait"
            : status === "success"
            ? "bg-emerald-600 text-white"
            : status === "error"
            ? "bg-destructive text-destructive-foreground"
            : "bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
          }
        `}
      >
        {status === "loading" ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Iniciando deploy...
          </>
        ) : status === "success" ? (
          <>✅ Deploy em andamento!</>
        ) : status === "error" ? (
          <>❌ Erro no deploy</>
        ) : (
          <>🚀 Redeploy do Site</>
        )}
      </button>
      {message && (
        <p className={`text-xs max-w-xs text-right ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
