---
owner: momen
shared: true
---

# Daily

## Standup

Shipped ingestion walk/parse/chunk. Next: API routes against mocks. #standup

See the project brief in [[RAGnarok]] for stack context.

Walk files with fast-glob, parse frontmatter, chunk on headings, then hash each chunk before upsert. Embeddings stay out of ingestion on purpose.
