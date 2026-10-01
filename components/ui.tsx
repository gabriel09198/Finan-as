"use client";

import { useEffect } from "react";
import { rotuloStatus, type StatusDivida } from "@/lib/tipos";

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-400/10";

export const labelCls =
  "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500";

export const botaoPrimario =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px_rgba(34,211,238,.7)] transition hover:shadow-[0_0_32px_-4px_rgba(167,139,250,.8)] hover:brightness-110 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50";

export const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-zinc-200 backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/[0.08] hover:text-white active:scale-[.98] disabled:pointer-events-none disabled:opacity-50";

export const botaoFantasma =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50";

export const painel =
  "relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,.06),0_24px_48px_-24px_rgba(0,0,0,.9)] backdrop-blur-xl";

/** Rótulo pequeno estilo "HUD" para títulos de seção. */
export function Rotulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 ${className}`}
    >
      <span className="h-px w-4 bg-gradient-to-r from-cyan-400 to-transparent" />
      {children}
    </p>
  );
}

/* ---------- Ícones (traço, 24x24) ---------- */

const icones = {
  carteira:
    "M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z",
  relogio: "M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  check: "M20 6 9 17l-5-5",
  checkCirculo: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  usuarios:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  mais: "M12 5v14M5 12h14",
  busca: "M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4",
  chave:
    "m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  lixeira: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  desfazer: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13",
  copiar:
    "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  x: "M18 6 6 18M6 6l12 12",
  seta: "m6 9 6 6 6-6",
  esquerda: "m15 18-6-6 6-6",
  direita: "m9 18 6-6-6-6",
  calendario: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  alerta:
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01",
  email: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM22 6l-10 7L2 6",
  escudo: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  raio: "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  sobe: "M7 17 17 7M7 7h10v10",
  desce: "M7 7l10 10M17 7v10H7",
  grafico: "M3 3v18h18M7 16v-5M12 16V8M17 16v-8",
  lapis: "M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
  cobranca: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  // categorias
  comida: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
  casa: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10",
  carro:
    "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 6H7.3a2 2 0 0 0-1.6.8L3 10.5 2.1 11A2 2 0 0 0 1 12.8V16c0 .6.4 1 1 1h2M7 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
  coracao:
    "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  livro: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  jogo: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.59L2 15a3 3 0 0 0 3 3c1 0 1.6-.5 2.1-1.1L8.5 15h7l1.4 1.9c.5.6 1.1 1.1 2.1 1.1a3 3 0 0 0 3-3l-.7-6.41A4 4 0 0 0 17.32 5Z",
  sacola: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  recibo: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8H8M16 12H8M12 16H8",
  maleta: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  notebook: "M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55A1 1 0 0 1 20.38 20H3.62a1 1 0 0 1-.9-1.45L4 16",
  tendencia: "m22 7-8.5 8.5-5-5L2 17M16 7h6v6",
  presente: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
  etiqueta: "M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42ZM7.5 7.5h.01",
} as const;

export type NomeIcone = keyof typeof icones;

export function Icone({ nome, className = "h-4 w-4" }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={icones[nome]} />
    </svg>
  );
}

/* ---------- Componentes ---------- */

export function Logo({ tamanho = "md" }: { tamanho?: "md" | "lg" }) {
  const cls = tamanho === "lg" ? "h-14 w-14 rounded-2xl" : "h-9 w-9 rounded-xl";
  return (
    <span className={`${cls} relative grid shrink-0 place-items-center`}>
      <span className="absolute inset-0 animate-brilho rounded-[inherit] bg-gradient-to-br from-cyan-400 to-violet-500 blur-md" />
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-600" />
      <span className="absolute inset-[1.5px] rounded-[inherit] bg-zinc-950/80" />
      <span className="relative font-mono font-bold text-cyan-300">
        <Icone nome="raio" className={tamanho === "lg" ? "h-6 w-6" : "h-4 w-4"} />
      </span>
    </span>
  );
}

export function Carregando() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400 border-r-violet-500" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-cyan-300/60 [animation-direction:reverse]" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Carregando</p>
      </div>
    </div>
  );
}

const coresStatus: Record<StatusDivida, string> = {
  pendente: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  aguardando_confirmacao: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  pago: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
};

const pontoStatus: Record<StatusDivida, string> = {
  pendente: "bg-amber-400 shadow-[0_0_6px] shadow-amber-400",
  aguardando_confirmacao: "bg-sky-400 shadow-[0_0_6px] shadow-sky-400 animate-pulse",
  pago: "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400",
};

export function BadgeStatus({ status, vencida }: { status: StatusDivida; vencida?: boolean }) {
  const cor = vencida ? "bg-rose-400/10 text-rose-300 ring-rose-400/25" : coresStatus[status];
  const ponto = vencida ? "bg-rose-400 shadow-[0_0_6px] shadow-rose-400" : pontoStatus[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${cor}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ponto}`} />
      {vencida ? "Vencida" : rotuloStatus[status]}
    </span>
  );
}

const temasCard = {
  vermelho: { chip: "text-rose-300 bg-rose-400/10 ring-rose-400/30", brilho: "bg-rose-500" },
  azul: { chip: "text-sky-300 bg-sky-400/10 ring-sky-400/30", brilho: "bg-sky-500" },
  verde: { chip: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/30", brilho: "bg-emerald-500" },
  roxo: { chip: "text-violet-300 bg-violet-400/10 ring-violet-400/30", brilho: "bg-violet-500" },
  ciano: { chip: "text-cyan-300 bg-cyan-400/10 ring-cyan-400/30", brilho: "bg-cyan-500" },
};

export function Card({
  titulo,
  valor,
  icone,
  tema,
  detalhe,
}: {
  titulo: string;
  valor: string;
  icone: NomeIcone;
  tema: keyof typeof temasCard;
  detalhe?: string;
}) {
  const t = temasCard[tema];
  return (
    <div className={`${painel} group overflow-hidden p-5`}>
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40 ${t.brilho}`}
      />
      <div className="relative flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{titulo}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ring-1 ring-inset ${t.chip}`}>
          <Icone nome={icone} />
        </span>
      </div>
      <p className="relative mt-3 font-mono text-2xl font-semibold tracking-tight text-white tabular-nums">
        {valor}
      </p>
      {detalhe && <p className="relative mt-1 text-xs text-zinc-500">{detalhe}</p>}
    </div>
  );
}

const coresAvatar = [
  "from-rose-400 to-fuchsia-500",
  "from-amber-300 to-orange-500",
  "from-emerald-300 to-teal-500",
  "from-sky-400 to-indigo-500",
  "from-violet-400 to-purple-600",
  "from-cyan-300 to-blue-500",
];

export function Avatar({ nome, tamanho = "h-10 w-10" }: { nome: string; tamanho?: string }) {
  const partes = nome.trim().split(/\s+/);
  const iniciais = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)![0] : "")).toUpperCase();
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`${tamanho} grid shrink-0 place-items-center rounded-full bg-gradient-to-br p-[1.5px] ${coresAvatar[h % coresAvatar.length]}`}
    >
      <span className="grid h-full w-full place-items-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
        {iniciais || "?"}
      </span>
    </span>
  );
}

export function Modal({
  titulo,
  subtitulo,
  onFechar,
  children,
  largura = "max-w-md",
}: {
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className={`animate-sobe relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0a0f1c]/95 p-6 shadow-[0_0_80px_-20px_rgba(34,211,238,.35)] sm:rounded-3xl ${largura}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-zinc-400">{subtitulo}</p>}
          </div>
          <button onClick={onFechar} className={botaoFantasma + " -mr-2 -mt-1"} aria-label="Fechar">
            <Icone nome="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Vazio({
  titulo,
  texto,
  icone = "checkCirculo",
}: {
  titulo: string;
  texto: string;
  icone?: NomeIcone;
}) {
  return (
    <div className={`${painel} flex flex-col items-center px-6 py-14 text-center`}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/30 shadow-[0_0_30px_-8px_rgba(34,211,238,.6)]">
        <Icone nome={icone} className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-white">{titulo}</p>
      <p className="mt-1 max-w-xs text-sm text-zinc-400">{texto}</p>
    </div>
  );
}

/** Alternador segmentado (abas). */
export function Segmentos<T extends string>({
  opcoes,
  valor,
  onChange,
  className = "",
}: {
  opcoes: readonly (readonly [T, string])[];
  valor: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm ${className}`}
    >
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 rounded-lg px-4 py-1.5 font-medium transition ${
            valor === v
              ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_0_16px_-6px_rgba(34,211,238,.8)]"
              : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
