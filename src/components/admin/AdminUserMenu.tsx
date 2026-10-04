import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initial = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function AdminUserMenu() {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const name = profile?.full_name || t("admin.adminFallback");
  const email = profile?.email || "";

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary"
          aria-label={t("admin.userMenuAria")}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initial(name) || <UserRound className="h-4 w-4" />}
          </span>
          <span className="hidden text-sm leading-tight lg:block">
            <span className="block font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">{email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{name}</p>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
          {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t("admin.hubProduction")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("language.label")}</span>
          <LanguageSwitcher />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleSignOut()}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t("action.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
