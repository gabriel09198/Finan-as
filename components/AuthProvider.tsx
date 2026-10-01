"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, firebaseConfigurado } from "@/lib/firebase";

interface EstadoAuth {
  usuario: User | null;
  carregando: boolean;
  // Todo mundo com e-mail confirmado é admin (vê e edita tudo). Ver isAdmin() em firestore.rules.
  admin: boolean;
  // Força re-render depois de user.reload() (ex.: e-mail recém-verificado).
  atualizar: () => Promise<void>;
}

const AuthContext = createContext<EstadoAuth>({
  usuario: null,
  carregando: true,
  admin: false,
  atualizar: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(firebaseConfigurado);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!firebaseConfigurado) return;
    return onAuthStateChanged(auth(), async (u) => {
      // Quem confirmou o e-mail em outra aba/aparelho fica com o token antigo
      // (email_verified = false) por até 1h, e as regras do Firestore recusam.
      // Se o usuário já está verificado mas o token não, renova o token antes de liberar.
      if (u?.emailVerified) {
        try {
          const token = await u.getIdTokenResult();
          if (token.claims.email_verified !== true) await u.getIdToken(true);
        } catch {
          // sem rede: segue com o token atual
        }
      }
      setUsuario(u);
      setCarregando(false);
    });
  }, []);

  // Perfil mínimo (nome + e-mail + ID) para a pessoa poder ser selecionada numa
  // compra em grupo. Salvo já no primeiro login, mesmo antes de confirmar o
  // e-mail — senão quem esquece o link de confirmação nunca aparece na lista.
  useEffect(() => {
    if (!usuario?.email) return;
    setDoc(
      doc(db(), "usuarios", usuario.uid),
      {
        // não apaga um nome já salvo com "" (o nome chega um instante depois no cadastro)
        ...(usuario.displayName ? { nome: usuario.displayName } : {}),
        email: usuario.email.toLowerCase(),
        emailVerificado: usuario.emailVerified,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});
  }, [usuario, versao]);

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

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, admin: !!usuario?.emailVerified, atualizar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
