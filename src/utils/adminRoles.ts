export type AdminRoleValue = string | { code?: string; name?: string } | null | undefined;

export function getAdminRoleCode(role: unknown) {
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role && 'code' in role && typeof role.code === 'string') return role.code;
  return '';
}

export function normalizeAdminRoleCodes(roles: unknown[] | null | undefined) {
  return (roles ?? []).map(getAdminRoleCode).filter(Boolean);
}
