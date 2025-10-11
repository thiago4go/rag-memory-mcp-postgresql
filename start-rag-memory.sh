#!/bin/bash
export MCP_SILENT=true
export DB_TYPE=postgresql
export PG_HOST=localhost
export PG_PORT=5432
export PG_USERNAME=postgres
export PG_PASSWORD=pgvector2025
export PG_DATABASE=vdq-postgres-db
export PG_SSL=false
export TRANSFORMERS_VERBOSITY=error

exec node /home/ubuntu/rag-memory-mcp-postgresql/dist/index.js
