const PREFIX = "stp_v2_";

export const PERMISSIONS = [
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
    id: "ferramentasPdf",
    label: "Ferramentas PDF",
  },
  {
    id: "mapa3d",
    label: "Mapa 3D",
  },
  {
    id: "jk1455",
    label: "JK 1455",
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

const ALL_PERMISSION_IDS = PERMISSIONS.map((p) => p.id);

export const PROFILE_PRESETS = {
  admin: ALL_PERMISSION_IDS,
  administrador: ALL_PERMISSION_IDS,
  lider: [
    "solicitacoes",
  ],
  tecnico: [
    "dashboard",
    "calculadora",
    "tecnicos",
    "geradores",
    "historico",
    "relatorios",
    "ferramentasPdf",
  ],
  consulta: [
    "dashboard",
    "historico",
    "relatorios",
    "jk1455",
    "ferramentasPdf",
  ],
};

export const DEFAULT_USERS = [
  {
    id: "u-admin",
    usuario: "admin",
    senha: "1455",
    nome: "Guilherme",
    perfil: "admin",
    setor: "Administração",
    ativo: true,
    permissions: PROFILE_PRESETS.admin,
  },
  {
    id: "u-manutencao",
    usuario: "manutencao",
    senha: "1234",
    nome: "Líder Manutenção",
    perfil: "lider",
    setor: "Manutenção",
    ativo: true,
    permissions: PROFILE_PRESETS.lider,
  },
  {
    id: "u-limpeza",
    usuario: "limpeza",
    senha: "1234",
    nome: "Líder Limpeza",
    perfil: "lider",
    setor: "Limpeza",
    ativo: true,
    permissions: PROFILE_PRESETS.lider,
  },
  {
    id: "u-bms",
    usuario: "bms",
    senha: "1234",
    nome: "Líder BMS",
    perfil: "lider",
    setor: "BMS",
    ativo: true,
    permissions: PROFILE_PRESETS.lider,
  },
];

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

function normalizarPerfil(perfil) {
  const p = String(perfil || "").toLowerCase();

  if (p === "administrador") {
    return "admin";
  }

  return p || "lider";
}

function usuarioEhAdmin(user) {
  const perfil = normalizarPerfil(user?.perfil);
  const usuario = String(user?.usuario || "").toLowerCase();

  return (
    usuario === "admin" ||
    perfil === "admin" ||
    perfil === "administrador"
  );
}

function normalizarPermissaoLegada(permissao) {
  const mapa = {
    energia: "locatarios",
    calculos_tecnicos: "tecnicos",
    rateio_agua: "rateioAgua",
    mapa_cotacao: "mapaCotacao",
    ferramentas_pdf: "ferramentasPdf",
    ferramentas_pdf_menu: "ferramentasPdf",
  };

  return mapa[permissao] || permissao;
}

function removerDuplicadas(lista = []) {
  return Array.from(new Set(lista));
}

function filtrarPermissoesValidas(lista = []) {
  return lista.filter((item) =>
    ALL_PERMISSION_IDS.includes(item)
  );
}

function normalizarPermissoes(permissoes = [], perfil = "", user = null) {
  const perfilNormalizado = normalizarPerfil(perfil);

  if (
    usuarioEhAdmin({
      ...user,
      perfil: perfilNormalizado,
    })
  ) {
    return PROFILE_PRESETS.admin;
  }

  const lista = Array.isArray(permissoes) ? permissoes : [];

  const normalizadas = filtrarPermissoesValidas(
    lista.map(normalizarPermissaoLegada)
  );

  const preset = PROFILE_PRESETS[perfilNormalizado] || [
    "solicitacoes",
  ];

  if (normalizadas.length === 0) {
    return preset;
  }

  /*
    Mantém permissões antigas do usuário e adiciona permissões novas
    que pertencem ao preset do perfil.
    Isso corrige usuários salvos antes da criação da aba Ferramentas PDF.
  */
  return removerDuplicadas([
    ...normalizadas,
    ...preset,
  ]);
}

function normalizarUsuario(user) {
  if (!user) {
    return null;
  }

  const perfil = normalizarPerfil(user.perfil);

  const permissions = normalizarPermissoes(
    user.permissions || user.permissoes || [],
    perfil,
    user
  );

  return {
    ...user,
    perfil,
    permissions,
    permissoes: permissions,
  };
}

export function getItem(key, fallback = []) {
  try {
    const raw = localStorage.getItem(PREFIX + key);

    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function addItem(key, item) {
  const list = getItem(key, []);

  const novo = {
    id: uid(),
    criadoEm: new Date().toISOString(),
    ...item,
  };

  setItem(key, [
    novo,
    ...list,
  ]);

  return novo;
}

export function updateItem(key, id, patch) {
  const list = getItem(key, []);

  const updated = list.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
          atualizadoEm: new Date().toISOString(),
        }
      : item
  );

  setItem(key, updated);

  return updated;
}

export function deleteItem(key, id) {
  const list = getItem(key, []);

  setItem(
    key,
    list.filter((item) => item.id !== id)
  );
}

export function clearKey(key) {
  localStorage.removeItem(PREFIX + key);
}

export function getUsers() {
  const users = getItem("users", null);

  if (
    !users ||
    !Array.isArray(users) ||
    users.length === 0
  ) {
    const normalizados = DEFAULT_USERS.map(normalizarUsuario);

    setItem("users", normalizados);

    return normalizados;
  }

  const normalizados = users.map((u) =>
    normalizarUsuario({
      ativo: true,
      ...u,
    })
  );

  setItem("users", normalizados);

  return normalizados;
}

export function saveUsers(users) {
  const normalizados = users.map(normalizarUsuario);

  setItem("users", normalizados);
}

export function createUser(data) {
  const users = getUsers();

  const novo = normalizarUsuario({
    id: uid(),
    criadoEm: new Date().toISOString(),
    ativo: true,
    ...data,
  });

  saveUsers([
    novo,
    ...users,
  ]);

  return novo;
}

export function updateUser(id, patch) {
  const users = getUsers();

  const updated = users.map((u) =>
    u.id === id
      ? normalizarUsuario({
          ...u,
          ...patch,
          atualizadoEm: new Date().toISOString(),
        })
      : u
  );

  saveUsers(updated);

  const session = getSession();

  if (session?.id === id) {
    const novoSession = sanitizeSession(
      updated.find((u) => u.id === id)
    );

    setItem("session", novoSession);
  }

  return updated;
}

export function deleteUser(id) {
  const users = getUsers();

  const updated = users.filter((u) => u.id !== id);

  saveUsers(updated);
}

export function resetUsers() {
  saveUsers(DEFAULT_USERS);

  logout();
}

/* =========================
   NOTIFICAÇÕES
========================= */

function notificationBelongsToUser(n, user) {
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) {
    return false;
  }

  if (usuarioEhAdmin(usuarioNormalizado)) {
    return true;
  }

  return (
    n.destinatario === usuarioNormalizado.nome ||
    n.destinatarioSetor === usuarioNormalizado.setor ||
    n.destinatarioUsuario === usuarioNormalizado.usuario ||
    n.destinatarioUsuario === usuarioNormalizado.id ||
    n.usuarioId === usuarioNormalizado.id ||
    n.usuario === usuarioNormalizado.usuario
  );
}

function normalizarNotificacao(notification = {}) {
  const titulo =
    notification.titulo ||
    notification.title ||
    "Notificação do sistema";

  const mensagem =
    notification.mensagem ||
    notification.message ||
    "";

  const tipo =
    notification.tipo ||
    notification.categoria ||
    "sistema";

  return {
    id: notification.id || uid(),
    criadoEm: notification.criadoEm || new Date().toISOString(),
    lida: !!notification.lida,
    tipo,
    titulo,
    mensagem,
    ...notification,
  };
}

export function getNotifications(user) {
  const list = getItem("notificacoes", []);

  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) {
    return [];
  }

  return list
    .map(normalizarNotificacao)
    .filter((n) =>
      notificationBelongsToUser(n, usuarioNormalizado)
    )
    .sort(
      (a, b) =>
        new Date(b.criadoEm) -
        new Date(a.criadoEm)
    );
}

export function addNotification(notification) {
  const list = getItem("notificacoes", []);

  const novo = normalizarNotificacao({
    ...notification,
    id: uid(),
    criadoEm: new Date().toISOString(),
    lida: false,
  });

  setItem("notificacoes", [
    novo,
    ...list,
  ]);

  return novo;
}

export function markNotificationRead(id) {
  const list = getItem("notificacoes", []);

  setItem(
    "notificacoes",
    list.map((n) =>
      n.id === id
        ? {
            ...n,
            lida: true,
            lidaEm: new Date().toISOString(),
          }
        : n
    )
  );
}

export function markAllNotificationsRead(user) {
  const list = getItem("notificacoes", []);

  const usuarioNormalizado = normalizarUsuario(user);

  setItem(
    "notificacoes",
    list.map((n) => {
      const belongs = notificationBelongsToUser(
        n,
        usuarioNormalizado
      );

      return belongs
        ? {
            ...n,
            lida: true,
            lidaEm: new Date().toISOString(),
          }
        : n;
    })
  );
}

export function deleteNotification(id) {
  const list = getItem("notificacoes", []);

  setItem(
    "notificacoes",
    list.filter((n) => n.id !== id)
  );
}

export function clearNotifications(user) {
  const list = getItem("notificacoes", []);

  const usuarioNormalizado = normalizarUsuario(user);

  setItem(
    "notificacoes",
    list.filter(
      (n) =>
        !notificationBelongsToUser(
          n,
          usuarioNormalizado
        )
    )
  );
}

/* =========================
   PERMISSÕES / LOGIN
========================= */

export function hasPermission(user, pageId) {
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) {
    return false;
  }

  if (usuarioEhAdmin(usuarioNormalizado)) {
    return true;
  }

  return (
    Array.isArray(usuarioNormalizado.permissions) &&
    usuarioNormalizado.permissions.includes(pageId)
  );
}

function sanitizeSession(user) {
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) {
    return null;
  }

  const {
    senha,
    ...session
  } = usuarioNormalizado;

  return {
    ...session,
    logadoEm: new Date().toISOString(),
  };
}

export function login(usuario, senha) {
  const found = getUsers().find(
    (u) =>
      u.usuario === usuario &&
      u.senha === senha &&
      u.ativo !== false
  );

  if (!found) {
    return null;
  }

  const session = sanitizeSession(found);

  setItem("session", session);

  return session;
}

export function getSession() {
  const session = normalizarUsuario(getItem("session", null));

  if (session) {
    setItem("session", session);
  }

  return session;
}

export function logout() {
  localStorage.removeItem(PREFIX + "session");
}
