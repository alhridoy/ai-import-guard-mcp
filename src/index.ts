#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DiscoveryEngineFactory } from './engines/factory.js';
import { CacheManager } from './cache.js';
import {
  DiscoverPackagesInputSchema,
  ValidateImportInputSchema,
  IntrospectModuleInputSchema,
  SearchAffordancesInputSchema,
} from './types.js';

class AffordanceDiscoveryServer {
  private server: Server;
  private engineFactory: DiscoveryEngineFactory;
  private cache: CacheManager;

  constructor() {
    this.server = new Server(
      {
        name: 'affordance-discovery-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cache = new CacheManager({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
    });

    this.engineFactory = new DiscoveryEngineFactory(this.cache);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'discover_packages',
            description: 'Discover available packages in the current environment',
            inputSchema: {
              type: 'object',
              properties: {
                language: {
                  type: 'string',
                  enum: ['javascript', 'python', 'rust', 'go', 'java'],
                  default: 'javascript',
                  description: 'Programming language to search packages for',
                },
                searchTerm: {
                  type: 'string',
                  description: 'Optional search term to filter packages',
                },
                includeDevDependencies: {
                  type: 'boolean',
                  default: false,
                  description: 'Include development dependencies in results',
                },
                maxResults: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  default: 50,
                  description: 'Maximum number of results to return',
                },
              },
            },
          },
          {
            name: 'validate_import',
            description: 'Validate if a specific import statement is valid in the current environment',
            inputSchema: {
              type: 'object',
              properties: {
                importStatement: {
                  type: 'string',
                  description: 'The import statement to validate (e.g., "import React from \'react\'")',
                },
                language: {
                  type: 'string',
                  enum: ['javascript', 'python', 'rust', 'go', 'java'],
                  default: 'javascript',
                  description: 'Programming language of the import',
                },
                projectPath: {
                  type: 'string',
                  description: 'Optional path to the project root',
                },
              },
              required: ['importStatement'],
            },
          },
          {
            name: 'introspect_module',
            description: 'Get detailed information about a module\'s exports and structure',
            inputSchema: {
              type: 'object',
              properties: {
                moduleName: {
                  type: 'string',
                  description: 'Name of the module to introspect',
                },
                language: {
                  type: 'string',
                  enum: ['javascript', 'python', 'rust', 'go', 'java'],
                  default: 'javascript',
                  description: 'Programming language of the module',
                },
                includePrivate: {
                  type: 'boolean',
                  default: false,
                  description: 'Include private/internal exports',
                },
                maxDepth: {
                  type: 'number',
                  minimum: 1,
                  maximum: 5,
                  default: 2,
                  description: 'Maximum depth for nested introspection',
                },
              },
              required: ['moduleName'],
            },
          },
          {
            name: 'search_affordances',
            description: 'Search for packages and modules by functionality or category',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query describing the desired functionality',
                },
                language: {
                  type: 'string',
                  enum: ['javascript', 'python', 'rust', 'go', 'java'],
                  default: 'javascript',
                  description: 'Programming language to search in',
                },
                category: {
                  type: 'string',
                  enum: ['ui', 'data', 'network', 'testing', 'build', 'utility', 'all'],
                  default: 'all',
                  description: 'Category to filter results by',
                },
                maxResults: {
                  type: 'number',
                  minimum: 1,
                  maximum: 50,
                  default: 20,
                  description: 'Maximum number of results to return',
                },
              },
              required: ['query'],
            },
          },
        ] satisfies Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'discover_packages': {
            const input = DiscoverPackagesInputSchema.parse(args);
            const engine = this.engineFactory.getEngine(input.language);
            const result = await engine.discoverPackages(input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'validate_import': {
            const input = ValidateImportInputSchema.parse(args);
            const engine = this.engineFactory.getEngine(input.language);
            const result = await engine.validateImport(input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'introspect_module': {
            const input = IntrospectModuleInputSchema.parse(args);
            const engine = this.engineFactory.getEngine(input.language);
            const result = await engine.introspectModule(input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'search_affordances': {
            const input = SearchAffordancesInputSchema.parse(args);
            const engine = this.engineFactory.getEngine(input.language);
            const result = await engine.searchAffordances(input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: errorMessage,
                tool: name,
                arguments: args,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Affordance Discovery MCP Server running on stdio');
  }
}

// Start the server
const server = new AffordanceDiscoveryServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
