#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script to dynamically update go-blueprint generator schema based on actual CLI options
 * This script discovers the current go-blueprint CLI options and merges them with our base schema
 */

const GENERATOR_DIR = path.dirname(__dirname);
const BASE_SCHEMA_PATH = path.join(GENERATOR_DIR, 'base-schema.json');
const SCHEMA_PATH = path.join(GENERATOR_DIR, 'schema.json');
const SCHEMA_TYPES_PATH = path.join(GENERATOR_DIR, 'schema.d.ts');

/**
 * Parse go-blueprint help output to extract CLI options dynamically
 */
function parseGoBlueprintOptions() {
  try {
    console.log('🔍 Fetching go-blueprint CLI options...');

    // Get help output for create command
    const helpOutput = execSync('go-blueprint create --help', {
      encoding: 'utf8',
    });
    console.log('📄 Raw go-blueprint help output:');
    console.log('---');
    console.log(helpOutput);
    console.log('---');

    return parseHelpOutputDirectly(helpOutput);
  } catch (error) {
    console.error('❌ Error parsing go-blueprint options:', error.message);
    console.log('ℹ️  Falling back to manual discovery...');

    // Fallback: try individual flag discovery
    return discoverFlagsManually();
  }
}

/**
 * Parse help output by directly extracting known patterns
 */
function parseHelpOutputDirectly(helpOutput) {
  const options = {};

  // Extract specific flags that we can see in the output
  // Note: We skip 'advanced' flag since it's handled internally when features are selected
  const flagMappings = [
    {
      name: 'driver',
      pattern: /-d, --driver Database\s+(.+?)Allowed values: (.+)/,
      type: 'string',
      description: 'Database drivers to use',
      extractEnum: true,
    },
    {
      name: 'feature',
      pattern: /--feature AdvancedFeatures\s+(.+?)Allowed values: (.+)/,
      type: 'array',
      description: 'Advanced feature to use',
      extractEnum: true,
    },
    {
      name: 'framework',
      pattern: /-f, --framework Framework\s+(.+?)Allowed values: (.+)/,
      type: 'string',
      description: 'Framework to use',
      extractEnum: true,
    },
    {
      name: 'git',
      pattern: /-g, --git Git\s+(.+?)Allowed values: (.+)/,
      type: 'string',
      description: 'Git to use',
      extractEnum: true,
    },
    {
      name: 'name',
      pattern: /-n, --name string\s+(.+)/,
      type: 'string',
      description: 'Name of project to create',
    },
  ];

  for (const mapping of flagMappings) {
    const match = helpOutput.match(mapping.pattern);
    if (match) {
      const schema = {
        description: mapping.description,
        type: mapping.type,
      };

      // Extract enum values if available
      if (mapping.extractEnum && match[2]) {
        const enumValues = match[2]
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        if (enumValues.length > 0) {
          schema.enum = enumValues;
        }
      }

      // Add prompts for important flags
      const prompt = createPrompt(mapping.name, schema);
      if (prompt) {
        schema['x-prompt'] = prompt;
      }

      options[mapping.name] = schema;
      console.log(
        `✅ Discovered flag: --${mapping.name}${
          schema.enum ? ` (${schema.enum.length} options)` : ''
        }`
      );
    }
  }

  return options;
}

/**
 * Parse individual flag line from help output
 */
function parseFlagLine(line) {
  // Common patterns for CLI help:
  // -a, --advanced                   Get prompts for advanced features
  // -d, --driver Database            Database drivers to use. Allowed values: mysql, postgres, sqlite, mongo, redis, scylla, none
  // --feature AdvancedFeatures       Advanced feature to use. Allowed values: react, htmx, githubaction, websocket, tailwind, docker
  // -f, --framework Framework        Framework to use. Allowed values: chi, gin, fiber, gorilla/mux, httprouter, standard-library, echo
  // -g, --git Git                    Git to use. Allowed values: commit, stage, skip
  // -n, --name string                Name of project to create

  const patterns = [
    // Pattern for: -x, --flag Type Description. Allowed values: a, b, c
    /^\s*-\w+,\s*--(\w+)\s+\w+\s+(.+?)(?:\.\s*Allowed values:\s*(.+?))?$/,
    // Pattern for: --flag Type Description. Allowed values: a, b, c
    /^\s*--(\w+)\s+\w+\s+(.+?)(?:\.\s*Allowed values:\s*(.+?))?$/,
    // Pattern for: -x, --flag Description
    /^\s*-\w+,\s*--(\w+)\s+(.+?)$/,
    // Pattern for: --flag Description
    /^\s*--(\w+)\s+(.+?)$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, flagName, description, allowedValues] = match;

      // Skip help flags
      if (flagName === 'help' || flagName === 'h') continue;

      return {
        name: flagName,
        schema: createSchemaProperty(
          flagName,
          description,
          null,
          allowedValues
        ),
      };
    }
  }

  return null;
}

/**
 * Try alternative help format parsing
 */
function parseAlternativeHelpFormats(helpOutput) {
  const options = {};

  // Look for usage examples that might reveal flags
  const usageMatch = helpOutput.match(
    /Usage:[\s\S]*?(?=\n\n|\nFlags:|\nOptions:|$)/
  );
  if (usageMatch) {
    const usage = usageMatch[0];
    const flagMatches = usage.matchAll(/--(\w+)/g);
    for (const match of flagMatches) {
      const flagName = match[1];
      if (!options[flagName] && flagName !== 'help') {
        options[flagName] = createSchemaProperty(
          flagName,
          `${flagName} option`
        );
        console.log(`🔧 Discovered from usage: --${flagName}`);
      }
    }
  }

  return options;
}

/**
 * Manually discover flags by trying common ones
 */
function discoverFlagsManually() {
  const options = {};
  const commonFlags = ['name', 'framework', 'driver', 'git', 'feature'];

  console.log('🔍 Attempting manual flag discovery...');

  for (const flag of commonFlags) {
    try {
      // Try to get help for specific flag (this might not work but worth trying)
      execSync(`go-blueprint create --${flag}=help`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error) {
      // If the flag exists, it should give us some error about invalid value
      if (error.stdout || error.stderr) {
        const output = error.stdout + error.stderr;
        if (!output.toLowerCase().includes('unknown flag')) {
          options[flag] = createSchemaProperty(flag, `${flag} option`);
          console.log(`🎯 Manual discovery found: --${flag}`);
        }
      }
    }
  }

  return options;
}

/**
 * Create schema property for a flag
 */
function createSchemaProperty(
  flagName,
  description,
  defaultValue,
  allowedValues
) {
  const schema = {
    description: cleanDescription(description),
    type: inferType(flagName, description, defaultValue),
  };

  // Add default value if provided
  if (defaultValue !== undefined) {
    schema.default = parseValue(defaultValue);
  }

  // Parse allowed values from the help text
  const enumValues =
    parseAllowedValues(allowedValues) ||
    detectEnumValues(flagName, description);
  if (enumValues.length > 0) {
    schema.enum = enumValues;
  }

  // Add prompt for important flags
  const prompt = createPrompt(flagName, schema);
  if (prompt) {
    schema['x-prompt'] = prompt;
  }

  return schema;
}

/**
 * Clean up description text
 */
function cleanDescription(description) {
  if (!description) return '';
  return description
    .replace(/\s+/g, ' ')
    .replace(/\(default.*?\)/, '')
    .trim();
}

/**
 * Infer JSON schema type from flag name and description
 */
function inferType(flagName, description = '', defaultValue) {
  const name = flagName.toLowerCase();
  const desc = description.toLowerCase();

  // Boolean flags
  if (
    name.includes('enable') ||
    name.includes('disable') ||
    name === 'git' ||
    name === 'advanced' ||
    desc.includes('enable') ||
    desc.includes('disable') ||
    defaultValue === 'false' ||
    defaultValue === 'true'
  ) {
    return 'boolean';
  }

  // Array flags (features, etc.)
  if (
    name === 'feature' ||
    name === 'features' ||
    desc.includes('multiple') ||
    desc.includes('list')
  ) {
    return 'array';
  }

  // Default to string
  return 'string';
}

/**
 * Parse default value to appropriate type
 */
function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value.replace(/['"]/g, ''); // Remove quotes
}

/**
 * Parse allowed values from help text
 */
function parseAllowedValues(allowedValuesText) {
  if (!allowedValuesText) return [];

  // Split by comma and clean up values
  return allowedValuesText
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Detect enum values from description or flag name
 */
function detectEnumValues(flagName, description) {
  // This would need to be enhanced to actually discover enum values
  // For now, return empty array - could be extended to parse from help text
  return [];
}

/**
 * Create prompt configuration for important flags
 */
function createPrompt(flagName, schema) {
  const basePrompts = {
    framework: {
      message: 'Which web framework would you like to use?',
      type: schema.enum ? 'list' : 'input',
    },
    driver: {
      message: 'Which database driver would you like to use?',
      type: schema.enum ? 'list' : 'input',
    },
    feature: {
      message: 'Which advanced features would you like to include?',
      type: 'multiselect',
    },
    git: {
      message: 'How would you like to handle git?',
      type: schema.enum ? 'list' : 'input',
    },
  };

  const prompt = basePrompts[flagName];
  if (!prompt) return null;

  // Add items for list/multiselect prompts
  if (
    schema.enum &&
    (prompt.type === 'list' || prompt.type === 'multiselect')
  ) {
    prompt.items = schema.enum.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    }));
  }

  return prompt;
}

/**
 * Merge go-blueprint options with base schema
 */
function mergeWithBaseSchema(baseSchema, goBlueprintOptions) {
  const mergedSchema = JSON.parse(JSON.stringify(baseSchema)); // Deep clone

  // Add go-blueprint options
  Object.entries(goBlueprintOptions).forEach(([key, value]) => {
    if (!mergedSchema.properties[key]) {
      mergedSchema.properties[key] = value;
    }
  });

  // Mark essential go-blueprint options as required (except 'feature' and 'name' which are optional)
  // 'name' is optional since it will be the same as the Nx project name
  const requiredGoBlueprintOptions = ['driver', 'framework', 'git'];
  requiredGoBlueprintOptions.forEach((option) => {
    if (goBlueprintOptions[option] && !mergedSchema.required.includes(option)) {
      mergedSchema.required.push(option);
    }
  });

  return mergedSchema;
}

/**
 * Generate TypeScript type definitions from schema
 */
function generateTypeDefinitions(schema) {
  const imports = `import { GeneratorSchema } from '../../utils/normalize-options';`;

  // Get base properties (from GeneratorSchema)
  const baseProperties = [
    'directory',
    'name',
    'tags',
    'skipFormat',
    'addGoDotWork',
  ];

  // Generate properties for go-blueprint specific options
  const properties = Object.entries(schema.properties)
    .filter(([key]) => !baseProperties.includes(key))
    .map(([key, prop]) => {
      const optional = !schema.required.includes(key) ? '?' : '';
      let type = getTypeScriptType(prop);

      const comment = prop.description ? `  /** ${prop.description} */\n` : '';
      return `${comment}  ${key}${optional}: ${type};`;
    })
    .join('\n');

  const interfaceContent = properties
    ? `\n${properties}\n`
    : '\n  // No additional properties beyond base schema\n';

  return `${imports}

export interface GoBlueprintGeneratorSchema extends GeneratorSchema {${interfaceContent}}`;
}

/**
 * Convert JSON schema type to TypeScript type
 */
function getTypeScriptType(prop) {
  if (prop.type === 'boolean') {
    return 'boolean';
  } else if (prop.type === 'array') {
    return 'string[]';
  } else if (prop.enum && prop.enum.length > 0) {
    return prop.enum.map((v) => `'${v}'`).join(' | ');
  } else {
    return 'string';
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 Starting go-blueprint schema update...');

  try {
    // Load base schema
    console.log('📖 Loading base schema...');
    const baseSchema = JSON.parse(fs.readFileSync(BASE_SCHEMA_PATH, 'utf8'));

    // Parse go-blueprint options dynamically
    const goBlueprintOptions = parseGoBlueprintOptions();
    console.log(
      `📋 Discovered ${
        Object.keys(goBlueprintOptions).length
      } go-blueprint options`
    );

    if (Object.keys(goBlueprintOptions).length === 0) {
      console.warn(
        '⚠️  No go-blueprint options discovered. Schema will only contain base options.'
      );
    }

    // Merge schemas
    const updatedSchema = mergeWithBaseSchema(baseSchema, goBlueprintOptions);

    // Write updated schema
    fs.writeFileSync(SCHEMA_PATH, JSON.stringify(updatedSchema, null, 2));
    console.log('✅ Updated schema.json');

    // Generate TypeScript definitions
    const typeDefinitions = generateTypeDefinitions(updatedSchema);
    fs.writeFileSync(SCHEMA_TYPES_PATH, typeDefinitions);
    console.log('✅ Updated schema.d.ts');

    console.log('🎉 Schema update completed successfully!');
    console.log(
      `📊 Final schema contains ${
        Object.keys(updatedSchema.properties).length
      } total properties`
    );
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseGoBlueprintOptions,
  mergeWithBaseSchema,
  generateTypeDefinitions,
};
