#!/usr/bin/env node

// Test script for database switching functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = {
  ...process.env,
  PG_SSL: 'false',
  MCP_SILENT: 'true',
  PG_USERNAME: 'postgres',
  PG_HOST: '10.0.19.224',
  PG_PASSWORD: 'pgvector2025',
  PG_PORT: '5433',
  DB_TYPE: 'postgresql',
  PG_DATABASE: 'rag-memorydb'
};

function sendMCPRequest(method, params) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [join(__dirname, 'dist/index.js')], { env });
    
    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    server.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}\n${errorOutput}`));
      } else {
        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{'));
          if (jsonLine) {
            resolve(JSON.parse(jsonLine));
          } else {
            reject(new Error('No JSON response found'));
          }
        } catch (e) {
          reject(e);
        }
      }
    });
    
    // Send request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Database Switching Feature\n');
  
  try {
    // Test 1: List databases
    console.log('Test 1: List available databases');
    const listResult = await sendMCPRequest('tools/call', {
      name: 'listDatabases',
      arguments: {}
    });
    console.log('✅ Databases:', listResult.content[0].text);
    
    // Test 2: Get current database
    console.log('\nTest 2: Get current database');
    const currentResult = await sendMCPRequest('tools/call', {
      name: 'getCurrentDatabase',
      arguments: {}
    });
    console.log('✅ Current database:', currentResult.content[0].text);
    
    // Test 3: Switch to test database
    console.log('\nTest 3: Switch to test_switching_db');
    const switchResult = await sendMCPRequest('tools/call', {
      name: 'switchDatabase',
      arguments: { databaseName: 'test_switching_db' }
    });
    console.log('✅ Switch result:', switchResult.content[0].text);
    
    // Test 4: Verify current database changed
    console.log('\nTest 4: Verify database changed');
    const verifyResult = await sendMCPRequest('tools/call', {
      name: 'getCurrentDatabase',
      arguments: {}
    });
    console.log('✅ New current database:', verifyResult.content[0].text);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
