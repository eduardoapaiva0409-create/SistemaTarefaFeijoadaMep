"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MONTHS_PT, formatDate, toISODate } from "@/lib/format";
import {
  PRAZO_TEXT,
  labelPrazoTask,
  ordenarPorUrgencia,
  tomDoPrazo,
} from "@/lib/tasks";
import type { TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_SEMANA_CURTO = ["S", "T", "Q", "Q", "S", "S", "D"];

const PONTO: Record<string, string> = {
  atrasada: "bg-red-500",
  hoje: "bg-amber-500",
  proxima: "bg-amber-400",
  neutra: "bg-muted-foreground/40",
};

export function TaskCalendar({
  tasks,
  onOpen,
}: {
  tasks: TaskWithRelations[];
  onOpen: (task: TaskWithRelations) => void;
}) {
  const hoje = new Date();
  const hojeISO = toISODate(hoje);
  const [mes, setMes] = useState(
    () => new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  );
  // No celular a célula é pequena demais para o título: ela vira um alvo de
  // toque e as tarefas do dia aparecem numa lista abaixo da grade.
  const [diaSelecionado, setDiaSelecionado] = useState(hojeISO);

  const porDia = useMemo(() => {
    const mapa = new Map<string, TaskWithRelations[]>();
    for (const task of tasks) {
      if (!task.prazo) continue;
      const chave = task.prazo.split("T")[0];
      mapa.set(chave, [...(mapa.get(chave) ?? []), task]);
    }
    return mapa;
  }, [tasks]);

  const semPrazo = tasks.filter((t) => !t.prazo);

  // A grade sempre começa na segunda-feira da semana do dia 1.
  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(inicio.getDate() - ((primeiro.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, i) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + i);
      return data;
    });
  }, [mes]);

  const doDiaSelecionado = ordenarPorUrgencia(porDia.get(diaSelecionado) ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          {MONTHS_PT[mes.getMonth()]} de {mes.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
              setDiaSelecionado(hojeISO);
            }}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Mês anterior"
            onClick={() =>
              setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Próximo mês"
            onClick={() =>
              setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {DIAS_SEMANA.map((dia, i) => (
              <div
                key={dia + i}
                className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                <span className="hidden sm:inline">{dia}</span>
                <span className="sm:hidden">{DIAS_SEMANA_CURTO[i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {celulas.map((data, i) => {
              const iso = toISODate(data);
              const doMes = data.getMonth() === mes.getMonth();
              const doDia = ordenarPorUrgencia(porDia.get(iso) ?? []);
              const visiveis = doDia.slice(0, 3);
              const selecionado = iso === diaSelecionado;

              return (
                <div
                  key={iso}
                  className={cn(
                    "relative min-h-14 border-b border-r p-1 sm:min-h-24 sm:p-1.5",
                    i % 7 === 6 && "border-r-0",
                    i >= 35 && "border-b-0",
                    !doMes && "bg-muted/30",
                    selecionado && "bg-primary/5 sm:bg-transparent"
                  )}
                >
                  {/* Alvo de toque do dia inteiro — só no celular. No desktop
                      quem recebe o clique são os chips de tarefa. */}
                  <button
                    type="button"
                    onClick={() => setDiaSelecionado(iso)}
                    aria-label={`Ver tarefas de ${formatDate(iso)}`}
                    className="absolute inset-0 sm:hidden"
                  />

                  <div className="pointer-events-none relative sm:pointer-events-auto">
                    <div
                      className={cn(
                        "mb-1 flex size-5 items-center justify-center rounded-full text-xs tabular-nums",
                        iso === hojeISO
                          ? "bg-primary font-semibold text-primary-foreground"
                          : selecionado
                            ? "font-semibold text-foreground sm:font-normal"
                            : doMes
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                      )}
                    >
                      {data.getDate()}
                    </div>

                    {/* Celular: pontos. A contagem exata vai na lista abaixo. */}
                    {doDia.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {doDia.slice(0, 4).map((task) => (
                          <span
                            key={task.id}
                            className={cn(
                              "size-1.5 rounded-full",
                              task.status === "concluida"
                                ? "bg-muted-foreground/30"
                                : PONTO[tomDoPrazo(task)]
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Desktop: título de cada tarefa. */}
                    <div className="hidden space-y-0.5 sm:block">
                      {visiveis.map((task) => {
                        const tom = tomDoPrazo(task);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => onOpen(task)}
                            title={task.titulo}
                            className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-muted"
                          >
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                task.status === "concluida"
                                  ? "bg-muted-foreground/30"
                                  : PONTO[tom]
                              )}
                            />
                            <span
                              className={cn(
                                "truncate",
                                task.status === "concluida"
                                  ? "text-muted-foreground line-through"
                                  : tom === "neutra"
                                    ? "text-foreground"
                                    : PRAZO_TEXT[tom]
                              )}
                            >
                              {task.titulo}
                            </span>
                          </button>
                        );
                      })}
                      {doDia.length > visiveis.length && (
                        <p className="px-1 text-[11px] text-muted-foreground">
                          +{doDia.length - visiveis.length}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista do dia tocado — substitui os títulos que não cabem no celular. */}
      <div className="sm:hidden">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
          {diaSelecionado === hojeISO
            ? "Hoje"
            : formatDate(diaSelecionado)}
        </h2>
        <Card>
          <CardContent className="p-0">
            {doDiaSelecionado.length === 0 ? (
              <p className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                Nenhuma tarefa nesse dia.
              </p>
            ) : (
              <ul className="divide-y">
                {doDiaSelecionado.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(task)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors active:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          task.status === "concluida"
                            ? "bg-muted-foreground/30"
                            : PONTO[tomDoPrazo(task)]
                        )}
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
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {semPrazo.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
            Sem prazo definido
          </h2>
          <div className="flex flex-wrap gap-2">
            {semPrazo.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpen(task)}
                className="max-w-full truncate rounded-lg bg-card px-3 py-1.5 text-sm ring-1 ring-black/5 transition-shadow hover:shadow-sm dark:ring-white/10"
              >
                {task.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
