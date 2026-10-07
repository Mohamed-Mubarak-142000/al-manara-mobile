import { router, useNavigation } from "expo-router";
import { useCallback, useRef } from "react";

const AUTH_ROUTES = new Set(["login", "register", "verify", "forgot-password", "reset-password"]);

/** How many auth screens sit on top of the stack (login → register, forgot → verify → reset…). */
export function trailingAuthRoutes(names: string[]): number {
  let count = 0;
  for (let index = names.length - 1; index >= 0 && AUTH_ROUTES.has(names[index]!); index--) count++;
  return count;
}

/**
 * Closes the whole sign-in flow and lands back on the screen that opened it (plan, khatma, support,
 * onboarding…), however many auth screens were pushed or replaced on the way. dismissAll() went to
 * the top of the stack (Home) and lost that screen; back() only closed one of them. A second call
 * (a double tap, Google and the form both finishing) does nothing.
 */
export function useCloseAuthFlow(): () => void {
  const navigation = useNavigation();
  const closed = useRef(false);
  return useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    const routes = navigation.getState()?.routes ?? [];
    const count = trailingAuthRoutes(routes.map((route) => route.name));
    if (count > 0 && count < routes.length) router.dismiss(count);
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [navigation]);
}
