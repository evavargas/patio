import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { changePassword } from "../../api/panel-api";
import { FormError } from "../../components/form-error";
import { PageTitle } from "../../components/page-title";
import { Button } from "../../components/ui/button";
import { useSession } from "../../auth/session-store";
import { AuthLayout } from "./auth-layout";
import { NewPasswordForm } from "./new-password-form";

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Se captura al entrar: tras guardar, mustChangePassword pasa a false.
  const [forced] = useState(() => useSession.getState().account?.mustChangePassword === true);
  const mutation = useMutation({
    mutationFn: (v: { current: string; next: string }) =>
      changePassword({ currentPassword: v.current, newPassword: v.next }),
    onSuccess: (session) => {
      useSession.getState().setSession(session);
      if (forced) void navigate("/", { replace: true });
    },
  });

  return (
    <AuthLayout>
      <PageTitle>{t("auth.changePassword.title")}</PageTitle>
      {mutation.isSuccess && !forced ? (
        <>
          <p role="status">{t("auth.changePassword.done")}</p>
          <Button asChild>
            <Link to="/">{t("auth.changePassword.back")}</Link>
          </Button>
        </>
      ) : (
        <>
          {forced && <p>{t("auth.changePassword.forced")}</p>}
          <FormError error={mutation.error} />
          <NewPasswordForm
            withCurrent
            pending={mutation.isPending}
            submitLabel={t("auth.changePassword.submit")}
            onSubmit={(v) => mutation.mutate(v)}
          />
          {!forced && (
            <Button asChild variant="ghost">
              <Link to="/">{t("auth.changePassword.back")}</Link>
            </Button>
          )}
        </>
      )}
    </AuthLayout>
  );
}
