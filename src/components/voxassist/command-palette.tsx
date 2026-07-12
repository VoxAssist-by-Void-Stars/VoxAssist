"use client";

import type { ComponentType } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CircleHelp,
  Focus,
  History,
  Moon,
  Search,
  Sparkles,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { DEMO_USERNAMES } from "@/lib/demo-users";
import { cn } from "@/lib/utils";
import type { AskMode } from "@/components/voxassist/ask-box";

export interface PaletteRecentItem {
  id: string;
  label: string;
  mode: AskMode;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusAsk: () => void;
  onSetMode: (mode: AskMode) => void;
  onSetFriendMode: (friend: boolean) => void;
  onPickUser: (username: string) => void;
  onRerun: (item: PaletteRecentItem) => void;
  recent: PaletteRecentItem[];
  /** Speak + show voice help. */
  onHelp?: () => void;
}

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
};

/**
 * Lightweight Ctrl/Cmd+K command palette — no extra dependency.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onFocusAsk,
  onSetMode,
  onSetFriendMode,
  onPickUser,
  onRerun,
  recent,
  onHelp,
}: CommandPaletteProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const actions = useMemo<Action[]>(() => {
    const base: Action[] = [
      {
        id: "focus",
        label: "Focus ask input",
        hint: "/",
        icon: Focus,
        run: () => {
          onFocusAsk();
          onOpenChange(false);
        },
      },
      {
        id: "mode-ask",
        label: "Switch to Ask mode",
        icon: Search,
        run: () => {
          onSetMode("ask");
          onOpenChange(false);
        },
      },
      {
        id: "mode-plan",
        label: "Switch to Plan mode",
        icon: Sparkles,
        run: () => {
          onSetMode("plan");
          onOpenChange(false);
        },
      },
      {
        id: "scope-self",
        label: "Scope: my vault",
        icon: User,
        run: () => {
          onSetFriendMode(false);
          onOpenChange(false);
        },
      },
      {
        id: "scope-friend",
        label: "Scope: another user",
        icon: Users,
        run: () => {
          onSetFriendMode(true);
          onOpenChange(false);
        },
      },
      {
        id: "theme",
        label:
          resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          onOpenChange(false);
        },
      },
    ];

    if (onHelp) {
      base.push({
        id: "help",
        label: "Voice help",
        hint: "say help",
        icon: CircleHelp,
        run: () => {
          onHelp();
          onOpenChange(false);
        },
      });
    }

    for (const username of DEMO_USERNAMES) {
      base.push({
        id: `user-${username}`,
        label: `Query @${username}'s shared vault`,
        icon: Users,
        run: () => {
          onPickUser(username);
          onOpenChange(false);
        },
      });
    }

    for (const item of recent.slice(0, 5)) {
      base.push({
        id: `recent-${item.id}`,
        label: `Re-run: ${item.label}`,
        hint: item.mode,
        icon: History,
        run: () => {
          onRerun(item);
          onOpenChange(false);
        },
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [
    query,
    recent,
    resolvedTheme,
    onFocusAsk,
    onHelp,
    onOpenChange,
    onPickUser,
    onRerun,
    onSetFriendMode,
    onSetMode,
    setTheme,
  ]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function runActive() {
    const action = actions[active];
    if (action) action.run();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(actions.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runActive();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onOpenChange(false);
              }
            }}
            placeholder="Type a command…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-controls={listId}
            aria-activedescendant={
              actions[active] ? `${listId}-${actions[active].id}` : undefined
            }
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>

        <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1.5">
          {actions.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands
            </li>
          )}
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <li key={action.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  id={`${listId}-${action.id}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === active
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => action.run()}
                >
                  <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                  {action.hint && (
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {action.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
