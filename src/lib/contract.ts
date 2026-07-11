// Client-facing contract mirrors src/contract/types.ts for UI typing.
export type {
  Scope,
  Citation,
  AskRequest,
  AskResponse,
  PlanRequest,
  PlanResponse,
} from "@/contract/types";

/** Signed-in user display info (from Clerk). */
export interface SessionUser {
  id: string;
  username: string;
  displayName?: string;
}
