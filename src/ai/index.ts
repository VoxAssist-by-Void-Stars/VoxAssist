import type { IGenerator, IRetriever, IVectorStore } from "../contract/types";
import { MockGenerator, MockRetriever, MockVectorStore } from "./mocks";

function useMockAi(): boolean {
  return process.env.USE_MOCK_AI !== "false";
}

export function getStore(): IVectorStore {
  if (useMockAi()) return new MockVectorStore();
  throw new Error(
    "Real IVectorStore not wired yet. Set USE_MOCK_AI=true or add src/ai/store.ts.",
  );
}

export function getRetriever(): IRetriever {
  if (useMockAi()) return new MockRetriever();
  throw new Error(
    "Real IRetriever not wired yet. Set USE_MOCK_AI=true or add src/ai/retrieval.ts.",
  );
}

export function getGenerator(): IGenerator {
  if (useMockAi()) return new MockGenerator();
  throw new Error(
    "Real IGenerator not wired yet. Set USE_MOCK_AI=true or add src/ai/generation.ts.",
  );
}
