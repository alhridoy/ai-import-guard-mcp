/**
 * List of Node.js built-in modules
 * This list is based on Node.js v18+ built-in modules
 */
export const NODE_BUILTIN_MODULES = new Set([
  // Core modules
  'assert',
  'assert/strict',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'dns/promises',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'readline/promises',
  'repl',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
  
  // Node.js 16+ additions
  'stream/consumers',
  'stream/web',
  'util/types',
  
  // Node.js 18+ additions
  'node:test',
  'test',
  
  // With node: prefix
  'node:assert',
  'node:assert/strict',
  'node:async_hooks',
  'node:buffer',
  'node:child_process',
  'node:cluster',
  'node:console',
  'node:constants',
  'node:crypto',
  'node:dgram',
  'node:diagnostics_channel',
  'node:dns',
  'node:dns/promises',
  'node:domain',
  'node:events',
  'node:fs',
  'node:fs/promises',
  'node:http',
  'node:http2',
  'node:https',
  'node:inspector',
  'node:module',
  'node:net',
  'node:os',
  'node:path',
  'node:path/posix',
  'node:path/win32',
  'node:perf_hooks',
  'node:process',
  'node:punycode',
  'node:querystring',
  'node:readline',
  'node:readline/promises',
  'node:repl',
  'node:stream',
  'node:stream/promises',
  'node:stream/web',
  'node:string_decoder',
  'node:sys',
  'node:timers',
  'node:timers/promises',
  'node:tls',
  'node:trace_events',
  'node:tty',
  'node:url',
  'node:util',
  'node:util/types',
  'node:v8',
  'node:vm',
  'node:wasi',
  'node:worker_threads',
  'node:zlib',
  'node:stream/consumers',
  'node:stream/web',
  'node:util/types'
]);

/**
 * Check if a module name is a Node.js built-in module
 */
export function isNodeBuiltinModule(moduleName: string): boolean {
  return NODE_BUILTIN_MODULES.has(moduleName);
}

/**
 * Get information about a built-in module
 */
export function getBuiltinModuleInfo(moduleName: string): {
  name: string;
  isBuiltin: boolean;
  description?: string;
  category?: string;
} {
  const isBuiltin = isNodeBuiltinModule(moduleName);
  
  if (!isBuiltin) {
    return {
      name: moduleName,
      isBuiltin: false
    };
  }

  // Remove node: prefix for description lookup
  const cleanName = moduleName.replace('node:', '');
  
  const descriptions: Record<string, { description: string; category: string }> = {
    'assert': { description: 'Assertion testing utilities', category: 'testing' },
    'async_hooks': { description: 'Async resource lifecycle tracking', category: 'utility' },
    'buffer': { description: 'Binary data handling', category: 'utility' },
    'child_process': { description: 'Child process spawning', category: 'system' },
    'cluster': { description: 'Child process clustering', category: 'system' },
    'console': { description: 'Console utilities', category: 'utility' },
    'constants': { description: 'System constants', category: 'system' },
    'crypto': { description: 'Cryptographic functionality', category: 'security' },
    'dgram': { description: 'UDP/datagram sockets', category: 'network' },
    'diagnostics_channel': { description: 'Diagnostics channel API', category: 'utility' },
    'dns': { description: 'DNS lookups', category: 'network' },
    'domain': { description: 'Domain error handling', category: 'utility' },
    'events': { description: 'Event emitter', category: 'utility' },
    'fs': { description: 'File system operations', category: 'system' },
    'http': { description: 'HTTP server and client', category: 'network' },
    'http2': { description: 'HTTP/2 server and client', category: 'network' },
    'https': { description: 'HTTPS server and client', category: 'network' },
    'inspector': { description: 'Inspector API', category: 'utility' },
    'module': { description: 'Module system utilities', category: 'system' },
    'net': { description: 'TCP networking', category: 'network' },
    'os': { description: 'Operating system utilities', category: 'system' },
    'path': { description: 'File path utilities', category: 'utility' },
    'perf_hooks': { description: 'Performance measurement', category: 'utility' },
    'process': { description: 'Process object', category: 'system' },
    'punycode': { description: 'Punycode encoding/decoding', category: 'utility' },
    'querystring': { description: 'Query string utilities', category: 'utility' },
    'readline': { description: 'Readline interface', category: 'utility' },
    'repl': { description: 'Read-eval-print loop', category: 'utility' },
    'stream': { description: 'Streaming data', category: 'utility' },
    'string_decoder': { description: 'String decoder', category: 'utility' },
    'sys': { description: 'System utilities (deprecated)', category: 'system' },
    'timers': { description: 'Timer functions', category: 'utility' },
    'tls': { description: 'TLS/SSL encryption', category: 'security' },
    'trace_events': { description: 'Trace events', category: 'utility' },
    'tty': { description: 'TTY utilities', category: 'system' },
    'url': { description: 'URL parsing', category: 'utility' },
    'util': { description: 'Utility functions', category: 'utility' },
    'v8': { description: 'V8 engine utilities', category: 'system' },
    'vm': { description: 'Virtual machine context', category: 'system' },
    'wasi': { description: 'WebAssembly System Interface', category: 'system' },
    'worker_threads': { description: 'Worker threads', category: 'system' },
    'zlib': { description: 'Compression utilities', category: 'utility' },
    'test': { description: 'Test runner', category: 'testing' }
  };

  const info = descriptions[cleanName] || { 
    description: 'Node.js built-in module', 
    category: 'system' 
  };

  return {
    name: moduleName,
    isBuiltin: true,
    description: info.description,
    category: info.category
  };
}

/**
 * Get all built-in modules grouped by category
 */
export function getBuiltinModulesByCategory(): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  // Process only modules without node: prefix to avoid duplicates
  const modules = Array.from(NODE_BUILTIN_MODULES).filter(mod => !mod.startsWith('node:'));
  
  modules.forEach(moduleName => {
    const info = getBuiltinModuleInfo(moduleName);
    const category = info.category || 'other';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push(moduleName);
  });
  
  return categories;
}