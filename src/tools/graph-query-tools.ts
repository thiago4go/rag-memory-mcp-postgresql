import { z } from 'zod';
import { ToolDefinition, ToolCapabilityInfo, ToolRegistrationDescription } from './types.js';

// === SEARCH NODES ===
const searchNodesCapability: ToolCapabilityInfo = {
  description: 'Semantic search for entities and document chunks',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      nodeTypesToSearch: { type: 'array', description: 'Node types', items: { type: 'string' }, optional: true },
      limit: { type: 'number', description: 'Max results', optional: true }
    },
    required: ['query'],
  },
};

const searchNodesDescription: ToolRegistrationDescription = () =>
  `Semantic vector search for entities and/or document chunks using natural language queries.
CRITICAL: Use before createEntities to check for duplicates. Returns similarity scores.
Params: query, nodeTypesToSearch?["entity"|"documentChunk"], limit?
Ex: {"query":"machine learning concepts","nodeTypesToSearch":["entity"],"limit":10}`;

const searchNodesSchema: z.ZodRawShape = {
  query: z.string().describe('Natural language search query'),
  nodeTypesToSearch: z.array(z.enum(['entity', 'documentChunk'])).optional().describe('Types to search (default: both)'),
  limit: z.number().optional().describe('Max results (default: 10)'),
};

export const searchNodesTool: ToolDefinition = {
  capability: searchNodesCapability,
  description: searchNodesDescription,
  schema: searchNodesSchema,
};

// === OPEN NODES ===
const openNodesCapability: ToolCapabilityInfo = {
  description: 'Get entities with their relationships',
  parameters: {
    type: 'object',
    properties: { names: { type: 'array', description: 'Entity names', items: { type: 'string' } } },
    required: ['names'],
  },
};

const openNodesDescription: ToolRegistrationDescription = () =>
  `Retrieve specific entities with all observations and relationships (incoming and outgoing).
Use to explore entity details and connections in the knowledge graph.
Params: names[]
Ex: {"names":["React","JavaScript"]}`;

const openNodesSchema: z.ZodRawShape = {
  names: z.array(z.string()).describe('Entity names to retrieve'),
};

export const openNodesTool: ToolDefinition = {
  capability: openNodesCapability,
  description: openNodesDescription,
  schema: openNodesSchema,
};

// === READ GRAPH ===
const readGraphCapability: ToolCapabilityInfo = {
  description: 'Get complete knowledge graph structure',
  parameters: { type: 'object', properties: {}, required: [] },
};

const readGraphDescription: ToolRegistrationDescription = () =>
  `Get all entities and relationships in the knowledge graph. Use for full graph visualization or analysis.
WARNING: Can be large for extensive knowledge bases. Consider using searchNodes or openNodes for targeted queries.
Params: none
Ex: {}`;

const readGraphSchema: z.ZodRawShape = {};

export const readGraphTool: ToolDefinition = {
  capability: readGraphCapability,
  description: readGraphDescription,
  schema: readGraphSchema,
};

// === HYBRID SEARCH ===
const hybridSearchCapability: ToolCapabilityInfo = {
  description: 'Advanced search combining vector similarity and graph traversal',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results', optional: true },
      useGraph: { type: 'boolean', description: 'Use graph traversal', optional: true },
      includeDocuments: { type: 'boolean', description: 'Include documents', optional: true },
      includeEntities: { type: 'boolean', description: 'Include entities', optional: true }
    },
    required: ['query'],
  },
};

const hybridSearchDescription: ToolRegistrationDescription = () =>
  `BEST FOR RETRIEVAL: Combines semantic vector search + knowledge graph traversal for comprehensive results.
First finds relevant nodes via embeddings, then expands via graph relationships for contextual understanding.
Returns entities, relationships, and document chunks ranked by relevance.
Params: query, limit?, useGraph?(default:true), includeDocuments?(default:true), includeEntities?(default:true)
Ex: {"query":"React hooks usage patterns","limit":20,"useGraph":true}`;

const hybridSearchSchema: z.ZodRawShape = {
  query: z.string().describe('Natural language query'),
  limit: z.number().optional().describe('Max results (default: 10)'),
  useGraph: z.boolean().optional().describe('Enable graph traversal (default: true)'),
  includeDocuments: z.boolean().optional().describe('Include document chunks (default: true)'),
  includeEntities: z.boolean().optional().describe('Include entities (default: true)'),
};

export const hybridSearchTool: ToolDefinition = {
  capability: hybridSearchCapability,
  description: hybridSearchDescription,
  schema: hybridSearchSchema,
};

// === GET DETAILED CONTEXT ===
const getDetailedContextCapability: ToolCapabilityInfo = {
  description: 'Get chunk with surrounding context',
  parameters: {
    type: 'object',
    properties: {
      chunkId: { type: 'string', description: 'Chunk ID' },
      surroundingChunks: { type: 'number', description: 'Context chunks', optional: true }
    },
    required: ['chunkId'],
  },
};

const getDetailedContextDescription: ToolRegistrationDescription = () =>
  `Get document chunk with surrounding chunks for full context. Use AFTER hybridSearch when you need complete passage context.
Returns target chunk plus N chunks before/after for continuity.
Params: chunkId, surroundingChunks?(default:2)
Ex: {"chunkId":"doc1_chunk_5","surroundingChunks":2}`;

const getDetailedContextSchema: z.ZodRawShape = {
  chunkId: z.string().describe('Chunk ID from search results'),
  surroundingChunks: z.number().optional().describe('Number of surrounding chunks (default: 2)'),
};

export const getDetailedContextTool: ToolDefinition = {
  capability: getDetailedContextCapability,
  description: getDetailedContextDescription,
  schema: getDetailedContextSchema,
};

// === GET KNOWLEDGE GRAPH STATS ===
const getKnowledgeGraphStatsCapability: ToolCapabilityInfo = {
  description: 'Get comprehensive knowledge base statistics',
  parameters: { type: 'object', properties: {}, required: [] },
};

const getKnowledgeGraphStatsDescription: ToolRegistrationDescription = () =>
  `CALL THIS FIRST: Get comprehensive stats about the knowledge base state.
Returns: entity count, relationship count, document count, chunk count, embedding count, entity types distribution.
Essential for understanding what's in the KB before querying or adding data.
Params: none
Ex: {}`;

const getKnowledgeGraphStatsSchema: z.ZodRawShape = {};

export const getKnowledgeGraphStatsTool: ToolDefinition = {
  capability: getKnowledgeGraphStatsCapability,
  description: getKnowledgeGraphStatsDescription,
  schema: getKnowledgeGraphStatsSchema,
};

export const graphQueryTools = {
  searchNodes: searchNodesTool,
  openNodes: openNodesTool,
  readGraph: readGraphTool,
  hybridSearch: hybridSearchTool,
  getDetailedContext: getDetailedContextTool,
  getKnowledgeGraphStats: getKnowledgeGraphStatsTool,
};
