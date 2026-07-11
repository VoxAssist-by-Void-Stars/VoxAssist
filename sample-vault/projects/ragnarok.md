---
owner: momen
shared: true
tags:
  - projects
  - rag
---

# Projects

Notes on active builds.

## RAGnarok

Personal knowledge-base RAG for the hackathon.

### Stack

We use Next.js App Router with TypeScript, MongoDB Atlas, and Voyage embeddings. #stack #nextjs

See also [[Deploy]] and [[Auth]].

### Auth

Clerk handles login; `userId` becomes the document `owner`. #auth

### Deploy

Target is DigitalOcean App Platform. Optional Dockerfile under `deploy/`. #deploy
