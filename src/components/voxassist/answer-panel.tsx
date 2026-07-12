"use client"

import {
  MessageSquareText,
  Quote,
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  WandSparkles,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import type { Citation } from "@/lib/contract"
import { Button } from "@/components/ui/button"
import { CitationCard } from "./citation-card"
import { SimpleMarkdown } from "./simple-markdown"

export interface AnswerPanelProps {
  /** The question that produced this answer (optional header). */
  question?: string
  /** The answer text; may be partial while streaming. */
  answer: string
  citations: Citation[]
  /** True while tokens are still arriving. */
  streaming?: boolean
  /** True before any request has been made. */
  idle?: boolean
  /** Scope owner label for the retrieval reveal (e.g. "momen" or "rayan"). */
  searchingOwner?: string
  /** Friend-scope → show shared badges on citations. */
  friendScope?: boolean
  /** Seed Plan mode from this answer. */
  onDraftPlan?: () => void
  /** Shared TTS state from AppShell (ElevenLabs + browser fallback). */
  speaking?: boolean
  onToggleSpeak?: () => void
  speechAvailable?: boolean
}

/**
 * Renders a streamed answer with retrieval reveal, citation stagger,
 * copy, draft-plan bridge, and read-aloud (driven by parent TTS).
 */
export function AnswerPanel({
  question,
  answer,
  citations,
  streaming = false,
  idle = false,
  searchingOwner,
  friendScope = false,
  onDraftPlan,
  speaking = false,
  onToggleSpeak,
  speechAvailable = false,
}: AnswerPanelProps) {
  const [copied, setCopied] = useState(false)

  const searching = streaming && !answer && citations.length === 0
  const ownerLabel = searchingOwner?.trim() || "your"
  const canSpeak =
    speechAvailable && !!onToggleSpeak && !streaming && !!answer.trim()

  async function copyAnswer() {
    if (!answer) return
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  if (idle && !answer) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center sm:min-h-64 sm:p-8">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MessageSquareText className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">Ask a question to get started</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Answers stream in live and every claim is backed by a citation from the source notes.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Answer</h2>
        {streaming && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            {searching ? "Searching" : "Streaming"}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {!streaming && answer && onDraftPlan && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDraftPlan}
              aria-label="Draft plan from this answer"
            >
              <WandSparkles className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Draft plan</span>
            </Button>
          )}
          {canSpeak && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleSpeak}
              aria-label={speaking ? "Stop reading aloud" : "Read answer aloud"}
            >
              {speaking ? (
                <VolumeX className="size-4" aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{speaking ? "Stop" : "Read"}</span>
            </Button>
          )}
          {!streaming && answer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyAnswer}
              aria-label="Copy answer"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {searching && (
          <div
            className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-3"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">
                Searching {ownerLabel === "your" ? "your vault" : `${ownerLabel}'s vault`}…
              </p>
              <p className="text-xs text-muted-foreground">
                Retrieving grounded notes before generating an answer.
              </p>
            </div>
          </div>
        )}

        {streaming && !searching && !answer && (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {question && (
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            <span className="text-foreground">Q:</span> {question}
          </p>
        )}

        <div className="text-pretty">
          {streaming ? (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground">
              {answer}
              {answer && (
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary align-middle"
                  aria-hidden="true"
                />
              )}
            </p>
          ) : (
            answer && <SimpleMarkdown source={answer} />
          )}
        </div>

        {citations.length > 0 && (
          <section className="mt-6" aria-label="Citations">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Quote className="size-3.5" aria-hidden="true" />
              {citations.length} {citations.length === 1 ? "Source" : "Sources"}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {citations.map((citation, i) => (
                <CitationCard
                  key={`${citation.documentPath}-${i}`}
                  citation={citation}
                  index={i + 1}
                  sharedBadge={friendScope}
                  revealDelayMs={i * 80}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
