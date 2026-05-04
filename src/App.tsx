import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { useAdminAuthStore } from './store/adminAuthStore';
import { AcceptInviteScreen } from './screens/auth/AcceptInviteScreen';
import { AdminLoginScreen } from './screens/auth/AdminLoginScreen';
import { AccountDetailScreen } from './screens/admin/AccountDetailScreen';
import { AccountsScreen } from './screens/admin/AccountsScreen';
import { ActivityScreen } from './screens/admin/ActivityScreen';
import { AdminUsersScreen } from './screens/admin/AdminUsersScreen';
import { AlertsScreen } from './screens/admin/AlertsScreen';
import { AuditScreen } from './screens/admin/AuditScreen';
import { FamiliesScreen } from './screens/admin/FamiliesScreen';
import { FamilyDetailScreen } from './screens/admin/FamilyDetailScreen';
import { OverviewScreen } from './screens/admin/OverviewScreen';
import { PackagesScreen } from './screens/admin/PackagesScreen';
import { SupportScreen } from './screens/admin/SupportScreen';
import { SubscriptionDetailScreen } from './screens/admin/SubscriptionDetailScreen';
import { SubscriptionsScreen } from './screens/admin/SubscriptionsScreen';

function ProtectedRoute() {
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated());
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate replace to="/login" state={{ from: location }} />;
}

function PublicRoute() {
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated());
  return isAuthenticated ? <Navigate replace to="/admin/overview" /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate replace to="/admin/overview" />} />
        <Route path="/accept-invite" element={<AcceptInviteScreen />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<AdminLoginScreen />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate replace to="/admin/overview" />} />
            <Route path="overview" element={<OverviewScreen />} />
            <Route path="accounts" element={<AccountsScreen />} />
            <Route path="accounts/:accountId" element={<AccountDetailScreen />} />
            <Route path="families" element={<FamiliesScreen />} />
            <Route path="families/:familyId" element={<FamilyDetailScreen />} />
            <Route path="packages" element={<PackagesScreen />} />
            <Route path="subscriptions" element={<SubscriptionsScreen />} />
            <Route path="subscriptions/:subscriptionId" element={<SubscriptionDetailScreen />} />
            <Route path="alerts" element={<AlertsScreen />} />
            <Route path="activity" element={<ActivityScreen />} />
            <Route path="audit" element={<AuditScreen />} />
            <Route path="support" element={<SupportScreen />} />
            <Route path="admin-users" element={<AdminUsersScreen />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to="/admin/overview" />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#020617', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#8b5cf6', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />
    </BrowserRouter>
  );
}
