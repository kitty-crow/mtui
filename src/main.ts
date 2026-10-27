#!/usr/bin/env bun
import { OptionParser } from './cli/Options.ts';
import { help } from './cli/help.ts';
import { version } from './application/version.ts';

try {
  const options = new OptionParser().parse(Bun.argv.slice(2));
  if (!options.colour) { process.env['NO_COLOR'] = '1'; delete process.env['FORCE_COLOR']; }
  if (options.help) console.log(help);
  if (options.version && !options.help) console.log(`mTUI ${version}`);
  if (options.setupSensors && !options.help && !options.version) {
    const { SensorSetup } = await import('./application/SensorSetup.ts');
    await new SensorSetup().run();
  }
  if (!options.help && !options.version && !options.setupSensors) {
    const { Application } = await import('./application/Application.ts');
    await new Application().run(options);
  }
} catch (error: unknown) {
  console.error(`mTUI: ${error instanceof Error ? error.message : 'Unexpected application error'}`);
  process.exitCode = 1;
}
