/**
 * Google's redirect back into the app (almanara://auth/callback?code=…). Pure, so the link handler
 * (+native-intent) can recognise it without loading the Supabase client.
 */
export function isOAuthRedirect(url: string): boolean {
  return /^(?:[a-z][\w+.-]*:\/\/(?:[^/]*\/)*?)?\/?(?:--\/)?auth\/callback(?:[?#]|$)/i.test(url);
}

/** `code` and `error_description` from the query or the #fragment (Supabase may use either). */
export function redirectParams(url: string): { code: string | null; error: string | null } {
  const parsed = new URL(url, "almanara://app");
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const read = (key: string) => parsed.searchParams.get(key) ?? hash.get(key);
  return { code: read("code"), error: read("error_description") ?? read("error") };
}
