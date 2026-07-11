# VoxAssist

Personal knowledge-base RAG for **ask** + **plan**, with citations, Clerk auth, and optional friend-scope queries over shared notes.

Team **Void Stars** · [CynicalD/VoxAssist](https://github.com/CynicalD/VoxAssist)

## Quick start

```bash
cp .env.example .env
# Fill Clerk keys (rotate any key that was ever committed). Leave USE_MOCK_AI=true until Atlas is ready.
npm install
npm run dev
```

```bash
npm run ingest -- --vault ./sample-vault --as momen
npm run ingest -- --vault ./sample-vault-rayan --as rayan
```

**Security:** never put real secrets in `.env.example`. If keys were exposed, rotate them in the Clerk dashboard immediately.

## Auth (Clerk)

We keep **Clerk’s development instance** for the hackathon demo (no custom domain required).

1. Create users for demo personas (`momen`, `rayan`) in the Clerk dashboard.
2. Copy each user’s `user_…` id into `CLERK_OWNER_MAP=user_xxx:momen,user_yyy:rayan` so self-scope matches vault owners from ingest.
3. After DigitalOcean deploy, add the DO app URL under Clerk → **Allowed origins** / **Redirect URLs**.

**Production Clerk** needs a custom domain + DNS (CNAME) — heavy for a weekend; use the dev instance and accept the “development” banner.

**Fallback (only if Clerk blocks):** hashed passwords in Mongo + signed cookies. More control for seeded users, but you rebuild login/session UI — not recommended unless forced.

## Atlas + Voyage

See [deploy/ATLAS.md](deploy/ATLAS.md) and [src/ai/README.md](src/ai/README.md). Teammate implements `store` / `retrieval` / `generation`; this repo wires env and falls back to mocks when `AI_FALLBACK_TO_MOCK=true`.

## Deploy (DigitalOcean App Platform)

Deploy from GitHub so App Platform builds and runs this Next.js service on port **3000**.

### Option A — App Spec (`deploy/app.yaml`)

1. Push `lane/app` (or change the `branch` in the spec).
2. [Create App](https://cloud.digitalocean.com/apps) → connect `CynicalD/VoxAssist`, or:
   ```bash
   doctl apps create --spec deploy/app.yaml
   ```
3. Set encrypted secrets in **Settings → App-Level Environment Variables**:

   | Variable | Notes |
   | --- | --- |
   | `MONGODB_URI` | Atlas connection string |
   | `VOYAGE_API_KEY` | Embeddings |
   | `GEMINI_API_KEY` | `ask` generation |
   | `ANTHROPIC_BASE_URL` | DO Gradient / Anthropic base |
   | `ANTHROPIC_API_KEY` | `plan` generation |
   | `CLERK_SECRET_KEY` | Server auth |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Build + runtime** |
   | `CLERK_OWNER_MAP` | `userId:owner` pairs for demo personas |
   | `USE_MOCK_AI` | Spec default `"false"` (hybrid) |
   | `AI_FALLBACK_TO_MOCK` | Spec default `"true"` |

4. Add the DO URL in Clerk allowed origins; redeploy; confirm `/` health check and Ask SSE streaming.

Build: `npm run build` · Run: `npm start` · Port: `3000`.

### Option B — Dockerfile (local smoke test)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then:

```bash
docker build -f deploy/Dockerfile -t voxassist \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
  --build-arg USE_MOCK_AI=false \
  --build-arg AI_FALLBACK_TO_MOCK=true \
  .

docker run --rm -p 3000:3000 --env-file .env voxassist
```

The image uses Next.js `output: "standalone"`.

## Seed demo data (prod Atlas)

With teammate `store.ts` present and `USE_MOCK_AI=false`:

```bash
USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault --as momen
USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault-rayan --as rayan
```

HTTP `/api/ingest` is **off** unless `ALLOW_HTTP_INGEST=true` (prefer CLI). Guardrail check: signed in as momen, friend-query `rayan` — only `shared: true` notes (not `private/interview.md`).

## Demo video

See [docs/DEMO.md](docs/DEMO.md) for the 2-minute script and recording tips (OBS / Loom / Descript).

## License

See [LICENSE](./LICENSE).
