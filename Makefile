# Papa-Alpha RFP Analysis Demo - Development Operations
# Version: 1.0.0
#
# Services:
#   - Frontend (Next.js) - Runs locally on port 3000
#   - Worker (Python FastAPI) - Containerized on port 8000
#   - Redis - Containerized on port 6379
#   - Redis Commander - Containerized on port 8081
#   - Supabase - Managed via Supabase CLI
#
# ---------------------------------------------------------------------------
# Quick Start
# ---------------------------------------------------------------------------
#
# First time setup:
#   make setup          # Install dependencies and initialize environment
#
# Daily development:
#   make start          # Start all services
#   make stop           # Stop all services (preserves data)
#
# Clean slate:
#   make reset          # Remove all data and start fresh
#
# ---------------------------------------------------------------------------

.PHONY: help setup start stop restart logs health clean reset supabase-start supabase-stop supabase-reset frontend-dev worker-logs redis-logs worker-build worker-start worker-stop worker-restart worker-shell check-ports

# Colors
BLUE := \033[34m
GREEN := \033[32m
RED := \033[31m
YELLOW := \033[33m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Help: Show available commands
# ---------------------------------------------------------------------------
help:
	@echo "$(BLUE)Papa-Alpha RFP Analysis Demo - Available Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Setup & Initialization:$(RESET)"
	@echo "  make setup              - First-time setup (install deps, init env)"
	@echo "  make check-ports        - Check if required ports are available"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make start              - Start all services (Supabase + Docker + Frontend)"
	@echo "  make stop               - Stop all services (preserves data)"
	@echo "  make restart            - Restart all services"
	@echo "  make reset              - Clean slate (removes all data)"
	@echo ""
	@echo "$(GREEN)Individual Services:$(RESET)"
	@echo "  make supabase-start     - Start Supabase only"
	@echo "  make supabase-stop      - Stop Supabase only"
	@echo "  make supabase-reset     - Reset Supabase database"
	@echo "  make docker-up          - Start Docker services only (worker + redis)"
	@echo "  make docker-down        - Stop Docker services only"
	@echo "  make frontend-dev       - Start frontend dev server only"
	@echo ""
	@echo "$(GREEN)Monitoring:$(RESET)"
	@echo "  make health             - Check service health"
	@echo "  make logs               - View all Docker logs"
	@echo "  make worker-logs        - View worker logs"
	@echo "  make worker-build       - Rebuild worker Docker image"
	@echo "  make worker-start       - Start worker only"
	@echo "  make worker-stop        - Stop worker only"
	@echo "  make worker-restart     - Rebuild and restart worker"
	@echo "  make worker-shell       - Open shell in worker container"
	@echo "  make redis-logs         - View Redis logs"
	@echo "  make redis-ui           - Open Redis Commander in browser"
	@echo ""
	@echo "$(GREEN)Cleanup:$(RESET)"
	@echo "  make clean              - Remove containers (preserves data)"
	@echo "  make reset              - Remove everything including data"

# ---------------------------------------------------------------------------
# Setup: First-time initialization
# ---------------------------------------------------------------------------
setup:
	@echo "$(BLUE)Setting up Papa-Alpha development environment...$(RESET)"
	@echo ""
	@echo "$(BLUE)1. Checking prerequisites...$(RESET)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Error: Docker not installed$(RESET)"; exit 1; }
	@command -v supabase >/dev/null 2>&1 || { echo "$(RED)Error: Supabase CLI not installed. Run: brew install supabase/tap/supabase$(RESET)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Error: Node.js not installed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Prerequisites installed$(RESET)"
	@echo ""
	@echo "$(BLUE)2. Creating environment files...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.example .env && \
		echo "$(GREEN)✓ Created .env from .env.example$(RESET)"; \
		echo "$(YELLOW)⚠ Please update .env with your API keys$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ .env already exists, skipping$(RESET)"; \
	fi
	@echo ""
	@echo "$(BLUE)3. Installing frontend dependencies...$(RESET)"
	@cd frontend && npm install && echo "$(GREEN)✓ Frontend dependencies installed$(RESET)"
	@echo ""
	@echo "$(BLUE)4. Initializing Supabase...$(RESET)"
	@if [ ! -d supabase ]; then \
		supabase init && \
		echo "$(GREEN)✓ Supabase initialized$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ Supabase already initialized, skipping$(RESET)"; \
	fi
	@echo ""
	@echo "$(BLUE)5. Creating uploads directory...$(RESET)"
	@mkdir -p uploads && touch uploads/.gitkeep && echo "$(GREEN)✓ Uploads directory created$(RESET)"
	@echo ""
	@echo "$(GREEN)Setup complete! Next steps:$(RESET)"
	@echo "  1. Update .env with your API keys (ANTHROPIC_API_KEY or OPENAI_API_KEY)"
	@echo "  2. Run 'make start' to start all services"

# ---------------------------------------------------------------------------
# Check Ports: Verify required ports are available
# ---------------------------------------------------------------------------
check-ports:
	@echo "$(BLUE)Checking required ports...$(RESET)"
	@for port in 3000 8000 6379 8081 54321 54322 54323; do \
		if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
			echo "$(RED)✗ Port $$port is in use$(RESET)"; \
		else \
			echo "$(GREEN)✓ Port $$port is available$(RESET)"; \
		fi \
	done

# ---------------------------------------------------------------------------
# Start: Start all services
# ---------------------------------------------------------------------------
start: check-ports
	@echo "$(BLUE)Starting Papa-Alpha services...$(RESET)"
	@echo ""
	@echo "$(BLUE)1. Starting Supabase...$(RESET)"
	@$(MAKE) supabase-start
	@echo ""
	@echo "$(BLUE)2. Starting Docker services (worker + redis)...$(RESET)"
	@$(MAKE) docker-up
	@echo ""
	@echo "$(BLUE)3. Starting frontend...$(RESET)"
	@echo "$(YELLOW)Frontend will run in foreground. Press Ctrl+C to stop.$(RESET)"
	@echo "$(YELLOW)To run in background, use: make frontend-dev &$(RESET)"
	@echo ""
	@cd frontend && npm run dev

# ---------------------------------------------------------------------------
# Stop: Stop all services (preserves data)
# ---------------------------------------------------------------------------
stop:
	@echo "$(BLUE)Stopping all services...$(RESET)"
	@docker compose down
	@supabase stop
	@echo "$(GREEN)All services stopped. Data preserved.$(RESET)"

# ---------------------------------------------------------------------------
# Restart: Restart all services
# ---------------------------------------------------------------------------
restart: stop start

# ---------------------------------------------------------------------------
# Supabase Commands
# ---------------------------------------------------------------------------
supabase-start:
	@echo "$(BLUE)Starting Supabase...$(RESET)"
	@supabase start
	@echo "$(GREEN)Supabase started$(RESET)"
	@echo "$(YELLOW)Copy the API keys from above to your .env file$(RESET)"

supabase-stop:
	@echo "$(BLUE)Stopping Supabase...$(RESET)"
	@supabase stop
	@echo "$(GREEN)Supabase stopped$(RESET)"

supabase-reset:
	@echo "$(RED)⚠ This will delete all Supabase data!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		supabase db reset && \
		echo "$(GREEN)Supabase database reset$(RESET)"; \
	else \
		echo "$(BLUE)Cancelled$(RESET)"; \
	fi

# ---------------------------------------------------------------------------
# Docker Commands
# ---------------------------------------------------------------------------
docker-up:
	@echo "$(BLUE)Starting Docker services...$(RESET)"
	@docker compose up -d
	@sleep 3
	@$(MAKE) health

docker-down:
	@echo "$(BLUE)Stopping Docker services...$(RESET)"
	@docker compose down
	@echo "$(GREEN)Docker services stopped$(RESET)"

# ---------------------------------------------------------------------------
# Frontend Commands
# ---------------------------------------------------------------------------
frontend-dev:
	@echo "$(BLUE)Starting frontend dev server...$(RESET)"
	@cd frontend && npm run dev

# ---------------------------------------------------------------------------
# Monitoring Commands
# ---------------------------------------------------------------------------
health:
	@echo "$(BLUE)Service Health Status:$(RESET)"
	@echo ""
	@echo "$(BLUE)Docker Services:$(RESET)"
	@docker compose ps
	@echo ""
	@echo "$(BLUE)Worker Health:$(RESET)"
	@curl -s http://localhost:8000/health 2>/dev/null && echo "$(GREEN)✓ Worker healthy$(RESET)" || echo "$(RED)✗ Worker unhealthy$(RESET)"
	@echo ""
	@echo "$(BLUE)Redis Health:$(RESET)"
	@docker compose exec redis redis-cli ping 2>/dev/null && echo "$(GREEN)✓ Redis healthy$(RESET)" || echo "$(RED)✗ Redis unhealthy$(RESET)"
	@echo ""
	@echo "$(BLUE)Supabase:$(RESET)"
	@curl -s http://localhost:54321/health 2>/dev/null && echo "$(GREEN)✓ Supabase healthy$(RESET)" || echo "$(YELLOW)⚠ Supabase may not be running$(RESET)"

logs:
	@docker compose logs -f

worker-logs:
	@docker compose logs -f worker

redis-logs:
	@docker compose logs -f redis

redis-ui:
	@echo "$(BLUE)Opening Redis Commander...$(RESET)"
	@open http://localhost:8081 || echo "$(YELLOW)Open http://localhost:8081 in your browser$(RESET)"

# ---------------------------------------------------------------------------
# Worker Commands
# ---------------------------------------------------------------------------
worker-build:
	@echo "$(BLUE)Building worker Docker image...$(RESET)"
	@docker compose build worker
	@echo "$(GREEN)Worker image built$(RESET)"

worker-start:
	@echo "$(BLUE)Starting worker...$(RESET)"
	@docker compose up -d worker
	@echo "$(GREEN)Worker started$(RESET)"
	@echo "$(YELLOW)View logs: make worker-logs$(RESET)"

worker-stop:
	@echo "$(BLUE)Stopping worker...$(RESET)"
	@docker compose stop worker
	@echo "$(GREEN)Worker stopped$(RESET)"

worker-restart:
	@echo "$(BLUE)Rebuilding and restarting worker...$(RESET)"
	@docker compose down worker
	@docker compose build worker
	@docker compose up -d worker
	@echo "$(GREEN)Worker restarted$(RESET)"
	@echo "$(YELLOW)View logs: make worker-logs$(RESET)"

worker-shell:
	@echo "$(BLUE)Opening shell in worker container...$(RESET)"
	@docker compose exec worker /bin/bash || docker compose exec worker /bin/sh

# ---------------------------------------------------------------------------
# Cleanup Commands
# ---------------------------------------------------------------------------
clean:
	@echo "$(BLUE)Cleaning up containers (preserving data)...$(RESET)"
	@docker compose down
	@echo "$(GREEN)Cleanup complete. Data preserved.$(RESET)"

reset:
	@echo "$(RED)⚠ This will delete ALL data (Docker volumes + Supabase)!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Stopping services...$(RESET)"; \
		docker compose down -v; \
		supabase db reset; \
		rm -rf uploads/*.pdf; \
		echo "$(GREEN)Complete reset done$(RESET)"; \
	else \
		echo "$(BLUE)Reset cancelled$(RESET)"; \
	fi
