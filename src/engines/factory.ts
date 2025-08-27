import { CacheManager } from '../cache.js';
import { DiscoveryEngine } from '../types.js';
import { JavaScriptDiscoveryEngine } from './javascript.js';
import { PythonDiscoveryEngine } from './python.js';
import { RustDiscoveryEngine } from './rust.js';
import { GoDiscoveryEngine } from './go.js';
import { JavaDiscoveryEngine } from './java.js';

export class DiscoveryEngineFactory {
  private engines: Map<string, DiscoveryEngine> = new Map();
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
    this.initializeEngines();
  }

  private initializeEngines(): void {
    // Initialize all discovery engines
    this.engines.set('javascript', new JavaScriptDiscoveryEngine(this.cache));
    this.engines.set('python', new PythonDiscoveryEngine(this.cache));
    this.engines.set('rust', new RustDiscoveryEngine(this.cache));
    this.engines.set('go', new GoDiscoveryEngine(this.cache));
    this.engines.set('java', new JavaDiscoveryEngine(this.cache));
  }

  /**
   * Get discovery engine for a specific language
   */
  getEngine(language: string): DiscoveryEngine {
    const engine = this.engines.get(language.toLowerCase());
    
    if (!engine) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    return engine;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.engines.has(language.toLowerCase());
  }

  /**
   * Get engine statistics
   */
  getEngineStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [language, engine] of this.engines) {
      stats[language] = {
        available: true,
        // Add more engine-specific stats here if needed
      };
    }
    
    return stats;
  }
}