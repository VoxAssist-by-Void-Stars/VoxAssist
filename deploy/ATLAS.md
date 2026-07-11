# Atlas + Voyage setup (teammate + deploy)

VoxAssist stores embeddings in **MongoDB Atlas Vector Search** and embeds with **Voyage**.

## My lane (wire + ops)

1. Create an Atlas **M0** (or shared) cluster in a region close to DigitalOcean (`nyc`).
2. Create a DB user and copy the connection string into `MONGODB_URI` (local `.env` and DO secrets).
3. Network access: allow DigitalOcean egress IPs if known, or `0.0.0.0/0` for the hackathon demo (tradeoff: open to the internet — rotate credentials after).
4. Pass `VOYAGE_API_KEY` through env; the teammate's `store` / `retrieval` call Voyage at upsert/query time.

## Teammate lane (indexes + modules)

Implement and commit:

| File | Export | Role |
| --- | --- | --- |
| `src/ai/store.ts` | `createStore(): IVectorStore` | Voyage embed + Atlas upsert |
| `src/ai/retrieval.ts` | `createRetriever(): IRetriever` | `$vectorSearch` + `$rankFusion`, enforce friend ⇒ `shared === true` |
| `src/ai/generation.ts` | `createGenerator(): IGenerator` | Gemini `ask`, Opus/Gradient `plan` |

Suggested collections (align with contract):

- `documents`: path, owner, shared, fileHash, frontmatter, updatedAt
- `chunks`: id, documentPath, owner, shared, headingPath, content, contentHash, tags, links, embedding `[float×1024]`

Indexes (teammate):

1. **Vector Search** on `chunks.embedding` — dim **1024**, cosine similarity; filter fields: `owner`, `shared`.
2. **Atlas Search** (lexical) on `chunks.content` for hybrid fusion.

## Hybrid runtime

- `USE_MOCK_AI=false` — try real modules.
- `AI_FALLBACK_TO_MOCK=true` — if retrieval/generation fail, fall back to mocks so the demo stays alive.
- `getStore()` does **not** fall back (ingest/seed must be real).

## Seed prod Atlas

```bash
# With real keys in .env and teammate store present:
USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault --as momen
USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault-rayan --as rayan
```

Then set `CLERK_OWNER_MAP=user_<momenClerkId>:momen,user_<rayanClerkId>:rayan` in DO.
