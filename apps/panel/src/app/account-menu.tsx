import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { THEMES, useTheme, type ThemeMode } from "@patio/theme";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { logout } from "../auth/session";
import { useSession } from "../auth/session-store";
import { LANGUAGES, type Language } from "../i18n";

const MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export function AccountMenu() {
  const { t, i18n } = useTranslation();
  const { themeId, setThemeId, mode, setMode } = useTheme();
  const account = useSession((s) => s.account);
  if (account === null) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t("account.menu")}>
          <UserRound aria-hidden="true" className="size-5" />
          <span className="hidden max-w-48 truncate sm:inline">{account.email}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          {account.email}
          <span className="block font-normal">{t(`account.role.${account.role}`)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("account.language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={(v) => {
            const next = LANGUAGES.find((l): l is Language => l === v);
            if (next) void i18n.changeLanguage(next);
          }}
        >
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              {l === "en" ? "English" : "Español (Uruguay)"}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("account.theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(v) => {
            const next = MODES.find((m) => m === v);
            if (next) setMode(next);
          }}
        >
          {MODES.map((m) => (
            <DropdownMenuRadioItem key={m} value={m}>
              {t(`account.mode.${m}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {THEMES.length > 1 && (
          <DropdownMenuRadioGroup value={themeId} onValueChange={setThemeId}>
            {THEMES.map((th) => (
              <DropdownMenuRadioItem key={th.id} value={th.id}>
                {th.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/change-password">
            <KeyRound aria-hidden="true" className="size-4" />
            {t("account.changePassword")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut aria-hidden="true" className="size-4" />
          {t("account.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
