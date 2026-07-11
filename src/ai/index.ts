import type { IGenerator, IRetriever, IVectorStore } from "../contract/types";
import { MockGenerator, MockRetriever, MockVectorStore } from "./mocks";

function useMockAi(): boolean {
  return process.env.USE_MOCK_AI === "true";
}

type StoreModule = {
  createStore?: () => IVectorStore;
  VectorStore?: new () => IVectorStore;
  default?: (new () => IVectorStore) | IVectorStore | (() => IVectorStore);
};

type RetrieverModule = {
  createRetriever?: () => IRetriever;
  Retriever?: new () => IRetriever;
  default?: (new () => IRetriever) | IRetriever | (() => IRetriever);
};

type GeneratorModule = {
  createGenerator?: () => IGenerator;
  Generator?: new () => IGenerator;
  default?: (new () => IGenerator) | IGenerator | (() => IGenerator);
};

function instantiate<T>(
  mod: {
    create?: () => T;
    Class?: new () => T;
    default?: (new () => T) | T | (() => T);
  },
  label: string,
): T {
  if (typeof mod.create === "function") return mod.create();
  if (mod.Class) return new mod.Class();
  if (mod.default) {
    const d = mod.default;
    if (typeof d === "function") {
      try {
        return new (d as new () => T)();
      } catch {
        return (d as () => T)();
      }
    }
    return d;
  }
  throw new Error(`${label} has no create*/Class/default export`);
}

async function loadRealStore(): Promise<IVectorStore> {
  try {
    // Teammate module — may be absent until integration.
    // @ts-expect-error optional until Step 8
    const mod = (await import("./store")) as StoreModule;
    return instantiate(
      {
        create: mod.createStore,
        Class: mod.VectorStore,
        default: mod.default,
      },
      "src/ai/store.ts",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Real IVectorStore unavailable (set USE_MOCK_AI=true or add src/ai/store.ts): ${message}`,
    );
  }
}

async function loadRealRetriever(): Promise<IRetriever> {
  try {
    // @ts-expect-error optional until Step 8
    const mod = (await import("./retrieval")) as RetrieverModule;
    return instantiate(
      {
        create: mod.createRetriever,
        Class: mod.Retriever,
        default: mod.default,
      },
      "src/ai/retrieval.ts",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Real IRetriever unavailable (set USE_MOCK_AI=true or add src/ai/retrieval.ts): ${message}`,
    );
  }
}

async function loadRealGenerator(): Promise<IGenerator> {
  try {
    // @ts-expect-error optional until Step 8
    const mod = (await import("./generation")) as GeneratorModule;
    return instantiate(
      {
        create: mod.createGenerator,
        Class: mod.Generator,
        default: mod.default,
      },
      "src/ai/generation.ts",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Real IGenerator unavailable (set USE_MOCK_AI=true or add src/ai/generation.ts): ${message}`,
    );
  }
}

/** Factory: mocks when USE_MOCK_AI=true; otherwise guarded dynamic import of teammate modules. */
export async function getStore(): Promise<IVectorStore> {
  if (useMockAi()) return new MockVectorStore();
  return loadRealStore();
}

export async function getRetriever(): Promise<IRetriever> {
  if (useMockAi()) return new MockRetriever();
  return loadRealRetriever();
}

export async function getGenerator(): Promise<IGenerator> {
  if (useMockAi()) return new MockGenerator();
  return loadRealGenerator();
}
