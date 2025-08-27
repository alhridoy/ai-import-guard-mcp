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
 * Rust standard library modules
 */
const RUST_STDLIB_MODULES = new Set([
  'std', 'core', 'alloc', 'proc_macro', 'test',
  'std::collections', 'std::fs', 'std::io', 'std::net', 'std::os',
  'std::path', 'std::process', 'std::sync', 'std::thread',
  'std::time', 'std::env', 'std::fmt', 'std::str', 'std::string',
  'std::vec', 'std::hash', 'std::convert', 'std::default',
  'std::iter', 'std::mem', 'std::ptr', 'std::slice', 'std::borrow',
  'std::clone', 'std::cmp', 'std::marker', 'std::ops', 'std::option',
  'std::result', 'std::any', 'std::ascii', 'std::char', 'std::f32',
  'std::f64', 'std::i8', 'std::i16', 'std::i32', 'std::i64', 'std::i128',
  'std::isize', 'std::u8', 'std::u16', 'std::u32', 'std::u64', 'std::u128',
  'std::usize', 'std::primitive'
]);

export class RustDiscoveryEngine implements DiscoveryEngine {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  async discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult> {
    const cacheKey = CacheManager.generateKey('discover_rust', input.searchTerm, input.includeDevDependencies, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const packages: PackageInfo[] = [];
    
    try {
      // Try to find Cargo.toml in current directory or parent directories
      const cargoTomlPath = this.findCargoToml(process.cwd());
      
      if (cargoTomlPath) {
        const cargoToml = this.parseCargoToml(cargoTomlPath);
        
        // Get dependencies
        const dependencies = cargoToml.dependencies || {};
        const devDependencies = input.includeDevDependencies ? (cargoToml['dev-dependencies'] || {}) : {};
        const allDeps = { ...dependencies, ...devDependencies };
        
        // Process each dependency
        for (const [name, version] of Object.entries(allDeps)) {
          if (input.searchTerm && !name.toLowerCase().includes(input.searchTerm.toLowerCase())) {
            continue;
          }
          
          packages.push({
            name,
            version: typeof version === 'string' ? version : (version as any).version || 'latest',
            installed: true,
          });
          
          if (packages.length >= input.maxResults) {
            break;
          }
        }
      }
      
      // Add standard library modules if they match the search
      if (packages.length < input.maxResults) {
        const stdlibMatches = this.getStandardLibraryMatches(input.searchTerm || '');
        packages.push(...stdlibMatches.slice(0, input.maxResults - packages.length));
      }
      
    } catch (error) {
      console.error('Error discovering Rust packages:', error);
    }

    const result: DiscoveryResult = {
      packages: packages.slice(0, input.maxResults),
      totalFound: packages.length,
      searchTerm: input.searchTerm,
      language: 'rust',
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  async validateImport(input: ValidateImportInput): Promise<ValidationResult> {
    const cacheKey = CacheManager.generateKey('validate_rust', input.importStatement);
    
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
          reason: 'Could not parse use statement',
          suggestions: [],
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if it's a standard library module
      if (this.isStandardLibraryModule(packageName)) {
        const result: ValidationResult = {
          valid: true,
          packageName,
          reason: 'Rust standard library module',
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if package is in Cargo.toml
      const isInCargo = await this.checkPackageInCargo(packageName);
      
      if (isInCargo) {
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
          reason: `Crate '${packageName}' is not found in Cargo.toml`,
          suggestions,
        };
        this.cache.set(cacheKey, result);
        return result;
      }
      
    } catch (error) {
      const result: ValidationResult = {
        valid: false,
        packageName: 'unknown',
        reason: `Error validating use statement: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [],
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  async introspectModule(input: IntrospectModuleInput): Promise<ModuleInfo> {
    const cacheKey = CacheManager.generateKey('introspect_rust', input.moduleName);
    
    // Check cache first
    const cached = this.cache.get<ModuleInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For Rust, we would need to use rust-analyzer or similar tools
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
  private findCargoToml(startDir: string): string | null {
    let currentDir = startDir;
    
    while (currentDir !== '/') {
      const cargoTomlPath = join(currentDir, 'Cargo.toml');
      if (existsSync(cargoTomlPath)) {
        return cargoTomlPath;
      }
      currentDir = join(currentDir, '..');
    }
    
    return null;
  }

  private parseCargoToml(cargoTomlPath: string): any {
    try {
      const content = readFileSync(cargoTomlPath, 'utf-8');
      
      // Simple TOML parsing - in a real implementation, you'd use a proper TOML parser
      const lines = content.split('\n');
      const result: any = {};
      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1);
          result[currentSection] = {};
        } else if (trimmed.includes('=') && currentSection) {
          const [key, value] = trimmed.split('=', 2).map(s => s.trim());
          if (key && value) {
            const cleanKey = key.replace(/"/g, '');
            const cleanValue = value.replace(/"/g, '');
            result[currentSection][cleanKey] = cleanValue;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error parsing Cargo.toml:', error);
      return {};
    }
  }

  private getStandardLibraryMatches(searchTerm: string): PackageInfo[] {
    if (!searchTerm) return [];
    
    const matches: PackageInfo[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const moduleName of RUST_STDLIB_MODULES) {
      if (moduleName.includes(searchLower)) {
        matches.push({
          name: moduleName,
          version: 'stdlib',
          description: 'Rust standard library module',
          installed: true,
        });
      }
    }
    
    return matches;
  }

  private extractPackageNameFromImport(useStatement: string): string | null {
    // Handle Rust use statements
    const patterns = [
      /^use\s+([a-zA-Z_][a-zA-Z0-9_]*(?:::[a-zA-Z_][a-zA-Z0-9_]*)*)/,  // use package::module
      /^extern\s+crate\s+([a-zA-Z_][a-zA-Z0-9_]*)/,                    // extern crate package
    ];

    for (const pattern of patterns) {
      const match = useStatement.match(pattern);
      if (match && match[1]) {
        // Get the root crate name
        return match[1].split('::')[0] || null;
      }
    }

    return null;
  }

  private isStandardLibraryModule(packageName: string): boolean {
    return RUST_STDLIB_MODULES.has(packageName) || packageName.startsWith('std::');
  }

  private async checkPackageInCargo(packageName: string): Promise<boolean> {
    try {
      const cargoTomlPath = this.findCargoToml(process.cwd());
      
      if (!cargoTomlPath) {
        return false;
      }
      
      const cargoToml = this.parseCargoToml(cargoTomlPath);
      const dependencies = cargoToml.dependencies || {};
      const devDependencies = cargoToml['dev-dependencies'] || {};
      
      return packageName in dependencies || packageName in devDependencies;
    } catch (error) {
      return false;
    }
  }

  private async getSimilarPackages(packageName: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const cargoTomlPath = this.findCargoToml(process.cwd());
      
      if (cargoTomlPath) {
        const cargoToml = this.parseCargoToml(cargoTomlPath);
        const dependencies = cargoToml.dependencies || {};
        const devDependencies = cargoToml['dev-dependencies'] || {};
        const allDeps = { ...dependencies, ...devDependencies };
        
        // Simple similarity check
        for (const depName of Object.keys(allDeps)) {
          if (depName.includes(packageName) || packageName.includes(depName)) {
            suggestions.push(depName);
          }
        }
      }
      
      // Also check standard library
      for (const stdlibModule of RUST_STDLIB_MODULES) {
        if (stdlibModule.includes(packageName) || packageName.includes(stdlibModule)) {
          suggestions.push(stdlibModule);
        }
      }
      
    } catch (error) {
      console.debug('Error getting similar packages:', error);
    }
    
    return suggestions.slice(0, 5);
  }
}