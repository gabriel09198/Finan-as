"use client";

import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { gerarPixCopiaECola } from "@/lib/pix";
import { formatarReais, type ConfigPix } from "@/lib/tipos";
import { botaoPrimario, botaoSecundario, Icone, Modal } from "./ui";

interface Props {
  config: ConfigPix;
  valor: number;
  descricao: string;
  txid: string;
  onFechar: () => void;
  onJaPaguei: () => Promise<void>;
}

export function ModalPix({ config, valor, descricao, txid, onFechar, onJaPaguei }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const codigo = useMemo(
    () => gerarPixCopiaECola({ ...config, valor, txid }),
    [config, valor, txid],
  );

  async function copiar() {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      await onJaPaguei();
      onFechar();
    } catch {
      setErro("Não foi possível avisar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Pagar com PIX" subtitulo={descricao} onFechar={onFechar}>
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-violet-600/20 p-5 text-white shadow-[0_0_40px_-12px_rgba(34,211,238,.6)]">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-xl" />
        <div className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-cyan-400/10 blur-xl" />
        <p className="relative text-xs font-medium uppercase tracking-wider text-cyan-200/70">
          Valor a pagar
        </p>
        <p className="relative mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums">
          {formatarReais(valor)}
        </p>
        <p className="relative mt-3 truncate text-sm text-white/80">Para {config.nome}</p>
      </div>

      <div className="mt-5 flex justify-center">
        <div className="rounded-2xl bg-white p-4 shadow-[0_0_50px_-10px_rgba(34,211,238,.55)] ring-1 ring-cyan-400/40">
          <QRCodeSVG value={codigo} size={188} level="M" />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Abra o app do seu banco, escolha <strong className="text-zinc-300">PIX › Ler QR Code</strong> ou use o copia e cola.
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            PIX copia e cola
          </span>
          <span className="flex items-center gap-1 truncate text-xs text-zinc-500">
            <Icone nome="chave" className="h-3 w-3" /> {config.chave}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 break-all font-mono text-[11px] leading-relaxed text-cyan-100/70">
          {codigo}
        </p>
      </div>

      {erro && <p className="mt-3 text-sm text-rose-300">{erro}</p>}

      <div className="mt-5 grid gap-2">
        <button
          onClick={copiar}
          className={`${botaoSecundario} py-2.5 ${copiado ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : ""}`}
        >
          <Icone nome={copiado ? "check" : "copiar"} />
          {copiado ? "Código copiado!" : "Copiar código PIX"}
        </button>
        <button onClick={confirmar} disabled={enviando} className={botaoPrimario}>
          <Icone nome="checkCirculo" />
          {enviando ? "Enviando…" : "Já paguei — avisar o cobrador"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        A dívida fica como “aguardando confirmação” até o cobrador confirmar o recebimento.
      </p>
    </Modal>
  );
}
