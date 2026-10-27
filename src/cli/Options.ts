export interface Options {
  readonly interval: number;
  readonly history: number;
  readonly demo: boolean;
  readonly once: boolean;
  readonly json: boolean;
  readonly colour: boolean;
  readonly motion: boolean;
  readonly ascii: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly serve: boolean;
  readonly api: boolean;
  readonly connect: string | null;
}

const flags = new Set(['--demo', '--once', '--json', '--no-colour', '--no-color', '--no-motion', '--ascii', '--help', '-h', '--version', '-v', '--serve', '--no-api']);

/** Strict CLI parsing catches misspelled switches before hardware discovery. */
export class OptionParser {
  public parse(args: readonly string[]): Options {
    const values = new Map<string, string>();
    const switches = new Set<string>();
    for (let index = 0; index < args.length; index++) {
      const arg = args[index] ?? '';
      if (flags.has(arg)) { switches.add(arg); continue; }
      if (arg !== '--interval' && arg !== '--history' && arg !== '--connect') throw new Error(`Unknown option: ${arg}. Use --help for usage.`);
      const value = args[++index];
      if (value === undefined || value.startsWith('-')) throw new Error(`${arg} needs a value`);
      values.set(arg, value);
    }
    const connect = values.get('--connect') ?? null;
    if (connect !== null && switches.has('--serve')) throw new Error('--connect and --serve are separate operating modes');
    if (connect !== null && switches.has('--demo')) throw new Error('--demo cannot be combined with --connect');
    if (switches.has('--serve') && switches.has('--no-api')) throw new Error('--serve requires the API');
    return {
      interval: this.number(values.get('--interval') ?? '1000', '--interval', 250, 10_000),
      history: this.number(values.get('--history') ?? '120', '--history', 10, 3600),
      demo: switches.has('--demo'), once: switches.has('--once') || switches.has('--json'), json: switches.has('--json'),
      colour: !switches.has('--no-colour') && !switches.has('--no-color'),
      motion: !switches.has('--no-motion'), ascii: switches.has('--ascii'),
      help: switches.has('--help') || switches.has('-h'), version: switches.has('--version') || switches.has('-v'),
      serve: switches.has('--serve'), api: !switches.has('--no-api'), connect,
    };
  }

  private number(value: string, option: string, min: number, max: number): number {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${option} accepts integers from ${min} to ${max}`);
    return number;
  }
}
