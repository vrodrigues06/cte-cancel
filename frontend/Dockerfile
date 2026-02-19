FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.json next.config.ts ./
COPY tailwind.config.ts postcss.config.js ./
COPY styles ./styles
COPY app ./app
COPY components ./components

RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
