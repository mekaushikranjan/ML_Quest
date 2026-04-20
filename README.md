# ML Quest

A full-stack machine learning competitive programming platform built with TypeScript, Next.js, and Node.js microservices.

## Project Structure

```
ML_Quest/
├── ML_QUEST_BACKEND/          # Backend microservices (Node.js/TypeScript)
│   ├── services/              # Core services
│   │   ├── auth-service/      # Authentication (Port 3001)
│   │   ├── problems-service/  # Problems management (Port 3002)
│   │   ├── submission-service/# Submission handling (Port 3003)
│   │   └── analysis-service/  # Analysis/ML operations (Port 3004)
│   ├── shared/                # Shared utilities and types
│   └── infrastructure/        # Docker & deployment configs
│
├── ML_QUEST_FRONTEND/         # Frontend (Next.js/React)
│   ├── src/
│   │   ├── app/               # App routes
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   ├── store/             # State management (Zustand)
│   │   └── types/             # TypeScript types
│   └── public/                # Static assets
│
└── infrastructure/            # Docker configurations
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand
- **Backend**: Node.js, TypeScript, Express, Fastify
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- Python 3.x (for ML services)

## Getting Started

### 1. Install Dependencies

```bash
# Backend dependencies
cd ML_QUEST_BACKEND
npm install

# Frontend dependencies
cd ../ML_QUEST_FRONTEND
npm install
```

### 2. Set Up Environment Variables

Create `.env` file in `ML_QUEST_BACKEND/`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/mlquest
REDIS_URL=redis://localhost:6379
```

### 3. Start Docker Containers

```bash
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml up -d
```

### 4. Run Development Servers

**Option A: Run all backend services at once**
```bash
cd ML_QUEST_BACKEND
npm run dev:all
```

This starts:
- Auth Service on Port 3001
- Problems Service on Port 3002
- Submission Service on Port 3003
- Analysis Service on Port 3004

**Option B: Run frontend only** (in a new terminal)
```bash
cd ML_QUEST_FRONTEND
npm run dev
```

Frontend runs on `http://localhost:3000`

### 5. Access the Application

Open your browser and navigate to:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend Services**: Available on ports 3001-3004

## Available Scripts

### Backend (ML_QUEST_BACKEND/)
```bash
npm run dev:all      # Start all services concurrently
npm run docker:up    # Start Docker containers
npm run docker:down  # Stop Docker containers
npm run docker:logs  # View Docker logs
```

### Frontend (ML_QUEST_FRONTEND/)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Docker Management

```bash
# Start all Docker containers
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml up -d

# View logs
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml logs -f

# Stop containers
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml down
```

## Service Details

### Auth Service (Port 3001)
- Handles user authentication and authorization
- JWT token management

### Problems Service (Port 3002)
- Manages coding problem definitions
- Problem metadata and constraints

### Submission Service (Port 3003)
- Handles code submissions
- Execution and evaluation
- ML model submissions

### Analysis Service (Port 3004)
- Provides analysis on submissions
- ML model evaluation
- Performance metrics

## Development Notes

- Services use TypeScript with ts-node-dev for hot reloading
- Frontend uses Turbopack for fast builds
- All services connect to shared Redis and PostgreSQL instances
- Frontend uses React Query for data fetching and state management

## Troubleshooting

**Port Already in Use**
```bash
# Kill process on specific port (e.g., 5432)
lsof -ti:5432 | xargs kill -9
```

**Docker Issues**
```bash
# Rebuild containers
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml down
docker compose -f ML_QUEST_BACKEND/infrastructure/docker/docker-compose.yml up -d --build
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

ISC
