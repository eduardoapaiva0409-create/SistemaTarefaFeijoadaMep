// Tipos do banco escritos à mão (espelham supabase/migrations/).

export type Papel = "admin" | "colaborador";
export type TaskStatus = "a_fazer" | "em_andamento" | "concluida";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";
export type Recorrencia = "diaria" | "semanal" | "quinzenal" | "mensal";
export type EventoTipo =
  | "comentario"
  | "criacao"
  | "status"
  | "responsavel"
  | "prazo"
  | "prioridade";

export type Profile = {
  id: string;
  nome: string;
  email: string | null;
  cargo: string | null;
  papel: Papel;
  ativo: boolean;
  created_at: string;
};

/** Resumo de perfil que vem embedado nas tarefas via PostgREST. */
export type ProfileRef = Pick<Profile, "id" | "nome" | "cargo">;

export type TaskItem = {
  id: string;
  task_id: string;
  texto: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
};

export type TaskEvent = {
  id: string;
  task_id: string;
  autor_id: string | null;
  tipo: EventoTipo;
  texto: string | null;
  de: string | null;
  para: string | null;
  created_at: string;
  autor?: ProfileRef | null;
};

export type Task = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: Prioridade;
  responsavel_id: string | null;
  criado_por: string | null;
  prazo: string | null;
  concluida_em: string | null;
  ordem: number;
  recorrencia: Recorrencia | null;
  recorrencia_origem_id: string | null;
  proxima_gerada: boolean;
  created_at: string;
  updated_at: string;
};

/** Tarefa com os embeds que a UI consome (ver TASK_SELECT em lib/tasks.ts). */
export type TaskWithRelations = Task & {
  responsavel: ProfileRef | null;
  autor: ProfileRef | null;
  task_items: Pick<TaskItem, "id" | "concluido">[];
};
