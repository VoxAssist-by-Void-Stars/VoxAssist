"use client";

import { useMemo } from "react";
import { inlineMarkdown, parseMarkdown } from "@/lib/markdown";

/** Shared lightweight markdown renderer for answers and plan briefs. */
export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className="space-y-2 text-[0.95rem] leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        if (block.type === "h1")
          return (
            <h3 key={i} className="text-lg font-semibold tracking-tight">
              {inlineMarkdown(block.text)}
            </h3>
          );
        if (block.type === "h2")
          return (
            <h4 key={i} className="mt-4 text-base font-semibold">
              {inlineMarkdown(block.text)}
            </h4>
          );
        if (block.type === "h3")
          return (
            <h5
              key={i}
              className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {inlineMarkdown(block.text)}
            </h5>
          );
        if (block.type === "ul")
          return (
            <ul
              key={i}
              className="ml-4 list-disc space-y-1 text-muted-foreground"
            >
              {block.items.map((item, j) => (
                <li key={j}>{inlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        if (block.type === "ol")
          return (
            <ol
              key={i}
              className="ml-4 list-decimal space-y-1 text-muted-foreground"
            >
              {block.items.map((item, j) => (
                <li key={j}>{inlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        if (block.type === "p")
          return (
            <p key={i} className="text-pretty text-foreground/90">
              {inlineMarkdown(block.text)}
            </p>
          );
        return null;
      })}
    </div>
  );
}
