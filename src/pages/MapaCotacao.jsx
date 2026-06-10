import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import {
  baixarArquivoGerado,
  gerarArquivosMapaCotacao,
} from "../services/mapaCotacaoService";

// =========================================================
// VALORES PADRÃO
// =========================================================

function fornecedorVazio() {
  return {
    empresa: "",
    contato: "",
    telefone: "",
    email: "",
    dataProposta: "",
    precoUnitario: "",
    precoTotal: "",

    frete: "N/A",
    prazoEntrega: "10 DIAS",
    validadeProposta: "15 DIAS",
    condicaoPagamento: "28DDL",
    garantia: "SIM",

    arquivo: null,
  };
}

function dadosIniciais() {
  return {
    ano:
      String(
        new Date().getFullYear()
      ),

    numeroMapa: "",
    identificacaoMapa: "",

    empreendimento:
      "JK 1455",

    departamento:
      "Administração",

    contratante:
      "Marcos Gonçalves",

    contaOrcamentaria:
      "",

    gerenciaResponsavel:
      "Ronaldo Vanni",

    descricaoItem: "",
    quantidade: "1",
    unidade: "UND",
    observacoes: "",
    empresaAprovada: "",

    fornecedorUnico:
      false,

    quantidadeFornecedores:
      3,

    fornecedores: [
      fornecedorVazio(),
      fornecedorVazio(),
      fornecedorVazio(),
    ],
  };
}

// =========================================================
// COMPONENTES DE FORMULÁRIO
// =========================================================

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  className = "",
  inputMode,
}) {
  return (
    <label
      className={
        className
      }
    >
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        inputMode={
          inputMode
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 4,
}) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        rows={rows}
        className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

// =========================================================
// CARD DE FORNECEDOR
// =========================================================

function CardFornecedor({
  indice,
  fornecedor,
  onAlterar,
  onArquivo,
  onRemoverArquivo,
}) {
  const numero =
    indice + 1;

  return (
    <section className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Orçamento{" "}
            {numero}
          </p>

          <h3 className="mt-1 font-black text-slate-900">
            Fornecedor{" "}
            {numero}
          </h3>
        </div>

        {fornecedor.arquivo && (
          <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2
              size={14}
            />

            <span className="truncate">
              {
                fornecedor
                  .arquivo
                  .name
              }
            </span>
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo
          label="Nome da empresa"
          value={
            fornecedor.empresa
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "empresa",
              valor
            )
          }
          placeholder="Ex: Mérito Comercial"
          className="md:col-span-2"
        />

        <Campo
          label="Contato"
          value={
            fornecedor.contato
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "contato",
              valor
            )
          }
          placeholder="Nome do contato"
        />

        <Campo
          label="Telefone"
          value={
            fornecedor.telefone
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "telefone",
              valor
            )
          }
          placeholder="Ex: 11 99999-9999"
        />

        <Campo
          label="E-mail"
          type="email"
          value={
            fornecedor.email
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "email",
              valor
            )
          }
          placeholder="Ex: comercial@empresa.com.br"
        />

        <Campo
          label="Data da proposta"
          type="date"
          value={
            fornecedor.dataProposta
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "dataProposta",
              valor
            )
          }
        />

        <Campo
          label="Preço unitário"
          value={
            fornecedor.precoUnitario
          }
          inputMode="decimal"
          onChange={(
            valor
          ) =>
            onAlterar(
              "precoUnitario",
              valor
            )
          }
          placeholder="Ex: 7.031,13"
        />

        <Campo
          label="Preço total"
          value={
            fornecedor.precoTotal
          }
          inputMode="decimal"
          onChange={(
            valor
          ) =>
            onAlterar(
              "precoTotal",
              valor
            )
          }
          placeholder="Ex: 7.031,13"
        />

        <Campo
          label="Frete"
          value={
            fornecedor.frete
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "frete",
              valor
            )
          }
          placeholder="Ex: N/A, CIF ou 150,00"
        />

        <Campo
          label="Prazo de entrega"
          value={
            fornecedor.prazoEntrega
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "prazoEntrega",
              valor
            )
          }
          placeholder="Ex: 10 DIAS"
        />

        <Campo
          label="Validade da proposta"
          value={
            fornecedor.validadeProposta
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "validadeProposta",
              valor
            )
          }
          placeholder="Ex: 15 DIAS"
        />

        <Campo
          label="Condições de pagamento"
          value={
            fornecedor.condicaoPagamento
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "condicaoPagamento",
              valor
            )
          }
          placeholder="Ex: 28DDL"
        />

        <Campo
          label="Garantia"
          value={
            fornecedor.garantia
          }
          onChange={(
            valor
          ) =>
            onAlterar(
              "garantia",
              valor
            )
          }
          placeholder="Ex: SIM"
          className="md:col-span-2"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50">
          <Paperclip
            size={17}
          />

          {fornecedor.arquivo
            ? "Trocar PDF da proposta"
            : "Anexar PDF da proposta"}

          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(
              event
            ) =>
              onArquivo(
                event
                  .target
                  .files?.[0] ||
                  null
              )
            }
          />
        </label>

        {fornecedor.arquivo && (
          <button
            type="button"
            onClick={
              onRemoverArquivo
            }
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <X
              size={16}
            />

            Remover PDF anexado
          </button>
        )}
      </div>
    </section>
  );
}

// =========================================================
// PÁGINA PRINCIPAL
// =========================================================

export default function MapaCotacao() {
  const [
    dados,
    setDados,
  ] =
    useState(
      dadosIniciais
    );

  const [
    gerando,
    setGerando,
  ] =
    useState(
      false
    );

  const [
    erro,
    setErro,
  ] =
    useState(
      ""
    );

  const [
    resultado,
    setResultado,
  ] =
    useState(
      null
    );

  const fornecedoresVisiveis =
    useMemo(
      () => {
        const quantidade =
          dados.fornecedorUnico
            ? 1
            : Number(
                dados.quantidadeFornecedores ||
                  1
              );

        return dados.fornecedores.slice(
          0,
          quantidade
        );
      },
      [
        dados.fornecedorUnico,
        dados.quantidadeFornecedores,
        dados.fornecedores,
      ]
    );

  const nomesFornecedores =
    fornecedoresVisiveis
      .map(
        (
          fornecedor
        ) =>
          fornecedor
            .empresa
            .trim()
      )
      .filter(
        Boolean
      );

  function alterarCampo(
    campo,
    valor
  ) {
    setDados(
      (
        atual
      ) => ({
        ...atual,

        [campo]:
          valor,
      })
    );

    setResultado(
      null
    );
  }

  function alterarFornecedor(
    indice,
    campo,
    valor
  ) {
    setDados(
      (
        atual
      ) => {
        const empresaAnterior =
          atual
            .fornecedores[
              indice
            ]
            ?.empresa ||
          "";

        const fornecedores =
          atual.fornecedores.map(
            (
              fornecedor,
              posicao
            ) =>
              posicao ===
              indice
                ? {
                    ...fornecedor,

                    [campo]:
                      valor,
                  }
                : fornecedor
          );

        const fornecedorUnicoAtivo =
          atual.fornecedorUnico ||
          Number(
            atual.quantidadeFornecedores
          ) ===
            1;

        const atualizarEmpresaAprovada =
          campo ===
            "empresa" &&
          indice ===
            0 &&
          fornecedorUnicoAtivo &&
          (
            !atual.empresaAprovada ||
            atual.empresaAprovada ===
              empresaAnterior
          );

        return {
          ...atual,

          fornecedores,

          empresaAprovada:
            atualizarEmpresaAprovada
              ? valor
              : atual.empresaAprovada,
        };
      }
    );

    setResultado(
      null
    );
  }

  function alterarArquivo(
    indice,
    arquivo
  ) {
    alterarFornecedor(
      indice,
      "arquivo",
      arquivo
    );
  }

  function removerArquivo(
    indice
  ) {
    alterarFornecedor(
      indice,
      "arquivo",
      null
    );
  }

  function alternarFornecedorUnico() {
    setDados(
      (
        atual
      ) => {
        const novoValor =
          !atual.fornecedorUnico;

        const primeiraEmpresa =
          atual
            .fornecedores[
              0
            ]
            ?.empresa ||
          "";

        return {
          ...atual,

          fornecedorUnico:
            novoValor,

          quantidadeFornecedores:
            novoValor
              ? 1
              : Math.max(
                  2,
                  atual.quantidadeFornecedores
                ),

          empresaAprovada:
            novoValor &&
            primeiraEmpresa
              ? primeiraEmpresa
              : atual.empresaAprovada,
        };
      }
    );

    setResultado(
      null
    );
  }

  function alterarQuantidadeFornecedores(
    valor
  ) {
    const quantidade =
      Number(
        valor
      );

    setDados(
      (
        atual
      ) => {
        const primeiraEmpresa =
          atual
            .fornecedores[
              0
            ]
            ?.empresa ||
          "";

        return {
          ...atual,

          quantidadeFornecedores:
            quantidade,

          empresaAprovada:
            quantidade ===
              1 &&
            primeiraEmpresa
              ? primeiraEmpresa
              : atual.empresaAprovada,
        };
      }
    );

    setResultado(
      null
    );
  }

  function gerarSugestao() {
    const item =
      dados.identificacaoMapa.trim() ||
      dados.descricaoItem.trim() ||
      "item informado";

    const empreendimento =
      dados.empreendimento.trim() ||
      "empreendimento";

    alterarCampo(
      "observacoes",
      `Aquisição de ${item} para atendimento das necessidades operacionais do ${empreendimento}.`
    );
  }

  function validar() {
    if (
      !dados.ano.trim()
    ) {
      return "Informe o ano do mapa.";
    }

    if (
      !dados.numeroMapa.trim()
    ) {
      return "Informe manualmente o número do mapa.";
    }

    if (
      !dados.identificacaoMapa.trim()
    ) {
      return "Informe a identificação resumida do mapa.";
    }

    if (
      !dados.descricaoItem.trim()
    ) {
      return "Informe a descrição do item.";
    }

    if (
      !dados.contaOrcamentaria.trim()
    ) {
      return "Informe a conta orçamentária.";
    }

    if (
      fornecedoresVisiveis.length ===
      0
    ) {
      return "Inclua pelo menos um fornecedor.";
    }

    for (
      let indice = 0;
      indice <
      fornecedoresVisiveis.length;
      indice +=
      1
    ) {
      const fornecedor =
        fornecedoresVisiveis[
          indice
        ];

      if (
        !fornecedor.empresa.trim()
      ) {
        return `Informe a empresa do Orçamento ${
          indice +
          1
        }.`;
      }

      if (
        !fornecedor.precoUnitario.trim() &&
        !fornecedor.precoTotal.trim()
      ) {
        return `Informe o preço unitário ou o preço total do Orçamento ${
          indice +
          1
        }.`;
      }
    }

    return "";
  }

  async function gerarArquivos() {
    const mensagem =
      validar();

    if (
      mensagem
    ) {
      setErro(
        mensagem
      );

      return;
    }

    setGerando(
      true
    );

    setErro(
      ""
    );

    setResultado(
      null
    );

    try {
      const arquivos =
        await gerarArquivosMapaCotacao({
          ...dados,

          fornecedores:
            fornecedoresVisiveis,
        });

      setResultado(
        arquivos
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        error?.message ||
          "Não foi possível gerar os arquivos do mapa de cotação."
      );
    } finally {
      setGerando(
        false
      );
    }
  }

  function limparFormulario() {
    if (
      !window.confirm(
        "Limpar os dados preenchidos e restaurar os valores padrão?"
      )
    ) {
      return;
    }

    setDados(
      dadosIniciais()
    );

    setResultado(
      null
    );

    setErro(
      ""
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet
                size={25}
              />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900">
                Mapa de Cotação
              </h1>

              <p className="text-sm text-slate-500">
                Preencha o mapa, gere o Excel e unifique o PDF com as propostas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              limparFormulario
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Trash2
              size={17}
            />

            Limpar formulário
          </button>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {erro}
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="font-black text-slate-900">
          Identificação do mapa
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Campo
            label="Ano"
            value={
              dados.ano
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "ano",
                valor
              )
            }
            placeholder="2026"
          />

          <Campo
            label="Número do mapa"
            value={
              dados.numeroMapa
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "numeroMapa",
                valor
              )
            }
            placeholder="Ex: 001"
          />

          <Campo
            label="Identificação resumida"
            value={
              dados.identificacaoMapa
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "identificacaoMapa",
                valor
              )
            }
            placeholder="Ex: Bomba Jockey 5MA5-T"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-black text-slate-900">
            Dados gerais
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Os dados recorrentes já estão preenchidos. Altere apenas quando necessário.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Campo
            label="Empreendimento"
            value={
              dados.empreendimento
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "empreendimento",
                valor
              )
            }
          />

          <Campo
            label="Departamento"
            value={
              dados.departamento
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "departamento",
                valor
              )
            }
          />

          <Campo
            label="Contratante"
            value={
              dados.contratante
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "contratante",
                valor
              )
            }
          />

          <Campo
            label="Conta Orçamentária"
            value={
              dados.contaOrcamentaria
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "contaOrcamentaria",
                valor
              )
            }
            placeholder="Preenchimento obrigatório"
          />

          <Campo
            label="Gerência Responsável"
            value={
              dados.gerenciaResponsavel
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "gerenciaResponsavel",
                valor
              )
            }
          />

          <label>
            <span className="text-sm font-bold text-slate-700">
              Empresa aprovada
            </span>

            <select
              value={
                dados.empresaAprovada
              }
              onChange={(
                event
              ) =>
                alterarCampo(
                  "empresaAprovada",
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                Selecione após preencher os fornecedores
              </option>

              {nomesFornecedores.map(
                (
                  nome
                ) => (
                  <option
                    key={
                      nome
                    }
                    value={
                      nome
                    }
                  >
                    {nome}
                  </option>
                )
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="font-black text-slate-900">
            Item cotado
          </h2>

          <button
            type="button"
            onClick={
              gerarSugestao
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 hover:bg-violet-100"
          >
            <Sparkles
              size={16}
            />

            Gerar sugestão de observação
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_120px]">
          <Campo
            label="Descrição do item"
            value={
              dados.descricaoItem
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "descricaoItem",
                valor
              )
            }
            placeholder="Ex: Bomba Jacuzzi 5MA5-T 5CV"
          />

          <Campo
            label="Quantidade"
            value={
              dados.quantidade
            }
            inputMode="decimal"
            onChange={(
              valor
            ) =>
              alterarCampo(
                "quantidade",
                valor
              )
            }
            placeholder="1"
          />

          <Campo
            label="Unidade"
            value={
              dados.unidade
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "unidade",
                valor
              )
            }
            placeholder="UND"
          />
        </div>

        <div className="mt-4">
          <CampoTexto
            label="Observações"
            value={
              dados.observacoes
            }
            onChange={(
              valor
            ) =>
              alterarCampo(
                "observacoes",
                valor
              )
            }
            placeholder="Use a sugestão gerada ou escreva livremente."
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-black text-slate-900">
              Fornecedores
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Preencha até três propostas. Os dados comerciais padrão permanecem editáveis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={
                  dados.fornecedorUnico
                }
                onChange={
                  alternarFornecedorUnico
                }
              />

              Fornecedor único
            </label>

            {!dados.fornecedorUnico && (
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                Quantidade:

                <select
                  value={
                    dados.quantidadeFornecedores
                  }
                  onChange={(
                    event
                  ) =>
                    alterarQuantidadeFornecedores(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value={1}>
                    1
                  </option>

                  <option value={2}>
                    2
                  </option>

                  <option value={3}>
                    3
                  </option>
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {fornecedoresVisiveis.map(
            (
              fornecedor,
              indice
            ) => (
              <CardFornecedor
                key={
                  indice
                }
                indice={
                  indice
                }
                fornecedor={
                  fornecedor
                }
                onAlterar={(
                  campo,
                  valor
                ) =>
                  alterarFornecedor(
                    indice,
                    campo,
                    valor
                  )
                }
                onArquivo={(
                  arquivo
                ) =>
                  alterarArquivo(
                    indice,
                    arquivo
                  )
                }
                onRemoverArquivo={() =>
                  removerArquivo(
                    indice
                  )
                }
              />
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-black text-emerald-950">
              Gerar arquivos
            </h2>

            <p className="mt-1 text-sm text-emerald-800">
              O sistema gera o Excel preenchido, o PDF do mapa e o PDF final com as propostas anexadas.
            </p>
          </div>

          <button
            type="button"
            onClick={
              gerarArquivos
            }
            disabled={
              gerando
            }
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {gerando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Plus
                size={18}
              />
            )}

            {gerando
              ? "Gerando arquivos..."
              : "Gerar mapa de cotação"}
          </button>
        </div>
      </section>

      {resultado && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="text-emerald-600"
              size={20}
            />

            <h2 className="font-black text-slate-900">
              Arquivos gerados com sucesso
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {
              resultado.nomeBase
            }
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                baixarArquivoGerado(
                  resultado.excel
                )
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-100"
            >
              <FileSpreadsheet
                size={18}
              />

              Baixar Excel preenchido
            </button>

            <button
              type="button"
              onClick={() =>
                baixarArquivoGerado(
                  resultado.pdfMapa
                )
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 hover:bg-blue-100"
            >
              <FileText
                size={18}
              />

              Baixar PDF do mapa
            </button>

            <button
              type="button"
              onClick={() =>
                baixarArquivoGerado(
                  resultado.pdfCompleto
                )
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-800 hover:bg-violet-100"
            >
              <Download
                size={18}
              />

              Baixar PDF com propostas
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
