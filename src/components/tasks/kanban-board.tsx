"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/format";
import { calcularOrdem, ordenarPorPosicao } from "@/lib/tasks";
import type { TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

type Alvo = { status: TaskStatus; index: number };

export function KanbanBoard({
  tasks,
  onOpen,
  onNova,
  onMover,
}: {
  tasks: TaskWithRelations[];
  onOpen: (task: TaskWithRelations) => void;
  onNova: (status: TaskStatus) => void;
  onMover: (task: TaskWithRelations, status: TaskStatus, ordem: number) => void;
}) {
  const [arrastando, setArrastando] = useState<TaskWithRelations | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  const colunas = STATUS_ORDER.map((status) => ({
    status,
    items: ordenarPorPosicao(tasks.filter((t) => t.status === status)),
  }));

  function soltar(status: TaskStatus, index: number) {
    const task = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!task) return;

    const coluna = colunas.find((c) => c.status === status)!.items;
    // `index` é a posição na lista COM a tarefa; os vizinhos têm que ser
    // calculados na lista SEM ela, senão ela vira sua própria vizinha.
    const semEla = coluna.filter((t) => t.id !== task.id);
    let destino = index;

    if (task.status === status) {
      const posicaoAtual = coluna.findIndex((t) => t.id === task.id);
      if (posicaoAtual < index) destino = index - 1;
      if (destino === posicaoAtual) return; // não saiu do lugar
    }

    onMover(
      task,
      status,
      calcularOrdem(semEla[destino - 1]?.ordem, semEla[destino]?.ordem)
    );
  }

  /** Caminho sem arrastar (menu do card): entra no topo da coluna de destino. */
  function moverPorMenu(task: TaskWithRelations, status: TaskStatus) {
    const destino = colunas.find((c) => c.status === status)!.items;
    onMover(task, status, calcularOrdem(undefined, destino[0]?.ordem));
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {colunas.map(({ status, items }) => (
        <section
          key={status}
          onDragOver={(e) => {
            e.preventDefault();
            if (!alvo || alvo.status !== status) {
              setAlvo({ status, index: items.length });
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            soltar(status, alvo?.status === status ? alvo.index : items.length);
          }}
          className={cn(
            "rounded-xl transition-colors",
            arrastando && alvo?.status === status && "bg-primary/5"
          )}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
              {STATUS_LABELS[status]}
              <span className="tabular-nums text-muted-foreground/60">
                {items.length}
              </span>
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Nova tarefa em ${STATUS_LABELS[status]}`}
              onClick={() => onNova(status)}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3">
            {items.map((task, index) => (
              <div key={task.id}>
                <DropLine ativo={alvo?.status === status && alvo.index === index} />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const box = e.currentTarget.getBoundingClientRect();
                    const depois = e.clientY > box.top + box.height / 2;
                    setAlvo({ status, index: depois ? index + 1 : index });
                  }}
                >
                  <TaskCard
                    task={task}
                    onOpen={onOpen}
                    onMoverStatus={moverPorMenu}
                    draggable
                    arrastando={arrastando?.id === task.id}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", task.id);
                      setArrastando(task);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setAlvo(null);
                    }}
                  />
                </div>
              </div>
            ))}

            <DropLine
              ativo={alvo?.status === status && alvo.index >= items.length}
            />

            {items.length === 0 && !arrastando && (
              <button
                type="button"
                onClick={() => onNova(status)}
                className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                <Plus className="mr-1.5 size-4" />
                Adicionar tarefa
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function DropLine({ ativo }: { ativo: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 rounded-full transition-all",
        ativo ? "my-1.5 bg-primary" : "my-0 bg-transparent"
      )}
    />
  );
}
