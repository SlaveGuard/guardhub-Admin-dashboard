import type { AdminUser } from '../store/adminAuthStore';

export type PaginatedResult<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };
export type AdminAccountsParams = { search?: string; page?: number; limit?: number; verified?: boolean; status?: string };
export type AdminFamiliesParams = { search?: string; page?: number; limit?: number; packageName?: string };
export type AdminSubscriptionsParams = { planName?: string; status?: string; billingStatus?: string; page?: number; limit?: number };
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
  adminDisabled?: boolean;
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
export type FamilyDetail = FamilySummary & { childProfiles: ProfileDetail[]; supportNotes?: string | null };

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

export type SubscriptionSummary = {
  id: string;
  planName: string;
  status: string;
  createdAt: string;
  user: OwnerStub;
  billingStatus?: string | null;
  currentPeriodEnd?: string | null;
};

// DB-backed package (Phase 3)
export type PackageStatus = 'draft' | 'active' | 'grandfathered' | 'retired';

export interface Package {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description?: string | null;
  status: PackageStatus;
  price?: number | null;
  billingInterval?: string | null;
  currency?: string | null;
  activeProfilesLimit?: number | null;
  archivedProfilesLimit?: number | null;
  devicesPerProfileLimit?: number | null;
  appInstallationsPerProfileLimit?: number | null;
  allowedAppCatalogSlugs: string[];
  trialDays?: number | null;
  isPublic: boolean;
  sortOrder: number;
  assignedFamilyCount?: number;
  activatedAt?: string | null;
  retiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDetail extends Package {
  recentQuotaOverrides?: QuotaOverride[];
}

export interface PackageCreatePayload {
  code: string;
  name: string;
  displayName: string;
  description?: string;
  price?: number;
  billingInterval?: string;
  currency?: string;
  activeProfilesLimit?: number | null;
  archivedProfilesLimit?: number | null;
  devicesPerProfileLimit?: number | null;
  appInstallationsPerProfileLimit?: number | null;
  allowedAppCatalogSlugs?: string[];
  trialDays?: number;
  isPublic?: boolean;
  sortOrder?: number;
}

export interface PackageUpdatePayload {
  name?: string;
  displayName?: string;
  description?: string;
  price?: number;
  billingInterval?: string;
  currency?: string;
  activeProfilesLimit?: number | null;
  archivedProfilesLimit?: number | null;
  devicesPerProfileLimit?: number | null;
  appInstallationsPerProfileLimit?: number | null;
  allowedAppCatalogSlugs?: string[];
  trialDays?: number;
  isPublic?: boolean;
  sortOrder?: number;
  reason: string;
}

export interface ImpactFamilyItem {
  familyId: string;
  familyName: string;
  currentCount: number;
  limit: number;
}

export interface ImpactProfileItem {
  profileId: string;
  profileName: string;
  familyId: string;
  currentCount: number;
  limit: number;
}

export interface ImpactDisallowedItem {
  familyId: string;
  familyName: string;
  disallowedSlugs: string[];
}

export interface ImpactPreview {
  packageId: string;
  packageCode: string;
  totalAffectedFamilies: number;
  familiesOverActiveProfileLimit: ImpactFamilyItem[];
  familiesOverArchivedProfileLimit: ImpactFamilyItem[];
  profilesOverDeviceLimit: ImpactProfileItem[];
  profilesOverAppInstallationLimit: ImpactProfileItem[];
  familiesWithDisallowedAppTypes: ImpactDisallowedItem[];
}

export interface ChangePackagePayload {
  packageCode: string;
  reason: string;
}

export interface ChangePackageResult {
  subscriptionId: string;
  oldPlanName: string;
  newPlanName: string;
  message: string;
}

export interface QuotaOverride {
  id: string;
  familyId: string;
  packageId?: string | null;
  limitKey: string;
  overrideValue: number;
  reason: string;
  expiresAt: string;
  createdByAdminUserId: string;
  createdAt: string;
  revokedAt?: string | null;
}

export interface CreateQuotaOverridePayload {
  limitKey: 'activeProfilesLimit' | 'archivedProfilesLimit' | 'devicesPerProfileLimit' | 'appInstallationsPerProfileLimit';
  overrideValue: number;
  expiresAt: string;
  reason: string;
}

export interface SubscriptionDetailV3 {
  id: string;
  planName: string;
  status: string;
  createdAt: string;
  billingStatus?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAt?: string | null;
  canceledAt?: string | null;
  providerLinked?: boolean;
  user: { id: string; email: string; displayName?: string | null; isVerified?: boolean; families: FamilyStub[] };
  quotaOverrides?: QuotaOverride[];
}

export type SubscriptionDetail = SubscriptionDetailV3;

export type OverviewPlanCount = { planName: string; count: number };
export type OverviewMetricGroup = { total: number; verified?: number; active?: number; last24h?: number };
export type OverviewRecentAlertSummary = { last24hCount: number };
export type OverviewRecentAdminAction = Partial<AuditItem> & { action: string; createdAt: string };
export type OverviewData = {
  accounts: OverviewMetricGroup;
  families: OverviewMetricGroup;
  profiles: OverviewMetricGroup;
  devices: OverviewMetricGroup;
  appInstallations: OverviewMetricGroup;
  subscriptions: { total?: number; byPlan?: OverviewPlanCount[] } | OverviewPlanCount[];
  billing?: {
    trialing: number;
    pastDue: number;
    canceled: number;
    providerLinkedCount: number;
  };
  recentAlerts: AlertItem[] | OverviewRecentAlertSummary;
  recentAdminActions: OverviewRecentAdminAction[];
};

// Phase 4 - Billing

export interface BillingState {
  linked: boolean;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  billingStatus?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialStart?: string | null;
  trialEndsAt?: string | null;
  cancelAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  localStatus?: string | null;
  planName?: string | null;
  message?: string;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
}

export interface InvoiceListResult {
  linked: boolean;
  invoices: BillingInvoice[];
  hasMore: boolean;
}

export interface SubscriptionEventItem {
  id: string;
  eventType: string;
  processedAt: string;
  processingNote: string | null;
}

export interface ExtendTrialPayload {
  trialEndsAt: string;
  reason: string;
}

export interface EndTrialPayload {
  reason: string;
}

export interface TrialActionResult {
  trialEndsAt: string;
  message: string;
}

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

export interface AdminMutationResult {
  message: string;
}

export interface AccountAuditItem {
  id: string;
  action: string;
  entityType?: string;
  source: 'parent_action' | 'admin_action';
  createdAt: string;
  reason?: string | null;
  actorUser?: { id: string; email: string } | null;
  actorAdmin?: { id: string; email: string; roles: string[] } | null;
  familyId?: string | null;
}

export interface SupportNotesResult {
  id: string;
  supportNotes: string | null;
  updatedAt: string;
}

export interface PairingFailureItem {
  id: string;
  maskedCode: string;
  status: string;
  familyId: string;
  familyName: string;
  profileId: string;
  profileName: string;
  appCatalogSlug: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
}

export interface PairingCodeLookupResult {
  found: boolean;
  id?: string;
  status?: string;
  expiresAt?: string;
  usedAt?: string | null;
  createdAt?: string;
  family?: { id: string; name: string };
  profile?: { id: string; name: string };
  appCatalog?: { id: string; slug: string; displayName: string };
  usedByDevice?: { id: string; deviceName: string } | null;
  usedByInstallation?: { id: string; status: string } | null;
}

export interface AccountDevicesResult {
  families: Array<{
    id: string;
    name: string;
    profiles: Array<{
      id: string;
      name: string;
      status: string;
      devices: Array<{
        id: string;
        deviceName: string;
        type: string;
        status: string;
        lastSeen: string | null;
        appInstallations: Array<{
          id: string;
          status: string;
          appCatalog: { slug: string; displayName: string };
        }>;
      }>;
    }>;
  }>;
}

export interface AccountPairingHistoryItem {
  id: string;
  maskedCode: string;
  status: string;
  familyId: string;
  profileId: string;
  profileName: string;
  appCatalogSlug: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByDeviceName: string | null;
}

export interface AdminInviteUserPayload {
  email: string;
  displayName?: string;
  roles: string[];
}

export interface AdminUpdateRolesPayload {
  roles: string[];
  reason: string;
}

export interface AdminUserAuditItem {
  id: string;
  action: string;
  targetType?: string;
  targetId?: string;
  actorAdminUserId?: string;
  actorRoleCodes?: string[];
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AcceptInvitePayload {
  inviteToken: string;
  password: string;
}

export interface AcceptInviteResult {
  accessToken: string;
  refreshToken: string;
  admin: { id: string; email: string; displayName?: string | null; roles: string[] };
}
