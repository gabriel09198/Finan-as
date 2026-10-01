"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, firebaseConfigurado } from "@/lib/firebase";

interface EstadoAuth {
  usuario: User | null;
  carregando: boolean;
  // Quem recebe os pagamentos (lista em config/admins).
  admin: boolean;
  admins: string[];
  // Ainda ninguém foi definido como recebedor (primeiro acesso).
  semRecebedor: boolean;
  // Força re-render depois de user.reload() (ex.: e-mail recém-verificado).
  atualizar: () => Promise<void>;
}

const AuthContext = createContext<EstadoAuth>({
  usuario: null,
  carregando: true,
  admin: false,
  admins: [],
  semRecebedor: false,
  atualizar: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [authCarregando, setAuthCarregando] = useState(firebaseConfigurado);
  // null = ainda carregando a lista de recebedores do usuário atual.
  const [admins, setAdmins] = useState<{ uid: string; emails: string[] | null } | null>(null);
  const [, setVersao] = useState(0);

  useEffect(() => {
    if (!firebaseConfigurado) return;
    return onAuthStateChanged(auth(), (u) => {
      setUsuario(u);
      setAuthCarregando(false);
    });
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const uid = usuario.uid;
    return onSnapshot(
      doc(db(), "config", "admins"),
      (snap) =>
        setAdmins({ uid, emails: snap.exists() ? ((snap.data().emails as string[]) ?? []) : null }),
      () => setAdmins({ uid, emails: [] }),
    );
  }, [usuario]);

  // Perfil público mínimo (nome + e-mail) para o recebedor poder selecionar a
  // pessoa numa compra em grupo, em vez de digitar o e-mail.
  useEffect(() => {
    if (!usuario?.emailVerified || !usuario.email) return;
    setDoc(
      doc(db(), "usuarios", usuario.uid),
      {
        nome: usuario.displayName ?? "",
        email: usuario.email.toLowerCase(),
        atualizadoEm: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});
  }, [usuario]);

  async function atualizar() {
    const u = auth().currentUser;
    if (!u) return;
    await u.reload();
    // Renova o token para as regras do Firestore enxergarem email_verified.
    await u.getIdToken(true);
    setUsuario(auth().currentUser);
    setVersao((v) => v + 1);
  }

  if (!firebaseConfigurado) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">Firebase não configurado</h1>
        <p className="mt-2 text-zinc-600">
          Copie <code className="rounded bg-zinc-100 px-1">.env.example</code> para{" "}
          <code className="rounded bg-zinc-100 px-1">.env.local</code>, preencha com os dados do
          seu projeto Firebase e reinicie o <code className="rounded bg-zinc-100 px-1">npm run dev</code>.
        </p>
      </div>
    );
  }

  const adminsDoUsuario = usuario && admins?.uid === usuario.uid ? admins : null;
  const email = usuario?.email?.toLowerCase() ?? "";
  const lista = adminsDoUsuario?.emails ?? [];

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando: authCarregando || (!!usuario && !adminsDoUsuario),
        admin: !!email && lista.includes(email),
        admins: lista,
        semRecebedor: !!adminsDoUsuario && adminsDoUsuario.emails === null,
        atualizar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
