import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionOptions,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";

export type SpeechError = "not-allowed" | "network" | "unsupported" | "other";

/** Errors that only end the current session; "end" restarts it while still wanted. */
const SILENT: ExpoSpeechRecognitionErrorCode[] = ["no-speech", "aborted", "speech-timeout"];
/**
 * Hiccups that usually clear on their own: the recognizer still busy with the previous session,
 * another app or our own player holding the mic for a moment, a call or Siri interrupting, a flaky
 * connection. They are retried with a growing pause before the user is told anything.
 */
const TRANSIENT: ExpoSpeechRecognitionErrorCode[] = ["busy", "client", "unknown", "audio-capture", "interrupted", "network"];
const MAX_RETRIES = 4;

/** Samsung/Huawei default services often reject Arabic or continuous mode; Google's handles both. */
const GOOGLE_SERVICE = "com.google.android.googlequicksearchbox";

function androidService(): string | undefined {
  if (Platform.OS !== "android") return undefined;
  try {
    const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
    const fallback = ExpoSpeechRecognitionModule.getDefaultRecognitionService().packageName;
    if (fallback === GOOGLE_SERVICE || !services.includes(GOOGLE_SERVICE)) return undefined;
    return GOOGLE_SERVICE;
  } catch {
    return undefined;
  }
}

function options(): ExpoSpeechRecognitionOptions {
  return {
    lang: "ar-SA",
    interimResults: true,
    // Android 12 and older reject continuous mode; there the "end" restart keeps it going instead.
    continuous: Platform.OS !== "android" || Number(Platform.Version) >= 33,
    addsPunctuation: false,
    maxAlternatives: 1,
    androidRecognitionServicePackage: androidService(),
  };
}

/** Whether this device can recognise speech at all (any service, not only the default one). */
export function speechAvailable(): boolean {
  try {
    if (ExpoSpeechRecognitionModule.isRecognitionAvailable()) return true;
    return Platform.OS === "android" && ExpoSpeechRecognitionModule.getSpeechRecognitionServices().length > 0;
  } catch {
    return false;
  }
}

/** Sends the user to this app's page in the device settings, to allow the microphone. */
export function openMicSettings() {
  void Linking.openSettings().catch(() => {});
}

/**
 * The native counterpart of the website's useSpeechRecognition: Arabic recognition that keeps going
 * until stopped (it restarts after the OS ends a session on silence). `onFinal` gets each finished
 * phrase once; `onInterim` the live text. Android's continuous mode reports each segment on its own,
 * which is exactly the "one phrase per final" the matcher expects.
 *
 * Every native start and every abort is answered by exactly one "end". `active` tracks whether that
 * "end" is still owed, so a session is never opened on top of one that is still closing: the late
 * "end" of a stopped session used to restart (and kill) the new one, which surfaced as the mic
 * "stopping unexpectedly" right after tapping it.
 */
export function useSpeech({ onFinal, onInterim }: { onFinal: (text: string) => void; onInterim: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const wanted = useRef(false);
  const active = useRef(false);
  const failures = useRef(0);
  const lastFailure = useRef<SpeechError>("other");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlers = useRef({ onFinal, onInterim });
  useEffect(() => {
    handlers.current = { onFinal, onInterim };
  });

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const open = useCallback(() => {
    timer.current = null;
    if (!wanted.current || active.current) return;
    active.current = true;
    try {
      ExpoSpeechRecognitionModule.start(options());
    } catch {
      active.current = false;
      wanted.current = false;
      setListening(false);
      setError("other");
    }
  }, []);

  const giveUp = useCallback((reason: SpeechError) => {
    wanted.current = false;
    clearTimer();
    setError(reason);
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    failures.current = 0;
    const text = event.results[0]?.transcript.trim() ?? "";
    if (event.isFinal) {
      handlers.current.onInterim("");
      if (text) handlers.current.onFinal(text);
    } else handlers.current.onInterim(text);
  });

  useSpeechRecognitionEvent("speechstart", () => {
    failures.current = 0;
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (!wanted.current || SILENT.includes(event.error)) return;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") giveUp("not-allowed");
    else if (event.error === "language-not-supported") giveUp("unsupported");
    else if (TRANSIENT.includes(event.error)) {
      failures.current += 1;
      lastFailure.current = event.error === "network" ? "network" : "other";
      if (failures.current > MAX_RETRIES) giveUp(lastFailure.current);
    } else giveUp("other");
  });

  useSpeechRecognitionEvent("end", () => {
    active.current = false;
    if (wanted.current) {
      clearTimer();
      // A quick restart after silence; a longer pause after each failure so a busy recognizer can settle.
      timer.current = setTimeout(open, failures.current === 0 ? 150 : 400 * failures.current);
    } else {
      setListening(false);
      handlers.current.onInterim("");
    }
  });

  const start = useCallback(async () => {
    setError(null);
    failures.current = 0;
    if (!speechAvailable()) {
      setError("unsupported");
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      setError("not-allowed");
      return;
    }
    wanted.current = true;
    setListening(true);
    // If the previous session is still closing, its "end" opens the new one.
    if (!active.current) open();
  }, [open]);

  const stop = useCallback(() => {
    wanted.current = false;
    clearTimer();
    setListening(false);
    handlers.current.onInterim("");
    if (active.current) ExpoSpeechRecognitionModule.abort();
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { listening, error, start, stop };
}
