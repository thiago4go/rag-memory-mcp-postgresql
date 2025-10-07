#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { get_encoding } from 'tiktoken';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline, env } from '@huggingface/transformers';

// Import our structured tool system
import { getAllMCPTools, validateToolArgs, getSystemInfo } from './src/tools/tool-registry.js';

// Import migration system
import { MigrationManager } from './src/migrations/migration-manager.js';
import { migrations } from './src/migrations/migrations.js';
import { MultiDbMigrationManager } from './src/database/multi-db-migration-manager.js';
import { multiDbMigrations } from './src/database/multi-db-migrations.js';

// Import database abstraction layer
import { DatabaseFactory } from './src/database/database-factory.js';
import { ConfigManager } from './src/database/config-manager.js';
import { DatabaseAdapter, DatabaseConfig } from './src/database/interfaces.js';

// Configure Hugging Face transformers for better compatibility
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = './node_modules/@huggingface/transformers/dist/';
}

// Server configuration
const SERVER_NAME = "rag-memory-mcp";
const SERVER_VERSION = "1.0.3";

// Types for the RAG system
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

// RAG Knowledge Graph Manager class
class RAGKnowledgeGraphManager {
  private db: DatabaseAdapter;
  private embeddingModel: any;
  private tokenizer: any;
  private isInitialized = false;

  constructor(db: DatabaseAdapter, embeddingModel: any, tokenizer: any) {
    this.db = db;
    this.embeddingModel = embeddingModel;
    this.tokenizer = tokenizer;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    // Initialization logic would go here
    this.isInitialized = true;
  }

  // Tool implementations
  async createEntities(entities: Entity[]): Promise<any> {
    await this.initialize();
    return await this.db.createEntities(entities);
  }

  async createRelations(relations: Relation[]): Promise<any> {
    await this.initialize();
    return await this.db.createRelations(relations);
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<any> {
    await this.initialize();
    return await this.db.addObservations(observations);
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    await this.initialize();
    await this.db.deleteEntities(entityNames);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    await this.initialize();
    await this.db.deleteObservations(deletions);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    await this.initialize();
    await this.db.deleteRelations(relations);
  }

  async readGraph(): Promise<any> {
    await this.initialize();
    return await this.db.readGraph();
  }

  async searchNodes(query: string, limit: number = 10): Promise<any> {
    await this.initialize();
    return await this.db.searchNodes(query, limit);
  }

  async openNodes(names: string[]): Promise<any> {
    await this.initialize();
    return await this.db.openNodes(names);
  }

  async storeDocument(id: string, content: string, metadata: any = {}): Promise<any> {
    await this.initialize();
    return await this.db.storeDocument(id, content, metadata);
  }

  async extractTerms(documentId: string, options: any = {}): Promise<any> {
    await this.initialize();
    return await this.db.extractTerms(documentId, options);
  }

  async linkEntitiesToDocument(documentId: string, entityNames: string[]): Promise<any> {
    await this.initialize();
    return await this.db.linkEntitiesToDocument(documentId, entityNames);
  }

  async hybridSearch(query: string, limit: number = 5, useGraph: boolean = true): Promise<any> {
    await this.initialize();
    return await this.db.hybridSearch(query, { limit, useGraph });
  }

  async getDetailedContext(chunkId: string, includeSurrounding: boolean = true): Promise<any> {
    await this.initialize();
    return await this.db.getDetailedContext(chunkId, includeSurrounding);
  }

  async getKnowledgeGraphStats(): Promise<any> {
    await this.initialize();
    return await this.db.getKnowledgeGraphStats();
  }

  async deleteDocuments(documentIds: string | string[]): Promise<any> {
    await this.initialize();
    return await this.db.deleteDocuments(documentIds);
  }

  async listDocuments(includeMetadata: boolean = true): Promise<any> {
    await this.initialize();
    return await this.db.listDocuments(includeMetadata);
  }

  async reEmbedEverything(): Promise<any> {
    await this.initialize();
    return await this.db.reEmbedEverything?.();
  }
}

// Global variables
let db: DatabaseAdapter;
let embeddingModel: any;
let tokenizer: any;
let ragKgManager: RAGKnowledgeGraphManager;

// Database configuration setup
const configManager = new ConfigManager();
let dbConfig: DatabaseConfig;

// Enhanced DB_TYPE environment variable handling
const dbType = process.env.DB_TYPE?.toLowerCase();

// Load database configuration
if (dbType && dbType !== 'sqlite') {
  try {
    dbConfig = configManager.loadFromEnvironment();
  } catch (error) {
    // Fallback to SQLite silently
    dbConfig = createSQLiteFallbackConfig();
  }
} else {
  dbConfig = createSQLiteFallbackConfig();
}

// Helper function to create SQLite fallback configuration
function createSQLiteFallbackConfig(): DatabaseConfig {
  const defaultDbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rag-memory.db');
  const DB_FILE_PATH = process.env.DB_FILE_PATH
    ? path.isAbsolute(process.env.DB_FILE_PATH)
      ? process.env.DB_FILE_PATH
      : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.DB_FILE_PATH)
    : defaultDbPath;
  
  return {
    type: 'sqlite',
    vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '384'),
    sqlite: {
      filePath: DB_FILE_PATH,
      enableWAL: process.env.SQLITE_ENABLE_WAL !== 'false',
      pragmas: {
        busy_timeout: parseInt(process.env.SQLITE_BUSY_TIMEOUT || '5000'),
        cache_size: parseInt(process.env.SQLITE_CACHE_SIZE || '-2000')
      }
    }
  };
}

// Initialize database and models
async function initializeServer(): Promise<void> {
  try {
    // Initialize database
    const factory = DatabaseFactory.getInstance();
    db = await factory.createAdapter(dbConfig);
    
    // Run migrations
    if (dbConfig.type === 'sqlite') {
      // For SQLite, we need to get the underlying database instance
      const sqliteAdapter = db as any;
      if (sqliteAdapter.db) {
        const migrationManager = new MigrationManager(sqliteAdapter.db);
        // Add migrations to the manager
        for (const migration of migrations) {
          migrationManager.addMigration(migration);
        }
        await migrationManager.runMigrations();
      }
    } else {
      const multiDbMigrationManager = new MultiDbMigrationManager(db);
      // Add migrations to the manager
      for (const migration of multiDbMigrations) {
        multiDbMigrationManager.addMigration(migration);
      }
      await multiDbMigrationManager.runMigrations();
    }
    
    // Initialize AI models
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    tokenizer = get_encoding('cl100k_base');
    
    // Initialize RAG manager
    ragKgManager = new RAGKnowledgeGraphManager(db, embeddingModel, tokenizer);
    
    if (process.env.MCP_DEBUG) {
      console.error('✅ Server initialization completed successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    throw error;
  }
}

// Create and configure the MCP server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Enhanced error handling wrapper
function handleToolError(error: unknown, toolName: string): never {
  console.error(`Error in tool ${toolName}:`, error);
  
  if (error instanceof McpError) {
    throw error;
  }
  
  if (error instanceof Error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Tool ${toolName} failed: ${error.message}`
    );
  }
  
  throw new McpError(
    ErrorCode.InternalError,
    `Tool ${toolName} failed with unknown error`
  );
}

// Lazy initialization state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;
  
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  
  initializationPromise = (async () => {
    await ragKgManager.initialize();
    isInitialized = true;
  })();
  
  await initializationPromise;
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const tools = getAllMCPTools();
    return { tools };
  } catch (error) {
    handleToolError(error, 'list_tools');
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new McpError(ErrorCode.InvalidParams, `No arguments provided for tool: ${name}`);
  }

  // Ensure RAG system is initialized before executing any tool
  await ensureInitialized();

  try {
    // Validate arguments using our structured schema
    const validatedArgs = validateToolArgs(name, args);
    
    let result: any;
    
    switch (name) {
      // Knowledge Graph tools
      case "createEntities":
        result = await ragKgManager.createEntities((validatedArgs as any).entities as Entity[]);
        break;
      case "createRelations":
        result = await ragKgManager.createRelations((validatedArgs as any).relations as Relation[]);
        break;
      case "addObservations":
        result = await ragKgManager.addObservations((validatedArgs as any).observations as { entityName: string; contents: string[] }[]);
        break;
      case "deleteEntities":
        await ragKgManager.deleteEntities((validatedArgs as any).entityNames as string[]);
        result = "Entities deleted successfully";
        break;
      case "deleteObservations":
        await ragKgManager.deleteObservations((validatedArgs as any).deletions as { entityName: string; observations: string[] }[]);
        result = "Observations deleted successfully";
        break;
      case "deleteRelations":
        await ragKgManager.deleteRelations((validatedArgs as any).relations as Relation[]);
        result = "Relations deleted successfully";
        break;
      case "readGraph":
        result = await ragKgManager.readGraph();
        break;
      case "searchNodes":
        result = await ragKgManager.searchNodes((validatedArgs as any).query as string, (validatedArgs as any).limit || 10);
        break;
      case "openNodes":
        result = await ragKgManager.openNodes((validatedArgs as any).names as string[]);
        break;
      
      // RAG tools
      case "storeDocument":
        result = await ragKgManager.storeDocument((validatedArgs as any).id as string, (validatedArgs as any).content as string, (validatedArgs as any).metadata || {});
        break;
      case "extractTerms":
        result = await ragKgManager.extractTerms((validatedArgs as any).documentId as string, { 
          minLength: (validatedArgs as any).minLength, 
          includeCapitalized: (validatedArgs as any).includeCapitalized, 
          customPatterns: (validatedArgs as any).customPatterns 
        });
        break;
      case "linkEntitiesToDocument":
        result = await ragKgManager.linkEntitiesToDocument((validatedArgs as any).documentId as string, (validatedArgs as any).entityNames as string[]);
        break;
      case "hybridSearch":
        const limit = typeof (validatedArgs as any).limit === 'number' ? (validatedArgs as any).limit : 5;
        const useGraph = (validatedArgs as any).useGraph !== false;
        result = await ragKgManager.hybridSearch((validatedArgs as any).query as string, limit, useGraph);
        break;
      case "getDetailedContext":
        result = await ragKgManager.getDetailedContext((validatedArgs as any).chunkId as string, (validatedArgs as any).includeSurrounding !== false);
        break;
      case "getKnowledgeGraphStats":
        result = await ragKgManager.getKnowledgeGraphStats();
        break;
      case "deleteDocuments":
        result = await ragKgManager.deleteDocuments((validatedArgs as any).documentIds as string | string[]);
        break;
      case "listDocuments":
        result = await ragKgManager.listDocuments((validatedArgs as any).includeMetadata !== false);
        break;
      case "reEmbedEverything":
        result = await ragKgManager.reEmbedEverything();
        break;
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Tool execution error for ${name}:`, error.message);
      throw new McpError(ErrorCode.InternalError, `Tool ${name} failed: ${error.message}`);
    }
    throw error;
  }
});

// Enhanced server startup with proper error handling
async function startServer(): Promise<void> {
  try {
    // Create transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport FIRST (before heavy initialization)
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  try {
    if (db) {
      await db.close();
    }
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    if (db) {
      await db.close();
    }
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  process.exit(1);
});
