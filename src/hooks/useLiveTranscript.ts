import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API, which TypeScript's DOM library does not ship. */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow the microphone for this site in your browser settings.",
  "service-not-allowed": "Speech recognition is not allowed in this browser. Try Chrome on Android or a computer.",
  "language-not-supported": "This language is not supported for live listening. Choose another language.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs internet. Reconnecting…",
};
const FATAL = new Set(["not-allowed", "service-not-allowed", "language-not-supported", "audio-capture"]);

/**
 * Live speech-to-text from the device microphone using the browser's speech recognition.
 * Browsers stop recognition after pauses, so it restarts itself until stop() is called.
 * Only text is kept; no audio is stored.
 */
export function useLiveTranscript(language: string) {
  const supported = getRecognitionCtor() !== null;
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRunningRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
      if (nav.wakeLock && !wakeLockRef.current) wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      /* Keeping the screen on is a convenience; ignore if refused. */
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }, []);

  const stop = useCallback(() => {
    wantRunningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
    releaseWakeLock();
  }, [releaseWakeLock]);

  const startRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalChunk.trim()) {
        setFinalText((prev) => (prev ? `${prev.trimEnd()} ${finalChunk.trim()}` : finalChunk.trim()));
        setError(null);
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(ERROR_TEXT[event.error] ?? `Listening problem: ${event.error}`);
      if (FATAL.has(event.error)) {
        wantRunningRef.current = false;
        setListening(false);
        releaseWakeLock();
      }
    };

    rec.onend = () => {
      setInterim("");
      if (wantRunningRef.current) {
        // Restart after the browser's automatic stop (silence, time limit, brief network loss).
        setTimeout(() => {
          if (wantRunningRef.current) startRecognition();
        }, 300);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* start() throws if already started; the next onend restarts it. */
    }
  }, [language, releaseWakeLock]);

  const start = useCallback(() => {
    if (!supported || wantRunningRef.current) return;
    setError(null);
    wantRunningRef.current = true;
    setListening(true);
    requestWakeLock();
    startRecognition();
  }, [supported, requestWakeLock, startRecognition]);

  // The screen lock is dropped when the tab is hidden; take it back on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && wantRunningRef.current) {
        wakeLockRef.current = null;
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [requestWakeLock]);

  useEffect(
    () => () => {
      wantRunningRef.current = false;
      recognitionRef.current?.abort();
      releaseWakeLock();
    },
    [releaseWakeLock],
  );

  return { supported, listening, finalText, setFinalText, interim, error, start, stop };
}
