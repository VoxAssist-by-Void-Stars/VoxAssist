"use client"

import type React from "react"
import { forwardRef } from "react"
import { Send, Sparkles, Users, User, Loader2 } from "lucide-react"
import type { Scope } from "@/lib/contract"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export type AskMode = "ask" | "plan"

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
    },
    ref,
  ) {
    const scopeReady = !friendMode || targetUser.trim().length > 0
    const canSubmit = text.trim().length > 0 && scopeReady && !busy

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

          <Button type="submit" disabled={!canSubmit} className="shrink-0">
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
