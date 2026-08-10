"use client";

import { CheckSquare, MoreVertical, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import {
  PRIORIDADE_LABELS,
  SETOR_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  primeiroNome,
} from "@/lib/format";
import {
  PRAZO_TEXT,
  PRIORIDADE_BADGE,
  labelPrazoTask,
  progressoChecklist,
  tomDoPrazo,
} from "@/lib/tasks";
import type { TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskCard({
  task,
  onOpen,
  draggable = false,
  onDragStart,
  onDragEnd,
  arrastando = false,
  onMoverStatus,
}: {
  task: TaskWithRelations;
  onOpen: (task: TaskWithRelations) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  arrastando?: boolean;
  /**
   * Alternativa ao arrastar. Obrigatório no quadro: o drag-and-drop do HTML5
   * não existe em tela de toque, então sem isso o kanban fica inoperável no
   * celular.
   */
  onMoverStatus?: (task: TaskWithRelations, status: TaskStatus) => void;
}) {
  const { total, feitos } = progressoChecklist(task);
  const tom = tomDoPrazo(task);
  const destaque = task.prioridade === "urgente" || task.prioridade === "alta";

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.08)]",
        draggable && "active:cursor-grabbing",
        arrastando && "opacity-40"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1">
          <p
            className={cn(
              "min-w-0 flex-1 text-sm leading-snug font-medium tracking-tight",
              task.status === "concluida" &&
                "text-muted-foreground line-through"
            )}
          >
            {task.titulo}
          </p>

          {onMoverStatus && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mover ${task.titulo}`}
                    // -mr/-mt puxam o alvo para o canto sem apertar o texto;
                    // o tamanho do toque continua o do botão inteiro.
                    className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {/* O Group é obrigatório: DropdownMenuLabel é o GroupLabel do
                    Base UI e lê o contexto do grupo — solto, ele lança. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                  {STATUS_ORDER.filter((s) => s !== task.status).map(
                    (status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onMoverStatus(task, status)}
                      >
                        {STATUS_LABELS[status]}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {destaque && (
            <Badge className={PRIORIDADE_BADGE[task.prioridade]}>
              {PRIORIDADE_LABELS[task.prioridade]}
            </Badge>
          )}
          {(task.prazo || task.concluida_em) && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                PRAZO_TEXT[tom]
              )}
            >
              {labelPrazoTask(task)}
            </span>
          )}
          {task.setor && (
            <Badge variant="outline" className="font-normal">
              {SETOR_LABELS[task.setor]}
            </Badge>
          )}
          {task.recorrencia && (
            <Repeat
              className="size-3.5 text-muted-foreground/70"
              aria-label="Tarefa recorrente"
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar
              nome={task.responsavel?.nome}
              fotoUrl={task.responsavel?.foto_url}
              size="sm"
            />
            <span className="truncate">
              {task.responsavel
                ? primeiroNome(task.responsavel.nome)
                : "Sem responsável"}
            </span>
          </div>
          {total > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground/80">
              <CheckSquare className="size-3.5" />
              {feitos}/{total}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
