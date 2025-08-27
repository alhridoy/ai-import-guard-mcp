import { PackageInfo } from '../types.js';

/**
 * Package categories and their associated keywords
 */
const PACKAGE_CATEGORIES = {
  ui: {
    keywords: ['react', 'vue', 'angular', 'component', 'ui', 'interface', 'design', 'styled', 'css', 'bootstrap', 'material', 'antd', 'chakra', 'semantic', 'tailwind', 'theme', 'layout', 'grid', 'flex', 'button', 'form', 'input', 'modal', 'dropdown', 'menu', 'navigation', 'chart', 'graph', 'visualization', 'datepicker', 'calendar', 'slider', 'tooltip', 'popover', 'toast', 'notification', 'animation', 'transition', 'icon', 'image', 'gallery', 'carousel', 'slider', 'accordion', 'tabs', 'pagination', 'table', 'grid', 'list'],
    weight: 1.0
  },
  data: {
    keywords: ['database', 'sql', 'nosql', 'mongodb', 'postgres', 'mysql', 'redis', 'orm', 'query', 'schema', 'migration', 'json', 'xml', 'csv', 'parser', 'serialization', 'validation', 'transform', 'filter', 'sort', 'aggregate', 'cache', 'storage', 'persistence', 'indexing', 'search', 'elasticsearch', 'solr', 'lucene', 'analytics', 'metrics', 'logging', 'monitoring', 'backup', 'sync', 'replication'],
    weight: 1.0
  },
  network: {
    keywords: ['http', 'https', 'request', 'client', 'server', 'api', 'rest', 'graphql', 'websocket', 'socket', 'tcp', 'udp', 'proxy', 'middleware', 'cors', 'auth', 'jwt', 'oauth', 'session', 'cookie', 'express', 'koa', 'fastify', 'hapi', 'nest', 'apollo', 'axios', 'fetch', 'superagent', 'request', 'curl', 'download', 'upload', 'stream', 'chunk', 'compress', 'gzip', 'deflate', 'ssl', 'tls', 'certificate', 'encryption', 'security'],
    weight: 1.0
  },
  testing: {
    keywords: ['test', 'testing', 'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'selenium', 'playwright', 'puppeteer', 'mock', 'stub', 'spy', 'fixture', 'assertion', 'expect', 'should', 'coverage', 'benchmark', 'performance', 'load', 'stress', 'unit', 'integration', 'e2e', 'snapshot', 'runner', 'framework', 'suite', 'spec', 'describe', 'it', 'before', 'after', 'setup', 'teardown'],
    weight: 1.0
  },
  build: {
    keywords: ['build', 'webpack', 'rollup', 'vite', 'parcel', 'babel', 'typescript', 'compiler', 'transpiler', 'bundler', 'minify', 'optimize', 'uglify', 'terser', 'postcss', 'sass', 'less', 'stylus', 'plugin', 'loader', 'preset', 'config', 'eslint', 'prettier', 'lint', 'format', 'gulp', 'grunt', 'task', 'runner', 'deploy', 'ci', 'cd', 'github', 'actions', 'jenkins', 'travis', 'circle'],
    weight: 1.0
  },
  utility: {
    keywords: ['util', 'helper', 'lodash', 'underscore', 'ramda', 'moment', 'date', 'time', 'format', 'parse', 'string', 'number', 'math', 'crypto', 'hash', 'uuid', 'guid', 'random', 'color', 'path', 'file', 'directory', 'fs', 'stream', 'buffer', 'array', 'object', 'collection', 'functional', 'promise', 'async', 'await', 'throttle', 'debounce', 'retry', 'queue', 'stack', 'tree', 'graph', 'algorithm', 'sort', 'search', 'binary', 'regex', 'pattern', 'match'],
    weight: 1.0
  }
};

/**
 * Functionality-based search terms and their associated packages
 */
const FUNCTIONALITY_MAPPINGS = {
  // HTTP/API related
  'http client': ['axios', 'node-fetch', 'superagent', 'got', 'request'],
  'http server': ['express', 'koa', 'fastify', 'hapi', 'nest'],
  'api testing': ['supertest', 'nock', 'msw', 'jest'],
  'websocket': ['ws', 'socket.io', 'socketio'],
  'graphql': ['graphql', 'apollo-server', 'apollo-client', 'relay'],
  
  // Database related
  'database': ['mongoose', 'sequelize', 'typeorm', 'prisma', 'knex'],
  'mongodb': ['mongoose', 'mongodb'],
  'postgresql': ['pg', 'sequelize', 'typeorm', 'prisma'],
  'mysql': ['mysql', 'mysql2', 'sequelize', 'typeorm'],
  'redis': ['redis', 'ioredis'],
  'orm': ['sequelize', 'typeorm', 'prisma', 'objection'],
  
  // UI/Frontend related
  'react': ['react', 'react-dom', 'react-router', 'react-redux', 'styled-components'],
  'vue': ['vue', 'vue-router', 'vuex', 'nuxt'],
  'angular': ['@angular/core', '@angular/common', '@angular/router'],
  'ui components': ['antd', 'material-ui', 'chakra-ui', 'semantic-ui-react'],
  'styling': ['styled-components', 'emotion', 'tailwindcss', 'bootstrap'],
  'animation': ['framer-motion', 'react-spring', 'lottie-react', 'gsap'],
  'charts': ['chart.js', 'recharts', 'd3', 'plotly.js'],
  
  // Testing related
  'testing': ['jest', 'mocha', 'chai', 'jasmine', 'vitest'],
  'e2e testing': ['cypress', 'playwright', 'puppeteer', 'selenium-webdriver'],
  'mocking': ['jest', 'sinon', 'msw', 'nock'],
  
  // Build/Dev tools
  'bundling': ['webpack', 'rollup', 'vite', 'parcel', 'esbuild'],
  'transpiling': ['babel', 'typescript', 'swc'],
  'linting': ['eslint', 'prettier', 'jshint', 'tslint'],
  'task runner': ['gulp', 'grunt', 'npm-run-all'],
  
  // Utility
  'date handling': ['moment', 'date-fns', 'dayjs', 'luxon'],
  'validation': ['joi', 'yup', 'zod', 'ajv'],
  'logging': ['winston', 'pino', 'bunyan', 'debug'],
  'utilities': ['lodash', 'underscore', 'ramda', 'rxjs'],
  'file processing': ['fs-extra', 'glob', 'chokidar', 'sharp'],
  'crypto': ['crypto-js', 'bcrypt', 'jsonwebtoken', 'uuid'],
  'process management': ['pm2', 'forever', 'nodemon', 'concurrently'],
  
  // Data processing
  'json': ['json5', 'hjson', 'jsonpath', 'fast-json-stringify'],
  'xml': ['xml2js', 'fast-xml-parser', 'xmldom'],
  'csv': ['csv-parser', 'fast-csv', 'papaparse'],
  'yaml': ['js-yaml', 'yaml']
};

/**
 * Calculate semantic similarity between query and package info
 */
export function calculateSemanticScore(query: string, packageInfo: PackageInfo): number {
  const queryLower = query.toLowerCase();
  const packageName = packageInfo.name.toLowerCase();
  const description = (packageInfo.description || '').toLowerCase();
  
  let score = 0;
  
  // Exact name match gets highest score
  if (packageName === queryLower) {
    score += 100;
  }
  
  // Partial name match
  if (packageName.includes(queryLower) || queryLower.includes(packageName)) {
    score += 50;
  }
  
  // Description keyword matching
  const queryWords = queryLower.split(/\s+/);
  const descriptionWords = description.split(/\s+/);
  
  queryWords.forEach(queryWord => {
    if (packageName.includes(queryWord)) {
      score += 30;
    }
    
    if (descriptionWords.some(word => word.includes(queryWord))) {
      score += 20;
    }
  });
  
  // Category-based scoring
  Object.entries(PACKAGE_CATEGORIES).forEach(([category, categoryInfo]) => {
    const matchingKeywords = categoryInfo.keywords.filter(keyword => 
      queryLower.includes(keyword) || 
      packageName.includes(keyword) || 
      description.includes(keyword)
    );
    
    if (matchingKeywords.length > 0) {
      score += matchingKeywords.length * 10 * categoryInfo.weight;
    }
  });
  
  // Functionality-based scoring
  Object.entries(FUNCTIONALITY_MAPPINGS).forEach(([functionality, packages]) => {
    if (queryLower.includes(functionality)) {
      if (packages.includes(packageName)) {
        score += 40;
      }
    }
  });
  
  return score;
}

/**
 * Search for packages with semantic matching
 */
export function searchPackagesSemanticaly(
  query: string,
  packages: PackageInfo[],
  category: string = 'all',
  maxResults: number = 20
): PackageInfo[] {
  // Score all packages
  const scoredPackages = packages.map(pkg => ({
    package: pkg,
    score: calculateSemanticScore(query, pkg)
  }));
  
  // Filter by category if specified
  let filteredPackages = scoredPackages;
  if (category !== 'all') {
    const categoryKeywords = PACKAGE_CATEGORIES[category as keyof typeof PACKAGE_CATEGORIES]?.keywords || [];
    filteredPackages = scoredPackages.filter(({ package: pkg }) => {
      const packageName = pkg.name.toLowerCase();
      const description = (pkg.description || '').toLowerCase();
      
      return categoryKeywords.some(keyword => 
        packageName.includes(keyword) || 
        description.includes(keyword)
      );
    });
  }
  
  // Sort by score and return top results
  return filteredPackages
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ package: pkg }) => pkg);
}

/**
 * Get package suggestions based on functionality
 */
export function getPackageSuggestions(functionality: string): string[] {
  const functionalityLower = functionality.toLowerCase();
  
  // Direct mapping lookup
  const directMatch = FUNCTIONALITY_MAPPINGS[functionalityLower as keyof typeof FUNCTIONALITY_MAPPINGS];
  if (directMatch) {
    return directMatch;
  }
  
  // Partial matching
  const suggestions: string[] = [];
  Object.entries(FUNCTIONALITY_MAPPINGS).forEach(([key, packages]) => {
    if (key.includes(functionalityLower) || functionalityLower.includes(key)) {
      suggestions.push(...packages);
    }
  });
  
  // Remove duplicates and return
  return [...new Set(suggestions)];
}

/**
 * Categorize a package based on its name and description
 */
export function categorizePackage(packageInfo: PackageInfo): string {
  const packageName = packageInfo.name.toLowerCase();
  const description = (packageInfo.description || '').toLowerCase();
  
  let bestCategory = 'utility';
  let bestScore = 0;
  
  Object.entries(PACKAGE_CATEGORIES).forEach(([category, categoryInfo]) => {
    const score = categoryInfo.keywords.reduce((acc, keyword) => {
      if (packageName.includes(keyword)) acc += 2;
      if (description.includes(keyword)) acc += 1;
      return acc;
    }, 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });
  
  return bestCategory;
}

/**
 * Get enhanced package info with category and functionality score
 */
export function enhancePackageInfo(packageInfo: PackageInfo, query?: string): PackageInfo & {
  category: string;
  semanticScore?: number;
} {
  const category = categorizePackage(packageInfo);
  const semanticScore = query ? calculateSemanticScore(query, packageInfo) : undefined;
  
  return {
    ...packageInfo,
    category,
    ...(semanticScore !== undefined && { semanticScore })
  };
}