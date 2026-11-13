import { useTranslation } from "react-i18next";

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="absolute left-2 top-2 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 font-semibold text-primary-contrast focus:translate-y-0"
    >
      {t("app.skipToContent")}
    </a>
  );
}
