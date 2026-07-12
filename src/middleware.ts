import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedApi = createRouteMatcher([
  "/api/ask(.*)",
  "/api/plan(.*)",
  "/api/ingest(.*)",
  "/api/tts(.*)",
  "/api/users(.*)",
  "/api/me(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedApi(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
