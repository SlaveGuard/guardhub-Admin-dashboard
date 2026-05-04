import { adminApiClient } from './client';
import type { AdminUser } from '../store/adminAuthStore';
import type {
  AccountDetail,
  AccountSummary,
  ActivityItem,
  AdminAccountsParams,
  AdminFamiliesParams,
  AdminLoginResponse,
  AdminSubscriptionsParams,
  AdminUserSummary,
  AlertItem,
  AuditItem,
  FamilyDetail,
  FamilySummary,
  OversightParams,
  OverviewData,
  PackageSummary,
  PaginatedResult,
  SubscriptionDetail,
  SubscriptionSummary,
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
