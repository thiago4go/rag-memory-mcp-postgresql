import { z } from 'zod';
import { ToolDefinition, ToolCapabilityInfo, ToolRegistrationDescription } from './types.js';

// === CREATE ENTITIES ===
const createEntitiesCapability: ToolCapabilityInfo = {
  description: 'Create entities with observations and auto-generate embeddings',
  parameters: {
    type: 'object',
    properties: { entities: { type: 'array', description: 'Entities to create', items: { type: 'object' } } },
    required: ['entities'],
  },
};

const createEntitiesDescription: ToolRegistrationDescription = () => 
  `Create entities (people, concepts, places, etc.) with observations. Auto-generates vector embeddings for semantic search.
IMPORTANT: Use searchNodes first to check for duplicates before creating.
Params: entities[{name, entityType, observations[]}]
Ex: {"entities":[{"name":"React","entityType":"TECHNOLOGY","observations":["JS library for building UIs","Created by Facebook"]}]}`;

const createEntitiesSchema: z.ZodRawShape = {
  entities: z.array(z.object({
    name: z.string().describe('Unique entity name'),
    entityType: z.string().describe('Category (PERSON, CONCEPT, TECHNOLOGY, etc.)'),
    observations: z.array(z.string()).describe('Contextual facts about the entity'),
  })).describe('Array of entities to create'),
};

export const createEntitiesTool: ToolDefinition = {
  capability: createEntitiesCapability,
  description: createEntitiesDescription,
  schema: createEntitiesSchema,
};

// === CREATE RELATIONS ===
const createRelationsCapability: ToolCapabilityInfo = {
  description: 'Create directed relationships between entities',
  parameters: {
    type: 'object',
    properties: { relations: { type: 'array', description: 'Relationships to create', items: { type: 'object' } } },
    required: ['relations'],
  },
};

const createRelationsDescription: ToolRegistrationDescription = () =>
  `Create directed relationships between entities. Auto-creates missing entities if they don't exist.
Use to build knowledge graph connections (IS_A, HAS, USES, PART_OF, etc.).
Params: relations[{from, to, relationType}]
Ex: {"relations":[{"from":"React","to":"JavaScript","relationType":"BUILT_WITH"}]}`;

const createRelationsSchema: z.ZodRawShape = {
  relations: z.array(z.object({
    from: z.string().describe('Source entity name'),
    to: z.string().describe('Target entity name'),
    relationType: z.string().describe('Relationship type (IS_A, HAS, USES, etc.)'),
  })).describe('Array of relationships to create'),
};

export const createRelationsTool: ToolDefinition = {
  capability: createRelationsCapability,
  description: createRelationsDescription,
  schema: createRelationsSchema,
};

// === ADD OBSERVATIONS ===
const addObservationsCapability: ToolCapabilityInfo = {
  description: 'Add observations to existing entities',
  parameters: {
    type: 'object',
    properties: { observations: { type: 'array', description: 'Observations to add', items: { type: 'object' } } },
    required: ['observations'],
  },
};

const addObservationsDescription: ToolRegistrationDescription = () =>
  `Add new observations to existing entities. Observations are cumulative - they enrich entity context over time.
Filters duplicates automatically. Re-generates embeddings for updated entities.
Params: observations[{entityName, contents[]}]
Ex: {"observations":[{"entityName":"React","contents":["v18 introduced concurrent rendering","Supports server components"]}]}`;

const addObservationsSchema: z.ZodRawShape = {
  observations: z.array(z.object({
    entityName: z.string().describe('Name of existing entity'),
    contents: z.array(z.string()).describe('New observations to add'),
  })).describe('Array of observations to add to entities'),
};

export const addObservationsTool: ToolDefinition = {
  capability: addObservationsCapability,
  description: addObservationsDescription,
  schema: addObservationsSchema,
};

// === DELETE ENTITIES ===
const deleteEntitiesCapability: ToolCapabilityInfo = {
  description: 'Delete entities and their relationships',
  parameters: {
    type: 'object',
    properties: { entityNames: { type: 'array', description: 'Entity names to delete', items: { type: 'string' } } },
    required: ['entityNames'],
  },
};

const deleteEntitiesDescription: ToolRegistrationDescription = () =>
  `Delete entities and all their relationships, observations, and embeddings. Cascading delete.
Params: entityNames[]
Ex: {"entityNames":["OldConcept","DeprecatedTech"]}`;

const deleteEntitiesSchema: z.ZodRawShape = {
  entityNames: z.array(z.string()).describe('Names of entities to delete'),
};

export const deleteEntitiesTool: ToolDefinition = {
  capability: deleteEntitiesCapability,
  description: deleteEntitiesDescription,
  schema: deleteEntitiesSchema,
};

// === DELETE RELATIONS ===
const deleteRelationsCapability: ToolCapabilityInfo = {
  description: 'Delete specific relationships',
  parameters: {
    type: 'object',
    properties: { relations: { type: 'array', description: 'Relations to delete', items: { type: 'object' } } },
    required: ['relations'],
  },
};

const deleteRelationsDescription: ToolRegistrationDescription = () =>
  `Delete specific relationships between entities. Entities remain intact.
Params: relations[{from, to, relationType}]
Ex: {"relations":[{"from":"React","to":"OldLib","relationType":"DEPENDS_ON"}]}`;

const deleteRelationsSchema: z.ZodRawShape = {
  relations: z.array(z.object({
    from: z.string().describe('Source entity name'),
    to: z.string().describe('Target entity name'),
    relationType: z.string().describe('Relationship type to delete'),
  })).describe('Array of relationships to delete'),
};

export const deleteRelationsTool: ToolDefinition = {
  capability: deleteRelationsCapability,
  description: deleteRelationsDescription,
  schema: deleteRelationsSchema,
};

// === DELETE OBSERVATIONS ===
const deleteObservationsCapability: ToolCapabilityInfo = {
  description: 'Delete specific observations from entities',
  parameters: {
    type: 'object',
    properties: { deletions: { type: 'array', description: 'Observations to delete', items: { type: 'object' } } },
    required: ['deletions'],
  },
};

const deleteObservationsDescription: ToolRegistrationDescription = () =>
  `Delete specific observations from entities. Must match exact text.
Params: deletions[{entityName, observations[]}]
Ex: {"deletions":[{"entityName":"React","observations":["outdated info"]}]}`;

const deleteObservationsSchema: z.ZodRawShape = {
  deletions: z.array(z.object({
    entityName: z.string().describe('Entity name'),
    observations: z.array(z.string()).describe('Exact observation texts to delete'),
  })).describe('Array of observation deletions'),
};

export const deleteObservationsTool: ToolDefinition = {
  capability: deleteObservationsCapability,
  description: deleteObservationsDescription,
  schema: deleteObservationsSchema,
};

export const knowledgeGraphTools = {
  createEntities: createEntitiesTool,
  createRelations: createRelationsTool,
  addObservations: addObservationsTool,
  deleteEntities: deleteEntitiesTool,
  deleteRelations: deleteRelationsTool,
  deleteObservations: deleteObservationsTool,
};
