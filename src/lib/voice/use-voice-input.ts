"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStt } from "@/lib/api";
import type { ListeningMode } from "@/lib/voice/preferences";

export interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  /** Called when recording starts (e.g. to barge-in on TTS). */
  onRecordingStart?: () => void;
  /** Push-to-talk (manual stop) or auto-stop after a pause. */
  mode?: ListeningMode;
}

export interface UseVoiceInputResult {
  supported: boolean;
  recording: boolean;
  busy: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** Toggle: start if idle, stop (and transcribe) if recording. */
  toggle: () => Promise<void>;
  /** Stop without transcribing (e.g. Escape cancel). */
  cancel: () => void;
}

/** RMS below this is treated as silence (0–255 scale average). */
const SILENCE_THRESHOLD = 12;
/** Continuous silence before auto-stop. */
const SILENCE_MS = 1200;
/** Ignore silence until this much audio has been recorded. */
const MIN_RECORD_MS = 500;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Headless push-to-talk (or auto-silence): MediaRecorder → POST /api/stt → onTranscript.
 */
export function useVoiceInput({
  onTranscript,
  onError,
  onRecordingStart,
  mode = "push-to-talk",
}: UseVoiceInputOptions): UseVoiceInputResult {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const discardOnStopRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onRecordingStartRef = useRef(onRecordingStart);
  const modeRef = useRef(mode);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onRecordingStartRef.current = onRecordingStart;
  }, [onRecordingStart]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const stopSilenceWatcher = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    stopSilenceWatcher();
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, [stopSilenceWatcher]);

  const reportError = useCallback((message: string) => {
    setError(message);
    onErrorRef.current?.(message);
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setBusy(true);
      setError(null);
      try {
        const text = await fetchStt(blob);
        onTranscriptRef.current(text);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        const message =
          status === 501
            ? "Voice input needs an ElevenLabs API key."
            : (err as Error).message || "Speech recognition failed.";
        reportError(message);
      } finally {
        setBusy(false);
      }
    },
    [reportError],
  );

  const stop = useCallback(() => {
    discardOnStopRef.current = false;
    stopSilenceWatcher();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseStream();
      setRecording(false);
    }
  }, [releaseStream, stopSilenceWatcher]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  /** Stop recording without sending audio to STT. */
  const cancel = useCallback(() => {
    discardOnStopRef.current = true;
    stopSilenceWatcher();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseStream();
      setRecording(false);
    }
  }, [releaseStream, stopSilenceWatcher]);

  const startSilenceWatcher = useCallback(
    (stream: MediaStream) => {
      if (modeRef.current !== "auto-silence") return;
      if (typeof AudioContext === "undefined") return;

      let ctx: AudioContext;
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const startedAt = performance.now();
      let silentSince: number | null = null;

      const tick = () => {
        if (!audioContextRef.current) return;
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const centered = data[i]! - 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / data.length);

        const now = performance.now();
        const elapsed = now - startedAt;

        if (elapsed >= MIN_RECORD_MS && rms < SILENCE_THRESHOLD) {
          if (silentSince === null) silentSince = now;
          else if (now - silentSince >= SILENCE_MS) {
            stopRef.current();
            return;
          }
        } else {
          silentSince = null;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  const start = useCallback(async () => {
    if (!supported || recording || busy) return;
    setError(null);
    discardOnStopRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      reportError("Microphone permission denied or unavailable.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      setRecording(false);
      const discard = discardOnStopRef.current;
      discardOnStopRef.current = false;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      mediaRecorderRef.current = null;
      releaseStream();
      if (discard) return;
      if (blob.size > 0) {
        void transcribe(blob);
      } else {
        reportError("No audio captured. Try again.");
      }
    };

    onRecordingStartRef.current?.();
    recorder.start();
    setRecording(true);
    startSilenceWatcher(stream);
  }, [
    busy,
    recording,
    releaseStream,
    reportError,
    startSilenceWatcher,
    supported,
    transcribe,
  ]);

  const toggle = useCallback(async () => {
    if (recording) {
      stop();
      return;
    }
    await start();
  }, [recording, start, stop]);

  useEffect(() => {
    return () => {
      discardOnStopRef.current = true;
      stopSilenceWatcher();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      releaseStream();
    };
  }, [releaseStream, stopSilenceWatcher]);

  return { supported, recording, busy, error, start, stop, cancel, toggle };
}
