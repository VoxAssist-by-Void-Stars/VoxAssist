"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTts } from "@/lib/api";

export interface UseTtsResult {
  speaking: boolean;
  /** True when either ElevenLabs or browser SpeechSynthesis can play. */
  supported: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

function stripForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function browserSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Headless TTS: try ElevenLabs via /api/tts, fall back to SpeechSynthesis.
 */
export function useTts(): UseTtsResult {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const generationRef = useRef(0);

  const supported =
    typeof window !== "undefined"
      ? true // always attempt ElevenLabs; browser path is the fallback
      : false;

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(false);
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      cleanupAudio();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudio]);

  const speakBrowser = useCallback(
    (text: string, gen: number) => {
      if (!browserSpeechSupported()) {
        setSpeaking(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.onend = () => {
        if (generationRef.current === gen) setSpeaking(false);
      };
      utter.onerror = () => {
        if (generationRef.current === gen) setSpeaking(false);
      };
      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [],
  );

  const speak = useCallback(
    async (raw: string) => {
      const text = stripForSpeech(raw);
      if (!text) return;

      stop();
      const gen = generationRef.current;
      setSpeaking(true);

      try {
        const blob = await fetchTts(text);
        if (generationRef.current !== gen) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          if (generationRef.current === gen) {
            cleanupAudio();
            setSpeaking(false);
          }
        };
        audio.onerror = () => {
          if (generationRef.current === gen) {
            cleanupAudio();
            speakBrowser(text, gen);
          }
        };
        await audio.play();
      } catch {
        if (generationRef.current !== gen) return;
        speakBrowser(text, gen);
      }
    },
    [cleanupAudio, speakBrowser, stop],
  );

  return { speaking, supported, speak, stop };
}
