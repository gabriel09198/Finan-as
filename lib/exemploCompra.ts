import type { ModeloCompra } from "./compras";

/**
 * Compra de exemplo, transcrita da planilha de cartas (aba "gid=515988354").
 * Aparece no painel enquanto não houver compras e serve de modelo: o
 * recebedor só preenche os e-mails e cria as cobranças.
 * Totais conferidos com a planilha: Alfredo 289 · Idel 209,90 · Gabriel 293,60 · Joabe 110.
 */
export const EXEMPLO_COMPRA: ModeloCompra = {
  titulo: "Pedido de cartas One Piece",
  numParcelas: 6,
  primeiroVencimento: "2026-10-05", // "pagar no começo de outubro"
  custos: [
    { descricao: "Frete", valor: 29.74 },
    { descricao: "Taxa de conveniência", valor: 47.06 },
    { descricao: "Extra: Luffy do Ace", valor: 9.9 },
  ],
  participantes: [
    {
      nome: "Alfredo",
      email: "",
      parcelas: 1,
      itens: [
        { descricao: "Doll x4", valor: 4 },
        { descricao: "Nami blocker x2", valor: 40 },
        { descricao: "Nami alabasta x4", valor: 8 },
        { descricao: "Teach preto", valor: 15 },
        { descricao: "Oars Vanilla", valor: 1 },
        { descricao: "Law", valor: 5 },
        { descricao: "Luffy Líder", valor: 39 },
        { descricao: "I never Bother x4", valor: 4 },
        { descricao: "Shanks x3", valor: 117 },
        { descricao: "Yamato x3", valor: 39 },
        { descricao: "Ace líder", valor: 17 },
      ],
    },
    {
      nome: "Idel",
      email: "",
      parcelas: 6,
      itens: [
        { descricao: "Doll x4", valor: 4 },
        { descricao: "Aramaki x4", valor: 4 },
        { descricao: "Ripper x2", valor: 2 },
        { descricao: "Evento Koby x4", valor: 4 },
        { descricao: "I'll whip x3", valor: 3 },
        { descricao: "Bonney Líder", valor: 1 },
        { descricao: "Kujyaku", valor: 12 },
        { descricao: "S-snake", valor: 8 },
        { descricao: "Teach preto", valor: 15 },
        { descricao: "Newgate red", valor: 25 },
        { descricao: "Krieg", valor: 5 },
        { descricao: "Cracker", valor: 4 },
        { descricao: "Don Usopp", valor: 3 },
        { descricao: "Don Rocks", valor: 11.9 },
        { descricao: "Don Four x5", valor: 25 },
        { descricao: "Don Xebec", valor: 30 },
        { descricao: "Yamato x4", valor: 52 },
        { descricao: "Linlin", valor: 1 },
      ],
    },
    {
      nome: "Gabriel",
      email: "",
      parcelas: 6,
      itens: [
        { descricao: "Luffy UP Líder", valor: 1 },
        { descricao: "Yamato x4", valor: 12 },
        { descricao: "Issho", valor: 2 },
        { descricao: "Fra-nosuke x2", valor: 8 },
        { descricao: "Evento Ace", valor: 14.9 },
        { descricao: "Shanks verde", valor: 35 },
        { descricao: "Teach preto", valor: 15 },
        { descricao: "Franky", valor: 1 },
        { descricao: "Douglas Bullet", valor: 4.7 },
        { descricao: "Shanks preto", valor: 2 },
        { descricao: "Sentomaru", valor: 5 },
        { descricao: "Don Mihawk", valor: 3 },
        { descricao: "Newgate x4", valor: 72 },
        { descricao: "Ace x4", valor: 4 },
        { descricao: "Ga ha ha ga x4", valor: 4 },
        { descricao: "Shanks x2", valor: 78 },
        { descricao: "Withdraw x4", valor: 4 },
        { descricao: "Aramaki x2", valor: 2 },
        { descricao: "Gabriel x2", valor: 26 },
      ],
    },
    {
      nome: "Joabe",
      email: "",
      parcelas: 1,
      itens: [
        { descricao: "Two Sword x3", valor: 3 },
        { descricao: "Backlight x2", valor: 4 },
        { descricao: "I'm invincible x2", valor: 2 },
        { descricao: "Law líder", valor: 1 },
        { descricao: "I never Bother x4", valor: 4 },
        { descricao: "Bartolomeo x4", valor: 4 },
        { descricao: "Don Shanks", valor: 29 },
        { descricao: "Newgate x3", valor: 54 },
        { descricao: "Ga ha ha x4", valor: 4 },
        { descricao: "Oars x4", valor: 4 },
        { descricao: "Stage Moria", valor: 1 },
      ],
    },
  ],
};
