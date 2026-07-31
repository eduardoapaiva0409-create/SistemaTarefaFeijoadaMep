"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (ver `public/sw.js`). Ele só serve a tela de "sem
 * conexão" — não cacheia dados do app.
 *
 * Fica fora do dev porque o SW sobrevive a recarregamentos e passa a interceptar
 * navegação, o que atrapalha o hot reload.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro falhou (navegador antigo, contexto não seguro). O app funciona
      // igual — só não terá a tela de offline.
    });
  }, []);

  return null;
}
