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
 * Java standard library packages
 */
const JAVA_STDLIB_PACKAGES = new Set([
  'java.lang', 'java.util', 'java.io', 'java.net', 'java.nio', 'java.time',
  'java.text', 'java.math', 'java.security', 'java.sql', 'java.awt',
  'java.swing', 'javax.swing', 'java.applet', 'java.beans', 'java.rmi',
  'java.util.concurrent', 'java.util.regex', 'java.util.stream',
  'java.util.function', 'java.util.logging', 'java.nio.file',
  'java.nio.charset', 'java.security.cert', 'java.security.spec',
  'java.time.format', 'java.time.temporal', 'java.time.zone',
  'javax.crypto', 'javax.net', 'javax.security', 'javax.sql',
  'javax.xml', 'javax.annotation', 'javax.management', 'javax.naming',
  'javax.script', 'javax.sound', 'javax.imageio', 'javax.print',
  'javax.tools', 'javax.lang', 'javax.accessibility', 'javax.activity',
  'javax.transaction', 'org.w3c.dom', 'org.xml.sax', 'org.ietf.jgss'
]);

export class JavaDiscoveryEngine implements DiscoveryEngine {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  async discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult> {
    const cacheKey = CacheManager.generateKey('discover_java', input.searchTerm, input.includeDevDependencies, input.maxResults);
    
    // Check cache first
    const cached = this.cache.get<DiscoveryResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const packages: PackageInfo[] = [];
    
    try {
      // Try to find build files (pom.xml, build.gradle, etc.)
      const buildFile = this.findBuildFile(process.cwd());
      
      if (buildFile) {
        const dependencies = this.parseBuildFile(buildFile);
        
        // Process each dependency
        for (const dep of dependencies) {
          if (input.searchTerm && !dep.name.toLowerCase().includes(input.searchTerm.toLowerCase())) {
            continue;
          }
          
          packages.push(dep);
          
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
      console.error('Error discovering Java packages:', error);
    }

    const result: DiscoveryResult = {
      packages: packages.slice(0, input.maxResults),
      totalFound: packages.length,
      searchTerm: input.searchTerm,
      language: 'java',
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  async validateImport(input: ValidateImportInput): Promise<ValidationResult> {
    const cacheKey = CacheManager.generateKey('validate_java', input.importStatement);
    
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
      if (this.isStandardLibraryPackage(packageName)) {
        const result: ValidationResult = {
          valid: true,
          packageName,
          reason: 'Java standard library package',
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Check if package is in build file
      const isInBuildFile = await this.checkPackageInBuildFile(packageName);
      
      if (isInBuildFile) {
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
          reason: `Package '${packageName}' is not found in build dependencies`,
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
    const cacheKey = CacheManager.generateKey('introspect_java', input.moduleName);
    
    // Check cache first
    const cached = this.cache.get<ModuleInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For Java, we could use reflection or javadoc tools
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
  private findBuildFile(startDir: string): string | null {
    let currentDir = startDir;
    
    while (currentDir !== '/') {
      // Check for Maven pom.xml
      const pomXmlPath = join(currentDir, 'pom.xml');
      if (existsSync(pomXmlPath)) {
        return pomXmlPath;
      }
      
      // Check for Gradle build.gradle
      const buildGradlePath = join(currentDir, 'build.gradle');
      if (existsSync(buildGradlePath)) {
        return buildGradlePath;
      }
      
      // Check for Gradle build.gradle.kts
      const buildGradleKtsPath = join(currentDir, 'build.gradle.kts');
      if (existsSync(buildGradleKtsPath)) {
        return buildGradleKtsPath;
      }
      
      currentDir = join(currentDir, '..');
    }
    
    return null;
  }

  private parseBuildFile(buildFilePath: string): PackageInfo[] {
    const packages: PackageInfo[] = [];
    
    try {
      const content = readFileSync(buildFilePath, 'utf-8');
      const fileName = buildFilePath.split('/').pop() || '';
      
      if (fileName === 'pom.xml') {
        // Parse Maven pom.xml
        const dependencyMatches = content.match(/<dependency>[\s\S]*?<\/dependency>/g);
        
        if (dependencyMatches) {
          for (const depMatch of dependencyMatches) {
            const groupIdMatch = depMatch.match(/<groupId>(.*?)<\/groupId>/);
            const artifactIdMatch = depMatch.match(/<artifactId>(.*?)<\/artifactId>/);
            const versionMatch = depMatch.match(/<version>(.*?)<\/version>/);
            
            if (groupIdMatch && artifactIdMatch) {
              const groupId = groupIdMatch[1] || '';
              const artifactId = artifactIdMatch[1] || '';
              const version = versionMatch ? versionMatch[1] : 'latest';
              
              packages.push({
                name: `${groupId}:${artifactId}`,
                version: version || 'latest',
                installed: true,
              });
            }
          }
        }
      } else if (fileName.startsWith('build.gradle')) {
        // Parse Gradle build file
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Match dependency declarations
          const depMatch = trimmed.match(/(?:implementation|compile|api|testImplementation|testCompile)\s+['"]([^'"]+)['"]/) ||
                           trimmed.match(/(?:implementation|compile|api|testImplementation|testCompile)\s+group:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*version:\s*['"]([^'"]+)['"]/);
          
          if (depMatch) {
            if (depMatch[1] && depMatch[1].includes(':')) {
              // Format: "group:artifact:version"
              const parts = depMatch[1].split(':');
              if (parts.length >= 2) {
                packages.push({
                  name: `${parts[0]}:${parts[1]}`,
                  version: parts[2] || 'latest',
                  installed: true,
                });
              }
            } else if (depMatch[1] && depMatch[2]) {
              // Format: group: "...", name: "...", version: "..."
              packages.push({
                name: `${depMatch[1]}:${depMatch[2]}`,
                version: (depMatch[3] || 'latest'),
                installed: true,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing build file:', error);
    }
    
    return packages;
  }

  private getStandardLibraryMatches(searchTerm: string): PackageInfo[] {
    if (!searchTerm) return [];
    
    const matches: PackageInfo[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const packageName of JAVA_STDLIB_PACKAGES) {
      if (packageName.includes(searchLower)) {
        matches.push({
          name: packageName,
          version: 'stdlib',
          description: 'Java standard library package',
          installed: true,
        });
      }
    }
    
    return matches;
  }

  private extractPackageNameFromImport(importStatement: string): string | null {
    // Handle Java import statements
    const patterns = [
      /^import\s+static\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/,  // import static package.Class.method
      /^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/,           // import package.Class
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match && match[1]) {
        const fullPackage = match[1];
        // Get the package part (everything except the last component which is usually the class)
        const parts = fullPackage.split('.');
        if (parts.length > 1) {
          return parts.slice(0, -1).join('.');
        }
        return fullPackage;
      }
    }

    return null;
  }

  private isStandardLibraryPackage(packageName: string): boolean {
    return JAVA_STDLIB_PACKAGES.has(packageName) || 
           packageName.startsWith('java.') || 
           packageName.startsWith('javax.') ||
           packageName.startsWith('org.w3c.') ||
           packageName.startsWith('org.xml.') ||
           packageName.startsWith('org.ietf.');
  }

  private async checkPackageInBuildFile(packageName: string): Promise<boolean> {
    try {
      const buildFilePath = this.findBuildFile(process.cwd());
      
      if (!buildFilePath) {
        return false;
      }
      
      const dependencies = this.parseBuildFile(buildFilePath);
      
      return dependencies.some(dep => 
        dep.name.includes(packageName) || 
        packageName.includes(dep.name.split(':')[0] || '') ||
        packageName.includes(dep.name.split(':')[1] || '')
      );
    } catch (error) {
      return false;
    }
  }

  private async getSimilarPackages(packageName: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const buildFilePath = this.findBuildFile(process.cwd());
      
      if (buildFilePath) {
        const dependencies = this.parseBuildFile(buildFilePath);
        
        // Simple similarity check
        for (const dep of dependencies) {
          if (dep.name.includes(packageName) || packageName.includes(dep.name)) {
            suggestions.push(dep.name);
          }
        }
      }
      
      // Also check standard library
      for (const stdlibPackage of JAVA_STDLIB_PACKAGES) {
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