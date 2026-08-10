"use client";

import { CheckSquare, Repeat } from "lucide-react";
import { FASE_LABELS } from "@/lib/feijoada";
import { PRIORIDADE_LABELS } from "@/lib/format";
import {
  PRAZO_TEXT,
  PRIORIDADE_BADGE,
  agruparPorFase,
  labelPrazoTask,
  progressoChecklist,
  tomDoPrazo,
} from "@/lib/tasks";
import type { TaskWithRelations } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export function TaskPhases({
  tasks,
  onOpen,
}: {
  tasks: TaskWithRelations[];
  onOpen: (task: TaskWithRelations) => void;
}) {
  const grupos = agruparPorFase(tasks);

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Nada por aqui ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map(({ fase, tasks }) => (
        <div key={fase}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
            {FASE_LABELS[fase]}
            <span className="tabular-nums text-muted-foreground/60">
              {tasks.length}
            </span>
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {tasks.map((task) => {
                  const { total, feitos } = progressoChecklist(task);
                  const destaque =
                    task.prioridade === "urgente" || task.prioridade === "alta";

                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(task)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <UserAvatar
                          nome={task.responsavel?.nome}
                          fotoUrl={task.responsavel?.foto_url}
                          size="sm"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium",
                            task.status === "concluida" &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {task.titulo}
                        </span>
                        {task.recorrencia && (
                          <Repeat
                            className="size-3.5 shrink-0 text-muted-foreground/70"
                            aria-label="Tarefa recorrente"
                          />
                        )}
                        {total > 0 && (
                          <span className="hidden shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground/80 sm:flex">
                            <CheckSquare className="size-3.5" />
                            {feitos}/{total}
                          </span>
                        )}
                        {destaque && (
                          <Badge className={PRIORIDADE_BADGE[task.prioridade]}>
                            {PRIORIDADE_LABELS[task.prioridade]}
                          </Badge>
                        )}
                        <span
                          className={cn(
                            "shrink-0 text-xs font-medium tabular-nums",
                            PRAZO_TEXT[tomDoPrazo(task)]
                          )}
                        >
                          {labelPrazoTask(task)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
