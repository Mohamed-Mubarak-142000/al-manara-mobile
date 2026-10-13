import { useEffect, useState } from "react";

export type LoadState<T> = { status: "loading" } | { status: "ready"; data: T };

/** Runs `load` for `key` (again when the key changes); errors resolve to `fallback`. */
export function useLoad<T>(key: string, load: () => Promise<T>, fallback: T): LoadState<T> {
  const [state, setState] = useState<{ key: string; value: LoadState<T> }>({ key, value: { status: "loading" } });
  useEffect(() => {
    let alive = true;
    load()
      .catch(() => fallback)
      .then((data) => alive && setState({ key, value: { status: "ready", data } }));
    return () => {
      alive = false;
    };
    // `load` and `fallback` are read once per key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state.value : { status: "loading" };
}
