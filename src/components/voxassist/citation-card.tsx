"use client"

import { useState } from "react"
import { FileText, ChevronRight, ChevronDown, Copy, Check, Share2 } from "lucide-react"
import type { Citation } from "@/lib/contract"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface CitationCardProps {
  citation: Citation
  /** 1-based index shown as a reference marker. */
  index?: number
  /** Friend-scope results are shared-only — show a badge when true. */
  sharedBadge?: boolean
  /** Stagger entrance delay in ms (for reveal animation). */
  revealDelayMs?: number
}

/** Optional runtime snippet — not part of the shared Citation contract. */
function optionalContent(citation: Citation): string | undefined {
  const extra = citation as Citation & { content?: unknown }
  return typeof extra.content === "string" && extra.content.trim()
    ? extra.content.trim()
    : undefined
}

/** A single source citation rendered as an expandable card. */
export function CitationCard({
  citation,
  index,
  sharedBadge = false,
  revealDelayMs,
}: CitationCardProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const segments = citation.headingPath.split(">").map((s) => s.trim()).filter(Boolean)
  const fileName = citation.documentPath.split("/").pop() ?? citation.documentPath
  const snippet = optionalContent(citation)

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(citation.documentPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-all hover:border-primary/40",
        revealDelayMs != null && "animate-in fade-in slide-in-from-bottom-1 fill-mode-both",
      )}
      style={
        revealDelayMs != null
          ? { animationDelay: `${revealDelayMs}ms`, animationDuration: "350ms" }
          : undefined
      }
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          {index != null ? (
            <span className="text-xs font-semibold tabular-nums">{index}</span>
          ) : (
            <FileText className="size-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate font-mono text-sm font-medium">{fileName}</span>
            {sharedBadge && (
              <Badge variant="secondary" className="ml-1 h-5 gap-0.5 px-1.5 text-[10px]">
                <Share2 className="size-2.5" aria-hidden="true" />
                shared
              </Badge>
            )}
          </div>

          {segments.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
              {segments.map((seg, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{seg}</span>
                </span>
              ))}
            </div>
          )}

          <p className="mt-1 truncate text-xs text-muted-foreground/70">
            {citation.documentPath} · owner: {citation.owner}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          {snippet ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{snippet}</p>
          ) : (
            <p className="text-xs text-muted-foreground/70">
              Full path: <span className="font-mono text-foreground/80">{citation.documentPath}</span>
              {citation.headingPath ? (
                <>
                  {" "}
                  · <span className="text-foreground/80">{citation.headingPath}</span>
                </>
              ) : null}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              void copyPath()
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied path" : "Copy path"}
          </Button>
        </div>
      )}
    </div>
  )
}
