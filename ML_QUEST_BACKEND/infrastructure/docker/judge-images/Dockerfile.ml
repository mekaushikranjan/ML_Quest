FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML libraries
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    tensorflow \
    torch \
    matplotlib \
    seaborn \
    jupyter

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

# Run the ML worker (using ts-node-dev with transpile-only)
CMD ["npm", "run", "ml-worker"]
