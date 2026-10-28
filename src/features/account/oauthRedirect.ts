/** The app's URL scheme (app.json "scheme"). */
export const APP_SCHEME = "almanara";

/**
 * Where Supabase sends the user back after Google: exactly the URL allow-listed in Supabase Auth
 * (Redirect URLs). Any other URL — even almanara://anything — is not allowed, and Supabase then falls
 * back to the Site URL: the website opens in the browser instead of the app. So it is fixed here
 * rather than built by Linking.createURL, which in a development build adds the Metro host
 * ("almanara://192.168.1.5:8081auth/callback", "almanara:///--/auth/callback").
 */
export const OAUTH_REDIRECT = `${APP_SCHEME}://auth/callback`;

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
