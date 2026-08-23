"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-context";
import { useRouter } from "next/navigation";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast("As senhas não coincidem.", "error");
      return;
    }

    if (password.length < 6) {
      addToast("A senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Endpoint mockado por enquanto
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      addToast("Senha redefinida com sucesso!", "success");
      router.push("/login");
    } catch (error) {
      addToast("Erro ao redefinir a senha. O link pode ter expirado.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display">Criar nova senha</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Digite sua nova senha abaixo para acessar sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nova senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirmar nova senha</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all shadow-md disabled:opacity-50 mt-4"
        >
          {isLoading ? "Salvando..." : "Redefinir Senha"}
        </button>
      </form>
    </div>
  );
}
