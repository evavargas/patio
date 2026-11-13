import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "../../components/form-field";
import { Button } from "../../components/ui/button";

// Limites de ChangePasswordRequest.newPassword en @patio/contracts (schemas/account.schema.json).
// shortcut: copiados a mano porque importar los validadores de contracts trae Ajv (usa eval, la CSP lo bloquea).
// Cuando contracts publique validadores precompilados, leerlos de ahi.
export const PASSWORD_MIN = 15;
export const PASSWORD_MAX = 128;

interface Props {
  /** Pide la contrasena actual (cambio de contrasena). Invitacion: no. */
  withCurrent: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: { current: string; next: string }) => void;
}

export function NewPasswordForm({ withCurrent, submitLabel, pending, onSubmit }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  const currentError = touched && withCurrent && current === "" ? t("auth.required") : null;
  const nextError = touched && next.length < PASSWORD_MIN ? t("auth.tooShort", { min: PASSWORD_MIN }) : null;
  const confirmError = touched && confirm !== next ? t("auth.mismatch") : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if ((withCurrent && current === "") || next.length < PASSWORD_MIN || confirm !== next) return;
    onSubmit({ current, next });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {withCurrent && (
        <FormField
          id="current-password"
          type="password"
          autoComplete="current-password"
          label={t("auth.currentPassword")}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={currentError}
        />
      )}
      <FormField
        id="new-password"
        type="password"
        autoComplete="new-password"
        maxLength={PASSWORD_MAX}
        label={t("auth.newPassword")}
        hint={t("auth.passwordHint", { min: PASSWORD_MIN, max: PASSWORD_MAX })}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        error={nextError}
      />
      <FormField
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        maxLength={PASSWORD_MAX}
        label={t("auth.confirmPassword")}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={confirmError}
      />
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
