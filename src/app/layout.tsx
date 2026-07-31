import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AutoRio Tarefas",
    template: "%s | AutoRio Tarefas",
  },
  description: "Sistema de tarefas da oficina AutoRio",
  applicationName: "AutoRio Tarefas",
  appleWebApp: {
    capable: true,
    title: "Tarefas",
    // A barra de status fica translúcida sobre o navy do header — por isso o
    // shell reserva env(safe-area-inset-top).
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  other: {
    // O Next emite só o nome moderno `mobile-web-app-capable`. iPhone anterior
    // ao iOS 16.4 (que passou a respeitar o manifest) ainda lê o prefixado —
    // sem isto, nesses aparelhos o atalho abre no Safari, com barra de URL.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d3e5d",
  width: "device-width",
  initialScale: 1,
  // Necessário para env(safe-area-inset-*) valer no iPhone com notch.
  viewportFit: "cover",
  // Sem maximumScale/userScalable: bloquear o zoom quebra a acessibilidade de
  // quem precisa aumentar a fonte.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorker />
      </body>
    </html>
  );
}
