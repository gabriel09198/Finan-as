"use client";

import { useState } from "react";
import { nomeMes, reaisCompacto, type Mes } from "@/lib/financas";
import { formatarReais } from "@/lib/tipos";
import { Icone, type NomeIcone } from "./ui";

// Paleta validada (scripts/validate_palette.js, modo escuro, superfície #0c1120):
// receitas = ciano, despesas = violeta. Texto nunca usa a cor da série.
const COR_RECEITA = "var(--color-receita)";
const COR_DESPESA = "var(--color-despesa)";

function tetoBonito(v: number): number {
  if (v <= 0) return 100;
  const ordem = 10 ** Math.floor(Math.log10(v));
  for (const passo of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (passo * ordem >= v) return passo * ordem;
  }
  return 10 * ordem;
}

export interface PontoMensal {
  mes: Mes;
  receitas: number;
  despesas: number;
}

export function GraficoMensal({
  dados,
  mesAtual,
  onEscolherMes,
}: {
  dados: PontoMensal[];
  mesAtual: Mes;
  onEscolherMes: (m: Mes) => void;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const teto = tetoBonito(Math.max(...dados.flatMap((d) => [d.receitas, d.despesas])));
  const linhas = [1, 0.5, 0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_RECEITA }} />
          Receitas
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_DESPESA }} />
          Despesas
        </span>
      </div>

      <div className="flex gap-3">
        {/* eixo Y */}
        <div className="relative h-48 w-14 shrink-0 font-mono text-[10px] text-zinc-500">
          {linhas.map((f) => (
            <span
              key={f}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - f) * 100}%` }}
            >
              {reaisCompacto(teto * f)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* grade recessiva */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48">
            {linhas.map((f) => (
              <div
                key={f}
                className={`absolute inset-x-0 border-t ${f === 0 ? "border-white/20" : "border-dashed border-white/[0.06]"}`}
                style={{ top: `${(1 - f) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex h-48 items-end">
            {dados.map((d, i) => {
              const ativo = d.mes === mesAtual;
              return (
                <div
                  key={d.mes}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onEscolherMes(d.mes)}
                  onMouseEnter={() => setFoco(i)}
                  onMouseLeave={() => setFoco(null)}
                  onFocus={() => setFoco(i)}
                  onBlur={() => setFoco(null)}
                  onClick={() => onEscolherMes(d.mes)}
                  aria-label={`${nomeMes(d.mes)}: receitas ${formatarReais(d.receitas)}, despesas ${formatarReais(d.despesas)}`}
                  className={`group relative flex h-full flex-1 cursor-pointer items-end justify-center gap-[2px] rounded-t-lg outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                    foco === i ? "bg-white/[0.04]" : ""
                  }`}
                >
                  {[
                    [d.receitas, COR_RECEITA],
                    [d.despesas, COR_DESPESA],
                  ].map(([v, cor], k) => (
                    <span
                      key={k}
                      className="max-w-[20px] flex-1 rounded-t-[4px] transition-all duration-500"
                      style={{
                        height: `${Math.max((Number(v) / teto) * 100, Number(v) > 0 ? 1.5 : 0)}%`,
                        background: String(cor),
                        opacity: ativo || foco === i ? 1 : 0.55,
                        boxShadow: ativo ? `0 0 14px -2px ${cor}` : undefined,
                      }}
                    />
                  ))}

                  {foco === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0a0f1c]/95 p-3 text-left shadow-xl backdrop-blur">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {nomeMes(d.mes)}
                      </p>
                      <LinhaDica cor={COR_RECEITA} rotulo="Receitas" valor={d.receitas} />
                      <LinhaDica cor={COR_DESPESA} rotulo="Despesas" valor={d.despesas} />
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <LinhaDica rotulo="Saldo" valor={d.receitas - d.despesas} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* eixo X */}
          <div className="mt-2 flex">
            {dados.map((d) => (
              <span
                key={d.mes}
                className={`flex-1 text-center font-mono text-[10px] uppercase tracking-wider ${
                  d.mes === mesAtual ? "text-white" : "text-zinc-500"
                }`}
              >
                {nomeMes(d.mes, true)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* versão em tabela para leitores de tela */}
      <table className="sr-only">
        <caption>Receitas e despesas por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Receitas</th>
            <th>Despesas</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.mes}>
              <td>{nomeMes(d.mes)}</td>
              <td>{formatarReais(d.receitas)}</td>
              <td>{formatarReais(d.despesas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinhaDica({ cor, rotulo, valor }: { cor?: string; rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-zinc-400">
        {cor && <span className="h-2 w-2 rounded-sm" style={{ background: cor }} />}
        {rotulo}
      </span>
      <span className="font-mono text-zinc-100 tabular-nums">{formatarReais(valor)}</span>
    </div>
  );
}

export function GraficoCategorias({
  dados,
}: {
  dados: { nome: string; icone: NomeIcone; valor: number }[];
}) {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  const maior = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <ul className="space-y-3.5">
      {dados.map((d) => {
        const pct = total ? (d.valor / total) * 100 : 0;
        return (
          <li key={d.nome} title={`${d.nome}: ${formatarReais(d.valor)} (${pct.toFixed(1)}%)`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                <Icone nome={d.icone} className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">{d.nome}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-100 tabular-nums">
                {formatarReais(d.valor)}
                <span className="ml-2 text-zinc-500">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(d.valor / maior) * 100}%`,
                  background: COR_DESPESA,
                  boxShadow: `0 0 10px -1px ${COR_DESPESA}`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
