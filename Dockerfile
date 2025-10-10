# Multi-stage Dockerfile for Next.js 15 standalone on Yandex Cloud Serverless Containers

FROM node:22-slim AS deps
WORKDIR /app

# Install dependencies based on lockfile for reproducibility
COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Reuse installed deps layer
COPY --from=deps /app/node_modules ./node_modules
# Copy source
COPY . .

# Build standalone output (server.js inside .next/standalone)
RUN npm run build


FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy only the necessary runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER 1001

EXPOSE 8080

# Start the Next.js standalone server
CMD ["node", "server.js"]


