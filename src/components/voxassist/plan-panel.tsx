"use client"

import { useMemo } from "react"
import { Download, FileText, Loader2, ClipboardList } from "lucide-react"
import type { PlanResponse } from "@/lib/contract"
import { Button } from "@/components/ui/button"
import { CitationCard } from "./citation-card"
import { SimpleMarkdown } from "./simple-markdown"

export interface PlanPanelProps {
  plan: PlanResponse | null
  loading?: boolean
  /** Title used for the downloaded file name (defaults to the plan's markdownPath or "plan"). */
  title?: string
}

/** Renders a generated plan brief with citations and a "Download .md" action. */
export function PlanPanel({ plan, loading = false, title }: PlanPanelProps) {
  const fileName = useMemo(() => {
    const base =
      title ??
      plan?.markdownPath?.split("/").pop()?.replace(/\.md$/, "") ??
      "voxassist-plan"
    return `${slugify(base)}.md`
  }, [title, plan?.markdownPath])

  function downloadMarkdown() {
    if (!plan) return
    const blob = new Blob([plan.brief], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center sm:min-h-64 sm:p-8">
        <Loader2 className="mb-3 size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Drafting your plan…</p>
        <p className="mt-1 text-sm text-muted-foreground">Grounding each section in your notes.</p>
        <div className="mt-6 w-full max-w-sm space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center sm:min-h-64 sm:p-8">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ClipboardList className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">No plan yet</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Switch the prompt to Plan mode and describe an idea to generate a downloadable brief.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Plan brief</h2>
        <Button size="sm" variant="outline" onClick={downloadMarkdown} className="ml-auto">
          <Download className="size-4" aria-hidden="true" />
          Download .md
        </Button>
      </div>

      <div className="p-3 sm:p-4">
        <SimpleMarkdown source={plan.brief} />

        {plan.citations.length > 0 && (
          <section className="mt-6" aria-label="Citations">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {plan.citations.length} {plan.citations.length === 1 ? "Source" : "Sources"}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.citations.map((citation, i) => (
                <CitationCard key={`${citation.documentPath}-${i}`} citation={citation} index={i + 1} />
              ))}
            </div>
          </section>
        )}

        {plan.markdownPath && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            saved to {plan.markdownPath}
          </p>
        )}
      </div>
    </div>
  )
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "plan"
  )
}
