import { adminApiClient } from './client';
import type { AdminUser } from '../store/adminAuthStore';
import { normalizeAdminRoleCodes } from '../utils/adminRoles';
import type {
  AccountDetail,
  AccountAuditItem,
  AccountDevicesResult,
  AccountPairingHistoryItem,
  AccountSummary,
  AcceptInvitePayload,
  AcceptInviteResult,
  ActivityItem,
  AdminAccountsParams,
  AdminFamiliesParams,
  AdminInviteUserPayload,
  AdminLoginResponse,
  AdminMutationResult,
  AdminSubscriptionsParams,
  AdminUpdateRolesPayload,
  AdminUserAuditItem,
  AdminUserSummary,
  AlertItem,
  AuditItem,
  ChangePackagePayload,
  ChangePackageResult,
  CreateQuotaOverridePayload,
  FamilyDetail,
  FamilySummary,
  ImpactPreview,
  OversightParams,
  OverviewData,
  Package,
  PackageCreatePayload,
  PackageDetail,
  PackageUpdatePayload,
  PaginatedResult,
  PairingCodeLookupResult,
  PairingFailureItem,
  QuotaOverride,
  SubscriptionDetailV3,
  SubscriptionSummary,
  SupportNotesResult,
} from '../types/admin';

function normalizeAdminUserRoles<T extends { roles?: unknown[] }>(admin: T): T & { roles: string[] } {
  return { ...admin, roles: normalizeAdminRoleCodes(admin.roles) };
}

function cleanParams<T extends Record<string, string | number | boolean | undefined>>(params?: T) {
  const next: Record<string, string | number | boolean> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') next[key] = value;
  });
  return next;
}

export async function adminLogin(email: string, password: string) {
  const { data } = await adminApiClient.post<AdminLoginResponse>('/admin/auth/login', { email, password });
  return { ...data, admin: normalizeAdminUserRoles(data.admin) };
}

export async function adminLogout() {
  await adminApiClient.post('/admin/auth/logout');
}

export async function getAdminMe() {
  const { data } = await adminApiClient.get<AdminUser>('/admin/me');
  return normalizeAdminUserRoles(data);
}

export async function getAdminOverview() {
  const { data } = await adminApiClient.get<OverviewData>('/admin/overview');
  return data;
}

export async function listAdminAccounts(params: AdminAccountsParams) {
  const { data } = await adminApiClient.get<PaginatedResult<AccountSummary>>('/admin/accounts', { params: cleanParams(params) });
  return data;
}

export async function getAdminAccount(accountId: string) {
  const { data } = await adminApiClient.get<AccountDetail>(`/admin/accounts/${accountId}`);
  return data;
}

export async function listAdminFamilies(params: AdminFamiliesParams) {
  const { data } = await adminApiClient.get<PaginatedResult<FamilySummary>>('/admin/families', { params: cleanParams(params) });
  return data;
}

export async function getAdminFamily(familyId: string) {
  const { data } = await adminApiClient.get<FamilyDetail>(`/admin/families/${familyId}`);
  return data;
}

export async function getAdminFamilyAlerts(familyId: string, params: OversightParams = {}) {
  const { data } = await adminApiClient.get<AlertItem[]>(`/admin/families/${familyId}/alerts`, { params: cleanParams(params) });
  return data;
}

export async function getAdminFamilyActivity(familyId: string, params: OversightParams = {}) {
  const { data } = await adminApiClient.get<ActivityItem[]>(`/admin/families/${familyId}/activity`, { params: cleanParams(params) });
  return data;
}

export async function getAdminFamilyAudit(familyId: string, params: OversightParams = {}) {
  const { data } = await adminApiClient.get<AuditItem[]>(`/admin/families/${familyId}/audit`, { params: cleanParams(params) });
  return data;
}

export async function listAdminPackages(): Promise<Package[]> {
  const { data } = await adminApiClient.get<Package[]>('/admin/packages');
  return data;
}

export async function createPackage(payload: PackageCreatePayload): Promise<Package> {
  const { data } = await adminApiClient.post<Package>('/admin/packages', payload);
  return data;
}

export async function getAdminPackage(packageId: string): Promise<PackageDetail> {
  const { data } = await adminApiClient.get<PackageDetail>(`/admin/packages/${packageId}`);
  return data;
}

export async function updatePackage(packageId: string, payload: PackageUpdatePayload): Promise<Package> {
  const { data } = await adminApiClient.patch<Package>(`/admin/packages/${packageId}`, payload);
  return data;
}

export async function activatePackage(packageId: string, reason: string): Promise<Package> {
  const { data } = await adminApiClient.post<Package>(`/admin/packages/${packageId}/activate`, { reason });
  return data;
}

export async function retirePackage(packageId: string, reason: string): Promise<Package & { affectedFamilyCount: number }> {
  const { data } = await adminApiClient.post<Package & { affectedFamilyCount: number }>(`/admin/packages/${packageId}/retire`, { reason });
  return data;
}

export async function duplicatePackage(packageId: string): Promise<Package> {
  const { data } = await adminApiClient.post<Package>(`/admin/packages/${packageId}/duplicate`);
  return data;
}

export async function getPackageImpactPreview(packageId: string): Promise<ImpactPreview> {
  const { data } = await adminApiClient.get<ImpactPreview>(`/admin/packages/${packageId}/impact-preview`);
  return data;
}

export async function listAdminSubscriptions(params: AdminSubscriptionsParams) {
  const { data } = await adminApiClient.get<PaginatedResult<SubscriptionSummary>>('/admin/subscriptions', { params: cleanParams(params) });
  return data;
}

export async function getAdminSubscription(subscriptionId: string): Promise<SubscriptionDetailV3> {
  const { data } = await adminApiClient.get<SubscriptionDetailV3>(`/admin/subscriptions/${subscriptionId}`);
  return data;
}

export async function changeSubscriptionPackage(subscriptionId: string, payload: ChangePackagePayload): Promise<ChangePackageResult> {
  const { data } = await adminApiClient.post<ChangePackageResult>(`/admin/subscriptions/${subscriptionId}/change-package`, payload);
  return data;
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<AdminMutationResult> {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/subscriptions/${subscriptionId}/cancel`, { reason });
  return data;
}

export async function restoreSubscription(subscriptionId: string, reason: string): Promise<AdminMutationResult> {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/subscriptions/${subscriptionId}/restore`, { reason });
  return data;
}

export async function createQuotaOverride(subscriptionId: string, payload: CreateQuotaOverridePayload): Promise<QuotaOverride> {
  const { data } = await adminApiClient.post<QuotaOverride>(`/admin/subscriptions/${subscriptionId}/quota-overrides`, payload);
  return data;
}

export async function revokeQuotaOverride(subscriptionId: string, overrideId: string): Promise<AdminMutationResult> {
  const { data } = await adminApiClient.delete<AdminMutationResult>(`/admin/subscriptions/${subscriptionId}/quota-overrides/${overrideId}`);
  return data;
}

export async function getAdminAlerts(params: OversightParams) {
  const { data } = await adminApiClient.get<PaginatedResult<AlertItem>>('/admin/alerts', { params: cleanParams(params) });
  return data;
}

export async function getAdminActivity(params: OversightParams) {
  const { data } = await adminApiClient.get<PaginatedResult<ActivityItem>>('/admin/activity', { params: cleanParams(params) });
  return data;
}

export async function getAdminAudit(params: OversightParams) {
  const { data } = await adminApiClient.get<PaginatedResult<AuditItem>>('/admin/audit', { params: cleanParams(params) });
  return data;
}

export async function listAdminUsers() {
  const { data } = await adminApiClient.get<AdminUserSummary[]>('/admin/admin-users');
  return data.map(normalizeAdminUserRoles);
}

export async function disableAccount(accountId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/accounts/${accountId}/disable`, { reason });
  return data;
}

export async function enableAccount(accountId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/accounts/${accountId}/enable`, { reason });
  return data;
}

export async function forcePasswordReset(accountId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/accounts/${accountId}/force-password-reset`, { reason });
  return data;
}

export async function resendVerification(accountId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/accounts/${accountId}/resend-verification`, { reason });
  return data;
}

export async function getAccountAudit(accountId: string) {
  const { data } = await adminApiClient.get<AccountAuditItem[]>(`/admin/accounts/${accountId}/audit`);
  return data;
}

export async function updateFamilySupportNotes(familyId: string, notes: string | null, reason: string) {
  const { data } = await adminApiClient.patch<SupportNotesResult>(`/admin/families/${familyId}/support-notes`, { notes, reason });
  return data;
}

export async function getRecentPairingFailures() {
  const { data } = await adminApiClient.get<PairingFailureItem[]>('/admin/support/pairing/recent-failures');
  return data;
}

export async function lookupPairingCode(code: string) {
  const { data } = await adminApiClient.get<PairingCodeLookupResult>('/admin/support/pairing/code-lookup', { params: { code } });
  return data;
}

export async function getAccountDevices(accountId: string) {
  const { data } = await adminApiClient.get<AccountDevicesResult>(`/admin/support/accounts/${accountId}/devices`);
  return data;
}

export async function getAccountPairingHistory(accountId: string) {
  const { data } = await adminApiClient.get<AccountPairingHistoryItem[]>(`/admin/support/accounts/${accountId}/pairing`);
  return data;
}

export async function inviteAdminUser(payload: AdminInviteUserPayload) {
  const { data } = await adminApiClient.post<AdminUserSummary>('/admin/admin-users/invite', payload);
  return normalizeAdminUserRoles(data);
}

export async function updateAdminUserRoles(adminUserId: string, payload: AdminUpdateRolesPayload) {
  const { data } = await adminApiClient.patch<AdminUserSummary>(`/admin/admin-users/${adminUserId}/roles`, payload);
  return normalizeAdminUserRoles(data);
}

export async function disableAdminUser(adminUserId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/admin-users/${adminUserId}/disable`, { reason });
  return data;
}

export async function enableAdminUser(adminUserId: string, reason: string) {
  const { data } = await adminApiClient.post<AdminMutationResult>(`/admin/admin-users/${adminUserId}/enable`, { reason });
  return data;
}

export async function getAdminUserAudit(adminUserId: string) {
  const { data } = await adminApiClient.get<AdminUserAuditItem[]>(`/admin/admin-users/${adminUserId}/audit`);
  return data;
}

export async function acceptInvite(payload: AcceptInvitePayload) {
  const { data } = await adminApiClient.post<AcceptInviteResult>('/admin/auth/accept-invite', payload);
  return { ...data, admin: normalizeAdminUserRoles(data.admin) };
}
