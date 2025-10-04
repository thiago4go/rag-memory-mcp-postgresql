#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Global state
let ragKgManager: any = null;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let toolsCache: any[] | null = null;

// Lazy initialization - defers ALL heavy imports
async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;
  
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  
  initializationPromise = (async () => {
    // Import the original RAG manager class
    const originalModule = await import('./index-original-backup.js');
    
    // Create instance using the same configuration logic
    const { ConfigManager } = await import('./src/database/config-manager.js');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const configManager = new ConfigManager();
    let dbConfig: any;
    
    const dbType = process.env.DB_TYPE?.toLowerCase();
    
    if (dbType && dbType !== 'sqlite') {
      try {
        dbConfig = configManager.loadFromEnvironment();
      } catch (error) {
        dbConfig = createSQLiteFallbackConfig();
      }
    } else {
      dbConfig = createSQLiteFallbackConfig();
    }
    
    function createSQLiteFallbackConfig() {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const defaultDbPath = path.join(__dirname, 'rag-knowledge-graph.db');
      const DB_FILE_PATH = process.env.SQLITE_DB_PATH 
        ? (path.isAbsolute(process.env.SQLITE_DB_PATH) 
            ? process.env.SQLITE_DB_PATH 
            : path.join(__dirname, process.env.SQLITE_DB_PATH))
        : defaultDbPath;
      
      return {
        type: 'sqlite',
        sqlite: {
          filePath: DB_FILE_PATH
        }
      };
    }
    
    // Create and initialize the RAG manager
    ragKgManager = new originalModule.RAGKnowledgeGraphManager(dbConfig);
    await ragKgManager.initialize();
    isInitialized = true;
  })();
  
  await initializationPromise;
}

// Lazy tools loading
async function getTools() {
  if (toolsCache) return toolsCache;
  
  const { getAllMCPTools } = await import('./src/tools/tool-registry.js');
  toolsCache = getAllMCPTools();
  return toolsCache;
}

// Create MCP server
const server = new Server(
  {
    name: "rag-memory-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler - lazy load tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await getTools();
  return { tools };
});

// Call tool handler - lazy initialization
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  // Ensure everything is initialized
  await ensureInitialized();
  
  // Import validation function
  const { validateToolArgs } = await import('./src/tools/tool-registry.js');

  try {
    const validatedArgs = validateToolArgs(name, args);

    // Execute the tool using the same logic as original
    switch (name) {
      case "createEntities":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.createEntities((validatedArgs as any).entities), null, 2) }] };
      case "createRelations":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.createRelations((validatedArgs as any).relations), null, 2) }] };
      case "addObservations":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.addObservations((validatedArgs as any).observations), null, 2) }] };
      case "deleteEntities":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.deleteEntities((validatedArgs as any).entityNames), null, 2) }] };
      case "deleteRelations":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.deleteRelations((validatedArgs as any).relations), null, 2) }] };
      case "deleteObservations":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.deleteObservations((validatedArgs as any).deletions), null, 2) }] };
      case "readGraph":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.readGraph(), null, 2) }] };
      case "searchNodes":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.searchNodes((validatedArgs as any).query, (validatedArgs as any).limit, (validatedArgs as any).nodeTypesToSearch), null, 2) }] };
      case "openNodes":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.openNodes((validatedArgs as any).names), null, 2) }] };
      case "getKnowledgeGraphStats":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.getKnowledgeGraphStats(), null, 2) }] };
      case "hybridSearch":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.hybridSearch((validatedArgs as any).query, (validatedArgs as any).limit, (validatedArgs as any).useGraph), null, 2) }] };
      case "getDetailedContext":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.getDetailedContext((validatedArgs as any).chunkId, (validatedArgs as any).includeSurrounding), null, 2) }] };
      case "storeDocument":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.storeDocument((validatedArgs as any).id, (validatedArgs as any).content, (validatedArgs as any).metadata, { maxTokens: (validatedArgs as any).maxTokens, overlap: (validatedArgs as any).overlap }), null, 2) }] };
      case "extractTerms":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.extractTerms((validatedArgs as any).documentId, { minLength: (validatedArgs as any).minLength, includeCapitalized: (validatedArgs as any).includeCapitalized, customPatterns: (validatedArgs as any).customPatterns }), null, 2) }] };
      case "linkEntitiesToDocument":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.linkEntitiesToDocument((validatedArgs as any).documentId, (validatedArgs as any).entityNames), null, 2) }] };
      case "deleteDocuments":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.deleteDocuments((validatedArgs as any).documentIds), null, 2) }] };
      case "listDocuments":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.listDocuments((validatedArgs as any).includeMetadata !== false), null, 2) }] };
      case "reEmbedEverything":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.reEmbedEverything(), null, 2) }] };
      case "getMigrationStatus":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.getMigrationStatus(), null, 2) }] };
      case "runMigrations":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.runMigrations(), null, 2) }] };
      case "rollbackMigration":
        return { content: [{ type: "text", text: JSON.stringify(await ragKgManager.rollbackMigration((validatedArgs as any).targetVersion), null, 2) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
    throw error;
  }
});

async function main() {
  try {
    // Start MCP server immediately - no imports, no initialization
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Cleanup on exit
    process.on('SIGINT', () => {
      if (isInitialized && ragKgManager) {
        ragKgManager.cleanup();
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  if (isInitialized && ragKgManager) {
    ragKgManager.cleanup();
  }
  process.exit(1);
});
