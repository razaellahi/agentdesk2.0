import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { displayName, type TeamUser } from "./model";

export function UserPicker({
  legend,
  users,
  selected,
  disabled,
  onChange,
}: {
  legend: string;
  users: TeamUser[];
  selected: string[];
  disabled?: boolean;
  onChange: (usernames: string[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) => user.username.toLowerCase().includes(term) || displayName(user).toLowerCase().includes(term),
    );
  }, [query, users]);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("teams.search-people")}
        aria-label={t("teams.search-people")}
      />
      <div className="max-h-36 space-y-1 overflow-auto rounded-md border p-2">
        {shown.length === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">{t("teams.no-people")}</p>
        )}
        {shown.map((user) => {
          const checked = selected.includes(user.username);
          const id = `${legend}-${user.username}`;
          return (
            <label
              key={user.username}
              htmlFor={id}
              className="flex items-center gap-2 rounded-md px-1 py-1 text-sm"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => {
                  onChange(
                    value === true
                      ? [...selected, user.username]
                      : selected.filter((username) => username !== user.username),
                  );
                }}
              />
              <span className="min-w-0 truncate">
                {user.username}
                <span className="text-muted-foreground"> ({displayName(user)})</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
