# VoxAssist

<<<<<<< HEAD
**Personal knowledge-base RAG for ask + plan — with optional voice.**

VoxAssist turns an Obsidian-style markdown vault (notes you and your agents already write) into a grounded assistant. Ask questions about your work and preferences, or describe an idea and get a personalized project brief — both cited from real notes. A lightweight **ask-a-friend** scope lets teammates query each other’s **shared** notes before a remote collab.

**What it is not:** an agent that builds projects end-to-end. It **answers** and **plans**, then stops.

> Team **Void Stars** · [cuHacking 2026](https://cuhacking.ca) · Repo: [CynicalD/VoxAssist](https://github.com/CynicalD/VoxAssist)

---

## Overview

| Mode | What you get |
| --- | --- |
| **`ask`** | Grounded answer from your vault, with file + heading citations |
| **`plan`** | Personalized project brief (stack, prefs, past work) written to a downloadable `.md` |
| **Friend scope** | Query another user’s notes limited to `shared === true` (lookup, never a bypass) |
| **Voice** *(optional)* | STT in / TTS out for a push-to-talk loop |

Corpus = personal markdown with YAML frontmatter (`owner`, `shared`, tags) plus heading-aware chunks, `#tags`, and `[[wikilinks]]`.

---

## Proposed architecture

```
  Markdown vault (.md)
        │  walk → frontmatter → heading chunk → hash
        ▼
  Ingestion (CLI / optional API)  ──▶  Chunk[] + DocumentMeta
        │                                    │
        │                         Voyage embed + Atlas upsert
        ▼                                    ▼
  Next.js API                         MongoDB Atlas
  /api/ask  /api/plan                 Vector Search + lexical
        │                                    │
        │◄──── retrieve (hybrid / RRF) ──────┘
        ▼
  Generator:  ask → Gemini (stream + cite)
              plan → Opus 4.8 via DO Gradient → .md
        │
        ▼
  Web UI (v0) + Clerk auth   →   DigitalOcean App Platform
```

**Coupling points (lock early, build in parallel):**

1. **Chunk / document schema** — ingestion produces it; embed/store/retrieve consume it (`src/contract/types.ts`).
2. **AI module interfaces** — `IVectorStore`, `IRetriever`, `IGenerator`; API calls these only.
3. **Demo script** — shared happy path.

Until real AI modules land, `USE_MOCK_AI=true` keeps the app shell and ingestion unblocked.

---

## Stack

| Layer | Choice |
| --- | --- |
| App + API | **Next.js 15** (App Router) + **TypeScript** |
| Ingestion | **tsx** CLI (`npm run ingest`) — `fast-glob`, `gray-matter`, sha256 hashes |
| Auth | **Clerk** (`owner` ← `userId`) |
| Vector DB | **MongoDB Atlas Vector Search** (`$vectorSearch` + `$rankFusion`) |
| Embeddings | **Voyage** (`voyage-3` / `3.5`, dim locked before schema) |
| `ask` LLM | **Gemini** (2.5 Flash or newer) |
| `plan` LLM | **Claude Opus 4.8** via **DigitalOcean Gradient** |
| UI | **v0**-generated, wired to `/api/ask` and `/api/plan` |
| Deploy | **DigitalOcean App Platform** |
| Voice *(stretch)* | **ElevenLabs** STT/TTS |

---

## Responsibilities

| | [omen-mali](https://github.com/omen-mali) (Momen) | [CynicalD](https://github.com/CynicalD) (Rayan) |
| --- | --- | --- |
| **Focus** | Systems / integration — get data in, stand the app up, ship it | ML / retrieval / generation — the RAG brain and data model |
| **Owns** | Vault ingestion (walk, parse, chunk, hash, sync) · Next.js API (`/api/ask`, `/api/plan`, optional `/api/ingest`) · Clerk + friend-scope wiring · v0 UI · DO deploy · optional TTS / QNX voice terminal | Atlas schema + vector/lexical indexes · Voyage embed + upsert · hybrid retrieve + rerank · `ask` (Gemini) + `plan` (Opus/Gradient) · optional STT · retrieval eval set |
| **Does not own** | Embedding model choice, Atlas index internals, generation prompts | Vault parsing / chunking rules, App Platform app shell, Clerk session plumbing |

**Shared:** contract types + AI interfaces, demo pitch, and integration on Saturday.

Privacy guardrail: friend-scope retrieval must enforce `shared === true`. The API only passes `Scope`; retrieval enforces the flag. Entering a username is a **lookup**, never a permission bypass.

---

## Repo layout (app lane)

```
src/
  contract/types.ts     # shared schema + IVectorStore / IRetriever / IGenerator
  ingestion/            # vault → DocumentMeta[] + Chunk[]
  ai/                   # mocks + factory (real store/retrieval/generation swap in later)
  app/api/              # ask (SSE) · plan · ingest
  lib/config.ts
scripts/ingest.ts
sample-vault/           # synthetic fixtures for local demos
deploy/                 # DO App Platform spec (+ optional Dockerfile)
```

---
=======
RAG over a personal knowledge base (markdown/txt notes). After sign-in you can:

- **Ask about yourself** — grounded answers from your own notes, with citations.
- **Plan a project** — a personalized brief built from your stack/style/past work (self-only).
- **Ask about a friend** — query another user's **shared** notes by username.
- **Upload notes** — add a markdown/txt file; it's chunked, embedded, and stored in the cloud.

Next.js full-stack (TypeScript) · MongoDB Atlas Vector Search · Voyage embeddings · **all-Claude synthesis** (small model for `ask`, Opus for `plan`).
Team **Void Stars** · [CynicalD/VoxAssist](https://github.com/CynicalD/VoxAssist) · Planning docs in [`docs/`](./docs) · demo seed users in [`seed/`](./seed).
>>>>>>> DevBranch

## Quick start

```bash
<<<<<<< HEAD
cp .env.example .env   # set USE_MOCK_AI=true for local mocks
npm install
npm run dev            # http://localhost:3000

# Ingest sample notes (prints summary + mock upsert)
npm run ingest -- --vault ./sample-vault --as momen
```

**Ask (SSE)** — prefer a JSON file so shells don’t break on quotes:

```powershell
# PowerShell (Windows)
@'
{"question":"what is my stack?","scope":{"kind":"self","owner":"momen"}}
'@ | Set-Content .\ask.json -NoNewline -Encoding utf8

curl.exe -sN -X POST http://localhost:3000/api/ask `
  -H "Content-Type: application/json" `
  --data-binary "@ask.json"
```

```bash
# bash / WSL
printf '%s' '{"question":"what is my stack?","scope":{"kind":"self","owner":"momen"}}' > /tmp/ask.json
curl -sN -X POST http://localhost:3000/api/ask \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/ask.json
```

---
=======
npm install
cp .env.example .env   # then fill in the values
npm run doctor         # checks env + MongoDB connectivity
npm run atlas:setup    # creates the chunks collection + vector/search indexes
npm run seed           # embeds + upserts the demo users in seed/ into Atlas
npm run dev            # http://localhost:3000
```

Query the RAG pipeline directly from the CLI (real retrieval + Claude):

```bash
npm run query -- ask  "What is Alex's stack?" --owner alex
npm run query -- ask  "How does she work?"    --owner priya --friend
npm run query -- plan "A notes-to-website CLI" --owner alex --out brief.md
```

### Environment

| Var | Purpose |
|-----|---------|
| `USE_MOCK_AI` | `true` (default) runs mocks keyless; `false` = real Atlas/Voyage/Claude |
| `ANTHROPIC_API_KEY` | Claude — the only synthesis LLM |
| `CLAUDE_ASK_MODEL` / `CLAUDE_PLAN_MODEL` | small model for `ask` / Opus for `plan` |
| `MONGODB_URI` / `MONGODB_DB` | Atlas SRV string (Vector Search enabled) / db name |
| `VOYAGE_API_KEY` / `VOYAGE_MODEL` / `EMBEDDING_DIM` | Voyage embeddings (`voyage-3.5` / `1024`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | **Empty ⇒ fake auth** (type a username); set both ⇒ real Clerk |
| `ALLOW_HTTP_INGEST` | must be `true` for the in-app file upload |

**Security:** never put real secrets in `.env.example`; rotate any key that was ever committed.

## Auth

Two modes, switched by env — no code changes:

- **Fake auth (default, demo):** leave the Clerk keys empty. Sign in by typing any username;
  sign out from the user button. The username is the vault `owner` for everything you do.
- **Real Clerk:** set both Clerk keys. Uses Clerk's dev instance (no custom domain needed).
  Map Clerk userIds to vault owners with `CLERK_OWNER_MAP=user_xxx:momen,user_yyy:rayan`,
  and add the deploy URL under Clerk → Allowed origins.

## Deploy (DigitalOcean App Platform)

Deploy from GitHub so App Platform builds and runs this Next.js service on port **3000**
(spec in [`deploy/app.yaml`](./deploy/app.yaml); Atlas notes in [`deploy/ATLAS.md`](./deploy/ATLAS.md)).
Set encrypted app-level env vars: `MONGODB_URI`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`,
`USE_MOCK_AI=false`, `ALLOW_HTTP_INGEST=true`, and (if using real Clerk) the two Clerk keys.
Build: `npm run build` · Run: `npm start`. A Dockerfile for local smoke tests is in
[`deploy/Dockerfile`](./deploy/Dockerfile).

## Status

Core RAG (M0–M7) done and verified via CLI; web app integrated. See
[`docs/PROJECT.md`](./docs/PROJECT.md) for milestones and the progress log, and
[`docs/DEMO.md`](./docs/DEMO.md) for the demo script.
>>>>>>> DevBranch

## License

See [LICENSE](./LICENSE).
