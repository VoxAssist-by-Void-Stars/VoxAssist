"use client";

import { useCallback, useEffect, useState } from "react";

export type ListeningMode = "push-to-talk" | "auto-silence";

export interface VoicePreferences {
  autoSubmitOnDictation: boolean;
  listeningMode: ListeningMode;
  autoReadAnswer: boolean;
}

export interface UseVoicePreferencesResult extends VoicePreferences {
  setAutoSubmitOnDictation: (value: boolean) => void;
  setListeningMode: (value: ListeningMode) => void;
  setAutoReadAnswer: (value: boolean) => void;
}

const STORAGE_KEY = "voxassist:voice-preferences";

const DEFAULTS: VoicePreferences = {
  autoSubmitOnDictation: false,
  listeningMode: "push-to-talk",
  autoReadAnswer: false,
};

function isListeningMode(value: unknown): value is ListeningMode {
  return value === "push-to-talk" || value === "auto-silence";
}

function readStored(): VoicePreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<VoicePreferences>;
    return {
      autoSubmitOnDictation:
        typeof parsed.autoSubmitOnDictation === "boolean"
          ? parsed.autoSubmitOnDictation
          : DEFAULTS.autoSubmitOnDictation,
      listeningMode: isListeningMode(parsed.listeningMode)
        ? parsed.listeningMode
        : DEFAULTS.listeningMode,
      autoReadAnswer:
        typeof parsed.autoReadAnswer === "boolean"
          ? parsed.autoReadAnswer
          : DEFAULTS.autoReadAnswer,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeStored(prefs: VoicePreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Persisted voice UX preferences (SSR-safe; hydrates from localStorage).
 */
export function useVoicePreferences(): UseVoicePreferencesResult {
  const [prefs, setPrefs] = useState<VoicePreferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStored(prefs);
  }, [hydrated, prefs]);

  const setAutoSubmitOnDictation = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, autoSubmitOnDictation: value }));
  }, []);

  const setListeningMode = useCallback((value: ListeningMode) => {
    setPrefs((prev) => ({ ...prev, listeningMode: value }));
  }, []);

  const setAutoReadAnswer = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, autoReadAnswer: value }));
  }, []);

  return {
    ...prefs,
    setAutoSubmitOnDictation,
    setListeningMode,
    setAutoReadAnswer,
  };
}
