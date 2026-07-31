// Service worker do AutoRio Tarefas.
//
// Escopo deliberadamente mínimo: a ÚNICA coisa que ele guarda é a tela de
// "sem conexão". Tarefa, sessão e checklist NUNCA são cacheados — num sistema
// de delegação, mostrar "concluída" desatualizada é pior do que mostrar erro
// de rede. Todo o resto passa direto, como se o SW não existisse.

const CACHE = "autorio-tarefas-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só navegação tem tratamento. GET de dados/assets e qualquer POST/PATCH
  // seguem para a rede sem interferência.
  if (req.mode !== "navigate") return;

  event.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(CACHE);
      const offline = await cache.match(OFFLINE_URL);
      return (
        offline ??
        new Response("Sem conexão.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    })
  );
});
