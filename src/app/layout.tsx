import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | VaquinhaAI",
    default: "VaquinhaAI — Vaquinhas Online Seguras e Confiáveis",
  },
  description:
    "Plataforma completa para criação e participação em vaquinhas online. PIX seguro, números garantidos, sorteio transparente.",
  keywords: [online", pix", "sorteio online", "comprar],
  authors: [{ name: "Vaquinha Ai" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "VaquinhaAI",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
