import type { Timestamp } from "firebase/firestore";

export type StatusDivida = "pendente" | "aguardando_confirmacao" | "pago";

export interface Divida {
  id: string;
  devedorNome: string;
  devedorEmail: string;
  devedorUid?: string | null; // ID da conta (quando a pessoa foi selecionada da lista)
  descricao: string;
  valor: number;
  vencimento: string | null; // AAAA-MM-DD
  status: StatusDivida;
  criadoEm: Timestamp | null;
  informadoPagoEm?: Timestamp | null;
  pagoEm?: Timestamp | null;

  // Preenchidos quando a cobrança é uma parcela de uma compra em grupo.
  // Cada parcela carrega o detalhamento da pessoa para ela poder ver o que comprou.
  pedidoId?: string;
  pedidoTitulo?: string;
  parcela?: number;
  totalParcelas?: number;
  itens?: ItemValor[];
  custos?: ItemValor[]; // parte da pessoa nos custos divididos (frete, taxa…)
  totalCompra?: number; // total da pessoa na compra (itens + custos)
}

export interface ItemValor {
  descricao: string;
  valor: number;
}

/** "9,90" | "1.234,5" | "12.5" → número; NaN se inválido. */
export function lerValor(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return Number(normalizado);
}

export function centavos(v: number): number {
  return Math.round(v * 100) / 100;
}

export interface ConfigPix {
  chave: string;
  nome: string;
  cidade: string;
}

export const rotuloStatus: Record<StatusDivida, string> = {
  pendente: "Pendente",
  aguardando_confirmacao: "Aguardando confirmação",
  pago: "Pago",
};

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function estaVencida(divida: Divida): boolean {
  if (!divida.vencimento || divida.status === "pago") return false;
  return divida.vencimento < hojeISO();
}
