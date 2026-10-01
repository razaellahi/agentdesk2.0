import { http, HttpResponse, type HttpHandler } from "msw";
import { fakeJwt, MOCK_DESK_SETTINGS, MOCK_LOCALE_SETTING, MOCK_TRANSLATIONS, MOCK_USERS } from "./data";

/** Mutable mock state so admin screens can save and read back. */
export const mockDb = {
  deskSettings: structuredClone(MOCK_DESK_SETTINGS),
  localeSetting: structuredClone(MOCK_LOCALE_SETTING),
  preferences: new Map<string, Record<string, unknown>>(),
  translations: structuredClone(MOCK_TRANSLATIONS) as Record<string, Record<string, unknown>>,
};

const loginResponse = (username: string) => {
  const entry = MOCK_USERS[username] ?? MOCK_USERS.agent!;
  return {
    data: {
      token: fakeJwt(entry.realmRoles),
      refresh_token: `refresh-${entry.user.username}`,
      keycloak_User: entry.user,
      is2FAEnabled: false,
    },
  };
};

export const handlers: HttpHandler[] = [
  // --- agent-manager auth
  http.post("*/agent/login", async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username ?? "agent";
    if (body.password === "wrong") {
      return HttpResponse.json({ error: { error_message: "Invalid user credentials" } }, { status: 401 });
    }
    if (body.password === "expired") {
      return HttpResponse.json(
        {
          error: {
            error_message: "Password update required",
            error_detail: { reason: "Password update required" },
          },
        },
        { status: 400 },
      );
    }
    const entry = MOCK_USERS[username];
    if (entry?.twoFA) {
      return HttpResponse.json({
        data: {
          ...loginResponse(username).data,
          is2FAEnabled: true,
          twoFAChannel: entry.twoFA.toUpperCase(),
          is2FARegistered: true,
        },
      });
    }
    return HttpResponse.json(loginResponse(username));
  }),
  http.post("*/agent/validate-otp", async ({ request }) => {
    const body = (await request.json()) as { username: string; otpToValidate: string };
    if (body.otpToValidate !== "123456") return HttpResponse.json({ error: "Invalid OTP" }, { status: 401 });
    return HttpResponse.json({ statusCode: 200, ...loginResponse(body.username) });
  }),
  http.post("*/agent/register-2FA", () => HttpResponse.json({ statusCode: 200 })),
  http.post("*/agent/resendOTP", () => HttpResponse.json({ statusCode: 200 })),
  http.post("*/agent/refresh-token", async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string };
    const username = refreshToken?.replace(/^refresh-/, "") ?? "agent";
    return HttpResponse.json({ data: { access_token: fakeJwt(MOCK_USERS[username]?.realmRoles ?? []) } });
  }),
  http.get("*/agent/pswd-policies", () =>
    HttpResponse.json({
      data: {
        policies: [
          { type: "length", value: "8" },
          { type: "upperCase", value: "1" },
          { type: "digits", value: "1" },
          { type: "specialChars", value: "1" },
          { type: "notUsername", value: "" },
          { type: "passwordHistory", value: "3" },
        ],
      },
    }),
  ),
  http.post("*/agent/reset-pswd", () => new HttpResponse("ok", { status: 200 })),

  // --- unified-admin
  http.get("*/agent-desk-settings", () => HttpResponse.json([mockDb.deskSettings])),
  http.put("*/agent-desk-settings", async ({ request }) => {
    const body = (await request.json()) as typeof mockDb.deskSettings;
    mockDb.deskSettings = { ...mockDb.deskSettings, ...body };
    return HttpResponse.json(mockDb.deskSettings);
  }),
  http.get("*/locale-setting", () => HttpResponse.json([mockDb.localeSetting])),
  http.post("*/locale-setting", async ({ request }) => {
    mockDb.localeSetting = { ...((await request.json()) as typeof mockDb.localeSetting), id: "loc-new" };
    return HttpResponse.json(mockDb.localeSetting);
  }),
  http.put("*/locale-setting", async ({ request }) => {
    mockDb.localeSetting = { ...mockDb.localeSetting, ...((await request.json()) as object) };
    return HttpResponse.json(mockDb.localeSetting);
  }),

  // --- file engine
  http.get("*/api/getTenantLogo", () => new HttpResponse(null, { status: 404 })),
  http.get("*/api/i18n/translations", ({ request }) => {
    // The agent app asks with ?locale=… and gets bundled files as fallback; the admin
    // Translations screen asks without a locale and edits mockDb.translations.
    if (new URL(request.url).searchParams.get("locale")) return HttpResponse.json({ translations: {} });
    return HttpResponse.json({ translations: mockDb.translations });
  }),
  http.put("*/api/i18n/translations", async ({ request }) => {
    const body = (await request.json()) as { locale: string; translations: Record<string, unknown> };
    mockDb.translations[body.locale] = body.translations;
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/i18n/reference-translations", () =>
    HttpResponse.json({ translations: { en: MOCK_TRANSLATIONS.en } }),
  ),
  http.get("*/api/i18n/backup-translations", () => HttpResponse.json({ translations: MOCK_TRANSLATIONS })),
  http.post("*/api/i18n/backup-translations/restore", async ({ request }) => {
    const { locale } = (await request.json()) as { locale: string };
    mockDb.translations[locale] = structuredClone(MOCK_TRANSLATIONS[locale] ?? {});
    return HttpResponse.json({ ok: true });
  }),

  // --- cim-customer agent preferences
  http.get("*/agentSetting", ({ request }) => {
    const userId = new URL(request.url).searchParams.get("user_Id") ?? "";
    const prefs = mockDb.preferences.get(userId) ?? {
      _id: `pref-${userId}`,
      user_Id: userId,
      theme: "system",
      language: "en",
    };
    mockDb.preferences.set(userId, prefs);
    return HttpResponse.json(prefs);
  }),
  http.put("*/agentSetting/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.user_Id === "string") mockDb.preferences.set(body.user_Id, body);
    return HttpResponse.json(body);
  }),
];
