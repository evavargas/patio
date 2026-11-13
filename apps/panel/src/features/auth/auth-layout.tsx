import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SkipLink } from "../../components/skip-link";
import { Card } from "../../components/ui/card";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <SkipLink />
      <p className="text-3xl font-bold text-primary">{t("app.name")}</p>
      <main id="main" tabIndex={-1} className="w-full max-w-md outline-none">
        <Card className="flex flex-col gap-5">{children}</Card>
      </main>
    </div>
  );
}
