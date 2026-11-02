// Pure access decisions for the new CRM module. HTTP handlers must call these
// after reloading the current session and must apply visibility in SQL.
const knownScopes = new Set(['inherit','all','own']);
export function crmPermissions(user, scope = 'inherit') {
  if (!knownScopes.has(scope) || !user || typeof user.id !== 'string' || !user.id) return null;
  const admin = user.role === 'admin';
  const granted = new Set(Array.isArray(user.permissions) ? user.permissions : []);
  const has = permission => admin || granted.has(permission);
  if (!has('crm_boards_view')) return null;
  const all = admin || (scope === 'all' ? true : scope === 'own' ? false : has('crm_cards_view_all'));
  const legacyEdit=has('crm_cards_edit');
  const legacyManage=has('crm_boards_manage');
  return { userId:user.id, all, admin, orders:has('orders'), create:legacyEdit||has('crm_cards_create'), edit:legacyEdit||has('crm_cards_update'), move:legacyEdit||has('crm_cards_move'), manage:legacyManage, boardCreate:legacyManage||has('crm_boards_create'), boardEdit:legacyManage||has('crm_boards_update'), columnCreate:legacyManage||has('crm_columns_create'), columnEdit:legacyManage||has('crm_columns_update'), fieldCreate:legacyManage||has('crm_fields_create'), fieldEdit:legacyManage||has('crm_fields_update'), archive:has('crm_cards_archive'), history:has('crm_history_view') };
}
export function crmCardVisible(access, card) {
  return !!access && !!card && (access.all || card.assigned_user_id === access.userId);
}
