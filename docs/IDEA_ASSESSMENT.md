# Idea Assessment & Strategy — Personal-KB RAG (cuHacking 2026)

> Honest evaluation of the idea, how it reconciles with the VoxAssist deep-dives, and a
> recommended scope that reduces overwhelm without throwing away prize alignment.
> Companion to `BUILD_PLAN.md`. Nothing here is locked until we agree — see [Open Decisions](#open-decisions).

---

## ⚠️ Priorities update (supersedes the prize-driven analysis below)

Two constraints changed the recommendation after the first pass:

1. **Prizes don't matter.** Optimize purely for a *simple, good idea shippable in ~1.5 days,
   least friction* — not sponsor alignment.
2. **Teammate's strength is embedded systems, NOT frontend** (earlier assumption was wrong). So a
   web frontend is *nobody's* strength → pure friction.

**Revised recommendation: build the original `BUILD_PLAN.md` — Supabase + Claude + CLI.**
The VoxAssist spine (Atlas + ElevenLabs + DO + web) was justified *only* by prize alignment; drop
that goal and it's just added moving parts. The original plan is the least-friction path because
you already know **Supabase** (RoadSense) and **Claude**, and a CLI needs no frontend.

- **Interface:** CLI. No frontend → no nobody's-lane friction. *(Voice = open question, below.)*
- **Store:** Supabase + pgvector (known). No reason to switch to Atlas.
- **LLM:** Claude (preferred), one SDK.
- **Embeddings:** Voyage (or OpenAI) — one API key.
- **Labor split that uses both:** friend (embedded/systems) → ingestion pipeline, file walking,
  chunking, sync engine, CLI plumbing; you (ML/retrieval) → embeddings, hybrid search + RRF,
  generation prompts.
- **Differentiator:** the "ask about a friend" `owner`/`shared` flag — one cheap feature; keep as
  the single stretch if time allows.
- **Open question:** voice — must-have or cut for the 1.5-day MVP? Adds moving parts on a CLI.

*The prize-map and VoxAssist-spine sections below are retained for reference only.*

---

## TL;DR verdict

**The idea is good and executable.** The core — *RAG over your own (and agents') markdown/txt
files, plus a "plan my next project with full context on me" mode* — is a genuinely fresh spin on
RAG, and it fixes VoxAssist's one weakness (judges have seen many "chat with my docs" bots).

The real problem isn't the idea; it's that **you have two conflicting plans**:

| | `BUILD_PLAN.md` (personal) | VoxAssist deep-dives (prize-tuned) |
|---|---|---|
| Store | Supabase + pgvector | **MongoDB Atlas Vector Search** |
| Embeddings | Voyage | Voyage |
| LLM | Claude API | Gemini / DO Gradient (Claude *can* run on Gradient) |
| Voice | none | **ElevenLabs STT + TTS** |
| Interface | **CLI** | Web app (v0 + DO App Platform) |
| Prizes hit | ~0 sponsor prizes | **~4** (Mongo, ElevenLabs, DO, Gemini) |
| Uses teammate (M1) | barely | fully (frontend, voice-out, deploy) |

**Recommendation: keep your idea's *soul*, adopt VoxAssist's *spine*.** Corpus = your personal
agent-written KB. Add the **plan** feature. Put **voice** on top. Store in **Atlas** (for the
prize + hybrid `$rankFusion`). Interface = a **thin web app** (it's M1's lane, so it barely costs
you). The "ask about a friend" idea becomes the **novelty differentiator**, implemented cheaply.

---

## What's strong (keep)

1. **Personal, agent-written KB as the corpus.** "Chat with my second brain that my Openclaw/other
   agents keep writing to" is more novel and personal than a generic document RAG. Great demo story.
2. **`plan` mode.** "Describe an idea → get a personalized project brief grounded in my real
   preferences/stack/past projects → hand it to Claude Code" is a concrete, memorable wow, and it's
   cheap (one extra LLM prompt + write/download a `.md`).
3. **Voice.** You now *want* it — good. It's the audible "wow," it's the ElevenLabs prize, and it's
   almost entirely **M1's** work (mic capture, TTS playback). It costs *you* (M2) almost nothing.
4. **"Ask about a friend."** This is the differentiator that lifts you above stock VoxAssist —
   *if* implemented cheaply (see below).

## What's risky (cut or defer)

1. **A real multi-user app with accounts + auth + per-file ACLs.** This is the scope trap you're
   sensing. Full authentication, real permission systems, and "other people log in and query your
   data" is a weekend-eater that *dilutes* the demo. **Do not build this.**
2. **Treating the social layer as core infrastructure.** Keep it as a **narrative + a lightweight
   flag** (below), not a permissions engine.

---

## The "ask about a friend" feature — how to actually do it

You don't need an app with logins to *demo* this. The whole thing collapses to **two columns**:

- `owner` (text) on each `document` — whose KB the file belongs to (`"rayan"`, `"momen"`).
- `shared` (boolean) on each `document` — did the owner mark this file shareable?

Then queries take a scope:
- **Self mode:** query only `owner = me` (all my files).
- **Friend mode:** query only `owner = <friend> AND shared = true` — you can *only* retrieve chunks
  from files that friend explicitly marked shareable.

**Privacy = the `shared` flag set at ingest time** ("manual file selection"), which is exactly your
instinct — but implemented as one boolean, not an ACL system. In the demo you **seed two users**
(you + teammate), mark a subset of one profile's files as shared, and show:

> *"I'm Momen, remote, about to build with Rayan — what's his stack and how does he like to work?"*
> → the assistant answers **only** from Rayan's shared files, with citations.

- **No auth needed for the demo.** Owner is just a CLI/UI dropdown or `--as` flag.
- **Real login/permissions = explicit stretch goal**, only if everything else is done.

This gives you the entire *wow* of the social angle (and the privacy story judges like) for ~30
minutes of work, with zero app-auth risk.

---

## Recommended reconciled architecture

```
  Personal markdown/txt vault(s)            ← corpus = YOUR agent-written second brain
   (each file tagged: owner, shared)
            │  parse + heading-aware chunk
            ▼
   Ingestion (incremental, hash-diffed)  ──Voyage embed──▶  MongoDB Atlas
                                                            (vector idx + lexical idx)
            ▲                                                     │
            │                                                     │ $vectorSearch + $rankFusion
   🎤 voice in (ElevenLabs Scribe)                                ▼
            │                                             top-k chunks (+ citations)
   query ──embed──▶ hybrid retrieve ──▶ (rerank) ──▶ LLM (Gemini or Claude-via-Gradient)
                                                        ├─ ask  → grounded answer  ──▶ 🔊 ElevenLabs TTS
                                                        └─ plan → personalized brief ──▶ .md file / download
   scope filter:  self (owner=me)  |  friend (owner=X AND shared=true)
```

### Stack (reconciled)

| Layer | Pick | Note |
|---|---|---|
| Store | **MongoDB Atlas Vector Search** | Wins the Mongo prize; `$rankFusion` gives hybrid for free |
| Embeddings | **Voyage** (`voyage-3` family) | Mongo's first-party rec; same as both plans |
| LLM | **Gemini 2.5 Flash** (free) *or* **Claude via DO Gradient** | Claude-on-Gradient keeps Claude quality *and* the DO prize — **confirm Gradient hosts Claude on-site** |
| Voice | **ElevenLabs** Scribe (STT) + TTS | ElevenLabs prize; the audible wow; M1's lane |
| Interface | **Thin web app** (v0 + DO App Platform) | Needed for voice; one-click DO deploy = DO prize; M1 owns it |
| Social | `owner` + `shared` columns + scope filter | Novelty differentiator, ~no auth for demo |

> Your `BUILD_PLAN.md` retrieval/generation design (heading-aware chunking, hybrid + RRF,
> incremental hash-diff sync, `ask`/`plan` modes) **carries over almost verbatim** — Atlas
> `$vectorSearch`/`$rankFusion` just replaces pgvector/`tsvector`. You lose nothing you designed.

---

## "I don't have time for an app" — you don't have to carry one

- The web UI is **M1's job** in your division of labor, and **v0 generates ~80% of it**.
- Hosting is **one-click** on DO App Platform.
- **You (M2) own retrieval + generation + data + the ingestion/embedding config** — *identical
  whether the front door is a CLI or a web page.* Adding the web UI doesn't add to *your* load.
- So: **web app, not CLI.** CLI-only would forfeit voice (ElevenLabs prize) and the strongest demo,
  for no saving on your side. (A CLI can stay as a dev/ingestion tool.)

---

## Prize map (what this build targets)

| Prize | How |
|---|---|
| **MongoDB** | Atlas Vector Search + `$rankFusion` as the *star* integration |
| **ElevenLabs** | Scribe STT + streamed TTS (bidirectional voice) |
| **DigitalOcean** | App Platform hosting + (optional) Gradient inference |
| **Gemini / Gen-AI** | If the category is on the board, route generation via Gemini |
| *(stretch)* **QNX** | VoxAssist's "swappable QNX voice-terminal head" — additive, M1's call |

---

## Scope ladder (build in this order)

**MVP (must-ship, low risk):**
1. Ingest personal markdown/txt → chunk → Voyage embed → Atlas (with `owner`, `shared`).
2. Hybrid retrieval (`$vectorSearch` + `$rankFusion`) → grounded `ask` answer with citations (text).
3. Thin web UI: type a question, see answer + citations.
4. Voice loop: Scribe STT in, ElevenLabs TTS out.

**High-value stretch (in order):**
5. `plan` mode → personalized project brief → downloadable `.md`.
6. **Friend mode**: `owner`/`shared` scope filter, two seeded users, demo the remote-collab pitch.
7. Reranking (Voyage `rerank-2`) for grounding quality.
8. Incremental hash-diff sync (from `BUILD_PLAN.md` §7) — nice, but a full re-ingest of a small
   demo corpus is fine for the weekend.

**Only if everything's done:**
9. Real auth/permissions for sharing.
10. QNX voice-terminal head.

---

## Open decisions

- [ ] **Direction:** VoxAssist spine (Atlas + ElevenLabs + DO + web, prize-aligned) **vs.** the
      personal Supabase/Claude/CLI plan. *(Recommend: VoxAssist spine.)*
- [ ] **Social layer:** lightweight stretch (`owner`+`shared`, no auth) **vs.** core with real
      permissions **vs.** cut. *(Recommend: lightweight stretch.)*
- [ ] **LLM:** Gemini (free, simplest, Gemini prize) **vs.** Claude via Gradient (keeps Claude +
      DO prize — confirm Gradient hosts Claude on-site).
- [ ] **Store migration:** confirm switching `BUILD_PLAN.md` from Supabase/pgvector to Atlas.
