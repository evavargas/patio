import type { PanelAccount } from "@patio/contracts";
import { Navigate, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { PageTitle } from "../components/page-title";
import { Skeleton } from "../components/ui/skeleton";
import { useSession } from "./session-store";

export function FullPageLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <span className="sr-only">{t("states.loading")}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

/** Rutas autenticadas. Con mustChangePassword solo existe /change-password. */
export function RequireAuth({ allowPasswordChange = false }: { allowPasswordChange?: boolean }) {
  const { status, account } = useSession();
  const location = useLocation();
  if (status === "loading") return <FullPageLoading />;
  if (account === null) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (account.mustChangePassword && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

/** Login e invitacion: quien ya tiene sesion va al panel. */
export function PublicOnly() {
  const { status, account } = useSession();
  const location = useLocation();
  if (status === "loading") return <FullPageLoading />;
  if (account !== null) {
    const from = typeof location.state?.from === "string" ? location.state.from : "/";
    return <Navigate to={account.mustChangePassword ? "/change-password" : from} replace />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: readonly PanelAccount["role"][] }) {
  const { t } = useTranslation();
  const account = useSession((s) => s.account);
  if (account === null || !roles.includes(account.role)) return <PageTitle>{t("forbidden.title")}</PageTitle>;
  return <Outlet />;
}
