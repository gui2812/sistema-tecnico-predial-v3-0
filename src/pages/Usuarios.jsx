import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Edit,
  Plus,
  RefreshCcw,
  Save,
  Shield,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import {
  atualizarUsuarioSupabase,
  criarUsuarioSupabase,
  excluirUsuarioSupabase,
  listarUsuariosSupabase,
} from "../services/usuariosSupabaseService";

const PERMISSIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "pendencias",
    label: "Pendências",
  },
  {
    id: "solicitacoes",
    label: "Solicitação de Material",
  },
  {
    id: "mapaCotacao",
    label: "Mapa de Cotação",
  },
  {
    id: "mapa3d",
    label: "Mapa 3D — Gestão completa",
  },
  {
    id: "jk1455",
    label: "JK 1455 — Consulta técnica",
  },
  {
    id: "climas",
    label: "Climas",
  },
  {
    id: "calculadora",
    label: "Calculadora Elétrica",
  },
  {
    id: "tecnicos",
    label: "Cálculos Técnicos",
  },
  {
    id: "geradores",
    label: "Geradores",
  },
  {
    id: "locatarios",
    label: "Energia dos Locatários",
  },
  {
    id: "malote",
    label: "Malote",
  },
  {
    id: "rateioAgua",
    label: "Rateio de Água",
  },
  {
    id: "historico",
    label: "Histórico",
  },
  {
    id: "relatorios",
    label: "Relatórios PDF",
  },
  {
    id: "usuarios",
    label: "Usuários e Permissões",
  },
];

const AREAS_SOLICITACAO_MATERIAL = [
  "Civil",
  "Mecânica",
  "Elétrica",
  "Hidráulica",
  "Limpeza",
  "BMS",
  "Segurança",
  "Incêndio",
  "Jardinagem",
  "Administrativo",
  "Outros",
];

const PREFIXO_AREA_SOLICITACAO =
  "solicitacoes.area.";

const PERMISSAO_LOCAL_OBRIGATORIO =
  "solicitacoes.localObrigatorio";

function permissaoArea(
  area
) {
  return `${PREFIXO_AREA_SOLICITACAO}${area}`;
}

function obterAreasSolicitacao(
  permissoes = []
) {
  return (
    Array.isArray(
      permissoes
    )
      ? permissoes
      : []
  )
    .filter(
      (permissao) =>
        String(
          permissao
        ).startsWith(
          PREFIXO_AREA_SOLICITACAO
        )
    )
    .map(
      (permissao) =>
        String(
          permissao
        ).replace(
          PREFIXO_AREA_SOLICITACAO,
          ""
        )
    );
}

function localAplicacaoObrigatorio(
  permissoes = []
) {
  return (
    Array.isArray(
      permissoes
    )
      ? permissoes
      : []
  ).includes(
    PERMISSAO_LOCAL_OBRIGATORIO
  );
}

function permissoesTela(
  permissoes = []
) {
  return (
    Array.isArray(
      permissoes
    )
      ? permissoes
      : []
  ).filter(
    (permissao) =>
      !String(
        permissao
      ).startsWith(
        PREFIXO_AREA_SOLICITACAO
      ) &&
      permissao !==
        PERMISSAO_LOCAL_OBRIGATORIO
  );
}

function configuracoesSolicitacao(
  permissoes = []
) {
  return (
    Array.isArray(
      permissoes
    )
      ? permissoes
      : []
  ).filter(
    (permissao) =>
      String(
        permissao
      ).startsWith(
        PREFIXO_AREA_SOLICITACAO
      ) ||
      permissao ===
        PERMISSAO_LOCAL_OBRIGATORIO
  );
}

const PROFILE_PRESETS = {
  admin:
    PERMISSIONS.map(
      (permissao) =>
        permissao.id
    ),

  administrador:
    PERMISSIONS.map(
      (permissao) =>
        permissao.id
    ),

  lider: [
    "solicitacoes",
  ],

  tecnico: [
    "dashboard",
    "pendencias",
    "jk1455",
    "climas",
    "calculadora",
    "tecnicos",
    "geradores",
    "locatarios",
    "historico",
    "relatorios",
  ],

  consulta: [
    "dashboard",
    "jk1455",
    "historico",
    "relatorios",
  ],
};

const USUARIO_VAZIO = {
  nome: "",
  usuario: "",
  senha: "",
  setor: "",
  perfil: "lider",
  ativo: true,
  permissoes: [
    "solicitacoes",
    permissaoArea(
      "Elétrica"
    ),
  ],
};

function normalizarPerfil(
  perfil
) {
  if (
    perfil ===
    "administrador"
  ) {
    return "admin";
  }

  return (
    perfil ||
    "lider"
  );
}

function normalizarUsuario(
  usuario
) {
  const perfil =
    normalizarPerfil(
      usuario.perfil
    );

  return {
    ...usuario,
    perfil,

    permissoes:
      Array.isArray(
        usuario.permissoes
      )
        ? usuario.permissoes.map(
            (permissao) => {
              if (
                permissao ===
                "energia"
              ) {
                return "locatarios";
              }

              if (
                permissao ===
                "calculos_tecnicos"
              ) {
                return "tecnicos";
              }

              if (
                permissao ===
                "rateio_agua"
              ) {
                return "rateioAgua";
              }

              if (
                permissao ===
                  "mapa_3d" ||
                permissao ===
                  "mapa"
              ) {
                return "mapa3d";
              }

              if (
                permissao ===
                  "mapa_cotacao"
              ) {
                return "mapaCotacao";
              }

              if (
                permissao ===
                "consulta_jk1455"
              ) {
                return "jk1455";
              }

              if (
                permissao ===
                "clima"
              ) {
                return "climas";
              }

              if (
                permissao ===
                "pendencia"
              ) {
                return "pendencias";
              }

              return permissao;
            }
          )
        : PROFILE_PRESETS[
            perfil
          ] || [
            "solicitacoes",
          ],
  };
}

export default function Usuarios({
  currentUser,
  onUserUpdated,
}) {
  const [
    usuarios,
    setUsuarios,
  ] =
    useState([]);

  const [
    form,
    setForm,
  ] =
    useState(
      USUARIO_VAZIO
    );

  const [
    editandoId,
    setEditandoId,
  ] =
    useState(null);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState("");

  const [
    busca,
    setBusca,
  ] =
    useState("");

  async function carregarUsuarios() {
    setCarregando(
      true
    );

    setErro(
      ""
    );

    try {
      const lista =
        await listarUsuariosSupabase();

      setUsuarios(
        lista.map(
          normalizarUsuario
        )
      );
    } catch {
      setErro(
        "Não foi possível carregar os usuários."
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const usuariosFiltrados =
    useMemo(
      () => {
        const termo =
          busca
            .trim()
            .toLowerCase();

        if (!termo) {
          return usuarios;
        }

        return usuarios.filter(
          (usuario) =>
            String(
              usuario.nome ||
                ""
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            String(
              usuario.usuario ||
                ""
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            String(
              usuario.setor ||
                ""
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            String(
              usuario.perfil ||
                ""
            )
              .toLowerCase()
              .includes(
                termo
              )
        );
      },
      [
        usuarios,
        busca,
      ]
    );

  function atualizarCampo(
    campo,
    valor
  ) {
    setForm(
      (anterior) => ({
        ...anterior,
        [campo]:
          valor,
      })
    );
  }

  function aplicarPerfil(
    perfil
  ) {
    setForm(
      (anterior) => {
        const configsSolicitacao =
          configuracoesSolicitacao(
            anterior.permissoes
          );

        return {
          ...anterior,
          perfil,

          permissoes: [
            ...(
              PROFILE_PRESETS[
                perfil
              ] || [
                "solicitacoes",
              ]
            ),

            ...configsSolicitacao,
          ],
        };
      }
    );
  }

  function alternarPermissao(
    id
  ) {
    setForm(
      (anterior) => {
        const atual =
          Array.isArray(
            anterior.permissoes
          )
            ? anterior.permissoes
            : [];

        const existe =
          atual.includes(
            id
          );

        return {
          ...anterior,

          permissoes:
            existe
              ? atual.filter(
                  (permissao) =>
                    permissao !==
                    id
                )
              : [
                  ...atual,
                  id,
                ],
        };
      }
    );
  }

  function alternarAreaSolicitacao(
    area
  ) {
    const chave =
      permissaoArea(
        area
      );

    setForm(
      (anterior) => {
        const atual =
          Array.isArray(
            anterior.permissoes
          )
            ? anterior.permissoes
            : [];

        const existe =
          atual.includes(
            chave
          );

        return {
          ...anterior,

          permissoes:
            existe
              ? atual.filter(
                  (permissao) =>
                    permissao !==
                    chave
                )
              : [
                  ...atual,
                  chave,
                ],
        };
      }
    );
  }

  function alternarLocalObrigatorio() {
    setForm(
      (anterior) => {
        const atual =
          Array.isArray(
            anterior.permissoes
          )
            ? anterior.permissoes
            : [];

        const existe =
          atual.includes(
            PERMISSAO_LOCAL_OBRIGATORIO
          );

        return {
          ...anterior,

          permissoes:
            existe
              ? atual.filter(
                  (permissao) =>
                    permissao !==
                    PERMISSAO_LOCAL_OBRIGATORIO
                )
              : [
                  ...atual,
                  PERMISSAO_LOCAL_OBRIGATORIO,
                ],
        };
      }
    );
  }

  function novoUsuario() {
    setEditandoId(
      null
    );

    setForm(
      USUARIO_VAZIO
    );

    setErro(
      ""
    );
  }

  function editarUsuario(
    usuario
  ) {
    setEditandoId(
      usuario.id
    );

    setForm({
      nome:
        usuario.nome ||
        "",

      usuario:
        usuario.usuario ||
        "",

      senha:
        usuario.senha ||
        "",

      setor:
        usuario.setor ||
        "",

      perfil:
        normalizarPerfil(
          usuario.perfil
        ),

      ativo:
        usuario.ativo !==
        false,

      permissoes:
        usuario.permissoes || [
          "solicitacoes",
        ],
    });

    setErro(
      ""
    );
  }

  async function salvarUsuario(
    event
  ) {
    event.preventDefault();

    setErro(
      ""
    );

    if (
      !form.nome.trim()
    ) {
      setErro(
        "Informe o nome do usuário."
      );

      return;
    }

    if (
      !form.usuario.trim()
    ) {
      setErro(
        "Informe o usuário de login."
      );

      return;
    }

    if (
      !editandoId &&
      !form.senha.trim()
    ) {
      setErro(
        "Informe a senha."
      );

      return;
    }

    if (
      !form.permissoes ||
      form.permissoes.length ===
        0
    ) {
      setErro(
        "Selecione pelo menos uma permissão."
      );

      return;
    }

    setSalvando(
      true
    );

    try {
      if (
        editandoId
      ) {
        await atualizarUsuarioSupabase(
          editandoId,
          form
        );
      } else {
        await criarUsuarioSupabase(
          form
        );
      }

      await carregarUsuarios();

      if (
        currentUser?.id ===
          editandoId &&
        onUserUpdated
      ) {
        onUserUpdated();
      }

      novoUsuario();
    } catch (
      error
    ) {
      if (
        String(
          error.message ||
            ""
        ).includes(
          "duplicate key"
        )
      ) {
        setErro(
          "Já existe um usuário com esse login."
        );
      } else {
        setErro(
          "Não foi possível salvar o usuário."
        );
      }
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirUsuario(
    id
  ) {
    if (
      currentUser?.id ===
      id
    ) {
      alert(
        "Você não pode excluir o usuário que está logado."
      );

      return;
    }

    const confirmar =
      window.confirm(
        "Deseja realmente excluir este usuário?"
      );

    if (
      !confirmar
    ) {
      return;
    }

    try {
      await excluirUsuarioSupabase(
        id
      );

      await carregarUsuarios();
    } catch {
      alert(
        "Não foi possível excluir o usuário."
      );
    }
  }

  async function alternarAtivo(
    usuario
  ) {
    if (
      currentUser?.id ===
      usuario.id
    ) {
      alert(
        "Você não pode desativar o usuário que está logado."
      );

      return;
    }

    try {
      await atualizarUsuarioSupabase(
        usuario.id,
        {
          ativo:
            !usuario.ativo,
        }
      );

      await carregarUsuarios();
    } catch {
      alert(
        "Não foi possível alterar o status do usuário."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                <UserCog
                  className="text-blue-600"
                  size={24}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Usuários e Permissões
                </h2>

                <p className="text-sm text-slate-500">
                  Gerencie logins, senhas, perfis e acessos do sistema.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              carregarUsuarios
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw
              size={18}
            />

            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={
            salvarUsuario
          }
          className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-1"
        >
          <div className="flex items-center gap-2">
            {editandoId ? (
              <Edit
                size={20}
              />
            ) : (
              <Plus
                size={20}
              />
            )}

            <h3 className="font-bold text-slate-900">
              {editandoId
                ? "Editar usuário"
                : "Novo usuário"}
            </h3>
          </div>

          {erro && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              Nome exibido
            </label>

            <input
              value={
                form.nome
              }
              onChange={(
                event
              ) =>
                atualizarCampo(
                  "nome",
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: Rodrigo - Manutenção"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Usuário de login
            </label>

            <input
              value={
                form.usuario
              }
              onChange={(
                event
              ) =>
                atualizarCampo(
                  "usuario",
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: rodrigo"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Senha
            </label>

            <input
              type="password"
              value={
                form.senha
              }
              onChange={(
                event
              ) =>
                atualizarCampo(
                  "senha",
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder={
                editandoId
                  ? "Deixe em branco para manter a senha atual"
                  : "Ex: 1234"
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Setor
            </label>

            <input
              value={
                form.setor
              }
              onChange={(
                event
              ) =>
                atualizarCampo(
                  "setor",
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: Manutenção"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Perfil
            </label>

            <select
              value={
                form.perfil
              }
              onChange={(
                event
              ) =>
                aplicarPerfil(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="admin">
                Administrador
              </option>

              <option value="lider">
                Líder
              </option>

              <option value="tecnico">
                Técnico
              </option>

              <option value="consulta">
                Consulta
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                form.ativo
              }
              onChange={(
                event
              ) =>
                atualizarCampo(
                  "ativo",
                  event.target.checked
                )
              }
            />

            <span className="text-sm text-slate-700">
              Usuário ativo
            </span>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Permissões
            </label>

            <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-auto pr-1">
              {PERMISSIONS.map(
                (
                  permissao
                ) => (
                  <label
                    key={
                      permissao.id
                    }
                    className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={(
                        form.permissoes ||
                        []
                      ).includes(
                        permissao.id
                      )}
                      onChange={() =>
                        alternarPermissao(
                          permissao.id
                        )
                      }
                    />

                    <span className="text-sm text-slate-700">
                      {
                        permissao.label
                      }
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-900">
              Configurações de Solicitação de Material
            </p>

            <p className="mt-1 text-xs text-blue-700">
              Controle quais áreas este usuário pode solicitar e se o local de aplicação será obrigatório.
            </p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-blue-900">
                Áreas liberadas para solicitação
              </p>

              <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto pr-1">
                {AREAS_SOLICITACAO_MATERIAL.map(
                  (
                    area
                  ) => (
                    <label
                      key={
                        area
                      }
                      className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={(
                          form.permissoes ||
                          []
                        ).includes(
                          permissaoArea(
                            area
                          )
                        )}
                        onChange={() =>
                          alternarAreaSolicitacao(
                            area
                          )
                        }
                      />

                      <span className="text-sm text-slate-700">
                        {area}
                      </span>
                    </label>
                  )
                )}
              </div>

              <p className="mt-2 text-[11px] text-blue-700">
                Se nenhuma área for marcada, o sistema usará o setor do usuário como padrão.
              </p>
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 hover:bg-blue-50">
              <input
                type="checkbox"
                checked={
                  localAplicacaoObrigatorio(
                    form.permissoes
                  )
                }
                onChange={
                  alternarLocalObrigatorio
                }
              />

              <span className="text-sm font-semibold text-slate-700">
                Local de aplicação obrigatório
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={
                salvando
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Save
                size={18}
              />

              {salvando
                ? "Salvando..."
                : "Salvar"}
            </button>

            <button
              type="button"
              onClick={
                novoUsuario
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50"
            >
              <X
                size={18}
              />
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Usuários cadastrados
              </h3>

              <p className="text-sm text-slate-500">
                Total:{" "}
                {
                  usuarios.length
                }{" "}
                usuários
              </p>
            </div>

            <input
              value={
                busca
              }
              onChange={(
                event
              ) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Pesquisar por nome, login, setor ou perfil..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 lg:w-80"
            />
          </div>

          {carregando ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Carregando usuários...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-3 py-3">
                      Nome
                    </th>

                    <th className="px-3 py-3">
                      Login
                    </th>

                    <th className="px-3 py-3">
                      Perfil
                    </th>

                    <th className="px-3 py-3">
                      Setor
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3">
                      Permissões
                    </th>

                    <th className="px-3 py-3">
                      Solicitações
                    </th>

                    <th className="px-3 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map(
                    (
                      usuario
                    ) => (
                      <tr
                        key={
                          usuario.id
                        }
                        className="border-b last:border-b-0"
                      >
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {
                            usuario.nome
                          }
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {
                            usuario.usuario
                          }
                        </td>

                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            <Shield
                              size={13}
                            />

                            {
                              usuario.perfil
                            }
                          </span>
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {usuario.setor ||
                            "-"}
                        </td>

                        <td className="px-3 py-3">
                          {usuario.ativo ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2
                                size={13}
                              />

                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                              Inativo
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          {
                            permissoesTela(
                              usuario.permissoes ||
                                []
                            ).length
                          }{" "}
                          acessos
                        </td>

                        <td className="min-w-[220px] px-3 py-3 text-slate-600">
                          <div className="text-xs">
                            <p>
                              <strong>
                                Áreas:
                              </strong>{" "}

                              {obterAreasSolicitacao(
                                usuario.permissoes
                              ).length
                                ? obterAreasSolicitacao(
                                    usuario.permissoes
                                  ).join(
                                    ", "
                                  )
                                : usuario.setor ||
                                  "Setor do usuário"}
                            </p>

                            <p className="mt-1">
                              <strong>
                                Local obrigatório:
                              </strong>{" "}

                              {localAplicacaoObrigatorio(
                                usuario.permissoes
                              )
                                ? "Sim"
                                : "Não"}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                editarUsuario(
                                  usuario
                                )
                              }
                              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                              title="Editar"
                            >
                              <Edit
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                alternarAtivo(
                                  usuario
                                )
                              }
                              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                              title="Ativar/desativar"
                            >
                              <RefreshCcw
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                excluirUsuario(
                                  usuario.id
                                )
                              }
                              className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {usuariosFiltrados.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-10 text-center text-slate-500"
                      >
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
