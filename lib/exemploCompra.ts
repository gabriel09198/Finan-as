import type { ModeloCompra } from "./compras";

/** ID do documento em "modelos" quando a base é editada e salva. */
export const ID_MODELO_BASE = "base-planilha";

/**
 * Modelo base, transcrito da planilha de cartas (aba gid=0, "COMPRA COM IDEL").
 * Conferido com a planilha:
 *   cartas  Alfredo 33 · Idel 150 · Gabriel 140,90  (total sem juros 353,90 com frete)
 *   frete   10 para cada (30 no total)
 *   juros   15,84 no total → 5,28 para cada
 *   total   Alfredo 48,28 · Idel 165,28 · Gabriel 156,18  (369,74 com juros)
 *   parcela (2x) Alfredo 24,14 · Idel 82,64 · Gabriel 78,09
 */
export const EXEMPLO_COMPRA: ModeloCompra = {
  titulo: "Compra com Idel",
  numParcelas: 2,
  custos: [
    { descricao: "Frete", valor: 30 },
    { descricao: "Juros do cartão", valor: 15.84 },
  ],
  observacoes: [
    "Idel deve + 10 reais pelo Shanks",
    "Gabriel deve + 10 reais pelo Uber e proxy",
    "Tô devendo a Idel pela compra secreta: R$ 85,77",
  ].join("\n"),
  participantes: [
    {
      nome: "Alfredo",
      email: "",
      itens: [
        { descricao: "4x Kaku", valor: 4 },
        { descricao: "4x Hattori", valor: 3.2 },
        { descricao: "Ivankov líder", valor: 1 },
        { descricao: "Kuzan SR", valor: 8 },
        { descricao: "Spandan", valor: 2 },
        { descricao: "Barrier", valor: 2 },
        { descricao: "Bon Kurei", valor: 12 },
        { descricao: "Disappointed", valor: 0.8 },
      ],
    },
    {
      nome: "Idel",
      email: "",
      itens: [
        { descricao: "Hody Jones", valor: 100 },
        { descricao: "Shanks verde", valor: 24 },
        { descricao: "Vivi", valor: 26 },
      ],
    },
    {
      nome: "Gabriel",
      email: "",
      itens: [
        { descricao: "Don Roger", valor: 8 },
        { descricao: "Evento Sabo", valor: 8 },
        { descricao: "Don Shanks", valor: 20 },
        { descricao: "Zoro roxo", valor: 6 },
        { descricao: "Oden", valor: 20 },
        { descricao: "Luffy Pirata", valor: 2 },
        { descricao: "Marco SR", valor: 15.5 },
        { descricao: "Shanks Secret", valor: 9.9 },
        { descricao: "Marco SR AA", valor: 24 },
        { descricao: "Sabo SR", valor: 2 },
        { descricao: "Chopper Sanji", valor: 2 },
        { descricao: "Zoro-jurou", valor: 3 },
        { descricao: "Zoro vermelho", valor: 8 },
        { descricao: "Don Barba Branca Velho Acabado", valor: 12.5 },
      ],
    },
  ],
};
