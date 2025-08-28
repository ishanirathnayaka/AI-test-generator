/**
 * Java Parser
 * Analyzes Java code structure and extracts information
 */
class JavaParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.java'];
  }

  /**
   * Parse Java code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    try {
      const result = {
        ast: null,
        language: 'java',
        functions: this.extractMethods(code),
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
   * Extract Java classes
   */
  extractClasses(code) {
    const classRegex = /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{/g;
    const classes = [];
    const lines = code.split('\n');
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      const name = match[1];
      const extendsClass = match[2] || null;
      const implementsInterfaces = match[3] ? match[3].split(',').map(s => s.trim()) : [];
      const startLine = this.getLineNumber(code, match.index);
      
      // Find class body
      const classStart = code.indexOf('{', match.index);
      const classEnd = this.findMatchingBrace(code, classStart);
      const classCode = code.substring(classStart + 1, classEnd);
      
      // Find end line
      const endLine = this.getLineNumber(code, classEnd);
      
      // Extract methods and properties
      const methods = this.extractClassMethods(classCode, startLine);
      const properties = this.extractClassFields(classCode);
      
      // Check if public (exported)
      const isExported = match[0].includes('public');
      
      // Extract docstring/comments
      const docstring = this.extractClassDocstring(code, match.index, lines);

      classes.push({
        name,
        methods,
        properties,
        extends: extendsClass,
        implements: implementsInterfaces,
        startLine,
        endLine,
        isExported,
        docstring
      });
    }

    return classes;
  }

  /**
   * Extract methods (standalone and class methods)
   */
  extractMethods(code) {
    const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:synchronized\s+)?(\w+(?:<[^>]*>)?|\w+\[\])\s+(\w+)\s*\(([^)]*)\)(?:\s+throws\s+[^{]+)?\s*{/g;
    const methods = [];
    const lines = code.split('\n');
    let match;

    while ((match = methodRegex.exec(code)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsStr = match[3];
      const startLine = this.getLineNumber(code, match.index);
      
      // Skip constructors and methods inside classes for now (they'll be handled by class extraction)
      if (name === 'class' || this.isInsideClass(code, match.index)) {
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
      
      // Check if static
      const isStatic = match[0].includes('static');
      
      // Check if exported (public)
      const isExported = match[0].includes('public');
      
      // Extract docstring
      const docstring = this.extractMethodDocstring(code, match.index, lines);

      methods.push({
        name,
        parameters,
        returnType,
        startLine,
        endLine,
        complexity,
        dependencies,
        sideEffects: [],
        isAsync: false, // Java doesn't have async/await like JavaScript
        isExported,
        docstring,
        testCandidates: this.generateTestCandidates(name, parameters),
        isStatic
      });
    }

    return methods;
  }

  /**
   * Extract class methods
   */
  extractClassMethods(classCode, classStartLine) {
    const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:synchronized\s+)?(\w+(?:<[^>]*>)?|\w+\[\])\s+(\w+)\s*\(([^)]*)\)(?:\s+throws\s+[^{]+)?\s*{/g;
    const methods = [];
    let match;

    while ((match = methodRegex.exec(classCode)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsStr = match[3];
      const startLine = classStartLine + this.getLineNumber(classCode, match.index) - 1;
      
      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      
      // Calculate complexity (simplified)
      const complexity = 1;
      
      // Check visibility
      const visibility = this.extractVisibility(match[0]);
      const isStatic = match[0].includes('static');

      methods.push({
        name,
        parameters,
        returnType,
        startLine,
        endLine: startLine + 5, // Simplified
        complexity,
        dependencies: [],
        sideEffects: [],
        isAsync: false,
        isExported: visibility === 'public',
        docstring: '',
        testCandidates: this.generateTestCandidates(name, parameters),
        visibility,
        isStatic
      });
    }

    return methods;
  }

  /**
   * Extract class fields
   */
  extractClassFields(classCode) {
    const fieldRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(\w+(?:<[^>]*>)?|\w+\[\])\s+(\w+)(?:\s*=\s*[^;]+)?;/g;
    const properties = [];
    let match;

    while ((match = fieldRegex.exec(classCode)) !== null) {
      // Skip if this looks like a method declaration
      if (classCode.substring(match.index).match(/^\s*\w+\s*\(/)) {
        continue;
      }

      const type = match[1];
      const name = match[2];
      const visibility = this.extractVisibility(match[0]);
      const isStatic = match[0].includes('static');

      properties.push({
        name,
        type,
        visibility,
        isStatic
      });
    }

    return properties;
  }

  /**
   * Extract Java imports
   */
  extractImports(code) {
    const importRegex = /import\s+(?:static\s+)?([^;]+);/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1].trim();
      const isStatic = match[0].includes('static');
      
      // Extract package and class/method name
      const parts = importPath.split('.');
      const className = parts[parts.length - 1];
      const packageName = parts.slice(0, -1).join('.');

      imports.push({
        source: packageName,
        imports: [{
          name: className,
          alias: null,
          isDefault: true,
          isStatic
        }],
        isExternal: this.isExternalPackage(packageName)
      });
    }

    return imports;
  }

  /**
   * Extract Java exports (public classes and interfaces)
   */
  extractExports(code) {
    const exports = [];
    
    // Extract public classes
    const classMatches = code.matchAll(/public\s+(?:abstract\s+|final\s+)?class\s+(\w+)/g);
    for (const match of classMatches) {
      exports.push({
        name: match[1],
        type: 'class',
        isDefault: false
      });
    }

    // Extract public interfaces
    const interfaceMatches = code.matchAll(/public\s+interface\s+(\w+)/g);
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

      // Handle varargs
      if (param.includes('...')) {
        const parts = param.replace('...', '').trim().split(/\s+/);
        if (parts.length >= 2) {
          parameters.push({
            name: parts[parts.length - 1],
            type: parts.slice(0, -1).join(' ') + '[]',
            optional: false,
            isVarargs: true
          });
        }
      } else {
        // Handle annotations (simplified)
        const cleanParam = param.replace(/@\w+(\([^)]*\))?\s*/g, '');
        
        // Handle final modifier
        const finalRegex = /^final\s+(.+)$/;
        const finalMatch = cleanParam.match(finalRegex);
        const paramStr = finalMatch ? finalMatch[1] : cleanParam;
        
        const parts = paramStr.trim().split(/\s+/);
        if (parts.length >= 2) {
          parameters.push({
            name: parts[parts.length - 1],
            type: parts.slice(0, -1).join(' '),
            optional: false,
            isFinal: !!finalMatch
          });
        }
      }
    });

    return parameters;
  }

  /**
   * Calculate complexity of Java code
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
   * Extract method dependencies
   */
  extractMethodDependencies(methodCode) {
    const dependencies = new Set();
    
    // Look for method calls
    const callMatches = methodCode.matchAll(/(\w+)\s*\(/g);
    for (const match of callMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for field access
    const fieldMatches = methodCode.matchAll(/this\.(\w+)/g);
    for (const match of fieldMatches) {
      dependencies.add(match[1]);
    }
    
    // Look for class references
    const classMatches = methodCode.matchAll(/\bnew\s+(\w+)\s*\(/g);
    for (const match of classMatches) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }

  /**
   * Extract visibility modifier
   */
  extractVisibility(declaration) {
    if (declaration.includes('public')) return 'public';
    if (declaration.includes('private')) return 'private';
    if (declaration.includes('protected')) return 'protected';
    return 'package'; // Default package visibility
  }

  /**
   * Extract docstring from JavaDoc comments
   */
  extractClassDocstring(code, classIndex, lines) {
    const lineNumber = this.getLineNumber(code, classIndex);
    return this.extractJavaDoc(lines, lineNumber - 1);
  }

  /**
   * Extract method docstring
   */
  extractMethodDocstring(code, methodIndex, lines) {
    const lineNumber = this.getLineNumber(code, methodIndex);
    return this.extractJavaDoc(lines, lineNumber - 1);
  }

  /**
   * Extract JavaDoc comments
   */
  extractJavaDoc(lines, lineIndex) {
    let docstring = '';
    let i = lineIndex - 1;
    
    // Look backwards for JavaDoc comment
    while (i >= 0) {
      const line = lines[i].trim();
      if (line === '*/') {
        // Found end of JavaDoc, now collect the content
        i--;
        let docLines = [];
        while (i >= 0 && !lines[i].trim().startsWith('/**')) {
          const docLine = lines[i].trim();
          if (docLine.startsWith('*')) {
            docLines.unshift(docLine.substring(1).trim());
          }
          i--;
        }
        if (i >= 0 && lines[i].trim().startsWith('/**')) {
          const firstLine = lines[i].trim();
          if (firstLine.length > 3) {
            docLines.unshift(firstLine.substring(3).trim());
          }
        }
        docstring = docLines.join('\n').trim();
        break;
      } else if (line && !line.startsWith('//') && !line.startsWith('*')) {
        // Found non-comment line, stop looking
        break;
      }
      i--;
    }
    
    return docstring;
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
    
    // Find the matching closing brace for the class
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
    
    while (i < code.length && braceCount > 0) {
      if (code[i] === '{') {
        braceCount++;
      } else if (code[i] === '}') {
        braceCount--;
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
   * Check if package is external
   */
  isExternalPackage(packageName) {
    // Standard Java packages and common external libraries
    const standardPackages = ['java', 'javax', 'org.w3c', 'org.xml'];
    return standardPackages.some(pkg => packageName.startsWith(pkg)) || 
           !packageName.includes('.');
  }

  /**
   * Validate Java syntax (simplified)
   */
  validateSyntax(code) {
    const errors = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for unclosed braces (simplified)
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
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
      
      // Check for missing semicolons (very basic check)
      if (trimmed && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('@') &&
          !trimmed.match(/^(if|else|for|while|do|try|catch|finally|switch)\b/) &&
          !trimmed.match(/^(public|private|protected|static|final|abstract|class|interface|enum)\b/)) {
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
    
    // Basic test case
    candidates.push(`test${this.capitalize(methodName)}Success`);
    
    // Parameter-based tests
    if (parameters.length > 0) {
      candidates.push(`test${this.capitalize(methodName)}WithInvalidParameters`);
      candidates.push(`test${this.capitalize(methodName)}WithNullParameters`);
    }
    
    // Special method names
    if (methodName.startsWith('get')) {
      candidates.push(`test${this.capitalize(methodName)}ReturnsExpectedValue`);
    } else if (methodName.startsWith('set')) {
      candidates.push(`test${this.capitalize(methodName)}UpdatesValue`);
    } else if (methodName.startsWith('is') || methodName.startsWith('has')) {
      candidates.push(`test${this.capitalize(methodName)}ReturnsTrueWhenConditionMet`);
      candidates.push(`test${this.capitalize(methodName)}ReturnsFalseWhenConditionNotMet`);
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
      language: 'java',
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

module.exports = new JavaParser();