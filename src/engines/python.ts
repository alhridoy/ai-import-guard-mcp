import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
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
 * Python standard library modules
 */
const PYTHON_STDLIB_MODULES = new Set([
  'os', 'sys', 'json', 'datetime', 'time', 'math', 'random', 'collections',
  'itertools', 'functools', 'operator', 'copy', 'pickle', 'csv', 'xml',
  'sqlite3', 'threading', 'multiprocessing', 'asyncio', 'concurrent',
  'urllib', 'http', 'email', 'html', 'xml', 'pathlib', 'shutil', 'glob',
  'tempfile', 'zipfile', 'tarfile', 'gzip', 'bz2', 'lzma', 'subprocess',
  'io', 'logging', 'warnings', 'traceback', 'unittest', 'doctest',
  'pdb', 'profile', 'pstats', 'timeit', 'argparse', 'configparser',
  'getopt', 'optparse', 'socket', 'ssl', 'hashlib', 'hmac', 'secrets',
  'base64', 'binascii', 'struct', 'codecs', 'unicodedata', 'stringprep',
  'readline', 'rlcompleter', 'cmd', 'shlex', 'queue', 'sched', 'mutex',
  'contextvars', 'decimal', 'fractions', 'statistics', 'array', 'weakref',
  'gc', 'inspect', 'site', 'imp', 'importlib', 'pkgutil', 'modulefinder',
  'runpy', 'ast', 'keyword', 'token', 'tokenize', 'parser', 'symbol',
  'dis', 'pickletools', 'py_compile', 'compileall', 'marshal', 'types',
  'enum', 'dataclasses', 'typing', 'typing_extensions', 'abc', 'numbers',
  'zlib', 'gzip', 'bz2', 'lzma', 'zipfile', 'tarfile'
]);

export class PythonDiscoveryEngine implements DiscoveryEngine {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  async discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult> {
    const cacheKey = CacheManager.generateKey('discover_python', input.searchTerm, input.includeDevDependencies, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const packages: PackageInfo[] = [];
    
    try {
      // Get installed packages using pip
      const installedPackages = await this.getInstalledPackages();
      
      // Filter by search term if provided
      const filteredPackages = input.searchTerm 
        ? installedPackages.filter(pkg => 
            pkg.name.toLowerCase().includes(input.searchTerm!.toLowerCase()) ||
            (pkg.description && pkg.description.toLowerCase().includes(input.searchTerm!.toLowerCase()))
          )
        : installedPackages;
      
      packages.push(...filteredPackages.slice(0, input.maxResults));
      
      // Add standard library modules if they match the search
      if (packages.length < input.maxResults) {
        const stdlibMatches = this.getStandardLibraryMatches(input.searchTerm || '');
        packages.push(...stdlibMatches.slice(0, input.maxResults - packages.length));
      }
      
    } catch (error) {
      console.error('Error discovering Python packages:', error);
    }

    const result: DiscoveryResult = {
      packages: packages.slice(0, input.maxResults),
      totalFound: packages.length,
      searchTerm: input.searchTerm,
      language: 'python',
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  async validateImport(input: ValidateImportInput): Promise<ValidationResult> {
    const cacheKey = CacheManager.generateKey('validate_python', input.importStatement);
    
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

      // Check if it's a standard library module
      if (PYTHON_STDLIB_MODULES.has(packageName)) {
        const result: ValidationResult = {
          valid: true,
          packageName,
          reason: 'Python standard library module',
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if package is installed
      const isInstalled = await this.checkPackageInstalled(packageName);
      
      if (isInstalled) {
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
          reason: `Package '${packageName}' is not installed`,
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
    const cacheKey = CacheManager.generateKey('introspect_python', input.moduleName);
    
    // Check cache first
    const cached = this.cache.get<ModuleInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const exports = await this.getModuleExports(input.moduleName);
      const dependencies = await this.getModuleDependencies(input.moduleName);
      
      const result: ModuleInfo = {
        name: input.moduleName,
        path: await this.getModulePath(input.moduleName) || '',
        exports,
        submodules: [],
        dependencies,
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
  private async getInstalledPackages(): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];
    
    try {
      // Try pip list first
      const output = execSync('pip list --format=json', { encoding: 'utf-8' });
      const pipPackages = JSON.parse(output);
      
      for (const pkg of pipPackages) {
        packages.push({
          name: pkg.name,
          version: pkg.version,
          installed: true,
        });
      }
    } catch (error) {
      console.debug('Failed to get pip packages:', error);
      
      // Fallback: try conda list
      try {
        const condaOutput = execSync('conda list --json', { encoding: 'utf-8' });
        const condaPackages = JSON.parse(condaOutput);
        
        for (const pkg of condaPackages) {
          packages.push({
            name: pkg.name,
            version: pkg.version,
            installed: true,
          });
        }
      } catch (condaError) {
        console.debug('Failed to get conda packages:', condaError);
      }
    }
    
    return packages;
  }

  private getStandardLibraryMatches(searchTerm: string): PackageInfo[] {
    if (!searchTerm) return [];
    
    const matches: PackageInfo[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const moduleName of PYTHON_STDLIB_MODULES) {
      if (moduleName.includes(searchLower)) {
        matches.push({
          name: moduleName,
          version: 'stdlib',
          description: 'Python standard library module',
          installed: true,
        });
      }
    }
    
    return matches;
  }

  private extractPackageNameFromImport(importStatement: string): string | null {
    // Handle various Python import patterns
    const patterns = [
      /^from\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+import/,  // from package import ...
      /^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/,         // import package
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match && match[1]) {
        // Get the root package name
        return match[1].split('.')[0] || null;
      }
    }

    return null;
  }

  private async checkPackageInstalled(packageName: string): Promise<boolean> {
    try {
      // Use Python to check if module can be imported
      const result = execSync(`python -c "import ${packageName}"`, { encoding: 'utf-8' });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getSimilarPackages(packageName: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const installedPackages = await this.getInstalledPackages();
      
      // Simple similarity check
      for (const pkg of installedPackages) {
        if (pkg.name.includes(packageName) || packageName.includes(pkg.name)) {
          suggestions.push(pkg.name);
        }
      }
      
      // Also check standard library
      for (const stdlibModule of PYTHON_STDLIB_MODULES) {
        if (stdlibModule.includes(packageName) || packageName.includes(stdlibModule)) {
          suggestions.push(stdlibModule);
        }
      }
      
    } catch (error) {
      console.debug('Error getting similar packages:', error);
    }
    
    return suggestions.slice(0, 5);
  }

  private async getModuleExports(moduleName: string): Promise<ModuleExport[]> {
    const exports: ModuleExport[] = [];
    
    try {
      // Use Python introspection to get module members
      const script = `
import inspect
import ${moduleName}

members = inspect.getmembers(${moduleName})
for name, obj in members:
    if not name.startswith('_'):
        obj_type = 'function' if inspect.isfunction(obj) else 'class' if inspect.isclass(obj) else 'constant'
        signature = str(inspect.signature(obj)) if inspect.isfunction(obj) else ''
        print(f"{name}|{obj_type}|{signature}")
      `;
      
      const output = execSync(`python -c "${script}"`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const [name, type, signature] = line.split('|');
          exports.push({
            name: name || '',
            type: type as any,
            signature: signature || undefined,
          });
        }
      }
    } catch (error) {
      console.debug(`Error getting exports for ${moduleName}:`, error);
    }
    
    return exports;
  }

  private async getModulePath(moduleName: string): Promise<string | null> {
    try {
      const output = execSync(`python -c "import ${moduleName}; print(${moduleName}.__file__)"`, { encoding: 'utf-8' });
      return output.trim() || null;
    } catch (error) {
      return null;
    }
  }

  private async getModuleDependencies(moduleName: string): Promise<string[]> {
    // This is a simplified implementation
    // In practice, you'd want to parse requirements.txt or setup.py
    return [];
  }
}