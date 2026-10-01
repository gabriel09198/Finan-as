"use client";

import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { calcularCompra, type ModeloCompra } from "@/lib/compras";
import { db } from "@/lib/firebase";
import { nomeMes } from "@/lib/financas";
import { estaVencida, formatarReais, type Divida, type ItemValor } from "@/lib/tipos";
import { Avatar, botaoFantasma, Icone, painel } from "./ui";

interface Participante {
  email: string;
  uid: string | null;
  nome: string;
  itens: ItemValor[];
  custos: ItemValor[];
  total: number;
  pago: number;
  parcelas: (Divida | undefined)[]; // índice = nº da parcela - 1
}

export interface Pedido {
  id: string;
  titulo: string;
  totalParcelas: number;
  vencimentos: string[];
  participantes: Participante[];
  total: number;
  pago: number;
  aguardando: number;
  criadoEm: number;
}

export function agruparPedidos(dividas: Divida[]): Pedido[] {
  const mapa = new Map<string, Pedido>();
  for (const d of dividas) {
    if (!d.pedidoId) continue;
    const p =
      mapa.get(d.pedidoId) ??
      ({
        id: d.pedidoId,
        titulo: d.pedidoTitulo ?? "Compra em grupo",
        totalParcelas: d.totalParcelas ?? 1,
        vencimentos: [],
        participantes: [],
        total: 0,
        pago: 0,
        aguardando: 0,
        criadoEm: d.criadoEm?.toMillis() ?? Date.now(),
      } satisfies Pedido);
    mapa.set(d.pedidoId, p);

    let pessoa = p.participantes.find((x) => x.email === d.devedorEmail);
    if (!pessoa) {
      pessoa = {
        email: d.devedorEmail,
        uid: d.devedorUid ?? null,
        nome: d.devedorNome,
        itens: d.itens ?? [],
        custos: d.custos ?? [],
        total: d.totalCompra ?? 0,
        pago: 0,
        parcelas: [],
      };
      p.participantes.push(pessoa);
    }
    p.totalParcelas = Math.max(p.totalParcelas, d.totalParcelas ?? 1);
    const i = (d.parcela ?? 1) - 1;
    pessoa.parcelas[i] = d;
    if (d.vencimento) p.vencimentos[i] ??= d.vencimento;
    p.total += d.valor;
    if (d.status === "pago") {
      p.pago += d.valor;
      pessoa.pago += d.valor;
    }
    if (d.status === "aguardando_confirmacao") p.aguardando++;
  }
  return [...mapa.values()].sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Estrutura de uma compra existente, para criar a próxima com base nela. */
export function pedidoParaModelo(pedido: Pedido): ModeloCompra {
  return {
    titulo: pedido.titulo,
    numParcelas: pedido.totalParcelas,
    // Custos e itens mudam a cada compra: mantém só os nomes dos custos e as pessoas.
    custos: (pedido.participantes[0]?.custos ?? []).map((c) => ({ descricao: c.descricao, valor: 0 })),
    participantes: pedido.participantes.map((p) => ({
      nome: p.nome,
      email: p.email,
      uid: p.uid,
      itens: [],
      parcelas: p.parcelas.filter(Boolean).length || null,
    })),
  };
}

/** Monta um Pedido de mentira a partir de um modelo, só para pré-visualizar. */
export function previaDoModelo(modelo: ModeloCompra): Pedido | undefined {
  const calc = calcularCompra(
    modelo.participantes,
    modelo.custos,
    modelo.numParcelas,
    modelo.primeiroVencimento ?? "2026-01-05",
  );
  const dividas: Divida[] = calc.flatMap((p, k) =>
    p.parcelas.map((pa) => ({
      id: `previa-${k}-${pa.numero}`,
      devedorNome: p.nome,
      devedorEmail: p.email || `pessoa-${k}`,
      descricao: modelo.titulo,
      valor: pa.valor,
      vencimento: pa.vencimento,
      status: "pendente" as const,
      criadoEm: null,
      pedidoId: "previa",
      pedidoTitulo: modelo.titulo,
      parcela: pa.numero,
      totalParcelas: p.parcelas.length,
      itens: p.itens,
      custos: p.custos,
      totalCompra: p.total,
    })),
  );
  return agruparPedidos(dividas)[0] as Pedido | undefined;
}

function marcarPago(d: Divida) {
  return updateDoc(doc(db(), "dividas", d.id), { status: "pago", pagoEm: serverTimestamp() });
}

function reabrir(d: Divida) {
  return updateDoc(doc(db(), "dividas", d.id), { status: "pendente", pagoEm: null, informadoPagoEm: null });
}

export function CartaoPedido({
  pedido,
  somenteLeitura = false,
  onUsarComoBase,
}: {
  pedido: Pedido;
  /** Pré-visualização (exemplo): não grava nada ao clicar. */
  somenteLeitura?: boolean;
  onUsarComoBase?: () => void;
}) {
  const [aberto, setAberto] = useState(pedido.aguardando > 0 || somenteLeitura);
  const [verItens, setVerItens] = useState(false);
  const progresso = pedido.total ? (pedido.pago / pedido.total) * 100 : 0;
  const quitado = pedido.pago >= pedido.total - 0.005;

  const parcelasIdx = useMemo(
    () => Array.from({ length: pedido.totalParcelas }, (_, i) => i),
    [pedido.totalParcelas],
  );

  function clicarCelula(pessoa: Participante, d: Divida) {
    if (somenteLeitura) return;
    const rotulo = `parcela ${d.parcela}/${d.totalParcelas} de ${pessoa.nome} (${formatarReais(d.valor)})`;
    if (d.status === "pago") {
      if (window.confirm(`Reabrir a ${rotulo}?`)) reabrir(d);
    } else if (window.confirm(`Confirmar que recebeu a ${rotulo}?`)) {
      marcarPago(d);
    }
  }

  async function excluirPedido() {
    const todas = pedido.participantes.flatMap((p) => p.parcelas.filter(Boolean)) as Divida[];
    if (!window.confirm(`Excluir a compra "${pedido.titulo}" e todas as ${todas.length} cobranças dela?`)) return;
    const batch = writeBatch(db());
    for (const d of todas) batch.delete(doc(db(), "dividas", d.id));
    await batch.commit();
  }

  return (
    <div className={`${painel} overflow-hidden transition ${aberto ? "ring-1 ring-cyan-400/20" : ""}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full flex-wrap items-center gap-4 p-5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/30">
          <Icone nome="sacola" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{pedido.titulo}</p>
            {pedido.aguardando > 0 && (
              <span className="rounded-full bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-300 ring-1 ring-inset ring-sky-400/25">
                {pedido.aguardando} p/ confirmar
              </span>
            )}
            {quitado && (
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                Quitada
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex -space-x-2">
              {pedido.participantes.slice(0, 5).map((p) => (
                <Avatar key={p.email} nome={p.nome} tamanho="h-6 w-6 text-[10px]" />
              ))}
            </div>
            <span className="text-xs text-zinc-500">
              {pedido.participantes.length} pessoas · {pedido.totalParcelas}×
            </span>
          </div>
        </div>
        <div className="w-40 text-right">
          <p className="font-mono text-sm text-zinc-400">
            <span className="text-lg font-semibold text-white">{formatarReais(pedido.pago)}</span>
          </p>
          <p className="font-mono text-xs text-zinc-500">de {formatarReais(pedido.total)}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
        <Icone
          nome="seta"
          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="animate-entra border-t border-white/[0.06] bg-black/20 p-4 sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="w-32 pb-3 text-left font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-zinc-500">
                    Parcela
                  </th>
                  {pedido.participantes.map((p) => (
                    <th key={p.email} className="pb-3 text-center font-normal">
                      <div className="flex flex-col items-center gap-1">
                        <Avatar nome={p.nome} tamanho="h-8 w-8 text-xs" />
                        <span className="max-w-28 truncate font-medium text-zinc-200">{p.nome}</span>
                        <span className="font-mono text-[11px] text-zinc-500">{formatarReais(p.total)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcelasIdx.map((i) => (
                  <tr key={i}>
                    <td className="border-t border-white/[0.05] py-2 pr-3">
                      <span className="font-mono text-xs text-zinc-300">{i + 1}ª</span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {pedido.vencimentos[i] ? nomeMes(pedido.vencimentos[i].slice(0, 7)) : ""}
                      </span>
                    </td>
                    {pedido.participantes.map((p) => {
                      const d = p.parcelas[i];
                      return (
                        <td key={p.email} className="border-t border-white/[0.05] px-1 py-2 text-center">
                          {d ? <CelulaParcela d={d} onClick={() => clicarCelula(p, d)} /> : <span className="text-zinc-700">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Falta pagar
                  </td>
                  {pedido.participantes.map((p) => (
                    <td key={p.email} className="border-t border-white/10 pt-3 text-center font-mono text-xs">
                      {p.total - p.pago < 0.005 ? (
                        <span className="text-emerald-300">Quitado</span>
                      ) : (
                        <span className="text-zinc-100">{formatarReais(p.total - p.pago)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {!somenteLeitura && (
            <p className="mt-3 text-xs text-zinc-500">
              Clique numa parcela para confirmar o recebimento (ou reabrir, se já estiver paga).
            </p>
          )}

          {verItens && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pedido.participantes.map((p) => (
                <div key={p.email} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="mb-2 font-medium text-white">{p.nome}</p>
                  <ul className="space-y-1 font-mono text-xs">
                    {p.itens.map((item, k) => (
                      <li key={k} className="flex justify-between gap-3 text-zinc-400">
                        <span className="truncate">{item.descricao}</span>
                        <span className="text-zinc-200">{formatarReais(item.valor)}</span>
                      </li>
                    ))}
                    {p.custos.map((c) => (
                      <li key={c.descricao} className="flex justify-between gap-3 text-cyan-200/70">
                        <span>{c.descricao} (dividido)</span>
                        <span>{formatarReais(c.valor)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5 text-sm text-white">
                      <span>Total</span>
                      <span className="font-semibold">{formatarReais(p.total)}</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <button className={botaoFantasma} onClick={() => setVerItens(!verItens)}>
                <Icone nome="recibo" /> {verItens ? "Esconder itens" : "Ver itens de cada pessoa"}
              </button>
              {onUsarComoBase && !somenteLeitura && (
                <button className={botaoFantasma} onClick={onUsarComoBase}>
                  <Icone nome="copiar" /> Nova compra com base nesta
                </button>
              )}
            </div>
            {!somenteLeitura && (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                onClick={excluirPedido}
              >
                <Icone nome="lixeira" /> Excluir compra
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CelulaParcela({ d, onClick }: { d: Divida; onClick: () => void }) {
  const vencida = estaVencida(d);
  const estilo =
    d.status === "pago"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : d.status === "aguardando_confirmacao"
        ? "border-sky-400/50 bg-sky-400/15 text-sky-200 shadow-[0_0_14px_-4px_rgba(56,189,248,.9)]"
        : vencida
          ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-cyan-400/40";
  const rotulo =
    d.status === "pago" ? "Pago" : d.status === "aguardando_confirmacao" ? "Confirmar" : vencida ? "Vencida" : "Aberta";

  return (
    <button
      onClick={onClick}
      title={`${rotulo} · ${formatarReais(d.valor)}`}
      className={`inline-flex min-w-24 flex-col items-center rounded-lg border px-2 py-1 transition ${estilo}`}
    >
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
        {d.status === "pago" && <Icone nome="check" className="h-3 w-3" />}
        {rotulo}
      </span>
      <span className="font-mono text-[11px] text-zinc-400">{formatarReais(d.valor)}</span>
    </button>
  );
}

export function CartaoModelo({
  modelo,
  exemplo = false,
  onEditar,
  onUsar,
  onExcluir,
}: {
  modelo: ModeloCompra;
  /** Exemplo embutido (ainda não salvo no Firebase). */
  exemplo?: boolean;
  onEditar: () => void;
  onUsar: () => void;
  onExcluir?: () => void;
}) {
  const [verPrevia, setVerPrevia] = useState(false);
  const previa = useMemo(() => previaDoModelo(modelo), [modelo]);
  const semEmail = modelo.participantes.filter((p) => !p.email).length;

  return (
    <div className={`${painel} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/30">
          <Icone nome="copiar" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{modelo.titulo}</p>
            <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300 ring-1 ring-inset ring-cyan-400/25">
              {exemplo ? "Exemplo da planilha" : "Modelo"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex -space-x-2">
              {modelo.participantes.slice(0, 6).map((p, k) => (
                <Avatar key={k} nome={p.nome || "?"} tamanho="h-6 w-6 text-[10px]" />
              ))}
            </div>
            <span className="text-xs text-zinc-500">
              {modelo.participantes.length} pessoas · total {formatarReais(previa?.total ?? 0)}
              {semEmail > 0 && <span className="text-amber-300/80"> · {semEmail} sem e-mail</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <button className={botaoFantasma} onClick={() => setVerPrevia(!verPrevia)}>
            <Icone nome="grafico" /> {verPrevia ? "Esconder" : "Prévia"}
          </button>
          <button className={botaoFantasma} onClick={onEditar}>
            <Icone nome="lapis" /> Editar
          </button>
          {onExcluir && (
            <button
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300"
              onClick={onExcluir}
              title="Excluir modelo"
            >
              <Icone nome="lixeira" />
            </button>
          )}
          <button
            className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
            onClick={onUsar}
          >
            <Icone nome="raio" /> Usar
          </button>
        </div>
      </div>
      {verPrevia && previa && (
        <div className="border-t border-white/[0.06] p-3">
          <CartaoPedido pedido={previa} somenteLeitura />
        </div>
      )}
    </div>
  );
}
