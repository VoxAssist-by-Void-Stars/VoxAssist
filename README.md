# VoxAssist

RAG over a personal knowledge base (markdown/txt notes). After sign-in you can:

- **Ask about yourself** — grounded answers from your own notes, with citations.
- **Plan a project** — a personalized brief built from your stack/style/past work (self-only).
- **Ask about a friend** — query another user's **shared** notes by username.
- **Upload notes** — add a markdown/txt file; it's chunked, embedded, and stored in the cloud.

Next.js full-stack (TypeScript) · MongoDB Atlas Vector Search · Voyage embeddings · **all-Claude synthesis** (small model for `ask`, Opus for `plan`).
Team **Void Stars** · [CynicalD/VoxAssist](https://github.com/CynicalD/VoxAssist) · Planning docs in [`docs/`](./docs) · demo seed users in [`seed/`](./seed).

## Quick start

```bash
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

## License

See [LICENSE](./LICENSE).
