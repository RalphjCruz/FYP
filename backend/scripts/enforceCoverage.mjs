import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN = 90;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, '..');
const summaryPath = path.join(backendRoot, 'coverage', 'coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}. Run coverage first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const scopes = ['src/controllers/', 'src/services/', 'src/middlewares/', 'src/utils/'];
const metrics = ['lines', 'branches', 'functions', 'statements'];

const failures = [];

const total = summary.total;
for (const metric of metrics) {
  const pct = Number(total?.[metric]?.pct ?? 0);
  if (pct < MIN) {
    failures.push(`global ${metric} ${pct}% < ${MIN}%`);
  }
}

for (const [filePath, stats] of Object.entries(summary)) {
  if (filePath === 'total') {
    continue;
  }

  const normalized = String(filePath).replace(/\\/g, '/');
  if (!scopes.some((scope) => normalized.startsWith(scope))) {
    continue;
  }

  for (const metric of metrics) {
    const pct = Number(stats?.[metric]?.pct ?? 0);
    if (pct < MIN) {
      failures.push(`${normalized} ${metric} ${pct}% < ${MIN}%`);
    }
  }
}

if (failures.length > 0) {
  console.error('\nCoverage gate failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Coverage gate passed: global and per-file ${MIN}%+ on lines/branches/functions/statements.`);
