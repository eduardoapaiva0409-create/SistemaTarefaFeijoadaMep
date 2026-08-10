"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { criarPessoa, redefinirSenha } from "@/app/(app)/equipe/actions";
import { createClient } from "@/lib/supabase/client";
import {
  FUNCAO_LABELS,
  FUNCAO_ORDER,
  PAPEL_LABELS,
  SETOR_LABELS,
  SETOR_ORDER,
} from "@/lib/format";
import type { Funcao, Papel, Profile, Setor } from "@/lib/types";
import { Segmented } from "@/components/segmented";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Base UI não aceita "" como valor de item — sentinela para "nenhum". */
const SEM_SETOR = "__none__";
const SEM_FUNCAO = "__none__";

const PAPEL_ITEMS = (["colaborador", "admin"] as Papel[]).map((v) => ({
  value: v,
  label: PAPEL_LABELS[v],
}));

const FUNCAO_ITEMS = [
  { value: SEM_FUNCAO, label: "Sem função" },
  ...FUNCAO_ORDER.map((v) => ({ value: v, label: FUNCAO_LABELS[v] })),
];

const SETOR_ITEMS = [
  { value: SEM_SETOR, label: "Sem setor" },
  ...SETOR_ORDER.map((v) => ({ value: v, label: SETOR_LABELS[v] })),
];

const ATIVO_ITEMS = [
  { value: "sim", label: "Ativo" },
  { value: "nao", label: "Inativo" },
];

const ACESSO_ITEMS = [
  { value: "sim" as const, label: "Tem login" },
  { value: "nao" as const, label: "Só registro" },
];

export function PessoaDialog({
  open,
  onOpenChange,
  pessoa,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoa: Profile | null;
}) {
  const router = useRouter();
  const editando = pessoa !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [email, setEmail] = useState(pessoa?.email ?? "");
  const [senha, setSenha] = useState("");
  const [funcao, setFuncao] = useState<string>(pessoa?.funcao ?? SEM_FUNCAO);
  const [setor, setSetor] = useState(pessoa?.setor ?? SEM_SETOR);
  const [papel, setPapel] = useState<Papel>(pessoa?.papel ?? "colaborador");
  const [ativo, setAtivo] = useState(pessoa?.ativo === false ? "nao" : "sim");
  const [temAcesso, setTemAcesso] = useState<"sim" | "nao">(
    pessoa?.tem_acesso === false ? "nao" : "sim"
  );
  const [fotoUrl, setFotoUrl] = useState<string | null>(pessoa?.foto_url ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    setEnviandoFoto(true);
    const supabase = createClient();
    const extensao = arquivo.name.split(".").pop() ?? "jpg";
    const caminho = `${crypto.randomUUID()}.${extensao}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(caminho, arquivo, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar foto", { description: error.message });
      setEnviandoFoto(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    setFotoUrl(data.publicUrl);
    setEnviandoFoto(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);

    if (!editando) {
      const resultado = await criarPessoa({
        nome,
        email: temAcesso === "sim" ? email : null,
        senha: temAcesso === "sim" ? senha : null,
        temAcesso: temAcesso === "sim",
        funcao: funcao === SEM_FUNCAO ? null : (funcao as Funcao),
        papel: temAcesso === "sim" ? papel : "colaborador",
        setor: setor === SEM_SETOR ? null : (setor as Setor),
        fotoUrl,
      });
      if (!resultado.ok) {
        toast.error("Não foi possível criar a pessoa", {
          description: resultado.erro,
        });
        setSalvando(false);
        return;
      }
      toast.success(
        temAcesso === "sim" ? "Acesso criado" : "Pessoa registrada",
        {
          description:
            temAcesso === "sim"
              ? `${nome} já pode entrar com esse e-mail e senha.`
              : `${nome} está no time, sem login no sistema.`,
        }
      );
    } else {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: nome.trim(),
          funcao: funcao === SEM_FUNCAO ? null : funcao,
          setor: setor === SEM_SETOR ? null : setor,
          foto_url: fotoUrl,
          papel,
          ativo: ativo === "sim",
        })
        .eq("id", pessoa.id);

      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        setSalvando(false);
        return;
      }

      if (senha && pessoa.tem_acesso) {
        const resultado = await redefinirSenha(pessoa.id, senha);
        if (!resultado.ok) {
          toast.error("Dados salvos, mas a senha não mudou", {
            description: resultado.erro,
          });
          setSalvando(false);
          onOpenChange(false);
          router.refresh();
          return;
        }
      }
      toast.success("Pessoa atualizada");
    }

    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Função, setor, permissão e situação do acesso."
              : "Registra a pessoa no time — login é opcional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Foto</Label>
            <div className="flex items-center gap-3">
              <UserAvatar nome={nome} fotoUrl={fotoUrl} size="lg" />
              <div className="flex flex-col items-start gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={enviandoFoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {enviandoFoto
                    ? "Enviando…"
                    : fotoUrl
                      ? "Trocar foto"
                      : "Adicionar foto"}
                </Button>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remover foto
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFotoChange}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: João da Silva"
              required
              autoFocus
            />
          </div>

          {!editando && (
            <div className="grid gap-2 rounded-lg border border-input bg-muted/30 p-3">
              <Label>Acesso ao sistema</Label>
              <Segmented
                options={ACESSO_ITEMS}
                value={temAcesso}
                onChange={setTemAcesso}
              />
              <p className="text-xs text-muted-foreground">
                {temAcesso === "sim"
                  ? "Essa pessoa entra com e-mail e senha próprios."
                  : "Sem login — fica registrada só com nome, função, setor e foto. Alguns participantes não vão usar o sistema, e tudo bem."}
              </p>
            </div>
          )}

          {editando && !pessoa.tem_acesso && (
            <p className="text-xs text-muted-foreground">
              Essa pessoa não tem login no sistema — só está registrada.
            </p>
          )}

          {(!editando ? temAcesso === "sim" : pessoa.tem_acesso) && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex.: joao@escalada.com.br"
                  required={!editando}
                  disabled={editando}
                />
                {editando && (
                  <p className="text-xs text-muted-foreground">
                    O e-mail de login não muda por aqui.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="senha">
                  {editando ? "Nova senha" : "Senha provisória *"}
                </Label>
                <Input
                  id="senha"
                  type="text"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Ex.: escalada2026"
                  minLength={6}
                  required={!editando}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  {editando
                    ? "Deixe em branco para manter a senha atual."
                    : "Mínimo de 6 caracteres. Passe para a pessoa trocar depois."}
                </p>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Função</Label>
              <Select
                items={FUNCAO_ITEMS}
                value={funcao}
                onValueChange={(v) => setFuncao(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNCAO_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Setor</Label>
              <Select
                items={SETOR_ITEMS}
                value={setor}
                onValueChange={(v) => setSetor(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETOR_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(!editando ? temAcesso === "sim" : pessoa.tem_acesso) && (
              <div className="grid gap-2">
                <Label>Permissão</Label>
                <Select
                  items={PAPEL_ITEMS}
                  value={papel}
                  onValueChange={(v) => setPapel(v as Papel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEL_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Organizador(a) edita qualquer tarefa e gerencia o time.
                </p>
              </div>
            )}

            {editando && (
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select
                  items={ATIVO_ITEMS}
                  value={ativo}
                  onValueChange={(v) => setAtivo(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATIVO_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inativo some da lista de responsáveis.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
