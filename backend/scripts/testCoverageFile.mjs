import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const [testFile, targetFile, ...extraArgs] = args;

if (!testFile || !targetFile) {
  console.error('Usage: npm run test:coverage:file -- <test-file> <target-file> [extra jest args]');
  console.error('Example: npm run test:coverage:file -- src/__tests__/studyHealthService.test.ts src/services/studyHealthService.ts');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, '..');
const jestBin = path.join(backendRoot, 'node_modules', 'jest', 'bin', 'jest.js');

if (!fs.existsSync(jestBin)) {
  console.error('Jest binary not found. Run `npm --prefix backend ci` first.');
  process.exit(1);
}

const jestArgs = [
  jestBin,
  '--coverage',
  '--runInBand',
  testFile,
  `--collectCoverageFrom=${targetFile}`,
  '--coverageThreshold',
  '{}',
  ...extraArgs,
];

const result = spawnSync(process.execPath, jestArgs, {
  cwd: backendRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
