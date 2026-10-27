import { NativeBuilder } from './build/NativeBuilder.mts';

const outfile = await new NativeBuilder().build();
const check = Bun.spawn([outfile, '--version'], { stdout: 'pipe', stderr: 'pipe' });
const [version, diagnostic, status] = await Promise.all([new Response(check.stdout).text(), new Response(check.stderr).text(), check.exited]);
if (status !== 0 || !version.startsWith('mTUI ')) throw new Error(`Executable smoke check failed: ${diagnostic.trim()}`);
console.log(`Built ${outfile} (${version.trim()})`);
