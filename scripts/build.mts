import { NativeBuilder } from './build/NativeBuilder.mts';
import { ExecutableVerifier } from './build/ExecutableVerifier.mts';

const outfile = await new NativeBuilder().build();
const version = await new ExecutableVerifier().verify(outfile);
console.log(`Built and verified ${outfile} (${version})`);
