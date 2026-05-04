import { adminApiClient } from './client';
import type { AdminUser } from '../store/adminAuthStore';
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
  FamilyDetail,
  FamilySummary,
  OversightParams,
  OverviewData,
  PackageSummary,
  PaginatedResult,
  PairingCodeLookupResult,
  PairingFailureItem,
  SubscriptionDetail,
  SubscriptionSummary,
  SupportNotesResult,
} from '../types/admin';

function cleanParams<T extends Record<string, string | number | boolean | undefined>>(params?: T) {
  const next: Record<string, string | number | boolean> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') next[key] = value;
  });
  return next;
}

export async function adminLogin(email: string, password: string) {
  const { data } = await adminApiClient.post<AdminLoginResponse>('/admin/auth/login', { email, password });
  return data;
}

export async function adminLogout() {
  await adminApiClient.post('/admin/auth/logout');
}

export async function getAdminMe() {
  const { data } = await adminApiClient.get<AdminUser>('/admin/me');
  return data;
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

export async function listAdminPackages() {
  const { data } = await adminApiClient.get<PackageSummary[]>('/admin/packages');
  return data;
}

export async function listAdminSubscriptions(params: AdminSubscriptionsParams) {
  const { data } = await adminApiClient.get<PaginatedResult<SubscriptionSummary>>('/admin/subscriptions', { params: cleanParams(params) });
  return data;
}

export async function getAdminSubscription(subscriptionId: string) {
  const { data } = await adminApiClient.get<SubscriptionDetail>(`/admin/subscriptions/${subscriptionId}`);
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
  return data;
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
  return data;
}

export async function updateAdminUserRoles(adminUserId: string, payload: AdminUpdateRolesPayload) {
  const { data } = await adminApiClient.patch<AdminUserSummary>(`/admin/admin-users/${adminUserId}/roles`, payload);
  return data;
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
  return data;
}
