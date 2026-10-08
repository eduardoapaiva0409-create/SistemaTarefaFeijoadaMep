"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  MapPin,
  MessageSquare,
  Minus,
  MoreVertical,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { BLOCO_ICONE } from "@/components/programacao/bloco-icone";
import { primeiroNome } from "@/lib/format";
import {
  BLOCO_COR,
  BLOCO_TIPO_LABELS,
  ehRespiro,
  formatDuracao,
  horaDeMinutos,
  type BlocoAgendado,
} from "@/lib/programacao";
import { cn } from "@/lib/utils";

export function BlocoCard({
  item,
  primeiro,
  ultimo,
  podeExcluir,
  arrastando,
  onAbrir,
  onAjustar,
  onSubir,
  onDescer,
  onDuplicar,
  onExcluir,
  onDragStart,
  onDragEnd,
}: {
  item: BlocoAgendado;
  primeiro: boolean;
  ultimo: boolean;
  podeExcluir: boolean;
  arrastando: boolean;
  onAbrir: () => void;
  /** Estica ou encolhe em passos de 5 min — é assim que se negocia o dia. */
  onAjustar: (delta: number) => void;
  /**
   * Subir/Descer são o caminho real no celular: o drag-and-drop do HTML5 não
   * existe em tela de toque.
   */
  onSubir: () => void;
  onDescer: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const { bloco, inicio, fim, folga } = item;
  const Icone = BLOCO_ICONE[bloco.tipo];
  const respiro = ehRespiro(bloco.tipo);
  const comentarios = bloco.bloco_events?.length ?? 0;
  // O aviso de folga empurra o card para baixo; trilho e ponto descem junto
  // para o horário continuar alinhado com o card, não com o aviso.
  const temAviso = folga !== null && folga !== 0;

  return (
    <div className={cn("group flex gap-3 sm:gap-4", arrastando && "opacity-40")}>
      {/* Trilho do relógio: o horário é calculado, então mora fora do card —
          o card é o conteúdo, o trilho é o tempo. */}
      <div
        className={cn(
          "w-12 shrink-0 text-right sm:w-14",
          temAviso ? "pt-[38px]" : "pt-3"
        )}
      >
        <p className="text-[13px] leading-none font-semibold tracking-tight tabular-nums">
          {horaDeMinutos(inicio)}
        </p>
        <p className="mt-1 text-[11px] leading-none tabular-nums text-muted-foreground/70">
          {horaDeMinutos(fim)}
        </p>
      </div>

      <div className="relative flex w-2 shrink-0 justify-center">
        <span
          className={cn(
            "absolute w-px bg-border",
            primeiro ? (temAviso ? "top-[42px]" : "top-4") : "top-0",
            ultimo ? "h-4" : "bottom-0"
          )}
        />
        <span
          className={cn(
            "absolute size-2 rounded-full ring-2 ring-background",
            temAviso ? "top-[40px]" : "top-3.5",
            BLOCO_COR[bloco.tipo]
          )}
        />
      </div>

      <div className="min-w-0 flex-1 pb-2.5">
        {/* Só bloco com hora marcada tem folga: é a âncora cobrando a fila. */}
        {folga !== null && folga !== 0 && (
          <p
            className={cn(
              "mb-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              folga < 0
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {folga < 0
              ? `A fila chega ${formatDuracao(-folga)} depois da hora marcada`
              : `${formatDuracao(folga)} livres antes`}
          </p>
        )}

        <Card
          size="sm"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onAbrir}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAbrir();
            }
          }}
          className={cn(
            "relative cursor-pointer gap-0 py-0 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.08)] active:cursor-grabbing",
            respiro && "bg-card/60 shadow-none"
          )}
        >
          <span
            className={cn("absolute inset-y-0 left-0 w-[3px]", BLOCO_COR[bloco.tipo])}
          />

          <div className="py-3 pr-2 pl-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-px grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icone className="size-[15px]" />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm leading-snug font-medium tracking-tight",
                    respiro && "text-muted-foreground"
                  )}
                >
                  {bloco.titulo}
                </p>
                {bloco.conduzido_por && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {bloco.conduzido_por}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ações de ${bloco.titulo}`}
                      className="-mt-0.5 shrink-0 text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={onAbrir}>
                    <Pencil className="size-4" />
                    Abrir e editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicar}>
                    <Copy className="size-4" />
                    Duplicar
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  {/* O Group é obrigatório: DropdownMenuLabel é o GroupLabel do
                      Base UI e lê o contexto do grupo — solto, ele lança. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Duração</DropdownMenuLabel>
                    <DropdownMenuItem
                      disabled={bloco.duracao_min <= 5}
                      onClick={() => onAjustar(-5)}
                    >
                      <Minus className="size-4" />
                      Tirar 5 min
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAjustar(5)}>
                      <Plus className="size-4" />
                      Somar 5 min
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Mover</DropdownMenuLabel>
                    <DropdownMenuItem disabled={primeiro} onClick={onSubir}>
                      <ArrowUp className="size-4" />
                      Subir
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={ultimo} onClick={onDescer}>
                      <ArrowDown className="size-4" />
                      Descer
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  {podeExcluir && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={onExcluir}>
                        <Trash2 className="size-4" />
                        Remover do dia
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2.5 ml-[38px] flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              {/* No desktop os passos de 5 min aparecem no hover, para não
                  poluir a leitura; no celular eles estão no menu ⋮. */}
              <span className="inline-flex items-center rounded-md bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                <button
                  type="button"
                  aria-label="Tirar 5 minutos"
                  disabled={bloco.duracao_min <= 5}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAjustar(-5);
                  }}
                  className="hidden rounded-l-md px-1 py-0.5 transition hover:bg-black/8 hover:text-foreground disabled:opacity-30 md:block md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-white/10"
                >
                  <Minus className="size-3" />
                </button>
                <span className="px-1.5 py-0.5">{formatDuracao(bloco.duracao_min)}</span>
                <button
                  type="button"
                  aria-label="Somar 5 minutos"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAjustar(5);
                  }}
                  className="hidden rounded-r-md px-1 py-0.5 transition hover:bg-black/8 hover:text-foreground md:block md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-white/10"
                >
                  <Plus className="size-3" />
                </button>
              </span>

              {!respiro && (
                <Badge variant="outline" className="font-normal">
                  {BLOCO_TIPO_LABELS[bloco.tipo]}
                </Badge>
              )}

              {bloco.inicio_fixo && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground"
                  title="Hora marcada: este bloco não desliza com a cascata"
                >
                  <Pin className="size-3" />
                  {horaDeMinutos(inicio)} fixo
                </span>
              )}

              {bloco.local && (
                <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{bloco.local}</span>
                </span>
              )}

              {comentarios > 0 && (
                <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <MessageSquare className="size-3" />
                  {comentarios}
                </span>
              )}

              <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatar
                  nome={bloco.responsavel?.nome}
                  fotoUrl={bloco.responsavel?.foto_url}
                  size="sm"
                />
                <span className="truncate">
                  {bloco.responsavel
                    ? primeiroNome(bloco.responsavel.nome)
                    : "Sem responsável"}
                </span>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
