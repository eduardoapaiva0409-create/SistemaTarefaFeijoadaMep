"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import { AtividadeChart } from "@/components/dashboard/atividade-chart";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PRIORIDADE_LABELS,
  labelPrazo,
  plural,
  primeiroNome,
} from "@/lib/format";
import {
  PRAZO_TEXT,
  PRIORIDADE_BADGE,
  calcularMetricas,
  cargaPorResponsavel,
  isAtrasada,
  ordenarPorUrgencia,
  serieDiaria,
  tomDoPrazo,
} from "@/lib/tasks";
import type { Profile, ProfileRef, TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardView({
  tasks,
  profiles,
  profile,
}: {
  tasks: TaskWithRelations[];
  profiles: ProfileRef[];
  profile: Profile;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<TaskWithRelations | null>(null);

  const souAdmin = profile.papel === "admin";
  const metricas = calcularMetricas(tasks);
  const carga = cargaPorResponsavel(tasks);
  const serie = serieDiaria(tasks);
  const maiorCarga = Math.max(1, ...carga.map((c) => c.abertas));

  const minhas = ordenarPorUrgencia(
    tasks.filter((t) => t.responsavel_id === profile.id && t.status !== "concluida")
  ).slice(0, 6);

  const atrasadasDeOutros = ordenarPorUrgencia(
    tasks.filter((t) => isAtrasada(t) && t.responsavel_id !== profile.id)
  ).slice(0, 5);

  function abrir(task: TaskWithRelations) {
    setEmEdicao(task);
    setDialogAberto(true);
  }

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${primeiroNome(profile.nome)}`}
        description={hoje.charAt(0).toUpperCase() + hoje.slice(1)}
      >
        <Button
          onClick={() => {
            setEmEdicao(null);
            setDialogAberto(true);
          }}
        >
          <Plus className="size-4" />
          Nova tarefa
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atrasadas"
          value={metricas.atrasadas}
          tone={metricas.atrasadas > 0 ? "negative" : "default"}
          hint="Passaram do prazo e não foram concluídas"
        />
        <StatCard
          label="Para hoje"
          value={metricas.hoje}
          tone={metricas.hoje > 0 ? "warning" : "default"}
          hint="Prazo vence hoje"
        />
        <StatCard
          label="Em andamento"
          value={metricas.emAndamento}
          hint={`${plural(metricas.abertas, "tarefa aberta", "tarefas abertas")} no total`}
        />
        <StatCard
          label="Concluídas na semana"
          value={metricas.concluidasSemana}
          tone={metricas.concluidasSemana > 0 ? "positive" : "default"}
          hint="Desde segunda-feira"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Minhas tarefas */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
              Minhas tarefas
            </h2>
            <Link
              href="/tarefas"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todas
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {minhas.length === 0 ? (
                <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  Nenhuma tarefa aberta para você. Bom trabalho.
                </p>
              ) : (
                <ul className="divide-y">
                  {minhas.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => abrir(task)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {task.titulo}
                        </span>
                        {task.prioridade !== "media" &&
                          task.prioridade !== "baixa" && (
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
                          {labelPrazo(task.prazo)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Carga da equipe */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
            Carga da equipe
          </h2>
          <Card>
            <CardContent className="p-0">
              {carga.length === 0 ? (
                <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  Nada em aberto.
                </p>
              ) : (
                <ul className="divide-y">
                  {carga.map((pessoa) => (
                    <li
                      key={pessoa.id ?? "sem"}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <UserAvatar nome={pessoa.id ? pessoa.nome : null} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {/* "Sem responsável" é rótulo, não nome de pessoa —
                              encurtar viraria só "Sem". */}
                          {pessoa.id ? primeiroNome(pessoa.nome) : pessoa.nome}
                        </p>
                        {pessoa.atrasadas > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {plural(pessoa.atrasadas, "atrasada", "atrasadas")}
                          </p>
                        )}
                      </div>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-(--chart-concluida)"
                          style={{
                            width: `${(pessoa.abertas / maiorCarga) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                        {pessoa.abertas}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {atrasadasDeOutros.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
            Atrasadas na equipe
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {atrasadasDeOutros.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => abrir(task)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <UserAvatar nome={task.responsavel?.nome} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {task.titulo}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {task.responsavel
                          ? primeiroNome(task.responsavel.nome)
                          : "Sem responsável"}
                      </span>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                        {labelPrazo(task.prazo)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
          Atividade dos últimos 14 dias
        </h2>
        <Card>
          <CardContent className="p-5">
            <AtividadeChart data={serie} />
          </CardContent>
        </Card>
      </div>

      {dialogAberto && (
        <TaskDialog
          key={emEdicao?.id ?? "nova"}
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          task={emEdicao}
          profiles={profiles}
          meuId={profile.id}
          souAdmin={souAdmin}
        />
      )}
    </div>
  );
}
