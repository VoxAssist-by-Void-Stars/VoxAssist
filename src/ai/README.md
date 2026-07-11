# Teammate AI module seam

Lock these exports so the factory in `src/ai/index.ts` can load your code when `USE_MOCK_AI=false`.

```ts
// src/ai/store.ts
import type { IVectorStore } from "../contract/types";
export function createStore(): IVectorStore { /* ... */ }

// src/ai/retrieval.ts
import type { IRetriever } from "../contract/types";
export function createRetriever(): IRetriever { /* ... */ }

// src/ai/generation.ts
import type { IGenerator } from "../contract/types";
export function createGenerator(): IGenerator { /* ... */ }
```

Interfaces live in `src/contract/types.ts`. Friend-scope **must** filter `shared === true` inside `retrieve`.

Python alternative: keep the same three files as thin HTTP clients that `fetch` your service with JSON matching `DocumentMeta`, `Chunk`, `Scope`, `RetrievalResult`, `AskResponse`, `PlanResponse`.
