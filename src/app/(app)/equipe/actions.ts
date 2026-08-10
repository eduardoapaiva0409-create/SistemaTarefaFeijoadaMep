"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Funcao, Papel, Setor } from "@/lib/types";

type Resultado = { ok: true } | { ok: false; erro: string };

/** Toda ação daqui mexe no Auth — exige admin, verificado no servidor. */
async function exigirAdmin(): Promise<string | null> {
  const eu = await getCurrentProfile();
  if (!eu) return "Sessão expirada. Entre novamente.";
  if (eu.papel !== "admin") return "Só administradores podem gerenciar a equipe.";
  return null;
}

function mensagem(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro);
  if (texto.includes("already been registered")) {
    return "Já existe um acesso com esse e-mail.";
  }
  if (texto.toLowerCase().includes("password")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return texto;
}

export async function criarPessoa(input: {
  nome: string;
  /** Ignorados quando temAcesso = false — geramos credenciais internas. */
  email: string | null;
  senha: string | null;
  temAcesso: boolean;
  funcao: Funcao | null;
  papel: Papel;
  setor: Setor | null;
  fotoUrl: string | null;
}): Promise<Resultado> {
  const negado = await exigirAdmin();
  if (negado) return { ok: false, erro: negado };

  // Pessoa "só registrada": precisa de uma linha em auth.users por causa da FK
  // de profiles, mas ninguém vai usar esse login — gera credenciais aqui, não
  // pede pro admin inventar e-mail de gente que não vai acessar o sistema.
  const email = input.temAcesso
    ? input.email!.trim()
    : `sem-acesso.${crypto.randomUUID()}@feijoada.local`;
  const senha = input.temAcesso ? input.senha! : crypto.randomUUID();

  try {
    const admin = createAdminClient();
    // O trigger handle_new_user lê esse metadata e monta o perfil.
    const { error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome: input.nome.trim(),
        funcao: input.funcao,
        papel: input.papel,
        setor: input.setor,
        foto_url: input.fotoUrl,
        tem_acesso: input.temAcesso,
      },
    });
    if (error) return { ok: false, erro: mensagem(error) };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function redefinirSenha(
  userId: string,
  senha: string
): Promise<Resultado> {
  const negado = await exigirAdmin();
  if (negado) return { ok: false, erro: negado };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: senha,
    });
    if (error) return { ok: false, erro: mensagem(error) };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }

  return { ok: true };
}

export async function excluirPessoa(userId: string): Promise<Resultado> {
  const negado = await exigirAdmin();
  if (negado) return { ok: false, erro: negado };

  const eu = await getCurrentProfile();
  if (eu?.id === userId) {
    return { ok: false, erro: "Você não pode excluir o próprio acesso." };
  }

  try {
    const admin = createAdminClient();
    // O profile cai junto (FK on delete cascade); as tarefas ficam, só
    // perdem o vínculo (responsavel_id vira null).
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, erro: mensagem(error) };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }

  revalidatePath("/equipe");
  return { ok: true };
}
