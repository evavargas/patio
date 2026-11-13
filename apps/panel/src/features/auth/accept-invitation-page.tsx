import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { acceptInvitation } from "../../api/panel-api";
import { FormError } from "../../components/form-error";
import { PageTitle } from "../../components/page-title";
import { Button } from "../../components/ui/button";
import { AuthLayout } from "./auth-layout";
import { NewPasswordForm } from "./new-password-form";

export function AcceptInvitationPage() {
  const { t } = useTranslation();
  const token = useSearchParams()[0].get("token");
  const mutation = useMutation({
    mutationFn: (password: string) => acceptInvitation({ token: token ?? "", password }),
  });

  return (
    <AuthLayout>
      <PageTitle>{t("auth.invitation.title")}</PageTitle>
      {mutation.isSuccess ? (
        <>
          <p role="status">{t("auth.invitation.done")}</p>
          <Button asChild>
            <Link to="/login">{t("auth.invitation.backToLogin")}</Link>
          </Button>
        </>
      ) : token === null || token === "" ? (
        <>
          <p role="alert">{t("auth.invitation.missingToken")}</p>
          <Button asChild variant="outline">
            <Link to="/login">{t("auth.invitation.backToLogin")}</Link>
          </Button>
        </>
      ) : (
        <>
          <p>{t("auth.invitation.intro")}</p>
          <FormError error={mutation.error} />
          <NewPasswordForm
            withCurrent={false}
            pending={mutation.isPending}
            submitLabel={t("auth.invitation.submit")}
            onSubmit={(v) => mutation.mutate(v.next)}
          />
        </>
      )}
    </AuthLayout>
  );
}
