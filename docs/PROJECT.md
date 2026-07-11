# Project Tracker — VoxAssist (cuHacking 2026)

> **Name:** VoxAssist · **Repo/docs:** `VoxAssist/` (docs in `VoxAssist/docs/`)
> **Timeline:** ~1.5 days · **Team:** you = ML/retrieval · friend = embedded systems · **Claude = frontend**
> **This is the go-to file.** Deep detail: `BUILD_PLAN.md` (technical, partly superseded) · `IDEA_ASSESSMENT.md` (decision log).

---

## 1. Overview

A **multi-user web app** for RAG over a personal knowledge base (markdown/txt notes — the kind you
and your AI agents already write). After a (fake) sign-in, a user can:

- **Ask about themselves** — past projects, coding decisions, preferences — grounded in their own
  files, with citations.
- **Plan a new project** — describe an idea and get a personalized brief built from their real
  stack/style/past work, to hand straight to Claude / Claude Code.
- **Ask about a friend** *(CORE)* — type another user's **username**; if that user exists, query
  **only their** data ("what's their stack? how do they like to work?"). Great for remote collab.

**What it is NOT:** an agent that builds projects end-to-end. It **answers questions** and **plans**.

---

## 2. How it works

```
  2–3 seeded users, each with fabricated .md/.txt (tagged: owner)
        │  parse + heading-aware chunk
        ▼
  Seed ingest (one-time)  ──Voyage embed──▶  MongoDB Atlas (vector + search indexes)
        ▲                                              │  $vectorSearch + $rankFusion
  Web app (Next.js on DigitalOcean)                    ▼
   ├─ fake sign-in (enter username, no check)   top-N chunks (+ citations)
   ├─ ask self / plan   ── owner = me ─────────────▶        │
   └─ ask a friend      ── enter username ─────────▶        ▼
        (check user exists → owner = friend)         Claude Opus 4.8
                                                       ├─ ask  → grounded answer + citations
                                                       └─ plan → personalized brief (.md)
                                                                  (stretch) → TTS read-aloud
```

---

## 3. Locked decisions

| Concern | Decision |
|---------|----------|
| Product | **Multi-user web app** (Next.js full-stack, TS) + a small **CLI** for seeding/local testing |
| Auth | **Fake / barebones** — enter a username, **no verification**. Only real check: does an entered *friend* username exist in the DB (a plain lookup, not security) |
| Language | **TypeScript / Node** |
| Vector store | **MongoDB Atlas Vector Search** (`$vectorSearch` + built-in `$rankFusion`). *DB blocker resolved:* fake auth ⇒ no need for Supabase Auth/RLS, so Atlas stays. |
| Embeddings | **Voyage** (`voyage-3.5`, 1024), one API key |
| Synthesis LLM | **Claude Opus 4.8** (`claude-opus-4-8`) via `@anthropic-ai/sdk` |
| Hosting | **DigitalOcean App Platform** (deploy late; *not* Vercel — long `plan` streams exceed its serverless timeouts) |
| Frontend | **Built by Claude (assistant).** Keep it minimal. |
| Data | **2–3 manually-seeded dummy users**, fully **fabricated** profiles (preferences, hobbies, past coding projects, familiar stack) |
| Friend query | **CORE** — ask about another user by username, scoped to only their data |
| `shared` flag | **Dropped for the demo** — a user's seeded data is queryable in friend mode; per-file private/shared split is a post-demo refinement |
| Ingestion | **One-time seed ingest**; incremental sync = post-demo |
| Prizes | **Not a goal** |
| Voice | **Last / optional** — TTS read-aloud of the answer |

---

## 4. Labor split

- **Claude (assistant):** the web frontend (Next.js UI) + API route wiring.
- **Friend (embedded / systems):** core RAG lib ingestion (file walking, parsing, heading-aware
  chunking), the seed script, CLI plumbing.
- **You (ML / retrieval):** embeddings config, hybrid retrieval (`$vectorSearch` + `$rankFusion`)
  scoped by `owner`, and the `ask` / `plan` generation prompts.
- **Shared surface:** the Atlas document + metadata shape, and the demo.

---

## 5. Milestones

**Legend:** ☐ todo · ◐ in progress · ☑ done · ⭐ core · ✧ stretch

| # | Milestone | Owner | Tier | Status | Done when… |
|---|-----------|-------|------|--------|------------|
| M0 | **Project setup** — Next.js + TS app scaffold, deps, `.env`, Atlas cluster + keys | both | ⭐ | ☑ | app runs locally; env loads; connects to Atlas |
| M1 | **Atlas setup** — collection with `owner` + metadata; **vector index** + **search index** | you | ⭐ | ☐ | `$vectorSearch` + `$rankFusion` pipeline returns results |
| M2 | **Core RAG lib** — parse frontmatter + heading-aware chunk | friend | ⭐ | ☐ | given files, produces chunks with metadata |
| M3 | **Embed + upsert** — Voyage (batched) → Atlas, tagged by `owner` | you | ⭐ | ☐ | chunks stored with vectors + owner |
| M4 | **Seed script** — 2–3 fabricated users → ingest → Atlas | friend | ⭐ | ☐ | one command loads all dummy users |
| M5 | **Hybrid retrieval** — `$vectorSearch` + `$rankFusion`, scoped by `owner` | you | ⭐ | ☐ | a query returns ranked, cited chunks for one owner |
| M6 | **`ask` (self)** — retrieve → Claude grounded answer + citations (verify via CLI) | you | ⭐ | ☐ | real question answered with sources |
| M7 | **`plan`** — personalized brief (adaptive thinking) → `.md` (verify via CLI) | you | ⭐ | ☐ | an idea yields a grounded brief |
| M8 | **Web app** — fake sign-in (enter username) + ask/plan UI + API | Claude | ⭐ | ☐ | sign in → ask → plan all work in the browser |
| M9 | **Ask-a-friend** — username box → existence check → scoped query | Claude + you | ⭐ | ☐ | valid username → only their data; invalid → "not found" |
| M10 | **Deploy** — DigitalOcean App Platform | both | ⭐ | ☐ | app reachable at a public URL |
| M11 | **Voice** *(stretch)* — TTS read-aloud of the answer | — | ✧ | ☐ | answer plays as audio |
| M12 | **Demo prep** — script + rehearsal | both | ⭐ | ☐ | rehearsed happy-path demo |

**Critical path:** M0 → M1 → M2 → M3 → M4 → M5 → M6 → M8 → M9 → M10 (M7 `plan` in parallel with M6).
**Build core locally first** (verify M5–M7 via CLI), *then* the web app (M8–M9), *then* deploy (M10).
Voice (M11) is the only skippable item.

---

## 6. Progress log

- **2026-07-10/11 — brainstorming:** locked initial scope (CLI, Claude, Voyage). Prizes dropped;
  voice deferred; `owner`/`shared` as differentiator. Docs written.
- **2026-07-11 — scope trim:** one-time full ingest (no auto embedding); incremental sync → post-demo.
- **2026-07-11 — store: evaluated Supabase vs Atlas** (Gemini rec) — landed on **Atlas**.
- **2026-07-11 — MAJOR PIVOT → multi-user web app on DigitalOcean.** "Ask about a friend" became
  **CORE**. Briefly re-opened the DB question (real auth would favor Supabase Auth/RLS).
- **2026-07-11 — scope FINALIZED (auth simplified):** auth is **FAKE** — enter a username, no
  verification; the only real DB check is whether an entered *friend* username exists. This removes
  the Supabase Auth/RLS advantage → **DB blocker resolved: stay on MongoDB Atlas.** Data = **2–3
  manually-seeded dummy users** with fabricated profiles. **Claude builds the frontend.** App =
  **Next.js full-stack** (UI + API) on **DO App Platform**; core RAG as a shared lib; small **CLI**
  to seed/test locally. `shared` flag dropped for the demo (owner-only scoping).
- **2026-07-11 — embeddings:** keeping **Voyage** (`voyage-3.5`, 1024); it beats
  `text-embedding-3-small` and ≈ `gemini-embedding-001` on retrieval. Vector dim must match the model.
- **2026-07-11 — confirmations + seed data:** **Next.js full-stack** confirmed (one repo, UI + API).
  Drafted **3 fabricated demo users** — `alex` (full-stack web), `priya` (ML/data), `marcus`
  (embedded) — each with `profile.md` / `stack.md` / `projects.md` + `owner` frontmatter, in
  `VoxAssist/seed/`. Intentionally distinct stacks so friend-queries contrast. Ready to ingest at M4.
- **2026-07-11 — branch divergence resolved:** local `DevBranch` had an independent solo scaffold
  (root `app/`, `lib/`, `next.config.mjs`, commit `0093fd9`) that collided with the team's shared
  `src/`-based scaffold on `origin/DevBranch` (frontend + ingestion + mock AI). Merging as-is would
  have produced duplicate `app/` vs `src/app/` dirs. **Decision:** adopt the team's `src/` scaffold as
  canonical (reset `DevBranch` → `origin/DevBranch`; old commit safe in reflog) and port the solo
  scaffold's unique value into it: `src/lib/config.ts` (real env config), `src/lib/db.ts` (cached
  Mongo client + `ping`), `scripts/doctor.ts` (+ `npm run doctor`), the full README, and a merged
  `.env.example`. `USE_MOCK_AI=true` remains the default so the app boots keyless.
- **2026-07-11 — synthesis models locked (all-Claude):** dropped Gemini — **Claude API for
  everything**. Split by task: `ask` → small/fast model (`CLAUDE_ASK_MODEL`, default
  `claude-haiku-4-5-20251001`); `plan` → **Opus 4.8** (`CLAUDE_PLAN_MODEL`, default `claude-opus-4-8`).
  Both env-overridable via `src/lib/config.ts`.
- **2026-07-11 — M0 DONE:** Atlas connection string added to `.env` (`MONGODB_URI`), `npm run doctor`
  reports **MongoDB ping: connected**, typecheck clean. Only `VOYAGE_API_KEY` still to add (needed at
  M3 embeddings, not before). Next up: **M1 — Atlas collection (`owner` + metadata) + vector & search
  indexes.**

---

## 7. Open items

- [x] **Name** → **VoxAssist**.
- [x] **DB** → **MongoDB Atlas** (fake auth removed the Supabase reason).
- [x] **Frontend** → built by **Claude**.
- [x] **Ask-a-friend scope** → CORE, multi-user, owner-scoped.
- [x] **App framework** → **Next.js full-stack** (one repo = UI + API routes = one DO deploy).
- [x] **Fabricated user profiles** → drafted `alex`, `priya`, `marcus` in `VoxAssist/seed/`
      (each: `profile.md` / `stack.md` / `projects.md`, with `owner` frontmatter).
- [ ] **Voice provider** if we reach M11 (ElevenLabs vs. simpler TTS) — decide later.
- [ ] Confirm Voyage model/dim (`voyage-3.5` / 1024) before creating the Atlas vector index.
