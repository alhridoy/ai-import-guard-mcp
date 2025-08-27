import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { CacheManager } from '../cache.js';
import { ASTParser } from '../parsers/ast-parser.js';
import { isNodeBuiltinModule, getBuiltinModuleInfo } from '../utils/builtin-modules.js';
import { searchPackagesSemanticaly, enhancePackageInfo } from '../utils/semantic-search.js';
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

export class JavaScriptDiscoveryEngine implements DiscoveryEngine {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  async discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult> {
    const cacheKey = CacheManager.generateKey('discover', input.language, input.searchTerm, input.includeDevDependencies, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const packages: PackageInfo[] = [];
    
    try {
      // Find package.json in current directory or parent directories
      const packageJsonPath = this.findPackageJson(process.cwd());
      
      if (packageJsonPath) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const projectRoot = dirname(packageJsonPath);
        
        // Get installed packages from package.json
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {}; // Always include devDeps for validation
        const allDeps = { ...dependencies, ...devDependencies };
        
        // Process each dependency
        for (const [name, version] of Object.entries(allDeps)) {
          if (input.searchTerm && !name.toLowerCase().includes(input.searchTerm.toLowerCase())) {
            continue;
          }
          
          const packageInfo = await this.getPackageInfo(name, version as string, projectRoot);
          if (packageInfo) {
            packages.push(packageInfo);
          }
          
          if (packages.length >= input.maxResults) {
            break;
          }
        }
      }
      
      // Also check globally installed packages
      if (packages.length < input.maxResults) {
        const globalPackages = await this.getGlobalPackages(input.searchTerm, input.maxResults - packages.length);
        packages.push(...globalPackages);
      }
      
    } catch (error) {
      console.error('Error discovering packages:', error);
    }

    const result: DiscoveryResult = {
      packages: packages.slice(0, input.maxResults),
      totalFound: packages.length,
      searchTerm: input.searchTerm,
      language: 'javascript',
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  async validateImport(input: ValidateImportInput): Promise<ValidationResult> {
    const cacheKey = CacheManager.generateKey('validate', input.importStatement, input.language, input.projectPath);
    
    // Check cache first
    const cached = this.cache.get<ValidationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Parse the import statement to extract package name
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

      // Check if package exists
      const projectRoot = input.projectPath || process.cwd();
      const packageExists = await this.checkPackageExists(packageName, projectRoot);
      
      if (packageExists) {
        const modulePath = this.resolveModulePath(packageName, projectRoot);
        const result: ValidationResult = {
          valid: true,
          packageName,
          modulePath: modulePath || undefined,
        };
        
        // Add additional info for built-in modules
        if (isNodeBuiltinModule(packageName)) {
          const builtinInfo = getBuiltinModuleInfo(packageName);
          result.reason = `Built-in Node.js module: ${builtinInfo.description}`;
        }
        
        this.cache.set(cacheKey, result);
        return result;
      } else {
        const suggestions = await this.getSimilarPackages(packageName);
        const result: ValidationResult = {
          valid: false,
          packageName,
          reason: `Package '${packageName}' is not installed or available`,
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
    const cacheKey = CacheManager.generateKey('introspect', input.moduleName, input.language, input.includePrivate, input.maxDepth);
    
    // Check cache first
    const cached = this.cache.get<ModuleInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const modulePath = this.resolveModulePath(input.moduleName, process.cwd());
      const exports = await this.analyzeModuleExports(input.moduleName, modulePath, input.includePrivate);
      
      const result: ModuleInfo = {
        name: input.moduleName,
        path: modulePath || '',
        exports,
        submodules: await this.findSubmodules(input.moduleName, modulePath),
        dependencies: await this.getModuleDependencies(input.moduleName),
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
    const cacheKey = CacheManager.generateKey('searchAffordances', input.query, input.language, input.category, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // First get all available packages
    const allPackagesResult = await this.discoverPackages({
      language: input.language,
      searchTerm: '', // Get all packages
      includeDevDependencies: true,
      maxResults: 1000, // Get more packages for better semantic search
    });

    // Enhance packages with semantic information
    const enhancedPackages = allPackagesResult.packages.map(pkg => 
      enhancePackageInfo(pkg, input.query)
    );

    // Use semantic search to find best matches
    const searchResults = searchPackagesSemanticaly(
      input.query,
      enhancedPackages,
      input.category,
      input.maxResults
    );

    const result: DiscoveryResult = {
      packages: searchResults,
      totalFound: searchResults.length,
      searchTerm: input.query,
      language: input.language,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  // Helper methods
  private findPackageJson(startDir: string): string | null {
    let currentDir = startDir;
    
    while (currentDir !== '/') {
      const packageJsonPath = join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
      currentDir = dirname(currentDir);
    }
    
    return null;
  }

  private async getPackageInfo(name: string, version: string, projectRoot: string): Promise<PackageInfo | null> {
    try {
      const packagePath = join(projectRoot, 'node_modules', name);
      const packageJsonPath = join(packagePath, 'package.json');
      
      if (!existsSync(packageJsonPath)) {
        return {
          name,
          version,
          installed: false,
        };
      }
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      return {
        name,
        version: packageJson.version || version,
        description: packageJson.description,
        main: packageJson.main,
        types: packageJson.types || packageJson.typings,
        exports: packageJson.exports,
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        installed: true,
        path: packagePath,
      };
      
    } catch (error) {
      return {
        name,
        version,
        installed: false,
      };
    }
  }

  private async getGlobalPackages(searchTerm?: string, maxResults: number = 10): Promise<PackageInfo[]> {
    try {
      const output = execSync('npm list -g --depth=0 --json', { encoding: 'utf-8' });
      const globalPackages = JSON.parse(output);
      const packages: PackageInfo[] = [];
      
      if (globalPackages.dependencies) {
        for (const [name, info] of Object.entries(globalPackages.dependencies)) {
          if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue;
          }
          
          const packageInfo = info as any;
          packages.push({
            name,
            version: packageInfo.version || 'unknown',
            installed: true,
            path: packageInfo.path,
          });
          
          if (packages.length >= maxResults) {
            break;
          }
        }
      }
      
      return packages;
    } catch (error) {
      return [];
    }
  }

  private extractPackageNameFromImport(importStatement: string): string | null {
    // Handle various import patterns
    const patterns = [
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/,  // import ... from 'package'
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/,     // import('package')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,    // require('package')
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match && match[1]) {
        const fullPath = match[1];
        // Extract package name (handle scoped packages)
        if (fullPath.startsWith('@')) {
          const parts = fullPath.split('/');
          return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : fullPath;
        } else {
          return fullPath.split('/')[0] || null;
        }
      }
    }

    return null;
  }

  private async checkPackageExists(packageName: string, projectRoot: string): Promise<boolean> {
    try {
      // Check if it's a Node.js built-in module first
      if (isNodeBuiltinModule(packageName)) {
        return true;
      }
      
      // Check in node_modules
      const packagePath = join(projectRoot, 'node_modules', packageName);
      if (existsSync(packagePath)) {
        return true;
      }
      
      // Try to resolve using Node.js resolution
      try {
        require.resolve(packageName, { paths: [projectRoot] });
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  private resolveModulePath(moduleName: string, projectRoot: string): string | null {
    try {
      return require.resolve(moduleName, { paths: [projectRoot] });
    } catch {
      return null;
    }
  }

  private async getSimilarPackages(packageName: string): Promise<string[]> {
    // Simple similarity check - in a real implementation, you might use fuzzy matching
    try {
      const packageJsonPath = this.findPackageJson(process.cwd());
      if (!packageJsonPath) return [];
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      return Object.keys(allDeps)
        .filter(name => name.includes(packageName) || packageName.includes(name))
        .slice(0, 5);
    } catch {
      return [];
    }
  }

  private async analyzeModuleExports(moduleName: string, modulePath: string | null, includePrivate: boolean): Promise<ModuleExport[]> {
    const exports: ModuleExport[] = [];
    
    try {
      // Check if it's a built-in module
      if (isNodeBuiltinModule(moduleName)) {
        const builtinInfo = getBuiltinModuleInfo(moduleName);
        exports.push({
          name: 'default',
          type: 'namespace',
          signature: moduleName,
          description: builtinInfo.description
        });
        return exports;
      }
      
      if (modulePath) {
        // Try AST parsing first for better results
        try {
          const astResult = await ASTParser.parseFile(modulePath);
          
          // Filter private exports if needed
          const filteredExports = astResult.exports.filter(exp => 
            includePrivate || !exp.name.startsWith('_')
          );
          
          exports.push(...filteredExports);
          
          // If we got good results from AST, return them
          if (exports.length > 0) {
            return exports;
          }
        } catch (astError) {
          console.debug(`AST parsing failed for ${modulePath}, falling back to dynamic import:`, astError);
        }
        
        // Fallback: try to dynamically import and analyze the module
        try {
          const module = await import(modulePath);
          
          for (const [key, value] of Object.entries(module)) {
            if (!includePrivate && key.startsWith('_')) {
              continue;
            }
            
            const type = typeof value === 'function' ? 'function' : 
                        typeof value === 'object' && value?.constructor?.name === 'Object' ? 'namespace' :
                        'constant';
            
            exports.push({
              name: key,
              type,
              signature: type === 'function' ? `${key}()` : undefined,
            });
          }
        } catch (importError) {
          console.debug(`Dynamic import failed for ${modulePath}:`, importError);
        }
      }
      
      // Final fallback: try to read package.json exports
      if (exports.length === 0) {
        try {
          const packagePath = join(dirname(modulePath || ''), 'package.json');
          if (existsSync(packagePath)) {
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
            if (packageJson.exports) {
              for (const exportPath of Object.keys(packageJson.exports)) {
                exports.push({
                  name: exportPath === '.' ? 'default' : exportPath,
                  type: 'namespace',
                });
              }
            }
          }
        } catch {
          // Ignore errors
        }
      }
    } catch (error) {
      console.error(`Error analyzing module exports for ${moduleName}:`, error);
    }
    
    return exports;
  }

  private async findSubmodules(moduleName: string, modulePath: string | null): Promise<string[]> {
    if (!modulePath) return [];
    
    try {
      const moduleDir = dirname(modulePath);
      const files = readdirSync(moduleDir);
      
      return files
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        .filter(file => file !== 'index.js' && file !== 'index.ts')
        .map(file => file.replace(/\.(js|ts)$/, ''))
        .slice(0, 10); // Limit results
    } catch {
      return [];
    }
  }

  private async getModuleDependencies(moduleName: string): Promise<string[]> {
    try {
      const packagePath = join(process.cwd(), 'node_modules', moduleName, 'package.json');
      if (existsSync(packagePath)) {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        return Object.keys(packageJson.dependencies || {});
      }
    } catch {
      // Ignore errors
    }
    return [];
  }
}
