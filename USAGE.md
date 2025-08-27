# How to Use Affordance Discovery MCP

## 🚀 Quick Start

### 1. Install as NPM Package
```bash
npm install -g affordance-discovery-mcp
# or
npx affordance-discovery-mcp
```

### 2. Clone from GitHub
```bash
git clone https://github.com/yourusername/affordance-discovery-mcp.git
cd affordance-discovery-mcp
npm install
npm run build
```

## 🔧 Integration Methods

### Method 1: Claude Desktop Integration
Add to your Claude Desktop MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "affordance-discovery": {
      "command": "npx",
      "args": ["affordance-discovery-mcp"],
      "env": {}
    }
  }
}
```

### Method 2: VS Code Extension
Create a VS Code extension that integrates with your MCP server:

```typescript
// extension.ts
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  const mcpServer = spawn('npx', ['affordance-discovery-mcp'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Register command to validate imports before code completion
  const validateImportsCommand = vscode.commands.registerCommand(
    'extension.validateImports',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const text = editor.document.getText();
      const imports = extractImportStatements(text);
      
      for (const importStatement of imports) {
        const result = await callMCP(mcpServer, 'validate_import', {
          importStatement,
          language: 'javascript'
        });
        
        if (!result.valid) {
          vscode.window.showWarningMessage(
            `Invalid import: ${importStatement}\nReason: ${result.reason}`
          );
        }
      }
    }
  );
}
```

### Method 3: Cursor/AI IDE Integration
Configure Cursor to use your MCP server for import validation:

```json
// .cursor/settings.json
{
  "ai.mcpServers": [
    {
      "name": "affordance-discovery",
      "command": ["npx", "affordance-discovery-mcp"],
      "description": "Validates imports and discovers available packages"
    }
  ]
}
```

### Method 4: Web App Builder Integration
For tools like v0.dev, bolt.new, or similar:

```typescript
// ai-code-generator.ts
import { spawn } from 'child_process';

class SmartCodeGenerator {
  private mcpServer: ChildProcess;

  constructor() {
    this.mcpServer = spawn('npx', ['affordance-discovery-mcp'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  async generateReactComponent(prompt: string) {
    // 1. First discover available UI libraries
    const packages = await this.callMCP('discover_packages', {
      searchTerm: 'react',
      category: 'ui',
      maxResults: 10
    });

    // 2. Filter to only installed packages
    const availableLibraries = packages.packages
      .filter(pkg => pkg.installed)
      .map(pkg => pkg.name);

    // 3. Generate code using only available libraries
    const codePrompt = `
      Create a React component for: ${prompt}
      
      ONLY use these available libraries: ${availableLibraries.join(', ')}
      Do NOT import any other packages.
    `;

    const generatedCode = await this.generateWithAI(codePrompt);

    // 4. Validate all imports before returning
    const validatedCode = await this.validateAndFixImports(generatedCode);
    
    return validatedCode;
  }

  async validateAndFixImports(code: string) {
    const imports = this.extractImports(code);
    let fixedCode = code;

    for (const importStatement of imports) {
      const validation = await this.callMCP('validate_import', {
        importStatement,
        language: 'javascript'
      });

      if (!validation.valid && validation.suggestions.length > 0) {
        // Auto-fix with suggestions
        const suggestion = validation.suggestions[0];
        fixedCode = fixedCode.replace(
          validation.packageName,
          suggestion
        );
      }
    }

    return fixedCode;
  }
}
```

## 📚 Real-World Usage Examples

### Example 1: GitHub Copilot Enhancement
```bash
# Install as a background service
npm install -g affordance-discovery-mcp
affordance-discovery-mcp --daemon --port 8080

# Configure GitHub Copilot to check imports
curl -X POST http://localhost:8080/validate \
  -H "Content-Type: application/json" \
  -d '{"importStatement": "import React from \"react\""}'
```

### Example 2: CLI Tool for Developers
```bash
# Check if imports in a file are valid
npx affordance-discovery-mcp validate-file src/components/Button.tsx

# Discover available testing frameworks
npx affordance-discovery-mcp discover --category testing

# Search for packages by functionality
npx affordance-discovery-mcp search "date picker"
```

### Example 3: CI/CD Pipeline Integration
```yaml
# .github/workflows/validate-imports.yml
name: Validate Imports
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx affordance-discovery-mcp validate-project
        # Fails CI if any imports are invalid
```

### Example 4: Webpack Plugin
```javascript
// webpack-affordance-plugin.js
class AffordanceValidationPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('AffordanceValidation', (compilation) => {
      compilation.hooks.buildModule.tap('AffordanceValidation', async (module) => {
        if (module.resource && module.resource.endsWith('.js')) {
          const source = await fs.readFile(module.resource, 'utf8');
          const imports = extractImports(source);
          
          for (const importStatement of imports) {
            const validation = await validateImport(importStatement);
            if (!validation.valid) {
              compilation.errors.push(
                new Error(`Invalid import in ${module.resource}: ${importStatement}`)
              );
            }
          }
        }
      });
    });
  }
}
```

## 🏗️ Platform-Specific Integrations

### For AI Code Assistants (Cursor, Codeium, Tabnine)
```json
{
  "mcp": {
    "servers": {
      "affordance-discovery": {
        "command": "affordance-discovery-mcp",
        "description": "Validates imports and discovers packages",
        "tools": ["discover_packages", "validate_import", "introspect_module"]
      }
    }
  }
}
```

### For Online Code Editors (CodeSandbox, StackBlitz)
```javascript
// Integrate into the editor's import resolution
const importResolver = {
  async resolveImport(importStatement) {
    const validation = await fetch('/api/mcp/validate', {
      method: 'POST',
      body: JSON.stringify({ importStatement })
    });
    
    if (!validation.valid) {
      throw new Error(`Package not available: ${validation.packageName}`);
    }
    
    return validation.modulePath;
  }
};
```

### For Documentation Sites (Docusaurus, GitBook)
```javascript
// Auto-validate code examples in documentation
const codeBlocks = document.querySelectorAll('pre code');
codeBlocks.forEach(async (block) => {
  const imports = extractImportsFromCode(block.textContent);
  for (const imp of imports) {
    const isValid = await validateImport(imp);
    if (!isValid) {
      block.classList.add('invalid-import');
      addWarningTooltip(block, `Import ${imp} may not work`);
    }
  }
});
```

## 📦 Distribution Methods

### 1. NPM Package
```bash
npm publish affordance-discovery-mcp
# Users install with: npm install -g affordance-discovery-mcp
```

### 2. Docker Container
```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm install && npm run build
EXPOSE 8080
CMD ["node", "dist/index.js", "--http-server"]
```

### 3. VS Code Extension
Package as a VS Code extension that bundles your MCP server:
```json
{
  "name": "affordance-discovery",
  "displayName": "Smart Import Validation",
  "description": "Validates imports in real-time",
  "version": "1.0.0",
  "engines": { "vscode": "^1.60.0" },
  "activationEvents": ["*"],
  "main": "./out/extension.js"
}
```

### 4. Browser Extension
Create a browser extension for online code editors:
```javascript
// content-script.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'validateImports') {
    const codeEditor = document.querySelector('.monaco-editor');
    const code = getCodeFromEditor(codeEditor);
    const imports = extractImports(code);
    
    for (const imp of imports) {
      const isValid = await validateImportViaAPI(imp);
      if (!isValid) {
        highlightInvalidImport(codeEditor, imp);
      }
    }
  }
});
```

## 🎯 Target User Groups

### 1. **Individual Developers**
- Install via npm/brew
- Use in their daily coding workflow
- Integrate with their preferred IDE

### 2. **AI Tool Companies**
- License or integrate your MCP server
- Improve their code generation accuracy
- Reduce user frustration with broken imports

### 3. **Enterprise Teams**
- Deploy as internal service
- Integrate with CI/CD pipelines
- Ensure code quality across teams

### 4. **Open Source Projects**
- Use in documentation validation
- Ensure examples work correctly
- Reduce issue reports about broken imports

## 🚀 Marketing Strategy

### Developer Communities
- Post on r/programming, Hacker News
- Demo at JavaScript conferences
- Write blog posts about import hallucination

### AI Tool Integration
- Reach out to Cursor, GitHub Copilot teams
- Propose integration partnerships
- Create proof-of-concept extensions

### Content Marketing
- "How to Stop AI from Hallucinating Imports"
- "Building Better Code Generation Tools"
- "The Future of AI-Assisted Development"

Your MCP server solves a real pain point that every developer faces when using AI code generation tools!