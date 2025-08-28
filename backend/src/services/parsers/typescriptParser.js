const javascriptParser = require('./javascriptParser');

/**
 * TypeScript Parser
 * Extends JavaScript parser with TypeScript-specific features
 */
class TypeScriptParser {
  constructor() {
    this.version = '1.0.0';
    this.supportedExtensions = ['.ts', '.tsx'];
    this.jsParser = javascriptParser;
  }

  /**
   * Parse TypeScript code
   * @param {string} code - Source code to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Object>} Parse result with extracted information
   */
  async parse(code, options = {}) {
    // Use JavaScript parser with TypeScript enabled
    const result = await this.jsParser.parse(code, {
      ...options,
      fileName: options.fileName || 'file.ts'
    });

    // Add TypeScript-specific processing
    if (result.language === 'typescript') {
      result.typeDefinitions = this.extractTypeDefinitions(code);
      result.interfaces = this.extractInterfaces(code);
      result.enums = this.extractEnums(code);
      result.decorators = this.extractDecorators(code);
    }

    return result;
  }

  /**
   * Extract TypeScript type definitions
   */
  extractTypeDefinitions(code) {
    const typeDefRegex = /type\s+(\w+)\s*=\s*([^;]+);?/g;
    const typeDefs = [];
    let match;

    while ((match = typeDefRegex.exec(code)) !== null) {
      typeDefs.push({
        name: match[1],
        definition: match[2].trim(),
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return typeDefs;
  }

  /**
   * Extract TypeScript interfaces
   */
  extractInterfaces(code) {
    const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{([^}]*)}/g;
    const interfaces = [];
    let match;

    while ((match = interfaceRegex.exec(code)) !== null) {
      const name = match[1];
      const extendsClause = match[2] ? match[2].trim() : null;
      const body = match[3];
      
      const properties = this.extractInterfaceProperties(body);
      
      interfaces.push({
        name,
        extends: extendsClause ? extendsClause.split(',').map(s => s.trim()) : [],
        properties,
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return interfaces;
  }

  /**
   * Extract interface properties
   */
  extractInterfaceProperties(body) {
    const propertyRegex = /(\w+)(\?)?\s*:\s*([^;,\n]+)/g;
    const properties = [];
    let match;

    while ((match = propertyRegex.exec(body)) !== null) {
      properties.push({
        name: match[1],
        type: match[3].trim(),
        optional: !!match[2]
      });
    }

    return properties;
  }

  /**
   * Extract TypeScript enums
   */
  extractEnums(code) {
    const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
    const enums = [];
    let match;

    while ((match = enumRegex.exec(code)) !== null) {
      const name = match[1];
      const body = match[2];
      
      const members = this.extractEnumMembers(body);
      
      enums.push({
        name,
        members,
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return enums;
  }

  /**
   * Extract enum members
   */
  extractEnumMembers(body) {
    const memberRegex = /(\w+)(?:\s*=\s*([^,\n]+))?/g;
    const members = [];
    let match;

    while ((match = memberRegex.exec(body)) !== null) {
      members.push({
        name: match[1],
        value: match[2] ? match[2].trim() : null
      });
    }

    return members;
  }

  /**
   * Extract decorators
   */
  extractDecorators(code) {
    const decoratorRegex = /@(\w+)(?:\([^)]*\))?/g;
    const decorators = [];
    let match;

    while ((match = decoratorRegex.exec(code)) !== null) {
      decorators.push({
        name: match[1],
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return decorators;
  }
}

module.exports = new TypeScriptParser();