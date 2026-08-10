"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { excluirPessoa } from "@/app/(app)/equipe/actions";
import {
  FUNCAO_LABELS,
  FUNCAO_ORDER,
  PAPEL_LABELS,
  SETOR_LABELS,
  SETOR_ORDER,
} from "@/lib/format";
import { isAtrasada } from "@/lib/tasks";
import type { Profile, TaskWithRelations } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { PessoaDialog } from "@/components/equipe/pessoa-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Sentinela do "não atribuído" — vale para os dois filtros. */
const SEM = "__sem__";

const SETOR_FILTROS = [
  { value: "todos", label: "Todo setor" },
  ...SETOR_ORDER.map((v) => ({ value: v, label: SETOR_LABELS[v] })),
  { value: SEM, label: "Sem setor" },
];

const FUNCAO_FILTROS = [
  { value: "todos", label: "Toda função" },
  ...FUNCAO_ORDER.map((v) => ({ value: v, label: FUNCAO_LABELS[v] })),
  { value: SEM, label: "Sem função" },
];

/** Posição do setor na ordem de exibição; sem setor sempre por último. */
function ordemSetor(setor: Profile["setor"]): number {
  if (!setor) return SETOR_ORDER.length;
  const i = SETOR_ORDER.indexOf(setor);
  return i === -1 ? SETOR_ORDER.length : i;
}

export function EquipeView({
  pessoas,
  tasks,
  meuId,
  souAdmin,
}: {
  pessoas: Profile[];
  tasks: TaskWithRelations[];
  meuId: string;
  souAdmin: boolean;
}) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Profile | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Profile | null>(null);
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [filtroFuncao, setFiltroFuncao] = useState("todos");

  const pessoasOrdenadas = useMemo(() => {
    return [...pessoas]
      .filter((p) => {
        if (filtroSetor === SEM && p.setor) return false;
        if (filtroSetor !== "todos" && filtroSetor !== SEM) {
          if (p.setor !== filtroSetor) return false;
        }
        if (filtroFuncao === SEM && p.funcao) return false;
        if (filtroFuncao !== "todos" && filtroFuncao !== SEM) {
          if (p.funcao !== filtroFuncao) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const os = ordemSetor(a.setor) - ordemSetor(b.setor);
        if (os !== 0) return os;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [pessoas, filtroSetor, filtroFuncao]);

  const contagem = new Map<string, { abertas: number; atrasadas: number }>();
  for (const task of tasks) {
    if (!task.responsavel_id || task.status === "concluida") continue;
    const atual = contagem.get(task.responsavel_id) ?? {
      abertas: 0,
      atrasadas: 0,
    };
    atual.abertas += 1;
    if (isAtrasada(task)) atual.atrasadas += 1;
    contagem.set(task.responsavel_id, atual);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const resultado = await excluirPessoa(paraExcluir.id);
    if (!resultado.ok) {
      toast.error("Não foi possível excluir", { description: resultado.erro });
      return;
    }
    toast.success("Acesso removido");
    setParaExcluir(null);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Quem tem acesso ao sistema e a carga de cada um."
      >
        {souAdmin && (
          <Button
            onClick={() => {
              setEmEdicao(null);
              setDialogAberto(true);
            }}
          >
            <Plus className="size-4" />
            Nova pessoa
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          items={FUNCAO_FILTROS}
          value={filtroFuncao}
          onValueChange={(v) => setFiltroFuncao(v as string)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUNCAO_FILTROS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={SETOR_FILTROS}
          value={filtroSetor}
          onValueChange={(v) => setFiltroSetor(v as string)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETOR_FILTROS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pessoasOrdenadas.length} de {pessoas.length}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead className="text-right">Abertas</TableHead>
                  <TableHead className="text-right">Atrasadas</TableHead>
                  {souAdmin && (
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pessoasOrdenadas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={souAdmin ? 7 : 6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nada por aqui ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  pessoasOrdenadas.map((pessoa) => {
                    const numeros = contagem.get(pessoa.id) ?? {
                      abertas: 0,
                      atrasadas: 0,
                    };
                    return (
                      <TableRow key={pessoa.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar nome={pessoa.nome} fotoUrl={pessoa.foto_url} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-medium">
                                {pessoa.nome}
                                {pessoa.id === meuId && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    você
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {pessoa.tem_acesso
                                  ? (pessoa.email ?? "—")
                                  : "Sem acesso ao sistema"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pessoa.funcao ? FUNCAO_LABELS[pessoa.funcao] : "—"}
                        </TableCell>
                        <TableCell>
                          {pessoa.setor ? (
                            <Badge variant="outline">
                              {SETOR_LABELS[pessoa.setor]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                pessoa.papel === "admin" ? "default" : "outline"
                              }
                            >
                              {PAPEL_LABELS[pessoa.papel]}
                            </Badge>
                            {!pessoa.ativo && (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {numeros.abertas}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {numeros.atrasadas > 0 ? (
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {numeros.atrasadas}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        {souAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Editar ${pessoa.nome}`}
                              onClick={() => {
                                setEmEdicao(pessoa);
                                setDialogAberto(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Excluir ${pessoa.nome}`}
                              disabled={pessoa.id === meuId}
                              onClick={() => setParaExcluir(pessoa)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {dialogAberto && (
        <PessoaDialog
          key={emEdicao?.id ?? "nova"}
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          pessoa={emEdicao}
        />
      )}

      <ConfirmDialog
        open={paraExcluir !== null}
        onOpenChange={(aberto) => !aberto && setParaExcluir(null)}
        title={`Excluir o acesso de ${paraExcluir?.nome}?`}
        description="A pessoa perde o login. As tarefas dela continuam no sistema, mas ficam sem responsável."
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
