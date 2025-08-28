const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

/**
 * JavaScript/TypeScript Parser
 * Uses Babel parser for AST generation and analysis
 */
class JavaScriptParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  }

  /**
   * Parse JavaScript/TypeScript code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    try {
      // Determine if TypeScript based on syntax or file extension
      const isTypeScript = this.detectTypeScript(code, options.fileName);
      
      // Configure Babel parser options
      const parserOptions = {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'asyncGenerators',
          'bigInt',
          'classProperties',
          'decorators-legacy',
          'doExpressions',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'functionBind',
          'functionSent',
          'importMeta',
          'nullishCoalescingOperator',
          'numericSeparator',
          'objectRestSpread',
          'optionalCatchBinding',
          'optionalChaining',
          'throwExpressions',
          'topLevelAwait',
          'trailingFunctionCommas'
        ]
      };

      // Add TypeScript plugins if needed
      if (isTypeScript) {
        parserOptions.plugins.push('typescript', 'decorators');
      }

      // Parse the code into AST
      const ast = parse(code, parserOptions);
      
      // Extract information from AST
      const extractionResult = this.extractFromAST(ast, code);
      
      return {
        ast: options.includeAST ? ast : null,
        language: isTypeScript ? 'typescript' : 'javascript',
        ...extractionResult
      };

    } catch (error) {
      return this.handleParseError(error, code);
    }
  }

  /**
   * Detect if code is TypeScript
   */
  detectTypeScript(code, fileName) {
    // Check file extension
    if (fileName && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
      return true;
    }

    // Check for TypeScript syntax patterns
    const tsPatterns = [
      /:\s*(string|number|boolean|object|any|void|never|unknown)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /enum\s+\w+/,
      /<[A-Z]\w*>/,
      /public|private|protected\s+/,
      /implements\s+/,
      /namespace\s+/
    ];

    return tsPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Extract information from AST
   */
  extractFromAST(ast, code) {
    const result = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      syntaxErrors: [],
      warnings: []
    };

    const lines = code.split('\n');

    // Traverse AST and extract information
    traverse(ast, {
      // Function declarations and expressions
      FunctionDeclaration: (path) => {
        const func = this.extractFunction(path, lines);
        if (func) result.functions.push(func);
      },

      FunctionExpression: (path) => {
        const func = this.extractFunction(path, lines);
        if (func) result.functions.push(func);
      },

      ArrowFunctionExpression: (path) => {
        const func = this.extractArrowFunction(path, lines);
        if (func) result.functions.push(func);
      },

      // Method definitions
      ClassMethod: (path) => {
        const method = this.extractMethod(path, lines);
        if (method) {
          // Add to class methods or standalone if not in class
          const classPath = path.findParent(p => p.isClassDeclaration());
          if (!classPath) {
            result.functions.push(method);
          }
        }
      },

      ObjectMethod: (path) => {
        const method = this.extractMethod(path, lines);
        if (method) result.functions.push(method);
      },

      // Class declarations
      ClassDeclaration: (path) => {
        const cls = this.extractClass(path, lines);
        if (cls) result.classes.push(cls);
      },

      ClassExpression: (path) => {
        const cls = this.extractClass(path, lines);
        if (cls) result.classes.push(cls);
      },

      // Import statements
      ImportDeclaration: (path) => {
        const importInfo = this.extractImport(path);
        if (importInfo) result.imports.push(importInfo);
      },

      // Export statements
      ExportNamedDeclaration: (path) => {
        const exports = this.extractNamedExports(path);
        result.exports.push(...exports);
      },

      ExportDefaultDeclaration: (path) => {
        const exportInfo = this.extractDefaultExport(path);
        if (exportInfo) result.exports.push(exportInfo);
      },

      ExportAllDeclaration: (path) => {
        const exportInfo = this.extractExportAll(path);
        if (exportInfo) result.exports.push(exportInfo);
      }
    });

    return result;
  }

  /**
   * Extract function information
   */
  extractFunction(path, lines) {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return null;

    const name = node.id ? node.id.name : '<anonymous>';
    const startLine = loc.start.line;
    const endLine = loc.end.line;

    // Extract parameters
    const parameters = node.params.map(param => this.extractParameter(param));

    // Determine return type for TypeScript
    const returnType = node.returnType ? this.extractTypeAnnotation(node.returnType) : 'any';

    // Calculate complexity
    const complexity = this.calculateFunctionComplexity(path);

    // Extract dependencies
    const dependencies = this.extractFunctionDependencies(path);

    // Check if async
    const isAsync = node.async || false;

    // Check if exported
    const isExported = this.isExported(path);

    // Extract docstring/comments
    const docstring = this.extractDocstring(node, lines);

    return {
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
    };
  }

  /**
   * Extract arrow function information
   */
  extractArrowFunction(path, lines) {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return null;

    // Try to get name from variable declarator or assignment
    let name = '<anonymous>';
    const parent = path.parent;
    
    if (t.isVariableDeclarator(parent) && parent.id.name) {
      name = parent.id.name;
    } else if (t.isAssignmentExpression(parent) && t.isIdentifier(parent.left)) {
      name = parent.left.name;
    } else if (t.isProperty(parent) && t.isIdentifier(parent.key)) {
      name = parent.key.name;
    }

    const startLine = loc.start.line;
    const endLine = loc.end.line;

    // Extract parameters
    const parameters = node.params.map(param => this.extractParameter(param));

    // Determine return type for TypeScript
    const returnType = node.returnType ? this.extractTypeAnnotation(node.returnType) : 'any';

    // Calculate complexity
    const complexity = this.calculateFunctionComplexity(path);

    // Extract dependencies
    const dependencies = this.extractFunctionDependencies(path);

    // Check if async
    const isAsync = node.async || false;

    // Check if exported
    const isExported = this.isExported(path);

    return {
      name,
      parameters,
      returnType,
      startLine,
      endLine,
      complexity,
      dependencies,
      sideEffects: [],
      isAsync,
      isExported,
      docstring: '',
      testCandidates: this.generateTestCandidates(name, parameters)
    };
  }

  /**
   * Extract method information
   */
  extractMethod(path, lines) {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return null;

    const name = node.key ? (node.key.name || node.key.value) : '<anonymous>';
    const startLine = loc.start.line;
    const endLine = loc.end.line;

    // Extract parameters
    const parameters = node.params.map(param => this.extractParameter(param));

    // Determine return type
    const returnType = node.returnType ? this.extractTypeAnnotation(node.returnType) : 'any';

    // Calculate complexity
    const complexity = this.calculateFunctionComplexity(path);

    // Extract dependencies
    const dependencies = this.extractFunctionDependencies(path);

    // Check properties
    const isAsync = node.async || false;
    const isExported = this.isExported(path);

    return {
      name,
      parameters,
      returnType,
      startLine,
      endLine,
      complexity,
      dependencies,
      sideEffects: [],
      isAsync,
      isExported,
      docstring: '',
      testCandidates: this.generateTestCandidates(name, parameters)
    };
  }

  /**
   * Extract class information
   */
  extractClass(path, lines) {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return null;

    const name = node.id ? node.id.name : '<anonymous>';
    const startLine = loc.start.line;
    const endLine = loc.end.line;

    // Extract methods
    const methods = [];
    const properties = [];

    // Traverse class body
    if (node.body && node.body.body) {
      node.body.body.forEach(member => {
        if (t.isClassMethod(member)) {
          const method = this.extractClassMethod(member, lines);
          if (method) methods.push(method);
        } else if (t.isClassProperty(member)) {
          const property = this.extractClassProperty(member);
          if (property) properties.push(property);
        }
      });
    }

    // Extract inheritance info
    const extendsInfo = node.superClass ? this.extractIdentifierName(node.superClass) : null;
    const implementsInfo = node.implements ? node.implements.map(impl => this.extractIdentifierName(impl)) : [];

    // Check if exported
    const isExported = this.isExported(path);

    // Extract docstring
    const docstring = this.extractDocstring(node, lines);

    return {
      name,
      methods,
      properties,
      extends: extendsInfo,
      implements: implementsInfo,
      startLine,
      endLine,
      isExported,
      docstring
    };
  }

  /**
   * Extract class method
   */
  extractClassMethod(node, lines) {
    const loc = node.loc;
    if (!loc) return null;

    const name = node.key ? (node.key.name || node.key.value) : '<anonymous>';
    const parameters = node.params.map(param => this.extractParameter(param));
    const returnType = node.returnType ? this.extractTypeAnnotation(node.returnType) : 'any';
    const isAsync = node.async || false;

    return {
      name,
      parameters,
      returnType,
      startLine: loc.start.line,
      endLine: loc.end.line,
      complexity: 1, // Simplified for class methods
      dependencies: [],
      sideEffects: [],
      isAsync,
      isExported: false,
      docstring: '',
      testCandidates: this.generateTestCandidates(name, parameters)
    };
  }

  /**
   * Extract class property
   */
  extractClassProperty(node) {
    const name = node.key ? (node.key.name || node.key.value) : '<anonymous>';
    const type = node.typeAnnotation ? this.extractTypeAnnotation(node.typeAnnotation) : 'any';
    
    return {
      name,
      type,
      visibility: 'public', // JavaScript doesn't have visibility keywords
      isStatic: node.static || false
    };
  }

  /**
   * Extract parameter information
   */
  extractParameter(param) {
    if (t.isIdentifier(param)) {
      return {
        name: param.name,
        type: param.typeAnnotation ? this.extractTypeAnnotation(param.typeAnnotation) : 'any',
        optional: false
      };
    } else if (t.isAssignmentPattern(param)) {
      return {
        name: param.left.name,
        type: param.left.typeAnnotation ? this.extractTypeAnnotation(param.left.typeAnnotation) : 'any',
        optional: true,
        defaultValue: this.extractDefaultValue(param.right)
      };
    } else if (t.isRestElement(param)) {
      return {
        name: param.argument.name,
        type: 'array',
        optional: false,
        isRest: true
      };
    }

    return {
      name: 'unknown',
      type: 'any',
      optional: false
    };
  }

  /**
   * Extract type annotation
   */
  extractTypeAnnotation(typeAnnotation) {
    if (!typeAnnotation) return 'any';

    if (typeAnnotation.typeAnnotation) {
      const type = typeAnnotation.typeAnnotation;
      
      if (t.isTSStringKeyword(type)) return 'string';
      if (t.isTSNumberKeyword(type)) return 'number';
      if (t.isTSBooleanKeyword(type)) return 'boolean';
      if (t.isTSAnyKeyword(type)) return 'any';
      if (t.isTSVoidKeyword(type)) return 'void';
      if (t.isTSArrayType(type)) return 'array';
      if (t.isTSTypeReference(type) && type.typeName) {
        return type.typeName.name || 'object';
      }
    }

    return 'any';
  }

  /**
   * Extract default value
   */
  extractDefaultValue(node) {
    if (t.isStringLiteral(node)) return `"${node.value}"`;
    if (t.isNumericLiteral(node)) return node.value.toString();
    if (t.isBooleanLiteral(node)) return node.value.toString();
    if (t.isNullLiteral(node)) return 'null';
    if (t.isIdentifier(node) && node.name === 'undefined') return 'undefined';
    
    return 'unknown';
  }

  /**
   * Extract import information
   */
  extractImport(path) {
    const node = path.node;
    
    if (!node.source) return null;

    const source = node.source.value;
    const imports = [];

    node.specifiers.forEach(spec => {
      if (t.isImportDefaultSpecifier(spec)) {
        imports.push({
          name: spec.local.name,
          alias: null,
          isDefault: true
        });
      } else if (t.isImportSpecifier(spec)) {
        imports.push({
          name: spec.imported.name,
          alias: spec.local.name !== spec.imported.name ? spec.local.name : null,
          isDefault: false
        });
      } else if (t.isImportNamespaceSpecifier(spec)) {
        imports.push({
          name: '*',
          alias: spec.local.name,
          isDefault: false
        });
      }
    });

    return {
      source,
      imports,
      isExternal: this.isExternalImport(source)
    };
  }

  /**
   * Extract named exports
   */
  extractNamedExports(path) {
    const node = path.node;
    const exports = [];

    if (node.specifiers) {
      node.specifiers.forEach(spec => {
        if (t.isExportSpecifier(spec)) {
          exports.push({
            name: spec.exported.name,
            type: 'variable',
            isDefault: false
          });
        }
      });
    }

    if (node.declaration) {
      if (t.isFunctionDeclaration(node.declaration)) {
        exports.push({
          name: node.declaration.id.name,
          type: 'function',
          isDefault: false
        });
      } else if (t.isClassDeclaration(node.declaration)) {
        exports.push({
          name: node.declaration.id.name,
          type: 'class',
          isDefault: false
        });
      } else if (t.isVariableDeclaration(node.declaration)) {
        node.declaration.declarations.forEach(decl => {
          if (t.isIdentifier(decl.id)) {
            exports.push({
              name: decl.id.name,
              type: 'variable',
              isDefault: false
            });
          }
        });
      }
    }

    return exports;
  }

  /**
   * Extract default export
   */
  extractDefaultExport(path) {
    const node = path.node;
    
    if (t.isFunctionDeclaration(node.declaration)) {
      return {
        name: node.declaration.id ? node.declaration.id.name : 'default',
        type: 'function',
        isDefault: true
      };
    } else if (t.isClassDeclaration(node.declaration)) {
      return {
        name: node.declaration.id ? node.declaration.id.name : 'default',
        type: 'class',
        isDefault: true
      };
    } else {
      return {
        name: 'default',
        type: 'variable',
        isDefault: true
      };
    }
  }

  /**
   * Extract export all
   */
  extractExportAll(path) {
    const node = path.node;
    
    return {
      name: '*',
      type: 'namespace',
      isDefault: false,
      source: node.source ? node.source.value : null
    };
  }

  /**
   * Calculate function complexity
   */
  calculateFunctionComplexity(path) {
    let complexity = 1; // Base complexity

    path.traverse({
      IfStatement: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: (innerPath) => {
        if (innerPath.node.operator === '&&' || innerPath.node.operator === '||') {
          complexity++;
        }
      },
      WhileStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      ForStatement: () => complexity++,
      ForInStatement: () => complexity++,
      ForOfStatement: () => complexity++,
      SwitchCase: () => complexity++,
      CatchClause: () => complexity++
    });

    return complexity;
  }

  /**
   * Extract function dependencies
   */
  extractFunctionDependencies(path) {
    const dependencies = new Set();

    path.traverse({
      CallExpression: (innerPath) => {
        if (t.isIdentifier(innerPath.node.callee)) {
          dependencies.add(innerPath.node.callee.name);
        } else if (t.isMemberExpression(innerPath.node.callee)) {
          const objectName = this.extractIdentifierName(innerPath.node.callee.object);
          if (objectName) {
            dependencies.add(objectName);
          }
        }
      },
      Identifier: (innerPath) => {
        // Only count identifiers that are referenced, not declared
        if (innerPath.isReferencedIdentifier()) {
          dependencies.add(innerPath.node.name);
        }
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Check if function/class is exported
   */
  isExported(path) {
    return path.isExportDefaultDeclaration() || 
           path.isExportNamedDeclaration() ||
           path.findParent(p => p.isExportDefaultDeclaration() || p.isExportNamedDeclaration()) !== null;
  }

  /**
   * Extract identifier name
   */
  extractIdentifierName(node) {
    if (t.isIdentifier(node)) {
      return node.name;
    } else if (t.isMemberExpression(node)) {
      const object = this.extractIdentifierName(node.object);
      const property = this.extractIdentifierName(node.property);
      return object && property ? `${object}.${property}` : null;
    }
    return null;
  }

  /**
   * Extract docstring from comments
   */
  extractDocstring(node, lines) {
    if (node.leadingComments && node.leadingComments.length > 0) {
      const comment = node.leadingComments[node.leadingComments.length - 1];
      return comment.value.trim();
    }
    return '';
  }

  /**
   * Check if import is external
   */
  isExternalImport(source) {
    return !source.startsWith('.') && !source.startsWith('/');
  }

  /**
   * Generate test candidates
   */
  generateTestCandidates(functionName, parameters) {
    const candidates = [];
    
    // Basic test case
    candidates.push(`should call ${functionName} successfully`);
    
    // Parameter-based tests
    if (parameters.length > 0) {
      candidates.push(`should handle invalid parameters for ${functionName}`);
      candidates.push(`should validate required parameters for ${functionName}`);
    }
    
    // Optional parameter tests
    const optionalParams = parameters.filter(p => p.optional);
    if (optionalParams.length > 0) {
      candidates.push(`should use default values for optional parameters in ${functionName}`);
    }
    
    return candidates;
  }

  /**
   * Handle parse errors
   */
  handleParseError(error, code) {
    const syntaxErrors = [];
    
    if (error.loc) {
      syntaxErrors.push({
        message: error.message,
        line: error.loc.line,
        column: error.loc.column,
        severity: 'error',
        code: 'PARSE_ERROR'
      });
    } else {
      syntaxErrors.push({
        message: error.message,
        line: 1,
        column: 1,
        severity: 'error',
        code: 'PARSE_ERROR'
      });
    }

    return {
      ast: null,
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      syntaxErrors,
      warnings: []
    };
  }
}

module.exports = new JavaScriptParser();