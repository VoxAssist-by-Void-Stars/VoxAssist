"use client"

import type React from "react"
import { forwardRef } from "react"
import {
  CircleHelp,
  Loader2,
  Mic,
  MicOff,
  Send,
  Settings2,
  Sparkles,
  User,
  Users,
  Volume1,
} from "lucide-react"
import type { Scope } from "@/lib/contract"
import { cn } from "@/lib/utils"
import {
  VOICE_QUICK_HELP_BULLETS,
} from "@/lib/voice/help"
import type { ListeningMode } from "@/lib/voice/preferences"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export type AskMode = "ask" | "plan"

export interface AskBoxVoiceState {
  supported: boolean
  recording: boolean
  busy: boolean
}

export interface AskBoxVoicePrefs {
  autoSubmitOnDictation: boolean
  listeningMode: ListeningMode
  autoReadAnswer: boolean
}

export interface AskBoxProps {
  /** The signed-in user's id — becomes the `owner` for self-scope queries. */
  currentUser: string
  mode: AskMode
  onModeChange: (mode: AskMode) => void
  text: string
  onTextChange: (text: string) => void
  friendMode: boolean
  onFriendModeChange: (friend: boolean) => void
  targetUser: string
  onTargetUserChange: (username: string) => void
  /** Fired for a grounded Q&A request. */
  onAsk?: (question: string, scope: Scope) => void
  /** Fired for a plan/brief request. */
  onPlan?: (idea: string, scope: Scope) => void
  /** Disables the form while a request is in flight. */
  busy?: boolean
  /** Push-to-talk mic state from AppShell. */
  voiceState?: AskBoxVoiceState
  /** Toggle recording / stop-and-transcribe. */
  onVoiceToggle?: () => void
  /** Persisted voice preferences. */
  voicePrefs?: AskBoxVoicePrefs
  onAutoSubmitChange?: (value: boolean) => void
  onListeningModeChange?: (mode: ListeningMode) => void
  onAutoReadAnswerChange?: (value: boolean) => void
  /** Speak + show quick voice overview when help opens. */
  onQuickHelp?: () => void
  /** Read the current draft input aloud. */
  onReadInput?: () => void
}

/**
 * Controlled prompt input for VoxAssist. Scope/mode/text live in the parent
 * so the command palette, history, and ask→plan bridge can drive the form.
 *
 * Guardrail: friend scope is a lookup, never a bypass — retrieval enforces
 * `shared === true` on the backend. This component only passes the scope through.
 */
export const AskBox = forwardRef<HTMLTextAreaElement, AskBoxProps>(
  function AskBox(
    {
      currentUser,
      mode,
      onModeChange,
      text,
      onTextChange,
      friendMode,
      onFriendModeChange,
      targetUser,
      onTargetUserChange,
      onAsk,
      onPlan,
      busy = false,
      voiceState,
      onVoiceToggle,
      voicePrefs,
      onAutoSubmitChange,
      onListeningModeChange,
      onAutoReadAnswerChange,
      onQuickHelp,
      onReadInput,
    },
    ref,
  ) {
    const scopeReady = !friendMode || targetUser.trim().length > 0
    const canSubmit = text.trim().length > 0 && scopeReady && !busy
    const showMic = !!voiceState && !!onVoiceToggle
    const micDisabled = busy || !!voiceState?.busy
    const canReadInput = !!onReadInput && text.trim().length > 0 && !busy
    const listeningMode = voicePrefs?.listeningMode ?? "push-to-talk"

    function buildScope(): Scope {
      return friendMode
        ? { kind: "friend", owner: targetUser.trim() }
        : { kind: "self", owner: currentUser }
    }

    function submit() {
      if (!canSubmit) return
      const scope = buildScope()
      const value = text.trim()
      if (mode === "ask") onAsk?.(value, scope)
      else onPlan?.(value, scope)
    }

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      submit()
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      // Cmd/Ctrl+Enter always submits; Enter alone submits (Shift+Enter = newline)
      const metaSubmit = (e.metaKey || e.ctrlKey) && e.key === "Enter"
      const enterSubmit = e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey
      if (metaSubmit || enterSubmit) {
        e.preventDefault()
        submit()
      }
    }

    const chips =
      mode === "ask"
        ? [
            "What is my stack?",
            "How do we deploy?",
            "Summarize auth with Clerk",
          ]
        : [
            "Ship a RAG demo this weekend",
            "Add friend-scope vault sharing",
            "Dockerize and deploy to DO",
          ]

    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Request mode">
          <ModeTab active={mode === "ask"} onClick={() => onModeChange("ask")} icon={Send} label="Ask" />
          <ModeTab active={mode === "plan"} onClick={() => onModeChange("plan")} icon={Sparkles} label="Plan" />
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Example prompts">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => onTextChange(chip)}
              className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <Label htmlFor="ask-input" className="sr-only">
          {mode === "ask" ? "Your question" : "Your idea"}
        </Label>
        <Textarea
          ref={ref}
          id="ask-input"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={
            mode === "ask"
              ? "Ask anything about the knowledge base…"
              : "Describe an idea to draft a grounded plan…"
          }
          className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        />

        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <User
                className={cn("size-4", !friendMode ? "text-primary" : "text-muted-foreground")}
                aria-hidden="true"
              />
              <Switch
                id="scope-switch"
                checked={friendMode}
                onCheckedChange={onFriendModeChange}
                aria-label="Query another user's shared vault"
              />
              <Users
                className={cn("size-4", friendMode ? "text-primary" : "text-muted-foreground")}
                aria-hidden="true"
              />
              <span className="text-sm font-medium">
                {friendMode ? "Another user" : "My vault"}
              </span>
            </div>

            {friendMode && (
              <div className="flex items-center gap-2">
                <Label htmlFor="target-user" className="sr-only">
                  Target username
                </Label>
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  id="target-user"
                  value={targetUser}
                  onChange={(e) => onTargetUserChange(e.target.value)}
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-8 w-32"
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {showMic && (
              <>
                <Popover
                  onOpenChange={(open) => {
                    if (open) onQuickHelp?.()
                  }}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Voice quick help"
                        title="Voice quick help"
                      />
                    }
                  >
                    <CircleHelp className="size-4" aria-hidden="true" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80">
                    <PopoverTitle>Voice quick help</PopoverTitle>
                    <PopoverDescription className="mt-1">
                      Brief overview of mic and voice commands.
                    </PopoverDescription>
                    <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs text-foreground">
                      {VOICE_QUICK_HELP_BULLETS.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>

                {voicePrefs && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Voice settings"
                          title="Voice settings"
                        />
                      }
                    >
                      <Settings2 className="size-4" aria-hidden="true" />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 space-y-3">
                      <div>
                        <PopoverTitle>Voice settings</PopoverTitle>
                        <PopoverDescription className="mt-1">
                          Preferences are saved in this browser.
                        </PopoverDescription>
                      </div>
                      <PrefRow
                        id="voice-auto-submit"
                        label="Auto-send after dictation"
                        hint="Submit as soon as speech is transcribed"
                        checked={voicePrefs.autoSubmitOnDictation}
                        onCheckedChange={(v) => onAutoSubmitChange?.(v)}
                      />
                      <PrefRow
                        id="voice-auto-silence"
                        label="Auto-detect end of speech"
                        hint="Stop recording after a short pause"
                        checked={voicePrefs.listeningMode === "auto-silence"}
                        onCheckedChange={(v) =>
                          onListeningModeChange?.(v ? "auto-silence" : "push-to-talk")
                        }
                      />
                      <PrefRow
                        id="voice-auto-read"
                        label="Auto-read answers aloud"
                        hint="Speak the answer when ask finishes"
                        checked={voicePrefs.autoReadAnswer}
                        onCheckedChange={(v) => onAutoReadAnswerChange?.(v)}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {onReadInput && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canReadInput}
                    onClick={onReadInput}
                    aria-label="Read current input aloud"
                    title="Read input"
                  >
                    <Volume1 className="size-4" aria-hidden="true" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant={voiceState.recording ? "default" : "outline"}
                  size="icon"
                  disabled={micDisabled}
                  onClick={onVoiceToggle}
                  aria-pressed={voiceState.recording}
                  aria-label={
                    voiceState.busy
                      ? "Transcribing speech"
                      : voiceState.recording
                        ? "Stop recording"
                        : voiceState.supported
                          ? "Start voice input"
                          : "Voice input unavailable"
                  }
                  title={
                    voiceState.busy
                      ? "Transcribing…"
                      : voiceState.recording
                        ? "Stop recording"
                        : listeningMode === "auto-silence"
                          ? "Listen (auto-stop)"
                          : "Push-to-talk"
                  }
                >
                  {voiceState.busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : voiceState.recording ? (
                    <MicOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Mic className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </>
            )}
            <Button type="submit" disabled={!canSubmit}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Working…
                </>
              ) : (
                <>
                  {mode === "ask" ? "Ask" : "Draft plan"}
                  {mode === "ask" ? (
                    <Send className="size-4" aria-hidden="true" />
                  ) : (
                    <Sparkles className="size-4" aria-hidden="true" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>

        {voiceState?.recording && (
          <p className="mt-2 text-xs text-primary" role="status">
            {listeningMode === "auto-silence"
              ? "Listening… will stop automatically when you pause. Esc cancels."
              : "Listening… tap the mic again when done. Esc cancels."}
          </p>
        )}

        {friendMode && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only notes{" "}
            {targetUser.trim() ? (
              <span className="font-medium">@{targetUser.trim()}</span>
            ) : (
              "the target user"
            )}{" "}
            marked shared will be searched.
          </p>
        )}
      </form>
    )
  },
)

function PrefRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        size="sm"
        className="mt-0.5"
      />
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
