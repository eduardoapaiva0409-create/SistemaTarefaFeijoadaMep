"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import {
  PRIORIDADE_LABELS,
  STATUS_LABELS,
  formatDate,
  formatRelative,
  primeiroNome,
} from "@/lib/format";
import type { Prioridade, TaskEvent, TaskStatus } from "@/lib/types";

function statusLabel(v: string | null) {
  return v ? (STATUS_LABELS[v as TaskStatus] ?? v) : "—";
}

function prioridadeLabel(v: string | null) {
  return v ? (PRIORIDADE_LABELS[v as Prioridade] ?? v) : "—";
}

/** Frase do evento de mudança. Comentário é tratado à parte (tem corpo). */
function descreverEvento(evento: TaskEvent): string {
  switch (evento.tipo) {
    case "criacao":
      return "criou a tarefa";
    case "status":
      return `moveu de ${statusLabel(evento.de)} para ${statusLabel(evento.para)}`;
    case "responsavel":
      if (!evento.para) return `tirou ${evento.de ?? "o responsável"} da tarefa`;
      if (!evento.de) return `delegou para ${evento.para}`;
      return `passou de ${evento.de} para ${evento.para}`;
    case "prazo":
      if (!evento.para) return "removeu o prazo";
      if (!evento.de) return `definiu o prazo para ${formatDate(evento.para)}`;
      return `mudou o prazo de ${formatDate(evento.de)} para ${formatDate(evento.para)}`;
    case "prioridade":
      return `mudou a prioridade de ${prioridadeLabel(evento.de)} para ${prioridadeLabel(evento.para)}`;
    default:
      return "";
  }
}

export function TaskActivity({
  eventos,
  carregando,
  meuId,
  souAdmin,
  onComentar,
  onExcluirComentario,
}: {
  eventos: TaskEvent[];
  carregando: boolean;
  meuId: string | null;
  souAdmin: boolean;
  onComentar: (texto: string) => Promise<void>;
  onExcluirComentario: (id: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const corpo = texto.trim();
    if (!corpo) return;
    setEnviando(true);
    await onComentar(corpo);
    setTexto("");
    setEnviando(false);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: Peça chegou, pode seguir com a montagem."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={enviando || !texto.trim()}
            onClick={enviar}
          >
            <Send className="size-4" />
            {enviando ? "Enviando…" : "Comentar"}
          </Button>
        </div>
      </div>

      {carregando ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Carregando…
        </p>
      ) : eventos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nada por aqui ainda.
        </p>
      ) : (
        <ol className="grid gap-3">
          {eventos.map((evento) => {
            const autor = evento.autor?.nome ?? "Alguém";
            const podeExcluir =
              evento.tipo === "comentario" &&
              (souAdmin || evento.autor_id === meuId);

            if (evento.tipo === "comentario") {
              return (
                <li key={evento.id} className="group flex gap-2.5">
                  <UserAvatar nome={evento.autor?.nome} size="sm" />
                  <div className="min-w-0 flex-1 rounded-lg bg-muted/60 px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium">{autor}</span>
                      <span className="text-xs text-muted-foreground/80">
                        {formatRelative(evento.created_at)}
                      </span>
                      {podeExcluir && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir comentário"
                          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => onExcluirComentario(evento.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap">
                      {evento.texto}
                    </p>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={evento.id}
                className="flex items-center gap-2.5 pl-1 text-xs text-muted-foreground"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-border" />
                <span className="flex-1">
                  <span className="font-medium text-foreground/70">
                    {primeiroNome(autor)}
                  </span>{" "}
                  {descreverEvento(evento)}
                </span>
                <span className="shrink-0 text-muted-foreground/80">
                  {formatRelative(evento.created_at)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
