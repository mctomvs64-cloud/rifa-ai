"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-context";

export default function RecuperarSenhaPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Endpoint mockado por enquanto - no futuro conectar com SendGrid/Resend
      // await fetch('/api/auth/recuperar-senha', { method: 'POST', body: JSON.stringify({ email }) });
      
      // Simulando delay de rede
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      addToast("Instruções enviadas para seu e-mail!", "success");
      setSubmitted(true);
    } catch (error) {
      addToast("Erro ao processar solicitação.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full text-3xl mb-4">
          ✉️
        </div>
        <h2 className="text-2xl font-bold font-display">Verifique seu e-mail</h2>
        <p className="text-muted-foreground text-sm">
          Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
        </p>
        <Link href="/login" className="block w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-lg mt-6">
          Voltar para o Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <Link href="/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
        <span className="mr-1">←</span> Voltar para o Login
      </Link>
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display">Recuperar Senha</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Informe seu e-mail cadastrado e enviaremos instruções para criar uma nova senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">E-mail cadastrado</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="seu@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all shadow-md disabled:opacity-50 mt-4"
        >
          {isLoading ? "Enviando..." : "Enviar link de recuperação"}
        </button>
      </form>
    </div>
  );
}
