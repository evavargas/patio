import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router";
import { Toaster } from "../components/ui/toaster";
import { SkipLink } from "../components/skip-link";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";
import { useSession } from "../auth/session-store";
import { AccountMenu } from "./account-menu";
import { NAV_ITEMS } from "./nav";

export function AppShell() {
  const { t } = useTranslation();
  const role = useSession((s) => s.account?.role);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <SkipLink />
      <aside className="border-b-2 border-border bg-surface md:border-b-0 md:border-r-2">
        <div className="flex items-center justify-between gap-2 p-4">
          <span className="text-xl font-bold">{t("app.name")}</span>
          <Button
            variant="outline"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            {t("nav.menu")}
          </Button>
        </div>
        <nav id="main-nav" aria-label={t("nav.label")} className={cn("px-2 pb-4", open ? "block" : "hidden md:block")}>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => role !== undefined && item.roles.includes(role)).map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-touch items-center gap-3 rounded-md px-3 font-medium hover:bg-primary-soft",
                      isActive && "bg-primary-soft font-bold underline",
                    )
                  }
                >
                  <item.icon aria-hidden="true" className="size-5" />
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-2 border-b-2 border-border bg-surface p-4">
          <AccountMenu />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 p-6 outline-none">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </div>
  );
}
