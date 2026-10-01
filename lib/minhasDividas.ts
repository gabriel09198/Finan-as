import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Divida } from "./tipos";

/**
 * Escuta as cobranças da pessoa logada. Junta duas buscas — pelo e-mail e pelo
 * ID da conta — porque cobranças antigas/avulsas só têm e-mail, e as de compras
 * em grupo selecionadas da lista também têm o ID (vale mesmo se o e-mail mudar).
 */
export function ouvirMinhasDividas(
  email: string,
  uid: string,
  onDados: (dividas: Divida[]) => void,
  onErro: () => void,
): () => void {
  const ref = collection(db(), "dividas");
  const porEmail = new Map<string, Divida>();
  const porUid = new Map<string, Divida>();
  let recebidos = 0;

  const emitir = () => {
    if (recebidos < 2) return; // espera as duas buscas responderem
    const juntas = new Map([...porEmail, ...porUid]);
    onDados(
      [...juntas.values()].sort(
        (a, b) => (b.criadoEm?.toMillis() ?? 0) - (a.criadoEm?.toMillis() ?? 0),
      ),
    );
  };

  const ouvir = (campo: "devedorEmail" | "devedorUid", valor: string, destino: Map<string, Divida>) => {
    let primeira = true;
    return onSnapshot(
      query(ref, where(campo, "==", valor)),
      (snap) => {
        destino.clear();
        for (const d of snap.docs) destino.set(d.id, { id: d.id, ...d.data() } as Divida);
        if (primeira) {
          primeira = false;
          recebidos++;
        }
        emitir();
      },
      onErro,
    );
  };

  const pararEmail = ouvir("devedorEmail", email, porEmail);
  const pararUid = ouvir("devedorUid", uid, porUid);
  return () => {
    pararEmail();
    pararUid();
  };
}
