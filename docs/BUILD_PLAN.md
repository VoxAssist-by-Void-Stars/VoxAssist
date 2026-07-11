# Personal Knowledge-Base RAG — Build Plan

> A retrieval-augmented system over a user's markdown knowledge base (Obsidian-style vaults).
> It embeds the user's notes so an AI *knows the person thoroughly* — able to answer questions
> about them and produce **personalized project plans** — without ever running an LLM over the
> whole vault (which would be expensive).

---

> **⚠️ STORE UPDATE (2026-07-11): the vector store is now MongoDB Atlas Vector Search, not Supabase.**
> The Postgres-specific sections below (§3 stack, §5 data model, §7 sync, §8 query) map to Atlas
> equivalents: tables → collections, `pgvector` / `vector(1024)` → an Atlas **vector index**,
> `tsvector` full-text → an Atlas **search index**, and the RRF SQL function → the built-in
> **`$rankFusion`** aggregation stage. Metadata (`owner`, `shared`, frontmatter) lives in the same
> document. These sections get rewritten to Atlas at build time (M1). `PROJECT.md` is the current
> source of truth.

---

## Table of Contents

1. [Concept & Goals](#1-concept--goals)
2. [Guiding Constraints](#2-guiding-constraints)
3. [Stack Decisions](#3-stack-decisions-locked)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Model](#5-data-model-supabase)
6. [Ingestion Pipeline](#6-ingestion-pipeline)
7. [Incremental Sync](#7-incremental-sync--the-core-engineering-problem)
8. [Query Pipeline](#8-query-pipeline)
9. [Interface (CLI)](#9-interface-cli)
10. [Cost Model](#10-cost-model)
11. [Build Order](#11-build-order-hackathon-paced)
12. [Open Decisions](#12-open-decisions)
13. [Glossary](#13-glossary)

---

## 1. Concept & Goals

Many people keep their entire knowledge base in **markdown files** — notes, project ideas,
preferences, tech-stack decisions, journals. AI agents (via Obsidian and similar) increasingly
*write* to these files too.

This system makes that knowledge **queryable by meaning**:

- **You ask a question about yourself** → the system retrieves the most relevant notes and an
  LLM writes a clean answer.
- **You describe a project idea** → the system already *knows* your preferences, stack, and
  patterns, and produces a **personalized draft** you can hand to Claude (or Claude Code) as a
  strong starting brief.

**What this is NOT:** an agent that builds projects end-to-end. It **answers questions about the
user** and **plans** — nothing after that.

### Two modes

| Mode | Purpose | LLM cost |
|------|---------|----------|
| `ask` | Answer a question about the user from their notes | Light — one synthesis call |
| `plan` | Produce a personalized project draft → written to a `.md` file | Heavier — bigger generation, **only when asked** |

---

## 2. Guiding Constraints

- **Cost discipline.** Embeddings are cheap and computed **once per chunk**. LLM calls happen
  only at query time. No LLM ever reads the whole vault.
- **Incremental ingestion is a post-demo expansion.** For the 24h demo we do a **one-time full
  ingest** — no automatic / behind-the-scenes embedding. The design still supports incremental
  sync later; it's just not built for the demo. See [§7](#7-incremental-sync--the-core-engineering-problem).
- **Query embedding stays.** Semantic (dense) search *requires* embedding the query. It's one
  cheap embedding call per question — keep it.
- **Cost scales with intent, not with every keystroke.** `ask` is cheap; the heavier `plan`
  generation is only paid when the user explicitly asks to plan.

---

## 3. Stack Decisions (Locked)

| Concern | Choice | Why |
|---------|--------|-----|
| Runtime | **TypeScript / Node** | Best fit with Supabase JS client + Obsidian ecosystem |
| Vector store | **Supabase Postgres + `pgvector`** | Dense/semantic search; already in use |
| Sparse search | **Postgres `tsvector` full-text** | Catches exact terms (library names, titles) embeddings blur |
| Fusion | **Reciprocal Rank Fusion (RRF)** in a SQL function | Merges dense + sparse into one ranked list |
| Embeddings | **Hosted API — Voyage (`voyage-3` family) recommended** | Anthropic's recommended embedding provider for Claude. OpenAI `text-embedding-3-small` is the fallback. |
| Synthesis LLM | **Claude Opus 4.8** (`claude-opus-4-8`) via `@anthropic-ai/sdk` | Latest, most capable; adaptive thinking for planning |

> ⚠️ **Lock the embedding model up front.** The vector column dimension is fixed to the chosen
> model (e.g. `1024` for `voyage-3`). Changing the model later means **re-embedding the entire
> vault**. Store the dimension as an explicit config constant.

---

## 4. Architecture Overview

```
                      Markdown vault (.md files)
                                │
                                │  parse frontmatter + body
                                │  chunk by heading/section
                                ▼
        ┌─────────────────────────────────────────────┐
        │  Ingestion  (incremental, hash-diffed)       │
        │  new/changed chunks ──embed──▶ Supabase      │
        └─────────────────────────────────────────────┘
                                │
                                ▼
                Supabase / Postgres + pgvector
             ┌───────────────────────────────────┐
             │  chunks: embedding (dense, vector) │
             │          fts (sparse, tsvector)    │
             └───────────────────────────────────┘
                                ▲
                                │  hybrid search (dense + sparse → RRF)
                                │
    Query ──embed──▶  Hybrid search RPC  ──▶  top-N chunks (+ citations)
                                │
                                ▼
                       Claude Opus 4.8 synthesis
                        ├─ ask  → clean answer about the user
                        └─ plan → personalized draft → write .md file
```

---

## 5. Data Model (Supabase)

Two tables.

### `documents` — one row per markdown file

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (pk) | |
| `path` | text (unique) | Vault-relative file path |
| `file_hash` | text | Hash of the whole file — file-level change gate |
| `frontmatter` | jsonb | Parsed YAML frontmatter |
| `updated_at` | timestamptz | |

### `chunks` — one row per chunk

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (pk) | |
| `document_id` | uuid (fk → documents) | `ON DELETE CASCADE` |
| `heading_path` | text | e.g. `Projects > RAGnarok > Stack` |
| `content` | text | The chunk text |
| `content_hash` | text | Powers incremental sync (§7) |
| `embedding` | `vector(1024)` | Dense vector (dimension = embedding model) |
| `fts` | `tsvector` | **Generated column** from `content` |

**Indexes**

- `hnsw` (or `ivfflat`) on `embedding` → dense search
- `GIN` on `fts` → sparse full-text search

> The `content_hash` per chunk is the key that lets sync re-embed only what changed.

---

## 6. Ingestion Pipeline

1. **Walk the vault** for `.md` files.
2. **Parse each file** — split YAML frontmatter from the markdown body.
3. **Chunk on markdown structure** — split by headings into sections. If a section exceeds a
   token ceiling (~500–800 tokens), sub-split on paragraphs. Attach `heading_path` + file `path`
   as metadata to every chunk.
   - *Why not fixed-window chunking?* Obsidian notes are already semantically segmented by
     headings — respect that structure so retrieved chunks are coherent and citable.
4. **Hash** each chunk's content → `content_hash`.
5. **Embed** new/changed chunks in **batches** (one API call per batch, not per chunk).
6. **Upsert** documents + chunks into Supabase.

---

## 7. Incremental Sync — the core engineering problem

> **Demo scope:** NOT built for the 24h demo — we ingest once (full ingest). This section is the
> plan for the **post-demo** expansion; keep it for later.

The `sync` command performs a **three-way diff** and **never re-embeds the whole vault**.

### Diff logic

| Situation | Action | Cost |
|-----------|--------|------|
| File `file_hash` unchanged | Skip file entirely | **Zero** |
| Chunk `content_hash` unchanged | Keep as-is | **Zero** |
| New or changed chunk hash | Embed + upsert | 1 embedding / chunk |
| Stored chunk hash no longer present in file | Delete chunk | Zero |
| File in DB but missing on disk | Cascade-delete its chunks | Zero |

### Trigger options (cheapest → richest)

1. **Manual `sync` command** — enough for the hackathon demo, and cheap.
2. **File watcher** (chokidar on the vault dir) → debounced `sync` on save.
3. **Obsidian plugin hook** — future.

### Net effect

Editing 3 paragraphs re-embeds **3 chunks**, not the whole vault. This is what makes frequent
ingestion viable and kills the cost/latency concern.

---

## 8. Query Pipeline

A shared retrieval core feeds both modes.

### Retrieval core

1. **Embed the query** — one cheap embedding call (**required** for dense search).
2. **Hybrid search** via a single Supabase RPC:
   - **Dense:** `embedding <=> query_embedding` (cosine distance) → top-K
   - **Sparse:** `fts @@ websearch_to_tsquery(query)` → top-K
   - **RRF fuse** the two ranked lists → final top-N chunks, each carrying `heading_path` +
     `path` for citation.
3. Pass the top-N chunks to Claude.

> **Why hybrid?** Dense catches *meaning*; sparse catches *exact terms* (library names, project
> titles) that embeddings blur. RRF gives you the strengths of both in one ranked list.

### `ask` mode — light

- One `messages.create` call, `claude-opus-4-8`, `max_tokens` ~2–4k.
- **System prompt:** answer questions about the user using **only** the retrieved notes; **cite**
  the file/heading each fact came from; say plainly when the notes don't cover it.
- Retrieved chunks + question go in the user turn.
- **Output:** a clean, grounded answer.

### `plan` mode — heavier, on-demand

- Retrieve the user's **preferences, tech stack, patterns, prior projects**.
- One `messages.create` call with **adaptive thinking**
  (`thinking: { type: "adaptive" }`, `effort: "high"`) — deeper reasoning earns its cost here.
- **Output:** a structured, personalized project draft, then **written to a `.md` file** the user
  can plug into Claude / Claude Code as a strong starting brief.
- Cost is only incurred when the user explicitly asks to plan.

---

## 9. Interface (CLI)

A small CLI (or thin API) with three commands:

| Command | Purpose |
|---------|---------|
| `ingest` / `sync` | Build & incrementally update the index |
| `ask "<question>"` | Q&A about the user |
| `plan "<idea>"` | Personalized draft → `.md` file |

---

## 10. Cost Model

| Operation | When it runs | Cost profile |
|-----------|--------------|--------------|
| Embedding a chunk | Once, on ingest/sync of changed chunks | Very low; batched |
| Embedding a query | Every `ask` / `plan` | Fractions of a cent |
| `ask` synthesis | Per question | One Opus call, small `max_tokens` |
| `plan` generation | Only on explicit plan request | Larger Opus call w/ adaptive thinking |

**Key property:** the whole vault is never sent to an LLM. Ingestion cost is proportional to
*changes*, and generation cost is proportional to *intent*.

---

## 11. Build Order (hackathon-paced)

1. **Supabase schema** + `pgvector` / `tsvector` + RRF SQL function.
2. **Ingestion** (parse → chunk → embed → upsert) — get *something* searchable first.
3. **Hybrid-search RPC** + `ask` mode end-to-end.
4. *(Post-demo)* **Incremental `sync`** (hash diffing).
5. **`plan` mode** + markdown output.
6. **File watcher** (if time permits).

---

## 12. Open Decisions

- [ ] **Embedding provider** — Voyage (`voyage-3`, recommended) vs. OpenAI
      (`text-embedding-3-small`). Fixes the vector column dimension.
- [ ] **Interface** — CLI-only for the demo, or CLI + a minimal HTTP endpoint (in case a UI
      comes later).

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Dense search** | Semantic search: embed the query, compare to embedded chunks by cosine distance. |
| **Sparse search** | Keyword/full-text search (Postgres `tsvector`) — matches exact terms. |
| **Hybrid search** | Running both dense + sparse and merging the results. |
| **RRF** | Reciprocal Rank Fusion — merges two ranked lists into one by rank position. |
| **Chunk** | A section of a note (split on headings) that gets embedded and retrieved. |
| **Ingestion / sync** | The process of reading the vault, chunking, embedding, and storing. |
| **Frontmatter** | The YAML block at the top of a markdown note (tags, metadata). |

---

*Model for synthesis: **Claude Opus 4.8** (`claude-opus-4-8`) via `@anthropic-ai/sdk`.*
