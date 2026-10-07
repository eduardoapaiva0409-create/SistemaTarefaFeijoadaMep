import { createClient } from "@/lib/supabase/client";

export const MATERIAIS_BUCKET = "materiais";

export const MATERIAL_SELECT = `
  *,
  autor:profiles!enviado_por (id, nome, funcao, foto_url)
`;

export type TipoArquivo = "imagem" | "video" | "audio" | "pdf" | "outro";

const EXTENSOES: Record<Exclude<TipoArquivo, "outro">, string[]> = {
  imagem: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "svg"],
  video: ["mp4", "mov", "m4v", "webm", "avi", "mkv"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "opus"],
  pdf: ["pdf"],
};

export function extensao(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  return ponto > 0 ? nome.slice(ponto + 1).toLowerCase() : "";
}

/**
 * Pelo mime e, na falta dele, pela extensão — alguns navegadores mandam o
 * mime vazio (.heic no Chrome, .mov no Windows).
 */
export function tipoDoArquivo(mime: string | null, nome: string): TipoArquivo {
  if (mime?.startsWith("image/")) return "imagem";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  const ext = extensao(nome);
  for (const [tipo, lista] of Object.entries(EXTENSOES)) {
    if (lista.includes(ext)) return tipo as TipoArquivo;
  }
  return "outro";
}

const DECIMAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** 1_300_000 → "1,3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ["KB", "MB", "GB", "TB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${DECIMAL.format(valor)} ${unidades[i]}`;
}

/**
 * Nome que o Storage aceita sem surpresa: sem acento, sem espaço, sem
 * símbolo. O nome original (com acento) fica na tabela e volta no download.
 */
function nomeSeguro(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  return limpo.slice(-100) || "arquivo";
}

// ── Envio ──────────────────────────────────────────────────────────────────

/**
 * Upload com progresso. O `upload()` do supabase-js não informa progresso, e
 * um vídeo de 40 MB sem barra parece travado — então é o mesmo POST que ele
 * faz (FormData com `cacheControl` + o arquivo), via XHR.
 */
function enviarComProgresso(
  arquivo: File,
  caminho: string,
  token: string,
  onProgresso: (fracao: number) => void
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${MATERIAIS_BUCKET}/${caminho}`;
  const corpo = new FormData();
  corpo.append("cacheControl", "3600");
  corpo.append("", arquivo);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(mensagemDeErro(xhr)));
    };
    xhr.onerror = () => reject(new Error("A conexão caiu durante o envio."));
    xhr.send(corpo);
  });
}

function mensagemDeErro(xhr: XMLHttpRequest): string {
  let mensagem = "";
  try {
    mensagem = (JSON.parse(xhr.responseText) as { message?: string }).message ?? "";
  } catch {
    // corpo não-JSON (proxy, timeout) — fica a mensagem genérica abaixo
  }
  if (xhr.status === 413 || /maximum allowed size|too large/i.test(mensagem)) {
    return "Arquivo acima do limite do Storage. No plano gratuito do Supabase o máximo é 50 MB por arquivo.";
  }
  if (/bucket not found/i.test(mensagem)) {
    return "O bucket “materiais” não existe — falta rodar a migration 0009.";
  }
  if (xhr.status === 403 || /row-level security/i.test(mensagem)) {
    return "Sem permissão para enviar. Entre de novo e tente outra vez.";
  }
  return mensagem || `O envio falhou (HTTP ${xhr.status}).`;
}

const LADO_MINIATURA = 480;

async function desenhar(
  fonte: CanvasImageSource,
  largura: number,
  altura: number
): Promise<Blob | null> {
  if (!largura || !altura) return null;
  const escala = Math.min(1, LADO_MINIATURA / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(largura * escala));
  canvas.height = Math.max(1, Math.round(altura * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG não tem transparência: PNG de logo sobre fundo branco, não preto.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}

/** Um quadro do começo do vídeo (1s, para fugir do fade do preto). */
function quadroDoVideo(arquivo: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const video = document.createElement("video");
    let terminou = false;

    const terminar = (blob: Blob | null) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(limite);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    // Codec que o navegador não decodifica não pode segurar o envio.
    const limite = setTimeout(() => terminar(null), 6_000);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(1, video.duration / 2)
        : 0;
    };
    video.onseeked = async () => {
      terminar(await desenhar(video, video.videoWidth, video.videoHeight));
    };
    video.onerror = () => terminar(null);
    video.src = url;
  });
}

async function gerarMiniatura(arquivo: File): Promise<Blob | null> {
  try {
    const tipo = tipoDoArquivo(arquivo.type, arquivo.name);
    if (tipo === "video") return await quadroDoVideo(arquivo);
    if (tipo !== "imagem") return null;
    const bitmap = await createImageBitmap(arquivo);
    const blob = await desenhar(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    return blob;
  } catch {
    return null; // HEIC no Chrome, SVG, arquivo corrompido: segue sem miniatura
  }
}

/**
 * Sobe o arquivo (com progresso) e a miniatura em paralelo e registra na
 * tabela. Se o registro falhar, apaga o que subiu — arquivo sem linha na
 * tabela é espaço ocupado que ninguém vê.
 */
export async function enviarMaterial({
  arquivo,
  pastaId,
  autorId,
  onProgresso,
}: {
  arquivo: File;
  pastaId: string | null;
  autorId: string;
  onProgresso: (fracao: number) => void;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre de novo.");

  const pasta = crypto.randomUUID();
  const caminho = `${pasta}/${nomeSeguro(arquivo.name)}`;

  const enviarMiniatura = async () => {
    const blob = await gerarMiniatura(arquivo);
    if (!blob) return null;
    const caminhoMiniatura = `${pasta}/miniatura.jpg`;
    const { error } = await supabase.storage
      .from(MATERIAIS_BUCKET)
      .upload(caminhoMiniatura, blob, { contentType: "image/jpeg" });
    return error ? null : caminhoMiniatura;
  };

  const [envio, resultadoMiniatura] = await Promise.allSettled([
    enviarComProgresso(arquivo, caminho, session.access_token, onProgresso),
    enviarMiniatura(),
  ]);
  const miniatura =
    resultadoMiniatura.status === "fulfilled" ? resultadoMiniatura.value : null;

  if (envio.status === "rejected") {
    if (miniatura) await supabase.storage.from(MATERIAIS_BUCKET).remove([miniatura]);
    throw envio.reason;
  }

  const { error } = await supabase.from("materiais").insert({
    pasta_id: pastaId,
    nome: arquivo.name.slice(0, 200),
    caminho,
    miniatura,
    mime: arquivo.type || null,
    tamanho: arquivo.size,
    enviado_por: autorId,
  });

  if (error) {
    await supabase.storage
      .from(MATERIAIS_BUCKET)
      .remove([caminho, miniatura].filter((c): c is string => Boolean(c)));
    throw new Error(error.message);
  }
}
