import { lazy, Suspense, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes } from "react-router";
import { FullPageLoading, PublicOnly, RequireAuth, RequireRole } from "../auth/guards";
import { ListSkeleton } from "../components/query-states";
import { PageTitle } from "../components/page-title";
import { Button } from "../components/ui/button";
import { AcceptInvitationPage } from "../features/auth/accept-invitation-page";
import { ChangePasswordPage } from "../features/auth/change-password-page";
import { LoginPage } from "../features/auth/login-page";
import { AccountsPage } from "../features/accounts/accounts-page";
import { ChallengesPage } from "../features/challenges/challenges-page";
import { DaySetsPage } from "../features/day-sets/day-sets-page";
import { GroupsPage } from "../features/groups/groups-page";
import { PlayersPage } from "../features/players/players-page";
import { RankingsPage } from "../features/rankings/rankings-page";
import { RulesPage } from "../features/rules/rules-page";
import { WordFilterPage } from "../features/word-filter/word-filter-page";
import { useSession } from "../auth/session-store";
import { AppShell } from "./app-shell";
import { NAV_ITEMS } from "./nav";

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-4">
      <PageTitle>{t("notFound.title")}</PageTitle>
      <Button asChild variant="outline">
        <Link to="/">{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}

// Recharts pesa casi la mitad del bundle: el Resumen se carga aparte.
const DashboardPage = lazy(() => import("../features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })));

const VIEWS: Record<string, ReactElement> = {
  dashboard: (
    <Suspense fallback={<ListSkeleton />}>
      <DashboardPage />
    </Suspense>
  ),
  players: <PlayersPage />,
  groups: <GroupsPage />,
  rankings: <RankingsPage />,
  challenges: <ChallengesPage />,
  daySets: <DaySetsPage />,
  rules: <RulesPage />,
  wordFilter: <WordFilterPage />,
  accounts: <AccountsPage />,
};

export function AppRoutes() {
  const status = useSession((s) => s.status);
  if (status === "loading") return <FullPageLoading />;
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      </Route>
      <Route element={<RequireAuth allowPasswordChange />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {NAV_ITEMS.map((item) => (
            <Route key={item.key} element={<RequireRole roles={item.roles} />}>
              <Route
                path={item.path}
                element={VIEWS[item.key]}
              />
            </Route>
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
