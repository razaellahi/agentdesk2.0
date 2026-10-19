/* eslint-disable react-refresh/only-export-components -- test-only harness, never hot-reloaded */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import i18next from "i18next";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { ConfirmHost } from "@/components/common/ConfirmHost";
import { setConfig } from "@/config";
import { configureApiAuth } from "@/core/api";
import { getSession, useSessionStore } from "@/core/auth";
import { makeConfig } from "@/test/fixtures";
import { caseHandlers, resetCaseDb } from "@/test/msw/cases";
import { MOCK_USERS, mockUserJwt } from "@/test/msw/data";
import en from "../../../../public/i18n/en.json";
import { resetDisplayNames } from "../hooks/useDisplayNames";

export const CASE_API = "https://efcx.expertflow.com/case-api";

// Radix Select/Popover call these pointer and scroll APIs, which jsdom lacks.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

/** MSW case backend + config + API auth bridge for one test file. */
export function useCaseBackend() {
  const server = setupServer(...caseHandlers);
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  beforeEach(() => {
    resetCaseDb();
    resetDisplayNames();
    setConfig(makeConfig({ CASE_API_URL: CASE_API }));
    configureApiAuth({
      getAccessToken: () => getSession().accessToken,
      getAgentId: () => getSession().user?.id ?? null,
      refresh: async () => false,
      onUnauthorized: () => {},
    });
  });
  afterEach(() => {
    server.resetHandlers();
    useSessionStore.getState().endSession();
  });
  afterAll(() => server.close());
  return server;
}

export function signIn(username: keyof typeof MOCK_USERS) {
  const entry = MOCK_USERS[username]!;
  useSessionStore.getState().startSession({
    user: entry.user,
    accessToken: mockUserJwt(username),
    refreshToken: `refresh-${username}`,
    method: "password",
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** Renders `ui` at `path` with query client, i18n (English), router and confirm host. */
export function renderCase(
  ui: ReactNode,
  { path = "/", route = "*" }: { path?: string; route?: string } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
          </Routes>
          <LocationProbe />
          <ConfirmHost />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}
