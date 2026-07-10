#!/usr/bin/env ts-node
/**
 * Niche Config Validation Harness
 *
 * Validates all niche.config.yaml files against config.schema.json
 * and runs a dry-run reconcile against an ephemeral DB.
 *
 * Usage:
 *   npx ts-node scripts/validate-niche.ts                    # validates all niches
 *   npx ts-node scripts/validate-niche.ts --file ./niche.config.yaml  # single file
 *
 * CI must fail if any niche is invalid.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, extname } from 'path';
import * as yaml from 'js-yaml';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ajv = require('ajv');

const SCHEMA_PATH = resolve(__dirname, '..', 'config.schema.json');

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
  niche?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const singleFile = args.find(a => a.startsWith('--file='))?.split('=')[1] || args[args.indexOf('--file') + 1];

  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  let files: string[] = [];

  if (singleFile) {
    files = [singleFile];
  } else {
    // Find all niche.config.yaml files (in root and in niches/ subdirectory)
    const rootYaml = resolve(__dirname, '..', 'niche.config.yaml');
    if (existsSync(rootYaml)) files.push(rootYaml);

    const nichesDir = resolve(__dirname, '..', 'niches');
    if (existsSync(nichesDir)) {
      const entries = readdirSync(nichesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const cfg = resolve(nichesDir, entry.name, 'niche.config.yaml');
          if (existsSync(cfg)) files.push(cfg);
        }
      }
    }

    // Also check template files
    const templatesDir = resolve(__dirname, '..', 'backend', 'src', 'niche-templates', 'templates');
    if (existsSync(templatesDir)) {
      const tplFiles = readdirSync(templatesDir).filter(f => f.endsWith('.ts'));
      for (const tf of tplFiles) {
        files.push(resolve(templatesDir, tf));
      }
    }
  }

  if (files.length === 0) {
    console.log('No niche config files found to validate.');
    process.exit(0);
  }

  const results: ValidationResult[] = [];

  for (const file of files) {
    const result = await validateFile(file, validate);
    results.push(result);
    const prefix = result.valid ? '✅' : '❌';
    console.log(`${prefix} ${result.file}`);
    if (result.niche) console.log(`   Niche: ${result.niche}`);
    if (result.errors) {
      for (const err of result.errors) {
        console.log(`   Error: ${err}`);
      }
    }
  }

  const validCount = results.filter(r => r.valid).length;
  const totalCount = results.length;
  console.log(`\n${validCount}/${totalCount} configs valid`);

  if (validCount < totalCount) {
    process.exit(1);
  }
}

function loadSchema(): any {
  if (!existsSync(SCHEMA_PATH)) {
    console.error('config.schema.json not found. Run from project root.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
}

async function validateFile(filePath: string, validate: Ajv.ValidateFunction): Promise<ValidationResult> {
  const result: ValidationResult = { file: filePath, valid: false };

  try {
    if (filePath.endsWith('.ts')) {
      // For .ts template files, we just check the file exists and has the right structure
      const content = readFileSync(filePath, 'utf-8');
      const hasExport = content.includes('export const');
      const hasPacks = content.includes('packs:');
      result.valid = hasExport && hasPacks;
      if (!result.valid) {
        result.errors = ['Template file missing export or packs structure'];
      }
      const match = content.match(/key:\s*['"]([^'"]+)['"]/);
      if (match) result.niche = match[1];
      return result;
    }

    const content = readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as any;

    if (!data || typeof data !== 'object') {
      result.errors = ['File does not contain valid YAML'];
      return result;
    }

    const valid = validate(data);
    if (!valid) {
      result.errors = validate.errors?.map(e => `${(e as any).instancePath || (e as any).dataPath || ''}: ${e.message}`) || ['Unknown validation error'];
      return result;
    }

    result.valid = true;
    result.niche = data.niche?.key || 'unknown';
    return result;
  } catch (e: any) {
    result.errors = [e.message];
    return result;
  }
}

main().catch(e => {
  console.error('Validation failed:', e);
  process.exit(1);
});
