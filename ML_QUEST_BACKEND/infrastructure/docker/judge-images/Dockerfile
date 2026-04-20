FROM node:18-alpine

# Install all required compilers and runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    openjdk11 \
    g++ \
    gcc \
    make \
    go \
    bash \
    curl \
    git

# Set Go environment
ENV GOROOT=/usr/lib/go \
    GOPATH=/root/go \
    PATH=$PATH:/usr/lib/go/bin:/root/go/bin

# Create temp directory for code execution
RUN mkdir -p /tmp/ml-quest && chmod 777 /tmp/ml-quest

# Set working directory
WORKDIR /app

# Copy monorepo structure
COPY tsconfig.base.json ./
COPY shared ./shared
COPY services/submission-service ./services/submission-service

# Build shared first
WORKDIR /app/shared
RUN npm install && npm run build 2>/dev/null || true

# Prepare submission-service by replacing version reference
WORKDIR /app/services/submission-service
RUN sed -i 's/"@ml-quest\/shared": "\*"/"@ml-quest\/shared": "file:..\/..\/shared"/g' package.json

# Install dependencies (now using local shared)
RUN npm install

# Final working directory
WORKDIR /app/services/submission-service

# Set environment
ENV NODE_ENV=production

# Run the judge worker (using ts-node-dev with transpile-only)
CMD ["npm", "run", "worker"]
