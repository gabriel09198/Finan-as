# Controle de Dívidas

Sistema de finanças pessoais com controle de dívidas e pagamento via PIX.

- **Finanças (todos)** — cada pessoa registra receitas e despesas por categoria e acompanha saldo do
  mês, saldo acumulado, taxa de economia e gráficos dos últimos 6 meses.

- **Cobrador (admin)** — cadastra dívidas, vê totais, confirma pagamentos e configura a chave PIX.
- **Devedor** — cria conta com o e-mail que passou para você, vê só as próprias dívidas, paga com
  QR Code ou PIX copia e cola e clica em "Já paguei" para avisar.

Feito com Next.js 16, Tailwind 4 e Firebase (Authentication + Firestore).

## Configurando o Firebase

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Authentication › Método de login** → ative **E-mail/senha**.
3. **Firestore Database** → criar banco (modo produção).
4. **Configurações do projeto › Seus apps** → adicione um app **Web** e copie a configuração.
5. Copie `.env.example` para `.env.local` e preencha os valores.
6. Publique as regras de `firestore.rules`:
   - pelo console: **Firestore › Regras**, cole o conteúdo e clique em **Publicar**; ou
   - pela CLI: `npx firebase-tools login` e `npx firebase-tools deploy --only firestore:rules --project SEU_PROJETO`.

## Rodando

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>, crie sua conta e confirme o e-mail. **Todo mundo com e-mail confirmado é admin**: vê e edita todas as cobranças, compras, modelos e a chave PIX. Quem ainda não confirmou o e-mail só acessa a tela de confirmação.

## Como funciona

| Status                   | Quem muda                                   |
| ------------------------ | ------------------------------------------- |
| `pendente`               | criado pelo admin                           |
| `aguardando_confirmacao` | devedor clica em "Já paguei"                |
| `pago`                   | admin confirma depois de ver no extrato     |

A segurança fica em `firestore.rules`: as transações de cada pessoa ficam em
`usuarios/{uid}/transacoes` e só ela acessa; só o admin cria/edita/exclui dívidas, e o devedor só lê as
dívidas do próprio e-mail (que precisa estar confirmado) e só pode mudar o status de `pendente` para
`aguardando_confirmacao`.

O pagamento é PIX estático (sem integração com banco), então o app não sabe sozinho se o dinheiro
caiu — por isso o admin confirma manualmente.
