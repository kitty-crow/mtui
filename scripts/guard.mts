import { readFile } from 'node:fs/promises';
import { SourceScanner } from './quality/SourceScanner.mts';
import { SourceGuard } from './quality/SourceGuard.mts';

const guard = new SourceGuard();
const files = await new SourceScanner().files('.');
const groups = await Promise.all(files.map(async file => guard.inspect(file, await readFile(file, 'utf8'))));
const issues = groups.flat();
for (const issue of issues) console.error(`${issue.file}:${issue.line}: ${issue.message}`);
if (issues.length > 0) process.exit(1);
console.log('Strict source guard passed.');
