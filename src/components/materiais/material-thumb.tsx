"use client";

/* eslint-disable @next/next/no-img-element -- URLs do Storage; next/image exigiria remotePatterns e reprocessaria o que já é miniatura */

import { useState } from "react";
import { File, FileAudio, FileText } from "lucide-react";
import { extensao, tipoDoArquivo } from "@/lib/materiais";
import type { MaterialWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

type Etapa = "miniatura" | "original" | "icone";

/**
 * Prévia da grade, em cascata: a miniatura JPEG gerada no envio → o próprio
 * arquivo (imagem/vídeo antigo ou sem miniatura) → um ícone com a extensão.
 * Cada `onError` desce um degrau, então HEIC no Chrome ou um .mov que o
 * navegador não toca viram ícone em vez de quadrado quebrado.
 */
export function MaterialThumb({
  material,
  className,
}: {
  material: MaterialWithRelations;
  className?: string;
}) {
  const tipo = tipoDoArquivo(material.mime, material.nome);
  const visual = tipo === "imagem" || tipo === "video";
  const [etapa, setEtapa] = useState<Etapa>(
    material.urlMiniatura ? "miniatura" : visual ? "original" : "icone"
  );

  const classe = cn("size-full object-cover", className);

  if (etapa === "miniatura" && material.urlMiniatura) {
    return (
      <img
        src={material.urlMiniatura}
        alt=""
        loading="lazy"
        decoding="async"
        className={classe}
        onError={() => setEtapa(visual ? "original" : "icone")}
      />
    );
  }

  if (etapa === "original" && tipo === "imagem") {
    return (
      <img
        src={material.url}
        alt=""
        loading="lazy"
        decoding="async"
        className={classe}
        onError={() => setEtapa("icone")}
      />
    );
  }

  if (etapa === "original" && tipo === "video") {
    // `#t=1` faz o Safari mostrar um quadro em vez de um retângulo preto.
    return (
      <video
        src={`${material.url}#t=1`}
        preload="metadata"
        muted
        playsInline
        className={cn(classe, "pointer-events-none")}
        onError={() => setEtapa("icone")}
      />
    );
  }

  const Icone = tipo === "pdf" ? FileText : tipo === "audio" ? FileAudio : File;
  const ext = extensao(material.nome);

  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground",
        className
      )}
    >
      <Icone className="size-7 stroke-[1.5]" />
      {ext && (
        <span className="text-[11px] font-semibold tracking-wide uppercase">{ext}</span>
      )}
    </div>
  );
}
