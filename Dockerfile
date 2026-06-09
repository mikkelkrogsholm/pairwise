# Bun 1.3+ is required for the built-in image API (Bun.Image) used to convert
# uploaded images to WebP. Debian-slim keeps native image support reliable.
# ── deps ──────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-slim AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production --no-save

# ── runtime ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/pairwise.db

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY public ./public

# Persist the SQLite database and uploaded media here.
RUN mkdir -p /app/data/media
VOLUME ["/app/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "src/index.ts"]
