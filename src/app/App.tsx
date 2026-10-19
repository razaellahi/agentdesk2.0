import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { RouterProvider } from "react-router";
import { ConfirmHost } from "@/components/common/ConfirmHost";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/core/i18n";
import { useResolvedTheme } from "@/core/theme";
import type { BootContext } from "./bootstrap";
import { BootContextProvider } from "./providers/BootContext";
import { queryClient } from "./providers/queryClient";
import { SessionEffects } from "./providers/SessionEffects";
import { createAppRouter } from "./router/router";
// Registers the voice password hook before the user signs in.
import "@/features/voice";

export function App({ context }: { context: BootContext }) {
  // Created after bootstrap: the basename comes from runtime config.
  const [router] = useState(createAppRouter);
  const theme = useResolvedTheme();
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BootContextProvider value={context}>
          <TooltipProvider delayDuration={300}>
            <SessionEffects />
            <RouterProvider router={router} />
            {/* Bottom right, as before; the offset keeps it clear of the composer's edge. */}
            <Toaster
              theme={theme}
              position="bottom-right"
              offset={{ bottom: 20, right: 16 }}
              mobileOffset={{ bottom: 16, left: 12, right: 12 }}
              visibleToasts={3}
              closeButton
            />
            <ConfirmHost />
          </TooltipProvider>
        </BootContextProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
