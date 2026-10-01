"use client";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { AreaProtegida } from "@/components/AreaProtegida";
import { useAuth } from "@/components/AuthProvider";
import { ModalPix } from "@/components/ModalPix";
import { Observacoes } from "@/components/PainelCompras";
import {
  BadgeStatus,
  botaoFantasma,
  botaoPrimario,
  Carregando,
  Icone,
  painel,
  Vazio,
} from "@/components/ui";
import { db } from "@/lib/firebase";
import { ouvirMinhasDividas } from "@/lib/minhasDividas";
import {
  estaVencida,
  formatarData,
  formatarReais,
  type ConfigPix,
  type Divida,
} from "@/lib/tipos";

export default function MinhasDividasPage() {
  return (
    <AreaProtegida papel="todos">
      <MinhasDividas />
    </AreaProtegida>
  );
}

interface Pagamento {
  dividas: Divida[];
  valor: number;
  descricao: string;
  txid: string;
}

function MinhasDividas() {
  const { usuario } = useAuth();
  const [dividas, setDividas] = useState<Divida[] | null>(null);
  const [config, setConfig] = useState<ConfigPix | null>(null);
  const [erro, setErro] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);

  const email = usuario?.email?.toLowerCase() ?? "";
  const uid = usuario?.uid ?? "";

  useEffect(() => {
    if (!email || !uid) return;
    const pararDividas = ouvirMinhasDividas(email, uid, setDividas, () =>
      setErro("Não foi possível carregar suas dívidas."),
    );
    const pararConfig = onSnapshot(doc(db(), "config", "pix"), (snap) =>
      setConfig(snap.exists() ? (snap.data() as ConfigPix) : null),
    );
    return () => {
      pararDividas();
      pararConfig();
    };
  }, [email, uid]);

  const compras = useMemo(() => {
    const mapa = new Map<string, Divida[]>();
    for (const d of dividas ?? []) {
      if (d.pedidoId) mapa.set(d.pedidoId, [...(mapa.get(d.pedidoId) ?? []), d]);
    }
    return [...mapa.entries()].map(([id, ps]) => ({
      id,
      parcelas: ps.sort((a, b) => (a.parcela ?? 0) - (b.parcela ?? 0)),
    }));
  }, [dividas]);

  const resumo = useMemo(() => {
    const lista = dividas ?? [];
    const pendentes = lista.filter((d) => d.status === "pendente");
    const soma = (ds: Divida[]) => ds.reduce((t, d) => t + d.valor, 0);
    return {
      pendentes,
      vencidas: pendentes.filter(estaVencida).length,
      totalPendente: soma(pendentes),
      totalAguardando: soma(lista.filter((d) => d.status === "aguardando_confirmacao")),
      totalPago: soma(lista.filter((d) => d.status === "pago")),
    };
  }, [dividas]);

  async function informarPagamento(ds: Divida[]) {
    const batch = writeBatch(db());
    for (const d of ds) {
      batch.update(doc(db(), "dividas", d.id), {
        status: "aguardando_confirmacao",
        informadoPagoEm: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  if (erro) return <p className="rounded-xl bg-rose-500/10 p-4 text-rose-300">{erro}</p>;
  if (!dividas) return <Carregando />;

  const primeiroNome = usuario?.displayName?.split(" ")[0];

  return (
    <div className="animate-entra space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋
        </h1>
        <p className="mt-1 text-zinc-500">Acompanhe e pague suas dívidas por aqui.</p>
      </div>

      {/* Destaque principal */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/100/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400">Total em aberto</p>
            <p className="mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {formatarReais(resumo.totalPendente)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
              {resumo.pendentes.length === 0
                ? "Nada pendente — tudo em dia!"
                : `${resumo.pendentes.length} ${resumo.pendentes.length === 1 ? "dívida" : "dívidas"} em aberto`}
              {resumo.vencidas > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
                  {resumo.vencidas} vencida{resumo.vencidas > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          {resumo.pendentes.length > 0 && config && (
            <button
              className={botaoPrimario + " px-6 py-3 text-base"}
              onClick={() =>
                setPagamento({
                  dividas: resumo.pendentes,
                  valor: resumo.totalPendente,
                  descricao:
                    resumo.pendentes.length === 1
                      ? resumo.pendentes[0].descricao
                      : `Todas as ${resumo.pendentes.length} dívidas em aberto`,
                  txid:
                    resumo.pendentes.length === 1
                      ? resumo.pendentes[0].id
                      : "TOTAL" + Date.now().toString(36).toUpperCase(),
                })
              }
            >
              <Icone nome="qr" className="h-5 w-5" />
              {resumo.pendentes.length === 1 ? "Pagar com PIX" : "Pagar tudo com PIX"}
            </button>
          )}
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
              Aguardando confirmação
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatarReais(resumo.totalAguardando)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Já pago
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatarReais(resumo.totalPago)}
            </p>
          </div>
        </div>
      </section>

      {!config && resumo.pendentes.length > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-200 ring-1 ring-amber-400/20">
          <Icone nome="alerta" className="h-4 w-4 shrink-0" />
          O cobrador ainda não cadastrou a chave PIX. Volte mais tarde.
        </p>
      )}

      {compras.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Compras em grupo
          </h2>
          {compras.map((c) => (
            <CompraDoDevedor
              key={c.id}
              parcelas={c.parcelas}
              podePagar={!!config}
              onPagar={(d) =>
                setPagamento({ dividas: [d], valor: d.valor, descricao: d.descricao, txid: d.id })
              }
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Histórico
        </h2>
        {dividas.length === 0 ? (
          <Vazio titulo="Nenhuma dívida por aqui" texto="Quando alguém registrar uma cobrança no seu e-mail, ela aparece nesta tela." />
        ) : (
          <ul className={`${painel} divide-y divide-white/[0.05] overflow-hidden`}>
            {dividas.map((d) => {
              const vencida = estaVencida(d);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition hover:bg-white/[0.03] sm:px-6"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      d.status === "pago"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : vencida
                          ? "bg-rose-500/10 text-rose-300"
                          : d.status === "aguardando_confirmacao"
                            ? "bg-sky-400/10 text-sky-300"
                            : "bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    <Icone
                      nome={d.status === "pago" ? "checkCirculo" : d.status === "aguardando_confirmacao" ? "relogio" : "carteira"}
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.descricao}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <BadgeStatus status={d.status} vencida={vencida} />
                      <span className="flex items-center gap-1">
                        <Icone nome="calendario" className="h-3 w-3" />
                        Vence {formatarData(d.vencimento)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-lg font-semibold tabular-nums ${d.status === "pago" ? "text-zinc-400 line-through decoration-1" : ""}`}
                    >
                      {formatarReais(d.valor)}
                    </span>
                    {d.status === "pendente" && config && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20 hover:shadow-[0_0_16px_-4px_rgba(34,211,238,.8)] active:scale-[.98]"
                        onClick={() =>
                          setPagamento({
                            dividas: [d],
                            valor: d.valor,
                            descricao: d.descricao,
                            txid: d.id,
                          })
                        }
                      >
                        <Icone nome="qr" /> Pagar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagamento && config && (
        <ModalPix
          config={config}
          valor={pagamento.valor}
          descricao={pagamento.descricao}
          txid={pagamento.txid}
          onFechar={() => setPagamento(null)}
          onJaPaguei={() => informarPagamento(pagamento.dividas)}
        />
      )}
    </div>
  );
}

function CompraDoDevedor({
  parcelas,
  podePagar,
  onPagar,
}: {
  parcelas: Divida[];
  podePagar: boolean;
  onPagar: (d: Divida) => void;
}) {
  const [verItens, setVerItens] = useState(false);
  const base = parcelas[0];
  const total = base.totalCompra ?? parcelas.reduce((s, d) => s + d.valor, 0);
  const pago = parcelas.filter((d) => d.status === "pago").reduce((s, d) => s + d.valor, 0);
  const proxima = parcelas.find((d) => d.status === "pendente");
  const itens = base.itens ?? [];
  const custos = base.custos ?? [];

  return (
    <div className={`${painel} overflow-hidden p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/30">
            <Icone nome="sacola" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-white">{base.pedidoTitulo}</p>
            <p className="font-mono text-xs text-zinc-500">
              {formatarReais(pago)} pagos de {formatarReais(total)}
            </p>
          </div>
        </div>
        {proxima && podePagar && (
          <button className={botaoPrimario} onClick={() => onPagar(proxima)}>
            <Icone nome="qr" /> Pagar {proxima.parcela}ª parcela · {formatarReais(proxima.valor)}
          </button>
        )}
      </div>

      {/* Linha do tempo das parcelas */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {parcelas.map((d) => {
          const vencida = estaVencida(d);
          const cor =
            d.status === "pago"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : d.status === "aguardando_confirmacao"
                ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                : vencida
                  ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                  : d.id === proxima?.id
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_14px_-4px_rgba(34,211,238,.9)]"
                    : "border-white/10 bg-white/[0.02] text-zinc-500";
          return (
            <div
              key={d.id}
              title={`${d.parcela}ª parcela · ${formatarReais(d.valor)} · vence ${formatarData(d.vencimento)}`}
              className={`min-w-20 flex-1 rounded-xl border px-2 py-2 text-center ${cor}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-wider">
                {d.status === "pago" ? "✓ " : ""}
                {d.parcela}ª
              </p>
              <p className="text-[11px] opacity-80">{d.vencimento ? formatarData(d.vencimento).slice(3) : ""}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>✓ paga</span>
        <span className="text-sky-300">aguardando confirmação</span>
        <span className="text-cyan-200">próxima</span>
        <span className="text-rose-300">vencida</span>
      </div>

      <Observacoes texto={base.pedidoObservacoes} />

      <button className={botaoFantasma + " mt-3 -ml-2"} onClick={() => setVerItens(!verItens)}>
        <Icone nome="recibo" /> {verItens ? "Esconder o que você comprou" : "Ver o que você comprou"}
      </button>
      {verItens && (
        <ul className="mt-2 space-y-1 rounded-2xl border border-white/[0.06] bg-black/20 p-4 font-mono text-xs">
          {itens.map((item, k) => (
            <li key={k} className="flex justify-between gap-3 text-zinc-400">
              <span className="truncate">{item.descricao}</span>
              <span className="text-zinc-200">{formatarReais(item.valor)}</span>
            </li>
          ))}
          {custos.map((c) => (
            <li key={c.descricao} className="flex justify-between gap-3 text-cyan-200/70">
              <span>{c.descricao} (sua parte)</span>
              <span>{formatarReais(c.valor)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5 text-sm text-white">
            <span>Total</span>
            <span className="font-semibold">{formatarReais(total)}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
