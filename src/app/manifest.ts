import type { MetadataRoute } from "next";

/**
 * Manifest do app instalável. O Next injeta o <link rel="manifest"> sozinho.
 *
 * `background_color` e `theme_color` usam o navy da marca (#1d3e5d) — a mesma
 * cor do fundo dos ícones, então a tela de abertura e a barra de status somem
 * dentro do ícone, sem emenda.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoRio Tarefas",
    short_name: "Tarefas",
    description: "Delegação e acompanhamento de tarefas da oficina AutoRio",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1d3e5d",
    theme_color: "#1d3e5d",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android recorta o ícone em círculo/squircle: o "maskable" tem o símbolo
      // reduzido a 62% para nada importante cair fora da zona segura.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
