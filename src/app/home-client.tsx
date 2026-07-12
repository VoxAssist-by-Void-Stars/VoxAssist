"use client";

import { SignIn, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { AudioLines, Keyboard } from "lucide-react";
import { CompassMark } from "@/components/voxassist/compass-mark";import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AnswerPanel } from "@/components/voxassist/answer-panel";
import { AskBox, type AskMode } from "@/components/voxassist/ask-box";
import {
  CommandPalette,
  type PaletteRecentItem,
} from "@/components/voxassist/command-palette";
import { LoginShell } from "@/components/voxassist/login-shell";
import { PlanPanel } from "@/components/voxassist/plan-panel";
import {
  downloadPlanBlob,
  RecentHistory,
  type HistoryItem,
  type HistoryPlanItem,
} from "@/components/voxassist/recent-history";
import { ThemeToggle } from "@/components/voxassist/theme-toggle";
import { UploadNotes } from "@/components/voxassist/upload-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requestPlan, streamAsk } from "@/lib/api";
import type { Citation, PlanResponse, Scope } from "@/lib/contract";
import { parseVoiceCommand } from "@/lib/voice/commands";
import { VOICE_HELP_TEXT, VOICE_QUICK_HELP_TEXT } from "@/lib/voice/help";
import { useVoicePreferences } from "@/lib/voice/preferences";
import { useTts } from "@/lib/voice/use-tts";
import { useVoiceInput } from "@/lib/voice/use-voice-input";

export function HomeClient() {
  return (
    <>
      <SignedOut>
        <LoginShell>
          <SignIn routing="hash" />
        </LoginShell>
      </SignedOut>
      <SignedIn>
        <AppShell />
      </SignedIn>
    </>
  );
}

function buildScope(
  currentUser: string,
  friendMode: boolean,
  targetUser: string,
): Scope {
  return friendMode
    ? { kind: "friend", owner: targetUser.trim() }
    : { kind: "self", owner: currentUser };
}

function AppShell() {
  const { user } = useUser();

  const currentUser =
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    user?.id ??
    "user";

  const [mode, setMode] = useState<AskMode>("ask");
  const [text, setText] = useState("");
  const [friendMode, setFriendMode] = useState(false);
  const [targetUser, setTargetUser] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [asking, setAsking] = useState(false);
  const [lastAskScope, setLastAskScope] = useState<Scope | null>(null);

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [planning, setPlanning] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const askInputRef = useRef<HTMLTextAreaElement>(null);

  // Latest values for voice command handlers (avoid stale closures).
  const modeRef = useRef(mode);
  const textRef = useRef(text);
  const answerRef = useRef(answer);
  const friendModeRef = useRef(friendMode);
  const targetUserRef = useRef(targetUser);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  useEffect(() => {
    friendModeRef.current = friendMode;
  }, [friendMode]);
  useEffect(() => {
    targetUserRef.current = targetUser;
  }, [targetUser]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const { speaking, supported: speechAvailable, speak, stop: stopSpeak } =
    useTts();

  const voicePrefs = useVoicePreferences();
  const autoReadAnswerRef = useRef(voicePrefs.autoReadAnswer);
  const autoSubmitRef = useRef(voicePrefs.autoSubmitOnDictation);
  useEffect(() => {
    autoReadAnswerRef.current = voicePrefs.autoReadAnswer;
  }, [voicePrefs.autoReadAnswer]);
  useEffect(() => {
    autoSubmitRef.current = voicePrefs.autoSubmitOnDictation;
  }, [voicePrefs.autoSubmitOnDictation]);

  const pushHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 12));
  }, []);

  const handleAsk = useCallback(
    async (q: string, scope: Scope) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      stopSpeak();
      setQuestion(q);
      setAnswer("");
      setCitations([]);
      setAsking(true);
      setLastAskScope(scope);
      let fullAnswer = "";
      try {
        await streamAsk(
          { question: q, scope },
          {
            onDelta: (chunk) => {
              fullAnswer += chunk;
              setAnswer((prev) => prev + chunk);
            },
            onCitations: (c) => setCitations(c),
            signal: controller.signal,
          },
        );
        pushHistory({
          id: `ask-${Date.now()}`,
          kind: "ask",
          label: q,
          mode: "ask",
          text: q,
          friendMode: scope.kind === "friend",
          targetUser: scope.kind === "friend" ? scope.owner : "",
        });
        if (
          !controller.signal.aborted &&
          autoReadAnswerRef.current &&
          fullAnswer.trim()
        ) {
          void speak(fullAnswer);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          toast.error((err as Error).message || "Failed to get an answer.");
        }
      } finally {
        setAsking(false);
      }
    },
    [pushHistory, speak, stopSpeak],
  );

  const handlePlan = useCallback(
    async (idea: string, scope: Scope) => {
      stopSpeak();
      setPlanning(true);
      setPlan(null);
      try {
        const result = await requestPlan({ idea, scope });
        setPlan(result);
        toast.success("Plan drafted.");
        pushHistory({
          id: `plan-${Date.now()}`,
          kind: "plan",
          label: idea,
          mode: "plan",
          text: idea,
          friendMode: scope.kind === "friend",
          targetUser: scope.kind === "friend" ? scope.owner : "",
          plan: result,
        });
      } catch (err) {
        toast.error((err as Error).message || "Failed to draft the plan.");
      } finally {
        setPlanning(false);
      }
    },
    [pushHistory, stopSpeak],
  );

  const submit = useCallback(
    (nextMode: AskMode, nextText: string, scope: Scope) => {
      const value = nextText.trim();
      if (!value) return;
      if (scope.kind === "friend" && !scope.owner.trim()) {
        toast.error("Enter a username for friend scope.");
        return;
      }
      // Plans are self-only: you can ask ABOUT a friend, but never plan AS them.
      if (nextMode === "plan" && scope.kind === "friend") {
        toast.error("Plans are built from your own notes — switch off friend scope to plan.");
        return;
      }
      if (nextMode === "ask") void handleAsk(value, scope);
      else void handlePlan(value, scope);
    },
    [handleAsk, handlePlan],
  );

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  const speakHelp = useCallback(() => {
    toast.message("Voice help", { description: VOICE_HELP_TEXT });
    void speak(VOICE_HELP_TEXT);
  }, [speak]);

  const speakQuickHelp = useCallback(() => {
    void speak(VOICE_QUICK_HELP_TEXT);
  }, [speak]);

  const readInput = useCallback(() => {
    const draft = textRef.current.trim();
    if (!draft) {
      toast.error("Nothing to read — type or dictate first.");
      return;
    }
    void speak(draft);
  }, [speak]);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      const parsed = parseVoiceCommand(transcript);
      if (parsed.kind === "dictation") {
        if (!parsed.text) return;
        const prev = textRef.current.trim();
        const combined = prev ? `${prev} ${parsed.text}` : parsed.text;
        setText(combined);
        textRef.current = combined;

        if (autoSubmitRef.current) {
          toast.message("Dictated — sending…", { description: parsed.text });
          const scope = buildScope(
            currentUserRef.current,
            friendModeRef.current,
            targetUserRef.current,
          );
          submitRef.current(modeRef.current, combined, scope);
        } else {
          toast.message("Dictated", { description: parsed.text });
        }
        return;
      }

      switch (parsed.action) {
        case "help":
          speakHelp();
          break;
        case "stop":
          stopSpeak();
          abortRef.current?.abort();
          setAsking(false);
          toast.message("Stopped.");
          break;
        case "read": {
          const current = answerRef.current.trim();
          if (!current) {
            toast.error("Nothing to read yet.");
            return;
          }
          void speak(current);
          break;
        }
        case "switch-ask":
          setMode("ask");
          toast.message("Switched to Ask mode.");
          break;
        case "switch-plan":
          setMode("plan");
          toast.message("Switched to Plan mode.");
          break;
        case "send": {
          const scope = buildScope(
            currentUserRef.current,
            friendModeRef.current,
            targetUserRef.current,
          );
          submitRef.current(modeRef.current, textRef.current, scope);
          break;
        }
      }
    },
    [speak, speakHelp, stopSpeak],
  );

  const voice = useVoiceInput({
    onTranscript: handleVoiceTranscript,
    onError: (message) => toast.error(message),
    onRecordingStart: () => stopSpeak(),
    mode: voicePrefs.listeningMode,
  });

  const focusAsk = useCallback(() => {
    askInputRef.current?.focus();
  }, []);

  const rerunHistory = useCallback(
    (item: HistoryItem) => {
      setMode(item.mode);
      setText(item.text);
      setFriendMode(item.friendMode);
      setTargetUser(item.targetUser);
      const scope = buildScope(currentUser, item.friendMode, item.targetUser);
      submit(item.mode, item.text, scope);
    },
    [currentUser, submit],
  );

  const toggleAnswerSpeak = useCallback(() => {
    if (speaking) {
      stopSpeak();
      return;
    }
    const current = answer.trim();
    if (!current) return;
    void speak(current);
  }, [answer, speak, speaking, stopSpeak]);

  // Stop TTS when a new answer starts streaming.
  useEffect(() => {
    if (asking) stopSpeak();
  }, [asking, stopSpeak]);

  const voiceRecording = voice.recording;
  const cancelRecording = voice.cancel;

  // Global shortcuts: Ctrl/Cmd+K palette, / focus, Esc cancel
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (voiceRecording) {
          cancelRecording();
          toast.message("Recording cancelled.");
          return;
        }
        if (speaking) {
          stopSpeak();
          return;
        }
        if (asking) {
          abortRef.current?.abort();
          setAsking(false);
          toast.message("Request cancelled.");
        }
        return;
      }

      if (!typing && e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        focusAsk();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    asking,
    cancelRecording,
    focusAsk,
    paletteOpen,
    speaking,
    stopSpeak,
    voiceRecording,
  ]);

  const searchingOwner =
    lastAskScope?.kind === "friend" ? lastAskScope.owner : currentUser;

  const paletteRecent: PaletteRecentItem[] = history.map((h) => ({
    id: h.id,
    label: h.label,
    mode: h.mode,
  }));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <CompassMark filled className="size-5 shrink-0 text-primary" />
            <span className="truncate font-semibold tracking-tight">
              VoxAssist
            </span>
          </div>
          <Badge
            variant="secondary"
            className="hidden font-mono text-xs sm:inline-flex"
          >
            @{currentUser}
          </Badge>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <Keyboard className="size-4" aria-hidden="true" />
              <kbd className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <UploadNotes />
            <ThemeToggle />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: { userButtonAvatarBox: "size-8" },
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        <div>
          <h1 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
            Knowledge assistant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask a grounded question or draft a plan from your vault — or a
            teammate&apos;s shared notes. Press{" "}
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">
              ⌘K
            </kbd>{" "}
            for commands, or use the mic for voice.
          </p>
        </div>

        <AskBox
          ref={askInputRef}
          currentUser={currentUser}
          mode={mode}
          onModeChange={setMode}
          text={text}
          onTextChange={setText}
          friendMode={friendMode}
          onFriendModeChange={setFriendMode}
          targetUser={targetUser}
          onTargetUserChange={setTargetUser}
          onAsk={handleAsk}
          onPlan={handlePlan}
          busy={asking || planning}
          voiceState={{
            supported: voice.supported,
            recording: voice.recording,
            busy: voice.busy,
          }}
          onVoiceToggle={() => {
            if (!voice.supported && !voice.recording) {
              toast.error("Voice input is not supported in this browser.");
              return;
            }
            void voice.toggle();
          }}
          voicePrefs={{
            autoSubmitOnDictation: voicePrefs.autoSubmitOnDictation,
            listeningMode: voicePrefs.listeningMode,
            autoReadAnswer: voicePrefs.autoReadAnswer,
          }}
          onAutoSubmitChange={voicePrefs.setAutoSubmitOnDictation}
          onListeningModeChange={voicePrefs.setListeningMode}
          onAutoReadAnswerChange={voicePrefs.setAutoReadAnswer}
          onQuickHelp={speakQuickHelp}
          onReadInput={readInput}
        />

        <RecentHistory
          items={history}
          onRerun={rerunHistory}
          onDownloadPlan={(item: HistoryPlanItem) =>
            downloadPlanBlob(item.plan, item.label)
          }
        />

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <AnswerPanel
            question={question || undefined}
            answer={answer}
            citations={citations}
            streaming={asking}
            idle={!asking && !answer}
            searchingOwner={searchingOwner}
            friendScope={lastAskScope?.kind === "friend"}
            speaking={speaking}
            speechAvailable={speechAvailable}
            onToggleSpeak={toggleAnswerSpeak}
            onDraftPlan={
              answer
                ? () => {
                    setMode("plan");
                    setText(
                      question
                        ? `Build a plan based on: ${question}`
                        : answer.slice(0, 200),
                    );
                    focusAsk();
                    toast.message("Switched to Plan — edit and draft when ready.");
                  }
                : undefined
            }
          />
          <PlanPanel plan={plan} loading={planning} />
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onFocusAsk={focusAsk}
        onSetMode={setMode}
        onSetFriendMode={setFriendMode}
        onPickUser={(username) => {
          setFriendMode(true);
          setTargetUser(username);
          focusAsk();
          toast.message(`Friend scope → @${username}`);
        }}
        onRerun={(item) => {
          const match = history.find((h) => h.id === item.id);
          if (match) rerunHistory(match);
        }}
        recent={paletteRecent}
        onHelp={speakHelp}
      />
    </div>
  );
}
