/**
 * C# Parser
 * Analyzes C# code structure and extracts information
 */
class CSharpParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.cs'];
  }

  /**
   * Parse C# code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    try {
      const result = {
        ast: null,
        language: 'csharp',
        functions: this.extractMethods(code),
        classes: this.extractClasses(code),
        imports: this.extractUsings(code),
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
   * Extract C# classes
   */
  extractClasses(code) {
    const classRegex = /(?:public\s+|private\s+|protected\s+|internal\s+)?(?:abstract\s+|sealed\s+|static\s+)?(?:partial\s+)?class\s+(\w+)(?:\s*:\s*([^{]+))?\s*{/g;
    const classes = [];
    const lines = code.split('\n');
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      const name = match[1];
      const inheritance = match[2] ? match[2].trim() : '';
      const startLine = this.getLineNumber(code, match.index);
      
      // Find class body
      const classStart = code.indexOf('{', match.index);
      const classEnd = this.findMatchingBrace(code, classStart);
      const classCode = code.substring(classStart + 1, classEnd);
      
      const endLine = this.getLineNumber(code, classEnd);
      
      // Extract methods and properties
      const methods = this.extractClassMethods(classCode, startLine);
      const properties = this.extractClassProperties(classCode);
      
      // Parse inheritance
      const inheritance_info = this.parseInheritance(inheritance);
      
      // Check if public (exported)
      const isExported = match[0].includes('public');
      
      // Extract XML documentation
      const docstring = this.extractXmlDocumentation(code, match.index, lines);

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
        modifiers: this.extractClassModifiers(match[0])
      });
    }

    return classes;
  }

  /**
   * Extract methods (standalone and class methods)
   */
  extractMethods(code) {
    const methodRegex = /(?:public\s+|private\s+|protected\s+|internal\s+)?(?:static\s+)?(?:virtual\s+|override\s+|abstract\s+)?(?:async\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
    const methods = [];
    const lines = code.split('\n');
    let match;

    while ((match = methodRegex.exec(code)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsStr = match[3];
      const startLine = this.getLineNumber(code, match.index);
      
      // Skip if inside a class (they'll be handled by class extraction)
      if (this.isInsideClass(code, match.index)) {
        continue;
      }
      
      // Find method body
      const methodStart = code.indexOf('{', match.index);
      const methodEnd = this.findMatchingBrace(code, methodStart);
      const methodCode = code.substring(methodStart + 1, methodEnd);
      
      const endLine = this.getLineNumber(code, methodEnd);
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Calculate complexity
      const complexity = this.calculateComplexity(methodCode);
      
      // Extract dependencies
      const dependencies = this.extractMethodDependencies(methodCode);
      
      // Check modifiers
      const isStatic = match[0].includes('static');
      const isAsync = match[0].includes('async');
      const isVirtual = match[0].includes('virtual');
      const isOverride = match[0].includes('override');
      
      // Check if exported (public)
      const isExported = match[0].includes('public');
      
      // Extract XML documentation
      const docstring = this.extractXmlDocumentation(code, match.index, lines);

      methods.push({
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
        docstring,
        testCandidates: this.generateTestCandidates(name, parameters),
        isStatic,
        isVirtual,
        isOverride
      });
    }

    return methods;
  }

  /**
   * Extract class methods
   */
  extractClassMethods(classCode, classStartLine) {
    const methodRegex = /(?:public\s+|private\s+|protected\s+|internal\s+)?(?:static\s+)?(?:virtual\s+|override\s+|abstract\s+)?(?:async\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*\(([^)]*)\)\s*(?:{|;)/g;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(classCode)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsStr = match[3];
      const startLine = classStartLine + this.getLineNumber(classCode, match.index) - 1;
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Extract modifiers
      const modifiers = this.extractMethodModifiers(match[0]);
      
      // Check if constructor
      const isConstructor = returnType === name;
      
      // Simplified complexity
      const complexity = 1;

      methods.push({
        name,
        parameters,
        returnType: isConstructor ? 'void' : returnType,
        startLine,
        endLine: startLine + 3, // Simplified
        complexity,
        dependencies: [],
        sideEffects: [],
        isAsync: modifiers.includes('async'),
        isExported: modifiers.includes('public'),
        docstring: '',
        testCandidates: this.generateTestCandidates(name, parameters),
        modifiers,
        isConstructor
      });
    }

    return methods;
  }

  /**
   * Extract class properties
   */
  extractClassProperties(classCode) {
    const propertyRegex = /(?:public\s+|private\s+|protected\s+|internal\s+)?(?:static\s+)?(?:readonly\s+)?(\w+(?:<[^>]*>)?)\s+(\w+)\s*(?:{[^}]*}|;)/g;
    const properties = [];
    let match;

    while ((match = propertyRegex.exec(classCode)) !== null) {
      // Skip if this looks like a method
      if (classCode.substring(match.index).match(/^\s*\w+\s*\(/)) {
        continue;
      }

      const type = match[1];
      const name = match[2];
      const modifiers = this.extractPropertyModifiers(match[0]);

      properties.push({
        name,
        type,
        visibility: this.extractVisibility(match[0]),
        isStatic: modifiers.includes('static'),
        isReadonly: modifiers.includes('readonly'),
        modifiers
      });
    }

    return properties;
  }

  /**
   * Extract using statements
   */
  extractUsings(code) {
    const usingRegex = /using\s+(?:static\s+)?([^;]+);/g;
    const usings = [];
    let match;

    while ((match = usingRegex.exec(code)) !== null) {
      const usingPath = match[1].trim();
      const isStatic = match[0].includes('static');
      
      // Handle using alias
      const aliasMatch = usingPath.match(/(\w+)\s*=\s*(.+)/);
      if (aliasMatch) {
        usings.push({
          source: aliasMatch[2],
          imports: [{
            name: aliasMatch[2],
            alias: aliasMatch[1],
            isDefault: true,
            isStatic
          }],
          isExternal: this.isExternalNamespace(aliasMatch[2])
        });
      } else {
        // Extract namespace parts
        const parts = usingPath.split('.');
        const className = parts[parts.length - 1];
        const namespace = parts.slice(0, -1).join('.');

        usings.push({
          source: namespace || usingPath,
          imports: [{
            name: className || usingPath,
            alias: null,
            isDefault: true,
            isStatic
          }],
          isExternal: this.isExternalNamespace(usingPath)
        });
      }
    }

    return usings;
  }

  /**
   * Extract exports (public classes, interfaces, enums)
   */
  extractExports(code) {
    const exports = [];
    
    // Extract public classes
    const classMatches = code.matchAll(/public\s+(?:abstract\s+|sealed\s+|static\s+)?(?:partial\s+)?class\s+(\w+)/g);
    for (const match of classMatches) {
      exports.push({
        name: match[1],
        type: 'class',
        isDefault: false
      });
    }

    // Extract public interfaces
    const interfaceMatches = code.matchAll(/public\s+(?:partial\s+)?interface\s+(\w+)/g);
    for (const match of interfaceMatches) {
      exports.push({
        name: match[1],
        type: 'interface',
        isDefault: false
      });
    }

    // Extract public enums
    const enumMatches = code.matchAll(/public\s+enum\s+(\w+)/g);
    for (const match of enumMatches) {
      exports.push({
        name: match[1],
        type: 'enum',
        isDefault: false
      });
    }

    // Extract public structs
    const structMatches = code.matchAll(/public\s+(?:readonly\s+)?struct\s+(\w+)/g);
    for (const match of structMatches) {
      exports.push({
        name: match[1],
        type: 'struct',
        isDefault: false
      });
    }

    return exports;
  }

  /**
   * Parse method parameters
   */
  parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];

    const parameters = [];
    const params = paramsStr.split(',').map(p => p.trim());

    params.forEach(param => {
      if (!param) return;

      // Handle parameter modifiers (ref, out, in, params)
      const modifierMatch = param.match(/^(ref|out|in|params)\s+(.+)$/);
      const modifier = modifierMatch ? modifierMatch[1] : null;
      const paramWithoutModifier = modifierMatch ? modifierMatch[2] : param;

      // Handle default values
      const defaultMatch = paramWithoutModifier.match(/^(.+?)\s*=\s*(.+)$/);
      const hasDefault = !!defaultMatch;
      const paramWithoutDefault = hasDefault ? defaultMatch[1].trim() : paramWithoutModifier;

      // Parse type and name
      const parts = paramWithoutDefault.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        const type = parts.slice(0, -1).join(' ');

        parameters.push({
          name,
          type,
          optional: hasDefault,
          defaultValue: hasDefault ? defaultMatch[2].trim() : undefined,
          modifier
        });
      }
    });

    return parameters;
  }

  /**
   * Parse inheritance information
   */
  parseInheritance(inheritance) {
    const result = { extends: null, implements: [] };
    
    if (!inheritance) return result;

    const bases = inheritance.split(',').map(s => s.trim());
    
    // In C#, first item is typically the base class, others are interfaces
    if (bases.length > 0) {
      // Check if first item looks like an interface (starts with I)
      if (bases[0].startsWith('I') && bases[0].length > 1 && bases[0][1].toUpperCase() === bases[0][1]) {
        result.implements = bases;
      } else {
        result.extends = bases[0];
        result.implements = bases.slice(1);
      }
    }

    return result;
  }

  /**
   * Extract class modifiers
   */
  extractClassModifiers(declaration) {
    const modifiers = [];
    const modifierPattern = /\b(public|private|protected|internal|abstract|sealed|static|partial)\b/g;
    let match;

    while ((match = modifierPattern.exec(declaration)) !== null) {
      modifiers.push(match[1]);
    }

    return modifiers;
  }

  /**
   * Extract method modifiers
   */
  extractMethodModifiers(declaration) {
    const modifiers = [];
    const modifierPattern = /\b(public|private|protected|internal|static|virtual|override|abstract|async)\b/g;
    let match;

    while ((match = modifierPattern.exec(declaration)) !== null) {
      modifiers.push(match[1]);
    }

    return modifiers;
  }

  /**
   * Extract property modifiers
   */
  extractPropertyModifiers(declaration) {
    const modifiers = [];
    const modifierPattern = /\b(public|private|protected|internal|static|readonly)\b/g;
    let match;

    while ((match = modifierPattern.exec(declaration)) !== null) {
      modifiers.push(match[1]);
    }

    return modifiers;
  }

  /**
   * Extract visibility modifier
   */
  extractVisibility(declaration) {
    if (declaration.includes('public')) return 'public';
    if (declaration.includes('private')) return 'private';
    if (declaration.includes('protected')) return 'protected';
    if (declaration.includes('internal')) return 'internal';
    return 'private'; // Default in C#
  }

  /**
   * Calculate complexity of C# code
   */
  calculateComplexity(code) {
    let complexity = 1; // Base complexity

    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bforeach\s*\(/g,
      /\bdo\s*{/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g,
      /\?\?/g // Null coalescing operator
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
   * Extract method dependencies
   */
  extractMethodDependencies(methodCode) {
    const dependencies = new Set();
    
    // Look for method calls
    const callMatches = methodCode.matchAll(/(\w+)\.(\w+)\s*\(/g);
    for (const match of callMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for object instantiations
    const newMatches = methodCode.matchAll(/\bnew\s+(\w+)/g);
    for (const match of newMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for static calls
    const staticMatches = methodCode.matchAll(/(\w+)\.(\w+)\s*\(/g);
    for (const match of staticMatches) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }

  /**
   * Extract XML documentation
   */
  extractXmlDocumentation(code, index, lines) {
    const lineNumber = this.getLineNumber(code, index);
    let docstring = '';
    let i = lineNumber - 2; // Start one line before
    
    // Look for preceding XML comments
    while (i >= 0) {
      const line = lines[i].trim();
      if (line.startsWith('///')) {
        docstring = line.substring(3).trim() + '\n' + docstring;
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
    const classRegex = /\bclass\s+\w+[^{]*{/g;
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
   * Check if namespace is external
   */
  isExternalNamespace(namespace) {
    // Standard .NET namespaces
    const standardNamespaces = [
      'System', 'Microsoft', 'Windows', 'System.Collections',
      'System.IO', 'System.Linq', 'System.Threading', 'System.Text'
    ];
    return standardNamespaces.some(ns => namespace.startsWith(ns));
  }

  /**
   * Validate C# syntax (simplified)
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
          !trimmed.startsWith('///') &&
          !trimmed.startsWith('using') &&
          !trimmed.startsWith('namespace') &&
          !trimmed.match(/^(if|else|for|while|do|try|catch|finally|switch|class|interface|enum|struct)\b/)) {
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
  generateTestCandidates(methodName, parameters) {
    const candidates = [];
    
    // Convert to test naming convention
    const testBaseName = `Test${this.capitalize(methodName)}`;
    
    candidates.push(`${testBaseName}_Success`);
    
    if (parameters.length > 0) {
      candidates.push(`${testBaseName}_WithInvalidParameters`);
      candidates.push(`${testBaseName}_WithNullParameters`);
    }
    
    // Special method types
    if (methodName.startsWith('Get')) {
      candidates.push(`${testBaseName}_ReturnsExpectedValue`);
    } else if (methodName.startsWith('Set')) {
      candidates.push(`${testBaseName}_UpdatesValue`);
    } else if (methodName.startsWith('Is') || methodName.startsWith('Has') || methodName.startsWith('Can')) {
      candidates.push(`${testBaseName}_ReturnsTrueWhenConditionMet`);
      candidates.push(`${testBaseName}_ReturnsFalseWhenConditionNotMet`);
    }
    
    return candidates;
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Handle parse errors
   */
  handleParseError(error, code) {
    return {
      ast: null,
      language: 'csharp',
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

module.exports = new CSharpParser();