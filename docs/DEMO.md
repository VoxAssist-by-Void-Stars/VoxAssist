# Demo script — VoxAssist (≈2 minutes)

## Recording tools

| Step | Tool |
| --- | --- |
| Capture | [OBS Studio](https://obsproject.com/) (free) or [Loom](https://www.loom.com/) |
| Edit / captions | [Descript](https://www.descript.com/) or CapCut |
| Optional deterministic UI take | Playwright script below |

## Happy-path narration

1. **Open the deployed URL** — dark UI, VoxAssist branding. “This is our personal-KB RAG over Obsidian-style notes.”
2. **Sign in as momen** (Clerk). Show the header `@momen`.
3. **Self ask** — click chip “What is my stack?” → Ask. Show streaming tokens + citation cards (ragnarok / Stack).
4. **Friend ask** — toggle “Another user”, type `rayan`, ask “What stack does Rayan prefer?” Show only **shared** notes (Python/Atlas) — mention private notes stay private.
5. **Plan** — switch to Plan, chip “Ship a RAG demo this weekend” → Draft plan. Show markdown brief + **Download .md**.
6. **Close** — “Ask and plan, grounded in real notes, deployable on DigitalOcean with Atlas + Voyage.”

## Checklist before recording

- [ ] DO app healthy; Clerk origins include the DO URL
- [ ] `CLERK_OWNER_MAP` set; both personas can sign in
- [ ] Atlas seeded (`sample-vault` + `sample-vault-rayan`)
- [ ] Hybrid: real retrieval if modules present, else mock fallback still demoable
- [ ] Browser zoom 110–125%; hide bookmarks bar

## Optional Playwright walkthrough

```bash
npx playwright install chromium
npx playwright test docs/demo.spec.ts --headed
```

Requires `DEMO_BASE_URL` and a storage state or test credentials if you extend the stub.
