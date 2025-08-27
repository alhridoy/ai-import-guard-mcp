import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { ModuleExport } from '../types.js';
import * as ts from 'typescript';

export interface ASTAnalysisResult {
  exports: ModuleExport[];
  imports: string[];
  hasDefaultExport: boolean;
  dependencies: string[];
}

export class ASTParser {
  /**
   * Parse a JavaScript/TypeScript file using AST to extract exports and imports
   */
  static async parseFile(filePath: string): Promise<ASTAnalysisResult> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const extension = extname(filePath).toLowerCase();
    const content = readFileSync(filePath, 'utf-8');

    if (extension === '.ts' || extension === '.tsx') {
      return this.parseTypeScriptFile(content, filePath);
    } else {
      return this.parseJavaScriptFile(content, filePath);
    }
  }

  /**
   * Parse JavaScript file using Babel
   */
  private static parseJavaScriptFile(content: string, filePath: string): ASTAnalysisResult {
    const result: ASTAnalysisResult = {
      exports: [],
      imports: [],
      hasDefaultExport: false,
      dependencies: []
    };

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'nullishCoalescingOperator',
          'optionalChaining',
          'topLevelAwait'
        ],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
      });

      traverse(ast, {
        // Handle exports
        ExportNamedDeclaration(path: any) {
          if (path.node.declaration) {
            ASTParser.extractExportsFromDeclaration(path.node.declaration, result.exports);
          }
          
          if (path.node.specifiers) {
            path.node.specifiers.forEach((spec: any) => {
              if (t.isExportSpecifier(spec)) {
                const exportedName = t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value;
                result.exports.push({
                  name: exportedName,
                  type: 'constant',
                  signature: exportedName
                });
              }
            });
          }
        },

        ExportDefaultDeclaration(path: any) {
          result.hasDefaultExport = true;
          const declaration = path.node.declaration;
          
          if (t.isFunctionDeclaration(declaration) && declaration.id) {
            result.exports.push({
              name: 'default',
              type: 'function',
              signature: ASTParser.generateFunctionSignature(declaration)
            });
          } else if (t.isClassDeclaration(declaration) && declaration.id) {
            result.exports.push({
              name: 'default',
              type: 'class',
              signature: declaration.id.name
            });
          } else {
            result.exports.push({
              name: 'default',
              type: 'constant',
              signature: 'default'
            });
          }
        },

        // Handle imports
        ImportDeclaration(path: any) {
          const source = path.node.source.value;
          result.imports.push(source);
          
          // Track dependencies (external packages)
          if (!source.startsWith('.') && !source.startsWith('/')) {
            const packageName = ASTParser.extractPackageName(source);
            if (packageName && !result.dependencies.includes(packageName)) {
              result.dependencies.push(packageName);
            }
          }
        },

        // Handle require() calls
        CallExpression(path: any) {
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'require') {
            const arg = path.node.arguments[0];
            if (t.isStringLiteral(arg)) {
              result.imports.push(arg.value);
              
              if (!arg.value.startsWith('.') && !arg.value.startsWith('/')) {
                const packageName = ASTParser.extractPackageName(arg.value);
                if (packageName && !result.dependencies.includes(packageName)) {
                  result.dependencies.push(packageName);
                }
              }
            }
          }
        }
      });

    } catch (error) {
      console.error(`Error parsing JavaScript file ${filePath}:`, error);
    }

    return result;
  }

  /**
   * Parse TypeScript file using TypeScript compiler API
   */
  private static parseTypeScriptFile(content: string, filePath: string): ASTAnalysisResult {
    const result: ASTAnalysisResult = {
      exports: [],
      imports: [],
      hasDefaultExport: false,
      dependencies: []
    };

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        // Handle exports
        if (ts.isExportDeclaration(node)) {
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            node.exportClause.elements.forEach(element => {
              result.exports.push({
                name: element.name.text,
                type: 'constant',
                signature: element.name.text
              });
            });
          }
        }

        if (ts.isExportAssignment(node)) {
          result.hasDefaultExport = true;
          result.exports.push({
            name: 'default',
            type: 'constant',
            signature: 'default'
          });
        }

        // Handle function exports
        if (ts.isFunctionDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          const isDefault = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
          const name = isDefault ? 'default' : (node.name?.text || 'anonymous');
          
          if (isDefault) {
            result.hasDefaultExport = true;
          }

          result.exports.push({
            name,
            type: 'function',
            signature: this.generateTSFunctionSignature(node),
            parameters: this.extractTSParameters(node),
            returnType: node.type ? this.getTSTypeString(node.type) : undefined
          });
        }

        // Handle class exports
        if (ts.isClassDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          const isDefault = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
          const name = isDefault ? 'default' : (node.name?.text || 'anonymous');
          
          if (isDefault) {
            result.hasDefaultExport = true;
          }

          result.exports.push({
            name,
            type: 'class',
            signature: name
          });
        }

        // Handle variable exports
        if (ts.isVariableStatement(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              result.exports.push({
                name: decl.name.text,
                type: 'constant',
                signature: decl.name.text
              });
            }
          });
        }

        // Handle imports
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const source = node.moduleSpecifier.text;
          result.imports.push(source);
          
          if (!source.startsWith('.') && !source.startsWith('/')) {
            const packageName = this.extractPackageName(source);
            if (packageName && !result.dependencies.includes(packageName)) {
              result.dependencies.push(packageName);
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

    } catch (error) {
      console.error(`Error parsing TypeScript file ${filePath}:`, error);
    }

    return result;
  }

  /**
   * Extract exports from a declaration node
   */
  private static extractExportsFromDeclaration(declaration: t.Declaration, exports: ModuleExport[]): void {
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
      exports.push({
        name: declaration.id.name,
        type: 'function',
        signature: this.generateFunctionSignature(declaration)
      });
    } else if (t.isClassDeclaration(declaration) && declaration.id) {
      exports.push({
        name: declaration.id.name,
        type: 'class',
        signature: declaration.id.name
      });
    } else if (t.isVariableDeclaration(declaration)) {
      declaration.declarations.forEach(decl => {
        if (t.isIdentifier(decl.id)) {
          exports.push({
            name: decl.id.name,
            type: 'constant',
            signature: decl.id.name
          });
        }
      });
    } else if (t.isTypeAlias(declaration)) {
      exports.push({
        name: declaration.id.name,
        type: 'type',
        signature: declaration.id.name
      });
    } else if (t.isInterfaceDeclaration(declaration)) {
      exports.push({
        name: declaration.id.name,
        type: 'interface',
        signature: declaration.id.name
      });
    }
  }

  /**
   * Generate function signature from Babel AST
   */
  private static generateFunctionSignature(func: t.FunctionDeclaration): string {
    const name = func.id?.name || 'anonymous';
    const params = func.params.map(param => {
      if (t.isIdentifier(param)) {
        return param.name;
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        return `...${param.argument.name}`;
      }
      return 'param';
    }).join(', ');
    
    return `${name}(${params})`;
  }

  /**
   * Generate function signature from TypeScript AST
   */
  private static generateTSFunctionSignature(func: ts.FunctionDeclaration): string {
    const name = func.name?.text || 'anonymous';
    const params = func.parameters.map(param => {
      const paramName = param.name.getText();
      const paramType = param.type ? `: ${this.getTSTypeString(param.type)}` : '';
      const optional = param.questionToken ? '?' : '';
      return `${paramName}${optional}${paramType}`;
    }).join(', ');
    
    const returnType = func.type ? `: ${this.getTSTypeString(func.type)}` : '';
    return `${name}(${params})${returnType}`;
  }

  /**
   * Extract parameters from TypeScript function
   */
  private static extractTSParameters(func: ts.FunctionDeclaration): Array<{
    name: string;
    type: string;
    optional: boolean;
    description?: string;
  }> {
    return func.parameters.map(param => ({
      name: param.name.getText(),
      type: param.type ? this.getTSTypeString(param.type) : 'any',
      optional: !!param.questionToken,
    }));
  }

  /**
   * Get type string from TypeScript type node
   */
  private static getTSTypeString(typeNode: ts.TypeNode): string {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.VoidKeyword:
        return 'void';
      case ts.SyntaxKind.AnyKeyword:
        return 'any';
      case ts.SyntaxKind.UnknownKeyword:
        return 'unknown';
      case ts.SyntaxKind.NeverKeyword:
        return 'never';
      case ts.SyntaxKind.UndefinedKeyword:
        return 'undefined';
      case ts.SyntaxKind.NullKeyword:
        return 'null';
      default:
        return typeNode.getText();
    }
  }

  /**
   * Extract package name from import path
   */
  private static extractPackageName(importPath: string): string | null {
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    } else {
      return importPath.split('/')[0] || null;
    }
  }

  /**
   * Parse package.json to extract exports field
   */
  static async parsePackageExports(packagePath: string): Promise<ModuleExport[]> {
    const exports: ModuleExport[] = [];
    
    try {
      const packageJsonPath = join(packagePath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        return exports;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      if (packageJson.exports) {
        for (const [key, value] of Object.entries(packageJson.exports)) {
          exports.push({
            name: key === '.' ? 'default' : key,
            type: 'namespace',
            signature: key
          });
        }
      }

      // Also check main field
      if (packageJson.main) {
        const mainPath = join(packagePath, packageJson.main);
        if (existsSync(mainPath)) {
          try {
            const mainAnalysis = await this.parseFile(mainPath);
            exports.push(...mainAnalysis.exports);
          } catch (error) {
            console.error(`Error parsing main file ${mainPath}:`, error);
          }
        }
      }

    } catch (error) {
      console.error(`Error parsing package.json at ${packagePath}:`, error);
    }

    return exports;
  }
}