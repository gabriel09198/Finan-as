import type { Timestamp } from "firebase/firestore";
import type { NomeIcone } from "@/components/ui";

export type TipoTransacao = "receita" | "despesa";

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  valor: number;
  categoria: string;
  data: string; // AAAA-MM-DD
  criadoEm: Timestamp | null;
}

export const categorias: Record<TipoTransacao, { nome: string; icone: NomeIcone }[]> = {
  despesa: [
    { nome: "Alimentação", icone: "comida" },
    { nome: "Moradia", icone: "casa" },
    { nome: "Transporte", icone: "carro" },
    { nome: "Saúde", icone: "coracao" },
    { nome: "Educação", icone: "livro" },
    { nome: "Lazer", icone: "jogo" },
    { nome: "Compras", icone: "sacola" },
    { nome: "Contas", icone: "recibo" },
    { nome: "Outros", icone: "etiqueta" },
  ],
  receita: [
    { nome: "Salário", icone: "maleta" },
    { nome: "Freelance", icone: "notebook" },
    { nome: "Investimentos", icone: "tendencia" },
    { nome: "Vendas", icone: "sacola" },
    { nome: "Presente", icone: "presente" },
    { nome: "Outros", icone: "etiqueta" },
  ],
};

export function iconeCategoria(tipo: TipoTransacao, nome: string): NomeIcone {
  return categorias[tipo].find((c) => c.nome === nome)?.icone ?? "etiqueta";
}

/** "2026-10" */
export type Mes = string;

export function mesDe(dataISO: string): Mes {
  return dataISO.slice(0, 7);
}

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function somarMeses(mes: Mes, delta: number): Mes {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const nomesMeses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function nomeMes(mes: Mes, curto = false): string {
  const [a, m] = mes.split("-").map(Number);
  const nome = nomesMeses[m - 1];
  return curto ? nome.slice(0, 3) : `${nome} ${a}`;
}

/** R$ 1,2 mil / R$ 850 — para eixos de gráfico. */
export function reaisCompacto(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}
