import { NativeBuilder } from './build/NativeBuilder.mts';
import { ExecutableVerifier } from './build/ExecutableVerifier.mts';
import { SensorBuildSetup } from './build/SensorBuildSetup.mts';

await new SensorBuildSetup().run(Bun.argv.slice(2));
const outfile = await new NativeBuilder().build();
const version = await new ExecutableVerifier().verify(outfile);
console.log(`Built and verified ${outfile} (${version})`);
