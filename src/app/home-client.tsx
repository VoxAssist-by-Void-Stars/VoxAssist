"use client";

import { SignIn, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { AudioLines } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { AnswerPanel } from "@/components/voxassist/answer-panel";
import { AskBox } from "@/components/voxassist/ask-box";
import { LoginShell } from "@/components/voxassist/login-shell";
import { PlanPanel } from "@/components/voxassist/plan-panel";
import { ThemeToggle } from "@/components/voxassist/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { requestPlan, streamAsk } from "@/lib/api";
import type { Citation, PlanResponse, Scope } from "@/lib/contract";

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

function AppShell() {
  const { user } = useUser();

  const currentUser =
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    user?.id ??
    "user";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [asking, setAsking] = useState(false);

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [planning, setPlanning] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const handleAsk = useCallback(async (q: string, scope: Scope) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQuestion(q);
    setAnswer("");
    setCitations([]);
    setAsking(true);
    try {
      await streamAsk(
        { question: q, scope },
        {
          onDelta: (text) => setAnswer((prev) => prev + text),
          onCitations: (c) => setCitations(c),
          signal: controller.signal,
        },
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        toast.error((err as Error).message || "Failed to get an answer.");
      }
    } finally {
      setAsking(false);
    }
  }, []);

  const handlePlan = useCallback(async (idea: string, scope: Scope) => {
    setPlanning(true);
    setPlan(null);
    try {
      const result = await requestPlan({ idea, scope });
      setPlan(result);
      toast.success("Plan drafted.");
    } catch (err) {
      toast.error((err as Error).message || "Failed to draft the plan.");
    } finally {
      setPlanning(false);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <AudioLines
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
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
            teammate&apos;s shared notes.
          </p>
        </div>

        <AskBox
          currentUser={currentUser}
          onAsk={handleAsk}
          onPlan={handlePlan}
          busy={asking || planning}
        />

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <AnswerPanel
            question={question || undefined}
            answer={answer}
            citations={citations}
            streaming={asking}
            idle={!asking && !answer}
          />
          <PlanPanel plan={plan} loading={planning} />
        </div>
      </main>
    </div>
  );
}
