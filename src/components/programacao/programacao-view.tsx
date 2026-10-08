"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Copy, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dataExtensoFeijoada } from "@/lib/feijoada";
import {
  INICIO_PADRAO,
  formatDuracao,
  horaDeMinutos,
  limitarDuracao,
  montarAgenda,
  ordemNaFila,
  programacaoEmTexto,
  resumirAgenda,
} from "@/lib/programacao";
import type { Bloco, BlocoWithRelations, ProfileRef } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { BlocoCard } from "@/components/programacao/bloco-card";
import { BlocoDialog } from "@/components/programacao/bloco-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Programação: o cronograma do dia como fila de blocos. A régua da tela é a
 * cascata (ver lib/programacao.ts) — arrastar um bloco ou esticar uma duração
 * recalcula o dia inteiro na hora, que é o ponto: dá para discutir o
 * cronograma vendo a conta fechar (ou não).
 */
export function ProgramacaoView({
  blocos: blocosIniciais,
  profiles,
  meuId,
  souAdmin,
}: {
  blocos: BlocoWithRelations[];
  profiles: ProfileRef[];
  meuId: string;
  souAdmin: boolean;
}) {
  const router = useRouter();

  // Espelho local para o arrastar e o ±5 min responderem na hora — mesmo
  // padrão do tasks-view: ajuste durante o render, não num efeito.
  const [blocos, setBlocos] = useState(blocosIniciais);
  const [ultimosDoServidor, setUltimosDoServidor] = useState(blocosIniciais);
  if (blocosIniciais !== ultimosDoServidor) {
    setUltimosDoServidor(blocosIniciais);
    setBlocos(blocosIniciais);
  }

  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<BlocoWithRelations | null>(null);
  const [paraExcluir, setParaExcluir] = useState<BlocoWithRelations | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  /** Posição de inserção na fila COM o bloco arrastado (0…n). */
  const [alvo, setAlvo] = useState<number | null>(null);

  const agenda = useMemo(() => montarAgenda(blocos), [blocos]);
  const resumo = resumirAgenda(agenda);
  const ultimo = agenda[agenda.length - 1];

  // Para o dialog mostrar "vai das X às Y": onde a cascata deixaria o bloco
  // sem hora marcada (o fim do anterior) — ou o fim do dia, se for novo.
  const indiceEmEdicao = emEdicao
    ? agenda.findIndex((a) => a.bloco.id === emEdicao.id)
    : -1;
  const inicioNaFila = emEdicao
    ? (agenda[indiceEmEdicao - 1]?.fim ?? INICIO_PADRAO)
    : (ultimo?.fim ?? INICIO_PADRAO);

  function abrirNovo() {
    setEmEdicao(null);
    setDialogAberto(true);
  }

  function abrir(bloco: BlocoWithRelations) {
    setEmEdicao(bloco);
    setDialogAberto(true);
  }

  async function persistir(id: string, campos: Partial<Bloco>, mensagem?: string) {
    const anterior = blocos;
    setBlocos((atual) => atual.map((b) => (b.id === id ? { ...b, ...campos } : b)));

    const supabase = createClient();
    const { error } = await supabase.from("blocos").update(campos).eq("id", id);

    if (error) {
      setBlocos(anterior);
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }

    if (mensagem) toast.success(mensagem);
    router.refresh();
  }

  /** Põe o bloco no índice `destino` da fila SEM ele. */
  function moverPara(id: string, destino: number) {
    const restante = agenda.filter((a) => a.bloco.id !== id);
    const i = Math.max(0, Math.min(restante.length, destino));
    const ordem = ordemNaFila(restante[i - 1]?.bloco.ordem, restante[i]?.bloco.ordem);
    persistir(id, { ordem }, "Bloco movido");
  }

  function soltar() {
    const id = arrastando;
    const posicao = alvo;
    setArrastando(null);
    setAlvo(null);
    if (!id || posicao === null) return;

    // `posicao` conta a fila COM o bloco; descendo, ele mesmo sai de cima.
    const atual = agenda.findIndex((a) => a.bloco.id === id);
    const destino = posicao > atual ? posicao - 1 : posicao;
    if (destino === atual) return; // não saiu do lugar
    moverPara(id, destino);
  }

  function ajustar(bloco: BlocoWithRelations, delta: number) {
    const nova = limitarDuracao(bloco.duracao_min + delta);
    if (nova === bloco.duracao_min) return;
    persistir(bloco.id, { duracao_min: nova });
  }

  /** A cópia entra logo abaixo e nunca ancorada: duas âncoras na mesma hora
      seriam um conflito criado pelo próprio atalho. */
  async function duplicar(index: number) {
    const { bloco } = agenda[index];
    const supabase = createClient();
    const { error } = await supabase.from("blocos").insert({
      titulo: `${bloco.titulo} (cópia)`,
      descricao: bloco.descricao,
      tipo: bloco.tipo,
      conduzido_por: bloco.conduzido_por,
      local: bloco.local,
      responsavel_id: bloco.responsavel_id,
      duracao_min: bloco.duracao_min,
      inicio_fixo: null,
      ordem: ordemNaFila(bloco.ordem, agenda[index + 1]?.bloco.ordem),
      criado_por: meuId,
    });
    if (error) {
      toast.error("Erro ao duplicar", { description: error.message });
      return;
    }
    toast.success("Bloco duplicado");
    router.refresh();
  }

  async function excluir() {
    if (!paraExcluir) return;
    const supabase = createClient();
    // Sem permissão, o RLS não dá erro: só não apaga nada. O `select` conta.
    const { data, error } = await supabase
      .from("blocos")
      .delete()
      .eq("id", paraExcluir.id)
      .select("id");
    if (error || !data?.length) {
      toast.error("Não foi possível remover", {
        description:
          error?.message ?? "Só quem criou o bloco ou um admin pode removê-lo.",
      });
      return;
    }
    toast.success("Bloco removido do dia");
    setParaExcluir(null);
    setDialogAberto(false);
    router.refresh();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(programacaoEmTexto(agenda));
      toast.success("Programação copiada", {
        description: "É só colar no grupo da equipe.",
      });
    } catch {
      toast.error("O navegador não deixou copiar");
    }
  }

  const vazio = agenda.length === 0;

  return (
    <div>
      <PageHeader
        title="Programação"
        description={`${dataExtensoFeijoada()} · os horários saem das durações.`}
      >
        {!vazio && (
          <Button variant="outline" onClick={copiar}>
            <Copy className="size-4" />
            Copiar
          </Button>
        )}
        <Button onClick={abrirNovo}>
          <Plus className="size-4" />
          Novo bloco
        </Button>
      </PageHeader>

      {vazio ? (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <CalendarClock className="size-5" />
            </span>
            <p className="mt-4 text-base font-semibold tracking-tight">
              O dia ainda está em branco
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Adicione o primeiro bloco — montagem, recepção, a feijoada — e vá
              ajustando. Os horários se calculam sozinhos a partir das durações.
            </p>
            <Button className="mt-5" onClick={abrirNovo}>
              <Plus className="size-4" />
              Adicionar o primeiro bloco
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              size="sm"
              label="O dia"
              value={`${horaDeMinutos(resumo.inicio!)} → ${horaDeMinutos(resumo.fim!)}`}
              hint={`${formatDuracao(resumo.fim! - resumo.inicio!)} de ponta a ponta`}
            />
            <StatCard
              size="sm"
              label="Blocos"
              value={agenda.length}
              hint={`${resumo.ancorados} com hora marcada`}
            />
            <StatCard
              size="sm"
              label="Sem responsável"
              value={resumo.semResponsavel}
              tone={resumo.semResponsavel > 0 ? "warning" : "default"}
              hint={
                resumo.semResponsavel > 0
                  ? "Bloco sem dono não acontece sozinho"
                  : "Todo bloco tem dono"
              }
            />
            <StatCard
              size="sm"
              label="Conflitos"
              value={resumo.conflitos}
              tone={resumo.conflitos > 0 ? "negative" : "default"}
              hint={
                resumo.conflitos > 0
                  ? "Hora marcada atropelada pela fila"
                  : "Tudo encaixado"
              }
            />
          </div>

          <div
            onDragOver={(e) => {
              if (!arrastando) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              soltar();
            }}
          >
            {agenda.map((item, index) => (
              <div
                key={item.bloco.id}
                onDragOver={(e) => {
                  if (!arrastando) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const box = e.currentTarget.getBoundingClientRect();
                  const depois = e.clientY > box.top + box.height / 2;
                  setAlvo(depois ? index + 1 : index);
                }}
              >
                <DropLine ativo={alvo === index} />
                <BlocoCard
                  item={item}
                  primeiro={index === 0}
                  ultimo={index === agenda.length - 1}
                  podeExcluir={souAdmin || item.bloco.criado_por === meuId}
                  arrastando={arrastando === item.bloco.id}
                  onAbrir={() => abrir(item.bloco)}
                  onAjustar={(delta) => ajustar(item.bloco, delta)}
                  onSubir={() => moverPara(item.bloco.id, index - 1)}
                  onDescer={() => moverPara(item.bloco.id, index + 1)}
                  onDuplicar={() => duplicar(index)}
                  onExcluir={() => setParaExcluir(item.bloco)}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.bloco.id);
                    setArrastando(item.bloco.id);
                  }}
                  onDragEnd={() => {
                    setArrastando(null);
                    setAlvo(null);
                  }}
                />
              </div>
            ))}
            <DropLine ativo={alvo !== null && alvo >= agenda.length} />
          </div>
        </>
      )}

      {dialogAberto && (
        <BlocoDialog
          key={emEdicao?.id ?? "novo"}
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          bloco={emEdicao}
          inicioNaFila={inicioNaFila}
          ordemNova={ordemNaFila(ultimo?.bloco.ordem, undefined)}
          profiles={profiles}
          meuId={meuId}
          souAdmin={souAdmin}
          onExcluir={setParaExcluir}
        />
      )}

      <ConfirmDialog
        open={paraExcluir !== null}
        onOpenChange={(aberto) => !aberto && setParaExcluir(null)}
        title={`Remover “${paraExcluir?.titulo}” do dia?`}
        description="Os comentários e o histórico dele vão junto, e o resto da programação se reacomoda. Não dá para desfazer."
        confirmLabel="Remover"
        destructive
        onConfirm={excluir}
      />
    </div>
  );
}

/** Onde o bloco vai cair. O recuo alinha a linha com os cards, não com o trilho. */
function DropLine({ ativo }: { ativo: boolean }) {
  return (
    <div
      className={cn(
        "ml-[80px] h-0.5 rounded-full transition-all sm:ml-[96px]",
        ativo ? "my-1.5 bg-primary" : "my-0 bg-transparent"
      )}
    />
  );
}
