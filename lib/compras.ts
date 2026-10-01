import { centavos, type ItemValor } from "./tipos";

export interface ParticipanteRascunho {
  nome: string;
  email: string;
  /** ID da conta no site (Firebase Auth), quando a pessoa foi selecionada da lista. */
  uid?: string | null;
  itens: ItemValor[];
  /** Parcelas só desta pessoa; se vazio, usa o padrão da compra. */
  parcelas?: number | null;
}

/** Estrutura reaproveitável para criar uma compra nova (exemplo ou "com base nesta"). */
export interface ModeloCompra {
  titulo: string;
  numParcelas: number;
  primeiroVencimento?: string;
  custos: ItemValor[];
  participantes: ParticipanteRascunho[];
}

export interface ParcelaCalculada {
  numero: number;
  vencimento: string; // AAAA-MM-DD
  valor: number;
}

export interface ParticipanteCalculado extends Omit<ParticipanteRascunho, "parcelas"> {
  subtotal: number;
  custos: ItemValor[];
  total: number;
  parcelas: ParcelaCalculada[];
}

/** Soma `meses` a uma data AAAA-MM-DD mantendo o dia (limitado ao fim do mês). */
export function somarMesesData(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(a, m - 1 + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimoDia));
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(alvo.getDate()).padStart(2, "0")}`;
}

/**
 * Igual à planilha: cada pessoa paga os próprios itens + uma fatia igual dos
 * custos compartilhados, dividido em N parcelas mensais. Arredonda para
 * centavos e joga a diferença na última parcela, para a soma bater exato.
 */
export function calcularCompra(
  participantes: ParticipanteRascunho[],
  custosCompartilhados: ItemValor[],
  numParcelas: number,
  primeiroVencimento: string,
): ParticipanteCalculado[] {
  const n = participantes.length || 1;

  return participantes.map((pessoa, indice) => {
    const p = Math.max(1, Math.floor(pessoa.parcelas || numParcelas));
    const subtotal = centavos(pessoa.itens.reduce((s, i) => s + i.valor, 0));
    // Divide cada custo em centavos inteiros; o resto (ex.: 1 centavo) vai para
    // os primeiros participantes, para a soma das partes bater com o custo.
    const custos = custosCompartilhados
      .filter((c) => c.valor > 0)
      .map((c) => {
        const totalCentavos = Math.round(c.valor * 100);
        const parte = Math.floor(totalCentavos / n) + (indice < totalCentavos % n ? 1 : 0);
        return { descricao: c.descricao, valor: parte / 100 };
      });
    const total = centavos(subtotal + custos.reduce((s, c) => s + c.valor, 0));

    const base = Math.floor((total / p) * 100) / 100;
    const parcelas = Array.from({ length: p }, (_, i) => ({
      numero: i + 1,
      vencimento: somarMesesData(primeiroVencimento, i),
      valor: i === p - 1 ? centavos(total - base * (p - 1)) : base,
    }));

    return { ...pessoa, subtotal, custos, total, parcelas };
  });
}
