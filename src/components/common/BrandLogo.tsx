import { useTenantBranding } from "@/core/tenant";
import { useResolvedTheme } from "@/core/theme";
import { cn } from "@/shared/lib/utils";

interface BrandLogoProps {
  className?: string;
  alt?: string;
  /** Square mark only (collapsed sidebar). */
  mark?: boolean;
  /** Force the white artwork, e.g. on the primary-coloured login panel. */
  inverted?: boolean;
}

/**
 * Tenant logo from the file engine when configured; otherwise the bundled
 * Expertflow artwork in the variant that reads on the current background.
 */
export function BrandLogo({ className, alt = "Agent Desk", mark, inverted }: BrandLogoProps) {
  const { logoUrl } = useTenantBranding();
  const theme = useResolvedTheme();
  const white = inverted || theme === "dark";
  const fallback = `${import.meta.env.BASE_URL}images/${mark ? "ef-mark" : "ef-logo"}${white ? "-white" : ""}.svg`;
  return (
    <img
      src={logoUrl ?? fallback}
      alt={alt}
      className={cn("h-7 w-auto object-contain", mark && "aspect-square", className)}
    />
  );
}
