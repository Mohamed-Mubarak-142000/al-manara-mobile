import { useNetInfo, type NetInfoState } from "@react-native-community/netinfo";

/**
 * Offline only when the system says so: no connection at all, or connected but the reachability check
 * failed. `null` (not yet known, the first moments after launch) counts as online so nothing flashes.
 */
export function isOffline(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/** True while the device has no usable internet connection. */
export function useIsOffline(): boolean {
  return isOffline(useNetInfo());
}
