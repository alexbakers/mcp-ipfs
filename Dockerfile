# ---- Builder Stage ----
# Use specific Node.js Alpine version
FROM node:22-alpine AS builder

WORKDIR /app

# Copy application dependency manifests
COPY package*.json ./

# Install dependencies using clean install
# Cache dependencies using build mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the project
RUN npm run build

# ---- Release Stage ----
# Use the same specific Node.js Alpine version
FROM node:22-alpine AS release

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built code and necessary package files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies using clean install
# Cache dependencies using build mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# Run as non-root user
USER node

# Set the entry point to run the application
ENTRYPOINT ["node", "dist/index.js"] 