FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm build

EXPOSE 3001
CMD ["node", "dist/index.js"]
