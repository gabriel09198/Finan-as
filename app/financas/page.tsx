"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AreaProtegida } from "@/components/AreaProtegida";
import { useAuth } from "@/components/AuthProvider";
import { GraficoCategorias, GraficoMensal } from "@/components/Graficos";
import {
  botaoFantasma,
  botaoPrimario,
  botaoSecundario,
  Carregando,
  Icone,
  inputCls,
  labelCls,
  Modal,
  painel,
  Rotulo,
  Segmentos,
  Vazio,
} from "@/components/ui";
import {
  categorias,
  hojeISO,
  iconeCategoria,
  mesDe,
  nomeMes,
  somarMeses,
  type Mes,
  type TipoTransacao,
  type Transacao,
} from "@/lib/financas";
import { db } from "@/lib/firebase";
import { ouvirMinhasDividas } from "@/lib/minhasDividas";
import { formatarData, formatarReais, type Divida } from "@/lib/tipos";

export default function FinancasPage() {
  return (
    <AreaProtegida papel="todos">
      <Financas />
    </AreaProtegida>
  );
}

type Filtro = "todas" | TipoTransacao;

function Financas() {
  const { usuario, admin } = useAuth();
  const [transacoes, setTransacoes] = useState<Transacao[] | null>(null);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [erro, setErro] = useState("");
  const [mes, setMes] = useState<Mes>(() => mesDe(hojeISO()));
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Transacao | "nova" | null>(null);

  const uid = usuario?.uid;
  const email = usuario?.email?.toLowerCase() ?? "";

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db(), "usuarios", uid, "transacoes"),
      (snap) => setTransacoes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transacao)),
      () => setErro("Não foi possível carregar suas finanças. Confira se as regras do Firestore foram publicadas."),
    );
  }, [uid]);

  // Dívidas entram como um resumo: quem recebe vê o que tem a receber, os demais o que devem.
  useEffect(() => {
    if (!email || !uid) return;
    if (!admin) return ouvirMinhasDividas(email, uid, setDividas, () => setDividas([]));
    return onSnapshot(
      collection(db(), "dividas"),
      (snap) => setDividas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Divida)),
      () => setDividas([]),
    );
  }, [email, uid, admin]);

  const resumo = useMemo(() => {
    const lista = transacoes ?? [];
    const doMes = lista.filter((t) => mesDe(t.data) === mes);
    const soma = (ts: Transacao[], tipo: TipoTransacao) =>
      ts.filter((t) => t.tipo === tipo).reduce((s, t) => s + t.valor, 0);

    const receitas = soma(doMes, "receita");
    const despesas = soma(doMes, "despesa");
    const saldoTotal = soma(lista, "receita") - soma(lista, "despesa");

    const porCategoria = new Map<string, number>();
    for (const t of doMes) {
      if (t.tipo === "despesa") porCategoria.set(t.categoria, (porCategoria.get(t.categoria) ?? 0) + t.valor);
    }
    const categoriasMes = [...porCategoria.entries()]
      .map(([nome, valor]) => ({ nome, valor, icone: iconeCategoria("despesa", nome) }))
      .sort((a, b) => b.valor - a.valor);

    const meses = Array.from({ length: 6 }, (_, i) => somarMeses(mes, i - 5));
    const serie = meses.map((m) => {
      const ts = lista.filter((t) => mesDe(t.data) === m);
      return { mes: m, receitas: soma(ts, "receita"), despesas: soma(ts, "despesa") };
    });

    return { doMes, receitas, despesas, saldo: receitas - despesas, saldoTotal, categoriasMes, serie };
  }, [transacoes, mes]);

  const totalDividas = useMemo(
    () =>
      dividas
        .filter((d) => (admin ? d.status !== "pago" : d.status === "pendente"))
        .reduce((s, d) => s + d.valor, 0),
    [dividas, admin],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return resumo.doMes
      .filter((t) => filtro === "todas" || t.tipo === filtro)
      .filter(
        (t) =>
          !termo ||
          t.descricao.toLowerCase().includes(termo) ||
          t.categoria.toLowerCase().includes(termo),
      )
      .sort(
        (a, b) =>
          b.data.localeCompare(a.data) || (b.criadoEm?.toMillis() ?? 0) - (a.criadoEm?.toMillis() ?? 0),
      );
  }, [resumo.doMes, filtro, busca]);

  if (erro) return <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300 ring-1 ring-rose-400/20">{erro}</p>;
  if (!transacoes) return <Carregando />;

  const economia = resumo.receitas > 0 ? (resumo.saldo / resumo.receitas) * 100 : 0;
  const primeiroNome = usuario?.displayName?.split(" ")[0];

  return (
    <div className="animate-entra space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Rotulo>Painel financeiro</Rotulo>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Olá{primeiroNome ? `, ${primeiroNome}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button className={botaoFantasma} onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
              <Icone nome="esquerda" />
            </button>
            <span className="min-w-36 text-center font-mono text-xs uppercase tracking-[0.15em] text-zinc-200">
              {nomeMes(mes)}
            </span>
            <button className={botaoFantasma} onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
              <Icone nome="direita" />
            </button>
          </div>
          <button className={botaoPrimario} onClick={() => setEditando("nova")}>
            <Icone nome="mais" /> Nova transação
          </button>
        </div>
      </div>

      {/* Destaque + resumos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${painel} overflow-hidden p-6 sm:p-7 lg:col-span-2`}>
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 animate-brilho rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 animate-brilho rounded-full bg-violet-500/20 blur-3xl [animation-delay:-3s]" />
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

          <div className="relative">
            <Rotulo>Saldo do mês</Rotulo>
            <p
              className={`mt-3 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${
                resumo.saldo < 0
                  ? "text-rose-300"
                  : "bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent"
              }`}
            >
              {formatarReais(resumo.saldo)}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Mini rotulo="Receitas" valor={resumo.receitas} cor="var(--color-receita)" icone="sobe" />
              <Mini rotulo="Despesas" valor={resumo.despesas} cor="var(--color-despesa)" icone="desce" />
              <div className="col-span-2 sm:col-span-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Economia</p>
                <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                  {resumo.receitas > 0 ? `${economia.toFixed(0)}%` : "—"}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-700"
                    style={{ width: `${Math.min(Math.max(economia, 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          <div className={`${painel} p-5`}>
            <Rotulo>Saldo acumulado</Rotulo>
            <p
              className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${
                resumo.saldoTotal < 0 ? "text-rose-300" : "text-white"
              }`}
            >
              {formatarReais(resumo.saldoTotal)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Tudo que entrou menos tudo que saiu</p>
          </div>
          <Link
            href={admin ? "/admin" : "/minhas-dividas"}
            className={`${painel} group block p-5 transition hover:border-cyan-400/30`}
          >
            <div className="flex items-center justify-between">
              <Rotulo>{admin ? "A receber" : "Dívidas em aberto"}</Rotulo>
              <Icone
                nome="direita"
                className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300"
              />
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold text-white tabular-nums">
              {formatarReais(totalDividas)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {admin ? "Cobranças ainda não pagas" : "Toque para pagar com PIX"}
            </p>
          </Link>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className={`${painel} p-6 lg:col-span-3`}>
          <h2 className="text-sm font-semibold text-white">Receitas x despesas</h2>
          <p className="mb-5 text-xs text-zinc-500">Últimos 6 meses · clique numa barra para ver o mês</p>
          <GraficoMensal dados={resumo.serie} mesAtual={mes} onEscolherMes={setMes} />
        </section>

        <section className={`${painel} p-6 lg:col-span-2`}>
          <h2 className="text-sm font-semibold text-white">Despesas por categoria</h2>
          <p className="mb-5 text-xs text-zinc-500">{nomeMes(mes)}</p>
          {resumo.categoriasMes.length ? (
            <GraficoCategorias dados={resumo.categoriasMes} />
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">Nenhuma despesa neste mês.</p>
          )}
        </section>
      </div>

      {/* Transações */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Transações</h2>
            <Segmentos
              opcoes={[
                ["todas", "Todas"],
                ["receita", "Receitas"],
                ["despesa", "Despesas"],
              ] as const}
              valor={filtro}
              onChange={setFiltro}
            />
          </div>
          <div className="relative sm:w-64">
            <Icone
              nome="busca"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            />
            <input
              className={inputCls + " pl-10"}
              placeholder="Buscar…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <Vazio
            icone="grafico"
            titulo={resumo.doMes.length ? "Nada encontrado" : "Nenhuma transação neste mês"}
            texto={
              resumo.doMes.length
                ? "Tente outro filtro ou termo de busca."
                : "Registre o que entrou e o que saiu para acompanhar seu saldo."
            }
          />
        ) : (
          <ul className={`${painel} divide-y divide-white/[0.05] overflow-hidden`}>
            {lista.map((t) => (
              <LinhaTransacao key={t.id} t={t} onEditar={() => setEditando(t)} uid={uid!} />
            ))}
          </ul>
        )}
      </section>

      {editando && (
        <ModalTransacao
          uid={uid!}
          atual={editando === "nova" ? null : editando}
          mesPadrao={mes}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function Mini({
  rotulo,
  valor,
  cor,
  icone,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  icone: "sobe" | "desce";
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span className="h-2 w-2 rounded-sm" style={{ background: cor, boxShadow: `0 0 8px ${cor}` }} />
        {rotulo}
      </p>
      <p className="mt-1 flex items-center gap-1 font-mono text-lg font-semibold text-white tabular-nums">
        <Icone nome={icone} className="h-4 w-4 text-zinc-500" />
        {formatarReais(valor)}
      </p>
    </div>
  );
}

function LinhaTransacao({ t, onEditar, uid }: { t: Transacao; onEditar: () => void; uid: string }) {
  const receita = t.tipo === "receita";

  function excluir() {
    if (window.confirm(`Excluir "${t.descricao}"?`)) {
      deleteDoc(doc(db(), "usuarios", uid, "transacoes", t.id));
    }
  }

  return (
    <li className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.03] sm:px-6">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-white/10"
        style={{
          color: receita ? "var(--color-receita)" : "var(--color-despesa)",
          background: receita ? "rgb(14 165 198 / .1)" : "rgb(163 94 232 / .1)",
        }}
      >
        <Icone nome={iconeCategoria(t.tipo, t.categoria)} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-100">{t.descricao}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
          <span>{t.categoria}</span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span className="font-mono">{formatarData(t.data)}</span>
        </p>
      </div>
      <span className="font-mono font-semibold text-zinc-100 tabular-nums">
        {receita ? "+" : "−"} {formatarReais(t.valor)}
      </span>
      <div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <button className={botaoFantasma} onClick={onEditar} title="Editar">
          <Icone nome="lapis" />
        </button>
        <button
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300"
          onClick={excluir}
          title="Excluir"
        >
          <Icone nome="lixeira" />
        </button>
      </div>
    </li>
  );
}

function ModalTransacao({
  uid,
  atual,
  mesPadrao,
  onFechar,
}: {
  uid: string;
  atual: Transacao | null;
  mesPadrao: Mes;
  onFechar: () => void;
}) {
  const hoje = hojeISO();
  const [tipo, setTipo] = useState<TipoTransacao>(atual?.tipo ?? "despesa");
  const [descricao, setDescricao] = useState(atual?.descricao ?? "");
  const [valor, setValor] = useState(atual ? atual.valor.toFixed(2).replace(".", ",") : "");
  const [categoria, setCategoria] = useState(atual?.categoria ?? categorias.despesa[0].nome);
  const [data, setData] = useState(
    atual?.data ?? (mesDe(hoje) === mesPadrao ? hoje : `${mesPadrao}-01`),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function mudarTipo(t: TipoTransacao) {
    setTipo(t);
    if (!categorias[t].some((c) => c.nome === categoria)) setCategoria(categorias[t][0].nome);
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
    const dados = {
      tipo,
      descricao: descricao.trim(),
      valor: Math.round(numero * 100) / 100,
      categoria,
      data,
    };
    try {
      if (atual) {
        await updateDoc(doc(db(), "usuarios", uid, "transacoes", atual.id), dados);
      } else {
        await addDoc(collection(db(), "usuarios", uid, "transacoes"), {
          ...dados,
          criadoEm: serverTimestamp(),
        });
      }
      onFechar();
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={atual ? "Editar transação" : "Nova transação"} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["despesa", "receita"] as const).map((t) => {
            const ativo = tipo === t;
            const cor = t === "receita" ? "var(--color-receita)" : "var(--color-despesa)";
            return (
              <button
                key={t}
                type="button"
                onClick={() => mudarTipo(t)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                  ativo ? "bg-white/[0.06] text-white" : "border-white/10 text-zinc-500 hover:text-zinc-200"
                }`}
                style={ativo ? { borderColor: cor, boxShadow: `0 0 20px -6px ${cor}` } : undefined}
              >
                <Icone nome={t === "receita" ? "sobe" : "desce"} />
                {t === "receita" ? "Receita" : "Despesa"}
              </button>
            );
          })}
        </div>

        <div>
          <label className={labelCls}>Valor</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-zinc-500">
              R$
            </span>
            <input
              inputMode="decimal"
              className={inputCls + " py-3.5 pl-12 font-mono text-2xl tabular-nums"}
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Descrição</label>
          <input
            className={inputCls}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === "receita" ? "Ex.: Salário de outubro" : "Ex.: Mercado"}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Categoria</label>
          <div className="grid grid-cols-3 gap-2">
            {categorias[tipo].map((c) => (
              <button
                key={c.nome}
                type="button"
                onClick={() => setCategoria(c.nome)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs transition ${
                  categoria === c.nome
                    ? "border-cyan-400/60 bg-cyan-400/10 text-white shadow-[0_0_16px_-6px_rgba(34,211,238,.8)]"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                <Icone nome={c.icone} className="h-[18px] w-[18px]" />
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Data</label>
          <input
            type="date"
            className={inputCls + " font-mono"}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        {erro && <p className="text-sm text-rose-300">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={botaoSecundario + " py-2.5"} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
