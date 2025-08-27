import { describe, it, expect, beforeEach } from 'vitest';
import { JavaScriptDiscoveryEngine } from '../src/engines/javascript.js';
import { CacheManager } from '../src/cache.js';

interface HallucinationMetrics {
  detectionRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgResponseTime: number;
}

describe('Hallucination Detection Benchmark', () => {
  let engine: JavaScriptDiscoveryEngine;
  let cache: CacheManager;

  // Based on research: packages commonly hallucinated by AI models
  const KNOWN_HALLUCINATED_PACKAGES = [
    'fake-package-12345',
    'non-existent-library',
    'react-super-components',
    'lodash-extended-utils',
    'axios-pro-client',
    'express-advanced-middleware',
    'vue-magic-components',
    'angular-premium-tools',
    'fake-testing-framework',
    'imaginary-ui-library'
  ];

  // Real packages that should be valid
  const KNOWN_VALID_PACKAGES = [
    'react',
    'lodash', 
    'axios',
    'express',
    'vue',
    'angular',
    'vitest',
    'jest',
    'zod',
    '@babel/parser'
  ];

  // AI-generated import statements from actual model outputs
  const AI_GENERATED_IMPORTS = [
    // Hallucinated imports
    "import { Component } from 'fake-react-utils'",
    "import { helper } from 'non-existent-helpers'", 
    "import axios from 'axios-pro-client'",
    "import { test } from 'imaginary-testing-lib'",
    "import React from 'react-super-components'",
    
    // Valid imports (control group)
    "import React from 'react'",
    "import { describe, it, expect } from 'vitest'",
    "import axios from 'axios'",
    "import express from 'express'",
    "import { z } from 'zod'"
  ];

  beforeEach(() => {
    cache = new CacheManager({ ttl: 60000, maxSize: 100 });
    engine = new JavaScriptDiscoveryEngine(cache);
  });

  describe('Core Hallucination Detection', () => {
    it('should detect known hallucinated packages', async () => {
      const results = [];
      
      for (const packageName of KNOWN_HALLUCINATED_PACKAGES) {
        const importStatement = `import something from '${packageName}'`;
        const result = await engine.validateImport({
          importStatement,
          language: 'javascript'
        });
        
        results.push({
          package: packageName,
          detected: !result.valid,
          reason: result.reason
        });
      }

      const detectionRate = results.filter(r => r.detected).length / results.length * 100;
      
      console.log(`Hallucination Detection Rate: ${detectionRate.toFixed(1)}%`);
      console.log('Failed detections:', results.filter(r => !r.detected));
      
      // Target: >95% detection rate
      expect(detectionRate).toBeGreaterThan(95);
    }, 30000);

    it('should not flag valid packages as hallucinations', async () => {
      const results = [];
      
      for (const packageName of KNOWN_VALID_PACKAGES) {
        const importStatement = `import something from '${packageName}'`;
        const result = await engine.validateImport({
          importStatement,
          language: 'javascript'
        });
        
        results.push({
          package: packageName,
          flaggedAsInvalid: !result.valid,
          reason: result.reason
        });
      }

      const falsePositiveRate = results.filter(r => r.flaggedAsInvalid).length / results.length * 100;
      
      console.log(`False Positive Rate: ${falsePositiveRate.toFixed(1)}%`);
      console.log('False positives:', results.filter(r => r.flaggedAsInvalid));
      
      // Target: <5% false positive rate
      expect(falsePositiveRate).toBeLessThan(5);
    }, 30000);
  });

  describe('AI Model Output Validation', () => {
    it('should validate real AI-generated import statements', async () => {
      const results = [];
      
      // Expected results: first 5 are hallucinated, last 5 are valid
      const expectedResults = [false, false, false, false, false, true, true, true, true, true];
      
      for (let i = 0; i < AI_GENERATED_IMPORTS.length; i++) {
        const importStatement = AI_GENERATED_IMPORTS[i];
        const expectedValid = expectedResults[i];
        
        const result = await engine.validateImport({
          importStatement,
          language: 'javascript'
        });
        
        results.push({
          import: importStatement,
          actualValid: result.valid,
          expectedValid,
          correct: result.valid === expectedValid,
          package: result.packageName
        });
      }

      const accuracy = results.filter(r => r.correct).length / results.length * 100;
      
      console.log(`AI Import Validation Accuracy: ${accuracy.toFixed(1)}%`);
      console.log('Incorrect predictions:', results.filter(r => !r.correct));
      
      // Target: >90% accuracy on real AI outputs
      expect(accuracy).toBeGreaterThan(90);
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    it('should validate imports within performance targets', async () => {
      const testImports = [
        "import React from 'react'",
        "import { fake } from 'fake-package'",
        "import axios from 'axios'",
        "import { nonexistent } from 'nonexistent-lib'"
      ];

      const responseTimes = [];
      
      for (const importStatement of testImports) {
        const startTime = performance.now();
        
        await engine.validateImport({
          importStatement,
          language: 'javascript'
        });
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log(`Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
      console.log(`Max Response Time: ${maxResponseTime.toFixed(1)}ms`);
      
      // Target: <100ms average, <200ms max
      expect(avgResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(200);
    });

    it('should demonstrate cache effectiveness', async () => {
      const importStatement = "import React from 'react'";
      
      // First call (cold cache)
      const start1 = performance.now();
      await engine.validateImport({ importStatement, language: 'javascript' });
      const coldTime = performance.now() - start1;
      
      // Second call (warm cache)
      const start2 = performance.now();
      await engine.validateImport({ importStatement, language: 'javascript' });
      const warmTime = performance.now() - start2;
      
      const speedup = coldTime / warmTime;
      
      console.log(`Cache speedup: ${speedup.toFixed(1)}x (${coldTime.toFixed(1)}ms -> ${warmTime.toFixed(1)}ms)`);
      
      // Cache should provide significant speedup
      expect(speedup).toBeGreaterThan(2);
    });
  });

  describe('Comprehensive Metrics', () => {
    it('should calculate comprehensive hallucination detection metrics', async () => {
      // Test both hallucinated and valid packages
      const allTests = [
        ...KNOWN_HALLUCINATED_PACKAGES.map(pkg => ({ package: pkg, shouldBeValid: false })),
        ...KNOWN_VALID_PACKAGES.map(pkg => ({ package: pkg, shouldBeValid: true }))
      ];

      let truePositives = 0;  // Correctly identified valid packages
      let trueNegatives = 0;  // Correctly identified hallucinated packages  
      let falsePositives = 0; // Valid packages flagged as invalid
      let falseNegatives = 0; // Hallucinated packages not detected
      
      const responseTimes = [];

      for (const test of allTests) {
        const startTime = performance.now();
        
        const result = await engine.validateImport({
          importStatement: `import something from '${test.package}'`,
          language: 'javascript'
        });
        
        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);

        if (test.shouldBeValid && result.valid) truePositives++;
        else if (!test.shouldBeValid && !result.valid) trueNegatives++;
        else if (test.shouldBeValid && !result.valid) falsePositives++;
        else if (!test.shouldBeValid && result.valid) falseNegatives++;
      }

      const metrics: HallucinationMetrics = {
        detectionRate: (trueNegatives / (trueNegatives + falseNegatives)) * 100,
        falsePositiveRate: (falsePositives / (truePositives + falsePositives)) * 100,
        falseNegativeRate: (falseNegatives / (trueNegatives + falseNegatives)) * 100,
        precision: (truePositives / (truePositives + falsePositives)) * 100,
        recall: (truePositives / (truePositives + falseNegatives)) * 100,
        f1Score: 0, // Will calculate below
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      };

      metrics.f1Score = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);

      console.log('\n📊 Hallucination Detection Metrics:');
      console.log(`Detection Rate: ${metrics.detectionRate.toFixed(1)}%`);
      console.log(`False Positive Rate: ${metrics.falsePositiveRate.toFixed(1)}%`);
      console.log(`False Negative Rate: ${metrics.falseNegativeRate.toFixed(1)}%`);
      console.log(`Precision: ${metrics.precision.toFixed(1)}%`);
      console.log(`Recall: ${metrics.recall.toFixed(1)}%`);
      console.log(`F1 Score: ${metrics.f1Score.toFixed(1)}%`);
      console.log(`Avg Response Time: ${metrics.avgResponseTime.toFixed(1)}ms`);

      // Validation targets based on research requirements
      expect(metrics.detectionRate).toBeGreaterThan(95);  // >95% hallucination detection
      expect(metrics.falsePositiveRate).toBeLessThan(5);  // <5% false positives
      expect(metrics.avgResponseTime).toBeLessThan(100);  // <100ms response time
      expect(metrics.f1Score).toBeGreaterThan(90);        // >90% overall accuracy
    }, 60000);
  });
});
