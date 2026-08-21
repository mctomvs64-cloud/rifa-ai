"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-context";

export default function SignupPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "BUYER",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Erro ao criar conta.", "error");
        setIsLoading(false);
        return;
      }

      // Se registrou com sucesso, faz login automático
      const signInRes = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInRes?.error) {
        addToast("Conta criada, mas erro ao fazer login.", "warning");
        router.push("/login");
        return;
      }

      addToast("Conta criada com sucesso!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      addToast("Erro ao conectar. Tente novamente.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Escolha do tipo de conta */}
        <div className="flex gap-4 p-1 bg-muted rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "BUYER" })}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              formData.role === "BUYER"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Quero Comprar
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "SELLER" })}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              formData.role === "SELLER"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Quero Vender
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nome Completo *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-mail *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp (Opcional)</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Senha *</label>
          <input
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="Minimo 6 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all shadow-md disabled:opacity-50 mt-4"
        >
          {isLoading ? "Criando Conta..." : "Criar Conta"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
}
