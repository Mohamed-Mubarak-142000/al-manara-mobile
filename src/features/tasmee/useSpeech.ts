import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechError = "not-allowed" | "network" | "unsupported" | "other";

/**
 * The native counterpart of the website's useSpeechRecognition: Arabic recognition that keeps going
 * until stopped (it restarts after the OS ends a session on silence). `onFinal` gets each finished
 * phrase once; `onInterim` the live text. Android's continuous mode reports each segment on its own,
 * which is exactly the "one phrase per final" the matcher expects.
 */
export function useSpeech({ onFinal, onInterim }: { onFinal: (text: string) => void; onInterim: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const wanted = useRef(false);
  const handlers = useRef({ onFinal, onInterim });
  useEffect(() => {
    handlers.current = { onFinal, onInterim };
  });

  const open = useCallback(() => {
    if (!wanted.current) return;
    ExpoSpeechRecognitionModule.start({
      lang: "ar-SA",
      interimResults: true,
      continuous: true,
      addsPunctuation: false,
      maxAlternatives: 1,
    });
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript.trim() ?? "";
    if (event.isFinal) {
      handlers.current.onInterim("");
      if (text) handlers.current.onFinal(text);
    } else handlers.current.onInterim(text);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // Silence and our own aborts just end the session; "end" restarts it when still wanted.
    if (event.error === "no-speech" || event.error === "aborted" || event.error === "speech-timeout") return;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      wanted.current = false;
      setError("not-allowed");
    } else if (event.error === "network") {
      wanted.current = false;
      setError("network");
    } else if (event.error === "language-not-supported") {
      wanted.current = false;
      setError("unsupported");
    } else setError("other");
  });

  useSpeechRecognitionEvent("end", () => {
    if (wanted.current) setTimeout(open, 150);
    else {
      setListening(false);
      handlers.current.onInterim("");
    }
  });

  const start = useCallback(async () => {
    setError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError("unsupported");
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError("not-allowed");
      return;
    }
    wanted.current = true;
    setListening(true);
    open();
  }, [open]);

  const stop = useCallback(() => {
    wanted.current = false;
    setListening(false);
    handlers.current.onInterim("");
    ExpoSpeechRecognitionModule.abort();
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { listening, error, start, stop };
}
