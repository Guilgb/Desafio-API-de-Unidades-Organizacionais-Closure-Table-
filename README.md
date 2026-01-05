# API de Unidades Organizacionais (Closure Table)

API CRUD para gestão de usuários e grupos organizacionais usando Closure Table no PostgreSQL.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **TypeORM** - ORM para TypeScript/JavaScript
- **PostgreSQL** - Banco de dados relacional
- **Winston** - Logger com formato ECS (Elastic Common Schema)
- **Swagger** - Documentação da API
- **Docker** - Containerização

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

## 🧪 Testes

### Executar testes externos (pytest)

1. Instale as dependências Python:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Defina a URL base:

```bash
export BASE_URL="http://localhost:3000"
```

3. Execute os testes:

```bash
# Testes de integração
pytest -v

# Testes de carga (Locust)
locust -f locustfile.py --headless -u 30 -r 5 -t 2m --host "$BASE_URL"
```

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

- **Logs JSON** no formato ECS (Elastic Common Schema)
- **Query logging** via TypeORM Logger customizado
- **HTTP logging** com interceptor
- Logs salvos em `logs/` com rotação diária

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

## ✨ Funcionalidades Implementadas

- ✅ Modelagem com Closure Table (sem WITH RECURSIVE nas leituras)
- ✅ Todas as rotas especificadas
- ✅ Validação de ciclos
- ✅ Email único
- ✅ Logs JSON ECS
- ✅ TypeORM com migrations
- ✅ Documentação Swagger
- ✅ Docker + Docker Compose
- ✅ Exception filters globais
- ✅ Validação com class-validator
