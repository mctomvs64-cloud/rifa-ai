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
    template: "%s | RifaAI",
    default: "RifaAI — Rifas Online Seguras e Confiáveis",
  },
  description:
    "Plataforma completa para criação e participação em rifas online. PIX seguro, números garantidos, sorteio transparente.",
  keywords: ["rifa online", "rifa pix", "sorteio online", "comprar rifa"],
  authors: [{ name: "RifaAI" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "RifaAI",
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
