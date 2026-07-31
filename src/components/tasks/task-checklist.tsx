"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  id: string;
  texto: string;
  concluido: boolean;
};

/**
 * Lista de subitens. Não fala com o banco: o dialog decide se grava na hora
 * (tarefa existente) ou só no estado local (tarefa ainda não criada).
 */
export function TaskChecklist({
  items,
  disabled = false,
  onAdd,
  onToggle,
  onRemove,
}: {
  items: ChecklistItem[];
  disabled?: boolean;
  onAdd: (texto: string) => void;
  onToggle: (id: string, concluido: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [novo, setNovo] = useState("");
  const feitos = items.filter((i) => i.concluido).length;
  const pct = items.length ? Math.round((feitos / items.length) * 100) : 0;

  function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    onAdd(texto);
    setNovo("");
  }

  return (
    <div className="grid gap-3">
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-(--chart-concluida) transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {feitos}/{items.length}
          </span>
        </div>
      )}

      <div className="grid gap-1">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum item ainda. Quebre a tarefa em etapas.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/50"
          >
            <Checkbox
              checked={item.concluido}
              disabled={disabled}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
              aria-label={item.texto}
            />
            <span
              className={cn(
                "flex-1 text-sm",
                item.concluido && "text-muted-foreground line-through"
              )}
            >
              {item.texto}
            </span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${item.texto}`}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onRemove(item.id)}
              >
                <X className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Ex.: Lixar a lateral direita"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Adicionar item"
            onClick={adicionar}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
