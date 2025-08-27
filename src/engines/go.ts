import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CacheManager } from '../cache.js';
import {
  DiscoveryEngine,
  DiscoverPackagesInput,
  ValidateImportInput,
  IntrospectModuleInput,
  SearchAffordancesInput,
  DiscoveryResult,
  ValidationResult,
  ModuleInfo,
  PackageInfo,
  ModuleExport,
} from '../types.js';

/**
 * Go standard library packages
 */
const GO_STDLIB_PACKAGES = new Set([
  'fmt', 'log', 'os', 'io', 'net', 'http', 'time', 'strings', 'strconv',
  'bytes', 'bufio', 'context', 'sync', 'json', 'xml', 'html', 'url',
  'path', 'filepath', 'sort', 'math', 'crypto', 'encoding', 'compress',
  'archive', 'database', 'regexp', 'unicode', 'reflect', 'runtime',
  'errors', 'flag', 'testing', 'image', 'text', 'mime', 'plugin',
  'debug', 'go', 'index', 'container', 'hash', 'net/http', 'net/url',
  'net/mail', 'net/smtp', 'net/textproto', 'crypto/md5', 'crypto/sha1',
  'crypto/sha256', 'crypto/sha512', 'crypto/aes', 'crypto/des', 'crypto/rsa',
  'crypto/rand', 'crypto/tls', 'crypto/x509', 'encoding/json', 'encoding/xml',
  'encoding/base64', 'encoding/hex', 'encoding/csv', 'encoding/gob',
  'encoding/binary', 'text/template', 'text/scanner', 'html/template',
  'image/jpeg', 'image/png', 'image/gif', 'compress/gzip', 'compress/zlib',
  'archive/zip', 'archive/tar', 'database/sql', 'database/sql/driver',
  'go/ast', 'go/build', 'go/doc', 'go/format', 'go/parser', 'go/token',
  'container/heap', 'container/list', 'container/ring', 'hash/crc32',
  'hash/crc64', 'hash/fnv', 'index/suffixarray', 'mime/multipart',
  'mime/quotedprintable', 'debug/dwarf', 'debug/elf', 'debug/gosym',
  'debug/macho', 'debug/pe', 'debug/plan9obj'
]);

export class GoDiscoveryEngine implements DiscoveryEngine {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  async discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult> {
    const cacheKey = CacheManager.generateKey('discover_go', input.searchTerm, input.includeDevDependencies, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const packages: PackageInfo[] = [];
    
    try {
      // Try to find go.mod in current directory or parent directories
      const goModPath = this.findGoMod(process.cwd());
      
      if (goModPath) {
        const goMod = this.parseGoMod(goModPath);
        
        // Get dependencies
        const dependencies = goMod.require || [];
        
        // Process each dependency
        for (const dep of dependencies) {
          if (input.searchTerm && !dep.name.toLowerCase().includes(input.searchTerm.toLowerCase())) {
            continue;
          }
          
          packages.push({
            name: dep.name,
            version: dep.version,
            installed: true,
          });
          
          if (packages.length >= input.maxResults) {
            break;
          }
        }
      }
      
      // Add standard library packages if they match the search
      if (packages.length < input.maxResults) {
        const stdlibMatches = this.getStandardLibraryMatches(input.searchTerm || '');
        packages.push(...stdlibMatches.slice(0, input.maxResults - packages.length));
      }
      
    } catch (error) {
      console.error('Error discovering Go packages:', error);
    }

    const result: DiscoveryResult = {
      packages: packages.slice(0, input.maxResults),
      totalFound: packages.length,
      searchTerm: input.searchTerm,
      language: 'go',
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  async validateImport(input: ValidateImportInput): Promise<ValidationResult> {
    const cacheKey = CacheManager.generateKey('validate_go', input.importStatement);
    
    // Check cache first
    const cached = this.cache.get<ValidationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const packageName = this.extractPackageNameFromImport(input.importStatement);
      
      if (!packageName) {
        const result: ValidationResult = {
          valid: false,
          packageName: 'unknown',
          reason: 'Could not parse import statement',
          suggestions: [],
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if it's a standard library package
      if (GO_STDLIB_PACKAGES.has(packageName)) {
        const result: ValidationResult = {
          valid: true,
          packageName,
          reason: 'Go standard library package',
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if package is in go.mod
      const isInGoMod = await this.checkPackageInGoMod(packageName);
      
      if (isInGoMod) {
        const result: ValidationResult = {
          valid: true,
          packageName,
        };
        this.cache.set(cacheKey, result);
        return result;
      } else {
        const suggestions = await this.getSimilarPackages(packageName);
        const result: ValidationResult = {
          valid: false,
          packageName,
          reason: `Package '${packageName}' is not found in go.mod`,
          suggestions,
        };
        this.cache.set(cacheKey, result);
        return result;
      }
      
    } catch (error) {
      const result: ValidationResult = {
        valid: false,
        packageName: 'unknown',
        reason: `Error validating import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [],
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  async introspectModule(input: IntrospectModuleInput): Promise<ModuleInfo> {
    const cacheKey = CacheManager.generateKey('introspect_go', input.moduleName);
    
    // Check cache first
    const cached = this.cache.get<ModuleInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For Go, we could use go doc or similar tools
      // This is a simplified implementation
      const result: ModuleInfo = {
        name: input.moduleName,
        path: '',
        exports: [],
        submodules: [],
        dependencies: [],
      };

      this.cache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      const result: ModuleInfo = {
        name: input.moduleName,
        path: '',
        exports: [],
        submodules: [],
        dependencies: [],
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  async searchAffordances(input: SearchAffordancesInput): Promise<DiscoveryResult> {
    // Delegate to discoverPackages with search term
    return this.discoverPackages({
      language: input.language,
      searchTerm: input.query,
      includeDevDependencies: true,
      maxResults: input.maxResults,
    });
  }

  // Helper methods
  private findGoMod(startDir: string): string | null {
    let currentDir = startDir;
    
    while (currentDir !== '/') {
      const goModPath = join(currentDir, 'go.mod');
      if (existsSync(goModPath)) {
        return goModPath;
      }
      currentDir = join(currentDir, '..');
    }
    
    return null;
  }

  private parseGoMod(goModPath: string): any {
    try {
      const content = readFileSync(goModPath, 'utf-8');
      const lines = content.split('\n');
      const result: any = { require: [] };
      
      let inRequireBlock = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('require (')) {
          inRequireBlock = true;
          continue;
        }
        
        if (inRequireBlock && trimmed === ')') {
          inRequireBlock = false;
          continue;
        }
        
        if (inRequireBlock || trimmed.startsWith('require ')) {
          const requireMatch = trimmed.match(/require\s+([^\s]+)\s+([^\s]+)/);
          if (requireMatch) {
            result.require.push({
              name: requireMatch[1],
              version: requireMatch[2]
            });
          } else {
            // Handle single line require in block
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
              result.require.push({
                name: parts[0],
                version: parts[1]
              });
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error parsing go.mod:', error);
      return { require: [] };
    }
  }

  private getStandardLibraryMatches(searchTerm: string): PackageInfo[] {
    if (!searchTerm) return [];
    
    const matches: PackageInfo[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const packageName of GO_STDLIB_PACKAGES) {
      if (packageName.includes(searchLower)) {
        matches.push({
          name: packageName,
          version: 'stdlib',
          description: 'Go standard library package',
          installed: true,
        });
      }
    }
    
    return matches;
  }

  private extractPackageNameFromImport(importStatement: string): string | null {
    // Handle Go import statements
    const patterns = [
      /^import\s+"([^"]+)"/,                    // import "package"
      /^import\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+"([^"]+)"/,  // import alias "package"
      /^\s*"([^"]+)"\s*$/,                     // "package" (in import block)
      /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+"([^"]+)"\s*$/,    // alias "package" (in import block)
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match) {
        // Get the package path (last capture group)
        const packagePath = match[match.length - 1];
        return packagePath || null;
      }
    }

    return null;
  }

  private async checkPackageInGoMod(packageName: string): Promise<boolean> {
    try {
      const goModPath = this.findGoMod(process.cwd());
      
      if (!goModPath) {
        return false;
      }
      
      const goMod = this.parseGoMod(goModPath);
      const dependencies = goMod.require || [];
      
      return dependencies.some((dep: any) => dep.name === packageName);
    } catch (error) {
      return false;
    }
  }

  private async getSimilarPackages(packageName: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const goModPath = this.findGoMod(process.cwd());
      
      if (goModPath) {
        const goMod = this.parseGoMod(goModPath);
        const dependencies = goMod.require || [];
        
        // Simple similarity check
        for (const dep of dependencies) {
          if (dep.name.includes(packageName) || packageName.includes(dep.name)) {
            suggestions.push(dep.name);
          }
        }
      }
      
      // Also check standard library
      for (const stdlibPackage of GO_STDLIB_PACKAGES) {
        if (stdlibPackage.includes(packageName) || packageName.includes(stdlibPackage)) {
          suggestions.push(stdlibPackage);
        }
      }
      
    } catch (error) {
      console.debug('Error getting similar packages:', error);
    }
    
    return suggestions.slice(0, 5);
  }
}