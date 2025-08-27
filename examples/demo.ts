#!/usr/bin/env tsx

/**
 * Demo script showing how the Affordance Discovery MCP server works
 * This simulates how an AI agent would interact with the server
 */

import { JavaScriptDiscoveryEngine } from '../src/engines/javascript.js';
import { CacheManager } from '../src/cache.js';

async function runDemo() {
  console.log('🚀 Affordance Discovery MCP Server Demo\n');
  
  // Initialize the discovery engine
  const cache = new CacheManager({ ttl: 5 * 60 * 1000, maxSize: 1000 });
  const engine = new JavaScriptDiscoveryEngine(cache);

  // Demo 1: Discover available packages
  console.log('📦 Demo 1: Discovering available packages...');
  const packages = await engine.discoverPackages({
    language: 'javascript',
    includeDevDependencies: true,
    maxResults: 5,
  });
  
  console.log(`Found ${packages.totalFound} packages:`);
  packages.packages.forEach(pkg => {
    console.log(`  - ${pkg.name}@${pkg.version} ${pkg.installed ? '✅' : '❌'}`);
    if (pkg.description) {
      console.log(`    ${pkg.description}`);
    }
  });
  console.log();

  // Demo 2: Validate imports (good and bad examples)
  console.log('✅ Demo 2: Validating import statements...');
  
  const importTests = [
    "import { describe, it, expect } from 'vitest'",
    "import React from 'react'",
    "import { nonExistentFunction } from 'fake-package-12345'",
    "const fs = require('fs')",
  ];

  for (const importStatement of importTests) {
    const result = await engine.validateImport({
      importStatement,
      language: 'javascript',
    });
    
    const status = result.valid ? '✅' : '❌';
    console.log(`  ${status} ${importStatement}`);
    console.log(`     Package: ${result.packageName}`);
    
    if (!result.valid && result.reason) {
      console.log(`     Reason: ${result.reason}`);
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`     Suggestions: ${result.suggestions.join(', ')}`);
      }
    }
    console.log();
  }

  // Demo 3: Introspect a module
  console.log('🔍 Demo 3: Introspecting module exports...');
  const moduleInfo = await engine.introspectModule({
    moduleName: 'vitest',
    language: 'javascript',
    includePrivate: false,
    maxDepth: 2,
  });

  console.log(`Module: ${moduleInfo.name}`);
  console.log(`Path: ${moduleInfo.path}`);
  console.log(`Exports (${moduleInfo.exports.length}):`);
  moduleInfo.exports.slice(0, 5).forEach(exp => {
    console.log(`  - ${exp.name} (${exp.type})`);
    if (exp.signature) {
      console.log(`    Signature: ${exp.signature}`);
    }
  });
  
  if (moduleInfo.exports.length > 5) {
    console.log(`  ... and ${moduleInfo.exports.length - 5} more`);
  }
  console.log();

  // Demo 4: Search for packages by functionality
  console.log('🔎 Demo 4: Searching packages by functionality...');
  const searchResult = await engine.searchAffordances({
    query: 'test',
    language: 'javascript',
    category: 'testing',
    maxResults: 3,
  });

  console.log(`Found ${searchResult.totalFound} packages matching "test":`);
  searchResult.packages.forEach(pkg => {
    console.log(`  - ${pkg.name}@${pkg.version}`);
    if (pkg.description) {
      console.log(`    ${pkg.description}`);
    }
  });
  console.log();

  // Demo 5: Show cache performance
  console.log('⚡ Demo 5: Cache performance...');
  const cacheStats = cache.getStats();
  console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
  console.log(`Memory usage: ${Math.round(cacheStats.memoryUsage / 1024)}KB`);
  console.log();

  console.log('✨ Demo completed! This shows how AI agents can:');
  console.log('  1. Discover what packages are actually available');
  console.log('  2. Validate imports before generating code');
  console.log('  3. Understand what functions/classes are exported');
  console.log('  4. Search for packages by functionality');
  console.log('  5. Get fast responses through intelligent caching');
  console.log();
  console.log('🎯 Result: No more hallucinated imports in AI-generated code!');
}

// Run the demo
runDemo().catch(console.error);
