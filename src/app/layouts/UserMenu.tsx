import { KeyRound, LogOut, Settings } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout, useCurrentUser } from "@/core/auth";
import { initials } from "@/shared/lib/initials";

const ChangePasswordDialog = lazy(() =>
  import("@/features/auth").then((m) => ({ default: m.ChangePasswordDialog })),
);

export function UserMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [changePassword, setChangePassword] = useState(false);
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label={t("app-header.agent-menu")}>
            <Avatar className="size-8">
              <AvatarFallback className="bg-surface-3 text-xs font-bold text-medium">
                {initials(user.firstName, user.lastName, user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium lg:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.username}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/preferences")}>
            <Settings className="size-4" aria-hidden />
            {t("preferences.title")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setChangePassword(true)}>
            <KeyRound className="size-4" aria-hidden />
            {t("app-header.change-password")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("app-header.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {changePassword && (
        <Suspense fallback={null}>
          <ChangePasswordDialog
            open
            onOpenChange={setChangePassword}
            username={user.username}
            mode="voluntary"
          />
        </Suspense>
      )}
    </>
  );
}
