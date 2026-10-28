/// <reference types="jest" />
import { trailingAuthRoutes } from "@/features/account/closeAuthFlow";
import { APP_SCHEME, OAUTH_REDIRECT, isOAuthRedirect } from "@/features/account/oauthRedirect";

import appConfig from "../app.json";

describe("closing the sign-in flow", () => {
  it("closes every auth screen on top, and nothing under them", () => {
    expect(trailingAuthRoutes(["(tabs)", "plan", "login"])).toBe(1);
    // login → "إنشاء حساب" replaces login with register.
    expect(trailingAuthRoutes(["(tabs)", "plan", "register"])).toBe(1);
    // login → forgot (pushed) → verify, reset (replaced).
    expect(trailingAuthRoutes(["(tabs)", "plan", "login", "reset-password"])).toBe(2);
    expect(trailingAuthRoutes(["onboarding", "register"])).toBe(1);
    expect(trailingAuthRoutes(["(tabs)", "plan"])).toBe(0);
    expect(trailingAuthRoutes(["login"])).toBe(1);
  });
});

describe("Google's redirect", () => {
  it("is recognised in the forms the router and the OS deliver", () => {
    expect(isOAuthRedirect("almanara://auth/callback?code=abc")).toBe(true);
    expect(isOAuthRedirect("/auth/callback?code=abc")).toBe(true);
    expect(isOAuthRedirect("exp://192.168.1.2:8081/--/auth/callback?code=abc")).toBe(true);
    expect(isOAuthRedirect("almanara://auth/callback#error_description=denied")).toBe(true);
    expect(isOAuthRedirect("almanara://mushaf?page=3")).toBe(false);
    expect(isOAuthRedirect("/auth/callbacks")).toBe(false);
  });
});

describe("the redirect Google sends back to", () => {
  it("is exactly the URL allow-listed in Supabase Auth, on the app's own scheme", () => {
    // Supabase sends any URL not on its list to the Site URL (the website); checked against the project
    // on 2026-10-28: almanara://auth/callback is accepted, almanara://anything falls back to the site.
    expect(OAUTH_REDIRECT).toBe("almanara://auth/callback");
    expect(appConfig.expo.scheme).toBe(APP_SCHEME);
    expect(isOAuthRedirect(`${OAUTH_REDIRECT}?code=abc`)).toBe(true);
  });
});
