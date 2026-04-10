FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY . .

EXPOSE 4000
CMD ["bun", "run", "src/index.ts"]
