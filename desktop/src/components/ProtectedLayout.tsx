import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "../components/Sidebar";

export function ProtectedLayout() {
  const { user, loading, hasAccess, billingEnabled } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading CodeViz...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const onBillingPage = location.pathname === "/billing";
  const onEditorPage = location.pathname.startsWith("/editor/");
  if (billingEnabled && !hasAccess && !onBillingPage) {
    return <Navigate to="/billing" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <main
        className={
          onEditorPage
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
