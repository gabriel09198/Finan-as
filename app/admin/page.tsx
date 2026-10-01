"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { AreaProtegida } from "@/components/AreaProtegida";
import { idCurto, ModalCompraGrupo } from "@/components/ModalCompraGrupo";
import {
  agruparPedidos,
  CartaoModelo,
  CartaoPedido,
  pedidoParaModelo,
} from "@/components/PainelCompras";
import {
  Avatar,
  BadgeStatus,
  botaoFantasma,
  botaoPrimario,
  botaoSecundario,
  Card,
  Carregando,
  Icone,
  inputCls,
  labelCls,
  Modal,
  painel,
  Vazio,
} from "@/components/ui";
import type { ModeloCompra } from "@/lib/compras";
import { EXEMPLO_COMPRA } from "@/lib/exemploCompra";
import { db } from "@/lib/firebase";
import {
  estaVencida,
  formatarData,
  formatarReais,
  type ConfigPix,
  type Divida,
} from "@/lib/tipos";

export default function AdminPage() {
  return (
    <AreaProtegida papel="admin">
      <Painel />
    </AreaProtegida>
  );
}

type Filtro = "abertas" | "todas" | "pagas";

interface Conta {
  uid: string;
  nome: string;
  email: string;
  // false = criou conta mas ainda não clicou no link de confirmação
  emailVerificado: boolean;
  ultimoAcesso: Date | null;
}

interface Devedor {
  email: string;
  nome: string;
  dividas: Divida[];
  emAberto: number;
  aguardando: number;
  vencidas: number;
}

function Painel() {
  const [dividas, setDividas] = useState<Divida[] | null>(null);
  const [config, setConfig] = useState<ConfigPix | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [busca, setBusca] = useState("");
  const [novaPara, setNovaPara] = useState<{ nome: string; email: string } | null>(null);
  const [editandoPix, setEditandoPix] = useState(false);
  // null = fechado; "vazia" = do zero; com modelo = pré-preenchida (modeloId = editar modelo salvo)
  const [novaCompra, setNovaCompra] = useState<
    "vazia" | { modelo: ModeloCompra; modeloId?: string } | null
  >(null);
  const [modelos, setModelos] = useState<(ModeloCompra & { id: string })[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [vendoPessoas, setVendoPessoas] = useState(false);

  useEffect(() => {
    const q = query(collection(db(), "dividas"), orderBy("criadoEm", "desc"));
    const parar = onSnapshot(
      q,
      (snap) => setDividas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Divida)),
      (e) =>
        setErro(
          e.code === "permission-denied"
            ? "Sem permissão. Confira se as regras do Firestore (firestore.rules) foram publicadas."
            : "Erro ao carregar as dívidas.",
        ),
    );
    const pararConfig = onSnapshot(doc(db(), "config", "pix"), (snap) =>
      setConfig(snap.exists() ? (snap.data() as ConfigPix) : null),
    );
    const pararModelos = onSnapshot(
      collection(db(), "modelos"),
      (snap) =>
        setModelos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ModeloCompra) }))),
      () => setModelos([]),
    );
    const pararContas = onSnapshot(
      collection(db(), "usuarios"),
      (snap) =>
        setContas(
          snap.docs
            .map((d) => ({
              uid: d.id,
              nome: String(d.data().nome ?? ""),
              email: String(d.data().email ?? ""),
              // perfis antigos (sem o campo) só eram salvos depois de confirmar
              emailVerificado: d.data().emailVerificado !== false,
              ultimoAcesso: d.data().atualizadoEm?.toDate?.() ?? null,
            }))
            .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, "pt-BR")),
        ),
      () => setContas([]),
    );
    return () => {
      pararContas();
      parar();
      pararConfig();
      pararModelos();
    };
  }, []);

  const stats = useMemo(() => {
    const lista = dividas ?? [];
    const soma = (ds: Divida[]) => ds.reduce((t, d) => t + d.valor, 0);
    const abertas = lista.filter((d) => d.status !== "pago");
    const aguardando = lista.filter((d) => d.status === "aguardando_confirmacao");
    return {
      aReceber: soma(abertas),
      aguardando,
      totalAguardando: soma(aguardando),
      recebido: soma(lista.filter((d) => d.status === "pago")),
      devedoresAtivos: new Set(abertas.map((d) => d.devedorEmail)).size,
      vencidas: lista.filter(estaVencida).length,
    };
  }, [dividas]);

  const devedores = useMemo(() => {
    const mapa = new Map<string, Devedor>();
    for (const d of dividas ?? []) {
      if (filtro === "abertas" && d.status === "pago") continue;
      if (filtro === "pagas" && d.status !== "pago") continue;
      const termo = busca.trim().toLowerCase();
      if (
        termo &&
        !d.devedorNome.toLowerCase().includes(termo) &&
        !d.devedorEmail.includes(termo) &&
        !d.descricao.toLowerCase().includes(termo)
      )
        continue;
      const g = mapa.get(d.devedorEmail) ?? {
        email: d.devedorEmail,
        nome: d.devedorNome,
        dividas: [],
        emAberto: 0,
        aguardando: 0,
        vencidas: 0,
      };
      g.dividas.push(d);
      if (d.status !== "pago") g.emAberto += d.valor;
      if (d.status === "aguardando_confirmacao") g.aguardando++;
      if (estaVencida(d)) g.vencidas++;
      mapa.set(d.devedorEmail, g);
    }
    return [...mapa.values()].sort((a, b) => b.emAberto - a.emAberto);
  }, [dividas, filtro, busca]);

  // Pessoas selecionáveis: só quem tem conta no site (identificado pelo ID).
  const conhecidos = useMemo(
    () =>
      contas
        .filter((c) => c.email)
        .map((c) => ({
          nome: c.nome,
          email: c.email,
          uid: c.uid,
          pendente: !c.emailVerificado,
        })),
    [contas],
  );

  const pedidos = useMemo(() => agruparPedidos(dividas ?? []), [dividas]);

  if (erro) return <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300 ring-1 ring-rose-400/20">{erro}</p>;
  if (!dividas) return <Carregando />;

  return (
    <div className="animate-entra space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Visão geral</h1>
          <p className="mt-1 text-zinc-500">Quem está devendo, quanto e o que já entrou.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={botaoSecundario + " py-2.5"} onClick={() => setVendoPessoas(true)}>
            <Icone nome="usuarios" /> Pessoas
            <span className="font-mono text-xs text-zinc-500">{contas.length}</span>
          </button>
          <button className={botaoSecundario + " py-2.5"} onClick={() => setEditandoPix(true)}>
            <Icone nome="chave" /> Chave PIX
          </button>
          <button className={botaoSecundario + " py-2.5"} onClick={() => setNovaPara({ nome: "", email: "" })}>
            <Icone nome="mais" /> Dívida avulsa
          </button>
          <button className={botaoPrimario} onClick={() => setNovaCompra("vazia")}>
            <Icone nome="sacola" /> Compra em grupo
          </button>
        </div>
      </div>

      {!config && (
        <button
          onClick={() => setEditandoPix(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-amber-400/10 p-4 text-left text-sm text-amber-200 ring-1 ring-amber-400/20 transition hover:bg-amber-400/15"
        >
          <Icone nome="alerta" className="h-5 w-5 shrink-0" />
          <span>
            <strong>Cadastre sua chave PIX</strong> para que os devedores consigam pagar pelo app.
          </span>
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          titulo="A receber"
          valor={formatarReais(stats.aReceber)}
          icone="carteira"
          tema="vermelho"
          detalhe={stats.vencidas ? `${stats.vencidas} vencida(s)` : "Nenhuma vencida"}
        />
        <Card
          titulo="Para confirmar"
          valor={formatarReais(stats.totalAguardando)}
          icone="relogio"
          tema="azul"
          detalhe={`${stats.aguardando.length} pagamento(s) informado(s)`}
        />
        <Card
          titulo="Recebido"
          valor={formatarReais(stats.recebido)}
          icone="checkCirculo"
          tema="verde"
          detalhe="Total confirmado"
        />
        <Card
          titulo="Devedores ativos"
          valor={String(stats.devedoresAtivos)}
          icone="usuarios"
          tema="roxo"
          detalhe="Com algo em aberto"
        />
      </div>

      {stats.aguardando.length > 0 && (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-[1px] shadow-xl shadow-sky-500/20">
          <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0f1c]/95 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400/100" />
              </span>
              <h2 className="font-semibold">Pagamentos para confirmar</h2>
              <span className="text-sm text-zinc-500">
                — confira no seu banco e confirme
              </span>
            </div>
            <ul className="space-y-2">
              {stats.aguardando.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.03] p-3"
                >
                  <Avatar nome={d.devedorNome} tamanho="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.devedorNome}</p>
                    <p className="truncate text-xs text-zinc-500">{d.descricao}</p>
                  </div>
                  <span className="font-mono font-semibold tabular-nums">{formatarReais(d.valor)}</span>
                  <div className="flex gap-1">
                    <button className={botaoFantasma} onClick={() => reabrir(d)} title="Não recebi">
                      <Icone nome="x" /> Não recebi
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                      onClick={() => confirmar(d)}
                    >
                      <Icone nome="check" /> Confirmar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Modelos</h2>
          <p className="text-sm text-zinc-500">
            Edite e salve à vontade — nada é cobrado até você clicar em “Usar” e depois em “Criar
            cobranças”.
          </p>
        </div>
        {modelos.length > 0 ? (
          modelos.map((m) => (
            <CartaoModelo
              key={m.id}
              modelo={m}
              onEditar={() => setNovaCompra({ modelo: m, modeloId: m.id })}
              onUsar={() => setNovaCompra({ modelo: m })}
              onExcluir={() => {
                if (window.confirm(`Excluir o modelo "${m.titulo}"? As cobranças já criadas não mudam.`))
                  deleteDoc(doc(db(), "modelos", m.id));
              }}
            />
          ))
        ) : (
          // Enquanto nada foi salvo, mostra o exemplo da planilha. Ao editar e salvar, ele vira um modelo seu.
          <CartaoModelo
            modelo={EXEMPLO_COMPRA}
            exemplo
            onEditar={() => setNovaCompra({ modelo: EXEMPLO_COMPRA, modeloId: "exemplo-planilha" })}
            onUsar={() => setNovaCompra({ modelo: EXEMPLO_COMPRA })}
          />
        )}
      </section>

      {pedidos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Compras em grupo</h2>
          {pedidos.map((p) => (
            <CartaoPedido
              key={p.id}
              pedido={p}
              onUsarComoBase={() => setNovaCompra({ modelo: pedidoParaModelo(p) })}
            />
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Por pessoa</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm">
            {(
              [
                ["abertas", "Em aberto"],
                ["todas", "Todas"],
                ["pagas", "Pagas"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                onClick={() => setFiltro(valor)}
                className={`rounded-lg px-4 py-1.5 font-medium transition ${
                  filtro === valor ? "bg-white/10 text-white shadow-[0_0_16px_-6px_rgba(34,211,238,.8)]" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Icone
              nome="busca"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            />
            <input
              className={inputCls + " pl-10"}
              placeholder="Buscar pessoa ou descrição…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {devedores.length === 0 ? (
          <Vazio
            titulo={dividas.length === 0 ? "Nenhuma dívida cadastrada" : "Nada encontrado"}
            texto={
              dividas.length === 0
                ? "Crie uma “Compra em grupo” ou uma “Dívida avulsa” para registrar quem está te devendo."
                : "Tente outro filtro ou termo de busca."
            }
          />
        ) : (
          <div className="space-y-3">
            {devedores.map((g) => (
              <LinhaDevedor
                key={g.email}
                devedor={g}
                onNova={() => setNovaPara({ nome: g.nome, email: g.email })}
              />
            ))}
          </div>
        )}
      </section>

      {novaPara && (
        <ModalNovaDivida
          inicial={novaPara}
          conhecidos={conhecidos}
          onFechar={() => setNovaPara(null)}
        />
      )}
      {novaCompra && (
        <ModalCompraGrupo
          conhecidos={conhecidos}
          modelo={novaCompra === "vazia" ? undefined : novaCompra.modelo}
          modeloId={novaCompra === "vazia" ? undefined : novaCompra.modeloId}
          onFechar={() => setNovaCompra(null)}
        />
      )}
      {vendoPessoas && <ModalPessoas contas={contas} onFechar={() => setVendoPessoas(false)} />}
      {editandoPix && <ModalConfigPix atual={config} onFechar={() => setEditandoPix(false)} />}
    </div>
  );
}

/* ---------- Ações ---------- */

function confirmar(d: Divida) {
  return updateDoc(doc(db(), "dividas", d.id), { status: "pago", pagoEm: serverTimestamp() });
}

function reabrir(d: Divida) {
  return updateDoc(doc(db(), "dividas", d.id), {
    status: "pendente",
    pagoEm: null,
    informadoPagoEm: null,
  });
}

function excluir(d: Divida) {
  if (!window.confirm(`Excluir "${d.descricao}" de ${d.devedorNome}?`)) return;
  return deleteDoc(doc(db(), "dividas", d.id));
}

/* ---------- Linha por devedor ---------- */

function LinhaDevedor({ devedor, onNova }: { devedor: Devedor; onNova: () => void }) {
  const [aberto, setAberto] = useState(false);
  const qtdAbertas = devedor.dividas.filter((d) => d.status !== "pago").length;

  return (
    <div className={`${painel} overflow-hidden transition ${aberto ? "ring-2 ring-cyan-400/20" : ""}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.03] sm:px-5"
      >
        <Avatar nome={devedor.nome} tamanho="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{devedor.nome}</p>
            {devedor.vencidas > 0 && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-400/25">
                {devedor.vencidas} vencida{devedor.vencidas > 1 ? "s" : ""}
              </span>
            )}
            {devedor.aguardando > 0 && (
              <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-400/25">
                {devedor.aguardando} p/ confirmar
              </span>
            )}
          </div>
          <p className="truncate text-sm text-zinc-500">{devedor.email}</p>
        </div>
        <div className="text-right">
          <p
            className={`font-mono text-lg font-semibold tabular-nums ${devedor.emAberto > 0 ? "text-white" : "text-emerald-300"}`}
          >
            {devedor.emAberto > 0 ? formatarReais(devedor.emAberto) : "Quitado"}
          </p>
          <p className="text-xs text-zinc-500">
            {qtdAbertas > 0 ? `${qtdAbertas} em aberto` : `${devedor.dividas.length} paga(s)`}
          </p>
        </div>
        <Icone
          nome="seta"
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="animate-entra border-t border-white/[0.06] bg-black/20 px-4 pb-4 pt-2 sm:px-5">
          <ul className="divide-y divide-white/[0.05]">
            {devedor.dividas.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.descricao}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <BadgeStatus status={d.status} vencida={estaVencida(d)} />
                    <span className="flex items-center gap-1">
                      <Icone nome="calendario" className="h-3 w-3" />
                      {formatarData(d.vencimento)}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-semibold tabular-nums">{formatarReais(d.valor)}</span>
                <div className="flex items-center gap-1">
                  {d.status !== "pago" ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10"
                      onClick={() => confirmar(d)}
                    >
                      <Icone nome="check" /> Recebido
                    </button>
                  ) : (
                    <button className={botaoFantasma} onClick={() => reabrir(d)}>
                      <Icone nome="desfazer" /> Reabrir
                    </button>
                  )}
                  <button
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => excluir(d)}
                    title="Excluir"
                  >
                    <Icone nome="lixeira" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={onNova} className={botaoFantasma + " mt-2 text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"}>
            <Icone nome="mais" /> Adicionar dívida para {devedor.nome.split(" ")[0]}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Modais ---------- */

function ModalNovaDivida({
  inicial,
  conhecidos,
  onFechar,
}: {
  inicial: { nome: string; email: string };
  conhecidos: { nome: string; email: string }[];
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(inicial.nome);
  const [email, setEmail] = useState(inicial.email);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Ao digitar um e-mail já conhecido, preenche o nome automaticamente.
  function mudarEmail(v: string) {
    setEmail(v);
    const achado = conhecidos.find((c) => c.email === v.trim().toLowerCase());
    if (achado && !nome) setNome(achado.nome);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await addDoc(collection(db(), "dividas"), {
        devedorNome: nome.trim(),
        devedorEmail: email.trim().toLowerCase(),
        descricao: descricao.trim(),
        valor: Math.round(numero * 100) / 100,
        vencimento: vencimento || null,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });
      onFechar();
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Nova dívida"
      subtitulo="A pessoa verá a cobrança ao entrar com este e-mail."
      onFechar={onFechar}
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>E-mail do devedor</label>
            <input
              type="email"
              list="devedores-conhecidos"
              className={inputCls}
              value={email}
              onChange={(e) => mudarEmail(e.target.value)}
              placeholder="pessoa@email.com"
              required
              autoFocus={!inicial.email}
            />
            <datalist id="devedores-conhecidos">
              {conhecidos.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.nome}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Nome</label>
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da pessoa"
              required
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input
            className={inputCls}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Pizza de sexta, aluguel de março…"
            required
            autoFocus={!!inicial.email}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Valor</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">
                R$
              </span>
              <input
                inputMode="decimal"
                className={inputCls + " pl-10 tabular-nums"}
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                required
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Vencimento (opcional)</label>
            <input
              type="date"
              className={inputCls}
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </div>
        </div>

        {erro && <p className="text-sm text-rose-300">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={botaoSecundario + " py-2.5"} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando…" : "Salvar dívida"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalConfigPix({ atual, onFechar }: { atual: ConfigPix | null; onFechar: () => void }) {
  const [chave, setChave] = useState(atual?.chave ?? "");
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [cidade, setCidade] = useState(atual?.cidade ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await setDoc(doc(db(), "config", "pix"), {
        chave: chave.trim(),
        nome: nome.trim(),
        cidade: cidade.trim(),
      });
      onFechar();
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Sua chave PIX"
      subtitulo="É para essa chave que os devedores vão pagar."
      onFechar={onFechar}
    >
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className={labelCls}>Chave PIX</label>
          <input
            className={inputCls}
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="CPF, e-mail, +5511999999999 ou chave aleatória"
            required
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Telefone no formato <code className="rounded bg-white/10 px-1">+55DDDNÚMERO</code>; CPF/CNPJ
            só números.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Nome do recebedor</label>
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como aparece no banco"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Cidade</label>
            <input
              className={inputCls}
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="São Paulo"
              required
            />
          </div>
        </div>

        {erro && <p className="text-sm text-rose-300">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={botaoSecundario + " py-2.5"} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando…" : "Salvar chave"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalPessoas({ contas, onFechar }: { contas: Conta[]; onFechar: () => void }) {
  const [copiado, setCopiado] = useState("");

  async function copiar(uid: string) {
    await navigator.clipboard.writeText(uid);
    setCopiado(uid);
    setTimeout(() => setCopiado(""), 1500);
  }

  return (
    <Modal
      titulo="Pessoas cadastradas"
      subtitulo="Todo mundo que já entrou no site. São essas pessoas que você seleciona ao montar uma compra."
      onFechar={onFechar}
      largura="max-w-2xl"
    >
      {contas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
          Ninguém ainda. As pessoas aparecem aqui depois de criar conta e confirmar o e-mail.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10">
          {contas.map((c) => (
            <li key={c.uid} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar nome={c.nome || c.email} tamanho="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                  {c.nome || "Sem nome"}
                  {!c.emailVerificado && (
                    <span
                      title="A pessoa criou a conta mas ainda não clicou no link de confirmação enviado por e-mail (veja o spam). Até confirmar, ela não consegue ver as dívidas."
                      className="rounded-full bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/25"
                    >
                      e-mail não confirmado
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-xs text-zinc-500">{c.email}</p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => copiar(c.uid)}
                  title={`Copiar ID completo: ${c.uid}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-xs text-cyan-300 transition hover:border-cyan-400/40"
                >
                  <Icone nome={copiado === c.uid ? "check" : "copiar"} className="h-3 w-3" />
                  {copiado === c.uid ? "copiado" : `ID ${idCurto(c.uid)}`}
                </button>
                {c.ultimoAcesso && (
                  <p className="mt-1 text-[11px] text-zinc-600">
                    último acesso {c.ultimoAcesso.toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
