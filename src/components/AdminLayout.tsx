import { Activity, ClipboardList, CreditCard, Home, LayoutDashboard, LogOut, Package, ShieldAlert, ShieldCheck, Siren, Users, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminLogout } from '../api/admin';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { SectionLabel } from './SectionLabel';

type NavItem = { label: string; to: string; icon: LucideIcon };

const sections: { label: string; items: NavItem[] }[] = [
  { label: 'Platform', items: [{ label: 'Overview', to: '/admin/overview', icon: LayoutDashboard }] },
  { label: 'Data', items: [{ label: 'Accounts', to: '/admin/accounts', icon: Users }, { label: 'Families', to: '/admin/families', icon: Home }, { label: 'Packages', to: '/admin/packages', icon: Package }, { label: 'Subscriptions', to: '/admin/subscriptions', icon: CreditCard }] },
  { label: 'Oversight', items: [{ label: 'Alerts', to: '/admin/alerts', icon: Siren }, { label: 'Activity', to: '/admin/activity', icon: Activity }, { label: 'Audit', to: '/admin/audit', icon: ClipboardList }] },
  { label: 'Support', items: [{ label: 'Pairing Workspace', to: '/admin/support', icon: Wrench }] },
  { label: 'System', items: [{ label: 'Admin Users', to: '/admin/admin-users', icon: ShieldCheck }] },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();
  const firstRole = admin?.roles[0] ?? 'admin';

  async function handleLogout() {
    try {
      await adminLogout();
    } catch {
      toast.error('Remote logout failed; local session cleared');
    } finally {
      logout();
      navigate('/login');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-slate-950/90 p-4">
        <div className="px-2 py-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-violet-400" />
            <div>
              <div className="text-lg font-bold text-slate-100">
                GuardHub <span className="text-violet-400">Admin</span>
              </div>
              <div className="text-xs text-slate-500">{admin?.email}</div>
            </div>
          </div>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {sections.map((section) => (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              {section.items.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const Icon = item.icon;
                return (
                  <NavLink className={active ? 'nav-item-active' : 'nav-item'} key={item.to} to={item.to}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="badge-violet max-w-full truncate">{firstRole}</div>
          <button className="btn-danger flex w-full items-center justify-center gap-2" type="button" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
