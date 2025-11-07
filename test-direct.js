#!/usr/bin/env node

// Direct test of database switching without MCP protocol
import { DatabaseFactory } from './dist/src/database/database-factory.js';

const config = {
  type: 'postgresql',
  vectorDimensions: 384,
  postgresql: {
    host: '10.0.19.224',
    port: 5433,
    database: 'rag-memorydb',
    username: 'postgres',
    password: 'pgvector2025',
    ssl: false,
    pool: { min: 2, max: 10 }
  }
};

async function test() {
  console.log('🧪 Testing Database Switching\n');
  
  try {
    const factory = DatabaseFactory.getInstance();
    const adapter = await factory.createAdapter(config);
    
    console.log('✅ Connected to:', adapter.getCurrentDatabase());
    
    console.log('\n📋 Listing databases...');
    const databases = await adapter.listAvailableDatabases();
    console.log('Databases:', databases);
    
    console.log('\n🔄 Switching to test_switching_db...');
    await adapter.switchDatabase('test_switching_db');
    console.log('✅ Switched to:', adapter.getCurrentDatabase());
    
    console.log('\n🔄 Switching back to rag-memorydb...');
    await adapter.switchDatabase('rag-memorydb');
    console.log('✅ Switched to:', adapter.getCurrentDatabase());
    
    await adapter.close();
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
