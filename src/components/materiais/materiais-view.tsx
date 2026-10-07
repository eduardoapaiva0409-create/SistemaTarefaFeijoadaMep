"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  File,
  Film,
  FolderClosed,
  FolderPlus,
  Image as ImageIcon,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/format";
import {
  MATERIAIS_BUCKET,
  enviarMaterial,
  formatBytes,
  tipoDoArquivo,
} from "@/lib/materiais";
import type { MaterialPasta, MaterialWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { MaterialCard } from "@/components/materiais/material-card";
import { MaterialDialog } from "@/components/materiais/material-dialog";
import { PastaDialog } from "@/components/materiais/pasta-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type Filtro = "todos" | "imagem" | "video" | "outro";

type Envio = {
  id: string;
  nome: string;
  progresso: number;
  erro: string | null;
  /** Subiu e foi registrado; sai da lista quando o servidor devolver a grade. */
  concluido: boolean;
};

/** Envios simultâneos: rápido para trinta fotos sem afogar o 4G com vídeo. */
const ENVIOS_EM_PARALELO = 3;

function categoria(material: MaterialWithRelations): Exclude<Filtro, "todos"> {
  const tipo = tipoDoArquivo(material.mime, material.nome);
  return tipo === "imagem" || tipo === "video" ? tipo : "outro";
}

function temArquivos(event: React.DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

export function MateriaisView({
  pastas,
  materiais: materiaisIniciais,
  meuId,
  souAdmin,
}: {
  pastas: MaterialPasta[];
  materiais: MaterialWithRelations[];
  meuId: string;
  souAdmin: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const profundidadeArrasto = useRef(0);

  // Espelho local para mover/excluir responderem na hora — mesmo padrão do
  // tasks-view: o ajuste à versão do servidor é feito durante o render.
  const [materiais, setMateriais] = useState(materiaisIniciais);
  const [ultimosDoServidor, setUltimosDoServidor] = useState(materiaisIniciais);
  const [envios, setEnvios] = useState<Envio[]>([]);
  if (materiaisIniciais !== ultimosDoServidor) {
    setUltimosDoServidor(materiaisIniciais);
    setMateriais(materiaisIniciais);
    // O que já subiu agora está na grade: sai da lista de envios.
    setEnvios((atual) => atual.filter((e) => !e.concluido));
  }

  const [pastaAtualId, setPastaAtualId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [soltando, setSoltando] = useState(false);

  const [aberto, setAberto] = useState<MaterialWithRelations | null>(null);
  const [paraExcluir, setParaExcluir] = useState<MaterialWithRelations | null>(null);
  const [pastaDialog, setPastaDialog] = useState<{
    aberto: boolean;
    pasta: MaterialPasta | null;
  }>({ aberto: false, pasta: null });
  const [pastaParaExcluir, setPastaParaExcluir] = useState<MaterialPasta | null>(null);

  // Pasta apagada por outra pessoa some do servidor: volta para a raiz.
  const pastaAtual = pastas.find((p) => p.id === pastaAtualId) ?? null;
  const nomeDaPasta = new Map(pastas.map((p) => [p.id, p.nome]));
  const enviando = envios.some((e) => !e.concluido && !e.erro);

  const porPasta = useMemo(() => {
    const mapa = new Map<string, { quantidade: number; bytes: number }>();
    for (const m of materiais) {
      if (!m.pasta_id) continue;
      const atual = mapa.get(m.pasta_id) ?? { quantidade: 0, bytes: 0 };
      atual.quantidade += 1;
      atual.bytes += m.tamanho;
      mapa.set(m.pasta_id, atual);
    }
    return mapa;
  }, [materiais]);

  const totalBytes = materiais.reduce((soma, m) => soma + m.tamanho, 0);

  // Com termo, a busca atravessa todas as pastas; sem ele, mostra a pasta aberta.
  const termo = busca.trim().toLowerCase();
  const buscando = termo.length > 0;
  const base = buscando
    ? materiais.filter(
        (m) =>
          m.nome.toLowerCase().includes(termo) ||
          m.descricao?.toLowerCase().includes(termo)
      )
    : materiais.filter((m) => m.pasta_id === (pastaAtual?.id ?? null));
  const visiveis = filtro === "todos" ? base : base.filter((m) => categoria(m) === filtro);

  const contar = (c: Exclude<Filtro, "todos">) =>
    base.filter((m) => categoria(m) === c).length;
  const filtros = [
    { value: "todos" as const, label: "Tudo", icon: LayoutGrid, count: base.length },
    { value: "imagem" as const, label: "Imagens", icon: ImageIcon, count: contar("imagem") },
    { value: "video" as const, label: "Vídeos", icon: Film, count: contar("video") },
    { value: "outro" as const, label: "Outros", icon: File, count: contar("outro") },
  ];

  // Soltar um arquivo FORA da área (na sidebar, por ex.) faria o navegador
  // abrir o arquivo e sair da página — derrubando os envios em andamento.
  useEffect(() => {
    function segurar(event: DragEvent) {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    }
    window.addEventListener("dragover", segurar);
    window.addEventListener("drop", segurar);
    return () => {
      window.removeEventListener("dragover", segurar);
      window.removeEventListener("drop", segurar);
    };
  }, []);

  // Fechar a aba no meio de um vídeo de 40 MB perde o envio: avisa antes.
  useEffect(() => {
    if (!enviando) return;
    function avisar(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [enviando]);

  async function enviar(arquivos: File[]) {
    if (arquivos.length === 0) return;
    const destino = pastaAtual?.id ?? null;
    const lote = arquivos.map((arquivo) => ({ id: crypto.randomUUID(), arquivo }));

    setEnvios((atual) => [
      ...atual,
      ...lote.map(({ id, arquivo }) => ({
        id,
        nome: arquivo.name,
        progresso: 0,
        erro: null,
        concluido: false,
      })),
    ]);

    const atualizar = (id: string, campos: Partial<Envio>) =>
      setEnvios((atual) => atual.map((e) => (e.id === id ? { ...e, ...campos } : e)));

    let enviados = 0;
    const fila = [...lote];
    async function trabalhar() {
      for (let item = fila.shift(); item; item = fila.shift()) {
        const { id, arquivo } = item;
        try {
          await enviarMaterial({
            arquivo,
            pastaId: destino,
            autorId: meuId,
            onProgresso: (progresso) => atualizar(id, { progresso }),
          });
          enviados += 1;
          atualizar(id, { progresso: 1, concluido: true });
        } catch (e) {
          atualizar(id, { erro: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(ENVIOS_EM_PARALELO, lote.length) }, trabalhar)
    );

    if (enviados > 0) {
      toast.success(
        enviados === 1 ? "Arquivo enviado" : `${enviados} arquivos enviados`
      );
      router.refresh();
    }
    if (enviados < lote.length) {
      toast.error(
        plural(lote.length - enviados, "arquivo não subiu", "arquivos não subiram"),
        { description: "O motivo está na lista de envios." }
      );
    }
  }

  async function mover(material: MaterialWithRelations, pastaId: string | null) {
    const anterior = materiais;
    setMateriais((atual) =>
      atual.map((m) => (m.id === material.id ? { ...m, pasta_id: pastaId } : m))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("materiais")
      .update({ pasta_id: pastaId })
      .eq("id", material.id);

    if (error) {
      setMateriais(anterior);
      toast.error("Não foi possível mover", { description: error.message });
      return;
    }

    toast.success(
      pastaId ? `Movido para “${nomeDaPasta.get(pastaId)}”` : "Movido para fora das pastas"
    );
    router.refresh();
  }

  async function copiarLink(material: MaterialWithRelations) {
    try {
      await navigator.clipboard.writeText(material.url);
      toast.success("Link copiado", {
        description: "Abre sem login — dá para mandar no WhatsApp.",
      });
    } catch {
      toast.error("O navegador não deixou copiar");
    }
  }

  async function excluirMaterial() {
    if (!paraExcluir) return;
    const alvo = paraExcluir;
    const supabase = createClient();

    // Primeiro a linha: sem permissão o RLS não dá erro, só não apaga — o
    // `select` conta. O arquivo no Storage só sai depois que a linha saiu.
    const { data, error } = await supabase
      .from("materiais")
      .delete()
      .eq("id", alvo.id)
      .select("id");
    if (error || !data?.length) {
      toast.error("Não foi possível excluir", {
        description:
          error?.message ?? "Só quem enviou o arquivo ou um admin pode excluí-lo.",
      });
      return;
    }

    setMateriais((atual) => atual.filter((m) => m.id !== alvo.id));
    setParaExcluir(null);
    setAberto(null);

    const { error: erroStorage } = await supabase.storage
      .from(MATERIAIS_BUCKET)
      .remove([alvo.caminho, alvo.miniatura].filter((c): c is string => Boolean(c)));
    if (erroStorage) {
      toast.error("Saiu da lista, mas o arquivo ficou no Storage", {
        description: erroStorage.message,
      });
    } else {
      toast.success("Arquivo excluído");
    }
    router.refresh();
  }

  async function excluirPasta() {
    if (!pastaParaExcluir) return;
    const alvo = pastaParaExcluir;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("material_pastas")
      .delete()
      .eq("id", alvo.id)
      .select("id");
    if (error || !data?.length) {
      toast.error("Não foi possível excluir a pasta", {
        description:
          error?.message ?? "Só quem criou a pasta ou um admin pode excluí-la.",
      });
      return;
    }

    const quantidade = porPasta.get(alvo.id)?.quantidade ?? 0;
    toast.success("Pasta excluída", {
      description: quantidade
        ? `${plural(quantidade, "arquivo voltou", "arquivos voltaram")} para fora das pastas.`
        : undefined,
    });
    setPastaParaExcluir(null);
    if (pastaAtualId === alvo.id) setPastaAtualId(null);
    router.refresh();
  }

  function menuDaPasta(pasta: MaterialPasta) {
    if (!souAdmin && pasta.criado_por !== meuId) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações da pasta ${pasta.nome}`}
              className="shrink-0 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setPastaDialog({ aberto: true, pasta })}>
            <Pencil className="size-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setPastaParaExcluir(pasta)}>
            <Trash2 className="size-4" />
            Excluir pasta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const naRaiz = !pastaAtual && !buscando;
  // Na raiz com pastas e nada solto, a seção de arquivos seria só ruído.
  const mostrarArquivos = !naRaiz || base.length > 0 || pastas.length === 0;
  const pendentes = envios.filter((e) => !e.concluido && !e.erro).length;
  const falhas = envios.filter((e) => e.erro).length;

  return (
    <div
      className="min-h-[calc(100dvh-8rem)]"
      onDragEnter={(e) => {
        if (!temArquivos(e)) return;
        e.preventDefault();
        profundidadeArrasto.current += 1;
        setSoltando(true);
      }}
      onDragOver={(e) => {
        if (temArquivos(e)) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!temArquivos(e)) return;
        profundidadeArrasto.current -= 1;
        if (profundidadeArrasto.current <= 0) {
          profundidadeArrasto.current = 0;
          setSoltando(false);
        }
      }}
      onDrop={(e) => {
        if (!temArquivos(e)) return;
        e.preventDefault();
        profundidadeArrasto.current = 0;
        setSoltando(false);
        enviar(Array.from(e.dataTransfer.files));
      }}
    >
      <PageHeader
        title="Materiais"
        description={
          materiais.length > 0
            ? `Vídeos, imagens e artes da divulgação · ${plural(materiais.length, "arquivo", "arquivos")} · ${formatBytes(totalBytes)}`
            : "Vídeos, imagens e artes da divulgação."
        }
      >
        <Button variant="outline" onClick={() => setPastaDialog({ aberto: true, pasta: null })}>
          <FolderPlus className="size-4" />
          Nova pasta
        </Button>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          Enviar arquivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            e.target.value = ""; // permite escolher o mesmo arquivo de novo
            enviar(arquivos);
          }}
        />
      </PageHeader>

      {pastaAtual && !buscando && (
        <div className="-mt-3 mb-5 flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => setPastaAtualId(null)}
          >
            <ArrowLeft className="size-4" />
            Materiais
          </Button>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
          <h2 className="truncate text-base font-semibold tracking-tight">
            {pastaAtual.nome}
          </h2>
          {menuDaPasta(pastaAtual)}
        </div>
      )}

      <div className="mb-6 space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar em todas as pastas…"
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Segmented options={filtros} value={filtro} onChange={setFiltro} />
      </div>

      {envios.length > 0 && (
        <Card className="mb-6">
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {pendentes > 0
                  ? `Enviando ${plural(pendentes, "arquivo", "arquivos")}…`
                  : falhas > 0
                    ? "Alguns envios falharam"
                    : "Enviado — atualizando a lista…"}
              </p>
              {pendentes === 0 && falhas > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEnvios((atual) => atual.filter((e) => !e.erro))}
                >
                  <X className="size-3" />
                  Limpar
                </Button>
              )}
            </div>
            <ul className="grid gap-2.5">
              {envios.map((envio) => (
                <li key={envio.id} className="grid gap-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{envio.nome}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        envio.erro
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {envio.erro
                        ? "Falhou"
                        : envio.concluido
                          ? "Enviado"
                          : `${Math.round(envio.progresso * 100)}%`}
                    </span>
                  </div>
                  {envio.erro ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{envio.erro}</p>
                  ) : (
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-(--chart-concluida) transition-[width] duration-300"
                        style={{ width: `${Math.round(envio.progresso * 100)}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {naRaiz && pastas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
            Pastas
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pastas.map((pasta) => {
              const numeros = porPasta.get(pasta.id);
              return (
                <Card
                  key={pasta.id}
                  size="sm"
                  role="button"
                  tabIndex={0}
                  onClick={() => setPastaAtualId(pasta.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPastaAtualId(pasta.id);
                    }
                  }}
                  className="cursor-pointer flex-row items-center gap-2.5 pr-1.5 pl-3 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.08)]"
                >
                  <FolderClosed className="size-5 shrink-0 fill-(--brand-gold)/20 text-(--brand-gold)" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pasta.nome}</p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {numeros
                        ? `${plural(numeros.quantidade, "arquivo", "arquivos")} · ${formatBytes(numeros.bytes)}`
                        : "Vazia"}
                    </p>
                  </div>
                  {menuDaPasta(pasta)}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {mostrarArquivos && (
        <section>
          {(buscando || (naRaiz && pastas.length > 0)) && (
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
              {buscando ? "Resultados da busca" : "Fora das pastas"}
            </h2>
          )}

          {visiveis.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visiveis.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  pastas={pastas}
                  nomeDaPasta={
                    buscando
                      ? material.pasta_id
                        ? (nomeDaPasta.get(material.pasta_id) ?? null)
                        : null
                      : undefined
                  }
                  podeExcluir={souAdmin || material.enviado_por === meuId}
                  onAbrir={() => setAberto(material)}
                  onCopiarLink={() => copiarLink(material)}
                  onMover={(pastaId) => mover(material, pastaId)}
                  onExcluir={() => setParaExcluir(material)}
                />
              ))}
            </div>
          ) : buscando || base.length > 0 ? (
            <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              {buscando ? `Nenhum arquivo com “${busca.trim()}”.` : "Nada deste tipo aqui."}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center transition-colors hover:border-ring"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="mt-3 text-sm font-medium">
                {pastaAtual ? "Pasta vazia" : "Nenhum material ainda"}
              </span>
              <span className="mt-1 max-w-sm text-xs text-muted-foreground">
                Arraste vídeos, imagens e artes para cá, ou toque para escolher.
                No plano gratuito do Supabase, até 50 MB por arquivo.
              </span>
            </button>
          )}
        </section>
      )}

      {soltando && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/70 p-6 backdrop-blur-xs">
          <div className="rounded-2xl border-2 border-dashed border-ring bg-card px-10 py-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
            <Upload className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-base font-semibold tracking-tight">Solte para enviar</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              para {pastaAtual ? `“${pastaAtual.nome}”` : "Materiais"}
            </p>
          </div>
        </div>
      )}

      {aberto && (
        <MaterialDialog
          key={aberto.id}
          open
          onOpenChange={(abrir) => !abrir && setAberto(null)}
          material={aberto}
          pastas={pastas}
          podeExcluir={souAdmin || aberto.enviado_por === meuId}
          onCopiarLink={() => copiarLink(aberto)}
          onExcluir={() => setParaExcluir(aberto)}
        />
      )}

      {pastaDialog.aberto && (
        <PastaDialog
          key={pastaDialog.pasta?.id ?? "nova"}
          open
          onOpenChange={(abrir) => !abrir && setPastaDialog({ aberto: false, pasta: null })}
          pasta={pastaDialog.pasta}
          meuId={meuId}
        />
      )}

      <ConfirmDialog
        open={paraExcluir !== null}
        onOpenChange={(abrir) => !abrir && setParaExcluir(null)}
        title={`Excluir “${paraExcluir?.nome}”?`}
        description="O arquivo sai do armazenamento e o link para de funcionar para quem já recebeu. Não dá para desfazer."
        confirmLabel="Excluir"
        destructive
        onConfirm={excluirMaterial}
      />

      <ConfirmDialog
        open={pastaParaExcluir !== null}
        onOpenChange={(abrir) => !abrir && setPastaParaExcluir(null)}
        title={`Excluir a pasta “${pastaParaExcluir?.nome}”?`}
        description="Os arquivos dela NÃO são apagados — voltam para fora das pastas."
        confirmLabel="Excluir pasta"
        destructive
        onConfirm={excluirPasta}
      />
    </div>
  );
}
