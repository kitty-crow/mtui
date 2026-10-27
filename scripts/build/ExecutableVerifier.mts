import { payloadSchema } from '../../src/remote/PayloadSchema.ts';

/** Exercises packaged code paths, including the production terminal renderer. */
export class ExecutableVerifier {
  public async verify(outfile: string): Promise<string> {
    const version = await this.run(outfile, ['--version']);
    if (!version.startsWith('mTUI ')) throw new Error('Executable did not report its version');
    payloadSchema.parse(JSON.parse(await this.run(outfile, ['--demo', '--json'])));
    const frame = await this.run(outfile, ['--demo', '--once', '--no-colour']);
    if (!frame.includes('GRAPHICS') || !frame.includes('PROCESSOR')) throw new Error('Packaged terminal frame is incomplete');
    return version.trim();
  }

  private async run(outfile: string, args: readonly string[]): Promise<string> {
    const command = Bun.spawn([outfile, ...args], { stdout: 'pipe', stderr: 'pipe' });
    const timer = setTimeout(() => { command.kill(); }, 10_000);
    try {
      const [output, error, status] = await Promise.all([new Response(command.stdout).text(), new Response(command.stderr).text(), command.exited]);
      if (status !== 0) throw new Error(`Executable check ${args.join(' ')} failed: ${error.trim()}`);
      return output;
    } finally { clearTimeout(timer); }
  }
}
