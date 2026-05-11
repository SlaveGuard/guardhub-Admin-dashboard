import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeAdminRoleCodes } from '../utils/adminRoles';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  roles: string[];
}

interface AdminAuthState {
  token: string | null;
  refreshToken: string | null;
  admin: AdminUser | null;
  setAuth: (token: string, refreshToken: string, admin: AdminUser) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['admin:*'],
  support_admin: [
    'admin:accounts:read',
    'admin:accounts:write',
    'admin:families:read',
    'admin:families:write',
    'admin:alerts:read',
    'admin:activity:read',
    'admin:audit:read',
    'admin:support:read',
  ],
  billing_admin: ['admin:packages:read', 'admin:packages:write', 'admin:subscriptions:read', 'admin:subscriptions:write', 'admin:billing:read', 'admin:billing:write'],
  operations_admin: ['admin:catalog:read', 'admin:catalog:write', 'admin:flags:read', 'admin:remote-lock-exclusions:read', 'admin:remote-lock-exclusions:write'],
  trust_safety_admin: ['admin:alerts:read', 'admin:alerts:write', 'admin:activity:read'],
  readonly_auditor: ['admin:accounts:read', 'admin:families:read', 'admin:packages:read', 'admin:subscriptions:read', 'admin:audit:read', 'admin:remote-lock-exclusions:read'],
};

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      admin: null,
      setAuth: (token, refreshToken, admin) => set({ token, refreshToken, admin: { ...admin, roles: normalizeAdminRoleCodes(admin.roles) } }),
      setTokens: (token, refreshToken) => set((s) => ({ token, refreshToken, admin: s.admin })),
      logout: () => set({ token: null, refreshToken: null, admin: null }),
      isAuthenticated: () => !!get().token,
      hasRole: (role) => normalizeAdminRoleCodes(get().admin?.roles).includes(role),
      hasPermission: (permission) => {
        const roles = normalizeAdminRoleCodes(get().admin?.roles);
        if (roles.includes('super_admin')) return true;
        return roles.some((r) =>
          (ROLE_PERMISSIONS[r] ?? []).some(
            (p) => p === 'admin:*' || p === permission || (p.endsWith(':*') && permission.startsWith(p.slice(0, -1))),
          ),
        );
      },
    }),
    { name: 'guardhub-admin-auth' },
  ),
);
