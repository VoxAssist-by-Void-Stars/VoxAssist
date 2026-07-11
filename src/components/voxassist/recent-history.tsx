"use client";

import { Clock3, Download, RotateCcw } from "lucide-react";
import type { PlanResponse } from "@/lib/contract";
import type { AskMode } from "@/components/voxassist/ask-box";
import { Button } from "@/components/ui/button";

export type HistoryAskItem = {
  id: string;
  kind: "ask";
  label: string;
  mode: AskMode;
  text: string;
  friendMode: boolean;
  targetUser: string;
};

export type HistoryPlanItem = {
  id: string;
  kind: "plan";
  label: string;
  mode: AskMode;
  text: string;
  friendMode: boolean;
  targetUser: string;
  plan: PlanResponse;
};

export type HistoryItem = HistoryAskItem | HistoryPlanItem;

export interface RecentHistoryProps {
  items: HistoryItem[];
  onRerun: (item: HistoryItem) => void;
  onDownloadPlan: (item: HistoryPlanItem) => void;
}

export function RecentHistory({ items, onRerun, onDownloadPlan }: RecentHistoryProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Recent activity"
      className="rounded-xl border border-border bg-card/60 p-3 sm:p-4"
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock3 className="size-3.5" aria-hidden="true" />
        Recent
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/40"
          >
            <span className="w-10 shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              {item.kind}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
              onClick={() => onRerun(item)}
              title={item.label}
            >
              {item.label}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Re-run ${item.kind}`}
              onClick={() => onRerun(item)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
            {item.kind === "plan" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Download plan"
                onClick={() => onDownloadPlan(item)}
              >
                <Download className="size-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function downloadPlanBlob(plan: PlanResponse, title?: string) {
  const base =
    title ??
    plan.markdownPath?.split("/").pop()?.replace(/\.md$/, "") ??
    "voxassist-plan";
  const fileName = `${base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "plan"}.md`;
  const blob = new Blob([plan.brief], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
