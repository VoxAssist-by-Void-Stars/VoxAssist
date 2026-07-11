# Optional container image for local smoke tests or DO Dockerfile-based deploys.
# Build:  docker build -f deploy/Dockerfile -t voxassist \
#           --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
#           --build-arg USE_MOCK_AI=false \
#           --build-arg AI_FALLBACK_TO_MOCK=true .
# Run:    docker run --rm -p 3000:3000 --env-file .env voxassist

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
ARG USE_MOCK_AI=false
ARG AI_FALLBACK_TO_MOCK=true
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV USE_MOCK_AI=$USE_MOCK_AI
ENV AI_FALLBACK_TO_MOCK=$AI_FALLBACK_TO_MOCK
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output includes a minimal server + traced deps
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
