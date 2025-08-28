/**
 * C++ Parser
 * Analyzes C++ code structure and extracts information
 */
class CppParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx'];
  }

  /**
   * Parse C++ code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    try {
      // Pre-process code to remove comments and preprocessor directives
      const preprocessedCode = this.preprocessCode(code);
      
      const result = {
        ast: null,
        language: 'cpp',
        functions: this.extractFunctions(preprocessedCode),
        classes: this.extractClasses(preprocessedCode),
        imports: this.extractIncludes(code), // Use original code for includes
        exports: this.extractExports(preprocessedCode),
        syntaxErrors: this.validateSyntax(code),
        warnings: []
      };

      return result;

    } catch (error) {
      return this.handleParseError(error, code);
    }
  }

  /**
   * Preprocess C++ code
   */
  preprocessCode(code) {
    // Remove single-line comments
    code = code.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove preprocessor directives (keep for includes extraction)
    let processedCode = code.replace(/^\s*#(?!include).*$/gm, '');
    
    return processedCode;
  }

  /**
   * Extract C++ functions
   */
  extractFunctions(code) {
    // Regex for function declarations/definitions
    const functionRegex = /(?:(?:inline|static|virtual|explicit|friend)\s+)*(?:(\w+(?:<[^>]*>)?(?:\s*\*|\s*&)?)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:const\s+)?(?:override\s+)?(?:final\s+)?(?:noexcept\s*(?:\([^)]*\))?)?(?:\s*->\s*\w+(?:<[^>]*>)?)?\s*(?:{|;)/g;
    const functions = [];
    const lines = code.split('\n');
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const returnType = match[1] || 'void';
      const name = match[2];
      const paramsStr = match[3];
      const startLine = this.getLineNumber(code, match.index);
      
      // Skip destructors, constructors in class context, and operators
      if (name.startsWith('~') || name.startsWith('operator') || this.isInsideClass(code, match.index)) {
        continue;
      }
      
      // Check if this is a function definition (has body)
      const hasBody = match[0].includes('{');
      let endLine = startLine;
      
      if (hasBody) {
        const bodyStart = code.indexOf('{', match.index);
        const bodyEnd = this.findMatchingBrace(code, bodyStart);
        endLine = this.getLineNumber(code, bodyEnd);
      }
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Calculate complexity (only for function definitions)
      let complexity = 1;
      if (hasBody) {
        const bodyStart = code.indexOf('{', match.index);
        const bodyEnd = this.findMatchingBrace(code, bodyStart);
        const functionBody = code.substring(bodyStart + 1, bodyEnd);
        complexity = this.calculateComplexity(functionBody);
      }
      
      // Extract dependencies
      const dependencies = hasBody ? this.extractFunctionDependencies(code, match.index) : [];
      
      // Check modifiers
      const isStatic = match[0].includes('static');
      const isInline = match[0].includes('inline');
      const isVirtual = match[0].includes('virtual');
      
      // Assume global functions are exported
      const isExported = !this.isInsideNamespace(code, match.index) || 
                        match[0].includes('extern') ||
                        !this.isInsideClass(code, match.index);
      
      // Extract docstring
      const docstring = this.extractDocstring(code, match.index, lines);

      functions.push({
        name,
        parameters,
        returnType,
        startLine,
        endLine,
        complexity,
        dependencies,
        sideEffects: [],
        isAsync: false, // C++ doesn't have built-in async/await
        isExported,
        docstring,
        testCandidates: this.generateTestCandidates(name, parameters),
        isStatic,
        isInline,
        isVirtual,
        hasBody
      });
    }

    return functions;
  }

  /**
   * Extract C++ classes
   */
  extractClasses(code) {
    const classRegex = /(class|struct)\s+(\w+)(?:\s*:\s*([^{]+))?\s*{/g;
    const classes = [];
    const lines = code.split('\n');
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      const type = match[1]; // 'class' or 'struct'
      const name = match[2];
      const inheritance = match[3] ? match[3].trim() : '';
      const startLine = this.getLineNumber(code, match.index);
      
      // Find class body
      const classStart = code.indexOf('{', match.index);
      const classEnd = this.findMatchingBrace(code, classStart);
      const classCode = code.substring(classStart + 1, classEnd);
      
      const endLine = this.getLineNumber(code, classEnd);
      
      // Extract methods and properties
      const methods = this.extractClassMethods(classCode, startLine);
      const properties = this.extractClassMembers(classCode);
      
      // Parse inheritance
      const inheritance_info = this.parseInheritance(inheritance);
      
      // Classes are typically exported in C++
      const isExported = true;
      
      // Extract docstring
      const docstring = this.extractDocstring(code, match.index, lines);

      classes.push({
        name,
        methods,
        properties,
        extends: inheritance_info.extends,
        implements: inheritance_info.implements,
        startLine,
        endLine,
        isExported,
        docstring,
        type, // 'class' or 'struct'
        accessSpecifiers: this.extractAccessSpecifiers(classCode)
      });
    }

    return classes;
  }

  /**
   * Extract class methods
   */
  extractClassMethods(classCode, classStartLine) {
    const methodRegex = /(?:(public|private|protected)\s*:\s*)?(?:(?:static|virtual|inline|explicit|friend)\s+)*(?:(\w+(?:<[^>]*>)?(?:\s*\*|\s*&)?)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:const\s+)?(?:override\s+)?(?:final\s+)?(?:noexcept\s*(?:\([^)]*\))?)?(?:\s*->\s*\w+(?:<[^>]*>)?)?\s*(?:{|;|=\s*0)/g;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(classCode)) !== null) {
      const accessSpecifier = match[1] || 'private'; // Default to private for classes
      const returnType = match[2] || 'void';
      const name = match[3];
      const paramsStr = match[4];
      const startLine = classStartLine + this.getLineNumber(classCode, match.index) - 1;
      
      // Skip destructor and operator overloads for simplicity
      if (name.startsWith('~') || name.startsWith('operator')) {
        continue;
      }
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Check if constructor
      const isConstructor = returnType === 'void' && !match[2];
      
      // Check modifiers
      const isStatic = match[0].includes('static');
      const isVirtual = match[0].includes('virtual');
      const isInline = match[0].includes('inline');
      const isPureVirtual = match[0].includes('= 0');
      
      // Simplified complexity
      const complexity = 1;

      methods.push({
        name,
        parameters,
        returnType: isConstructor ? name : returnType,
        startLine,
        endLine: startLine + 3, // Simplified
        complexity,
        dependencies: [],
        sideEffects: [],
        isAsync: false,
        isExported: accessSpecifier === 'public',
        docstring: '',
        testCandidates: this.generateTestCandidates(name, parameters),
        accessSpecifier,
        isStatic,
        isVirtual,
        isInline,
        isPureVirtual,
        isConstructor
      });
    }

    return methods;
  }

  /**
   * Extract class members/properties
   */
  extractClassMembers(classCode) {
    const memberRegex = /(?:(public|private|protected)\s*:\s*)?(?:(static|mutable|const)\s+)*(\w+(?:<[^>]*>)?(?:\s*\*|\s*&)?)\s+(\w+)(?:\s*=\s*[^;]+)?;/g;
    const properties = [];
    let match;

    while ((match = memberRegex.exec(classCode)) !== null) {
      // Skip if this looks like a method declaration
      if (classCode.substring(match.index).match(/^\s*\w+\s*\(/)) {
        continue;
      }

      const accessSpecifier = match[1] || 'private';
      const modifiers = match[2] || '';
      const type = match[3];
      const name = match[4];
      
      const isStatic = modifiers.includes('static');
      const isMutable = modifiers.includes('mutable');
      const isConst = modifiers.includes('const');

      properties.push({
        name,
        type,
        visibility: accessSpecifier,
        isStatic,
        isMutable,
        isConst
      });
    }

    return properties;
  }

  /**
   * Extract #include directives
   */
  extractIncludes(code) {
    const includeRegex = /#include\s*([<"])([^>"]+)[>"]/g;
    const includes = [];
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
      const isSystem = match[1] === '<';
      const headerName = match[2];
      
      includes.push({
        source: headerName,
        imports: [{
          name: headerName,
          alias: null,
          isDefault: true
        }],
        isExternal: isSystem,
        isSystem
      });
    }

    return includes;
  }

  /**
   * Extract exports (simplified for C++)
   */
  extractExports(code) {
    const exports = [];
    
    // In C++, we consider global functions and classes as exports
    const functionMatches = code.matchAll(/(?:extern\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*(?:{|;)/g);
    for (const match of functionMatches) {
      if (!this.isInsideClass(code, match.index) && !this.isInsideNamespace(code, match.index)) {
        exports.push({
          name: match[1],
          type: 'function',
          isDefault: false
        });
      }
    }

    const classMatches = code.matchAll(/(?:class|struct)\s+(\w+)/g);
    for (const match of classMatches) {
      exports.push({
        name: match[1],
        type: 'class',
        isDefault: false
      });
    }

    return exports;
  }

  /**
   * Parse function parameters
   */
  parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];

    const parameters = [];
    const params = this.splitParameters(paramsStr);

    params.forEach(param => {
      param = param.trim();
      if (!param) return;

      // Handle default values
      const defaultMatch = param.match(/^(.+?)\s*=\s*(.+)$/);
      const hasDefault = !!defaultMatch;
      const paramWithoutDefault = hasDefault ? defaultMatch[1].trim() : param;

      // Parse type and name
      const parts = paramWithoutDefault.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        const type = parts.slice(0, -1).join(' ');

        parameters.push({
          name,
          type,
          optional: hasDefault,
          defaultValue: hasDefault ? defaultMatch[2].trim() : undefined
        });
      }
    });

    return parameters;
  }

  /**
   * Split parameters handling nested templates
   */
  splitParameters(paramsStr) {
    const params = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < paramsStr.length; i++) {
      const char = paramsStr[i];
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '<') {
          depth++;
        } else if (char === '>') {
          depth--;
        } else if (char === ',' && depth === 0) {
          params.push(current.trim());
          current = '';
          continue;
        }
      } else {
        if (char === stringChar && paramsStr[i-1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    return params;
  }

  /**
   * Parse inheritance information
   */
  parseInheritance(inheritance) {
    const result = { extends: null, implements: [] };
    
    if (!inheritance) return result;

    // Split by comma and parse each base class
    const bases = inheritance.split(',').map(s => s.trim());
    
    bases.forEach(base => {
      // Remove access specifier
      const cleanBase = base.replace(/^(public|private|protected)\s+/, '');
      
      // For simplicity, treat first as extends and others as implements
      if (!result.extends) {
        result.extends = cleanBase;
      } else {
        result.implements.push(cleanBase);
      }
    });

    return result;
  }

  /**
   * Extract access specifiers from class
   */
  extractAccessSpecifiers(classCode) {
    const specifiers = [];
    const matches = classCode.matchAll(/(public|private|protected)\s*:/g);
    
    for (const match of matches) {
      specifiers.push({
        type: match[1],
        line: this.getLineNumber(classCode, match.index)
      });
    }
    
    return specifiers;
  }

  /**
   * Calculate complexity of C++ code
   */
  calculateComplexity(code) {
    let complexity = 1; // Base complexity

    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bdo\s*{/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g
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
  extractFunctionDependencies(code, functionIndex) {
    const dependencies = new Set();
    
    // Find function body
    const bodyStart = code.indexOf('{', functionIndex);
    if (bodyStart === -1) return [];
    
    const bodyEnd = this.findMatchingBrace(code, bodyStart);
    const functionBody = code.substring(bodyStart + 1, bodyEnd);
    
    // Look for function calls
    const callMatches = functionBody.matchAll(/(\w+)\s*\(/g);
    for (const match of callMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for class instantiations
    const newMatches = functionBody.matchAll(/\bnew\s+(\w+)/g);
    for (const match of newMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for member access
    const memberMatches = functionBody.matchAll(/(\w+)\.(\w+)/g);
    for (const match of memberMatches) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }

  /**
   * Extract docstring from comments
   */
  extractDocstring(code, index, lines) {
    const lineNumber = this.getLineNumber(code, index);
    let docstring = '';
    let i = lineNumber - 2; // Start one line before
    
    // Look for preceding comments
    while (i >= 0) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
        docstring = line + '\n' + docstring;
      } else if (line === '') {
        // Empty line, continue
      } else {
        break;
      }
      i--;
    }
    
    return docstring.trim();
  }

  /**
   * Check if position is inside a class
   */
  isInsideClass(code, position) {
    const beforeCode = code.substring(0, position);
    const classRegex = /(class|struct)\s+\w+[^{]*{/g;
    let match;
    let lastClassStart = -1;
    
    while ((match = classRegex.exec(beforeCode)) !== null) {
      lastClassStart = match.index;
    }
    
    if (lastClassStart === -1) return false;
    
    const classOpenBrace = code.indexOf('{', lastClassStart);
    const classCloseBrace = this.findMatchingBrace(code, classOpenBrace);
    
    return position > classOpenBrace && position < classCloseBrace;
  }

  /**
   * Check if position is inside a namespace
   */
  isInsideNamespace(code, position) {
    const beforeCode = code.substring(0, position);
    const namespaceRegex = /namespace\s+\w+\s*{/g;
    let match;
    let lastNamespaceStart = -1;
    
    while ((match = namespaceRegex.exec(beforeCode)) !== null) {
      lastNamespaceStart = match.index;
    }
    
    if (lastNamespaceStart === -1) return false;
    
    const namespaceOpenBrace = code.indexOf('{', lastNamespaceStart);
    const namespaceCloseBrace = this.findMatchingBrace(code, namespaceOpenBrace);
    
    return position > namespaceOpenBrace && position < namespaceCloseBrace;
  }

  /**
   * Find matching closing brace
   */
  findMatchingBrace(code, openBraceIndex) {
    let braceCount = 1;
    let i = openBraceIndex + 1;
    let inString = false;
    let stringChar = '';
    
    while (i < code.length && braceCount > 0) {
      const char = code[i];
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      } else {
        if (char === stringChar && code[i-1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
      i++;
    }
    
    return i - 1;
  }

  /**
   * Get line number from character index
   */
  getLineNumber(code, index) {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Validate C++ syntax (simplified)
   */
  validateSyntax(code) {
    const errors = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for unclosed parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (openParens !== closeParens && !line.includes('//')) {
        errors.push({
          message: 'Mismatched parentheses',
          line: index + 1,
          column: 1,
          severity: 'error'
        });
      }
      
      // Check for missing semicolons (basic check)
      if (trimmed && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('#') &&
          !trimmed.match(/^(if|else|for|while|do|try|catch|finally|switch|namespace|class|struct|enum)\b/)) {
        errors.push({
          message: 'Missing semicolon',
          line: index + 1,
          column: line.length,
          severity: 'warning'
        });
      }
    });

    return errors;
  }

  /**
   * Generate test candidates
   */
  generateTestCandidates(functionName, parameters) {
    const candidates = [];
    
    // Convert to test naming convention
    const testBaseName = `test_${functionName}`;
    
    candidates.push(`${testBaseName}_success`);
    
    if (parameters.length > 0) {
      candidates.push(`${testBaseName}_invalid_parameters`);
      candidates.push(`${testBaseName}_null_parameters`);
    }
    
    // Special function types
    if (functionName.startsWith('get')) {
      candidates.push(`${testBaseName}_returns_expected_value`);
    } else if (functionName.startsWith('set')) {
      candidates.push(`${testBaseName}_updates_value`);
    } else if (functionName.startsWith('is') || functionName.startsWith('has')) {
      candidates.push(`${testBaseName}_returns_true_when_condition_met`);
      candidates.push(`${testBaseName}_returns_false_when_condition_not_met`);
    }
    
    return candidates;
  }

  /**
   * Handle parse errors
   */
  handleParseError(error, code) {
    return {
      ast: null,
      language: 'cpp',
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

module.exports = new CppParser();