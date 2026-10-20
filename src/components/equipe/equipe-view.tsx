"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SETOR_LABELS, SETOR_ORDER, plural, primeiroNome } from "@/lib/format";
import type { EquipeMembro, MembroFuncao, Setor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SetorSelo } from "@/components/equipe/setor-icone";
import { SetorDialog, type CamposMembro } from "@/components/equipe/setor-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";

type Organograma = Record<Setor, Record<MembroFuncao, EquipeMembro[]>>;

/** A Coordenação coordena as outras frentes: fica em cima, de largura cheia. */
const SETOR_DO_TOPO: Setor = "coordenacao";
const FRENTES = SETOR_ORDER.filter((s) => s !== SETOR_DO_TOPO);

/** Avatares no card antes do "+N". */
const MAX_PILHA = 3;

/** Agrupa por setor e função, na ordem de inclusão. */
function montarOrganograma(membros: EquipeMembro[]): Organograma {
  const organograma = Object.fromEntries(
    SETOR_ORDER.map((s) => [s, { coordenacao: [], apoio: [] }])
  ) as unknown as Organograma;
  // O otimista entra no fim da lista e a reinclusão do "Desfazer" volta com
  // a data original — a ordem sai daqui, não da posição no array.
  const ordenados = [...membros].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  for (const membro of ordenados) {
    organograma[membro.setor]?.[membro.funcao]?.push(membro);
  }
  return organograma;
}

/**
 * Equipe: o organograma da organização. Não é cadastro de acesso (isso é a
 * tela Acessos) — é só quem participa, por setor, em coordenação e apoio.
 */
export function EquipeView({
  membros: membrosIniciais,
  meuId,
  souAdmin,
}: {
  membros: EquipeMembro[];
  meuId: string;
  souAdmin: boolean;
}) {
  const router = useRouter();

  // Espelho local para a vaga preenchida aparecer na hora — mesmo padrão do
  // tasks-view: ajuste durante o render, não num efeito.
  const [membros, setMembros] = useState(membrosIniciais);
  const [ultimosDoServidor, setUltimosDoServidor] = useState(membrosIniciais);
  if (membrosIniciais !== ultimosDoServidor) {
    setUltimosDoServidor(membrosIniciais);
    setMembros(membrosIniciais);
  }

  const [setorAberto, setSetorAberto] = useState<Setor | null>(null);

  const organograma = useMemo(() => montarOrganograma(membros), [membros]);
  const semCoordenacao = SETOR_ORDER.filter(
    (s) => organograma[s].coordenacao.length === 0
  ).length;

  async function adicionar(setor: Setor, funcao: MembroFuncao, nome: string) {
    // O id nasce aqui para a linha otimista e a do banco serem a mesma.
    const novo: EquipeMembro = {
      id: crypto.randomUUID(),
      nome,
      setor,
      funcao,
      criado_por: meuId,
      created_at: new Date().toISOString(),
    };
    setMembros((atual) => [...atual, novo]);

    const supabase = createClient();
    const { error } = await supabase.from("equipe_membros").insert({
      id: novo.id,
      nome,
      setor,
      funcao,
      criado_por: meuId,
    });

    if (error) {
      setMembros((atual) => atual.filter((m) => m.id !== novo.id));
      toast.error(`Não foi possível incluir ${nome}`, {
        description: error.message,
      });
      return;
    }
    router.refresh();
  }

  async function atualizar(membro: EquipeMembro, campos: CamposMembro) {
    const anterior = membros;
    setMembros((atual) =>
      atual.map((m) => (m.id === membro.id ? { ...m, ...campos } : m))
    );

    const supabase = createClient();
    const { data, error } = await supabase
      .from("equipe_membros")
      .update(campos)
      .eq("id", membro.id)
      .select("id");

    if (error || !data?.length) {
      setMembros(anterior);
      toast.error("Não foi possível salvar", {
        description: error?.message ?? "Alguém já tinha tirado essa pessoa da equipe.",
      });
      return;
    }

    // Trocar de setor tira a pessoa da tela aberta — o toast diz para onde foi.
    if (campos.setor) {
      toast.success(`${primeiroNome(membro.nome)} foi para ${SETOR_LABELS[campos.setor]}`);
    }
    router.refresh();
  }

  async function tirar(membro: EquipeMembro) {
    setMembros((atual) => atual.filter((m) => m.id !== membro.id));

    const supabase = createClient();
    // Sem permissão o RLS não dá erro, só não apaga — o `select` conta.
    const { data, error } = await supabase
      .from("equipe_membros")
      .delete()
      .eq("id", membro.id)
      .select("id");

    if (error || !data?.length) {
      setMembros((atual) => [...atual, membro]);
      toast.error("Não foi possível tirar da equipe", {
        description:
          error?.message ?? "Só quem incluiu a pessoa ou um admin pode tirá-la.",
      });
      return;
    }

    toast.success(`${membro.nome} saiu da equipe`, {
      action: { label: "Desfazer", onClick: () => devolver(membro) },
    });
    router.refresh();
  }

  /** O "Desfazer": volta com o mesmo id e a mesma data, no mesmo lugar. */
  async function devolver(membro: EquipeMembro) {
    setMembros((atual) => [...atual, membro]);

    const supabase = createClient();
    const { error } = await supabase.from("equipe_membros").insert(membro);

    if (error) {
      setMembros((atual) => atual.filter((m) => m.id !== membro.id));
      toast.error(`Não foi possível devolver ${membro.nome}`, {
        description: error.message,
      });
      return;
    }
    router.refresh();
  }

  const descricao = [
    membros.length > 0
      ? `${plural(membros.length, "pessoa", "pessoas")} na organização, setor por setor`
      : "Quem faz parte da organização, setor por setor",
    semCoordenacao > 0 &&
      plural(semCoordenacao, "setor sem coordenação", "setores sem coordenação"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader title="Equipe" description={`${descricao}.`} />

      <SetorCard
        setor={SETOR_DO_TOPO}
        grupos={organograma[SETOR_DO_TOPO]}
        largo
        onAbrir={() => setSetorAberto(SETOR_DO_TOPO)}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
          Setores
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FRENTES.map((setor) => (
            <SetorCard
              key={setor}
              setor={setor}
              grupos={organograma[setor]}
              onAbrir={() => setSetorAberto(setor)}
            />
          ))}
        </div>
      </section>

      {setorAberto && (
        <SetorDialog
          key={setorAberto}
          setor={setorAberto}
          grupos={organograma[setorAberto]}
          podeTirar={(m) => souAdmin || m.criado_por === meuId}
          onOpenChange={(aberto) => !aberto && setSetorAberto(null)}
          onAdicionar={(funcao, nome) => adicionar(setorAberto, funcao, nome)}
          onAtualizar={atualizar}
          onTirar={tirar}
        />
      )}
    </div>
  );
}

function SetorCard({
  setor,
  grupos,
  largo = false,
  onAbrir,
}: {
  setor: Setor;
  grupos: Record<MembroFuncao, EquipeMembro[]>;
  /** O card do topo: as duas linhas lado a lado a partir do tablet. */
  largo?: boolean;
  onAbrir: () => void;
}) {
  const total = grupos.coordenacao.length + grupos.apoio.length;

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
      className="cursor-pointer gap-3.5 px-4 outline-none transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.08)] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-center gap-3">
        <SetorSelo setor={setor} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight">
            {SETOR_LABELS[setor]}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {total > 0 ? plural(total, "pessoa", "pessoas") : "Ninguém ainda"}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
      </div>

      <dl className={cn("grid grid-cols-1 gap-2", largo && "sm:grid-cols-2 sm:gap-6")}>
        <Linha rotulo="Coordenação" membros={grupos.coordenacao} nomeCompleto />
        <Linha rotulo="Apoio" membros={grupos.apoio} />
      </dl>
    </Card>
  );
}

function Linha({
  rotulo,
  membros,
  nomeCompleto = false,
}: {
  rotulo: string;
  membros: EquipeMembro[];
  /** Coordenação costuma ser uma ou duas pessoas: cabe o nome inteiro. */
  nomeCompleto?: boolean;
}) {
  const visiveis = membros.slice(0, MAX_PILHA);
  const resto = membros.length - visiveis.length;

  return (
    <div className="flex min-h-6 min-w-0 items-center gap-3">
      <dt className="w-[5.5rem] shrink-0 text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        {membros.length === 0 ? (
          <>
            <span className="size-6 shrink-0 rounded-full border border-dashed border-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/80">Vaga em aberto</span>
          </>
        ) : (
          <>
            <span className="flex shrink-0 gap-1">
              {visiveis.map((m) => (
                <UserAvatar key={m.id} nome={m.nome} size="sm" />
              ))}
              {resto > 0 && (
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums text-muted-foreground">
                  +{resto}
                </span>
              )}
            </span>
            <span className="min-w-0 truncate text-sm">
              {membros
                .map((m) => (nomeCompleto ? m.nome : primeiroNome(m.nome)))
                .join(", ")}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}
