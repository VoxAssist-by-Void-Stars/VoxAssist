"use client"

import type React from "react"
import { useState } from "react"
import { AudioLines, ArrowRight, ShieldCheck, Sparkles, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface LoginShellProps {
  /** Called with the entered credentials. Wire this to Clerk / your auth backend. */
  onSubmit?: (credentials: { username: string; password: string }) => void | Promise<void>
  /** Render a custom auth widget (e.g. Clerk's <SignIn />) instead of the built-in form. */
  children?: React.ReactNode
  loading?: boolean
  error?: string
}

/**
 * Branded split-screen auth shell for VoxAssist.
 * Presentational only — pass `onSubmit` to connect it to Clerk or your API,
 * or pass `children` to drop in a third-party auth widget.
 */
export function LoginShell({ onSubmit, children, loading = false, error }: LoginShellProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit?.({ username, password })
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <AudioLines className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">VoxAssist</span>
        </div>

        <div className="max-w-md space-y-5">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium text-primary-foreground/90">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Personal-KB RAG · ask + plan
          </p>
          <h1 className="text-pretty text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Ask your knowledge base. Get grounded, cited answers back.
          </h1>
          <p className="text-pretty text-sm leading-relaxed text-primary-foreground/80">
            Retrieval-augmented answers and project briefs over your Obsidian-style notes.
            Scope queries to your vault or a teammate&apos;s shared notes — every claim cites its source.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li className="flex items-start gap-2">
              <Quote className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden="true" />
              Streamed answers with live citation cards
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden="true" />
              Friend scope only ever surfaces shared notes
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span>Privacy-first cross-user lookup — never a bypass.</span>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 animate-pulse rounded-full border border-primary-foreground/15"
          style={{ animationDuration: "6s" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-10 size-80 rounded-full border border-primary-foreground/10"
        />
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <AudioLines className="size-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight">VoxAssist</span>
          </div>

          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to query your knowledge base and draft grounded plans.
            </p>
          </div>

          {children ?? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="momen"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
                {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by session auth. By continuing you agree to the demo terms.
          </p>
        </div>
      </main>
    </div>
  )
}
