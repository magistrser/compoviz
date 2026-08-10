# ============================================
# Stage 1: Build
# ============================================
FROM node:22.12.0-alpine AS builder

WORKDIR /app

# Set Vercel analytics disabled for Docker builds
ENV VITE_DISABLE_VERCEL_ANALYTICS=true

# Install the pinned Yarn release and immutable dependency graph first.
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn install --immutable

# Copy source and build
COPY . .
RUN yarn build

# ============================================
# Stage 2: Production
# ============================================
FROM nginx:stable-alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Browser-only SPA configuration: no backend or websocket proxy routes.
COPY compose/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

RUN apk add --no-cache wget

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
