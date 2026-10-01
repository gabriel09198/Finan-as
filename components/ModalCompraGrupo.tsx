"use client";

import { collection, doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { calcularCompra, somarMesesData, type ModeloCompra, type ParticipanteRascunho } from "@/lib/compras";
import { db } from "@/lib/firebase";
import { hojeISO } from "@/lib/financas";
import { formatarData, formatarReais, lerValor, type ItemValor } from "@/lib/tipos";
import {
  Avatar,
  botaoFantasma,
  botaoPrimario,
  botaoSecundario,
  Icone,
  inputCls,
  labelCls,
  Modal,
  Rotulo,
} from "./ui";

interface LinhaTexto {
  descricao: string;
  valor: string;
}

interface PessoaForm {
  chave: number;
  nome: string;
  email: string;
  uid: string; // "" = sem conta ligada
  itens: LinhaTexto[];
  parcelas: string; // "" = usa o padrão da compra
}

export interface PessoaConhecida {
  nome: string;
  email: string;
  /** ID da conta no site; ausente para quem só foi cobrado por e-mail. */
  uid?: string;
  /** Criou conta mas ainda não confirmou o e-mail. */
  pendente?: boolean;
}

/** "a1b2c3…" — começo do ID, só para identificar visualmente. */
export const idCurto = (uid: string) => uid.slice(0, 6) + "…";

const paraTexto = (v: number) => (v > 0 ? v.toFixed(2).replace(".", ",") : "");

let proximaChave = 1;
const novaPessoa = (base?: ParticipanteRascunho): PessoaForm => ({
  chave: proximaChave++,
  nome: base?.nome ?? "",
  email: base?.email ?? "",
  uid: base?.uid ?? "",
  itens: base?.itens.length
    ? base.itens.map((i) => ({ descricao: i.descricao, valor: paraTexto(i.valor) }))
    : [{ descricao: "", valor: "" }],
  parcelas: base?.parcelas ? String(base.parcelas) : "",
});

const mesmoNome = (a: string, b: string) => {
  const n = (x: string) => x.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !!a.trim() && !!b.trim() && (n(a) === n(b) || n(a).split(" ")[0] === n(b).split(" ")[0]);
};

const limitarParcelas = (texto: string) => Math.min(Math.max(parseInt(texto) || 1, 1), 24);

function paraItens(linhas: LinhaTexto[]): ItemValor[] {
  return linhas
    .map((l) => ({ descricao: l.descricao.trim(), valor: lerValor(l.valor) }))
    .filter((l) => l.descricao && Number.isFinite(l.valor) && l.valor > 0);
}

/** Converte texto colado da planilha ("Shanks x2   159,8" por linha) em itens. */
function lerListaColada(texto: string): LinhaTexto[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const m = linha.match(/^(.*?)[\s\t;:|-]+(?:R\$\s*)?(\d[\d.]*(?:,\d+)?|\d+(?:\.\d+)?)\s*$/);
      return m ? { descricao: m[1].trim(), valor: m[2] } : { descricao: linha, valor: "" };
    })
    .filter((l) => l.descricao);
}

function primeiroVencimentoPadrao(): string {
  // Começo do mês que vem, como na planilha ("pagar no começo de…").
  const proximo = somarMesesData(hojeISO(), 1);
  return `${proximo.slice(0, 7)}-05`;
}

export function ModalCompraGrupo({
  conhecidos,
  modelo,
  modeloId,
  onFechar,
}: {
  /** Pessoas que podem ser selecionadas (contas do site + quem já foi cobrado). */
  conhecidos: PessoaConhecida[];
  /** Pré-preenche o formulário (modelo salvo, exemplo da planilha ou "com base nesta"). */
  modelo?: ModeloCompra;
  /** Quando vem de um modelo salvo: "Salvar modelo" atualiza esse documento. */
  modeloId?: string;
  onFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(modelo?.titulo ?? "");
  const [vencimento, setVencimento] = useState(() => {
    const v = modelo?.primeiroVencimento;
    return v && v >= hojeISO() ? v : primeiroVencimentoPadrao();
  });
  const [numParcelas, setNumParcelas] = useState(String(modelo?.numParcelas ?? 6));
  const [custos, setCustos] = useState<LinhaTexto[]>(() =>
    modelo?.custos.length
      ? modelo.custos.map((c) => ({ descricao: c.descricao, valor: paraTexto(c.valor) }))
      : [{ descricao: "Frete", valor: "" }],
  );
  const [pessoas, setPessoas] = useState<PessoaForm[]>(() =>
    modelo?.participantes.length ? modelo.participantes.map((p) => novaPessoa(p)) : [novaPessoa()],
  );
  const [observacoes, setObservacoes] = useState(modelo?.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const parcelas = limitarParcelas(numParcelas);

  const calculo = useMemo(
    () =>
      calcularCompra(
        pessoas.map((p) => ({
          nome: p.nome.trim(),
          email: p.email.trim().toLowerCase(),
          uid: p.uid || null,
          itens: paraItens(p.itens),
          parcelas: p.parcelas ? limitarParcelas(p.parcelas) : undefined,
        })),
        paraItens(custos),
        parcelas,
        vencimento || primeiroVencimentoPadrao(),
      ),
    [pessoas, custos, parcelas, vencimento],
  );

  const totalGeral = calculo.reduce((s, p) => s + p.total, 0);
  const totalCobrancas = calculo.reduce((s, p) => s + p.parcelas.length, 0);
  const totalCustos = paraItens(custos).reduce((s, c) => s + c.valor, 0);

  function atualizarPessoa(chave: number, mudar: (p: PessoaForm) => PessoaForm) {
    setPessoas((ps) => ps.map((p) => (p.chave === chave ? mudar(p) : p)));
  }

  const emailsSelecionados = new Set(pessoas.map((p) => p.email.trim().toLowerCase()).filter(Boolean));

  function alternarPessoa(c: PessoaConhecida) {
    const atual = pessoas.find((p) => p.email.trim().toLowerCase() === c.email);
    if (atual) {
      const temItens = atual.itens.some((i) => i.descricao || i.valor);
      if (temItens && !window.confirm(`Tirar ${c.nome || c.email} da compra? Os itens dessa pessoa somem do formulário.`)) return;
      setPessoas((ps) => {
        const resto = ps.filter((p) => p.chave !== atual.chave);
        return resto.length ? resto : [novaPessoa()];
      });
      return;
    }
    setPessoas((ps) => {
      // Se o modelo já tem alguém com esse nome e sem conta ligada, só liga; senão cria um cartão.
      const semConta = ps.find((p) => !p.email && mesmoNome(p.nome, c.nome));
      if (semConta) return ps.map((p) => (p === semConta ? { ...p, email: c.email, uid: c.uid ?? "", nome: p.nome || c.nome } : p));
      const vazio = ps.find((p) => !p.email && !p.nome && !p.itens.some((i) => i.descricao || i.valor));
      if (vazio) return ps.map((p) => (p === vazio ? { ...p, email: c.email, uid: c.uid ?? "", nome: c.nome } : p));
      return [...ps, novaPessoa({ nome: c.nome, email: c.email, uid: c.uid, itens: [] })];
    });
  }

  /** Guarda o formulário como modelo (sem criar cobranças). E-mails são opcionais aqui. */
  async function salvarModelo() {
    setErro("");
    setAviso("");
    if (!titulo.trim()) return setErro("Dê um nome para o modelo.");
    const dados: ModeloCompra & { atualizadoEm: unknown } = {
      titulo: titulo.trim(),
      numParcelas: parcelas,
      primeiroVencimento: vencimento || primeiroVencimentoPadrao(),
      custos: paraItens(custos),
      observacoes: observacoes.trim(),
      participantes: pessoas
        .filter((p) => p.nome.trim() || p.email.trim())
        .map((p) => ({
          nome: p.nome.trim(),
          email: p.email.trim().toLowerCase(),
          uid: p.uid || null,
          itens: paraItens(p.itens),
          parcelas: p.parcelas ? limitarParcelas(p.parcelas) : null,
        })),
      atualizadoEm: serverTimestamp(),
    };
    setSalvando(true);
    try {
      await setDoc(modeloId ? doc(db(), "modelos", modeloId) : doc(collection(db(), "modelos")), dados);
      onFechar();
    } catch {
      setErro("Não foi possível salvar o modelo. Confira se as regras do Firestore foram publicadas.");
      setSalvando(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!titulo.trim()) return setErro("Dê um nome para a compra.");
    const emails = new Set<string>();
    for (const p of calculo) {
      if (!p.uid)
        return setErro(`Selecione na lista de pessoas quem é ${p.nome || "cada participante"}.`);
      if (emails.has(p.email)) return setErro(`O e-mail ${p.email} aparece duas vezes.`);
      emails.add(p.email);
      if (p.itens.length === 0) return setErro(`${p.nome} não tem nenhum item com valor.`);
    }

    setSalvando(true);
    try {
      const pedidoId = doc(collection(db(), "dividas")).id;
      const batch = writeBatch(db());
      for (const p of calculo) {
        const qtd = p.parcelas.length;
        for (const parcela of p.parcelas) {
          batch.set(doc(collection(db(), "dividas")), {
            devedorNome: p.nome,
            devedorEmail: p.email,
            devedorUid: p.uid ?? null,
            descricao:
              qtd > 1 ? `${titulo.trim()} · parcela ${parcela.numero}/${qtd}` : titulo.trim(),
            valor: parcela.valor,
            vencimento: parcela.vencimento,
            status: "pendente",
            criadoEm: serverTimestamp(),
            pedidoId,
            pedidoTitulo: titulo.trim(),
            parcela: parcela.numero,
            totalParcelas: qtd,
            itens: p.itens,
            custos: p.custos,
            totalCompra: p.total,
            pedidoObservacoes: observacoes.trim(),
          });
        }
      }
      await batch.commit();
      onFechar();
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={modeloId ? "Editar modelo" : modelo ? "Nova compra (a partir de modelo)" : "Nova compra em grupo"}
      subtitulo="Cada pessoa paga os próprios itens + uma parte igual dos custos. Salve como modelo para editar depois, ou crie as cobranças."
      onFechar={onFechar}
      largura="max-w-4xl"
    >
      <form onSubmit={salvar} className="space-y-7">
        {/* Dados gerais */}
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className={labelCls}>Nome da compra</label>
            <input
              className={inputCls}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Pedido de cartas — setembro"
              required
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Parcelas (padrão)</label>
            <input
              type="number"
              min={1}
              max={24}
              className={inputCls + " font-mono"}
              value={numParcelas}
              onChange={(e) => setNumParcelas(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>1ª parcela vence</label>
            <input
              type="date"
              className={inputCls + " font-mono"}
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Custos compartilhados */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Rotulo>Custos divididos igualmente</Rotulo>
            {pessoas.length > 0 && totalCustos > 0 && (
              <span className="font-mono text-xs text-zinc-400">
                {formatarReais(totalCustos)} ÷ {pessoas.length} ={" "}
                <span className="text-zinc-100">{formatarReais(totalCustos / pessoas.length)}</span> cada
              </span>
            )}
          </div>
          <div className="space-y-2">
            {custos.map((c, i) => (
              <LinhaItem
                key={i}
                linha={c}
                placeholder="Ex.: Frete, taxa de conveniência"
                onChange={(nova) => setCustos((cs) => cs.map((x, k) => (k === i ? nova : x)))}
                onRemover={() => setCustos((cs) => cs.filter((_, k) => k !== i))}
              />
            ))}
          </div>
          <button
            type="button"
            className={botaoFantasma + " mt-2"}
            onClick={() => setCustos((cs) => [...cs, { descricao: "", valor: "" }])}
          >
            <Icone nome="mais" /> Adicionar custo
          </button>
        </section>

        {/* Quem participa */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <Rotulo>Quem participa</Rotulo>
            <span className="font-mono text-xs text-zinc-500">{emailsSelecionados.size} selecionado(s)</span>
          </div>
          {conhecidos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-zinc-500">
              Ninguém disponível ainda. Cada pessoa aparece aqui depois de criar conta no site e
              confirmar o e-mail (você também). Se alguém já entrou e não aparece, confira se as
              regras do Firestore foram publicadas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conhecidos.map((c) => {
                const ativo = emailsSelecionados.has(c.email);
                return (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => alternarPessoa(c)}
                    title={c.uid ? `${c.email} · ID ${c.uid}` : c.email}
                    className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
                      ativo
                        ? "border-cyan-400/60 bg-cyan-400/10 text-white shadow-[0_0_16px_-6px_rgba(34,211,238,.8)]"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                    }`}
                  >
                    <Avatar nome={c.nome || c.email} tamanho="h-6 w-6 text-[10px]" />
                    {c.nome || c.email}
                    {c.pendente && (
                      <span title="Ainda não confirmou o e-mail" className="text-amber-300">
                        !
                      </span>
                    )}
                    {ativo && <Icone nome="check" className="h-3.5 w-3.5 text-cyan-300" />}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Participantes */}
        <section>
          <Rotulo className="mb-3">Itens de cada participante</Rotulo>
          <div className="grid gap-4 md:grid-cols-2">
            {pessoas.map((p, idx) => (
              <CartaoPessoa
                key={p.chave}
                pessoa={p}
                calculo={calculo[idx]}
                parcelasPadrao={parcelas}
                conhecidos={conhecidos.filter(
                  (c) => c.email === p.email.trim().toLowerCase() || !emailsSelecionados.has(c.email),
                )}
                podeRemover={pessoas.length > 1}
                onChange={(mudar) => atualizarPessoa(p.chave, mudar)}
                onRemover={() => setPessoas((ps) => ps.filter((x) => x.chave !== p.chave))}
              />
            ))}
            <button
              type="button"
              onClick={() => setPessoas((ps) => [...ps, novaPessoa()])}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-sm text-zinc-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.04] hover:text-cyan-200"
            >
              <Icone nome="mais" className="h-5 w-5" />
              Adicionar participante
            </button>
          </div>
        </section>

        {/* Observações */}
        <section>
          <Rotulo className="mb-2">Observações</Rotulo>
          <textarea
            className={inputCls + " h-24 resize-y text-sm"}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder={"Anotações da compra, uma por linha (não entram nos totais).\nEx.: Idel deve + 10 reais pelo Shanks"}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Aparecem para todos que participam da compra. Não alteram os valores.
          </p>
        </section>

        {/* Resumo */}
        <div className="sticky -bottom-6 -mx-6 -mb-6 border-t border-white/10 bg-[#0a0f1c]/95 px-6 py-4 backdrop-blur">
          {erro && <p className="mb-3 text-sm text-rose-300">{erro}</p>}
          {aviso && <p className="mb-3 text-sm text-cyan-200">{aviso}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Total da compra</p>
                <p className="font-mono text-xl font-semibold text-white tabular-nums">{formatarReais(totalGeral)}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Cobranças</p>
                <p className="font-mono text-xl font-semibold text-white tabular-nums">
                  {totalCobrancas}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className={botaoFantasma} onClick={onFechar}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                className={botaoSecundario + " py-2.5"}
                onClick={salvarModelo}
              >
                <Icone nome="check" /> Salvar modelo
              </button>
              <button type="submit" disabled={salvando} className={botaoPrimario}>
                {salvando ? "Salvando…" : "Criar cobranças"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function LinhaItem({
  linha,
  placeholder,
  onChange,
  onRemover,
}: {
  linha: LinhaTexto;
  placeholder: string;
  onChange: (l: LinhaTexto) => void;
  onRemover: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        className={inputCls + " py-2"}
        value={linha.descricao}
        onChange={(e) => onChange({ ...linha, descricao: e.target.value })}
        placeholder={placeholder}
      />
      <div className="relative w-32 shrink-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">
          R$
        </span>
        <input
          inputMode="decimal"
          className={inputCls + " py-2 pl-9 font-mono tabular-nums"}
          value={linha.valor}
          onChange={(e) => onChange({ ...linha, valor: e.target.value.replace(/[^\d.,]/g, "") })}
          placeholder="0,00"
        />
      </div>
      <button
        type="button"
        onClick={onRemover}
        className="shrink-0 rounded-lg px-2 text-zinc-600 transition hover:bg-rose-500/10 hover:text-rose-300"
        title="Remover"
      >
        <Icone nome="x" />
      </button>
    </div>
  );
}

function CartaoPessoa({
  pessoa,
  calculo,
  parcelasPadrao,
  conhecidos,
  podeRemover,
  onChange,
  onRemover,
}: {
  pessoa: PessoaForm;
  calculo: ReturnType<typeof calcularCompra>[number];
  parcelasPadrao: number;
  conhecidos: PessoaConhecida[];
  podeRemover: boolean;
  onChange: (mudar: (p: PessoaForm) => PessoaForm) => void;
  onRemover: () => void;
}) {
  const [colando, setColando] = useState(false);
  const [textoColado, setTextoColado] = useState("");

  function escolher(valor: string) {
    const c = conhecidos.find((x) => x.email === valor);
    if (c) onChange((p) => ({ ...p, email: c.email, uid: c.uid ?? "", nome: p.nome || c.nome }));
  }

  const vinculada = !!pessoa.email.trim();
  const conta = conhecidos.find((c) => c.email === pessoa.email.trim().toLowerCase());

  function aplicarColagem() {
    const novos = lerListaColada(textoColado);
    if (novos.length) {
      onChange((p) => ({
        ...p,
        itens: [...p.itens.filter((i) => i.descricao || i.valor), ...novos],
      }));
    }
    setTextoColado("");
    setColando(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar nome={pessoa.nome || pessoa.email || "?"} tamanho="h-9 w-9" />
        {vinculada ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{pessoa.nome || conta?.nome || pessoa.email}</p>
            <p className="flex items-center gap-2 truncate font-mono text-[11px] text-zinc-500">
              {pessoa.uid ? (
                <span title={`ID ${pessoa.uid} · ${pessoa.email}`} className="text-cyan-300/80">
                  ID {idCurto(pessoa.uid)}
                </span>
              ) : (
                pessoa.email
              )}
              <button
                type="button"
                className="text-cyan-400 hover:text-cyan-300"
                onClick={() => onChange((p) => ({ ...p, email: "", uid: "" }))}
              >
                trocar
              </button>
            </p>
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-1">
            {pessoa.nome && <p className="truncate text-sm font-medium text-white">{pessoa.nome}</p>}
            <select className={inputCls + " py-2"} value="" onChange={(e) => escolher(e.target.value)}>
              <option value="" disabled>
                {pessoa.nome ? `Quem é ${pessoa.nome}? Escolher pessoa…` : "Escolher pessoa…"}
              </option>
              {conhecidos.map((c) => (
                <option key={c.email} value={c.email}>
                  {(c.nome || c.email) +
                    (c.uid ? ` · ID ${idCurto(c.uid)}` : "") +
                    (c.pendente ? " · e-mail não confirmado" : "")}
                </option>
              ))}
              {conhecidos.length === 0 && (
                <option value="" disabled>
                  Ninguém disponível — a pessoa precisa entrar no site
                </option>
              )}
            </select>
          </div>
        )}
        {podeRemover && (
          <button type="button" onClick={onRemover} className={botaoFantasma} title="Remover participante">
            <Icone nome="lixeira" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {pessoa.itens.map((item, i) => (
          <LinhaItem
            key={i}
            linha={item}
            placeholder="Item (ex.: Shanks x2)"
            onChange={(nova) =>
              onChange((p) => ({ ...p, itens: p.itens.map((x, k) => (k === i ? nova : x)) }))
            }
            onRemover={() => onChange((p) => ({ ...p, itens: p.itens.filter((_, k) => k !== i) }))}
          />
        ))}
      </div>

      {colando ? (
        <div className="mt-3 space-y-2">
          <textarea
            className={inputCls + " h-28 resize-none font-mono text-xs"}
            value={textoColado}
            onChange={(e) => setTextoColado(e.target.value)}
            placeholder={"Cole da planilha, um item por linha:\nShanks x2\t159,8\nLaw líder\t8,9"}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" className={botaoSecundario} onClick={aplicarColagem}>
              <Icone nome="check" /> Adicionar itens
            </button>
            <button type="button" className={botaoFantasma} onClick={() => setColando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            className={botaoFantasma}
            onClick={() => onChange((p) => ({ ...p, itens: [...p.itens, { descricao: "", valor: "" }] }))}
          >
            <Icone nome="mais" /> Item
          </button>
          <button type="button" className={botaoFantasma} onClick={() => setColando(true)}>
            <Icone nome="copiar" /> Colar lista
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <span>Parcelas desta pessoa:</span>
        <input
          type="number"
          min={1}
          max={24}
          className={inputCls + " w-20 py-1 font-mono text-xs"}
          value={pessoa.parcelas}
          onChange={(e) => onChange((p) => ({ ...p, parcelas: e.target.value }))}
          placeholder={String(parcelasPadrao)}
        />
        {!pessoa.parcelas && <span className="text-zinc-600">(padrão)</span>}
      </div>

      {/* Mini-resumo da pessoa, igual ao rodapé de cada coluna da planilha */}
      <dl className="mt-4 space-y-1 border-t border-white/[0.06] pt-3 font-mono text-xs">
        <div className="flex justify-between text-zinc-400">
          <dt>Itens ({calculo.itens.length})</dt>
          <dd className="text-zinc-200">{formatarReais(calculo.subtotal)}</dd>
        </div>
        {calculo.custos.map((c) => (
          <div key={c.descricao} className="flex justify-between text-zinc-400">
            <dt>{c.descricao}</dt>
            <dd className="text-zinc-200">{formatarReais(c.valor)}</dd>
          </div>
        ))}
        <div className="flex justify-between pt-1 text-sm">
          <dt className="text-zinc-300">Total a pagar</dt>
          <dd className="font-semibold text-white">{formatarReais(calculo.total)}</dd>
        </div>
        {calculo.parcelas.length > 1 ? (
          <div className="flex justify-between text-cyan-200/80">
            <dt>{calculo.parcelas.length} parcelas de</dt>
            <dd>
              {formatarReais(calculo.parcelas[0]?.valor ?? 0)}
              <span className="ml-1 text-zinc-500">· 1ª {formatarData(calculo.parcelas[0]?.vencimento ?? null)}</span>
            </dd>
          </div>
        ) : (
          <div className="flex justify-between text-cyan-200/80">
            <dt>À vista</dt>
            <dd>vence {formatarData(calculo.parcelas[0]?.vencimento ?? null)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
