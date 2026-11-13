import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { PageTitle } from "../../components/page-title";
import { Button } from "../../components/ui/button";
import { login } from "../../auth/session";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  // Al iniciar sesion, PublicOnly redirige solo.
  const mutation = useMutation({ mutationFn: () => login(email.trim(), password) });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (email.trim() !== "" && password !== "") mutation.mutate();
  };
  const required = t("auth.required");

  return (
    <AuthLayout>
      <PageTitle>{t("auth.login.title")}</PageTitle>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="email"
          type="email"
          autoComplete="username"
          label={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={touched && email.trim() === "" ? required : null}
        />
        <FormField
          id="password"
          type="password"
          autoComplete="current-password"
          label={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={touched && password === "" ? required : null}
        />
        <FormError error={mutation.error} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
