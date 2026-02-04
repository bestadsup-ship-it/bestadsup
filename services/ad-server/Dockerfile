FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/ad-server/package*.json ./services/ad-server/

# Install dependencies
RUN npm ci --workspace=packages/shared --workspace=services/ad-server

# Copy source
COPY packages/shared ./packages/shared
COPY services/ad-server ./services/ad-server

# Build
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/ad-server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/ad-server/package*.json ./services/ad-server/

# Install production dependencies only
RUN npm ci --workspace=packages/shared --workspace=services/ad-server --production

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/ad-server/dist ./services/ad-server/dist

# Set environment
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "services/ad-server/dist/index.js"]
