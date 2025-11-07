import { z } from 'zod';
import { ToolDefinition, ToolCapabilityInfo, ToolRegistrationDescription } from './types.js';

// === SWITCH DATABASE ===
const switchDatabaseCapability: ToolCapabilityInfo = {
  description: 'Switch active database context for RAG memory operations',
  parameters: {
    type: 'object',
    properties: {
      databaseName: { type: 'string', description: 'Name of database to switch to' }
    },
    required: ['databaseName'],
  },
};

const switchDatabaseDescription: ToolRegistrationDescription = () =>
  `Switch to a different database on the same PostgreSQL server. Closes current connection and reconnects to specified database.
Use to switch between isolated RAG memory contexts (e.g., project_a_memory, client_x_memory).
Params: databaseName
Ex: {"databaseName":"project_a_memory"}`;

const switchDatabaseSchema: z.ZodRawShape = {
  databaseName: z.string().describe('Name of database to switch to'),
};

export const switchDatabaseTool: ToolDefinition = {
  capability: switchDatabaseCapability,
  description: switchDatabaseDescription,
  schema: switchDatabaseSchema,
};

// === GET CURRENT DATABASE ===
const getCurrentDatabaseCapability: ToolCapabilityInfo = {
  description: 'Get currently active database name',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

const getCurrentDatabaseDescription: ToolRegistrationDescription = () =>
  `Get the name of the currently active database.
Params: none
Ex: {}`;

const getCurrentDatabaseSchema: z.ZodRawShape = {};

export const getCurrentDatabaseTool: ToolDefinition = {
  capability: getCurrentDatabaseCapability,
  description: getCurrentDatabaseDescription,
  schema: getCurrentDatabaseSchema,
};

// === LIST DATABASES ===
const listDatabasesCapability: ToolCapabilityInfo = {
  description: 'List all available databases on the server',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

const listDatabasesDescription: ToolRegistrationDescription = () =>
  `List all available databases on the PostgreSQL server (excludes template databases).
Useful for discovering available RAG memory contexts before switching.
Params: none
Ex: {}`;

const listDatabasesSchema: z.ZodRawShape = {};

export const listDatabasesTool: ToolDefinition = {
  capability: listDatabasesCapability,
  description: listDatabasesDescription,
  schema: listDatabasesSchema,
};

// Export all database tools
export const databaseTools = {
  switchDatabase: switchDatabaseTool,
  getCurrentDatabase: getCurrentDatabaseTool,
  listDatabases: listDatabasesTool,
};
