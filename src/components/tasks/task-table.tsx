"use client";

import { Check, CheckSquare, Repeat, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import {
  PRIORIDADE_LABELS,
  SETOR_LABELS,
  STATUS_LABELS,
  formatDate,
  labelPrazo,
  primeiroNome,
} from "@/lib/format";
import {
  PRAZO_TEXT,
  PRIORIDADE_BADGE,
  STATUS_BADGE,
  ordenarPorUrgencia,
  progressoChecklist,
  tomDoPrazo,
} from "@/lib/tasks";
import type { TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskTable({
  tasks,
  onOpen,
  onAlternarConclusao,
}: {
  tasks: TaskWithRelations[];
  onOpen: (task: TaskWithRelations) => void;
  onAlternarConclusao: (task: TaskWithRelations) => void;
}) {
  const linhas = ordenarPorUrgencia(tasks);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nada por aqui ainda.
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map((task) => {
                  const { total, feitos } = progressoChecklist(task);
                  const concluida = task.status === "concluida";
                  return (
                    <TableRow
                      key={task.id}
                      onClick={() => onOpen(task)}
                      className="cursor-pointer"
                    >
                      <TableCell className="max-w-[22rem]">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate font-medium",
                              concluida &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {task.titulo}
                          </span>
                          {task.recorrencia && (
                            <Repeat
                              className="size-3.5 shrink-0 text-muted-foreground/70"
                              aria-label="Recorrente"
                            />
                          )}
                          {total > 0 && (
                            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground/80">
                              <CheckSquare className="size-3.5" />
                              {feitos}/{total}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.setor ? (
                          <Badge variant="outline" className="font-normal">
                            {SETOR_LABELS[task.setor]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            nome={task.responsavel?.nome}
                            fotoUrl={task.responsavel?.foto_url}
                            size="sm"
                          />
                          <span className="text-muted-foreground">
                            {task.responsavel
                              ? primeiroNome(task.responsavel.nome)
                              : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium tabular-nums",
                          PRAZO_TEXT[tomDoPrazo(task)]
                        )}
                      >
                        {/* Concluída: a coluna Status já diz o estado, então
                            aqui vale a data crua, não a cobrança de prazo. */}
                        {concluida
                          ? formatDate(task.prazo)
                          : labelPrazo(task.prazo)}
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORIDADE_BADGE[task.prioridade]}>
                          {PRIORIDADE_LABELS[task.prioridade]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[task.status]}>
                          {STATUS_LABELS[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            concluida ? "Reabrir tarefa" : "Concluir tarefa"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            onAlternarConclusao(task);
                          }}
                        >
                          {concluida ? (
                            <RotateCcw className="size-4" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
