"use client";

import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import {
  Avatar,
  botaoFantasma,
  botaoPrimario,
  botaoSecundario,
  Carregando,
  Icone,
  Logo,
  painel,
  type NomeIcone,
} from "./ui";

interface Props {
  // "todos": qualquer pessoa logada (ex.: finanças pessoais).
  papel: "admin" | "devedor" | "todos";
  children: React.ReactNode;
}

export function AreaProtegida({ papel, children }: Props) {
  const { usuario, carregando, admin, semRecebedor } = useAuth();
  const router = useRouter();
  const caminho = usePathname();

  const papelCerto = papel === "todos" || (papel === "admin" ? admin : !admin);
  const verificado = !!usuario?.emailVerified;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/login");
    else if (verificado && !semRecebedor && !papelCerto)
      router.replace(admin ? "/admin" : "/minhas-dividas");
  }, [carregando, usuario, verificado, semRecebedor, papelCerto, admin, router]);

  if (carregando || !usuario) return <Carregando />;
  if (!verificado) return <VerificarEmail />;
  if (semRecebedor) return <DefinirRecebedor />;
  if (!papelCerto) return <Carregando />;

  const nome = usuario.displayName || usuario.email || "";
  const abas: { href: string; rotulo: string; icone: NomeIcone }[] = [
    { href: "/financas", rotulo: "Finanças", icone: "grafico" },
    admin
      ? { href: "/admin", rotulo: "Cobranças", icone: "cobranca" }
      : { href: "/minhas-dividas", rotulo: "Minhas dívidas", icone: "carteira" },
  ];

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05070d]/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/financas" className="flex items-center gap-3">
              <Logo />
              <span className="hidden font-semibold tracking-tight text-white md:inline">
                Finança<span className="text-cyan-400">.</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {abas.map((a) => {
                const ativa = caminho === a.href;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      ativa ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    <Icone nome={a.icone} />
                    <span className="hidden sm:inline">{a.rotulo}</span>
                    {ativa && (
                      <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 shadow-[0_0_10px_rgba(34,211,238,.9)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 sm:flex">
              <Avatar nome={nome} tamanho="h-7 w-7 text-xs" />
              <span className="max-w-[160px] truncate text-sm text-zinc-300">{nome}</span>
            </div>
            <button onClick={() => signOut(auth())} className={botaoFantasma} title="Sair">
              <Icone nome="sair" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function TelaCentral({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className={`${painel} animate-entra w-full max-w-md overflow-hidden p-8 text-center`}>
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
        <div className="flex justify-center">{icone}</div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-white">{titulo}</h1>
        {children}
      </div>
    </div>
  );
}

function DefinirRecebedor() {
  const { usuario } = useAuth();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const email = usuario?.email?.toLowerCase() ?? "";

  async function definir() {
    setOcupado(true);
    setErro("");
    try {
      await setDoc(doc(db(), "config", "admins"), { emails: [email] });
    } catch {
      setErro("Não foi possível salvar. Confira se as regras do Firestore foram publicadas.");
      setOcupado(false);
    }
  }

  return (
    <TelaCentral icone={<Logo tamanho="lg" />} titulo="Configuração inicial">
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Ainda ninguém foi definido como <strong className="text-white">recebedor</strong> — a
        pessoa que cadastra as dívidas e recebe os PIX.
      </p>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
        <Avatar nome={usuario?.displayName || email} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{usuario?.displayName || "Você"}</p>
          <p className="truncate font-mono text-xs text-zinc-500">{email}</p>
        </div>
      </div>
      {erro && <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{erro}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <button onClick={definir} disabled={ocupado} className={botaoPrimario}>
          <Icone nome="raio" /> {ocupado ? "Salvando…" : "Sou eu quem recebe"}
        </button>
        <button onClick={() => signOut(auth())} className={botaoFantasma + " mx-auto mt-1"}>
          Não sou eu — sair
        </button>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Depois você pode adicionar outros recebedores pelo painel.
      </p>
    </TelaCentral>
  );
}

function VerificarEmail() {
  const { usuario, atualizar } = useAuth();
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function reenviar() {
    if (!usuario) return;
    setOcupado(true);
    try {
      await sendEmailVerification(usuario);
      setMsg("E-mail reenviado. Confira também a caixa de spam.");
    } catch {
      setMsg("Não foi possível reenviar agora. Aguarde alguns minutos e tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function jaVerifiquei() {
    setOcupado(true);
    await atualizar();
    setOcupado(false);
    if (!auth().currentUser?.emailVerified) setMsg("Ainda não identificamos a confirmação.");
  }

  return (
    <TelaCentral
      titulo="Confirme seu e-mail"
      icone={
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/30 shadow-[0_0_40px_-8px_rgba(34,211,238,.7)]">
          <Icone nome="email" className="h-7 w-7" />
        </span>
      }
    >
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Enviamos um link de confirmação para{" "}
        <strong className="font-mono text-white">{usuario?.email}</strong>. Clique nele e depois
        volte aqui.
      </p>
      {msg && (
        <p className="mt-4 rounded-xl bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">{msg}</p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button onClick={jaVerifiquei} disabled={ocupado} className={botaoPrimario}>
          <Icone nome="check" /> Já confirmei
        </button>
        <button onClick={reenviar} disabled={ocupado} className={botaoSecundario + " py-2.5"}>
          Reenviar e-mail
        </button>
        <button onClick={() => signOut(auth())} className={botaoFantasma + " mx-auto mt-1"}>
          Usar outra conta
        </button>
      </div>
    </TelaCentral>
  );
}
