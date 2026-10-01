import { Suspense } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { getConfig } from "@/config";
import { AppShell } from "../layouts/AppShell";
import { legacyHashTarget } from "../navigation/legacyRoutes";
import { ALL_NAV_ITEMS } from "../navigation/navConfig";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PageLoader } from "../pages/PageLoader";
import { PreferencesPage } from "../pages/PreferencesPage";
import { RouteError } from "../pages/RouteError";
import { RedirectIfAuthenticated, RequireAuth, RequireNavItem } from "./guards";
import { HomeRedirect } from "./HomeRedirect";
import { LoginPage, MODULE_PAGES } from "./modules";

export interface RouteHandle {
  navId?: string;
  titleKey?: string;
}

function moduleRoutes(): RouteObject[] {
  return ALL_NAV_ITEMS.map((item) => {
    const Page = MODULE_PAGES[item.id];
    if (!Page) throw new Error(`No page registered for nav item ${item.id}`);
    return {
      path: item.path.slice(1),
      handle: { navId: item.id, titleKey: item.labelKey } satisfies RouteHandle,
      element: (
        <RequireNavItem id={item.id}>
          <Suspense fallback={<PageLoader />}>
            <Page />
          </Suspense>
        </RequireNavItem>
      ),
    };
  });
}

/**
 * Old apps used hash routing (#/supervisor/queue-chats). Rewrite such links to
 * their 2.0 path before the router starts, so auth redirects keep the target.
 */
function rewriteLegacyHash(basename: string) {
  const target = legacyHashTarget();
  if (!target) return;
  const prefix = basename === "/" ? "" : basename;
  globalThis.history.replaceState(null, "", `${prefix}${target}${globalThis.location.search}`);
}

export function createAppRouter() {
  const basename = getConfig().BASE_PATH.replace(/\/+$/, "") || "/";
  rewriteLegacyHash(basename);
  const routes: RouteObject[] = [
    {
      path: "/login",
      errorElement: <RouteError />,
      element: (
        <RedirectIfAuthenticated>
          <Suspense fallback={null}>
            <LoginPage />
          </Suspense>
        </RedirectIfAuthenticated>
      ),
    },
    {
      path: "/",
      errorElement: <RouteError />,
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <HomeRedirect /> },
        ...moduleRoutes(),
        {
          path: "preferences",
          handle: { titleKey: "preferences.title" } satisfies RouteHandle,
          element: <PreferencesPage />,
        },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ];
  return createBrowserRouter(routes, { basename });
}
