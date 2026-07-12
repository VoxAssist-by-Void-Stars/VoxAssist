# VoxAssist

**Personal knowledge-base RAG for ask + plan — with optional voice.**

VoxAssist turns markdown/txt notes (the kind you and your agents already write) into a grounded assistant. Ask questions about your work and preferences, or describe an idea and get a personalized project brief — both cited from real notes. A lightweight **ask-a-friend** scope lets teammates query each other’s **shared** notes.

**What it is not:** an agent that builds projects end-to-end. It **answers** and **plans**, then stops.

> Team **Void Stars** · [cuHacking 2026](https://cuhacking.ca) · Repo: [CynicalD/VoxAssist](https://github.com/CynicalD/VoxAssist)

---

## What you can do

| Mode | What you get |
| --- | --- |
| **Ask (self)** | Grounded answer from your vault, with file + heading citations |
| **Plan** | Personalized project brief (stack, prefs, past work) as downloadable `.md` |
| **Ask a friend** | Query another user’s notes limited to `shared === true` (lookup, never a bypass) |
| **Upload** | Add a markdown/txt file; chunked, embedded, and stored under your owner |
| **Voice** * | Push-to-talk STT (ElevenLabs Scribe) + TTS read-aloud (ElevenLabs, browser SpeechSynthesis fallback) |

Corpus = personal markdown with YAML frontmatter (`owner`, `shared`, tags) plus heading-aware chunks, `#tags`, and `[[wikilinks]]`.

---

## Stack

| Layer | Choice |
| --- | --- |
| App + API | **Next.js 15** (App Router) + **TypeScript** |
| Auth | **Fake auth** (type a username) or **Clerk** when keys are set |
| Vector DB | **MongoDB Atlas** (`$vectorSearch` + `$rankFusion`) |
| Embeddings | **Voyage** (`voyage-3.5`, dim 1024) |
| `ask` LLM | **Gemini** (`gemini-2.5-flash`) |
| `plan` LLM | **Claude Opus** |
| TTS / STT  | **ElevenLabs** (`eleven_flash_v2_5` + `scribe_v2`) |
| Deploy | **DigitalOcean App Platform** |

Privacy guardrail: friend-scope retrieval enforces `shared === true`. Entering a username is a **lookup**, never a permission bypass.

---

## Quick start

### Mock mode (no API keys)

```bash
cp .env.example .env   # USE_MOCK_AI=true by default
npm install
npm run dev            # http://localhost:3000
```

Sign in by typing any username (Clerk keys empty ⇒ fake auth). The username is the vault `owner`.

Optional local ingest of the sample vault (prints a summary; mock upsert when `USE_MOCK_AI=true`):

```bash
npm run ingest -- --vault ./sample-vault --as momen
```

### Real mode (Atlas + Voyage + Gemini/Claude)

```bash
cp .env.example .env   # set keys; USE_MOCK_AI=false
npm install
npm run doctor         # env + MongoDB connectivity
npm run atlas:setup    # chunks collection + vector/search indexes
npm run seed           # embed + upsert demo users in seed/
npm run dev
```

CLI query (real retrieval + Gemini ask / Claude plan):

```bash
npm run query -- ask  "What is Alex's stack?" --owner alex
npm run query -- ask  "How does she work?"    --owner priya --friend
npm run query -- plan "A notes-to-website CLI" --owner alex --out brief.md
```

Demo seed users live in [`seed/`](./seed) (`alex`, `priya`, `marcus`). Extra fixtures: [`sample-vault/`](./sample-vault).

---

## Auth

Two modes, switched by env — no code changes:

- **Fake auth (default, demo):** leave both Clerk keys empty. Sign in by typing any username; that name is the vault `owner`.
- **Real Clerk:** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. After flipping keys, delete `.next` and restart.

**Vault owner resolution** (self-scope) uses this precedence:

1. Stored `users.owner` (set on first `/api/me` or ask/plan)
2. `CLERK_OWNER_MAP` override (`user_xxx:momen`)
3. Clerk **username** (normalized; aliases like `omen-mali` → `momen`)
4. Raw Clerk `userId` (last resort)

For the demo, set Clerk usernames to `momen` / `rayan` (or seed owners) so notes match without an env map. Add the deploy URL under Clerk → Allowed origins.

---

## Environment

| Var | Purpose |
| --- | --- |
| `USE_MOCK_AI` | `true` (default) = mocks keyless; `false` = real Atlas / Voyage / Gemini+Claude |
| `AI_FALLBACK_TO_MOCK` | When real AI fails, fall back to mocks (`true` by default) |
| `GEMINI_API_KEY` / `GEMINI_ASK_MODEL` | Gemini for `ask` (default `gemini-2.5-flash`) |
| `ANTHROPIC_API_KEY` | Claude for `plan` only |
| `CLAUDE_PLAN_MODEL` | Opus model for `plan` (default `claude-opus-4-8`) |
| `MONGODB_URI` / `MONGODB_DB` | Atlas SRV string (Vector Search enabled) / db name |
| `VOYAGE_API_KEY` / `VOYAGE_MODEL` / `EMBEDDING_DIM` | Embeddings (`voyage-3.5` / `1024`) |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` / `ELEVENLABS_MODEL` / `ELEVENLABS_STT_MODEL` | Missing key ⇒ `/api/tts` and `/api/stt` return 501 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Empty ⇒ fake auth; both set ⇒ real Clerk |
| `CLERK_OWNER_MAP` | Optional `userId:owner` override when username ≠ vault owner |
| `ALLOW_HTTP_INGEST` | Must be `true` for in-app upload / HTTP ingest |
| `LLM_RATE_LIMIT_PER_MINUTE` | Per-user LLM rate limit (`0` disables; default `30`) |
| `UPLOAD_MAX_CHUNKS_PER_USER` / `UPLOAD_MAX_DOCS_PER_USER` | Upload quotas (defaults `500` / `50`) |

Full template: [`.env.example`](./.env.example). **Never** commit real secrets; rotate any key that was ever committed.

---

## API surface

| Route | Method | Notes |
| --- | --- | --- |
| `/api/ask` | POST | SSE tokens + citations |
| `/api/plan` | POST | Markdown brief + citations |
| `/api/upload` | POST | Multipart file → chunk + embed + upsert (quota-guarded) |
| `/api/ingest` | POST | Optional HTTP ingest (`ALLOW_HTTP_INGEST=true`) |
| `/api/users` | GET | Directory of owners with shared notes + roles |
| `/api/me` | GET | Upsert/return caller identity (`userId`, `owner`, `role`) |
| `/api/tts` | POST | ElevenLabs audio/mpeg stream (501 if unconfigured) |

---

## Deploy (DigitalOcean App Platform)

Spec: [`deploy/app.yaml`](./deploy/app.yaml) · Atlas notes: [`deploy/ATLAS.md`](./deploy/ATLAS.md) · local image: [`deploy/Dockerfile`](./deploy/Dockerfile).

Set encrypted app-level env vars at minimum: `MONGODB_URI`, `VOYAGE_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `USE_MOCK_AI=false`, `ALLOW_HTTP_INGEST=true`. Optionally ElevenLabs and Clerk keys. Build: `npm run build` · Run: `npm start` · port **3000**.

---

## Repo layout

```
src/
  contract/types.ts     # shared schema + IVectorStore / IRetriever / IGenerator
  ingestion/            # vault → DocumentMeta[] + Chunk[]
  ai/                   # store · retrieval · generation · mocks · factory
  app/api/              # ask · plan · upload · ingest · users · me · tts
  lib/                  # config, auth, roles, identity, owners, schemas, …
scripts/                # ingest · seed · doctor · atlas:setup · query
seed/                   # demo personas (alex / priya / marcus)
sample-vault/           # synthetic fixtures for local ingest demos
deploy/                 # DO App Platform spec + Dockerfile + Atlas notes
docs/                   # project tracker, demo script, planning history
```

Planning / milestones: [`docs/PROJECT.md`](./docs/PROJECT.md) · Demo script: [`docs/DEMO.md`](./docs/DEMO.md).

---

## License

See [LICENSE](./LICENSE).
