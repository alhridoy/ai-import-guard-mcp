import { describe, it, expect, beforeEach } from 'vitest';
import { JavaScriptDiscoveryEngine } from '../src/engines/javascript.js';
import { CacheManager } from '../src/cache.js';

describe('JavaScriptDiscoveryEngine', () => {
  let engine: JavaScriptDiscoveryEngine;
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ ttl: 60000, maxSize: 100 });
    engine = new JavaScriptDiscoveryEngine(cache);
  });

  describe('discoverPackages', () => {
    it('should discover packages from package.json', async () => {
      const result = await engine.discoverPackages({
        language: 'javascript',
        includeDevDependencies: true,
        maxResults: 10,
      });

      expect(result).toBeDefined();
      expect(result.language).toBe('javascript');
      expect(result.packages).toBeInstanceOf(Array);
      expect(result.totalFound).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should filter packages by search term', async () => {
      const result = await engine.discoverPackages({
        language: 'javascript',
        searchTerm: 'typescript',
        maxResults: 10,
      });

      expect(result.packages.every(pkg => 
        pkg.name.toLowerCase().includes('typescript')
      )).toBe(true);
    });
  });

  describe('validateImport', () => {
    it('should validate a valid import statement', async () => {
      const result = await engine.validateImport({
        importStatement: "import { describe } from 'vitest'",
        language: 'javascript',
      });

      expect(result).toBeDefined();
      expect(result.packageName).toBe('vitest');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle invalid import statements', async () => {
      const result = await engine.validateImport({
        importStatement: "import something from 'non-existent-package-12345'",
        language: 'javascript',
      });

      expect(result).toBeDefined();
      expect(result.packageName).toBe('non-existent-package-12345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should parse different import patterns', async () => {
      const testCases = [
        "import React from 'react'",
        "import { useState } from 'react'",
        "const fs = require('fs')",
        "import('dynamic-import-package')",
      ];

      for (const importStatement of testCases) {
        const result = await engine.validateImport({
          importStatement,
          language: 'javascript',
        });
        
        expect(result).toBeDefined();
        expect(result.packageName).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
      }
    });
  });

  describe('introspectModule', () => {
    it('should introspect a known module', async () => {
      const result = await engine.introspectModule({
        moduleName: 'vitest',
        language: 'javascript',
        includePrivate: false,
        maxDepth: 2,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('vitest');
      expect(result.exports).toBeInstanceOf(Array);
      expect(result.path).toBeDefined();
    });

    it('should handle non-existent modules gracefully', async () => {
      const result = await engine.introspectModule({
        moduleName: 'non-existent-module-12345',
        language: 'javascript',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('non-existent-module-12345');
      expect(result.exports).toEqual([]);
      expect(result.path).toBe('');
    });
  });

  describe('searchAffordances', () => {
    it('should search for packages by functionality', async () => {
      const result = await engine.searchAffordances({
        query: 'test',
        language: 'javascript',
        category: 'testing',
        maxResults: 5,
      });

      expect(result).toBeDefined();
      expect(result.packages).toBeInstanceOf(Array);
      expect(result.language).toBe('javascript');
    });
  });
});
