#!/bin/bash

# ML Quest Backend Docker Management Script
# Usage: ./docker-manage.sh [command] [options]

set -e

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/infrastructure/docker" && pwd)"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}===== $1 =====${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

show_help() {
    cat << EOF
ML Quest Backend Docker Management

Usage: ./docker-manage.sh [command] [options]

Commands:
  up                    Start all services
  down                  Stop all services
  restart               Restart all services
  rebuild               Rebuild and start all services
  logs [service]        View logs (judge-worker, ml-worker, postgres, redis, or all)
  ps                    Show status of all containers
  clean                 Remove containers and volumes
  db-connect            Connect to PostgreSQL database
  judge-logs            View judge-worker logs
  ml-logs              View ml-worker logs
  test-go              Test Go compiler in judge-worker
  test-python          Test Python in judge-worker
  health-check         Check container health
  help                 Show this help message

Examples:
  ./docker-manage.sh up
  ./docker-manage.sh logs judge-worker
  ./docker-manage.sh rebuild
  ./docker-manage.sh db-connect
EOF
}

cmd_up() {
    print_header "Starting ML Quest Backend Services"
    cd "$DOCKER_DIR"
    docker-compose up -d
    print_success "Services started"
    sleep 2
    cmd_ps
}

cmd_down() {
    print_header "Stopping ML Quest Backend Services"
    cd "$DOCKER_DIR"
    docker-compose down
    print_success "Services stopped"
}

cmd_restart() {
    print_header "Restarting ML Quest Backend Services"
    cmd_down
    sleep 1
    cmd_up
}

cmd_rebuild() {
    print_header "Rebuilding ML Quest Backend Services"
    cd "$DOCKER_DIR"
    docker-compose up -d --build
    print_success "Services rebuilt and started"
    sleep 2
    cmd_ps
}

cmd_logs() {
    local service=$1
    if [ -z "$service" ]; then
        service="all"
    fi
    
    print_header "Showing logs for $service"
    cd "$DOCKER_DIR"
    
    if [ "$service" = "all" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

cmd_ps() {
    print_header "Container Status"
    cd "$DOCKER_DIR"
    docker-compose ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

cmd_clean() {
    print_warning "This will remove all containers and volumes. Continue? (y/N)"
    read -r response
    if [ "$response" = "y" ]; then
        print_header "Cleaning up Docker resources"
        cd "$DOCKER_DIR"
        docker-compose down -v
        print_success "Cleanup complete"
    fi
}

cmd_db_connect() {
    print_header "Connecting to PostgreSQL"
    docker exec -it lc_postgres psql -U postgres -d ml_quest_submissions
}

cmd_judge_logs() {
    print_header "Judge Worker Logs"
    cd "$DOCKER_DIR"
    docker-compose logs -f judge-worker
}

cmd_ml_logs() {
    print_header "ML Worker Logs"
    cd "$DOCKER_DIR"
    docker-compose logs -f ml-worker
}

cmd_test_go() {
    print_header "Testing Go compiler in judge-worker"
    cd "$DOCKER_DIR"
    docker exec judge_worker go version
    print_success "Go is available"
}

cmd_test_python() {
    print_header "Testing Python in judge-worker"
    cd "$DOCKER_DIR"
    docker exec judge_worker python3 --version
    print_success "Python is available"
}

cmd_health_check() {
    print_header "Health Check"
    cd "$DOCKER_DIR"
    
    echo "Checking Redis..."
    if docker exec lc_redis redis-cli ping | grep -q PONG; then
        print_success "Redis is responding"
    else
        print_error "Redis not responding"
    fi
    
    echo "Checking PostgreSQL..."
    if docker exec lc_postgres pg_isready -U postgres | grep -q accepting; then
        print_success "PostgreSQL is responding"
    else
        print_error "PostgreSQL not responding"
    fi
    
    echo "Checking Judge Worker..."
    if docker ps | grep -q "judge_worker.*Up"; then
        print_success "Judge worker is running"
    else
        print_error "Judge worker not running"
    fi
    
    echo "Checking ML Worker..."
    if docker ps | grep -q "ml_worker.*Up"; then
        print_success "ML worker is running"
    else
        print_error "ML worker not running"
    fi
}

# Main
case "${1:-help}" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    rebuild)
        cmd_rebuild
        ;;
    logs)
        cmd_logs "$2"
        ;;
    ps)
        cmd_ps
        ;;
    clean)
        cmd_clean
        ;;
    db-connect)
        cmd_db_connect
        ;;
    judge-logs)
        cmd_judge_logs
        ;;
    ml-logs)
        cmd_ml_logs
        ;;
    test-go)
        cmd_test_go
        ;;
    test-python)
        cmd_test_python
        ;;
    health-check)
        cmd_health_check
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run './docker-manage.sh help' for usage"
        exit 1
        ;;
esac
