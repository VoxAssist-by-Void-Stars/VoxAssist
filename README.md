# VoxAssist

RAG over a personal knowledge base (markdown/txt notes). After a lightweight sign-in you can:

- **Ask about yourself** — grounded answers from your own notes, with citations.
- **Plan a project** — a personalized brief built from your stack/style/past work.
- **Ask about a friend** — query another user's notes by username (scoped to only their data).

Next.js full-stack (TypeScript) · MongoDB Atlas Vector Search · Voyage embeddings · Claude Opus 4.8.
Planning docs live in [`docs/`](./docs); demo seed users in [`seed/`](./seed).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm run doctor         # checks env + MongoDB connectivity
npm run dev            # http://localhost:3000
```

The app runs on mock AI by default (`USE_MOCK_AI=true`), so it boots without real
keys. Set `USE_MOCK_AI=false` and fill in the keys below to wire real retrieval.

### Environment

| Var | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude — the only synthesis LLM |
| `CLAUDE_ASK_MODEL` / `CLAUDE_PLAN_MODEL` | small model for `ask` / Opus 4.8 for `plan` |
| `MONGODB_URI` | Atlas SRV connection string (Vector Search enabled) |
| `MONGODB_DB` | Database name (default `voxassist`) |
| `VOYAGE_API_KEY` | Voyage embeddings |
| `VOYAGE_MODEL` / `EMBEDDING_DIM` | `voyage-3.5` / `1024` |
| `USE_MOCK_AI` | `true` (default) runs mocks; `false` requires real keys |

## Status

M0 (scaffold) in progress. See [`docs/PROJECT.md`](./docs/PROJECT.md) for milestones and progress.
