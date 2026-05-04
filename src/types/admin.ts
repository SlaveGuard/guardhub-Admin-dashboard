import type { AdminUser } from '../store/adminAuthStore';

export type PaginatedResult<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };
export type AdminAccountsParams = { search?: string; page?: number; limit?: number; verified?: boolean; status?: string };
export type AdminFamiliesParams = { search?: string; page?: number; limit?: number; packageName?: string };
export type AdminSubscriptionsParams = { planName?: string; status?: string; page?: number; limit?: number };
export type AuditSource = 'parent_action' | 'admin_action';
export type OversightParams = { familyId?: string; accountId?: string; page?: number; limit?: number; from?: string; to?: string; source?: AuditSource };

export type OwnerStub = { id: string; email: string; displayName?: string | null; isVerified?: boolean };
export type FamilyStub = { id: string; name: string; profileCount?: number; memberCount?: number };
export type SubscriptionStub = { id?: string; planName: string; status: string };

export type AccountSummary = {
  id: string;
  email: string;
  displayName?: string | null;
  isVerified: boolean;
  role: string;
  createdAt: string;
  deletedAt?: string | null;
  subscription?: SubscriptionStub | null;
  familyCount: number;
};
export type AccountDetail = AccountSummary & { families: FamilyStub[] };

export type FamilyStats = { activeProfileCount: number; archivedProfileCount: number; deviceCount: number; appInstallationCount: number };
export type FamilySummary = { id: string; name: string; createdAt: string; owner: OwnerStub; subscription?: SubscriptionStub | null; stats: FamilyStats };
export type AppCatalogRef = { id: string; slug: string; displayName: string; endpointType: string };
export type AppInstallationStub = { id: string; status: string; appCatalog: AppCatalogRef };
export type DeviceDetail = {
  id: string;
  deviceName: string;
  type: string;
  status: string;
  lastSeen?: string | null;
  registeredAt: string;
  appInstallations: AppInstallationStub[];
};
export type ProfileDetail = {
  id: string;
  name: string;
  status: string;
  avatarUrl?: string | null;
  age?: number | null;
  grade?: string | null;
  createdAt: string;
  archivedAt?: string | null;
  devices: DeviceDetail[];
};
export type FamilyDetail = FamilySummary & { childProfiles: ProfileDetail[] };

export type AlertItem = {
  id: string;
  alertType: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  family?: { id: string; name?: string } | null;
  device?: { id: string; deviceName?: string; childProfile?: { id: string; name?: string } | null } | null;
};

export type ActivityItem = {
  id: string;
  timestamp: string;
  detectionCount: number;
  categories: string[];
  censorMode: string;
  appName: string;
  appPackage: string;
  confidenceAvg: number;
  family?: { id: string; name?: string } | null;
  device?: { id: string; deviceName?: string; childProfile?: { id: string; name?: string } | null } | null;
};

export type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  reason?: string | null;
  source: AuditSource;
  familyId?: string | null;
  actorUser?: OwnerStub | null;
  actorAdmin?: OwnerStub | null;
};

export type PackageLimits = {
  activeProfileCount?: number | null;
  archivedProfileCount?: number | null;
  devicesPerProfile?: number | null;
  appsPerProfile?: number | null;
  allowedAppCatalogSlugs?: string[] | null;
};
export type PackageSummary = { code: string; name: string; displayName: string; limits: PackageLimits; source: string };
export type SubscriptionSummary = { id: string; planName: string; status: string; createdAt: string; user: OwnerStub };
export type SubscriptionDetail = SubscriptionSummary & { user: OwnerStub & { families: FamilyStub[] } };

export type OverviewPlanCount = { planName: string; count: number };
export type OverviewMetricGroup = { total: number; verified?: number; active?: number; last24h?: number };
export type OverviewData = {
  accounts: OverviewMetricGroup;
  families: OverviewMetricGroup;
  profiles: OverviewMetricGroup;
  devices: OverviewMetricGroup;
  appInstallations: OverviewMetricGroup;
  subscriptions: { total: number; byPlan: OverviewPlanCount[] };
  recentAlerts: AlertItem[];
  recentAdminActions: AuditItem[];
};

export type AdminUserSummary = {
  id: string;
  email: string;
  displayName?: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: string[];
};
export type AdminLoginResponse = { accessToken: string; refreshToken: string; admin: AdminUser };
