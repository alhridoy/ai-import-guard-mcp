import { z } from 'zod';

// Core affordance types
export const PackageInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  main: z.string().optional(),
  types: z.string().optional(),
  exports: z.record(z.any()).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  installed: z.boolean(),
  path: z.string().optional(),
});

export const ModuleExportSchema = z.object({
  name: z.string(),
  type: z.enum(['function', 'class', 'constant', 'type', 'interface', 'namespace']),
  signature: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    optional: z.boolean().default(false),
    description: z.string().optional(),
  })).optional(),
  returnType: z.string().optional(),
});

export const ModuleInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  exports: z.array(ModuleExportSchema),
  submodules: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

export const DiscoveryResultSchema = z.object({
  packages: z.array(PackageInfoSchema),
  totalFound: z.number(),
  searchTerm: z.string().optional(),
  language: z.enum(['javascript', 'python', 'rust', 'go', 'java']),
  timestamp: z.string(),
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  packageName: z.string(),
  modulePath: z.string().optional(),
  reason: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

// Tool input schemas
export const DiscoverPackagesInputSchema = z.object({
  language: z.enum(['javascript', 'python', 'rust', 'go', 'java']).default('javascript'),
  searchTerm: z.string().optional(),
  includeDevDependencies: z.boolean().default(false),
  maxResults: z.number().min(1).max(100).default(50),
});

export const ValidateImportInputSchema = z.object({
  importStatement: z.string(),
  language: z.enum(['javascript', 'python', 'rust', 'go', 'java']).default('javascript'),
  projectPath: z.string().optional(),
});

export const IntrospectModuleInputSchema = z.object({
  moduleName: z.string(),
  language: z.enum(['javascript', 'python', 'rust', 'go', 'java']).default('javascript'),
  includePrivate: z.boolean().default(false),
  maxDepth: z.number().min(1).max(5).default(2),
});

export const SearchAffordancesInputSchema = z.object({
  query: z.string(),
  language: z.enum(['javascript', 'python', 'rust', 'go', 'java']).default('javascript'),
  category: z.enum(['ui', 'data', 'network', 'testing', 'build', 'utility', 'all']).default('all'),
  maxResults: z.number().min(1).max(50).default(20),
});

// Type exports
export type PackageInfo = z.infer<typeof PackageInfoSchema>;
export type ModuleExport = z.infer<typeof ModuleExportSchema>;
export type ModuleInfo = z.infer<typeof ModuleInfoSchema>;
export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export type DiscoverPackagesInput = z.infer<typeof DiscoverPackagesInputSchema>;
export type ValidateImportInput = z.infer<typeof ValidateImportInputSchema>;
export type IntrospectModuleInput = z.infer<typeof IntrospectModuleInputSchema>;
export type SearchAffordancesInput = z.infer<typeof SearchAffordancesInputSchema>;

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
}

// Discovery engine interface
export interface DiscoveryEngine {
  discoverPackages(input: DiscoverPackagesInput): Promise<DiscoveryResult>;
  validateImport(input: ValidateImportInput): Promise<ValidationResult>;
  introspectModule(input: IntrospectModuleInput): Promise<ModuleInfo>;
  searchAffordances(input: SearchAffordancesInput): Promise<DiscoveryResult>;
}
