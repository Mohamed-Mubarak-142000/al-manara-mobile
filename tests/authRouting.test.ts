/// <reference types="jest" />
import { trailingAuthRoutes } from "@/features/account/closeAuthFlow";
import { isOAuthRedirect } from "@/features/account/oauthRedirect";

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
