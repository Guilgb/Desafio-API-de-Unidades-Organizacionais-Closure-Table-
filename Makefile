.PHONY: help install dev stop logs clean test test-e2e build migrate

help: ## Mostra esta mensagem de ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências
	npm install

dev: ## Inicia ambiente de desenvolvimento (Docker + App)
	docker-compose up -d
	npm run start:dev

stop: ## Para todos os containers
	docker-compose down

logs: ## Mostra logs dos containers
	docker-compose logs -f

clean: ## Remove containers e volumes
	docker-compose down -v
	rm -rf node_modules dist coverage logs

test: ## Executa testes unitários
	npm test

test-watch: ## Executa testes unitários em modo watch
	npm run test:watch

test-cov: ## Executa testes unitários com cobertura
	npm run test:cov

test-e2e: ## Executa testes de integração
	npm run test:e2e

test-e2e-ci: ## Executa testes E2E com DB isolado (CI)
	npm run test:e2e:ci

build: ## Build da aplicação
	npm run build

migrate: ## Executa migrations no banco de desenvolvimento
	npm run migration:run

migrate-test: ## Executa migrations no banco de testes
	npm run migration:run:test

lint: ## Executa linter
	npm run lint

format: ## Formata código
	npm run format

# Observability
jaeger: ## Abre Jaeger UI no navegador
	@echo "Abrindo Jaeger UI em http://localhost:16686"
	@open http://localhost:16686 || xdg-open http://localhost:16686 || echo "Acesse: http://localhost:16686"

prometheus: ## Abre Prometheus UI no navegador
	@echo "Abrindo Prometheus em http://localhost:9090"
	@open http://localhost:9090 || xdg-open http://localhost:9090 || echo "Acesse: http://localhost:9090"

kibana: ## Abre Kibana no navegador
	@echo "Abrindo Kibana em http://localhost:5601"
	@open http://localhost:5601 || xdg-open http://localhost:5601 || echo "Acesse: http://localhost:5601"

metrics: ## Mostra métricas da aplicação
	@curl -s http://localhost:3000/metrics | head -n 50

swagger: ## Abre documentação Swagger no navegador
	@echo "Abrindo Swagger UI em http://localhost:3000/api"
	@open http://localhost:3000/api || xdg-open http://localhost:3000/api || echo "Acesse: http://localhost:3000/api"

# Docker helpers
docker-build: ## Build da imagem Docker
	docker-compose build

docker-up: ## Sobe todos os serviços
	docker-compose up -d

docker-ps: ## Lista containers rodando
	docker-compose ps

docker-logs-app: ## Logs da aplicação
	docker-compose logs -f app

docker-logs-db: ## Logs do PostgreSQL
	docker-compose logs -f challenge_db

docker-logs-jaeger: ## Logs do Jaeger
	docker-compose logs -f jaeger

docker-logs-prometheus: ## Logs do Prometheus
	docker-compose logs -f prometheus

docker-restart: ## Reinicia todos os serviços
	docker-compose restart

# Development helpers
shell: ## Abre shell no container da aplicação
	docker-compose exec app sh

db-shell: ## Abre shell no PostgreSQL
	docker-compose exec challenge_db psql -U postgres -d challenge_db

db-reset: ## Reseta o banco de dados (CUIDADO!)
	docker-compose down -v
	docker-compose up -d challenge_db
	sleep 5
	npm run migration:run
