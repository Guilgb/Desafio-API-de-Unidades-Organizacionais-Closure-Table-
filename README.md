# API de Unidades Organizacionais (Closure Table)

API CRUD para gestão de usuários e grupos organizacionais usando Closure Table no PostgreSQL.

## 🚀 Tecnologias

### Core

| Tecnologia | Descrição |
|------------|-----------|
| **NestJS 11** | Framework Node.js progressivo |
| **TypeORM** | ORM para TypeScript/JavaScript |
| **PostgreSQL** | Banco de dados relacional |
| **Swagger** | Documentação interativa da API |
| **Docker** | Containerização |

### Observabilidade

| Tecnologia | Descrição | Porta |
|------------|-----------|-------|
| **OpenTelemetry SDK** | Instrumentação de traces | - |
| **Jaeger** | Distributed tracing UI | 16686 |
| **Prometheus** | Coleta e armazenamento de métricas | 9090 |
| **Elasticsearch** | Armazenamento de logs | 9200 |
| **Kibana** | Visualização e análise de logs | 5601 |
| **Winston** | Logger estruturado (formato ECS) | - |
| **OpenTelemetry Collector** | Coleta e exporta telemetria | 4317/4318 |

### Padrões e Qualidade

| Tecnologia | Descrição |
|------------|-----------|
| **fp-ts** | Either/Result pattern para tratamento de erros |
| **class-validator** | Validação de DTOs |
| **class-transformer** | Transformação de objetos |
| **ESLint** | Linting de código |
| **Prettier** | Formatação de código |
| **Jest** | Testes unitários e de integração |

## 📋 Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- npm ou yarn

## 🔧 Instalação e Execução

### 1. Clone o repositório

```bash
git clone <repo-url>
cd Desafio-API-de-Unidades-Organizacionais-Closure-Table-
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.exemple` para `.env`:

```bash
cp .env.exemple .env
```

### 4. Suba o banco de dados

```bash
docker-compose up -d challenge_db
```

### 5. Execute as migrations

```bash
npm run migration:run
```

### 6. Inicie a aplicação

#### Modo desenvolvimento (local)

```bash
npm run start:dev
```

#### Modo desenvolvimento (Docker)

```bash
docker-compose up
```

A API estará disponível em `http://localhost:3000`

## 📚 Documentação da API

Acesse a documentação Swagger em: `http://localhost:3000/api`

## 🛣️ Rotas Principais

### Users

- **POST /users** - Cria um novo usuário
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

### Groups

- **POST /groups** - Cria um novo grupo
  ```json
  {
    "name": "Engineering Team",
    "parentId": "uuid-optional"
  }
  ```

### Associações

- **POST /users/:id/groups** - Associa um usuário a um grupo
  ```json
  {
    "groupId": "uuid-do-grupo"
  }
  ```

### Consultas

- **GET /users/:id/organizations** - Lista organizações do usuário (ordenado por depth)
- **GET /nodes/:id/ancestors** - Lista ancestrais do nó
- **GET /nodes/:id/descendants** - Lista descendentes do nó


## 🏗️ Arquitetura

### Closure Table

A implementação usa a técnica **Closure Table** para gerenciar hierarquias:

- Tabela `nodes`: armazena usuários e grupos
- Tabela `closure`: armazena todas as relações ancestral-descendente com profundidade

#### Regras implementadas:

1. **Self-link**: Todo nó tem um link para si mesmo com depth=0
2. **Prevenção de ciclos**: Verifica se criar uma aresta geraria um ciclo
3. **Propagação**: Ao criar aresta A→B, propaga todas combinações de ancestrais de A com descendentes de B
4. **Depth mínimo**: Mantém o menor depth para cada par (ancestral, descendente)

### Estrutura do Projeto

```
src/
├── modules/
│   └── organization/
│       ├── entities/          # NodeEntity, ClosureEntity
│       ├── dtos/              # Validação de entrada
│       ├── controllers/       # Rotas HTTP
│       ├── services/          # Lógica de negócio
│       └── repositories/      # Queries SQL otimizadas
└── shared/
    ├── filters/               # Exception handlers
    └── modules/
        ├── database/          # Configuração TypeORM
        └── winston/           # Logging ECS
```

## 📊 Observabilidade

A aplicação possui uma stack completa de observabilidade:

### 🔍 Distributed Tracing (Jaeger + OpenTelemetry)

- **OpenTelemetry SDK** configurado para exportar traces via OTLP
- **Jaeger** para visualização de traces distribuídos
- **Custom Spans** em todos os repositórios para rastrear operações de banco
- Acesse: `http://localhost:16686`

### 📈 Métricas (Prometheus)

- **Prometheus** coletando métricas da aplicação
- **Métricas customizadas**:
  - `users_created_total` - Counter de usuários criados (success/failure)
  - `groups_created_total` - Counter de grupos criados (success/failure)
  - `database_query_duration_seconds` - Histogram de duração de queries
  - `http_request_duration_seconds` - Histogram de duração de requests HTTP
  - `active_connections` - Gauge de conexões ativas
- Acesse: `http://localhost:9090`

### 📝 Logging (Elasticsearch + Kibana)

- **Winston** com formato ECS (Elastic Common Schema)
- **Elasticsearch** para armazenamento e busca de logs
- **Kibana** para visualização e análise
- **Query logging** via TypeORM Logger customizado
- **HTTP logging** com interceptor
- Logs salvos em `logs/` com rotação diária
- Acesse Kibana: `http://localhost:5601`

### 🐳 Stack de Observabilidade (Docker)

```bash
# Subir toda a stack de observabilidade
docker-compose up -d

# Serviços disponíveis:
# - API:           http://localhost:3000
# - Swagger:       http://localhost:3000/api
# - Jaeger:        http://localhost:16686
# - Prometheus:    http://localhost:9090
# - Kibana:        http://localhost:5601
# - Elasticsearch: http://localhost:9200
```

### 🛠️ DevContainer

O projeto inclui configuração de DevContainer para desenvolvimento consistente:

```bash
# Abra no VS Code com a extensão Remote - Containers
code .
# Use "Reopen in Container" (Ctrl+Shift+P)
```

## 🔒 Validações

- ✅ Email único para usuários
- ✅ Prevenção de ciclos na hierarquia
- ✅ Validação de tipos (USER vs GROUP)
- ✅ Erros padronizados (400/404/409/422)

## 📝 Scripts úteis

```bash
# Desenvolvimento
npm run start:dev          # Inicia em modo watch
npm run build              # Build de produção
npm run start:prod         # Executa build

# Migrations
npm run migration:generate # Gera migration
npm run migration:run      # Executa migrations
npm run migration:revert   # Reverte última migration

# Testes
npm run test              # Testes unitários
npm run test:e2e          # Testes e2e
npm run test:cov          # Coverage

# Code quality
npm run lint              # ESLint
npm run format            # Prettier
```

## 🐳 Docker

### Build e execução

```bash
# Subir todos os serviços
docker-compose up

# Rebuild
docker-compose up --build

# Parar serviços
docker-compose down

# Ver logs
docker-compose logs -f challange-service
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e não possui licença pública.

## ✨ Funcionalidades

### Core
- ✅ Modelagem com Closure Table (sem WITH RECURSIVE nas leituras)
- ✅ Todas as rotas especificadas
- ✅ Validação de ciclos
- ✅ Email único
- ✅ TypeORM com migrations
- ✅ Documentação Swagger
- ✅ Docker + Docker Compose
- ✅ Exception filters globais
- ✅ Validação com class-validator

### Observabilidade
- ✅ OpenTelemetry SDK com exportação OTLP
- ✅ Jaeger para distributed tracing
- ✅ Custom spans em repositórios (Users, Groups, Nodes)
- ✅ Prometheus para métricas
- ✅ Métricas customizadas (counters, histograms, gauges)
- ✅ Winston com formato ECS (Elastic Common Schema)
- ✅ Elasticsearch para armazenamento de logs
- ✅ Kibana para visualização de logs

### Desenvolvimento
- ✅ DevContainer configurado
- ✅ Either/Result pattern com fp-ts para tratamento de erros
- ✅ Testes unitários e de integração
- ✅ ESLint + Prettier configurados
