import { NavLink } from "react-router-dom";
import { Code2, CreditCard, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn, daysRemaining } from "../lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-brand-600 p-2">
          <Code2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold">CodeViz</p>
          <p className="text-sm text-slate-400">Visual DSA learning</p>
        </div>
      </div>

      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"
              )
            }
          >
            <Shield className="h-4 w-4" />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-sm font-medium">{user?.email}</p>
          <p className="mt-1 text-xs text-slate-400 capitalize">
            {user?.role} · {user?.subscriptionStatus}
          </p>
          {user?.subscriptionStatus === "trial" && (
            <p className="mt-2 text-xs text-amber-300">
              Trial ends in {daysRemaining(user.trialEndsAt)} days
            </p>
          )}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
