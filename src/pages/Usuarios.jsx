import { useEffect, useMemo, useState } from "react";
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
  { id: "dashboard", label: "Dashboard" },
  { id: "pendencias", label: "Pendências" },
  { id: "solicitacoes", label: "Solicitação de Material" },
  { id: "mapa3d", label: "Mapa 3D" },
  { id: "climas", label: "Climas" },
  { id: "calculadora", label: "Calculadora Elétrica" },
  { id: "tecnicos", label: "Cálculos Técnicos" },
  { id: "geradores", label: "Geradores" },
  { id: "locatarios", label: "Energia dos Locatários" },
  { id: "malote", label: "Malote" },
  { id: "rateioAgua", label: "Rateio de Água" },
  { id: "historico", label: "Histórico" },
  { id: "relatorios", label: "Relatórios PDF" },
  { id: "usuarios", label: "Usuários e Permissões" },
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

const PREFIXO_AREA_SOLICITACAO = "solicitacoes.area.";
const PERMISSAO_LOCAL_OBRIGATORIO = "solicitacoes.localObrigatorio";

function permissaoArea(area) {
  return `${PREFIXO_AREA_SOLICITACAO}${area}`;
}

function obterAreasSolicitacao(permissoes = []) {
  return (Array.isArray(permissoes) ? permissoes : [])
    .filter((p) => String(p).startsWith(PREFIXO_AREA_SOLICITACAO))
    .map((p) => String(p).replace(PREFIXO_AREA_SOLICITACAO, ""));
}

function localAplicacaoObrigatorio(permissoes = []) {
  return (Array.isArray(permissoes) ? permissoes : []).includes(
    PERMISSAO_LOCAL_OBRIGATORIO
  );
}

function permissoesTela(permissoes = []) {
  return (Array.isArray(permissoes) ? permissoes : []).filter(
    (p) =>
      !String(p).startsWith(PREFIXO_AREA_SOLICITACAO) &&
      p !== PERMISSAO_LOCAL_OBRIGATORIO
  );
}

function configuracoesSolicitacao(permissoes = []) {
  return (Array.isArray(permissoes) ? permissoes : []).filter(
    (p) =>
      String(p).startsWith(PREFIXO_AREA_SOLICITACAO) ||
      p === PERMISSAO_LOCAL_OBRIGATORIO
  );
}

const PROFILE_PRESETS = {
  admin: PERMISSIONS.map((p) => p.id),
  administrador: PERMISSIONS.map((p) => p.id),
  lider: ["solicitacoes"],
  tecnico: [
    "dashboard",
    "pendencias",
    "mapa3d",
    "climas",
    "calculadora",
    "tecnicos",
    "geradores",
    "locatarios",
    "historico",
    "relatorios",
  ],
  consulta: ["dashboard", "mapa3d", "historico", "relatorios"],
};

const USUARIO_VAZIO = {
  nome: "",
  usuario: "",
  senha: "",
  setor: "",
  perfil: "lider",
  ativo: true,
  permissoes: ["solicitacoes", permissaoArea("Elétrica")],
};

function normalizarPerfil(perfil) {
  if (perfil === "administrador") return "admin";
  return perfil || "lider";
}

function normalizarUsuario(u) {
  const perfil = normalizarPerfil(u.perfil);

  return {
    ...u,
    perfil,
    permissoes: Array.isArray(u.permissoes)
      ? u.permissoes.map((p) => {
          if (p === "energia") return "locatarios";
          if (p === "calculos_tecnicos") return "tecnicos";
          if (p === "rateio_agua") return "rateioAgua";
          if (p === "mapa_3d") return "mapa3d";
          if (p === "mapa") return "mapa3d";
          if (p === "clima") return "climas";
          if (p === "pendencia") return "pendencias";
          return p;
        })
      : PROFILE_PRESETS[perfil] || ["solicitacoes"],
  };
}

export default function Usuarios({ currentUser, onUserUpdated }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(USUARIO_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");

    try {
      const lista = await listarUsuariosSupabase();
      setUsuarios(lista.map(normalizarUsuario));
    } catch (err) {
      setErro("Não foi possível carregar os usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return usuarios;

    return usuarios.filter((u) => {
      return (
        String(u.nome || "").toLowerCase().includes(termo) ||
        String(u.usuario || "").toLowerCase().includes(termo) ||
        String(u.setor || "").toLowerCase().includes(termo) ||
        String(u.perfil || "").toLowerCase().includes(termo)
      );
    });
  }, [usuarios, busca]);

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function aplicarPerfil(perfil) {
    setForm((prev) => {
      const configsSolicitacao = configuracoesSolicitacao(prev.permissoes);

      return {
        ...prev,
        perfil,
        permissoes: [
          ...(PROFILE_PRESETS[perfil] || ["solicitacoes"]),
          ...configsSolicitacao,
        ],
      };
    });
  }

  function alternarPermissao(id) {
    setForm((prev) => {
      const atual = Array.isArray(prev.permissoes) ? prev.permissoes : [];
      const existe = atual.includes(id);

      return {
        ...prev,
        permissoes: existe ? atual.filter((p) => p !== id) : [...atual, id],
      };
    });
  }

  function alternarAreaSolicitacao(area) {
    const chave = permissaoArea(area);

    setForm((prev) => {
      const atual = Array.isArray(prev.permissoes) ? prev.permissoes : [];
      const existe = atual.includes(chave);

      return {
        ...prev,
        permissoes: existe
          ? atual.filter((p) => p !== chave)
          : [...atual, chave],
      };
    });
  }

  function alternarLocalObrigatorio() {
    setForm((prev) => {
      const atual = Array.isArray(prev.permissoes) ? prev.permissoes : [];
      const existe = atual.includes(PERMISSAO_LOCAL_OBRIGATORIO);

      return {
        ...prev,
        permissoes: existe
          ? atual.filter((p) => p !== PERMISSAO_LOCAL_OBRIGATORIO)
          : [...atual, PERMISSAO_LOCAL_OBRIGATORIO],
      };
    });
  }

  function novoUsuario() {
    setEditandoId(null);
    setForm(USUARIO_VAZIO);
    setErro("");
  }

  function editarUsuario(usuario) {
    setEditandoId(usuario.id);
    setForm({
      nome: usuario.nome || "",
      usuario: usuario.usuario || "",
      senha: usuario.senha || "",
      setor: usuario.setor || "",
      perfil: normalizarPerfil(usuario.perfil),
      ativo: usuario.ativo !== false,
      permissoes: usuario.permissoes || ["solicitacoes"],
    });
    setErro("");
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome do usuário.");
      return;
    }

    if (!form.usuario.trim()) {
      setErro("Informe o usuário de login.");
      return;
    }

    if (!form.senha.trim()) {
      setErro("Informe a senha.");
      return;
    }

    if (!form.permissoes || form.permissoes.length === 0) {
      setErro("Selecione pelo menos uma permissão.");
      return;
    }

    setSalvando(true);

    try {
      if (editandoId) {
        await atualizarUsuarioSupabase(editandoId, form);
      } else {
        await criarUsuarioSupabase(form);
      }

      await carregarUsuarios();

      if (currentUser?.id === editandoId && onUserUpdated) {
        onUserUpdated();
      }

      novoUsuario();
    } catch (err) {
      if (String(err.message || "").includes("duplicate key")) {
        setErro("Já existe um usuário com esse login.");
      } else {
        setErro("Não foi possível salvar o usuário.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(id) {
    if (currentUser?.id === id) {
      alert("Você não pode excluir o usuário que está logado.");
      return;
    }

    const confirmar = window.confirm("Deseja realmente excluir este usuário?");

    if (!confirmar) return;

    try {
      await excluirUsuarioSupabase(id);
      await carregarUsuarios();
    } catch {
      alert("Não foi possível excluir o usuário.");
    }
  }

  async function alternarAtivo(usuario) {
    if (currentUser?.id === usuario.id) {
      alert("Você não pode desativar o usuário que está logado.");
      return;
    }

    try {
      await atualizarUsuarioSupabase(usuario.id, {
        ativo: !usuario.ativo,
      });
      await carregarUsuarios();
    } catch {
      alert("Não foi possível alterar o status do usuário.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UserCog className="text-blue-600" size={24} />
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
            onClick={carregarUsuarios}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={18} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form
          onSubmit={salvarUsuario}
          className="xl:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            {editandoId ? <Edit size={20} /> : <Plus size={20} />}
            <h3 className="font-bold text-slate-900">
              {editandoId ? "Editar usuário" : "Novo usuário"}
            </h3>
          </div>

          {erro && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
              {erro}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              Nome exibido
            </label>
            <input
              value={form.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: Rodrigo - Manutenção"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Usuário de login
            </label>
            <input
              value={form.usuario}
              onChange={(e) => atualizarCampo("usuario", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: rodrigo"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              value={form.senha}
              onChange={(e) => atualizarCampo("senha", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: 1234"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Setor
            </label>
            <input
              value={form.setor}
              onChange={(e) => atualizarCampo("setor", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ex: Manutenção"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Perfil
            </label>
            <select
              value={form.perfil}
              onChange={(e) => aplicarPerfil(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="admin">Administrador</option>
              <option value="lider">Líder</option>
              <option value="tecnico">Técnico</option>
              <option value="consulta">Consulta</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => atualizarCampo("ativo", e.target.checked)}
            />
            <span className="text-sm text-slate-700">Usuário ativo</span>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Permissões
            </label>

            <div className="mt-2 grid grid-cols-1 gap-2 max-h-64 overflow-auto pr-1">
              {PERMISSIONS.map((permissao) => (
                <label
                  key={permissao.id}
                  className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 py-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={(form.permissoes || []).includes(permissao.id)}
                    onChange={() => alternarPermissao(permissao.id)}
                  />
                  <span className="text-sm text-slate-700">
                    {permissao.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-900">
              Configurações de Solicitação de Material
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Controle quais áreas este usuário pode solicitar e se o local de aplicação será obrigatório.
            </p>

            <div className="mt-4">
              <p className="text-xs font-bold text-blue-900 mb-2">
                Áreas liberadas para solicitação
              </p>

              <div className="grid grid-cols-1 gap-2 max-h-52 overflow-auto pr-1">
                {AREAS_SOLICITACAO_MATERIAL.map((area) => (
                  <label
                    key={area}
                    className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-3 py-2 hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={(form.permissoes || []).includes(permissaoArea(area))}
                      onChange={() => alternarAreaSolicitacao(area)}
                    />
                    <span className="text-sm text-slate-700">{area}</span>
                  </label>
                ))}
              </div>

              <p className="text-[11px] text-blue-700 mt-2">
                Se nenhuma área for marcada, o sistema usará o setor do usuário como padrão.
              </p>
            </div>

            <label className="mt-4 flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-3 py-2 hover:bg-blue-50">
              <input
                type="checkbox"
                checked={localAplicacaoObrigatorio(form.permissoes)}
                onChange={alternarLocalObrigatorio}
              />
              <span className="text-sm font-semibold text-slate-700">
                Local de aplicação obrigatório
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              <Save size={18} />
              {salvando ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={novoUsuario}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </form>

        <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Usuários cadastrados</h3>
              <p className="text-sm text-slate-500">
                Total: {usuarios.length} usuários
              </p>
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome, login, setor ou perfil..."
              className="w-full lg:w-80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {carregando ? (
            <div className="text-slate-500 text-sm py-10 text-center">
              Carregando usuários...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-3 px-3">Nome</th>
                    <th className="py-3 px-3">Login</th>
                    <th className="py-3 px-3">Perfil</th>
                    <th className="py-3 px-3">Setor</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Permissões</th>
                    <th className="py-3 px-3">Solicitações</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="border-b last:border-b-0">
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {usuario.nome}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {usuario.usuario}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                          <Shield size={13} />
                          {usuario.perfil}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {usuario.setor || "-"}
                      </td>

                      <td className="py-3 px-3">
                        {usuario.ativo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                            <CheckCircle2 size={13} />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {permissoesTela(usuario.permissoes || []).length} acessos
                      </td>

                      <td className="py-3 px-3 text-slate-600 min-w-[220px]">
                        <div className="text-xs">
                          <p>
                            <strong>Áreas:</strong>{" "}
                            {obterAreasSolicitacao(usuario.permissoes).length
                              ? obterAreasSolicitacao(usuario.permissoes).join(", ")
                              : usuario.setor || "Setor do usuário"}
                          </p>
                          <p className="mt-1">
                            <strong>Local obrigatório:</strong>{" "}
                            {localAplicacaoObrigatorio(usuario.permissoes) ? "Sim" : "Não"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editarUsuario(usuario)}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => alternarAtivo(usuario)}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                            title="Ativar/desativar"
                          >
                            <RefreshCcw size={16} />
                          </button>

                          <button
                            onClick={() => excluirUsuario(usuario.id)}
                            className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {usuariosFiltrados.length === 0 && (
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
