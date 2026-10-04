import { useEffect, useState } from "react";

export type AsyncState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error" };

/**
 * Loads `load()` whenever `key` changes and keeps results keyed by it, so a change of key reads as
 * loading straight away instead of showing the previous result. `reload` retries the same key.
 */
export function useAsync<T>(key: string, load: () => Promise<T | null>): { state: AsyncState<T>; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}#${attempt}`;
  const [result, setResult] = useState<{ key: string; state: AsyncState<T> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setResult({ key: requestKey, state: data === null ? { status: "error" } : { status: "ready", data } }))
      .catch(() => !cancelled && setResult({ key: requestKey, state: { status: "error" } }));
    return () => {
      cancelled = true;
    };
    // `requestKey` stands for everything `load` depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return {
    state: result?.key === requestKey ? result.state : { status: "loading" },
    reload: () => setAttempt((value) => value + 1),
  };
}
