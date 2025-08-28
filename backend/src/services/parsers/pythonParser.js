/**
 * Python Parser
 * Analyzes Python code structure and extracts information
 */
class PythonParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.py', '.pyw'];
  }

  /**
   * Parse Python code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    try {
      const result = {
        ast: null,
        language: 'python',
        functions: this.extractFunctions(code),
        classes: this.extractClasses(code),
        imports: this.extractImports(code),
        exports: this.extractExports(code),
        syntaxErrors: this.validateSyntax(code),
        warnings: []
      };

      return result;

    } catch (error) {
      return this.handleParseError(error, code);
    }
  }

  /**
   * Extract Python functions
   */
  extractFunctions(code) {
    const functionRegex = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/gm;
    const functions = [];
    const lines = code.split('\n');
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const indentation = match[1];
      const name = match[2];
      const paramsStr = match[3];
      const returnType = match[4] ? match[4].trim() : 'Any';
      const startLine = this.getLineNumber(code, match.index);
      
      // Find end line by looking for next function/class or end of indentation
      const endLine = this.findBlockEnd(lines, startLine - 1, indentation.length);
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Calculate complexity
      const functionCode = this.extractFunctionCode(lines, startLine - 1, endLine);
      const complexity = this.calculateComplexity(functionCode);
      
      // Extract dependencies
      const dependencies = this.extractFunctionDependencies(functionCode);
      
      // Check if async
      const isAsync = this.isAsyncFunction(lines[startLine - 1]);
      
      // Check if exported (Python doesn't have explicit exports, so check if it's public)
      const isExported = !name.startsWith('_');
      
      // Extract docstring
      const docstring = this.extractDocstring(lines, startLine);

      functions.push({
        name,
        parameters,
        returnType,
        startLine,
        endLine,
        complexity,
        dependencies,
        sideEffects: [], // TODO: Implement side effect detection
        isAsync,
        isExported,
        docstring,
        testCandidates: this.generateTestCandidates(name, parameters)
      });
    }

    return functions;
  }

  /**
   * Extract Python classes
   */
  extractClasses(code) {
    const classRegex = /^(\s*)class\s+(\w+)(?:\(([^)]*)\))?\s*:/gm;
    const classes = [];
    const lines = code.split('\n');
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      const indentation = match[1];
      const name = match[2];
      const inheritance = match[3] ? match[3].trim() : '';
      const startLine = this.getLineNumber(code, match.index);
      
      // Find end line
      const endLine = this.findBlockEnd(lines, startLine - 1, indentation.length);
      
      // Extract class code
      const classCode = this.extractClassCode(lines, startLine - 1, endLine);
      
      // Extract methods
      const methods = this.extractMethods(classCode, startLine);
      
      // Extract properties
      const properties = this.extractProperties(classCode);
      
      // Parse inheritance
      const extendsInfo = inheritance ? inheritance.split(',')[0].trim() : null;
      const implementsInfo = inheritance ? inheritance.split(',').slice(1).map(s => s.trim()) : [];
      
      // Check if exported
      const isExported = !name.startsWith('_');
      
      // Extract docstring
      const docstring = this.extractDocstring(lines, startLine);

      classes.push({
        name,
        methods,
        properties,
        extends: extendsInfo,
        implements: implementsInfo,
        startLine,
        endLine,
        isExported,
        docstring
      });
    }

    return classes;
  }

  /**
   * Extract Python imports
   */
  extractImports(code) {
    const imports = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      line = line.trim();
      
      // Handle "import module" syntax
      const simpleImportMatch = line.match(/^import\s+(.+)$/);
      if (simpleImportMatch) {
        const modules = simpleImportMatch[1].split(',').map(m => m.trim());
        modules.forEach(module => {
          const asMatch = module.match(/(\S+)\s+as\s+(\S+)/);
          if (asMatch) {
            imports.push({
              source: asMatch[1],
              imports: [{ name: asMatch[1], alias: asMatch[2], isDefault: true }],
              isExternal: this.isExternalModule(asMatch[1])
            });
          } else {
            imports.push({
              source: module,
              imports: [{ name: module, alias: null, isDefault: true }],
              isExternal: this.isExternalModule(module)
            });
          }
        });
      }

      // Handle "from module import ..." syntax
      const fromImportMatch = line.match(/^from\s+(\S+)\s+import\s+(.+)$/);
      if (fromImportMatch) {
        const module = fromImportMatch[1];
        const importList = fromImportMatch[2];
        const importItems = [];

        if (importList.trim() === '*') {
          importItems.push({ name: '*', alias: null, isDefault: false });
        } else {
          const items = importList.split(',').map(item => item.trim());
          items.forEach(item => {
            const asMatch = item.match(/(\S+)\s+as\s+(\S+)/);
            if (asMatch) {
              importItems.push({
                name: asMatch[1],
                alias: asMatch[2],
                isDefault: false
              });
            } else {
              importItems.push({
                name: item,
                alias: null,
                isDefault: false
              });
            }
          });
        }

        imports.push({
          source: module,
          imports: importItems,
          isExternal: this.isExternalModule(module)
        });
      }
    });

    return imports;
  }

  /**
   * Extract Python exports (public functions/classes)
   */
  extractExports(code) {
    const exports = [];
    
    // Check for __all__ definition
    const allMatch = code.match(/__all__\s*=\s*\[([^\]]*)\]/);
    if (allMatch) {
      const items = allMatch[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
      items.forEach(item => {
        if (item) {
          exports.push({
            name: item,
            type: 'variable', // We don't know the exact type without more analysis
            isDefault: false
          });
        }
      });
    } else {
      // If no __all__, consider all public (non-underscore) names as exports
      const functionMatches = code.matchAll(/^def\s+([a-zA-Z]\w*)/gm);
      for (const match of functionMatches) {
        exports.push({
          name: match[1],
          type: 'function',
          isDefault: false
        });
      }

      const classMatches = code.matchAll(/^class\s+([a-zA-Z]\w*)/gm);
      for (const match of classMatches) {
        exports.push({
          name: match[1],
          type: 'class',
          isDefault: false
        });
      }
    }

    return exports;
  }

  /**
   * Extract methods from class code
   */
  extractMethods(classCode, classStartLine) {
    const methodRegex = /^(\s+)def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/gm;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(classCode)) !== null) {
      const name = match[2];
      const paramsStr = match[3];
      const returnType = match[4] ? match[4].trim() : 'Any';
      const startLine = classStartLine + this.getLineNumber(classCode, match.index) - 1;
      
      // Parse parameters (skip 'self' for instance methods)
      const parameters = this.parseParameters(paramsStr).filter(p => p.name !== 'self');
      
      // Calculate complexity (simplified)
      const complexity = 1; // TODO: Implement proper complexity calculation
      
      // Check if async
      const isAsync = this.isAsyncFunction(match[0]);

      methods.push({
        name,
        parameters,
        returnType,
        startLine,
        endLine: startLine + 5, // Simplified
        complexity,
        dependencies: [],
        sideEffects: [],
        isAsync,
        isExported: !name.startsWith('_'),
        docstring: '',
        testCandidates: this.generateTestCandidates(name, parameters)
      });
    }

    return methods;
  }

  /**
   * Extract properties from class code
   */
  extractProperties(classCode) {
    const properties = [];
    
    // Look for self.property assignments in __init__
    const initMatch = classCode.match(/def\s+__init__\s*\([^)]*\)\s*:([\s\S]*?)(?=\n\s*def|\n\s*class|$)/);
    if (initMatch) {
      const initCode = initMatch[1];
      const propertyMatches = initCode.matchAll(/self\.(\w+)\s*[:=]/g);
      
      for (const match of propertyMatches) {
        properties.push({
          name: match[1],
          type: 'Any',
          visibility: 'public',
          isStatic: false
        });
      }
    }

    // Look for class variables
    const classVarMatches = classCode.matchAll(/^(\s+)(\w+)\s*[:=]\s*([^\n]+)/gm);
    for (const match of classVarMatches) {
      if (!match[0].includes('def ')) {
        properties.push({
          name: match[2],
          type: 'Any',
          visibility: match[2].startsWith('_') ? 'private' : 'public',
          isStatic: true
        });
      }
    }

    return properties;
  }

  /**
   * Parse function parameters
   */
  parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];

    const parameters = [];
    const params = paramsStr.split(',').map(p => p.trim());

    params.forEach(param => {
      if (!param) return;

      // Handle *args and **kwargs
      if (param.startsWith('**')) {
        parameters.push({
          name: param.substring(2),
          type: 'dict',
          optional: true,
          isKwargs: true
        });
      } else if (param.startsWith('*')) {
        parameters.push({
          name: param.substring(1),
          type: 'tuple',
          optional: true,
          isArgs: true
        });
      } else {
        // Handle type annotations and default values
        const typeMatch = param.match(/(\w+)\s*:\s*([^=]+)(?:\s*=\s*(.+))?/);
        if (typeMatch) {
          parameters.push({
            name: typeMatch[1],
            type: typeMatch[2].trim(),
            optional: !!typeMatch[3],
            defaultValue: typeMatch[3] ? typeMatch[3].trim() : undefined
          });
        } else {
          // Handle default values without type annotation
          const defaultMatch = param.match(/(\w+)\s*=\s*(.+)/);
          if (defaultMatch) {
            parameters.push({
              name: defaultMatch[1],
              type: 'Any',
              optional: true,
              defaultValue: defaultMatch[2].trim()
            });
          } else {
            parameters.push({
              name: param,
              type: 'Any',
              optional: false
            });
          }
        }
      }
    });

    return parameters;
  }

  /**
   * Calculate complexity of Python code
   */
  calculateComplexity(code) {
    let complexity = 1; // Base complexity

    const complexityPatterns = [
      /\bif\b/g,
      /\belif\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bexcept\b/g,
      /\band\b/g,
      /\bor\b/g,
      /\?\s*:/g // Ternary operator
    ];

    complexityPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Extract function dependencies
   */
  extractFunctionDependencies(functionCode) {
    const dependencies = new Set();
    
    // Look for function calls
    const callMatches = functionCode.matchAll(/(\w+)\s*\(/g);
    for (const match of callMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for module usage
    const moduleMatches = functionCode.matchAll(/(\w+)\.(\w+)/g);
    for (const match of moduleMatches) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }

  /**
   * Check if function is async
   */
  isAsyncFunction(line) {
    return /^\s*async\s+def\s/.test(line);
  }

  /**
   * Extract docstring
   */
  extractDocstring(lines, startLine) {
    if (startLine >= lines.length) return '';

    // Look for docstring on the next line after function/class definition
    let line = lines[startLine];
    if (!line) return '';

    line = line.trim();
    
    // Check for triple quotes
    if (line.includes('"""') || line.includes("'''")) {
      const quoteType = line.includes('"""') ? '"""' : "'''";
      
      if (line.indexOf(quoteType) !== line.lastIndexOf(quoteType)) {
        // Single line docstring
        const start = line.indexOf(quoteType) + 3;
        const end = line.lastIndexOf(quoteType);
        return line.substring(start, end).trim();
      } else {
        // Multi-line docstring
        let docstring = line.substring(line.indexOf(quoteType) + 3);
        let i = startLine + 1;
        
        while (i < lines.length && !lines[i].includes(quoteType)) {
          docstring += '\n' + lines[i];
          i++;
        }
        
        if (i < lines.length) {
          const lastLine = lines[i];
          const endIndex = lastLine.indexOf(quoteType);
          if (endIndex !== -1) {
            docstring += '\n' + lastLine.substring(0, endIndex);
          }
        }
        
        return docstring.trim();
      }
    }

    return '';
  }

  /**
   * Find the end line of a code block
   */
  findBlockEnd(lines, startLine, baseIndentation) {
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }
      
      // Calculate indentation
      const indentation = line.length - line.trimLeft().length;
      
      // If indentation is less than or equal to base, we've reached the end
      if (indentation <= baseIndentation) {
        return i;
      }
    }
    
    return lines.length;
  }

  /**
   * Extract function code
   */
  extractFunctionCode(lines, startLine, endLine) {
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Extract class code
   */
  extractClassCode(lines, startLine, endLine) {
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Get line number from character index
   */
  getLineNumber(code, index) {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Check if module is external
   */
  isExternalModule(module) {
    return !module.startsWith('.') && !module.includes('/') && !module.includes('\\');
  }

  /**
   * Validate Python syntax (simplified)
   */
  validateSyntax(code) {
    const errors = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for common syntax errors
      if (trimmed.endsWith(':') && !this.isValidColonLine(trimmed)) {
        errors.push({
          message: 'Invalid colon usage',
          line: index + 1,
          column: line.indexOf(':') + 1,
          severity: 'warning'
        });
      }
      
      // Check for unclosed parentheses (simplified)
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens !== closeParens && !line.includes('#')) {
        errors.push({
          message: 'Mismatched parentheses',
          line: index + 1,
          column: 1,
          severity: 'error'
        });
      }
    });

    return errors;
  }

  /**
   * Check if line with colon is valid
   */
  isValidColonLine(line) {
    const validPatterns = [
      /^\s*(def|class|if|elif|else|for|while|try|except|finally|with)\b/,
      /^\s*\w+\s*:\s*\w+/, // Type annotation
      /^\s*\w+\s*:\s*$/ // Dictionary key
    ];

    return validPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Generate test candidates
   */
  generateTestCandidates(functionName, parameters) {
    const candidates = [];
    
    candidates.push(`test_${functionName}_success`);
    
    if (parameters.length > 0) {
      candidates.push(`test_${functionName}_invalid_params`);
      
      const requiredParams = parameters.filter(p => !p.optional);
      if (requiredParams.length > 0) {
        candidates.push(`test_${functionName}_missing_required_params`);
      }
      
      const optionalParams = parameters.filter(p => p.optional);
      if (optionalParams.length > 0) {
        candidates.push(`test_${functionName}_default_values`);
      }
    }
    
    return candidates;
  }

  /**
   * Handle parse errors
   */
  handleParseError(error, code) {
    return {
      ast: null,
      language: 'python',
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      syntaxErrors: [{
        message: error.message,
        line: 1,
        column: 1,
        severity: 'error',
        code: 'PARSE_ERROR'
      }],
      warnings: []
    };
  }
}

module.exports = new PythonParser();