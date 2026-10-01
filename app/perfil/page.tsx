"use client";

import { FirebaseError } from "firebase/app";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { AreaProtegida } from "@/components/AreaProtegida";
import { useAuth } from "@/components/AuthProvider";
import {
  Avatar,
  botaoPrimario,
  Icone,
  inputCls,
  labelCls,
  painel,
  Rotulo,
} from "@/components/ui";
import { auth, db } from "@/lib/firebase";

export default function PerfilPage() {
  return (
    <AreaProtegida papel="todos">
      <Perfil />
    </AreaProtegida>
  );
}

function Perfil() {
  const { usuario, admin } = useAuth();
  if (!usuario) return null;

  return (
    <div className="animate-entra mx-auto max-w-2xl space-y-6">
      <div>
        <Rotulo>Conta</Rotulo>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Meu perfil</h1>
      </div>

      <section className={`${painel} overflow-hidden p-6`}>
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
        <div className="flex items-center gap-4">
          <Avatar nome={usuario.displayName || usuario.email || "?"} tamanho="h-16 w-16 text-xl" />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-white">{usuario.displayName || "Sem nome"}</p>
            <p className="truncate font-mono text-sm text-zinc-400">{usuario.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400 ring-1 ring-inset ring-white/10">
                {admin ? "Recebedor" : "Participante"}
              </span>
              {usuario.emailVerified && (
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                  E-mail confirmado
                </span>
              )}
            </div>
          </div>
        </div>
        <IdDaConta uid={usuario.uid} />
      </section>

      <FormNome />
      <FormSenha />
    </div>
  );
}

function IdDaConta({ uid }: { uid: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">ID da conta</p>
        <p className="truncate font-mono text-sm text-cyan-200">{uid}</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-400/40"
        onClick={async () => {
          await navigator.clipboard.writeText(uid);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
      >
        <Icone nome={copiado ? "check" : "copiar"} className="h-3.5 w-3.5" />
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function Aviso({ tipo, texto }: { tipo: "ok" | "erro"; texto: string }) {
  return tipo === "ok" ? (
    <p className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
      <Icone nome="check" /> {texto}
    </p>
  ) : (
    <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-400/20">
      <Icone nome="alerta" /> {texto}
    </p>
  );
}

function FormNome() {
  const { usuario, atualizar } = useAuth();
  const [nome, setNome] = useState(usuario?.displayName ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const u = auth().currentUser;
    if (!u || !nome.trim()) return;
    setSalvando(true);
    setMsg(null);
    try {
      await updateProfile(u, { displayName: nome.trim() });
      // mantém o perfil (visto pelo recebedor ao montar compras) com o mesmo nome
      await setDoc(
        doc(db(), "usuarios", u.uid),
        { nome: nome.trim(), email: u.email?.toLowerCase() ?? "", atualizadoEm: serverTimestamp() },
        { merge: true },
      );
      await atualizar();
      setMsg({ tipo: "ok", texto: "Nome atualizado." });
    } catch {
      setMsg({ tipo: "erro", texto: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className={`${painel} space-y-4 p-6`}>
      <div>
        <h2 className="font-semibold text-white">Nome</h2>
        <p className="text-sm text-zinc-500">É como você aparece no site e para quem monta as compras.</p>
      </div>
      <div>
        <label className={labelCls}>Seu nome</label>
        <input
          className={inputCls}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          required
          maxLength={60}
        />
      </div>
      {msg && <Aviso {...msg} />}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={salvando || !nome.trim() || nome.trim() === (usuario?.displayName ?? "")}
          className={botaoPrimario}
        >
          {salvando ? "Salvando…" : "Salvar nome"}
        </button>
      </div>
    </form>
  );
}

const errosSenha: Record<string, string> = {
  "auth/invalid-credential": "Senha atual incorreta.",
  "auth/wrong-password": "Senha atual incorreta.",
  "auth/weak-password": "A nova senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
};

function FormSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova !== confirmacao) return setMsg({ tipo: "erro", texto: "A confirmação não bate com a nova senha." });
    const u = auth().currentUser;
    if (!u?.email) return;
    setSalvando(true);
    try {
      // O Firebase exige login recente para trocar a senha: confirma com a senha atual.
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, atual));
      await updatePassword(u, nova);
      setAtual("");
      setNova("");
      setConfirmacao("");
      setMsg({ tipo: "ok", texto: "Senha alterada." });
    } catch (err) {
      const codigo = err instanceof FirebaseError ? err.code : "";
      setMsg({ tipo: "erro", texto: errosSenha[codigo] ?? "Não foi possível trocar a senha." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className={`${painel} space-y-4 p-6`}>
      <div>
        <h2 className="font-semibold text-white">Trocar senha</h2>
        <p className="text-sm text-zinc-500">Por segurança, confirme sua senha atual.</p>
      </div>
      <div>
        <label className={labelCls}>Senha atual</label>
        <input
          type="password"
          className={inputCls}
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Nova senha</label>
          <input
            type="password"
            className={inputCls}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Repita a nova senha</label>
          <input
            type="password"
            className={inputCls}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
      </div>
      {msg && <Aviso {...msg} />}
      <div className="flex justify-end">
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando…" : "Trocar senha"}
        </button>
      </div>
    </form>
  );
}
