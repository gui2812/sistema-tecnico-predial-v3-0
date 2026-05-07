const PREFIX = 'stp_v2_';

export const PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calculadora', label: 'Calculadora Elétrica' },
  { id: 'tecnicos', label: 'Cálculos Técnicos' },
  { id: 'geradores', label: 'Geradores' },
  { id: 'locatarios', label: 'Energia dos Locatários' },
  { id: 'malote', label: 'Malote' },
  { id: 'rateioAgua', label: 'Rateio de Água' },
  { id: 'solicitacoes', label: 'Solicitação de Material' },
  { id: 'historico', label: 'Histórico' },
  { id: 'relatorios', label: 'Relatórios PDF' },
  { id: 'usuarios', label: 'Usuários e Permissões' },
];

export const PROFILE_PRESETS = {
  admin: PERMISSIONS.map((p) => p.id),
  administrador: PERMISSIONS.map((p) => p.id),
  lider: ['solicitacoes'],
  tecnico: ['dashboard', 'calculadora', 'tecnicos', 'geradores', 'historico', 'relatorios'],
  consulta: ['dashboard', 'historico', 'relatorios'],
};

export const DEFAULT_USERS = [
  { id: 'u-admin', usuario: 'admin', senha: '1455', nome: 'Guilherme', perfil: 'admin', setor: 'Administração', ativo: true, permissions: PROFILE_PRESETS.admin },
  { id: 'u-manutencao', usuario: 'manutencao', senha: '1234', nome: 'Líder Manutenção', perfil: 'lider', setor: 'Manutenção', ativo: true, permissions: PROFILE_PRESETS.lider },
  { id: 'u-limpeza', usuario: 'limpeza', senha: '1234', nome: 'Líder Limpeza', perfil: 'lider', setor: 'Limpeza', ativo: true, permissions: PROFILE_PRESETS.lider },
  { id: 'u-bms', usuario: 'bms', senha: '1234', nome: 'Líder BMS', perfil: 'lider', setor: 'BMS', ativo: true, permissions: PROFILE_PRESETS.lider },
];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function normalizarPerfil(perfil) {
  const p = String(perfil || '').toLowerCase();
  if (p === 'administrador') return 'admin';
  return p || 'lider';
}

function normalizarPermissoes(permissoes = [], perfil = '') {
  const perfilNormalizado = normalizarPerfil(perfil);

  if (perfilNormalizado === 'admin') {
    return PROFILE_PRESETS.admin;
  }

  const mapa = {
    energia: 'locatarios',
    calculos_tecnicos: 'tecnicos',
    rateio_agua: 'rateioAgua',
  };

  const lista = Array.isArray(permissoes) ? permissoes : [];
  const normalizadas = lista.map((p) => mapa[p] || p);

  if (normalizadas.length > 0) {
    return normalizadas;
  }

  return PROFILE_PRESETS[perfilNormalizado] || ['solicitacoes'];
}

function normalizarUsuario(user) {
  if (!user) return null;

  const perfil = normalizarPerfil(user.perfil);

  const permissions = normalizarPermissoes(
    user.permissions || user.permissoes || [],
    perfil
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
  const novo = { id: uid(), criadoEm: new Date().toISOString(), ...item };
  setItem(key, [novo, ...list]);
  return novo;
}

export function updateItem(key, id, patch) {
  const list = getItem(key, []);
  const updated = list.map((item) =>
    item.id === id ? { ...item, ...patch, atualizadoEm: new Date().toISOString() } : item
  );
  setItem(key, updated);
  return updated;
}

export function deleteItem(key, id) {
  const list = getItem(key, []);
  setItem(key, list.filter((item) => item.id !== id));
}

export function clearKey(key) {
  localStorage.removeItem(PREFIX + key);
}

export function getUsers() {
  const users = getItem('users', null);

  if (!users || !Array.isArray(users) || users.length === 0) {
    setItem('users', DEFAULT_USERS);
    return DEFAULT_USERS.map(normalizarUsuario);
  }

  return users.map((u) =>
    normalizarUsuario({
      ativo: true,
      permissions: PROFILE_PRESETS[normalizarPerfil(u.perfil)] || ['solicitacoes'],
      ...u,
    })
  );
}

export function saveUsers(users) {
  setItem('users', users.map(normalizarUsuario));
}

export function createUser(data) {
  const users = getUsers();
  const novo = normalizarUsuario({
    id: uid(),
    criadoEm: new Date().toISOString(),
    ativo: true,
    ...data,
  });

  saveUsers([novo, ...users]);
  return novo;
}

export function updateUser(id, patch) {
  const users = getUsers();
  const updated = users.map((u) =>
    u.id === id
      ? normalizarUsuario({ ...u, ...patch, atualizadoEm: new Date().toISOString() })
      : u
  );

  saveUsers(updated);

  const session = getSession();
  if (session?.id === id) {
    const novoSession = sanitizeSession(updated.find((u) => u.id === id));
    setItem('session', novoSession);
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

export function getNotifications(user) {
  const list = getItem('notificacoes', []);
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) return [];

  if (usuarioNormalizado.perfil === 'admin') return list;

  return list.filter(
    (n) =>
      n.destinatario === usuarioNormalizado.nome ||
      n.destinatarioSetor === usuarioNormalizado.setor ||
      n.destinatarioUsuario === usuarioNormalizado.usuario
  );
}

export function addNotification(notification) {
  const list = getItem('notificacoes', []);
  const novo = {
    id: uid(),
    criadoEm: new Date().toISOString(),
    lida: false,
    ...notification,
  };

  setItem('notificacoes', [novo, ...list]);
  return novo;
}

export function markNotificationRead(id) {
  const list = getItem('notificacoes', []);
  setItem('notificacoes', list.map((n) => (n.id === id ? { ...n, lida: true } : n)));
}

export function markAllNotificationsRead(user) {
  const list = getItem('notificacoes', []);
  const usuarioNormalizado = normalizarUsuario(user);

  setItem(
    'notificacoes',
    list.map((n) => {
      const belongs =
        usuarioNormalizado?.perfil === 'admin' ||
        n.destinatario === usuarioNormalizado?.nome ||
        n.destinatarioSetor === usuarioNormalizado?.setor ||
        n.destinatarioUsuario === usuarioNormalizado?.usuario;

      return belongs ? { ...n, lida: true } : n;
    })
  );
}

export function hasPermission(user, pageId) {
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) return false;

  if (
    usuarioNormalizado.usuario === 'admin' ||
    usuarioNormalizado.perfil === 'admin' ||
    usuarioNormalizado.perfil === 'administrador'
  ) {
    return true;
  }

  return (
    Array.isArray(usuarioNormalizado.permissions) &&
    usuarioNormalizado.permissions.includes(pageId)
  );
}

function sanitizeSession(user) {
  const usuarioNormalizado = normalizarUsuario(user);

  if (!usuarioNormalizado) return null;

  const { senha, ...session } = usuarioNormalizado;

  return {
    ...session,
    logadoEm: new Date().toISOString(),
  };
}

export function login(usuario, senha) {
  const found = getUsers().find(
    (u) => u.usuario === usuario && u.senha === senha && u.ativo !== false
  );

  if (!found) return null;

  const session = sanitizeSession(found);
  setItem('session', session);
  return session;
}

export function getSession() {
  return normalizarUsuario(getItem('session', null));
}

export function logout() {
  localStorage.removeItem(PREFIX + 'session');
}