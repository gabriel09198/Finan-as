"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  botaoPrimario,
  Icone,
  inputCls,
  labelCls,
  Logo,
  painel,
  Rotulo,
  Segmentos,
  type NomeIcone,
} from "@/components/ui";
import { auth, db } from "@/lib/firebase";

type Modo = "entrar" | "cadastrar";

const mensagensErro: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Faça login.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
  "auth/missing-email": "Digite seu e-mail.",
};

function traduzirErro(e: unknown): string {
  if (e instanceof FirebaseError) return mensagensErro[e.code] ?? `Erro: ${e.code}`;
  return "Algo deu errado. Tente novamente.";
}

const destaques: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: "grafico", titulo: "Controle total", texto: "Receitas, despesas, categorias e saldo mês a mês." },
  { icone: "qr", titulo: "PIX integrado", texto: "Dívidas com QR Code e copia e cola no valor certo." },
  { icone: "escudo", titulo: "Privado", texto: "Cada pessoa só enxerga os próprios dados." },
];

export default function LoginPage() {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && usuario) router.replace("/financas");
  }, [carregando, usuario, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);
    try {
      const emailLimpo = email.trim().toLowerCase();
      if (modo === "entrar") {
        await signInWithEmailAndPassword(auth(), emailLimpo, senha);
      } else {
        const cred = await createUserWithEmailAndPassword(auth(), emailLimpo, senha);
        await updateProfile(cred.user, { displayName: nome.trim() });
        // grava o nome no perfil já agora (o login dispara antes do nome existir)
        await setDoc(
          doc(db(), "usuarios", cred.user.uid),
          { nome: nome.trim(), email: emailLimpo, emailVerificado: false, atualizadoEm: serverTimestamp() },
          { merge: true },
        ).catch(() => {});
        await sendEmailVerification(cred.user);
      }
    } catch (err) {
      setErro(traduzirErro(err));
    } finally {
      setEnviando(false);
    }
  }

  async function esqueciSenha() {
    setErro("");
    setAviso("");
    try {
      await sendPasswordResetEmail(auth(), email.trim().toLowerCase());
      setAviso("Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
    } catch (err) {
      setErro(traduzirErro(err));
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de destaque */}
      <aside className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute left-1/4 top-1/3 h-[30rem] w-[30rem] animate-brilho rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[26rem] w-[26rem] animate-brilho rounded-full bg-violet-600/20 blur-[120px] [animation-delay:-3s]" />

        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="font-semibold tracking-tight text-white">
            Finança<span className="text-cyan-400">.</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <Rotulo>Sistema financeiro pessoal</Rotulo>
          <h2 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-white">
            Seu dinheiro,
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              sob controle.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-zinc-400">
            Acompanhe tudo o que entra e sai, veja para onde vai cada real e resolva dívidas pelo
            PIX — num só lugar.
          </p>

          {/* Mini-painel decorativo */}
          <div className={`${painel} mt-10 overflow-hidden p-5`}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <div className="absolute inset-y-0 w-1/3 animate-varre bg-gradient-to-r from-transparent via-cyan-400/[0.07] to-transparent" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Saldo do mês</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-white">R$ 2.480,00</p>
              </div>
              <div className="flex h-12 items-end gap-1.5">
                {[40, 65, 50, 80, 60, 95].map((h, i) => (
                  <span
                    key={i}
                    className="w-2.5 rounded-t-[3px]"
                    style={{
                      height: `${h}%`,
                      background: i % 2 ? "var(--color-despesa)" : "var(--color-receita)",
                      opacity: i === 5 ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {destaques.map((d) => (
              <div key={d.titulo} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-300">
                  <Icone nome={d.icone} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">{d.titulo}</p>
                  <p className="text-sm text-zinc-500">{d.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          Protegido por Firebase Authentication
        </p>
      </aside>

      {/* Formulário */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className={`${painel} animate-entra w-full max-w-sm overflow-hidden p-7 sm:p-8`}>
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
          <div className="mb-6 lg:hidden">
            <Logo tamanho="lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {modo === "entrar" ? "Acessar sistema" : "Criar acesso"}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {modo === "entrar"
              ? "Entre para ver suas finanças."
              : "Se alguém te cobra por aqui, use o mesmo e-mail que você passou."}
          </p>

          <Segmentos
            className="mt-6 flex w-full"
            opcoes={[
              ["entrar", "Entrar"],
              ["cadastrar", "Criar conta"],
            ] as const}
            valor={modo}
            onChange={(m) => {
              setModo(m);
              setErro("");
              setAviso("");
            }}
          />

          <form onSubmit={enviar} className="mt-6 space-y-4">
            {modo === "cadastrar" && (
              <div>
                <label className={labelCls}>Nome</label>
                <input
                  className={inputCls}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls}>Senha</label>
                {modo === "entrar" && (
                  <button
                    type="button"
                    onClick={esqueciSenha}
                    className="mb-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              <input
                type="password"
                className={inputCls}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </div>

            {erro && (
              <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300 ring-1 ring-inset ring-rose-400/20">
                <Icone nome="alerta" className="h-4 w-4 shrink-0" /> {erro}
              </p>
            )}
            {aviso && (
              <p className="rounded-xl bg-cyan-400/10 px-3 py-2.5 text-sm text-cyan-200 ring-1 ring-inset ring-cyan-400/20">
                {aviso}
              </p>
            )}

            <button type="submit" disabled={enviando} className={botaoPrimario + " w-full py-3"}>
              {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
              {!enviando && <Icone nome="direita" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
