import { z } from 'zod';
import { ToolDefinition, ToolCapabilityInfo, ToolRegistrationDescription } from './types.js';

// === STORE DOCUMENT ===
const storeDocumentCapability: ToolCapabilityInfo = {
  description: 'Store document with auto-chunking and embedding',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Unique document ID' },
      content: { type: 'string', description: 'Document text' },
      metadata: { type: 'object', description: 'Optional metadata', optional: true },
      maxTokens: { type: 'number', description: 'Max tokens per chunk (default: 200)', optional: true },
      overlap: { type: 'number', description: 'Overlap tokens (default: 20)', optional: true }
    },
    required: ['id', 'content'],
  },
};

const storeDocumentDescription: ToolRegistrationDescription = () =>
  `Store document with automatic chunking and vector embedding. Ready for semantic search immediately.
WORKFLOW: storeDocument → extractTerms → createEntities → linkEntitiesToDocument for full RAG integration.
Params: id, content, metadata?, maxTokens?, overlap?
Ex: {"id":"doc1","content":"Long text...","metadata":{"type":"article","author":"John"}}`;

const storeDocumentSchema: z.ZodRawShape = {
  id: z.string().describe('Unique document identifier'),
  content: z.string().describe('Full document text'),
  metadata: z.record(z.any()).optional().describe('Optional metadata'),
  maxTokens: z.number().optional().describe('Max tokens per chunk (default: 200)'),
  overlap: z.number().optional().describe('Overlap tokens (default: 20)'),
};

export const storeDocumentTool: ToolDefinition = {
  capability: storeDocumentCapability,
  description: storeDocumentDescription,
  schema: storeDocumentSchema,
};

// === EXTRACT TERMS ===
const extractTermsCapability: ToolCapabilityInfo = {
  description: 'Extract potential entity terms from document',
  parameters: {
    type: 'object',
    properties: { documentId: { type: 'string', description: 'Document ID' } },
    required: ['documentId'],
  },
};

const extractTermsDescription: ToolRegistrationDescription = () =>
  `Extract potential entity terms from stored document using NLP patterns (capitalized phrases, technical terms).
Use after storeDocument to identify entities for knowledge graph creation.
Params: documentId
Ex: {"documentId":"doc1"}`;

const extractTermsSchema: z.ZodRawShape = {
  documentId: z.string().describe('ID of stored document'),
};

export const extractTermsTool: ToolDefinition = {
  capability: extractTermsCapability,
  description: extractTermsDescription,
  schema: extractTermsSchema,
};

// === LINK ENTITIES TO DOCUMENT ===
const linkEntitiesToDocumentCapability: ToolCapabilityInfo = {
  description: 'Link entities to document for better retrieval',
  parameters: {
    type: 'object',
    properties: {
      documentId: { type: 'string', description: 'Document ID' },
      entityNames: { type: 'array', description: 'Entity names', items: { type: 'string' } }
    },
    required: ['documentId', 'entityNames'],
  },
};

const linkEntitiesToDocumentDescription: ToolRegistrationDescription = () =>
  `Link entities to document chunks for enhanced hybrid search retrieval. Creates associations between knowledge graph and documents.
Use after creating entities from extracted terms to enable graph-enhanced document search.
Params: documentId, entityNames[]
Ex: {"documentId":"doc1","entityNames":["React","JavaScript","Hooks"]}`;

const linkEntitiesToDocumentSchema: z.ZodRawShape = {
  documentId: z.string().describe('Document ID'),
  entityNames: z.array(z.string()).describe('Entity names to link'),
};

export const linkEntitiesToDocumentTool: ToolDefinition = {
  capability: linkEntitiesToDocumentCapability,
  description: linkEntitiesToDocumentDescription,
  schema: linkEntitiesToDocumentSchema,
};

// === DELETE DOCUMENTS ===
const deleteDocumentsCapability: ToolCapabilityInfo = {
  description: 'Delete documents and associated data',
  parameters: {
    type: 'object',
    properties: { documentIds: { type: 'array', description: 'Document IDs', items: { type: 'string' } } },
    required: ['documentIds'],
  },
};

const deleteDocumentsDescription: ToolRegistrationDescription = () =>
  `Delete documents with all chunks, embeddings, and entity associations. Cascading delete.
Params: documentIds[]
Ex: {"documentIds":["doc1","doc2"]}`;

const deleteDocumentsSchema: z.ZodRawShape = {
  documentIds: z.array(z.string()).describe('Document IDs to delete'),
};

export const deleteDocumentsTool: ToolDefinition = {
  capability: deleteDocumentsCapability,
  description: deleteDocumentsDescription,
  schema: deleteDocumentsSchema,
};

// === LIST DOCUMENTS ===
const listDocumentsCapability: ToolCapabilityInfo = {
  description: 'List all stored documents',
  parameters: {
    type: 'object',
    properties: { includeMetadata: { type: 'boolean', description: 'Include metadata', optional: true } },
    required: [],
  },
};

const listDocumentsDescription: ToolRegistrationDescription = () =>
  `List all stored documents with IDs and optional metadata. Use to see what documents are available.
Params: includeMetadata?
Ex: {"includeMetadata":true}`;

const listDocumentsSchema: z.ZodRawShape = {
  includeMetadata: z.boolean().optional().describe('Include document metadata (default: false)'),
};

export const listDocumentsTool: ToolDefinition = {
  capability: listDocumentsCapability,
  description: listDocumentsDescription,
  schema: listDocumentsSchema,
};

// === RE-EMBED EVERYTHING ===
const reEmbedEverythingCapability: ToolCapabilityInfo = {
  description: 'Regenerate all embeddings',
  parameters: { type: 'object', properties: {}, required: [] },
};

const reEmbedEverythingDescription: ToolRegistrationDescription = () =>
  `Regenerate all vector embeddings for entities, documents, and knowledge graph. Use after model updates or for consistency.
Params: none
Ex: {}`;

const reEmbedEverythingSchema: z.ZodRawShape = {};

export const reEmbedEverythingTool: ToolDefinition = {
  capability: reEmbedEverythingCapability,
  description: reEmbedEverythingDescription,
  schema: reEmbedEverythingSchema,
};

export const ragTools = {
  storeDocument: storeDocumentTool,
  extractTerms: extractTermsTool,
  linkEntitiesToDocument: linkEntitiesToDocumentTool,
  deleteDocuments: deleteDocumentsTool,
  listDocuments: listDocumentsTool,
  reEmbedEverything: reEmbedEverythingTool,
};
