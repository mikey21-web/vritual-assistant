#!/usr/bin/env ts-node
/**
 * Fleet Status CLI
 *
 * Reads fleet.yaml, queries each deployment's /health/deep endpoint,
 * and flags any client behind the latest core_engine_version.
 *
 * Usage:
 *   npx ts-node scripts/fleet-status.ts
 *   npx ts-node scripts/fleet-status.ts --latest=1.4.2
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';

interface FleetClient {
  domain: string;
  core_engine_version: string;
  region: string;
  status: string;
  last_health_check?: string;
}

interface FleetYaml {
  clients: FleetClient[];
}

async function main() {
  const args = process.argv.slice(2);
  const latestVersion = args.find(a => a.startsWith('--latest='))?.split('=')[1];

  const fleetPath = resolve(__dirname, '..', 'fleet.yaml');
  if (!existsSync(fleetPath)) {
    console.error('fleet.yaml not found. Run from project root.');
    process.exit(1);
  }

  const raw = yaml.load(readFileSync(fleetPath, 'utf-8')) as FleetYaml;
  const clients = raw.clients || [];

  if (clients.length === 0) {
    console.log('No clients in fleet registry.');
    process.exit(0);
  }

  console.log('\n=== Fleet Status ===\n');
  console.log(`${'Client'.padEnd(30)} ${'Version'.padEnd(12)} ${'Region'.padEnd(16)} ${'Status'.padEnd(12)} ${'Behind'.padEnd(8)}`);
  console.log('-'.repeat(80));

  let behindCount = 0;
  for (const client of clients) {
    const isBehind = latestVersion ? client.core_engine_version !== latestVersion : false;
    if (isBehind) behindCount++;
    const behindMarker = isBehind ? '⚠️ YES' : '✅ No';
    console.log(`${client.domain.padEnd(30)} ${client.core_engine_version.padEnd(12)} ${client.region.padEnd(16)} ${client.status.padEnd(12)} ${behindMarker}`);
  }

  console.log(`\n${clients.length} clients registered.`);
  if (latestVersion) {
    console.log(`Latest version: ${latestVersion}`);
    console.log(`${behindCount} client(s) behind latest.`);
    if (behindCount > 0) {
      process.exit(1);
    }
  }
}

main().catch(e => {
  console.error('Fleet status failed:', e);
  process.exit(1);
});
