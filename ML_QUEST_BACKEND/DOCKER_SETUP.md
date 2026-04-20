# Docker Setup Guide for ML Quest Backend

## Overview
The backend services now run in Docker containers for consistency and ease of deployment:
- **judge-worker**: Handles DSA code execution (Go, Python, Java, C++, JavaScript)
- **ml-worker**: Handles ML model training and evaluation
- **postgres**: PostgreSQL database
- **redis**: Redis cache and message queue

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Node.js and npm (for local development)

### Start All Services
```bash
# Navigate to infrastructure/docker directory
cd ML_QUEST_BACKEND/infrastructure/docker

# Start all containers (including workers)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f judge-worker
docker-compose logs -f ml-worker
```

### Stop Services
```bash
docker-compose down
```

### Rebuild Services
```bash
# Rebuild judge-worker
docker-compose up -d --build judge-worker

# Rebuild ml-worker
docker-compose up -d --build ml-worker

# Rebuild all
docker-compose up -d --build
```

## Environment Configuration

### Docker Environment Variables
Services automatically use the following when running in Docker:

```env
DB_HOST=postgres          # PostgreSQL container
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=redis          # Redis container
REDIS_PORT=6379
```

### Local vs Docker
- **Local Development**: Edit `.env` with localhost connections
- **Docker Deployment**: Use `.env.docker` with container hostnames

## Database Setup

### Automatic Initialization
The `init-db.sql` file is automatically executed when postgres container starts.

### Connect to Database
```bash
# From host machine
psql -h localhost -U postgres -d ml_quest_submissions

# From inside postgres container
docker exec -it lc_postgres psql -U postgres -d ml_quest_submissions
```

## Worker Monitoring

### View Worker Logs
```bash
# Judge worker (DSA code execution)
docker logs -f judge_worker

# ML worker (ML model evaluation)
docker logs -f ml_worker

# Follow logs in real-time
docker-compose logs -f judge-worker ml-worker
```

### Worker Health Checks
Workers connect to Redis and PostgreSQL on startup. Check logs for connection issues:
```bash
docker logs judge_worker | grep -i "error\|fail"
```

## Troubleshooting

### Workers Keep Restarting
1. Check Docker logs: `docker logs judge_worker`
2. Verify Redis/PostgreSQL are running: `docker ps`
3. Check environment variables in docker-compose.yml

### Can't Connect to Database
1. Ensure postgres container is healthy: `docker ps` (check STATUS column)
2. Verify DB_HOST is set to `postgres` (not localhost)
3. Check credentials match in .env

### Code Compilation Failures
Writers need language compilers installed. Check Dockerfile for:
- Go: ✓ Installed
- Python: ✓ Installed  
- Java: ✓ Installed (OpenJDK)
- C++: ✓ Installed (g++/gcc)
- JavaScript: ✓ Node.js included

## Network
All containers run on the `leetcode_network` Docker network, allowing them to communicate using container names as hostnames.

## Files Changed
- [.env](../.env) - Updated for Docker connections
- [.env.docker](../.env.docker) - Docker-specific config
- [services/auth-service/src/index.ts](../services/auth-service/src/index.ts) - Standardized DB vars
- [services/submission-service/src/index.ts](../services/submission-service/src/index.ts) - Fixed DB name var
- [infrastructure/docker/docker-compose.yml](./docker-compose.yml) - Added judge-worker and ml-worker
- [infrastructure/docker/judge-images/Dockerfile](./judge-images/Dockerfile) - Judge worker image
- [infrastructure/docker/judge-images/Dockerfile.ml](./judge-images/Dockerfile.ml) - ML worker image
