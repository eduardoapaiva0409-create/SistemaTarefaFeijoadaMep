"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative, primeiroNome } from "@/lib/format";
import type { ProfileRef } from "@/lib/types";

/**
 * Forma comum de `task_events` e `bloco_events`: comentário e histórico na
 * mesma linha do tempo. Só o que muda é a frase de cada tipo de mudança.
 */
export type TimelineEvent = {
  id: string;
  autor_id: string | null;
  tipo: string;
  texto: string | null;
  de: string | null;
  para: string | null;
  created_at: string;
  autor?: ProfileRef | null;
};

export type ActivityTimelineProps<E extends TimelineEvent> = {
  eventos: E[];
  carregando: boolean;
  meuId: string | null;
  souAdmin: boolean;
  onComentar: (texto: string) => Promise<void>;
  onExcluirComentario: (id: string) => Promise<void>;
};

export function ActivityTimeline<E extends TimelineEvent>({
  eventos,
  carregando,
  meuId,
  souAdmin,
  onComentar,
  onExcluirComentario,
  descrever,
  placeholder,
}: ActivityTimelineProps<E> & {
  /** Frase do evento de mudança. Comentário é tratado à parte (tem corpo). */
  descrever: (evento: E) => string;
  placeholder: string;
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
          placeholder={placeholder}
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
                  <UserAvatar
                    nome={evento.autor?.nome}
                    fotoUrl={evento.autor?.foto_url}
                    size="sm"
                  />
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
                  {descrever(evento)}
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
