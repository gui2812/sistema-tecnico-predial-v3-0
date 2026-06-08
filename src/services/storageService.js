const PREFIX = "stp_v2_";

// =========================================================
// PERMISSÕES DISPONÍVEIS NO SISTEMA
// =========================================================

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

// =========================================================
// PERFIS PADRÃO
// =========================================================

export const PROFILE_PRESETS = {
  admin: PERMISSIONS.map(
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

// =========================================================
// USUÁRIOS PADRÃO
// =========================================================

export const DEFAULT_USERS = [
  {
    id: "u-admin",
    usuario: "admin",
    senha: "1455",
    nome: "Guilherme",
    perfil: "admin",
    setor: "Administração",
    ativo: true,
    permissions:
      PROFILE_PRESETS.admin,
  },
  {
    id: "u-manutencao",
    usuario: "manutencao",
    senha: "1234",
    nome: "Líder Manutenção",
    perfil: "lider",
    setor: "Manutenção",
    ativo: true,
    permissions:
      PROFILE_PRESETS.lider,
  },
  {
    id: "u-limpeza",
    usuario: "limpeza",
    senha: "1234",
    nome: "Líder Limpeza",
    perfil: "lider",
    setor: "Limpeza",
    ativo: true,
    permissions:
      PROFILE_PRESETS.lider,
  },
  {
    id: "u-bms",
    usuario: "bms",
    senha: "1234",
    nome: "Líder BMS",
    perfil: "lider",
    setor: "BMS",
    ativo: true,
    permissions:
      PROFILE_PRESETS.lider,
  },
];

// =========================================================
// HELPERS
// =========================================================

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(
        Date.now() +
          Math.random()
      );
}

function normalizarPerfil(
  perfil
) {
  const perfilNormalizado =
    String(
      perfil || ""
    ).toLowerCase();

  if (
    perfilNormalizado ===
    "administrador"
  ) {
    return "admin";
  }

  return (
    perfilNormalizado ||
    "lider"
  );
}

function normalizarPermissoes(
  permissoes = [],
  perfil = ""
) {
  const perfilNormalizado =
    normalizarPerfil(
      perfil
    );

  if (
    perfilNormalizado ===
    "admin"
  ) {
    return PROFILE_PRESETS.admin;
  }

  const mapa = {
    energia:
      "locatarios",
    calculos_tecnicos:
      "tecnicos",
    rateio_agua:
      "rateioAgua",
    mapa_cotacao:
      "mapaCotacao",
    mapa_3d:
      "mapa3d",
    consulta_jk1455:
      "jk1455",
  };

  const lista =
    Array.isArray(
      permissoes
    )
      ? permissoes
      : [];

  const normalizadas =
    lista
      .map(
        (permissao) =>
          mapa[permissao] ||
          permissao
      )
      .filter(Boolean);

  if (
    normalizadas.length >
    0
  ) {
    return [
      ...new Set(
        normalizadas
      ),
    ];
  }

  return (
    PROFILE_PRESETS[
      perfilNormalizado
    ] || [
      "solicitacoes",
    ]
  );
}

function normalizarUsuario(
  user
) {
  if (!user) {
    return null;
  }

  const perfil =
    normalizarPerfil(
      user.perfil
    );

  const permissions =
    normalizarPermissoes(
      user.permissions ||
        user.permissoes ||
        [],
      perfil
    );

  return {
    ...user,
    perfil,
    permissions,
    permissoes:
      permissions,
  };
}

// =========================================================
// LOCAL STORAGE
// =========================================================

export function getItem(
  key,
  fallback = []
) {
  try {
    const raw =
      localStorage.getItem(
        PREFIX + key
      );

    return raw
      ? JSON.parse(
          raw
        )
      : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(
  key,
  value
) {
  localStorage.setItem(
    PREFIX + key,
    JSON.stringify(
      value
    )
  );
}

export function addItem(
  key,
  item
) {
  const list =
    getItem(
      key,
      []
    );

  const novo = {
    id: uid(),
    criadoEm:
      new Date().toISOString(),
    ...item,
  };

  setItem(
    key,
    [
      novo,
      ...list,
    ]
  );

  return novo;
}

export function updateItem(
  key,
  id,
  patch
) {
  const list =
    getItem(
      key,
      []
    );

  const updated =
    list.map(
      (item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              atualizadoEm:
                new Date().toISOString(),
            }
          : item
    );

  setItem(
    key,
    updated
  );

  return updated;
}

export function deleteItem(
  key,
  id
) {
  const list =
    getItem(
      key,
      []
    );

  setItem(
    key,
    list.filter(
      (item) =>
        item.id !== id
    )
  );
}

export function clearKey(
  key
) {
  localStorage.removeItem(
    PREFIX + key
  );
}

// =========================================================
// USUÁRIOS
// =========================================================

export function getUsers() {
  const users =
    getItem(
      "users",
      null
    );

  if (
    !users ||
    !Array.isArray(
      users
    ) ||
    users.length === 0
  ) {
    setItem(
      "users",
      DEFAULT_USERS
    );

    return DEFAULT_USERS.map(
      normalizarUsuario
    );
  }

  return users.map(
    (user) =>
      normalizarUsuario({
        ativo: true,
        permissions:
          PROFILE_PRESETS[
            normalizarPerfil(
              user.perfil
            )
          ] || [
            "solicitacoes",
          ],
        ...user,
      })
  );
}

export function saveUsers(
  users
) {
  setItem(
    "users",
    users.map(
      normalizarUsuario
    )
  );
}

export function createUser(
  data
) {
  const users =
    getUsers();

  const novo =
    normalizarUsuario({
      id: uid(),
      criadoEm:
        new Date().toISOString(),
      ativo: true,
      ...data,
    });

  saveUsers([
    novo,
    ...users,
  ]);

  return novo;
}

export function updateUser(
  id,
  patch
) {
  const users =
    getUsers();

  const updated =
    users.map(
      (user) =>
        user.id === id
          ? normalizarUsuario({
              ...user,
              ...patch,
              atualizadoEm:
                new Date().toISOString(),
            })
          : user
    );

  saveUsers(
    updated
  );

  const session =
    getSession();

  if (
    session?.id === id
  ) {
    const novoSession =
      sanitizeSession(
        updated.find(
          (user) =>
            user.id === id
        )
      );

    setItem(
      "session",
      novoSession
    );
  }

  return updated;
}

export function deleteUser(
  id
) {
  const users =
    getUsers();

  const updated =
    users.filter(
      (user) =>
        user.id !== id
    );

  saveUsers(
    updated
  );
}

export function resetUsers() {
  saveUsers(
    DEFAULT_USERS
  );

  logout();
}

// =========================================================
// NOTIFICAÇÕES
// =========================================================

function notificationBelongsToUser(
  notification,
  user
) {
  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  if (
    !usuarioNormalizado
  ) {
    return false;
  }

  if (
    usuarioNormalizado.perfil ===
      "admin" ||
    usuarioNormalizado.perfil ===
      "administrador"
  ) {
    return true;
  }

  return (
    notification.destinatario ===
      usuarioNormalizado.nome ||
    notification.destinatarioSetor ===
      usuarioNormalizado.setor ||
    notification.destinatarioUsuario ===
      usuarioNormalizado.usuario ||
    notification.destinatarioUsuario ===
      usuarioNormalizado.id ||
    notification.usuarioId ===
      usuarioNormalizado.id ||
    notification.usuario ===
      usuarioNormalizado.usuario
  );
}

function normalizarNotificacao(
  notification = {}
) {
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
    id:
      notification.id ||
      uid(),
    criadoEm:
      notification.criadoEm ||
      new Date().toISOString(),
    lida:
      Boolean(
        notification.lida
      ),
    tipo,
    titulo,
    mensagem,
    ...notification,
  };
}

export function getNotifications(
  user
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  if (
    !usuarioNormalizado
  ) {
    return [];
  }

  return list
    .map(
      normalizarNotificacao
    )
    .filter(
      (notification) =>
        notificationBelongsToUser(
          notification,
          usuarioNormalizado
        )
    )
    .sort(
      (a, b) =>
        new Date(
          b.criadoEm
        ) -
        new Date(
          a.criadoEm
        )
    );
}

export function addNotification(
  notification
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  const novo =
    normalizarNotificacao({
      ...notification,
      id: uid(),
      criadoEm:
        new Date().toISOString(),
      lida: false,
    });

  setItem(
    "notificacoes",
    [
      novo,
      ...list,
    ]
  );

  return novo;
}

export function markNotificationRead(
  id
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  setItem(
    "notificacoes",
    list.map(
      (notification) =>
        notification.id ===
        id
          ? {
              ...notification,
              lida: true,
              lidaEm:
                new Date().toISOString(),
            }
          : notification
    )
  );
}

export function markAllNotificationsRead(
  user
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  setItem(
    "notificacoes",
    list.map(
      (notification) => {
        const belongs =
          notificationBelongsToUser(
            notification,
            usuarioNormalizado
          );

        return belongs
          ? {
              ...notification,
              lida: true,
              lidaEm:
                new Date().toISOString(),
            }
          : notification;
      }
    )
  );
}

export function deleteNotification(
  id
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  setItem(
    "notificacoes",
    list.filter(
      (notification) =>
        notification.id !==
        id
    )
  );
}

export function clearNotifications(
  user
) {
  const list =
    getItem(
      "notificacoes",
      []
    );

  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  setItem(
    "notificacoes",
    list.filter(
      (notification) =>
        !notificationBelongsToUser(
          notification,
          usuarioNormalizado
        )
    )
  );
}

// =========================================================
// PERMISSÕES E LOGIN
// =========================================================

export function hasPermission(
  user,
  pageId
) {
  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  if (
    !usuarioNormalizado
  ) {
    return false;
  }

  if (
    usuarioNormalizado.usuario ===
      "admin" ||
    usuarioNormalizado.perfil ===
      "admin" ||
    usuarioNormalizado.perfil ===
      "administrador"
  ) {
    return true;
  }

  return (
    Array.isArray(
      usuarioNormalizado.permissions
    ) &&
    usuarioNormalizado.permissions.includes(
      pageId
    )
  );
}

function sanitizeSession(
  user
) {
  const usuarioNormalizado =
    normalizarUsuario(
      user
    );

  if (
    !usuarioNormalizado
  ) {
    return null;
  }

  const {
    senha,
    ...session
  } =
    usuarioNormalizado;

  return {
    ...session,
    logadoEm:
      new Date().toISOString(),
  };
}

export function login(
  usuario,
  senha
) {
  const found =
    getUsers().find(
      (user) =>
        user.usuario ===
          usuario &&
        user.senha ===
          senha &&
        user.ativo !==
          false
    );

  if (!found) {
    return null;
  }

  const session =
    sanitizeSession(
      found
    );

  setItem(
    "session",
    session
  );

  return session;
}

export function getSession() {
  return normalizarUsuario(
    getItem(
      "session",
      null
    )
  );
}

export function logout() {
  localStorage.removeItem(
    PREFIX +
      "session"
  );
}
